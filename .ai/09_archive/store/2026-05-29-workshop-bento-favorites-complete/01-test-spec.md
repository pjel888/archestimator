# Test Spec

## Acceptance Criteria

- `/workshop` renders a full-width bento homebase, not a cramped upper-left starter panel.
- The search input is full width, with the existing header icon toolbar directly underneath.
- The page includes route tiles, favorite projects, favorite estimate sheets, project shortcuts, and estimate sheet shortcuts.
- Star buttons optimistically toggle favorite state and persist through server actions.
- Supabase migration creates RLS-protected `project_favorites` and `estimate_favorites` tables with authenticated select/insert/delete grants.
- Static guards prevent `Recent Projects`, `View all`, and the older root project gallery from returning.
- No visible text in the new workshop homebase exceeds `12px`.

## Verification

- Vitest DOM coverage for the homebase layout and star actions.
- Static schema coverage for migration, generated types, repository, and actions.
- Bun unit guard for the root workshop route contract.
- Typecheck and design-system lint.
- Browser smoke at `/workshop`.
