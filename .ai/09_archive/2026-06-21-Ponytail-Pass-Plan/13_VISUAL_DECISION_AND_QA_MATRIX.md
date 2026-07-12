# 13 — Visual Decision And QA Matrix

**Date:** 2026-06-21 · **Status:** OWNER-READY VISUAL HANDOFF

This document turns the four visual dependency questions into implementation-ready decision records. It exists because a visual dependency swap is not just a package cleanup: it changes landing-page hierarchy, motion, perceived polish, and accessibility.

## Required owner decision record

Before any T1.5-T1.8 source edit, record this table in the PR or `.ai/05_logs/`:

| Field | Required value |
|---|---|
| Decision | `keep` or `swap` |
| Owner/date | Owner name + exact date |
| Visual intent to preserve | The product-specific communication job the current visual performs |
| Acceptable changes | What can visibly change without follow-up approval |
| Must not change | First-viewport signal, hierarchy, text readability, click/keyboard behavior, reduced-motion behavior |
| Evidence | Desktop/tablet/mobile screenshots or explicit "not visual" evidence if keep/no-op |
| Stop condition | Owner signs off or the swap is reverted |

## Dependency matrix

| Item | Default decision posture | Visual intent | If swapping, use this replacement path | Must not change | Required QA |
|---|---|---|---|---|---|
| T1.5 `@firecms/neat` | Keep unless owner approves a static/native replacement | Hero background suggests structured estimating/workflow intelligence without competing with hero text. | Preserve current static fallback as the base; optionally add CSS/SVG line/noise texture. No generic decorative blobs. | Hero readability, first-viewport product signal, reduced-motion/mobile static behavior, pause semantics, no overlay blocking CTAs. | `/` hero at 390x844, 768x1024, 1440x900; reduced motion; mobile coarse pointer; CTA clickability. |
| T1.6 `lenis` | Swap only if owner accepts less momentum/polish in exchange for less dependency weight | Landing scroll feels smooth while respecting reduced motion. | Native `scroll-behavior: smooth`, existing `scroll-margin-top`, and explicit reduced-motion override. Current repo defines `data-lenis-prevent` support but no active elements use the attribute; document if the exclusion hook is removed. | Anchor links land below sticky header, wheel/touch/keyboard scroll remain normal, reduced motion disables smooth behavior, no scroll lock/focus trap. | Header nav anchors and CTA anchors on desktop/mobile; keyboard tab/space/page scroll; reduced-motion simulation. |
| T1.7 `rough-notation` | Keep unless owner approves authored CSS/SVG highlights | Hand-drawn emphasis around proposal/approval and product wording without baking text into images. | Author SVG underline/circle overlays or CSS underline with the same words remaining real DOM text. Animation optional and must honor reduced motion. | Text remains selectable/accessible DOM, no negative layout shift, no contrast loss, decorative overlays `aria-hidden`. | Hero headline/kicker and launch feature heading at all viewports; reduced motion; no text overlap. |
| T1.8 `roughjs` | Keep unless owner approves a deliberate authored illustration | Proposal workflow/revision/decision-record metaphor in the “One Workflow” section. | Authored SVG or simplified DOM/SVG composition that preserves cards, arrows, revision loop, and decision bubble. Avoid generic abstract illustration. | Product-specific workflow meaning, responsive framing, text outside decorative SVG where possible, decorative art `aria-hidden`, no blocked clicks. | “One Workflow” section screenshots at all viewports; reduced motion; no text occlusion; section still communicates proposal/revision/approval. |

## Visual QA artifact convention

Store visual evidence under:

```text
.ai/05_logs/2026-06-21-ponytail-visual-evidence/<item>-<viewport>.png
```

Use these minimum viewports unless a later implementation changes the app’s supported viewport contract:

| Viewport | Why |
|---|---|
| 390x844 | Mobile first-viewport and sticky-header anchor behavior. |
| 768x1024 | Tablet composition and scroll/anchor offsets. |
| 1440x900 | Desktop hero, chart/illustration density, and landing hierarchy. |

## Accessibility and interaction checks

Every swap must verify:

1. Reduced motion is respected.
2. No focus trap or scroll lock is introduced.
3. Keyboard, wheel, and touch scroll still work.
4. Decorative SVG/canvas layers are `aria-hidden` or otherwise non-announcing.
5. Text remains DOM text, not baked into an image, unless it is purely decorative and duplicated accessibly.
6. Overlay layers do not block clicks.
7. Contrast and text legibility are unchanged or improved.
8. No layout shift occurs when effects load.

## AI-slop guardrail for replacement visuals

Replacement visuals must preserve Archestimator-specific meaning: estimating, reusable components, proposal handoff, revision loop, approval/decision record, and closed-beta landing hierarchy. Do not replace these with generic decorative gradients, random abstract waves, or ornamental backgrounds unless the owner explicitly approves that visual direction.
