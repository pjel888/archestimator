# 08 — Database / Schema / Migration / RLS Cleanup Audit

**Static analysis only — no live DB queried.** Inventory in `evidence/database-object-inventory.md`. Standing pre-launch DB authorization exists (AGENTS.md, project `ebxxqidacheyapmmzavr`), but this audit **applies nothing**. Destructive cleanup stays behind dump+rollback+owner gate. All "data present?" = unknown until P4 dry-run.

## Inventory: 54 tables · ~110 RPCs · ~145 policies · 115 indexes · 35 triggers · 3 buckets · 13 enums · 91 migrations.

## Required cleanup table

| DB Object | Type | Feature Owner | Current Refs (code) | Data Present? | User/Data Risk | Drop/Rename/Keep | Migration Class | Rollback Path | Local Dry Run | Hosted Gate | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `profile_role_hardening_audit` | table | Security ops | 0 (`.from`/types); one-time insert in migration `20260602090000` | unknown-no-DB | HIGH (forensic record) | **Drop (post-beta)** | DB-HOSTED-DESTRUCTIVE | re-run create SQL in new migration | `SELECT * FROM profile_role_hardening_audit;` (BLOCKED-no-DB) | DB-OWNER-GATE | OWNER_GATE / DELETE_AFTER_MIGRATION_DRY_RUN |
| `resolve_app_role_for_email` | RPC | role resolution | only `types.ts:3379`; no `.rpc()` | n/a | MED | **Drop (post-beta)** | DB-HOSTED-DESTRUCTIVE | re-run create SQL | `\df+ public.resolve_app_role_for_email` (BLOCKED) | DB-OWNER-GATE | OWNER_GATE / DELETE_AFTER_MIGRATION_DRY_RUN |
| `get_project_chart_buckets` | RPC | charts | 0 `.rpc()`; `project-charts-repository.ts:117` "future iteration" | n/a | LOW | **Keep** (deployed-dormant) | DB-HOSTED-ADDITIVE (applied) | n/a | n/a | n/a | KEEP_FOR_NOW |
| `create_estimate_sheet_version` / `restore_estimate_sheet_version_as_copy` / `get_estimate_sheet_version_control_preflight` / `backfill_estimate_sheet_baseline_versions` | RPC | versioning | DB-internal; gated by tabs-foundation comment ("not until v3 snapshot carries tabs[]") | n/a | MED | **Keep** (corridor) | DB-KEEP | n/a | n/a | n/a | KEEP_FOR_NOW |
| `estimate_sheet_versions` | table | versioning | written by version RPCs only | unknown | HIGH | **Keep** | DB-KEEP | — | — | — | KEEP_FOR_NOW |
| AI tables (`ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `ai_package_apply_commands`, `ai_package_builder_memory_preferences`) | tables | AI audit | written by `lib/ai/audit.ts` + AI RPCs | unknown | HIGH (audit) | **Keep** (even if AI UI cut) | DB-KEEP | — | — | — | KEEP_FOR_NOW (tied to F25) |
| Security/audit/legal tables (`account_security_events`, `collaboration_audit_events`, `estimate_sheet_events`, `mass_deletion_events`, `security_rate_limit_events`, `legal_terms_acceptances`, `closed_beta_allowed_emails`, `beta_feedback_submissions`) | tables | security/legal | active | unknown | HIGH | **Keep** | DB-KEEP | — | — | — | KEEP |
| Trigger fns / RLS helpers / computed-col fns / auth hooks / service-role batch ops / `_with_history` internals | functions | core | wired to triggers/policies/other RPCs | n/a | HIGH | **Keep** | DB-KEEP | — | — | — | KEEP |
| Multiply-defined fns (`CREATE OR REPLACE` history) | functions | various | latest wins; earlier files immutable | n/a | none | **Keep** | n/a | — | — | — | NOT A CANDIDATE |
| Estimate-node unification objects (kind enforcement, `estimate_tab_id`, two-kind validators) | tables/fns/triggers | unification corridor | active + staged P5 | unknown | HIGH | **Keep** | DB-KEEP (staged P5 separate) | per runbook | `prove:unify-kinds` | DB-OWNER-GATE | KEEP / staged |

## Findings

### CLEAN-F29 — Drop `profile_role_hardening_audit` (post-beta, owner-gated)
One-time forensic insert from security hardening; no RLS (service-role only), no ongoing writes, 0 code refs. Not a risk, just debt. **Keep through closed beta**; in a post-beta migration: `COPY public.profile_role_hardening_audit TO STDOUT CSV HEADER` (dump) → `DROP TABLE` → readback. Rollback: re-run create SQL. Decision: OWNER_GATE / DELETE_AFTER_MIGRATION_DRY_RUN.

### CLEAN-F30 — Drop `resolve_app_role_for_email` (post-beta, owner-gated)
No `.rpc()` caller, no policy/trigger dependency found statically; only in generated `types.ts`. Likely superseded by `check_closed_beta_access` + `is_platform_admin`. **Must verify live** (`\df+`, dependency scan) before drop. Decision: OWNER_GATE / DELETE_AFTER_MIGRATION_DRY_RUN.

### CLEAN-F31 / F32 — Deployed-but-dormant objects (KEEP)
`get_project_chart_buckets` (RPC ready, JS fold still used) and the version-control RPC stack are intentionally dormant per code/migration comments. Zero runtime cost while unused. Keep; wire when the feature lands.

### Staged P5 migration — DO NOT APPLY
`.ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/08_unify_estimate_node_kinds.P5.sql` (RELAX-ONLY) is NOT in `supabase/migrations/` and NOT applied. It has a dedicated runbook (`12_MIGRATION_RUNBOOK_WRITE_FREEZE_ROLLBACK.md`) and `prove:unify-kinds`. Out of scope for this audit; do not modify or apply.

## Database cleanup classification rollup

- **DB-CODE-ONLY:** none required (generated types stay in sync with the schema; remove unused TS type refs only when their owning RPC/table is dropped).
- **DB-LOCAL-MIGRATION:** none (no purely-local schema cleanup identified).
- **DB-HOSTED-ADDITIVE:** `get_project_chart_buckets` already applied (no action).
- **DB-HOSTED-DESTRUCTIVE:** F29, F30 — only after local dry-run + dump + owner gate.
- **DB-OWNER-GATE:** F29, F30, staged P5/P6.
- **DB-KEEP:** everything else (security/audit/legal/corridor/dormant-planned).

## BLOCKED proofs (resolve in P4)
Row counts, live `\df`, dependency graphs, policy existence, storage bucket contents — all require `supabase db query --linked` or Supabase MCP `execute_sql`, deliberately not run here. See `15_MIGRATION_READINESS_AND_ROLLBACK_PLAN.md`.
