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

## 2. Proof-contract matrix (mandated format, per Improve-Plan-Prompt §11)

`Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`

| Proof ID | Req IDs | Impl unit | Layer | Fixture/input | Assertion | File target | Command | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-01 | FR-CONT-01, DOC-CONT-01 | WP-0.1 | static | none | CTA/intent contract present + matches `rg "intent="` | `06` §3; `contact-mailto.ts` | review + `rg "intent=" src/components/landing*` | n/a (doc) | skip if OPEN-CONT-01 unresolved |
| PROOF-02 | FR-CONT-02 | WP-0.2 | RTL | render `ArchestimatorLandingPage`/`ClosedBetaGate` | logged-out PrimaryCta href + gate action match contract | `tests/vitest/landing-cta-continuity.test.tsx` | `bunx vitest run <file>` | red before WP-0.2, green after | skip if OPEN-CONT-01 unresolved |
| PROOF-03 | FR-CONT-03, A11Y-CONT-01 | WP-1.1 | RTL | render 3 footers | all 5 links present + accessible name + focusable | `tests/vitest/public-trust-link-continuity.test.tsx` | `bunx vitest run <file>` | red before, green after | none |
| PROOF-04 | FR-CONT-04 | WP-2.1 | RTL/imports | import page metadata | `/terms`,`/privacy` export metadata + canonical | `tests/vitest/legal-page-metadata.test.ts` | `bunx vitest run <file>` | red before, green after | none |
| PROOF-05 | FR-CONT-05 | WP-2.3 | unit | none | `/security` in sitemap; PGP file exists OR ref removed | extend sitemap test | `bunx vitest run <file>` | red before, green after | T-2.3b skip if owner defers PGP |
| PROOF-06 | FR-CONT-06, A11Y-CONT-03 | WP-2.2 | RTL | render `/cookies` + banner | page renders single h1+main; banner links to `/cookies` | `tests/vitest/cookies-page.test.tsx` | `bunx vitest run <file>` | red before, green after | skip if OPEN-CONT-03 unresolved |
| PROOF-07 | FR-CONT-07, A11Y-CONT-02 | WP-3.1 | RTL | render gate | Terms+Privacy links render; non-blocking | `tests/vitest/closed-beta-gate-legal-line.test.tsx` | `bunx vitest run <file>` | red before, green after | skip if OPEN-CONT-06 unresolved |
| PROOF-08 | FR-CONT-08, SEC-CONT-01, SEC-CONT-03 | WP-3.2 | server-action unit | mocked D1 (`security_rate_limit_events`+`account_security_events`) | happy stores audit; honeypot fail-closed (no audit); rate-limit uniform; dup uniform; invalid→`reason:'invalid'`; oversized rejected; **written `ip_hash` matches `/^hmac-sha256:[0-9a-f]+$/`** | `tests/vitest/beta-request-intake.test.ts` | `bunx vitest run <file>` | red before, green after | none — the ip_hash assertion is the denial test for the `21` A.3 CHECK defect |
| PROOF-09 | FR-CONT-09, REL-CONT-01, SEC-CONT-02 | WP-4.1 | unit (mocked email) | mocked `sendCloudflareEmail` + D1 | once-only (fire twice→1 send); skip when `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false`; entry succeeds on send failure; email body contains no token | `tests/vitest/welcome-email.test.ts` | `bunx vitest run <file>` | red before, green after | skip if OPEN-CONT-04 unresolved |
| PROOF-10 | FR-CONT-10 | WP-5.1 | RTL | fixture projectCount 0 and ≥1 | CTA present@0; absent@≥1; focusable + named | `tests/vitest/first-project-empty-state.test.tsx` | `bunx vitest run <file>` | red before, green after | none |
| PROOF-11 | FR-CONT-11 | WP-5.2 | route unit | mock project count | empty→`/workshop/projects`; non-empty→`/workshop` | `tests/vitest/workshop-onboarding-redirect.test.ts` | `bunx vitest run <file>` | red before, green after | none |
| PROOF-12 | UX-CONT-01, ARCH-CONT-02, TEST-CONT-01 | WP-6.1 | composed | mocked allowlist grant + mocked auth | full path: `/`→CTA→gate→receipt→(grant)→`/login`→`/workshop`→terms→dashboard; 3 post-auth branches asserted | `tests/vitest/continuity-contract.test.tsx` | `bunx vitest run <file>` | red before, green after | none |
| PROOF-13 | A11Y-CONT-01/02/03 | WP-1.1/2.2/3.1 | RTL keyboard | render components + simulate Tab/Enter | keyboard-reachable; focus→receipt heading on submit; live-region announces; single h1/main | folded into PROOF-03/06/07 + a dedicated focus test | `bunx vitest run <files>` | red before, green after | none |
| PROOF-14 | PERF-CONT | WP-6.2 | Playwright | `/`,`/login`,`/workshop` (auth fixture) | LCP≤2.5s p75; TTFB≤600ms; redirect count ≤ baseline | extend `e2e/landing-audit.spec.ts` or `e2e/continuity-transition.spec.ts` | `bunx playwright test <file>` | green = within budget; 3 runs median | skip in CI if Playwright unavailable locally; hosted RUM is a rollout gate (not this proof) |
| PROOF-15 | DOC-CONT-02 | — | RTL (existing) | none | overclaim tests still green | `landing-company-proof.test.ts`,`trust-page-overclaims.test.ts` | `bunx vitest run <files>` | must stay green | none |

**Red/green strategy:** all new proofs (PROOF-01..13) are written *red* against the current codebase (the feature isn't implemented) and turn *green* as the corresponding WP lands — standard TDD. PROOF-15 is a regression guard (must stay green throughout).

## 2a. Known-red broad-validation ledger (per Improve-Plan-Prompt §10/§11)

Record of broad validation commands and their current posture, so the implementer does not assume a green broad gate without evidence.

| Command | Current posture | Date/source | Failure class (if red) | Narrower proof that replaces it for this plan |
|---|---|---|---|---|
| `bun run type-check` | **unknown at planning time** (not run — planning-only) | 2026-07-08, planning | n/a | implementer must run before merge; the plan adds no type-breaking change (no new bindings/types) |
| `bun run lint` | unknown at planning time | 2026-07-08, planning | n/a | implementer must run; targeted ESLint on touched files is the narrower gate |
| `bun run test` (`bun test tests/unit`) | unknown at planning time | 2026-07-08, planning | n/a | the focused `bunx vitest run <file>` per PROOF row is the narrower gate |
| `bun run validate` | **known to be heavy** (chains type-check+lint+design-lint+test+test:dom) | `package.json:98` | potentially slow/flaky on shared worktree | do NOT use as the per-change gate; use the per-PROOF focused commands + `type-check`+`lint` |
| `bunx playwright test` | Playwright suite state unknown at planning time; GitHub Actions disabled (`.github/workflows-disabled/`) | `13` §8 | e2e may be red/flaky independent of this plan | PROOF-14 is the only Playwright proof this plan requires; run it targeted |
| GitHub Actions CI | **disabled** (workflows in `.github/workflows-disabled/`) | `13` §8; fast-path state | CI does not run | local gates (type-check/lint/focused vitest) are authoritative until restored |

**Honest statement:** no broad command was run during this planning task (planning-only). The implementer must establish the green baseline on their branch before adding the new tests, and must not claim a "green validate" without running it and reading the output.

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
