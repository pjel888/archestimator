# Validation Matrix

**Last updated:** 2026-05-25

## Active code-change gate

For current Archestimator app/workshop code changes, run:

```bash
bun run validate
bun run build
git diff --check
```

`bun run validate` covers:

- TypeScript type-check
- ESLint
- app/workshop design-system lint, enforcing the non-landing SF Pro scale, regular/medium weights, xs radius, zero tracking, reference color tokens, and regular icon weights
- Bun unit tests
- Vitest DOM/helper tests

Add `bun run test:e2e` when auth, protected-route behavior, login rendering, route redirects, or other browser-only flows are changed. `test:e2e` is a separate Playwright command, not part of the default app gate.

## Current active route surface

```txt
/
/about
/features
/pricing
/contact
/login
/auth/callback
/privacy
/terms
/api/invite/[token]/accept, continue, sign-out
/share/[token]
/api/ai/ask
/api/ai/package-builder
/api/component-library/images
/api/component-library/attachments
/api/projects/images
/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx
/api/share/[token]                                   (publication access/snapshot/password/comment/decision/activity/events sub-routes)
/workshop
/workshop/onboarding                                  (redirects to /workshop/settings)
/workshop/projects
/workshop/projects/[projectId]
/workshop/projects/[projectId]/charts
/workshop/projects/[projectId]/estimates
/workshop/projects/[projectId]/estimates/[nodeId]
/workshop/library
/workshop/templates
/workshop/components                                  (redirects to /workshop/library)
/workshop/settings
/workshop/settings/profile
/workshop/settings/workspace
/invite/[token]
```

Do not use the old reset-era assumption that `/workshop` is intentionally blank or that `/workshop/projects` is deleted. The authenticated Supabase-backed workshop path is now active.

## Required checks for app/workshop UI changes

- Run `bun run lint:design-system` for every app/workshop UI change. `bun run lint:font-size` is an alias kept for older runbooks.
- No visible non-landing font size above `12px`; normal app/workshop controls/body/table/input/button text should remain around `10px`, subtitles around `11px`, and meta/helper labels around `8-9px`.
- Labels, eyebrows, metadata, helper copy, and muted subheaders must be smaller than the paired input/control/body text they describe; lint/test coverage must enforce role-specific hierarchy, not only the 12px ceiling.
- No non-landing font weight outside regular/medium, no nonzero tracking, and no mono/serif/Poppins app UI typography.
- No non-landing border radius outside `rounded-xs` / `3px`.
- No non-landing bold/fill/duotone icon weights.
- Shared primitives must be used or extended before creating repeated local controls:
  - `Button`
  - `ButtonLink`
  - `ControlField`
  - `ControlInput`
  - `ControlTextarea`
  - `CreatableCombobox`
  - `SearchInput`
  - `ControlSelect`
  - `Badge`
  - `Chip`
  - `EmptyState`
- Add or update tests when a feature adds a new reusable-control pattern.
- Do not create raw feature-local button/search/icon-button class strings.

## Required checks for feature areas

- Estimate sheet editing: run focused estimate-sheet Vitest coverage for touched behavior, preserve spreadsheet-like Enter/blur semantics, and avoid visible row-level save pills unless explicitly approved.
- Estimate tree: drag/drop reorder is active. If tree hierarchy, DnD, or reorder server actions are touched, run `tests/vitest/estimate-sheet-tree-dnd.test.tsx` and related estimate-tree tests, then verify hierarchy guards and route-backed selection.
- Estimate Activity: run version-control action/UI/schema tests. The current UI is one unified `Activity History` modal; do not reintroduce sheet `Versions`, `Compare`, restore-as-copy, or named-version actions without a new approved slice.
- Component Library/Templates: run focused component-library tests when editing `/workshop/library`, `/workshop/templates`, source repositories, variants, brands, suppliers, folders, images, attachments, or shared estimate-sidebar loading.
- Proposal export: run proposal-export model/workbook/preview/route tests when editing export code. Current export is a mutable current-estimate XLSX preview/download, not immutable issued proposal snapshots.
- Project charts: run project-chart tests when editing `/workshop/projects/[projectId]/charts`, D3 chart transforms, grouping, or chart UI.
- AI Ask-only: run focused `ai-*` Vitest tests when editing `/api/ai/ask`, `src/lib/ai/*`, prompts, audit persistence, or the floating copilot. Preserve no-write behavior, workspace auth, server-only provider keys, and metadata-only audit logging.

## Required checks for Supabase/Auth changes

- Never touch SlateCamp Supabase resources.
- Use project `ebxxqidacheyapmmzavr` only.
- Run migrations/types when schema changes:

```bash
npx supabase@2.98.2 db push
npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts
npx supabase@2.98.2 migration list
```

- Confirm RLS stays enabled on public app tables.
- Do not commit secrets or service-role keys.
- Hosted Supabase Auth redirect URLs require Dashboard verification before broader tester rollout.
- If a migration seeds rows and then enables RLS, force constraints immediate before enabling RLS.
- Treat local migration presence and linked-remote application as separate evidence; verify both before claiming remote Supabase state.

## Documentation-only changes

- Verify referenced paths exist.
- Ensure new files are in the correct `.ai` folder.
- Update feature specs and roadmap when implementation state changes.
- Run `git diff --check` before finalizing.

If the documentation change is meant to fix agent drift, degraded performance, stale context, or repeated mistakes, also verify:

- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` exists and is linked from `.ai/README.md` and `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`;
- the change identifies the active source of truth rather than adding another parallel instruction set;
- the final report states what remains unverified.

## Manual browser QA

For the current authenticated MVP path:

1. Public routes `/`, `/about`, `/features`, `/pricing`, and `/contact` render without auth.
2. `/workshop/projects` redirects signed-out users to `/login?next=/workshop/projects`.
3. `/login` renders compact magic-link UI.
4. After magic-link sign-in, `/workshop/projects` renders the live project form.
5. Creating a project redirects to `/workshop/projects/{projectId}`.
6. Opening estimates shows `/workshop/projects/{projectId}/estimates`.
7. Creating an estimate redirects to `/workshop/projects/{projectId}/estimates/{areaNodeId}`.
8. Opening `/workshop/projects/{projectId}/estimates/{nodeId}` renders only a node from an estimate owned by that project; mismatched project/node pairs return 404.
9. Tree items change the URL with `aria-current="page"` on the selected node, and content uses the route-loaded tree/rows.
10. Adding, replacing, deleting, or editing an estimate row persists the `estimate_row_items` record through TanStack Query mutation hooks, shows compact save state, and rolls back local optimistic state on failed saves.
11. Estimate-tree drag/drop reorder is available through React Complex Tree and the reorder server action; when touched, verify drop zones, hierarchy guards, route-backed selection, and Activity event persistence.
12. `/workshop/library` and `/workshop/templates` load separate component/template workspaces; `/workshop/components` redirects to `/workshop/library`.
13. `/workshop/projects/{projectId}/charts` renders project cost charts with route-owned project data.
14. Proposal XLSX export preview/download uses current estimate data and must not be represented as immutable issued-snapshot behavior.
15. The AI copilot can answer only; it must not mutate project, estimate, component, proposal, or user data.

## Estimation-domain claims

For cost, materials, labor, code, tax, or professional-practice claims:

- cite source and date;
- separate assumptions from verified facts;
- preserve calculation inputs and formulas;
- record uncertainty ranges when exact values are not reliable.
