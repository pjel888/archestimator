# Annotated Wireframes

## Legend

```text
[CTA]      interactive primary action
(link)     utility or navigation link
{motion}   optional enhancement with static fallback
[UI]       real or semantic product UI
---        border or section boundary
```

These are layout contracts, not pixel-perfect mocks.

## Desktop — 1280 to 1440 pixels

```text
╔══════════════════════════════════════════════════════════════════════════════════════╗
║ {2px scroll progress}                                                               ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║ [Archestimator]      Product  Workflow  Connected record  FAQ   (Sign in) [CTA]     ║
╚══════════════════════════════════════════════════════════════════════════════════════╝

                      [Pre-release MVP · Design partner access]

          Make every estimate easier to build, clearer to present,
                       and simpler to approve.

        Archestimator helps AEC teams reduce rework, communicate project
        costs clearly, and move decisions forward without losing context
                         through reviews and revisions.

                             [Request early access]
          Construction estimating software built around the estimate-to-proposal workflow.

       ╭──────────────────────────────── PRODUCT FRAME ────────────────────────────────╮
       │ ● ● ●                                                     archestimator.com   │
       ├───────────────────────────────────────────────────────────────────────────────┤
       │                                                                               │
       │       [REAL SANITIZED ESTIMATE WORKSPACE — LOOP WHEN IN VIEW]                 │
       │       hierarchy / estimate rows / reusable library / drag-replace             │
       │                                                                               │
       ╰───────────────────────────────────────────────────────────────────────────────╯
                        Sanitized Archestimator workspace demonstration

       ┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
       │ 01 Structure     │ 02 Reuse         │ 03 Present       │ 04 Revise        │
       │ one sentence     │ one sentence     │ one sentence     │ one sentence     │
       └──────────────────┴──────────────────┴──────────────────┴──────────────────┘

────────────────────────────────────────────────────────────────────────────────────────
                             Built for teams that own the number
      { Estimators · Architects · Engineers · General contractors · Specialty ... }
────────────────────────────────────────────────────────────────────────────────────────


                                 THE WORKING RECORD
               Build the number once. Keep its context as the work moves forward.
                              one short section lead

       ┌──────────────────────────────────────┬───────────────────────────────────┐
       │ 01 · Structure                      │ 02 · Reuse                        │
       │ Build around real project structure │ Reuse cost knowledge...          │
       │                                     │                                   │
       │ [nested scope tree]                 │ [saved component + source]        │
       └──────────────────────────────────────┴───────────────────────────────────┘
       ┌──────────────────────────────┬───────────────────────────────────────────┐
       │ 03 · Present                │ 04 · Revise                              │
       │ Present without rebuilding │ Revise without erasing the reason       │
       │ [estimate → proposal/xlsx]  │ [comment → changed value → decision]     │
       └──────────────────────────────┴───────────────────────────────────────────┘


       ┌────────────────────────────────┬──────────────────────────────────────────┐
       │ ONE CONNECTED WORKFLOW         │                                          │
       │ The estimate should not lose   │ [Scope]    [Library + sources]           │
       │ context when it becomes a      │      \       /                           │
       │ proposal.                      │       [Estimate] → [Proposal / Excel]     │
       │ short lead                     │                         → [Review]         │
       │ optional 3 bullets             │                         → [Revision + D]   │
       └────────────────────────────────┴──────────────────────────────────────────┘


       ┌──────────────────────────────────────────┬────────────────────────────────┐
       │ SANITIZED WORKFLOW EXAMPLE               │ REVIEW IN CONTEXT              │
       │  ○ Kitchen floor finish replaced        │ Show the work changing         │
       │  │ Estimate · changed value retained    │ without losing why.            │
       │  ○ Client comment added...              │                                │
       │  │ Review · context attached            │ one short lead                 │
       │  ○ Proposal revision prepared           │                                │
       │  ○ Decision recorded                    │                                │
       └──────────────────────────────────────────┴────────────────────────────────┘


       A connected workflow does not have to erase the tools or context already used.

       ┌────────────────────────┬────────────────────────┬─────────────────────────┐
       │ Structured real scope  │ Excel stays            │ Client review attached  │
       │ icon + short body      │ icon + short body      │ icon + short body       │
       └────────────────────────┴────────────────────────┴─────────────────────────┘


                              COMMERCIAL CONTEXT
                              What stays connected.
                              one short lead

       ┌────────────────────────┬────────────────────────┬─────────────────────────┐
       │ Cost ↔ Source note     │ Component ↔ Supplier   │ Estimate ↔ Proposal     │
       │ one sentence           │ one sentence           │ one sentence            │
       ├────────────────────────┼────────────────────────┼─────────────────────────┤
       │ Comment ↔ Context      │ Revision ↔ Value       │ Decision ↔ History      │
       │ one sentence           │ one sentence           │ one sentence            │
       └────────────────────────┴────────────────────────┴─────────────────────────┘


                          DESIGN PARTNER ACCESS
             Start with the workflow that already costs your team time.
                              one short lead

       ┌──────────────────────────────────────┬───────────────────────────────────┐
       │ Request early access                 │ What to expect                    │
       │ audience + no commitment context     │ 3 concise expectation points     │
       │                                      │                                   │
       │ [Request early access]               │ pre-release clarification         │
       └──────────────────────────────────────┴───────────────────────────────────┘


                     Questions before changing the estimating workflow.

       ┌───────────────────────────────────────────────────────────────────────────┐
       │ Who is Archestimator for?                                             [+] │
       ├───────────────────────────────────────────────────────────────────────────┤
       │ Does Archestimator replace Excel?                                     [+] │
       ├───────────────────────────────────────────────────────────────────────────┤
       │ What can teams save and reuse?                                        [+] │
       ├───────────────────────────────────────────────────────────────────────────┤
       │ Can clients review and respond to proposals?                           [+] │
       ├───────────────────────────────────────────────────────────────────────────┤
       │ Is Archestimator generally available?                                 [+] │
       └───────────────────────────────────────────────────────────────────────────┘


          Keep the estimate, proposal, and conversation connected.
                  one short sentence     [Request early access]

                 [Estimate] [Reuse] [Proposal] [Revision]  {dock}


────────────────────────────────────────────────────────────────────────────────────────
[Logo]  concise boilerplate                     Product Workflow About Contact ...
       © 2026 Archestimator.                     Privacy Terms Sign in
────────────────────────────────────────────────────────────────────────────────────────
```

## Desktop annotations

1. Header does not exceed approximately 72 pixels.
2. Hero copy is centered and capped; product frame carries the width.
3. Product frame begins above the fold on common laptop heights but does not force the H1 into a narrow measure.
4. Outcome row visually belongs to the hero.
5. Audience marquee is a thin transition, not a second hero.
6. Bento section is the first deep product explanation.
7. Connected-record and activity sections alternate visual weight.
8. Connection cards replace testimonial density.
9. Early-access two-card layout replaces pricing without looking empty.
10. Final CTA echoes hero but is smaller.

## Tablet — 768 to 1023 pixels

```text
[Logo]                                                    [Menu or compact nav]

[Badge]
Hero H1, 2–4 balanced lines
Lead
[CTA]

┌──────────────────────── PRODUCT FRAME ─────────────────────────┐
│ real product demo; loop may be disabled below threshold        │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────┬───────────────────────┐
│ Structure             │ Reuse                 │
├───────────────────────┼───────────────────────┤
│ Present               │ Revise                │
└───────────────────────┴───────────────────────┘

Audience wrapped/static or marquee

Bento: 1–2 columns
Connected flow: vertical/compact
Activity: copy then panel or balanced stack
Principles: 1–3 columns based on min width
Connections: 2 columns
Early access: stacked unless equal readable widths
FAQ: full width
CTA/dock: dock labels visible
Footer: wrapped columns
```

## Mobile — 360 to 480 pixels

```text
╔════════════════════════════════════════╗
║ [Logo]                         [Menu]  ║
╚════════════════════════════════════════╝

[Pre-release MVP · Design partner access]

Make every estimate
easier to build,
clearer to present,
and simpler to approve.

short approved subheadline

[ Request early access ]

Construction estimating software built
around the estimate-to-proposal workflow.

╭────────── PRODUCT FRAME ───────────────╮
│ ● ● ●                                  │
├─────────────────────────────────────────┤
│ REAL SANITIZED WORKSPACE               │
│ STATIC: fauxwood-replaced              │
│ estimate + library relationship visible│
╰─────────────────────────────────────────╯
Sanitized Archestimator workspace demonstration

┌──────────────────┬─────────────────────┐
│ 01 Structure     │ 02 Reuse            │
├──────────────────┼─────────────────────┤
│ 03 Present       │ 04 Revise           │
└──────────────────┴─────────────────────┘
# At 360px this may become one column if copy crowds.

Built for teams that own the number
[static wrapped role list under reduced motion]

Product heading
Lead

┌─────────────────────────────────────────┐
│ 01 Structure                            │
│ copy                                    │
│ [scope tree]                            │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 02 Reuse                                │
│ copy                                    │
│ [saved component]                       │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 03 Present                              │
│ copy                                    │
│ [outputs]                               │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 04 Revise                               │
│ copy                                    │
│ [revision trail]                        │
└─────────────────────────────────────────┘

Connected workflow heading
Lead

[Scope]
   ↓
[Library + sources]
   ↓
[Estimate]
   ↓
[Proposal / Excel]
   ↓
[Review]
   ↓
[Revision + decision]

Review heading
Lead
[activity panel]

[principle]
[principle]
[principle]

What stays connected
[connection]
[connection]
[connection]
[connection]
[connection]
[connection]

Early access
[action card]
[expectation card]

FAQ details x 5

Final promise
[CTA]
[Estimate] [Reuse]
[Proposal] [Revision]

Footer stack
```

## Mobile annotations

1. Product proof is never `display:none`.
2. Autoplay is not needed to understand the hero.
3. No horizontal diagram; use DOM-order vertical flow.
4. Marquee can become a wrapped list.
5. Cards do not hide descriptions until hover.
6. Menu and FAQ use native controls.
7. CTA remains visible without sticky bottom overlays.
8. Dock labels remain visible; magnification is disabled.
9. Decorative aurora/blur is reduced.
10. Every section has `scroll-margin-top`.

## Spacing sketch

Recommended desktop:

```text
Header                  68–72px
Hero top                88–120px below header
Hero copy → frame       56–80px
Frame → outcomes        32–48px
Hero end → audience     56–80px
Major section padding   80–136px
Related split gap       48–80px
Final CTA padding       88–128px
```

Recommended mobile:

```text
Header                  64–68px
Hero top                56–72px
Hero copy → frame       36–48px
Frame → outcomes        24–32px
Major section padding   64–88px
Card gap                14–18px
Card padding            20–24px
```

## Product-frame crop notes

At mobile scale, crop priority is controlled through the outer viewport, not by hiding the source component.

Potential approach:

```css
.productViewport {
  aspect-ratio: 16 / 10;
  container-type: inline-size;
  overflow: hidden;
}

.productScale {
  width: 1780px;
  height: 900px;
  transform: scale(calc(100cqw / 1500px));
  transform-origin: 34% 28%;
}
```

The exact denominator and origin must be tuned to keep the estimate and library relationship visible. Do not claim this sample value is final without visual inspection.

## Wireframe deviation rule

A layout deviation is acceptable when it:

- improves product legibility;
- resolves accessible reading order;
- prevents overflow;
- respects the content-density ceiling;
- does not change the macro section sequence.

Document material deviations in the completion report.
