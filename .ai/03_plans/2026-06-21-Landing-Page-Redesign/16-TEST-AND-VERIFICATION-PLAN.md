# 16 — Test & Verification Plan

> **STATUS: PLANNING ONLY · 2026-06-22 · not code.**
> **Bindings:** ratified keystone decisions D-1 (Glass Brand) · D-2 (full-page 2-col auth, no
> password) · D-3 (orange token discipline) · D-4 (single `ClaimStatus` type) · D-5 (honest scoring).
> **Purpose:** Own the test plan for the landing redesign — unit, component, e2e, **visual (Playwright
> screenshot-diff, NOT Chromatic)**, a11y, perf, claims — mapped to every claim, every component,
> every route, and every gate in the pack. This doc is the verification contract; it closes the gap
> between "the docs say X" and "the implementation proves X."

This doc owns **verification**. It does not own the components (→ `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`),
the a11y rules (→ `12-ACCESSIBILITY-AUDIT.md`), the perf targets (→ `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`),
the auth wiring (→ `23-AUTH-EXPERIENCE.md`), or the claims matrix (→ `06-PROOF-AND-CLAIMS-DISCIPLINE.md`).
It defines the tests that prove those docs' claims hold in code.

---

## 0. Current-state test stack (verified, not assumed)

Recon against the live repo on 2026-06-22 (these are the real scripts/configs, not the idealized set
the prior draft assumed):

| Concern | Reality (verified) | Implication for this plan |
|---|---|---|
| Unit runner | `bun test tests/unit` (`package.json:21` `"test"`) | **Reuse.** Landing pure-logic modules land in `tests/unit/`. |
| DOM/component runner | `vitest run --maxWorkers=1` (`package.json:22` `"test:dom"`); existing landing component tests already live at `tests/vitest/landing-*.test.tsx` | **Reuse.** Landing component tests land in `tests/vitest/` alongside the existing ones. |
| E2E runner | `playwright test` (`package.json:24` `"test:e2e"`); config at `playwright.config.ts`; existing specs at `e2e/*.spec.ts` incl. `auth.spec.ts` and `landing-audit.spec.ts` | **Reuse + extend.** New landing + auth e2e specs land in `e2e/`. |
| Perf e2e | `playwright test e2e/route-transition-performance.spec.ts` (`package.json:25` `"test:e2e:perf"`); budget file `e2e/route-transition-performance-budgets.json` | **Reuse the Playwright-perf lane.** LHCI is *planned, not yet wired* (no `lighthouserc.*` on disk — L-ENG-2). |
| Lighthouse CI (LHCI) | **ABSENT** — no `lighthouserc.*`, no `@lhci/cli` dep | ⚠️ **GATED (L-ENG-2)** — the plan specifies the config file path + budget JSON to add; until LHCI is wired, the lab-perf gate runs via `test:e2e:perf` + a manual Lighthouse run. |
| Bundle analyzer | `@next/bundle-analyzer@16.2.6` is a devDep (`package.json:93`); **no `"analyze"` script** | ⚠️ **GATED (L-ENG-3)** — the plan specifies the budget file + the script to add. |
| a11y automation | `axe-core` / `@axe-core/playwright` presence not verified as a dep today | ⚠️ **VERIFY at implementation** (L-A11Y-2) — add if absent; the plan names the assertion style either way. |
| Claims scripts | `scripts/claims-matrix-check.mjs` + `scripts/claims-forbidden-sweep.mjs` are **OPEN dependencies** (do not exist) | ⚠️ **GATED (L-CLM-1, L-CLM-2)** — the `test:claims` CI job is **honestly conditional** on them existing (§9.3); until then the sign-off gate runs the reconciliation manually per `09-CLAIMS-LEDGER-SIGN-OFF.md` §3.2. |
| Visual regression | No Chromatic, no Playwright screenshot-diff baseline today | This doc specifies the **Playwright screenshot-diff strategy** (§6) because Chromatic is unreliable for `backdrop-filter`. ⚠️ **GATED (L-VIS-1)** — baseline capture is an implementation task. |
| `StatusPill` source | `src/components/landing/shared/StatusPill.tsx` is the D-4 single-source component (does not yet exist on disk — it is the redesign's deliverable) | Component + claims tests import from this path; the path is the contract. |
| `LiquidGlassReady` | `src/components/system/LiquidGlassReady.tsx` exists; mounts in `src/app/layout.tsx:40`; arms `<html data-glass="ready">` | The deferred-glass arming test (§6.2) targets this real component. |
| Auth source (D-2) | `src/app/login/page.tsx` (full-page RSC); `src/lib/auth/actions.ts` (`signInWithEmail` w/ `shouldCreateUser:true`, `signInWithGoogle`); `src/app/auth/callback/route.ts`; `src/lib/auth/closed-beta-access.ts`; `src/lib/auth/error-mapping.ts`; `src/lib/auth/redirects.ts` | All auth-flow e2e (§5) targets these real paths. No `/signup`, no `src/components/auth/`, no middleware today (per `23-AUTH-EXPERIENCE.md` §0). |

**Net:** the plan reuses `bun test`, `vitest`, and `playwright` verbatim; it **adds** the LHCI config,
the bundle-analyzer script + budget, the two claims scripts, and the Playwright screenshot-diff
baseline. Each addition is a **named gate** (§12), never silently assumed.

---

## 1. The verification thesis

The landing redesign carries **load-bearing claims** (the matrix in `06-PROOF-AND-CLAIMS-DISCIPLINE.md`),
an **honesty posture** (no fabricated logos/stats/testimonials/badges/prices — `06` §15), an **a11y
contract** (WCAG 2.1 AA, `12-ACCESSIBILITY-AUDIT.md`), a **perf budget** (`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`),
and an **auth contract** (`23-AUTH-EXPERIENCE.md`, D-2). Verification is not optional ceremony — it is
the evidence the claims sign-off gate (`09-CLAIMS-LEDGER-SIGN-OFF.md`) reconciles against. A claim
that ships without a test is a claim that can drift silently. This doc defines the test surface so
no claim, no component, no route, no auth flow ships unverified.

---

## 2. The 7-layer test model

| Layer | Tool (verified or GATED per §0) | Scope | Gate |
|---|---|---|---|
| **Unit** | `bun test` (Vitest-compatible) | Pure-logic modules: the claims-matrix parser, the plate data model, the rate-limit helpers, the consent parser, the A/B variant assigner, the form/honeypot validators, the `ClaimStatus` narrowing helpers (D-4). | 100 % of pure-logic modules; CI fails on regression. |
| **Component** | `vitest run` (`test:dom`) + Testing Library | Every component in `11-COMPONENT-INVENTORY` §2 + every auth leaf in `23-AUTH-EXPERIENCE.md` §4: renders, props, interactive leaves, `aria-live` regions, `autocomplete`, honeypot. | Every component has a test file; CI fails on regression. |
| **E2E** | `playwright test` (`test:e2e`) | Every route renders end-to-end; CTAs route correctly; the `/contact` form submits; A/B assigns; **auth flows** (§5); the **moat-metric proof** (§5.4). | One e2e test per route + per critical path. |
| **Visual** | **Playwright screenshot-diff at fixed viewport + armed glass** (§6) — **NOT Chromatic** | Every glass surface + the commercial-graph plate + the auth 2-col → 1-col collapse. | **GATE** (not optional): a pixel-diff over a defined threshold blocks merge (§6.1). |
| **Accessibility** | `axe-core` (component) + `@axe-core/playwright` (e2e) + **manual SR pass** | The `12-ACCESSIBILITY-AUDIT` rules: contrast, keyboard, semantics, motion, forms, SR paths, the `#7F7F7F` rail, the body-text ≥ 14px floor, text-on-glass AA (worst-case backdrop). | Zero axe violations; the manual SR pass is the unautomatable gate (§7). |
| **Performance** | `test:e2e:perf` (Playwright) + **LHCI (GATED L-ENG-2)** + CrUX (field) | The `14-PERFORMANCE-AND-CORE-WEB-VITALS` targets: LCP < 2.5s lab (< 2.0s field), CLS < 0.1, TBT < 300ms, INP < 200ms; bundle < 60KB gz per marketing route; **≤ 4 simultaneous glass-blur panels** (§8). | Lab + field within thresholds; bundle within budget; blur cap enforced. |
| **Claims** | `scripts/claims-forbidden-sweep.mjs` + `scripts/claims-matrix-check.mjs` (**GATED L-CLM-1/2**) | The `06-PROOF` matrix reconciles to the Feature Inventory snapshot; no forbidden string ships; no peso number on `/pricing`. | The sign-off gate (`09`) blocks release on any drift or any forbidden hit. |

---

## 3. Unit tests (`tests/unit/`)

| Module | Test file | What it proves |
|---|---|---|
| Claims-matrix parser (parses `06-PROOF` §3 into `ClaimRowData[]`) | `tests/unit/claims-matrix-parser.test.ts` | Every row has a valid `ClaimStatus` (D-4: `"Live" \| "Building" \| "Planned" \| "NotUs"`); every source is a real § ref; the taxonomy is exhaustive. |
| Plate data model (parses `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE` §3 + §4.8 into `PlateNode[]`) | `tests/unit/plate-data-model.test.ts` | Every node's status matches the matrix; every node status is in the **plate subset** (`Live \| Building \| Planned` — no `NotUs`); every edge maps to a real §8.3 relationship; the collapse logic produces a legible vertical stack at ≤414px. |
| Rate-limit helpers (composite-key, Retry-After; Postgres `rate_limit` table, NOT Redis) | `tests/unit/rate-limit-helpers.test.ts` | The IP/email/global caps hold; the composite key is correct; `Retry-After` is computed correctly. |
| Consent parser (existing `parseLandingConsentValue`) | (existing tests, regression-only) | The three-tier consent state parses correctly. |
| A/B variant assigner (existing `getVariant`) | (existing tests, regression-only) | Assignment is stable per-visitor; consent-gated. |
| Honeypot + input validation (the `/contact` + `/signup` server actions) | `tests/unit/contact-action-validation.test.ts` | Every field's validation rule (`15-FORMS-AND-ABUSE-GUARDRAILS.md` §2.4) holds; the honeypot triggers a silent drop; invalid input returns field-level errors. |
| `ClaimStatus` narrowing helper (D-4) | `tests/unit/claim-status-narrowing.test.ts` | The plate narrows `"Live" \| "Building" \| "Planned"` from the full `"Live" \| "Building" \| "Planned" \| "NotUs"` type at the call site; no divergent type definition leaks (grep contract — D-4). |
| `next=` sanitization (`sanitizeNextPath`) | (existing `tests/unit/auth-redirects*` — regression) | Open-redirect payloads (`//evil.com`, `javascript:`, callback self-reference, control chars, multi-pass-encoded) are rejected. |

---

## 4. Component tests (`tests/vitest/`)

Every component in `11-COMPONENT-INVENTORY` §2 + every auth leaf in `23-AUTH-EXPERIENCE.md` §4 has a
Vitest + Testing Library test. Existing `tests/vitest/landing-*.test.tsx` files are extended, not
duplicated.

| Component | Test file | What it proves |
|---|---|---|
| `LandingShellClient` | `tests/vitest/landing-shell-client.test.tsx` | Renders children; mounts the ScrollReveal driver; fires `route_view` on mount. |
| `LandingHeader` | `tests/vitest/landing-header.test.tsx` | Renders the wordmark + nav + CTAs; the `/signup` href is correct (or marked GATED per L-FUN-1/L-FUN-2 — routes to `/login` meanwhile); the hamburger toggles at ≤768px. |
| `LandingFooter` | `tests/vitest/landing-footer.test.tsx` | Renders the sitemap + tagline + honesty line; every link resolves. |
| `MaturityTag` | `tests/vitest/maturity-tag.test.tsx` | Renders "Pre-launch MVP preview" in `--secondary #5D5D5D` ink (never `#7F7F7F` — §7). |
| `HeroSection` | `tests/vitest/hero-section.test.tsx` | H1 uses `--font-display` (Doto); CTAs present; no banned hero copy (regression vs. `05-COPY-SKELETON.md` §10.4). |
| `ProblemSection` / `LayerSection` / `WhatYouGetSection` / `HowItWorksSection` / `WhoItIsForSection` / `WhyNotSpreadsheetSection` / `FounderSection` / `PricingPhilosophySection` / `FinalCtaSection` | one test each, sibling pattern | Each renders its `05-COPY-SKELETON.md` copy; no forbidden strings (the `06` §3.5 list). |
| `ArchitecturePlate` | `tests/vitest/architecture-plate.test.tsx` | Renders every node (L1/L2/L3/L4/B1/P1); every `StatusPill` is correct; the collapse produces a vertical stack at ≤414px; **consumes the D-4 `ClaimStatus` type narrowed to the Live/Building/Planned subset**. |
| `PlateCaption` | `tests/vitest/plate-caption.test.tsx` | Updates the caption on focus (not only hover); respects `prefers-reduced-motion`. |
| `ClaimsLedger` + `ClaimRow` | `tests/vitest/claims-ledger.test.tsx` | Renders the matrix; every row has a valid `ClaimStatus`; the `<StatusPill>` label is correct (not only color). |
| `ClaimFilter` | `tests/vitest/claim-filter.test.tsx` | Toggling filters hides/shows rows via CSS classes; keyboard-operable. |
| `StatusPill` (`src/components/landing/shared/StatusPill.tsx`, D-4) | `tests/vitest/status-pill.test.tsx` | Renders the status label (not only color); the redline mark appears on load-bearing rows; **exports the single `ClaimStatus` type** (D-4 contract). |
| `ScrollReveal` | `tests/vitest/scroll-reveal.test.tsx` | Mounts once; respects `prefers-reduced-motion` (instant show). |
| **`AuthLayout`** (`src/components/auth/AuthLayout.tsx`, D-2) | `tests/vitest/auth-layout.test.tsx` | Renders both columns at `lg:`; collapses the LEFT `AuthGlassPanel` at `<768px`; the panel is `aria-hidden="true"`; renders the error/success `aria-live` regions from `errorCode`/`sent`. |
| **`AuthGlassPanel`** (`src/components/auth/AuthGlassPanel.tsx`, D-2) | `tests/vitest/auth-glass-panel.test.tsx` | `aria-hidden="true"`; no child has `tabindex`; `variant="full" \| "compact"` renders the right composition; **no fake product screenshots / stock photos** in the DOM (radical-honesty assertion). |
| **`LoginForm`** / **`SignupForm`** (`src/components/auth/*.tsx`, D-2) | `tests/vitest/auth-forms.test.tsx` | Both carry `autocomplete="email"` on the field + the honeypot (`name="company_url"`, `aria-hidden`, `tabindex=-1`); both forms' `action` points at the real server actions (`signInWithEmail` / `signInWithGoogle`); the hidden `next` input is present on both the Google form and the email form. |
| **`GoogleButton`** / **`MagicLinkButton`** (`src/components/auth/*.tsx`) | (covered by `auth-forms.test.tsx`) | `GoogleButton` is a `type="submit"` inside the Google form (keyboard-reachable); `MagicLinkButton` uses `--brand-orange` fill (D-3 fill-allowed on primary CTA). |
| **`ClosedBetaGate`** (`src/components/auth/ClosedBetaGate.tsx`) | `tests/vitest/auth-closed-beta-gate.test.tsx` | Renders when self-serve is off (L-FUN-2); routes the email capture to `/contact?intent=beta-request`; the `AuthLayout` shell is identical across gate states. |

---

## 5. E2E tests (Playwright — `e2e/`)

One e2e test per route + per critical path. The suite runs against the preview build (`/newdesign`)
pre-cutover and the canonical routes post-cutover. Existing `e2e/auth.spec.ts` and
`e2e/landing-audit.spec.ts` are **extended**, not replaced.

### 5.1 Marketing routes

| Test | Route | What it proves |
|---|---|---|
| Homepage render | `/` (or `/newdesign`) | All 11 sections render in DOM order (`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`); the plate renders; the claims ledger renders; CTAs route to `/signup` + `/contact` (or `/login` while L-FUN-2 unresolved). |
| Features render | `/features` | The expanded ledger renders; every status group present. |
| Pricing render | `/pricing` | The philosophy block + cement-anchor CONCEPT render; **no peso number anywhere on the page** (the `06` §15 regression gate — the forbidden-list sweep, §9.1). |
| About render | `/about` | The founder paragraph renders; the one-liner is gated correctly (L-FND-1). |
| Contact form submit | `/contact` | The form accepts valid input; rejects invalid input; submits successfully; the honeypot drops bot input silently. |
| Trust render | `/trust` | The full ledger + privacy block + security-as-shipped + limitations render. |
| CTA routing | every route | `Start free` routes to `/signup` (or `/login` while gated); `Book a walkthrough` routes to `/contact`. |
| A/B assignment | `/` | The `landing-redesign-2026-06` experiment assigns a variant; the assignment is stable per-visitor via the cookie. |
| Mobile render (320 / 375 / 414 / 768) | every route | No horizontal scroll; no clipped content; the plate collapses to a vertical stack. |
| Keyboard traversal | every route | Full `<Tab>` cycle; no keyboard traps; the skip-to-content link works. |
| Reduced-motion | every route | Reveals are instant under `prefers-reduced-motion`. |

### 5.2 Auth-flow e2e (NEW — closes gap 1)

D-2 makes auth a first-class surface; its flows get dedicated e2e specs. All target the **real**
server actions / callback / RPC (verified in `23-AUTH-EXPERIENCE.md` §0), with the OTP/OAuth legs
**mocked at the Supabase boundary** (the test never sends a real email or hits Google).

| Test | Spec | What it proves |
|---|---|---|
| Magic-link submit → activation → `/workshop` | `e2e/auth-magic-link.spec.ts` | (1) `/login` renders the 2-col `AuthLayout`; (2) submitting the email form invokes `signInWithEmail` (mocked) and the browser lands on `/login?sent=1` with the `aria-live` "Check your email" banner; (3) the test simulates the user opening the email on the same device by visiting the mocked OTP link → `/auth/callback?code=<mock>`; (4) `exchangeCodeForSession` (mocked) succeeds, the closed-beta RPC (mocked, `allowed:true`) admits, and the user lands on `/workshop`; (5) `next=/workshop/x` round-trips end-to-end through `sanitizeNextPath`. |
| Magic-link closed-beta DENIAL | `e2e/auth-magic-link.spec.ts` (second test) | Same as above but the mocked `check_closed_beta_access` returns `allowed:false`; the callback signs the user out and redirects to `/beta/access-required`. Proves the fail-closed path (§6 of `23-AUTH-EXPERIENCE.md`). |
| `/signup` gated path | `e2e/auth-signup-gated.spec.ts` | With `CLOSED_BETA_ACCESS_ENABLED=true` and self-serve OFF (L-FUN-2 unresolved — the current beta reality), `/signup` renders the `ClosedBetaGate` variant: the email capture routes to `/contact?intent=beta-request`, **not** to `signInWithOtp`. Proves the gate is a content variant, not a layout change — the LEFT `AuthGlassPanel` is byte-identical to `/login`. |
| `/signup` self-serve ON (forward path) | `e2e/auth-signup-self-serve.spec.ts` | With self-serve ON (L-FUN-2 resolved "on"), `/signup` renders the real `SignupForm`; submitting it invokes `signInWithEmail` with `shouldCreateUser:true` (the magic link **is** the signup) and the new email lands on `/workshop`. ⚠️ GATED on L-FUN-2 — this spec is skipped/`.skip` until self-serve is enabled. |
| Google-OAuth callback | `e2e/auth-google-oauth.spec.ts` | (1) `GoogleButton` is a `type="submit"` in a `<form action={signInWithGoogle}>`; (2) the action returns a Google URL (mocked) with `prompt:"select_account"`; (3) the test simulates the Google return → `/auth/callback?code=<mock>`; (4) the closed-beta check runs; (5) the user lands on `/workshop` (or `/beta/access-required`). Proves the OAuth leg is keyboard-reachable (no popup script). |
| Error rendering | `e2e/auth-error-codes.spec.ts` | Each of the 6 public codes in `AUTH_ERROR_CODES` (`src/lib/auth/error-mapping.ts`) renders correctly from `?error=<code>` in the `aria-live="polite"` region; no raw Supabase message ever reaches the DOM. |
| Auth 2-col → 1-col collapse | `e2e/auth-responsive.spec.ts` | At ≥1024px both columns render; at 768–1023px the panel narrows; at `<768px` the panel collapses to the compact brand header and the fields go single-column with **no layout shift on the fields column**. |
| Auth `noindex,nofollow` | `e2e/auth-seo.spec.ts` | Both `/login` and `/signup` render `<meta name="robots" content="noindex,nofollow">` + a self-referential `canonical`; neither appears in the sitemap (cross-link `13-SEO-AND-DISCOVERY.md`). |

### 5.3 Auth abuse guardrails (cross-link `15-FORMS-AND-ABUSE-GUARDRAILS.md`)

| Test | Spec | What it proves |
|---|---|---|
| Honeypot drop | `e2e/auth-honeypot.spec.ts` | A submission with the hidden `company_url` field populated is silently rejected (server action returns the error-shape without invoking `signInWithOtp`). |
| Rate-limit (Postgres, NOT Redis) | `e2e/auth-rate-limit.spec.ts` | N+1 rapid `signInWithEmail` calls from one IP/email exceed the `rate_limit` table cap and receive a `Retry-After` 429-style response. Proves the limit covers the new `/signup` path (same actions). |

### 5.4 Moat-metric e2e proof (NEW — closes gap 1)

The landing claims "every estimate becomes reusable commercial knowledge." The moat-metric
instrumentation (`17-ANALYTICS-AND-OBSERVABILITY.md`) fires `component_reused` the first time an
estimate reuses a library component. This test **proves the event actually fires end-to-end**, so the
claim is not aspirational.

| Test | Spec | What it proves |
|---|---|---|
| First-estimate-reuses-component → `component_reused` | `e2e/moat-component-reused.spec.ts` | (1) An authenticated beta user creates a fresh estimate; (2) drags/inserts a node that reuses an existing **Component Library** entry (the L2 Live node in the commercial graph); (3) the test asserts the analytics layer receives a `component_reused` event with the right props (`{ estimate_id, component_id, source: "library" }`) — captured via the test analytics sink; (4) the event fires **exactly once** for the first reuse (not on every keystroke). ⚠️ This spec requires a seeded library component + a real DnD interaction — it is the heaviest e2e in the suite and may need a dedicated Playwright project (separate worker, longer timeout). |

---

## 6. Visual tests (Playwright screenshot-diff — NOT Chromatic)

### 6.1 Why Playwright, not Chromatic (closes gap 2)

**Chromatic is unreliable for `backdrop-filter`.** The Glass Brand (D-1) is *built* on
`backdrop-filter: blur(var(--glass-blur-amount))` — `.dashboard-glass`, `.dashboard-glass-warm`,
`.workshop-workspace-glass-surface` (`globals.css:1229`, `:1753`, `:1261`). Chromatic renders in a
headless Chromium that rasterizes `backdrop-filter` differently from real browser compositors, so
the same panel produces **non-deterministic pixel diffs run-to-run** — a flaky visual gate that
erodes trust. The same problem hits any cloud-VM screenshot service.

**The strategy:** a **Playwright screenshot-diff at a fixed viewport with the glass ARMED**, run on
the developer's local browser (or a CI runner with a real GPU/compositor). Concretely:

- **Fixed viewport:** `1280×800` (desktop) and `390×844` (iPhone-14-class mobile proxy for the
  320/375/414 mobile lanes) — exact dimensions pinned so the diff baseline is stable.
- **Armed glass:** the test **waits for `<html data-glass="ready">`** before capturing, so the
  `--glass-blur-amount` is at its final `var(--glass-blur)` (`globals.css:296`) and the panel is not
  mid-ramp. See §6.2 for the arming test.
- **Threshold:** a per-screenshot max pixel-diff ratio (start: **0.1%** of the viewport area,
  tunable). A diff over the threshold **blocks merge** — visual regression is a **GATE**, not
  optional.
- **Baselines:** committed to repo under `e2e/visual/__screenshots__/`. The first run on a new
  component captures the baseline; subsequent runs diff against it. `--update-epochs` (or the
  Playwright `--update-snapshots`) refreshes a baseline only after human review of the diff.
- **Surfaces captured:** (1) the sticky header, (2) the hero brand panel, (3) the commercial-graph
  plate (default + a hovered node), (4) the claims ledger (default + a filtered state), (5) the
  `/login` 2-col `AuthLayout`, (6) the `/signup` 2-col `AuthLayout`, (7) the auth 1-col collapse at
  `<768px`.

### 6.2 Deferred-glass arming test (NEW — closes gap 4)

The deferred-glass technique (D-1, BRAND VOCABULARY CARD, `03-VISUAL-LANGUAGE-AND-TOKENS.md` §4.3)
is load-bearing for perf AND for the visual gate above. A dedicated test asserts the arming contract
holds:

| Test | Spec | What it proves |
|---|---|---|
| Arming sequence | `e2e/glass-arming.spec.ts` | (1) On first paint, `getComputedStyle(document.documentElement).getPropertyValue('--glass-blur-amount')` is `0px` and `document.documentElement.dataset.glass !== 'ready'`; (2) the test waits for the double-rAF + `requestIdleCallback` (or the hard 1500ms backstop in `LiquidGlassReady.tsx:56`) and asserts `document.documentElement.dataset.glass === 'ready'` and `--glass-blur-amount` flips to `18px` (the `var(--glass-blur)` value); (3) under `prefers-reduced-motion: reduce`, the ramp does not animate (`transition: none`) but the blur **still applies** once armed (`globals.css:309-313`); (4) under `prefers-reduced-transparency: reduce`, the surface falls back to the opaque `--glass-bg-fallback #fbfbfc` (the test asserts no live `backdrop-filter`). |
| ≤4-blur cap | `e2e/glass-blur-cap.spec.ts` | Counts elements with a computed `backdrop-filter: blur(...)` resolving to a non-zero amount on the initial desktop viewport (≥1024px, `pointer:fine`) and asserts the count is **≤ 4**. This is the §4.4 cap of `03-VISUAL-LANGUAGE-AND-TOKENS.md` and the `14` perf budget, enforced at the e2e layer. |

### 6.3 What visual regression also guards (cross-cutting asserts)

Bolted onto the same Playwright run, cheap because the page is already loaded:

- **No missing background** (the `bg-[var(--x)]` Tailwind v4 gotcha — `03` §3.3): assert no element
  matching the landing selectors has a transparent/initial `background-color` where a token was
  expected (catches the silent no-color emission).
- **Radius ramp** (`03` §3.7): assert no element on the landing has a computed `border-radius`
  outside `{3px, 8px, 12px}` (within a tolerance).
- **Orange discipline (D-3):** assert no element has a computed `color` of `#F24405` on a `font-size
  < 24px` (AA-fail on small text); assert **zero elements** reference `#AA412A` / clay anywhere in
  the computed styles (D-3 grep contract, enforced at runtime).
- **Body-text floor:** assert no load-bearing text on the landing is `< 14px` (the landing floor;
  the 12px app floor does NOT apply — `03` §3.4).

---

## 7. Accessibility tests

Per `12-ACCESSIBILITY-AUDIT.md` §8:

| Layer | Tool | Scope |
|---|---|---|
| Automated contrast + semantics | `axe-core` (component, via `vitest`) + `@axe-core/playwright` (e2e) | Every component + every route + both auth routes. |
| Keyboard | Manual + e2e (`e2e/auth-keyboard.spec.ts` + the §5.1 keyboard-traversal test) | Every interactive element per `12` §3.2; the auth tab order (Google → email → submit → legal → cross-link) is linear and trap-free. |
| Screen-reader | **Manual: NVDA + VoiceOver + TalkBack** | The 6 critical paths in `12` §7, PLUS the two auth paths (magic-link submit + "Check your email" announcement; Google-OAuth submit). |
| Reduced-motion | Manual + e2e (`e2e/glass-arming.spec.ts` §6.2) | Every animated surface. |
| Responsive a11y | Manual at 320 / 375 / 414 / 768 | Every route + both auth routes (2-col → 1-col). |

**The manual SR pass is the gate the automated tests cannot replace;** it is performed before the
cutover sign-off (`09-CLAIMS-LEDGER-SIGN-OFF.md`). Per README gate #4, it is carried as L-A11Y-1
(verify-item) and never silently marked done.

---

## 8. Performance tests

Per `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` §3:

| Layer | Tool | Scope | Gate |
|---|---|---|---|
| **Lab (Playwright-perf)** | `bun run test:e2e:perf` (existing; `package.json:25`) + the existing `e2e/route-transition-performance-budgets.json` | Every PR affecting landing files; the hero route + `/login` + `/signup`. | LCP < 2.5 s; CLS < 0.1; TBT < 300 ms. |
| **Lab (Lighthouse CI — GATED L-ENG-2)** | `@lhci/cli` in GitHub Actions, config at **`lighthouserc.json`** (repo root, to add), budget at **`lighthouse/budgets.json`** (to add) | Every PR affecting landing files. | Same thresholds, measured at the Moto G Power class emulated device. |
| **Bundle (GATED L-ENG-3)** | `@next/bundle-analyzer` (devDep present, `package.json:93`); add an `"analyze"` script (`package.json`) + budget at **`next.bundle-budget.json`** (to add) | Every PR. | Initial JS < 60 KB gzipped per marketing route; **auth routes < 40 KB gz** (only the form leaves hydrate — `23` §8). |
| **Blur cap** | `e2e/glass-blur-cap.spec.ts` (§6.2) | Every PR affecting a glass surface. | ≤ 4 simultaneous live-blur panels. |
| **Field (CrUX + Vercel)** | PageSpeed Insights + Vercel Speed Insights | Continuous post-cutover. | Field LCP < 2.0 s at the PH + SEA device class. |

### 8.1 LHCI config + budget (closes gap 3)

The plan specifies the two files to add (both GATED L-ENG-2 — they do not exist yet):

- **`lighthouserc.json`** (repo root): `ci.collect.url` = the preview route (`/newdesign`) + the
  canonical routes; `ci.collect.numberOfRuns = 5`; `ci.collect.settings.preset = "desktop"` AND a
  second pass with `formFactor: "mobile"` + `emulatedDevice` = Moto G Power (the `14` target device);
  `ci.assert.assertions` = the LCP/CLS/TBT/TB thresholds above at `warn`/`error`; `ci.upload.target =
  'filesystem'` (no external LHCI server required for MVP).
- **`lighthouse/budgets.json`**: a Lighthouse `resource-budgets` block — first-party JS, total image
  bytes (the landing targets **zero image bytes** except the Google "G" mark + the founder photo on
  `/about`), font bytes (the landing adds **zero** font requests — Doto/Roboto Mono already loaded),
  third-party JS.

The `bun run test:lighthouse` CI job (§10) is **honestly conditional**: until `lighthouserc.json`
exists, the job is a no-op gate that prints "LHCI not configured (L-ENG-2 open)" and passes; once
configured, it fails on any threshold breach.

### 8.2 Bundle-analyzer budget (closes gap 3)

- Add **`"analyze": "ANALYZE=true next build"`** to `package.json` scripts (the `@next/bundle-analyzer`
  convention), gated L-ENG-3.
- Add **`next.bundle-budget.json`** with per-route first-load JS ceilings (marketing < 60KB gz; auth
  < 40KB gz). The CI `analyze` job (§10) parses the analyzer output and fails on an overshoot.
- Until the script + budget exist, the job is honestly conditional (§10).

---

## 9. Claims tests (the §15 regression gate)

Two automated checks feed the sign-off gate (`09-CLAIMS-LEDGER-SIGN-OFF.md`).

### 9.1 The forbidden-list sweep — `scripts/claims-forbidden-sweep.mjs` (GATED L-CLM-1)

Parses the rendered HTML (or the copy in `05-COPY-SKELETON.md` pre-render) and fails on any hit in
the `06` §3.5 forbidden list (fabricated logos/stats/testimonials/badges/prices; "the only…";
"Start Winning / Win More Bids"; aggregator/database-of-estimates language; peso numbers on
`/pricing`; AI-as-current). **Open dependency: the script itself** — tracked as **L-CLM-1**. Until
the script exists, the sweep is a manual checklist item in the sign-off procedure (`09` §3.2).

### 9.2 The matrix reconciliation — `scripts/claims-matrix-check.mjs` (GATED L-CLM-2)

Parses `06-PROOF` §3 (the `ClaimRowData[]` source-of-truth) and diffs against the **Feature Inventory
snapshot** fixture (§9.4) checked in at sign-off time. **Open dependencies: the script + the
Inventory snapshot pipeline** — tracked as **L-CLM-2**. Until both exist, the reconciliation is
manual.

### 9.3 The CI job is honestly conditional (closes gap 3)

The `test:claims` CI job (§10) runs:

```bash
# Honest conditional: pass-through if the scripts don't exist yet (gate OPEN),
# fail loudly if they exist and a claim drifts / a forbidden string ships.
if [ -f scripts/claims-matrix-check.mjs ] && [ -f scripts/claims-forbidden-sweep.mjs ]; then
  bun run test:claims
else
  echo "::warning::Claims scripts absent (L-CLM-1/L-CLM-2 OPEN); sign-off is manual per 09 §3.2."
  # Non-blocking exit; the manual checklist in 09 is the gate until the scripts land.
  exit 0
fi
```

This is deliberate: the plan does not pretend a gate is enforced when the script that enforces it
does not exist (D-5). The **manual** sign-off checklist in `09-CLAIMS-LEDGER-SIGN-OFF.md` §3.2 is
the binding gate until L-CLM-1/L-CLM-2 close.

### 9.4 Feature Inventory snapshot fixture (closes gap 4)

The matrix reconciliation needs a stable "what features actually ship today" snapshot to diff the
claims against. The fixture lives at **`tests/fixtures/feature-inventory-snapshot.json`** and is
regenerated at sign-off time (a script enumerates the live landing + app routes and emits the
`{ feature, status: "Live"|"Building"|"Planned", route, component }` rows). Until the generator
script exists (folded into L-CLM-2), the snapshot is hand-authored at each sign-off and committed;
the reconciliation test then diffs `06` §3 against this committed snapshot. The fixture is the
contract between "the docs claim X" and "the code ships X."

---

## 10. The CI shape (closes gap 3)

```
on: pull_request (affecting src/components/landing/, src/components/auth/,
                   src/app/<route>/page.tsx, src/app/globals.css, src/app/layout.tsx,
                   .ai/03_plans/2026-06-21-Landing-Page-Redesign/)

jobs:
  unit:        bun run test                       # EXISTING (package.json:21) — pure-logic modules
  component:   bun run test:dom                   # EXISTING (package.json:22) — vitest, landing + auth leaves
  e2e:         bun run test:e2e                   # EXISTING (package.json:24) — incl. §5 auth flows + moat proof
  perf-e2e:    bun run test:e2e:perf              # EXISTING (package.json:25) — Playwright-perf lane
  visual:      bun run test:e2e -- --grep=@visual # NEW PROJECT TAG — screenshot-diff (§6), GATE not optional
  a11y:        bun run test:e2e -- --grep=@a11y   # @axe-core/playwright (GATED L-A11Y-2 if axe dep absent)
  lighthouse:  bun run test:lighthouse            # GATED L-ENG-2 — honestly conditional on lighthouserc.json
  bundle:      bun run analyze                    # GATED L-ENG-3 — honestly conditional on analyze script + budget
  claims:      (conditional block — §9.3)         # GATED L-CLM-1/L-CLM-2 — honestly conditional on the scripts
```

**Gate discipline:**

- `unit` / `component` / `e2e` / `perf-e2e` / `visual` are **hard gates** — a failure blocks merge.
- `lighthouse` / `bundle` / `claims` are **honestly conditional** (§9.3 pattern): until their config
  or script lands, the job is a documented no-op that warns and passes; once it lands, the job
  becomes a hard gate. The warning text names the L-* ID so the open gate is visible on every PR.
- `a11y` automation is a hard gate **if** `axe-core`/`@axe-core/playwright` are deps (verify
  L-A11Y-2); either way, the **manual SR pass** (§7) is the unautomatable sign-off gate.
- The **manual SR pass** is performed before cutover and recorded in `09-CLAIMS-LEDGER-SIGN-OFF.md`.

---

## 11. Cross-links (all canonical filenames per `10-CANONICAL-DOC-MAP.md`)

- `06-PROOF-AND-CLAIMS-DISCIPLINE.md` — the matrix + the §3.5 forbidden list the claims tests
  reconcile against (§9).
- `09-CLAIMS-LEDGER-SIGN-OFF.md` — the sign-off gate the test results feed; the manual checklist that
  is binding while L-CLM-1/L-CLM-2 are open (§9.3).
- `10-CANONICAL-DOC-MAP.md` — canonical filenames; every cross-doc link here resolves to a name in
  its §1.
- `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` — every component tested per §4 here.
- `12-ACCESSIBILITY-AUDIT.md` — the a11y tests per §7 here; the text-on-glass + `#7F7F7F` + body-text
  floor rules the visual gate also guards (§6.3).
- `13-SEO-AND-DISCOVERY.md` — the per-route meta-copy tests (regression: meta copy matches `13` §3);
  the `noindex,nofollow` assertion for `/login` + `/signup` (§5.2).
- `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` — the perf tests per §8 here; owns the LHCI/budget files
  this doc names (L-ENG-2/L-ENG-3).
- `15-FORMS-AND-ABUSE-GUARDRAILS.md` — the form + abuse-defense tests (honeypot, rate-limit, §5.3).
- `17-ANALYTICS-AND-OBSERVABILITY.md` — the analytics event tests (regression: every event fires
  with the right props); the moat-metric `component_reused` proof (§5.4) is the load-bearing one.
- `23-AUTH-EXPERIENCE.md` — every auth-flow e2e (§5.2) targets the wiring this doc specifies; the
  component tests for `AuthLayout`/`AuthGlassPanel`/`LoginForm`/`SignupForm`/`ClosedBetaGate` (§4)
  target the components this doc introduces.
- `LOOP_LEDGER.md` — the open test-script dependencies (L-CLM-1, L-CLM-2, L-ENG-2, L-ENG-3, L-A11Y-1,
  L-A11Y-2, L-VIS-1, L-FUN-1, L-FUN-2, L-FND-1).

---

## 12. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

Per D-5, no gate is silently marked closed. Each item below has a row in `LOOP_LEDGER.md`.

- **L-CLM-1 — `scripts/claims-forbidden-sweep.mjs`** (§9.1). Open dependency. Until it exists the
  forbidden-list sweep is manual per `09` §3.2; the CI `claims` job is honestly conditional (§9.3).
- **L-CLM-2 — `scripts/claims-matrix-check.mjs` + the Feature Inventory snapshot generator** (§9.2,
  §9.4). Open dependency. Until both exist the matrix reconciliation is manual.
- **L-ENG-2 — Lighthouse CI wiring** (§8.1). `lighthouserc.json` + `lighthouse/budgets.json` +
  `@lhci/cli` dep do not exist. Until they do, lab perf runs via the existing `test:e2e:perf` lane +
  a manual Lighthouse run; the `lighthouse` CI job is honestly conditional.
- **L-ENG-3 — Bundle-analyzer wiring** (§8.2). The `analyze` script + `next.bundle-budget.json` do
  not exist (the `@next/bundle-analyzer` devDep is present). Until they do, the `bundle` CI job is
  honestly conditional.
- **L-A11Y-2 — axe-core / `@axe-core/playwright` as deps** (§7). Verify at implementation; add if
  absent. Either way the manual SR pass (L-A11Y-1) is the binding gate.
- **L-A11Y-1 — Manual SR pass (NVDA + VoiceOver + TalkBack)** (§7). Per-release pre-cutover at
  minimum; the unautomatable sign-off gate.
- **L-VIS-1 — Playwright screenshot-diff baseline capture** (§6). The strategy is specified (§6.1);
  the baselines under `e2e/visual/__screenshots__/` are captured at first implementation and
  reviewed on every diff. Visual regression is a GATE, not optional, once the baselines exist.
- **L-FUN-1 — `/signup` route path** (§5.2). Recommend `/signup`; the e2e specs are route-agnostic
  until ratified.
- **L-FUN-2 — `/signup` self-serve enablement** (§5.2). The self-serve-on e2e spec is `.skip` until
  self-serve is enabled; the gated-path spec runs today.
- **L-FND-1 — Founder bio assets** (§5.1). The `/about` render test asserts the gated one-liner
  until the bio ships.
- **L-ENG-1 — Perf-target ratification** (§8). The LCP < 2.0s / CLS < 0.05 / INP < 200ms / JS < 40KB
  gz values are owner-gated (cross-link `00` §7 G-10); the thresholds in §8 are the working
  assumptions until ratified.

---

## 13. Coherence contracts (this doc honors)

- **D-1 (Glass Brand)** — visual regression targets the glass surfaces (§6); the arming test (§6.2)
  targets the real `LiquidGlassReady` + `data-glass="ready"` + `--glass-blur-amount` arming; the
  ≤4-blur cap (§6.2) enforces `03` §4.4.
- **D-2 (full-page 2-col auth, no password)** — auth-flow e2e (§5.2) covers magic-link + OAuth +
  gated + self-serve + error-codes + responsive collapse + `noindex`; component tests (§4) cover
  every auth leaf; abuse tests (§5.3) cover honeypot + Postgres rate-limit.
- **D-3 (orange discipline)** — the visual gate (§6.3) asserts no small-text `#F24405` and **zero**
  `#AA412A` / clay references in computed styles.
- **D-4 (single `ClaimStatus` type)** — the unit test (§3) asserts the plate narrows from the full
  type to the Live/Building/Planned subset; `StatusPill` exports the single type (§4).
- **D-5 (honest scoring)** — every CI gate that depends on a not-yet-existing script/config is
  **honestly conditional** (§9.3, §10), not silently enforced; the manual SR pass and the manual
  claims checklist are carried as binding gates (L-A11Y-1, L-CLM-1/2). No self-congratulation.
- **Rate-limiting = Postgres** — the rate-limit e2e (§5.3) targets the `rate_limit` table, not Redis.
- **Turnstile NOT yet built** — no e2e references a CAPTCHA; escalation-only per `15`.
- **Radical honesty** — the `AuthGlassPanel` component test (§4) asserts no fake screenshots / stock
  photos in the DOM; the moat-metric proof (§5.4) makes the "reusable commercial knowledge" claim
  testable, not aspirational.

---

## 14. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **95 / 100** | The 7-layer model is the right verification surface for the Glass Brand + auth + claims posture: every ratified decision (D-1…D-5) has a dedicated test lane, the Chromatic→Playwright-screenshot-diff call (§6.1) is the correct technical read for `backdrop-filter`, and the moat-metric proof (§5.4) turns the load-bearing claim into a testable assertion. Not 100 because the LHCI-vs-Playwright-perf split is a working assumption until L-ENG-2 closes, and the exact visual-diff threshold (0.1%) is a starting point the owner may want to tune. |
| **Quality** | **94 / 100** | Every tool citation is grounded in the real `package.json` (lines 21/22/24/25/93) and the real file tree (`e2e/*.spec.ts`, `tests/vitest/landing-*.test.tsx`, `LiquidGlassReady.tsx`, `globals.css` token anchors); every cross-link resolves to a canonical filename; the honestly-conditional CI pattern (§9.3) is spelled out in shell, not hand-waved; the gaps the task named (auth e2e, glass visual regression, LHCI/budget paths, arming + Feature Inventory fixture) are all closed. Not 100 because the auth e2e specs are named-but-not-yet-written (they are the deliverable), and the Feature Inventory snapshot generator is folded into L-CLM-2 rather than specified line-by-line. |
| **Implementation-Readiness** | **91 / 100** | An implementer can start: the entry points (`bun run test` / `test:dom` / `test:e2e`) are real, the new specs' file paths and assertions are concretely named, the CI shape maps 1:1 to scripts that either exist or are GATED with an L-* ID, and the visual-regression strategy is actionable (fixed viewport, armed-glass wait, committed baselines). Not 100 because four CI jobs (lighthouse/bundle/claims, and a11y-pending-axe) are honestly conditional on open gates, the `/signup` self-serve e2e is `.skip` until L-FUN-2 resolves, and the moat-metric e2e needs a seeded library + DnD harness whose exact shape is deferred to implementation. Per D-5 these open gates honestly cap readiness below 100 rather than being silently closed. |

**Carried to `LOOP_LEDGER.md` (not silent):** L-CLM-1, L-CLM-2, L-ENG-1, L-ENG-2, L-ENG-3, L-A11Y-1,
L-A11Y-2, L-VIS-1, L-FUN-1, L-FUN-2, L-FND-1.
