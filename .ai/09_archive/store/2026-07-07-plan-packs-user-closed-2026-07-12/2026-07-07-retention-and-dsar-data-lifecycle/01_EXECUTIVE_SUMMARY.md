# 01 — Executive Summary

## What this pack delivers
A production-grade, codebase-specific planning package that converts Archestimator's **draft** retention schedule and **partial** privacy/DSAR pieces into a fully defined, provable implementation. It names the exact files, symbols, migrations, cron hooks, propagation map, tests, and hosted-proof gates a future implementation AI needs — without writing any code.

The pack targets the PROMPT.md stop condition verbatim: *"defines the exact implementation and proof needed for retention and DSAR readiness."*

## Current state (evidence-backed)
- **Retention engine exists** (`src/lib/compliance/retention-core.ts`) but only enforces **7 of 14** declared classes. Every enforced rule uses `action: "purged"` (hard `DELETE`). The other 7 classes (3 AI audit tables, 2 logs classes, `uploads_orphaned`, `sessions_expired`) are declared in `RetentionClassName` but absent from `DEFAULT_RETENTION_RULES`.
- **`data_retention_events` audit table exists** (migration `0034`) and is written by `recordRetentionEventInD1`. The retention pass runs on cron `30 3 * * *` inside `worker.ts scheduled()` (`worker.ts:109-115`).
- **Privacy-request intake exists end-to-end**: public POST `/api/compliance/privacy-requests/route.ts` with HMAC-hashed PII, 16 KiB body cap, per-email + per-IP rate limits via `security_rate_limit_events`. Migration `0033` defines `privacy_requests`.
- **DSAR triage / export / erasure are NOT implemented**: `privacy-request-repository.ts` exports only `createPrivacyRequest` + `listPrivacyRequests` — no status-transition function, no admin UI, no consumer of `listPrivacyRequests` in the app. The DSAR erasure propagation map in `retention-schedule.md:48-54` is prose only.
- **Soft-delete is nearly absent**: the only `deleted_at` column in all of D1 is `cost_library_item_variant_cost_entries.deleted_at` (migration `0028`). There is **no `legal_hold` column anywhere**. The `tombstoned`/`anonymized`/`soft_deleted`/`skipped_legal_hold` actions are reserved enums with zero rules.
- **R2 deletion proof exists for uploads** (`upload_events` written by the upload-cleanup job at cron `0 3 * * *`) but **not for DSAR-driven erasure**.
- **Cron proof is local-only**: the retention pass runs unconditionally in apply mode in the Worker; there is no env-gated dry-run staging flag and no hosted 30-day observation evidence.
- **TTLs are DRAFT**, explicitly gated on `OPEN-DEC-004` counsel sign-off (`retention-schedule.md:3`). The privacy notice wording that gates DSAR email confirmation is gated on `OPEN-DEC-002`.

## Target state (summarized)
1. **Complete retention rule registry** — all 14 classes enforced, with non-purge actions (`anonymized`, `tombstoned`, `soft_deleted`) wired where the schedule calls for them, and `skipped_legal_hold` honored once a `legal_hold` column exists.
2. **End-to-end DSAR lifecycle** — intake (exists) → admin triage → **export** (data-subject package) → **erasure** (propagation to Better Auth `user`/D1 `profiles`, audit event tables, R2 uploads) → evidence. Status transitions enforced server-side via new repository functions.
3. **Provably-running cron** — env-gated dry-run vs apply, per-run audit rows, idempotency keys, batching within D1 limits, and a 30-day hosted observation gate.
4. **R2 deletion proof for DSAR** — tombstone + delayed purge (30d per schedule) with audit + receipt.
5. **Log-retention boundaries** — Cloudflare Workers Observability (30d) and Cloudflare Email (90d) documented, with redaction rules and an access-review proof.
6. **Operational evidence** — runbook, dashboard queries, alerts, and the exact hosted proof required before any compliance claim.
7. **Legal/owner sign-off points isolated** — `OPEN-DEC-002`, `OPEN-DEC-004`, and new `OPEN-DEC-006/007/008` for legal-hold, DSAR SLA, and export format, never silently resolved.

## Major findings
- **Architecture**: reuse the existing `src/lib/mass-deletion/` R2-cleanup pattern (correlation ID, storage targets, DLQ-style status) for DSAR erasure. Unify lifecycle audit through `data_retention_events` (not `upload_events`) for the retention/DSAR surface to keep one audit trail.
- **Data**: new migrations needed for `user.deleted_at` (Better Auth) or a privacy-only `erasure_requests` ledger (preferred to avoid mutating Better Auth schema), plus `deleted_at`/`anonymized_actor` on the audit event tables, and an optional `legal_hold` column. Each task carries a Database Change Blueprint + rollback.
- **Security**: DSAR fulfillment is a privileged abuse surface — an attacker who can trigger erasure can destroy evidence or cause business harm. Every triage/export/erasure action needs platform-admin authz, audit, idempotency, and a typed confirmation phrase (mirroring `validateTypedConfirmationPhrase` in mass-deletion).
- **Performance**: D1 retention batching already caps at 100–500 rows/pass; the plan keeps that and adds an explicit evaluator (row-count regression, cron duration p95, D1 query count) with a rollback trigger.
- **Operations**: cron proof requires 30 days of hosted `data_retention_events` rows + zero skipped-with-error rows beyond a documented threshold. R2 deletion proof requires a DSAR-erasure receipt object.

## Critical decisions (see `15_` for full rationale)
- **DEC-001**: DSAR erasure reuses the `mass-deletion` correlation/audit/R2 pattern rather than inventing a new one.
- **DEC-002**: TTL values remain the draft schedule defaults until `OPEN-DEC-004`; the registry reads them from a single source of truth (code constant, optionally migrated to a D1 `retention_policy` table in a later phase).
- **DEC-003**: Better Auth `user` row is **not** hard-deleted by DSAR. It is soft-deleted (`deleted_at`) or anonymized in place; the Better Auth-managed `session`/`account`/`verification` rows are revoked/invalidated, not schema-migrated.
- **DEC-004**: `legal_hold` is **optional** in Phase 1 (P1.8) and **required** before any compliance claim that depends on litigation holds; the `skipped_legal_hold` action is wired but the column ships behind a flag.
- **DEC-005**: Log retention (Workers Observability, Email) is **documented + observed**, not engine-enforced, because those are platform-managed TTLs. The engine records acceptance rows.

## Remaining external decisions
- `OPEN-DEC-002` — privacy-notice wording (gates DSAR email confirmation).
- `OPEN-DEC-004` — counsel sign-off on final TTLs (gates "policy" status).
- `OPEN-DEC-006` — legal-hold policy: who can set, scope (per-user / per-workspace / per-class), retention override rules.
- `OPEN-DEC-007` — DSAR fulfillment SLA + identity-verification threshold for erasure (high-risk: wrongful erasure).
- `OPEN-DEC-008` — DSAR export format (JSON vs JSON+CSV bundle vs both) and delivery channel (in-app download vs signed R2 URL vs email).

## Remaining implementation blockers (after sign-off)
None that block *planning* readiness. Every implementation task is either fully specified or isolated as a safe `DISCOVERY-REQUIRED` step with a falsifiable target. The blockers above are owner/legal decisions, not architecture unknowns.

## Readiness status
**`CONDITIONALLY READY`** — the *planning package* is implementation-ready, but the *feature's* production rollout is conditional on the `OPEN-DEC-*` gates and the 30-day hosted cron/R2 observation gate. This is the honest status given (a) `verification_mode: emulated` and (b) the legal/SLA decisions are genuinely external.

Scores and verification mode are detailed in `17_FINAL_READINESS_REVIEW.md`.

## Stack-contract summary (see `18_`)
Next.js 16 / React 19 / Bun / TS / Tailwind v4 / OpenNext on Cloudflare Workers / D1 (`ARCH_DB`) / R2 (`ARCH_UPLOADS_R2`) / DO (`COLLAB_ROOMS`) / Queue (`UPLOAD_JOBS_QUEUE`) / Cloudflare Email (`EMAIL`) / Better Auth 1.6.22 / TanStack Query / Zustand. No Supabase/Vercel/Resend runtime use; those are historical/provider-exit surfaces only.

## Performance evaluator summary (see `09_`, `13_`)
Baseline: per-class row count + cron run duration today (local dry-run). Target: cron p95 < 30s, D1 query count ≤ ~40/run (7 classes × ~5 queries), zero skipped-error rows over 30 hosted days. Regression threshold: duration p95 +50% or any new error class. Evaluator: a `cf:d1-retention-proof` script (to be created in implementation) + hosted `data_retention_events` query.

## Test execution matrix summary (see `12_`)
Unit tests for the rule registry, propagation map, and confirmation phrase; D1 repository tests (apply/dry-run, audit writes, idempotency); role-matrix + denial tests for the admin triage/export/erasure actions; cron dry-run vs apply proof; R2 tombstone+purge receipt test; adversarial matrix (16+ scenarios) in `19_`.

## Shadow-path coverage summary (see `04_`)
Every DSAR + retention flow has a full shadow-path matrix (happy / nil / empty / invalid / auth-denied / upstream-error / concurrency / retry-idempotency / user-visible result / test). No cell is left unanswered.

## Database / provider-proof summary (see `07_`, `13_`)
Local D1 proof via `bun run cf:d1-restore-rehearsal` + targeted repository tests. Hosted proof required before compliance claim: 30 days of `data_retention_events` rows from the deployed Worker, an R2 DSAR-erasure receipt, and readback of Workers Observability retention config. These are **not** provable from local-only checks.
