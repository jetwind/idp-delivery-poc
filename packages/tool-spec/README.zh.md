# @deepseek-ai/dsh-tool-spec

[English](README.md) | 中文

spec 接缝的模型侧 Consumer：四个工具让阶段 agent 读写与 Web GUI 经 Remote 契约驱动的相同的持久化、版本化规格文档。工具通过 `ctx.get` 解析宿主 `specStore` 服务，因此挂载在阶段预设的 scope 层。

## 工具

| 工具 | 用途 |
| --- | --- |
| `spec_list` | 列出规格文档，可选按项目过滤，新的在前 |
| `spec_read` | 读取单个规格——章节、检查项、待确认与决策日志 |
| `spec_save` | 创建或替换规格，重置为 `submitted`；自动解析当前版本，调用者无需传 `ifVersion` |
| `spec_decide` | 记录一条人工门禁决策（`approved`/`rejected`/`revised`）并迁移状态 |

## 模型体验

### 工具 schema

模型看到四个生成的 schema，含嵌套的 `sections`/`checks`/`pendings` 结构；`status` 与 `type` 枚举以字符串契约记录，由存储的 zod schema 在持久化边界强制。

### Token 影响

工具可见时每个请求的固定 schema 成本，外加每次读写的依赖数据的 JSON。

#### KV Cache 影响

只追加；规格读写不触及请求前缀。

## 已知限制与后续工作

- **结构化写入走字符串类型参数面** —— `sections`/`checks`/`pendings` 是嵌套对象而非封闭枚举；存储的 zod schema 是强制边界，因此错误的 `status`/`type` 在 `spec_save` 时失败而非在工具 schema。
- **`spec_save` 无展示意图** —— 调用渲染为通用工具卡；更丰富的 diff/spec 渲染待后续。
