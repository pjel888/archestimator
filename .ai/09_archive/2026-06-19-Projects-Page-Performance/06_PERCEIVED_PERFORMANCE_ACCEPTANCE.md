# Perceived Performance Acceptance

Date: 2026-06-19. This is the UX acceptance surface for `/workshop/projects`.

## Required states

| State | Acceptance |
|---|---|
| Initial navigation | The workshop shell and projects skeleton appear without a blank page or layout jump. |
| Skeleton parity | Loading skeleton includes access tabs and card grid proportions matching the loaded page. |
| Images pending | Cards reserve stable space; late images do not move text/actions. |
| Image failure | A missing/private image degrades to the existing controlled fallback, not a broken layout. |
| Search/filter typing | Input remains responsive; render-count proof guards card-body churn. |
| Empty project list | Empty state remains visible and actionable. |
| Error state | Data/load errors show recoverable copy and do not crash the root shell. |
| Mobile | Cards, toolbar, tabs, and text do not overlap at narrow widths. |
| Keyboard/screen reader | Search, access tabs, menus, and card actions remain reachable and labelled. |
| Large list | Scrolling, menu portals, and focus behavior work with `content-visibility:auto`. **`manual-proof-pending`** (2026-06-19): no 100+ project fixture exists (RISK-15 feasibility-unproven); `content-visibility:auto` is self-correcting and menus portal out of the `contain:paint` card, so it is low-risk, but a one-time large-list browser spot-check is still owed. |

## Measurement acceptance

- Local production-build proof is enough for this pack's current claims.
- Hosted Vercel proof is required before claiming hosted production performance.
- Slow-3G proof is optional until it determines an implementation decision.
- Warm LCP ~4.4s is a real remaining cost, but it is not a launch blocker in this
  pack unless the owner explicitly gates release on an LCP threshold.

## Authz/RLS regression guard

When touching `workspace-repository.ts` again, prove the following after parallelization
or query-shape changes:

- `sharedProjects` remains scoped to projects the user can access.
- optional publication rows do not reveal inaccessible projects.
- pending collaboration visibility stays scoped to the current authenticated user.
- favorites and group membership reads preserve their previous empty-input behavior.

