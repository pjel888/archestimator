# 10 - Blast Radius and Dependencies

## Affected surface classification

| Surface | Change type | Files / systems | Justification |
|---|---|---|---|
| `shared_link_recipients` schema | Additive index only | 1 migration | Email-only lookup needs `lower(email)` index |
| `shared_link_recipients` RLS/grants | No policy/grant changes | None | Manager-oriented RLS remains intact; RPC bypass is scoped |
| `project_publications` schema | No schema change | None | Action reads `status`, `encrypted_token`, and token metadata server-side |
| List RPC `list_recipient_publications_for_current_user` | New | 1 migration | Recipient inbox read path; no credentials returned |
| Authorization RPC `authorize_recipient_publication_for_current_user` | New | Same migration | Confirms signed-in recipient owns the target publication before action bridge |
| Generated Supabase types | Updated | `src/lib/supabase/types.ts` | Must regen after migration applies |
| Repository | New | `src/lib/repositories/recipient-proposals-repository.ts` | Server-only RPC adapter and DTO mapping |
| Server Function loader | New | `src/lib/recipient-proposals/actions.ts` | Client TanStack Query refetch boundary |
| Route | New | `src/app/workshop/proposals/page.tsx`, `loading.tsx` | Authenticated recipient inbox |
| Client components | New | `src/components/workshop/proposals-page/*` | List rendering and states |
| Server Action bridge | Additive | `src/lib/publication/actions.ts` | Same-tab Review bridge into existing share session |
| Sidebar nav | Additive edit | `src/components/sidebar/MainSidebar.tsx` | Add Proposals above Publisher |
| Existing `/share/[token]` route | Verification only | No edit | Must continue working for anonymous and signed-in recipients |
| Existing `/workshop/projects` and Publisher | Verification only | No edit | Scopes stay separate |

## Direct impact

### Database layer

- One additive migration, no table rewrites.
- Two new functions:
  - `list_recipient_publications_for_current_user(page_limit int default 50)`
  - `authorize_recipient_publication_for_current_user(target_publication_id uuid)`
- One new index:
  - `shared_link_recipients_lower_email_idx on lower(email)`

### Application layer

- Server Component route and small client boundary.
- TanStack Query refetch through an explicit `"use server"` loader, matching existing client/server function patterns.
- Server Action bridge reuses existing publication security helpers and cookie helper.
- No new HTTP Route Handler.
- No new dependency.

### Test layer

- Provider SQL proof for RLS/function behavior.
- Unit/action tests for bridge outcomes and leak prevention.
- DOM tests for route states.
- Sidebar test for nav order/shortcuts.
- Browser smoke for real click-through/session behavior.

## Transitive impact

| Area | Effect | Mitigation |
|---|---|---|
| Generated types | New RPC signatures appear in `Database["public"]["Functions"]` | Run `bun run gen:types` after migration |
| Sidebar prefetch | New route is auto-included from `sidebarNavItems` | Static/sidebar test |
| Active state | Existing `isActiveHref` handles `/workshop/proposals/*` | Static/sidebar test |
| Closed-beta gate | Signed-in recipients may need allowlist access | Operational allowlist process in `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` |
| Concurrent sidebar redesign branch | `MainSidebar.tsx` may conflict | Rebaseline before Phase 5 |
| Token/session helpers | Action depends on existing helper signatures | Stale-plan checklist and action tests |

## Backward compatibility

- Anonymous `/share/[token]` flow remains unchanged.
- Existing recipient cookies remain valid.
- Existing publication RPCs remain callable.
- Publication manager recipient views remain unchanged.
- Sidebar change is additive, with shortcut shift intentionally owner-delegated.
- Rollback drops only new functions/index and reverts additive app files.

## Cross-feature conflicts

- Future estimator-side Sent view remains in Publisher.
- Future Google-as-password/share-link-login work remains separate.
- Future email-change handling may add `claimed_user_id`; this plan's email match remains a v1 MVP choice.
- Future realtime inbox updates can build on the Server Function/TanStack boundary.

## Documentation impact after implementation

- Append `.ai/10_state/current-state.md`.
- Append `.ai/10_state/decisions.md`.
- Optionally add route to project root `README.md`.
- Do not change `DESIGN.md` or `AGENTS.md` for this feature unless implementation uncovers a durable policy/design decision.
