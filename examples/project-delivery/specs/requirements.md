# Full-Product Traceability Platform — Requirements

Stage: `requirements` (需求分析师) · Artifact: `specs/requirements.md`
Priority legend: `P0` Must-have · `P1` Should-have · `P2` Nice-to-have

---

## R1 — Full-chain product traceability query

**Priority:** P0 (Must-have)

**Acceptance criteria:**

- Scanning a product code or batch code returns the complete trace chain — production → warehousing → logistics → sales — ordered by timestamp.
- A batch-level query responds within 2 seconds; a single-unit query within 3 seconds at reference load.
- Trace records are append-only and immutable: no update or delete operation is exposed on a committed trace event.
- Trace data access is authorization-enforced (read requires an authenticated principal granted trace-view permission).

---

## R2 — Anti-channeling detection and alerting

**Priority:** P0 (Must-have)

**Acceptance criteria:**

- An operator can configure region/route constraint rules without a service restart.
- When a product code is scanned outside its authorized region, an alert is raised within 1 minute.
- Each alert carries the expected region, the actual region, and the product/agent identifiers, and is delivered to configured recipients via in-app and message-center channels (SMS/email).
- Alert rules support enable/disable toggles, and disabled rules stop producing alerts immediately.

---

## R3 — Heterogeneous system data integration and sync

**Priority:** P1 (Should-have)

**Acceptance criteria:**

- Data is ingested from heterogeneous sources (ERP, WMS, MES) through configurable connectors, with CDC capturing incremental changes.
- Failed syncs are retried and surfaced with an explicit status; delivery is at-least-once with idempotent deduplication on target records.
- Incremental sync latency does not exceed 60 seconds end-to-end.
- Every sync job produces an auditable record: source system, timestamp, row counts, and final status (success/partial/failed).
