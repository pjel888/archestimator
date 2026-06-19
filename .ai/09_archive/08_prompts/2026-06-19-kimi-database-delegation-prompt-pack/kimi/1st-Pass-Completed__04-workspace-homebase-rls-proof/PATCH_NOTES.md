# Patch Notes: Workspace Homebase RLS Proof

## File changed

- `scripts/prove-workshop-homebase-summary-postgres.mjs`

## What changed

### RLS modeling

Enabled row-level security on every table read by `public.workspace_homebase_summary`:

- `public.workspaces`
- `public.workspace_members`
- `public.projects`
- `public.project_members`
- `public.estimates`
- `public.estimate_sheet_members`
- `public.estimate_nodes`
- `public.project_favorites`
- `public.estimate_favorites`

Added minimal `select` policies for `authenticated`:

- `workspace_members_self_read`, `project_members_self_read`, `estimate_sheet_members_self_read` — each user sees only rows where `user_id = auth.uid()`.
- `projects_accessible_read` — project visible if caller is workspace member, project member, or estimate-sheet member of the project.
- `estimates_accessible_read` — estimate visible if caller can access the parent project or is an estimate-sheet member of the estimate.
- `estimate_nodes_accessible_read` — node visible if caller can access the parent estimate.
- `project_favorites_own_read`, `estimate_favorites_own_read` — each user sees only their own favorites.

### New test actor

Added `userD`, a sheet-only collaborator:

- Not a workspace member.
- Not a project member.
- Added to `estimate_sheet_members` for `estimateA` (in `projectA`) only.

### New assertions

Called `workspace_homebase_summary` as `userD` and verified:

- Sees `projectA` as a recent project.
- Does **not** see `projectB`.
- Does **not** see `estimateB`.
- Does **not** see `nodeB`.
- Does **not** see cross-tenant `estimateOtherTenant` or workspace B data.

### Preserved behavior

All existing assertions remain unchanged:

- Same-workspace favorite isolation.
- Cross-tenant non-member denial.
- Anon execute denial.
- Optional publication and pending invite exclusion.

## Verification

```bash
bun run prove:workspace-homebase-summary
```

Passed with exit code `0` and the new check `"sheet-only collaborator RLS containment"`.

`bun run type-check` passed after the RPC payload guard lane was tightened.
