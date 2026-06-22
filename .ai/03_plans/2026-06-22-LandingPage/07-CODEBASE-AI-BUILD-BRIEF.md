# Codebase AI Build Brief

Date: 2026-06-22
Scope: `.ai/03_plans/2026-06-22-LandingPage`

Use this as the handoff for a future codebase AI implementing the next
Archestimator landing page. It is not asking the future AI to implement now; it
defines the required source reads, product boundaries, and acceptance checks.

## Required First Reads

Read these before touching landing code:

1. `.ai/03_plans/2026-06-22-LandingPage/00-DESIGN-STANDARDS.md`
2. `.ai/03_plans/2026-06-22-LandingPage/01-WEB-DESIGN-REFERENCE-STUDY.md`
3. `.ai/03_plans/2026-06-22-LandingPage/02-INTERCOM-ULTIMATE-REFERENCE-AND-ASSET-PLAN.md`
4. `.ai/03_plans/2026-06-22-LandingPage/03-INTERCOM-SHEPHERD-DIRECTION.md`
5. `.ai/03_plans/2026-06-22-LandingPage/04-HERO-THREEJS-BACKGROUND-DIRECTION.md`
6. `.ai/03_plans/2026-06-22-LandingPage/05-PRODUCT-TRUTH-FOR-LANDING.md`
7. `.ai/03_plans/2026-06-22-LandingPage/06-LANDING-CONTENT-ARCHITECTURE.md`
8. `.ai/03_plans/2026-06-22-LandingPage/08-COPY-CTA-AND-CONTENT-BEST-PRACTICES.md`
9. `.ai/03_plans/2026-06-22-LandingPage/09-PERFORMANCE-ACCESSIBILITY-AND-MOTION-BEST-PRACTICES.md`
10. `.ai/03_plans/2026-06-22-LandingPage/10-LANDING-PAGE-BEST-PRACTICES-IMPLEMENTATION-PLAN.md`
11. `.ai/03_plans/2026-06-22-LandingPage/11-PRODUCT-PROOF-ASSET-AND-COMMUNITY-CONTRACT.md`
12. `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/01-beta-product-thesis-and-prioritization.md`
13. `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/04-ux-state-accessibility-and-content-contracts.md`
14. `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/10-access-path-and-persona-taxonomy.md`

Then inspect live implementation files:

- `src/app/page.tsx`
- `src/components/landing/gpt-taste/RedesignedLandingPage.tsx`
- `src/components/landing/gpt-taste/HeroSignalField.tsx`
- `src/components/landing/PublicPageShell.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`

For product screenshots or faithful interface panels, inspect:

- Estimate Sheet route and composition:
  `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`,
  `src/components/workshop/EstimateWorkspaceClient.tsx`,
  `src/components/workshop/EstimateSheetContent.tsx`, and
  `src/components/workshop/estimate-sheet/`.
- Editable rows/table:
  `src/components/workshop/estimate-sheet/rows/row-table.tsx`.
- Activity and history:
  `src/components/workshop/estimate-sheet/activity-history.tsx`.
- Proposal export preview:
  `src/components/workshop/ProposalExportPreviewDialog.tsx` and
  `src/lib/proposal-export/`.
- Component library:
  `src/app/workshop/library/page.tsx`,
  `src/components/workshop/LibraryPageClient.tsx`, and
  `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`.
- Templates:
  `src/app/workshop/library/templates/page.tsx`,
  `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`,
  and `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`.
- Shared proposal route and panels:
  `src/app/share/[token]/page.tsx`,
  `src/components/share/ShareReviewWorkspace.tsx`,
  `src/components/share/SharePageTabs.tsx`,
  `src/components/share/SharePageSummaryCard.tsx`,
  `src/components/share/SharePageDecision.tsx`,
  `src/components/share/SharePageComments.tsx`, and
  `src/components/share/SharedLinkActivityFeed.tsx`.
- Workshop/project dashboard support proof:
  `src/app/workshop/page.tsx`,
  `src/components/workshop/dashboard/WorkshopDashboard.tsx`,
  `src/app/workshop/projects/[projectId]/page.tsx`, and
  `src/components/workshop/project-data/ProjectDataClient.tsx`.

## Product Identity Contract

The homepage is AEC-first.

Required:

- say AEC in metadata, hero support, or first screen;
- frame Archestimator as cost intelligence / cost proposal software for AEC
  teams;
- treat contractors as one role, not the identity;
- use the estimate-to-proposal loop as the page's narrative spine.

Forbidden:

- contractor-first homepage narrative;
- generic quote-heavy business narrative;
- AI-first narrative;
- dashboard-first SaaS narrative;
- procurement/ERP/payments/legal archive promises.

## Implementation Target

The active homepage is currently:

- `src/app/page.tsx`, which renders `RedesignedLandingPage`
  (`src/app/page.tsx:1-29`);
- `src/components/landing/gpt-taste/RedesignedLandingPage.tsx`, which currently
  contains the hero, bento, proof cards, marquee, role cards, pricing block, and
  footer;
- `src/components/landing/gpt-taste/HeroSignalField.tsx`, which provides the
  Three.js orange signal field.

Do not create a parallel landing page unless the routing plan explicitly changes.
Prefer evolving the active route and component set.

First-party design reference: inspect `/workshop` before major visual changes.
The landing page should borrow its calm gray canvas, tight grid, liquid-glass
surface language, small numeric/technical labels, Signal orange precision, and
controlled empty space. Treat the `/workshop` spacing ratio, fonts, grid, colors,
and effects as the internal benchmark for professional Archestimator craft.

Current code already contains useful AEC-first anchors:

- `src/app/page.tsx` metadata describes "AEC estimating teams".
- The landing footer in `RedesignedLandingPage.tsx` already says "The cost
  intelligence layer for AEC teams..." and should be preserved or strengthened.

Current code also contains drift to correct in a future implementation:

- The hero headline "Estimates that remember every job" is not wrong, but it is
  weaker than the master control line "Your cost intelligence layer."
- The role slice includes Contractors as one card. Keep it as one role, but do
  not make it the page's lead identity.
- The active page still relies on abstract proof cards and generated visual
  textures. Replace the most important ones with real or faithful product
  interface proof.
- The active page includes a pricing block. The next direction should move
  pricing depth off the homepage and keep `/pricing` as the dedicated pricing
  evaluation page.

## Hero Requirements

The hero must include:

- AEC-first support copy;
- product proof in the first viewport;
- a subtle Three.js signal field or equivalent progressive enhancement;
- light/gray canvas;
- frosted/liquid-glass product frame;
- no huge poster typography;
- use the professional type targets in doc `08` instead of the current 6rem-scale
  clamps;
- CTA pair for early access and walkthrough.

Recommended hero copy:

> Your cost intelligence layer.
>
> Build AEC estimates from your own prices and suppliers, keep every revision on
> the record, and send proposals clients can review and approve.

Potential alternate H1:

> Cost proposals that remember the work.

Use the canonical H1 unless the visual pass proves the warmer alternate works
better. The support copy must still say AEC and cost intelligence above the fold.
Keep hero and section copy within the budgets in doc `08`.

Implementation guard:

- `HeroSignalField.tsx` already has good performance posture: no mobile WebGL
  below 1024px, reduced-motion support, low-power renderer, capped pixel ratio.
  Preserve those properties if refactoring.

## Product Proof Requirements

The homepage should show product proof in this order:

1. Estimate Sheet with project tree and rows.
2. Reusable library/templates panel.
3. Revision/Activity record.
4. Shared proposal recipient view.
5. XLSX export and charts as supporting proof.

When real screenshots are available, use them. If not, build faithful in-app
mock panels from real component language and realistic demo data. Do not use fake
customer names, fake logos, fake adoption metrics, or fake testimonials.

Product-proof mapping:

| Landing proof | Source surface to inspect |
| --- | --- |
| Estimate Sheet | `EstimateWorkspaceClient.tsx`, `EstimateSheetContent.tsx`, `estimate-sheet/rows/row-table.tsx` |
| Row/revision trust | `estimate-sheet/activity-history.tsx`, `SharedLinkActivityFeed.tsx` |
| Proposal export | `ProposalExportPreviewDialog.tsx`, `src/lib/proposal-export/` |
| Library/templates | `LibraryPageClient.tsx`, `ComponentLibraryManager.tsx`, `TemplatesBrowseManager.tsx` |
| Shared review | `src/app/share/[token]/page.tsx`, `ShareReviewWorkspace.tsx`, `SharePageTabs.tsx`, `SharePageDecision.tsx`, `SharePageComments.tsx` |
| Dashboard/workshop support proof | `WorkshopDashboard.tsx`, project dashboard page, `ProjectDataClient.tsx` |

## Section Order

Use this page order unless there is a stronger reason:

1. Hero with product proof.
2. Product proof strip: Estimate Sheet / Library / Proposal Record.
3. Spreadsheet problem.
4. How the cost intelligence layer works.
5. Live workflow chapters.
6. Who it is for.
7. Trust and proof honesty.
8. Founder/about insert.
9. Community/follow-along strip.
10. Final CTA.

The homepage should be a high-quality sneak peek into the app. Put detailed
feature breakdowns on `/features`, pricing on `/pricing`, claim/security
details on `/trust`, founder narrative on `/about`, and walkthrough/design
partner conversion on `/contact`.

## Copy And Claim Checks

Before finishing, scan the page for these forbidden strings or concepts:

- "contractor-first"
- "the only tool"
- "fully automated"
- "guaranteed"
- "industry standard"
- "legal archive"
- "immutable audit trail"
- "procurement platform"
- "purchase order"
- "payment"
- public pricing numbers
- AI as a hero feature
- pricing cards on the homepage

Positive strings/concepts that should appear:

- AEC;
- cost intelligence layer;
- cost estimate or cost proposal;
- reusable library;
- revisions or Activity;
- client review/approve/comment;
- early access or walkthrough.
- follow/community channel labels if real links exist.

## Visual Checks

The page should read as:

- professional AEC/finance-adjacent software;
- forward-looking, not playful consumer tech;
- light/gray dominant with Signal orange as a precise accent;
- liquid glass/frosted product surfaces;
- Intercom-like flow and clarity;
- Shepherd-like professional warmth;
- Interfere-like software-interface proof;
- Paper/Save.design-like craft, but not black-site dominant.

Avoid:

- oversized type beyond the professional range;
- decorative cards that do not show product substance;
- marketing gradients/orbs;
- construction cliches;
- stock people/worker illustrations;
- one-note orange wash.

## Community / Social Requirements

Consider a lightweight community/follow area near the footer or final CTA.

Channels to support if real links are available:

- Instagram;
- WhatsApp;
- Facebook;
- LinkedIn;
- email/newsletter.

Implementation rules:

- Use simple icon+label links, not large social-proof cards.
- Do not imply a large existing community unless there is proof.
- Do not show placeholder or dead social links.
- For WhatsApp, use a maintained number or group link only.
- Keep the section professional: "Follow the build", "Join the early community",
  or "Get launch updates" fits better than hype/community-growth copy.

## Verification For Future Code Changes

For docs-only changes:

```sh
git diff --check -- .ai/03_plans/2026-06-22-LandingPage
```

For landing implementation changes, run the smallest checks that prove the edit:

```sh
bun run type-check
bunx vitest run tests/vitest/closed-beta-pricing-copy.test.ts tests/vitest/contact-form-mailto.test.tsx tests/vitest/landing-security-headers.test.ts
```

Warning: the current `tests/vitest/landing-amigo-redesign.test.tsx` encodes the
older hero copy, `Start free` CTA, and giant type scale. If following this plan,
update those expectations to the new AEC-first copy, CTA contract, and restrained
type scale.

Use browser/Playwright proof only when the claim needs rendered layout,
interaction, responsive behavior, canvas proof, or screenshot evidence. The
project guardrail is explicit: browser automation is opt-in evidence, not a
default gate for every landing copy or style edit.

## Stop Condition

Do not call the landing page ready until:

- AEC-first positioning is visible above the fold.
- Product proof is visible above the fold.
- The estimate-to-proposal loop is understandable without reading feature docs.
- Planned capabilities are not presented as shipped.
- Contractor-first drift is removed.
- The visual language matches the standards in this folder.
- Product-proof screenshots or faithful panels follow doc `11`.
- Pricing depth is removed from the homepage and routed to `/pricing`.
- Community/social follow links are included or intentionally omitted because no
  live channels exist yet.
- Three.js and image additions do not violate the performance targets in doc `09`.
- Targeted verification has run or the validation gap is explicitly stated.
