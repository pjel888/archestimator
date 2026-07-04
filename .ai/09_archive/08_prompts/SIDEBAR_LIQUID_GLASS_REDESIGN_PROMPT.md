# PROMPT — Liquid-Glass Sidebar Redesign (archestimator)

> **Paste this entire document into Claude Code / Cursor / Windsurf.** It is a **visual-only** redesign of the existing sidebar into a *liquid-glass / glassmorphism* surface. It follows the archestimator Doc Lifecycle Protocol (DISCOVER → READ & BASELINE → EXECUTE → POST-UPDATE → VERIFY → CLOSE).

---

## 0. MISSION

Redesign the archestimator app sidebar into a **liquid-glass surface** — a translucent, frosted, light-catching panel that floats over the app background — **without changing a single piece of navigation behaviour, routing, state, or data.** This is a **skin**, not a refactor.

---

## 1. CRITICAL CONSTRAINTS — READ TWICE

These are **NON-NEGOTIABLE**. Violating any of them = the work is rejected.

1. **PRESERVE ALL FUNCTIONALITY.** Every nav item, route, `href`, icon, badge, count, active-route detection, collapse/expand logic, Zustand store, and click handler must work **exactly** as before. Do not rename, reorder, add, or remove nav items. **If you are tempted to "improve" the structure — STOP. Skin only.**
2. **PERFORMANCE IS THE TARGET DEVICE, NOT YOUR LAPTOP.** Baseline device = **mid-range Android (Realme C55 class) on Philippine 4G**. **30fps sustained is a hard floor**, not an aspiration. A beautiful sidebar that drops frames on a Realme C55 is a FAILED sidebar. See §7.
3. **ONE BLURRED SURFACE.** The sidebar panel gets **exactly one** `backdrop-filter`. **DO NOT** put `backdrop-filter` on nav items, badges, the active pill, the header, or any child. Stacked backdrop-filters each spawn a separate offscreen composite layer and will destroy mobile GPU performance. Child "glass" is faked with **plain translucent fills + borders + inset highlights** (no per-child blur).
4. **THE REAL "LIQUID" REFRACTION (SVG displacement) IS DESKTOP-CHROME-ONLY PROGRESSIVE ENHANCEMENT.** It must NEVER ship to mobile or touch devices. The mobile/baseline experience is **static glassmorphism**, which already looks excellent. See §6.
5. **GRACEFUL FALLBACK IS MANDATORY.** When `backdrop-filter` is unsupported, or `prefers-reduced-transparency: reduce` is set, the sidebar must fall back to a **solid Camp Cobalt panel** that still looks intentional. See §7.
6. **STAY INSIDE THE CAMPFIRE DESIGN SYSTEM.** Use existing tokens: Camp Cobalt `#1B3FC4`, Warm Red `#D64545`, Emerald `#2D9F6F`, Amber `#D4951A`; type Syne / Inter / JetBrains Mono. Add new **glass tokens** to the existing token layer (Tailwind config / CSS vars) — do **not** scatter magic numbers across JSX.

---

## 2. PHASE 0 — DISCOVER & BASELINE (do this FIRST, before writing any code)

Do not assume the file layout. **Report findings before editing.**

1. **Locate the sidebar.** Find the actual sidebar component(s). Determine whether it is a **custom component** or built on **Shadcn `Sidebar`** (`components/ui/sidebar.tsx`). State which, and the exact file paths.
2. **Inventory the contents.** List, verbatim, every element the sidebar currently renders, in order:
   - Brand / workspace header (logo, app name, collapse toggle?)
   - User / profile block (avatar, name, handle, tier badge, readiness score, chevron?)
   - Nav items (label + icon + route + any count/notification badge)
   - Section dividers
   - Footer (settings, sign-out, upgrade CTA?)
   - Collapsed-rail behaviour (icon-only mode? tooltips?)
3. **Find the active-route mechanism** (e.g. `usePathname()` + comparison, or store-driven). **You will reuse it untouched.**
4. **Find the design tokens** (Tailwind config, `globals.css`, theme files, any `.ai/docs` design-system doc). Identify where colours, radii, shadows, and fonts are defined.
5. **Find the page background behind the sidebar.** ⚠️ **Glass only reads as glass over a varied background.** Note what is currently behind/beside the sidebar. See §3.1 — this redesign likely requires a background treatment too.
6. **Confirm the icon library** (likely `lucide-react`). Keep the existing icons.

**Output a short BASELINE REPORT** (files, current structure, active-route method, token locations, background situation) and then proceed.

---

## 3. DESIGN DIRECTION — THE archestimator GLASS LANGUAGE

We are not copying any single reference. We are building **one coherent archestimator glass language** that fuses:

- **The vibrant blue, frosted-over-colour feel** of the blue reference (this maps naturally onto Camp Cobalt).
- **The refined, calm, light-on-glass active states and muted text hierarchy** of the slate/enterprise reference.
- **The optical depth and edge-light physics** of Apple's Liquid Glass (specular edges, subtle refraction).

### 3.0 The 7 ingredients that make it read as "liquid glass"

Every one of these must be present (the first six everywhere; the seventh desktop-only):

1. **Translucency + backdrop blur + saturation** — the frosted base (`backdrop-blur` + `backdrop-saturate`).
2. **A varied background to refract** — see §3.1.
3. **Light-catching 1px edges** — borders are *brighter on the top edge*, dimmer on the bottom, simulating a light source above.
4. **Inset specular highlight** — a 1px inner top highlight (`inset 0 1px 0 rgba(255,255,255,.15)`) so the panel edge "glints."
5. **Layered depth** — sidebar floats above content; content floats above background. Soft outer drop shadow on the panel.
6. **A faint frosted grain** — ~3–5% noise overlay so the blur looks like real frosted glass, not a flat tint.
7. **(Desktop only) Edge refraction + elasticity** — SVG displacement bends the background at the panel/pill edges; the active pill subtly deforms toward the cursor. §6.

### 3.1 ⚠️ NEEDS INPUT — BACKGROUND BEHIND THE GLASS

Glass over a flat dark colour looks like a flat dark panel. For the effect to land, **there must be colour and variation behind the sidebar.**

**RECOMMENDATION (single, strong):** Introduce a subtle, GPU-cheap **Camp Cobalt aurora/mesh gradient** as the app background — a static CSS radial/linear gradient mesh in the cobalt→deep-navy range with one faint emerald or warm accent bloom in a corner. Static (no animation) to protect performance. This gives the glass something to bend and tint without a heavy hero image.

> If the app already has a defined background you want to keep, say so and I'll spec the glass values against it. **Do not invent a photographic background** — keep it a flat-but-varied gradient for performance and brand control.

---

## 4. THE GLASS TOKEN SYSTEM (add to the token layer)

Add these as CSS variables / Tailwind theme extensions. **Values below are tuned starting points — calibrate on-device.** Context = dark Camp Cobalt theme.

```css
:root {
  /* ---- Glass surface (the sidebar panel) ---- */
  --glass-bg:            rgba(255, 255, 255, 0.06);   /* neutral frost; OR cobalt tint below */
  --glass-bg-cobalt:     rgba(27, 63, 196, 0.10);     /* Camp Cobalt-tinted alternative */
  --glass-blur:          18px;                          /* keep 16–20px; higher = costlier */
  --glass-saturate:      160%;
  --glass-border:        rgba(255, 255, 255, 0.12);
  --glass-border-top:    rgba(255, 255, 255, 0.22);    /* brighter specular top edge */
  --glass-inset-hi:      inset 0 1px 0 0 rgba(255,255,255,0.15);
  --glass-shadow:        0 8px 32px rgba(0, 0, 0, 0.35); /* depth from background */
  --glass-radius:        20px;

  /* ---- Nav item: hover ---- */
  --nav-hover-bg:        rgba(255, 255, 255, 0.06);

  /* ---- Nav item: ACTIVE (fill-pill, recommended) ---- */
  --nav-active-bg:       rgba(255, 255, 255, 0.10);
  --nav-active-border:   rgba(255, 255, 255, 0.18);
  --nav-active-inset:    inset 0 1px 0 0 rgba(255,255,255,0.18);
  --nav-active-glow:     0 0 0 0 transparent;           /* optional accent glow, see §5.4 */
  --nav-radius:          12px;

  /* ---- Text hierarchy on glass ---- */
  --txt-primary:         rgba(255, 255, 255, 0.98);     /* active / brand */
  --txt-secondary:       rgba(255, 255, 255, 0.62);     /* default nav label */
  --txt-muted:           rgba(255, 255, 255, 0.45);     /* handles, captions */
  --icon-default:        rgba(255, 255, 255, 0.55);
  --icon-active:         rgba(255, 255, 255, 0.98);

  /* ---- Solid fallback (no backdrop-filter / reduced transparency) ---- */
  --glass-fallback-bg:   #0B1437;                        /* deep cobalt-navy, opaque */
}
```

Expose Tailwind utilities for these (e.g. `bg-glass`, `border-glass`, `shadow-glass`) so JSX stays clean.

---

## 5. COMPONENT-BY-COMPONENT SPEC

Apply per **archetype** to whatever the baseline contains. Do not add elements that don't exist; do not drop elements that do.

### 5.1 The panel (sidebar container)
- Single source of blur. Apply: `background: var(--glass-bg)`, `backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))` **plus the `-webkit-` prefix**, `border: 1px solid var(--glass-border)`, `border-radius: var(--glass-radius)` (only the corners that aren't flush to the viewport edge), `box-shadow: var(--glass-shadow), var(--glass-inset-hi)`.
- **Brighter top edge:** add a top border-highlight via a `::before` 1px gradient line or `border-top-color: var(--glass-border-top)`.
- **Frosted grain:** a `::after` overlay, `pointer-events:none`, ~4% opacity noise (tiny inline SVG `feTurbulence` data-URI or a 64×64 tiled PNG), `mix-blend-mode: overlay` or `soft-light`.
- If floating (not edge-to-edge), add a small inset margin so the drop shadow and background show around it (sells the "floating glass slab").

### 5.2 Brand / workspace header
- Logo, then app/workspace name in **Syne**, `var(--txt-primary)`.
- If a collapse toggle exists, render it as a ghost icon button top-right: `var(--icon-default)` → `var(--icon-active)` on hover, `rgba(255,255,255,0.06)` hover bg, `--nav-radius`.
- Optional 1px divider below: `linear-gradient(90deg, transparent, var(--glass-border), transparent)`.

### 5.3 User / profile block
- Circular avatar (1px `var(--glass-border)` ring + `--glass-inset-hi`).
- Name in `--txt-primary`; handle / secondary line in `--txt-muted`.
- **Tier / status badge** (if present — e.g. PRO, Trial, or a archestimator readiness/tier indicator): render as a **glass pill** — small rounded-full chip, `1px var(--glass-border)`, faint accent-tinted fill, accent text. Use **Emerald `#2D9F6F`** for positive/PRO, **Amber `#D4951A`** for trial/warning, JetBrains Mono optional for the label.
- Chevron (if present) right-aligned, `--icon-default`.

### 5.4 Nav items — default / hover / ACTIVE
Row spec (all states): icon (20px) + label (Inter, 14–15px, medium), gap `12px`, horizontal padding `12–16px`, **min-height `44px` (touch target — do not go smaller)**, `--nav-radius`.

- **Default:** transparent bg, label `--txt-secondary`, icon `--icon-default`.
- **Hover:** bg `--nav-hover-bg`, label → `rgba(255,255,255,0.85)`, icon brightens. Transition `150ms ease`.
- **ACTIVE (RECOMMENDED — fill pill):** bg `--nav-active-bg`, `1px solid var(--nav-active-border)`, `box-shadow: var(--nav-active-inset)`, label `--txt-primary` (weight up one step), icon `--icon-active`. Add a **brand accent cue**: either a 3px left indicator bar OR tint the active icon in **Camp Cobalt-light / Emerald**. Reuse the existing active-route detection — wire styling to it, change nothing about the logic.
  - **Alternative (documented, not default):** outline-pill + glow — transparent fill, `1px var(--nav-active-border)`, `box-shadow: 0 0 24px rgba(27,63,196,0.40)`. More "enterprise/calm." Ship the fill pill unless told otherwise.
- **Active state must NOT rely on colour/glow alone** — keep the weight/brightness change too (accessibility).

### 5.5 Count / notification badges
- Count badge (e.g. "8", "18"): small rounded-full pill, `rgba(255,255,255,0.10)` fill, `1px var(--glass-border)`, `--txt-secondary`, ~11–12px, right-aligned in the row. JetBrains Mono for the number is a nice touch.
- Notification dot (small unread indicator on an icon): a 6–8px Warm Red `#D64545` or Emerald dot, top-right of the icon.

### 5.6 Section dividers
- 1px center-faded gradient line (as §5.2), generous vertical spacing. Optional tiny uppercase section label in `--txt-muted`, Inter, letter-spaced.

### 5.7 Footer / CTA (if present)
- Same glass-pill vocabulary. A primary upgrade/CTA can be a brighter solid pill (Camp Cobalt or white) for contrast against the frost — mirrors the prominent "New project" button pattern in the references.

### 5.8 Collapsed rail (if the sidebar collapses)
- Icon-only mode keeps the same glass panel. Active state = the fill pill, centered on the icon. Tooltips on hover: small **solid** dark rounded rect (NOT another blurred surface — keep the one-blur rule), `rgba(20,24,40,0.95)`, `1px var(--glass-border)`, `8px` radius, fast fade.

---

## 6. PROGRESSIVE ENHANCEMENT — REAL LIQUID REFRACTION (DESKTOP CHROME ONLY)

This is the **delight layer**, gated hard. It produces the actual Apple-style edge refraction (the background bends at the panel/pill borders) and elastic "liquid" feel. **It must never reach mobile.**

### 6.1 The technique (layered "sandwich")
The refraction is built by stacking, bottom→top:
1. **Distortion layer** — a pseudo-element with `backdrop-filter: url(#sc-glass-refract)` referencing an SVG filter (`backdrop-filter: blur(0)` is the trick that grants the SVG filter access to the background to distort).
2. **Tint/fill layer** — the translucent glass colour.
3. **Specular/edge layer** — the inset highlight + bright top border.
4. **Content layer** — icons + labels (always on top, never distorted).

The SVG filter (inline, `width/height 0`, `position:absolute`):
- `feImage` of a **displacement map** (a rounded-rect radial gradient: neutral grey center, intense R/G toward the edges — encodes "bend more at the borders") **OR** `feTurbulence` + `feGaussianBlur` for an organic ripple.
- `feDisplacementMap in="SourceGraphic"` with `xChannelSelector="R" yChannelSelector="G"` and a **moderate `scale` (10–30)** — higher scales get expensive and glitchy.
- **Optional chromatic aberration:** split into R/G/B via three `feDisplacementMap` passes at slightly different scales + `feColorMatrix` + `feBlend`/`feComposite` to recombine — produces the faint rainbow edge fringe. Keep `aberration` subtle.

> Reference API for parameter ranges (from `rdev/liquid-glass-react`, the well-known React wrapper of this technique): `displacementScale ≈ 64`, `blurAmount ≈ 0.1`, `saturation ≈ 130`, `aberrationIntensity ≈ 2`, `elasticity ≈ 0.3`, `cornerRadius` to taste. You may either hand-roll the SVG filter (full control, recommended for one panel) or wrap that library — but if you use the library, **still gate it per §6.2 and keep it off mobile.**

### 6.2 GATING (all conditions must pass to enable refraction)
```
(min-width: 1024px)
AND (hover: hover) AND (pointer: fine)      /* real mouse, not touch */
AND (prefers-reduced-motion: no-preference)
AND Chromium engine detected at runtime     /* Safari/Firefox don't render displacement on backdrop-filter */
```
On any failure → **render the §5 static glassmorphism**. The static version is the default product; refraction is icing.

### 6.3 Elasticity (desktop pointer only)
The **active pill** (and optionally the hovered item) may deform/translate subtly toward the cursor — track pointer position over the sidebar container, apply a small `transform` (a few px) with spring easing. Disable entirely on touch and under `prefers-reduced-motion`.

---

## 7. PERFORMANCE REQUIREMENTS & FALLBACKS — THE HARD FLOOR

**Target: 30fps sustained interaction/scroll on a Realme C55-class Android device. Verify on-device, not just desktop DevTools.**

1. **One backdrop-filter, period** (restated from §1.3). Children fake glass with translucent fills only.
2. **Cap blur at 16–20px.** Profile the difference; pick the lowest radius that still reads as frosted.
3. **No animated backdrop-filter, no animated blur.** Animating blur radius forces re-rasterization every frame — banned.
4. **Static background** (§3.1). No animated mesh, no video, no large photo.
5. **No SVG displacement on mobile/touch** (§6.2). It is the single most expensive piece and it is desktop-only.
6. **Fallback A — no `backdrop-filter` support:**
   ```css
   @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
     .sidebar-glass { background: var(--glass-fallback-bg); /* opaque cobalt-navy + borders */ }
   }
   ```
7. **Fallback B — user preference:**
   ```css
   @media (prefers-reduced-transparency: reduce) {
     .sidebar-glass { background: var(--glass-fallback-bg); backdrop-filter: none; }
   }
   ```
   Both fallbacks must still look like a deliberate, polished Camp Cobalt sidebar — borders, inset highlight, and active pill remain.
8. **Compositor hygiene:** avoid gratuitous `will-change`; promote only the panel if needed. Watch layer count in DevTools → Layers.
9. **If on-device testing shows jank:** first drop blur radius, then drop saturation, then fall back to solid. Never ship a janky frosted panel to keep the look — **performance wins over aesthetics on the baseline device.**

---

## 8. ACCESSIBILITY

1. **Contrast:** translucent text over glass routinely fails WCAG. Nav labels must meet **AA (4.5:1)** against the *worst-case effective background*. If frost can't guarantee it, add a faint dark scrim inside the panel beneath content, or darken `--glass-bg`. Active/primary text must be clearly the brightest.
2. **`prefers-reduced-motion`:** disable elasticity, refraction animation, and any hover deformation; keep instant state changes.
3. **`prefers-reduced-transparency`:** solid fallback (§7.7).
4. **Focus-visible:** every nav item keeps a visible keyboard focus ring (don't let the glass styling swallow it).
5. **Touch targets:** ≥44px (§5.4).
6. **State not by colour alone** (§5.4).

---

## 9. ACCEPTANCE CRITERIA (VERIFY before CLOSE)

- [ ] Every nav item, route, badge, count, collapse toggle, and active-route highlight behaves identically to baseline. **Zero behaviour/structure changes.**
- [ ] Sidebar reads unmistakably as **frosted/liquid glass** over a varied background, in the archestimator Camp Cobalt palette.
- [ ] **Exactly one** `backdrop-filter` in the sidebar subtree (grep/inspect to confirm).
- [ ] Active state = fill pill with specular border + inset highlight + brand accent cue, wired to existing detection.
- [ ] SVG refraction present on desktop Chrome **only**; absent on mobile/touch/Safari/Firefox/reduced-motion.
- [ ] Both fallbacks (no-support, reduced-transparency) render a clean solid cobalt sidebar.
- [ ] **On-device: ≥30fps sustained on Realme C55-class Android.** State the measured result.
- [ ] Nav labels pass WCAG AA contrast; focus rings visible; targets ≥44px.
- [ ] All new values live in the token layer; no scattered magic numbers in JSX.
- [ ] `prefers-reduced-motion` disables all glass motion.

---

## 10. ⚠️ NEEDS INPUT (flag, don't fabricate)

Raise these in your baseline report instead of guessing:
1. **Background treatment** (§3.1) — confirm the recommended static cobalt mesh, or point me at an existing background to spec against.
2. **Active-state style** — shipping the **fill pill** by default; confirm or switch to outline+glow.
3. **Header badge semantics** — if the profile block shows a readiness score / tier / plan, tell me the exact label + meaning so the glass-pill colour (Emerald vs Amber vs Cobalt) maps correctly.
4. **Shadcn vs custom sidebar** — confirm which; it changes whether we theme via Shadcn's system or edit the component directly.
5. **Floating vs edge-to-edge** — should the glass slab float with an inset margin (more "slab" depth) or sit flush to the viewport edge?

---

## APPENDIX A — Per-reference cheat sheet (what to borrow)

- **Blue reference:** vibrant frosted-over-colour panel; **fill-pill active state** with the active icon in a rounded container; green tier pill; macOS-traffic-light header chrome (skip for web app). → Borrow the colour energy + fill-pill active.
- **Dark dramatic reference:** maximal blur, low fill opacity, strong background bleed; prominent solid "New project" button; collapsed rail + tooltips; status pill ("Trial 7 days left"). → Borrow the prominent CTA pill + collapsed-rail tooltip pattern.
- **Slate/enterprise reference:** muted, calm, desaturated frost; **outline+glow active state**; clean count badges; duotone icons. → Borrow the restraint + count-badge styling + the outline active alternative.

## APPENDIX B — Technique facts (so the implementation is correct)

- Apple's Liquid Glass goes beyond classic glassmorphism (`backdrop-filter: blur()`) by adding **refraction**: borders symmetrically **distort** the background behind them.
- Web refraction is achieved with **SVG `feDisplacementMap`** fed by a displacement map (`feImage` of a gradient) or `feTurbulence` noise, applied via `backdrop-filter: url(#id)`; `backdrop-filter: blur(0)` is the trick that lets the SVG filter reach the background.
- **`feDisplacementMap` is CPU/GPU-intensive on large areas → use on small components, not full-screen; keep `scale` ~10–30.**
- **Safari and Firefox do not render the displacement on `backdrop-filter`** → they degrade to clean static glass automatically. Plan for Chromium-only refraction.
- Classic glassmorphism (blur + translucent fill + light border + inset highlight + soft shadow + grain) is **well-supported and performant** and is the correct **baseline** for a mobile-first product.
