# Design System Alignment Specialist Plan

## Goal

Keep notification UI inside the Archestimator product design system: quiet, dense, neutral, and suitable for repeated workshop use.

## Source Of Truth

- `DESIGN.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/VALIDATION_MATRIX.md`
- Existing primitives in `src/components/ui/`

## Required Visual Rules

- Font family: product SF Pro stack through existing app styles.
- Visible app text: 12px maximum.
- Body/list/control text: around 10px.
- Meta/chip/helper text: 8-9px.
- Font weights: regular or medium only.
- Letter spacing: zero.
- Radius: `rounded-xs` / 3px.
- Dominant colors: `#292929`, `#5D5D5D`, `#7F7F7F`, `#F5F5F5`, `#F2F2F2`, white.
- Status color only for real semantic severity.
- Icons: Phosphor regular weight unless the repo changes icon library before implementation.

## Forbidden UI Choices

- New UI dependency.
- Marketing-style hero/card layout.
- Floating promotional widget.
- Cards inside cards.
- Gradient/orb/bokeh backgrounds.
- Oversized release headline.
- Raw external link display.
- Notification center rows larger than the surrounding workshop density.
- Negative tracking.
- Rounded values larger than xs.
- Toast replacement for durable notification rows.

## Component Dimensions

Recommended starting dimensions:

- Bell button: 28px square or matching existing toolbar icon button height.
- Badge: stable min width, 8-9px text, no header layout shift.
- Center panel: compact width, max height with internal scroll.
- Release modal: existing `Modal` default `max-w-md` unless content proves otherwise.
- Row padding: 8px or less when aligned with existing compact surfaces.

## Class Scan

Before PR, inspect notification files for:

- `text-[13px]` or larger.
- `tracking-` except `tracking-normal`.
- `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`.
- gradient utilities.
- shadow-heavy decorative treatment.
- feature-local raw button classes where `Button` should be used.

## Required Commands

```bash
bun run lint:design-system
bun run test:dom -- tests/vitest/release-announcement-modal.test.tsx tests/vitest/notification-center.test.tsx tests/vitest/workshop-notification-entry.test.tsx
```

Run broader `bun run validate` before PR unless the owner explicitly accepts a narrower gate.

## Manual Review Checklist

- Header title remains readable with bell and existing actions.
- Badge count does not shift layout from `0` to `9+`.
- Empty, loading, error, read, unread, and dismissed states look like product UI.
- Release modal feels like a system notice, not a marketing popup.
- The notification center does not hide `Send beta feedback`, `AskFlip`, project totals, or route loading.

## Stop Gates

- Stop if design-system lint fails on notification files.
- Stop if UI requires a new generic primitive and that primitive is not tested.
- Stop if notification UI looks visually louder than primary estimating controls.
