# 09 — Design System and Visual Direction

**Source authority:** `DESIGN.md` (alpha-stage), `03` §4 (brand asset inventory), `07` (section architecture), `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` (high-end visual direction).
**Boundary:** DESIGN.md is alpha-stage guidance per its status banner. Founder direction always wins. This plan extends the landing-only token layer; does not renegotiate the app token system.
**Founder sign-off required for:** OPEN-DEC-009, OPEN-DEC-010, OPEN-DEC-011 (see `15` and `20`).

---

## 0. 2026-07-06 correction

The earlier version of this document selected "Editorial Luxury (warm-commercial)" and a large-radius Double-Bezel card system. That direction is now superseded. It solved the wrong problem: it made the page feel expensive, but risked making Archestimator feel like a styled template rather than a precise estimating product.

The corrected design system direction is **Precision Editorial**:

- Preserve the current hero estimate-sheet mockup and mountain/media composition.
- Preserve the current neutral/cool product backbone (`#eef0f3`, `#fffdf8`, `#3d3d3d`, `#f24405`) and use warmth only as small accents.
- Use repeated-card radii of 8px or less, with 999px reserved for pills.
- Use compact architectural frames, not nested card-on-card shells.
- Use existing configured fonts. No new font dependency without explicit approval.
- Do not use viewport-width font scaling. Use fixed rem tokens with breakpoint or container-query steps.
- Keep letter spacing at 0 except uppercase micro-labels, where positive tracking is allowed.
- Keep page copy concrete, short, and product-led.

Where this section conflicts with later sections, this correction wins.

### 0.1 User-feedback driven design rules

The user explicitly confirmed the hero composition is strong and asked for the rest of the page to feel as intentional. The following rules are non-negotiable for implementation:

1. **The H1 is the largest type on the page.** No heading below the hero may exceed the hero H1 size. The current page violates this: section H2s grow to `4.7rem` while the hero H1 maxes at `2.625rem`.
2. **"Sign in" must be visually related to the primary CTA.** A plain text link next to a shaped button is the specific complaint. Sign in becomes a small secondary pill.
3. **One CTA family, not two.** Primary, secondary, and nav auth actions share pill geometry, padding rhythm, and hover physics.
4. **No viewport-width font scaling on headings.** It makes sizes feel "weird and big" at intermediate breakpoints. Use stepped media-query values.
5. **Repeated cards use one frame primitive.** The current page mixes `2px`, `3px`, `6px`, `8px`, `10px`, `12px`, `14px`, `16px`, and `999px` radii. Collapse to the radius family in §4.1.
6. **No decorative warmth repaint.** Keep the cool canvas; warmth only as small controlled accents.

---

## 1. Current landing visual direction (revised baseline)

The current `landing-v3` surface is a competent first pass, but it reads closer to a well-built template than a premium AEC SaaS. The hero concept (mountain photo + product mockup + three feature cards) is the strongest asset and must be preserved. Everything else needs refinement.

| Element | Current | Target | Status |
|---|---|---|---|
| Type stack | Geist + Roboto Mono | Existing configured primary font + existing configured mono. Remove literal `Roboto Mono` fallbacks when a configured mono exists. | revise |
| Type scale | Hero H1 up to `2.625rem`; section H2s up to `4.7rem` | Unified stepped scale: H1 max `4rem`; section H2 max `2.5rem`; H1 remains largest. No viewport-width font scaling. | revise |
| Color palette | Cool `#eef0f3` canvas, `#3D3D3D` ink, `#f24405` signal | Keep the cool canvas/paper/ink/signal backbone. Add only subtle neutral warmth, not a beige/cream/espresso repaint. | revise |
| Radius | Inconsistent (`2px`-`16px`-`999px`) | Unified family: `2px` separators, `4px` controls, `6px` inner frames, `8px` cards, `999px` buttons/pills. Hero mockup may keep existing product-frame radius. | revise |
| Spacing | `--section-y` max `8rem`; hero top padding `2.9rem` | Increase selectively where sections feel cramped, but keep the hero first viewport tight enough to reveal the product and hint the next section. | revise |
| Card architecture | Flat 1px borders + drop shadows | Precision frame: hairline, subtle inner highlight, restrained shadow. No nested cards inside cards. | revise |
| Buttons | Primary/secondary pills with basic nested icon | Shared CTA geometry across primary, secondary, and Sign in. Icon island only where useful. | revise |
| Navigation | Edge-to-end sticky bar + `details` mobile menu | Prefer a compact floating nav or a visually contained sticky nav. Remove the stacked AudienceBanner. | revise |
| Motion | Hero mount motion only | Keep hero motion. Add reveal only for browser-proven value and reduced-motion compliance. | revise |
| Photography | Mountain hero photo + `public/landing/` | Preserve | ✅ preserve |
| Logo | ArchestimatorLogo with light/dark tones | Preserve | ✅ preserve |

---

## 2. Selected archetypes

Per the active high-end visual design skill, the following archetypes are consciously selected.

### 2.1 Vibe Archetype: Precision Editorial

AEC buyers live with documents, rates, drawings, approvals, and assumptions. The landing page should feel like a precise commercial instrument: quiet, structured, and credible. It can have editorial restraint, but it should not read as a cream-colored luxury brochure.

**Palette:**

| Token | Value | Usage |
|---|---|---|
| `--landing-bg` | `#eef0f3` | Page background; preserves current cool architectural canvas |
| `--landing-surface` | `#fffdf8` | Product frames, nav, cards, input surfaces |
| `--landing-surface-soft` | `#f7f6f2` | Sparse section contrast only |
| `--landing-ink` | `#3d3d3d` | Primary text |
| `--landing-secondary` | `#64615c` | Secondary text |
| `--landing-muted` | `#8f8b84` | Captions, micro-labels |
| `--landing-hairline` | `rgba(61, 61, 61, 0.14)` | Borders, rules, dividers |
| `--landing-hairline-strong` | `rgba(61, 61, 61, 0.22)` | Higher-contrast separators |
| `--landing-signal` | `#f24405` | Primary CTA, active state, controlled accent |
| `--landing-signal-aa` | `#c93a04` | Hover/pressed state |
| `--landing-signal-wash` | `color-mix(in srgb, #f24405 8%, #fffdf8)` | Small accent surfaces |
| `--landing-night` | `#171717` | Dark sections when needed |
| `--landing-night-soft` | `#222222` | Elevated dark surfaces |

**Texture:** optional and nearly invisible. Do not add a fixed film-grain overlay unless visual QA shows it improves the actual implementation without hurting text clarity, performance, or accessibility.

### 2.2 Layout Archetype: Asymmetrical Bento + Editorial Split

- **Hero / Proof / Feature cards:** asymmetrical bento grid with deliberately unequal cell sizes (e.g., `col-span-5 row-span-2` beside stacked `col-span-3` cards).
- **Feature chapters:** Editorial Split — large typographic copy block on the left, screenshot/visual on the right, alternating order.
- **Mobile collapse (below `768px`):** all asymmetry falls back to `w-full`, single-column stack, `px-4`, `py-8`. No rotations, no negative-margin overlaps.

---

## 3. Typography

### 3.1 Font families

- **Primary:** use the existing configured landing primary font. Do not add a new brand font in this plan.
- **Mono:** use the existing configured mono if present. Remove literal `Roboto Mono` fallbacks once the configured mono is confirmed. If no configured mono exists, use the system monospace stack and defer a brand-font decision.
- **Dependency rule:** no new font package, hosted font, or `next/font` family is added without explicit approval.
- **Usage rule:** mono is for micro-labels, ordinals, CTA labels, and data-like UI. Body copy stays in the primary font.

### 3.2 Type scale (landing-only)

| Token | Desktop size | Mobile size | Weight | Line-height | Letter-spacing | Use |
|---|---|---|---|---|---|
| `display-xl` | `4rem` max | `2.75rem` | 500 | 1.04 | 0 | Hero H1 only |
| `display` | `3rem` max | `2.15rem` | 500 | 1.08 | 0 | Problem H2, Final CTA H2 |
| `headline` | `2.5rem` max | `1.75rem` | 520 | 1.12 | 0 | Section H2s |
| `title` | `1.5rem` | `1.25rem` | 560 | 1.18 | 0 | Feature chapter titles, workflow step H3 |
| `body-lg` | `1.0625rem` | `1rem` | 450 | 1.6 | 0 | Hero subhead, problem body, feature body |
| `body` | `0.9375rem` | `0.9375rem` | 400 | 1.58 | 0 | Comparison rows, FAQ answers, footer links |
| `label` | `0.6875rem` | `0.6875rem` | 600 | 1 | `0.12em` max | Uppercase micro-labels only |
| `mono-lg` | `1rem` | `0.9375rem` | 500 | 1 | 0 | Hero card ordinals (`01`, `02`, `03`) |

**Rules:**

1. **No landing text exceeds `4rem`.** The H1 must remain the largest type on the page.
2. **Do not use viewport-width font scaling (`clamp(..., vw, ...)`).** It is the direct cause of the "weird and big" complaint at intermediate widths. Use media-query or container-query steps.
3. **Letter spacing stays `0`** for normal text. Only uppercase micro-labels may use positive tracking up to `0.12em`.
4. **Hero subhead is `body-lg` (17px)** and must fit in 3 lines or fewer at mobile widths.

**Current-state violation map:**

| Current value | Location | Violation | Target |
|---|---|---|---|
| Section H2 `clamp(2.45rem, 4.5vw, 4.7rem)` | `landing-v3.module.css:1536` | Exceeds hero H1; viewport-width scaling | `headline` token, max `2.5rem` |
| Workflow step number `2.5rem` | `landing-v3.module.css:1662` | Larger than its own H3 | `title` token, `1.5rem` |
| Hero body `0.875rem` while later body is larger | `landing-v3.module.css:375` | Inconsistent hierarchy | `body-lg` `1.0625rem` for hero subhead |
| Eyebrow `0.72rem` | `landing-v3.module.css:349` | Too small relative to H1 | `label` `0.6875rem` with `0.12em` tracking |

---

## 4. Component primitives

### 4.1 Precision frame

Repeated cards, screenshot containers, and surface panels use a restrained frame. Do not put cards inside cards. The hero estimate-sheet mockup may keep its richer existing frame because it is the main product stage, not the repeated card primitive.

```css
.precisionFrame {
  border: 1px solid var(--landing-hairline);
  border-radius: 8px;
  background: var(--landing-surface);
  box-shadow:
    0 18px 40px rgba(31, 36, 45, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.precisionFrameInner {
  border-radius: 6px;
  background: color-mix(in srgb, var(--landing-surface) 96%, white);
}
```

Dark-section variant: border `rgb(255 255 255 / 0.1)`, background `var(--landing-night)`, shadow `0 18px 40px rgba(0, 0, 0, 0.18)`.

### 4.2 Island button (primary)

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
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    background 220ms cubic-bezier(0.22, 1, 0.36, 1);
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
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.primaryCta:hover .iconIsland { transform: translate(2px, -1px) scale(1.05); }
```

Secondary CTA uses the same pill geometry with a transparent background and a hairline border.

### 4.3 Floating nav

```css
.navWrap {
  position: fixed;
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

Mobile: hamburger lines morph into an `X`; menu expands as a full-screen glass overlay with staggered link reveals.

---

## 5. Screenshot capture plan (Phase 2B)

Per `07` §5. Each screenshot:
- Captured at desktop (1440×900 min) + mobile (375×667).
- Stored in `public/landing/screenshots/`.
- Optimized via `next/image` with `priority` for above-the-fold, lazy for below.
- Framed inside a precision frame.
- Alt text describes **what the screenshot proves**, not what it shows.
- Use seed/demo data only (`data/local/seed.json`).

| Screenshot | Source route | Alt text |
|---|---|---|
| Estimate tree | `/workshop/projects/[seed-id]/estimates/[seed-node]` | "Archestimator's estimate tree with grouped areas, drag-and-drop rows, and live totals." |
| Library dock | `/workshop/library` | "Archestimator's reusable cost library with brands, suppliers, variants, pricing, and source notes." |
| Activity panel | Estimate route Activity tab | "Archestimator's Activity panel showing a comment thread, revision diff, and recorded decision." |
| Publication viewer | `/share/[seed-token]` (anonymous) | "Archestimator's publication viewer with proposal, comments, and decision recording." |

---

## 6. Motion discipline

Per `DESIGN.md` motion rules + `MASTER §10.2` calm-conviction:

- **Hero mount:** `opacity` + `translateY` + subtle `blur` resolve over `900ms` using `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Scroll reveal:** every section block enters via `opacity: 0; translateY(1.5rem); blur(4px)` → `opacity: 1; translateY(0); blur(0)` over `800ms` using `cubic-bezier(0.32, 0.72, 0, 1)`. Use `IntersectionObserver`; never `window.addEventListener('scroll')`.
- **Stagger:** children within a section stagger by `80ms`–`120ms`.
- **Hover:** button island icon translates `translate(2px, -1px) scale(1.05)`; cards lift `translateY(-2px)`.
- **Active:** buttons scale to `0.98`.
- **Reduced motion:** reveal immediately with no blur/translate; disable continuous animations.
- **No GSAP, no heavy parallax, no decorative animation.** Calm-conviction register applies to motion too.
- **Performance:** animate only `transform` and `opacity`. Apply `backdrop-filter` only to fixed/sticky elements (nav, overlays). Attach grain/noise only to fixed `pointer-events-none` layers.

---

## 7. Visual additions proposed

| Addition | Where | Why |
|---|---|---|
| `public/landing/screenshots/` directory | New | 4 real product screenshots (Phase 2B) |
| Precision frames | Hero metric cards, workflow stage, feature chapters, specialties, proof grid | Crisp product credibility without card-on-card clutter |
| Architecture diagram OR Terms-clickwrap screenshot | Feature Chapter 4 (Private by design) | Visual proof of data discipline |
| Cement-anchor visualization on /pricing | Preserve the metaphor visual; drop the "Hypothesis · pending discovery" pill | The metaphor stays; the research framing goes |
| Optional subtle texture | Only if visual QA proves it helps | Avoid one-note paper/luxury styling by default |

---

## 8. DESIGN.md additions (Phase 5)

Phase 5 adds a "Landing public surface" section to DESIGN.md documenting:
- The landing-only token layer (`--landing-bg`, `--landing-surface`, `--landing-ink`, `--landing-signal`, `--landing-night`, radii, spacing).
- The landing-exempt typography scale (`display-xl`, `display`, `headline`, `title`, `body-lg`, `body`, `label`, `mono-lg`).
- The precision-frame primitive and shared CTA geometry.
- The floating nav and hamburger-morph mobile menu.
- The scroll-reveal motion contract.
- The screenshot-capture workflow (seed data → /workshop route → image editor if redaction needed → `public/landing/screenshots/`).
- The compliance-line treatment in footer (Cloudflare + Better Auth + R10).

This **extends** DESIGN.md; does not renegotiate the alpha-stage app token system.

---

## 9. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1 Revised baseline | `11` Phase 1 (lint pass preserves visual system) + WP-V visual-design package |
| §2 Archetypes | `20` §2 + `15` OPEN-DEC-009 |
| §3 Typography | `11` WP-1B, WP-2A, WP-V acceptance criteria |
| §4 Component primitives | `11` WP-V implementation criteria |
| §5 Screenshot plan | `11` Phase 2B + `12` test fixtures |
| §6 Motion | `11` WP-V + `12` reduced-motion audit |
| §8 DESIGN.md additions | `11` Phase 5 |
