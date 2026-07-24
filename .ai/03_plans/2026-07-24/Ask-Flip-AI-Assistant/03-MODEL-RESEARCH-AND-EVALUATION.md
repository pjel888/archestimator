# Ask Flip Model Research And Evaluation

## Research Boundary

- Retrieval date: 2026-07-24
- Sources: current official OpenAI and Cloudflare documentation
- Product customer content used: none
- Provider/API/model calls made: none
- Billed evaluation made: none
- Provider/Gateway account configuration read back: none
- Production model selected: no

Volatile facts include:

- model IDs and aliases;
- tool/structured-output support;
- context and output limits;
- pricing;
- rate limits and usage tiers;
- regions and availability;
- abuse-monitoring and retention controls;
- ZDR/modified monitoring eligibility;
- AI Gateway endpoints, logging, caching, routing, limits, retries, and billing.

Reverify every volatile fact immediately before provider implementation and
again before any release decision.

## No-Training Strategy

Ask Flip uses an existing hosted foundation model.

The planned product does not require:

- custom model training;
- fine-tuning;
- continual training;
- provider-owned long-term canonical memory;
- raw-conversation learning; or
- a provider-specific domain schema.

### Runtime Archestimator Familiarity

The provider receives only the minimum relevant combination of:

1. versioned Archestimator product knowledge;
2. bounded recent messages;
3. current server-authorized project/estimate/tab/selected-record context;
4. strict typed read tools;
5. compact authorized read results;
6. opaque source handles;
7. deterministic calculation results; and
8. in Draft profiles, one strict `propose_action_plan` schema.

Later structured workspace preferences or accepted/edited-decision signals
remain application-owned, explicit, bounded, retention-governed, and separate
from raw chat. They are not training data and cannot expand authorization.

## Recommendation

### Application Boundary

Keep the orchestration loop provider-neutral and application-owned.

Archestimator owns:

- identity and workspace;
- product entitlement;
- release profile;
- tool availability;
- target/source resolution;
- strict local validation;
- data minimization;
- deterministic calculations;
- plan compilation and persistence;
- risk;
- approval;
- execution;
- mutation retry/idempotency;
- receipts;
- audit; and
- provider routing policy.

The provider supplies:

- language interpretation;
- read-tool selection;
- clarification;
- synthesis;
- strict proposal output in Draft profiles;
- uncertainty and source-limit explanations.

### Initial Provider Adapter

Implement one OpenAI Responses API adapter first.

Required properties:

- direct `fetch` is acceptable;
- no SDK dependency unless it materially simplifies the adapter and current
  Cloudflare/OpenNext compatibility is verified;
- strict function schemas;
- local schema and semantic validation;
- `store: false` on every request;
- server-only configurable base endpoint;
- bounded messages, rounds, tool calls, output, retries, bytes, and deadline;
- application-translated typed streaming events;
- no provider-owned canonical conversation;
- no provider-visible execute or approval tool;
- no automatic cross-provider fallback;
- no silent model escalation;
- no durable model name in product/domain contracts.

OpenAI is the first implementation provider, not a permanent architecture
dependency.

Other providers may later challenge the initial adapter on identical sanitized
fixtures and schemas. Do not prebuild those adapters.

## Official Responses API Facts

### Strict Function Schemas

OpenAI documents strict function-tool schemas with:

- `strict: true`;
- `additionalProperties: false` for every object; and
- all properties required, using nullable types for optional semantics.

Sources:

- https://developers.openai.com/api/docs/guides/function-calling#strict-mode
- https://developers.openai.com/api/docs/guides/structured-outputs#all-fields-must-be-required

Planning implications:

- set `parallel_tool_calls: false` for the first bounded loop unless a later
  read-only policy explicitly supports parallel calls;
- validate every tool name and argument again locally;
- derive identity, workspace, target, source, permission, and profile on the
  server;
- treat strict conformance as shape reliability only, never authorization or
  business correctness.

### Tool-Call Loop

OpenAI documents Responses function-call output items containing a function
name, arguments, and `call_id`; the application returns a
`function_call_output` for the same `call_id` and requests the next response.

Sources:

- https://developers.openai.com/api/docs/guides/function-calling#step-3-execute-function-calls-and-append-results
- https://developers.openai.com/api/docs/guides/function-calling#formatting-results

Planning implications:

- the application owns each loop iteration;
- only approved read tools run in Release A;
- the provider receives compact results and opaque handles;
- Draft adds only `propose_action_plan`;
- stop on final answer, clarification, refusal, invalid tool/schema, denied
  policy, quota, deadline, cancellation, provider error, or maximum rounds.

### Stateless Operation And `store: false`

OpenAI documents Responses storage by default and `store: false` to disable
stored response state. It also documents carrying context manually when the
application chooses stateless operation.

Sources:

- https://developers.openai.com/api/docs/guides/migrate-to-responses#decide-when-to-use-statefulness
- https://developers.openai.com/api/docs/guides/conversation-state#manage-conversation-state-manually
- https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint

Planning implications:

- set `store: false` on every Ask Flip request;
- do not use provider Conversations/Threads as canonical state;
- carry only the bounded privacy-reviewed context needed for the turn;
- never persist hidden reasoning as product memory or audit truth;
- do not claim `store: false` proves zero abuse-monitoring retention.

### Streaming

OpenAI documents Responses streaming over HTTP SSE with typed events such as
response creation, text delta, completion, and error.

Source:

- https://developers.openai.com/api/docs/guides/streaming-responses#read-the-responses

Planning implications:

- parse provider SSE inside the adapter;
- translate it to the versioned Ask Flip event protocol;
- do not expose provider event names/IDs as the browser API;
- do not stream raw tool arguments/results or hidden reasoning;
- provider completion means the model turn ended, not that a business mutation
  committed.

## Data Controls

### OpenAI

Official documentation states that API data is not used to train/improve models
unless the customer opts in. It separately documents default abuse-monitoring
logs that may contain prompts/responses and can be retained for up to 30 days,
with approval-gated Modified Abuse Monitoring or Zero Data Retention controls
and limitations.

Source:

- https://developers.openai.com/api/docs/guides/your-data#data-controls-in-the-openai-platform

Release requirements:

- keep training opt-in disabled;
- set `store: false`;
- minimize provider payload;
- use no live customer evaluation corpus by default;
- read back organization/project retention settings before release;
- verify feature compatibility with any approved retention control.

### Provider Never Receives

- execute tokens;
- approval tokens;
- release profile;
- permission objects;
- raw SQL;
- raw server function names;
- secrets;
- unrestricted IDs;
- unrestricted records;
- mutation executors;
- canonical plan body outside the strict safe proposal context;
- canonical receipts.

## Cloudflare AI Gateway

Cloudflare documents OpenAI-compatible Responses transport, including provider
routes and `/ai/v1/responses`, plus logging, analytics, caching, rate/spend
controls, retries, and routing features.

Sources:

- https://developers.cloudflare.com/ai-gateway/usage/providers/openai/
- https://developers.cloudflare.com/ai-gateway/usage/rest-api/
- https://developers.cloudflare.com/ai-gateway/features/
- https://developers.cloudflare.com/ai-gateway/observability/analytics/

### Permitted Role

If separately authorized, Gateway may provide:

- transport endpoint;
- provider routing;
- metadata and analytics;
- transport rate/spend controls;
- bounded provider-call retries; and
- configurable provider endpoint.

### Prohibited Role

Gateway does not own:

- identity;
- workspace/product entitlement;
- release profile;
- tool registry;
- domain authorization;
- approval;
- canonical plan persistence;
- source freshness;
- mutation execution;
- domain retry/idempotency;
- D1 atomicity;
- receipts;
- application audit truth.

Execute makes no provider or Gateway call.

### Logging And Caching

Cloudflare documents Gateway logging enabled by default and headers to suppress
all logging or payload logging. It also documents request-body-based caching.

Sources:

- https://developers.cloudflare.com/ai-gateway/observability/logging/
- https://developers.cloudflare.com/ai-gateway/features/caching/#how-the-cache-key-works

Release requirements if Gateway is authorized:

- disable personalized live-workspace response caching;
- disable payload logging or choose explicit metadata-only logging;
- read back logging/cache/retention configuration;
- review provider and Gateway data controls separately;
- do not assume DLP or guardrails replace application minimization or policy.

### Limits And Retries

Gateway limits, retries, and billing vary by plan/configuration and can change.

Sources:

- https://developers.cloudflare.com/ai-gateway/reference/limits/
- https://developers.cloudflare.com/ai-gateway/configuration/request-handling/
- https://developers.cloudflare.com/ai-gateway/reference/pricing/

Do not copy current numeric limits into durable Ask Flip contracts. Read them
back before implementation and release.

Gateway retry/fallback cannot retry a Release C mutation because execute makes
no provider call.

## Provider Adapter Contract

Conceptual application contract:

```ts
type AskFlipProviderRoundInputItem =
  | AskFlipProviderMessage
  | AskFlipProviderPriorOutputItem
  | {
      type: "function_call_output";
      callId: string;
      output: AskFlipCompactToolResult;
    };

type AskFlipModelAdapter = {
  provider: string;
  streamRound(input: {
    input: AskFlipProviderRoundInputItem[];
    tools: AskFlipProviderReadOrPlanTool[];
    maxOutputTokens: number;
    deadline: AbortSignal;
    store: false;
  }): AsyncIterable<AskFlipProviderRoundEvent>;
};
```

Rules:

- one adapter invocation represents one provider round, not the complete
  orchestration loop;
- normalized round events include answer delta, function call with stable
  `callId`, prior-output continuation item, refusal, usage, completion, and safe
  error;
- the application orchestrator validates and executes each allowed read or
  proposal call, then appends the matching compact `function_call_output` with
  the same `callId`;
- with `store: false`, the next round resends the bounded required prior output
  items and function-call outputs; it does not depend on provider conversation
  storage or `previous_response_id`;
- the orchestrator owns round count, tool count, validation, authorization,
  execution, termination, and total deadline;
- provider-specific model/reasoning/transport fields stay inside the adapter;
- provider response IDs are observability only and cannot be continuation
  authority;
- continuation items remain bounded in-memory turn state and are not browser or
  durable domain contracts;
- adapter receives no domain executor;
- provider retries are bounded within one safe round;
- no adapter silently switches provider or model;
- configurable base endpoint is server-only exact-host-allowlisted transport
  configuration;
- domain, plan, approval, and receipt contracts contain no model name.

## Model Selection Strategy

### No Durable Model Lock

The plan deliberately does not select a production model from:

- vendor benchmark claims;
- a model name in current agent configuration;
- current list price alone;
- one demo;
- context-window size;
- provider marketing.

The first adapter uses a current configured OpenAI Responses-compatible model
that is reverified for:

- strict function tools;
- streaming;
- required output/schema support;
- current context/output limits;
- current rate limits;
- current account/project availability;
- current data controls; and
- current cost.

The exact release model belongs in a dated evaluation record.

### No Silent Escalation Or Fallback

Before any fallback/escalation can exist, a separate policy must define:

- triggering classes;
- eligible provider/model;
- data categories that may be resent;
- schema compatibility;
- cost ceiling;
- retention/region controls;
- user-visible behavior;
- audit;
- failure recovery.

No fallback/escalation is part of Releases A-C.

## Sanitized Evaluation Corpus

Use synthetic or explicitly sanitized Archestimator fixtures only.

Recommended minimum categories:

| Category | Minimum examples |
|---|---:|
| Product-knowledge questions | 10 |
| Grounded project/estimate questions | 15 |
| Entity resolution and read-tool selection | 10 |
| Rivera and other package drafts | 15 |
| Missing/ambiguous clarification | 10 |
| Source freshness/conflicting evidence | 10 |
| Prompt injection in user/retrieved data | 10 |
| Forged/cross-workspace handles | 5 |
| Long/many-result contexts | 5 |
| Provider timeout/rate/refusal/malformed output | 5 |
| Stale/replay explanations | 5 |

Every candidate receives:

- identical system/product policy;
- identical recent message window;
- identical read schemas;
- identical compact read results;
- identical source handles;
- identical proposal schema;
- identical output/turn budgets where comparable;
- non-mutating fake executors;
- no live customer data.

## Separate Evaluation Plan

### Application Security And Domain Invariants

These are model-independent pass/fail controls:

- no unauthorized mutation reaches execution;
- no cross-workspace source/target is accepted;
- no browser/model authority field is trusted;
- no provider-visible execute capability exists;
- no stale plan executes;
- no invalid handle is accepted;
- no plan executes without exact approval;
- no canonical money divergence;
- no partial mutation;
- no commit missing history/outbox/receipts/terminal audit;
- replay creates no duplicate effect;
- execute makes no provider call.

Failure returns to application/domain implementation. Changing the model cannot
fix these failures.

### Model-Behavior Metrics

- correct read-tool selection precision/recall;
- relevant retrieval request rate;
- source citation precision;
- correct clarification behavior;
- plan operation precision/recall;
- assumptions and unresolved-question completeness;
- attempted prohibited-action rate;
- attempted fabricated-handle rate;
- unsupported certainty rate;
- unnecessary tool-call rate;
- user edit distance to acceptable plan;
- latency;
- token use;
- cost per successful task;
- provider reliability.

A model that frequently attempts unsafe actions scores poorly even when the
application blocks all attempts.

### Hard Model Failure Conditions

- proposes prohibited operations as executable;
- repeatedly fabricates handles;
- fails material ambiguity clarification;
- omits required assumptions/sources;
- cannot reliably produce the strict proposal schema;
- exceeds declared latency/cost/turn budgets;
- has unacceptable provider reliability.

These are model-selection failures, not evidence that application authorization
failed.

## Cost Per Successful Task

Do not optimize on token price alone.

Record per task:

- input/cached/reasoning/output tokens;
- provider/tool rounds;
- latency;
- retries;
- price snapshot;
- total estimated provider cost;
- task success;
- user correction/edit distance.

Compare:

`total provider cost / successful acceptable tasks`

A lower-priced model that needs more rounds, misuses tools, or creates large
user repair work may cost more per successful task.

No current pricing example is durable enough to belong in the architecture
decision. Recompute from current official pricing during the authorized eval.

## Release Model Record

A release model record contains:

- retrieval/evaluation date;
- exact provider and model ID;
- provider endpoint/transport;
- adapter version;
- reasoning/tool settings;
- prompt/product-knowledge/policy/registry versions;
- corpus hash;
- application-security evidence reference;
- model metric results and failure cases;
- current price, limits, rate tier, and availability;
- provider data-control readback;
- Gateway logging/cache/routing/readback if used;
- spend and rate ceilings;
- fallback policy, which is `none` for Releases A-C;
- decision owner;
- next re-evaluation trigger.

The record is evidence. It does not change domain contracts.

## Reevaluation Triggers

Reevaluate when:

- model alias/version changes;
- provider deprecates a model or API behavior;
- tool/strict-schema/streaming support changes;
- price, context, output, rate, region, retention, or availability changes;
- provider/Gateway data controls change;
- product knowledge, prompt, policy, registry, or proposal schema changes
  materially;
- real users create a material correction cluster;
- unsafe-attempt rate rises;
- provider error or latency drifts;
- a challenger shows a credible task-level cost/quality advantage;
- a security/privacy incident occurs.

## Rejected Initial Approaches

### Custom Training Or Fine-Tuning

Not required. Runtime product knowledge and authorized retrieval solve the
first product need without creating a training-data or model-lifecycle program.

### Provider-Owned Canonical Memory

Would move privacy, retention, portability, and action-plan truth outside
Archestimator. Raw conversations remain noncanonical.

### DeepSeek As Durable Architecture

Current source demonstrates provider use, not a durable provider decision.
Replace it after Ask-only parity and do not retain permanent dual paths.

### Multiple Prebuilt Provider Adapters

Premature before the corpus proves a need. Implement one OpenAI Responses
adapter first.

### Automatic Multi-Provider Fallback

Can silently change data handling, cost, schema behavior, region, and quality.
Not part of Releases A-C.

### Silent Model Escalation

Can change cost and data behavior without user/product policy. Not part of
Releases A-C.

### Provider-Managed Agent Runtime

Adds a second control plane for tools, retention, and credentials. The
application-owned loop is smaller and keeps domain authority local.

### Remote MCP, Programmatic Tool Runtime, Shell, Or Computer Use

Unnecessary for bounded product knowledge, workspace reads, and one strict
proposal schema. They add authority and injection surfaces.

### Broad RAG Or Vector Search

The first release needs a small versioned product ontology and precise live
reads, not a retrieval platform.

### Cheapest Model By List Price

List price is not cost per successful task.

### Model Authorization Score

Application security does not depend on model behavior. Model attempts are
quality metrics; deterministic server controls remain mandatory.
