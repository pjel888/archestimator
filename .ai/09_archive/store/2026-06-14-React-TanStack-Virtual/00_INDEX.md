# React TanStack Virtual Plan - 2026-06-14

Status: planning only. No dependency, source code, migration, provider setting, or runtime configuration has been changed by this pack.

## Executive verdict

Use `@tanstack/react-virtual`, but only through measured, feature-flagged rollout. It can make the Estimate Sheet Page feel dramatically faster on very large estimates because it keeps mounted DOM proportional to the viewport instead of the dataset. It will not make the app "a million times faster", and it can make medium-sized lists worse if it adds measurement, focus, and scroll work where DOM count is not the bottleneck.

The plan is to treat virtualization as two separate implementation tracks:

1. Shared tree virtualization through `src/components/ui/tree.tsx`, used by:
   - left sheet tree: `src/components/workshop/EstimateSheetTree.tsx`
   - right components tree: `src/components/workshop/component-library/tree/LibraryTree.tsx`
   - right templates/project sources tree: `src/components/workshop/component-library/tree/TemplatesTree.tsx`
2. Estimate row-table virtualization inside `src/components/workshop/estimate-sheet/rows/row-table.tsx`, used by the center Estimate Sheet Page / EMC row bodies.

Do not ship both tracks in one implementation PR. Baseline first, then enable one surface at a time behind flags.

## Plan files

- `01_strategy_and_success_criteria.md` - target outcome, non-goals, budgets, and official TanStack constraints.
- `02_current_state_audit.md` - repo audit for EMC, left tree, right tree, tests, and prior decisions.
- `03_architecture.md` - proposed component architecture and API shapes.
- `04_implementation_plan.md` - phased implementation tasks with exact files and verification commands.
- `05_ultraqa_matrix.md` - adversarial QA matrix for normal, edge, malicious, and regression scenarios.
- `06_risk_register_and_rollout.md` - risk controls, feature flags, rollback, and release gates.
- `07_blast_radius_map.md` - second-pass map of every touched contract, consumer, and rollback boundary.
- `08_implementation_routes.md` - route options for baseline-only, tree-first, row-table-first, and spike-led delivery.
- `09_second_pass_scenario_catalog.md` - testable scenario catalog, including misleading-success traps.
- `10_second_pass_review_report.md` - second-pass findings, document changes, and readiness verdict.
- `11_browser_evidence_and_startup_decision.md` - third-pass evidence protocol and AI-startup decision threshold.
- `12_browser_count_profile_report.md` - real-route browser count/profile results and implementation recommendation.
- `13_shared_tree_virtualization_implementation_plan.md` - planning-only overall implementation plan for shared Tree virtualization across all current consumers.
- `14_emc_virtualization_implementation_plan.md` - planning-only implementation plan for Estimate Master Column branch/row virtualization.

## Second-pass strategy update

The second pass originally tightened the plan around three gates:

1. Former Gate 0 required proving a DOM/windowing bottleneck before adding the dependency.
2. Tree virtualization and row-table virtualization remain separate routes with separate flags, tests, and rollout decisions.
3. Any virtualization test must first prove the virtual path is active; otherwise a fallback path, collapsed fixture, or jsdom-only scroll assertion can create false confidence.

The 2026-06-15 correction supersedes item 1 for shared Tree planning only: expected production-scale nested BOQs justify planning and implementing the shared Tree path behind a default-off flag. Browser proof still blocks default-on rollout and the separate center row-table route.

## Third-pass strategy update

Gate 0 now has two thresholds:

1. Evidence to start a reversible implementation can be lighter because this is a core workflow and the team can move quickly with AI-assisted development.
2. Evidence to turn virtualization on by default remains strict: browser before/after proof, interaction QA, and rollback proof.

The first real-route browser count/profile pass is now captured in `12_browser_count_profile_report.md`. It shows non-virtualized full mounting, but the current fixture is too small to represent expected production BOQ scale.

2026-06-15 correction: do not use the current sample project as the deciding factor for whether shared Tree virtualization is worth planning. The product expectation is that live users can create thousands of nested nodes across project BOQs, library folders, templates, and reusable project sources. That production-scale premise is enough to plan a full shared `Tree` virtualization implementation now, as long as implementation remains reversible and default-off until browser proof is stronger.

The updated planning recommendation is:

1. Plan shared `Tree` virtualization as a first implementation track.
2. Plan EMC virtualization as a first-class implementation track too, covering the center Estimate Master Column branch hierarchy and row bodies.
3. Cover every current `Tree` consumer, not only the estimate sheet.
4. Preserve non-virtual paths and keep default-on rollout gated.
5. Keep shared Tree and EMC flags separate so either can ship, pause, or roll back independently.

## Key local evidence

- Prior archived decision rejected `@tanstack/react-virtual` for the estimate sheet until browser evidence proves DOM count is the bottleneck: `.ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation/decisions/u10-virtualization-decision.md`.
- Newer EMC work improved edit latency but increased large initial render:
  - 500-row keystroke avg: `22.57ms -> 9.75ms`
  - 500-row keystroke worst: `61.84ms -> 14.53ms`
  - 500-row initial render: `433.98ms -> 503.81ms`
  - Evidence: `.ai/03_plans/2026-06-14-EMC-Performance-Optimization/evidence.md`
- The shared `Tree` primitive currently flattens visible tree nodes and renders every visible row. Both the left sheet tree and the right library/templates trees already use it, so this is the correct shared insertion point.
- `@tanstack/react-virtual` is not currently installed in `package.json`.

## Official TanStack sources

- Introduction: https://tanstack.com/virtual/latest
- Virtualizer API: https://tanstack.com/virtual/latest/docs/api/virtualizer
- React adapter API: https://tanstack.com/virtual/v3/docs/framework/react/react-virtual
- Dynamic React example: https://tanstack.com/virtual/v3/docs/framework/react/examples/dynamic

Fetched during planning on 2026-06-14.
