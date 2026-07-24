# Ask Flip Architecture, Safety, And Data Contract

## Architecture Decision

Ask Flip is a capability-separated AEC estimating workflow, not a general
autonomous agent.

```text
Browser
  -> authenticated Ask Flip route
  -> server identity, workspace, entitlement, release profile
  -> typed read registry and product knowledge
  -> hosted foundation model
  -> answer or strict proposal
  -> deterministic server compiler
  -> server-owned immutable plan
  -> complete safe preview
  -> explicit approval
  -> server-only execute broker
  -> canonical package-create domain command
  -> D1 readback and immutable receipt
```

The provider never receives an execute capability. The browser never holds the
only authoritative plan. The execute request never resends or controls the
canonical plan body.

## Trust Boundaries

### Untrusted Inputs

- browser messages;
- route, current-screen, active-tab, and selected-record hints;
- provider output and tool arguments;
- client-held recent conversation turns;
- user-entered project, estimate, node, row, component, template, supplier,
  activity, and historical text;
- stored names, descriptions, notes, source snapshots, and metadata;
- uploaded or external content in any future release;
- realtime payloads;
- model-calculated quantities, prices, totals, risk, and effects;
- client/model IDs, revisions, permissions, policy versions, profile values,
  confirmation state, and execution status.

### Trusted Only After Current Server Proof

- Better Auth session identity;
- current closed-beta/product access;
- active workspace;
- effective Ask Flip release profile;
- current domain permission;
- target/source membership in workspace, project, estimate, tab, node, row,
  component, template, or price-option boundaries;
- current revisions and timestamps;
- current component and price-option ownership/version;
- current canonical money calculation;
- current server-owned plan version and hashes;
- unconsumed server approval;
- current execution lease;
- committed D1 readback;
- committed domain and Ask Flip receipts.

### Never Sent To The Model

- secrets or credentials;
- raw database access;
- SQL;
- service-role or local-admin credentials;
- release-profile controls;
- product-entitlement objects;
- permission objects;
- approval or execute tokens;
- mutation executors;
- unrestricted record IDs;
- raw server function names;
- canonical receipts;
- hidden policy implementation;
- full logs;
- unrestricted retrieved records;
- raw D1 rows; or
- hidden reasoning.

## Product-Knowledge Boundary

Ask Flip product knowledge is a versioned, curated application capability, not
training and not live workspace data.

### Capability

Provider-visible name:

`read_archestimator_product_knowledge`

### Covered Concepts

- Project
- Estimate
- Estimate Tab
- Group Node
- Area Node
- estimate rows
- component-library items
- price options
- linked and unlinked source state
- project-specific source state
- templates
- historical/comparable precedents
- assumptions and allowances
- revisions
- receipts
- publication terminology
- supported Ask Flip profiles/modes
- canonical money semantics

### Contract

The reader:

- accepts a bounded topic enum or validated query;
- retrieves only relevant sections;
- returns a knowledge version;
- returns a safe display source;
- returns no workspace facts;
- returns no executable action;
- does not dump the full corpus;
- stays separate from live D1 retrieval;
- has no vector, embedding, or broad RAG dependency; and
- is updated through normal versioned product documentation or static ontology
  review.

Product knowledge may explain how Archestimator works. It cannot prove a
workspace record, price, quantity, permission, or completed mutation.

## Release-Profile Boundary

```ts
type AskFlipReleaseProfile =
  | "DISABLED"
  | "ASK_ONLY"
  | "ASK_AND_DRAFT"
  | "PACKAGE_CREATE_APPLY"
  | "EXPANDED_ACTIONS";
```

### Effective Profile Resolution

The server calculates the effective profile from:

1. master AI kill switch;
2. one server-only maximum profile setting;
3. current closed-beta/product entitlement;
4. a global default-off D1 Ask Flip feature gate read through a strict
   non-stale authorization path;
5. active workspace context; and
6. current configuration availability.

Any missing, invalid, denied, or unavailable input resolves to `DISABLED`.

The current closed-beta eligible-user set is the initial cohort. The global D1
flag is not described as workspace entitlement. Finer user/workspace rollout
requires an explicit server-owned entitlement record rather than the shared
admin flag cache.

The browser and model cannot provide, select, raise, or cache the authoritative
profile.

### Separation Of Responsibilities

| Layer | Owns |
|---|---|
| Master kill switch | Emergency disable of all Ask Flip UI and server behavior |
| Effective release profile | Maturity stage and eligible cohort exposure |
| Tool registry | Whether a capability exists in the active release |
| Domain authorization | Whether this actor may use that capability on this target/source now |
| Plan policy | Whether the complete normalized plan is eligible, reviewable, current, and confirmable |

No hidden UI, prompt instruction, or environment flag per action replaces
domain authorization.

`EXPANDED_ACTIONS` is a reserved enum only. It grants no capabilities until a
separate plan registers them.

## Release A - Ask-Only Flow

### 1. Receive

The server accepts:

- versioned request schema;
- bounded recent messages;
- safe current-surface enum;
- route and selected-record hints;
- client request ID; and
- cancellation signal.

It rejects:

- unknown fields;
- identity, workspace, entitlement, permission, profile, risk, price, total,
  approval, or execution fields;
- oversized messages or arrays; and
- unsupported modes.

### One-Route Operation Contract

All Releases A-C use authenticated `POST /api/ai/ask`. The request is a strict
discriminated union whose server-recognized operation is one of:

- `TURN` for Ask or Draft conversation and provider streaming;
- `PLAN_REVISE` for a new immutable plan version;
- `PLAN_DECISION` for approve, reject, or take over;
- `PLAN_EXECUTE` for Release C identifier-only execution; or
- `RECEIPT_GET` for lost-response recovery.

`TURN` returns the versioned event stream. The other operations return bounded
JSON. Unknown operations or fields reject. The route enforces the repository's
current authenticated same-origin mutation protections, validates JSON content
type, and derives actor/workspace/profile on the server. Browser cancellation
aborts the `TURN` request; disconnect propagates the server abort signal. No
cancel, status, or decision request carries authority beyond current session
and plan identifiers.

### 2. Authenticate And Gate

Before provider spend or stream start:

1. authenticate Better Auth user;
2. reject local-admin database bypass;
3. derive current workspace;
4. verify current closed-beta/product entitlement;
5. resolve effective release profile;
6. require at least `ASK_ONLY`;
7. enforce user/workspace/IP quota and workspace concurrency;
8. verify provider configuration;
9. enforce provider payload and cost reservation;
10. create a started metadata-only run;
11. establish a total request deadline and abort signal.

Failure returns a non-streaming 4xx/5xx response with safe recovery metadata.

### 3. Retrieve

The provider receives:

- versioned system/product rules;
- a bounded recent message window;
- safe route labels;
- currently allowed read-tool schemas; and
- compact tool results with opaque source handles.

The server executes each read only after:

- tool-name allowlist check;
- strict local argument validation;
- server target resolution;
- current authorization;
- selected-column query;
- database/result/payload limits;
- deadline;
- source/freshness construction; and
- data-access audit.

### 4. Calculate

Deterministic product code, not the model, computes:

- row totals;
- estimate totals;
- rankings;
- deltas;
- budget headroom;
- source freshness;
- record counts; and
- any value represented as authoritative.

### 5. Answer Or Clarify

The model may:

- answer from provided evidence;
- call another approved read tool within limits;
- ask a material clarification; or
- refuse an unsupported/prohibited request.

`propose_action_plan` is not available in `ASK_ONLY`.

### 6. Stream

The application translates provider SSE into the Ask Flip event protocol. It
does not expose provider event names, IDs, raw error bodies, raw tool
arguments/results, or hidden reasoning.

### 7. Finish

Exactly one terminal event records:

- completed;
- refused;
- cancelled;
- quota blocked;
- provider failed;
- deadline exceeded; or
- application failed.

Every path is non-mutating.

## Release B - Draft And Review Flow

Release B includes the Release A flow and adds one provider-visible capability:

`propose_action_plan`

### Proposal Boundary

The proposal schema contains only normalized user-intent operations and source
handles. It contains no:

- authoritative IDs;
- identity or permission;
- profile;
- canonical price or total;
- risk;
- approval;
- execute token;
- SQL;
- server function name; or
- receipt.

### Deterministic Compilation

The server:

1. validates the strict proposal locally;
2. resolves every source handle;
3. resolves target hints through current workspace authority;
4. rejects provider-created IDs or unknown handles;
5. verifies the action kind exists in the current registry;
6. rejects prohibited or mixed-scope work;
7. derives current sources and target/source revisions;
8. calculates canonical record counts and money;
9. computes effective risk;
10. creates stable action IDs;
11. creates a complete safe preview;
12. computes canonical plan and preview hashes;
13. persists the immutable plan version;
14. streams the safe plan projection.

### Review

The UI shows:

- exact new target or current read scope;
- every proposed operation;
- exact record counts;
- source class and freshness;
- authoritative totals and budget effects;
- assumptions;
- missing information;
- unresolved questions;
- risk class;
- expiry;
- undo or no-undo state;
- plan version; and
- action-labelled approval wording.

No executable action may be hidden behind "and more."

### Review Controls

- Approve
- Reject
- Edit Plan
- Take Over

In `ASK_AND_DRAFT`, Approve records approval state only. No business-data
executor exists in the release.

Edit Plan creates a new immutable version. Prior approval becomes invalid.

## Release C - Apply Flow

Release C exposes no additional provider tool. It adds a server-only execute
branch for one action kind:

`project.estimate-package.create`

### Execute Request Contract

The browser may send:

- plan ID;
- plan version;
- client request ID;
- literal structured execute intent;
- idempotency key; and
- optional client-observed plan/preview hashes as non-authoritative conflict
  hints.

The request never sends:

- canonical plan body;
- action body;
- source records;
- target IDs as authority;
- permission/profile/risk;
- approval token;
- authoritative totals; or
- receipt.

### Execute Sequence

1. Make no provider call.
2. Reauthenticate Better Auth user.
3. Reject local-admin database bypass.
4. Rederive active workspace.
5. Recheck current closed-beta/product entitlement.
6. Resolve current effective profile and require
   `PACKAGE_CREATE_APPLY`.
7. Load the canonical plan/version from D1.
8. Verify schema, plan ID/version, canonical hash, preview hash, policy version,
   registry version, effective risk, exact action set, status, and expiry.
9. Load and verify the approving actor and unconsumed approval.
10. Reauthorize every source and target.
11. Revalidate every source and target revision/freshness fact.
12. Recompute authoritative money and compare with the stored preview.
13. Claim an expiring execution lease with compare-and-swap.
14. Execute one bounded domain command.
15. Commit domain writes, history, activity outbox, publication revision
    behavior, mutation receipt, approval consumption, plan completion, Ask Flip
    receipt, and terminal audit consistently.
16. Read back committed IDs and totals.
17. Return canonical links and receipt.
18. Return the same receipt on idempotent replay.

### Hard Action Boundary

The executable plan must contain exactly one package-create command whose
normalized children are:

- create one project;
- create one estimate;
- create one default tab;
- create new Group/Area nodes;
- insert verified library-backed rows; and
- insert explicitly reviewed allowance rows.

Any other action kind rejects the entire execute attempt before lease claim.

## Provider-Visible Tool Boundary

### Release A Reads

- `read_archestimator_product_knowledge`
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

The final registry should preserve only current useful readers and may rename
them once through the versioned contract.

### Release B Plan Tool

- `propose_action_plan`

### Never Provider-Visible

- approve;
- reject persistence;
- execute;
- lease claim;
- idempotency/receipt lookup;
- mutation command;
- SQL;
- raw HTTP;
- server action;
- filesystem/shell/code execution;
- remote MCP;
- publication/sharing/email/invite/admin/external action.

Strict schema conformance is not authorization. Every call is validated and
authorized locally.

## Canonical Server-Owned Plan Persistence

### Chosen Design

Use bounded typed canonical JSON plus normalized approval and receipt records.

#### `ai_action_plans`

One immutable content version per `(workspace_id, plan_id, plan_version)`:

- `plan_id`
- `plan_version`
- `run_id`
- `workspace_id`
- `actor_user_id`
- `schema_version`
- `policy_version`
- `registry_version`
- `release_profile_at_compile`
- `intent`
- `risk_class`
- `status`
- `canonical_plan_json`
- `canonical_plan_sha256`
- `preview_sha256`
- `action_set_sha256`
- `precondition_sha256`
- `expires_at`
- `lease_token_hash`
- `lease_expires_at`
- `attempt_count`
- `created_at`
- `updated_at`
- `terminal_at`

`canonical_plan_json` contains only:

- normalized business operations;
- stable action IDs;
- server-resolved internal target references;
- safe source references and required revision/freshness facts;
- authoritative effects;
- assumptions and unresolved questions;
- risk;
- execution limits; and
- safe confirmation metadata.

It contains no raw prompt, transcript, hidden reasoning, provider payload,
unrestricted retrieved record, secret, or permission object.

#### `ai_action_plan_approvals`

- plan ID/version/workspace;
- approving actor;
- decision: approved or rejected;
- canonical/preview/action-set hashes;
- server-generated confirmation-label hash;
- policy/registry versions;
- approved/rejected timestamp;
- consumed timestamp;
- consuming receipt ID.

One active approval decision exists per immutable version. Approval consumption
is compare-and-swap and commits with the domain receipt.

#### `ai_action_plan_receipts`

- immutable receipt ID;
- plan ID/version/workspace/actor;
- domain command and receipt ID;
- canonical/action-set hashes;
- status;
- bounded safe receipt JSON;
- idempotency fingerprint;
- committed timestamp.

Completed receipts cannot be updated or replaced.

### Why This Design

- server can reload the complete executable plan;
- browser never becomes canonical storage;
- complete action sets are known;
- stable action IDs survive transport retries;
- privacy excludes raw conversation and unrestricted evidence;
- normalized approval/receipt rows support single-use confirmation and
  immutable completion;
- action/source tables are deferred until proven necessary; and
- it remains specific to Ask Flip rather than a general workflow engine.

### Bounds

Implementation defines and enforces:

- maximum plan JSON bytes;
- maximum preview bytes;
- maximum actions;
- maximum groups, areas, and rows;
- maximum sources;
- maximum assumptions/questions;
- maximum receipt bytes;
- maximum D1 statements; and
- expiry.

Over-limit work is rejected and re-planned. It is not truncated.

## Plan And Action Schema

```ts
type AskFlipActionPlan = {
  schemaVersion: number;
  policyVersion: string;
  registryVersion: string;
  planId: string;
  planVersion: number;
  runId: string;
  intent: "project.estimate-package.create";
  status:
    | "draft"
    | "review_required"
    | "approved"
    | "executing"
    | "completed"
    | "rejected"
    | "taken_over"
    | "stale"
    | "expired"
    | "superseded";
  riskClass: "HIGH_PACKAGE_CREATE";
  actions: AskFlipPlannedAction[];
  sources: AskFlipSourceReference[];
  assumptions: AskFlipAssumption[];
  unresolvedQuestions: AskFlipQuestion[];
  authoritativeEffects: AskFlipEffects;
  actionSetHash: string;
  preconditionHash: string;
  canonicalPlanHash: string;
  previewHash: string;
  expiresAt: string;
};
```

Actor/workspace internals are stored on the server row and omitted from the safe
browser projection.

Each action includes:

- stable action ID;
- action kind and schema version;
- ordinal and dependencies;
- normalized arguments;
- server-owned target reference;
- required permission;
- expected source/target revision;
- source handles and freshness;
- authoritative record/money effects;
- safe confirmation label; and
- execution limits.

Action IDs derive from plan ID/version/ordinal/normalized action hash, not the
browser idempotency key.

## Plan Versioning And State Machine

```text
draft
  -> review_required
  -> rejected
  -> taken_over
  -> expired

review_required
  -> approved
  -> rejected
  -> taken_over
  -> stale
  -> expired
  -> superseded (edit creates new version)

approved
  -> executing (lease claimed)
  -> taken_over
  -> stale
  -> expired
  -> superseded

executing
  -> completed
  -> approved (lease expired, no receipt, same action set safe to reclaim)
  -> stale (current authorization/source/precondition invalid)

completed | rejected | taken_over | stale | expired | superseded
  -> terminal
```

Rules:

- canonical content never changes within a version;
- editing always creates a new version;
- prior approvals never carry forward;
- taken-over, stale, rejected, expired, superseded, and completed are terminal;
- completed receipt is immutable;
- no terminal version returns to an executable state;
- executing can return to approved only when the lease expired, no domain or
  Ask Flip receipt exists, and the same plan/action/idempotency facts remain
  valid;
- a final batch failure leaves no domain mutation and no completed receipt.

## Approval Contract

Approval is valid only when all match current server state:

- authenticated actor;
- active workspace;
- current product entitlement;
- current `PACKAGE_CREATE_APPLY` profile at execute;
- plan ID/version;
- canonical plan hash;
- preview hash;
- action-set hash;
- policy and registry versions;
- exact complete action set;
- source/target precondition hash;
- risk class;
- expiry;
- server-generated confirmation-label hash;
- approved state;
- unconsumed approval.

Silence, free-form "go ahead," provider output, stale UI state, or a browser
checkbox is not approval.

Release B approval records review state only.

Release C may consume an existing valid approval only inside the final atomic
commit. A changed plan, source, target, amount, policy, registry, profile, or
risk requires a new version and approval.

## Source Contract

Each source contains:

- opaque provider handle;
- server-only resource reference;
- safe display label;
- data class;
- authority class;
- workspace/project/estimate scope;
- revision/version/updated time;
- retrieval time;
- freshness state and policy;
- audited row count/category;
- safe app link;
- safe provider projection; and
- whether the source is current, user-provided, or precedent.

### Source Classes

- `PRODUCT_KNOWLEDGE`
- `CURRENT_LIBRARY`
- `CURRENT_PROJECT`
- `CURRENT_ESTIMATE`
- `USER_INSTRUCTION`
- `HISTORICAL_PRECEDENT`
- `COMPARABLE_PRECEDENT`
- `TEMPLATE_PRECEDENT`
- `ASSUMPTION`
- `MODEL_SUGGESTION`

Answers and previews distinguish:

- retrieved fact;
- deterministic calculation;
- user instruction;
- precedent;
- assumption;
- model suggestion.

Precedents and assumptions are never displayed as current supplier pricing.

## Target And Source Freshness

### Compile Time

The compiler records:

- current workspace/actor;
- target existence and ownership;
- source existence and ownership;
- component version;
- selected price-option identity/version;
- target revision/updated time;
- source revision/updated time;
- knowledge version;
- calculation version;
- retrieval time; and
- freshness policy result.

### Execute Time

The server re-resolves and compares all current facts. Missing, changed,
unauthorized, stale, superseded, or cross-workspace data makes the plan `stale`
before mutation.

The model cannot waive freshness.

## Risk Policy

| Class | Meaning | Provider role | Execution |
|---|---|---|---|
| `READ_ONLY` | Product/workspace read and deterministic calculation | Select approved read tool | No business mutation |
| `REVIEW_ONLY` | Proposal, compilation, plan version, approval/rejection | Call `propose_action_plan` only in Draft profiles | No business mutation |
| `HIGH_PACKAGE_CREATE` | One additive new project/estimate package | Propose only | Server-only after exact approval and revalidation |
| `PROHIBITED` | Existing-record mutation, destructive, permission, external, admin, raw tool | Refuse or explain manual path | Never represented by executor |

The server computes risk. Client/provider risk fields are rejected.

A request that mixes allowed and prohibited operations is denied as a whole.
The server does not silently execute the allowed subset.

## Execution Lease

The lease claim is a compare-and-swap that requires:

- status `approved`;
- current hashes/policy/registry/expiry;
- unconsumed approval;
- no completed receipt;
- no live lease; and
- current actor/workspace/profile.

Lease data includes:

- random server token hash;
- acquired time;
- expiry;
- attempt count;
- plan/action/idempotency fingerprint.

Only the lease holder may enter the final domain command. The lease is not a
permission token and is never sent to the provider.

## Idempotency And Recovery

Idempotency binds:

- workspace;
- actor;
- command kind;
- plan ID/version;
- canonical/action-set hashes;
- normalized command fingerprint; and
- client idempotency key.

Behavior:

- completed receipt found: return the same result with replay status;
- live lease found: return in-progress and retry timing;
- expired lease and no receipt: safely reclaim using the same stable action IDs;
- same key with different fingerprint: reject conflict;
- response lost after commit: same key returns committed receipt;
- no completed receipt and final batch failed: retry the whole command with the
  same key after lease recovery;
- never instruct the client to invent a new key after an uncertain result.

## Canonical Package-Create Domain Contract

`project.estimate-package.create` is provider-free and reusable outside Ask
Flip.

### Allowed Business Effects

- one project;
- one estimate;
- one default tab;
- new Group and Area nodes;
- verified library-backed rows;
- reviewed allowance rows;
- required history/activity/publication/receipt sidecars.

### Required Invariants

- current Workshop write/maintenance gate;
- current workspace editor authorization;
- deterministic server-generated IDs;
- active two-kind Group/Area hierarchy;
- Area-only row placement;
- current source ownership/version/price-option;
- allowance classification;
- source snapshot;
- canonical currency and money calculation;
- budget ceiling semantics;
- request fingerprint;
- statement/result-size limit;
- canonical history;
- activity outbox;
- initial/current publication source revision behavior;
- canonical mutation receipt;
- Ask Flip approval/plan/action/receipt terminal state;
- authoritative readback.

### Prohibited Business Effects

- any mutation to an existing project/estimate/tab/node/row;
- template insertion/copy;
- permanent component-library creation;
- supplier/price-option mutation;
- bulk/cross-scope work;
- publication/share/send/invite/permission/client-portal/account/billing/upload/
  deployment/credential/admin work.

### Prepare/Commit Interface

The exact domain owner is
`src/lib/projects/project-estimate-package-command.ts`.

`prepareProjectEstimatePackageCreate(context, input)`:

- performs current project/estimate/source/money validation;
- generates deterministic IDs;
- returns the complete ordered business, source-guard, activation/resource/
  onboarding, history, activity, publication, and mutation-receipt D1
  statement set;
- returns an authoritative readback descriptor and predicted statement/receipt
  sizes;
- never calls `.run()` or `.batch()`; and
- contains no Ask Flip, provider, or model logic.

`src/lib/ai/ask-flip/package-create-executor.ts` composes that statement set
with prepared approval-consumption, plan-completion, Ask Flip receipt, and
terminal-audit statements. It requires a real D1 `database.batch`; the
repository's sequential fallback is not an atomic substitute. Exact statement
count and serialized receipt size are checked before commit.

## Atomicity

A Release C plan is executable only if all required statements and receipt data
fit one current D1 atomic boundary.

The atomic boundary includes:

- business rows;
- history event;
- activity outbox event;
- required publication source revision;
- canonical mutation receipt;
- approval consumption;
- plan completion;
- immutable Ask Flip receipt;
- terminal run/tool audit.

If this cannot fit:

- do not chunk;
- do not partially commit;
- do not execute a subset;
- do not reuse approval for revised scope;
- return separately reviewable proposed phases;
- require new confirmation.

Realtime and client query invalidation occur after commit and are best effort.
They never prove mutation success.

## Money Contract

- Currency is server-derived.
- Quantity and cost inputs are normalized and validated.
- All money uses canonical integer minor-unit calculations.
- Preview and persistence use the same calculation function/version.
- Mixed currency rejects.
- Policy thresholds use canonical deltas.
- Model/client totals are ignored.
- Receipt includes calculation version, currency, row totals, package total,
  budget ceiling, and headroom.
- Budget is a ceiling, not an instruction to consume all available value.
- Historical/template values remain reviewed precedents.
- Allowances are explicitly reviewed and classified.
- Synthetic supplier prices reject.

## Prompt-Injection Defenses

1. Separate instructions from untrusted data.
2. Label retrieved text as data.
3. Prefer typed fields over concatenated documents.
4. Use opaque source handles.
5. Expose no execute tool.
6. Validate tool name and arguments locally.
7. Reject provider-created IDs/handles.
8. Derive all identity/profile/permission/target facts server-side.
9. Compare proposal with user intent and current release policy.
10. Calculate risk and effects deterministically.
11. Require exact human approval for Release C.
12. Reauthorize and refresh at execute.
13. Record blocked attempts as metadata.

A guardrail model may assist detection but is never an authorization control.

## Privacy And Retention

### Application

- conversation remains bounded and in browser memory;
- requests send only the recent needed window;
- no raw transcript table is created;
- audit stores hashes and safe metadata;
- canonical plans store normalized operations and safe references only;
- no hidden reasoning is stored;
- no unrestricted retrieved records are stored;
- safe source labels minimize client/site identity;
- a versioned default-deny outbound-provider and metadata-audit field allowlist
  excludes raw records, secrets, permissions, direct unrestricted IDs, and
  unnecessary PII;
- deterministic redaction is verified at the outbound and audit sink boundary;
- approval and receipt retention is documented;
- plan/approval/receipt rows join privacy export and erasure handling;
- the data-class lifecycle matrix names retention configuration, deletion
  mechanism, content erasure, actor anonymization, export behavior,
  browser-state clearing, and backup/restore limitations;
- legal/audit retention exceptions are explicit and narrow;
- structured workspace preference/decision signals remain later scope.

### Provider

- provider credentials and base endpoint are server-only;
- the endpoint must match the exact configured OpenAI or authorized Gateway
  host allowlist; client/user endpoints and unknown hosts reject;
- every Responses request uses `store: false`;
- provider Conversations/Threads are not canonical state;
- provider receives minimum necessary messages, product knowledge, read schemas,
  compact results, opaque handles, and Draft-only proposal schema;
- provider receives no secrets, permissions, execute/approval tokens, raw SQL,
  unrestricted IDs, mutation executors, or canonical receipts;
- training opt-in remains off unless separately authorized;
- abuse-monitoring retention, ZDR/modified monitoring, region, and account scope
  require live readback before release.

### AI Gateway

If authorized:

- request/response payload logging is disabled or explicitly metadata-only;
- personalized live-workspace response caching is disabled;
- retention/logging/cache settings are read back;
- provider and Gateway controls are reviewed separately;
- Gateway does not replace application minimization or policy.

## Streaming Contract

Application event types:

- `turn.started`
- `status.changed`
- `read.started`
- `read.completed`
- `source.available`
- `answer.delta`
- `clarification.required`
- `proposal.received`
- `plan.available`
- `plan.state_changed`
- `receipt.available`
- `turn.refused`
- `turn.cancelled`
- `turn.failed`
- `turn.completed`

Rules:

- every event has protocol version, sequence, run ID, and client request ID;
- sequence numbers are monotonic;
- payloads are bounded;
- no raw provider event is the client contract;
- no hidden reasoning;
- no raw tool arguments/results;
- exactly one terminal event;
- auth/profile/quota/audit/provider checks complete before stream;
- disconnect aborts read/provider work;
- Release C execute does not use the provider stream and should return one
  atomic JSON result or a status lookup contract;
- provider completion is never a domain receipt.

### Browser Wire Format

The application stream uses provider-independent SSE:

- response content type `text/event-stream; charset=utf-8`;
- each frame uses `event: ask_flip`, `id: <sequence>`, one JSON `data:` payload,
  and the terminating blank line;
- the JSON payload is the versioned bounded event envelope, not a provider
  event;
- failures before headers return bounded JSON with the appropriate HTTP status;
- failures after headers emit exactly one typed terminal `turn.failed` event
  and close;
- cancellation emits `turn.cancelled` when the server can still write, then
  closes;
- the client uses streaming UTF-8 decoding, buffers incomplete frames, rejects
  malformed/oversized envelopes, and treats EOF without one terminal event as
  failure; and
- provider SSE parsing and provider response identifiers remain inside the
  OpenAI adapter.

## Rate, Deadline, And Cost Controls

Before provider work:

- per-user/IP burst limit;
- user/workspace rolling request quota;
- workspace provider concurrency;
- input/output byte and token ceiling;
- maximum recent messages;
- maximum model rounds;
- maximum read calls;
- maximum proposal calls;
- total request deadline;
- per-read and provider deadlines;
- bounded provider retry count;
- estimated spend reservation and ceiling.

Before execute:

- execute frequency limit;
- plan action/record/source limits;
- D1 statement limit;
- receipt-size limit;
- one live lease per plan.

Usage metadata records:

- provider/model snapshot;
- adapter version;
- reasoning configuration;
- input/cached/output/reasoning token counts where available;
- first-event/first-content/total latency;
- tool count;
- provider retry count;
- estimated cost;
- success/refusal/error class.

Provider retries never cross into execute.

## Failure And Recovery Matrix

| Failure | Result | Recovery |
|---|---|---|
| Master kill switch off | 404/default-off UI | Operator re-enables separately |
| Invalid/missing release profile | `DISABLED`, no provider or mutation | Correct server configuration |
| Session missing | 401, no provider/mutation | Reauthenticate |
| Closed-beta/product entitlement denied | 403, no provider/mutation | Regain eligible access |
| Workspace missing/changed | 403 or stale, no mutation | Resolve valid workspace and retry |
| Quota/spend limit | 429 with safe reset metadata | Retry after reset |
| Required read timeout/unavailable | Answer limited or plan blocked | Retry bounded read or clarify |
| Product knowledge topic unavailable | Explicit unsupported answer | Update curated knowledge later |
| Provider timeout/429/5xx | Terminal non-mutating error | One bounded same-provider retry within deadline |
| Provider unavailable during execute | No effect on execute | Continue provider-free execute |
| Invalid provider schema/handle | Proposal rejected and audited | Clarify or retry provider turn within limits |
| Prompt injection attempt | Tool/policy denial | Explain boundary, no scope expansion |
| Plan edited | Prior version superseded and approval invalid | Review new version |
| Plan rejected | Terminal, no mutation | New request or manual workflow |
| Plan expired | Terminal, no mutation | Refresh sources and compile new version |
| Permission revoked after approval | Plan stale, no mutation | Regain access or manual workflow |
| Price/source changed after approval | Plan stale, no mutation | Refresh, recompile, reapprove |
| Hash/policy/registry/action set changed | Conflict, no mutation | New plan version |
| Duplicate execute with live lease | In progress, no duplicate | Poll status/retry same key |
| Lost response after commit | Client uncertain | Same key returns receipt |
| Final D1 batch failure | Zero domain/terminal writes | Recover lease and retry same key |
| Plan exceeds D1 boundary | No mutation | Split into new separately reviewable plans |
| Prohibited action request | Deterministic refusal, no executable plan | Use manual workflow or future plan |
| Realtime/query invalidation fails | Commit remains valid | Readback/invalidation retry |
| Provider/Gateway controls unverified | Release remains disabled | Complete authorized live readback |

## Threat Model

| Threat | Required control |
|---|---|
| Cross-workspace ID substitution | Server-derived joined resolution at every read/compile/execute |
| Client privilege/profile selection | Strict request schema and server resolver |
| Compromised or malicious model | Read/propose only, local validation, no execute capability |
| Retrieved-content injection | Structured untrusted data, opaque handles, deterministic policy |
| Browser-held plan tampering | Server-owned canonical plan; execute loads from D1 |
| Stale preview | Source/target precondition hash and execute-time recheck |
| Approval replay | Immutable versions, single-use approval, action-set hash |
| Double click or lost response | Lease, idempotency fingerprint, immutable receipt |
| Partial commit | One atomic command or no execution |
| Audit omission | Receipt/terminal audit in final atomic boundary |
| Hallucinated source or price | Handle resolution, current source manifest, canonical money |
| Data exfiltration | Demand-driven minimum projection, payload limits, data-access audit |
| Cost abuse | Quota, concurrency, token/spend limits |
| SSRF/arbitrary action | No HTTP/shell/filesystem/code/remote MCP/SQL tool |
| Destructive or external action | No representable executor |
| PII over-retention | No raw transcripts/retrieved records; retention/export/erasure |

## Monitoring

Application metrics:

- profile resolution and denial reason;
- provider/read/turn latency;
- tokens and estimated cost;
- read-tool selection and row counts;
- invalid schema/source-handle rate;
- authorization/cross-workspace denials;
- prompt-injection/prohibited-action attempts;
- plan compile/revision/approval/rejection/takeover rate;
- stale/expired/superseded plan count;
- lease age/reclaim count;
- idempotent replay count;
- domain/Ask Flip receipt mismatch;
- preview/committed money mismatch;
- source coverage and allowance rate;
- nonterminal audit age.

Alerts:

- any domain commit without domain and Ask Flip receipts;
- any completed plan without consumed approval;
- any valid lease older than maximum;
- repeated cross-workspace denial;
- preview/receipt money mismatch;
- persistent nonterminal run/tool/plan state;
- provider invalid-output or failure-rate drift;
- spend warning and fail-closed threshold.

Use structured Worker logs for high-volume runtime detail. Use D1 only for
low-volume durable plan, approval, receipt, and audit truth. Never log raw
conversation or unrestricted retrieved content.

## Explicit Rejections

- No custom model training or fine-tuning.
- No provider-owned canonical conversation or memory.
- No vector search or broad RAG in Releases A-C.
- No browser-selected release profile or authorization.
- No client regex privilege routing.
- No action-by-action environment flag matrix.
- No provider-visible execute or approval tool.
- No programmatic provider tool runtime, remote MCP, shell, filesystem, HTTP,
  computer use, code execution, or SQL.
- No raw D1/business-table mutation under `src/lib/ai`.
- No client-resubmitted authoritative plan body.
- No canonical plan that exists only in browser memory.
- No free-form text confirmation.
- No silent provider fallback or model escalation.
- No broad Release C action schema with prompt-only prohibitions.
- No update, replace, delete, rename, template insert, library create, or
  cross-scope mutation in Release C.
- No synthetic supplier price.
- No silent budget allocation.
- No partial plan execution or silent chunking.
- No provider completion text treated as a mutation receipt.
- No completed receipt rewrite.
- No raw transcript, hidden reasoning, unrestricted retrieved record, or
  provider payload persistence.
