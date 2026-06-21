# 08 — Rollout & Analytics

> **STATUS: PLANNING ONLY · 2026-06-22 · not code.**
> **Direction:** THE GLASS BRAND (keystone D-1). The preview + A/B + cutover machinery is
> direction-agnostic at the route/cookie layer, but every visual decision in this doc
> (preview-route skin, the treatment variant's glass surfaces, the analytics event payloads
> that carry glass-surface engagement) binds to the Glass Brand vocabulary in
> `03-VISUAL-LANGUAGE-AND-TOKENS.md` and the ratified decisions D-1…D-5 in
> `00-OVERVIEW.md` §2.
> **Purpose:** Own the rollout mechanics for the landing redesign — the `/newdesign`-style
> preview route, the A/B old-vs-new comparison (with a real sample-size plan, a 10/90→50/50
> ramp rule, and rollback alarms), the claims sign-off gate before any public cutover, and
> the analytics events the funnel contributes to. This doc owns *how the new surface ships
> safely*; it does not own the claims matrix itself (→
> `06-PROOF-AND-CLAIMS-DISCIPLINE.md`), the public sign-off gate mechanics (→
> `09-CLAIMS-LEDGER-SIGN-OFF.md`), the full event schema (→
> `17-ANALYTICS-AND-OBSERVABILITY.md`), or the analytics tool decision (→
> `17-ANALYTICS-AND-OBSERVABILITY.md` L-ENG-2).

Every public-word suggestion obeys MASTER §15 (Claims Discipline) and §10 (Controlled
Confidence). Every dependency is `⚠️ GATED ON` and tracked in `LOOP_LEDGER.md`. Per D-5,
genuinely owner-gated items are CARRIED in the ledger, never silently marked closed.

---

## 1. The rollout shape, in one paragraph

The redesign ships **behind a preview route** following the repo's existing `/newdesign` and
`/design-sync` convention (verified: the repo has used this pattern for prior design passes).
The new pages live at `/newdesign`, `/newdesign/features`, `/newdesign/pricing`,
`/newdesign/about`, `/newdesign/contact`, `/newdesign/trust`, and **`/newdesign/login` +
`/newdesign/signup`** (the auth surfaces are in scope per D-2 and `23-AUTH-EXPERIENCE.md`),
while the old pages stay live at their canonical routes. An A/B test (reusing the existing
`ABExperimentProvider.tsx` + `getVariant()` server-side path already in `src/app/page.tsx`,
**extended once** per L-ENG-3 — see §3.1) splits traffic between old and new for the
homepage only. The A/B ramps 10/90 → 50/50 under a fixed decision rule (§3.4) and reaches the
significance threshold computed in §3.2 (sample size, not just "2 weeks"). When the A/B
passes AND the claims sign-off gate (`09-CLAIMS-LEDGER-SIGN-OFF.md`) passes, the new pages
cutover to the canonical routes and the old pages move to `/legacy` for 30 days before
deletion. The full funnel analytics (§4) instruments the new surface from day one of the
preview, gated on the existing consent model (§4.3).

---

## 2. The preview route

### 2.1 Route shape

| Preview route | Canonical route (post-cutover) | Status |
|---|---|---|
| `/newdesign` | `/` | new |
| `/newdesign/features` | `/features` | new |
| `/newdesign/pricing` | `/pricing` | new |
| `/newdesign/about` | `/about` | new |
| `/newdesign/contact` | `/contact` | new |
| `/newdesign/trust` | `/trust` | **new route** (does not exist at canonical path today) |
| `/newdesign/login` | `/login` | reskin (D-2; see `23-AUTH-EXPERIENCE.md`) |
| `/newdesign/signup` | `/signup` | **new route** (gated L-FUN-1/L-FUN-2; see `23-AUTH-EXPERIENCE.md`) |

The preview routes reuse the same `LandingShellClient` (doc 07 §1.1) and the same components
as the canonical routes will post-cutover; they differ only in URL. This means the A/B and
the eventual cutover are URL swaps, not code changes — the components are identical. **The
preview skin is the Glass Brand** (`03-VISUAL-LANGUAGE-AND-TOKENS.md`): warm grey canvas
(`--warm-canvas #f5f5f5`), `.dashboard-glass` surfaces, signal-orange `--brand-orange
#F24405` presence (D-3), Doto + Roboto Mono + SF Pro typography. The OLD routes keep their
current skin (the existing paper-ish landing) for the duration of the A/B so the comparison
is old-vs-new, not new-vs-redesigned-new.

### 2.2 Access control on the preview

The preview is **not auth-gated** (it is a static marketing surface; no Supabase call), but
it is **not advertised**. Internal review happens at `/newdesign` directly; external A/B
traffic is split by the `ABExperimentProvider` (§3). The marketing preview routes are
**crawlable** (no `noindex`) so SEO can be measured pre-cutover
(`13-SEO-AND-DISCOVERY.md`); canonical URLs are reconciled via the `sitemap.xml` +
`rel="canonical"` strategy in `13-SEO-AND-DISCOVERY.md` §5. **The auth preview routes
(`/newdesign/login`, `/newdesign/signup`) ARE `noindex,nofollow`** — same as their canonical
counterparts per D-2 / `23-AUTH-EXPERIENCE.md` §7 — so the auth surface never leaks into the
indexable graph.

### 2.3 The `/legacy` rollback path

Post-cutover, the old `src/components/landing/*` components and the old `/` page move to
`/legacy` for 30 days. If the new surface regresses on any success metric (§5) or any
rollback alarm (§5.3) within those 30 days, the cutover rolls back by reverting the route
swap — the legacy components are still live at `/legacy`, the URL swap is a one-line change.
After 30 days of stable new-surface metrics, `/legacy` is deleted (owner confirmation per the
Hallmark deletion rail, `LOOP_LEDGER.md` L-REM-1…L-REM-5).

---

## 3. The A/B test (old vs new)

### 3.1 Provider (reuse + extend ONCE, do not reinvent)

The repo already ships `ABExperimentProvider.tsx` (client,
`src/components/landing/ABExperimentProvider.tsx`) and `getVariant()` (server,
`src/lib/ab-testing/variant-assigner.ts`), used in `src/app/page.tsx` for the existing
`hero-cta-copy` experiment (verified 2026-06-22). The existing `getVariant` is:

- **Two-variant binary** (`A` or `B`, `Math.random() < 0.5`, `variant-assigner.ts:53`).
- **Consent-gated**: returns `A` and sets no cookie when
  `options.analyticsConsent` is false (`variant-assigner.ts:34-36`).
- **Bot-safe**: bots always get `A` and no cookie (`variant-assigner.ts:30-32`).
- **Sticky**: variant persists in the `ab_test` cookie (30-day, `httpOnly:false` so
  GA4/Clarity can read it, `variant-assigner.ts:58-64`).

⚠️ **GATED ON L-ENG-3 — the existing provider does NOT handle the old-vs-new rollout's needs
out of the box.** Three concrete gaps, each a small additive extension (no new A/B library):

1. **Page-level split.** Today `getVariant` is called from `src/app/page.tsx` to pick hero
   *copy*; the redesign needs it to pick the *page* (old `/` vs new `/newdesign` content
   served at `/`). Mechanically: `src/app/page.tsx` already calls `getVariant` and wraps the
   page in `<ABExperimentProvider>`; the extension is to branch on the variant *at the RSC
   level* and render either the old `HeroSection` tree or the new `LandingShellClient` tree.
   The `ABExperimentProvider` wrapper itself does not change.
2. **Ramp percentages.** Today the split is hardcoded `Math.random() < 0.5` (50/50). The
   rollout needs 10/90 → 50/50 (§3.4). Extension: add an optional `trafficFraction` arg to
   `getVariant` (the fraction assigned to treatment `B`); default `0.5` preserves the
   existing experiment untouched.
3. **Experiment registry.** `ACTIVE_EXPERIMENTS` (`src/lib/ab-testing/experiments.ts:3`)
   currently lists only `hero-cta-copy`. Add `landing-redesign-2026-06` with variants
   `["A", "B"]` (control, treatment). This is the additive-once change; do not introduce a
   new A/B library. Tracked in `LOOP_LEDGER.md` L-ENG-3.

> **Why not a third-party A/B tool.** The product is pre-revenue closed-beta; the funnel is
> one primary metric (signup) on a low-traffic PH+SEA audience (§3.2). A vendor A/B platform
> is unjustified cost + a new consent surface. The repo's scaffolding + the extension above
> is the proportional choice. Revisit if monthly signups exceed the §3.2 sample size in under
> 2 weeks (then a higher-cadence tool earns its keep).

### 3.2 The experiment + sample-size plan (MDE)

| Field | Value |
|---|---|
| Experiment ID | `landing-redesign-2026-06` |
| Surface | `/` (homepage only) |
| Variants | `A` = control (old page at `/`) · `B` = treatment (new Glass Brand page served at `/`) |
| Ramp | 10/90 (control/treatment) for the first week, then 50/50 — decision rule in §3.4 |
| Assignment | server-side via `getVariant()` (extended, §3.1), consistent per-visitor via the existing `ab_test` cookie (consent-gated; bots forced to A) |
| **Primary success metric** | `signup` conversion rate (anonymous → authenticated at `/auth/callback` originating from `/signup` or `/login`; §4.1) |
| Secondary success metrics | `hero_cta_click`, scroll-depth to the claims ledger (section 7), `pricing_philosophy_engagement`, bounce rate, LCP (proxy for engagement) |
| Guardrail metrics | `signup` CVR, CWV (LCP/CLS/INP), bounce rate — thresholds in §5.3 |

**Power calculation (the sample size, not just "2 weeks"):**

| Parameter | Value | Basis |
|---|---|---|
| Baseline `signup` CVR (control) | **1.5 %** | Assumption — the product is pre-launch closed-beta; no historical public-funnel data exists. Owner to confirm/replace with the first week's observed control CVR (§3.4 ramps on the *observed* rate). Tracked as **L-ENG-4**. |
| Minimum detectable effect (MDE) | **+20 % relative** (1.5 % → 1.8 %) | A Glass-Brand redesign that moves the primary metric less than 20 % relative is not worth the cutover risk; below this, ship no-op. The 20 % threshold is the "is the redesign doing anything real" bar. |
| Significance (α) | **0.05** (two-sided) | Standard for a single primary metric with no multi-armed correction (one comparison: A vs B). |
| Power (1 − β) | **0.80** | Standard; pre-revenue beta, 0.80 is proportional (0.90 would inflate the sample ~30 % and is unjustified at this traffic). |
| **Required sample per arm (n)** | **~6,000 unique visitors per arm** | Two-proportion z-test at the parameters above (`n ≈ 16 × p̄(1−p̄) / Δ²` with pooled p̄ ≈ 0.0165, Δ = 0.003 → ~6,000/arm). Both arms combined: **~12,000 visitors**. |
| PH vs SEA traffic-share assumption | **PH 70 % / SEA 30 %** | Assumption — primary market is PH (`00-OVERVIEW.md` §1). Owner to confirm; if SEA share is higher, the clock-time to reach n is longer (more low-converting SEA traffic dilutes CVR). Tracked as **L-SEO-1** (PH/SEA volumes live in `13-SEO-AND-DISCOVERY.md`). |
| Estimated clock-time to reach n | **3–5 weeks at 50/50**, assuming ~400–600 weekly unique visitors to `/` (closed-beta + word-of-mouth + owner demo traffic) | **2 weeks is achievable ONLY if weekly traffic ≥ ~600 uniques.** At the low end (~400/wk), plan for 4–5 weeks. The §3.4 ramp rule gates on n reached, not on a calendar. |

> ⚠️ **GATED ON L-ENG-4** — the 1.5 % baseline and the ~400–600 weekly-unique estimate are
> **planning assumptions**, not measured facts (there is no analytics tool wired yet —
> L-ENG-2). Once L-ENG-2 closes, **replace the baseline with the first week's observed
> control CVR and recompute n** before declaring significance. This doc carries L-ENG-4; the
> decision rule (§3.4) explicitly says "significance is computed against the observed
> baseline, not the assumed one."

### 3.3 The wedge-fit sub-test

Per `01-DESIGN-DIRECTION.md` §7, the direction must A/B-test as "for me" with contractors and
estimators (the wedge), not only architects. The treatment variant carries a role-selection
prompt in the hero or the "Who it is for" section (section 6) for the first 2 weeks,
capturing self-reported role. Cross-tab: does treatment CVR hold for contractor/estimator
self-reports, or only for architects? If treatment wins overall but loses on the wedge, the
direction needs copy revision (not a redesign). Tracked as a sub-hypothesis in the experiment
notes; the role self-report is a `signup_role_self_report` prop on the `signup_view` event
(§4.1) — optional, consent-gated, never required to submit the form.

### 3.4 Ramp decision rule (10/90 → 50/50) — no hedging

The ramp is deterministic, not "or":

| Phase | Split (A control / B treatment) | Enter when | Exit when |
|---|---|---|---|
| **R0 — internal** | 0/100 (only `/newdesign` direct visits; no A/B) | Preview routes live | Owner signs off the preview visually (G-11 / L-DES-1…5) AND §5.1 #3 claims gate passes on the preview content |
| **R1 — 10/90 ramp** | 10 % B / 90 % A | R0 exit | **7 calendar days elapsed AND ≥ 500 visitors on B AND no §5.3 alarm tripped.** If any §5.3 alarm trips in R1, hold at 10/90 (do NOT roll back to R0) and investigate; if it trips hard, roll back per §5.3. |
| **R2 — 50/50** | 50 % B / 50 % A | R1 exit criteria all met | **Both arms reach n ≈ 6,000 (§3.2) AND the primary metric reaches significance (p < 0.05) AND §5.1 #1–#6 all hold.** |
| **R3 — cutover** | 100 % B (canonical) | R2 exit criteria all met + §5.1 #3 claims gate passed | n/a — the new pages are the canonical routes; old pages move to `/legacy` (§2.3) |

**Hard rule:** the ramp NEVER advances on a calendar alone. Each phase exit is gated on
(traffic observed + no alarm + significance where required). If traffic is slow, the ramp
waits — this is why §3.2 says 2 weeks is achievable only at the high-traffic estimate.

### 3.5 What the treatment variant serves if `/signup` is not ready (L-FUN-1/L-FUN-2)

The treatment's "Start free" CTA href depends on the auth-onboarding gates. To keep the A/B
honest (both arms must test the *same funnel shape* or the comparison is confounded), the
**treatment and control serve the SAME "Start free" target during the experiment**:

| L-FUN-1/L-FUN-2 state | Control (A) "Start free" href | Treatment (B) "Start free" href | Why |
|---|---|---|---|
| Both closed (current beta reality) | `/login` (magic link handles signup) | `/login` | The funnel under test is "visit `/` → click 'Start free' → reach `/login` → authenticate". Both arms route to `/login`. `/signup` does not exist yet, so neither arm can route there without inventing a route mid-experiment. |
| L-FUN-1 closed, L-FUN-2 open | `/signup` (self-serve on) | `/signup` | Once `/signup` exists and self-serve is on, both arms flip together; restart the A/B clock because the funnel shape changed. |
| L-FUN-1 open, L-FUN-2 closed | `/signup` (renders `ClosedBetaGate` request-access variant — `23-AUTH-EXPERIENCE.md` §3.2) | `/signup` | The route exists; the gate is a content variant. Both arms route to `/signup`. |

**Consequence:** the A/B does NOT block on L-FUN-1/L-FUN-2 — it runs against whichever funnel
is live on the day R1 starts, and both arms share it. If the gates flip mid-experiment, the
clock restarts (note this in the experiment log). This resolves the CTA→`/signup`-gating
consistency: the rollout never serves a different funnel shape to treatment than to control.

---

## 4. Analytics events

### 4.1 The event set (canonical per MASTER §18.5; tool + schema GATED on L-ENG-2)

These are the events the landing funnel contributes to or feeds. The tool decision (PostHog
/ Plausible / GA4 / Vercel Web Analytics) is L-ENG-2 (`LOOP_LEDGER.md`); the **set** is
canonical regardless of tool. The **full payload schema** lives in
`17-ANALYTICS-AND-OBSERVABILITY.md` (gated L-ENG-2); this doc provides a **portable shape**
(§4.1.1) so the event set is implementable before the schema doc finalizes the tool-specific
projection.

| Event | Fires on | Funnel role | Source |
|---|---|---|---|
| `route_view` | Any marketing route view (`/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`) | Top-of-funnel reach | standard page-view (instrumented with route name as prop) |
| `signup_view` | `/signup` (or `/newdesign/signup`) RSC renders | Conversion-adjacent | `23-AUTH-EXPERIENCE.md` §9.1 |
| `login_view` | `/login` (or `/newdesign/login`) RSC renders | Conversion-adjacent | `23-AUTH-EXPERIENCE.md` §9.1 |
| `auth_method_selected` | user clicks Google or submits magic-link form | Mid-funnel | `23-AUTH-EXPERIENCE.md` §9.1 |
| `signup` | Authenticated session created at `/auth/callback` originating from `/signup` or `/login` (the CTA's direct conversion event; the **A/B primary metric**) | Primary conversion | §18.5; merge boundary per `23-AUTH-EXPERIENCE.md` §9.1 |
| `first_estimate_created` | First estimate in a new account | Activation step 1 | §18.5 |
| `component_reused` | First reuse of a library component in an estimate — **the moat metric** | Activation (north-star) | §18.5, §14.4 |
| `proposal_shared` | First shared proposal link (paid capability; fires on upgrade or walkthrough path) | Mid-funnel | §18.5 |
| `export` | `.xlsx` export (Free has marked export) | Mid-funnel | §18.5 |
| `weekly_return` | Retention signal (re-visit within 7 days) | Retention | §18.5 |
| `hero_cta_click` | "Start free" click in the hero | Top-of-funnel engagement | doc 07 §7.2 |
| `secondary_cta_click` | "Book a walkthrough" click | Top-of-funnel (assisted path) | doc 07 §7.2 |
| `plate_node_focus` | Architecture-plate node hover/focus | Mid-funnel engagement (named-architecture move) | doc 04 §4.5, doc 07 §7.2 |
| `claims_ledger_expand` | Section 7 claims-ledger row expand / filter change | Trust-stage engagement | doc 06 §2, doc 07 §7.2 |
| `pricing_philosophy_engagement` | Scroll-depth / time-on-section on the pricing-philosophy block | Conversion-adjacent engagement; validates the cement-anchor framing as a hypothesis | §9.3 |

**A/B instrumentation:** every event carries the A/B context as props
(`experiment_id: "landing-redesign-2026-06"`, `variant: "A"|"B"`, `route_phase:
"R1"|"R2"|"R3"`) so the analysis can slice any event by arm without a separate stream.
Events fire ONLY when the visitor has analytics consent (§4.3); the page render itself is
not consent-gated.

#### 4.1.1 Portable event payload shape (stub; full schema in doc 17)

The full tool-specific schema is deferred to `17-ANALYTICS-AND-OBSERVABILITY.md` (gated
L-ENG-2). This is the **portable, tool-agnostic shape** every event conforms to, so the event
set is implementable before the tool projection lands:

```ts
// Portable shape — projected to the chosen tool's schema in doc 17 (L-ENG-2).
// All fields are consent-gated (§4.3); no PII (email, name) ever appears here.
// The anonymous_id is the SDK's pre-auth id; it merges into the user_id at the
// /auth/callback boundary (signup/login events are the merge triggers — doc 23 §9.1).
type LandingAnalyticsEvent = {
  event: string;                      // one of the names in the §4.1 table
  timestamp: string;                  // ISO 8601, server-set where possible
  anonymous_id: string;               // SDK-assigned pre-auth; stable across the funnel
  user_id?: string;                   // present only post-merge (after signup/login)
  route: string;                      // e.g. "/", "/newdesign", "/signup"
  route_phase: "preview" | "R1" | "R2" | "R3" | "legacy";
  experiment_id?: "landing-redesign-2026-06";
  variant?: "A" | "B";                // present when the event fires inside an A/B arm
  // event-specific props (see §4.1 table for which event carries which):
  props?: {
    cta_target?: "start_free" | "book_walkthrough" | "login" | "workspace";
    method?: "google" | "magic_link";
    plate_node?: string;              // e.g. "L1_estimate_tree", "P1_supplier_bridge"
    claim_status?: "Live" | "Building" | "Planned";  // D-4 type, narrowed subset
    signup_role_self_report?: string; // §3.3 wedge sub-test; optional, never required
    section_id?: string;              // for scroll-depth / engagement events
  };
};
```

The `ClaimStatus` prop type binds to the **single shared `ClaimStatus` type** (D-4,
`src/components/landing/shared/StatusPill.tsx`) narrowed to the Live/Building/Planned subset
— no divergent type definition in the analytics layer. Doc 17 owns the projection of this
shape onto the chosen tool's native schema.

### 4.2 The moat metric (north-star)

`component_reused` (first reuse per user) is the funnel's true north — the moment a free user
starts building the library that compounds switching cost. Instrumented as a first-time-per-
user boolean (not a raw count) so retention analysis can ask "did this signup activate?"
cleanly. Until this metric is measured, the "your work compounds" claim (§3) stays framed as
the Live foundation + the Planned surfacing payoff (§3.3 honesty anchor). When the metric is
live, it becomes evidence — but **never** a public stat until §15 is satisfied (measured, not
inflated, not invented).

### 4.3 Consent model (reuses the existing infrastructure — verified)

The repo already ships the consent infrastructure; the redesign **reuses it verbatim, no new
consent code**:

| Component / function | Source | Role in the rollout |
|---|---|---|
| `CookieConsentBanner` | `src/components/landing/CookieConsentBanner.tsx` (mounted via `PublicPageShell.tsx:41`) | Renders the consent prompt on every public page, including the preview routes. **Unchanged.** |
| `parseLandingConsentValue` | `src/lib/landing/consent.ts:23` | Parses the `archestimator_cookie_consent` cookie into `{ analytics: boolean, ... }`. **Unchanged.** The RSC reads it the same way `src/app/page.tsx:23` already does. |
| `getLandingAuthState` | `src/lib/landing/get-landing-auth-state.ts:10` | Returns whether the visitor is already authenticated (used to vary nav CTAs "Sign in" vs "Open workspace"). **Unchanged.** |
| `hasLandingAnalyticsConsent` | `src/lib/landing/consent.ts:62` | The gate: `analytics === true`. All §4.1 events fire ONLY when this is true. **Unchanged.** |
| `getVariant` consent gate | `src/lib/ab-testing/variant-assigner.ts:34-36` | Returns `A` (control) and sets no cookie when consent is missing — so **the A/B itself is consent-gated**: non-consenting visitors see control and are excluded from the analysis. **Unchanged by §3.1 extensions** (the `trafficFraction` arg only affects the random draw AFTER the consent gate passes). |

**Cross-links:** `15-FORMS-AND-ABUSE-GUARDRAILS.md` owns the consent copy + the banner's
accept/decline UX; `17-ANALYTICS-AND-OBSERVABILITY.md` owns the consent-to-event wiring (the
SDK respects the gate); `13-SEO-AND-DISCOVERY.md` owns the cookie's interaction with the
noindex/sitemap strategy. This doc owns the contract that **the rollout reuses the existing
consent surface and never instruments an event without the gate.**

---

## 5. Success metrics, gates & rollback alarms

### 5.1 Rollout success criteria (the gate to cutover)

The new surface may cutover from `/newdesign` to canonical routes (R2 → R3) when **all**
hold:

1. **A/B primary metric: `signup` CVR on `treatment` ≥ `control`** (statistically
   significant at p < 0.05 against the **observed** baseline — L-ENG-4 — not the §3.2 assumed
   baseline; minimum both arms reach n ≈ 6,000 per §3.2, OR significance reached earlier at
   the same α).
2. **A/B guardrails clean:** no CWV regression beyond `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`
   targets; no `signup` CVR regression beyond the §5.3 alarm; no bounce-rate regression
   beyond the §5.3 alarm.
3. **Claims sign-off gate passed** (`09-CLAIMS-LEDGER-SIGN-OFF.md`): every public claim
   reconciles to the Feature Inventory (MASTER §7.2) on the day of cutover.
4. **Wedge-fit sub-test clean:** treatment CVR holds for contractor/estimator self-reports,
   not only architects (`01-DESIGN-DIRECTION.md` §7).
5. **Owner confirmation** of the removals rail (`LOOP_LEDGER.md` L-REM-1 → L-REM-5).
6. **All ⚠️ GATED ON funnel co-dependencies** for "Start free" (L-FUN-1 → L-FUN-4) either
   closed or explicitly owner-accepted — per D-5, never silently closed. (Note per §3.5: the
   A/B does NOT block on these, but the cutover does, because post-cutover the canonical
   `/signup` must be the real target.)

### 5.2 Post-cutover monitoring (30-day `/legacy` window)

For 30 days post-cutover (R3), monitor daily: `signup` CVR, CWV field metrics (CrUX), error
rate, `route_view` per route. Any §5.3 alarm → rollback (§2.3). After 30 days stable → delete
`/legacy` (L-REM-1…L-REM-5).

### 5.3 Rollback alarm thresholds (magnitude + observation window)

"Any regression" is not actionable — small noisy dips happen daily. The alarms below are the
**magnitude + observation window** that actually trigger rollback or a ramp hold:

| Alarm | Metric | Threshold (magnitude) | Observation window | Action |
|---|---|---|---|---|
| **AL-1** | `signup` CVR (treatment vs control, or post-cutover vs pre-cutover baseline) | **≥ 20 % relative decline** (e.g. 1.5 % → 1.2 %) sustained | **3 consecutive days** at 50/50+ traffic (R2/R3), OR **1 day** if ≥ 50 % relative decline | Roll back to `/legacy` (R3→rollback) or hold ramp (R1→hold). The 20 % threshold mirrors the §3.2 MDE — a decline that large is real, not noise. |
| **AL-2** | LCP (lab + field, treatment vs `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` target) | **LCP p75 > 2.5 s** (target is < 2.0 s; L-ENG-1) sustained | **7 days** of CrUX field data at 50/50+ | Roll back; the Glass Brand's deferred-glass arming (§3 in `03-VISUAL-LANGUAGE-AND-TOKENS.md`) must not regress LCP. |
| **AL-3** | CLS | **CLS > 0.10** sustained (target < 0.05; L-ENG-1) | **7 days** field | Roll back; CLS this high usually means the glass-blur ramp or a Doto font swap shifted. |
| **AL-4** | INP | **INP p75 > 300 ms** sustained (target < 200 ms; L-ENG-1) | **7 days** field | Roll back; investigate which hydrating leaf (plate hover, ledger filter) regressed interaction. |
| **AL-5** | Bounce rate | **≥ 15 % relative increase** sustained | **7 days** at 50/50+ | Hold ramp (R1) or investigate at R2; do not roll back alone — pair with AL-1 before rolling back. |
| **AL-6** | Error rate (5xx / server-action failure on `/contact`, `/signup`, `/login`) | **> 1 %** of requests | **1 day** | Roll back immediately — this is correctness, not metric noise. |
| **AL-7** | Consent-decline rate | **≥ 20 % relative increase** vs control | **7 days** | Investigate — the new consent banner copy (unchanged per §4.3) should not move this; if it does, the banner is rendering wrong on the new shell. |

**Rule:** a single alarm in {AL-1 one-day-hard, AL-6} triggers immediate rollback. Alarms in
{AL-1 three-day, AL-2/3/4/5/7} trigger a ramp hold + investigation; rollback follows if the
alarm does not clear in the next observation window. Every alarm fires into the
`17-ANALYTICS-AND-OBSERVABILITY.md` dashboard and pings the on-call channel (owned by doc 17,
L-ENG-2 for the tool).

---

## 6. Glass-Brand re-skin of the preview / A-B notes

The preview + A/B machinery is direction-agnostic at the cookie/route layer, but every
visual decision binds to the Glass Brand (D-1) and the orange discipline (D-3):

- **Treatment variant skin** = the Glass Brand from `03-VISUAL-LANGUAGE-AND-TOKENS.md`:
  warm grey canvas (`--warm-canvas #f5f5f5`, alias `--landing-canvas`), `.dashboard-glass`
  surfaces with deferred arming (`data-glass="ready"`), Doto (`--font-display`) headlines +
  Roboto Mono (`--font-numeric`) numerals + SF Pro (`--font-sf-pro`) UI, the 3px/8px/12px
  radius ramp, signal-orange `--brand-orange #F24405` presence on the **one** primary CTA +
  logo slab + focus rings + accent rail, `--brand-orange-dark #C63804` for any orange text
  `< 24px` (D-3). **Clay `#AA412A` is NOT a token, NOT referenced** (D-3 hard contract).
- **Control variant skin** = the existing landing (unchanged) for the duration of the A/B,
  so the comparison measures the Glass Brand's effect, not a redesign-of-a-redesign.
- **Tailwind v4 gotcha** (memory `tailwind-arbitrary-var-needs-color-hint`): any arbitrary-
  value background in the treatment's tracking-instrumented surfaces (e.g. the engagement
  heatmaps behind `plate_node_focus`) must use `bg-[color:var(--x)]`, not `bg-[var(--x)]`,
  or the heatmap silently renders with no color and the engagement data is mis-attributed.
  `16-TEST-AND-VERIFICATION-PLAN.md` adds a visual-regression check for this.
- **Auth preview routes** (`/newdesign/login`, `/newdesign/signup`) ship the full-page
  2-column layout from `23-AUTH-EXPERIENCE.md` — the LEFT `AuthGlassPanel` is a
  `.dashboard-glass-warm` surface with the `--grad-hero-continue` / `--grad-hero-create`
  composition and the signal-orange logo slab; NO fake product screenshots (radical honesty,
  D-2). These routes are `noindex,nofollow` even in preview (§2.2).
- **Deferred-glass arming on the treatment** reuses `<LiquidGlassReady />` verbatim
  (`src/components/system/LiquidGlassReady.tsx`, mounted in `src/app/layout.tsx:40`); the
  treatment inherits the ≤4-simultaneous-blur cap (`03-VISUAL-LANGUAGE-AND-TOKENS.md` §4.4)
  and the `prefers-reduced-motion` disarm. No new glass system for the A/B.

---

## 7. Cross-links

- `00-OVERVIEW.md` — the five ratified keystone decisions D-1…D-5 this rollout obeys; §7
  gate table (G-1…G-12); §9.2 doc dependency graph (this doc depends on `07` + `09`).
- `03-VISUAL-LANGUAGE-AND-TOKENS.md` — the Glass Brand tokens the treatment variant binds to;
  §4.4 the ≤4-blur cap; §4.3 the deferred-glass arming the treatment reuses.
- `06-PROOF-AND-CLAIMS-DISCIPLINE.md` — the claims matrix; the sign-off gate inputs (§5.1 #3).
- `07-ENGINEERING-CONSTRAINTS.md` — the RSC-first build, the funnel co-dependencies, the
  event set source, the A/B provider location (§1.2 #4).
- `09-CLAIMS-LEDGER-SIGN-OFF.md` — the public sign-off gate mechanics this rollout waits on
  (§5.1 #3; hard blocker in `00-OVERVIEW.md` §9.2).
- `10-CANONICAL-DOC-MAP.md` — canonical filenames; every cross-link here resolves to one.
- `13-SEO-AND-DISCOVERY.md` — sitemap, robots, canonical URL strategy for the preview +
  cutover; the noindex contract for auth preview routes (§2.2); PH/SEA keyword volumes
  (L-SEO-1, feeds §3.2 traffic-share assumption).
- `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` — the CWV targets (L-ENG-1) the A/B guardrails
  (§5.3 AL-2/3/4) reconcile to.
- `15-FORMS-AND-ABUSE-GUARDRAILS.md` — the consent model + the consent banner copy + the
  form-spam defense; rate-limiting is Postgres (`security_rate_limit_events` table), NOT
  Redis (project position).
- `16-TEST-AND-VERIFICATION-PLAN.md` — the visual-regression check for the
  `bg-[color:var(--x)]` gotcha on treatment surfaces (§6).
- `17-ANALYTICS-AND-OBSERVABILITY.md` — the tool decision (L-ENG-2), the full event schema
  (this doc's §4.1.1 stub projects onto it), the consent-to-event wiring, the dashboard +
  alert channel the §5.3 alarms fire into.
- `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` — the file-level change inventory for the cutover;
  the 7-phase migration order; the rollback playbook (§2.3 `/legacy` is one input).
- `23-AUTH-EXPERIENCE.md` — the auth preview routes (§2.1); the CTA→`/signup` gating logic
  (§3.5); the merge-boundary events (§4.1 `signup`, `login_view`, `signup_view`).
- `LOOP_LEDGER.md` — open decisions: L-ENG-1 (perf targets), L-ENG-2 (analytics tool),
  L-ENG-3 (A/B provider extension), L-ENG-4 (baseline CVR — **new**, this doc), L-SEO-1
  (PH/SEA traffic share), L-FUN-1/L-FUN-2 (auth routing), L-REM-1…L-REM-5 (Hallmark removals).

---

## 8. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

- **L-ENG-2 — Analytics tool decision.** The event set (§4.1) is canonical; the tool is not
  chosen. Until chosen, events are logged to console + Vercel Web Analytics (already shipped)
  as a fallback; the §4.1.1 portable shape is the contract the chosen tool must project onto.
  Tracked in `LOOP_LEDGER.md`.
- **L-ENG-3 — A/B provider extension (§3.1).** The existing `getVariant` is a 2-variant 50/50
  binary; it needs three additive extensions (page-level split, `trafficFraction` ramp,
  registry entry for `landing-redesign-2026-06`). No new A/B library. Tracked in
  `LOOP_LEDGER.md`.
- **L-ENG-4 — Baseline `signup` CVR (NEW, this doc).** The §3.2 power calculation uses a 1.5 %
  baseline assumption because no analytics tool is wired yet. Once L-ENG-2 closes, replace
  with the observed control CVR and recompute n before declaring significance. Tracked in
  `LOOP_LEDGER.md`.
- **L-ENG-1 — Perf targets ratification.** The §5.3 alarm thresholds (AL-2/3/4) reconcile to
  the `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` targets (LCP < 2.0 s, CLS < 0.05, INP < 200 ms);
  if the owner ratifies different targets, the alarms retune.
- **L-SEO-1 — PH/SEA traffic-share.** The §3.2 70/30 PH/SEA split is an assumption; the
  clock-time-to-n estimate depends on it. Tracked in `LOOP_LEDGER.md` / `13-SEO-AND-DISCOVERY.md`.
- **L-FUN-1 / L-FUN-2 — Auth routing + self-serve.** The CTA→`/signup` target depends on
  these (§3.5); the A/B does not block on them, but the cutover does (§5.1 #6).
- **L-REM-1 → L-REM-5 — Owner confirmation of the removals rail.** The cutover cannot ship
  the new `/` while the old fabricated testimonials + hype hero + slideshow + logo footer are
  still live at `/` — the cutover IS the removal (§5.1 #5).
- **Claims sign-off gate (§5.1 #3).** The cutover waits on
  `09-CLAIMS-LEDGER-SIGN-OFF.md` passing.
- **Wedge-fit sub-test (§3.3).** If treatment loses on the contractor/estimator wedge, the
  cutover holds for copy revision.
- **Funnel co-dependencies (L-FUN-3, L-FUN-4).** First-run flow + P1 abuse guardrails
  (Postgres rate-limit, POST-only invite acceptance, token hashing with server pepper) are
  co-dependencies of the post-cutover `/signup` funnel; carried, not closed, per D-5.

---

## 9. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **94 / 100** | The rollout shape (preview → ramped A/B → claims gate → cutover → `/legacy`) is the right strategy for a low-traffic pre-revenue beta, and the §3.2 power calculation + §3.4 ramp rule + §3.5 CTA-gating consistency resolve the three hedged-open gaps the orchestrator flagged. Not 100 because the baseline CVR (1.5 %) and the PH/SEA 70/30 split are **assumptions** (L-ENG-4, L-SEO-1) that materially change the sample size and the clock-time; the strategy is sound but its execution clock is owner-gated on traffic reality, not just on this doc. |
| **Quality** | **96 / 100** | Every infrastructure claim is grep-verified against real source (`getVariant` 2-variant binary at `variant-assigner.ts:53`; consent gate at `:34-36`; bot guard at `:30-32`; `ab_test` cookie 30-day httpOnly:false at `:58-64`; `CookieConsentBanner` via `PublicPageShell.tsx:41`; `parseLandingConsentValue` at `consent.ts:23`; `hasLandingAnalyticsConsent` at `:62`; `getLandingAuthState` at `get-landing-auth-state.ts:10`; rate-limit table `security_rate_limit_events`). Cross-links resolve to canonical filenames; clay `#AA412A` appears nowhere as an active token (D-3 honored); the §4.1.1 payload shape binds to the D-4 ClaimStatus type. Not 100 because the §3.2 sample-size arithmetic uses the z-test approximation (fine for planning, but the final n should be confirmed in a stats calculator once the observed baseline lands — L-ENG-4), and the §5.3 alarm thresholds are policy I asserted, not owner-confirmed in their exact numeric form. |
| **Implementation-Readiness** | **90 / 100** | An implementer can act on this doc: the §3.1 three-point extension of `getVariant` is concrete, the §3.4 ramp rule is deterministic, the §5.3 alarms have magnitudes + windows, the §4.1.1 payload is a copyable TS type, and the §4.3 reuse list names exact files. Not 100 because: (a) L-ENG-2 (analytics tool), L-ENG-3 (A/B extension), L-ENG-4 (baseline CVR), and L-SEO-1 (traffic share) are all genuinely open and each blocks a different part of the rollout — the implementer can build the scaffolding but cannot *run* the A/B until L-ENG-2 + L-ENG-3 close; (b) the §5.3 alarms require a wired dashboard + alert channel (owned by doc 17, which itself waits on L-ENG-2); (c) the cutover (R3) genuinely waits on L-FUN-1/L-FUN-2 and the claims gate per D-5. These are honest open gates, not doc gaps — carrying them per README gate #4 rather than silently closing them is the D-5-correct posture. |

**Carried to LOOP_LEDGER (not silent):** L-ENG-1, L-ENG-2, L-ENG-3, **L-ENG-4 (new)**,
L-SEO-1, L-FUN-1, L-FUN-2, L-FUN-3, L-FUN-4, L-REM-1…L-REM-5, and the claims sign-off gate.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.**
The §3.2 baseline CVR (1.5 %) and the weekly-traffic estimate (~400–600) are explicitly
labeled as **planning assumptions** (L-ENG-4), not measured facts. Voice throughout =
Controlled Confidence (`00-OVERVIEW.md` §10). Rate-limiting is Postgres
(`security_rate_limit_events` table), NOT Redis (project position). Turnstile is NOT yet
built (planned); `/contact` + `/signup` abuse = honeypot + Postgres rate-limit + validation;
CAPTCHA escalation-only.
