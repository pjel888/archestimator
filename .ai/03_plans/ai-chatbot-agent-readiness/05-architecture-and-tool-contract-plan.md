# 05 Architecture And Tool Contract Plan

**Date:** 2026-05-23
**Scope:** future technical architecture plan
**No implementation in this file.**

## Recommended architecture

```txt
Chat UI
  -> Next.js AI route / server action
    -> authenticated user context
    -> AI orchestrator
      -> AI provider adapter
        -> OpenAI Responses API through the direct `openai` SDK for first slice
      -> app-owned tools
        -> command validators
          -> existing repositories/server actions/RPCs
            -> Supabase RLS
      -> audit logs
  -> streamed response + draft patch preview
```

Route/auth caveat:

- If the AI endpoint is a route handler under `src/app/api/ai/*`, it must call trusted server auth itself before orchestration because `src/proxy.ts` bypasses `/api`.
- A route-bound server action still must derive user/workspace server-side and must not trust client-provided user metadata.
- No route placement option may accept `workspace_id` from the model or browser as authority.

Current package state:

- No OpenAI SDK or Agents SDK package is installed in `package.json` yet.
- Dependency choice remains part of the future approved implementation step.
- Current npm metadata checked on 2026-05-23: `openai@6.39.0` uses `zod` and `ws` peers; `@openai/agents@0.11.5` requires `zod@^4.0.0`.
- Default for Phase 1/2: install the direct `openai` SDK and use Responses API. Add `zod` as a direct dependency if implementation schemas import it.
- Defer `@openai/agents` until SDK sessions, handoffs, tracing, or human-in-the-loop primitives are explicitly required.
- `@nivo/pie` is already installed for project charts and should not be treated as a Copilot dependency.

Provider architecture rule:

- Phase 1 should be provider-ready but not multi-provider-first.
- Define provider-neutral app contracts for prompts, tool manifests, stream events, structured outputs, usage, telemetry, retries, and errors.
- Implement only `src/lib/ai/providers/openai/*` in the first approved code slice.
- A future `src/lib/ai/providers/deepseek/*` adapter must be added only after the vendor-risk and provider-eval gates pass.
- Do not leak OpenAI Responses item shapes into UI code, tool validators, audit tables, or eval fixtures.

Minimal future provider shape:

```ts
type AiProviderCapability = {
  toolCalls: boolean;
  parallelToolCalls: boolean;
  strictJsonSchema: boolean;
  jsonObjectMode: boolean;
  reasoningEffort: boolean;
  usageBreakdown: boolean;
  responseState: boolean;
};

type AiModelProfile = {
  provider: "openai" | "deepseek";
  model: string;
  purpose: "ask" | "draft" | "apply" | "route" | "eval";
  capabilities: AiProviderCapability;
  pricingKey: string;
};
```

The orchestrator owns:

- model selection;
- context assembly;
- tool registry;
- tool argument validation;
- confirmation state;
- audit correlation ids;
- response streaming;
- error handling.

The model owns:

- language understanding;
- tool-choice suggestions;
- draft patch construction;
- explanations;
- assumptions and uncertainty notes.

The model does not own:

- authentication;
- authorization;
- database connections;
- workspace ids;
- direct writes;
- confirmation bypass;
- raw SQL.

## Context assembly

Always include:

- product-level system contract;
- current route context, if available;
- authenticated user display context, not secrets;
- current workspace id only inside server code, not necessarily in model-visible text;
- selected project/estimate/node ids as constrained tool arguments only when needed.

Load dynamically and minimally:

- project summary;
- estimate tree summary;
- selected Area Node rows;
- component library search results;
- template search results;
- budget target;
- user message.

Do not dump the entire workspace into model context.

## Tool taxonomy

### Read tools

- `read_current_context`
- `read_project_summary`
- `read_estimate_summary`
- `read_estimate_tree`
- `read_area_rows`
- `search_component_library`
- `search_estimate_templates`

Future read tools, not registered in MVP:

- `search_prior_estimates`

### Draft tools

These may be pure model outputs or deterministic app helpers:

- `draft_project_brief`
- `draft_estimate_tree_patch`
- `draft_row_items_patch`
- `draft_budget_allocation`
- `validate_draft_patch`

### Apply tools

Phase 4 write tool, confirmation required:

- `apply_create_project_estimate_shell`

Future Phase 5+ write tools, not registered in MVP:

- `apply_create_estimate_nodes`
- `apply_insert_estimate_rows`
- `apply_update_estimate_rows`
- `apply_insert_template`

### Explicitly excluded from MVP tools

- `delete_project`
- `delete_estimate`
- `delete_rows`
- `delete_nodes`
- `move_tree_subtree`
- `run_sql`
- `read_workspace_members`
- `change_workspace_members`
- `admin_override`

## Proposed patch schema

Use a strict structured output for draft patches. The sample below is illustrative; implementation must define versioned schemas for `AskRequest`, `DraftPatch`, `ApplyRequest`, and `ApplyResult`.

```json
{
  "schemaVersion": 1,
  "mode": "draft",
  "intent": "create_project_estimate",
  "operations": [
    {
      "operationId": "op-project-1",
      "group": "project",
      "action": "create_project",
      "target": null,
      "before": null,
      "after": {
        "name": "3 Bedroom Single-Floor House",
        "currencyCode": "PHP",
        "budget": 5000000
      },
      "source": "user_brief",
      "confidence": "medium",
      "warnings": [],
      "validationErrors": [],
      "selectable": true,
      "applyEligible": true
    }
  ],
  "projectDraft": {
    "name": "3 Bedroom Single-Floor House",
    "clientName": null,
    "location": null,
    "currencyCode": "PHP",
    "budget": 5000000
  },
  "estimateDraft": {
    "name": "Initial Budget Estimate",
    "sheetCode": null
  },
  "treeDraft": [
    {
      "clientDraftId": "area-kitchen",
      "kind": "area",
      "name": "Kitchen",
      "parentClientDraftId": "group-house"
    }
  ],
  "rowDraft": [
    {
      "targetAreaClientDraftId": "area-kitchen",
      "libraryItemId": null,
      "material": "Kitchen floor finish allowance",
      "quantity": 1,
      "unit": "allowance",
      "unitCost": 0,
      "miscCost": 0,
      "confidence": "requires-user-review",
      "assumption": "No floor area was provided."
    }
  ],
  "budgetSummary": {
    "targetBudget": 5000000,
    "draftTotal": 0,
    "variance": -5000000,
    "currencyCode": "PHP"
  },
  "requiresConfirmation": true,
  "missingInputs": ["floor area", "finish level", "number of bathrooms"],
  "warnings": ["Costs are placeholders where no matching library item exists."]
}
```

Implementation should use a real TypeScript/Zod schema later, with:

- all fields required or explicitly nullable;
- `additionalProperties: false`;
- enums for modes, confidence, operation type, node kind;
- stable `operationId` values;
- `schemaVersion`;
- operation ordering;
- apply scopes;
- base record/version hashes where editing existing records;
- per-operation validation status;
- idempotency key on confirmed Apply requests;
- UUID validation for persisted ids;
- client-only draft ids for not-yet-persisted nodes;
- server-side normalization of money and quantities.

Stream event contract:

- `message_delta`;
- `tool_start`;
- `tool_result`;
- `draft_validated`;
- `confirmation_required`;
- `apply_started`;
- `apply_completed`;
- `error`.

Draft/Apply previews must not become actionable until schema validation completes.

## Validation layer

The validation layer should reject:

- workspace id from model;
- project id not in current workspace;
- estimate id not in project;
- row target not an Area Node;
- unsupported node kind;
- negative quantities/costs;
- too many nodes/rows in one run;
- row items with no material/name;
- hidden destructive operations;
- attempts to write directly from unconfirmed Draft mode.

## Tool result design

Tool results should be compact and structured:

- `status`;
- `targetIds`;
- `summary`;
- `validationErrors`;
- `warnings`;
- `nextAllowedActions`.

Avoid returning full table rows unless the next model step requires them.

## Idempotency and rollback

Every write-capable Apply command needs an idempotency key and a recovery policy before implementation:

- Create-project and create-estimate-shell should use a run-scoped idempotency key so retrying a timed-out request cannot create duplicates.
- Apply commands should write an `ai_action_runs` record before mutation, then update it with created ids, status, and recovery notes.
- Multi-table writes must happen in a transaction or a purpose-built RPC where partial state is either impossible or explicitly recorded.
- Draft mode must never reserve ids or create placeholder records in production tables.
- Generated client draft ids must be mapped to persisted ids only inside the confirmed Apply transaction.
- A failed Apply should return a deterministic recovery status: `rolled_back`, `partial_with_created_ids`, or `no_mutation_started`.

## First implementation touchpoints

The first implementation plan should name exact files before coding. Expected touchpoints are:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` for estimate route placement;
- `src/components/workshop/EstimateSheetContent.tsx` or a child component for right-dock integration;
- new `src/components/workshop/EstimateCopilotDock.tsx` or approved equivalent;
- `src/lib/auth/session.ts` for trusted user context reuse;
- a new AI-specific user-scoped auth/client helper that rejects dev admin DB bypass;
- `src/lib/repositories/workspace-repository.ts` for workspace derivation patterns;
- new AI command/orchestrator files under `src/lib/ai/` or an approved equivalent;
- optional `src/app/api/ai/*` route handlers only if they perform their own trusted auth check;
- Supabase migrations only after the AI audit/log schema is approved.
- generated Supabase types after migrations;
- future tests such as `tests/vitest/ai-schema.test.ts`, `tests/vitest/ai-tools-workspace-boundary.test.ts`, `tests/vitest/ai-apply-idempotency.test.ts`, and `tests/vitest/ai-stream-events.test.ts`.

## Audit design

Phase 1 should start with a minimal schema:

- `ai_action_runs`;
- `ai_tool_calls`;
- `ai_data_access_events`.

`ai_conversations` and `ai_messages` are optional until message retention is approved.

Every Ask, Draft, and Apply tool call should write safe audit/data-access metadata:

- `run_id`;
- optional `conversation_id`;
- `actor_user_id`;
- `workspace_id`;
- `project_id`;
- `estimate_id`;
- `tool_name`;
- `tool_args_hash`;
- source table names;
- filter hash;
- row count;
- model;
- model profile;
- provider response id;
- input/output/reasoning/cache token usage where available;
- estimated cost and currency;
- schema retry count;
- provider error code;
- latency;
- prompt/schema version;
- trace id;
- idempotency key when applicable;
- redaction status;
- `status`;
- `created_ids`;
- `error_code`;
- `safe_summary`;
- timestamps.

## Initial implementation target after approval

The first code slice should not be "create an entire 3-bedroom estimate."

Recommended first slice:

1. Chat UI shell in estimate workspace.
2. Read-only Ask mode.
3. `read_estimate_summary` and `search_component_library`.
4. No writes.
5. Two-user RLS tests.

Second slice:

1. Draft mode.
2. Strict patch schema.
3. No writes.
4. Eval dataset for estimate tree/row placement.

Third slice:

1. Apply mode for create project + create estimate shell only.
2. Confirmation modal.
3. Audit tables.
4. Mutation limits and rollback behavior.

Tree/row creation should be a later Apply expansion after the shell create path proves isolation, audit logs, and recovery behavior.
