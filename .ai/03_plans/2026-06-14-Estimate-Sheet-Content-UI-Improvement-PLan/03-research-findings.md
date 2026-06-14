# 03 — Research Findings (Rev 2)

This revision replaces Rev 1's file-tree-leaning research with a grounded study of **subtle, accessible** hierarchy encoding in dense professional document UIs, plus the **just-noticeable-difference** and **WCAG** math that constrains the user's "tonal" instinct. Findings converge strongly across three independent research streams.

## Research method

- **Tonal subtlety + accessibility:** JND in the near-white luminance range; WCAG 1.4.1 (use of colour), 1.4.11 (non-text contrast), 1.3.1 (info & relationships), 1.4.3/1.4.5 (text contrast); how MS Project, Primavera P6, Smartsheet, Excel Outline, dhtmlxGantt, Linear, and Notion encode depth.
- **Sibling dividers:** Material Design, iOS HIG inset-grouped lists, financial-model formatting conventions, CSS separator mechanics.
- **BOQ / estimating precedent:** CSI MasterFormat outline numbering, WBS roll-up structure, NetSuite/Morningstar ledger ruling, Business Central indented-list guidance, BOQ SaaS (VOLUM3).

## The decisive constraint: tone is not a usable hierarchy channel here

- A neutral background step in the near-white range (`#f5f5f5 → #fff`) is **~1.04:1** — far below the **3:1** WCAG 1.4.11 floor for structural/non-text boundaries, and below the practical just-noticeable difference. Worse, luminance sensitivity is **non-linear and lowest near white**, so the already-tiny step is even harder to see than the ratio implies. [WebAIM contrast; W3C 1.4.11; JND survey]
- WCAG **1.4.1 (Level A)** forbids conveying structure by colour/tone **alone**. Any tonal cue must be backed by ≥1 non-colour cue (weight, indent, spacing, rule, semantics). **1.3.1 (Level A)** further requires the visual relationship to be programmatically determinable, using supported semantics such as heading levels, `aria-expanded`, or rowgroup structure. [W3C 1.4.1; 1.3.1]
- Text contrast floor at 10px is **4.5:1**. Shipped tokens: ink `#3D3D3D` ≈ **10.4:1** (pass), secondary `#5D5D5D` ≈ **6.5:1** (pass), **tertiary `#7F7F7F` ≈ 4.0:1 (FAIL)**. → Load-bearing names must bottom out at `secondary`; `tertiary` is decorative only. [WebAIM]

**Implication:** the user's "darker parent / lighter child" instinct is right in spirit but must move off the background and onto the **text-ink ramp**, which is the one channel with real, AA-grade range.

## What professional tools actually do (convergent prior art)

| Tool / source | Primary depth cue | Background fill? | Connectors / guide lines? |
|---------------|-------------------|------------------|----------------------------|
| MS Project | **Bold** summary rows + indent | gray summary bar (secondary) | No |
| Smartsheet | **Bold** parent rows + indent (primary column only) | No | No |
| dhtmlxGantt | **Bold** + `#fafafa` (~1.02:1) | yes, but **alongside** bold, never sole | No |
| Excel Outline | Bold/italic level styles + indent | No | No |
| Business Central | Explicitly: indent **is insufficient**; bold via style expression is the prescribed complement | No | No |
| Linear (2024 redesign) | **Increased text contrast** (darker ink), tighter alignment, **less** chrome | No | No |
| Notion tables | Indent + disclosure triangle only | No | No |
| Financial models / BOQ print | **Outline numbering** + ruled section breaks + heavier parent top-rule | No (print norm) | No |

Two takeaways: **(1)** text-weight/contrast is the universal *primary* cue; background fill is at most a secondary, never-sole decoration. **Translate this carefully for Archestimator:** where external tools use "bold", this product must use the allowed app weights only (`500` medium vs `400` regular), not `600+` semibold/bold. **(2)** Professional document/ledger tools do **not** use file-tree connectors — those belong to file explorers. Linear and Notion (the closest sophistication peers) moved toward *less* chrome, not more.

## Hierarchy-encoding techniques — re-evaluated for Archestimator

### 1. Text-ink + weight ramp (PRIMARY — adopt)
Root name in `ink #3D3D3D` + allowed medium weight (the dark landmark); descendants step to `secondary #5D5D5D` + regular weight. Universal across the tools above. Adds zero layout cost, works at 10px, and is the user's tonal instinct on the channel that can actually carry it. **Cap at `secondary` (tertiary fails AA).** Past depth 1, weight + indent + outline code carry the remaining depth.

### 2. Structural-label register on the root (adopt, root-only)
`uppercase` + tracking on the **depth-0** name marks "this is a top-level section heading" vs in-content child names, at the same font size and zero vertical cost. Established in dense UIs. **Use `tracking-normal`** to match the verified house idiom (`NewEstimateForm`, `ProjectEstimatesTable`, `ProjectDetailsModal` all use `uppercase tracking-normal`); avoid wide tracking.

### 3. Outline numbering (`01.02.03`) as the AA-safe backbone (elevate)
The node code already encodes exact depth and position (CSI MasterFormat / WBS convention). It is the cue that lets us keep colour subtle without losing structure for low-vision users (satisfies 1.4.1). Promote `8px → 9px tabular-nums` (heavy 9px-tabular precedent in `row-table`, `cells`, `bulk-action-toolbar`); optionally weight-step it by depth.

### 4. Sibling rule (adopt — the user's literal ask)
A **1px** horizontal rule between same-depth siblings. Grammar from Material/iOS/financial models:
- **1px only.** ≥2px is reserved for top-level/summary breaks.
- **Inset = "sibling within group"; full-bleed = "section break."** Inset depth>0 rules to the content column.
- **No rule above the first child** (universal idiom — prevents the rule "closing" the parent header from above).
- **The gap does more work than the line.** Place the rule at the *top* of the existing `groupGap` so it adds zero height; gap-size + rule-inset read as one combined cue.
- **Colour:** the existing `--hairline #f2f2f2` is invisible (~1.05:1). Use ~`#d9d9d9` (≈ `rgba(0,0,0,0.12)`), perceptible but not a heavy grid. **Add a `--divider-sibling` token** rather than overloading `--hairline` or shipping a raw hex into a workshop component.
- Decorative rules conveying no component state are reasonably exempt from 1.4.11's 3:1; document the exemption, and ensure content (names/codes/totals) meets AA independently (it does).

### 5. Indentation (keep, tune to 20px, and fix ownership)
16px at 10px font is at the scan-ability floor; **20px** is the ergonomic minimum (VS Code/NetBeans research) and matches the Templates panel's own adopted step. The real defect is **ownership**: the header indents but its row table does not. Industry fix is to make the table share the header's left edge (indent the whole block) or anchor the header to the table with a left accent — **not** a connector. Depth 0–2 is the operative BOQ range; depth 3+ can be visually minimal.

### 6. Spacing rhythm (keep)
The existing `mt-5 / mt-3 / mt-2` gradient spans the "section vs sibling" range well and is the most accessible depth cue. Keep verbatim (also keeps the spacing test green).

### Rejected / deferred techniques
- **Vertical guide lines / tree connectors — REJECT.** No precedent in the product (the left tree has none), contradicts the "precise BOQ, not file explorer" brand, and is the one cue the user did not ask for. (Rev 1's central justification — "align with the left tree's guide lines" — was factually false.)
- **Per-depth background fills / tonal bands — REJECT.** Below JND, inaccessible as a sole cue, and relitigates the shipped flat-ward direction (`UX-4 / OD-7`).
- **Left accent bands on every child / per-area row-table backgrounds — REJECT** as Phase-1 (same containment chrome previously removed). A *root-only* anchor accent is a possible Phase-2 amplifier (`05`).
- **Hover-lineage highlight, sticky ancestor stack — DEFER** to a later iteration.

## Corrected pattern matrix

| Technique | Parent/child | Sibling | Row ownership | Space cost | A11y | Fit for Archestimator |
|-----------|--------------|---------|---------------|------------|------|------------------------|
| Text-ink + weight ramp | High | Low | — | None | AA (cap at secondary) | **Primary** |
| Structural-label register (root) | Med | — | — | None | AA | **Add (root only)** |
| Outline numbering (elevated) | High | Low | — | None | **AA-safe backbone** | **Elevate** |
| Sibling rule (inset, 1px, ~#d9d9d9) | Low | **High** | — | None | Decorative-exempt | **Add** |
| Block indent → 20px (table aligned) | Med | — | **High** | Width | Mirror with supported heading levels | **Add (gated)** |
| Spacing rhythm | Med | Med | — | Vertical | Best a11y cue | **Keep** |
| Vertical guide lines | High | Low | Low | Low | n/a | **Reject** |
| Background tonal bands | — | — | — | None | **Fails 1.4.1 alone** | **Reject** |

## Key principles distilled

1. **Weight before tone, structure before chrome.** Carry hierarchy on text ink/weight + indent + numbering; keep surfaces flat.
2. **Never colour alone.** Every visual cue is mirrored by the outline code and the accessibility tree (1.4.1 / 1.3.1).
3. **The row table is the work surface.** Don't shrink it below ~714px; gate indentation.
4. **Ledger, not file explorer.** Ruled section breaks + outline numbers, not connectors and cards. This *is* the brand.
5. **Make it reversible.** Flag each cue so product can A/B and the change can roll back.

## References

- WebAIM, Contrast and Color Accessibility — https://webaim.org/articles/contrast/
- W3C WCAG, Use of Color (1.4.1) — https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- W3C WCAG, Non-text Contrast (1.4.11) — https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html
- W3C WCAG, Info and Relationships (1.3.1) — https://blog.equally.ai/developer-guide/info-and-relationships/
- Just-noticeable-difference (luminance) survey — https://www.sciencedirect.com/topics/engineering/just-noticeable-difference
- MS Project summary/subtasks — https://support.microsoft.com/en-us/office/create-and-work-with-subtasks-and-summary-tasks-in-project-desktop
- Smartsheet hierarchy/indent — https://help.smartsheet.com/articles/504734-hierarchy-indenting-outdenting-rows
- dhtmlxGantt CSS overview — https://docs.dhtmlx.com/gantt/guides/css-overview/
- Business Central indented hierarchy lists — https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-indented-hierarchy-lists
- Linear 2024 redesign — https://linear.app/now/how-we-redesigned-the-linear-ui
- Notion tables / sub-items — https://www.notion.com/help/tables
- Material Design dividers — https://m1.material.io/components/dividers.html
- iOS inset-grouped separators — https://dev.to/sarunw/inset-grouped-list-in-swiftui-37b0
- Financial-model formatting (ruled rows / parent borders) — https://trainingthestreet.com/fmaamoc-article-2-formatting-a-financial-model/
- CSI MasterFormat outline numbering — https://archdesk.com/blog/2026-guide-csi-masterformat
- NetSuite financial report ruling — https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N2119303.html
- US Web Design System typography (uppercase + tracking) — https://designsystem.digital.gov/components/typography/
