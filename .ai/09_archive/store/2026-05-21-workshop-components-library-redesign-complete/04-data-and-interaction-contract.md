# Data And Interaction Contract

**Date:** 2026-05-21
**Route:** `/workshop/components`

## Component Library Data Model

The center sheet displays custom user components. It should not display estimate row items directly, even if it reuses visual patterns from estimate rows.

Likely component row fields:

- component name;
- supplier/source;
- discipline;
- subdiscipline;
- designation/spec note;
- unit;
- item cost;
- supplementary/default allowance;
- labor/default allowance;
- total/default rate;
- pricing health;
- last checked or source date.

## Classification Axes

The durable model should not collapse everything into one `category` field.

| Axis | Purpose | Source influence |
| --- | --- | --- |
| Discipline | Who owns/specifies the component | OmniClass discipline practice, drawing/document practice |
| Subdiscipline | App-owned practical grouping | Archestimator-controlled, standards-mapped where possible |
| Work result | Specification/cost-code placement | MasterFormat / OmniClass Work Results |
| Element/system | Building part/system | UniFormat / OmniClass Elements / Uniclass EF or Ss |
| Product | Purchased/manufactured component | OmniClass Products / Uniclass Pr |
| Material | Base material family | OmniClass Materials / Uniclass Ma |
| Space/use | Optional contextual filter | OmniClass spaces / Uniclass SL |
| Item kind | Estimating behavior | material, labor, equipment, subcontract, assembly, allowance, service |

## Required Canonical Paths

| Search/input concept | Canonical path | Required aliases | Notes |
| --- | --- | --- | --- |
| Plumbing fixture, sanitary fixture, faucet | `P / P-FIX` | plumbing fixture, sanitary, fixture-plumbing | Keep distinct from lighting and FFE. |
| Lighting fixture, luminaire, emergency light | `LGT / LGT-FIX` | lighting fixture, luminaire, fixture-lighting | `E` can be an alias/import context, not the canonical luminaire path. |
| Furniture, loose furniture, furnishing | `FFE / FFE-FUR` | furniture, furnishing, loose furniture | Do not collapse into architectural interiors. |
| Structural concrete, rebar, formwork | `STR / STR-CONC` | concrete, rebar, structural concrete | Default concrete to structural unless site/finish context is explicit. |
| Site concrete, paving, curb | `CIV / CIV-PAVE` | site concrete, paving, curb, sidewalk | Requires site/civil context. |
| Architectural specialty, accessory, fixed specialty | `ARC / ARC-SPEC` | specialty, accessory, fixture-architectural | Use `INT` only when context is explicitly interior fit-out. |

## Tree Tabs And Selection

Categories tab:

```txt
Discipline -> Subdiscipline -> Category/example group
```

Suppliers tab:

```txt
Supplier -> Discipline/category coverage
```

Selection behavior:

- selecting a node scopes the center sheet;
- selection does not navigate away from `/workshop/components`;
- selection does not use estimate-node Zustand state;
- selection can be route-local state in the first implementation.

## Search Behavior

Left tree search filters:

- tree node labels;
- aliases;
- discipline codes;
- category examples;
- supplier names;
- standards mappings if present.

Center sheet search filters:

- component name;
- supplier/source;
- discipline/subdiscipline;
- designation/spec note;
- unit;
- pricing health/source text.

Keyboard shortcuts:

- Preserve estimate-workspace search muscle memory where possible.
- Do not conflict with global command palette behavior unless that behavior is intentionally adapted for components.

## Interaction Boundaries

Allowed in first workspace-mirror slice:

- select tree tab;
- select tree node;
- search tree;
- search sheet;
- browse custom component rows;
- use compact sheet toolbar actions if they are non-destructive and implemented honestly.

Deferred unless separately approved:

- create/edit/delete custom components;
- supplier CRUD;
- standards import;
- CSV/JSON import/export;
- schema/Supabase persistence;
- copying a custom component into an estimate;
- drag/drop reorganization.

Forbidden in this route:

- estimate route navigation on tree selection;
- estimate node add/rename/delete/reorder;
- tree drag/drop;
- root drop zones;
- estimate row insertion targeting selected Area Nodes;
- right Component Library sidebar.

## Source Notes

Primary standards references checked on 2026-05-21:

- ISO 12006-2:2015 official page: https://www.iso.org/standard/61753.html
- CSI standards overview: https://www.csiresources.org/standards/overview
- CSI OmniClass overview: https://www.csiresources.org/standards/omniclass/standards-omniclass-about
- WBDG OmniClass summary: https://www.wbdg.org/resources/omniclass
- WBDG MasterFormat division reference: https://www.wbdg.org/tools/specsintact/Help/SIGeneral/CSIMasterFormat.htm
- NBS Uniclass overview: https://www.thenbs.com/our-tools/uniclass
- NBS Uniclass downloads: https://uniclass.thenbs.com/download

Do not copy paid or license-restricted standards table content into the repo.
