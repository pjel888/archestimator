# 01 — Executive Summary

**Read time:** 5 minutes.
**Audience:** Philip (founder) + any future implementation agent.
**Purpose:** The whole plan in one document. Read this first, then drill in.

---

## The plan in one paragraph

Archestimator's landing page has a strong hero and a confident canonical brand (tagline "From cost proposal to client approval.", brand promise "You never start from zero again. Your numbers hold up.", `MASTER §10.2` "earn every claim" voice). But everywhere outside the hero, the public surface undercuts itself with **pre-launch posture**: "we are an early product", "we won't invent credentials", "AI is on the roadmap, not in the product today", "Pricing numbers are a hypothesis we are validating", "founder bio coming", "no logos, no testimonials, no adoption metrics", and a Claims Ledger that leads with a 9-row "What we are NOT" block on the /features page. The visual execution also weakens the brand: inconsistent typography, an edge-to-end sticky nav, a plain-text "Sign in" next to a styled CTA, banned fonts, generic 1px borders, and no scroll-entry choreography. This plan audits every legitimacy-undermining string (file:line in `03_SOURCE_AND_CODEBASE_AUDIT.md`), defines a new voice policy that keeps the honesty principle but moves self-flagellation off conversion surfaces (`06_BRAND_AND_COPY_DIRECTION.md`), rebuilds the section architecture so the page sells what ships today (`07_LANDING_PAGE_SECTIONS.md`), nails the product down feature-by-feature for the first time outside Notion (`08_PRODUCT_DEFINITION_AND_FEATURES.md`), defines a high-end visual direction that fixes the font/button/nav/card issues (`20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md`), and sequences the work into parallel-safe phases that can land without breaking the authenticated app (`11_IMPLEMENTATION_PLAN.md`).

---

## What the user asked for, mapped to what the plan delivers

| User request | Plan deliverable |
|---|---|
| "audit our current landing page and then list down the good and the bad" | `03_SOURCE_AND_CODEBASE_AUDIT.md` — section-by-section, file-by-file, line-by-line |
| "deeply improve our branding" | `06_BRAND_AND_COPY_DIRECTION.md` + `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` + `10_COMPETITIVE_AND_MARKET_POSITIONING.md` + `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` |
| "no beta wording and all" | `06_BRAND_AND_COPY_DIRECTION.md` §3 (Anti-beta-wording policy) + `03_SOURCE_AND_CODEBASE_AUDIT.md` §3 (full inventory) + WP-1 lint pass in `11_IMPLEMENTATION_PLAN.md` |
| "present our landing page… that we are a legitimate app" | `07_LANDING_PAGE_SECTIONS.md` (target section architecture with proof-led ordering) + `08_PRODUCT_DEFINITION_AND_FEATURES.md` (concrete product) + `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` (premium visual language) |
| "nail down our product" | `08_PRODUCT_DEFINITION_AND_FEATURES.md` + `04_REQUIREMENTS_SPECIFICATION.md` |
| "list down our features and all and be able to sell it" | `08_PRODUCT_DEFINITION_AND_FEATURES.md` §3 (feature matrix with proof points) + `19_COPY_DEPLOYABLE_PACK.md` |
| "hero section is good" | Hero is preserved structurally; CTA, metric card framing, headline subtext, and visual polish are touched in Phases 1B/1E/2A |
| "plan for it comprehensively" | This pack — 20 docs, traceable REQ-IDs, parallel-safe phase plan, A/B + analytics rollout, risk + decision registers |
| "This is a planning task and not a coding/implementation task" | ✅ No source code touched. Only `.ai/03_plans/2026-07-05-Brand-And-Landing-Page/*.md` created. |

---

## The four headline findings (the TL;DR of the audit)

These are explained in full in `03_SOURCE_AND_CODEBASE_AUDIT.md`. Read them before reading any other doc.

### Finding 1 — The hero is good. Almost nothing else is.

The hero (`Hero` in `ArchestimatorLandingPage.tsx:243-392`) commits to a strong architecture: editorial split, eyebrow + headline + subhead + dual CTA + product mockup + image + 3 hero metric cards with feature previews. The metric cards (`HeroMetricCard` at `:180-241`) are a genuinely good template — they preview real product behaviors (drag-and-drop, branded client links, sign-off recording) instead of just shouting adjectives.

Everything outside the hero is thinner than the hero promises. The page steadily loses altitude: AudienceBand → generic abstract copy. ProblemSection → 4 fragment pills. WorkflowStory → 4 generic steps. FeatureChapters → 3 chapters with **only an icon and abstract ProductStage placeholder** where a real screenshot should be. ComparisonSection → 5 abstract "X vs Y" rows. SpecialtiesSection → only 3 of the 7+ AEC roles the README claims. ProofSection → **literally says "No fabricated customer logos, no invented metrics."** on the marketing surface. FaqSection → 5 generic objections. FinalCta → no incentive, no urgency, no proof.

### Finding 2 — The page actively tells prospects what it lacks.

The Claims Ledger (`src/components/landing/claims-ledger/claims-data.ts`) is a sophisticated Live/Building/Planned/NotUs system. The **NotUs group has 8 rows**, including: *"Not production-hardened enterprise SaaS"*, *"AI is on the roadmap, not in the product today"*, *"Not procurement, ERP, or payment execution"*, *"Not an aggregator"*, *"No BIM or drawing ingestion today"*, *"No logos, testimonials, adoption metrics, or partner names"*, *"No compliance badges (SOC2/GDPR/HIPAA/DPA)"*. Every one of these is honest. Every one of these is also a **conversion-surface disaster** when surfaced on `/features` and the homepage's ProofSection the way they currently are.

The plan's position: **honesty is a brand principle; leading with what you lack on conversion surfaces is a marketing failure**. The Claims Ledger stays; its rows' visibility and copy change.

### Finding 3 — The pricing page destroys its own legitimacy in the first screen.

`src/app/pricing/page.tsx:11-16` sets the page meta as "Pricing, honestly" and the description as *"Freemium, seat-based, peso-denominated… Pricing numbers are being validated and will be published once they are."* The hero heading (line 31) reads *"Simple enough to actually adopt. Honest about what it costs and why."* The lead paragraph (line 32) reads *"Pricing numbers are a hypothesis we are validating, not a locked price."*

The plan's position: a SaaS pricing page that opens with "we are validating the price" signals to a serious AEC buyer that the company is not yet a real company. The plan reframes the pricing page around (1) the model shape (freemium, seat-based, peso-denominated, never metered on the core), (2) the value anchor (the cement-anchor framing), and (3) the founder's standing discovery process — without saying "we don't know yet" on the first scroll. `MASTER §9.3` already permits this reframe; the plan executes it.

### Finding 4 — The founder bio slot on `/about` is a black eye.

`src/app/about/page.tsx:108-126` renders an empty orange gradient box with the text: *"Founder bio and photo are coming. We won't invent credentials."* under it. This is honest. This is also the single most legitimacy-destroying element on the entire public surface, because `/about` is the page serious B2B buyers click when evaluating whether a vendor is real.

The plan's position: the founder's name and one-paragraph bio are **not** an unproven claim. The plan removes the "bio coming" framing and replaces it with a real founder block (name, one-paragraph bio, role, optional photo when supplied) gated only on founder-supplied content. This becomes `OPEN-DEC-004` for sign-off.

### Finding 5 — The visual execution undercuts the premium brand.

The current `landing-v3` CSS (`src/components/landing-v3/landing-v3.module.css`) has good bones but several issues that read as "template" rather than "premium SaaS": section H2s can grow to `4.7rem` (larger than the hero H1), the "Sign in" link is plain text next to a styled CTA, the nav is an edge-to-end sticky bar, `Roboto Mono` is used throughout, generic 1px borders and harsh shadows dominate, and most sections appear statically with no scroll-entry choreography.

The plan's position: the hero concept (mockup + mountain + feature cards) is good and is preserved. The visual system is rebuilt around Precision Editorial: the current neutral/cool product backbone, a unified stepped type scale, restrained precision frames, shared CTA geometry, a contained/floating nav treatment, and motion only where it proves value. Full audit and target direction are in `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` §0 and `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` §0.

---

## The brand voice recast — in one table

Full rationale and source citations in `06_BRAND_AND_COPY_DIRECTION.md`. Summary:

| Surface | Current voice | Target voice |
|---|---|---|
| Homepage hero | "Where estimates become client-approved proposals." (OK) | "Where estimates become client-approved proposals." (preserved) |
| Hero subhead | "Stop losing time to spreadsheets and revisions. archestimator turns estimating and proposals into one workflow so you spend less time working and more time winning." | "Archestimator turns estimating and proposals into one connected workflow. Build structured estimates, send client-ready proposals, capture every revision, and keep approvals on the record." (no cliché, no salesy "winning", no lowercase brand name) |
| Hero CTA | "Book a walkthrough" -> `/contact` | "Request access" -> `/contact?intent=access` until self-serve signup is verified. Then "Start free" can move to `/signup`. |
| AudienceBanner | "Cost Estimators · Architects · Engineers · Project Managers · Construction Managers · Construction Professionals" | Removed — fold into a compact proof band once real customer logos exist (per `MASTER §12.8` they don't yet) |
| AudienceBand heading | "A commercial workspace for the people who own the number." | "Built for the people who own the number on a cost estimate." (concrete; no "commercial workspace" jargon on a public surface) |
| Problem section | "Spreadsheets calculate. They do not remember." (good) | Preserved. Body copy rewritten to be specific to the AEC pain (rates lose source, assumptions disappear, revisions overwrite the why). |
| Workflow steps | 4 generic steps with abstract state descriptions | 4 steps with concrete product behavior + the live screenshot or short clip that proves each one ships today |
| Feature chapters | 3 chapters with abstract copy + icon-only visual | 3 chapters, each anchored on a real product screenshot from `/workshop/projects/[id]/estimates/[nodeId]`, the Library route, and the publication viewer. Plus a 4th chapter: "Archestimator is private by design." (R10) |
| Comparison section | 5 abstract "X vs Y" rows | 5 rows, each tied to a specific Archestimator feature on the Live list with a link into the product |
| Specialties | 3 (General contractors, Specialty contractors, Commercial interiors) | Expanded to 7: Architects, Engineers, General contractors, Specialty/fit-out contractors, Cost estimators / QS, Interior designers, Project managers. (matches README + MASTER §6.2) |
| Proof section | "No fabricated customer logos, no invented metrics. The visible proof is what the product keeps attached to the estimate." | Two-tier: (a) product proof — screenshots of the tree, library, Activity, publication, export; (b) company proof — only when real (gated by `getRenderableCompanyProofItems` already in `company-proof-data.ts`). Until then: state "Private by design. Built on Cloudflare Workers, D1, R2, and Better Auth. Your data is yours, never pooled or anonymized across customers." |
| FAQ | 5 generic Q&s | 5 buyer-journey Q&As: "How is this different from Excel?", "How is this different from Procore / PlanGrid / DESTINI?", "Can I bring my existing cost library?", "Who owns my data?", "What happens when I cancel?" |
| Final CTA | "Your next estimate should make the one after it easier." | "Start your next estimate from the ones you've already done." + concrete next-step CTA + value anchor (the cement-anchor line from the pricing page) |
| Pricing page lead | "Pricing numbers are a hypothesis we are validating, not a locked price." | "Freemium, seat-based, peso-denominated. Never metered on estimating, exports, or BOQ lines." (with the discovery/validation language moved to a smaller section lower on the page) — **OPEN-DEC-002** |
| Features page lead | "The honest feature list." + AI/NotUs-heavy Claims Ledger | "Every feature, with its status." + Claims Ledger reorganized so Live leads, Building is honest, Planned is short, NotUs is a footer block (not the second section) |
| About page lead | "A new company, building for teams who live in spreadsheets." | "Built by someone who has lived the gap — and is building the cost intelligence layer for teams who still work in spreadsheets." (founder-led, not "new company") |
| About — founder slot | "Founder bio and photo are coming. We won't invent credentials." | Real founder block. **OPEN-DEC-004** |
| About — limitations | 6-row honest limitations block (good, but exposed) | Move to `/trust` and `/changelog`. On `/about`, replace with "Private by design. Built on Cloudflare. Your data is yours." + link to `/trust`. |
| Contact page lead | "Talk to the founder." + "We are looking for design partners... no payment or commitment." | "Talk to us." + dual CTA: "Request access" + "Book a walkthrough". Drop "no payment or commitment"; it reads as desperation. |

---

## The product, nailed down (TL;DR of `08`)

| Dimension | Statement |
|---|---|
| **What it is** | A construction cost estimating + proposal workspace for AEC teams. One connected workflow from estimate tree → reusable cost library → client-ready proposal → comments/revisions/approvals → recorded decision history. |
| **What it is NOT** | Not enterprise estimating (Procore, DESTINI, Ediphi). Not procurement or ERP. Not a database of other people's estimates. Not AI-generated pricing. Not a takeoff tool. Not a BIM tool. |
| **Who it's for** | Architects, engineers, contractors (general + specialty/fit-out), cost estimators / QS, interior designers, project managers. Primary market: Philippines and SEA. |
| **What ships today (Live)** | Hierarchical estimate tree (Group/Area/rows, drag-and-drop). Reusable cost library (components, brands, suppliers, variants, pricing, images, attachments). Inline optimistic editing. Templates. Activity + Node Activity + row version history. D3 project comparison charts. Project publication with shared links (comments, decisions, password protection). Collaboration invites with roles + realtime cursors. Excel .xlsx proposal export. |
| **What's building** | Activity rollups. Issued-snapshot proposal policy. |
| **What's planned (roadmap)** | Surfacing accumulated history by client/project type/supplier. Archiving/trash. Proposal open-tracking. Onboarding first-run flow. Supplier catalog → quote requests → product comparison → procurement bridge. Client-side proposal record. AI copilot at Pro and up. |
| **The competitive wedge** | Enterprise estimating tools already promise reusable intelligence (`MASTER §2` cites InEight, Ediphi, DESTINI, Zebel, RSMeans, ConWize). They are US-centric, enterprise-priced, complex, and estimating-only. Archestimator is built for the spreadsheet-bound SEA SMB and supplier segment they ignore, is freemium + peso-denominated, extends past estimating into proposal-to-approval, and is private-by-design (no cross-customer benchmark). |
| **The brand promise** | "You never start from zero again. Your numbers hold up." |
| **The category stack** | Hook: "the cost intelligence layer." Plain anchor: "a construction cost estimating platform." Investor frame: "the supplier-linked cost intelligence layer for AEC." |
| **The business model** | Proposer-side SaaS wedge. Freemium, seat-based, peso-denominated. Solo tier anchored at ₱239/month (the cement-anchor). Future layers: client-side proposal-record subscriptions, enterprise portfolio plans, supplier catalog and quote-request revenue. |

---

## The phases at a glance

| Phase | Goal | Blocked on |
|---|---|---|
| **Phase 0** | Confirm true blockers and defaults | CTA access model, founder bio, pricing numbers, proof assets, visual override |
| **Phase 1A** | Beta-wording lint pass on conversion surfaces | Safe default |
| **Phase 1B** | Hero copy/CTA recast + nav/button visual unification | CTA label default |
| **Phase 1C** | Footer rebuild | Safe default |
| **Phase 1D** | Section reorder (Live proof up; NotUs to footer) | Safe default |
| **Phase 1E** | Visual system foundation: tokens, type scale, precision frames, restrained motion | Precision Editorial default |
| **Phase 2A** | Hero rewrite + metric card reframe | Phase 1A, 1B, 1D, 1E |
| **Phase 2B** | Feature chapters rebuilt with real product screenshots | Phase 2A |
| **Phase 2C** | Specialties expanded to full 7-role AEC map | Phase 2A |
| **Phase 3A** | Pricing page reframe | Phase 2B |
| **Phase 3B** | Features page reframe | Phase 2B |
| **Phase 3C** | About page reframe | Phase 2B, 2C |
| **Phase 3D** | Contact page reframe | Phase 2B |
| **Phase 4A** | New proof section with real artifacts | Phase 3A–3D |
| **Phase 4B** | Final CTA + value-anchor band | Phase 4A |
| **Phase 5** | Final visual polish + DESIGN.md landing tokens + token reconciliation | Phase 4B |
| **Phase 6** | A/B test + analytics + measure | Phase 5 |

**Parallel opportunities:** Phase 1A–1E can run concurrently (different file scopes; 1E touches CSS only). Phase 3A–3D can run concurrently after Phase 2B. Phase 5 final visual polish touches the same files Phase 2/3/4 touch — must serialize.

---

## What this plan does NOT do

- Does not modify any source code, test, migration, package manifest, `wrangler.jsonc`, or provider state.
- Does not invent customer logos, testimonials, adoption metrics, partner names, or compliance badges.
- Does not recast `MASTER §10.2` "earn every claim" — that principle stays. Where the claims appear on public surfaces is what changes.
- Does not touch the authenticated `/workshop` app or the `/share/[token]` publication viewer.
- Does not renegotiate the core DESIGN.md tokens (SF Pro app stack, neutral palette, xs radius, 12px max for app). Landing-only experimental tokens stay exempt per `DESIGN.md` line 487.
- Does not commit to a public launch date.

---

## What happens next

1. **Founder reads this `01_EXECUTIVE_SUMMARY.md` + `03_SOURCE_AND_CODEBASE_AUDIT.md` + `06_BRAND_AND_COPY_DIRECTION.md` + `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md`.** Budget: 40 minutes.
2. **Founder decides the 12 OPEN-DECs** in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`. Budget: 1 hour.
3. **Plan moves to implementation** via `Create-Implementation-Prompt.md` + `Executing-Plan-Prompt.md` siblings.
4. **Phase 1 atomic slices land first** (no founder content needed beyond the OPEN-DEC sign-offs; Phase 1E can use the default archetype if founder is silent), then Phase 2+ in sequence.
5. **Post-impl**, the recasts are reflected back into `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` and `.ai/10_state/current-state.md`.

---

## Reading order if you have 15 minutes

1. This doc (`01_EXECUTIVE_SUMMARY.md`).
2. `03_SOURCE_AND_CODEBASE_AUDIT.md` — what's broken today, with line numbers.
3. `06_BRAND_AND_COPY_DIRECTION.md` §3 (Anti-beta-wording policy) + §4 (Voice recasts).
4. `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` — the visual audit and target direction.
5. `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` — the 12 OPEN-DECs you need to sign.

Reading order if you have 60 minutes: the whole pack, top to bottom.
