# AI 原生交付平台（IDP Delivery POC）

> 本文档记录项目的目标、演进过程中的关键补充信息与决策，作为团队协作与后续演进的基线。

## 一、项目目标

在 DeepSeek Harness（dsh）之上构建「AI 项目原生交付」能力：以**项目视角**、**Web 方式**，覆盖 **需求 → 设计 → 任务 → 编码 → 测试 → 发布 → 复盘** 全流程，由 AI 驱动各阶段执行，人工在关键门禁处把关。

核心诉求（按演进顺序）：

1. **后端 POC**：spec（规格）持久化 + 阶段 preset + 人工门禁。
2. **规格存储持久化 + wire 契约**：把「需求 / 服务关联 / 实现 / 评审」等规格文档结构化存储，带版本 CAS 与审计决策日志。
3. **与 harness 解耦**：改动全部放在独立文件夹，**harness 源码零改动**；上传交付物时不携带 harness 代码、node_modules、构建产物。
4. **配套前端 `fronted/`**（AI 原生交付平台 React 原型）作为本次交付的一部分。
5. **前端联动后端驱动整个流程**：前端指挥台通过 dsh 的会话 API 与规格端点，驱动 agent 逐阶段执行交付。

## 二、架构

```
fronted（React 前端）
   │  Vite 同源代理 /api
   ▼
dsh web 实例（后端，独立进程，端口 3086）
   ├── session.create / prompt / history / list   ← 驱动 agent 执行（agent 循环 + 文件/工具）
   └── specStore.list / get / put / decide        ← 结构化规格持久化 + 人工门禁（spec 插件）
```

- **agent 执行**：`session.create` 开新会话 → `session.prompt` 发阶段任务 → `session.history` 轮询读回执行流（`assistant/message` 文本、`tool/call` 工具调用）→ `session.list` 的 `running` 判定完成。
- **规格持久化**：spec 插件把规格文档存进 storage-domain，`put` 走版本 CAS（`ifVersion`），`decide` 追加不可变门禁决策并推进状态（`submitted → approved/rejected/revised`）。

## 三、关键约束与决策（演进中沉淀）

1. **typert 硬约束**：spec 插件的 `@Remote` 契约由 typert 生成器产出，生成器要求插件源码与 harness **在同一 workspace root**（跨目录报 TS6059）。因此开发/联调阶段把插件源码复制进 harness 的 `packages/delivery/` 构建，**交付阶段回到独立文件夹**（源码保存于本仓库，构建借用同级 `../deepseek-harness` 环境）。

2. **端口约定**：`3080` = 当前 GUI 会话进程（**不可动**）；`3086` = 联调后端实例（用户指定）。

3. **前端联后端必须走 Vite 同源代理**：dsh 的 HTTP 层只收 `application/json`（强制 CORS preflight），且从不回 preflight 头；浏览器直连跨域必失败。故 `vite.config.ts` 把 `/api` 代理到后端。

4. **两套 wire 协议（重要区分）**：
   - **legacy API**（apiproxy 静态表）：`POST /api/session.list`（**点号**），payload **直接**放业务参数。
   - **Remote 端点**（api-gateway，插件 `@Remote`）：`POST /api/{namespace}/{method}`（**斜杠**，如 `/api/specStore/list`），payload 必须包一层 `{ "args": { "request": {...} } }`。
   - 响应统一为 `{ type: 'server-response', rpcId, result: { ok, value | error } }`；业务错误恒为 HTTP 200 + `ok:false`。

5. **两条联动路线**：
   - **路线一（零插件）**：只用 dsh 原生 session API，agent 用文件工具把规格写进 `specs/*.md`，前端读文件/history 呈现。已验证跑通。
   - **路线二（正规插件化）**：spec 插件挂到一个**独立 dsh 实例**（不碰 3080），前端联 `/api/specStore/*` 得到结构化端点 + 版本 CAS + 门禁决策日志。已验证跑通（见下）。

6. **数据模型对应**：前端 `SpecData` ↔ 后端 `SpecRecord`；`humanGate.history` ↔ `decisions`；`LinkService` 四作用（直接复用 / 接口适配 / 核心改造 / 新建）↔ services 规格 kind。

## 四、验证结果

**路线一（agent 写文件 + 前端读回）**：前端 transport 层调 `session.create` 开新会话 → `session.prompt` 发「需求阶段」任务 → agent 真实执行（read×6 / glob×1 / pwsh×1 / write×1）→ 产出 `examples/project-delivery/specs/requirements.md`（3 条 P0/P1 需求 + 验收标准）→ `running=false` 判定完成。

**路线二（spec 插件 + specStore 端点）**：spec 插件挂入 3086 后，`/api/specStore/*` 全链路验证通过：

| 操作 | 结果 |
|---|---|
| `put`（ifVersion 0 新建）| version=1 / submitted |
| `get` | 读回 version=1 |
| `decide`（approved）| version=2 / approved / decisions+1 |
| `put`（旧版本 CAS）| `version-conflict`，current=2 |
| `list` | 返回已存规格 |

## 五、目录结构

```
packages/spec/          规格持久化插件（SpecRecord + specStore.list/get/put/decide）
packages/tool-spec/     模型工具（spec_list/read/save/decide）
packages/bundle/        阶段 preset（requirements/design/coding/testing/release/retrospective/…）
examples/project-delivery/  可运行 demo（cordis.yml + smoke 测试）
fronted/                AI 原生交付平台前端（含 transport 层 + AI 驱动面板）
tests/spec-protocol/    规格协议测试
tsconfig.base.json      paths 引用 ../deepseek-harness（构建借用 harness 环境，不含 harness 代码）
```

## 六、构建与联调须知

- 本仓库**不含任何 harness 代码**；构建 spec 插件需 harness 在同级目录 `../deepseek-harness`（typert 约束）。
- 联调后端：`pnpm dsh web --patch <overlay> --port 3086`（等价 `npx @deepseek-ai/dsh web`，源码版因本机 npm registry 的 harness 包不完整而采用）。
- 前端：`cd fronted && npm install && npm run dev`，`DSH_BACKEND` 可指定后端地址（默认 `http://127.0.0.1:3080`）。
