# Motion and Microinteractions

## Motion objective

Motion should make the workflow easier to understand, not make the page feel like a component showcase.

The priority order is:

1. product state change;
2. relationship between workflow stages;
3. reveal of important content;
4. tactile response to an intentional interaction;
5. ambient atmosphere.

Every effect must have a static equivalent.

## Runtime decision

Use:

- existing `gsap`;
- existing `@gsap/react`;
- CSS keyframes;
- `IntersectionObserver`;
- `matchMedia`;
- Page Visibility API.

Do not add:

- `motion`;
- `framer-motion`;
- a second scroll library;
- Three.js;
- a particle library;
- a marquee package.

Velora’s Motion components and LaunchPad’s Framer Motion/3D behavior are references, not dependency requirements.

## Motion controller architecture

Create one route-owned client component:

```text
NewLandingMotionController.tsx
```

It should render no visible wrapper beyond what is needed for a scoped ref. Its responsibilities:

- establish scoped GSAP context;
- reveal `[data-new-landing-reveal]` elements;
- update scroll progress;
- activate connected-flow line animation when in view;
- set pointer-position variables on opted-in spotlight surfaces;
- clean up every listener, observer, and GSAP context;
- disable or simplify behavior under reduced motion.

Do not instantiate a React component for every animation target.

## Global motion preferences

Read:

```js
window.matchMedia("(prefers-reduced-motion: reduce)")
window.matchMedia("(pointer: fine)")
window.matchMedia("(hover: hover)")
```

Never branch server-rendered markup based on these values. The first HTML must remain valid and fully visible without JavaScript.

Use CSS defaults that show content. JavaScript may add a short-lived “motion-ready” attribute after mount and then animate known elements. Do not hide server content before hydration in a way that leaves it invisible when JavaScript fails.

## Hero entrance

Reuse the proven rhythm from the current landing hero:

| Target | Initial state | Duration | Relative timing |
|---|---|---:|---|
| Badge | opacity 0, y 8 | 0.42s | start |
| H1 | opacity 0, y 18, shallow clip | 0.78s | overlap badge by 0.20s |
| Lead | opacity 0, y 12 | 0.52s | overlap title by 0.48s |
| CTA/note | opacity 0, y 10, scale 0.985 | 0.42s | overlap lead by 0.34s |
| Product frame | opacity 0, y 44–56, blur 10–14 | 1.00–1.08s | begin after message is legible |
| Outcome cells | opacity 0, y 14 | 0.50s, 0.06 stagger | after frame begins |

Recommended ease:

```js
[0.21, 0.47, 0.32, 0.98]
```

or GSAP `expo.out` for the frame.

Do not animate individual words in the canonical hero. Do not type, shuffle, rotate, or continuously replace the promise.

Reduced motion renders all targets immediately with no clip, blur, or transform.

## Product demonstration playback

### Desktop loop

Loop only when all are true:

- viewport is at least the chosen demo threshold, recommended `min-width: 821px`;
- reduced motion is not requested;
- the demonstration is intersecting at a useful threshold, recommended `0.25`;
- `document.visibilityState === "visible"`;
- the component is mounted;
- no static-mode override is active.

When any condition becomes false:

- clear the current phase timer;
- end shared drag state;
- preserve the current stable phase or switch to the final static phase;
- do not continue query-cache churn offscreen.

### Mobile and reduced motion

Use:

```text
playback="static"
staticPhase="fauxwood-replaced"
```

The final phase communicates a populated estimate and replaced finish without cursor motion.

### Hydration stability

The server and first client render must agree on a deterministic phase. Recommended:

- render `fauxwood-replaced` or `ready` consistently on the server;
- begin loop only after mount and media/intersection evaluation;
- avoid reading `window` in state initialization;
- do not render a blank skeleton as the only initial product proof.

### Pause behavior

The wrapper may use an `IntersectionObserver` and visibility listener. Keep the hero component itself responsible for timer cleanup.

Suggested state:

```ts
const [isInView, setIsInView] = useState(false);
const [documentVisible, setDocumentVisible] = useState(true);
const [desktopMotionAllowed, setDesktopMotionAllowed] = useState(false);

const shouldLoop =
  isInView &&
  documentVisible &&
  desktopMotionAllowed;
```

Do not recreate the whole workspace component on every phase. Preserve the existing local update strategy.

## Scroll progress

- fixed at top;
- transform scale from 0 to 1;
- height 2 pixels;
- z-index above header;
- no text;
- no transition lag that makes the value inaccurate;
- update through GSAP ScrollTrigger or a passive scroll calculation, not both;
- clean up on unmount.

Under reduced motion, a progress indicator may still update because it communicates position, but remove easing and any glow.

## Section reveal

Targets opt in with:

```html
data-new-landing-reveal
data-reveal-direction="up"
data-reveal-delay="0.08"
```

Rules:

- reveal once;
- maximum offset 24 pixels;
- maximum blur 6 pixels;
- duration 0.45–0.65 seconds;
- stagger card groups by 0.05–0.08 seconds;
- viewport margin around `0px 0px -10% 0px`;
- never hide an entire section behind a long delay;
- never animate height.

Reduced motion bypasses the hidden state.

## Light aurora

CSS keyframes:

- three fields;
- 14, 18, and 22 seconds;
- alternate direction;
- translation under 14%;
- scale between 0.95 and 1.18;
- opacity under 0.16;
- hero and final CTA only.

Stop all aurora animation under reduced motion.

At most one other perpetual animation may share the viewport with an aurora.

## Border beam

Use one pseudo-element around the hero product frame.

- duration: 9 seconds;
- linear;
- beam length: visually under 18% of perimeter;
- opacity: 0.22–0.35;
- no filter blur over 8 pixels;
- stop under reduced motion;
- hide when the frame is not in view if easy to do without extra observers.

Do not add border beams to every card.

## Audience marquee

- duration: 32 seconds desktop, 38 seconds tablet;
- linear;
- duplicate track for seamless loop;
- pause on hover;
- pause when a descendant receives focus;
- no pointer capture;
- items remain readable at normal body size;
- use a fade mask at edges only if contrast remains adequate.

Reduced motion:

- no duplicated hidden semantic content;
- show one wrapped list;
- no translate animation.

## Connected-flow beam

The connected-record diagram may animate one stroke:

- 4.8–6 seconds;
- dash offset or gradient position;
- no flashing;
- begin when the diagram enters;
- optionally run one or two cycles, then settle;
- keep static lines visible underneath;
- vertical equivalent on mobile.

Nodes may receive a one-time emphasis in workflow order. Do not loop all node pulses continuously.

## Activity entries

Entries reveal once from a 10–14 pixel offset with a 0.07-second stagger. They do not auto-delete or recycle.

A small changed-value chip may pulse once when it appears, then settle.

Do not use fake “live” status, live dots, or counters.

## Spotlight cards

Only on devices with hover and fine pointer:

- update `--spotlight-x` and `--spotlight-y`;
- render a radial gradient pseudo-element;
- maximum opacity 0.10;
- no React state per pointer move;
- set CSS variables directly on the element;
- remove listeners on cleanup.

Keyboard focus:

- use centered static highlight;
- add visible focus only if the card contains an actual link/control;
- noninteractive cards do not become tabbable for an effect.

## Connection-card lift/tilt

- translate Y maximum `-4px`;
- rotate X/Y maximum `2deg`;
- duration 180–240ms;
- `transform-style: preserve-3d` only on fine-pointer desktop;
- no tilt on mobile;
- no persistent oscillation.

The card remains fully readable without hover.

## Buttons

Primary CTA:

- hover: `translateY(-1px) scale(1.01)`;
- active: `translateY(0) scale(0.985)`;
- arrow: translate X by 2–3 pixels;
- duration 180–220ms;
- focus does not animate continuously.

Mobile/touch uses active feedback only.

## FAQ

Use native `<details>`.

Permitted enhancement:

- rotate chevron 90 or 180 degrees;
- fade the answer in;
- no height animation that clips focus or requires measured layout;
- preserve native keyboard behavior.

Reduced motion removes the answer fade.

## Final workflow dock

- item scale maximum `1.12`;
- nearest-neighbor scale may be `1.04`;
- transition 160–220ms;
- label always visible on mobile;
- desktop label may appear on hover/focus;
- every icon has an accessible name;
- dock does not navigate unless a real destination is defined.

Do not reproduce macOS magnification physics or add a spring dependency.

## Lifecycle and cleanup checklist

Every effect must account for:

- component unmount;
- route navigation;
- back/forward cache;
- reduced-motion preference change;
- viewport media-query change;
- tab visibility change;
- element removal;
- strict-mode effect re-entry;
- GSAP context revert;
- timer cancellation;
- observer disconnection;
- pointer-listener removal;
- shared drag-state cleanup.

## Simultaneous-motion budget

No viewport should contain more than two perpetual animations.

Examples:

- hero: aurora + product loop; border beam may replace one or run at very low salience;
- audience: marquee only;
- workflow: one beam only;
- final CTA: aurora + dock interaction, where dock moves only on intent.

If a third permanent effect appears, remove or convert it to one-shot motion.

## Performance rules

- animate `transform` and `opacity`;
- avoid layout properties;
- avoid full-screen filters;
- avoid animating large box shadows;
- do not set `will-change` permanently on dozens of nodes;
- clear `will-change` after one-shot reveals;
- no requestAnimationFrame pointer loop when direct CSS-variable updates suffice;
- no canvas or WebGL;
- no motion-generated DOM churn;
- reserve all geometry before animation.

## Static fallback standard

With JavaScript disabled or motion reduced, the page must still show:

- the complete approved message;
- every section;
- a populated product demonstration or stable product frame;
- the connected-record lines;
- all activity entries;
- all FAQ answers on user request;
- every CTA and destination;
- no blank opacity-zero content.

## Motion acceptance

Motion is acceptable only when:

- it clarifies workflow progression or product behavior;
- it does not alter factual meaning;
- it is not required to discover content;
- it stops when offscreen or hidden where appropriate;
- it respects reduced motion;
- it adds no new runtime;
- it creates no horizontal overflow or layout shift;
- its cleanup is explicit.
