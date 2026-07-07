# Beta Support Feedback Operating Loop — Plan Pack

**Date:** 2026-07-07
**Slug:** `beta-support-feedback-operating-loop`
**Folder:** `.ai/03_plans/2026-07-07-beta-support-feedback-operating-loop/`
**Plan profile:** `exhaustive` (touches D1, Cloudflare Email, auth/gating, privacy/retention, launch-readiness proof)
**Implementation bias:** `minimal` — complete the operating loop around existing capture; do **not** build a CRM.

## Plan status

`CONDITIONALLY READY`

| Slice | Phase | Status | Blocked by |
|---|---|---|---|
| Acknowledgement + payload-preserving fallback + operator notify | P0 | `IMPLEMENTATION-READY` | none (email env proof = `OPEN-MON-01` for the notify *value*, but the slice is build-ready) |
| SLA columns + daily breach sweep + queue pagination + a11y | P1 | `IMPLEMENTATION-READY` | `OPEN-SLA-01` (owner-delegated defaults recorded — can proceed) |
| Reporter follow-up email | P2 | `IMPLEMENTATION-READY` | none |
| Retention TTL + DSAR reachability | P3 | `CONDITIONALLY READY` | `OPEN-RET-01` / `OPEN-DEC-004` |
| Readiness proof | P4 | `CONDITIONALLY READY` | `OPEN-MON-01` (hosted inbox + alert delivery) |

**Verification mode:** `emulated` (single-session planner; 4 independent read-only `Explore` lanes; emulated verifier). Caps overall readiness at 97 → package is `CONDITIONALLY READY` until a human/independent reviewer signs off.

## Start here

**Implementation entry document:** `11_IMPLEMENTATION_PLAN.md`

### Phase order
```
P0 (T1 ‖ T2 → T3)   →  P1 (T1 → T2 ‖ T3 → T4 → T5)  →  P2  →  P3  →  P4
```

### Dependency graph
```
P0-T1 (ack copy/a11y) ──┐
P0-T2 (mailto fallback) ─┼─→ P0-T3 (operator notify) ──→ P2-T1 (follow-up, needs responded_at)
                         │
                         └─→ P1-T1 (migration 0039) → P1-T2 (SLA math) ─┐
                                                   P1-T3 (store/actions)─┤
                                                                         └→ P1-T4 (sweep+cron) → P1-T5 (queue UI)
                                                                                                │
P3-T1 (retention rule) ←─ OPEN-DEC-004 ────────────────────────────────────────────────────────┤
P3-T2 (DSAR) ←─ privacy-request pack ───────────────────────────────────────────────────────────┤
P4-T1 (readiness) ←─ OPEN-MON-01 ───────────────────────────────────────────────────────────────┘
```

## Blocked decisions

| ID | Decision | Blocks | Recommended | Owner |
|---|---|---|---|---|
| OPEN-SLA-01 | SLA thresholds | P1 | 1bd (blocker/high FR), 3bd (med/low), 5bd resolution | owner (defaults recorded; can proceed) |
| OPEN-RET-01 | Retention TTL | P3 | 365 days, archived-only | owner + `OPEN-DEC-004` |
| OPEN-MON-01 | Hosted inbox + alert proof | P4 | external (observability-alert-proof pack) | owner/operator |
| OPEN-OPS-01 | Operator gate | P1 | reuse `isPlatformAdminRole` | owner (recorded; can proceed) |
| OPEN-ALERT-01 | Alert channels | P2 | email + optional webhook | owner (recorded; can proceed) |
| OPEN-FUNNEL-01 | Unify `/contact` into D1 | none (deferred) | defer to post-beta | owner |

## Commands/checks before the first edit
- `git status` (concurrent-agent safety)
- `rg "DEFAULT_RETENTION_RULES|retention-core" src/` (locate retention registry for P3)
- `rg "isPlatformAdminRole" src/` (confirm gate)
- Read current `worker.ts scheduled()` + `wrangler.jsonc` crons (may have changed)
- `bun run type-check` baseline

## Files explicitly off-limits
- `supabase/migrations/*` (legacy archaeology — never run/extend)
- `src/app/contact/*`, `src/components/landing/ContactForm.tsx` (deferred funnel)
- Better Auth core (`src/lib/auth/better-auth-cloudflare.ts`) — reuse, do not modify
- `upload-job-queue.ts` consumer internals (do not widen `jobName`)

## Files/systems intentionally unaffected
Durable Objects / `COLLAB_ROOMS`; Queue `UPLOAD_JOBS_QUEUE` (cron is simpler); `EMAIL` binding config; publication/share/collaboration; cost library; estimates; landing pages; Better Auth roles/session.

## External proof still required before production rollout
- Hosted inbox monitoring (`support@archestimator.com`) — `OPEN-MON-01`
- Alert webhook delivery (or explicit operator-email-only attestation) — `OPEN-MON-01`
- Retention-schedule ratification — `OPEN-DEC-004`
- D1 `0039` hosted apply + readback — deploy-time (`13`)

## Traceability
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` — 27 requirements, 0 untraced.
- `12_TEST_AND_VALIDATION_STRATEGY.md` — test execution matrix + 15-scenario UltraQA matrix + shadow-path matrices (`04`).

## Headline architecture
Additive nullable columns (`first_response_at`, `responded_at`, `alerted_at`) on `beta_feedback_submissions` (migration `0039`); operator notify via `sendEmail` on new blocker/high; daily cron SLA sweep in `worker.ts scheduled()` cloning `sendUploadOperationalAlert`; reporter follow-up email on `resolved`; 365-day archived-only retention; readiness check before beta widens. **No new tables, no queue job, no zod, no CRM.**

## Archive policy
Do not archive automatically. Archive (or move to `000-Follow Ups/`) only after the full loop is implemented, verified end-to-end with a real beta feedback, and the readiness check is green. P3/P4 may be tracked as follow-ups if P0/P1/P2 ship first.

## Document index
| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, lanes, skills, open decisions |
| `01_EXECUTIVE_SUMMARY.md` | Headline findings + slice status |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, in/out scope, ACs |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Current surfaces + evidence |
| `04_REQUIREMENTS_SPECIFICATION.md` | 27 reqs + shadow matrices |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Journeys, states, a11y |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current→target + alternatives + Mermaid |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Schema, queries, contracts |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threats, credential taxonomy, privacy |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Evaluator, budgets, events |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Direct/transitive/unaffected |
| `11_IMPLEMENTATION_PLAN.md` | **Start here** — phases, tasks, contracts |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix + UltraQA |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Deploy, flag, rollback, runbook |
| `14_RISK_REGISTER.md` | 12 risks with mitigations |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | DEC-01..08, assumptions |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | 27/27 traced |
| `17_FINAL_READINESS_REVIEW.md` | Scores + verifier findings |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, skills, QA evidence |
| `21_DATABASE_CHANGE_BLUEPRINTS.md` | Migration 0039 + retention + DSAR |

## Stale-plan revalidation checklist
Before implementing, re-verify:
- [ ] `wrangler.jsonc` crons (count + schedule) — was 3 on 2026-07-07
- [ ] `beta_feedback_submissions` schema (migration `0001`) unchanged
- [ ] `isPlatformAdminRole` / `requireCurrentUserContext` import paths
- [ ] `sendEmail` / `sendUploadOperationalAlert` signatures
- [ ] `worker.ts scheduled()` shape
- [ ] retention registry location (`rg "DEFAULT_RETENTION_RULES"`)
- [ ] `AGENTS.md` cron note (stale "two crons" on 2026-07-07)
