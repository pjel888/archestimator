# 06 Test, Validation, and Release Readiness

## Acceptance Criteria

- User can open `/workshop/library` and click `Add Component`.
- A modal appears and supports identity, classification, pricing, lifecycle state, and review.
- Component can be assigned to:
  - selected library folder
  - taxonomy category node
  - supplier
- Component persists to Supabase.
- Component appears in the selected folder view after save.
- Component appears in supplier view when a supplier is selected.
- Component has at least one pricing option.
- Default pricing option is reflected in the center sheet price.
- Pricing changes are logged.
- Lifecycle state changes are logged with dates.
- Whole-component versions are created for create/update.
- Existing estimate rows do not silently change when component prices change.
- Component create/update writes are atomic through SQL RPCs or an equivalent database transaction boundary.
- Migration backfill creates exactly one default active price option, one version-1 snapshot, and one initial state-history row per existing component.
- Append-only history/version tables do not grant normal update/delete access.
- Existing estimate/template snapshots without version or price option ids still render and insert safely.

## Focused Tests

### Schema Tests

Add a migration schema test that checks:

- enum exists
- new columns exist
- new tables exist
- RLS is enabled
- authenticated grants exist
- RPC grants exist
- public/anon execute has been revoked from exposed mutation RPCs
- history/version table grants are append-only (`select`, `insert`) for normal authenticated access
- backfill statements exist
- active-price pointer is created only after price options exist, or is intentionally deferred
- default active price option uniqueness uses `where is_default and is_active`
- workspace consistency is enforced through composite FKs, constraint triggers, or equivalent database checks

### Repository Tests

Add tests for:

- default price option normalization
- fallback to legacy `unit_cost` when options are missing
- lifecycle state mapped into UI rows
- archived/discontinued rows are detectable

### UI Tests

Extend `/workshop/library` tests:

- Add Component action is visible in sheet tools.
- Modal opens.
- Modal uses the shared modal/dialog semantics and does not introduce a second modal root contract.
- Modal uses a wider bounded layout, sticky footer, initial focus, focus return, dirty-close protection, and disabled save while invalid/saving.
- Folder context preselects current folder.
- Supplier view preselects current supplier.
- Classification section exposes Library folder, Reporting category, and Supplier as distinct controls.
- Required validation blocks empty name/unit/price.
- Pricing option dropdown supports multiple options.
- Saved row appears in center sheet.
- State badge renders with compact app typography.
- History view renders as a list/timeline without needing a graph dependency.
- Center-sheet row anatomy stays compact and does not widen into a table-style layout.

### Server Action Tests

If test harness supports server actions:

- create component success
- invalid folder rejected
- invalid supplier rejected
- invalid category rejected
- no price option rejected
- default price option uniqueness enforced
- partial create failure does not leave orphan price/history/version rows
- default price change locks and updates the item/version/history rows atomically
- lifecycle state change locks and writes state history atomically

### Estimate Insertion Tests

Update focused insert tests:

- inserted row snapshot includes version and price option metadata
- changing source price option later does not mutate already inserted row
- stale/source-changed link state can be detected later without auto-mutation
- legacy snapshots without version/price option metadata remain readable
- estimate template snapshots remain readable and are either upgraded or explicitly left backward-compatible

## Manual QA

Run with local dev auth if needed:

- `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`
- `ARCHESTIMATOR_DEV_AUTH_EMAIL=philipjonlewis@gmail.com`
- `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` only when bootstrap/mutating route smoke requires it

Manual flows:

1. Open `http://localhost:3000/workshop/library`.
2. Select a library folder.
3. Click `Add Component`.
4. Save component with one default price.
5. Confirm row appears in selected folder.
6. Switch to Suppliers view.
7. Confirm row appears under selected supplier if supplier was assigned.
8. Edit/add another price option.
9. Confirm default price changes only when default option is changed.
10. Change state to discontinued.
11. Confirm state badge and history log.
12. Insert component into an estimate area.
13. Change library price.
14. Confirm existing estimate row remains at copied price.
15. Capture desktop and narrow viewport screenshots of the sheet, modal, and history view.
16. Verify Escape/scrim behavior while dirty and while saving.
17. Verify long category/folder names do not overflow modal or sheet rows.

Note from second-pass verification: `curl -I --max-time 5 http://localhost:3000/workshop/library` and `/workshop/components` timed out in this session, so browser smoke remains a required implementation-phase check after starting a fresh dev server with the correct protected-route env.

## Release Gates

Required:

- `git diff --check`
- focused Vitest set
- `bun run validate`
- `bun run build`
- Supabase advisors or documented MCP fallback
- browser smoke on `/workshop/library` after starting a clean dev server
- linked Supabase migration applied only when explicitly moving from plan to implementation

Docs after implementation:

- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- relevant active feature spec if source-of-truth changed

## Stop Conditions

Stop and re-plan if:

- price/version migration cannot be made atomic
- RLS cannot be verified
- active price option design conflicts with estimate insertion snapshots
- UI modal grows beyond a coherent single workflow
- code graph impact returns high/critical risk for shared insertion paths
