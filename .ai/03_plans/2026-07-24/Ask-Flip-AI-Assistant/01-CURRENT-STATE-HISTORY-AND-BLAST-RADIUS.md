# Ask Flip Current State, History, and Blast Radius

## Evidence Boundary

- Source revision: `ff8c2e2759e29276d30e9232805303728b410265`
- Audit date: 2026-07-24
- Current branch: `main`
- Product code changed during this planning task: none
- Product tests, build, browser, screenshots, provider calls, D1 writes, deploy:
  not run
- GitNexus: available but indexed at an older commit; source inspection is
  authoritative

## Executive Finding

Ask Flip already exists but is hidden and split into two contracts:

1. a fail-closed, read-only Ask route; and
2. a confirmation-gated Package Builder that can already draft and apply many
   of the requested project/estimate operations.

The safe foundation is real: workspace-scoped reads, provider-backed auth,
metadata-only audit, signed expiring drafts, explicit confirmation, and
idempotency keys.

The current Apply implementation is not safe to expose broadly. It is a
2,700-line AI-owned D1 mutation fork that can partially commit, race revision
checks, omit the canonical activity outbox and publication revision path,
diverge from canonical money calculations, leave Apply audit runs nonterminal,
and wedge its command key after failure.

The plan therefore replaces the orchestration surface and preserves the proven
security behaviors while deleting the mutation fork.

## Current Surface Map

| Surface | Current behavior | Plan disposition |
|---|---|---|
| `src/lib/ai/feature-flags.ts:1-21` | Master AI route and Ask Flip UI both default off | Preserve one master kill switch through implementation; do not add more flags |
| `src/app/api/ai/ask/route.ts` | Returns 404 when master AI flag is off | Keep as the only user-facing AI route |
| `src/app/api/ai/ask/handler.ts:60-88` | Read-only system contract, bounded context, prompt-injection separation | Preserve and generalize into the orchestrator |
| `src/app/api/ai/ask/handler.ts:105-225` | Auth, workspace, provider config, fail-closed quota, read context, started/completed audit | Preserve as the minimum operational bar |
| `src/lib/ai/read-context.ts` | Preloads current workspace/project/estimate/chart/activity context | Consolidate into demand-driven read tools |
| `src/app/api/ai/package-builder/route.ts` | Uses the same master AI flag as Ask | Delete after unified route owns behavior |
| `src/app/api/ai/package-builder/handler.ts` | Draft/refine/reject/apply modes, signed draft validation, structured audit | Absorb into unified route and plan store |
| `src/lib/ai/package-builder/read-tools.ts:14-27` | Twelve bounded read-tool names | Preserve and consolidate |
| `src/lib/ai/package-builder/provider.ts` | DeepSeek planning adapter with narrow suggestion schema | Replace with provider-neutral interface and current Responses adapter |
| `src/lib/ai/package-builder/schemas.ts:6-19` | Eleven mutation operation types, including row delete | Convert to server-owned action registry; remove delete |
| `src/lib/ai/package-builder/draft-token.ts:6-113` | HMAC token binds draft/hash/user/workspace/provider/model/expiry | Generalize to immutable action plan and policy version |
| `src/lib/ai/package-builder/apply.ts` | AI-owned D1 helpers and sequential/aggregate mutations | Delete after canonical command replacement |
| `src/components/workshop/EstimateCopilotFloatingButton.tsx` | Client classifies prompts and chooses Ask vs Package Builder | Remove client privilege routing; consume server response union |
| `src/components/workshop/WorkshopShell.tsx` | Deferred hidden authenticated footer utility | Preserve placement and lazy loading |

## Current Read Capabilities

`src/lib/ai/package-builder/read-tools.ts:14-27` currently lists twelve tools:

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

The read-only Ask route separately supports:

- project lists/counts;
- component and template matches;
- historical rows;
- project chart aggregations;
- activity history; and
- current estimate/tab/tree/row context.

The target registry keeps these capabilities but stops sending a broad,
preloaded portfolio payload on every request.

## Current Mutation Capabilities

`src/lib/ai/package-builder/schemas.ts:6-19` currently represents:

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

The Package Builder already supports the user's central scenario:

- parse a target budget and bedroom count;
- construct a project, estimate, default room tree, and rows;
- prefer current component matches;
- use reviewed historical/comparable/template precedents;
- refine or revise a pending draft;
- sign the draft;
- require explicit confirmation; and
- apply it to a new or current estimate.

The new plan does not restart this work. It preserves the useful domain intent
and replaces unsafe execution.

## Preserved Security Behaviors

### Default-Off Gating

`src/lib/ai/feature-flags.ts:12-21` defaults both server routes and the UI to
disabled and returns a 404 when disabled.

### Provider-Backed Authentication

Both AI handlers reject unauthenticated users, missing workspaces, and the local
admin database bypass. Identity and workspace are server-derived.

### Read-Only Ask Contract

`src/app/api/ai/ask/handler.ts:73-87`:

- forbids create/edit/delete/apply/save;
- distinguishes source-backed facts from invented claims;
- treats user, route, and database text as data rather than instructions; and
- says the route cannot claim a mutation occurred.

### Signed Draft and Explicit Confirmation

`src/lib/ai/package-builder/draft-token.ts:56-113` signs a payload containing:

- draft ID and hash;
- user ID;
- workspace ID;
- provider/model; and
- 30-minute expiry.

Verification uses `timingSafeEqual`, rejects expiry, and requires the same
authenticated user/workspace.

`src/lib/ai/package-builder/schemas.ts:1388-1410` requires:

- current draft hash;
- draft token;
- literal `confirmation.confirmed === true`; and
- idempotency key.

### Provider Data Minimization

The current Package Builder removes raw app IDs and sends compact summaries
rather than unrestricted rows. This is directionally correct, though the
default payload still includes more portfolio labels than some requests need.

### Metadata-Only Audit

`migrations/0006_ai_audit_rate_limits.sql` stores hashes, safe summaries,
provider/model/usage, target IDs, validation errors, row counts, blocked
attempts, and timestamps. It does not require raw prompt or retrieved-content
storage.

## Independent Current-Code Review

An independent review returned:

- result: `FAIL`
- quality status: `BLOCK`
- recommendation: `REQUEST_CHANGES`
- P0: none confirmed
- P1: five blockers

### P1-1 - Partial Commit and Failed-Key Wedge

Evidence:

- `src/lib/ai/package-builder/apply.ts:805-930` creates a command in `started`
  state but has no lease or stale recovery.
- `src/lib/ai/package-builder/apply.ts:2009-2284` applies current-estimate
  operations sequentially.
- `src/lib/ai/package-builder/apply.ts:2675-2689` commits a new package batch,
  then inserts aggregate history separately.
- failed commands require a new idempotency key, which changes derived
  operation IDs and can duplicate earlier side effects.

Impact:

A later failure can leave earlier data committed, the original key unusable,
and a new-key retry capable of duplicating nodes, rows, templates, components,
or projects.

Plan response:

- add lease/reclaim state to the general action plan;
- use stable action IDs independent of retry transport;
- put domain mutation, canonical history/outbox, receipts, and terminal plan/tool
  result in the same final D1 batch; and
- replay the committed receipt on duplicate execution.

### P1-2 - Raceable Revision Checks

Evidence:

- row update checks `row_revision` before an `UPDATE` whose predicate omits the
  expected revision;
- row delete checks revision before a `DELETE` whose predicate omits it; and
- node rename reads first, then updates without a compare-and-swap condition.

Impact:

A concurrent human edit can be overwritten or deleted after the preview was
confirmed.

Plan response:

- remove delete from the launch AI schema;
- require expected revision or `updated_at` in the mutation predicate;
- require exactly one affected row;
- treat zero affected rows as stale-plan conflict; and
- regenerate and reconfirm the full plan.

### P1-3 - Canonical Integrity Fork

Evidence:

- local helpers write `estimate_sheet_events` but not the paired
  `activity_event_outbox`;
- mutations and history are frequently separate commits;
- the AI path bypasses canonical mutation fingerprint/receipt and publication
  revision statements; and
- local access helpers do not match the current strict intent boundary.

Canonical counterparts:

- `src/lib/estimates/d1-intents/history-events.ts`
- `src/lib/estimates/d1-intents/intent-context.ts`
- `src/lib/estimates/mutation-receipts.ts`
- current row/node/template D1 intents

Plan response:

Delete the local fork and build a domain-owned aggregate command from canonical
primitives.

### P1-4 - One Flag Exposes Default-On Mutation Subfeatures

Evidence:

- Ask and Package Builder use the same master flag.
- `src/lib/ai/package-builder/feature-flags.ts` defaults its read, draft, and
  Apply subfeatures to true once the master route is enabled.
- the client routes create/update/delete/rename language to the mutation route.
- no server-side product entitlement was found in the Package Builder handler.

Impact:

Enabling Ask server-side also enables the broader mutation API for eligible
editors even when the UI is hidden.

Plan response:

- one master kill switch controls the whole replacement;
- server-side product entitlement is checked before provider spend and again
  before plan execution;
- the action registry and policy, not flags or client regex, determine available
  capability; and
- no action-by-action feature-flag matrix remains.

### P1-5 - Missing Package Quota and Nonterminal Audit

Evidence:

- Package Builder has no quota check before provider work.
- provider failure is swallowed into deterministic fallback.
- non-Apply package audit is post-hoc/best effort.
- Apply authorization creates a `started` run that success/failure paths do not
  make terminal.

Plan response:

- one quota/cost service covers all message/draft/provider modes;
- audit `started` occurs before retrieval/provider spend;
- every run/tool reaches `completed`, `failed`, or `blocked`;
- execute has no provider call; and
- the final plan/tool/command state commits with the domain receipt.

## Additional P2/P3 Findings

### Provider Context Is Overbroad

The Package Builder constructs portfolio projects, project estimates, areas,
rows, library, templates, historical rows, and comparable package labels for a
new draft. Names may contain client/site identity even when raw IDs are removed.

Target response:

- demand-driven tools;
- intent-specific provider projections;
- payload byte/token caps; and
- opaque source handles.

### Money Logic Diverges

The AI path uses raw floating-point operations in:

- `src/lib/ai/package-builder/draft.ts:1846-1868`;
- `src/lib/ai/package-builder/apply.ts:1298`;
- `src/lib/ai/package-builder/apply.ts:2209-2244`; and
- component-create budget summaries.

The canonical oracle at
`src/lib/estimates/estimate-row-total.ts:157-220` validates currency and rounds
independent cost parts in integer minor units.

Target response:

Use the canonical oracle for preview, policy thresholds, event deltas, persisted
results, and receipts. The model may not author an authoritative total.

### Existing Tests Overstate Transactionality

The current security contract test describes transactional idempotency but
asserts source substrings. The Apply test double batches sequentially without
rollback and cannot expose partial commit, outbox omission, or concurrency
races.

Target response:

When testing is authorized, replace false-confidence source assertions with
D1/failure-injection and concurrency cases. No tests were changed or run during
this plan task.

### Client Recovery Is Generic

The current client has no request abort/deadline, does not honor `Retry-After`,
converts failures to generic text, and can offer the same failed Apply key again.

Target response:

Typed error/recovery events, client abort, retry timing, command-status
readback, and no blind retry.

## Canonical Domain Blast Radius

### Project Creation

`src/lib/projects/actions.ts:1106-1201`:

- validates workspace write access;
- writes the project;
- writes activation outbox state;
- batches D1 statements; and
- reads back the record.

GitNexus upstream impact for `createProjectRecord`:

- risk: `HIGH`
- impacted symbols: 6
- direct callers: 3
- execution processes: 1
- modules: 4

### Estimate Creation

`src/lib/estimates/actions.ts:1819-1888` and
`src/lib/estimates/d1-intents/estimate-records.ts:222-332`:

- create the estimate;
- create the default tab;
- support graph duplication and totals.

GitNexus upstream impact for `createEstimateRecordWithDefaultTab`:

- risk: `HIGH`
- impacted symbols: 7
- direct callers: 2
- execution processes: 1
- modules: 3

### Estimate Nodes and Rows

Current canonical paths include:

- node access, parent/tab/kind/template-link validation, ordering, history, and
  compare-and-swap in `d1-intents/nodes.ts`;
- row insert/update/move/delete/restore with revisions and receipts in
  `d1-intents/rows.ts`; and
- strict edit checks, request fingerprint, receipt readback, and publication
  revision statements in `d1-intents/intent-context.ts:84-210`.

### Templates and Components

- template insertion supports linked/copy mode, active-tab targeting, and
  unavailable-source confirmation;
- component insertion preserves source identity and snapshots; and
- component creation has a library-manager guard and idempotent intent.

### Realtime

`src/hooks/use-estimate-row-update-broadcast.ts` is a best-effort row-update
overlay. It is not proof of commit. Ask Flip completion must use D1 readback and
query invalidation; realtime may notify collaborators but cannot become an
authoritative transaction step.

## GitNexus Condition

The repository index reported an older indexed commit than current HEAD. A safe
local reindex command refused because its runner dependency could not be
resolved without fallback installation.

Consequences:

- graph results were used for navigation and blast-radius warning only;
- current source was inspected to confirm every claim;
- misleading `LOW`/zero results for some AI symbols were not treated as proof;
- the two canonical create symbols returned `HIGH` and require explicit warning
  before implementation edits; and
- execution must rerun impact with a refreshed index when safely available.

Before final implementation review, run `detect_changes` and compare its output
with `git diff` because a stale graph may omit new symbols.

## History

| Date | Commit | Durable change |
|---|---|---|
| 2026-05-23 | decisions log | First slice Ask-only; no raw conversations, writes, service-role authority, or model-controlled targets |
| 2026-05-26 | decisions log | Ask Flip branded and mounted in Workshop; chat sessions local/in-memory |
| 2026-05-28 | `5bb5225c` | Package planning introduced while Ask stayed gated |
| 2026-05-28 | `4bfb87f4` | Confirmed package drafts exposed in Ask Flip UI |
| 2026-05-28 | `0db61dc5` | Package-builder readiness aligned with shipped behavior |
| 2026-05-28 | decisions log | Signed draft, explicit confirmation, scoped reads, source freshness, metadata-only audit, no provider memory |
| 2026-06-02 | `f68b697d` | AI deferred by default for closed beta |
| 2026-06-04 | `0ade1ae9` | Ask fails closed before provider spend |
| 2026-06-13 | `452ccefe` | Ask current-estimate context grouped by tabs |
| 2026-06-13 | `8586ba72` | Ask/package writes kept inside active estimate tab |
| 2026-07-17 | archived spike | Read-only Ask reuse of Package Builder readers, dashboard-first direction |
| 2026-07-20 | active integrity packs | AI Apply identified as mutation/outbox/receipt/money fork |
| 2026-07-24 | this pack | Direct replacement plan for one bounded proposal-and-execution assistant |

## Historical Decisions to Preserve

From `.ai/10_state/decisions.md:930-945`:

- no raw conversation history;
- no service-role or model-controlled workspace/project authority;
- metadata-only AI audit;
- local/in-memory sessions;
- provider-neutral application boundary;
- HMAC-bound drafts and expiry;
- compact selected-column workspace-scoped reads;
- no raw IDs sent to the provider;
- no synthetic supplier prices;
- active-tab targeting;
- source freshness revalidation;
- explicit confirmation and idempotency;
- no automatic navigation after Apply;
- optional memory default off; and
- historical rows are precedents, not current supplier pricing.

Historical Supabase RPC descriptions are superseded. Current provider truth is
Cloudflare D1 and the canonical D1 intent layer.

## Cross-Pack Overlap

### Estimate Mutation Integrity Unification

Current audit says `src/lib/ai/package-builder/apply.ts`:

- reimplements history without outbox;
- skips canonical intent/receipt/fingerprint;
- skips revision guard and statement limit; and
- uses a partial access fork.

This pack absorbs the AI-owned work. At execution, verify whether any invariant
already landed and skip duplicate edits.

### Quick Correctness and Security Wins

Its AI Apply atomicity unit is a current source input, not a dependency. This
pack owns the final Ask Flip atomic command and cannot wait on an old pack.

### Money Math Domain Module

Its AI float-surface finding is absorbed. Ask Flip must use the current canonical
row total oracle or the landed successor.

### D1 Runtime Consolidation

Do not create a general D1 runtime abstraction solely for this pack. Reuse the
current canonical D1 database and intent helpers. Absorb only AI-owned local
helper removal.

## Capability Boundary

### MVP Reads

- projects and estimates;
- current estimate/tree/tabs/rows/totals/activity;
- component library;
- templates;
- historical/comparable rows; and
- source/freshness metadata.

### Confirmed Launch Writes

- create project/estimate/default tab;
- create nodes and rows;
- insert components and reviewed allowances;
- insert/copy templates;
- update/replace rows with compare-and-swap;
- rename nodes with compare-and-swap;
- create library components; and
- create an atomic project/estimate package.

### Deferred or Prohibited

- row delete currently hard-deletes and is removed;
- account/admin/support/permission/publication/client-portal/upload/scan actions
  are not exposed;
- permanent delete/purge is never exposed;
- raw SQL and arbitrary internal calls are never exposed; and
- external production/provider actions remain authorization boundaries.

## Freshness Triggers

Refresh this audit before implementation if:

- current HEAD changes any AI route, handler, schema, provider, reader, draft,
  Apply, audit, quota, or Workshop assistant file;
- current HEAD changes canonical project/estimate/node/row/template/component
  mutation primitives;
- a July 20 integrity/money/runtime pack lands overlapping changes;
- a new D1 migration consumes `0104`;
- entitlement/subscription authority changes;
- the current model/provider catalog changes;
- the GitNexus index is refreshed and contradicts the recorded blast radius; or
- provider data retention or Gateway behavior changes.
