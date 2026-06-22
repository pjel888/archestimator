# MASTER IMPLEMENTATION PLAN — Landing Page Redesign (The Glass Brand)

> **STATUS: IMPLEMENTATION GUIDE · 2026-06-22 · this IS the codebase-AI's build guide.**
> **Companion to (not a replacement for)** the 27 numbered/planning docs in this pack. This doc is the
> **execution layer**: it resolves every cross-doc conflict the planning left open, fixes the
> build order, locks the contracts, names every file, and tells the implementing agent exactly
> what to do — phase by phase, gate by gate. The planning docs are the *spec*; this is the *build sheet*.
>
> **Provenance.** Authored by the Claude lead after (a) reading the spine docs in full
> (`00-OVERVIEW`, `README`, `10-CANONICAL-DOC-MAP`, `LOOP_LEDGER`, `MASTER-AUDIT-AND-SCORECARD`)
> and (b) running a **14-agent audit workflow** (13 doc-cluster agents that each verified their
> spec against the real codebase + 1 reconcile agent) — 1.24M tokens, 216 tool calls. Every
> "current state" claim below is codebase-verified, not doc-trusted.
>
> **Codex reconciliation note (2026-06-22):** this doc is integrated into the pack as the
> execution handoff. It is not an override layer: where §3 identified a
> conflict, the sibling docs must be patched or cross-linked so the pack is coherent. Use §3 as the
> reconciliation checklist, not as permission to ignore sibling docs.
>
> **GPT-taste overlay note (2026-06-22):** implementation is now governed by
> `24-GPT-TASTE-EXECUTION-CONTRACT.md` and the installed `$gpt-taste` skill. This doc remains the
> build sheet; doc 24 is the mandatory visual-execution overlay every UI lane invokes before code.

---

## 0. START HERE (for the implementing AI)

You are implementing the **Archestimator landing-page redesign** — the public marketing surface
(`/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`) **and** the auth surface (`/login`,
`/signup`) — rebuilt as **one Glass-Brand system** identical in vocabulary to the Workshop
Dashboard the user lands in after "Start free". Proof comes from **radical honesty**
(Live/Building/Planned claims), not from invented logos/testimonials/stats.

**Before writing any UI code:** invoke `$gpt-taste`, read `24-GPT-TASTE-EXECUTION-CONTRACT.md`,
and emit the required `<design_plan>` block. Then read this doc top-to-bottom and execute Phase 0
→ Phase 8 in order. Do not skip Phase 0 — every downstream file imports it.

| If you need… | Read this section |
|---|---|
| The non-negotiable rules | §2 (Keystone contract) + §3 (Adjudicated conflicts) |
| What to build, in what order | §5 (The 9 phases) + §6 (Critical path) |
| Exact file targets | §7 (File inventory) |
| Exact token/type/prop values | §8 (Contracts registry) |
| The required `$gpt-taste` prompt, `<design_plan>`, AIDA, GSAP, and bento gates | `24-GPT-TASTE-EXECUTION-CONTRACT.md` |
| What can break | §9 (Risk register) |
| What you may NOT decide | §10 (Owner-gate carry matrix) |
| How to coordinate with other agents | §11 (Multi-agent protocol) |
| How to prove a phase is done | §12 (Verification gates) |
| Which planning doc answers X | §14 (Doc reference index) |

**Three rules that override everything else:**
1. **Honesty is load-bearing (D-5).** Never invent a feature/metric/testimonial/price/logo. If the
   spec asks for proof you don't have, ship the Live/Building/Planned pill instead.
2. **Phase 0 is the spine.** No component may be authored before `globals.css --landing-*` tokens
   + `StatusPill.tsx` land. They are imported by literally every surface.
3. **Owner gates are carried, not closed.** When you hit an `L-*` gate (§10), build the safe
   default branch and flag it — do NOT silently resolve it.
4. **`$gpt-taste` is the visual execution overlay.** Every UI lane starts with the skill, writes a
   `<design_plan>`, and satisfies doc 24's AIDA, 2-3 line hero, dense bento, real
   GSAP/ScrollTrigger, component-arsenal, label-sweep, button-contrast, and overflow gates.

---

## 1. Executive summary (TL;DR)

- **What:** Replace the current hype-led homepage (`src/app/page.tsx` + 38 files in
  `src/components/landing/`) and rebuild `/login` + create `/signup`/`/trust`/`/features`/
  `/about`/`/contact`/`/pricing`/`/newdesign` as a unified Glass-Brand system.
- **Direction (D-1):** liquid-glass surfaces over warm canvas `#f5f5f5`, signal orange
  `--brand-orange #F24405` / `--brand-orange-dark #C63804`, Doto + Roboto Mono + SF Pro,
  8px rhythm, 3/8/12px radii. Same brand as the Workshop Dashboard.
- **Moat (P3):** a **named, claims-tagged commercial-graph architecture plate** (SVG) —
  "the commercial graph nobody else has drawn" — Live/Building/Planned per node.
- **Proof engine (P2):** a `<ClaimsLedger>` (Live/Building/Planned) replacing fabricated
  testimonials/stats. Honesty IS the brand.
- **Build shape:** **preview-first, URL-swap cutover** — build everything under `/newdesign`,
  A/B vs old, claims-gate sign-off, then swap `/newdesign` → canonical and keep `/legacy` for 30 days.
- **Taste shape:** `$gpt-taste` drives the landing's visual execution. The implementation must be
  AIDA-shaped, editorial, motion-rich, GSAP-backed, gapless in its dense grid/bento surfaces, and
  verified by the pre-code `<design_plan>` plus the doc-24 gates.
- **Scope reality:** the full program is large, but the **minimum shippable slice is smaller**:
  Phase 0 current-state reconciliation, tokens/type/button variant, preview route, homepage/auth
  shell, claims-safe copy, and manual claims sign-off. Defer A/B tooling, full analytics, i18n lint
  rules, OG generation, and deletion rail unless needed for cutover.
- **Honest posture (D-5):** the planning pack is **implementation-ready ~90%** after the `$gpt-taste`
  overlay (capped by owner/provider/runtime/taste gates), planning-complete (Rubric A 100%). This
  plan closes the planning→code gap; the remaining ~10% is genuinely gated (§10) and is
  **carried, not faked**.

---

## 2. The keystone contract (obey verbatim; do not relitigate)

Ratified by Philip 2026-06-22. Every doc obeys these; so does every line of code.

### 2.1 The five decisions (D-1 … D-5)

| # | Decision | Binding detail |
|---|---|---|
| **D-1** | **Direction = "The Glass Brand"** | Reuse the Workshop Dashboard + Estimate Sheet vocabulary: `.dashboard-glass` / `.dashboard-glass-warm` surfaces (gated on `data-glass="ready"`) over `--warm-canvas #f5f5f5`, `--brand-orange #F24405` (presence) + `--brand-orange-dark #C63804` (AA small text), Doto (`--font-display`) + Roboto Mono (`--font-numeric`) + SF Pro (`--font-sf-pro`), 8px rhythm, 3/8/12px radii. **"The Document"** (paper `--proposal-paper #fffdf8` + Source Serif 4) is a demoted ALTERNATIVE. **Source Serif 4 DEFERRED.** |
| **D-2** | **Auth = full-page 2-column** | `/login` + `/signup` are **full-page routes** (not modals). LEFT = brand glass panel (`aria-hidden`, no copy, no fake screenshots); RIGHT = auth fields. Collapses to 1 column `<768px`. Model = **Google OAuth + magic link, NO password**. "Start free" → `/signup` is **gated on L-FUN-2**; until then it routes to `/login` or `/contact`. |
| **D-3** | **Orange token discipline** | `--brand-orange #F24405` = presence (fills, logo slab, focus rings, accent rails, hover). `--brand-orange-dark #C63804` = AA small text/icons. **Clay `#AA412A` is NOT a token and is NEVER used** (DESIGN.md prose only). The redesign **enforces** this: live `#aa412a` literals in `LandingHeader.tsx` + `NeatWireframeBackground.tsx` must be removed (D-3 is a *target*, not yet a *fact*). |
| **D-4** | **Single `ClaimStatus` type** | `type ClaimStatus = "Live" | "Building" | "Planned" | "NotUs"` — defined **once**, in `src/components/landing/shared/StatusPill.tsx`. The commercial-graph plate narrows to the `Live | Building | Planned` subset at the call site (no `NotUs` nodes on the plate). **No divergent type defs anywhere.** |
| **D-5** | **Honest scoring** | Nothing is "done" until **verifiable**. Owner-gated items are **carried in `LOOP_LEDGER.md`** (§10), never silently closed. No self-congratulation. |

### 2.2 Hard cross-doc contracts (codebase-verified token anchors)

All verified present in `src/app/globals.css` (anchor on the token *name*, not the line — lines drift):

`--brand-orange #F24405` · `--brand-orange-dark #C63804` · `--brand-orange-soft` ·
`--warm-canvas #f5f5f5` (= `--canvas`, same value) · `--proposal-paper #fffdf8` (Direction D only) ·
`--ink #3D3D3D` · `--secondary #5d5d5d` · `--muted-foreground #6b6b6b` · `--hairline #f2f2f2` ·
`--success #15803d` · `--warning #b45309` · `--danger #b91c1c` · `.dashboard-glass` ·
`.dashboard-glass-warm` · `.workshop-workspace-glass-surface` ·
`--glass-bg rgba(255,255,255,0.72)` · `--glass-blur 18px` · `--glass-radius 12px` ·
`--glass-nav-radius 8px` · `@property --glass-blur-amount` · `--grad-canvas-wash` ·
`--grad-hero-continue` · `--grad-hero-create` · `--font-display` (Doto) ·
`--font-numeric` (Roboto Mono) · `--font-sf-pro` (SF Pro) · `--radius-xs 3px`.
**Confirmed ABSENT:** `--clay` / `#AA412A` (D-3). **Confirmed loaded:** Doto + Roboto Mono via
`next/font/google` in `src/app/layout.tsx`; `LiquidGlassReady` arms
`data-glass="ready"` via double-rAF + `requestIdleCallback` + 200ms Safari + 1500ms hard backstop.

### 2.3 Current-codebase checkpoint (2026-06-22, before implementation)

Run this checkpoint before editing; update existing files in place instead of recreating them.

| Artifact | Current state | Implementation action |
|---|---|---|
| `src/components/landing/shared/StatusPill.tsx` | Exists and exports `ClaimStatus`. | Update in place only if color map/props differ; do not create a second status component. |
| `src/components/landing/shared/index.ts` | Exists. | Extend barrel as needed. |
| `src/components/landing/shell/LandingShellClient.tsx` | Exists as the single reveal client boundary. | Extend for analytics boot; do not recreate. |
| `src/components/landing/shell/MaturityTag.tsx` | Exists. | Reuse. |
| `src/app/features/page.tsx`, `/pricing`, `/about`, `/contact`, `/login` | Exist. | Reskin/recompose in place. |
| `src/app/trust`, `src/app/signup`, `src/app/newdesign`, `src/app/robots.ts`, `src/app/sitemap.ts` | Not present in the checkpoint. | Add when the relevant phase starts. |
| `ButtonVariant` | `src/components/ui/button.tsx` has no `brand` variant. | Add `brand` before using `variant="brand"` in landing/auth CTAs. |
| LHCI / bundle scripts | `@next/bundle-analyzer` exists; `analyze`, `test:claims`, `perf:lighthouse`, `lighthouserc.js` do not. | Add only when entering the CI/perf phase; current validation remains `type-check`, lint, targeted tests. |

---

## 3. Adjudicated conflicts (the lead's decisions — DO NOT re-derive)

The 14-agent audit surfaced **16 cross-doc conflicts** (token drift, contested ownership, spec-vs-code
divergence). The lead adjudicates each below. **These are the single source of truth; sibling docs
that disagree are wrong, by these rulings.**

| # | Conflict | Adjudication (binding) |
|---|---|---|
| **C-1** | `StatusPill` color map diverges (Planned = `--ink` vs `--secondary`) | **LOCK in `StatusPill.tsx` once:** `Live=--success #15803d`, `Building=--warning #b45309`, `Planned=--ink #3D3D3D`, `NotUs=--muted-foreground #6b6b6b`. **Font = Roboto Mono (`--font-numeric`).** Props = the richer `{ status, redline?, size?: "sm"\|"md" }`. `#7F7F7F` (`--tertiary`) is **never** used (fails AA). |
| **C-2** | 3 spec-cited tokens absent: `--landing-hairline`, `--landing-hairline-strong`, `--font-ui` | **Add all three in Phase 0** (additive, preserves docs verbatim): `--font-ui` aliases `--font-sf-pro`; `--landing-hairline`/`--landing-hairline-strong` added as OKLCH with hex-in-comment. |
| **C-3** | `MagicLinkButton variant="primary"` is FALSE (yields `#3D3D3D` ink, not orange) | **Extend `ButtonVariant` with a `brand` option** mapped to `bg-brand-orange`/`hover`/`text`. Use `variant="brand"` for the orange CTA (`MagicLinkButton`, hero "Start free", `FinalCtaSection` primary). Do NOT rely on `variant="primary"`. |
| **C-4** | `L-ENG` ID collision across perf/analytics/test clusters | **`LOOP_LEDGER` is authoritative (D-5).** `L-ENG-3` remains bundle/A-B provider extension context, `L-ENG-4` remains proposal export policy, and the A/B baseline/traffic assumption is **`L-EXP-1`**. Do **not** reuse L-ENG-4 for signup CVR. |
| **C-5** | size-limit vs `.lighthouseci/budget.json` vs `lighthouse/budgets.json` (3 budget paths) | **Two mechanisms, two dimensions (not redundant):** `size-limit` (`.size-limit.json`) = **JS-byte budget**; Lighthouse CI (`lighthouserc.js`) = **CWV/perf budget**. **Drop `.lighthouseci/budget.json`** (the L-ENG-6 path) — use `lighthouserc.js` config only. Reconcile `L-ENG-6`. |
| **C-6** | Doc 17 says only Vercel Web Analytics ships; reality = GA4 + Clarity | **Route `trackLandingEvent` to the EXISTING `window.gtag` + `window.clarity` sinks** (match `experiment-tracker.ts`) as the real interim — **not** console-only. Reconcile doc 17 §4.1/§5. PostHog (L-ENG-2) is a later one-file swap. |
| **C-7** | `L-DES-7` mislabeled as "maskable verify" (it's "dark-mode story") | **`L-DES-7` = dark-mode story (ledger wins).** Fold maskable safe-zone verify into `L-DES-1` (visual final) or reserve `L-DES-8`. |
| **C-8** | `HeroSection`/`FinalCTASection` are `'use client'` — contradicts RSC-first + LCP mandate | **Split each into a server tree + a client leaf.** Hero H1 (Doto) must be the LCP element → server-rendered. Measure gzipped initial JS of `/` before/after with `ANALYZE=true` (budget's primary lever). |
| **C-9** | `formatPHP` (doc 18) doesn't exist; real export `formatChartMoney` uses 0 fraction digits | **Create `src/lib/landing/format-currency.ts` exporting `formatPHP` (2 fraction digits).** Leave `formatChartMoney` untouched (it feeds the `.xlsx` export which omits cents). |
| **C-10** | `LandingShellClient` vs existing `PublicPageShell` (boundary unclear) | **Both exist, distinct roles.** `PublicPageShell` = **RSC** composition (`LandingHeader` + `<main>` + `LandingFooter`); `LandingShellClient` = the **`'use client'`** wrapper *inside* it that takes the server tree as `children` (mirrors `WorkshopHomebaseClient`), owns the single `IntersectionObserver` reveal driver + analytics boot. |
| **C-11** | `ScrollReveal` (new) vs `LandingSmoothScrollProvider` (Lenis, existing) | **Coexist — different concerns.** `LandingSmoothScrollProvider` = smooth-wheel (Lenis); `ScrollReveal` = reveal-on-scroll (`IntersectionObserver`, wraps existing `MotionReveal.tsx`). Both ship. |
| **C-12** | Favicon mechanism ambiguity (app-router file vs `public/` vs `/favicon_io/*`) | **Keep `src/app/favicon.ico` (app-router file convention) for the `.ico`.** Move PNGs to `public/` root, update `metadata.icons` to root paths, **delete `/favicon_io/*` in Phase 8.** Do NOT create both mechanisms. |
| **C-13** | `/trust` security posture: doc 02 minimal vs doc 05 richer | **Doc 05 §C (richer) is canonical** (it's the copy doc). Gate any claim beyond "RLS on every table + Supabase Auth" on **L-LEG-4**. Verify each §C claim against the real security code before publishing. |
| **C-14** | `/trust` may use `--proposal-paper` (doc 02 §0.1) though D-1 demotes Direction D | **Do NOT use `--proposal-paper` on `/trust`** until owner confirms (L-DES-1). Keep `/trust` fully Glass-Brand. |
| **C-15** | `L-FUN-1` open in doc 23 vs SUPERSEDED in ledger | **`/signup` route path is DECIDED** (ledger wins). Do NOT re-prompt the owner on the route shape. **Only `L-FUN-2` (self-serve on/off) remains open.** |
| **C-16** | `/contact` fields: doc 15 `role` enum vs current `inquiryType` | **Default to doc 15's `role` enum** {architect, engineer, contractor, estimator, supplier, PM, client, other} + current-workflow textarea. The abuse defense is enum-agnostic. Flag for doc 05 copy-owner confirmation (cosmetic). |
| **C-17** | Prior docs say restrained motion / no animation library; `$gpt-taste` requires real GSAP | **Doc 24 wins for visual execution.** Keep the RSC shell and truth/a11y/perf gates, but add isolated GSAP client islands using `gsap`, `@gsap/react`, and `ScrollTrigger`. CSS-only or IntersectionObserver-only reveal does not satisfy the taste gate. |
| **C-18** | Prior docs lock Doto as display; `$gpt-taste` requires RNG-selected editorial typography | **Doc 24 wins for landing editorial typography.** Select Satoshi, Cabinet Grotesk, Outfit, or Geist in the `<design_plan>` and add/verify the font path during implementation. Doto remains for wordmark/product-continuity accents, not the sole landing editorial font. |
| **C-19** | Prior docs ban stock photos; `$gpt-taste` allows seeded `picsum.photos` | **Truth rail narrows the asset rule.** Seeded imagery is allowed for decorative editorial texture or development placeholders only; it cannot impersonate product proof, founder identity, customer proof, screenshots, logos, metrics, or compliance evidence. Production cutover must close L-TASTE-3. |

### 3.1 Ownership adjudications (contested → single owner)

| Artifact | Single owner | Path (binding) |
|---|---|---|
| `StatusPill.tsx` + `ClaimStatus` type | foundation-tokens (color map, doc 03 §6.1) + claims-proof (matrix binding, doc 06) **jointly** | `src/components/landing/shared/StatusPill.tsx` |
| `/trust` page | claims-proof (doc 06 §6) | `src/app/trust/page.tsx` |
| `/signup` page + auth components | auth (doc 23) | `src/app/signup/page.tsx` + **`src/components/auth/`** (doc 11/21 canonical — NOT `src/components/landing/`) |
| Commercial-graph plate | commercial-graph (doc 04) | `src/components/landing/commercial-graph-plate/` |
| Claims-ledger components | claims-proof (doc 06/11) | `src/components/landing/claims-ledger/` |
| claims scripts | claims-proof (L-CLM-1) | `scripts/claims-matrix-check.mjs` + `scripts/claims-forbidden-sweep.mjs` (separate scripts, per doc 09) |
| `sitemap.ts` / `robots.ts` | a11y-seo-i18n (doc 13) | `src/app/sitemap.ts` + `src/app/robots.ts` |
| rate-limit helper | forms-abuse (doc 15) | `src/lib/landing/rate-limit.ts` |
| `usePrefersReducedMotion` | commercial-graph (extract from `AnimatedProposalRecordSection.tsx`) | `src/components/landing/shared/usePrefersReducedMotion.ts` |

**New homepage sections go under `src/components/landing/sections/`** (cleaner than the flat 38-file
existing layout); existing flat section files (`HeroSection.tsx`, `PricingSection.tsx`,
`FinalCTASection.tsx`) are **edited in place**.

---

## 4. SWOT analysis

| | Helpful | Harmful |
|---|---|---|
| **Internal** | **Strengths** • The brand vocabulary already exists and is loved — `.dashboard-glass`, signal orange, Doto/Roboto Mono are in `globals.css` and proven on the Workshop Dashboard. No new design system to invent. • Radical-honesty proof engine turns "we have no customers yet" from a weakness into the argument. • RSC-first + the dashboard as a peg means the perf/a11y patterns are de-risked (deferred-glass arming, `IntersectionObserver` reveal). • The 27-planning-doc spec is unusually complete; the audit already found the landmines. • Standing DB-auth mandate + Postgres rate-limit infra (`security_rate_limit_events`) already built. | **Weaknesses** • Current homepage actively violates the brand (banned "Win More Bids" hero, 3 fabricated testimonials, 2.3MB PNG). Large removal surface. • The full program is big if executed end-to-end; the minimum shippable slice must stay smaller. • Claims-matrix parser grammar and moat-metric `xmax=0` idiom remain unproven. • Live `#aa412a` clay literals contradict D-3 and must be hunted down. |
| **External** | **Opportunities** • "The commercial graph nobody else has drawn" is a real differentiator if executed cleanly. • PH+SEA mobile-first on 4G is an underserved segment; a fast, honest, glass-coherent site stands out. • Preview-first `/newdesign` + A/B de-risks cutover; `/legacy` 30-day window makes it reversible. | **Threats** • SVG + `backdrop-filter` interaction is renderer-flaky (audit flagged) — needs empirical validation, not assumption. • Owner gates (pricing validation, legal/DPA, beta onboarding, analytics tool) can't be closed in code — they cap the public claim set. • SF Pro licensing on non-Apple platforms (L-DES-4) is a real risk for a Windows/Android audience. • Doto `adjustFontFallback` + peso `₱` subset are unmeasured for CLS (L-ENG-5/L-DES-6) — must verify on a Moto-G-class device before cutover. |

---

## 5. Pros & cons of the build approach

**Chosen approach: preview-first, URL-swap cutover** (per doc 08/21) over a **big-bang replace**.

| | Pros | Cons |
|---|---|---|
| **Preview-first (`/newdesign` → A/B → swap)** | • Zero-downtime; old site keeps earning while new one is reviewed. • A/B produces real evidence (not vibes) before cutover. • `/legacy` 30-day window = fully reversible. • Lets the claims-sign-off gate (doc 09) run as a real checkpoint. • Parallel-safe: build new tree without touching `/`. | • ~2× the components briefly (byte-identical twins under `/newdesign` + canonical) until swap. • Requires a 301-redirect map + `X-Robots-Tag` hygiene. • More moving parts (A/B provider, experiment wiring). |
| **Big-bang replace (rejected)** | • Fewer files; one tree. • Simpler mental model. | • Irreversible; any regression is live. • No A/B evidence. • Conflicts with the pack's own rollout doc (08) and claims gate (09). |

**Verdict:** preview-first wins. The cost (brief duplication) is far smaller than the risk of an
irreversible bad cutover on a honesty-branded surface.

---

## 6. Critical path (the sequential spine — do not parallelize these)

```
Phase 0a  globals.css  --landing-* alias token layer + @theme inline bridge        [EVERYTHING blocked]
   ↓
Phase 0b  shared/StatusPill.tsx  +  D-4 ClaimStatus type + locked color map          [plate, ledger, /features, /trust, auth all import it]
   ↓
Phase 0c  overflow-x:clip on html+body  +  PublicPageShell retune  +  Hero/FinalCTA 'use client' split   [320px floor, <40KB JS, LCP=text]
   ↓
Phase 0d  $gpt-taste <design_plan> + dependency check for gsap/@gsap-react/editorial font [UI work blocked]
   ↓
Phase 1   plate-data.ts → ArchitecturePlate/PlateCaption  AND  claims-ledger/{ClaimsLedger,ClaimRow,ClaimFilter}  AND  LandingShellClient/MaturityTag   [reusable surfaces Phases 2-3 compose from]
   ↓
Phase 2   Homepage 11-section DOM order in page.tsx                                  [the public surface A/B + cutover hinge on]
   ↓
Phase 3   /trust route  +  /signup route  +  /newdesign preview tree                 [route expansion: sitemap/robots/claims-sign-off/A-B all target this]
   ↓
Phase 6   claims-matrix-check.mjs + claims-forbidden-sweep.mjs CI gate GREEN vs live Feature Inventory   [THE HONESTY GATE; /trust §3 + homepage §7 cannot go public until it passes]
   ↓
Phase 7   /newdesign → canonical URL swap + 301 map + /legacy host                   [the irreversible public moment; gated L-DES-1..5 visual sign-off]
   ↓
Phase 8   Deletion rail (fabricated testimonials + hype hero + 2.3MB PNG)            [gated L-REM-1..6; the honesty argument the whole redesign rests on]
```

---

## 7. The 9 phases (authoritative build order)

Each phase: **goal · owner · new files · edits · contracts · verification · gates · parallelization.**
Phase numbering follows the audit reconcile. Phases 0→3 are the spine; 4-5 cross-cut; 6-8 gate and cutover.

### Phase 0 — Foundation (BLOCKING; lead-solo; no parallelism)

> **Everything imports Phase 0. Do this first, alone, verify, then unlock the rest.**

- **Goal:** land the additive token layer, the shared `ClaimStatus` primitive, the canvas/shell retune, and the RSC splits that the perf budget depends on.
- **Owner:** lead (foundation-tokens + engineering). **Solo — no parallel agents** (shared files).
- **New files:**
  - `src/components/landing/shared/StatusPill.tsx` — the ONE `ClaimStatus` type + pill (C-1 color map, Roboto Mono, `{status, redline?, size?}`).
  - `src/components/landing/shared/index.ts` — barrel.
  - `src/components/landing/shared/BrandComposition.tsx` — pure-presentational RSC (gradients + frost-tile SVG, zero raster). `variant: "hero"|"auth-panel"|"og"`.
  - `src/components/landing/shared/usePrefersReducedMotion.ts` — extracted from `AnimatedProposalRecordSection.tsx`.
  - `src/components/landing/shell/LandingShellClient.tsx` — `'use client'` wrapper taking server tree as `children` (C-10).
  - `src/components/landing/shell/MaturityTag.tsx` — "Pre-launch MVP preview" pill (`--secondary #5D5D5D`, never `#7F7F7F`).
  - `src/components/landing/scroll-reveal/ScrollRevealLeaf.tsx` — tiny `'use client'` leaf per section.
  - `src/components/landing/gpt-taste/gpt-taste-design-plan.ts` — records the deterministic
    selection from doc 24 once the actual implementation prompt exists.
- **Edits:**
  - `src/app/globals.css` — (a) APPEND `--landing-*` alias block after `--sidebar-content-offset: 80px;` (last `:root` entry, ~L152); resolve the 3 absent tokens (C-2). (b) APPEND `@theme inline` bridge after `--radius-xs: var(--radius-xs);` (last `@theme inline` entry, ~L205) so `bg-landing-canvas`/`text-landing-ink`/etc. resolve as native Tailwind v4 utilities (sidesteps the `bg-[color:var(--x)]` gotcha). (c) add `overflow-x: clip` to `html, body`. **Do not touch any existing line.**
  - `src/app/layout.tsx` — OPTIONAL `adjustFontFallback` for Doto only **if** CLS≠0 measured (L-DES-6); default defer.
  - `src/components/landing/HeroSection.tsx` + `FinalCTASection.tsx` — split `'use client'` → server tree + client leaf (C-8).
  - `src/components/landing/PublicPageShell.tsx` — retune `bg-white text-[#111111]` → Glass-Brand canvas + `--ink`.
  - `src/components/landing/AnimatedProposalRecordSection.tsx` — extract `usePrefersReducedMotion` (leave an import).
  - `src/components/brand/ArchestimatorLogo.tsx` — reskin to slab treatment (signal-orange slab + knocked-out 'A'); **edit in place**, do not create a parallel `Wordmark.tsx`.
- **Contracts:** §8.1 (tokens), §8.2 (`ClaimStatus`).
- **Verification:** `bun run type-check`; `rg "#aa412a" src/` (baseline the clay count); `rg "\-\-clay" src/app/globals.css` (= 0); `/` still renders (no regressions); `ANALYZE=true bun run build` → record baseline initial-JS of `/`.
- **GPT-taste gate:** before Phase 1 UI work, emit the doc-24 `<design_plan>`, verify `package.json`
  for `gsap` / `@gsap/react` / selected editorial font availability, and carry any missing package
  or asset decision as L-TASTE-*.
- **Gates:** L-DES-6 (Doto CLS) carried; L-DES-1 (visual final) carried; L-TASTE-1..4 carried as needed.
- **Definition of done:** tokens land, `StatusPill` exports `ClaimStatus`, `$gpt-taste`
  `<design_plan>` exists, package/dependency gaps are recorded, `type-check` green, `/` renders
  unchanged, baseline JS recorded.

### Phase 1 — Shared primitives + plate data + asset pipeline (parallel after Phase 0)

- **Goal:** build the reusable surfaces Phases 2-3 compose from: the plate, the claims ledger, the shell client, the asset pipeline, the rate-limit helper.
- **Owner:** parallel lanes (commercial-graph / claims-proof / foundation-tokens / component-inventory / forms-abuse) — **disjoint file scopes** (§11).
- **New files (by lane):**
  - **commercial-graph:** `src/components/landing/commercial-graph-plate/{plate-data.ts,ArchitecturePlate.tsx,PlateCaption.tsx,PlateNode.tsx,PlateEdge.tsx}`. `plate-data.ts` = `PLATE_NODES` verbatim from doc 04 §4.8; `ArchitecturePlate` = RSC renderer (desktop composition OR mobile vertical stack from the SAME data); `PlateCaption` = the ONLY client leaf (`aria-live="polite"`).
  - **claims-proof:** `src/components/landing/claims-ledger/{ClaimsLedger.tsx,ClaimRow.tsx,ClaimFilter.tsx}`. `ClaimsLedger` = RSC; `ClaimFilter` = `'use client'` island (CSS show/hide, no re-render).
  - **foundation-tokens (assets):** `scripts/{generate-og-images.mjs,generate-favicons.mjs,og-template.svg.ts}` + `scripts/og-assets/doto-subset.woff2` + `public/brand/{logo-slab.svg,frost-tile.svg,wordmark.svg,mask-mark.svg}` + `public/og/*.png` + `public/og/*.meta.json`. (NO `feTurbulence`/`feDisplacementMap` — AI-slop tell.)
  - **component-inventory / taste-motion:** `src/components/landing/analytics/LandingAnalyticsBoot.tsx`,
    `src/components/landing/gpt-taste/{GsapLandingMotion.tsx,GsapPinnedProof.tsx,GsapScrubbedWords.tsx,GsapCardStack.tsx}`
    (real GSAP islands per doc 24; the older `ScrollReveal` may remain as fallback but does not
    satisfy the `$gpt-taste` motion gate by itself).
  - **forms-abuse:** `src/lib/landing/rate-limit.ts` (`checkLandingSubmissionQuota`) — clone the proven `src/lib/ai/rate-limit.ts` Postgres sliding-window pattern against `security_rate_limit_events`.
- **Edits:** `src/components/landing/index.ts` — re-export the new leaves (**lead merges last**).
- **Contracts:** §8.2 (plate node schema, edge kinds).
- **Verification:** `tests/unit/plate-data-model.test.ts` (every node status ∈ Live/Building/Planned, no NotUs; collapse ≤414px); `tests/vitest/architecture-plate.test.tsx`; `tests/vitest/claims-ledger.test.tsx`; `tests/vitest/claim-filter.test.tsx`; `tests/unit/rate-limit-helpers.test.ts`.
- **Gates:** L-CLM-1 (scripts) lands in Phase 6; plate SVG geometry is a brief → implementer finalizes viewBox/coords (C-2 resolves the token side).
- **Definition of done:** plate renders from data + collapses; ledger renders + filters; at least
  two doc-24 GSAP paradigms are implemented or explicitly assigned to Phase 2; rate-limit helper
  unit-tested; OG/favicon pipeline runs.

### Phase 2 — Homepage sections (parallel after Phase 1)

- **Goal:** build the 11-section homepage DOM order + rewrite the banned hero copy + reskin header/footer + execute the partial removal rail.
- **Owner:** parallel lanes per section (disjoint files) — sections-copy + component-inventory.
- **Canonical DOM order (doc 02):** Header · 1 Hero · 2 Problem · 3 Layer + commercial-graph plate · 4 What you get · 5 How it works · 6 Who it is for · 7 What is real today (ClaimsLedger) · 8 Why not a spreadsheet · 9 Founder · 10 Pricing honestly · 11 Final CTA · Footer.
- **New files (sections/, each RSC unless noted):** `ProblemSection.tsx` · `LayerSection.tsx`
  (wraps plate) · `WhatYouGetSection.tsx` (gapless `grid-flow-dense` bento or equivalent dense
  product-mechanic grid with span math proof) · `HowItWorksSection.tsx` (semantic `<ol>` plus
  optional horizontal accordion leaf from doc 24) · `WhoItIsForSection.tsx` (tiered, NO logos) ·
  `WhyNotSpreadsheetSection.tsx` (real `<table>`) · `FounderSection.tsx` (ships §11.5 paragraph;
  photo/one-liner RESERVED no-CLS, gated L-FND-1) · `PricingPhilosophySection.tsx` (philosophy +
  cement-anchor as CONCEPT, no numbers, §9.3 hypothesis-labeled) · `FinalCtaSection.tsx` (RSC,
  `{isLoggedIn}`).
- **Edits:** `src/components/landing/HeroSection.tsx` (remove banned May copy `PRECISION_TO_WIN_HEADLINE`/"Win More Bids"/"Close Projects…"; Doto H1 = LCP); `src/components/landing/shell/LandingHeader.tsx` (glass nav, clay cleanup `#aa412a` ~L48/128, both CTAs, `/signup` href or `/login` meanwhile per L-FUN-2); `src/components/landing/shell/LandingFooter.tsx` (3-col glass sitemap replacing logo-only footer); `src/app/page.tsx` (compose the 11-section order inside `LandingShellClient`).
- **Removal rail:** do **not** delete owner-gated artifacts in Phase 2. Hide/stop rendering fabricated testimonials and placeholder proof in the preview slice, then execute physical deletion only after L-REM-1…5 close or in the Phase 8 deletion rail.
- **Verification:** `tests/vitest/{hero,problem,layer,whatyouget,howitworks,whoitfor,whynotspreadsheet,founder,pricing-philosophy,final-cta}-section.test.tsx`; `tests/vitest/landing-header.test.tsx` + `landing-footer.test.tsx`; hero 2-3 line/static-class test; dense-grid math test; GSAP/reduced-motion tests; `rg "Win More Bids|PRECISION_TO_WIN|Close Projects" src/` = 0; `rg "#aa412a" src/components/landing/` decreasing.
- **Gates:** L-FND-1 (founder bio — ship fallback); L-FUN-2 ("Start free" → `/login` meanwhile); L-PRC-1 (pricing philosophy only).
- **Definition of done:** 11-section order renders as AIDA; hero has exactly two contrast-valid CTAs
  and a wide 2-3 line H1 contract; bento/dense grid has no dead cells; real GSAP motion exists with
  reduced-motion fallback; banned copy gone; header/footer glass; partial removals done.

### Phase 3 — Route pages + `/newdesign` preview (after Phase 2)

- **Goal:** assemble the route pages + the auth surface + the `/newdesign` preview tree + the contact rewrite.
- **Owner:** parallel lanes (sections-copy + a11y-seo-i18n + auth + component-inventory + analytics + forms-abuse).
- **New files:**
  - **Routes:** `src/app/features/page.tsx` (mechanic-forward, expanded ledger, AI-deferred section), `src/app/about/page.tsx` (founder §11.5 + mission/vision; L-FND-1), `src/app/trust/page.tsx` (claims ledger + private-by-design + security-as-shipped §C canonical C-13 + reserved Section E residency), `src/app/signup/page.tsx` (gated L-FUN-2: `SignupForm` OR `ClosedBetaGate`), `src/app/legacy/page.tsx` (rollback host, `noindex`, canonical→twin), `src/app/newdesign/**` (preview tree, byte-identical to post-cutover).
  - **Auth components (`src/components/auth/` — §3.1, NOT landing/):** `AuthLayout.tsx` (RSC 2-col grid), `AuthGlassPanel.tsx` (`aria-hidden`, no fake screenshots), `LoginForm.tsx` + `SignupForm.tsx` (`'use client'` leaves; two `<form action>` server actions, NO client fetch; `autocomplete`; honeypot), `GoogleButton.tsx` (`variant="secondary"`, type=submit), `MagicLinkButton.tsx` (`variant="brand"` per C-3), `ClosedBetaGate.tsx` (email → `/contact?intent=beta-request`).
  - **Edits:** `src/app/login/page.tsx` → rebuild as D-2 `AuthLayout` 2-col; `src/app/contact/page.tsx` → Glass-Brand reskin + remove hardcoded hex; `src/components/landing/ContactForm.tsx` → rewrite submission path to server action + honeypot + rate-limit.
- **Contracts:** §8.3 (auth: server actions, honeypot `name="company_url"`, error codes), §8.4 (routes + noindex).
- **Verification:** `tests/vitest/auth-{layout,glass-panel,forms,closed-beta-gate}.test.tsx`; `e2e/auth-*.spec.ts` (7 specs); `tests/unit/auth-redirects-sanitize.test.ts` (create fresh — doc 16 wrongly claims these exist); `tests/unit/contact-action-validation.test.ts`.
- **Gates:** L-FUN-1 (route DECIDED, C-15); L-FUN-2 (self-serve — `ClosedBetaGate` default); L-LEG-2/3 (any `/trust` claim beyond RLS+Supabase Auth); L-A11Y-1 (auth-surface a11y).
- **Definition of done:** all 8 routes + auth render; `/newdesign` mirrors canonical; auth e2e green; contact server-action works.

### Phase 4 — SEO/a11y/i18n scaffolding + claims CI (parallel with Phase 3)

- **Goal:** sitemap/robots/metadata/structured-data everywhere + the claims CI scripts + bundle/perf CI deps.
- **Owner:** parallel (a11y-seo-i18n + claims-proof + test).
- **New files:** `src/app/sitemap.ts` + `src/app/robots.ts` (doc 13 §4 verbatim); `src/lib/landing/seo-metadata.ts` (per-route metadata factory); `src/lib/landing/format-currency.ts` (`formatPHP`, C-9); `src/components/landing/structured-data.tsx` (JSON-LD: Organization + WebSite sitewide in layout; per-route WebPage/Breadcrumb/ItemList); `scripts/claims-matrix-check.mjs` + `scripts/claims-forbidden-sweep.mjs` (zero-dep `.mjs`, separate scripts) + `scripts/claims-inventory-normalize.mjs` + `scripts/fixtures/claims-forbidden.txt` + `.evidence/feature-inventory-<date>.md` (doc 09 markdown); `.size-limit.json` + `lighthouserc.js` (C-5); `next.bundle-budget.json`; deps `axe-core`/`@axe-core/playwright`.
- **Edits:** `src/app/layout.tsx` (JSON-LD + skip-to-content + `<main id="main-content">`); add `export const metadata` to every marketing/legal route + `/login`+`/signup` (`noindex,nofollow` + self-canonical) + `/beta/access-required` + `/workshop/*`; `package.json` (scripts: `test:claims`, `analyze`, `perf:analyze`, `perf:lighthouse`); `eslint.config.mjs` (`no-restricted-syntax` for peso literals); `.github/workflows/ci.yml` (bundle-budget + claims steps).
- **Verification:** `bun run test:claims` (matrix-check + forbidden-sweep green vs snapshot); `tests/landing/no-peso-literals.test.ts`; auth routes carry `noindex`; sitemap excludes auth/preview/legacy.
- **Gates:** L-SEO-1 (metadataBase origin placeholder until domain confirmed); L-I18N-1 (EN-only); L-CLM-1/2/3 (scripts now exist → gate becomes runnable).
- **Definition of done:** sitemap/robots/metadata/JSON-LD on all routes; claims CI green; bundle/perf gates wired.

### Phase 5 — Analytics + forms-abuse enforcement (after Phase 3/4)

- **Goal:** wire the analytics sink to real GA4/Clarity (C-6), the moat-metric dedup, the A/B experiment, and enforce the honeypot/rate-limit server-side.
- **Owner:** parallel (analytics + forms-abuse).
- **New files:** `src/lib/landing/analytics-events.ts` (`trackLandingEvent` → `window.gtag`/`window.clarity`, C-6) + `landing-analytics-types.ts` + `landing-anon-id.ts`; `src/lib/activation/record-component-reused.ts` (server-authoritative moat dedup); `src/lib/landing/contact-actions.ts` + `src/lib/auth/signup-actions.ts`; `supabase/migrations/<ts>_user_activation_state.sql`.
- **Edits:** `src/lib/auth/actions.ts` (**honeypot enforcement** in `signInWithEmail` + `signInWithGoogle` — read `company_url`, silent-drop if non-empty BEFORE Supabase; this is the load-bearing abuse edit — the UI honeypot alone is decorative); `src/app/auth/callback/route.ts` (anon→auth merge seam after `exchangeCodeForSession`); `src/lib/ab-testing/experiments.ts` (add `landing-redesign-2026-06`); `variant-assigner.ts` (extend `getVariant` with optional `trafficFraction`); `experiment-tracker.ts` (wire `trackLandingEvent`); `LandingAnalyticsLoader.tsx` (reconcile to new sink).
- **Verification:** `e2e/auth-honeypot.spec.ts` + `auth-rate-limit.spec.ts`; `e2e/moat-component-reused.spec.ts` (heaviest — fires `component_reused` exactly once); `e2e/auth-magic-link.spec.ts`.
- **Gates:** L-ENG-2 (analytics tool — PostHog later); the `xmax=0` moat idiom is **unproven in Postgres** → verify empirically before relying on it (R-3).
- **Definition of done:** analytics sink routes to real GA4/Clarity; honeypot/rate-limit enforced server-side; moat metric fires once-per-user (proven).

### Phase 6 — Claims sign-off gate + perf/CI gates (after Phase 5)

- **Goal:** run the honesty gate green against the live Feature Inventory; land perf CI; capture visual baselines.
- **Owner:** claims-proof + test + perf.
- **Work:** run `claims-matrix-check` + `claims-forbidden-sweep` against `.evidence/feature-inventory-<date>.md`; reconcile `PLATE_NODES` + ledger to the inventory (L-CLM-1/2/3); land `lighthouserc.js` CWV gate + `.size-limit.json` JS gate (C-5); **measure** Doto `adjustFontFallback` CLS=0 on Moto-G-class (L-ENG-5/L-DES-6); measure peso `₱` subset CLS; capture Playwright visual baselines (L-VIS-1); run the per-route e2e + glass-arming + ≤4-blur-cap e2e.
- **Verification:** `bun run test:claims` green + diff committed; `bun run perf:lighthouse`; `e2e/glass-arming.spec.ts` + `e2e/glass-blur-cap.spec.ts` (≤4 simultaneous blur panels); visual baselines committed.
- **Gates:** L-CLM-1/2/3 (the honesty gate — **/trust §3 + homepage §7 cannot go public until this passes**); L-ENG-1 (targets); L-ENG-5/L-DES-6 (CLS); L-VIS-1 (baselines); L-A11Y-1 (live 30fps).
- **Definition of done:** claims gate green + signed off in `LOOP_LEDGER`; perf/visual gates pass.

### Phase 7 — Cutover (URL swap; after Phase 6 sign-off)

- **Goal:** swap `/newdesign` components into canonical routes; add redirects; stand up `/legacy`.
- **Owner:** migration + analytics.
- **Work:** URL-swap (not code change — the `/newdesign` components move to canonical); add 301 redirect entries to `next.config.ts` `redirects()` (~L99); add `X-Robots-Tag` for `/legacy` + `/newdesign`; create `/legacy` rollback host (30-day window).
- **Verification:** canonical routes serve the new tree; `/legacy` serves old; redirects resolve; `/newdesign` + `/legacy` `noindex`.
- **Gates:** **L-DES-1..5 (owner visual sign-off) + L-FUN-2 + L-LEG-2** — cutover is BLOCKED until Philip signs the visual.
- **Definition of done:** cutover live; `/legacy` rollback available.

### Phase 8 — Deletion rail (after Phase 7 + owner gates L-REM-1..6)

- **Goal:** remove the honesty violations the redesign rests on.
- **Owner:** migration + claims-proof.
- **Work:** delete fabricated testimonials (done partially in Phase 2; finish) + hype hero (9 slides + 2.3MB PNG) + logo-only footer + `/favicon_io/*`; `NeatWireframeBackground.tsx` clay cleanup (3 `#aa412a` literals) or delete; audit anchor rot (R-8); Day-31 `/legacy` action (L-REM-6).
- **Verification:** `rg "#aa412a" src/` = 0; `rg "Win More Bids|testimonial" src/components/landing/` = 0; 2.3MB PNG gone from bundle; `git diff --check`.
- **Gates:** **L-REM-1..6 (owner confirmation to delete).**
- **Definition of done:** honesty violations gone; D-3 enforced (no clay anywhere).

---

## 8. Contracts registry (copy verbatim into code)

### 8.1 Token layer to ADD (`globals.css`, Phase 0)

Append after `--sidebar-content-offset: 80px;` in `:root` (the aliases let every component bind to a
grep-stable name; the 3 absent tokens resolve C-2):

```
/* === Landing — Glass Brand additive token layer (D-1/D-3) === */
--landing-canvas: var(--warm-canvas);          /* #f5f5f5 */
--landing-ink: var(--ink);                     /* #3D3D3D */
--landing-ink-secondary: var(--secondary);     /* #5D5D5D */
--landing-ink-muted: var(--muted-foreground);  /* #6b6b6b */
--landing-accent: var(--brand-orange);         /* #F24405 presence */
--landing-accent-aa: var(--brand-orange-dark); /* #C63804 AA small text */
--landing-hairline: oklch(96.5% 0.003 264);    /* ≈ #f2f2f2 (alias of --hairline) */
--landing-hairline-strong: oklch(92% 0.004 264);/* ≈ #e8e8e8 */
--landing-paper: var(--proposal-paper);        /* #fffdf8 — Direction D only, do not use on Glass routes */
--landing-radius-panel: 12px;                  /* --glass-radius */
--landing-radius-pill: 8px;                    /* --glass-nav-radius */
--landing-radius-edge: 3px;                    /* --radius-xs */
--font-ui: var(--font-sf-pro);                 /* SF Pro (C-2 resolution) */
/* type scale (clamp, mobile-first), spacing (4-pt), z-index, measure — per doc 03 §2.1/§3.4/§3.5/§3.6/§3.7 */
```

Then in `@theme inline`, after `--radius-xs: var(--radius-xs);`, bridge the consumed tokens:
`--color-landing-canvas`, `--color-landing-ink`, `--color-landing-hairline`, `--color-landing-accent`,
`--font-landing-display`, `--font-landing-numeric`, `--font-landing-ui`, plus per-scale
`--text-landing-*`/`--leading-landing-*`/`--tracking-landing-*` **only for tokens a component actually consumes** (enumerate as you build — doc 03 §3.4 defers this).

### 8.2 Type contracts

```ts
// src/components/landing/shared/StatusPill.tsx — the ONE definition (D-4)
export type ClaimStatus = "Live" | "Building" | "Planned" | "NotUs";
export interface StatusPillProps { status: ClaimStatus; redline?: boolean; size?: "sm" | "md"; }
// color map (C-1): Live→--success #15803d, Building→--warning #b45309,
//                  Planned→--ink #3D3D3D, NotUs→--muted-foreground #6b6b6b
// font: Roboto Mono (--font-numeric). #7F7F7F NEVER.

// plate narrows at the call site (doc 04):
type PlateStatus = Exclude<ClaimStatus, "NotUs">; // "Live" | "Building" | "Planned"

// plate data model (doc 04 §4.8):
type PlateEdgeKind = "solid" | "solid-strong" | "accent-dashed";
interface PlateEdge { to: string; kind: PlateEdgeKind; }
interface PlateNode { id: string; label: string; subLabel?: string; status: PlateStatus; edges?: PlateEdge[]; }
// store each bidirectional edge ONCE on the lower-id node; renderer emits double-headed arrow.
```

### 8.3 Auth + abuse contracts

```ts
// Server actions (NO client fetch): signInWithEmail, signInWithGoogle (existing src/lib/auth/actions.ts)
// Honeypot: hidden input name="company_url"; server action silent-drops if non-empty BEFORE Supabase.
// Magic link signup: signInWithEmail({ ..., shouldCreateUser: true })
// Rate limit: checkLandingSubmissionQuota(scope: "landing_contact" | "landing_signup" | "landing_signup_google")
//   → Postgres security_rate_limit_events sliding window (clone src/lib/ai/rate-limit.ts). NOT Redis.
// Button variant for orange CTA: variant="brand" (C-3) — do NOT use variant="primary" (yields #3D3D3D).
// AUTH_ERROR_CODES (aria-live, never raw Supabase): email_required, auth_request_failed,
//   google_request_failed, callback_missing_code, callback_exchange_failed, invalid_redirect.
```

### 8.4 Routes + metadata contract

| Route | Indexable | robots | Notes |
|---|---|---|---|
| `/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust` | yes | index,follow | self-canonical; in sitemap; JSON-LD per route |
| `/login`, `/signup`, `/beta/*`, `/workshop/*` | **no** | **noindex,nofollow** | self-canonical; **excluded from sitemap** |
| `/newdesign/**`, `/legacy` | **no** | **noindex,nofollow** + `X-Robots-Tag` | excluded from sitemap; `/legacy` canonical → its twin |

### 8.5 Brand hard constraints (the "do not ship" rail)

NO fabricated: logos · testimonials · adoption stats · compliance badges · prices · partner names.
NO `#AA412A`/`--clay` anywhere (D-3). NO re-drawn fake browser/IDE chrome. NO `feTurbulence`/
`feDisplacementMap` SVG filters. NO password auth (D-2). NO "the only…/only we…". Hero H1 = Doto text
(LCP). ≤4 simultaneous `backdrop-filter` blur panels. Glass arms via `data-glass="ready"` (deferred).

---

## 9. Risk register

| ID | Risk | Sev | Mitigation |
|---|---|---|---|
| R-1 | SVG plate + `backdrop-filter` renderer-flaky across browsers | HIGH | Build the plate data-driven (C-2 tokens); test `e2e/glass-blur-cap` + visual baselines; static fallback render if backdrop-filter unsupported (`--glass-bg-fallback #fbfbfc`). |
| R-2 | Doto `adjustFontFallback` / peso `₱` subset CLS unmeasured | MED | Measure on Moto-G-class before cutover (L-ENG-5/L-DES-6); use `subsets:['latin-ext']` (NOT the malformed `unicodeRanges:['U+20B1']`); pin `adjustFontFallback` only if auto-inject shifts. |
| R-3 | Moat-metric `xmax=0` `was_insert` idiom unproven in Postgres | MED | Prove empirically in Phase 5 before relying on the "fires once per user" guarantee. |
| R-4 | `next.config.ts` has `withBundleAnalyzer` but no `analyze` script/budget/CI (L-ENG-3) | MED | Add the script + `.size-limit.json` + CI step in Phase 4; the wrapper already exists. |
| R-5 | Rate-limit enforcement site for `/signup` unverified (honeypot decorative until `actions.ts` edited) | HIGH | Phase 5 MUST edit `src/lib/auth/actions.ts` — the UI honeypot alone is decorative. |
| R-6 | `metadataBase` origin is placeholder (`https://archestimator.com`) | LOW | Gate canonical/OG absolutization on L-SEO-1/domain confirmation. |
| R-7 | `getClientIp` returns raw `x-forwarded-for` with no validation | MED | Add landing-scoped IP validator (don't extend the shared symbol — blast radius); `^[A-Za-z0-9.:_-]+$` max 45 chars. |
| R-8 | Doc 16 wrongly claims `tests/unit/auth-redirects*` + `rate-limit-helpers` exist | LOW | Create them fresh in Phase 4/5; don't assume coverage. |
| R-9 | SF Pro licensing on non-Apple platforms (L-DES-4) | MED | Doto/Roboto Mono sidestep via `next/font`; SF Pro risk accepted (common practice) or Inter drop-in — owner call. |
| R-10 | Full landing/auth build is coordination-heavy; concurrent agents may collide on shared files | MED | §11 multi-agent protocol: lead owns the spine; lanes are file-disjoint; barrels merged last. |
| R-11 | `/trust` could over-claim security posture | MED | §C canonical (C-13); gate beyond "RLS + Supabase Auth" on L-LEG-4; verify each claim vs code. |

---

## 10. Owner-gate carry matrix (CARRIED — you may NOT close these)

These are **Philip's decisions**. Build the safe default; flag the gate; never silently resolve.

| Gate | Blocks | Default branch to ship meanwhile |
|---|---|---|
| **L-FUN-2** (beta onboarding / self-serve on-off) | `/signup` self-serve | `ClosedBetaGate` → email to `/contact?intent=beta-request`; "Start free" → `/login` |
| **L-FND-1** (founder bio/photo) | `/about` richness, homepage §9 | Ship §11.5 paragraph only; reserve photo slot (no CLS) |
| **L-PRC-1** (pricing validation) | `/pricing` numbers | Philosophy + cement-anchor as CONCEPT only, §9.3 hypothesis-labeled |
| **L-LEG-2/3/4** (Privacy/ToS/DPA/BIR) | `/trust` compliance claims, signup data-handling | Only "RLS on every table + Supabase Auth"; beyond that → gated |
| **L-ENG-1** (perf targets ratified) | treating CWV as gates | Use doc 14 targets as working assumption; measure, don't assert |
| **L-ENG-2** (analytics tool) | PostHog vs Plausible vs GA4 | Route to existing GA4+Clarity (C-6); PostHog is a one-file swap later |
| **L-ENG-3** (bundle-gate wiring) | CI JS gate | Build the script + budget (the wrapper exists) |
| **L-DES-1** (Glass-Brand visual final) | `03`/`04`/`23` finalization, cutover | Mechanics proceed; one owner look before cutover (Phase 7 block) |
| **L-DES-6** (Doto CLS=0) | `adjustFontFallback` pinning | Defer pinning until measured (Phase 6) |
| **L-A11Y-1** (live 30fps Moto-G verify) | text-on-glass AA, motion | The unautomatable gate; carry honestly |
| **L-PEG-1** (competitive scan) | "no competitor has drawn the commercial graph" claim | Soften to a *qualified hypothesis* until substantiated |
| **L-SEO-1** (PH/SEA keyword volumes) | SEO-driven copy, metadataBase | Use recommended keywords as assumption |
| **L-I18N-1** (launch locale) | hreflang, sitemap localization | EN-only; documented FIL/ID roadmap |
| **L-REM-1..6** (removal rail OK) | deleting testimonials/hero/PNG/footer | Phase 2 does safe partials; Phase 8 full rail needs OK |
| **L-CRM-1** (waitlist destination) | `ClosedBetaGate` email route | `/contact?intent=beta-request` meanwhile |
| **L-CLM-1/2/3** (claims scripts) | automated claims gate | Manual checklist until scripts ship (Phase 4/6) |

---

## 11. Multi-agent coordination protocol (multiple AIs on one repo — STAY VIGILANT)

The goal directs multiple coding agents to work this directory concurrently. Follow this to avoid
clobbering each other:

0. **Every UI lane starts with `$gpt-taste`.** Worker prompts must cite
   `24-GPT-TASTE-EXECUTION-CONTRACT.md`, carry a dedicated `/goal`, and either produce their own
   slice-specific `<design_plan>` or cite the lead-approved shared `<design_plan>`. A worker that
   cannot satisfy the taste gate reports the blocker instead of silently implementing the old
   restrained-motion plan.
1. **The spine is lead-only.** `globals.css`, `StatusPill.tsx`, `shared/index.ts`,
   `src/components/landing/index.ts`, `package.json`, `next.config.ts`, `.github/workflows/ci.yml`,
   `LOOP_LEDGER.md` are edited **only by the lead**, **sequentially**. Agents import from them; they
   do not edit them. (Exception: an agent may append a *clearly-delimited, namespaced* block with lead
   pre-approval, then the lead merges.)
2. **Phases gate parallelism.** Phase 0 is solo. Phase 1-5 lanes are **file-disjoint by design**
   (each lane owns its own directory: `commercial-graph-plate/`, `claims-ledger/`, `auth/`, `sections/`,
   `scripts/`, `src/lib/landing/`). No two lanes write the same file.
3. **Barrels are merged last.** `index.ts` re-exports are added by the lead after a lane completes,
   so concurrent agents never edit the barrel simultaneously.
4. **Worktree isolation for risky overlap.** If two lanes could touch a shared file (e.g. both edit
   `page.tsx`), run the second in a git worktree (`isolation: 'worktree'`) and the lead merges.
   Default: avoid overlap by scope, not by merge.
5. **Re-read before edit.** Before editing any file, an agent MUST `git status` + re-read it (another
   agent may have just changed it). Edit by unique anchor string, never by line number.
6. **One truth for contracts.** `StatusPill` color map, `ClaimStatus`, token names, route paths, the
   `brand` button variant — defined ONCE (§8). Agents import; they never redefine. The
   `tests/unit/claim-status-narrowing.test.ts` greps to enforce no divergent type defs.
7. **Conflicts escalate to the lead.** If an agent finds a spec contradiction not covered by §3, it
   STOPS, records the conflict, and asks the lead — it does not guess. (The audit already caught 16;
   new ones go in `LOOP_LEDGER.md`.)
8. **Commit hygiene.** Each lane commits its own disjoint scope with a scoped message
   (`feat(landing-plate): …`). The lead integrates. No `git push`/force without owner ask.

---

## 12. Verification gates (per phase + final)

| Phase | Gate (must pass before next) |
|---|---|
| 0 | `$gpt-taste` `<design_plan>` exists · dependency check for `gsap`/`@gsap/react`/selected font recorded · `bun run type-check` · `/` renders unchanged · baseline JS recorded · `rg "#aa412a" src/` baselined |
| 1 | `tests/unit/plate-data-model` · `architecture-plate` · `claims-ledger` · `claim-filter` · `rate-limit-helpers` · GSAP client-only/reduced-motion tests if the motion islands land here |
| 2 | per-section vitest · hero 2-3 line/static-class contract · dense-grid span math · GSAP paradigm tests · `rg "Win More Bids\|PRECISION_TO_WIN"` = 0 · header/footer tests |
| 3 | `auth-*` vitest + 7 `e2e/auth-*` specs · `auth-redirects-sanitize` (fresh) · `contact-action-validation` |
| 4 | `bun run test:claims` green · `no-peso-literals` · sitemap/robots/metadata on all routes |
| 5 | `auth-honeypot` + `auth-rate-limit` + `moat-component-reused` e2e · honeypot enforced in `actions.ts` |
| 6 | claims gate green + signed in `LOOP_LEDGER` · `perf:lighthouse` · glass-arming + blur-cap e2e · visual baselines |
| 7 | canonical routes serve new tree · `/legacy` rollback live · redirects resolve |
| 8 | `rg "#aa412a" src/` = 0 · honesty violations gone · `git diff --check` |

**Final (before declaring done):** `bun run type-check` + `bun run build` (Next 16/Turbopack) +
`bun run test:claims` + targeted vitest sweeps + doc-24 `$gpt-taste` static checks +
`rg "#aa412a|#7F7F7F|Win More Bids|PRECISION_TO_WIN|SECTION [0-9]|QUESTION [0-9]|ABOUT US" src/` = 0 +
cross-link integrity grep (doc 10 §4) + `git diff --check`. **Report honestly (D-5):** done vs
in-progress vs owner-gated, with evidence commands, not assertions.

---

## 13. Definition of Done (honest, D-5)

The redesign is **implemented** when:

1. All 8 routes + auth render as one Glass-Brand system; `/newdesign` mirrors canonical; `/legacy`
   rollback exists.
2. The commercial-graph plate renders data-driven + collapses; the claims ledger renders + filters;
   both use the single `ClaimStatus` type.
3. D-3 enforced (`rg "#aa412a" src/` = 0); honesty rail enforced (no fabricated proof); banned hero
   copy gone.
4. RSC-first: hero H1 server-rendered (LCP); ≤ the enumerated hydrating leaves; initial JS within budget.
5. `$gpt-taste` visual gate passes: `<design_plan>` present, AIDA visible, 2-3 line hero contract,
   exactly two hero CTAs, dense bento/grid proof, real GSAP/ScrollTrigger with reduced-motion
   fallback, component arsenal present, label sweep clean, and no horizontal overflow.
6. Claims CI gate green against the Feature Inventory; sign-off recorded in `LOOP_LEDGER.md`.
7. All Phase verification gates pass with evidence.
8. Every owner gate (§10) is either resolved by Philip or explicitly carried — none silently closed.

**"100% with 0 errors" is the target, honored through D-5:** the build is verifiably complete on every
axis that code can close; the residual is the owner-gate set, carried openly. Do not claim done on
an axis you did not verify.

---

## 14. Doc reference index (which planning doc answers what)

| Question | Doc |
|---|---|
| Why Glass Brand? Why not paper/serif? | `01-DESIGN-DIRECTION.md` |
| Section order / DOM / funnel / mobile compression | `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` |
| Exact token values + type scale + glass application | `03-VISUAL-LANGUAGE-AND-TOKENS.md` |
| The commercial-graph plate spec (nodes, edges, data model) | `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` |
| Voice-locked copy per route/section | `05-COPY-SKELETON.md` |
| Claims matrix, `<ClaimsLedger>`, §15 rail, `/trust` content | `06-PROOF-AND-CLAIMS-DISCIPLINE.md` |
| RSC-first, responsive floor, glass perf, funnel co-deps | `07-ENGINEERING-CONSTRAINTS.md` |
| `/newdesign` preview, A/B, claims sign-off, analytics events | `08-ROLLOUT-AND-ANALYTICS.md` |
| Public claims-sign-off gate | `09-CLAIMS-LEDGER-SIGN-OFF.md` |
| Canonical filenames / cross-links | `10-CANONICAL-DOC-MAP.md` |
| Component inventory, props, nav/header/footer anatomy | `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` |
| WCAG 2.1 AA audit + test plan | `12-ACCESSIBILITY-AUDIT.md` |
| Keywords, meta, sitemap, robots, structured data, noindex | `13-SEO-AND-DISCOVERY.md` |
| CWV targets, methodology, glass perf, CI gate | `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` |
| Form-spam defense, Postgres rate-limit, honeypot, CAPTCHA | `15-FORMS-AND-ABUSE-GUARDRAILS.md` |
| Unit/component/e2e/visual/a11y/perf/claims test plan | `16-TEST-AND-VERIFICATION-PLAN.md` |
| Event schema, tool decision, consent, retention, moat metric | `17-ANALYTICS-AND-OBSERVABILITY.md` |
| Locale strategy (EN-only), hreflang, sitemap localization | `18-I18N-AND-LOCALIZATION.md` |
| Favicons, OG images, founder photo, wordmark, asset pipeline | `19-ASSET-PIPELINE-AND-IMAGERY.md` |
| Who writes/reviews/signs off, where copy lives | `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` |
| File-level change inventory, deletion rail, migration order, rollback | `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` |
| Intercom/Amigo/dashboard DNA extraction (evidence) | `22-PEG-STUDY-DEEP-DIVE.md` |
| Full-page 2-col auth surface (D-2) | `23-AUTH-EXPERIENCE.md` |
| `$gpt-taste` visual execution overlay | `24-GPT-TASTE-EXECUTION-CONTRACT.md` |
| Honest scorecard + per-doc gaps | `MASTER-AUDIT-AND-SCORECARD.md` |
| Open decisions / owner-decision queue | `LOOP_LEDGER.md` |

---

## 15. Execution realism (honest note to the implementing agent)

This is a **multi-session program with a smaller minimum shippable slice**. The full plan can grow
large if every preview, A/B, analytics, i18n, OG, deletion, and automation lane ships at once, but
the first implementation branch should stay narrower: Phase 0 facts, route shell, core homepage,
auth/contact safety wrappers, and targeted verification. The realistic cadence: **Phase 0 first
(solo, verify, unlock)**; then Phases 1-5 in parallel lanes; then the
gate/cutover phases (6-8) which are owner-blocked. Do not attempt to "finish in one pass" — execute
phase-by-phase, run each verification gate, and report honestly. The plan is engineered so that
**every phase leaves the repo in a buildable, type-checking state** (additive tokens, new files,
scoped edits) — no phase should leave `bun run build` red.

When you hit an owner gate (§10), build the safe default, record the carry in `LOOP_LEDGER.md`, and
move on. The redesign's integrity rests on **never faking a gate closed** (D-5) — that is the one
rule more important than speed.

**Begin at Phase 0.**
