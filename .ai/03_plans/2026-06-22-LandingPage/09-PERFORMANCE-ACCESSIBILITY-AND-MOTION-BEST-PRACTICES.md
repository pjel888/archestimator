# Performance, Accessibility, And Motion Best Practices

Date: 2026-06-22
Scope: future Archestimator landing-page implementation

This document defines the performance, accessibility, image, glass, and Three.js
constraints for the next public landing-page pass.

## Source Basis

External sources checked on 2026-06-22:

- web.dev, "Web Vitals": <https://web.dev/articles/vitals/>
- Google Search Central, "Understanding Core Web Vitals and Google search
  results": <https://developers.google.com/search/docs/appearance/core-web-vitals>
- Google Search Central, "INP replaces FID as a Core Web Vital":
  <https://developers.google.com/search/blog/2023/05/introducing-inp>
- W3C, WCAG 2.2: <https://www.w3.org/TR/WCAG22/>

Internal anchors:

- `HeroSignalField.tsx:9-37` currently skips mobile WebGL, checks WebGL support,
  sets `powerPreference: "low-power"`, and caps pixel ratio.
- `HeroSignalField.tsx:128-148` animates with `requestAnimationFrame` and renders
  a static frame under reduced motion.
- `WorkshopGlassBackdrop.tsx:1-44` is the model for a cheap, static, quiet
  background field.
- `src/app/globals.css:529-590` defers liquid-glass blur until after first paint.
- `src/app/globals.css:1538-1608` defines the dashboard bloom, dot grid,
  dashboard glass, and workspace glass surface vocabulary.
- `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:54-67`
  records internal public-route and landing bundle budgets.

## Performance Targets

Use Core Web Vitals as the public-page baseline:

| Metric | Target | Meaning for this landing page |
| --- | ---: | --- |
| LCP | <= 2.5s at p75 | Hero text/product proof must not wait on WebGL, heavy images, or fonts. |
| INP | <= 200ms at p75 | Nav, CTAs, tabs, and accordions must remain responsive despite motion. |
| CLS | <= 0.1 at p75 | Screenshots, hero frames, nav, and social strips need stable dimensions. |

Internal build targets:

- public LCP target: `< 2.5s` for beta, with `< 2.0s` as the enterprise/public
  aspirational target from the performance roadmap;
- `/` landing main bundle chunk target: `< 60KB` gzipped when practical;
- `/` critical path JS target: `< 80KB` gzipped when practical;
- no WebGL requirement for first meaningful paint;
- no layout shift from screenshots or fonts;
- no auto-playing video in the first viewport;
- no unbounded GSAP/Three.js scroll effects;
- no stacked `backdrop-filter` blur inside nested children;
- no homepage pricing comparison table that bloats first-load content.

## Three.js Hero Rules

The desktop hero should include a subtle Three.js progressive layer, but it must
be cheap and non-essential. The static CSS/product-proof composition must still
look complete before WebGL starts.

Required behavior:

- Skip WebGL below `1024px`, matching the current `HeroSignalField`.
- Respect `prefers-reduced-motion: reduce`.
- Render a static fallback frame when motion is reduced.
- Keep `powerPreference: "low-power"`.
- Cap pixel ratio to `<= 1.75`.
- Dispose geometry, materials, renderer, listeners, and observers on unmount.
- Put the Three.js field behind or within the product proof surface, never as the
  LCP-critical content.
- Provide a CSS/static baseline for the exact same composition so the first
  viewport is designed before JavaScript enhancement.

Design direction:

- Use a net/signal/drafting-field animation, not a game-like 3D scene.
- Keep Signal orange low-opacity and precise.
- Let the Estimate Sheet/product frame carry the hero; Three.js should be the
  atmospheric commercial-memory field behind it.
- Provide a CSS dot-grid/static radial fallback so the hero is still designed when
  WebGL fails.

Implementation preference for a future pass:

- Lazy-load the Three.js component after the first paint, after the hero visual is
  ready, or behind an equivalent client boundary.
- Keep the component isolated as a small client leaf.
- Do not statically import `three` into a route or shared landing module that
  participates in the initial server/client path.
- Do not import broad animation libraries into the server route.
- If the future hero uses real screenshots, load the screenshot before starting
  WebGL animation.

## Product Image And Screenshot Rules

Archestimator should show the actual app. The best landing proof is:

1. Estimate Sheet;
2. Cost Library/Templates;
3. Revision/Activity;
4. Shared Proposal Review;
5. Workshop dashboard/charts/export as support.

Asset rules:

- Use real screenshots when possible; otherwise use faithful app panels built
  from current components and realistic demo data.
- Prefer AVIF or WebP.
- Set explicit width/height or aspect-ratio for every image frame.
- Keep hero screenshot candidates below roughly 220KB when practical.
- Keep below-fold proof images below roughly 180KB each when practical.
- Avoid blurred stock imagery, empty generic dashboards, fake customer logos, and
  screenshots with private project/client data.
- Do not render text as an image except for logos or unavoidable app screenshot
  content.

For generated images:

- use them for abstract product scenes, textures, or background imagery only;
- do not use generated people as proof;
- do not use generated UI as if it were the real product;
- label generated/background assets as design assets in the implementation PR.

Screenshot capture contract:

- Maintain a small manifest of landing proof assets with source route, viewport,
  data fixture, capture date, privacy check, and compression format.
- Prefer real app screenshots for Estimate Sheet, Library/Templates, Shared
  Proposal, and Workshop Dashboard.
- If a faithful panel is built instead of captured, document which source
  components informed it and keep labels/data realistic.

## Liquid Glass Performance Rules

The app already has the right direction: glass reads best over a quiet, varied
backdrop, but blur is expensive.

Required rules:

- Reuse `--glass-bg`, `--glass-blur`, `--glass-border`, `--glass-shadow`,
  `--glass-inset-hi`, and the workshop/dashboard glass classes where practical.
- Preserve deferred glass arming through `LiquidGlassReady`.
- Use one meaningful frost layer per region.
- Children inside glass panels should use translucent fills and edge highlights,
  not their own `backdrop-filter`.
- Provide solid or translucent fallbacks for unsupported blur and reduced
  transparency.
- Keep the canvas light/gray with a subtle orange bloom, not a full orange page.

The `/workshop` page is the first-party standard: calm gray canvas, continuous
workspace frost, small chrome, tight grid, and controlled empty space.

## Accessibility Targets

Use WCAG 2.2 AA as the landing-page target.

Required:

- Normal text contrast at least 4.5:1.
- Large text contrast at least 3:1.
- Non-text UI components and graphical controls at least 3:1 against adjacent
  colors.
- Text resizes to 200% without loss of content/functionality.
- Keyboard focus visible on nav, CTAs, cards-as-links, social links, forms, and
  any segmented proof controls.
- Touch/click targets for important actions at least 44x44px in the landing
  implementation, matching the project UX contract.
- Motion can be disabled or reduced through `prefers-reduced-motion`.
- Links have meaningful visible labels; avoid repeated standalone "Learn more".
- Accessible names for buttons/links include the visible label text.
- Icon-only social links need accessible labels and tooltips or visible text.
- Product screenshots need adjacent text that conveys the same product point.
- Do not rely on color alone for status, active tab, price/source confidence, or
  proposal approval state.

Archestimator-specific contrast rule:

- Use `#C63804` / `--brand-orange-dark` for small orange text on light surfaces.
- Use `#F24405` / `--brand-orange` for fills, larger accents, focus rings, and
  signal fields.
- Do not use `#7F7F7F` for load-bearing text.

## Responsive Layout Rules

Desktop:

- Use a restrained two-column hero or product-frame hero, not poster-only type.
- Let the next product-proof section peek into or immediately follow the first
  viewport.
- Keep the visual frame dense enough to feel like real estimating software.

Tablet:

- Product proof must not collapse into unreadable mini-screenshots.
- Switch to stacked product panels before the interface becomes decorative.

Mobile:

- No WebGL.
- No hover-dependent core explanation.
- Product proof can use cropped, stacked cards with labels.
- CTA buttons must wrap without text overflow.
- Social links should be compact icon+label rows.

## Verification For Future Implementation

Use the smallest proof that supports the claim.

Always run for source edits:

```sh
bun run type-check
git diff --check -- src/app/page.tsx src/components/landing src/app/globals.css
```

Run build/performance checks when route composition, Three.js, large images,
fonts, or dynamic imports change:

```sh
bun run build
```

Expected route-budget review when build output is available:

- confirm `three` is not pulled into the initial `/` route bundle;
- confirm landing route chunks have not regressed without explanation;
- confirm LCP-critical text and product image dimensions are not blocked by
  deferred visual effects.

Run targeted DOM/Vitest checks if existing landing tests cover the edited area:

```sh
bun run test:dom -- tests/vitest/landing-amigo-redesign.test.tsx tests/vitest/landing-interactivity.test.tsx tests/vitest/public-font-lcp-audit.test.ts
```

Current-test warning: `landing-amigo-redesign.test.tsx` currently encodes the old
"Estimates that remember every job" hero, `Start free` CTA, and giant headline
scale. If the future implementation follows this plan, update the tests to the
new product direction instead of preserving stale expectations.

Use browser/Playwright proof only when proving rendered layout, canvas behavior,
responsive wrapping, screenshots, or interaction. The project policy says browser
automation is opt-in evidence, not the default for every copy/style edit.

When browser proof is used, capture at least one desktop viewport and one mobile
viewport, and explicitly check: first-fold product proof visibility, no text
overflow, no CTA overlap, no blank WebGL canvas, reduced-motion fallback, and
stable screenshot aspect ratios.

## Performance QA Checklist

- [ ] Hero H1 and support copy render without waiting for WebGL.
- [ ] Product screenshot frames have stable dimensions.
- [ ] No heading clamps exceed the professional type ceiling from doc `08`.
- [ ] Three.js is desktop-only, reduced-motion aware, and disposable.
- [ ] Glass blur is deferred and not nested.
- [ ] No auto-playing first-viewport video.
- [ ] No fake screenshot/proof assets.
- [ ] Core CTA labels are descriptive and keyboard-focusable.
- [ ] Community links are real, accessible, and not layout-shifting.
- [ ] `/pricing` is linked but pricing depth is not duplicated on the homepage.
- [ ] `three` is lazy/client-leaf only and absent from the initial route path.
- [ ] Tests that lock the older hero/copy/type scale have been updated when the
      new direction ships.
- [ ] One desktop and one mobile rendered proof have been captured when layout,
      screenshots, canvas, or responsive behavior changed.
