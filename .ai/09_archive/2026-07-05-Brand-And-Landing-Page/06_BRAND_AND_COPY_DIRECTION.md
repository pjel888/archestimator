# 06 — Brand and Copy Direction

**Source authority:** `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` v4.3 §10.2 (voice principles), §3 (cost intelligence layer), §12.10 (per-segment directed marketing), §15 (claims discipline).
**Founder sign-off required for:** true blockers only; see `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` §0.

---

## 0. 2026-07-06 copy correction

This section supersedes longer or more salesy examples below.

Use these copy rules:

- Hero subhead max 20 words.
- Primary CTA default is "Request access" until `/signup` is verified self-serve.
- Visible copy should avoid em-dash and arrow separators.
- Do not use fake metrics, fabricated proof, or "illustrative" adoption numbers.
- Preserve the above-the-fold estimate-sheet mockup.
- Keep honesty as claim discipline, not the leading conversion posture.

Corrected hero target:

```text
Where estimates become client-approved proposals.

Build estimates from reusable costs, send client-ready proposals, and keep revisions, comments, and approvals attached.
```

Corrected CTA pair:

```text
Request access
See how it works
```

Corrected promise line:

```text
From cost proposal to client approval.
```

---

## 1. The brand today (one-paragraph synthesis)

Archestimator's canonical brand is genuinely strong. The campaign tagline ("From cost proposal to client approval."), the brand promise ("You never start from zero again. Your numbers hold up."), the category hook ("Your cost intelligence layer."), and the voice canon ("Controlled Confidence" with five principles in `MASTER §10.2`: lead with the change; plain words + one idea; calm conviction; attack the workflow not the user; earn every claim) form a coherent, defensible, premium-SaaS-for-AEC identity. The competitive position (`MASTER §2`) is also defensible: enterprise estimating tools already do the "reusable intelligence" story, but they ignore the spreadsheet-bound SEA SMB and supplier segment; Archestimator is freemium, peso-denominated, extends past estimating into proposal-to-approval, and is private-by-design.

The problem is **not the brand**. The problem is that the brand **never reaches the user**. The canonical strings live in README and `MASTER` but appear nowhere visible in the actual landing copy (`03` §4.1). Worse, the public surface is currently dominated by a different voice — the founder's pre-launch "we have nothing and we're proud of it" honesty — which is honest, but which on a conversion surface reads as a legitimacy failure.

This doc defines the recast.

---

## 2. The five voice principles (`MASTER §10.2`) — kept and reanchored

The principles stay. Their **application surface** changes.

| # | Principle | Current application | Target application |
|---|---|---|---|
| 1 | **Lead with the change.** | Used as a copy-structuring rule across all surfaces. | Stays as a copy-structuring rule. The "change" we lead with is the product behavior (e.g., "Drag, drop, done. Pull components into areas, watch totals roll up live."), not the absence ("we don't have AI yet"). |
| 2 | **Plain words + one idea.** | Used across all surfaces. | Stays. No change. |
| 3 | **Calm conviction.** | Currently applied inconsistently — the hero subhead is salesy ("more time winning"), the pricing page is hedgy ("hypothesis we are validating"). | Apply uniformly. Calm conviction means confident-without-overclaiming, never salesy, never hedgy. The hero and the pricing page should read in the same register. |
| 4 | **Attack the workflow, not the user.** | Used across all surfaces. | Stays. The workflow we attack is "spreadsheets + email + PDF + lost memory", not the buyer's intelligence. |
| 5 | **Earn every claim.** | Currently the dominant principle on the public surface — the entire Claims Ledger NotUs group + the ProofSection "no fabricated customer logos" line + the /pricing "hypothesis" framing are all this principle applied to conversion surfaces. | **REANCHOR.** The principle stays as the brand's discipline. But on conversion surfaces (homepage hero, pricing page top, features page top, contact page top), the dominant principle becomes #1 (lead with the change). "Earn every claim" still governs what we say (we still don't fabricate, we still don't overclaim), but it stops being the **posture** of the conversion surface. It moves to `/trust`, `/changelog`, `/roadmap`, and the lower-funnel sections of the homepage. |

**The recast in one sentence:** Honesty stays a brand value. Leading with what we lack stops being a marketing strategy.

This is **OPEN-DEC-001** for founder sign-off.

---

## 3. Anti-beta-wording policy (the "no beta wording and all" the user asked for)

### 3.1 The principle

Marketing surfaces (the homepage, /pricing, /features, /about, /contact, the footer, all metadata) must read as a real product that ships today. The closed-beta legal posture on `/terms` and `/privacy` is correct and is **not** in scope. The two are distinct.

### 3.2 Banned on marketing surfaces (Phase 1A lint pass — `11`)

These phrases must be removed from marketing copy (file:line in `03` §3.1):

| Banned phrase | Why | Replacement pattern |
|---|---|---|
| "early product" | Reads as pre-product. | Drop entirely. State what the product does today. |
| "early-stage" | Same. | Drop. |
| "pre-launch" | Same. | Drop. (Note: the legal entity may genuinely be pre-public-launch; that's a /trust or /changelog fact, not a homepage fact.) |
| "a new company" | Anti-legitimacy in titles. | Drop from titles and leads. The /about page can say "Archestimator is built by…" without "new". |
| "we are validating" / "being validated" | Pre-price, pre-product. | State the model shape (freemium, seat-based, peso-denominated). Move the validation framing to a smaller "How we set pricing" section lower on the page. |
| "hypothesis" / "Concept · hypothesis" | Marketing surfaces should not call their own content a hypothesis. | Drop. |
| "founding-member rate" | Sounds like a lifetime-deal promotion. | Use "early-access pricing" or just "the Solo tier". |
| "founder bio and photo are coming" / "we won't invent credentials" | The single worst line on the public surface. | Replace with a real founder block (name + 1-paragraph bio + role). **OPEN-DEC-004.** |
| "we are looking for design partners" | Reads as "we have no users". | Drop. The /contact page can describe what we're looking for in a partner without leading with it. |
| "no payment or commitment" | Reads as desperation. | Drop. |
| "talk to the founder" (as page title) | Sole-proprietor framing. | "Talk to us" or "Contact Archestimator" or "Book a walkthrough". |
| "no logos, no testimonials, no inflated roadmap" | Tells buyers we have nothing. | Drop from marketing surfaces. The Claims Ledger row stays in `/features` footer and on `/trust`. |
| "No compliance badges (SOC2/GDPR/HIPAA/DPA)" | Same. | Drop from marketing surfaces. Stays on `/trust`. |
| "Not production-hardened enterprise SaaS" | Same. | Drop from marketing surfaces. Stays on `/trust`. |
| "No BIM or drawing ingestion today. English UI, no localization yet." | Same. | Drop from /about LIMITATIONS. Stays on `/trust`. |
| "AI is on the roadmap, not in the product today." (as section heading) | A whole section dedicated to what we lack. | Drop the dedicated section. The fact stays in the Claims Ledger footer abbreviation and on `/trust`. |
| "founder-led" (in metadata) | Sole-proprietor framing. | Drop from metadata. The fact can stay in the /about body. |
| lowercase "archestimator" | Inconsistent. | Always "Archestimator". |
| "spend less time working and more time winning" | Sales-register. | Use calm-conviction register. |
| "Pricing, honestly" (page title) | Reads as "we're about to be honest about not knowing". | Use "Pricing" or "Pricing - freemium, seat-based, peso-denominated". |

### 3.3 Allowed on marketing surfaces (with discipline)

| Phrase | When allowed |
|---|---|
| "Live" / "Building" / "Planned" / "On the roadmap" | Allowed in the Claims Ledger context, with Live leading and Planned short. Not as section headings on the homepage. |
| "closed beta" | **Banned on marketing surfaces.** Allowed on legal/access surfaces (`/terms`, `/privacy`, `/access-required`, the `/signup` gate, `/workshop/feedback`). |
| "design partners" | Allowed in the /contact body if framed as "we work with a small number of teams directly" — not as the page's lead. |
| "founder" | Allowed when referring to a specific person once the bio exists. Banned in title tags and meta descriptions. |

### 3.4 Required on marketing surfaces (the new voice)

| Surface | Required element |
|---|---|
| Homepage hero | Campaign tagline OR brand promise surfaced somewhere visible (subhead, eyebrow, or below-CTA line). |
| Homepage proof section | Real product screenshots (4 minimum). The Cloudflare/Better Auth/R10 line. |
| Homepage final CTA | The cement-anchor value framing OR the brand promise. |
| /pricing page top | Model shape: "Freemium. Seat-based. Peso-denominated. Never metered on estimating, exports, or BOQ lines." |
| /features page top | "What ships today" framing with Live capabilities leading. |
| /about page top | Founder-led framing ("Built by someone who has lived the gap"). |
| /contact page top | Dual CTA: "Request access" + "Book a walkthrough". Drop "design partners" + "no payment or commitment". |
| Footer | Company info line + compliance line + campaign tagline. |

### 3.5 Implementation discipline

- **Phase 1A lint pass** (`11`): a single-pass removal of every banned phrase in §3.2, with the replacements in §3.2 applied. This is the smallest correct change. No structural redesign, no new sections, no screenshot capture. Just copy replacement.
- **Phase 1A lint rule** (`12`): a new check (either in `scripts/claims-matrix-check.mjs` or a sibling script) that greps the marketing-surface scope for the banned phrases and fails CI if any are introduced.
- **Phase 2A onward** (`11`): structural recasts — hero rewrite, section reorder, screenshot capture, etc. — build on top of the lint-clean Phase 1A baseline.

---

## 4. The voice recasts (per-surface)

This table is the authoritative copy direction. Actual ready-to-paste strings live in `19_COPY_DEPLOYABLE_PACK.md`.

### 4.1 Homepage hero

| Element | Current | Target |
|---|---|---|
| Eyebrow | "AEC construction cost estimating & proposal platform" | "AEC construction cost estimating & proposal platform" (preserved) |
| H1 | "Where estimates become client‑approved proposals." | "Where estimates become client‑approved proposals." (preserved) — **OR** alternative: "Your cost intelligence layer." (the canonical hook from `MASTER §0`). **OPEN-DEC-001a.** |
| Subhead | "Stop losing time to spreadsheets and revisions. archestimator turns estimating and proposals into one workflow so you spend less time working and more time winning." | "Build estimates from reusable costs, send client-ready proposals, and keep revisions, comments, and approvals attached." |
| Primary CTA | "Book a walkthrough" -> `/contact?intent=walkthrough` | "Request access" -> `/contact?intent=access` until `/signup` is verified self-serve. |
| Secondary CTA | "Explore the workflow" -> `#workflow` | "See how it works" -> `#workflow` |
| Below-CTA line | (none) | Campaign promise surfaced: "From cost proposal to client approval." |
| Hero metric card fake counters | "Areas Priced: 248", "Proposals Submitted: 67", "Bids Won: 19" | Drop the counters entirely. Replace with a static "01 / 02 / 03" ordinal + the behavior preview (which is already there). The behavior previews are the real proof; the counters are fake. |
| Video walkthrough placeholder | "Video walkthrough" play button + label, no actual video | Either (a) capture a 30-second screen recording of the estimate tree + drag-drop + publication, or (b) remove the placeholder entirely. **OPEN-DEC-006** (founder preference on demo video). |

### 4.2 AudienceBanner

| Element | Current | Target |
|---|---|---|
| Banner | "Cost Estimators · Architects · Engineers · Project Managers · Construction Managers · Construction Professionals" | **Remove the banner entirely.** The audience is communicated in the Specialties section (which Phase 2C expands to 7 roles). |

### 4.3 AudienceBand

| Element | Current | Target |
|---|---|---|
| Kicker | "Built for teams pricing real work" | "Built for the people who own the number on a cost estimate" |
| Heading | "A commercial workspace for the people who own the number." | "From the first line item to the final approval." |
| Body | "The old workflow diagram said the right thing: Archestimator is not just an estimating screen. It is the path from project structure and reusable knowledge to proposal review, revision, decision, and history." | "Archestimator is not just an estimating screen. It's the path from project structure and reusable cost knowledge to proposal review, revision, decision, and the recorded history behind every number." |
| Input nodes | "Project workflow", "Component library", "Estimating experience" (generic) | Concrete product anchors: "Project structure (phases, locations, trades)", "Reusable cost library", "Your historical rates and supplier context" |
| Record nodes | "Estimate", "Proposal", "Review", "Decision" (generic) | Same names, but each links to the actual product surface or the relevant `/features` row |
| History rail | "Every comment, change, version, and decision remains attached." | "Every comment, change, version, and decision remains attached — searchable, attributable, recoverable." |
| Audience list | 4 audiences (GC, Specialty, Design-build, Commercial interiors) | **Replaced by Phase 2C expanded specialties (7 AEC roles).** |

### 4.4 ProblemSection

| Element | Current | Target |
|---|---|---|
| Heading | "Spreadsheets calculate. They do not remember." | Preserved. |
| Body | "Most estimates stop being useful the moment they become a PDF. Rates lose their source. Assumptions disappear. Feedback moves to email. Revisions overwrite the reason the number changed. The next project starts from another copied sheet." | Expand to 3 paragraphs: (1) preserve current paragraph; (2) add concrete AEC example: "The unit cost you worked out for the two-storey residential in Quezon City last March — the supplier quote behind it, the assumption that drove it, the client conversation that confirmed it — gone, the moment the file closes."; (3) "Archestimator keeps the commercial story attached to every line." |
| Closer | "Archestimator keeps the commercial story connected." | Replace with the canonical hook: "Your cost intelligence layer." |
| Fragment pills | "Copied rate", "Unnamed attachment", "Email revision", "Overwritten version" | Preserved. Strong visual hook. |

### 4.5 WorkflowStory

| Element | Current | Target |
|---|---|---|
| Section header | "From first cost to final decision, nothing loses context." | Preserved (matches campaign tagline register). |
| 4 steps | Structure / Reuse / Propose / Decide | Preserved. |
| Step state descriptions | Abstract ("Project structure expands around phases, locations, trades, packages, and scoped alternates.") | Concrete + a real screenshot from the product |
| ProductStage placeholder | Abstract visual | Real screenshot of the estimate tree at step 1, library dock at step 2, publication viewer at step 3, Activity panel at step 4 |

### 4.6 FeatureChapters (3 chapters + new 4th)

| Chapter | Current | Target |
|---|---|---|
| 1: Reusable cost intelligence | Copy OK, abstract icon, no screenshot | Real screenshot of the Library dock + component cards. Copy tightened. |
| 2: Proposal handoff | Copy OK, abstract icon, no screenshot | Real screenshot of the publication viewer (anonymous, password-protected share link). |
| 3: Revision and activity history | Copy OK, abstract icon, no screenshot | Real screenshot of the Activity panel showing a comment thread + revision diff + recorded decision. |
| **NEW 4: Private by design** | Doesn't exist | New chapter. The R10 competitive wedge (`MASTER §1`, `MASTER §2`). Copy: "Your data is yours, never pooled or anonymized across customers. Built on Cloudflare Workers, D1, R2, and Better Auth." Visual: a simple architecture diagram or a screenshot of the closed-beta Terms clickwrap (the proof that data discipline is enforced). |

### 4.7 ComparisonSection

| Element | Current | Target |
|---|---|---|
| Heading | "A commercial record, not another file." | Preserved. |
| 5 rows | Abstract pairs ("Rates are copied." vs "Costs keep their source.") | Each "Archestimator" column row links to the actual feature in `/features` or in the product. Make the "Archestimator" column visually heavier (it's the answer). |

### 4.8 SpecialtiesSection (Phase 2C expansion)

Currently 3. Target 7 (matches README + `MASTER §6.2`):

| Specialty | Pain | Directed message |
|---|---|---|
| Architects | Scope by area, phase, package, finish option. | "Build estimate trees that mirror your design intent. Keep finish options, exclusions, and client decisions attached from first concept to final approval." |
| Engineers | Discipline-specific assemblies (structural, MEP, sanitary). | "Build reusable assemblies per discipline. Variant costing, supplier context, and labor logic move with the assembly." |
| General contractors | Phases, locations, trades, bid packages, allowances. | "Organize costs across phases, locations, trades, bid packages, and allowances. Preserve the assumptions behind the total." |
| Specialty / fit-out contractors | Reusable assemblies + supplier variants + labor logic. | "Build reusable assemblies, variants, supplier references, labor logic, and scope packages that move into future estimates." |
| Cost estimators / QS | BOQ structure, unit-rate discipline, source notes. | "Structure BOQ-grade estimates with unit-rate discipline. Every rate keeps its source note, every quantity keeps its assumption." |
| Interior designers | Rooms, finishes, options, client decisions. | "Keep rooms, finishes, options, exclusions, and client decisions connected from the first estimate through final approval." |
| Project managers | Approved proposals, change orders, decision trail. | "Walk into every pricing conversation with the full record: what was proposed, what changed, what was approved, when, and by whom." |

### 4.9 ProofSection (complete rebuild)

| Element | Current | Target |
|---|---|---|
| Kicker | "Product proof" | "What ships today" |
| Title | "Proof lives in the record itself." | "Built for the work you actually do." |
| Body | "No fabricated customer logos, no invented metrics. The visible proof is what the product keeps attached to the estimate." | "Archestimator ships today. Here's what that looks like." |
| Content | 5 text bullets, no visual | 4 real screenshots (estimate tree, library dock, Activity panel, publication viewer). Each labeled with what it proves. Plus the line: "Private by design. Built on Cloudflare Workers, D1, R2, and Better Auth. Your data is yours, never pooled or anonymized across customers." |
| Company proof | (none) | Two-tier: (a) gated by `getRenderableCompanyProofItems` (already in `company-proof-data.ts`). Until real customer proof exists, the line above stands alone. |

### 4.10 FaqSection (replace 5 softballs)

| Q | A (summary) |
|---|---|
| How is this different from Excel? | "Excel calculates. It doesn't remember. Archestimator keeps your rates, suppliers, assumptions, revisions, and approvals attached to the work — across projects, across clients, across time." |
| How is this different from Procore / DESTINI / what I already use? | "Enterprise estimating tools already do parts of this. They're built for US enterprise GCs, priced for enterprise, and stop at estimating. Archestimator is built for the spreadsheet-bound SEA team, is freemium + peso-denominated, and extends past estimating into proposal-to-approval." |
| Can I bring my existing cost library? | "Yes. Import via Excel template or build it natively. Each component carries its supplier, brand, variant, price history, and source note." |
| Who owns my data? | "You do. Your data is never pooled or anonymized across customers. Export your library and estimates anytime." |
| What happens when I cancel? | "Your library and your estimates are yours to export. Cancel anytime; your data stays yours throughout and after." |

### 4.11 FinalCta

| Element | Current | Target |
|---|---|---|
| H2 | "Your next estimate should make the one after it easier." | "Start your next estimate from the ones you've already done." (brand promise surfaced) |
| Body | "See how Archestimator connects cost knowledge, proposal review, revisions, and decisions in one commercial workflow." | "From cost proposal to client approval." (campaign tagline surfaced) + "Free forever for the Solo tier. Priced in pesos." (cement anchor) |
| Primary CTA | "Book a walkthrough" | "Request access" -> `/contact?intent=access` until self-serve signup is verified. |
| Secondary CTA | "Sign in" / "Open workspace" | "Book a walkthrough" -> `/contact?intent=walkthrough` (move the founder-led CTA to secondary). |

### 4.12 Footer

| Element | Current | Target |
|---|---|---|
| Logo | Preserved | Preserved |
| Link list | 9 links | Add `/trust`, `/changelog` (if exists), `/roadmap` (if exists) |
| Copyright | "© 2026 Archestimator. Estimates, proposals, revisions, and approvals connected." | "© 2026 Archestimator. From cost proposal to client approval." |
| Company info line | (none) | "Built in the Philippines. Built on Cloudflare." |
| Compliance line | (none) | "Private by design. Your data is yours, never pooled or anonymized across customers." |
| Value anchor | (none) | "Free forever for the Solo tier. Priced in pesos." |

### 4.13 /pricing page

| Element | Current | Target |
|---|---|---|
| Meta title | "Pricing, honestly" | "Pricing - freemium, seat-based, peso-denominated" |
| Meta description | "...Pricing numbers are being validated and will be published once they are." | "Freemium, seat-based, peso-denominated. Never metered on estimating, exports, or BOQ lines. A permanent free tier so your library can accumulate." |
| Hero heading | "Simple enough to actually adopt. Honest about what it costs and why." | "Pricing built for the team that estimates every day." |
| Hero lead | "Pricing numbers are a hypothesis we are validating, not a locked price. Read the philosophy below — the numbers come once validation closes." | "Freemium. Seat-based. Priced in pesos. Never metered on estimating, exports, or BOQ lines. The full Solo tier is free forever so your library can accumulate." |
| Cement anchor eyebrow | "Concept · hypothesis" | "The value anchor" |
| Cement anchor heading | "A tool that compounds on every estimate should cost less than a material you pour once." | Preserved. Strong line. |
| Cement anchor status pill | "Hypothesis · pending discovery + Van Westendorp validation." | Drop the pill entirely. The cement anchor is a metaphor, not a research instrument. |
| Tier shape eyebrow | "Tier shape · no numbers" | "The intended tier shape" |
| Tier shape lead | "Plus an Education tier and a future Owner/Portfolio tier for the client side. Names only; numbers are pending validation." | "Free, Solo, Pro, Team, plus an Education tier and a future Owner/Portfolio tier for the client side. Numbers come when discovery closes." |
| How we are validating section | Current copy with "Hypothesis" framing | Move to a smaller section lower on the page. Reframe as "How we set the price" (not "How we are validating the price"). |

### 4.14 /features page

| Element | Current | Target |
|---|---|---|
| Meta title | "Features - every feature, with its status" | "Features - what ships today" |
| Meta description | "...each tagged Live, Building, or Planned, so you know exactly what ships today and what is on the roadmap." | "The estimate workspace, the reusable library, the revision record, and the proposal handoff. Each tagged Live, Building, or Planned." |
| Hero heading | "Every feature, with its status." | "What Archestimator does today." |
| Hero lead | "The estimate workspace, the reusable library, the revision record, and the proposal handoff — each one tagged Live, Building, or Planned, so you know exactly what ships today and what is on the roadmap." | "The estimate workspace, the reusable library, the revision record, and the proposal handoff. Each tagged Live, Building, or Planned. The Live list leads; the boundary lines are stated plainly in the footer." |
| Ledger section header | "The honest feature list." | "What ships today." |
| Ledger section lead | "No logos, no testimonials, no inflated roadmap. Every capability carries a status, and the boundary lines state plainly what Archestimator is not." | "Every capability carries a status. Live leads. Building is honest. Planned is selected roadmap items. The boundary lines (what Archestimator is not) are in the footer." |
| Ledger rendering | Equal weight across 4 groups | Live dominant. Building 2 rows. Planned 3-4 selected. NotUs collapsed footer-style. |
| AI section | Section heading "AI is on the roadmap, not in the product today." with body copy | Drop the dedicated section. The AI fact stays in the Claims Ledger NotUs footer and on `/trust`. |
| Final CTA | Preserved | Preserved |

### 4.15 /about page

| Element | Current | Target |
|---|---|---|
| Meta title | "About - a new company, building for teams who live in spreadsheets" | "About - the cost intelligence layer for AEC teams" |
| Meta description | "Archestimator started with a simple frustration..." (preserved) | Preserved. Strong. |
| Hero heading | "A new company, building for teams who live in spreadsheets." | "Built for teams who live in spreadsheets." (drop "a new company") |
| Hero lead | "Name the world as it is. Declare who we are. Show who you become with us." | Preserved. |
| Intro paragraph 4 | "This is a new company and an early product. We would rather tell you exactly what it does today and where it is going than oversell it. That honesty is part of how we work." | "Archestimator is built by someone who has lived the gap — the design and cost side, and the software side. The product ships today; the roadmap is published; the boundary lines are stated plainly. That honesty is part of how we work." (drop "new company" + "early product") |
| Founder slot | Empty orange gradient box + "Founder bio and photo are coming. We won't invent credentials." | Real founder block: name, role, one-paragraph bio, optional photo. **OPEN-DEC-004.** Until the bio is supplied, replace the empty box with the line "Archestimator exists because the founder has felt the workflow from both sides — the design and cost side, and the software side." (already in the current copy) + remove the "bio coming" caption entirely. |
| Limitations section | 6 rows | 3 rows on /about (the most important: "A focused tool for working estimators, not enterprise SaaS.", "AI is on the roadmap, not in the product today.", "Exports are working documents, not immutable issued records.") + "See the full boundary list on `/trust`." |

### 4.16 /contact page

| Element | Current | Target |
|---|---|---|
| Meta title | "Contact - talk to the founder" | "Contact Archestimator" |
| Meta description | "Archestimator is founder-led. Book a walkthrough around your own workflow, or send a note. We are looking for design partners who create estimates, quotes, or proposals today, with no payment or commitment." | "Book a walkthrough around your own workflow, send a note, or start free. We work with a small number of teams directly — architects, engineers, contractors, estimators, and interior designers." |
| Hero heading | "Talk to the founder." | "Talk to us." |
| Hero lead | Same as meta description | Same recast as meta description. |
| Design partners section eyebrow | "What we are looking for" | "What we look for in a partner" |
| Design partners section heading | "A few design partners who estimate, quote, or propose today." | "Teams who estimate, quote, or propose today." (drop "design partners" from the lead) |
| Drop entirely | "no payment or commitment" | Drop. |
| Add | (none) | Dual CTA: "Request access" -> `/contact?intent=access` + "Book a walkthrough" -> Calendly or `/contact?intent=walkthrough` |

---

## 5. The brand register — do's and don'ts

### 5.1 Do

- Lead with the change (product behavior, not absence).
- Plain words. One idea per sentence.
- Calm conviction. Confident without overclaiming.
- Attack the workflow (spreadsheets, email, lost memory), not the user.
- Earn every claim — but earn it on the right surface. Honesty anchors live on `/trust`, `/changelog`, `/roadmap`, and the lower sections of the homepage. Conversion surfaces sell what ships today.
- Use the canonical strings (`MASTER §0`): "From cost proposal to client approval.", "You never start from zero again. Your numbers hold up.", "Your cost intelligence layer."
- Use specific AEC vocabulary: BOQ, DUPA, unit cost, source note, assembly, variant, supplier, scope, phase, location, finish option, change order, sign-off.
- Surface the campaign tagline on the final CTA.
- Surface the brand promise on the hero or proof section.
- Surface the cement-anchor value framing on the homepage final CTA.

### 5.2 Don't

- Don't use "early product", "early-stage", "pre-launch", "new company", "we are validating", "hypothesis", "founding-member rate", "we are looking for design partners", "no payment or commitment", "no logos, no testimonials", "No compliance badges", "Not production-hardened enterprise SaaS", "AI is on the roadmap, not in the product today" (as a section heading), "founder-led" (in metadata), lowercase "archestimator", "spend less time working and more time winning", "Pricing, honestly".
- Don't lead with what we lack.
- Don't fabricate customer logos, testimonials, adoption metrics, partner names, or compliance badges.
- Don't claim roadmap items are shipped.
- Don't mix registers — the hero, the pricing page, the contact page should all read in the same calm-conviction voice.
- Don't use sales-register ("winning", "unleash", "supercharge", "10x").
- Don't use buzzwords ("revolutionary", "game-changing", "next-generation").
- Don't apologize for being a real product.

---

## 6. Voice examples (calibration)

### 6.1 Bad → Good (one-line calibration)

| Bad | Good |
|---|---|
| "Stop losing time to spreadsheets and revisions." | "Archestimator turns estimating and proposals into one connected workflow." |
| "Pricing numbers are a hypothesis we are validating." | "Freemium. Seat-based. Priced in pesos. Never metered on the work." |
| "Founder bio and photo are coming. We won't invent credentials." | "Archestimator is built by [name]. [One-paragraph bio.]" |
| "No fabricated customer logos, no invented metrics." | "Built on Cloudflare Workers, D1, R2, and Better Auth. Private by design." |
| "We are looking for design partners... no payment or commitment." | "Request access, or book a walkthrough around your own workflow." |
| "archestimator turns estimating..." | "Archestimator turns estimating..." |
| "spend less time working and more time winning" | "build, send, revise, and approve in one workflow" |

### 6.2 The calibration paragraph

A serious AEC buyer (an architect in Manila, a QS in Cebu, a GC project manager in Davao) lands on the page. They have 30 seconds. They have been burned by SaaS hype before. They have spreadsheet fatigue. They want to know: does this exist? does it do what I do? is it built for me? will my data be safe? can I try it?

The page must answer those five questions in the first scroll. Anything else is a distraction.

---

## 7. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §3 Anti-beta-wording policy | `04_REQUIREMENTS_SPECIFICATION.md` REQ-LINT-* + `11_IMPLEMENTATION_PLAN.md` Phase 1A + `12_TEST_AND_VALIDATION_STRATEGY.md` lint rule |
| §4 Voice recasts | `07_LANDING_PAGE_SECTIONS.md` per-section copy + `19_COPY_DEPLOYABLE_PACK.md` ready-to-paste strings + `11` Phase 1A/2A/3A-3D |
| §5 Do's and Don'ts | `12` §3 adversarial QA + `14_RISK_REGISTER.md` voice-drift risk |
| §6 Calibration | `19_COPY_DEPLOYABLE_PACK.md` |
