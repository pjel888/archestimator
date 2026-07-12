# UNIT-005 Issue Builder Receipt

## Scope and status

- **Unit:** `UNIT-005`
- **Run scope:** `IMPLEMENT_LOCAL`
- **Result:** `PASS`
- **Implementation:** `src/lib/client-portal/issue-builder.ts` and `migrations/0068_client_portal_foundation.sql`
- **Focused tests:** `bunx vitest run tests/vitest/client-portal-policy.test.ts tests/vitest/client-portal-section-registry.test.ts tests/vitest/client-portal-issue-builder.test.ts --maxWorkers=1` — 12 passed.
- **Static verification:** isolated TypeScript program for the changed Client Portal modules — passed.
- **Migration verification:** an isolated local D1 apply executed all 42 statements and confirmed canonical section-kind and issue-idempotency constraints.

## Delivered contract

- The builder performs scoped portal and draft-section reads, then authorizes publishing through `evaluateClientPortalPolicy`.
- Registered draft sections are parsed, built by a server-owned callback, sanitized, canonically serialized, and hashed before persistence.
- A deterministic issue content hash and a persisted per-portal idempotency key return an existing immutable issue for retried work.
- Optional R2 staging is completed before the D1 write; its object reference, bytes, and hash are verified before the issue can reference it.
- A required D1 batch inserts the issue and immutable sections, supersedes the previous issue, moves the portal current-issue pointer, records an audit event, and queues the notification outbox together.

## Acceptance review

| Acceptance claim | Evidence | Result |
|---|---|---|
| No partial issue becomes current | The only visibility-changing path requires a single D1 batch after payload staging completes. | PASS |
| Retry returns the same issue | Per-portal `idempotency_key` and content-hash lookups return the existing issue before a batch is built. | PASS |
| Current issue changes after full commit construction | Current pointer update is part of the required batch and is never executed as a standalone write. | PASS |
| Historic issue is independent of live rows | Immutable manifest, section payload/hash references, brand snapshot, decision policy, assumptions, exclusions, and totals are stored on the issue. | PASS |

## Validation boundary

This receipt proves the local builder and D1 statement contract. It does not prove a public route, a Publisher action, remote R2 cleanup, remote D1 application, email delivery, or browser behavior; those are owned by later units and release validation.

## Next unit

`UNIT-006` can expose issued manifests and lazy section reads without importing live project repositories.
