# Testing And Verification Plan

**Scope:** Future Storybook-first UI Component Library MVP.
**Current refinement status:** Documentation only.

## Verification Thesis

The future implementation is successful only when the component library is inspectable in Storybook, static stories cover the P0/P1 surface, accessibility checks are recorded, and production app behavior remains unchanged.

## Current Docs-Only Verification

Run before closing this planning pass:

```bash
git status --short --branch
git diff --check
git diff -- .ai
```

Expected result:

- Only intended `.ai` documentation changes are present.
- No `src/`, `app/`, `package.json`, `bun.lock`, config, migration, provider, generated type, or secret file is changed.
- Markdown diff has no whitespace errors.

## Future Implementation Verification Sequence

1. **Pre-edit evidence**
   - `pwd`
   - `git status --short --branch`
   - `git worktree list`
   - `git log --oneline -5`
   - code-review graph impact for intended shared UI files
   - GitNexus impact for each function/class/symbol before editing it

2. **Package/config proof**
   - `bun install` after approved package changes
   - `bun run storybook` starts locally after scripts exist
   - `bun run build-storybook` succeeds after scripts exist

3. **Static quality checks**
   - `git diff --check`
   - `bun run lint:design-system`
   - `bun run lint` if available
   - `bun run typecheck` if available
   - `bun run validate`

4. **Unit and DOM tests**
   - Focused tests for any changed primitives.
   - Existing DOM/UI suites for Button, modal, tooltip, toast, header icon toolbar, component library manager, library folder tree, estimate tree/sheet, and share tree surfaces when those files are touched.
   - New tests for shared behavior introduced by the library.

5. **Storybook review**
   - P0 stories render with default, hover/focus, disabled, loading, empty, error, and long-label states where applicable.
   - P1 stories render with controls and static fixtures.
   - No story reads live Supabase/provider data.
   - Philip can inspect stories before migration is considered.

6. **Accessibility verification**
   - Keyboard navigation recorded for menus, dialogs, tabs, tree shells, comboboxes, toasts, and table controls.
   - Reduced-motion behavior recorded for motion-enabled stories.
   - Storybook accessibility addon or equivalent a11y checks run if package-approved.

7. **Build and route safety**
   - `bun run build` passes.
   - `bun run test:e2e` is required only if the future agent touches production app routes, which is outside MVP scope.

## Regression Locking Rules

- Add or extend tests before changing high-impact primitives.
- Do not rely on visual inspection alone for behavior that has keyboard, focus, disabled, loading, or mutation semantics.
- For shared components, test both successful and invalid prop/state combinations when the code path can affect app behavior.
- For domain stories, use static fixture builders and never import server actions.

## Minimum Storybook Story States By Component Type

| Component type | Required states |
|---|---|
| Action | default, hover/focus-visible, disabled, loading, icon-only, long label |
| Form field | empty, filled, disabled, readonly, invalid, helper text, long value |
| Menu | closed, open, focused item, disabled item, destructive item |
| Dialog | closed, open, busy, validation error, destructive confirmation |
| Toast/feedback | info, success, warning, error, timed, persistent |
| Table/grid | empty, loading, sorted, selected, overflow, inline-edit error |
| Tree/domain | empty folder, expanded, collapsed, selected, drag target, invalid target |
| Navigation | selected, collapsed, overflow, keyboard focus |

## Stop Conditions

Stop and write a blocker note if:

- Storybook cannot start because of package/runtime compatibility.
- Tailwind v4 styles do not load in Storybook.
- Storybook stories require live auth/provider state.
- A shared primitive change has HIGH/CRITICAL graph or GitNexus impact and lacks targeted tests.
- Production app migration is attempted before Philip approves Storybook.
