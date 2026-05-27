# AI Chatbot Agent Readiness Plan

**Date:** 2026-05-23
**Status:** research / audit / readiness only
**Implementation status:** no code implementation approved in this plan pack
**Primary product idea:** an authenticated Archestimator chatbot agent that can answer questions, draft estimate structures, and eventually create or edit projects, estimates, components, and proposal content through safe app-owned tools.

## Why this exists

Philip wants Archestimator users to type natural-language instructions such as:

> I have a 3 bedroom house project, 1 floor. Please create the project and fill up the sheets and the estimate sheet as well, fill up the components. I only have 5 million pesos for my budget.

The target experience is not a generic chatbot. It is an estimating copilot that can understand project intent, use the user's own projects/library/templates, create a sensible project/estimate/tree/row draft, and stay strictly inside that user's authenticated workspace data.

## Non-negotiable constraints

- No implementation in this planning task.
- The model must never receive broad database credentials, service-role keys, arbitrary SQL access, or cross-workspace data.
- AI reads and writes must execute through server-owned, user-scoped, RLS-backed app tools.
- Every write-capable tool must validate workspace/project/estimate ownership at the server or database boundary.
- The MVP should use grounding, tool calling, structured outputs, and evals before considering fine-tuning.
- The first launch should require user confirmation before writes that create, update, delete, or materially price estimate data.

## Recommended direction

Build an **Estimate Copilot** with three explicit modes:

1. **Ask**: answer questions about the current project, estimate, library, templates, and app workflow using read-only tools.
2. **Draft**: produce structured proposed changes, including project briefs, estimate tree nodes, row items, budget allocation, exclusions, assumptions, and uncertainty flags.
3. **Apply**: after explicit user confirmation, execute validated server-side actions that create or edit app records and write an audit trail.

Default model policy as of the fourth pass on 2026-05-23:

- **Primary production path:** OpenAI Responses API, `gpt-5.5`, `reasoning.effort: medium`, through an Archestimator-owned provider adapter for tool-heavy estimate creation/editing, budget reasoning, and Apply-adjacent planning.
- **OpenAI cost lane:** `gpt-5.4-mini` only for routing, extraction, title/summary generation, library-search synthesis, and simple read-only Ask turns after evals prove quality.
- **DeepSeek lane:** evaluation-only, synthetic/redacted fixtures only, until vendor privacy/compliance approval and provider-specific schema/tool evals pass. Do not send real tenant project/client/supplier/cost data to hosted DeepSeek in the first implementation plan.

The best implementation strategy is not "multi-provider first." It is **provider-ready, OpenAI-first**: keep app tools, schemas, evals, audit logs, and streaming events provider-neutral, but implement only the OpenAI adapter in Phase 1 unless a later approved eval plan adds DeepSeek.

## Files in this pack

- `01-current-state-and-repo-surface-audit.md` — current app, Supabase, and action surfaces the AI agent would need to call.
- `02-ai-model-and-platform-research.md` — current OpenAI model/tooling recommendations and source-backed research.
- `03-security-and-data-isolation-plan.md` — Supabase/RLS/tenant-isolation design for AI reads, writes, retrieval, and logs.
- `04-product-and-agent-ux-plan.md` — chatbot product model, interaction modes, user confirmations, and MVP workflow.
- `05-architecture-and-tool-contract-plan.md` — proposed server-side orchestration, tool taxonomy, schemas, and action boundaries.
- `06-evals-testing-and-readiness-gates.md` — evals, red-team cases, tenant-leakage tests, and go/no-go gates.
- `07-implementation-sequence-no-code-yet.md` — phased implementation plan for a later approved build.
- `08-open-questions-and-decisions.md` — decisions made in this plan and unresolved questions.
- `09-second-pass-visualization-and-ui-readiness-audit.md` — second-pass corrections for current chart route truth, visualization packages, and app UI standards.
- `10-third-pass-implementation-readiness-gate.md` — third-pass go/no-go checklist for moving from readiness into a scoped implementation plan.
- `11-fourth-pass-model-vendor-strategy.md` — fourth-pass model/vendor policy, including DeepSeek cost-vs-risk analysis and provider-readiness gates.
- `12-implementation-slice-log.md` — implementation-slice record for the DeepSeek Ask-only floating Copilot override.
- `13-package-builder-agent-readiness-and-architecture.md` — package-builder architecture for "assemble a 3 bedroom package" style prompts.
- `14-package-builder-agent-data-access-audit-and-memory-plan.md` — data-access, audit, memory, RAG, and Wisebase position for package-builder AI.
- `15-package-builder-agent-implementation-plan.md` — staged implementation plan from read tools to Draft, Apply, package transaction/RPC, and memory.
- `16-package-builder-agent-evals-and-ultraqa-plan.md` — eval fixtures, prompt-injection cases, rollout gates, and QA loop for write-capable AI.

## Sources used

- OpenAI Agents SDK docs: https://developers.openai.com/api/docs/guides/agents
- OpenAI GPT-5.5 guide: https://developers.openai.com/api/docs/guides/latest-model
- OpenAI GPT-5.5 model docs: https://developers.openai.com/api/docs/models/gpt-5.5
- OpenAI GPT-5.4 mini model docs: https://developers.openai.com/api/docs/models/gpt-5.4-mini
- OpenAI pricing docs: https://developers.openai.com/api/docs/pricing
- OpenAI tools/function calling docs: https://developers.openai.com/api/docs/guides/tools
- OpenAI structured outputs docs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI guardrails and human review docs: https://developers.openai.com/api/docs/guides/agents/guardrails-approvals
- OpenAI agent evals docs: https://developers.openai.com/api/docs/guides/agent-evals
- OpenAI SDK libraries docs: https://developers.openai.com/api/docs/libraries
- OpenAI TypeScript Agents SDK docs: https://openai.github.io/openai-agents-js/
- Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API security and grants docs: https://supabase.com/docs/guides/api/securing-your-api
- Supabase default API exposure changelog: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- Supabase secure data docs: https://supabase.com/docs/guides/database/secure-data
- Supabase Edge Function auth docs: https://supabase.com/docs/guides/functions/auth
- Supabase AI/vector docs: https://supabase.com/docs/guides/ai
- Supabase semantic search docs: https://supabase.com/docs/guides/ai/semantic-search
- Supabase RAG with permissions docs: https://supabase.com/docs/guides/ai/rag-with-permissions
- Vercel AI Gateway docs: https://vercel.com/docs/ai-gateway/
- Vercel AI Gateway Responses API docs: https://vercel.com/docs/ai-gateway/sdks-and-apis/responses/
- Sider Wisebase docs: https://sider.ai/en/help-center/feature-guides/wisebase
- React Flow / Xyflow docs: https://reactflow.dev
- Mermaid docs: https://mermaid.js.org
- D3 docs: https://d3js.org
- DeepSeek API pricing/model docs: https://api-docs.deepseek.com/quick_start/pricing
- DeepSeek function calling docs: https://api-docs.deepseek.com/guides/function_calling
- DeepSeek JSON Output docs: https://api-docs.deepseek.com/guides/json_mode
- DeepSeek reasoning model docs: https://api-docs.deepseek.com/guides/reasoning_model
- DeepSeek rate-limit/isolation docs: https://api-docs.deepseek.com/quick_start/rate_limit
- DeepSeek privacy policy: https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html
- DeepSeek Open Platform terms: https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html
