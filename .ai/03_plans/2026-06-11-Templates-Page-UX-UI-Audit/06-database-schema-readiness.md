# Templates Page — Database Schema Readiness

**Date**: 2026-06-11  
**Project**: Supabase `ebxxqidacheyapmmzavr`  
**Mode**: Read-only schema verification. No migrations, DDL, DML, or production mutations were run.

---

## Live Table Counts

| Table | Exact count |
|-------|-------------|
| `public.estimate_templates` | 3 |
| `public.estimate_template_nodes` | 10 |
| `public.estimate_template_row_items` | 15 |

This corrects the earlier audit's stale 14-node claim.

## RLS And Policies

| Table | RLS enabled | Policy summary |
|-------|-------------|----------------|
| `estimate_templates` | Yes | Authenticated workspace members can manage rows where `is_workspace_member(workspace_id)` |
| `estimate_template_nodes` | Yes | Authenticated workspace members can manage nodes through the parent template's workspace |
| `estimate_template_row_items` | Yes | Authenticated workspace members can manage rows through the parent template's workspace |

Readiness interpretation:

- The template tables are protected by RLS.
- Policies are workspace-membership based and cover `ALL` operations for authenticated users.
- The future implementation must include negative tests for anonymous and non-member read/write denial.

## Grants And Effective Access

| Area | Finding | Readiness implication |
|------|---------|-----------------------|
| Table grants | `anon` and `authenticated` roles have broad table privileges on template tables | RLS should still block anonymous access because policies target authenticated users, but this must be proven with an anon-client test |
| RPC execute grants | `insert_estimate_template_into_estimate_with_history` is executable by `authenticated`, not `anon` | Apply-template handoff can reuse the existing authenticated RPC path |
| Legacy/plain RPC | `insert_estimate_template_into_estimate` is not executable by `anon` or `authenticated` | The page should not expose the plain RPC directly |

## RPCs

| Function | Security mode | Use |
|----------|---------------|-----|
| `insert_estimate_template_into_estimate(target_project_id, target_estimate_id, target_parent_node_id, source_template_id)` | Not security definer | Plain insertion function; not currently granted to app roles |
| `insert_estimate_template_into_estimate_with_history(target_project_id, target_estimate_id, target_parent_node_id, source_template_id, acting_user_id, correlation_id)` | Security definer | Existing history-aware insertion path used by server action |
| `validate_estimate_template_tree(target_template_id)` | Not security definer | Integrity validation helper |

Readiness requirement: before adding any new use path, prove the existing server action validates project, estimate, target parent node, source template, and workspace membership under the same workspace boundary.

## Indexes

| Table | Relevant indexes |
|-------|------------------|
| `estimate_templates` | Primary key; `(workspace_id, sort_order, name)` |
| `estimate_template_nodes` | Primary key; `(template_id, id)` unique; `(template_id, parent_id, sort_order)`; unique sort per template/parent |
| `estimate_template_row_items` | Primary key; `(template_id, template_node_id, sort_order)`; unique sort per node; category, source library item, supplier indexes |

## Required DB Tests

| Test | Purpose |
|------|---------|
| Authenticated workspace member can list templates/nodes/rows | Proves expected read path |
| Anonymous user cannot list template data | Proves RLS + grants effective behavior |
| Non-member authenticated user cannot list or mutate another workspace's templates | Proves tenant isolation |
| Member can apply a template only into an estimate in the same workspace | Proves RPC boundary |
| Member cannot apply a template into a non-group target node | Preserves domain rule from estimate editor |
| Option B only: create/edit/delete preserve node and row sort constraints | Preserves tree integrity if management scope is approved |

## Project-Level Security Advisor Notes

Read-only Supabase inspection also surfaced project-level advisories outside the template tables:

- `public.profile_role_hardening_audit` has RLS disabled.
- Multiple unrelated functions appear in security-advisor warnings.
- Leaked-password protection is disabled.

These are not direct blockers for the Templates page plan, but they are beta-readiness risks and should be tracked separately. This audit must not mutate those settings without owner approval.

