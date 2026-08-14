# orchestrator — LangGraph 交付流水线编排服务

独立于 harness 的 **Python 编排层**：用 LangGraph 驱动 harness（执行层）逐阶段完成项目交付。

```
前端 React (3000)
   │ HTTP  /flow/start /flow/state /flow/resume
   ▼
LangGraph 编排服务 (Python, 8080)   ← 本目录
   │ HTTP session.* + specStore.*  + WebSocket events.mux
   ▼
harness 执行层 (3086, dsh web)
   └─ 各阶段 agent（挂 requirements/design/coding/testing preset）真实干活
```

**定位**：编排层只负责「阶段顺序、产物流转、gate 暂停、question 转达」；harness 只负责「跑对应 preset 的 agent 干活」。

## 四阶段流水线

| 阶段 | preset | 输出 | 下一阶段输入 |
|---|---|---|---|
| 需求分析 | requirements | specStore `p1/requirements` | 塞进设计 prompt |
| 架构设计 | design | 文件 `docs/design.md` | — |
| 代码编写 | coding | specStore `p1/implementation` + 代码 | 塞进测试 prompt |
| 测试验证 | testing | 文件 `docs/test-report.md` | — |

产物传递由编排层做：读上一阶段 specStore 规格，格式化后拼进下一阶段的 prompt（design/coding preset 没有 tool-spec，无法自己 spec_read）。

## 文件说明

- `harness_client.py` — harness 3086 的 HTTP/WebSocket 客户端
- `graph.py` — LangGraph 图（幂等节点 start → poll → question/gate）
- `server.py` — FastAPI，暴露 `/flow/*` 给前端
- `test_flow.py` — 端到端验证脚本（自动回答 question + approve gate）
- `requirements.txt` — Python 依赖

## wire 契约（写 client 前必读）

两套协议，别搞混（详见 `../PROJECT.md`）：

- **legacy API**：`POST /api/session.{method}`（点号），payload 直接放业务参数。
- **Remote 端点**：`POST /api/specStore/{method}`（斜杠），payload 必须 `{"args":{"request":{...}}}`，双层 ok。
- **question**：`WS /api/events.mux` 收 `server-request` 帧（`method=question/requested`，会重放 pending），回答走 `POST /api/respond`（client-response，echo rpcId，`result.value={sessionId, answer:{answers:[{id,selected,custom?}]}}`）。

## 关键机制（踩过的坑）

1. **LangGraph interrupt 会重放节点**：resume 时节点从头重放，`interrupt()` 返回 checkpoint 里保存的 resume 值。所以节点必须**幂等**——`create_session`/`prompt` 只在 State 无 `current_session_id` 时执行（session_id 存 State，interrupt 时 checkpoint 保存）。
2. **interrupt 放独立节点**：`question_node`/`gate_node` 读 State（checkpoint 保存），不能依赖重放时丢失的局部队列。
3. **question 检测用短连接读 mux**：`peek_question` 每次连一次 `events.mux`，读该 session 的 pending question（幂等，重放 pending）。

## 依赖与启动

### 1. harness 执行层（3086）

前置：spec 插件 + 阶段 preset 已挂载（**开发期临时改动**，交付时回滚 harness）：
- `$DSH_HOME/.agent-presets/` 下放 8 个阶段 preset（requirements/design/coding/testing/...）
- web-app bundle 依赖 `@deepseek-ai/dsh-spec` + `@deepseek-ai/dsh-tool-spec`

```sh
cd ../deepseek-harness  # harness 仓库（同级的源码树）
pnpm dsh web --patch apps/web/tests/spec-protocol.overlay.yml --port 3086
```

### 2. 编排服务（8080）

```sh
cd orchestrator
python -m pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8080
```

### 3. 端到端验证（不接前端，直接跑图）

```sh
python -u test_flow.py
```

`test_flow.py` 会自动：输入需求 → 逐阶段跑 → 自动回答 question → 自动 approve gate，打印阶段推进与产物。

## API（给前端）

- `POST /flow/start` body `{requirement_text, cwd}` → 启动流水线，返回 `{thread_id, stage, stage_index, pending, spec_cache}`
- `GET /flow/state/{thread_id}` → 读当前阶段 + 待处理的 interrupt
- `POST /flow/resume/{thread_id}` body `{answer}` → 回答 question（`[{id,selected,custom?}]`）或 gate（`"approve"`/`"reject"`）
- `GET /flow/stages` → 阶段列表

`pending` 为 `null` 表示无待处理；否则 `{type:"question", questions:[...]}` 或 `{type:"gate", stage, spec_id}`。

## 剩余工作

- 前端流水线 UI：页面接入 `/flow/*`（聊天输入需求 → 阶段推进 → question 表单 → gate 按钮），替换现有 DeliveryDriver。
