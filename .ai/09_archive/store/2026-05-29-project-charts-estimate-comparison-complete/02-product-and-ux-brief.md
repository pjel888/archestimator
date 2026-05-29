# Product And UX Brief

## Product Intent

The Charts page should help a contractor answer:

- Which estimate sheet is more expensive?
- Where is the cost concentrated?
- Did one option move money between spaces, categories, or suppliers?
- Which suppliers or component categories drive the difference?

This is not a generic analytics dashboard. It is a compact compare-and-explain tool inside one project.

## Primary Workflow

1. User opens a project.
2. User clicks `Charts` in the project mini-sidebar.
3. The page defaults to the first two estimate sheets if at least two exist.
4. User can choose Sheet A and Sheet B from compact selects.
5. User chooses grouping mode:
   - Space
   - Component Category
   - Supplier
6. Page renders two donut charts with matching colors and legends.
7. User scans totals, top buckets, and deltas.

## Layout Recommendation

Use the existing full-height project shell. Inside the content area:

```txt
+---------------------------------------------------------------+
| selector row: Sheet A | Sheet B | View By: Space/Category/... |
+-------------------------------+-------------------------------+
| Donut chart A                 | Donut chart B                 |
| total + sheet metadata        | total + sheet metadata        |
+-------------------------------+-------------------------------+
| shared comparison table / delta list                          |
+---------------------------------------------------------------+
```

Keep the page work-focused and compact:

- no hero area;
- no explanatory marketing copy;
- no decorative cards inside cards;
- no oversized typography;
- no chart occupying the whole page without numeric detail.

Page anatomy inside the locked project shell:

- root section: `h-full min-h-0 overflow-hidden`;
- selector row: `shrink-0`, compact, wrapping before overflow;
- content body: one intentional `min-h-0 flex-1 overflow-auto` region, unless implementation deliberately splits chart/table scrolling;
- Charts totals and deltas live in the page body, not in the shared project header.

## Selector Row

Controls:

- `Sheet A` select
- `Sheet B` select
- `View By` select or segmented control

Rules:

- Sheet A and Sheet B should not be the same.
- If the user selects the same sheet, switch the other side to the nearest available different sheet.
- If only one estimate exists, render an empty state with a clear action path to Estimates.
- If no estimates exist, render a no-estimates empty state.
- Each `ControlSelect` must have a visible micro-label or an `aria-label`.
- Sheet A and Sheet B controls need stable min widths and must wrap before they overflow.

## Donut Panels

Each chart panel should show:

- estimate sheet code and name;
- grand total;
- donut chart;
- top bucket list with amount and percentage;
- fallback label for unmapped rows, such as `Uncategorized` or `No supplier`.

Visual constraints:

- chart labels must not overlap or exceed compact app text scale;
- prefer center total and compact legend list over labels around every slice;
- segment colors must be stable across both charts in the same mode;
- very small segments should roll into `Other` after a threshold or after the top N buckets.

Recommended default:

- show top 8 buckets plus `Other`;
- order buckets by shared union total across both estimates, not separately per chart;
- use the same order and colors on both charts.

## Comparison List

Below the charts, add a compact delta table/list:

Columns:

- bucket label;
- Sheet A amount;
- Sheet B amount;
- delta;
- delta percent;
- share change.

The delta list is essential because donut charts are poor for precise comparison. It should be treated as part of the feature, not optional polish.

The comparison list should expose every bucket amount, share, and delta in text. If the donut rolls low-rank buckets into `Other`, the text comparison must still show all buckets by default or provide an explicit expansion rule for `Other`.

## Grouping Modes

### Space

Use estimate tree ancestry. The first implementation should aggregate to the top-level Group Node by default because this maps to what users see in the left rail (`General Requirements`, `Site Works`, `Lot`, etc.) and keeps chart segments readable.

Future extension:

- let users choose tree depth: top level, second level, Area.

Do not implement depth switching in v1.

### Component Category

Use `category_node_id` and the persisted component taxonomy. For v1, aggregate to the reporting category level, not the top organizer level, because organizer rows like `Architecture` and `Systems` are not reporting categories.

Fallback order:

1. matched category node label;
2. source snapshot category label;
3. row category string;
4. `Uncategorized`.

### Supplier

Use `supplier_id` and `component_suppliers.name` first.

Fallback order:

1. matched supplier row label;
2. row supplier string;
3. source snapshot supplier label;
4. `No supplier`.

## Empty States

Use `EmptyState`.

Cases:

- no project: `notFound()`, matching existing route behavior.
- no estimates: "No estimate sheets yet".
- one estimate: "Create another estimate sheet to compare".
- selected estimates have no rows: "No row costs to chart".
- selected mode produces only unmapped rows: still render the chart using fallback bucket labels.

## Accessibility

- Controls must have explicit labels.
- Charts need text equivalents through the comparison list.
- Color cannot be the only signal for deltas.
- Donut segments should be keyboard-neutral unless chart library accessibility is strong; the table/list is the accessible detail surface.

## Non-Goals For V1 UX

- no export from charts;
- no saved chart screenshots;
- no per-segment drilldown into row detail;
- no cross-project comparison;
- no three-or-more-sheet comparison;
- no alternate chart types unless explicitly requested.
