# 12 — Test And Validation Strategy

## Proof Strategy

Every requirement maps to a falsifiable acceptance criterion with a named
evidence class. The strategy uses the narrowest proof that covers the claim.

| Claim type | Evidence class | When to use |
|---|---|---|
| Security/rate-limit/authz | Automated test (Vitest) | All SEC-* requirements |
| Data/query correctness | Automated test + local D1 | DATA-*, PERF-* |
| Component behavior | Automated test (jsdom/RTL) | State logic, rendering conditions |
| UX/interaction/layout | Browser proof (Playwright/manual) | All UX-* and REQ-* with interaction |
| Terminology/copy | Static review (grep) | REQ-004 |
| Performance | Local D1 evaluator | PERF-* |

## Test Inventory

### Security tests (SEC-*)

| Test ID | Requirement | Scenario | Expected signal |
|---|---|---|---|
| TEST-SEC-001 | SEC-001 | POST comment with 100KB body | 413 |
| TEST-SEC-002 | SEC-001 | POST password with 10KB body | 413 |
| TEST-SEC-003 | SEC-001 | POST decision with 10KB body | 413 |
| TEST-SEC-004 | SEC-002 | GET comments, password required, no cookie | 423 (not 401) |
| TEST-SEC-005 | SEC-002 | GET decision, password required, no cookie | 423 (not 401) |
| TEST-SEC-006 | SEC-003 | 5 consecutive 500s on decision POST | 503 + Retry-After: 120 |
| TEST-SEC-007 | SEC-004 | Comment list > 50 items | Returns cursor + hasMore |
| TEST-SEC-008 | SEC-004 | Fetch page 2 via cursor | Returns next set |
| TEST-SEC-009 | SEC-005 | Two concurrent snapshot sanitizations | No ID corruption |
| TEST-SEC-010 | SEC-006 | Missing production secret at module init | Throws (not deferred) |
| TEST-SEC-011 | SEC-007 | Grep for events route consumers | Zero (removed) |
| TEST-SEC-012 | SEC-007 | Grep for `download_attempt_blocked` emitters | Zero (removed) or wired |

### Data tests (DATA-*)

| Test ID | Requirement | Scenario | Expected signal |
|---|---|---|---|
| TEST-DATA-001 | DATA-001 | Migration 0050 applies cleanly | No error |
| TEST-DATA-002 | DATA-001 | Delete project → cascade deletes publications | Rows gone |
| TEST-DATA-003 | DATA-001 | Delete workspace → cascade to publications | Rows gone |
| TEST-DATA-004 | DATA-001 | Orphaned rows before migration | Identified + cleaned |
| TEST-DATA-005 | DATA-002 | Roster GROUP BY returns counts | ≤100 rows (not 1000) |
| TEST-DATA-006 | DATA-002 | Roster at 100 pubs | Wall time < 350ms |

### Component tests (UX/REQ)

| Test ID | Requirement | Scenario | Expected signal |
|---|---|---|---|
| TEST-UX-001 | REQ-001 | Click "Share" → wizard opens | Wizard visible |
| TEST-UX-002 | REQ-001 | Complete wizard → link generated | Success step visible |
| TEST-UX-003 | REQ-002 | Link displayed as selectable text | URL is selectable |
| TEST-UX-004 | REQ-003 | Click "Preview as client" → preview mode | Preview banner visible |
| TEST-UX-005 | REQ-005 | Publisher on 375px screen | Card layout renders |
| TEST-UX-006 | REQ-006 | 30 publications → pagination visible | Prev/next controls |
| TEST-UX-007 | REQ-007 | Type in search rapidly | One re-render per 300ms |
| TEST-UX-008 | UX-002 | Submit decision → header updates | Status badge changes |
| TEST-UX-009 | UX-005 | Click estimate row → review target set | Row highlighted, no button-per-row |
| TEST-UX-010 | UX-006 | Comment list renders dates | Date visible |
| TEST-UX-011 | UX-007 | Click "Download PDF" → print dialog | window.print called |
| TEST-UX-012 | UX-008 | Publication with expiry → recipient sees it | Expiry in summary |
| TEST-UX-013 | UX-009 | No cover image → placeholder | Non-null placeholder |
| TEST-UX-014 | UX-010 | Password gate has reveal toggle | Toggle works |
| TEST-UX-015 | UX-011 | Currency EUR → correct format | "€" or "EUR" consistent |
| TEST-UX-016 | UX-012 | Expired proposal in inbox | State + contact sender |
| TEST-UX-017 | UX-012 | One bad row in inbox | Other rows still render |

### Performance evaluator (PERF-*)

| Test ID | Requirement | Scenario | Expected signal |
|---|---|---|---|
| TEST-PERF-001 | PERF-002 | Roster query at 10 pubs | < 100ms |
| TEST-PERF-002 | PERF-002 | Roster query at 50 pubs | < 200ms |
| TEST-PERF-003 | PERF-002 | Roster query at 100 pubs | < 350ms |

## Adversarial QA Scenarios

| Scenario ID | Attack/failure | Assertion |
|---|---|---|
| QA-01 | Oversized POST body on every public route | 413 on all |
| QA-02 | CSRF token missing on comment POST | 403 |
| QA-03 | Expired token access | 404 |
| QA-04 | Revoked token access | 404 |
| QA-05 | Preview cookie forgery | Rejected |
| QA-06 | Preview mode comment submit | Disabled / intercepted |
| QA-07 | Duplicate decision | 409 |
| QA-08 | Stale snapshot comment | 409 |
| QA-09 | Non-recipient comment (no session) | 401 |
| QA-10 | Concurrent snapshot sanitization | No corruption |
| QA-11 | 5 consecutive decision 500s | 503 circuit open |
| QA-12 | Password brute force (6 attempts) | 429 + delay |
| QA-13 | Search spam (rapid typing) | Debounced (1 re-render/300ms) |
| QA-14 | Mobile publisher (375px) | Functional, no "needs width" |
| QA-15 | Comment cursor exhausts | hasMore: false at end |

## Test File Locations

```
tests/vitest/
  publisher-wizard.test.tsx              (wizard flow)
  publisher-roster-cards.test.tsx        (card layout + pagination)
  publisher-search-debounce.test.tsx     (debounce)
  share-page-header-status.test.tsx      (dynamic header)
  share-page-sticky-decision.test.tsx    (sticky CTA)
  share-page-row-actions.test.tsx        (row-click select)
  share-page-comments-dates.test.tsx     (comment dates + authors)
  share-page-print-button.test.tsx       (print button)
  share-page-currency.test.tsx           (currency formatting)
  share-page-preview-mode.test.tsx       (preview cookie)
  recipient-inbox-dead-end.test.tsx      (expired/revoked + skip bad rows)
  publication-body-size.test.ts          (SEC-001)
  publication-status-codes.test.ts       (SEC-002)
  publication-circuit-breaker.test.ts    (SEC-003)
  publication-comment-pagination.test.ts (SEC-004)
  publication-snapshot-reentrance.test.ts(SEC-005)
  publication-startup-secrets.test.ts    (SEC-006)
  publication-dead-code.test.ts          (SEC-007)

tests/vitest/perf/
  publisher-roster-evaluator.test.ts     (PERF-002)
```

### Existing tests to update (not new — these break when terminology/flow changes)

The following existing tests assert UI strings and route behavior the plan changes.
They must be updated as part of the relevant unit (UNIT-010 for terminology,
UNIT-011 for wizard flow, UNIT-018 for comment pagination):

- `e2e/shared-link-receiver.spec.ts` — asserts `"Generate shared link"`,
  `"Accept Estimates"`, `"Post comment"` buttons; update to new labels.
- `tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx` — decision
  copy contract; update if decision verbs change (UX-004).
- `tests/vitest/share/share-page-get-routes-contract.test.ts` — route contract;
  update if response shapes change (SEC-004 pagination adds optional fields).
- `tests/vitest/recipient-proposals-route-gate.test.ts` — auth-before-list; must
  still pass after UNIT-021 changes.

Each unit that changes a user-facing string or API contract must grep for existing
test references to that string/contract and update them in the same diff.

## Verification Commands

```bash
# Type check
bun run type-check

# Lint
bun run lint

# Focused tests (publication + share + publisher)
bun test tests/vitest/publication-*.test.ts
bun test tests/vitest/share-*.test.ts
bun test tests/vitest/publisher-*.test.ts

# Full suite (shared logic / release work)
bun run validate

# Plan pack validation
bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Publisher-And-Shared-Pages
```

## Existing Tests To Preserve

- `tests/vitest/recipient-proposals-route-gate.test.ts` — auth-before-list ordering.
  Must still pass after inbox repository changes.
- Any existing publication/security tests — run before and after changes.

## Browser Proof Plan

For UX requirements, browser verification (Playwright or manual) covers:

1. **Publisher wizard flow:** Open publisher → click Share → complete wizard →
   verify link generated and copyable.
2. **Preview mode:** Click Preview → verify share page renders with preview banner.
3. **Mobile publisher:** Resize to 375px → verify card layout, copy link works.
4. **Shared link decision:** Open share link → verify sticky CTA, submit decision,
   verify header updates.
5. **Estimate table:** Click row → verify review target, verify no button-per-row.
6. **Comments:** Verify dates, author badges, page scroll (not nested).
7. **Download PDF:** Click button → verify print dialog opens.
8. **Currency:** Verify non-PHP currency formats correctly.

Browser proof is **opt-in evidence** per AGENTS.md — only for claims that static/
DOM tests cannot prove (real interaction, layout, responsive behavior).
