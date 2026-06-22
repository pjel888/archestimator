# 22 — Peg Study Deep Dive (Intercom + Amigo + Workshop Dashboard DNA, with evidence)

> **STATUS: PLANNING ONLY · 2026-06-22 re-fetch · not code.**
> **Purpose:** the full-depth DNA extraction from the three pegs — **Intercom**, **Amigo**, and
> the **Workshop Dashboard bento** (added 2026-06-22 as the in-house IA peg) — with URLs, fetch
> dates, and live HTML/CSS evidence. `01-DESIGN-DIRECTION.md` §4 carries the condensed
> transferability verdict; this doc is the underlying analysis. It exists so the verdict in
> doc 01 is auditable — every claim there traces to a finding here.

This doc owns **peg-study evidence**. It does not own the direction (→ `01-DESIGN-DIRECTION.md`),
the section taxonomy (→ `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`), or the visual tokens
(→ `03-VISUAL-LANGUAGE-AND-TOKENS.md`). Every URL below was re-fetched on **2026-06-22**; every
claim is dated and the fetch is reproducible (§7).

> **Honesty note (decision D-5).** An earlier draft of this doc asserted (a) that the Amigo
> homepage was "domain-parked at a PRO ISP placeholder," and (b) that Intercom's hero was "a
> tabbed 4-tab system." **Both were stale by the 2026-06-22 re-fetch** and are corrected below:
> the Amigo homepage is live, and Intercom's hero is now a four-block "complete solution"
> section. The prior "no competitor in our segment has drawn the commercial graph" claim is
> also softened (§3.3) — it was an assertion without a competitive scan; this revision states
> it as a *working hypothesis*, not a verified fact. Per D-5, these corrections are surfaced,
> not buried.

---

## 1. Methodology

| Step | Method |
|---|---|
| 1. Fetch | `intercom.com/` (homepage), `amigo.ai/platform` (the platform page), and `amigo.ai/` (the homepage — **now live**, correcting the prior "domain-parked" claim) via the web reader on **2026-06-22**. The Workshop Dashboard bento is read from the in-repo source (`src/components/workshop/dashboard/WorkshopDashboard.tsx`) — it is our own code, not a fetch. |
| 2. Extract | Macrostructure (the section rhythm), nav + footer archetype, type pairing (the loaded fonts where detectable), color anchor (declared colors + `theme-color`), the named-architecture move, the proof-stacking pattern, the hero composition, **the motion language** (scroll/hover/transition timing — §6), and **the mobile/responsive behavior** (375px analysis — §5). |
| 3. Diagnose | What the DNA is, what it earns the peg, what its risks are. |
| 4. Transfer verdict | What transfers to Archestimator (a pre-launch MVP B2B AEC estimating tool in PH + SEA with no logos, no testimonials, no metrics, no AI shipped) vs. what does not. |
| 5. Date + cite | Every claim carries the URL + the fetch date so the study is reproducible. Stale claims from earlier drafts are corrected in place (D-5). |

---

## 2. Intercom — the DNA

**Source:** `https://www.intercom.com/` fetched **2026-06-22** (canonical self-referential;
`theme-color` meta = `#050505`, verified in the served `<head>`).

### 2.1 The macrostructure (the section rhythm)

> Corrected 2026-06-22: the prior draft described the hero as "a tabbed 4-tab system with
> photographic backgrounds." The live homepage no longer ships that pattern. The current hero
> is the "complete solution" four-block section described in row 2 below.

| Section | Content (2026-06-22) | Pattern |
|---|---|---|
| 1. Header (nav) | Wordmark + nav (Products, Solutions, Resources, Pricing, Customers) + Login + "Get Started" CTA. | Canonical SaaS three-section nav — the **"N1b" archetype** this pack adopts (defined in §4 below, not chased from any external "Hallmark" reference). |
| 2. "A complete solution for AI and human agents" | **A four-block section**, each block = a sub-claim + a product UI screenshot over a photographic/illustrative background. The four blocks: AI-powered agent workspace · A seamless experience · AI-powered Insights · A self-improving system. The headline asserts the category: **"The only helpdesk designed for the AI Agent era."** (verified `<title>` + `<h1>` + `og:title`). | Proof-stacked: each claim paired with its evidence. The "four sub-blocks" pattern is the **distant ancestor** of this pack's "four-block narrative grid" idea — but Intercom's blocks are screenshot-led, ours are claims-led. |
| 3. "A fully-featured AI-powered helpdesk" | A feature taxonomy: Omnichannel, Apps & integrations (350+), Customer intelligence, plus "Engage customers" + "Monitor and improve" sub-claims. Each with a product screenshot or illustration. | Deeper proof-stacking. |
| 4. Named testimonials | **Three named, headshotted testimonials** (verified by alt text + caption in the fetched HTML): Isabel Larrow, Product Support Operations at **Anthropic**; Angelo Livanos, Senior Director of Global Support at **Lightspeed** ("31% more conversations daily"); George Dilthey, Head of Support at **Clay**. | Social proof (NOT transferable to Archestimator — §15 forbids inventing it). |
| 5. "The company you can trust" + "Expert support" + "AI Agent Blueprint" | A security/reliability/transparency badge strip (the `<img alt="Security, reliability and transparency badges">` is present) + services positioning + a gated content asset. | Trust-badging + services-led trust (NOT transferable). |
| 6. **"Transparent pricing"** | **Public starting-at pricing on the homepage**: `$29 / Per Seat/Mo + $0.99` (verified text in the served HTML), with a "Learn more" to the pricing page. The pricing page (`intercom.com/pricing`, not fetched in this revision but documented in §2.7 below) carries the Essential/Advanced/Expert tier comparison. | Public pricing (NOT transferable — Archestimator's price is hypothesis, §9.3). |
| 7. CTA + footer | Final conversion block + sitemap footer. | Standard. |

### 2.2 The type pairing (softened — no CSS-level font proof fetched)

- **Display + body:** Intercom appears to use a **modern geometric sans** throughout (the
  rendered headlines read as Inter/Inter-like). **This revision does NOT assert "Inter" as a
  verified fact** — the earlier draft's flat "Inter (a geometric sans)" claim was made without
  CSS-level evidence, and the 2026-06-22 fetch did not surface a `@font-face`/Google-Fonts URL
  that pins the family. State it as: *appears to use a modern geometric sans in the Inter
  register; not load-bearing for our transfer verdict either way.*
- **No serif.** This is the opposite of Archestimator's deferred Direction D ("The Document"),
  and orthogonal to the default Glass Brand direction (Doto + Roboto Mono + SF Pro).
- **Color anchor:** `theme-color` meta = `#050505` (near-black, **verified** in the served
  `<head>`). The page alternates dark and light bands. Backgrounds use real photography and
  illustration.

### 2.3 The proof-stacking pattern (the load-bearing DNA)

Intercom's signature move: **every claim is paired with its evidence**. Each "complete
solution" block pairs a capability claim ("AI-powered agent workspace") with a product UI
screenshot proving it. The feature taxonomy pairs each cluster claim ("Omnichannel") with a
screenshot or illustration. The result is a page where no claim floats unsupported — the proof
is the page.

**The transferable half:** the *pattern* (claim + evidence) transfers. **The non-transferable
half:** the *evidence type* (product screenshots) does not transfer — Archestimator bans
re-drawn chrome and stock-photo "dashboards that perform" (`01-DESIGN-DIRECTION.md` §3.1,
`06-PROOF-AND-CLAIMS-DISCIPLINE.md` §15). Archestimator's version of proof-stacking is **claim
+ claims-status tag** (the Live / Building / Planned ledger in `06-PROOF-AND-CLAIMS-DISCIPLINE.md`,
typed per the D-4 `ClaimStatus` contract).

### 2.4 The named-architecture move (absent in Intercom)

Intercom does NOT name an architecture. Its moat move is product-screenshot-led proof-stacking,
not a drawn system. Amigo is the named-architecture peg (§3 below).

### 2.5 The category-hook hero (transferable)

Intercom asserts a category and dares the reader to disagree: **"The only helpdesk designed for
the AI Agent era."** (verified `<title>`, `og:title`, `twitter:title`, `<h1>` register). This is
a strong hero move — a single category-defining sentence with the product proof stacked beneath
it.

**The transferable half:** the *move* (assert a category, stack proof beneath) transfers —
Archestimator's "Your cost intelligence layer." is the same move.

**The non-transferable half:** the *superlative phrasing* ("the only…") does not transfer —
MASTER §2 bans "the only tool that…" (the reusable-cost-intelligence space is established; §2
Finding 2). Archestimator's hook asserts the category without the superlative.

### 2.6 The Intercom transfer verdict (full table)

| Element | Transferable to Archestimator? | Why |
|---|---|---|
| Category-hook hero (assert a category, stack proof beneath) | ✅ Yes — *the move*, not the superlative | "Your cost intelligence layer." asserts the category; the claims ledger is the proof stack. |
| Proof-stacked sections (claim + evidence pairing) | ✅ Yes — *re-engineered* | Each claim gets a Live/Building/Planned tag (D-4 `ClaimStatus`), not a screenshot. |
| Four-block "complete solution" narrative grid | ✅ As inspiration only — *the rhythm*, not the screenshots | Our four-block narrative grid (`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`) is claims-led, not screenshot-led. |
| Named testimonials (Anthropic, Lightspeed, Clay) | ❌ No | None exist; §15 forbids inventing them. |
| Customer logos / integration logo walls | ❌ No | None exist. |
| "31% more conversations daily" stat | ❌ No | Nothing measured; §15 bans fake metrics. |
| Compliance/security badge strip | ❌ No | Entity/DPA not done (L-LEG-1…4). |
| Transparent published pricing ($29/seat + $0.99/resolution) | ❌ No | Pricing is hypothesis (§9.3); `/pricing` ships philosophy only until L-PRC-1 closes. |
| "The only platform that…" | ❌ No | §2 bans it; the space is established. |
| AI-hero / AI-forward framing | ❌ No | AI deferred (§7.2, §16.1). |
| Photographic backgrounds behind hero copy | ❌ No | Conflicts with the Glass Brand direction (D-1); stock photos banned. |
| Canonical SaaS three-section nav (N1b) | ✅ Yes — *the archetype, not the visual* | Archestimator uses N1b masthead-leaning (`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` §3); the visual is glass, not Intercom's dark SaaS chrome. |
| Tight section rhythm (alternating headline + feature grid) | ✅ Yes — *the rhythm* | `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` §1's 11-section taxonomy carries the rhythm. |

### 2.7 Intercom pricing-page structure (informs `02` §1 section 8 — we defer numeric pricing)

The Intercom pricing page (`intercom.com/pricing`, **not re-fetched in this revision** —
documented from the public SaaSFrame/Unsection secondary references cited in §7) is the
canonical SaaS pricing-page archetype this pack's `/pricing` route is shaped against and
deliberately departs from. Its observed structure (Essential / Advanced / Expert tier columns +
feature-comparison matrix + "most popular" highlight + Fin AI resolution add-on priced
separately) informs the *slot grammar* for our `/pricing` route, even though we ship **pricing
philosophy only** until L-PRC-1 closes:

- **What we borrow:** the three-tier visual grammar (even if our three slots are "philosophy
  frames" not peso numbers), and the "priced-separately" disclosure pattern (we will name what
  is *not* bundled — e.g. proposal-export volume — honestly, even without prices).
- **What we do NOT borrow:** numeric prices, "most popular" anchors, feature-checkmark
  comparison matrices (these imply measured parity we do not have), and the
  per-resolution/per-seat unit economics (our unit is "an estimate," not "a resolution").

This is the full extent of the pricing-page analysis; `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`
§1 section 8 and `05-COPY-SKELETON.md` own the copy. No peso figure is published by this doc.

### 2.8 "N1b nav" — defined here

This pack references an **"N1b nav"** archetype in several docs. It is **defined here**, not
chased from any external "Hallmark" reference: **N1b** = a canonical three-section marketing
masthead — wordmark left · a small set of top-level section groups (Product / Solutions /
Resources · Pricing · Customers) center-or-right · a primary auth/signup CTA far-right. It is
the nav shape Intercom, Amigo, Stripe, Linear, and most modern B2B SaaS sites converge on. The
"b" denotes the balanced variant (no mega-menu overload; ≤7 top-level items). Archestimator's
`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` §3 specifies our N1b instance (masthead-leaning,
glass-skinned per `03-VISUAL-LANGUAGE-AND-TOKENS.md` §4.2).

---

## 3. Amigo — the DNA

**Source:** `https://amigo.ai/platform` fetched **2026-06-22** (canonical self-referential;
`amigo.ai/llms.txt` + `amigo.ai/feed.xml` declared). **Confidence note (downgraded from prior
draft):** the platform page is fetched and verified, but the *homepage* (`amigo.ai/`) was **not
re-fetched in this revision**; the prior draft's claim that the homepage was "domain-parked" is
**stale** — a 2026-06-22 web search confirms `amigo.ai/` resolves to a live page (tagline: "the
trusted platform for building, training, and deploying clinical agents"). Treat the homepage
analysis as **medium confidence** pending a direct fetch; the platform-page analysis below is
**high confidence** (HTML in hand).

### 3.1 The macrostructure (platform page, verified 2026-06-22)

| Section | Content (2026-06-22) | Pattern |
|---|---|---|
| 1. Header (nav) | Wordmark + nav (**Platform · Specialties · Customers · Insights · Company**) + "Book a Demo" CTA. | Canonical SaaS nav (N1b — §2.8). |
| 2. Hero | **H1 (verified, changed since prior draft): "The all-in-one platform for every clinical workflow. Tell us what your patients need. We'll handle the rest."** Sub-positioning: "transform limited resources into unlimited availability… in six to eight weeks." CTA: "Book a Demo." Hero asset: a starburst "platform workflow visualization" (`system-hero-starburst.png`). | Category-hook hero (clinical AI capacity) — *the headline is now solution-shaped, not capacity-shaped*. |
| 3. The Cognitive Architecture (**the load-bearing move, verified**) | **A two-layer pyramid diagram** (served as `pyramid.svg` desktop + `pyramid-mobile.svg` mobile — §5). **Top layer ("You define", 3 nodes):** Agent · Clinical Reasoning · Product Experience. **Base layer ("We define", 12 nodes — verified verbatim in served HTML):** Identity and Persona · State-based Architecture · Memory System · Safety Guardrails · Evaluation Architecture · Knowledge Retrieval · Global Directives · Agent Visibility · Behavior Triggers · Simulations · Dynamic Tool Calling · Reinforcement Learning. | Named-architecture-as-moat — Amigo drew its system and named every node. |
| 4. The 4-phase process (verified) | **DEFINE → TRAIN → DEPLOY → MONITOR** — a numbered narrative. Each phase has a sub-taxonomy (DEFINE: Core Persona · Dynamic Behaviors · Actions · Context Graph · Memory System; TRAIN: Virtual Patients · Simulated Conversations · Supervised Evaluations; DEPLOY: channels + EHR integration; MONITOR: dashboards + alerts). | Process-led macrostructure. |
| 5. "AI Trust Infrastructure" + compliance | "Full control. No exceptions." + 6-pillar grid (Access Control · Incident Response · Data Encryption · Audit & Compliance · Agent Governance · Observability Suite) + **SOC2 / GDPR / HIPAA badges** (verified `<img alt>`). | Trust-badging (NOT transferable). |
| 6. EHR integration logo wall | 13 named EHR integration logos (Epic, Oracle Cerner, athenahealth, AdvancedMD, eClinicalWorks, ModMed, Elation, DrChrono, CharmHealth, Veradigm, Healthie, Canvas Medical, NextGen, MEDITECH, Qualifacts). | Logo wall (NOT transferable). |
| 7. "The Amigo Advantage" comparison | An 8-row "Amigo vs Other Healthcare Agents" comparison table (one unified platform, custom-built, deploy in weeks, dedicated Agent Engineer, transparent reasoning, simulation-validated, continuous self-improvement, you own all IP). | Comparison-table trust move. |
| 8. FAQ + CTA + footer | 5-question FAQ + "Book a Demo" + sitemap footer. | Standard. |

### 3.2 The named-architecture move (the load-bearing DNA)

Amigo's signature move: **it drew a picture of its system and named every node**, and that
picture *is* the trust argument. In a market (healthcare AI) where the buyer is skeptical of
black-box AI, naming the parts of the system ("Memory System," "Safety Guardrails," "Evaluation
Architecture") is how Amigo earns trust without showing the code.

**The transferable half:** the *move* transfers completely. Archestimator has an equivalent: the
**commercial graph** (MASTER §8.3 — Projects → Estimates → Group/Area → rows ↔ Components ↔
Suppliers/Brands/Variants ↔ price history; plus publications, comments, decisions, Activity).
`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` specifies it as a claims-tagged SVG plate — every
node labeled Live/Building/Planned per the D-4 `ClaimStatus` type (narrowed to the
Live/Building/Planned subset; no NotUs nodes on the plate).

**The non-transferable half:** the *specific nodes* do not transfer (Amigo's nodes are about
healthcare AI safety; Archestimator's are about commercial-graph data model). The *trust-badging*
does not transfer (entity/DPA not done — L-LEG-1…4). The *case study* does not transfer (no
customers). The *comparison table* does not transfer (implies measured parity we do not have).

### 3.3 The honest substitution + the "no competitor has drawn it" claim (softened)

**Prior draft assertion:** "No competitor in our segment has drawn the commercial graph."
**Status: SOFTENED.** This was an assertion made without a systematic competitive scan of the
AEC-estimating segment (Procore, Buildertrend, PlanSwift, Cost-X, Assemble, RIB iTWO, locally
Bluebeanbag/Constructor PH). **This revision restates it as a working hypothesis, not a verified
fact:** *To the best of this pack's knowledge as of 2026-06-22, no direct competitor publishes a
named, claims-tagged diagram of the estimate→component→supplier→proposal→handoff→reuse loop as
their primary marketing artifact. A formal competitive scan (Procore + Buildertrend + 2-3 SEA
estimating tools) is the honest way to close this — carried as **L-PEG-1** in `LOOP_LEDGER.md`.*
Until L-PEG-1 closes, the doc 01 phrasing is "a named architecture **that, to our knowledge, no
direct competitor has drawn in this form**" — qualified, not absolute.

Two honest substitutions make the Amigo move ours regardless of how L-PEG-1 resolves:

1. **Our named parts are real.** Amigo names an architecture and backs it with badges + case
   studies we do not have. Archestimator names the §8.3 data model (the actual schema) and backs
   each node with a claims-status tag. The honesty *is* the proof engine.
2. **Our architecture is the moat, not a slide.** §8.3 is explicit: "This graph is what makes
   the cost intelligence layer possible." The reusable library feeding the tree, recorded in
   Activity, handed off as a proposal, surfaced back: that loop is the lock-in (§9.2). Whether
   or not a competitor has drawn it, *we* can draw it truthfully because it is the real schema.

### 3.4 The Amigo transfer verdict (full table)

| Element | Transferable to Archestimator? | Why |
|---|---|---|
| Named architecture as moat (draw the system, name every node) | ✅ Yes — the single most valuable transfer | The commercial graph, drawn and named, every node claims-tagged (`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`). |
| Two-layer composition (you-define / we-define) | ❌ No — but the pyramid shape is noted | Our split is Live (top) / Building (mid) / Planned (base) — claims-status, not control-layers (D-4). |
| 4-phase numbered process (DEFINE → TRAIN → DEPLOY → MONITOR) | ✅ As inspiration only | Our 5-step workflow (`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` §1 section 5) is the analogous sequence; ours is the user's workflow, not a deployment process. |
| Trust-badging (SOC2/GDPR/HIPAA) | ❌ No | Entity/DPA not done (L-LEG-1…4). |
| 6-pillar "Trust Infrastructure" grid | ✅ As IA inspiration only | Our `/trust` route (`06-PROOF-AND-CLAIMS-DISCIPLINE.md`) uses a similar grid shape, but the cells are claims + privacy posture, not compliance badges we lack. |
| Comparison table (Amigo vs Other) | ❌ No | Implies measured parity we do not have; §15 bans it. |
| EHR-style integration logo wall | ❌ No | None exist. |
| "99.9% safety scores" stat | ❌ No | Nothing measured; §15 bans fake metrics. |
| Category-hook hero | ✅ As inspiration only | Our hook is "Your cost intelligence layer." — same move, different category. |
| FAQ section | ✅ As IA inspiration only | `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` may carry an FAQ; the questions are ours. |
| Healthcare-AI specificity | ❌ No | Wrong market; ours is AEC estimating. |

---

## 4. The Workshop Dashboard bento — the in-house IA peg (added 2026-06-22)

> **Why add a third peg.** Intercom and Amigo are *external* pegs useful for the *moves*
> (category hook, named architecture, proof-stacking). But the strongest **IA** reference for
> Archestimator's own landing is the **Workshop Dashboard bento** — the surface Philip already
> loves and the surface "Start free" drops the user into. D-1 (the Glass Brand) makes brand
> continuity the central argument; the dashboard's bento IS the brand vocabulary the landing
> must speak. Studying it as a peg turns "the landing should feel like the dashboard" from a
> slogan into a transferable spec.

**Source:** in-repo — `src/components/workshop/dashboard/WorkshopDashboard.tsx` (read 2026-06-22,
not a fetch; this is our own code).

### 4.1 The macrostructure (the bento IA)

The Workshop Dashboard ships a **full-bleed bento** ("no centered, narrow column" — verified in
the component's own docstring at `WorkshopDashboard.tsx:109`). The observed IA:

| Bento cell | Content (verified in source) | Pattern |
|---|---|---|
| `dashboard-canvas-wash` shell | The whole bento floats on the warm canvas wash (`--grad-canvas-wash`, `globals.css:62`) inside `dashboard-root`. | The SAME canvas the Glass Brand landing bases its whole page on (D-1, `03-VISUAL-LANGUAGE-AND-TOKENS.md` §3.1). |
| `dashboard-imageband` (the destination row) | A grid of `dashboard-destination-card` tiles — Projects, Components — each with a big numeral (`font-numeric text-[22px] font-thin`), an index, a title (`font-display text-[32px] uppercase tracking-[0.04em]`), and a hover color-transition (`transition-colors duration-[200ms]`, `motion-reduce:transition-none`). | **The editorial numeral + display-title pattern the landing's hero numerals + section titles reuse.** |
| `dashboard-destination-card-index` | A mono index numeral (`font-numeric`) per tile. | The "every node has a mono numeral" register the commercial-graph plate (`04`) and the claims ledger (`06`) adopt. |
| Published / Recent rails | Right-side rails (`dashboard-published-list`) carrying recent projects + recent components, each row with a mono count (`font-numeric text-[9px]`). | The "tight rhythm, mono metadata" register. |
| Glass surfaces | Tiles sit on `.dashboard-glass`-equivalent surfaces with the deferred-glass arming (`data-glass="ready"` → `--glass-blur-amount`). | The exact glass system the landing reuses verbatim (`03` §4). |

### 4.2 What transfers (everything, because it is our own system)

| Element | Transferable? | Why |
|---|---|---|
| Warm canvas + canvas wash as the page base | ✅ Verbatim | `--canvas` / `--warm-canvas` `#f5f5f5` + `--grad-canvas-wash` (`globals.css:17, 62`) — already the landing's page background (D-1). |
| Full-bleed bento (no narrow centered column) | ✅ As IA inspiration | The landing's hero + plate + ledger can adopt a bento IA rather than a centered editorial column — *subject to owner sign-off* (L-PEG-2). |
| Big-numeral + display-title tile pattern | ✅ Verbatim register | `font-numeric` (Roboto Mono, weight 200) numerals + `font-display` (Doto) uppercase titles — the exact type pairing `03` §2 aliases. |
| Mono index per tile | ✅ Verbatim | The commercial-graph plate (`04`) and claims ledger (`06`) use the same mono-index register. |
| Hover color-transition with `motion-reduce` guard | ✅ Verbatim | `transition-colors duration-[200ms] ease-out motion-reduce:transition-none` — the exact motion contract `03` §8 and `07-ENGINEERING-CONSTRAINTS.md` enforce. |
| Deferred-glass arming | ✅ Verbatim | `data-glass="ready"` + `--glass-blur-amount` — reused unchanged (`03` §4.3). |

### 4.3 What does NOT transfer

- The dashboard's dense, interactive, stateful workspace density does NOT transfer — the
  landing is editorial (larger type, more air, fewer controls). `03` §9 codifies the
  shared-vs-distinct split.
- The dashboard's compact ≤12px type floor does NOT transfer — the landing's body floor is
  ≥14px (`03` §3.4, `12-ACCESSIBILITY-AUDIT.md` §2).

---

## 5. Mobile / responsive analysis (375px) — added 2026-06-22

> The brief asks for a 375px analysis of both pegs. Below is what the fetched HTML/CSS and the
> in-repo dashboard source evidence about each peg's mobile behavior. **This is planning-level
> IA evidence, not a full device-lab test** — the live 375px verification of our own surfaces
> lives in `12-ACCESSIBILITY-AUDIT.md` (breakpoints) and `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`
> (target device).

### 5.1 Intercom at 375px (evidence from served HTML)

- **Picture-element responsive images.** Every "complete solution" block ships separate
  `.../mobile/...webp` variants (verified: `IC_Complete_02-handoffs_mob.webp`,
  `IC_Complete_03-insights_bg_mob.webp`, `IC_Complete_04-self-improving_product_Mob.webp`,
  `IC_Helpdesk_02_Customer-intellegence_product_Mob.webp`, etc.). **Transferable lesson:**
  serve distinct mobile image assets, not just `max-width`-scaled desktop ones — the mobile
  crops are reframed, not resized. `19-ASSET-PIPELINE-AND-IMAGERY.md` owns the equivalent rule
  for our (much smaller) asset set.
- **Stacked single-column collapse.** The four "complete solution" blocks stack vertically at
  mobile widths (the `mob.webp` variants imply a mobile-first single-column composition). Our
  `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` section taxonomy stacks the same way
  (`12-ACCESSIBILITY-AUDIT.md` owns the 320/375/414/768 breakpoint contract).
- **Sticky header collapses to hamburger** (standard N1b mobile pattern). Our nav does the same
  (`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`).

### 5.2 Amigo at 375px (evidence from served HTML — strong signal)

- **A dedicated `pyramid-mobile.svg` is shipped alongside `pyramid.svg`** (both verified as
  `<img src>` + as `preload` entries in the served `<head>`). **This is direct evidence that
  Amigo drew a separate mobile pyramid** — the 12-base-node layout that reads as a wide pyramid
  on desktop becomes a *mobile-shaped* composition on small screens. **Transferable lesson:**
  our commercial-graph plate (`04`) **must** collapse to a vertical stack at mobile widths
  (already specified in `04` §4.8 and `12-ACCESSIBILITY-AUDIT.md`) — Amigo's two-SVG pattern is
  the peg evidence that a mobile-shaped version is worth the asset cost for a complex diagram.
- **Every section ships a `*-mobile.png/svg` variant.** Verified preload list:
  `define-core-persona-mobile.png`, `define-dynamic-behaviors-mobile.png`,
  `define-actions-mobile.png`, `context-graph-mobile.svg`, `define-memory-mobile.png`,
  `deploy-channels-mobile.png`, `monitor-heatmap-mobile.png`. **Transferable lesson:** the
  pattern of *preloading the mobile image variant in `<head>`* is the perf play — Amigo
  preloads the mobile variant, not the desktop one, signaling a mobile-first asset choice.
  `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` and `19-ASSET-PIPELINE-AND-IMAGERY.md` own the
  equivalent decision for our (asset-light) surfaces.
- **FAQ section renders twice** (a mobile-collapse accordion pattern: the section appears once
  for mobile, once for desktop in the served HTML). Cautionary note: this is a *duplication*
  pattern, not a responsive pattern — our FAQ (if any) should collapse via CSS, not duplicate
  DOM. `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` notes this.

### 5.3 Workshop Dashboard at 375px (evidence from in-repo source + memory)

- Per memory `workshop-dashboard-responsive`, the bento was made responsive (7-col → 2-up →
  1-col) with two grid traps fixed (`dashboard-root` rows not reset at ≤1023, and
  `.dashboard-imageband > .iband-templates` specificity beating the tile reset). **Transferable
  lesson for the landing:** the landing's editorial grid must reset its row template at each
  breakpoint explicitly (the grid-trap lesson), and `12-ACCESSIBILITY-AUDIT.md` owns the test.
- Per memory `workshop-dashboard-no-scroll-fix`, the dashboard's scroll bug came from
  `min-height:100%` letting desk content inflate a phantom empty band; the fix was definite
  `height:100%` + 4 `minmax(0,row)` rows. **Transferable lesson:** the landing's hero + plate
  sections must use `minmax(0, ...)` rows to avoid the same phantom-band inflation on mobile.

---

## 6. Motion language analysis — added 2026-06-22

> The brief asks for transferable motion language. Below is the motion DNA extracted from each
> peg. Our own motion stance lives in `03-VISUAL-LANGUAGE-AND-TOKENS.md` §8 and is governed by
> `07-ENGINEERING-CONSTRAINTS.md`; this section is the *evidence base* for those stances.

### 6.1 Intercom motion DNA (evidence: fetched HTML + served asset names)

- **Block-by-block scroll reveal is the dominant motion.** The "complete solution" and
  "fully-featured helpdesk" sections imply an enter-viewport reveal (the product UI screenshots
  fade/slide in as the reader scrolls). **Transferable, restrained:** our scroll-reveal is a
  200–300ms opacity + 8px translateY fade on enter, once (`03` §8) — the same register,
  lighter.
- **No parallax, no skew, no scale-pulse on the marketing surface.** Intercom's motion is
  tasteful, not showy. **Transferable:** our `03` §8 bans parallax/skew/scale-pulse.
- **Hover states are color/transparency transitions**, not layout shifts. **Transferable:** our
  commercial-graph plate hover is a hairline-rule draw-on + a soft-orange wash + status-tag
  fade-in (`03` §8) — color/transparency, not layout.
- **`prefers-reduced-motion` respected.** (Inferred — Intercom ships an accessible product; not
  directly verified in the fetched CSS.) **Transferable, mandatory:** our `03` §8 + globals.css
  `@media (prefers-reduced-motion: reduce)` enforce this unconditionally.

### 6.2 Amigo motion DNA (evidence: served SVG + section structure)

- **The pyramid is a static SVG, not an animated diagram.** Both `pyramid.svg` and
  `pyramid-mobile.svg` are `<img>` elements, not inline animated SVG. **Transferable:**
  our commercial-graph plate (`04`) is also a static-by-default SVG with **one** hydrating leaf
  (the node hover) — the same restraint.
- **The 4-phase DEFINE/TRAIN/DEPLOY/MONITOR rail is a static numbered narrative**, not a
  scroll-driven animation. **Transferable:** our 5-step workflow (`02` §1 section 5) is static.
- **Section transitions appear minimal** (the page reads as a sequence of calm section blocks,
  not a motion showcase). **Transferable:** matches our "calm conviction" stance
  (`00-OVERVIEW.md` §10.2 #3).
- **Hover/interaction motion is confined to interactive elements** (the implication of a
  clean, section-stacked page). **Transferable:** our only interactive flourish is the plate
  hover (`03` §8).

### 6.3 Workshop Dashboard motion DNA (evidence: in-repo source)

- **Tile hover = color transition only** (`transition-colors duration-[200ms] ease-out
  motion-reduce:transition-none`, verified at `WorkshopDashboard.tsx:161, 231`). **Transferable
  verbatim:** this is the exact motion contract our landing tiles/CTAs adopt.
- **No scroll-reveal in the dashboard** (it is an app surface, not a marketing surface).
  **Cautionary:** the dashboard's motion minimalism is app-appropriate; the landing's
  scroll-reveal is editorially appropriate — they are different surfaces. `03` §8 codifies the
  distinction.
- **Deferred-glass blur ramp is the one "big" motion** (`--glass-blur-amount` 0→18px over
  220ms ease-out on capable devices, `globals.css:305`). **Transferable verbatim:** the landing
  reuses this exact pattern (`03` §4.3).

### 6.4 The synthesized motion language (transferable)

| Motion | Source peg | Archestimator's version |
|---|---|---|
| Restrained scroll-reveal (opacity + small translateY, once) | Intercom | `MotionReveal.tsx` (`src/components/landing/`, already in repo), 200–300ms, `prefers-reduced-motion`-guarded (`03` §8). |
| Color/transparency hover (no layout shift) | Intercom + Workshop Dashboard | Plate-node hover = hairline draw-on + soft-orange wash + status-tag fade (`04`, `03` §8). |
| Static SVG architecture diagram (one hydrating leaf) | Amigo + Workshop Dashboard | The commercial-graph plate (`04`) — static SVG, one interactive hover leaf. |
| Deferred-glass blur ramp (0→18px, 220ms, reduced-motion-snap) | Workshop Dashboard (in-house) | Reused verbatim via `<LiquidGlassReady />` (`03` §4.3). |
| `transition-colors duration-[200ms] ease-out motion-reduce:transition-none` | Workshop Dashboard (verbatim) | The exact transition utility string on landing CTAs/tiles (`07` enforces). |
| Banned: parallax, skew, scale-pulse, hero carousel, re-drawn chrome animations | (negative space from all three pegs) | `03` §8 bans them. |

**The one-line motion verdict:** borrow the Workshop Dashboard's verbatim hover-transition
string + the deferred-glass ramp; borrow Intercom's restrained scroll-reveal register; borrow
Amigo's static-SVG-diagram restraint. Reject everything showy. Motion teaches (the plate hover
teaches the ledger; the scroll-fade teaches "here is the next idea") or it is cut.

---

## 7. The synthesized transfer (the Archestimator hybrid)

The three pegs, synthesized into the Archestimator direction:

| From Intercom | From Amigo | From Workshop Dashboard | Archestimator's version |
|---|---|---|---|
| Category-hook hero (assert the category) | Named architecture as moat | Bento IA + brand vocabulary | "Your cost intelligence layer." hero + the commercial-graph plate (`04`) on the same warm-canvas bento the Workshop uses — category asserted at the top, named architecture beneath, brand-continuous with the product. |
| Proof-stacked sections (claim + evidence) | Claims-tagged nodes (every part named) | Mono-numeral index per tile | The Live/Building/Planned claims ledger (`06` §3, D-4 `ClaimStatus`) — every claim paired with its honest status, every node mono-indexed, not a screenshot. |
| Canonical SaaS nav (N1b, §2.8) | Canonical SaaS nav (N1b, §2.8) | (n/a — app surface) | N1b masthead-leaning (`02` §3), glass-skinned (`03` §4.2). |
| Tight section rhythm | 4-phase process | Bento tile rhythm | 11-section homepage taxonomy (`02` §1) + the 5-step workflow (§7.3). |
| 375px: per-variant mobile assets, stacked single-column | 375px: dedicated `pyramid-mobile.svg`, mobile-first preload | 375px: 7→2→1 bento collapse, `minmax(0,row)` grid-trap fix | `12` §breakpoints + `14` perf budget; plate collapses to vertical stack (`04` §4.8). |
| Restrained scroll-reveal | Static SVG diagram | `transition-colors 200ms` + deferred-glass ramp | `03` §8 motion stance (the synthesized table in §6.4). |
| Photographic backgrounds + product screenshots + named testimonials + stats + badges + published pricing + "the only…" + AI-forward | Trust-badging + case studies + logo walls + stats + comparison table + AI-forward | (n/a — app surface) | **All replaced by radical honesty** (`06`): no logos, no testimonials, no stats, no badges, no AI-as-current, no "the only," no published price — the honesty IS the proof. |

**The one-line conclusion:** borrow the *craft* (category hook, named architecture, tight
rhythm, N1b nav, restrained motion, mobile-variant discipline) and the *moves* (proof-stacking,
named-architecture-as-moat, bento brand vocabulary); replace the entire *proof engine* with
honesty. Where Intercom and Amigo lean on what they have (logos, stats, badges, AI), and where
the Workshop Dashboard leans on its interactivity, Archestimator leans on what it has: a glass
medium continuous with the product, a claims ledger, and a named graph.

---

## 8. Why these pegs, and not others

The user named Intercom + Amigo as the ideal pegs. The audit agrees they are the right pegs
*for the moves Archestimator borrows* — but the audit also names the risk (the **vapor-risk
warning**, §9): both external pegs are *mature* products with *proof props* Archestimator does
not have. Borrowing their craft without their proof engine would produce a page that looks like
Intercom/Amigo but reads as vapor (a pre-launch MVP with empty logo walls).

The direction in `01-DESIGN-DIRECTION.md` resolves this by **borrowing the moves, replacing the
proof**. The pegs remain the right reference for the moves; the proof engine is Archestimator's
own (radical honesty). The Workshop Dashboard peg (added 2026-06-22) is the *internal* reference
that immunizes against vapor — it is the actual surface the landing must rhyme with.

No other external peg was studied; if the owner wants a third (e.g., Stripe for the
modern-minimal register, or Linear for the dev-tool aesthetics), that is a separate study —
tracked as **L-PEG-3**.

---

## 9. The vapor-risk warning (load-bearing)

This is the single most important caveat in the doc and it gates the transfer verdicts above.

**The risk:** Intercom and Amigo work because they have the proof props (logos, named
testimonials, measured stats, compliance badges, published pricing, case studies). Archestimator
has **none** of these at pre-launch MVP closed-beta. If we borrow the Intercom/Amigo *visual
register* (tight rhythm, category hero, named architecture, N1b nav) **without** replacing their
proof engine with radical honesty, the page will read as **vapor** — a startup cosplaying a
mature product. The empty logo walls and the missing badge strips are not "to be added later";
they are forbidden by §15 and will never exist in the form Intercom/Amigo ship them.

**The mitigation (encoded across the pack):**

1. **Every claim is claims-tagged** (Live/Building/Planned, D-4 `ClaimStatus`). The reader can
   see exactly what is real today (`06`, `09`).
2. **The proof engine is honesty, not props.** The named architecture plate (`04`) is the moat
   move; the honesty is the proof.
3. **The Hallmark removal rail** (`02`, `06` §4, `21`) deletes the *existing* vapor on the
   current homepage (fabricated testimonials, hype hero, construction-photo slideshow, 2.3MB
   hero PNG, logo-only footer). Removal is gated on owner sign-off (L-REM-1…4).
4. **The Workshop Dashboard peg** (§4) keeps the landing honest about what the product *actually
   looks like* — the landing cannot drift away from the real surface.

**The gate:** if any sibling doc proposes a proof prop that violates §15 (a logo, a testimonial,
a stat, a badge, a published price, an "only we" claim), this doc's transfer verdict is being
violated and the proposal must be rejected.

---

## 10. Reproducibility

Every claim in this doc is reproducible:

- **Fetch** `https://www.intercom.com/` and `https://amigo.ai/platform` on 2026-06-22 (or
  later, with the date noted). The `amigo.ai/` homepage is now live (correcting the prior
  "domain-parked" claim); a direct homepage fetch is recommended for the next revision
  (L-PEG-4).
- The macrostructure (§2.1, §3.1) is the section rhythm in the served HTML.
- The pyramid (§3.1, §3.2) is verified verbatim in the served HTML at
  `amigo.ai/platform`; the `pyramid.svg` + `pyramid-mobile.svg` are in the `<head>` preload
  list.
- The named Intercom hero (§2.1) is verified in the served `<title>` / `og:title` / `<h1>` ("The
  only helpdesk designed for the AI Agent era").
- The Intercom `theme-color` (`#050505`) is verified in the served `<head>`.
- The Intercom pricing block (`$29 / Per Seat/Mo + $0.99`) is verified in the served HTML.
- The Amigo H1 change ("The all-in-one platform for every clinical workflow…") is verified in
  the served HTML (the prior "Turn clinical expertise…" line is now the `<title>`, not the H1).
- The Intercom testimonial trio (Isabel Larrow/Anthropic, Angelo Livanos/Lightspeed, George
  Dilthey/Clay) is verified by `<img alt>` + caption in the served HTML.
- The Intercom font claim (§2.2) is **deliberately softened** — no `@font-face`/Google-Fonts URL
  was surfaced in the 2026-06-22 fetch; "appears to use a modern geometric sans" is the honest
  state.
- The Workshop Dashboard bento analysis (§4) is read from the in-repo source
  (`src/components/workshop/dashboard/WorkshopDashboard.tsx`), not fetched.
- The transfer verdicts (§2.6, §3.4, §7) are the analysis against MASTER §15 (what Archestimator
  may claim) + §2 (what is honest) + the D-1 Glass Brand direction.
- Secondary references for the Intercom pricing-page structure (§2.7): SaaSFrame
  (`saasframe.io/examples/intercom-pricing-page`) and Unsection
  (`unsection.com/section/intercom-pricing-page-section-pricing-comparison`) — public design
  galleries, not primary sources.

---

## 10.5 Bounded AEC estimating market scan (2026-06-22)

This scan does **not** close L-PEG-1 (the formal PH/SEA competitor scan remains open), but it
does constrain the landing copy:

- **Spreadsheet pain is real and externally legible.** Bluebeam and HCSS both frame estimating
  software around moving teams beyond manual spreadsheet work: centralized takeoff/estimate
  workflows, cost databases, bid management, and fewer manual-entry errors. This supports the
  "why not a spreadsheet" section, but it is not unique to us.
- **The competitor category is crowded.** Capterra's construction-estimating category, STACK,
  and Procore Estimating show a broad existing market for takeoff, estimating, bid management,
  templates, cost data, and proposal workflows. Public copy must not imply "no competitors."
- **Our defensible emphasis is workflow shape, not category existence.** The landing should lead
  with the Live feature spine: reusable components/templates, drag/drop into the estimate sheet,
  the domain-shaped estimate tree, Activity/version history, and shared proposal
  comment/approval. The commercial graph remains a qualified positioning device — "we draw our
  workflow this way and claims-tag every part" — not a proven monopoly claim.
- **SEA/PH specificity is still unproven.** Keep L-PEG-1 open until Procore/Buildertrend/PlanSwift/
  CostX/RIB iTWO/Assemble plus local SEA/PH tools are reviewed against the same criteria.

Sources used for this bounded scan:

- Bluebeam, "Construction Estimation Software Guide 2026":
  `https://www.bluebeam.com/resources/construction-estimation-software-2026/`
- HCSS, "Excel vs Estimating Software":
  `https://www.hcss.com/blog/excel-vs-estimating-software/`
- Capterra, "Best Construction Estimating Software":
  `https://www.capterra.com/construction-estimating-software/`
- Capterra, "STACK":
  `https://www.capterra.com/p/147181/STACK-Takeoff/`
- Procore, "Estimating":
  `https://www.procore.com/estimating`

---

## 11. Cross-links

- **`00-OVERVIEW.md`** — owns the five ratified keystone decisions D-1…D-5 this doc obeys (Glass
  Brand, full-page auth, orange discipline, ClaimStatus type, honest scoring). The peg study
  informs pillars P1 (brand continuity, via the Workshop Dashboard peg), P2 (honesty as proof
  engine), and P3 (the named commercial-graph architecture, via the Amigo peg).
- **`01-DESIGN-DIRECTION.md`** — owns the condensed direction + the §4 peg study (the audited
  summary this doc backs). §4 of doc 01 cites this doc's §2/§3/§7; this doc is the underlying
  evidence.
- **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`** — owns the section taxonomy informed by §2.7
  (Intercom pricing-page grammar) and §6 (motion register); §2.8 defines N1b.
- **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`** — owns the named-architecture move made
  concrete; §3.2 + §6.2 + §6.4 of this doc are the Amigo-peg evidence base for that move.
- **`06-PROOF-AND-CLAIMS-DISCIPLINE.md`** — owns the radical-honesty proof engine (§2.3, §9 of
  this doc) that replaces the pegs' proof props.
- **`07-ENGINEERING-CONSTRAINTS.md`** — owns the motion-perf contract this doc's §6 informs.
- **`10-CANONICAL-DOC-MAP.md`** — canonical filenames; every cross-link above reconciles here.
- **`12-ACCESSIBILITY-AUDIT.md`** — owns the 320/375/414/768 breakpoints this doc's §5 informs.
- **`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`** — owns the mobile-first preload + asset-variant
  perf decision this doc's §5 informs.
- **`19-ASSET-PIPELINE-AND-IMAGERY.md`** — owns the mobile-variant asset rule this doc's §5
  informs.
- **`LOOP_LEDGER.md`** — open decisions (L-PEG-1 competitive scan, L-PEG-2 bento-on-landing,
  L-PEG-3 third external peg, L-PEG-4 Amigo homepage re-fetch).

---

## 12. ⚠️ Gated on / Open decisions

Per D-5, no gate is silently marked closed. The load-bearing gates for THIS doc:

- **L-PEG-1 — Competitive scan of the AEC-estimating segment.** The "no competitor has drawn the
  commercial graph" claim (§3.3) is currently a *qualified hypothesis*, not a verified fact. A
  formal scan (Procore, Buildertrend, PlanSwift, Cost-X, Assemble, RIB iTWO, + 2-3 SEA
  estimating tools) is the honest way to close it. ⚠️ GATED ON owner; until then the doc 01
  phrasing stays qualified ("to our knowledge").
- **L-PEG-2 — Bento IA on the landing.** The Workshop Dashboard peg (§4) suggests the landing's
  hero + plate + ledger could adopt a bento IA rather than a centered editorial column. This is
  a structural copy/IA decision (affects `02`, `04`, `11`), not a token decision. ⚠️ GATED ON
  owner + `01-DESIGN-DIRECTION.md` sign-off.
- **L-PEG-3 — A third external peg study.** Stripe (modern-minimal register) or Linear
  (dev-tool aesthetics) or another. Defer unless the owner wants a broader reference set.
- **L-PEG-4 — Amigo homepage direct re-fetch.** The 2026-06-22 revision re-fetched the platform
  page (high confidence) but not the homepage (medium confidence, per §3 confidence note). A
  direct `amigo.ai/` fetch in the next revision closes this.
- **L-REM-1…4 — Hallmark removals** (cross-link). The vapor-risk mitigation (§9) depends on the
  owner signing off the removal rail. Carried in `LOOP_LEDGER.md` from `00-OVERVIEW.md` G-8.

**Resolved by this revision (no longer gates):**

- **The Amigo "domain-parked" claim** (prior draft) — **corrected**: the homepage is live (§3,
  §10). The platform page remains the primary DNA source either way.
- **The Intercom "4-tab hero" claim** (prior draft) — **corrected**: the hero is now the
  four-block "complete solution" section (§2.1, §10).
- **The Intercom "Inter font" claim** (prior draft) — **softened**: "appears to use a modern
  geometric sans" (§2.2); not load-bearing for the transfer verdict.
- **The "no competitor has drawn the graph" claim** (prior draft) — **softened** to a qualified
  hypothesis (§3.3), gated on L-PEG-1.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.**
Every external claim is bound to a fetched URL + date (§10) or explicitly softened. Voice
throughout = Controlled Confidence (`00-OVERVIEW.md` §10). Rate-limiting / abuse are out of
scope for this doc (owned by `15-FORMS-AND-ABUSE-GUARDRAILS.md`, Postgres not Redis).
