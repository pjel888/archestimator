# Visual QA And Review Workflow

## Purpose

Give Philip an inspectable Storybook review path before any production app migration.

## Review Phases

1. **Foundation review**
   - Colors, typography, density, radius, focus, icons.
   - Stop if this does not match `DESIGN.md`.

2. **P0 primitive review**
   - Buttons, fields, badges, menus, modal, tooltip, toast, empty/loading states.
   - Stop if compact app/workshop tone is wrong.

3. **P1 composition review**
   - Tabs, table, tree shell, app shell, toolbar, layout.
   - Stop if alignment/overflow breaks.

4. **Domain story review**
   - Project, estimate, component library, share, notifications, release modal stories.
   - Stop if fixtures imply production data or if route behavior appears changed.

5. **Migration readiness review**
   - Only after Storybook approval.
   - Separate future plan required.

## Evidence To Capture

- Storybook local URL.
- Static build result.
- List of stories completed.
- Screenshots or review notes for rejected components.
- Accessibility and keyboard checklist status.
- Reduced-motion review for motion stories.
- Known gaps and deferred items.

## Visual Failure Examples

Reject a component if it:

- Uses oversized external-library spacing.
- Uses rounded card-heavy SaaS styling.
- Breaks form row alignment.
- Allows text overlap in buttons, cards, rows, or toolbars.
- Uses icon style inconsistent with the app/workshop rules.
- Hides focus state.
- Requires hover-only affordances for critical actions.
- Looks like a marketing block inside app/workshop UI.

## Approval Labels

- `APPROVED_FOR_STORYBOOK_MVP`
- `NEEDS_REVISION`
- `REJECTED_FOR_APP_WORKSHOP`
- `LANDING_ONLY`
- `DEFERRED`
