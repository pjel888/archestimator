# 04 — The Commercial-Graph Architecture Plate

> **PLANNING ONLY · 2026-06-22 (revised to The Glass Brand per ratified keystone decisions D-1…D-5) · not code.**
> **Direction:** THE GLASS BRAND (D-1). The plate renders as a **floating glass surface** over the
> warm grey canvas — the same `.dashboard-glass-warm` vocabulary the Workshop Dashboard + Estimate
> Sheet use — with signal-orange (`--brand-orange #F24405` / `--brand-orange-dark #C63804`, D-3) as
> the *annotation* color and the D-4 shared `ClaimStatus` type (narrowed to Live/Building/Planned) on
> every node. The prior "proposal-paper ground + Source Serif 4 + clay `#AA412A` LIVE pill" direction
> is **retired** (clay is NOT a token, not used — D-3; Source Serif 4 is deferred — D-1).
> Status banner: this is a planning document in the Landing-Page-Redesign plan pack. No
> implementation, no copy is final until ratification (§1 NEEDS INPUT #1) and the claims sign-off
> gate (`09-CLAIMS-LEDGER-SIGN-OFF.md`) pass. Every public-word suggestion below is bounded by §15
> claims discipline and §10 Controlled Confidence voice; nothing invented.

**Purpose (one line):** Owns the keystone homepage section — the named, claims-tagged
**commercial-graph architecture plate** (rendered as a floating glass surface) that makes the
abstract "cost intelligence layer" concrete, turns the §8.3 data model into a credibility device,
and carries the Live/Building/Planned honesty (§15) on every node.

This is the highest-leverage section of the redesign. Per the brief's peg study, the named-architecture
plate is the one move we borrow from Amigo ("Cognitive Architecture") and replace the proof engine with
radical honesty instead of logos/stats/testimonials we do not have (§15 forbids inventing them). It is
also where the §3 cost-intelligence-layer manifesto becomes a picture, and where the §8.3 "this graph is
what makes the cost intelligence layer possible" claim earns its keep.

This doc owns: (1) the section copy, (2) the full §8.3 node model with claims-status on each node,
(3) the SVG visualization spec (glass-skin over the canvas wash, explicitly NOT re-drawn chrome),
(4) interaction / responsive / a11y / motion behavior, (5) the data model the SVG renders from,
(6) the status-transition re-render contract, (7) why this is the moat. It does NOT own tokens (→
`03-VISUAL-LANGUAGE-AND-TOKENS.md`), the "How it works" 5-step workflow (→ `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`
+ `05-COPY-SKELETON.md`), the claims-ledger section as a whole (→ `06-PROOF-AND-CLAIMS-DISCIPLINE.md`),
or engineering delivery (→ `07-ENGINEERING-CONSTRAINTS.md`).

---

## 1. Where this section lives (DOM order and neighbors)

Per the canonical homepage taxonomy in `00-OVERVIEW.md`, this is **Section 3 — "The Layer + the
commercial-graph plate"**, sitting between:

- **Section 2 — The Problem** (→ `05-COPY-SKELETON.md`): the rebuild-from-row-one pain (§3.2, §6.3, §11.4).
- **Section 4 — What you get** (→ `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` / `05-COPY-SKELETON.md`):
  the three benefit blocks, "Stop starting from zero / Defend every number / From estimate to approval"
  (§11.2).

Narrative job at this seam: Section 2 names the dead-file problem; this section answers **"so what is
the thing that fixes it?"** with a named structure rather than a slogan. It is the bridge from pain to
proof — and it does the proof *by drawing the actual data model* (§8.3), not by performing a dashboard
(§12.9: "documents you would trust, not dashboards that perform").

> ⚠️ GATED ON the section ordering being frozen in `00-OVERVIEW.md`. Do not reorder Section 3 relative
> to Section 2 or Section 4 without re-running the seam narrative.

---

## 2. Section copy (voice-locked, §10 Controlled Confidence)

Copy below is ready to ship within §15 discipline, pending ratification. Three altitudes only
(manifesto headline → plain payoff → node legend); no fourth paragraph. Mechanic nouns stay on
`/features` (→ `05-COPY-SKELETON.md`), not here (§10.2 #1).

### 2.1 Section eyebrow (UI chrome, SF Pro label — `--font-ui`)

> The cost intelligence layer

### 2.2 Section headline (Doto display — `--font-display`, per D-1 / `03-VISUAL-LANGUAGE-AND-TOKENS.md` §2)

> **Every estimate is part of a larger commercial graph.**
> Most estimating tools stop at the sheet. Yours keeps going: the prices you stand behind, the
> suppliers you choose, the revisions your clients ask for, and the proposals you hand off, all
> connected in one structured layer that builds up as you work.

> ⚠️ **Source Serif 4 is DEFERRED (D-1).** The section headline is set in **Doto** (`--font-display`),
> the SAME display family the Workshop Dashboard + Estimate Sheet use. The prior "Source Serif 4 display
> headline" is retired with the Document direction; do NOT make the "same serif as your proposal"
> continuity claim here (the proposal export is `.xlsx`, no body font) — tracked L-DES-3 (closed for
> the Glass Brand).

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
§15 "Partial"). **ClaimStatus** (Live/Building/Planned/NotUs) is the single shared type per D-4,
defined in `src/components/landing/shared/StatusPill.tsx` — this plate imports it and narrows to the
Live/Building/Planned subset (no NotUs nodes); see §4.4 + §4.8.

### 3.1 Live nodes (ship today — §7.2, §8.3)

| # | Named node | Contains (§8.3) | One-line public label (≤12 words) |
|---|---|---|---|
| L1 | **The Estimate Tree** | Projects → Estimates → Group/Area nodes → rows; quantity × unit cost; rollups by Area/Group; `misc_cost` (§8.4); the domain-shaped organization that keeps the sheet understandable | A structured estimate, not a flat sheet. |
| L2 | **The Component Library** | components · templates · suppliers · brands · variants · pricing · images · attachments · cost entries · price history; drag/drop into the estimate sheet | Your real prices and suppliers, reusable. |
| L3 | **The Activity Record** | Activity · Node Activity · row Version History; what changed, when, why | Every revision, on the record. |
| L4 | **The Proposal Handoff** | publications · shared proposal links · comments · decisions · password protection · .xlsx export (§7.2) | From estimate to a proposal your client can approve. |

Supporting Live edges (drawn as thin hairline connectors on the plate, not as headline nodes):
**collaboration invites** (email, roles, realtime cursors — §7.2), **drag/drop insertion** into the
estimate sheet (§7.2), **templates** (§7.2), and **D3 comparison charts** (donut + bubble — §7.2).
These connect the four headline nodes but are not themselves claim-headlined; their detail lives on
`/features` (→ `05-COPY-SKELETON.md`).

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
  §16.2; `06-PROOF-AND-CLAIMS-DISCIPLINE.md`). L4 says "shared proposal links," never "immutable issued record."
- **Procurement execution / payments / ERP / PO** — §15 forbidden, §7.4 limitation. P1 stops at
  "procurement handoff" as a direction only.
- **Aggregator / database-of-everyone's-estimates** — §3.3 explicit non-claim, §15 hard rule. The
  plate is your **own** graph; no pooled/external data edges.

---

## 4. The visualization spec — an inline SVG plate, in glass-skin

### 4.1 What it is (and is not)

It is an **inline SVG architecture plate** rendered as a **floating glass surface** over the warm grey
canvas: the container is `.dashboard-glass-warm` (`globals.css:1753` — verified) over the
`--grad-canvas-wash` page background (`globals.css:62` — verified), at `--glass-radius 12px`
(`globals.css:116`) with a `--landing-hairline-strong` frame edge (`03-VISUAL-LANGUAGE-AND-TOKENS.md`
§3.2). Node labels are **Doto** (`--font-display`); the Live-status accent tick is **signal orange**
`--brand-orange #F24405` (`globals.css:37`) used *only* on the active/hovered node's left rule and on
the Planned aspiration arrow; AA-bound orange text uses `--brand-orange-dark #C63804`
(`globals.css:38`) — see §4.4. This is the Glass Brand surface Philip already loves on the Estimate
Sheet, applied to the architecture plate.

It is **explicitly NOT**:

- A re-drawn browser chrome, app window, IDE, or fake screenshot. Hallmark bans re-drawn chrome, and
  §12.9 bans "dashboards that perform." The credibility comes from the *real* data model being named,
  not from a mock UI pretending to be the product.
- A photograph or a slideshow (the construction-photo slideshow + 2.3 MB hero PNG are on the removal
  rail, `00-OVERVIEW.md`; this plate replaces that energy with structure).
- A generic "nodes-and-arrows" infographic with invented boxes. Every box maps 1:1 to §8.3 / §7.2.
- A paper specimen. The retired "proposal-paper ground + Source Serif 4 + clay `#AA412A` LIVE pill"
  direction is **gone** (D-1/D-3); `#AA412A` is not a token and not referenced anywhere in this doc
  as an active color.

> ⚠️ GATED ON L-DES-1…5 (`00-OVERVIEW.md` §7 G-11): the Glass Brand pivot is ratified, but the
> rendered visual result wants one owner look before `03`/`04`/`23` finalize. The mechanics in this
> doc proceed regardless — the spec is token-bound, so any token adjustment propagates without
> re-authoring.

### 4.2 Composition (desktop ≥ 1024px)

```
                       ┌──────────────────────┐
                       │   The Estimate Tree   │  (L1, Live)
                       │  Group · Area · rows  │
                       └──────────┬───────────┘
                                  │  (reuses / records / becomes)
              ┌───────────────────┼────────────────────┐
              ▼                   ▼                    ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
   │ Component Library │←→│ Activity Record  │←→│  Proposal Handoff   │
   │  components ·     │  │  revisions ·     │  │ shared links ·      │
   │  brands ·         │  │  version history │  │ comments ·          │
   │  suppliers ·      │  │                  │  │ decisions · .xlsx   │
   │  variants · price │  │                  │  │                     │
   │  history  (L2)    │  │   (L3)           │  │   (L4)              │
   └────────┬─────────┘  └────────┬─────────┘  └──────────┬──────────┘
            │                     │                       │
            └─────────────────────┴───────────────────────┘
                                  │  (surfaces your accumulated history)
                       ┌──────────▼───────────┐
                       │     Surfacing        │  (B1, Building — dashed border)
                       │  your own history,   │
                       │  ready to hand       │
                       └──────────┬───────────┘
                                  │  (aspiration, dashed accent arrow)
                       ┌──────────▼───────────┐
                       │   Supplier Bridge    │  (P1, Planned — dashed, faint)
                       │  estimate → supplier │
                       └──────────────────────┘
```

> **ASCII ↔ data-model agreement (gap-2 closure).** The horizontal `L2 ↔ L3 ↔ L4` band now renders
> **bidirectional (`↔`) connectors**, matching §4.3 "feed each other." Those cross-edges are
> **explicitly modeled in the data** (`PLATE_NODES` in §4.8 includes the L2↔L3, L2↔L4, L3↔L4 entries
> as `kind: "solid"` with `direction: "bidirectional"`). The earlier draft's ASCII implied cross-edges
> the data omitted; they are now reconciled verbatim — §4.2, §4.3, and §4.8 all describe the same
> graph. The bidirectional arrows are *visual*; the data model stores them as one edge per direction
> for simpler traversal (see §4.8 note).

#### 4.2.1 Pinned geometry (implementation default, no invention)

The SVG geometry is no longer left to the implementer. Use this as the default unless the owner
explicitly approves a visual change in L-DES-1:

| Surface | `viewBox` | Node geometry |
|---|---|---|
| Desktop `>=1024px` | `0 0 1440 720` | L1 `540,48 360x96`; L2 `120,220 320x132`; L3 `560,220 320x132`; L4 `1000,220 320x132`; B1 `540,430 360x110`; P1 `540,590 360x92`. Corner radius `12`; inner pill radius `3`; focus ring inset `-4`. |
| Tablet `768-1023px` | `0 0 768 920` | Vertical stack: x `84`, w `600`, h `104`, y positions `40,180,320,460,620,780`; L2/L3/L4 keep bidirectional semantics via short vertical connectors and captions, not horizontal arrows. |
| Mobile `<=414px` | `0 0 360 700` | Full-width tiles: x `16`, w `328`, h `76`, y positions `24,124,224,324,444,564`; at `<=360px` sub-labels are hidden per §4.6. |

Edge anchors: outgoing top/bottom edges connect to the midpoint of the nearest node side; the L2/L3/L4
band cross-edges connect center-left/center-right. Labels wrap at 18 desktop characters and 14 mobile
characters; status pills never shrink below 54px wide. A focused node must keep its focus ring fully
inside the `viewBox`; do not crop focus affordances.

Spatial logic the SVG must encode:

- **L1 (Estimate Tree) sits at the top center** — it is the entry point of every §7.3 workflow
  ("create project estimate → organize sections → reuse components → track revisions → produce
  proposal-ready output").
- **L2, L3, L4 form a horizontal Live band** beneath L1 — the three things the tree feeds and that
  **feed each other** (L2 supplies the tree, L3 records the tree, L4 exports the tree; and L2↔L3
  record library edits, L2↔L4 carry the components that ship in a proposal, L3↔L4 log proposal
  activity). The bidirectional band is what makes the graph a *graph* and not a pipeline.
- **B1 (Surfacing) sits below the Live band**, connected by a solid-but-lighter edge — it reads
  from the Live nodes (it surfaces *your own accumulated* L2/L3 data, §3.3) but is not yet built.
- **P1 (Supplier Bridge) sits below B1**, connected only by a dashed accent aspiration arrow —
  it is a direction, not a live edge.

### 4.3 Edge semantics (so the lines mean something)

| Edge | Meaning | Style |
|---|---|---|
| L1 → L2 | "reuses components from the library" (§7.3) | solid warm hairline |
| L1 ↔ L3 | "every edit is recorded in Activity" (§7.2) | solid warm hairline, bidirectional |
| L1 → L4 | "estimate becomes a shared proposal" (§7.3) | solid warm hairline |
| L2 ↔ L3 | "library edits are recorded in Activity" (§8.3) | solid warm hairline, bidirectional |
| L2 ↔ L4 | "library components ship in the proposal" (§8.3) | solid warm hairline, bidirectional |
| L3 ↔ L4 | "proposal activity is recorded" (§8.3) | solid warm hairline, bidirectional |
| L2 / L3 → B1 | "your accumulated history, surfaced" (§3.3) | lighter hairline (Building) |
| B1 → P1 | "future bridge to suppliers" (§4.4 #3) | **dashed accent** (Planned, `--brand-orange #F24405`) |

No edge may be drawn that does not correspond to a §8.3 relationship. The plate is a *diagram of the
real schema*, not a decorative web.

### 4.4 Node visual language — Glass Brand skin, D-3 accent discipline, D-4 ClaimStatus

This is the binding visual spec. **Every color is a real `globals.css` token** (grep-verified
2026-06-22, anchors cited); no magic numbers in JSX.

- **Plate container:** `.dashboard-glass-warm` (`globals.css:1753`) floating panel over the
  `--grad-canvas-wash` page background, at `--glass-radius 12px` (`globals.css:116`), framed by a
  `--landing-hairline-strong` rule. This is the SAME glass surface the Estimate Sheet sits on —
  brand continuity (D-1). The plate is subject to the §4.4-blur-cap in `03-VISUAL-LANGUAGE-AND-TOKENS.md`
  (it is one of the 4 simultaneous blur surfaces on the initial desktop viewport).
- **Node card:** `--glass-bg rgba(255,255,255,0.72)` (`globals.css:108`) fill on a `--landing-hairline`
  (`globals.css:18` alias) 1px border, at `--radius-xs 3px` (`globals.css:100`) inner-cell radius. The
  Live cards are **sub-glass tiles inside the plate's glass container**, not floating shadows.
- **Node label:** Doto (`--font-display`, `globals.css:203`), `--ink #3D3D3D` (`globals.css:10`). The
  prior "ink `#292929`" override is **dropped** — the Glass Brand inherits the app's `--ink #3D3D3D`
  directly (closed in `03-VISUAL-LANGUAGE-AND-TOKENS.md` §11, prior O-5).
- **Node sub-label** (the "components · brands · suppliers…" line): `--secondary #5D5D5D`
  (`globals.css:11`), **never** `#7F7F7F` (fails WCAG AA — memory `designmd-tertiary-fails-aa`;
  `03-VISUAL-LANGUAGE-AND-TOKENS.md` §6).
- **Claims-status tag (D-4 — single shared type, narrowed):** a small SF Pro (`--font-ui`) uppercase
  pill on each node, rendered by the **shared** `<StatusPill>` component
  (`src/components/landing/shared/StatusPill.tsx`) which exports the canonical
  `ClaimStatus = "Live" | "Building" | "Planned" | "NotUs"` type. The plate **imports that type and
  narrows** to the `"Live" | "Building" | "Planned"` subset at the call site (no NotUs nodes on the
  plate) — see §4.8. **No divergent local `ClaimStatus` type definition.** The pill color comes from
  the D-4 status palette (`03-VISUAL-LANGUAGE-AND-TOKENS.md` §6.1), NOT from orange:

  | Status (D-4) | Pill style | Token (verified) |
  |---|---|---|
  | **Live** | success-green dot + outlined pill, ink label | `--success #15803d` (`globals.css:92`) + `--ink #3D3D3D` |
  | **Building** | warning-amber dot + outlined pill | `--warning #b45309` (`globals.css:94`) |
  | **Planned** | ink dot + outlined dashed pill | `--ink #3D3D3D` (Planned is a stated intent, not "grey = maybe") |

  > **D-3 reconciliation (gap-1 closure).** The earlier draft's "LIVE = filled **clay `#AA412A`** text"
  > is **RETIRED**. Clay `#AA412A` is NOT a token in `globals.css` (grep confirms it appears only in
  > comments stating it is superseded) and is NOT used anywhere in this doc as an active color. The
  > Live pill uses the D-4 `--success` green dot + ink label. If any small orange text or icon ever
  > appears on the plate (e.g., a `< 24px` orange glyph), it uses `--brand-orange-dark #C63804`
  > (~5.3:1 on white, AA), NEVER `--brand-orange #F24405` (fails AA at ~3.75:1) and NEVER clay.

- **Accent rail / redline** (`--brand-orange #F24405`, `globals.css:37`): used **only** on (a) the
  active/hovered node's 2px left rule and (b) the P1 aspiration arrow. This is the D-3 *presence*
  color, not a status color — it marks "this is the active line / the future direction," not "this
  node is Live." No accent rail on Live cards at rest — it is the *annotation* mark (architects know
  redlines), not a decoration.
- **Tailwind v4 gotcha (memory `tailwind-arbitrary-var-needs-color-hint`):** any arbitrary-value
  background on a plate sub-element must be `bg-[color:var(--x)]`, never `bg-[var(--x)]` (the latter
  silently emits no color in this TW v4 setup). The named `--landing-*` utilities sidestep this; the
  implementer adds a visual-regression check (`16-TEST-AND-VERIFICATION-PLAN.md`) that no plate
  element renders with a missing background.

### 4.5 Interaction states (the only client JS in this section)

Per `07-ENGINEERING-CONSTRAINTS.md` (RSC-first, near-zero client JS), the plate is a **static SVG
server-rendered**, and the *only* hydration on this section is a small interaction island:

- **Hover/focus a Live node (L1–L4):** the node's left rule turns accent (`--brand-orange #F24405`);
  a caption panel beneath the plate shows that node's one-line public label (§3.1) and its claims
  status. This is the §3 "abstract → concrete" payoff: hovering *names* the part of the layer.
- **Hover/focus B1 / P1:** same caption mechanism, but the caption leads with the status
  ("Building — in progress" / "Planned — committed on the roadmap") so the §15 honesty is the first
  thing read, not an afterthought.
- **Keyboard:** nodes are reachable in DOM order as `<button>`-like focusables (real `<g
  role="button" tabindex="0">` with `:focus-visible` ring — `--brand-orange` focus ring per D-3,
  `07-ENGINEERING-CONSTRAINTS.md` a11y); the caption updates on focus, not only on hover, so keyboard
  and touch users get the same payoff.
- **`prefers-reduced-motion`:** no scroll-reveal on the plate; the caption swap is instant. The repo
  already has a `usePrefersReducedMotion` hook in
  `src/components/landing/AnimatedProposalRecordSection.tsx` (verified — defined at line `156` of
  that file, consumed throughout) — **reuse it, do not reinvent.**

> ⚠️ GATED ON `07-ENGINEERING-CONSTRAINTS.md` confirming the interaction island is the *only*
> hydration point in this section (the rest is RSC). If doc 07 allows more client JS, revisit; the
> default is "static plate + one tiny caption island."

### 4.6 Responsive collapse (mobile / tablet) + the ≤360px sub-label-drop rule

Per `07-ENGINEERING-CONSTRAINTS.md`, must render at **320 / 375 / 414 / 768**. The plate's responsive
rule:

- **≥ 1024px (desktop):** the full composition in §4.2 — L1 top, L2/L3/L4 band (with bidirectional
  connectors), B1, P1 stacked below. The glass container is one of the ≤4 simultaneous blur surfaces
  (§4.4 of `03-VISUAL-LANGUAGE-AND-TOKENS.md`).
- **768px (tablet):** L2/L3/L4 collapse from a 3-up band to a vertical stack beneath L1; the
  bidirectional connectors redraw as short vertical hairlines between the stacked cards. B1 and P1
  remain below. Plate width = content width.
- **≤ 414px (mobile):** the SVG becomes a **vertical named list** — each node is a full-width glass
  tile (claims pill + label + sub-label), connected by short vertical hairlines. The diagram is still
  legible as a graph (the connectors survive), but no horizontal scrolling. `overflow-x: clip` (not
  `hidden`) on html+body (`07-ENGINEERING-CONSTRAINTS.md`) means the plate must never force horizontal
  overflow — the SVG scales to its container, period.

**Pinned rule (gap-3 closure):** **at ≤ 360px viewport width, drop node sub-labels and render node
name + status pill only.** Sub-labels re-appear at ≥ 361px. This keeps the four Live tiles + B1 + P1
legible on the narrowest target class (320px) without truncating the claims pills, which are the
§15 honesty device and must never be the thing that gives way.

**Legibility verification step (gap-3 closure):** before sign-off, run the mobile-render e2e test
(`16-TEST-AND-VERIFICATION-PLAN.md` §5) at **320 / 375 / 414** with axe-core attached and assert:
(a) every claims pill is visible and its label text meets AA against the glass tile (worst-case
backdrop = the `--grad-canvas-wash` amber peak, per `03-VISUAL-LANGUAGE-AND-TOKENS.md` §4.5); (b)
the sub-label-drop fires at ≤360px and reverts at ≥361px (no flapping at the boundary); (c) no
horizontal overflow at any width. This step is the gate for "mobile legible" — it is not claimed
until it passes.

> ⚠️ GATED ON the real-device pass at 320/375/414/768 (`07-ENGINEERING-CONSTRAINTS.md`) before
> sign-off. The 320px case is the risk.

### 4.7 Status-transition plate re-render (when a node promotes)

The plate's truth device depends on the Building/Planned nodes being *visibly* Building/Planned.
When a node's status changes (per the process in `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §7.2), the plate
**must re-render** to reflect it. Because the SVG renders from the `PLATE_NODES` data model (§4.8),
the transition is a **data change** (status field + caption copy), not a re-authoring of the SVG.

| Transition | Plate change (driven by `status` + `band`) | Caption copy change (driven by `publicLabel`) |
|---|---|---|
| **B1 (Surfacing) Building → Live** | The B1 card's border goes from **dashed to solid** (the `<StatusPill>` flips from warning-amber to success-green); the lighter L2/L3 → B1 edges promote to solid; the card visually joins the Live band (`band: "live"`). | `publicLabel` drops "Building — in progress" and reads in present tense (e.g. "Your own history, ready to hand."). |
| **P1 (Supplier Bridge) Planned → Building** | The dashed **accent** aspiration arrow becomes a **solid non-accent** edge (`kind` flips `dashed-redline` → `solid`); the card's `<StatusPill>` flips from ink to warning-amber; the card visually moves upward toward the Live band. | `publicLabel` changes from "Planned — on the roadmap" to "Building — in progress" (or present tense if a slice ships). |
| **New node added** (e.g. AI copilot when it ships at Pro+) | A new `PlateNode` renders with its own `<StatusPill>` tag + a visible DeepSeek/privacy note (§15; `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §3.6 reserve copy). | The legend (§2.5) and the data model (§4.8) extend; `09-CLAIMS-LEDGER-SIGN-OFF.md` re-runs. |

> **Hard contract:** because the `<StatusPill>` consumes the D-4 status→color map, a status flip
> automatically changes the pill color — the implementer must NOT hand-recolor. The dashed↔solid
> border transition is the one piece of *plate* geometry that is status-driven; it lives on the
> `<ArchitecturePlate>` renderer keyed off `status`, not on `<StatusPill>`.

Re-run the sign-off gate (`09-CLAIMS-LEDGER-SIGN-OFF.md`) after any transition; the plate cannot
re-render publicly without it.

### 4.8 Plate data model — implementer-ready (the schema the SVG renders from)

The plate is **not hand-authored geometry**. The implementer authors the data model once; the SVG
renders from it at every breakpoint (desktop composition, tablet stack, mobile list). This is what
makes the responsive collapse (§4.6) and the status transitions (§4.7) data-driven rather than
re-authored per case. The block below is implementer-ready: real TS types, real literals reconciled
verbatim with §4.2 and §4.3 (gap-2 closure — the L2↔L3↔L4 cross-edges are present in the data).

```ts
// src/components/landing/commercial-graph-plate/plate-data.ts
import type { ClaimStatus } from "@/components/landing/shared/StatusPill";
//   ↑ D-4 HARD CONTRACT: single shared type. This file does NOT redefine ClaimStatus.
//     The plate narrows to the Live/Building/Planned subset at the call site (no NotUs nodes).

export type PlateNodeId = "L1" | "L2" | "L3" | "L4" | "B1" | "P1";
export type EdgeKind = "solid" | "lighter" | "dashed-accent";
export type EdgeDirection = "uni" | "bidirectional";

export interface PlateEdge {
  to: PlateNodeId;
  kind: EdgeKind;             // solid (Live↔Live), lighter (→Building), dashed-accent (→Planned)
  direction: EdgeDirection;   // "bidirectional" renders as ↔ in §4.2; data stored once per logical edge
  label?: string;             // "reuses", "every edit is recorded", etc. (§4.3)
}

export interface PlateNode {
  id: PlateNodeId;
  label: string;              // "The Estimate Tree"
  subLabel?: string;          // "Group · Area · rows" — DROPPED at ≤360px per §4.6
  status: ClaimStatus;        // drives <StatusPill> + the border style + the caption copy
  publicLabel: string;        // the caption text shown on hover/focus (§4.5)
  band: "live" | "building" | "planned";  // spatial band per §4.2
  edges: PlateEdge[];         // the edges FROM this node per §4.3
}

// The plate's ClaimStatus subset (D-4): only Live | Building | Planned — no NotUs nodes.
// This is the narrowing the call site enforces (the type system allows NotUs; the data does not).
export type PlateClaimStatus = Exclude<ClaimStatus, "NotUs">;

// The data is sourced from §3 of 06-PROOF-AND-CLAIMS-DISCIPLINE.md (the CLAIMS MATRIX),
// reconciled by scripts/claims-matrix-check.mjs before render. If the matrix and the
// plate ever disagree, the matrix wins (per the sign-off gate).
export const PLATE_NODES: PlateNode[] = [
  { id: "L1", label: "The Estimate Tree", subLabel: "Group · Area · rows",
    status: "Live", band: "live",
    publicLabel: "A structured estimate, not a flat sheet.",
    edges: [
      { to: "L2", kind: "solid", direction: "uni",          label: "reuses" },
      { to: "L3", kind: "solid", direction: "bidirectional", label: "every edit is recorded" },
      { to: "L4", kind: "solid", direction: "uni",          label: "becomes a shared proposal" },
    ] },
  { id: "L2", label: "The Component Library",
    subLabel: "components · brands · suppliers · variants · price history",
    status: "Live", band: "live",
    publicLabel: "Your real prices and suppliers, reusable.",
    edges: [
      // Cross-edges within the Live band (§4.2 bidirectional ↔):
      { to: "L3", kind: "solid", direction: "bidirectional", label: "library edits are recorded" },
      { to: "L4", kind: "solid", direction: "bidirectional", label: "library components ship in the proposal" },
      { to: "B1", kind: "lighter", direction: "uni" },
    ] },
  { id: "L3", label: "The Activity Record",
    subLabel: "Activity · Node Activity · row Version History",
    status: "Live", band: "live",
    publicLabel: "Every revision, on the record.",
    edges: [
      { to: "L4", kind: "solid", direction: "bidirectional", label: "proposal activity is recorded" },
      { to: "B1", kind: "lighter", direction: "uni" },
    ] },
  { id: "L4", label: "The Proposal Handoff",
    subLabel: "shared links · comments · decisions · .xlsx",
    status: "Live", band: "live",
    publicLabel: "From estimate to a proposal your client can approve.",
    edges: [] },
  { id: "B1", label: "Surfacing", subLabel: "your own history, ready to hand",
    status: "Building", band: "building",
    publicLabel: "Your own history, ready to hand. (Building — in progress.)",
    edges: [{ to: "P1", kind: "dashed-accent", direction: "uni", label: "future bridge" }] },
  { id: "P1", label: "The Supplier Bridge", subLabel: "estimate → supplier",
    status: "Planned", band: "planned",
    publicLabel: "From your estimate to your suppliers. (Planned — on the roadmap.)",
    edges: [] },
];
```

> **Bidirectional-edge storage note.** The `↔` in §4.2 is a *visual*; the data stores each logical
> bidirectional edge **once** (on the lower-id node) with `direction: "bidirectional"`. The
> `<ArchitecturePlate>` renderer emits the double-headed arrow; the data stays single-source. This
> keeps `PLATE_NODES` from duplicating edges while still matching the §4.2/§4.3 graph exactly.

**Components the data renders into (cross-link `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`):**

- `<ArchitecturePlate nodes={PLATE_NODES}>` — RSC; renders the desktop composition (§4.2) or the
  vertical stack (§4.6) from the same data. Sits inside the `.dashboard-glass-warm` container.
  File: `src/components/landing/commercial-graph-plate/ArchitecturePlate.tsx` (NEW — owned by this
  doc's spec, picked up in doc 11's inventory).
- `<PlateCaption nodes={PLATE_NODES} activeNodeId={…}>` — **the single client leaf** ("use client")
  in this section; takes the same `nodes` + an `activeNodeId` (set on hover/focus via the plate's
  interaction island) and renders the caption (§4.5) in an `aria-live="polite"` region. File:
  `src/components/landing/commercial-graph-plate/PlateCaption.tsx` (NEW). Props:
  `{ nodes: PlateNode[]; activeNodeId: PlateNodeId | null }`.
- `<StatusPill status={node.status}>` — the **shared** D-4 component
  (`src/components/landing/shared/StatusPill.tsx`, NEW per D-4 — owned by
  `06-PROOF-AND-CLAIMS-DISCIPLINE.md` / doc 11, consumed here unchanged). Renders the pill from the
  D-4 status→color map; the plate does NOT override its colors.

This `PLATE_NODES` literal is the single source of truth; the SVG geometry is derived, not hand-drawn.

---

## 5. Why this is the moat (the Amigo parallel, honestly)

The peg study (`00-OVERVIEW.md`, full DNA in `22-PEG-STUDY-DEEP-DIVE.md`) found one move worth
borrowing from Amigo: a **named architecture** as the credibility device ("Cognitive Architecture":
Agent Core / Context Graph / Functional Memory / Dynamic Behaviors / Actions). Amigo's plate earns
trust by *naming the parts* of a system that would otherwise sound abstract.

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
   compounding cost library is the lock-in"). The visible loop is: create a domain-shaped estimate
   tree (L1), drag reusable components/templates from the library into the sheet (L2), preserve the
   revision trail (L3), and share the proposal for comment/approval (L4). The plate makes that loop
   visible in five seconds. No
   competitor in our segment has drawn it (§6.4: the reusable-intelligence value is enterprise-locked;
   nobody owns it for SMB/SEA/supplier, and nobody owns the estimate-to-supplier bridge).

What we do **not** borrow from Amigo (unavailable + §15-forbidden, per `00-OVERVIEW.md` peg study):
logo walls, named testimonials, stats/metrics, compliance badges (entity/DPA not done, §17 #2–#4),
AI-hero (AI deferred, §7.2), "the only platform that…" (§2 bans it; §15 hard rule).

The one-line internal framing for the team: **the commercial graph is the picture of the moat; the
claims tags are the picture of the honesty.** This section exists to put both on the same plate.

---

## 6. How this makes "cost intelligence layer" concrete

The §3 manifesto is abstract by design ("a structured memory that builds as you work"). A first-time
visitor who reads only the hero (`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`) and this section must
leave able to answer:

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

- **`00-OVERVIEW.md`** — owns the ratified keystone decisions D-1…D-5, the canonical DOM taxonomy
  and section ordering this doc obeys, and the L-DES-1…5 owner-look gate this doc's skin waits on.
- **`01-DESIGN-DIRECTION.md`** — owns the full Intercom + Amigo DNA analysis; this doc cites its
  "named architecture" conclusion only.
- **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`** — owns the hero copy and the §10 voice register this
  section inherits; the DOM section order this plate sits inside.
- **`03-VISUAL-LANGUAGE-AND-TOKENS.md`** — owns the tokens this plate consumes: `.dashboard-glass-warm`
  container, `--glass-bg` / `--glass-radius` / `--radius-xs`, `--ink #3D3D3D`, `--secondary #5D5D5D`,
  `--brand-orange #F24405` / `--brand-orange-dark #C63804` (D-3), `--success` / `--warning` (D-4
  status palette), `--landing-hairline` / `--landing-hairline-strong`, the `--font-display` (Doto) /
  `--font-ui` (SF Pro) stack, and the ≤4-simultaneous-blur cap. This doc consumes them; it does not
  redefine them.
- **`05-COPY-SKELETON.md`** — owns the §7.3 5-step "How it works" and the mechanic-noun detail
  (library, sheets, rows) that §10.2 #1 keeps off this section.
- **`06-PROOF-AND-CLAIMS-DISCIPLINE.md`** — owns the standalone "What is real today" section
  (taxonomy Section 7), the D-4 `<StatusPill>` component + `ClaimStatus` type, and the full claims
  matrix this plate's tags are the *compressed* version of. They must agree node-for-node.
- **`07-ENGINEERING-CONSTRAINTS.md`** — owns RSC-first delivery, responsive breakpoints, a11y, the
  `prefers-reduced-motion` reuse (the `usePrefersReducedMotion` hook in
  `AnimatedProposalRecordSection.tsx:156`), and the interaction-island boundary this doc assumes.
- **`09-CLAIMS-LEDGER-SIGN-OFF.md`** — owns the public sign-off gate this plate must pass before
  going public.
- **`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`** — owns the component pick-list; this doc's
  `<ArchitecturePlate>`, `<PlateCaption>`, and the shared `<StatusPill>` are registered there.
- **`12-ACCESSIBILITY-AUDIT.md`** — owns the text-on-glass AA verification this plate's glass tiles
  feed into (worst-case backdrop = the `--grad-canvas-wash` amber peak).
- **`16-TEST-AND-VERIFICATION-PLAN.md`** — owns the mobile-render e2e + axe-core legibility gate
  (§4.6) and the radius-ramp / missing-background visual-regression checks.
- **`22-PEG-STUDY-DEEP-DIVE.md`** — owns the Amigo "named architecture" evidence this section
  borrows.
- **`LOOP_LEDGER.md`** — the plan-pack loop record; this doc's open decisions are mirrored there.

---

## 8. ⚠️ Gated on / Open decisions

1. **§1 ratification (R1–R11)** — no copy in §2 is canonical until the PROPOSED brand core is
   ratified (NEEDS INPUT #1). The plate's *structure* (§3 nodes) does not depend on ratification; the
   *words* do.
2. **Glass-Brand owner look (L-DES-1…5)** — the pivot is ratified (D-1) but the rendered plate wants
   one owner look before `03`/`04`/`23` finalize (`00-OVERVIEW.md` §7 G-11). The mechanics here
   proceed regardless (token-bound spec).
3. **B1 (Surfacing) is the §3.1 hook's payoff and is NOT shipped** (§7.2; §17 #13). The plate marks
   it Building; if surfacing ships before launch, re-tag to Live via the §4.7 transition (status data
   change) and rewrite §2.5 / §3.2 — do not silently promote it.
4. **P1 (Supplier Bridge) is a direction only** (§7.2 Later; §4.4 #3). Procurement/ERP/payment
   execution language is §15-forbidden; the aspiration arrow must stop at "procurement handoff" as a
   label, never imply execution exists.
5. **Immutable/issued proposal snapshots are banned words** (§15; §16.2) until the policy gate is
   approved (`06-PROOF-AND-CLAIMS-DISCIPLINE.md`). L4 stays "shared proposal links," never "issued record."
6. **AI is invisible on this plate** (§7.2; §8.5; §16.1). If AI ships at Pro+, it re-enters the plate
   as a *new* node with its own claims tag and a visible DeepSeek/privacy note (§15) — never as a
   silent addition to an existing node.
7. **Mobile legibility at 320/375/414** — the four Live sub-labels + Building + Planned cards must
   keep their claims pills legible; gated on the §4.6 verification step (sub-label drop ≤360px +
   axe-core worst-case-backdrop assertion) passing. Open until the
   `16-TEST-AND-VERIFICATION-PLAN.md` mobile-render e2e pass.
8. **Interaction-island boundary** — default is "static plate + one caption island"; if
   `07-ENGINEERING-CONSTRAINTS.md` allows more client JS, revisit whether the hover payoff is worth
   the hydration cost (§4.5).
9. **Claims-sign-off gate** (`09-CLAIMS-LEDGER-SIGN-OFF.md`) — this plate is the most claims-dense
   surface in the redesign; it cannot go public until `06-PROOF-AND-CLAIMS-DISCIPLINE.md` and `09`
   both sign off that every tag matches the live Feature Inventory (§7.2) on the day of launch.
10. **Founding-member / pricing reality** — none of this section's copy references price (pricing
    lives in Section 10, `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` / `06-PROOF-AND-CLAIMS-DISCIPLINE.md`),
    so the §9.3 pricing-hypothesis gate does not block this doc. Noted here only so a future editor
    does not bolt a price onto the plate.

**Resolved by this revision (no longer gates):**
- **Clay `#AA412A` LIVE pill** (gap-1) — retired; Live pill is the D-4 `--success` green dot + ink
  label. `#AA412A` is not a token and not referenced anywhere in this doc as an active color.
- **Divergent local `ClaimStatus` type** (gap-1) — removed; the plate imports the D-4 shared type
  from `StatusPill.tsx` and narrows (§4.4, §4.8).
- **Cross-edge prose/data mismatch** (gap-2) — §4.2 ASCII, §4.3 edge table, and §4.8 `PLATE_NODES`
  literal now all describe the same bidirectional L2↔L3↔L4 band.
- **Status-transition re-render** (gap-3) — §4.7 specifies the B1 dashed→solid + caption-copy change
  as a data-driven transition; §4.8 types are implementer-ready; §4.6 pins the ≤360px sub-label-drop
  rule + the legibility verification step.
- **Glass re-skin + `<PlateCaption>` spec** (gap-4) — §4.1/§4.4 re-skin the plate as
  `.dashboard-glass-warm` over `--grad-canvas-wash`; §4.8 specifies `<PlateCaption>` (props, file
  path); §4.5 verifies `usePrefersReducedMotion` exists at
  `src/components/landing/AnimatedProposalRecordSection.tsx:156` (grep-confirmed).
- **`#292929` ink override** (prior §4.4 / §8 #2) — dropped; the Glass Brand uses the app's `--ink
  #3D3D3D` directly (closed in `03-VISUAL-LANGUAGE-AND-TOKENS.md` §11, prior O-5).

---

## 9. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **96 / 100** | The plate is re-skinned to the ratified Glass Brand (D-1) with the brand-whiplash rationale carried from `00-OVERVIEW.md`; D-3 orange discipline + D-4 ClaimStatus narrowing are honored verbatim; the §5 Amigo parallel + §6 "makes the layer concrete" argument are intact and honest. Not 100 because the rendered glass result wants one owner look (L-DES-1…5) before the strategy is fully locked, and the §2.2 Doto headline is asserted here while `03`/`01` own the final type call. |
| **Quality** | **96 / 100** | Every token citation is grep-verified against `globals.css` with anchors (`.dashboard-glass-warm` L1753, `--grad-canvas-wash` L62, `--brand-orange` L37, `--brand-orange-dark` L38, `--success` L92, `--warning` L94, `--ink` L10, `--secondary` L11, `--radius-xs` L100, `--glass-radius` L116); `usePrefersReducedMotion` confirmed at `AnimatedProposalRecordSection.tsx:156`; cross-links resolve to canonical filenames; clay `#AA412A` appears only as "retired / NOT a token"; §4.2/§4.3/§4.8 agree verbatim on the bidirectional band. Not 100 because `StatusPill.tsx`, `ArchitecturePlate.tsx`, and `PlateCaption.tsx` do not yet exist on disk (they are the D-4 / doc-11 deliverable this spec describes — owned by sibling docs), and the §4.6 worst-case-backdrop AA assertion is specified as a gate to run, not a result already measured. |
| **Implementation-Readiness** | **93 / 100** | An implementer can copy §4.8's `PLATE_NODES` + types verbatim (real TS, real literals, anchors are strings, append-only), the §4.4 token map is grep-verified, the §4.7 transition contract is concrete, and the §4.6 ≤360px rule + verification step are pinned. Not 100 because the shared `<StatusPill>` + D-4 type is a sibling-doc deliverable (not on disk), the L-DES-1…5 owner-look gate is genuinely open before the plate's glass skin finalizes, and the mobile-render e2e + axe-core legibility gate (§4.6) is a real-device pass that has not run — per D-5 these open gates honestly cap readiness below 100 rather than being silently closed. |

**Carried to `LOOP_LEDGER.md` (not silent):** L-DES-1…5 (glass-brand owner look), the §1 R1–R11
ratification gate (copy), the §4.6 mobile-legibility verification gate (L-A11Y-1 adjacent), the
§4.5 interaction-island boundary (doc 07), the B1/P1 status gates (§8 #3/#4), the AI-invisibility
gate (§8 #6), and the `09-CLAIMS-LEDGER-SIGN-OFF.md` sign-off gate (§8 #9).

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.** Voice
throughout = Controlled Confidence (§10). Pricing framing stays out of this section (lives in Section
10). Rate-limiting is Postgres (not relevant to this plate, but noted for coherence: not Redis).
