# 03 — Reference Analysis: amigo.ai & intercom.com (Design Layer)

Status: complete. Sources: direct CSS extraction from `www.amigo.ai/_next/static/css/*` bundles
(2026-06-11), Intercom primary design articles (their redesign and brand-refresh posts, Fonts In
Use 2022–2024 record, Figma AI-Summit case study), Procore CORE design-system docs, BuiltWorlds
AEC startup scan. Conversion-structure patterns are already covered by
`Landing-Page-Research-Report.md`; this document covers the **visual and experiential layer** and
what to transfer.

---

## 1. The headline discovery: our palette IS amigo's palette

Amigo.ai's stylesheet defines:

```css
--amigo-blue:     #083241;  /* deep navy-teal — identical to our footer/diagram teal */
--amigo-orange:   #aa412a;  /* terracotta — identical to our --brand-orange */
--amigo-green:    #2c3827;
--amigo-lavender: #c5bace;  /* our footer graph accents use #d8c3d2, a near match */
--amigo-black:    #100f0f;
--linework-orange:#c68277;  /* desaturated accent reserved for illustration linework */
--linework-blue:  #5c767e;
--warm-gray-1..6: #f1eae7, #d7d2d0, #b3aeac, #969290, #767270, #575452;
```

Archestimator's landing currently uses `#aa412a` and `#083241` byte-for-byte, plus Amigo's
section concepts ("Digital Residency" → "estimate residency") and section ordering (see
`.omx/artifacts/visual-ralph/landing-amigo-reference/`). **The page is not "inspired by" amigo —
it is wearing amigo's system.** The owner's instinct that the page isn't authentic yet is
structurally correct.

What to do with this (full prescription in `05_VISUAL_DESIGN_DIRECTION.md`):
keep the two-color *strategy* (warm terracotta + deep teal is right for a construction-precision
brand), but (a) re-derive our own values a perceptible step away from amigo's, (b) build the
supporting neutral scale and linework palette as our own, (c) replace borrowed naming
("residency") with brand-spine language.

## 2. Amigo.ai — how it actually achieves "premium trust"

### Typography
- **Three-font system, three registers:** Flecha S (contemporary editorial serif, 300/400) for
  display = human/editorial; Inter variable for UI/body = functional; **ABC Diatype Mono** for
  data/metrics = technical precision.
- Fluid display scale: `clamp(40px, 6vw, 64px)`; tight display line-heights 1.02–1.08;
  eyebrows 12px/600/0.12em tracking/uppercase.
- Sentence-case headlines; all-caps confined to eyebrows.

### Color mechanics
- ~70% warm light surfaces (`#f1eae7` family — warm gray, not white) / ~30% deep `#083241`
  anchor sections. Dark sections are *punctuation*, not default.
- Orange deployed with restraint: primary CTAs, hovers, illustration linework. **Not** as a large
  background wash.
- Dedicated *linework palette* (`#c68277`, `#5c767e`): illustrations/diagrams use desaturated
  parallels of the brand accents, keeping the field calm while CTAs keep full saturation.
- Fluid section spacing: `--space-section-y: clamp(5rem, 3.94rem + 4.5vw, 8rem)`.

### Imagery & product proof
- Hero shows the product UI (polished composites), framed in glass-blur cards
  (`--glass-blur: 30.15px`) — the product is always given a framing device.
- Specialty cards use art-directed, color-treated photography; partner logos in plain grids.

### Motion
- Signature: `flowPathAnimation` — a **30-second continuous stroke-dashoffset SVG path draw**
  (a living workflow line), plus shimmer accents. Interaction timing is fast and professional
  (0.12–0.2s); no slow "luxury" transitions.

### Voice
- Long-form precise H1 ("The trusted platform for building, training, and deploying clinical
  agents"); validation vocabulary ("RIGOROUSLY VALIDATED", "34x ROI", "3M+ patient encounters");
  numbered 01–04 process sections. The register is *seeking trust from a skeptical enterprise
  buyer* — the same register Archestimator needs with estimators.

### What does the heavy lifting (top 5)
1. Three-font system incl. a premium mono (signals deliberate authorship).
2. Warm-cast neutral scale instead of cool tech grays.
3. Linework-specific desaturated accent tokens.
4. The one long continuous SVG drawing animation ("living system").
5. `#083241` as a *specific* dark anchor — not black, not generic navy.

## 3. Intercom — how it achieves "confident category owner"

### Typography & art direction
- Graphik (neo-grotesque, "structured yet quirky") + VC Honey (contemporary serif) for editorial
  moments; **hand-drawn custom numerals** for statistics (inspired by bodega signage) — warmth
  injected exactly where B2B pages are usually coldest.
- Sentence case, short headlines (<8 words), competitive confidence ("The only helpdesk designed
  for the AI Agent era").

### Color & imagery
- "Electric Mint" as a deliberately polarizing anchor; secondary palette deployed through
  **colored-backdrop portrait photography** — every human face participates in the color system.
- White/light surfaces for product sections; black and mint as punctuation moments.

### Motion
- Commissioned hero animations (Yeah Haus) every cycle — feature demonstration via motion
  ("showing not telling"), plus playful environmental touches (hover-scatter particles).
  Motion carries tonal attributes, not decoration.

### Layout
- One job per section; wide conversational text blocks; pill shape system derived from the
  product's own metaphor (chat bubble) propagated through cards/tags/avatars.

### What does the heavy lifting (top 5)
1. Hand-drawn stat numerals (tiny surface area, huge brand recall).
2. Commissioned, characterful hero motion.
3. Colorist photography.
4. A polarizing anchor color used selectively.
5. Shape language derived from the product metaphor.

## 4. AEC visual landscape (differentiation space)

- **Procore:** `#FF5200` safety-vest orange, custom "Procore Sans", site-photography-heavy,
  signals *incumbent scale*, not precision.
- **Bluebeam:** light, professional, template-adjacent; no distinctive type or color system —
  the "precision/drafting-table" visual register is **unclaimed** in AEC software.
- **Newer AEC/estimating startups** (Togal et al.): clean, white, generic. Visual differentiation
  in estimating software is wide open.

Implication: Archestimator's editorial-precision register (rough pencil over precise document,
warm drafting-paper neutrals, mono-set numbers) has no direct competitor occupying it.

## 5. Transfer map for Archestimator

### High transfer (adopt)
| Move | Adaptation for Archestimator |
| --- | --- |
| Three-register type system | Inter (already in DESIGN.md landing scale) for display+body; add a **precision mono for every number** (quantities, ₱/$ figures, totals) — Roboto Mono is already loaded app-side; landing may use the same or a chosen display mono. Numbers are our "clinical data". |
| Warm neutral scale | We already have `#fffdf9`/`#f7f1ea`; formalize a 5–6 step warm scale as tokens (drafting-paper memory: estimators live on trace/ivory, not tech-white). |
| Linework palette | Define desaturated terracotta + steel-teal tokens **for the rough.js diagrams and sketch annotations**; reserve full-saturation accents for CTAs and key numbers. This directly upgrades the existing hand-drawn system. |
| Deep-teal anchor sections | Bring `(our re-derived teal)` into the page body as 1–2 anchor sections (~30% dark rhythm), not footer-only. |
| Long continuous SVG draw | Our rough.js proposal-record flow is *already* the right concept — upgrade it to a slow continuous draw (stroke-dashoffset, 25–35s loop) so the page has a living centerpiece. This is the single highest-leverage motion investment. |
| Fluid section spacing | `clamp()`-based section padding tokens. |
| Eyebrow discipline | Keep one consistent eyebrow style; do not eyebrow every section (see impeccable ban); sentence-case headlines. |

### Moderate transfer (adapt with care)
| Move | Adaptation |
| --- | --- |
| Hand-drawn numerals (Intercom) | Do **not** hand-draw numbers (we sell numeric trustworthiness). Instead: mono-set tabular figures at display scale with unit labels — and reserve the hand-drawn voice for *annotations around* the numbers (rough underlines, circled totals, margin arrows). "Precise number, human pencil." This is the authentic synthesis of our existing rough-notation system. |
| Commissioned hero motion | Budget-realistic version: one well-crafted SVG/CSS sequence where an estimate assembles itself (rows appear, totals sum, a rough circle annotates the total) — product demonstration, not abstract motion. |
| Colored-backdrop photography | Defer until real customers/testimonials exist; then shoot/treat portraits on warm-gray or teal fields. |
| Pill/shape system from product metaphor | Our metaphor is the **document/spec sheet**: sharp 3px radii, hairline rules, table-like surfaces — consistent with the app's 3px architectural register. Avoid generic 8–20px rounding on landing cards. |
| Polarizing color bet | Terracotta is already the bet; the discipline is *where it appears* (CTAs, key numbers, annotations — not as default body-section wash). |

### Low transfer (reject)
- Glassmorphism blur framing (Amigo): soft surfaces undermine "numbers you can defend"; use crisp
  document-like framing instead.
- Surrealist/event palettes (Intercom 2025): wrong register.
- Clinical-trust vocabulary (Amigo): replace with construction-accuracy vocabulary from
  `brand-voice.md`.

## 6. Structural lessons vs. our current page

| Reference behavior | Our current behavior | Direction |
| --- | --- | --- |
| Amigo: orange restrained to CTAs/linework | 1,658px terracotta drench section | Cap/replace drench; restore orange's signal value (02 §D3) |
| Amigo: dark anchor sections mid-page | Teal only in footer | Mid-page teal anchor (02 §D2) |
| Both: product/feature proof per section, one job per section | Drench section does video+features+testimonials+logos | Split jobs (06 §4) |
| Both: hero proves the product (UI or motion demo) | Hero shows blurred stock construction photo | Product-proof hero (06 §2) |
| Intercom: stats as crafted set-pieces | No quantified proof at all (correct — none is real yet) | Use *product-truth numbers* (e.g., live totals in the demo artifact), not adoption claims |
| Both: sentence-case, short-or-precise headlines | Mixed Title Case fragments + borrowed metaphors | Brand-spine headlines (04) |
