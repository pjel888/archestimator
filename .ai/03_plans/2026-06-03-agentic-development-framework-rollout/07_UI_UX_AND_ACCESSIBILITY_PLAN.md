# UI, UX, and Accessibility Plan

## Current task UI status
N/A for this docs-only plan refinement. No user-facing screen, component, route, form, or visual behavior changes are authorized.

## Future internal UI implications
If ArchEstimator adds an internal agent dashboard/run-log viewer, it must support:
- Run list by date/branch/agent/mode/status.
- Evidence drawer with commands, exit codes, graph outputs, validation, bug links, commit/push status.
- Provider-proof status clearly separated from local proof.
- Keyboard navigable tables, focus order, visible focus, empty/loading/error states, responsive behavior.

## ArchEstimator design-system constraints
For any non-landing app/workshop UI:
- Follow `DESIGN.md`.
- SF Pro stack.
- Regular/medium weights only.
- 12px maximum visible app/workshop text unless explicitly approved.
- Normal controls/body/table/input/button text around 10px.
- Labels/meta/helper text around 8–9px.
- Zero letter spacing.
- xs/3px radius only.
- Phosphor regular outline icon style.
- Reuse `src/components/ui` and `src/components/workshop` primitives before local controls.
- `bun run lint:design-system` failures are blocking.

## Accessibility checks for future UI
Keyboard operation, focus trap/restoration for dialogs, semantic headings, accessible names, contrast, reduced-motion where relevant, error announcements, and no pointer-only controls.
