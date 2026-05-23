# 10 Third Pass Implementation Readiness Gate

**Date:** 2026-05-23
**Scope:** third-pass go/no-go audit for future implementation
**No implementation in this file.**

## Certainty statement

This plan pack is now much stronger, but no future AI implementation can be "100% sure" before code, tests, evals, and live tenant-isolation checks exist. The correct bar is:

- no known stale route/package/security claims in the plan;
- every remaining uncertainty is explicit;
- the first implementation slice is narrow enough to verify;
- go/no-go gates block unsafe expansion.

## Third-pass findings

### Current repo drift to account for

The component Library gained versioning, multiple price options, lifecycle-state history, and price-history behavior after the first AI plan pass. Future AI component matching must therefore preserve:

- component id;
- component version;
- lifecycle state;
- selected price option;
- price/source confidence;
- whether a price is current or historical.

An AI draft must not silently treat inactive, archived, draft, or historical prices as current budget truth.

### Current package state

Checked on 2026-05-23:

- `package.json` has no OpenAI SDK, Agents SDK, or Zod dependency.
- `openai@6.39.0` is available on npm and has peer dependencies on `ws` and `zod`.
- `@openai/agents@0.11.5` is available on npm and requires `zod@^4.0.0`.
- OpenAI's TypeScript Agents SDK docs recommend installing `@openai/agents zod` and expose agents, tools, context, structured outputs, sessions, human-in-the-loop, tracing, and eval/fine-tuning support.

Implementation implication:

- Use direct OpenAI SDK/Responses first for Phase 1/2.
- Use Agents SDK only if the implementation plan needs SDK sessions, handoffs, tracing, human-in-the-loop primitives, or multi-agent orchestration immediately.
- Do not add both without a written reason.

Fourth-pass model/vendor update:

- Keep the first production implementation OpenAI-first through a provider adapter.
- Add provider-ready contracts now, but do not implement a dual-provider production path in Phase 1.
- Treat `gpt-5.4-mini` as a low-risk cost lane only after evals prove the target task.
- Treat hosted DeepSeek as synthetic/redacted eval-only until vendor privacy/compliance and DeepSeek-specific schema/tool eval gates pass.

### Security gate

Implementation must not begin until the first slice names:

- exact auth boundary: route-bound server action or `src/app/api/ai/*` route handler with internal auth;
- AI-specific user-context function;
- AI-specific Supabase client helper that cannot use local admin DB bypass;
- exact workspace derivation function;
- minimal AI tables and RLS/grant policy shape;
- service-role exclusion rule;
- provider-send minimization policy;
- non-OpenAI vendor approval status;
- actor-only conversation visibility rule;
- two-user leakage test fixture shape.

If `src/app/api/ai/*` is used, route handlers must authenticate internally because `src/proxy.ts` bypasses `/api`.

Phase 1 is blocked until retention/redaction policy is explicit. Default: store safe summaries and hashes only, not raw prompts/messages.

### Efficiency gate

The first implementation should not attempt "create a full 3-bedroom estimate under 5M." The efficient build path is:

1. AI audit/log schema and RLS.
2. Estimate-workspace Ask mode with read-only tools.
3. Draft mode with structured, non-writing patches.
4. Apply mode for project + estimate shell only.
5. Later Apply expansion for tree nodes and rows.

This keeps each phase testable and prevents a large unsafe multi-table agent from landing before its boundaries are proven.

Initial limits before implementation:

- max input message: 8,000 characters;
- max 12 messages per minute per user and 30 per hour per workspace until telemetry exists;
- max 8 tool calls per run;
- max 25 rows returned per search tool;
- max Draft patch size: 30 nodes and 100 rows;
- max Phase 4 Apply scope: one project plus one estimate shell;
- hard reject requests that exceed limits instead of truncating into silent behavior changes.

## UI default

Phase 2 placement is fixed for implementation planning:

- route: `/workshop/projects/[projectId]/estimates/[nodeId]`;
- surface: right-dock mode/tab mutually exclusive with Library/Templates;
- no fourth column;
- desktop first; narrow/mobile Copilot behavior is deferred;
- states: collapsed trigger, Ask chat, Draft preview, validation errors, confirmation, post-Apply audit result.

## Schema/event defaults

Implementation planning should define Zod/JSON Schema equivalents for:

- `AskRequest`;
- `DraftPatch`;
- `ApplyRequest`;
- `ApplyResult`.

Draft patches use `operations[]` with `schemaVersion`, `operationId`, `group`, `action`, `target`, `before`, `after`, `source`, `confidence`, `warnings`, `validationErrors`, `selectable`, and `applyEligible`.

Stream events are:

- `message_delta`;
- `tool_start`;
- `tool_result`;
- `draft_validated`;
- `confirmation_required`;
- `apply_started`;
- `apply_completed`;
- `error`.

## Implementation-entry checklist

Before any code implementation starts, create or update a scoped implementation plan that answers:

- [ ] Does Phase 1 use a server action or `src/app/api/ai/*` route handler with internal auth?
- [ ] Does the implementation install only `openai` first, with `zod` only if schemas import it?
- [ ] Does the implementation define provider adapter types without enabling DeepSeek for real tenant data?
- [ ] Are primary, cost-lane, and eval-only models named with pass/fail gates?
- [ ] Is the provider-send policy explicit about fields that must never leave Archestimator?
- [ ] Is any non-OpenAI provider blocked until privacy/compliance approval and provider-specific evals pass?
- [ ] Which files are allowed to change in phase 1?
- [ ] What minimal tables/RLS/grants are added before chat persistence?
- [ ] What are the exact read-only tools for Ask mode?
- [ ] What is the typed schema for a Draft patch?
- [ ] What idempotency key prevents duplicate Apply records?
- [ ] What two-user test proves tenant isolation?
- [ ] What prompt-injection fixtures prove retrieved library/project text cannot steer tools?
- [ ] What UI proof shows the panel preserves 12px max app typography and fixed-shell behavior?

## Remaining non-blocking uncertainties

These are allowed to stay open until their phase:

- final AI audit table column names;
- retention period for chat messages;
- whether a later graph view earns `@xyflow/react`;
- whether future RAG uses Supabase pgvector or hosted file search.

These must not stay open at implementation time for their affected phase.

## Third-pass conclusion

The plan pack is ready for a scoped implementation plan, not direct coding. The next artifact should be a narrow Phase 1 implementation plan for read-only Ask mode plus audit/log/RLS groundwork, with explicit file touchpoints and validation commands.
