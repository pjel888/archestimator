# 00 — Overview: The Landing Redesign at a Glance

> **PLANNING ONLY · 2026-06-22 · not code.**
> Status: planning pack for the Archestimator landing-page redesign. Nothing here is
> implementation. Every public-word suggestion obeys `06-PROOF-AND-CLAIMS-DISCIPLINE.md`
> (§15 claims discipline) and the Controlled Confidence voice (MASTER §10). Grounded in
> `ARCHESTIMATOR_MASTER.md` (cited as §X.Y), `DESIGN.md` (alpha guide, not law), and the
> existing `src/components/landing/` + `src/app/globals.css`.

**Purpose (one line):** the front door to the landing-redesign pack — the five ratified
keystone decisions, the three strategic pillars, the full-route scope, the doc dependency
graph and implementation entry order, the success criteria, and the owner sign-off gates.

---

## 0. The pivot (read this first)

This pack was authored under a first design direction — "The Document" (warm proposal-paper
`#FFFDF8` + Source Serif 4). **That direction is superseded for the public marketing surface.**
On **2026-06-22 the owner (Philip) ratified five keystone decisions (D-1…D-5)** that pivot the
landing and its auth surface to **"The Glass Brand"** — the SAME brand vocabulary Philip already
loves in the Workshop Dashboard and Estimate Sheet: liquid-glass surfaces over a warm grey
canvas, signal orange `#F24405` for presence, Doto + Roboto Mono + SF Pro typography.

The pivot rationale is **brand-whiplash avoidance**: the in-app surface the user lands in after
"Start free" is the Workshop Dashboard. If the public marketing site looks like a different
company (warm paper + serif), the click-through is a discontinuity — the user trusts the page
less, not more. The landing must embody the same brand the product does.

What is **preserved** from the prior direction (these survive the pivot and are still binding):

- The **radical-honesty proof engine** (Live/Building/Planned claims ledger; NO fabricated
  logos, stats, testimonials, badges, prices — `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §15 rail).
- The **named commercial-graph architecture plate** (`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`),
  re-skinned in glass instead of paper.
- The **CTAs**: "Start free" (primary) + "Book a walkthrough" (secondary).
- The **RSC-first architecture** (near-zero client JS; `07-ENGINEERING-CONSTRAINTS.md`).
- The **peg-study transferable patterns** (`22-PEG-STUDY-DEEP-DIVE.md`).

What is **demoted**: "The Document" direction is preserved in `01-DESIGN-DIRECTION.md` as
**Direction D — The Document** (a documented ALTERNATIVE, viable if Philip later prefers it;
NOT the default). Source Serif 4 is **DEFERRED** — the proposal export today is `.xlsx` and
does not ship serif, so the "same serif as your proposal" continuity claim CANNOT be made (see
`03-VISUAL-LANGUAGE-AND-TOKENS.md` §10 O-3, carried as L-DES-3).

> **Honesty note (decision D-5).** The prior `MASTER-AUDIT-AND-SCORECARD.md` claim of
> "100/100/100 across all docs" is **RECALLED** — it was self-assessed, not independently
> verified; an independent re-audit (2026-06-22) found averages ~85/85/72. This doc re-scores
> honestly. A doc is 100% only when verifiable; genuinely owner-gated items are CARRIED in
> `LOOP_LEDGER.md` (README gate #4 explicitly allows this), never silently marked closed.

---

## 1. What we are planning (executive summary)

Archestimator is **the cost intelligence layer for AEC teams** — a construction-cost estimating
platform where every estimate becomes reusable commercial knowledge (prices, suppliers,
revisions) that compounds, from estimate to client approval. Pre-launch MVP, closed-beta.
Primary market PH + SEA (§6.1, §4.1), mobile-first, mid-range Android on 4G.

This pack redesigns the **entire public marketing surface AND the auth surface** as one coherent
glass-brand system: routes `/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`, plus
`/login` and `/signup` (auth is in scope — see decision D-2 and `23-AUTH-EXPERIENCE.md`). The
homepage and auth surfaces are set on the **same warm grey canvas + liquid-glass vocabulary** as
the Workshop Dashboard, so the click from "Start free" into the product is brand-continuous, not
a whiplash. Proof comes from **radical honesty** (a Live/Building/Planned claims ledger and a
named commercial-graph architecture plate), not from logos, testimonials, stats, or badges —
none of which exist and §15 forbids inventing.

The redesign replaces a hype-led homepage that violates the current brand voice: the
"Start Winning / Win More Bids" hero is explicitly banned (§10.4, §16.4), three fabricated
testimonials are a §15 violation, and a 2.3MB frosted-construction hero PNG performs the exact
"dashboard that performs" anti-pattern the honesty posture rejects. Removing them is gated on
owner confirmation (Hallmark deletion rail; see §7 below and `08-ROLLOUT-AND-ANALYTICS.md`).

---

## 2. The five ratified keystone decisions (obeyed by every doc; do not relitigate)

These are settled (owner-directed by Philip, 2026-06-22). Sibling docs may reference and design
against them but **must not reopen them**. This is a HARD CROSS-DOC CONTRACT.

| # | Decision | Rationale / binding detail |
|---|---|---|
| **D-1** | **Design direction = "The Glass Brand"** (SUPERSEDES the prior locked-decision #1 "The Document"). | The landing MUST embody the SAME brand as the Workshop Dashboard + Estimate Sheet: liquid-glass surfaces (`.dashboard-glass` / `.dashboard-glass-warm` / `.workshop-workspace-glass-surface`, all gated on `data-glass="ready"`) over a warm grey canvas (`--warm-canvas #f5f5f5`), signal orange `--brand-orange #F24405` for presence (fills, logo slab, focus rings, accent rails) + `--brand-orange-dark #C63804` for AA small text, Doto (`--font-display`) + Roboto Mono (`--font-numeric`) + SF Pro (`--font-sf-pro`) typography, 8px rhythm, 3px/8px/12px radius scale. **"The Document"** (warm paper `--proposal-paper #fffdf8` + Source Serif 4) is **demoted to a documented ALTERNATIVE** preserved in `01-DESIGN-DIRECTION.md` as "Direction D — The Document"; viable if Philip later prefers it; NOT the default. **Source Serif 4 is DEFERRED** (the proposal export is `.xlsx` and does not ship serif yet; the "same serif as your proposal" continuity claim CANNOT be made). **Preserved** from the prior direction: the radical-honesty proof engine, the named commercial-graph plate (re-skinned in glass), "Start free"/"Book a walkthrough" CTAs, RSC-first architecture, the peg-study transferable patterns. |
| **D-2** | **Auth experience = full-page 2-column, brand-forward.** | `/login` + `/signup` are **FULL-PAGE routes** (NOT modals — better for SEO/noindex, shareable, mobile). 2-column: LEFT = brand glass panel (dashboard vocabulary, signal-orange logo slab, a tasteful brand composition — NO fake product screenshots; use the material-frost/glass composition or an abstract built from the dashboard gradients `--grad-hero-continue` / `--grad-hero-create`); RIGHT = auth fields. Collapses to single-column `<768px`. Auth model stays **Google OAuth + magic link (NO password)** — that is the real product model; do NOT invent password auth. "Start free" → `/signup` is **GATED on the beta-onboarding decision** (`LOOP_LEDGER.md` L-FUN-2); until then it routes to `/login` (magic-link handles signup) or `/contact`. The 2-col design is agnostic to this routing decision. Owned by `23-AUTH-EXPERIENCE.md`. |
| **D-3** | **Orange token discipline.** | Brand-fill = `--brand-orange #F24405` (large fills, logo slab, focus rings, accent rails, hover). Small text/icons on light = `--brand-orange-dark #C63804` (AA ~5.3:1 on white; `globals.css:38`). **Clay `#AA412A` is NOT a token, NOT used** — it appears in `DESIGN.md` prose only (the superseded pre-Signal "product" color) and is **not in `globals.css`**. Every reference to clay `#AA412A` anywhere in the pack is reconciled to `#C63804`. This is a HARD CROSS-DOC CONTRACT; every doc grep-verifies clean (no `#AA412A`, no `--clay`). |
| **D-4** | **ClaimStatus type contract.** | Single shared type: `"Live" | "Building" | "Planned" | "NotUs"`, defined in **one component** — `src/components/landing/shared/StatusPill.tsx`. The commercial-graph plate (`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`) uses a **SUBSET** (Live/Building/Planned — no NotUs nodes) but imports the SAME type and narrows at the call site. **No divergent type definitions.** HARD CONTRACT. |
| **D-5** | **Honest scoring.** | The prior `MASTER-AUDIT-AND-SCORECARD.md` claim of "100/100/100 across all docs" is **RECALLED** (self-assessed, not independently verified; independent re-audit 2026-06-22 found averages ~85/85/72). Re-score HONESTLY: a doc is 100% only when **verifiable**; genuinely owner-gated items are **CARRIED in `LOOP_LEDGER.md`** (README gate #4 explicitly allows this), never silently marked closed. NO self-congratulation. |

**Kept from the prior locked-decisions set** (these were #2/#3/#4 before the pivot and remain in
force, folded into D-1/D-2 above and restated here for visibility):

- **Primary CTA = "Start free"** (self-serve Free-tier signup; routing gated L-FUN-1/L-FUN-2);
  **Secondary = "Book a walkthrough".** This makes beta-onboarding + demo-data/reset rules
  (§7.5 launch gate), abuse guardrails (durable rate limiting, POST-only invite acceptance,
  token hashing with a server pepper — the P1 items, §8.6, §18.1), and the first-run flow
  (§18.3) into CO-DEPENDENCIES the plan must flag (docs 07, 15, 23). Free-tier signup does NOT
  require the unvalidated pricing or the billing mechanism (those gate CHARGING only, §9.3,
  §18.6).
- **Scope = the full marketing system + the auth surface** (decision D-2 / §4 below).
- **Proof strategy = radical honesty.** A claims-discipline ledger (Live/Building/Planned via
  the D-4 ClaimStatus type), private-by-design, and the named commercial-graph architecture
  (§8.3) visualized as a glass-skin SVG plate. NO customer logos, NO testimonials, NO adoption
  stats — none exist, and §15 forbids inventing them.

---

## 3. The three strategic pillars

- **P1 — Brand continuity IS the argument (the Glass Brand).** The landing and the auth surface
  are set on the same warm grey canvas and the same liquid-glass vocabulary as the Workshop
  Dashboard the user lands in after "Start free". The click-through is brand-continuous, not a
  whiplash. Credibility comes from **craft + honesty + a coherent product**, not from a paper
  specimen that looks like a different company. The glass surfaces reuse the real token system
  (`.dashboard-glass`, `data-glass="ready"`, `--glass-bg`, `--glass-blur 18px`, `--glass-radius
  12px`); the deferred-glass arming pattern (paint blur-OFF first, arm after first paint+idle
  via `<html data-glass="ready">` + double-rAF + `requestIdleCallback` + a 1500ms hard backstop;
  at most 4 simultaneous blur panels) is reused verbatim. No construction-photo slideshow, no
  re-drawn fake browser/IDE chrome (Hallmark bans re-drawn chrome).
- **P2 — Honesty is the proof engine.** `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §15 governs every
  public word; §4.4#6 makes honesty the brand. The homepage carries a Live/Building/Planned
  claims ledger (typed per D-4) so the reader can see exactly what is real today. This replaces
  the unavailable-and-forbidden proof props (logos, testimonials, metrics, compliance badges)
  that Intercom and Amigo lean on (`22-PEG-STUDY-DEEP-DIVE.md`).
- **P3 — A named architecture nobody else has drawn: the commercial graph (§8.3).** Visualized
  as a claims-tagged SVG architecture plate in glass-skin — like Amigo names its "Cognitive
  Architecture," but ours, and every node claims-tagged Live / Building / Planned (per the D-4
  ClaimStatus subset). Live nodes: The Estimate Tree ↔ The Component Library ↔ The Activity
  Record → The Proposal Handoff. Building: Surfacing. Planned: Supplier Bridge (full spec in
  `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`).

---

## 4. Scope: the routes and their jobs

Full system, shared shell, shared tokens. Canonical website structure per §12.1; homepage
section taxonomy per `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`. **Auth is in scope** (D-2).

| Route | Job in the funnel | Voice (§10.7) | Primary owner doc |
|---|---|---|---|
| `/` | Awareness — hero §11.1, the problem, the layer + commercial-graph plate, what you get §11.2, how it works §7.3, who it is for §11.3, claims ledger, why-not-spreadsheet §11.4, founder §11.5, pricing philosophy §9.3, final CTA | calm conviction + the hook | `02`, `04`, `05`, `06` |
| `/features` | Evaluation — mechanic-forward, Live/Building/Planned truth block | precise, honest, Live/Building/Planned visible | `05` (copy) + `06` (matrix) |
| `/pricing` | Conversion — pricing **philosophy only**; no mature-plan language, no published locked price (§9.3 is HYPOTHESIS) | restrained, honest about hypothesis | `05` |
| `/about` | Trust — founder intro §11.5, the company | introduction energy, human | `05` (⚠️ GATED on founder bio — L-FND-1) |
| `/contact` | Conversion — "Book a walkthrough" + reach | steady, direct | `05` (copy) + `15` (form/abuse) |
| `/trust` (NEW) | Trust — claims ledger + private-by-design + the named architecture | steady, protected, honest | `06` (claims + privacy) + `04` (the plate) |
| `/login` | Conversion — returning-user auth (Google OAuth + magic link; NO password) | steady, direct, brand-forward | `23` (⚠️ GATED L-FUN-1) |
| `/signup` | Conversion — new-user auth (Google OAuth + magic link; NO password). **Self-serve is GATED** on L-FUN-1/L-FUN-2; until then "Start free" routes to `/login` or `/contact` | steady, direct, brand-forward | `23` (⚠️ GATED L-FUN-1/L-FUN-2) |

Funnel CTAs follow §12.1: View features → Explore MVP preview → Request/Start free → Learn more
→ Book a walkthrough / Contact. **Both `/login` and `/signup` are `noindex,nofollow`** (not
indexed, not followed) per `13-SEO-AND-DISCOVERY.md`; full-page routes (not modals) so they are
shareable and mobile-friendly (D-2).

---

## 5. How to read this pack (doc map)

Each doc is standalone with a status banner, a one-line purpose, cross-links, and a
"⚠️ Gated on / Open decisions" section. Read this one first; pull the rest on demand.
**Canonical filenames live in `10-CANONICAL-DOC-MAP.md` §1** — every cross-doc link in the pack
reconciles to those names; this map is the navigable summary.

### 5.1 The 8 original core planning docs

| Doc | One-line purpose |
|---|---|
| **`00-OVERVIEW.md`** (this doc) | Front door: the five ratified decisions, pillars, scope, doc dependency graph, success criteria, sign-off gates. |
| **`01-DESIGN-DIRECTION.md`** | Why the Glass Brand (D-1) wins; the Intercom + Amigo peg study (verified 2026-06-21); what transfers (craft, named-architecture move, bold category hook, tab-driven hero *move*) vs. what does not (logo walls, testimonials, stats, compliance badges, AI-hero, "the only…", transparent pricing, photographic backgrounds). **Preserves "Direction D — The Document" as a documented alternative** (demoted by D-1). |
| **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`** | The canonical DOM-order section taxonomy (Header · 1 Hero · 2 Problem · 3 Layer + commercial-graph plate · 4 What you get · 5 How it works · 6 Who it is for · 7 What is real today · 8 Why not a spreadsheet · 9 Founder · 10 Pricing honestly · 11 Final CTA · Footer) + per-route inventories + nav/footer archetypes + funnel logic. The single source of section order; 04/05/06/11 defer to it. |
| **`03-VISUAL-LANGUAGE-AND-TOKENS.md`** | The additive token layer for `globals.css` bound to the Glass Brand (D-1): warm grey canvas, glass classes, signal orange `#F24405` + dark `#C63804` (D-3), Doto + Roboto Mono + SF Pro type, 3px/8px/12px radius scale, restrained motion, deferred-glass arming. (Source Serif 4 DEFERRED — D-1.) |
| **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`** | Full spec for the named, claims-tagged SVG architecture plate (glass-skin): Live/Building/Planned nodes (L1 Estimate Tree · L2 Component Library · L3 Activity Record · L4 Proposal Handoff · B1 Surfacing · P1 Supplier Bridge), the glass visualization, a11y (collapses to vertical stack on mobile), and the hover interactivity that is one of the few hydrating leaves. Imports the D-4 ClaimStatus type and narrows to the Live/Building/Planned subset. |
| **`05-COPY-SKELETON.md`** | Per-route, voice-locked, claims-tagged copy grounded in §11 deployable copy pack + §15 discipline; the approved/banned lines (§10.4) enforced; the cement-anchor pricing frame as concept only. |
| **`06-PROOF-AND-CLAIMS-DISCIPLINE.md`** | The radical-honesty proof system: `<ClaimsLedger>` component spec, the exhaustive CLAIMS MATRIX (every public claim → status → § source), the private-by-design trust block, the §15 REMOVALS rail, `/trust` content, and the claims-status update process. Owns the §15 mapping for every public word. Uses the D-4 ClaimStatus type. |
| **`07-ENGINEERING-CONSTRAINTS.md`** | RSC-first build (mirror the workshop-dashboard RSC pattern), mobile at 320/375/414/768, `overflow-x: clip`, LCP = text headline (no heavy hero image), `next/image`, Core Web Vitals targets, contrast-safe ink, instant `:focus-visible` ring, and the Start-free funnel CO-DEPENDENCIES (beta onboarding, abuse guardrails, first-run flow). |

### 5.2 The additional docs created by the improvement pass

The pack's original 0–7 numbering was authored before the missing-doc inventory surfaced the
gaps below. Rather than renumber (which would break every citation), the new docs take numbers
08–23. **15 additional docs** were created (the count is 15, not "9" — the prior §5.2 miscount
is corrected here).

| Doc | One-line purpose |
|---|---|
| **`08-ROLLOUT-AND-ANALYTICS.md`** | `/newdesign`-style preview route, A/B old vs new, claims sign-off gate, analytics events per route, success metrics, 30-day `/legacy` rollback window. |
| **`09-CLAIMS-LEDGER-SIGN-OFF.md`** | The public sign-off gate; the §7.5 "public claims matrix complete" launch gate, operationalized. |
| **`10-CANONICAL-DOC-MAP.md`** | The canonical filenames; every cross-doc link reconciles to this. |
| **`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`** | React/RSC component inventory: file paths, props, RSC/client designation, the copy → component map, nav/header/footer anatomy, removals. |
| **`12-ACCESSIBILITY-AUDIT.md`** | Consolidated WCAG 2.1 AA audit + contrast table + keyboard contract + semantics + motion + forms a11y + SR critical paths + test plan. |
| **`13-SEO-AND-DISCOVERY.md`** | Keyword strategy, per-route meta copy, sitemap + robots + canonical, structured data, internal linking, PH/SEA search-volume validation, measurement. Owns `/login` + `/signup` `noindex,nofollow`. |
| **`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`** | CWV targets, field-vs-lab methodology, PH+SEA device class, JS/font budgets, CI regression gate, remediation playbook. |
| **`15-FORMS-AND-ABUSE-GUARDRAILS.md`** | `/contact` + `/signup` form-spam defense, durable rate limiting (**Postgres `security_rate_limit_events` table, NOT Redis**), honeypot, CAPTCHA decision (Turnstile NOT yet built — escalation-only), abuse monitoring. |
| **`16-TEST-AND-VERIFICATION-PLAN.md`** | Unit / component / e2e / visual (Storybook) / a11y / perf / claims test plan; the CI shape. |
| **`17-ANALYTICS-AND-OBSERVABILITY.md`** | Event schema, tool decision (PostHog recommended), consent model, retention + privacy, dashboard, moat-metric instrumentation. |
| **`18-I18N-AND-LOCALIZATION.md`** | Locale strategy (EN-only at launch with documented FIL+ID roadmap), hreflang, sitemap localization, copy-idiom discipline, validation plan. |
| **`19-ASSET-PIPELINE-AND-IMAGERY.md`** | Favicons, OG images per route, founder photo, wordmark SVG, asset pipeline, the "what we will NOT ship" rail. |
| **`20-CONTENT-WORKFLOW-AND-GOVERNANCE.md`** | Who writes/reviews/signs off, where copy lives (repo Markdown vs CMS), update cadence, bilingual workflow. |
| **`21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`** | File-level change inventory, deletion rail, migration order (7 phases), risk register, rollback playbook. |
| **`22-PEG-STUDY-DEEP-DIVE.md`** | Full DNA extraction from Intercom + Amigo with URLs + dates for evidence; backs `01-DESIGN-DIRECTION.md` §4. |
| **`23-AUTH-EXPERIENCE.md`** | The full-page 2-column auth surface (D-2): `/login` + `/signup` layout, brand glass panel, Google OAuth + magic link (NO password), `noindex,nofollow`, mobile single-column collapse, "Start free" routing gated L-FUN-1/L-FUN-2. |

### 5.3 Pack-level meta docs

| Doc | One-line purpose |
|---|---|
| **`README.md`** | Pack entry point: doc-order, dimension ownership, the Definition of 100 %. |
| **`LOOP_LEDGER.md`** | The open-decision queue + iteration state + owner-decision queue. Every `⚠️ GATED ON` item has a row here; no gate is silently dropped. |
| **`MASTER-AUDIT-AND-SCORECARD.md`** | The audit + scorecard (this pack's quality gate). **The prior "100/100/100" claim is recalled per D-5**; re-scored honestly. |

**Doc count:** 8 original (00–07) + 16 additional (08–23) + 3 meta (README, LOOP_LEDGER,
MASTER-AUDIT) = **27 docs** total. (§5.2 lists 16 numbered additional docs 08–23; the prior
"9 additional docs" miscount — which actually listed 15 — is corrected here.)

---

## 6. Success criteria

The redesign is done (planning) when ALL of these hold:

1. **Ratified decisions obeyed.** Every doc uses the Glass Brand (D-1), the full-page 2-column
   auth (D-2), orange token discipline (D-3), the single ClaimStatus type (D-4), and honest
   scoring (D-5) — no doc reopens them and no doc references clay `#AA412A` or the old
   paper/serif direction as the default.
2. **§15 honored on every public word.** No invented features, metrics, testimonials, prices, or
   partner names anywhere. AI not featured as current (deferred, §7.2, §16.1). No "only we / the
   only tool that…" (§2). No aggregator / "database of estimates" language (§3.3).
3. **§10 voice enforced.** Controlled Confidence throughout; the banned hero lines gone (§10.4,
   §16.4); approved lines from §10.4 / §11 used where copy is suggested.
4. **Coherent system, not a homepage.** Shared shell, shared tokens (`03-VISUAL-LANGUAGE-AND-TOKENS.md`),
   shared claims ledger (`06-PROOF-AND-CLAIMS-DISCIPLINE.md`), consistent glossary across all
   eight routes. The landing + auth + Workshop Dashboard share ONE brand vocabulary (D-1).
5. **The named architecture is drawn.** `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` delivers the
   commercial-graph plate with every node claims-tagged Live/Building/Planned (D-4 subset).
6. **Engineering is RSC-first and accessible.** `07-ENGINEERING-CONSTRAINTS.md` specifies
   near-zero client JS (only the plate hover and claims ledger hydrate), mobile coverage at
   320/375/414/768, contrast-safe ink, text-LCP, deferred-glass arming.
7. **Co-dependencies flagged, not assumed.** The Start-free funnel's gates (beta onboarding,
   demo-data/reset, abuse guardrails, first-run flow) and the `/about` founder-bio gate are
   marked ⚠️ GATED ON wherever the plan leans on them, and each has a row in `LOOP_LEDGER.md`.
8. **Rollout is preview-first and claims-gated.** `08-ROLLOUT-AND-ANALYTICS.md` ships behind a
   preview route with a claims sign-off before any public cutover.
9. **Cross-link integrity = 100 %.** Every cross-doc link in every doc resolves to a canonical
   filename in `10-CANONICAL-DOC-MAP.md` §1; the verification grep returns zero stale aliases.
10. **Every dimension has an owner.** Every dimension named in `README.md` §3 + the
    `10-CANONICAL-DOC-MAP.md` §5 dimension-ownership table has a doc that owns it. No dimension
    is silently uncovered. Dimensions include: **a11y** (`12`), **perf** (`14`), **SEO** (`13`),
    **i18n** (`18`), **analytics** (`17`), **auth** (`23`), **forms/abuse** (`15`), **test**
    (`16`), **assets** (`19`), **content governance** (`20`), **blast radius** (`21`).
11. **Honest scoring (D-5).** A doc scores 100/100/100 only when **independently verifiable**.
    Genuinely owner-gated items are CARRIED in `LOOP_LEDGER.md` (README gate #4 explicitly allows
    this) and reduce a doc's Implementation-Readiness score honestly until the gate closes —
    they are never silently marked closed. No self-congratulation.

---

## 7. ⚠️ Owner sign-off gates (what each gate blocks)

These are the items this plan depends on but **cannot resolve in planning**. Each is flagged for
owner sign-off and mapped to the docs/routes it blocks. Items marked ⚠️ NEEDS INPUT trace to §17.
**Per D-5, none of these are silently marked closed**; each has a row in `LOOP_LEDGER.md`.

| Gate | Decision needed | Blocks (docs / routes) | Ledger ID | Status |
|---|---|---|---|---|
| **G-1 Brand ratification (R-items)** | R1 Lead category, R2 Uniqueness claim, R3 Hook vs MVP, R4 Brand promise, R9 Voice principles, R10 Privacy stance — keep assumed. | Hero copy (`01`, `05` §1); `04` Supplier Bridge node; `06` claims ledger + Surfacing node; `05` §4 benefit blocks; `05` §10.4 lines; `/trust` + `06` privacy block. | L-RAT-1…6 | ⚠️ GATED ON owner ratify (keep assumed) |
| **G-2 "Start free" routing** | Auth route for "Start free" (`/signup` vs `/auth/signup` vs `/start`). | Hero CTA href; footer sitemap href (`05`); `23` sign-off. | L-FUN-1 | ⚠️ GATED ON — recommend `/signup` |
| **G-3 Beta onboarding + reset** | Demo-data/reset rules before self-serve signup. | Self-serve `/signup` activation; moat metric; `23` self-serve readiness. | L-FUN-2 | ⚠️ GATED ON |
| **G-4 First-run flow** | Signup → demo project → first estimate → first reuse → first share. | Activation quality; `23` post-signup path. | L-FUN-3 | ⚠️ NEEDS INPUT |
| **G-5 Abuse guardrails (P1)** | Durable rate limiting (**Postgres `security_rate_limit_events`, NOT Redis**), POST-only invite acceptance, token hashing + server pepper. | Any public self-serve `/signup`; `/contact` form; `15`; `23`. | L-FUN-4 | ⚠️ GATED ON |
| **G-6 Founder bio assets** | Credentials, photo, links. | Homepage §9 founder section; `/about` richness (`05`). | L-FND-1 | ⚠️ NEEDS INPUT — ship §11.5 paragraph without it meanwhile |
| **G-7 Pricing validation** | ≥5 discovery calls + ≥2 beta users building a real estimate + Van Westendorp before any peso number. | `/pricing` numeric content; homepage §10 (`05`). | L-PRC-1 | ⚠️ GATED ON — `/pricing` ships philosophy only until then |
| **G-8 Removals (Hallmark rail)** | Owner OK to delete: 3 fabricated testimonials; hype hero; construction-photo slideshow + 2.3MB hero PNG; logo-only footer. | Removal rail execution (`06` §4; `02`; `08`; `21`). | L-REM-1…4 | ⚠️ GATED ON owner OK |
| **G-9 Legal / entity / privacy** | Legal entity; Privacy Policy + ToS + DPA; DPA posture; BIR registration (charging only). | Any `/trust` compliance language; `/signup` handling personal data; invoicing (`06`). | L-LEG-1…4 | ⚠️ NEEDS INPUT |
| **G-10 Engineering targets** | LCP < 2.0s, CLS < 0.05, INP < 200ms, JS < 40KB gz ratification; A/B provider; analytics tool. | Treating perf targets as gates (`14`); old-vs-new A/B (`07`); analytics instrumentation (`17`). | L-ENG-1/2/3 | ⚠️ GATED ON |
| **G-11 Glass-Brand visual final** | Confirm D-1 glass-brand direction as shipped (the pivot is ratified; the rendered result wants one look). | `03` token finalization; `01` alternative preservation; `04` plate skin; `23` auth panel composition. | L-DES-1…5 | ⚠️ GATED ON (mechanics proceed) |
| **G-12 SEO/i18n validation** | PH/SEA keyword volumes; launch locale (EN-only? EN+FIL?). | SEO-driven copy (`13`); hreflang + sitemap localization (`18`). | L-SEO-1 / L-I18N-1 | ⚠️ NEEDS INPUT |

---

## 8. Cross-links

- **Sibling docs** (canonical names per `10-CANONICAL-DOC-MAP.md`): `01-DESIGN-DIRECTION.md` ·
  `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` · `03-VISUAL-LANGUAGE-AND-TOKENS.md` ·
  `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` · `05-COPY-SKELETON.md` ·
  `06-PROOF-AND-CLAIMS-DISCIPLINE.md` · `07-ENGINEERING-CONSTRAINTS.md` ·
  `08-ROLLOUT-AND-ANALYTICS.md` · `09-CLAIMS-LEDGER-SIGN-OFF.md` ·
  `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` · `12-ACCESSIBILITY-AUDIT.md` ·
  `13-SEO-AND-DISCOVERY.md` · `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` ·
  `15-FORMS-AND-ABUSE-GUARDRAILS.md` · `16-TEST-AND-VERIFICATION-PLAN.md` ·
  `17-ANALYTICS-AND-OBSERVABILITY.md` · `18-I18N-AND-LOCALIZATION.md` ·
  `19-ASSET-PIPELINE-AND-IMAGERY.md` · `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` ·
  `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` · `22-PEG-STUDY-DEEP-DIVE.md` ·
  `23-AUTH-EXPERIENCE.md` · `MASTER-AUDIT-AND-SCORECARD.md` · `10-CANONICAL-DOC-MAP.md` ·
  `README.md` · `LOOP_LEDGER.md`.
- **Grounding:** `ARCHESTIMATOR_MASTER.md` at `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` (v4.3,
  2026-06-18; cited as §X.Y throughout) · `PRODUCT.md` · `DESIGN.md` (alpha guide, not law) ·
  `src/components/landing/` (current, to be replaced per `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`)
  · `src/app/globals.css` (verified tokens: `--brand-orange #F24405` L37, `--brand-orange-dark
  #C63804` L38, `--brand-orange-soft` L39, `--brand-amber #e7a977` L53, `--brand-peach #f4cdb0`
  L54, `--warm-canvas #f5f5f5` L17, `--proposal-paper #fffdf8` L98, `--ink #3D3D3D` L10,
  `--secondary #5d5d5d` L11, `--muted-foreground #6b6b6b` L26, `--hairline #f2f2f2` L18,
  `--success #15803d` L92, `--warning #b45309` L94, `--danger #b91c1c` L96, `.dashboard-glass`
  L1229, `.dashboard-glass-warm` L1753, `.workshop-workspace-glass-surface` L1261, `--glass-bg
  rgba(255,255,255,0.72)` L108, `--glass-blur 18px` L110, `--glass-radius 12px` L116,
  `--glass-nav-radius 8px` L117, `@property --glass-blur-amount` L287, `--grad-canvas-wash` L62,
  `--grad-hero-continue` L59, `--grad-hero-create` L60, `--font-display` L203, `--font-numeric`
  L204, `--font-sf-pro` L99, `--radius-xs 3px` L100; `--clay` / `#AA412A` ABSENT — D-3) ·
  `src/app/page.tsx` + `src/app/layout.tsx` (current entry points).
- **Adjacent packs:** `2026-06-20-Shared-Link-Feature` (the Proposal Handoff node is Live shared
  links), `2026-06-20-Library-Page-Overall-Improvement` (the Component Library node),
  `2026-06-19-Launch-Readiness-Audit` (the Start-free funnel gates live here).

---

## 9. Implementation entry order + dependency graph

### 9.1 Implementation entry order (for the implementer)

A competent implementer (Codex / human dev) reads the pack in this order before writing any
code. Each step has a clear hand-off:

1. **`README.md`** — the pack entry point; the Definition of 100 %.
2. **`00-OVERVIEW.md`** (this doc) — the five ratified decisions, the scope, the success
   criteria, the dependency graph.
3. **`01-DESIGN-DIRECTION.md`** — *why* the Glass Brand (D-1) direction (so visual calls are not
   re-derived) + "Direction D — The Document" as the preserved alternative.
4. **`10-CANONICAL-DOC-MAP.md`** — the canonical filenames; every cross-link reconciles here.
5. **`03-VISUAL-LANGUAGE-AND-TOKENS.md`** — the tokens (additive to `globals.css`, bound to the
   Glass Brand).
6. **`23-AUTH-EXPERIENCE.md`** — the full-page 2-column auth surface (D-2) before any auth code.
7. **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`** — the DOM order; what renders where.
8. **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`** — the keystone section spec (the plate).
9. **`05-COPY-SKELETON.md`** — the words, voice-locked.
10. **`06-PROOF-AND-CLAIMS-DISCIPLINE.md`** — the claims matrix + the §15 rail.
11. **`07-ENGINEERING-CONSTRAINTS.md`** — the build contract (RSC-first, perf, a11y, funnel).
12. **`08-ROLLOUT-AND-ANALYTICS.md`** — the preview route + the claims sign-off gate.
13. **`09-CLAIMS-LEDGER-SIGN-OFF.md`** — the public sign-off gate; cutover waits on this.
14. **`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`** — the component pick-list.
15. **Dimension docs (12–22) on demand** — pull the one that matches the work (a11y, SEO, perf,
    forms, test, analytics, i18n, assets, content, peg-study).
16. **`21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`** — **read before any code touches the tree**; the
    file-level change inventory + the 7-phase migration order + the rollback playbook.
17. **`LOOP_LEDGER.md`** — the open decisions; confirm a gate is closed before leaning on it.

### 9.2 Doc dependency graph (which docs BLOCK which)

Read top-down: a doc depends on the docs above it. "Blocks" = the lower doc cannot be finalized
until the higher doc is settled. Dimension docs (12–22) depend on the spine but are largely
parallelizable among themselves.

```
README ─┐
        ├─► 00-OVERVIEW (this doc) ──┬─► 01-DESIGN-DIRECTION ──┐
        │                            │                          │
        │                            ├─► 03-VISUAL-LANGUAGE ────┤  (D-1, D-3 tokens)
        │                            │                          │
        │                            ├─► 23-AUTH-EXPERIENCE ────┤  (D-2; gated L-FUN-1/2)
        │                            │                          │
        │                            ├─► 02-SECTION-TAXONOMY ──┐│
        │                            │                        ├┤
        │                            └─► 10-CANONICAL-DOC-MAP ││ (cross-link source of truth)
        │                                                     ││
        │   01 + 03 ──► 04-COMMERCIAL-GRAPH-PLATE ◄───────────┘│  (D-4 ClaimStatus subset)
        │                                                     │
        │   02 + 04 ──► 05-COPY-SKELETON ◄─────────────────────┤
        │                                                     │
        │   05 ──► 06-PROOF-AND-CLAIMS-DISCIPLINE ◄────────────┤  (D-4 ClaimStatus)
        │                                                     │
        │   03 + 06 ──► 07-ENGINEERING-CONSTRAINTS ◄───────────┘
        │
        │   07 ──► 11-COMPONENT-INVENTORY
        │   07 ──► 14-PERFORMANCE-AND-CORE-WEB-VITALS  ──┐
        │   07 ──► 12-ACCESSIBILITY-AUDIT               ──┤
        │                                               ├── dimension layer (largely parallel)
        │   05 ──► 13-SEO-AND-DISCOVERY                 ──┤   (each depends on the spine,
        │   05 ──► 18-I18N-AND-LOCALIZATION             ──┤    not on each other)
        │   05 ──► 19-ASSET-PIPELINE-AND-IMAGERY        ──┤
        │   23 ──► 15-FORMS-AND-ABUSE-GUARDRAILS        ──┤
        │   06 ──► 17-ANALYTICS-AND-OBSERVABILITY       ──┤
        │   06 ──► 16-TEST-AND-VERIFICATION-PLAN        ──┤
        │   01 ──► 22-PEG-STUDY-DEEP-DIVE               ──┤
        │   05 ──► 20-CONTENT-WORKFLOW-AND-GOVERNANCE   ──┘
        │
        │   ALL ──► 21-BLAST-RADIUS-AND-MIGRATION-PLAN  (read before ANY code)
        │   06 ──► 09-CLAIMS-LEDGER-SIGN-OFF            (the public gate)
        │   09 + 07 ──► 08-ROLLOUT-AND-ANALYTICS        (cutover waits on this)
        │
        └─► LOOP_LEDGER  (open decisions; confirm a gate closed before leaning on it)
```

**Critical path (the spine):** `README → 00 → 01 + 03 → 23 → 02 → 04 → 05 → 06 → 07 → 08/09`.
Every dimension doc hangs off the spine; `21` (blast radius) and `LOOP_LEDGER` (gates) are read
last and apply across the whole pack.

**Hard blockers (a lower doc is NOT finalizable until the higher is settled):**

- `03-VISUAL-LANGUAGE-AND-TOKENS` **blocks** `04`, `05`, `07`, `23` (the token contract must
  settle before any concrete surface is specced).
- `01-DESIGN-DIRECTION` **blocks** `04` (the plate skin — glass vs paper — follows the
  direction) and `23` (the auth brand-panel composition).
- `02-SECTION-TAXONOMY` **blocks** `05` (copy order follows section order) and `11` (component
  inventory follows DOM order).
- `04-COMMERCIAL-GRAPH-PLATE` + `06-PROOF-AND-CLAIMS-DISCIPLINE` **block**
  `09-CLAIMS-LEDGER-SIGN-OFF` (the sign-off gate cannot be defined before the claims + plate
  are).
- `07-ENGINEERING-CONSTRAINTS` + `09` **block** `08-ROLLOUT-AND-ANALYTICS` (the cutover plan
  needs the build contract + the sign-off gate).
- `21-BLAST-RADIUS-AND-MIGRATION-PLAN` **blocks any code** (it is the file-level change
  inventory + rollback playbook; read it before touching the tree).

---

## 10. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`)

Per D-5, no gate is silently marked closed. The full owner-decision queue lives in
`LOOP_LEDGER.md` §2; the sign-off gate table in §7 above is the navigable summary. The load-bearing
gates for THIS doc are:

- **G-1…G-12** (§7) — every gate maps to a `LOOP_LEDGER.md` L-* ID.
- **D-1 pivot ratification** — the Glass Brand pivot is ratified (Philip, 2026-06-22); the
  rendered visual result wants one owner look (G-11 / L-DES-1…5) before `03`/`04`/`23` finalize.
- **D-2 auth routing** — "Start free" → `/signup` is gated L-FUN-1/L-FUN-2; the 2-col design is
  agnostic to the routing decision.
- **Source Serif 4 DEFERRED** (D-1) — the proposal export is `.xlsx`; the continuity claim is
  aspirational; tracked as L-DES-3. The Glass Brand ships Doto + Roboto Mono + SF Pro instead.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.**
Voice throughout = Controlled Confidence (§10). Pricing framing stays hypothesis-labeled per
§9.3 (do not publish a locked price). Rate-limiting is Postgres (`security_rate_limit_events` table), NOT Redis
(project position). Turnstile is NOT yet built (planned); `/contact` + `/signup` abuse = honeypot
+ Postgres rate-limit + validation; CAPTCHA escalation-only.
