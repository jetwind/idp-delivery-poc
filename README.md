# AI 原生交付平台（IDP Delivery POC）

在 [DeepSeek Harness (`dsh`)](https://github.com/deepseek-ai/deepseek-harness) 之上构建的**项目级 AI 原生交付平台**：以**项目 → 版本**的视角，由 AI 逐阶段真实执行「需求 → 设计 → 任务 → 编码 → 测试」，**人工在关键门禁（gate）处审计、确认、补充矫正**，最终交付可运行的代码与文档。

> 本文面向**要启动并操作这套平台**的人。想快速跑通一个 Demo，见 [DEMO.md](DEMO.md)；想了解设计演进与历史决策，见 [PROJECT.md](PROJECT.md)。

---

## 1. 三服务架构

```
React 前端 (3000)  →  LangGraph 编排 (3087)  →  harness 执行层 (3086)
  项目/版本/审计 UI      阶段图 + 结构化校验        各阶段 agent（挂 preset）真实干活
```

| 端口 | 进程 | 作用 |
|---|---|---|
| **3000** | `fronted/`（React + Vite） | 项目/版本/流水线/审计/驾驶舱 UI |
| **3087** | `orchestrator/`（FastAPI + LangGraph） | 流水线编排：驱动 harness、传递产物、schema 校验、确定性验收、人工门禁 |
| **3086** | `dsh`（harness 外部仓库） | 各阶段数字员工（agent）真实执行：读文件、写代码、跑测试 |

> 端口 **3080** 是 dsh 自带的 Web GUI 会话进程，**不要占用**。前端直连 3087（`src/api/flow.ts` 的 `FLOW_BASE`），不要改成相对路径代理。

---

## 2. 前置条件

- **harness 源码**在同级目录 `../deepseek-harness`（已 `pnpm install`）
- Node 18+ / pnpm（跑 harness 与前端）
- Python 3.10+（跑编排服务）
- `DEEPSEEK_API_KEY`（真实 LLM 调用，harness 用它跑 agent）

---

## 3. 快速启动

### 3.1 准备 harness（一次性）

把阶段 preset 复制到 dsh 用户预设根，harness 本身零改动：

```powershell
# Windows
cd deepseek-harness-delivery
powershell -ExecutionPolicy Bypass -File harness-setup.ps1

# macOS / Linux
bash harness-setup.sh
```

脚本只做一件事：把 `packages/bundle/presets/*` 复制到 `$DSH_HOME/.agent-presets/`。

### 3.2 启动 harness（3086）

```powershell
cd ..\deepseek-harness
pnpm dsh web --port 3086
```

看到 `dsh web: http://127.0.0.1:3086` 即成功。

### 3.3 启动编排服务（3087）

```powershell
cd ..\deepseek-harness-delivery\orchestrator
python -m pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 3087
```

看到 `Uvicorn running on http://127.0.0.1:3087` 即成功。

### 3.4 启动前端（3000）

```powershell
cd ..\fronted
npm install
npm run dev
```

浏览器打开 **http://localhost:3000**。

---

## 4. 使用流程（核心操作）

### 4.1 新建项目

左侧「项目列表」→ 右上角「新建项目」，填写：

- **项目名称**、**原始需求**、**工作目录（cwd）**（本地已存在目录或可 clone 的 git URL）
- **需求附件**（可选）：文档/截图会放到 `<cwd>/attachments/`，随需求一起给 agent 阅读

创建后自动生成首个版本 **v1.0.0**。

### 4.2 进入流水线

项目详情页 → 版本列表 → 点「进入流水线」→ 点「启动流水线」。

流水线按阶段推进，每阶段 agent 真实执行后停在 **gate**：

| 阶段 | 产物（结构化 JSON + 可读 md） |
|---|---|
| 01 需求 | `specs/requirements.json` / `.md` |
| 02 详细设计 | `docs/design.json` / `.md` |
| 03 任务 | `specs/tasks.json` / `.md` |
| 04 编码 | `specs/implementation.json` + `services/` `frontend/` 代码 |
| 05 测试 | `docs/test-report.json` / `.md` |

### 4.3 人工审计 + 补充矫正（gate 处）

阶段停在 gate 时，面板会列出**本阶段产物文件**：

1. 点文件 → 抽屉里**结构化模板预览**（JSON 产物按 schema 渲染，避免 md/json 对不齐）
2. 在预览里点某元素/行右侧「🚩标记」→ **就地弹框**填审计意见（阻断/建议，可二次编辑）
3. 可点「对比基线」看 v1.1 相对 v1.0 的**增量 diff**
4. 回 gate：填补充矫正意见（或直接附附件），点「补充矫正」→ agent 按**逐条审计意见定位定向修改** → 重新提交
5. 确认无误点「确认通过」进入下一阶段

### 4.4 标记交付

全部阶段通过后，回到项目详情页对当前版本点「标记交付」：落库状态 + 打 git tag + 快照产物（供后续基线 diff）。

### 4.5 客户新需求 = 新建版本

在项目详情页点「新建版本」（如 v1.1.0），它**基于上一版本基线增量演进**：需求阶段会把「基线原始需求 + 本次新需求」一起给 agent，文档末尾生成 `## 变更记录（v1.1.0）`；04/05 的 build/test 覆盖全量代码，确保基线不回归。

---

## 5. 核心能力

- **项目 → 版本模型**：一个项目长期存在，每次交付迭代（含客户新需求）建一个新版本，git 化版本管理
- **结构化产物 + 确定性验收**：每阶段产出 JSON（schema 校验），04/05 额外跑真实 build/test 命令取**退出码**判定完成，不信 agent 自报
- **人工门禁 + 结构化审计**：gate 处文件级审计（按 JSON ref / 代码行号定位），补充矫正把意见定向回喂给 agent；审计意见 + 审批轮次 + 变更日志全部持久化（`audit_findings` / `audit_log` / `gate_history`）
- **基线 diff（快照式）**：版本交付时快照产物，v1.1 审计时对比 v1.0 只审增量
- **附件**：新建项目/版本、人工补充矫正均可上传附件，agent 在工作目录里读取
- **知识范围**：每个数字员工可配置可访问的知识库「类」（阶段标准），经 MCP 按调用者过滤
- **AI 驾驶舱**：全局看执行中 / 等待人工 / 已交付，附成本与审计概览
- **工作区文件浏览器**：递归目录树 + 格式化预览（markdown / 代码高亮 / JSON 模板 / 基线 diff）

---

## 6. 配置入口

| 配置 | 位置 |
|---|---|
| 数字员工模型 / 思考深度 / 权限 / 重试次数 / 知识范围 | 左侧「数字员工」→ 点某个员工 |
| 阶段标准（知识库） | 左侧「知识库」→ 工程标准 |
| 阶段产物 JSON Schema | 编排层 `schema_store`（内置默认，可在「知识库/度量」相关入口维护） |

---

## 7. 目录结构

```
fronted/                 React 前端（AI 原生交付平台）
orchestrator/            FastAPI + LangGraph 编排（流水线图、结构化校验、审计、快照）
  server.py                HTTP API（flow / projects / versions / audit / attachments / cockpit）
  graph.py                 LangGraph 阶段图（需求→设计→任务→编码→测试 + gate）
  project_store.py         项目/版本存储
  audit_store.py           审计意见 + 变更日志存储
  schema_store.py          阶段产物 JSON Schema
  activity_store.py        审批/gate 活动 + 审计链
  standards_store.py       阶段标准（知识库）
  config_store.py          数字员工配置（模型/重试/知识范围）
packages/bundle/presets/  阶段 preset（requirements/design/tasks/coding/testing/…）
standards/               阶段标准种子（首次启动导入）
examples/                交付 demo 工作区（gitignore，运行时产物）
tests/                   协议测试
harness-setup.ps1 / .sh   把 preset 复制到 dsh 用户预设根
harness-reset.ps1 / .sh   清理 preset
DEMO.md                   启动与验证 Demo
PROJECT.md                项目目标 / 演进决策
```

> 仓库里 `packages/spec/`、`packages/tool-spec/` 是早期「插件化 spec 存储」方案的产物，现已由 `orchestrator/`（LangGraph + SQLite）方案取代，保留仅作历史参考。

---

## 8. 运行时数据（均 gitignore，不入库）

| 文件/目录 | 内容 |
|---|---|
| `standards.db` | 项目/版本/审计意见/审批历史/schema/配置/标准 |
| `checkpoints.db`（+wal/shm） | LangGraph 流水线 checkpoint（重启后流程不丢） |
| `snapshots/` | 各版本交付产物快照（基线 diff 用） |
| `examples/` | 交付 demo 工作区（agent 真实产出代码/文档） |
| `projects/` | git URL clone 下来的交付项目 |

---

## 9. 常见问题

| 现象 | 原因 | 解决 |
|---|---|---|
| agent 阶段瞬间「完成」且产物是旧的 | agent 回合报错（如缺原生依赖 `koffi`）被误判完成 | 编排层已检测并透出 `stage_error`；确认 harness `pnpm install` 完整 |
| 编排重启后流程卡在「执行中」 | 停在非 interrupt 的 checkpoint | 页面「继续执行」按钮（`/flow/continue`）从上次进度恢复 |
| 前端请求 502/跨域 | 前端改成了相对路径代理 | 确认 `src/api/flow.ts` 的 `FLOW_BASE` 是 `http://127.0.0.1:3087` |
| v1.1 把 v1.0 产物当已完成 | 版本没带基线 | 确认项目详情「新建版本」时基线显示正确（基线注入流水线） |
