# 12 — Test and Validation Strategy

Proportional proof: static/RTL/unit for most requirements; Playwright only for the browser-only perf/transition claims. No browser proof for mere link/copy presence.

## 1. Test layers mapped to stack

| Layer | Tool | Used for |
|---|---|---|
| Static / structural | RTL + axe-style assertions | footer links, legal-line, receipt, CTA presence, metadata, single-`<h1>` |
| Server-action unit | vitest (mocked D1) | `requestBetaAccess` happy/honeypot/rate-limit/duplicate/invalid/oversized |
| Email trigger unit | vitest (mocked `sendCloudflareEmail`) | welcome email idempotency, skip-when-disabled, no-block-on-failure, no-token |
| Route redirect | vitest (render route) | `/workshop/onboarding` branches |
| Continuity contract | vitest (composed) | full user-visible path with mocked grant |
| Perf evaluator | Playwright | `/` LCP/TTFB, `/workshop` bounce redirect count, `/login` TTFB |
| Regression guards | existing vitest | overclaim, v3 CTA contract, trust-page posture, public-static-route-contract |

## 2. Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-CONT-01 | `06` §3 (doc) + `contact-mailto.ts` comment | static | new (doc) | none | review | contract present | none | implementer |
| FR-CONT-02 | `tests/vitest/landing-cta-continuity.test.tsx` | RTL | new | render `ArchestimatorLandingPage`/`ClosedBetaGate` | `bunx vitest run <file>` | CTA hrefs match contract | none | implementer |
| FR-CONT-03 | `tests/vitest/public-trust-link-continuity.test.tsx` | RTL | new | render 3 footers | `bunx vitest run <file>` | all links present + named | none | implementer |
| FR-CONT-04 | `tests/vitest/legal-page-metadata.test.ts` (or extend `public-static-route-contract.test.ts`) | RTL/imports | new | import page metadata | `bunx vitest run <file>` | metadata + canonical present | none | implementer |
| FR-CONT-05 | extend `tests/vitest/...sitemap...` + file-existence | unit | new | none | `bunx vitest run <file>` | `/security` in sitemap; PGP resolved | none | implementer |
| FR-CONT-06 | `tests/vitest/cookies-page.test.tsx` | RTL | new | render `/cookies` + banner | `bunx vitest run <file>` | page renders, banner links | none | implementer |
| FR-CONT-07 | `tests/vitest/closed-beta-gate-legal-line.test.tsx` (or fold into intake test) | RTL | new | render gate | `bunx vitest run <file>` | Terms+Privacy links render | none | implementer |
| FR-CONT-08 | `tests/vitest/beta-request-intake.test.ts` | server-action unit | new | mocked D1 | `bunx vitest run <file>` | happy/honeypot/rate-limit/dup/invalid/oversized | none | implementer |
| FR-CONT-09 | `tests/vitest/welcome-email.test.ts` | unit (mocked email) | new | mocked send + D1 | `bunx vitest run <file>` | once-only/skip-disabled/no-block/no-token | none | implementer |
| FR-CONT-10 | `tests/vitest/first-project-empty-state.test.tsx` | RTL | new | fixture 0/≥1 projects | `bunx vitest run <file>` | CTA present@0, absent@≥1 | none | implementer |
| FR-CONT-11 | `tests/vitest/workshop-onboarding-redirect.test.ts` | route unit | new | mock project count | `bunx vitest run <file>` | empty→projects, non-empty→workshop | none | implementer |
| FR-CONT-12 | static + owner confirmation | static | n/a | none | review | marker cleared | none | owner |
| UX-CONT-01 | `tests/vitest/continuity-contract.test.tsx` | composed | new | mocked grant | `bunx vitest run <file>` | 3 post-auth branches | none | implementer |
| A11Y-CONT-01/02/03 | RTL keyboard + structural (axe via `@axe-core/playwright` if available, else RTL assertions) | RTL | new | render components | `bunx vitest run <file>` | focusable, named, single h1 | none | implementer |
| ARCH-CONT-02 | `tests/vitest/continuity-contract.test.tsx` + static review | composed + static | new | none | review + vitest | ordering preserved | none | implementer |
| SEC-CONT-01 | `tests/vitest/beta-request-intake.test.ts` | unit | new | mocked D1 | `bunx vitest run <file>` | honeypot/rate-limit/audit | none | implementer |
| SEC-CONT-03 | `tests/vitest/beta-request-intake.test.ts` | unit | new | dup + already-on-allowlist fixture | `bunx vitest run <file>` | uniform receipt | none | implementer |
| REL-CONT-01 | `tests/vitest/welcome-email.test.ts` | unit | new | mocked failing send | `bunx vitest run <file>` | entry succeeds on send failure | none | implementer |
| TEST-CONT-01 | `tests/vitest/continuity-contract.test.tsx` | composed | new | mocked grant | `bunx vitest run <file>` | full path | none | implementer |
| PERF-CONT | `e2e/landing-audit.spec.ts` (extend) or `e2e/continuity-transition.spec.ts` | Playwright | new/extend | none | `bunx playwright test <file>` | LCP/TTFB/redirect-count within budget | none | implementer |
| DOC-CONT-02 | existing `landing-company-proof.test.ts`, `trust-page-overclaims.test.ts` | RTL | existing | none | `bunx vitest run <files>` | still green | none | implementer |

No known pre-existing reds in these surfaces (re-verify at execution; `public-static-route-contract.test.ts` must be extended for `/cookies`).

## 3. Adversarial scenario matrix (UltraQA-style)

Planner-side matrix (the dynamic QA execution itself belongs to future implementation; recorded per §4A of the planning directive). For this docs-only planning task, dynamic adversarial QA is **not applicable to the planning task itself** (no runtime), but the matrix below specifies what future implementation must prove.

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status |
|---|---|---|---|---|---|---|
| ADV-01 | abuser | flood `requestBetaAccess` from one IP | 11 rapid submits | vitest mock | rate-limit kicks in at 10/hr IP | specified |
| ADV-02 | abuser | flood from one email | 5 rapid submits same email | vitest mock | rate-limit at 3/hr email | specified |
| ADV-03 | abuser | honeypot filled | `company_url` non-empty | vitest mock | silent fail-closed, no audit row | specified |
| ADV-04 | enumerator | receipt difference for already-on-allowlist email | submit an `active` email | vitest mock | uniform receipt (no reveal) | specified |
| ADV-05 | enumerator | receipt difference for `revoked` email | submit a `revoked` email | vitest mock | uniform receipt | specified |
| ADV-06 | abuser | oversized payload (email 10KB, name 10KB) | submit huge fields | vitest mock | length-cap rejects | specified |
| ADV-07 | abuser | direct POST to action (no UI) | curl/POST bypassing form | manual/vitest | action self-validates (honeypot empty-required → invalid) | specified |
| ADV-08 | abuser | XSS via name/company in admin queue | render in `/workshop/settings/users` | RTL render as text | no HTML execution | specified |
| ADV-09 | user | magic-link replay | reuse consumed magic link | existing Better Auth guard | rejected | existing |
| ADV-10 | collaborator | invite token replay | reuse used token | existing unique-token guard | `collaboration_invite_replay_blocked` | existing |
| ADV-11 | user | double welcome-email on concurrent first-entry | two parallel triggers | vitest concurrency | one send (idempotency check-then-insert; rare dup tolerated) | specified |
| ADV-12 | user | email delivery down at first entry | `EMAIL_BINDING_MISSING` | vitest mock | entry succeeds, skip logged | specified |
| ADV-13 | user | `/cookies` missing consent cookie | fresh client | RTL | banner renders, choice persists | specified |
| ADV-14 | abuser | state_mismatch OAuth replay | replay state | existing proxy guard | Clear-Site-Data, clean login | existing |
| ADV-15 | user | `/workshop/onboarding` deep-link with 0 projects | direct nav | vitest | → `/workshop/projects` | specified |
| ADV-16 | user | footer link 404 | click each footer link | Playwright | none 404 | specified |
| ADV-17 | user | `/terms`/`/privacy` share without metadata | social scraper | metadata test | OG/title present | specified |
| ADV-18 | abuser | prompt injection via name/company (no AI surface) | submit injection text | n/a | n/a (no AI consumer) — recorded as not-applicable-with-reason | n/a |

## 4. Performance evaluator contract
See `09` §2. Declared evaluator = Playwright (`landing-audit.spec.ts` extend + redirect-count assertion). Production RUM = external rollout gate.

## 5. Manual QA procedure (only where automation cannot prove the claim)
- **Hosted smoke (rollout gate):** against `archestimator.com` — full path `/` → "Book a walkthrough" → `/contact`; `/signup` → ClosedBetaGate → submit → receipt; owner grants allowlist → `/login` → magic-link → `/workshop/terms` → accept → dashboard CTA → `/workshop/projects`. Actor: QA/owner. Pass = each step renders, no dead-end, no console error.
- **Email deliverability (Phase 4):** send welcome email to a real inbox; confirm receipt + non-spam. Owner-gated.

## 6. Coverage gaps / intentional skips
- Storybook/visual QA: skipped (no visual-redesign claim; `05` §8).
- Production RUM: external (sibling pack).
- Dynamic adversarial execution at planning time: not applicable (docs-only); matrix specifies future implementation QA.
