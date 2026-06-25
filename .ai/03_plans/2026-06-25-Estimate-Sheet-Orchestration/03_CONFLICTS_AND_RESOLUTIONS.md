---
title: Conflicts and Resolutions
type: docs
date: 2026-06-25
---

# Conflicts and Resolutions

## Selected Resolutions

| Conflict | Source Tension | Resolution | Rejected Alternative |
|---|---|---|---|
| Canonical implementation docs differ from numbered historical plans. | Center `16` vs `IMPLEMENTATION_PLAN.md`; right `18` vs canonical plan; tree `10` vs canonical plan. | Treat each folder's top-level `IMPLEMENTATION_PLAN.md` as canonical where present; use numbered docs as supporting history. | Mixing phase numbers across documents without noting supersession. |
| DB/RPC work appears in center and tree plans at the same time. | Center adds row move/bulk-delete RPCs; tree changes delete return and sort-order scheme. | Assign one data/RPC/migration owner for all estimate DB changes; sequence preflight, dump, migration, types, grants/RLS, proof. | Let center and tree agents create migrations independently. |
| Right-sidebar honesty is easier than center DB work, but center integrity is launch-critical. | Planner suggests early right-sidebar flag bundle; data lane warns center critical paths are highest risk. | Run MOP-1 right-sidebar honesty early after MOP-0, but do not claim overall estimate-workspace launch readiness until MOP-2 center integrity and MOP-3 tree security gates pass. | Delay disjoint right-sidebar fixes unnecessarily, or ship right-sidebar success as if it proves center/source insertion safety. |
| Right-sidebar source labels imply live data while center insert is snapshot/copy. | Right `F-11`; center source insert returns copied tree. | Adopt "snapshot copy" language everywhere and reject live/read-through claims. | Keep "live source" copy with hidden caveats. |
| Project-source insert safety spans right UI and center reconciliation. | Right can trigger insert; center applies returned tree. | Center revision gate must precede or accompany right sidebar insertion proof. | Allow right E2E to pass without center race fix. |
| Drag/custom events cross all three surfaces. | Center consumes `archestimator:add-library-item`; tree dispatches template/source events; right emits drag payloads. | One shared event/payload contract with guarded parser, permission checks, and rejection semantics. | Each surface defines its own event detail shape. |
| Read-only UX differs by surface. | Center prefers disabled controls; right can browse/search/preview; tree must hide/disable CRUD. | One permission matrix: browsing/search/preview allowed, mutating controls disabled-not-hidden where useful, drag/keyboard/custom mutation blocked. | Rely on server errors after visible mutation affordances. |
| Responsive strategy differs. | Right plan accepts no below-1024 access; `DESIGN.md` says tablet drawers/sheets with grid primary. | Desktop-first beta with explicit below-1024 fallback; drawers are deferred unless scoped with focus-trap proof. | Silently hide both sidebars below 1024px. |
| Right dock width conflicts with grid dominance. | Code/spec allow 560px; design says right dock 360-420px when open. | Default near design range; wider inspection must be temporary, resizable, or overlay. | Permanently reserve 560px in normal workspace. |
| Tree keyboard DnD touches shared `ui/tree.tsx` used by right sidebar. | Tree P5 needs primitive changes; right LibraryTree/TemplatesTree share it. | Shared tree primitive changes are single-owner with regression tests for tree and right sidebar. | Tree agent edits primitive without library/template regression pass. |
| Table semantics and virtualization are in tension. | Center uses table-like dense grid with virtualization/absolute layout. | Test semantics explicitly with DOM/axe and screen-reader release smoke; avoid claiming native table behavior until proven. | Treat native tags alone as a11y proof. |
| Telemetry paths overlap. | Center `M-0T`; right `Task 1.0`; existing `library-telemetry`. | One sanitized telemetry schema/sink, shared event names, redaction review, dashboard/alert owner. | Add separate console logs or duplicate event tables. |
| Telemetry sink is assumed but not proven. | `recordLibraryEvent` can fall back when no sink is installed; `library_telemetry_events` was not found in migrations during the data lane. | Treat telemetry storage/sink proof as MOP-0; UI lanes may emit only after the sink contract is real or explicitly downgraded to manual rollout. | Rely on metrics that silently drop or console-warn. |
| Local preferences are acceptable in some places but not others. | Right local favorites/recents/widths vs local-only CRUD. | Browser-local preferences acceptable when documented/resettable; CRUD-like persistent actions must persist or be removed. | Persist everything now or keep local-only CRUD. |
| Broad validation is noisy. | Current-state notes full validation can be red/hang-prone; source plans request broad checks. | Use targeted RED->GREEN as merge blockers; run broad validation as final/interpretable signal with baseline classification. | Block every slice on unrelated full-suite reds. |

## Single-Owner Hotspots

| Hotspot | Why Single Owner |
|---|---|
| `supabase/migrations/*`, generated Supabase types, RLS/grants | Schema/RPC changes must be ordered and proven together. |
| `src/lib/estimates/actions.ts` | Center row RPC wrappers and tree node mutations share one server-action file. |
| `src/components/workshop/EstimateSheetContent.tsx` | Center plan owns high-risk row/project-source changes; right/tree events flow into it. |
| `src/components/workshop/EstimateSheetTree.tsx` | Tree state, route, event dispatch, and selection are tightly coupled. |
| `src/components/workshop/component-library/index.tsx` | Right persistence, search, events, and modal handoff are tightly coupled. |
| `src/components/ui/tree.tsx` | Shared primitive affects tree sidebar and right-sidebar trees. |
| `src/components/workshop/ResizableSidePanel.tsx` | Both sidebars share responsive/collapse/width behavior. |
| Telemetry helpers/tables | Event schema and PII redaction must be consistent. |

## Coordination Barriers

- No UI workstream starts mutating shared surfaces before MOP-0 contracts are signed off.
- No client claim that depends on DB atomicity lands before MOP-2 proof.
- No browser proof is accepted as logic proof when a unit/DOM/SQL test should exist.
- No public launch claim is made without provider/runtime proof for the affected surface.
