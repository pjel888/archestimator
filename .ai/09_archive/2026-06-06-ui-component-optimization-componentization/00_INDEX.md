# ArchEstimator UI Component Library + Storybook Plan Pack

**Updated:** 2026-06-07
**Status:** STORYBOOK_ONLY_IMPLEMENTED_COMPLETE_OVERLAY_REVIEW_READY
**Scope:** Implementation-aware Storybook pack. The current continuation branch
adds a complete overlay/modal/dialog/popup component system and local
validation evidence while still excluding production route migration, provider
changes, public Storybook hosting, and main/staging merge.

## Updated Task Goal

This folder is now the canonical planning pack for a future ArchEstimator UI Component Library + Storybook MVP. The target future implementation is a reusable product UI library, Storybook configured for ArchEstimator, static stories for all P0/P1 components, and governance that tells future agents to use approved library components instead of feature-local one-off UI.

## Canonical Scope

- Build and inspect a Storybook-first UI library in a future implementation.
- Cover foundations, icons, typography, actions, forms, menus, overlays, navigation, data display, layout, feedback, media, charts, motion, blocks, utilities, and ArchEstimator domain components.
- Preserve existing tree optimization research as the Domain Tree Components and Estimate/Share Tree Sub-plan.
- Defer production app migration until Philip reviews and approves the Storybook result.

## Old Scope Supersession

The old folder thesis was narrow: optimize and componentize tree/workshop UI without creating a broad design-system layer. That thesis is superseded. The tree/componentization work remains valuable, but it is now one domain-component sub-plan inside the larger Storybook-first product UI library strategy.

## Non-Goals

- Do not migrate current production app screens in the MVP.
- Do not install Storybook in this docs pass.
- Do not add dependencies in this docs pass.
- Do not import Flowbite JS runtime, paid Flowbite content, Aceternity effects, Motion/Framer, new Radix packages, or Storybook packages without future owner-approved package gates.
- Do not use live Supabase/provider data in stories.
- Do not publish Storybook unless Philip separately approves publishing.

## Plan Document Map

Start here:

| Order | Document | Purpose |
|---:|---|---|
| 1 | `README.md` | Folder orientation, metadata, source hierarchy, warnings. |
| 2 | `CURRENT_CANONICAL_PLAN.md` | Canonical thesis, MVP phases, gates, readiness by scope. |
| 3 | `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` | Requirements and pass/fail criteria. |
| 4 | `02_CODEBASE_RESEARCH.md` | Live repo, package, graph, and source evidence. |
| 5 | `03_ARCHITECTURE_AND_DESIGN_PLAN.md` | Future library architecture and boundaries. |
| 6 | `04_IMPLEMENTATION_SEQUENCE.md` | Future build order, validation, rollback points. |
| 7 | `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` | Risk matrix and impact evidence. |
| 8 | `06_TESTING_AND_VERIFICATION_PLAN.md` | Required validation strategy. |
| 9 | `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` | Storybook inspection flow, density, a11y rules. |
| 10 | `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` | Data isolation, secrets, bundle, provider boundaries. |
| 11 | `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` | Local/dev Storybook posture, rollback, deferred publishing. |
| 12 | `10_IMPLEMENTATION_PROMPT_DRAFT.md` | Broad future implementation prompt. |
| 13 | `11_READINESS_SCORECARD.md` | Document and scope readiness scoring. |
| 14 | `12_OPEN_QUESTIONS_AND_DECISIONS.md` | Philip decisions and implementation-agent decisions. |
| 15 | `13_TRACEABILITY_MATRIX.md` | Requirement-to-story-to-test traceability. |
| 16 | `14_UI_LIBRARY_MASTER_PLAN.md` | Library vision, taxonomy, definitions of done. |
| 17 | `15_COMPONENT_INVENTORY_MATRIX.md` | Comprehensive 809-row component and pattern inventory. |
| 18 | `16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md` | Storybook package/config plan. |
| 19 | `17_STORYBOOK_STORY_COVERAGE_MATRIX.md` | 703-row P0/P1 Storybook story manifest plus P2/deferred coverage notes. |
| 20 | `18_DESIGN_TOKEN_AND_THEMING_PLAN.md` | Token extraction and Tailwind v4 strategy. |
| 21 | `19_ICON_SYSTEM_AND_ASSET_PLAN.md` | Phosphor-first icon and asset policy. |
| 22 | `20_COMPONENT_API_AND_COMPOSITION_CONTRACTS.md` | Prop, slot, export, client/server contracts. |
| 23 | `21_EXTERNAL_SOURCE_ADOPTION_PLAN_SHADCN_FLOWBITE_ACETERNITY.md` | External source posture and gates. |
| 24 | `22_ACCESSIBILITY_AND_KEYBOARD_MATRIX.md` | Component keyboard and ARIA expectations. |
| 25 | `23_VISUAL_QA_AND_REVIEW_WORKFLOW.md` | Philip Storybook review and QA signoff. |
| 26 | `24_NO_MIGRATION_STORYBOOK_ONLY_MVP_SCOPE.md` | Explicit no-migration boundary. |
| 27 | `25_FUTURE_APP_MIGRATION_ROADMAP_DEFERRED.md` | Future migration roadmap after approval. |
| 28 | `26_IMPLEMENTATION_PROMPT_STORYBOOK_AND_LIBRARY_ONLY.md` | Focused copy-paste future implementation prompt. |
| 29 | `27_COMPONENT_ACCEPTANCE_CHECKLIST.md` | Per-component completion checklist. |
| 30 | `28_MCP_AND_COMPUTER_USE_SOURCE_RESEARCH_GUIDE.md` | Future MCP/browser/computer-use research rules. |
| 31 | `29_COMPONENT_DEPENDENCY_AND_PACKAGE_PLAN.md` | Package and dependency gates. |
| 32 | `30_AGENT_UI_USAGE_RULES_DRAFT.md` | Draft future agent usage rules. |
| 33 | `31_DOC_REPAIR_LOG.md` | What changed in this refinement. |
| 34 | `32_SOURCE_ADOPTION_CROSSWALK.md` | Component-by-component shadcn/Flowbite/Aceternity/adapt/defer decisions. |
| 35 | `33_STORYBOOK_CONFIG_SKELETONS.md` | Future Storybook config, preview, CSS, decorator, and mock skeletons. |
| 36 | `34_FIXTURE_AND_DECORATOR_CONTRACTS.md` | Static fixture factory and provider decorator contracts. |
| 37 | `35_COMPONENT_API_REFERENCE_MATRIX.md` | P0/P1 local component API/export/contracts reference. |
| 38 | `36_P0_P1_IMPLEMENTATION_BACKLOG.md` | Implementation-grade P0/P1 backlog and stop gates. |
| 39 | `37_PHILIP_STORYBOOK_REVIEW_PACKET.md` | Owner review packet, inspection route, signoff states, and feedback loop. |
| 40 | `38_VALIDATION_COMMAND_MATRIX.md` | Current docs-only and Storybook implementation validation commands. |
| 41 | `39_STANDALONE_COMPONENT_COVERAGE_AUDIT.md` | Latest actual standalone story coverage audit and validation proof. |
| 42 | `40_MODAL_DIALOG_SYSTEM_IMPLEMENTATION.md` | Latest modal/dialog/popup/sheet/tooltip/command overlay implementation proof. |
| 43 | `41_COMPLETE_COMPONENT_SYSTEM_COVERAGE.md` | Latest complete component-system coverage, focused tests, and rendered overlay smoke proof. |

Preserved tree/domain sub-plan:

- `01_UI_REUSE_AUDIT.md`
- `02_TREE_PERFORMANCE_RESEARCH.md`
- `03_TREE_COMPONENTIZATION_AUDIT.md`
- `04_IMPLEMENTATION_PLAN.md`
- `05_READINESS_VALIDATION.md`
- `06_STRATEGY_CRITIQUE_AND_DECISION.md`
- `07_REPO_EVIDENCE_REGISTER.md`
- `08_TDD_IMPLEMENTATION_TASK_PACK.md`
- `09_ULTRAQA_PLAN_QUALITY_REPORT.md`
- `10_ULTRAGOAL_TEAM_HANDOFF.md`
- `BENCHMARK_PROTOCOL.md`
- `BLAST_RADIUS_ANALYSIS.md`
- `CROSS_PLAN_REFERENCES.md`
- `EFFORT_AND_MVP_SLICING.md`
- `GRADUAL_ROLLOUT_STRATEGY.md`
- `HANDOFF.md`
- `IMPLEMENTATION_MATRIX.md`
- `MEASUREMENT_BASELINE.md`
- `OWNER_SIGNOFF.md`
- `PLAN_REPAIR_LOG.md`
- `RISK_REGISTER.md`
- `TREE_CORE_API_CONTRACTS.md`
- `VISUAL_REGRESSION_STRATEGY.md`

## Start-Here Instructions For Future Implementation Agent

1. Verify live repo state before editing: `pwd`, `git status --short --branch`, `git branch --show-current`, `git worktree list`, `git log --oneline -5`.
2. Read `README.md`, `CURRENT_CANONICAL_PLAN.md`, `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`, `15_COMPONENT_INVENTORY_MATRIX.md`, `17_STORYBOOK_STORY_COVERAGE_MATRIX.md`, and `32_SOURCE_ADOPTION_CROSSWALK.md` through `38_VALIDATION_COMMAND_MATRIX.md`.
3. Re-run graph impact checks before touching shared primitives or tree/domain components.
4. Confirm package decision gates before installing Storybook or any supporting dependency.
5. Build Storybook and library components/stories only. Stop before production app migration.
6. Ask Philip for Storybook review after the Storybook library is inspectable.

## Recommended Implementation Sequence

1. Package decision and Storybook install/config branch.
2. Static Storybook shell, CSS import, decorators, and provider mocks.
3. Tokens, icon gallery, typography, Button/IconButton, Field/Input, Badge, Tooltip, Modal/Dialog, Menus, Card/Panel, Empty/Loading/Error states.
4. P1 form, overlay, navigation, table, tree shell, and domain card stories.
5. Domain story fixtures for project, estimate, component library, share, notifications, and release modal surfaces.
6. Selective app/workshop-safe microinteractions only after reduced-motion and dependency gates.
7. Governance docs and future migration readiness. Stop.

## Required Verification Commands

Current docs-only pass:

- `git diff --check`
- `git diff -- .ai`

Future implementation baseline:

- `bun run validate`
- `bun run build`
- `git diff --check`
- `bun run lint:design-system`
- `bun run test`
- `bun run test:dom`
- `bun run storybook` after the script exists.
- `bun run build-storybook` after the script exists.

`bun run test:e2e` is not required for the Storybook-only MVP unless a future agent violates scope and touches production routes, which it must not do.

## Risk Summary

- Shared primitives are high-risk: GitNexus reported `Button` and `SearchInput` as CRITICAL impact symbols.
- `WorkshopTree` is HIGH impact and must remain a later domain component lane.
- code-review-graph representative UI/package touchpoints showed high blast radius: 500 impacted nodes across 128 files for shared UI/tree/package surfaces.
- Storybook dependencies are approval-gated and must not be added in this docs pass.
- Flowbite paid content and Aceternity/Motion effects are license, privacy, performance, and design-system gates.
- Production app migration is the largest visual/regression risk and is explicitly out of MVP scope.

## Bug/Blocker References

No new bug plan was required during this refinement. Open owner decisions are recorded in `12_OPEN_QUESTIONS_AND_DECISIONS.md` and are implementation gates, not blockers to this docs handoff.

## Current Status

| Scope | Status |
|---|---|
| Docs package readiness | 100/100 READY_FOR_IMPLEMENTATION_HANDOFF |
| Storybook setup readiness | 100/100 READY_AFTER_PACKAGE_APPROVAL |
| Primitive component readiness | 100/100 READY_FOR_STORYBOOK_MVP |
| Full component matrix readiness | 100/100 READY_FOR_PHASED_BUILD |
| Domain component readiness | 100/100 READY_WITH_GRAPH_IMPACT_GATES |
| Migration readiness | 20/100 DEFERRED_BY_DESIGN |

Do not quote a single readiness score without the scope. Migration readiness is intentionally low because production app migration is not part of the MVP.

## Absolute Boundary

No current app migration until Philip approves Storybook.
