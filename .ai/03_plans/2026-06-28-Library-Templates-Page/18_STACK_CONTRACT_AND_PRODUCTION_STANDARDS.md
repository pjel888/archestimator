# Stack Contract And Production Standards

## Stack Baseline

Project baseline:

- Next.js 16
- React 19
- Bun
- TypeScript
- Tailwind v4
- TanStack Query
- Supabase/Postgres

## Next.js Local Docs Reviewed

Per AGENTS.md, local Next docs were checked before planning framework-sensitive changes:

- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
- `node_modules/next/dist/docs/01-app/02-guides/prefetching.md`
- `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`

Implications:

- Keep data fetching in Server Components where credentials/query logic belong.
- Keep interactivity in Client Components at narrow boundaries.
- Server Functions/Actions are directly reachable and must verify auth/authz.
- Disabled/manual prefetch is valid when resource use matters.
- Route transition claims require local Suspense/cache/instant-navigation proof, not assumption.

## Design System Contract

Implementation must use existing local primitives before creating new ones:

- `ResizableSidePanel`
- `TreePanelHeader`
- `LibrarySurfaceVariantProvider`
- `librarySurfaceClass`
- `EstimateRightSidebar`
- existing estimate-sheet presentational row components where relevant
- existing modal/confirm/input/button primitives

Do not add new UI libraries or dependencies.

## Security And Authz Contract

- Client UI gating is not security.
- Every server action remains responsible for auth/authz.
- Viewers/members can browse/preview templates if current RLS allows it.
- Editors/admins can mutate templates.
- Direct POST/server action calls must fail closed for unauthorized users.
- Project tab reads must be scoped to authorized project/workspace context.
- Template-workbench `Project` means reusable estimate-source structures from authorized projects. Do not reuse estimate-route `projectId`/`estimateId` semantics unless an active project/estimate scope truly exists.

## Data Integrity Contract

- Reusable templates are workspace-scoped estimate-structure bundles, not cost library rows.
- Templates are copied into estimates/templates as snapshots.
- Source templates are not mutated by insertion.
- No new schema work is needed for conservative UI transition.
- Integrated editor expansion must address transaction/concurrency semantics before stronger parity claims.

## Performance Contract

- Lazy-load right dock data.
- Do not render inactive hidden tree branches.
- Keep cached query keys partitioned by scope.
- Avoid broad refreshes in browse route mutations.
- Measure route transitions only when implementation changes route behavior.
- For `/workshop/library/templates`, `TemplatesBrowseManager` owns source-dock intent state; component library data loads with the workspace-lite key after intent, and selected project-source data uses a user/workspace/project key after project selection.

## Design Quality Contract

- Compact authenticated-app UI.
- No centered marketing cards for the primary workspace.
- No nested card clutter.
- No construction cliches.
- No fake project imagery/assets.
- No one-note palette drift.
- No visible text overlap or cramped controls.
- Text and icon controls must fit at supported desktop/laptop widths.
