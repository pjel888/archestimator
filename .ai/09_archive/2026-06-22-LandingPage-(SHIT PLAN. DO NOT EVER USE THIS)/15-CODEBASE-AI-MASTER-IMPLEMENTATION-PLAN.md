# Codebase AI Master Implementation Plan

Date: 2026-06-22
Scope: `.ai/03_plans/2026-06-22-LandingPage`
Status: implementation control document

This document is the master handoff for the codebase AI that will implement the
next Archestimator public homepage. It synthesizes docs `00` through `14`, the
current repo shape, the `/workshop` visual direction, and the parallel review
findings into one executable plan.

The outcome is a restrained, product-proof-led landing page for AEC cost
intelligence: professional, forward-looking, lightly fun, and rooted in the
real Archestimator application.

## Agent Operating Contract

Preferred workflow:

- Use `superpowers:subagent-driven-development` when available.
- Use `superpowers:executing-plans` when a single agent owns implementation.
- If those skills are unavailable, implement the phases in this document in
  order and preserve the same maker/checker split through ordinary code review.

Required behavior:

- Treat this doc as the execution control surface.
- Read the required source documents before editing.
- Verify live source before trusting any plan detail.
- Keep implementation scoped to the landing page, contact intent sink,
  public-shell CTA surfaces, tests, and proof assets.
- Do not create a parallel homepage route.
- Do not overwrite unrelated work in the dirty tree.
- Do not ship fake product proof, fake community links, fake trust badges, or
  unsupported metrics.

Stop condition:

- The homepage implements the requirements below.
- Targeted tests, type checks, build checks, route/bundle checks, and docs
  checks either pass or have a precise documented pre-existing gap.
- The final report distinguishes implementation completion from post-launch
  conversion-performance proof.

## Source Hierarchy

When sources conflict, resolve in this order:

1. Live repo reality: current source, current tests, `.ai/10_state/current-state.md`,
   `/workshop`, `src/app/globals.css`, `src/app/layout.tsx`, and the active
   landing implementation.
2. Product truth: current source and current state, then `ARCHESTIMATOR_MASTER.md`,
   then `archestimator-app-bible.md`, then the UX audit folder, then this
   landing plan pack.
3. This folder, `.ai/03_plans/2026-06-22-LandingPage`, over older landing folders.
4. `/workshop` over external references for Archestimator-specific spacing,
   colors, glass, grids, fonts, effects, and empty-space ratio.
5. External references only as design influence:
   - Intercom: top external flow reference and clarity benchmark.
   - Shepherd Insurance: professional warmth and light trust tone.
   - Interfere: best reference for showing the interface and software proof.
   - Paper: light workspace, craft, and proof density.
   - Save.design: restrained mixed-font hero emphasis only.
   - V7, ReadMe, Scorecard, Verichain, and Parley: secondary flow and section
     rhythm references.

Resolved ambiguities:

- Desktop Three.js is required as a progressive decorative hero layer. Mobile,
  reduced-motion, and WebGL-failure paths render a static designed fallback.
- Community is a conditional section slot. It renders only real, maintained,
  owner-approved destinations.
- Faithful TSX panels are the first implementation path for product proof unless
  clean, privacy-reviewed screenshots already exist.
- Plan-pack assets and production-served assets are separate:
  - planning evidence can live under this folder;
  - production assets live under `public/landing/` or source components under
    `src/components/landing/`.
- The MVP contact funnel keeps the current mailto transport and adds intent
  support. A public API/server-action lead form is out of scope unless a newer
  instruction explicitly adds lead persistence.

## Required First Reads

Read these before editing code:

- `.ai/03_plans/2026-06-22-LandingPage/00-DESIGN-STANDARDS.md`
- `.ai/03_plans/2026-06-22-LandingPage/01-WEB-DESIGN-REFERENCE-STUDY.md`
- `.ai/03_plans/2026-06-22-LandingPage/02-INTERCOM-ULTIMATE-REFERENCE-AND-ASSET-PLAN.md`
- `.ai/03_plans/2026-06-22-LandingPage/03-INTERCOM-SHEPHERD-DIRECTION.md`
- `.ai/03_plans/2026-06-22-LandingPage/04-HERO-THREEJS-BACKGROUND-DIRECTION.md`
- `.ai/03_plans/2026-06-22-LandingPage/05-PRODUCT-TRUTH-FOR-LANDING.md`
- `.ai/03_plans/2026-06-22-LandingPage/06-LANDING-CONTENT-ARCHITECTURE.md`
- `.ai/03_plans/2026-06-22-LandingPage/07-CODEBASE-AI-BUILD-BRIEF.md`
- `.ai/03_plans/2026-06-22-LandingPage/08-COPY-CTA-AND-CONTENT-BEST-PRACTICES.md`
- `.ai/03_plans/2026-06-22-LandingPage/09-PERFORMANCE-ACCESSIBILITY-AND-MOTION-BEST-PRACTICES.md`
- `.ai/03_plans/2026-06-22-LandingPage/10-LANDING-PAGE-BEST-PRACTICES-IMPLEMENTATION-PLAN.md`
- `.ai/03_plans/2026-06-22-LandingPage/11-PRODUCT-PROOF-ASSET-AND-COMMUNITY-CONTRACT.md`
- `.ai/03_plans/2026-06-22-LandingPage/12-CONVERSION-FUNNEL-CONTRACT.md`
- `.ai/03_plans/2026-06-22-LandingPage/13-IMPLEMENTATION-BLAST-RADIUS-AND-OPERATIONS.md`
- `.ai/03_plans/2026-06-22-LandingPage/14-READINESS-SCORECARD-AND-GATE.md`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/01-beta-product-thesis-and-prioritization.md`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/04-ux-state-accessibility-and-content-contracts.md`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/10-access-path-and-persona-taxonomy.md`
- `DESIGN.md`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/workshop/page.tsx`
- `src/components/workshop/dashboard/WorkshopDashboard.tsx`

Then inspect the active homepage and public-shell files:

- `src/app/page.tsx`
- `src/components/landing/gpt-taste/RedesignedLandingPage.tsx`
- `src/components/landing/gpt-taste/HeroSignalField.tsx`
- `src/components/landing/gpt-taste/LandingGsapMotion.tsx`
- `src/components/landing/PublicPageShell.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/components/landing/sections/LandingCTAs.tsx`
- `src/app/contact/page.tsx`
- `src/components/landing/ContactForm.tsx`
- `src/components/landing/LandingAnalyticsLoader.tsx`
- `src/lib/landing/seo-metadata.ts`
- `src/lib/landing/rate-limit.ts`

Inspect these proof sources before rendering product panels:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/activity-history.tsx`
- `src/components/workshop/ProposalExportPreviewDialog.tsx`
- `src/lib/proposal-export/`
- `src/app/workshop/library/page.tsx`
- `src/components/workshop/LibraryPageClient.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/app/workshop/library/templates/page.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/app/share/[token]/page.tsx`
- `src/components/share/ShareReviewWorkspace.tsx`
- `src/components/share/SharePageTabs.tsx`
- `src/components/share/SharePageSummaryCard.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharedLinkActivityFeed.tsx`
- `src/app/workshop/projects/[projectId]/page.tsx`
- `src/components/workshop/project-data/ProjectDataClient.tsx`

## Current Implementation Gap Audit

Verify these facts before starting because the source can move:

| Area | Current risk | Required resolution |
| --- | --- | --- |
| Active route | `src/app/page.tsx` renders `RedesignedLandingPage` through `PublicPageShell`. | Keep this route. Use `buildLandingMetadata` only if the final metadata benefits from the shared factory. |
| CTA copy | Current signed-out CTAs still use `Start free` and `/signup`. | Replace signed-out primary with `Request early access` to `/contact?intent=early-access`; secondary with `Book a walkthrough` to `/contact?intent=walkthrough`; signed-in primary remains `/workshop`. |
| Contact intent | `/contact` does not currently read `intent`. | Add typed `intent=early-access|walkthrough` handling and pass intent into `ContactForm`. |
| Contact transport | `ContactForm` is a client mailto form. | Keep mailto transport for MVP; add intent defaults and safe local validation. Do not add server persistence in this pass. |
| Product proof | Existing hero visual is abstract. | Add faithful TSX product proof panels based on real source components. |
| Pricing | Existing homepage has pricing cards. | Remove pricing cards from homepage; link to `/pricing`. |
| Three.js | `HeroSignalField.tsx` statically imports `three`. | Move `three` import inside the client effect with `await import("three")` and prove route bundle impact. |
| Tests | Tests lock old copy, old CTA, static `three`, pricing cards, and huge type clamps. | Update tests to enforce the new direction rather than preserve old behavior. |
| Community | Social section is desired but destinations can be absent. | Use a manifest. Render only maintained links; otherwise omit the section and record the omission. |
| Screenshot proof | Real screenshots can leak private data. | Use faithful TSX panels first; only use screenshots with demo data, manifest entries, token masking, metadata stripping, and privacy review. |

## Product And Design North Star

Identity:

- AEC-first cost intelligence and proposal software.
- Built for estimating teams, architects, engineers, consultants, developers,
  and contractors as one role in the broader AEC loop.
- Not contractor-first.
- Not generic quote software.
- Not AI-first marketing.
- Not a procurement, ERP, payments, or legal archive promise.

Page role:

- The homepage is a high-quality sneak peek.
- Detailed feature breakdowns move to `/features`.
- Detailed pricing moves to `/pricing`.
- Trust/security detail moves to `/trust`.
- Contact and early access move to `/contact`.

Visual posture:

- Base canvas is light gray/off-white, not black and not saturated orange.
- Signal orange is precise: `#F24405` and `#C63804`.
- Doto is a restrained robotic accent for labels, numbers, small technical
  chips, or one controlled word-level emphasis. It is not the body font and not
  a whole-page display style.
- Typography stays professional. Hero H1 max target: `clamp(2.4rem, 4vw, 4.35rem)`.
  Section title max target: `clamp(2rem, 3.1vw, 3.25rem)`.
- Use the `/workshop` grid, empty-space ratio, frosted surfaces, liquid glass,
  drop shadow, and drop blur as the internal benchmark.
- Use product interface proof over abstract decoration.

Reference formula:

```text
Archestimator /workshop visual system
+ Intercom landing flow clarity
+ Shepherd professional warmth
+ Interfere product interface proof density
+ Paper light workspace craft
+ Save.design restrained mixed-font emphasis
= final landing direction
```

## Architecture Decision Record

Decision: evolve the active GPT Taste homepage rather than replace the route.

Drivers:

- `src/app/page.tsx` already routes through `PublicPageShell` and
  `RedesignedLandingPage`.
- Existing tests, consent, auth-state handling, public shell, and metadata can
  be evolved without route churn.
- The desired page is a visual/content evolution, not a routing rewrite.

Rejected alternatives:

- Build a new parallel route and swap later: rejected because it duplicates
  public-shell contracts and increases test drift.
- Restore older 2026-06-21 landing stack: rejected because the latest direction
  elevates `/workshop`, Intercom, Shepherd, Interfere, Paper, and the current
  GPT Taste base.
- Add a server-backed lead database now: rejected for this pass because the
  current contact form is mailto, the homepage task does not require persistent
  lead capture, and public endpoint/database work raises security scope.

Consequences:

- `RedesignedLandingPage.tsx` is the integration hotspot.
- Product proof and community should be extracted into small components to keep
  the hotspot reviewable.
- CTA/contact work must include shared public-shell components so there are no
  dead `Start free` or `/signup` paths.
- Tests must be updated in the same implementation cycle.

## Pros And Cons

| Decision | Pros | Cons | Mitigation |
| --- | --- | --- | --- |
| Evolve active route | Least routing risk; preserves public shell, consent, auth-state, metadata, tests. | `RedesignedLandingPage.tsx` is already large. | Extract proof, content manifests, and community into focused files. |
| Faithful TSX product panels first | No screenshot privacy risk; easy to keep current; can mirror real components. | Less literal than live screenshots. | Use real source components and demo data; add screenshot upgrade path. |
| Keep mailto contact transport | Avoids new public endpoint, DB writes, spam surface, credentials. | Does not provide server-side success/error states. | Add clear local validation and intent prefill; document server-form gate for future persistence. |
| Dynamic desktop Three.js | Meets hero requirement while protecting initial route load. | Requires bundle verification and fallback states. | Import `three` inside effect; skip mobile/reduced-motion; verify build manifest. |
| Pricing as separate page | Homepage stays focused and mature. | Users needing price detail need one more click. | Add a clear pricing link and short "pricing lives on /pricing" note. |
| `/workshop` as visual authority | Makes public site feel native to the product. | Public page can become too dense if copied literally. | Borrow grid, spacing, glass, color, fonts, and proof surfaces; preserve landing flow. |
| Doto as accent | Gives the robotic Archestimator signature. | Overuse becomes gimmicky. | Restrict to labels, numbers, and one controlled hero emphasis. |

## SWOT Analysis

| Strengths | Weaknesses |
| --- | --- |
| Real `/workshop` visual language already exists. | Current homepage tests preserve stale copy and CTA behavior. |
| Existing public shell handles consent, auth-state, and layout framing. | Current landing component is a large integration file. |
| Strong plan pack covers brand, copy, proof, motion, security, and readiness. | Contact intent support is missing. |
| Signal orange and Doto create distinct identity without needing a new brand. | Real screenshots require demo-data discipline and privacy review. |
| Intercom plus Shepherd plus Interfere/Paper gives a balanced reference set. | Current Three.js import can bloat initial route bundles. |

| Opportunities | Threats |
| --- | --- |
| Product-proof-led homepage can feel more credible than generic SaaS pages. | Fake dashboards, stock imagery, and generic AI copy would damage trust. |
| `/pricing`, `/features`, and `/trust` can carry detail without bloating `/`. | Public form persistence could introduce spam and privacy risk if added casually. |
| Community links can establish distribution channels once maintained. | Analytics instrumentation can leak PII if not constrained. |
| Faithful TSX panels can later upgrade to clean screenshots. | Large hero type and heavy WebGL can make finance-adjacent software feel unserious. |
| Shared content manifests can make tests and future edits safer. | Multi-agent edits can conflict in `RedesignedLandingPage.tsx` and CTA files. |

## Parallel Work Ownership

Use these lanes when multiple coding agents are available. Do not split the same
file between lanes without one named integrator.

| Lane | Owner role | Write scope | Output |
| --- | --- | --- | --- |
| Lead integrator | `executor` or lead agent | `RedesignedLandingPage.tsx`, final imports, final section order | Coherent homepage assembly and final conflict resolution. |
| Funnel/contact | `executor` | `src/app/contact/page.tsx`, `ContactForm.tsx`, shared CTA/header/footer files, funnel tests | Intent handling and CTA route contract. |
| Proof/content | `executor` or `designer` | New `landing-content.ts`, `ProductProofFrame.tsx`, proof panel components | Claims ledger, proof manifest, faithful TSX product panels. |
| Motion/performance | `executor` | `HeroSignalField.tsx`, related tests | Dynamic Three.js, fallback paths, bundle proof. |
| Test/verification | `test-engineer` | `tests/vitest/*landing*`, public-cache, contact tests | Updated test matrix and verification evidence. |
| Security/readiness review | `verifier` or `ce-security-lens-reviewer` | Read-only unless fixing review gaps | No PII, no fake proof, no public endpoint creep, no unsupported claims. |

Conflict rules:

- One person owns `RedesignedLandingPage.tsx` integration.
- Funnel/contact owner owns every CTA route string and shared public-shell CTA
  surface.
- Motion owner can edit `HeroSignalField.tsx` independently.
- Proof/content owner creates new files first, then asks the lead integrator to
  import them.
- Test owner updates assertions after implementation owners finalize copy and
  route constants.

## Implementation Phases

### Phase 0 - Preflight And Baseline

Purpose: prove the starting point and prevent stale-plan execution.

Commands:

```sh
sed -n '1,80p' src/app/page.tsx
rg -n "Estimates that remember|pricingCells|HeroSignalField|roleSlices|bentoCards|Start free|/signup" src/components/landing src/app tests/vitest
rg -n "intent=early-access|intent=walkthrough|ContactForm|LandingCTAs|LandingHeader|LandingFooter" src/app src/components tests/vitest
git status --short
```

Acceptance:

- Active homepage still renders `RedesignedLandingPage`.
- Old CTA, pricing, hero, and Three.js import risks are inventoried.
- Dirty worktree state is understood. Unrelated changes are left untouched.
- The implementer knows which tests currently assert old behavior.

### Phase 1 - Content Manifests And Contracts

Purpose: centralize landing content, proof, and community decisions so tests can
enforce the page contract.

Create:

- `src/components/landing/gpt-taste/landing-content.ts`

Required exports:

```ts
export type LandingProofAsset = {
  id: string;
  mode: "faithful-tsx" | "screenshot";
  sourceRoutes: string[];
  sourceComponents: string[];
  proofClaim: string;
  privacyReviewed: boolean;
  generated: false;
};

export type LandingClaim = {
  id: string;
  claim: string;
  proofType: "source" | "product-panel" | "route" | "current-state";
  source: string;
  forbiddenUpgradeLanguage: string[];
};

export type LandingCommunityChannel = {
  id: "instagram" | "whatsapp" | "facebook" | "linkedin" | "youtube" | "x";
  label: string;
  href: string;
  maintained: boolean;
  owner: string;
  analyticsEvent: "landing_community_click";
};
```

Starter content rules:

- `landingClaims` includes every hero, proof, trust, beta, screenshot, and
  security claim that appears on the page.
- `landingProofAssets` includes every faithful panel and every screenshot.
- `landingCommunityChannels` is an empty array if no maintained real channels
  are available. Empty means the community section does not render.
- Do not place fake URLs in `landingCommunityChannels`.
- Do not mark generated imagery as product proof.

Acceptance:

- Final copy claims are traceable to source truth.
- Product proof has a manifest before merge.
- Community has a manifest or is omitted cleanly.

### Phase 2 - CTA And Contact Funnel

Purpose: fix the conversion path before visual work hides route drift.

Required CTA contract:

| Visitor state | Primary CTA | Primary href | Secondary CTA | Secondary href |
| --- | --- | --- | --- | --- |
| Signed out | Request early access | `/contact?intent=early-access` | Book a walkthrough | `/contact?intent=walkthrough` |
| Signed in | Open workspace | `/workshop` | Book a walkthrough | `/contact?intent=walkthrough` |

Modify:

- `src/components/landing/gpt-taste/RedesignedLandingPage.tsx`
- `src/components/landing/sections/LandingCTAs.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/app/contact/page.tsx`
- `src/components/landing/ContactForm.tsx`

Implementation details:

- Replace signed-out `Start free` labels on public landing CTA surfaces.
- Remove `/signup` as the homepage signed-out primary destination.
- Preserve signed-in `/workshop`.
- Parse `searchParams.intent` in `/contact` with the allowed values
  `early-access` and `walkthrough`.
- Pass a typed `initialIntent` prop into `ContactForm`.
- Map `early-access` to beta/design-partner inquiry copy.
- Map `walkthrough` to demo/walkthrough inquiry copy.
- Keep mailto transport in this pass.
- Local validation must keep labels persistent and avoid provider internals.
- If invalid intent is present, fall back to the generic contact state without
  throwing.

Public endpoint gate:

- Do not create an API route, server action, database table, or third-party
  scheduling/email integration for this phase.
- If a newer instruction adds persistent lead capture, stop and add a concrete
  endpoint/security note before code:
  validation schema, CSRF-equivalent posture, rate-limit key/store, spam
  control, length limits, safe errors, log redaction, RLS/service-role boundary,
  retention/deletion, rollback, and tests.

Acceptance:

- No public homepage path says `Start free`.
- No homepage signed-out CTA links to `/signup`.
- `/contact?intent=early-access` and `/contact?intent=walkthrough` are valid
  and visible in the form state.
- Signed-in homepage visitors can open `/workshop`.

### Phase 3 - Visual System And Layout

Purpose: make the page feel like Archestimator, not a generic SaaS template.

Modify:

- `src/components/landing/gpt-taste/RedesignedLandingPage.tsx`
- New extracted components under `src/components/landing/gpt-taste/`
- `src/app/page.tsx` only for metadata/factory alignment
- `src/app/globals.css` only if existing tokens cannot express the design

Visual requirements:

- Canvas: light gray/off-white with subtle depth.
- Orange: use Signal orange as an accent, not a full-page wash.
- Glass: use frosted surfaces, liquid-glass blur, layered drop shadow, and drop
  blur consistent with `/workshop`.
- Grid: borrow `/workshop` grid discipline, small labels, technical alignment,
  and controlled empty space.
- Type: moderate scale, professional density, Doto accents only.
- Hero: above-the-fold first screen says what Archestimator is, who it is for,
  why it is credible, and what the visitor should do next.
- First viewport must hint at the next section on desktop and mobile.
- No giant poster type.
- No purple/blue gradient default.
- No black-first Save.design clone.
- No decorative blobs/orbs.
- No nested card-in-card layouts.

Recommended component split:

- `LandingProductProof.tsx` for the product proof section.
- `ProductProofFrame.tsx` for the reusable glass/browser/app frame.
- `LandingCommunityStrip.tsx` for conditional community links.
- `landing-content.ts` for copy, claims, proof, and community manifests.

Acceptance:

- The page borrows `/workshop` spacing, grid, colors, fonts, glass, effects, and
  empty-space ratio.
- Hero text remains readable and professionally sized across desktop and mobile.
- Cards, tool surfaces, and CTA buttons have stable dimensions with no layout
  shift on hover/focus.

### Phase 4 - Product Proof And Section Architecture

Purpose: make the page prove the software quickly without overloading `/`.

Required section order:

1. Header and hero.
2. Product proof: estimate sheet, component/library memory, proposal/share loop.
3. Workflow loop: estimate to supplier/library memory to proposal/share.
4. Role/context fit for AEC teams.
5. Trust/readiness/security preview.
6. Pricing pointer to `/pricing`.
7. Conditional community slot.
8. Footer.

Product proof rules:

- Use faithful TSX panels first.
- Use real source components as the basis for visual structure and labels.
- Use demo-only values.
- Do not show real names, emails, company names, phone numbers, addresses,
  project identifiers, client identifiers, proposal tokens, or private estimate
  data.
- Mask any token-bearing URL.
- Add a manifest entry per panel or screenshot.
- Generated images can support editorial/background atmosphere only.

Suggested proof panel set:

| Panel | Proof source | User-facing point |
| --- | --- | --- |
| Estimate Sheet | `EstimateSheetContent`, row table, activity history | Costs, revisions, and scope live in one working sheet. |
| Component Library | `LibraryPageClient`, component library manager, templates browse | Pricing memory and reusable assemblies build up over time. |
| Proposal/Share | proposal export preview and share review components | The estimate turns into a client-facing proposal workflow. |

Section depth boundaries:

- Homepage gives the sneak peek.
- `/features` carries detailed capability pages.
- `/pricing` carries pricing.
- `/trust` carries deeper security and provider posture.
- `/contact` carries early access and walkthrough conversion.

Acceptance:

- Product proof appears before generic role or trust sections.
- The page never relies on abstract hero art as its main proof.
- Pricing cards are removed from the homepage.

### Phase 5 - Three.js Hero Signal Field

Purpose: preserve Philip's requested subtle Three.js above-the-fold signal field
without slowing the site.

Modify:

- `src/components/landing/gpt-taste/HeroSignalField.tsx`
- `tests/vitest/landing-interactivity.test.tsx`
- `tests/vitest/public-font-lcp-audit.test.ts`

Implementation requirements:

- Remove static `import * as THREE from "three"`.
- Use dynamic import inside the effect:

```ts
const THREE = await import("three");
```

- Render no WebGL on mobile-width viewports.
- Render no WebGL for `prefers-reduced-motion: reduce`.
- Render no WebGL when WebGL is unsupported.
- Keep the static/CSS fallback visually complete.
- Keep renderer alpha enabled, low-power preference, capped pixel ratio, and
  disposal cleanup.
- Pause or avoid animation when hidden/offscreen if the implementation adds an
  observer.
- Keep the hero text and CTA independent of canvas load.
- The canvas must be decorative and hidden from assistive technology.

Acceptance:

- `three` is not statically imported by the landing source.
- Build evidence shows `three` is not in the initial `/` page chunk list, or the
  exception is documented with exact build output.
- Mobile and reduced-motion users receive a designed static hero.

### Phase 6 - Analytics, Security, SEO, And Assets

Purpose: avoid public-surface regressions while improving conversion.

Analytics:

- Keep GA/Clarity-style tracking behind consent through
  `LandingAnalyticsLoader`.
- Do not send names, emails, company names, phone numbers, addresses, project
  identifiers, client identifiers, proposal tokens, estimate values, or free
  text to analytics.
- Allowed event properties are enum-like: CTA type, section id, destination id,
  visitor state, and consent state.
- Document current Vercel Analytics posture if it is globally mounted.

Security:

- No client-side Supabase writes from landing/contact code.
- No new database migration unless lead persistence enters scope.
- No third-party scheduling/email integration unless credentials, data sharing,
  error handling, and logging rules are documented.
- Public form endpoint rules apply only if a public endpoint is added.

SEO:

- Metadata must be AEC-first.
- Title and description should mention cost intelligence or cost proposal
  software for AEC teams.
- Canonical stays `/`.
- Open Graph copy must not claim launched scale, automation guarantees, or fake
  customers.

Assets:

- Production-served images go under `public/landing/`.
- Plan-pack references and evidence can remain under this plan folder.
- Screenshots require demo data, privacy review, stable dimensions, compression,
  and metadata stripping.
- Product screenshots must not be generated images.

Acceptance:

- Consent denial blocks GA/Clarity-style events.
- No PII appears in analytics payloads or logs.
- Metadata is accurate for the current beta product.
- Asset provenance is clear.

### Phase 7 - Tests And Verification

Purpose: update stale tests and prove the new behavior.

Update tests:

- `tests/vitest/landing-amigo-redesign.test.tsx`
- `tests/vitest/landing-interactivity.test.tsx`
- `tests/vitest/public-font-lcp-audit.test.ts`
- `tests/vitest/landing-auth-state.test.ts`
- `tests/vitest/landing-consent.test.tsx`
- `tests/vitest/landing-security-headers.test.ts`
- `tests/vitest/public-page-shell.test.tsx`
- `tests/vitest/public-cache-safety-harness.test.ts`
- `tests/vitest/landing-company-proof.test.tsx`
- Existing or new contact-form test covering `intent` prefill and mailto output.

Test assertions must prove:

- AEC-first identity appears in metadata or first screen.
- Signed-out primary CTA uses `Request early access` and
  `/contact?intent=early-access`.
- Secondary walkthrough CTA uses `/contact?intent=walkthrough`.
- Signed-in primary CTA uses `/workshop`.
- `/signup` is not the homepage signed-out primary destination.
- Homepage pricing cards are gone.
- Pricing detail is routed to `/pricing`.
- Product proof section exists and is backed by manifest entries.
- Community renders only maintained real links or is omitted.
- `HeroSignalField.tsx` uses dynamic `import("three")`.
- Reduced-motion/mobile/static fallback is preserved.
- No giant typography clamps are reintroduced.
- Analytics event contract contains no PII fields.

Verification commands:

```sh
rg -n "Start free|/signup|Request early access|/contact\\?intent|pricingCells|import \\* as THREE|from \"three\"|from 'three'" src/app src/components tests/vitest
bun run type-check
bun run test:dom -- tests/vitest/landing-amigo-redesign.test.tsx tests/vitest/landing-interactivity.test.tsx tests/vitest/public-font-lcp-audit.test.ts tests/vitest/landing-auth-state.test.ts tests/vitest/landing-consent.test.tsx tests/vitest/landing-security-headers.test.ts tests/vitest/public-page-shell.test.tsx tests/vitest/public-cache-safety-harness.test.tsx tests/vitest/landing-company-proof.test.ts
bun run build
git diff --check -- src/app/page.tsx src/app/contact/page.tsx src/components/landing src/app/globals.css tests/vitest
```

Bundle verification after `bun run build`:

```sh
node - <<'NODE'
const fs = require("fs");
const manifestPath = ".next/app-build-manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entries = manifest.pages["/page"] || manifest.pages["/"] || [];
let failed = false;
for (const file of entries) {
  const path = `.next/${file}`;
  if (!fs.existsSync(path)) continue;
  const source = fs.readFileSync(path, "utf8");
  if (/three|WebGLRenderer|three\.module/.test(source)) {
    console.error(`three appears in initial homepage chunk: ${file}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
NODE
```

Known baseline:

- Full `bun run validate` is known red on main for unrelated charts/design-lint
  issues and the all-DOM phase can hang. Use the targeted matrix above unless
  a higher-risk code path justifies broader validation.

### Phase 8 - Review, Rollback, And Record

Purpose: close with evidence and make future work cheaper.

Required review:

- Maker/checker review of claims, product proof, CTA routes, Three.js fallback,
  analytics privacy, and community links.
- Anti-generic-SaaS QA gate.
- Security/privacy pass when `/contact`, analytics, screenshots, or any public
  endpoint changed.

Rollback plan:

- Route rollback is normal git revert of `src/app/page.tsx` and landing source
  files.
- No database rollback is needed if this plan avoids migrations.
- If persistence enters scope, include migration rollback and data-retention
  handling in the implementation note before merge.
- Keep product-proof assets removable without breaking route render.

Record:

- Update `.ai/10_state/current-state.md` with implementation facts, validation
  evidence, and any skipped checks.
- If screenshots are added, store the proof manifest and privacy review result.
- If community is omitted, record the reason as "no maintained owner-approved
  channels available" rather than rendering placeholders.

## Interaction State Matrix

| Surface | Default | Hover/focus/active | Mobile/reduced-motion | Empty/error/success | Signed-in/out |
| --- | --- | --- | --- | --- | --- |
| Header nav | Compact links to product proof, features, pricing, trust/contact. | Visible focus ring, no layout shift, active anchor state if implemented. | Collapses without overlap; tap targets at least 44px. | No broken anchors. | Auth-aware CTA changes only the primary command. |
| Mobile menu | Closed by default. | Button has accessible name and expanded state. | Menu does not cover hero CTA permanently. | Escape/outside close if implemented. | Same CTA routing as desktop. |
| Primary CTA | Request early access or Open workspace. | Orange/glass state with stable width. | Wraps cleanly; no text clipping. | Disabled/loading state only if a submission action exists. | Signed out: `/contact?intent=early-access`; signed in: `/workshop`. |
| Secondary CTA | Book a walkthrough. | Clear focus and hover. | Stacks under primary when needed. | No empty href. | Always `/contact?intent=walkthrough`. |
| `#product-proof` anchor | Scrolls to product proof. | Focus target is visible after navigation. | Anchor lands with section title visible. | No dead anchor. | Same for all visitors. |
| Proof tabs/rail | First proof selected. | Keyboard arrow/tab behavior works if tabbed. | Converts to stacked panels if tabs become cramped. | If one proof item exists, render single panel without dead tabs. | Same for all visitors. |
| Role accordion/cards | AEC roles shown without contractor-first ordering. | Card-as-link states are clear. | Cards stack without text overflow. | No empty role placeholders. | Same for all visitors. |
| Community links | Render only maintained channels. | External link focus is visible and label is specific. | Icon/link labels stay tappable. | Empty manifest omits section. | Same for all visitors. |
| Three.js hero | Decorative animated net/signal field on capable desktop. | Pointer response stays subtle and nonessential. | Static fallback on mobile/reduced-motion/WebGL fail. | Canvas failure does not affect text or CTA. | Same for all visitors. |
| Contact intent handoff | Intent preselects form purpose/copy. | Inputs keep labels and focus states. | Form fields stack and remain readable. | Validation errors are inline; mailto success path does not claim server receipt. | Signed-in visitors can still request walkthrough. |

## Section-By-Section Visual Quality Lock

| Section | Intent | Visual object | Borrow from `/workshop` | External influence | Rejection criteria |
| --- | --- | --- | --- | --- | --- |
| Header | Orient and convert without visual noise. | Slim glass/nav bar. | Sidebar/header restraint, small technical labels. | Intercom clarity. | Bulky marketing nav, oversized CTA, hidden primary route. |
| Hero | Explain what it is, who it is for, why it matters, what to do. | Product-adjacent hero with subtle Three.js signal field. | Gray canvas, Signal orange, grid, controlled empty space. | Intercom flow, Save.design word-level type contrast. | Giant fonts, black-first page, orange flood, abstract-only proof. |
| Product proof | Prove the software exists and is useful. | Faithful TSX estimate/library/proposal panels. | Real app glass, tables, chips, panels. | Interfere and Paper proof density. | Fake dashboard, generated UI, private data, generic bento. |
| Workflow loop | Show estimate-to-proposal memory. | Connected steps or compact operational rail. | Workshop process/status treatment. | ReadMe flow clarity. | Vague "AI automation" claims. |
| AEC fit | Show roles without contractor-first framing. | Compact role cards or rail. | Dense professional cards. | Shepherd warmth. | Contractor-only copy, stock construction imagery. |
| Trust preview | Establish beta honesty and safety. | Light trust/security strip. | Small labels and system status feel. | Intercom/Shepherd trust tone. | Fake badges, fake compliance, unsupported logos. |
| Pricing pointer | Send detail to `/pricing`. | Short pricing teaser link. | Quiet utility surface. | Intercom concise routing. | Homepage pricing grid/cards. |
| Community | Invite follow-through only with real channels. | Link strip or compact social row. | Footer/control density. | Product community references. | Empty icons, fake channels, "coming soon" clutter. |
| Footer | Close with routes and support. | Minimal public footer. | Calm gray/glass language. | Intercom footer hierarchy. | Link dumps, dead links, repeated hero claims. |

## Claims-To-Proof Ledger

The final implementation must keep a claims ledger in `landing-content.ts`.
Every final claim on the page must map to one of these proof types.

Starter ledger:

| Claim area | Allowed claim shape | Proof type | Source |
| --- | --- | --- | --- |
| AEC identity | Cost intelligence/proposal software for AEC estimating teams. | current-state/source | `current-state.md`, UX audit, active app. |
| Estimate sheet | Estimates keep scope, costs, revisions, and activity in one working surface. | product-panel | Estimate sheet source files. |
| Pricing memory | Reusable assemblies/components help teams build from prior work. | product-panel | Library and template source files. |
| Proposal loop | Estimates can flow toward proposal/share review. | product-panel/source | Proposal export and share route source. |
| Closed beta | The product is in pre-launch closed-beta MVP stage. | current-state | `.ai/10_state/current-state.md`. |
| Pricing detail | Pricing belongs on a separate pricing page. | route | `/pricing` link and public route state. |
| Trust detail | Trust/security depth belongs on `/trust`. | route | `/trust` link and public route state. |

Forbidden upgrade language:

- "fully automated"
- "guaranteed savings"
- "used by thousands"
- "enterprise-grade compliance" without source proof
- "SOC 2" without source proof
- "bank-level security"
- "AI replaces estimators"
- "instant accurate estimates"
- "contractor-first platform"

## Proof Asset Manifest

Required manifest location:

- `src/components/landing/gpt-taste/landing-content.ts`

Required served asset location when image files are used:

- `public/landing/product-proof/`

Required planning evidence location when screenshots are captured during
planning or QA:

- `.ai/03_plans/2026-06-22-LandingPage/app-screenshots/`

Manifest acceptance:

- One `LandingProofAsset` entry per faithful TSX panel or screenshot.
- `generated` is always `false` for product proof.
- `privacyReviewed` is `true` before screenshot assets ship.
- `sourceRoutes` and `sourceComponents` are populated.
- Screenshot assets have stable dimensions and stripped metadata.

## Community Channel Manifest

Required manifest location:

- `src/components/landing/gpt-taste/landing-content.ts`

Rules:

- Include Instagram, WhatsApp, Facebook, LinkedIn, YouTube, or X only when the
  destination is real, maintained, owner-approved, and safe for public visitors.
- Each channel requires exact URL, owner, maintained status, label, accessible
  name, target behavior, and `landing_community_click` event id.
- Links open with safe external attributes when leaving the site.
- Empty channel array omits the entire community section.
- Do not render "coming soon" community placeholders.

## Security And Privacy Gate

Pass only when all are true:

- No client-side Supabase writes from landing/contact code.
- No new public endpoint is added in the MVP pass.
- If a public endpoint is added by later scope, it has server validation, field
  length bounds, CSRF-equivalent protection, rate limiting/throttling, spam
  control, safe errors, and redacted logs.
- No PII enters analytics, logs, proof screenshots, or public asset names.
- No third-party script is added before consent without an implementation note.
- Screenshots use demo/local data, hide tokens, strip metadata, and pass privacy
  review.
- Three.js is decorative and cannot block the hero text or CTA.

## Accessibility And Performance Gate

Pass only when all are true:

- WCAG 2.2 AA contrast and focus states hold across nav, CTAs, cards, social
  links, forms, and proof controls.
- Touch targets are at least 44px where practical on mobile.
- Text never overlaps or clips at mobile or desktop viewports.
- Reduced-motion users do not need animation to understand the page.
- Hero LCP text is not dependent on canvas/image load.
- Images have stable width/height or aspect-ratio constraints.
- Desktop Three.js is lazy, disposable, and outside the initial route chunk.
- Mobile users do not pay the WebGL cost.

## Anti-AI-Slop QA Gate

Reject the implementation before merge if any of these appear:

- 3-column generic feature grid as the main page body.
- Purple/blue gradient SaaS palette.
- Icon-in-circle feature cards as the dominant visual language.
- Fake dashboards.
- Fake logo walls.
- Fake testimonials.
- Fake trust/compliance badges.
- Giant poster typography.
- Generic "AI productivity" language.
- Contractor-first positioning.
- Unrelated stock construction imagery.
- Generated product UI screenshots.
- Decorative blobs/orbs.
- Black-first Save.design clone.
- Homepage pricing card grid.
- Dead social/community icons.
- "Coming soon" placeholders in the public page.

## Final Acceptance Checklist

- Homepage is AEC-first and not contractor-first.
- `/workshop` visual language is visibly present in grid, spacing, color,
  frosted surfaces, liquid glass, shadows, typography, and empty space.
- Intercom is reflected in flow clarity, not copied visually.
- Shepherd warmth is present without fake trust.
- Interfere/Paper influence appears in product proof density and light workspace
  feel.
- Hero H1 and section titles stay professionally sized.
- Doto is an accent, not the main reading font.
- Primary signed-out CTA is `Request early access` to
  `/contact?intent=early-access`.
- Secondary CTA is `Book a walkthrough` to `/contact?intent=walkthrough`.
- Signed-in primary CTA is `Open workspace` to `/workshop`.
- `/contact` handles both intent values.
- Homepage pricing cards are removed.
- Community renders only real maintained channels or is omitted.
- Product proof uses faithful TSX panels or privacy-reviewed screenshots.
- Product proof manifest and claims ledger exist.
- Three.js is dynamic, desktop-only, decorative, and fallback-safe.
- No PII leaks to analytics, screenshots, logs, or generated assets.
- Targeted tests, type check, build, bundle verification, and diff check have
  fresh evidence.

## Completion Report Template

Use this shape in the final implementation report:

```md
Implemented:
- <short list of route/component/content changes>

Verification:
- <command>: <pass/fail and key evidence>
- <command>: <pass/fail and key evidence>

Security/privacy:
- Contact transport: mailto intent sink, no new endpoint, no DB writes.
- Analytics: no PII events; consent gate preserved.
- Proof assets: manifest entries and privacy status.

Known gaps:
- <only real gaps, including pre-existing validate reds if relevant>

Rollback:
- <files/routes/assets to revert if needed>
```
