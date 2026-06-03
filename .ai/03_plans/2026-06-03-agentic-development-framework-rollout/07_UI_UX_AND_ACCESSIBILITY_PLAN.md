# UI, UX, and Accessibility Plan

**Date:** 2026-06-03
**Scope:** Workflow/docs plan. App UI is N/A for this planning task.

## Planning-task UI status

- No `src/app` or `src/components` UI code changes are in scope.
- No app behavior, dependencies, migrations, generated files, or runtime configuration are in scope.
- Any future internal admin/workflow UI must be separately planned and tested.

## Future internal UI constraints

If a future ADD enforcement/admin surface is added, it must follow `DESIGN.md` and `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`:

- SF Pro stack for non-landing app/workshop UI.
- Regular/medium weights only.
- Visible app/workshop text maximum 12px unless explicitly approved.
- Normal controls/body/table/input/button text around 10px.
- Labels/meta/helper text around 8-9px and never larger than paired controls.
- Zero letter spacing.
- xs/3px radius only.
- Phosphor regular outline icon style.
- Reuse `src/components/ui` and `src/components/workshop` primitives before creating local controls.
- `bun run lint:design-system` failures are blocking.

## Accessibility requirements for future workflow UI

- Keyboard-visible focus for branch/release/admin controls.
- Accessible names for evidence links and status chips.
- No color-only pass/fail status.
- Confirmation dialogs for branch/protection/provider-affecting actions.
- Respect reduced motion.

## Validation

Future UI changes require `bun run lint:design-system`, focused Vitest DOM coverage, and Playwright/browser verification when the behavior is user-flow-visible.
