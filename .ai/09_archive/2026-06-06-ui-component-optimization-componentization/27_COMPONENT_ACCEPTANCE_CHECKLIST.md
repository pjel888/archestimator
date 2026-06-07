# Component Acceptance Checklist

Use this checklist per component or story group.

## Required

- [ ] Component purpose is clear.
- [ ] Component belongs to the right priority group.
- [ ] Component follows `DESIGN.md`.
- [ ] Component uses approved token and icon rules.
- [ ] Component has Storybook stories for required states.
- [ ] Story uses static fixtures only.
- [ ] Accessibility behavior is documented.
- [ ] Keyboard behavior is documented for interactive components.
- [ ] Long labels/content do not overlap or resize layout badly.
- [ ] Loading/disabled/error/empty states are covered when relevant.
- [ ] Tests exist or a no-test rationale is recorded.
- [ ] Migration status is set.
- [ ] Rollback notes exist if production adoption is planned later.

## Required Story States By Type

| Type | States |
|---|---|
| Button/IconButton | default, hover/focus, disabled, loading, danger, long label |
| Field | empty, filled, disabled, readonly, invalid, helper/error |
| Menu | closed, open, focused, disabled item, destructive item |
| Modal | open, closed, busy, error, destructive |
| Toast | info, success, warning, error, persistent |
| Table | loading, empty, sorted, selected, overflow, inline edit |
| Tree | expanded, collapsed, selected, empty, invalid target |
| Domain block | loading, empty, populated, error, long data |

## Rejection Criteria

Reject or defer if:

- It violates `DESIGN.md`.
- It depends on live provider data.
- It hides focus.
- It has inaccessible icon-only actions.
- It imports server-only code into Storybook.
- It requires unapproved packages.
- It changes production app routes during MVP.
