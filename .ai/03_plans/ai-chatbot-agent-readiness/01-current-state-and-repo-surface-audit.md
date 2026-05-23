# 01 Current State And Repo Surface Audit

**Date:** 2026-05-23
**Scope:** read-only audit for a future AI chatbot agent
**No implementation in this file.**

## Current product state relevant to AI

Archestimator already has the core data surfaces an AI estimating agent would need:

- authenticated workspace boundary;
- projects;
- estimates;
- estimate tree nodes;
- estimate row items;
- component library taxonomy, suppliers, folders, and cost rows;
- reusable estimate templates;
- protected project estimate comparison charts at `/workshop/projects/[projectId]/charts`.

The current canonical app namespace is `/workshop`. The AI agent should be planned around the protected workshop routes, not the older deleted prototype surfaces.

Second-pass correction:

- `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` now treat `/workshop/projects/[projectId]/charts` as an approved protected route, not merely dirty in-progress chart work.
- The charts route uses `@nivo/pie` only in `src/components/workshop/project-charts/`, with aggregation under `src/lib/project-charts/` and loading through `getProjectChartsData()`.
- That charting dependency is for estimate comparison donuts and does not automatically justify using Nivo for AI agent workflow visualization.

## Existing auth and tenant boundary

Current user context is loaded through `src/lib/auth/session.ts`.

Key facts:

- `/workshop` is protected by `src/proxy.ts`.
- `getCurrentUserContext()` uses the dev-auth bypass only when local dev gating permits it.
- Normal auth uses `createSupabaseServerClient()` and `supabase.auth.getUser()`.
- `requireCurrentUserContext()` redirects unauthenticated users to `/login`.
- Magic-link and OAuth callback handling live in `src/lib/auth/actions.ts` and `src/app/auth/callback/route.ts`, and sanitize `next` redirect paths.

Current workspace bootstrap is in `src/lib/repositories/workspace-repository.ts`.

Key facts:

- `ensureDefaultWorkspace()` requires the current user.
- User data is loaded through a workspace boundary.
- `getCurrentWorkspaceProject(projectId)` explicitly filters projects by `workspace_id` and UUID-valid project id.

AI implication:

- The AI orchestrator should always begin by deriving `CurrentUserContext` and `workspace.id`.
- Tool calls must accept user-visible ids only as candidates and then revalidate them through workspace-scoped loaders.
- The model should never be trusted to supply a `workspace_id`; the server should derive it from the authenticated user.
- Dev auth/admin bypass must stay local-inspection-only. No chatbot path should depend on `SUPABASE_SERVICE_ROLE_KEY` or `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB`.

## Existing Supabase security foundation

The core schema migration `supabase/migrations/20260518090000_archestimator_core_schema.sql` establishes:

- `workspaces`;
- `workspace_members`;
- `projects`;
- `estimates`;
- `cost_library_items`;
- `estimate_nodes`;
- `estimate_row_items`;
- RLS enabled on app tables;
- helper functions `public.is_workspace_member(target_workspace_id)` and `public.is_workspace_admin(target_workspace_id)`;
- policies checking workspace membership through project/estimate relationships.

Important detail:

- The existing helper functions are `SECURITY DEFINER` in `public`.
- CEO/platform admin access is added by `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql` through database policies, not frontend-only checks.
- Component taxonomy is globally readable to authenticated users, while suppliers/items/folders remain workspace-scoped.
- Template insertion checks source template workspace equals target estimate workspace before copying nodes/rows.
- Supabase guidance says security-definer helpers should not live in exposed schemas. Future AI-specific functions should use a private/unexposed schema and limited execute grants.

AI implication:

- The current RLS shape is a workable base.
- AI-specific tables/functions must be stricter than the historical baseline: private helpers, explicit grants, audit logs, `USING` plus `WITH CHECK`, and two-user leakage tests.

## Project actions

Current project mutations live in `src/lib/projects/actions.ts`.

Current actions:

- `createProject(formData)`;
- `deleteProject(formData)`;
- `updateProjectDetails(formData)`.

Risk observations:

- `createProject()` derives `workspace_id` from `ensureDefaultWorkspace()` and is a good pattern for AI create tools.
- `updateProjectDetails()` and `deleteProject()` currently rely on Supabase RLS plus project id filtering, but do not first call `getCurrentWorkspaceProject(projectId)`.
- Future AI write tools should use stricter command handlers than direct form actions, because model-provided ids require explicit validation and clearer error semantics.
- Some route surfaces still have sample/fallback data behavior. AI tooling must not treat sample fallback rows as writable or user-owned truth.

AI implication:

- Do not expose current form actions directly as model tools.
- Wrap project operations in typed server-side command functions such as `aiCreateProjectDraft`, `aiApplyProjectPatch`, and `aiDeleteProject` only after confirmation.

## Estimate actions

Current estimate mutations live in `src/lib/estimates/actions.ts`.

Relevant actions:

- `createEstimate(projectId, formData)`;
- `createEstimateSheetDraft(projectId)`;
- `updateEstimateDetails(input)`;
- `regenerateEstimateSheetCode(input)`;
- `createEstimateNode(projectId, estimateId, formData)`;
- `renameEstimateNode(projectId, estimateId, nodeId, formDataOrName)`;
- `deleteEstimateNode(projectId, estimateId, nodeId)`;
- `reorderEstimateTreeNodes(...)`;
- `insertEstimateTemplateIntoEstimate(...)`;
- `insertEstimateRowItemFromLibrary(...)`;
- `updateEstimateRowItem(...)`;
- `replaceEstimateRowItemWithLibrary(...)`;
- `deleteEstimateRowItem(...)`.

Good current patterns:

- Most estimate operations first call `getCurrentWorkspaceProject(projectId)` or a validated row/node loader.
- Row insertion requires target node kind `area`.
- Template insertion delegates atomic copying to `public.insert_estimate_template_into_estimate`.
- Row ids are UUID-normalized before persistence.

AI implication:

- The AI agent should not directly mutate tables. It should create an `EstimatePatch` and send it to an app validator.
- App validators should reuse existing hierarchy guards: Group Nodes organize; Area Nodes own rows.
- Budget-aware generation should be a draft first, because cost estimates can materially affect business decisions.
- Browser repositories exist for some estimate/cost-library operations and rely on RLS. Write-capable AI tools should prefer server command handlers with explicit project/workspace validation over browser repositories.

## Component library and templates

Relevant files:

- `src/lib/repositories/component-library-repository.ts`;
- `src/lib/component-library/actions.ts`;
- `src/lib/component-library/taxonomy.ts`;
- `src/components/workshop/component-library/*`;
- `src/app/workshop/library/page.tsx`;
- `src/components/workshop/LibraryPageClient.tsx`;
- `src/components/workshop/TemplatesPageClient.tsx`.

Current shape:

- `/workshop/library` is the canonical component route.
- `/workshop/components` is a compatibility redirect to `/workshop/library`, not the active route surface.
- Component category taxonomy is globally readable to authenticated users.
- `library_folders`, `component_suppliers`, `cost_library_items`, templates, and template row snapshots are workspace-scoped.
- The component Library now includes item versioning, multiple price options, lifecycle-state history, and price-history tables through the active component-library versioning slice.
- `/workshop/library` is component-only.
- `/workshop/templates` is reusable estimate-template-only.
- Estimate sidebar can include both component rows and templates for insertion.

AI implication:

- Library search should be a read-only AI tool with explicit `workspace_id` derivation and server-side filters.
- Template insertion should be a high-value first write path because templates already copy known structures atomically.
- AI-generated rows should prefer matching existing library items/templates before inventing new rows.
- AI component matching must choose from the currently active lifecycle/price-option records and must preserve the component version/price source in the draft patch. It should not silently use stale historical prices as current cost truth.

## Current data/action risk inventory

High risk:

- Cross-workspace leakage through search/retrieval, vector lookup, or model context assembly.
- AI writes using model-provided ids without workspace validation.
- Service-role key accidentally used for normal AI reads/writes.
- Prompt injection from uploaded specs, component descriptions, supplier names, or user-provided project notes.
- Silent application of large estimate patches without user review.

Medium risk:

- Bad budget allocation that appears authoritative.
- Generated row items with unverified costs, suppliers, or quantities.
- Using inactive, draft, archived, or historical component price options as if they were current supplier-backed prices.
- Cost-library fallback/static data being mistaken for user-owned persisted data.
- Existing broad form actions being reused instead of typed AI command handlers.

Lower risk:

- Read-only explain/summarize mode, if it only sees current user-scoped context.
- Draft-only structured output, if no database writes occur.

## Readiness conclusion

The repo is ready for a careful AI planning phase, but not yet ready for implementation. The missing pieces are:

- AI-specific command/tool contracts;
- AI audit tables;
- two-user workspace leakage tests;
- prompt-injection and eval datasets;
- confirmation UX;
- explicit policy for service-role avoidance;
- a retrieval design that keeps every chunk workspace-scoped.
