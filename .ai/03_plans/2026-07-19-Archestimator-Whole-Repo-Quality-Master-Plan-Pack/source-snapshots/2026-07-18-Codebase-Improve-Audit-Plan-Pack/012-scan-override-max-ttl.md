# Plan 012: Bound the upload scan-override TTL

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/uploads/scan-override.ts src/lib/uploads/scanning.ts`
> If either changed since this plan was written, compare "Current state"
> against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

A platform admin can approve an upload scan-override with an expiry decades in
the future, permanently bypassing malware scanning on a `component-attachment`
for the lifetime of the workspace. The override is checksum-bound (prevents
swap-after-approval), restricted to `failed_permanent`/`unsupported` states, and
audited — but there's no maximum TTL and no re-review pressure. For an
attachment surface that policy requires scanned, an indefinite override is a
strong privilege with no automatic expiry. This plan adds a max TTL (e.g. 90
days) and rejects overrides beyond it.

## Current state

`src/lib/uploads/scan-override.ts:67-69` — only requires `expiresAt > now`, no
upper bound. Lines 148-150: only `failed_permanent` and `unsupported` are
eligible (good). Lines 151, 167, 180: checksum binding (good).

`src/lib/uploads/scanning.ts:68-72` — override honored for any future
`overrideExpiresAt`.

`buildUploadCleanupOperationalSnapshot` (in `operations-dashboard.ts`) already
models similar alerts — a near-expiry alert can hook into it.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only file you should modify):
- `src/lib/uploads/scan-override.ts` — add a `MAX_UPLOAD_SCAN_OVERRIDE_TTL_MS`
  constant and reject `expiresAt > now + MAX` in `parseUploadScanOverrideRequest`.

**Out of scope**:
- The operational-dashboard near-expiry alert (optional follow-up; note in
  Maintenance notes).
- Eligibility / checksum logic — unchanged.

## Git workflow

- Branch: `advisor/012-scan-override-max-ttl`.
- Commit message: `security(uploads): bound scan-override TTL`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add the max-TTL guard

In `src/lib/uploads/scan-override.ts`, near the top constants, add:

```ts
export const MAX_UPLOAD_SCAN_OVERRIDE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
```

In `parseUploadScanOverrideRequest` (around line 67-69), after the `expiresAt > now`
check, add:

```ts
if (expiresAt.getTime() > Date.now() + MAX_UPLOAD_SCAN_OVERRIDE_TTL_MS) {
  // return the existing validation-error shape with a message like:
  // "Override expiry cannot exceed 90 days."
}
```

Match the existing validation-error return shape used for the other
`parseUploadScanOverrideRequest` failures.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Run the gate

**Verify**: `bun run verify` → exit 0.

Update scan-override tests that used a far-future expiry to use one within the
90-day bound (or assert the new rejection). Search:
`grep -rln "scan-override\|parseUploadScanOverrideRequest\|overrideExpiresAt" tests/`.

## Test plan

- Update affected tests (above).
- If authorized (TEST_TASK), add a test asserting a >90-day expiry is rejected
  and a ≤90-day expiry is accepted.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `grep -n "MAX_UPLOAD_SCAN_OVERRIDE_TTL_MS" src/lib/uploads/scan-override.ts` matches
- [ ] `parseUploadScanOverrideRequest` rejects `expiresAt > now + MAX`
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- The existing validation-error return shape can't carry a TTL-specific message
  without a larger change — report.
- A test deliberately uses a far-future expiry as a "permanent" override
  semantic and can't be reasonably bounded — report (may indicate 90 days is
  the wrong constant; a maintainer may prefer 365).

## Maintenance notes

- Optional follow-up: surface a near-expiry alert in
  `buildUploadCleanupOperationalSnapshot` when an active override approaches its
  TTL (out of scope here).
- Reviewer: confirm the rejection message names the cap so the admin UI can
  display it, and that eligibility/checksum logic is untouched.
