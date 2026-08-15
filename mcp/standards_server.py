#!/usr/bin/env python3
"""standards MCP server（stdio，JSON-RPC 2.0，零第三方依赖）。

把 delivery/standards/<stage>/*.md 的「阶段标准 / 规范 / 领域知识」暴露成 MCP 工具：
- list_stage_standards(stage)  列出某阶段标准清单（含标题 + 摘要）
- get_standard(stage, id)      读某标准全文
- search_standards(keyword)    全文搜索所有阶段的标准

stdio 约定：stdin 读 JSON-RPC 行，stdout 写 JSON-RPC 行（UTF-8），日志写 stderr。
initialize 的 protocolVersion 直接 echo 回 client，保证与任意 SDK 版本协商成功。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

STAGES = ["requirements", "design", "tasks", "coding", "testing"]

# delivery 根目录：本文件在 delivery/mcp/ 下，standards 在 delivery/standards/。
STANDARDS_ROOT = Path(__file__).resolve().parent.parent / "standards"


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def read_msg():
    line = sys.stdin.buffer.readline()
    if not line:
        return None
    return json.loads(line.decode("utf-8"))


def write_msg(obj) -> None:
    sys.stdout.buffer.write((json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8"))
    sys.stdout.buffer.flush()


def _files(stage: str) -> list[Path]:
    d = STANDARDS_ROOT / stage
    if not d.is_dir():
        return []
    return sorted(d.glob("*.md"))


def _head(path: Path) -> tuple[str, str]:
    """返回 (标题, 摘要)。约定首行是 `# 标题`。"""
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    title = path.stem
    body: list[str] = []
    for ln in lines:
        if ln.startswith("# "):
            title = ln[2:].strip()
            continue
        body.append(ln)
    return title, "\n".join(body).strip()[:200]


def tool_list_stage_standards(args: dict):
    stage = args.get("stage", "")
    if stage not in STAGES:
        return {"content": [{"type": "text", "text": f"未知阶段：{stage}。可用：{', '.join(STAGES)}"}], "isError": True}
    files = _files(stage)
    if not files:
        return {"content": [{"type": "text", "text": f"阶段 {stage} 暂无标准文档。"}]}
    items = [f"- {f.stem}｜{_head(f)[0]}\n  {_head(f)[1]}" for f in files]
    return {"content": [{"type": "text", "text": f"阶段 {stage} 的标准清单：\n\n" + "\n\n".join(items)}]}


def tool_get_standard(args: dict):
    stage = args.get("stage", "")
    sid = args.get("standard_id", "")
    if stage not in STAGES:
        return {"content": [{"type": "text", "text": f"未知阶段：{stage}"}], "isError": True}
    path = STANDARDS_ROOT / stage / f"{sid}.md"
    if not path.is_file():
        return {"content": [{"type": "text", "text": f"标准不存在：{stage}/{sid}"}], "isError": True}
    return {"content": [{"type": "text", "text": path.read_text(encoding="utf-8")}]}


def tool_search_standards(args: dict):
    kw = args.get("keyword", "")
    if not kw:
        return {"content": [{"type": "text", "text": "keyword 不能为空"}], "isError": True}
    hits: list[str] = []
    low = kw.lower()
    for stage in STAGES:
        for f in _files(stage):
            text = f.read_text(encoding="utf-8")
            if low in text.lower():
                matched = [ln.strip() for ln in text.splitlines() if low in ln.lower()]
                hits.append(f"{stage}/{f.stem}: " + " | ".join(matched[:3]))
    if not hits:
        return {"content": [{"type": "text", "text": f"未找到包含「{kw}」的标准。"}]}
    return {"content": [{"type": "text", "text": "命中：\n" + "\n".join(hits[:20])}]}


TOOLS = [
    {
        "name": "list_stage_standards",
        "description": "列出指定交付阶段（requirements/design/tasks/coding/testing）可用的标准/规范/领域知识清单，含标题与摘要。",
        "inputSchema": {
            "type": "object",
            "properties": {"stage": {"type": "string", "description": "阶段 id", "enum": STAGES}},
            "required": ["stage"],
        },
    },
    {
        "name": "get_standard",
        "description": "读取指定阶段某份标准/规范的全文。standard_id 取 list_stage_standards 返回的文件名。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "stage": {"type": "string", "description": "阶段 id", "enum": STAGES},
                "standard_id": {"type": "string", "description": "标准 id（文件名，不含 .md）"},
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


def handle(method, params, msg_id):
    if method == "initialize":
        pv = (params or {}).get("protocolVersion", "2025-06-18")
        return {"jsonrpc": "2.0", "id": msg_id, "result": {
            "protocolVersion": pv,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "delivery-standards", "version": "1.0.0"},
        }}
    if method == "ping":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {}}
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        name = (params or {}).get("name")
        args = (params or {}).get("arguments") or {}
        try:
            if name == "list_stage_standards":
                result = tool_list_stage_standards(args)
            elif name == "get_standard":
                result = tool_get_standard(args)
            elif name == "search_standards":
                result = tool_search_standards(args)
            else:
                result = {"content": [{"type": "text", "text": f"未知工具：{name}"}], "isError": True}
        except Exception as exc:  # noqa: BLE001 - 工具内部错误透出为文本
            result = {"content": [{"type": "text", "text": f"工具执行出错：{exc}"}], "isError": True}
        return {"jsonrpc": "2.0", "id": msg_id, "result": result}
    return None  # 未知 method：忽略


def main() -> None:
    log(f"standards MCP server 启动，standards root = {STANDARDS_ROOT}")
    while True:
        msg = read_msg()
        if msg is None:
            break
        method = msg.get("method")
        msg_id = msg.get("id")
        # 通知（无 id，如 notifications/initialized、notifications/cancelled）不响应。
        if msg_id is None:
            continue
        resp = handle(method, msg.get("params"), msg_id)
        if resp is not None:
            write_msg(resp)
    log("stdin closed, server exit")


if __name__ == "__main__":
    main()
