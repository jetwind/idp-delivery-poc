"""FastAPI 编排服务：把 LangGraph 流水线暴露成 HTTP API 给前端。

端点：
- POST /flow/start  启动流水线（输入需求文本 + 工作目录），跑到第一个 gate/question 暂停。
- GET  /flow/state/{thread_id}  读当前阶段 + 待处理的 interrupt（gate 或 question）。
- POST /flow/resume/{thread_id}  回答 question 或给出 gate 决策，继续推进。

前端轮询 state 拿「当前阶段 + 待人工处理项」，处理完调 resume。
"""

from __future__ import annotations

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
    }


@app.post("/flow/start")
async def start(req: StartRequest) -> dict[str, Any]:
    thread_id = str(uuid.uuid4())
    initial: dict[str, Any] = {
        "requirement_text": req.requirement_text,
        "cwd": req.cwd,
        "stage_index": 0,
        "artifacts": {},
    }
    await graph.ainvoke(initial, config=_config(thread_id))
    return await _snapshot(thread_id)


@app.get("/flow/state/{thread_id}")
async def state(thread_id: str) -> dict[str, Any]:
    return await _snapshot(thread_id)


@app.post("/flow/resume/{thread_id}")
async def resume(thread_id: str, req: ResumeRequest) -> dict[str, Any]:
    """同步 resume：推进图到下一个 interrupt，返回该 interrupt 的快照。

    会阻塞到下一个 gate/question（agent 跑几分钟），所以前端必须直连本服务
    （带 CORS），不要走 Vite proxy（其长连接会被中间层断开）。
    """
    try:
        await graph.ainvoke(Command(resume=req.answer), config=_config(thread_id))
    except Exception as exc:  # noqa: BLE001 - 把图错误透传给前端排查
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return await _snapshot(thread_id)


@app.get("/flow/stages")
async def stages() -> list[dict[str, Any]]:
    return [{"id": s["id"], "name": s["name"]} for s in STAGES]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8080)
