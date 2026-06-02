# Beta Allowlist Admin Local Evidence - 2026-06-02

Status: partial local proof only; closed beta remains NO-GO.

## What Changed

- Added a protected platform-admin beta user management surface at `/workshop/settings/beta-users`.
- Added `20260602005649_beta_allowlist_admin_queue.sql` to grant authenticated access to `closed_beta_allowed_emails` only through `public.is_platform_admin()` RLS policies.
- Added server-only helpers for listing the latest 100 allowlist rows, filtering by status, normalizing invite emails, and validating status updates.
- Added server actions to add invited/active/revoked beta users and update status/notes without allowing deletes.

## Verification

- `bunx vitest run tests/vitest/closed-beta-allowlist-admin.test.ts --maxWorkers=1` passed 1 file / 4 tests.
- `bun run type-check` passed.

## Scope Limit

This proves only local code, tests, generated migration intent, and route buildability once broader build validation is run. It does not prove the linked Supabase migration has been applied, that hosted platform admins can access the page, that hosted Google OAuth allowlist behavior works, or that the target environment has backup/PITR/rollback proof.
