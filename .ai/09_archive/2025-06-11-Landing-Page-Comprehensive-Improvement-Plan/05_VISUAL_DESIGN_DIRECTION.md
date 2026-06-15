# 05 — Visual Design Direction

Status: complete. This is the design-system layer of the plan: tokens, type, color mechanics,
the rough-notation system, imagery, and motion language. Section-by-section application lives in
`06_SECTION_BY_SECTION_IMPROVEMENT_SPEC.md`.

Design thesis (one line):

> **A precise document with a human pencil over it.** Estimates are exact; estimators are human.
> Crisp document surfaces, mono-set numbers, drafting-paper warmth — annotated by a hand-drawn
> terracotta pencil (rough-notation underlines, circles, arrows) that proves a person is in control.

This is the register the AEC competitive scan found unclaimed (03 §4), it preserves the two colors
and the rough-notation aesthetic the owner wants, and it is honest to the product (numbers you can
defend).

---

## 1. Color system — own the two colors

### 1.1 Re-derive the brand values (step away from amigo's exact hex)

Keep the *strategy* (warm terracotta + deep teal). Shift the values enough to be ours, tuned for
contrast on warm paper. Proposed (OKLCH-derived, final values subject to owner eyeball):

```css
/* globals.css @theme — landing brand tokens */
--brand-clay:        #b2492c;  /* terracotta: a step brighter/warmer than amigo #aa412a */
--brand-clay-deep:   #8f3a23;  /* hover/active */
--brand-petrol:      #0b3a47;  /* deep teal: a step bluer/lighter than amigo #083241 */
--brand-petrol-deep: #072b35;  /* footer/anchor variant */
```

Migration note: keep `--brand-orange` as an alias of `--brand-clay` during transition so existing
classes don't break; remove the alias at cleanup.

### 1.2 Warm paper neutral scale (drafting-paper memory, formalized)

```css
--paper-0: #fffdf9;  /* existing page cream — keep */
--paper-1: #f7f1ea;  /* existing tinted band — keep */
--paper-2: #efe7dd;  /* new: deeper band for cards on paper-1 */
--line-1:  #e5e0d8;  /* existing hairline — keep */
--line-2:  #cfc7bb;  /* stronger rule */
--ink-1:   #171514;  /* existing near-black ink — keep */
--ink-2:   #4f4a45;  /* secondary text (≥7:1 on paper-0) */
--ink-3:   #6e6862;  /* captions (≥4.5:1 on paper-0 — verify, adjust up if short) */
```

Rule: body text on paper uses `--ink-1/2` only. No gray-on-tint below 4.5:1 anywhere.

### 1.3 Linework palette (the amigo move that upgrades our rough.js system)

Desaturated parallels reserved for sketches, diagrams, and annotations *at rest*:

```css
--linework-clay:   #c1836d;  /* rough.js strokes, sketch circles */
--linework-petrol: #5d7a82;  /* rough.js strokes */
--linework-sand:   #cda35f;  /* existing #d8a84f, calmed */
--linework-olive:  #74795a;  /* existing #6f7a3d, calmed */
```

Full-saturation `--brand-clay` in diagrams is reserved for the **one emphasized element**
(the circled total, the active step). This gives the hand-drawn layer hierarchy instead of
uniform loudness.

### 1.4 Deployment rules (restores the accents' signal value)

| Color | Allowed on | Banned on |
| --- | --- | --- |
| `--brand-clay` | Primary CTAs, key-number callouts, the emphasized annotation, eyebrow accents, focus rings on dark | Section backgrounds wider than one band (max 1 drench moment per page), body text, icon washes |
| `--brand-petrol` | 1–2 mid-page anchor sections, footer, header-over-dark state, diagram emphasis on paper | Buttons (except on petrol surfaces as outline), text on clay |
| Linework set | rough.js strokes, sketch annotations, dividers-with-character | CTAs (never), text |

### 1.5 Section background rhythm (target)

`paper-0` hero → `paper grid` diagram band → `paper-0/1` problem + capabilities →
**petrol anchor** (product showcase or proof) → `paper-1` beta/pricing →
**one clay moment** (final CTA band, ~60vh max) → `petrol-deep` footer.
Approximate ratio: 70% warm paper / 20% petrol / 10% clay. (Today: ~75% paper / 20% clay / footer-only petrol.)

## 2. Typography

### 2.1 Adopt the DESIGN.md landing scale (it already exists — use it)

Implement the documented Inter landing-only scale as utilities/tokens and stop overriding to SF Pro
on `[data-landing-page-root]`:

| Token | Spec (from DESIGN.md) | Use |
| --- | --- | --- |
| display | Inter 4rem / 400 / lh 1.04 / ls −0.055em | Hero H1 (clamp to 2.5rem–4rem fluid) |
| headline-lg | 2.8125rem / 400 / 1.08 / −0.045em | Section H2s |
| h3 | 1.4375rem / 450 / 1.22 / −0.025em | Card/feature titles |
| body-lg | 1.125rem / 350 / 1.45 | Hero support, section leads |
| body | 1rem / 350 / 1.45 | Default copy (current 13–15px copy is app-register, too small for landing) |

Inter is already loaded via `next/font` (`src/app/layout.tsx:7`) — applying it costs nothing new;
keeping SF Pro overrides while downloading Inter is the worst of both.

### 2.2 Numbers get a mono register (the "precision" move)

Every number on the landing (demo line items, totals, the pricing "0", beta facts) renders in the
mono stack (`--font-roboto-mono` already exists) with `font-variant-numeric: tabular-nums`, sized
up as set-pieces where featured. Number + unit lockup: value in mono/ink, unit/currency in
`--ink-3` small caps. **Numbers are never hand-drawn** (03 §5 moderate-transfer rule).

### 2.3 Case & hierarchy rules

- Sentence case for all headlines (kill Title Case fragments like "Accelerate Approvals").
- One eyebrow style page-wide: 12px/600/0.08em, `--ink-3` with clay accent allowed on ≤2 sections;
  **not** above every section (impeccable ban) — sections with self-evident headlines skip it.
- `text-wrap: balance` on H1–H3; body line length ≤ 70ch.

## 3. The rough-notation system (signature, systematized)

Today the hand-drawn voice exists in two spots (hero underlines, one rough.js band) and one of them
ships with broken labels. Make it a defined system:

### 3.1 Vocabulary (only these five marks)

| Mark | Library | Use | Color |
| --- | --- | --- | --- |
| Underline | rough-notation `underline` | Brand-word emphasis in display copy (1 per viewport max) | `--brand-clay` |
| Circle | rough-notation `circle` | The ONE emphasized number/phrase per section (e.g., circled total) | `--brand-clay` |
| Box | rough.js rectangle | Diagram nodes | linework set |
| Arrow | rough.js path | Flow connections, margin annotations | linework set |
| Margin note | styled text + arrow | Short human asides ("clients see this", "reused from last project") | `--ink-3` + linework arrow |

Rules: marks annotate **precise content** (numbers, UI, documents) — never decorate empty space;
≤2 marks visible per viewport; reduced-motion renders marks pre-drawn (already supported).

### 3.2 Fix and upgrade the rough.js flow band

- Fix circle-label word breaks (whole-word wrapping or shorter labels — 04 §3).
- Recolor strokes to the linework palette; emphasized node uses `--brand-clay`.
- Upgrade to a **continuous slow draw**: stroke-dashoffset loop, 25–35s, drawing the flow
  Workflow → Library → Estimate → Proposal → Decision and re-starting (the amigo
  `flowPathAnimation` lesson, in our own hand-drawn voice). Static when `prefers-reduced-motion`.
- Add visually-hidden ordered-list equivalent (02 §F3).

### 3.3 Where hand-drawn appears across the page (extends the voice past px-1485)

Hero (underline + one margin note on the product artifact) → diagram band (the flow) → problem
section (circle on "feels normal") → product showcase (one annotation per tab panel, e.g. arrow
"drag from library") → pricing (circle around the mono "0") → final CTA (underline on the brand
word). Footer: none (let the document end cleanly).

## 4. Surfaces & shape language

Product metaphor = the spec sheet / document (03 §5):

- Radius: **3px** on landing cards/CTAs (match the app's architectural register; replace current
  6px+ rounding).
- Elevation: hairline borders (`--line-1/2`) + paper tint steps. No drop-shadow stacks, no
  glassmorphism, no gradient text.
- The graph-paper texture (`landing-quote-grid-paper`) is a brand asset — keep it for diagram/
  document bands only (not as universal wallpaper).
- Framed product proof: screenshots/mocks sit on `--paper-2` mats with a hairline rule and a small
  document-tab label (e.g., "Estimate — Rev B"), like a drawing sheet title block. This is our
  framing device (instead of amigo's glass blur).

## 5. Imagery direction

| Slot | Direction |
| --- | --- |
| Hero | **Product proof, not stock**: a composed estimate-workspace artifact (tree + line items + mono totals + one rough annotation). Photography demoted to a low-opacity warm-toned backdrop strip or removed. Keep ≤1 photographic asset on the page; budget ≤500KB hero media total (vs ~2.8MB now) |
| Capability sections | Honest UI mockups (existing `ProductPreviewVariants` upgraded) — annotated with the sketch vocabulary |
| Walkthrough | One real screen-capture video when available; until then, the annotated stills (no play-button placeholders — 02 §A2) |
| People | None until real (no stock contractors); when real testimonials exist, portraits on `--paper-2`/petrol fields (Intercom lesson, deferred) |
| Construction photos (current 9 slides) | Retire from hero; may reappear as small treated thumbnails in `#method` specialty context later |

## 6. Motion language

| Layer | Spec |
| --- | --- |
| Page entrance | Sections **visible by default**; scroll motion limited to opacity 0.96→1 + translateY 8px→0, 400ms ease-out-quart — enhancement, never gating (fixes 02 §D1) |
| Signature motion | The continuous rough.js flow draw (§3.2) — the page's one "living" element |
| Hero | rough-notation underline draw (keep, 520ms delay) + the estimate artifact assembling once on load (rows fade in sequentially over ~1.6s, total sums, circle draws around it) — product demonstration, not decoration |
| Micro-interactions | CTA hover: background deepen 120ms + arrow nudge 2px; link hover: underline draw. Fast/professional (amigo timing culture), no bounce |
| Retired | Ken Burns ×9, 18s testimonial crossfade, 68s marquee, 12s signal scan (replaced by static or once-on-load equivalents) |
| Reduced motion | Everything above has a static or instant variant (preserve current discipline) |

## 7. Compliance with the project's own bans

PRODUCT.md anti-references honored: no construction clichés (no hardhats/blueprints-as-wallpaper),
no oversized gradient metrics, orange stays out of app/workshop UI (landing-only), no decorative
depth, no over-rounding. Impeccable-skill bans honored: no side-stripe borders, no gradient text,
no glassmorphism, no hero-metric template, no identical card grids (each capability gets a distinct
proof form), no eyebrow-on-every-section, no reveal-gated content.
