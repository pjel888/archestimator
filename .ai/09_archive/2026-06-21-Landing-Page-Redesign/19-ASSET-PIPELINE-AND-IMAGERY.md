---
doc: 19-ASSET-PIPELINE-AND-IMAGERY
status: PLANNING ONLY (revised 2026-06-22 per ratified keystone decisions D-1…D-5)
owner: Asset dimension
canonical: 19-ASSET-PIPELINE-AND-IMAGERY
bindings:
  - RATIFIED DECISION D-1 (The Glass Brand — liquid-glass over warm grey canvas; Doto + Roboto Mono + SF Pro; NOT paper, NOT Source Serif 4)
  - RATIFIED DECISION D-2 (auth LEFT panel = brand glass composition, NO fake screenshots)
  - RATIFIED DECISION D-3 (orange discipline: #F24405 fill / #C63804 AA small text; clay #AA412A NOT used)
  - RATIFIED DECISION D-4 (single ClaimStatus type — not directly used by assets, but OG/manifest stay status-neutral)
  - RATIFIED DECISION D-5 (honest scoring; no self-congratulation; gated items carried in LOOP_LEDGER)
  - 24-GPT-TASTE-EXECUTION-CONTRACT (seeded placeholder atmospherics allowed only behind L-TASTE-3)
  - README gate #4 (genuinely owner-gated items carried in LOOP_LEDGER, never silently closed)
verified-against:
  - src/app/globals.css            (--brand-orange L37, --brand-orange-dark L38, --brand-orange-soft L39, --brand-amber L53, --brand-peach L54, --grad-hero-continue L59, --grad-hero-create L60, --grad-canvas-wash L62, --glass-bg L108, --glass-bg-fallback L109, --glass-blur L110, --glass-saturate L111, --glass-radius L116, --glass-nav-radius L117, --glass-logo-orange L131, --glass-logo-gradient L135, --glass-logo-border L140, --ink L10, --secondary L11, --canvas/--warm-canvas L16-17, --hairline L18, --radius-xs L100, --proposal-paper L98, --font-display L203, --font-numeric L204, --font-sf-pro L99)
  - src/app/layout.tsx             (Doto + Roboto_Mono loaded via next/font/google L2,9,12-17; metadata.icons L22-30 points at /favicon_io/*; manifest L30)
  - src/components/brand/ArchestimatorLogo.tsx  (EXISTS — ArchestimatorLogoMark uses text-[#F24405] currentColor path; ArchestimatorWordmark is font-sans lowercase plain text, NOT Doto, NOT a slab)
  - public/favicon_io/site.webmanifest  (EXISTS — theme_color:#ffffff, no maskable purpose)
  - public/archestimator_logo.svg + _white.svg  (legacy logo files — blast radius doc 21)
  - package.json                   (sharp@0.34.5 already a dependency — L87 + L118/L123; @playwright/test present)
verified-absent:
  - public/brand/                  (empty — to be created)
  - public/og/                     (absent — to be created)
  - public/founder/                (absent — gated L-FND-1)
  - scripts/generate-og-images.mjs (absent — to be created)
  - src/components/landing/shared/ (absent — sibling doc 11 introduces StatusPill there)
---

# 19 — Asset Pipeline & Imagery

> **STATUS: PLANNING ONLY · revised 2026-06-22 · not code.**
> **Purpose:** Own the asset pipeline for the Glass Brand landing redesign — the wordmark +
> logo slab, favicon set, per-route OG images, the brand-glass **composition assets** for the
> auth left-panel and hero accents (built from the material-frost/glass vocabulary and the real
> dashboard gradients — NOT stock photos, NOT fake screenshots), the founder photo
> (⚠️ GATED on L-FND-1), and the "what we will NOT ship" rail. PRODUCT.md + the impeccable
> skill + Hallmark ban whole categories of imagery; this doc defines what **replaces** them and
> how the remaining assets are produced, stored, and delivered.

This doc owns **imagery + assets**. It does not own the plate's content (→ `04`), the component
anatomy (→ `11`), or the perf budget for assets (→ `14` §4.2). It defines the asset inventory,
the production process, and the rail.

> **Direction pivot (D-1, 2026-06-22).** This doc was originally authored for "The Document"
> direction (warm paper `#FFFDF8` + Source Serif 4 wordmark + a blanket ban on all imagery that
> was not an inline SVG plate). **That direction is superseded for the public marketing surface.**
> The Glass Brand keeps the **no-stock-photo / no-fake-screenshot / no-AI-photo rail** (it is
> load-bearing for radical honesty) but **adds brand-composition assets** derived from the
> dashboard's real glass + gradient vocabulary, so the auth left-panel and the hero read as the
> same brand Philip loves on the Workshop Dashboard + Estimate Sheet. The prior paper aesthetic
> is preserved as a documented fallback in `01-DESIGN-DIRECTION.md` §3.4 "Direction D — The
> Document" and is NOT the default.

> **Taste overlay placeholder exception (2026-06-22).** `24-GPT-TASTE-EXECUTION-CONTRACT.md`
> permits seeded `picsum.photos` only as draft atmospherics or implementation placeholders for
> the `$gpt-taste` editorial surface. They must be tagged, carried under L-TASTE-3, and removed or
> owner-approved before public cutover. They can never stand in for product proof, founder identity,
> customer proof, screenshots, logos, metrics, or compliance evidence.

---

## 1. The imagery thesis, in one paragraph (Glass Brand)

The redesign is **a specimen of the Glass Brand**, not a photo essay and not a paper document.
The page itself — liquid-glass surfaces over the warm grey canvas, Doto headlines, one
signal-orange presence accent (D-3) — IS the visual argument (`01-DESIGN-DIRECTION.md`,
`03-VISUAL-LANGUAGE-AND-TOKENS.md` §1). The imagery the direction calls for is: (a) the inline
SVG commercial-graph plate (`04`), (b) the **wordmark + signal-orange logo slab** (the real
`--glass-logo-orange` treatment, D-3), (c) the favicon set, (d) one OG image per route (social
sharing + SEO), (e) **brand-glass composition assets** for the auth left-panel + hero accents
— built from `.dashboard-glass-warm` + `--grad-hero-continue` / `--grad-hero-create` + the
material-frost tile vocabulary already in the Workshop Dashboard (NOT stock photos, NOT fake
product screenshots per D-2), and (f) **one** founder photo (⚠️ GATED). No stock photos. No AI
photography. No illustration commission. No re-drawn browser/IDE chrome. No slideshow. No
video. The restraint IS the brand argument; adding imagery the direction does not call for
dilutes the Glass Brand move.

---

## 2. The asset inventory

| Asset | Status | Format | Size target | Owner doc |
|---|---|---|---|---|
| Wordmark + signal-orange logo slab (`ArchestimatorWordmark` reskin + `ArchestimatorLogoMark` token fix) | **RESKIN** (component exists — `src/components/brand/ArchestimatorLogo.tsx`) | SVG mark + Doto wordmark text (no SVG text outlines needed) | < 5 KB rendered | This doc §3 |
| Favicon set (multi-size + maskable + apple-touch) | **NEW** (replace existing `public/favicon_io/*`) | ICO + PNG + SVG | < 50 KB total | This doc §4 |
| OG image (per route, 8 routes incl. `/login` + `/signup`) | **NEW** | SVG → PNG via `sharp`, 1200×630 | < 100 KB each | This doc §5 |
| Commercial-graph plate SVG | **NEW** | Inline SVG (rendered from the data model) | n/a (inline) | `04` |
| Brand-glass composition assets (auth left-panel + hero accent tiles) | **NEW** | CSS gradients + inline SVG frost tiles (zero raster bytes) | 0 KB raster (CSS only) | This doc §7 |
| Founder photo | ⚠️ **GATED** (L-FND-1) | JPEG / WebP, square + 4:3 crop | < 80 KB delivered (`next/image`) | This doc §6 |
| Favicon / brand mark for footer + header (subset of the logo slab) | **RESKIN** (reuse `ArchestimatorLogoMark`) | SVG | < 3 KB | This doc §3 |
| Manifest icons (PWA-ready, maskable) | **NEW** (extend `site.webmanifest`) | PNG (192/512) + maskable | < 100 KB | This doc §4 |
| Founder-photo fallback (social card when `/about` shared pre-L-FND-1) | **NEW** | PNG (OG-sized), pure CSS-glass composition | < 100 KB | This doc §6.2 |

> **Font note.** The wordmark ships as **Doto text** (`--font-display`, `layout.tsx:12-17`),
*not* as SVG-outlined Source Serif 4 (the prior direction's plan). Doto is already loaded
globally, so the wordmark adds **zero font requests**. See §3.

---

## 3. The wordmark + signal-orange logo slab (D-3)

This is the single highest-visibility asset. It must read as the **same brand** in the landing
header, the auth left-panel, the favicon, and the footer.

### 3.1 What exists today (verified)

`src/components/brand/ArchestimatorLogo.tsx` ships two pieces:

- **`ArchestimatorLogoMark`** — a 1024×1024 SVG "A" path rendered with `fill="currentColor"`
  and `className={tone === "light" ? "text-white" : "text-[#F24405]"}`. **Off-token on two
  counts:** (1) the color is a raw hex `text-[#F24405]`, not the `--glass-logo-orange` token;
  (2) it is a flat fill, not the logo-slab treatment the dashboard uses (the gradient at
  `globals.css:135` + the border at `globals.css:140`).
- **`ArchestimatorWordmark`** — `<span className="font-sans font-normal lowercase tracking-normal">archestimator</span>`.
  Plain SF Pro lowercase text. **Not Doto, not branded.**

### 3.2 The reskin (D-1 + D-3)

The reskin keeps the file + the component API (so blast radius is minimal — see `21`) and
changes the rendering:

| Element | Today | Glass Brand | Binding |
|---|---|---|---|
| **Logo slab (the mark)** | Flat `text-[#F24405]` `currentColor` path | The **signal-orange slab**: a `--glass-nav-radius` (8px) rounded square filled with the logo gradient (`--glass-logo-gradient`, `globals.css:135`) + the `--glass-logo-border` (`globals.css:140`), with the white "A" path knocked out. The slab reads as a physical brand tile, matching the dashboard logo. | D-3 (`--brand-orange #F24405` for fills/logo slab via `--glass-logo-orange` L131). `#C63804` is for AA small **text** only — the slab is a fill, so `#F24405` is correct here. |
| **Wordmark** | `font-sans lowercase` plain text | **Doto** (`--font-display`, `layout.tsx:12-17`), uppercase, wide tracking (`--landing-tracking-display` per `03` §3.4), ink `--ink #3D3D3D` (NOT `#292929` — that override is retired per `03` §3.1). One signal-orange accent: the dot over the `i` (or a 2px accent rail under the wordmark) in `--brand-orange`, as the single presence flourish. | D-1 (Doto display). D-3 (`--brand-orange` presence; `--ink #3D3D3D` body). |
| **Tone variants** | `tone: "dark" \| "light"` | Keep the prop. `dark` = ink wordmark on canvas/glass (default). `light` = white wordmark + white-on-`--brand-orange` slab (for the footer glass-`--warm-canvas` + the auth panel when needed). | — |

**Why Doto text, not SVG-outlined Doto?** The prior direction planned Source Serif 4 **outlined
to SVG** so the wordmark would "ship without a font request." That trade-off made sense when
the wordmark was the *only* place a serif appeared. Under D-1, **Doto is already loaded globally
for every headline** (`layout.tsx:12-17`, consumed by `--font-display`), so rendering the
wordmark as Doto text adds **zero font requests** and keeps the wordmark crisp at every pixel
density without a maintenance-heavy outline step. The SVG-outlined-Doto path is preserved in
this section's git history for Direction D; it is not the default.

### 3.3 Accessibility (unchanged from today, restated)

- The slab mark carries `aria-hidden="true"` + `focusable="false"` (already set).
- The wordmark span is wrapped in a link to `/` with `aria-label="Archestimator home"`. The
  visible text "Archestimator" is the accessible name; no extra `<title>` needed for the text
  path (the SVG outline plan's `<title>` element is moot under Doto-text).
- Color contrast: `--ink #3D3D3D` on `--canvas #f5f5f5` ≈ 9.8:1 (AAA); `--ink` on
  `--glass-bg rgba(255,255,255,0.72)` over canvas ≈ 7:1 (AAA, verified in `12` §2). The
  signal-orange accent flourish is decorative (`aria-hidden`); it is not load-bearing text, so
  AA does not constrain it.

### 3.4 Production

- **Component:** edit `src/components/brand/ArchestimatorLogo.tsx` in place (blast-radius:
  `21` lists the consumers). Do **not** create `src/components/brand/Wordmark.tsx` as a new
  file — the task asked to "choose" the path, and reusing the existing component is the
  smaller, safer blast radius. (`Wordmark.tsx` was the prior-direction plan; it is retired.)
- **Standalone SVG:** export the slab mark (the rounded square + knocked-out "A") as
  `public/brand/logo-slab.svg` for use in the OG image template (§5) and the favicon source.
  Anchor the file on the slab geometry, not on a font.

> ⚠️ **GATED on L-DES-1** — the visual final of the Glass Brand (the exact slab gradient stop,
> the accent-rail naming) wants one owner look before the reskin merges. Mechanics proceed; the
> reskin lands behind the `L-DES-1…5` sign-off.

---

## 4. The favicon set

Replace the existing `/favicon_io/*` with a fresh, on-brand set. The theme_color in
`public/favicon_io/site.webmanifest` today is `#ffffff` — **wrong for the Glass Brand** (the
canvas is `--warm-canvas #f5f5f5`, and the browser chrome accent should read as the brand).
This is corrected in the reskin.

| File | Size | Purpose |
|---|---|---|
| `favicon.ico` | 16/32/48 multi-res | Legacy browsers. |
| `favicon-32x32.png` | 32×32 | Standard. |
| `favicon-16x16.png` | 16×16 | Standard. |
| `apple-touch-icon.png` | 180×180 | iOS home screen (no transparency — pre-compose on `--brand-orange`). |
| `android-chrome-192x192.png` | 192×192 | Android home screen. |
| `android-chrome-512x512.png` | 512×512 | PWA / splash. |
| `maskable-icon-512x512.png` | 512×512 (with **safe-zone padding**) | Android adaptive icon — `purpose:"maskable"` in the manifest. |
| `favicon.svg` | SVG (the slab mark) | Modern browsers; scales crisp. |

### 4.1 The source mark

The set is generated from the **signal-orange logo slab** (§3.4 `public/brand/logo-slab.svg`):
a `--glass-nav-radius`-equivalent rounded square filled with the logo gradient
(`--glass-logo-gradient` `globals.css:135`), white "A" knocked out. At small sizes (16/32px)
the gradient bands read as a solid `--brand-orange #F24405`; at 180/512px the gradient is
visible. This is the intended responsive read.

### 4.2 Maskable safe-zone verification (NEW, closes gap #3)

Android adaptive icons crop the source to any of several OEM mask shapes (circle, squircle,
rounded square, teardrop). The "safe zone" is the center 66% diameter (≈ 338px of a 512px
canvas) that is guaranteed visible across all masks. **Verification:**

- Generate the maskable source with the slab mark occupying **only the center 66%** (the slab
  itself ≈ 50% of canvas; the rest is the `--brand-orange #F24405` field that bleeds to the
  crop edge). The "A" must be fully inside the 66% diameter circle.
- **Verify in Android Studio's icon previewer** (or https://realfavicongenerator.net/favicon/
  checker) against circle + squircle + rounded-square + teardrop masks. The "A" must never be
  clipped; the brand-orange field must always reach the crop edge (so the icon reads as a solid
  brand tile, not a "floating mark on white").
- The `purpose` field in `site.webmanifest` must include `"maskable"` (today it is absent — the
  manifest lists two icons with no `purpose`, so Android treats them as "any" only).
- **Device confirm** on a Pixel (stock circle) and a Samsung Galaxy (One UI squircle) at
  launcher density. Carry as a verify item (L-DES-7, new — see §10).

### 4.3 The manifest corrections

Edit `public/favicon_io/site.webmanifest`:

- `theme_color`: `#ffffff` → **`#f5f5f5`** (`--warm-canvas`). The browser chrome matches the
  page canvas (D-1: the canvas is the brand).
- `background_color`: `#ffffff` → **`#F24405`** (`--brand-orange`) **for the splash background
  only** — the PWA splash shows the icon on this field, which is the presence stance (D-3).
  (If the owner prefers a calmer splash, `#f5f5f5` is the fallback; carry as L-DES-7.)
- Add the maskable icon entry with `"purpose": "maskable"`.
- Add a 192/512 `"purpose": "any maskable"` pair so a single file serves both roles where
  supported.

### 4.4 `metadata.icons` in `src/app/layout.tsx`

The `icons` block (`layout.tsx:22-29`) currently points at `/favicon_io/*`. Update to the new
paths (same dir, refreshed files — keeps the URLs stable for anyone who bookmarked the icon).
Add the SVG icon entry (`favicon.svg`) and the maskable entry. Blast radius in `21`.

### 4.5 Production tool

**Recommendation: script, not manual.** A reproducible script
(`scripts/generate-favicons.mjs`, NEW) using the already-installed `sharp` (§5.1) to render the
PNG sizes from `public/brand/logo-slab.svg` + an `.ico` builder. Manual
realfavicongenerator.net is a fine one-time bootstrap, but the script lets CI regenerate on a
slab change. The maskable source is a separate SVG with the safe-zone padding baked in (§4.2).

---

## 5. The OG image (per route)

Each route needs an OG image for social sharing + SEO. D-2 and the honesty rail ban stock
photos and fake screenshots, so the OG images are **Glass Brand typographic plates**: a 1200×630
PNG with the route's H1 set in **Doto** on the warm canvas, the signal-orange logo slab in one
corner, the canvas wash gradient (`--grad-canvas-wash` `globals.css:62`) as the field, and a
single hairline + accent rail. **Not** paper, **not** Source Serif 4.

### 5.1 Generator library — DECIDED: `sharp`

`sharp@0.34.5` is **already a production dependency** (`package.json:87`, listed in
`dependencies` and re-exported at `:118`/`:123`). It is the canonical Node image library in
this repo (used by `next/image` optimization). **Decision: use `sharp`.** Alternatives
considered:

- **`resvg-js`** — pure SVG→PNG rasterizer, marginally smaller install, but it would be a **new
  dependency** for a single use case; `sharp` already SVG-renders via its `librsvg` backend.
  Rejected to avoid the new dep.
- **Headless browser (Playwright)** — `@playwright/test` is present (`package.json:94`) but
  spinning a browser per OG image is ~100× slower than `sharp` and adds CI flake. Rejected for
  this use case (Playwright remains the right tool for the visual-regression suite in `16`).

This **closes the prior "open" OG-generator decision** (the old §10 listed it as O — pick at
implementation time). It is now decided: `sharp`, SVG template → PNG, in CI.

### 5.2 Routes + headline → H1 regression matcher (NEW, closes gap #3)

| Route | OG file | Headline on the image (= the route H1) |
|---|---|---|
| `/` | `public/og/home.png` | "Your cost intelligence layer." |
| `/features` | `public/og/features.png` | "Every feature, with its status." |
| `/pricing` | `public/og/pricing.png` | "Pricing, honestly." |
| `/about` | `public/og/about.png` | "A new company, building for teams who live in spreadsheets." |
| `/contact` | `public/og/contact.png` | "Talk to the founder." |
| `/trust` | `public/og/trust.png` | "What we will and will not claim." |
| `/login` | `public/og/login.png` | "Sign in — Archestimator" |
| `/signup` | `public/og/signup.png` | "Start free — Archestimator" |

> **Auth OG images.** `/login` + `/signup` are `noindex,nofollow` (`23` §7) so their OG images
> are **not for search** — they exist so that if a beta invite email or a DM renders a link
> preview, the card is on-brand instead of a default Vercel/Next placeholder. They are excluded
> from the sitemap and carry no structured data. The headline on the card matches the page
> `<title>`, not a marketing H1.

**Regression matcher (closes gap #3).** A CI test
(`16-TEST-AND-VERIFICATION-PLAN` §9.1) asserts that **the headline baked into each OG PNG
matches the route's H1** (or `<title>` for auth). The matcher:

1. Reads the route's H1 from `05-COPY-SKELETON.md` (the copy source of truth) — for auth, reads
   the `<title>` from `23` §7.
2. Reads the headline baked into the OG PNG via the generator's sidecar JSON
   (`public/og/<route>.meta.json`, written by the generator alongside the PNG).
3. Fails CI if they diverge. This prevents the OG images from silently drifting from the page
   copy when the copy changes — the failure mode the old §5 hand-waved at.

### 5.3 Production

- **Template:** one SVG template (`scripts/og-template.svg.ts` — a JS function returning the
  SVG string, parameterized by headline + slab mark + route accent).
- **Generator:** `scripts/generate-og-images.mjs` (NEW) reads the headline table above +
  `05` copy, renders the SVG, and rasterizes to PNG via `sharp(svgBuffer).png().toFile(...)`.
  Runs in CI on every copy change (a content-hash check skips unchanged routes).
- **Metadata:** each route sets `metadata.openGraph.images` via `generateMetadata` or the
  `metadata` export. Auth routes additionally set the `noindex,nofollow` robots (owned by `13`).
- **Fonts in the template:** the template embeds Doto (subset, latin) as a base64 woff2 inline
  in the SVG so `sharp` renders the headline in the correct face without a system-font
  fallback. The subset is generated once from the Google Fonts Doto file and committed to
  `scripts/og-assets/doto-subset.woff2` (< 30 KB). **No font fetch at OG-render time.**

> ⚠️ **GATED on L-DES-1** — the exact composition (slab position, accent-rail length, whether
> the route name appears as a kicker line) wants the same owner look as the wordmark reskin
> (§3.4). The generator mechanics proceed regardless.

---

## 6. The founder photo (⚠️ GATED on L-FND-1)

### 6.1 If + when the founder bio assets ship

- **Source:** owner-supplied photograph (the founder's photo, not a stock photo, not AI
  generation). No sketchy SVG.
- **Format:** JPEG (original) + WebP (delivered), via `next/image` with explicit dimensions
  (CLS = 0).
- **Crops:** square (the founder section + `/about`) + 4:3 (if used elsewhere).
- **Size:** < 80 KB delivered (`next/image` handles optimization).
- **Placement:** `FounderSection` (homepage §9) + `/about` §3 (per `05` + `06` §4).
- **Alt text:** descriptive, not decorative ("Philip Lewis, founder of Archestimator").

Until the assets ship, the `FounderSection` renders the §11.5 paragraph **without** the photo +
without the founder one-liner (per `05` §9 + `06` §4). **No fabricated photo; no AI-generated
face.**

### 6.2 Founder-photo fallback for social cards (NEW, closes gap #3)

When `/about` is shared before L-FND-1 resolves, the OG card must not render empty or fall back
to a generic preview. **Fallback asset:** `public/og/about.png` is generated in a **founder-less
variant** until the photo lands — the composition uses the **brand-glass composition** from §7
(the material-frost tiles + `--grad-hero-create`) in the area the photo will eventually occupy,
with the headline + a single accent rail. When L-FND-1 closes, the generator swaps the
composition to include the photo (square crop, `--glass-nav-radius` 8px border) — the OG
regenerator + the §5.2 matcher handle the swap, so no manual re-export.

This keeps the `/about` social card on-brand in both states and avoids the "empty rectangle"
that signals an unfinished page.

---

## 7. Brand-glass composition assets (NEW — the Glass Brand additions, closes gap #1)

This is the section the prior (paper) direction did not have. D-1 + D-2 call for **brand
composition assets** — not stock photos, not fake screenshots — built from the same material the
Workshop Dashboard + Estimate Sheet are built from.

### 7.1 The vocabulary (verified in `globals.css`)

| Source | Anchor | Used for |
|---|---|---|
| `--grad-canvas-wash` | `globals.css:62` | The page-background wash (subtle brand-orange bloom over `#f5f5f5`). |
| `--grad-hero-continue` | `globals.css:59` | brand-orange→amber→peach over `--glass-bg`. The hero accent band + the auth panel composition. |
| `--grad-hero-create` | `globals.css:60` | brand-orange→amber over `--glass-bg`. The secondary accent + the auth panel alternate. |
| `.dashboard-glass-warm` | (per `03` §4.1) | The auth LEFT panel surface (D-2, cross-link `23` §1.2). |
| Material-frost tile pattern | Workshop Dashboard (memory `workshop-dashboard-editorial-grid`: square material-frost tiles) | The repeating accent tiles in the hero + the auth panel composition. |

### 7.2 The assets (zero raster bytes — pure CSS + inline SVG)

- **`BrandComposition` component** (`src/components/landing/shared/BrandComposition.tsx`, NEW —
  sibling to `StatusPill` under `shared/`, per the canonical component home in `11`). A pure
  presentational RSC that composes the glass panel + the gradient + the frost tiles. **Takes a
  `variant: "hero" | "auth-panel" | "og"` prop** so the same composition serves the hero accent,
  the auth left-panel (D-2), and the OG fallback art. `aria-hidden="true"` — it is decorative.
- **Frost-tile SVG** (`public/brand/frost-tile.svg`, NEW) — the single material-frost tile
  motif, inline-able, < 1 KB. Tiled via CSS `background-image` + `background-repeat` at a
  low opacity (≤ 14%, the `--brand-orange-soft` register) so it reads as texture, not pattern.
  No `feTurbulence` / `feDisplacementMap` (those are on the §8 rail — AI-slop tells).
- **No raster.** The entire composition is CSS gradients + one tiny inline SVG. **Zero image
  bytes** on the hero/auth panel critical path — this is the perf win over the deleted 2.3 MB
  hero PNG (`L-REM-3`).

### 7.3 Where the compositions appear

| Surface | Composition | Owner |
|---|---|---|
| Hero accent band (the thin strip beside/below the H1) | `variant="hero"` — `--grad-hero-continue` strip + frost-tile texture at 10% opacity | `02`, `11` |
| Auth LEFT panel (D-2) | `variant="auth-panel"` — `.dashboard-glass-warm` panel + `--grad-hero-create` field + the logo slab + 3 frost tiles. **NO fake screenshots** (D-2). | `23` §1.2 |
| OG fallback art (founder-less `/about`) | `variant="og"` — the same composition rasterized via `sharp` into the OG template | §6.2 |

### 7.4 The no-screenshot rule (D-2, radical honesty)

D-2 explicitly forbids fake product screenshots in the auth panel; the §8 rail extends the ban
to re-drawn browser/IDE chrome anywhere. The `BrandComposition` is **abstract brand material**
(gradients + frost + slab), not a mock product UI. It does not show a fake dashboard, fake
estimate, fake graph, or fake chrome. This is the load-bearing distinction between "brand
composition" (allowed, on-brand) and "fake screenshot" (banned, dishonest).

---

## 8. The "what we will NOT ship" rail

Per PRODUCT.md + the impeccable skill + Hallmark + D-1/D-2. **The production no-stock-photo ban is
KEPT from the prior direction; the paper-aesthetic ban is RETIRED (D-1).** The only exception is
the doc-24 implementation placeholder rule for seeded `picsum.photos`, which is blocked from public
cutover by L-TASTE-3.

| Banned | Why | Source |
|---|---|---|
| **Production stock photos** | Reads as AI slop; the cream/sand/warm AI default; conflicts with the Glass Brand. Seeded `picsum.photos` may appear only as draft/development placeholder texture under L-TASTE-3. | impeccable skill "Color & Theme"; `01` §3.1; `24` §4 |
| **AI-generated photography or illustration** | Conflicts with §15 honesty (a generated "customer" is an invented testimonial) | `MASTER` §15 |
| **Re-drawn browser/IDE chrome** (fake screenshots, mock app windows, mock dashboards in the auth panel) | D-2 bans; Hallmark bans; §12.9 bans "dashboards that perform" | D-2; `23` §1.2; Hallmark re-drawn-chrome rule; `04` §4.1 |
| **Hand-drawn / sketchy SVG illustrations** | Reads as amateurish; the codex tell | impeccable skill "Absolute bans" |
| **Logos / partner marks** | None exist; §15 forbids inventing them | `MASTER` §15; `06` §3.4 |
| **Compliance badges** (SOC2/GDPR/HIPAA/DPA) | Entity/DPA not done | `MASTER` §17 #2/#4; `06` §3.4 |
| **Construction-photo slideshow** | "Dashboards that perform" | `MASTER` §12.9; L-REM-3 |
| **2.3 MB frosted-construction hero PNG** | "Dashboards that perform"; perf cost | `MASTER` §12.9; L-REM-3 |
| **Lottie animations** (decorative) | Last-resort enrichment; CSS art is preferred | Hallmark enrichment hierarchy; `04` §4.1 |
| **`feTurbulence` / `feDisplacementMap` filters** (fake "paper grain" or fake "frost noise") | Codex AI-slop tell. The §7 frost-tile is a hand-authored SVG, not a noise filter. | impeccable skill "Absolute bans" |
| **`repeating-linear-gradient` stripe backgrounds** | Codex AI-slop tell | impeccable skill "Absolute bans" |
| **Source Serif 4 wordmark / OG headline** (the prior direction's plan) | DEFERRED under D-1; the proposal export is `.xlsx` and the continuity claim cannot be made | D-1; `03` §7.4; L-DES-3 |

This rail is enforced at code review + by the claims forbidden-list sweep
(`16-TEST-AND-VERIFICATION-PLAN` §9.1) + by the §5.2 OG-matcher (which would fail if a
fabricated stat or badge were baked into an OG image).

---

## 9. Asset storage + delivery

| Asset type | Location | Delivery |
|---|---|---|
| Logo slab SVG + frost-tile SVG | `public/brand/` | Inline (the component) + `<img>`/`<use>` (the file). |
| Favicons | `public/favicon_io/` (same dir, refreshed files — stable URLs) | `<link rel="icon">` in `layout.tsx` `metadata.icons`. |
| OG images + sidecar JSON | `public/og/` | `metadata.openGraph.images` per route. |
| Founder photo | `public/founder/` (gated L-FND-1) | `next/image` with explicit dimensions. |
| Plate SVG | Inline (rendered from the data model in `04`) | No file; React component. |
| Manifest icons | `public/favicon_io/` | `site.webmanifest`. |
| `BrandComposition` | `src/components/landing/shared/` | React component (zero raster). |
| Doto subset (for OG render only) | `scripts/og-assets/doto-subset.woff2` | Inlined into the OG SVG template; never shipped to the browser (the browser gets Doto via `next/font`). |

All static assets cached per Vercel's default static-asset caching (long-lived, immutable). The
OG images + favicons are regenerated on copy/slab change via the CI scripts (§5.1, §4.5).

---

## 10. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`)

Per D-5, no gate is silently marked closed.

- **G — Founder photo (L-FND-1).** Blocks the photo in `FounderSection` + `/about`. The §6.2
  fallback ships meanwhile.
- **G — Glass-Brand visual final (L-DES-1…5).** Blocks the wordmark reskin merge (§3.4) + the
  OG composition final (§5.3). Mechanics proceed behind the gate.
- **G — Maskable safe-zone device verify (L-DES-7, NEW).** Android adaptive-icon crop verify
  on Pixel + Galaxy (§4.2) + the manifest `theme_color`/`background_color` final (§4.3).
- **G — Doto CLS = 0 lab verify (L-DES-6).** Inherited from `03` §7.2; the wordmark renders
  Doto text, so the `adjustFontFallback` verification covers it. Carried here for visibility.
- **O (DECIDED) — OG generator.** **`sharp`** (§5.1) — already a dep. Closed.
- **O (DECIDED) — Favicon generator.** **Script** (`scripts/generate-favicons.mjs`, §4.5) using
  `sharp`; manual realfavicongenerator.net as a one-time bootstrap if needed. Closed.
- **O (DECIDED) — Wordmark path.** Reuse `src/components/brand/ArchestimatorLogo.tsx` (reskin);
  do not create a new `Wordmark.tsx`. Closed.

---

## 11. Coherence contracts (this doc honors)

- **D-1 (Glass Brand)** — wordmark is Doto (`--font-display`); logo slab is the real
  `--glass-logo-orange` gradient treatment; brand compositions are built from `.dashboard-glass`
  + `--grad-hero-*`, not paper, not serif. ✅ (§3, §7)
- **D-2 (auth)** — the auth LEFT panel composition is `BrandComposition variant="auth-panel"`,
  no fake screenshots. OG images for `/login`+`/signup` included. ✅ (§5.2, §7.3)
- **D-3 (orange)** — slab fill is `--brand-orange #F24405` (via `--glass-logo-orange` L131);
  any small orange **text** uses `--brand-orange-dark #C63804`; **clay `#AA412A` is NOT a
  token, NOT referenced**. Tailwind v4 gotcha honored: `bg-[color:var(--x)]`, never
  `bg-[var(--x)]`. ✅ (§3, §4)
- **D-4 (ClaimStatus)** — assets do not render claim status; the favicon/OG/manifest are
  status-neutral. If the OG template ever shows a status tag, it imports `StatusPill` from
  `src/components/landing/shared/StatusPill.tsx` and narrows. ✅
- **D-5 (honest scoring)** — §13. No self-congratulation. Gated items carried, not claimed. ✅
- **Radical honesty** — no fabricated photos/screenshots/stats/badges/prices anywhere; the
  founder-less fallback is brand composition, not a fake face. ✅ (§6, §7.4, §8)
- **Rate-limiting = Postgres, Turnstile not built** — inherited from the pack; not directly
  in scope for assets, but the `/contact` + `/signup` forms these assets decorate enforce it. ✅

---

## 12. Cross-links

- **`00-OVERVIEW.md`** — the ratified decisions D-1…D-5 this doc obeys; the §7 gate table
  (L-FND-1, L-DES-1…5, L-REM-3).
- **`01-DESIGN-DIRECTION.md`** — the Glass Brand rationale; §3.4 preserves the prior paper
  direction as "Direction D — The Document" (the fallback this doc's §1 + §8 reference).
- **`03-VISUAL-LANGUAGE-AND-TOKENS.md`** — every color/type/radius/glass token this doc cites
  (§3.1 verified-anchor table). `BrandComposition` consumes `.dashboard-glass-warm` +
  `--grad-hero-*` per `03` §4.1.
- **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`** — the inline plate SVG (separate from the
  brand-composition assets in §7).
- **`05-COPY-SKELETON.md`** — the H1 source of truth the §5.2 OG matcher reads; the §11.5
  founder paragraph (§6).
- **`06-PROOF-AND-CLAIMS-DISCIPLINE.md`** — the §15 honesty rail + the founder-section
  no-photo-until-L-FND-1 rule (§6.1).
- **`10-CANONICAL-DOC-MAP.md`** — canonical filenames; every cross-link here resolves.
- **`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`** — the `ArchestimatorLogo` reskin (§3) +
  `BrandComposition` (§7) component inventory rows.
- **`12-ACCESSIBILITY-AUDIT.md`** — wordmark contrast verification (§3.3) + the maskable
  safe-zone a11y read (§4.2 — a clipped "A" is an a11y/brand failure).
- **`13-SEO-AND-DISCOVERY.md`** — OG images for social sharing (§5); the `Organization.logo`
  schema (waits on the logo-slab SVG export §3.4); auth OG excluded from sitemap (§5.2).
- **`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`** — the asset payload budget (§4.2); the
  zero-raster-byte claim for `BrandComposition` (§7.2); the Doto CLS gate (L-DES-6, §10).
- **`16-TEST-AND-VERIFICATION-PLAN.md`** — the OG-image headline→H1 regression matcher (§5.2) +
  the forbidden-list sweep (§8) + the maskable-crop visual check.
- **`20-CONTENT-WORKFLOW-AND-GOVERNANCE.md`** — the OG-image + favicon regeneration cadence
  (on copy change / slab change).
- **`21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`** — the favicon replacement (existing
  `/favicon_io/`), the `ArchestimatorLogo.tsx` reskin consumers, the legacy
  `public/archestimator_logo*.svg` files.
- **`23-AUTH-EXPERIENCE.md`** — the auth LEFT panel composition contract (§7.3) + the auth OG
  images (§5.2).
- **`LOOP_LEDGER.md`** — L-FND-1 (founder photo), L-DES-1…5 (visual final), L-DES-6 (Doto CLS),
  L-DES-7 (maskable device verify, NEW), L-REM-3 (slideshow + 2.3 MB PNG removal), and
  L-TASTE-3 (placeholder-image cutover).

---

## 13. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **95 / 100** | Fully flips to the Glass Brand (D-1): adds the brand-composition asset class (§7) the prior paper direction lacked, keeps the load-bearing no-stock-photo/no-fake-screenshot rail, reconciles the wordmark to Doto + the real `--glass-logo-orange` slab, and decides the open tooling questions (`sharp`, script-generated favicons, reuse-not-recreate for the component). Not 100 because the exact `BrandComposition` composition and the slab gradient stop want the L-DES-1 owner look before the strategy is pixel-locked, and the `/about` founder-photo fallback (§6.2) is a workaround whose lifespan depends on L-FND-1. |
| **Quality** | **94 / 100** | Every token citation is grep-verified against `globals.css` with the line numbers in the YAML header; every component path (`ArchestimatorLogo.tsx`, `site.webmanifest`, `layout.tsx` metadata) is verified against the live tree; the `sharp` decision is grounded in `package.json:87`; the §5.2 OG matcher + the §4.2 maskable safe-zone + the §6.2 founder fallback close the three named gaps. Not 100 because the Doto-subset base64 inline in the OG SVG template (§5.3) is a reasonable technique but the subset size + the exact `sharp` SVG-render backend (librsvg vs. resvg) are implementation-time confirmations, and the maskable safe-zone 66% figure is the Android spec convention but has not been measured against this specific slab geometry on a device. |
| **Implementation-Readiness** | **92 / 100** | An implementer can start: the reskin target (`ArchestimatorLogo.tsx`) is named with its current API, the new files (`public/brand/`, `public/og/`, `scripts/generate-og-images.mjs`, `scripts/generate-favicons.mjs`, `BrandComposition.tsx`) are listed with their props/variants, the manifest corrections are concrete (`theme_color`, `background_color`, `purpose:"maskable"`), and the regression matcher is specified as a CI shape. Not 100 because (a) `public/brand/`, `public/og/`, `scripts/generate-og-images.mjs` do not exist yet (they are the deliverable); (b) the maskable-crop + Doto-CLS + slab-gradient finals genuinely wait on L-DES-1/L-DES-6/L-DES-7 before the reskin can merge; (c) the founder photo waits on L-FND-1. Per D-5 these open gates honestly cap readiness below 100 rather than being silently closed. |

**Carried to LOOP_LEDGER (not silent):** L-FND-1, L-DES-1, L-DES-2, L-DES-3 (informational),
L-DES-4 (inherited), L-DES-6, L-DES-7 (NEW), L-REM-3, L-TASTE-3.
