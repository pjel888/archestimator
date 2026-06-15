# Provider Schema, RLS, And Security Audit

## Live Project Identity

| Field | Value |
| --- | --- |
| Project ref | `ebxxqidacheyapmmzavr` |
| Name | `Archestimator` |
| Organization | `unfair-black-sb5unhb` |
| Region | `ap-southeast-2` |
| Status | `ACTIVE_HEALTHY` |
| Database version | `17.6.1.121` |
| Postgres major | 17 |

This matches the repo baseline in `supabase/config.toml`, which sets `major_version = 17`.

## Extensions

Installed extensions observed:

- `pgcrypto 1.3`
- `uuid-ossp 1.1`
- `pg_stat_statements 1.11`
- `supabase_vault 0.3.1`
- `plpgsql 1.0`

`pg_graphql` is not installed. The 2026 Supabase pg_graphql introspection rollout is therefore not an active Archestimator issue unless the extension is installed later.

## Tables And RLS

Live public schema summary:

| Metric | Count |
| --- | --- |
| Public tables | 51 |
| Public tables with RLS enabled | 51 |
| Public tables with RLS disabled | 0 |
| Public views | 0 |
| Public tables with RLS enabled but no policies | 5 |

Tables with RLS enabled but no policies:

- `account_security_events`
- `closed_beta_allowed_emails`
- `collaboration_audit_events`
- `collaboration_invitation_tokens`
- `profile_role_hardening_audit`

This is not automatically unsafe if grants and service-role-only access are intentional, but it should be documented table-by-table. Exposed-schema tables with no policies are fragile because later grants or broad API exposure changes can alter the practical access boundary.

## Grants And Data API Exposure

`supabase/config.toml` exposes these API schemas:

- `public`
- `graphql_public`

Many public tables grant broad privileges to `anon` and/or `authenticated`, while relying on RLS for actual row access. This is a common Supabase pattern, but it deserves a launch-hardening pass after Supabase's current Data API posture changes.

Audit recommendation:

1. Keep RLS as the primary row boundary.
2. Remove unnecessary `anon` DML grants where browser-side anonymous access is not required.
3. Treat `authenticated` table grants as explicit API surface, not harmless defaults.
4. Document intentionally exposed tables and RPCs in a provider-facing access matrix.

## Security-Definer Functions

Direct SQL summary:

| Metric | Count |
| --- | --- |
| Public security-definer functions | 96 |
| Security-definer functions without explicit `search_path` | 0 |
| Security-definer functions executable by `public` or `anon` | 32 |

The explicit `search_path` result is good. The remaining issue is execute exposure from the `public` schema. Security-definer helper functions can be safe, but they should not be exposed accidentally.

Functions called out by the parallel data-integrity lane for review include:

- `is_workspace_member`
- `can_edit_project`
- `current_project_access_rank`
- `can_access_project`
- `can_access_estimate`
- `resolve_collaboration_invitation`
- `current_user_profile`

Recommendation: for each security-definer function, classify one of:

- private helper, move to a non-exposed schema or revoke public execute;
- authenticated RPC, explicitly revoke public/anon and grant authenticated;
- anonymous RPC, keep exposed and document why.

## Auth Initplan Performance Debt

Recent migrations improved some `auth.uid()` initplan issues by wrapping helpers with `(select auth.uid())`, including teamspace and workspace membership paths.

Remaining evidence:

- Direct regex audit found 28 policy/helper bodies containing `auth.uid()` patterns, including some already-wrapped forms.
- The parallel advisor lane reported 13 remaining policy-level auth initplan warnings.

Representative open areas:

- `workspaces` insert policy.
- `profiles` select/update policies.
- AI audit policies.
- `beta_feedback_submissions`.
- storage bucket policies for project/component assets.

Recommendation: run the official Supabase performance advisor again after CLI auth stabilizes, then make one focused initplan migration for the remaining policy-level warnings. Do not combine this with migration-ledger repair.

## Mutable Search Path Advisor Items

The parallel advisor lane flagged mutable search path warnings for ordinary functions including:

- `resolve_app_role_for_email`
- `set_updated_at`
- `collaboration_role_rank`

These did not contradict the direct security-definer search-path check because the direct check was limited to security-definer functions. Treat this as a separate function hygiene pass.

## Storage

Live storage buckets:

| Bucket | Public | Object count |
| --- | --- | --- |
| `component-images` | true | 840 |
| `project-images` | false | 6 |
| `component-attachments` | false | 1 |

This matches the expected split: public component imagery and private project/attachment assets.

## Current Security Posture Summary

Closed beta acceptable with caveats:

- No evidence of RLS-disabled public tables.
- No public views needing `security_invoker` repair.
- No missing `search_path` on security-definer functions.
- Several exposed-schema function and grant decisions are still implicit rather than documented.
- Remaining initplan warnings are performance and maintainability debt, not an immediate data-access proof failure from the evidence gathered.
