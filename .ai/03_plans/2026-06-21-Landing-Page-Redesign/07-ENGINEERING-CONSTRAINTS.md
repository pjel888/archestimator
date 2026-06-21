# 07 — Engineering Constraints & the Start-Free Funnel

> **PLANNING ONLY · 2026-06-21 (revised 2026-06-22 per ratified keystone decisions D-1…D-5) · not code.**
> Status banner — this document is a plan-pack artifact. Nothing here is implemented;
> every "we will" is a recommendation to the owner and the implementation lane (Codex),
> gated on the open decisions listed at the bottom.

**One-line purpose.** Define the engineering contract for the landing system — an
RSC-first, statically-rendered **Glass Brand** (`00-OVERVIEW.md` D-1) marketing surface
with near-zero client JS, a hard responsive floor, a perf/a11y budget, a **deferred-glass
performance model**, and an `@next/bundle-analyzer` CI gate — and scope the **"Start free"
funnel** plus its co-dependency gates (onboarding, demo-data/reset, abuse guardrails,
first-run flow) so the primary CTA can actually take a visitor to a working Free tier.

---

## 0. What this doc owns vs. cross-links

This doc owns: the rendering architecture, the responsive + perf + a11y + glass-perf
budgets for the marketing routes, the JS-budget + CI enforcement mechanism, the
measurement methodology, the funnel mechanics + activation metric + analytics events, and
the explicit Go/No-Go co-dependencies the "Start free" CTA leans on.

It does **not** own (cross-link instead):
- Visual tokens, the Doto + Roboto Mono + SF Pro type stack, motion, the deferred-glass
  arm pattern, glass/canvas/ink colour values, the ≤4-simultaneous-blur cap, the
  presence-accent (orange) discipline → **`03-VISUAL-LANGUAGE-AND-TOKENS.md`**.
- The commercial-graph SVG plate's content (nodes, claims tags) and its collapse/stack
  behavior at the *content* level → **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`**;
  this doc owns only the *rendering* contract for that plate (§2.3 below).
- Copy lines and the section taxonomy / DOM order → **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`**
  and **`05-COPY-SKELETON.md`**.
- Routes scope (the `/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`,
  `/login`, `/signup` set) and rollout (preview route under the existing `/newdesign` +
  `/design-sync` convention, A/B old-vs-new, claims sign-off gate) → **`00-OVERVIEW.md`**
  and **`08-ROLLOUT-AND-ANALYTICS.md`**.
- The full-page 2-column auth surface (D-2): `/login` + `/signup` layout, Google OAuth +
  magic link (no password), `noindex,nofollow`, mobile collapse, the "Start free" routing
  decision → **`23-AUTH-EXPERIENCE.md`**. This doc only owns the engineering contract the
  auth surface shares with the marketing surface (§1.5, §6.1).
- The claims-discipline sign-off itself (Live/Building/Planned ledger, the D-4
  `ClaimStatus` type) → **`06-PROOF-AND-CLAIMS-DISCIPLINE.md`** section 7 ("What is real
  today"); this doc only requires that a signed-off ledger object exists before public
  render (§3.2).
- The formal WCAG AA audit, contrast table, the formal text-on-glass contrast verification,
  the keyboard contract semantics → **`12-ACCESSIBILITY-AUDIT.md`**.
- The Core Web Vitals field-vs-lab measurement harness, the JS budget numbers in CI,
  the Lighthouse-on-Moto-G trace → **`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`**.
- The launch loop, evidence registration, and owner-decision queue → **`LOOP_LEDGER.md`**.

The canonical DESIGN BRIEF (header of this plan pack) and **`MASTER.md` §15** govern every
public word suggested below.

---

## 1. Rendering architecture: RSC-first, mirror the workshop-dashboard pattern

### 1.1 The pattern to copy (proven in repo)

The workshop dashboard was already moved to RSC with zero visual change (memory:
*Workshop dashboard RSC*). The landing system mirrors that exact pattern, which is also
the pattern the new auth surface uses (`23-AUTH-EXPERIENCE.md` §4.1):

- **`src/app/page.tsx`** (and each marketing route: `/features`, `/pricing`, `/about`,
  `/contact`, `/trust`) is a **Server Component**. It does not carry `"use client"`. It
  renders the page's static marketing content as a server-rendered tree and passes that
  tree as `children` to a thin client shell.
- A **`LandingShellClient`** (or per-route equivalent) is the `"use client"` boundary.
  It takes the server content as `children: ReactNode` and is responsible only for the
  things that genuinely need the client: scroll-reveal orchestration, the architecture-plate
  hover/claims interaction, analytics boot, and (where used) A/B bucket assignment.
- Only the **interactive leaves** hydrate. Each leaf is its own small `"use client"`
  component, so the rest of the page ships no client JS. This is the workshop-dashboard
  discipline: `WorkshopDashboard.tsx` is a Server Component; `WorkshopHomebaseClient.tsx`
  is the client shell; only the ~5 interactive leaves hydrate.

Reference files (read-only; do not modify during planning):
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/dashboard/WorkshopDashboard.tsx`
  (RSC — no `"use client"`).
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/WorkshopHomebaseClient.tsx`
  (`"use client"`; accepts `children: ReactNode`).
- `/Users/philiplewis/Documents/archestimator/src/app/page.tsx` — the current landing root,
  already an `async` Server Component (verified: `export default async function
  LandingPage()`), already using `getVariant()` server-side and wrapping children in
  `<ABExperimentProvider>` (§1.4).

### 1.2 What is static, what hydrates

**Static (server-rendered, no JS):** the entire editorial body — Header (glass masthead),
Hero (§11.1, Doto on the brand-gradient glass panel), The Problem, The Layer prose,
What-you-get (§11.2), How-it-works (§7.3 5-step), Who-it-is-for (§11.3), the claims ledger
**list** itself (server-rendered from a signed-off data object — see §3.2),
Why-not-a-spreadsheet (§11.4), the founder/company section (§11.5), Pricing-honestly
(§9.3 philosophy), Final CTA, Footer sitemap. All Doto + SF Pro + Roboto Mono, all server
HTML — **the landing is the Glass Brand, not paper** (D-1).

**Hydrating leaves (the only client JS on the page):**
1. **Architecture-plate interaction** — hover/focus reveal of the claims tag on each node
   of the commercial-graph SVG (doc 04). The plate itself renders as static SVG
   server-side; only the interaction handler is a client leaf.
2. **Claims-ledger interactivity** — if section 7 exposes a Live/Building/Planned filter
   or expand, that control is a client leaf over a server-rendered list. If the ledger is
   rendered as a static table (no filter), this leaf is absent and the section is pure HTML.
3. **Scroll-reveal orchestration** — the restrained fades (doc 03 §8). Prefer a single tiny
   IntersectionObserver driver mounted once in the shell; leaves opt in via `data-reveal`.
   Respect `prefers-reduced-motion` (§4.4).
4. **Analytics boot + A/B assignment** — only if the owner selects an analytics tool
   (⚠️ L-ENG-2) and an A/B provider for the rollout (doc 08). Until then, the A/B
   plumbing already in `page.tsx` is reused as-is (§1.4).
5. **Cookie/consent + Clarity script loaders** — the repo already ships
   `LandingAnalyticsLoader.tsx`, `CookieConsentBanner.tsx`, `ClarityScript.tsx`,
   `ABExperimentProvider.tsx`; reuse the existing loaders rather than re-adding. Audit them
   for the removals rail (§5) — none carry banned copy, but confirm during implementation.

**Target:** the marketing routes ship close to zero client JS for the editorial reading
experience; the few hydrating leaves are individually small and code-split (§3.2 + §3.5).

### 1.3 Static generation

All six marketing routes are statically generatable (no per-request data, no auth-gated
content on the marketing surface). Configure them for static generation
(`generateStaticParams` where applicable; otherwise SSG by default for content-only pages).
The landing never calls Supabase — the only dynamic surface the landing *touches* is the
hosted-Supabase call path inside the **app** after signup. This is the load-bearing reason
the landing's hero path does NOT inherit the in-app hero-path latency: the in-app hero's
first paint is network-bound on the hosted-Supabase RTT (memory: *Hero-path perf is
network-bound* — the 0.3–5s/call is the dev→hosted-Supabase round trip, **not** a code
problem; the DB is <1ms in-region and must be measured on Vercel in-region SIN, not local
dev hitting hosted Supabase). The landing sidesteps this entirely: its hero is a text
headline on a CSS-gradient glass panel, not a DB call.

### 1.4 The A/B provider under the RSC shell

`src/app/page.tsx` today uses `ABExperimentProvider` (client) + `getVariant("hero-cta-copy")`
(server) for the existing hero-copy experiment (verified lines 4/14/27/31). The redesign
**reuses this scaffolding** rather than introducing a new A/B library:

- **`getVariant(experimentId, { analyticsConsent }): Promise<Variant>`** lives in
  `src/lib/ab-testing/variant-assigner.ts` (verified signature). It is cookie-based,
  runs **server-side** (no hydration mismatch), is consent-gated, bot-gated, and 50/50
  assigns `"A" | "B"`. It returns a `Variant`, not a page tree.
- During the `/newdesign` rollout (doc 08 §3), the `landing-redesign-2026-06` experiment
  splits traffic between control (old `/` tree) and treatment (new `/` RSC tree). The
  variant is read server-side and the route **renders the matching page-component tree**
  (control `LandingPage` vs treatment `LandingPageV2`) inside the same
  `<ABExperimentProvider experimentId="landing-redesign-2026-06" variant={v}>` wrapper;
  the provider carries the variant into the client for event props.
- Post-cutover, the production page is single-variant (the new tree); the
  `landing-redesign-2026-06` experiment is archived.
- **⚠️ L-ENG-3 (resolved to a Phase-0 verification task).** Whether `getVariant()` supports
  **page-level tree splits** (control `LandingPage` vs treatment `LandingPageV2`) vs. only
  **prop-level splits** (today's `<HeroSection variant={v}>` usage) is a Phase-0
  implementation check, not a planning decision: the function returns a `Variant` string,
  so a route can `if (v === "B") return <LandingPageV2/>` trivially. The Phase-0 task
  (carried in `LOOP_LEDGER.md` L-ENG-3) is: confirm the control/treatment trees both
  render under the same `<ABExperimentProvider>` wrapper without a hydration mismatch,
  and that the cookie survives the redirect-to-`/newdesign` preview path. If PostHog is
  ratified as the analytics tool (L-ENG-2), PostHog Experiments can subsume the A/B
  responsibility at that point — but until then, the existing provider is the path.

### 1.5 Auth shares this contract (`23-AUTH-EXPERIENCE.md`)

The auth surface (`/login`, `/signup`) is **the same RSC-first pattern** (doc 23 §4.1): an
`AuthLayout` RSC shell + decorative `AuthGlassPanel` RSC + only the `LoginForm` /
`SignupForm` leaves hydrate, and submit is a **server action** (`<form action={...}>`),
so there is no client fetch round-trip for auth. This means the marketing-surface perf
budget (§3) and the auth-surface perf budget (doc 23 §8) are governed by the same
discipline: near-zero client JS, deferred glass (≤1 panel on auth, well under the §3.5
cap), text LCP. The two surfaces are independent routes, so they are never simultaneous.

---

## 2. Responsive contract — Hallmark 320/375/414/768 hard floor

### 2.1 Breakpoints and hard floor

The landing **must** render correctly at **320 / 375 / 414 / 768 px** viewport widths, and
at every width in between. 320px is the hard floor: no horizontal scroll, no clipped
content, no overlapping the accent rail (D-3 `--landing-accent`). This is the Hallmark
responsive floor; treat it as a gate, not a best-effort.

Existing repo breakpoints and the responsive-collapse pattern established for the workshop
dashboard bento (memory: *Workshop dashboard responsive*) are the reference: the dashboard
went 7-col → 2-up → 1-col. The landing follows the same discipline — editorial column at
desktop, narrower measure at tablet, single column at phone — but the landing's column is
**prose-optimized for Doto/SF Pro readability at the landing type scale**
(`03-VISUAL-LANGUAGE-AND-TOKENS.md` §3.4; body floor ≥14px, default 17px), not a bento grid.

### 2.2 Overflow handling

- `overflow-x: clip` (not `hidden`) on `html` and `body`. `hidden` breaks sticky positioning
  and scroll anchoring in some engines; `clip` does not. This prevents the architecture-plate
  SVG or any wide editorial figure from inducing a horizontal scrollbar at narrow widths.
- The architecture plate and any wide figure must additionally be wrapped in a container
  whose own `overflow-x` is bounded, so the clip on `body` is a backstop, not the primary
  defense.
- **Tailwind v4 gotcha (memory, 2026-06-20; doc 03 §3.3):** in this Tailwind v4 setup,
  `bg-[var(--x)]` silently emits no color; use `bg-[color:var(--x)]` for arbitrary-value
  backgrounds. The landing's glass/canvas surfaces use the named `@theme inline` utilities
  (`bg-landing-canvas`, `bg-landing-accent`) from doc 03 §3.3 — verify no element renders
  with a missing background (this is a visual-regression check in
  `16-TEST-AND-VERIFICATION-PLAN.md`).

### 2.3 Architecture-plate collapse

The commercial-graph plate (doc 04) renders as a horizontal architecture diagram at desktop.
At tablet and phone widths it **collapses to a vertical stack** of the named nodes, each
with its claims tag visible inline (rather than on hover), so a phone reader sees the same
information without interaction. The collapse is a CSS layout concern (doc 04 owns the
content/layout of the collapse); this doc owns the rendering contract: the SVG must be
authorable as a vertical stack without re-authoring per breakpoint — prefer a node-list
data structure rendered once, with a layout switch, rather than two hand-maintained SVGs.
The phone-stack view must not require hover to reveal any claim.

### 2.4 Touch

All interactive leaves must work with touch (no hover-only discovery). The architecture
plate's hover-reveal claims tag must have a `:focus` / tap equivalent, and on touch devices
the claims tags are best shown inline (collapse behavior, §2.3) rather than gated behind a
tap that a phone reader might not attempt.

---

## 3. Performance budget & Core Web Vitals targets

### 3.1 LCP strategy — Doto text headline on a CSS-gradient glass panel, not a hero image

LCP element is the **Hero headline** (§11.1, the cost-intelligence-layer line), which is
server-rendered Doto text (`--font-display`, already loaded globally in `src/app/layout.tsx`
— doc 03 §7.1). No hero image. The 2.3MB frosted-construction hero PNG and the
construction-photo slideshow are on the removals rail (§5) and must not be replaced by
another heavy image; the credibility move is craft + honesty, not photography (BRIEF;
§12.9 "documents you would trust, not dashboards that perform").

This makes the hero path a text-rendering problem, not an asset-download problem, and keeps
it independent of the hosted-Supabase RTT that bounds the in-app hero (memory: *Hero-path
perf is network-bound* — see §1.3). The landing is static; measure LCP on a cold cache on
the deploy target (Vercel in-region SIN), not against local dev hitting hosted Supabase.

### 3.2 Targets (landing marketing routes) + CI enforcement

| Metric | Target | Notes |
|---|---|---|
| LCP | < 2.0s on cold cache, fast 4G, Moto G-class | Text headline on glass; achievable for static HTML. ⚠️ Needs L-ENG-1 ratification before treating as a hard gate. |
| CLS | < 0.05 | Reserve space for the architecture plate, any figure, and the deferred-glass ramp; no late-loading fonts causing reflow (§3.3, §3.5). Doto + Roboto Mono are already in `<body>` — zero new font requests (doc 03 §7.1). |
| INP | < 200ms | Near-zero JS; the few leaves are tiny. Scroll-reveal must not jank; the deferred-glass ramp snaps, never animates, under reduced motion (doc 03 §4.3). |
| **JS shipped (initial, marketing routes)** | **< 40 KB gzipped per route** (target) / **> 60 KB gzipped fails CI** | RSC-first; only the hydrating leaves in §1.2 ship. **Target-enforced by `@next/bundle-analyzer`** (`@next/bundle-analyzer@16.2.6` is a devDep; the `withBundleAnalyzer` wrapper is wired in `next.config.ts:223` gated on `ANALYZE=true` — verified; the `analyze` script + CI step + budget file are the open **L-ENG-3** deliverable, so the budget is a **target, not yet a gate**). Mechanism in §3.6. |
| Font payload | **Zero new requests.** Doto (`--font-doto`) + Roboto Mono (`--font-roboto-mono`) already loaded globally (`src/app/layout.tsx:2/9/12-17`); SF Pro is a system stack (`--font-sf-pro`, `globals.css:99`). Source Serif 4 DEFERRED (D-1; doc 03 §7.4). | Self-hosted via `next/font/google`, `display: swap`, already attached to `<body>`. Doto `adjustFontFallback` CLS verification is a doc-14 lab task (doc 03 §7.2). |

These are the Core Web Vitals targets to validate against on Vercel in-region SIN (the
BRIEF's "Core Web Vitals targets" line). **⚠️ L-ENG-1 / L-ENG-2 / L-ENG-3 (gates):** an
explicit performance-targets + analytics-tool + A/B-provider decision is still owner-open
(`00-OVERVIEW.md` G-10); the targets above are a planning recommendation; ratify before
treating as a CI gate (except the JS budget, whose enforcement mechanism is already wired,
§3.6 — that part is implementer-ready).

#### 3.2.1 The JS budget is achievable — the workshop-dashboard precedent

The workshop-dashboard RSC refactor (memory: *Workshop dashboard RSC*) shipped a Server
Component hero + client shell with only ~5 hydrating leaves and **zero visual change**.
That refactor's entire client-JS surface was the interactive leaves + the shared shell —
exactly the discipline the landing applies here (§1.2). The landing's hydrating-leaf set
is **smaller** than the dashboard's (no TanStack Query cache, no Zustand store, no
resizable panel, no command palette on the marketing surface — only the plate hover, the
optional ledger filter, the scroll-reveal driver, and the analytics/A-B boot). The 40 KB
gzipped target is therefore bounded above by a surface the repo already ships. The Phase-0
verification task (§3.6, L-ENG-1) records the actual measured gzipped initial JS of the
current `/` route and the workshop-dashboard route as the precedent baseline; the budget is
"match-or-beat the dashboard's leaf-only JS," not an aspirational number.

### 3.3 Fonts — zero new requests, no layout shift

- **Doto** (`--font-display`, display headlines) is already loaded globally via
  `next/font/google` (`src/app/layout.tsx:12-17`, `weight: "variable"`, `display: "swap"`,
  attached to `<body>`). **No change.** The Glass Brand landing consumes the existing
  `--font-doto` variable; it loads **no new font** (doc 03 §7.1). This is the fastest
  possible LCP posture.
- **Roboto Mono** (`--font-numeric`, numerals) is already loaded
  (`src/app/layout.tsx:9`); reuse, do not re-add.
- **SF Pro** (`--font-sf-pro`, UI chrome) is already a system stack (`globals.css:99`); no
  fetch. ⚠️ L-DES-4 (SF Pro licensing on non-Apple) is inherited from the app — **not a new
  landing decision** (doc 03 §2).
- **Doto `adjustFontFallback` CLS verification** (L-DES-6): Doto is the LCP-critical face.
  `next/font/google` auto-injects a metric-override fallback, but CLS must be measured = 0
  on a 320px Moto G-class device before cutover; if the swap shifts, pin
  `adjustFontFallback` on the `Doto` config (starting values in doc 03 §7.2). **This lab
  measurement belongs to doc 14**, not this doc; this doc only asserts the face is
  LCP-critical and the config lives in `layout.tsx`.
- **Source Serif 4 is DEFERRED (D-1).** The proposal export today is `.xlsx` and does not
  ship serif, so the "same serif as your proposal" continuity claim cannot be made (doc 03
  §7.4; `00-OVERVIEW.md` D-1). Do not load Source Serif 4 on the landing.
- **Peso sign ₱ (U+20B1):** the pricing-philosophy section uses ₱. Doto carries the
  headline; Roboto Mono carries the numerals — both via `next/font/google` `subsets:
  ["latin"]`, which includes ₱ (it is in the latin-1 supplement). Confirm no missing-glyph
  fallback renders on the target device (Phase-0 task in `16-TEST-AND-VERIFICATION-PLAN.md`
  §8); a fallback would undermine the pricing section.
- Match the existing additive-tokens rule (doc 03): add the new `--landing-*` tokens to
  `globals.css`, do **not** clobber existing directives. The `--proposal-paper: #fffdf8`
  token already exists in `globals.css:98` — doc 03 §3.2 aliases it as
  `--landing-paper-accent` for at most ONE accent surface (the `/trust` claims-ledger
  "document panel"); **it is NOT the page background** (D-1: the base surface is
  `--canvas`/`--warm-canvas` `#f5f5f5`).

### 3.4 Images

Any image used (none required by the BRIEF's hero strategy; the founder section §11.5 is
gated on founder-bio assets — see §6) goes through `next/image` with explicit `width` /
`height` (CLS = 0) and is lazy-loaded below the fold. No construction-photo slideshow; no
auto-playing carousel of any kind.

### 3.5 Measurement methodology + the Glass perf model

#### 3.5.1 Measurement methodology (cross-link `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`)

The targets in §3.2 are validated two ways, never one:

| Mode | What it measures | Where | When |
|---|---|---|---|
| **Field (CrUX)** | Real-user LCP/CLS/INP on the target device class (mid-range Android on 4G) in **PH + SEA**. | Chrome UX Report (CrUX) on the public origin, once the page is public. Pre-launch: the `/newdesign` preview route is CrUX-eligible once linked + crawled. | Continuous after public cutover; the 28-day CrUX window is the source of truth for "did we hit the targets." |
| **Lab (Lighthouse)** | Synthetic LCP/CLS/INP on a controlled device profile. | **Lighthouse on a Moto G-class profile** (throttled CPU + fast-4G), **cold cache** (no service worker, no HTTP cache), **Vercel in-region SIN** (the deploy region for PH + SEA — local dev hitting hosted Supabase gives 0.3–5s/call RTT noise and is not a valid measurement, memory: *Hero-path perf is network-bound*). | CI gate per route + pre-cutover trace in `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` §6. |

Field > lab for ranking (CrUX is what users actually see), but lab catches regressions
before they ship. The two are reconciled in doc 14 §3.

#### 3.5.2 The Glass perf model (how the budget absorbs the deferred-glass technique)

The Glass Brand surface (D-1) is `.dashboard-glass` over `--canvas`, armed via the
deferred-glass technique (doc 03 §4.3, verified in `src/components/system/LiquidGlassReady.tsx`
+ `globals.css:287-313`). The perf model:

1. **Paint blur-OFF first.** `@property --glass-blur-amount` (`globals.css:287`) starts at
   `0px`; glass surfaces ship a solid `--glass-bg-fallback #fbfbfc` so first paint is cheap
   and **the LCP text headline is not blocked by a GPU blur**. This is why the §3.1 LCP
   target is text-on-glass-compatible: the headline paints before the blur exists.
2. **Arm after first paint + idle.** `<LiquidGlassReady />` (already mounted in
   `src/app/layout.tsx:40`) sets `<html data-glass="ready">`, flipping
   `--glass-blur-amount: var(--glass-blur)` (`globals.css:296`). It uses a **double-rAF
   backstop** + `requestIdleCallback({ timeout: 400 })` + a **hard 1500ms backstop**
   (`LiquidGlassReady.tsx:56`). The landing inherits this **unchanged** — do not reinvent.
3. **Do NOT gate arming on `prefers-reduced-transparency` alone** (doc 03 §4.3 #3). Engines
   that support `backdrop-filter` but not the media query (older Chrome) would lose the
   frost entirely. Reduced-transparency is enforced by an inner `@media reduce` DISARM, not
   by gating arming.
4. **`backdrop-filter` is GPU-expensive** on mid-range Android (the target device class).
   `--glass-blur: 18px` is capped 16–20px for mobile GPU (`globals.css:110` comment).
   Doc 03 §4.4 caps the landing at **≤4 simultaneous blur panels per viewport** (sticky nav
   + hero brand panel + commercial-graph plate + claims-ledger panel = exactly 4 when all
   are visible). If a 5th is added, one existing panel must demote to the opaque
   `--glass-bg-fallback` before shipping. This cap is the budget's primary defense against
   INP/CLS regression from glass.
5. **How the budget absorbs it:** the deferred-glass technique moves the GPU cost **off
   the LCP critical path** (blur arms after first paint + idle, so it cannot delay the
   headline). The ≤4 cap bounds the worst-case sustained GPU load. The 1500ms backstop
   bounds the worst-case arm latency. Together they keep LCP text-bound and INP under
   200ms even with 4 live blurs. The auth surface (doc 23 §8) contributes at most **1**
   blur panel and is a separate route, so it is never simultaneous with the marketing 4.

### 3.6 The `@next/bundle-analyzer` enforcement mechanism

The "< 40 KB gzipped initial JS per route, > 60 KB fails CI" budget is enforced by
`@next/bundle-analyzer` (already wired — verified: `@next/bundle-analyzer@16.2.6` is a
devDep in `package.json`; `next.config.ts` imports `createBundleAnalyzer`):

1. **CI runs the analyzer in non-blocking report mode + a blocking threshold check.** A CI
   step runs `ANALYZE=true next build` (or the `--bundle-analyzer` flag the wrapper
   exposes), which emits the per-route treemap HTML **and** a machine-readable
   `analyze/{route}.json` with the gzipped initial-JS size per route.
2. **A threshold script** (added in `16-TEST-AND-VERIFICATION-PLAN.md` §8) reads those
   JSON files and fails CI when any marketing route's gzipped initial JS exceeds **60 KB**
   (the hard ceiling) and warns at **40 KB** (the soft target). The soft target is a
   review trigger; the hard ceiling is a merge block.
3. **Per-route, not whole-app.** The budget is per marketing route (`/`, `/features`,
   `/pricing`, `/about`, `/contact`, `/trust`), because each route is a separate entry
   chunk under the RSC-first split. Auth routes (`/login`, `/signup`) carry their own
   budget in doc 23 §8 (near-zero client JS; only the form leaves hydrate).
4. **Phase-0 baseline task (L-ENG-1).** Before the budget is treated as a gate, record the
   actual gzipped initial JS of the current `/` route and the `/workshop` route as the
   baseline precedent. If the current `/` is already above 60 KB (the pre-redesign hype
   hero + slideshow likely is), the cutover target is "match-or-beat the workshop-dashboard
   leaf-only JS" and the removals rail (§5) is the mechanism that gets there.

---

## 4. Accessibility contract

### 4.1 Contrast — no #7F7F7F load-bearing text; AA orange discipline (D-3)

`--tertiary: #7f7f7f` is already in `globals.css:12` but is **sanctioned by DESIGN.md yet
fails WCAG AA** (memory: *DESIGN.md tertiary fails AA*; the BRIEF locks
`--secondary: #5D5D5D` for load-bearing meta). For the landing: **no load-bearing text uses
#7F7F7F**. Body ink `--landing-ink` (`#3D3D3D`, ~9.8:1 on the canvas — AAA), secondary
`--landing-ink-secondary` (`#5D5D5D`, ~7.5:1 — AAA), muted `--landing-ink-muted`
(`#6b6b6b`, ~5.9:1 — AA), hairlines `--landing-hairline` (`#f2f2f2`, doc 03 §3.2). The
prior direction's `#292929` override is **dropped** — the Glass Brand inherits the app's
`--ink #3D3D3D` (doc 03 §3.1).

**D-3 orange discipline (hard cross-doc contract):** the presence accent is
`--landing-accent` (`--brand-orange #F24405`) for **fills, logo slab, focus rings, the
accent rail, a single primary-CTA fill, a Live-status tick on a graph node**. When orange
appears as **small text or an icon `< 24px` on light**, it **must** use
`--landing-accent-ink` (`--brand-orange-dark #C63804`, ~5.3:1 on white) — **never raw
`#F24405`** on small light text (it sits at ~3.75:1, below AA 4.5:1). **Clay `#AA412A` is
NOT a token and NOT used** (it appears in `DESIGN.md` prose only; not in `globals.css`;
every prior clay reference reconciled to `#C63804`). Text-on-glass AA is verified in
`12-ACCESSIBILITY-AUDIT.md` §2 against the worst-case backdrop (doc 03 §4.5).

### 4.2 Focus — instant `:focus-visible` ring

Every interactive element (links, the two CTAs, the architecture-plate nodes, any claims
filter, the menu) has an instant `:focus-visible` ring. Use the existing focus-ring pattern
from the repo (`--brand-orange` ring — the app's existing posture). Keyboard-only users
must be able to reach and operate every CTA and every plate node without a pointer. The
architecture-plate nodes are keyboard-focusable and the claims tag is revealed on focus
(not only on hover).

### 4.3 Semantics and structure

Semantic HTML throughout: real headings (the Doto headline is the signal, but the heading
hierarchy must be real, not visual-only), `header` / `main` / `section` / `footer`
landmarks, lists where the content is a list (the 5-step workflow, the
Live/Building/Planned ledger). The footer is a glass-sitemap footer (not a logo-only
block — removals rail §5). The two CTAs ("Start free", "Book a walkthrough") are real
links to real destinations (§5.1).

### 4.4 Motion — `prefers-reduced-motion` respected

Scroll-reveal fades are the only editorial motion (doc 03 §8), plus the repo's existing
**deferred-glass arming sequence** (§3.5.2), which the Glass Brand landing uses on its
glass surfaces (nav, hero panel, plate, ledger — the §3.5.2 #4 four). Under
`prefers-reduced-motion: reduce`, the existing `@media (prefers-reduced-motion: reduce)`
block (`globals.css:309-313`) **neutralizes the glass-blur ramp transition** (the blur still
applies once armed, it just does not animate in), and reveals appear instantly with no fade.
New landing motion must add its own reduced-motion guard or rely on the global ones (this
doc's review checklist enforces it). No parallax, no auto-scroll, no carousel (§3.4).

### 4.5 Readability

Body prose sized for comfortable reading on phone (the landing type scale, doc 03 §3.4:
body floor ≥14px, default 17px — **the 12px APP floor does NOT apply on the landing**).
Measure (line length) capped 65–75ch at desktop (`--landing-measure-prose`, doc 03 §3.4);
collapses to single column at phone.

---

## 5. Removals rail — Hallmark deletion gate

These exist in the current landing and must be removed (per the BRIEF's REMOVALS list and
§15/§16.4). Each is a deletion, owner-confirmed (L-REM-1…4):

- **The 3 fabricated testimonials** (`TestimonialSection.tsx`, `company-proof-data.ts`) —
  §15 forbids invented testimonials; none exist yet and none may be invented (§12.8).
- **The hype hero copy** ("Start Winning / Win More Bids / Estimate with Precision. Win
  with Clarity") — §10.4/§16.4 BANNED family; replace with the cost-intelligence-layer
  hero (§11.1, owned by docs 02/05).
- **The construction-photo slideshow + the 2.3MB frosted-construction hero PNG** — §12.9
  ("dashboards that perform"); the new hero is Doto text on a CSS-gradient glass panel
  (§3.1).
- **The logo-only footer block** — replaced by a glass-sitemap footer (doc 02, taxonomy
  Footer).
- **Audit `ProductPreviewVariants.tsx` and any re-drawn browser/IDE chrome** — Hallmark
  bans re-drawn fake chrome. If any landing component fakes a browser/IDE window, it is on
  this rail; confirm during implementation.

⚠️ **GATED on L-REM-1…4:** explicit owner confirmation of each deletion (the BRIEF marks
the REMOVALS as "needs owner confirmation — Hallmark deletion rail"). The plan assumes
confirmation; the implementation lane does not delete until confirmed in `LOOP_LEDGER.md`.

---

## 6. The "Start free" funnel

### 6.1 The CTA destinations (cross-link `23-AUTH-EXPERIENCE.md`)

Primary CTA **"Start free"** → self-serve Free-tier signup (§9.2). The repo currently has
`/auth` (the callback route) and `/login` but **no `/signup`** (verified: `ls src/app/signup`
absent). **Recommendation: ship a dedicated `/signup` route.** Rationale: (a) it parallels
`/login` (symmetry, familiar convention); (b) the marketing CTA "Start free" lands the
visitor directly on a signup form, not on a login screen that asks them to find the signup
link (which adds a click and a bounce risk); (c) `/signup` is the cleanest funnel URL for
analytics (the `signup_view` / `signup_attempt` / `signup_success` events fire on the
route, not on a tab toggle inside `/login` — doc 23 §9.1); (d) it avoids the `/auth/signup`
prefix which adds auth-namespace clutter without value (this is a marketing funnel, not an
admin surface); (e) `signInWithEmail` already sets `shouldCreateUser:true`, so **the magic
link is already the signup mechanism** — `/signup` is the same server action with different
copy, not a separate code path (doc 23 §2.2).

**⚠️ GATED on L-FUN-1** (the owner's auth-route decision: `/signup` vs `/auth/signup`).
**⚠️ GATED on L-FUN-2** (beta onboarding + self-serve enablement: does `/signup` accept new
accounts, or route to `ClosedBetaGate` request-access?). The 2-column design ships ready
for either resolution (doc 23 §3.2). **Fallback until L-FUN-1/L-FUN-2 close:** "Start free"
routes to `/login` (the magic link already handles signup via `shouldCreateUser:true`) or
to `/contact` (the assisted path). Per D-2, the 2-column auth design is **agnostic** to
this routing decision.

Secondary CTA **"Book a walkthrough"** → `/contact` (exists) with intent captured as a
walkthrough-request event (§7). The walkthrough is founder-led (§9.4 founder-led motion);
the form should capture role and current method to feed discovery (§9.3), not gate signup.

### 6.2 What the Free tier is (and is not), per §9.2

Free (Starter), ₱0: 1 user · ~2 active projects · build the component library · estimates,
inline editing, templates · marked `.xlsx` export · basic delete only (no trash or
archiving) · **no client sharing** · community support. The Free tier's job is to **seed
the library** — the lock-in — so a self-serve signup that reaches the activation metric
(§7) compounds. This is the funnel's purpose, restated in engineering terms: the landing's
"Start free" must deliver a visitor into a first-run path that gets them to **first reuse**
before friction sends them away.

### 6.3 Self-serve Free does NOT require validated pricing or billing

Make explicit (the BRIEF requires it): self-serve **Free-tier signup does not need the
validated pricing decision (§9.3) or the billing mechanism (§18.6)**. Pricing validation
gates **publishing a price**, not opening a free signup; billing gates **charging**, not
onboarding a free user. The Free tier is ₱0 with no payment instrument, so the entity/BIR
prerequisites for *charging* (§18.2, §18.6) do not block a free signup either — though the
**user-facing legal docs** (ToS, Privacy Policy, Acceptable Use, Refund/Cancellation) and
**Data Privacy Act** posture (DPO, PIA, breach plan) are still launch gates for **any**
signup, free or paid (§17 #3, #4; see §8 below). Do not let pricing-or-billing uncertainty
block the "Start free" CTA; do let the legal/DPA gates block it.

---

## 7. Activation metric + analytics events (§14.4, §18.5)

### 7.1 The activation metric — the moat metric

The funnel's north-star activation event (§14.4, §18.3): **the first real estimate that
reuses at least one library component**. This is "the moat metric" — it is the moment a
free user starts building the library that compounds switching cost, instead of bouncing.
The landing's job is to deliver signups; the first-run path's job (§8) is to carry them to
this event. Instrument it as a first-time-per-user boolean, not a raw count, so retention
analysis can ask "did this signup activate?" cleanly.

### 7.2 Instrumented events (§18.5)

These are the events the landing funnel contributes to or feeds. The full event schema and
tool are ⚠️ GATED ON the analytics-tool decision (L-ENG-2); the **set** is canonical per
§18.5:

- `signup` — fired on Free-tier account creation (the CTA's direct conversion event; doc 23
  §9.1 adds the `signup_view` / `signup_attempt` / `signup_success` funnel).
- `first_estimate_created` — first estimate in a new account.
- `component_reused` — **the moat metric** (§7.1); first reuse per user is the activation
  signal.
- `proposal_shared` — first shared proposal link (note: sharing is a **paid** capability,
  §9.2 — Free has no client sharing — so this event fires for users who upgrade or for the
  walkthrough path; do not imply Free shares).
- `export` — `.xlsx` export (Free has marked export; instrument the event).
- `weekly_return` — retention signal (§18.5).
- Landing-side events feeding the funnel: `hero_cta_click` (Start free),
  `secondary_cta_click` (Book a walkthrough), `plate_node_focus` (architecture-plate
  engagement), `claims_ledger_expand` (section-7 engagement, if interactive),
  `pricing_philosophy_engagement` (§9.3 philosophy section — to validate the cement-anchor
  framing as a hypothesis, not to publish a locked price).

All landing copy in these events obeys §15 (no invented metrics, no superiority claims);
the events themselves capture behavior, not marketing claims.

---

## 8. Co-dependencies — Go/No-Go gates for "Start free"

The "Start free" CTA is only credible if the thing it lands on works. These are the
co-dependencies the plan must flag (BRIEF; §7.5; §18.1–§18.6). Each is a **gate**: the CTA
does not go public until the gate is closed, or the owner explicitly accepts the risk.

| # | Gate | Status / source | Blocks |
|---|---|---|---|
| G1 | **Beta onboarding + demo-data/reset rules** | §7.5 launch gate; §18.3. Demo data with reset rules is a launch gate. ⚠️ NEEDS INPUT: design the first-run flow; build a demo project (a simple CHB or residential BOQ) — §18.3. | Signup → activation path; the moat metric (§7.1) depends on a working first-run. |
| G2 | **Abuse guardrails (P1)** | §18.1 near-term engineering blockers: **durable rate limiting (Postgres `security_rate_limit_events` table, NOT Redis — project position)**, **POST-only invite acceptance**, **token hashing with a server pepper**. | Any public self-serve signup surface. Without rate limiting, "Start free" is an abuse magnet; without POST-only invites + peppered token hashing, the invite path is exploitable. These are P1, ahead of public launch. |
| G3 | **First-run flow** | §18.3 ⚠️ NEEDS INPUT (NEEDS-INPUT register #7). The path: signup → sample/demo project → guided first estimate → first reuse → first client share. | Activation (the moat metric). Without a designed first-run, free users bounce before first reuse. |
| G4 | **Legal docs (ToS, Privacy Policy, Acceptable Use, Refund/Cancellation)** | §17 #3, §18.2. Required before **any** signup (free or paid). | Any signup. |
| G5 | **Data Privacy Act posture (DPO, PIA, breach plan, cross-border safeguards)** | §17 #4, §18.2. Data sits on Supabase in `ap-southeast-2` (Australia) — a cross-border transfer needing model contractual clauses or equivalent. Applies regardless of entity size. | Any signup handling personal data. |
| G6 | **P0 launch gates** | §18.1: invite config + environment variables + docs cleanup. These are P0 and must close before public launch of anything. | Public launch. |
| — | **NOT a gate: validated pricing (§9.3)** | §9.3 gates **publishing a price**, not opening a free signup. | Does NOT block "Start free". |
| — | **NOT a gate: billing mechanism (§18.6)** | §18.6 gates **charging**, not onboarding a free user. Free is ₱0, no payment instrument. | Does NOT block "Start free". |

**Sequencing read:** G6 (P0) and G2 (P1 abuse) are engineering blockers with the shortest
path to close; G1 + G3 (onboarding + first-run + demo data) are the activation-critical
design and build work; G4 + G5 (legal + DPA) have lead time (§18.2: "start it first") and
are prerequisites for *any* signup. Pricing and billing are explicitly downstream of free
signup — they gate charging, not onboarding.

---

## 9. Engineering guardrails (summary for the implementation lane)

1. RSC-first: routes are Server Components; only the §1.2 leaves hydrate; mirror
   `WorkshopDashboard`/`WorkshopHomebaseClient` (and `AuthLayout` on the auth surface,
   doc 23 §4.1).
2. Static generation for all six marketing routes; the landing never calls Supabase.
3. Responsive hard floor 320/375/414/768; `overflow-x: clip` on `html` + `body`; plate
   collapses to a vertical stack with inline claims tags at narrow widths.
4. LCP = Doto text headline on a CSS-gradient glass panel; no hero image; no carousel;
   `next/image` with dimensions for any image.
5. Doto + Roboto Mono + SF Pro already loaded globally — **zero new font requests**; reuse
   `--brand-orange-dark #C63804` (D-3) + `--canvas`/`--ink`/`--glass-*` tokens already in
   `globals.css`; additive `--landing-*` tokens only (doc 03 §3.2); **never clay `#AA412A`**
   (D-3) and **never `#292929`** (dropped — the Glass Brand inherits `--ink #3D3D3D`).
6. No #7F7F7F load-bearing text; instant `:focus-visible` ring (`--brand-orange`); semantic
   HTML; `prefers-reduced-motion` respected (the deferred-glass ramp snaps, never animates).
7. Reuse existing loaders (`LandingAnalyticsLoader`, `CookieConsentBanner`, `ClarityScript`,
   `ABExperimentProvider`); audit them against the removals rail.
8. **Deferred-glass technique inherited unchanged** (§3.5.2): `data-glass="ready"` +
   `@property --glass-blur-amount` + double-rAF + `requestIdleCallback` + 1500ms backstop;
   **≤4 simultaneous blur panels per viewport**; do NOT gate arming on
   `prefers-reduced-transparency` alone.
9. JS budget **< 40 KB gzipped per route (target) / > 60 KB fails CI**, enforced by
   `@next/bundle-analyzer` (already wired) + a threshold script (§3.6, doc 16 §8).
10. "Start free" → dedicated `/signup` (recommended, gated L-FUN-1/L-FUN-2; fallback
    `/login` or `/contact`); do not gate on pricing or billing; **do** gate on legal docs +
    DPA + abuse guardrails + onboarding/first-run.
11. Instrument the §7.2 event set; the moat metric is first-reuse. Auth-surface events in
    doc 23 §9.1.
12. No invented features/metrics/testimonials/prices/partner names on any public surface
    (§15); every copy suggestion is owned by doc 05 and signed off via the claims ledger
    gate (§3.2 / doc 05 section 7).

---

## 10. Test plan (cross-link to `16-TEST-AND-VERIFICATION-PLAN.md`)

This doc owns the engineering contract; `16-TEST-AND-VERIFICATION-PLAN.md` owns the test
runner. The tests that prove this doc's claims hold:

| This doc's claim | Test | Owner in `16` |
|---|---|---|
| RSC-first; only the §1.2 leaves hydrate | **`@next/bundle-analyzer` CI gate** (initial JS > 60 KB gz / route = fail; > 40 KB = warn) + e2e route render | §8 |
| Responsive floor 320/375/414/768 | E2e mobile-render test per route (no horizontal scroll, no clipped content) | §5 |
| `overflow-x: clip` on html+body | Unit test on the globals.css rule + e2e overflow check | §5 |
| `bg-[color:var(--x)]` (no missing backgrounds, doc 03 §3.3) | Visual-regression: no element renders with an empty `background` | §8 |
| Plate collapses to vertical stack | Component test on `ArchitecturePlate` at ≤414px | §4 |
| LCP = Doto text headline; no hero image | Lighthouse CI gate (LCP < 2.0s on Moto G-class) + the removals rail audit | §8 + §5 |
| Doto + Roboto Mono already loaded (zero new font requests) | Unit test on `layout.tsx` imports (no new `next/font/google` call added by the landing) + Lighthouse CLS gate | §8 |
| Peso ₱ renders in Doto + Roboto Mono (no fallback) | Visual-regression on the pricing-philosophy section at 320px | §8 |
| Deferred-glass arming sequence inherited unchanged | Unit test on `<LiquidGlassReady />` mount + e2e `data-glass="ready"` assertion after idle | §7 + §8 |
| ≤4 simultaneous blur panels per viewport | DOM audit test counting `[data-glass]` visible panels at ≥1024px | §8 |
| Instant `:focus-visible` ring | axe-core + manual keyboard test | §7 |
| `prefers-reduced-motion` respected (glass ramp snaps) | Component test on `ScrollReveal` + manual reduced-motion test + the `@media` DISARM assertion | §7 |
| CTAs route correctly (Start free → `/signup` or `/login`; Book → `/contact`) | E2e CTA-routing test per route | §5 |
| Claims ledger renders the matrix (D-4 ClaimStatus type) | Component test on `ClaimsLedger` + the claims-test sweep | §4 + §9 |

---

## 11. Rollback (cross-link to `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` §4)

The migration's rollback mechanism is the `/legacy` route (per `08-ROLLOUT-AND-ANALYTICS.md`
§2.3). Engineering specifics:

- **The cutover is a feature-flag flip / URL swap, not a code change.** The new components
  rendered at `/newdesign` are identical to the ones rendered at the canonical routes
  post-cutover. The cutover flips the `landing-redesign-2026-06` A/B experiment to 100%
  treatment (or, if L-ENG-3 resolves to a feature flag, flips the flag); revert is the
  inverse flip back to 100% control. This is the lowest-blast-radius cutover shape and it
  reuses the existing A/B plumbing (§1.4).
- **The `/legacy` route stays live for 30 days post-cutover.** It renders the old components
  (preserved in git history + at `/legacy` during the window) so rollback is a single-flag
  revert even after public cutover.
- **Rollback triggers** (per `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` §4): A/B primary
  regression > 10 % relative; a §15 forbidden hit on the public surface; an a11y regression
  that escapes CI; a perf regression in the field (within 24 h — specifically LCP > 2.5s or
  INP > 500ms on the CrUX PH+SEA field data).
- **Forward-only fixes:** a claims-matrix drift post-launch is corrected forward (the §3
  lifecycle in `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md`), not rolled back.

---

## Cross-links

- **`00-OVERVIEW.md`** — pack overview, routes scope, the ratified keystone decisions D-1…D-5
  this doc obeys (Glass Brand, full-page auth, orange discipline, ClaimStatus type, honest
  scoring).
- **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`** — DOM order; this doc renders it.
- **`03-VISUAL-LANGUAGE-AND-TOKENS.md`** — tokens (additive `--landing-*`), the Doto + Roboto
  Mono + SF Pro type stack, the deferred-glass arm pattern, the ≤4-blur cap, the D-3 orange
  discipline; this doc consumes them additively.
- **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`** — plate content + collapse; this doc owns
  its rendering contract (§2.3).
- **`05-COPY-SKELETON.md`** — copy + the signed-off claims ledger object this doc renders.
- **`06-PROOF-AND-CLAIMS-DISCIPLINE.md`** — the D-4 `ClaimStatus` type + the signed-off
  ledger object required before public render (§3.2).
- **`08-ROLLOUT-AND-ANALYTICS.md`** — preview route (`/newdesign` + `/design-sync`
  convention), A/B old-vs-new, claims sign-off gate, analytics events (this doc defines the
  event set; doc 08 owns the rollout mechanics).
- **`12-ACCESSIBILITY-AUDIT.md`** — formal WCAG AA audit + the text-on-glass contrast
  verification + the keyboard contract this doc's §4 feeds into.
- **`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`** — the CWV targets, field-vs-lab methodology
  (§3.5.1), the ≤4-blur cap (§3.5.2 #4), the JS budget numbers in CI, the Doto
  `adjustFontFallback` CLS lab measurement (§3.3).
- **`16-TEST-AND-VERIFICATION-PLAN.md`** — the test runner that proves this doc's claims
  (§10), including the `@next/bundle-analyzer` threshold script (§3.6).
- **`21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`** — §4 rollback triggers + the `/legacy` window
  (§11).
- **`23-AUTH-EXPERIENCE.md`** — the full-page 2-column auth surface (D-2); `/login` +
  `/signup` engineering contract shared with this doc (§1.5, §6.1).
- **`LOOP_LEDGER.md`** — owner confirmations for the removals rail (§5), the Go/No-Go gates
  (§8), and the L-ENG-* / L-FUN-* / L-DES-* evidence registration.

---

## ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

Per D-5, no gate is silently marked closed. The load-bearing gates for THIS doc are:

- **L-REM-1…4 — Owner confirmation of the removals rail (§5).** The plan assumes
  confirmation; the implementation lane does not delete until confirmed in `LOOP_LEDGER.md`.
  Includes the 3 fabricated testimonials, the hype hero, the construction-photo slideshow +
  2.3MB PNG, the logo-only footer, and any re-drawn browser/IDE chrome.
- **L-FUN-1 — Auth route for "Start free" (§6.1).** No `/signup` exists today (`/auth` and
  `/login` do). Recommend a dedicated `/signup`; owner to decide. **Fallback until closed:**
  "Start free" → `/login` or `/contact`.
- **L-FUN-2 — Beta onboarding + self-serve enablement (§6.1).** Does `/signup` accept new
  accounts, or route to `ClosedBetaGate`? The 2-col design ships ready for either (doc 23
  §3.2).
- **L-FUN-3 — First-run flow (§8 G3).** ⚠️ NEEDS INPUT register #7. Signup → demo project →
  first estimate → first reuse → first share. Activation-critical.
- **L-FUN-4 — Abuse guardrails P1 (§8 G2).** Postgres `security_rate_limit_events` (NOT Redis), POST-only
  invite acceptance, token hashing + server pepper. Blocks any public self-serve surface.
- **L-ENG-1 — Performance targets ratification (§3.2).** ⚠️ NEEDS INPUT register #16 asks
  for explicit perf targets + admin controls. The §3.2 numbers are a planning
  recommendation; ratify before treating LCP/CLS/INP as gates. (The JS budget's enforcement
  mechanism is already wired — §3.6 — so that part is implementer-ready; only the numeric
  thresholds want ratification.)
- **L-ENG-2 — Analytics tool + event schema (§7.2).** ⚠️ NEEDS INPUT register #8. The event
  *set* is canonical (§18.5); the *tool* and *schema* are not chosen. The analytics-boot
  leaf (§1.2 #4) is absent until a tool is selected.
- **L-ENG-3 — A/B provider page-level-split verification (§1.4).** The existing
  `getVariant()` returns a `Variant` string a route can trivially branch on; the Phase-0
  verification task is: confirm control/treatment trees both render under the same
  `<ABExperimentProvider>` wrapper with no hydration mismatch, and the cookie survives the
  `/newdesign` preview redirect. If PostHog is ratified (L-ENG-2), PostHog Experiments can
  subsume this. Gates the A/B old-vs-new comparison, not the static render.
- **L-DES-4 — SF Pro licensing on non-Apple platforms (§3.3).** Inherited from the app; not
  a new landing decision. If the owner closes it product-wide (Inter drop-in), that is a
  cross-cutting change, not landing-scoped.
- **L-DES-6 — Doto `adjustFontFallback` CLS lab verification (§3.3).** CLS must be measured
  = 0 on a 320px Moto G-class device before cutover; the lab measurement belongs to doc 14.
- **L-DES-3 (informational, closed for the Glass Brand) — Source Serif 4 continuity.**
  Retired with the prior "Document" direction (D-1); preserved in `LOOP_LEDGER.md` in case
  Direction D is later adopted.
- **G — Founder-bio assets (§11.5, the founder/company section).** ⚠️ NEEDS INPUT register
  #17. The section is on the taxonomy but its content is gated on founder public-bio assets;
  engineering-wise, the section renders as static HTML once assets exist, with `next/image`
  if a photo is included.
- **G — The full Go/No-Go gate set (§8):** G1 onboarding/demo-data/reset (§7.5/§18.3), G2
  abuse guardrails P1 (§18.1), G3 first-run flow (§18.3), G4 legal docs (§18.2), G5 DPA
  posture (§18.2), G6 P0 launch gates (§18.1). Pricing (§9.3) and billing (§18.6) are **not**
  gates for "Start free".

---

## 12. Coherence contracts (this doc honors)

- **D-1 (Glass Brand)** — the landing is glass-on-warm-canvas + Doto/Roboto-Mono/SF-Pro,
  not paper/serif. ✅ (§1.2, §3.1, §3.3, §4.1). No reference to paper-as-base-surface or
  Source Serif 4 as the load-bearing face; `--proposal-paper` is an accent option only.
- **D-2 (full-page 2-column auth)** — `/login` + `/signup` share this doc's RSC-first
  contract; the auth surface is owned by `23-AUTH-EXPERIENCE.md`. ✅ (§1.5, §6.1).
- **D-3 (orange token discipline)** — `--brand-orange #F24405` for fills/focus/rail;
  `--brand-orange-dark #C63804` for AA small text; **clay `#AA412A` is NOT a token and NOT
  used**. ✅ (§4.1, §9). No `#AA412A` / `--clay` reference as an active token. Tailwind v4
  `bg-[color:var(--x)]` gotcha honored (§2.2, §9).
- **D-4 (ClaimStatus type)** — the signed-off ledger object required before public render
  (§3.2) uses the single shared type from `06-PROOF-AND-CLAIMS-DISCIPLINE.md`. ✅
- **D-5 (honest scoring)** — owner-gated items are carried in `LOOP_LEDGER.md`, never
  silently closed (§12 above). ✅
- **Rate-limiting = Postgres** (`security_rate_limit_events` table), NOT Redis; **Turnstile NOT yet built**
  (escalation-only). ✅ (§8 G2).
- **Radical honesty** — no invented features/metrics/testimonials/prices/partner names on
  any public surface (§9 #12). ✅

---

## 13. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **95 / 100** | The engineering contract is fully re-aligned to the Glass Brand (D-1): RSC-first mirrors the proven workshop-dashboard pattern, the deferred-glass perf model is explicit and inherited unchanged, the JS budget is anchored to a real repo precedent (the dashboard's leaf-only JS), and the auth surface (D-2) is correctly threaded through the same contract. Not 100 because L-ENG-1 (perf-targets ratification) and L-FUN-1/L-FUN-2 (auth routing + self-serve) are genuinely owner-open and affect whether the §3.2 targets and the §6.1 CTA destination are final — these are carried, not silently closed. |
| **Quality** | **96 / 100** | Every token cited (`--brand-orange` L37, `--brand-orange-dark` L38, `--canvas`/`--warm-canvas` L16-17, `--ink` L10, `--secondary` L11, `--tertiary` L12, `--glass-bg`/`--glass-blur` L108-110, `--glass-radius` L116, `--glass-nav-radius` L117, `--radius-xs` L100, `--font-sf-pro` L99, `--proposal-paper` L98, `@property --glass-blur-amount` L287, `--grad-canvas-wash` L62, `--grad-hero-continue`/`--grad-hero-create` L59-60) is grep-verified against `globals.css` on 2026-06-22; every reference file path (`WorkshopDashboard.tsx`, `WorkshopHomebaseClient.tsx`, `page.tsx`, `LiquidGlassReady.tsx`, `variant-assigner.ts`) is verified to exist; the A/B signature (`getVariant(experimentId, {analyticsConsent}): Promise<Variant>`) is read from source, not assumed; the `@next/bundle-analyzer@16.2.6` devDep + `next.config.ts` `createBundleAnalyzer` import are verified; every cross-link resolves to a canonical filename; no `#AA412A`/`--clay`/`#292929`/Source-Serif-4-as-default/paper-as-base-surface reference survives. Not 100 because: (a) the §3.2.1 "match-or-beat the dashboard's leaf-only JS" precedent asserts the dashboard's JS is small without citing the actual measured KB (the Phase-0 L-ENG-1 task records the number); (b) the §3.6 threshold script is described but its exact CLI invocation is deferred to doc 16 §8 (sibling-owned). |
| **Implementation-Readiness** | **93 / 100** | An implementer can start: the RSC pattern is concretely named with reference files, the hydrating-leaf set is enumerated, the JS-budget enforcement mechanism is already wired in-repo, the deferred-glass technique is inherited unchanged from a mounted component, the A/B scaffolding is reused as-is with a clear Phase-0 verification task, the measurement methodology names the device class + region + cache state, and the `/signup` recommendation + fallback is explicit. Not 100 because the genuinely-open gates honestly cap readiness below 100: L-ENG-1 (numeric thresholds unratified), L-FUN-1/L-FUN-2 (`/signup` does not exist yet — it is the deliverable, gated on owner routing + beta-onboarding decisions), L-FUN-3/L-FUN-4 (first-run flow + P1 abuse guardrails are not built), and L-ENG-3 (page-level-split verification is a Phase-0 check, not yet run). Per D-5 these are carried, not silently closed. |
