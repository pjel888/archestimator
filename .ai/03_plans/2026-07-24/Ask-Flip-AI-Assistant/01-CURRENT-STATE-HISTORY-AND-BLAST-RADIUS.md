# Ask Flip Current State, History, And Blast Radius

## Evidence Boundary

- Audit date: 2026-07-24
- Source revision: `a3ebd221632d5c69cb58055e2ce49ba1501f641b`
- Branch: `main`
- Tracking: `origin/main`
- GitNexus indexed revision: current HEAD
- Active migration directory: `migrations/`
- Highest active migration: `0103_onboarding_activation_resource_integrity.sql`
- Next migration number observed: `0104`, not reserved
- Product code changed during this plan revision: none
- Migrations created or modified: none
- Product tests, builds, browser, screenshots, provider calls, D1 writes,
  deployment, and production configuration: not run or changed

The shared worktree already contains unrelated Kimi3D landing changes in
`AGENTS.md`, `CLAUDE.md`, `src/app/kimi3d/`, and `public/`. This plan revision
does not modify, revert, stage, or rely on them.

## Executive Finding

Ask Flip currently exists as two hidden, default-off product paths:

1. a read-only Ask route; and
2. a Package Builder route that drafts and applies a broad mutation set.

Useful safety foundations already exist:

- Better Auth and server-derived workspace context;
- local-admin bypass rejection for provider-backed AI;
- metadata-only audit;
- selected-column bounded reads;
- compact provider projections;
- signed expiring draft tokens;
- explicit confirmation;
- source-version checks for some linked library rows; and
- an idempotency-command ledger.

The current implementation is not the requested product architecture:

- the browser uses natural-language regex to choose the privileged route;
- the Ask route is non-streaming and DeepSeek-specific;
- the Package Builder route has no Ask-specific server entitlement/profile
  check;
- enabling the master route exposes default-on Package Builder subfeatures;
- the current Apply schema includes existing-row, node, template, and permanent
  library mutations beyond Release C;
- `src/lib/ai/package-builder/apply.ts` directly constructs business SQL and
  diverges from canonical receipt/history/outbox/publication/money invariants;
- the canonical action plan is not durably server-owned; and
- the existing plan pack couples Ask-only delivery to broad mutation work.

The revised plan preserves useful read/security behavior, makes the broad
Package Builder execution path dormant during replacement, completes Ask-only
and Draft/review first, and limits the first Apply to additive package creation.

## Current AI Surface Map

| Surface | Current behavior | Revised disposition |
|---|---|---|
| `src/lib/ai/feature-flags.ts:12-21` | `ARCHESTIMATOR_AI_ENABLED` and UI flag default off; disabled route returns 404 | Preserve the master kill switch; add a separate server release-profile resolver |
| `src/app/api/ai/ask/route.ts` | Delegates to Ask handler when master route enabled | Keep as the single product route |
| `src/app/api/ai/ask/handler.ts:14-23,43-58` | Accepts one message and bounded display hints | Replace with strict versioned request/event contracts; no authority fields |
| `src/app/api/ai/ask/handler.ts:118-135` | Better Auth/workspace/provider key/quota checks | Preserve and add server product entitlement plus release profile |
| `src/app/api/ai/ask/handler.ts:137-179` | Preloads current read context | Replace broad preload with demand-driven typed readers |
| `src/app/api/ai/ask/handler.ts:186-236` | Started/completed/failed metadata audit around one provider call | Preserve fail-closed audit and make all branches terminal |
| `src/lib/ai/deepseek.ts:1-77` | Direct non-streaming DeepSeek chat-completions fetch | Remove from Ask after the OpenAI Responses adapter reaches Ask-only parity |
| `src/lib/ai/read-context.ts` | Ask-specific current project/estimate/chart/activity context | Consolidate into one read registry |
| `src/app/api/ai/package-builder/route.ts` | Same master AI gate as Ask | Make dormant under new profiles; delete after Release C parity |
| `src/app/api/ai/package-builder/handler.ts:186-557` | Draft/refine/feedback/apply, signed draft, read tools, provider, audit | Selectively absorb read/draft/security concepts; do not keep as parallel execution |
| `src/lib/ai/package-builder/feature-flags.ts:18-25` | Draft and Apply shell/tree/rows default true when master route is enabled; memory default false | Replace with one release profile, not action-by-action flags |
| `src/lib/ai/package-builder/read-tools.ts:14-27` | Twelve bounded read-tool names | Consolidate and add versioned product knowledge |
| `src/lib/ai/package-builder/provider.ts` | DeepSeek-specific planning adapter | Replace with provider-neutral contract and one OpenAI Responses adapter |
| `src/lib/ai/package-builder/schemas.ts:3-35` | Broad operations including update, replace, delete, rename, template, and library create | Release C schema represents package-create only; other actions are deferred |
| `src/lib/ai/package-builder/draft-token.ts` | HMAC binds draft/hash/user/workspace/provider/model/expiry | Replace with server-owned immutable plans; provider/model not part of domain authority |
| `src/lib/ai/package-builder/apply.ts` | Direct D1 mutations and specialized command ledger | Delete after canonical package-create command and receipt parity |
| `src/lib/ai/package-builder/memory.ts` | Optional structured component/template preference signals | Preserve records, keep default off, never call this training or provider memory |
| `src/components/workshop/EstimateCopilotFloatingButton.tsx:112-152` | Regex chooses Ask versus Package Builder for broad write phrases | Remove client privilege routing |
| `src/components/workshop/EstimateCopilotFloatingButton.tsx:179-189` | Browser route segments populate target hints; estimate segment is mislabeled as selected node | Replace with typed hints and server canonical resolution |
| `src/components/workshop/WorkshopShell.tsx:103-160` | Hidden authenticated footer utility behind UI flag | Preserve Workshop placement; use one release-aware surface |

## Current Ask Flow

The Ask handler currently:

1. parses `{ message, routeContext? }`;
2. caps the message at 8,000 characters;
3. derives the AI request user context;
4. rejects unauthenticated, non-Better-Auth, missing-workspace, and local-admin
   bypass requests;
5. requires `DEEPSEEK_API_KEY`;
6. runs the existing AI quota check;
7. loads current authorized context;
8. writes metadata-only audit;
9. sends one non-streaming DeepSeek request; and
10. returns `{ message, provider, model, usage }`.

Current gaps:

- no Ask-specific server product entitlement;
- no release profile;
- no typed source objects;
- no app-linkable source contract;
- no versioned event stream;
- no product-knowledge reader;
- no demand-driven tool loop; and
- no provider-neutral adapter.

Release A replaces these gaps without adding plan or mutation behavior.

## Current Package Builder Flow

The Package Builder handler currently parses:

- `draft`;
- `refine`;
- `feedback`; and
- `apply`.

It derives Better Auth user/workspace context, loads package feature flags,
performs selected reads, calls a DeepSeek-specific provider, deterministically
builds a draft, signs the draft hash/token, and returns a reviewable result.

Apply currently:

- requires Apply shell/tree flags;
- verifies draft token and hash;
- requires literal explicit confirmation;
- records an authorization run;
- accepts an idempotency key; and
- invokes `src/lib/ai/package-builder/apply.ts`.

The useful Draft concepts become Release B inputs. The current broad Apply is
not an execution path to preserve.

## Current Read Capabilities

`src/lib/ai/package-builder/read-tools.ts` currently names:

1. `read_current_workspace_context`
2. `list_accessible_projects`
3. `read_project_summary`
4. `list_project_estimates`
5. `read_estimate_summary`
6. `read_estimate_tree`
7. `read_area_rows`
8. `search_historical_estimate_rows`
9. `search_comparable_estimate_packages`
10. `search_component_library`
11. `search_estimate_templates`
12. `read_package_builder_memory_preferences`

The Ask route separately reads:

- project counts/lists;
- component and template matches;
- historical rows;
- project chart summaries;
- current estimate/tab/tree/row context; and
- activity history.

Release A consolidates these into one demand-driven registry, drops default
portfolio preload, preserves only relevant selected-column queries, and adds
`read_archestimator_product_knowledge`.

## Current Mutation Capabilities

The current Package Builder schema represents:

- `create_project`
- `create_estimate`
- `create_tree_node`
- `insert_component_row`
- `insert_allowance_row`
- `create_library_component`
- `update_existing_row`
- `replace_existing_row`
- `delete_existing_row`
- `rename_estimate_node`
- `insert_template`
- `copy_template_row`

Release C keeps only the normalized operations required to create:

- one new project;
- one estimate and default tab;
- new Group and Area nodes;
- verified library-backed rows; and
- reviewed allowance rows.

Everything else is deferred and must be absent from the Release C executable
schema, not merely hidden in the UI.

## Preserved Security And Product Decisions

### Default-Off AI

Both the route and Workshop UI are default off. Preserve the master emergency
kill switch and add a separate server-derived release profile.

### Better Auth And Workspace Context

`src/lib/ai/auth.ts` rejects the local admin database bypass and derives Better
Auth user/workspace context. Preserve this as an input, not as complete business
authorization.

### Metadata-Only Audit

`migrations/0006_ai_audit_rate_limits.sql` and the current D1 audit store record
safe hashes, provider/model/usage metadata, targets, row counts, and errors
without requiring raw prompts or retrieved content.

### Signed Draft And Explicit Confirmation

The existing draft token binds the draft/hash/user/workspace/provider/model and
expiry. Preserve the actor/workspace/hash/expiry intent, but replace the
client-held draft authority with a server-owned immutable canonical plan.

### Compact Provider Data

The current Package Builder avoids broad raw-ID exposure and uses compact
summaries. Preserve data minimization while moving to demand-driven tools and
opaque source handles.

### In-Memory Conversation

Historical decisions define Ask Flip sessions as in-memory and exclude raw
conversation persistence. Preserve this through Releases A-C.

### Source And Price Truth

Historical and template values are precedents, not automatically current
supplier pricing. Current library rows require source/version/price-option
freshness. The model never supplies canonical prices or totals.

## Unsafe Existing Apply Findings

### P1-1 - Partial Commit And Replay Wedge

`src/lib/ai/package-builder/apply.ts`:

- creates a specialized command in `started` state;
- performs some current-estimate operations sequentially;
- writes a new-package business batch before its aggregate history event; and
- completes the command ledger separately.

A crash can leave business rows present while the command remains started or
the history/terminal record is absent. Asking the client for a new key can
change derived operation IDs and duplicate side effects.

Release C response:

- stable plan/action IDs independent of transport retry;
- expiring compare-and-swap lease;
- one bounded domain command;
- domain/history/outbox/receipt/terminal state in one atomic boundary; and
- same-key replay of the committed receipt.

### P1-2 - Raceable Existing-Record Mutations

Current row update/delete and node rename paths can check revisions separately
from their mutation predicates.

Release C response:

- no existing-row or existing-node mutation is represented;
- later releases must use compare-and-swap predicates and exactly-one-row
  effects.

### P1-3 - Canonical Integrity Fork

The AI Apply path:

- writes bespoke estimate events;
- omits the paired canonical activity outbox in the same boundary;
- does not compose canonical mutation receipt/fingerprint;
- does not consistently compose publication revision behavior;
- has its own access helpers; and
- does not enforce the canonical statement limit at final package assembly.

Canonical sources include:

- `src/lib/estimates/d1-intents/history-events.ts`
- `src/lib/estimates/d1-intents/intent-context.ts`
- `src/lib/estimates/mutation-receipts.ts`
- `src/lib/activity/activity-outbox.ts`
- current project/estimate/node/row intent builders

Release C deletes this fork after the package command reaches parity.

### P1-4 - Release And Authorization Conflation

The same master route flag controls Ask and Package Builder, while Package
Builder subflags default to broad capability once the master is on.

Release response:

- emergency master kill switch;
- default-off server release profile and cohort/product entitlement;
- independent registry/domain authorization;
- no client regex policy; and
- no action-by-action environment matrix.

### P1-5 - Quota And Terminal Audit Gaps

Package Builder does not use the Ask quota before provider work. Some provider
failure becomes deterministic fallback, and some audit writes are best effort
or nonterminal.

Release A/B response:

- one quota/deadline/payload/audit service before provider spend;
- bounded provider retries;
- no silent cross-provider fallback;
- every run/tool reaches a terminal safe state; and
- execute is provider-free.

### P2 - Overbroad Provider Context

Package Builder assembles labels from projects, estimates, areas, rows, library,
templates, historical rows, and comparable packages before the provider proves
they are needed.

Release A response:

- demand-driven tools;
- per-tool payload limits;
- intent-specific projections;
- opaque source handles; and
- no unrelated portfolio preload.

### P2 - Money Divergence

Current AI draft/apply code uses raw floating-point calculations in budget and
Apply summaries. The canonical module
`src/lib/estimates/estimate-row-total.ts` validates and computes integer
minor-unit totals and rejects mixed currency.

Release B/C response:

- server calculation for preview, risk, budget, commit, and receipt;
- calculation version persisted in plan/receipt; and
- model totals ignored.

## Canonical Domain Blast Radius

### Project Creation

`src/lib/projects/actions.ts:1106` uses the current Workshop write context,
workspace/profile resolution, project creation, and activation outbox facts in
one D1 batch.

The Release C aggregate command must preserve the current project creation
contract or explicitly compose the same invariants.

### Estimate And Default Tab

`src/lib/estimates/actions.ts:1788` checks current-workspace project and project
edit access before calling the canonical estimate/default-tab builder in
`src/lib/estimates/d1-intents/estimate-records.ts:222`.

Package creation is a graph, not one row.

### Nodes And Rows

Current D1 intents enforce:

- estimate/tab relationships;
- active tab;
- parent kind and hierarchy;
- Area-only row ownership;
- source identity and snapshots;
- revisions;
- history;
- publication revision; and
- receipt semantics.

Release C must compose these behaviors without exposing existing-record edits.

### History, Activity, And Publication

`runMutationWithHistory` in
`src/lib/estimates/d1-intents/history-events.ts:328-437` batches mutation,
`estimate_sheet_events`, and `activity_event_outbox`.

Current intents append publication source-revision statements where required.
The package command must decide the initial unpublished project revision from
current source and commit the correct behavior atomically.

### Receipts And Limits

`src/lib/estimates/mutation-receipts.ts` provides:

- request fingerprint;
- committed receipt readback;
- conflict/replay behavior;
- 65,536-byte result limit; and
- 1,000-statement limit.

Release C must use or exactly preserve these invariants.

### Money

`src/lib/estimates/estimate-row-total.ts`:

- validates quantity, percentages, currency, and safe ranges;
- computes integer minor-unit parts;
- rejects mixed currency; and
- exposes `ESTIMATE_CALCULATION_VERSION`.

Release B preview and Release C persistence must use this canonical oracle or a
verified landed successor.

### Components And Templates

Component-library creation, source/version management, supplier/price-option
mutation, template insertion, and current-estimate template copy have their own
authorization, identity, projection, and receipt risks. They are not part of
Release C.

## Product Entitlement And Release-Control Gap

Current feature control includes:

- D1 `feature_flags` as runtime truth;
- a canonical catalog in `src/lib/feature-gates/catalog.ts`;
- server enforcement helpers in `src/lib/feature-gates/enforce.ts`; and
- closed-beta allowlist/session enforcement under `src/lib/auth/`.

The current D1 `feature_flags` values are global. They do not represent a
per-user or per-workspace cohort. The current closed-beta authority is
user/email-scoped, while active-workspace authorization is a separate
user/workspace membership check. The shared admin flag reader may use stale
last-known-good values for dashboard availability, so it cannot be reused as
the fail-closed Ask authorization read.

No Ask-specific feature gate, release profile, or product entitlement check is
wired into either current AI handler.

`UNIT-001` must reuse these current server authorities and add:

- a global default-off Ask Flip gate with a strict non-stale authorization
  read;
- one server-only maximum profile;
- an effective profile resolver; and
- a repeated entitlement/profile check before Release C execution.

The initial cohort is the current closed-beta eligible-user set. If rollout
requires finer user/workspace profiles, `UNIT-001` must add an explicit
server-owned entitlement source rather than treating the global feature flag as
workspace authority.

Do not create a browser-selected profile or a billing subsystem.

## DeepSeek And Package Builder Disposition

### DeepSeek

- Current source proves provider integration exists.
- It is not the target architecture or release model decision.
- Release A replaces the Ask DeepSeek call after one OpenAI Responses adapter
  reaches behavioral parity for the supported Ask-only surface.
- Do not retain permanent dual provider code.
- Do not delete current provider code before the replacement path is complete
  enough to keep AI default-off and recoverable.

### Package Builder

- Use current read tools, draft normalization, token/confirmation concepts, and
  safe source handling as source material.
- Make its broad execution path dormant under the new profile from `UNIT-001`.
- Do not keep it enabled during replacement.
- Absorb neutral readers and deterministic proposal concepts into Releases A/B.
- Replace direct Apply with the Release C domain command.
- Delete the old route, provider, schemas, client routing, memory wiring, and
  business SQL after canonical package-create parity.
- Preserve historical D1 audit/command rows until retention owns deletion.

## Overlapping Active Plans

### Estimate Mutation Integrity Unification

This pack identifies the AI Apply fork and defines reusable receipt,
history/outbox, access, and revision invariants.

Disposition:

- reuse any landed canonical primitive;
- keep Ask Flip ownership limited to its aggregate package command and adapter;
- do not create a competing general mutation framework; and
- verify current source before Release C starts.

### Quick Correctness And Security Wins

Its AI Apply atomicity unit covers the same row/history partial-commit risk.

Disposition:

- preserve the failure scenario as Release C evidence;
- treat current source, not unit status, as truth; and
- do not claim the risk is fixed by planning.

### Money Math Domain Module

It identifies AI budget float math and a neutral domain oracle direction.

Disposition:

- use the current canonical calculator or verified landed successor;
- do not reimplement money in Ask Flip; and
- keep budget headroom unallocated unless explicitly instructed.

### D1 Runtime Consolidation

It does not automatically migrate AI Package Builder helpers.

Disposition:

- use the verified shared D1 accessor if landed;
- otherwise use the current canonical D1 intent/database helpers;
- do not widen this plan into a general D1 runtime rewrite.

### API Rate-Limiting Security Consolidation

Disposition:

- reuse shared request-limit, retry, privacy, and abuse-control conventions;
- add Ask-specific provider/tool/payload/spend budgets as one policy profile;
- do not build a second generic limiter.

### Authentication, Security, And Privacy Plans

Disposition:

- reuse Better Auth, closed-beta access, workspace authorization, metadata-only
  audit, redaction, retention, export, and erasure conventions;
- never revive historical Supabase provider authority; and
- keep current D1/Cloudflare source authoritative.

## Historical Decisions To Preserve

- 2026-05-23: first Ask slice was read-only; no raw conversations, write tools,
  service-role authority, or model-controlled targets.
- 2026-05-26: Ask Flip branded and mounted in Workshop; chat sessions remained
  local/in-memory.
- 2026-05-28: Package Builder added compact scoped reads, signed drafts,
  explicit confirmation, source freshness, metadata-only audit, and
  provider-neutral intent, but expanded into broad Apply.
- Optional structured Package Builder memory remained default off.
- Historical rows and templates are precedents, not current supplier pricing.
- Active-tab targeting and source freshness must be preserved.
- Current provider truth is Cloudflare/D1; historical Supabase mutation paths
  are archaeology.

The revised plan preserves the safety intent and supersedes the broad mutation
scope and client-held plan authority.

## Release-Stage Implications

### Release A

- no dependency on package-create domain work;
- no action-plan migration;
- Package Builder Apply dormant;
- current read behavior consolidated selectively;
- one provider adapter only;
- no model training or RAG.

### Release B

- canonical plan persistence begins;
- current next migration number is rechecked;
- approval is review state only;
- no business-data mutation.

### Release C

- only additive package create;
- canonical domain invariants are prerequisites;
- exact Rivera fixture is the vertical proof;
- Package Builder fork is deleted after parity;
- expanded actions remain absent.

## Current Stale Triggers

Refresh this audit before implementation when any of the following changes:

- HEAD changes an AI route, handler, provider, reader, audit, quota, feature
  gate, Workshop assistant, Package Builder schema, or Apply file;
- HEAD changes project, estimate, tab, node, row, component, template, money,
  receipt, history, activity outbox, publication revision, authorization, or
  statement-limit code;
- an overlapping D1 runtime, integrity, money, auth, rate-limit, or privacy plan
  lands;
- migration `0104` is consumed;
- closed-beta access, feature-flag, entitlement, or billing authority changes;
- the GitNexus index drifts from current HEAD;
- OpenAI Responses, model/tool support, retention, pricing, limits, or endpoint
  behavior changes;
- Cloudflare AI Gateway logging, caching, routing, limits, billing, or retention
  behavior changes;
- automated product tests, provider evaluation, provider configuration,
  deployment, or production feature enablement becomes newly authorized; or
- a current business requirement expands Release C beyond package creation.
