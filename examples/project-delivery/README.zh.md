# project-delivery

[English](README.md) | 中文

面向 `fronted/` 中「AI 原生交付平台」Web 原型的**规格驱动、以项目为中心**的交付组合。一个共享 dsh 进程（spine、注册表、持久化、LLM 路由）承载阶段名录；每个项目会话在创建时挂载恰好一个阶段预设来组成自己的世界。Web 原型的五类规格流程（需求 → 设计 → 接口 → 测试 → 发布）映射到阶段预设，其 **Evaluation / Human Gate** 映射到 dsh 的 `ask_user_question` 工具（基于 `userQuestions` 接缝）。

## 阶段一范围

阶段一覆盖「把已验收需求变成经过评审的代码」的四个阶段；其余阶段保持组合但属于后续阶段。

| 阶段预设 | 角色 | 关键能力 | 阶段 |
| --- | --- | --- | --- |
| `requirements` | 需求分析师 | 密集对话澄清，产出 `specs/requirements.md`（章节/检查项/待确认），定稿门禁 | 1 |
| `link-services` | 服务架构师 | 读 `service-library.md` + 已定稿规格，为每个服务声明作用（复用/适配/改造/新建），产出 `specs/services.md` | 1 |
| `coding` | 软件工程师 | shell、subagent、workflow、Ralph——在关联服务上实现 | 1 |
| `review` | 代码评审专家 | `specs/review.md`（阻断/风险/建议 + 结论），通过/退回门禁 | 1 |
| `design` | 软件架构师 | plan mode + exit_plan_mode | 后续 |
| `testing` | 测试工程师 | shell（跑测试）、无委派 | 后续 |
| `release` | 发布经理 | shell + 发布门禁 | 后续 |
| `retrospective` | 复盘主持人 | 阅读/综合项目产物、无 shell | 后续 |

## 规格产物

每个阶段把持久化产出写入 `specs/`，需求之后的每个阶段都以前置阶段的规格为输入，因此阶段交接是显式的文件契约而非隐式提示：

```
specs/requirements.md    章节（完整/待补充/缺失）+ 检查项（阻断/风险/建议）+ 待确认
specs/services.md        逐服务：名称 / 作用 / 版本 / 仓库 / 分支
specs/implementation.md  逐服务改动说明（编码）
specs/review.md          结论 + 检查项 + 待确认（评审）
```

## 人工门禁

`requirements`（定稿）、`link-services`（关键关联决策）、`review`（评审结论）用 `ask_user_question` 暂停 agent；回答恢复同一轮并作为持久决策记入日志。Web 宿主提供回答器（原型中的 GatePage 即其渲染器）；无 key 冒烟测试注册一个自动确认回答器，从而在无浏览器下验证「提问 → 回答 → 恢复」闭环。

## wire 契约与前端接入

规格存储的 `@Remote` 方法就是 wire 契约。宿主通过 api-gateway 暴露它们（typert loader 自动注册任何挂载的、导出 `./typert` 的包）；客户端通过 api-remotes 聚合（`packages/api/remotes/src/client/index.ts`）挂载它们，因此 Web 页面像访问消息反馈一样访问：

| 操作 | 客户端调用 |
| --- | --- |
| 列出规格 | `remote.specStore.list({ projectId })` |
| 读取单个 | `remote.specStore.get({ specId })` |
| 写入/替换 | `remote.specStore.put({ specId, kind, title, sections?, checks?, pendings?, ifVersion })` |
| 人工门禁决策 | `remote.specStore.decide({ specId, action, who?, comment?, ifVersion })` |

接通 `fronted/` 驱动 dsh：运行 `dsh web`（或叠加 `dsh-base` + `dsh-web-app` + spec bundle 的 project-delivery profile），然后在 React 应用中引入 client connection 与 api-remotes，把各 mock 数据源（`src/mock/specs.ts`、`src/mock/data*.ts`）替换为对应的 remote 调用。原型的 `SpecData`（sections / checks / pendings）与 `SpecRecord` 一一对应；其 `humanGate.history` 即 `decisions` 日志，`LinkService` 的四种作用对应 `services` 规格类型。

## 运行

无 key 冒烟测试（不需要 API key，通过真实 Loader 启动每个阶段）：

```sh
pnpm exec vitest run --config vitest.e2e.config.ts examples/project-delivery/tests/keyless-smoke.e2e.ts
```

接入真实模型时，把 fixture 配置换成 DeepSeek 适配器并让驱动指向它：

```sh
# 仓库根目录 .env（已 gitignore）或导出环境变量：
#   DEEPSEEK_API_KEY=sk-…
#   DEEPSEEK_BASE_URL=https://…   # 可选；默认使用公共 API
DSH_PROJECT_PROVIDER=deepseek-official DSH_PROJECT_MODEL=deepseek-v4-flash \
  npx tsx examples/project-delivery/tests/fixtures/project-delivery-driver.ts \
    examples/project-delivery/tests/fixtures/cli.cordis.yml requirements "把这个需求澄清并定稿"
```

## 从示例到产品

示例组合了交付阶段，产品组合的是界面。在自定义 profile 下叠加 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app` 与一个 project-delivery bundle，把阶段预设作为应用的系统预设根目录发布，并把「一个项目一个 workspace、每个阶段一个会话」作为 UI 模型。产品化路径还要加：规格/门禁页面的 Web client 插件面、复盘预设挂载 `dsh-session-query`、`dsh-schedule` 做定时发布跟进，以及用持久化规格存储（会话事件或 KV 表单）替换 `specs/` 文件。

## 已知限制

- 无 key mock 脚本化了模型，因此只证明组合、shell 路径与门禁闭环，不证明真实规格质量；真实阶段输出请走带 key 路径。
- 驱动是测试基础设施而非受支持的 CLI——它在结果记录前输出规范化 JSONL。
- dsh 处于开发者预览阶段，组合与预设可能随版本破坏兼容；用于交付封装时请锁定版本。
