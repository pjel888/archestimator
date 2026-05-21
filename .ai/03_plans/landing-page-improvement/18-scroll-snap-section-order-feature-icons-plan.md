# Scroll Snap, Section Order, Container, and Five Feature Icons Plan

**Date:** 2026-05-21 18:33 PST
**Status:** Planning only; no code implementation in this pass.
**Scope:** Public `/` landing page below the accepted hero.
**Hard boundary:** Do not modify the accepted above-the-fold hero section or its visual treatment.
**Related docs:** `07-below-hero-container-layout-plan.md`, `08-motion-and-microinteraction-plan.md`, `11-lenis-smooth-scroll-and-placeholder-company-proof-plan.md`, `17-public-subpages-claims-matrix.md`.

## User brief

Philip is already okay with the hero. The next improvement is below the fold:

1. Keep the hero untouched.
2. Make below-hero content feel centered and focused with consistent Tailwind containers.
3. Fix the current smooth-scroll behavior so each major section lands cleanly, almost like a slideshow/presentation.
4. Reduce the lag when scrolling between the hero and the following sections.
5. Reorder the first below-hero sections so `SecondaryClaimSection` — “The most intuitive way to create construction cost estimates” — appears before the company carousel.
6. Add icons to the five existing feature pillars.
7. Do not implement code yet; plan the route first.

## Current source state

From `src/app/page.tsx`, the current landing sequence is:

1. `LandingHeader`
2. `HeroSection`
3. `ProductShowcaseSection`
4. `CompanyProofCarouselSection`
5. `SecondaryClaimSection`
6. `SolutionSection`
7. `PricingSection`
8. `FinalCTASection`
9. `LandingFooter`

Current scroll/interactivity state:

- `LandingSmoothScrollProvider.tsx` uses `ReactLenis` with `lerp: 0.1`, `duration: 1.2`, `smoothWheel: true`, `anchors: true`, and reduced-motion gating.
- `lenis` is installed as `^1.3.23`.
- `lenis/snap` is available in `node_modules/lenis/dist/lenis-snap.d.ts` and supports `type: 'mandatory' | 'proximity' | 'lock'`.
- `gsap`, `framer-motion`, `motion`, `animejs`, and `react-spring` are not installed.
- `@phosphor-icons/react` is installed and already used across landing/workshop components.

Current section/icon state:

- `SecondaryClaimSection.tsx` already has five pillars:
  - Project-shaped estimates
  - Reusable cost components
  - Traceable revisions
  - Proposal comparisons
  - Excel/PDF handoff
- Those five pillars currently render as text-only chips.
- `ProductShowcaseSection.tsx` has four product tabs, not five.
- `FeaturesSection.tsx` has five feature blocks but is not currently mounted in `src/app/page.tsx`.

## Primary recommendation

Implement this as one below-hero landing slice later:

1. Reorder the below-hero sections in `src/app/page.tsx`.
2. Add a focused container contract for every below-hero section.
3. Add landing-only snap frames using Lenis Snap, not GSAP.
4. Tune Lenis so the page feels decisive instead of laggy.
5. Add Phosphor icons to the five `SecondaryClaimSection` feature pillars.
6. Apply the claims matrix before touching copy around exports, proposals, revisions, and company proof.

Do not add GSAP for this slice. The current problem is section landing and microinteraction clarity, not complex timeline choreography.

## Target section order

Target `src/app/page.tsx` order:

1. `LandingHeader`
2. `HeroSection` — unchanged
3. `SecondaryClaimSection` — first proof after hero
4. `CompanyProofCarouselSection`
5. `ProductShowcaseSection`
6. `SolutionSection`
7. `PricingSection`
8. `FinalCTASection`
9. `LandingFooter`

Rationale:

- The hero makes the provocative claim.
- The secondary claim immediately explains the method: Archestimator is intuitive because the estimate follows project logic.
- The company carousel then becomes supporting atmosphere/proof, not the first explanatory content.
- Product tabs/details can then prove the method with more concrete UI.

## Container contract

Use a consistent below-hero container pattern. Full-bleed backgrounds may stay, but real content should sit inside a centered max-width container.

Recommended default content shell:

```tsx
<div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8">
  ...content...
</div>
```

Recommended larger visual shell when a section needs product preview width:

```tsx
<div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
  ...content or product visual...
</div>
```

Rules:

1. Do not put all content directly in `w-full px-6` wrappers.
2. Keep typography, cards, and CTAs aligned to the same visual centerline below the hero.
3. Let background bands remain full-width, but keep information architecture centered.
4. If the carousel remains visually wide, keep its label/heading/explanation in a focused container and treat the marquee as a controlled full-width band.
5. Footer may keep its current professional layout unless a snap/footer overflow issue appears during QA.

## Scroll-snap behavior plan

### Desired feel

On desktop and laptop viewports, the landing page should feel like controlled section slides:

- one deliberate wheel/trackpad gesture moves to the next major section;
- each section lands fully and predictably;
- the next section should not stop half-cut unless its content is taller than the viewport;
- hero-to-secondary and secondary-to-carousel transitions should feel immediate, not floaty;
- scrolling back up should be equally predictable.

### Recommended implementation path

Use Lenis Snap because the app already uses Lenis and Lenis documents that native CSS scroll-snap needs the snap plugin when Lenis controls scrolling.

Planned file changes for implementation later:

- Modify `src/components/landing/LandingSmoothScrollProvider.tsx`.
- Create `src/components/landing/LandingSnapController.tsx` or keep the controller inside the provider if small.
- Modify `src/app/page.tsx` to mark snap frames or wrap below-hero sections.
- Modify below-hero section components to accept or include snap/container classes.
- Possibly modify `src/app/globals.css` for shared landing snap frame classes.

### Snap frame strategy

Add a snap marker to each major page frame:

- Hero frame: existing hero wrapper only if needed for snap targeting; do not change hero internals.
- Secondary claim frame.
- Company carousel frame.
- Product showcase frame.
- Solution frame.
- Pricing frame.
- Final CTA frame.
- Footer should usually be a terminal snap frame only if it fits cleanly; otherwise allow normal scroll into footer.

Recommended attribute:

```tsx
<section data-landing-snap-section="true" ...>
```

Recommended desktop frame sizing:

```tsx
min-h-[calc(100svh-68px)]
```

The `68px` aligns with the current sticky header height in `LandingHeader.tsx`.

### Header offset caution

Lenis Snap `addElement()` aligns to an element's top. With the sticky header, this may place the top of a snapped section beneath the header.

Implementation should test two approaches:

1. **Preferred first:** Use section top padding and `scroll-mt-[68px]`/CSS offset classes if visual landing is correct.
2. **Fallback if header overlay is wrong:** Use numeric snap values computed from each section's document offset minus the sticky header height, instead of raw `addElement()` positions.

Do not ship a snap implementation where the first line of a section hides under the header.

### Lenis Snap tuning candidates

Start with these tuning targets during browser QA, then adjust by feel:

```ts
new Snap(lenis, {
  type: "lock",
  duration: 0.62,
  debounce: 80,
});
```

Alternative if `lock` feels too strict on trackpads:

```ts
new Snap(lenis, {
  type: "mandatory",
  duration: 0.68,
  debounce: 100,
});
```

Reasoning:

- `lock` best matches Philip's “slideshow presentation” description because each gesture advances to the next snap point.
- `mandatory` is a safer fallback if `lock` feels too mechanical or fights fine-grained trackpad input.
- `proximity` is not recommended for this pass because it can still allow partial stopping.

### Lenis lag tuning

Current provider options likely contribute to the floaty/laggy feel:

- `lerp: 0.1`
- `duration: 1.2`

For the implementation pass, tune toward a shorter, more decisive feel:

- reduce snap animation duration to roughly `0.6s`–`0.75s`;
- avoid combining a long global `duration` with a separate snap animation;
- consider removing global `duration` if `lerp` is active and snap controls section movement;
- keep `smoothWheel: true`, but avoid over-smoothing trackpad input;
- keep reduced-motion users on native scroll with no snap lock.

### Responsive snap rules

Desktop/laptop:

- Enable snap on viewports where each section can reasonably fit its information.
- Target `min-h-[calc(100svh-68px)]` frames.
- Ensure each frame has enough internal padding but no excessive vertical whitespace.

Mobile/tablet:

- Do not force a hard slideshow if content is taller than the viewport.
- Prefer native scroll or `mandatory` snap only where sections are compact.
- Disable `lock` on narrow screens if it traps users or hides content.
- Always respect `prefers-reduced-motion: reduce`.

Tall content exception:

- If a section cannot show complete data within one viewport, split it into smaller snap frames or remove it from hard snap.
- Do not create inner scroll panes for marketing content unless absolutely necessary; they often feel broken on mobile.

## Five feature icons plan

Target component: `src/components/landing/SecondaryClaimSection.tsx`.

Reason:

- This component contains the five existing feature pillars the user likely means.
- It is moving immediately after the hero, so icons will improve scan speed and make the bridge section feel more premium.
- `ProductShowcaseSection.tsx` has four tabs, not five, so adding five icons there would mismatch the current data model.

Use `@phosphor-icons/react/dist/ssr` because it is already installed and used in the codebase. Do not install `lucide-react` or another icon package for this pass.

Recommended mapping:

| Pillar | Icon candidate | Reason |
| --- | --- | --- |
| Project-shaped estimates | `TreeStructure` or `TreeView` | Communicates hierarchy/project structure. |
| Reusable cost components | `Package` or `SquaresFour` | Communicates reusable assemblies/components. |
| Traceable revisions | `GitBranch`, `GitDiff`, or `ClockCounterClockwise` | Communicates change history/revision trail. |
| Proposal comparisons | `ChartBar`, `Columns`, or `PresentationChart` | Communicates option comparison and client explanation. |
| Excel/PDF handoff | `Files`, `FileXls`, or paired `FileXls` + `FilePdf` | Communicates standard output formats. |

Claim-safety caution from `17-public-subpages-claims-matrix.md`:

- “Excel/PDF handoff” is planned, not live.
- If the icon makes that pillar feel too production-ready, change the label to “Planned Excel/PDF handoff” or “Export handoff direction” until export exists.
- “Traceable revisions” and “Proposal comparisons” also need preview/future framing if copy implies current full functionality.

Visual treatment:

- Small square icon chip, not oversized SaaS decoration.
- Use muted ink/stone palette with one subtle accent state.
- Keep icons aligned with text baseline on mobile.
- Avoid bouncy icon animations.
- Add hover/focus microinteraction only if the pill is interactive; otherwise keep it static.

## Microinteractions plan

No GSAP in this implementation slice.

Allowed:

- CSS/Tailwind hover/focus/active transitions.
- Existing `MotionReveal` pattern if reveal rhythm is needed.
- Lenis Snap for scroll positioning.
- Slow carousel CSS animation with reduced-motion fallback.

Avoid:

- scroll-scrub timelines;
- parallax on the hero boundary;
- heavy scale/blur effects;
- animations that make section snapping feel delayed;
- permanent motion on content text.

If a future pass needs more choreographed product storytelling, create a separate GSAP spike plan first and define bundle budget, cleanup strategy, reduced-motion behavior, and failure fallback.

## Implementation sequence for later

1. **Preparation**
   - Confirm branch/worktree state.
   - Keep code changes isolated from unrelated dirty files.
   - Re-read `src/app/page.tsx`, `LandingSmoothScrollProvider.tsx`, `SecondaryClaimSection.tsx`, and `CompanyProofCarouselSection.tsx`.

2. **Section order**
   - Move `SecondaryClaimSection` directly after `HeroSection`.
   - Keep hero import and component untouched.
   - Keep carousel after secondary claim.

3. **Container pass**
   - Add/normalize centered inner wrappers below the hero.
   - Use `max-w-[1120px]` for text/card sections.
   - Use `max-w-[1240px]` only where product visuals need more room.
   - Check that no below-hero content feels left-floating or edge-to-edge unless intentionally full bleed.

4. **Snap frame pass**
   - Add snap markers to major sections.
   - Add landing-only snap controller using `lenis/snap`.
   - Start with `type: "lock"`; fallback to `mandatory` if trackpad feel is too strict.
   - Tune global Lenis values to reduce lag.
   - Validate header offset.

5. **Five icons pass**
   - Add icon metadata to the `featurePillars` data in `SecondaryClaimSection.tsx`.
   - Import selected Phosphor icons from the SSR path.
   - Render each icon with `aria-hidden="true"` and keep text as the accessible label.

6. **Claim-safety pass**
   - Apply the claims matrix to any copy touched during implementation.
   - Do not make export/proposal/revision claims stronger than current product support.

7. **Validation**
   - Run `git diff --check`.
   - Run `bun run type-check`.
   - Run `bun run lint`.
   - Run `bun run lint:font-size` because landing can use larger text but app/workshop must stay protected.
   - Run targeted tests if landing tests exist; otherwise run `bun run validate` if time permits.
   - Browser-check `/` at 390px, 768px, 1280px, and 1728px.

## Acceptance criteria

The implementation is successful only if:

1. The hero is unchanged.
2. The first post-hero section is “The most intuitive way to create construction cost estimates.”
3. The company carousel appears after the secondary claim.
4. Below-hero information is centered in consistent Tailwind containers.
5. Desktop scroll moves cleanly section-to-section without partial awkward stops.
6. The hero-to-secondary scroll transition no longer feels laggy.
7. Section tops are not hidden beneath the sticky header.
8. Reduced-motion users do not receive forced smooth scrolling or snap locking.
9. Mobile users can still read all content without being trapped by snap behavior.
10. The five feature pillars have clear, tasteful icons from the existing Phosphor icon set.
11. No public copy newly claims live Excel/PDF exports, proposal generation, complete revision history, real customer proof, or security certifications.

## Risks and mitigations

### Risk: snap feels too rigid

Mitigation: Start with `lock`, but keep `mandatory` as the fallback. Disable strict snap on narrow screens.

### Risk: sections are too tall to fit as slides

Mitigation: Split oversized content into smaller snap frames or remove hard snap from that section. Do not use inner scroll panes as the default.

### Risk: sticky header hides section content

Mitigation: Test header offset early. If `addElement()` is not enough, compute numeric snap points with a 68px offset.

### Risk: icons make planned features feel live

Mitigation: Apply maturity-aware wording. Especially review “Excel/PDF handoff,” “Traceable revisions,” and “Proposal comparisons.”

### Risk: animation work distracts from product clarity

Mitigation: Use Lenis Snap and CSS only. Defer GSAP until a separate scroll-story spike is approved.

## Recommended next implementation route

When Philip approves implementation, perform one focused branch slice:

1. `page.tsx` section reorder.
2. `SecondaryClaimSection.tsx` icon and container update.
3. Landing snap controller/provider update.
4. Container normalization for affected below-hero sections.
5. Browser QA and validation commands.

Do not bundle public subpage implementation into this scroll/icon slice. Subpages should start only after the claims matrix is accepted.
