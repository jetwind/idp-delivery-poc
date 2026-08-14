# @deepseek-ai/dsh-tool-spec

English | [中文](README.zh.md)

Model-facing Consumer for the spec seam: four tools that let a stage agent read and write the same durable, versioned spec documents the Web GUI drives over the Remote contract. The tools resolve the host `specStore` service through `ctx.get`, so they mount in a stage preset's scope layer.

## Tools

| Tool | Purpose |
| --- | --- |
| `spec_list` | List spec documents, optionally restricted to one project, newest first |
| `spec_read` | Read one spec — sections, checks, pendings, and the decision log |
| `spec_save` | Create or replace one spec, resetting it to `submitted`; resolves the current version so callers never pass `ifVersion` |
| `spec_decide` | Record one human-gate decision (`approved`/`rejected`/`revised`) and transition the status |

## Model Experience

### Tool schema

The model sees four generated schemas, including the nested `sections`/`checks`/`pendings` shapes; the `status` and `type` enums are documented as string contracts enforced by the store's zod schema at the durable boundary.

### Token effect

Fixed schema cost per request where the tools are visible, plus data-dependent JSON for every read and write.

#### KV Cache effect

Append-only; spec reads and writes never touch request prefixes.

## Known Limitations and Deferred Work

- **Structured writes ride a string-typed parameter surface** — `sections`/`checks`/`pendings` are nested objects, not a closed enum; the store's zod schema is the enforcement boundary, so a bad `status`/`type` fails at `spec_save` rather than at the tool schema.
- **No `spec_save` presentation intent** — calls render as the generic tool card; a richer diff/spec render is deferred.
