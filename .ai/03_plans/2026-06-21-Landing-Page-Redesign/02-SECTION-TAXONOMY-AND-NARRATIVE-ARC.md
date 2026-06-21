# 02 — Section Taxonomy & Narrative Arc (The Glass Brand)

> **STATUS: PLANNING ONLY · 2026-06-21 (revised 2026-06-22 per ratified keystone decisions D-1…D-5) · not code.**
> **Direction:** THE GLASS BRAND (keystone decision D-1). Every section below is a
> **liquid-glass surface over the warm grey canvas** (`--canvas`/`--warm-canvas` `#f5f5f5`,
> `globals.css:16-17`), the SAME material the Workshop Dashboard and Estimate Sheet are made
> of — NOT a paper column. The prior "warm paper `#FFFDF8` + Source Serif 4 document" direction
> is **demoted to a documented ALTERNATIVE** (`01-DESIGN-DIRECTION.md` §3.4 "Direction D — The
> Document"); it is NOT the default and this doc no longer binds to it.
>
> **Purpose (one line):** the canonical DOM section map for the whole marketing system + the
> auth entry. Defines the homepage DOM order, the per-route section inventories for `/`,
> `/features`, `/pricing`, `/about`, `/contact`, and the NEW `/trust`, plus the nav and footer
> archetypes and the end-to-end funnel logic (including the auth entry: hero "Start free" →
> `/signup`, gated). Docs **05 (copy)** and **11 (component inventory)** link here instead of
> re-defining sections.

---

## 0. How to read this doc

This doc owns the **map**: what sections exist, in what order, for what purpose, at what funnel
stage, at what scroll depth, rendered by what RSC layer, carrying which CTAs. It does **not** own:
the visual tokens (→ **03-VISUAL-LANGUAGE-AND-TOKENS**), the full commercial-graph plate spec
(→ **04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE**), the actual deployed copy (→ **05-COPY-SKELETON**),
the component DOM/props (→ **11-COMPONENT-INVENTORY-AND-CONTENT-MAP**), or the engineering build
(→ **07-ENGINEERING-CONSTRAINTS**). Every public-word suggestion here obeys §15 (Claims
Discipline) and the Controlled-Confidence voice (§10 of `00-OVERVIEW.md`); every dependency this
doc leans on but cannot resolve is marked `⚠️ GATED ON` (§9) and carried in `LOOP_LEDGER.md`.

Glossary terms used throughout: AEC · BOQ · DUPA · cost intelligence layer · cost proposal · cost
estimate · the commercial graph · Controlled Confidence · **Live / Building / Planned** (the
single shared `ClaimStatus` type, D-4 — "Partial" is reconciled to `Building`) · cement anchor ·
accent rail (signal-orange presence mark, not a literal annotation) · Glass Brand · Free tier /
Solo / Pro / Team. **Source Serif 4 / proposal-paper are NOT load-bearing terms in the Glass
Brand** — they belong to the demoted Alternative D only.

### 0.1 The brand-vocabulary contract this doc binds to (D-1, D-3)

Every visual decision in §1–§5 is bound to a **real token in `src/app/globals.css`** (verified by
grep on 2026-06-22). Tokens cited in this doc, with their anchors:

| Concept | Token (anchor in `globals.css`) | Role in a section |
|---|---|---|
| Page background | `--canvas`/`--warm-canvas` `#f5f5f5` (L16-17) + `--grad-canvas-wash` (L62) | The warm grey wash every section floats on |
| Glass surface | `.dashboard-glass` / `.dashboard-glass-warm` / `.workshop-workspace-glass-surface`; `--glass-bg rgba(255,255,255,0.72)` (L108); `--glass-blur 18px` (L110); `--glass-radius 12px` (L116); `--glass-nav-radius 8px` (L117); `@property --glass-blur-amount` (L287) | The section container material (the Glass Brand) |
| Presence accent (D-3) | `--brand-orange #F24405` (L37) — fills, logo slab, focus rings, **accent rail**; `--brand-orange-dark #C63804` (L38) — AA small text/icons `< 24px`; `--brand-orange-soft` 14% mix (L39) — soft wash behind a tagged ledger row / graph node | One presence mark per viewport; never as body text |
| Ink | `--ink #3D3D3D` (L10); `--secondary #5d5d5d` (L11); `--muted-foreground #6b6b6b` (L26) | Headlines; AA meta/caption; tertiary meta |
| Hairline | `--hairline #f2f2f2` (L18) | Section/card separation on glass |
| Type | `--font-display` Doto (L203); `--font-numeric` Roboto Mono (L204); `--font-sf-pro` (L99) | Editorial headlines; numerals; UI chrome |
| Radius | `--radius-xs` 3px (L100); `--glass-nav-radius` 8px (L117); `--glass-radius` 12px (L116) | The ONLY three radii (PRODUCT.md scale) |
| Hero gradients | `--grad-hero-continue` (L59); `--grad-hero-create` (L60) | The hero brand composition (abstract, NOT a fake screenshot) |
| Logo slab | `--glass-logo-orange #F24405` (L131) | Nav + auth-panel brand mark |

**Clay `#AA412A` is NOT a token, NOT used** (D-3; `DESIGN.md` prose only; ABSENT from
`globals.css`). `#FFFDF8` (`--proposal-paper`, L98) is an **accent option only**, never the page
background — it is reserved for at most one callback surface (a `/trust` pull-quote) and belongs
to Alternative D, not the default.

---

## 1. The homepage section taxonomy (CANONICAL DOM order)

This is the canonical order. Docs 04, 05, and 11 must use exactly this numbering and these names.
Source cites are `(§X.Y)` against `ARCHESTIMATOR_MASTER.md`. "Funnel stage" uses the four stages
defined in §5 below. "Primary CTA" = whether the **"Start free"** primary or the **"Book a
walkthrough"** secondary appears in that section's chrome; most sections carry neither (the CTAs
live in the Header, Hero, Final CTA, and Footer), per the brief's CTA discipline. **"Render layer"**
references the RSC/hydration split owned by **07-ENGINEERING-CONSTRAINTS §1.2**. **"Scroll depth"**
is the intent band (how deep a reader must scroll to reach the section), which drives the §5.2
mobile compression decisions and the §5.3 a11y/SEO forward-pointers.

| # | Section name | Source | Purpose (one line) | Scroll depth | Funnel stage | Render layer | Primary CTA in section? | a11y → | SEO → |
|---|---|---|---|---|---|---|---|---|---|
| H | **Header** (sticky glass nav) | §12.1, brief | Persistent wayfinding over the canvas wash; carries the two CTAs site-wide; wordmark links to `/` | above-fold (persistent) | All | **Server** (sticky shell); the mobile-hamburger disclosure is the one **client leaf** in the header | **Yes** — both (Start free + Book a walkthrough) | `12` §3 (sticky-header focus contract; skip-link target) | `13` §4 (nav = internal-link graph; no `<a>` to noindex routes) |
| 1 | **Hero** | §11.1 | The hook + the one plain payoff; **LCP = the Doto text headline** (no heavy hero image); hero brand panel is a glass composition (NOT a fake screenshot, D-2) | **above-fold** | Awareness | **Server** (RSC hero); the hero brand panel is pure CSS gradient + glass — zero client JS | **Yes** — Start free (primary, `--brand-orange` fill) + Book a walkthrough (secondary) | `12` §2 (H1 once; text-LCP contrast vs hero gradient peak) | `13` §2 (H1 = primary keyword target; one `<h1>` per route) |
| 2 | **The Problem** | §3.2, §6.3 | Name the rebuild loop and the dead file; attack the workflow, never the user (§10.2#4) | above-fold → mid-fold | Awareness | **Server** (static) | No | `12` §4 (prose measure 65–75ch; body floor ≥14px) | `13` §2 (semantic `<section>` + heading hierarchy) |
| 3 | **The Layer + the commercial-graph plate** | §3, §8.3 | Declare the cost intelligence layer; show the named commercial graph as a claims-tagged SVG plate (D-4 subset: Live/Building/Planned) on a `.dashboard-glass-warm` floating panel | mid-fold | Awareness → Evaluation | **Server** (static plate SVG) + **one client leaf** for the hover-interaction flourish (per `04` and `07` §1.2); the plate is interactive, not a CTA | No | `12` §5 (plate collapses to a vertical stack on mobile; hover has a keyboard-equivalent) | `13` §3 (the plate's claims-tags are real text in the DOM — crawlable) |
| 4 | **What you get** (3 benefit blocks) | §11.2 | Present-tense, Live-grounded: *Stop starting from zero · Defend every number · From estimate to approval* | mid-fold | Evaluation | **Server** (static) | No | `12` §4 (3-up grid collapses to 1-up at `<768px`; heading-per-block) | `13` §2 (each benefit = an `<h3>`; internal anchor targets) |
| 5 | **How it works** (5-step workflow) | §7.3 | The mechanic, mechanic-forward: create → organize → reuse → track → hand off | mid-fold → below-fold | Evaluation | **Server** (static) | No | `12` §4 (ordered list semantics `<ol>`; 5 steps collapse to a vertical read on mobile) | `13` §2 (`<ol>` = real list semantics) |
| 6 | **Who it is for** (tiered roles) | §11.3, §6.2 | Tiered AEC roles (NOT logos); directed messages per role | below-fold | Evaluation → Trust | **Server** (static) | No | `12` §4 (role cards reachable by keyboard; no logo-only detection) | `13` §2 (role names = secondary keyword surface) |
| 7 | **What is real today** (claims ledger) | §7.2, §15 | The radical-honesty proof: Live / Building / Planned claims, each tagged via the D-4 `StatusPill` on a `.dashboard-glass` panel | below-fold | Trust | **Server** (static ledger) + **optional client leaf** for the filter (per `06` + `07` §1.2) | No | `12` §6 (status tags have `aria-label`; ledger is a real `<table>` or `<dl>`) | `13` §3 (claims text in DOM = trust signal + crawlable) |
| 8 | **Why not a spreadsheet** | §11.4 | The direct comparison; the spreadsheet resets, the layer compounds | below-fold | Evaluation → Trust | **Server** (static comparison) | No (links to `/features`) | `12` §4 (comparison is a real `<table>` with `<th scope>`, not a decorative grid) | `13` §2 (comparison-table semantics) |
| 9 | **The founder / the company** | §11.5, §13.1 | Introduction-energy founder voice; the two-sides lived gap. `⚠️ GATED ON` founder bio assets (L-FND-1, §9) | below-fold | Trust | **Server** (static) | No | `12` §4 (founder photo has alt text if/when it ships) | `13` §2 (founder name = E-E-A-T signal) |
| 10 | **Pricing, honestly** | §9.3 | Pricing **philosophy** (freemium, seat-based, peso, never meters estimating/exports/BOQ, free tier seeds the library) + the cement anchor as a labeled concept; **no published numbers** | below-fold | Conversion | **Server** (static) | No (links to `/pricing`) | `12` §4 (the cement-anchor numeral uses `--font-numeric`, still ≥14px) | `13` §2 (no fake price schema; no `Product` schema here) |
| 11 | **Final CTA** | §11.1, §11.6 | The closing ask; the one-liner; both CTAs on a closing glass panel | **above-fold on scroll-back** (footer-adjacent) | Conversion | **Server** (static) | **Yes** — both | `12` §3 (both CTAs are real `<a>`/`<button>`; focus order is explicit) | `13` §4 (the CTAs are the internal-link conversion targets) |
| F | **Footer** (glass sitemap) | §12.1, brief | Sitemap + legal + the one-liner; **replaces the logo-only block** | footer | All | **Server** (static) | No (text links only) | `12` §4 (footer landmark `<footer>`; link list is a real `<nav>`) | `13` §4 (footer = the deep internal-link graph + legal routes) |

**Hard ordering rule:** sections 1–11 run in this exact DOM order on `/`. The Header is sticky
across the scroll (`--landing-z-sticky`, per `03` §3.6); the Footer closes every route. No section
may be inserted, removed, reordered, or renamed without updating this table — it is the single
source of truth that `04`/`05`/`11` inherit.

**Scroll-depth bands** referenced above:
- **above-fold** — visible in the initial viewport at the target desktop (≥1024px) **without**
  scrolling. The Hero's LCP text and the Header CTAs must all be above-fold. Drives the §5.2
  mobile rule that the hero CTA is sticky-repeated (the header carries it, so it never scrolls off).
- **mid-fold** — reached with one-to-two scroll gestures; carries the Evaluation content (the
  plate, the benefits, the mechanic). This is the band a designer most carefully composes; it is
  the first place a mid-range-Android reader decides to keep scrolling.
- **below-fold** — reached with deliberate scroll; carries Trust + Conversion (claims ledger,
  founder, pricing, final CTA). A reader who reaches here is already evaluating us, not skimming.
- **footer** — closes every route; carries the sitemap + legal.

**What is deliberately NOT on the homepage** (deletions rail; gated on owner confirmation per the
brief's Hallmark deletion rail, `LOOP_LEDGER.md` L-REM-1…4):
- The 3 fabricated testimonials (§15 violation) — sections 7 and 9 carry trust by honesty instead.
- The hype hero ("Start Winning / Win More Bids / Estimate with Precision. Win with Clarity") —
  banned (§10.4, §16.4); replaced by §11.1.
- The construction-photo slideshow and the 2.3MB frosted-construction hero PNG (§12.9 "documents
  you would trust, not dashboards that perform") — the LCP is a text headline (→ **07**).
- The logo-only footer block (no logos exist; §15 forbids inventing them).

---

## 2. The other routes — per-route section inventories

Each route is a coherent member of one shared system, not an isolated page. Every route opens with
the same Header (H) and closes with the same Footer (F) as the homepage. Routes reuse homepage
sections where it serves the visitor, rather than re-deriving them. **Auth routes (`/login`,
`/signup`) do NOT use the Header/Footer taxonomy — they are full-page 2-column surfaces owned by
`23-AUTH-EXPERIENCE.md` (D-2); see §2.6 below.**

### 2.1 `/features` — Evaluation · mechanic-forward

Source: §7.2 (Feature Inventory by status — "the single tracker; marketing must map to it"),
§10.7 ("precise, honest, mechanic-forward, Live/Building/Planned visible").

| # | Section | Scroll depth | Render layer | Purpose |
|---|---|---|---|---|
| 1 | **Hero (compact)** | above-fold | Server | Route title + the one-liner (§11.6); a single line on what this page is: the honest feature ledger. |
| 2 | **Live, today** | mid-fold | Server | Every Live capability from §7.2 (estimate tree, component library, inline editing, templates, D3 charts, Activity / Node Activity / row version history, .xlsx export, shared proposal links with comments/decisions/password, collaboration invites with roles + realtime cursors). Each item links to its mechanic. |
| 3 | **Building** | mid-fold | Server | The Building list (formerly "Partial", reconciled to D-4 `Building`): Activity rollups + action taxonomy (improving); proposal export policy (preview/download exists; **issued/immutable snapshot is an OPEN decision** — label it). |
| 4 | **Planned (Next)** | below-fold | Server | The Planned list labeled as such: proposal snapshots/issued exports (policy gate first), archiving+trash (paid tier), proposal open-tracking (tiered), beta onboarding, **surfacing your own accumulated history by client / project type / supplier (the payoff the hook commits to — NOT shipped)**, supplier catalog + quote requests + product comparison + procurement bridge, client-side proposal record/archive. |
| 5 | **AI, deferred (honest)** | below-fold | Server | A clearly-marked section: the AI copilot is deferred (§7.2, §16.1). When it ships it enters at Pro+. **Must not feature as a current capability.** Any future AI mention carries a visible DeepSeek/privacy note (§15). |
| 6 | **The 5-step workflow** | below-fold | Server | Reuse homepage §5 (the mechanic) — links to the shared block, not a rewrite. |
| 7 | **Final CTA** | footer-adjacent | Server | Reuse homepage §11 (→ `/`). |

`/features` is the surface that lets §15 breathe: claims discipline is the *content* of this page,
not a constraint on it. No Live item appears without its mechanic; no Planned item appears without
the "Planned" tag.

### 2.2 `/pricing` — Conversion · honest philosophy, **no published numbers**

Source: §9.3 (Pricing context, benchmarks, and validation — `[RESEARCH + ⚠️ VALIDATE]`), §9.2,
§12.1 ("no mature-plan language until pricing is real"), §12.11 (the cement anchor).

| # | Section | Scroll depth | Render layer | Purpose |
|---|---|---|---|---|
| 1 | **Hero (compact)** | above-fold | Server | Route title + the line that pricing is a hypothesis we are validating, not a locked price. |
| 2 | **Pricing philosophy** | mid-fold | Server | Freemium, seat-based, peso-denominated, **never meters estimating / exports / BOQ lines**, free tier seeds the library (the moat mechanic). Voice: restrained (§10.7). |
| 3 | **The cement anchor (as concept)** | mid-fold | Server | The ₱239 ≈ a bag of cement framing (§12.11), shown as a **concept / framing only, clearly labeled hypothesis** (numeral in `--font-numeric`). The contrast line: "A bag of cement gets poured once. Archestimator works on every estimate you make." Never stops at "cheap" — always paired with the compounds-contrast. |
| 4 | **Tier sketch (directional, labeled hypothesis)** | below-fold | Server | Free / Solo / Pro / Team shown as **directional intent**, not prices. AI noted as "Pro+, when it ships" (deferred, §7.2). Open decisions surfaced honestly: founding-member rate (A or B, §17 #5), tier boundaries. |
| 5 | **What you will never be metered for** | below-fold | Server | Explicit promise: estimating, exports, BOQ lines are never usage-metered. |
| 6 | **How we are validating price** | below-fold | Server | Discovery + Van Westendorp before publishing numbers (§9.3, §17 #6). `⚠️ GATED ON` L-PRC-1 before any number goes public. |
| 7 | **Final CTA** | footer-adjacent | Server | Reuse homepage §11. |

**Hard rule (brief + §9.3 + §15):** `/pricing` publishes **no locked price**. Numbers are
pre-publication hypotheses. The cement anchor is a framing concept, not a published price. Free-tier
signup (the "Start free" CTA) does **not** require the validated pricing or the billing mechanism —
those gate **charging** only (see **07** CO-DEPENDENCIES).

### 2.3 `/about` — Trust · founder-led, introduction energy

Source: §11.5 (About-page intro), §13.1 (Founder profile), §5.1 (the new-company introduction
voice), §10.7 ("the introduction, founder-led, human").

| # | Section | Scroll depth | Render layer | Purpose |
|---|---|---|---|---|
| 1 | **Hero (compact)** | above-fold | Server | Route title + the introduction posture (§5.1): name the world as it is, declare who we are, show who you become. |
| 2 | **The intro (founder voice)** | mid-fold | Server | The §11.5 copy verbatim-led: the frustration, the layer we are building, "built by someone who has worked both sides," and the honesty paragraph. Introduction energy, calm conviction. |
| 3 | **The founder** | mid-fold | Server | §13.1 profile: architect, renderer, designer, UX/UI operator, former software engineer who lived the gap. Core line: *"Archestimator exists because the founder has felt the workflow from both sides."* `⚠️ GATED ON` founder public bio assets — credentials, photo, links (L-FND-1, §9). Until those land, this section renders the §13.1 core line + the §11.5 paragraph only; no invented credentials. |
| 4 | **The company, honestly** | below-fold | Server | Pre-launch MVP. New company. The team-cadence line (§13.2) without overclaiming headcount ("hats, not hires"). |
| 5 | **What this is, and is not** | below-fold | Server | The §7.4 honest limitations, in the about voice: pre-launch MVP, AI deferred, exports are working documents (not immutable issued records), no procurement/payments/ERP. |
| 6 | **Final CTA** | footer-adjacent | Server | Reuse homepage §11. |

`/about` is the page most likely to drift into hype; the discipline is the §5.1 posture and
§11.5's closing paragraph ("We would rather tell you exactly what it does today… That honesty is
part of how we work.").

### 2.4 `/contact` — Conversion · discovery + email-pitch tone

Source: §12.5 (Email pitch — design-partner outreach), §14.2 (Discovery script), §12.1 (contact =
Conversion, "request access").

| # | Section | Scroll depth | Render layer | Purpose |
|---|---|---|---|---|
| 1 | **Hero (compact)** | above-fold | Server | Route title + the line that this is for design partners and people who estimate/quote/propose today. |
| 2 | **What we are looking for** | mid-fold | Server | The §12.5 posture: a few design partners who create estimates, quotes, or proposals today; no payment or commitment; 20 minutes of feedback and permission to test the MVP. |
| 3 | **The discovery questions (optional)** | mid-fold | Server | The §14.2 script surfaced as "what we'd love to learn" — how you quote today, where it breaks, what wastes time, how you reuse items/suppliers/brands/templates. Framed as curiosity, not a form-wall. |
| 4 | **The form** | below-fold | **Server shell + client form leaf** (per `15`) | Name, role, current method (spreadsheet / tool / other), the one thing that breaks. Both CTAs present (Start free for the self-serve path, gated L-FUN-1/L-FUN-2; "Book a walkthrough" for the design-partner path). **Abuse = Postgres `security_rate_limit_events` + honeypot + validation; Turnstile escalation-only, NOT yet built** (per `15`). |
| 5 | **Email-pitch tone note (for outbound reuse)** | below-fold | Server | The §12.5 email is the canonical outbound voice; this page is its inbound mirror. |

### 2.5 `/trust` — Trust · the honesty-as-proof home (NEW ROUTE)

Source: §4.4#6 (Honesty as brand), §15 (Claims Discipline), §4.4#4 + R10 (Private by design),
§3.3 (what the layer is and is NOT), §7.2 (status inventory), §13.4 / §18.2 (legal posture). This
route **does not exist today** (confirmed: no `src/app/trust/`); it is new and central to the
radical-honesty proof strategy.

`/trust` is the long-form home for what the homepage's section 7 (claims ledger) and section 3
(the layer) only preview. It earns the "Trust" funnel stage by making honesty the content.

| # | Section | Scroll depth | Render layer | Purpose |
|---|---|---|---|---|
| 1 | **Hero (compact)** | above-fold | Server | Route title + the thesis line: trust comes from craft and honesty, not logos (brief §4.4#6; "documents you would trust, not dashboards that perform," §12.9). |
| 2 | **Private by design** | mid-fold | Server | R10 / §4.4#4: "Your data is yours, never pooled or anonymized across customers." The deliberate opposite of a cross-customer benchmark. State the trade-off honestly (we forgo that benchmark). `⚠️ GATED ON` owner confirming the trade per R10 (`LOOP_LEDGER.md`). |
| 3 | **The claims matrix, in depth** | mid-fold | Server + optional client leaf (filter) | The full Live / Building / Planned / NotUs matrix from §15 and §7.2, expanded via the D-4 `StatusPill`. Each row carries its status tag. This is the canonical public claims artifact the launch gate (§7.5) requires ("public claims matrix complete"). `⚠️ GATED ON` claims sign-off before public (L-SIGN-1, → `08-ROLLOUT-AND-ANALYTICS`). |
| 4 | **What it is NOT** | below-fold | Server | §3.3 honesty anchor, verbatim-grounded: not an aggregator, not a database of everyone's spreadsheets, not a bulk import. The intelligence is **yours**, from the work **you** do. |
| 5 | **Maturity, plainly stated** | below-fold | Server | §7.4 limitations in trust-page voice: pre-launch MVP, exports are working documents (not immutable issued records / legal documents), no procurement/payments/ERP, AI deferred. |
| 6 | **Security & data posture (what we can say today)** | below-fold | Server | Supabase Auth, RLS on every table, Postgres 17 (§8.2). `⚠️ GATED ON` SOC2/GDPR/HIPAA-style badges are **forbidden** (entity/DPA not done; §15 bans fake compliance). State only what is true today; do not badge. `⚠️ GATED ON` DPO/PIA/breach-plan (L-LEG-4) before any data-handling claim beyond "RLS on every table." |
| 7 | **The roadmap, labeled** | below-fold | Server | The roadmap chain (§0 / §7.6): Estimate Workspace → Component Library → Supplier Catalog → Quote Requests → Product Comparison → Procurement. Every future item tagged via D-4 `StatusPill`. |
| 8 | **Final CTA** | footer-adjacent | Server | Reuse homepage §11. |

`/trust` is where the "no logos, no testimonials, no stats" constraint stops feeling like a deficit
and becomes the argument. It is the proof strategy's home base.

### 2.6 `/login` + `/signup` — Conversion · auth entry (NOT in the Header/Footer taxonomy)

Auth is a **full-page, two-column, brand-forward surface** owned by **`23-AUTH-EXPERIENCE.md`**
(ratified decision D-2). It does **not** carry the Header (H) or Footer (F) taxonomy — it is its
own shell (`AuthLayout`, a `min-h-screen` 2-column glass composition over the canvas wash). This
doc covers the **funnel entry** that lands a visitor on auth; the auth surface itself is
`23-AUTH-EXPERIENCE.md`.

**Funnel entry contract (this doc owns):**
- The hero "Start free" CTA routes to **`/signup`** when self-serve is enabled.
- **`/signup` self-serve is GATED** on `LOOP_LEDGER.md` L-FUN-1 (route path: recommend `/signup`)
  and L-FUN-2 (beta-onboarding + self-serve enablement). **Until those resolve, "Start free"
  routes to `/login`** (the magic link already doubles as signup via `shouldCreateUser:true`,
  verified in `23-AUTH-EXPERIENCE.md` §0) **or to `/contact`** (design-partner path). The header,
  hero, final-CTA, and footer CTAs all honor this routing rule.
- The "Book a walkthrough" CTA always routes to `/contact`, ungated.
- Both `/login` and `/signup` are `noindex,nofollow` (owned by `13-SEO-AND-DISCOVERY.md`); they
  are excluded from the sitemap and carry no structured data. They cross-link only to each other
  and to legal pages, never back to marketing sections (avoids funneling crawl budget into noindex).

**Where auth appears in the section taxonomy:** it does not appear as a section. It is the
**destination of the primary CTA** from sections H, 1, and 11, and of the sitemap's "Sign in /
Start free" link in F. The taxonomy's job is to make that destination reachable from every
conversion surface; `23-AUTH-EXPERIENCE.md`'s job is the surface itself.

---

## 3. Nav archetype — sticky glass nav (reasoning)

**Decision (locked in the brief, re-skinned per D-1):** Header = a **sticky glass nav** floating
over the `--grad-canvas-wash`, using `.dashboard-glass` at `--landing-z-sticky` with
`--glass-nav-radius 8px` (the same material and radius as the Workshop top bar). The prior
direction's "N1b masthead-leaning" framing (a Source Serif 4 wordmark reading as a publication
masthead) is **retired with the paper direction** — it depended on the demoted Alternative D. The
Glass Brand uses the **signal-orange logo slab** (`--glass-logo-orange #F24405`, `globals.css:131`)
as the wordmark mark + the Doto/SF Pro wordmark as the wordmark text — the same nav vocabulary the
Workshop ships.

Reasoning, grounded:
- **The nav IS the same brand surface as the app.** A reader scrolling the landing sees the same
  glass top bar they will see in the Workshop after "Start free" — brand continuity is the
  argument (D-1, P1). A paper/serif masthead would be brand-discontinuous.
- **Credibility from craft + honesty, not logos** (brief locked decision #1, §4.4#6). A logo-trust
  bar would require logos we do not have and §15 forbids inventing. The glass nav shifts the trust
  signal to the brand material itself + the radical-honesty proof engine.
- **Carries both CTAs site-wide.** The "Start free" primary (`--brand-orange #F24405` fill, D-3)
  and "Book a walkthrough" secondary live in the header so they are reachable from every section
  and every route (brief locked decision #2). Because the header is sticky, the primary CTA **never
  scrolls off** — this is what makes the §5.2 mobile funnel compression simple (the CTA is always
  reachable from the header; no separate sticky-repeat bar is needed).

Nav items (left-to-right, collapsing to a hamburger at `<768px`): **Features · Pricing · About ·
Contact · Trust**. Order reflects the funnel: Evaluation → Conversion → Trust → Conversion →
Trust. **The wordmark links to `/` (home)** — pinned behavior, no exceptions. The "Sign in" link
(to `/login`) and the "Start free" CTA (to `/signup`, gated — §2.6) sit on the right of the nav,
not in the primary item list.

`⚠️ GATED ON` **`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`** for the exact responsive collapse
(mobile hamburger disclosure vs. nav row) and **`07-ENGINEERING-CONSTRAINTS.md`** for the
client-JS budget of the interactive header (the hamburger disclosure is the header's one client
leaf; everything else is RSC).

---

## 4. Footer archetype — glass sitemap (decision + reasoning)

**Decision (this doc):** Footer = **glass sitemap on a `.dashboard-glass` panel**, replacing the
existing logo-only block (brief REMOVALS rail). It is the SAME glass material as the header and
the section containers — the page reads as one Glass-Brand specimen, top and bottom.

The footer does three jobs, in this order:
1. **Sitemap** — the full marketing route set (`/`, `/features`, `/pricing`, `/about`, `/contact`,
   `/trust`) plus the legal routes already in the repo (`/privacy`, `/terms`) and the auth entry
   ("Sign in" → `/login`; "Start free" → `/signup`, gated §2.6). Grouped by intent (Product /
   Company / Trust / Legal), not the way a SaaS footer groups logo-walls.
2. **The one-liner** (§11.6) as a closing line: *"Archestimator: the cost intelligence layer for
   AEC teams. From cost proposal to client approval."* (in `--font-display` Doto, `--ink`).
3. **Legal + status line** — pre-launch MVP marker (§15 hard rule: say "pre-launch MVP" when
   maturity matters), copyright, the privacy/terms links.

**Rejected alternative — logo wall / partner strip:** no partners exist; §15 forbids inventing
them; the brief §4 strategy forbids logos/testimonials/stats entirely. **Rejected alternative —
newsletter capture:** no email program is validated (§17 #8 analytics/tooling); adding one would
be a §15 overclaim of maturity.

Reasoning for the glass-sitemap choice: it closes the Glass-Brand loop the sticky nav opens. The
whole page reads as one specimen of the same brand the Workshop ships — top, middle, bottom.

`⚠️ GATED ON` **`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`** for the exact column layout and
**`08-ROLLOUT-AND-ANALYTICS.md`** for the legal-link set (ToS/Privacy are themselves `⚠️ GATED ON`
L-LEG-2/L-LEG-3 before any signup goes public).

---

## 5. Funnel logic end-to-end

Stages used in §1: **Awareness → Evaluation → Conversion → Trust**. (Trust is treated as a stage,
not an afterthought, because the proof strategy *is* honesty — brief §4.)

**The arc, in one line:** the visitor arrives believing estimating is a rebuild-every-time chore;
they leave believing their own work could compound, and they know exactly what is real today versus
planned, because we told them plainly.

**Homepage flow mapped to the arc:**
1. **Hero (Awareness, above-fold)** — the hook lands ("Your cost intelligence layer."); the plain
   payoff follows in three seconds (§10.2#2). The "Start free" CTA is present for the ready-now
   visitor (→ `/signup`, gated §2.6); "Book a walkthrough" for the cautious one.
2. **Problem + Layer + Plate (Awareness → Evaluation, mid-fold)** — we name their world (§5.1
   move 1) and declare who we are (move 2). The commercial-graph plate (→ **04**) is the
   named-architecture moat move borrowed from Amigo (brief PEG STUDY), but every node is
   claims-tagged via the D-4 `StatusPill` so it never overclaims.
3. **What you get + How it works (Evaluation, mid-fold)** — present-tense Live benefits (§11.2),
   then the 5-step mechanic (§7.3). This is where the visitor decides "does this do what I need,
   today."
4. **Who it is for (Evaluation → Trust, below-fold)** — tiered roles (§6.2), directed messages,
   no logos. The visitor self-selects into a tier.
5. **Claims ledger (Trust, below-fold)** — the radical-honesty proof (§7.2, §15). This is the
   section that, on most SaaS sites, would be a logo wall; here it is a Live/Building/Planned
   table (D-4 type).
6. **Why not a spreadsheet + Founder + Pricing (Trust → Conversion, below-fold)** — the
   comparison, the human, then the honest pricing philosophy. The visitor is now deciding on *us*,
   not just the product.
7. **Final CTA (Conversion, footer-adjacent)** — both CTAs, the one-liner, the close.

**Cross-route funnel:**
- A visitor who wants depth leaves the homepage for `/features` (Evaluation) or `/trust` (Trust).
- A visitor who wants the human story goes to `/about` (Trust).
- A visitor ready to talk goes to `/contact` (Conversion, design-partner path) or hits "Start
  free" anywhere (Conversion, self-serve path → `/signup`, gated §2.6).
- `/pricing` exists to make pricing honest *before* it exists as numbers (§9.3); it sends ready
  visitors back to "Start free" (no number required).

**The two conversion paths (brief locked decision #2):**
- **Self-serve (Start free):** Free-tier signup → `/signup` (gated L-FUN-1/L-FUN-2; until then
  `/login` or `/contact`). `⚠️ GATED ON` the CO-DEPENDENCIES in **07**: beta onboarding +
  demo-data/reset (§7.5 launch gate, L-FUN-2), abuse guardrails (Postgres `security_rate_limit_events`, NOT
  Redis; POST-only invite acceptance; token hashing w/ pepper — the P1 items, L-FUN-4), and
  first-run flow (§18.3, L-FUN-3 `⚠️ NEEDS INPUT`). Free-tier signup does **not** require
  validated pricing or the billing mechanism.
- **Assisted (Book a walkthrough):** routes to `/contact` and the §12.5 design-partner flow. This
  path carries no dependency on the self-serve funnel.

**The moat metric (§14.4):** "reused components/templates per estimate" is the funnel's true north
— the homepage's section 4 ("Stop starting from zero") is the promise that metric measures.
Analytics events per **`08-ROLLOUT-AND-ANALYTICS`** + **`17-ANALYTICS-AND-OBSERVABILITY`**
(signup, first estimate, component reused, proposal shared, export) instrument this arc.

### 5.1 The auth entry in the funnel (D-2)

The auth surface is the **destination** of the primary CTA, not a section in the taxonomy. The
funnel reaches it from three points: the Header (H, persistent), the Hero (1), and the Final CTA
(11). Once a visitor is on `/login` or `/signup`, the marketing funnel **ends** and the
auth-→-activation funnel begins, owned by `23-AUTH-EXPERIENCE.md` (the magic-link/OAuth flows, the
closed-beta gate, the post-auth destination `/workshop`). This doc's contract is only: **every
"Start free" CTA points at the same gated destination** (§2.6), so the funnel does not fork.

### 5.2 Mobile funnel compression (320–414px)

On a mid-range Android viewport (320–414px, the target device class per `07` and `14`), the
above-fold band is ~640–900px tall — roughly the Hero only. The taxonomy compresses as follows so
the funnel never dead-ends on a small screen:

| Compression (mobile `<768px`) | What changes | Why |
|---|---|---|
| **Header CTAs stay reachable.** The sticky glass nav collapses to: wordmark + hamburger (left) + the "Start free" primary CTA only (right, `--brand-orange` fill). The secondary "Book a walkthrough" moves inside the hamburger disclosure. | The primary CTA never scrolls off. **No separate sticky-repeat CTA bar is needed** — the header already carries it. This is the §3 payoff of making the header the CTA carrier. |
| **Hero compresses to one viewport.** The hero brand panel stacks above the hero text (not beside it); the hero subhead drops from `--landing-text-body-lg` to `--landing-text-body`; both CTAs render full-width stacked. LCP = the Doto H1 text (unchanged — it was already text-first). | The above-fold ask is intact on a 320px screen. The hero brand panel still paints (deferred glass), but at a reduced height so the H1 + CTAs fit above the fold. |
| **Sections 3 + 4 merge visually (not semantically).** The commercial-graph plate (§3) collapses to a vertical stack (per `04` + `12` §5) and the "What you get" benefit blocks (§4) collapse from 3-up to 1-up. The DOM order and `<section>` boundaries stay identical; only the visual grid changes. | A mobile reader still meets the layer + the plate + the benefits in order, but in a single vertical read instead of a composed desktop band. |
| **Sections 5–8 stay vertical, no merge.** The 5-step mechanic, roles, claims ledger, and comparison are already vertical reads; they simply scroll. The claims ledger `<table>` becomes a `<dl>` or a horizontally-scrollable table at `<768px` (per `12` §6) — never a layout change, only a responsive rendering. | Trust content stays legible without inventing a separate "mobile page." |
| **Section 9 (founder) renders without the photo until L-FND-1 resolves.** The §13.1 core line + §11.5 paragraph render on their own; the photo slot is reserved (no layout shift when it ships). | The gated asset does not block the section; the reserved slot prevents CLS. |
| **Section 11 (Final CTA) is the conversion backstop.** Both CTAs render full-width stacked; this is the second conversion point a mobile reader hits after the sticky header. | A reader who scrolled past the hero CTA gets a second, calm ask at the bottom. |

**The one hard rule:** no section is *removed* on mobile — only compressed. A mobile reader gets
the same argument in the same order, just stacked. The sticky header's "Start free" CTA means the
funnel never depends on a reader reaching section 11 to convert.

### 5.3 Per-section a11y + SEO forward-pointers

Every section in §1 carries an `a11y →` and `SEO →` column pointing to the owning dimension doc
(`12-ACCESSIBILITY-AUDIT` and `13-SEO-AND-DISCOVERY` respectively). The pointers are summarized
here so `05`/`11` inherit them without re-deriving:

- **a11y (`12`):** H1-once-per-route contract (§2); text-LCP contrast vs the hero gradient peak
  (§2); prose measure 65–75ch and body floor ≥14px (§4); 3-up grids collapse to 1-up with a
  heading per block (§4); the plate collapses to a vertical stack with a keyboard-equivalent for
  the hover flourish (§5); the claims ledger is a real `<table>`/`<dl>` with `aria-label` on the
  `StatusPill` (§6); the sticky-header focus contract + skip-link target (§3); the footer is a
  `<footer>` landmark with the link list as `<nav>` (§4).
- **SEO (`13`):** H1 = primary keyword target, one `<h1>` per route (§2); benefit blocks and role
  names are `<h3>` secondary-keyword surfaces (§2); the plate's claims-tags and the ledger's
  status tags are **real text in the DOM** (§3) — crawlable trust signals, not images; the
  comparison and the pricing-philosophy use real `<table>`/`<ol>` semantics (§2); no fake
  `Product`/`Offer` price schema anywhere (§2); the footer is the deep internal-link graph (§4);
  auth routes are `noindex,nofollow` + sitemap-excluded (§4, owned by `13` + `23`).

---

## 6. Voice & claims guardrails for this taxonomy

Restated so `05`/`11` inherit them without re-reading §15:
- **§15 on every public word.** Live items present-tense; `Building` (reconciled from "Partial"
  per D-4) labeled "improving"; `Planned` labeled "Planned"/"Next" and never implied shipped;
  `NotUs` not used on the homepage (the plate subset narrows it out per D-4). No "production
  hardened," no "legally automated," no immutable/issued-record language for current exports
  (§16.2), no aggregator/"database of estimates" language (§3.3), no "the only tool that…" (§2),
  no AI as current (§7.2, §16.1).
- **Controlled Confidence (§10).** Calm conviction, not hype. Attack the workflow, never the
  user. The banned hero lines (§10.4, §16.4) do not reappear anywhere in this taxonomy.
- **Maturity marker (§15 hard rule):** "pre-launch MVP / MVP preview" appears wherever maturity
  matters (homepage hero subhead, `/about` §4, `/trust` §5, footer status line).
- **No invented proof.** No logos, testimonials, metrics, partner names, compliance badges, or
  prices (beyond the labeled-hypothesis cement anchor concept on `/pricing`).
- **D-4 type discipline.** The homepage plate (§3) and claims ledger (§7) import the single shared
  `ClaimStatus` type from `src/components/landing/shared/StatusPill.tsx` and narrow at the call
  site; no divergent "Partial" / "Coming" / "Beta" status vocabularies are invented.

---

## 7. Cross-links (all filenames canonical per `10-CANONICAL-DOC-MAP.md` §1)

- **`00-OVERVIEW.md`** — the front door; this doc is its section-map appendix. Owns the five
  ratified keystone decisions (D-1…D-5), the scope, the success criteria, the sign-off gates.
- **`01-DESIGN-DIRECTION.md`** — the Glass Brand rationale + the Intercom/Amigo peg study + the
  §3.4 "Direction D — The Document" ALTERNATIVE this taxonomy no longer defaults to. Owns the
  Hallmark removal rail this doc's deletions list inherits.
- **`03-VISUAL-LANGUAGE-AND-TOKENS.md`** — owns the Glass Brand tokens (canvas wash, glass
  classes, signal orange, Doto/Roboto-Mono/SF-Pro type, 3/8/12 radius, deferred-glass arming) the
  sections render in; this doc references them by name only (§0.1).
- **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`** — owns the full spec of homepage section 3's
  plate (named nodes, D-4 `ClaimStatus` tags narrowed to Live/Building/Planned, glass-skin SVG,
  the Hallmark ban on re-drawn chrome, the mobile vertical-stack collapse).
- **`05-COPY-SKELETON.md`** — owns the actual deployed copy for every section in this map; cites
  the same (§X.Y) sources.
- **`06-PROOF-AND-CLAIMS-DISCIPLINE.md`** — owns the `<ClaimsLedger>` surface that is homepage
  section 7 + `/trust` §3, the §15 rail, the claims-matrix sign-off process, and the D-4
  `ClaimStatus` type definition (single source).
- **`07-ENGINEERING-CONSTRAINTS.md`** — owns the RSC-first build (the "Render layer" column in
  §1 references its §1.2 hydration split), the mobile breakpoints (320/375/414/768), the
  plate-collapse, the LCP=text-headline rule, and the **CO-DEPENDENCIES** for the "Start free"
  funnel (L-FUN-2/3/4).
- **`08-ROLLOUT-AND-ANALYTICS.md`** — owns the preview route (`/newdesign` convention), the A/B
  old-vs-new, the **claims sign-off gate** (L-SIGN-1) before `/trust` and the claims ledger go
  public, and the analytics events.
- **`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`** — owns the DOM/props/responsive behavior of
  each section (incl. the sticky-header collapse and the footer column layout). (Component
  anatomy lives in `11`, NOT `06` — `06` is the proof/claims doc.)
- **`12-ACCESSIBILITY-AUDIT.md`** — owns the formal WCAG 2.1 AA audit, contrast table, keyboard
  contract, and the per-section a11y notes the `a11y →` column in §1 forward-points to.
- **`13-SEO-AND-DISCOVERY.md`** — owns the keyword strategy, per-route meta copy, sitemap +
  robots + canonical, structured data, internal linking, and the per-section SEO notes the `SEO →`
  column in §1 forward-points to. Owns the `/login` + `/signup` `noindex,nofollow`.
- **`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`** — owns the ≤4-simultaneous-blur cap that constrains
  how many sections in §1 can carry a live glass blur in one viewport.
- **`15-FORMS-AND-ABUSE-GUARDRAILS.md`** — owns the `/contact` form (§2.4 #4) and the `/signup`
  form-spam defense (Postgres `security_rate_limit_events`, NOT Redis; honeypot; Turnstile escalation-only).
- **`17-ANALYTICS-AND-OBSERVABILITY.md`** — owns the event schema that instruments the funnel
  (§5) and the moat metric.
- **`23-AUTH-EXPERIENCE.md`** — owns the auth surface the primary CTA routes to (§2.6, §5.1):
  full-page 2-column, Google OAuth + magic link, no password, `noindex,nofollow`, closed-beta
  gate as content variant. Owns L-FUN-1/L-FUN-2 for the "Start free" routing.
- **`22-PEG-STUDY-DEEP-DIVE.md`** — the Intercom/Amigo DNA extraction that backs the named-plate
  move (§3) and the honesty-as-proof move (§7).
- **`10-CANONICAL-DOC-MAP.md`** — the canonical filenames every cross-link here reconciles to.
- **`LOOP_LEDGER.md`** — the plan-pack loop ledger; every `⚠️ GATED ON` item in §9 has a row here.

---

## 8. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

Per D-5, no gate is silently marked closed. The load-bearing gates for THIS doc:

- **L-FUN-1 — "Start free" route path** (recommend `/signup`). Gates every "Start free" CTA href
  in sections H, 1, 11, and the footer sitemap link. Until resolved, CTAs route to `/login` (magic
  link doubles as signup via `shouldCreateUser:true`) or `/contact`. Owned jointly with
  `23-AUTH-EXPERIENCE.md`.
- **L-FUN-2 — Beta onboarding + self-serve enablement.** Gates whether `/signup` accepts new
  accounts or routes to request-access (`ClosedBetaGate` per `23` §3.2). Gates the self-serve
  conversion path's activation quality.
- **L-FUN-3 — First-run flow** (§18.3 `⚠️ NEEDS INPUT`). Gates the self-serve "Start free"
  conversion path's activation quality. The taxonomy assumes it exists; `07` flags it as a
  CO-DEPENDENCY.
- **L-FUN-4 — Abuse guardrails (P1).** Postgres `security_rate_limit_events` (NOT Redis), POST-only invite
  acceptance, token hashing + server pepper. Gates any public self-serve `/signup`; gates the
  `/contact` form (§2.4 #4). Owned by `15`.
- **L-FND-1 — Founder bio assets** (§17 #17). Gates homepage §9 and `/about` §3 richness. Until
  they land, those sections render the §13.1 core line + §11.5 paragraph only; no invented
  credentials, no photo (reserved slot, no CLS).
- **L-PRC-1 — Pricing validation** (§9.3, §17 #5/#6). Gates any number on `/pricing`. This
  taxonomy deliberately publishes **no locked price**; the cement anchor is a labeled-hypothesis
  concept only.
- **L-SIGN-1 — Claims sign-off** (§7.5 launch gate: "public claims matrix complete"). Gates
  `/trust` §3 and homepage §7 going public. Owned by `08-ROLLOUT-AND-ANALYTICS` +
  `09-CLAIMS-LEDGER-SIGN-OFF`.
- **L-LEG-1…4 — Legal / entity / privacy / DPA / DPO-PIA.** Gates `/trust` §6 and the footer
  legal links. SOC2/GDPR/HIPAA badges are **forbidden** until the entity/DPA exist (§15). State
  only what is true today (RLS on every table, Supabase Auth).
- **L-REM-1…4 — Removals (Hallmark rail).** Owner OK to delete: 3 fabricated testimonials; hype
  hero; construction-photo slideshow + 2.3MB hero PNG; logo-only footer. Gates the §1 deletions
  list execution.
- **R10 confirmation** — `/trust` §2 (private-by-design, "never pooled") is a deliberate trade-off
  (forgoes the cross-customer benchmark). `⚠️ GATED ON` owner confirming the trade per R10.
- **Role names + permissions** (§17 #15) — `/features` and homepage §6 reference collaboration
  invites/roles; canonical role names are `⚠️ NEEDS INPUT`. Use the §7.3 phrasing ("role-based
  access via collaboration invites") until the Access Matrix is canonical.
- **L-SEO-1 — PH/SEA search-volume validation** (§17 #19) — does not gate the section *map*, but
  gates any SEO-driven copy within these sections; surface to `05`.
- **`/trust` is a NEW route** — not in `src/app/` today; creation is an `07` task. The taxonomy
  assumes it ships alongside the redesign.
- **`/signup` + `src/components/auth/` are NEW** — not in `src/app/` today; creation is the
  deliverable of `23-AUTH-EXPERIENCE.md`. The taxonomy's CTA routing assumes they ship alongside
  the redesign (or that "Start free" routes to `/login`/`/contact` meanwhile).

---

## 9. Coherence contracts (this doc honors)

- **D-1 — Glass Brand.** Every section is a glass surface over the warm canvas wash; no paper
  columns, no Source Serif 4, no N1b-masthead framing (retired with Alternative D). ✅ (§0.1, §1,
  §3, §4)
- **D-2 — Full-page 2-column auth.** Auth is the destination of the primary CTA (§2.6, §5.1),
  owned by `23-AUTH-EXPERIENCE.md`; "Start free" → `/signup` is gated L-FUN-1/L-FUN-2. ✅
- **D-3 — Orange token discipline.** `--brand-orange #F24405` for fills/logo/focus/accent rail;
  `--brand-orange-dark #C63804` for AA small text; clay `#AA412A` is NOT a token and is NOT
  referenced anywhere in this doc as an active value. ✅ (§0.1, §3, §5). Tailwind v4 gotcha
  honored: `bg-[color:var(--x)]`, never `bg-[var(--x)]`.
- **D-4 — ClaimStatus type.** The plate (§3) and ledger (§7) use `"Live" | "Building" |
  "Planned"` via the single shared `StatusPill` (`src/components/landing/shared/StatusPill.tsx`);
  "Partial" is reconciled to `Building`; no divergent status vocabularies. ✅ (§1, §2.1, §6)
- **D-5 — Honest scoring.** §10 below; no self-congratulation; gated items are carried, not
  claimed closed. ✅
- **Auth noindex** — `/login` + `/signup` are `noindex,nofollow`, canonical-self,
  sitemap-excluded. ✅ (§2.6, §5.3)
- **"Start free" gated** — L-FUN-1/L-FUN-2/L-FUN-3/L-FUN-4 carried. ✅ (§2.6, §5, §8)
- **Rate-limiting = Postgres** — no Redis. Turnstile not yet built. ✅ (§2.4)
- **Radical honesty** — no fake screenshots/logos/testimonials/stats/badges/prices; the hero brand
  panel is an abstract gradient composition only. ✅ (§1, §1 deletions)

---

## 10. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **96 / 100** | The taxonomy flips fully to the Glass Brand (D-1): sections are glass-over-warm-canvas, the N1b-masthead/serif framing is retired with Alternative D, the nav is a sticky glass bar with the logo slab, the funnel's auth entry (D-2) is explicit and gated L-FUN-1/2, the D-3 orange discipline and D-4 `ClaimStatus` type are honored, and the §1 table now carries scroll-depth + render-layer + a11y/SEO forward-pointers so the funnel reads end-to-end on desktop AND mobile (§5.2). Not 100 because the visual result of D-1 wants one owner look (L-DES-1…5, carried in `LOOP_LEDGER`) before the strategy is fully locked, and "Direction D — The Document" preservation depends on `01-DESIGN-DIRECTION.md` being updated by its owner (cross-doc, not my file). |
| **Quality** | **95 / 100** | Every token citation in §0.1 was grepped against the real `globals.css` on 2026-06-22 with line anchors (`--brand-orange` L37, `--brand-orange-dark` L38, `--glass-logo-orange` L131, `--grad-canvas-wash` L62, `--glass-radius` L116, `--glass-nav-radius` L117, `--font-display` L203, `--radius-xs` L100, `--proposal-paper` L98); every cross-link resolves to a canonical filename in `10-CANONICAL-DOC-MAP.md` §1 (zero stale `06-COMPONENT-ANATOMY`, `07-ENGINEERING-CONSTRAINTS-CONSTRAINTS`, `04-COMMERCIAL-GRAPH-PLATE`, or `00-EXECUTIVE-SUMMARY` aliases remain — all four were broken in the prior revision and are corrected here); clay `#AA412A` appears only in "NOT a token / NOT used" contexts; `#FFFDF8`/Source Serif 4 appear only as the demoted Alternative D, never as the default. Not 100 because the §5.2 mobile-compression rules (e.g. "hero brand panel reduced height so H1+CTAs fit above 320px fold") are policy I asserted from the device class, not yet pixel-verified against a real 320px render (that verification belongs to `12` + `14`, correctly forward-pointed). |
| **Implementation-Readiness** | **93 / 100** | An implementer reading §1 gets the exact DOM order, the scroll-depth intent, the RSC-vs-client-leaf designation per section (referencing `07` §1.2), the CTA placement, and the per-section a11y/SEO forward-pointers — enough to scaffold the homepage and every route without re-deriving the IA. §2.6 + §5.1 make the auth entry contract explicit (CTA destination, gating, noindex). Not 100 because `/trust`, `/signup`, and `src/components/auth/` do not exist on disk yet (they are sibling-doc deliverables, not pre-existing), the taxonomy's CTA routing genuinely waits on L-FUN-1/L-FUN-2 before auth code can ship, and the §5.2 mobile compression + the §3 sticky-header collapse are IA-level specs whose exact breakpoints are owned by `11`/`12`/`14` (correctly deferred, not gaps in this doc). Per D-5 these open gates honestly cap readiness below 100 rather than being silently closed. |

**Carried to `LOOP_LEDGER.md` (not silent):** L-FUN-1, L-FUN-2, L-FUN-3, L-FUN-4, L-FND-1,
L-PRC-1, L-SIGN-1, L-LEG-1…4, L-REM-1…4, L-SEO-1, R10, L-DES-1…5 (visual final), role-names.
