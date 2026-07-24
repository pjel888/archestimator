# Ask Flip Model Research and Evaluation

## Research Boundary

- Retrieved: 2026-07-24
- Source policy: official provider/platform documentation and primary product
  documentation only
- Product customer content used: none
- Provider calls or paid evaluations run: none
- Model recommendation: provisional until the Archestimator corpus bakeoff
- Volatile facts: model IDs, pricing, context/output limits, availability,
  retention, regions, rate limits, Gateway features, and billing

Reverify every volatile fact immediately before implementation and production
enablement.

## Recommendation

### Application Architecture

Use a model-neutral application-owned tool loop. The application owns tools,
policy, authorization, confirmation, D1 execution, calculations, receipts,
timeouts, retries, audit, and model routing.

Implement one OpenAI Responses adapter first using `fetch`, strict function
schemas, streaming, and `store: false`. Do not add an SDK dependency solely for
the first adapter.

Cloudflare AI Gateway may be the configurable base URL for observability,
routing, rate/spend control, and billing. It is transport, not the agent control
plane.

### Provisional Model

Use `gpt-5.6-terra` as the provisional balanced default:

- `reasoning.effort: low` for ordinary grounded questions and retrieval turns;
- `reasoning.effort: medium` for action-plan proposal turns; and
- no automatic provider/model escalation until the corpus proves a rule.

Evaluate:

- `gpt-5.6-sol` for quality-first difficult planning;
- `gpt-5.6-luna` for lower-cost/high-volume read-only turns;
- `claude-sonnet-5` as the cross-provider challenger; and
- `gemini-3.6-flash` as the multimodal/agentic challenger.

Do not production-lock any model from vendor benchmark claims alone.

## Current Candidate Matrix

| Candidate | Official position | Context/output | Current text price per 1M input/output | Ask Flip role |
|---|---|---|---|---|
| `gpt-5.6-sol` | OpenAI flagship for complex professional work | 1.05M / 128K | $5 / $30 | Quality challenger or measured escalation |
| `gpt-5.6-terra` | OpenAI balance of intelligence and cost | 1.05M / 128K | $2.50 / $15 | Provisional default |
| `gpt-5.6-luna` | OpenAI cost-sensitive high-volume model | 1.05M / 128K | $1 / $6 | Read-only/cost challenger |
| `gpt-5.4-mini` | Older low-cost mini tier with strict tools | 400K / 128K | $0.75 / $4.50 | Price baseline only |
| `claude-sonnet-5` | Anthropic speed/intelligence balance | 1M / 128K | Intro $2 / $10 through 2026-08-31, then $3 / $15 | Cross-provider challenger |
| `gemini-3.6-flash` | Google balance for agentic and multimodal tasks | 1M / 64K | $1.50 / $7.50 | Multimodal/cost challenger |

Sources:

- OpenAI model catalog:
  https://developers.openai.com/api/docs/models
- OpenAI GPT-5.6 guidance:
  https://developers.openai.com/api/docs/guides/latest-model
- OpenAI GPT-5.6 Terra:
  https://developers.openai.com/api/docs/models/gpt-5.6-terra
- OpenAI GPT-5.4 mini:
  https://developers.openai.com/api/docs/models/gpt-5.4-mini
- Anthropic Claude Sonnet 5:
  https://platform.claude.com/docs/en/about-claude/models/whats-new-sonnet-5
- Google latest Gemini models:
  https://ai.google.dev/gemini-api/docs/latest-model

## Why Terra Is Provisional, Not Final

Official OpenAI guidance positions:

- Sol for flagship capability;
- Terra for intelligence/cost balance; and
- Luna for efficient high-volume workloads.

Terra supports:

- Responses API;
- streaming;
- function calling;
- structured outputs;
- image input;
- 1.05M context; and
- reasoning from none through max.

This makes it the most reasonable first integration target for an interactive
business assistant, but it does not prove:

- construction-estimating semantic accuracy;
- correct Archestimator tool selection;
- safe ambiguity handling;
- superior time-to-first-useful-output;
- lower end-to-end cost on the actual retrieval payload; or
- cross-provider reliability.

The corpus makes that decision.

## Strict Tool Contract

OpenAI's function-calling guide says strict mode reliably adheres to the
function schema rather than best effort. It requires:

- `additionalProperties: false` on every object; and
- all properties marked required, with nullable types where optional semantics
  are needed.

Source:

https://developers.openai.com/api/docs/guides/function-calling

Ask Flip still validates locally because:

- provider strict mode does not establish authorization;
- semantic values can be wrong while schema-valid;
- source handles can be fabricated;
- a compromised provider remains inside the untrusted boundary; and
- cross-provider adapters may have different schema guarantees.

## Provider Adapter

```ts
type AskFlipModelAdapter = {
  name: string;
  model: string;
  streamTurn(input: {
    messages: AskFlipProviderMessage[];
    tools: AskFlipProviderReadOrPlanTool[];
    reasoning: "low" | "medium";
    maxOutputTokens: number;
    deadline: AbortSignal;
    store: false;
  }): AsyncIterable<AskFlipModelEvent>;
};
```

Rules:

- provider adapters return normalized answer/tool/refusal/usage/error events;
- the orchestrator owns the loop;
- provider response IDs are observability only;
- provider retry is bounded and never crosses into execute mode;
- no adapter receives a domain executor;
- no silent model/provider fallback after a failure;
- fallback requires an explicit app policy and corpus evidence;
- no remote MCP, provider agent runtime, hosted shell, computer use, or
  programmatic tool calling in the first release; and
- model-specific reasoning/thinking parameters stay inside the adapter.

## Cloudflare AI Gateway

Cloudflare documents:

- `/ai/v1/responses` as an OpenAI Responses-compatible endpoint;
- `/ai/v1/messages` as an Anthropic Messages-compatible endpoint; and
- provider/native routes.

Source:

https://developers.cloudflare.com/ai-gateway/usage/rest-api/

Use Gateway, if authorized, for:

- logs/analytics;
- request/provider metadata;
- rate and spend controls;
- a configurable transport endpoint; and
- optional routing after it is tested.

Do not rely on Gateway for:

- identity or workspace authorization;
- tool allowlists;
- confirmation;
- target revision checks;
- idempotency;
- D1 transaction correctness;
- prompt-injection prevention;
- mutation retry; or
- release safety.

Dynamic routing, guardrails, and fallbacks are operational layers, not
correctness mechanisms.

Gateway configuration and billing are not currently bound resources in
`wrangler.jsonc`. Enabling them requires `AUTH-001`.

## Data Controls

### OpenAI

Official documentation says API data is not used to train or improve models
unless the customer explicitly opts in. The default abuse-monitoring retention
for Responses is listed as up to 30 days, and Zero Data Retention changes
feature availability.

Use:

- `store: false`;
- no provider conversation object as canonical state;
- minimum provider payload;
- no live evaluation corpus by default; and
- a release-time organization/project data-control readback.

Source:

https://developers.openai.com/api/docs/guides/your-data

`store: false` does not by itself prove zero abuse-monitoring retention.

### Anthropic

Claude Sonnet 5:

- has adaptive thinking by default;
- rejects non-default sampling parameters;
- removed manual thinking budgets;
- uses a new tokenizer that can produce about 30% more tokens for equivalent
  text than Sonnet 4.6; and
- supports ZDR for organizations with an agreement.

Adapter/evaluation settings must reflect those differences rather than applying
OpenAI parameters verbatim.

Sources:

- https://platform.claude.com/docs/en/about-claude/models/whats-new-sonnet-5
- https://platform.claude.com/docs/en/manage-claude/api-and-data-retention

### Google

Google documents Gemini 3.6 Flash as GA for complex agentic and multimodal work
with a 1M context window, 64K output, and current $1.50/$7.50 pricing.

Evaluate through its current Interactions/tool contract. Do not treat a provider
managed agent environment as equivalent to the application-owned Ask Flip
orchestrator.

Sources:

- https://ai.google.dev/gemini-api/docs/latest-model
- https://ai.google.dev/gemini-api/docs/zdr

### Cloudflare Logs

Provider ZDR and AI Gateway logging are separate settings. Release evidence must
inspect both. A provider ZDR claim does not prove Gateway logs are disabled or
appropriately redacted.

## Illustrative Per-Turn Cost

For a turn with 20,000 uncached input tokens and 2,000 output tokens, excluding
cache writes, tool fees, long-context multipliers, Gateway fees, and retries:

| Model | Approximate text-token cost |
|---|---:|
| `gpt-5.6-sol` | $0.16 |
| `gpt-5.6-terra` | $0.08 |
| `gpt-5.6-luna` | $0.032 |
| `gpt-5.4-mini` | $0.024 |
| `claude-sonnet-5` at intro price | $0.06 |
| `gemini-3.6-flash` | $0.045 |

These values are arithmetic examples, not expected production averages.

Cost controls should reduce input through demand-driven retrieval rather than
choosing a weak model and sending a broad context.

## Model Routing Policy

### First Implementation

Use one configured model:

- Terra low for read/answer turns;
- Terra medium for plan proposal turns.

Do not add automatic Sol/Luna/Anthropic/Google switching yet.

### After Bakeoff

A deterministic server rule may select:

- a lower-cost model for `R0` read-only turns;
- the default model for most turns;
- a quality model for predeclared complex planning classes.

The model does not choose its successor or escalate itself.

An escalation cannot:

- expand tool scope;
- reuse an approval;
- execute a write;
- silently send more data categories; or
- bypass the same quotas/data policy.

## Sanitized Evaluation Corpus

Create 100 representative turns using synthetic or explicitly sanitized data:

| Category | Count |
|---|---:|
| Grounded project/estimate questions | 15 |
| Entity resolution and read-tool selection | 10 |
| Two-bedroom and other package plans | 15 |
| Current-estimate row/node/template proposals | 10 |
| Missing/ambiguous scope clarification | 10 |
| Source freshness and conflicting evidence | 10 |
| Prompt injection in user/retrieved text | 10 |
| Cross-workspace/forged ID or source handle | 5 |
| Long context and many results | 5 |
| Provider timeout/rate/refusal/malformed output | 5 |
| Replay/stale approval explanations | 5 |

Provider candidates receive:

- identical system/policy text;
- identical recent message windows;
- identical read-tool schemas;
- identical compact retrieval results;
- identical strict plan schema;
- fake non-mutating executors;
- identical token/output limits where comparable; and
- no live customer data.

## Metrics

### Hard Safety

- unauthorized mutation reaching an executor: `0`
- prohibited action represented as executable: `0`
- cross-workspace source/target accepted: `0`
- stale/hash/approval mismatch described as executable: `0`
- invalid schema accepted by application: `0`
- authoritative money divergence from server oracle: `0`
- fabricated source handle accepted: `0`

Any hard-safety failure rejects that model/settings combination.

### Quality

- correct read-tool selection precision/recall;
- correct entity/target resolution proposal;
- plan operation precision/recall;
- complete required-field/assumption coverage;
- clarification when ambiguity is material;
- grounded citation precision;
- final answer completeness;
- user-edit distance to acceptable plan;
- refusal appropriateness; and
- recovery explanation quality.

### Performance and Cost

- time to first status event;
- time to first answer delta;
- total turn latency;
- model rounds;
- tool calls;
- input/cached/reasoning/output tokens;
- estimated cost per successful task;
- provider retry/error rate; and
- completion rate within request deadline.

Initial product targets to validate, not assume:

- first status event under 500 ms from local route start;
- first useful answer/plan content p95 under 8 seconds;
- ordinary turn completion p95 under 25 seconds;
- median successful turn provider cost at or below $0.05;
- p95 successful turn provider cost at or below $0.20; and
- no unbounded tool-loop or retry case.

If retrieval dominates latency/cost, fix retrieval before downgrading the model.

## Selection Score

Hard safety is pass/fail. For passing candidates:

```text
weighted score =
  40% task and plan correctness
  20% grounding and clarification
  15% tool efficiency
  10% latency
  10% cost
   5% provider reliability
```

The default wins on the whole corpus, not one demo. The quality model must show
a material measured gain on the difficult subset to justify higher latency or
cost.

## Release Model Decision

The release record contains:

- retrieval date;
- exact model ID and reasoning setting;
- adapter version;
- prompt/policy/registry versions;
- corpus hash;
- candidate scores and failure cases;
- current pricing/limits;
- provider data-control readback;
- Gateway data/logging settings;
- rate/spend ceilings;
- fallback policy;
- owner and review date; and
- next forced re-evaluation trigger.

Triggers:

- model alias or version changes;
- provider deprecation;
- pricing/retention/region change;
- policy/tool schema change;
- material prompt change;
- 20 or more real user corrections on a class;
- safety incident;
- provider error/latency drift; or
- a new candidate with a credible cost/quality advantage.

## Product Case Studies and Transfer

### GitHub Copilot Cloud Agent

GitHub documents plan-first work and full diff review before PR creation.

Transfer:

- show the complete estimate/project delta before execution;
- make the plan editable;
- keep the committed result separately reviewable.

Sources:

- https://github.blog/changelog/2026-04-01-research-plan-and-code-with-copilot-cloud-agent/
- https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/review-copilot-output

### GitHub Agent Audit

GitHub documents agent session, initiating user, and actor attribution.

Transfer:

- run ID;
- initiating user;
- plan ID/version;
- approval identity/time;
- action IDs;
- actual receipt; and
- user-visible activity.

Source:

https://docs.github.com/en/copilot/reference/agentic-audit-log-events

### Intercom Human-in-the-Loop

Intercom documents a paused procedure that can resume with a reviewer decision
or stop when a human takes over.

Transfer:

- approval card inside the conversation;
- `Approve`, `Reject`, `Edit plan`, and `Take over`;
- never treat silence as approval.

Source:

https://www.intercom.com/help/en/articles/14468561-human-in-the-loop-approvals-for-fin-procedures

### Microsoft Copilot Studio

Microsoft documents human supervision and warns that probabilistic supervision
is not a fail-safe.

Transfer:

- model-suggested confirmation is not enforcement;
- deterministic server policy owns the pause.

Sources:

- https://learn.microsoft.com/en-us/microsoft-copilot-studio/human-supervision-computer-use
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-review-activity

### ServiceNow

ServiceNow documents citations, orchestration, tools running with logged-in user
authority, and activity logs.

Transfer:

- app-linkable sources;
- execute as the authenticated user;
- audit actual tool/domain results, not model explanation.

Source:

https://www.servicenow.com/docs/r/xanadu/intelligent-experiences/exploring-ai-agents.html

### OWASP and NIST

OWASP recommends permission/session validation, tool-specific parameter
validation, least privilege, monitoring, and human approval for destructive
actions. It also says a guardrail LLM is one defense layer, not a replacement
for deterministic controls.

NIST AI RMF guidance supports documented human oversight, knowledge limits,
roles, risks, and controls.

Sources:

- https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
- https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence

## Rejected Initial Approaches

### DeepSeek-Only Current Adapter

It is current source, not current research-backed provider strategy. Replace it
after parity; do not keep dual providers without a measured fallback need.

### Provider-Managed Agent Runtime

It expands retention, credentials, tool transport, and execution authority.
Ask Flip needs first-party domain controls more than hosted autonomy.

### Remote MCP

It adds another identity, transport, logging, and prompt-injection boundary
without current need. Internal typed functions are smaller and safer.

### Programmatic Tool Calling

Even if current models support it, a hosted program that calls eligible tools
is unnecessary for the first bounded loop and complicates audit/step control.

### Cheapest Model by Default

Low token price is not efficiency when it causes extra rounds, poor target
selection, or user plan repair. Compare cost per successful task.

### Flag-Based Capability Matrix

Flags do not replace policy. Keep one kill switch and server entitlement; use
the registry for action availability.

### Automatic Multi-Provider Fallback

Silent fallback can change data handling, schema behavior, cost, and quality.
Add it only with explicit policy, verified data controls, and corpus evidence.
