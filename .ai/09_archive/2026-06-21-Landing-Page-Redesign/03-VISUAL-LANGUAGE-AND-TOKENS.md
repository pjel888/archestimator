# 03 — Visual Language & Tokens (The Glass Brand)

> **PLANNING ONLY · 2026-06-21 (revised 2026-06-22 per ratified keystone decisions D-1…D-5) · not code.**
> **Direction:** THE GLASS BRAND (keystone decision D-1). The landing embodies the
> SAME brand Philip loves in the Workshop Dashboard + Estimate Sheet: liquid-glass
> surfaces floating over a warm grey canvas, signal-orange presence, Doto display +
> Roboto Mono numerals + SF Pro UI. The prior "warm paper #FFFDF8 + Source Serif 4
> document" direction is **demoted to a documented ALTERNATIVE** (`01-DESIGN-DIRECTION.md`
> §3.4 "Direction D — The Document"); it is NOT the default and this doc no longer binds to it.

**Purpose (one line):** the additive token layer + type + spacing + z-index + radius + glass
plan for the Glass Brand landing — the single source an implementer copies tokens from, where
every `--landing-*` token **aliases a real token in `src/app/globals.css`** (verified by grep,
anchors cited below) rather than redefining one.

---

## 1. The argument the visuals make

D-1 says the landing must read as **a specimen of the Glass Brand** the Workshop already ships.
Three moves carry it:

1. **Glass over a warm grey canvas, not paper.** The whole marketing system floats on
   `--canvas`/`--warm-canvas` `#f5f5f5` with the subtle `--grad-canvas-wash` brand-orange bloom,
   and the content surfaces are the same `.dashboard-glass` / `.dashboard-glass-warm` frost the
   dashboard uses. The reader is looking at the same material their workspace is made of.
2. **Doto as the editorial signal.** `--font-display` (Doto, already loaded in
   `src/app/layout.tsx:12-17`) carries the headlines; `--font-numeric` (Roboto Mono) carries
   every number; `--font-sf-pro` carries the UI chrome. **Source Serif 4 is DEFERRED (D-1)** —
   see §6.4 — so the "same serif as your proposal" continuity claim is **NOT made** on the landing.
3. **Signal orange as presence, sparingly (D-3).** `--brand-orange` `#F24405` is the presence
   color — logo slab, focus rings, the accent rail, fills on a single primary CTA, and a tick on
   a claims-tagged graph node. `--brand-orange-dark` `#C63804` is the AA variant for any orange
   used as small text or an icon `< 24px`. **Clay `#AA412A` is NOT a token, NOT used** (DESIGN.md
   prose only); every prior clay reference is reconciled to `#C63804`. Hard cross-doc contract D-3.

Everything below is the exact additive token plan that delivers those three moves **without
clobbering the Workshop's existing token system** (append-only, §3.1).

### 1.1 Liquid-glass hint contract (brand continuity, not decoration)

The landing must **hint at the app's liquid-glass material** in the places where a user expects
chrome, proof, or a handoff into the product:

1. **Frosted masthead** — sticky navigation on the warm canvas, using `.dashboard-glass` /
   `.dashboard-glass-warm`, with the signal-orange logo slab as the brand anchor.
2. **Hero material panel** — a first-viewport glass composition that suggests the app's actual
   surfaces: estimate tree rail, component-library dock, activity/proposal handoff lines, and
   claims tags. It is an abstract material specimen, not a fake screenshot.
3. **Commercial-graph plate** — the named architecture sits in glass because it is the product
   model, not a marketing illustration.
4. **Claims ledger + final CTA** — use glass to frame trust and action, while body copy remains on
   high-contrast ink and stable surfaces.
5. **Auth left panel** — the strongest continuity moment: the visitor moves from landing CTA into
   the same material language before entering the app.

This adapts the Liquid Glass principle as a **unifying material for controls/navigation and layered
context** (Apple HIG Materials + Liquid Glass technology overview), but the implementation is our
web product language: content-first, dark ink on frosted-white surfaces, and no platform mimicry.
The Hallmark/impeccable guardrail is explicit: **glass is a skin and transition cue, never a
generic card treatment.** If a section does not need chrome, proof framing, or product handoff, it
should stay open on the warm canvas or use an opaque paper surface.

External references used for this material principle — reference, not clone target:

- Apple HIG Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple Liquid Glass overview: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- WWDC25 "Meet Liquid Glass": https://developer.apple.com/videos/play/wwdc2025/219/

---

## 2. The 3-family type stack (Doto display · Roboto Mono numerals · SF Pro UI)

| Role | Family | Loaded via | Where it lives |
|---|---|---|---|
| **Display / editorial headlines** | **Doto** | existing `next/font/google` `Doto` (`--font-doto`, `src/app/layout.tsx:12-17`, `weight: "variable"`) — **NO CHANGE** | Hero H1, section H2, the commercial-graph plate title, big numerals in the pricing-philosophy frame. Uppercase, wide tracking (the dashboard already uses it this way). |
| **Numbers & tabular data** | **Roboto Mono** | existing `next/font/google` `Roboto_Mono` (`--font-roboto-mono`, `src/app/layout.tsx:9`) — **NO CHANGE** | All numerals: the cement-anchor concept figure, claims-ledger status counts, any tabular data, the mono "Live/Building/Planned" status tags. Use `font-weight: 200` for the ultra-light numeric register the dashboard uses. |
| **UI chrome / labels / buttons** | **SF Pro (400/500)** | existing `--font-sf-pro` system stack (`globals.css:99`) — **NO CHANGE** | CTAs ("Start free", "Book a walkthrough"), nav, captions, status pills, hairline-rule labels. |

**Rationale, grounded:**
- **Doto + Roboto Mono are already loaded** in `layout.tsx` (verified `import { Doto, Roboto_Mono }`,
  `src/app/layout.tsx:2`). The Glass Brand landing reuses the Workshop's exact display + numeric
  stack — **zero new font requests**, which is also the fastest possible LCP posture (§6.3).
- The Workshop Dashboard ships `--font-display: var(--font-doto), …` and `--font-numeric:
  var(--font-roboto-mono), …` inside `@theme inline` (`globals.css:203-204`). The landing aliases
  these (§3.2) so headline Doto on the landing and headline Doto in the dashboard are one token.
- SF Pro for chrome is continuity: a reader who clicks "Start free" moves from a Glass landing
  into a Glass app and the button labels do not change family.

> ⚠️ **GATED on L-DES-4 — SF Pro licensing on non-Apple platforms.** SF Pro is Apple-proprietary;
Apple's font license permits SF Pro for "user interfaces of software running on Apple software or
hardware," and a PH + SEA B2B audience on Windows + Android browsers is technically outside that
grant. This is the **same gate the whole product already has** — the app ships `--font-sf-pro`
today (`globals.css:99`) and falls back to Segoe UI / system sans on Windows and Roboto on
Android, which are AA-safe and read cleanly. **The landing inherits the app's posture; this is not
a new decision for the landing.** Two forward options if the owner wants to close it product-wide:
**(a)** accept the technical risk (common in practice; visually falls back cleanly), or **(b)**
ship **Inter** as the SF Pro drop-in (metric-compatible, free) via `next/font/google`, keeping
`--font-sf-pro` as the first fallback. Recommendation: **(b)** if pursued, but it is a
product-wide change, NOT a landing-scoped one. Tracked in `LOOP_LEDGER.md` L-DES-4.

> ⚠️ **OKLCH stance (closed, L-DES-5).** The existing `globals.css` token block is authored in
**hex** (verified: `--brand-orange: #F24405;` `globals.css:37`; `--ink: #3D3D3D;` `globals.css:10`).
Every `--landing-*` token below **aliases an existing hex token**, so the landing inherits the
existing authoring style by construction — no encoding divergence is introduced. For any genuinely
**new** `--landing-*` value that does not alias an existing token (the warm hairlines in §3.2),
author it in **OKLCH** per the impeccable-skill mandate, with the hex equivalent in a comment for
grep parity with the rest of the file. The contrast math in `12-ACCESSIBILITY-AUDIT.md` §2 is
encoding-agnostic. This resolves L-DES-5; it does not need a runtime owner sign-off.

---

## 3. Color tokens — the ADDITIVE plan

### 3.1 What already exists and is REUSED (do not redefine)

Verified by grep against `src/app/globals.css` on 2026-06-22. **Every `--landing-*` token aliases
one of these; none are redeclared.**

| Existing token (anchor in `globals.css`) | Value | Landing use |
|---|---|---|
| `--brand-orange` (L37) | `#F24405` | **Presence** — logo slab fill, focus rings, the accent rail, the one primary-CTA fill, a single tick on a claims-tagged graph node (D-3). |
| `--brand-orange-dark` (L38) | `#C63804` | **AA orange** — any orange used as text or an icon `< 24px` (~5.3:1 on white). The brief memory "DESIGN.md tertiary fails AA; use `#5D5D5D`" is honored: `#F24405` (~3.75:1) is NEVER body text. |
| `--brand-orange-soft` (L39) | `color-mix(in srgb, var(--brand-orange) 14%, white)` | The soft wash behind a single tagged ledger row or graph node — sparingly (§5). |
| `--brand-amber` (L53) | `#e7a977` | Only inside the hero gradient composition (`--grad-hero-continue`); not a standalone token. |
| `--brand-peach` (L54) | `#f4cdb0` | Only inside the hero gradient composition; not a standalone token. |
| `--ink` (L10) | `#3D3D3D` | Headlines + body ink. Aliased directly — see §3.2. The prior direction's `#292929` override is **dropped** (no longer needed; the Glass Brand inherits the app ink). |
| `--secondary` (L11) | `#5d5d5d` | Secondary ink — **AA-safe; the ONLY acceptable meta/caption ink**. `--tertiary` `#7f7f7f` (L12) is design-system-pinned but **MUST NOT carry load-bearing text** (§5). |
| `--muted-foreground` (L26) | `#6b6b6b` | Tertiary meta where a touch more contrast than `#7f7f7f` is wanted but `--secondary` is too strong. |
| `--canvas` / `--warm-canvas` (L16-17) | `#f5f5f5` | **THE** page background (D-1: warm grey canvas, not paper). |
| `--surface` (L13) | `#ffffff` | Opaque inner surface fallback. |
| `--hairline` (L18) | `#f2f2f2` | Hairline rules on glass. |
| `--proposal-paper` (L98) | `#fffdf8` | **Direction D accent only** (D-1) — a one-off owner-approved callback surface may use it later, but **not `/trust` in the launch redesign**. `/trust` stays Glass Brand until Philip explicitly approves a paper callback. **NOT the page background.** |
| `--success` / `--warning` / `--danger` (L92/94/96) | `#15803d` / `#b45309` / `#b91c1c` | Claim-status semantics ONLY where the ledger maps them (Live→success, Building→warning, Planned→ink). Never decorative. |
| `--radius-xs` (L100) | `3px` | Inner cells, dense cards. |
| `--glass-bg`, `--glass-bg-fallback`, `--glass-blur`, `--glass-saturate`, `--glass-radius`, `--glass-nav-radius` (L108-117) | see §4 | The Glass Brand surface — full spec in §4. |

### 3.2 NEW tokens to ADD to `:root` (append-only; do not touch existing lines)

Add as a single clearly-commented block at the **end of `:root`**. Anchor the patch on the
**string** `--sidebar-content-offset: 80px;` (the last entry before `:root` closes — verified
present; grep `--sidebar-content-offset` in `globals.css`), inserted immediately **after** that
line, before the closing `}` of `:root`. Use the anchor string, not a line number, so the patch
survives any future insertion. Every name is prefixed `--landing-*` so it cannot collide with the
Workshop system and a future migration can grep-and-remove.

```css
/* ─── Landing-page redesign — The Glass Brand (2026-06-22, planning-only spec) ──
   Additive ONLY. Every token ALIASES an existing globals.css token (D-1 brand
   parity with the Workshop Dashboard + Estimate Sheet). Nothing here redefines
   an existing token. Rationale: keystone decisions D-1…D-5 (ratified
   2026-06-22) + this pack's 00-OVERVIEW. */

/* Canvas + ink — the Glass Brand surface. The landing floats on the SAME warm
   grey canvas the Workshop uses; ink is the SAME #3D3D3D. No #292929 override. */
--landing-canvas:        var(--canvas);             /* #f5f5f5, alias (L16) */
--landing-canvas-warm:   var(--warm-canvas);        /* #f5f5f5, alias (L17) */
--landing-ink:           var(--ink);                /* #3D3D3D, alias (L10) */
--landing-ink-secondary: var(--secondary);          /* #5D5D5D AA-safe; NEVER #7F7F7F (L11) */
--landing-ink-muted:     var(--muted-foreground);   /* #6b6b6b (L26) */

/* Hairlines on glass — cool neutral, not warm. A warm rule on a cool glass
   surface reads as a mistake (the prior paper direction's warm hairlines are
   retired with that direction). These are NEW values (not aliased), so they are
   authored in OKLCH per the §2 stance, with hex in the comment for grep parity. */
--landing-hairline:        oklch(96.5% 0.003 264);  /* ≈ #f2f2f2 — primary rule, card edges */
--landing-hairline-strong: oklch(93.0% 0.005 264);  /* ≈ #e6e7e7 — section breaks, plate frame */

/* The presence accent (D-3). Aliases Signal so the brand stays single-source.
   The alias exists so a future brand change propagates to the landing in one
   place. Clay #AA412A is NOT a token and is NOT referenced anywhere. */
--landing-accent:      var(--brand-orange);      /* #F24405 — presence: fills, logo slab, focus, accent rail */
--landing-accent-ink:  var(--brand-orange-dark); /* #C63804 — AA orange for text/icons < 24px */
--landing-accent-soft: var(--brand-orange-soft); /* 14% wash behind a tagged node, sparingly */

/* Type families — ALL alias existing stacks (§2). No new font is loaded. */
--landing-font-display: var(--font-display);     /* Doto (globals.css:203), alias */
--landing-font-numeric: var(--font-numeric);     /* Roboto Mono (globals.css:204), alias */
--landing-font-ui:      var(--font-sf-pro);      /* SF Pro system stack (globals.css:99), alias */

/* Optional accent: warm proposal-paper, for ONE callback surface max (the /trust
   claims-ledger "document panel" or a pull-quote). NOT the page background (D-1). */
--landing-paper-accent: var(--proposal-paper);   /* #fffdf8 (L98), accent-only alias */
```

### 3.3 NEW `@theme inline` mappings (so Tailwind utilities resolve)

Append **inside the existing `@theme inline { … }` block** (`globals.css:155-206`). Anchor the
patch on the **string** `--radius-xs: var(--radius-xs);` (the last entry in `@theme inline`,
verified at `globals.css:205`), inserted immediately **after** that line, before the closing `}`
of `@theme inline`. This is what makes `bg-canvas-landing`, `text-landing-ink`,
`border-landing-hairline`, `text-accent-ink`, etc. resolve as native utilities. Do **not** edit
any existing `@theme` line.

```css
/* ─── Landing tokens (2026-06-22) — additive @theme mappings ─────────── */
--color-landing-canvas:        var(--landing-canvas);
--color-landing-canvas-warm:   var(--landing-canvas-warm);
--color-landing-ink:           var(--landing-ink);
--color-landing-ink-secondary: var(--landing-ink-secondary);
--color-landing-ink-muted:     var(--landing-ink-muted);
--color-landing-hairline:      var(--landing-hairline);
--color-landing-hairline-strong: var(--landing-hairline-strong);
--color-landing-accent:        var(--landing-accent);
--color-landing-accent-ink:    var(--landing-accent-ink);
--color-landing-accent-soft:   var(--landing-accent-soft);
--color-landing-paper-accent:  var(--landing-paper-accent);
--font-landing-display:        var(--landing-font-display);
--font-landing-numeric:        var(--landing-font-numeric);
--font-landing-ui:             var(--landing-font-ui);
```

> **⚠️ Tailwind v4 gotcha (memory-verified, 2026-06-20):** in this Tailwind v4 setup,
> `bg-[var(--x)]` silently emits no color; you **must** write `bg-[color:var(--x)]` for
> arbitrary-value backgrounds. The `@theme inline` mappings above sidestep this for the named
> utilities (`bg-landing-canvas`, `text-landing-accent-ink`, `border-landing-hairline`), but any
> *arbitrary-value* usage in a landing component (a one-off tint) must use the `color:` hint.
> `07-ENGINEERING-CONSTRAINTS.md` and `05-COPY-SKELETON.md` enforce this in their code-review
> checklists; `16-TEST-AND-VERIFICATION-PLAN.md` adds a visual-regression check that no element
> renders with a missing background.

### 3.4 Type scale (the Glass Brand editorial ramp; landing-only)

The landing's editorial register needs a larger, more generous type scale than the app's compact
(≤12px) one. These tokens are `--landing-*`-scoped; the app's scale (`@theme inline` lines
`--font-display` / `--font-numeric`, `globals.css:203-204`) is untouched. Sizes are mobile-first
`clamp()` functions so a single rule scales from 320px to desktop without breakpoint jitter. The
display ceiling obeys the impeccable-skill 6rem (~96px) hard cap.

> **Body-text floor = 16px on the landing.** The APP floor is 12px (dense dashboard data); the
> landing is editorial marketing copy read on mid-range Android, so the floor is **≥14px** and the
> default body is **17px** (`--landing-text-body`). `12-ACCESSIBILITY-AUDIT.md` §2 enforces this.

```css
/* ─── Landing type scale (2026-06-22) — mobile-first clamp, editorial register ──
   Mobile floor → desktop ceiling. Measure (line length) capped 65–75ch on prose.
   Doto display wants wide tracking (uppercase); SF Pro UI labels track tighter. */
--landing-text-display:    clamp(2.75rem, 5.5vw + 1rem, 5.5rem);  /* hero H1, ≤7 words */
--landing-text-display-s:  clamp(2.25rem, 4vw + 1rem, 3.75rem);   /* long-hero fallback */
--landing-text-headline:   clamp(1.875rem, 2.6vw + 1rem, 2.8125rem); /* section H2 */
--landing-text-title:      clamp(1.375rem, 1.4vw + 1rem, 1.75rem);   /* H3 benefit blocks */
--landing-text-body-lg:    clamp(1.125rem, 0.4vw + 1rem, 1.25rem);   /* lead paragraphs */
--landing-text-body:       1.0625rem;                                /* body prose (17px) */
--landing-text-body-sm:    0.9375rem;                                /* secondary prose (15px) */
--landing-text-caption:    0.875rem;                                 /* notes, disclaimers (14px — FLOOR) */
--landing-text-label:      0.75rem;                                  /* status pills, meta (12px — UI labels only, never body) */

/* Line-heights per role. */
--landing-leading-display: 1.04;   /* hero — Doto uppercase tracks wide */
--landing-leading-headline: 1.15;
--landing-leading-prose:    1.55;  /* body — readable; cap measure 65–75ch */
--landing-leading-tight:    1.3;   /* UI labels */

/* Letter-spacing. Doto display runs wide/uppercase (the dashboard's existing
   posture); UI pills track slightly open. */
--landing-tracking-display: 0.02em;   /* Doto uppercase — wide, not negative */
--landing-tracking-headline: 0;
--landing-tracking-prose:    0;
--landing-tracking-label:    0.08em;  /* SF Pro uppercase pills */

/* Measure (max line length). */
--landing-measure-prose: 70ch;        /* body prose */
--landing-measure-lead:  60ch;        /* hero subhead */
```

The hero H1 uses `--landing-text-display` for ≤7-word headlines (per `05-COPY-SKELETON.md` §1:
"Your cost intelligence layer." = 4 words). If a future hero exceeds ~50 chars, step down to
`--landing-text-display-s`.

> **Bridge into Tailwind.** To use these as utilities (`text-landing-display`,
> `leading-landing-prose`, `tracking-landing-display`), add the corresponding `--text-*`,
> `--leading-*`, `--tracking-*` entries inside the same `@theme inline` append in §3.3 — for
> example `--text-landing-display: var(--landing-text-display);`. List omitted here for brevity;
> the implementer adds one mapping per scale token actually consumed by a component (do not bridge
> tokens the landing never uses).

### 3.5 Spacing scale (4-pt base, 8px rhythm, named steps)

A 4-pt base matches the app's `--radius-xs: 3px` precision register and the impeccable skill's
4-pt recommendation. **8px is the bento/pane gutter rhythm** (the dashboard's `--spacing-sm: 8px`);
named steps so a redesign rescales in one place.

```css
/* ─── Landing spacing (2026-06-22) — 4-pt base, 8px rhythm, named steps ─────── */
--landing-space-3xs: 0.125rem;  /* 2px  — hairline gaps */
--landing-space-2xs: 0.25rem;   /* 4px  — tight icon-to-label */
--landing-space-xs:  0.5rem;    /* 8px  — bento/pane gutter rhythm (the dashboard's --spacing-sm) */
--landing-space-sm:  0.75rem;   /* 12px — caption-to-body */
--landing-space-md:  1rem;      /* 16px — body default */
--landing-space-lg:  1.5rem;    /* 24px — between paragraphs */
--landing-space-xl:  2rem;      /* 32px — between benefit blocks */
--landing-space-2xl: 3rem;      /* 48px — between sections (mobile) */
--landing-space-3xl: 4rem;      /* 64px — between sections (desktop) */
--landing-space-4xl: 6rem;      /* 96px — hero top/bottom padding (desktop) */

/* Section rhythm: vary for editorial cadence; never uniform. */
--landing-section-pad-y: clamp(2.5rem, 5vw, 6rem);  /* mobile 40px → desktop 96px */
--landing-section-pad-x: clamp(1rem, 4vw, 4rem);    /* mobile 16px → desktop 64px (max measure) */
```

### 3.6 Z-index scale (semantic, never arbitrary)

Per the impeccable skill: a semantic z-index scale; no arbitrary `999` / `9999`. The landing uses
a small subset of the app's stacking contract.

```css
/* ─── Landing z-index (2026-06-22) — semantic, per impeccable skill ─────────── */
--landing-z-base:          0;     /* default flow */
--landing-z-sticky:        100;   /* sticky glass header */
--landing-z-dropdown:      200;   /* header hamburger / mobile nav */
--landing-z-plate-caption: 300;   /* the commercial-graph plate caption */
--landing-z-overlay:       400;   /* cookie banner */
--landing-z-modal:         500;   /* (reserved — landing has no modals at launch) */
--landing-z-toast:         600;   /* (reserved) */
```

The marketing surface has no modals/toasts at launch; the slots are reserved so a future addition
slots into the existing contract instead of inventing a new value.

### 3.7 Radius ramp (3 / 8 / 12 ONLY — the PRODUCT.md scale)

PRODUCT.md "Deliberate radius scale" pins three radii: `3px` dense, `8px` glass pills / nav,
`12px` floating glass panels. `--radius-xs: 3px` (`globals.css:100`), `--glass-nav-radius: 8px`
(`globals.css:117`), and `--glass-radius: 12px` (`globals.css:116`) **all already exist**; alias
them rather than redeclaring, and give the landing a named ramp so no one is tempted to invent a
value (the codex "over-rounded card" tell per the impeccable skill).

```css
/* ─── Landing radius (2026-06-22) — the full PRODUCT.md ramp, aliased ──────────
   3px dense · 8px glass pills/nav · 12px floating panels. Nothing else. The
   impeccable skill bans 24/28/32/40px on cards (the codex "over-rounded" tell). */
--landing-radius-dense: var(--radius-xs);         /* 3px — hairline cards, dense cells */
--landing-radius-pill:  var(--glass-nav-radius);  /* 8px — CTA buttons, nav, filter chips */
--landing-radius-panel: var(--glass-radius);      /* 12px — floating glass panels, the plate */
```

The redesign never uses a radius outside this ramp; the impeccable skill's `border-radius:
32px+ on cards` ban is enforced at code review (`16-TEST-AND-VERIFICATION-PLAN.md`).

---

## 4. Glass application on the landing (the Glass Brand surface)

This is the section that makes the landing "the same brand as the dashboard." The glass tokens are
**all already in `globals.css`** (verified L108-L117); the landing consumes them, it does not
invent them.

### 4.1 The glass tokens (aliases, verified in `globals.css`)

| Token (anchor) | Value | Landing use |
|---|---|---|
| `--glass-bg` (L108) | `rgba(255,255,255,0.72)` | The frost tint on every glass surface. |
| `--glass-bg-fallback` (L109) | `#fbfbfc` | Opaque fallback for no-`backdrop-filter` support and `prefers-reduced-transparency` (§4.4). |
| `--glass-blur` (L110) | `18px` (capped 16–20px for mobile GPU) | The blur amount; consumed via `--glass-blur-amount` so it can be deferred (§4.3). |
| `--glass-saturate` (L111) | `145%` | The saturation boost on the frost. |
| `--glass-radius` (L116) | `12px` | Floating glass panels (alias `--landing-radius-panel`). |
| `--glass-nav-radius` (L117) | `8px` | The sticky glass nav + pills (alias `--landing-radius-pill`). |
| `--grad-canvas-wash` (L62) | subtle brand-orange bloom over `#f5f5f5` | The page-background wash; the canvas is never flat grey. |
| `--grad-hero-continue` / `--grad-hero-create` (L59-60) | brand-orange→amber→peach over `--glass-bg` | The hero's brand composition (an abstract gradient built from the dashboard gradients — **NOT a fake product screenshot**, per D-2). |

The CSS classes `.dashboard-glass` (`globals.css:1229`), `.dashboard-glass-warm`
(`globals.css:1753`), and `.workshop-workspace-glass-surface` (`globals.css:1261`) **already
consume `data-glass="ready"` + `--glass-blur-amount`**; the landing reuses them verbatim or, if a
landing-specific variant is wanted, defines a `.landing-glass` class that extends the same
contract (same `backdrop-filter`, same fallback) — **it does not introduce a new glass system.**

### 4.2 Where glass surfaces appear on the landing

| Surface | Glass treatment | Why |
|---|---|---|
| **Sticky header / nav** | `.dashboard-glass`-equivalent at `--landing-z-sticky`, `--glass-nav-radius` | Brand parity with the Workshop top bar; floats over the scrolling canvas. |
| **Hero brand panel** | A glass panel carrying the `--grad-hero-continue`/`--grad-hero-create` abstract composition + the signal-orange logo slab (D-2: NO fake product screenshots) | The "tasteful brand composition" D-2 mandates for the hero / auth left-panel. |
| **Commercial-graph plate (`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`)** | `.dashboard-glass-warm` floating panel, `--landing-radius-panel`, `--landing-hairline-strong` frame | The keystone section's container reads as a floating glass plate, matching the Estimate Sheet surface. |
| **Claims-ledger surface (`06-PROOF-AND-CLAIMS-DISCIPLINE.md`)** | `.dashboard-glass` panel; rows separated by `--landing-hairline` | The ledger reads as a glass document the reader can trust. |
| **Auth left brand panel (`23-AUTH-EXPERIENCE.md`, D-2)** | `.dashboard-glass-warm` full-height panel with the hero-gradient composition + signal-orange logo slab | The 2-column auth layout's brand side (D-2). Collapses `< 768px`. |

### 4.3 Deferred-glass arming (the technique, verbatim from the app)

The landing inherits the app's deferred-glass pattern **unchanged** (verified in
`src/components/system/LiquidGlassReady.tsx` + `globals.css:287-313`):

1. **Paint blur-OFF first.** `@property --glass-blur-amount` (`globals.css:287-291`) starts at
   `0px`; glass surfaces ship with a solid `--glass-bg-fallback` so first paint is cheap and the
   LCP text headline is not blocked.
2. **Arm after first paint + idle.** `<LiquidGlassReady />` (`src/app/layout.tsx:40`) sets
   `<html data-glass="ready">`, which flips `--glass-blur-amount: var(--glass-blur)`
   (`globals.css:295-297`). The component uses a **double-rAF backstop** +
   `requestIdleCallback({ timeout: 400 })` (Safari falls back to a 200ms timeout) and a **hard
   1500ms backstop** (`LiquidGlassReady.tsx:56`). `<LiquidGlassReady />` already mounts globally,
   so the landing gets arming for free.
3. **Do NOT gate arming on `prefers-reduced-transparency` alone.** The existing block intentionally
   does not gate on `no-preference` because engines that support `backdrop-filter` but not the
   `prefers-reduced-transparency` feature (older Chrome) would lose the frost entirely
   (`globals.css:280-286`). Reduced-transparency is enforced by an inner `@media reduce` DISARM,
   not by gating arming. The landing inherits this — do not "fix" it.
4. **Reduced motion snaps, never animates the ramp.** `@media (prefers-reduced-motion: reduce)`
   sets `transition: none` (`globals.css:309-313`); the blur still applies once armed, it just
   does not animate in. New landing motion adds its own reduced-motion guard or relies on the
   global ones (`07-ENGINEERING-CONSTRAINTS.md`).

### 4.4 The ≤4-simultaneous-blur cap

`backdrop-filter` is GPU-expensive on mid-range Android (the target device class,
`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`). **At most 4 glass surfaces may carry a live blur in any
single viewport on the landing.** Concretely:

- The sticky nav (1) + the hero brand panel (1) + the commercial-graph plate (1) + the
  claims-ledger panel (1) = **exactly 4** when all are visible. Auth (`23-AUTH-EXPERIENCE.md`) is
  a separate route, so its left panel is not simultaneous with the marketing surfaces.
- If a future section adds a 5th blurred panel, **demote one existing panel to the opaque
  `--glass-bg-fallback`** (no `backdrop-filter`) before shipping. This is a hard budget, enforced
  in `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` §3 and the `16-TEST-AND-VERIFICATION-PLAN.md` perf
  gate.
- The cap is counted on the **initial desktop viewport** (≥1024px, pointer:fine — the only class
  that runs the animated ramp per `globals.css:303-307`); mobile snaps straight to full blur once
  armed but the cap still applies because each blur is a per-frame GPU cost.

### 4.5 Text-on-glass AA verification

Glass is a translucent surface, so text-on-glass contrast must be verified against **the worst-case
backdrop** the panel can float over, not against an assumed white. Rule:

- **Verify every text-on-glass pairing in `12-ACCESSIBILITY-AUDIT.md` §2 against the darkest and
  lightest backdrop the panel can cover** (e.g. the hero gradient's amber peak and the plain
  `--canvas`). If the ratio drops below 4.5:1 in either case, darken the text (step `--ink` → a
  computed darker variant) or add a subtle text-shadow / a more opaque `--glass-bg` for that panel
  only — never lower the AA bar.
- The body ink `--ink #3D3D3D` (~9.8:1 on white) has comfortable headroom over `--glass-bg
  rgba(255,255,255,0.72)` on the plain canvas; the risk case is dark text over the hero gradient's
  brand-orange peak. The hero headline is **Doto on the gradient**, so its contrast is checked
  first; if it fails, the hero panel's `--glass-bg` opacity is raised locally (the token stays
  global; the local class overrides `--glass-bg` for that one surface).

---

## 5. The presence-accent discipline (D-3)

State it once, enforce it everywhere:

**Signal orange is presence, not a color scheme.** It is the color the dashboard uses for "this is
alive, this is the active thing, this is where you look first." Concretely (D-3 hard contract):

| Allowed (presence stance) | Forbidden (overload stance) |
|---|---|
| `--landing-accent` (`#F24405`) fill on the **one** primary CTA ("Start free") and the logo slab. | A second `#F24405` filled button, card, or hero panel in the same viewport. |
| `--landing-accent` as the **focus ring** (instant `:focus-visible`, `07-ENGINEERING-CONSTRAINTS.md`) — keyboard nav reads as "this is the active line." | `#F24405` as body text or a small icon — fails AA at ~3.75:1. Use `--landing-accent-ink` (`#C63804`). |
| `--landing-accent` as a 2px **accent rail** down the left edge of a claims-tagged ledger row or a section opener. | A `#F24405` gradient, glow, or background wash larger than a single tag. |
| `--landing-accent-soft` (14% wash) behind a single tagged ledger row or graph node, sparingly. | Using the accent on more than one **element category** per viewport (e.g. fills AND rails AND washes simultaneously). |
| A small `--landing-accent` dot/tick next to a commercial-graph node to mark its Live claim status. | Any second accent color. There is one accent family (D-3). **Clay `#AA412A` is NOT used.** |

**At most one accented element per viewport** is the rule of thumb; the discipline table above is
the binding spec. **Voice tie-in (`00-OVERVIEW.md` §10.2 #3 "calm conviction, never hype"):** the
accent discipline *is* the voice discipline made visual. A page that paints Signal everywhere reads
as hype; a page that uses it once, as the active-state color, reads as earned confidence. If a
section "needs more color to pop," the section's copy is weak — fix the copy, do not add accent.

> **D-3 reconciliation note (closed).** Earlier drafts of this pack referenced "clay `#AA412A`" as
> a text-on-light accent variant. `#AA412A` appears in `DESIGN.md` prose (the superseded pre-Signal
> "product" color) but is **NOT a token in `globals.css`** and is **NOT used by the Glass Brand**.
> Every clay reference in the pack is reconciled to `--brand-orange-dark #C63804`. Do not grep for
> `--clay`; it does not exist.

---

## 6. Contrast notes (the `#7F7F7F` rail + the AA ledger)

`--tertiary #7f7f7f` (`globals.css:12`) is design-system-pinned but **MUST NOT carry any
load-bearing text on the landing** (it fails WCAG AA 4.5:1 for normal text). The brief memory
("DESIGN.md tertiary fails AA; use `#5D5D5D`") is honored as a hard rule:

- **`#7F7F7F` may appear only** in non-text decorative roles (a faint gridline behind the
  commercial-graph plate, a placeholder rule) where contrast is irrelevant.
- **`#3D3D3D` (`--landing-ink`)** is the body/headline ink: ~9.8:1 on `--canvas #f5f5f5` — AAA. Use
  it for all headlines and body prose.
- **`#5D5D5D` (`--landing-ink-secondary`)** is ~7.5:1 on the canvas — AAA. Use it for captions,
  meta, the cement-anchor concept label, "Pre-launch MVP preview" disclaimers, and the
  claims-ledger Live/Building/Planned sub-labels.
- **`#6b6b6b` (`--landing-ink-muted`)** is ~5.9:1 on the canvas — AA-pass, useful where
  `#5D5D5D` is too strong but the text still carries meaning.
- **`#C63804` (`--landing-accent-ink`)** is ~5.3:1 on white / ~5.0:1 on `--glass-bg` (globals.css
  comment at L35) — AA-pass. The **only** acceptable accent hue for text/icons `< 24px`.
- **Separation on glass** comes from `--landing-hairline` (`#f2f2f2`) and `--landing-hairline-strong`
  — never from lowering ink contrast. A reader on the landing should never squint to read a claim;
  the honesty posture (`06-PROOF-AND-CLAIMS-DISCIPLINE.md`) depends on every word being legible.

### 6.1 ClaimStatus color mapping (D-4)

Per D-4, the single shared `ClaimStatus` type (`"Live" | "Building" | "Planned" | "NotUs"`, one
component `src/components/landing/shared/StatusPill.tsx`) maps to status semantics, not to accent
decoration. The mapping the `StatusPill` consumes:

| Status | Color | Token |
|---|---|---|
| Live | success green | `--success #15803d` (AA on glass) |
| Building | warning amber | `--warning #b45309` (AA on glass) |
| Planned | ink | `--landing-ink #3D3D3D` (not "grey = maybe"; Planned is a stated intent, rendered in body ink) |
| NotUs | muted | `--landing-ink-muted #6b6b6b` (the plate subset in `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` narrows this out — no NotUs nodes) |

The signal-orange accent is **separate** from this status palette: orange marks *presence* (the
active CTA, the focus ring, the accent rail), NOT claim status. The plate (doc 04) imports the
same `ClaimStatus` type and narrows to Live/Building/Planned at the call site (D-4 hard contract).

---

## 7. Loading the fonts (zero new requests)

### 7.1 Doto + Roboto Mono are already loaded

`src/app/layout.tsx:2` imports `{ Doto, Roboto_Mono }` from `next/font/google`; `:9` configures
`Roboto_Mono` (`--font-roboto-mono`, `display: "swap"`); `:12-17` configures `Doto`
(`--font-doto`, `weight: "variable"`, `display: "swap"`); both variables are attached to
`<body>` (`:36`). **The Glass Brand landing consumes these existing variables via the aliases in
§3.2; it loads no new font.** This is the fastest possible LCP posture (§7.3).

### 7.2 `adjustFontFallback` for Doto + Roboto Mono

`next/font/google` auto-injects an `adjustFontFallback` for the **fallback font** (the
metric-override that prevents CLS during the swap) when you do not set it explicitly. For the
landing's LCP-critical Doto hero, **verify CLS = 0** in Lighthouse on a 320px Moto G-class device
before cutover (`14-PERFORMANCE-AND-CORE-WEB-VITALS.md` §6). If the swap shifts, **pin
`adjustFontFallback`** on the `Doto` config in `layout.tsx:12-17`:

```ts
const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  adjustFontFallback: {
    ascentOverride: "0.93",
    descentOverride: "0.22",
    lineGapOverride: "0",
    sizeAdjust: "100%",
  },
});
```

The values above are a starting point (Doto → closest available system mono fallback); tune against
observed CLS. Roboto Mono is not LCP-critical on the landing (it carries numerals, not the
headline), so its `adjustFontFallback` stays at the `next/font` default; flag it only if the
claims-ledger counts shift on load. **This verification step belongs to doc 14, not this doc** —
this doc only asserts the face is LCP-critical and the config is in `layout.tsx`.

### 7.3 Font-loading performance (cross-link to doc 07/14)

LCP = the Doto text headline (`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` hero §1; `07-ENGINEERING-CONSTRAINTS.md`).
Because Doto + Roboto Mono are already in the global `<body>` className, the landing adds **zero**
font requests and **zero** render-blocking font CSS beyond what the app already ships. SF Pro is a
system stack (no request). `07-ENGINEERING-CONSTRAINTS.md` owns the exact preload order; this doc
only asserts the font payload is unchanged by the landing.

### 7.4 Source Serif 4 — DEFERRED (D-1)

D-1 demotes the prior "Source Serif 4 document" direction to Alternative D in
`01-DESIGN-DIRECTION.md` §3.4. **The Glass Brand landing does NOT load Source Serif 4 and does NOT
make the "same serif as your proposal" continuity claim.** The continuity claim is gated on the
proposal export itself shipping serif — and today the export is `.xlsx`
(`src/app/api/.../proposal.xlsx/route.ts`), which has no body font. If Philip later prefers the
Document direction, the serif-loading spec (the `Source_Serif_4` import, `--font-source-serif`, the
`adjustFontFallback` values, the 400/500/600 weight set) is preserved in this section's git history
and in `01-DESIGN-DIRECTION.md` §3.4; until then it stays out of `layout.tsx`. Tracked as **closed
for the Glass Brand**; reopen only if Direction D is adopted.

---

## 8. Motion stance (`$gpt-taste` GSAP overlay)

The motion policy now has two layers:

1. **Execution layer:** `24-GPT-TASTE-EXECUTION-CONTRACT.md` is mandatory for implementation.
   The landing must include real GSAP motion using `gsap`, `@gsap/react`, and `ScrollTrigger`,
   selected through the required pre-code `<design_plan>`.
2. **Safety layer:** motion never invents proof, hides content, traps keyboard users, ignores
   `prefers-reduced-motion`, breaks the <=4 live-blur cap, or pushes the route past the verified
   bundle/Core Web Vitals gates.

This supersedes the prior "IntersectionObserver-only restrained reveal" posture for the public
landing visual build. The old reveal can remain as a fallback, but it no longer satisfies the
landing's taste gate by itself.

| Motion | Stance | Mechanism |
|---|---|---|
| `$gpt-taste` GSAP section motion | **Required.** At least two selected paradigms from doc 24: pinned proof split, image/material scale+fade, scrubbed word reveal, or card stacking. | Isolated `"use client"` leaves in `src/components/landing/gpt-taste/`; register `ScrollTrigger`; clean up on unmount; dynamically import/defer if bundle budget requires. |
| Scroll-reveal fades for sections | **Fallback only.** A 200-300ms opacity + 8px translateY fade is acceptable for secondary sections, but it does not satisfy the mandatory GSAP requirement. | Existing `MotionReveal.tsx` or equivalent fallback; reduced-motion shows content immediately. |
| Commercial-graph plate (`04`) node hover | **Required interaction.** A `--landing-hairline-strong` rule draw-on + a `--landing-accent-soft` wash behind the focused node + the status tag/caption. It teaches the claims ledger. | CSS or GSAP leaf, but keyboard focus and touch equivalents are mandatory (`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`). |
| Gapless bento / product-mechanic grid motion | **Required if the grid is clickable.** Hover physics on cards/images inside `overflow-hidden`; no dead cells; `grid-flow-dense` or equivalent span proof. | CSS transforms may handle hover; GSAP may handle scroll reveal/stacking. Reduced-motion keeps the final layout readable. |
| Deferred liquid-glass blur ramp | **Reuse the existing pattern verbatim** (`data-glass="ready"` + `@property --glass-blur-amount`, §4.3). Do **not** invent a new glass system. The landing ships blur-off first and arms on idle, exactly as the app does. | `<LiquidGlassReady />` already mounts in `layout.tsx:40`. |
| Construction-photo slideshow / crossfades | **BANNED.** Removed in the redesign (Hallmark removal rail, `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`). No hero image carousel. | n/a — deletion, not motion. |
| `prefers-reduced-motion: reduce` | **Respected everywhere, no exceptions.** GSAP pinning, scrubbing, scale, opacity traps, marquee motion, and card stacking disable or snap to a readable final state. | `matchMedia("(prefers-reduced-motion: reduce)")` inside GSAP leaves plus CSS fallback; tests in `16-TEST-AND-VERIFICATION-PLAN.md`. |

**The rule:** the landing should feel motion-rich and editorial, but motion must teach or clarify:
the pinned proof section explains the commercial graph, the scrubbed words slow the cost-intelligence
argument, the card stack compares spreadsheet vs reusable library, and hover physics confirms
clickable mechanics. Motion that only decorates is still cut.

---

## 9. How the landing shares the app system (continuity without sameness)

D-1 says the landing embodies the SAME brand as the Workshop. The landing is editorially
**distinct** (larger type, more air, fewer controls) but materially **continuous** (same glass,
same canvas, same fonts, same one accent). The shared-vs-distinct split:

| Aspect | Shared with the Workshop (continuity) | Distinct on the landing (editorial) |
|---|---|---|
| Canvas | `--canvas`/`--warm-canvas` `#f5f5f5` (same source of truth) | The landing bases the **whole page** on it; the Workshop uses it as the shell. |
| Glass | `.dashboard-glass` / `.dashboard-glass-warm` / `--glass-*` tokens, same deferred arming | The landing composes them into nav + hero panel + plate + ledger; the Workshop composes them into the sidebar + workspace. |
| Fonts | Doto (display) + Roboto Mono (numerals) + SF Pro (UI) — identical stacks | The landing leans into Doto for editorial headlines; the Workshop path-scopes Doto to the dashboard hero. |
| Signal orange | Same `--brand-orange` family + the same presence stance (fills, logo slab, focus, active state) | The landing extends presence to the **accent rail** + the single primary-CTA fill; the Workshop uses it for the active nav item. |
| Radius | `--radius-xs` 3px / `--glass-nav-radius` 8px / `--glass-radius` 12px — identical ramp | The landing leans into 12px floating panels that read as glass plates. |
| Ink | `--ink #3D3D3D` + `--secondary #5D5D5D` (identical) | The landing uses the larger `--landing-text-*` scale; the Workshop keeps the compact ≤12px scale. |

**Net:** a reader who clicks "Start free" moves from a glass-on-warm-canvas editorial landing into a
glass-on-warm-canvas compact workspace — and recognizes the canvas, the glass, the fonts, the
radius, and the one accent color. That continuity is the brand argument (D-1) made navigable.

---

## 10. Cross-links to sibling docs

- **`00-OVERVIEW.md`** — owns the ratified keystone decisions D-1…D-5 this doc obeys (Glass Brand,
  full-page auth, orange discipline, ClaimStatus type, honest scoring). The owner sign-offs this
  doc still gates on (§11) are recorded there and in `LOOP_LEDGER.md`.
- **`01-DESIGN-DIRECTION.md`** — owns the *direction rationale*; §3.4 preserves the prior "Document"
  direction as Alternative D (the Source Serif 4 + paper option). This doc binds to the default
  (Glass Brand); Alternative D is deferred.
- **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`** — the canonical DOM section order this token plan
  styles; the Hallmark removal rail (slideshow, hype hero, fabricated testimonials, logo-only
  footer) that §8's motion bans and §5's accent discipline reinforce.
- **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`** — owns the full SVG plate spec; consumes
  `--landing-hairline`, `--landing-hairline-strong`, `--landing-accent-soft`, the
  `--landing-accent` Live-status tick, the `.dashboard-glass-warm` plate container, and the D-4
  `ClaimStatus` type (narrowed to Live/Building/Planned).
- **`05-COPY-SKELETON.md`** — applies these tokens to each section's markup + the §11 copy
  (verbatim, claims-disciplined); enforces the `bg-[color:var(--x)]` gotcha (§3.3) in its
  code-review checklist.
- **`06-PROOF-AND-CLAIMS-DISCIPLINE.md`** — owns the `<ClaimsLedger>` surface that sits on
  `.dashboard-glass`; consumes the `ClaimStatus` type (D-4) and the §6.1 status→color map.
- **`07-ENGINEERING-CONSTRAINTS.md`** — owns the RSC-first hydration boundary (only the plate hover
  + ledger filter hydrate), the `prefers-reduced-motion` enforcement checklist (§8), and the
  LCP/perf budget the deferred-glass arming + Doto headline must fit.
- **`12-ACCESSIBILITY-AUDIT.md`** — owns the 320/375/414/768 breakpoints, the architecture-plate
  collapse, the `overflow-x: clip` rule, the formal WCAG audit that §6 feeds into, and the
  text-on-glass contrast verification (§4.5).
- **`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`** — owns the ≤4-simultaneous-blur cap (§4.4), the
  Core Web Vitals targets, the Doto `adjustFontFallback` CLS verification (§7.2), and the JS/font
  budget (the landing adds zero font requests).
- **`15-FORMS-AND-ABUSE-GUARDRAILS.md`** — owns the `/contact` + `/signup` form surfaces; consumes
  `.dashboard-glass` for form panels.
- **`23-AUTH-EXPERIENCE.md`** — owns the full-page 2-column auth layout (D-2); the LEFT brand
  panel consumes `.dashboard-glass-warm` + `--grad-hero-continue` + the signal-orange logo slab
  (§4.2).
- **`16-TEST-AND-VERIFICATION-PLAN.md`** — owns the visual-regression check that no element renders
  with a missing `bg-[color:var(--x)]` background, the radius-ramp enforcement, and the perf gate
  for the blur cap.
- **`LOOP_LEDGER.md`** — the open-decision queue; this doc's remaining gates (§11) are rows there.

---

## 11. ⚠️ Gated on / Open decisions

- **L-DES-1 — "Accent rail" public naming.** The accent-as-presence mechanic is settled (§5);
  whether the landing *names* the left-edge rail ("we call it the accent rail" vs. just drawing it)
  in any public caption wants one owner sign-off. ⚠️ GATED ON `00-OVERVIEW.md` owner confirmation;
  the mechanic proceeds regardless. (Carried from the prior O-1; re-IDed to the L-DES-1 row.)
- **L-DES-2 — Glass on additional sections.** §4.2 lists exactly 4 glass surfaces (nav, hero panel,
  plate, ledger) — the §4.4 cap. If a future section wants a 5th glass surface, one existing panel
  must demote to the opaque fallback first. ⚠️ GATED ON `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`
  perf budget + owner preference.
- **L-DES-4 — SF Pro licensing on non-Apple platforms (§2).** The landing inherits the app's
  posture (the app already ships `--font-sf-pro`); this is not a new landing decision. If the owner
  wants to close it product-wide (ship Inter as the drop-in), that is a cross-cutting change, NOT a
  landing-scoped one. ⚠️ GATED ON owner; tracked in `LOOP_LEDGER.md` L-DES-4.
- **L-DES-3 (informational, closed for the Glass Brand) — Source Serif 4 continuity.** The prior
  direction's serif-continuity claim is retired with that direction (D-1). The gate is preserved
  in `LOOP_LEDGER.md` L-DES-3 in case Direction D is later adopted; until then it does not block
  this doc.
- **L-DES-6 (new) — Doto `adjustFontFallback` CLS verification.** §7.2 proposes values; CLS must be
  measured = 0 on a 320px Moto G-class device before cutover. ⚠️ GATED ON the
  `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` lab measurement; values tuned to observed CLS.

**Resolved by this revision (no longer gates):**
- **OKLCH vs hex (prior L-DES-5)** — resolved (§2 stance: aliases inherit existing hex; genuinely
  new tokens use OKLCH with a hex comment).
- **`#292929` vs `#3D3D3D` ink (prior O-5)** — resolved: the Glass Brand uses the app's `--ink
  #3D3D3D` directly (§3.2); no landing-scoped override.
- **Source Serif 4 weight set (prior O-4)** — moot: the Glass Brand does not load Source Serif 4
  (§7.4).
- **Reduced-motion for scroll-reveals (prior O-6)** — carried by `07-ENGINEERING-CONSTRAINTS.md`
  review checklist (§8), not a doc-03 gate.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.** Every
public-word implication (the cement-anchor concept label, the "Pre-launch MVP preview" disclaimer,
the claims-ledger status tags) is grounded in `00-OVERVIEW.md` §9.3/§15/§11;
`05-COPY-SKELETON.md` keeps pricing explicitly hypothesis-labeled per §9.3 (no locked price is
published). Voice throughout = Controlled Confidence (`00-OVERVIEW.md` §10).
