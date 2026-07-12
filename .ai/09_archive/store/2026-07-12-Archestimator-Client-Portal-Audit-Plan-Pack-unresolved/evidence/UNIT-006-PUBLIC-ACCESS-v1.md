# UNIT-006 Public Access Receipt

## Scope and status

- **Unit:** `UNIT-006`
- **Run scope:** `IMPLEMENT_LOCAL`
- **Result:** `PASS`
- **Implementation:** `src/lib/client-portal/public-repository.ts`, `src/lib/client-portal/public-*-handler.ts`, and the Client Portal/share API routes.
- **Focused tests:** `bunx vitest run tests/vitest/client-portal-policy.test.ts tests/vitest/client-portal-section-registry.test.ts tests/vitest/client-portal-issue-builder.test.ts tests/vitest/client-portal-public-repository.test.ts --maxWorkers=1` — 15 passed.
- **Static verification:** isolated TypeScript program for 16 Client Portal public-access entry files — passed.
- **Migration verification:** fresh isolated local D1 apply succeeded; `client_portal_issue_sections` includes the immutable `policy_snapshot_json` contract.

## Delivered contract

- Stable portal tokens are HMAC-resolved server-side; public responses use opaque portal, issue, and section identities.
- `GET /api/share/:token/manifest` and `GET /api/share/:token/sections/:sectionId` are compatibility adapters over the same issued-only v2 reader used by `/api/client-portal`.
- Public reads select only portal, issue, and issue-section snapshots. They do not join live project or editable section repositories.
- The manifest accepts an issue number or current issue, reports issue status, hides unauthorized sections before serialization, and reads project identity from immutable issue manifest data.
- D1 and R2 section payloads are loaded lazily, sanitized again, and checked against the persisted canonical SHA-256 payload hash before response.
- Password access returns a private no-store `423` gate; the shared password endpoint dispatches only known v2 portal tokens to the v2 handler and preserves the legacy flow otherwise.
- Recipient verification creates a scoped signed session, restores only a valid current credential, filters malformed capability grants, and returns a sanitized profile plus server-derived capabilities.

## Acceptance review

| Acceptance claim | Evidence | Result |
|---|---|---|
| Role-hidden sections are not serialized | Public repository test builds an issued restricted section and receives an empty manifest list. | PASS |
| Historic reads avoid mutable sources | Query assertions cover only `client_portal_issues` and `client_portal_issue_sections`; no live project or draft-section query appears. | PASS |
| Lazy payload reads stay safe | D1 and mocked R2 tests return only sanitized issued fields and validate the immutable object key path. | PASS |
| Password and recipient sessions are route-bound | Shared adapters, password handoff, verify endpoint, signed session, and no-store headers compile together. | PASS |

## Validation boundary

This receipt proves local source, focused automated checks, and a fresh local migration apply. It does not prove hosted Worker headers, D1/R2 bindings, rate-limit behavior, email/magic-link delivery, browser UX, or legacy backfill reconciliation; those remain owned by later implementation and release units.

## Next unit

`UNIT-007` can render the full-width Client Portal shell against the issued manifest and lazy section contract.
