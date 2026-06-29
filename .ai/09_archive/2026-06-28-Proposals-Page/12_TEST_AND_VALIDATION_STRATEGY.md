# 12 — Test and Validation Strategy

Per `AGENTS.md` proportional verification, implementation should prefer focused proof for changed behavior. The repo-wide `bun run validate` is known red in unrelated areas per `.ai/10_state/current-state.md` FAST PATH; do not use that to hide failures in this feature.

## Proof contract matrix

| Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule |
|---|---|---|---|---|---|---|---|---|---|
| SQL-001 | DATA-001/SEC-001 | RPC migration | Provider SQL | linked project fixture user | functions exist, grants correct | migration | SQL readback | green required | cannot skip impl completion |
| SQL-002 | DATA-002/PERF-001 | email index | Provider SQL | 50-row fixture | index exists and used | migration | `EXPLAIN ANALYZE` | green required | cannot skip impl completion |
| SQL-003 | SEC-002/SEC-004 | credential denial | Provider SQL | authenticated non-manager | direct credential-column read denied | migration | SQL readback | green required | cannot skip impl completion |
| SQL-004 | FR-002 | cross-workspace match | Provider SQL | same email, 2 workspaces | both rows returned | migration | SQL readback | green required | cannot skip impl completion |
| SQL-005 | SEC-003 | cross-recipient isolation | Provider SQL | distinct email user | no rows/authorization | migration | SQL readback | green required | cannot skip impl completion |
| SQL-006 | FR-003 | status contract | Provider SQL | active/expired/revoked rows | only `published`, `expired`, `revoked` | migration | SQL readback | green required | cannot skip impl completion |
| UNIT-001 | TEST-002/ARCH-002 | repository | Unit/DOM | mocked RPC rows | maps DTO, omits credentials | `tests/vitest/recipient-proposals-repository.test.ts` | `bun run test:dom -- recipient-proposals-repository` | green | focused |
| UNIT-002 | UX-005/REL-002 | Server Function wrapper | Unit/DOM | mocked loader | client refresh calls wrapper, not repository | same | same | green | focused |
| DOM-001 | UX-001/002/003 | page states | DOM | loading/empty/error fixtures | correct states render | `tests/vitest/recipient-proposals-page.test.tsx` | `bun run test:dom -- recipient-proposals-page` | green | focused |
| DOM-002 | UX-004/A11Y-003 | statuses | DOM | new/opened/decision/expired/revoked | icon + label; disabled unavailable rows | same | same | green | focused |
| DOM-003 | A11Y-001/002 | accessibility | DOM | populated rows | keyboard path and accessible names | same | same | green | focused |
| DOM-004 | REL-002 | focus refresh | DOM fake timers | repeated focus events | one debounced refresh; stale rows remain on failure | same | same | green | focused |
| ACT-001 | FR-004/SEC-003 | Review action | Action test | authorized fixture | sets cookies and redirects to decrypted raw token | `tests/vitest/recipient-proposals-action.test.ts` | `bun run test:dom -- recipient-proposals-action` | green | focused |
| ACT-002 | SEC-002 | Review action leak check | Action test/static | happy path fixture | no `token_hash`, `encrypted_token`, `recipient_token_hash` returned/logged | same | test + `rg` | green | focused |
| ACT-003 | FR-004 | Review action negatives | Action test | invalid/missing/wrong/revoked/expired/decrypt fail | correct errors, no cookies | same | same | green | focused |
| SIDE-001 | FR-005 | sidebar | DOM | `MainSidebar` render | order/href/active/shortcuts | `tests/vitest/main-sidebar-proposals-item.test.tsx` | `bun run test:dom -- main-sidebar-proposals-item` | green | focused |
| BROW-001 | FR-001/004/SEC-002 | route + Review | Browser | authenticated recipient | list -> Review -> `/share/[raw-token]`; no credential leak | Playwright/manual smoke | screenshot/log/network notes | green required | cannot skip impl completion |
| BROW-002 | regression | anonymous share | Browser | anonymous valid token | existing `/share/[token]` works | Playwright/manual smoke | browser notes | green required | cannot skip impl completion |
| BUILD-001 | OPS-001/PERF-003 | whole change | Build/static | implementation branch | type/lint/design/build pass or known-red substitute | N/A | commands | green or documented unrelated red | skip only with excerpt + substitute |

## Test execution matrix

| Requirement | Test/proof | Command/evidence | Notes |
|---|---|---|---|
| FR-001 | route gate + browser | `recipient-proposals-route-gate`, BROW-001 | Auth redirect and signed-in render |
| FR-002 | provider SQL + repository | SQL-004, UNIT-001 | Mocked tests do not replace SQL proof |
| FR-003 | SQL status/order + DOM | SQL-006, DOM-002 | No fourth publication status |
| FR-004 | action + browser | ACT-001/002/003, BROW-001 | Raw token redirect and cookies |
| FR-005 | sidebar DOM | SIDE-001 | Includes `⌘4`/`⌘5` |
| UX/A11Y | page DOM | DOM-001/002/003/004 | State and a11y matrices |
| SEC | SQL/action/static/browser | SQL-003/005, ACT-002, BROW-001 | Credential leak proof |
| PERF | SQL/build/browser | SQL-002, BUILD-001, BROW-001 | Query and bundle budget |

## Provider SQL scenarios

Implementation must create or identify fixture data for:

1. Recipient A with two publications from two workspaces.
2. Recipient B with a distinct email.
3. Mixed-case recipient email.
4. Active, expired, and revoked publications.
5. A non-manager authenticated user trying direct reads.

Required assertions:

- `shared_link_recipients_lower_email_idx` exists.
- Direct read of `recipient_token_hash` is denied.
- List RPC return signature excludes `token_hash`, `encrypted_token`, `recipient_token_hash`.
- Authorization RPC returns only `publication_id` and `recipient_id`.
- Query plan uses the email index.

## Action scenarios

`recipient-proposals-action.test.ts` must cover:

- happy path with decrypted raw token redirect
- redirect target is not `token_hash`
- both session cookies are set
- invalid UUID
- missing `publicationId`
- unauthenticated invocation
- wrong recipient
- revoked publication
- expired publication
- missing publication
- decrypt failure
- duplicate rapid submissions
- no credential data in returned state/loggable error

## DOM/UI scenarios

`recipient-proposals-page.test.tsx` must cover:

- loading skeleton
- empty state with verified email
- error state and Try again
- stale rows preserved on refresh error
- populated rows from multiple workspaces
- New, Opened, Decision submitted, Expired, Revoked labels
- Accepted, Declined, Revision requested chips
- icon + label non-color cue on mobile and desktop markup
- disabled Review for expired/revoked
- accessible row names and Review button names
- focus target on error

## Browser smoke scenarios

Mandatory for implementation completion:

1. Unauthenticated `/workshop/proposals` redirects to login.
2. Authenticated recipient sees rows.
3. Empty-state recipient sees empty copy.
4. Review click redirects same-tab to `/share/[raw-token]`.
5. `/share/[token]` renders as recipient session.
6. Expired/revoked rows are visible and cannot open.
7. DOM, URL, action network, and static assets contain no `recipient_token_hash`, `project_publications.token_hash`, or `encrypted_token`.
8. Anonymous `/share/[token]` remains functional.
9. Desktop and mobile viewports do not overflow.

## Validation commands cheat sheet

```bash
# Database
npx supabase db reset
npx supabase db push --linked
bun run gen:types
bun run type-check

# Focused tests
bun run test:dom -- recipient-proposals-repository
bun run test:dom -- recipient-proposals-page
bun run test:dom -- recipient-proposals-route-gate
bun run test:dom -- recipient-proposals-action
bun run test:dom -- main-sidebar-proposals-item

# Static/build
bun run lint
bun run lint:design-system
bun run build

# Static leak checks
rg "recipient_token_hash|encrypted_token|token_hash" src/components/workshop/proposals-page src/components/workshop/proposals-page-client.tsx
rg "SUPABASE_SERVICE_ROLE_KEY" src/lib/repositories/recipient-proposals-repository.ts src/lib/recipient-proposals/actions.ts
```

## Known broad-validation gap

Full `bun run validate` is known red from unrelated failures. If implementation chooses not to run it, the final ledger must include:

- date/branch
- known-red reference from `.ai/10_state/current-state.md`
- narrower commands run instead
- confirmation that all new focused tests are green
