# UNIT-002 — Build Owned Shell and Chrome

**Status:** READY  
**Depends on:** UNIT-001  
**Goal:** Build the announcement, page-owned header, accessible mobile navigation, and page-owned footer without touching shared landing chrome.

## Owned paths

- `src/components/landing/new-redesign/NewLandingHeader.tsx`
- `src/components/landing/new-redesign/NewLandingFooter.tsx`
- `src/components/landing/new-redesign/interactions/MobileMenu.client.tsx`
- chrome-only additions to `tokens.module.css`

## Implementation

1. Build a `48px` dark announcement with the design-partner status line and the canonical primary destination.
2. Build the `52px` narrow / `68px` desktop header using `ArchestimatorLogo` from `src/components/brand/ArchestimatorLogo.tsx`; preserve the component unchanged.
3. Add desktop anchor navigation exactly as defined: Product, Workflow, Context, Trust.
4. Add the one primary CTA with Signal fill and dark ink. Do not add login, auth-aware text, a walkthrough CTA, or a sample-proposal CTA.
5. Build `MobileMenu.client.tsx` as the smallest possible client island:
   - semantic button with `aria-expanded`/`aria-controls`;
   - Escape closes;
   - focus returns to the trigger;
   - selection closes;
   - body scroll remains usable;
   - no full-screen animated overlay.
6. Build the footer from verified existing routes only and the category descriptor. Do not import the shared footer.
7. Apply sticky stack offsets and `scroll-margin-top` from the central tokens.
8. Ensure header/footer are server-rendered; only the menu state is client-side.

## Acceptance

- One announcement and one owned header render in the new tree.
- Header height and sticky offsets match the architecture at every breakpoint.
- Canonical logo/wordmark and Signal orange are the only old visual-brand carryovers.
- Menu is keyboard-operable and does not trap focus after close.
- All anchors resolve to IDs declared in the section contract.
- Footer contains no invented route.
- Shared `LandingHeader.tsx`, `LandingFooter.tsx`, and active `UX-CTA-001` ownership remain untouched.

## Decisive verification

- Source inspection of semantic landmarks, nav destinations, menu cleanup, and focus behavior.
- Type/LSP diagnostics.
- Scoped lint for the three owned files.

## Recovery

Remove the new chrome files and their imports from the still-unmounted `NewLandingExperience`; no public route is affected.
