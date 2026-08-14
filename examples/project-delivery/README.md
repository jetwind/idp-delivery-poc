# project-delivery

English | [中文](README.zh.md)

A spec-driven, project-centric delivery composition for the **AI 原生交付平台** Web prototype in `fronted/`. One shared dsh process (spine, registries, persistence, LLM route) hosts a stage roster; each project session composes its world by mounting exactly one stage preset. The Web prototype's five-spec flow (需求 → 设计 → 接口 → 测试 → 发布) maps to stage presets, and its **Evaluation / Human Gate** maps to dsh's `ask_user_question` tool over the `userQuestions` seam.

## Phase 1 scope

Phase 1 covers the four stages that turn an accepted requirement into reviewed code; the remaining stages stay composed but are later-phase work.

| Stage preset | Persona | Distinct capability | Phase |
| --- | --- | --- | --- |
| `requirements` | 需求分析师 | dialogue-heavy clarification, `specs/requirements.md` (sections / checks / pendings), 定稿 gate | 1 |
| `link-services` | 服务架构师 | reads `service-library.md` + accepted spec, declares per-service role (复用/适配/改造/新建) into `specs/services.md` | 1 |
| `coding` | 软件工程师 | shell, subagent, workflow, Ralph — implements on linked services | 1 |
| `review` | 代码评审专家 | `specs/review.md` (阻断/风险/建议 + 结论), release/return gate | 1 |
| `design` | 软件架构师 | plan mode + exit_plan_mode | later |
| `testing` | 测试工程师 | shell for running tests, no delegation | later |
| `release` | 发布经理 | shell + release gate | later |
| `retrospective` | 复盘主持人 | read/synthesize project artifacts, no shell | later |

## Spec artifacts

Each stage writes its durable output under `specs/`, and every stage after requirements reads the earlier stages' specs as input, so the handoff is an explicit file contract rather than an implicit prompt:

```
specs/requirements.md    sections (完整/待补充/缺失) + checks (阻断/风险/建议) + pendings
specs/services.md        per-service name / role / version / repo / branch
specs/implementation.md  per-service change notes (coding)
specs/review.md          verdict + checks + pendings (review)
```

## Human gate

`requirements` (定稿), `link-services` (关键关联决策), and `review` (评审结论) pause the agent on `ask_user_question`; the answer resumes the same turn and is logged as the durable decision. The Web host supplies the answer provider (the prototype's GatePage is its renderer); the keyless smoke registers an auto-confirming provider so the ask → answer → resume loop is tested without a browser.

## Wire contract and frontend integration

The spec store's `@Remote` methods are the wire contract. The host exposes them through the api-gateway (the typert loader auto-registers any mounted package exporting `./typert`); the client mounts them through the api-remotes assembly (`packages/api/remotes/src/client/index.ts`), so a Web page reaches them exactly like message feedback:

| Operation | Client call |
| --- | --- |
| list specs | `remote.specStore.list({ projectId })` |
| read one | `remote.specStore.get({ specId })` |
| write/replace | `remote.specStore.put({ specId, kind, title, sections?, checks?, pendings?, ifVersion })` |
| human-gate decision | `remote.specStore.decide({ specId, action, who?, comment?, ifVersion })` |

Wiring `fronted/` to drive dsh: run `dsh web` (or a project-delivery profile stacking `dsh-base` + `dsh-web-app` plus a spec bundle), then in the React app import the client connection and api-remotes and replace each mock-data source (`src/mock/specs.ts`, `src/mock/data*.ts`) with the matching remote call. The prototype's `SpecData` (sections / checks / pendings) maps one-to-one onto `SpecRecord`; its `humanGate.history` is the `decisions` log, and `LinkService`'s four roles map onto the `services` spec kind.

## Run

Keyless smoke (no API key; boots every stage through the real Loader):

```sh
pnpm exec vitest run --config vitest.e2e.config.ts examples/project-delivery/tests/keyless-smoke.e2e.ts
```

With a real model, overlay the fixture config with the DeepSeek adapter and point the driver at it:

```sh
# repo root .env (gitignored) or exported env:
#   DEEPSEEK_API_KEY=sk-…
#   DEEPSEEK_BASE_URL=https://…   # optional; defaults to the public API
DSH_PROJECT_PROVIDER=deepseek-official DSH_PROJECT_MODEL=deepseek-v4-flash \
  npx tsx examples/project-delivery/tests/fixtures/project-delivery-driver.ts \
    examples/project-delivery/tests/fixtures/cli.cordis.yml requirements "把这个需求澄清并定稿"
```

## From demo to product

The demo composes the delivery stages; the product composes the surface. Stack `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app` plus a project-delivery bundle under a custom profile, ship the stage presets as the app's system preset root, and treat one workspace per project with one session per stage as the UI model. The product path adds: the Web client plugin surface for the spec/gate pages, `dsh-session-query` in the retrospective preset, `dsh-schedule` for recurring release follow-ups, and a durable spec store (session events or a KV form) replacing the `specs/` files.

## Known limitations

- The keyless mock scripts the model, so it proves composition, the shell path, and the gate loop — not real spec quality; run the with-key path for genuine stage output.
- The driver is test infrastructure, not a supported CLI — it emits canonical JSONL before its result record.
- dsh is in developer preview; compositions and presets may break across versions. Pin versions when wrapping this for delivery.
