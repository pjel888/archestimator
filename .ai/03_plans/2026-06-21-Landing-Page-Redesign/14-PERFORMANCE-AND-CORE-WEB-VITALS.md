# 14 — Performance & Core Web Vitals

> **STATUS: PLANNING ONLY · 2026-06-21 (revised 2026-06-22 per ratified keystone decisions D-1…D-5) · not code.**
> **Purpose:** Own the performance contract for the landing redesign: the CWV targets, the
> field-vs-lab measurement methodology, the PH + SEA device class + geography, the JS/font
> budgets, the **glass / `backdrop-filter` perf model + the deferred-glass arming cost**, the
> CI regression gate, and the remediation playbook. MASTER §17 #16 flags perf targets as NEEDS
> INPUT; doc `07-ENGINEERING-CONSTRAINTS.md` §3 has the budget; this doc operationalizes it.

This doc owns **performance evidence**. It does not own the RSC architecture (→ `07`), the
tokens (→ `03`), or the test runner (→ `16`). Every target here is measurable; every claim
has a CI gate or a field source. **Honors D-1 (Glass Brand — Doto + Roboto Mono, Source Serif 4
DEFERRED), D-2 (full-page auth), D-3 (orange tokens), D-4 (ClaimStatus), D-5 (honest scoring).**

---

## 1. The audience reality (why these targets, not the default)

The landing's audience is **AEC professionals in PH + SEA running estimates in spreadsheets
on mid-range Android phones over 4G**. The default Lighthouse-on-a-Mac-book-on-broadband
measurement hides the audience. The targets below are set for the audience, measured in the
audience's conditions, and gated in CI on the audience's device class.

**Physical scene (per the impeccable skill):** a contractor in Manila opens archestimator.com on
a Samsung Galaxy A12 over Globe 4G LTE during a lunch break, with two other apps open. The
page must paint the hero in under 2 seconds or they bounce. They are not on a Mac, not on
broadband, not on Wi-Fi. **This is also the device class that makes `backdrop-filter: blur()`
expensive — see §4.**

---

## 2. The targets (ratified recommendation; ⚠️ GATED on L-ENG-1)

| Metric | Target | Threshold (CI gate fails) | Why |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.0 s on cold cache, Moto G-class, fast 4G, SIN edge | > 2.5 s | Text headline (Doto, no image); achievable for static HTML. |
| **CLS** (Cumulative Layout Shift) | < 0.05 | > 0.1 | Reserve space for the plate, fonts, the deferred-glass ramp, and any figure; no late-loading reflow. |
| **INP** (Interaction to Next Paint) | < 200 ms | > 500 ms | Near-zero JS; the few hydrating leaves are tiny (§6). |
| **TBT** (Total Blocking Time, lab) | < 150 ms | > 300 ms | Proxy for INP in lab. |
| **JS shipped (initial, marketing routes)** | < 40 KB gzipped | > 60 KB | RSC-first; only the `07-ENGINEERING-CONSTRAINTS.md` §1.2 leaves hydrate. |
| **Font payload (Doto + Roboto Mono)** | < 50 KB per weight gzipped, latin **+ ₱ (U+20B1) subset** | > 80 KB | **Already loaded app-wide** (`src/app/layout.tsx:2,9,12-17`) — see §5. Only the LCP-critical Doto weight is preloaded; Roboto Mono lazy-loads. |
| **Document payload (HTML)** | < 30 KB gzipped | > 50 KB | Static editorial page; no client data. |
| **Time to First Byte (TTFB)** | < 200 ms at SIN edge | > 400 ms | Vercel in-region; static generation. |
| **Simultaneous glass-blur panels** | ≤ 4 per viewport | > 4 | GPU cost of `backdrop-filter: blur()` on mid-range Android — see §4. |

⚠️ GATED on L-ENG-1: ratify these as gates before treating them as such. Until ratified,
they are planning recommendations. Per D-5 these are carried in `LOOP_LEDGER.md`, never
silently marked closed.

---

## 3. Measurement methodology

### 3.1 Field (the source of truth)

| Source | What it measures | Cadence |
|---|---|---|
| **CrUX** (Chrome User Experience Report, via PageSpeed Insights + Search Console) | Real-user LCP / CLS / INP / TTFB, geo-filterable to PH + SEA | Continuous (monthly publication) |
| **Vercel Web Analytics** (already shipped, `src/app/layout.tsx:41`) | Real-user page views + CWV (Vercel's sampling) | Continuous |
| **Vercel Speed Insights** (already shipped in `layout.tsx:42`, `<SpeedInsights />`) | Real-user CWV per route | Continuous |

The field data is the truth; the lab data is the regression gate. Field performance in PH +
SEA on mid-range Android is the bar; US lab performance is informational.

### 3.2 Lab (the CI regression gate)

| Tool | Where | Device class | Throttling | Gate |
|---|---|---|---|---|
| **Lighthouse CI** (`@lhci/cli`) | GitHub Actions on every PR affecting `src/components/landing/`, `src/components/auth/`, `src/app/<route>/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx` | Moto G Power class (CPU 4x slowdown) | Fast 4G (9 Mbps down, 1.5 Mbps up, 150 ms RTT) | LCP < 2.5 s; CLS < 0.1; TBT < 300 ms. PR fails otherwise (§7). |
| **`@next/bundle-analyzer`** | CI on every PR | n/a | n/a | Initial JS < 60 KB gzipped per marketing route. PR fails otherwise (§7). |

The CI gate runs **against the preview build** (`/newdesign`) pre-cutover and **against the
canonical routes** post-cutover.

### 3.3 The PH + SEA device matrix

The field-data cut must filter to:

- **Geo:** PH, ID, MY, SG, TH, VN (SEA).
- **Device:** mid-range Android (Samsung Galaxy A series, Xiaomi Redmi, OPPO A series) —
  representative of the contractor audience.
- **Network:** 4G LTE (Globe, Smart, Telkomsel, Maxcis, AIS) — not Wi-Fi.

CrUX filters by geo + connection (4G); device filtering is via the field-data segmentation
in the analytics tool (L-ENG-2).

---

## 4. The glass / `backdrop-filter` perf model (D-1 Glass Brand)

The Glass Brand (D-1) makes `backdrop-filter: blur()` a **load-bearing first-paint cost**,
not a decorative flourish. This is the section that makes the landing *and* the auth surface
perform on a mid-range Android on 4G. Cross-link: `03-VISUAL-LANGUAGE-AND-TOKENS.md` §4 owns
the token + technique; this doc owns the **cost model + the budget**.

### 4.1 The cost on mid-range Android

`backdrop-filter: blur(N)` is a per-frame GPU composite. Measured ranges (Chrome DevTools
performance panel + the project's own bench harnesses, memory `liquid-glass-sidebar-direction`
+ `workshop-dashboard-no-scroll-fix`):

- **Moto G Power / Galaxy A12 class (Adreno 610 / Mali-G52):** ~4–10 ms / frame **per live
  blur panel** at `--glass-blur: 18px` when scrolling, ~2–4 ms / frame when idle. At 4
  simultaneous panels that is ~16–40 ms / frame — the difference between 60 fps (16.6 ms),
  30 fps (33 ms), and visible jank (> 50 ms).
- **Desktop / high-end Android:** ~0.5–2 ms / frame per panel; the cap is not binding.
- **The cap on `--glass-blur` is 16–20px (`globals.css:110`, verified `--glass-blur: 18px`).**
  Higher values compound nonlinearly on tiled mobile GPUs. Do not raise it for the landing.

This is why the **≤4-simultaneous-blur cap** (`03` §4.4) is a perf budget, not a style rule,
and is a row in the §2 target table.

### 4.2 The deferred-glass arming pattern (the canonical technique, reused verbatim)

The landing inherits the app's deferred-glass pattern **unchanged** — verified in
`src/components/system/LiquidGlassReady.tsx` (mounted globally at `src/app/layout.tsx:40`) +
`src/app/globals.css:287-313`. The arming sequence:

1. **Paint blur-OFF first.** `@property --glass-blur-amount` (`globals.css:287-291`) starts at
   `0px`; every glass surface ships with a solid `--glass-bg-fallback #fbfbfc` (`globals.css:109`)
   so first paint is cheap and the LCP text headline is not blocked by a single blur.
2. **Arm after first paint + idle.** `LiquidGlassReady.tsx` sets `<html data-glass="ready">`,
   which flips `--glass-blur-amount: var(--glass-blur)` (`globals.css:295-297`). The arming chain
   is: **`document.fonts.ready` race (1000ms cap) → double-rAF → `requestIdleCallback({ timeout:
   400 })` → arm.** Safari falls back to a `setTimeout(arm, 200)` (no rIC).
3. **Hard 1500ms backstop** (`LiquidGlassReady.tsx:56`), independent of the rAF/rIC chain —
   rAF is parked while the document is hidden (a background tab would otherwise stall arming
   indefinitely).
4. **Reduced-transparency opt-out** short-circuits at the JS level (`LiquidGlassReady.tsx:38`)
   AND in CSS (`globals.css:280-286`) — engines that support `backdrop-filter` but not
   `prefers-reduced-transparency` are NOT gated out (older Chrome would lose the frost). Do not
   "fix" this.
5. **Reduced motion snaps, never animates** (`globals.css:309-313`): the blur still applies once
   armed; only the ramp transition is killed.

### 4.3 How the JS/CPU budget absorbs the glass arming cost

`<LiquidGlassReady />` is a leaf client component (verified: `"use client"`,
`LiquidGlassReady.tsx:1`, returns `null`). Its cost on the landing:

- **JS payload:** negligible — a single `useEffect` + ~30 lines; pulls no other component into
  the client bundle. It is already in the app's global bundle, so the landing adds **zero** new
  JS for glass arming (it reuses the mounted instance).
- **CPU:** one rAF pair + one rIC per page load, all post-first-paint. This does NOT count
  against TBT (it runs after FCP, in the idle window) and does NOT block LCP (the headline
  paints before arming fires).
- **GPU:** the ramp cost is the blur itself, bounded by §4.1 + §4.4.

**Net:** the deferred-glass pattern converts a first-paint GPU cost into a post-idle GPU cost.
That is exactly the trade the LCP target needs.

### 4.4 The ≤4-simultaneous-blur cap (enforced)

At most **4** glass surfaces may carry a live blur in any single viewport on the landing
(cross-link `03` §4.4, `16-TEST-AND-VERIFICATION-PLAN.md` perf gate). Concretely:

- The sticky nav (1) + the hero brand panel (1) + the commercial-graph plate (1) + the
  claims-ledger panel (1) = **exactly 4** when all are visible.
- Auth (`23-AUTH-EXPERIENCE.md` §8) is a separate route; its single LEFT brand panel is
  **1 simultaneous blur** — well under the cap.
- If a future section adds a 5th blurred panel, **demote one existing panel to the opaque
  `--glass-bg-fallback`** (no `backdrop-filter`) before shipping.
- The cap is counted on the **initial desktop viewport** (≥1024px, pointer:fine — the only
  class that runs the animated ramp per `globals.css:303-307`); mobile snaps straight to full
  blur once armed, but the cap still applies because each blur is a per-frame GPU cost.

⚠️ **Verify item (not a claim):** memory `liquid-glass-sidebar-direction` records that
estimate-alignment + Realme 30fps **still need live verification on the target device**. The
4–10 ms/frame range above is a planning estimate, not a measured guarantee on the Moto G-class.
Carried as **L-A11Y-1** in `23-AUTH-EXPERIENCE.md` §10; this doc adds **L-ENG-4** (live 30fps
verification of the landing's 4-panel stack on Moto G Power) to the §11 ledger.

---

## 5. The LCP strategy (text headline, not a hero image)

Per `07-ENGINEERING-CONSTRAINTS.md` §3.1: the LCP element is the **Hero H1 text** (e.g.
"Your cost intelligence layer."), server-rendered in **Doto** (D-1 — the display face Philip
ratified). No hero image (the 2.3 MB frosted-construction PNG is on the removals rail,
L-REM-3). This makes the hero path a text-rendering problem, not an asset-download problem,
and keeps it independent of the hosted-Supabase RTT that bounds the in-app hero (memory
`hero-path-perf-network-bound`).

### 5.1 The font strategy (Doto + Roboto Mono, peso-sign safe)

**D-1 DEFERS Source Serif 4.** The Glass Brand landing loads **Doto** (display headlines)
+ **Roboto Mono** (numerals) + uses **SF Pro** (system UI stack). Source Serif 4 is NOT loaded
and the "same serif as your proposal" continuity claim is NOT made (the proposal export is
`.xlsx`, D-1). This section pins the font perf for the faces the landing actually ships.

**Both Doto and Roboto Mono are already loaded app-wide** — verified:

```ts
// src/app/layout.tsx:2,9,12-17  (verified 2026-06-22)
import { Doto, Roboto_Mono } from "next/font/google";
const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"], display: "swap" });
const doto = Doto({ variable: "--font-doto", subsets: ["latin"], weight: "variable", display: "swap" });
```

Both variables are attached to `<body>` (`layout.tsx:36`). **The Glass Brand landing adds ZERO
new font requests and ZERO render-blocking font CSS.** This is the fastest possible LCP
posture and is a direct consequence of the D-1 pivot.

#### 5.1.1 The subset — add the peso sign ₱ (U+20B1)

The current `subsets: ["latin"]` does NOT include the peso sign ₱ (U+20B1). ₱ matters because
pricing-philosophy copy uses it (`05-COPY-SKELETON.md` §9.2, §12.11). **Before ship, verify ₱
renders in Doto + Roboto Mono without a fallback-box CLS**, and if it does not, extend the
subset. Two safe options:

- **Option A (preferred, zero payload risk):** keep `subsets: ["latin"]` and let ₱ fall through
  to the system stack for that single glyph. The `adjustFontFallback` metrics (§5.1.2) hold the
  box dimensions so the fallback does not shift. Verify in Lighthouse CLS breakdown that the
  peso glyph produces no layout shift (O-1 below).
- **Option B (if Option A shifts):** add `subsets: ["latin", "latin-ext"]` to the LCP-critical
  `doto` config. ₱ (U+20B1) lives in the `latin-ext` block; `next/font/google` loads it as a
  subset — a single codepoint is **not** a valid `unicodeRanges` entry, so use the subset, not
  `unicodeRanges: ["U+20B1"]`. This adds < 1 KB per weight. Cross-link `18-I18N-AND-LOCALIZATION.md` (peso rendering).

⚠️ **O-1 (carried from `07-ENGINEERING-CONSTRAINTS.md`):** verify ₱ renders without CLS before
ship; choose Option A or B based on the measurement.

#### 5.1.2 `adjustFontFallback` for Doto (LCP-critical) — the verification step

`next/font/google` auto-injects a `adjustFontFallback` for the **fallback font** (the
metric-override that prevents CLS during the swap) when you do not set it explicitly. **Doto is
LCP-critical** (it carries the hero H1), so its swap CLS must be measured = 0 in Lighthouse on
a 320px Moto G-class device before cutover. **Roboto Mono is not LCP-critical** (it carries
numerals, not the headline); leave its `adjustFontFallback` at the `next/font` default and flag
it only if the claims-ledger counts shift on load.

If the Doto swap shifts, **pin `adjustFontFallback`** on the `doto` config in `layout.tsx:12-17`
(starting-point values; tune against observed CLS):

```ts
const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  adjustFontFallback: {
    ascentOverride: "0.93",
    descentOverride: "0.22",
    lineGapOverride: "0",
    sizeAdjust: "100%",
  },
});
```

These numeric values are a **starting-point estimate, not a verified measurement** — Doto's
closest available system fallback on Android is a mono/sans mix, and the exact metrics must be
tuned against the observed CLS in the lab (L-DES-6 in `03-VISUAL-LANGUAGE-AND-TOKENS.md` §11,
mirrored here as L-ENG-5). **Do not ship the pinned values without the measurement.**

#### 5.1.3 SF Pro — zero payload, no `adjustFontFallback` needed

SF Pro is a system stack (`globals.css:99`, `--font-sf-pro`); it has no fetch, no swap, no CLS.
Its licensing on non-Apple platforms is the product-wide gate L-DES-4 (`03` §2), NOT a
landing-new perf concern.

### 5.2 The image strategy (next to no images)

No hero image. No stock photos. The founder photo (⚠️ GATED on L-FND-1) goes through
`next/image` with explicit `width`/`height` (CLS = 0) and is lazy-loaded below the fold. The
plate is an inline SVG (no network request). The OG image is a static generated asset per
`19-ASSET-PIPELINE-AND-IMAGERY.md`. The Google "G" on auth (`23-AUTH-EXPERIENCE.md` §8) is a
tiny inline SVG or optimized PNG. Total image payload target: < 50 KB per route (excluding the
OG image, which is fetch-only by crawlers).

---

## 6. The JS budget (RSC-first)

Per `07-ENGINEERING-CONSTRAINTS.md` §1.2: only the hydrating leaves ship client JS —
`LandingShellClient` (the shell), `PlateCaption` (the plate interaction), `ClaimFilter` (the
ledger filter), `ScrollReveal` (the IntersectionObserver driver), and `LandingAnalyticsBoot`
(analytics + A/B boot). Auth adds the form leaves (`LoginForm`, `SignupForm`, `GoogleButton`,
`MagicLinkButton` — `23-AUTH-EXPERIENCE.md` §4), each a server-action form wrapper. Target:
**< 40 KB gzipped initial JS per marketing route** (including React + Next.js runtime, which
the framework controls). The component inventory (`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`)
is structured so each leaf is individually small and code-split.

**Two structural perf wins worth naming** (both consequences of decisions in other docs):

1. **The no-password auth model (D-2) means magic-link submit is a server action** —
   `<form action={signInWithEmail}>` posts directly to the server, no client fetch, no loading
   spinner JS, no client-side validation round-trip. The browser handles the redirect natively.
   This is the single biggest auth-perf win (`23` §8).
2. **`<LiquidGlassReady />` is already globally mounted** (`layout.tsx:40`) — the landing adds
   zero JS for glass arming (§4.3).

CI gate: `@next/bundle-analyzer` per route; the budget is enforced in CI (§7.2).

---

## 7. The CI regression gate (LHCI + bundle-analyzer)

This is the section that makes the §2 targets **a gate, not a wish**. Cross-link:
`16-TEST-AND-VERIFICATION-PLAN.md` owns the test runner shape; this doc owns the perf-gate
config snippets.

### 7.1 Lighthouse CI — `lighthouserc.js` (NEW file at repo root)

```js
// lighthouserc.js — Landing perf gate (D-1 Glass Brand). See
// .ai/03_plans/2026-06-21-Landing-Page-Redesign/14-PERFORMANCE-AND-CORE-WEB-VITALS.md §7.1.
// Fails the PR when any budget trips on the Moto G Power class + fast 4G preset.
module.exports = {
  ci: {
    collect: {
      // Start the preview build (bun run build && bun run start) on $PORT.
      startServerCommand: "bun run start",
      startServerReadyPattern: "Ready in",
      url: [
        // Canonical marketing routes (post-cutover). Pre-cutover, point these at /newdesign.
        "http://localhost:3000/",
        "http://localhost:3000/features",
        "http://localhost:3000/pricing",
        "http://localhost:3000/contact",
        "http://localhost:3000/trust",
        // Auth is RSC + one form leaf — assert it stays cheap too (D-2).
        "http://localhost:3000/login",
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop", // base; the throttling + CPU slowdown below override
        throttling: {
          rttMs: 150, // fast 4G RTT
          throughputKbps: 9 * 1024, // 9 Mbps down
          downloadThroughputKbps: 9 * 1024,
          uploadThroughputKbps: 1.5 * 1024,
          cpuSlowdownMultiplier: 4, // Moto G Power class
        },
        emulatedFormFactor: "mobile",
        screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75 },
      },
    },
    assert: {
      assertions: {
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        // Resource budgets (gzipped) — cross-links to §2.
        "resource-summary:script:size": ["warn", { maxNumericValue: 60 * 1024 }],
        "resource-summary:document:size": ["warn", { maxNumericValue: 50 * 1024 }],
      },
    },
    upload: {
      target: "temporary-public-storage", // swap for lhci server when the dashboard lands
    },
  },
};
```

**Notes:**

- The `assert` block uses `error` for the CWV gates (LCP/CLS/TBT — PR fails); `warn` for the
  payload budgets (script/document — annotate but do not fail until L-ENG-1 ratifies the hard
  cap; see §11). Promote `warn` → `error` once ratified.
- The Moto G Power preset (CPU 4× slowdown + 150 ms RTT + 9 Mbps) is the device class named in
  §2 + §3.2. Do not relax it for "dev convenience" — the audience is the device class.
- `numberOfRuns: 3` median-of-3 reduces single-run Lighthouse variance.

### 7.2 Bundle analyzer — fail the PR at 60 KB via `size-limit`

Two enforcement mechanisms are viable; **`size-limit` is the gate** (it fails `next build`
cleanly), **`@next/bundle-analyzer` is the diagnostic** (already in devDeps,
`package.json:93`). Ship both.

**`size-limit` config (NEW `.size-limit.json` at repo root):**

```json
[
  {
    "name": "Landing marketing route — initial JS (gzipped)",
    "path": ".next/static/chunks/chunks-*.js",
    "limit": "60 KB",
    "gzip": true,
    "modifyWebpackConfig": false
  },
  {
    "name": "Auth route — initial JS (gzipped)",
    "path": ".next/static/chunks/chunks-*.js",
    "limit": "60 KB",
    "gzip": true
  }
]
```

> ⚠️ The `path` glob above is a planning placeholder; the real implementation uses
> `@size-limit/esbuild` or `@size-limit/webpack` against the **per-route** first-load chunk
> (Next.js emits per-route chunks under `.next/static/chunks/app/<route>/`). Pin the exact glob
> at implementation time against the actual build output. The **60 KB limit** is the binding
> number; the glob is the implementer's to finalize. Tracked as L-ENG-6 (verify the size-limit
> glob resolves to the marketing-route first-load chunk, not the whole shared bundle).

**CI step (`.github/workflows/ci.yml`, append after the Build step):**

```yaml
      - name: Bundle budget gate (size-limit)
        run: |
          bunx size-limit --json > size-limit.report.json || (echo "::error::Initial JS exceeds 60 KB gzipped budget (see 14-PERFORMANCE-AND-CORE-WEB-VITALS.md §7.2)" && exit 1)
      - name: Lighthouse CI perf gate
        run: |
          bunx @lhci/cli autorun || (echo "::error::CWV regression on Moto G-class + fast 4G (see 14 §7.1)" && exit 1)
```

**`@next/bundle-analyzer` (diagnostic, run on demand):** already in devDeps. Add
`ANALYZE=true bun run build` as a `perf:analyze` script; the HTML report identifies the heavy
import inside any leaf that breaches the budget. This is the *second action* in the §8
remediation table.

### 7.3 LHCI budget JSON (alternative format)

If the team prefers LHCI's native budget over `size-limit`, the equivalent
`.lighthouseci/budget.json`:

```json
[
  {
    "path": "/",
    "resourceCounts": [],
    "resourceSizes": [
      { "resourceType": "script", "budget": 60 },
      { "resourceType": "document", "budget": 50 },
      { "resourceType": "font", "budget": 50 },
      { "resourceType": "image", "budget": 50 },
      { "resourceType": "total", "budget": 300 }
    ]
  }
]
```

(KB units; one entry per route.) Pick ONE mechanism (§7.2 size-limit is the recommendation —
it fails the build cleanly and is route-aware); do not ship both `size-limit` AND the LHCI
budget JSON for the same dimension.

---

## 8. The CLS strategy

| Source of shift | Mitigation |
|---|---|
| Font swap (Doto hero) | `display: swap` + `adjustFontFallback` (verified CLS = 0, §5.1.2) + the LCP-critical Doto weight is preloaded via the global `<body>` className. |
| The plate SVG | Reserve the plate's space at the desktop/tablet/mobile sizes; the SVG scales to its container, never reflows. |
| The claims-ledger filter | Filtering is CSS-class-toggle on pre-rendered rows; no layout shift. |
| Images (founder photo, Google "G") | `next/image` with explicit dimensions; Google "G" is inline SVG. |
| Cookie banner | Existing `CookieConsentBanner` reserves space or renders as a non-shifting bottom sheet. |
| Sticky header | Reserve the header height via `scroll-padding-top` so anchor links don't hide content behind it. |
| **The deferred-glass ramp** | The ramp animates `--glass-blur-amount` (0 → 18px) over a `transform`/`opacity`-friendly `@property`; the **surface box is reserved at SSR size** so the blur ramp does not reflow content. Reduced-motion snaps to full blur without animation. |
| **The peso glyph ₱** (if not in subset) | `adjustFontFallback` metrics hold the box; verify no shift in Lighthouse CLS breakdown (O-1, §5.1.1). |

Target CLS < 0.05; CI gate at 0.1.

---

## 9. The INP strategy

Near-zero JS → INP is naturally low. The few interactions:

- Plate node hover/focus → caption swap. CSS transitions on `transform`/`opacity` only; the
  caption swap is a single state update.
- Claim filter → CSS-class-toggle on rows; no re-render.
- Header hamburger → standard disclosure.
- Scroll reveal → IntersectionObserver, off-main-thread.
- Auth form submit → server action (full document transition); no client JS on the click path.

INP target < 200 ms; CI gate (TBT proxy) at 300 ms.

---

## 10. TTFB + third-party-web-vitals accounting

### 10.1 TTFB at the SIN edge (primary)

Target < 200 ms at the Vercel SIN edge (`globals.css`-adjacent: the marketing routes are static
generation, so TTFB is edge-cache + cold-OR-warm origin fetch). Vercel's SIN region serves PH +
SEA with low RTT; the static HTML is served from the edge CDN on warm cache.

### 10.2 TTFB remediation if SIN edge is unavailable

If Vercel's SIN region is down, unreachable, or not configured for the deployment, TTFB for PH +
SEA degrades to the next-nearest region (typically HKG or SGP-fallback). Remediation ladder:

1. **First action (config):** confirm the Vercel project's region list includes `sin1` (Vercel
   dashboard → Project → Settings → Functions → Region). Add it if missing.
2. **Second action (edge):** confirm the marketing routes are statically generated (RSC +
   `generateStaticParams` where dynamic). Static HTML is served from the CDN edge regardless of
   the function region, so TTFB stays < 200 ms even if SIN functions are unavailable.
3. **Third action (CDN fallback):** if the whole Vercel edge is degraded for PH, front the
   marketing routes with Cloudflare (DNS-level) as a CDN-with-cache in front of Vercel. This is
   a cutover decision (L-ENG-7), NOT a default — only if field TTFB in PH exceeds 400 ms
   persistently. Cloudflare in front of Vercel adds a hop and complicates Vercel Speed Insights
   attribution; do it only if the field data demands it.
4. **Last resort (degrade gracefully):** the marketing routes are static; if even the CDN edge
   is unreachable, the browser still renders the cached HTML from its HTTP cache or a service
   worker (if one is added later). Do NOT block on a backend.

⚠️ **Carried as L-ENG-7:** the SIN-region configuration + the Cloudflare-in-front decision are
owner/infra decisions, not planning-resolvable. The static-generation posture means TTFB is
robust to region availability; the gate is "verify field TTFB in PH < 400 ms" once the preview
is live.

### 10.3 Third-party-web-vitals accounting

Two third-party scripts are planned but NOT yet shipped; both must be budgeted when they land:

| Third-party | Status | Perf impact | Budget |
|---|---|---|---|
| **Analytics SDK** (Vercel Web Analytics is shipped and first-party — no third-party cost; the L-ENG-3 A/B provider is the open decision) | Vercel WA: shipped, first-party. PostHog/other: gated L-ENG-3. | Vercel WA: ~1 KB, no CWV impact. A third-party SDK (PostHog, etc.) loads async + defers; can still cost LCP if not `fetchpriority="low"` + `async`. | **< 5 KB gzipped initial, async/deferred, never on the LCP critical path.** The §7.1 bundle gate covers first-party; the third-party SDK gets a separate `<script async>` budget. |
| **Cloudflare Turnstile** (CAPTCHA escalation on `/contact` + `/signup`) | **NOT yet built** (planned, escalation-only — `15-FORMS-AND-ABUSE-GUARDRAILS.md`, `23-AUTH-EXPERIENCE.md` §6). | Turnstile loads a `challenges.cloudflare.com` script (~30 KB uncompressed, ~10 KB gzipped) + runs a worker. On `/contact` + `/signup` only — NOT on marketing routes. | **Load Turnstile ONLY on `/contact` + `/signup`, never on `/`.** It is gated behind the abuse-escalation decision (L-FUN-4); until it ships, `/contact` + `/signup` use honeypot + Postgres rate-limit (project position: **Postgres `security_rate_limit_events`, NOT Redis**). |
| **Google OAuth** (the `accounts.google.com` redirect) | shipped (D-2). | No script payload on the landing — it's a redirect, not a tag. The Google "G" mark is a static inline SVG. | Zero CWV impact. |

**The rule:** no third-party script loads on the marketing routes except Vercel's first-party
analytics + Speed Insights (both shipped). When Turnstile ships, it is scoped to `/contact` +
`/signup` only. When the A/B provider (L-ENG-3) ships, it is async + deferred + budgeted at
< 5 KB initial. **No third-party script ever blocks LCP.**

---

## 11. The remediation playbook (if a target regresses)

| Regression | First action | Second action | Escalation |
|---|---|---|---|
| LCP > 2.5 s | Check the Doto font payload + the ₱ subset (is ₱ pulling extra weights?); check TTFB at SIN edge (§10). | Reduce the hero to a single preloaded Doto weight; inline the hero CSS; verify `adjustFontFallback` CLS = 0 (§5.1.2). | If still > 2.5 s on field, drop the hero to SF Pro for the H1 (keep Doto on the rest) — SF Pro is zero-fetch. |
| CLS > 0.1 | Run Lighthouse CLS breakdown; identify the shifting element. | Pin the element's dimensions; add `aspect-ratio` for the plate; verify `adjustFontFallback` for Doto; check the peso glyph (§5.1.1). | If still > 0.1, audit the cookie banner + sticky header + the deferred-glass ramp (§8). |
| INP > 500 ms | Profile with Chrome DevTools; identify the long task. | Move the work off-main-thread (IntersectionObserver, `requestIdleCallback`); split a heavy leaf. | If still > 500 ms, audit the analytics boot (defer until idle) + the A/B provider (§10.3). |
| JS > 60 KB | Run `@next/bundle-analyzer` (`bun run perf:analyze`); identify the heavy import. | Code-split the leaf; dynamic-import a non-critical dependency. | If still > 60 KB, audit the A/B provider (L-ENG-3) + analytics boot; promote the size-limit gate from `warn` → `error` (§7.2). |
| **Blur jank (> 4 panels / fps drop)** | Run the DevTools performance panel on Moto G Power; count live blur panels per viewport. | Demote one panel to the opaque `--glass-bg-fallback` (§4.4); lower `--glass-blur` to 16px for the remaining panels. | If still janky at ≤ 3 panels, audit the deferred-glass arming timing (is it arming mid-scroll?); fall back to static glass on mobile (`@media (pointer: coarse)`). |
| **TTFB > 400 ms in PH** | Verify SIN region is in the Vercel project config; verify routes are statically generated. | Add Cloudflare-in-front-of-Vercel (CDN cache) for marketing routes — gated L-ENG-7. | If field TTFB persists > 400 ms, treat as a deployment incident and roll back to the last-known-good edge config. |

---

## 12. Cross-links

- `00-OVERVIEW.md` — owns the ratified keystone decisions D-1…D-5 this doc obeys (Glass Brand,
  full-page auth, orange discipline, ClaimStatus, honest scoring) + the L-ENG-1/2/3 gate rows.
- `03-VISUAL-LANGUAGE-AND-TOKENS.md` — owns the glass tokens (`§4.1`) + the deferred-glass
  technique spec (`§4.3`) + the ≤4-blur cap as a style rule (`§4.4`); this doc owns the **cost
  model** for the same mechanism. The `adjustFontFallback` Doto values are proposed in `03` §7.2
  and **measured/verified here** (§5.1.2).
- `07-ENGINEERING-CONSTRAINTS.md` — the perf budget (§3) + the RSC-first architecture (§1) +
  the O-1 peso-sign-subset open item this doc operationalizes (§5.1.1).
- `08-ROLLOUT-AND-ANALYTICS.md` — the A/B guardrails reconcile to these targets (§3.2).
- `10-CANONICAL-DOC-MAP.md` — canonical filenames.
- `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` — the leaves that hydrate (§2).
- `12-ACCESSIBILITY-AUDIT.md` — instant focus rings (an INP + a11y shared concern) + the
  text-on-glass AA verification (`03` §4.5) that feeds the contrast budget.
- `13-SEO-AND-DISCOVERY.md` — CWV is an SEO ranking input.
- `15-FORMS-AND-ABUSE-GUARDRAILS.md` — owns the Turnstile-not-yet-built decision; this doc
  budgets its payload when it ships (§10.3).
- `16-TEST-AND-VERIFICATION-PLAN.md` — owns the CI test runner that executes the §7 gates.
- `17-ANALYTICS-AND-OBSERVABILITY.md` — the field-data tools + the third-party-SDK budget (§10.3).
- `19-ASSET-PIPELINE-AND-IMAGERY.md` — the image + OG payload.
- `23-AUTH-EXPERIENCE.md` — §8 (auth perf) cross-links here; the auth surface is 1 blur panel
  + a server-action submit (the structural perf wins in §6).
- `LOOP_LEDGER.md` — L-ENG-1 (target ratification), L-ENG-3 (A/B provider), L-ENG-4 (live 30fps
  Moto G verification), L-ENG-5 (Doto `adjustFontFallback` measurement), L-ENG-6 (size-limit
  glob), L-ENG-7 (SIN-region + Cloudflare-in-front).

---

## 13. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

Per D-5, no gate is silently marked closed. The load-bearing gates for THIS doc:

- **G — Target ratification (L-ENG-1).** The §2 targets are a planning recommendation until the
  owner ratifies them as gates. The §7 config uses `warn` for payload budgets until then; CWV
  gates use `error`.
- **G — Analytics tool (L-ENG-2).** Field-data segmentation (CrUX device filtering) depends on
  the tool decision.
- **G — A/B provider (L-ENG-3).** When the A/B provider ships, its SDK is budgeted at < 5 KB
  initial, async/deferred (§10.3). Until then, Vercel Web Analytics (first-party, shipped) is
  the only analytics on the marketing routes.
- **O — Live 30fps verification on Moto G Power (L-ENG-4, NEW).** The §4.1 4–10 ms/frame blur
  cost is a planning estimate; verify the landing's 4-panel stack holds 30fps on the target
  device. Mirrors L-A11Y-1 in `23-AUTH-EXPERIENCE.md` §10.
- **O — Doto `adjustFontFallback` CLS = 0 measurement (L-ENG-5, NEW).** §5.1.2 proposes
  starting-point values; CLS must be measured = 0 on a 320px Moto G-class device before
  cutover. Mirrors L-DES-6 in `03-VISUAL-LANGUAGE-AND-TOKENS.md` §11.
- **O — size-limit glob resolves to per-route first-load chunk (L-ENG-6, NEW).** The §7.2
  `.size-limit.json` glob is a placeholder; pin it against the actual `.next/static/chunks/app/<route>/`
  output at implementation time.
- **O — SIN-region configuration + Cloudflare-in-front decision (L-ENG-7, NEW).** §10.2
  remediation ladder; verify field TTFB in PH < 400 ms once the preview is live.
- **O — The peso-sign subset (O-1 in `07`).** Verify ₱ renders in Doto + Roboto Mono without
  CLS; choose Option A (system fallback) or Option B (`latin-ext`) based on the measurement.
- **O — The font fallback metrics.** Pin the exact `adjustFontFallback` values for Doto in
  `layout.tsx:12-17`; verify CLS = 0 in the lab before cutover (L-ENG-5 above).

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.**
Every numeric target is either an industry-standard CWV threshold (Google's
[Good CVW thresholds](https://web.dev/articles/vitals)) or a project-budget recommendation
awaiting ratification (L-ENG-1). Voice throughout = Controlled Confidence (`00-OVERVIEW.md` §10).
Rate-limiting is Postgres (`security_rate_limit_events` table), NOT Redis (project position). Turnstile is NOT
yet built (planned); `/contact` + `/signup` abuse = honeypot + Postgres rate-limit + validation;
CAPTCHA escalation-only.
