# 03 — Source and Codebase Audit

**Audit date:** 2026-07-05 (Asia/Manila)
**Audit mode:** `emulated` (lead author; no independent verifier available)
**Audit scope:** Every public-surface file under `src/app/{/,pricing,features,about,contact,trust}/page.tsx` + `src/components/landing-v3/**` + `src/components/landing/**` + landing-shared lib.
**Out of audit scope:** `/workshop/**` (authenticated app), `/share/[token]` (publication viewer), `/api/**`, legal pages (`/terms`, `/privacy`) where "closed beta" is the **correct legal posture**, not a marketing-wording problem.

> **Important distinction:** "Closed beta" terminology on **legal/access surfaces** (`/terms`, `/privacy`, `/access-required`, `/signup` gate via `ClosedBetaGate`, `/workshop/feedback` via `BetaFeedbackForm`) is the **accurate legal posture** for an invite-only MVP and is NOT in scope for the "no beta wording" recast. The user's "no beta wording" applies to **marketing surfaces** — the homepage, /pricing, /features, /about, /contact — where "early product / hypothesis / we have no customers" framing actively damages conversion. The audit below is scoped accordingly.

---

## 1. Section-by-section landing audit (the "good and bad" the user asked for)

### 1.1 `src/app/page.tsx` (landing route entrypoint) — **GOOD**

```tsx
// 26 lines total
export const metadata: Metadata = buildLandingMetadata({
  title: "Archestimator — Construction estimating, proposals and approvals",
  description: "Build structured estimates from reusable cost knowledge, send client-ready proposals, capture revisions, and keep approvals on record in one connected workspace.",
  path: "/",
});
export const dynamic = "force-static";
```

**Good:**
- Title and description are confident and concrete.
- `force-static` is correct for a CDN-cached landing page.
- A/B experiment provider wired (`hero-cta-copy`, variant A) — instrumentation is already in place.
- Delegates cleanly to `ArchestimatorLandingPage` (the landing-v3 implementation).

**Bad:** Nothing material. This file is fine.

---

### 1.2 Hero (`Hero` in `ArchestimatorLandingPage.tsx:243-392`) — **GOOD (the user said so)**

**Good:**
- Editorial split hero: eyebrow + h1 + intro + dual CTA + product mockup + image + 3 metric cards.
- The 3 metric cards (`HeroMetricCard` at `:180-241`) preview **real product behaviors** (drag-and-drop, branded client links, sign-off recording) instead of just shouting adjectives.
- Metric card tooltips are a strong UX pattern — they let serious buyers drill into a feature preview without leaving the hero.
- `HeroMountMotion` + `HeroImageZoom` are restrained, performant, reduced-motion-safe (per `DESIGN.md` motion rules).
- Hero image (`/landing/archestimator-mountain-hero-photo.png`) is on-brand (architectural, editorial, not stocky).

**Bad (small):**
- Hero subhead (`:251-254`) mixes the "spreadsheets and revisions" cliché with informal lowercase brand name + salesy closer:
  > "Stop losing time to spreadsheets and revisions. archestimator turns estimating and proposals into one workflow so you spend less time working and more time winning."

  Three issues:
  1. "Stop losing time to spreadsheets and revisions" is a Generic SaaS cliché.
  2. "archestimator" is lowercase — every other brand touchpoint uses "Archestimator". Inconsistent.
  3. "less time working and more time winning" is sales-register, not the calm "Controlled Confidence" voice in `MASTER §10.2`.
- Primary hero CTA is "Book a walkthrough" → `/contact?intent=walkthrough`. This is **founder-led design-partner framing**, not legitimate-app framing. A serious AEC buyer landing on the homepage sees "Book a walkthrough" and reads "this is a service business, not a product". Real SaaS has "Start free" or "Try the product" as the primary CTA.
- Hero metric cards show fake counters: "Areas Priced: 248", "Proposals Submitted: 67", "Bids Won: 19" (animated, ticking up). These are **demo placeholders**, not real customer metrics. They are defensible as "illustrative" but a sharp buyer will notice they're fake. Worse, `MASTER §12.8` explicitly bans fabricated adoption metrics — these counters live in a gray zone.
- Below the hero (`:386-389`), a "Video walkthrough" placeholder block. Just a label and play mark, no actual video, no transcript, no thumbnail. Reads as "we plan to make a video" — beta-posture.

**Verdict:** Hero architecture is strong. Subhead copy, CTA copy, and the fake counters need reframe. Video placeholder needs either a real video or removal.

---

### 1.3 AudienceBanner (`:150-156`) — **BAD**

```tsx
<span>Cost Estimators · Architects · Engineers · Project Managers · Construction Managers · Construction Professionals</span>
```

**Bad:**
- A flat role strip below the hero. Reads as a 1990s "we serve everyone" banner.
- "Construction Professionals" is a nothing phrase.
- Takes a full viewport-width band for content that should be either (a) integrated into the hero copy or (b) replaced with a real-customer logo band once real logos exist.
- According to `MASTER §12.8`, no real customer logos exist. So this is the founder filling space with role names.

**Verdict:** Remove. If a "who uses us" cue is wanted in this slot, replace with the 3-vertical AEC role band (Architects / Engineers / Builders) and only once the specialties section has been expanded.

---

### 1.4 AudienceBand (`:394-434`) — **MIXED**

**Good:**
- Heading ("A commercial workspace for the people who own the number.") has voice.
- Input → Record → History flow diagram is structurally sound.

**Bad:**
- "the people who own the number" is abstract. AEC buyers don't say "I own the number". They say "I do the estimate", "I send the quote", "I write the BOQ".
- The 3 input nodes ("Project workflow", "Component library", "Estimating experience") and 4 record nodes ("Estimate", "Proposal", "Review", "Decision") are generic boxes — no concrete product anchor.
- The "Activity history" rail is one sentence.
- The audience list at the end (`proofAudiences` in `landing-content.ts:13-18`): General contractors, Specialty contractors, Design-build teams, Commercial interiors. **Only 4 audiences** — but the README lists 7+ AEC roles. The page is underselling the audience.

**Verdict:** Restructure. Either (a) cut this section and fold the input→record flow into the workflow section, or (b) keep it but with concrete copy tied to real product surfaces.

---

### 1.5 ProblemSection (`:436-457`) — **GOOD (mostly)**

**Good:**
- Headline "Spreadsheets calculate. They do not remember." is genuinely strong — precise, calm, memorable.
- Body copy is short and correct: "Rates lose their source. Assumptions disappear. Feedback moves to email. Revisions overwrite the reason the number changed. The next project starts from another copied sheet."
- 4 fragment pills ("Copied rate", "Unnamed attachment", "Email revision", "Overwritten version") are visual hooks.

**Bad:**
- The body is one paragraph. It needs to be 2-3 paragraphs with at least one concrete AEC example (e.g., "the rate you figured out for the 2-storey residential in Quezon City last March — gone, the moment you closed the file").
- "Archestimator keeps the commercial story connected." (the closer) is generic.

**Verdict:** Keep the headline. Expand the body. Add a concrete example. Cut the abstract closing line.

---

### 1.6 WorkflowStory (`:459-490`) — **MIXED**

**Good:**
- 4 steps in the right order: Structure → Reuse → Propose → Decide. Matches `MASTER §3` "from first cost to final decision".
- Each step has a number, title, body, and state description.

**Bad:**
- Step state descriptions are abstract ("Project structure expands around phases, locations, trades, packages, and scoped alternates."). No screenshot. No short clip. No proof.
- The `ProductStage mode="workflow"` placeholder (`:472`) is an abstract visual. It needs to be a real screenshot of the estimate tree.
- Step copy lives in `landing-content.ts:20-53` and is fine but generic.

**Verdict:** Keep the 4 steps. Replace the abstract `ProductStage` with a real screenshot or short video clip of each step in the actual product.

---

### 1.7 FeatureChapters (`:492-516`) — **BAD (worst section after Proof)**

**Good:**
- 3 chapters in the right thematic order: Reusable cost intelligence → Proposal handoff → Revision and activity history.

**Bad:**
- Each chapter has copy + an **abstract icon** + a `ProductStage` placeholder. **No real product screenshot**.
- The callout blockquotes are abstract: "The value is not simply saving a rate. It is remembering why the rate was trusted." (good line, but it's a wall of text with no visual anchor).
- The chapter visual area is mostly empty space + a Phosphor icon + abstract shape. Reads as "we haven't built the screenshots yet".
- Missing a 4th chapter: **Privacy by design** (R10 in `MASTER §1`). This is one of the four defensible competitive wedges per `MASTER §2`, and it gets zero feature-chapter real estate.

**Verdict:** Rebuild. Each chapter gets a real screenshot from the actual product (estimate tree, library dock, Activity panel, publication viewer). Add a 4th chapter on privacy.

---

### 1.8 ComparisonSection (`:518-541`) — **MIXED**

**Good:**
- 5 paired rows are the right cadence.
- "A commercial record, not another file." is a strong section title.

**Bad:**
- All 5 rows are abstract, e.g., "Rates are copied." vs "Costs keep their source." — no concrete product feature named.
- None of the rows link to the actual feature in the product or in the docs.
- No visual hierarchy difference between the two columns other than left/right position.

**Verdict:** Make each "Archestimator" row link to the actual feature in `/features` or in the product. Make the comparison column visually heavier (it's the "after" state — it should feel like the answer).

---

### 1.9 SpecialtiesSection (`:543-568`) — **BAD (underselling)**

Currently 3 specialties (`landing-content.ts:87-109`):
1. General contractors
2. Specialty contractors
3. Commercial interiors and design-build

**Bad:**
- README and `MASTER §6.2` list **7+ AEC roles**: architects, engineers, contractors (general + specialty/fit-out), cost estimators / QS, interior designers, project managers, suppliers.
- The current 3 specialties are a subset. The page is underselling the audience.
- Missing: architects, engineers, QS/cost estimators, interior designers, project managers.

**Verdict:** Expand to 7 specialties matching `MASTER §6.2`. Each gets a one-line pain + a one-line directed message + a real screenshot of the product configured for that role.

---

### 1.10 ProofSection (`:570-589`) — **BAD (single worst conversion-surface copy on the page)**

```tsx
<SectionHeader
  id="proof-title"
  kicker="Product proof"
  title="Proof lives in the record itself."
  body="No fabricated customer logos, no invented metrics. The visible proof is what the product keeps attached to the estimate."
/>
```

**Bad (severe):**
- "No fabricated customer logos, no invented metrics." is the **single worst line on the entire public surface**. It is honest. It is also telling prospects "we have no proof to show you", which a serious B2B buyer reads as "this is not a real product".
- This is the founder's voice (`MASTER §10.2` "earn every claim") applied to the wrong surface. Honesty anchors belong on `/trust` and `/changelog`, not on the homepage proof section.
- The section has 5 bullets (`productProof` in `landing-content.ts:111-117`) but no visual, no screenshot, no link.

**Verdict:** Complete rebuild. Two-tier proof:
1. **Product proof** — 4 real screenshots from the actual product: the estimate tree, the library dock, the Activity panel, the publication viewer. Each labeled with what it proves.
2. **Company proof** — only when real (gated by `getRenderableCompanyProofItems` already in `company-proof-data.ts`). Until then, the line: "Private by design. Built on Cloudflare Workers, D1, R2, and Better Auth. Your data is yours, never pooled or anonymized across customers."

---

### 1.11 FaqSection (`:591-616`) — **MIXED**

Currently 5 Q&As (`landing-content.ts:119-145`):
1. Who is Archestimator designed for?
2. How can an estimate be structured?
3. What costs or components can be saved and reused?
4. Can Archestimator produce a client-ready proposal?
5. How are comments, revisions, and approvals recorded?

**Bad:**
- All 5 are **product-feature Qs**, not **buyer-journey Qs**. A serious B2B buyer lands on the homepage and asks: "How is this different from Excel?", "How is this different from Procore / DESTINI / what I already use?", "Can I bring my existing cost library?", "Who owns my data?", "What happens when I cancel?". None of those are in the current FAQ.
- The current 5 Qs read as softballs the founder wrote for himself.

**Verdict:** Replace with 5 buyer-journey Q&As that map to actual buyer objections. Use `MASTER §2` (competitive reality) + `MASTER §4.4` (privacy stance) as the source.

---

### 1.12 FinalCta (`:618-632`) — **MIXED**

**Good:**
- Logo + h2 + body + dual CTA is the right shape.

**Bad:**
- Headline "Your next estimate should make the one after it easier." has voice but no incentive, no urgency, no value anchor.
- No pricing hint, no trial length, no "free forever" cue.
- Body "See how Archestimator connects cost knowledge, proposal review, revisions, and decisions in one commercial workflow." is a feature list, not a closing argument.

**Verdict:** Reframe. Use the campaign tagline ("From cost proposal to client approval."), the brand promise ("You never start from zero again."), and the cement-anchor value anchor from the pricing page.

---

### 1.13 LandingFooter (`:634-661`) — **MIXED**

**Good:**
- 9-link footer with the right nav shape.

**Bad:**
- Copyright line is generic: "© 2026 Archestimator. Estimates, proposals, revisions, and approvals connected." — fine but boring.
- No company info line (legal entity, address, "Built in the Philippines").
- No compliance disclosure line (Better Auth, Cloudflare, R10 privacy stance).
- No social proof (because none exists), but no value-anchor either.
- Footer is dense link list — no breathing room, no brand presence.

**Verdict:** Rebuild. Add company info line + compliance line + value anchor.

---

## 2. Section altitude graph (where the page loses altitude)

```
HIGH  ┌─ Hero ─────────────────────────────────────────────┐ ✅ strong
      │  (editorial split + metric cards + product mockup)  │
      └─────────────────────────────────────────────────────┘
       │
MED    ┌─ AudienceBanner ──┐ ❌ flat role strip
       └───────────────────┘
       │
MED    ┌─ AudienceBand ────┐ ⚠️ abstract
       └───────────────────┘
       │
HIGH   ┌─ ProblemSection ──┐ ✅ strong headline
       └───────────────────┘
       │
MED    ┌─ WorkflowStory ───┐ ⚠️ generic, no screenshot
       └───────────────────┘
       │
LOW    ┌─ FeatureChapters ─┐ ❌ abstract icons, no screenshot
       └───────────────────┘
       │
LOW    ┌─ Comparison ──────┐ ⚠️ abstract pairs
       └───────────────────┘
       │
LOW    ┌─ Specialties ─────┐ ❌ only 3 of 7 AEC roles
       └───────────────────┘
       │
BOTTOM ┌─ Proof ───────────┐ ❌❌ "no fabricated customer logos" — worst
       └───────────────────┘
       │
LOW    ┌─ FAQ ─────────────┐ ⚠️ softballs, no buyer-journey Qs
       └───────────────────┘
       │
MED    ┌─ FinalCta ────────┐ ⚠️ no incentive, no anchor
       └───────────────────┘
       │
MED    ┌─ Footer ──────────┐ ⚠️ dense, no company info
       └───────────────────┘
```

The hero earns attention. The page then steadily loses it. The Proof section is the floor.

---

## 3. Beta-wording and legitimacy-undermining language inventory (the "no beta wording and all" the user asked for)

**Method:** `rg -n -i` across the marketing-surface scope (`src/app/{/,pricing,features,about,contact}/page.tsx`, `src/components/landing-v3/**`, `src/components/landing/{sections,claims-ledger,shared,company-proof-data}/**`) for: beta, hypothes*, validat*, explorator, coming soon, early-stage, early access, pre-launch, founder, founding member, design partner, we are looking, we won't invent, no logos, no compliance, not yet, on the roadmap.

**Scope exclusion:** Legal pages (`/terms`, `/privacy`) and access-control surfaces (`/access-required`, `/signup` gate, `/workshop/feedback`) correctly retain "closed beta" terminology because closed-beta is the **accurate legal posture** for an invite-only MVP. The user's "no beta wording" applies to **marketing surfaces** where it undermines conversion.

### 3.1 Critical — sounds pre-product or self-undermining

| File:Line | Verbatim text | Why it's a problem |
|---|---|---|
| `src/app/pricing/page.tsx:14` | `"Freemium, seat-based, peso-denominated, never metered on estimating, exports, or BOQ Lines. A permanent free tier so your library can accumulate. Pricing numbers are being validated and will be published once they are."` | Meta description (Google search result). Last sentence signals "we are pre-price". |
| `src/app/pricing/page.tsx:32` | `lead="Pricing numbers are a hypothesis we are validating, not a locked price. Read the philosophy below — the numbers come once validation closes."` | First thing a serious buyer reads on the pricing page. Destroys legitimacy in 1 sentence. |
| `src/app/pricing/page.tsx:83` | `eyebrow="Concept · hypothesis"` | A pricing page section eyebrow that literally says "hypothesis". |
| `src/app/pricing/page.tsx:94` | `"pricing model — tiers, numbers, the founding-member rate — is being validated with the teams we are building for"` | "founding-member rate" + "being validated" in one sentence. |
| `src/app/pricing/page.tsx:100` | `"Hypothesis · pending discovery + Van Westendorp validation."` | Status pill copy that says "hypothesis" on a public pricing page. |
| `src/app/pricing/page.tsx:112` | `lead="Plus an Education tier and a future Owner/Portfolio tier for the client side. Names only — numbers are pending validation."` | Repeat of "pending validation" in the tier-shape section. |
| `src/app/about/page.tsx:108` | `lead="Founder public bio assets (credentials, photo, links) are coming. We won't invent them. Until they land, this section is the §13.1 core line."` | Tells B2B buyers the company has no public founder presence. |
| `src/app/about/page.tsx:124` | `"Founder bio and photo are coming. We won't invent credentials."` | Caption under an empty orange gradient box. Single most legitimacy-destroying element on the public surface. |
| `src/app/about/page.tsx:170` | `"AI is on the roadmap, not in the product today."` | Repeated on /about limitations block. Better suited for `/features` or `/trust`, not /about. |
| `src/app/features/page.tsx:15` | meta description: `"...each tagged Live, Building, or Planned, so you know exactly what ships today and what is on the roadmap."` | Meta description. "Planned" + "on the roadmap" in search result snippet. |
| `src/app/features/page.tsx:33` | `lead="...each one tagged Live, Building, or Planned, so you know exactly what ships today and what is on the roadmap."` | First thing buyers read on /features. |
| `src/app/features/page.tsx:44` | `lead="No logos, no testimonials, no inflated roadmap. Every capability carries a status, and the boundary lines state plainly what Archestimator is not."` | "No logos, no testimonials" on the marketing surface. |
| `src/app/features/page.tsx:54` | `heading="AI is on the roadmap, not in the product today."` | Section heading dedicated to what the product lacks. |
| `src/app/contact/page.tsx:12` | `title: "Contact - talk to the founder"` | Meta title. Reads as sole-proprietor, not company. |
| `src/app/contact/page.tsx:14` | `"Archestimator is founder-led. Book a walkthrough around your own workflow, or send a note. We are looking for design partners who create estimates, quotes, or proposals today, with no payment or commitment."` | Meta description. "founder-led" + "design partners" + "no payment or commitment" reads as desperation. |
| `src/app/contact/page.tsx:31-32` | Same as :12, :14 but as the visible heading/lead. | Repeats the desperation framing in the visible page body. |
| `src/app/contact/page.tsx:43-45` | `eyebrow="What we are looking for" heading="A few design partners who estimate, quote, or propose today."` | A whole section asking prospects to be design partners. |
| `src/components/landing/claims-ledger/claims-data.ts:182` | `"AI is on the roadmap, not in the product today. When it ships it is Ask-only at Pro and up, with a visible privacy note."` | Claims Ledger NotUs row. Honest, but currently surfaced on /features. |
| `src/components/landing/claims-ledger/claims-data.ts:204` | `"No logos, testimonials, adoption metrics, or partner names — none exist yet, and we do not invent them."` | NotUs row. Honest, but currently surfaced on /features. |
| `src/components/landing/claims-ledger/claims-data.ts:209` | `"No compliance badges (SOC2/GDPR/HIPAA/DPA) — entity and DPA work are not done."` | NotUs row. Currently surfaced on /features. |
| `src/components/landing/claims-ledger/claims-data.ts:228` | `"AI is on the roadmap, not in the product today."` | Footer 3-row abbreviation. |
| `src/app/trust/page.tsx:169` | `"AI is on the roadmap, not in the product today."` | /trust page (correct home for it). |

### 3.2 Hedge words (weakens authority)

| File:Line | Verbatim text | Issue |
|---|---|---|
| `src/components/landing-v3/ArchestimatorLandingPage.tsx:253` | `"archestimator turns estimating and proposals into one workflow so you spend less time working and more time winning."` | Lowercase brand name + "more time winning" is sales-register, contradicts calm voice. |
| `src/app/about/page.tsx:57-59` | `"This is a new company and an early product. We would rather tell you exactly what it does today and where it is going than oversell it. That honesty is part of how we work."` | "new company and an early product" is the wrong lead. Honesty is a value; saying "early product" upfront undersells. |
| `src/app/about/page.tsx:168-174` (LIMITATIONS array) | 6 limitation lines: "A focused tool for working estimators, not enterprise SaaS.", "AI is on the roadmap, not in the product today.", "Exports are working documents, not immutable issued records...", "Not procurement, ERP, or payment execution.", "Not an aggregator...", "No BIM or drawing ingestion today. English UI, no localization yet." | Honest, but 6 limitations on /about is heavy. Should be 2-3 lines max on /about, full list on /trust. |

### 3.3 Legitimate-but-framed-weak (correct fact, wrong surface)

| File:Line | Verbatim text | Better home |
|---|---|---|
| `src/app/pricing/page.tsx:79-104` (cement anchor section) | "The cement anchor — a concept" / "Concept · hypothesis" / "Hypothesis · pending discovery + Van Westendorp validation." | The cement-anchor framing is strong. The "hypothesis" framing on top of it is the problem. Drop "hypothesis" from the eyebrow and the status pill; keep the cement-anchor metaphor. |
| `src/app/features/page.tsx:39-47` (Claims Ledger surface) | The Claims Ledger rendered with full Live + Building + Planned + NotUs, with NotUs getting equal visual weight. | Reorder so Live leads, Building is honest, Planned is short, NotUs is a footer block (not equal-weight section). |
| `src/components/landing-v3/landing-content.ts:111-117` (productProof) | `["Structured source notes", "Recoverable version history", "Proposal review attached to the estimate", "Recorded decisions", "Reusable costs and assemblies"]` | These are correct claims. The problem is they're currently under a section header that says "no fabricated customer logos". Move them under a real product-proof section. |

### 3.4 NOT in scope (correct legal posture — keep as-is)

These "beta" references are on **legal/access surfaces** where "closed beta" is the **accurate legal status** of an invite-only MVP, not a marketing-wording problem:

- `src/app/terms/page.tsx` — "Closed beta terms" (correct legal framing)
- `src/app/privacy/page.tsx` — "Closed beta privacy notice" (correct legal framing)
- `src/app/access-required/page.tsx` — "BetaAccessRequiredPage" (access-control surface)
- `src/app/signup/page.tsx:7-34` — `ClosedBetaGate` import + render (access-control)
- `src/app/workshop/feedback/page.tsx:3,52` — `BetaFeedbackForm` (in-app feedback, not public)
- `src/app/api/projects/.../export/proposal.xlsx/route.ts:228` — code comment about removing a beta placeholder (correct internal note)
- `src/components/landing/ContactForm.tsx:60,128` — form-value handling for "beta-request" intent (correct intent key)

**Position:** These stay. The user's "no beta wording" is about marketing copy that makes the company look pre-product. The legal pages are accurately describing the legal state. Conflating the two would create a different kind of legitimacy problem (a public pricing page that says "closed beta" would be wrong; a /terms page that hides the closed-beta status would also be wrong).

---

## 4. Brand asset inventory

### 4.1 Tagline / brand voice touchpoints

| Source | Line | Text | Status |
|---|---|---|---|
| README.md (root) | L7 | "**Your cost intelligence layer.**" | Canonical hook |
| README.md (root) | L9 | "From cost proposal to client approval." | Campaign tagline (`[CANON]`) |
| README.md (root) | L13 | "You never start from zero again. Your numbers hold up." | Brand promise (`[PROPOSED]`) |
| `MASTER §0` | "cost intelligence layer" + "construction cost estimating platform" + "supplier-linked cost intelligence layer" | Category stack |
| `MASTER §10.2` | Five voice principles | Brand voice canon |
| `src/components/landing-v3/landing-content.ts` | — | None of the above taglines appear in landing copy today. The landing page does NOT currently surface the campaign tagline, the brand promise, or the cost-intelligence-layer hook anywhere visible. |
| `src/components/landing-v3/ArchestimatorLandingPage.tsx:250` | `"Where estimates become client‑approved proposals."` | Hero h1. Strong but does NOT match the campaign tagline. |
| `src/components/landing-v3/ArchestimatorLandingPage.tsx:249` | `"AEC construction cost estimating & proposal platform"` | Hero eyebrow. Plain anchor; OK. |
| `src/components/landing-v3/ArchestimatorLandingPage.tsx:248` (FinalCta) | `"Your next estimate should make the one after it easier."` | Final CTA h2. Not the brand promise. |

**Audit finding:** The canonical brand strings (`MASTER §0`) — "From cost proposal to client approval.", "You never start from zero again. Your numbers hold up.", "Your cost intelligence layer." — appear **nowhere** in the actual landing copy. They live in README and MASTER but never reach the user.

**Recommendation:** Surface the campaign tagline on the final CTA. Surface the brand promise on the hero or proof section. Surface the cost-intelligence-layer hook on the workflow or feature-chapter section.

### 4.2 Logo and visual brand assets

| Asset | Path | Status |
|---|---|---|
| ArchestimatorLogo component | `src/components/brand/ArchestimatorLogo.tsx` | Used in nav, final CTA, footer. Two tones (light/dark). |
| Hero photo | `public/landing/archestimator-mountain-hero-photo.png` | Architectural mountain photo. On-brand per `DESIGN.md` illustration guidance. |
| Dashboard card triptych | `public/Cards/*-Card.jpg` | Used in workshop dashboard (out of scope). |
| Brand orange | `--brand-orange` token in `globals.css` | Used as accent rail, CTA hover, link underlines, footer bullets. Per `DESIGN.md` it's "landing/brand expression only" outside chart series. |
| Product screenshots | — | **MISSING.** No real screenshots of the estimate tree, library dock, Activity panel, or publication viewer are used anywhere on the public surface. This is the largest visual gap. |

**Recommendation:** Capture 4 real product screenshots for the rebuilt FeatureChapters and ProofSection:
1. Estimate tree with grouped rows + drag handle (from `/workshop/projects/[id]/estimates/[nodeId]`)
2. Library dock with component cards + supplier context
3. Activity panel showing a comment + revision request + decision
4. Publication viewer (anonymous, password-protected share link)

### 4.3 Brand-orange usage audit

Per `DESIGN.md`: orange is "landing/brand expression only unless Philip explicitly approves a named app exception." Current usage:

| Location | File:Line | Status |
|---|---|---|
| Hero CTA background | `landing-v3.module.css` (primaryCta) | ✅ landing-exempt |
| Section accent rail | `SectionShell.tsx` (`accentRail` prop) | ✅ landing-exempt |
| Footer bullets | `LandingFooter` (implicit) | ✅ landing-exempt |
| Pricing page bullets | `pricing/page.tsx:70,154` (`bg-brand-orange` dots) | ✅ landing-exempt |
| About page promise card | `about/page.tsx:91` (`border-l-2 border-brand-orange`) | ✅ landing-exempt |
| About page founder slot gradient | `about/page.tsx:115` (`bg-[linear-gradient(135deg,var(--brand-orange-soft)_0%,transparent_60%)]`) | ⚠️ only legitimacy-undermining because the slot is empty |

---

## 5. Claims Ledger audit (the Live/Building/Planned/NotUs system)

The Claims Ledger (`src/components/landing/claims-ledger/claims-data.ts`) is one of the most sophisticated parts of the public surface. Its **data structure is correct**. Its **surfacing** is the problem.

### 5.1 Row counts by group

| Group | Row count | Notes |
|---|---|---|
| Live | 11 | Strong. Each one is a concrete Live capability. |
| Building | 2 | Honest ("Activity rollups", "Proposal export policy"). |
| Planned | 7 | Long. Includes the "surfacing history by client/project type" redline row — the `MASTER §3.3` honesty anchor. |
| NotUs | 8 | Heavy. Includes 3 redlines (Exports, AI, Not-an-aggregator). |

### 5.2 The surfacing problem

The /features page renders all 4 groups at equal visual weight. The NotUs group's 8 rows get the same screen real estate as Live's 11 rows. A serious buyer scrolling /features sees:

```
Live — ships today (11 rows)
Building — partial today, improving (2 rows)
Planned — on the roadmap (7 rows)
What we are NOT (8 rows) ← equal visual weight
```

The honesty principle is correct. The information architecture is wrong. The right IA:

```
Live — ships today (11 rows)            ← leads, dominant
Building — partial today, improving (2 rows)
Planned — selected roadmap items (3-4 rows max on /features; full list on /roadmap)
NotUs — what this is not (collapsed, footer-style, NOT equal weight)
```

### 5.3 The `redline: true` rows

`ClaimRowData.redline` adds the orange accent rail and is "reserved for honesty-anchor rows + the NotUs rows that protect the brand" (per the file comment on line 26). Current redline rows:

| Group | Claim | Why redlined |
|---|---|---|
| Live | "Private by design — your data is yours, never pooled or anonymized across customers." | R10 honesty anchor |
| Planned | "Surfacing your own accumulated history by client, project type, and supplier" | MASTER §3.3 honesty anchor (the hook the MVP hasn't shipped) |
| NotUs | "Exports are working documents, not immutable issued records, legal documents, or POs." | Boundary |
| NotUs | "AI is on the roadmap, not in the product today." | Boundary |
| NotUs | "Not an aggregator, not a database of other people's estimates, not a bulk import" | Boundary |
| Footer abbreviation | (NotUs) "AI is on the roadmap, not in the product today." | Footer |

**Recommendation:** The redline system stays. Move the redline NotUs rows to a smaller footer-of-/features block, not equal-weight sections. Keep the Live redline (Privacy) as the most prominent.

---

## 6. SEO + metadata audit

### 6.1 Page-level metadata (titles + descriptions)

| Route | Title | Description | Issue |
|---|---|---|---|
| `/` (page.tsx:9-14) | "Archestimator — Construction estimating, proposals and approvals" | "Build structured estimates from reusable cost knowledge, send client-ready proposals, capture revisions, and keep approvals on record in one connected workspace." | ✅ Strong. |
| `/pricing` (page.tsx:11-16) | "Pricing, honestly" | "...Pricing numbers are being validated and will be published once they are." | ❌ "Pricing, honestly" is weak; "being validated" in meta is legitimacy-destroying. |
| `/features` (page.tsx:12-17) | "Features — every feature, with its status" | "...what ships today and what is on the roadmap." | ⚠️ "with its status" + "on the roadmap" reads as "feature tracker", not "product capabilities". |
| `/about` (page.tsx:9-14) | "About — a new company, building for teams who live in spreadsheets" | "We are building the cost intelligence layer that fixes that." | ❌ "a new company" in title is anti-legitimacy. |
| `/contact` (page.tsx:9-13) | "Contact - talk to the founder" | "...founder-led... design partners... no payment or commitment." | ❌ "talk to the founder" + "no payment or commitment" reads desperate. |
| `/trust` (page.tsx — not read in detail) | (trust page) | (trust page) | /trust page exists; correct home for honesty anchors. |

### 6.2 Structured data

`src/components/landing/structured-data.tsx:10` — comment: "No fabricated metrics, no fake aggregateRating, no invented founder sameAs". This is **correct discipline** — do not fabricate schema.org markup. Stays.

### 6.3 Sitemap and robots

`src/app/sitemap.ts`, `src/app/robots.ts` — not modified by this plan. Confirm during implementation that all 5 public routes are listed.

---

## 7. Summary — what's good, what's bad, what's missing

### 7.1 Good (keep, build on)

- **Hero architecture** — editorial split + metric cards + product mockup. Strong template.
- **`MASTER §10.2` voice canon** — "Controlled Confidence" + "earn every claim". The principle is right.
- **Claims Ledger data model** — Live/Building/Planned/NotUs with redlines. The model is right; surfacing is wrong.
- **`MASTER §0` brand strings** — tagline, promise, category stack, dual benefit, campaign tagline. They exist, they just don't reach the user.
- **ProblemSection headline** — "Spreadsheets calculate. They do not remember." Strong, memorable.
- **`company-proof-data.ts` `getRenderableCompanyProofItems` gate** — already enforces "only render real customer proof when verified". This is the right primitive.
- **`MASTER §2` competitive research** — already done. Cites InEight, Ediphi, DESTINI, Zebel, RSMeans, ConWize. Differentiation grounded in segment/price/proposal-to-approval/privacy.
- **Workflow order** — Structure → Reuse → Propose → Decide matches `MASTER §3`.
- **`/trust` route exists** — correct home for honesty anchors.
- **A/B experiment infrastructure** — `ABExperimentProvider` wired, `hero-cta-copy` experiment already running.
- **DESIGN.md** — landing-exempt editorial direction is clearly defined.
- **Cloudflare Workers + D1 + R2 + Better Auth stack** — strong substance to surface as proof.

### 7.2 Bad (recast or rebuild)

- **Hero subhead copy** — cliché + lowercase brand + salesy closer.
- **Hero primary CTA "Book a walkthrough"** — founder-led, not product-led.
- **Hero fake counters** — defensible but a sharp buyer will notice.
- **AudienceBanner** — flat role strip, low information density.
- **AudienceBand** — abstract copy, generic boxes.
- **WorkflowStory abstract ProductStage** — no real screenshot.
- **FeatureChapters abstract icons** — no real screenshot, no Privacy chapter.
- **ComparisonSection abstract pairs** — no concrete feature anchors.
- **SpecialtiesSection 3 of 7 AEC roles** — undersells audience.
- **ProofSection "No fabricated customer logos"** — single worst conversion-surface line.
- **FAQ 5 softballs** — not buyer-journey Qs.
- **FinalCta no incentive, no anchor** — weak close.
- **Footer dense, no company info, no compliance line**.
- **/pricing page** — destroys its own legitimacy in the first screen.
- **/features page** — leads with the Claims Ledger surfacing the NotUs at equal weight.
- **/about page** — "new company" + empty founder slot + 6 limitations.
- **/contact page** — "talk to the founder" + "no payment or commitment".

### 7.3 Missing (build)

- **Product screenshots** — zero real screenshots on the public surface.
- **Campaign tagline surface** — "From cost proposal to client approval." appears nowhere visible.
- **Brand promise surface** — "You never start from zero again. Your numbers hold up." appears nowhere visible.
- **Cost-intelligence-layer hook** — "Your cost intelligence layer." appears in README/MASTER but not on the landing.
- **Cement-anchor value framing on the homepage** — strong metaphor trapped on /pricing.
- **Privacy-by-design chapter** — R10 competitive wedge, gets zero feature real estate.
- **Real product-proof section** — needs 4 screenshots + the Cloudflare/Better Auth/R10 line.
- **Buyer-journey FAQ** — needs 5 real objection-handling Qs.
- **AEC role map for all 7 roles** — architects, engineers, GCs, specialty/fit-out, QS, interior designers, PMs.
- **Founding-team / real-founder block** — replace the empty orange gradient box.
- **Compliance disclosure line in footer** — Cloudflare + Better Auth + R10 privacy stance.
- **Trust/Changelog/Roadmap route triage** — `/trust` exists; `/changelog` and `/roadmap` may not (verify during implementation).
- **SEO rewrite for /pricing, /features, /about, /contact meta** — strip the hedge words.

---

## 8. How this audit feeds the rest of the plan

| Audit section | Feeds |
|---|---|
| §1 Section-by-section | `07_LANDING_PAGE_SECTIONS.md` (target section architecture) |
| §2 Altitude graph | `07` section ordering + `11` Phase 2A hero rewrite |
| §3 Beta-wording inventory | `06_BRAND_AND_COPY_DIRECTION.md` §3 (anti-beta-wording policy) + `11` Phase 1A lint pass + `04_REQUIREMENTS_SPECIFICATION.md` REQ-LINT-* |
| §4 Brand asset inventory | `06` §4 (canonical strings must reach the user) + `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` §3 (real screenshot capture) |
| §5 Claims Ledger audit | `11` Phase 3B /features page reframe |
| §6 SEO + metadata | `11` Phase 1A lint pass (meta descriptions) |
| §7 Summary good/bad/missing | `01_EXECUTIVE_SUMMARY.md` headline findings + `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` OPEN-DECs |
