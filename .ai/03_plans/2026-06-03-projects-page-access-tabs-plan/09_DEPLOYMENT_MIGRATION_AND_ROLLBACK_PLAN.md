# 09 Deployment, Migration, and Rollback Plan

## Deployment considerations

This is a standard application deployment with no provider setup. Expected changed production files are limited to:

- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/LiveProjectCard.tsx` if favorite suppression is implemented there
- `tests/vitest/projects-page-access-tabs.test.tsx`
- `.ai` docs/tasks/logs/state

No dependency install. No lockfile update. No environment variable. No database migration.

## Migration steps

None for the tab feature.

Explicitly do not create migrations unless scope changes to shared favorites or collaboration data model changes. If that happens, stop and create a new migration/security plan.

## Feature flags

No feature flag recommended. The feature is low-risk UI organization and can be reverted cleanly. A feature flag would add complexity and is not necessary.

## Backward compatibility

Must preserve:

- `/workshop/projects` route.
- `ProjectsPageClient` props shape.
- Existing `ProjectListItem` shape.
- Bare `Tables<"projects">` fallback support.
- Project card links.
- Pending invite Accept/Expired UI.
- Project creation modal action.
- View-mode localStorage key.
- Search input behavior.

## Rollback process

If deployed behavior is wrong:

1. Revert the feature commit.
2. Redeploy the previous build.
3. No database rollback required.
4. No env rollback required.
5. Verify:

```bash
bun run type-check
bun run lint
bun run test:dom --maxWorkers=1
bun run validate
```

Manual rollback smoke:

- `/workshop/projects` opens.
- Existing cards render.
- Existing view modes work.
- Create project still opens modal.
- Pending invites still render from homebase/Projects where applicable.

## Post-deploy checks

After deployment, verify with at least these user states:

1. **Owned-only user**
   - `Your Projects` active.
   - Owned cards visible.
   - Shared tab empty copy visible when clicked.

2. **Mixed owned/shared user**
   - `Your Projects` shows owned only.
   - `Projects shared to you` shows project-member/sheet-member/pending-invite only.
   - Counts match visible records before search.

3. **Shared-only user**
   - `Projects shared to you` active on load.
   - Shared card opens the project route.

4. **Pending invite user**
   - Pending invite appears in shared tab.
   - Accept button works or routes according to existing invite flow.

5. **Keyboard/accessibility smoke**
   - Tab/arrow navigation moves between tabs.
   - Focus ring visible.
   - Screen reader dev tools show tab/panel labels.

## Operational risks

| Risk | Operational response |
|---|---|
| Users ask where `All` went. | Explain project ownership is now split by context; no data removed. If demand is high, consider a future `All` view in a separate decision. |
| Shared-only collaborator sees empty page. | Should be prevented by defaulting to shared tab. If reported, hotfix default-tab logic. |
| Shared favorite missing. | Intentional for now due data model. Track under bug/future enhancement. |
| Search confusion. | Improve empty copy or add a small `Search applies to this tab` hint if user feedback shows confusion. |

## Release checklist

Before merge/deploy:

- [ ] Focused DOM tests added and passing.
- [ ] `bun run type-check` passing.
- [ ] `bun run lint` passing.
- [ ] `bun run lint:design-system` passing.
- [ ] `bun run validate` passing or documented unrelated baseline failures.
- [ ] Manual browser smoke performed for owned/shared/pending cases if test data exists.
- [ ] `.ai/15_Bugs/...shared-project-favorite...` status updated.
- [ ] `.ai/05_logs/...` records commands and results.
- [ ] No migrations or dependency changes included.

## Rollback acceptance

Rollback is successful if the previous Projects page behavior returns and validation passes. Because no data or schema changes occur, rollback does not risk data loss.
