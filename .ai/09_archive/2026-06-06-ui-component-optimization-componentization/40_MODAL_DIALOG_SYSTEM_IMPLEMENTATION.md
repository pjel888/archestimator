# Modal Dialog System Implementation

**Date:** 2026-06-07 local / 2026-06-07Z
**Branch:** `feat/storybook-complete-ui-component-system`
**Status:** STORYBOOK_ONLY_IMPLEMENTED_REVIEW_READY

## Scope

This continuation implements the reusable modal, dialog, popup, sheet, and
nonblocking overlay system required by the UI component library prompt. The
implementation is Storybook-first and does not migrate production routes.

## Components Added

| Surface | File | Contract |
|---|---|---|
| Dialog primitives | `src/components/ui/overlays/dialog.tsx` | Headless-ish composition primitives for portal, overlay, content, header, title, description, body, footer, actions, close button, Escape close, overlay close, and focus return. |
| App modal | `src/components/ui/overlays/modal.tsx` | `AppModal`, `BlurModal`, and compatibility `Modal`; blurred backdrop is default, with size, tone, footer, scroll body, and destructive role support. |
| Confirm dialogs | `src/components/ui/overlays/confirm-dialog.tsx` | `ConfirmDialog`, `AlertDialog`, `DeleteConfirmDialog`, `UnsavedChangesDialog`; confirm callbacks run before closing unless busy. |
| Resizable/floating modal | `src/components/ui/overlays/resizable-modal.tsx` | `ResizableModal`, `FloatingModal`, `PopupWindow`; no blur by default, optional overlay, CSS resize, min/max constraints, and tool-window positioning. |
| Sheet/drawer | `src/components/ui/overlays/sheet-drawer.tsx` | `Sheet`, `Drawer`, `SidePanel`, `InspectorDrawer`; right, left, bottom, inspector, form/table/loading/error/no-blur states. |
| Popover | `src/components/ui/overlays/popover.tsx` | Anchored compact dialog-like popover with controlled/uncontrolled open state and footer slot. |
| Tooltip | `src/components/ui/overlays/tooltip.tsx` | Hover/focus tooltip that pins for Storybook states and applies `aria-describedby` to valid trigger elements. |
| Hover card | `src/components/ui/overlays/hover-card.tsx` | Hover/focus metadata preview card with title and description support. |
| Command dialog | `src/components/ui/overlays/command-dialog.tsx` | Static grouped `CommandDialog`, `CommandPalette`, and `CommandMenu`; no `cmdk` dependency. |

`src/components/ui/modal.tsx` remains a compatibility barrel exporting
`AppModal`, `BlurModal`, and `Modal` so existing importers continue to work.

## Storybook Coverage

Required overlay titles and exports are now enforced by
`scripts/check-storybook-component-coverage.mjs`:

- `Overlays/DialogSystem`: `HeaderLayout`, `CloseButtonPosition`,
  `WithDescription`, `InternalScroll`, `FooterActions`, `Sizes`, `Tones`,
  `LongContent`, `AccessibilityNotes`.
- `Overlays/AppModal`: `Default`, all size presets, fullscreen, blur/no-blur,
  form/table/loading/error/destructive states.
- `Overlays/ResizableModal`: default, no backdrop, transparent overlay,
  small/medium/large, min/max, inspector popup, floating tool window, footer,
  scroll, resize notes, and keyboard focus.
- `Overlays/ConfirmDialog`: default, destructive, destructive alias, busy,
  error, unsaved changes, long content, and focus notes.
- `Overlays/SheetDrawer`: right, left, bottom, inspector, form, table, loading,
  error, and no-blur.
- `Overlays/Popover`, `Overlays/Tooltip`, `Overlays/HoverCard`, and
  `Overlays/CommandDialog` have real component stories rather than deferred
  static previews.

## External Source Posture

- shadcn/Radix patterns informed the composition and accessibility posture, but
  no new Radix package was added.
- Flowbite remains a breadth/reference source only.
- Aceternity remains a motion/reference source only and is not used in
  app/workshop overlays.
- No `cmdk`, Motion, Flowbite, Aceternity, or new package dependency was added.

## Verification

Fresh evidence for this overlay system:

- `bun run storybook:check-components` passed with 41 required standalone
  titles checked.
- `bun run type-check` passed.
- `bunx vitest run tests/vitest/ui-modal-tooltip.test.tsx tests/vitest/storybook-component-coverage.test.ts --maxWorkers=1`
  passed with 11 tests.
- `bun run storybook:check-boundary` passed with 75 files scanned.
- `STORYBOOK_DISABLE_TELEMETRY=1 bun run build-storybook -- --output-dir /tmp/archestimator-storybook-static-overlays`
  passed.
- Local Playwright static Storybook smoke passed for 8 overlay families across
  desktop and mobile, with screenshots in
  `/tmp/archestimator-storybook-overlay-smoke/*.png`.
- `bun run validate` and `bun run build` passed.

## Boundary

This is implementation evidence for the Storybook component library only. It is
not production route migration approval and does not prove hosted/provider
behavior.
