> **PLANNING ONLY · 2026-06-21 · not code.** A token + type plan for the landing-page redesign. No implementation; every value is grounded in `ARCHESTIMATOR_MASTER.md` §12.9 (visual identity canon) and the existing `src/app/globals.css`.

**Purpose (one line):** Define the additive token layer and 2+1 type pairing that make the landing page read as "a specimen of the document quality" (§12.9) on warm proposal-paper, while leaving the app's existing token system untouched.

---

## 1. The argument the visuals make

§12.9, final sentence (PROPOSED but adopted by this plan): *"The aesthetic is the brand argument: documents you would trust, not dashboards that perform."* The landing page's job is to prove that sentence by being one. Three moves carry it:

1. **Paper, not chrome.** The whole marketing system sits on `--paper #FFFDF8` — the same proposal-paper the in-app cost proposals export on (§12.9 "Proposals: proposal paper #FFFDF8 + Source Serif body"). The reader is looking at the same surface their client will see.
2. **Serif as signal.** Source Serif 4 carries the headlines **and** the body prose, shared with the proposal export (§12.9). The serif is the one visual fact that ties the marketing specimen to the product's deliverable; without it the "document" argument collapses into just another sans-serif SaaS page.
3. **One redline, sparingly.** The existing brand Signal `#F24405` is reused as a *redline annotation mark* — the accent an architect draws to flag a revision — not as a fill color, not as a button hue, never as a gradient. Accent discipline is the whole brand: calm conviction, never hype (§10.1, §10.2 #3).

Everything below is the exact additive token plan that delivers those three moves without clobbering the workshop's neutral, compact, document-like system (§12.9: "Landing may be editorial; the workshop stays neutral, compact, document-like").

---

## 2. The 2+1 type pairing (and why the serif is load-bearing)

| Role | Family | Loaded via | Where it lives |
|---|---|---|---|
| **Display + body prose** | Source Serif 4 | `next/font/google` (`Source_Serif_4`, `--font-source-serif`) — **NEW, see §6.1** | Landing headlines, section prose, claims-ledger body, the commercial-graph plate labels, the document-styled footer |
| **UI chrome / labels / buttons** | SF Pro (400/500) | existing `--font-sf-pro` system stack — **no change** | CTAs, nav, captions, status tags, hairline-rule labels, the "Start free / Book a walkthrough" buttons |
| **Numbers & data** | Roboto Mono | existing `next/font/google` `Roboto_Mono` (`--font-roboto-mono`) — **no change** | Price framing (§9.3 hypothesis labels), the claims-ledger status tags, any tabular data, the cement-anchor concept line |

**Rationale, grounded:**
- §12.9 pins the proposal export to "Source Serif body." The landing headline + prose on the **same family** is the literal specimen move: the page *is* the document it argues for. This is the single most important type decision and it is non-negotiable for the direction.
- §12.9 pins product UI to "SF Pro (400/500)." The landing's interactive chrome (buttons, nav, tags) reuses the **existing** `--font-sf-pro` stack so the marketing system and the workshop share their UI voice — continuity without forcing the serif into places it doesn't help (a button label in serif reads as costume).
- Roboto Mono is already in the repo for numbers; it carries the few numeric moments (pricing-philosophy framing, ledger status counts) so digits never render in a proportional serif and never look like an afterthought.

> ⚠️ **GATED ON** — Source Serif 4 is **not** currently loaded anywhere in the app (verified: `src/app/layout.tsx` loads only `Doto` and `Roboto_Mono` via `next/font/google`; `--font-sf-pro` is a system stack). §6.1 below adds it. This is a real implementation prerequisite, not a stylistic preference. The continuity claim ("same serif as the proposal export") is **aspirational until the proposal export itself is confirmed to render Source Serif 4** — see open decision O-3.

---

## 3. Color tokens — the ADDITIVE plan

### 3.1 What already exists and is REUSED (do not redefine)

These are already in `:root` of `globals.css` and **must be reused, not redeclared** (append-only policy, §6):

| Existing token | Value | Landing use |
|---|---|---|
| `--proposal-paper` | `#fffdf8` | **THE** page background. Already named exactly right for this design direction; the landing just consumes it as `--paper` (alias below). |
| `--brand-orange` | `#F24405` (Signal) | The redline accent (§4). Owner directive 2026-06-19 already made Signal the brand color (globals.css:28-37). |
| `--brand-orange-dark` | `#C63804` | **Required** for any redline accent that falls below the AA threshold at small sizes — `#F24405` is ~3.75:1 on white (globals.css:30-31), below WCAG AA 4.5:1 for normal text. Use the dark variant for any accent used as text or on icons < 24px. |
| `--radius-xs` | `3px` | All landing cards, plates, buttons, hairline-framed blocks. Continuity with the app (§12.9 "3 px radius"). |
| `--secondary` | `#5d5d5d` | Secondary ink — already AA-safe on white (the AA-safe choice the brief mandates over `#7F7F7F`). Reuse directly. |
| `--glass-blur` + `data-glass="ready"` | deferred-glass pattern | Reused as-is if any landing surface wants glass (see §7 — restrained, default is no glass). |

### 3.2 NEW tokens to ADD to `:root` (append-only; do not touch existing lines)

Add these as a single clearly-commented block at the **end of `:root`** (after line 152, before the closing `}`). Every name is prefixed `--landing-*` so it cannot collide with the workshop system and so a future migration can grep-and-remove. Values are owner-mandated by the brief.

```css
/* ─── Landing-page redesign (2026-06-21, planning-only spec) ─────────────
   Additive ONLY. These alias / extend existing tokens; they never redefine.
   Rationale: MASTER §12.9 (visual canon) + the locked landing brief. The
   landing is editorial on proposal-paper; the workshop stays neutral. */

/* Paper + ink — the document surface. --paper aliases the existing
   --proposal-paper so the landing and the proposal export share one source
   of truth (§12.9). --landing-ink is the brief's #292929, distinct from the
   app's softer --ink (#3D3D3D); editorial prose wants the higher contrast. */
--landing-paper: var(--proposal-paper);          /* #FFFDF8, alias */
--landing-ink: #292929;                          /* brief mandate; AA-safe on paper */
--landing-ink-secondary: var(--secondary);       /* #5D5D5D — AA-safe; never #7F7F7F load-bearing */

/* Warm hairlines — tinted, not gray. A gray rule on warm paper reads as
   a mistake; a warm-tinted rule reads as printed. Near the brief's #ECE7DC
   anchor, tuned against #FFFDF8 for a ~1.08:1 visible-but-quiet separation. */
--landing-hairline: #ECE7DC;                     /* primary rule, dividers, card edges */
--landing-hairline-strong: #DDD5C6;              /* emphasis rule, section breaks, plate frame */

/* The redline accent (§4). Aliases Signal so the brand stays single-source;
   the alias exists so the landing can swap accent stance (annotation, not fill)
   in one place if the brand color ever changes. */
--landing-redline: var(--brand-orange);          /* #F24405 — annotation mark only */
--landing-redline-ink: var(--brand-orange-dark); /* #C63804 — AA-safe for text/icons */
--landing-redline-soft: color-mix(in srgb, var(--brand-orange) 10%, var(--landing-paper)); /* wash behind a tagged node, never a fill */

/* Type families — see §6. --landing-font-serif is NEW (Source Serif 4 must be
   loaded, §6.1); the other two alias existing stacks for a single landing
   vocabulary. */
--landing-font-serif: var(--font-source-serif), Georgia, "Times New Roman", serif; /* NEW var, §6.1 */
--landing-font-ui: var(--font-sf-pro);           /* existing system stack */
--landing-font-mono: var(--font-roboto-mono);    /* existing next/font var */
```

### 3.3 NEW `@theme inline` mappings (so Tailwind utilities resolve)

Append these **inside the existing `@theme inline {}` block** (after line 205, before its closing `}`). This is what makes `bg-paper`, `text-landing-ink`, `border-hairline-warm`, etc. work as native utilities. Do **not** edit any existing `@theme` line.

```css
/* ─── Landing tokens (2026-06-21) — additive @theme mappings ─────────── */
--color-paper: var(--landing-paper);
--color-landing-ink: var(--landing-ink);
--color-landing-ink-secondary: var(--landing-ink-secondary);
--color-hairline-warm: var(--landing-hairline);
--color-hairline-warm-strong: var(--landing-hairline-strong);
--color-redline: var(--landing-redline);
--color-redline-ink: var(--landing-redline-ink);
--color-redline-soft: var(--landing-redline-soft);
--font-serif: var(--landing-font-serif);
```

> **⚠️ Tailwind gotcha (memory-verified, 2026-06-20):** in this Tailwind v4 setup, `bg-[var(--x)]` silently emits no color; you **must** write `bg-[color:var(--x)]` for arbitrary-value backgrounds. The `@theme inline` mappings above sidestep this for the named utilities (`bg-paper`, `text-redline-ink`, `border-hairline-warm`), but any *arbitrary-value* usage in a landing component (e.g. a one-off tint) must use the `color:` hint. Doc 07 (engineering) and doc 05 (section markup) must enforce this in their code-review checklist.

---

## 4. The redline-accent discipline

The accent is the whole brand compressed into one rule. State it once, enforce it everywhere:

**The redline is an annotation mark, not a color scheme.** Architects draw redlines to flag a revision; that is the only metaphor the accent carries. Concretely:

| Allowed (annotation stance) | Forbidden (fill / presence stance) |
|---|---|
| A 1.5–2px `--landing-redline` underline or side-rule under a tagged word ("Live", "Building", "Planned" status tags in the claims ledger). | A `--landing-redline` filled button, card, or hero panel. |
| A small `--landing-redline` dot or tick next to a commercial-graph node to mark its claim status. | A `--landing-redline` gradient, glow, or background wash larger than a single tag. |
| `--landing-redline-ink` (#C63804) for any accent **used as text or an icon < 24px** (AA-safe). | `--landing-redline` (#F24405) as body text or a small icon — fails AA at ~3.75:1 (globals.css:30). |
| `--landing-redline-soft` (10% wash) behind a single tagged ledger row or graph node, sparingly. | Using the accent on more than one element per visible viewport (accent discipline = scarcity). |
| The focus ring (instant `:focus-visible`, doc 07) may borrow `--landing-redline-ink` so keyboard nav reads as "the architect marking the active line." | Any second accent color. There is one accent. Period. |

**Voice tie-in (§10.2 #3 "calm conviction, never hype"):** the accent discipline *is* the voice discipline made visual. A page that paints Signal everywhere reads as hype; a page that draws it once, like a redline, reads as earned confidence. If a section "needs more color to pop," the section's copy is weak — fix the copy, do not add accent.

> ⚠️ **GATED ON** — the "redline" metaphor is the brief's framing; confirm with the owner (doc 00 decisions) that annotation-as-accent is the sanctioned stance before section-level markup (doc 05) finalizes node markers. The mechanic is settled; only the metaphor's public naming ("we call it a redline") wants one owner sign-off.

---

## 5. Contrast notes (the #7F7F7F rail)

The brief and memory both flag this; state it as a hard rule for the landing:

- **`#7F7F7F` is design-system-pinned as `--tertiary` (globals.css:12) and MUST NOT carry any load-bearing text on the landing.** It fails WCAG AA 4.5:1 for normal text. It is sanctioned by DESIGN.md as a tertiary, but DESIGN.md is an *alpha guide not law* (per CLAUDE.md) and the brief overrides it here: load-bearing secondary/meta text uses `--landing-ink-secondary` (`#5D5D5D`, AA-safe), never `--tertiary`.
- **`#7F7F7F` may appear only** in non-text decorative roles (a faint gridline behind the commercial-graph plate, a placeholder rule) where contrast is irrelevant.
- **`#292929` (`--landing-ink`)** is the body/headline ink: ~14:1 on `#FFFDF8` paper — AAA. Use it for all headlines and body prose.
- **`#5D5D5D` (`--landing-ink-secondary`)** is ~7.5:1 on paper — AAA. Use it for captions, meta, the cement-anchor concept label, "Pre-launch MVP preview" disclaimers (§15 maturity language), and the claims-ledger Live/Building/Planned sub-labels.
- **`#C63804` (`--landing-redline-ink`)** is ~5.3:1 on paper (globals.css:35) — AA-pass. The only acceptable accent hue for text/icons.
- **Paper-on-paper separation** comes from warm hairlines (`#ECE7DC`, ~1.08:1) and the hairline-strong variant for emphasis — never from lowering ink contrast. A reader on the landing should never have to squint to read a claim; the honesty posture (§15) depends on every word being legible.

---

## 6. Loading the serif (the one real prerequisite)

### 6.1 Add Source Serif 4 via `next/font/google`

This is the only place the plan touches a non-CSS file. In `src/app/layout.tsx`, add alongside the existing `Roboto_Mono` / `Doto` imports:

```ts
import { Doto, Roboto_Mono, Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],   // 400 body prose, 500 sub-heads, 600 hero
  style: ["normal"],               // italic reserved for genuine editorial pull-quotes only
  display: "swap",
});
```

…and append `sourceSerif.variable` to the `<body>` className. This exposes `--font-source-serif`, which `--landing-font-serif` (§3.2) consumes. No FOUT risk beyond the existing `display: "swap"` posture; the serif is text-critical so swap is the right call (LCP is the text headline, doc 07).

**Why three weights, not the variable axis:** the landing is static-generated editorial (doc 07 RSC-first); a bounded weight set keeps the font payload smaller and the LCP text-paint faster than shipping a full variable axis. If a future editorial moment needs 700, add it then — do not preload weights the page does not use.

### 6.2 Font-loading performance note (cross-link to doc 07)

LCP = the text headline (§11.1 hero, doc 07). The serif must not block first paint: `display: "swap"` + `preload` only the 600 weight (the hero word "intelligence" in "Your cost intelligence layer"). Roboto Mono and SF Pro are already non-blocking (system stack / existing next/font). Doc 07 owns the exact `next/font` preload config and the Core Web Vitals targets; this doc only asserts the serif is the LCP-critical face.

---

## 7. Motion stance (restrained; reuse, do not invent)

The motion policy is the same as the visual one: calm conviction, not performance (§10.2 #3; §12.9 "not dashboards that perform").

| Motion | Stance | Mechanism |
|---|---|---|
| Scroll-reveal fades for sections | **Allowed, restrained.** A 200–300ms opacity+8px translateY fade on enter, once. No parallax, no skew, no scale-pulse. | Reuse the **existing** `MotionReveal.tsx` pattern in `src/components/landing/` (already in repo) or its equivalent; do not introduce a new animation library. |
| The commercial-graph plate (doc 04) node hover | **Allowed.** A hairline-rule draw-on + a `--landing-redline-soft` wash behind the hovered node + the status tag fading in. This is the one interactive flourish and it teaches the claims ledger (§7 of the page). | CSS transitions + the existing deferred-glass arming pattern only if a glass surface is used (default: no glass on the plate). |
| Deferred liquid-glass blur | **Reuse the existing pattern verbatim** (`data-glass="ready"` + `@property --glass-blur-amount`, globals.css:287-309). Do **not** invent a new glass system. The landing defaults to **no glass** (it's a paper specimen, not a frost specimen); glass is reserved for, at most, a sticky nav on scroll, and only if doc 07's perf budget allows. | `<LiquidGlassReady />` already mounts in `layout.tsx`. |
| Construction-photo slideshow / crossfades | **BANNED.** Removed in the redesign (§12.9 "not dashboards that perform"; Hallmark removal rail, doc 02). No hero image carousel. | n/a — deletion, not motion. |
| `prefers-reduced-motion: reduce` | **Respected everywhere, no exceptions.** The existing `@media (prefers-reduced-motion: reduce)` blocks in `globals.css` (lines 309, 1042, 1128, 1327) already neutralize transitions and the glass blur. New landing motion must add its own reduced-motion guard or rely on the global ones; doc 07's review checklist enforces this. | `@media (prefers-reduced-motion: reduce) { /* kill the fade, show immediately */ }` per landing section component. |

**The rule:** if a motion does not teach something (the graph hover teaches the ledger; the scroll-fade teaches "here is the next idea"), it is decoration and it is cut. Voice §10.2 #3 again: leverage, not loudness — in time as in copy.

---

## 8. How the landing shares the app system (continuity without sameness)

§12.9: *"Landing may be editorial; the workshop stays neutral, compact, document-like."* The landing is editorially **distinct** but systemically **continuous**. The shared-vs-distinct split:

| Aspect | Shared with the workshop (continuity) | Distinct on the landing (editorial) |
|---|---|---|
| Paper | `--proposal-paper` token (same source of truth as the proposal export) | The landing **bases the whole page** on it; the workshop only uses it inside the estimate sheet / proposal preview. |
| Serif | (O-3) the proposal export's serif, when confirmed | The landing puts it on **headlines + prose**; the workshop keeps SF Pro for dense UI. |
| SF Pro UI | Buttons, nav, tags, captions — identical stack | The landing's CTAs ("Start free", "Book a walkthrough") use it so a click into the app feels like the same product. |
| Roboto Mono | Numbers, status tags | The landing uses it for price framing + ledger counts. |
| Radius 3px | Identical (`--radius-xs`) | The landing leans into plates/cards that read as printed panels. |
| Redline accent | Same `--brand-orange` family | **Different stance:** the app uses Signal as fills/active states (globals.css:33); the landing uses it **only** as an annotation mark (§4). |
| Ink | Workshop `--ink #3D3D3D` (softer, for dense data tables) | Landing `--landing-ink #292929` (higher contrast, for editorial prose). Both AA/AAA; the split is editorial-density, not correctness. |

**Net:** a reader who clicks "Start free" moves from a serif-on-paper editorial specimen into a compact, neutral, document-like workspace — and recognizes the paper, the radius, the UI font, and the one accent color. The serif recedes (it belongs to the specimen and the exported proposal, not the working UI), the chrome stays. That continuity is the brand argument made navigable.

---

## 9. Cross-links to sibling docs

- **00-OVERVIEW-AND-DECISIONS.md** — owns the locked decisions this doc obeys (paper, serif, redline-as-annotation, CTAs). The owner sign-offs this doc gates on (§4 metaphor, O-3 serif continuity) are recorded there.
- **01-PEG-STUDY-AND-POSITIONING.md** — the Intercom/Amigo transferable craft (bold category-hook type, named architecture) that justifies the editorial-serif + named-graph-plate move; the NOT-transferable list (logos, stats, badges) that this doc respects by omission.
- **02-SECTION-TAXONOMY-AND-REMOVALS.md** — the canonical DOM section order this token plan styles; the Hallmark removal rail (slideshow, hype hero, fabricated testimonials, logo-only footer) that §7's motion bans and §4's accent discipline reinforce.
- **04-COMMERCIAL-GRAPH-PLATE.md** — owns the full SVG plate spec; consumes `--landing-hairline`, `--landing-hairline-strong`, `--landing-redline-soft`, and the `--landing-redline-ink` status markers defined in §3.
- **05-SECTION-MARKUP-AND-COPY.md** — applies these tokens to each section's markup + the §11 copy (verbatim, §15-disciplined); enforces the `bg-[color:var(--x)]` gotcha (§3.3) in its code-review checklist.
- **06-RESPONSIVE-AND-A11Y.md** — owns the 320/375/414/768 breakpoints, the architecture-plate collapse, the `overflow-x: clip` rule, and the formal WCAG audit that §5's contrast rules feed into.
- **07-ENGINEERING-AND-RSC.md** — owns the `next/font` preload config (§6.2), the RSC-first hydration boundary, the `prefers-reduced-motion` enforcement checklist (§7), and the LCP/perf budget the serif swap must fit.
- **08-ROLLOUT-AND-ANALYTICS.md** — owns the `/newdesign`-style preview route, the claims sign-off gate, and the §14.4 analytics events; this doc's tokens ship behind that preview flag.
- **LOOP_LEDGER.md** — the planning loop that tracks this doc's open decisions (O-1…O-3) to resolution.

---

## 10. ⚠️ Gated on / Open decisions

- **O-1 — Redline metaphor, public naming.** The accent-as-annotation mechanic is settled (§4); whether the landing *names* it "redline" in any public-facing caption (vs. just drawing it) wants one owner sign-off. ⚠️ GATED ON doc 00 owner confirmation; mechanic proceeds regardless.
- **O-2 — Glass on the landing (default none).** §7 defaults to no glass (paper specimen). If the sticky nav or one plate wants glass, it MUST reuse the existing `data-glass="ready"` + `--glass-blur-amount` pattern and fit doc 07's perf budget. ⚠️ GATED ON doc 07 perf budget + owner preference.
- **O-3 — Serif continuity with the proposal export.** §12.9 says proposals use "Source Serif body," but the in-app proposal export today is `.xlsx` (`src/app/api/.../proposal.xlsx/route.ts`) with no confirmed Source Serif 4 rendering. The "same serif as your exported proposal" claim is **aspirational until confirmed.** ⚠️ GATED ON verifying which surface (proposal **preview** dialog vs. the .xlsx) actually renders Source Serif 4; if neither does yet, the landing still ships the serif (it's the right editorial choice independently), but the *continuity* copy in doc 05 must be softened to "the document voice your proposals are written in," not "the exact font your exported file uses." ⚠️ NEEDS INPUT from owner on proposal-export typography roadmap.
- **O-4 — Source Serif 4 weight set.** §6.1 proposes 400/500/600. If the commercial-graph plate (doc 04) or a pull-quote needs 700 or italic, add it then; do not preload unused weights. ⚠️ GATED ON doc 04 plate spec + doc 05 copy finalization.
- **O-5 — `#292929` vs the app's `#3D3D3D` ink.** This plan introduces `--landing-ink #292929` as a landing-scoped override (the brief mandates it) rather than redefining the global `--ink`. If the owner later wants one ink across the whole product, that is a separate, higher-blast-radius change (touches every workshop surface) and is **out of scope** for this plan. ⚠️ GATED ON a future cross-cutting ink decision, not this plan.
- **O-6 — Reduced-motion for new scroll-reveals.** §7 reuses `MotionReveal.tsx`; confirm it already honors `prefers-reduced-motion` (or add the guard) before doc 07 ships. ⚠️ GATED ON doc 07 review checklist verifying the existing component's reduced-motion behavior.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.** Every public-word implication (the cement-anchor concept label, the "Pre-launch MVP preview" disclaimer, the claims-ledger status tags) is grounded in §9.3, §15, and §11; the pricing framing stays explicitly hypothesis-labeled per §9.3 (do not publish a locked price). Voice throughout = Controlled Confidence (§10).
