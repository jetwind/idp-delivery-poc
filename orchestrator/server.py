"""FastAPI 编排服务：把 LangGraph 流水线暴露成 HTTP API 给前端。

端点（异步模型：start/resume 立即返回，图在后台 asyncio.Task 里跑）：
- POST /flow/start  启动流水线（输入需求文本 + 工作目录），返回 thread_id。
- GET  /flow/state/{thread_id}  读当前阶段 + 待处理的 interrupt（gate/question/approval）。
- GET  /flow/events/{thread_id}?since=seq  当前阶段 session 的增量事件流（实时日志）。
- POST /flow/resume/{thread_id}  回答 question 或给出 gate/approval 决策，继续推进。

前端轮询 state（阶段/待处理项）+ events（实时日志）。
"""

from __future__ import annotations

import asyncio
import difflib
import json
import os
import shutil
import subprocess
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.types import Command

from graph import STAGES, build_graph
from harness_client import HarnessClient
import jsonschema
import standards_store
import activity_store
import config_store
import schema_store
import project_store
import audit_store

# 交付文件夹根目录（orchestrator/ 的上一级），git URL clone 到这里下的 projects/。
DELIVERY_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 图 checkpoint 持久化（SQLite）：重启后流程状态不丢失。
CHECKPOINT_DB_PATH = os.path.join(DELIVERY_ROOT, "checkpoints.db")

client = HarnessClient()
graph: Any = None  # 在 lifespan 里用 AsyncSqliteSaver 构建


@asynccontextmanager
async def lifespan(app: FastAPI):
    global graph
    async with AsyncSqliteSaver.from_conn_string(CHECKPOINT_DB_PATH) as saver:
        graph = build_graph(client, saver)
        yield


app = FastAPI(title="delivery-orchestrator", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 后台图执行任务（thread_id → asyncio.Task）+ 图运行错误（thread_id → str）。
_flow_tasks: dict[str, asyncio.Task] = {}
_flow_errors: dict[str, str] = {}


async def _run_flow(thread_id: str, input_: Any, config: dict[str, Any]) -> None:
    """后台跑图：跑到下一个 interrupt 后返回；异常记入 _flow_errors，由快照透出。"""
    try:
        await graph.ainvoke(input_, config=config)
    except Exception as exc:  # noqa: BLE001 - 图错误透传给前端排查
        _flow_errors[thread_id] = str(exc)


_GIT_URL_PREFIXES = ("http://", "https://", "git@", "ssh://", "git://")


# 标准集中存储：SQLite（首次启动从 standards/*.md 导入种子，之后以 DB 为准）。
standards_store.init_db(os.path.join(DELIVERY_ROOT, "standards"))
# 运行监控/审计活动记录：SQLite（与 standards 同库）。
activity_store.init_db()
# 数字员工模型配置：SQLite。
config_store.init_db()
# 阶段产物 JSON Schema：SQLite（内置默认 + 可配置）。
schema_store.init_db()
# 交付项目（进入流水线的入口）：SQLite。
project_store.init_db()
# 产出文件审计意见：SQLite。
audit_store.init_db()


def _is_git_url(value: str) -> bool:
    return value.startswith(_GIT_URL_PREFIXES) or value.endswith(".git")


def _resolve_cwd(raw: str) -> str:
    """把用户输入的工作目录解析成本地绝对目录。

    - 已是本地目录（绝对路径，或相对交付根/进程 cwd）→ 原样返回绝对路径。
    - git 仓库 URL → clone 到 <交付根>/projects/<repo>，返回本地路径（幂等：已 clone 则复用）。
    - 其它 → 400，提示填本地目录或 git URL。
    """
    value = raw.strip().strip('"').strip("'")
    if not value:
        raise HTTPException(status_code=400, detail="工作目录（cwd）不能为空。")
    for candidate in (value, os.path.join(DELIVERY_ROOT, value)):
        if os.path.isdir(candidate):
            return os.path.abspath(candidate)
    if _is_git_url(value):
        repo_name = value.rstrip("/").rsplit("/", 1)[-1]
        if repo_name.endswith(".git"):
            repo_name = repo_name[:-4]
        if not repo_name:
            raise HTTPException(status_code=400, detail=f"无法从 URL 推断仓库名：{value}")
        projects_root = os.path.join(DELIVERY_ROOT, "projects")
        os.makedirs(projects_root, exist_ok=True)
        target = os.path.join(projects_root, repo_name)
        if not os.path.isdir(os.path.join(target, ".git")):
            proc = subprocess.run(
                ["git", "clone", value, target],
                capture_output=True, text=True,
            )
            if proc.returncode != 0:
                detail = (proc.stderr or proc.stdout or "").strip()
                raise HTTPException(
                    status_code=400,
                    detail=f"git clone 失败：{detail[:500] or '未知错误'}（URL：{value}）",
                )
        # 去标识：clone 出来的仓库用 jetwind 身份提交，覆盖可能存在的全局用户身份。
        subprocess.run(["git", "-C", target, "config", "user.name", "jetwind"], check=False)
        subprocess.run(
            ["git", "-C", target, "config", "user.email", "jetwind@users.noreply.github.com"],
            check=False,
        )
        return os.path.abspath(target)
    raise HTTPException(
        status_code=400,
        detail=(
            "工作目录（cwd）必须是本地已存在的目录或可 clone 的 git 仓库 URL。"
            f"收到：{value!r}。"
            "本地示例：D:\\ccn-work\\src\\github\\deepseek-harness-delivery\\examples\\project-delivery"
        ),
    )


def _text_of(content: Any) -> str:
    """从 content 块数组里抽纯文本（user/assistant 消息）。"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(p for p in parts if p)
    return ""


def _brief(value: Any, limit: int = 400) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        s = value
    else:
        try:
            s = json.dumps(value, ensure_ascii=False)
        except Exception:
            s = str(value)
    return s[:limit] + ("…" if len(s) > limit else "")


def _extract_nested_text(value: Any, limit: int = 600) -> str:
    """递归抽 tool result 里的文本（结构可能是 Anthropic 式嵌套 content）。"""
    parts: list[str] = []

    def walk(v: Any) -> None:
        if sum(len(p) for p in parts) >= limit:
            return
        if isinstance(v, str):
            parts.append(v)
        elif isinstance(v, dict):
            if v.get("type") == "text" and isinstance(v.get("text"), str):
                parts.append(v["text"])
            else:
                for x in v.values():
                    walk(x)
        elif isinstance(v, list):
            for x in v:
                walk(x)

    walk(value)
    return _brief("".join(parts), limit)


def _summarize_event(entry: Any) -> dict[str, Any] | None:
    """把 session.history 的一条事件压成前端可渲染的轻量结构；跳过 token 级 chunk。"""
    if not isinstance(entry, dict):
        return None
    event = entry.get("event")
    if not isinstance(event, dict):
        return None
    etype = event.get("type")
    seq = event.get("seq")
    data = event.get("data") if isinstance(event.get("data"), dict) else {}
    if etype == "user/message":
        source = None
        src = data.get("source")
        if isinstance(src, dict):
            source = src.get("kind")
        return {"seq": seq, "type": "user", "text": _brief(_text_of(data.get("content")), 2000), "source": source}
    if etype == "assistant/message":
        msg = data.get("message") if isinstance(data.get("message"), dict) else {}
        return {"seq": seq, "type": "assistant", "text": _brief(_text_of(msg.get("content")), 2000)}
    if etype == "tool/call":
        return {"seq": seq, "type": "tool", "toolName": data.get("name") or "?", "input": _brief(data.get("arguments"), 400)}
    if etype == "tool/result":
        ok = data.get("ok")
        text = _extract_nested_text(data.get("message")) if data.get("message") else ""
        if not text and data.get("error"):
            text = _brief(data.get("error"), 600)
        return {"seq": seq, "type": "tool_result", "ok": ok is not False, "text": text}
    return None


_EXCLUDE_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".idea", ".vscode", "coverage"}
_EXCLUDE_EXTS = {".pyc", ".class", ".log", ".lock", ".png", ".jpg", ".jpeg", ".gif", ".ico",
                 ".woff", ".woff2", ".ttf", ".eot", ".svg", ".map", ".tsbuildinfo"}


def _list_files(cwd: str, limit: int = 500) -> list[dict[str, Any]]:
    """列举 cwd 下的文件（相对路径），排除依赖/构建/二进制目录，按路径排序。"""
    out: list[dict[str, Any]] = []
    for root, dirs, names in os.walk(cwd):
        dirs[:] = [d for d in dirs if d not in _EXCLUDE_DIRS and not d.endswith(".tmpdir")]
        for name in names:
            if os.path.splitext(name)[1].lower() in _EXCLUDE_EXTS:
                continue
            full = os.path.join(root, name)
            rel = os.path.relpath(full, cwd).replace("\\", "/")
            try:
                size = os.path.getsize(full)
            except OSError:
                size = 0
            out.append({"path": rel, "size": size})
            if len(out) >= limit:
                out.sort(key=lambda x: x["path"])
                return out
    out.sort(key=lambda x: x["path"])
    return out


def _read_file_safe(cwd: str, path: str, max_bytes: int = 200_000) -> tuple[str, bool]:
    """安全读取 cwd 下的文本文件（防路径逃逸），返回 (content, truncated)。"""
    rel = path.replace("\\", "/").lstrip("/")
    cwd_abs = os.path.abspath(cwd)
    full = os.path.abspath(os.path.join(cwd_abs, rel))
    if full != cwd_abs and not full.startswith(cwd_abs + os.sep):
        raise HTTPException(status_code=400, detail="非法路径")
    if not os.path.isfile(full):
        raise HTTPException(status_code=404, detail=f"文件不存在：{rel}")
    try:
        with open(full, encoding="utf-8") as f:
            data = f.read(max_bytes + 1)
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"无法读取（二进制文件）：{rel}") from exc
    except OSError as exc:
        raise HTTPException(status_code=400, detail=f"读取失败：{rel}") from exc
    truncated = len(data) > max_bytes
    return data[:max_bytes], truncated


class StartRequest(BaseModel):
    requirement_text: str
    cwd: str


class ResumeRequest(BaseModel):
    answer: Any


def _config(thread_id: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": thread_id}}


async def _snapshot(thread_id: str) -> dict[str, Any]:
    snap = await graph.aget_state(_config(thread_id))
    values = snap.values or {}
    stage_index = values.get("stage_index", 0)
    stage_name = STAGES[stage_index]["name"] if stage_index < len(STAGES) else "完成"
    pending = None
    for task in snap.tasks or []:
        interrupts = getattr(task, "interrupts", None) or []
        if interrupts:
            pending = interrupts[0].value
            break
    return {
        "thread_id": thread_id,
        "stage_index": stage_index,
        "stage": stage_name,
        "done": stage_index >= len(STAGES),
        "pending": pending,
        "artifacts": values.get("artifacts", {}),
        "current_session_id": values.get("current_session_id"),
        "cwd": values.get("cwd"),
        "error": _flow_errors.get(thread_id),
        "flow_running": thread_id in _flow_tasks and not _flow_tasks[thread_id].done(),
        "stage_error": values.get("stage_error"),
        "validation": {
            "status": values.get("validation_status", "pending"),
            "attempts": values.get("validation_attempts", 0),
            "error": values.get("validation_error"),
        },
    }


async def _start_flow(
    requirement_text: str, cwd_raw: str,
    version_name: str | None = None, baseline: dict[str, Any] | None = None,
) -> dict[str, Any]:
    thread_id = str(uuid.uuid4())
    cwd = _resolve_cwd(cwd_raw)
    initial: dict[str, Any] = {
        "requirement_text": requirement_text,
        "cwd": cwd,
        "stage_index": 0,
        "artifacts": {},
        "version_name": version_name,
        "baseline": baseline,
    }
    _flow_errors.pop(thread_id, None)
    _flow_tasks[thread_id] = asyncio.create_task(_run_flow(thread_id, initial, _config(thread_id)))
    return await _snapshot(thread_id)


@app.post("/flow/start")
async def start(req: StartRequest) -> dict[str, Any]:
    return await _start_flow(req.requirement_text, req.cwd)


# ---- 交付项目管理（项目 → 版本 → 流水线）----

class ProjectCreateRequest(BaseModel):
    name: str
    requirement_text: str
    cwd: str


class VersionCreateRequest(BaseModel):
    name: str | None = None
    requirement_text: str
    note: str = ""


def _git_tag(cwd: str, tag: str) -> bool:
    """在项目 git 仓库打 tag（尽力而为；cwd 非独立 git 仓库时静默失败）。"""
    try:
        r = subprocess.run(
            ["git", "tag", tag], cwd=cwd, check=False, capture_output=True,
            timeout=30, stdin=subprocess.DEVNULL,
        )
        return r.returncode == 0
    except Exception:
        return False


async def _start_version_flow(ver: dict) -> dict[str, Any]:
    proj = project_store.get_project(ver["project_id"])
    # 基线：该版本基于的上一版本（v1.1 基于 v1.0），注入流水线用于「增量交付」提示。
    baseline = None
    bv = project_store.get_version_baseline(ver["id"])
    if bv:
        baseline = {
            "version_name": bv["name"],
            "git_ref": bv.get("git_ref") or bv["name"],
            "requirement_text": bv["requirement_text"],
        }
    snap = await _start_flow(
        ver["requirement_text"], (proj or {}).get("cwd", ""),
        version_name=ver["name"], baseline=baseline,
    )
    project_store.set_version_thread(ver["id"], snap["thread_id"])
    return snap


@app.post("/projects")
async def projects_create(req: ProjectCreateRequest) -> dict[str, Any]:
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="项目名称不能为空")
    if not req.requirement_text.strip():
        raise HTTPException(status_code=400, detail="需求描述不能为空")
    if not req.cwd.strip():
        raise HTTPException(status_code=400, detail="工作目录不能为空")
    proj = project_store.create_project(req.name.strip(), req.requirement_text.strip(), req.cwd.strip())
    return {"project": proj}


@app.get("/projects")
async def projects_list() -> dict[str, Any]:
    return {"projects": project_store.list_projects()}


@app.get("/projects/{pid}")
async def projects_get(pid: str) -> dict[str, Any]:
    proj = project_store.get_project(pid)
    if proj is None:
        raise HTTPException(status_code=404, detail=f"项目不存在：{pid}")
    return {"project": proj}


@app.delete("/projects/{pid}")
async def projects_delete(pid: str) -> dict[str, Any]:
    if not project_store.delete_project(pid):
        raise HTTPException(status_code=404, detail=f"项目不存在：{pid}")
    return {"id": pid, "ok": True}


@app.post("/projects/{pid}/versions")
async def versions_create(pid: str, req: VersionCreateRequest) -> dict[str, Any]:
    """基于当前基线新建一个版本（客户新需求 = 新版本，不是新项目）。"""
    proj = project_store.get_project(pid)
    if proj is None:
        raise HTTPException(status_code=404, detail=f"项目不存在：{pid}")
    if not req.requirement_text.strip():
        raise HTTPException(status_code=400, detail="该版本的需求描述不能为空")
    ver = project_store.create_version(pid, req.name or "", req.requirement_text.strip(), req.note.strip())
    return {"version": ver}


@app.get("/projects/{pid}/versions/suggest")
async def versions_suggest(pid: str) -> dict[str, Any]:
    return {"name": project_store.suggest_version_name(pid)}


@app.post("/projects/{pid}/flow")
async def projects_start_flow(pid: str) -> dict[str, Any]:
    """启动（或重新开始）该项目【当前版本】的流水线。"""
    proj = project_store.get_project(pid)
    if proj is None:
        raise HTTPException(status_code=404, detail=f"项目不存在：{pid}")
    cur = proj.get("current_version")
    if cur is None:
        raise HTTPException(status_code=404, detail=f"项目 {pid} 尚无版本")
    return await _start_version_flow(cur)


@app.post("/versions/{vid}/flow")
async def version_start_flow(vid: str) -> dict[str, Any]:
    """启动（或重新开始）某版本的流水线。"""
    ver = project_store.get_version(vid)
    if ver is None:
        raise HTTPException(status_code=404, detail=f"版本不存在：{vid}")
    return await _start_version_flow(ver)


@app.get("/versions/{vid}")
async def version_get(vid: str) -> dict[str, Any]:
    ver = project_store.get_version(vid)
    if ver is None:
        raise HTTPException(status_code=404, detail=f"版本不存在：{vid}")
    return {"version": ver}


@app.post("/versions/{vid}/deliver")
async def version_deliver(vid: str) -> dict[str, Any]:
    """标记版本已交付：落库状态 + 尽力打 git tag + 快照产物（供后续基线 diff）。"""
    ver = project_store.get_version(vid)
    if ver is None:
        raise HTTPException(status_code=404, detail=f"版本不存在：{vid}")
    proj = project_store.get_project(ver["project_id"])
    cwd = (proj or {}).get("cwd", "")
    tag = ver["name"]
    _git_tag(cwd, tag)
    project_store.mark_version_delivered(vid, tag)
    _snapshot_version(vid)
    return {"id": vid, "name": tag, "ok": True}


def _snapshot_version(vid: str) -> bool:
    """把某版本的交付产物快照到 snapshots/<vid>/（排除依赖/构建目录），供基线 diff。"""
    ver = project_store.get_version(vid)
    if ver is None:
        return False
    proj = project_store.get_project(ver["project_id"])
    cwd = (proj or {}).get("cwd", "")
    if not cwd or not os.path.isdir(cwd):
        return False
    snap_root = os.path.join(DELIVERY_ROOT, "snapshots", vid)
    shutil.rmtree(snap_root, ignore_errors=True)
    for f in _list_files(cwd):
        src = os.path.join(cwd, f["path"])
        dst = os.path.join(snap_root, f["path"])
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            shutil.copy2(src, dst)
        except OSError:
            continue
    return True


def _resolve_rel(base: str, rel: str) -> str:
    """把相对路径解析到 base 内的绝对路径，防逃逸；越界抛 400。"""
    rel = rel.replace("\\", "/").lstrip("/")
    base_abs = os.path.abspath(base)
    full = os.path.abspath(os.path.join(base_abs, rel))
    if full != base_abs and not full.startswith(base_abs + os.sep):
        raise HTTPException(status_code=400, detail="非法路径")
    return full


def _read_text_or_none(full: str) -> str | None:
    try:
        with open(full, encoding="utf-8") as f:
            return f.read()
    except (FileNotFoundError, OSError, UnicodeDecodeError):
        return None


@app.get("/versions/{vid}/diff")
async def version_diff(vid: str, path: str) -> dict[str, Any]:
    """某文件相对基线的结构化行 diff（v1.1 审计 v1.0 的增量）。"""
    ver = project_store.get_version(vid)
    if ver is None:
        raise HTTPException(status_code=404, detail=f"版本不存在：{vid}")
    baseline = project_store.get_version_baseline(vid)
    if baseline is None:
        return {"path": path, "has_baseline": False, "baseline_name": None, "diff": [], "is_new": True, "is_unchanged": False}
    proj = project_store.get_project(ver["project_id"])
    cwd = (proj or {}).get("cwd", "")
    cur_path = _resolve_rel(cwd, path)
    snap_path = _resolve_rel(os.path.join(DELIVERY_ROOT, "snapshots", baseline["id"]), path)
    new = _read_text_or_none(cur_path)
    if new is None:
        raise HTTPException(status_code=404, detail=f"文件不存在：{path}")
    old = _read_text_or_none(snap_path)
    is_new = old is None
    old_lines = [] if old is None else old.splitlines()
    new_lines = new.splitlines()
    diff: list[dict[str, str]] = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, old_lines, new_lines).get_opcodes():
        if tag == "equal":
            for line in old_lines[i1:i2]:
                diff.append({"type": "context", "text": line})
        elif tag == "delete":
            for line in old_lines[i1:i2]:
                diff.append({"type": "del", "text": line})
        elif tag == "insert":
            for line in new_lines[j1:j2]:
                diff.append({"type": "add", "text": line})
        elif tag == "replace":
            for line in old_lines[i1:i2]:
                diff.append({"type": "del", "text": line})
            for line in new_lines[j1:j2]:
                diff.append({"type": "add", "text": line})
    return {
        "path": path,
        "has_baseline": True,
        "baseline_name": baseline["name"],
        "diff": diff,
        "is_new": is_new,
        "is_unchanged": old == new,
    }


# ---- 产出文件审计意见 CRUD ----

class AuditFindingRequest(BaseModel):
    stage: str
    path: str
    line: int | None = None
    severity: str = "suggestion"
    comment: str


class AuditFindingUpdate(BaseModel):
    line: int | None = None
    severity: str | None = None
    comment: str | None = None
    status: str | None = None


@app.get("/versions/{vid}/audit")
async def audit_list(vid: str, stage: str | None = None) -> dict[str, Any]:
    if project_store.get_version(vid) is None:
        raise HTTPException(status_code=404, detail=f"版本不存在：{vid}")
    return {"findings": audit_store.list_findings(vid, stage)}


@app.post("/versions/{vid}/audit")
async def audit_create(vid: str, req: AuditFindingRequest) -> dict[str, Any]:
    if project_store.get_version(vid) is None:
        raise HTTPException(status_code=404, detail=f"版本不存在：{vid}")
    if req.severity not in audit_store.SEVERITY:
        raise HTTPException(status_code=400, detail=f"非法严重度：{req.severity}")
    if not req.comment.strip():
        raise HTTPException(status_code=400, detail="审计意见不能为空")
    finding = audit_store.create_finding(vid, req.stage, req.path, req.line, req.severity, req.comment.strip())
    return {"finding": finding}


@app.patch("/versions/{vid}/audit/{fid}")
async def audit_update(vid: str, fid: str, req: AuditFindingUpdate) -> dict[str, Any]:
    finding = audit_store.get_finding(fid)
    if finding is None or finding["version_id"] != vid:
        raise HTTPException(status_code=404, detail="审计意见不存在")
    fields: dict[str, Any] = {}
    if req.line is not None:
        fields["line"] = req.line
    if req.severity is not None:
        if req.severity not in audit_store.SEVERITY:
            raise HTTPException(status_code=400, detail=f"非法严重度：{req.severity}")
        fields["severity"] = req.severity
    if req.comment is not None:
        fields["comment"] = req.comment.strip()
    if req.status is not None:
        if req.status not in audit_store.STATUS:
            raise HTTPException(status_code=400, detail=f"非法状态：{req.status}")
        fields["status"] = req.status
    updated = audit_store.update_finding(fid, **fields)
    return {"finding": updated}


@app.delete("/versions/{vid}/audit/{fid}")
async def audit_delete(vid: str, fid: str) -> dict[str, Any]:
    finding = audit_store.get_finding(fid)
    if finding is None or finding["version_id"] != vid:
        raise HTTPException(status_code=404, detail="审计意见不存在")
    audit_store.delete_finding(fid)
    return {"ok": True}


# ---- AI 驾驶舱（全局汇总：所有项目/版本的流水线实时状态）----

_PENDING_LABEL = {
    "gate": "人工确认",
    "question": "输入补全",
    "approval": "审批",
}


@app.get("/cockpit")
async def cockpit() -> dict[str, Any]:
    """全局驾驶舱：汇总所有项目/版本，按流水线实时状态归类。

    每个版本有 thread_id 时读其 checkpoint 快照，判定为：
    - waiting   有 pending interrupt（gate/question/approval）→ 等待人工
    - running   后台图任务还在跑 → 执行中
    - delivered stage 已完成（stage_index 越界）或已标记交付 → 已交付
    - orphaned  有 checkpoint 但既不在跑也没 pending → 编排层重启后待「继续执行」
    无 thread_id 的版本：已交付 → delivered，否则 idle（未启动）。
    """
    versions = project_store.list_versions()
    running: list[dict[str, Any]] = []
    waiting: list[dict[str, Any]] = []
    delivered: list[dict[str, Any]] = []
    orphaned: list[dict[str, Any]] = []
    idle: list[dict[str, Any]] = []

    for v in versions:
        row: dict[str, Any] = {
            "version_id": v["id"],
            "version_name": v["name"],
            "project_id": v["project_id"],
            "project_name": v.get("project_name") or "",
            "status": v.get("status") or "进行中",
            "stage_index": v.get("stage_index") or 0,
            "thread_id": v.get("thread_id"),
            "note": v.get("note") or "",
            "updated_at": v.get("updated_at") or 0,
        }
        tid = row["thread_id"]
        if not tid:
            (delivered if row["status"] == "已交付" else idle).append(row)
            continue
        snap = await _snapshot(tid)
        row["stage_index"] = snap["stage_index"]
        row["stage"] = snap["stage"]
        pending = snap.get("pending")
        if pending:
            ptype = pending.get("type") if isinstance(pending, dict) else None
            row["pending_type"] = ptype
            row["pending_label"] = _PENDING_LABEL.get(ptype, "待处理")
            waiting.append(row)
        elif snap.get("flow_running"):
            running.append(row)
        elif snap.get("done"):
            row["status"] = "已交付"
            delivered.append(row)
        else:
            orphaned.append(row)

    projects = project_store.list_projects()
    return {
        "summary": {
            "projects": len(projects),
            "versions": len(versions),
            "running": len(running),
            "waiting": len(waiting),
            "delivered": len(delivered),
            "orphaned": len(orphaned),
            "idle": len(idle),
        },
        "running": running,
        "waiting": waiting,
        "delivered": delivered,
        "orphaned": orphaned,
        "idle": idle,
    }


@app.get("/flow/state/{thread_id}")
async def state(thread_id: str) -> dict[str, Any]:
    return await _snapshot(thread_id)


@app.get("/flow/events/{thread_id}")
async def events(thread_id: str) -> dict[str, Any]:
    """当前阶段 session 的最近事件流（供前端轮询渲染实时日志）。

    返回完整尾页，每条事件带 session_id + stage；前端按 (session_id, seq) 去重，
    从而跨阶段（每阶段一个新 session，seq 各自从 0 起）也能正确累积。
    """
    snap = await graph.aget_state(_config(thread_id))
    values = snap.values or {}
    session_id = values.get("current_session_id")
    stage_index = values.get("stage_index", 0)
    stage = STAGES[stage_index]["name"] if stage_index < len(STAGES) else "完成"
    if not session_id:
        return {"thread_id": thread_id, "session_id": None, "running": False, "todos": [], "stage": stage, "events": []}
    proj = await client.session_projection(session_id) or {}
    running = proj.get("running", False)
    todos = proj.get("todos", [])
    history = await client.session_history(session_id, max_messages=60)
    items: list[dict[str, Any]] = []
    for entry in history.get("events", []):
        summarized = _summarize_event(entry)
        if summarized:
            summarized["session_id"] = session_id
            summarized["stage"] = stage
            items.append(summarized)
    items.sort(key=lambda e: e.get("seq") or 0)
    return {"thread_id": thread_id, "session_id": session_id, "running": running, "todos": todos, "stage": stage, "events": items}


@app.get("/flow/files/{thread_id}")
async def files(thread_id: str) -> dict[str, Any]:
    """列举工作目录下的文件清单（供前端目录树）。"""
    snap = await graph.aget_state(_config(thread_id))
    values = snap.values or {}
    cwd = values.get("cwd")
    if not cwd:
        return {"thread_id": thread_id, "cwd": None, "files": []}
    return {"thread_id": thread_id, "cwd": cwd, "files": _list_files(cwd)}


@app.get("/flow/file/{thread_id}")
async def file(thread_id: str, path: str) -> dict[str, Any]:
    """读取工作目录下某个文本文件的内容（供前端预览）。"""
    snap = await graph.aget_state(_config(thread_id))
    values = snap.values or {}
    cwd = values.get("cwd")
    if not cwd:
        raise HTTPException(status_code=404, detail="尚未启动或工作目录未知")
    content, truncated = _read_file_safe(cwd, path)
    return {"path": path, "content": content, "truncated": truncated}


@app.post("/flow/resume/{thread_id}")
async def resume(thread_id: str, req: ResumeRequest) -> dict[str, Any]:
    """异步 resume：后台推进图到下一个 interrupt，前端轮询 state/events。"""
    _flow_errors.pop(thread_id, None)
    _flow_tasks[thread_id] = asyncio.create_task(
        _run_flow(thread_id, Command(resume=req.answer), _config(thread_id)),
    )
    return await _snapshot(thread_id)


@app.post("/flow/continue/{thread_id}")
async def continue_flow(thread_id: str) -> dict[str, Any]:
    """继续一个「孤儿化」的流程（编排层重启后，停在非 interrupt 的 checkpoint）。

    用空输入重新 ainvoke，LangGraph 从上次 checkpoint 继续推进到下一个 interrupt。
    """
    _flow_errors.pop(thread_id, None)
    _flow_tasks[thread_id] = asyncio.create_task(
        _run_flow(thread_id, None, _config(thread_id)),
    )
    return await _snapshot(thread_id)


@app.get("/flow/stages")
async def stages() -> list[dict[str, Any]]:
    return [{"id": s["id"], "name": s["name"]} for s in STAGES]


# ---- 阶段产物 JSON Schema 配置（结构化产物约定，图侧 jsonschema 校验）----

class SchemaRequest(BaseModel):
    schema: dict


@app.get("/stages/schema")
async def stages_schema() -> dict[str, Any]:
    """所有阶段的产物 schema（含 title/required + 完整 schema）。"""
    return {"schemas": schema_store.list_schemas()}


@app.get("/stages/schema/{stage}")
async def stage_schema(stage: str) -> dict[str, Any]:
    if stage not in _STAGE_IDS:
        raise HTTPException(status_code=400, detail=f"未知阶段：{stage}")
    schema = schema_store.get_schema(stage)
    if schema is None:
        raise HTTPException(status_code=404, detail=f"阶段 {stage} 无 schema")
    return {"stage": stage, "schema": schema}


@app.put("/stages/schema/{stage}")
async def stage_set_schema(stage: str, req: SchemaRequest) -> dict[str, Any]:
    if stage not in _STAGE_IDS:
        raise HTTPException(status_code=400, detail=f"未知阶段：{stage}")
    try:
        jsonschema.Draft202012Validator.check_schema(req.schema)
    except jsonschema.SchemaError as exc:
        raise HTTPException(status_code=400, detail=f"非法 JSON Schema：{exc.message}") from exc
    schema_store.set_schema(stage, req.schema)
    return {"stage": stage, "ok": True}


# ---- standards 管理（阶段标准 CRUD，SQLite 集中存储，经 streamable-http MCP 给多个 harness）----

_STAGE_IDS = [s["id"] for s in STAGES]


def _check_stage(stage: str) -> None:
    if stage not in _STAGE_IDS:
        raise HTTPException(status_code=400, detail=f"未知阶段：{stage}，可用：{', '.join(_STAGE_IDS)}")


def _check_name(name: str) -> None:
    if not name.endswith(".md") or name in (".", "..") or "/" in name or "\\" in name:
        raise HTTPException(status_code=400, detail=f"非法文件名：{name}（须以 .md 结尾，不含路径分隔符）")


@app.get("/standards/tree")
async def standards_tree() -> dict[str, Any]:
    """各阶段标准清单（供管理 UI 渲染目录树）。"""
    result = []
    by_stage = {r["stage"]: r["files"] for r in standards_store.list_stages()}
    for s in STAGES:
        result.append({"stage": s["id"], "name": s["name"], "files": by_stage.get(s["id"], [])})
    return {"stages": result}


@app.get("/standards/file")
async def standards_read(stage: str, name: str) -> dict[str, Any]:
    _check_stage(stage)
    _check_name(name)
    content = standards_store.read(stage, name)
    if content is None:
        raise HTTPException(status_code=404, detail=f"文件不存在：{stage}/{name}")
    return {"stage": stage, "name": name, "content": content}


class StandardsWriteRequest(BaseModel):
    content: str


@app.put("/standards/file")
async def standards_write(stage: str, name: str, req: StandardsWriteRequest) -> dict[str, Any]:
    _check_stage(stage)
    _check_name(name)
    standards_store.write(stage, name, req.content)
    return {"stage": stage, "name": name, "ok": True}


@app.delete("/standards/file")
async def standards_delete(stage: str, name: str) -> dict[str, Any]:
    _check_stage(stage)
    _check_name(name)
    if not standards_store.delete(stage, name):
        raise HTTPException(status_code=404, detail=f"文件不存在：{stage}/{name}")
    return {"stage": stage, "name": name, "ok": True}


# ---- MCP（streamable-http，POST /mcp，JSON-RPC over HTTP）----

_MCP_TOOLS = [
    {
        "name": "list_stage_standards",
        "description": "列出指定交付阶段（requirements/design/tasks/coding/testing）可用的标准/规范/领域知识清单，含标题与摘要。",
        "inputSchema": {
            "type": "object",
            "properties": {"stage": {"type": "string", "description": "阶段 id", "enum": _STAGE_IDS}},
            "required": ["stage"],
        },
    },
    {
        "name": "get_standard",
        "description": "读取指定阶段某份标准/规范的全文。standard_id 取 list_stage_standards 返回的文件名（含 .md）。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "stage": {"type": "string", "description": "阶段 id", "enum": _STAGE_IDS},
                "standard_id": {"type": "string", "description": "标准文件名（含 .md）"},
            },
            "required": ["stage", "standard_id"],
        },
    },
    {
        "name": "search_standards",
        "description": "按关键词全文搜索所有阶段的标准文档。",
        "inputSchema": {
            "type": "object",
            "properties": {"keyword": {"type": "string", "description": "搜索关键词"}},
            "required": ["keyword"],
        },
    },
]


def _caller_allowed_stages(caller: str | None) -> list[str]:
    """调用者（数字员工）可访问的知识库「类」；未知 caller 默认放行全部（兼容未带 header 的旧 preset）。"""
    if caller in _STAGE_IDS:
        return config_store.get_knowledge_stages(caller)
    return _STAGE_IDS


def _mcp_denied(stage: str) -> dict:
    return {"content": [{"type": "text", "text": f"无权访问知识库类：{stage}"}], "isError": True}


def _mcp_list_stage_standards(args: dict, caller: str | None) -> dict:
    stage = args.get("stage", "")
    if stage not in _STAGE_IDS:
        return {"content": [{"type": "text", "text": f"未知阶段：{stage}。可用：{', '.join(_STAGE_IDS)}"}], "isError": True}
    if stage not in _caller_allowed_stages(caller):
        return _mcp_denied(stage)
    items = standards_store.get_all(stage)
    if not items:
        return {"content": [{"type": "text", "text": f"阶段 {stage} 暂无标准。"}]}
    text = f"阶段 {stage} 的标准清单：\n\n" + "\n\n".join(f"- {name}｜{title}\n  {summary}" for name, title, summary in items)
    return {"content": [{"type": "text", "text": text}]}


def _mcp_get_standard(args: dict, caller: str | None) -> dict:
    stage = args.get("stage", "")
    sid = args.get("standard_id", "")
    if stage not in _STAGE_IDS:
        return {"content": [{"type": "text", "text": f"未知阶段：{stage}"}], "isError": True}
    if stage not in _caller_allowed_stages(caller):
        return _mcp_denied(stage)
    content = standards_store.read(stage, sid)
    if content is None:
        return {"content": [{"type": "text", "text": f"标准不存在：{stage}/{sid}"}], "isError": True}
    return {"content": [{"type": "text", "text": content}]}


def _mcp_search_standards(args: dict, caller: str | None) -> dict:
    kw = args.get("keyword", "")
    if not kw:
        return {"content": [{"type": "text", "text": "keyword 不能为空"}], "isError": True}
    hits = standards_store.search(kw, allowed_stages=_caller_allowed_stages(caller))
    if not hits:
        return {"content": [{"type": "text", "text": f"未找到包含「{kw}」的标准。"}]}
    return {"content": [{"type": "text", "text": "命中：\n" + "\n".join(hits[:20])}]}


def _handle_mcp(method, params, msg_id, caller):
    if method == "initialize":
        pv = (params or {}).get("protocolVersion", "2025-06-18")
        return {"jsonrpc": "2.0", "id": msg_id, "result": {
            "protocolVersion": pv,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "delivery-standards", "version": "2.0.0"},
        }}
    if method == "ping":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {}}
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": _MCP_TOOLS}}
    if method == "tools/call":
        name = (params or {}).get("name")
        args = (params or {}).get("arguments") or {}
        try:
            if name == "list_stage_standards":
                result = _mcp_list_stage_standards(args, caller)
            elif name == "get_standard":
                result = _mcp_get_standard(args, caller)
            elif name == "search_standards":
                result = _mcp_search_standards(args, caller)
            else:
                result = {"content": [{"type": "text", "text": f"未知工具：{name}"}], "isError": True}
        except Exception as exc:  # noqa: BLE001 - 工具内部错误透出为文本
            result = {"content": [{"type": "text", "text": f"工具执行出错：{exc}"}], "isError": True}
        return {"jsonrpc": "2.0", "id": msg_id, "result": result}
    return None


@app.post("/mcp")
async def mcp_endpoint(request: Request):
    """MCP streamable-http 端点：接受 JSON-RPC（单个或数组），返回 JSON 响应；纯通知返回 202。"""
    try:
        body = await request.json()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"非法 JSON：{exc}") from exc
    messages = body if isinstance(body, list) else [body]
    caller = request.headers.get("x-dsh-agent")
    responses = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        msg_id = msg.get("id")
        if msg_id is None:
            continue  # 通知（notifications/initialized 等）不响应
        resp = _handle_mcp(msg.get("method"), msg.get("params"), msg_id, caller)
        if resp is not None:
            responses.append(resp)
    if not responses:
        return Response(status_code=202)
    if isinstance(body, list):
        return JSONResponse(responses)
    return JSONResponse(responses[0])


# ---- 数字员工（阶段 agent）+ 成本统计 ----

_AGENT_META = {
    "requirements": {"role": "需求澄清", "desc": "需求资料整理、业务规则提取、需求规格编制"},
    "design": {"role": "方案设计", "desc": "业务设计、架构设计、详细模块设计"},
    "tasks": {"role": "任务拆解", "desc": "INVEST 任务拆解、服务归属、任务环编排"},
    "coding": {"role": "开发实现", "desc": "代码开发、单元测试、编译运行验证"},
    "testing": {"role": "测试验证", "desc": "单元/接口/e2e 测试、缺陷报告"},
}

# 成本单价（元 / 百万 tokens），可按模型调整。
_COST_RATES = {"uncachedInput": 1.0, "cacheRead": 0.1, "output": 2.0}


def _stage_knowledge(stage_id: str) -> list[str]:
    """该阶段数字员工可访问的知识库（= 该阶段标准文件，经 MCP 提供）。"""
    for row in standards_store.list_stages():
        if row["stage"] == stage_id:
            return row["files"]
    return []


@app.get("/agents")
async def agents() -> dict[str, Any]:
    """数字员工列表：5 个阶段 agent，每个带职责与可访问知识库。"""
    result = []
    for s in STAGES:
        sid = s["id"]
        result.append({
            "id": sid,
            "name": s["name"],
            "preset": s["preset"],
            "role": _AGENT_META.get(sid, {}).get("role", ""),
            "desc": _AGENT_META.get(sid, {}).get("desc", ""),
            "knowledge": _stage_knowledge(sid),
        })
    return {"agents": result}


@app.get("/agents/cost")
async def agents_cost() -> dict[str, Any]:
    """成本统计：遍历 harness 会话，按数字员工（preset）聚合 token 用量与成本。"""
    sessions = await client.list_sessions()
    agg: dict[str, dict[str, Any]] = {}
    for it in sessions:
        preset = it.get("agentPreset")
        if preset not in _STAGE_IDS:
            continue
        tu = (it.get("projections") or {}).get("values", {}).get("tokenUsage", {}) or {}
        uncached = int(tu.get("uncachedInputTokens", 0) or 0)
        cache = int(tu.get("cacheReadTokens", 0) or 0)
        output = int(tu.get("outputTokens", 0) or 0)
        a = agg.setdefault(preset, {"sessions": 0, "uncachedInput": 0, "cacheRead": 0, "output": 0, "cost": 0.0})
        a["sessions"] += 1
        a["uncachedInput"] += uncached
        a["cacheRead"] += cache
        a["output"] += output
        a["cost"] += (uncached * _COST_RATES["uncachedInput"] + cache * _COST_RATES["cacheRead"] + output * _COST_RATES["output"]) / 1_000_000
    result = []
    total = 0.0
    total_tokens = 0
    for s in STAGES:
        a = agg.get(s["id"], {"sessions": 0, "uncachedInput": 0, "cacheRead": 0, "output": 0, "cost": 0.0})
        total += a["cost"]
        total_tokens += a["uncachedInput"] + a["cacheRead"] + a["output"]
        result.append({
            "id": s["id"],
            "name": s["name"],
            "sessions": a["sessions"],
            "inputTokens": a["uncachedInput"] + a["cacheRead"],
            "outputTokens": a["output"],
            "cost": round(a["cost"], 2),
        })
    return {"agents": result, "totalCost": round(total, 2), "totalTokens": total_tokens}


@app.get("/agents/activity")
async def agents_activity(limit: int = 50) -> dict[str, Any]:
    """运行监控：最近的 session 活动摘要（数字员工 + 标题 + tokens + 成本）。"""
    sessions = await client.list_sessions()
    name_by_id = {s["id"]: s["name"] for s in STAGES}
    result = []
    for it in sessions:
        preset = it.get("agentPreset")
        if preset not in _STAGE_IDS:
            continue
        tu = (it.get("projections") or {}).get("values", {}).get("tokenUsage", {}) or {}
        # 优先用编排层记录的完整任务标题；历史/子代理 session 未记录时回退 harness 截断的 title。
        title = activity_store.get_session_title(it.get("sessionId")) or \
            (it.get("projections") or {}).get("values", {}).get("title") or ""
        uncached = int(tu.get("uncachedInputTokens", 0) or 0)
        cache = int(tu.get("cacheReadTokens", 0) or 0)
        output = int(tu.get("outputTokens", 0) or 0)
        tokens = uncached + cache + output
        cost = (uncached * _COST_RATES["uncachedInput"] + cache * _COST_RATES["cacheRead"] + output * _COST_RATES["output"]) / 1_000_000
        result.append({
            "sessionId": it.get("sessionId"),
            "agent": preset,
            "agentName": name_by_id.get(preset, preset),
            "title": title,
            "tokens": tokens,
            "cost": round(cost, 4),
            "running": bool(it.get("running")),
            "updatedAt": it.get("updatedAt"),
        })
    result.sort(key=lambda x: x.get("updatedAt") or 0, reverse=True)
    return {"activities": result[:limit]}


@app.get("/agents/audit")
async def agents_audit(limit: int = 100) -> dict[str, Any]:
    """审计日志：审批事件（危险命令 approval）+ 人工 gate 确认（approve/revise）记录。"""
    return {"audits": activity_store.list_activity(kind=None, limit=limit)}


# ---- 数字员工模型配置（模型 + 思考深度）----

_model_catalog: list[dict[str, Any]] = []


@app.get("/agents/models")
async def agents_models() -> dict[str, Any]:
    """可用模型目录（provider/model/思考深度），从 harness 模型目录读取并缓存。"""
    global _model_catalog
    if not _model_catalog:
        sessions = await client.list_sessions()
        if sessions:
            models = await client.session_models(sessions[0]["sessionId"])
            catalog = []
            for g in models.get("groups", []):
                for m in g.get("models", []):
                    reasoning = m.get("reasoning") or {}
                    catalog.append({
                        "provider": g["id"],
                        "model": m["id"],
                        "name": m.get("name") or m["id"],
                        "efforts": [e["id"] for e in reasoning.get("efforts", [])],
                        "defaultEffort": reasoning.get("defaultEffort"),
                    })
            _model_catalog = catalog
    return {"models": _model_catalog}


@app.get("/agents/config")
async def agents_config() -> dict[str, Any]:
    """每个数字员工当前的模型/权限配置（未配置的阶段返回 null）。"""
    configs = config_store.get_all_configs()
    result = []
    for s in STAGES:
        cfg = configs.get(s["id"])
        result.append({
            "id": s["id"],
            "name": s["name"],
            "config": {
                "provider": cfg["provider"],
                "model": cfg["model"],
                "reasoningEffort": cfg["reasoning_effort"],
                "permission": cfg.get("permission"),
                "maxRetries": cfg.get("max_retries"),
            } if cfg else None,
            "knowledgeStages": config_store.get_knowledge_stages(s["id"]),
        })
    return {"configs": result}


class AgentConfigRequest(BaseModel):
    provider: str
    model: str
    reasoningEffort: str
    permission: str | None = None
    maxRetries: int | None = None
    knowledgeStages: list[str] | None = None


@app.put("/agents/config")
async def agents_set_config(stage: str, req: AgentConfigRequest) -> dict[str, Any]:
    if stage not in _STAGE_IDS:
        raise HTTPException(status_code=400, detail=f"未知阶段：{stage}")
    if req.permission is not None and req.permission not in config_store.PERMISSIONS:
        raise HTTPException(status_code=400, detail=f"非法权限：{req.permission}，可用：{', '.join(config_store.PERMISSIONS)}")
    if req.maxRetries is not None and not (0 <= req.maxRetries <= config_store.MAX_RETRIES_CAP):
        raise HTTPException(
            status_code=400,
            detail=f"非法重试次数：{req.maxRetries}，须为 0~{config_store.MAX_RETRIES_CAP} 的整数",
        )
    if req.knowledgeStages is not None:
        bad = [s for s in req.knowledgeStages if s not in config_store.KNOWLEDGE_STAGES]
        if bad:
            raise HTTPException(
                status_code=400,
                detail=f"非法知识库类：{', '.join(bad)}，可用：{', '.join(config_store.KNOWLEDGE_STAGES)}",
            )
    config_store.set_config(
        stage, req.provider, req.model, req.reasoningEffort, req.permission, req.maxRetries, req.knowledgeStages,
    )
    return {"stage": stage, "ok": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=3087)
