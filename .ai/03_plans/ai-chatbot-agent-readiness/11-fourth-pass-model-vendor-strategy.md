# 11 Fourth Pass Model Vendor Strategy

**Date:** 2026-05-23
**Scope:** model/vendor strategy for future AI Copilot implementation
**No implementation in this file.**

## Certainty statement

The plan can be made implementation-ready, but it cannot be 100% guaranteed before code, tests, evals, and live two-user isolation checks exist. The correct bar is high confidence with explicit gates. This fourth pass raises confidence by making the model/vendor decision concrete and blocking unsafe cost optimizations.

## Recommendation

Use an **OpenAI-first, provider-ready** architecture.

- Primary production model: OpenAI `gpt-5.5` through Responses API with `reasoning.effort: medium`.
- Cost lane: OpenAI `gpt-5.4-mini` only for low-risk routing, extraction, summaries, and simple read-only Ask after evals pass.
- DeepSeek: evaluation-only with synthetic/redacted fixtures until privacy/compliance approval and DeepSeek-specific structured-output/tool evals pass.

Do not build a full multi-provider production system in Phase 1. Build provider-neutral app contracts and one concrete OpenAI adapter. Add a DeepSeek adapter later only if the eval and vendor gates justify it.

## Why not DeepSeek first

DeepSeek's pricing and OpenAI-compatible API shape make it worth evaluating. It is not the safest first production default for Archestimator because the app will process tenant-scoped budgets, project briefs, client notes, supplier/library records, and eventually proposal/spec content.

The official DeepSeek documentation and policy surfaces introduce risks that must be handled before real tenant data is sent:

- hosted privacy/data handling and possible provider-side improvement/training use;
- PRC storage/processing implications;
- downstream developer responsibility for user disclosure, legal basis, and data-rights handling;
- provider cache/isolation behavior that must use server-derived non-PII identifiers;
- JSON Output and function-calling behavior that is not the same as strict OpenAI structured-output parity;
- reasoning-model paths that may not support live tool calling.

## Provider gates

DeepSeek or any other non-primary provider may handle real tenant data only after:

- vendor privacy/compliance approval is documented;
- data residency, retention, training/opt-out, subprocessors, and DPA/security packet are reviewed;
- user-facing AI processing disclosure and consent/legal-basis policy exist;
- provider-send minimization policy names fields allowed and prohibited;
- exact model/API mode is named;
- provider adapter normalizes stream events, tool calls, structured outputs, errors, usage, and telemetry;
- provider-specific evals pass on schema validity, tool-argument conformance, budget math, prompt injection, tenant leakage, empty JSON, retry behavior, latency, and cost per successful task;
- fallback to the OpenAI primary lane is tested.

## Implementation shape

Future code should define provider-neutral contracts such as:

```ts
type AiModelPurpose = "ask" | "draft" | "apply" | "route" | "eval";

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
  purpose: AiModelPurpose;
  capabilities: AiProviderCapability;
  pricingKey: string;
};
```

Provider-specific response shapes must stay inside provider adapters. UI, tools, validators, evals, and audit tables should consume Archestimator-owned events and schemas only.

## Audit and cost telemetry

Every AI run should record:

- provider and model;
- model profile/purpose;
- provider response id;
- input/output/reasoning/cache token counts where available;
- estimated cost and currency;
- retry count and schema retry count;
- tool-call count;
- provider error code;
- redaction status and field categories sent;
- provider policy version and privacy-notice/consent version.

This is required before cost-based routing can be trusted.

## Decision

The best model choice for first implementation is still OpenAI `gpt-5.5` for the high-risk Copilot path, with `gpt-5.4-mini` as the first cheaper lane after evals. DeepSeek should be researched and benchmarked, but not used for production tenant data or Apply-adjacent work until its vendor and provider-specific eval gates pass.

## Source links

- OpenAI GPT-5.5 model docs: https://developers.openai.com/api/docs/models/gpt-5.5
- OpenAI GPT-5.4 mini model docs: https://developers.openai.com/api/docs/models/gpt-5.4-mini
- OpenAI pricing docs: https://developers.openai.com/api/docs/pricing
- OpenAI structured outputs docs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI tools/function calling docs: https://developers.openai.com/api/docs/guides/tools
- DeepSeek API pricing/model docs: https://api-docs.deepseek.com/quick_start/pricing
- DeepSeek function calling docs: https://api-docs.deepseek.com/guides/function_calling
- DeepSeek JSON Output docs: https://api-docs.deepseek.com/guides/json_mode
- DeepSeek reasoning model docs: https://api-docs.deepseek.com/guides/reasoning_model
- DeepSeek rate-limit/isolation docs: https://api-docs.deepseek.com/quick_start/rate_limit
- DeepSeek privacy policy: https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html
- DeepSeek Open Platform terms: https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html
