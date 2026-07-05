# 19 — Copy Deployable Pack

**Purpose:** Actual ready-to-paste copy strings, organized by surface. Implementation agents can lift these directly into source files (after founder sign-off on OPEN-DECs in `15`).
**Source authority:** `06_BRAND_AND_COPY_DIRECTION.md` (voice policy), `08_PRODUCT_DEFINITION_AND_FEATURES.md` (product), `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` v4.3 §0 (canonical strings).
**Status:** All copy is `[PROPOSED]` until founder signs the relevant OPEN-DEC.

---

## 0. 2026-07-06 copy correction

This correction supersedes any longer or more decorative copy below. Implementation should use the shortest copy that still makes the product concrete.

Copy constraints:

- Hero H1: max 2 lines.
- Hero subhead: max 20 words.
- Visible copy should not use em dash or arrow separators.
- No fake metrics, fabricated adoption numbers, logos, testimonials, or "illustrative" counters.
- Avoid founder-apology, beta-apology, and "we are validating" language on conversion surfaces.
- Preserve the hero estimate-sheet mockup and above-the-fold product signal.
- Primary CTA default is "Request access" while signup remains invite-gated. Switch to "Start free" only after self-serve signup is verified.

Recommended hero copy:

```text
Where estimates become client-approved proposals.

Build estimates from reusable costs, send client-ready proposals, and keep revisions, comments, and approvals attached.
```

Recommended CTA pair:

```text
Request access
See how it works
```

Recommended promise line:

```text
From cost proposal to client approval.
```

---

## 1. Homepage hero (`src/components/landing-v3/landing-content.ts` + `ArchestimatorLandingPage.tsx:243-392`)

### Eyebrow (preserve)
```
AEC construction cost estimating & proposal platform
```

### H1 (OPEN-DEC-001a — pick one)
**Option A (preserve current):**
```
Where estimates become client-approved proposals.
```
**Option B (canonical hook from `MASTER §0`):**
```
Your cost intelligence layer.
```

### Subhead (replace current)
```
Build estimates from reusable costs, send client-ready proposals, and keep revisions, comments, and approvals attached.
```

### Primary CTA (OPEN-DEC-005 — pick one)
- "Request access" -> `/contact?intent=access` (default while `/signup` is invite-gated)
- "Start free" -> `/signup` (only after self-serve signup is verified)
- "Open workspace" -> `/workshop` (logged-in state only)

### Secondary CTA (preserve, minor recast)
```
See how it works
```

### Below-CTA line (NEW — brand promise surfaced)
```
From cost proposal to client approval.
```

### Hero metric cards (recast — drop fake counters)
For each card, preserve:
- Index ("01", "02", "03")
- Title ("Estimate Smarter", "Propose Better", "Win Faster")
- Ledger title
- Body
- 3 feature previews with tooltips

**Drop:**
- Animated metric value (`metricValue={248}` etc.)
- `AnimatedMetricValue` component output. Do not replace it with a punctuation placeholder.

---

## 2. AudienceBanner (`ArchestimatorLandingPage.tsx:150-156`) — REMOVE

Delete the function entirely. Remove `<AudienceBanner />` from the page composition.

---

## 3. AudienceBand (`ArchestimatorLandingPage.tsx:394-434`) — recast

### Kicker
```
Built for the people who own the number on a cost estimate
```

### Heading
```
From the first line item to the final approval.
```

### Body
```
Archestimator is not just an estimating screen. It's the path from project structure and reusable cost knowledge to proposal review, revision, decision, and the recorded history behind every number.
```

### Input nodes (3)
```
Project structure (phases, locations, trades)
Reusable cost library
Your historical rates and supplier context
```

### Record nodes (4)
```
Estimate: Scope, quantities, rates, assumptions, source notes.
Proposal: Client-ready output that keeps estimate context.
Review: Comments, questions, revision requests, and approvals.
Decision: Final response and next action attached to the record.
```

### History rail
```
Every comment, change, version, and decision remains attached, searchable, attributable, and recoverable.
```

---

## 4. ProblemSection (`ArchestimatorLandingPage.tsx:436-457`) — expand

### Heading (preserve)
```
Spreadsheets calculate.
They do not remember.
```

### Body (3 paragraphs — replace current 1-paragraph body)
```
Most estimates stop being useful the moment they become a PDF. Rates lose their source. Assumptions disappear. Feedback moves to email. Revisions overwrite why the number changed.

The rate you proved on the last project should not disappear into another copied sheet.

Archestimator keeps the commercial record attached to every line.
```

### Closer (replace current)
```
Your cost intelligence layer.
```

### Fragment pills (preserve)
```
Copied rate
Unnamed attachment
Email revision
Overwritten version
```

---

## 5. WorkflowStory (`landing-content.ts:20-53`) — preserve copy, replace `ProductStage` with real screenshots

The 4-step copy in `landing-content.ts:20-53` is preserved. Each step's `ProductStage` placeholder is replaced with a real screenshot.

---

## 6. FeatureChapters (3 chapters preserved + NEW 4th)

### Chapter 1 — Reusable cost intelligence (preserve copy, add screenshot)
Kicker, title, body, callout preserved.

### Chapter 2 — Proposal handoff (preserve copy, add screenshot)
Kicker, title, body, callout preserved.

### Chapter 3 — Revision and activity history (preserve copy, add screenshot)
Kicker, title, body, callout preserved.

### Chapter 4 — NEW: Private by design
```yaml
kicker: "Private by design"
title: "Your data is yours. Always."
body: "Your data is never pooled or anonymized across customers. We don't run cross-customer benchmarks. Built on Cloudflare Workers, D1, R2, and Better Auth."
callout: "Privacy is a positioning choice, not a feature."
```

---

## 7. SpecialtiesSection — expand from 3 to 7 (`landing-content.ts:87-109`)

```typescript
export const specialties = [
  {
    id: "architects",
    label: "Architects",
    copy: "Build estimate trees that mirror your design intent. Keep finish options, exclusions, and client decisions attached from first concept to final approval.",
    visual: "Area-based estimate tree with finish options and exclusions.",
  },
  {
    id: "engineers",
    label: "Engineers",
    copy: "Build reusable assemblies per discipline. Variant costing, supplier context, and labor logic move with the assembly.",
    visual: "Discipline assemblies with supplier variants and labor logic.",
  },
  {
    id: "general-contractors",
    label: "General contractors",
    copy: "Organize costs across phases, locations, trades, bid packages, and allowances. Preserve the assumptions behind the total.",
    visual: "Phase and package tree with allowances held beside the estimate total.",
  },
  {
    id: "specialty-contractors",
    label: "Specialty / fit-out contractors",
    copy: "Build reusable assemblies, variants, supplier references, labor logic, and scope packages that move into future estimates.",
    visual: "Assembly variants with supplier context and reusable labor logic.",
  },
  {
    id: "cost-estimators-qs",
    label: "Cost estimators / QS",
    copy: "Structure BOQ-grade estimates with unit-rate discipline. Every rate keeps its source note, every quantity keeps its assumption.",
    visual: "BOQ-structured estimate with source notes and assumptions attached.",
  },
  {
    id: "interior-designers",
    label: "Interior designers",
    copy: "Keep rooms, finishes, options, exclusions, and client decisions connected from the first estimate through final approval.",
    visual: "Room-based estimate with finish options and client decisions attached.",
  },
  {
    id: "project-managers",
    label: "Project managers",
    copy: "Walk into every pricing conversation with the full record: what was proposed, what changed, what was approved, when, and by whom.",
    visual: "Activity timeline with proposal, change order, and recorded decision.",
  },
] as const;
```

---

## 8. ComparisonSection — tighten rows (`landing-content.ts:79-85`)

```typescript
export const comparisonRows = [
  ["Rates are copied.", "Costs keep their source."],
  ["Proposal data is reformatted.", "Proposal data stays connected."],
  ["Feedback moves to email.", "Review remains attached."],
  ["Revisions overwrite earlier versions.", "Versions stay recoverable."],
  ["The next estimate starts from a blank or duplicated sheet.", "Commercial knowledge compounds."],
] as const;
```

Each "Archestimator" column row links to the actual Live feature anchor on `/features`.

---

## 9. ProofSection — complete rebuild (`landing-content.ts:111-117` + `ArchestimatorLandingPage.tsx:570-589`)

### Kicker
```
What ships today
```

### Title
```
Built for the work you actually do.
```

### Body
```
Archestimator ships today. This is the product surface.
```

### Content (replace 5 text bullets with 4 real screenshots + compliance line)

**Screenshot 1: Estimate tree**
- Source: `/workshop/projects/[seed-id]/estimates/[seed-node]`
- Caption: "Hierarchical estimate tree. Drag-and-drop. Inline editing. Live totals."
- Proves: L1

**Screenshot 2: Library dock**
- Source: `/workshop/library`
- Caption: "Reusable cost component library. Brands, suppliers, variants, pricing, images, attachments."
- Proves: L2, L3

**Screenshot 3: Activity panel**
- Source: Activity tab on the estimate route
- Caption: "Activity + Node Activity + row Version History. Every comment, every change, every decision."
- Proves: L6

**Screenshot 4: Publication viewer**
- Source: `/share/[seed-token]` (anonymous view)
- Caption: "Client-ready proposal link. Comments, decisions, password protection. Built-in change order workflow."
- Proves: L8

**Compliance line (below screenshots):**
```
Private by design. Built on Cloudflare Workers, D1, R2, and Better Auth. Your data is yours, never pooled or anonymized across customers.
```

---

## 10. FaqSection — replace 5 softballs (`landing-content.ts:119-145`)

```typescript
export const faqs = [
  {
    question: "How is this different from Excel?",
    answer:
      "Excel calculates. It doesn't remember. Archestimator keeps rates, suppliers, assumptions, revisions, and approvals attached to the work across projects and time.",
  },
  {
    question: "How is this different from Procore, DESTINI, or what I already use?",
    answer:
      "Enterprise estimating tools already do parts of this. They're built for US enterprise GCs, priced for enterprise, take weeks to set up, and stop at estimating. Archestimator is built for the spreadsheet-bound SEA team, is freemium and peso-denominated, and extends past estimating into proposal-to-approval and the supplier-linked bridge.",
  },
  {
    question: "Can I bring my existing cost library?",
    answer:
      "Yes. Import via Excel template, or build it natively in the Library dock. Each component carries its supplier, brand, variant, price history, and source note. Once it's in, drag-and-drop it into any estimate.",
  },
  {
    question: "Who owns my data?",
    answer:
      "You do. Your data is never pooled or anonymized across customers. Export your library and estimates anytime.",
  },
  {
    question: "What happens when I cancel?",
    answer:
      "Your library and estimates remain exportable. Cancel anytime; your data stays yours throughout and after.",
  },
] as const;
```

---

## 11. FinalCta (`ArchestimatorLandingPage.tsx:618-632`) — recast

### H2
```
Start your next estimate from the ones you've already done.
```

### Body
```
From cost proposal to client approval.

Free forever for the Solo tier. Priced in pesos.
```

### Primary CTA (OPEN-DEC-005)
```
Request access
```

### Secondary CTA
```
Book a walkthrough
```

---

## 12. Footer (`ArchestimatorLandingPage.tsx:634-661`) — rebuild

### Logo (preserve)

### Link list (expand from 9 → 12)
```typescript
const links = [
  ["Product", "#product"],
  ["Workflow", "#workflow"],
  ["Specialties", "#specialties"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
  ["Contact", "/contact"],
  ["Sign in", "/login"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Trust", "/trust"],
  // Add these IF the routes exist (Phase 5 verification):
  // ["Changelog", "/changelog"],
  // ["Roadmap", "/roadmap"],
] as const;
```

### Copyright (recast)
```
© 2026 Archestimator. From cost proposal to client approval.
```

### Company line (NEW)
```
Built in the Philippines. Built on Cloudflare.
```

### Compliance line (NEW)
```
Private by design. Your data is yours, never pooled or anonymized across customers.
```

### Value anchor (NEW)
```
Free forever for the Solo tier. Priced in pesos.
```

---

## 13. `/pricing` page (`src/app/pricing/page.tsx`)

### Meta title (replace)
```
Pricing - freemium, seat-based, peso-denominated
```

### Meta description (replace)
```
Freemium, seat-based, peso-denominated. Never metered on estimating, exports, or BOQ lines. A permanent free tier so your library can accumulate.
```

### Hero heading (replace)
```
Pricing built for the team that estimates every day.
```

### Hero lead (replace)
```
Freemium. Seat-based. Priced in pesos. Never metered on estimating, exports, or BOQ lines. The full Solo tier is free forever so your library can accumulate.
```

### Cement anchor eyebrow (replace)
```
The value anchor
```

### Cement anchor heading (preserve)
```
A tool that compounds on every estimate should cost less than a material you pour once.
```

### Cement anchor status pill (REMOVE the "Hypothesis · pending discovery" pill)

### Tier shape eyebrow (replace)
```
The intended tier shape
```

### Tier shape lead (replace)
```
Free, Solo, Pro, Team, plus an Education tier and a future Owner/Portfolio tier for the client side. Numbers come when discovery closes.
```

### "How we are validating price" section — move + reframe
- Move lower on the page (after tier shape).
- Rename: "How we set the price".

---

## 14. `/features` page (`src/app/features/page.tsx`)

### Meta title (replace)
```
Features - what ships today
```

### Meta description (replace)
```
The estimate workspace, the reusable library, the revision record, and the proposal handoff. Each tagged Live, Building, or Planned.
```

### Hero heading (replace)
```
What Archestimator does today.
```

### Hero lead (replace)
```
The estimate workspace, the reusable library, the revision record, and the proposal handoff. Each tagged Live, Building, or Planned. The Live list leads; the boundary lines are stated plainly in the footer.
```

### Ledger section header (replace)
```
What ships today.
```

### Ledger section lead (replace)
```
Every capability carries a status. Live leads. Building is honest. Planned is selected roadmap items. The boundary lines (what Archestimator is not) are in the footer.
```

### AI section — REMOVE the dedicated section
The Claims Ledger NotUs row + `/trust` page handle the AI fact.

---

## 15. `/about` page (`src/app/about/page.tsx`)

### Meta title (replace)
```
About - the cost intelligence layer for AEC teams
```

### Meta description (preserve)
```
Archestimator started with a simple frustration: every estimate holds real commercial knowledge, and every time a project ends, that knowledge dies in a spreadsheet. We are building the cost intelligence layer that fixes that.
```

### Hero heading (replace)
```
Built for teams who live in spreadsheets.
```

### Hero lead (preserve)
```
Name the world as it is. Declare who we are. Show who you become with us.
```

### Intro paragraph 4 (replace)
```
Archestimator is built by someone who has lived the gap between cost work and software work. The product ships today; the roadmap is published; the boundary lines are stated plainly.
```

### Founder slot (OPEN-DEC-004)
**Option A (founder supplies name + bio + photo):**
```tsx
<SectionShell
  id="about-founder"
  label="The founder"
  eyebrow="The founder"
  heading="[Founder name], Founder."
  lead="[One-paragraph founder bio.]"
>
  {/* Real founder photo + bio content */}
</SectionShell>
```

**Option B (default: remove "bio coming" caption, use existing one-line):**
```tsx
<SectionShell
  id="about-founder"
  label="The founder"
  eyebrow="The founder"
  heading="Built by someone who has lived the gap."
>
  <p>Archestimator exists because the founder has felt the workflow from both sides: cost work and software work.</p>
</SectionShell>
```

### Limitations (reduce from 6 to 3)
```typescript
const LIMITATIONS = [
  "A focused tool for working estimators, not enterprise SaaS.",
  "AI is on the roadmap, not in the product today.",
  "Exports are working documents, not immutable issued records, legal documents, or POs.",
] as const;
// Add below the list: "See the full boundary list on /trust."
```

---

## 16. `/contact` page (`src/app/contact/page.tsx`)

### Meta title (replace)
```
Contact Archestimator
```

### Meta description (replace)
```
Request access, book a walkthrough around your own workflow, or send a note. We work directly with architects, engineers, contractors, estimators, and interior designers.
```

### Hero heading (replace)
```
Talk to us.
```

### Hero lead (replace)
```
Request access, book a walkthrough around your own workflow, or send a note.
```

### Design partners section eyebrow (replace)
```
What we look for in a partner
```

### Design partners section heading (replace)
```
Teams who estimate, quote, or propose today.
```

### Drop entirely
- The phrase "no payment or commitment"

### Add: dual CTA
```tsx
<LandingCTAs
  primary={{ label: "Request access", href: "/contact?intent=access" }}
  secondary={{ label: "Book a walkthrough", href: "/contact?intent=walkthrough" }}
/>
```

---

## 17. Phase 1A lint rule (`scripts/landing-copy-lint.mjs` — new file)

The lint rule greps the marketing-surface scope for banned phrases and exits non-zero on match. Skeleton:

```javascript
#!/usr/bin/env node
// scripts/landing-copy-lint.mjs
// Lints marketing surfaces for banned beta-wording per .ai/03_plans/2026-07-05-Brand-And-Landing-Page/06_BRAND_AND_COPY_DIRECTION.md §3.2

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BANNED_PHRASES = [
  "early product",
  "early-stage",
  "pre-launch",
  "a new company",
  "we are validating",
  "being validated",
  "hypothesis",
  "founding-member rate",
  "we are looking for design partners",
  "no payment or commitment",
  "talk to the founder",
  "no logos, no testimonials",
  "No compliance badges",
  "Not production-hardened enterprise SaaS",
  "Pricing, honestly",
  "founder-led",  // in metadata only
];

const MARKETING_SCOPES = [
  "src/app/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/features/page.tsx",
  "src/app/about/page.tsx",
  "src/app/contact/page.tsx",
  "src/components/landing-v3/",
  "src/components/landing/sections/",
  "src/components/landing/claims-ledger/",
  "src/components/landing/shared/",
  "src/components/landing/company-proof-data.ts",
  "src/lib/landing/seo-metadata.ts",
];

// Excluded: src/app/terms/, src/app/privacy/, src/app/access-required/, src/app/signup/, src/app/workshop/feedback/

let violations = 0;
// ... (scan files, match phrases, report violations)

process.exit(violations > 0 ? 1 : 0);
```

Add to `package.json`:
```json
"scripts": {
  "lint:landing-copy": "node scripts/landing-copy-lint.mjs"
}
```

Wire to CI in `.github/workflows/ci.yml` after `bun run lint:design-system`.

---

## 18. How to use this pack

1. Confirm the true blockers/defaults in `15` §0.
2. Implementation agent picks a phase from `11`.
3. Implementation agent copies the relevant section above into the relevant source file.
4. Implementation agent runs the targeted validation named in `12` §0; copy edits should at least run the landing-copy lint once it exists.
5. Implementation agent commits with reference to the WP-* ID.
6. Repeat per phase.

Every copy string above is `[PROPOSED]` until owner review, but safe defaults in §0 are implementation-ready planning defaults. The implementation agent must not improvise beyond these strings without recording a new decision or rationale.
