# 12 — Test and Validation Strategy

Choose the lightest proof that proves the claim. For V1, the changes are copy/component/routing-level with no new query, API, or migration — so the primary gate is focused vitest DOM tests + a bundle-size check. Receiver E2E is opt-in and skip-documented.

## Test layers in scope

| Layer | Engine | Command | In scope for V1? |
|---|---|---|---|
| Unit (domain) | `bun test` | `bun run test` | Only if repository mapping logic changes (it does not in V1) |
| DOM (components) | vitest + jsdom + RTL | `bun run test:dom` | **Primary gate** |
| Integration (route/action) | vitest | `bun run test:dom` | Terminal-state route test; open-action wrong-account branch |
| E2E (browser) | Playwright | `bun run test:e2e` | Opt-in; skip-documented (`ARCHESTIMATOR_E2E_SHARED_LINK`) |
| Type/lint | tsc + eslint | `bun run type-check`, `bun run lint` | Always |
| Build | Next.js | `bun run build` | Bundle-size + boundary check |

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-01 / FR-02 (share→inbox link) | `tests/vitest/share/share-page-session-banner-link.test.tsx` (new) | DOM | New | Render `SharePageSessionBanner` with `isValid:true` and `isValid:false` | `bun run test:dom` | Link present iff `isValid`; href `/workshop/proposals` | None | IA-P4 |
| FR-02 (decision→inbox refresh) | `tests/vitest/recipient-proposals-page.test.tsx` (extend) | DOM | Extend | Mock decision-then-navigate; assert chip after debounced refresh | `bun run test:dom` | Decision chip reflects latest within one refresh | None | IA-P6 |
| FR-03 (open action mint/no-mint) | `tests/vitest/recipient-proposals-action.test.ts` | Integration | Existing | 6 existing tests | `bun run test:dom` | Stays green | None | IA-P6 |
| FR-04 (empty-state fork) | `tests/vitest/recipient-proposals-page.test.tsx` (extend) | DOM | Extend | Render empty `RecipientProposalsResult` | `bun run test:dom` | Secondary "different email" line + sign-out link present; copy non-leaky | None | IA-P2 |
| FR-05 (credential-free listing) | `tests/vitest/recipient-proposals-repository.test.ts` | Unit | Existing | Mocked D1 rows | `bun run test:dom` | No credential columns; stays green | None | IA-P6 |
| FR-06 (wrong-account CTA) | `tests/vitest/recipient-proposals-page.test.tsx` (extend) | DOM | Extend | Row with `error:"not-a-recipient"` | `bun run test:dom` | CTA renders; no email in DOM; absent for `unavailable`/`invalid` | None | IA-P3 |
| FR-07 (decision chip states) | `tests/vitest/recipient-proposals-page.test.tsx` (extend) | DOM | Extend | Rows with accepted/declined/revision_requested | `bun run test:dom` | Correct chip per decision | None | IA-P6 |
| FR-08 (badge finality + contract) | `tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx` | DOM | Extend | Render locked badge | `bun run test:dom` | Badge says "Decision recorded"; dialog neutral | Existing test asserts dialog NOT final — reconcile | IA-P5 |
| FR-09 (expired copy) | `tests/vitest/share/share-terminal-states.test.tsx` (new) | Route/DOM | New | Mock resolver returning expired row | `bun run test:dom` | Expired copy ≠ unknown copy | None | IA-P1 |
| FR-10a (revoked copy) | `tests/vitest/share/share-terminal-states.test.tsx` (new) | Route/DOM | New | Mock resolver returning revoked row | `bun run test:dom` | Revoked copy ≠ unknown copy | None | IA-P1 |
| FR-10b (share error boundary) | `tests/vitest/share/share-error-boundary.test.tsx` (new) | DOM | New | Throw in child; render `error.tsx` | `bun run test:dom` | Recovery surface renders | None | IA-P1 |
| FR-10c (unknown generic) | `tests/vitest/share/share-terminal-states.test.tsx` (new) | Route/DOM | New | Mock resolver returning null | `bun run test:dom` | Generic "unavailable" copy | None | IA-P1 |
| FR-11/12 (immutability) | `tests/vitest/project-publication-decision.test.tsx` | DOM | Existing | 409 path | `bun run test:dom` | Reload+lock on 409 | None | IA-P6 |
| FR-13 (anonymous state) | `tests/vitest/share/share-page-decision-anonymous.test.tsx` | DOM | Existing | `isValid:false` | `bun run test:dom` | Read-only state | None | IA-P6 |
| FR-14 (notifications email-only) | static review | Static | New | Inspect `src/features/notifications/*` | n/a | No recipient-event wiring | None | IA-P6 |
| UX-02 (status chips) | `tests/vitest/recipient-proposals-page.test.tsx` (extend) | DOM | Extend | Row per status | `bun run test:dom` | Text label + aria per state | None | IA-P6 |
| UX-07 (loading skeletons) | static/existing | DOM | Existing | n/a | `bun run test:dom` | `role="status"` | None | IA-P6 |
| A11Y-01/02 (keyboard/focus) | `tests/vitest/recipient-proposals-page.test.tsx` (extend) | DOM | Extend | Tab/Enter on new CTAs | `bun run test:dom` | Keyboard-reachable; focus restored | None | IA-P3/P6 |
| A11Y-03 (SR semantics) | `tests/vitest/share/share-terminal-states.test.tsx` (new) | DOM | New | Terminal render | `bun run test:dom` | `<h1>` + `<p>`; chip `role` | None | IA-P1 |
| ARCH-01 (no new client boundary) | `bun run build` | Build | New | Build diff | `bun run build` | No new `"use client"` except route `error.tsx` | None | IA-P6 |
| SEC-04 (no email leak) | `tests/vitest/recipient-proposals-page.test.tsx` (extend) | DOM | Extend | `not-a-recipient` row | `bun run test:dom` | No email string in CTA DOM | None | IA-P3 |
| SEC-05 (anti-enumeration) | `tests/vitest/share/share-terminal-states.test.tsx` (new) | DOM | New | unknown vs expired vs revoked | `bun run test:dom` | unknown ≠ expired ≠ revoked copy | None | IA-P1 |
| SEC-06 (DTO shape) | `tests/vitest/recipient-proposals-repository.test.ts` (extend) | Unit | Extend | Row mapping | `bun run test:dom` | No owner/internal field | None | IA-P6 |
| TEST-E2E (receiver) | `e2e/shared-link-receiver.spec.ts` | E2E | Existing (skip) | Seed `tests/fixtures/shared-link.ts` + env | `ARCHESTIMATOR_E2E_SHARED_LINK=1 bun run test:e2e` | 5 cases (skip-documented) | Skipped without env/fixture | IA-P6-T2/T3 |

## Validation commands (verified against `package.json`)

- `bun run type-check` — TypeScript.
- `bun run lint` / `bun run lint:design-system` — ESLint + design lint.
- `bun run test:dom` — vitest (jsdom), `tests/vitest/**`, serial, 30s timeout. **Primary gate.**
- `bun run build` — Next.js build (bundle-size + boundary check).
- `bun run test:e2e` — Playwright (receiver spec skipped without env).

## Manual QA (only where browser-only behavior must be proven)

For V1, no browser-only claim is added that static/DOM tests cannot prove. The recovery CTAs, terminal states, and copy changes are all assertable via DOM tests. Browser/manual QA is therefore **intentionally skipped** under the repo's proportional verification policy, with the exception of:
- Optional E2E for the receiver fixture (DISCOVERY-REQUIRED, IA-P6-T3), only if the fixture is unblocked.

If an implementer adds interaction that changes routing/auth/data state beyond the above, they must add targeted browser proof for that specific claim.

## Adversarial scenario matrix (UltraQA-style, planning-level)

| ID | User/attacker model | Scenario | Setup | Harness | Expected signal | Status | Evidence |
|---|---|---|---|---|---|---|---|
| AQ-01 | Attacker with guessed token | Visits `/share/<garbage>` | mock resolver → null | vitest route test | Generic "unavailable" copy | planned | TEST (FR-10c) |
| AQ-02 | Attacker with expired token | Visits `/share/<expired>` | mock resolver → expired row | vitest route test | Expired copy; no metadata | planned | TEST (FR-09) |
| AQ-03 | Attacker with revoked token | Visits `/share/<revoked>` | mock resolver → revoked row | vitest route test | Revoked copy; no metadata | planned | TEST (FR-10a) |
| AQ-04 | Wrong-account recipient | Clicks Review on not-theirs row | mock action → `not-a-recipient` | vitest DOM test | CTA; no email leak | planned | TEST (FR-06/SEC-04) |
| AQ-05 | Double-decision | POSTs decision twice | mock 409 | existing vitest | Reload+lock | covered | project-publication-decision.test.tsx |
| AQ-06 | Snapshot-stale decide | POST with stale viewToken | mock 409 snapshot | existing vitest | "updated while deciding" | covered | project-publication-decision.test.tsx |
| AQ-07 | Anonymous attempt to decide | POST without P5 cookie | mock 401 | existing vitest | "Session expired" | covered | share-page-decision-anonymous.test.tsx |
| AQ-08 | Server error in share page | Throw in `page.tsx` | mock throw | vitest error-boundary test | `error.tsx` recovery | planned | TEST (FR-10b) |
| AQ-09 | Concurrent inbox refresh | Two focus events | mock query | existing vitest | In-flight guard; one refresh | covered | recipient-proposals-page.test.tsx |
| AQ-10 | Recipient with 50+ proposals | Listing truncation | mock 51 rows | vitest repo test | LIMIT 50 enforced | covered (existing) | recipient-proposals-repository.test.ts |

## Validation gaps and residual risk

- **Hosted/provider route-TTFB:** deferred to implementation; no local proof. Risk: low (no query change).
- **D1 EXPLAIN of listing query:** deferred; risk low (index-backed, LIMIT 50).
- **Receiver E2E:** skipped without fixture/env; risk: recovery states are DOM-covered, but no browser proof of the full email-link → session → decide → inbox round trip. Documented as DISCOVERY-REQUIRED (IA-P6-T3).
- **Email deliverability:** out of scope (delivery is OFF by default; owned by client-ready-proposal-workflow).
- **In-app notification dispatch:** out of scope (OPEN-IA-04).

## Maker/checker

- Phase 6 tests (IA-P6-T1) should be reviewed by a different lane/agent than the Phase 1–5 implementer where practical (maker/checker). If single-agent, label `verification_mode: emulated`.
