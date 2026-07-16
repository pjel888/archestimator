# Plan UNIT-012: Make `getCloudflareD1Database` distinguish "unbound" from "broken"

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/cloudflare/d1.ts`.

## Status
- **Priority:** P3 · **Effort:** S · **Risk:** LOW · **Depends on:** — · **Category:** reliability/observability
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (unit test over the two failure branches)

## Why this matters
`getCloudflareD1Database` (`d1.ts:35-44`) wraps the OpenNext context import + `isD1Database` check in `catch { return null; }`. A misconfigured binding, a thrown import, or a transient platform error all look identical to "no D1 bound in this context." Most callers guard with `if (!database) throw …`, but the message is uniformly "D1 database is unavailable" — so an entire class of partial-outage failures is undiagnosable from application logs.

## Current state
- `src/lib/cloudflare/d1.ts:35-44` — `try { import; context; isD1Database ? db : null } catch { return null }`.
- Callers guard on `null`; the existing `return null` contract must be preserved.

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| (TEST_PROPOSAL) unit test | `bun run test:dom -- tests/vitest/d1-database-observability.test.ts` (if authorized) | pass |

## Scope
**In scope:** `src/lib/cloudflare/d1.ts` only.
**Out of scope:** caller behavior (still get `null`). Changing the return type.

## Steps
### Step 1 — Split the failure branches
Distinguish "env var/binding absent" (return `null` quietly — expected in some contexts) from "import/shape failure" (log via `emitLogRecord` at `error` with `error_name`, then return `null`). Concretely: narrow the `try` to the import + context resolution; if `context.env?.ARCH_DB` is absent, return `null` silently; if present but `isD1Database` is false or the import threw, log then return `null`. Import `emitLogRecord` from `@/lib/observability/logger` (already used in `action-inbox-repository.ts`).
### Step 2 — (TEST_PROPOSAL) unit test
`tests/vitest/d1-database-observability.test.ts`: absent binding → returns `null`, no log; import/shape failure → returns `null` **and** emits a log record. Do not run without user test authorization.
**Verify:** `bun run type-check` + `bun run lint` exit 0; the logging branch does not itself throw.

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] Absent-binding returns `null` silently; broken-binding logs + returns `null`
- [ ] Logging branch cannot throw (guard the logger call)
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- The OpenNext `getCloudflareContext` import has side effects that make narrowing the `try` risky — keep the outer safety net but add the inner branch logging.
- `emitLogRecord` is unavailable in this module's environment — fall back to the repo's server-safe logger; don't introduce a console-only path.

## Maintenance notes
- Operators can now tell configuration drift (silent null) from platform errors (logged null) in the logs.
- New `getCloudflareD1Database` callers should still guard on `null`.
