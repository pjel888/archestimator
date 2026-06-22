# 01 — Design Direction: why "The Glass Brand"

> **PLANNING ONLY · 2026-06-22 (revised per ratified keystone decisions D-1…D-5) · not code.**
> **Direction:** **THE GLASS BRAND** (keystone decision D-1, owner-directed by Philip 2026-06-22).
> The landing embodies the SAME brand Philip already loves in the Workshop Dashboard + Estimate
> Sheet: liquid-glass surfaces over a warm grey canvas, signal-orange presence, Doto display +
> Roboto Mono numerals + SF Pro UI. The prior "warm proposal-paper `#FFFDF8` + Source Serif 4"
> direction is **demoted to a documented ALTERNATIVE** — **Direction D — The Document** — in §3.4,
> preserved as viable if Philip later prefers it, NOT the default.
>
> **Purpose:** Defend **Direction A — The Glass Brand** as the design direction for the landing
> system: the three reasons it wins, the four alternatives weighed (The Glass Brand / The Layer /
> The Blueprint / The Document), the Intercom + Amigo peg study with the transferability verdict,
> the Hallmark diversification notes, and the wedge-fit caveat. This doc owns the *direction
> rationale* and the *peg study*. It does not own section order
> (`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`), tokens (`03-VISUAL-LANGUAGE-AND-TOKENS.md`), the
> commercial-graph plate (`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`), copy (`05-COPY-SKELETON.md`),
> components (`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`), engineering
> (`07-ENGINEERING-CONSTRAINTS.md`), or rollout (`08-ROLLOUT-AND-ANALYTICS.md`). Cross-link, do not
> duplicate.
>
> **Taste overlay:** Direction A is implemented through `$gpt-taste`, not through the prior
> restrained-motion reading of this doc. `24-GPT-TASTE-EXECUTION-CONTRACT.md` governs the pre-code
> `<design_plan>`, AIDA, editorial typography, real GSAP/ScrollTrigger, gapless bento, and label
> sweep. This doc still owns the brand rationale and truth rails.

**Locked context (do not relitigate; every doc in this pack obeys the ratified decisions D-1…D-5):**
Direction A — The Glass Brand is decided (D-1). This doc explains *why* so the rest of the pack stays
coherent, not to reopen the call. Primary CTA = "Start free" (`/signup` path settled by
L-FUN-1; self-serve behavior gated on L-FUN-2); secondary = "Book a walkthrough". Routes: `/`, `/features`, `/pricing`, `/about`,
`/contact` + new `/trust`; **auth is in scope** — `/login` + `/signup` as full-page 2-column
brand-forward surfaces (D-2; see `23-AUTH-EXPERIENCE.md`). Proof = radical honesty (a
Live/Building/Planned claims ledger, typed per D-4) + the named commercial-graph plate — NO logos /
testimonials / stats / badges (none exist; `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §15 forbids inventing
them).

---

## 1. The direction, in one sentence

The landing system is set on the **same warm grey canvas (`--canvas`/`--warm-canvas` `#f5f5f5`,
verified `globals.css:16-17`) and the same liquid-glass surfaces (`.dashboard-glass`,
`.dashboard-glass-warm`, `--glass-bg rgba(255,255,255,0.72)`, verified `globals.css:108-117`) the
Workshop Dashboard and Estimate Sheet are made of**, so the page itself is a **specimen of the
product's actual material** — credibility from craft, brand-continuity, and honesty, not from logos
or dashboards-that-perform.

This makes the click from "Start free" brand-continuous: the user moves from a glass-on-warm-canvas
editorial landing into a glass-on-warm-canvas compact workspace and recognizes the canvas, the glass,
the fonts (Doto + Roboto Mono + SF Pro), the 3/8/12px radius ramp, and the one signal-orange accent.
That continuity is the argument.

That is the whole bet. Everything below is rationale, alternatives, pegs, and caveats.

---

## 2. Three reasons "The Glass Brand" wins

### 2.1 Brand continuity IS the argument (the click-through is not a whiplash)

The in-app surface the user lands in after "Start free" is the Workshop Dashboard — a liquid-glass
workspace over a warm grey canvas with a signal-orange logo slab and Doto headlines (memories
`workshop-dashboard-editorial-grid`, `workshop-dashboard-rsc`, `liquid-glass-sidebar-direction`).
If the public marketing site looks like a different company — warm paper + a serif — the click-through
is a **brand discontinuity**, and a reader who just trusted the page enough to click "Start free"
trusts it *less* on the other side, not more. The page must look like the product.

The landing therefore acts as an **introduction to the app material**: the first viewport should
teach the reader the warm canvas, liquid-glass chrome, signal-orange brand slab, compact UI
discipline, and claims-tagged product architecture they will meet inside the product. The effect is
a hint and a handoff, not decorative glass for its own sake.

> ⚠️ **O-3 DISCLAIMER (inherited from `03-VISUAL-LANGUAGE-AND-TOKENS.md` §7.4; carried as L-DES-3,
> closed for the Glass Brand, preserved for Direction D):** Source Serif 4 is **DEFERRED**. The
> proposal export today is `.xlsx` (`src/app/api/.../proposal.xlsx/route.ts`), which has no body
> font. The "same serif as your exported proposal" continuity claim that Direction D (§3.4) leans on
> **cannot be made today** — it is aspirational until a proposal-preview surface ships serif. The
> Glass Brand makes a *different* continuity claim ("the same material your workspace is made of")
> which IS true today and needs no deferred surface. This is a structural reason D-1 is stronger than
> Direction D at the present product state. Copy must reflect this: the Glass Brand's claim is "the
> same surfaces and ink your workspace is built on," never "the same serif as your proposal."

This is the only direction that lets the public surface *be* the same brand as the product surface,
not merely *show* it. The Layer (§3.2) and the Blueprint (§3.3) have to *illustrate* a brand
relationship; the Document (§3.4) invents a *different* brand relationship; the Glass Brand *is* the
brand relationship.

Cross-link: the exact token aliases that make this true are in `03-VISUAL-LANGUAGE-AND-TOKENS.md` §3
(`--landing-canvas`, `--landing-accent`, `--landing-font-display`, etc., each aliasing a real
`globals.css` token) and the glass-application map is in `03` §4. This doc asserts the *why*; that
doc owns the *what*.

### 2.2 Honesty is the proof engine, and documents are where honesty lives — and so is glass

The product has no logos, no testimonials, and no metrics to lean on — and §15 forbids inventing any
(`ARCHESTIMATOR_MASTER.md` §12.8: "none may be invented"). The only proof available is **radical
honesty**: a Live / Building / Planned claims ledger (typed per D-4), private-by-design positioning,
and the named commercial-graph architecture nobody else has drawn.

Honesty is a *voice* and a *material*, not a *skin*. The current landing page performs the opposite
of honesty: a 2.3MB frosted-construction hero PNG, a 9-slide construction-photo slideshow, and three
fabricated testimonials (see `src/components/landing/HeroSection.tsx` and `TestimonialSection.tsx`,
listed for removal in `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §4 and `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`).
The Glass Brand direction replaces that performance with **craft**: glass surfaces that show their
own weight, ink that doesn't shout, and a single accent used as *presence*, not as *decoration*.

This is why the claims ledger (section 7 in `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`) and the
`/trust` route sit naturally inside this direction — the ledger reads as a glass document panel the
reader can trust (D-2: the `AuthGlassPanel` and the claims-ledger panel share the same
`.dashboard-glass-warm` vocabulary). Under the Layer or Blueprint direction, they would read as
tacked-on compliance; under the Document direction they would read natively too, but at the cost of
the brand-continuity argument (§3.4).

### 2.3 The signal-orange presence, used as presence, is differentiation by restraint

In a category where every competitor's site is either an enterprise-blue dashboard (InEight, Ediphi,
Procore) or a generic SaaS gradient hero, **a single signal-orange used only as "the alive thing" —
the logo slab, the focus ring, the accent rail, the one primary-CTA fill — is the most
differentiating restraint available for free.** No new photography, no illustration commission, no
motion budget — just the brand-orange token (`--brand-orange #F24405`, verified `globals.css:37`)
the product already ships, used in the disciplined way the dashboard already uses it.

The accent also carries the Controlled Confidence voice (`ARCHESTIMATOR_MASTER.md` §10): it reads as
*calm conviction*, not *loud hype*. The current hero's banned lines — "Start Winning", "Win More
Bids", "Estimate with Precision. Win with Clarity" (`HeroSection.tsx`; `ARCHESTIMATOR_MASTER.md`
§16.4) — are loud lines on a loud surface. A glass surface with one signal-orange presence mark makes
the approved §10.4 lines ("The teams that win do not guess their numbers", "Better estimates create
better leverage") read as *stated, not sold* — which is exactly §10.2 principle 3: "State things; do
not sell them."

The accent discipline is owned by `03-VISUAL-LANGUAGE-AND-TOKENS.md` §5 and bound by **D-3** (the
hard orange-token contract — see §5.3 below); this doc asserts the *strategy* of restraint, not the
token list.

---

## 3. The four alternatives considered

Direction A was picked over three credible alternatives. The trade-offs below are the record of the
call. Note that prior revisions of this doc listed three alternatives and treated "The Document" as
Direction A; the 2026-06-22 pivot (D-1) reorders them so the Glass Brand is primary and the Document
is preserved as Direction D.

### 3.1 Direction A — The Glass Brand (CHOSEN, owner-ratified D-1, 2026-06-22)

The editorial landing set on the same warm grey canvas + liquid-glass surfaces + Doto/Roboto-Mono/SF
Pro + signal-orange presence as the Workshop Dashboard. Bind: `03-VISUAL-LANGUAGE-AND-TOKENS.md` §1
+ §4.

| Strength | Risk |
|---|---|
| Medium IS the brand-relationship; instant, free brand-continuity with the product; honesty reads natively; the three real fonts are already loaded in `src/app/layout.tsx:2` (`Doto`, `Roboto_Mono`) — **zero new font requests** (§3 of `03`). | Glass is GPU-expensive on mid-range Android (the target device); a careless implementation can blow the CWV budget. **Mitigation:** the deferred-glass arming pattern (paint blur-OFF first, arm on idle via `<html data-glass="ready">` + double-rAF + `requestIdleCallback` + a 1500ms hard backstop) is reused verbatim from the app (`03` §4.3; `src/components/system/LiquidGlassReady.tsx`), and the **≤4 simultaneous blur panels** cap is a hard budget (`03` §4.4, enforced in `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`). |

### 3.2 Direction B — The Layer (considered, not chosen)

A darker, more "infrastructure" surface that leads with the cost-intelligence-layer metaphor visually
— abstract planes, depth, "the layer beneath your projects." Closer to a developer-tools or
infra-company aesthetic.

| Strength | Risk |
|---|---|
| Maps cleanly to the brand hook ("cost intelligence layer", `ARCHESTIMATOR_MASTER.md` §3); would look modern and "platform-y"; good fit for the investor/deck layer of the narrative. | **Conflicts with the brand-continuity argument (§2.1)** — the Workshop Dashboard is *not* a dark infra surface; shipping a dark landing would re-introduce the whiplash D-1 was ratified to prevent. Also conflicts with the §12.9 spirit ("documents/dashboards you would trust, not dashboards that perform" — an infra-dark aesthetic courts exactly that). Severed from the in-product material continuity. Requires invented visuals (abstract planes are illustration, which costs budget and risks AI-slop). Reads as a tool, not as the workspace the user is about to enter. |

This is the direction to keep in reserve for a future investor/infra page, not the public marketing
surface.

### 3.3 Direction C — The Blueprint (considered, not chosen)

A construction-blueprint aesthetic: gridded ground, technical-drawing linework, measurement marks,
mono numerals. The obvious construction-industry visual metaphor.

| Strength | Risk |
|---|---|
| Immediately legible to the AEC audience; a strong, ownable visual idea; plays well with the accent rail. | **Forbidden by `DESIGN.md`** ("Avoid ... blueprint clichés") and by the Hallmark anti-AI-slop rail (blueprint-construction is one of the most templated AI-generated aesthetics — the opposite of differentiation). Blueprint-ness also implies *takeoff / BIM*, which the product explicitly does NOT do today (§7.4: "no BIM/drawing/parameter ingestion today"). Selling a blueprint aesthetic would let buyers infer a takeoff capability the MVP does not have — a §15 trap. The Glass Brand keeps construction as the *proof case* (§4.1) without literalizing it. |

### 3.4 Direction D — The Document (DEMOTED; preserved as a documented ALTERNATIVE)

> **Status note (D-1, 2026-06-22):** This was the **prior Direction A** before the pivot. It is
> **NOT the default**. It is preserved here because it is a coherent, viable direction Philip may
> prefer later, and because much of this doc's reasoning (the honesty-as-proof argument §2.2, the
> accent discipline §2.3/§5.3, the peg study §4, the wedge-fit §7) was authored for it and
> **carries over unchanged** to the Glass Brand. If Direction D is re-adopted, the loading spec for
> Source Serif 4 is preserved in the git history of this file and in `03-VISUAL-LANGUAGE-AND-TOKENS.md`
> §7.4.

The editorial specimen on warm proposal-paper (`--proposal-paper #fffdf8`, verified `globals.css:98`)
with Source Serif 4 as both display and body prose, SF Pro reserved for chrome, Roboto Mono for
numerals.

| Strength | Risk |
|---|---|
| The paper-and-serif specimen is a *different* but equally honest proof engine; documents carry footnotes, version history, and a voice that owns its limits — honesty reads natively (§2.2). The serif *would* be the single most differentiating visual move available if the proposal export shipped it. | **Brand whiplash (the reason D-1 demotes it):** the Workshop Dashboard the user lands in after "Start free" is NOT paper-and-serif — it is glass-on-warm-canvas with Doto. A paper landing into a glass product is a discontinuity. **Plus O-3 (open):** Source Serif 4 is deferred; the proposal export is `.xlsx` and ships no serif, so the "same serif as your proposal" continuity claim *cannot be made today* (§2.1 disclaimer; `03` §7.4; L-DES-3). The continuity claim is the load-bearing leg of Direction D; without it, the direction is a *stylistic* choice, not a *brand* choice — and brand continuity is what D-1 prioritizes. |

### 3.5 Why A wins, summarized

A is the only direction that (a) is free and un-fakeable, (b) delivers brand-continuity with the
actual product surface (the load-bearing D-1 argument), (c) carries the honesty-proof natively, (d)
does not imply a capability the MVP lacks, and (e) ships with zero new font requests (the three real
fonts are already loaded). B overstates maturity and severs continuity; C literalizes a metaphor the
product deliberately stops short of; D is viable but invents a *different* brand from the product and
its continuity claim is gated on a deferred surface (L-DES-3). A wins on product truth and brand
truth, not just on taste.

---

## 4. Peg study: Intercom + Amigo DNA, and the transferability verdict

Two pegs were studied for craft and for the "named-architecture-as-moat" move. Both are
§15-incompatible at the surface — neither's *proof engine* transfers — but their *craft* and
*architecture move* do.

> **Evidence provenance (D-5 honesty):** the peg claims in §4.1 and §4.2 were verified by fetching
> the live pages on **2026-06-21**. The **full DNA extraction with the fetched URLs, fetched dates,
> and archived snapshots** is owned by **`22-PEG-STUDY-DEEP-DIVE.md`** (§2 Intercom source
> `https://www.intercom.com/` fetched 2026-06-21; §3 Amigo source `https://amigo.ai/platform`
> fetched 2026-06-21 — the `amigo.ai/` homepage was domain-parked at a PRO ISP placeholder on that
> date, so the platform page is the live DNA source). This doc cites the headline DNA; doc 22 holds
> the reproducible archive (it documents the fetch method in §1 and the reproducibility recipe in
> §6, including an `archive.org` capture recommendation for both URLs). **If a claim in this section
> is re-verified later, update doc 22 first and re-cite it here; do not re-assert a "verified" date
> in this doc without a doc-22 anchor.**

### 4.1 Intercom — proof-stacked, product-screenshot-led, tab-driven hero

Near-black surface (**theme-color meta `#050505`, verified live 2026-06-21**; archived snapshot and
fetch log in `22-PEG-STUDY-DEEP-DIVE.md` §2), product-screenshot-led, category-hook hero ("The only
helpdesk designed for the AI Agent era"). The hero is a **tabbed 4-tab system** — Helpdesk / Complex /
Insights / Self-improving — each tab pairing a one-liner capability claim with a real product
screenshot **against a photographic background** (sunset, ocean, balloons). The body stacks proof: a
"complete solution" 4-tile feature grid (Inbox/Phone/Help Center/AI Agent), a deeper 5-cluster
capability grid, named testimonials (Anthropic, Lightspeed, Clay), compliance badges
(SOC2/GDPR/HIPAA), and transparent published pricing ($29/seat + $0.99/resolution).

**DNA worth naming:** the *bold category-hook hero* (they assert a category; we have one in "Your
cost intelligence layer", `ARCHESTIMATOR_MASTER.md` §11.1); the *tab-driven hero macrostructure* (a
single hero surface that lets the visitor self-select the proof they need — we adopt the *move*, not
the tab UI, because our honesty rules out screenshots); *proof-stacked* sections where each claim is
paired with its evidence; *calm confident type* (Inter, a geometric sans) and tight section rhythm.

### 4.2 Amigo — trust-first, named-architecture-led (verified 2026-06-21)

Healthcare-AI infra. The live platform page (`amigo.ai/platform`, fetched 2026-06-21; archived in
`22-PEG-STUDY-DEEP-DIVE.md` §3; the `amigo.ai/` homepage was domain-parked at a PRO ISP placeholder
on that date, so the platform page is the live DNA source) leads with a category-hook hero ("Turn
clinical expertise into exponential capacity") and the load-bearing move: a **NAMED architecture**,
rendered as a **two-layer pyramid**:

- **Top layer ("You define"):** Agent · Clinical Reasoning · Product Experience (3 nodes).
- **Base layer ("We define"):** Identity & Persona · State-based Architecture · Memory System ·
  Safety Guardrails · Evaluation Architecture · Knowledge Retrieval · Global Directives · Agent
  Visibility · Behavior Triggers · Simulations · Dynamic Tool Calling · Reinforcement Learning
  (12 nodes).

This is followed by a **4-phase numbered process** (DEFINE → TRAIN → DEPLOY → MONITOR), a trust block
("solves AI's trust crisis" + SOC2/GDPR/HIPAA badges + "99.9% safety scores"), and an anchor case
study (Eucalyptus).

> **Correction of prior internal notes (D-5 honesty):** earlier drafts of this section (and of
> internal peg notes) sometimes summarized the Amigo architecture as a five-node list — "Agent Core /
> Context Graph / Functional Memory / Dynamic Behaviors / Actions." **That five-node list is
> outdated/partial; it does not match what `amigo.ai/platform` rendered on 2026-06-21.** The verified
> architecture is the **two-layer pyramid** above (top 3, base 12). The transferable DNA is unchanged
> by the correction (the named-architecture-as-moat *move* is the point, regardless of the node
> count), but any future re-citation must use the two-layer pyramid, not the five-node list.

**DNA worth naming:** the *named-architecture-as-moat* move. They drew a picture of their system and
named every node, and that picture *is* the trust argument. We have an equivalent no competitor has
drawn: the commercial graph (`ARCHESTIMATOR_MASTER.md` §8.3: Projects → Estimates → Group/Area →
rows ↔ Components ↔ Suppliers/Brands/Variants ↔ price history, plus publications, comments,
decisions, Activity). Ours is named, claims-tagged (D-4: Live/Building/Planned subset), and visualized
as a glass-skin SVG plate — see `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`. The full DNA extraction
with URLs/dates/archived snapshots lives in `22-PEG-STUDY-DEEP-DIVE.md`.

### 4.3 Transferability verdict

| Element | Transferable to Archestimator? | Why |
|---|---|---|
| **Bold category-hook hero** | ✅ Yes | We have the hook: "Your cost intelligence layer" (`ARCHESTIMATOR_MASTER.md` §11.1). It is the one unfamiliar phrase surrounded by plain words (§10.2 principle 2). |
| **Named architecture as moat** | ✅ Yes — the single most valuable transfer | The commercial graph (`ARCHESTIMATOR_MASTER.md` §8.3), drawn and named like Amigo's two-layer pyramid, but ours and every node claims-tagged (D-4). See `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`. |
| **Tab-driven hero macrostructure (Intercom)** | ✅ Yes, *the move* — not the tab UI | The *move* (one hero surface, visitor self-selects proof) transfers; the tab UI does not (our honesty rules out screenshots). The claims-ledger filter (`06-PROOF-AND-CLAIMS-DISCIPLINE.md` §2) is our self-select surface. |
| **Calm confident type + tight section rhythm** | ✅ Yes | Doto display + Roboto Mono numerals + SF Pro UI chrome (the Glass Brand stack); the section taxonomy in `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` gives the rhythm. |
| **Proof-stacked sections (claim + evidence pairing)** | ✅ Yes, *re-engineered* | The claims ledger (section 7 in `02`) is our version: each Live / Building / Planned claim paired with its honest status (D-4), not a screenshot we do not have. |
| **Logo wall** | ❌ No | None exist. §15 forbids inventing them. |
| **Named testimonials (Anthropic, Lightspeed, Clay)** | ❌ No | None exist. §12.8 forbids inventing them; the 3 current fabricated testimonials are on the removal rail (`06` §4). |
| **Three big stats / metrics** | ❌ No | None measured. §15 bans fake metrics; §14.1 concedes commercial certainty is "not yet proven." |
| **Compliance badges (SOC2 / GDPR / HIPAA)** | ❌ No | Entity not formed; DPA / Privacy Policy not drafted (`00-OVERVIEW.md` §7 G-9 / L-LEG-1…4). The `/trust` route states privacy posture honestly, it does not badge it. |
| **AI-hero / AI-forward framing** | ❌ No | AI is deferred (§7.2, §16.1). Must not feature as current. |
| **"The only platform that..." superiority line** | ❌ No | §2 explicitly bans it; the reusable-cost-intelligence space is established (§2 Finding 2). |
| **Transparent published pricing (Intercom $29/seat + $0.99/resolution)** | ❌ No | Our pricing is `[HYPOTHESIS]` (§9.3); no validated price exists (`00-OVERVIEW.md` G-7 / L-PRC-1). `/pricing` ships philosophy + the cement-anchor CONCEPT only. We have no validated price to publish. |
| **Photographic backgrounds behind hero copy (Intercom)** | ❌ No | `PRODUCT.md` bans stock photos; radical honesty bans performing a context we do not own. The Glass Brand hero is a brand-gradient composition (`--grad-hero-continue` / `--grad-hero-create`, verified `globals.css:59-60`) over a glass panel — abstract, warm, on-brand, zero image bytes (D-2). |

**Conclusion (one line):** borrow the *craft* and the *named-architecture move*; replace the entire
proof engine with honesty. Where Intercom and Amigo lean on what they have (logos, stats, badges, AI,
photographs, published prices), we lean on what we have: a brand-continuous glass surface, a claims
ledger, and a named graph.

---

## 5. Hallmark diversification notes

The Hallmark anti-AI-slop rail applies to this page as a greenfield redesign. The direction must not
collapse into a templated look. Three levers keep it diverse.

### 5.1 Glass over warm grey canvas (the ground)

The single most diversifying move is the **warm grey canvas `--canvas`/`--warm-canvas` `#f5f5f5`**
(verified `globals.css:16-17`) with the subtle `--grad-canvas-wash` brand-orange bloom (verified
`globals.css:62`), **floated with liquid-glass surfaces** (`.dashboard-glass` /
`.dashboard-glass-warm`, verified `globals.css:108-117`) — the same material the Workshop Dashboard is
built from. This is not a generic SaaS hero gradient: it is the *actual* product surface, which
almost no SaaS landing page commits to (most landings fabricate a "marketing" aesthetic distinct from
the product). Committing to the real product material is the cheapest anti-template move available,
and it is the load-bearing D-1 argument. The glass must be the *real* glass class (with deferred
arming per `03` §4.3), not a CSS imitation — otherwise the effect reads as a sticker, not a specimen.
(Token spec in `03` §3-§4.)

### 5.2 Display style (the type)

**Doto as the editorial display + Roboto Mono for every numeral + SF Pro for UI chrome** is the
second diversifier. The default SaaS move is a grotesque sans (Inter / Geist) for display; the
second-default is a neutral sans over a neutral sans. Committing to **Doto** (the wide-tracking,
near-monospaced display face the dashboard already uses for its hero) for editorial headlines is
rarer and is what makes the page read as the *same voice* as the Workshop. SF Pro is reserved for
*chrome* (nav, labels, buttons, CTAs) so the page stays interactive; Roboto Mono carries every
numeral and tabular data, already loaded (`src/app/layout.tsx:2`, verified). The display face IS the
signal; do not let it share display duty with a second display face. (Type spec in `03` §2.)

### 5.3 Accent (the signal-orange presence, used sparingly — D-3)

The accent is **signal `--brand-orange #F24405` (verified `globals.css:37`) used as *presence*** —
the color the dashboard uses for "this is alive, this is the active thing, this is where you look
first." Concretely: the logo slab fill, the `:focus-visible` ring, the 2px accent rail down the left
edge of a claims-tagged ledger row, the fill on the one primary CTA, a single tick on a Live node of
the commercial-graph plate. This is a category-native, ownable semantic for the accent that no SaaS
template ships with.

**Per D-3 (the hard orange-token contract):**

| Allowed (presence stance) | Forbidden (overload stance) |
|---|---|
| `--brand-orange #F24405` fill on the **one** primary CTA ("Start free") and the logo slab. | A second `#F24405`-filled button, card, or hero panel in the same viewport. |
| `--brand-orange` as the **focus ring** (instant `:focus-visible`). | `#F24405` as body text or a small icon `< 24px` — fails AA at ~3.75:1. Use `--brand-orange-dark #C63804` (verified `globals.css:38`, ~5.3:1 on white). |
| `--brand-orange` as a 2px **accent rail** down a claims-tagged row or section opener. | A `#F24405` gradient, glow, or background wash larger than a single tag. |
| `--brand-orange-soft` (14% wash, verified `globals.css:39`) behind a single tagged ledger row or graph node, sparingly. | Using the accent on more than one **element category** per viewport (fills AND rails AND washes simultaneously). |

One accent family, sparingly — the page must not read as "orange SaaS." (Token and usage spec in
`03` §5; the presence concept is shared with `04` for the graph plate and `05` for copy.)

> **Note on clay (D-3 reconciliation, closed):** earlier drafts of this pack referenced a "clay
> `#AA412A`" text-on-light variant. `#AA412A` appears in `DESIGN.md` prose only (the superseded
> pre-Signal "product" color; `globals.css:29` comment) but **is NOT a token in `globals.css`** and
> **is NOT used by the Glass Brand**. Signal (`#F24405` fill / `#C63804` AA small text) is the single
> accent family per the owner directive of 2026-06-19 and the ratified D-3 (2026-06-22). Every prior
> clay reference in the pack is reconciled to `--brand-orange-dark #C63804`. Do not grep for `--clay`;
> it does not exist.

---

## 6. Tie to §12.9 (the load-bearing citation)

§12.9 (final sentence, `[PROPOSED]` but governing this pack): *"The aesthetic is the brand argument:
documents you would trust, not dashboards that perform."*

The Glass Brand direction is §12.9 made operational for the present product state:

- **"Documents/dashboards you would trust"** → the same warm grey canvas + liquid-glass surfaces +
  Doto/Roboto-Mono/SF-Pro type + Live/Building/Planned claims ledger + `/trust` route + a voice that
  owns its limits (§10). The trust comes from *craft and honesty and material continuity*, not from a
  paper specimen (Direction D's argument) — though the Document direction reads §12.9 natively too,
  which is why it remains a viable Alternative D.
- **"Not dashboards that perform"** → the removal rail: the 9-slide construction-photo slideshow, the
  2.3MB frosted-construction hero PNG (`HeroSection.tsx`), the fabricated testimonials
  (`TestimonialSection.tsx`), the logo-only footer, and the banned hype hero (§16.4). All on the
  removal list pending owner confirmation (`00-OVERVIEW.md` G-8 / L-REM-1…4; execution in
  `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §4, `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`, and
  `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`).

Every visual decision in this pack should be testable against §12.9: does this choice make the page
more like a workspace you would trust, or more like a dashboard that performs? If the latter, cut it.

---

## 7. Wedge-fit caveat (Tier 1 is contractors/estimators, not only architects)

The Glass Brand is *category-native* (AEC), not *role-specific* (architect), which is one of its
advantages over Direction D (paper + serif + redline can read as architect-flavored). But the broader
calibration point still holds: Tier 1 is **contractors / GCs, cost estimators / QS, specialty &
fit-out firms, and architects** (`ARCHESTIMATOR_MASTER.md` §6.2). The first three are not
architecturally-trained; a page that over-indexes on any one role's signifiers can read as "not for
me" to the estimator running BOQs in a spreadsheet at 11pm.

This is a **calibration caveat, not a direction change** — and the Glass Brand is inherently less
role-coded than the Document direction was. Three mitigations keep the direction while widening the
fit:

1. **Copy, not chrome, carries the role breadth.** The "Who it is for" section (section 6 in `02`)
   tiers the audience by GTM sequence and uses each role's directed message from §6.2/§12.10 in
   *their* terms (BOQ, DUPA, unit costs, bid), so contractors and estimators see themselves in the
   words. Copy lives in `05`.
2. **The accent rail is "the active-state mark," not "the architect's mark."** Frame it as the mark
   *any* disciplined estimator draws on a quote to flag a question — a redline is universal in AEC,
   not architect-exclusive. This is a copy/voice choice, not a visual one.
3. **The plate is a *commercial graph*, not a *design document*.** The specimen the page centers on
   is the commercial-graph architecture (`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`) — the
   cost-intelligence layer every Tier 1 role produces estimates through, not the architect's drawing.
   Keep the "cost intelligence layer" + "from estimate to approval" language
   (`ARCHESTIMATOR_MASTER.md` §11.1/§11.2) front and center so the surface reads as *commercial*,
   not *design*.

Net: the direction stands; the copy and the framing widen it to the full Tier 1 wedge. ⚠️ Validate
the wedge-fit in the A/B preview (`08-ROLLOUT-AND-ANALYTICS.md`) — specifically that
contractors/estimators read the glass-and-Doto surface as "for me." Flagged as an open validation
item below.

**Forward-pointers (propagate, do not re-derive):**
- **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` §6** — the role lines per tier in the visitor's own
  terms (mitigation 1 lives here).
- **`05-COPY-SKELETON.md` §6** — the directed messages per role from `ARCHESTIMATOR_MASTER.md` §6.2
  / §12.10, and the "active-state mark" framing of the accent rail (mitigation 2 lives here). The
  three mitigations above propagate through those docs; do not re-derive them there.

---

## 8. Cross-links (canonical filenames per `10-CANONICAL-DOC-MAP.md`)

- `00-OVERVIEW.md` — pack overview, the five ratified decisions D-1…D-5, route map, sign-off gates.
- `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` — the canonical homepage section taxonomy this direction
  is rendered through; §6 carries the wedge-fit role lines (§7 mitigation 1); the removal rail lives
  here.
- `03-VISUAL-LANGUAGE-AND-TOKENS.md` — the token spec (warm grey canvas, glass classes, signal orange
  `#F24405` + dark `#C63804` per D-3, Doto + Roboto Mono + SF Pro type, 3/8/12px radius, restrained
  motion, deferred-glass arming, ≤4-blur cap) that implements this direction; additive to
  `globals.css`. §7.4 preserves the Source Serif 4 loading spec for Direction D.
- `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` — the named-architecture move (§4.2 above) made concrete
  as a glass-skin SVG plate; imports the D-4 ClaimStatus type, narrows to the Live/Building/Planned
  subset.
- `05-COPY-SKELETON.md` — voice-locked, claims-tagged copy; §6 carries the directed per-role messages
  + the "active-state mark" framing (§7 mitigations 2 & 3); the §10 Controlled Confidence voice this
  direction relies on.
- `06-PROOF-AND-CLAIMS-DISCIPLINE.md` — the radical-honesty proof system (claims ledger, §15 removal
  rail, `/trust`); owns the §15 mapping for every public word; uses the D-4 ClaimStatus type.
- `07-ENGINEERING-CONSTRAINTS.md` — RSC-first static implementation of the specimen; near-zero client
  JS; the deferred-glass arming budget.
- `08-ROLLOUT-AND-ANALYTICS.md` — `/newdesign`-style preview route, A/B old vs new, claims sign-off
  gate; owns the wedge-fit A/B validation (§7).
- `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` — nav chrome and component inventory; the
  `.dashboard-glass` / `.dashboard-glass-warm` surface designations.
- `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` — the ≤4-blur cap, CWV targets, Doto `adjustFontFallback`
  CLS verification (L-DES-6); the mid-range-Android GPU budget the glass plan must fit.
- `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` — file-level change inventory, the 7-phase migration order,
  the removal-rail execution, the rollback playbook.
- `22-PEG-STUDY-DEEP-DIVE.md` — **the full DNA extraction from Intercom + Amigo with URLs, fetched
  dates (2026-06-21), archived snapshots, and the reproducibility recipe (§6). Backs §4 of this doc.**
- `23-AUTH-EXPERIENCE.md` — the full-page 2-column auth surface (D-2): the LEFT `AuthGlassPanel`
  consumes the same `.dashboard-glass-warm` + `--grad-hero-*` + signal-orange logo slab vocabulary
  this direction ratifies for the landing.
- `LOOP_LEDGER.md` — planning loop status and the open-decision queue for the pack.

---

## 9. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

Per D-5, no gate is silently marked closed. The load-bearing gates for THIS doc:

- ⚠️ **G-11 / L-DES-1…5 — Glass-Brand visual final.** The pivot to the Glass Brand is owner-ratified
  (D-1, 2026-06-22); the *rendered* visual result wants one owner look before `03` token finalization,
  `04` plate skin, and `23` auth-panel composition finalize. The direction *mechanics* (tokens, glass
  classes, fonts) proceed regardless; only the final aesthetic sign-off is gated.
- ⚠️ **L-DES-1 — "Accent rail" / "active-state mark" public naming.** §5.3 + §7 mitigation 2 frame
  the accent as presence/active-state; whether the landing *names* it in any public caption
  (and whether the name is "accent rail," "active-state mark," or just the drawn mark) wants one
  owner sign-off. The mechanic proceeds regardless.
- ⚠️ **L-DES-3 — Source Serif 4 continuity (informational; closed for the Glass Brand).** The O-3
  disclaimer (§2.1) retires the "same serif as your proposal" continuity claim for the Glass Brand;
  the gate is preserved in `LOOP_LEDGER.md` L-DES-3 in case Direction D (§3.4) is later adopted.
- ⚠️ **L-DES-4 — SF Pro licensing on non-Apple platforms (inherited).** SF Pro is Apple-proprietary;
  the landing inherits the app's existing posture (the app already ships `--font-sf-pro`,
  `globals.css:99`, with clean system fallbacks). This is NOT a new landing-scoped decision; if the
  owner wants to close it product-wide (ship Inter as the drop-in), that is a cross-cutting change.
  See `03` §2.
- ⚠️ **L-DES-6 — Doto `adjustFontFallback` CLS verification.** The Glass Brand makes Doto the LCP
  element on the hero; CLS = 0 must be measured on a 320px Moto G-class device before cutover. Owned
  by `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` §6; starting values proposed in `03` §7.2.
- ⚠️ **G-8 / L-REM-1…4 — Owner confirmation of the removal rail.** The 9-slide construction-photo
  slideshow + the 2.3MB frosted-construction hero PNG + the 3 fabricated testimonials + the logo-only
  footer are deletions, not redesigns. The direction *assumes* they go; the owner must confirm on the
  Hallmark deletion rail before `02`/`06`/`21` ship the removal. (§12.9, §15, §16.4.)
- ⚠️ **Wedge-fit validation (§7 above).** The glass-and-Doto direction must A/B-test as "for me" with
  contractors/estimators, not only architects. Validation lives in the `08` preview A/B; flagged here
  so it is not lost.
- ⚠️ **G-6 / L-FND-1 — Founder bio assets** gate the founder/company section (section 9 in `02`) and
  `/about` richness, not this direction doc — but the honesty voice leans on founder-voice in copy, so
  `05-COPY-SKELETON.md` §11.5 about-page intro assumes bio assets land before `/about` goes public.
- ⚠️ **`DESIGN.md` is an alpha guide, not law** (per its status banner and `CLAUDE.md`). This pack's
  Glass Brand direction is a deliberate landing-surface decision that *aligns* with the in-product
  surface (D-1), so it is *inside* the design-system's sanctioned landing-experimentalism ("landing
  can stay more experimental"). Defer to the owner on any design call that diverges from this doc; do
  not gate on the design-system lint.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.** Voice
throughout = Controlled Confidence (§10). Pricing framing stays hypothesis-labeled per §9.3 (do not
publish a locked price). Rate-limiting is Postgres (`security_rate_limit_events` table), NOT Redis (project position).
Turnstile is NOT yet built (planned); `/contact` + `/signup` abuse = honeypot + Postgres rate-limit +
validation; CAPTCHA escalation-only.
