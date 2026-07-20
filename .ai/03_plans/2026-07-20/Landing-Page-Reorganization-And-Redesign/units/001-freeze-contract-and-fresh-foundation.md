# UNIT-001 — Freeze Contract and Build Fresh Foundation

**Status:** READY  
**Depends on:** none  
**Goal:** Create a new, self-contained landing tree beside the still-live `/new`, with complete copy, fixtures, tokens, and server-first composition contracts.

## Owned paths

- `src/components/landing/new-redesign/content.ts`
- `src/components/landing/new-redesign/fixtures.ts`
- `src/components/landing/new-redesign/tokens.module.css`
- `src/components/landing/new-redesign/NewLandingExperience.tsx`
- empty/new section and interaction directories only as required by imports

Do not modify `src/app/new/page.tsx` or delete `src/components/landing-new/**` in this unit.

## Inputs

- `00-PLAN.md`
- `CONTEXT/README.md`
- `CONTEXT/claim-reconciliation.md`
- `architecture/section-system.md`
- `references/reference-grammar-synthesis.md`
- `src/app/globals.css` brand tokens
- exact current-source paths in the clause-level reconciliation ledger

## Implementation

1. Create `new-redesign/` without importing any existing landing implementation.
2. Author `content.ts` as the single immutable content contract for:
   - announcement, nav, hero, primary CTA;
   - capability matrix;
   - Platform thesis and five workflow chapters;
   - reusable intelligence and dark connected context;
   - Decision Signals, Connected Handoffs, and Structured Control as three distinct entries;
   - Founder Trust, Honest Proof, Illustrative Workflow, and Current Product as four distinct entries;
   - Early-Access Briefing/FAQ, final CTA, and footer;
   - exact existing route destinations.
3. Put the approved H1, subheadline, primary CTA label, category, descriptor, and benefit line in exported readonly structures. Do not copy the old `landing-content.ts`.
4. Author `fixtures.ts` with one visibly fictional project and sanitized values used across all scenes. Include stable IDs, project name, estimate rows, components, output status, comments, version, and decision state. No real company/person/project data.
5. Encode every material claim/scene from `CONTEXT/claim-reconciliation.md` as `accepted`, `partial`, `conceptual`, or `prohibited`; consumers may render only accepted claims and the explicitly bounded portion of partial claims.
6. Author the full page token layer from the architecture contract: Inter CSS variable hook, colors, 24-column grid, sticky offsets, type scale, spacing, radii, shadows, easings, reduced-motion overrides, and anchor scroll margins.
7. Scaffold `NewLandingExperience.tsx` as a Server Component with one root, skip link, owned header slot, `<main id="main-content">`, ordered section slots, and owned footer slot. Temporary section placeholders are allowed only within this unit and must be removed by Unit 007.
8. Add a development-only invariant helper or static array assertion that the page contract contains 15 main blocks in the declared order; do not add a test suite.

## Acceptance

- New tree exists beside the old tree; `/new` remains unchanged and functional.
- No new file imports from `landing-new`, `landing-v3`, `landing/sections`, `PublicPageShell`, `buildLandingMetadata`, shared `LandingHeader`, or shared `LandingFooter`; canonical brand exports are the only existing implementation imports allowed.
- Content contains exactly one conversion destination: `/contact?intent=started#contact-form`.
- Hero/corpus copy is exact; no sample-proposal action exists.
- Fixture contains no real names, emails, addresses, customer identifiers, or source data.
- Tokens exactly implement the declared type/color/grid/motion ceilings; no heading token exceeds `80px`.
- Signal fill text token is dark ink; small orange-on-light token is `#C63804`.

## Decisive verification

- Source/diff review against `CONTEXT/README.md`, `CONTEXT/claim-reconciliation.md`, and the architecture tables.
- `rg -n "landing-new|landing-v3|PublicPageShell|buildLandingMetadata|LandingHeader|LandingFooter|#f24a16|#c9380d|intent=access|WebGL|three|canvas" src/components/landing/new-redesign`
- Type/LSP diagnostics for new files.

## Recovery

Delete only the newly created `new-redesign/` tree. The active route and old implementation remain untouched.
