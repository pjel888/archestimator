# Ask Flip Architecture, Safety, and Data Contract

## Architecture Decision

Ask Flip is a capability-separated assistant, not a general autonomous tool
runner.

```text
Browser UI
  -> authenticated Ask Flip route
  -> server policy and orchestrator
  -> scoped read broker
  -> model
  -> deterministic plan compiler
  -> immutable full preview
  -> explicit confirmation
  -> server-only execute broker
  -> canonical D1 domain command
  -> receipt, history/outbox, readback, invalidation
```

The model never receives an execute capability. The provider-visible mutation
surface is one schema named `propose_action_plan`. Archestimator validates,
normalizes, classifies, calculates, stores, previews, approves, and executes the
proposal.

## Trust Boundaries

### Untrusted

- browser messages and route context;
- model output;
- provider tool calls;
- prior client-held conversation turns;
- project, estimate, node, row, component, template, supplier, and activity
  text;
- uploaded or external content in future integrations;
- realtime payloads;
- client-supplied IDs, revisions, totals, risk classes, policy decisions,
  permissions, confirmation labels, and execution state.

### Trusted Only After Server Proof

- Better Auth session identity;
- active workspace;
- product entitlement;
- collaboration/domain permission;
- target membership in workspace -> project -> estimate -> tab/node/row;
- current resource revision or `updated_at`;
- current component/template ownership and freshness;
- canonical D1 readback;
- canonical money and estimate calculations;
- signed action-plan token;
- current D1 plan state; and
- committed domain and AI execution receipts.

### Never Sent to the Model

- provider or application secrets;
- raw database access;
- SQL;
- service-role or local-admin credentials;
- execute tokens;
- confirmation tokens;
- workspace/user authority;
- unrestricted app IDs;
- server function names;
- mutation receipts;
- hidden policy implementation; and
- raw logs or full retrieved records.

## Control Loop

### 1. Receive

The `message` request accepts:

- up to 12 bounded recent messages;
- a trusted enum for current app surface;
- browser route hints;
- optional pending plan ID for safe summary/revision; and
- client request ID.

It rejects unknown fields, model/tool/identity/permission overrides, unbounded
arrays, and oversized content.

### 2. Authenticate and Gate

Before provider spend or stream start:

1. authenticate;
2. derive user and workspace;
3. verify provider-backed auth mode;
4. verify server-side AI entitlement;
5. verify master AI kill switch;
6. enforce user/workspace/IP quota and workspace concurrency;
7. verify provider configuration;
8. reserve bounded estimated cost;
9. create a started metadata-only run; and
10. establish request deadline and cancellation signal.

Any failure returns the correct HTTP status before streaming.

### 3. Understand and Retrieve

The model receives:

- system/developer rules;
- a bounded recent message window;
- safe route labels;
- available read-tool schemas; and
- tool results with opaque source handles.

The server executes read tools only after:

- permission check;
- server target resolution;
- selected-column query;
- DB/result/payload limits;
- timeout; and
- data-access audit.

### 4. Answer, Clarify, or Propose

The provider can:

- answer using source handles;
- ask one or more material clarification questions;
- request another read tool; or
- call `propose_action_plan`.

It cannot call an executor.

### 5. Compile

The deterministic compiler:

1. parses the strict proposal;
2. resolves every opaque source and target;
3. rejects provider-created IDs or unknown handles;
4. applies the action registry;
5. authorizes eligibility;
6. calculates canonical money and record effects;
7. computes before/after hashes and target revisions;
8. derives the maximum risk class;
9. rejects mixed or prohibited operations;
10. creates the full user preview;
11. hashes the canonical plan and preview;
12. persists the plan; and
13. signs a short-lived plan token.

### 6. Review

The UI shows:

- exact target project/estimate or new record names;
- every operation, without truncation;
- records created or changed;
- before/after values;
- source and freshness;
- assumptions and unresolved items;
- authoritative cost/margin/budget effects;
- risk class;
- whether safe undo exists;
- expiry; and
- action-labelled confirmation.

Editing the plan creates a new version and invalidates the prior token and any
confirmation.

### 7. Confirm

The client sends:

- plan ID;
- plan version;
- plan hash;
- preview hash;
- signed token;
- literal explicit confirmation;
- client request ID; and
- idempotency key.

The client does not resend or modify the plan body.

### 8. Execute

Execute mode:

1. makes no provider call;
2. re-authenticates and re-derives workspace;
3. reloads the plan from D1;
4. verifies token signature, actor, workspace, plan version/hash, preview hash,
   policy version, expiry, allowed operation count, and status;
5. rechecks entitlement and every domain permission;
6. re-resolves every target/source through workspace ownership;
7. compares resource revisions and source freshness;
8. claims an expiring execution lease using compare-and-swap;
9. invokes the allowlisted domain command;
10. commits domain writes, canonical history/activity outbox, publication
    revision, domain receipt, AI tool receipt, plan completion, and terminal AI
    audit in the same final D1 batch;
11. reads back authoritative state;
12. invalidates local queries and emits optional best-effort realtime notice;
13. returns the committed receipt.

### 9. Recover

The same actor/workspace/idempotency key:

- returns the committed result when completed;
- returns `in_progress` with retry timing when another valid lease exists;
- may reclaim an expired lease with the same stable action IDs; and
- never asks the client to invent a new key after an uncertain partial result.

## Action Risk Policy

| Class | Meaning | Examples | Provider role | Confirmation |
|---|---|---|---|---|
| `R0_READ` | No domain mutation | read project/estimate/tree/rows/activity/library/templates/history | Select bounded tool | None |
| `R1_DRAFT` | No domain mutation | compare options, calculate, assemble or revise plan | Propose/clarify | None |
| `R2_CONFIRMED_WRITE` | Bounded non-destructive write | one row update/replace, node rename, small area/row addition | Propose only | Full diff and explicit confirm |
| `R3_HIGH_IMPACT_WRITE` | Non-destructive but large or financially material | new project+estimate package, template insert, component creation, >10 operations, or >10% estimate/budget delta | Propose only | Complete operation list and action-labelled confirm |
| `R4_PROHIBITED` | Destructive, permission/security, client-visible, external, or irreversible | delete/archive, publish/share/send, collaborator role, account/admin/privacy deletion, billing, deploy/config/secret, arbitrary HTTP/SQL | Refuse | Never executable |

Effective risk is the highest class among all operations. The server computes
risk from registry entries and authoritative deltas. Provider/client risk input
is ignored.

An `R3` plan cannot be mixed with a prohibited operation. A request containing
`R4` work is denied rather than partially executing the safe subset unless the
user explicitly revises the request.

## Tool Registry Contract

```ts
type AskFlipToolDefinition<Input, Output> = {
  name: string;
  version: number;
  phase: "read" | "draft" | "execute";
  riskClass: "R0_READ" | "R1_DRAFT" | "R2_CONFIRMED_WRITE" | "R3_HIGH_IMPACT_WRITE";
  inputSchema: StrictJsonSchema;
  outputSchema: StrictJsonSchema;
  requiredPermission: DomainPermission;
  resolveTargets: (context, input) => Promise<ResolvedTargets>;
  validatePreconditions: (context, targets, input) => Promise<Preconditions>;
  sourcePolicy: SourcePolicy;
  calculatePreview: (context, targets, input) => Promise<AuthoritativePreview>;
  execute?: (context, approvedAction) => Promise<DomainCommandResult>;
  undoPolicy: "safe-inverse" | "compensating-plan" | "none";
  summarizeForUser: (result) => SafeSummary;
  audit: ToolAuditPolicy;
};
```

Additional invariants:

- tool names are stable and explicitly registered;
- unknown names/fields reject;
- every object schema sets `additionalProperties: false`;
- all fields are required or explicitly nullable;
- collections have server-enforced maximums;
- tools do not accept user/workspace/permission/auth fields;
- write tools do not accept authoritative totals or risk;
- execute functions are absent from provider definitions; and
- registry version is part of the signed plan.

## Provider-Visible Tools

### Read

- `read_workspace_context`
- `list_projects`
- `read_project`
- `list_project_estimates`
- `read_estimate`
- `read_estimate_tree`
- `read_estimate_rows`
- `read_estimate_activity`
- `search_component_library`
- `search_estimate_templates`
- `search_historical_rows`
- `search_comparable_estimates`

### Plan

- `propose_action_plan`

No provider-visible write tool exists.

## Internal Execute Commands

The server-only registry may initially contain:

- `project.estimate-package.create`
- `estimate.row.insert`
- `estimate.row.update`
- `estimate.row.replace`
- `estimate.node.rename`
- `estimate.template.insert`
- `estimate.template-row.copy`
- `component-library.component.create`

Each maps to a domain command or canonical D1 intent. No command may point to
arbitrary exported server actions by name.

## Plan Schema

```ts
type AskFlipActionPlan = {
  schemaVersion: 1;
  policyVersion: string;
  registryVersion: string;
  planId: string;
  version: number;
  runId: string;
  actorUserId: string;
  workspaceId: string;
  intent: string;
  title: string;
  summary: string;
  riskClass: "R2_CONFIRMED_WRITE" | "R3_HIGH_IMPACT_WRITE";
  status:
    | "draft"
    | "review_required"
    | "approved"
    | "executing"
    | "completed"
    | "failed"
    | "stale"
    | "rejected";
  actions: AskFlipPlannedAction[];
  sources: AskFlipSourceReference[];
  assumptions: AskFlipAssumption[];
  unresolvedQuestions: AskFlipQuestion[];
  authoritativeEffects: AskFlipEffects;
  preconditionFingerprint: string;
  planHash: string;
  previewHash: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};
```

The browser receives a safe view without actor/workspace internals or executable
tokens inside the plan JSON.

## Planned Action Schema

Each action contains:

- stable `actionId`;
- registry tool name/version;
- ordinal and dependency IDs;
- risk class;
- server-resolved target reference;
- validated normalized arguments;
- required permission;
- expected target revision or `updated_at`;
- source handles and freshness;
- before hash and safe before summary;
- after hash and safe after summary;
- authoritative money effect;
- confirmation label;
- undo policy; and
- execution limits.

Stable action IDs derive from plan ID/version/ordinal/normalized action hash, not
transport idempotency key.

## Source and Citation Contract

Each source reference includes:

- opaque source handle visible to the model;
- app resource kind and ID retained server-side;
- safe display label;
- workspace/project/estimate scope;
- source revision, version, or `updated_at`;
- retrieval time;
- freshness status;
- data class;
- whether it is authoritative, user-provided, or precedent;
- row count/read category for audit; and
- app link builder.

Source classes:

- `CURRENT_LIBRARY`
- `CURRENT_PROJECT`
- `CURRENT_ESTIMATE`
- `USER_INSTRUCTION`
- `HISTORICAL_PRECEDENT`
- `COMPARABLE_PRECEDENT`
- `TEMPLATE_PRECEDENT`
- `ASSUMPTION`

Precedents and assumptions are never described as current supplier pricing.

Answers distinguish:

- retrieved fact;
- deterministic calculation;
- user instruction;
- assumption;
- historical precedent; and
- model suggestion.

## Data Model

### Reuse

Keep:

- `ai_action_runs`
- `ai_tool_calls`
- `ai_data_access_events`
- `security_rate_limit_events`
- canonical domain history/outbox and mutation receipt tables

### Add `ai_action_plans`

Required columns:

- `id`
- `run_id`
- `workspace_id`
- `actor_user_id`
- `schema_version`
- `policy_version`
- `registry_version`
- `plan_version`
- `intent`
- `risk_class`
- `status`
- `plan_hash`
- `preview_hash`
- `precondition_fingerprint`
- bounded `target_summary_json`
- bounded `effects_summary_json`
- `approved_by_user_id`
- `approved_at`
- `approved_plan_hash`
- `confirmation_label_hash`
- `expires_at`
- `lease_token`
- `lease_expires_at`
- `attempt_count`
- `completed_at`
- `failure_class`
- timestamps

Constraints:

- actor/workspace nonempty;
- known enum values;
- JSON validity and maximum application-side byte limits;
- unique `(workspace_id, id)`;
- unique completed `(workspace_id, actor_user_id, plan_hash)` where appropriate;
- approval hash equals active plan hash before execute; and
- legal status transitions enforced in application compare-and-swap statements.

Do not persist raw prompt, transcript, provider request, provider response,
retrieved records, hidden reasoning, or unrestricted action payloads.

The normalized plan body may be client-held and signed, or stored encrypted only
if a separate retention decision authorizes it. The required D1 record stores
enough structured metadata and hashes to prove approval and execution without
raw conversation content.

### Extend `ai_tool_calls`

Add or encode:

- `plan_id`
- `action_id`
- `tool_version`
- `risk_class`
- `policy_decision`
- `permission_checked`
- `precondition_hash`
- `domain_receipt_kind`
- `domain_receipt_id`
- `attempt_count`
- `latency_ms`
- `error_code`

Keep arguments/results as hashes plus safe summary, not raw payloads.

### Legacy `ai_package_apply_commands`

Migration behavior:

1. create the general plan/receipt state;
2. copy safe representable legacy metadata;
3. preserve old rows;
4. stop new runtime writes;
5. remove runtime reads after canonical receipt cutover; and
6. leave later physical deletion to retention, not this feature migration.

## State Machine

```text
draft
  -> review_required
  -> rejected

review_required
  -> review_required (new version; previous becomes stale)
  -> approved
  -> rejected
  -> stale

approved
  -> executing (lease claimed)
  -> stale (precondition failure before claim)
  -> rejected

executing
  -> completed
  -> failed
  -> approved (expired lease, no receipt, safe reclaim)

completed, rejected, stale
  -> terminal
```

No state transition may rewrite a completed receipt. Revisions create a new plan
version.

## Confirmation Contract

Confirmation is valid only when all match:

- authenticated actor;
- active workspace;
- server entitlement;
- plan ID and version;
- plan and preview hashes;
- policy and registry version;
- effective risk class;
- complete action ID set;
- target/source precondition fingerprint;
- confirmation label hash;
- expiry;
- unconsumed status; and
- server-recorded explicit approval.

Silence, message text such as "go ahead" outside the active approval control,
provider output, or a stale UI checkbox is not approval.

`R3` confirmation text is action-labelled, for example:

> Apply 26 changes and create Rivera 2BR for a current total of PHP 2,000,000

The UI sends a structured confirmation event; the server generates and verifies
the label.

## Canonical Mutation Contract

### Aggregate Project/Estimate Package

The domain command must compose:

- strict workspace editor access;
- maintenance write gate;
- project ID and activation state;
- estimate ID and default tab;
- node and row IDs;
- Area-only row targets;
- source ownership and freshness;
- linked/copy template semantics;
- component source snapshots;
- canonical row totals and currency;
- project/estimate history;
- activity event outbox;
- publication revision semantics;
- statement-count limit;
- request fingerprint;
- committed mutation receipt;
- AI action/tool terminal receipt; and
- authoritative readback.

The command is reusable outside AI and contains no model or provider logic.

### Existing-Estimate Changes

Every mutation uses:

- expected revision or compare-and-swap timestamp in the SQL predicate;
- exactly-one-row affected check;
- mutation/history/outbox/receipt in one batch;
- current active tab;
- strict resource ownership;
- canonical source transition behavior; and
- authoritative total/delta calculation.

### Atomicity

- A single confirmed plan is atomic only when all statements fit one D1 batch
  and one permission/target boundary.
- Cross-project, cross-workspace, external, or over-limit plans are not silently
  chunked.
- The server returns a revised set of separately reviewable phases and requires
  new confirmation.
- Optional realtime invalidation may fail after commit; the domain receipt and
  readback remain authoritative.

## Money Contract

- Currency is server-derived from the project/workspace/component context.
- Money uses canonical integer minor-unit calculation.
- Quantity, unit cost, misc cost, adjustment, contingency, VAT, markup, and
  sheet adjustments use existing domain semantics.
- Preview and persistence call the same calculation function/version.
- Policy thresholds use authoritative calculated deltas, never model totals.
- The receipt includes calculation version, currency, before/after totals, and
  source classifications.
- Budget is a ceiling/target unless the user explicitly allocates the remainder.
- Unallocated headroom remains visible and is not silently converted to price.

## Prompt-Injection Controls

Defense in depth:

1. separate instructions from untrusted data in the provider payload;
2. label every retrieved field as data;
3. strip control characters and suspicious markup where content semantics allow;
4. use compact structured fields rather than concatenated documents;
5. keep opaque source handles;
6. expose no execute capability;
7. validate tool name and parameters locally;
8. reject provider-created IDs/handles;
9. compare the proposal with the original user intent and route scope;
10. apply deterministic permission and risk policy;
11. require human approval for every write;
12. log blocked attempts and drift metrics.

No guardrail model is an authorization control.

## Privacy and Retention

### Application

- Active messages remain in browser memory.
- The request includes only a bounded recent window.
- D1 audit stores hashes and safe metadata.
- D1 plan state stores normalized metadata/hashes, not raw transcripts.
- Optional memory remains disabled unless the existing explicit opt-in and
  retention rules are valid.
- Safe source labels must not include avoidable client/site identity.
- New AI plan metadata joins existing retention and privacy export/erasure
  handling before production.

### Provider

- use non-persistent request settings such as `store: false`;
- do not use provider conversation objects as canonical state;
- do not send secrets, permissions, raw IDs, or unnecessary portfolio labels;
- document data categories sent per tool;
- verify training/retention/ZDR/region at implementation and release;
- verify AI Gateway logging independently from provider ZDR; and
- do not use live customer content for model evaluation without explicit
  authorization and an approved data policy.

## Streaming Contract

Typed events:

- `turn.started`
- `status.changed`
- `read.started`
- `read.completed`
- `source.available`
- `message.delta`
- `clarification.required`
- `plan.proposed`
- `plan.stale`
- `execution.started`
- `execution.completed`
- `turn.completed`
- `error`

Rules:

- authentication/quota/entitlement/audit/provider configuration complete before
  stream construction;
- sequence numbers are monotonic;
- each event has run ID and client request ID;
- content is bounded;
- no hidden reasoning is emitted;
- terminal event occurs exactly once;
- disconnect aborts provider/read work but never retries execute;
- execute response may be JSON instead of a stream to keep commit/error semantics
  simple; and
- errors after stream start use typed terminal events because HTTP status is
  already committed.

## Rate and Cost Controls

Apply before provider work:

- per-user and per-IP burst limit;
- per-user/workspace hourly request limit;
- per-workspace provider concurrency;
- hourly/daily input/output token limits;
- hourly/daily estimated spend limit;
- provider payload byte/token ceiling;
- maximum model rounds and tool calls;
- maximum actions and D1 statements per plan; and
- execute frequency limit.

Usage ledger records:

- provider/model;
- reasoning setting;
- input, cached, reasoning, and output tokens;
- request/first-token/total latency;
- provider retry count;
- estimated/current cost;
- quota reservation/release; and
- success, refusal, timeout, or error class.

Provider retries never retry execution.

## Failure and Recovery Matrix

| Failure | Result | Recovery |
|---|---|---|
| Session/workspace/entitlement changed | 401/403, no provider/write | Reauthenticate or regain entitlement |
| Quota or spend limit | 429 with `Retry-After` and reset metadata | Resume after reset |
| Read timeout | Required source marked unavailable; authoritative plan blocked | Retry one bounded read or clarify |
| Provider timeout/429/5xx | Run/tool attempt recorded; no mutation | One bounded provider retry within total deadline |
| Invalid provider schema/handle | Proposal rejected and audited | Deterministic clarification/fallback |
| Prompt injection attempt | Tool/policy denial | Explain boundary; no authority expansion |
| Plan/confirmation expired | 409, no mutation | Refresh sources, recompile, reconfirm |
| Permission revoked | 403, plan stale | Regain access or take over manually |
| Target/source revision changed | 409 conflict | Full new preview and confirmation |
| Duplicate execute | One lease/receipt | Return in-progress or same committed receipt |
| Crash before final batch | No domain mutation; lease expires | Reclaim same plan/action IDs |
| Final D1 batch failure | Zero domain/terminal writes | Retry whole command with same key after receipt read |
| Response lost after commit | Client uncertain | Same key returns committed receipt |
| Realtime notification fails | Domain commit succeeds | Query invalidation/readback; best-effort retry |
| User rejects/takes over | Plan terminal rejected or remains review-only | Manual UI continues |
| Provider unavailable | Execute unaffected; new turns fail or use approved adapter only | No silent provider switch |

## Threat Model

| Threat | Required control |
|---|---|
| Cross-tenant ID substitution | Joined workspace/project/estimate lookup at every read and write |
| Client privilege selection | Server intent/risk/tool policy; no client route classifier |
| Malicious/compromised model | Read/propose only, strict schema, local validation, no execute tool |
| Retrieved-content injection | Untrusted structured data, opaque handles, deterministic policy |
| Stale preview | Target/source fingerprint and compare-and-swap |
| Replay/double click | Single-use approval, stable action IDs, lease, idempotent receipt |
| Partial commit | One final D1 batch or separately reconfirmed phases |
| Audit omission | AI terminal receipt included in final batch |
| Hallucinated source/price | Validated source manifest and canonical calculations |
| Data exfiltration | Minimum projections, payload caps, data-category audit |
| Cost abuse | User/workspace/IP limits, concurrency, token/spend ceilings |
| SSRF/arbitrary action | No network, shell, remote MCP, HTTP, or SQL tool |
| Destructive request | No representable `R4` executor |
| Realtime spoof/drop | D1 readback authoritative; realtime invalidation only |
| PII over-retention | No raw transcript persistence; retention/export/erasure integration |

## Monitoring

Metrics:

- provider/tool/turn latency;
- tokens and estimated cost by workspace/model/mode;
- invalid schema/source-handle rate;
- authorization, policy, tenant, and prompt-injection denials;
- draft-to-confirm and confirm-to-commit rate;
- stale plan conflicts;
- idempotent replay count;
- lease age and reclaim count;
- action run/receipt mismatch;
- blocked destructive attempts;
- source coverage and allowance rate;
- preview vs committed money equality; and
- user rejection/takeover rate.

Alerts:

- any domain commit without completed plan/tool/domain receipts;
- valid lease older than its maximum;
- repeated cross-tenant denials;
- provider invalid-output/failure rate above the defined sample threshold;
- preview/receipt total mismatch;
- workspace spend at 80% warning and 100% fail closed; and
- persistent nonterminal action runs.

Use Worker structured logs for high-volume runtime detail. Keep D1 for
low-volume durable metadata, plans, decisions, and receipts.

## Explicit Rejections

- No provider-hosted remote MCP or tool runtime in the first release.
- No programmatic tool calling or provider multi-agent mode.
- No generic `call_server_action` tool.
- No raw D1/SQL tool.
- No model-generated authorization.
- No hidden autonomous mode.
- No destructive tool represented but disabled only by prompt.
- No approval that omits exact operations and money effects.
- No persistence of chain-of-thought.
- No provider response ID as the only conversation or plan state.
- No blind rollback that overwrites later human edits.
- No synthetic prices to make a budget appear complete.
