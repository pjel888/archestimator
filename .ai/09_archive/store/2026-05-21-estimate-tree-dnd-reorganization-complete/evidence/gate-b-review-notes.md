# Gate B Review Notes

Branch: `feat/estimate-tree-dnd-gate-b`
Date: 2026-05-20

## Independent review pass

A delegated senior code review inspected the uncommitted Gate B DnD implementation across:
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/estimate-tree-reorder.ts`
- `supabase/migrations/20260520231000_reorder_estimate_nodes_rpc.sql`
- DnD unit/component/action/e2e tests

### Blocker found

The first review found that `reorder_estimate_nodes` is `SECURITY INVOKER` and calls `public.validate_estimate_node_tree(target_estimate_id)`, while `validate_estimate_node_tree(uuid)` had been revoked from `public` in the prior two-kind migration and was not granted to `authenticated`.

Expected runtime failure for normal authenticated users:
`permission denied for function validate_estimate_node_tree`

### Fix applied

The reorder RPC migration now includes:

```sql
grant execute on function public.validate_estimate_node_tree(uuid) to authenticated;
```

This keeps the function unavailable to anonymous/public while allowing the invoker-mode reorder RPC to call the validation function for authenticated users.

### Post-fix review

A second delegated review verified:
- `reorder_estimate_nodes` remains invoker-mode by default.
- It calls `validate_estimate_node_tree(target_estimate_id)`.
- The new migration grants `validate_estimate_node_tree(uuid)` execute to `authenticated`.
- The earlier migration still revokes execute from `public`.
- `validate_estimate_node_tree` is also invoker-mode and reads RLS-protected tables, so this grant does not obviously bypass tenant isolation.

Post-fix reviewer result: approval; previously identified blocker resolved.

## Remaining verification limitation

Browser DnD could not be executed in this session because dev-auth/admin prerequisites were not configured. The opt-in Playwright DnD spec was added and skipped by design without:
- `ARCHESTIMATOR_E2E_MUTATING_DND=1`
- `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`
- `ARCHESTIMATOR_DEV_AUTH_EMAIL`
- `SUPABASE_SERVICE_ROLE_KEY`

The spec is ready to validate no document reload, no main-frame navigation, zero tree blank frames, optimistic DOM reorder, saved status, and persistence after reload once those env keys are available.
