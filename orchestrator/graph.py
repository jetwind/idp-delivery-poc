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
import activity_store
import config_store
import schema_store


class FlowState(TypedDict, total=False):
    requirement_text: str
    cwd: str
    stage_index: int
    current_session_id: str
    pending: dict[str, Any] | None
    stage_done: bool
    stage_committed: bool
    artifacts: dict[str, list[str]]
    validation_attempts: int
    validation_error: str | None
    validation_status: str


STAGES: list[dict[str, Any]] = [
    {
        "id": "requirements",
        "name": "01 需求",
        "preset": "requirements",
        "input_files": [],
        "output_files": ["specs/requirements.md"],
        "task": (
            "当前处于【01 需求】阶段。请阅读工作区已有材料，把用户原始需求收敛为清晰、可验收、可测试的需求规格。\n\n"
            "采用业界需求方法论：\n"
            "1. 用户故事/用例：为每个核心场景写「作为<角色>，我希望<能力>，以便<价值>」，标注优先级（MoSCoW：Must/Should/Could/Won't）。\n"
            "2. 验收标准：每条需求给出 Given/When/Then 形式、可自动化验证的验收标准。\n"
            "3. 边界与约束：明确非功能需求（性能/安全/可用性）、范围外事项、假设与依赖。\n\n"
            "有歧义时用 ask_user_question 澄清（用户拥有的选择或材料无法回答的事实）；能用阅读解决的事实不要问。\n\n"
            "产出物用 write 工具写入 specs/requirements.md，模板固定为：\n"
            "# 需求规格\n## 1. 背景与目标\n## 2. 角色与场景（用户故事，含优先级）\n"
            "## 3. 功能需求（逐条，含 Given/When/Then 验收标准）\n## 4. 非功能需求\n"
            "## 5. 范围外与约束\n## 6. 风险与待确认问题\n\n"
            "定稿前用 ask_user_question 提交定稿确认（选项「确认定稿」/「修改后继续」）；"
            "用户未确认定稿前，不要把需求作为下一阶段输入。"
        ),
    },
    {
        "id": "design",
        "name": "02 详细设计",
        "preset": "design",
        "input_files": ["specs/requirements.md"],
        "output_files": ["docs/design.md"],
        "task": (
            "当前处于【02 详细设计】阶段。基于下面给出的已定稿需求规格，产出可直接指导实现与任务拆分的详细设计。\n\n"
            "设计覆盖三个层次：\n"
            "1. 业务设计：业务流程（关键路径/异常路径）、领域模型（实体/值对象/聚合及关系）、业务规则。\n"
            "2. 架构设计：技术架构与模块划分、服务边界（标注「新建服务」或「升级现有服务」）、数据流与通信方式（同步/异步）、"
            "技术选型（后端 Java 21 + Spring Boot、前端 Vue，需求另有指定则遵循）。\n"
            "3. 详细模块设计：每个模块/服务的职责、对外接口（REST 路径/入参出参）、内部数据结构、依赖关系、关键实现要点与失败模式。\n\n"
            "方案要具体到另一名工程师无需再做设计决策即可实现。本阶段不写实现代码，用 todo_write 跟踪设计条目。\n\n"
            "设计文档写入 docs/design.md，模板固定为：\n"
            "# 详细设计\n## 1. 业务设计（流程 + 领域模型 + 业务规则）\n## 2. 架构设计（模块/服务划分 + 数据流 + 技术选型）\n"
            "## 3. 详细模块设计（每个模块：职责/接口/数据结构/依赖）\n## 4. 服务归属清单（新建 vs 升级现有）\n"
            "## 5. 非功能与失败模式\n## 6. 实施顺序建议"
        ),
    },
    {
        "id": "tasks",
        "name": "03 任务",
        "preset": "tasks",
        "input_files": ["specs/requirements.md", "docs/design.md"],
        "output_files": ["specs/tasks.md"],
        "task": (
            "当前处于【03 任务】阶段。基于下面给出的需求规格与详细设计，把工作拆分成可独立执行、可验收的开发任务，并按依赖编排执行顺序。\n\n"
            "用 INVEST 原则拆分每个任务（Independent 独立、Negotiable 可协商、Valuable 有价值、Estimable 可估算、Small 足够小、Testable 可测试）：\n"
            "1. 每个任务明确归属到具体服务，标注「新建服务」或「升级现有服务」，技术栈：后端 Java 21 + Spring Boot、前端 Vue。\n"
            "2. 标注任务之间的依赖（哪些任务必须在哪些任务之后）。\n"
            "3. 按依赖关系给出「任务环」（执行批次）：同一环内的任务互不依赖、可并行；环与环之间串行。\n\n"
            "本阶段只拆任务、不写实现代码。产出物用 write 工具写入 specs/tasks.md，模板固定为：\n"
            "# 任务拆解\n## 1. 服务清单（服务名 → 新建/升级 + 技术栈）\n"
            "## 2. 任务列表（每个任务：ID、标题、服务归属、INVEST 评估、验收标准、依赖任务、估算）\n"
            "## 3. 依赖关系（文本描述）\n## 4. 任务环编排（第 1 环可并行任务 / 第 2 环 / ...）"
        ),
    },
    {
        "id": "coding",
        "name": "04 编码",
        "preset": "coding",
        "input_files": ["specs/tasks.md", "docs/design.md"],
        "output_files": ["specs/implementation.md", "services/", "frontend/"],
        "task": (
            "当前处于【04 编码】阶段。基于下面给出的任务拆解（specs/tasks.md）与详细设计（docs/design.md），逐环实现代码。\n\n"
            "实现要求：\n"
            "1. 按任务环顺序推进；同一环内互不依赖的任务用 subagent 并行委派，或用 workflow 编排多代理流程。\n"
            "2. 每个任务实现后写单元测试，并实际运行验证（编译通过、测试通过、应用可启动）。\n"
            "3. 后端放 services/ 下（默认 Spring Boot，Java 21）、前端放 frontend/ 下（默认 Vue）；需求或设计另有指定技术栈则遵循。\n"
            "4. 优先复用现有模式，小步提交，不越过本阶段范围改需求或做发布决策。\n\n"
            "实现说明用 write 工具写入 specs/implementation.md，模板固定为：\n"
            "# 实现说明\n## 1. 每个任务的改动点与验证方式\n## 2. 服务/模块清单（新建/升级 + 目录位置）\n"
            "## 3. 编译与运行方式（命令）\n## 4. 遗留问题与 TODO"
        ),
    },
    {
        "id": "testing",
        "name": "05 测试",
        "preset": "testing",
        "input_files": ["specs/requirements.md", "specs/implementation.md", "specs/tasks.md"],
        "output_files": ["docs/test-report.md"],
        "task": (
            "当前处于【05 测试】阶段。对照下面给出的需求验收标准、实现说明与任务清单，逐项验证交付质量。\n\n"
            "测试覆盖三层：\n"
            "1. 单元测试：运行后端（mvn test / gradle test）与前端（npm test）的单元测试，确认全部通过。\n"
            "2. 接口测试：对核心 REST 接口编写并执行接口测试（构造正常/边界/异常用例）。\n"
            "3. e2e 测试：跑通端到端主流程（关键用户路径），记录结果。\n\n"
            "结论必须来自实际运行而非推断；缺陷记录为可复现的问题报告（步骤、期望、实际、影响范围）。\n\n"
            "产出物用 write 工具写入 docs/test-report.md，模板固定为：\n"
            "# 测试报告\n## 1. 测试范围与结论（通过/失败汇总）\n## 2. 单元测试结果（命令 + 通过率）\n"
            "## 3. 接口测试结果（用例清单 + 结果）\n## 4. e2e 测试结果（主流程 + 结果）\n"
            "## 5. 缺陷清单（可复现问题报告）\n## 6. 风险与建议"
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
        # 应用该阶段数字员工的模型配置（模型 + 思考深度）与文件权限；失败则回退默认，不阻断流程。
        cfg = config_store.get_config(stage["id"])
        if cfg:
            try:
                await client.select_model(
                    created["sessionId"], cfg["provider"], cfg["model"], cfg["reasoning_effort"],
                )
                perm = cfg.get("permission")
                if perm:
                    await client.execute_command(created["sessionId"], f"/permission {perm}")
            except Exception:  # noqa: BLE001 - 配置应用失败用默认值
                pass
        prompt = stage["task"]
        input_text = collect_input_files(state, stage)
        if input_text:
            prompt = prompt + "\n" + input_text
        if stage["id"] == "requirements":
            prompt = prompt + f"\n\n【用户原始需求】\n{state['requirement_text']}"
        # 结构化产物要求：有 schema 的阶段，要求 agent 写 JSON 产物（图侧校验的正式产物）。
        schema = schema_store.get_schema(stage["id"])
        out_json = schema_store.STAGE_OUTPUT_JSON.get(stage["id"])
        if schema and out_json:
            prompt += (
                f"\n\n【结构化产物要求】\n"
                f"本阶段的正式产物是结构化 JSON 文件，必须用 write 工具写入 {out_json}，"
                f"严格遵循以下 JSON Schema（字段、类型、必填项都要满足）：\n"
                f"{json.dumps(schema, ensure_ascii=False)}\n"
                f"（markdown 文档可继续写作为可读版，但 JSON 是图侧确定性校验的正式产物。）"
            )
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
    out_files = list(stage.get("output_files", []))
    json_out = schema_store.STAGE_OUTPUT_JSON.get(stage["id"])
    if json_out and json_out not in out_files:
        out_files.append(json_out)
    state.setdefault("artifacts", {})[stage["id"]] = out_files
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
    # 审计落盘：记录「哪个数字员工请求执行了哪个危险命令，结果是批准/拒绝」。
    activity_store.record_approval(
        session_id=state["current_session_id"],
        agent=STAGES[state["stage_index"]]["name"],
        tool_name=pending.get("toolName") or "?",
        reason=pending.get("reason") or "",
        outcome=str(outcome),
    )
    state["pending"] = None
    return state


MAX_VALIDATION_ATTEMPTS = 2
COMMAND_TIMEOUT_SECONDS = 600


def _run_command(cwd: str, cmd: str, label: str) -> str | None:
    """在 cwd 下运行一条命令，返回错误描述；退出码 0 返回 None。"""
    try:
        proc = subprocess.run(
            cmd, cwd=cwd, shell=True, capture_output=True, timeout=COMMAND_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return f"{label}命令超时（>{COMMAND_TIMEOUT_SECONDS}s）：{cmd}"
    except Exception as exc:  # noqa: BLE001 - 命令执行异常按验收失败处理
        return f"{label}命令执行异常：{exc}"
    if proc.returncode == 0:
        return None
    out = (proc.stdout or b"").decode("utf-8", "replace").strip()
    err = (proc.stderr or b"").decode("utf-8", "replace").strip()
    tail = (err or out)[-2000:]
    return f"{label}命令退出码非 0（{proc.returncode}）：{cmd}\n输出尾部：\n{tail}"


def run_command_acceptance(stage_id: str, cwd: str, instance: dict[str, Any]) -> list[str]:
    """铁律 3：04/05 的「完成」由真实命令退出码判定，不信 agent 自报。

    - coding：运行 buildCommand + testCommand，任一退出码非 0 = 失败。
    - testing：运行 unitTest.command，退出码非 0 = 失败；且报告 failed 必须为 0。
    返回错误列表（空 = 通过）。
    """
    errors: list[str] = []
    if stage_id == "coding":
        for key, label in (("buildCommand", "构建"), ("testCommand", "单元测试")):
            cmd = instance.get(key)
            if not isinstance(cmd, str) or not cmd.strip():
                errors.append(f"{label}命令（{key}）为空")
                continue
            err = _run_command(cwd, cmd.strip(), label)
            if err:
                errors.append(err)
    elif stage_id == "testing":
        unit = instance.get("unitTest")
        if not isinstance(unit, dict):
            errors.append("unitTest 字段缺失或非法")
        else:
            cmd = unit.get("command")
            if not isinstance(cmd, str) or not cmd.strip():
                errors.append("单元测试命令（unitTest.command）为空")
            else:
                err = _run_command(cwd, cmd.strip(), "单元测试")
                if err:
                    errors.append(err)
            failed = unit.get("failed")
            if isinstance(failed, (int, float)) and failed != 0:
                errors.append(f"测试报告声明 failed={failed}，但确定性验收要求 0 失败")
    return errors


async def validate_node(state: FlowState, client: HarnessClient) -> FlowState:
    """图侧确定性校验：读产物 JSON + jsonschema 校验；04/05 追加命令验收（取退出码）。

    铁律 2/3：产物的「形状」由 jsonschema 验，「完成」由这条边判（04/05 跑真实
    build/test 命令的退出码），不信 agent 自报。失败重试（限次）→ 升级人工。
    """
    stage = STAGES[state["stage_index"]]
    stage_id = stage["id"]
    schema = schema_store.get_schema(stage_id)
    out_json = schema_store.STAGE_OUTPUT_JSON.get(stage_id)
    if not schema or not out_json:
        state["validation_status"] = "passed"
        state["validation_error"] = None
        return state

    full = os.path.join(state["cwd"], out_json)
    errors: list[str] = []
    instance: dict[str, Any] | None = None
    if not os.path.isfile(full):
        errors = [f"产物文件不存在：{out_json}"]
    else:
        try:
            with open(full, encoding="utf-8") as f:
                instance = json.load(f)
        except json.JSONDecodeError as exc:
            errors = [f"产物不是合法 JSON：{exc}"]
        except Exception as exc:  # noqa: BLE001 - 读产物失败按校验失败处理
            errors = [f"读产物失败：{exc}"]
        else:
            errors = schema_store.validate_instance(schema, instance)

    # schema 通过后，04/05 追加确定性命令验收（跑 build/test 命令取退出码）。
    if not errors and isinstance(instance, dict):
        errors = run_command_acceptance(stage_id, state["cwd"], instance)

    if not errors:
        state["validation_status"] = "passed"
        state["validation_error"] = None
        return state

    attempts = state.get("validation_attempts", 0) + 1
    state["validation_attempts"] = attempts
    state["validation_error"] = "\n".join(errors)
    if attempts < MAX_VALIDATION_ATTEMPTS:
        # 重试：把失败原因反馈给 agent，让它修正后重新写文件。
        state["validation_status"] = "retrying"
        state["stage_done"] = False
        # 重试期间 agent 会改产物/代码，撤销已提交标记，让修正后的文件也被 git 记录。
        state["stage_committed"] = False
        feedback = (
            f"你产出的结构化文件 {out_json} 未通过图侧确定性校验（schema 或命令验收），请修正后重试。\n"
            f"校验错误（{len(errors)} 条）：\n" + "\n".join(f"- {e}" for e in errors) + "\n"
            f"若为命令失败，请修好代码/命令，重新运行验证并更新 {out_json} 后写回；"
            f"若为 schema 问题，请严格遵循给定的 JSON Schema 修正内容。"
        )
        await client.prompt(state["current_session_id"], feedback)
        return state

    state["validation_status"] = "failed"
    state["stage_done"] = True
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

    async def validate(state: FlowState) -> FlowState:
        return await validate_node(state, client)

    g = StateGraph(FlowState)
    g.add_node("start", start)
    g.add_node("poll", poll)
    g.add_node("question", question)
    g.add_node("approval", approval)
    g.add_node("validate", validate)
    g.add_node("gate", gate_node)

    g.add_edge(START, "start")
    g.add_edge("start", "poll")

    def route_poll(state: FlowState) -> str:
        pending = state.get("pending")
        if pending:
            return pending.get("kind") or "poll"
        if state.get("stage_done"):
            return "validate"
        return "poll"

    g.add_conditional_edges("poll", route_poll, {
        "question": "question", "approval": "approval", "validate": "validate", "poll": "poll",
    })
    g.add_edge("question", "poll")
    g.add_edge("approval", "poll")

    def route_validate(state: FlowState) -> str:
        if state.get("validation_status") == "retrying":
            return "poll"
        return "gate"

    g.add_conditional_edges("validate", route_validate, {"gate": "gate", "poll": "poll"})

    def route_gate(state: FlowState) -> str:
        if state["stage_index"] >= len(STAGES):
            return "done"
        return "start"

    g.add_conditional_edges("gate", route_gate, {"done": END, "start": "start"})
    return g.compile(checkpointer=MemorySaver())
