# 02 — Section Taxonomy & Narrative Arc

> **STATUS: PLANNING ONLY · 2026-06-21 · not code.**
> **Purpose:** The canonical section map for the whole marketing system. Defines the homepage DOM order, the per-route section inventories for `/`, `/features`, `/pricing`, `/about`, `/contact`, and the NEW `/trust`, plus the nav (N1b) and footer archetypes and the end-to-end funnel logic. Docs **05 (copy)** and **06 (component anatomy)** link here instead of re-defining sections.

---

## 0. How to read this doc

This doc owns the **map** (what sections exist, in what order, for what purpose, at what funnel stage, with what CTA). It does **not** own: the visual tokens (→ **03-VISUAL-TOKENS-AND-TYPOGRAPHY**), the full commercial-graph plate spec (→ **04-COMMERCIAL-GRAPH-PLATE**), the actual deployed copy (→ **05-COPY-LEDGER**), the component DOM/props (→ **06-COMPONENT-ANATOMY**), or the engineering build (→ **07-ENGINEERING-AND-RSC-PLAN**). Every public-word suggestion here obeys §15 (Claims Discipline) and the Controlled-Confidence voice (§10); every dependency this doc leans on but cannot resolve is marked `⚠️ GATED ON`.

Glossary terms used throughout: AEC · BOQ · DUPA · cost intelligence layer · cost proposal · cost estimate · the commercial graph · Controlled Confidence · Live / Partial (=Building) / Planned · cement anchor · redline (accent-as-annotation-mark) · proposal-paper · Free tier / Solo / Pro / Team.

---

## 1. The homepage section taxonomy (CANONICAL DOM order)

This is the canonical order. Docs 04, 05, and 06 must use exactly this numbering and these names. Source cites are `(§X.Y)` against `ARCHESTIMATOR_MASTER.md`. "Funnel stage" uses the four stages defined in §5 below. "Primary CTA" = whether the **"Start free"** primary or the **"Book a walkthrough"** secondary appears in that section's chrome; most sections carry neither (the CTAs live in the Header, Hero, Final CTA, and Footer), per the brief's CTA discipline.

| # | Section name | Source | Purpose (one line) | Funnel stage | Primary CTA in section? |
|---|---|---|---|---|---|
| H | **Header** (N1b masthead-leaning) | §12.1, brief N1b | Persistent wayfinding; carries the two CTAs site-wide | All | **Yes** — both (Start free + Book a walkthrough) |
| 1 | **Hero** | §11.1 | The hook + the one plain payoff; LCP text headline | Awareness | **Yes** — Start free (primary) + Book a walkthrough (secondary) |
| 2 | **The Problem** | §3.2, §6.3 | Name the rebuild loop and the dead file; attack the workflow, never the user (§10.2#4) | Awareness | No |
| 3 | **The Layer + the commercial-graph plate** | §3, §8.3 | Declare the cost intelligence layer; show the named commercial graph as a claims-tagged SVG plate | Awareness → Evaluation | No (plate is interactive, not a CTA) |
| 4 | **What you get** (3 benefit blocks) | §11.2 | Present-tense, Live-grounded: *Stop starting from zero · Defend every number · From estimate to approval* | Evaluation | No |
| 5 | **How it works** (5-step workflow) | §7.3 | The mechanic, mechanic-forward: create → organize → reuse → track → hand off | Evaluation | No |
| 6 | **Who it is for** (tiered roles) | §11.3, §6.2 | Tiered AEC roles (NOT logos); directed messages per role | Evaluation → Trust | No |
| 7 | **What is real today** (claims ledger) | §7.2, §15 | The radical-honesty proof: Live / Building / Planned claims, each tagged | Trust | No |
| 8 | **Why not a spreadsheet** | §11.4 | The direct comparison; the spreadsheet resets, the layer compounds | Evaluation → Trust | No |
| 9 | **The founder / the company** | §11.5, §13.1 | Introduction-energy founder voice; the two-sides lived gap | Trust | No — `⚠️ GATED ON` founder bio assets (§17 #17) |
| 10 | **Pricing, honestly** | §9.3 | Pricing **philosophy** (freemium, seat-based, peso, never meters estimating/exports/BOQ, free tier seeds the library) + the cement anchor as a labeled concept; **no published numbers** | Conversion | No (links to `/pricing`) |
| 11 | **Final CTA** | §11.1, §11.6 | The closing ask; the one-liner; both CTAs | Conversion | **Yes** — both |
| F | **Footer** (document-styled sitemap) | §12.1, brief | Sitemap + legal + the one-liner; **replaces the logo-only block** | All | No (text links only) |

**Hard ordering rule:** sections 1–11 run in this exact DOM order on `/`. The Header is sticky/persistent across the scroll; the Footer closes every route. No section may be inserted, removed, reordered, or renamed without updating this table — it is the single source of truth that 04/05/06 inherit.

**What is deliberately NOT on the homepage** (deletions rail, needs owner confirmation per the brief's Hallmark deletion rail):
- The 3 fabricated testimonials (§15 violation) — section 9/7 carry trust by honesty instead.
- The hype hero ("Start Winning / Win More Bids / Estimate with Precision. Win with Clarity") — banned (§10.4, §16.4); replaced by §11.1.
- The construction-photo slideshow and the 2.3MB frosted-construction hero PNG (§12.9 "documents you would trust, not dashboards that perform") — the LCP is a text headline (→ **07**).
- The logo-only footer block (no logos exist; §15 forbids inventing them).

---

## 2. The other routes — per-route section inventories

Each route is a coherent member of one shared system, not an isolated page. Every route opens with the same Header (H) and closes with the same Footer (F) as the homepage. Routes reuse homepage sections where it serves the visitor, rather than re-deriving them.

### 2.1 `/features` — Evaluation · mechanic-forward

Source: §7.2 (Feature Inventory by status — "the single tracker; marketing must map to it"), §10.7 ("precise, honest, mechanic-forward, Live/Partial/Planned visible").

| # | Section | Purpose |
|---|---|---|
| 1 | **Hero (compact)** | Route title + the one-liner (§11.6); a single line on what this page is: the honest feature ledger. |
| 2 | **Live, today** | Every Live capability from §7.2 (estimate tree, component library, inline editing, templates, D3 charts, Activity / Node Activity / row version history, .xlsx export, shared proposal links with comments/decisions/password, collaboration invites with roles + realtime cursors). Each item links to its mechanic. |
| 3 | **Building (Partial)** | The Partial list: Activity rollups + action taxonomy (improving); proposal export policy (preview/download exists; **issued/immutable snapshot is an OPEN decision** — label it). |
| 4 | **Planned (Next)** | The Planned list labeled as such: proposal snapshots/issued exports (policy gate first), archiving+trash (paid tier), proposal open-tracking (tiered), beta onboarding, **surfacing your own accumulated history by client / project type / supplier (the payoff the hook commits to — NOT shipped)**, supplier catalog + quote requests + product comparison + procurement bridge, client-side proposal record/archive. |
| 5 | **AI, deferred (honest)** | A clearly-marked section: the AI copilot is deferred (§7.2, §16.1). When it ships it enters at Pro+. **Must not feature as a current capability.** Any future AI mention carries a visible DeepSeek/privacy note (§15). |
| 6 | **The 5-step workflow** | Reuse homepage §5 (the mechanic) — links to the shared block, not a rewrite. |
| 7 | **Final CTA** | Reuse homepage §11 (→ `/`). |

`/features` is the surface that lets §15 breathe: claims discipline is the *content* of this page, not a constraint on it. No Live item appears without its mechanic; no Planned item appears without the "Planned" tag.

### 2.2 `/pricing` — Conversion · honest philosophy, **no published numbers**

Source: §9.3 (Pricing context, benchmarks, and validation — `[RESEARCH + ⚠️ VALIDATE]`), §9.2, §12.1 ("no mature-plan language until pricing is real"), §12.11 (the cement anchor).

| # | Section | Purpose |
|---|---|---|
| 1 | **Hero (compact)** | Route title + the line that pricing is a hypothesis we are validating, not a locked price. |
| 2 | **Pricing philosophy** | Freemium, seat-based, peso-denominated, **never meters estimating / exports / BOQ lines**, free tier seeds the library (the moat mechanic). Voice: restrained (§10.7). |
| 3 | **The cement anchor (as concept)** | The ₱239 ≈ a bag of cement framing (§12.11), shown as a **concept / framing only, clearly labeled hypothesis**. The contrast line: "A bag of cement gets poured once. Archestimator works on every estimate you make." Never stops at "cheap" — always paired with the compounds-contrast. |
| 4 | **Tier sketch (directional, labeled hypothesis)** | Free / Solo / Pro / Team shown as **directional intent**, not prices. AI noted as "Pro+, when it ships" (deferred, §7.2). Open decisions surfaced honestly: founding-member rate (A or B, §17 #5), tier boundaries. |
| 5 | **What you will never be metered for** | Explicit promise: estimating, exports, BOQ lines are never usage-metered. |
| 6 | **How we are validating price** | Discovery + Van Westendorp before publishing numbers (§9.3, §17 #6). `⚠️ GATED ON` validation before any number goes public. |
| 7 | **Final CTA** | Reuse homepage §11. |

**Hard rule (brief + §9.3 + §15):** `/pricing` publishes **no locked price**. Numbers are pre-publication hypotheses. The cement anchor is a framing concept, not a published price. Free-tier signup (the "Start free" CTA) does **not** require the validated pricing or the billing mechanism — those gate **charging** only (see **07** CO-DEPENDENCIES).

### 2.3 `/about` — Trust · founder-led, introduction energy

Source: §11.5 (About-page intro), §13.1 (Founder profile), §5.1 (the new-company introduction voice), §10.7 ("the introduction, founder-led, human").

| # | Section | Purpose |
|---|---|---|
| 1 | **Hero (compact)** | Route title + the introduction posture (§5.1): name the world as it is, declare who we are, show who you become. |
| 2 | **The intro (founder voice)** | The §11.5 copy verbatim-led: the frustration, the layer we are building, "built by someone who has worked both sides," and the honesty paragraph. Introduction energy, calm conviction. |
| 3 | **The founder** | §13.1 profile: architect, renderer, designer, UX/UI operator, former software engineer who lived the gap. Core line: *"Archestimator exists because the founder has felt the workflow from both sides."* `⚠️ GATED ON` founder public bio assets — credentials, photo, links (§17 #17). Until those land, this section renders the §13.1 core line + the §11.5 paragraph only; no invented credentials. |
| 4 | **The company, honestly** | Pre-launch MVP. New company. The team-cadence line (§13.2) without overclaiming headcount ("hats, not hires"). |
| 5 | **What this is, and is not** | The §7.4 honest limitations, in the about voice: pre-launch MVP, AI deferred, exports are working documents (not immutable issued records), no procurement/payments/ERP. |
| 6 | **Final CTA** | Reuse homepage §11. |

`/about` is the page most likely to drift into hype; the discipline is the §5.1 posture and §11.5's closing paragraph ("We would rather tell you exactly what it does today… That honesty is part of how we work.").

### 2.4 `/contact` — Conversion · discovery + email-pitch tone

Source: §12.5 (Email pitch — design-partner outreach), §14.2 (Discovery script), §12.1 (contact = Conversion, "request access").

| # | Section | Purpose |
|---|---|---|
| 1 | **Hero (compact)** | Route title + the line that this is for design partners and people who estimate/quote/propose today. |
| 2 | **What we are looking for** | The §12.5 posture: a few design partners who create estimates, quotes, or proposals today; no payment or commitment; 20 minutes of feedback and permission to test the MVP. |
| 3 | **The discovery questions (optional)** | The §14.2 script surfaced as "what we'd love to learn" — how you quote today, where it breaks, what wastes time, how you reuse items/suppliers/brands/templates. Framed as curiosity, not a form-wall. |
| 4 | **The form** | Name, role, current method (spreadsheet / tool / other), the one thing that breaks. Both CTAs present (Start free for the self-serve path; "Book a walkthrough" for the design-partner path). |
| 5 | **Email-pitch tone note (for outbound reuse)** | The §12.5 email is the canonical outbound voice; this page is its inbound mirror. |

### 2.5 `/trust` — Trust · the honesty-as-proof home (NEW ROUTE)

Source: §4.4#6 (Honesty as brand), §15 (Claims Discipline), §4.4#4 + R10 (Private by design), §3.3 (what the layer is and is NOT), §7.2 (status inventory), §13.4 / §18.2 (legal posture). This route **does not exist today** (confirmed: no `src/app/trust/`); it is new and central to the radical-honesty proof strategy.

`/trust` is the long-form home for what the homepage's section 7 (claims ledger) and section 3 (the layer) only preview. It earns the "Trust" funnel stage by making honesty the content.

| # | Section | Purpose |
|---|---|---|
| 1 | **Hero (compact)** | Route title + the thesis line: trust comes from craft and honesty, not logos (brief §4.4#6; "documents you would trust, not dashboards that perform," §12.9). |
| 2 | **Private by design** | R10 / §4.4#4: "Your data is yours, never pooled or anonymized across customers." The deliberate opposite of a cross-customer benchmark. State the trade-off honestly (we forgo that benchmark) — R10 asks the owner to confirm the trade. |
| 3 | **The claims matrix, in depth** | The full Live / Building / Planned / Not-yet matrix from §15 and §7.2, expanded. Each row carries its status tag. This is the canonical public claims artifact the launch gate (§7.5) requires ("public claims matrix complete"). `⚠️ GATED ON` claims sign-off before public (→ **08-ROLLOUT-AND-CLAIMS-SIGN-OFF**). |
| 4 | **What it is NOT** | §3.3 honesty anchor, verbatim-grounded: not an aggregator, not a database of everyone's spreadsheets, not a bulk import. The intelligence is **yours**, from the work **you** do. |
| 5 | **Maturity, plainly stated** | §7.4 limitations in trust-page voice: pre-launch MVP, exports are working documents (not immutable issued records / legal documents), no procurement/payments/ERP, AI deferred. |
| 6 | **Security & data posture (what we can say today)** | Supabase Auth, RLS on every table, Postgres 17 (§8.2). `⚠️ GATED ON` SOC2/GDPR/HIPAA-style badges are **forbidden** (entity/DPA not done; §15 bans fake compliance). State only what is true today; do not badge. `⚠️ GATED ON` DPO/PIA/breach-plan (§17 #4) before any data-handling claim beyond "RLS on every table." |
| 7 | **The roadmap, labeled** | The roadmap chain (§0 / §7.6): Estimate Workspace → Component Library → Supplier Catalog → Quote Requests → Product Comparison → Procurement. Every future item tagged. |
| 8 | **Final CTA** | Reuse homepage §11. |

`/trust` is where the "no logos, no testimonials, no stats" constraint stops feeling like a deficit and becomes the argument. It is the proof strategy's home base.

---

## 3. Nav archetype: N1b (masthead-leaning) — reasoning

**Decision (locked in the brief):** Header = archetype **N1b masthead-leaning**.

Reasoning, grounded:
- **The document IS the argument** (brief strategic pillar; §12.9). A masthead is the typographic signature of a document/publication. The Source Serif 4 wordmark (→ **03**) reads as a masthead, not a SaaS logo lockup. This is the visual continuation of "every estimate becomes reusable commercial knowledge" set on the same paper + serif as the exported proposals.
- **Credibility from craft + honesty, not logos** (brief locked decision #1, §4.4#6). A logo-trust bar would require logos we do not have and §15 forbids inventing. The masthead shifts the trust signal to the document-craft itself.
- **Carries both CTAs site-wide.** The "Start free" primary and "Book a walkthrough" secondary live in the header so they are reachable from every section and every route (brief locked decision #2). On scroll, the masthead stays persistent (→ **06** for sticky behavior, **07** for the RSC/hydration split).

Nav items (left-to-right or under-masthead row, → **06** for layout): **Features · Pricing · About · Contact · Trust**. Order reflects the funnel: Evaluation → Conversion → Trust → Conversion → Trust. The wordmark links to `/`.

`⚠️ GATED ON` **06-COMPONENT-ANATOMY** for the exact responsive collapse (mobile hamburger vs. masthead row) and **07** for the client-JS budget of the interactive header.

---

## 4. Footer archetype — decision + reasoning

**Decision (this doc):** Footer = **document-styled sitemap**, replacing the existing logo-only block (brief REMOVALS rail).

The footer does three jobs, in this order:
1. **Sitemap** — the full route set (`/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`) plus the legal routes already in the repo (`/privacy`, `/terms`). Grouped the way a printed document groups its back-matter (colophon-style), not the way a SaaS footer groups "Product / Company / Resources."
2. **The one-liner** (§11.6) as a closing colophon line: *"Archestimator: the cost intelligence layer for AEC teams. From cost proposal to client approval."*
3. **Legal + status line** — pre-launch MVP marker (§15 hard rule: say "pre-launch MVP" when maturity matters), copyright, the privacy/terms links.

**Rejected alternative — logo wall / partner strip:** no partners exist; §15 forbids inventing them; the brief §4 strategy forbids logos/testimonials/stats entirely. **Rejected alternative — newsletter capture:** no email program is validated (§17 #8 analytics/tooling); adding one would be a §15 overclaim of maturity.

Reasoning for the document-styled choice: it closes the "document is the argument" loop the masthead opens. The whole page reads as one specimen of document quality, top and bottom.

`⚠️ GATED ON` **06** for the exact column layout and **08-ROLLOUT** for the legal-link set (ToS/Privacy are themselves `⚠️ GATED ON` §17 #3 before any signup goes public).

---

## 5. Funnel logic end-to-end

Stages used in §1: **Awareness → Evaluation → Conversion → Trust**. (Trust is treated as a stage, not an afterthought, because the proof strategy *is* honesty — brief §4.)

**The arc, in one line:** the visitor arrives believing estimating is a rebuild-every-time chore; they leave believing their own work could compound, and they know exactly what is real today versus planned, because we told them plainly.

**Homepage flow mapped to the arc:**
1. **Hero (Awareness)** — the hook lands ("Your cost intelligence layer."); the plain payoff follows in three seconds (§10.2#2). The "Start free" CTA is present for the ready-now visitor; "Book a walkthrough" for the cautious one.
2. **Problem + Layer + Plate (Awareness → Evaluation)** — we name their world (§5.1 move 1) and declare who we are (move 2). The commercial-graph plate (→ **04**) is the named-architecture moat move borrowed from Amigo (brief PEG STUDY), but every node is claims-tagged so it never overclaims.
3. **What you get + How it works (Evaluation)** — present-tense Live benefits (§11.2), then the 5-step mechanic (§7.3). This is where the visitor decides "does this do what I need, today."
4. **Who it is for (Evaluation → Trust)** — tiered roles (§6.2), directed messages, no logos. The visitor self-selects into a tier.
5. **Claims ledger (Trust)** — the radical-honesty proof (§7.2, §15). This is the section that, on most SaaS sites, would be a logo wall; here it is a Live/Building/Planned table.
6. **Why not a spreadsheet + Founder + Pricing (Trust → Conversion)** — the comparison, the human, then the honest pricing philosophy. The visitor is now deciding on *us*, not just the product.
7. **Final CTA (Conversion)** — both CTAs, the one-liner, the close.

**Cross-route funnel:**
- A visitor who wants depth leaves the homepage for `/features` (Evaluation) or `/trust` (Trust).
- A visitor who wants the human story goes to `/about` (Trust).
- A visitor ready to talk goes to `/contact` (Conversion, design-partner path) or hits "Start free" anywhere (Conversion, self-serve path).
- `/pricing` exists to make pricing honest *before* it exists as numbers (§9.3); it sends ready visitors back to "Start free" (no number required).

**The two conversion paths (brief locked decision #2):**
- **Self-serve (Start free):** Free-tier signup. `⚠️ GATED ON` the CO-DEPENDENCIES in **07**: beta onboarding + demo-data/reset (§7.5 launch gate), abuse guardrails (durable rate limiting, POST-only invite acceptance, token hashing w/ pepper — the P1 items), and first-run flow (§18.3 `⚠️ NEEDS INPUT`). Free-tier signup does **not** require validated pricing or the billing mechanism.
- **Assisted (Book a walkthrough):** routes to `/contact` and the §12.5 design-partner flow. This path carries no dependency on the self-serve funnel.

**The moat metric (§14.4):** "reused components/templates per estimate" is the funnel's true north — the homepage's section 4 ("Stop starting from zero") is the promise that metric measures. Analytics events per **08-ROLLOUT** (signup, first estimate, component reused, proposal shared, export) instrument this arc.

---

## 6. Voice & claims guardrails for this taxonomy

Restated so 05/06 inherit them without re-reading §15:
- **§15 on every public word.** Live items present-tense; Partial labeled "improving"; Planned labeled "Planned"/"Next" and never implied shipped; Not-yet stated as not-built. No "production hardened," no "legally automated," no immutable/issued-record language for current exports (§16.2), no aggregator/"database of estimates" language (§3.3), no "the only tool that…" (§2), no AI as current (§7.2, §16.1).
- **Controlled Confidence (§10).** Calm conviction, not hype. Attack the workflow, never the user. The banned hero lines (§10.4, §16.4) do not reappear anywhere in this taxonomy.
- **Maturity marker (§15 hard rule):** "pre-launch MVP / MVP preview" appears wherever maturity matters (homepage hero subhead, /about §4, /trust §5, footer status line).
- **No invented proof.** No logos, testimonials, metrics, partner names, compliance badges, or prices (beyond the labeled-hypothesis cement anchor concept on `/pricing`).

---

## 7. Cross-links

- **00-EXECUTIVE-SUMMARY** — the one-page overview; this doc is its section-map appendix.
- **01-PEG-STUDY-AND-POSITIONING** — the Intercom/Amigo study + the "borrow craft + named architecture, replace proof with honesty" conclusion this taxonomy inherits (esp. the commercial-graph plate move and the N1b masthead).
- **03-VISUAL-TOKENS-AND-TYPOGRAPHY** — owns the paper/ink/type/accent tokens the masthead, sections, and footer render in; this doc references them by name only.
- **04-COMMERCIAL-GRAPH-PLATE** — owns the full spec of homepage section 3's plate (named nodes, claims tags, SVG-in-document-craft, the Hallmark ban on re-drawn chrome).
- **05-COPY-LEDGER** — owns the actual deployed copy for every section in this map; cites the same (§X.Y) sources.
- **06-COMPONENT-ANATOMY** — owns the DOM/props/responsive behavior of each section (incl. the N1b header collapse and the footer column layout).
- **07-ENGINEERING-AND-RSC-PLAN** — owns the RSC-first build, the mobile breakpoints (320/375/414/768), the plate-collapse, and the **CO-DEPENDENCIES** for the "Start free" funnel.
- **08-ROLLOUT-AND-CLAIMS-SIGN-OFF** — owns the preview route (/newdesign convention), the A/B old-vs-new, the **claims sign-off gate** before /trust and the claims ledger go public, and the analytics events.
- **LOOP_LEDGER** — the plan-pack loop ledger.

---

## 8. ⚠️ Gated on / Open decisions

- **Founder bio assets** (§17 #17) — gate homepage section 9 and `/about` §3 richness. Until they land, those sections render the §13.1 core line + §11.5 paragraph only; no invented credentials. `⚠️ GATED ON` owner-provided assets.
- **First-run flow** (§18.3 `⚠️ NEEDS INPUT`) — gates the self-serve "Start free" conversion path's activation quality. The taxonomy assumes it exists; **07** flags it as a CO-DEPENDENCY.
- **Claims sign-off** (§7.5 launch gate: "public claims matrix complete") — gates `/trust` §3 and homepage §7 going public. `⚠️ GATED ON` **08-ROLLOUT** sign-off.
- **Privacy / compliance posture** (§17 #2 entity, #3 ToS/Privacy, #4 DPA/DPO/PIA) — gates `/trust` §6 and the footer legal links. SOC2/GDPR/HIPAA badges are **forbidden** until the entity/DPA exist (§15). State only what is true today (RLS on every table, Supabase Auth).
- **Pricing validation** (§9.3, §17 #5 #6) — gates any number on `/pricing`. This taxonomy deliberately publishes **no locked price**; the cement anchor is a labeled-hypothesis concept only.
- **R10 confirmation** — `/trust` §2 (private-by-design, "never pooled") is a deliberate trade-off (forgoes the cross-customer benchmark). `⚠️ GATED ON` owner confirming the trade per R10.
- **Role names + permissions** (§17 #15) — `/features` and homepage §6 reference collaboration invites/roles; canonical role names are `⚠️ NEEDS INPUT`. Use the §7.3 phrasing ("role-based access via collaboration invites") until the Access Matrix is canonical.
- **PH/SEA search-volume validation** (§17 #19) — does not gate the section *map*, but gates any SEO-driven copy within these sections; surface to **05**.
- **/trust is a NEW route** — not in `src/app/` today; creation is an **07** task. The taxonomy assumes it ships alongside the redesign.
