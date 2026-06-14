# 15 — Migration Readiness and Rollback Plan

Only **two** destructive DB cleanup candidates exist (CLEAN-F29, F30), both **post-beta, owner-gated**. No DB change is "safe now". This audit applies nothing. Standing pre-launch DB authorization (AGENTS.md) permits migrations, but destructive drops still require dump+rollback+owner gate per the prompt's posture and the closed-beta backup reality (PITR disabled; daily physical backups + manual logical dumps).

## Global migration-readiness checklist (before ANY hosted DB cleanup)

1. Confirm owner gate explicitly granted for the specific object.
2. Take a logical dump of the object (and a fresh physical backup snapshot reference).
3. Run/extend an ephemeral-Postgres dry-run that applies ALL migrations + the candidate drop + a readback.
4. Verify no dependent objects (policies, triggers, views, RPCs, generated types) reference the target — live `\df+`/`pg_depend` check.
5. Apply by exact migration file (do not hand-edit remote); repair into remote migration history.
6. Readback proof; regenerate `database.types.ts`; run the relevant `prove:*` + affected-surface validation.
7. Record the proof artifact under `evidence/` (sanitized).

## CLEAN-F29 — Drop `profile_role_hardening_audit`

- **Object:** table `public.profile_role_hardening_audit`.
- **Why it exists:** one-time forensic record of role demotions during 2026-06-02 beta-allowlist hardening (`20260602090000`). No RLS (service-role only), no ongoing writes, 0 code refs.
- **User data risk:** contains historical profile-role data → treat as sensitive forensic data. **Keep through closed beta**; do not drop until owner confirms the forensic record is no longer needed.
- **Dump/export:** `COPY public.profile_role_hardening_audit TO STDOUT WITH (FORMAT csv, HEADER);` → store off-repo (never commit raw rows).
- **Draft migration title:** `drop_profile_role_hardening_audit_post_beta`.
- **Before/after:** before — table exists, no policies; after — table dropped.
- **Rollback SQL:** re-run the original `create table public.profile_role_hardening_audit (...)` + `revoke all ... from public, anon, authenticated` from `20260602090000`.
- **Local dry-run:** apply all migrations to ephemeral PG → confirm 0 dependents → `DROP TABLE` → assert absent. (BLOCKED until run.)
- **Verification SQL (hosted, post-apply):** `SELECT to_regclass('public.profile_role_hardening_audit');` → NULL.
- **Hosted gate:** DB-OWNER-GATE. **Fallback:** restore from logical dump.

## CLEAN-F30 — Drop `resolve_app_role_for_email`

- **Object:** function `public.resolve_app_role_for_email(...)`.
- **Why it exists:** earlier role-resolution path; appears superseded by `check_closed_beta_access` + `is_platform_admin`.
- **Current references:** only generated `types.ts`; no `.rpc()` caller; no policy/trigger reference found **statically**.
- **MUST verify live first:** `\df+ public.resolve_app_role_for_email` (exact signature), and scan `pg_depend`/policy/trigger bodies for any reference — do not drop on static evidence alone.
- **Dump/export:** capture `pg_get_functiondef(...)` text before drop.
- **Draft migration title:** `drop_resolve_app_role_for_email_post_beta`.
- **Rollback SQL:** re-run captured `CREATE OR REPLACE FUNCTION ...` definition + original GRANT/REVOKE.
- **Local dry-run:** ephemeral PG, full migration chain, confirm no callers/dependents, `DROP FUNCTION IF EXISTS`, assert absent; regenerate types.
- **Verification SQL:** `SELECT count(*) FROM pg_proc WHERE proname='resolve_app_role_for_email';` → 0.
- **Hosted gate:** DB-OWNER-GATE. **Fallback:** re-create from captured definition.

## Staged unification migration (NOT a cleanup target)

`.ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/08_unify_estimate_node_kinds.P5.sql` (RELAX-ONLY) — NOT in `supabase/migrations/`, NOT applied. Has its own runbook (`12_MIGRATION_RUNBOOK_WRITE_FREEZE_ROLLBACK.md`) + `prove:unify-kinds`. **Do not apply, modify, or fold into this cleanup.** Listed here only so cleanup work doesn't disturb it.

## Generated types
`database.types.ts` stays in sync with the live schema; do not delete type entries until their owning table/RPC is actually dropped. After F29/F30 apply, regenerate types and remove the now-orphaned entries in the same change.

## What is explicitly NOT migration-cleanup
Multiply-defined functions (`CREATE OR REPLACE` history), dormant-but-planned RPCs (version control, `get_project_chart_buckets`), AI audit tables, all security/audit/legal tables. These are KEEP — see `08`.
