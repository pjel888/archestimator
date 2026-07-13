# 20 — Audit Baseline and Scorecard (Improve-Plan Pass)

> Produced by the `Improve-Plan-Prompt.md` pass over the package created by
> `Creating-Plan-Prompt.md`. This is the Phase 1 inventory + source hierarchy
> and Phase 2 baseline + final scorecard. `verification_mode: emulated`.

## Phase 1 — Document inventory

| Doc | Purpose | Authority | Status | Main claims | Req/Dec/Risk | Depends on | Depended by | Gaps found |
|---|---|---|---|---|---|---|---|---|
| `README.md` | Entrypoint, status, phase order, go/no-go | primary index | current | CONDITIONALLY READY | — | 11,16,17 | all readers | (fixed: DLQ-drain mechanics) |
| `00_AGENT_COORDINATION.md` | Master goal, orchestration, ledger, verif mode | primary (process) | current | emulated verif | — | — | 17 | none |
| `01_EXECUTIVE_SUMMARY.md` | One-page overview | derived | current | 3 gaps, decisions | — | 03,11 | README | none |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief + in/out scope | primary (scope) | current | scope table | — | PROMPT | 04,10 | none |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Evidence map | primary (evidence) | current | paths/lines/symbols | — | repo | 06,07,08,12 | (fixed: provider-claim grounding) |
| `04_REQUIREMENTS_SPECIFICATION.md` | Req IDs + shadow paths | primary (requirements) | current | FR/ARCH/DATA/API/SEC/REL/TEST/DOC | reqs | 02,03 | 11,16 | source-strength col added in 16 |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | N/A declaration | primary (N/A) | current | ops plan, no UI | — | — | — | none |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target arch, decisions | primary (architecture) | current | shared job core, in-process retention | decisions | 03 | 07,11 | (fixed: explicit-ack semantics) |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | DB blueprint, API contracts | primary (data/api) | current | DB-INDEX, message contract | DATA-001 | 03 | 11 | (fixed: DLQ is a queue needing consumer) |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threat model, credential taxonomy | primary (security) | current | T-1…T-10 | — | 03 | 11 | **Attack Surface Inventory table added** |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets, PERF, alerts | primary (perf/rel) | current | PERF evaluator, alert table | — | 03 | 13 | none |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Impact classification | primary (blast) | current | required/possible/unaffected | — | 03 | 11 | none |
| `11_IMPLEMENTATION_PLAN.md` | Execution guide | primary (implementation) | current | T-001…T-012, 6 phases | tasks | 04,07 | 12,13,16 | **impl-unit fields normalized** |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix | primary (testing) | current | req→test map | — | 04,11 | 16 | **proof-contract rows added** |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Rollout, rollback, runbook | primary (ops) | current | 7 steps, runbook | — | 09,11 | — | (fixed: DLQ drain = consumer/pull) |
| `14_RISK_REGISTER.md` | Risks + mitigation | primary (risk) | current | RISK-001…013 | risks | all | 17 | none |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Decisions + open + assumptions | primary (decisions) | current | D-*, OPEN-DEC-*, ASSUMP-* | decisions | all | 11 | (fixed: ASSUMP-002 resolved, D-DLQDRAIN added) |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Traceability | primary (traceability) | current | req↔task↔test | — | 04,11,12 | 17 | **column shape normalized to required format** |
| `17_FINAL_READINESS_REVIEW.md` | Verifier + scores | primary (verification) | current | emulated, scores | — | all | README | **final verif matrix + evidence-class table added** |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack | primary (standards) | current | Queues/D1/R2/secrets | — | 03 | — | (fixed: explicit-ack + DLQ-drain) |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, cycles, UltraQA | primary (research) | current | RQ-1…5, UltraQA | — | — | 17 | **RQ-1 resolved with citations** |

**Obsoletion/consolidation:** none. No redundant documents found — each has a
distinct authoritative topic. ANTI-SLOP: no new docs created beyond this one
(`20`), which closes the real Improve-Prompt gap (inventory + scorecard).

## Source hierarchy (which controls when conflict)

1. User intent (`PROMPT.md`) — product goal.
2. Repo reality — `wrangler.jsonc`, `worker.ts`, `upload-job-queue.ts`, `scheduled-upload-jobs.ts`, `retention-core.ts`, route handlers, `migrations/`, `package.json`, `retention-schedule.md`.
3. Official Cloudflare docs (Queues DLQ/batching/retries/pull-consumers) — provider behavior. **Newly cited in this pass.**
4. `current-state.md` / `decisions.md` — project history (append-only; verify against source).
5. Older/archived docs (`09_archive/.../E-010-retention-operator-procedure.md`) — historical, low authority.

**Conflicts resolved this pass:**
- *Plan vs provider docs on DLQ drain:* plan implied a `wrangler queues dlq` drain; provider docs confirm DLQ is a normal queue needing its own consumer/pull consumer. Fixed in `07`, `13`, `18`, FR-005, D-DLQDRAIN.
- *Plan vs provider docs on batch retry:* plan under-specified explicit-ack; provider docs confirm whole-batch retry is the default and per-message ack/retry (which the code uses) is explicit-ack mode. Fixed in `06`, `18`, `07`.
- *Plan vs provider docs on retry delay:* code's `retryDelaySeconds=60` overrides Cloudflare's default exponential backoff with a flat 60s. Fixed in `07`, `18`.

## Research closure (RQ-1, was an open assumption)

RQ-1 (can `wrangler queues` peek/drain the DLQ?): **RESOLVED.** Per official
Cloudflare Queues docs, there is no dedicated DLQ-drain CLI. A DLQ is a regular
queue; to inspect/drain it you must either (a) add a consumer Worker to the DLQ
queue, (b) use a pull consumer via the HTTP API
(`POST /accounts/{account_id}/queues/{queue_id}/messages/pull`), or (c) use the
dashboard "Debug Queues" send/list/ack feature. **Impact:** the runbook DLQ
procedure is rewritten to these three real mechanisms, and a new decision
D-DLQDRAIN recommends a pull-consumer drill for safe replay. ASSUMP-002 is
downgraded from "unconfirmed" to "verified with citations."

Sources (retrieved 2026-07-07):
- Dead Letter Queues — https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
- Batching, Retries and Delays — https://developers.cloudflare.com/queues/configuration/batching-retries/
- Pull consumers — https://developers.cloudflare.com/queues/configuration/pull-consumers/
- Configure Queues — https://developers.cloudflare.com/queues/configuration/configure-queues/
- Queues platform limits — https://developers.cloudflare.com/queues/platform/limits/
- Debug Queues from the dash — https://blog.cloudflare.com/debug-queues-from-the-dash/

## Phase 2 — Baseline scorecard (BEFORE this improve pass)

Per Improve-Prompt §PHASE 2 categories. Baseline = state after Creating-Plan,
before Improve-Plan repairs. Caps applied per the scoring rules.

| Doc | 1.Strat | 2.Req | 3.React | 4.Arch | 5.Data/API | 6.Sec | 7.UX | 8.Perf | 9.Rel | 10.Test | 11.Rollout | Overall | Cap reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 03 source audit | — | — | N/A | 96 | 94 | 92 | N/A | 90 | 90 | 88 | 88 | 90 | provider claims ungrounded (DLQ/retry) |
| 04 requirements | 90 | 88 | N/A | 90 | 88 | 86 | N/A | 86 | 86 | 84 | 84 | 86 | missing source-strength col; ACs lack proof path linkage |
| 06 architecture | — | — | N/A | 92 | 90 | — | N/A | 86 | 86 | — | — | 90 | explicit-ack under-specified |
| 07 data/api | — | — | N/A | — | 88 | 84 | N/A | 84 | 84 | — | 84 | 85 | DLQ mechanics wrong; missing access-path "posture" detail |
| 08 security | — | — | N/A | — | 84 | 82 | N/A | — | — | 84 | — | 82 | **missing Attack Surface Inventory (caps ≤79 if auth/data/public — here 82 because flows are operator-only, but table still required)** |
| 09 perf/rel | — | — | N/A | — | — | — | N/A | 88 | 86 | — | 84 | 86 | good; alert thresholds need hosted-evidence flag |
| 11 impl plan | — | 86 | N/A | 88 | 86 | 84 | N/A | 84 | 84 | 84 | 84 | 85 | impl-unit fields incomplete vs required list |
| 12 test strategy | — | — | N/A | — | — | — | N/A | — | — | 84 | — | 84 | **missing proof-contract rows (caps ≤84 per rules)** |
| 16 traceability | — | 84 | N/A | — | — | — | N/A | — | — | 84 | — | 84 | column shape ≠ required format |
| 17 readiness | — | — | N/A | — | — | — | N/A | — | — | — | — | 88 | missing evidence-class table; emulated cap |
| Package overall | 92 | 86 | N/A | 90 | 86 | 82 | N/A | 86 | 86 | 84 | 85 | **85** | multiple format gaps + provider grounding |

(React/Next columns N/A — no frontend; `05` documents this.)

## Phase 2 — Final scorecard (AFTER this improve pass)

| Doc | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | Overall | Δ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 03 | — | — | N/A | 97 | 96 | 95 | N/A | 93 | 93 | 91 | 90 | 93 | +3 |
| 04 | 93 | 93 | N/A | 93 | 92 | 91 | N/A | 89 | 89 | 89 | 88 | 91 | +5 |
| 06 | — | — | N/A | 95 | 93 | — | N/A | 89 | 89 | — | — | 92 | +2 |
| 07 | — | — | N/A | — | 93 | 89 | N/A | 88 | 88 | — | 88 | 90 | +5 |
| 08 | — | — | N/A | — | 89 | 88 | N/A | — | — | 89 | — | 88 | +6 |
| 09 | — | — | N/A | — | — | — | N/A | 90 | 89 | — | 86 | 88 | +2 |
| 11 | — | 91 | N/A | 92 | 91 | 89 | N/A | 87 | 87 | 88 | 88 | 89 | +4 |
| 12 | — | — | N/A | — | — | — | N/A | — | — | 90 | — | 90 | +6 |
| 16 | — | 91 | N/A | — | — | — | N/A | — | — | 90 | — | 90 | +6 |
| 17 | — | — | N/A | — | — | — | N/A | — | — | — | — | 92 | +4 |
| Package overall | 93 | 91 | N/A | 93 | 91 | 88 | N/A | 89 | 88 | 89 | 88 | **90** | **+5** |

**Final status:** `CONDITIONALLY READY` (unchanged — the status was already
correct; the score was depressed by format gaps now closed, but emulated
verification + external blockers OPEN-DEC-004/007/008 + REL-003 keep it
conditional, not implementation-ready). Per the Improve-Prompt cap, emulated
verification on a high-blast-radius package caps status at `CONDITIONALLY READY`
absent independent/owner approval — so 90 overall is consistent with the cap.

## Exact reasons every score remains below 100

- **Overall (90):** emulated verification caps at 97; external blockers (OPEN-DEC-004/007/008) and REL-003 30-day observation are unresolved and genuinely external; hosted provider proof (FR-008) not yet executed (owner-gated).
- **Strategy (93):** OPEN-DEC-004 counsel TTL sign-off bounds the retention product outcome.
- **Requirements (91):** FR-009 registry completeness is owner-decided (OPEN-DEC-007); some ACs depend on hosted proof not yet run.
- **Architecture (93):** D-RETDRY and D-DLQDRAIN are owner-delegated recommendations, not yet confirmed.
- **Data/API (91):** DB-INDEX (D-INDEX) is owner-approved-pending; EXPLAIN not yet run on preview D1.
- **Security (88):** raw bearer secrets are by-design (not a gap, but caps the "minimized credential" ideal); RISK-006 (inline auth copies) fix is optional; DLQ pull-consumer adds a new network surface to harden.
- **Performance (89):** PERF evaluator defined but baseline not yet measured on preview D1.
- **Reliability (88):** alert thresholds not yet calibrated against production traffic (pre-launch).
- **Testing (89):** 10 test gaps to close at implementation time; T-004 worker-handler test has a DISCOVERY sub-step.
- **Rollout (88):** hosted-proof and 30-day-observation gates remaining.

No score is inflated; no score claims 100 (which would require independent verifier + zero unresolved assumptions).
