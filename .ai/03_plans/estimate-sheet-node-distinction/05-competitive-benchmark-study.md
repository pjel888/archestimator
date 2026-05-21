# 05 — Competitive Benchmark Study

**Date:** 2026-05-21  
**Method:** Pattern analysis of established products with comparable hierarchy + data-table surfaces  
**Goal:** Identify proven (and disproven) patterns for distinguishing container nodes from leaf/data nodes in dense interfaces

---

## 1. Benchmark selection criteria

We evaluated products that share at least two of these traits with Archestimator:
1. Dense financial/numeric data tables
2. Hierarchical tree/outline nested inside a workspace
3. Container nodes (folders/groups/sections) that hold other containers or leaf items
4. Leaf nodes that own data rows/cells
5. Desktop-first, compact UI (not mobile-first)

Selected products:
- **Microsoft Excel** — outline/grouping rows (ubiquitous reference for grouped data)
- **OmniOutliner** — pure outliner with level styles
- **Airtable** — grouped records in a database-table hybrid
- **Notion** — databases inside toggle/list hierarchies
- **Procore / Buildertrend** — construction estimating UIs

---

## 2. Microsoft Excel — Outline / Grouped Rows

### Pattern observed
- Excel uses a **gray outline bar** on the left gutter for grouped rows.
- Summary/subtotal rows (the "group header") sit **at the same visual level** as data rows but often use:
  - Bold text
  - Slightly larger font (or same size, bold)
  - Optional background color (user-defined, often light gray or yellow)
  - A **plus/minus control** in the gutter
- Data rows inside the group are visually **identical** to ungrouped rows.
- Collapsing a group hides the detail rows; only the summary row remains.

### Key insight
Excel does **not** give group headers a dramatically different background or border by default. It relies on:
1. **Bold text weight** on the summary row
2. **Indentation** of child rows
3. **The gutter control** (plus/minus) as the primary structural cue
4. **Optional** user-applied background color

### Verdict for Archestimator
- ✅ Bold text weight on container nodes is proven and subtle.
- ❌ Excel's default lack of background distinction works because the grouping is temporary and user-defined; Archestimator's group/area distinction is permanent and structural. Excel's pattern alone would be too weak.
- ⚠️ Excel's "summary row at bottom" pattern does not map well to our model (groups don't hold rows; areas do).

---

## 3. OmniOutliner — Level Styles

### Pattern observed
- OmniOutliner applies **level-based styles**: Level 1, Level 2, Level 3, etc.
- Each level can have its own font size, weight, color, and background.
- By default:
  - **Level 1 (top section)**: Larger, bolder, sometimes with a subtle background band.
  - **Level 2+ (subsections)**: Smaller, lighter, indented.
  - **Leaf rows**: Same as their parent level unless the user customizes.
- Rows with children show a **disclosure triangle**; leaf rows show a **bullet or checkbox**.
- The distinction is **hierarchical depth**, not semantic role (container vs leaf).

### Key insight
OmniOutliner conflates "depth" with "importance." A Level 3 row with children looks structurally similar to a Level 3 leaf row. The icon swap (disclosure triangle vs bullet) is the only semantic cue.

### Verdict for Archestimator
- ✅ Indentation + icon swap is a baseline we already have.
- ❌ Level-style depth differentiation does not solve our problem — a group at depth 3 and an area at depth 3 would still look identical if we only use level styles.
- ⚠️ The disclosure-triangle vs bullet pattern is analogous to our FolderSimple vs Cube, but OmniOutliner adds **bullets/checkboxes for leaves**, making the leaf state more visible. Our Cube icon is less visually assertive than a bullet.

---

## 4. Airtable — Grouped Records

### Pattern observed
- Airtable's "Group by" view creates **group headers** above blocks of records.
- Group headers use:
  - **Full-width background band** (often a light tint of the group color, or gray)
  - **Bold group title** + count + summary field
  - **Chevron** to collapse/expand the group
- Records below the header are standard table rows with white backgrounds.
- Groups cannot be nested (Airtable groups are flat); records cannot contain sub-records.

### Key insight
Airtable's group headers are **visually heavy** because they partition the table into sections. They use a full-width background band that is clearly distinct from the white row backgrounds.

### Verdict for Archestimator
- ✅ Background-band differentiation between group headers and data rows is a strong, proven pattern.
- ⚠️ Airtable groups are flat and non-nestable. Our groups nest recursively, so we must ensure the background band does not become visually noisy at depth 3+.
- ✅ The "group header = band, data rows = white" mental model maps directly to our "group = container, area = work surface with row table" model.

---

## 5. Notion — Databases inside Toggles

### Pattern observed
- Notion uses **toggle blocks** as collapsible containers.
- A toggle has:
  - A **caret icon** on the left
  - **Bold text** for the toggle title
  - **No background difference** by default (just a hover state)
- Inside a toggle, content can be anything: text, lists, or an inline database.
- Inline databases have their own header row (gray background) and data rows (white/alternating).

### Key insight
Notion relies almost entirely on **interaction model** (caret + bold) rather than background color. The inline database inside a toggle provides its own visual identity (column headers, grid lines).

### Verdict for Archestimator
- ❌ Notion's toggle pattern is too subtle for our density. Our users are doing cost estimation, not note-taking; they need faster scannability.
- ✅ The principle of "container = minimal styling, content = self-styled" is interesting: our row table already has strong styling, so the area header could be minimal (white) while the group header carries more styling.

---

## 6. Procore / Buildertrend — Construction Estimating

### Pattern observed (from UI reviews and screenshots)
- **Procore**: Uses a **phase/division breakdown** structure. Division headers (e.g., "01 - General Requirements") use:
  - Bold, uppercase text
  - A **light gray background band** spanning the full width
  - Sometimes a **left colored accent bar** (color-coded by division)
  - Line items below use white background with subtle borders
- **Buildertrend**: Uses a simpler list. Category headers use:
  - Bold text
  - Optional colored left border
  - White background for line items

### Key insight
Construction estimating software almost universally uses:
1. **Background banding** for category/division headers
2. **Bold text** for header names
3. **Left accent borders** (sometimes color-coded by trade/phase)
4. **White/plain backgrounds** for line items

This is domain-validated: estimators expect container headers to look like "section breaks" above their line items.

### Verdict for Archestimator
- ✅ Background banding + bold headers for groups is domain-validated in construction software.
- ⚠️ Color-coded left borders (by phase/trade) are overkill for our two-kind system and would violate our monochrome-first rule.
- ✅ The pattern "group header = band, area row table = white grid" is exactly what Procore/Buildertrend do at the division/line-item boundary.

---

## 7. Synthesis — What works across all benchmarks

| Pattern | Excel | OmniOutliner | Airtable | Notion | Procore/BT | Archestimator fit |
|---------|-------|--------------|----------|--------|------------|-------------------|
| Bold text on container | ✅ | ✅ | ✅ | ✅ | ✅ | **Strong fit** |
| Background band on container | ⚠️ (optional) | ⚠️ (level-based) | ✅ | ❌ | ✅ | **Strong fit** |
| White/plain surface for data | ✅ | ✅ | ✅ | ✅ | ✅ | **Strong fit** |
| Icon swap only | ❌ | ⚠️ | N/A | ❌ | ❌ | **Insufficient alone** |
| Left accent border | ❌ | ❌ | ❌ | ❌ | ⚠️ (colored) | **Moderate fit** (subtle gray) |
| Indentation as primary cue | ✅ | ✅ | N/A | ⚠️ | ⚠️ | **Necessary but not sufficient** |

### Critical finding
**No product in this benchmark relies solely on icon swap + indentation.** Every successful dense hierarchy uses at least two of: background banding, bold text, or border treatment.

### The pattern that emerges
> **Container headers = banded background + bold text + full border**  
> **Leaf/data surfaces = white/minimal background + normal text + divider only**

This is the dominant pattern in Airtable (grouped records), Procore (division headers), and Excel (when users apply background color to subtotals). It is also compatible with our compact density constraints.

---

## 8. What we should avoid (anti-patterns observed)

1. **Color-coding by node kind** (e.g., green for groups, blue for areas) — seen in some over-designed SaaS dashboards. Violates our monochrome-first rule and creates accessibility risks.
2. ** drastically different heights** — some outliners make top-level headers 48px+ and leaf rows 24px. This breaks our compact density and makes scrolling unpredictable.
3. **Custom SVG illustrations per kind** — toy-like, violates architectural precision.
4. **Left-border rainbow** — Procore uses color-coded trade divisions, but we only have two kinds; rainbow borders would be over-engineered.
