# Plan 006: Harden upload malware scanning (require clamd in prod, scan images, gate public URLs)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/uploads/policy.ts src/lib/uploads/policy-scanner.ts src/lib/uploads/scanning.ts src/lib/uploads/scan-job.ts src/lib/uploads/clamd-scanner.ts`
> If any in-scope file changed since this plan was written, compare "Current
> state" against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

Three related scanning gaps, all on user-uploaded content:

1. **The policy scanner only matches the literal EICAR signature**
   (`src/lib/uploads/policy-scanner.ts:7,72-79`). When the policy scanner is the
   active provider (vs. clamd), attachments flagged `scanRequired: true` are
   effectively unscanned for real malware — every non-EICAR payload returns
   `clean`.
2. **Image upload surfaces skip scanning entirely.**
   `src/lib/uploads/policy.ts:23,34` sets `scanRequired: false` for both
   `project-image` and `component-image`. Only `component-attachment` scans.
3. **`component-image` is also `publicUrlAllowed: true`** (line 33) — these
   objects are served to other users, so an unscanned image is a content-
   distribution gap, not just a storage concern.

The combination: an authenticated user can upload arbitrarily-named "image"
bytes (only MIME magic-bytes are checked) that are then served to others with no
malware/polyglot detection; and if clamd is ever unavailable, the policy scanner
rubber-stamps attachments. This plan: (a) requires clamd in production and
fail-closes when it's unreachable, (b) flips image surfaces to `scanRequired`,
(c) gates public-URL issuance on `scan_status === 'clean'`.

This is defensive security maintenance — code/config/test changes only, no
runnable misuse details.

## Current state

`src/lib/uploads/policy.ts` (verbatim, verified):

```ts
export const UPLOAD_POLICIES = {
  "project-image":     { ..., scanRequired: false, publicUrlAllowed: false, allowedMimeTypes: ["image/jpeg","image/png","image/webp","image/avif"] },
  "component-image":   { ..., scanRequired: false, publicUrlAllowed: true,  allowedMimeTypes: ["image/jpeg","image/png","image/webp","image/avif"] },
  "component-attachment": { ..., scanRequired: true,  publicUrlAllowed: false, allowedMimeTypes: ["application/pdf","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
} as const satisfies Record<UploadSurface, UploadPolicy>;
```

`src/lib/uploads/policy-scanner.ts:35-37, 72-89` — the only malware check is:

```ts
function containsEicarSignature(bytes: Uint8Array) {
  return ASCII_DECODER.decode(bytes).includes(EICAR_SIGNATURE);  // "EICAR-STANDARD-ANTIVIRUS-TEST-FILE"
}
// ... everything else returns outcome: "clean"
```

`src/lib/uploads/scanning.ts` and `scan-job.ts` wire the active provider. Read
both to find where the provider is selected (likely a factory like
`createUploadScannerProvider` or `resolveUploadScannerProvider`) and where the
`scan_status` transitions (`clean` / `infected` / `failed_transient` /
`failed_permanent` / `unsupported`) are written to the `upload_assets` row.

`src/lib/uploads/clamd-scanner.ts` — the real clamd client. Read it to confirm
its failure modes (connection refused → throw? → which outcome?).

The scan pipeline already has `failed_transient` retry and a platform-admin
scan-override path (`scan-override.ts`, gated by `isPlatformAdminRole`,
checksum-bound, audited) — so fail-closed-on-clamd-unavailable is safe: a real
outage surfaces as `failed_transient`, not permanent data loss.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Install   | `bun install`          | exit 0              |
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/lib/uploads/policy.ts` — flip image surfaces to `scanRequired: true`.
- `src/lib/uploads/policy-scanner.ts` — narrow its role (pre-filter only) and
  stop returning `clean` as a real AV verdict when it's the sole provider in
  production.
- `src/lib/uploads/scanning.ts` (or wherever the provider is selected) — in
  production, prefer clamd; fail-closed (`failed_transient`) when clamd is
  unreachable rather than falling back to the EICAR-only matcher.
- The public-URL issuance path for `component-image` — gate on
  `scan_status === 'clean'`. (Find it by searching for `publicUrlAllowed` /
  `publicUrl` usages.)

**Out of scope**:
- Do not replace clamd with a different AV engine.
- Do not change the `component-attachment` policy (already scanned).
- Do not touch the scan-override admin flow (already correct).
- Do not add new D1 migrations unless the `scan_status` enum already lacks a
  value you need (it has `clean`, `infected`, `failed_transient`,
  `failed_permanent`, `unsupported` — sufficient).

## Git workflow

- Branch: `advisor/006-upload-scanning-hardening`.
- Commit message: `security(uploads): require clamd in prod, scan images, gate public urls on clean`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Flip image surfaces to scan-required

In `src/lib/uploads/policy.ts`, change `"project-image"` and `"component-image"`
to `scanRequired: true`. Leave everything else (mime types, maxBytes, buckets)
unchanged.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Make clamd authoritative in production; fail-closed when unreachable

Read `src/lib/uploads/scanning.ts` to find the provider-selection branch (where
it decides policy-scanner vs clamd). Restructure so that:

- In production (`NODE_ENV === "production"`), clamd is the required scanner for
  every `scanRequired: true` surface. If clamd is unreachable (connection
  refused / timeout), the scan result is `failed_transient` (so the existing
  retry path re-attempts), **not** a fall-through to the policy scanner.
- The policy scanner may remain as a pre-filter (it already rejects macro-enabled
  attachments, unsupported content types, empty files, and detects EICAR for
  test purposes) — but it must not be the **sole** `clean` issuer in production.
  Either (a) remove its `clean` return when `NODE_ENV === "production"` and it's
  the active provider, returning `failed_transient` instead, or (b) demote it to
  a pre-filter that clamd always follows.

Prefer (b): policy scanner runs first (cheap rejects for unsupported/macro/
empty/EICAR-test), then clamd runs for the real verdict. Only in non-production
may the policy scanner's `clean` be terminal (so local dev without clamd still
works).

Match the existing outcome-type shape exactly (`outcome`, `provider`, `reason`,
`result`, optional `signature`).

**Verify**: `bun run type-check` → exit 0.

### Step 3: Gate `component-image` public URL on clean status

Find where `component-image` public URLs are issued (search
`grep -rn "publicUrlAllowed\|publicUrl" src/lib/uploads src/lib/component-library src/app/api/component-library/images`).
At the issuance point, require the asset's `scan_status === 'clean'` before
returning a public URL; otherwise return a "scan pending" / 409 / no-URL response
(match the existing error convention). This prevents serving an unscanned or
failed image to other users.

If the public URL is issued at upload-finalize time (before scan completes),
restructure so the URL is only minted/resolved after the scan job writes
`scan_status = 'clean'`. The `direct-upload` and `server-image-processing.ts`
paths both feed into the scan job; the URL-issuance gate belongs at the read
side (when a consumer requests the image), not the write side.

**Verify**: `bun run type-check` → exit 0.

### Step 4: Update existing tests; run the gate

Existing upload tests in `tests/vitest/` (there are 15+ scan/cleanup tests per
recon) will need their expectations updated:
- Image-surface tests that assumed `scanRequired: false` must now expect a scan
  job to be enqueued.
- Tests that relied on the policy scanner returning `clean` as terminal in
  production-mode must now either run in non-production mode or assert
  `failed_transient` when clamd is absent.

Search: `grep -rln "scanRequired\|policy-scanner\|createUploadPolicyScannerProvider\|component-image" tests/`.

**Verify**: `bun run verify` → exit 0. If a test cannot be updated without
weakening the new security contract, STOP and report it.

## Test plan

- Update affected tests (above). Mechanical but non-trivial; budget for it.
- If the user authorized new tests (TEST_TASK), add:
  - A test asserting that in `NODE_ENV=production` with clamd unreachable, a
    `scanRequired: true` upload transitions to `failed_transient` (not `clean`).
  - A test asserting `component-image` public-URL resolution rejects when
    `scan_status !== 'clean'`.
  Model on `tests/vitest/` existing scan tests (find one with
    `scan_status` assertions as the pattern).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `grep -n "scanRequired: false" src/lib/uploads/policy.ts` → no matches
- [ ] The policy scanner does not return terminal `clean` when
      `NODE_ENV === "production"` and clamd is unavailable (read the restructured
      branch and confirm `failed_transient`)
- [ ] `component-image` public-URL issuance requires `scan_status === 'clean'`
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- The provider-selection code is structured in a way that makes clamd-required-
  in-prod impossible without a larger refactor (report the structure).
- A public-URL issuance point cannot be gated without a new D1 column or
  migration (report what's missing).
- A test asserts a behavior that directly contradicts the new contract and
  cannot be updated to the new expectation without weakening it.

## Maintenance notes

- **Operational prerequisite (NOT this plan):** confirm clamd is actually
  deployed and reachable from the production worker before merging. A clamd
  outage post-merge will surface as `failed_transient` on every image/attachment
  upload — visible, but disruptive. Coordinate with the deploy.
- Capacity: flipping image surfaces to scan-required multiplies scan volume.
  Confirm clamd capacity (the `cf:verify-hosted-upload-operations` /
  `cf:verify-hosted-upload-runtime` scripts may help baseline).
- The EICAR match in the policy scanner stays — it's the standard AV test
  vector and useful for the pre-filter stage and for tests.
- Reviewer: confirm (a) production can never reach terminal `clean` without
  clamd, (b) image public URLs respect scan status, (c) the admin scan-override
  path still works for `failed_permanent`/`unsupported`.
- Related deep-audit findings (direct-upload checksum binding, override TTL,
  CRON_SECRET on job routes) are separate plans (007, 008).
