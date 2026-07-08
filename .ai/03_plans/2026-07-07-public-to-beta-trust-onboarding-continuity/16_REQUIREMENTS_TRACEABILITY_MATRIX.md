# 16 — Requirements Traceability Matrix

Every requirement traces end-to-end with the mandated columns (per Improve-Plan-Prompt §2): `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`.

**Source strength vocabulary:** `brief` (from PROMPT.md), `repo evidence` (verified against current source), `derived` (inferred from repo behavior/structure to satisfy a brief intent), `assumption` (unverified), `owner-delegated` (planning decision made under owner-delegated authority). Inferred requirements are labeled `derived` so they are not presented as direct source facts.

**Status:** all `pending` (this is a plan) unless `blocked-external` or `deferred`.

| Requirement ID | Source evidence | Source strength | Plan section / Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|
| FR-CONT-01 | PROMPT.md "beta CTA" + repo `landing-content.ts`/`contact-mailto.ts` | brief + repo evidence | `06` §3 / T-0.1 | AC-FR-01a/b | doc review + `rg "intent="` cross-check | drift | pending | OPEN-CONT-01 (recommended option recorded) |
| FR-CONT-02 | brief + G1 (divergent CTAs in `landing-v3` vs `landing-new`/`LandingCTAs`) | repo evidence | `11` WP-0.2 / T-0.2 | AC-FR-02a/b | `landing-cta-continuity.test.tsx` | drift | blocked-external | OPEN-CONT-01 |
| FR-CONT-03 | PROMPT.md "terms/privacy/support links" + G2 (inconsistent footers) | brief + repo evidence | `11` WP-1.1 / T-1.1a-c | AC-FR-03a/b | `public-trust-link-continuity.test.tsx` | a11y/contrast (RISK-02) | blocked-external | OPEN-CONT-02 (footer set) |
| FR-CONT-04 | G3 (`/terms`,`/privacy` have no metadata export) | repo evidence | `11` WP-2.1 / T-2.1a,b | AC-FR-04a-c | `legal-page-metadata.test.ts` | none | pending | none |
| FR-CONT-05 | G4 (`/security` not in sitemap; PGP key referenced but absent) | repo evidence | `11` WP-2.3 / T-2.3a,b | AC-FR-05a/b | sitemap + file test | RISK-10 (PGP liability) | pending (T-2.3b owner-gated) | OPEN: PGP publication |
| FR-CONT-06 | G5 (consent banner exists, no policy page) | repo evidence | `11` WP-2.2 / T-2.2a-c | AC-FR-06a-c | `cookies-page.test.tsx` | none | blocked-external | OPEN-CONT-03 |
| FR-CONT-07 | PROMPT.md "expectation-setting copy" + G6 (gate has no legal link) | brief + repo evidence | `11` WP-3.1 / T-3.1 | AC-FR-07a-c | `closed-beta-gate-legal-line.test.tsx` | none | blocked-external | OPEN-CONT-06 |
| FR-CONT-08 | G7 (mailto is silent) + security gap | repo evidence + derived | `11` WP-3.2 / T-3.2a-c; `07` §3; `21` A | AC-FR-08a-c | `beta-request-intake.test.ts` (+ ip_hash-format denial) | RISK-03/04 (abuse/enumeration) | pending | none (transport DEC-CONT-08) |
| FR-CONT-09 | G8 (no welcome email; delivery OFF) | repo evidence | `11` WP-4.1 / T-4.1a-c; `07` §4; `21` B | AC-FR-09a-c | `welcome-email.test.ts` | RISK-05/06 (double-fire/delivery) | blocked-external | OPEN-CONT-04 + delivery config |
| FR-CONT-10 | PROMPT.md "first workflow handoff" + G9 | brief + repo evidence | `11` WP-5.1 / T-5.1 | AC-FR-10a-c | `first-project-empty-state.test.tsx` | RISK-09 | pending | none |
| FR-CONT-11 | G9 (onboarding redirect→settings, not workflow) | repo evidence | `11` WP-5.2 / T-5.2 | AC-FR-11a/b | `workshop-onboarding-redirect.test.ts` | RISK-09 | pending | none |
| FR-CONT-12 | G12 (`LANDING_SITE_ORIGIN` gated) | repo evidence | `11` WP-0.3 / T-0.3 | marker cleared | owner confirmation | RISK-15 | blocked-external | OPEN-CONT-05 |
| UX-CONT-01 | coherent post-auth landing (`/workshop`/`/workshop/pending-invite`/`/workshop/terms`) | **derived** (repo behavior; brief does not name these branches) | `11` WP-6.1 / T-6.1 | 3 branches asserted | `continuity-contract.test.tsx` | none | pending | labeled derived (not a brief-level fact) |
| A11Y-CONT-01 | a11y gate (WCAG AA) | derived | `05` §3 / T-1.1* | focusable + named | RTL a11y | RISK-02 | pending | none |
| A11Y-CONT-02 | a11y gate | derived | `05` §2a/§3 / T-2.2,T-3.1 | keyboard + names + live-region | RTL keyboard | none | pending | none |
| A11Y-CONT-03 | a11y gate | derived | `05` §3 / T-2.2 | single h1 + main landmark | structural RTL/axe | none | pending | none |
| ARCH-CONT-01 | no arch change for core | derived (from `21` no-migration finding) | `21` summary | `21` confirms + static review | static review (see note) | none | pending | AC's "static review" half is not an objective gate — reclassified as evidence in `22` verification matrix |
| ARCH-CONT-02 | trust ordering preserved (proxy→layout→session) | repo evidence + derived | `06` §1 / T-6.1 | ordering unchanged (objective: continuity test asserts the 3 post-auth branches) | `continuity-contract.test.tsx` | none | pending | "static review" removed from AC; replaced with objective test |
| SEC-CONT-01 | `requestBetaAccess` hardened | derived (security gate) | `08` §5 / T-3.2* | honeypot/limit/audit + ip_hash-format | `beta-request-intake.test.ts` | RISK-03/04 | pending | none |
| SEC-CONT-02 | no new credential exposure | derived | `20` / T-4.1* | no tokens in email | `welcome-email.test.ts` | none | pending | none |
| SEC-CONT-03 | non-enumerable receipt | derived (security gate) | `08` §5 / T-3.2* | uniform receipt | `beta-request-intake.test.ts` (dup + already-on-allowlist) | RISK-04 | pending | none |
| REL-CONT-01 | email failure non-blocking | derived (reliability gate) | `11` WP-4.1 / T-4.1* | entry succeeds on send fail | `welcome-email.test.ts` | RISK-06 | pending | none |
| OPS-CONT-01 | rollout gates defined | derived (ops gate) | `13` / T-6.3 | gates documented | review + L2 smoke | none | pending | none |
| TEST-CONT-01 | continuity contract test | derived | `11` WP-6.1 / T-6.1 | full path | `continuity-contract.test.tsx` | none | pending | none |
| TEST-CONT-02 | per-req coverage | derived | `12` §2 | no untraced req | matrix audit (`22`) | none | pending | none |
| DOC-CONT-01 | contract documented | brief ("map") | `06` §3 / T-0.1 | docs exist | review | none | pending | none |
| DOC-CONT-02 | no overclaims | brief ("protect trust") + repo (`claims-ledger`) | brief + repo evidence | overclaim tests green | `landing-company-proof.test.ts`,`trust-page-overclaims.test.ts` | RISK-07 | pending | none |

## Performance-sensitive requirements (additional perf trace)

| Requirement | Baseline | Target | Measurement | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-CONT | `/` LCP/TTFB, `/login` TTFB, `/workshop` bounce redirect count (local Playwright baseline) | ≤ budgets in `09` §2; no new redirect hop | Playwright `landing-audit.spec.ts` (extend) + redirect-count | +15% LCP/TTFB or +1 redirect hop | revert Phase 5 / investigate |
| `requestBetaAccess` latency | none (new surface) | p50 <300ms (≤5 D1 statements) | unit test (mocked D1) + hosted smoke at L2 | p95 >600ms at L2 → investigate | revert Phase 3 (mailto fallback is a no-op — see `13` §3 note) |

No requirement is untraced. Every implementation task maps back to ≥1 requirement. Every requirement maps to acceptance + test + rollout + (now) source-strength + gap/decision.

## Note on objective-AC cleanup
During the Improve-Plan cycle, two ACs that relied on "static review" (ARCH-CONT-01, ARCH-CONT-02) were re-examined. ARCH-CONT-02's AC is now objective (the continuity test asserts the 3 post-auth branches). ARCH-CONT-01's "static review" is retained as *supporting evidence* in the verification matrix (`22`), not as the sole acceptance gate — its real proof is `21`'s no-migration finding + the unchanged proxy/layout/session files.
