# Plan 011: Require checksum binding on direct-upload finalize

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/uploads/direct-upload-records.ts src/app/api/component-library/attachments/direct-upload/route.ts src/lib/uploads/provider-portability.ts`
> If any changed since this plan was written, compare "Current state" against
> the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

When a client reserves a direct-upload session WITHOUT supplying
`checksumSha256`, the finalize step (`direct-upload-records.ts:615-623`) binds
the stored asset only by size + R2 ETag — it validates the checksum only when
both an expected and observed value are present, otherwise falling back to ETag
(`provider-portability.ts:140-141`). R2 ETags are not content-stable for
SSE-configured buckets and in any case only prove "the client wrote *something*."
The path is server-generated and per-user (so cross-tenant substitution isn't
possible), but the integrity contract that every other code path relies on —
"checksum_sha256 in `upload_assets` identifies the scanned bytes" — is silently
weakened for this surface. A user can finalize an asset whose stored bytes never
matched any validated checksum.

This plan makes `checksumSha256` mandatory for the `component-attachment` direct-
upload surface at reserve time, and requires `expectedChecksum === observedChecksum`
at finalize (no ETag fallback).

## Current state

`src/lib/uploads/direct-upload-records.ts:252` — `normalizeChecksum(input.checksumSha256)`
makes the checksum optional at reserve time. Line 615-623: finalize only
validates when both expected and observed are present.

`src/app/api/component-library/attachments/direct-upload/route.ts:333` —
`checksumSha256` is parsed from the request but never required.

`src/lib/uploads/provider-portability.ts:140-141` — if `expectedChecksum` is
absent, any observed ETag satisfies validation.

Server-mediated upload (the non-direct path) already requires the checksum —
this plan brings the direct path to parity.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Install   | `bun install`          | exit 0              |
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/app/api/component-library/attachments/direct-upload/route.ts` — require
  `checksumSha256` in the reserve request.
- `src/lib/uploads/direct-upload-records.ts` — at finalize, require
  `expectedChecksum === observedChecksum`; reject when the session was reserved
  without a checksum.
- `src/lib/uploads/provider-portability.ts` — remove the ETag fallback when an
  expected checksum is absent (for the direct-upload path; keep ETag-only for
  any path that legitimately has no checksum — see STOP conditions).

**Out of scope**:
- Image surfaces (`project-image`, `component-image`) — they don't use direct-
  upload finalize the same way; leave them. (Scanning is addressed in plan 006.)
- The scan-override / removal-claims paths — they already checksum-bind.

## Git workflow

- Branch: `advisor/011-direct-upload-checksum-binding`.
- Commit message: `security(uploads): require checksum binding on direct-upload finalize`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Require `checksumSha256` in the reserve request

In `src/app/api/component-library/attachments/direct-upload/route.ts`, in the
request-parsing block (around line 333), reject the request with a 400 if
`checksumSha256` is missing or fails the `normalizeChecksum` shape check.
Match the existing 400-response convention used elsewhere in the route.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Require checksum match at finalize; remove ETag fallback

In `src/lib/uploads/direct-upload-records.ts` finalize (~line 615-623):
- If the session was reserved without a `checksumSha256`, reject finalize
  (fail-closed). After step 1 this shouldn't happen for new sessions, but
  defend against pre-existing in-flight sessions.
- Require `expectedChecksum === observedChecksum` (constant-time compare via the
  helper from plan 004 if available, else `timingSafeEqual`); reject on mismatch.

In `src/lib/uploads/provider-portability.ts:140-141`, change the validation so
that when `expectedChecksum` is absent the result is a FAILURE (not an ETag
pass-through) — BUT only if every caller now supplies an expected checksum. If
a caller legitimately has no checksum (STOP-condition check), scope the change
to the direct-upload path only.

**Verify**: `bun run type-check` → exit 0.

### Step 3: Run the gate

**Verify**: `bun run verify` → exit 0.

Update direct-upload tests that previously omitted `checksumSha256` to supply a
real SHA-256 (compute one over the test fixture bytes). Search:
`grep -rln "direct-upload\|createSignedUpload\|finalizeUploadSessionAsset" tests/`.

## Test plan

- Update affected direct-upload tests (above).
- If authorized (TEST_TASK), add tests:
  - Reserve without `checksumSha256` → 400.
  - Finalize with mismatched observed checksum → rejection.
  - Finalize with matching checksum → success.
  Model on existing direct-upload tests in `tests/vitest/`.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] Reserve request rejects missing `checksumSha256` (read the parse block)
- [ ] Finalize requires `expectedChecksum === observedChecksum`; no ETag fallback on the direct path
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- `provider-portability.ts` is shared with a path that legitimately lacks a
  checksum (e.g. a legacy image flow) — scope the change to direct-upload only
  and report which caller needs the ETag fallback preserved.
- A direct-upload test fixture can't reasonably compute a SHA-256 (e.g. it uses
  random bytes with no stable hash) — report and adjust the fixture.

## Maintenance notes

- After this lands, the integrity contract is uniform across all upload paths.
- Reviewer: confirm (a) reserve rejects missing checksum, (b) finalize rejects
  mismatched/absent checksum, (c) no ETag-only pass-through remains on the
  direct path, (d) the image surfaces are untouched (or explicitly noted as
  out-of-scope).
- Related: plans 006 (scanning), 009 (queue idempotency), 010 (CRON_SECRET) all
  touch uploads but are independent.
