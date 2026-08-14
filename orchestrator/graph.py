"""LangGraph 交付流水线：需求 → 设计 → 编码 → 测试，人工 gate 确认后推进。

产物走「文件 + git commit」：每个阶段 agent 用文件工具写 specs/*.md 等，编排层
读上一阶段文件拼进下一阶段 prompt，并在阶段完成后 git add + commit（版本与审计交给 git）。

human-in-the-loop 两类 interrupt：
- question：agent 用 ask_user_question 澄清/定稿（events.mux 的 question/requested 帧）。
- approval：agent 执行危险命令请求权限（events.mux 的 approval/requested 帧）。
两者都通过 events.mux 推送、通过 /api/respond 回答。

LangGraph interrupt 会在 resume 时重放节点，所以每个节点必须幂等：
- 副作用（create_session/prompt）只在 State 无 session_id 时执行。
- git commit 只在 State 未标记 stage_committed 时执行。
- interrupt 放在独立节点，读 State，不依赖重放丢失的局部队列。
"""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
from typing import Any, TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt

from harness_client import HarnessClient


class FlowState(TypedDict, total=False):
    requirement_text: str
    cwd: str
    stage_index: int
    current_session_id: str
    pending: dict[str, Any] | None
    stage_done: bool
    stage_committed: bool
    artifacts: dict[str, list[str]]


STAGES: list[dict[str, Any]] = [
    {
        "id": "requirements",
        "name": "需求分析",
        "preset": "requirements",
        "input_files": [],
        "output_files": ["specs/requirements.md"],
        "task": (
            "当前处于【需求】阶段。请阅读工作区已有材料，把用户原始需求收敛为清晰、可验收的"
            "需求规格。有歧义时用 ask_user_question 澄清；能用阅读解决的事实不要问。"
            "产出物用 write 工具写入 specs/requirements.md，结构固定为章节（完整/待补充/缺失）"
            "+ 检查项（阻断/风险/建议）+ 待确认问题清单。"
            "定稿前用 ask_user_question 提交定稿确认（「确认定稿」/「修改后继续」），"
            "用户确认定稿前不要把需求作为下一阶段输入。"
        ),
    },
    {
        "id": "design",
        "name": "架构设计",
        "preset": "design",
        "input_files": ["specs/requirements.md"],
        "output_files": ["docs/design.md"],
        "task": (
            "当前处于【设计】阶段。基于下面给出的已验收需求规格产出架构与技术方案：模块划分、"
            "数据流、接口与数据结构、依赖与技术选型、边界与失败模式、测试策略与验收标准。"
            "先读需求再设计，方案要具体到另一名工程师无需再做设计决策即可实现。"
            "设计文档写入工作区 docs/design.md，实施任务清单用 todo_write 记录，不要写实现代码。"
        ),
    },
    {
        "id": "coding",
        "name": "代码编写",
        "preset": "coding",
        "input_files": ["specs/requirements.md", "specs/services.md"],
        "output_files": ["specs/implementation.md", "services/"],
        "task": (
            "当前处于【代码编写】阶段。基于下面给出的需求规格与服务关联，逐项实现功能："
            "先建 todo 清单，再实现并用实际运行验证（运行测试、执行命令、阅读报错）。"
            "实现说明用 write 工具写入 specs/implementation.md，包含每个服务的改动点与验证方式。"
            "完成后把产物交给测试阶段。"
        ),
    },
    {
        "id": "testing",
        "name": "测试验证",
        "preset": "testing",
        "input_files": ["specs/requirements.md", "specs/implementation.md"],
        "output_files": ["docs/test-report.md"],
        "task": (
            "当前处于【测试】阶段。对照下面给出的需求验收标准与实现说明逐项验证："
            "运行测试与静态检查、构造边界用例、复现可疑行为。结论必须来自实际运行而非推断。"
            "缺陷记录为可复现的问题报告（步骤、期望、实际、影响范围）。"
            "产出物写入工作区 docs/test-report.md，用 todo_write 跟踪验证条目。"
        ),
    },
]


def _read_file(path: str) -> str | None:
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except (FileNotFoundError, OSError):
        return None


def collect_input_files(state: FlowState, stage: dict[str, Any]) -> str:
    chunks: list[str] = []
    for rel in stage.get("input_files", []):
        full = os.path.join(state["cwd"], rel)
        content = _read_file(full)
        if content is None:
            chunks.append(f"\n【输入文件 {rel}】不可用，请按已有材料尽力推进。")
        else:
            chunks.append(f"\n【输入文件 {rel}】\n{content}")
    return "\n".join(chunks)


def git_commit(cwd: str, message: str) -> bool:
    try:
        subprocess.run(["git", "add", "-A"], cwd=cwd, check=False, capture_output=True)
        r = subprocess.run(["git", "commit", "-m", message], cwd=cwd, check=False, capture_output=True)
        return r.returncode == 0
    except Exception:
        return False


async def peek_pending(client: HarnessClient, session_id: str) -> dict[str, Any] | None:
    import websockets

    ws_url = client.base_url.replace("http://", "ws://") + "/api/events.mux"
    try:
        async with websockets.connect(ws_url) as ws:
            try:
                while True:
                    raw = await asyncio.wait_for(ws.recv(), timeout=4.0)
                    frame = json.loads(raw)
                    method = frame.get("method")
                    if method not in ("question/requested", "approval/requested"):
                        continue
                    payload = frame.get("payload", {})
                    if payload.get("sessionId") != session_id:
                        continue
                    if method == "question/requested":
                        return {"kind": "question", "rpc_id": frame.get("rpcId"),
                                "questions": payload.get("questions", [])}
                    return {"kind": "approval", "rpc_id": frame.get("rpcId"),
                            "approvalId": payload.get("approvalId"),
                            "toolName": payload.get("toolName"),
                            "reason": payload.get("reason")}
            except asyncio.TimeoutError:
                return None
    except Exception:
        return None


async def start_stage(state: FlowState, client: HarnessClient) -> FlowState:
    stage = STAGES[state["stage_index"]]
    if state.get("current_session_id") is None:
        created = await client.create_session(state["cwd"], stage["preset"])
        state["current_session_id"] = created["sessionId"]
        prompt = stage["task"]
        input_text = collect_input_files(state, stage)
        if input_text:
            prompt = prompt + "\n" + input_text
        if stage["id"] == "requirements":
            prompt = prompt + f"\n\n【用户原始需求】\n{state['requirement_text']}"
        await client.prompt(created["sessionId"], prompt)
    return state


async def poll_stage(state: FlowState, client: HarnessClient) -> FlowState:
    session_id = state["current_session_id"]
    stage = STAGES[state["stage_index"]]

    pending = await peek_pending(client, session_id)
    if pending:
        state["pending"] = pending
        state["stage_done"] = False
        return state

    running = await client.session_running(session_id)
    if running:
        state["stage_done"] = False
        return state

    state["stage_done"] = True
    state.setdefault("artifacts", {})[stage["id"]] = stage.get("output_files", [])
    if not state.get("stage_committed"):
        git_commit(state["cwd"], f"delivery: {stage['name']} 阶段产物")
        state["stage_committed"] = True
    return state


async def question_node(state: FlowState, client: HarnessClient) -> FlowState:
    pending = state["pending"] or {}
    answers = interrupt({
        "type": "question",
        "stage": STAGES[state["stage_index"]]["name"],
        "session_id": state["current_session_id"],
        "rpc_id": pending.get("rpc_id"),
        "questions": pending.get("questions", []),
    })
    await client.respond_question(pending.get("rpc_id"), state["current_session_id"], answers)
    state["pending"] = None
    return state


async def approval_node(state: FlowState, client: HarnessClient) -> FlowState:
    pending = state["pending"] or {}
    outcome = interrupt({
        "type": "approval",
        "stage": STAGES[state["stage_index"]]["name"],
        "session_id": state["current_session_id"],
        "rpc_id": pending.get("rpc_id"),
        "toolName": pending.get("toolName"),
        "reason": pending.get("reason"),
    })
    await client.respond_approval(
        pending.get("rpc_id"), state["current_session_id"], pending.get("approvalId"), outcome,
    )
    state["pending"] = None
    return state


def gate_node(state: FlowState) -> FlowState:
    stage = STAGES[state["stage_index"]]
    decision = interrupt({"type": "gate", "stage": stage["name"]})
    if decision == "approve":
        return {
            **state,
            "stage_index": state["stage_index"] + 1,
            "current_session_id": None,
            "stage_done": False,
            "stage_committed": False,
        }
    return {**state, "current_session_id": None, "stage_done": False, "stage_committed": False}


def build_graph(client: HarnessClient):
    async def start(state: FlowState) -> FlowState:
        return await start_stage(state, client)

    async def poll(state: FlowState) -> FlowState:
        return await poll_stage(state, client)

    async def question(state: FlowState) -> FlowState:
        return await question_node(state, client)

    async def approval(state: FlowState) -> FlowState:
        return await approval_node(state, client)

    g = StateGraph(FlowState)
    g.add_node("start", start)
    g.add_node("poll", poll)
    g.add_node("question", question)
    g.add_node("approval", approval)
    g.add_node("gate", gate_node)

    g.add_edge(START, "start")
    g.add_edge("start", "poll")

    def route_poll(state: FlowState) -> str:
        pending = state.get("pending")
        if pending:
            return pending.get("kind") or "poll"
        if state.get("stage_done"):
            return "gate"
        return "poll"

    g.add_conditional_edges("poll", route_poll, {
        "question": "question", "approval": "approval", "gate": "gate", "poll": "poll",
    })
    g.add_edge("question", "poll")
    g.add_edge("approval", "poll")

    def route_gate(state: FlowState) -> str:
        if state["stage_index"] >= len(STAGES):
            return "done"
        return "start"

    g.add_conditional_edges("gate", route_gate, {"done": END, "start": "start"})
    return g.compile(checkpointer=MemorySaver())
