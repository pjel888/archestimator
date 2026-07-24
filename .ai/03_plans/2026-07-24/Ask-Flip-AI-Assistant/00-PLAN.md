# Ask Flip AI Assistant Implementation Plan

## Task Contract

### Objective And User Intent

Deliver Ask Flip as a professional AEC estimating workflow that uses an
existing hosted foundation model to answer estimating questions and prepare
reviewable estimate packages without transferring product authority to the
model or provider.

The central product promise is:

> Ask Flip converts a project brief or estimating question into an
> evidence-backed answer or reviewable estimate package using the firm's own
> structured cost knowledge, while Archestimator retains control over
> authorization, calculations, confirmation, and execution.

The governing loop is:

`understand -> retrieve -> calculate -> propose -> preview -> confirm -> execute -> receipt`

### Authoritative Inputs

- current source at the implementation start;
- `AGENTS.md`, `CODEX.md`, and applicable `.ai/00_system` contracts;
- this plan pack;
- active D1 migrations under `migrations/`;
- `wrangler.jsonc` for bound Cloudflare resources;
- current provider documentation and account readback only when provider work
  is authorized; and
- current GitNexus output as navigation and blast-radius evidence, never as a
  substitute for source inspection.

Historical Supabase plans, archived plans, old model research, stale graph
output, and the current Package Builder design are source material only.

### Owner, Permissions, And Boundaries

- One implementation owner integrates each shared contract or file.
- Read-only audit lanes may run in parallel; writes to shared files remain
  serialized.
- Local product implementation is permitted only when this pack later enters
  execution.
- Automated product tests, billed provider evaluations, provider account or
  secret configuration, AI Gateway enablement, deployment, and production
  feature enablement require separate current-task authority.
- This revision changes planning artifacts only.

### Required Output

An implementation agent must be able to execute the seven units without:

- deciding whether Ask Flip needs custom training;
- reconciling Ask-only with broad mutation work;
- choosing whether the browser or server owns the action plan;
- deciding whether rollout controls are authorization;
- inventing product knowledge or a RAG platform;
- broadening Release C beyond additive package creation; or
- treating a provider/model claim as application-security evidence.

### Evidence And Test Decision

- Plan validation, JSON parsing, artifact/hash checks, scoped source inspection,
  Git diff inspection, and `git diff --check` are authorized for this plan.
- Product tests remain `TEST_PROPOSAL`.
- Provider/model evaluations remain `TEST_PROPOSAL` plus an external
  authorization boundary.
- Browser, screenshots, visual QA, builds-as-test-gates, and deployment are not
  authorized by this planning task.

### Stop Condition

Stop this planning task when:

- all seven artifacts agree on the three releases and seven-unit DAG;
- only `UNIT-001` is `READY`;
- all implementation criteria remain unproved;
- the manifest matches the prose and validates;
- product implementation remains `NOT_STARTED`; and
- no product code, migration, product test, provider setting, deployment, or
  production state has changed.

Do not begin `UNIT-001` during this plan revision.

## Product Intent

### Existing Hosted Model, Not Custom Training

Ask Flip uses an existing hosted foundation model.

The first implementation requires none of the following:

- custom model training;
- fine-tuning;
- continual training;
- raw-conversation learning;
- provider-owned long-term canonical memory; or
- a model-specific domain contract.

Ask Flip becomes familiar with Archestimator at runtime through:

1. versioned Archestimator product knowledge;
2. server-authorized live workspace retrieval;
3. current project, estimate, active-tab, and selected-record context;
4. typed read capabilities;
5. deterministic domain calculations;
6. structured, explicitly permitted workspace preferences in a later release;
   and
7. accepted and edited user decisions recorded only as structured product
   signals, not raw-chat training data.

### Model Role

The model may:

- interpret natural language;
- choose from approved read tools;
- request clarification;
- synthesize authorized evidence;
- distinguish facts, calculations, instructions, precedents, assumptions, and
  suggestions;
- propose normalized operations; and
- explain uncertainty and source limitations.

The model never owns:

- user or workspace identity;
- product entitlement;
- permissions;
- current project, estimate, tab, node, row, component, template, or source
  identity;
- canonical prices, quantities, totals, or budget effects;
- risk classification;
- confirmation state;
- canonical plan persistence;
- mutation execution;
- SQL or D1 transactions;
- mutation retry;
- revisions, receipts, or audit truth.

## Scope

### In Scope

- one authenticated Workshop Ask Flip surface;
- one application-owned orchestration route;
- a server-owned release-profile resolver;
- a typed provider-neutral adapter contract;
- one initial OpenAI Responses adapter after Release A prerequisites;
- demand-driven workspace read tools;
- versioned Archestimator product knowledge;
- app-linkable sources and freshness;
- typed bounded streaming events;
- deterministic proposal compilation;
- canonical server-owned action plans and immutable versions;
- review, approval, rejection, revision, and takeover state;
- one additive `project.estimate-package.create` command;
- canonical D1 atomicity, receipts, history, activity outbox, publication
  revision, money, freshness, authorization, and statement limits;
- idempotent replay and lost-response recovery;
- current Package Builder disposition and eventual deletion; and
- separate application-security and model-quality evaluation.

### Non-Goals

- a general autonomous agent;
- custom training or fine-tuning;
- vector search or a broad RAG platform;
- provider conversation objects as canonical product state;
- raw transcript, hidden-reasoning, or unrestricted retrieved-record storage;
- automatic cross-provider fallback;
- silent model escalation;
- multiple provider adapters before the corpus proves a need;
- provider-hosted agent runtimes, remote MCP, computer use, shell, filesystem,
  HTTP, code execution, or raw SQL tools;
- action-by-action environment flags;
- existing-estimate update, replacement, deletion, rename, or template
  insertion in Release C;
- permanent component-library, supplier, or price-option mutation in Release C;
- bulk, cross-project, cross-estimate, publication, sharing, email, invite,
  permission, client-portal, account, billing, upload, deployment, credential,
  or administrative actions; and
- production provider, Gateway, deployment, or feature enablement.

## Release Contracts

### Release A - Ask-Only

**Outcome**

One grounded conversational assistant:

- answers authenticated workspace and product questions;
- retrieves only required authorized data;
- uses versioned product knowledge;
- displays app-linkable sources and freshness;
- labels evidence type;
- streams bounded typed events;
- enforces quota, deadline, payload, provider, and audit controls;
- supports clarification, cancellation, refusal, and recovery; and
- performs no action-plan execution or business-data mutation.

**Exit boundary**

Release A is reviewable after `UNIT-004`. The provider-visible tool set contains
read tools only. No canonical plan, approval, execute route, or business write
is reachable.

### Release B - Draft And Review

**Outcome**

Ask Flip may:

- convert a request into a strict typed proposal;
- compile it deterministically into an application-owned plan;
- calculate authoritative effects;
- show every operation without truncation;
- show assumptions, missing information, sources, freshness, risk, totals, and
  budget effects;
- persist immutable plan versions;
- support Approve, Reject, Edit Plan, and Take Over; and
- perform no business-data mutation.

Approval in `ASK_AND_DRAFT` records review state only. It never calls a domain
executor.

**Exit boundary**

Release B is reviewable after `UNIT-005`. The server can reload the complete
canonical plan without the browser resending it, but the release profile
exposes no execute capability.

### Release C - Package-Create Apply

**Outcome**

The first executable write release may only:

- create one new project;
- create one estimate and default tab;
- create new Group and Area nodes;
- insert verified library-backed rows;
- insert explicitly reviewed allowance rows;
- return canonical project and estimate links;
- return one authoritative receipt; and
- replay the same committed result idempotently.

Release C does not represent or execute:

- existing-row updates, replacement, or deletion;
- existing-node rename;
- template insertion or copy into an existing estimate;
- permanent component-library creation;
- supplier or price-option changes;
- bulk quantity or rate changes;
- cross-project or cross-estimate work; or
- publication, sharing, email, invite, permission, client-portal, account,
  billing, upload, deployment, credential, or administrative actions.

**Exit boundary**

Release C is reviewable after `UNIT-006`. Any broader write capability requires
a separate later plan after the Rivera package-create vertical slice is proved.

## Requirements

| ID | Requirement | Release | Test decision |
|---|---|---|---|
| REQ-001 | Ask Flip uses an existing hosted foundation model and gains Archestimator familiarity through versioned product knowledge, live authorized retrieval, current context, typed reads, deterministic calculations, and later explicit structured signals. No training or fine-tuning is required. | All | `NOT_REQUIRED` for contract evidence |
| UX-001 | Release A provides one grounded authenticated conversation with app-linkable sources, clarification, cancellation, typed terminal events, and no mutation. | A | `TEST_PROPOSAL` |
| UX-002 | Release B provides complete proposal preview, immutable plan versions, Approve, Reject, Edit Plan, and Take Over without business-data mutation. | B | `TEST_PROPOSAL` |
| UX-003 | Release C creates the exact Rivera 2BR package through one additive command and returns canonical links and one replay-safe receipt. | C | `TEST_PROPOSAL` |
| SEC-001 | Identity, entitlement, targets, sources, authorization, risk, confirmation, execution, and receipts are server-derived; the model and browser cannot expand authority. | All | `TEST_PROPOSAL` |
| SEC-002 | The canonical executable plan is server-owned, reloadable, immutable by version, approval-bound, expiry-bound, and never controlled by an execute request body. | B-C | `TEST_PROPOSAL` |
| DATA-001 | Package Apply uses canonical authorization, source freshness, integer money, history, activity outbox, publication revision, mutation receipt, statement limits, atomicity, and readback. | C | `TEST_PROPOSAL` |
| OPS-001 | The master kill switch, release profile, cohort/product entitlement, and tool/domain authorization remain separate server controls. | All | `TEST_PROPOSAL` |
| OPS-002 | The application remains provider-neutral, implements one OpenAI Responses adapter first, uses strict local validation and `store: false`, and has no silent fallback or durable model lock. | A | `TEST_PROPOSAL` |
| REQ-002 | Application-security/domain invariants are evaluated separately from model behavior, latency, reliability, token use, and cost per successful task. | All | `TEST_PROPOSAL` |

## Decisions

### DEC-AUTO-001 - Professional Workflow, Not Autonomous Agent

Ask Flip is an estimating workflow with a probabilistic interpretation layer.
The application owns all irreversible or authoritative state transitions.

### DEC-AUTO-002 - No Training; Runtime Product Familiarity

Use an existing hosted foundation model. Product familiarity comes from a
versioned product-knowledge reader, authorized live reads, current screen
context, deterministic calculations, and later explicitly permitted structured
signals. Do not add training, fine-tuning, continual learning, or provider-owned
canonical memory.

### DEC-AUTO-003 - Three Independently Reviewable Releases

Complete Ask-only before Draft/review. Complete Draft/review before any business
mutation. Complete package-create Apply before planning expanded actions.

### DEC-AUTO-004 - One Ask Route; Legacy Package Builder Dormant

`/api/ai/ask` becomes the single product route. The current
`/api/ai/package-builder` route is disabled by server policy during replacement
and is never a parallel production path. Its read, draft, and security logic
may be selectively absorbed. Its broad Apply fork is removed only after
Release C uses the canonical command and receipt.

### DEC-AUTO-005 - Release Profile Is Not Authorization

The effective release profile is server-derived from:

1. the existing master AI kill switch;
2. one server-only maximum profile setting;
3. current closed-beta/product entitlement and a default-off D1 cohort feature
   gate; and
4. the authenticated workspace context.

The profile values are:

```ts
type AskFlipReleaseProfile =
  | "DISABLED"
  | "ASK_ONLY"
  | "ASK_AND_DRAFT"
  | "PACKAGE_CREATE_APPLY"
  | "EXPANDED_ACTIONS";
```

`DISABLED` is the default. The browser and model cannot set or raise the
profile. `EXPANDED_ACTIONS` reserves a future maturity stage and grants no tools
until a later plan adds them.

The profile controls rollout stage and cohort exposure. The tool registry and
domain authorization independently determine whether the current actor may use
a capability against a target.

### DEC-AUTO-006 - Demand-Driven Reads And Versioned Product Knowledge

Consolidate current Ask and Package Builder readers into one typed registry.
Add `read_archestimator_product_knowledge`, backed by a curated versioned static
ontology or documentation module. Reuse current product knowledge where safe,
including neutral facts that can be factored from
`src/lib/admin/estimate-system-knowledge-data.ts`.

The reader returns only the relevant section, knowledge version, and safe
display source. It remains separate from live workspace facts. Do not add
Vectorize, embeddings, or broad RAG in the first release.

### DEC-AUTO-007 - Server-Owned Canonical Plans

Release B persists the complete normalized executable plan server-side. The
smallest coherent design is:

- `ai_action_plans` for immutable versions and a bounded typed
  `canonical_plan_json`;
- `ai_action_plan_approvals` for approval/rejection and single-use consumption;
  and
- `ai_action_plan_receipts` for immutable terminal receipts.

Actions and safe source references remain inside the bounded canonical plan
JSON with stable IDs and versioned schemas. This avoids premature action/source
tables while satisfying reload, approval, freshness, privacy, and replay
requirements.

Raw prompts, transcripts, hidden reasoning, unrestricted records, provider
requests/responses, and secrets are not stored.

### DEC-AUTO-008 - One Additive Domain Command

Release C exposes only `project.estimate-package.create`. The command is
domain-owned, reusable outside Ask Flip, provider-free, and contains no AI
business-table SQL.

No existing-record mutation is representable in the Release C action schema.

### DEC-AUTO-009 - OpenAI Responses Adapter First

Implement one OpenAI Responses API adapter first:

- strict function schemas;
- local validation;
- `store: false`;
- configurable server-only base endpoint;
- bounded rounds, tool calls, output, deadlines, and provider retries;
- no provider-owned conversation or plan state;
- no automatic cross-provider fallback; and
- no silent model escalation.

Use direct `fetch` unless an SDK is proven to materially simplify the adapter
and is verified compatible with the current Cloudflare/OpenNext runtime.

OpenAI is the initial implementation provider, not a permanent domain
dependency. Exact model ID, limits, pricing, rate limits, regions, retention,
and Gateway behavior are volatile and must be reverified before implementation
and release.

### DEC-AUTO-010 - Optional Gateway Transport Only

Cloudflare AI Gateway may provide transport routing, metadata, logging,
rate/spend controls, and bounded provider-call retries when separately
authorized. It never owns identity, entitlement, tool policy, approval, plan
persistence, source freshness, domain execution, mutation retry, receipts, or
correctness.

### DEC-AUTO-011 - Structured Signals, Not Raw-Chat Learning

Current Package Builder memory is not model training. Existing structured
records remain preserved and default off. Any later workspace preference or
accepted/edited-decision signal requires a visible schema, retention, privacy,
authorization, and ranking contract. It cannot bypass source freshness,
entitlement, approval, or domain policy.

### DEC-AUTO-012 - Canonical Money And Budget Semantics

The server calculates quantities and money in integer minor units using the
current canonical estimate calculation module or its verified successor.
Budget is a ceiling, not an instruction to allocate remaining value. Historical
and template values are precedents, not automatically current prices. No
synthetic supplier price is accepted.

## Authority And Capability Policy

### Three Separate Controls

| Control | Purpose | Authority |
|---|---|---|
| Master kill switch | Emergency disable of all Ask Flip server/UI behavior | Existing server environment/configuration |
| Effective release profile | Maximum maturity stage and eligible cohort | Server-only profile setting plus current closed-beta/product entitlement and D1 feature gate |
| Tool registry and domain authorization | Intrinsic capability eligibility for this actor, workspace, plan, source, and target | Server policy plus canonical domain authorization |

Hiding a control in the browser is not a security boundary.

### Provider-Visible Capabilities

| Profile | Provider-visible capabilities | Business mutation |
|---|---|---:|
| `DISABLED` | none | No |
| `ASK_ONLY` | approved read tools only | No |
| `ASK_AND_DRAFT` | approved read tools plus one strict `propose_action_plan` schema | No |
| `PACKAGE_CREATE_APPLY` | same provider capabilities as Draft; execute remains server-only | Only server-owned package create after exact approval |
| `EXPANDED_ACTIONS` | no additional capability until a later plan registers it | No additional capability by default |

### Model-Prohibited Capabilities

No model-visible capability for:

- execute, approve, or consume approval;
- raw SQL or arbitrary server action;
- HTTP, browser, shell, filesystem, remote MCP, or code execution;
- permission, identity, entitlement, release profile, or target selection;
- publication, sharing, email, invite, account, billing, credentials,
  deployment, or administration; or
- receipt creation or mutation.

### Release C Capability Matrix

| Capability | Release C |
|---|---:|
| Create one new project | Allowed |
| Create one estimate and default tab | Allowed |
| Create new Group and Area nodes | Allowed |
| Insert verified library-backed rows | Allowed |
| Insert explicitly reviewed allowances | Allowed |
| Return project/estimate links and receipt | Required |
| Update/replace/delete existing row | Prohibited |
| Rename existing node | Prohibited |
| Insert/copy template into existing estimate | Prohibited |
| Create permanent library component | Prohibited |
| Change supplier/price option | Prohibited |
| Bulk/cross-project/cross-estimate work | Prohibited |
| Publish/share/send/invite/permission/admin/external action | Prohibited |

## Target Architecture

### Release A

```text
Workshop Ask Flip UI
  -> POST /api/ai/ask
  -> authenticate Better Auth user
  -> derive workspace and current beta/product entitlement
  -> master kill switch + effective release profile
  -> quota + deadline + metadata-only audit
  -> typed read registry
       -> product knowledge
       -> authorized workspace reads
       -> deterministic calculations
  -> OpenAI Responses adapter
       -> read tools only
       -> strict schemas + local validation
       -> store: false
  -> versioned Ask Flip event stream
  -> answer + app-linkable sources
```

No action plan or business-data mutation exists in this flow.

### Release B

```text
Release A flow
  -> provider may call propose_action_plan
  -> deterministic server compiler
       -> resolve handles and targets
       -> authorize eligibility
       -> calculate authoritative effects
       -> classify risk
       -> persist immutable canonical plan version
  -> safe complete plan projection
  -> Approve | Reject | Edit Plan | Take Over
```

Approval records state only. No domain executor is reachable.

### Release C

```text
Execute request: plan id/version + control intent + idempotency key
  -> no provider call
  -> reauthenticate and rederive workspace
  -> resolve release profile and entitlement
  -> load canonical plan from D1
  -> verify hashes, policy, registry, action set, status, expiry, approval
  -> reauthorize sources and targets
  -> revalidate freshness and money
  -> claim execution lease by compare-and-swap
  -> project.estimate-package.create
       -> one bounded atomic D1 command
       -> canonical history + activity outbox
       -> publication revision behavior
       -> mutation receipt + Ask Flip receipt
       -> authoritative readback
  -> canonical links and replay-safe receipt
```

The execute request never resends or controls `canonical_plan_json`.

## Implementation DAG

```text
UNIT-001  Contracts, policy, release profile, event types
   |
   v
UNIT-002  Consolidated read tools and product knowledge
   |
   v
UNIT-003  Ask-only provider loop and streaming route
   |
   v
UNIT-004  Ask-only user experience                  RELEASE A EXIT
   |
   v
UNIT-005  Durable draft, review, and approval state RELEASE B EXIT
   |
   v
UNIT-006  Package-create domain command and Apply  RELEASE C EXIT
   |
   v
UNIT-007  Evidence, model evaluation, release audit
```

- `UNIT-001` is `READY`.
- `UNIT-002` through `UNIT-007` are `PLANNED`.
- No high-risk domain mutation blocks Release A.
- No business mutation starts before Release B is complete.
- No expanded action work is part of this DAG.

## Unit Contracts

### UNIT-001 - Contracts, Policy, Release Profile, And Event Types

**Status:** `READY`

**Release:** foundation for A, B, and C

**Dependencies:** none

**Outcome**

Stable request, event, source, answer, proposal, plan, approval, receipt,
provider-adapter, capability-policy, and release-profile contracts with no
provider implementation, action-plan persistence, or business-data mutation.

**Owned paths**

- new `src/lib/ai/ask-flip/contracts.ts`
- new `src/lib/ai/ask-flip/events.ts`
- new `src/lib/ai/ask-flip/release-profile.ts`
- new `src/lib/ai/ask-flip/capability-policy.ts`
- new `src/lib/ai/ask-flip/provider-contract.ts`
- `src/lib/ai/feature-flags.ts`
- `src/lib/feature-gates/catalog.ts`
- `src/lib/feature-gates/enforce.ts`
- current Package Builder route/feature gate only to make legacy execution
  unreachable under the new profile
- one active migration only if the default-off D1 cohort flag row cannot be
  represented by current configuration; recheck the migration number first

**Required implementation**

1. Define the five release-profile values exactly.
2. Resolve the effective profile only on the server from master kill switch,
   server profile ceiling, current closed-beta/product entitlement, the global
   default-off D1 Ask Flip gate, and workspace context.
   The current `feature_flags` store is global, not workspace-scoped. Treat the
   current closed-beta allowlist as the initial user cohort. If finer
   user/workspace profile rollout is required, add the smallest explicit
   server-owned entitlement record and narrow migration in this unit rather
   than pretending the global flag is workspace entitlement.
3. Default invalid, missing, or unavailable profile inputs to `DISABLED`.
   Read the Ask-specific gate through a new strict fail-closed path that
   distinguishes `disabled` from `unavailable`; do not reuse the admin
   dashboard's stale last-known-good cache as authorization.
4. Define strict browser request types that contain messages, safe route hints,
   selected-record hints, and client request IDs but no user/workspace,
   permission, entitlement, risk, total, confirmation, or execute authority.
5. Define versioned app event types for lifecycle, status, source, answer delta,
   clarification, proposal, plan state, receipt, refusal, error, and exactly one
   terminal event.
6. Define safe source classes:
   `PRODUCT_KNOWLEDGE`, `CURRENT_LIBRARY`, `CURRENT_PROJECT`,
   `CURRENT_ESTIMATE`, `USER_INSTRUCTION`, `HISTORICAL_PRECEDENT`,
   `COMPARABLE_PRECEDENT`, `TEMPLATE_PRECEDENT`, `ASSUMPTION`, and
   `MODEL_SUGGESTION`.
7. Define provider-neutral read/propose event contracts with no executor.
8. Define server-owned capability and risk policy. Unknown tools, action kinds,
   fields, profiles, or policy versions reject.
9. Ensure the legacy Package Builder route cannot execute under any new Release
   A/B/C profile. It remains dormant source material until deletion.
10. Define versioned default-deny outbound-provider and metadata-audit field
    allowlists plus deterministic redaction. Raw messages, retrieved records,
    provider payloads, secrets, permission objects, and unrestricted IDs are
    never audit fields.
11. Do not create the action-plan migration in this unit.

**Acceptance evidence**

- source/LSP/static inspection of contract exhaustiveness;
- server-only profile and forbidden-field audit;
- legacy Apply reachability audit;
- active migration-number recheck if a cohort-gate row migration is required;
- no product test without explicit authorization.

**Recovery**

If current entitlement or feature-gate authority differs at implementation,
adapt the resolver to that current server authority without changing profile
values or browser/model boundaries. Do not add a second policy layer.

**Completion signal**

The contracts can support Release A and later Draft/Apply without importing a
provider, persisting an action plan, or mutating business data.

### UNIT-002 - Consolidated Read Tools And Product Knowledge

**Status:** `PLANNED`

**Release:** A

**Dependencies:** `UNIT-001`

**Outcome**

One demand-driven typed read registry that consolidates current Ask and Package
Builder reads, adds versioned Archestimator product knowledge, returns source
provenance/freshness, and performs no writes.

**Owned paths**

- `src/lib/ai/read-context.ts`
- `src/lib/ai/package-builder/read-tools.ts`
- new `src/lib/ai/ask-flip/read-tools.ts`
- new `src/lib/ai/ask-flip/product-knowledge.ts`
- new `src/lib/ai/ask-flip/provenance.ts`
- neutral product-knowledge data factored from current admin/system knowledge
  modules only where reuse is safe

**Required implementation**

1. Preserve only useful authorized read capabilities for workspace, projects,
   estimates, tabs, tree, rows, totals, activity, library, templates,
   historical rows, and comparable packages.
2. Add `read_archestimator_product_knowledge`.
3. Curate versioned sections for Project, Estimate, Estimate Tab, Group Node,
   Area Node, estimate rows, components, price options, linked/unlinked state,
   templates, precedents, assumptions, allowances, revisions, receipts,
   publication terminology, supported Ask Flip modes, and canonical money
   semantics.
4. Retrieve only the relevant product-knowledge section, return a knowledge
   version and safe display source, and keep it separate from live facts.
5. Resolve user, workspace, project, estimate, tab, node, row, source, and app
   links server-side.
6. Treat browser IDs as hints. Rejoin every live resource through the active
   workspace and current authorization.
7. Enforce selected columns, database limits, result limits, payload bytes,
   source freshness, and tool-specific deadlines.
8. Return compact provider projections with opaque source handles while
   retaining app IDs server-side for links and later plan compilation.
9. Record actual data-access counts/categories before compaction.
10. Do not preload the portfolio, add vector search, write memory, or expose
    mutations.

**Acceptance evidence**

- read inventory and query-bound inspection;
- product-knowledge version/source audit;
- provider payload and forbidden-ID audit;
- no-write/direct-SQL audit;
- `TEST_PROPOSAL` for cross-workspace and injection cases.

**Recovery**

If a current reader is too coupled to Package Builder, extract the smallest
neutral query seam. Do not retain two authoritative readers.

**Completion signal**

Every Release A answer can request only the minimum authorized product or
workspace evidence and return app-linkable provenance without a write path.

### UNIT-003 - Ask-Only Provider Loop And Streaming Route

**Status:** `PLANNED`

**Release:** A

**Dependencies:** `UNIT-002`

**Outcome**

One Ask Flip route, one application-owned read-only orchestration loop, one
initial OpenAI Responses adapter, typed event streaming, and no action-plan or
execute capability.

**Owned paths**

- `src/app/api/ai/ask/route.ts`
- `src/app/api/ai/ask/handler.ts`
- new `src/lib/ai/ask-flip/orchestrator.ts`
- new `src/lib/ai/ask-flip/providers/openai-responses.ts`
- new `src/lib/ai/ask-flip/event-stream.ts`
- `src/lib/ai/rate-limit.ts`
- `src/lib/ai/audit.ts`
- `src/lib/ai/audit-d1-store.ts`
- current DeepSeek Ask adapter after parity is established

**Required implementation**

1. Complete authentication, workspace, closed-beta/product entitlement, release
   profile, quota, provider configuration, deadline, payload, and metadata-only
   audit gates before streaming or provider spend.
2. Implement direct-fetch OpenAI Responses with strict tools, local schema
   validation, `store: false`, configurable base endpoint, and server-only
   credentials.
   Validate the base endpoint against a server-only exact-host allowlist for
   OpenAI or the explicitly configured Gateway; reject user/client-provided
   endpoints and unknown hosts.
3. Keep model-specific reasoning parameters inside the adapter.
4. Bound messages, bytes, provider output, rounds, tool calls, retries, elapsed
   time, and concurrent reads.
5. Expose read tools only. `propose_action_plan` and all execute capabilities are
   unavailable in `ASK_ONLY`.
6. Translate provider SSE into versioned Ask Flip events. Provider event names,
   response IDs, and hidden reasoning are not the browser contract.
7. Emit one terminal event. Represent failures after stream start with safe
   typed error events.
8. Cancel read/provider work on disconnect. Never retry or invoke a mutation.
9. Record provider/model, latency, token usage, tool counts, refusal/error
   class, and safe hashes without raw messages or retrieved content.
10. Remove the current Ask route's DeepSeek dependency only after behavioral
    parity for the supported Ask-only surface. Do not build other provider
    adapters or silent fallback.

**Acceptance evidence**

- route pre-stream gate audit;
- strict provider/tool contract inspection;
- `store: false` and no-provider-state audit;
- stream terminal-state/static audit;
- no plan/execute capability audit;
- `TEST_PROPOSAL` for timeout, quota, refusal, malformed tool, disconnect, and
  provider failure.

**Recovery**

Provider failure returns a typed non-mutating error. Do not silently switch
providers or models.

**Completion signal**

An authenticated request can stream a grounded answer from approved reads, and
no provider or route branch can produce or execute a business-data plan.

### UNIT-004 - Ask-Only User Experience

**Status:** `PLANNED`

**Release:** A exit

**Dependencies:** `UNIT-003`

**Outcome**

One visible authenticated Workshop Ask Flip experience with grounded answers,
source chips, current-screen context, clarification, cancellation, quota/error
recovery, accessibility, and no write preview or Apply control.

**Owned paths**

- `src/components/workshop/EstimateCopilotFloatingButton.tsx`
- `src/components/workshop/WorkshopShell.tsx`
- new focused components under `src/components/workshop/ask-flip/`
- focused client state/hooks under the same feature boundary

**Required implementation**

1. Remove client regex endpoint/privilege routing.
2. Send safe current-screen context to the single Ask route; the server decides
   profile and capabilities.
3. Render grounded answer, evidence type, source chip, freshness, uncertainty,
   and explicit no-mutation state.
4. Support lifecycle, cancellation, retry timing, quota exhaustion, provider
   error, refusal, and safe takeover/manual continuation.
5. Preserve in-memory conversation only. Do not create durable transcripts.
6. Use current authenticated icon/hit-area conventions where applicable.
7. Preserve every source, message, state, and control at smaller widths.
8. Provide keyboard operation, focus entry/return, buffered live announcements,
   non-color-only state, and reduced motion.
9. Do not render Approve, Apply, or any claim that data changed.
10. Keep the manual non-AI workflow fully usable.

**Acceptance evidence**

- component/state/source contract inspection;
- client regex and legacy-route reference audit;
- accessibility source audit;
- a Release A evidence packet and explicit Release A go/no-go record that do
  not depend on Release B/C implementation;
- no browser, screenshot, or visual QA without explicit authorization;
- `TEST_PROPOSAL` for stream/client-state integration.

**Recovery**

If streaming is unavailable in the current runtime, keep the versioned event
contract and use the narrowest verified transport that preserves cancellation
and terminal semantics. Do not broaden provider or mutation scope.

**Completion signal**

Release A can be independently reviewed: one grounded Ask-only experience works
by contract and no plan or business write is reachable.

### UNIT-005 - Durable Draft, Review, And Approval State

**Status:** `PLANNED`

**Release:** B exit

**Dependencies:** `UNIT-004`

**Outcome**

Typed proposals compile into complete server-owned immutable plans with
versioned preview, approval, rejection, editing, and takeover state while
business data remains untouched.

**Owned paths**

- new `src/lib/ai/ask-flip/proposal-schema.ts`
- new `src/lib/ai/ask-flip/plan-compiler.ts`
- new `src/lib/ai/ask-flip/action-plan-store.ts`
- new `src/lib/ai/ask-flip/approval-policy.ts`
- Release B route branches under `src/app/api/ai/ask/`
- Release B UI components under `src/components/workshop/ask-flip/`
- `src/lib/ai/audit-d1-store.ts`
- `src/lib/compliance/retention-core.ts`
- `src/lib/compliance/privacy-request-repository.ts`
- active migration `migrations/<rechecked-next>_ask_flip_action_plans.sql`

**Required implementation**

1. Recheck the active migration number; `0104` is observed, not reserved.
2. Add `ai_action_plans`, `ai_action_plan_approvals`, and
   `ai_action_plan_receipts` with bounded JSON and strict ownership.
3. Persist the complete normalized executable plan server-side. The browser
   receives only a safe projection.
4. Store no raw prompt, transcript, hidden reasoning, unrestricted retrieved
   record, provider payload, or secret.
5. Make plan versions immutable. Revision creates a new version and marks the
   prior version `superseded`.
6. Generate canonical plan and preview hashes server-side.
7. Bind schema, policy, registry, source revisions, target revisions, action
   set, stable action IDs, risk, expiry, actor, and workspace.
8. Compile provider proposals deterministically. Reject unknown handles,
   fabricated IDs, missing sources, prohibited actions, or non-authoritative
   totals.
9. Show exact target, every operation, record counts, source class/freshness,
   assumptions, unresolved questions, authoritative totals/budget effects,
   risk, expiry, and undo/no-undo state. Do not use "and more."
10. Support Approve, Reject, Edit Plan, and Take Over.
11. In `ASK_AND_DRAFT`, approval writes review state only and cannot reach a
    domain executor.
12. Make taken-over, stale, rejected, expired, superseded, and completed
    versions terminal.
13. Let an approval be consumed once. Any plan change invalidates approval.
14. Add a data-class lifecycle matrix for plan JSON, approvals, receipts, audit
    metadata, and browser-only conversation state. It must name the retention
    owner, duration/config source, deletion mechanism, export/erasure behavior,
    narrow legal/audit exceptions, and restore/backup limitations. Clear
    browser-only conversation state on logout, account/workspace change, and
    explicit clear.
15. Extend the current compliance registries before finalizing the migration.
    Define per-table export, content erasure, actor anonymization/tombstone,
    retention, legal-hold, and foreign-key behavior. Completed receipts remain
    immutable as operational evidence while removable user content and direct
    actor identifiers follow the documented privacy rule.
16. Expose prepared-statement builders for approval consumption, plan
    completion, receipt insertion, and terminal metadata audit so `UNIT-006`
    can compose them into one D1 batch without eager `.run()` calls.

**Acceptance evidence**

- migration/schema and bounded-JSON inspection;
- server reload and no-plan-body request contract audit;
- plan version/hash/state-machine audit;
- no-business-table-mutation audit;
- retention/export/erasure integration inspection;
- a Release B evidence packet and explicit Release B go/no-go record that do
  not depend on Release C implementation;
- `TEST_PROPOSAL` for stale, expiry, edit, approval, rejection, and takeover.

**Recovery**

If the bounded canonical JSON exceeds limits, reduce the allowed plan size or
split it into separately reviewable plans. Do not store unrestricted records or
normalize prematurely into a generic workflow engine.

**Completion signal**

Release B can reload, revise, approve, reject, and display the full canonical
plan while every business table remains unchanged.

### UNIT-006 - Canonical Package-Create Domain Command And Confirmed Apply

**Status:** `PLANNED`

**Release:** C exit

**Dependencies:** `UNIT-005`

**Outcome**

One domain-owned `project.estimate-package.create` command and one confirmed
additive Apply capability with no AI-owned business-table SQL.

**Owned paths**

- new `src/lib/projects/project-estimate-package-command.ts`
- new `src/lib/ai/ask-flip/package-create-executor.ts`
- `src/lib/projects/actions.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/d1-intents/estimate-records.ts`
- `src/lib/estimates/d1-intents/tabs.ts`
- `src/lib/estimates/d1-intents/nodes.ts`
- `src/lib/estimates/d1-intents/rows.ts`
- `src/lib/estimates/d1-intents/history-events.ts`
- `src/lib/estimates/d1-intents/intent-context.ts`
- `src/lib/estimates/mutation-receipts.ts`
- `src/lib/estimates/estimate-row-total.ts`
- `src/lib/activity/activity-outbox.ts`
- `src/lib/ai/ask-flip/action-plan-store.ts`
- `src/lib/ai/audit-d1-store.ts`
- current publication revision helpers
- Release C execute branch and UI control
- current `src/lib/ai/package-builder/apply.ts` and route after canonical parity

**Required command invariants**

- Better Auth actor and current workspace;
- current closed-beta/product entitlement and `PACKAGE_CREATE_APPLY` profile;
- workspace editor authorization;
- one new project;
- one estimate and default tab;
- deterministic server-generated IDs;
- Group and Area hierarchy only;
- Area-only row placement;
- current component ownership, version, and price-option freshness;
- reviewed allowance classification;
- source snapshots;
- canonical integer minor-unit money;
- budget as ceiling, not allocation instruction;
- project and estimate history;
- activity outbox;
- required publication source revision behavior;
- mutation fingerprint and canonical receipt;
- statement-count and result-size limits;
- Ask Flip approval, action, plan, and terminal receipt;
- authoritative committed readback.

**Command composition**

- `prepareProjectEstimatePackageCreate(context, input)` lives in the domain
  module, performs current validation, generates deterministic IDs, and returns
  the complete ordered business/source/history/activity/publication/mutation-
  receipt statement set plus an authoritative readback descriptor. It never
  executes statements and contains no provider or Ask Flip logic.
- Refactor current project and estimate creation primitives into
  prepared-statement builders where required. Preserve current activation,
  resource-integrity, onboarding, and publication side effects when they are
  canonical for normal project creation; explicitly document any side effect
  proven inapplicable.
- `package-create-executor.ts` composes the domain statement set with the
  prepared approval-consumption, plan-completion, Ask Flip receipt, and
  terminal-audit statements from `UNIT-005`.
- The executor requires a real D1 `database.batch`; the sequential fallback is
  prohibited for this command.
- Exact statement count and serialized receipt size are checked before the
  batch. No eager domain or audit `.run()` may occur before it.

**Execute flow**

1. Make no provider call.
2. Reauthenticate.
3. Rederive the active workspace.
4. Resolve current release profile and entitlement.
5. Reload the canonical plan from D1.
6. Verify plan ID, version, plan hash, preview hash, schema, policy, registry,
   expiry, risk, status, and exact action set.
7. Verify the approving actor and unconsumed approval.
8. Reauthorize every source and target.
9. Revalidate source freshness and canonical money.
10. Claim an expiring execution lease with compare-and-swap.
11. Execute one bounded `project.estimate-package.create` command.
12. Commit business rows, history, activity outbox, publication revision,
    mutation receipt, Ask Flip receipt, approval consumption, plan completion,
    and terminal audit consistently in one atomic boundary.
13. Read back committed IDs and totals.
14. Return canonical project and estimate links and receipt.
15. Return the same receipt on idempotent replay.
16. Never ask the client to generate a new idempotency key after an uncertain
    result.

**Hard schema boundary**

Reject any plan containing update, replace, delete, rename, template insertion,
library creation, supplier/price-option mutation, bulk/cross-scope work, or
external/administrative action. Do not execute the allowed subset of a mixed
plan.

**Atomicity boundary**

If the complete command cannot fit the current D1 atomic and statement limits:

- do not chunk it;
- do not partially apply it;
- return separately reviewable proposed phases;
- require new explicit confirmation; and
- leave the original plan unexecuted.

**Legacy disposition**

After canonical package-create parity:

- delete AI-owned business-table SQL;
- stop runtime reads/writes to `ai_package_apply_commands`;
- preserve historical rows until retention owns physical deletion;
- remove the Package Builder route/provider/draft/apply fork and client regex
  routing;
- preserve only neutral readers or schemas already absorbed into Ask Flip.

**Acceptance evidence**

- direct-SQL audit under `src/lib/ai`;
- canonical auth/receipt/history/outbox/publication/money/statement-limit call
  audit;
- exact Release C schema audit;
- committed readback/receipt contract inspection;
- prepare/commit boundary and no-eager-write audit;
- a Release C evidence packet and explicit Release C go/no-go record;
- `TEST_PROPOSAL` for D1 atomicity, replay, concurrency, freshness, permission,
  lost response, final batch failure, and Rivera 2BR.

**Recovery**

An expired lease with no receipt may be reclaimed with the same plan, action
IDs, and idempotency key. A committed receipt always wins. A stale source,
target, permission, profile, or plan requires a new immutable version and
confirmation.

**Completion signal**

Release C can create only the reviewed Rivera-style package exactly once, with
one authoritative receipt and no broad mutation path.

### UNIT-007 - Evidence, Model Evaluation, And Release Audit

**Status:** `PLANNED`

**Release:** evidence for A, B, and C

**Dependencies:** `UNIT-006`

**Outcome**

Honest application-security evidence, separate model-quality evidence, and a
release decision that does not overclaim tests, provider configuration, or
production state.

`UNIT-004`, `UNIT-005`, and `UNIT-006` each own their release-scoped evidence
packet and go/no-go record. `UNIT-007` independently reconciles those three
packets, adds the separate model evaluation when authorized, and records the
cross-release audit. It is not the first point at which Releases A or B become
reviewable.

**Owned paths**

- focused synthetic fixtures and test/eval harnesses only when authorized
- provider/operations documentation
- this pack's evidence and status fields

**Application-security and domain invariants**

These must hold regardless of model:

- no unauthorized mutation reaches execution;
- no cross-workspace source or target is accepted;
- no browser/model authority field is trusted;
- no provider-visible execute capability exists;
- no stale plan executes;
- no invalid source handle is accepted;
- no plan executes without exact approval;
- no canonical money divergence occurs;
- no partial mutation occurs;
- no commit lacks required history, outbox, receipts, and terminal audit;
- replay creates no duplicate effect; and
- execute makes no provider call.

**Model-behavior metrics**

- correct read-tool selection;
- relevant retrieval requests;
- citation precision;
- correct clarification behavior;
- plan operation precision and recall;
- complete assumptions and unresolved questions;
- attempted prohibited-action rate;
- attempted fabricated-handle rate;
- unsupported certainty rate;
- unnecessary tool-call rate;
- user edit distance to an acceptable plan;
- latency;
- token use;
- cost per successful task; and
- provider reliability.

A model that frequently attempts unsafe actions scores poorly even when
Archestimator blocks every attempt. Application security never depends on model
behavior.

**Required implementation**

1. Run authorized source, diff, static, type/LSP, lint, schema, and dependency
   checks proportionate to each release.
2. Keep all automated product tests as `TEST_PROPOSAL` until explicitly
   authorized.
3. If tests are authorized, prove application/domain invariants with
   deterministic fixtures before billed model evaluation.
4. If provider calls are authorized, evaluate identical sanitized fixtures and
   schemas using non-mutating fake executors.
5. Implement only the OpenAI adapter first. Treat other providers as evaluation
   challengers, not prebuilt fallbacks.
6. Before implementation and release, reverify exact model/tool support,
   limits, pricing, regions, rate limits, retention, provider storage,
   Gateway logging/cache/routing, and spend controls.
7. Record exact model ID and adapter settings only in the dated evaluation or
   release record, not domain contracts.
8. Keep AI disabled if application invariants fail, model thresholds fail, or
   provider/Gateway controls are unverified.
9. Reconcile every requirement against current evidence.

**Acceptance evidence**

- requirement-by-requirement application audit;
- authorized deterministic test evidence when available;
- authorized sanitized model-eval evidence when available;
- live provider/Gateway readback only when authorized;
- no release or deployment claim without matching evidence.

**Recovery**

A failed model candidate changes the model/evaluation decision, not application
security. A failed domain invariant returns to the owning implementation unit.

**Completion signal**

Every release claim is supported by the correct evidence class and no model or
provider result substitutes for application correctness.

## Later-Release Backlog

The following are intentionally outside the first three releases and require
separate plans:

- existing-row quantity/rate update;
- row replacement;
- row deletion or restore;
- node rename or reorganization;
- template insertion/copy into an existing estimate;
- permanent component-library creation;
- supplier or price-option mutation;
- bulk changes;
- cross-project/cross-estimate actions;
- publication, sharing, email, invites, permissions, client portal;
- account, privacy erasure, billing, uploads, credentials, deployment,
  administration; and
- explicit structured workspace preferences or accepted-decision ranking.

Do not prebuild dormant executors for this backlog.

## Material Assumptions

| ID | Assumption | Mandatory revalidation |
|---|---|---|
| `ASSUMP-001` | Current Ask, Package Builder, feature-gate, auth, audit, estimate-domain, and Workshop source paths remain stable until the affected unit begins. | Re-run current-source discovery before `UNIT-001` and every later unit. |
| `ASSUMP-002` | `0104` is only the next observed active migration number, not a reservation. | Recheck the active migration tail immediately before `UNIT-005`. |
| `ASSUMP-003` | The authoritative Ask Flip release profile can be derived from current server-side product entitlement, closed-beta/cohort state, controlled configuration, or their bounded composition. | Identify and document the current authority in `UNIT-001`; do not invent browser authority or a billing subsystem. |
| `ASSUMP-004` | One canonical project/estimate package can fit the current D1 atomic statement, record-count, and receipt-size boundary. | Measure the compiled command in `UNIT-006`; reject and require a smaller newly reviewed plan when it does not fit. |
| `ASSUMP-005` | Typed provider streaming can traverse the current Next.js 16, OpenNext, and Cloudflare runtime without violating cancellation or single-terminal-event behavior. | Prove the current runtime behavior before Release A exit. |
| `ASSUMP-006` | OpenAI and optional AI Gateway retention, logging, caching, routing, rate, region, and billing controls remain suitable. | Perform live account/control readback before billed evaluation and again before any release. |
| `ASSUMP-007` | Curated versioned product documentation or a static ontology is sufficient for initial product knowledge without Vectorize, embeddings, or broad RAG. | Evaluate grounded-answer coverage in Release A before proposing broader retrieval. |
| `ASSUMP-008` | Bounded canonical plan JSON plus normalized approval and receipt rows can retain the full executable plan without storing raw prompts or transcripts. | Verify schema, size ceilings, reload, privacy export, erasure, and retention in `UNIT-005`. |
| `ASSUMP-009` | No product tests, browser evidence, or billed model calls are authorized for this plan-only revision. | Cross `AUTH-001` or `AUTH-002` only after explicit authorization for the exact evidence scope. |
| `ASSUMP-010` | No deployment, production configuration, cohort enablement, or live release is authorized. | Cross `AUTH-003` only with explicit production authority and release evidence. |
| `ASSUMP-011` | Current project, estimate, tree, row, history, outbox, publication-revision, money, and receipt primitives remain canonical. | Reinspect current source and reuse any landed primitive before `UNIT-006`. |
| `ASSUMP-012` | Overlapping AI, integrity, money, runtime, or action-plan work may land before implementation. | Re-run overlap and blast-radius analysis at each unit boundary; reuse landed contracts and avoid duplicate abstractions. |

## Risks

| ID | Risk | Mitigation |
|---|---|---|
| RISK-001 | The current Package Builder exposes broad default-on subfeatures when the master AI route is enabled. | `UNIT-001` adds a default-off server profile and makes legacy execution unreachable; `UNIT-004` removes client privilege routing. |
| RISK-002 | Ask-only work is blocked behind high-risk mutation architecture. | Sequential DAG completes Releases A and B before `UNIT-006`. |
| RISK-003 | The browser or provider becomes the only holder of the executable plan. | `UNIT-005` persists bounded canonical plan JSON server-side and execute never accepts the plan body. |
| RISK-004 | Provider/model fields leak into durable domain contracts. | Provider-neutral adapter and dated evaluation record; model-specific settings remain inside the adapter. |
| RISK-005 | Existing Apply partially commits or wedges replay state. | One domain-owned atomic package command, lease, canonical receipt, stable action IDs, and same-key replay. |
| RISK-006 | Current AI float math or model totals diverge from estimate truth. | Canonical integer minor-unit calculation for preview, policy, commit, and receipt. |
| RISK-007 | Broad portfolio context or raw chats overexpose user data. | Demand-driven reads, compact projections, opaque handles, no raw transcript storage, release-time retention/logging readback. |
| RISK-008 | Release profile is mistaken for permission. | Explicit three-control model: kill switch, profile/cohort entitlement, registry/domain authorization. |
| RISK-009 | Product knowledge becomes a premature RAG platform. | Curated versioned sections and exact reader only; no vector search in Releases A-C. |
| RISK-010 | Model evaluation passes because the application blocks unsafe behavior, hiding a poor model. | Track attempted unsafe actions separately from application-security pass/fail. |
| RISK-011 | Current source, migration number, entitlement, or provider facts drift before execution. | Manifest stale triggers and mandatory pre-unit refresh. |
| RISK-012 | Overlapping integrity/money/runtime plans create duplicate abstractions. | Verify current source, reuse landed primitives, and keep Ask Flip ownership limited to its adapter and package command. |

## Acceptance Criteria

### AC-001 - Hosted Model Without Training

`REQ-001` passes when source contracts and product knowledge show an existing
hosted foundation model with no training, fine-tuning, continual learning, raw
chat learning, or provider-owned canonical memory.

Test decision: `NOT_REQUIRED`; source and contract inspection are decisive.

### AC-002 - Release A Grounded Ask

`UX-001` passes when one route/UI supports product and workspace questions,
demand-driven authorized reads, app-linkable sources, clarification,
cancellation, typed terminal events, quota/deadline/audit controls, and no plan
or business mutation.

Test decision: `TEST_PROPOSAL`.

### AC-003 - Release B Review Without Mutation

`UX-002` passes when a provider proposal compiles into a complete server-owned
immutable plan, every operation/effect/source is visible, Approve/Reject/Edit
Plan/Take Over work by contract, and no business table changes.

Test decision: `TEST_PROPOSAL`.

### AC-004 - Rivera Package-Create Apply

`UX-003` passes when the synthetic Rivera fixture creates exactly one project,
one estimate/default tab, expected Group/Area nodes, verified library rows,
reviewed allowances, canonical totals/links, and one replay-safe receipt.

Test decision: `TEST_PROPOSAL`.

### AC-005 - No Browser Or Model Authority

`SEC-001` passes when identity, profile, entitlement, targets, sources, risk,
approval, execution, and receipts are server-derived and no provider-visible
execute capability exists.

Test decision: `TEST_PROPOSAL`.

### AC-006 - Server-Owned Canonical Plan

`SEC-002` passes when the complete canonical plan is reloadable from D1,
immutable by version, bound to hashes/policy/registry/freshness/expiry/actor,
and execute accepts no authoritative plan body.

Test decision: `TEST_PROPOSAL`.

### AC-007 - Canonical Atomic Domain Integrity

`DATA-001` passes when package-create commits business rows, history, activity
outbox, publication revision behavior, canonical money, mutation receipt, Ask
Flip terminal receipt, and readback in one bounded atomic command with
idempotent replay.

Test decision: `TEST_PROPOSAL`.

### AC-008 - Release Profile Separated From Authorization

`OPS-001` passes when the master kill switch, effective profile/cohort
entitlement, and tool/domain authorization are distinct server controls and
the browser/model cannot choose them.

Test decision: `TEST_PROPOSAL`.

### AC-009 - One Provider Adapter, No Silent Fallback

`OPS-002` passes when one OpenAI Responses adapter uses strict schemas, local
validation, `store: false`, bounded operation, and configurable transport while
domain contracts remain provider-neutral and no fallback/escalation is silent.

Test decision: `TEST_PROPOSAL`.

### AC-010 - Separate Security And Model Evaluation

`REQ-002` passes when deterministic application/domain invariants have their
own evidence and model behavior is scored separately for retrieval, citation,
clarification, planning, unsafe attempts, latency, token use, cost, and
reliability.

Test decision: `TEST_PROPOSAL`.

All implementation criteria remain failing until current implementation
evidence exists.

## Authorization Boundaries

### AUTH-001 - Automated Product Tests And Browser Evidence

Requires explicit current-task authorization before:

- creating or modifying automated product tests;
- running Bun/Vitest/Playwright suites;
- running builds as test gates;
- browser automation, screenshots, Storybook, or visual QA.

The exact future test proposal is in
`04-EXPERIENCE-SCENARIOS-AND-VERIFICATION.md`.

### AUTH-002 - Billed Provider Evaluation And Configuration

Requires explicit authority before:

- provider account creation or funding;
- billed model calls;
- provider secrets;
- live account retention/ZDR readback;
- AI Gateway enablement, logging, caching, routing, or billing;
- production spend limits; or
- sending live user data to a provider not already approved.

### AUTH-003 - Deployment And Production Enablement

Requires explicit authority before:

- deployment;
- production environment changes;
- production feature/cohort enablement; or
- a hosted/release-ready claim.

## Verification Sequence

1. Rerun repository bootstrap and scoped worktree status.
2. Refresh current source and every applicable stale trigger.
3. Run GitNexus impact before editing any source symbol; warn on `HIGH` or
   `CRITICAL`.
4. Execute units in DAG order. Do not start a dependent unit while it is
   `PLANNED`.
5. Use source/LSP/static checks during each unit.
6. Keep product tests as proposals until `AUTH-001` is explicitly resolved.
7. Keep provider/Gateway calls and readback behind `AUTH-002`.
8. Keep deployment/enablement behind `AUTH-003`.
9. At Release A, verify no plan/execute capability.
10. At Release B, verify server-owned plans and no business mutation.
11. At Release C, verify the exact additive schema and canonical package
    command.
12. Run GitNexus `detect_changes` and reconcile it with the actual diff before
    source completion.
13. Audit every requirement against current evidence.

## Resume State

- **Package status:** `CONDITIONALLY_READY`
- **Implementation:** `NOT_STARTED`
- **Release:** `BOUNDARY`
- **Exact next unit:** `UNIT-001`
- **Only ready unit:** `UNIT-001`
- **Dependent units:** `PLANNED`
- **Current source revision:** `a3ebd221632d5c69cb58055e2ce49ba1501f641b`
- **Current branch:** `main`
- **Next active migration number observed:** `0104`, not reserved
- **GitNexus:** indexed at current HEAD on 2026-07-24
- **Current product implementation:** split Ask and Package Builder, both
  default off under the master AI gate
- **Current entitlement gap:** no Ask-specific server entitlement/profile check
  is wired in the current handlers
- **Current test decision:** `TEST_PROPOSAL`
- **Current provider/deploy authority:** not granted
- **No product code, migration, test, provider configuration, deployment, or
  production state changed by this planning task**
