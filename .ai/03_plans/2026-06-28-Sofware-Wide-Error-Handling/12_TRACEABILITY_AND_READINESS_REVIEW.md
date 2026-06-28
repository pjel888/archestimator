# 12 — Traceability Matrix and Readiness Review

Maps every requirement to source evidence, work package, acceptance criterion, validation method, and final status.

## A. Requirement → Source → Work package → Test

| Req ID | Source evidence | WP | Test | Status |
|---|---|---|---|---|
| FR-001 | `01` Section E gaps 1, 2, 9, 10 | P1-WP1, P1-WP3 | `tests/vitest/app-error.test.ts`, `unwrap-supabase.test.ts` | specified |
| FR-002 | `01` Section B.1 | P2a-WP1 | `with-action-errors.test.ts` + pilot action regression | pilot specified; full migration conditional |
| FR-003 | `01` Section B.2 | P2a-WP2, 3 | `route-error.test.ts` + selected handler test | pilot specified; full migration conditional |
| FR-004 | `01` Section A.2 | P3a-WP1, 5 | DOM/static or `e2e/global-error.spec.ts` when browser claim is needed | pilot specified |
| FR-005 | `01` Section A.2 | P3a-WP1 | DOM/static or Playwright | pilot specified; root not-found follow-on |
| FR-006 | `03` Section C | P3a-WP3 | `toast-apperror.test.tsx` | specified |
| FR-007 | `01` Section B.7 | P2b follow-on after pilot | existing `auth-error-mapping.test.ts` | conditional |
| ARCH-001 | `DEC-ERR-001` | P1-WP1..9 | directory exists; type-check | specified |
| ARCH-002 | README | all phases | `git diff -- <off-limits>` empty | specified |
| LOG-001 | `02` Section C, `DEC-ERR-009` | P4-WP2, 3, 7 | `logger.test.ts` | pilot specified |
| LOG-002 | `06` Section B, `DEC-ERR-005` | P1-WP7 | `redact.test.ts` | specified |
| LOG-003 | `04` Section D | P4-WP4, 6 | `tests/unit/tail-dev-logs.test.ts` | specified |
| LOG-004 | `04` Section C | P4-WP1 | grep `logs/` in .gitignore | specified |
| OBS-001 | `02` Section A.3 | P5-WP6 | `instrumentation.test.ts` | owner/provider-gated |
| OBS-002 | `02` Section D, `DEC-ERR-004` | P5-WP1..5, 7, 9 | `sentry-redact.test.ts`; manual dashboard only after owner/provider authority | owner/provider-gated |
| OBS-003 | `02` Section E | deferred | n/a | deferred |
| SEC-001 | `06` Section B | P1-WP7 | `redact.test.ts` property test | specified |
| SEC-002 | `06` Section D, `DEC-ERR-011` | P5-WP1 + P6 probe | `e2e/source-map-leak.spec.ts` | specified |
| SEC-003 | `06` Section F | P3-WP4 | `client-error.test.ts` | specified |
| SEC-004 | `06` Section B.5 | P5-WP3, 4 | `sentry-redact.test.ts` | specified |
| UX-001 | `03` Section C | P1-WP8, P3-WP5 | `toast-apperror.test.tsx` | specified |
| UX-002 | existing API | preserved | existing tests | specified |
| A11Y-001 | existing API compliance | P3-WP8 | `toast-a11y.test.tsx` | specified |
| A11Y-002 | `05` Section A.5, A.6 | P3-WP1, 2 | Playwright focus assertion | specified |
| TEST-001 | `09` Section B | P1-WP10 | each test green | specified |
| TEST-002 | `09` Section B | P3-WP8, P5-WP8 | each test green | specified |
| TEST-003 | `09` Section C | P6-WP2 | each ADV row passes | specified |
| PERF-001 | `04` Section G | P1-WP11 | `logger-perf.test.ts` | specified |
| PERF-002 | `05` Section F | P5-WP9 | CI bundle-analyzer gate | specified |
| DOC-001 | repo convention | P6-WP5 | current-state.md entry | specified |
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
| 9. Middleware errors silent | covered via OBS-001 (Next.js server captures middleware errors) |
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
| Section 15 (final report) | `13` Section F + README "Stop condition" |

## D. Readiness review

**Verdict:** `CONDITIONALLY READY` (standard profile)

**Scope of readiness:**
- P1 foundation plus pilot vertical are traceable to source + WP + test.
- Full all-actions/all-routes migration remains conditional on pilot evidence and plan update.
- 11 ADRs documented with rejected alternatives.
- 17 risks logged with mitigations.
- All user-pointed framework sections addressed.
- Council-raised P0/P1 blockers resolved by narrowing readiness and adding owner/provider gates.
- No unresolved P0/P1 remains inside the approved P1+pilot scope. Provider/prod proof is explicitly gated for P5.

**Verification mode declaration:** `independent-council-improved`
- Original package was lead-authored and over-claimed readiness.
- Native feasibility, security/privacy, coherence, and adversarial document reviewers were used in this Codex improvement pass.
- Final verifier must confirm no unresolved P0/P1 remains before the planning task is complete.

**Conditions for `CONDITIONALLY READY` (met):**
- Every requirement has a stable ID, source evidence, WP, test.
- All ADRs have rationale + rejected alternatives.
- All protected contracts enumerated.
- All risks have mitigations.
- Phased pilot-first plan with exit criteria.
- Industry standards cited with URLs.
- Ponytail counterweight applied.

**Conditions for upgrade to `IMPLEMENTATION-READY`:**
- P1 foundation passes type-check, lint, and targeted tests.
- P2a/P3a/P4 pilot passes targeted and adversarial evidence.
- P5 owner/provider gate is resolved before external/prod proof.
- Fresh independent review accepts the full P2b/P3 broad migration plan.

**Residual risks:**
- `RISK-ERR-013` — plan drift between writing and implementation. Implementer must re-read.
- `RISK-ERR-014` — agent runtime may still be broken at implementation time. All implementation is direct (no agent delegation required).
- Runtime/browser/provider behavior remains unproven until P5/P6 evidence is captured; this is why the package is conditional rather than fully implementation-ready.

**Stop conditions for implementation:**
- P6 exit criteria all met.
- `13_FINAL_AUDIT_SCORECARD.md` shows every rubric item PASS with both RED→GREEN proof and real-surface artifact captured.
- README status flipped to "IMPLEMENTED".

## E. Pre-implementation revalidation checklist

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
