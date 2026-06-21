# 01 — Design Direction: why "The Document"

> **PLANNING ONLY · 2026-06-21 · not code.**
> **Purpose:** Defend Direction A — "The Document" — as the design direction for the landing system: the three reasons it wins, the three alternatives weighed (The Document / The Layer / The Blueprint), the Intercom + Amigo peg study with the transferability verdict, the Hallmark diversification notes, and the wedge-fit caveat. This doc owns the *direction rationale* and the *peg study*. It does not own section order (`02-SECTION-TAXONOMY-AND-IA.md`), tokens (`03-VISUAL-AND-TOKEN-SYSTEM.md`), the commercial-graph plate (`04-COMMERCIAL-GRAPH-PLATE.md`), copy (`05-COPY-SKELETON.md`), components (`06-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`), engineering (`07-ENGINEERING-SPEC.md`), or rollout (`08-ROLLOUT-AND-ANALYTICS.md`). Cross-link, do not duplicate.

**Locked context (do not relitigate; every doc in this pack obeys):** Direction A is decided. This doc explains *why* so the rest of the pack stays coherent, not to reopen the call. Primary CTA = "Start free"; secondary = "Book a walkthrough". Routes: `/`, `/features`, `/pricing`, `/about`, `/contact` + new `/trust`. Proof = radical honesty (claims ledger) + the named commercial graph — NO logos / testimonials / stats (none exist; §15 forbids inventing them).

---

## 1. The direction, in one sentence

The landing system is set on the same warm proposal-paper `#FFFDF8` and the same Source Serif 4 the product's exported proposals are typeset in, so the page itself is a **specimen of the document quality the product sells** — credibility from craft and honesty, not from logos or dashboards-that-perform.

This is the §12.9 argument made literal: *"documents you would trust, not dashboards that perform."* The page is the proof of itself.

That is the whole bet. Everything below is rationale, alternatives, pegs, and caveats.

---

## 2. Three reasons "The Document" wins

### 2.1 The medium carries the message (continuity with the export, per §12.9)

Archestimator's proposal export is already on `proposal-paper` `#FFFDF8` with a Source Serif 4 body (`DESIGN.md` §Colors → "Proposal paper"; `proposal-body` token, `Source Serif 4`, scope `proposal/export-only`). The cost proposal is the artifact the client actually receives and signs off on. Setting the marketing page in the **same paper and the same serif** makes a silent, load-bearing claim: *the document you are reading right now is the kind of document this product produces.* No screenshot can make that claim as cheaply or as honestly; the page itself is the demonstration.

This is the only direction that lets the surface *be* the argument rather than *show* the argument. The Layer and the Blueprint (§3) both have to illustrate the point; the Document simply embodies it.

Cross-link: the type pairing (Source Serif 4 display + body, SF Pro chrome, Roboto Mono numerals) is specified in `03-VISUAL-AND-TOKEN-SYSTEM.md` and is additive to the existing `globals.css` tokens (`--proposal-paper`, `--ink`, `--font-display`, etc.) — do not clobber existing directives.

### 2.2 Honesty is the proof engine, and documents are where honesty lives (§15, §4.4#6)

The product has no logos, no testimonials, and no metrics to lean on — and §15 forbids inventing any (§12.8: "none may be invented"). The only proof available is **radical honesty**: a Live / Building / Planned claims ledger, private-by-design positioning, and the named commercial-graph architecture nobody else has drawn.

A document is the honest medium. Documents have footnotes, version history, stated caveats, and a voice that owns its limits. Dashboards and slide decks, by contrast, *perform* — they imply a polish and a breadth the pre-launch MVP does not have. The current landing page is exactly this trap: a 2.3MB frosted-construction hero PNG, a 9-slide construction-photo slideshow, and fabricated testimonials (see `src/components/landing/HeroSection.tsx:19-65` and `TestimonialSection.tsx`). The Document direction replaces the performance with craft, and makes the honesty the proof.

This is why the claims ledger (section 7 in `02`) and the `/trust` route sit so naturally inside this direction — they are document artifacts. Under the Layer or Blueprint direction, they would read as tacked-on compliance.

### 2.3 The serif is the signal, and the signal is differentiation by taste

In a category where every competitor's site is either an enterprise-blue dashboard (InEight, Ediphi, Procore) or a generic SaaS gradient hero, **a high-contrast serif on warm paper is the single most differentiating visual move available for free.** No new photography, no illustration commission, no motion budget — just a font choice the repo already ships (Source Serif 4) on a ground the product already uses (`#FFFDF8`).

The serif also carries the Controlled Confidence voice (§10): it reads as *calm conviction*, not *loud hype*. The current hero's banned lines — "Start Winning", "Win More Bids", "Estimate with Precision. Win with Clarity" (`HeroSection.tsx:83, 95, 269, 294`; §16.4) — are loud lines on a loud surface. A serif on paper makes the approved §10.4 lines ("The teams that win do not guess their numbers", "Better estimates create better leverage") read as *stated, not sold* — which is exactly §10.2 principle 3: "State things; do not sell them."

---

## 3. The three alternatives considered

Direction A was picked over two credible alternatives. The trade-offs below are the record of the call.

### 3.1 Direction A — The Document (CHOSEN)

The editorial specimen on proposal-paper with Source Serif 4, as described above.

| Strength | Risk |
|---|---|
| Medium IS the message; instant, free differentiation; honesty reads natively; voice and visual align (§10). | Can read as *quiet* to a buyer scanning for energy; serif + paper risks "law firm" gravitas if the type is too heavy or the copy too formal. **Mitigation:** SF Pro for chrome/CTAs keeps the page interactive, not archival; the redline accent (§5) injects the architect's-mark energy; copy is §10 Controlled Confidence, not legalese. |

### 3.2 Direction B — The Layer (considered, not chosen)

A darker, more "infrastructure" surface that leads with the cost-intelligence-layer metaphor visually — abstract planes, depth, "the layer beneath your projects." Closer to a developer-tools or infra-company aesthetic.

| Strength | Risk |
|---|---|
| Maps cleanly to the brand hook ("cost intelligence layer", §3); would look modern and "platform-y"; good fit for the investor/deck layer of the narrative (§5). | **Conflicts with §12.9** — "dashboards that perform" is exactly what an infra-dark aesthetic courts. Severed from the proposal-export continuity that makes the document argument free and un-fakeable. Requires invented visuals (abstract planes are illustration, which costs budget and risks AI-slop). Reads as a tool, not as the *document* the client signs; loses the specimen argument. The product is pre-contract proposal tooling, not post-contract infra — an infra aesthetic overstates the maturity (§15 risk). |

This is the direction to keep in reserve for a future investor/infra page, not the public marketing surface.

### 3.3 Direction C — The Blueprint (considered, not chosen)

A construction-blueprint aesthetic: gridded ground, technical-drawing linework, measurement marks, mono numerals. The obvious construction-industry visual metaphor.

| Strength | Risk |
|---|---|
| Immediately legible to the AEC audience; a strong, ownable visual idea; plays well with the redline accent. | **Forbidden by `DESIGN.md`** ("Avoid ... blueprint clichés") and by the Hallmark anti-AI-slop rail (blueprint-construction is one of the most templated AI-generated aesthetics — the opposite of differentiation). Blueprint-ness also implies *takeoff / BIM*, which the product explicitly does NOT do today (§7.4: "no BIM/drawing/parameter ingestion today"). Selling a blueprint aesthetic would let buyers infer a takeoff capability the MVP does not have — a §15 trap. The Document direction keeps construction as the *proof case* (§4.1) without literalizing it. |

### 3.4 Why A wins, summarized

A is the only direction that (a) is free and un-fakeable, (b) obeys §12.9 rather than fighting it, (c) carries the honesty-proof natively, and (d) does not imply a capability the MVP lacks. B overstates maturity and severs the export continuity; C literalizes a metaphor the product deliberately stops short of. A wins on product truth, not just on taste.

---

## 4. Peg study: Intercom + Amigo DNA, and the transferability verdict

Two pegs were studied for craft and for the "named-architecture-as-moat" move. Both are §15-incompatible at the surface — neither's *proof engine* transfers — but their *craft* and *architecture move* do.

### 4.1 Intercom — proof-stacked, product-screenshot-led

Near-black surface, product-screenshot-led, category-hook hero ("The only helpdesk for the AI Agent era"). Proof is stacked: four capability pillars each anchored by a real screenshot, an omnichannel feature grid, named testimonials (Anthropic, Lightspeed, Clay), compliance badges, and transparent pricing.

**DNA worth naming:** a *bold category-hook hero* (they assert a category; we have one in "Your cost intelligence layer", §11.1); *proof-stacked* sections where each claim is paired with its evidence; *calm confident type* and tight section rhythm.

### 4.2 Amigo — trust-first, named-architecture-led

Healthcare-AI infra. Logo wall, three big stats, an anchor case study (Eucalyptus), and — the load-bearing move — a **NAMED architecture** ("Cognitive Architecture": Agent Core / Context Graph / Functional Memory / Dynamic Behaviors / Actions), plus SOC2 / GDPR / HIPAA badges.

**DNA worth naming:** the *named-architecture-as-moat* move. They drew a picture of their system and named every node, and that picture *is* the trust argument. We have an equivalent no competitor has drawn: the commercial graph (§8.3: Projects → Estimates → Group/Area → rows ↔ Components ↔ Suppliers/Brands/Variants ↔ price history, plus publications, comments, decisions, Activity). Ours is named, claims-tagged, and visualized as an SVG plate in document-craft — see `04-COMMERCIAL-GRAPH-PLATE.md`.

### 4.3 Transferability verdict

| Element | Transferable to Archestimator? | Why |
|---|---|---|
| **Bold category-hook hero** | ✅ Yes | We have the hook: "Your cost intelligence layer" (§11.1). It is the one unfamiliar phrase surrounded by plain words (§10.2 principle 2). |
| **Named architecture as moat** | ✅ Yes — the single most valuable transfer | The commercial graph (§8.3), drawn and named like Amigo's Cognitive Architecture, but ours and every node claims-tagged. See `04`. |
| **Calm confident type + tight section rhythm** | ✅ Yes | Source Serif 4 + SF Pro chrome; the §2 section taxonomy in `02` gives the rhythm. |
| **Proof-stacked sections (claim + evidence pairing)** | ✅ Yes, *re-engineered* | The claims ledger (section 7 in `02`) is our version: each Live / Building / Planned claim paired with its honest status, not a screenshot we do not have. |
| **Logo wall** | ❌ No | None exist. §15 forbids inventing them. |
| **Named testimonials (Anthropic, Lightspeed, Clay)** | ❌ No | None exist. §12.8 forbids inventing them; the 3 current fabricated testimonials are on the removal rail. |
| **Three big stats / metrics** | ❌ No | None measured. §15 bans fake metrics; §14.1 concedes commercial certainty is "not yet proven." |
| **Compliance badges (SOC2 / GDPR / HIPAA)** | ❌ No | Entity not formed; DPA / Privacy Policy not drafted (§17 items 2-4; §18.2). The `/trust` route states privacy posture honestly, it does not badge it. |
| **AI-hero / AI-forward framing** | ❌ No | AI is deferred (§7.2, §16.1). Must not feature as current. |
| **"The only platform that..." superiority line** | ❌ No | §2 explicitly bans it; the reusable-cost-intelligence space is established (§2 Finding 2). |

**Conclusion (one line):** borrow the *craft* and the *named-architecture move*; replace the entire proof engine with honesty. Where Intercom and Amigo lean on what they have (logos, stats, badges, AI), we lean on what we have: a document medium, a claims ledger, and a named graph.

---

## 5. Hallmark diversification notes

The Hallmark anti-AI-slop rail applies to this page as a greenfield redesign. The direction must not collapse into a templated look. Three levers keep it diverse.

### 5.1 Paper band (the ground)

The single most diversifying move is the **warm proposal-paper ground** `#FFFDF8` instead of the default `#FFFFFF` or a cool-grey SaaS canvas. This is not a minor tint: it is the difference between "a web page" and "a document." Almost no SaaS landing page commits to a warm paper ground across the whole surface; doing so is the cheapest anti-template move available. The paper must be the *page* background, not a card floating on white — otherwise the effect reads as a sticky note, not a specimen. (Token spec in `03`.)

### 5.2 Display style (the type)

Source Serif 4 as **both display and body prose** is the second diversifier. The default SaaS move is a grotesque sans (Inter / Geist) for display; the second-default is a serif headline over a sans body. Committing to a serif *throughout the prose* — including the body — is rarer and is what makes the page read as an editorial document rather than a marketing site. SF Pro is reserved for *chrome* (nav, labels, buttons, CTAs) so the page stays interactive and does not become an archival facsimile. Roboto Mono carries numerals/data, already in the repo (§8.2). The serif IS the signal; do not let it share display duty with a sans.

### 5.3 Accent (the redline, used sparingly)

The accent is **signal `#F24405` used as a "redline" annotation mark** — the mark architects draw on drawings to flag a correction. This is a category-native, ownable semantic for the accent that no SaaS template ships with. Used sparingly (accent discipline): to flag a load-bearing claim, to mark a node on the commercial-graph plate, to underline a single word in a headline. **Clay `#AA412A`** is the text-on-light variant for secondary accents. One accent family, sparingly — the page must not read as "orange SaaS." (Token and usage spec in `03`; the redline concept is shared with `04` for the graph plate and `05` for copy.) Note `globals.css` already exposes `--brand-orange #F24405` and the two-tone family is documented there; this direction reuses the existing token, it does not invent a new accent.

---

## 6. Tie to §12.9 (the load-bearing citation)

§12.9 (final sentence, `[PROPOSED]` but governing this pack): *"The aesthetic is the brand argument: documents you would trust, not dashboards that perform."*

The Document direction is §12.9 made operational:

- **"Documents you would trust"** → the proposal-paper ground + Source Serif 4 (the same as the export) + the claims ledger + the `/trust` route + a voice that owns its limits (§10).
- **"Not dashboards that perform"** → the removal rail: the 9-slide construction-photo slideshow, the 2.3MB frosted-construction hero PNG (`HeroSection.tsx:19-65`), the fabricated testimonials (`TestimonialSection.tsx`), the logo-only footer, and the banned hype hero (`HeroSection.tsx:83, 95, 269, 294`; §16.4). All on the removal list pending owner confirmation (see `08` rollout and the removal rail in `02`).

Every visual decision in this pack should be testable against §12.9: does this choice make the page more like a document you would trust, or more like a dashboard that performs? If the latter, cut it.

---

## 7. Wedge-fit caveat (Tier 1 is contractors/estimators, not only architects)

"The Document" risks reading as *architect-flavored* (paper, serif, redlines — all architect signifiers). The wedge is broader than architects: Tier 1 is **contractors / GCs, cost estimators / QS, specialty & fit-out firms, and architects** (§6.2). The first three are not architecturally-trained; a page that over-indexes on architect signifiers can read as "not for me" to the estimator running BOQs in a spreadsheet at 11pm.

This is a **calibration caveat, not a direction change.** Three mitigations keep the direction while widening the fit:

1. **Copy, not chrome, carries the role breadth.** The "Who it is for" section (section 6 in `02`) tiers the audience by GTM sequence and uses each role's directed message from §6.2/§12.10 in *their* terms (BOQ, DUPA, unit costs, bid), so contractors and estimators see themselves in the words even if the paper reads "designed." Copy lives in `05`.
2. **The redline is "the annotation mark," not "the architect's mark."** Frame it as the mark *any* disciplined estimator draws on a quote to flag a question — a redline is universal in AEC, not architect-exclusive. This is a copy/voice choice, not a visual one.
3. **The document is a *cost proposal*, not a *design document*.** The specimen the page embodies is the cost proposal the contractor sends the owner (§0: "from cost proposal to client approval") — the artifact every Tier 1 role produces, not the architect's drawing. Keep proposal-export language (§11.2 "From estimate to approval") front and center so the document reads as *commercial*, not *design*.

Net: the direction stands; the copy and the framing widen it to the full Tier 1 wedge. ⚠️ Validate the wedge-fit in the A/B preview (`08`) — specifically that contractors/estimators do not read the serif-and-paper as "for architects only." Flagged as an open validation item below.

---

## 8. Cross-links

- `00-OVERVIEW.md` — pack overview, locked decisions, route map.
- `02-SECTION-TAXONOMY-AND-IA.md` — the canonical homepage section taxonomy this direction is rendered through; the removal rail lives here.
- `03-VISUAL-AND-TOKEN-SYSTEM.md` — the token spec (paper, ink, type pairing, redline, radius, motion) that implements this direction; additive to `globals.css`.
- `04-COMMERCIAL-GRAPH-PLATE.md` — the named-architecture move (§4.2 above) made concrete as an SVG plate.
- `05-COPY-SKELETON.md` — voice-locked, claims-tagged copy; the §10 Controlled Confidence voice this direction relies on.
- `06-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` — nav chrome and component inventory (masthead-leaning N1b, document-styled footer).
- `07-ENGINEERING-SPEC.md` — RSC-first static implementation of the specimen; near-zero client JS.
- `08-ROLLOUT-AND-ANALYTICS.md` — `/newdesign`-style preview route, A/B old vs new, claims sign-off gate.
- `LOOP_LEDGER.md` — planning loop status and open questions for the pack.

---

## 9. ⚠️ Gated on / Open decisions

- ⚠️ **Owner confirmation of the removal rail.** The 9-slide construction-photo slideshow + the 2.3MB frosted-construction hero PNG + the 3 fabricated testimonials + the logo-only footer are deletions, not redesigns. The direction *assumes* they go; the owner must confirm on the Hallmark deletion rail before `02`/`08` ship the removal. (§12.9, §15, §16.4.)
- ⚠️ **Wedge-fit validation (§7 above).** The serif-and-paper direction must A/B-test as "for me" with contractors/estimators, not only architects. Validation lives in the `08` preview A/B; flag here so it is not lost.
- ⚠️ **Founder bio assets gate the founder/company section (section 9 in `02`), not this direction doc** — but the Document direction leans on founder-voice honesty in copy, so the `§11.5` about-page intro assumes bio assets will land before `/about` goes public. Tracked in `00` and `LOOP_LEDGER`.
- ⚠️ **Source Serif 4 display weight + optical sizing** must be tuned so the page reads *editorial*, not *law-firm* (§3.1 risk). Concrete weight/size decisions are deferred to `03`; flagged here because it is the single biggest "could read wrong" lever for this direction.
- ⚠️ **`DESIGN.md` is an alpha guide, not law** (per its status banner and `CLAUDE.md`). This pack's landing-paper + Source Serif 4 direction is a deliberate landing-surface divergence from the SF-Pro-neutral app default documented in `DESIGN.md` (which explicitly allows landing to "stay more experimental"). Defer to the owner on any design call that diverges from this doc; do not gate on the design-system lint.
