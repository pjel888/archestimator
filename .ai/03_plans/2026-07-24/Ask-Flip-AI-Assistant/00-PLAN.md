# Ask Flip AI Assistant Implementation Plan

## Task Contract

### Target Result

Ship one authenticated Ask Flip experience that understands natural-language
requests, reads the user's scoped Archestimator data, proposes exact project and
estimate changes, waits for explicit approval, executes those changes through
the same canonical domain rules as the normal UI, and shows a trustworthy
receipt.

The implementation must replace, not layer over, the current split:

- read-only `/api/ai/ask`;
- draft/apply `/api/ai/package-builder`;
- DeepSeek-specific provider code;
- duplicated read-context code; and
- hand-written AI D1 mutations in `src/lib/ai/package-builder/apply.ts`.

### User Success

A workspace editor can ask:

> Create a new two-bedroom fit-out project called Rivera 2BR in BGC. Create a
> baseline estimate under PHP 2,000,000. Use current library items where
> possible and show me every assumption before applying.

Ask Flip must retrieve authorized evidence, ask only material clarifying
questions, produce an editable plan with exact effects and sources, apply
nothing until the user confirms the current plan, execute once, and return links
to the created project and estimate plus a durable receipt.

### Stop Condition

The local implementation is complete when:

- one route and one UI surface own Ask Flip;
- current read behavior is preserved through a typed read-tool registry;
- the two-bedroom project/estimate scenario executes through canonical domain
  commands with no direct AI-owned SQL;
- every write is plan-bound, confirmed, re-authorized, revision-checked,
  idempotent, audited, and source-grounded;
- the old package-builder route, provider, schemas, and mutation fork are
  removed after replacement;
- static, type, lint, schema, and diff evidence is collected;
- proposed automated security/domain/model tests are either explicitly
  authorized and run or remain an accurately reported release boundary; and
- external provider/deployment work is either explicitly authorized and
  verified or remains outside the local completion claim.

## Scope

### In Scope

- One conversational Ask Flip route and UI.
- Provider-neutral application orchestration with one initially implemented
  provider adapter.
- Bounded multi-turn context held in the active browser session.
- Workspace-scoped read tools with source provenance and freshness metadata.
- Typed action plans and deterministic action policy.
- Explicit confirmation for every project, estimate, component, template,
  node, and row mutation in the first release.
- D1 persistence for plan metadata, approval, tool-call receipts, and execution
  state without raw prompt or transcript storage.
- Canonical project/estimate package creation.
- Safe current-estimate and component-library mutations listed in the launch
  capability matrix.
- Streaming answer/progress events through Web Streams.
- Quotas, timeouts, loop limits, spend metadata, provider errors, and audit.
- Current-model evaluation plan and release thresholds.
- Deletion of superseded AI code after migration.

### Non-Goals

- An unrestricted autonomous agent.
- Provider-hosted computer use, remote MCP, hosted shell, code execution,
  programmatic tool calling, or provider multi-agent execution.
- Raw SQL, arbitrary server-action invocation, or generic reflection over app
  code.
- Vector search or RAG infrastructure for the first release.
- Durable raw chat transcripts or provider-owned canonical memory.
- Upload/PDF/drawing ingestion in the first executable slice.
- Account deletion, admin/support operations, collaborator permissions,
  publication rotation/revocation/email, client-portal decisions, uploads,
  scans, billing, credentials, or production deployment.
- Permanent deletion or silent bulk mutation.
- Compatibility layers or parallel legacy/new AI paths after the replacement is
  proven.

## Requirements

| ID | Requirement | Completion evidence |
|---|---|---|
| UX-001 | One Ask Flip conversation surface answers grounded questions, shows sources, and supports clarify, preview, approve, reject, edit plan, take over, completion, and failure states. | Source/diff/static evidence plus proposed interaction tests |
| UX-002 | The Rivera 2BR scenario creates a project and baseline estimate under a PHP 2,000,000 constraint using only current library data or explicit reviewed precedents. | Deterministic scenario receipt and proposed D1 route test |
| SEC-001 | The model has no direct D1, raw server-action, identity, permission, secret, or unrestricted tool authority. | Tool registry and policy audit |
| SEC-002 | Every write requires exact plan-bound approval, server-side re-authorization, target revision checks, expiry, idempotency, and fail-closed audit. | Schema/source audit and proposed denial tests |
| SEC-003 | External text is untrusted data, prompt injection cannot expand tool scope, and raw prompts/transcripts/retrieved records are not persisted by default. | Payload/redaction audit and proposed adversarial eval |
| DATA-001 | All AI writes use canonical domain commands and preserve D1 receipts, history/outbox, publication revisions, statement limits, source snapshots, and canonical money calculations. | Direct-SQL/fork audit and proposed integrity tests |
| OPS-001 | A provider-neutral bounded tool loop streams typed events, enforces quota/deadline/round/tool limits, and records provider/model/usage/error metadata. | Route/provider/static evidence and proposed failure tests |
| OPS-002 | Model choice is corpus-driven, current at implementation, and gated by quality, safety, latency, cost, and provider-data controls rather than vendor claims. | Versioned evaluation report and provider-readback boundary |

## Decisions

### DEC-AUTO-001 - Use a Proposal-and-Execution System

Ask Flip is not an autonomous mutation agent. Its control loop is:

`understand -> retrieve -> calculate -> propose -> preview -> confirm -> execute -> receipt`

Read calls may run automatically after authorization. The first release never
auto-executes a business-data write.

### DEC-AUTO-002 - Keep Policy and Execution in Archestimator

The application owns:

- authentication and workspace identity;
- tool availability;
- target resolution;
- runtime validation;
- source freshness;
- calculations;
- risk classification;
- confirmation policy;
- D1 execution;
- idempotency;
- audit; and
- user-visible receipts.

The model supplies natural-language understanding, tool selection, structured
arguments, synthesis, and clarification. Its statements are never authorization
or proof of execution.

### DEC-AUTO-003 - Replace the Split AI Surface

Keep `/api/ai/ask` as the single internal route and replace its request contract
with a discriminated union:

- `mode: "message"` returns a typed event stream;
- `mode: "execute"` deterministically applies an approved stored plan without a
  provider call;
- `mode: "reject"` records rejection and invalidates the plan; and
- `mode: "feedback"` records bounded structured feedback.

Delete `/api/ai/package-builder` after the new route and UI own all preserved
behavior. Do not retain an alias or dual-write path in this pre-beta product.

### DEC-AUTO-004 - Use a Server-Owned Tool Registry

Each tool definition contains:

- stable name and version;
- strict input and output schemas;
- `R0_READ`, `R1_DRAFT`, `R2_CONFIRMED_WRITE`,
  `R3_HIGH_IMPACT_WRITE`, or prohibited classification;
- required app permission;
- server-side target resolver;
- deterministic preconditions;
- source and freshness policy;
- confirmation policy;
- executor;
- audit and user-summary builders; and
- safe inverse or explicit no-undo declaration.

Read tools and mutation tools live in separate registries. The provider sees
only the tools permitted for the authenticated request and current loop phase.

### DEC-AUTO-005 - Persist Plans and Receipts, Not Conversations

Preserve the prior privacy decision:

- active conversation messages remain bounded, client-held session state;
- requests send only the recent validated window needed for the current turn;
- `ai_action_runs` stores hashes and metadata, not message text;
- D1 stores normalized plan metadata, plan/action hashes, approval, policy
  decisions, target revisions, and execution receipts;
- provider requests use non-persistent settings where available; and
- no provider response ID becomes canonical application state.

A future durable conversation feature requires its own retention/redaction
decision and is not implied by this pack.

### DEC-AUTO-006 - Build One Canonical Aggregate Domain Command

The two-bedroom scenario needs an atomic multi-table mutation. Add a non-AI
domain command for `project.estimate-package.create` that composes existing
authorization, project, estimate/default-tab, node, row, history/outbox,
mutation-receipt, publication-revision, statement-limit, source-snapshot, and
money primitives.

The Ask Flip executor delegates to that command. No AI module owns SQL for
projects, estimates, tabs, nodes, rows, components, history, outbox, or
publication revisions.

### DEC-AUTO-007 - Generalize Existing AI Audit State

Add the next available migration, currently
`migrations/0104_ask_flip_action_plans.sql`, to:

- add `ai_action_plans`;
- link `ai_tool_calls` to plan/action/policy/domain receipt metadata;
- preserve existing `ai_action_runs` and `ai_data_access_events`;
- copy relevant historical `ai_package_apply_commands` metadata into the new
  general plan/receipt shape when safely representable; and
- stop all new writes to `ai_package_apply_commands`.

Do not drop legacy rows in this unit. Retention owns later physical removal.

### DEC-AUTO-008 - Provisional Model Route, Corpus-Locked Release

As of 2026-07-24:

- provisional default: `gpt-5.6-terra`, starting at `reasoning.effort: low` for
  ordinary turns and `medium` for planning turns;
- quality escalation candidate: `gpt-5.6-sol`;
- cost-sensitive candidate: `gpt-5.6-luna`;
- cross-provider challenger: `claude-sonnet-5`; and
- multimodal challenger: `gemini-3.6-flash`.

Implement one OpenAI Responses adapter first, using strict function schemas and
`store: false`. Keep the app provider interface narrow. Do not implement unused
fallback adapters before the bakeoff proves a need.

No model is production-locked until it passes the sanitized Archestimator
corpus. Model names, pricing, limits, and retention controls must be reverified
immediately before implementation and production enablement.

### DEC-AUTO-009 - AI Gateway Is Optional Transport

Cloudflare AI Gateway may supply routing, logs, analytics, rate/spend controls,
and an OpenAI-compatible Responses endpoint. It does not own tool policy,
authorization, approvals, retries, or mutation correctness.

The local adapter accepts a configured provider base URL so direct provider and
AI Gateway transport do not require two orchestration implementations. Enabling
Gateway billing/logging or deploying secrets is an external authorization
boundary.

### DEC-AUTO-010 - No Synthetic Prices

Price-bearing plan entries must be one of:

- current, authorized component or price-option data with freshness evidence;
- explicit user-provided values;
- a historical/comparable/template precedent clearly labeled for review; or
- an unresolved allowance that blocks application until the user supplies or
  approves a value.

Budget allocation, totals, contingency, VAT, markup, and deltas use canonical
money/estimate calculations. The model never computes authoritative totals.

## Action Policy

| Class | Examples | Model may propose | Server may execute | First-release confirmation |
|---|---|---:|---:|---|
| `R0_READ` | list projects, read estimate tree, search library, read history | Yes | Yes after auth | None |
| `R1_DRAFT` | calculate alternatives, assemble plan, compare sources | Yes | No business mutation | None |
| `R2_CONFIRMED_WRITE` | one row update/replace, node rename, small area/row addition | Yes | Yes through allowlisted domain command | Full diff and explicit confirm |
| `R3_HIGH_IMPACT_WRITE` | project/estimate package, template insert, component creation, >10 operations or >10% financial impact | Yes | Yes through allowlisted domain command | Complete list and action-labelled confirm |
| `R4_PROHIBITED` | delete/archive, publish/share/send, permissions, account/admin/security, raw SQL, credentials, billing, deploy | No | No | Not applicable |

The server rejects any tool whose registered class, permission, request phase,
or target differs from the approved plan.

## Launch Capability Matrix

### Reads

Preserve and consolidate:

- current workspace context;
- accessible projects;
- project and estimate summaries;
- estimate tabs, tree, area rows, totals, and activity;
- historical estimate rows;
- comparable estimate packages;
- component library matches;
- reusable estimate templates; and
- current structured memory preferences only if the existing opt-in remains
  enabled and no raw prompt content is stored.

### Confirmed Writes

Launch after the canonical command work is complete:

- create project;
- create estimate with default tab;
- create group and area nodes;
- insert linked component rows;
- insert reviewed allowance rows;
- insert or copy reusable templates;
- update or replace an existing row with expected revision;
- rename an estimate node;
- create a library component under the existing manager permission; and
- create one project/estimate package atomically.

### Deferred Elevated Writes

- row/node/archive delete and restore;
- bulk rate or quantity changes;
- shared-template propagation;
- project status or client-visible workflow changes; and
- publication/share side effects.

These require a separate data-preserving preview, conflict-safe inverse, and
policy addition. They must not be implemented as generic tool access.

### Hard Prohibitions

- account deletion;
- admin/support action mutation;
- collaborator invites, role changes, or removals;
- permanent delete or upload purge;
- publication rotate, revoke, recipient email, or external send;
- client-portal decisions;
- upload/scan execution;
- raw SQL or arbitrary route/server-action invocation;
- local admin bypass;
- credential, provider, billing, Cloudflare, GitHub, or production changes; and
- model-controlled workspace, user, project, estimate, node, or row identity.

## Target Architecture

```text
Workshop Ask Flip UI
  |
  | message window + trusted route hints
  v
POST /api/ai/ask
  |
  +-- authenticate -> workspace -> quota -> audit-start -> deadline
  |
  +-- AskFlipOrchestrator
        |
        +-- ReadToolRegistry -> bounded D1 readers -> provenance
        |
        +-- ModelAdapter -> provider/AIG transport
        |     model can read or propose, never execute
        |
        +-- ActionPolicy -> normalize -> classify -> authorize eligibility
        |
        +-- ActionPlanStore -> version/hash/token/expiry/revisions
        |
        +-- event stream -> answer/source/plan/error events

mode: execute
  |
  +-- authenticate again
  +-- load stored plan
  +-- verify user/workspace/hash/token/expiry/status
  +-- re-authorize every target
  +-- compare precondition revisions/freshness
  +-- DomainCommandRegistry
        |
        +-- project.estimate-package.create
        +-- canonical estimate row/node/template intents
        +-- canonical component-library mutation
  +-- D1 receipt + audit completion
  +-- exact user-visible completion receipt
```

## Implementation DAG

```text
UNIT-001  Contracts, policy, and D1 plan state
   | \
   |  +--> UNIT-003  Consolidated read tools and provenance
   v             |
UNIT-002  Canonical mutation command and fork removal
   |             |
   +------\  /---+
           v
UNIT-004  Provider loop, streaming route, quotas, audit
           |
           v
UNIT-005  Conversation, plan preview, approval, receipts UI
           |
           v
UNIT-006  Safe action expansion and legacy AI deletion
           |
           v
UNIT-007  Static evidence, proposed security/domain tests, model bakeoff, release audit
```

Only `UNIT-001` is the initial ready slice. `UNIT-003` may start after the
contract types from `UNIT-001` stabilize. High-risk domain work in `UNIT-002`
must remain serialized under one owner.

## Unit Contracts

### UNIT-001 - Contracts, Policy, and Durable Plan State

**Outcome**

Create the stable types and D1 state that separate conversation, planning,
approval, and execution.

**Owned paths**

- `migrations/0104_ask_flip_action_plans.sql` after next-number recheck
- `src/lib/ai/ask-flip/contracts.ts`
- `src/lib/ai/ask-flip/action-policy.ts`
- `src/lib/ai/ask-flip/action-plan-store.ts`
- `src/lib/ai/ask-flip/plan-token.ts`
- `src/lib/ai/audit-d1-store.ts`
- `src/lib/ai/audit.ts`

**Required implementation**

1. Define strict discriminated request/event/plan/action/receipt schemas without
   accepting identity or permission fields from the browser/model.
2. Define stable `R0` through `R4` action and policy enums. Reject unknown
   tool/action names.
3. Create `ai_action_plans` with workspace/actor/run ownership, plan version,
   canonical plan hash, risk summary, status, expiry, approved-by/at/hash,
   precondition fingerprint, target summary, failure class, and timestamps.
4. Add plan/action/policy/domain-receipt columns to `ai_tool_calls`.
5. Migrate representable legacy apply receipt metadata without raw content and
   stop new writes to `ai_package_apply_commands`.
6. Generalize the current HMAC token to bind plan ID/version/hash, user,
   workspace, expiry, policy version, and execution limits.
7. Enforce legal state transitions:
   `draft -> review_required -> approved -> executing -> completed|failed`;
   `draft|review_required -> rejected`; any mutable target change -> `stale`.
8. Keep approval single-use. Idempotent replay of a completed plan returns the
   committed receipt, not a second execution.

**Decisive evidence**

- migration/schema inspection;
- TypeScript/LSP or targeted typecheck on touched files;
- state-transition and forbidden-field grep/static audit;
- no automated product test without explicit authorization.

**Stop**

The types and storage are sufficient for read-only orchestration and a later
executor without implementing provider or domain writes.

### UNIT-002 - Canonical Domain Mutation Command and AI Fork Removal

**Risk**

Current GitNexus returned `HIGH` for both `createProjectRecord` and
`createEstimateRecordWithDefaultTab`. Run fresh upstream impact before edits and
warn again if `HIGH` or `CRITICAL`.

**Outcome**

Build one canonical `project.estimate-package.create` domain command and route
the current AI apply operations through existing domain intents. Delete
AI-owned SQL from `apply.ts`.

**Owned paths**

- `src/lib/projects/actions.ts` or a narrowly extracted project command module
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/d1-intents/estimate-records.ts`
- `src/lib/estimates/d1-intents/nodes.ts`
- `src/lib/estimates/d1-intents/rows.ts`
- `src/lib/estimates/d1-intents/intent-context.ts`
- a new domain-owned aggregate command under `src/lib/estimates/`
- `src/lib/component-library/actions.ts` only for the existing create contract
- `src/lib/ai/package-builder/apply.ts`

**Required implementation**

1. Extract only the smallest reusable command seams needed by both UI and agent
   callers. Keep authorization in the domain layer.
2. Compose package creation into one bounded D1 batch with deterministic
   server-generated IDs and a request fingerprint.
3. Include project activation, estimate/default tab, nodes, rows, history and
   activity outbox, publication revision semantics, mutation receipt, AI
   tool/plan terminal receipt, source snapshots, readback, and statement-limit
   enforcement in the same final batch.
4. Use `computeEstimateRowCostParts` or its landed successor for every money
   result. Delete raw float totals and budget-ratio price invention from the AI
   path.
5. Preserve active-tab targeting, Area-only row targets, linked component
   freshness, template mode, and unavailable-source confirmation.
6. For multi-resource plans that cannot be one atomic D1 batch, reject and
   re-plan into separately reviewable phases. Never silently chunk an approved
   plan.
7. Replace local AI replay/event/access helpers with canonical receipt and
   access primitives.
8. Remove raw SQL for project/estimate/tab/node/row/component/history/outbox
   writes from `src/lib/ai/package-builder/apply.ts`.

**Cross-pack reconciliation**

This unit absorbs the AI-specific work from:

- `Estimate-Mutation-Integrity-Unification`;
- `Quick-Correctness-And-Security-Wins`;
- `Money-Math-Domain-Module`; and
- `D1-Runtime-Consolidation`.

At execution, inspect current source first. If another pack already landed an
invariant, verify it and skip the duplicate edit. Do not wait for an old pack or
create a second mutation abstraction.

**Decisive evidence**

- direct-SQL audit of `src/lib/ai`;
- canonical receipt/history/outbox/revision/statement-limit import and call
  audit;
- money-oracle call audit;
- type/LSP/static evidence;
- proposed atomicity, idempotency, stale-revision, cross-workspace, and
  statement-limit tests.

**Stop**

The two-bedroom package can be expressed as a canonical command, and the AI
module contains no business-table SQL.

### UNIT-003 - Consolidated Read Tools and Provenance

**Outcome**

Replace duplicated preloaded contexts with demand-driven, typed, bounded read
tools.

**Owned paths**

- `src/lib/ai/read-context.ts`
- `src/lib/ai/package-builder/read-tools.ts`
- `src/lib/ai/ask-flip/read-tools.ts`
- `src/lib/ai/ask-flip/provenance.ts`
- read-only domain query modules only where a shared query is required

**Required implementation**

1. Preserve the current twelve package-builder read capabilities and the Ask
   chart/activity/current-estimate capabilities.
2. Resolve all user/workspace/target IDs server-side. Browser route IDs are
   hints, never authority.
3. Return compact typed data plus provenance:
   source kind, resource ID for app linking, revision or `updated_at`, retrieval
   time, scope, row count, and freshness status.
4. Keep provider-safe payloads ID-minimized while the application retains
   opaque source handles for citations and execution.
5. Enforce selected columns, DB limits, result limits, payload-byte budgets, and
   tool-specific timeouts.
6. Treat every text value from D1 or the user as untrusted data.
7. Record actual rows read before compaction using existing audit structures.
8. Delete the duplicate old reader only after route parity is proven.

**Decisive evidence**

- read-tool inventory and query-bound audit;
- forbidden identity/provider payload audit;
- source/provenance shape inspection;
- type/LSP/static evidence;
- proposed cross-workspace and prompt-injection read tests.

### UNIT-004 - Bounded Provider Loop, Streaming Route, and Audit

**Outcome**

Make `/api/ai/ask` the single route for message, execute, reject, and feedback
without letting the provider execute writes.

**Owned paths**

- `src/app/api/ai/ask/route.ts`
- `src/app/api/ai/ask/handler.ts`
- `src/lib/ai/ask-flip/orchestrator.ts`
- `src/lib/ai/ask-flip/provider.ts`
- `src/lib/ai/ask-flip/providers/openai-responses.ts`
- `src/lib/ai/ask-flip/event-stream.ts`
- `src/lib/ai/rate-limit.ts`
- `src/lib/ai/feature-flags.ts`
- current DeepSeek files when deleting the superseded adapter

**Required implementation**

1. Authenticate, resolve workspace, enforce provider-backed auth, server-side
   product entitlement, quota, provider configuration, policy, and audit
   availability before starting the response stream.
2. Use Web Streams and typed events. Once streaming starts, represent later
   failures as terminal error events because HTTP status can no longer change.
3. Bound each turn by:
   - maximum 12 recent messages;
   - maximum 6 model rounds;
   - maximum 20 tool calls;
   - maximum 2 concurrent read calls;
   - request and provider deadlines;
   - bounded provider payload bytes; and
   - one proposed write plan per turn.
4. Expose read tools during retrieval. Expose only a server-owned
   `propose_action_plan` schema during planning. Never expose mutation
   executors to the model.
5. Parse every provider tool call through strict local validation even when the
   provider claims strict-schema conformance.
6. Normalize a proposal, run deterministic policy, calculate authoritative
   totals, persist the plan, then stream the application-generated preview.
7. Execute mode makes no provider call. It loads and validates stored state,
   re-authorizes, checks revisions/freshness, executes the domain command, and
   writes the receipt.
8. Set provider state persistence off. Do not log raw prompts, full provider
   payloads, hidden reasoning, or retrieved content.
9. Record provider/model, latency, token usage, cache use, refusal/error class,
   tool counts, policy result, and safe hashes.
10. Remove the current DeepSeek-specific direct dependency after the OpenAI
    adapter owns the route.

**Decisive evidence**

- route branch and pre-stream gate inspection;
- provider contract and strict-schema audit;
- loop-limit and no-provider-on-execute audit;
- type/LSP/static evidence;
- proposed timeout, disconnect, malformed tool, refusal, quota, and replay
  tests.

### UNIT-005 - Conversation, Plan Preview, Approval, and Receipt UI

**Outcome**

Turn the current monolithic hidden assistant into a clear conversation and
approval experience.

**Owned paths**

- `src/components/workshop/EstimateCopilotFloatingButton.tsx`
- new components under `src/components/workshop/ask-flip/`
- `src/components/workshop/WorkshopShell.tsx`
- focused hooks/state under `src/hooks/` or the new component folder

**Required implementation**

1. Preserve the authenticated Workshop placement and responsive data.
2. Split transport/state, conversation list, message composer, source chips,
   plan preview, action diff, approval controls, and receipt into focused
   components.
3. Render typed stream events without exposing chain-of-thought.
4. Show each plan's targets, operations, sources, freshness, assumptions,
   unresolved questions, exact cost/margin effects, risk class, and undo status.
5. Provide `Approve`, `Reject`, `Edit plan`, and `Take over` controls.
6. Disable approval when the plan is incomplete, stale, expired, already used,
   or not eligible.
7. After execution, show actual committed IDs and amounts from the server
   receipt, not the model's prediction.
8. Keep sessions in memory. A reload may restore a pending plan by ID and safe
   summary, but not a raw transcript.
9. Keep visible state for connecting, retrieving, calculating, planning,
   awaiting review, applying, completed, blocked, stale, rejected, aborted, and
   failed.
10. Preserve keyboard navigation, focus return, status announcements, reduced
    motion, readable labels, and non-color-only risk/error cues.

**Decisive evidence**

- component/state/accessibility source audit;
- request/response type coverage;
- lint/type/static evidence;
- no browser, screenshot, or visual QA without explicit authorization.

### UNIT-006 - Safe Action Expansion and Legacy AI Deletion

**Outcome**

Complete the launch allowlist, prove every action maps to one canonical domain
command, and remove the old split implementation.

**Owned paths**

- `src/lib/ai/ask-flip/action-tools.ts`
- narrow domain command seams for the launch capability matrix
- old `src/lib/ai/package-builder/` files
- `src/app/api/ai/package-builder/`
- current AI UI imports and feature flags

**Required implementation**

1. Add one registry entry at a time for the confirmed-write launch set.
2. For each tool, record permission, strict schema, target resolver,
   precondition revisions, authoritative calculation, domain command,
   confirmation wording, receipt, and undo policy.
3. Require fresh user confirmation whenever target, action, source, amount,
   revision, or policy version changes.
4. Reject deletes and elevated/hard-prohibited actions with a clear explanation
   and safe manual handoff.
5. Delete the old package-builder route, handler, provider, duplicated reads,
   schemas, draft logic, local memory, and apply fork after parity.
6. Reduce feature gating to the existing single AI route/UI kill switch. Do not
   add action-by-action flags.
7. Ensure every normal UI action and agent action reaches the same canonical
   domain invariant layer.

**Decisive evidence**

- registry-to-domain-command matrix;
- old route/import/dead-code grep;
- direct D1 mutation audit under `src/lib/ai`;
- type/LSP/lint/static evidence;
- proposed per-action denial, confirmation, stale, replay, and receipt tests.

### UNIT-007 - Evidence, Model Bakeoff, and Release Audit

**Outcome**

Demonstrate local implementation correctness, run only authorized automated
evidence, select a model from the Archestimator corpus, and produce an honest
release decision.

**Owned paths**

- focused Ask Flip eval fixtures/harness only if test creation is authorized
- operator documentation for provider configuration and observability
- this plan pack's evidence/status fields

**Required implementation**

1. Run source, diff, type/LSP, lint, schema, dependency, and static security
   checks that do not require product-test authorization.
2. Before adding or running automated tests/evals, obtain explicit current-task
   authorization for the exact files and commands listed in
   `04-EXPERIENCE-SCENARIOS-AND-VERIFICATION.md`.
3. If authorized, run the deterministic domain/route/security tests first.
4. If provider credentials and billed evaluation are authorized, run the
   sanitized 100-turn bakeoff against identical prompts, retrieval, schemas,
   and non-mutating fake executors.
5. Select default/escalation settings only if thresholds pass. Otherwise keep
   AI disabled and record the failed criterion.
6. Verify provider data controls, model ID, pricing, rate limits, region,
   logging, retention, `store: false`, Gateway settings, and spend limits from
   live provider configuration before any release claim.
7. Reconcile every requirement with actual evidence and remove stale claims.

**Decisive evidence**

- requirement-by-requirement final audit;
- authorized test/eval receipts when available;
- live provider readback only when authorized;
- no deployment or feature enablement without explicit authority.

## Risks

| ID | Risk | Mitigation |
|---|---|---|
| RISK-001 | The old AI apply path bypasses canonical receipts, outbox, revision, statement-limit, access, and money invariants. | `UNIT-002` deletes the fork and uses domain-owned commands. |
| RISK-002 | A model or injected document attempts to select targets or expand authority. | Server-derived identity, allowlisted tools, untrusted-data separation, policy recheck, no provider mutation tools. |
| RISK-003 | Approval is replayed or applied to changed records. | Plan hash/version/user/workspace/expiry binding, target revisions, single-use state, domain receipts. |
| RISK-004 | Multi-action execution partially commits. | One bounded D1 batch per atomic plan; otherwise re-plan into separately confirmed phases. |
| RISK-005 | Model-generated amounts diverge from persisted estimate truth. | Canonical source snapshots and money calculations generate preview and receipt. |
| RISK-006 | Streaming hides an authorization/audit failure behind a 200 response. | Complete all fail-closed gates before stream; terminal typed error events after stream start. |
| RISK-007 | Provider retention, Gateway logging, or model changes violate privacy/cost expectations. | `store: false`, metadata-only app logs, implementation-time docs verification, production config readback, spend limits. |
| RISK-008 | "Do everything" becomes generic unsafe action exposure. | Explicit capability registry and hard prohibition list; one reviewed domain adapter per action. |
| RISK-009 | Concurrent work lands overlapping mutation or migration changes. | Recheck source and migration number, preserve shared changes, absorb landed invariants, one writer for `UNIT-002`. |
| RISK-010 | Model bakeoff optimizes prose while missing tool or denial failures. | Safety-weighted corpus and hard zero-tolerance unauthorized-execution threshold. |

## Acceptance Criteria

### AC-001 - One Grounded Conversation

`UX-001` passes when one Ask Flip route and UI answer current workspace
questions, stream typed progress, show app-linkable sources, and provide all
plan/approval/receipt states without the package-builder route.

Test posture: `TEST_PROPOSAL`. Exact commands are in the verification artifact;
they are not authorized by this planning task.

### AC-002 - Two-Bedroom Package

`UX-002` passes when the exact fixture scenario creates one project, one
estimate/default tab, expected hierarchy, source-backed rows, a canonical total
not exceeding PHP 2,000,000, and one replay-safe receipt.

Test posture: `TEST_PROPOSAL` because transaction, money, and replay behavior
cannot be decisively proven by source inspection alone.

### AC-003 - No Model Authority

`SEC-001` passes when the provider-visible tool set contains bounded reads and
`propose_action_plan` only, all identity/targets are server-resolved, and
`src/lib/ai` has no raw business-table mutation SQL.

Test posture: `TEST_PROPOSAL` for adversarial tool/identity attempts; static
inspection remains mandatory.

### AC-004 - Plan-Bound Confirmation

`SEC-002` passes when changed hash/version/actor/workspace/expiry/revision,
missing confirmation, reused approval, or denied permission fails closed before
mutation and is audit-recorded.

Test posture: `TEST_PROPOSAL`.

### AC-005 - Privacy and Injection Boundary

`SEC-003` passes when raw prompts/transcripts/retrieved records/hidden reasoning
are absent from D1 and logs, provider storage is disabled where supported, and
external content cannot alter policy or tool scope.

Test posture: `TEST_PROPOSAL` for injection cases plus source/config inspection.

### AC-006 - Canonical Data Integrity

`DATA-001` passes when every launch write reaches canonical access, receipt,
history/outbox, publication revision, statement-limit, source-snapshot, and
money primitives, with no duplicate AI mutation path.

Test posture: `TEST_PROPOSAL`.

### AC-007 - Bounded Reliable Operations

`OPS-001` passes when timeout, quota, loop/tool limit, provider refusal,
malformed tool output, disconnect, and post-stream failure have explicit,
audited, user-visible behavior.

Test posture: `TEST_PROPOSAL`.

### AC-008 - Evidence-Based Model Selection

`OPS-002` passes when current official provider facts are reverified and the
sanitized corpus selects the model/settings against predeclared safety, quality,
latency, and cost thresholds.

Test posture: `TEST_PROPOSAL` and billed/provider authorization boundary.

## Authorization Boundaries

### AUTH-001 - Provider and Production Actions

Requires explicit authorization:

- creating or funding provider accounts;
- enabling paid model/API or Cloudflare AI Gateway services;
- adding production secrets;
- enabling provider/Gateway logging;
- deploying;
- changing production environment flags; or
- sending live user data to a newly configured provider.

Local interfaces, fake adapters, schemas, and source changes proceed without
this authority.

### AUTH-002 - Automated Product Tests and Evals

Requires explicit current-task authorization before:

- creating or modifying automated product tests;
- running Bun tests, suites, builds as test gates, browser automation,
  screenshots, Storybook, or visual QA; or
- running billed model bakeoffs.

Static contract validators for this plan pack remain allowed.

## Verification Sequence

1. Reconcile source and stale triggers.
2. Run GitNexus upstream impact before each symbol edit.
3. Use source/LSP/static checks during each unit.
4. Run `node .gitnexus/run.cjs detect_changes --scope unstaged` before final
   local completion if the index supports it; compare to source diff if stale.
5. Propose, but do not run, automated commands without `AUTH-002`.
6. If authorized, run the smallest decisive domain/security tests before UI or
   broad checks.
7. If provider actions are authorized, verify live provider settings before the
   model bakeoff or release.
8. Audit every requirement against actual evidence.
9. Stop at local completion or an exact recorded authorization boundary.

## Resume State

- **Next unit:** `UNIT-001`
- **Next migration number observed:** `0104`
- **Current source revision:** `ff8c2e2759e29276d30e9232805303728b410265`
- **GitNexus state:** indexed commit is stale; source is authoritative
- **Known high-impact symbols:** `createProjectRecord`,
  `createEstimateRecordWithDefaultTab`
- **Current external boundary:** no provider billing/secrets/deploy authority
- **Current test boundary:** no automated product-test authorization
- **No product code has been changed by this plan task**
