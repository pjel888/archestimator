# 04 — The Commercial-Graph Architecture Plate

> **PLANNING ONLY · 2026-06-21 · not code.**
> Status banner: this is a planning document in the Landing-Page-Redesign plan pack. No
> implementation, no copy is final until ratification (§1 NEEDS INPUT #1) and the claims sign-off
> gate (doc 08) pass. Every public-word suggestion below is bounded by §15 claims discipline and
> §10 Controlled Confidence voice; nothing invented.

**Purpose (one line):** Owns the keystone homepage section — the named, claims-tagged
**commercial-graph architecture plate** that makes the abstract "cost intelligence layer" concrete,
turns the §8.3 data model into a credibility device, and carries the Live/Building/Planned honesty
(§15) on every node.

This is the highest-leverage section of the redesign. Per the brief's peg study, the named-architecture
plate is the one move we borrow from Amigo ("Cognitive Architecture") and replace the proof engine with
radical honesty instead of logos/stats/testimonials we do not have (§15 forbids inventing them). It is
also where the §3 cost-intelligence-layer manifesto becomes a picture, and where the §8.3 "this graph is
what makes the cost intelligence layer possible" claim earns its keep.

This doc owns: (1) the section copy, (2) the full §8.3 node model with claims-status on each node,
(3) the SVG visualization spec (document-craft, explicitly NOT re-drawn chrome), (4) interaction /
responsive / a11y / motion behavior, (5) why this is the moat. It does NOT own tokens (→ 03), the
"How it works" 5-step workflow (→ 05), the claims-ledger section as a whole (→ 06), or engineering
delivery (→ 07).

---

## 1. Where this section lives (DOM order and neighbors)

Per the canonical homepage taxonomy in 00-OVERVIEW, this is **Section 3 — "The Layer + the
commercial-graph plate"**, sitting between:

- **Section 2 — The Problem** (→ 05): the rebuild-from-row-one pain (§3.2, §6.3, §11.4).
- **Section 4 — What you get** (→ 02/05): the three benefit blocks, "Stop starting from zero /
  Defend every number / From estimate to approval" (§11.2).

Narrative job at this seam: Section 2 names the dead-file problem; this section answers **"so what is
the thing that fixes it?"** with a named structure rather than a slogan. It is the bridge from pain to
proof — and it does the proof *by drawing the actual data model* (§8.3), not by performing a dashboard
(§12.9: "documents you would trust, not dashboards that perform").

> ⚠️ GATED ON the section ordering being frozen in 00-OVERVIEW. Do not reorder Section 3 relative to
> Section 2 or Section 4 without re-running the seam narrative.

---

## 2. Section copy (voice-locked, §10 Controlled Confidence)

Copy below is ready to ship within §15 discipline, pending ratification. Three altitudes only
(manifesto headline → plain payoff → node legend); no fourth paragraph. Mechanic nouns stay on
`/features` (→ 05), not here (§10.2 #1).

### 2.1 Section eyebrow (UI chrome, SF Pro label)

> The cost intelligence layer

### 2.2 Section headline (Source Serif 4 display)

> **Every estimate is part of a larger commercial graph.**
> Most estimating tools stop at the sheet. Yours keeps going: the prices you stand behind, the
> suppliers you choose, the revisions your clients ask for, and the proposals you hand off, all
> connected in one structured layer that builds up as you work.

### 2.3 Plain payoff (one sentence, the §3.1 tired-estimator register)

> The more you estimate in Archestimator, the more it works for you.

### 2.4 Caption under the plate (the §15 honesty frame, one line)

> Every node below is labeled by what exists today. Nothing is drawn that we have not built or
> committed to building — and the things we are still building say so.

### 2.5 Node-legend microcopy (paired with the claims tags on the SVG)

> **Live** ships today · **Building** is in progress · **Planned** is committed on the roadmap.

Voice check against §10.4 banned lines: no "only we / the only tool that", no "winners", no
superiority theater, no FOMO. "Most estimating tools stop at the sheet" is a workflow contrast
(§10.2 #4 — attack the workflow, never the user), not a competitor attack. The "yours keeps going"
move is the §10.1 earned-superiority register, not empty dominance.

> ⚠️ GATED ON §1 ratification (R1–R11) before any of this copy is canonical.

---

## 3. The named nodes — full §8.3 model, claims-tagged

This is the load-bearing table. Every public-word suggestion for a node is bounded by what §7.2 and
§8.3 actually say exists, with status taken from the same sources. The status column is the §15
honesty *encoded into the diagram itself* — that is the whole point of this section versus a feature
grid.

Glossary terms used throughout: **the commercial graph**, **cost intelligence layer**, **cost
estimate**, **cost proposal**, **BOQ**, **Activity**, **Live / Building / Planned** (Building =
§15 "Partial"), **proposal-paper**, **redline** (the accent-as-annotation-mark, see doc 03).

### 3.1 Live nodes (ship today — §7.2, §8.3)

| # | Named node | Contains (§8.3) | One-line public label (≤12 words) |
|---|---|---|---|
| L1 | **The Estimate Tree** | Projects → Estimates → Group/Area nodes → rows; quantity × unit cost; rollups by Area/Group; `misc_cost` (§8.4) | A structured estimate, not a flat sheet. |
| L2 | **The Component Library** | components · suppliers · brands · variants · pricing · images · attachments · cost entries · price history | Your real prices and suppliers, reusable. |
| L3 | **The Activity Record** | Activity · Node Activity · row Version History; what changed, when, why | Every revision, on the record. |
| L4 | **The Proposal Handoff** | publications · shared proposal links · comments · decisions · password protection · .xlsx export (§7.2) | From estimate to a proposal your client can approve. |

Supporting Live edges (drawn thinner, not as headline nodes): **collaboration invites** (email, roles,
realtime cursors — §7.2), **templates** (§7.2), **D3 comparison charts** (donut + bubble — §7.2).
These connect the four headline nodes but are not themselves claim-headlined; their detail lives on
`/features` (→ 05).

### 3.2 Building node (§15 "Partial")

| # | Named node | What is partial (§7.2) | One-line public label |
|---|---|---|---|
| B1 | **Surfacing** | Recall and organize your **own** past estimates by client, project type, and supplier — the payoff the §3.1 hook commits to; **not shipped yet** (§7.2 Planned-Next; §17 #13). Activity rollups + action taxonomy are also improving (§7.2 Partial). | Your own history, ready to hand. *(Building.)* |

> §15 hard rule, encoded on the plate: surfacing by client/typology/supplier is **not claimed as
> shipped** until it ships (§3.3 honesty anchor; §17 #13). The plate must visibly mark B1 as Building,
> and the B1 microcopy must say "in progress," never present-tense.

### 3.3 Planned node (committed roadmap — §7.2 "Later")

| # | Named node | What is planned (§7.2) | One-line public label |
|---|---|---|---|
| P1 | **The Supplier Bridge** | supplier catalog → quote requests → product comparison → procurement/ERP handoff (§7.2 Later; §4.4 #3) | From your estimate to your suppliers. *(Planned.)* |

> §15 boundary: P1 is a **direction**, not a capability. The plate must not imply the catalog, quote
> requests, or procurement execution exist. No "procurement system / payment platform / ERP"
> language (§15 forbidden; §7.4 limitations). The bridge is drawn as an *aspiration arrow*, dashed,
> terminating at a node labeled Planned — not as a live edge.

### 3.4 What is deliberately NOT on the plate (§15)

To stay inside claims discipline, the following must **not** appear as nodes, even faintly:

- **AI copilot** — deferred entirely (§7.2; §8.5; §16.1). Not a node, not an edge, not a label. When
  it ships it enters at Pro and up; until then it is invisible on this plate.
- **Immutable / issued proposal snapshots** — words banned until the policy gate is approved (§15;
  §16.2; doc 06). L4 says "shared proposal links," never "immutable issued record."
- **Procurement execution / payments / ERP / PO** — §15 forbidden, §7.4 limitation. P1 stops at
  "procurement handoff" as a direction only.
- **Aggregator / database-of-everyone's-estimates** — §3.3 explicit non-claim, §15 hard rule. The
  plate is your **own** graph; no pooled/external data edges.

---

## 4. The visualization spec — an SVG architecture plate, in document-craft

### 4.1 What it is (and is not)

It is an **inline SVG architecture plate** drawn in the same document-craft as the rest of the page:
proposal-paper ground (§12.9; doc 03 token `--proposal-paper`), Source Serif 4 node labels, warm
hairline edges, the redline accent (signal `#F24405`, doc 03) used *only* on the active/hovered node
and on the Planned aspiration arrow.

It is **explicitly NOT**:

- A re-drawn browser chrome, app window, IDE, or fake screenshot. Hallmark bans re-drawn chrome, and
  §12.9 bans "dashboards that perform." The credibility comes from the *real* data model being named,
  not from a mock UI pretending to be the product.
- A photograph or a slideshow (the construction-photo slideshow + 2.3 MB hero PNG are on the removal
  rail, 00-OVERVIEW; this plate replaces that energy with structure).
- A generic "nodes-and-arrows" infographic with invented boxes. Every box maps 1:1 to §8.3 / §7.2.

### 4.2 Composition (desktop ≥ 1024px)

```
                       ┌──────────────────────┐
                       │   The Estimate Tree   │  (L1, Live)
                       │  Group · Area · rows  │
                       └──────────┬───────────┘
                                  │  (reuses)
              ┌───────────────────┼────────────────────┐
              ▼                   ▼                    ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
   │ Component Library │  │ Activity Record  │  │  Proposal Handoff   │
   │  components ·     │  │  revisions ·     │  │ shared links ·      │
   │  brands ·         │  │  version history │  │ comments ·          │
   │  suppliers ·      │  │                  │  │ decisions · .xlsx   │
   │  variants · price │  │                  │  │                     │
   │  history  (L2)    │  │   (L3)           │  │   (L4)              │
   └────────┬─────────┘  └────────┬─────────┘  └──────────┬──────────┘
            │                     │                       │
            └─────────────────────┴───────────────────────┘
                                  │
                       ┌──────────▼───────────┐
                       │     Surfacing        │  (B1, Building — dashed border)
                       │  your own history,   │
                       │  ready to hand       │
                       └──────────┬───────────┘
                                  │  (aspiration, dashed redline arrow)
                       ┌──────────▼───────────┐
                       │   Supplier Bridge    │  (P1, Planned — dashed, faint)
                       │  estimate → supplier │
                       └──────────────────────┘
```

Spatial logic the SVG must encode:

- **L1 (Estimate Tree) sits at the top center** — it is the entry point of every §7.3 workflow
  ("create project estimate → organize sections → reuse components → track revisions → produce
  proposal-ready output").
- **L2, L3, L4 form a horizontal Live band** beneath L1 — the three things the tree feeds and that
  feed each other (L2 supplies the tree, L3 records the tree, L4 exports the tree).
- **B1 (Surfacing) sits below the Live band**, connected by a solid-but-lighter edge — it reads
  from the Live nodes (it surfaces *your own accumulated* L2/L3 data, §3.3) but is not yet built.
- **P1 (Supplier Bridge) sits below B1**, connected only by a dashed redline aspiration arrow —
  it is a direction, not a live edge.

### 4.3 Edge semantics (so the lines mean something)

| Edge | Meaning | Style |
|---|---|---|
| L1 → L2 | "reuses components from the library" (§7.3) | solid warm hairline |
| L1 ↔ L3 | "every edit is recorded in Activity" (§7.2) | solid warm hairline |
| L1 → L4 | "estimate becomes a shared proposal" (§7.3) | solid warm hairline |
| L2/L3 → B1 | "your accumulated history, surfaced" (§3.3) | lighter hairline (Building) |
| B1 → P1 | "future bridge to suppliers" (§4.4 #3) | **dashed redline** (Planned, accent `#F24405`) |

No edge may be drawn that does not correspond to a §8.3 relationship. The plate is a *diagram of the
real schema*, not a decorative web.

### 4.4 Node visual language (tokens from doc 03; do not redefine here)

- **Node card**: proposal-paper fill (`--proposal-paper`), 3px radius (`--radius-xs`), warm hairline
  border (near `#ECE7DC`, doc 03), **no glassmorphism, no drop shadow** on the Live cards — they are
  document plates, not floating UI (§12.9).
- **Node label**: Source Serif 4, ink `#292929` (doc 03 mandates this over the current `--ink #3D3D3D`
  in globals.css — that swap is doc 03's call, cross-linked, not redefined here).
- **Node sub-label** (the "components · brands · suppliers…" line): secondary ink `#5D5D5D`, **never**
  `#7F7F7F` (fails WCAG AA — memory `designmd-tertiary-fails-aa`; §15-adjacent a11y rule).
- **Claims-status tag**: a small SF Pro uppercase pill on each node — **LIVE** (filled clay `#AA412A`
  text on warm tint), **BUILDING** (outlined, ink `#5D5D5D`), **PLANNED** (outlined dashed, faint).
  The tag is the §15 honesty made literal; it must be legible at the mobile stack width too.
- **Redline accent** (`#F24405`): used **only** on (a) the active/hovered node's left rule and (b) the
  P1 aspiration arrow. Accent discipline (doc 03): one accent, sparingly. No redline on Live cards at
  rest — it is the *annotation* mark (architects know redlines), not a decoration.

### 4.5 Interaction states (the only client JS in this section)

Per doc 07 (RSC-first, near-zero client JS), the plate is a **static SVG server-rendered**, and the
*only* hydration on this section is a small interaction island:

- **Hover/focus a Live node (L1–L4)**: the node's left rule turns redline (`#F24405`); a caption
  panel beneath the plate shows that node's one-line public label (§3.1) and its claims status. This
  is the §3 "abstract → concrete" payoff: hovering *names* the part of the layer.
- **Hover/focus B1 / P1**: same caption mechanism, but the caption leads with the status
  ("Building — in progress" / "Planned — committed on the roadmap") so the §15 honesty is the first
  thing read, not an afterthought.
- **Keyboard**: nodes are reachable in DOM order as `<button>`-like focusables (real `<g
  role="button" tabindex="0">` with `:focus-visible` ring, doc 07 a11y); the caption updates on focus,
  not only on hover, so keyboard and touch users get the same payoff.
- **`prefers-reduced-motion`**: no scroll-reveal on the plate; the caption swap is instant. The repo
  already has a `usePrefersReducedMotion` hook in
  `src/components/landing/AnimatedProposalRecordSection.tsx` — reuse it, do not reinvent.

> ⚠️ GATED ON doc 07 confirming the interaction island is the *only* hydration point in this section
> (the rest is RSC). If doc 07 allows more client JS, revisit; the default is "static plate + one tiny
> caption island."

### 4.6 Responsive collapse (mobile / tablet)

Per doc 07, must render at **320 / 375 / 414 / 768**. The plate's responsive rule:

- **≥ 1024px (desktop)**: the full composition in §4.2 — L1 top, L2/L3/L4 band, B1, P1 stacked below.
- **768px (tablet)**: L2/L3/L4 collapse from a 3-up band to a vertical stack beneath L1, edges redrawn
  as vertical connectors; B1 and P1 remain below. Plate width = content width.
- **≤ 414px (mobile)**: the SVG becomes a **vertical named list** — each node is a full-width plate
  card (claims pill + label + sub-label), connected by short vertical hairlines. The diagram is still
  legible as a graph (the connectors survive), but no horizontal scrolling. `overflow-x: clip` (not
  `hidden`) on html+body (doc 07) means the plate must never force horizontal overflow — the SVG
  scales to its container, period.

> ⚠️ GATED ON a real-device pass at 320/375/414/768 (doc 07) before sign-off. The 320px case is the
> risk: four Live sub-labels + a Building + a Planned card must all keep their claims pills legible.
> If they don't, drop the sub-label line at ≤360px and keep only the node name + pill.

---

## 5. Why this is the moat (the Amigo parallel, honestly)

The peg study (00-OVERVIEW) found one move worth borrowing from Amigo: a **named architecture** as the
credibility device ("Cognitive Architecture": Agent Core / Context Graph / Functional Memory / Dynamic
Behaviors / Actions). Amigo's plate earns trust by *naming the parts* of a system that would otherwise
sound abstract.

We do the same move, with two honest substitutions:

1. **Our named parts are real.** Amigo names an architecture and backs it with SOC2/GDPR/HIPAA badges
   and case studies we do not have and §15 forbids inventing. Our plate names the §8.3 data model —
   the actual schema — and backs each node with a **claims-status tag**. The honesty *is* the proof
   engine (§4.4 #6; §15). Where Amigo says "trusted by Eucalyptus," we say "Live today" / "Building" /
   "Planned," and we mean it node by node.
2. **Our architecture is the moat, not a slide.** §8.3 is explicit: *"This graph is what makes the
   cost intelligence layer possible."* The reusable component library (L2) feeding the estimate tree
   (L1), recorded in Activity (L3), handed off as a proposal (L4), and — the payoff — *surfaced back*
   (B1) so your own history works for you (§3.1, §3.3): that loop is the lock-in (§9.2: "the
   compounding cost library is the lock-in"). The plate makes that loop visible in five seconds. No
   competitor in our segment has drawn it (§6.4: the reusable-intelligence value is enterprise-locked;
   nobody owns it for SMB/SEA/supplier, and nobody owns the estimate-to-supplier bridge).

What we do **not** borrow from Amigo (unavailable + §15-forbidden, per 00-OVERVIEW peg study):
logo walls, named testimonials, stats/metrics, compliance badges (entity/DPA not done, §17 #2–#4),
AI-hero (AI deferred, §7.2), "the only platform that…" (§2 bans it; §15 hard rule).

The one-line internal framing for the team: **the commercial graph is the picture of the moat; the
claims tags are the picture of the honesty.** This section exists to put both on the same plate.

---

## 6. How this makes "cost intelligence layer" concrete

The §3 manifesto is abstract by design ("a structured memory that builds as you work"). A first-time
visitor who reads only the hero (doc 02) and this section must leave able to answer:

- *What is the thing?* → a graph of your own estimates, components, suppliers, revisions, and
  proposals (§8.3), not a folder of files (§3.1).
- *What does it do for me?* → it compounds: L2 + L3 + L4 mean the next estimate starts ahead
  (§3.3, §6.5), and B1 is the payoff that *surfaces* that compounding back to you (§3.1 hook).
- *Is any of it real?* → yes, node by node, with the tag on each one (§15). This is the question
  §14.1 ("commercial certainty: not yet proven") makes load-bearing, and the claims tags are the
  honest answer.

The plate is therefore not decoration; it is the §3.5 one-line ("Every estimate you build, working
for you on the next one") rendered as a structure the reader can point at.

---

## 7. Cross-links (sibling docs — do not duplicate, point)

- **00-OVERVIEW** — owns the canonical DOM taxonomy and section ordering this doc obeys.
- **01-PEG-STUDY** — owns the full Intercom + Amigo DNA analysis; this doc cites its "named
  architecture" conclusion only.
- **02-HERO-AND-VOICE** — owns the hero copy and the §10 voice register this section inherits.
- **03-VISUAL-TOKENS-AND-TYPE** — owns the token additions (`--paper`, ink `#292929`, secondary
  `#5D5D5D`, redline `#F24405`, Source Serif 4 / SF Pro / Roboto Mono pairing, radius 3px). This doc
  consumes them; it does not redefine them.
- **05-WORKFLOW-AND-FEATURES** — owns the §7.3 5-step "How it works" and the mechanic-noun detail
  (library, sheets, rows) that §10.2 #1 keeps off this section.
- **06-CLAIMS-LEDGER** — owns the standalone "What is real today" section (taxonomy Section 7); this
  doc's claims tags are the *compressed* version, 06 is the *full* ledger. They must agree node-for-node.
- **07-ENGINEERING** — owns RSC-first delivery, responsive breakpoints, a11y, the `prefers-reduced-
  motion` reuse, and the interaction-island boundary this doc assumes.
- **08-ROLLOUT-AND-ANALYTICS** — owns the claims sign-off gate this plate must pass before going
  public, and the analytics events (the moat metric = component reused, §14.4) the plate's CTAs feed.
- **LOOP_LEDGER** — the plan-pack loop record; this doc's open decisions are mirrored there.

---

## 8. ⚠️ Gated on / Open decisions

1. **§1 ratification (R1–R11)** — no copy in §2 is canonical until the PROPOSED brand core is
   ratified (NEEDS INPUT #1). The plate's *structure* (§3 nodes) does not depend on ratification; the
   *words* do.
2. **Token swap to ink `#292929` / secondary `#5D5D5D`** — doc 03 must land the additive globals.css
   changes; today `--ink` is `#3D3D3D` in `src/app/globals.css`. The plate's node labels depend on
   doc 03, not this doc.
3. **B1 (Surfacing) is the §3.1 hook's payoff and is NOT shipped** (§7.2; §17 #13). The plate marks
   it Building; if surfacing ships before launch, re-tag to Live and rewrite §2.5 / §3.2 — do not
   silently promote it.
4. **P1 (Supplier Bridge) is a direction only** (§7.2 Later; §4.4 #3). Procurement/ERP/payment
   execution language is §15-forbidden; the aspiration arrow must stop at "procurement handoff" as a
   label, never imply execution exists.
5. **Immutable/issued proposal snapshots are banned words** (§15; §16.2) until the policy gate is
   approved (doc 06). L4 stays "shared proposal links," never "issued record."
6. **AI is invisible on this plate** (§7.2; §8.5; §16.1). If AI ships at Pro+, it re-enters the plate
   as a *new* node with its own claims tag and a visible DeepSeek/privacy note (§15) — never as a
   silent addition to an existing node.
7. **Mobile legibility at 320px** — the four Live sub-labels + Building + Planned cards must keep
   their claims pills legible; open until the doc 07 real-device pass (decision: drop sub-labels
   ≤360px if not).
8. **Interaction-island boundary** — default is "static plate + one caption island"; if doc 07 allows
   more client JS, revisit whether the hover payoff is worth the hydration cost (§4.5).
9. **Claims-sign-off gate** (doc 08) — this plate is the most claims-dense surface in the redesign;
   it cannot go public until 06 and 08 both sign off that every tag matches the live Feature
   Inventory (§7.2) on the day of launch.
10. **Founding-member / pricing reality** — none of this section's copy references price (pricing
    lives in Section 10, doc 02/06), so the §9.3 pricing-hypothesis gate does not block this doc.
    Noted here only so a future editor does not bolt a price onto the plate.
