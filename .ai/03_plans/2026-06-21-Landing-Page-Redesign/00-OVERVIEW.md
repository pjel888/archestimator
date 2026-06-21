# 00 — Overview: The Landing Redesign at a Glance

> **PLANNING ONLY · 2026-06-21 · not code.**
> Status: planning pack for the Archestimator landing-page redesign. Nothing here is
> implementation. Every public-word suggestion obeys §15 claims discipline and the §10
> Controlled Confidence voice. Grounded in `ARCHESTIMATOR_MASTER.md` (cited as §X.Y),
> `DESIGN.md`, and the existing `src/components/landing/` + `src/app/globals.css`.

**Purpose (one line):** the front door to the landing-redesign pack — the four locked
decisions, the three strategic pillars, the full-route scope, the doc map, the success
criteria, and the owner-sign-off items this whole plan leans on.

---

## 1. What we are planning (executive summary)

Archestimator is **the cost intelligence layer for AEC teams** — a construction cost
estimating platform where every estimate becomes reusable commercial knowledge (prices,
suppliers, revisions) that compounds, from estimate to client approval. Pre-launch MVP.
Primary market PH + SEA (§6.1, §4.1).

This pack redesigns the **entire public marketing surface** as one coherent document-craft
system: routes `/`, `/features`, `/pricing`, `/about`, `/contact`, plus one new route
`/trust`. The homepage is set on the same warm proposal-paper (`#FFFDF8`) and the same
serif (Source Serif 4) as the proposals the product exports — the page is a specimen of
the document quality it sells (§12.9: *"documents you would trust, not dashboards that
perform"*). Proof comes from **radical honesty** (a Live/Building/Planned claims ledger
and a named commercial-graph architecture), not from logos, testimonials, or stats, none
of which exist and §15 forbids inventing.

The redesign replaces a hype-led homepage that violates the current brand voice: the
"Start Winning / Win More Bids" hero is explicitly banned (§10.4, §16.4), three fabricated
testimonials are a §15 violation, and a 2.3MB frosted-construction hero PNG performs the
exact "dashboard that performs" anti-pattern §12.9 rejects. Removing them is gated on
owner confirmation (Hallmark deletion rail; see §7 below and doc 08).

---

## 2. The four locked decisions (obeyed by every doc; do not relitigate)

These are settled. Sibling docs may reference and design against them but must not reopen
them.

1. **Design direction = "The Document."** Editorial specimen on warm proposal-paper
   `#FFFDF8`, high-contrast serif (Source Serif 4) shared with the exported proposals.
   Credibility comes from craft + honesty, not from logos or chrome. Aligns with §12.9
   and the §4.4#6 "Honesty as brand" pillar.
2. **Primary CTA = "Start free" (self-serve Free-tier signup); Secondary = "Book a
   walkthrough".** This makes **beta onboarding + demo-data/reset rules** (§7.5 launch
   gate), **abuse guardrails** (durable rate limiting, POST-only invite acceptance, token
   hashing with a server pepper — the P1 items, §8.6, §18.1), and the **first-run flow**
   (§18.3) into CO-DEPENDENCIES the plan must flag (docs 07, 08). Free-tier signup does
   NOT require the unvalidated pricing or the billing mechanism (those gate CHARGING
   only, §9.3, §18.6).
3. **Scope = the full marketing system**, not an isolated homepage: `/`, `/features`,
   `/pricing`, `/about`, `/contact` + one new route `/trust`. A coherent shared system.
4. **Proof strategy = radical honesty.** A claims-discipline ledger (Live / Building /
   Planned), private-by-design, and the **named commercial-graph architecture** (§8.3)
   visualized as a document-craft SVG plate. NO customer logos, NO testimonials, NO
   adoption stats — none exist, and §15 forbids inventing them.

---

## 3. The three strategic pillars

- **P1 — The document IS the argument.** §12.9: *"documents you would trust, not
  dashboards that perform."* The page is set on the same paper + serif as the proposals
  the product exports, so the page itself is a specimen of the document quality the
  product sells. No construction-photo slideshow, no re-drawn fake browser/IDE chrome
  (Hallmark bans re-drawn chrome).
- **P2 — Honesty is the proof engine.** §15 governs every public word; §4.4#6 makes
  honesty the brand. The homepage carries a Live/Building/Planned claims ledger so the
  reader can see exactly what is real today. This replaces the unavailable-and-forbidden
  proof props (logos, testimonials, metrics, compliance badges) that Intercom and Amigo
  lean on (doc 01 peg study).
- **P3 — A named architecture nobody else has drawn: the commercial graph (§8.3).**
  Visualized as a claims-tagged SVG architecture plate in document-craft — like Amigo
  names its "Cognitive Architecture," but ours, and every node claims-tagged Live /
  Building / Planned. Live nodes: The Estimate Tree ↔ The Component Library ↔ The
  Activity Record → The Proposal Handoff. Building: Surfacing. Planned: Supplier Bridge
  (full spec in doc 04).

---

## 4. Scope: the routes and their jobs

Full system, shared shell, shared tokens. Canonical website structure per §12.1;
homepage section taxonomy per doc 02.

| Route | Job in the funnel | Voice (§10.7) | Primary owner doc |
|---|---|---|---|
| `/` | Awareness — hero §11.1, the problem, the layer + commercial-graph plate, what you get §11.2, how it works §7.3, who it is for §11.3, claims ledger, why-not-spreadsheet §11.4, founder §11.5, pricing philosophy §9.3, final CTA | calm conviction + the hook | 02, 04, 05, 06 |
| `/features` | Evaluation — mechanic-forward, Live/Building/Planned truth block | precise, honest, Live/Building/Planned visible | 05 |
| `/pricing` | Conversion — pricing **philosophy only**; no mature-plan language, no published locked price (§9.3 is HYPOTHESIS) | restrained, honest about hypothesis | 05, 08 |
| `/about` | Trust — founder intro §11.5, the company | introduction energy, human | 05 |
| `/contact` | Conversion — "Book a walkthrough" + reach | steady, direct | 05 |
| `/trust` (NEW) | Trust — claims ledger + private-by-design + the named architecture | steady, protected, honest | 02, 04 |

Funnel CTAs follow §12.1: View features → Explore MVP preview → Request/Start free →
Learn more → Book a walkthrough / Contact.

---

## 5. How to read this pack (doc map)

Each doc is standalone with a status banner, a one-line purpose, cross-links, and a
"⚠️ Gated on / Open decisions" section. Read this one first; pull the rest on demand.

| Doc | One-line purpose |
|---|---|
| **00-OVERVIEW** (this doc) | Front door: locked decisions, pillars, scope, doc map, success criteria, sign-off items. |
| **01-COMPETITIVE-PEG-STUDY** | Intercom + Amigo DNA study; what transfers (craft, named-architecture move, bold category hook) vs. what does not (logo walls, testimonials, stats, compliance badges, AI-hero, "the only…"). |
| **02-HOMEPAGE-SECTION-TAXONOMY** | The canonical DOM-order section taxonomy (Header · 1 Hero · 2 Problem · 3 Layer + commercial-graph plate · 4 What you get · 5 How it works · 6 Who it is for · 7 What is real today · 8 Why not a spreadsheet · 9 Founder · 10 Pricing honestly · 11 Final CTA · Footer). The single source of section order; 04/05/06 defer to it. |
| **03-DESIGN-TOKENS-AND-TYPOGRAPHY** | Additive token layer for `globals.css` (do NOT clobber existing directives): paper `#FFFDF8`, ink `#292929`, secondary ink `#5D5D5D` (NOT `#7F7F7F` — fails WCAG AA), warm hairlines, the 2+1 type pairing (Source Serif 4 / SF Pro / Roboto Mono), the redline accent (`#F24405` as annotation mark) + clay (`#AA412A`) text accent, 3px radius, restrained motion. |
| **04-COMMERCIAL-GRAPH-PLATE** | Full spec for the named, claims-tagged SVG architecture plate: Live / Building / Planned nodes, the document-craft visualization, a11y (collapses to vertical stack on mobile), and the hover interactivity that is one of the few hydrating leaves. |
| **05-COPY-SKELETON** | Per-route copy skeleton grounded in §11 deployable copy pack + §15 discipline; the approved/banned lines (§10.4) enforced; the cement-anchor pricing frame as concept only. |
| **06-CONTENT-AND-PROOF-MODEL** | The radical-honesty proof model: the Live/Building/Planned claims ledger content, private-by-design language, and how every node of the commercial graph is claims-tagged. Owns the §15 mapping for every public word. |
| **07-ENGINEERING-AND-A11Y** | RSC-first build (mirror the workshop-dashboard RSC pattern), mobile at 320/375/414/768, `overflow-x: clip`, LCP = text headline (no heavy hero image), `next/image`, Core Web Vitals targets, contrast-safe ink, instant `:focus-visible` ring, and the Start-free funnel CO-DEPENDENCIES (beta onboarding, abuse guardrails, first-run flow). |
| **08-ROLLOUT-AND-METRICS** | Preview route (follow existing `/newdesign` + `/design-sync` conventions) to A/B old vs new; claims sign-off gate before anything goes public; analytics events per §14.4 (signup, first estimate, component reused = the moat metric, proposal shared, export); the Hallmark deletion-rail removals needing owner confirmation. |
| **LOOP_LEDGER** | The in-session engineering loop ledger for this pack (proportional scope: this is a multi-route, cross-cutting redesign — a dated pack is warranted, not a full HIGH-BLAST-RADIUS DB/security pack). |

---

## 6. Success criteria

The redesign is done (planning) when ALL of these hold:

1. **Locked decisions obeyed.** Every doc uses the Document direction, "Start free" CTA,
   full-route scope, and the radical-honesty proof engine — no doc reopens them.
2. **§15 honored on every public word.** No invented features, metrics, testimonials,
   prices, or partner names anywhere. AI not featured as current (deferred, §7.2, §16.1).
   No "only we / the only tool that…" (§2). No aggregator / "database of estimates"
   language (§3.3).
3. **§10 voice enforced.** Controlled Confidence throughout; the banned hero lines gone
   (§10.4, §16.4); approved lines from §10.4 / §11 used where copy is suggested.
4. **Coherent system, not a homepage.** Shared shell, shared tokens (doc 03), shared
   claims ledger (doc 06), consistent glossary across all six routes + `/trust`.
5. **The named architecture is drawn.** Doc 04 delivers the commercial-graph plate with
   every node claims-tagged Live / Building / Planned.
6. **Engineering is RSC-first and accessible.** Doc 07 specifies near-zero client JS
   (only the plate hover and claims ledger hydrate), mobile coverage at 320/375/414/768,
   contrast-safe ink, text-LCP.
7. **Co-dependencies flagged, not assumed.** The Start-free funnel's gates (beta
   onboarding, demo-data/reset, abuse guardrails, first-run flow) and the `/about`
   founder-bio gate are marked ⚠️ GATED ON wherever the plan leans on them.
8. **Rollout is preview-first and claims-gated.** Doc 08 ships behind a preview route
   with a claims sign-off before any public cutover.

---

## 7. ⚠️ Gated on / Open decisions

These are the items this plan depends on but **cannot resolve in planning**. Each is
flagged for owner sign-off. Items marked ⚠️ NEEDS INPUT trace to §17.

### 7.1 From the MASTER Ratification Sheet (§1) — owner keep/change/kill

The locked decisions above hard-require several R-items to be ratified. This plan assumes
they are KEPT; if any change, the homepage hero (§11.1) and the copy skeleton (doc 05)
must move with it.

- **R1 Lead category** — "Cost intelligence layer" hook + "construction cost estimating
  platform" plain anchor. ⚠️ GATED ON R1 ratification (keep assumed).
- **R2 Uniqueness claim** — moves OFF "we make estimates reusable" ONTO segment fit +
  proposal/approval + client record + supplier bridge (§2). The doc 04 Supplier Bridge
  node and the §2 honest-position framing depend on this. ⚠️ GATED ON R2.
- **R3 Hook vs. MVP** — hero leads with what is LIVE and already compounds, not the
  not-yet-built cross-project search (§3.3 honesty anchor). The doc 06 claims ledger and
  the "Surfacing" Building node depend on this. ⚠️ GATED ON R3.
- **R4 Brand promise** — "You never start from zero again. Your numbers hold up." Drives
  the §11.2 benefit blocks in doc 05. ⚠️ GATED ON R4.
- **R9 Voice principles** — the five §10.2 principles codify Controlled Confidence; the
  §10.4 approved/banned lines in doc 05 depend on R9. ⚠️ GATED ON R9.
- **R10 Privacy stance** — "Your data is yours, never pooled or anonymized across
  customers." The `/trust` route and the private-by-design proof in doc 06 depend on this
  deliberate trade. ⚠️ GATED ON R10.

(R5 Mission, R6 Vision, R7 UVP, R8 dual-benefit spine, R11 source-of-truth are
foundational but less directly load-bearing on the page surface; tracked in doc 05.)

### 7.2 Start-free funnel CO-DEPENDENCIES (docs 07, 08)

The "Start free" CTA is only honest if the signup it points to is safe and the first-run
experience does not bounce. These are Go/No-Go gates for the CTA going live, not for the
page existing:

- **Beta onboarding + demo-data/reset rules** — §7.5 launch gate and §18.3. ⚠️ GATED ON
  documented reset rules before the CTA routes to a real signup.
- **Abuse guardrails (P1)** — durable rate limiting, POST-only invite acceptance, token
  hashing with a server pepper (§8.6, §18.1). ⚠️ GATED ON the P1 security items.
- **First-run flow** — §18.3 lists this as ⚠️ NEEDS INPUT (design the first-run flow;
  build a demo project). ⚠️ GATED ON owner input + design.
- Note: Free-tier signup does **not** require the unvalidated pricing (§9.3) or the
  billing mechanism (§18.6); those gate CHARGING only.

### 7.3 Founder / company gate (doc 05 `/about`, homepage §9)

- **Founder public bio assets** — §13.1 ⚠️ NEEDS INPUT (credentials, photo, links). The
  homepage §9 "founder / the company" section and the `/about` route are ⚠️ GATED ON these
  assets; if absent at build time, the section is omitted rather than fabricated.

### 7.4 Pricing gate (doc 05 `/pricing`, homepage §10)

- **Pricing is HYPOTHESIS (§9.3).** Do NOT publish a locked price. Show philosophy
  (freemium, seat-based, peso-denominated, never meters estimating/exports/BOQ lines,
  free tier seeds the library) + the cement anchor (₱239 ≈ a bag of cement, §12.11) as a
  CONCEPT/framing only, clearly labeled hypothesis, to validate via discovery + Van
  Westendorp before publishing numbers. ⚠️ GATED ON §9.3 validation (≥5 discovery calls,
  ≥2 beta users building a real estimate, Van Westendorp).

### 7.5 Removals needing owner confirmation (doc 08, Hallmark deletion rail)

- The **3 fabricated testimonials** (§15 violation).
- The **hype hero** ("Start Winning / Win More Bids / Estimate with Precision. Win with
  Clarity") — §10.4 / §16.4.
- The **construction-photo slideshow + the 2.3MB frosted-construction hero PNG** — §12.9
  "dashboards that perform."
- The **logo-only footer** (replaced by a document-styled sitemap).

⚠️ GATED ON explicit owner OK to delete each.

### 7.6 Legal / entity (background, not page-blocking but trust-relevant)

- Entity, ToS, Privacy Policy, DPA designation (§18.2, §17 #2–#4) are ⚠️ NEEDS INPUT and
  affect what `/trust` can honestly claim about data handling. ⚠️ GATED ON for any
  compliance-flavored language on `/trust` (doc 06 keeps claims to what is technically
  true today per §8.6, never implying legal/compliance guarantees §15 forbids).

---

## 8. Cross-links

- Sibling docs: `01-COMPETITIVE-PEG-STUDY` · `02-HOMEPAGE-SECTION-TAXONOMY` ·
  `03-DESIGN-TOKENS-AND-TYPOGRAPHY` · `04-COMMERCIAL-GRAPH-PLATE` · `05-COPY-SKELETON` ·
  `06-CONTENT-AND-PROOF-MODEL` · `07-ENGINEERING-AND-A11Y` · `08-ROLLOUT-AND-METRICS` ·
  `LOOP_LEDGER`.
- Grounding: `ARCHESTIMATOR_MASTER.md` (cited as §X.Y throughout) · `DESIGN.md` ·
  `src/components/landing/` (current, to be replaced) · `src/app/globals.css`
  (`--proposal-paper: #fffdf8` already present; doc 03 is additive).
- Adjacent packs: `2026-06-20-Shared-Link-Feature` (the Proposal Handoff node is Live
  shared links), `2026-06-20-Library-Page-Overall-Improvement` (the Component Library
  node), `2026-06-19-Launch-Readiness-Audit` (the Start-free funnel gates live here).
