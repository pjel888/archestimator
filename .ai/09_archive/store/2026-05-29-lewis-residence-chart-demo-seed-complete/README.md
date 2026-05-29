# Lewis Residence Chart Demo Seed

Status: implemented 2026-05-23

Seed pack: `lewis-chart-demo-v1`

## Scope

Populate the linked Supabase project with enough Lewis Residence component-library and estimate-row data to make `/workshop/projects/22222222-2222-4222-8222-222222222222/charts` visibly useful for comparing estimate sheets `ES-001` and `ES-002`.

## Seed Contract

- All new demo rows/items are tagged with `metadata.seed_pack = "lewis-chart-demo-v1"`.
- Reruns should replace only rows/items with that seed pack.
- Existing non-seeded estimate rows, suppliers, categories, and component-library rows must remain untouched.
- No thumbnails are required for this seed.

## Result

- Seeded component-library items: 83
- Seeded component-library items with active default price options: 83
- `ES-001` seeded estimate rows: 42
- `ES-001` seeded demo total: PHP 982,800
- `ES-002` seeded estimate rows: 41
- `ES-002` seeded demo total: PHP 1,923,499
- Seeded room coverage per sheet: 16 rooms
- Seeded category coverage per sheet: 24 categories
- Seeded supplier coverage per sheet: 10 suppliers

## Comparison Design

`ES-001` is a practical/value option with Mandaue Foam, Wilcon value suppliers, HCG/Pozzi, standard casework, and standard appliance allowances.

`ES-002` is an upgrade/premium option with IKEA Philippines, Our Home / Dimensione, American Standard, TOTO, Grohe, Franke, upgraded casework, and higher appliance allowances.

The sheets intentionally use analogous room programs with different suppliers, brands, and unit costs so the charts can show meaningful deltas by Space, Category, and Supplier.

## Verification

- SQL counts confirmed the seeded row/item totals above.
- Browser smoke confirmed the charts route returns HTTP 200 and renders both sheets with totals `PHP 1,052,729` and `PHP 1,993,428`.
- Space grouping smoke confirmed matching room names align across duplicated estimate trees, for example Show Kitchen now compares `PHP 300,900` vs `PHP 518,900` in one row.
- Category and Supplier grouping smoke confirmed Furniture/Casework and Mandaue Foam/IKEA Philippines buckets render.
- Screenshots:
  - `.ai/03_plans/lewis-residence-chart-demo-seed/charts-smoke-after-space-fix.png`
  - `.ai/03_plans/lewis-residence-chart-demo-seed/charts-supplier-smoke.png`
