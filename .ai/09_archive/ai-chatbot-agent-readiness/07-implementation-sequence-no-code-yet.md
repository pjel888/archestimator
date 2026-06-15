# 07 Implementation Sequence No Code Yet

**Date:** 2026-05-23
**Scope:** future phased implementation plan after approval
**Current status:** not approved for implementation

## Phase 0: readiness audit completion

Deliverables:

- this plan pack reviewed;
- security model accepted;
- MVP scope selected;
- open questions answered;
- model/vendor budget constraints approved.

Exit criteria:

- Philip approves moving from readiness to implementation planning.
- The implementation plan fixes these defaults before code:
  - direct OpenAI Responses API via `openai` SDK versus Agents SDK;
  - primary model, OpenAI cost lane, and DeepSeek eval-only policy;
  - vendor-risk approval status before any non-OpenAI provider receives real tenant data;
  - server action versus `src/app/api/ai/*` route handler;
  - exact command-handler ownership under `src/lib/ai/*`;
  - minimal AI audit/log DDL;
  - stream event protocol;
  - failed Apply recovery behavior.

## Phase 1: data and security foundation for AI logs

Deliverables:

- provider adapter types and telemetry schema, while implementing only the OpenAI provider later in Phase 2;
- migrations for minimal AI action/tool/data-access audit tables;
- RLS policies;
- explicit grants;
- no service-role in normal path;
- AI-specific user-scoped Supabase helper that rejects admin DB bypass;
- tests for two-user isolation;
- idempotency-key strategy for future write commands.

Notes:

- This phase should not call OpenAI yet.
- This phase should not call DeepSeek or any other external provider yet.
- It proves the app can store AI action/data-access metadata safely.
- Do not create raw `ai_messages` storage until message retention and redaction policy are approved.

## Phase 2: read-only Ask mode

Deliverables:

- protected chat UI shell at `/workshop/projects/[projectId]/estimates/[nodeId]`;
- right-dock mode/tab that is mutually exclusive with the Library/Templates panel, not a fourth column;
- server route/orchestrator;
- read-only tools:
  - `read_project_summary`;
  - `read_estimate_summary`;
  - `read_area_rows`;
  - `search_component_library`;
  - `search_estimate_templates`;
- streamed answer UI;
- stream events for `message_delta`, `tool_start`, `tool_result`, and `error`;
- prompt-injection tests.
- OpenAI adapter only, unless a separate approved provider-eval plan is added.

Exit criteria:

- no writes possible;
- data-access audit events exist for read tools;
- user-scoped read tests pass;
- manual protected-route smoke passes.

## Phase 3: Draft mode with structured patches

Deliverables:

- strict patch schema;
- model outputs draft project/estimate/tree/row changes;
- app validates patch without applying it;
- UI preview for proposed changes;
- evals for placement, budget, and missing inputs.

Exit criteria:

- draft patches validate deterministically;
- bad patches show actionable validation errors;
- no database writes occur in Draft mode.
- component matches preserve lifecycle state, component version, price option, and source/confidence metadata.

## Phase 4: Apply mode for narrow create flow

Start with one write path:

- create project;
- create estimate shell only.

Tree node creation and row insertion should remain in Draft mode until the project+estimate Apply path has proven auditability, rollback behavior, and two-user write isolation.

Rules:

- explicit confirmation required;
- audit run required;
- mutation limit required;
- idempotency key required;
- no delete tools;
- no editing existing issued/archived estimates.

Exit criteria:

- two-user write isolation tests pass;
- audit records exist for every tool call;
- retrying the same confirmed request cannot duplicate the project/estimate shell;
- failed apply leaves no partial broken project/estimate shell or clearly reports partial state with recovery.

## Phase 5: existing estimate edit flow

Add after Phase 4 is stable:

- create tree nodes in a new or selected estimate;
- insert row items into a new estimate only;
- insert rows into selected Area Node;
- update quantities and misc costs;
- replace placeholder rows with library items;
- insert templates into selected Group Node.

Rules:

- existing project/estimate must be loaded through current workspace;
- row target must be Area Node;
- template target must be valid Group Node or allowed parent;
- user can preview and selectively apply.

## Phase 6: retrieval/RAG

Add only if deterministic search is insufficient:

- workspace-scoped document/chunk/embedding tables;
- vector search RPCs;
- source citation UI;
- leakage tests for similar docs across workspaces.

## Phase 7: autonomy expansion

Only after evals show stable behavior:

- multi-step apply plans;
- richer template recommendations;
- proposal section drafting;
- cost review suggestions;
- optional background checks.

Potential second-provider work belongs here or in a separate approved cost-optimization phase, after Ask/Draft/Apply safety gates exist. Hosted DeepSeek remains eval-only with synthetic/redacted fixtures until the vendor approval gate passes.

Still excluded:

- destructive actions without separate approval;
- admin operations;
- cross-workspace learning from private data.

## Validation commands for future code work

Baseline commands likely required after implementation starts:

```bash
bun run validate
bun run build
git diff --check
```

Additional expected future tests:

- focused unit tests for AI schemas/tools;
- Supabase RLS tests;
- Vitest DOM tests for chat preview/confirmation;
- Playwright protected-route smoke for Ask/Draft/Apply.
