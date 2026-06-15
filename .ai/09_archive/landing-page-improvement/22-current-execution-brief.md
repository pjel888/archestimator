# Current Execution Brief: Landing Page Improvement

**Status:** Approved & Active Implementation Guide
**Created:** 2026-05-21
**Scope:** Public landing page `/` implementation below the hero section.

---

## 1. Active Authorities Reference

To resolve conflicting recommendations within the planning artifacts, this brief establishes the authoritative plans for each area of implementation:

*   **Section Order & Feature Icons:** **Doc 18** (`18-scroll-snap-section-order-feature-icons-plan.md`) governs the order of sections and feature icon selections, **except** for its scroll-snap recommendations which are completely superseded by Doc 19.
*   **Scroll & Snap Behavior:** **Doc 19** (`19-cinematic-scroll-performance-correction-plan.md`) governs the scroll strategy. No hard slideshow snaps or locked wheels. Utilize soft cinematic smooth scrolling with Lenis.
*   **Placeholder Company Proof Policy:** **Doc 11** (`11-lenis-smooth-scroll-and-placeholder-company-proof-plan.md`) governs the styling, data structure, and copy for placeholders.
*   **Public Wording & Copy Safety:** **Doc 17** (`17-public-subpages-claims-matrix.md`) governs the feature maturity mapping. Wording must accurately reflect MVP, Preview, and Planned features (no overclaiming of Excel/PDF exports, revisions, or proposals as fully live/production-ready).
*   **Validation Requirements:** **Doc 19** plus the standard suite: `bun run validate`, `bun run build`, `git diff --check`, and manual browser checks for reduced-motion and overflow proof.

---

## 2. Active Implementation Checklist

1.  **Voxel paper background deletion:** Completely delete `VoxelPaperBackground.tsx` and all references to it.
2.  **Section reordering:** Update `src/app/page.tsx` to order sections as:
    1.  `LandingHeader`
    2.  `HeroSection` (locked above-fold)
    3.  `SecondaryClaimSection` (explain intuitive project-shaped estimating, now with 5 feature icons)
    4.  `CompanyProofCarouselSection` (carousel of placeholder companies with clean `span` tags instead of duplicated `h3` tags for SEO)
    5.  `ProductShowcaseSection` (functional product tabs/mockups)
    6.  `SolutionSection` (connected estimating workflow)
    7.  `PricingSection` (early access pricing)
    8.  `FAQSection` (NEW B2B accordion objections solver)
    9.  `FinalCTASection` (primary orange card)
    10. `LandingFooter`
3.  **FAQ Accordion creation:** Add `FAQSection.tsx` in `src/components/landing/` and export it in `index.ts`.
4.  **CTAs alignment:** Update "Get demo" labels to "Try Workspace" in header, footer, pricing, and CTAs.
5.  **Layout padding & containment:** Apply centered `max-w-[1120px]` or `max-w-[920px]` container wrappers and generous vertical padding (`py-24 sm:py-32`) below the hero to respect Gestalt breathing room.
