# Plan: Cloudflare Queues / Cron Production Ops (2026-07-07)

> Planning-only pack. No application code was modified to produce this.
> Implementation must not begin until the owner approves (status below).

## Status

**`CONDITIONALLY READY`** (improve-pass 2026-07-07: overall readiness 85 → 90)

- The docs + tests + additive-migration slices (Phases 1–4) are
  implementation-ready: exact paths, symbols, ACs, and validation are specified.
- The improve pass closed the required-format gaps (traceability columns,
  proof-contract rows, Attack Surface Inventory, normalized implementation
  units, final verification matrix, evidence-class table) and grounded all
  provider claims in official Cloudflare Queues docs (RQ-1 closed: DLQ drain =
  consumer/pull, not a wrangler command; explicit-ack semantics; retry-delay
  override). See `20_AUDIT_BASELINE_AND_SCORECARD.md`.
- Three **external blockers** gate the "production-proven" claim and are
  isolated, not resolved: `OPEN-DEC-004` (counsel TTL sign-off),
  `OPEN-DEC-008` (hosted-proof authorization), and REL-003 (30-day observation).
- `verification_mode: emulated` caps overall readiness at 97 and the
  high-blast-radius package at `CONDITIONALLY READY` unless an independent
  reviewer or the owner later approves (`17`).

Older status aliases mapped: `READY` = `IMPLEMENTATION-READY`; `READY WITH
EXTERNAL DECISIONS` = `CONDITIONALLY READY`.

## Implementation start document

`11_IMPLEMENTATION_PLAN.md` — the authoritative execution guide. Phase order,
dependency graph, per-task exact paths/symbols, validation, rollback.

## Phase order & dependency graph

```
Phase 0: decisions (D-CRONSOT, D-IDEMP, D-INDEX, D-RETDRY, OPEN-DEC-004/007/008)
   │
   ├──► Phase 1: docs + guard test (T-001 AGENTS.md, T-002 cron guard)  [parallel]
   ├──► Phase 2: test gaps (T-003, T-004, T-005)                         [parallel]
   ├──► Phase 3: DB-INDEX migration (T-006)                              [independent]
   │        │
   │        ▼
   └──► Phase 4: runbook (T-007)  [depends on decisions]
            │
            ▼
      Phase 5: hosted proof (T-008)  [owner-gated]
            │
            ▼
      Phase 6: 30-day observation (T-009)  [time-boxed]
```

Parallel-safe: Phases 1, 2, 3 touch disjoint files. Sequential: Phase 4 after
decisions; Phase 5 after deploy; Phase 6 after Phase 5.

## Requirement/task/test traceability

- Requirements: `04` (FR/ARCH/DATA/API/SEC/REL/TEST/DOC).
- Tasks: `11` (T-001…T-012).
- Traceability: `16` (every req ↔ task ↔ test ↔ rollout check).
- Test matrix: `12`.

## Blocked decisions table

| Decision | Owner | Blocks | Options summary | Recommendation |
|---|---|---|---|---|
| OPEN-DEC-004 | Philip + counsel | retention "production-proven" (RISK-009/012) | 7 counsel checklist items | sign off; ship dry-run-only until then |
| OPEN-DEC-007 | Philip | FR-009 registry completeness | implement / platform-managed / defer per class | logs+sessions+uploads_orphaned → platform-managed; ai_* → defer |
| OPEN-DEC-008 | Philip | FR-008 hosted proof | authorize one-time proof run | authorize post-deploy |
| D-RETDRY | Philip (owner-delegated) | T-010 | add RETENTION_DRY_RUN env / leave as-is | add it (Small, safer) |
| D-INDEX | Philip | DATA-001 / T-006 | add 4 indexes / rely on composite | add (reversible, cheap) |
| D-DLQDRAIN | Philip (owner-delegated) | runbook §9 DLQ procedure | dashboard / pull-consumer / temp consumer Worker | dashboard + pull-consumer (new — 2026-07-07 improve pass; RQ-1 closed) |

## Stale-plan revalidation checklist (before implementing)

- [ ] `wrangler.jsonc:59-65` still declares exactly 3 crons (`0 3`, `15 3`, `30 3`).
- [ ] `AGENTS.md:40` still says "Two cron triggers" (if already fixed, skip T-001).
- [ ] `scheduled-upload-jobs.ts` constants unchanged (`CLOUDFLARE_UPLOAD_CLEANUP_CRON`, `CLOUDFLARE_UPLOAD_SCAN_CRON`).
- [ ] `upload-job-queue.ts` message schema + idempotency key shape unchanged.
- [ ] `retention-core.ts` `DEFAULT_RETENTION_RULES` still 7 rules.
- [ ] Latest migration still `0038` (if higher, re-check 0039 is the next number).
- [ ] `data_retention_events` CHECK enums unchanged (migration 0034).
- [ ] `cf:queues-cron-proof` / `cf:jobs-proof` scripts still exist in `package.json`.

## Commands to run before the first edit

```bash
git status                                  # confirm clean-ish working tree
rg -n "Two cron" AGENTS.md                  # confirm drift still present
bun run cf:check-deploy-dry-run             # validate current wrangler config
bun run test:dom -- cloudflare-upload-job-queue cloudflare-scheduled-upload-jobs compliance-retention-repository   # baseline green
```

## Files explicitly off-limits

- `wrangler.jsonc` cron/queue config (source of truth — not modified by this plan).
- `.open-next/*` (generated).
- `supabase/migrations/*` (legacy archaeology only).
- Any frontend/auth/component source (out of scope).
- Legacy provider project `ebxxqidacheyapmmzavr` (historical only).

## Files & systems intentionally unaffected

- Next.js routes/components, React, Tailwind, Better-Auth sessions.
- Durable Object `COLLAB_ROOMS`.
- Cloudflare Email `EMAIL`, Images `IMAGES`.
- D1 tables other than the 4 index targets (and only additively).

## External proof remaining before "production-proven"

1. **Hosted `cf:jobs-proof`** → `productionJobsMessagingReady=true` (FR-008,
   owner-gated OPEN-DEC-008). Local proof is necessary-not-sufficient.
2. **30-day hosted cron/D1 observation** → daily `data_retention_events` rows,
   stable backlogs, empty/dlq-drained (REL-003).
3. **OPEN-DEC-004 counsel sign-off** before retention ships live-by-default
   (RISK-009).
4. (Optional at impl time) confirm `wrangler queues` DLQ CLI surface for runbook §9.

Local checks (tests, EXPLAIN on preview, `cf:queues-cron-proof`) support code
readiness only; they cannot prove hosted/provider/production behavior.

## Archive policy

Do **not** auto-archive. Archive after full completion (Phase 6 + OPEN-DEC-004
closed), or archive only the completed Phase 1–4 slices if the owner wants the
external-gated slices to remain active.

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, orchestration, ledger, verification mode |
| `01_EXECUTIVE_SUMMARY.md` | One-page overview |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief + in/out scope |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Evidence map (paths, lines, symbols) |
| `04_REQUIREMENTS_SPECIFICATION.md` | Stable req IDs + shadow-path matrices |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | N/A with reason (ops/docs plan) |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target architecture, decisions |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | DB blueprint (DB-INDEX), API/network contracts |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threats, credential taxonomy |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets, PERF evaluator, alerts |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Impact classification |
| `11_IMPLEMENTATION_PLAN.md` | **Execution guide** — phases, tasks, exact paths |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test execution matrix |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Rollout, rollback, runbook summary |
| `14_RISK_REGISTER.md` | Risks with mitigation |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Decisions + open decisions + assumptions |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Full traceability |
| `17_FINAL_READINESS_REVIEW.md` | Verifier findings + scores |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, critique cycles, UltraQA matrix, gaps |
| `20_AUDIT_BASELINE_AND_SCORECARD.md` | Improve-Plan inventory + source hierarchy + before/after scorecard |
| `PROMPT.md` | Original brief (preserved) |
