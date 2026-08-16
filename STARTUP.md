# 本地启动步骤（一步一步照做）

> 面向第一次在本机把「AI 原生交付平台」跑起来的人。每一步都有**要执行的命令**和**成功标志**，按顺序走即可。
>
> 平台由三个进程组成：**harness（3086）→ 编排（3087）→ 前端（3000）**。启动顺序必须是这个方向。

---

## 0. 目录布局（重要）

两个仓库必须放在**同一个父目录**下，名字保持默认：

```
<你的工作目录>/
├── deepseek-harness/            # ① harness 执行层（外部开源仓库）
└── deepseek-harness-delivery/   # ② 本仓库（AI 原生交付平台）
```

后面所有命令里的相对路径都依赖这个布局。

---

## 1. 克隆 harness

```bash
cd <你的工作目录>
git clone https://github.com/deepseek-ai/deepseek-harness.git
```

✅ 成功标志：出现 `deepseek-harness/` 目录，里面有 `package.json`、`packages/`、`apps/`。

---

## 2. 克隆本仓库（交付平台）

内部仓库地址：

```bash
cd <你的工作目录>
git clone https://gitlab.yesno.com.cn/cncop/hive-ai-delivery-poc.git deepseek-harness-delivery
```

> 如果 clone 下来的目录名不是 `deepseek-harness-delivery`，用上面命令里 `deepseek-harness-delivery` 这个名字重命名它，保证和第 0 步布局一致。

✅ 成功标志：出现 `deepseek-harness-delivery/` 目录，里面有 `orchestrator/`、`fronted/`、`packages/`。

---

## 3. 安装 harness 依赖

```bash
cd deepseek-harness
pnpm install
```

✅ 成功标志：命令结束无报错，出现 `node_modules/`。

> 需要 Node 18+ 和 pnpm。没有 pnpm：`npm install -g pnpm`。

---

## 4. 安装编排服务依赖（Python）

```bash
cd ../deepseek-harness-delivery/orchestrator
python -m pip install -r requirements.txt
```

✅ 成功标志：装完 `fastapi`、`uvicorn`、`langgraph` 等，无报错。

> 需要 Python 3.10+。macOS/Linux 若 `python` 不存在用 `python3`。

---

## 5. 安装前端依赖

```bash
cd ../fronted
npm install
```

✅ 成功标志：出现 `fronted/node_modules/`，无报错。

---

## 6. 配置 LLM 密钥

harness 用 `DEEPSEEK_API_KEY` 调用真实大模型。

**Windows PowerShell：**
```powershell
$env:DEEPSEEK_API_KEY = "sk-你的key"
```

**macOS / Linux：**
```bash
export DEEPSEEK_API_KEY="sk-你的key"
```

> 建议写进你的 shell 配置文件（`~/.zshrc` / `~/.bashrc` 或 Windows 系统环境变量），以后就不用每次设。

---

## 7. 准备阶段 preset（一次性）

把 5 个阶段数字员工的 preset 复制到 dsh 用户预设根：

```bash
cd ../deepseek-harness-delivery
powershell -ExecutionPolicy Bypass -File harness-setup.ps1   # Windows
# 或 macOS/Linux：
# bash harness-setup.sh
```

✅ 成功标志：输出 `OK: presets copied to ...\.agent-presets`。

---

## 8. 启动 harness（3086）

```bash
cd ../deepseek-harness
pnpm dsh web --port 3086
```

✅ 成功标志：看到 `dsh web: http://127.0.0.1:3086`。**保持这个终端开着。**

---

## 9. 启动编排服务（3087）

**另开一个终端：**
```bash
cd <你的工作目录>/deepseek-harness-delivery/orchestrator
python -m uvicorn server:app --host 127.0.0.1 --port 3087
```

✅ 成功标志：看到 `Uvicorn running on http://127.0.0.1:3087`。**保持这个终端开着。**

---

## 10. 启动前端（3000）

**再开一个终端：**
```bash
cd <你的工作目录>/deepseek-harness-delivery/fronted
npm run dev
```

✅ 成功标志：看到 `Local: http://localhost:3000/`。

---

## 11. 打开浏览器验证

浏览器打开 **http://localhost:3000**

✅ 成功标志：
- 左侧出现「项目列表 / AI 驾驶舱 / 数字员工 / 知识库」等菜单
- 「AI 驾驶舱」能看到项目/版本统计（不是报错、不是离线 mock）

---

## 12. 跑通第一个项目（冒烟）

1. 左侧「项目列表」→ 右上角「新建项目」
2. 填：项目名称、一句原始需求、工作目录（本地一个空目录即可，例如 `deepseek-harness-delivery/examples/004`）
3. 点「创建并进入流水线」→ 版本 `v1.0.0` 自动创建
4. 点「启动流水线」→ 「01 需求」阶段 agent 开始真实执行
5. 每阶段完成后在 gate 处点「确认通过」，直到「05 测试」通过 →「交付流水线完成」

更详细的 Demo 走查见 [DEMO.md](DEMO.md)。

---

## 三服务一览（排错对照）

| 端口 | 命令 | 成功标志 |
|---|---|---|
| 3086 harness | `pnpm dsh web --port 3086` | `dsh web: http://127.0.0.1:3086` |
| 3087 编排 | `python -m uvicorn server:app --host 127.0.0.1 --port 3087` | `Uvicorn running on http://127.0.0.1:3087` |
| 3000 前端 | `npm run dev` | `Local: http://localhost:3000/` |

---

## 常见启动问题

| 现象 | 原因 | 解决 |
|---|---|---|
| 前端页面报接口连不上 | 3087 没起 | 回第 9 步检查编排服务 |
| 编排日志报连不上 3086 | harness 没起 | 回第 8 步检查 harness |
| agent 阶段瞬间「完成」且产物是旧的 | agent 回合报错（缺原生依赖 `koffi`） | 在 `deepseek-harness` 目录再跑一次 `pnpm install`，然后重启 harness |
| 阶段卡在「执行中」 | 编排服务重启导致流程孤儿化 | 页面「继续执行」按钮，或重启后点「重新开始」 |
| 端口被占 | 上一轮进程没关 | 关掉占 3000/3086/3087 的旧进程再启动（**不要动 3080**） |

---

## 备注

- **coding 阶段加载知识 skill**：如果编码阶段要用到内部 `hive-*` 技能，需要把它们放到 `~/.dsh/skills/` 下（内部技能库单独维护，不随本仓库分发）。
- **运行时数据**（`standards.db` / `checkpoints.db` / `snapshots/` / `examples/`）都在 `.gitignore` 里，换机器重来不会带脏数据。
- 收尾清理 preset：`powershell -ExecutionPolicy Bypass -File harness-reset.ps1`（或 `bash harness-reset.sh`）。
