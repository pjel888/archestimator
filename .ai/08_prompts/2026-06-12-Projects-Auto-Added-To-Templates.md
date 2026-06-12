You are working inside the local Archestimator repository:

/Users/philiplewis/archestimator

Your job is NOT to implement code yet. Your job is to create a comprehensive, evidence-backed planning, audit, architecture, database, UI, migration, security, export, and test documentation package for a multi-feature undertaking:

1. Add multi-tab support inside every estimate.
2. Rebrand user-facing “sheets” as “tabs”.
3. Make project/estimate/tab content automatically available in the templates panel alongside user-created templates.
4. Ensure tabs map cleanly to Excel worksheet tabs in the existing XLSX export flow.

Create all planning documents in this exact folder:

/Users/philiplewis/archestimator/.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates

Do not write implementation code outside this folder.
Do not modify application source, database migrations, generated Supabase types, tests, or config files yet.
You may create the planning folder if it does not exist.
All output documents must be Markdown.

================================================================================
STRICT EXECUTION CONTRACT
================================================================================

This is a docs-only planning pass.

Your stop condition is not "a plan exists". Your stop condition is:

1. The plan folder exists at:
   /Users/philiplewis/archestimator/.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates
2. Every required Markdown document listed in this prompt exists in that folder.
3. Every document contains repo-specific findings, not generic implementation advice.
4. Every major claim is grounded in current repo evidence with repo-relative file paths and, where practical, line-style references.
5. The package separates verified current state, recommended target architecture, implementation sequencing, tests, risks, and open decisions.
6. No application source, migrations, generated types, tests, config, lockfiles, package files, provider state, or secrets were changed by this planning pass.
7. A final completion audit proves that every requirement in this prompt is satisfied.

Do not ask the user for permission to proceed. Make reasonable assumptions where the request is already clear. Only record an open question if the answer would materially change product behavior, data ownership, permission boundaries, or rollout safety.

If a previous document already exists in the target folder, do not trust it as current. Re-audit the live repo first, then update, replace, or supersede the document so the final package is internally consistent.

================================================================================
MANDATORY READING ORDER
================================================================================

Before writing conclusions, read the project truth surfaces and current code:

1. .ai/README.md
2. .ai/00_system/ai-folder-canonical-map.md
3. .ai/00_system/AGENT_OPERATING_PROTOCOL.md
4. .ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md
5. .ai/10_state/current-state.md
6. .ai/10_state/decisions.md
7. DESIGN.md
8. package.json
9. Existing related plan packs, if present:
   - .ai/03_plans/2026-06-11-Unification-Plan-For-Components-And-Templates
   - .ai/03_plans/2026-06-11-Templates-Page-UX-UI-Audit
   - .ai/03_plans/2026-06-11-templates-panel-ux
10. The source files, migrations, and tests listed below.

Treat .ai and prior plans as orientation only. The live codebase is authoritative for current behavior.

================================================================================
REQUIRED WORKFLOW
================================================================================

Follow this order:

Phase A - Repo and docs intake
- Verify branch and worktree status.
- Confirm whether the target plan folder already contains files.
- Read the mandatory truth surfaces.
- Read related prior plan packs only for historical context; mark any stale claims as stale.

Phase B - Current-state audit
- Trace the estimate route from page load through repository loaders, hooks, state stores, tree rendering, row mutation actions, version/audit RPCs, collaboration access, and export.
- Trace the current templates surfaces from database tables through repository loaders, UI tree/gallery/preview, drag payloads, insertion RPC/actions, and template editor.
- Trace the XLSX export model from route params through workbook model builder and worksheet creation.
- Trace all relevant tests and validation scripts.

Phase C - Target architecture
- Decide the target model for estimates, tabs, templates, project-derived reusable sources, permissions, cache keys, routes, and export.
- Explicitly distinguish "Estimate", "Tab", "Template", "Project-derived template source", and "Excel worksheet tab".

Phase D - Plan package
- Write the required Markdown documents.
- Keep each document focused, but cross-link related documents.
- Use repo-relative paths.
- Include file/function/table names.
- Include concrete implementation units and test scenarios.

Phase E - Self-review and completion audit
- Re-read this prompt.
- Build a checklist of every explicit requirement.
- Verify that the plan pack satisfies each item.
- Search the plan pack for placeholders, generic claims, contradictions, stale terminology, and missing paths.
- Fix the documents before final response.

================================================================================
NON-NEGOTIABLE OUTPUT RULES
================================================================================

- Do not produce generic advice like "update the UI" or "adjust the database".
- Do not write code snippets that pretend to be final implementation.
- Do not create migration files yet.
- Do not regenerate Supabase types yet.
- Do not run provider-mutating commands.
- Do not change source files outside the target planning folder.
- Do not flatten this into one giant document. The plan must be a navigable package.
- Do not hide uncertainty. Classify uncertainty as:
  - Verified by repo evidence
  - Assumption for planning
  - Deferred implementation discovery
  - Requires product-owner decision
  - Requires provider/manual proof
- Do not treat local code inspection as provider proof. Supabase/Vercel/GitHub/manual proof must be named separately if required later.

================================================================================
EVIDENCE AND CITATION STANDARD
================================================================================

Every major recommendation must cite evidence in one of these forms:

- Source code: `src/path/file.ts:line` or `src/path/file.ts` with function/component name.
- Migration/schema: `supabase/migrations/<file>.sql:line` with table/function/policy name.
- Test: `tests/...` or `e2e/...` with scenario name.
- Project truth: `.ai/...` with decision/status name.
- Package command: `package.json` script name.

Use line numbers where practical. If line numbers are omitted because a file is long or a symbol appears many times, cite the function/component/table name and explain what to inspect.

Each planning document must have a short "Evidence Used" section listing the most important repo sources for that document.

================================================================================
REPO FACTS THIS PROMPT EXPECTS THE AUDIT TO VERIFY
================================================================================

These are seed observations from the current repository. Verify them directly before using them as plan truth:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` loads the estimate workspace through `getProjectEstimateTreeByNode(projectId, nodeId)` and passes `estimateId`, `selectedNodeId`, and `estimate.sheet_code`-derived metadata into `EstimateWorkspaceClient`.
- `src/lib/repositories/estimate-repository.ts` currently loads `estimate_nodes` and `estimate_row_items` by `estimate_id`; there is no visible first-class tab dimension in that repository surface.
- `src/lib/repositories/workspace-repository.ts` has both `getProjectEstimateTreeByEstimate` and `getProjectEstimateTreeByNode`; node-route fallback behavior must be preserved or migrated carefully.
- `src/hooks/use-estimate-query.ts`, `src/hooks/use-estimate-row-mutations.ts`, and `src/hooks/use-estimate-workspace-state.ts` key cache/selection/expansion primarily by `estimateId`.
- `supabase/migrations/20260522091621_component_library_templates.sql` defines `estimate_templates`, `estimate_template_nodes`, `estimate_template_row_items`, tree validation, insertion into estimates, and RLS policies for workspace-scoped persisted templates.
- `src/components/workshop/component-library/tree/TemplatesTree.tsx` uses template-specific datum variants for categories, templates, template nodes, and template rows; a unified source model will need a broader discriminated union.
- `src/components/workshop/component-library/index.tsx` owns the estimate-sidebar Templates tab interactions, drag payloads, rename/delete actions, and "Add Template" flow.
- `src/components/workshop/library/templates-browse/*` owns the route-level templates browse/gallery/preview/insert surface after library unification.
- `src/lib/proposal-export/create-proposal-workbook.ts` currently creates fixed workbook worksheets such as `Bid Form`, `Summary`, `Commercial Terms`, and `Source Breakdown`; multi-tab export must decide whether those remain global or become tab-scoped.
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` exports by projectId + estimateId and builds the filename from project code/name and estimate sheet code/name.
- `package.json` includes `validate`, `type-check`, `lint`, `lint:design-system`, `test`, `test:dom`, `build`, `test:e2e`, and hosted export verification scripts; use exact script names in validation planning.

================================================================================
CORE PRODUCT INTENT
================================================================================

Current user-facing vocabulary is confusing. Estimate “sheets” should be rebranded as “tabs” because each estimate can contain multiple estimate tabs, and those tabs should correspond to worksheet tabs when exporting to XLSX.

Desired future hierarchy:

Workspace
  → Projects
    → Estimates
      → Tabs
        → Estimate tree
          → Groups / Areas
            → Row items

The current estimate node tree should belong to a tab, not directly to the estimate.

The Templates panel must eventually show two major sources:

A. User-created templates
   These are the existing persisted custom templates.

B. Project-derived reusable content
   These are automatically exposed, live project sources:
   Projects → Estimates → Tabs → Groups / Areas / maybe whole tab payloads

Users should be able to browse, search, drag, and drop content from both sources into the current estimate tab.

Critical principle:
Do NOT blindly duplicate every project/estimate/tab into the persisted template tables. Treat project-derived template entries as virtual/read-through sources unless the user explicitly saves one as a custom template. Persisted templates and project-derived sources must be unified at the UI and insertion layer, not necessarily in the storage layer.

================================================================================
MANDATORY REPO AREAS TO AUDIT
================================================================================

Audit these files/directories and any related imports they lead to:

1. Estimate editor route and workspace client
   - src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx
   - src/components/workshop/EstimateWorkspaceClient.tsx
   - src/hooks/use-estimate-query.ts
   - src/hooks/use-estimate-row-mutations.ts
   - src/hooks/use-estimate-workspace-state.ts
   - src/stores/estimate-ui-store.ts

2. Estimate data model and repositories
   - src/lib/repositories/estimate-repository.ts
   - src/lib/repositories/workspace-repository.ts
   - src/lib/estimates/actions.ts
   - src/lib/estimates/types.ts
   - src/lib/domain/estimate-tree.ts
   - src/lib/domain/estimate-mutations.ts
   - src/lib/estimates/tree-hierarchy.ts

3. Current templates domain, UI, and actions
   - src/app/workshop/templates/page.tsx
   - src/app/workshop/library/templates/page.tsx
   - src/components/workshop/library/templates-browse/
   - src/components/workshop/component-library/templates.ts
   - src/components/workshop/component-library/NewTemplateModal.tsx
   - src/lib/component-library/actions.ts
   - src/lib/component-library/estimate-templates.ts
   - src/lib/repositories/component-library-repository.ts

4. XLSX export
   - src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts
   - src/lib/proposal-export/
   - Any filename helpers, route verification scripts, and export tests.

5. Supabase schema and migrations
   - supabase/migrations/
   - src/lib/supabase/types.ts
   - Any scripts that verify migrations or regenerate types.

6. Collaboration, publication, versioning, and audit trails
   - estimate_sheet_access_settings
   - estimate_sheet_members
   - estimate_sheet_events
   - estimate_sheet_versions
   - project_publications
   - shared link snapshot builders
   - collaboration invite surfaces
   - AI data access/audit surfaces if they reference estimate/node/row IDs.

7. Tests and validation gates
   - tests/unit/
   - tests/vitest/
   - e2e/
   - package.json scripts
   - scripts/verify-hosted-export-route.ts
   - any existing tests around templates, estimate tree mutation, XLSX export, RLS, and collaboration.

================================================================================
KNOWN CURRENT-STATE FACTS TO VERIFY IN THE AUDIT
================================================================================

Verify these assumptions directly in the repo before writing conclusions:

1. Current estimate nodes and row items are keyed by estimate_id.
   There is no first-class estimate tab table yet.

2. The current route shape uses:
   /workshop/projects/[projectId]/estimates/[nodeId]

   The route accepts either an estimate node ID or estimate ID fallback in repository logic.

3. Existing templates use a separate persisted graph:
   - estimate_templates
   - estimate_template_nodes
   - estimate_template_row_items

4. The templates browse UI currently assumes every browsed item is an EstimateTemplate.

5. The current XLSX export route exports one estimate tree into a workbook with fixed worksheets, not one worksheet per estimate tab.

6. Current user-facing copy still uses “sheet” in multiple places, including:
   - route names
   - collaboration names
   - UI labels
   - empty states
   - export metadata
   - database table names
   - generated types
   - tests

7. Some DB/table names may need to remain “sheet” temporarily for backward compatibility. The plan should distinguish:
   - user-facing language: “tab”
   - legacy DB/internal compatibility names: keep only where migration risk is too high
   - Excel worksheet concept: “worksheet tab” or “Excel sheet tab”

8. A live Supabase advisory indicated that public.profile_role_hardening_audit currently has RLS disabled. Document this in a security note, but do not include it as part of this feature implementation unless separately authorized.

================================================================================
REQUIRED OUTPUT DOCUMENTS
================================================================================

Create the following Markdown files inside:

/Users/philiplewis/archestimator/.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates

Use exact filenames.

--------------------------------------------------------------------------------
00_INDEX.md
--------------------------------------------------------------------------------

Purpose:
A short executive index for the whole plan package.

Must include:
- Feature objective.
- Final recommended architecture.
- Document map.
- Implementation sequence.
- Explicit statement: “No application code was modified by this planning pass.”
- Exact artifact inventory for 00 through 16, with one-line purpose for each file.
- Recommended first implementation slice and why it is the safest first slice.
- Clear status for provider/manual proof: not performed during this docs-only pass.
- List of unresolved questions, only if truly blocking.

--------------------------------------------------------------------------------
01_CURRENT_STATE_AUDIT.md
--------------------------------------------------------------------------------

Purpose:
A precise audit of how estimates, templates, exports, routes, and collaboration work today.

Must include:
- Current estimate hierarchy.
- Current database tables and relationships.
- Current route model, including node-id route behavior and estimate-id fallback.
- Current template database shape.
- Current templates UI shape.
- Current drag/drop template insertion flow.
- Current estimate tree mutation flow.
- Current query keys and cache boundaries.
- Current client state boundaries for selected/expanded nodes and sidebar/template state.
- Current XLSX export route and workbook structure.
- Current collaboration/access assumptions.
- Current versioning/audit event assumptions.
- Current shared-link/publication snapshot assumptions.
- Current AI package-builder / Ask Flip / audit surfaces that reference estimates, nodes, rows, or sheet terminology.
- Current tests touching these areas.
- Exact file references with paths and line-number style notes where possible.
- A “terminology debt” section listing every major place where “sheet” appears in user-facing copy or APIs.
- A "do not rename yet" section for DB/RPC/internal compatibility names that should stay stable in the first implementation.

--------------------------------------------------------------------------------
02_TARGET_ARCHITECTURE.md
--------------------------------------------------------------------------------

Purpose:
Define the desired future architecture.

Must include:
- Target hierarchy:
  Workspace → Project → Estimate → Tab → Tree → Group/Area → Row item.
- Definition of “Estimate”.
- Definition of “Tab”.
- Definition of “Template”.
- Definition of “Project-derived template source”.
- Recommended storage model.
- Recommended UI model.
- Recommended export model.
- Data ownership rules.
- Permission rules.
- Caching boundaries.
- Compatibility strategy.
- Event/versioning strategy.
- Publication/shared-link snapshot strategy.
- Performance model for projects with many estimates/tabs/nodes.
- Route and deep-link strategy.
- Rollout strategy with old data and old URLs.

Required recommendation:
Project-derived template sources should be virtual/read-through by default. Persisted template tables should remain for user-created templates. A project tab or node should only become a persisted template when the user explicitly chooses “Save as template”.

Required diagrams:
- Data ownership diagram.
- Read path diagram for the templates panel unified sources.
- Write/insertion path diagram for custom templates vs project-derived sources.
- XLSX export model diagram.

--------------------------------------------------------------------------------
03_DATABASE_MIGRATION_PLAN.md
--------------------------------------------------------------------------------

Purpose:
Plan database changes safely.

Must evaluate at least two schema options:

Option A:
Create estimate_tabs and add estimate_tab_id/tab_id to estimate_nodes and possibly row/event/version tables.

Option B:
Treat each existing estimate as a tab and introduce a parent estimate_group / estimate_package table.

Option C:
Any alternative you discover from the actual codebase.

Pick one recommended option and justify it.

Required recommended direction unless the repo audit disproves it:
Create a first-class estimate_tabs table.

Proposed table shape to evaluate:

estimate_tabs
- id uuid primary key default gen_random_uuid()
- estimate_id uuid not null references estimates(id) on delete cascade
- name text not null
- tab_code text nullable
- sort_order integer not null default 0
- is_default boolean not null default false
- archived_at timestamptz nullable
- metadata jsonb not null default '{}'
- created_by uuid nullable references auth.users(id)
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Proposed changes to evaluate:
- Add estimate_tab_id or tab_id to estimate_nodes.
- Add estimate_tab_id or tab_id to estimate_row_items only if needed for query speed/integrity; otherwise derive through node_id.
- Add estimate_tab_id/tab_id to estimate_sheet_events.
- Add estimate_tab_id/tab_id to estimate_sheet_versions.
- Consider tab-level access later, but do not overbuild if estimate-level access is enough for this feature.
- Backfill exactly one default tab for every existing estimate.
- Attach all existing estimate_nodes to that default tab.
- Preserve all existing estimate IDs and node IDs.
- Preserve existing URLs during migration.
- Add indexes for estimate_tabs(estimate_id, sort_order), estimate_nodes(estimate_tab_id, sort_order), and any common access/query paths.
- Add constraints that prevent cross-estimate/cross-tab parent-child mistakes.
- Add RLS policies consistent with current estimate/project access patterns.
- Add updated_at triggers if the project uses them elsewhere.
- Add rollback notes.
- Add type-generation notes.

Must include:
- Backfill SQL strategy.
- RLS strategy.
- Index strategy.
- Constraint strategy.
- Data validation queries.
- Migration rollout sequence.
- Remote/linked Supabase apply boundary: local migration plan only unless separately authorized.
- Risks.
- How to keep old estimates working.
- How to regenerate Supabase types.
- How to test migration locally.
- How to prove every existing estimate has exactly one default tab after backfill.
- How to prove every existing estimate node is attached to a tab after backfill.
- How to prove no row/node crosses estimate/tab boundaries.
- How to handle functions/RPCs that currently call `estimate_sheet_snapshot`, `create_estimate_sheet_version`, `reorder_estimate_nodes_with_history`, or `restore_estimate_sheet_version_as_copy`.

Do not write actual migration files yet unless explicitly asked later.

--------------------------------------------------------------------------------
04_DOMAIN_AND_REPOSITORY_PLAN.md
--------------------------------------------------------------------------------

Purpose:
Plan TypeScript/domain/repository updates.

Must include:
- New domain types:
  - EstimateTab
  - EstimateTabTree
  - EstimateWithTabs
  - EstimateTabSummary
  - TemplateSource or ReusableEstimateSource
- Query key redesign:
  - estimate detail by estimateId
  - tab list by estimateId
  - tab tree by estimateId + tabId
  - templates/custom source list
  - project-derived reusable source list
- Repository changes:
  - getEstimateTabs
  - getEstimateTabTree
  - getDefaultEstimateTab
  - resolveEstimateTabRouteContext
  - createEstimateTab
  - renameEstimateTab
  - duplicateEstimateTab
  - reorderEstimateTabs
  - archive/deleteEstimateTab
  - move node/row mutations to be tab-aware
- Backward-compatible wrappers for current getProjectEstimateTreeByEstimate and getProjectEstimateTreeByNode.
- Optimistic update strategy.
- Cache invalidation strategy.
- Event/audit strategy.
- Type safety strategy.
- Migration from “sheet” naming to “tab” naming in code.
- Server action changes for estimate-node CRUD, row CRUD, duplication, restore/versioning, and activity/history.
- Revalidation strategy for old and new routes.
- Failure modes and rollback behavior for optimistic updates.
- Compatibility shim deletion criteria for a later cleanup phase.

Important:
Do not require every internal file/table to be renamed immediately. Plan a safe naming boundary:
- User-facing copy says “tab”.
- New domain code says “tab”.
- Legacy DB tables with “sheet” names may remain temporarily.
- Comments must explain compatibility.

--------------------------------------------------------------------------------
05_ESTIMATE_TABS_UI_UX_PLAN.md
--------------------------------------------------------------------------------

Purpose:
Plan the estimate editor UI for multiple tabs.

Must include:
- Where tabs appear in the estimate editor.
- How the existing sheet/tree panel changes.
- How a tab is created, renamed, duplicated, reordered, archived/deleted.
- How current selected node behaves when switching tabs.
- Empty tab state.
- Drag/drop behavior inside a tab.
- Cross-tab drag/drop behavior, if supported.
- Keyboard/accessibility paths for every drag action.
- Breadcrumb/header language changes.
- Route strategy:
  - keep current route shape temporarily?
  - introduce /workshop/projects/[projectId]/estimates/[estimateId]/tabs/[tabId]?
  - support redirects/fallback from old node-based route?
- Mobile/responsive behavior.
- Loading/skeleton behavior.
- Error states.
- Design-system compliance:
  - SF Pro
  - max 12px app font
  - radius-xs only
  - existing neutral palette/tokens
  - Phosphor icons where applicable
- Exact component ownership: which existing shared chrome/tab primitives should be reused vs extended.
- Interaction states for dirty edits, collaboration presence, pending row mutations, active drag, and failed tab load.
- Non-drag insertion alternatives for keyboard and accessibility.
- Browser/manual QA scenarios for desktop and mobile widths.

Must include a UX copy table:
Old label/copy → New label/copy

Examples:
- Estimate Sheet → Estimate Tab
- Sheets → Tabs
- Save sheet as template → Save tab/group as template
- Sheet tree → Tab tree or Estimate tree
- Sheet code → Tab code or Estimate revision code, depending on audited meaning

--------------------------------------------------------------------------------
06_TEMPLATES_PANEL_UNIFICATION_PLAN.md
--------------------------------------------------------------------------------

Purpose:
Plan how the templates panel should show both custom templates and project-derived reusable sources.

Must include:
- Current templates UI audit.
- New unified source model.
- Discriminated union design for custom template sources, project tab sources, project node sources, and project row/item sources.
- Recommended left navigation tree.

Recommended UI structure to evaluate:

Reusable
  Custom Templates
    Category
      Template

  Projects
    Project Name
      Estimate Name
        Tab Name
          Whole tab
          Groups / Areas

Alternative UI structures may be proposed, but pick one.

Must include:
- How search should work across custom templates and project-derived sources.
- How filtering should work.
- How preview should work.
- How drag/drop payloads should work.
- How insertion should reuse or extend existing template insertion flows.
- How to prevent permission leaks.
- How to prevent stale data.
- How project-derived sources should display “live source” metadata.
- Whether the right preview dock should show:
  - project
  - estimate
  - tab
  - node path
  - last updated
  - row count
  - total cost
- Whether users can save a project-derived source as a persisted custom template.
- How duplicates and naming conflicts are handled.
- How to preserve current template category management for custom templates only.
- Which context-menu actions apply only to custom templates.
- Which actions apply to project-derived sources.
- Which route-level `/workshop/library/templates` browse behavior should match the estimate-sidebar templates panel and which behavior may intentionally differ.
- How project-derived sources interact with the existing template editor route.
- How bulk selection works across mixed source types.
- How source recency/staleness is represented without copying data into template tables.
- How to avoid forcing route-level template management actions onto read-through project sources.

Required rule:
Project-derived sources must not expose projects/estimates/tabs the current user cannot access. The plan must trace current workspace/project/estimate access logic before proposing queries.

--------------------------------------------------------------------------------
07_XLSX_EXPORT_TABS_PLAN.md
--------------------------------------------------------------------------------

Purpose:
Plan how estimate tabs map to XLSX worksheet tabs.

Must include:
- Current export route and workbook builder audit.
- Current workbook worksheets.
- New export behavior options:
  Option A: Export all estimate tabs into one workbook, one worksheet per estimate tab.
  Option B: Export active tab only.
  Option C: Export all tabs plus summary sheets.
- Pick recommended behavior.
- Excel worksheet tab naming rules:
  - sanitize invalid characters
  - deduplicate names
  - respect Excel worksheet name length limits
  - preserve readable names where possible
- How formulas should reference tab worksheets safely.
- Whether the existing “Bid Form”, “Summary”, “Commercial Terms”, and “Source Breakdown” worksheets become:
  - global workbook sheets, or
  - per-tab sheets, or
  - one worksheet per estimate tab using the tab’s own tree.
- How export filename changes.
- How export route params change.
- How to handle very large estimates across many tabs.
- How to test generated workbook contents.
- How to keep the existing export route working during migration.
- How to represent active-tab export vs all-tabs export in API shape without breaking current route consumers.
- How to test workbook worksheet order, worksheet names, formulas, hidden/global sheets, and filename behavior.
- How to keep proposal-preview/export model tests aligned with workbook route tests.

Preferred direction to evaluate:
Keep a project/estimate workbook export. Include all estimate tabs by default. Add either:
- one worksheet per tab for itemized data plus global summary, or
- grouped worksheet names like “Tab - Bid Form” only if the existing workbook format requires multiple sheets per tab.

Do not assume; inspect the workbook builder first and recommend the least disruptive safe design.

--------------------------------------------------------------------------------
08_ACCESS_SECURITY_RLS_PLAN.md
--------------------------------------------------------------------------------

Purpose:
Plan access control and RLS.

Must include:
- Current workspace/project/estimate access model.
- Current estimate_sheet_access_settings and estimate_sheet_members behavior.
- Whether tab-level access is in scope or deferred.
- RLS policies needed for estimate_tabs.
- RLS impacts of estimate_nodes gaining tab_id.
- RLS impacts for project-derived template browsing.
- How to prevent a user from dragging a source they cannot read.
- How to prevent insertion into a target they cannot edit.
- Audit event additions.
- Cross-workspace and cross-project denial scenarios for project-derived source browsing.
- Read permission matrix:
  workspace owner/admin/member/viewer, project member, estimate sheet member, invited/shared recipient, anonymous.
- Write permission matrix for inserting into a target estimate/tab.
- Service-role-only operations, if any, and why they are required.
- Supabase advisory note:
  public.profile_role_hardening_audit currently has RLS disabled. Document as unrelated existing risk. Do not include remediation in this feature implementation unless separately authorized.

--------------------------------------------------------------------------------
09_TEST_AND_VALIDATION_PLAN.md
--------------------------------------------------------------------------------

Purpose:
Define all tests and validation gates required before implementation is considered done.

Must include:
- Unit tests for tree building by tab.
- Unit tests for row totals across tabs.
- Unit tests for tab backfill helpers.
- Unit tests for project-derived template source conversion.
- Unit tests for drag/drop payload parsing.
- Unit tests for XLSX worksheet tab name sanitization.
- Repository/server-action tests where existing patterns allow.
- DOM tests for templates panel source switching/search/preview.
- DOM tests for estimate tab switching.
- Playwright tests:
  - create tab
  - rename tab
  - duplicate tab
  - reorder tab
  - switch tabs and preserve separate trees
  - drag custom template into a tab
  - drag project-derived source into a tab
  - export XLSX with multiple tabs
- RLS/local Supabase tests or SQL validation queries.
- Migration validation queries.
- Performance tests for project-derived source browsing.
- Accessibility tests for non-drag alternatives.

Must include final validation commands:
- bun run validate
- bun run type-check
- bun run lint
- bun run lint:design-system
- bun run lint:design
- bun run test
- bun run test:dom
- bun run build
- bun run launch:verify-hosted-export
- targeted Playwright specs for changed areas

If package.json has a canonical validate command, include it exactly.

Also include:
- A targeted test matrix by implementation phase.
- Existing tests likely to need updates.
- New tests to create, with proposed file paths.
- Manual/browser QA scenarios.
- Migration validation SQL queries.
- RLS denial scenarios.
- XLSX workbook inspection scenarios using ExcelJS.
- Performance/scale checks for templates panel browsing many projects/tabs/nodes.
- Accessibility checks for tab navigation and non-drag insertion.

--------------------------------------------------------------------------------
10_IMPLEMENTATION_PHASES.md
--------------------------------------------------------------------------------

Purpose:
Break implementation into safe phases.

Must include phases with goals, files touched, risks, tests, and exit criteria.

Required phase structure:

Phase 0 — Current-state audit and terminology map
- No product code changes.
- Confirm all “sheet” references and categorize as user-facing, legacy internal, or Excel-related.
- Produce a terminology migration map before source edits.

Phase 1 — Database tab foundation
- Add estimate_tabs.
- Backfill default tab per estimate.
- Attach current nodes to default tab.
- Add RLS/indexes/constraints.
- Regenerate Supabase types.
- Keep old app behavior working.

Phase 2 — Repository/domain tab support
- Add tab-aware loaders and actions.
- Add query keys.
- Keep compatibility wrappers.

Phase 3 — Estimate editor multi-tab UI
- Add tab switcher and tab CRUD.
- Preserve current tree behavior per selected tab.

Phase 4 — Terminology rebrand
- Change user-facing “sheet” to “tab”.
- Keep legacy internal names where risky.
- Update docs/tests.

Phase 5 — Templates panel unified sources
- Add custom templates + project-derived sources.
- Add preview and drag/drop.
- Preserve custom template management behavior.

Phase 6 — XLSX export tab support
- Export multi-tab estimates safely.
- Add worksheet naming sanitizer.
- Add export tests.

Phase 7 — Hardening
- Access/RLS verification.
- Performance checks.
- Regression tests.
- E2E validation.

Phase 8 — Documentation, rollout, and cleanup
- Update `.ai` truth surfaces if implementation changes project reality.
- Archive evidence after implementation, not during this planning pass.
- Identify compatibility shims to remove in a later cleanup once old routes/data paths are proven stable.

Each phase must include:
- objective
- affected files
- database changes if any
- UI changes if any
- tests
- rollback plan
- definition of done

--------------------------------------------------------------------------------
11_RISK_REGISTER.md
--------------------------------------------------------------------------------

Purpose:
List major risks and mitigations.

Must include at least:
- Data migration risk.
- Existing estimate URL compatibility risk.
- Collaboration permission risk.
- Publication/shared-link snapshot risk.
- XLSX export formula/name collision risk.
- Stale project-derived template risk.
- Performance risk when browsing many projects/tabs/nodes.
- Naming confusion between “tab”, “sheet”, and “worksheet”.
- RLS policy gaps.
- User-created template vs project-derived source action mismatch.
- Testing gaps.

For each risk include:
- severity
- probability
- affected area
- mitigation
- test/validation method

--------------------------------------------------------------------------------
12_OPEN_QUESTIONS_AND_DECISIONS.md
--------------------------------------------------------------------------------

Purpose:
Record assumptions and decisions.

Must include:
- Decisions already made by this planning pass.
- Questions that require product-owner input.
- Questions the codebase can answer through audit.
- Questions that should not block initial implementation.

Do not overuse open questions. Make reasonable product decisions where the desired behavior is clear.

--------------------------------------------------------------------------------
13_REQUIREMENTS_TRACEABILITY_MATRIX.md
--------------------------------------------------------------------------------

Purpose:
Prove that every requested feature and every high-risk repo surface has a planned implementation and validation path.

Must include a table with columns:
- Requirement ID
- Source request / repo evidence
- Planned architecture document
- Implementation phase
- Primary files/tables likely affected
- Tests/validation
- Risk linkage
- Status: planned / assumption / deferred / product decision needed

Required requirement groups:
- Multi-tab estimate support.
- "Sheet" to "tab" user-facing rebrand.
- Existing DB/internal sheet-name compatibility.
- Project-derived sources in templates panel.
- User-created custom templates preserved.
- Drag/drop and non-drag insertion.
- Permission-safe browsing and insertion.
- XLSX worksheet-tab export.
- Backward-compatible routes.
- Collaboration/versioning/publication/audit impacts.
- AI/Ask Flip/package-builder impacts.
- Migration/backfill safety.
- Performance and accessibility.

--------------------------------------------------------------------------------
14_IMPLEMENTATION_HANDOFF.md
--------------------------------------------------------------------------------

Purpose:
Give the future implementation agent a concise but complete execution contract.

Must include:
- Scope statement.
- Non-goals.
- Required reading order.
- Recommended first implementation slice.
- Phase-by-phase handoff with entry criteria, work scope, exit criteria, and validation.
- Files/tables most likely to be touched by each phase.
- "Do not do" warnings.
- Branch/worktree cleanliness guidance.
- Provider/manual proof boundaries.
- Expected final evidence bundle after implementation.
- A short pointer prompt that can fit into a future `/goal` or agent handoff and references this plan folder.

The pointer prompt must be short and must not duplicate the whole plan pack. It should tell the next agent to read this folder and execute phase-by-phase.

--------------------------------------------------------------------------------
15_REVIEW_CHECKLIST.md
--------------------------------------------------------------------------------

Purpose:
Give reviewers and future agents a checklist for whether the plan is implementation-ready.

Must include:
- Architecture readiness checklist.
- Database/migration readiness checklist.
- UI/UX readiness checklist.
- Templates panel readiness checklist.
- Export readiness checklist.
- Security/RLS readiness checklist.
- Test readiness checklist.
- Rollback/readiness checklist.
- Stale-claim checklist.
- Explicit pass/fail criteria.

This file should be usable by a separate reviewer to decide whether implementation can start.

--------------------------------------------------------------------------------
16_COMPLETION_AUDIT.md
--------------------------------------------------------------------------------

Purpose:
Prove that this planning prompt was followed.

Must include:
- The exact prompt requirements checklist.
- For each required document, whether it exists and what requirement it satisfies.
- Confirmation that no application code was modified.
- Confirmation that no migrations/types/tests/config/source files outside the plan folder were modified.
- Summary of live repo evidence inspected.
- Remaining gaps, if any.
- Final verdict:
  - READY_FOR_IMPLEMENTATION_PLANNING_COMPLETE, or
  - NOT_READY with exact blockers.

Do not mark READY unless the document package is internally consistent, repo-grounded, and complete.

================================================================================
ARCHITECTURAL DECISIONS TO FAVOR
================================================================================

Favor these decisions unless the repo audit discovers a strong reason not to:

1. Create first-class estimate tabs.
   The existing estimate remains the commercial/revision container. Tabs become the internal worksheet/tree containers.

2. One default tab per existing estimate.
   Backfill without breaking existing estimates.

3. Keep DB “sheet” tables temporarily if renaming them is risky.
   Rebrand user-facing copy first. Rename internal tables only in a later cleanup if needed.

4. Treat project-derived reusable content as virtual sources.
   Do not persist every project tab as an estimate_template row.

5. Use a unified UI source model.
   Custom templates and project-derived sources should share preview/drag/drop/insert behavior, but actions must differ:
   - Custom templates: rename, duplicate, move category, delete, insert.
   - Project-derived sources: insert, preview, save as custom template. No delete/rename unless editing the original project/tab.

6. Preserve permissions.
   Project-derived source browse queries must only return readable projects/estimates/tabs/nodes.
   Insert actions must verify write permission on the target estimate/tab.

7. Keep export route backward compatible.
   Existing export links should still work after tabs exist.

8. Make XLSX worksheet names deterministic.
   Sanitize, truncate, and dedupe tab names.

================================================================================
DOCUMENT QUALITY BAR
================================================================================

Each document must be specific to this repo. Avoid generic advice.

Every major recommendation must cite:
- exact file paths
- function/component/table names
- current behavior observed in code
- downstream impacts

Do not produce vague statements like “update the UI” or “modify the database”.
Instead, write specific implementation guidance like:
- “Update getProjectEstimateTreeByEstimate to load selected/default estimate_tab first, then query estimate_nodes by estimate_tab_id.”
- “Extend TemplateBrowseTreePanel datum union to distinguish custom-template from project-derived-source.”
- “Add a virtual source payload variant for project tab/node drag payloads.”
- “Keep rename/delete context menu actions disabled for project-derived sources.”

Required quality checks before final response:
- Run `git status --short` and confirm only the target plan folder changed.
- Run `find .ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates -maxdepth 1 -type f | sort` and confirm every required file from `00_INDEX.md` through `16_COMPLETION_AUDIT.md` exists.
- Search the plan folder for unresolved placeholders: `TBD`, `TODO`, `FIXME`, `lorem`, `placeholder`, `copy later`, `fill in`.
- Search the plan folder for broad generic filler phrases and replace them with specific file/table/function guidance.
- Re-read `16_COMPLETION_AUDIT.md` and ensure it honestly classifies any missing proof as a gap rather than a pass.
- Confirm that implementation remains future work. This pass creates planning artifacts only.

================================================================================
FINAL RESPONSE REQUIREMENT
================================================================================

After creating all documents, print a concise completion summary containing:
- list of files created, 00 through 16
- recommended architecture in 5 bullets
- highest-risk implementation area
- first implementation phase to start with
- validation commands to run before coding
- exact verification performed for this planning pass
- explicit note that no application code, migration, generated type, package, config, or test file was modified

If any required artifact is missing or any required audit surface could not be inspected, do not claim completion. State NOT_READY and list the exact missing item.
