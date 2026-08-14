# 启动与验证 Demo：AI 原生交付流水线

从零启动，用一个真实需求跑通「需求 → 设计 → 编码 → 测试」四阶段，人工 gate 确认后推进。

## 架构与三服务

```
前端 React (3000)  →  LangGraph 编排 (8080)  →  harness 执行层 (3086)
  聊天输入需求          阶段图 + gate/question     各阶段 agent（挂 preset）真实干活
```

- **前端 3000**：输入需求、回答问题、点 gate、看阶段推进与产物。
- **编排 8080**：LangGraph 图（`orchestrator/`），驱动 harness、传递产物、暂停等人工。
- **harness 3086**：dsh web 实例，挂阶段 preset，跑 agent。

## 前置条件

- harness 源码在同级目录 `../deepseek-harness`（已 `pnpm install` 过）
- Node + pnpm（harness）
- Python 3.10+（编排服务）
- `DEEPSEEK_API_KEY`（真实 LLM 调用，harness 用它跑 agent）

## 跨平台说明

准备/回滚脚本有两个版本，按系统选：

| 系统 | 准备脚本 | 回滚脚本 |
|---|---|---|
| **macOS / Linux** | `bash harness-setup.sh` | `bash harness-reset.sh` |
| **Windows** | `powershell -ExecutionPolicy Bypass -File harness-setup.ps1` | `powershell -ExecutionPolicy Bypass -File harness-reset.ps1` |

其余启动命令跨平台一致（`pnpm` / `npm` / `python`，Mac 若 `python` 不存在用 `python3`）。

**工作目录（cwd）** 在页面的输入框里填你本机仓库的实际路径：

- macOS/Linux：`/Users/<你>/deepseek-harness-delivery/examples/project-delivery`
- Windows：`D:/.../deepseek-harness-delivery/examples/project-delivery`

## 步骤 1：准备 harness（一次性）

产物走「文件 + git」，**不需要往 harness 复制插件或构建**，只需把阶段 preset 复制到用户预设根，harness 本身零改动。

**macOS / Linux：**
```bash
cd deepseek-harness-delivery
bash harness-setup.sh
```

**Windows：**
```powershell
cd deepseek-harness-delivery
powershell -ExecutionPolicy Bypass -File harness-setup.ps1
```

脚本只做一件事：把 `packages/bundle/presets/*` 复制到 `$DSH_HOME/.agent-presets/`。

## 步骤 2：启动 harness（3086）

```powershell
cd ..\deepseek-harness
pnpm dsh web --port 3086
```

看到 `dsh web: http://127.0.0.1:3086` 即成功。

## 步骤 3：启动编排服务（8080）

```powershell
cd ..\deepseek-harness-delivery\orchestrator
python -m pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8080
```

看到 `Uvicorn running on http://127.0.0.1:8080` 即成功。

## 步骤 4：启动前端（3000）

```powershell
cd ..\fronted
npm install
npm run dev
```

看到 `Local: http://localhost:3000/` 即成功。

## 步骤 5：验证完整流程

### 5.1 打开流水线页面

浏览器打开 **`http://localhost:3000/projects/p1/flow`**

（侧边栏也有入口：`AI 原生交付` → `AI 流水线`）

### 5.2 输入需求

在输入框填一个真实需求，例如：

> 帮我做一个一物一码的产品追溯系统，需要支持扫码溯源和防窜货。

工作目录保持默认 `D:/.../examples/project-delivery`，点「启动流水线」。

### 5.3 逐阶段交互（这是核心验证点）

| 阶段 | 你会看到 | 你要做的 |
|---|---|---|
| 需求分析 | agent 读材料后弹出一批澄清问题（行业、码粒度、溯源环节、防窜货判定…）| 逐题选择/填写，点「提交回答」 |
| 需求分析 | 定稿确认（「确认定稿」/「修改后继续」）| 选「确认定稿」 |
| 需求分析 | 阶段完成，待 gate | 点「确认通过」 |
| 架构设计 | agent 产出设计文档 | 点「确认通过」 |
| 代码编写 | agent 真实写代码 + 实现说明 | 点「确认通过」 |
| 测试验证 | agent 跑测试 + 出报告 | 点「确认通过」 |
| 完成 | 显示「交付流水线完成」 | — |

**验证成功的标志**：
- 阶段条从「需求分析」一路绿到「测试验证」。
- 每阶段 agent 都真实执行（不是 mock），澄清问题、写 spec、写代码、跑测试。
- 页面「已产出规格」出现 `p1/requirements`、`p1/implementation`。

### 5.4 命令行快速验证（可选，不点页面）

```powershell
cd orchestrator
python -u verify_http.py
```

脚本会走 `/flow/*` API 自动跑完四阶段（自动回答 question + approve gate），打印每步过程，最后输出 `DONE 流水线完成`。

## 验证产物

- **文件**：`examples/project-delivery/specs/requirements.md`（需求）、`specs/implementation.md`（实现）、`docs/design.md`（设计）、`docs/test-report.md`（测试报告）
- **代码**：编码阶段 agent 真实写的微服务代码（`examples/project-delivery/services/`）
- **git 历史**：每个阶段一个 commit（`git log` 查看版本审计）

## 收尾：回滚 harness

学习验证完，清理阶段 preset：

```powershell
cd deepseek-harness-delivery
powershell -ExecutionPolicy Bypass -File harness-reset.ps1
```

脚本删除 `$DSH_HOME/.agent-presets`，harness 本身零改动无需 git 操作。

## 常见问题

| 现象 | 原因 | 解决 |
|---|---|---|
| 前端接口 403 | dsh 的 Origin 围栏 | 确认 `fronted/vite.config.ts` 的 `/api` proxy `changeOrigin: false`（已配置） |
| 编排接口 502/长连接断 | 走 Vite proxy 转发 `/flow` | 前端已直连 8080（`src/api/flow.ts` 的 `FLOW_BASE`），不要改回相对路径 |
| 页面显示「离线 mock」而非「实时数据」 | 3086 后端没连上 | 检查 3086 是否在跑 |

## 关键设计说明（想改代码前读）

- **产物走「文件 + git」**：每个阶段 agent 用 write 工具写 `specs/*.md`、`docs/*.md`，编排层读上一阶段文件拼进下一阶段 prompt，并在阶段完成后 git commit（版本审计交给 git）。
- **LangGraph interrupt 会重放节点**：`graph.py` 的节点都是幂等的（session_id / stage_committed 存 State）。
- **question / approval 都走 `/api/events.mux`**（WebSocket，重放 pending），回答走 `/api/respond`（question 给 answers，approval 给 allowed-once/rejected）。
