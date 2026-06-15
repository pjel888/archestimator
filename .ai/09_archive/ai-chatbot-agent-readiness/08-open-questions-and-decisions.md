# 08 Open Questions And Decisions

**Date:** 2026-05-23
**Scope:** decisions and unresolved questions for AI chatbot readiness
**No implementation in this file.**

## Decisions from this planning pass

1. The AI feature should be an app-embedded Estimate Copilot, not a generic chatbot.
2. The MVP should use grounding, tool calling, structured outputs, validation, and evals before fine-tuning.
3. The model must never receive service-role credentials, arbitrary SQL, or direct database clients.
4. `workspace_id` must be derived server-side from the authenticated user, never accepted from model arguments.
5. Normal AI reads/writes should run through user-scoped Supabase clients and RLS.
6. Write-capable tools must be confirmation-gated.
7. The first implementation slice should be read-only Ask mode, not full project generation.
8. Retrieval/RAG should come after deterministic app-data tools unless a specific knowledge-search use case requires it earlier.
9. Destructive actions are out of MVP.
10. Every AI action needs auditability before Apply mode ships.
11. The first Copilot UI should not add a visualization dependency; use structured patch tables/lists with existing primitives first.
12. If a future approved slice needs an interactive AI plan graph, `@xyflow/react` is the preferred first candidate; `@nivo/pie` stays isolated to project estimate comparison charts.
13. Full AI conversation/message content should default to actor-only visibility; workspace admins may get safe summaries/action metadata for audit if product policy requires it.
14. First implementation defaults to direct OpenAI Responses API through the `openai` SDK; defer `@openai/agents` until sessions, handoffs, tracing, or SDK human-in-the-loop primitives are required.
15. First UI placement is `/workshop/projects/[projectId]/estimates/[nodeId]` as a right-dock mode/tab mutually exclusive with Library/Templates, not a fourth column.
16. MVP registered Apply tool is `apply_create_project_estimate_shell` only. Tree, row, template, and update Apply tools are future Phase 5+.
17. AI Ask/Draft tools require data-access audit events, not only Apply action logs.
18. Fourth-pass model policy is provider-ready but OpenAI-first: implement OpenAI Responses first through an internal provider adapter.
19. `gpt-5.4-mini` is a cost-lane candidate only for low-risk routing/extraction/summary work after evals prove it.
20. Hosted DeepSeek is evaluation-only with synthetic/redacted fixtures until vendor privacy/compliance, provider-send policy, and DeepSeek-specific schema/tool eval gates pass.
21. DeepSeek reasoning models must not be used for the first live tool-calling path if the selected DeepSeek API mode does not support function calling.

## Open product questions

1. Should the first user persona be residential contractor, fit-out contractor, small commercial contractor, or design-build firm?
2. What default assumptions should Archestimator use for a vague "3 bedroom house" brief?
3. Should the Copilot ask clarifying questions first, or produce a labeled rough draft when the user asks it to proceed?
4. What is the minimum viable estimate quality: shell/tree only, row placeholders, or priced row items?
5. Should AI-generated rows be visually labeled differently in the sheet?
6. Should the user be able to choose "conservative", "standard", or "budget" finish levels?
7. Should the Copilot be allowed to use shipped default templates if the user's workspace has no data?
8. What is the acceptable monthly AI spend during MVP?
9. Should AI chat history be retained by default, and for how long?
10. What customer data should never be sent to external AI providers?
11. Will Archestimator ever approve hosted DeepSeek for real tenant data, given provider privacy, training/retention, and data-residency implications?

## Open technical questions

1. Should Phase 1 use a route-bound server action or `src/app/api/ai/*` route handler with internal auth?
2. Should the AI command layer wrap existing server actions or create separate domain command handlers?
3. What exact minimal audit DDL should be used for `ai_action_runs`, `ai_tool_calls`, and `ai_data_access_events`?
4. Should raw conversation messages ever be stored, or should Phase 1 store safe summaries only?
5. Which eval runner should be used in repo tests?
6. Should model outputs stream as `message_delta` before tool calls complete, or should draft previews wait for full validation?
7. What evidence would justify adding `@xyflow/react` after the no-new-package MVP patch preview?
8. Should future RAG use Supabase pgvector only, OpenAI hosted file search, or both?
9. What pass thresholds are required before `gpt-5.4-mini` or DeepSeek can take over any production traffic from `gpt-5.5`?
10. What exact provider audit fields and cost calculation source should be used for each model lane?

## Recommended next decision

Approve or revise this narrow MVP sequence:

1. AI audit/logging schema.
2. Read-only Ask mode in estimate workspace.
3. Draft patch mode.
4. Confirmation-gated Apply mode for creating a new project + estimate shell only.

This keeps the first implementation useful while avoiding the unsafe jump straight to autonomous multi-table estimate creation.
