# orchestrator — LangGraph 交付流水线编排服务

独立于 harness 的 **Python 编排层**：用 LangGraph 驱动 harness（执行层）逐阶段完成项目交付。

```
前端 React (3000)
   │ HTTP  /flow/start /flow/state /flow/resume /stages/schema ...
   ▼
LangGraph 编排服务 (Python, 3087)   ← 本目录
   │ HTTP session.* + commands/execute  + WebSocket events.mux
   ▼
harness 执行层 (3086, dsh web)
   └─ 各阶段 agent（挂 requirements/design/tasks/coding/testing preset）真实干活
```

**定位（三条铁律）**：
1. 编排层拥有「阶段顺序、状态、验收」，模型只拥有「内容」。
2. 阶段之间传递 **schema 校验过的结构化产物（JSON）**，不是散文；markdown 文档是可读版。
3. 验收 = 确定性检查，不信 agent 自报——01~03 用 jsonschema 验形状，04/05 再跑真实 build/test 命令取退出码。

## 五阶段流水线

| 阶段 | preset | 结构化产物（图侧校验） | 可读文档 | 确定性验收 |
|---|---|---|---|---|
| 01 需求 | requirements | `specs/requirements.json` | `specs/requirements.md` | jsonschema |
| 02 详细设计 | design | `docs/design.json` | `docs/design.md` | jsonschema |
| 03 任务 | tasks | `specs/tasks.json` | `specs/tasks.md` | jsonschema |
| 04 编码 | coding | `specs/implementation.json` | `specs/implementation.md` + `services/` `frontend/` | jsonschema + 跑 `buildCommand`/`testCommand` 取退出码 |
| 05 测试 | testing | `docs/test-report.json` | `docs/test-report.md` | jsonschema + 跑 `unitTest.command` 取退出码、`failed` 必须为 0 |

- 产物 JSON Schema 存 SQLite（`schema_store.py`），可经 UI「产物 Schema」tab 或 `PUT /stages/schema/{stage}` 配置。
- 校验失败 → 反馈进 prompt 重试（次数每阶段可配置，默认 2 次，见「数字员工中心」）→ 仍失败升级人工 gate（`validation_status=failed`）。
- 版本与审计走 git：每阶段产物落盘后 `git commit`（作者去标识为 `jetwind`）。

## 文件说明

- `graph.py` — LangGraph 图（幂等节点 start → poll → question/approval → validate → gate），`STAGES` 定义 5 阶段。
- `server.py` — FastAPI，暴露 `/flow/*`、`/stages/schema`、`/standards/*`、`/mcp`、`/agents/*`。
- `harness_client.py` — harness 3086 的 HTTP/WebSocket 客户端（session.* + commands/execute + respond）。
- `schema_store.py` — 阶段产物 JSON Schema 存储 + `jsonschema` Draft202012 校验。
- `standards_store.py` — 标准/领域知识集中存储（SQLite），经 `POST /mcp`（streamable-http）给各 harness agent。
- `config_store.py` — 各阶段数字员工的模型/思考深度/文件权限/产物验收重试次数配置。
- `activity_store.py` — 审批（危险命令）审计落盘。
- `test_flow.py` — 端到端验证（旧）；`verify_full_flow.py` — 5 阶段端到端（自动答 question + approve gate）。
- `test_command_acceptance.py` / `test_validate_acceptance.py` — 04/05 命令验收的单测 / 集成测试（不依赖 harness）。

## wire 契约（写 client 前必读）

- **legacy API**：`POST /api/session.{method}`（点号），payload 直接放业务参数。
- **Remote 端点**：`POST /api/commands/execute`（斜杠），payload 必须 `{"args":{"agentId","line"}}`，用于 `/permission <preset>`。
- **question/approval**：`WS /api/events.mux` 收 `server-request` 帧（`question/requested`、`approval/requested`），回答走 `POST /api/respond`（client-response，echo rpcId）。

## 关键机制（踩过的坑）

1. **LangGraph interrupt 会重放节点**：节点必须幂等——`create_session`/`prompt` 只在 State 无 `current_session_id` 时执行；`git commit` 只在 `stage_committed` 未标记时执行。
2. **interrupt 放独立节点**：`question_node`/`approval_node`/`gate_node` 读 State（checkpoint 保存），不依赖重放丢失的局部队列。
3. **question 检测用短连接读 mux**：`peek_pending` 每次连一次 `events.mux`，读该 session 的 pending 帧。
4. **MCP serverName 全局唯一**：mcp-client 按 `ctx.root` 全局去重，各 preset 的 standards 连接用 `standards-<stage>` 唯一命名，否则同名冲突。
5. **前端连编排层用 `127.0.0.1` 而非 `localhost`**：IPv6 `::1`→IPv4 回退导致每请求 3~5s 延迟。

## 依赖与启动

### 1. harness 执行层（3086）

```sh
cd ../deepseek-harness  # harness 仓库（harness 本身零改动）
pnpm dsh web --port 3086
```

前置：`harness-setup.ps1` 把 `packages/bundle/presets/*` 拷贝到 `$DSH_HOME/.agent-presets/`（preset 改动后需重启 harness）。

### 2. 编排服务（3087）

```sh
cd orchestrator
python -m pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 3087
```

### 3. 端到端验证

```sh
python -u verify_full_flow.py   # 5 阶段全流程，自动答 question + approve gate
python -u test_command_acceptance.py     # 04/05 命令验收单测（不依赖 harness）
python -u test_validate_acceptance.py    # validate 边集成测试（真实 Node 临时项目）
```

## API（给前端）

- `POST /flow/start` `{requirement_text, cwd}` → `{thread_id, stage, stage_index, pending, validation}`
- `GET /flow/state/{thread_id}` / `GET /flow/events/{thread_id}` / `GET /flow/files/{thread_id}` / `GET /flow/file/{thread_id}?path=`
- `POST /flow/resume/{thread_id}` `{answer}` — question 回 `[{id,selected,custom?}]`，approval 回 `"allowed-once"/"rejected"`，gate 回 `"approve"/"reject"`
- `GET /flow/stages` / `GET|PUT /stages/schema/{stage}`
- `GET /standards/tree` / `GET|PUT|DELETE /standards/file`
- `GET /agents` / `/agents/cost` / `/agents/activity` / `/agents/audit` / `/agents/models` / `GET|PUT /agents/config`
