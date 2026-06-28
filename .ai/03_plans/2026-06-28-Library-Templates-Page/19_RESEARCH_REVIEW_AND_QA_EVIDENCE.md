# Research, Review, And QA Evidence

## Local Source Evidence

Reviewed:

- `AGENTS.md`
- `.ai/10_state/current-state.md` fast path and targeted template/library entries
- `.ai/10_state/decisions.md` targeted template/library entries
- `PRODUCT.md`
- `DESIGN.md`
- `src/app/workshop/library/templates/page.tsx`
- `src/app/workshop/library/templates/[templateId]/page.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/library/templates-browse/TemplateGallery.tsx`
- `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx`
- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx`
- `src/components/workshop/library/template-editor/use-template-editor.ts`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/use-estimate-right-sidebar-state.ts`
- `src/lib/repositories/component-library-repository.ts`
- `src/lib/component-library/template-editor-actions.ts`
- relevant tests under `tests/vitest` and `e2e`

## External / Product Research

Researcher lane reviewed official documentation and returned these sources:

- Figma left sidebar / layers/pages/assets:
  `https://help.figma.com/hc/en-us/articles/360039831974-View-layers-and-pages-in-the-left-sidebar`
- Figma right sidebar / properties:
  `https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar`
- Figma libraries:
  `https://help.figma.com/hc/en-us/articles/360041051154-Guide-to-libraries-in-Figma`
- Figma templates/resources:
  `https://help.figma.com/hc/en-us/articles/31668820539287-Find-and-use-templates-and-resources-from-your-team-or-organization`
- Adobe Photoshop workspace overview:
  `https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/workspace-overview.html`
- Adobe panel docking:
  `https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/dock-undock-panels.html`
- Adobe Creative Cloud Libraries:
  `https://helpx.adobe.com/creative-cloud/apps/create-and-manage-libraries/create-and-organize-libraries/libraries-overview.html`
- Adobe Acrobat Sign library templates:
  `https://helpx.adobe.com/sign/adv-user/library-templates/create-template.html`
- Blender Outliner / Properties / Asset Browser:
  `https://docs.blender.org/manual/en/latest/editors/outliner/introduction.html`
  `https://docs.blender.org/manual/en/latest/editors/properties_editor.html`
  `https://docs.blender.org/manual/en/latest/files/asset_libraries/introduction.html`

Research synthesis:

- Professional tools commonly separate object/asset navigation, document/work surface, and contextual properties/source docks.
- Reusable libraries/templates are first-class searchable resources.
- This supports a template workbench, but it does not prove Archestimator should collapse browse and edit routes.

## Product Design Audit Evidence

Audit mode: combined UX/accessibility, source-based.

Browser screenshots were not captured because:

- The user requested planning only.
- No implementation target exists yet.
- Codex App speed guardrail says Playwright/screenshots are opt-in evidence surfaces.

Evidence limit:

- This plan cannot claim visual fidelity or WCAG compliance.
- It can define the future design QA gate and acceptance criteria.

## Council Evidence

Designer:

- Supports workspace transition.
- Adjusts direction to "template workbench, not clone."
- Right dock should be Library + Project only.

Researcher:

- Official pro-tool docs support left browser / center work surface / right dock pattern.

Test engineer:

- Recommends DOM/Vitest first.
- Browser proof only for routing/provider/mobile/perf changes.

Critic:

- Warns route premise may be wrong.
- Browse/manage and editor route should remain distinct unless integrity work is added.
- Calls out missing UI read-only gating and mutation-strength mismatch.

Explorer:

- Maps actual source seams.
- Identifies hardcoded right sidebar tabs and stored preference risk.
- Notes current template editor already re-hosts `EstimateRightSidebar`.

Architect:

- Confirms the desired parity is route layering and workspace grammar, not domain unification.
- Recommends keeping `/workshop/library/templates` and `/workshop/library/templates/[templateId]` as standalone routes.
- Recommends preserving server-seeded browse data, client cache hydration, local browse reducer state, editor-local optimistic state, and server-action authority checks.
- Rejects DB/RLS migration for the conservative target because current tables, policies, and `library_templates_seed` already support the route contract.

Independent verifier:

- Confirmed required docs are present and planning-only scope is explicit.
- Confirmed route distinction, no `Templates` right-dock tab, and real visible-tabs seam.
- Flagged the original Project-tab deferral option as inconsistent with an exact `Library` plus `Project` requirement.
- Plan was updated after verifier review: `Project` is now a required visible v1 tab with selector/unavailable state before scoped project data loads; deferral/hiding is rejected.

## Planning Repair Pass Evidence

Additional evidence and repairs from the 2026-06-28 improvement pass:

- Added `05_ROUTE_STATE_SECURITY_AND_ACCESSIBILITY_CONTRACTS.md` to record source hierarchy, route/cache contracts, state matrix, action-level accessibility proof matrix, attack surface inventory, performance/reliability contract, and evidence-class limits.
- Added `12_IMPLEMENTATION_UNITS_AND_PROOF_CONTRACT.md` to make U0-U4 implementation packets concrete and to map requirements to proof rows with fixture, assertion, command, red/green expectation, and cleanup/skip rule.
- Added `20_FINAL_AUDIT_SCORECARD_AND_VERIFICATION.md` as the final audit surface for document inventory, scorecard, evidence classes, and completion gates.
- Changed the handoff from "implementer must choose a track" to "conservative track is approved; integrated editor track is deferred" to remove an implementation-time product decision.
- During repair, readiness was capped below the independent-verification threshold while verification remained emulated.
- Integrated read-only feasibility/adversarial reviewer findings: Project tab now has a concrete reusable-estimate-source data contract; right-dock clamping lists every preference resurrection point; browse source dock/cache ownership is explicit; read-only editor child contracts are explicit; security/authz mini-review and mobile v1 policy were added.

## Independent Final Verifier Evidence

Verifier lane `019f0d5e-1019-7fd1-baa5-32f7155b3761` returned `IMPLEMENTATION-READY` with no P0/P1 blockers after reviewing the revised package.

Verifier findings:

- Canonical status labels are present and do not claim implementation, browser, provider, or production proof.
- Prior blockers are repaired: Project-tab data/source/state contract, visible-tab preference clamping, browse dock/cache ownership, read-only editor capability gating, mobile v1 policy, and selected-project attack surface.
- Requirements, implementation units, proof rows, and UltraQA scenarios are traceable.
- Residual risks are implementation-dependent: Project-source richness and gated browser/mobile/focus proof if the executor implements browser-only behavior.

## Verification Performed For This Planning Pass

Performed after writing:

- `find .ai/03_plans/2026-06-28-Library-Templates-Page -maxdepth 1 -type f -print | sort`
- `git diff --check -- .ai/03_plans/2026-06-28-Library-Templates-Page`
- targeted stale-claim and status-overclaim `rg` scan across the plan folder
- `rg -n "[[:blank:]]$" .ai/03_plans/2026-06-28-Library-Templates-Page`
- `rg -n "^(<<<<<<<|=======|>>>>>>>)" .ai/03_plans/2026-06-28-Library-Templates-Page`

No code tests are required for this docs-only planning pass.
