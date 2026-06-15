# 07 — Supplier Catalogues (Future) & Open Questions

## Part A — How this design stays supplier-ready

The stated future: suppliers publish their own catalogues into the Library so estimators can drop supplier items straight into estimate sheets. Nothing in this plan builds that, but five seams are deliberately left clean:

1. **Tab slot.** The page TabStrip gains `Suppliers` as a third tab at `/workshop/library/suppliers` (route namespace reserved in `02`). No teaser/disabled tab ships before the feature.
2. **The grammar already fits.** A supplier catalogue is "a tree of browsable, priced, draggable items" — exactly the Components tab anatomy: supplier tree left (supplier → catalogue sections), item grid center, item inspector right with `Copy to my library` and `Add to estimate` actions. Zero new layout vocabulary needed.
3. **Data model direction (for the eventual schema design):** supplier catalogue items live in supplier-owned tables (or a shared workspace with read-grants), NOT in the workspace's `cost_library_items`. Estimators either reference them live (price updates flow) or "adopt" them (copy into `cost_library_items` with `supplier_id` + `pricing_source` stamped). The existing inspector fields (pricing_source, pricing_date, confidence) were chosen partly because they make third-party items trustworthy at a glance.
4. **Tab strip + dock symmetry.** When suppliers land, the estimate workspace's right dock grows the same third tab — one more reason the unified page and the dock must keep sharing tree components rather than forking.
5. **Overview expansion.** `/workshop/library` is already the Philip-approved Overview home in v1. When Suppliers arrive, expand that Overview with connected-catalogue recents, health, and adoption tasks instead of migrating URLs or adding a teaser tab.

**Explicitly deferred:** supplier auth/tenancy, catalogue ingestion, price-sync semantics, and marketplace governance. None of it constrains Phases 0–4.

## Part B — Decisions (Philip answered Q1, Q3, Q4 on 2026-06-11)

| # | Question | Decision | Notes |
|---|---|---|---|
| Q1 | Default landing | ✅ **Overview home page in v1** (Philip override) | Spec'd in `03_SCREEN_SPECS.md` §0, mockup `00-library-home.html`, ships as Phase 2.5 |
| Q2 | Templates fully manageable + editable (management hub, "Option B") | ✅ Assumed approved — it is the goal statement itself | Templates audit's scope-approval flag satisfied |
| Q3 | Template-mode differentiation | ✅ **Structural cues only, no tint** (recommended; Philip confirmed) | Fallback (neutral mode bar) only if Phase 3 hallway test fails |
| Q4 | Template-into-template composition | ✅ **Ship in Phase 3.5** (recommended; Philip confirmed) | Cut-line if Phase 3 overruns |
| Q5 | Sidebar shortcut labels (`⌘1–⌘4`) | **Fact-checked 2026-06-11: display labels only — no hotkey listener exists anywhere in src/.** Phase 0 just updates labels; real navigation hotkeys are an optional Phase 4 nicety (small `keydown` hook + `useNavigationRouter()`) | Decide at Phase 4 |
| Q6 | Row-item migration for editable qty/label/cost | ✅ **RESOLVED — no migration needed.** Schema verified 2026-06-11: `estimate_template_row_items` already has `material, description, supplier, unit, quantity, unit_cost, misc_cost, contingency_percentage, link_state` as direct columns | Closed |

Direction is approved; `00_INDEX.md` status is READY FOR IMPLEMENTATION. No open item blocks Phase 0. Q5 is optional only: real navigation hotkeys remain a Phase 4 nicety, not a blocker for unification.
