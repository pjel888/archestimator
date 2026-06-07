# Design Token And Theming Plan

## Token Thesis

ArchEstimator tokens should be extracted from current product rules, not copied from external libraries. Tailwind v4 and CSS variables should express existing decisions from `DESIGN.md`, `src/app/globals.css`, and the design-system lint script.

## Token Sources

| Source | Use |
|---|---|
| `DESIGN.md` | Visual authority for app/workshop and landing distinctions. |
| `src/app/globals.css` | CSS variables, Tailwind v4 theme surface, global styles. |
| `scripts/enforce-app-design-system.mjs` | Enforced density, font-size, radius, icon, and tracking constraints. |
| `components.json` | shadcn alias/style metadata; not visual authority over `DESIGN.md`. |

## Required Token Stories

- Color roles.
- Text roles.
- Radius and border.
- Spacing/density.
- Focus ring.
- Z-index/layering.
- Shadow/elevation.
- Typography.
- Motion duration/easing.

## App/Workshop Token Rules

- Neutral product palette.
- Compact type scale.
- Zero letter spacing.
- Small radius.
- Strong visible focus.
- Semantic colors only for status/risk/action meaning.
- Avoid one-note palettes and decorative gradient/orb backgrounds.

## Landing Token Rules

Landing can use more expressive composition and imagery, but it must remain separate from app/workshop tokens. Landing-only effects must be marked `LANDING_ONLY` in Storybook.

## Tailwind v4 Strategy

- Prefer CSS variable backed tokens.
- Keep Storybook CSS loading aligned with app globals.
- Avoid introducing a separate token source that diverges from `DESIGN.md`.
- If a token file is added in future implementation, document whether it is generated, hand-authored, or derived from CSS.

## Acceptance Criteria

- Storybook token stories match app/workshop screenshots visually.
- The lint script still passes.
- P0 primitives consume the same token names/roles.
- External components are restyled to ArchEstimator tokens before review.
