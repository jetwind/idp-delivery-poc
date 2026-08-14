"""LangGraph 交付流水线：需求 → 设计 → 编码 → 测试，人工 gate 确认后推进。

LangGraph interrupt 会在 resume 时重放节点，所以每个节点都必须幂等：
- 副作用（create_session/prompt）只在 State 无 session_id 时执行。
- interrupt 放在独立的 question_node / gate_node，读 State（checkpoint 保存），
  不依赖重放时会丢失的局部队列。
- question 检测用短连接读 events.mux 的 pending question 帧（幂等：重放 pending）。
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt

from harness_client import HarnessClient


class FlowState(TypedDict, total=False):
    requirement_text: str
    cwd: str
    stage_index: int
    spec_cache: dict[str, dict[str, Any]]
    current_session_id: str
    pending_question: dict[str, Any] | None
    stage_done: bool


STAGES: list[dict[str, Any]] = [
    {
        "id": "requirements",
        "name": "需求分析",
        "preset": "requirements",
        "spec_id": "p1/requirements",
        "input_specs": [],
        "task": (
            "当前处于【需求】阶段。请阅读工作区已有材料，把用户原始需求收敛为清晰、可验收的"
            "需求规格。有歧义时用 ask_user_question 澄清；能用阅读解决的事实不要问。"
            "产出物用 spec_save 写入需求规格（specId=p1/requirements，kind=requirements），"
            "结构固定为章节（完整/待补充/缺失）+ 检查项（阻断/风险/建议）+ 待确认问题清单。"
            "定稿前用 ask_user_question 提交定稿确认（「确认定稿」/「修改后继续」），"
            "确认定稿后用 spec_decide 记录 approved。"
        ),
    },
    {
        "id": "design",
        "name": "架构设计",
        "preset": "design",
        "spec_id": None,
        "input_specs": ["p1/requirements"],
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
        "spec_id": "p1/implementation",
        "input_specs": ["p1/requirements", "p1/services"],
        "task": (
            "当前处于【代码编写】阶段。基于下面给出的需求规格与服务关联，逐项实现功能："
            "先建 todo 清单，再实现并用实际运行验证（运行测试、执行命令、阅读报错）。"
            "实现说明用 spec_save 写入实现规格（specId=p1/implementation，kind=implementation），"
            "包含每个服务的改动点与验证方式。完成后把产物交给测试阶段。"
        ),
    },
    {
        "id": "testing",
        "name": "测试验证",
        "preset": "testing",
        "spec_id": None,
        "input_specs": ["p1/requirements", "p1/implementation"],
        "task": (
            "当前处于【测试】阶段。对照下面给出的需求验收标准与实现说明逐项验证："
            "运行测试与静态检查、构造边界用例、复现可疑行为。结论必须来自实际运行而非推断。"
            "缺陷记录为可复现的问题报告（步骤、期望、实际、影响范围）。"
            "产出物写入工作区 docs/test-report.md，用 todo_write 跟踪验证条目。"
        ),
    },
]


def format_spec(spec: dict[str, Any]) -> str:
    lines = [f"# {spec.get('title', spec.get('id', ''))} (V{spec.get('version', '?')})"]
    for section in spec.get("sections", []):
        lines.append(f"\n## {section.get('title')} [{section.get('status')}]")
        for line in section.get("content", []):
            lines.append(f"- {line}")
    if spec.get("checks"):
        lines.append("\n## 检查项")
        for check in spec.get("checks", []):
            lines.append(f"- [{check.get('type')}] {check.get('title')}: {check.get('desc')}")
    if spec.get("pendings"):
        lines.append("\n## 待确认")
        for pending in spec.get("pendings", []):
            lines.append(f"- {pending.get('q')}（待 {pending.get('who')}）")
    return "\n".join(lines)


async def collect_input_specs(state: FlowState, stage: dict[str, Any], client: HarnessClient) -> str:
    chunks: list[str] = []
    for spec_id in stage.get("input_specs", []):
        spec = state.get("spec_cache", {}).get(spec_id)
        if spec is None:
            try:
                spec = await client.spec_get(spec_id)
                state.setdefault("spec_cache", {})[spec_id] = spec
            except Exception:
                chunks.append(f"\n【输入规格 {spec_id}】不可用，请按已有材料尽力推进。")
                continue
        chunks.append(f"\n【输入规格 {spec_id}】\n{format_spec(spec)}")
    return "\n".join(chunks)


async def build_prompt(state: FlowState, stage: dict[str, Any], client: HarnessClient) -> str:
    prompt = stage["task"]
    input_text = await collect_input_specs(state, stage, client)
    if input_text:
        prompt = prompt + "\n" + input_text
    if stage["id"] == "requirements":
        prompt = prompt + f"\n\n【用户原始需求】\n{state['requirement_text']}"
    return prompt


async def peek_question(client: HarnessClient, session_id: str) -> dict[str, Any] | None:
    """短连接读 events.mux，拿该 session 的 pending question（重放），读不到返回 None。"""
    import websockets

    ws_url = client.base_url.replace("http://", "ws://") + "/api/events.mux"
    try:
        async with websockets.connect(ws_url) as ws:
            try:
                while True:
                    raw = await asyncio.wait_for(ws.recv(), timeout=4.0)
                    frame = json.loads(raw)
                    if frame.get("method") != "question/requested":
                        continue
                    payload = frame.get("payload", {})
                    if payload.get("sessionId") != session_id:
                        continue
                    return {"rpc_id": frame.get("rpcId"), "questions": payload.get("questions", [])}
            except asyncio.TimeoutError:
                return None
    except Exception:
        return None


async def start_stage(state: FlowState, client: HarnessClient) -> FlowState:
    """创建 session + 发 prompt（幂等：session_id 存 State）。"""
    stage = STAGES[state["stage_index"]]
    if state.get("current_session_id") is None:
        created = await client.create_session(state["cwd"], stage["preset"])
        state["current_session_id"] = created["sessionId"]
        prompt = await build_prompt(state, stage, client)
        await client.prompt(created["sessionId"], prompt)
    return state


async def poll_stage(state: FlowState, client: HarnessClient) -> FlowState:
    """轮询 agent：检测 question → 存 State；检测完成 → 读产物。"""
    session_id = state["current_session_id"]
    stage = STAGES[state["stage_index"]]

    question = await peek_question(client, session_id)
    if question:
        state["pending_question"] = question
        state["stage_done"] = False
        return state

    running = await client.session_running(session_id)
    if running:
        state["stage_done"] = False
        return state

    # agent 结束：读结构化产物。
    state["stage_done"] = True
    if stage.get("spec_id"):
        try:
            spec = await client.spec_get(stage["spec_id"])
            state.setdefault("spec_cache", {})[stage["spec_id"]] = spec
        except Exception:
            pass
    return state


async def question_node(state: FlowState, client: HarnessClient) -> FlowState:
    """人工回答：interrupt 暂停，resume 后 respond 并清空 pending。"""
    pending = state["pending_question"] or {}
    answers = interrupt({
        "type": "question",
        "stage": STAGES[state["stage_index"]]["name"],
        "session_id": state["current_session_id"],
        "rpc_id": pending.get("rpc_id"),
        "questions": pending.get("questions", []),
    })
    await client.respond_question(pending.get("rpc_id"), state["current_session_id"], answers)
    state["pending_question"] = None
    return state


def gate_node(state: FlowState) -> FlowState:
    """人工门禁：interrupt 暂停，approve 推进 / reject 重跑当前阶段。"""
    stage = STAGES[state["stage_index"]]
    decision = interrupt({
        "type": "gate",
        "stage": stage["name"],
        "spec_id": stage.get("spec_id"),
    })
    if decision == "approve":
        return {**state, "stage_index": state["stage_index"] + 1, "current_session_id": None, "stage_done": False}
    return {**state, "current_session_id": None, "stage_done": False}


def build_graph(client: HarnessClient):
    async def start(state: FlowState) -> FlowState:
        return await start_stage(state, client)

    async def poll(state: FlowState) -> FlowState:
        return await poll_stage(state, client)

    async def question(state: FlowState) -> FlowState:
        return await question_node(state, client)

    g = StateGraph(FlowState)
    g.add_node("start", start)
    g.add_node("poll", poll)
    g.add_node("question", question)
    g.add_node("gate", gate_node)

    g.add_edge(START, "start")
    g.add_edge("start", "poll")

    def route_poll(state: FlowState) -> str:
        if state.get("pending_question"):
            return "question"
        if state.get("stage_done"):
            return "gate"
        return "poll"

    g.add_conditional_edges("poll", route_poll, {"question": "question", "gate": "gate", "poll": "poll"})
    g.add_edge("question", "poll")

    def route_gate(state: FlowState) -> str:
        if state["stage_index"] >= len(STAGES):
            return "done"
        return "start"

    g.add_conditional_edges("gate", route_gate, {"done": END, "start": "start"})
    return g.compile(checkpointer=MemorySaver())
