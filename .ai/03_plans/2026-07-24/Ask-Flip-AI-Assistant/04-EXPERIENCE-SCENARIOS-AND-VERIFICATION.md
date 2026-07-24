# Ask Flip Experience, Scenarios, And Verification

## Verification Boundary

This artifact defines planned product behavior and proposed evidence for three
separate releases:

1. Release A: `ASK_ONLY`
2. Release B: Draft & Review (`ASK_AND_DRAFT`)
3. Release C: `PACKAGE_CREATE_APPLY`

No automated product tests, browser automation, screenshots, provider calls,
Gateway changes, deployment, or production enablement are authorized by this
plan-only revision.

The default verification state is:

- plan contract and source inspection: allowed;
- static plan-pack validation: allowed;
- product tests: `TEST_PROPOSAL`;
- model evaluation calls: authorization boundary;
- browser and visual evidence: authorization boundary;
- deployment and live release evidence: authorization boundary.

## Shared Experience Contract

### Entry Point

Ask Flip remains one user-facing conversation surface.

The server resolves the user's effective release profile for every request:

- `DISABLED`
- `ASK_ONLY`
- `ASK_AND_DRAFT`
- `PACKAGE_CREATE_APPLY`
- `EXPANDED_ACTIONS`

Only the three middle profiles correspond to Releases A-C.
`EXPANDED_ACTIONS` is reserved and grants no capability in this pack.

The profile determines which product capabilities may be offered. It never
replaces workspace authorization, row ownership, source validation, command
policy, or execution confirmation.

### Visible States

The client represents explicit states rather than inferring them from prose:

- idle;
- submitting;
- reading;
- answering;
- awaiting clarification;
- drafting;
- reviewing;
- approved;
- executing;
- completed;
- rejected;
- taken over;
- expired;
- stale;
- failed; and
- cancelled.

Every terminal state is reachable by keyboard and announced to assistive
technology.

### Message And Source Contract

Grounded answers distinguish:

- product knowledge;
- current workspace records;
- current estimate or tab records;
- deterministic calculation output;
- reviewed historical precedent;
- user-provided facts;
- explicit assumptions; and
- unavailable or stale information.

Visible source summaries include:

- source class;
- human-readable label;
- freshness or version when material;
- whether the value is current, historical, or assumed; and
- a safe link or handle when the user may inspect it.

The interface does not expose:

- raw SQL;
- hidden model reasoning;
- provider payloads;
- secrets;
- inaccessible record identifiers;
- unrelated workspace data; or
- internal policy text that would weaken controls.

### Clarification Contract

Ask Flip asks a bounded clarification when:

- target identity is ambiguous;
- workspace, project, estimate, or tab context is missing;
- requested currency differs from the authoritative workspace currency;
- source matches are incomplete or conflicting;
- the request would require an unsupported action;
- an allowance needs an explicit basis;
- a proposed package would exceed budget without an explicit user decision; or
- the request cannot be represented by the active release profile.

Clarification must not be used to smuggle a prohibited action into a later
turn. A profile or authorization failure stays a failure.

### Error Contract

User-facing errors separate:

- permission denied;
- feature unavailable;
- release profile unavailable;
- quota exhausted;
- source stale;
- plan expired;
- plan changed;
- execution already in progress;
- provider unavailable;
- deterministic validation failure; and
- safe retry available.

Errors do not claim that nothing changed unless the server has evidence that no
commit occurred. Lost-response cases use receipt lookup before offering retry.

## Release A - `ASK_ONLY`

### Goal

Deliver grounded, read-only product and estimate assistance without mutation,
draft persistence, approval, or execution.

### Available Capabilities

- versioned product knowledge;
- current authorized workspace and estimate reads;
- strict typed read tools;
- deterministic totals, deltas, rankings, and budget calculations;
- source freshness summaries;
- bounded conversational follow-up; and
- refusal or clarification for unsupported requests.

### Unavailable Capabilities

- action-plan creation;
- durable draft/review state;
- approval;
- execution;
- project, estimate, tab, node, row, library, or template mutation;
- delete, rename, publish, invite, export, deploy, billing, auth, or admin
  actions; and
- provider fallback.

### Scenario A1 - Product Knowledge

User:

> What is the difference between an estimate Group and an Area?

Expected behavior:

1. Resolve `ASK_ONLY`.
2. Read the current versioned Archestimator product-knowledge entry.
3. Explain the distinction using current product terminology.
4. Show the product-knowledge version/freshness label.
5. Offer a non-mutating follow-up.

Required evidence:

- no workspace data is requested unless the user asks for an example;
- no write tool is registered;
- no mutation event or plan record is created; and
- the answer is traceable to versioned product knowledge.

### Scenario A2 - Grounded Current Estimate Read

User:

> Which three rows drive the largest cost in this estimate?

Expected behavior:

1. Resolve the current authorized estimate and tab.
2. Use typed reads to obtain the bounded relevant rows.
3. Calculate canonical row totals on the server.
4. Rank the rows deterministically.
5. Return values in authoritative workspace currency.
6. Identify source freshness and calculation version.

Required evidence:

- the model does not calculate or rank authoritative totals;
- inaccessible rows are absent;
- the response does not broaden the requested scope;
- source handles resolve only for the same authorized actor and workspace; and
- no data changes.

### Scenario A3 - Source Freshness

User:

> Is this kitchen package still using the current library price?

Expected behavior:

- resolve the selected row and linked library source;
- compare the row's captured source/version with the current authorized source;
- report `current`, `changed`, `removed`, or `unavailable`;
- show the material version/freshness detail; and
- avoid implying that an update occurred.

### Scenario A4 - Missing Context

User:

> What is over budget?

Expected behavior:

- ask which project, estimate, tab, or budget context the user means when the
  current context is not singular;
- do not guess a target;
- do not retrieve unrelated projects; and
- remain in read-only mode.

### Scenario A5 - Mutation Request

User:

> Change every wardrobe quantity to two.

Expected behavior:

- explain that the active profile is read-only;
- offer a read-only impact summary if authorized;
- do not create a plan or register a proposal/write tool; and
- emit an observable policy-denial outcome without leaking policy internals.

### Scenario A6 - Provider Or Quota Failure

Expected behavior:

- distinguish provider unavailable from application quota exhausted;
- return a stable retryable/non-retryable error shape;
- do not route to a second provider;
- do not weaken retrieval or authorization constraints; and
- create no mutation or draft record.

### Release A Exit Evidence

Release A remains blocked from live enablement until authorized evidence shows:

- grounded product answers;
- grounded current-data answers;
- deterministic calculations;
- source freshness;
- clarification behavior;
- provider/quota failure behavior;
- strict read-only tool registration; and
- zero mutation across all Release A scenarios.

## Release B - Draft & Review (`ASK_AND_DRAFT`)

### Goal

Add durable, server-owned action-plan drafting and review while preserving a
hard no-mutation boundary.

### Available Capabilities

All Release A capabilities plus:

- one strict `propose_action_plan` tool;
- server-side canonical plan compilation;
- durable bounded plan JSON;
- normalized approval/rejection/takeover records;
- revision and expiry;
- review of proposed effects, sources, assumptions, risks, and unsupported
  items;
- approve;
- reject;
- edit through a new canonical revision; and
- take over manually.

### Unavailable Capabilities

- execution;
- mutation commands;
- direct D1 writes from the provider loop;
- broad Package Builder apply modes;
- client-authored canonical plans; and
- resubmitting a plan body to an execute endpoint.

### Plan Review Contract

The preview shows:

- plan ID and version;
- effective release profile;
- target workspace;
- requested outcome;
- supported proposed command type;
- complete effects;
- current source summaries and freshness;
- assumptions;
- deterministic budget/total preview;
- unsupported items;
- risk;
- expiry;
- approval state; and
- available controls.

Controls are:

- Approve
- Reject
- Edit plan
- Take over

`Approve` records review intent. In Release B it never executes or mutates.

### Scenario B1 - Rivera Draft

Use the exact Rivera fixture defined under Release C.

User:

> Create a new two-bedroom fit-out project in BGC called Rivera 2BR. Create a
> baseline estimate capped at PHP 2,000,000. Use my current library where
> possible, otherwise use reviewed allowances. Show me every assumption before
> applying.

Expected behavior:

1. Retrieve only the authorized source set.
2. Compile a canonical server-owned `project.estimate-package.create` plan.
3. Persist bounded canonical JSON in `ai_action_plans`.
4. Display all ten rows and every assumption.
5. Show subtotal `PHP 1,890,000`.
6. Show budget `PHP 2,000,000`.
7. Show headroom `PHP 110,000`.
8. Keep `Apply` unavailable.

Required evidence:

- browser memory is not the canonical plan;
- provider prose is not the canonical plan;
- approval does not mutate;
- reload restores the same plan version and review state; and
- the plan contains source/version references sufficient for later
  revalidation.

### Scenario B2 - Edit And Revision

User changes the project name or removes one proposed row.

Expected behavior:

- create a new canonical plan version;
- preserve the prior version for audit;
- invalidate approval for the prior content;
- recompute authoritative totals and preview hash;
- show exactly what changed; and
- require review of the new version.

### Scenario B3 - Stale Source

A library price changes after the draft is created.

Expected behavior:

- mark the plan stale during reload or revalidation;
- display the changed source;
- prohibit approval of the stale version;
- offer a new revision with recalculated totals; and
- preserve the stale version as audit evidence.

### Scenario B4 - Rejection

Expected behavior:

- persist a normalized rejection outcome;
- transition the plan to terminal `rejected`;
- accept an optional bounded rejection reason;
- never mutate business records; and
- prevent later approval of that version.

### Scenario B5 - Takeover

Expected behavior:

- persist a normalized takeover outcome;
- transition the plan to terminal `taken_over`;
- give the user safe navigation to the relevant manual product surface;
- prevent later approval or execution of that version; and
- avoid claiming that manual work completed.

### Scenario B6 - Incomplete Source Set

No current library source or reviewed allowance supports one requested scope
item.

Expected behavior:

- list the unsupported item explicitly;
- do not invent a price;
- do not hide it in contingency;
- ask for a user decision or remove it from the plan; and
- keep the plan non-approvable until resolved.

### Release B Exit Evidence

Release B remains blocked from live enablement until authorized evidence shows:

- durable reloadable canonical plans;
- deterministic revisions and preview hashes;
- approval, rejection, edit, and takeover state transitions;
- stale-plan invalidation;
- incomplete-source handling;
- expiry; and
- zero business-record mutation in every Release B path.

## Release C - `PACKAGE_CREATE_APPLY`

### Goal

Add exactly one confirmed additive command:

`project.estimate-package.create`

The command may create:

- one project;
- one estimate;
- its default tab;
- Groups and Areas beneath that tab;
- rows from current authorized component-library sources; and
- explicitly reviewed allowance rows.

It may not update, replace, delete, rename, publish, invite, import, export,
deploy, bill, administer, or create reusable templates/library records.

### Synthetic Rivera 2BR Fixture

This fixture is synthetic. It contains no production customer content.

Workspace:

- currency: `PHP`;
- actor: authorized workspace editor;
- source access: authorized current library and reviewed historical precedent;
- effective release profile: `PACKAGE_CREATE_APPLY`; and
- master Ask Flip switch: enabled.

| Item | Source class | Quantity | Unit cost | Total |
|---|---|---:|---:|---:|
| Modular kitchen package | Current library | 1 | PHP 420,000 | PHP 420,000 |
| Master wardrobe package | Current library | 1 | PHP 220,000 | PHP 220,000 |
| Bedroom 2 wardrobe package | Current library | 1 | PHP 160,000 | PHP 160,000 |
| Master bed package | Current library | 1 | PHP 180,000 | PHP 180,000 |
| Bedroom 2 bed package | Current library | 1 | PHP 140,000 | PHP 140,000 |
| Living ceiling and lighting | Current library | 1 | PHP 180,000 | PHP 180,000 |
| Dining lighting package | Current library | 1 | PHP 80,000 | PHP 80,000 |
| Master T&B fixture package | Current library | 1 | PHP 220,000 | PHP 220,000 |
| Common T&B fixture package | Current library | 1 | PHP 170,000 | PHP 170,000 |
| General requirements | Reviewed historical precedent | 1 | PHP 120,000 | PHP 120,000 |

Canonical subtotal: `PHP 1,890,000`.

Budget ceiling: `PHP 2,000,000`.

Unallocated headroom: `PHP 110,000`.

Each library row includes a current source/version/price-option reference. The
General Requirements row is explicitly labeled as reviewed historical
precedent, not current supplier pricing.

### Canonical Rivera Plan

Create:

- project: `Rivera 2BR`;
- location label: `BGC`;
- estimate: `Baseline Fit-Out`;
- default estimate tab;
- group: `Fit-Out Scope`;
- areas:
  - `Living`
  - `Dining`
  - `Kitchen`
  - `Master Bedroom`
  - `Bedroom 2`
  - `Master T&B`
  - `Common T&B`
  - `General Requirements`
- the ten fixture rows.

Expected primary-record preview:

- 1 project;
- 1 estimate;
- 1 default tab;
- 9 estimate nodes;
- 10 estimate rows; and
- 22 primary records.

Expected financial preview:

- subtotal: `PHP 1,890,000`;
- budget: `PHP 2,000,000`;
- headroom: `PHP 110,000`;
- over budget: `false`; and
- totals/currency/calculation version: server-derived.

Visible assumptions:

- each selected source is one package quantity;
- floor-area-dependent work is not included;
- no painting, flooring, demolition, professional fees, permits, appliances,
  owner-supplied work, or other unlisted scope is invented;
- General Requirements is a reviewed historical allowance; and
- headroom remains unallocated unless the user explicitly revises the plan.

Ask Flip must not inflate rows to consume the budget.

### Scenario C1 - Confirmed Rivera Apply

The user approves the current plan version and issues an execute request with
the plan identifier/version, client request ID, literal structured execute
intent, and idempotency key. The request never resends canonical plan content
or an approval token.

The server:

1. authenticates the actor;
2. resolves workspace membership and effective release profile;
3. reloads the canonical plan from D1;
4. verifies plan state, version, hash, preview hash, expiry, and approval;
5. reauthorizes every target and source;
6. revalidates source versions, project-name collision, money, budget, record
   counts, and command policy;
7. verifies the command fits receipt and D1 statement/atomic-batch limits;
8. claims one execution lease using the idempotency key;
9. invokes the canonical domain command;
10. commits all business records, required canonical sidecars, approval
    consumption, plan completion, action-plan receipt, and terminal audit in
    one atomic boundary;
11. reads back authoritative IDs and totals; and
12. returns the durable receipt.

Expected receipt:

- one project ID and link;
- one estimate ID and link;
- one default tab;
- nine nodes;
- ten rows;
- subtotal exactly `PHP 1,890,000`;
- budget exactly `PHP 2,000,000`;
- headroom exactly `PHP 110,000`;
- authoritative currency and calculation version;
- source and assumption summary;
- initiating and approving actor;
- command and receipt IDs;
- completed timestamp;
- no synthetic price;
- no missing history/activity outbox;
- `idempotentReplay: false`; and
- optional best-effort realtime status that does not affect commit truth.

### Scenario C2 - Receipt Replay

The same logical execute request is submitted again.

Expected behavior:

- reload the durable command receipt;
- return the same business record identifiers and financial results;
- set `idempotentReplay: true`;
- create no additional business record, sidecar, history event, or audit
  terminal; and
- avoid a provider call.

### Scenario C3 - Permission Revoked

The actor loses required workspace permission after approval.

Expected behavior:

- fail current authorization before mutation;
- record a safe denied execution attempt;
- keep the approved plan from implying executability;
- create no partial record; and
- require a newly authorized actor and policy-valid flow.

### Scenario C4 - Price Changed

A referenced library price/version changes after approval.

Expected behavior:

- fail revalidation before mutation;
- transition the plan to stale;
- identify the changed source safely;
- require a newly compiled plan version and approval; and
- preserve the prior plan and approval for audit.

### Scenario C5 - Expired Plan

Expected behavior:

- fail before mutation;
- mark or report the plan expired;
- refuse to extend expiry implicitly; and
- require a new revision and approval.

### Scenario C6 - Lost Response After Commit

The atomic commit succeeds but the response is lost.

Expected behavior:

- the next request checks the idempotency/receipt record;
- the server returns the original receipt as replay;
- no second package is created;
- the UI resolves `executing` to `completed`; and
- realtime delivery is not treated as commit authority.

### Scenario C7 - Final D1 Batch Failure

Expected behavior:

- the entire canonical atomic command fails;
- no business record or required sidecar remains committed;
- no completed receipt is emitted;
- after the execution lease expires and receipt absence is proven, the plan
  returns from `executing` to `approved` for same-key recovery under the lease
  contract; and
- the UI never claims completion.

### Scenario C8 - Provider Unavailable During Execute

Expected behavior:

- execution does not require a provider call;
- the server reloads and validates the canonical plan locally;
- the command succeeds or fails solely on current application/domain state; and
- no provider fallback occurs.

### Scenario C9 - Prohibited Action

The request or stored proposal contains delete, update, rename, publish,
invite, raw SQL, deployment, billing, admin, reusable template creation, or
component-library creation.

Expected behavior:

- compilation or execution rejects the unsupported action;
- no partial supported subset executes silently;
- the rejection is observable;
- the user may take over manually; and
- no broad Package Builder apply path is invoked.

### Scenario C10 - Command Exceeds Atomic Limits

The canonical package would exceed the configured D1 statement limit, receipt
payload limit, or command record-count ceiling.

Expected behavior:

- reject before mutation;
- never split the user-approved command into hidden partial commits;
- explain the bounded planning limit;
- require a smaller newly reviewed plan; and
- preserve the failed attempt as safe audit evidence.

### Release C Exit Evidence

Release C remains blocked from live enablement until authorized evidence shows:

- exact Rivera creation and totals;
- canonical domain invariants and sidecars;
- atomic failure behavior;
- durable receipt replay;
- lost-response recovery;
- permission/source/expiry revalidation;
- provider-independent execute;
- prohibited-action rejection;
- command-limit rejection; and
- no broader write surface.

## Accessibility Contract

The planned experience must provide:

- keyboard access to conversation, sources, plan review, and every decision
  control;
- logical focus order;
- focus restoration after streamed completion, modal review, errors, and
  terminal transitions;
- live-region announcements that do not reread every token;
- non-color-only status and risk indicators;
- accessible names for source links and controls;
- an explicit confirmation label that names the exact additive command;
- complete effects and assumptions without hover-only disclosure;
- reduced-motion support; and
- no focus loss when a plan reloads, expires, or becomes stale.

## Proposed Application Verification

Status: `TEST_PROPOSAL`.

These are planned tests, not authorized or executed tests.

### Proposed Scope

Targeted application/domain coverage should prove:

- release-profile resolution is separate from authorization;
- the Ask gate fails closed on unavailable reads and never consumes a stale
  last-known-good enablement value;
- one-route operation schemas reject unknown operations, fields, origins, and
  content types;
- Release A registers only read tools and never mutates;
- provider-independent SSE framing produces one terminal event and safely
  handles incremental UTF-8, malformed frames, EOF, abort, and disconnect;
- product knowledge and current data are source-labeled;
- deterministic calculations use canonical money semantics;
- Release B plans are canonical, durable, reloadable, versioned, expiring, and
  non-executable;
- approval, rejection, edit, and takeover state transitions are valid;
- execute accepts identifiers/references, not a plan body;
- Release C supports only `project.estimate-package.create`;
- the Rivera fixture creates exactly 22 primary records and the required
  sidecars;
- the Rivera subtotal, budget, and headroom are exact;
- permission/source/version/expiry changes fail before mutation;
- receipt replay is stable and duplicate-free;
- final-batch failure is atomic;
- provider outage does not block execute;
- the provider round contract preserves `callId` correlation and stateless
  continuation under `store: false`;
- outbound provider/audit field allowlists and redaction exclude prohibited
  data;
- plan/approval/receipt lifecycle, browser clearing, export/erasure, and
  backup/restore limitations match the documented matrix;
- statement/receipt/record limits fail closed; and
- unsupported action families never reach mutation code.

### Proposed Command

The implementation unit must identify the narrowest existing Bun test command
after the final test files and current repository scripts are known.

The command is deliberately not frozen in this plan because:

- implementation paths may change before the unit is ready;
- the repository test surface is user-gated;
- no product test was requested for this plan-only task; and
- an invented command is not evidence.

## Proposed Model Evaluation

Status: `TEST_PROPOSAL` plus billed-provider authorization boundary.

The model corpus and metrics are defined in
`03-MODEL-RESEARCH-AND-EVALUATION.md`.

Planned evaluation must keep two evidence sets separate:

1. deterministic application security/domain evidence; and
2. probabilistic model-behavior evidence.

The application passes only when deterministic controls reject unauthorized,
stale, malformed, injected, oversized, ambiguous, and prohibited requests
regardless of model output.

The selected hosted model passes only when the sanitized corpus demonstrates
acceptable grounded-answer quality, source use, clarification, proposal
conformance, latency, and cost per successful task.

No model score may authorize a tool, target, source, approval, or mutation.

## Acceptance Evidence Matrix

| Criterion | Planned decisive evidence | Current state |
|---|---|---|
| `AC-001` | Static architecture/model documents show hosted foundation model use with no training or fine-tuning | `FAIL`; test decision `NOT_REQUIRED`; implementation absent |
| `AC-002` | Authorized Release A application tests and release audit cover grounded Ask and zero mutation | `TEST_PROPOSAL` |
| `AC-003` | Authorized Release B state-transition tests prove review controls and zero business mutation | `TEST_PROPOSAL` |
| `AC-004` | Authorized Rivera command tests prove exact records, totals, receipt, and replay | `TEST_PROPOSAL` |
| `AC-005` | Application tests prove browser/model/provider prose never becomes authority | `TEST_PROPOSAL` |
| `AC-006` | Reload/revision/execute-contract tests prove server-owned canonical plans | `TEST_PROPOSAL` |
| `AC-007` | Domain and failure-path tests prove atomic business records plus canonical sidecars | `TEST_PROPOSAL` |
| `AC-008` | Release-profile and permission matrix tests prove independent enforcement layers | `TEST_PROPOSAL` |
| `AC-009` | Adapter/failure tests prove one provider adapter and no silent fallback | `TEST_PROPOSAL` |
| `AC-010` | Separate application test report and sanitized model-eval report | `TEST_PROPOSAL` |

## Release Gate

Each release is independently reviewable and independently enableable.

`UNIT-004`, `UNIT-005`, and `UNIT-006` produce the Release A, B, and C evidence
packets and go/no-go records respectively. `UNIT-007` reconciles them and adds
the separate model evaluation; it does not postpone the first review of A or B.

Release N does not inherit live readiness from Release N-1. Before enabling any
release:

1. re-read current provider and Gateway controls;
2. revalidate current source paths, auth, flags, migrations, and domain
   invariants;
3. obtain authorization for the exact test/model/browser/deployment boundary
   being crossed;
4. collect the release's decisive evidence;
5. record the exact provider/model/evaluation revision;
6. confirm the effective release profile and cohort configuration;
7. confirm the master kill switch;
8. confirm no later-release capability is exposed; and
9. complete a rollback/disable readback.

Until that evidence exists, this plan pack remains:

- implementation: `NOT_STARTED`;
- package: `CONDITIONALLY_READY`;
- release: `BOUNDARY`;
- next unit: `UNIT-001`; and
- ready slice: `UNIT-001` only.
