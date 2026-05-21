# Landing Page Comprehensive Audit & Marketing Synthesis

**Date:** 2026-05-21 22:15 PST  
**Status:** Complete Audit & Actionable Strategy  
**Parent folder:** `.ai/03_plans/landing-page-improvement/`  
**Inspected URL:** `/` (Public Landing Page)  
**Verification Method:** Automated Playwright-based headless browser audit (`e2e/landing-audit.spec.ts`) + Live Code Inspection + B2B SaaS Industry Best Practice Analysis.

---

## 1. Executive Summary

Archestimator's current public landing page (`src/app/page.tsx` and related components) represents a highly disciplined, clean, and performant product-led growth (PLG) landing page. It avoids generic SaaS fluff, rejects fake social proof, and successfully centers the narrative around a concrete target audience: **construction cost estimators**.

However, our deep-dive audit has identified key optimization opportunities across **performance, SEO, UI/UX, and B2B marketing positioning** that will maximize visitor trust, search engine ranking, and early demo sign-up conversions.

---

## 2. Technical & Performance Audit

We ran an automated, headless browser performance run on our production-compiled bundle to capture real-world loading and resource execution metrics.

### Key Metrics (Local Dev Baseline)

- **Initial Page Load Time:** 373ms (highly responsive, low server overhead)
- **DOM Interactive:** 244.5ms
- **DOM Content Loaded:** 244.5ms
- **Full Page Load Event:** 369.3ms
- **HTML Document Weight:** 38.80 KB (Transferred) / 156.29 KB (Decoded)
- **Total Resource Requests:** 27
- **Total Transferred Weight:** ~1.04 MB

### Resource Breakdown

- **Scripts:** 19 requests (representing Next.js framework hydration, client-side React, and Lenis/Three.js bundles)
- **Stylesheets:** 3 requests
- **Fonts:** 4 requests (Outward fonts or local typography assets)
- **Images:** 1 request
- **WebGL/Three.js Warnings:** 4 console warnings regarding WebGL driver stalls (`GPU stall due to ReadPixels` in `VoxelPaperBackground.tsx`).

### Performance Findings & Recommendations

1.  **WebGL GPU Overhead (High Priority):**
    > [!WARNING]
    > The 4 GPU stalls in the console indicate that `VoxelPaperBackground.tsx` is triggering a synchronous `readPixels` operation on the WebGL context, stalling the GPU rendering pipeline.
    - _Correction:_ Refactor the WebGL canvas initialization or Three.js renderer parameters to ensure we do not run read-back commands during scroll-induced canvas updates.
2.  **Script Payload Consolidation:**
    - 19 JS files is acceptable for Next.js, but since this is a public marketing page, we should ensure the bundle does not ship complex editor dependencies (like RCT tree-drag-and-drop libs) to public visitors.
    - _Correction:_ Audit dynamic imports to confirm that dense workshop code (e.g., `react-complex-tree`, `@tanstack/react-table`) is excluded from the landing page bundle.
3.  **Image Optimization:**
    - The page currently requests only 1 image. As product mockups and screenshots are added, we must enforce Next.js `<Image />` optimization (using WebP format, responsive sizes, and lazy loading) to maintain the sub-second page load speed.

---

## 3. SEO (Search Engine Optimization) Audit

A technical audit of search metadata and HTML semantic hierarchy was conducted.

### Findings

- **Page Title:** `"Archestimator"` (Length: 13 characters)
- **Meta Description:** `"Contractor-first construction estimating and proposal workspace."` (Length: 64 characters)
- **Viewport Tag:** `width=device-width, initial-scale=1` (Correct)
- **H1 Tags:** Exactly 1 (Correct)
- **Heading Structure Hierarchy:** Logical, but with visual duplication artifacts:
  - `H1`: "Only the smart ones create cost estimates this way."
  - `H2`: "The most intuitive way to create construction cost estimates"
  - `H2`: "Estimate logic should stay connected from first quantity to proposal."
  - `H3`: Northline Builders / Formworks Studio ... (12 repeated H3 elements)
  - `H2`: "Less spreadsheet drift. More estimate control."
  - `H3`: Project-shaped estimates / Reusable cost components ...
  - `H2`: "Early access to the estimating workspace"
  - `H2`: "Build your next estimate..."
  - `H2`: "A clearer estimating workspace..."

### SEO Concerns & Recommendations

1.  **Suboptimal Title & Meta Lengths (High Priority):**
    > [!IMPORTANT]
    > A 13-character title is too short to rank for key industry terms. Search engines prefer 50–60 characters. A 64-character meta description fails to capture searcher click-through rates.
    - _Correction:_ Update `src/app/layout.tsx` metadata to target high-intent keywords.
    - _Recommended Title:_ `Archestimator | Construction Estimating & Proposal Software` (58 chars)
    - _Recommended Meta Description:_ `Create construction cost estimates in hours, not days. Reuse cost components, compare revisions, and export proposal-ready Excel & PDF files. Try the MVP preview.` (163 chars)
2.  **Logo Marquee Heading Pollution (SEO/Accessibility Risk):**
    > [!CAUTION]
    > The HTML structure uses `<h3>` tags for company names inside the `CompanyProofCarouselSection` (e.g., `<h3>Northline Builders</h3>`). Because the marquee duplicates the logo list for infinite horizontal scrolling, search engines index 12 identical `H3` headings, diluting the page's actual keyword topical authority.
    - _Correction:_ Change these headings to simple styled span or list elements: `<span className="font-semibold text-xs text-[#626260]">...</span>` rather than using H-tags.
3.  **Missing Canonical URL & OpenGraph Tags:**
    - The page lacks a `<link rel="canonical">` tag, which can lead to duplicate content indexing if the page is accessed via subdomains or tracking queries.
    - _Correction:_ Add canonical URL configuration to metadata. Add basic OpenGraph tags (`og:title`, `og:description`, `og:image`) to improve social sharing appearance.

---

## 4. UX & UI Audit

The visual flow and interactive controls were audited for usability, mobile responsiveness, and design-system consistency.

### Findings

- **Responsive Width Verification:** Passed. Headless viewports at 1280px (Desktop) and 375px (Mobile) show exactly 0px of horizontal overflow (`body.scrollWidth === window.innerWidth`). There are no broken layouts or cut-off elements.
- **Focus-Visible & Outline styles:** Present and properly styled. Active tab transitions support keyboard events (`ArrowLeft`/`ArrowRight`/`Home`/`End`) and display custom ring focus states.
- **Typography:** Correctly scopes larger editorial styles to the public landing page while preserving the compact UI typography constraints of the `/workshop` workspace (capped at 12px outside landing pages to maintain data density).

### UX/UI Concerns & Recommendations

1.  **Logo Marquee reduced-motion styling:**
    - The CSS marquee properly stops scroll animation for `prefers-reduced-motion: reduce`. However, the hover-to-pause effect (`:hover .landing-company-marquee`) works via CSS transition.
    - _Recommendation:_ Ensure that keyboard focus-within also pauses the marquee (already present: `.landing-company-carousel-viewport:focus-within` enables keyboard users to read the content without it moving).
2.  **Lenis Snap Speed and Lag Reduction:**
    - _Finding:_ Soft section settling feels elegant but can feel heavy or laggy if the lerp rate is too slow.
    - _Recommendation:_ Tune the Lenis config inside `LandingSmoothScrollProvider.tsx`. The current `lerp: 0.105` and `wheelMultiplier: 0.86` is optimized for smooth, weighted movement, but changing `lerp` closer to `0.12` will feel punchier while maintaining soft settling.

---

## 5. Marketing & Conversion Audit

We audited the landing page copy, value proposition, and user conversion mechanics from a B2B startup positioning perspective.

### Positioning & Copy Strengths

- **Direct Audience Identification:** The page immediately calls out "construction cost estimators" in the eyebrow and headers. This prevents bounce rates from visitors who do not fit the profile.
- **Honest Scaffolding:** Unlike many startups, Archestimator does not fabricate client logs or case studies. Using clearly labeled placeholders (`Placeholder profiles only. Real customer proof will replace this rail...`) builds trust with analytical construction professionals who are naturally skeptical of marketing claims.
- **Method-Driven, Not Feature-Driven:** The page does not just list features (e.g., "Drag & Drop Tree"). It explains **the Archestimator Way** (Project hierarchy → Area scopes → Reuse logic → Revision checks → Proposal outputs).

### Marketing & Conversion Risks

1.  **Vague CTA Wording on Header:**
    - _Finding:_ The primary CTA in the header alternates between "Get demo" (pointing to `/login`) and "Workspace" (pointing to `/workshop`). For a new user, "Get demo" is a classic B2B high-friction term that might imply booking a sales call.
    - _Recommendation:_ Align the button label with the actual friction-free nature of the app. Since it's a self-serve MVP preview, change "Get Demo" to **"Try Workspace"** or **"Start MVP Preview"**. This matches the immediate, self-guided access model.
2.  **Lack of Outcome-Based Copy:**
    - _Finding:_ While we describe _what_ the software does, we don't translate it into _business metrics_ that a business owner or chief estimator cares about.
    - _Recommendation:_ Keep the locked hero copy untouched as requested, but inject minor, grounded metric-driven benefit statements in the lower sections (e.g., in the `SolutionSection` or cards). Examples: "Save hours spent re-linking spreadsheet rows" or "Submit revisions in minutes instead of losing weekends."
3.  **Clearer "Why We Are Building This" Story:**
    - _Finding:_ In the footer and pricing sections, we state it is an "early estimating workspace."
    - _Recommendation:_ Turn this into a conversion advantage. B2B construction pros love to co-design their tools. We should explicitly invite them to **"Co-design the workspace with us"** during the MVP preview, establishing a feedback loop.

---

## 6. Research-Based B2B SaaS Best Practices

From our research of industry-leading tech startups (Linear, Stripe, Notion, Webflow) and B2B estimating platforms:

| Best Practice                 | How Archestimator Matches                                                           | Improvement Path                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Early Trust Badges**        | Company proof rail is placed high on the page.                                      | Convert placeholders to real pilot firms as soon as permission is granted.           |
| **Interactive Product Demos** | Product Showcase has interactive tabs switching static previews.                    | Enhance previews to resemble actual app screenshots instead of simplified schemas.   |
| **Value over Specs**          | Emphasizes "Project-Shaped Estimates" instead of "Folder nesting."                  | Maintain this terminology across subpages.                                           |
| **Frictionless Onboarding**   | Direct magic-link workspace access.                                                 | Replace "Get demo" labels with "Enter workspace" to emphasize self-service PLG.      |
| **Objection Resolution**      | Acknowledges that Excel handoff is planned and doesn't fake completed integrations. | Create a dedicated FAQ section to address data portability and offline capabilities. |

---

## 7. Action Plan: Updating the Improvement Documents

To reflect this comprehensive audit, we will execute the following file updates in `.ai/03_plans/landing-page-improvement/`:

1.  **`01-current-inventory.md`** -> Update to include specific HTML structure/heading nesting notes, WebGL performance warnings, and metadata specs.
2.  **`02-ux-improvement-plan.md`** -> Incorporate the SEO title/meta adjustments, logo tag adjustments (H3 to span), and Lenis snappy tuning.
3.  **`03-implementation-plan.md`** -> Add technical tasks for WebGL performance warning mitigation and SEO markup adjustments.
4.  **`README.md`** -> Register this document (`20-landing-page-audit-and-marketing-synthesis.md`) in the folder index.

---

## 8. Specific Meta Tag Configurations (To Implement)

```typescript
// Proposed metadata updates for src/app/layout.tsx
export const metadata = {
  title: "Archestimator | Construction Estimating & Proposal Software",
  description:
    "Create construction cost estimates in hours, not days. Organize sheets by project structure, reuse cost components, trace revisions, and export proposal-ready outputs.",
  keywords: [
    "construction estimating",
    "cost estimation",
    "bill of quantities",
    "BOQ",
    "builder software",
    "construction bidding",
  ],
  openGraph: {
    title: "Archestimator | Construction Estimating & Proposal Software",
    description:
      "Create construction cost estimates in hours, not days. Reuse cost components and trace revisions.",
    type: "website",
    url: "https://archestimator.com", // update to production domain when finalized
  },
};
```
