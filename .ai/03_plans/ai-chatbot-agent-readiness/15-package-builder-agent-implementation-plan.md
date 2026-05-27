# 15 Package Builder Agent Implementation Plan

**Date:** 2026-05-27
**Status:** implementation plan, not yet executed
**Scope:** staged path from current Ask-only Ask Flip to package-builder Draft/Apply
**No app code changes in this file.**

## Implementation principle

Do not jump directly from Ask-only to "AI creates a full 3-bedroom package." Build the capability in slices where each slice proves one risk boundary.

The safe sequence is:

1. typed read tools;
2. non-writing draft schema;
3. preview UI;
4. project plus estimate shell Apply;
5. tree Apply;
6. template/component row Apply;
7. user memory and file retrieval;
8. activity-based ranking and feedback loops.

## Phase 0 - feature flags and schema planning

Goal:

- prepare the codebase without enabling new AI behavior.

Artifacts:

- feature flags:
  - `AI_PACKAGE_BUILDER_READ_TOOLS_ENABLED`;
  - `AI_PACKAGE_BUILDER_DRAFT_ENABLED`;
  - `AI_PACKAGE_BUILDER_APPLY_SHELL_ENABLED`;
  - `AI_PACKAGE_BUILDER_APPLY_ROWS_ENABLED`;
  - `AI_PACKAGE_BUILDER_MEMORY_ENABLED`.
- schema files under a new `src/lib/ai/package-builder/` area:
  - request schema;
  - route context schema;
  - package brief schema;
  - package draft schema;
  - apply request schema;
  - apply result schema.

Tests:

- schema accepts a valid 3-bedroom package request;
- schema rejects unsupported operation types;
- schema rejects unknown properties;
- schema rejects negative quantities/costs;
- schema rejects model-supplied workspace id.

## Phase 1 - read tools only

Goal:

- let Ask Flip answer with real scoped app context without writes.

Build:

- AI auth helper that derives user/workspace and rejects admin DB bypass;
- read tool registry;
- read tool audit wrappers;
- compact summary mappers.

Initial tools:

- `read_current_workspace_context`;
- `list_accessible_projects`;
- `read_project_summary`;
- `list_project_estimates`;
- `read_estimate_tree`;
- `read_area_rows`;
- `search_component_library`;
- `search_estimate_templates`.

Implementation notes:

- wrap existing repository functions rather than exposing them directly;
- keep row limits low;
- filter component rows by workspace and lifecycle state;
- return price/source summaries, not full raw rows;
- record `ai_data_access_events` for every read.

Likely files:

- `src/app/api/ai/ask/route.ts` or a new `src/app/api/ai/package-builder/route.ts`;
- `src/lib/ai/auth.ts`;
- `src/lib/ai/audit.ts`;
- new `src/lib/ai/tools/read-tools.ts`;
- new `src/lib/ai/tools/tool-audit.ts`;
- `tests/vitest/ai-tools-workspace-boundary.test.ts`;
- `tests/vitest/ai-read-tools-audit.test.ts`.

Do not:

- add writes;
- use service role for normal reads;
- send full library dumps to the provider.

## Phase 2 - Draft package planner

Goal:

- generate validated package drafts with no production writes.

Build:

- OpenAI Responses provider adapter;
- strict structured output schema;
- package brief extractor;
- package draft validator;
- deterministic budget calculator;
- row/source traceability.

Draft algorithm:

1. Normalize the user prompt into a package brief.
2. Ask at most one clarifying question only when required for safe output.
3. Search templates and component library by room/category.
4. Create a proposed tree.
5. Map components/templates to each area.
6. Fill gaps with allowance rows marked as unpriced or low confidence.
7. Validate totals and warnings.
8. Return a preview-ready draft.

For the example prompt, the draft should include at minimum:

- project shell;
- estimate shell;
- House group;
- Bedroom 1, Bedroom 2, Bedroom 3;
- Dining;
- Kitchen;
- Living;
- Bathroom allowance if bathroom count is missing;
- general/preliminaries allowance or template if available;
- furniture/components from the user's library where available;
- assumptions for missing area and finish level.

Tests:

- a 3-bedroom PHP 5,000,000 prompt yields a valid draft;
- missing floor area creates assumptions rather than fake precision;
- no draft operation is apply-eligible if required source/target data is missing;
- draft total calculation matches deterministic calculator;
- provider malformed JSON is retried or rejected safely.

## Phase 3 - preview UI

Goal:

- show the package draft in Ask Flip without creating records.

Build:

- draft card in Ask Flip;
- room/tree preview;
- component match table;
- unmatched allowance table;
- budget summary;
- warnings;
- "Apply selected" disabled unless the server says the draft is apply eligible;
- "Revise draft" action.

Rules:

- no hidden Apply;
- no automatic Apply from a follow-up model message;
- show source/confidence per row;
- show assumptions near totals;
- show if rows are real library matches or allowances.

Likely files:

- `src/components/workshop/EstimateCopilotFloatingButton.tsx` or extracted Ask Flip components;
- new `src/components/workshop/AskFlipPackageDraftPreview.tsx`;
- focused UI tests under `tests/vitest/`.

## Phase 4 - Apply shell only

Goal:

- create a project plus estimate shell from a confirmed draft.

Build:

- `apply_create_project_estimate_shell`;
- idempotency key table or idempotency fields in `ai_action_runs`;
- created id recording;
- recovery status.

Behavior:

- user confirms a validated draft;
- server re-loads draft by id;
- server checks draft hash and feature flag;
- server creates project with server-derived workspace id;
- server creates estimate shell or default estimate tree;
- server records created ids;
- response returns links to created project/estimate.

Important:

- use a command handler, not direct model execution of current form actions;
- do not redirect from the command handler;
- return structured ids/results for the UI;
- retry with same idempotency key must not create duplicate records.
- treat existing form/server actions as reference behavior, not the final AI contract.

Tests:

- Apply shell succeeds for current workspace;
- Apply shell rejects stale draft hash;
- Apply shell rejects another user's draft;
- idempotency replay returns the first created ids;
- audit rows include created ids and safe summary.

## Phase 5 - Apply tree

Goal:

- create approved estimate tree nodes.

Build:

- `apply_create_estimate_tree`;
- parent/child draft id mapping;
- group/area hierarchy validator;
- max node count;
- transaction/RPC to create nodes and history events.

Rules:

- Group Nodes can organize;
- Area Nodes own rows;
- unsupported nesting fails before mutation;
- created nodes map from client draft ids to persisted ids.

Tests:

- valid tree applies;
- invalid nesting fails;
- duplicate draft ids fail;
- retry does not duplicate nodes;
- two-user isolation holds.

## Phase 6 - Apply package transaction/RPC

Goal:

- replace piecemeal apply calls with one server-owned package apply boundary for full package creation.

Build one of:

- `apply_ai_package_builder_draft` command handler with explicit transaction support; or
- `create_project_estimate_package_with_history` RPC that validates and writes the package in the database.

Inputs:

- acting user id derived server-side;
- idempotency key;
- confirmed draft id;
- confirmed draft hash/version;
- package metadata;
- project fields;
- estimate fields;
- tree nodes;
- row items;
- library source ids and price option ids;
- source snapshots;
- budget target.

Outputs:

- created project id;
- created estimate id;
- first/selected node id;
- created node ids;
- inserted row count;
- package total;
- warnings;
- recovery status.

Rules:

- create project, estimate, tree, rows, AI audit records, and estimate history records in one recoverable boundary;
- reject stale or inactive component prices;
- reject rows targeting non-Area Nodes;
- reject fallback/static rows unless explicitly marked as non-writable allowances;
- reject malformed budget or missing required confirmation;
- avoid partial shells on failure unless the recovery status records created ids and next steps.

This phase may be implemented before row Apply if the codebase needs a durable transaction boundary first.

Tests:

- full package apply succeeds in one recoverable command;
- rollback leaves no partial package on validator failure;
- partial failure records created ids only when rollback is impossible;
- audit action run, tool calls, data access, and estimate events share correlation/idempotency ids;
- two-user write isolation holds.

## Phase 7 - Apply templates and component rows

Goal:

- fill the estimate with approved templates and component rows.

Build:

- `apply_insert_template`;
- `apply_insert_component_rows`;
- source snapshot preservation;
- library item/price option freshness check;
- max row count;
- allowance row policy.

Rules:

- prefer existing `insert_estimate_template_into_estimate` and `insertEstimateRowItemFromLibrary` behavior behind AI command handlers;
- every linked row stores source library item and source snapshot;
- unlinked allowance rows must be clearly marked and optionally disabled for first row Apply;
- stale/inactive price options need review before Apply.

Tests:

- matched library item inserts with source snapshot;
- stale price option is rejected or warning-blocked;
- row target must be Area Node;
- cross-workspace library item fails;
- idempotency replay does not duplicate rows.

## Phase 8 - user memory and file retrieval

Goal:

- personalize package suggestions from user-approved data.

Build:

- explicit preferences;
- accepted/rejected AI draft feedback;
- optional document ingestion;
- embeddings with workspace/project/user filters;
- scoped retrieval tool.

Rules:

- memory is user-visible and resettable;
- file retrieval is opt-in;
- all chunks carry workspace/project/user scope;
- retrieval emits data access audit events;
- no raw files are sent wholesale to provider.

## Phase 9 - package quality loop

Goal:

- improve draft quality based on evals and accepted user outcomes.

Build:

- fixture dataset;
- local eval runner;
- provider eval runner if approved;
- prompt/schema version history;
- regression thresholds;
- latency/cost monitoring.

Signals:

- package brief accuracy;
- room program completeness;
- component match quality;
- budget variance accuracy;
- assumption quality;
- refusal/block correctness;
- tenant isolation.

## First concrete implementation slice recommendation

After this planning pass, the next code slice should be:

1. Add package-builder schemas and fixture tests.
2. Add read-only `search_component_library` and `search_estimate_templates` AI tools with audit events.
3. Keep Ask Flip unable to write.
4. Add one synthetic eval for the 3-bedroom PHP 5,000,000 package draft.

This gives the agent real grounding without crossing the write boundary.

## Verification commands for future implementation

Run targeted checks first:

```bash
bun run test:dom tests/vitest/ai-ask-route.test.ts tests/vitest/estimate-copilot-floating-button.test.tsx
bun test tests/vitest/ai-package-builder-schema.test.ts
bun test tests/vitest/ai-tools-workspace-boundary.test.ts
bun test tests/vitest/ai-read-tools-audit.test.ts
```

Then run broader checks before claiming a write-capable slice:

```bash
bun run type-check
bun run build
bun run lint:font-size
git diff --check
```

For any implemented Apply path, add browser smoke only after local tests pass.
