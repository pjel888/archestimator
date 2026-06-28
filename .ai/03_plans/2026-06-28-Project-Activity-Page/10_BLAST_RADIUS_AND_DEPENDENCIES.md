# 10 — Blast Radius and Dependencies

## Affected surfaces

| Surface | Impact | Classification | Notes |
|---|---|---|---|
| `src/app/workshop/projects/[projectId]/activity/page.tsx` | Modified (placeholder → real Server Component) | Required change | The 15-line placeholder becomes the real route |
| `src/app/api/projects/[projectId]/activity/route.ts` | New authenticated GET loader | Required change | Load more cursor pagination; not public/unauthenticated |
| `src/app/workshop/projects/[projectId]/activity/loading.tsx` | New (route-level skeleton) | Probable change | Optional; if skipped, parent loading fallback is used |
| `src/components/workshop/project-activity/` (new directory) | New | Required change | Multiple subcomponents per `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` |
| `src/lib/repositories/project-activity-feed-repository.ts` | New | Required change | Server-only; multi-source read |
| `supabase/migrations/` | One scoped RPC migration | Required change | `read_project_collaboration_audit_events(...)`; optional index only with EXPLAIN evidence |
| `src/lib/supabase/types.ts` | Generated type update | Required change | RPC typing after migration |
| `src/components/workshop/ProjectMiniSidebar.tsx` | Verify-only | Verification only | Activity item already points at the new route |
| `tests/vitest/project-activity-page/` (new directory) | New | Required change | Repository + DOM + security tests |
| `package.json` | Unchanged | Verification only | No new deps |
| `src/lib/activity/` | Unchanged | Verification only | Reuse as-is |
| `src/lib/repositories/project-activity-repository.ts` | Unchanged | Verification only | Existing dashboard preview card still calls `listProjectActivityPage` |
| `src/lib/publisher/activity-repository.ts` | Unchanged | Verification only | Existing Publisher surface unchanged |
| `src/components/workshop/ProjectDashboardClient.tsx` | Unchanged | Verification only | Read-only adaptation reference |
| `src/components/workshop/estimate-sheet/activity-history.tsx` | Unchanged | Verification only | Read-only pattern reference |
| Public share routes (`/share/[token]/*`) | Unchanged | Verification only | Out of scope |
| Public share APIs (`/api/share/[token]/*`) | Unchanged | Verification only | Out of scope |
| Auth, account, settings, billing | Unchanged | Verification only | Out of scope |

## Downstream consumers

| Consumer of new surface | Coupling | Risk |
|---|---|---|
| None for v1 | — | — |

The new page is a leaf surface. Nothing depends on it yet.

## Backward compatibility

- The existing `/workshop/projects/{id}` dashboard preview card continues to use `listProjectActivityPage` (estimate-only). No regression.
- The Publisher surface continues to use `readPublisherWorkspaceActivity`. No regression.
- The estimate-sheet activity-history component is untouched. No regression.

## Documentation impact

- No user-facing docs required for v1.
- This plan pack is the canonical implementation-readiness doc.
- If implementation diverges, update this plan pack in place.

## Cross-feature dependencies

| Dependency | Status |
|---|---|
| Existing activity composer (`src/lib/activity/`) | Available, unchanged |
| Existing dashboard chrome | Available, unchanged |
| Existing UI primitives | Available, unchanged |
| Existing project dashboard Server Component | Available, read-only reference |
| Supabase generated types | Regenerate/update after RPC migration |

## Blast-radius classification summary

- **Required changes:** 1 route file + 1 authenticated loader + 1 client component directory + 1 repository file + 1 scoped RPC migration + generated types + 1 test directory.
- **Probable changes:** 1 loading skeleton (optional).
- **Verification-only:** everything else in the repo.
