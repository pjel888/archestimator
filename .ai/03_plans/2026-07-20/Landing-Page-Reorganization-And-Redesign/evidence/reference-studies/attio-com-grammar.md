# Attio Homepage Grammar — Current-Run Primary Study

**Observed:** 2026-07-20 on the live [Attio homepage](https://attio.com/) using desktop and narrow browser inspection, rendered DOM/computed styles, accessibility structure, and current deployment source. This is research evidence, not permission to copy proprietary assets or code.

## Current Page Order

1. Announcement
2. Navigation
3. Centered hero and product composition
4. Customer-logo proof grid
5. Platform thesis
6. Five sticky product chapters
7. Self-building product demonstration
8. Dark Universal Context thesis
9. Signals
10. Connectivity
11. Developer platform
12. Pinned testimonial
13. Scale proof
14. Customer story
15. Changelog
16. Newsletter
17. Dark final CTA
18. Categorized footer

Archestimator preserves this functional order but substitutes truthful non-traction bands for logos, metrics, testimonials, and customer stories.

## Measured Geometry

- Desktop observation: `1800×977`, DPR approximately `1.6`.
- Total sticky header stack: `116px` (`48px` announcement + about `68px` nav).
- Narrow stack: about `100px`.
- Outer content system: max `1440px`, `24px` inline inset, 24 equal structural columns.
- Hero: about `1302px` high; product window roughly `1350×764px` in the sampled viewport.
- Hero H1: about `68/65px` in the sampled viewport; source scale clamps from `64` to `80px`; mobile measured `40/38px`.
- Hero lead: `18/23.4px`; mobile `15/19.5px`.
- Standard H2: `40/44px`; mobile `32/36px`.
- Chapter H3: about `24/27.6px`.
- Section intro bands: approximately `152px` top and `80px` bottom.
- Platform run: about `6475px`; desktop split `6/24` sticky rail (`~348px`) + `18/24` content (`~1044px`).
- Paired proof panels switch to two columns around `1280px`.
- Breakpoints observed at `640`, `768`, custom `992`, and `1280px`.

## Typography and Material

- Inter body/UI and Inter Display for large headings; compact leading and small negative tracking.
- Near-white canvas, near-black ink, one near-black dark act, restrained accent color inside product proof.
- Hairline divisions; mostly square architectural marketing geometry.
- Buttons about `36px` high with `10px` radius.
- Product windows use `8–16px` radii and layered depth; ordinary cards usually avoid diffuse shadow.
- Dark sections use grids, stripes, clipping, and controlled illumination rather than generic blurred blobs.

## Motion

- Reveal start: opacity `0`, blur `1.5–2.5px`, up to `16px` vertical offset.
- Standard reveal `600ms`; entrance `800ms`; product-stage entrance `900ms`; switch around `500ms`.
- Reveal easing `[0,0,.58,1]`; UI out `[.33,1,.68,1]`; in/out `[.65,0,.35,1]`.
- Hero order: kicker `0ms`, H1 `100ms`, copy `200ms`, CTAs `300/400ms`, main product window `450ms` delay.
- Desktop initial scroll is a discrete spring-like state, not a long scrub: copy fades/blurs, product stage settles near scale `.852` within about `800ms`.
- Sticky chapter active state changes near mid-viewport; indicator about `320ms`.
- Product panels reveal near `70–75vh`, completing within `380–800ms`.
- Hover enters rapidly (`50ms`) and restores over about `300ms`, with no lift.
- Autoplay/product work is generally gated by viewport intersection; manual selection stops or changes sequences.

## Responsive Behavior

- Below `992px`, full nav collapses and the workflow rail becomes a horizontal sticky selector.
- Below `768px`, the desktop hero pin/scale choreography is replaced with an in-flow mobile hero.
- Product scenes use cropped or purpose-built mobile compositions.
- Long card rows use horizontal snap rather than unreadably shrinking their contents.
- Reduced-motion branches stop several automatic sequences and switch smooth navigation to instant; Archestimator must go further and stop every timer and autoplay path.

## Performance Clues, Not Budgets

Attio's current deployment is visually rich and asset-heavy. It mitigates cost with IntersectionObserver gating, lazy mounting, poster-first video, offscreen animation suspension, and limited active `will-change`. Archestimator should adopt the gating, not Attio's asset/DOM volume. This study does not establish an Archestimator performance pass.

## Translation

Emulate the hierarchy, grid, type ratios, sticky workflow, light/dark act break, product specificity, and restrained motion. Replace every reference-specific word, asset, interface, logo, metric, testimonial, and trademark with original Archestimator truth. Use Signal orange in the accent role; keep all new UI demonstrative and sanitized.

## Capture Limitation

The accompanying JPEGs are current-run visual notes at `1414×768` and include Chrome's “ChatGPT started debugging this browser” banner. They support hierarchy/appearance observations but are not pixel-calibration masters. Filenames reflect capture intent; the capture index records where a long pinned section caused the visible frame to lag the intended label.
