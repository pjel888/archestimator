# Icon System And Asset Plan

## Icon Authority

App/workshop components should use Phosphor regular outline icons unless an existing component or owner-approved exception says otherwise. This overrides generic external-library icon defaults.

## Current Repo Evidence

- `package.json` includes Phosphor React usage.
- `DESIGN.md` specifies regular/outline icon posture for app/workshop UI.
- `components.json` names `lucide`, which is metadata from shadcn setup and must not override the app/workshop Phosphor rule without a future decision.

## Icon Storybook Scope

P0:

- Icon gallery by product category.
- Standard sizes.
- Color roles.
- Icon-only button examples.
- Tooltip examples for dense toolbars.
- Active/selected/disabled states.

P1:

- Domain icon sets for project, estimate, tree, library, share, notification, settings, import/export.
- Destructive/warning icons.
- Empty-state icons.

## Icon API Rules

- Icon-only controls require an accessible label.
- Decorative icons must be hidden from assistive technology.
- Do not mix icon libraries inside one component group without an explicit reason.
- Avoid filled/heavy icons in app/workshop unless a selected/filled state is specifically designed.

## Asset Rules

- Storybook stories use local placeholder assets or generated static fixtures only.
- No real customer images, project plans, share URLs, provider screenshots, or private proposal documents.
- Product/landing imagery is a separate `LANDING_ONLY` lane.

## Acceptance Criteria

- Storybook shows the approved icon style.
- Button/menu/table/tree stories use the same icon vocabulary.
- Any lucide/shadcn default icon usage is either replaced or explicitly justified.
