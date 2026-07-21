# Visual Design System

## Direction

The `/new` route should feel like a light, premium construction-software page, not a dark developer-tool template and not a softened copy of the authenticated application.

The visual language is:

- warm-white and light neutral;
- signal-orange used with restraint;
- precise architectural grids and hairlines;
- generous spacing;
- product UI as the dominant visual;
- soft depth rather than heavy glassmorphism;
- mostly rectangular commercial surfaces with controlled rounded corners;
- small monospace labels for structure, not a “technical” costume.

## Scoped token contract

Define route-owned variables on the CSS-module root:

```css
.root {
  --ae-bg: #f7f7f4;
  --ae-paper: #fffefb;
  --ae-surface: #ffffff;
  --ae-surface-muted: #f0f1ef;
  --ae-warm: #fff4ec;
  --ae-cool: #eef3f5;
  --ae-olive: #eef1ec;

  --ae-ink: #1d1d1b;
  --ae-ink-soft: #3d3d39;
  --ae-muted: #686761;
  --ae-muted-2: #7b7a74;

  --ae-line: #e4e2db;
  --ae-line-strong: #cfccc3;

  --ae-signal: #f24405;
  --ae-signal-aa: #c63804;
  --ae-signal-soft: color-mix(in srgb, var(--ae-signal) 10%, white);

  --ae-slate: #567686;
  --ae-slate-soft: color-mix(in srgb, var(--ae-slate) 10%, white);

  --ae-radius-sm: 8px;
  --ae-radius-md: 14px;
  --ae-radius-lg: 20px;
  --ae-radius-frame: 24px;
  --ae-radius-pill: 999px;

  --ae-shadow-card: 0 16px 46px rgb(29 29 27 / 0.07);
  --ae-shadow-float:
    0 32px 90px rgb(29 29 27 / 0.11),
    0 8px 24px rgb(29 29 27 / 0.07);

  --ae-gutter: clamp(1rem, 3vw, 2.5rem);
  --ae-section-y: clamp(5rem, 9vw, 8.5rem);
  --ae-max: 1220px;

  --ae-ease-out: cubic-bezier(0.21, 0.47, 0.32, 0.98);
  --ae-ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
}
```

These names are recommendations. Preserve semantic separation even if final variable names differ.

## Color use

### Signal orange

Use `--ae-signal` for:

- logo mark;
- large decorative strokes;
- small gradient fields;
- progress line;
- border beam;
- selected large icons;
- low-opacity surface tint.

Use `--ae-signal-aa` for:

- primary CTA fill when white normal-size text sits on it;
- small orange text on white;
- focus ring;
- normal-size links where orange is the only distinction.

Do not use signal orange as small body text on white.

### Slate

Use desaturated slate as a secondary structural color:

- connection flow;
- activity metadata;
- cool supporting card;
- architectural line work.

It should not compete with the primary orange action.

### Warm/cool/olive surfaces

Use the three soft surfaces to distinguish product chapters without turning the page into a rainbow:

- warm: reusable cost knowledge or CTA support;
- cool: structure and record flow;
- olive: review, decision, or stable history.

No card needs a saturated gradient.

## Background

The route background is `--ae-bg`.

Hero and final CTA may use a restrained light aurora:

```css
background:
  radial-gradient(60rem 36rem at 18% -5%, rgb(242 68 5 / 0.10), transparent 66%),
  radial-gradient(56rem 34rem at 82% 8%, rgb(86 118 134 / 0.10), transparent 68%),
  linear-gradient(180deg, #fffefb 0%, #f7f7f4 100%);
```

Add a grid or dot pattern with opacity under `0.16`. Mask it away near body text if needed.

Do not use a full-width dark band. A single deep-ink surface may be used inside a mini product illustration only when it represents actual product chrome.

## Typography

Use existing variables:

```css
font-family: var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Use `var(--font-roboto-mono)` for:

- badge;
- kickers;
- outcome indices;
- diagram labels;
- tiny status labels.

Do not add a display font.

### Recommended scale

| Role | CSS |
|---|---|
| Hero H1 | `clamp(2.7rem, 6.4vw, 5.8rem)` |
| Section H2 | `clamp(2rem, 4.2vw, 3.8rem)` |
| Card H3 | `clamp(1.1rem, 1.4vw, 1.4rem)` |
| Hero lead | `clamp(1rem, 1.5vw, 1.25rem)` |
| Body | `1rem` |
| Small body | `0.875rem` |
| Kicker | `0.72rem` |
| Button | `0.875rem` |

### Line-height and measure

- Hero H1: `0.98–1.04`;
- H2: `1.02–1.10`;
- body: `1.55–1.7`;
- hero title max: approximately `18ch`;
- section lead max: `58ch`;
- body paragraph max: `65ch`;
- card copy max: `42ch`.

Use `text-wrap: balance` for headings and `text-wrap: pretty` for leads where supported.

## Spacing

### Page container

```css
.container {
  width: min(100% - (2 * var(--ae-gutter)), var(--ae-max));
  margin-inline: auto;
}
```

### Section rhythm

- hero top padding: sticky-header height plus 72–112 pixels;
- hero bottom to outcome row: 40–72 pixels;
- major sections: `--ae-section-y`;
- related split sections may use 72–104 pixels;
- card internal padding: 24–36 pixels;
- mobile card padding: 20–24 pixels.

The page should feel spacious without making every section a full viewport.

## Header

- height: 66–72 pixels;
- sticky top;
- background: warm white at approximately 88–94% opacity;
- `backdrop-filter` only when supported;
- one-pixel bottom border;
- no heavy shadow;
- logo mark remains signal orange;
- nav text uses ink-soft;
- CTA uses dark orange fill;
- mobile menu surface uses opaque paper fallback.

## Buttons

### Primary

- dark-orange background;
- white text;
- minimum 44-pixel height;
- 10–12 pixel radius or pill depending on final page geometry;
- optional small arrow contained in a tinted circle;
- hover: translate up one pixel, slightly darken;
- active: translate to zero, scale no lower than `0.985`;
- focus: two-pixel dark-orange ring plus offset.

### Secondary or sign-in

- transparent or paper surface;
- border;
- ink text;
- hover: paper/soft warm background;
- no competing orange fill.

Only one primary action should dominate a section.

## Product frame

The product frame is the visual anchor.

### Outer frame

- maximum width 1120–1180 pixels;
- radius 22–26 pixels;
- paper/glass surface;
- one-pixel border;
- low-opacity warm glow behind;
- `--ae-shadow-float`;
- browser chrome height 36–42 pixels;
- three traffic-light dots may be retained;
- optional URL label: `archestimator.com/workshop` only if it does not imply the preview is live customer data.

### Inner viewport

- fixed aspect ratio close to the existing 1780:900 product composition;
- overflow hidden;
- product content scales from its existing native dimensions;
- no pointer events;
- explicit accessible label on the parent and `aria-hidden` on purely decorative cursor/drag ghost;
- static mobile crop must keep the estimate tree, rows, and library relationship legible.

### Border beam

One subtle orange-to-slate beam may travel around the outer frame. It must:

- stay under 35% opacity;
- take 8–10 seconds;
- stop under reduced motion;
- not create a large painting or blur cost;
- never obscure the border.

## Bento cards

Use 12-column CSS Grid at desktop.

Card anatomy:

```text
[kicker]                                       [icon]
[title]
[body]
[mini product illustration]
```

Surface differences:

- Structure: cool.
- Reuse: warm.
- Present: paper with orange edge detail.
- Revise: olive or neutral.

Every card should have one dominant visual idea. Do not combine a chart, list, code panel, badge cluster, and floating buttons in the same card.

## Mini product illustrations

Illustrations are semantic markup, not random decoration.

### Scope tree

- nested rows;
- one selected row;
- rollup line;
- no fake totals.

### Saved component

- component name;
- supplier/source chips;
- “Add to estimate” affordance displayed as UI, not a functioning button.

### Estimate-to-output

- estimate rows on left;
- connector;
- proposal paper and Excel tab on right;
- no unsupported file-format list.

### Revision trail

- before/after value chips;
- comment marker;
- revision label;
- decision marker.

Use `aria-hidden="true"` when the surrounding card copy already conveys the meaning.

## Connected-flow diagram

- use a real SVG or CSS grid, not canvas;
- nodes use paper surfaces and thin borders;
- estimate node receives the strongest orange accent;
- output and review nodes use slate;
- revision/decision uses olive;
- line endpoints remain visible under all breakpoints;
- mobile order is explicit in DOM, not achieved only with absolute positioning.

## Activity panel

- resembles a real product panel without copying the entire authenticated shell;
- four list rows;
- one thin vertical timeline;
- status icon and two text lines;
- no ticker;
- no auto-inserting/removing rows;
- entries reveal once as the section enters.

## Connection cards

- paper surface;
- pair label in monospace;
- small connector line;
- one body sentence;
- hover/focus lift;
- no avatar circle or quotation styling.

## Early-access cards

Card A may receive a quiet orange border or glow because it contains the action.

Card B stays neutral and informative.

Keep both equal height on desktop only when copy naturally supports it. Do not add filler text to force symmetry.

## Final CTA

Echo the hero using a smaller light aurora and grid.

- centered copy;
- maximum width 850 pixels;
- one primary CTA;
- workflow dock below;
- no particle storm;
- no dark section required.

## Iconography

Prefer existing Phosphor icons:

- tree/structure;
- stack/library;
- file/proposal;
- history/revision;
- link/connection;
- arrow;
- check;
- comment.

Use one consistent weight, likely `regular` or `bold` only for CTA arrows. Do not mix icon families.

## Focus and state treatment

Every interactive element must have:

- visible focus not dependent on color alone;
- hover only as an enhancement;
- active feedback;
- disabled styling only when the element is actually disabled;
- 44-pixel target on mobile;
- no focus trapped in visual-only cards;
- no hover-only critical text.

Cards that are not links should not receive `tabIndex=0` merely to trigger an effect. Apply focus styling only to real controls and links.

## Do not

- switch the route into dark mode;
- use tiny gray body text to imitate the template;
- apply glass blur to every card;
- place orange text on orange tint without checking contrast;
- use saturated gradients behind paragraphs;
- add arbitrary 3D objects;
- use sharp construction clichés such as hard-hat stock photos;
- create fake dashboard KPIs;
- introduce a new font or icon dependency;
- make rounded pills the only shape on the page;
- use all four supporting colors in one viewport.

## CSS ownership

Keep all route visuals in:

```text
src/components/landing-new/new-landing.module.css
```

The CSS module may style route-owned `data-*` attributes. It should not add global selectors except tightly scoped `:global(...)` rules needed to frame the reused hero demonstration.

Avoid editing `src/app/globals.css`. If a global edit becomes necessary, document why the route cannot safely own the style.
