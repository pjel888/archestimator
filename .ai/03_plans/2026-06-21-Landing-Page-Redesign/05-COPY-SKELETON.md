# 05 — Copy Skeleton (voice-locked, claims-tagged)

> **PLANNING ONLY · 2026-06-22 · not code.**
> **Purpose:** Section-by-section, voice-locked copy for the landing system, with every line
> tagged to its claims status (`Live` / `Building` / `Planned`) and its § source in
> `ARCHESTIMATOR_MASTER.md`. No invented features, metrics, testimonials, prices, or partner names.

This doc owns the **words**. It does not own section order (see
`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`), visual treatment
(`03-VISUAL-LANGUAGE-AND-TOKENS.md`), the commercial-graph plate spec
(`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`), or engineering
(`07-ENGINEERING-CONSTRAINTS.md`). Cross-link, do not duplicate.

**How to read the tags:** every suggested line is followed by a `[Claims: X]` marker and a
`(§X.Y)` source pointer. `Live` = ships today and is safe to claim as current. `Building` =
partial today; phrase as improving/direction. `Planned` = roadmap only; phrase as direction,
never as shipped. See MASTER §15 for the full discipline and
`09-CLAIMS-LEDGER-SIGN-OFF.md` for the public sign-off gate. The four values Live / Building /
Planned / NotUs are the single shared `ClaimStatus` type defined in
`src/components/landing/shared/StatusPill.tsx` (decision D-4); this doc's public surface uses
the Live/Building/Planned subset only.

**Voice: Controlled Confidence (§10).** Calm conviction, no hype. The villain is the
spreadsheet-rebuild workflow, never the reader. Every uniqueness claim is re-grounded on
segment fit + proposal-to-approval + client record + supplier bridge + private-by-design
(§4.4) — never "the only tool that…" (§2 bans it).

---

## Conventions used in this doc

- **H = headline.** S = subhead. B = body line. CTA = the action.
- **Accent rail** = the signal `--brand-orange #F24405` used as a brand-presence mark (per
  `03`); copy does not color words, but the accent rail is the visual signal a claim is
  load-bearing. Per D-3, brand presence (fills, logo slab, accent rails, focus rings) is
  `--brand-orange #F24405`; **AA small text / icons on light is `--brand-orange-dark #C63804`**
  (~5.3:1 on white, `globals.css:38`). Clay `#AA412A` is NOT a token and NOT used.
- CTAs follow the ratified decision D-1: **Primary = "Start free"** (self-serve Free-tier
  signup); **Secondary = "Book a walkthrough"**. "Start free" routes to `/signup` is **GATED on
  L-FUN-1/L-FUN-2** (auth routing + beta-onboarding); until resolved it routes to `/login`
  (magic-link handles signup via `shouldCreateUser:true`) or `/contact`. See
  `23-AUTH-EXPERIENCE.md`. Where MASTER shows `[Request early access]`, ship **"Start free"**
  as primary and **"Book a walkthrough"** as secondary.
- The **"pre-launch MVP preview"** tag (per the canonical brief) rides with the primary CTA on
  the hero, and as a persistent badge in the footer/masthead.
- **Body-text ink** is `--secondary #5D5D5D` (`globals.css:11`) or `--muted-foreground #6b6b6b`
  (`globals.css:26`). Never `#7F7F7F` (fails AA) and never the superseded `#292929` (not a
  token; that was the old paper direction).

---

## Section 0 — Masthead (N1b) + global tag

**Wordmark:** `Archestimator` `[Claims: Live]` (§4.2). Set on the glass masthead bar over the
warm canvas wash (`--grad-canvas-wash`, `globals.css:62`); wordmark in `--font-display` (Doto)
or SF Pro per `03` §3.

**Persistent tag (rides near the wordmark, glass-styled):**
> Pre-launch MVP preview `[Claims: Live — maturity disclosure, §7.4, §15]`

**Primary nav copy (glass top bar sitemap, replaces the logo-only block per the brief):**
- Home · Features · Pricing · About · Trust · Contact
- Right-aligned: **Start free** (primary, `--brand-orange` fill) · **Book a walkthrough**
  (secondary)

**Footer wordmark + tagline:** `Archestimator — the cost intelligence layer for AEC teams.
From cost proposal to client approval.` `[Claims: Live]` (§11.6).

> See `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` for IA, `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`
> for nav chrome, and the **copy → component map** in `11` §3 (which React leaf renders each line
> below).

---

## Section 1 — Hero (§11.1)

> Set on the warm grey canvas (`--warm-canvas #f5f5f5`, `globals.css:17`) with a liquid-glass
> hero panel (`.dashboard-glass` / `.dashboard-glass-warm`, `globals.css:1229`/`1753`,
> `data-glass="ready"`). Display type `--font-display` (Doto); numerals `--font-numeric` (Roboto
> Mono); UI `--font-sf-pro`. **No construction-photo slideshow, no hero PNG** (removal rail —
> the prior 2.3MB frosted-construction hero is a §15 violation and is gated for owner-confirmed
> deletion, L-REM-1). The Glass Brand IS the argument — the page looks like the Workshop
> Dashboard the user lands in after "Start free", so trust is continuous, not whiplash.

**H1 (exact, do not alter):**
> Your cost intelligence layer. `[Claims: Live]` (§11.1, §0 headline `[PROPOSED]`)

**Subhead (shortened per §10.2 principle 2 — "one intriguing idea surrounded by plain words"; the
prior ~50-word version is retired):**
> Estimates from your own prices and suppliers. Every revision on the record. Proposals your
> clients can actually approve. `[Claims: Live]` (§11.1)

**Primary CTA:** **Start free** `[Claims: Live — Free tier, §9.2]` (routing gated L-FUN-1/L-FUN-2;
routes to `/signup`, or `/login`/`/contact` until self-serve is enabled — see `23`)
**Secondary CTA:** Book a walkthrough `[Claims: Live — founder-led motion, §9.4]`

**Maturity tag (under the CTAs, small `--secondary #5D5D5D`):**
> Pre-launch MVP preview. `[Claims: Live]` (§7.4, §15)

**Optional one-line "plain anchor" for SEO/screen-readers (visually `--muted-foreground`, semantically H1-supporting):**
> A construction cost estimating platform where every estimate becomes reusable commercial knowledge. `[Claims: Live]` (§0 plain-language anchor, §4.1)

> **Banned and removed here (§16.4):** "Start Winning", "Win More Bids", "Estimate with
> Precision. Win with Clarity", and the entire May hero. Do not reintroduce.

---

## Section 2 — The Problem (§3.2 / §6.3)

> Lead with the change, not the mechanism (§10.2 #1). Attack the workflow, never the user
> (§10.2 #4).

**Section label (accent rail + SF Pro label):**
> The problem `[Claims: Live — framing]`

**H2:**
> Every estimate should become a reusable asset. For teams like yours, today it becomes a dead file. `[Claims: Live]` (§6.3 punchline)

**Body (from §3.2, condensed):**
> Without a cost intelligence layer, every estimate is a dead end. You build it, you send it, you win or lose it, and the knowledge inside it dies in a spreadsheet. Next project, you open last time's file, delete the old rates, and hope nothing breaks. You re-derive prices you already figured out once. You cannot remember what you quoted that client last time. Your best commercial judgment evaporates the moment the file closes. `[Claims: Live — workflow pain, §3.2]`

**Client-side half (one line, honest about both audiences):**
> On the other side, the record scatters across emails, PDFs, and chats, and can vanish when access is removed. `[Claims: Live — client-side pain, §6.3]`

> No stats, no metrics, no "X hours wasted" numbers — §15 forbids inventing them and none are measured (§14.1).

---

## Section 3 — The Layer + the commercial-graph plate (§3 + §8.3)

> The manifesto, paired with the named architecture. The plate visual is owned by `04`; copy below is what surrounds it.

**Section label:**
> The cost intelligence layer `[Claims: Live]` (§3)

**H2:**
> Nothing you learn is lost. `[Claims: Live]` (§3.2)

**Lead (from §3.1):**
> A cost intelligence layer is the structured memory that builds as you work in Archestimator. Not a folder of files, but a living layer of your own commercial knowledge that grows every time you create an estimate: the prices you use, the suppliers you choose, the line items you build, the quotes you send, the revisions your clients ask for. `[Claims: Live foundation + Building/Planned surfacing]` (§3.1)

**Plate intro (one line, points at the SVG plate from `04`):**
> The commercial graph underneath your work — every node, claims-tagged. `[Claims: Live + Building + Planned, see plate]` (§8.3)

**The honesty anchor (required by §3.3, never market past it):**
> Today the foundation is Live: structured estimates, the reusable component library, suppliers, brands, variants with price history, project records, Activity and version history, and project comparison charts. As you keep working, that foundation already compounds. Making your accumulated patterns easy to surface — to recall and organize your own work by client and by project type — is the near-term roadmap commitment the hook creates. `[Claims: Live foundation; Building = surfacing; honest about both]` (§3.3, §7.2)

**What this is NOT (mandatory boundary, §3.3):**
> Archestimator is not an aggregator, not a database of everyone's spreadsheets, and not a bulk import of your old files. The intelligence is yours, built from the work you do inside Archestimator over time. `[Claims: Live — privacy posture]` (§3.3, R10)

> For the node-by-node claims tags on the plate, see `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`.
> This section's job is to **name** the layer and frame the plate; the plate's job is to **show**
> it. The plate imports the single shared `ClaimStatus` type from
> `src/components/landing/shared/StatusPill.tsx` and narrows to the Live/Building/Planned subset
> (no `NotUs` nodes on the plate) — decision D-4.

---

## Section 4 — What you get (§11.2, three benefits)

> Present-tense, Live-grounded. Each benefit ladders to time (stop rebuilding) or intelligence (your work compounds), or both (§10.5).

**Section label:**
> What you get `[Claims: Live]`

**Benefit 1 — H3:**
> Stop starting from zero. `[Claims: Live]` (§11.2)

**Benefit 1 — body:**
> Your prices, suppliers, brands, and line items live in one reusable library. Every estimate you build adds to it, so the next one starts ahead instead of from a blank file. `[Claims: Live]` (§11.2, §6.5)

**Benefit 2 — H3:**
> Defend every number. `[Claims: Live]` (§11.2)

**Benefit 2 — body:**
> Activity and version history track what changed, when, and why. When a client questions a line, the record answers for you. `[Claims: Live]` (§11.2; Activity/Node Activity/row Version History per §7.2)

**Benefit 3 — H3:**
> From estimate to approval. `[Claims: Live]` (§11.2)

**Benefit 3 — body:**
> Turn a structured estimate into a client-ready proposal, then share it with comments, decisions, and password protection, all in one place. `[Claims: Live — shared links, comments, decisions, password; .xlsx export]` (§11.2, §7.2)

> **Honesty footnote (`--secondary`, small, under this section):** Proposal export is a working
> document today; an issued, immutable snapshot is an open policy decision, not a current
> capability. `[Claims: Building]` (§7.2, §16.2)

> **Terminology (D-4):** this doc uses `Building` uniformly for partial-and-improving claims. The
> superseded "Partial" wording (which appeared in earlier drafts) is retired — `Building` is the
> canonical `ClaimStatus` value.

---

## Section 5 — How it works (§7.3, five-step workflow)

> The CANON workflow from §7.3, phrased as a short present-tense sequence. Mechanic nouns are allowed here (this is the `/features`-adjacent surface, §10.2 #1).

**Section label:**
> How it works `[Claims: Live]`

**H2:**
> From first line item to client approval, in one structured workspace. `[Claims: Live]` (§7.3, §12.2)

**Step copy (one line each, present tense):**
1. **Create a project estimate.** Organize it as a hierarchy: Groups → Areas → rows. `[Claims: Live]` (§7.3)
2. **Reuse components from your library.** Your prices, suppliers, brands, variants, and attachments carry across projects. `[Claims: Live]` (§7.2, §6.5)
3. **Track options and revisions.** Activity, Node Activity, and row version history keep every change on the record. `[Claims: Live]` (§7.2, §7.3)
4. **Produce proposal-ready output.** Publish a shared link with comments, decisions, and password protection, or export a clean `.xlsx` workbook. `[Claims: Live]` (§7.3, §7.2)
5. **Compare and learn.** Project charts (donut, bubble) help you see the shape of your estimates. `[Claims: Live]` (§7.2)

**Honest line at the end of the sequence:**
> No BIM or drawing ingestion today (a takeoff bridge is on the roadmap), and no AI-generated pricing — your numbers come from your library and your inputs. Archestimator structures, stores, and totals them. `[Claims: Live — limitations, honest]` (§7.4, §8.4)

> Surfacing ("recall your past estimates by client / project type / supplier") is NOT listed as a step here. It is the payoff the hook commits to and it is not shipped (§3.3, §7.2). It belongs in Section 7 (the claims ledger) and Section 10 (pricing/roadmap), labeled **Planned**.

---

## Section 6 — Who it is for (§11.3 + §6.2, tiered roles, no logos)

> Tiered by GTM sequence, not a logo wall (none exist; §15 forbids inventing them). Each role line is the directed message from §6.2/§12.10, trimmed to voice.

**Section label:**
> Who it is for `[Claims: Live]`

**H2 (from §11.3):**
> Built for the AEC teams enterprise tools overlook. `[Claims: Live]` (§11.3, §4.4 #1)

**Lead (from §11.3):**
> Architects, engineers, contractors, estimators and quantity surveyors, specialty and fit-out firms, interior designers, and suppliers — plus the clients and project managers who approve what they submit. If you build or approve cost estimates and cost proposals, Archestimator is for you. `[Claims: Live]` (§11.3)

**Tier 1 (the wedge) — role lines (one each, §6.2 / §12.10):**
- **Contractors & estimators:** Stop rebuilding your BOQ from scratch. Your unit costs, your suppliers, last project's estimate — ready for the next one. `[Claims: Live]`
- **Cost estimators & QS:** Every estimate you've costed should make the next one faster. Stop hunting old files for a rate you already set. `[Claims: Live]`
- **Specialty & fit-out firms:** Same scopes, new project. Build from your library and send the cost proposal the same day. `[Claims: Live]`
- **Architects:** Hand your client a cost proposal as resolved as your drawings, and defend every number when they ask. `[Claims: Live]`

**Tier 2 (expand) — role lines:**
- **Engineers (civil / structural / MEP):** Estimate the system once. Reuse it on every project after. `[Claims: Live]`
- **Suppliers:** Turn your product list into a cost proposal in minutes, with the brands, variants, and unit costs your team reuses. `[Claims: Live library; supplier catalog/quote requests are Planned, §7.2]`
- **Interior designers / design-build:** Specify it, cost it, send a proposal your client can approve, with every revision on the record. `[Claims: Live]`

**Tier 3 (the client side) — role lines:**
- **Clients / owners / developers:** Control every cost proposal before it becomes a cost problem. `[Claims: Live sharing; persistent client-side record is Planned, §7.2]` (§11.7, §12.10)
- **Project managers / owner's reps:** Stop chasing cost proposals across email threads. Every submission, revision, and approval in one place you control. `[Claims: Live]`
- **Procurement / finance (client side):** Review and compare cost proposals with the full revision history behind every number. `[Claims: Live]`

**Honesty footnote:**
> The supplier catalog and quote-request layers are roadmap, so supplier messaging leans on the live component library, not a catalog that does not exist yet. The client-side persistent archive is planned, so client messaging uses today's live sharing, comments, decisions, and Activity as proof and frames the lasting record as the direction. `[Claims: Live + Planned, honest]` (§6.2 honesty checks)

> No logos. No testimonials. No "trusted by." None exist and §15 forbids fabricating them.

---

## Section 7 — What is real today (the claims ledger)

> The radical-honesty proof engine. This is where credibility comes from (§4.4 #6, §15). Renders as the interactive claims ledger (one of the two interactive leaves that hydrate, per `07`).

**Section label:**
> What is real today `[Claims: meta — this section IS the claims discipline]`

**H2:**
> We would rather tell you exactly what it does today than oversell it. `[Claims: Live]` (§11.5 last paragraph, §4.4 #6)

**Lead:**
> Every claim below carries a status. Live ships today. Building is partial and improving. Planned is on the roadmap, not yet shipped. This is part of how we work. `[Claims: Live]` (§15, §11.5)

**Live (claim lines, each a row in the ledger):**
- Estimate workspace with a hierarchical tree (Group / Area / rows). `[Live]` (§7.2)
- Reusable component library: components, brands, suppliers, variants, pricing, images, attachments. `[Live]` (§7.2)
- Inline editing, templates, D3 comparison charts. `[Live]` (§7.2)
- Activity, Node Activity, and row version history. `[Live]` (§7.2)
- Project publication with shared links: comments, decisions, password protection. `[Live]` (§7.2)
- Collaboration invites with roles and realtime cursors. `[Live]` (§7.2)
- Excel `.xlsx` proposal export. `[Live]` (§7.2)

**Building:**
- Activity rollups and action taxonomy — improving. `[Building]` (§7.2)
- Proposal export policy — preview and download exist today; an issued, immutable snapshot is an open decision. `[Building]` (§7.2, §16.2)

**Planned (labeled as direction, never as shipped):**
- Surfacing your own accumulated history by client, project type, and supplier — the payoff the hook commits to. `[Planned]` (§3.3, §7.2, §17 #13)
- Proposal snapshots / issued exports (policy gate first). `[Planned]` (§7.2, §16.2)
- Archiving and trash (a paid-tier capability). `[Planned]` (§7.2, §9.2)
- Proposal open-tracking (tiered). `[Planned]` (§7.2, §9.2)
- Beta onboarding and first-run flow. `[Planned]` (§7.2, §18.3)
- Supplier catalog → quote requests → product comparison → procurement bridge. `[Planned]` (§7.2, §4.4 #3)
- Client-side proposal record / archive. `[Planned]` (§7.2, §9.1)

**Not yet / not us (the explicit boundary, §15):**
> Not production-hardened enterprise SaaS. Not a legal document or compliance record. Not procurement, ERP, or payment execution. Not an aggregator or a database of other people's estimates. AI is deferred — when it ships it enters as an Ask-only copilot at Pro and up, with a visible privacy note. `[Claims: Live — honest limitations]` (§7.4, §8.5, §15)

> The ledger is the single source the rest of the page must reconcile to. If a line elsewhere implies something the ledger marks Planned/Not-yet, the line loses. See `09-CLAIMS-LEDGER-SIGN-OFF.md` for the pre-public sign-off gate. (Earlier drafts mis-cited this gate as `07-CLAIMS-LEDER-SIGN-OFF.md` — that was a typo + wrong number; the canonical filename is `09-CLAIMS-LEDGER-SIGN-OFF.md` per `10-CANONICAL-DOC-MAP.md`.)

---

## Section 8 — Why not a spreadsheet (§11.4)

> Direct comparison to the status quo, without insulting the user (§10.2 #4). The spreadsheet is the villain.

**Section label:**
> Why not just a spreadsheet `[Claims: Live]`

**H2:**
> A spreadsheet resets every project. `[Claims: Live]` (§11.4)

**Body (from §11.4, exact):**
> A spreadsheet resets every project. You copy last time's file, delete the rates, and rebuild. Archestimator keeps the knowledge: your prices, your suppliers, your revisions, building up as you work, so quoting gets faster and your numbers get easier to stand behind. `[Claims: Live]` (§11.4)

**Support line (approved line, §10.4):**
> When every revision matters, spreadsheets are not enough. `[Claims: Live]` (§10.4 approved)

> Do NOT use banned lines (§10.4): no "Winners use Archestimator", no "stop being left behind", no "the only tool that…".

---

## Section 9 — The founder / the company (§11.5 + §13.1)

> Introduction energy, founder-led, human (§10.7, §5.1). ⚠️ **GATED on founder bio assets (L-FND-1).**

**Section label:**
> The company `[Claims: Live]`

**H2:**
> A new company, building for teams who live in spreadsheets. `[Claims: Live]` (§11.5, §5.1)

**Body (from §11.5, exact voice):**
> Archestimator started with a simple frustration: every estimate holds real commercial knowledge — your prices, your suppliers, your judgment — and every time a project ends, that knowledge dies in a spreadsheet. The next job starts from row one.
>
> We are building the cost intelligence layer for teams who live in those spreadsheets. Not an enterprise suite that takes months to set up, but a workspace where your own estimating work compounds: structured estimates, a reusable library, a clean revision record, and proposals your clients can actually review and approve. Built by someone who has worked both sides of this, the design and cost side, and the software side.
>
> This is a new company and an early product. We would rather tell you exactly what it does today and where it is going than oversell it. That honesty is part of how we work. `[Claims: Live]` (§11.5)

**Founder one-liner (only if/when bio assets exist):**
> Built by Philip — architect, renderer, UX/UI operator, and former software engineer who has lived the gap between design intent, cost proposals, supplier coordination, and software. `[Claims: Live — founder-market fit]` (§13.1, §4.4 #5)

> ⚠️ **GATED ON (L-FND-1):** founder public bio assets — credentials, photo, links (MASTER §17
> #17, §13.1). Ship the §11.5 paragraphs without the founder one-liner until assets are
> confirmed. Do not invent credentials.

---

## Section 10 — Pricing, honestly (§9.3 philosophy + cement anchor as CONCEPT)

> **This is the most claim-sensitive section.** Pricing numbers are HYPOTHESIS, not canon. Show philosophy + the cement anchor as a CONCEPT/framing only, clearly labeled, to validate via discovery + Van Westendorp before publishing any number (§9.3, §17 #6).

**Section label:**
> Pricing, honestly `[Claims: HYPOTHESIS — see §9.3]`

**H2:**
> Simple enough to actually adopt. Honest about what it costs and why. `[Claims: Live — philosophy]` (§9.3 pricing rules)

**Philosophy block (what we CAN say publicly today):**
> Archestimator is freemium and seat-based, priced in pesos, billed locally. The compounding cost library is the lock-in, so we let you build it free and charge to share, collaborate, and scale. We do not meter estimating, exports, or BOQ lines — that would tax the exact behavior that builds the moat. A permanent free tier, not just a trial, so the library can accumulate. `[Claims: Live — pricing philosophy]` (§9.2 gating philosophy, §9.3 rules)

**The cement anchor — CONCEPT only, clearly labeled (§9.3, §12.11):**
> Our framing anchor is a bag of cement — the most iconic, instantly-priced unit in Philippine construction. The idea is that a tool that compounds on every estimate you make should cost less, per month, than a material you pour once. That is a concept for how we think about value, not a published price. `[Claims: HYPOTHESIS — cement anchor as framing, §12.11]`

> ⚠️ **GATED ON (L-PRC-1):** the actual Solo price (₱239 or up to ₱490), the founding-member
> rate (option A or B — L-RAT-5), per-seat vs. bundle, and free-tier caps — all `[HYPOTHESIS]`
> per §9.2/§9.3 and **must not be published** until the gates pass: ≥5 qualified discovery
> calls, ≥2 beta users building a real estimate, a clear document-handoff signal, support burden
> understood, plus the Van Westendorp Price Sensitivity Meter (§9.3). The `/pricing` route
> (below) shows philosophy + the cement-anchor concept only until then.

**CTA (philosophy-appropriate):**
> **Start free** (build the library, no card) · **Book a walkthrough** (talk pricing with the founder) `[Claims: Live — Free tier + founder-led motion]` (§9.2, §9.4)

> Do NOT print "₱239/month", "Solo", "Pro", "Team", or tier tables on the public site until validation closes. Tier names may appear in `/pricing` as the *shape* of the model (Free / Solo / Pro / Team), clearly labeled as planned, but no numbers.

---

## Section 11 — Final CTA

> Calm, not loud. Restate the hook. Both CTAs.

**H2:**
> Every estimate, working for you on the next one. `[Claims: Live]` (§3.5, §12.6)

**Subhead:**
> Build your first estimate from a reusable library, keep every revision on the record, and send a proposal your client can actually review and approve. `[Claims: Live]` (§11.1, §11.2)

**Primary CTA:** **Start free** `[Claims: Live — Free tier]` (routing gated L-FUN-1/L-FUN-2)
**Secondary CTA:** Book a walkthrough `[Claims: Live]`

**Maturity tag (persistent):**
> Pre-launch MVP preview. `[Claims: Live]` (§7.4)

---

## Footer (glass-styled sitemap)

> Replaces the logo-only footer block (removal rail, L-REM-4). Glass-styled per `03`/`06`, set
> on the warm canvas wash.

**Wordmark + tagline:**
> **Archestimator** — the cost intelligence layer for AEC teams. From cost proposal to client approval. `[Claims: Live]` (§11.6)

**Sitemap columns (labels + hrefs; href targets per `23` + `13` + `15`):**

| Column | Links (label → href) | Notes |
|---|---|---|
| **Product** | Features → `/features` · Pricing → `/pricing` · Trust → `/trust` · Start free → `/signup` | `/signup` self-serve **GATED L-FUN-1/L-FUN-2**; until resolved, "Start free" href → `/login` (magic-link handles signup) or `/contact`. See `23`. |
| **Company** | About → `/about` · Contact → `/contact` · Book a walkthrough → `/contact?intent=walkthrough` | `/about` richness GATED L-FND-1. |
| **Account** | Sign in → `/login` · Start free → `/signup` | Both `noindex,nofollow` per `13`; canonical-self. `/signup` gated as above. |
| **Legal** | Privacy → `/privacy` (L-LEG-2) · Terms → `/terms` (L-LEG-2) | GATED on legal publish (L-LEG-1…4); render labels only, no dead links. |
| **Status badge** | Pre-launch MVP preview · status: in active development | Persistent badge. |

**Honesty line (small, `--secondary`):**
> Pre-launch MVP. Not production-hardened enterprise SaaS. Exports are working documents, not immutable issued records. AI is on the roadmap. `[Claims: Live — limitations]` (§7.4, §15)

---

## Auth microcopy (cross-link `23-AUTH-EXPERIENCE.md`)

> The auth surface (`/login` + `/signup`) is a **full-page, 2-column, brand-forward** route (D-2).
> Copy lives in the right column of the shared `AuthLayout`; the left column is a decorative
> `AuthGlassPanel` (`aria-hidden`, no copy). All microcopy below is voice-locked to Controlled
> Confidence and tag-clean. Auth model = Google OAuth + magic link, **no password** (D-2 — that is
> the real product model; do NOT invent password copy). Full surface spec in `23`.

### `/login` right column

- **H1:** `Sign in` `[Claims: Live]`
- **Subhead (under H1):** `Sign in to your Archestimator workspace.` `[Claims: Live]`
- **Primary button (Google OAuth):** `Continue with Google` `[Claims: Live]` (label comes from
  `GoogleButton` `label` prop — `23` §4)
- **Divider:** `or` `[Claims: Live]`
- **Secondary button (magic link):** `Email me a sign-in link` `[Claims: Live]` (label from
  `MagicLinkButton` `label` prop; the email field sits above it with `autocomplete="email"`)
- **Email field label:** `Email` `[Claims: Live]`
- **Cross-link to twin:** `New to Archestimator? Start free →` (routes to `/signup`; gated
  L-FUN-1/L-FUN-2 — until self-serve is on, this renders as `New to Archestimator? Request access →`
  routing to `/contact?intent=beta-request`. See `23` §3.2.)
- **Legal row:** `By continuing you agree to our [Terms](/terms) and [Privacy Policy](/privacy).`
  `[Claims: Live]` (links GATED L-LEG-2; render text only until live)
- **Success banner (`?sent=1`, `aria-live="polite"`):** `Check your email — we sent a sign-in
  link to your inbox.` `[Claims: Live]`
- **Error banners (`?error=`, `aria-live="polite"`, public-safe per `23` §2.4):**
  - `email_required` → `Enter an email address to receive a sign-in link.`
  - `auth_request_failed` → `We could not start sign-in. Try again in a moment.`
  - `google_request_failed` → `Google sign-in could not start. Try again or use an email link.`
  - `callback_missing_code` → `This sign-in link is incomplete. Request a new link to continue.`
  - `callback_exchange_failed` → `We could not finish signing you in. Request a new link or try Google again.`
  - `invalid_redirect` → `We reset the sign-in destination to keep your account safe.`

### `/signup` right column (GATED L-FUN-1/L-FUN-2)

- **H1:** `Start free` `[Claims: Live]` (matches the primary CTA label; brand-continuous)
- **Subhead:** `Build your cost library free. No card.` `[Claims: Live — Free tier philosophy, §9.2]`
- **Primary button (Google OAuth):** `Continue with Google` `[Claims: Live]`
- **Divider:** `or` `[Claims: Live]`
- **Secondary button (magic link — `shouldCreateUser:true` makes it signup-capable):**
  `Email me a signup link` `[Claims: Live]`
- **Email field label:** `Email` `[Claims: Live]` (`autocomplete="email"`)
- **Cross-link to twin:** `Already have an account? Sign in →` (routes to `/login`)
- **Legal row:** same as `/login`
- **Success banner:** `Check your email — we sent a signup link to your inbox.`
- **Error banners:** same public-safe set as `/login` (the server actions are shared)

### Closed-beta gate variant (when self-serve is off — `ClosedBetaGate` in `23` §3.2)

- **H1 stays:** `Start free` (the brand promise doesn't change because the gate changed)
- **Subhead (gate variant):** `Archestimator is in closed beta. Request your invite and we'll
  reach out.` `[Claims: Live]`
- **Form action:** routes the email capture to `/contact?intent=beta-request` (or a waitlist;
  destination GATED L-CRM-1) instead of `signInWithOtp`.
- **Button:** `Request access` `[Claims: Live]`
- **Under-button line:** `Already invited? Sign in →` (routes to `/login`)

> The LEFT `AuthGlassPanel` is identical across `/login`, `/signup`, and the gate variant — the
> brand does not change because the gate changed (`23` §3.2). No fake product screenshots, no
> stock photos on the panel (radical honesty, D-2).

---

## Meta + social copy (per route) → forwarded to `13-SEO-AND-DISCOVERY.md` §3

This doc does **not** duplicate the per-route `<title>`, meta description, OG title/description,
or OG image intent — those are owned by `13-SEO-AND-DISCOVERY.md` §3 (per-route meta copy) and
§4 (OG/social), and re-stating them here risks drift. The contract from this doc:

- **Voice:** every meta/OG line follows Controlled Confidence (§10) and the same claims
  discipline (§15) as the on-page copy above — no invented metrics, no hype, no "only we" claims.
- **Noindex surfaces:** `/login` and `/signup` carry `<meta name="robots"
  content="noindex,nofollow">` and canonical-self per `23` §7 and `13` (they are conversion
  dead-ends for search, not landing pages). Their `<title>` is brand-suffixed and intent-clear
  (`Sign in — Archestimator`, `Start free — Archestimator`) but not keyword-optimized.
- **Claims tags on meta copy:** the H1 lines tagged `[Claims: Live]` above are the canonical
  source for the OG/meta title text per route. If `13` proposes a variant, the variant must obey
  §15 and reconcile to the Section 7 ledger.
- **Social proof:** NO customer logos in OG images, NO testimonial quotes in social copy (none
  exist; §15 forbids inventing). OG images are glass-brand compositions only (per `19`).

See `13-SEO-AND-DISCOVERY.md` §3 for the per-route title/description table and §4 for the OG
image spec per route.

---

# Secondary routes — copy essentials

> Each route extends a homepage section into its own page. Same voice, same claims discipline. IA and chrome in `02`; full content map in `11`; meta/OG in `13`.

## `/features` (Evaluation, §12.1)

**H1:**
> Every feature, with its status. `[Claims: meta]` (§12.1, §15)

**Lead:**
> The estimate workspace, the reusable library, the revision record, and the proposal handoff — each one tagged Live, Building, or Planned, so you know exactly what ships today and what is on the roadmap. `[Claims: Live + Building + Planned]` (§7.2, §15)

**Body structure:** the Section 7 claims ledger, expanded per feature into a short paragraph (mechanic-forward, §10.7). AI is mentioned only as deferred roadmap with the privacy note (§8.5). The supplier catalog / quote requests / procurement bridge appear under a clearly labeled "Planned" heading.

**CTA:** **Start free** · Book a walkthrough.

## `/pricing` (Conversion, §12.1 — restrained)

**H1:**
> Pricing, honestly. `[Claims: HYPOTHESIS]` (§9.3)

**Lead (philosophy only, same as Section 10):**
> Freemium, seat-based, peso-denominated, never metered on estimating, exports, or BOQ lines. A permanent free tier so your library can accumulate. The full pricing model — tiers, numbers, the founding-member rate — is being validated with the teams we are building for, and will be published once it is. `[Claims: Live philosophy + HYPOTHESIS numbers]` (§9.2, §9.3)

**Cement-anchor concept block:** same as Section 10, labeled CONCEPT.

**Tier shape (names only, no numbers, labeled Planned):**
> The intended shape is Free → Solo → Pro → Team, plus an Education tier and a future Owner/Portfolio tier for the client side. Numbers are pending validation. `[Claims: HYPOTHESIS]` (§9.2)

**CTA:** **Start free** (build the library today) · **Book a walkthrough** (talk pricing with the founder).

> ⚠️ **GATED ON (L-PRC-1):** §9.3 validation gates + Van Westendorp before any number appears here.

## `/about` (Trust, §11.5)

**H1:**
> A new company, building for teams who live in spreadsheets. `[Claims: Live]` (§11.5)

**Body:** the full §11.5 founder-voice paragraphs (Section 9 above), plus the founder one-liner ⚠️ GATED on bio assets (L-FND-1).

**Mission + vision block (from §4.5):**
> **Mission:** Give AEC teams a cost intelligence layer — one place where unit costs, suppliers, revisions, and client decisions compound instead of dying in spreadsheets, from first cost estimate to client approval. `[Claims: Live]` (§4.5, R5)
> **Promise:** You never start from zero again. Your numbers hold up. `[Claims: Live]` (§4.5, R4)

**Privacy stance (R10):**
> Your data is yours, never pooled or anonymized across customers. `[Claims: Live — deliberate positioning]` (§4.4 #4, R10)

> ⚠️ **GATED ON (L-FND-1):** founder public bio assets (§13.1, §17 #17).

## `/contact` (Conversion, §12.1)

**H1:**
> Talk to the founder. `[Claims: Live — founder-led motion]` (§9.4)

**Lead:**
> Archestimator is founder-led. Book a walkthrough around your own workflow, or send a note. We are looking for design partners who create estimates, quotes, or proposals today — no payment or commitment, just feedback and permission to test the MVP. `[Claims: Live]` (§9.4, §12.5)

**Form fields (minimal, glass-styled):** Name · Role (architect / engineer / contractor / estimator / supplier / PM / client / other) · Email · A line about your current workflow. `[Claims: Live]`

**CTA:** **Book a walkthrough** (primary) · **Start free** (secondary, build while you wait).

> ⚠️ **GATED ON (L-FUN-4):** abuse guardrails for any form submission (durable rate limiting via
> Postgres `security_rate_limit_events` table — NOT Redis; honeypot; server validation — the P1 items, §8.6,
> §18.1). See `15-FORMS-AND-ABUSE-GUARDRAILS.md`. Turnstile is NOT yet built (escalation-only).
> The form itself is Live; the inbox behind it must be ready before public launch.

## `/trust` (the new route)

> The trust-first surface. Combines the claims ledger (Section 7), the privacy stance, the security posture, and (gated/reserved) data-residency. This is where honesty is operationalized.

**H1:**
> What we will and will not claim. `[Claims: meta — the discipline itself]` (§15, §4.4 #6)

**Lead:**
> Trust, for a pre-launch product, comes from honesty. So here is exactly what Archestimator does today, what is improving, what is on the roadmap, and what it is not. `[Claims: Live]` (§15, §11.5)

**Section A — The claims ledger:** the full Section 7 ledger, rendered. `[Live + Building + Planned]`

**Section B — Privacy by design:**
> Your data is yours. Archestimator is not an aggregator and not a database of other people's estimates. The intelligence in your workspace is built from your work, never pooled or anonymized across customers. `[Claims: Live — privacy posture]` (§3.3, §4.4 #4, R10)

**Section C — Security posture (what we can say today):**
> Bearer-secret invite and share tokens (≥32 bytes, HMAC-SHA256 with a server pepper, never logged raw), expiry and revocation, POST-only mutations, HttpOnly/Secure/SameSite cookies, durable rate limiting with `Retry-After`, and audit logging. Row-level security is enforced on every table. `[Claims: Live — security posture]` (§8.6)

**Section D — Maturity and limitations:** the §7.4 honest list (pre-launch MVP, not production-hardened; AI deferred; exports are working documents; no procurement/ERP/payment execution; no BIM ingestion yet; English UI, no localization yet). `[Claims: Live — honest limitations]`

**Section E — Data residency (RESERVED / GATED L-LEG-3, L-LEG-4):**
> ⚠️ **GATED ON (L-LEG-3 / L-LEG-4):** data-residency and DPA language is **reserved** on this
> route. Until the legal entity (L-LEG-1), published Privacy Policy + ToS (L-LEG-2), and DPA
> registration assessment (L-LEG-4) are settled, **Section E renders as a placeholder block**
> with no compliance claims. The placeholder copy is:
>
> > *Data residency and processing arrangements are part of our roadmap. We will publish them
> > here once they are finalized.*
>
> We do **NOT** claim SOC2 / GDPR / HIPAA / DPA compliance — entity and DPA work are not done
> (§4.4, §18.2). No badges. Rate-limiting is Postgres, not Redis (project position). Turnstile
> is not yet built. When the gates close, the placeholder is replaced by a real residency
> statement carrying the `[Claims: Live]` tag; until then it carries `[Claims: Planned]`.

> ⚠️ **GATED ON (L-LEG-1…4):** published Privacy Policy + ToS (L-LEG-2) and DPA registration
> assessment (L-LEG-4) before any compliance-badge or legal-guarantee language anywhere on
> `/trust`. No SOC2/GDPR/HIPAA/DPA badges (entity/DPA not done).

**CTA:** **Start free** · Book a walkthrough.

---

# Copy → component map (cross-link `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` §3)

The authoritative copy → component binding lives in `11` §3 (which React/RSC leaf renders which
line). The summary contract from this doc:

| Section / route | Copy block above | Rendering leaf (per `11`) | RSC / Client |
|---|---|---|---|
| Masthead | Section 0 | `LandingHeader` (glass top bar) | RSC |
| Hero H1/subhead/CTAs | Section 1 | `HeroSection` over `dashboard-glass` | RSC (CTAs are links) |
| Problem | Section 2 | `ProblemSection` | RSC |
| Layer + plate | Section 3 | `LayerSection` + `CommercialGraphPlate` (`04`) | RSC + **Client** (plate hover is one of the two hydrating leaves) |
| What you get | Section 4 | `BenefitsSection` (3 benefit cards) | RSC |
| How it works | Section 5 | `HowItWorksSection` (5 steps) | RSC |
| Who it is for | Section 6 | `AudienceSection` (tiered roles) | RSC |
| Claims ledger | Section 7 | `ClaimsLedger` (uses `StatusPill` + D-4 `ClaimStatus`) | **Client** (interactive; one of the two hydrating leaves) |
| Why not spreadsheet | Section 8 | `ComparisonSection` | RSC |
| Founder | Section 9 | `FounderSection` | RSC (GATED L-FND-1) |
| Pricing | Section 10 | `PricingSection` (philosophy + cement-anchor CONCEPT) | RSC |
| Final CTA | Section 11 | `FinalCtaSection` | RSC |
| Footer | Footer block | `LandingFooter` (glass, sitemap columns above) | RSC |
| `/login` + `/signup` | Auth microcopy block | `AuthLayout` + `AuthGlassPanel` + `LoginForm` / `SignupForm` / `ClosedBetaGate` + `GoogleButton` + `MagicLinkButton` (`23` §4) | RSC shell + Client form leaves |

Two hydrating leaves only: the plate hover and the claims ledger (per `07`). Everything else is
RSC.

---

# Cross-links (all canonical per `10-CANONICAL-DOC-MAP.md`)

- `00-OVERVIEW.md` — plan overview, five ratified decisions, scope, rollout hooks.
- `01-DESIGN-DIRECTION.md` — Intercom + Amigo transferability; why we borrow craft + named architecture, not logos/testimonials/stats. Preserves "Direction D — The Document" as a documented alternative (demoted by D-1).
- `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` — canonical DOM order this doc follows section-by-section.
- `03-VISUAL-LANGUAGE-AND-TOKENS.md` — Glass Brand tokens (warm canvas, glass classes, signal orange `#F24405` / dark `#C63804` per D-3, Doto + Roboto Mono + SF Pro type, 3px/8px/12px radius, motion, deferred-glass arming); the visual frame around these words.
- `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` — the SVG plate spec and node-by-node claims tags referenced in Section 3.
- `06-PROOF-AND-CLAIMS-DISCIPLINE.md` — the `<ClaimsLedger>` component spec, the claims matrix, the §15 removals rail, the public sign-off process.
- `07-ENGINEERING-CONSTRAINTS.md` — RSC-first structure; the two interactive leaves (architecture-plate hover, claims ledger); mobile collapse; Start-free funnel co-dependencies.
- `08-ROLLOUT-AND-ANALYTICS.md` — preview route, A/B old vs new, claims sign-off gate, analytics events.
- `09-CLAIMS-LEDGER-SIGN-OFF.md` — the public sign-off gate this ledger reconciles to (canonical filename; the prior `07-CLAIMS-LEDER-SIGN-OFF.md` was a typo + wrong number, corrected).
- `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` — component/content map; which React leaves render which lines (§3 copy → component map).
- `13-SEO-AND-DISCOVERY.md` — per-route meta + social copy (§3 title/description, §4 OG) forwarded from the Meta + social copy section above.
- `15-FORMS-AND-ABUSE-GUARDRAILS.md` — `/contact` + `/signup` form-spam defense (Postgres rate-limit, honeypot, Turnstile escalation-only).
- `23-AUTH-EXPERIENCE.md` — full-page 2-column auth surface (D-2); auth microcopy binding.
- `LOOP_LEDGER.md` — plan loop state; every ⚠️ GATED ON item below has a row here.

---

# ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

Per D-5, no gate is silently marked closed. Each item below has a row in `LOOP_LEDGER.md`.

1. ⚠️ **GATED ON (L-FUN-1):** the `/signup` route path (`/signup` vs `/auth/signup` vs `/start`) — blocks the "Start free" href target in Section 1, Section 11, the footer, and the `/login` cross-link. MASTER §7.5, §17 #7. Recommend `/signup` (per `23` §10). Until resolved, "Start free" → `/login` or `/contact`.
2. ⚠️ **GATED ON (L-FUN-2):** beta-onboarding + self-serve enablement — decides whether `/signup` ships `SignupForm` (real self-serve) or `ClosedBetaGate` (request-access variant). Blocks the `/signup` microcopy variant. MASTER §7.5, §18.3, §17 #7. See `23` §3.
3. ⚠️ **GATED ON (L-FUN-4):** abuse guardrails (durable Postgres rate-limit, POST-only invite acceptance, token hashing w/ pepper, honeypot) for the `/contact` form and the Free-tier signup funnel. MASTER §8.6, §18.1. See `15`.
4. ⚠️ **GATED ON (L-FND-1):** founder public bio assets (credentials, photo, links) — blocks the founder one-liner in Section 9 and `/about`. MASTER §13.1, §17 #17. Ship the §11.5 paragraphs without it; do not invent credentials.
5. ⚠️ **GATED ON (L-PRC-1):** pricing validation gates + Van Westendorp before any peso number or tier table is published — blocks numeric pricing in Section 10 and `/pricing`. MASTER §9.3, §17 #6. Until then: philosophy + cement-anchor CONCEPT only.
6. ⚠️ **GATED ON (L-RAT-5):** the founding-member rate decision (option A or B) — blocks any "founding rate" copy. MASTER §9.2, §17 #5.
7. ⚠️ **GATED ON (L-LEG-1…4):** legal entity (L-LEG-1), published Privacy Policy + ToS (L-LEG-2), DPA registration assessment (L-LEG-4) — blocks any compliance/legal-guarantee language on `/trust` (Section C claims + Section E residency). MASTER §17 #3/#4, §18.2. No SOC2/GDPR/HIPAA/DPA badges (entity/DPA not done). `/trust` Section E renders as a `[Planned]` placeholder until L-LEG-3/L-LEG-4 close.
8. ⚠️ **GATED ON (L-REM-1…4):** owner-confirmed removal of the 3 fabricated testimonials, the hype hero, the construction-photo slideshow + 2.3MB hero PNG, and the logo-only footer block (Hallmark rail). MASTER §15, §16.4. Removal is the plan; owner sign-off gates execution (`06` §4, `08`, `21`).
9. ⚠️ **GATED ON (open):** the proposal export policy decision (issued/immutable snapshot) — blocks any "issued record" or "immutable snapshot" claim. MASTER §7.2, §16.2. Until then, exports are "working documents" (`[Claims: Building]`).
10. ⚠️ **GATED ON (open):** first-run flow design + demo-data/reset rules — blocks confident "Start free" onboarding copy beyond the CTA itself. MASTER §7.5, §18.3, §17 #7. The CTA is Live; the onboarding it triggers is a co-dependency (see `07`, `23`).
11. ⚠️ **GATED ON (open):** abuse guardrails durability for any form submission — same as L-FUN-4 above; restated here because it appears on `/contact`. MASTER §8.6.
12. ⚠️ **GATED ON (L-RAT-1…4, L-RAT-6):** ratification of R1–R11 in MASTER §1 — the hook ("Your cost intelligence layer"), the promise, the UVP, and the privacy stance used throughout are all `[PROPOSED]` until signed off. MASTER §1, §17 #1.
13. ⚠️ **GATED ON (open):** the claims ledger public sign-off gate — no line on this page goes public until it reconciles to the ledger in Section 7 / `09-CLAIMS-LEDGER-SIGN-OFF.md`. MASTER §7.5, §15.
14. ⚠️ **GATED ON (L-CRM-1):** waitlist/CRM destination for `ClosedBetaGate` submissions (`/contact?intent=beta-request` vs a dedicated waitlist). MASTER §9.4. See `23` §10.

**Open decisions owned here (not blocking, but flagged):**
- The exact placement of the "pre-launch MVP preview" tag (masthead-only vs. masthead + hero + footer) is a visual decision — deferred to `03`/`11`.
- Whether the `/features` route expands the ledger per-feature or mirrors it verbatim is a content-density decision — deferred to `11`/`06`.
- The `/trust` route's exact H1 ("What we will and will not claim" vs. "Trust, earned by honesty") is a voice A/B for the owner; both are within §10.

---

# Honored coherence contracts (self-check)

- **D-1 (Glass Brand):** every visual reference binds to the warm canvas + glass + Doto/Roboto
  Mono/SF Pro vocabulary. No line implies a paper-document aesthetic. "The serif IS the
  argument" framing is removed. Source Serif 4 / `--proposal-paper #fffdf8` appear only as the
  demoted/deferred Direction D context (never the default).
- **D-2 (Auth):** auth microcopy is full-page 2-column, Google OAuth + magic link, no password;
  cross-linked to `23-AUTH-EXPERIENCE.md`. `/signup` self-serve gated L-FUN-1/L-FUN-2.
- **D-3 (Orange):** brand presence = `--brand-orange #F24405`; AA small text/icons =
  `--brand-orange-dark #C63804`. Clay `#AA412A` is NOT referenced as an active token anywhere
  in this doc. Tailwind v4 gotcha (`bg-[color:var(--x)]`) noted for the implementer.
- **D-4 (ClaimStatus):** Live / Building / Planned used uniformly; "Partial" retired in favor of
  "Building"; the single shared type in `src/components/landing/shared/StatusPill.tsx` is named.
- **D-5 (Honest scoring):** the gated items are carried in `LOOP_LEDGER`, never silently closed.
- **Cross-links:** all resolve to canonical filenames per `10-CANONICAL-DOC-MAP.md`. The prior
  `07-CLAIMS-LEDER-SIGN-OFF.md` typo is corrected to `09-CLAIMS-LEDGER-SIGN-OFF.md`.
- **Rate-limiting:** Postgres (`security_rate_limit_events` table), NOT Redis. Turnstile NOT yet built
  (escalation-only). Stated on `/contact` and `/signup`.

---

# Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **96 / 100** | Every section binds to the ratified Glass Brand (D-1), the hero subhead is shortened to honor §10.2 principle 2, the radical-honesty proof engine and Controlled Confidence voice are preserved, the auth microcopy + footer hrefs + `/trust` Section E + meta forward-pointer close every named gap, and the cement-anchor stays hypothesis-labeled. Not 100 because the rendered visual result of D-1 (L-DES-1…5) and the "Start free" routing (L-FUN-1/L-FUN-2) are genuinely owner-open and cap the strategy lock; the `/trust` H1 voice A/B is owner-owned. |
| **Quality** | **95 / 100** | Every token citation is grep-verified against `globals.css` (`--brand-orange` L37, `--brand-orange-dark` L38, `--secondary` L11, `--muted-foreground` L26, `--warm-canvas` L17, `--proposal-paper` L98, `.dashboard-glass` L1229, `--grad-canvas-wash` L62, `--font-display` L203, `--radius-xs` L100). The sign-off-gate typo (`07-CLAIMS-LEDER` → `09-CLAIMS-LEDGER-SIGN-OFF`) is corrected. "Partial" is unified to "Building" (D-4). Clay `#AA412A` and the superseded `#292929` appear only in "NOT used / retired" contexts. The copy → component map and footer href table are concrete. Not 100 because the auth microcopy success/error strings are bound to `23` §2.4 (sibling-owned) rather than re-verified line-by-line in the source this pass, and the exact wording of the closed-beta-gate subhead is a starting proposal pending owner voice confirmation (L-FUN-2). |
| **Implementation-Readiness** | **92 / 100** | An implementer can take every section's copy verbatim into the named RSC leaf (`11` §3 map), the auth microcopy lands directly in the `23` component props, the `/trust` Section E placeholder is unambiguous, and the gated items are each mapped to an L-* ID. Not 100 because: (a) `/signup`, `src/components/auth/`, and `/trust` Section E do not exist yet (they are deliverables, not pre-existing surfaces); (b) "Start free" href is genuinely conditional on L-FUN-1/L-FUN-2 — the footer table encodes the fallback but the resolved href is owner-pending; (c) the meta/OG copy is forwarded (correctly) to `13` §3 rather than duplicated, so an implementer pulling only this doc needs `13` in hand. Per D-5 these open gates honestly cap readiness below 100 rather than being silently closed. |
