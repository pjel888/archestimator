# 16 — Requirements Traceability Matrix

Every requirement traces end-to-end. `Status:` all `pending` (this is a plan, not an implementation) unless `blocked-external` or `deferred`.

| Requirement ID | Source | User outcome | Implementation phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-CONT-01 | brief ("beta CTA") + repo | canonical CTA vocabulary | Phase 0 | T-0.1 | `06` §3; `contact-mailto.ts`; `landing-content.ts` | AC-FR-01a/b | doc review | L1 review | pending |
| FR-CONT-02 | brief + G1 | CTA drift locked | Phase 0 | T-0.2 | new test `landing-cta-continuity.test.tsx` | AC-FR-02a/b | that test | L1 | blocked-external (OPEN-CONT-01) |
| FR-CONT-03 | brief ("terms/privacy/support links") + G2 | unified footer | Phase 1 | T-1.1a/b/c | 3 footer components | AC-FR-03a/b | `public-trust-link-continuity.test.tsx` | L1 + L2 footer smoke | blocked-external (OPEN-CONT-02) |
| FR-CONT-04 | G3 | legal pages have metadata | Phase 2 | T-2.1a/b | `terms/page.tsx`,`privacy/page.tsx` | AC-FR-04a/b/c | `legal-page-metadata.test.ts` | L1 | pending |
| FR-CONT-05 | G4 | `/security` sitemap; PGP resolved | Phase 2 | T-2.3a/b | `sitemap.ts`; `public/.well-known/` | AC-FR-05a/b | sitemap + file test | L1 | pending (PGP owner-gated) |
| FR-CONT-06 | G5 | cookie policy page | Phase 2 | T-2.2a/b/c | new `cookies/page.tsx`; banner; sitemap; robots | AC-FR-06a/b/c | `cookies-page.test.tsx` | L1 + L2 | blocked-external (OPEN-CONT-03) |
| FR-CONT-07 | brief ("expectation-setting copy") + G6 | legal pre-link on gate | Phase 3 | T-3.1 | `ClosedBetaGate.tsx` | AC-FR-07a/b/c | `closed-beta-gate-legal-line.test.tsx` | L1 | blocked-external (OPEN-CONT-06) |
| FR-CONT-08 | G7 + security | beta-request receipt + audit | Phase 3 | T-3.2a/b/c | new `beta-request-actions.ts`; `closed-beta-d1-store.ts`; `ClosedBetaGate.tsx` | AC-FR-08a/b/c | `beta-request-intake.test.ts` | L1 + L2 receipt smoke | pending |
| FR-CONT-09 | G8 | welcome email | Phase 4 | T-4.1a/b/c | new `welcome-email.ts`; `account-actions.ts` | AC-FR-09a/b/c | `welcome-email.test.ts` | L3 deliverability | blocked-external (OPEN-CONT-04) |
| FR-CONT-10 | brief ("first workflow handoff") + G9 | dashboard first-project CTA | Phase 5 | T-5.1 | `WorkshopDashboard.tsx`/`WorkshopHomebaseClient.tsx` | AC-FR-10a/b/c | `first-project-empty-state.test.tsx` | L1 + L2 | pending |
| FR-CONT-11 | G9 | onboarding redirect target | Phase 5 | T-5.2 | `workshop/onboarding/page.tsx` | AC-FR-11a/b | `workshop-onboarding-redirect.test.ts` | L1 | pending |
| FR-CONT-12 | G12 | production domain confirmed | Phase 0 | T-0.3 | `seo-metadata.ts` | marker cleared | owner confirmation | L3 | blocked-external (OPEN-CONT-05) |
| UX-CONT-01 | brief ("reduce first-session confusion") | coherent post-auth landing | Phase 6 | T-6.1 | continuity test | 3 branches asserted | `continuity-contract.test.tsx` | L1 | pending |
| A11Y-CONT-01 | a11y gate | footer links a11y | Phase 1 | T-1.1* | footer components | focusable + named | RTL/axe | L1 | pending |
| A11Y-CONT-02 | a11y gate | banner + gate a11y | Phase 2/3 | T-2.2/T-3.1 | banner, gate | keyboard + names | RTL keyboard | L1 | pending |
| A11Y-CONT-03 | a11y gate | legal pages structure | Phase 2 | T-2.2 | legal pages | single h1, main | structural test | L1 | pending |
| ARCH-CONT-01 | arch gate | no arch change for core | — | — | (verification) | `21` confirms | static review | L1 | pending |
| ARCH-CONT-02 | arch gate | trust ordering preserved | Phase 6 | T-6.1 | proxy/layout/session (verification) | ordering unchanged | continuity test + static | L1 | pending |
| SEC-CONT-01 | security gate | `requestBetaAccess` hardened | Phase 3 | T-3.2* | action + store | honeypot/limit/audit | `beta-request-intake.test.ts` | L1 | pending |
| SEC-CONT-02 | security gate | no new credential exposure | Phase 4 | T-4.1* | welcome email | no tokens | `welcome-email.test.ts` | L1 | pending |
| SEC-CONT-03 | security gate | non-enumerable receipt | Phase 3 | T-3.2* | action | uniform receipt | `beta-request-intake.test.ts` | L1 | pending |
| REL-CONT-01 | reliability gate | email failure non-blocking | Phase 4 | T-4.1* | trigger | entry succeeds on fail | `welcome-email.test.ts` | L1 | pending |
| OPS-CONT-01 | ops gate | rollout gates defined | Phase 6 | T-6.3 | `13` | gates documented | review | L2/L3 | pending |
| TEST-CONT-01 | brief ("tests") | continuity contract test | Phase 6 | T-6.1 | new test | full path | that test | L1 | pending |
| TEST-CONT-02 | brief ("tests") | per-req coverage | — | — | matrix | no untraced req | matrix audit | L1 | pending |
| DOC-CONT-01 | brief ("map") | contract documented | Phase 0 | T-0.1 | `06`/comments | docs exist | review | L1 | pending |
| DOC-CONT-02 | brief ("protect trust") | no overclaims | — | — | copy | overclaim tests green | existing tests | L1 | pending |

## Performance-sensitive requirements (additional perf trace)

| Req | Baseline | Target | Measurement | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-CONT | `/` LCP/TTFB, `/login` TTFB, `/workshop` bounce redirect count (local Playwright baseline) | ≤ budgets in `09` §2; no new redirect hop | Playwright `landing-audit.spec.ts` (extend) | +15% LCP/TTFB or +1 redirect hop | revert Phase 5 / investigate |
| ARCH-CONT-01 | n/a (no arch change) | no perf delta | static | n/a | n/a |

No requirement is untraced. Every implementation task maps back to ≥1 requirement (see `11`). Every requirement maps to acceptance + test + rollout check.
