# deepseek-harness-delivery

面向 [DeepSeek Harness (`dsh`)](https://github.com/deepseek-ai/deepseek-harness) 的**项目交付整体**：后端插件 + 配套前端。

本文件夹**独立于 harness**，只包含插件与前端自身的源码、配置与测试，**不含任何 harness 代码、依赖或构建产物**。上传/交付时只传这一个文件夹即可。

## 目录结构

```
fronted/              配套前端（AI 原生交付平台 React 原型）
packages/spec/        @deepseek-ai/dsh-spec         规格存储（数据面，host 服务 + Remote 契约）
packages/tool-spec/   @deepseek-ai/dsh-tool-spec    模型侧 spec_list/read/save/decide 工具
packages/bundle/      @deepseek-ai/dsh-project-delivery  组合 bundle（cordis.patch.yml + presets/）
examples/project-delivery/  示例组合 + 冒烟测试 fixtures
tests/spec-protocol/  规格 Remote 的 HTTP 协议测试
```

## 包职责

| 包 | 职责 | 关键产物 |
|---|---|---|
| `dsh-spec` | 结构化、版本化、可留痕的规格存储 | `SpecRecord`（章节/检查项/待确认 + 决策日志）、`specStore.list/get/put/decide` |
| `dsh-tool-spec` | 模型侧 Consumer | `spec_list` / `spec_read` / `spec_save` / `spec_decide` 四个工具 |
| `dsh-project-delivery` | 组合 bundle | `cordis.patch.yml`（insert storage + spec-store + agent-presets）+ 八个阶段 preset |

## 依赖模型

- 文件夹内部：`dsh-tool-spec` 依赖 `dsh-spec`（`workspace:*`）；`dsh-project-delivery` 依赖前两者。
- 对 harness：`@deepseek-ai/dsh-*`（storage / storage-domain / storage-json / agent-presets / cordis）在 `package.json` 声明为 `peerDependencies`，**运行时由 dsh 宿主提供**，本文件夹不携带这些包。
- `tsconfig.base.json` 的 `paths` 指向 `../deepseek-harness` 源码，仅用于**开发期类型检查**（source plane）；它不是 harness 代码副本，发布/上传时无需 harness 源码。

## 构建与接入

1. 本文件夹的 `@Remote` 契约（`specStore`）需要 dsh 的 **typert 生成器**在 harness 构建环境生成 `lib/typert.host.js` + `lib/typert.remote-client.js` 描述符（typert 要求插件与 harness 源码处于同一 workspace root，这是 dsh 构建基础设施的固有限制）。
2. 三个包 `pnpm publish` 到 npm 或私有 registry（发布前把 `@deepseek-ai/*` 改为自有 scope）。
3. 用户侧接入：
   ```sh
   dsh plugin --profile <name> add @<your-scope>/dsh-project-delivery
   ```
   再把 `packages/bundle/presets/*` 复制到 `$DSH_HOME/.agent-presets/`（dsh 的用户预设根，自动发现）。
4. `dsh --profile <name> web`（或 headless）后，会话可挂载各阶段 preset，规格读写走 `specStore`。

## 已验证（原 harness 内联实现阶段，代码与本文件夹一致）

- 规格存储单测 3/3；工具单测 1/1；冒烟 11/11（八阶段组合 + 人工门禁闭环 + 规格持久化）
- `specStore` 经真实 Web Host 的 HTTP `put/get/list/decide` 往返（`tests/spec-protocol`）

## 已知边界

- **typert 产物需在 harness 环境生成**：dsh 的 typert 生成器要求插件与 harness 源码在同一 workspace root，故本文件夹的 `@Remote` 描述符需在 harness 构建环境（或 CI）一次性生成，无法在本文件夹内脱离 harness 独立生成。
- **web 宿主兼容**：bundle 的 `cordis.patch.yml` 目前按 headless（无 storage）宿主编写；web 宿主已自带 storage，需补充不重复 insert 的 web 变体。
