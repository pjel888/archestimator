# Hosted D1 Recovery Rehearsal — 2026-07-12

- Result: provider-backed ordered recovery completed.
- Disposable target cleanup: verified by Cloudflare D1 inventory readback.
- Runtime: 90.405 seconds (`2026-07-12T15:44:54.193Z` to `2026-07-12T15:46:24.598Z`).
- Recovery identity digest: `ceba8fb3e171bad99b591694c966fc594c3e96434098cbac05e8a5754b0b87d9`.
- Sanitized export digest: `cfb16f05b362d9375724ab308d75f78941da7403afeb7634da731c411d6a3b1f`.
- Provider report: `succeeded=true`, `providerBacked=true`, `cleanupVerified=true`, and no reported blockers.
- Local validation immediately before the run: focused recovery tests (25 assertions), TypeScript check, and diff check passed.

The run used migration-first target construction, a single restricted `--no-schema` source export, encrypted temporary storage, an ordered credential-excluding data artifact, an authenticated disposable Worker probe, and target deletion with inventory readback. It does not by itself satisfy the separate strict receipt, application authorization, or remaining archived plan-pack completion claims.
