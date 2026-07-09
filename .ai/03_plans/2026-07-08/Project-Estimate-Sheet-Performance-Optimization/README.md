# Project Estimate Sheet Performance Optimization Plan Pack

Status: **CONDITIONALLY READY** — Phase 0 and Phase 0.5 verification may begin; optimization coding requires Phase 0 evidence.

Created: 2026-07-08 | Last improved: 2026-07-09 (third improvement pass — inventory/source-map, WCAG 2.2 AA proof matrix, budgets, pre-mortem, hosted-proof runbook, traceability tightening).

Scope: planning only. No source, test, migration, provider, or runtime implementation changes are authorized by this pack except Phase 0 measurement artifacts.

Verification mode: `emulated` (same-agent, multi-lane). Per Improve-Plan-Prompt Suite Succession, this caps the package at 97 and the behavior-bearing status at `CONDITIONALLY READY` until a real independent reviewer or browser/hosted proof is produced.

## Mission

Make the project estimate sheet safe for first-user MVP use where a single estimate can contain thousands of components, thousands of areas or branches, and thousands of row items. Ensure the two component types — **Project Level Component** and **Library Level Component** — interoperate correctly across Add Component Modal, Edit Component Modal, and Inline Row Item editing, with full variant support.

## Executive Answer

The current sheet is partly performant, not fully scalable by proof. Component interoperability is implemented in source code and passing local tests but lacks browser/scale verification.

**Already good:**
- Server route seeds the first tab tree and keeps the component library lazy.
- TanStack Query is used with seeded initial data and five-minute `staleTime`.
- Tree, branch, and row virtualization gates exist.
- Render probe tests cover keystroke and memoization isolation in jsdom.
- Component Add/Edit/Inline surfaces support both component types.
- Duplicate-name suppression, image URL normalization, variant persistence, and project-component fan-out are implemented.

**Primary gaps:**
- The D1 route fast path `readEstimateNodeRouteContextD1FastPath` is currently a null stub.
- Initial route payloads still cap but materialize a nested tree up to 1,500 nodes and 5,000 rows.
- Edit, totals, filtering, grouping, move dialogs, and optimistic patches still rely on recursive whole-tree scans in several hot paths.
- No estimate-sheet-specific Chrome performance proof at 1,000-5,000 rows.
- No estimate-sheet-specific D1 query-plan proof.
- No browser proof for component interop scenarios.
- Project-component fan-out is currently a tree-walk (O(N)), not O(1) graph index.

## Plan Pack Index

| # | Document | Purpose |
|---|---|---|
| 00 | `00_AGENT_COORDINATION.md` | Agent coordination, skills, evidence lanes, review loop |
| 01 | `01_EXECUTIVE_SUMMARY.md` | Decision summary, readiness, top priorities |
| 02 | `02_FEATURE_BRIEF_AND_SCOPE.md` | Goals, non-goals, users, scenarios, scale targets — includes component interop |
| 03 | `03_SOURCE_AND_CODEBASE_AUDIT.md` | Current code findings with exact files |
| 04 | `04_REQUIREMENTS_SPECIFICATION.md` | Functional, performance, reliability, test requirements — includes REQ-CI-01 through CI-16 and REQ-CRUD-01 through CRUD-08 |
| 05 | `05_UX_UI_ACCESSIBILITY_PLAN.md` | Interaction, a11y, perceived performance, mobile/responsive, reduced motion |
| 06 | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Normalized graph target, alternatives, ADR — includes componentInstanceNodeIds |
| 07 | `07_DATA_DATABASE_API_NETWORK_PLAN.md` | D1, query keys, route, network design |
| 08 | `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Auth, data exposure, proof redaction, abuse risks |
| 09 | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets, telemetry, reliability gates, Cloudflare free-tier budget, bundle/RSC budget, throttling |
| 10 | `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Affected modules, dependency posture |
| 11 | `11_IMPLEMENTATION_PLAN.md` | 7-phase staged execution units, phase exit criteria, Phase 0.5 component-interop verification |
| 12 | `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix, commands, fixtures, evidence artifacts |
| 13 | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Rollout, rollback, feature flags, hosted-proof runbook, operator checklist |
| 14 | `14_RISK_REGISTER.md` | 30 risks with severity, mitigations, owners (15 perf + 6 component-interop/CRUD + 9 pre-mortem) |
| 15 | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | ADR-style decisions, rejected paths, open-decisions table with owner/deadline/impact |
| 16 | `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | REQ-to-unit-to-named-test map |
| 17 | `17_FINAL_READINESS_REVIEW.md` | Readiness verdict, go/no-go, blind spots, OPEN-07 mobile scope |
| 18 | `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Official docs, stack constraints |
| 19 | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Subagent, GitNexus, research, critique evidence |
| 20 | `20_PERFORMANCE_EVALUATOR_SPEC.md` | Evaluator contract, metric artifacts |
| 21 | `21_EXECUTION_HANDOFF.md` | Ready-to-run implementation handoff |
| 22 | `22_COMPONENT_INTEROPERABILITY_SPEC.md` | Component type interop: identity contract, three edit surfaces, surface matrix, variants, QA matrix, CI-QA ↔ test mapping |
| 23 | `23_FINAL_SCORECARD_AND_READINESS.md` | Full scored audit against Improve-Plan-Prompt methodology |
| 24 | `24_DOMAIN_MODEL_AND_DATA_FLOW.md` | Comprehensive "understand everything" reference: entity model, rendering layer, data layer, hot-path cost map |
| 25 | `25_CRUD_SURFACE_AND_MUTATION_MAP.md` | Complete CRUD contract: every Server Action, RPC, optimistic/rollback behavior, authz gate |
| 26 | `26_TEMPLATE_COMPOSITION_AND_INSERTION.md` | Template entity model, three insertion entry points, optimistic flow, server-side copy semantics, DnD bridge |
| 27 | `27_DRAG_AND_DROP_AND_CROSS_PANEL_ARCHITECTURE.md` | DnD system, three-panel layout, window-event bridge, collaboration overlay isolation |
| 28 | `28_INVENTORY_SOURCE_MAP.md` | **NEW (Pass-3)** Document inventory, source hierarchy, requirements/decision/assumption registers, evidence map, missing-source list |
| 29 | `29_ACCESSIBILITY_PROOF_MATRIX.md` | **NEW (Pass-3)** WCAG 2.2 AA criteria-to-test mapping, state matrix, action-level proof matrix, mobile/responsive plan, reduced motion |
| — | `LOOP_LEDGER.md` | Durable planning loop ledger |
| — | `evidence/` | Phase evidence artifacts |

## Required Stop Condition Before Coding

Before any optimization code is written, Phase 0 must produce:
- A route benchmark artifact for the target estimate route.
- A Chrome sheet interaction artifact for scroll, edit, search, expand/collapse, and move flows.
- A D1 query-plan artifact for the exact estimate sheet route and subtree query shapes.
- A baseline decision memo that ranks bottlenecks by measured impact.

Before Phase 0.5 completion, browser verification must pass for:
- Component interop scenarios CI-QA-01 through CI-QA-17 (see doc 22).
- Add Component Modal, Edit Component Modal, Inline editing for both component types.
- Variant selection, persistence, and fan-out.

## Scorecard

Pre-improvement: ~80/100 | Post-pass-1: ~85/100 | Post-pass-2: ~88/100 | Post-pass-3: ~91/100 | Target: 95+ (requires real independent reviewer + browser/hosted proof — out of planning scope)

See `23_FINAL_SCORECARD_AND_READINESS.md` for full scored audit.

## What This Pack Covers (pass 3 summary)

Pass 3 (2026-07-09) closed industry-standard gaps surfaced in pass-2 review:

- **Doc 28 (Inventory & Source Map)**: Improve-Plan-Prompt Phase-1 requirement — document inventory, source hierarchy, requirements map, decision map, assumption register, evidence map, missing-source list. All file:line refs verified against current worktree.
- **Doc 29 (Accessibility Proof Matrix)**: WCAG 2.2 AA criteria-to-test mapping for the worksheet surface; state matrix (loading/empty/success/error/conflict/permission/offline/timeout/cancel/truncation/session-expired); action-level proof matrix (keyboard path/focus/aria-live); mobile/responsive plan; reduced-motion plan. Lifts the UX cap from 84.
- **Doc 09 expansion**: Cloudflare free-tier budget table (with verify-before-rely caveats and source URLs); client bundle + RSC payload budget; device/network throttling plan.
- **Doc 11 expansion**: Phase exit criteria (binary observable per phase); formalized Phase 0.5 with units U0.5.1/.2/.3; R22 conditional gate (Phase 2 only if client computation is top-3 bottleneck); R23 property test (1,000+ iterations); R25 concurrent-edit + rollback interaction test.
- **Doc 13 expansion**: Hosted-proof runbook (Phase A seed / B measure / C cleanup / D verify, with fail-closed assertion); rollback rehearsal per phase; operator monitoring checklist.
- **Doc 14 expansion**: 9 pre-mortem scenarios (R22-R30) — Phase 0 memo gate, totals drift, hosted cleanup, rollback/broadcast race, template stress, Chrome version flake, session expiry, selector order stability, a11y retrofit.
- **Doc 15 expansion**: Open decisions converted from bullets to owner/deadline/impact table (OPEN-01..06).
- **Doc 16 expansion**: Every REQ-CI-* maps to a named vitest test file or browser scenario; pass-3 takeaway lists the 6 missing tests for U0.5.3 backfill.
- **Doc 17 expansion**: Blind-spots section (BS-01..10) — real Chrome behavior, D1 query plans, bundle weight, session expiry, DO backpressure, RSC payload, mobile, WCAG retrofit risk, free-tier headroom, fixture realism. OPEN-07 mobile/tablet scope decision.
- **Doc 22 expansion**: CI-QA ↔ test name mapping table; coverage status 11/17 explicit.
- **README**: removed duplicate "Scope" line; declared verification mode; refreshed index.

## What This Pack Covers (pass 2 summary)

Pass 2 added comprehensive domain documentation so a reader can understand **every moving part** of the estimate sheet:

- **Doc 24 (Domain Model)**: entity model, component identity resolution, rendering layer (3-panel → branch virtualizer → row virtualizer → cells), data layer (Server Actions → D1 client → repository → React Query → mutations), template composition, DnD architecture, collaboration model, hot-path cost map, known limitations.
- **Doc 25 (CRUD Surface)**: every Create/Read/Update/Delete operation with its Server Action, RPC, history event, optimistic/rollback behavior, and authz gate — plus the full row mutation flow and conflict handling.
- **Doc 26 (Template Composition)**: template entity model, three insertion entry points, optimistic flow with stale-snapshot guard, server-side copy semantics, cross-panel DnD bridge.
- **Doc 27 (DnD Architecture)**: drag MIME types, Zustand side-channel store, drop zones, edge auto-scroll, window-event cross-panel bridge, collaboration overlay isolation.
- **Doc 22 (Component Interop)**: corrected to document the **three** edit surfaces (AddComponentModal create, AddComponentModal edit, EditComponentDrawer), the `linkState` lifecycle, two-layer fan-out, and the restore-deleted D1 limitation.

## Related Plans

- `.ai/03_plans/2026-07-08/component-interoperability/` — **ARCHIVED**. Implemented work superseded by doc 22 in this pack.
- `.ai/09_archive/store/2026-07-08-component-interoperability/` — Archive destination.
