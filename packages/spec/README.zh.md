# @deepseek-ai/dsh-spec

[English](README.md) | 中文

项目交付流程在阶段之间交接的结构化文档的持久化、版本化存储——`requirements`（需求）、`services`（服务关联声明）、`implementation`（实现说明）、`review`（代码评审）。每条记录包含编号章节（完整/待补充/缺失）、检查项（阻断/风险/建议）、待确认问题，以及只追加的人工门禁决策日志。规格是项目作用域内的持久化记录（基于 storage-domain 表单），通过下方 Remote 契约暴露给 Web GUI。

## 服务：`SpecService`（ctx key：`specStore`）

服务持有唯一的 `spec` 域（以 `SpecId` 为键的单个 `specs` 表），每次写入都是对记录单调递增 `version` 的比较并交换。`put` 创建（`ifVersion: 0`）或替换（`ifVersion` 必须匹配）内容并把状态重置为 `submitted`；`decide` 追加一条不可变决策并迁移状态——`approved` → `approved`、`rejected` → `rejected`、`revised` → `submitted`。

### Remote 操作（wire 契约）

| 操作 | 请求 | 结果 |
| --- | --- | --- |
| `specStore/list` | `{ projectId? }` | `{ specs: SpecRecord[] }`，新的在前 |
| `specStore/get` | `{ specId }` | `SpecRecord` 或 `spec-not-found` |
| `specStore/put` | `{ specId, kind, title, projectId?, sections?, checks?, pendings?, ifVersion }` | 已提交的 `SpecRecord` 或 `version-conflict` |
| `specStore/decide` | `{ specId, action, who?, comment?, ifVersion }` | 更新后的 `SpecRecord` 或 `spec-not-found` / `version-conflict` |

生成的 Remote 客户端（`@deepseek-ai/dsh-spec/remote`）是前端的类型化入口；Web 页面像调用其他 Host Remote 一样通过 api-proxy 调用 `specStore.list/get/put/decide`。

## 模型体验

间接——通过渲染规格状态的 Consumer。本包不注册工具、不注入提示、不追加会话事件。阶段预设的提示词命名规格交接；持久记录是模型自己的上一阶段输入，由 Human Gate 或模型侧 Consumer 写回。

#### KV Cache 影响

无。规格读写不触及请求前缀。

## 已知限制与后续工作

- **项目过滤仅按 `projectId` 相等** —— 尚无二级索引或跨项目查询；`list` 扫描全表。
- **决策只追加但未做加密签名** —— 日志在进程内可审计，但跨进程不具备防篡改能力。
- **尚无模型侧规格工具** —— 阶段 agent 通过未来的 Consumer（或通过 Web UI 的 Remote 契约）读写规格；本包是数据面，不是模型工具。
