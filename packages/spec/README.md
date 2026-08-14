# @deepseek-ai/dsh-spec

English | [中文](README.zh.md)

Durable, versioned storage for the structured documents a project-delivery flow hands between stages — `requirements`, `services` (linked-service declarations), `implementation`, and `review`. Each record carries numbered sections (完整/待补充/缺失), checks (阻断/风险/建议), pending questions, and an append-only human-gate decision log. Specs are project-scoped durable records over the storage-domain form, exposed to the Web GUI through the Remote contract below.

## Service: `SpecService` (ctx key: `specStore`)

The service owns one `spec` domain (single `specs` table keyed by `SpecId`) and every write is a compare-and-set on the record's monotonically increasing `version`. `put` creates (`ifVersion: 0`) or replaces (`ifVersion` must match) the content and resets the status to `submitted`; `decide` appends one immutable decision and transitions the status — `approved` → `approved`, `rejected` → `rejected`, `revised` → `submitted`.

### Remote operations (the wire contract)

| Operation | Request | Result |
| --- | --- | --- |
| `specStore/list` | `{ projectId? }` | `{ specs: SpecRecord[] }` newest first |
| `specStore/get` | `{ specId }` | `SpecRecord` or `spec-not-found` |
| `specStore/put` | `{ specId, kind, title, projectId?, sections?, checks?, pendings?, ifVersion }` | committed `SpecRecord` or `version-conflict` |
| `specStore/decide` | `{ specId, action, who?, comment?, ifVersion }` | updated `SpecRecord` or `spec-not-found` / `version-conflict` |

The generated Remote client (`@deepseek-ai/dsh-spec/remote`) is the frontend's typed surface; a Web page calls `specStore.list/get/put/decide` through the api-proxy exactly as it calls every other Host Remote.

## Model Experience

Indirectly, through the Consumer that renders spec state — this package registers no tools, injects no prompts, and appends no session events. A stage preset's prompt names the spec handoff; the durable record is the model's own prior-stage input, written back by a Human Gate or a model-facing consumer.

#### KV Cache effect

None. Spec reads and writes never touch request prefixes.

## Known Limitations and Deferred Work

- **Single-project filtering is `projectId` equality only** — there is no secondary index or cross-project query yet; `list` scans the table.
- **Decisions are append-only but not cryptographically sealed** — the log is auditable within the process, not tamper-evident across processes.
- **No model-facing spec tool yet** — a stage agent reads/writes specs through a future Consumer (or through the Remote contract from the Web UI); this package is the data face, not the model tool.
