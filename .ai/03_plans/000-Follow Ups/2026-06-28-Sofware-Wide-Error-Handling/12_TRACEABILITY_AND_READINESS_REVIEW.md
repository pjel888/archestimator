# 12 — Traceability Matrix and Readiness Review

Maps every requirement to source evidence, work package, acceptance criterion, validation method, and final status.

## A. Requirement → Source → Work package → Test

| Req ID | Source evidence | WP | Test | Status |
|---|---|---|---|---|
| FR-001 | `01` Section E gaps 1, 2, 9, 10 | P1-WP1, P1-WP3 | `tests/vitest/app-error.test.ts`, `unwrap-supabase.test.ts` | specified |
| FR-002 | `01` Section B.1 | P2a-WP1 + compatibility follow-up | `with-action-errors.test.ts` + pilot action regression | local canonical pilot + compatibility logging implemented; strict migration conditional |
| FR-003 | `01` Section B.2 | P2a-WP2, 3 + compatibility follow-up | `route-error.test.ts` + selected handler test | local canonical pilot + compatibility logging implemented; strict migration conditional |
| FR-004 | `01` Section A.2 | P3a-WP1, WP4 (primary DOM/static test), WP5 (optional browser) | `tests/vitest/global-error.test.tsx` (primary) + `e2e/global-error.spec.ts` (conditional) | implemented |
| FR-005 | `01` Section A.2 | P3a follow-up | `workshop-route-error-boundaries.test.tsx`, `not-found.test.tsx` | local follow-up implemented |
| FR-006 | `03` Section C | P3a-WP3 | `toast-apperror.test.tsx` | specified |
| FR-007 | `01` Section B.7 | local follow-up | `auth-error-mapping.test.ts` | implemented |
| ARCH-001 | `DEC-ERR-001` | P1-WP1..9 | directory exists; type-check | specified |
| ARCH-002 | README | all phases | protected-contract diff review | specified |
| LOG-001 | `02` Section C, `DEC-ERR-009` | P4-WP2, 3, 7 | `logger.test.ts` | pilot specified |
| LOG-002 | `06` Section B, `DEC-ERR-005` | P1-WP7 | `redact.test.ts` | specified |
| LOG-003 | `04` Section D | P4-WP4, 6 | `tests/unit/tail-dev-logs.test.ts` | specified |
| LOG-004 | `04` Section C | P4-WP1 | grep `logs/` in .gitignore | specified |
| OBS-001 | `02` Section A.3 | P5a-WP1..4 | `instrumentation.test.ts` | local instrumentation implemented; Sentry forwarding gated |
| OBS-002 | `02` Section D, `DEC-ERR-004` | P5b deferred work | `sentry-redact.test.ts`; manual dashboard only after owner/provider authority | owner/provider-gated |
| OBS-003 | `02` Section E | deferred | n/a | deferred |
| SEC-001 | `06` Section B | P1-WP7 | `redact.test.ts` property test | specified |
| SEC-002 | `06` Section D, `DEC-ERR-011` | P5b provider proof + probe after authority | `e2e/source-map-leak.spec.ts` | owner/provider-gated |
| SEC-003 | `06` Section F | P3a-WP2 + follow-up hardening | `client-error.test.ts` | local endpoint hardening implemented; provider-backed prod limiter gated |
| SEC-004 | `06` Section B.5 | P5b deferred work | `sentry-redact.test.ts` | provider-gated |
| UX-001 | `03` Section C | P1-WP8, P3a-WP3 | `toast-apperror.test.tsx` | specified |
| UX-002 | existing API | preserved | existing tests | specified |
| A11Y-001 | existing API compliance | P3a-WP4 | `toast-a11y.test.tsx` | specified |
| A11Y-002 | `05` Section A.5, A.6 | P3a-WP1 + P3a-FU2 | DOM focus assertions | implemented for global and existing workshop segment surfaces |
| TEST-001 | `09` Section B | P1-WP10 | each test green | specified |
| TEST-002 | `09` Section B | P3a-WP4, follow-up tests, P5a-WP4 | each test green | local tests green; provider-gated Sentry tests deferred |
| TEST-003 | `09` Section C | P6a-WP2 | pilot ADV rows pass | pilot specified |
| PERF-001 | `04` Section G | P4-WP7 | `logger-perf.test.ts` | specified |
| PERF-002 | `05` Section F | P5b deferred work | CI bundle-analyzer gate | owner/provider-gated |
| DOC-001 | repo convention | P6a-WP5 | current-state.md entry | specified |
| DOC-002 | repo convention | conditional | n/a unless tokens added | conditional |

## B. Source → Requirement reverse map

| Audit finding (`01` Section E) | Drives requirement(s) |
|---|---|
| 1. No typed AppError hierarchy | FR-001, ARCH-001 |
| 2. Server action shape inconsistency | FR-002, FR-003 |
| 3. No global-error.tsx | FR-004 |
| 4. No structured logger | LOG-001 |
| 5. No dev log file | LOG-001, LOG-003 |
| 6. No prod error forwarder | OBS-001, OBS-002 |
| 7. No instrumentation.ts onRequestError | OBS-001 |
| 8. Toast lacks appError | FR-006 |
| 9. Middleware errors silent | DEFERRED — out of scope per `README:11`; proxy/middleware runs on edge runtime which cannot import the Node-only observability stack; follow-on plan required |
| 10. Supabase raw errors leak | FR-001 (unwrapSupabase), SEC-001 |
| 11. Auth error pattern siloed | FR-007 |
| 12. No formal validation lib | OUT OF SCOPE (`DEC-ERR-008`) |

## C. User-pointed frameworks → compliance

| Framework section | Where addressed |
|---|---|
| `Creating-Plan-Prompt.md` Section 1 (create plan dir) | this plan pack dir |
| Section 2 (master goal) | `00_AGENT_COORDINATION.md` |
| Section 3 (multi-agent orchestration) | `00` "Lanes used" + `LOOP_LEDGER.md` |
| Section 4 (skills) | `00` "Skill discipline" |
| Section 4A (workflow contracts) | `00` "Workflow routing" |
| Section 5 (concurrent repo safety) | `00` ledger + README "Protected contracts" |
| Section 6 (audit entire codebase) | `01_SOURCE_AUDIT.md` |
| Section 7 (trace docs) | `02_INDUSTRY_RESEARCH.md` + cross-refs |
| Section 8 (analysis dimensions) | `01`, `03`, `05`, `06`, `04`/`08`, `10`, `11` |
| Section 8A (Next.js/React/Supabase bar) | `02`, `03`, `05`, `06` |
| Section 9 (planning package) | this pack (16 files, standard profile) |
| Section 10 (requirements spec) | `07_REQUIREMENTS_SPEC.md` |
| Section 11 (implementation plan) | `08_IMPLEMENTATION_PLAN.md` |
| `Multi-Agent-Execution-Directive.md` Section 0 (authority) | `00` "Authoritative inputs" |
| Section 1 (master goal) | `00` "Master goal" |
| Section 2 (multi-agent orchestration) | `00` + `LOOP_LEDGER.md` |
| Section 5 (coordination ledger) | `00` + `LOOP_LEDGER.md` |
| Section 7 (traceability) | this `12_TRACEABILITY_AND_READINESS_REVIEW.md` |
| Section 8 (execution loop) | `LOOP_LEDGER.md` iteration log |
| Section 11 (validation rules) | `09_TEST_QA_ULTRAQA_PLAN.md` |
| Section 12 (adversarial QA) | `09` Section C |
| Section 14 (completion audit) | `13_FINAL_AUDIT_SCORECARD.md` |
| Section 15 (final report) | `13` Section E + README "Stop condition" |

## D. Readiness review

**Verdict:** `LOCAL NON-SENTRY ROLLOUT IMPLEMENTED` for P1/P2a/P3/P4/P5a/P6a local scope. Provider/prod implementation remains gated.

**Scope of readiness:**
- P1 foundation plus the local rollout are traceable to source + WP + test.
- Strict all-actions/all-routes response-shape migration remains conditional on caller-by-caller contract review.
- 15 ADRs documented with rejected alternatives.
- 17 risks logged with mitigations.
- All user-pointed framework sections addressed.
- Council-raised P0/P1 blockers resolved by narrowing readiness and adding owner/provider gates.
- No unresolved P0/P1 remains inside the approved local non-Sentry scope. Provider/prod proof is explicitly gated for P5b.

**Verification mode declaration:** `independent` (council-improved)
- Original package was lead-authored and over-claimed readiness.
- Native feasibility, security/privacy, coherence, and adversarial document reviewers were used in this Codex improvement pass.
- Final native verifier confirmed PASS: no remaining P0/P1 planning blockers for the approved conditional-ready scope.

**Conditions for `CONDITIONALLY READY` (met by the planning pack before implementation):**
- Every requirement has a stable ID, source evidence, WP, test.
- All ADRs have rationale + rejected alternatives.
- All protected contracts enumerated.
- All risks have mitigations.
- Phased pilot-first plan with exit criteria.
- Industry standards cited with URLs.
- Ponytail counterweight applied.

**Conditions for upgrade to pilot implemented (met on 2026-06-29):**
- P1 foundation passes type-check, lint, and targeted tests.
- P2a/P3a/P4 pilot passes targeted and adversarial evidence.
- P6a ADV-14 dev-log diagnosis proof is recorded in `13_FINAL_AUDIT_SCORECARD.md`.

**Conditions for upgrade to local non-Sentry rollout implemented (met on 2026-06-29 follow-up):**
- Root `not-found.tsx`, existing workshop segment error boundaries, auth AppError bridge, local Next request instrumentation, and compatibility route/action logging are implemented.
- Focused rollout matrix passes, including `workshop-route-error-boundaries.test.tsx`, `not-found.test.tsx`, `instrumentation.test.ts`, and the broader observability matrix.
- `logs:debug` proves the latest local ERROR/FATAL record includes a likely next step and untrusted-field warnings.

**Conditions for full provider/prod `IMPLEMENTATION-READY`:**
- P5b owner/provider gate is resolved before external/prod proof.
- Fresh independent review accepts any strict P2b contract migration plan.

**Residual risks:**
- `RISK-ERR-013` — plan drift between writing and implementation. Implementer must re-read.
- `RISK-ERR-014` — agent runtime may still be broken at implementation time. All implementation is direct (no agent delegation required).
- Provider/prod behavior remains unproven until P5b evidence is captured; this is why the package is local-rollout implemented rather than provider/prod implemented.

**Stop conditions for the approved local rollout (P1 + P2a + P3 + P4 + P5a):**
- P6a exit criteria all met.
- `13_FINAL_AUDIT_SCORECARD.md` shows every local non-Sentry rubric item PASS with proof and real-surface artifact captured.
- README status flipped to "LOCAL NON-SENTRY ROLLOUT IMPLEMENTED" (NOT provider/prod "IMPLEMENTED" — provider/prod status requires P5b evidence or explicit owner waiver).

**Stop conditions for provider/prod IMPLEMENTED** (separate):
- Provider/prod proof captured after owner/provider authority for P5b, or the owner explicitly waives Sentry/prod proof.
- Any strict all-actions/all-routes migration passes only after a separate caller-contract review.
- Fresh independent review accepts the full provider/strict-migration scope.

## E. Pre-implementation revalidation checklist

Historical checklist for a fresh implementer starting from the original planning pack. On the current pilot branch, several rows are intentionally no longer true because P1/P3a/P4 have landed locally.

If implementer starts >7 days after 2026-06-28, revalidate:
- [ ] `package.json` still has no logger dep
- [ ] `next.config.ts` still has no `instrumentation`/`sentry` config
- [ ] `instrumentation.ts` still does not exist at root
- [ ] `src/lib/observability/` still does not exist
- [ ] `src/app/global-error.tsx` still does not exist
- [ ] `src/components/ui/toast.tsx` API still matches
- [ ] `src/lib/perf/server-timing.ts` AsyncLocalStorage still uses `requestId` + `scope`
- [ ] `src/lib/component-library/action-errors.ts` still has `throwActionError`
- [ ] `src/lib/auth/error-mapping.ts` still maps auth codes
- [ ] No new error-handling-related dep on main
- [ ] Sentry free tier still adequate for current scale
- [ ] Next.js 16 `instrumentation.ts` `onRequestError` API unchanged (check `node_modules/next/dist/docs/`)

If any check fails, update this plan before implementing.
