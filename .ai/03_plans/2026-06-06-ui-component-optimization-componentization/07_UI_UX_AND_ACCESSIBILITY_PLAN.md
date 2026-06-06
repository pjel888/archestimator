# UI/UX And Accessibility Plan

**Scope:** Future Storybook UI library and story review.
**Design authority:** `DESIGN.md` wins over external library defaults.

## UX Thesis

The library should make ArchEstimator's product UI quieter, denser, more aligned, and easier for future agents to reuse. It should not make the app look like generic marketing UI, oversized SaaS cards, or decorative component demos.

## App/Workshop Visual Rules

- Font: SF Pro for app/workshop surfaces.
- Type scale: compact; app title 12px, common controls/body/table around 10px, labels 8-9px unless `DESIGN.md` changes.
- Letter spacing: zero.
- Radius: compact, normally `rounded-xs` or equivalent 3px.
- Color: neutral, restrained, semantic only where useful.
- Icons: Phosphor regular outline style for app/workshop unless a specific existing component requires otherwise.
- Layout: dense, aligned, scannable, and work-focused.
- Cards: use only for repeated items, modals, or framed tools; avoid nested cards.

## Storybook Review UX

Future Storybook should be organized so Philip can review product decisions, not only React APIs.

Required navigation groups:

1. Foundations
2. Icons and assets
3. Actions
4. Forms
5. Menus and overlays
6. Navigation and layout
7. Data display
8. Trees
9. Domain components
10. Feedback and status
11. Motion and landing-only effects
12. Governance

Each story should show:

- Component purpose.
- Allowed use cases.
- Forbidden use cases when there is a common misuse.
- States and variants.
- Accessibility notes.
- Migration status: `STORYBOOK_ONLY`, `APP_APPROVED`, `DEFERRED`, or `LANDING_ONLY`.

## Accessibility Baseline

| Surface | Requirement |
|---|---|
| Buttons and icon buttons | Native button semantics, visible focus, accessible label for icon-only controls. |
| Inputs and selects | Programmatic label, helper/error association, keyboard operation, no placeholder-only label. |
| Menus | Arrow-key navigation, escape close, focus return, disabled item semantics. |
| Dialogs | Focus trap, escape close unless destructive flow blocks it intentionally, labelled title. |
| Toasts | Non-blocking status semantics, persistent option for critical messages. |
| Tabs | Arrow-key movement and selected panel relationship. |
| Trees | Expand/collapse keyboard support, selected/focused distinction, invalid drop target feedback. |
| Tables | Header semantics, row/cell focus plan for editable cells, sorted state when sortable. |

## Density And Alignment Rules

- Labels, inputs, helper text, and dropdown affordances must align in shared rows.
- Two controls on one row must plan label baselines, input heights, helper slots, and clear/dropdown icon inset together.
- Long labels and long values must not push icon buttons or paired controls out of alignment.
- Every fixed-format component needs stable sizing with `min`, `max`, grid tracks, or explicit aspect ratios where appropriate.

## Motion And Interaction Rules

- Motion is an enhancement, not a dependency of comprehension.
- All motion stories need reduced-motion behavior.
- App/workshop motion must be subtle: focus, disclosure, hover, status, and route transition polish only.
- Landing/marketing motion may be more expressive but remains separate from app/workshop components.

## External Library Adaptation

- shadcn/ui can inform component structure and Tailwind v4 conventions, but generated defaults must be restyled to ArchEstimator density.
- Flowbite can inform coverage categories and blocks, but app/workshop visuals must not inherit Flowbite's default large SaaS styling.
- Aceternity can inspire landing-only or review-only visual effects; do not add heavy motion to estimating workflows without a separate gate.

## Acceptance Criteria

- P0/P1 stories expose realistic ArchEstimator sizes, labels, empty states, and long-content states.
- Keyboard and focus behavior is documented before app migration.
- Components preserve `DESIGN.md` density in Storybook screenshots.
- Storybook review can reject a component without blocking unrelated components.
