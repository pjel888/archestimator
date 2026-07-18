# Plan 010: Stop accepting the shared `CRON_SECRET` on upload job routes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/app/api/internal/upload-cleanup/route.ts src/app/api/internal/upload-scan/route.ts src/app/api/internal/upload-runtime/route.ts src/lib/cloudflare/scheduled-upload-jobs.ts`
> If any changed since this plan was written, compare "Current state" against
> the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

The three upload job routes accept an array of bearer secrets that includes
both a route-specific secret AND the shared `CRON_SECRET`:

- `src/app/api/internal/upload-cleanup/route.ts:99-102` — `[CRON_SECRET, UPLOAD_CLEANUP_JOB_SECRET]`
- `src/app/api/internal/upload-scan/route.ts:75-78` — `[CRON_SECRET, UPLOAD_SCAN_JOB_SECRET]`
- `src/app/api/internal/upload-runtime/route.ts:188-191` — `[CRON_SECRET, UPLOAD_RUNTIME_PROOF_SECRET]`

`CRON_SECRET` is the universal admin/cron secret — it authorizes every other
proof router too (`collaboration-invitation-proof-router.ts:44`,
`observability-proof-router.ts:23`, etc.). The dedicated `UPLOAD_*_JOB_SECRET`
env vars exist precisely to compartmentalize the upload-jobs blast radius. By
also accepting `CRON_SECRET` on the upload routes, a single `CRON_SECRET` leak
grants the holder the ability to trigger `upload-cleanup`, which enqueues real
R2 `removeObjects` deletion. Path scoping (`isAllowedUploadCleanupTarget` /
`workspacePrefixMatches` in `cleanup.ts:115-134`) prevents cross-workspace
deletion, so this is secret-domain widening, not a missing path check.

This plan removes `CRON_SECRET` from the three upload job routes' accepted
secrets so each secret's blast radius matches its purpose.

## Current state

The accepted-secrets arrays (verified at the cited lines). Each route builds an
array and passes it to `authorizeBearerRequest` (the constant-time bearer
auth in `src/lib/security/bearer-auth.ts`).

`src/lib/cloudflare/scheduled-upload-jobs.ts:59-61` — the cron dispatcher
prefers the route-specific secret but falls back to `CRON_SECRET` when sending
the internal request. After this plan, the dispatcher must send ONLY the
route-specific secret.

Path scoping (confirmed safe, do not touch): `cleanup.ts:115-134`.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Install   | `bun install`          | exit 0              |
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/app/api/internal/upload-cleanup/route.ts` — drop `CRON_SECRET` from the accepted array.
- `src/app/api/internal/upload-scan/route.ts` — same.
- `src/app/api/internal/upload-runtime/route.ts` — same.
- `src/lib/cloudflare/scheduled-upload-jobs.ts` — send only the route-specific secret (no `CRON_SECRET` fallback).

**Out of scope**:
- Other proof routers that legitimately use `CRON_SECRET` — they keep it.
- `bearer-auth.ts` — unchanged.
- Path-scoping in `cleanup.ts` — already correct.
- Env var names — keep `UPLOAD_CLEANUP_JOB_SECRET` / `UPLOAD_SCAN_JOB_SECRET` / `UPLOAD_RUNTIME_PROOF_SECRET`.

## Git workflow

- Branch: `advisor/010-scope-cron-secret`.
- Commit message: `security(uploads): stop accepting shared CRON_SECRET on upload job routes`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Remove `CRON_SECRET` from each route's accepted-secrets array

In each of the three route files, change the accepted-secrets array from
`[CRON_SECRET, UPLOAD_*_SECRET]` to `[UPLOAD_*_SECRET]` (route-specific only).

Before editing each, read the surrounding lines to confirm how the env vars are
read (e.g. `process.env.UPLOAD_CLEANUP_JOB_SECRET`) and how the array is passed
to `authorizeBearerRequest`. Preserve the constant-time comparison path — only
the array membership changes.

Also confirm each route still fails-closed when the route-specific secret is
unset (it should: `authorizeBearerRequest` rejects an empty/undefined secret).

**Verify**: `bun run type-check` → exit 0. Then `grep -n "CRON_SECRET" src/app/api/internal/upload-cleanup/route.ts src/app/api/internal/upload-scan/route.ts src/app/api/internal/upload-runtime/route.ts` → no matches.

### Step 2: Update the cron dispatcher to send only the route-specific secret

In `src/lib/cloudflare/scheduled-upload-jobs.ts:59-61`, remove the `CRON_SECRET`
fallback so the dispatcher always sends the route-specific secret
(`UPLOAD_CLEANUP_JOB_SECRET` for cleanup, `UPLOAD_SCAN_JOB_SECRET` for scan).

If the dispatcher currently does something like
`const secret = UPLOAD_JOB_SECRET ?? CRON_SECRET`, change it to
`const secret = UPLOAD_JOB_SECRET` and fail-closed (throw / log) if unset — a
misconfigured deploy should be loud, not silently fall back to the shared secret.

**Verify**: `bun run type-check` → exit 0.

### Step 3: Run the gate

**Verify**: `bun run verify` → exit 0.

Any test that authenticated an upload job route with `CRON_SECRET` will now fail
with 401. Update those tests to use the route-specific secret. Search:
`grep -rln "CRON_SECRET" tests/` and the route-specific test files
(`grep -rln "upload-cleanup\|upload-scan\|upload-runtime" tests/`).

## Test plan

- Update affected tests (above) — mechanical swap to the route-specific secret.
- If authorized (TEST_TASK), add a test asserting `CRON_SECRET` is REJECTED on
  each of the three upload job routes (401) while the route-specific secret is
  accepted. Model on existing bearer-auth tests
  (`grep -rln "authorizeBearerRequest\|bearer-auth" tests/`).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `grep -rn "CRON_SECRET" src/app/api/internal/upload-cleanup/route.ts src/app/api/internal/upload-scan/route.ts src/app/api/internal/upload-runtime/route.ts src/lib/cloudflare/scheduled-upload-jobs.ts` → no matches
- [ ] Each route still accepts its route-specific secret (read the array)
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- A route reads its secret in a way that can't simply drop the `CRON_SECRET`
  array entry (e.g. the auth logic is shared in a helper that other routes use
  too) — report the structure.
- The cron dispatcher has no route-specific secret wired at all (only ever used
  `CRON_SECRET`) — report; the env var must be provisioned before this plan can
  land safely.
- A test asserts `CRON_SECRET` is accepted as a deliberate compatibility
  behavior — report; may need a maintainer decision on deprecation timing.

## Maintenance notes

- **Operational prerequisite (NOT this plan):** confirm
  `UPLOAD_CLEANUP_JOB_SECRET`, `UPLOAD_SCAN_JOB_SECRET`, and
  `UPLOAD_RUNTIME_PROOF_SECRET` are actually set in the deployed worker
  (`wrangler.jsonc` vars + secrets) before merging. If any is unset, the
  corresponding job will fail-closed (401) post-merge. The `cf:check-readiness`
  or `cf:sync-worker-secrets` scripts may help verify.
- If backward compatibility during rotation is genuinely needed, time-box a
  fallback behind an explicit env flag (e.g. `UPLOAD_ALLOW_CRON_SECRET_FALLBACK=1`)
  with a logged warning — but prefer a clean cut.
- Reviewer: confirm (a) no upload job route references `CRON_SECRET`, (b) the
  dispatcher sends only the route-specific secret, (c) each route fails-closed
  on an unset secret.
- Related: plan 006 (scanning hardening) and plan 009 (queue idempotency) touch
  the same upload-job area but are independent.
