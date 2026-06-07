---
title: Implementation And QA Plan
date: 2026-06-07
status: draft-for-implementation
---

# Implementation And QA Plan

## Implementation Approach

This is a staged frontend/content redesign. It should be implemented in small slices because the homepage already has auth-aware CTAs, A/B testing, consent behavior, smooth scrolling, security headers, and landing tests.

Before editing any existing symbol, follow the repo impact-analysis rules for the target component or function. Keep changes scoped to landing/public routes unless route alignment requires copy updates in `/features`, `/pricing`, `/about`, or `/contact`.

## Likely Affected Files

Homepage composition:

- `src/app/page.tsx`

Landing components:

- `src/components/landing/HeroSection.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/components/landing/SecondaryClaimSection.tsx`
- `src/components/landing/CompanyProofCarouselSection.tsx`
- `src/components/landing/company-proof-data.ts`
- `src/components/landing/SolutionSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/FAQSection.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `src/components/landing/SectionIntro.tsx`
- `src/components/landing/index.ts`

Potential new components:

- `src/components/landing/WorkflowVideoPlaceholderSection.tsx`
- `src/components/landing/AudienceFitSection.tsx`
- `src/components/landing/MethodTimelineSection.tsx`
- `src/components/landing/FeatureMaturitySection.tsx`
- `src/components/landing/WorkflowStoryboardSection.tsx`

Public routes to verify or lightly align:

- `src/app/features/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/about/page.tsx`
- `src/app/contact/page.tsx`

Tests:

- `tests/vitest/landing-ab-testing.test.tsx`
- `tests/vitest/landing-auth-state.test.ts`
- `tests/vitest/landing-company-proof.test.ts`
- `tests/vitest/landing-interactivity.test.tsx`
- `tests/vitest/closed-beta-pricing-copy.test.ts`
- `e2e/landing-audit.spec.ts`

## Staged Work Plan

### Phase 0. Baseline And Claims Audit

Tasks:

- Capture current homepage section list, links, headings, and CTAs.
- Create a claim matrix from current copy.
- Mark each claim live, partial, planned, or unsafe.

Exit criteria:

- There is no uncertainty about which claims can ship.
- Planned features have approved public labels.

### Phase 1. CTA And Closed-Beta Language

Tasks:

- Normalize anonymous CTAs to `Request beta access`.
- Keep `Open workspace` for authenticated/allowlisted paths.
- Update pricing/beta copy to say no public payment and pricing after beta.
- Remove or clarify `Try Workspace` where it implies public self-serve access.

Exit criteria:

- Anonymous visitors are not promised direct workspace access.
- Authenticated visitors still have a clear path to `/workshop`.

### Phase 2. First Workflow Proof

Tasks:

- Add `WorkflowVideoPlaceholderSection`.
- Place it directly after hero or as the hero continuation.
- Label it `Closed-beta workflow preview` and `Recording slot`.
- Use storyboard copy instead of app UI mockups.

Exit criteria:

- The first proof after the hero explains the workflow.
- No faux screenshot appears.

### Phase 3. Replace Placeholder Company Proof

Tasks:

- Remove or repurpose `CompanyProofCarouselSection`.
- Replace fake-company energy with workflow proof labels.
- Preserve tests by updating them to validate placeholder honesty rather than company proof.

Exit criteria:

- No customer-like placeholder logos remain.
- The page does not imply customer adoption.

### Phase 4. Narrative Sections

Tasks:

- Add problem narrative.
- Add audience fit section.
- Convert method section into a process/timeline.
- Add workflow storyboard cards.
- Add feature maturity truth block.

Exit criteria:

- The homepage tells a complete story before pricing/beta CTA.
- Feature maturity labels are visible in the page body.

### Phase 5. FAQ, Footer, And Route Alignment

Tasks:

- Rename FAQ section to `Before you request access`.
- Update FAQ answers for beta truth and less spreadsheet-hostile language.
- Update footer guardrails and route links.
- Verify `/features`, `/pricing`, `/about`, and `/contact` do not contradict the homepage.

Exit criteria:

- Public routes share the same beta and claim posture.
- Footer links have no dead anchors.

### Phase 6. Polish And Verification

Tasks:

- Desktop/mobile browser QA.
- Reduced-motion check.
- No-overflow check.
- Contrast check.
- Landing tests and targeted route tests.
- Claim-safety scan.

Exit criteria:

- All required checks pass or have a documented residual risk.

## Test Plan

### Unit/Vitest

Run targeted landing tests:

```sh
bun run vitest tests/vitest/landing-ab-testing.test.tsx tests/vitest/landing-auth-state.test.ts tests/vitest/landing-company-proof.test.ts tests/vitest/landing-interactivity.test.tsx
```

Run closed-beta copy tests:

```sh
bun run vitest tests/vitest/closed-beta-pricing-copy.test.ts tests/vitest/closed-beta-access.test.ts tests/vitest/beta-access-required-page.test.ts
```

### Static Checks

```sh
bun run lint
bun run type-check
git diff --check
```

Note:
- The current repo may have pre-existing Storybook type issues. If type-check fails on unrelated Storybook module types, document it as pre-existing and run the strongest targeted substitute.

### Browser QA

Use the in-app browser or Playwright against `http://localhost:3000/`.

Checks:

- Desktop: no horizontal overflow, readable section rhythm, no overlap.
- Mobile: CTA labels fit, video placeholders remain clear, no text overflow.
- Reduced motion: media/storyboard animation pauses or becomes static.
- Auth state: anonymous CTA says `Request beta access`; logged-in CTA says `Open workspace`.
- DOM: one H1, no `#product` dead anchor, no fake logo proof, no unlabeled planned capabilities.

### E2E

```sh
bun run playwright test e2e/landing-audit.spec.ts
```

If the local app is not already running, start the dev server first:

```sh
bun run dev
```

## Adversarial QA Matrix

| ID | Scenario | Expected signal |
| --- | --- | --- |
| QA-001 | Anonymous visitor reads CTAs | Primary CTA is `Request beta access`, not misleading public workspace access. |
| QA-002 | Logged-in visitor reads CTAs | Workspace CTA is available without hiding beta status. |
| QA-003 | Visitor scans only headings | Page communicates cost proposal workspace, closed beta, workflow proof, and beta access. |
| QA-004 | Visitor looks for customer proof | No fake logos, fake testimonials, fake metrics, or implied customer adoption. |
| QA-005 | Visitor checks planned workflows | Revision, proposal handoff, AI, and exports are labeled partial/planned as needed. |
| QA-006 | Reduced-motion user loads page | Three.js/media/storyboard effects do not create forced animation dependence. |
| QA-007 | Mobile visitor opens page | No overflow, clipped buttons, overlapping cards, or unreadable status chips. |
| QA-008 | Browser or crawler reads headings | Exactly one H1 and no repeated fake proof headings. |
| QA-009 | User follows nav links | Header/footer links resolve to active sections or public routes. |
| QA-010 | Security/privacy-sensitive reader scans AI copy | AI is not framed as autonomous pricing or decision-making; privacy note appears near AI if mentioned. |

## Release Gate

Do not ship until:

- The claim matrix has no unsafe public claims.
- Homepage and public routes have consistent closed-beta language.
- Video placeholders are visibly labeled.
- Placeholder company proof has been removed or transformed.
- Landing tests pass.
- Browser QA passes on desktop and mobile.
- Residual risks are documented in the final implementation report.
