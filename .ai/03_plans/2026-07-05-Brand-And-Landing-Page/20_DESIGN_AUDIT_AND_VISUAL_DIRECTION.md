# 20 — Design Audit and High-End Visual Direction

**Source authority:** `03_SOURCE_AND_CODEBASE_AUDIT.md` (current landing-v3 audit), `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` (existing token direction), `src/components/landing-v3/ArchestimatorLandingPage.tsx` and `landing-v3.module.css` (current implementation), `DESIGN.md` (alpha-stage design system).
**Plan kind:** Planning-only. No code, tests, migrations, or provider state touched.
**Founder sign-off required for:** OPEN-DEC-009 (visual archetype selection), OPEN-DEC-010 (mono font replacement), OPEN-DEC-011 (nav architecture change).

---

## 0. 2026-07-06 continuation correction

This section supersedes the earlier warm editorial-luxury and Double-Bezel guidance wherever it conflicts. The user has explicitly said the above-the-fold hero is visually strong. The corrected plan therefore preserves the hero composition and improves the surrounding brand, copy, and design system without repainting the page into a generic cream/espresso luxury template.

### 0.1 Non-negotiable preservation

- Preserve the hero architecture: mountain image, estimate-sheet/product mockup, layered hero stage, and three compact behavior cards.
- Preserve `HeroEstimateWorkspaceMockup` as the primary above-the-fold proof object. Do not replace it with screenshots, SVG illustration, abstract cards, or a marketing graphic.
- Preserve the first-viewport product signal: visitors should immediately understand that Archestimator is an estimating/proposal workspace, not a consulting landing page.
- Improve hero copy, CTA hierarchy, fake metric treatment, nav/button consistency, and responsive text fit around the existing visual composition.

### 0.2 Corrected visual thesis

Archestimator should read as a **precision commercial instrument for AEC teams**: quiet, architectural, credible, and product-led. The earlier "warm editorial-luxury" pass had useful intent, but it over-indexed on paper, cream, espresso, large radii, and decorative depth. That creates a one-note palette and a boutique-agency feel instead of a durable estimating product.

Use this corrected direction:

| Area | Corrected rule |
|---|---|
| Palette | Keep the current cool canvas / paper / ink / signal-orange backbone. Warmth may appear in small surface tints only; do not turn the page beige, cream, tan, or espresso-dominant. |
| Card shape | Replace "Double-Bezel everywhere" with a precision frame: 8px major radius, 6px inner radius, 1px hairlines, restrained shadow, no nested cards inside cards. The hero mockup may keep its existing radii because it is a product stage, not a repeated card primitive. |
| Type | Hero H1 remains the largest type. Use media-query steps or container-aware values, not viewport-width font scaling. Letter spacing stays 0 except uppercase labels may use positive tracking. |
| Hero copy | H1 max 2 lines. Subhead max 20 words. Hero should have no more than 4 visible copy elements before the CTAs. |
| Eyebrows | No repeated section-number eyebrows. Use at most 1 eyebrow every 3 sections. The three hero cards may keep `01`, `02`, `03` as product-sequence ordinals. |
| Proof | No fabricated metrics, demo adoption numbers, logos, testimonials, or "illustrative" counters. Behavior previews and real product screenshots are allowed. |
| Buttons | Primary, secondary, and "Sign in" must share the same geometry family. Use an icon island only when it improves affordance; do not overdecorate every button. |
| Motion | Keep existing hero motion. Add scroll reveal only if it is lightweight, reduced-motion compliant, and worth the implementation cost. |
| Validation | For this planning pass, browser proof is not required. Implementation later needs browser proof only for interaction, responsive layout, or visual claims that static review cannot prove. |

### 0.3 Design-system preflight for implementation

Before changing landing source, the executor must verify these checks against the implementation diff:

1. The hero estimate-sheet mockup is still above the fold on desktop and mobile.
2. The H1 is still the largest text on the page.
3. The hero subhead fits in 3 lines or fewer at mobile widths and stays under 20 words.
4. "Sign in" and the primary CTA look intentionally related.
5. No visible copy uses em dash separators, fake precision, or beta-apology phrasing.
6. No new font dependency is introduced without explicit approval.
7. Repeated cards use 8px radius or less unless the existing hero mockup requires a larger product-frame radius.
8. The palette does not read as a single warm beige/cream/tan theme.

---

## 1. Executive summary

The current landing page (`src/components/landing-v3/`) has a strong **hero concept** — the product mockup, the mountain photography, and the three feature cards are the best part of the page and should be preserved. The rest of the public surface suffers from **inconsistent typography, mismatched interactive elements, generic SaaS styling, and a visual system that reads closer to a well-built template than a $150k agency build**.

This document audits the current visual execution line-by-line, selects a unifying high-end archetype, and defines the target visual direction. It then updates the implementation plan so the visual work happens **before** the heavy copy recasts, not as a late polish pass.

**Key findings:**
1. The typography scale is internally inconsistent and several headings are oversized.
2. The "Sign in" button is visually unrelated to the primary CTA.
3. The navigation is an edge-to-edge sticky bar, not a floating island.
4. `Roboto Mono` — a banned font under the active high-end visual design skill — is used for CTAs, kickers, metric labels, and the audience banner.
5. Generic 1px grey borders and harsh drop shadows dominate the component language.
6. There is no Double-Bezel machined-card architecture and no consistent button-in-button trailing-icon pattern.
7. Scroll-entry animation is absent outside the hero mount; most sections appear statically.
8. Section spacing is tight for a premium landing page.
9. The mobile menu is a bare `details`/`summary` dropdown, not a fluid modal expansion.
10. The HeroMetricCards still carry fake animated counters that the copy plan already says must be removed.

**Target state:** a precision editorial landing surface with the existing hero mockup preserved, a disciplined type scale, consistent CTA geometry, credible product proof, restrained architectural frames, and product-led copy that feels established without inventing maturity signals.

---

## 2. The variance archetypes selected

**Status:** Historical audit note. The corrected active archetype is `Precision Editorial` in §0 and `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` §0. The warm-commercial details below explain the earlier pass, but they are not the implementation default.

To satisfy the active skill's variance mandate, the following archetypes are **consciously selected** and recorded as owner decisions.

### 2.1 Vibe Archetype: Editorial Luxury (warm-commercial)

**Why this fits Archestimator:** AEC buyers (architects, QS, GCs, project managers) are used to physical documents: BOQs, specification binders, finish schedules, signed proposals. A warm, paper-like editorial language feels familiar and expensive, not like another dark-mode AI SaaS.

**Palette:**
- Background canvas: `#F7F5F0` (warm, slightly desaturated paper — current `--canvas: #eef0f3` shifts warmer).
- Surface: `#FFFBF7` (soft cream, replaces pure white `#FFFFFF`).
- Ink: `#2C2C29` (deep espresso, not the current neutral `#3D3D3D`).
- Secondary ink: `#5E5C57` (warmer grey).
- Muted: `#8A8780`.
- Hairline: `#E3DDD2` (warm, barely-there).
- Signal accent: `#E84A0C` (current orange, desaturated one step for editorial compatibility).
- Signal wash: `color-mix(in srgb, #E84A0C 8%, #F7F5F0)`.
- Dark section (workflow, final CTA): `#1A1917` (soft black, not `#161616`).

**Texture:** a fixed, `pointer-events-none` subtle film-grain overlay (`opacity: 0.025`, `mix-blend-mode: multiply`) on the whole landing root, and a very faint paper-fibre grid instead of the current hard 32px engineering grid. The grain is **fixed only**, never attached to scrolling containers.

### 2.2 Layout Archetype: Asymmetrical Bento + Editorial Split

**Hero / Proof / Feature cards:** use an asymmetrical bento grid with deliberately unequal cell sizes (e.g., `col-span-5 row-span-2` next to stacked `col-span-3` cards) to break visual monotony. The current hero metric cards already hint at this but are too uniform in their internal grid.

**Feature chapters:** use an Editorial Split — massive typographic copy block on the left (`w-1/2` above `md:`), interactive screenshot/visual on the right, alternating order for rhythm.

**Mobile collapse (below `768px`):** all asymmetry falls back to `w-full`, single-column stack, `px-4`, `py-8`. No rotations, no negative-margin overlaps. Hero cards stack vertically. Feature chapters become full-width vertical stack: copy first, visual second.

---

## 3. Current-state audit

### 3.1 Typography: inconsistent scale and oversized headings

**Current code:**
- `landing-v3.module.css:357-368` — hero H1: `clamp(2.35rem, 2.15vw, 2.625rem)`.
- `landing-v3.module.css:1536-1541` — section H2s (Problem, SectionHeader, FeatureChapter, FinalCta): `clamp(2.45rem, 4.5vw, 4.7rem)`.
- `landing-v3.module.css:1662-1671` — workflow step number: `2.5rem`; step H3: `clamp(1.25rem, 2vw, 1.7rem)`.
- `landing-v3.module.css:1017-1025` — HeroMetricValue: `1.625rem`.
- `landing-v3.module.css:1261-1275` — HeroMetricTitle: `1.25rem` uppercase.
- `landing-v3.module.css:344-355` — eyebrow/kicker: `0.72rem` uppercase.

**Problems:**
1. The section H2 can grow to `4.7rem`, which is **1.8× the hero H1 maximum**. On desktop the page feels like it is shouting at the reader two screens down.
2. The workflow step ordinal (`2.5rem`) is larger than the step heading below it, inverting hierarchy.
3. The hero metric value (`1.625rem`) competes with the H1 at certain viewports.
4. Body copy is `0.875rem` in the hero but `clamp(1.02rem, 1.3vw, 1.2rem)` elsewhere, so the hero intro reads as smaller than later body text.
5. Eyebrows at `0.72rem` are too small relative to the H1; they should be micro-badges (`0.625rem`–`0.6875rem`) with generous tracking.

**Target scale (landing-only):**

| Token | Size | Weight | Line-height | Letter-spacing | Use |
|---|---|---|---|---|---|
| `display-xl` | `clamp(2.75rem, 4.2vw, 4rem)` | 500 | 1.04 | -0.04em | Hero H1 only |
| `display` | `clamp(2.25rem, 3.2vw, 3.25rem)` | 500 | 1.06 | -0.035em | Final-CTA H2, Problem H2 |
| `headline` | `clamp(1.65rem, 2.4vw, 2.25rem)` | 500 | 1.1 | -0.025em | Section H2s (workflow, features, specialties, proof, FAQ) |
| `title` | `clamp(1.25rem, 1.6vw, 1.5rem)` | 560 | 1.16 | -0.015em | Feature chapter titles, workflow step H3 |
| `body-lg` | `1.0625rem` (17px) | 450 | 1.62 | 0 | Hero subhead, problem body, feature body |
| `body` | `0.9375rem` (15px) | 400 | 1.58 | 0 | Comparison rows, FAQ answers, footer links |
| `label` | `0.6875rem` (11px) | 600 | 1 | 0.18em | Eyebrows, metric labels, button text |
| `mono-lg` | `1rem` | 400 | 1 | 0 | Hero metric ordinals (`01`, `02`, `03`) |
| `mono` | `0.75rem` | 500 | 1 | 0.04em | Code-like UI labels only (optional) |

**Rule:** no text on the landing page should exceed `4rem`. The H1 must remain the largest type on the page.

### 3.2 Buttons: "Sign in" does not match the CTA

**Current code:**
- `ArchestimatorLandingPage.tsx:127-129` — `.signInLink` is a plain text link with no shape.
- `landing-v3.module.css:214-234` — `.primaryCta` and `.secondaryCta` are `min-height: 40px`, `border-radius: 6px`, `padding: 0.6rem 0.86rem`, `font-size: 0.75rem`.
- `landing-v3.module.css:251-263` — the primary CTA trailing icon lives in a nested `1.42rem` circle.

**Problems:**
1. The "Sign in" link has no button shape, no hover transform, and no shared geometry with the primary CTA. It looks like a nav link placed next to a button.
2. The secondary CTA uses `border: 1px solid rgb(255 255 255 / 0.22)` and `color: white` by default, then is overridden in the hero to dark-on-light (`landing-v3.module.css:276-279`). This inversion is fragile.
3. The trailing icon wrapper is good but not fully flush with the button's right inner padding; it should be a distinct circular island with a subtle inner highlight.

**Target pattern:**
- Primary CTA: fully rounded pill (`border-radius: 999px`), `padding: 0.75rem 1rem 0.75rem 1.25rem`, signal background, white text.
- Secondary CTA: pill outline (`border: 1px solid var(--hairline)` on light, `1px solid rgb(255 255 255 / 0.22)` on dark), same height and padding as primary, transparent background.
- Nav "Sign in": becomes a small secondary CTA pill (same component, smaller padding) so it is visually paired with the primary CTA.
- Trailing icon: a `1.75rem` circular island nested flush inside the right padding, with its own `box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.25)` highlight. On hover the island translates `translate(2px, -1px) scale(1.05)`.
- Active state: `scale(0.98)` on the whole button.

### 3.3 Navigation: edge-to-edge sticky bar

**Current code:**
- `landing-v3.module.css:54-62` — `.navWrap` is `position: sticky`, `inset-block-start: 0`, full-width, `border-block-end: 1px solid var(--hairline-cool)`, `backdrop-filter: blur(16px)`.

**Problems:**
1. Edge-to-edge sticky nav is explicitly banned by the active skill.
2. The audience banner sits directly beneath it (`inset-block-start: 66px`), creating two stacked sticky bars that fight for attention.
3. The mobile menu is a `details`/`summary` element (`ArchestimatorLandingPage.tsx:133-144`) with a bare dropdown, not a fluid modal expansion.

**Target pattern:**
- Floating glass pill: detached from the top (`margin-block-start: 1.25rem`), centered, `width: max-content`, `border-radius: 999px`, `border: 1px solid var(--hairline)`, `background: rgb(255 251 247 / 0.82)`, `backdrop-filter: blur(20px)`.
- The audience banner is **removed entirely** (already planned in `06` §4.2 and `07` §1); the floating nav must not share sticky real estate with anything else.
- Mobile: hamburger icon (two thin lines) morphs into an `X` via `rotate(45deg)` / `-rotate(45deg)`; menu expands as a full-screen glass overlay (`backdrop-blur-3xl`) with staggered link reveal (`translate-y-3 opacity-0` → `translate-y-0 opacity-100`, `delay-100`, `delay-150`, etc.).

### 3.4 Banned font: Roboto Mono

**Current code:**
- `landing-v3.module.css:29` — root font stack includes `var(--font-geist)`.
- `landing-v3.module.css:182` — audience banner uses `var(--font-roboto-mono)`.
- `landing-v3.module.css:223` — CTAs use `var(--font-roboto-mono)`.
- `landing-v3.module.css:349` — eyebrows use `var(--font-roboto-mono)`.
- `landing-v3.module.css:975, 1009-1011` — metric index and label use `var(--font-numeric)` (likely Roboto Mono-derived) and mono.
- `landing-v3.module.css:1266` — metric title uses `"Doto", "Doto Fallback", "Roboto Mono"`.

**Problem:** Roboto Mono is in the active skill's banned-font list. Doto is acceptable as a display mono, but Roboto Mono must be eliminated.

**Target:**
- Replace Roboto Mono with **Geist Mono** (already available via Next.js font config; check `DESIGN.md` or `src/app/layout.tsx`).
- If Geist Mono is not configured, use **IBM Plex Mono** or **JetBrains Mono** — both are premium, readable at small sizes, and construction-industry appropriate.
- Use mono only for: eyebrows, metric ordinals, button text, and the occasional data label. Never for body copy.

### 3.5 Borders, shadows, and card architecture

**Current code:**
- `landing-v3.module.css:127` — mobile menu summary: `border: 1px solid var(--hairline)`.
- `landing-v3.module.css:144` — mobile menu nav: `border: 1px solid var(--hairline)`.
- `landing-v3.module.css:942` — hero metric card: `border: 1px solid var(--hero-metric-border)`.
- `landing-v3.module.css:1159` — metric preview tooltip: `border: 1px solid rgb(61 61 61 / 0.16)`.
- `landing-v3.module.css:1474` — fragment board: `border: 1px solid var(--hairline)`, `border-radius: 16px`.
- `landing-v3.module.css:1653` — workflow step: `border: 1px solid rgb(255 255 255 / 0.12)`.
- `landing-v3.module.css:1838` — specialty panel: `border: 1px solid var(--hairline)`.
- Shadows: `box-shadow: 0 8px 18px rgb(86 118 134 / 0.24)` (audience banner), `0 18px 42px rgb(38 44 58 / 0.12)` (mockup), etc.

**Problems:**
1. Every card uses a single flat border and a drop shadow. There is no shared precision-frame primitive.
2. Shadows are dark, cool, and harsh; they should be restrained and tied to the neutral product palette.
3. Radius is inconsistent: `2px`, `3px`, `6px`, `8px`, `10px`, `12px`, `14px`, `16px`, `999px`.

**Target pattern (precision frame):**
- Outer surface: `border-radius: 8px`, `border: 1px solid var(--landing-hairline)`, neutral surface background, restrained shadow.
- Inner highlight: optional `inset 0 1px 0 rgba(255,255,255,0.5)` only when it improves depth.
- Dark sections: border `rgb(255 255 255 / 0.1)`, dark neutral surface, restrained shadow.
- Unify radius to a small family: `2px` separators, `4px` controls, `6px` inner frames, `8px` cards, `999px` buttons and pills. The hero mockup may keep its current product-stage radius.

### 3.6 Motion: missing scroll-entry choreography

**Current code:**
- `HeroMountMotion` and `HeroImageZoom` exist.
- `[data-landing-v3-reveal]` is present on most sections but the audit did not find a corresponding CSS animation or IntersectionObserver implementation in the visible module.

**Problem:** Sections below the hero appear statically. There is no choreographed reveal as the user scrolls.

**Target:**
- Every section block (`.sectionHeader`, `.featureChapter`, `.workflowStep`, `.specialtyPanel`, `.comparisonGrid`, `.faqList`, `.proofSection li`) enters via a heavy fade-up:
  - Initial: `opacity: 0; transform: translateY(1.5rem); filter: blur(4px)`.
  - Final: `opacity: 1; transform: translateY(0); filter: blur(0)`.
  - Duration: `800ms`.
  - Easing: `cubic-bezier(0.32, 0.72, 0, 1)`.
- Use `IntersectionObserver` (or the existing Framer Motion setup if present) — never `window.addEventListener('scroll')`.
- Stagger children by `100ms` within each section.
- `prefers-reduced-motion`: reveal immediately with no blur/translate.

### 3.7 Section spacing

**Current code:**
- `--section-y: clamp(4rem, 7.5vw, 8rem)` (`landing-v3.module.css:23`).
- Hero padding: `clamp(2rem, 3.15vw, 2.9rem)` top, `clamp(0.45rem, 1.15vw, 1rem)` bottom (`landing-v3.module.css:320`).

**Problem:** `8rem` is the maximum vertical spacing, but premium editorial landing pages need more breathing room. The hero also feels cramped at the top because the sticky nav sits flush against the viewport.

**Target:**
- Increase `--section-y` to `clamp(5rem, 10vw, 11rem)`.
- Hero top padding: `clamp(3.5rem, 6vw, 5rem)` (the floating nav no longer consumes viewport edge, so more top space is safe).
- Add a `margin-block-start: clamp(2rem, 4vw, 4rem)` between the hero copy block and the hero stage on desktop.

### 3.8 HeroMetricCards: fake counters and information density

**Current code:**
- `ArchestimatorLandingPage.tsx:288-380` — three cards with `AnimatedMetricValue` counters (`Areas Priced: 248`, `Proposals Submitted: 67`, `Bids Won: 19`).
- The plan already says to drop the counters (`06` §4.1, `07` §2.1).

**Problem:** Even after dropping counters, the cards remain dense: a top bar, a count panel, a ledger header, a body, a feature list, and a title. The bento idea is there but the internal hierarchy is unclear.

**Target:**
- Keep the three cards as the bento grid.
- Replace the counter with a large ordinal (`01`, `02`, `03`) in the top-left.
- Each card gets: ordinal + title + one-sentence proof + 2–3 feature bullets with hover tooltip.
- Remove the ledger header / body split; it adds visual noise.
- Use the precision-frame shell.

### 3.9 Supporting-page consistency

The same visual system must apply to `/pricing`, `/features`, `/about`, and `/contact`. Currently those pages are not audited in this document, but the implementation plan must require that each route:
- Uses the same nav, button, and type-scale components.
- Uses the same precision-frame primitive for pricing tiers, feature rows, and founder/team cards.
- Uses the same restrained motion rules only where motion proves value.

---

## 4. Target visual system

### 4.1 Refined token layer (landing-only)

```css
/* Landing-only CSS custom properties — add to landing-v3.module.css :root */
--landing-bg: #eef0f3;
--landing-surface: #fffdf8;
--landing-surface-soft: #f7f6f2;
--landing-ink: #3d3d3d;
--landing-secondary: #64615c;
--landing-muted: #8f8b84;
--landing-hairline: rgba(61, 61, 61, 0.14);
--landing-hairline-strong: rgba(61, 61, 61, 0.22);
--landing-signal: #f24405;
--landing-signal-aa: #c93a04;
--landing-signal-wash: color-mix(in srgb, #f24405 8%, #fffdf8);
--landing-night: #171717;
--landing-night-soft: #222222;
--landing-radius-sm: 2px;
--landing-radius-control: 4px;
--landing-radius-inner: 6px;
--landing-radius-card: 8px;
--landing-space-xs: 0.5rem;
--landing-space-sm: 1rem;
--landing-space-md: 1.5rem;
--landing-space-lg: 4rem;
--landing-space-xl: 8rem;
--landing-ease: cubic-bezier(0.32, 0.72, 0, 1);
--landing-ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
```

### 4.2 Typography

- Primary: existing configured landing primary font. Do not add a new font dependency in this plan.
- Mono: existing configured mono if present; otherwise system monospace. Remove literal `Roboto Mono` fallbacks when a configured mono is confirmed.
- Letter spacing stays `0` for normal text. Uppercase micro-labels may use positive tracking up to `0.12em`.
- Font-size steps use breakpoints or container queries, not direct viewport-width scaling.

### 4.3 Component primitives

#### Precision frame
```css
.precisionFrame {
  border: 1px solid var(--landing-hairline);
  border-radius: var(--landing-radius-card);
  background: var(--landing-surface);
  box-shadow:
    0 18px 40px rgba(31, 36, 45, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.precisionFrameInner {
  border-radius: var(--landing-radius-inner);
  background: color-mix(in srgb, var(--landing-surface) 96%, white);
}
```

#### Island button (primary)
```css
.primaryCta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.75rem 1.25rem;
  border-radius: 999px;
  background: var(--landing-signal);
  color: white;
  font-family: var(--font-geist-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: transform 220ms var(--landing-ease-spring), background 220ms var(--landing-ease-spring);
}
.primaryCta:active { transform: scale(0.98); }
.primaryCta .iconIsland {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: transform 220ms var(--landing-ease-spring);
}
.primaryCta:hover .iconIsland { transform: translate(2px, -1px) scale(1.05); }
```

#### Floating nav
```css
.navWrap {
  position: fixed; /* or sticky with top margin */
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  width: max-content;
  max-width: calc(100% - 2rem);
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--landing-hairline);
  border-radius: 999px;
  background: rgba(255, 251, 247, 0.82);
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 42px rgba(26, 25, 23, 0.08);
}
```

### 4.4 Motion choreography

| Element | Trigger | Initial | Final | Duration | Easing |
|---|---|---|---|---|---|
| Hero copy | Mount | `opacity: 0; translateY(1rem); blur(4px)` | `opacity: 1; translateY(0); blur(0)` | 900ms | `ease-spring` |
| Hero mockup | Mount | `opacity: 0; scale(0.96); translateY(2rem)` | `opacity: 1; scale(1); translateY(0)` | 1000ms | `ease-spring` |
| Hero metric cards | Mount | `opacity: 0; translateY(1.5rem)` | `opacity: 1; translateY(0)` | 800ms | `ease-spring`, stagger 120ms |
| Section headers | In viewport | `opacity: 0; translateY(1.5rem); blur(4px)` | `opacity: 1; translateY(0); blur(0)` | 800ms | `ease` |
| Feature chapters | In viewport | same | same | 800ms | `ease`, stagger children 100ms |
| Workflow steps | In viewport | `opacity: 0; translateX(1rem)` | `opacity: 1; translateX(0)` | 700ms | `ease`, stagger 100ms |
| FAQ items | In viewport | `opacity: 0; translateY(1rem)` | `opacity: 1; translateY(0)` | 600ms | `ease`, stagger 80ms |
| Nav links on mobile open | Menu open | `opacity: 0; translateY(0.75rem)` | `opacity: 1; translateY(0)` | 500ms | `ease`, stagger 60ms |

All animations use only `transform` and `opacity`. No `width`, `height`, `top`, `left`, `margin`, or `padding` animations.

### 4.5 Mobile behavior

- Nav becomes a single right-aligned hamburger inside the floating pill.
- Menu opens as full-screen overlay with staggered links.
- Hero stacks vertically; mockup moves below copy; metric cards become a single-column stack.
- Feature chapters become full-width vertical stack (copy first, visual second).
- Specialties horizontal scroll is preserved but card width is `min(320px, 85vw)`.
- Comparison columns stack with a horizontal signal bar divider.
- Footer stacks to a single column.
- No section uses `h-screen` or `100vh`; use `min-height: 100dvh` where needed.

---

## 5. Per-section visual notes

These notes supplement `07_LANDING_PAGE_SECTIONS.md` and `06_BRAND_AND_COPY_DIRECTION.md`.

### 5.1 Hero

- Preserve the product mockup and the three feature cards.
- Preserve the current mockup chrome; use precision frames only for repeated cards around it.
- Recast the three cards to remove fake counters; use large `01 / 02 / 03` ordinals.
- Reduce H1 max size to `4rem`.
- Add the brand-promise below-CTA line as a micro-proof line (`0.6875rem`, muted).
- Remove the "Video walkthrough" placeholder unless a real video is supplied (`OPEN-DEC-006` already covers this).

### 5.2 Audience band

- Already planned to be recast and moved below Specialties (`07` §2.6).
- Apply precision framing to the operating-map board.
- Tone down the board's 1px grid; use a subtle warm hairline.
- Reduce the audience-list pills to a calmer size (`0.75rem`).

### 5.3 Problem

- Apply Editorial Split: large H2 left, fragment-board right.
- Fragment board becomes a precision-framed surface with floating fragments inside; soften the current 1px borders.
- Reduce H2 max size to `3.25rem` (display token).

### 5.4 Workflow

- Dark section (`--landing-night`).
- Apply precision framing to each workflow step card.
- Reduce step ordinal size to `1.5rem` and weight to `500`.
- Replace the abstract `ProductStage` placeholder with a real screenshot in a precision frame.

### 5.5 Feature chapters

- Editorial Split: copy left, screenshot right; alternate order.
- Apply precision framing to the screenshot/visual card.
- Remove the large floating chapter icon or shrink it to a small eyebrow badge.
- Add a new 4th chapter: "Private by design" with a real product or architecture proof visual inside a precision frame.

### 5.6 Comparison

- Use a precision frame for the whole comparison table.
- Make the Archestimator column visually heavier: signal left border or signal wash background on header.
- Add row links to `/features` anchors.

### 5.7 Specialties

- Expand to 7 as planned.
- Each specialty panel uses a precision frame.
- Tabs become small pill chips (`border-radius: 999px`).
- Real screenshots in precision frames.

### 5.8 Proof

- Complete rebuild as planned: 4 real screenshots in an asymmetrical bento grid.
- Each screenshot card uses a precision frame.
- Add the Cloudflare/Better Auth/R10 trust line below the grid.

### 5.9 FAQ

- Replace 5 softballs as planned.
- Use a clean accordion with hairline dividers instead of bordered boxes.
- Apply scroll-entry stagger.

### 5.10 Final CTA

- Dark background (`--landing-night`).
- Large display H2 (`display` token, max `3.25rem`).
- Dual CTA: primary "Request access" while invite-gated + secondary "Book a walkthrough".
- Add the brand-promise tagline and cement-anchor value line.

### 5.11 Footer

- Rebuild as planned with company line, compliance line, value anchor.
- Use a restrained link list; avoid a dense grid.
- Keep the copyright line small and muted.

---

## 6. New and updated open decisions

| ID | Question | Options | Default | Blocks |
|---|---|---|---|---|
| OPEN-DEC-009 | Should the founder override the corrected Precision Editorial default? | A) Keep Precision Editorial. B) Move warmer, with a capped neutral palette. C) Move darker, with direct visual proof. | A | WP-1E visual system foundation |
| OPEN-DEC-010 | Should a new mono font be added? | A) No; use existing configured mono/system mono. B) Add a specific mono family after approval. | A | WP-1E token layer + WP-1B nav/CTA |
| OPEN-DEC-011 | Should the nav become a floating glass pill? | A) Yes, if accessibility and responsive behavior stay simple. B) Keep a contained sticky nav with matching buttons. | A | WP-1E nav + WP-1B nav/CTA |
| OPEN-DEC-012 | Should the HeroMetricCards keep any numeric value, or only ordinals? | A) Ordinals only — recommended. B) Ordinals plus a small, real, non-animated metric if one exists. | A | WP-2A hero metric card recast |

---

## 7. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §3 Audit findings | `11_IMPLEMENTATION_PLAN.md` — new WP-V visual-design work package; expanded WP-1B, WP-2A, WP-5 |
| §4 Target tokens | `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` token table |
| §4 Component primitives | `11_IMPLEMENTATION_PLAN.md` WP-V acceptance criteria |
| §5 Per-section notes | `07_LANDING_PAGE_SECTIONS.md` visual column |
| §6 Open decisions | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` new OPEN-DEC-009..012 |

---

## 8. Readiness note

This document introduces additional owner decisions (OPEN-DEC-009..012) that were not in the original plan. Until those decisions are resolved, the package remains `CONDITIONALLY READY`. The five atomic Phase 1 slices (WP-1A lint pass, WP-1B nav/CTA, WP-1C footer, WP-1D section reorder, WP-1E visual system foundation) can still proceed because they either do not depend on the new visual decisions (WP-1A, WP-1C, WP-1D) or have a safe default (WP-1B can implement the button-shape fix without resolving the floating-nav decision; WP-1E can use the default archetype in §6 if the founder is silent).
