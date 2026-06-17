# Public Landing Subpages Research Plan

**Date:** 2026-05-21 18:05 PST; refreshed 2026-05-27 14:50 PHT
**Status:** Planning only; research backlog before implementation/release gates. Phase 8 now provides concrete cookie/CSP/DPA and analytics-stack facts.
**Scope:** Research needed before implementing `/features`, `/pricing`, `/about`, `/contact`, and supporting public trust/content pages.
**Parent folder:** `.ai/03_plans/landing-page-improvement/`
**Related plan:** `14-public-subpages-analysis-plan.md`

## Purpose

Dedicated public subpages need stronger evidence than the homepage. The homepage can introduce the Archestimator method; subpages must answer evaluator questions with accurate product, pricing, trust, and workflow detail.

This research plan defines what must be checked before each subpage becomes implementation-ready.

## Research principles

1. **Product truth first.** Every public claim must map to current live behavior, MVP-preview behavior, or future direction.
2. **No fake proof.** Do not invent customers, usage metrics, testimonials, logos, certifications, or savings numbers.
3. **Date current facts.** Pricing, competitor positioning, security-provider facts, legal/privacy requirements, and search results are time-sensitive.
4. **Use internal sources before external copy.** Brand docs and live product source define Archestimator's language; external competitors only clarify market context.
5. **Research should produce decisions.** Each research task should end with a recommendation, a claim-status label, or a content constraint.

## Existing research and source base

Already available:

- `.ai/06_specs/brand/*` — canonical brand, feature, narrative, and voice sources.
- `.ai/13_research/competitor-landscape-construction-estimating-2026-05-16.md` — competitor category and pricing snapshot from 2026-05-16.
- `.ai/10_state/current-state.md` — current route/product state.
- `.ai/10_state/decisions.md` — durable public landing and product decisions.
- `src/app/page.tsx` and `src/components/landing/*` — current homepage implementation.
- `src/app/workshop*` and current product specs — source of product-maturity truth for public feature claims.

Research gaps:

- current feature maturity matrix;
- approved public pricing posture;
- contact-flow destination;
- founder/company facts for `/about`;
- privacy/legal policy facts;
- Phase 8 cookie/CSP/DPA facts and the GA4/Clarity/PostHog stack decision;
- security fact matrix;
- current SEO/competitor page patterns;
- mobile/responsive examples for public subpage information density.

## Research workstreams

### Workstream A — Product maturity and claims matrix

**Primary question:** Which public claims are live, MVP-preview, planned, or unsafe?

**Required output:** `public-subpages-claims-matrix.md` or equivalent table before implementation.

**Claims to classify:**

- Estimate Workspace
- Component Library
- Revision Intelligence
- Proposal Comparisons
- Visual Cost Breakdowns
- Proposal-Ready Outputs
- Industry Standard Export Formats
- MVP preview pricing/access
- workspace/project hierarchy
- Excel/PDF handoff
- proposal package behavior
- revisions/change deltas
- visual cost comparison
- auth/protected workspace
- security/privacy statements

**Suggested labels:**

- `live` — implemented and demonstrable in current product.
- `mvp-preview` — visible or partially usable, but not production-mature.
- `mockup/static-preview` — public visual only; must not imply finished behavior.
- `planned` — future direction; should be de-emphasized or clearly labeled.
- `unsafe` — do not publish until verified.

**Internal sources to inspect:**

- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/06_specs/current-project-estimates-component-library-spec.md`
- `.ai/06_specs/live-project-estimate-bootstrap.md`
- `src/app/workshop/**`
- `src/components/workshop/**`
- `src/lib/**`
- `supabase/migrations/**`
- current browser walkthrough of `/workshop` if implementation proceeds later

**Decision questions:**

1. Can `/features` show each public feature as available, or do some need `MVP preview` labels?
2. Are Excel/PDF exports implemented enough to be a feature-page chapter, or only future handoff direction?
3. Are proposal-ready outputs implemented, or only a brand/product promise?
4. Are revisions/change deltas implemented, or only supported by version-history direction?
5. Which current screenshots/visuals can be used without misleading users?

## Workstream B — `/features` research

**Primary question:** What product-specific proof should each feature page section show?

**Research targets:**

- Current homepage product preview tabs.
- Current workshop route and estimate tree behavior.
- Component Library route and current limitations.
- Public brand feature copy.
- Competitor feature-page structure for construction estimating tools.

**External pages to review later:**

- STACK feature/product pages.
- PlanSwift features and pricing pages.
- Bluebeam construction/estimating-related pages.
- Buildxact estimating and takeoff pages.
- Contractor Foreman estimating pages.
- Clear Estimates feature/pricing pages.
- Procore estimating/preconstruction pages.
- CostX/Cubit/Sage/RSMeans pages for formal QS/BOQ language.

**Questions to answer:**

1. What is the strongest public explanation of `project-shaped estimates`?
2. How much detail should the page show before it feels too app-like for a marketing page?
3. Should `/features` use one long page or separate sections with in-page navigation?
4. Which feature visuals should be static compositions versus real product screenshots?
5. Which terms are SEO-useful without making the product sound generic? Examples: construction estimating software, BOQ software, cost estimating software, estimate revisions, contractor estimating.

**Output recommendation:**

- Feature-page content brief with:
  - H1/H2 direction;
  - seven feature chapters;
  - maturity label per chapter;
  - visual/proof idea per chapter;
  - CTA and FAQ recommendations.

## Workstream C — `/pricing` research

**Primary question:** What can Archestimator safely say about pricing and early access?

**Internal facts to decide:**

- Is the current public `₱0` language still desired?
- Does `₱0` mean temporary MVP preview, private beta, free trial, or design-partner access?
- What happens after early access?
- Does the product target Philippines-first pricing, USD pricing, or no currency until later?
- Does the contact/demo flow replace public pricing until the model is validated?

**Competitor pricing references to refresh before publication:**

Current older snapshot from 2026-05-16 includes:

- PlanSwift Professional — US$2,000 including one year updates/support.
- Bluebeam Basics/Core/Complete — US$260/330/440 per user/year.
- Buildxact Foundation/Pro/Master — US$199/399/599 per month, with AI add-ons noted in research snapshot.
- Contractor Foreman — starts at US$49/month in snapshot.
- Joist Basics/Pro/Elite — US$10/16/32 per month in snapshot.
- Clear Estimates — US$79/119/249-ish tiers in snapshot.

**Important:** Refresh competitor pricing live before publishing any comparison or positioning. Do not quote stale pricing on public pages unless dated and verified.

**Pricing-page options to evaluate:**

1. **MVP preview page, no final tiers**
   - Most honest for current stage.
   - Strongest if pricing is not approved.

2. **Early-access card only**
   - One plan/card labelled `MVP preview`.
   - Must clarify temporary status and what is included.

3. **Contact/demo pricing**
   - Avoids premature commitments.
   - Needs a real contact flow.

4. **Future tier teaser**
   - Not recommended unless Philip approves monetization model.

**Output recommendation:**

- Pricing-page readiness brief with approved pricing language, prohibited phrases, FAQ, and CTA path.

## Workstream D — `/about` research

**Primary question:** What factual company/founder/product story can be published without fake maturity?

**Internal facts needed from Philip:**

- Founder name/role to publish, if any.
- Whether Archestimator is Philippines-first, global, or geography-neutral for public copy.
- Legal/company entity wording, if any.
- Whether to mention architecture/construction background.
- Whether to mention archestimator/related ventures or keep Archestimator separate.
- Whether there are real design-partner/customer-discovery conversations that can be referenced without names.

**Brand sources to use:**

- `brand-narrative.md`
- `clarity-and-mess-narrative.md`
- `the-archestimator-way.md`
- `brand-foundation.md`
- `brand-voice.md`

**Questions to answer:**

1. Is `/about` founder-led, product-led, or mission-led?
2. Should the page name the first audience as construction cost estimators, contractors, architects, QS, fit-out teams, or design-build teams?
3. How explicitly should it call out Excel? Current brand rule: the enemy is disconnected workflow, not Excel or the estimator.
4. Should current stage be called pre-MVP, MVP preview, early access, beta, or design-partner preview?

**Output recommendation:**

- About/contact content brief with approved facts, story structure, and prohibited maturity claims.

## Workstream E — `/contact` research

**Primary question:** What is the safest, lowest-friction contact mechanism for the current product stage?

**Options to evaluate:**

1. `mailto:` link
   - Fastest, no backend.
   - Less professional; no structured intake.

2. Simple contact form routed to email/server action
   - More professional.
   - Requires spam handling, validation, privacy language, and delivery verification.

3. Calendar booking link
   - Good for demo intent.
   - Requires approved scheduling provider and public availability.

4. CRM/form provider
   - Useful later.
   - Adds dependency/privacy review.

5. Login/workspace CTA only
   - Low effort.
   - Does not satisfy serious demo/contact inquiries.

**Contact categories to validate:**

- Request early access.
- Request demo.
- Product feedback.
- Support/login issue.
- Partnership/design-partner inquiry.
- General question.

**Privacy implications:**

If any form collects name/email/company/project notes, a privacy policy and consent language should exist before public launch.

**Output recommendation:**

- Contact-flow decision brief with one chosen mechanism, fallback path, form fields, success state, and privacy requirement.

## Workstream F — Privacy and legal research

**Primary question:** What policy language is required before public lead capture and broader access?

**Facts to gather:**

- What personal data is collected by Supabase Auth.
- What profile/workspace/project/estimate data is stored.
- What contact-form data will be collected.
- Whether analytics/cookies are used. Current fact: `archestimator_cookie_consent` exists; GA4, Microsoft Clarity, and `ab_test` are planned after opt-in; PostHog is deferred unless a future ADR adopts it.
- Which providers process data: Supabase, hosting provider, email/contact provider, planned Google Analytics, planned Microsoft Clarity, scheduling provider if chosen, and PostHog only if adopted later.
- Retention/deletion process.
- Privacy contact address.
- Effective date.
- Target geography and applicable law assumptions.

**Sources:**

- actual app code/config;
- `.ai/03_plans/landing-page-improvement/ab-testing-gdpr-international-compliance/02-cookie-csp-dpa-gap-closure.md`;
- `.ai/03_plans/landing-page-improvement/ab-testing-gdpr-international-compliance/05-analytics-stack-decision.md`;
- Supabase docs/DPA/security docs;
- hosting provider docs;
- contact/email provider docs if selected;
- legal review or attorney-vetted template.

**Do not:** Draft final legal policy from generic assumptions. Create a fact matrix first.

## Workstream G — Security research

**Primary question:** Can Archestimator publish a lightweight security page without overclaiming?

**Facts to verify:**

- Supabase Auth usage.
- Workspace-scoped access model.
- RLS policies in migrations.
- Local-only dev auth bypass constraints.
- No service-role key exposure in client code.
- Hosting/deployment environment security facts.
- Backups/retention if known.
- Audit/logging if known.

**Potential safe language if verified:**

- `Authentication is handled through Supabase Auth.`
- `Project data is scoped by workspace membership.`
- `Row-level security policies are part of the database design.`
- `Development-only bypasses are disabled outside localhost and require server-only credentials.`

**Unsafe language unless externally verified:**

- SOC 2 compliant.
- ISO certified.
- Enterprise-grade security.
- Bank-level encryption.
- Fully compliant with a named regulation.
- Guaranteed data protection.

**Output recommendation:**

- Security/privacy claim matrix before publishing `/security`.

## Workstream H — SEO and content research

**Primary question:** Which public pages should target search, and which should only support conversion/trust?

**Likely route intent:**

- `/features` — product/category SEO and conversion.
- `/pricing` — branded/pricing-intent conversion.
- `/about` — trust and brand intent.
- `/contact` — conversion/support intent.
- `/privacy` — legal/trust intent.
- `/security` — trust intent, not broad SEO.
- `/resources` — SEO only after real articles/guides exist.

**Keyword clusters to validate later:**

- construction estimating software;
- construction cost estimating software;
- contractor estimating software;
- BOQ software;
- estimate revision tracking;
- construction proposal software;
- Excel estimate export;
- PDF proposal estimate;
- construction cost library;
- reusable cost components;
- value engineering proposal comparison;
- Philippines construction estimating software, if geography is approved.

**SEO research outputs:**

- route-specific page titles;
- meta descriptions;
- primary/secondary query intent;
- internal link plan;
- sitemap/robots requirements;
- content gaps for future resources.

**Do not:** Build thin resource pages or AI-generated filler articles.

## Research execution sequence

### Step 1 — Claims matrix

Complete first. Blocks features, pricing, security, and privacy pages.

### Step 2 — Contact/pricing decisions

Needed before `/pricing` and `/contact` page implementation.

### Step 3 — Feature-page content brief

Highest ROI public subpage after claims matrix.

### Step 4 — Privacy/security fact matrix

Required before lead capture or public security claims.

### Step 5 — SEO refresh

Use current search/competitor pages before implementation, especially for `/features` and `/pricing`.

### Step 6 — Founder/company facts

Required before `/about` final copy.

## Research deliverables to create later

Suggested future files in this folder or `.ai/13_research/`:

- `.ai/03_plans/landing-page-improvement/17-public-subpages-claims-matrix.md`
- `.ai/03_plans/landing-page-improvement/18-features-page-content-brief.md`
- `.ai/03_plans/landing-page-improvement/19-pricing-page-content-brief.md`
- `.ai/03_plans/landing-page-improvement/20-about-contact-content-brief.md`
- `.ai/03_plans/landing-page-improvement/21-privacy-security-fact-matrix.md`
- `.ai/13_research/public-subpages-seo-and-competitor-refresh-YYYY-MM-DD.md`

Numbering can be adjusted if the folder evolves; preserve chronological order.

## Acceptance criteria for research completion

Research is ready for implementation when:

- every public feature claim has a maturity label;
- pricing language has an approved meaning;
- contact destination is decided;
- about-page company/founder facts are approved;
- privacy/security fact matrix exists if forms or security claims are included;
- SEO metadata direction exists for each route;
- no page relies on fake proof, vague SaaS claims, or stale competitor pricing.
