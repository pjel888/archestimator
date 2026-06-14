# 04 — Design Options (Rev 2)

All options assume the existing SF Pro / neutral / compact product system and the token reality in `02`. Rev 1's options A–F were re-scored by an independent design adjudication panel against five axes: **matches user intent · on-brand · accessible · feasible/low-risk · density-preserving**. The winners and the rejects are below.

> **Scores (0–100, panel):** Ledger **88** · Anchored-Indent **83** · Quiet-Tone **62** · Rev 1 "Option E (guide lines + accent bars)" **31**.

---

## Option L — "Ledger" (recommended spine)

**Thesis:** a printed estimate ledger. Depth is read off an AA-grade **header ink ramp** (root = darkest + heavier landmark; descendants step lighter), plus the existing spacing rhythm and a single perceptible inset **sibling rule**. No fills, no guide lines, no concentric borders.

### Mechanisms

1. **Header ink ramp (PRIMARY):** root name `text-ink` + `font-medium`; depth-1+ name `text-secondary` + `font-normal`. (The user's "darker parent / lighter child", relocated from background to the text channel that has real AA range, while staying inside the app's regular/medium-only weight contract.)
2. **Root structural-label register:** `uppercase tracking-normal` on the depth-0 name only.
3. **Inset sibling rule:** a 1px divider in `--divider-sibling` (~`#d9d9d9`) on each child where `childIndex > 0`; inset to the content column; sits at the top of the existing `groupGap` (zero or near-zero added height). In Phase 1A, before block indent exists, this must be an explicit inset rule element/pseudo-element, not a full-width section border.
4. **Outline-code backbone:** node code `8px → 9px tabular-nums`; optionally weight-step by depth. Carries structure when colour is subtle (1.4.1).
5. **Spacing rhythm:** `groupGap` unchanged.

### Pros / Cons
- **+** Delivers both of the user's literal asks (tonal-via-text, sibling rules); brand-true ledger; respects `UX-4/OD-7` (fills stay flat); minimal test churn (header surface + `groupGap` untouched).
- **−** The ink ramp has only ~3 honest stops (and we cap at `secondary`), so deep-depth name colour can't keep stepping — weight/indent/code carry it past depth 1. Needs `childIndex` threaded for the "first child" rule. Adds one token.

### ASCII mockup

```
SCROLL CONTAINER (bg-white)
┌──────────────────────────────────────────────────────────────┐  root frame: rounded-xs border border-hairline (UNCHANGED)
│ ⌄ ● 01                                          ₱ 1,284,500.00 │  depth0 — name ink + medium + UPPERCASE tracking-normal
│     GROUND FLOOR                                              │  (sticky)   code "01" 9px tabular-nums
│  ┌──────────────── rows table (border-hairline, bg-white) ──┐ │             ● orange occupancy dot (has own rows)
│  │ Demolition        12  m²   850.00      10,200.00       ⋮ │ │
│  │ + Add a row / drag a component                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │  ← mt-5 (20px) gap
│   ⌄ ● 01.01  Slab on grade                        ₱ 642,000.00 │  depth1 — name secondary + regular  (FIRST child: NO rule)
│     ┌──── rows table (aligned under its own header) ────────┐  │
│     │ Concrete C25   40  m³ 4,200.00    168,000.00        ⋮ │  │
│     └──────────────────────────────────────────────────────┘  │
│   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │  ← SIBLING RULE (#d9d9d9), inset to the content column
│   ⌄ ● 01.02  Beams + columns                      ₱ 474,000.00 │  depth1 sibling (rule above; rides top of the mt-5 gap)
│     ┌──── rows table ─────────────────────────────────────┐   │
│     │ Rebar 16mm    1.2  t  68,000     81,600.00         ⋮ │   │
│     └──────────────────────────────────────────────────────┘  │
│       ⌄ ● 01.02.01  Footings                       ₱ 96,000.00 │  depth2 — name STAYS secondary (NOT tertiary: AA);
│         ┌── rows table ──────────────────────────────────┐    │             code "01.02.01" + indent carry the extra depth
│         │ Excavation  8  m³  1,100   8,800.00          ⋮ │    │
│         └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
Ink darkness DECREASES with depth (ink → secondary, then holds); sibling-rule inset INCREASES with depth.
```

---

## Option AI — "Anchored-Indent" (graft its core into L)

**Thesis:** indent the **entire node block** (header + row table + add-row strip) as one left-stepped unit at **20px/level**, so a child's whole grid sits inside its parent's column. The step itself is the depth + ownership signal.

### Why it matters
This is the honest fix for **Gap B**: today the indent is on the header's `paddingLeft` only, so the table floats full-width to the left. Moving the indent onto the inner node block (and removing the header-only `paddingLeft`) makes the table land directly under its own header — no connector, no card. Pair with the same ink ramp + sibling rule as Option L, and add supported heading-level semantics to the visible node name.

### Pros / Cons
- **+** Cleanest structural fix to the primary gap; tiny blast radius (one `indentStep` constant + relocate one `paddingLeft`); 20px is genuinely perceptible (vs sub-JND fill).
- **−** Consumes horizontal width; bound by the **714px grid floor** (`02`) → must be **gated** (cap depth ~2–3, fall back to text-ramp-only past the cap). Deep absolute-depth is still ambiguous (mitigated by the outline code).

### ASCII mockup

```
┌─────────────────────────────────────────────────────────────┐  root frame
│ ⌄ ● 01  GROUND FLOOR                               ₱ 120,400 │  depth0 (0px inset) — ink, medium, UPPERCASE
│ ┌───────────────────────────────────────────────────────┐   │  root's OWN table (full block width)
│ │ 01 ☐ Concrete slab     12/m³  ₱ 8,400 …  ₱ 9,100      │   │
│ └───────────────────────────────────────────────────────┘   │
│ + Add row                                                    │
│                                                               │  ← mt-5 gap
│   ⌄ ● 01.01 Foundation                             ₱ 64,200  │  depth1 — whole block shifted +20px
│   ┌─────────────────────────────────────────────────────┐   │  ← table left edge ALIGNS under its header (Gap B fixed)
│   │ 01 ☐ Rebar mesh        80/kg  ₱ 4,800 …  ₱ 5,300    │   │
│   └─────────────────────────────────────────────────────┘   │
│   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  ← sibling rule, inset to 20px
│   ⌄ ● 01.02 Earthworks                             ₱ 41,000  │  depth1 sibling (same 20px step, same ink level)
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 01 ☐ Excavation        1/lot  ₱ 41,000 … ₱ 41,000   │   │
│   └─────────────────────────────────────────────────────┘   │
│     ⌄ ● 01.02.01 Backfill                          ₱ 12,800  │  depth2 — block shifted +40px total (gated by 714px floor)
│     ┌───────────────────────────────────────────────────┐   │
│     │ 01 ☐ Gravel            6/m³   ₱ 2,100 … ₱ 2,400    │   │
│     └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
Depth ladder: 0=0px · 1=20px · 2=40px · 3=60px (cap when grid would drop below ~714px). Whole block moves; table never floats.
```

**Recommendation: ship Option L's cues with Option AI's whole-section indent grafted in.** See `05`.

---

## Option QT — "Quiet-Tone" (considered, not recommended)

**Thesis:** honour "darker parent / lighter child" *literally* with a bounded 3-stop **header** tone ramp (root `#ededed` → mid `#f5f5f5` → deep white), kept decorative, with the ink+weight ramp doing the load-bearing work.

- **+** Most literal reading of the user's words; ink cue beneath keeps it AA.
- **−** Even the new `#ededed` landmark is only ~1.17:1 vs white (~1.07:1 between mid stops) — perceptually marginal; honest reviewers will read it as near-cosmetic. **Requires a new `--surface-landmark` token** (widening the deliberately-tight palette) and **relitigates the just-shipped flat-ward direction** (reintroduces a per-depth header fill). **Breaks `estimate-sheet-branch-header-ui.test.tsx`** (asserts exact header classes). More risk and brand friction for a marginal cue.

**Verdict:** the tonal instinct is better served by Option L's text ramp. Keep QT documented as the rejected literal interpretation so the next agent doesn't re-propose it.

---

## Rejected options (and why) — do not re-propose without new evidence

| Option | Why rejected |
|--------|--------------|
| **Vertical guide lines / connectors** (Rev 1 Option B, and Option E's lead cue) | No precedent in the product (`tree.tsx` has none); contradicts "precise BOQ, not file explorer"; the user did not ask for it; Rev 1's justification ("align with the left tree's guide lines") was factually false. |
| **Left accent bands on every child** (Rev 1 Option C / E Phase-2) | Reintroduces concentric containment chrome removed by `UX-4/OD-7`. (A *root-only* anchor accent is a possible Phase-2 amplifier, not a Phase-1 cue.) |
| **Per-area row-table background** (Rev 1 Option E Phase-2 2.1) | Same as above; below-JND tone; relitigates the flat-ward direction. |
| **Per-depth background fills / tonal bands** | Below JND; fails WCAG 1.4.1 as a sole cue; relitigates flat-ward direction. |
| **Children-first / card-per-area reorder** (Rev 1 Option F) | Breaks the shipped rows-first model and the user's mental model; far too invasive for a "subtle" brief. |

---

## Comparative recommendation

| Option | User intent | On-brand | Accessible | Feasible | Density | Panel score |
|--------|-------------|----------|------------|----------|---------|-------------|
| **L — Ledger** | ★★★★★ | ★★★★★ | ★★★★ | ★★★★ | ★★★★★ | **88** |
| **AI — Anchored-Indent** | ★★★★ | ★★★★★ | ★★★★★ | ★★★★ | ★★★ | **83** |
| QT — Quiet-Tone | ★★★ | ★★★ | ★★★★ | ★★ | ★★★★ | 62 |
| Rev 1 Option E (guide lines) | ★ | ★ | ★★ | ★★ | ★★★★ | 31 |

**Recommended:** **Option L as the spine, with Option AI's whole-section 20px indent grafted in** to fix Gap B. This delivers the user's two literal asks (tonal-via-text + sibling rules) *and* the primary ownership fix, while staying brand-true and respecting the prior flat-ward direction. Phasing, exact specs, test-impact, and no-go gates are in `05`.
