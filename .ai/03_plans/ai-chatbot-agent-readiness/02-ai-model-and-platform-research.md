# 02 AI Model And Platform Research

**Date:** 2026-05-23
**Scope:** source-backed research for future Archestimator AI integration
**No implementation in this file.**

## Short recommendation

Use the OpenAI **Responses API** from a server-owned orchestration layer for Phase 1/2. Keep the **Agents SDK** as a later option if sessions, handoffs, tracing, or SDK human-in-the-loop primitives become necessary. Do not embed a generic hosted chatbot that can directly read or write the database.

Fourth-pass correction: OpenAI is the first implementation provider, not the architecture boundary. Archestimator-owned contracts must own tools, schemas, evals, telemetry, audit logs, streaming events, and confirmation state. Provider adapters translate those contracts to provider APIs.

Third-pass implementation note:

- If using the lower-level OpenAI SDK, current npm metadata checked on 2026-05-23 shows `openai@6.39.0` with peer dependencies on `ws` and `zod`.
- If using the TypeScript Agents SDK, current npm metadata checked on 2026-05-23 shows `@openai/agents@0.11.5` with peer dependency `zod@^4.0.0`.
- The repo currently has no OpenAI SDK, Agents SDK, or Zod dependency installed. A future implementation plan must choose one path and include the dependency change explicitly.
- OpenAI's TypeScript Agents SDK docs recommend `npm install @openai/agents zod` and describe Agents as LLMs configured with instructions, model settings, tools, context, and structured outputs.
- For the first Archestimator slice, a direct Responses/OpenAI SDK route may be more efficient than adopting the full Agents SDK unless the implementation needs built-in sessions, handoffs, tracing, or human-in-the-loop SDK primitives immediately.

Start with:

- `gpt-5.5`, `reasoning.effort: medium`, for estimate planning, budget reasoning, tool-heavy editing, and proposal/scope drafting.
- Lower reasoning effort for fast read-only chat turns after evals prove quality.
- Smaller models only for routing, lightweight extraction, title generation, or safety classifiers.

## Fourth-pass model policy

The best current policy is **OpenAI-first, provider-ready, DeepSeek-eval-only**.

| Lane | Model/provider | Use first for | Do not use first for | Reason |
| --- | --- | --- | --- | --- |
| Primary production | OpenAI `gpt-5.5` through Responses API | Draft mode, budget reasoning, tool-heavy Ask, Apply-adjacent planning, proposal/scope drafting | Cheap bulk classification | Best fit for complex tool-heavy work and strict structured outputs in the current plan. |
| OpenAI cost lane | OpenAI `gpt-5.4-mini` | Intent routing, extraction, title/summary generation, library-search synthesis, simple read-only Ask after evals | First-pass Apply planning or high-risk budget decisions | Much cheaper than the primary lane, but still needs Archestimator eval parity. |
| DeepSeek eval lane | DeepSeek chat/pro models through an OpenAI-compatible Chat Completions adapter | Synthetic/redacted evals for routing, summarization, library-search synthesis, and structured Draft experiments | Real tenant data, Apply mode, budget-sensitive write planning | Pricing is attractive, but privacy/compliance, data residency, function-calling, and JSON-mode caveats require separate gates. |
| Not recommended first | DeepSeek reasoning model | Offline/synthetic reasoning benchmarks only | Live tool-calling agent path | Official DeepSeek docs say the reasoning model does not support function calling, so it is not a fit for the first tool-driven Copilot path. |

DeepSeek may be worth considering because its official pricing is low compared with premium frontier models, and its API offers OpenAI-compatible integration paths. It is not the best first production default for Archestimator because the first AI feature will process tenant-scoped construction budgets, project/client notes, supplier/library data, and potentially proposal/spec content. Cost does not outweigh the need for predictable structured outputs, vendor data controls, and production-grade privacy posture.

Hosted DeepSeek is blocked from real tenant data until all of these are true:

- vendor privacy/compliance packet, data residency terms, retention controls, training/opt-out terms, and subprocessors are reviewed and accepted;
- Archestimator has a user-facing AI processing disclosure and consent/legal-basis story for the provider;
- evals use the exact DeepSeek model/API mode and pass schema validity, tool-argument conformance, prompt-injection, budget math, tenant leakage, latency, retry, and cost thresholds;
- provider audit logs include provider, model, base URL, provider response id, redaction status, fields sent, cache metadata where available, policy version, and privacy-notice/consent version;
- a fallback to the OpenAI primary lane is tested.

If DeepSeek is later approved, implement it as a separate provider adapter. Do not pretend DeepSeek Chat Completions are equivalent to OpenAI Responses.

## Why not train/fine-tune first

The user asked whether the AI needs to be "trained on our app."

For MVP, the answer is **no**. The correct first path is:

1. Give the model a concise product/system contract.
2. Ground it with user-scoped app data through tools/retrieval.
3. Use function calling with strict schemas for actions.
4. Validate every tool call in app code and RLS.
5. Build evals and red-team cases.
6. Consider fine-tuning only after there is stable usage data and clear eval evidence that prompting/tools/retrieval cannot solve a repeated behavior gap.

Fine-tuning would not solve tenant isolation, permission checks, budget correctness, or app action safety. Those are product architecture and security problems.

## OpenAI platform guidance

OpenAI's current Agents SDK guidance describes agents as applications that plan, call tools, collaborate across specialists, and maintain enough state for multi-step work. It recommends the SDK path when the application owns orchestration, tool execution, approvals, and state. That fits Archestimator because the app must own Supabase access, workspace validation, write confirmation, and audit logs.

OpenAI's GPT-5.5 guide says GPT-5.5 is a strong fit for complex production workflows, tool-heavy agents, grounded assistants, and customer-facing workflows where execution quality matters. It recommends the Responses API for reasoning, tool-calling, and multi-turn use cases, and recommends benchmarking models against accuracy, latency, and token use.

OpenAI's structured outputs guidance says function calling is the right path when connecting models to tools, functions, data, or UI actions. Structured output schemas should be used for model responses and tool arguments instead of prompt-only JSON formatting.

OpenAI's guardrails and human-review guidance says:

- input guardrails block bad requests before the main model runs;
- output guardrails validate or redact final responses;
- tool guardrails validate function arguments/results;
- human review should pause before side effects like edits or sensitive actions.

OpenAI's agent eval guidance recommends traces, graders, datasets, and eval runs for agent workflows. For Archestimator, evals should exist before expanding autonomy.

## Product-specific model policy

Recommended initial model policy:

| Use case | Model direction | Notes |
| --- | --- | --- |
| Natural-language project/estimate creation | `gpt-5.5`, medium reasoning | Needs multi-step reasoning and tool planning. |
| Budget-aware component allocation | `gpt-5.5`, medium or high after evals | High business risk; require draft and user confirmation. |
| Explain current estimate | `gpt-5.5`, low/medium | Read-only, can use narrower context. |
| Search component library | model + deterministic retrieval | Prefer app search first, model synthesis second. |
| Classify request intent | smaller model after evals | Route to Ask/Draft/Apply. |
| Extract structured project brief | smaller model possible | Must validate schema and ask clarification on missing fields. |
| Proposal/scope wording | `gpt-5.5`, medium | Output should be editable draft, not issued truth. |

Provider-specific additions:

- Use `gpt-5.4-mini` only after it passes the same fixtures as `gpt-5.5` for the target low-risk purpose.
- Use DeepSeek only in redacted/synthetic evals until the vendor gate clears.
- Never use a model that cannot pass strict app-side schema validation for Apply-adjacent workflows, even if it is cheaper.

## Tooling recommendation

Use app-owned tools with narrow names and contracts:

- `get_current_workspace_context`
- `search_component_library`
- `search_estimate_templates`
- `read_project_summary`
- `read_estimate_tree_summary`
- `read_area_rows`
- `draft_project_from_brief`
- `draft_estimate_tree`
- `draft_estimate_rows`
- `validate_estimate_patch`
- `apply_confirmed_estimate_patch`
- `create_audit_note`

Do not expose:

- raw SQL;
- arbitrary Supabase table clients;
- broad `read_all_user_data`;
- `service_role` clients;
- delete tools in MVP;
- direct project or estimate mutations without validation and confirmation.

## Retrieval recommendation

Use retrieval only where it adds value:

- user's own component library rows;
- user's reusable templates;
- user's prior projects/estimates, only within their workspace;
- project uploaded documents/specs, only within that project/workspace;
- curated construction estimating knowledge, if separately approved.

For MVP, prioritize structured database search over vector RAG:

1. Deterministic filters for workspace, project, category, supplier, template.
2. Keyword/fuzzy search over library names/descriptions.
3. Vector search later, only with workspace-scoped embeddings and leakage tests.

## Prompt-injection posture

Untrusted content includes:

- project names/descriptions;
- client notes;
- uploaded PDFs/specs;
- supplier names/descriptions;
- component descriptions;
- old AI outputs;
- chat user messages.

Rules:

- Never place untrusted content in developer/system messages.
- Treat retrieved content as data, not instructions.
- Make all writes pass typed schema validation and server-side policy checks.
- Tool results should include source ids and confidence/uncertainty metadata.
- The assistant must cite uncertainty when costs or quantities are inferred.

## Source links

- OpenAI Agents SDK: https://developers.openai.com/api/docs/guides/agents
- OpenAI GPT-5.5 guide: https://developers.openai.com/api/docs/guides/latest-model
- OpenAI tools/function calling: https://developers.openai.com/api/docs/guides/tools
- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI guardrails and human review: https://developers.openai.com/api/docs/guides/agents/guardrails-approvals
- OpenAI agent evals: https://developers.openai.com/api/docs/guides/agent-evals
- OpenAI GPT-5.5 model docs: https://developers.openai.com/api/docs/models/gpt-5.5
- OpenAI GPT-5.4 mini model docs: https://developers.openai.com/api/docs/models/gpt-5.4-mini
- OpenAI pricing docs: https://developers.openai.com/api/docs/pricing
- DeepSeek API pricing/model docs: https://api-docs.deepseek.com/quick_start/pricing
- DeepSeek function calling docs: https://api-docs.deepseek.com/guides/function_calling
- DeepSeek JSON Output docs: https://api-docs.deepseek.com/guides/json_mode
- DeepSeek reasoning model docs: https://api-docs.deepseek.com/guides/reasoning_model
- DeepSeek rate-limit/isolation docs: https://api-docs.deepseek.com/quick_start/rate_limit
- DeepSeek privacy policy: https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html
- DeepSeek Open Platform terms: https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html
