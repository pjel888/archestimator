# `/new` Section, Type, Grid, Motion, and Proof System

This file is the implementation authority for the redesigned page. It translates the current Attio homepage grammar into original Archestimator content without reusing the current `/new` surface.

## 1. Global Geometry

### Viewport stack

| Range | Announcement | Header | Sticky offset |
|---|---:|---:|---:|
| `<768px` | `48px` | `52px` | `100px` |
| `768–991px` | `48px` | `52px` | `100px` |
| `≥992px` | `48px` | `68px` | `116px` |

The announcement and header are sticky as one stack. Do not nest sticky elements in separate containing blocks that break the shared offset.

### Container and columns

- Root frame: `width: min(100%, 1440px)`; centered.
- Inline padding: `16px` below `768px`, `24px` at and above `768px`.
- Grid: 24 equal columns; structural divisions use borders rather than conventional wide gutters.
- Text measure: hero lead `486px`; ordinary body `520–640px`; long FAQ answer `720px` maximum.
- Desktop workflow rail: columns `1–6`; chapter body `7–24`.
- Product windows may extend across `22–24` columns. Text never does.

### Breakpoints

- `640px`: intermediate hero type and two-up compact facts.
- `768px`: desktop product-window aspect ratio and non-mobile section spacing.
- `992px`: full navigation and vertical sticky workflow rail.
- `1280px`: paired proof panels and four-card status rail.

### Vertical rhythm

| Token | Mobile | Desktop | Use |
|---|---:|---:|---|
| `--section-intro-top` | `88px` | `152px` | Thesis/introduction bands |
| `--section-intro-bottom` | `64px` | `80px` | Thesis/introduction bands |
| `--section-body-gap` | `48px` | `80px` | Major internal separation |
| `--panel-gap` | `16px` | `24px` | Product panels |
| `--control-gap` | `8px` | `8px` | Buttons/tabs |

## 2. Type Contract

Use scoped Inter variable font through `next/font/google`; `400`, `500`, and `600` only. The imported canonical logo component remains unchanged.

| Role | Mobile | Desktop | Weight | Tracking |
|---|---|---|---:|---:|
| Announcement / micro | `12/18` | `12/18` | 500 | `0` |
| Label / eyebrow | `13/18` | `13/18` | 500 | `-0.01em` |
| Nav / button | `14/20` | `14/20` | 500–600 | `-0.01em` |
| Body small | `14/20` | `14/20` | 400–500 | `-0.01em` |
| Body | `16/22` | `16/22` | 400–500 | `-0.01em` |
| Hero lead | `15/19.5` | `18/23.4` | 400–500 | `-0.01em` |
| Chapter H3 | `20/24` | `24/27.6` | 500 | `-0.02em` |
| Section H2 | `32/36` | `40/44` | 500 | `-0.025em` |
| Dark title | `40/40` | `56–64/1` | 600 | `-0.03em` |
| Hero H1 | `40/38`; `56/54` ≥640 | `64–80/.95` | 600 | `-0.02em` |
| Final CTA | `36/36` | `56/56` | 600 | `-0.03em` |

Rules:

- Hero desktop value is `clamp(64px, calc(16px + 5.333svh), 80px)`.
- No heading, number, or decorative word exceeds `80px`.
- Use sentence case. Avoid uppercase paragraphs and giant generic nouns.
- Use `font-variant-numeric: tabular-nums` for quantities, rates, currency, dates, and status counts.
- Lock the desktop hero line break after “build,”; allow natural wrapping below `768px`.

## 3. Color and Material Contract

```text
canvas          #FFFFFF
canvas-muted    #F7F7F5
ink             #111214
ink-muted       #62656C
line            #E6E6E3
line-strong     #D4D5D1
dark            #0E0F11
dark-muted      #A9ABB2
signal          #F24405
signal-aa       #C63804
signal-wash     #FFF1EA
```

- Signal is used for the logo, active rail/tab, focus ring, one primary CTA, small state marks, and selected product details.
- Normal text on a Signal fill is dark ink, never white.
- Small orange text on white uses `signal-aa`.
- Dark sections use white/gray type and Signal only as a local state indicator.
- Standard surfaces have one hairline and no shadow. Product windows may use an outline plus `1px`, `3px`, `8px`, and `16px` layered depth.
- Buttons: `36px` desktop height, `40px` narrow height, `10px` radius, `12–16px` inline padding.
- Product windows: `8–16px` radius. Ordinary marketing blocks: `0–10px`, not pills.

## 4. Exact 18-Band Attio Mapping

The 18 bands below preserve the live Attio homepage's current functional sequence one-for-one. Reference beats that depend on unavailable customer, metric, integration, or developer-platform proof receive an explicitly labelled Archestimator substitute in the same ordinal position; they are not merged, removed, or replaced by a differently ordered section.

### Band 01 — Announcement

- **Height:** `48px` all widths.
- **Content:** “Now onboarding design partners” plus text link “Request early access”. Do not imply an open public beta.
- **Style:** dark `#0E0F11`, centered compact type, one subtle Signal mark.
- **Action:** `/contact?intent=started#contact-form`.
- **Motion:** none beyond link microinteraction.

### Band 02 — Owned header

- **Height:** `52px` narrow, `68px` desktop; sticky below announcement.
- **Left:** canonical `ArchestimatorLogo`, mark `28–30px`, wordmark visible where space permits.
- **Desktop nav:** `Product #product`, `Workflow #workflow`, `Context #context`, `Trust #trust`.
- **Right:** primary CTA. No login/account-state branching on this static preview route.
- **Mobile:** logo, compact CTA from `640px` when it fits, and accessible menu button; menu is an in-flow panel, not a full-screen animation.
- **Forbidden:** shared `LandingHeader`, old `/new` nav, dropdown mega menus, duplicate header.

### Band 03 — Centered hero and product composition

- **Anchor:** top of `main`.
- **Desktop height:** copy zone approximately `500–560px` before the product stage.
- **Layout:** centered `18/24` width with H1 max `900px` and lead max `486px`.
- **Eyebrow:** “Construction estimate-to-proposal workspace”.
- **H1:** exact approved hero sentence.
- **Lead:** exact approved subheadline.
- **CTA:** one primary only.
- **Entry:** eyebrow `0ms`, H1 `100ms`, lead `200ms`, CTA `300ms`; blur/fade/8px rise.
- **Desktop scroll response:** copy pins at the shared sticky offset; any initial scroll moves it to opacity `0`/blur `2.5px` within `800ms`. No scrubbed multi-scene timeline.
- **Mobile:** no pin/fade-on-scroll; content remains in document flow and fully visible.

#### Product-stage zone

- **Anchor:** `id="product"`.
- **Desktop shell:** `75vw`, max `1440px`, target aspect around `1.76–1.92:1`, nearly edge-dominant.
- **Mobile shell:** approximately viewport width minus `16px` total; purpose-built square/portrait compositions, never a crushed desktop dashboard.
- **Atmosphere:** pale Signal gradient plus `1px / 8px` stripes behind the window.
- **Tabs/states:** `Estimate`, `Reusable knowledge`, `Proposal output`, `Client review`.
- **Data:** fixture-only. The product window is original DOM/SVG, based on the source truth matrix.
- **Playback:** in view only; one cycle; reference-paced dwell sequence `11s / 6.5s / 17s / 6.5s` only when each animation contains meaningful staged proof. Otherwise shorten the scene rather than show idle time.
- **Controls:** tablist with `aria-selected`; manual selection stops autoplay. Progress is visible but not the only selection signal.
- **Performance:** no canvas/video; no hydration for static scene internals; client controller toggles state/data attributes only.

### Band 04 — Capability proof matrix

- **Attio analogue:** logo wall.
- **Purpose:** preserve the grid/proof beat without fake customers.
- **Desktop:** `5 × 2` or `5 × 3` hairline matrix depending copy fit; mobile `2` columns.
- **Cells:** source-verified capabilities such as structured estimates, reusable components, templates, Excel proposal preview/export, shared proposals, contextual comments, decisions, activity/version context, access controls, and client-portal review.
- **Copy:** capability names only; no metrics, badges, company logos, “trusted by”, or availability stronger than source truth.
- **Motion:** static desktop; no rotating fake proof on mobile.

### Band 05 — Platform thesis

- **Anchor:** `id="workflow"` begins after this intro.
- **Label:** “Platform”.
- **H2:** one sentence that expresses the connected workflow, using approved corpus language rather than Attio copy.
- **Lead:** explain that the working estimate, output, review, and decision context should not become detached.
- **Geometry:** label in `4/24`; statement in `14–16/24`; remaining columns retain structural whitespace.

### Band 06 — Five-chapter sticky workflow

- **Desktop:** approximately five long chapters, each `min-height: max(880px, calc(100svh - 116px))`; rail sticky at `top:116px` and fills the remaining viewport.
- **Desktop split:** `6/24` rail + `18/24` content; paired proof cards become two-up at `1280px`.
- **Narrow:** `53px` horizontal sticky selector below the `100px` header; chapters flow vertically; complex panels become horizontal snap or compact accordions as specified per chapter.
- **Active threshold:** chapter whose top crosses about `45%` viewport. Indicator transition `320ms`.
- **Panel reveal:** begins at `70–75vh` from opacity `0`, blur `2.5px`, translateY `16px`; settles within `800ms`.

Chapters:

1. **Build the estimate** — hierarchy, quantities, rates, totals; show source fields and deterministic calculation, not AI.
2. **Reuse what you know** — search/select reusable components/templates/project sources; no global cost-database claim.
3. **Carry it into the proposal** — proposal preview and Excel output remain recognizably tied to the estimate.
4. **Review it in context** — issued proposal, financial overview, row-targeted comments, version identity.
5. **Revise with the trail intact** — decision/activity/version context informs work; explicitly do not show an automatic feedback-to-estimate mutation.

### Band 07 — Reusable intelligence

- **Attio analogue:** self-building section.
- **Headline:** user-owned cost knowledge becomes easier to find and reuse.
- **Demo:** four states—source search, preview, insertion, structured result—using the shared product-playback controller.
- **Cadence:** meaningful step changes may use Attio's fast `820ms` build sequence, but run only once in view and render the final state immediately under reduced motion.
- **Copy guard:** “reusable” and “user-owned” are allowed; “self-learning”, “automatic intelligence”, and AI claims are not.

### Band 08 — Dark connected-context act

- **Anchor:** `id="context"`.
- **Attio analogue:** Universal Context dark thesis, but no trademarked wording or replica.
- **Title:** “One connected cost record.” or another corpus-approved equivalent, capped at `64px`.
- **System diagram:** conceptual—not a product screenshot—showing Estimate → Proposal/Excel → Review → Decision/Revision context.
- **Properties:** traceable source, issued version, targeted feedback, recorded decision, preserved activity.
- **Style:** vertical hairline grid and restrained Signal illumination; no ambient perpetual hue loop.
- **Motion:** use the standard reveal family only. No separate carousel or marquee.

### Band 09 — Decision signals

- **Attio analogue:** Signals, preserved as its own ordinal beat.
- **Headline:** the meaningful events around a cost decision remain visible without becoming noise.
- **Three panes:** `Estimate context`, `Review signal`, and `Decision state`; each uses the shared product-playback controller and source-backed fixture fields.
- **Proof:** source/version identity, a targeted discussion, and an issue-wide approve/request-changes/decline receipt.
- **Motion:** one in-view cycle or manual tabs; no new motion family, marquee, or continuous ambient loop.
- **Copy guard:** signals are recorded product states, not AI detection, prediction, automation, or automatic estimate mutation.

### Band 10 — Connected handoffs

- **Attio analogue:** Connectivity, preserved as its own ordinal beat without an integration-logo rail.
- **Desktop:** two wide handoff panels: `Editable Excel output` and `Client portal review`; mobile stacks purpose-built, readable compositions.
- **Continuity cue:** reuse the same fictional project/version identity across both panels so the estimate-to-output relationship is visible.
- **Proof:** proposal preview/download and issued review context only.
- **Copy guard:** do not imply integrations, live two-way Excel synchronization, document coediting, e-signature, contract execution, or automatic approval.

### Band 11 — Structured control layer

- **Attio analogue:** Developer platform, preserved as its own ordinal beat through truthful system structure rather than false API/SDK proof.
- **Headline:** “Structured enough to trace. Controlled enough to trust.” or an approved equivalent.
- **Visual:** an original DOM/SVG record inspector showing row source, source version, issued issue/version, discussion target, actor/time, and decision receipt.
- **Purpose:** demonstrate explicit identifiers and user-controlled transitions; do not present a developer console or claim public APIs, SDKs, MCP, integrations, or extensibility.
- **Motion:** standard reveal only; values do not stream or fabricate live events.

### Band 12 — Founder trust

- **Attio analogue:** testimonial beat; **Comand cue:** human authority remains explicit.
- **Content:** verified founder perspective from the supplied corpus/about source: architect + software engineer, product built around real estimating/communication friction.
- **Layout:** centered editorial statement with attribution; no fabricated customer quote.
- **Motion:** standard word/line reveal is allowed, but no `250svh` pinned quote because there is no real testimonial warranting that emphasis.

### Band 13 — Honest proof matrix

- **Anchor:** `id="trust"`.
- **Attio analogue:** scale metrics.
- **Replacement:** four factual principles, not numerical traction: `Structured`, `Traceable`, `Reviewable`, `User-controlled`.
- **Supporting facts:** map each principle to a source-verified product state.
- **Forbidden:** invented counts, time savings, accuracy rates, enterprise-security labels, or customer scale.

### Band 14 — Illustrative project workflow story

- **Attio analogue:** customer story, preserved as its own ordinal beat without pretending a fictional case is customer proof.
- **Disclosure:** label the band “Illustrative workflow” and state that its project, people, and values are sanitized demonstration data.
- **Structure:** four manual tabs—`Estimate`, `Reuse`, `Review`, `Decision`—following the one fixture already used in product proof.
- **Layout:** reference-like tab strip above a two-column editorial/product composition; mobile uses a native snap rail and stacked scene.
- **Forbidden:** customer logo, testimonial voice, quantified result, before/after ROI, or wording such as “case study”, “customer”, or “trusted by”.
- **Motion:** no autoplay; selection only, using existing microinteraction/switch tokens.

### Band 15 — Current product/status rail

- **Attio analogue:** changelog, preserved as its own ordinal beat.
- **Desktop:** four cards; mobile: native horizontal mandatory-snap rail with readable fixed card width.
- **Cards:** structured estimating, reusable library, proposal/Excel output, client review/decision. Each card states only current/partial reality and uses one original product crop.
- **No dates/frequency claim:** do not say “new every week” or imply a public changelog cadence.
- **Motion:** no autoplay. Snap/scroll only.

### Band 16 — Early-access briefing and FAQ

- **Attio analogue:** newsletter; **Intercom cue:** commercial clarity.
- **Purpose:** answer four high-friction questions: what it is, who it is for, what early access includes, and whether users can keep Excel in the workflow.
- **Desktop:** intro `8/24` + questions `16/24`.
- **Mobile:** native `details/summary` disclosures; no custom accordion JavaScript.
- **CTA:** one text link to the same early-access destination; no embedded email capture, fake subscription acknowledgement, or second conversion path.

### Band 17 — Dark final CTA

- **Headline:** approved connected-workflow promise, maximum `56/56px`.
- **CTA:** Signal fill with dark ink; same destination and label as hero.
- **Style:** dark grid, local Signal line/mark; no full-orange band.
- **Motion:** standard reveal only. No continuous stream, marquee, or canvas.

### Band 18 — Owned footer

- **Content:** canonical logo, one-sentence category descriptor, Product/Company/Legal link groups, copyright.
- **Links:** only existing, verified routes. Do not invent docs, integrations, customers, or careers destinations.
- **Mobile:** stacked groups or native disclosures; footer remains semantic and crawlable.
- **Forbidden:** shared `LandingFooter`, old `/new` footer, duplicate CTA system.

## 5. Motion Controller Contract

### Shared lifecycle rules

Every client island must:

1. initialize from server-rendered final/readable markup;
2. read `prefers-reduced-motion` before starting;
3. use `IntersectionObserver` to start near the viewport and pause when outside;
4. pause on `document.visibilityState !== "visible"`;
5. stop autoplay after any pointer, keyboard, or tab selection;
6. clear timers/observers/listeners on unmount;
7. avoid layout reads inside animation loops;
8. expose state through semantic controls or keep decorative internals out of the accessibility tree.

### Easing/timing tokens

```text
reveal         cubic-bezier(0, 0, .58, 1)
ui-out         cubic-bezier(.33, 1, .68, 1)
ui-in-out      cubic-bezier(.65, 0, .35, 1)
exit           cubic-bezier(.32, 0, .67, 0)
hover-enter    50ms
hover-exit     300ms
indicator      320ms
reveal         600ms
entrance       800ms
stage          900ms
```

### Reduced motion

- No blur or scale travel.
- No autoplay, timer, progress animation, smooth scrolling, spring, marquee, or counter.
- All scenes render in a useful final state.
- Sticky navigation may remain sticky, but content order and reachability cannot depend on scroll-linked state.

## 6. Responsive Contract

### `<640px`

- `40/38px` hero, `24px` apparent hero margin, one full-width CTA.
- Header shows mark/wordmark when it fits; menu owns remaining navigation.
- Product stage uses one clear state at a time; no tiny four-column UI.
- Proof grids use two columns; status cards snap horizontally.

### `640–767px`

- Hero rises to `56/54px`.
- Header may expose CTA plus menu.
- Product tabs scroll horizontally and keep active tab centered.

### `768–991px`

- Hero uses desktop aspect product stage and `64px` minimum heading.
- Navigation remains compact-menu mode.
- Workflow selector remains horizontal sticky; panels may use two columns if minimum readable widths hold.

### `992–1279px`

- Full header nav.
- Vertical `6/24 + 18/24` workflow split.
- Paired panels remain stacked until `1280px`.

### `≥1280px`

- Paired proof cards become two columns.
- Hero stage approaches the `1440px` cap.
- No additional type inflation beyond the declared ceilings.

## 7. Accessibility Contract

- One `h1`, sequential section headings, one `main`, one header, one footer.
- Skip link targets `#main-content` and clears the `116px` sticky stack.
- `scroll-margin-top` equals the current sticky offset for all anchors.
- Minimum interactive target `40×40px` mobile; visible focus ring using Signal with sufficient outline separation.
- Signal fill uses dark ink. Small orange-on-white uses `#C63804`.
- Tablist uses arrow-key behavior only if it is implemented as a true tab interface; otherwise use ordinary links/buttons.
- Decorative product visuals are `aria-hidden`; semantic summaries remain visible to assistive technology.
- No information depends solely on orange, motion, hover, or a progress line.
- Native `details/summary` for mobile FAQ.

## 8. Static and Runtime Boundaries

- `NewLandingExperience.tsx` and section compositions are Server Components.
- Only `MobileMenu.client.tsx`, `HeroStage.client.tsx`, `ProductPlayback.client.tsx`, and `WorkflowRail.client.tsx` carry `"use client"`.
- Client components receive serializable content/fixture data; they do not import server-only modules.
- Route CSS stays inside new CSS Modules; do not add global route CSS because Next 16 global styles can persist across navigation.
- Keep `src/app/new/page.tsx` thin and independently declare `dynamic = "force-static"`; render only the fresh experience and author a fresh literal `Metadata` object.
- Do not import `PublicPageShell`, `buildLandingMetadata`, the current route title/description, or any existing landing shell/chrome implementation.
- Do not add cookie/session reads to the route. CTA copy remains stable.

## 9. Originality Guardrail

Allowed: observed proportions, information cadence, grid division, type scale, sticky offsets, reveal timings, and interaction principles.

Forbidden: Attio/Comand/Intercom copy, code, CSS, proprietary fonts, trademarks, customer logos, imagery, metrics, product screenshots, interface replicas, gradients copied verbatim, or data. Every visual and sentence must be authored for Archestimator from the supplied corpus and repository truth.
