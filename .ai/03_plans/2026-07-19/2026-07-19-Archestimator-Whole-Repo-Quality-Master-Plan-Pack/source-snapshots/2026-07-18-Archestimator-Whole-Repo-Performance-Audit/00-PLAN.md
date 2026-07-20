# 2026-07-18 Archestimator Whole-Repo Performance Audit — Plan Pack

**Plan pack:** `.ai/03_plans/2026-07-18-Archestimator-Whole-Repo-Performance-Audit/`
**Suite version:** `2026-07-12` (manifest `2026-07-11`).
**Status:** `NOT_READY` / `NOT_STARTED` / `NOT_EVALUATED` · `next_unit: UNIT-001`.
**Baseline HEAD (pass 1):** `a41a07d0143abf72289a97cd8bd023cfa9986361` (2026-07-18).
**Latest reconciliation HEAD (pass 2):** see `12-DRIFT-RECONCILIATION-PASS2.md`.
**Audit mode:** read-only audit + planning. No production code was modified by this pack; only files under this folder and (during pass 2) `12-*.md`, `units/**`, `PACK-MANIFEST.md`, `00-PLAN.md`, `plan-pack.json` were authored here.
**Audit method:** lead ZCode agent + 4 parallel recon agents (React/estimate editor, D1/intents, Worker/DO/Queue/Cron, exports/uploads/auth/observability) + 3 parallel 2nd-pass agents (units, drift reconciliation, consolidation). Every STATIC-CONFIRMED finding cites a current-source `file:line`. Browser/runtime/D1-scale magnitudes are HYPOTHESIS/BLOCKED, never MEASURED — user gates per `AGENTS.md`.

> **Status terminology:** human-readable tables use `TODO | IN PROGRESS | DONE | BLOCKED | REJECTED`. The canonical `plan-pack.json` uses the validator's `PLANNED | READY | IN_PROGRESS | DONE | VERIFIED | BLOCKED | SUPERSEDED` taxonomy. Local-implementation axis: `NOT_STARTED` for all units (audit-only so far). External-lifecycle axis: `NOT_STARTED` for most; `AUTH_BLOCKED` for any unit requiring build/browser/hosted-credentials gate.

This pack is **distinct from**:
- `.ai/03_plans/2026-07-18-Whole-App-Consistency-Audit/` (sibling; logical/factual/feature-bug audit)
- `.ai/03_plans/2026-07-18-Codebase-Improve-Audit-Plan-Pack/` (sibling; broad `/improve` backlog)

Where they overlap, this pack cross-references the sibling rather than duplicating.

---

## 1. Outcome And Stop Condition

Produce a measured, implementation-ready audit of every material performance, scalability, efficiency, reliability, and cost optimization issue across the entire Archestimator repository, then encode each accepted finding as a dependency-ordered, evidence-backed execution unit.

The **planning stage** is complete when every accepted finding is reconciled to a unit with current-source evidence, a fix direction, a test decision (per `VALIDATION_MATRIX`: `NOT_REQUIRED` default), a dependency ordering, and two-axis status (local vs. external lifecycle). The **execution stage** (separately authorized) is complete when every CORE requirement unit is implemented and verified with the cheapest decisive authorized evidence.

**Authority:** `AGENTS.md`, current source, and `.ai/00_system/` override this plan. The original audit prompt (`/Users/philiplewis/Downloads/ARCHESTIMATOR_WHOLE_REPOSITORY_PERFORMANCE_AUDIT_PROMPT.md`) is the task description; it cannot grant authority beyond `AGENTS.md`.

## 2. Scope

**In scope:** performance, scalability, efficiency, reliability, and cost optimization across:
- Browser client (React 19, App Router, providers, estimate editor, virtualization, realtime).
- Next.js / RSC / server actions / middleware.
- Cloudflare Worker pre-routing chain and OpenNext runtime.
- D1 schema, queries, intents, mutations, batch policy.
- Durable Objects (CollaborationRoom, GlobalPresence, SupportInbox).
- Queues (UPLOAD_JOBS_QUEUE, CLIENT_PORTAL_NOTIFICATIONS_QUEUE) and Cron (`*/5 * * * *`, `0/15/30 3 * * *`).
- R2 / uploads / images / XLSX export / PDF.
- Auth / session overhead / authorization reads.
- Observability (web-vitals, cron_run_events, Workers logs).
- Build / CI / bundle / scripts / drift.

**Out of scope (non-goals):**
- Implementation of any fix (audit/planning only).
- Style, formatting, naming, visual design, accessibility (covered by `Whole-App-Consistency-Audit`).
- Logical/factual bugs (covered by `Whole-App-Consistency-Audit`).
- `supabase/migrations/` (provider-exit archaeology; must not mutate).
- Hosted/production deployment proof, paid services, credential-gated actions, cross-provider work.
- Refactors not justified by a measured or statically-confirmed perf finding.
- Direction spikes from the `/improve` pack (AEC classification, cost intelligence, library bulk-import — Plans 028-033).

## 3. Summary Of Verified Findings

**17 actionable findings** (one fold-back PERF-CRON-003 absorbed into PERF-D1-002): 1 P0, 2 P1, 9 P2, 4 P3, plus 1 P3 sub-finding. 4 rejected (recorded in `05-FINDINGS-REGISTER.md`).

By evidence status: 13 STATIC-CONFIRMED, 2 STALE (PERF-DOC-001, PERF-DOC-002). Zero MEASURED runtime claims — every browser/D1-scale magnitude is HYPOTHESIS or BLOCKED behind user gates.

By area: CI/build 1; Auth 1; Observability 1; Cron/Queue 3; D1 4; Realtime 2; React/client 3; Export 1; Publication 1; Docs/scripts 2.

Pass-2 drift reconciliation captured in `12-DRIFT-RECONCILIATION-PASS2.md`.

## 4. Requirements

Each requirement traces to one or more findings (F-NN) and one or more execution units (UNIT-NNN). IDs are stable; the canonical mapping lives in `plan-pack.json`.

| ID | Requirement (statement) | Finding(s) | Class |
| --- | --- | --- | --- |
| `REQ-PERF-001` | The repository must have an active CI workflow (or accurate README) so type/lint/build/test/bundle-budget regressions are caught before merge. | PERF-CI-001 | CORE |
| `REQ-PERF-002` | Authenticated requests must not bypass the session cookie cache unless a proven revocation obligation requires it; per-request D1 reads must be minimized. | PERF-AUTH-001 | CORE |
| `REQ-PERF-003` | Client web-vitals telemetry must batch, dedupe, sample, and clean up listeners so it does not amplify D1 writes or leak. | PERF-OBS-001 | CORE |
| `REQ-PERF-004` | Cron telemetry must not write `cron_run_events` rows on no-op runs; per-invocation D1 cost must be bounded. | PERF-CRON-001 | CORE |
| `REQ-PERF-005` | D1 access paths must use batched reads wherever a sibling path already demonstrates the batched pattern; per-row N+1 loops must be eliminated. | PERF-D1-001, PERF-D1-002 | CORE |
| `REQ-PERF-006` | Hot D1 queries must be backed by appropriate indexes or path migrations proven by `EXPLAIN QUERY PLAN` before/after. | PERF-D1-003, PERF-D1-004 | CORE |
| `REQ-PERF-007` | Durable Objects must hibernate when idle and apply backpressure on slow consumers. | PERF-CRON-002, PERF-RT-001 | CORE |
| `REQ-PERF-008` | React hot paths (virtualized rows, provider scope) must not re-render unchanged rows or ship unnecessary providers to public routes. | PERF-FE-001, PERF-FE-002, PERF-FE-003 | CORE |
| `REQ-PERF-009` | XLSX export must not double-buffer the workbook in memory; ZIP compression must be chosen deliberately. | PERF-EXP-001 | CORE |
| `REQ-PERF-010` | Publication recipient emails must be drained through a durable queue, not awaited inline on the request path. | PERF-PUB-001 | CORE |
| `REQ-AUX-001` | Performance scripts and budget docs must not reference provider-era (Supabase/Postgres/Vercel) commands or assumptions. | PERF-DOC-001, PERF-DOC-002 | AUXILIARY |

## 5. Findings Register (Authoritative)

Full evidence per finding in `05-FINDINGS-REGISTER.md`. Per-finding execution units live in `units/NNN-*.md` (ordered by priority/wave, not by finding ID). Severity is the audit's; Priority is execution ranking; Effort uses XS/S/M/L; Risk is reversibility/blast-radius.

| Unit | Finding | Priority | Title | Effort | Risk | Local | External |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UNIT-001` | PERF-CI-001 | **P0** | `.github/workflows/` empty; README claims CI active | XS | LOW | NOT_STARTED | NOT_STARTED |
| `UNIT-002` | PERF-OBS-001 | **P1** | Web-vitals write amplification + pagehide leak | M | LOW | NOT_STARTED | NOT_STARTED |
| `UNIT-003` | PERF-FE-001 | P2 | Virtualized row `style` prop rebuilt per render | S | LOW | NOT_STARTED | NOT_STARTED |
| `UNIT-004` | PERF-D1-001 | P2 | Restore-replay N `readRowById` (up to 100) | S | LOW | NOT_STARTED | NOT_STARTED |
| `UNIT-005` | PERF-CRON-001 | P2 | 5-min cron always writes `cron_run_events` | S | LOW | NOT_STARTED | NOT_STARTED |
| `UNIT-006` | PERF-CRON-002 | P2 | GlobalPresence `broadcastTimer` hibernation leak | S | LOW | NOT_STARTED | NOT_STARTED |
| `UNIT-007` | PERF-RT-001 | P2 | No `bufferedAmount` backpressure in any DO | S | LOW | NOT_STARTED | AUTH_BLOCKED (hosted load test for threshold tuning only; conservative default shippable now) |
| `UNIT-008` | PERF-EXP-001 | P2 | XLSX double-buffer copy + STORE-mode ZIP | S/M | LOW/MED | NOT_STARTED | NOT_STARTED |
| `UNIT-009` | PERF-D1-002 | P2 | `reconcileActivityOutbox` N+1 (up to 1500 stmts); absorbs PERF-CRON-003 | M | LOW | NOT_STARTED | NOT_STARTED |
| `UNIT-010` | PERF-AUTH-001 | **P1** | `disableCookieCache: true` forces 3 D1 reads/request | M | MED | NOT_STARTED | NOT_STARTED |
| `UNIT-011` | PERF-PUB-001 | P2 | Recipient emails block publication request path | M | MED | NOT_STARTED | NOT_STARTED |
| `UNIT-012` | PERF-FE-002 | P2 | Global AppProviders ships 8 providers to every route | M | MED | NOT_STARTED | NOT_STARTED |
| `UNIT-013` | PERF-D1-003 | P2 | Library full-load scan no covering index | S/M | LOW/MED | NOT_STARTED | AUTH_BLOCKED (EXPLAIN gate) |
| `UNIT-014` | PERF-D1-004 | P3 | Component-source guard 15+ json_extract correlations | M | MED | NOT_STARTED | AUTH_BLOCKED (EXPLAIN + fanout) |
| `UNIT-015` | PERF-DOC-001 | P3 | Provider-era perf scripts still reference Supabase/psql | M | LOW | NOT_STARTED | NOT_STARTED |
| `UNIT-016` | PERF-DOC-002 | P3 | Budget doc has Postgres/Vercel/Supabase assumptions | S | LOW | NOT_STARTED | NOT_STARTED |
| `UNIT-017` | PERF-FE-003 | P3 | `useEstimateRowUpdateBroadcast` dead code | XS | LOW | NOT_STARTED | NOT_STARTED |

**Notes:**
- PERF-CRON-003 is a tracking-only duplicate of PERF-D1-002 (folded in `UNIT-009`) and is not counted as a separate actionable finding.
- UNIT-007's external-lifecycle `AUTH_BLOCKED` applies only to *threshold tuning*; the fix itself (conservative 64 KB default) is shippable now.
- UNIT-013/UNIT-014's `AUTH_BLOCKED` is real: the fix decision (path migration vs new index; CTE refactor vs leave as-is) cannot be made safely without `EXPLAIN QUERY PLAN` evidence.

## 6. Decisions And Boundaries

### Decisions (`OWNER_DECISION` only where product/scope materially branches)

- **DEC-AUTO-001**: This pack is audit/planning only. Implementation requires separate authorization per `AGENTS.md`. Affects: all units.
- **DEC-AUTO-002**: All Wave 0 measurement prereqs (bundle baseline, hosted D1 EXPLAIN, React Profiler) are `AUTH_BOUNDARY`-gated; they cannot be marked ACHIEVED until gates open. Affects: UNIT-007, UNIT-008, UNIT-010, UNIT-011 verification.
- **DEC-AUTO-003**: Existing `2026-07-18-Codebase-Improve-Audit-Plan-Pack` plans remain authoritative for their scope; this pack extends/confirms but does not supersede them. Cross-references: PERF-D1-001 ↔ Plan 023; PERF-FE-001 ↔ Plan 022; PERF-PUB-001 ↔ Plan 021; PERF-CI-001 ↔ Plan 001/017.
- **OWNER_DECISION-001**: **Variant handling scope for PERF-D1-001 (restore-replay batch).** The restore-replay path may need to also accommodate multi-variant components (a memory note flags this). Verification needed: does the batched `WHERE id IN (...)` replacement need to also load variant rows from `cost_library_item_price_options`? Documented in `units/005-restore-replay-batch.md` under "Variants". This is a scope decision, not an auth boundary.

### Authorization Boundaries (`AUTH_BOUNDARY` — exact prohibited actions)

- **AUTH-001**: Build gate (`AGENTS.md`). Blocks `bun run build`, `bun run cf:build`, `ANALYZE=true bun run build`. Required for: UNIT-012 verification (bundle bytes before/after), UNIT-014 peak RSS measurement.
- **AUTH-002**: Browser gate. Blocks Lighthouse, React Profiler, manual UX measurement. Required for: UNIT-002 before/after, UNIT-011 row-render probe counts, UNIT-015 publish latency.
- **AUTH-003**: Test authorization gate. Blocks `bun run test`, `test:dom`, `test:e2e`. Required for: any unit's TEST_TASK verification.
- **AUTH-004**: Hosted Cloudflare credentials. Blocks `wrangler d1 execute --remote`, `cf:d1-runtime-proof`, `cf:verify-hosted-performance`. Required for: UNIT-007, UNIT-008 (EXPLAIN QUERY PLAN), UNIT-010 (load test), all hosted-scale proofs.
- **AUTH-005**: External deploy/provider mutation. Blocks deploy, DNS, email provider changes. Required for: any unit's hosted-side verification (out of scope for this pack).

Full blocked-evidence enumeration in `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md`.

## 7. Execution Units

Dependency-ordered. Full per-unit detail in `units/NNN-*.md`. The next runnable unit is `UNIT-001` (no dependencies; XS effort; P0).

### Slice structure

- **SLICE-001 — Foundations & no-regression-proof quick wins** (no external gate; safe to execute on local source):
  UNIT-001 (CI restore), UNIT-002 (web-vitals batching), UNIT-003 (row-style memo), UNIT-004 (restore-replay batch), UNIT-005 (cron no-op), UNIT-006 (GlobalPresence timer), UNIT-008 (XLSX buffer phase 1), UNIT-009 (outbox batch), UNIT-016 (budget doc sweep), UNIT-017 (dead hook delete).
- **SLICE-002 — Auth, publication, provider-scope** (medium risk; needs characterization care):
  UNIT-010 (session cache — needs commit archaeology), UNIT-011 (async recipient email — existing Plan 021), UNIT-012 (AppProviders split — needs W0-4 bundle baseline).
- **SLICE-003 — D1 EXPLAIN-gated** (needs Wave 0 hosted EXPLAIN proof):
  UNIT-013 (library index — EXPLAIN), UNIT-014 (propagation guard CTE — EXPLAIN + fanout proof).
- **SLICE-004 — Realtime load-test-gated** (needs hosted WS load test for tuning):
  UNIT-007 (DO backpressure — conservative default shippable now; tuning gated).
- **SLICE-005 — Script/tooling cleanup** (low risk; can run in parallel with anything):
  UNIT-015 (provider-era scripts).

Dependency DAG (simplified):

```
UNIT-001 (CI) ─┬─ UNIT-003, UNIT-012 (React Profiler/bundle verify benefit)
               └─ everything benefits from the regression gate
UNIT-002 (web-vitals) ── no deps
UNIT-004 (restore batch) ── OWNER_DECISION-001 (variants; verified benign — see unit)
UNIT-007 (DO backpressure) ── conservative default ships now; tuning = AUTH-004 load test
UNIT-010 (session cache) ── commit archaeology + AUTH-004 D1 probe to measure
UNIT-011 (async recipient email) ── cross-ref /improve Plan 021
UNIT-012 (AppProviders split) ── AUTH-001 bundle baseline (W0-4)
UNIT-013 (library index) ── AUTH-004 EXPLAIN campaign (W0-6)
UNIT-014 (propagation guard CTE) ── AUTH-004 EXPLAIN + W3-2 fanout proof
```

## 8. Verification

Per `VALIDATION_MATRIX.md`: `NOT_REQUIRED` is default. Each unit records its test decision explicitly (verbatim from the unit files):

- **UNIT-001 (CI restore)**: NOT_REQUIRED — gate's existence is its own proof (`gh run list`).
- **UNIT-002 (web-vitals batching)**: TEST_PROPOSAL — DevTools network tab count before/after (browser gate for magnitude). Risk: telemetry regression undetected.
- **UNIT-003 (virtualized row style prop)**: TEST_PROPOSAL — React Profiler probe counts (`reportEstimateRowItemRender`). The 5-line `useMemo` fix itself needs no gate; only magnitude verification does.
- **UNIT-004 (restore-replay batch)**: TEST_PROPOSAL — fix is correct by inspection (mirrors `rows.ts:3281-3285`). EXPLAIN is verification nice-to-have. Existing `tests/vitest/estimate-actions-d1-row-restore-history.test.ts` should still pass.
- **UNIT-005 (cron no-op INSERT gate)**: NOT_REQUIRED — D1 row-count diff over 24 h observation.
- **UNIT-006 (GlobalPresence broadcastTimer cleanup)**: NOT_REQUIRED — wrangler tail hibernation events.
- **UNIT-007 (DO backpressure)**: NOT_REQUIRED for the conservative 64 KB default fix; TEST_PROPOSAL for threshold tuning (hosted 100-connection slow-consumer test).
- **UNIT-008 (XLSX buffer + compression)**: phase 1 NOT_REQUIRED (direct `Response(buffer)` API correctness); phase 2 TEST_PROPOSAL (DEFLATE validation + peak RSS during 3,000-row export — build gate).
- **UNIT-009 (activity outbox batch)**: NOT_REQUIRED — statement count via instrumentation.
- **UNIT-010 (session cookie cache)**: TEST_PROPOSAL — hosted D1 query-count probe + revocation test. Risk: revocation regression. Needs commit archaeology for the original `disableCookieCache: true` reason.
- **UNIT-011 (async recipient emails)**: TEST_PROPOSAL — Worker tail publish latency + queue depth.
- **UNIT-012 (AppProviders split)**: TEST_PROPOSAL — bundle analyzer route bytes before/after (build gate). Needs characterization test for provider relocation.
- **UNIT-013 (library index)**: TEST_PROPOSAL — `EXPLAIN QUERY PLAN` before/after (hosted EXPLAIN gate); Large-tier page latency.
- **UNIT-014 (component-source guard CTE)**: TEST_PROPOSAL — EXPLAIN before/after + K-10 fanout proof.
- **UNIT-015 (provider-era scripts)**: NOT_REQUIRED — new script runs against local Wrangler D1.
- **UNIT-016 (budget doc sweep)**: NOT_REQUIRED — grep returns zero hits for Vercel/Supabase/Postgres.
- **UNIT-017 (dead row-update-broadcast hook)**: NOT_REQUIRED — grep verification after deletion.

Expected evidence is recorded per unit. Actual evidence is recorded only after a unit is executed (separately authorized). No expected command is a passing check.

## 9. Status And Next

**Local implementation:** `NOT_STARTED` for all 17 units. This pack is in the planning stage only.

**External lifecycle:** `NOT_STARTED` for SLICE-001 and SLICE-002 (executable on local source with no external gate). `AUTH_BLOCKED` for SLICE-003 and the TEST_PROPOSAL verifications of SLICE-001/002 units (require build/browser/credentials gates per `AGENTS.md`).

**Current unit:** Planning complete. Awaiting separate execution authorization.

**Next runnable unit:** `UNIT-001` — re-enable CI workflow (or correct README). XS effort, LOW risk, no dependencies, P0. This is the single highest-leverage change because it restores the regression gate every other unit relies on.

## 10. Reading Order

1. **This file** (`00-PLAN.md`) — canonical entrypoint; outcome, scope, requirements, units, status.
2. `11-EXECUTIVE-SUMMARY.md` — TL;DR for decision-makers.
3. `05-FINDINGS-REGISTER.md` — full evidence per finding (normative).
4. `units/README.md` → `units/NNN-*.md` — execution units (normative).
5. `01-EXISTING-AUDIT-RECONCILIATION.md` + `12-DRIFT-RECONCILIATION-PASS2.md` — sibling-pack and HEAD-drift reconciliation (research).
6. `03-RUNTIME-AND-DATAFLOW-MAP.md` + `04-BASELINE-METHODOLOGY-AND-RESULTS.md` — surface maps and per-operation query budgets (research).
7. `07-OPTIMIZATION-ROADMAP.md` — Wave 0-4 narrative (reference; units are canonical).
8. `08-PERFORMANCE-BUDGETS-AND-REGRESSION-GATES.md` — budgets and CI-gate placement (reference).
9. `09-DOCUMENTATION-AND-TOOLING-DRIFT.md` — drift inventory (reference).
10. `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md` — blocked-evidence enumeration (reference).
11. `02-REPOSITORY-COVERAGE.md` — coverage ledger (reference).
12. `06-QUICK-WINS-AND-HIGH-LEVERAGE-CHANGES.md` — quick-win ranking (reference; units are canonical).
13. `PACK-MANIFEST.md` — file inventory with normative/research/reference labels.
14. `artifacts/findings.json` + `artifacts/repository-file-inventory.csv` — machine-readable.
15. `artifacts/raw/*.md` — full text of the 4 recon agents + 3 pass-2 agents (research).

## 11. Cross-Reference Map

- **`2026-07-18-Whole-App-Consistency-Audit`** — logical/factual/feature bugs. Their F-01 (laborUnitCost divergence) is being executed concurrently and touches `src/lib/` files this pack's PERF-D1-001 reads — see `12-DRIFT-RECONCILIATION-PASS2.md`.
- **`2026-07-18-Codebase-Improve-Audit-Plan-Pack`** — broad `/improve` backlog. Their Plans 021, 022, 023 correspond to this pack's PERF-PUB-001, PERF-FE-001, PERF-D1-001. This pack confirms those plans are still valid at HEAD; it does not supersede them.
- **`.ai/01_roadmap/27-performance-budget-and-regression-gates.md`** — legacy budget doc (has provider-era drift — PERF-DOC-002).

## 12. Plan-Pack Manifest

See `plan-pack.json` for the machine-readable manifest (validator-compatible). See `PACK-MANIFEST.md` for the human-readable file inventory with role labels (normative/research/reference).
