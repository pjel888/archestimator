# 13 Package Builder Agent Readiness And Architecture

**Date:** 2026-05-27
**Status:** readiness / architecture plan
**Scope:** future Ask Flip expansion from Ask-only into a user-confirmed package builder
**No app code changes in this file.**

## Current answer

Yes, Archestimator can support the target experience:

> Assemble me a 3 bedroom package, budget is 5 million pesos.

The correct implementation is not a generic browser agent that clicks around the app. It should be an **app-owned agent**: the model proposes a plan, but Archestimator server code reads scoped data, validates the proposed changes, shows a preview, and applies changes only after explicit user confirmation.

The current live Ask Flip implementation is still Ask-only. It does not currently create projects, create estimates, create estimate tree nodes, insert estimate rows, retrieve component library rows, remember user activity, or search user files. This plan describes what must be built to make that safe.

## Target user workflow

1. User enters a package request in Ask Flip.
   - Example: "Assemble me a 3 bedroom package, budget is 5 million pesos."
2. Ask Flip extracts a normalized package brief.
   - project type;
   - number of bedrooms;
   - floor count;
   - target budget;
   - currency;
   - missing assumptions such as gross floor area, bathrooms, finish level, location, and procurement basis.
3. The orchestrator reads only allowed user data.
   - current workspace context;
   - relevant component library rows;
   - relevant estimate templates;
   - optional current project or prior estimates only when those read tools are approved.
4. The package planner produces a structured draft.
   - project draft;
   - estimate draft;
   - tree draft;
   - area and room program;
   - component matches;
   - quantities, units, cost assumptions, and warnings;
   - budget summary and variance.
5. The UI shows a reviewable preview.
   - sections and rooms;
   - matched library components;
   - unmatched allowance rows;
   - budget risks;
   - source and confidence per row.
6. User confirms Apply.
7. The server performs a transactional apply flow.
   - create project;
   - create estimate shell;
   - create approved tree nodes;
   - insert approved template rows and component-library row snapshots;
   - write AI action/audit records;
   - return created ids and a post-apply summary.

## Product modes

Ask:
- answers questions;
- may read scoped app data after read tools ship;
- never writes.

Draft:
- creates a structured proposal;
- may use scoped read tools;
- never writes production records;
- must include assumptions, warnings, source ids, and validation state.

Apply:
- requires a validated draft and explicit confirmation;
- writes through server-owned commands only;
- uses idempotency keys and audit rows;
- starts narrow, then expands after proof.

## Recommended architecture

```txt
Ask Flip UI
  -> Next.js AI route or server action
    -> trusted auth and workspace context
    -> AI orchestrator
      -> provider adapter
        -> OpenAI Responses API for tool calling and structured output
      -> app-owned tools
        -> read validators
        -> draft validators
        -> apply command handlers
          -> existing repositories / purpose-built RPCs
          -> Supabase RLS
      -> audit and eval hooks
  -> streaming answer / validated draft preview / confirmation result
```

The provider can suggest tool calls, but it must not own authorization or mutation. Archestimator owns:

- authenticated user identity;
- workspace membership;
- target project/estimate/node validation;
- allowed tool registry;
- provider-send data allowlist;
- draft schema validation;
- Apply confirmation state;
- idempotency and recovery;
- audit storage.

## Why not browser-control automation

Browser-control agents are useful for testing, support, or assistive workflows, but this feature should not rely on the model clicking the UI to create records.

Reasons:

- authorization belongs on the server, not the browser;
- UI clicks are brittle and hard to audit;
- large estimate creation needs transactions and retry safety;
- model mistakes must be caught before persistence;
- RLS and command validators are easier to prove at the server/database boundary.

Browser automation can still be used for QA after implementation: load the app, submit the package prompt, inspect preview, confirm Apply in a test environment, and verify the resulting project/estimate.

## Package builder read tools

First required read tools:

- `read_current_workspace_context`
- `list_accessible_projects`
- `read_project_summary`
- `list_project_estimates`
- `read_estimate_summary`
- `read_estimate_tree`
- `read_area_rows`
- `search_component_library`
- `search_estimate_templates`

Later read tools:

- `search_prior_estimates`
- `search_user_files`
- `read_user_preferences`
- `read_project_activity_patterns`

Rules:

- tools derive workspace server-side;
- tools revalidate every model-provided id;
- tools return compact summaries, not full workspace dumps;
- every read emits `ai_data_access_events`;
- prompt-visible data is minimized and redacted.

## Package builder draft tools

Recommended first draft helpers:

- `extract_package_brief`
- `build_room_program`
- `search_package_components`
- `draft_estimate_tree`
- `draft_component_row_plan`
- `validate_package_draft`
- `summarize_package_budget`

Draft output must be a strict schema, not prose that later gets parsed. Every row should include:

- target area draft id;
- material/component name;
- source type: library item, template, allowance, or user assumption;
- source id where applicable;
- quantity;
- unit;
- unit cost;
- misc cost;
- contingency;
- confidence;
- assumption;
- warning;
- apply eligibility.

## Package builder apply tools

Apply should be staged.

Phase 1 Apply:

- `apply_create_project_estimate_shell`

Phase 2 Apply:

- `apply_create_estimate_tree`

Phase 3 Apply:

- `apply_insert_template`
- `apply_insert_component_rows`

Phase 4 Apply:

- `apply_update_estimate_rows`
- `apply_package_revision`

Explicitly excluded until much later:

- delete project;
- delete estimate;
- delete tree nodes;
- delete rows;
- run SQL;
- read or modify workspace members;
- admin override;
- public sharing or invite actions.

## Example draft shape

```json
{
  "schemaVersion": 1,
  "mode": "draft",
  "intent": "create_package_project",
  "brief": {
    "projectName": "3 Bedroom Package",
    "targetBudget": 5000000,
    "currencyCode": "PHP",
    "bedrooms": 3,
    "floorCount": 1,
    "finishLevel": "standard",
    "missingInputs": ["gross floor area", "bathroom count", "site location"]
  },
  "projectDraft": {
    "name": "3 Bedroom Package",
    "clientName": null,
    "location": null,
    "projectBudget": 5000000
  },
  "estimateDraft": {
    "name": "Initial 3 Bedroom Package Estimate",
    "sheetCode": null
  },
  "treeDraft": [
    { "clientDraftId": "group-house", "kind": "group", "name": "House", "parentClientDraftId": null },
    { "clientDraftId": "area-bedroom-1", "kind": "area", "name": "Bedroom 1", "parentClientDraftId": "group-house" },
    { "clientDraftId": "area-bedroom-2", "kind": "area", "name": "Bedroom 2", "parentClientDraftId": "group-house" },
    { "clientDraftId": "area-bedroom-3", "kind": "area", "name": "Bedroom 3", "parentClientDraftId": "group-house" },
    { "clientDraftId": "area-dining", "kind": "area", "name": "Dining", "parentClientDraftId": "group-house" }
  ],
  "rowDraft": [
    {
      "targetAreaClientDraftId": "area-bedroom-1",
      "sourceType": "library_item",
      "sourceLibraryItemId": "uuid",
      "material": "Bed frame",
      "quantity": 1,
      "unit": "set",
      "unitCost": 0,
      "confidence": "requires-user-review",
      "assumption": "Matched by bedroom furniture search.",
      "warnings": ["Confirm size and finish before purchase."]
    }
  ],
  "budgetSummary": {
    "targetBudget": 5000000,
    "draftTotal": 0,
    "variance": -5000000,
    "currencyCode": "PHP"
  },
  "requiresConfirmation": true
}
```

## Repo surfaces already available

Current read/create foundations:

- `src/lib/projects/actions.ts`
  - `createProjectRecord(formData)`
  - `createProject(formData)`
- `src/lib/estimates/actions.ts`
  - `createEstimate(projectId, formData)`
  - `createEstimateSheetDraft(projectId)`
  - `createEstimateNode(projectId, estimateId, formData)`
  - `insertEstimateTemplateIntoEstimate(input)`
  - `insertEstimateRowItemFromLibrary(input)`
- `src/lib/repositories/workspace-repository.ts`
  - `ensureDefaultWorkspace()`
  - `listCurrentWorkspaceProjects()`
  - `getCurrentWorkspaceProject(projectId)`
  - `listProjectEstimates(projectId)`
  - `getProjectEstimateTreeByEstimate(projectId, estimateId)`
  - `getProjectEstimateTreeByNode(projectId, nodeId)`
- `src/lib/repositories/component-library-repository.ts`
  - `getCurrentWorkspaceComponentRowsLibrary()`
  - `getCurrentWorkspaceEstimateTemplates()`
  - `getCurrentWorkspaceComponentLibrary()`

These are not yet AI tool contracts. The package builder needs new typed AI command handlers around them so model-provided ids and package drafts get stricter validation, idempotency, audit, and safe error semantics.

## External service position

Use external services for model reasoning, structured outputs, optional tracing/evals, and optional provider routing. Do not outsource Archestimator's authorization or Apply logic.

Recommended:

- OpenAI Responses API for v1 tool loop and structured output;
- direct OpenAI SDK first for least moving parts;
- Vercel AI SDK only if streaming UI ergonomics justify it;
- Vercel AI Gateway later if model routing, budgets, and fallback become important;
- Supabase Postgres plus pgvector/RLS for user memory, files, and retrieval;
- OpenAI Evals or local eval fixtures before enabling Apply.

Not recommended for v1:

- generic browser agents as the production mutation path;
- generic knowledge-base SaaS as the source of truth for user project data;
- provider-owned memory for canonical user activity;
- multi-agent orchestration before one safe package-builder loop works.

## Current source notes

- OpenAI tools and function calling describe custom code tools and tool selection: https://developers.openai.com/api/docs/guides/tools and https://developers.openai.com/api/docs/guides/function-calling
- OpenAI structured outputs support schema-bound responses for app integrations: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI evals and agent evals are the right quality gate before write-capable behavior: https://developers.openai.com/api/docs/guides/evals and https://developers.openai.com/api/docs/guides/agent-evals
- Vercel AI Gateway can route OpenAI Responses-compatible calls after core semantics stabilize: https://vercel.com/docs/ai-gateway/ and https://vercel.com/docs/ai-gateway/sdks-and-apis/responses/
- Supabase AI/vector docs and RAG with permissions fit workspace-scoped retrieval: https://supabase.com/docs/guides/ai and https://supabase.com/docs/guides/ai/rag-with-permissions
