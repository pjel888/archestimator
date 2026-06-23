# 13 - Security, Data, Network, And Provider Risk

## Boundary

The Library UI improvement is a visual/material/layout pass. It must not change Supabase schema, RLS, RPCs, storage policies, generated types, seed data, provider configuration, query keys, mutation semantics, route-state contracts, or authorization boundaries unless a later implementation brief explicitly expands scope.

## Live Surface Inventory

| Surface | Current anchors | Allowed UI work | Required invariant |
|---|---|---|---|
| Overview data | `src/app/workshop/library/page.tsx` calls `getLibraryOverview`; `src/components/workshop/library/overview/LibraryOverview.tsx` renders the shaped payload | Reskin overview shell, cards, skeleton, search placement | Do not fetch full component/template datasets for Overview; preserve shaped overview payload |
| Overview search | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx`; `searchLibraryOverview` in `src/lib/component-library/actions.ts` | Reskin input/popover and result rows | Preserve lazy search behavior, result deep links, and server-action boundary |
| Components cache | `src/components/workshop/LibraryPageClient.tsx`; `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` in `src/lib/component-library/query-keys.ts` | Class-only pane/card/dense/dock changes | Do not rename query keys, broaden invalidation, or add router refreshes |
| Templates browse cache | `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`; `WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY` | Wrap visual provider locally and reskin browse/gallery/preview | Do not change template data source, insert behavior, or cache key |
| Template Editor data | `src/components/workshop/library/template-editor/TemplateEditorClient.tsx`; `src/lib/component-library/template-editor-actions.ts` | Shell material, left rail, editor chrome, loading/error visuals | Preserve save state, drag/drop model, row mutations, and editor action invalidation |
| Mutating library actions | `assertCanManageLibrary` and related action guards in `src/lib/component-library/actions.ts` | No action changes in visual phases | Keep authorization and revalidation paths intact |
| Template editor authz | `requireWorkspaceTemplate` and `requireTemplateEditorAccess` in `src/lib/component-library/template-editor-actions.ts` | No action changes in visual phases | Every mutation remains scoped to the current workspace template |
| Upload routes | `/api/component-library/images`, `/api/component-library/attachments`, `src/components/workshop/library/AddComponentModal.tsx` | Only modal/drawer material if touched for visual parity | Do not alter storage routing, accepted file behavior, auth checks, or upload lifecycle |
| Browser dense proof setup | `e2e/workshop-library-routes.spec.ts` dense proof flags and Supabase service-role seed path | Use for implementation evidence only | Do not claim provider proof unless required env vars are present and the e2e passes |

## Forbidden Diff Checklist

Before each implementation phase exits, the diff must be checked for accidental changes to:

- Supabase migrations, RLS, RPCs, generated types, or provider project settings.
- `src/lib/component-library/query-keys.ts` except for a separate approved cache change.
- `src/lib/component-library/actions.ts` or `template-editor-actions.ts` except tests/documented visual-safe imports.
- Upload route handlers under `src/app/api/component-library/*`.
- Route-state names for add modals, filters, freshness/lifecycle/brand/search params, inspector selection, preview selection, or template editor route.
- Dense virtualization flags, dense row identifiers, or scroll container semantics.
- New network preloads, new image requests, or per-row blur/filter effects.

## Security And Data Proof Commands

Run these when implementation touches the named surface, and before any release claim for the visual pass:

```bash
bunx vitest run tests/vitest/library-route-state-authz.test.tsx tests/vitest/library-viewer-authz.test.tsx tests/vitest/template-editor-actions-authz.test.ts --maxWorkers=1
```

```bash
bunx vitest run tests/vitest/component-library-actions-revalidation.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/library-workspace-switch-cache.test.ts --maxWorkers=1
```

```bash
bunx vitest run tests/vitest/library-components-cache.test.tsx tests/vitest/library-templates-cache.test.tsx --maxWorkers=1
```

## Network And Performance Guardrails

- Overview remains lightweight. Reskinning must not introduce full-library client fetches.
- Components and Templates keep TanStack Query boundaries and invalidation behavior.
- Dense mode remains paper-like, with no per-row backdrop blur, large shadows, remote images, or layout-measuring effects.
- Loading/error states may be visually rebuilt but must not create extra data requests.
- E2E evidence that uses service-role seed paths is local/test evidence only; do not describe it as production or provider proof.

## Stop Conditions

Stop and re-plan before continuing if a visual change requires:

- Schema/RLS/RPC/storage-policy changes.
- New provider credentials or paid provider features.
- Action/authz rewrites.
- Query-key migration.
- New dependency adoption.
- A shared primitive behavior change before the Library-local slot contract is proven.
