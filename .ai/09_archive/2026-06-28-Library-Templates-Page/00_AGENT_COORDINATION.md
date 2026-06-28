# Agent Coordination

## Master Goal

`/goal`

Plan the `/workshop/library/templates` UX/UI transition into an estimate-family template workbench while preserving current Library IA, template data integrity, and proportional verification. The plan must live only in `.ai/03_plans/2026-06-28-Library-Templates-Page`.

## Mode And Boundaries

- Mode: planning/audit/improvement plan only.
- Write scope: this plan folder only.
- Forbidden in this pass: source code edits, test edits, migrations, package config changes, Supabase/provider mutations, runtime data changes, commits, pushes, browser automation as proof of an implemented UI.
- Verification for this pass: source inspection, council synthesis, local docs review, and docs diff checks.

## Skill And Plugin Routing Used

- Product Design index/audit/research/design-qa: used for routing, audit structure, external pro-tool research, and QA rubric. `design-qa` is not fully applicable because there is no implemented visual target to compare; its rubric is carried into the future QA plan.
- Compound Engineering planning: used as the planning quality bar. User path overrides the plugin's default output folder.
- Superpowers brainstorming: used as structured product exploration guidance; no Superpowers implementation workflow was run.
- Impeccable: product register and design context loaded; used as anti-slop/product-fit lens.
- High-end visual design: used only as a polish lens, subordinate to PRODUCT.md and DESIGN.md for an authenticated professional tool.
- Design: DESIGN.md used as the local design source of truth; no DESIGN.md change proposed.
- Visual Ralph: not run because this is a planning-only pass and no implemented visual target exists. It is a future implementation QA gate.
- Ultragoal/UltraQA/Ultrawork: not launched as OMX runtime workflows in this Codex App context; their durable-goal, adversarial-QA, and parallel-lane contracts are embedded in this plan.

## AI Council

Council lanes were read-only. No council lane edited files.

| Lane | Role | Integrated Finding |
| --- | --- | --- |
| Chandrasekhar | Designer | Move toward a template workbench, not an estimate clone. Left inventory, center selected-template surface, right dock Library + Project only. |
| Popper | Researcher | Figma, Adobe, and Blender support a dense pro-tool pattern: left object/asset browser, center document/canvas, right contextual dock. |
| Lovelace | Test engineer | Keep validation mostly Vitest/DOM; require Playwright only if real routing, provider insertion, mobile drawer/focus, or performance changes are implemented. |
| Avicenna | Critic | Do not collapse browse and editor modes. Estimate-like editing belongs in `[templateId]` unless the plan adds read-only gating, conflict semantics, mobile policy, and performance budgets. |
| Bernoulli | Explorer | Current seams: browse route is `TemplatesBrowseManager`; detail route already hosts `EstimateRightSidebar`; right dock tabs are hardcoded in `component-library/index.tsx`; persisted prefs can restore `Templates` unless clamped. |
| Feynman | Architect | Confirms this is an app-layer route-shell/dock problem, not a DB/RLS migration. Keep browse and detail routes separate, preserve server seed/client cache boundaries, and avoid globalizing browse UI state. |

## Consensus Decision

The user's premise is directionally right but too broad if read literally.

Accepted:

- Borrow the estimate editor's workspace grammar.
- Put templates in the left rail instead of the estimate sheet tree.
- Remove the nested `Templates` right-dock tab on template-focused routes.
- Keep `Project` visible as the second right-dock tab, with a selector/unavailable state until a project scope is chosen.

Adjusted:

- `/workshop/library/templates` should not silently become the full structural editor if that collapses Library browse IA.
- The full estimate-style editor already exists at `/workshop/library/templates/[templateId]`; parity claims must be attached to that route, not the browse route, unless a deliberate in-place editing phase is added.
- `Project` in the right dock needs a scoped project-source design. Without project context, show a project selector or disabled state.

## Handoff Contract

The implementation handoff is the **conservative track**. The integrated editor track is not part of the approved implementation scope.

Implement:

1. Make `/workshop/library/templates` a three-pane template workbench with selected-template preview/editor-lite and an explicit `Open editor` path to `[templateId]`.
2. Harden `/workshop/library/templates/[templateId]` as the full editor with explicit read-only UI capability gating.
3. Remove the nested `Templates` right-dock tab from template-focused hosts.
4. Keep `Project` visible in v1 with a selector/unavailable state before scoped project data loads.

Deferred:

- Full in-place structural editing inside `/workshop/library/templates`.
- Estimate-grade revision/history/concurrency semantics for templates.
- Transactional template editor RPC upgrades beyond the current conservative UI transition.

Do not implement a broad visual clone. The `Project` dock tab remains required on `/workshop/library/templates`; the v1 tab set is exactly `Library` and `Project`.

## Architect Addendum

Architecture council recommends no schema/RLS/RPC migration for the conservative target. Existing template tables, RLS policies, seed RPC, server pages, TanStack Query hydration, server-action revalidation, and route-local UI state already support the desired route family. The implementation should factor route shell and right-dock configurability only where useful; it should not merge template management into the estimate route tree or move browse reducer state into a global store without a new cross-route persistence requirement.
