# Landing Page Design Standards

Date: 2026-06-22
Scope: `.ai/03_plans/2026-06-22-LandingPage`

This document pins the existing Archestimator landing-page design standards so the
landing plan does not drift from the current product language.

## Source Of Truth

- `DESIGN.md` remains the broad visual direction. It is alpha-stage guidance, but
  it is still the best canonical reference for landing vs. app/workshop rules.
- `src/app/globals.css` is the live token source for colors, landing typography,
  spacing, radius, glass, and Tailwind v4 theme bridges.
- `src/app/layout.tsx` is the live font-loading source.
- `.ai/10_state/current-state.md` currently says the public homepage uses
  `src/components/landing/gpt-taste/RedesignedLandingPage.tsx` through
  `src/app/page.tsx`.
- Do not treat `.ai/03_plans/2026-06-21-Landing-Page-Redesign` as active visual
  direction unless Philip explicitly re-approves it. Stable tokens may still be
  referenced when they match live source.

## Current Landing Direction

The active homepage reset is the GPT Taste landing direction:

- cinematic hero with sparse, launched-feeling copy;
- halftone/material signal field;
- strict framed/gapless bento grid;
- pinned proof-card stack;
- horizontal role accordion;
- marquee band;
- real product/proof language only, with no fake logos, fake testimonials, or
  stage-language masquerading as launch proof.

Implementation anchor: `src/components/landing/gpt-taste/RedesignedLandingPage.tsx`.

## Brand Color

Use Archestimator Signal orange. Do not revive clay/terracotta as the brand
accent.

| Purpose | Token / utility | Value | Rule |
| --- | --- | --- | --- |
| Signal presence | `--brand-orange`, `text-brand-orange`, `bg-brand-orange`, `--landing-accent` | `#F24405` | Fills, tints, large/display accents, focus rings, logo/presence marks, animated signal field. |
| AA-safe orange ink | `--brand-orange-dark`, `text-brand-orange-dark`, `--landing-accent-aa` | `#C63804` | Small text and icons on light backgrounds. |
| Soft orange tint | `--brand-orange-soft` | `color-mix(in srgb, #F24405 14%, white)` | Background glows, quiet accent fields, not core text. |

Important constraints:

- `#F24405` is mid-luminance. Use it as a presence/fill/display color, not as
  small normal text on white.
- Use `#C63804` for orange labels, captions, small icons, and numeric badges on
  light surfaces.
- Do not use `#AA412A` as the product or landing accent.
- Do not make the page read as construction-orange. Signal orange should feel
  technical, precise, and premium, not safety-vest or hardware-store.
- The current GPT Taste reset often uses black/white CTAs and reserves Signal
  orange for the material field, labels, marks, and proof accents. Orange primary
  CTAs are still landing-approved when the art direction calls for them, but they
  must use the token pair above.

## Neutral Palette

Landing can be more expressive than the app/workshop UI, but it still sits on the
same disciplined neutral base:

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--landing-canvas`, `--canvas`, `--warm-canvas` | `#F5F5F5` |
| Surface | `--surface` | `#FFFFFF` |
| Strong ink | `--landing-ink`, `--ink` | `#3D3D3D` |
| Secondary ink | `--landing-ink-secondary`, `--secondary` | `#5D5D5D` |
| Muted ink | `--landing-ink-muted`, `--muted-foreground` | `#6B6B6B` |
| Hairline | `--landing-hairline`, `--hairline` | approx. `#F2F2F2` |
| Strong hairline | `--landing-hairline-strong` | approx. `#E8E8E8` |

The active GPT Taste page also uses sharper launch-neutral values such as
`#111111`, `#121212`, `#EEF0F3`, and translucent white glass. Keep these tied to
the current implementation instead of inventing a new palette.

## Typography And The Robotic Font

Fonts loaded at the root:

- `Doto` via `next/font/google` as `--font-doto`.
- `Roboto Mono` as `--font-roboto-mono`.
- `Geist` as `--font-geist`.
- SF Pro system stack as `--font-sf-pro`.

Font roles:

| Role | Utility / token | Use |
| --- | --- | --- |
| Robotic / technical display | `font-display`, `--font-display` | Doto-first mechanical display voice. Use for robotic/editorial moments, footer/status statements, architecture/technical headings, and deliberate brand moments. Do not use for body copy. |
| Current landing display bridge | `font-landing-display`, `--font-landing-display` | Currently resolves to Geist then SF Pro. The GPT Taste reset uses this for large neutral hero/section type. |
| Numeric voice | `font-numeric`, `--font-numeric`, `--font-landing-numeric` | Roboto Mono for counts, ordinals, codes, small telemetry labels, and estimate-like numeric signals. |
| UI/body voice | `font-landing-ui`, `--font-landing-ui`, SF Pro stack | Nav, forms, body prose, buttons, compact labels. |

Practical rule: when Philip says "the robotic font thing", that means the Doto
display voice. Use it intentionally through `font-display` or by deliberately
remapping/using a Doto-backed landing display token. Do not accidentally assume
every current `font-landing-display` heading is Doto; the live bridge is Geist.

Landing type scale from live tokens:

- Hero display: `--landing-text-display` = `clamp(2.75rem, 5.5vw + 1rem, 5.5rem)`.
- Secondary display: `--landing-text-display-s` = `clamp(2.25rem, 4vw + 1rem, 3.75rem)`.
- Section headline: `--landing-text-headline` = `clamp(1.875rem, 2.6vw + 1rem, 2.8125rem)`.
- Title: `--landing-text-title` = `clamp(1.375rem, 1.4vw + 1rem, 1.75rem)`.
- Lead/body: `--landing-text-body-lg` = `clamp(1.125rem, 0.4vw + 1rem, 1.25rem)`;
  `--landing-text-body` = `1.0625rem`.
- Caption floor: `--landing-text-caption` = `0.875rem`; label floor:
  `--landing-text-label` = `0.75rem` for UI labels only.

Typography discipline:

- Landing pages may be editorial and large; app/workshop 12px caps do not apply.
- Keep body copy short, calm, and readable.
- Use Doto only at sizes where its technical/robotic form remains legible.
- Use Roboto Mono for numeric/status texture, not paragraph prose.
- Avoid Poppins, generic heavy marketing display type, and arbitrary one-off
  font stacks.

## Layout, Shape, And Motion

Live landing primitives:

- Maximum content width often uses `max-w-[1720px]` on the GPT Taste reset.
- Dense/bento cards use framed panels, 1px hairlines, translucent white/glass,
  and tight seams.
- Landing radius tokens:
  - `--landing-radius-dense` = `3px`;
  - `--landing-radius-pill` = `8px`;
  - `--landing-radius-panel` = `12px`.
- Section spacing uses `--landing-section-pad-y` and `--landing-section-pad-x`
  plus the `--landing-space-*` scale.
- Header/nav sits on frosted/translucent white glass with restrained shadow.
- Motion can use GSAP on the landing page, but must keep reduced-motion fallback.
- Three.js/WebGL signal effects must degrade safely when WebGL is unavailable,
  on mobile, or under reduced motion.

## Imagery And Product Visuals

Use visual assets that show the product, the estimate workflow, or a precise
technical signal. Preferred directions:

- real Archestimator surfaces: estimate grid, project tree, revision diff,
  proposal preview, cost library, provider/source context;
- screenshot-like UI compositions in neutral product frames;
- monochrome architectural or botanical line illustration where useful;
- sparse halftone/dot fields and tiny orange asterisk/presence marks;
- material/signal fields using Signal orange and warm amber/peach support tones.

Avoid:

- cartoon construction workers;
- blueprint cliches;
- stocky 3D mascots;
- heavy glossy shadows;
- neon glow;
- generic dashboard clutter;
- fake proof logos or testimonials.

## Copy And Claims

Active narrative: Archestimator is a cost intelligence / commercial memory layer
for AEC estimating teams. Current safe proof case is construction estimating,
but do not reduce the brand to "construction cost calculator."

Landing copy should be:

- sparse;
- specific;
- launched-feeling;
- proof-led only when proof is real;
- grounded in shipped or safely described capabilities: prices, suppliers,
  assemblies, revisions, proposal history, reusable commercial memory.

Do not imply unshipped purchase-order execution, legal-document automation,
immutable issued snapshots, mature compliance, or customer proof that does not
exist.

## Acceptance Checklist

Before implementation or review, confirm:

- Signal orange uses `#F24405` / `#C63804` tokens, not clay `#AA412A`.
- Any "robotic font" use is Doto-backed and intentional.
- `font-landing-display` vs. `font-display` is chosen deliberately.
- Small orange text/icons use the dark AA token.
- The page follows the current GPT Taste reset unless Philip approves a new
  direction.
- The design uses real product/proof surfaces or precise technical signal
  visuals.
- Reduced-motion and WebGL fallback are preserved for animated/3D effects.
- No fake proof, generic construction tropes, or stale archived landing plan
  direction has been reintroduced.
