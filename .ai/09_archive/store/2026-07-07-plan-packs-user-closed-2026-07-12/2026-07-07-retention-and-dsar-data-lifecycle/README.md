# Plan Pack: Retention and DSAR Data Lifecycle

**Plan status:** `CONDITIONALLY READY`
**Plan profile:** exhaustive
**Verification mode:** `emulated` (readiness cap applied; see `17_FINAL_READINESS_REVIEW.md`)
**Folder:** `.ai/03_plans/2026-07-07-retention-and-dsar-data-lifecycle/`
**Mode:** planning only — no application code, tests, migrations, or provider state changed by this pack.

> Why `CONDITIONALLY READY` and not `IMPLEMENTATION-READY`: (1) verification was performed as an emulated pass (no second native independent verifier), which caps high-blast-radius packages at `CONDITIONALLY READY`; and (2) the performance-readiness gate sits at 94 because the hosted 30-day cron observation and the `OPEN-DEC-004` (counsel TTL sign-off) are genuinely external. Named slices below can move to implementation now.

---

## What this pack is

A production-grade planning package that converts Archestimator's **draft** retention schedule (`retention-schedule.md`) and **partial** DSAR pieces into a fully defined, provable implementation. It satisfies the PROMPT.md stop condition: *"defines the exact implementation and proof needed for retention and DSAR readiness."*

It covers every PROMPT.md required element: data inventory, retention TTL decisions, DSAR export/delete workflow, cron proof, R2 deletion proof, log retention boundaries, evidence format, legal-owner signoff points, and tests.

## Implementation entrypoint

**Start at `11_IMPLEMENTATION_PLAN.md`.** Phase order:

```
Phase 0 (inventory + verify intake)  ── no external dependency
   ↓
Phase 1 (14-class registry + env-gate + evaluator)  ── no external dependency
   ↓
Phase 2 (admin triage + transitions)  ── no destructive risk
   ↓ (parallel)
Phase 3 (DSAR export)        Phase 4 (DSAR erasure + R2)  ── Phase 4 needs OPEN-DEC-007 to enable
   ↓
Phase 5 (cron proof + 30-day hosted gate + dashboard)
   ↓
Phase 6 (tests + adversarial QA + runbook + docs)
```

**Named slices that can move to implementation now (CONDITIONALLY READY):**
- Phase 0 (inventory) — done in this pack.
- Phase 1 (T-1.1 DB-05, T-1.2 14-class registry, T-1.3 non-purge actions, T-1.4 env-gate, T-1.5 evaluator) — no external dependency.
- Phase 2 triage (T-2.1 transition repo, T-2.2 admin route, T-2.3 UI) — no destructive risk; legal-hold (T-2.4) stays blocked on `OPEN-DEC-006`.

**Slices blocked on external decisions:**
- Final TTL values → `OPEN-DEC-004` (counsel).
- Legal-hold policy → `OPEN-DEC-006` (counsel + Philip).
- DSAR SLA + erasure identity threshold → `OPEN-DEC-007` (counsel). Erasure code (Phase 4) can land behind `DSAR_ERASURE_ENABLED=0`.
- Export format/delivery → `OPEN-DEC-008` (counsel + Philip). Default JSON + signed R2 URL is the interim.
- Privacy-notice wording → `OPEN-DEC-002` (counsel). Email confirmation disabled until then.

## Dependency graph
See `10_BLAST_RADIUS_AND_DEPENDENCIES.md` §2 (Mermaid) and `11_` phase prerequisites.

## Requirement/task/test traceability
- Requirements: `04_REQUIREMENTS_SPECIFICATION.md` (REQ-INV/RET/DSAR/CRON/R2/LOG/EVID/LEGAL/TEST).
- Traceability matrix: `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.
- Implementation tasks: `11_IMPLEMENTATION_PLAN.md` (T-0.1 … T-6.4).
- Tests: `12_TEST_AND_VALIDATION_STRATEGY.md` + `19_` §6 adversarial matrix.

## Blocked decisions table

| Decision | Owner | Status | Unblocks |
|---|---|---|---|
| `OPEN-DEC-002` privacy-notice wording | counsel | blocked-external | DSAR email confirmation |
| `OPEN-DEC-004` final TTLs | counsel | blocked-external | "policy" / compliance claim |
| `OPEN-DEC-006` legal-hold policy | counsel + Philip | blocked-external | `skipped_legal_hold` enforcement (T-2.4) |
| `OPEN-DEC-007` DSAR SLA + identity threshold | counsel | blocked-external | production erasure enable |
| `OPEN-DEC-008` export format/delivery | counsel + Philip | blocked-external | non-default export formats |

## Stale-plan revalidation checklist (run before any edit during implementation)
1. `git status --short --branch` — confirm clean/shared-worktree state.
2. `ls migrations/ | tail -5` — confirm latest migration number (pack assumes `0039` → next is `0040`; re-verify).
3. `rg "DEFAULT_RETENTION_RULES" src/lib/compliance/retention-core.ts` — confirm rule count (pack assumes 7).
4. `rg "transitionPrivacyRequest" src/lib/compliance/` — confirm not yet implemented.
5. Re-read `retention-schedule.md` — confirm still DRAFT / `OPEN-DEC-004` open.
6. Re-read `worker.ts` scheduled() — confirm retention pass wiring unchanged.
7. Re-read this README + `11_` phase being implemented.
8. Check `LOOP_LEDGER.md` (create in this folder if absent) for concurrent-agent ownership.

## Commands/Checks to run before the first edit
- `git status --short --branch`
- `bun run type-check` (baseline green)
- `bunx vitest run tests/vitest/compliance-retention-repository.test.ts --maxWorkers=1` (baseline green)
- `ls migrations/ | tail -3` (confirm next migration number)
- `rg "isPlatformAdminRole" src/ | head` (confirm platform-admin helper)

## Files explicitly off-limits (do not touch in this plan's scope)
- Any file outside `.ai/03_plans/2026-07-07-retention-and-dsar-data-lifecycle/` **during planning** (this pack is docs-only).
- During implementation: `supabase/migrations/*` (legacy archaeology only), Better Auth schema migrations (DEC-003), unrelated provider projects (`ebxxqidacheyapmmzavr`, unrelated `archestimator` provider project).

## Files and systems intentionally unaffected
- Public landing routes; collaboration DO (`COLLAB_ROOMS`); upload scan pipeline; proposal-export route; existing retention cron timing; Better Auth schema; Supabase/Vercel/Resend (historical only); Workers Observability/Email platform-managed TTLs.

## External proof that remains required before production rollout (or compliance claim)
1. 30 days of hosted `data_retention_events` rows from the deployed Worker (REQ-CRON-003).
2. An R2 DSAR-erasure receipt in `ARCH_UPLOADS_R2` (REQ-R2-002).
3. Hosted readback of Workers Observability + Email retention config (REQ-LOG-001/002).
4. `OPEN-DEC-004` counsel sign-off on TTLs (REQ-LEGAL-001).
5. `OPEN-DEC-007` sign-off on DSAR SLA + erasure identity verification (REQ-DSAR-003 production enable).
6. A DSAR staging drill (operator runs a fake erasure → verify propagation + receipt + 30d purge).

None of these are provable from local-only checks.

## Archive policy
- Archive after full completion (all phases + 30-day gate + sign-offs) to `.ai/09_archive/<date>-retention-and-dsar-data-lifecycle/`.
- Named completed slices (Phase 0, Phase 1, Phase 2) may be archived independently once proven.
- Do not archive automatically; archive only on owner confirmation.

## Document map

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, ledger, skills, agent plan |
| `01_EXECUTIVE_SUMMARY.md` | Overview, findings, decisions, readiness |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief decomposition, scope, non-goals |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Source docs + code/migration inventory |
| `04_REQUIREMENTS_SPECIFICATION.md` | REQ IDs + shadow-path matrices + credential taxonomy |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Admin console UX/a11y |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target architecture, state machine, alternatives |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Inventory, propagation map, DB blueprints, API contracts |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | STRIDE threat model, controls, denial tests |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Evaluators, budgets, failure modes, observability |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Affected surfaces, dependency graph, doc-impact |
| `11_IMPLEMENTATION_PLAN.md` | Phased execution guide (authoritative) |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test execution matrix |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Flags, gates, runbook, dashboard queries |
| `14_RISK_REGISTER.md` | Risks with owners + mitigations |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | DEC-* + OPEN-DEC-* + assumptions |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | REQ → task → test → rollout |
| `17_FINAL_READINESS_REVIEW.md` | Verification mode + scores + gaps |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack/production decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, review cycles, adversarial matrix, gaps |

## Confirmation
- No application code, tests, migrations, package manifests, or provider state was modified by this pack (docs-only).
- All work confined to `.ai/03_plans/2026-07-07-retention-and-dsar-data-lifecycle/`.
- No Git branches/worktrees created, switched, or pushed.
- Verification mode `emulated` recorded honestly; readiness cap applied.
