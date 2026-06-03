# 05 Blast Radius and Risk Analysis

## Affected user flows

| Flow | Impact |
|---|---|
| Open `/workshop/projects` as an owner with owned projects | Page now opens `Your Projects`; owned cards should remain visible with existing view modes and favorite controls. |
| Open `/workshop/projects` as a collaborator with shared but no owned projects | Page should open `Projects shared to you` by default instead of showing an empty owned state. |
| Open `/workshop/projects` with mixed owned/shared projects | User can switch between ownership contexts; no `All` list. |
| Search projects | Search now filters within active tab only. Users must switch tabs to search the other collection. |
| Accept pending invite from Projects page | Pending invite cards remain in shared tab with existing Accept/Expired controls. |
| Create project | Toolbar Add action remains available; owned empty state can still open `NewProjectModal`. |
| Toggle project favorite | Owned project favorite must keep working; shared project favorite must not render broken action unless separately implemented. |
| Change project view mode | View-mode localStorage behavior applies to both tabs. |
| Expand project details | Existing `ProjectDetailsModal` should work for visible owned/shared project cards where allowed. |

## Affected modules/components/services

| Module | Why affected | Risk |
|---|---|---:|
| `src/components/workshop/projects-page-client.tsx` | Primary implementation file: state, tabs, filtering, empty states, card rendering. | High |
| `src/components/workshop/LiveProjectCard.tsx` | Favorite control safety for shared cards. | Medium |
| `src/components/workshop/WorkshopCollectionLayout.tsx` | Should be reused through `toolbarPanel`; no code change expected. | Low |
| `src/app/workshop/projects/page.tsx` | Should remain unchanged; verify no server changes needed. | Low |
| `src/lib/repositories/workspace-repository.ts` | Data source for owned/shared records; should remain unchanged. | Medium if touched |
| `src/lib/workshop/actions.ts` | Existing favorite action is workspace-bound; should remain unchanged if shared favorites are suppressed. | Medium |
| `tests/vitest/projects-page-access-tabs.test.tsx` | New tests. | Low |

## Affected tests

Existing test commands affected:

- `bun run type-check`
- `bun run lint`
- `bun run lint:design-system`
- `bun run test:dom`
- `bun run validate`

New focused test file:

- `tests/vitest/projects-page-access-tabs.test.tsx`

Potential E2E impact:

- Any Playwright test that assumes all projects appear on first page load may need to switch tabs if it is looking for a shared project. Use `rg "workshop/projects|Projects|Owned|Shared|All" e2e tests` before coding.

## Build/runtime behavior impact

- No server bundle change expected if `src/app/workshop/projects/page.tsx` remains unchanged.
- Client bundle impact should be negligible: tab state and one local component; no new dependency.
- No database query count increase.
- No route count increase.
- No migration.
- No new environment variable.

## Possible regressions

| Regression | Severity | Likelihood | Mitigation |
|---|---:|---:|---|
| Owned users cannot find shared projects because `All` tab is gone. | Medium | Medium | Counts and clear tab labels make the split obvious; this matches requested IA. |
| Collaborator-only users land on empty owned tab. | High | Medium | Default active tab to shared when owned count is zero and shared count > zero. |
| Search appears broken because it filters only one tab. | Medium | Medium | Empty copy should say which tab was searched and prompt switching tabs if appropriate. |
| Pending invites disappear from Projects page. | High | Low | Shared tab includes `pending-invite`; test it. |
| Favorite button disappears from shared projects and surprises users. | Low/Medium | Medium | This is intentional risk control; document as temporary until shared favorites are designed. |
| Favorite button remains on shared projects and fails. | High | High if not addressed | Bug plan created; add DOM assertion. |
| Keyboard tab navigation fails accessibility expectations. | Medium | Medium | Add keyboard tests for Arrow/Home/End. |
| Tab panel IDs duplicate when multiple ProjectsPageClient instances render in tests. | Low | Low | Use deterministic IDs and a single instance per page; React `useId` optional. |
| Existing modal dynamic import breaks tests. | Low | Medium | Mock `next/dynamic` only if test render fails; do not open modals except create-action test if covered. |

## Edge cases

1. **No projects at all:** `Your Projects` active; show existing sample/reference pattern and create action. `Projects shared to you` tab empty with invitation copy.
2. **Only shared projects:** shared tab active by default; owned tab available with create-project empty state.
3. **Only pending invites:** shared tab active by default and shows invite cards.
4. **Only sheet-level access:** shared tab shows cards with `Sheet-only` badge and shared sheet count.
5. **Mixed project-member and sheet-member:** shared tab includes both with existing badges.
6. **Expired pending invite:** shared tab shows disabled Expired button through `LiveProjectCard`.
7. **Published shared project:** shared tab preserves shared-link badge if `publicationSummary.status === "published"`.
8. **Search returns zero in active tab but other tab has matches:** empty state should not claim no projects globally.
9. **localStorage unavailable:** existing view-mode code already catches localStorage errors; keep that behavior.
10. **Favorite action race:** owned favorite behavior already has optimistic override and rollback; keep unchanged.

## Risk severity and likelihood

| Risk | Severity | Likelihood | Owner | Mitigation |
|---|---:|---:|---|---|
| Shared favorite bug exposed | High | High | Implementation agent | Suppress shared favorite controls or implement shared favorites fully. |
| Wrong tab grouping | High | Medium | Implementation agent | Use `accessKind === "owned"`; test all four access kinds. |
| Accessibility incomplete | Medium | Medium | Implementation agent | Implement full tab/panel attributes and keyboard tests. |
| Empty state confusion | Medium | Medium | Implementation agent/product | Use explicit tab-aware copy. |
| Over-touching repository/data layer | Medium | Low | Implementation agent | Keep server/repository unchanged unless verified bug requires change. |
| Test fragility due Next dynamic | Low | Medium | Implementation agent | Mock dynamic import if needed. |

## Rollback strategy

Because this feature should not include migrations or dependencies, rollback is simple:

1. Revert changes to `src/components/workshop/projects-page-client.tsx`.
2. Revert any narrow `LiveProjectCard.tsx` favorite-control change.
3. Remove `tests/vitest/projects-page-access-tabs.test.tsx`.
4. Re-run:

```bash
bun run type-check
bun run lint
bun run test:dom --maxWorkers=1
bun run validate
```

No database rollback, environment rollback, or deployment flag rollback is required.

## Monitoring/logging considerations

No new runtime logging is required. The tab is client UI state only. If future analytics are added, track only tab changes/counts without project IDs or collaborator emails; not needed for this task.
