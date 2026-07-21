# Responsive, Accessibility, and Performance Specification

## Status model

This document defines implementation requirements and source-level evidence. It does not claim that browser, assistive-technology, Lighthouse, Web Vitals, or device testing has been performed.

Those are test proposals until the owner authorizes them.

## Viewport matrix

### 360 pixels

- logo and menu fit in header;
- no inline desktop nav;
- hero H1 stays readable at approximately 2.4–2.8rem or a safe clamp;
- CTA spans available width when necessary;
- product frame remains present;
- product demo uses static final state;
- bento, activity, principles, connections, early access, and footer use one column;
- dock shows text labels;
- no marquee motion under reduced motion and no horizontal overflow.

### 390 pixels

- same as 360 with slightly wider CTA and outcome cells;
- outcome grid may be two columns if body copy remains legible;
- product frame height must not collapse below a recognizable workspace composition.

### 768 pixels

- mobile/tablet header may still use menu;
- hero remains centered;
- outcome row is two-by-two;
- product bento remains one or two columns based on actual card min width;
- connected flow can begin transitioning from vertical to compact horizontal;
- connection cards use two columns;
- early-access cards may remain stacked.

### 1024 pixels

- desktop nav may appear;
- hero product frame approaches full composition;
- bento becomes asymmetric;
- connected-record and activity sections become two-column;
- principle cards use three columns if each remains at least approximately 260 pixels;
- early-access cards use two columns.

### 1280 pixels

- primary desktop reference;
- full 12-column bento;
- product frame around 1100–1180 pixels;
- generous section spacing;
- no text measure exceeds specified maximum.

### 1440 pixels

- maintain max-width rather than endlessly expanding;
- hero frame can receive more breathing room, not larger internal text;
- background fields may extend beyond container;
- no element depends on viewport edge for alignment.

### 1920 pixels

- page remains centered around 1220-pixel content max;
- hero atmosphere may fill the viewport;
- product demo remains capped so UI text is not unnaturally large;
- no excessive empty band caused by fixed viewport heights.

## Breakpoint principles

Do not create many micro-breakpoints to repair absolute positioning. Prefer:

- intrinsic grid;
- `minmax`;
- container-aware frame;
- fluid clamp;
- normal document flow;
- explicit mobile DOM order.

Recommended broad breakpoints:

```css
@media (max-width: 820px) { ... }
@media (min-width: 821px) and (max-width: 1099px) { ... }
@media (min-width: 1100px) { ... }
```

Add one narrow `480px` query only where copy or CTA geometry requires it.

## Mobile product proof

This is a hard requirement.

The current live landing hides the product mockup below 820 pixels. `/new` must not.

### Mobile state

- render the real component;
- select stable `fauxwood-replaced` phase;
- hide cursor/drag ghost;
- disable loop;
- preserve relationship between estimate rows and reusable library;
- use an aspect-ratio wrapper;
- crop only secondary chrome before core product meaning;
- disclosure remains visible.

### Legibility priority

Keep visible, in order:

1. estimate hierarchy;
2. estimate rows;
3. reusable library or source context;
4. changed/replaced row state;
5. secondary toolbars.

If the fixed 1780-pixel canvas becomes too small, create a route-specific crop or scale strategy around the same real UI. Do not replace it with a generic fake dashboard.

## Header accessibility

- header landmark;
- logo link has accessible brand name;
- current-page anchor state is optional; do not fake it;
- native details summary receives “Menu” text or accessible name;
- details menu has opaque fallback;
- links are in logical DOM order;
- Escape-to-close is not required for native details, but focus must not be trapped;
- opening menu does not lock body scroll unless a true modal is implemented;
- targets are at least 44 by 44 pixels;
- sticky header does not hide section headings after anchor navigation.

Add:

```css
section[id] {
  scroll-margin-top: 6rem;
}
```

Adjust to actual header height.

## Focus

Route root:

```css
.root :focus-visible {
  outline: 2px solid var(--ae-signal-aa);
  outline-offset: 4px;
}
```

Do not remove outlines globally.

Buttons and links may add a component-specific ring but must not suppress the root fallback.

The skip link must move into view on focus and remain above the sticky header.

## Color contrast

Use contrast-safe roles:

- ink on paper for primary text;
- muted text no lighter than a proven body-text neutral;
- dark orange for small text and button fill;
- signal orange for large/decorative elements;
- white text only on dark-orange fill or sufficiently dark ink;
- subtle borders are not the only affordance for controls.

Do not rely on the tinted background alone to communicate card category.

## Motion accessibility

Under `prefers-reduced-motion: reduce`:

- no aurora movement;
- no marquee movement;
- no border beam;
- no reveal offset/blur;
- no tilt;
- no dock magnification;
- no animated connected-flow dash;
- product demo static;
- cursor/drag ghost hidden;
- scroll behavior auto;
- CTA hover may change color without transform.

Content order and meaning remain identical.

## Screen-reader behavior

### Product demonstration

Wrap in a region with:

```text
Sanitized Archestimator estimate workspace demonstration
```

The detailed application UI may contain many controls even though pointer interaction is disabled. If its full accessible subtree becomes confusing in a marketing context, evaluate one of these source-safe approaches:

1. leave the truthful subtree available and clearly label it as a demonstration;
2. add `inert` to the presentation wrapper if browser/framework behavior is acceptable;
3. apply `aria-hidden="true"` to the internal demo only when an adjacent textual description communicates the same product evidence.

Do not make the entire product proof inaccessible by default without reviewing how the real component announces.

Cursor, drag ghost, border beam, glow, and browser dots are always decorative.

### Marquee

Render one semantic list. The duplicated visual track is `aria-hidden="true"`.

### Diagrams

Provide a concise textual description before or after visual nodes.

### Activity

Do not use `aria-live`. The entries are static illustrative content.

### FAQ

Native details/summary; visible answer text; no custom keyboard logic.

## Keyboard behavior

Keyboard users can:

- reach skip link;
- traverse header links and CTA;
- open mobile menu;
- activate all CTAs;
- open/close every FAQ;
- reach footer links;
- see focus;
- avoid decorative cards in tab order.

The workflow dock does not need keyboard focus unless its items are real controls. If implemented as explanatory buttons, each must expose its explanation and restore focus logically.

## Content accessibility

- avoid all-caps body copy;
- kicker letter spacing remains modest;
- minimum body size 16 pixels where practical;
- small labels no smaller than 11.5–12 pixels;
- no paragraph centered beyond approximately 60 characters;
- no important copy inside images;
- no animation-only state explanation;
- no color-only changed-value indicator.

## Layout-shift controls

Reserve:

- header height;
- hero copy width;
- product frame aspect ratio;
- browser chrome;
- outcome row;
- mini illustrations;
- activity panel;
- dock.

Do not insert the product demo after mount without a same-size server placeholder.

Fonts already use existing application loading behavior; do not add an external font request.

## Performance budgets

These are targets for implementation and later authorized measurement, not current claims.

| Budget | Target |
|---|---|
| Route-specific new client JavaScript excluding reused product demo | ≤ 35 KB gzip |
| Layout shift attributable to `/new` | CLS ≤ 0.05 |
| Interaction responsiveness | INP ≤ 200 ms |
| Mobile LCP | ≤ 2.5 s on an agreed test profile |
| Perpetual animations visible at once | ≤ 2 |
| New animation dependencies | 0 |
| New content/product data calls | 0; existing same-origin auth hint and consent-gated analytics are permitted |
| Unoptimized decorative image payload | 0 |
| Large blur region on mobile | 0 |

Do not claim these values pass until measured under authorization.

## Client-island budget

Expected client ownership:

1. auth-aware CTA group;
2. product demo wrapper plus existing product demo;
3. route motion controller;
4. existing consent/analytics from shell.

The main section tree, copy, diagrams, FAQ content, and mini illustrations should remain server-renderable.

## CSS performance

Use:

- `transform`;
- `opacity`;
- pseudo-elements;
- small radial gradients;
- `content-visibility: auto` on lower sections with a conservative `contain-intrinsic-size`.

Avoid:

- animating `filter` perpetually on large surfaces;
- full-page backdrop blur;
- dozens of box shadows changing on scroll;
- per-frame React state;
- universal `will-change`;
- deeply nested selector chains;
- route-global repaint triggers.

## Hero lifecycle

The hero loop must pause when:

- less than the chosen intersection threshold is visible;
- document hidden;
- reduced motion;
- mobile/static mode;
- component unmounted.

Pause must cancel timers and shared drag state.

## Source-level performance evidence

Without running a build or browser tool, the implementation can still prove:

- no package/lockfile change;
- no route network call;
- bounded observers/listeners;
- cleanup functions;
- no client directive at page root;
- static content first render;
- reserved frame aspect ratio;
- no motion dependency import;
- lower-section containment;
- mobile no-loop behavior.

Record measurement gaps honestly.

## Test proposals

Do not execute until authorized.

### Build proposal

```bash
bun run build
```

Purpose: prove static route compilation and catch bundler-only errors.

### Browser matrix proposal

Run a local server and inspect:

```text
360, 390, 768, 1024, 1280, 1440, 1920
```

Check overflow, product legibility, sticky header, anchors, menu, FAQ, focus, reduced motion.

### Playwright proposal

Create a scoped `/new` test only if authorized. Assertions should cover:

- noindex meta;
- one H1;
- early-access CTA;
- no prohibited proof strings;
- product demo visible at 390 pixels;
- no horizontal overflow;
- mobile menu;
- FAQ keyboard;
- reduced-motion static product state;
- current `/` smoke unchanged.

### Lighthouse/Web Vitals proposal

Measure after visual correctness. Record device/profile and do not compare against unrecorded prior runs.

## Failure handling

If the real hero prevents the page from meeting later measured budgets, optimize in this order:

1. pause and static-mode behavior;
2. reduce demo render scope or crop;
3. defer nonessential internal product panels;
4. split demo chunk while preserving an immediate truthful poster;
5. create a static representation generated from the same sanitized product data;
6. only then consider a screenshot.

Never replace it with fake metrics to improve a score.
