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
import json
import os
import subprocess
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.types import Command

from graph import STAGES, build_graph
from harness_client import HarnessClient

app = FastAPI(title="delivery-orchestrator")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
client = HarnessClient()
graph = build_graph(client)

# 后台图执行任务（thread_id → asyncio.Task）+ 图运行错误（thread_id → str）。
_flow_tasks: dict[str, asyncio.Task] = {}
_flow_errors: dict[str, str] = {}


async def _run_flow(thread_id: str, input_: Any, config: dict[str, Any]) -> None:
    """后台跑图：跑到下一个 interrupt 后返回；异常记入 _flow_errors，由快照透出。"""
    try:
        await graph.ainvoke(input_, config=config)
    except Exception as exc:  # noqa: BLE001 - 图错误透传给前端排查
        _flow_errors[thread_id] = str(exc)


# 交付文件夹根目录（orchestrator/ 的上一级），git URL clone 到这里下的 projects/。
DELIVERY_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_GIT_URL_PREFIXES = ("http://", "https://", "git@", "ssh://", "git://")


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
    }


@app.post("/flow/start")
async def start(req: StartRequest) -> dict[str, Any]:
    thread_id = str(uuid.uuid4())
    cwd = _resolve_cwd(req.cwd)
    initial: dict[str, Any] = {
        "requirement_text": req.requirement_text,
        "cwd": cwd,
        "stage_index": 0,
        "artifacts": {},
    }
    _flow_errors.pop(thread_id, None)
    _flow_tasks[thread_id] = asyncio.create_task(_run_flow(thread_id, initial, _config(thread_id)))
    return await _snapshot(thread_id)


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
        return {"thread_id": thread_id, "session_id": None, "running": False, "stage": stage, "events": []}
    running = await client.session_running(session_id)
    history = await client.session_history(session_id, max_messages=60)
    items: list[dict[str, Any]] = []
    for entry in history.get("events", []):
        summarized = _summarize_event(entry)
        if summarized:
            summarized["session_id"] = session_id
            summarized["stage"] = stage
            items.append(summarized)
    items.sort(key=lambda e: e.get("seq") or 0)
    return {"thread_id": thread_id, "session_id": session_id, "running": running, "stage": stage, "events": items}


@app.post("/flow/resume/{thread_id}")
async def resume(thread_id: str, req: ResumeRequest) -> dict[str, Any]:
    """异步 resume：后台推进图到下一个 interrupt，前端轮询 state/events。"""
    _flow_errors.pop(thread_id, None)
    _flow_tasks[thread_id] = asyncio.create_task(
        _run_flow(thread_id, Command(resume=req.answer), _config(thread_id)),
    )
    return await _snapshot(thread_id)


@app.get("/flow/stages")
async def stages() -> list[dict[str, Any]]:
    return [{"id": s["id"], "name": s["name"]} for s in STAGES]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8080)
