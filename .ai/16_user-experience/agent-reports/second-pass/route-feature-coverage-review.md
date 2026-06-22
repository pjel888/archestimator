# Second-pass UX Route Feature Coverage Review

## Scope
- Compare: `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv` against implemented routes in `src/app` and visible component surfaces in `src/components`.
- No canonical files were modified.

## Findings

| Severity | Missing / Weak Area | Evidence Paths | Suggested Canonical Row Changes |
|---|---|---|---|
| High | Duplicate/overbroad canonical route rows that are not actual paths | `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv` values: `/workshop and descendants`, `workshop layout`, `/workshop/onboarding redirect`, `/workshop/projects grouped mode`, `/workshop/projects/[projectId]/charts redirects to /data`, `share APIs`, `"/share/[token] password/session endpoints"` | Replace non-route descriptors with explicit route rows. Keep a separate “route scope”/notes column if needed instead of mixing behavior labels into route field. |
| High | Canonical route list missing explicit user-visible route entries | `src/app/invite/[token]/accept/route.ts`, `src/app/invite/[token]/continue/route.ts`, `src/app/invite/[token]/sign-out/route.ts`, `src/app/workshop/components/page.tsx`, `src/app/workshop/templates/page.tsx` | Add explicit rows for `/invite/[token]/accept`, `/invite/[token]/continue`, `/invite/[token]/sign-out`, `/workshop/components`, `/workshop/templates` (with redirect/alias behavior). |
| Medium | Canonical row “/workshop/onboarding redirect” does not match route; actual route is `/workshop/onboarding` that redirects | `src/app/workshop/onboarding/page.tsx` | Replace row value with `/workshop/onboarding` and include redirect target (`/workshop/settings`) in notes/behavior field. |
| Medium | Canonical lacks explicit API behavior rows for implemented, user-visible integrations | `src/app/api/projects/images/route.ts`, `src/app/api/component-library/attachments/route.ts`, `src/app/api/share/[token]/events/route.ts`, `src/app/api/component-library/images/route.ts`, `src/app/api/component-library/attachments/route.ts` | Add explicit rows for these APIs (or add them in an API subsection) if route inventory is expected to be complete. |
| Medium | Canonical likely misses explicit proposal export behavior user flow | `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/ProposalExportPreviewDialog.tsx`, `src/components/workshop/EstimateHeaderActions.tsx`, `src/components/workshop/use-estimate-header-actions-store.ts`, `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | Add a feature row for in-app export preview/download and corresponding API contract for `GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`. |
| Low | Redirect alias routes are represented only as notes, not concrete route rows | `src/app/workshop/components/page.tsx` redirects to `/workshop/library`, `src/app/workshop/templates/page.tsx` redirects to `/workshop/library/templates` | Add route rows for alias pages with behavior “soft redirect” to maintain feature coverage fidelity. |

## Suggested canonical updates (priority order)
1. Normalize `Route` values to concrete, discoverable paths only.
2. Add explicit invite sub-routes and workshop alias routes as separate rows.
3. Add missing API surface rows that are user-visible or directly tied to component workflows.
4. Add explicit proposal-export behavior row to cover the estimate sheet preview/download path + backend API action.

## Confidence
- High: route mismatches and duplicates are backed by concrete file paths under `src/app` and `src/components`.
- No behavior claims were inferred without evidence from those files.
