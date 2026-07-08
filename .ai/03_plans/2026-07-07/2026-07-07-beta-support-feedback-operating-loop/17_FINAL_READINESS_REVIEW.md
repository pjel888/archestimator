# 17 — Final Readiness Review (Improvement Pass)

This is the **second-suite (Improve-Plan) review**, run after the Creating-suite pass. `verification_mode: emulated` for the authoring revisions; the **verification + adversarial lanes were run as independent `Explore` subagents** (separate outputs, separate agent IDs) before this re-scoring — so the *evidence gathering* is `independent` while the *synthesis/re-scoring* is `emulated`. Per the suite authority contract, the package is high-blast-radius, so emulated synthesis caps the package at `CONDITIONALLY READY` unless a human/independent reviewer signs off on the final package (not just the evidence lanes).

## Improvement-pass summary

- **Independent verifier lane** (Explore agent): verified 17 codebase claims + Next.js 16 Cache Components posture. Found 4 inaccuracies (all fixed): `SUPPORT_EMAIL`/`MAX_*` not exported; `canReviewBetaFeedback` gate location; static-mailto location; worker.ts comment text + cron routing.
- **Independent adversarial lane** (Explore agent): found 6 P0 + 11 P1 + 8 P2 defects. All P0/P1 fixed (see resolution table below).
- **2 new docs created**: `20_ROUTE_BOUNDARY_AND_CACHE_CONTRACTS.md` (mandated per-route artifact + CWV), `22_ATTACK_SURFACE_AND_ACCESS_PATHS.md` (mandated attack-surface + access-path tables).
- **3 docs materially rewritten**: `16` (11-column traceability matrix), `21` DB-02 (real `RetentionRule` shape), `12` (proof-contract schema + corrected test paths). `05` (11-state matrix + a11y proof matrix), `08`/`09` (webhook timeout + failure modes + user_email vector), `03` (4 corrections + stale-source reconciliation).

## Adversarial findings — resolution table

| Sev | Finding (doc) | Resolution |
|---|---|---|
| P0 | 21 DB-02 retention rule shape invented (`{table, purgeSql}`) vs real `RetentionRule` (`{className, ttlDays, action, selectSql, applySql}`) | **Fixed**: DB-02 rewritten to the exact `retention-core.ts:44-50` shape with the two-step `json_each` pattern. |
| P0 | `RetentionClassName` is a closed union; plan called it "additive registry insert" | **Fixed**: DB-02 now names the exact source edit (`RetentionClassName` union + `DEFAULT_RETENTION_RULES` array in `src/lib/compliance/retention-core.ts`); "additive" claim dropped for retention. |
| P0 | No route-specific boundary/cache contract | **Fixed**: new `20_ROUTE_BOUNDARY_AND_CACHE_CONTRACTS.md` with per-route tables for both routes + the modal, + Cache-Components posture verified against local Next.js docs + CWV posture. |
| P0 | Traceability matrix missing 4 mandated columns (Source ID, Source strength, Risk, Gap/decision) | **Fixed**: `16` rebuilt to all 11 mandated columns. |
| P0 | Webhook "timeout" claim false (template has none) | **Fixed**: `08` T-10 + `09` now state `sendFeedbackAlert` MUST add `AbortSignal.timeout(5000)`; `11` P1-T4 + `12` PROOF-SWEEP-TIMEOUT enforce it. |
| P0 | Test file paths wrong (`beta-feedback-form.test.tsx` etc. don't exist) | **Fixed**: `12` corrected to real files (`beta-feedback-form-ui.test.tsx`, `beta-feedback.test.ts`, `beta-feedback-review-ui.test.tsx`, `beta-admin-action-boundaries.test.ts`). |
| P0 | `cf:d1-migrate-local` fabricated | **Fixed**: `21` DB-01 now uses `bunx wrangler d1 migrations apply ARCH_DB --local` + `cf:d1-beta-feedback-proof`; `11`/`16` corrected. |
| P0 | Readiness inflation (94-97 with missing mandated artifacts) | **Fixed**: re-scored below with honest caps applied. |
| P1 | No Attack Surface Inventory table | **Fixed**: new `22` §A (8-column table for all entry points). |
| P1 | No access-path matrix | **Fixed**: new `22` §B. |
| P1 | UX state matrix only 6/11 states | **Fixed**: `05` rebuilt to all 11 states. |
| P1 | No action-level a11y proof matrix | **Fixed**: `05` added. |
| P1 | No proof-contract schema in test strategy | **Fixed**: `12` rebuilt to the 10-column proof-contract schema. |
| P1 | No CWV posture (LCP/INP/CLS) | **Fixed**: `20` CWV section + `09` auth-session measurement. |
| P1 | `user_email` injection vector under-modeled | **Fixed**: `08` T-13 + `11` P2-T1 validation gate. |
| P1 | Redirect-param URL-length limit (4000-char message) | **Fixed**: `11` P0-T2 now specifies inline-full / redirect-truncate-with-note strategy. |
| P1 | `decisions.md:872` cites legacy Supabase RLS | **Fixed**: `03` §L reconciled (legacy mechanism, current D1 truth). |
| P1 | Free-tier limits unsourced | **Fixed**: `09` marked `ASSUMPTION`/`NOT VERIFIED` + `cf:pricing` verification path. |
| P1 | Missing failure modes (back-button, archived-race, non-idempotent ADD COLUMN) | **Fixed**: `09` failure table + `21` DB-01 idempotency note. |
| P1 | Dangling `FR-ACK-03` | **Fixed**: `03` removed the dangling ref (intent absorbed into FR-ACK-02). |
| P2 | `feedbackErrorMessage` non-exported; cron-gate clarity; flag-off test; perf n=5 method | **Fixed/noted**: `11` P0-T1 export note; `11` P1-T4 + `12` PROOF-CRON-GATE enforce the gate; flag-off test optional; `16` perf row states drop-highest method. |

No unresolved P0/P1 finding remains.

## Baseline scorecard (Creating-suite pass, before improvement)

| Category | Baseline | Cap reason |
|---|---|---|
| Strategy/Product Value | 96 | SLA owner-delegated |
| Requirements Quality | 96 | 2 conditionally ready |
| React/Next Technical | 88 | no per-route cache contract (cap 80→89 for missing route analysis); Cache Components posture unverified |
| Architecture/Code Quality | 96 | clean |
| Data/API/Integration | 84 | invented retention rule shape (correctness), fabricated migrate cmd |
| Security/Privacy | 79 | missing attack-surface table + rate-limit posture (cap <80); user_email vector |
| UX/Accessibility | 84 | missing 11-state matrix + a11y proof matrix (cap 84) |
| Performance/Scalability | 84 | missing CWV posture + auth-session measurement |
| Reliability/Observability | 90 | webhook-timeout claim false; missing failure modes |
| Testing/QA | 75 | wrong test paths; no proof-contract schema (cap 75) |
| Rollout/Governance | 92 | flag-off test gap |
| **Overall (baseline)** | **~84** | multiple missing mandated artifacts |

## Final scorecard (after improvement)

| Category | Final | Δ | Justification |
|---|---|---|---|
| Strategy/Product Value | 96 | 0 | unchanged; clear outcome + non-goals; SLA owner-delegated |
| Requirements Quality | 96 | 0 | 27 reqs, 11-column traceability, 2 conditionally ready (external) |
| React/Next Technical | 94 | +6 | per-route cache contract added (20); Cache Components posture verified against local docs; emulated cap applies |
| Architecture/Code Quality | 96 | 0 | clean; retention shape corrected |
| Data/API/Integration | 93 | +9 | retention rule real; access-path matrix added; migrate cmd corrected; ADD-COLUMN idempotency documented |
| Security/Privacy | 88 | +9 | attack-surface inventory added; user_email vector covered; webhook timeout; **capped below 90** because hosted alert/inbox proof (`OPEN-MON-01`) + no per-user rate limit (T-09) remain |
| UX/Accessibility | 92 | +8 | 11-state matrix + a11y proof matrix + WCAG 2.2 AA mapping; **capped below 95** because visual/DOM focus proof is RTL-only (browser proof intentionally skipped — proportional) |
| Performance/Scalability | 90 | +6 | CWV posture + auth-session measurement + sweep evaluator; **capped at 90** because free-tier limits are `ASSUMPTION` (not verified via `cf:pricing`) and CWV is lab-only (no field data in workshop area) |
| Reliability/Observability | 93 | +3 | webhook timeout + failure modes + flag; **capped** because hosted proof external |
| Testing/QA | 92 | +17 | corrected test paths + proof-contract schema + 18 proof rows; **capped** because perf n=5 method is thin + flag-off test optional |
| Rollout/Governance | 93 | +1 | flag + rollback + runbook; **capped** because hosted go/no-go is external |
| Traceability | 97 | 0 | 27/27, 11 columns, 0 untraced |
| **Overall (final)** | **~92** | **+8** | emulated synthesis cap → `CONDITIONALLY READY` for the high-blast-radius package until human/independent reviewer signs off |

**Why not higher:** the package is genuinely blocked by 3 external items (`OPEN-MON-01` hosted inbox/alert proof, `OPEN-RET-01`/`OPEN-DEC-004` retention ratification, `OPEN-SLA-01` owner SLA sign-off) and the synthesis is `emulated`. Lifting to `IMPLEMENTATION-READY` requires: (a) owner sign-off on SLA values, (b) retention ratification, (c) hosted proof captured, (d) an independent reviewer/human signs off on the final package.

## Evidence-class table (mandated by Improve-Plan final deliverable)

| Evidence class | Items in this package | Cannot prove |
|---|---|---|
| **Local static** | all doc cross-checks; `git status`; requirement-ID traceability (programmatic); 1:1 trace verify; cron-count from `wrangler.jsonc`; migration shape from `migrations/0001`; `RetentionRule` shape from `retention-core.ts` | runtime/provider/hosted behavior |
| **Local automated** | (planned, not run in planning pass) `bun run test`, `bun run test:dom`, `bun run type-check`, `bun run cf:d1-beta-feedback-proof` — these are the *planned* proof commands; none were executed during this planning-only task | provider/production state |
| **Browser/manual** | intentionally skipped for ack/a11y/focus (RTL DOM tests replace it, per proportional policy); CWV is lab-only via `cf:verify-hosted-performance` (not run) | field CWV; production UX |
| **Provider-backed** | NOT run in this pass. `cf:d1-beta-feedback-proof` readback + `cf:pricing` snapshot are the *named* provider-proof surfaces; deferred to implementation. `OPEN-MON-01` (hosted inbox/alert delivery) is external. | user UX without paired UI proof |
| **Hosted/production** | NOT available. The go/no-go gate (`OPEN-MON-01`) requires hosted proof not captured here. | local code-path details without source inspection |
| **Inferred** | free-tier limit numbers (`ASSUMPTION`); business-day SLA values (owner-delegated); beta volume <100 rows/month | completion claims requiring direct proof |

**Honest gap statement:** This is a planning-only task. No validation command was run, no provider readback was captured, no browser proof was gathered, no hosted/production evidence exists. The package describes the *planned* proof surface (`12`, `21`, `22`) but the evidence is **prospective**, not executed. Residual risk: the plan's correctness rests on source inspection (strong) + framework-doc consultation (strong for cache model) + owner-delegated decisions (recorded). The 3 external blockers are the real gates to implementation.

## Final determination

**Package status: `CONDITIONALLY READY`** (improved from a defensible-but-inflated baseline).

- **P0** (ack + fallback + operator notify): `IMPLEMENTATION-READY` (after the URL-length strategy in P0-T2 is picked at impl)
- **P1** (SLA + sweep + pagination + a11y): `IMPLEMENTATION-READY` (owner-delegated SLA defaults recorded)
- **P2** (reporter follow-up): `IMPLEMENTATION-READY`
- **P3** (retention + DSAR): `CONDITIONALLY READY` — `OPEN-RET-01`/`OPEN-DEC-004`
- **P4** (readiness proof): `CONDITIONALLY READY` — `OPEN-MON-01`

**Smallest actions to reach full `IMPLEMENTATION-READY`:** (1) owner signs `OPEN-SLA-01`; (2) ratify `OPEN-DEC-004` so P3 unblocks; (3) capture hosted inbox + alert proof (`OPEN-MON-01`) so P4 unblocks; (4) independent reviewer/human signs off on the final package (lifts the emulated cap). Until (4), the honest label is `CONDITIONALLY READY` even though P0/P1/P2 slices are individually implementation-ready.

## Confirmation

No application code, tests, migrations, package manifests, generated types, env files, or provider state were modified. All writes are confined to `.ai/03_plans/2026-07-07-beta-support-feedback-operating-loop/`. The pre-existing `PROMPT.md` was preserved.
