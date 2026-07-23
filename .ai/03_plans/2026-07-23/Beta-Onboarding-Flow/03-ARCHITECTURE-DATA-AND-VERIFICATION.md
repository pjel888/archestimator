# Architecture, Data, Security, and Verification Contract

## System Boundary

```text
WorkshopShell                                           Server Component
├─ AuthenticatedOnboardingHost                          Server Component
│  └─ OnboardingClientBoundary                          tiny Client Component
│     └─ OnboardingTourClient                           dynamic, ssr:false
│        ├─ flow eligibility and semantic resume
│        ├─ route/readiness coordinator
│        ├─ typed target resolver
│        ├─ uncontrolled useJoyride runtime
│        ├─ custom tooltip/portal
│        └─ server-action persistence adapter
├─ shared desktop/mobile navigation
├─ route content with semantic targets
└─ Settings / Support
```

Rules:

- `WorkshopShell` remains a Server Component.
- The global provider tree does not import Joyride.
- `OnboardingClientBoundary` is the smallest always-available client surface.
- It renders the dynamic runtime only for automatic eligibility or an
  allowlisted explicit launch intent.
- `next/dynamic({ ssr: false })` lives inside the Client Component, consistent
  with installed Next.js 16 guidance.
- The server supplies a minimum serializable snapshot; no client fetch-on-mount
  is added.

## Proposed Source Layout

```text
src/lib/onboarding/
  activation-*.ts                       existing business activation
  activation-origin.ts                 closed trusted-origin vocabulary
  starter-pack.ts                       closed versioned starter manifest
  starter-pack-actions.ts               install/restore/user organization
  guided-sample.ts                      tutorial subset and practice manifest
  guided-sample-actions.ts              server-only create/fresh-copy/archive
  estimate-practice.ts                  closed practice/transfer predicates
  client-link-learning.ts               verified publication lesson receipts
  flow-types.ts                         shared semantic vocabulary
  flow-catalog.ts                       versioned flow/step definitions
  target-catalog.ts                     typed target keys and helpers
  flow-eligibility.ts                   pure server/client-safe filtering
  flow-repository.ts                    all D1 instructional SQL
  flow-actions.ts                       authenticated commands
  flow-retention.ts                     export/erase/purge integration
  support-context.ts                    strict support allowlist

src/components/onboarding/
  AuthenticatedOnboardingHost.tsx       server snapshot
  OnboardingClientBoundary.tsx          conditional dynamic loader
  OnboardingTourClient.tsx              useJoyride runtime
  OnboardingTooltip.tsx                 accessible custom tooltip
  onboarding-route-coordinator.ts       allowlisted route/readiness logic
  onboarding-target-resolver.ts         semantic target lookup
  onboarding-launch-intent.ts           typed URL/client launch parsing
  estimate-target-adapter.ts            narrow virtualization owner adapter
  OnboardingRecovery.tsx                Retry/Skip/Exit/Support
  GettingStartedProgress.tsx            shared status/checklist UI

src/components/ui/overlays/
  modal-lifecycle.ts                    shared opening/restored subscription

src/app/workshop/getting-started/
  page.tsx
  loading.tsx
  error.tsx

src/components/workshop/settings/
  GuidanceToursSettings.tsx             Settings status/actions

migrations/
  0101_beta_onboarding_flow_state.sql
```

The starter/tutorial integration also changes the existing activation producers in
`src/lib/projects/actions.ts`, `src/lib/estimates/actions.ts`,
`src/lib/estimates/d1-intents/nodes.ts`, and
`src/lib/estimates/d1-intents/rows.ts`, plus Project grouping and the persistent
Library writers in `src/lib/workshop/group-actions.ts`,
`src/lib/component-library/actions.ts`,
`src/lib/component-library/folder-mutation-d1.ts`, and
`src/lib/repositories/component-library-repository.ts`. Public action
entrypoints hard-code the normal origin; only the fixed starter-pack
entrypoints may pass starter/tutorial origins into server-only intents. No
serialized action input accepts an arbitrary origin class.
`activation-producer-contract.ts` remains the read-only
milestone-to-`source` validator; origin is applied only after that validation
inside the server-only outbox boundary.

These paths are the canonical first implementation locations. If revalidation
finds an already-existing module with the exact responsibility, stop the
affected unit and update its owned-path contract before editing; do not silently
relocate the work or create a duplicate abstraction.

## Shared Type Contract

```ts
type OnboardingFlowKey =
  | "core_orientation"
  | "collaborator_orientation"
  | "first_estimate_value"
  | "guided_estimate_practice"
  | "estimate_reader_orientation"
  | "library_reuse"
  | "client_link_publishing";

type OnboardingFlowStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "dismissed";

type OnboardingViewport = "mobile" | "desktop";

type OnboardingLaunchMode =
  | "auto"
  | "start"
  | "resume"
  | "replay"
  | "restart"
  | "task"
  | "settings"
  | "migration"
  | "system";

type OnboardingEventSource =
  | "server_eligibility"
  | "joyride_runtime"
  | "user_command"
  | "starter_seed"
  | "tutorial_seed"
  | "tutorial_practice"
  | "non_starter_domain"
  | "publication_domain"
  | "migration"
  | "system";

type ActivationOriginClass =
  | "user_domain"
  | "starter_seed"
  | "tutorial_seed";

type ActivationPath =
  | "guided_sample"
  | "workspace_template"
  | "blank"
  | "starter_reference"
  | "starter_sandbox";

type OnboardingEventType =
  | "eligibility_observed"
  | "state_imported"
  | "flow_started"
  | "flow_resumed"
  | "flow_replayed"
  | "flow_paused"
  | "step_shown"
  | "step_completed"
  | "step_skipped"
  | "flow_completed"
  | "flow_dismissed"
  | "flow_restarted"
  | "starter_pack_installed"
  | "starter_pack_partial"
  | "starter_asset_restored"
  | "starter_group_reconciled"
  | "sample_generated"
  | "sample_fresh_copy_created"
  | "sample_archived"
  | "practice_action_completed"
  | "practice_completed"
  | "independent_transfer_observed"
  | "all_guidance_reset"
  | "target_not_found"
  | "route_unavailable"
  | "support_opened"
  | "flow_error";

type OnboardingReasonCode =
  | "user_skip"
  | "user_close"
  | "escape_key"
  | "app_modal_opened"
  | "target_not_applicable"
  | "target_timeout"
  | "route_not_ready"
  | "capability_changed"
  | "resource_unavailable"
  | "starter_pack_install_failed"
  | "sample_seed_failed"
  | "sample_generation_changed"
  | "practice_state_changed"
  | "publication_verification_pending"
  | "publication_proof_missing"
  | "publication_proof_expired"
  | "publication_binding_mismatch"
  | "publication_replaced"
  | "clipboard_unavailable"
  | "viewport_changed"
  | "definition_changed"
  | "persistence_unavailable";
```

Keep route, capability, target, and source vocabularies equally closed. Do not
accept arbitrary strings from the client. Existing `ActivationSource`
(`project`, `estimate`, and the other producer families) remains unchanged;
`ActivationOriginClass` is a separate dimension that says whether the domain
mutation was ordinary user/domain work, fixed shared starter seeding, or fixed
tutorial seeding.

`prepareActivationOutboxIntent` defaults every existing validated producer to
`user_domain`, so unrelated invitation/publication/export producers do not
need churn. Distinct server-only starter and tutorial helpers require opaque
closed-manifest capabilities and write `starter_seed` or `tutorial_seed`.
Neither helper accepts origin from the producer's serialized business payload.
Outbox reconciliation always appends the classified event, but calls the
`beta_activation_progress` upsert only for `user_domain`; seed-origin delivery
acknowledges the outbox without touching the projection.

## Flow Definition Contract

```ts
type OnboardingFlowDefinition = {
  key: OnboardingFlowKey;
  version: number;
  autoStart: "never" | "first_eligible_session";
  reenrollment: "manual_only" | "incomplete_only";
  audience: readonly OnboardingAudienceRule[];
  steps: readonly OnboardingStepDefinition[];
};

type OnboardingStepDefinition = {
  key: OnboardingStepKey;
  target: OnboardingTargetKey | "center";
  route: OnboardingRouteIntent | null;
  viewports: readonly OnboardingViewport[];
  requires: readonly OnboardingCapability[];
  dataPredicate: OnboardingDataPredicate | null;
  optional: boolean;
  interaction: "passive" | "handoff_to_target";
  missingTarget: "skip" | "pause_with_recovery" | "stop";
  content: OnboardingContentKey;
};
```

### Definition invariants

1. Flow key + version is unique.
2. Step key is unique within a flow/version.
3. Every target exists in the typed target catalog.
4. Every non-centered step declares viewport applicability.
5. Every route intent is allowlisted.
6. Optional steps may skip; essential steps cannot silently advance.
7. `handoff_to_target` closes/pauses the alertdialog before app interaction.
8. No definition stores raw resource IDs, selectors, URLs, or copy in D1.
9. Eligible filtering is deterministic for the same snapshot.
10. Filtering never leaves a “Next” transition to a removed step.

## Starter Workspace and Tutorial Practice Contract

### Closed starter and tutorial identity

The starter pack is a versioned source manifest, not a D1-authored workflow.
Every manifest key declares `workspace` or `user` scope. The asset identity is:

```text
workspace_id + starter_pack_version + scope_kind + scope_owner_id
+ starter_asset_key + starter_generation
```

Workspace-scoped Tutorial/Reference/Sandbox Projects, the two custom Component
folders, Components, and Templates install once. User-scoped **Starter
Examples** group and memberships install for each eligible editor without
duplicating the shared workspace assets. The protected default
**Uncategorized** folder is resolved/ensured through the existing
`is_default_category = 1` Library invariant and is never starter-claimed.

The shared Tutorial is the canonical editable exemplar, not a user's guided
practice binding. On an explicit Guided tutorial command, the server creates or
resumes one normal workspace `Practice — Residential Fit-Out` Project from the
immutable tutorial manifest, never by cloning the possibly edited shared
record. That Project is outside starter-pack cardinality, is visible under
ordinary workspace Project access, and uses this additional active identity:

```text
workspace_id + created_by + tutorial_version + tutorial_generation
```

Entity metadata records only closed starter/tutorial identity and
classification fields. The polymorphic starter-asset claim ledger supplies
identity for Project groups/folders that lack metadata. Every generated
Project/Estimate/Tab/Area/Row/Component/Template carries enough server-owned
metadata or a claim to resolve its manifest key without relying on names,
copy, or arbitrary client input.

Starter-pack version `1` creates exactly:

- three shared Projects: one Tutorial, one Reference, and one Sandbox;
- four Estimate Sheets total: one Tutorial, two Reference, and one Sandbox;
- one per-user **Starter Examples** Project group containing Tutorial and
  Reference through exactly one group claim plus two membership claims, while
  Sandbox has no membership and renders Ungrouped; a later practice membership
  is ordinary user organization outside starter readiness;
- the Tutorial's one parent plus three child Areas and three-to-five purposeful
  Rows, including the priced example, incomplete practice Row, and
  project-specific source Row;
- six persisted workspace Components across created/claimed custom folders
  `Starter — Finishes` and `Starter — Fixtures & Services`, plus one Component
  parented to existing protected `Uncategorized` resolved by
  `is_default_category = 1`; at least one Component has two variants; and
- three persisted workspace Templates categorized as `Residential Rooms` or
  `Exterior + Site`.

The three Template blueprints may be consolidated from the existing
`estimateTemplates` fixture, but runtime reads must return D1-backed records.
The large `sampleEstimateTree` fixture is never copied. Every price is a
clearly labeled learning allowance with a review date, not a current quote.

The names above are canonical clean-workspace display names, never identity.
The installer never adopts or overwrites an unclaimed user asset because its
name matches. During explicit add or restore, a same-scope name collision uses
the lowest available deterministic manifest-owned display suffix:
`<canonical name> · Starter`, then `<canonical name> · Starter 2`, and so on.
The closed asset claim still carries the canonical manifest key, the UI keeps a
Starter label, and later restore/organization resolves by claim rather than the
possibly user-renamed display name.

The expanded curriculum increments the current
`GUIDED_SAMPLE_VERSION = 1` fixture to tutorial version `2`. Existing v1
Projects are recognized only by their server-owned
`activation_sample_version`/`activation_sample` metadata. They are never
reshaped in place or inferred by name; starting v2 archives the marked v1
Project first and creates the closed v2 tutorial generation. Starter-pack
restore increments only an inactive asset's `starter_generation`. Inactive
means the key has no active claim/resource graph and its latest claim is
`missing` or `archived`; restore never overwrites a surviving edited asset or
changes the current tutorial binding.

### Seed-versus-practice invariant

Starter installation may reuse existing domain integrity primitives, but it
runs only through fixed server manifest capabilities. The existing activation
`source` continues to identify the producer family (`project` or `estimate`);
the new activation `origin_class` is `tutorial_seed` for an explicitly created
per-user practice graph and `starter_seed` for the shared
Tutorial/Reference/Sandbox graphs. Public
project/estimate mutations hard-code `user_domain`, and starter actions accept
no client-supplied origin, pack/tutorial version, generation, asset key, or seed
shape. Component/Template/folder/group creation is also restricted to closed
manifest keys and recorded in the starter-asset ledger.

If normal domain integrity writes produce `first_area_created`,
`first_row_priced`, or `first_valid_total` activation records while seeding,
those records remain explicitly tutorial-origin in both outbox and event
tables; Reference/Sandbox activation records remain starter-origin. Neither can
complete priced-row/valid-total checklist value, `guided_estimate_practice`,
Library reuse, independent activation/transfer, or suppress the required
lessons. Starter/tutorial Project or Estimate generation, existence, route
visits, and opens also complete nothing. A later successfully persisted action
from the closed Project/Estimate operation set below is `user_domain` activity
and may establish the authorized Project/Estimate context plus its matching
checklist fact. Installation records
`starter_pack_installed` or `starter_pack_partial`; the tutorial subset records
`sample_generated` in `beta_onboarding_flow_events` with the server-resolved
tutorial version/generation and preserves classification end to end.

Normal later editor mutations remain normal domain mutations. Practice
completion requires:

```text
same authorized tutorial generation
+ user-origin changed quantity or unit cost
+ changed computed Row total
+ authoritative saved state
+ user-origin Row creation or Component insertion/reuse
```

No Joyride callback, route visit, seed receipt, positive precomputed total, or
client-supplied completion flag may substitute for those facts.

`guided_estimate_practice` state stores the active `tutorial_version` and
`tutorial_generation` independently from instructional `generation`. Every
sample/practice event stores the same binding. The completion evaluator accepts
only `tutorial_practice` events matching the state row's current binding;
events from archived or stale tutorial generations remain audit history only.
Independent transfer additionally requires `non_starter_domain` source and a
server-resolved Project with no active starter-asset claim or starter/tutorial
metadata.

### Recovery and lifecycle

- Migration `0101` adds starter-pack state/asset-claim tables plus unique
  Project expression indexes for the closed
  tutorial identity and for one active tutorial kind per
  `workspace_id + created_by`. Legacy v1 metadata is outside those v2 indexes.
- A new workspace installs immediately after successful workspace creation.
  A pre-existing workspace auto-installs only when the closed
  `isStarterAutoInstallEligible` predicate finds zero workspace rows in
  `projects`, `cost_library_items`, `estimate_templates`, and `project_groups`,
  plus zero `library_folders` rows where `is_default_category = 0`. Existing
  protected default `library_folders` rows where `is_default_category = 1` are
  ignored. This is the complete onboarding predicate, not generic workspace
  emptiness. A non-empty existing workspace requires explicit **Add starter
  content**; installation never silently merges into it.
- Eligibility is state-first. An existing current-version workspace state in
  `installing`/`partial` resumes unresolved closed claims without rerunning the
  emptiness predicate; `complete` is a shared no-op. Valid closed claims with a
  missing state recover into `partial`. Only absence of both current-version
  state and claims reaches the new/pre-existing emptiness decision, so the
  installer's own partial writes cannot misclassify recovery as a non-empty
  explicit-add path.
- The installer marks workspace scope `complete` only after every required
  workspace claim resolves to authoritative resources. Current-user readiness
  additionally requires that user's exact group/membership scope at the current
  shared membership revision. A partial scope remains resumable and is never
  advertised as ready.
- Shared Tutorial/Reference/Sandbox/Component/custom-folder/Template keys have
  workspace scope. Joining users never rerun shared auto-install: when the
  workspace state is complete, a server-authorized workspace-level user with
  Projects-collection/grouping capability receives only per-user
  group/membership keys. Project-only and direct-estimate collaborators have no
  user starter-organization scope. When shared state is absent in a non-empty
  workspace, an owner/manager gets the explicit add action.
- Explicit restore recreates only inactive manifest keys whose latest claim is
  `missing` or `archived`, with `starter_generation + 1`; it preserves
  surviving edits/identities and does not auto-run at login.
- First creation claims tutorial version `2`, generation `1` through the
  guided-practice state row and Project uniqueness in one checked D1 batch.
- Reopen returns the compatible existing sample. Concurrent creators that lose
  the state/unique-index race reread and return the same winner.
- Restarting or resetting a lesson changes instructional `generation` only;
  it preserves the active tutorial binding and matching practice facts.
- Fresh-practice copy requires the expected state revision and expected
  tutorial binding. One checked D1 batch archives the old tutorial Project,
  compare-and-set increments `tutorial_generation`, creates the new Project,
  and restarts guided practice. A stale/concurrent loser creates nothing and
  returns the server-confirmed winner.
- Old-generation practice receipts never satisfy the newly bound copy; fresh
  generation `N+1` starts with no matching practice predicates.
- Fresh copy never edits or deletes old Rows in place.
- Archive is an explicit project action and is not part of guidance reset.
- Privacy export/erase, account deletion, project deletion, retention, and
  legal-hold behavior cover the starter state/claims plus existing business and
  instructional ownership.
- Non-starter transfer is derived only from current authorized domain facts in
  a Project with no starter claim or starter/tutorial metadata.

## Client Links Learning Contract

`client_link_publishing` is ordinary instructional state. It has no tutorial
version/generation binding and adds no publication, recipient, token, or URL
columns. The server bridges existing publication behavior into sanitized
lesson facts through `client-link-learning.ts`.

Core completion is:

```text
current authenticated publication manager
+ current authorized project with at least one resolved Estimate Sheet
+ successful create or republish action
+ post-save refetch verifies publication identity, non-empty selected scope,
   published status, and client-link availability
+ explicit copy success, selectable-link fallback acknowledgement,
   or authenticated Preview launch against that verified publication
```

Those facts are not joined from two generic lesson events. A project-A
publish event plus a project-B copy/Preview event must never complete the
flow.

### Atomic same-publication correlation

In guide mode, `client-link-learning.ts` wraps the existing create/republish
action without duplicating publication logic:

1. validate the active server-issued `run_id`, flow version, expected state
   revision, authenticated user, workspace, and publication-manager
   capability;
2. call the existing create/republish action;
3. after success, reauthorize and reread the exact current publication,
   non-empty resolved Estimate scope, published status, and link availability;
4. return the normal product result plus a short-lived
   `ClientLinkLearningReceipt` held only in current client memory; and
5. do not persist `scope_and_publish` as core-complete.

The receipt contains only version, active `run_id`, flow version, expected
state revision, action kind, issue/expiry times, and a server-generated
`binding_digest`. The digest is a domain-separated HMAC over the authenticated
user, workspace, input Project, reread current publication, action kind,
active run, revision, and expiry. Raw Project/publication identifiers are HMAC
inputs only and never appear in the receipt. Use the existing server-only auth
secret through a dedicated purpose label; never reuse the public publication
token/hash/encryption keys. The receipt grants no publication access and is
never stored in D1, URL/query state, cookies, browser storage, logs,
diagnostics, analytics, or Support context. Reload/route loss discards it and
truthfully resumes at `scope_and_publish`.

After browser-confirmed copy success, selectable-link fallback acknowledgement,
or before authenticated Preview navigation, one consume command receives the
normal Project action input, expected flow revision, and receipt. In one
server-owned decision it:

1. reauthenticates and reauthorizes the current publication manager;
2. rereads that Project's current publication and non-empty scope;
3. verifies published/link-available state;
4. recomputes and constant-time compares the receipt against that exact
   current publication, active run, user, workspace, revision, action, and
   expiry; and
5. conditionally advances the flow and appends one sanitized
   `publication_domain` completion event through the normal revision/idempotency
   batch.

Receipt expiry, replacement/republish after issuance, cross-user/workspace,
project-A/project-B interleaving, tampering, stale revision, and replay after a
winning completion are rejected. No generic `scope_and_publish` plus
`verify_and_share` event join can substitute for this atomic bridge.

The adapter may accept a project identifier as normal action input, but it
reauthorizes it through the existing publication-manager boundary and persists
only:

- flow/version/generation;
- semantic lesson/step key;
- source `publication_domain` or `user_command`;
- bounded route key `publisher` or `publisher_preview`;
- outcome/reason code; and
- timestamp/revision/idempotency fields already allowed by the flow schema.

It never persists or logs the project/publication/recipient identifier, public
token, client-link URL, selected Estimate IDs, client name, password, recipient
email, or snapshot content.

The core evaluator rejects:

- roster selection, route visits, tooltip views, and client-supplied
  completion;
- no-op/failed create or republish;
- zero resolved Estimate Sheets;
- `verificationPending`, load failure, or stale post-save data;
- an unauthorized or capability-changed project;
- copy/preview intent with no currently verified publication; and
- missing, expired, tampered, stale, replaced, cross-user/workspace, or
  cross-project learning receipt;
- public `/share/[token]` activity.

Recipients/activity, stale-snapshot republish, expiry recovery, Replace link,
Turn off link, and legacy-to-Portal migration remain optional lessons.
Recipient email and destructive actions are never invoked by onboarding. If
the user invokes them through normal product controls, existing publication
authorization, confirmation, rate-limit, email, audit, and revalidation
contracts remain authoritative. The learning adapter records only a sanitized
semantic success/failure after server readback.

Republish issues a new URL. Replace link invalidates the current URL
immediately while preserving publication-row recipient history; Turn off link
invalidates the current URL and recipient links. The safety lesson explains
those consequences but can complete without either mutation.

## Semantic Target Contract

### Rendering helper

Use one helper so literal attributes do not drift:

```ts
function onboardingTarget(
  target: OnboardingTargetKey,
): { "data-onboarding-target": OnboardingTargetKey };
```

### Resolver

```ts
function resolveOnboardingTarget(
  key: OnboardingTargetKey,
): HTMLElement | null;
```

The resolver constructs only the controlled attribute selector. It rejects
unregistered values and never accepts a selector from a URL, event, database,
or server action.

### Virtualized target adapter

Only a target owner may register an adapter:

```ts
type OnboardingVirtualTargetAdapter = {
  prepare(input: {
    target: OnboardingTargetKey;
    signal: AbortSignal;
  }): Promise<HTMLElement | null>;
};
```

For an estimate row, `prepare` must:

1. use a server-authorized/current in-memory row identity;
2. select and expand through estimate state APIs;
3. scroll through the virtualization owner;
4. return the mounted semantic target;
5. abort on route/unmount/timeout; and
6. never query a tenant UUID from a selector.

The first release registers a virtual adapter only for the known estimate-row
target required by `first_estimate_value`. Hierarchy, toolbar, pricing, total,
and save steps use stable non-row targets.

### Rendering-owner matrix

Every target is added by the component that owns its semantics:

| Target family | Owner | Readiness/recovery |
| --- | --- | --- |
| `estimate.header`, `estimate.tab`, `estimate.hierarchy`, `estimate.add_area` | `EstimateWorkspaceClient`, `EstimateTabStrip`, `EstimateSheetTree` | Re-resolve authorized route/Tab; owner selects/expands Area; pause on capability or modal change. |
| `estimate.add_row`, `estimate.library`, `estimate.price_input`, `estimate.row_math` | `EstimateSheetContent`, source/picker owner, `row-table.tsx` | Handoff before interaction; known Row uses bounded virtual adapter; no arbitrary selector or row ID. |
| `estimate.total`, `estimate.save_state` | `ProjectTotalHeader` and row mutation owner | Advance only after authoritative readback; dirty/saving/failed state pauses with recovery. |
| `publisher.roster`, `publisher.filters`, `publisher.create` | `PublisherRosterClient` | Handle empty/filter/no-permission/mobile states without false completion. |
| `publisher.drawer`, `publisher.status`, `publisher.link`, `publisher.preview`, `publisher.recipients`, `publisher.activity` | `PublisherDrawer`, `ShareLinkDisplay`, recipient/activity owners | Pause before Drawer/confirmation focus; require a current authorized verified publication where applicable. |
| `publisher.wizard`, `publisher.wizard_estimates`, `publisher.wizard_client`, `publisher.wizard_access`, `publisher.wizard_save_state` | `ShareWizard` and `SheetPickerList` | Pause tooltip before wizard; resume only after cancel/focus restoration or verified save refetch. |

Target definitions use the typed `data-onboarding-target` helper even when a
legacy `data-publisher-*` or aria label remains for product/testing semantics.
Existing implementation anchors are not silently promoted into the closed
catalog.

## Joyride Runtime Contract

### Configuration

```ts
useJoyride({
  steps,
  continuous: true,
  initialStepIndex: resumeIndex,
  portalElement: workshopPortal,
  targetWaitTimeout,
  tooltipComponent: OnboardingTooltip,
  options: {
    showProgress: true,
    skipBeacon: true,
    blockTargetInteraction: true,
    dismissKeyAction: "close",
  },
});
```

Exact option names must be confirmed against the installed v3 types after
dependency installation. Per-step interaction policy may override
`blockTargetInteraction`.

### Event mapping

| Joyride event | Application behavior |
| --- | --- |
| `tour:start` | Persist `flow_started`/`flow_resumed`/`flow_replayed` once. |
| `step:before` | Record semantic `step_shown` only after target is ready. |
| `step:after` | Validate direction/action; persist completed/skipped semantic transition. |
| `tour:end` + finished | Complete state only for normal start/resume/restart, not replay. |
| Close action or Escape origin | Persist current semantic step and `flow_paused`; keep durable state `in_progress`. |
| Explicit Skip / Don't show again | Set durable `dismissed`; replay ends without regressing canonical completion. |
| Programmatic `controls.stop()` | Mark the run paused with a typed reason and suppress close/dismiss handling for that event cycle. |
| `tour:status` paused | Reconcile runtime only; never infer dismissal. |
| `error:target_not_found` | Apply definition recovery policy and sanitized reason. |
| `error` | Stop/pause, preserve last server state, expose Support. |

Event subscribers always unsubscribe. React Strict Mode must not duplicate
server mutations. The adapter reads the v3 event `type`, action, origin, and
status together; no single field is treated as a durable transition.

### Numeric-index boundary

Numeric indices are transient:

```text
persisted semantic step
  → filter current eligible steps
  → find index
  → start Joyride
  → receive event
  → resolve next semantic step
  → persist semantic transition
```

If a persisted step no longer exists:

1. look up the definition’s explicit compatibility mapping;
2. otherwise choose the next incomplete compatible step;
3. otherwise mark the flow completed/imported;
4. record `definition_changed`; and
5. never resume at an arbitrary numeric position.

## Launch Intent Contract

Settings and Getting started may navigate with an allowlisted query:

```text
?tour=<flow-key>&mode=<start|resume|replay|restart>
```

Rules:

- parser accepts only known flow keys and modes;
- server action authorizes eligibility before launch;
- no user/workspace/resource identity appears in the query;
- the client removes the launch parameters with `replace` after one accepted
  start while preserving unrelated safe parameters;
- refresh/back must not restart a consumed intent; and
- dynamic route IDs come from the server snapshot, not query input.

Use this query contract as the only cross-route launch channel. Do not add a
global event bus or a second launch-intent mechanism.

## Post-Auth Return Intent

Current auth carries `next` but discards most values. Implementation must
preserve safe authenticated return intent before auto-starting guidance:

- accept only same-origin relative paths under protected `/workshop` or
  `/admin`, plus the existing pending-invite path;
- cap the decoded value length;
- strip fragments;
- preserve query parameters only after rejecting nested `next` and sensitive
  key names such as token, code, secret, email, and password;
- reject protocol-relative, external, auth-loop, token-bearing public, and
  malformed paths;
- carry the same sanitized value through login, OAuth/magic-link callback,
  closed-beta/account setup, and terms acceptance;
- re-run authorization at the destination;
- fall back to `/workshop`; and
- let route-local/collaborator guidance adapt to the actual destination.

Do not make a Joyride route transition a substitute for correct auth return
behavior. Server requests never receive browser fragments; any caller-supplied
fragment is discarded rather than reconstructed.

## D1 Schema Contract

### Fix-forward activation rebuild in `0101`

`0101_beta_onboarding_flow_state.sql` has four responsibilities: repair the
activation lifecycle FKs, add a trusted activation-origin dimension, create
starter-pack install/asset claims, and create instructional state plus the
tutorial uniqueness indexes. Before
creating instructional tables, it rebuilds these four issued tables:

```text
beta_activation_progress
beta_activation_events
beta_activation_outbox
beta_activation_retention_holds
```

The rebuild preserves every events/outbox/hold row, every progress identity and
user-control field, every milestone/source/state CHECK, every unique
constraint, and every current index name. It does **not** add
`estimate_created` or change the existing `source` producer taxonomy. After
origin backfill, it deterministically recomputes only the derived progress
fields (`project_id`, `estimate_id`, `last_milestone`,
`first_value_completed_at`, and `last_event_at`) from `user_domain` events so
legacy tutorial-generated value cannot remain in the real activation
projection. `selected_path`, checklist dismiss/reopen, support state, row
identity, and lifecycle timestamps are preserved. The existing
`selected_path` CHECK expands only with `starter_reference` and
`starter_sandbox`; `workspace_template` covers starter and later user-created
Templates. The only new activation column is required `origin_class` on
`beta_activation_events` and `beta_activation_outbox`:

```sql
origin_class TEXT NOT NULL
  CHECK (origin_class IN ('user_domain', 'starter_seed', 'tutorial_seed'))
```

`beta_activation_progress` remains the user-domain business-activation
projection; seed-origin delivery inserts the auditable event but never executes
the progress upsert. It is not accepted as proof of tutorial practice or
independent transfer. New public domain producers hard-code `user_domain`; the
fixed tutorial producer writes `tutorial_seed`, the fixed shared-starter
producer writes `starter_seed`, and delivery copies either unchanged to the
event ledger. The field is never read from `FormData`, JSON, URL state, or
another serialized client argument.

Existing event/outbox rows with a non-null `project_id` that joins a Project
marked by server-owned `activation_sample=1` or
`activation_sample_version` metadata backfill to `tutorial_seed`; every other
legacy row backfills to `user_domain`. This uses Project metadata, never names.
There are no historical `starter_seed` rows before this migration; later
Reference/Sandbox writes receive that origin only from the closed installer.
Legacy workspace-only rows without a Project pointer remain `user_domain`;
they cannot satisfy guided practice, and independent transfer still requires a
Project with no starter/tutorial claim or metadata.

The remaining activation schema changes are limited to lifecycle-safe foreign
keys:

- progress/events/outbox `workspace_id` references `workspaces(id) ON DELETE
  CASCADE`;
- retention holds reference `workspaces(id) ON DELETE RESTRICT`;
- `user_id` remains a required validated identity value but no longer depends on
  `workspace_members`;
- nullable project and estimate references use their globally unique primary
  keys with `ON DELETE SET NULL`, so deleting business resources cannot be
  blocked by historical activation pointers; and
- server write validation still enforces the user/workspace/resource chain.

The migration follows the repository rebuild pattern:

1. create `__0101_assertion` and its abort trigger;
2. create four `__0101` replacement tables with the full final schemas;
3. copy every event/outbox/hold column explicitly, derive the closed
   `origin_class` backfill above, preserve each progress identity/control field,
   and recompute its derived milestone/resource/timestamp projection only from
   copied `user_domain` events;
4. assert source/destination row counts independently for all four tables;
5. run `pragma_foreign_key_check` before replacement;
6. drop originals, rename replacements, and recreate exactly these activation
   indexes:
   `idx_beta_activation_progress_milestone_event`,
   `idx_beta_activation_events_user_workspace_occurred`,
   `idx_beta_activation_events_milestone_occurred`,
   `idx_beta_activation_outbox_state_next_attempt`,
   `idx_beta_activation_outbox_lease_expires`, and
   `idx_beta_activation_retention_holds_active`;
7. create the two starter-install tables and two instructional tables plus
   indexes below;
8. add two partial expression indexes on Projects:
   `idx_projects_tutorial_identity_v2` uniquely covers
   `workspace_id + created_by + tutorial_kind + tutorial_version +
   tutorial_generation`, including archived copies, and
   `idx_projects_active_tutorial_owner_v2` uniquely covers
   `workspace_id + created_by + tutorial_kind` where Project status is not
   `archived`; both apply only to closed
   `tutorial_kind='estimate_sheet_foundations'` metadata;
9. run the row-count assertions and `pragma_foreign_key_check` again; and
10. remove assertion infrastructure only after all checks pass.

Any failed assertion aborts the migration. If an issued apply later needs
repair, add the next migration; never edit `0101` after deployment.

### `beta_starter_pack_states`

```sql
CREATE TABLE beta_starter_pack_states (
  workspace_id TEXT NOT NULL,
  pack_version INTEGER NOT NULL CHECK (pack_version > 0),
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('workspace', 'user')),
  scope_owner_id TEXT NOT NULL CHECK (length(trim(scope_owner_id)) > 0),
  CHECK (scope_kind = 'user' OR scope_owner_id = workspace_id),
  status TEXT NOT NULL
    CHECK (status IN ('installing', 'complete', 'partial')),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  shared_membership_revision INTEGER NOT NULL DEFAULT 0
    CHECK (shared_membership_revision >= 0),
  installed_at TEXT,
  last_restored_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (
    workspace_id, pack_version, scope_kind, scope_owner_id
  ),
  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);
```

Workspace scope uses `scope_owner_id = workspace_id`; user scope uses the
authenticated user ID. The workspace row tracks shared
Tutorial/Reference/Sandbox, the two custom folders, Components, and Templates.
Each workspace-level user with server-derived
Projects-collection/grouping capability has a separate user row for their
**Starter Examples** group/memberships. Their starter workspace is ready only
when the workspace row plus their exact group-and-two-membership user scope are
`complete`. Project-only and direct-estimate collaborators have no user row and
treat workspace starter readiness as not applicable to their
assigned-resource onboarding.

Each row is a resumable projection, not proof that resources exist. `complete`
requires a server readback of every required claim in that scope and its
authoritative resource graph. An interrupted asset batch leaves only the
affected scope `partial`; retry resumes unresolved keys rather than deleting
successful assets. This prevents a joining user's incomplete group/membership
setup from downgrading or falsely reusing the shared workspace status.

`shared_membership_revision` closes the dependency between workspace-scoped
Tutorial/Reference Project generations and user-scoped memberships. The
workspace row stores the current dependency revision. A user row stores the
revision for which its exact two shared-Project memberships were resolved.
Initial install sets both to `1`. Joining-user organization starts at the
current workspace revision. A user's readiness additionally requires equality
with the workspace revision.

### `beta_starter_asset_claims`

```sql
CREATE TABLE beta_starter_asset_claims (
  workspace_id TEXT NOT NULL,
  pack_version INTEGER NOT NULL CHECK (pack_version > 0),
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('workspace', 'user')),
  scope_owner_id TEXT NOT NULL CHECK (length(trim(scope_owner_id)) > 0),
  CHECK (scope_kind = 'user' OR scope_owner_id = workspace_id),
  asset_key TEXT NOT NULL CHECK (length(trim(asset_key)) > 0),
  asset_kind TEXT NOT NULL CHECK (
    asset_kind IN (
      'project', 'project_group', 'project_group_membership',
      'component_folder', 'component', 'template'
    )
  ),
  starter_generation INTEGER NOT NULL CHECK (starter_generation > 0),
  resource_id TEXT NOT NULL CHECK (length(trim(resource_id)) > 0),
  lifecycle_state TEXT NOT NULL
    CHECK (lifecycle_state IN ('active', 'archived', 'missing')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (
    workspace_id, pack_version, scope_kind, scope_owner_id,
    asset_key, starter_generation
  ),
  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);
```

Required indexes:

```text
UNIQUE (workspace_id, pack_version, scope_kind, scope_owner_id, asset_key)
  WHERE lifecycle_state = 'active'
UNIQUE (workspace_id, pack_version, asset_kind, resource_id)
  WHERE lifecycle_state = 'active'
(workspace_id, pack_version, asset_kind, lifecycle_state)
(workspace_id, scope_kind, scope_owner_id, lifecycle_state)
```

`resource_id` is intentionally polymorphic, so no cross-table FK is claimed.
The server validates `asset_kind` against the expected table and closed
manifest before accepting a claim. Workspace scope uses `scope_owner_id =
workspace_id`; user scope uses the authenticated user ID. Project-group
identity comes from this ledger because `project_groups` has no metadata
column. Deletion/archive hooks mark claims `missing`/`archived`; they never
trigger automatic recreation. Either state means the key is inactive and
absent from the active manifest. A restore batch claims generation `N+1` only
for an inactive key and never changes a surviving active claim. The protected
default **Uncategorized** folder has no starter claim; only its child
`General Labor Allowance` Component is claimed.

### `beta_onboarding_flow_states`

```sql
CREATE TABLE beta_onboarding_flow_states (
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL,
  flow_key TEXT NOT NULL,
  flow_version INTEGER NOT NULL CHECK (flow_version > 0),
  generation INTEGER NOT NULL DEFAULT 1 CHECK (generation > 0),
  tutorial_version INTEGER
    CHECK (tutorial_version IS NULL OR tutorial_version > 0),
  tutorial_generation INTEGER
    CHECK (tutorial_generation IS NULL OR tutorial_generation > 0),
  status TEXT NOT NULL
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'dismissed')),
  current_step_key TEXT,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  reset_count INTEGER NOT NULL DEFAULT 0 CHECK (reset_count >= 0),
  started_at TEXT,
  last_resumed_at TEXT,
  last_paused_at TEXT,
  completed_at TEXT,
  dismissed_at TEXT,
  last_reset_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, workspace_id, flow_key, flow_version),
  CHECK (
    (
      flow_key = 'guided_estimate_practice'
      AND tutorial_version IS NOT NULL
      AND tutorial_generation IS NOT NULL
    )
    OR (
      flow_key <> 'guided_estimate_practice'
      AND tutorial_version IS NULL
      AND tutorial_generation IS NULL
    )
  ),
  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);
```

Required indexes:

```text
(workspace_id, user_id, status)
(workspace_id, flow_key, status)
(workspace_id, tutorial_version, tutorial_generation)
(updated_at)
```

`generation` is the instructional run/reset generation. It never substitutes
for `tutorial_generation`, which identifies the bound business-data fixture.
Timestamp consistency checks should be added only where they remain compatible
with reset/import transitions. Application transitions remain the primary
state-machine guard.

### `beta_onboarding_flow_events`

```sql
CREATE TABLE beta_onboarding_flow_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL,
  flow_key TEXT NOT NULL,
  flow_version INTEGER NOT NULL,
  generation INTEGER NOT NULL CHECK (generation > 0),
  tutorial_version INTEGER
    CHECK (tutorial_version IS NULL OR tutorial_version > 0),
  tutorial_generation INTEGER
    CHECK (tutorial_generation IS NULL OR tutorial_generation > 0),
  run_id TEXT NOT NULL CHECK (length(trim(run_id)) > 0),
  launch_mode TEXT NOT NULL CHECK (
    launch_mode IN (
      'auto', 'start', 'resume', 'replay', 'restart',
      'task', 'settings', 'migration', 'system'
    )
  ),
  step_key TEXT,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL CHECK (
    source IN (
      'server_eligibility', 'joyride_runtime', 'user_command',
      'starter_seed', 'tutorial_seed', 'tutorial_practice',
      'non_starter_domain', 'publication_domain',
      'migration', 'system'
    )
  ),
  reason_code TEXT,
  route_key TEXT,
  viewport_class TEXT
    CHECK (viewport_class IS NULL OR viewport_class IN ('mobile', 'desktop')),
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT,
  state_revision INTEGER NOT NULL CHECK (state_revision >= 0),
  occurred_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  UNIQUE (user_id, workspace_id, idempotency_key),
  CHECK (
    (tutorial_version IS NULL AND tutorial_generation IS NULL)
    OR (tutorial_version IS NOT NULL AND tutorial_generation IS NOT NULL)
  ),
  FOREIGN KEY (user_id, workspace_id, flow_key, flow_version)
    REFERENCES beta_onboarding_flow_states(
      user_id,
      workspace_id,
      flow_key,
      flow_version
    )
    ON DELETE CASCADE
);
```

Required indexes:

```text
(workspace_id, user_id, occurred_at)
(workspace_id, flow_key, flow_version, occurred_at)
(workspace_id, flow_key, run_id, occurred_at)
(workspace_id, tutorial_version, tutorial_generation, occurred_at)
(ingested_at)
```

`event_type`, `source`, `reason_code`, and `route_key` are validated against
closed application allowlists before SQL. Starter/tutorial lifecycle and practice events
require the server-resolved tutorial binding; other events keep both tutorial
columns null unless they are part of the bound guided-practice flow.
`request_fingerprint` is required for state-changing commands and omitted for
observation-only events; it never enters privacy exports or support context.
`run_id` is an opaque server-issued launch identity, not a
session/user/resource identifier. A database CHECK may mirror stable enums, but
do not force table rebuilds for ordinary copy or UI changes.

### Why no metadata JSON

The first release does not need arbitrary metadata. Explicit columns provide
the diagnostics required for eligibility, drop-off, target health, support, and
retention while preventing accidental tenant-content capture.

## State Transition Contract

| Current | Command | Next | Required condition |
| --- | --- | --- | --- |
| absent / `not_started` | start | `in_progress` | Eligible flow/version; guided practice also has a server-confirmed tutorial binding. |
| `in_progress` | resume | `in_progress` | Current step still compatible. |
| `in_progress` | advance | `in_progress` | Expected revision and legal next semantic step. |
| `in_progress` | pause | `in_progress` | Persist current semantic step and pause reason. |
| `in_progress` | complete | `completed` | Final eligible step ended normally; guided practice also has both required predicates for its current tutorial binding. |
| `in_progress` | dismiss | `dismissed` | Explicit user action. |
| `completed` | replay | `completed` | No durable completion regression. |
| `dismissed` | start again | `in_progress` | Increment generation. |
| any | restart | `in_progress` | Increment generation/reset count, clear terminal timestamps. |
| any existing eligible current-version set | reset all | `not_started` | Atomic guarded multirow update; increment generation/reset count; preserve activation. |
| bound guided practice | fresh practice copy | `in_progress` | Expected revision/binding match; archive old Project and atomically bind generation `N+1`. |

Illegal transitions return a typed conflict and the current state. They do not
coerce the database into the requested result.

## Mutation and Concurrency Contract

Every state-changing command includes:

```ts
type OnboardingMutationCommand = {
  flowKey: OnboardingFlowKey;
  flowVersion: number;
  mutationId: string;
  expectedRevision: number | null;
  expectedStepKey?: OnboardingStepKey | null;
  expectedTutorialBinding?: {
    version: number;
    generation: number;
  } | null;
  runId: string;
  launchMode: OnboardingLaunchMode;
};
```

The optional tutorial binding is a concurrency precondition, not authority.
The server derives the current binding and new generation; no client chooses an
origin, tutorial version, or next generation.

Server responsibilities:

1. derive user identity from the authenticated session;
2. derive/validate current workspace, project, or estimate access and effective
   capabilities;
3. resolve the current server flow definition and any bound tutorial identity;
4. authorize the command and launch mode;
5. reject a stale tutorial-binding expectation before any tutorial mutation;
6. fingerprint only the semantic command fields and compare it with any
   existing event for the same mutation ID;
7. detect an existing idempotency event;
8. apply `UPDATE ... WHERE revision=?` and legal-state predicates;
9. append the event in the same D1 batch;
10. verify affected row counts;
11. return the server-confirmed projection; and
12. on conflict, return a fresh projection without overwriting it.

Do not add a separate receipt table unless implementation demonstrates that the
unique event idempotency key cannot safely provide retry readback.

### Atomic reset-all

Reset-all is a separate command; the client does not loop over per-flow reset
actions. The server resolves current eligible flow versions, reads their current
revisions, and executes one conditional multirow `UPDATE` whose guard requires
the expected existing-row count and revision set to match. It increments
`generation`, `revision`, and `reset_count`, sets status to `not_started`, clears
step/terminal timestamps, and sets `last_reset_at`.

For `guided_estimate_practice`, reset-all leaves `tutorial_version` and
`tutorial_generation` unchanged. Matching practice facts remain facts and are
recomputed when the lesson starts again; reset never relabels them, copies them
to another tutorial generation, or mutates the tutorial Project.

The same D1 batch appends one event per updated flow using deterministic
mutation-ID suffixes and the common request fingerprint. If the guarded update
changes zero rows, no events are inserted and the action returns current
projections as a conflict. Absent eligible flows remain absent/equivalent to
`not_started`; Settings does not manufacture rows solely to reset them.

### Resumable starter-pack installation

The server loads one immutable `STARTER_PACK_VERSION = 1` manifest. Clients may
request `install`, `resume`, or `restore`, but cannot submit manifest contents,
asset keys, origins, generations, names, prices, or resource IDs.

Installation proceeds in deterministic dependency order:

1. create/CAS the workspace and current-user `beta_starter_pack_states` rows
   independently to `installing` when their scopes are not already complete;
2. resolve each required active claim by closed key;
3. for an unresolved workspace key, execute one checked D1 batch containing
   the claim plus its complete resource graph;
4. install the shared Tutorial/Reference/Sandbox Projects before per-user
   Project-group memberships, create/claim the two custom Component folders
   before their Components, resolve/ensure protected **Uncategorized** through
   the existing `is_default_category = 1` Library invariant without a starter
   folder claim before creating its child Component, and install Templates
   after any referenced starter Components;
5. install the authenticated user's per-user **Starter Examples**
   group/memberships without duplicating shared assets;
6. verify every batch result and reread authoritative resources; and
7. CAS each scope state to `complete` only when its exact manifest
   cardinalities resolve; report current-user readiness only when both the
   workspace and user scope are complete.

An asset batch is the atomic boundary: Project batches include their
Estimate/Tab/Area/Row graph; Component batches include the item/version/default
price option/variants; Template batches include the Template/node/Row graph.
This avoids one oversized all-assets transaction while ensuring no individual
asset is half-created. A failed dependency leaves only the affected scope
`partial`; retry continues unresolved keys. Concurrent installers race on
active-claim uniqueness, and losers reread the winner. A joining user never
rewrites the already complete workspace state; only their user-scoped
state/claims are installed.

Restore is explicit. It accepts expected pack revision and a closed
server-resolved inactive-key set, where each key has no active claim/resource
graph and its latest claim is `missing` or `archived`. It creates generation
`N+1` for only those keys and preserves every surviving edited resource. It
never renames, reorders, reprices, rehomes, or replaces an active asset. A
joining user runs only the user-scoped group/membership portion. New non-empty
workspaces never receive an automatic merge. Installation/restore never claims
a pre-existing unclaimed resource by name; canonical-name collisions use the
deterministic starter suffix above.

Automatic shared install runs only inside the authorized workspace-creation or
eligible reconciliation path. Explicit shared **Add starter content** and
shared restore require owner/manager authority. Current-user
group/membership reconciliation requires the server-derived
Projects-collection/grouping capability. Guided practice start requires normal
Project/Estimate creation/edit capability.

Restoring shared Tutorial or Reference is a resumable dependency operation, not
only a Project batch:

1. the owner/manager restore batch CASes the workspace state to `partial`,
   increments `shared_membership_revision`, creates the new shared Project
   generation, marks every active membership claim for the restored asset key
   `archived` when its row still points to the archived Project or `missing`
   when Project deletion already cascaded the row, and sets every affected
   existing user state to `partial` while leaving its prior revision;
2. reconciliation selects affected user scopes with
   `user.shared_membership_revision < workspace.shared_membership_revision` in
   stable `scope_owner_id` order, at most 25 users per checked batch;
3. each user batch reauthorizes current workspace-level
   Projects-collection/grouping capability, resolves the active group claim,
   inserts the membership to the new shared Project, claims membership
   generation `N+1`, rereads the exact Tutorial+Reference membership pair, and
   only then sets that user state `complete` at the workspace revision;
4. a user who lost only starter-organization eligibility runs the distinct
   idempotent cleanup below, preserves narrower instructional/activation state,
   and leaves no active user starter scope for the revision barrier; a user who
   lost final access runs final-access cleanup, while a failed still-eligible
   user remains `partial` with no false revision advance;
5. the initiating owner/manager command reconciles its first deterministic
   batch, **Resume starter restore** processes subsequent batches, and an
   affected eligible user's authorized read may reconcile only that user's
   scope against the already-created shared generation; none of these paths
   reruns or recreates the shared Project; and
6. only after no eligible pre-existing user scope remains behind the workspace
   revision does a CAS set the workspace state back to `complete`.

Archived and deleted shared Projects therefore follow one closure rule despite
different membership-row behavior. Concurrent restore/resume commands race on
the workspace revision and claim uniqueness; losers reread current progress.
A later joining user's independent partial group setup begins at the current
shared revision and does not downgrade a completed workspace state.

### Atomic tutorial claim and fresh copy

The closed Project metadata is:

```text
tutorial_kind = estimate_sheet_foundations
tutorial_version = 2
tutorial_generation = positive integer
```

Initial creation and fresh copy use one checked D1 batch plus the two unique
Project indexes. Initial creation inserts/claims the guided-practice state
binding first, then conditionally inserts the exact Project only when the
preceding state insert changed one row. A uniqueness or state conflict causes
the loser to reread the compatible winner; it never retries with generation
`N+1`.

Fresh copy requires the expected flow revision and current tutorial binding.
The transaction-safe SQL order is:

1. compare-and-set the guided-practice state from expected revision/binding
   `N` to tutorial generation `N+1`, instructional status `in_progress`, step
   one, and a new instructional generation/revision; the `WHERE` clause also
   requires exactly one active Project with the old closed identity;
2. archive that old Project only when SQLite `changes() = 1` for the CAS;
3. insert exactly one new Project with the new closed identity only when
   `changes() = 1` for the archive;
4. append `sample_archived` and `sample_fresh_copy_created` with deterministic
   idempotency keys only after the new Project insert succeeds; and
5. validate every batch result plus the final state/Project identity.

D1 batch serialization plus the CAS precondition makes the old active Project
stable for steps 1–2; the active-owner and identity unique indexes make any
duplicate insert abort the batch. A zero CAS suppresses every downstream write
and returns the winner/current state. A unique-index error rolls the batch back.
Any other unexpected affected-row result is a persistence failure, not a
retry-with-next-generation instruction. The completion query joins the current
state binding; practice events from generation `N` cannot satisfy `N+1`,
including after concurrent replay, restart, refresh, or fresh-copy requests.

### Multi-tab behavior

- First successful mutation advances revision.
- Stale tab receives `ONBOARDING_STATE_CONFLICT` and current state.
- Client replaces local projection with server state.
- Progress never moves backward automatically.
- Replay never changes canonical completion.
- A reset in another tab supersedes the old generation; old-generation events
  cannot advance the new state.
- Reopen races return one active tutorial Project.
- A fresh-copy winner changes the tutorial binding; stale tabs cannot emit
  matching practice receipts or create another active generation.

## Backfill and Compatibility Contract

### Existing-user import

Migration/repository import creates deterministic v1 projections only from
unambiguous evidence.

#### `core_orientation`

If `beta_activation_progress` exists, import core orientation as completed so a
returning beta user is not auto-interrupted. Record source `migration`.

#### `first_estimate_value`

| Existing evidence | Imported state |
| --- | --- |
| user-domain `first_value_at` or milestone at/after valid total | completed |
| user-domain priced-row milestone | in progress at `total_and_save` |
| user-domain area milestone | in progress at `add_priced_row` |
| authorized estimate row/current estimate context | in progress at `hierarchy`/next incomplete task |
| project milestone only | in progress at create/open estimate |
| workspace ready only | in progress at create/open project |
| no activation row | no import; normal eligibility decides |

Unknown `selected_path` remains `NULL`. Never infer it from project names or
sample-like data.

Seed-origin events do not import priced-row/valid-total completion or suppress
required lessons. When a legacy projection was advanced only by the marked
tutorial Project, derive the instructional import from the remaining
user-domain event/resource evidence rather than trusting the projection alone.

If current activation evidence points to a Project with server-owned
`activation_sample` or `activation_sample_version` metadata, retain its
tutorial-seed classification through the deterministic `origin_class`
backfill. Never import `guided_estimate_practice` as completed from that
evidence or bind a v2 practice state to a legacy fixture. A legacy version-1
sample is offered the explicit archive-and-create-version-2 path defined above.
Do not infer starter-pack installation, claims, grouping, or completion from
names or sample-like data. No historical `starter_seed` state exists before
this migration; existing eligible non-empty workspaces receive the explicit
**Add starter content** path.

### Project and Estimate task truth

Do not extend the activation milestone CHECKs for onboarding. The checklist
uses this closed server-owned operation set:

1. **Project creation family:** successful user-domain Blank creation,
   user-requested Duplicate, or user-requested Template-derived Project
   creation completes “Create or start work in a project.”
2. **Estimate Sheet creation family:** successful user-domain Blank creation,
   user-requested Duplicate, or user-requested Template
   insertion/instantiation completes “Create or start work in an estimate” and
   also establishes its authorized Project context.
3. **Estimate Sheet mutation family:** successful add Area, add Row, insert or
   reuse Component as Row, change quantity, change unit cost, change
   adjustment, or change miscellaneous cost completes the Estimate task and
   establishes the Project task when performed in an authorized Project.

Creation or mutation counts only after its authoritative write succeeds and
saved/readback state confirms the current resource context. The server derives
the closed action family and `origin_class='user_domain'`; no client payload
may assert either or directly complete a task. Opens, views, selection,
navigation, rename, reorder, grouping, favorite, archive, delete,
seed/install/restore work, tour callbacks, failed or rolled-back writes, and
stale writes are non-qualifying. Instrument the owned Project, Estimate,
Template-instantiation, node, row, and Component-insertion producer paths so
the repository consumes this closed fact rather than inferring from mere
resource presence.

This covers Blank, Template, Duplicate, starter/tutorial, and existing
collaborator contexts without adding an `estimate_created` activation milestone
or changing the existing activation milestone CHECKs. The priced-row and
valid-total tasks require user-domain evidence, never
`starter_seed`/`tutorial_seed`. Matching tutorial-practice evidence may satisfy
the separate practice outcome but does not substitute for the checklist origin
rule. Existing milestone names retain their actual source spelling, including
`first_area_created`, `first_row_priced`, and `first_valid_total`.

### Definition versioning

- Copy-only changes may retain the flow version.
- Step identity/order, completion semantics, required target, or audience
  compatibility changes require a version decision.
- Completed users default to manual-only replay for later versions.
- Incomplete compatible state maps by semantic step key.
- Incompatible state is preserved and a new version starts only when eligible.
- Old rows/events remain readable until normal lifecycle deletion/retention.

## Privacy, Retention, and Deletion Contract

### Privacy export

Include:

- flow key/version/instructional generation/status;
- visible starter-pack version/status and the current user's allowlisted asset
  claims (`scope_kind`, manifest key, generation, resource kind, and
  present/archived state);
- nullable tutorial version/generation binding;
- semantic current step;
- reset count and lifecycle timestamps; and
- allowlisted events, including activation `origin_class`.

Exclude internal request fingerprints and any implementation-only debug value.

### Workspace-scoped privacy erasure

- Resolve the user/workspace scope from the authenticated/admin privacy request.
- If an active activation legal hold exists, retain only the existing
  allowlisted activation and instructional rows, report the held scope, and do
  not recreate or retain access grants.
- Without a hold, delete instructional events/state, then activation
  outbox/events/progress for that user/workspace, plus user-scoped starter
  claims and starter-pack user state.
- Do not delete or tombstone global `user_onboarding_profiles` from a
  workspace-scoped request.
- Workspace-scoped starter state/claims and surviving shared starter assets
  remain while the workspace legitimately continues; workspace deletion
  removes them through the normal workspace lifecycle.
- Workspace-shared account settings remain when the workspace legitimately
  continues.

### Access-grant removal

- Workspace, project, and estimate grants are independent.
- Remove the requested grant through its current authorization path.
- Recompute whether any workspace/project/estimate access to that workspace
  remains.
- If access remains, keep instructional and activation state and refresh
  capability eligibility. If the user no longer has workspace-level
  Projects-collection/grouping capability, run the starter-organization
  eligibility cleanup below even when narrower project/estimate access remains.
- If final access is lost and no hold exists, erase instructional, activation,
  and user-scoped starter claim rows for that user/workspace in the same
  deletion program; remove the starter-created per-user Project group and its
  memberships as user organization data. Any explicitly created practice
  Project and all other business assets follow the existing authorized
  project/workspace ownership lifecycle rather than being silently deleted by
  guidance cleanup.
- If final access is lost under a hold, retain only held rows; rebuilt
  workspace-lifecycle FKs allow membership removal without constraint failure.
- If the same identity later regains legitimate access, the one-time user-scope
  bootstrap creates fresh per-user group/membership claims that point only to
  exact active shared starter claims. It never infers by name, rebinds or
  overwrites a prior practice Project, duplicates shared assets, or becomes a
  recurring login repair.

### Starter-organization eligibility cleanup

This is narrower than final-access cleanup. It runs when the user no longer has
workspace-level Projects-collection/grouping capability but still retains
project-only, direct-estimate, or other legitimate access to the workspace.

One checked idempotent transaction:

1. reauthorizes the current capability snapshot;
2. deletes memberships owned by the claimed per-user **Starter Examples**
   group, including any ordinary practice membership, without deleting or
   archiving any shared or practice Project;
3. deletes that per-user group and all user-scoped starter membership/group
   claims plus the user starter-pack state;
4. preserves workspace-scoped starter state/claims/assets, all instructional
   and activation state/events, the tutorial binding, and the ordinary practice
   Project; and
5. rereads that no active user starter-organization scope remains.

During shared restore, reauthorization and this cleanup share the checked user
batch boundary. A cleanup winner is excluded from the membership-revision
barrier only after the no-active-scope readback; a concurrent restore loser
rereads capability and scope instead of recreating the group. A legal hold on
activation/instructional evidence does not retain user organization rows. If
the user regains grouping capability while shared restore is still `partial`,
insert a partial user scope behind the current revision and reconcile it inside
the same barrier. If shared state is already `complete`, the ordinary one-time
user-scope bootstrap creates a fresh group and exact current-revision
memberships. Neither path revives stale claims or deletes preserved progress.

### Full-account deletion

For every workspace visible to `delete-account-repository.ts`:

1. classify owner-close versus shared-workspace leave;
2. apply the workspace erasure/final-access contract above;
3. remove project/estimate/workspace grants;
4. after all workspace scopes are processed, delete
   `user_onboarding_profiles` for the user;
5. tombstone the global `profiles` record under the current account-deletion
   policy; and
6. remove Better Auth session/account/user identity.

Active held rows retain the opaque prior user ID but no email/name or access
grant. Account deletion is not silently reported as a full data purge for held
scopes.

### Retention

- Current state persists while any access path or the account exists.
- Onboarding events follow the existing 180-day activation-event policy.
- Existing legal holds suppress purge for the same user/workspace.
- No new retention-hold table is added.
- Reset does not erase audit events.

### Membership and resource deletion

Audit every path that deletes:

- `workspace_members`;
- `project_members`; and
- `estimate_sheet_members`.

No individual membership table owns onboarding state. Current effective access
does. Project/estimate access changes refresh eligibility; loss of the final
access path invokes the lifecycle contract above. Project or estimate deletion
sets historical activation resource pointers to `NULL` and must not block
business deletion.

## Authorization Contract

| Action | Authority |
| --- | --- |
| Read own eligibility/progress | Authenticated user with current workspace, project, or estimate access. |
| Start/resume/replay/pause/dismiss own flow | Same user, current effective access, eligible flow. |
| Restart/reset own guidance | Same user and currently accessible workspace. |
| Reopen own checklist | Same user and currently accessible workspace. |
| Create/reopen/fresh-copy/archive tutorial | Same user, current create/edit capability, fixed server-owned seed, and expected revision/binding for replacement. |
| Complete shared workspace setup facts | Existing workspace owner/admin policy. |
| Creator checklist task | Required domain capability for the real action. |
| Complete Client links core lesson | Current publication-manager capability; existing publication action authorization plus verified server readback. |
| Optional recipient/destructive Client links action | Existing publication-manager capability and ordinary product confirmation/action contract; onboarding never invokes it automatically. |
| Admin reset of another user | Out of scope. |

Clients never submit authoritative `user_id`, `workspace_id`, role, capability,
resource-chain identity, activation origin, tutorial version/generation, or
seed shape. Expected tutorial binding is accepted only as a stale-write guard
and compared with server state.

## Typed Action Result

```ts
type OnboardingActionErrorCode =
  | "ONBOARDING_UNAUTHENTICATED"
  | "ONBOARDING_WORKSPACE_UNAVAILABLE"
  | "ONBOARDING_FLOW_NOT_ELIGIBLE"
  | "ONBOARDING_FLOW_VERSION_UNSUPPORTED"
  | "ONBOARDING_STATE_CONFLICT"
  | "ONBOARDING_MUTATION_MISMATCH"
  | "ONBOARDING_PERSISTENCE_UNAVAILABLE";

type OnboardingActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: OnboardingActionErrorCode;
        message: string;
        retryable: boolean;
      };
      currentState?: OnboardingFlowStateSnapshot;
    };
```

Messages are safe for the user. SQL, stack traces, raw IDs, private names, and
route details remain server-only.

## Overlay and Layer Contract

- Add one Workshop-owned portal node.
- Set the Workshop Joyride portal root to `z-index: 900`: above normal page
  content, the `z-[100]` sidebar, and the `z-[850]` inspector dock, but below
  the application modal layer beginning at `z-[1000]`.
- Add `modal-lifecycle.ts` with a subscription surface for `opening` and
  `closed_focus_restored`; it carries no tenant data.
- `Dialog`/`AppModal` publish the shared lifecycle. Native `<dialog>` and custom
  modal bypasses listed in `04-ROUTE-AND-OVERLAY-INVENTORY.md` use the same
  adapter.
- On `opening`, persist the current semantic step, mark the stop as
  programmatic, call `controls.stop()`, and remove the tooltip before the
  application dialog owns focus.
- On close, the application dialog restores its trigger first and then emits
  `closed_focus_restored`; an explicit Resume/launch intent may restart the
  tour. No automatic focus steal occurs.
- Route loading overlay and Joyride loader are not shown simultaneously for the
  same transition.
- Tooltip does not obscure the focused target at supported breakpoints.

## Mobile Navigation Contract

Before mobile onboarding is accepted:

1. extract the primary navigation catalog from `MainSidebar`;
2. preserve current feature-gate/disabled-nav logic;
3. render a mobile Workshop navigation entry in the persistent shell/header;
4. provide project Dashboard/Estimates/Data/Activity/Portals navigation on
   mobile;
5. preserve `aria-current`, labels, focus, safe-area, and touch target behavior;
6. add semantic targets to the trigger, not hidden desktop links; and
7. ensure direct-estimate users only see authorized destinations.

The mobile navigation repair is an onboarding prerequisite, not permission to
redesign unrelated authenticated UI.

## Performance Contract

- Follow `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md`.
- Keep the server shell and route content outside the client runtime.
- Heavy Joyride runtime uses an explicit dynamic chunk and `loading: null`.
- Do not preload it for ineligible/complete sessions.
- The tiny boundary may read viewport and launch intent but does not duplicate
  server data state.
- Use server props for initial snapshot and server actions for mutations.
- Do not fetch initial onboarding state in `useEffect`.
- Ordinary target wait uses Joyride’s own bounded wait.
- Route/virtual preparation uses `AbortController` and one bounded attempt.
- Cancel on unmount, route supersession, flow close, or viewport
  reclassification.
- Record emitted main-shell and dynamic-chunk gzip deltas only when the user
  explicitly requests the proposed build; compare them with the canonical
  repository budget rather than inventing a new threshold.
- No polling interval remains active while a tour is paused or hidden.

## Operational Diagnostics

### Allowed event dimensions

```text
flow_key
flow_version
generation                       instructional generation
tutorial_version                 nullable
tutorial_generation              nullable
run_id
launch_mode
step_key
event_type
source
reason_code
route_key
viewport_class
state_revision
occurred_at
```

### Support context

Allowed:

```text
flowKey
flowVersion
stepKey
reasonCode
routeKey
viewportClass
```

Support opening records `support_opened`. It never copies the error, URL, DOM,
resource IDs, or tooltip content into the message.

### Recovery / rollback

The local recovery path is source-level eligibility disablement:

- do not delete state;
- do not roll back the migration;
- do not clear activation;
- leave Getting started and Settings status readable;
- disable only the failing flow definition or runtime host; and
- fix forward.

## Acceptance Criteria

### `AC-001` Current baseline and exclusions

Pass when implementation starts from the observed source/migration baseline or
explicitly re-audits every stale trigger; current public/Admin exclusions remain
intentional.

### `AC-002` First-run eligibility and orientation

Pass when creator, collaborator, direct-estimate, viewer, returning, and
desktop/mobile cohorts receive the correct maximum-four-step auto-start or no
auto-start.

### `AC-003` First-value activation

Pass when the four checklist tasks reflect user-domain project, estimate, area,
priced-row, and valid-total evidence across blank, template, installed
Tutorial/Reference/Sandbox, guided practice, and self-directed paths. Generated
starter/tutorial seed activity, seeded presence, route visits, and opens cannot
masquerade as checklist value, user-performed practice, Library reuse,
independent activation, or transfer. Only successful Blank/Duplicate/
Template-derived creation or the closed seven-family Estimate Sheet mutation
set may advance the matching Project/Estimate checklist facts; organizational,
destructive, navigational, failed, stale, seeded, or client-asserted actions do
not.

### `AC-004` Contextual feature discovery

Pass when each catalog guide appears only for the correct role/capability,
feature, route, data state, and viewport, and no hidden/blank/unauthorized
target is shown.

### `AC-005` User control and accessibility

Pass when keyboard, focus, Escape, restoration, screen-reader semantics,
reduced motion, reflow, mobile layout, Retry/Skip/Exit/Support, and
Settings resume/replay/restart/reopen/reset work without competing modal focus.

### `AC-006` Durable state integrity

Pass when schema/state transitions, semantic resume, idempotency, retries,
expected revisions, instructional-generation changes, tutorial-binding changes,
duplicate commands, and multi-tab conflicts preserve monotonic server truth.

### `AC-007` Activation and lifecycle integrity

Pass when import/backfill, selected path, authoritative estimate-task truth,
activation dedupe, activation-table rebuild, producer-source preservation,
trusted-origin propagation/backfill, user-domain-only progress projection,
checklist zero-row repair, privacy, retention, legal holds, account deletion,
resource deletion, and final-access deletion are coherent.

### `AC-008` Security and privacy

Pass when server identity/capability/resource scope cannot be forged and no
persisted event, client error, support context, or log contains tenant content,
raw IDs, selectors, or arbitrary routes.

### `AC-009` Mount and bundle performance

Pass when public/ineligible routes do not load the runtime, dynamic client cost
is measured, shell hydration remains bounded, waits/virtual adapters cancel,
and no duplicate route-loading UI appears.

### `AC-010` Dependency, framework, and recovery correctness

Pass when exact Joyride v3.2.0 APIs/types, Next.js 16 client/dynamic/navigation
contracts, typed error recovery, and source-level rollback operate without v2
patterns or destructive state deletion.

### `AC-011` Protected post-auth return intent

Pass when login, OAuth/magic link, closed-beta/account setup, and terms
acceptance preserve safe protected Workshop/Admin paths and safe queries, strip
fragments, reject sensitive/public/auth-loop destinations, reauthorize the
destination, and fall back to `/workshop`.

### `AC-012` Estimate Sheet comprehension and transfer

Pass when the Estimate Sheet route and Getting started expose the same
resumable Core/Optional learning rail; every lesson has a closed outcome,
normal-product handoff, rendering owner, missing/virtualized/modal recovery,
and capability-aware variant. An eligible editor must complete the two required
practice actions through normal editor controls, follow the live
Project/Estimate/Tab/Area/Row model, read every current cost column in order,
observe dirty/saving/saved/failed plus total change, and later perform an
equivalent edit in non-starter work. Optional hierarchy, Component/Template
reuse, and real failure recovery remain available without blocking core.
Failed, stale, optimistic, seeded, navigational, or tooltip-only state earns no
practice credit. Pass the expanded read-only variant separately for
viewer/direct-estimate readers without asking for mutation.

### `AC-013` Starter-pack and tutorial integrity and recovery

Pass when starter-pack version `1` resolves exactly three shared Projects/four
Estimate Sheets, one per-user **Starter Examples** group with shared Tutorial
and Reference membership, one ungrouped Sandbox, six persisted Components
across exactly two claimed custom folders plus protected **Uncategorized**
resolved/ensured through the existing `is_default_category = 1` invariant
without a starter folder claim, and three persisted Templates in the specified
categories. Shared assets install once; joining users receive only
their per-user group/membership keys. New, pre-existing-empty, and
joining-editor entry paths obey the closed business-table eligibility
predicate. Asset-level checked batches are idempotent and resumable after a
partial install; explicit restore recreates only inactive keys whose latest
claim is `missing` or `archived`, with a new generation, and never overwrites
surviving edits. Restoring shared Tutorial or Reference increments
`shared_membership_revision`, marks every affected eligible user scope
`partial`, and deterministically rebinds exact Tutorial-plus-Reference
membership claims in resumable batches; a user revision advances only after
readback, and workspace readiness cannot return to `complete` while any
eligible pre-existing user scope remains behind. A mid-restore loss of grouping
capability removes only that user's starter organization/state/claims after
checked no-active-scope readback while preserving narrower
instructional/activation state, tutorial binding, and all Projects. Explicit
Guided tutorial start creates exactly one compatible active practice
generation outside starter cardinality;
activation `source` remains the producer taxonomy while non-forgeable
`origin_class` distinguishes `starter_seed`, `tutorial_seed`, and
`user_domain`; guided-practice state/events persist the same tutorial binding;
old-binding receipts cannot complete a new copy; concurrent
create/reopen/fresh-copy commands return one active winner; and all seed-origin
metrics remain separate from practice, activation, and independent transfer.

### `AC-014` Client links guided publishing

Pass when an eligible publication manager can resume a route-local
`client_link_publishing` curriculum that:

- teaches roster/filter/status literacy across Live, Needs update, Expired,
  Off, and Not shared states;
- guides exact Estimate Sheet scope, client name, open/password access, summary
  review, and normal create/republish;
- grants core publish credit only after successful publication action plus
  post-save verification of non-empty scope, published status, and link
  availability;
- grants final core credit only when the atomic server bridge correlates
  explicit copy/selectable-link fallback or authenticated Preview to that
  exact current publication in the same active run, without persisting a
  URL/token/resource identifier or entering `/share/[token]` with Joyride;
- exposes optional Recipients, Activity, stale/expiry maintenance, and
  Replace/Turn off safety lessons without automatically sending email or
  requiring a destructive action;
- handles no data, no capability, no Estimates, invalid password, load/save/
  verification failure, clipboard failure, stale status, unsaved changes,
  route interruption, and mobile master/detail recovery; and
- keeps Client links, public share, Proposals, and Client Portals semantically
  and operationally distinct.

## Proposed Product Tests

These are `TEST_PROPOSAL`, not authorized by the planning request.

### `TEST-001` D1 state, migration, and concurrency

Planned files:

```text
tests/vitest/beta-onboarding-flow-migration.test.ts
tests/vitest/beta-onboarding-flow-repository.test.ts
tests/vitest/beta-onboarding-flow-actions.test.ts
```

Assertions:

- clean migration and deterministic backfill;
- row-preserving rebuild of all four activation tables and exact index
  recreation;
- deterministic activation `origin_class` backfill from server-owned Project
  metadata while preserving the existing producer `source`;
- progress identity/control fields survive migration while derived
  milestone/resource/value fields are recomputed only from `user_domain`
  events;
- FK/index/check contracts;
- the flow-event `source` CHECK and repository persistence path accept the
  closed `publication_domain` value while rejecting arbitrary sources;
- starter-pack state and asset-claim tables, closed asset/scope vocabulary,
  workspace-versus-user uniqueness, and non-negative
  `shared_membership_revision`;
- guided-practice tutorial-binding columns and both tutorial Project uniqueness
  indexes;
- workspace/project/estimate-only access sources;
- all legal/illegal transitions;
- semantic resume/version mapping;
- idempotent duplicate mutation;
- stale revision conflict;
- old generation cannot advance new generation;
- instructional reset preserves the tutorial binding while a fresh copy changes
  it;
- concurrent starter install/restore claims resolve one asset generation per
  manifest key without duplicating workspace-scoped assets;
- an interrupted starter install persists `partial`, resumes only unresolved
  claims, and reaches `complete` only after all required workspace and user
  claims resolve;
- archived and deleted shared Tutorial/Reference restore increments one
  workspace membership revision, marks all affected eligible user scopes
  partial, and archives or marks missing the stale membership claims according
  to actual row survival;
- stable `scope_owner_id` ordering, a maximum 25-user checked batch, retry, and
  concurrent resume reconcile every eligible pre-existing user to the exact
  Tutorial-plus-Reference pair without recreating the shared Project;
- a mid-restore downgrade to project-only/direct-estimate access runs
  idempotent starter-organization cleanup, preserves instructional/activation
  state and business Projects, removes only the per-user group/state/claims,
  and exits the revision barrier only after no-active-scope readback;
- grouping capability regained before shared completion re-enters that user as
  a partial current-revision dependency, while regain after completion performs
  only the ordinary current-revision user bootstrap;
- failed still-eligible users remain partial without revision advance, final
  access loss follows final-access cleanup, and workspace state returns to
  `complete` only when no eligible pre-existing user scope remains behind;
- concurrent initial tutorial claim/fresh-copy CAS returns one winner;
- request-fingerprint mismatch rejection;
- atomic reset-all all-or-none behavior;
- reset/replay non-regression; and
- final-access/account/resource delete ordering.

Proposed command only if the user explicitly requests this test scope:

```bash
bun run test:dom -- \
  tests/vitest/beta-onboarding-flow-migration.test.ts \
  tests/vitest/beta-onboarding-flow-repository.test.ts \
  tests/vitest/beta-onboarding-flow-actions.test.ts
```

### `TEST-002` Activation, checklist, and start paths

Planned/affected files:

```text
tests/vitest/beta-activation-repository.test.ts
tests/vitest/activation-path-actions.test.ts
tests/vitest/first-estimate-checklist.test.ts
tests/vitest/first-estimate-checklist.test.tsx
tests/vitest/beta-onboarding-eligibility.test.ts
```

Assertions:

- estimate task derived from authoritative estimate access rather than
  `workspace_ready`;
- duplicate activation no-op;
- zero-row checklist dismiss/reopen repair;
- exact selected-path writes: Blank `blank`, Template
  `workspace_template`, Guided tutorial `guided_sample`, installed Reference
  `starter_reference`, and installed Sandbox `starter_sandbox`;
- starter-pack and guided tutorial seeding record closed asset/generation
  identity without earning priced-row/valid-total checklist value,
  user-performed practice, Library reuse, or independent conversion;
- seeded presence, route visits, and opens do not complete the first two
  checklist tasks or establish Project/Estimate context;
- starter/tutorial events are delivered and auditable but never execute the
  `beta_activation_progress` upsert;
- successful user-domain Blank/Duplicate/Template-derived Project creation,
  Blank/Duplicate/Template-instantiated Estimate creation, and each of add
  Area, add Row, Component-as-Row insertion/reuse, quantity change, unit-cost
  change, adjustment change, and miscellaneous-cost change produce the exact
  closed checklist fact only after authoritative save/readback;
- open/view/select/navigate, rename/reorder/group/favorite/archive/delete,
  seed/install/restore, tour callbacks, failed/rolled-back/stale writes, and
  client-supplied completion produce no Project/Estimate checklist fact;
- public project/estimate actions cannot submit or forge activation origin;
- tutorial project/estimate producers preserve `source='project'|'estimate'`
  while outbox/event `origin_class='tutorial_seed'`;
- Reference/Sandbox project/estimate producers preserve the normal source while
  outbox/event `origin_class='starter_seed'`;
- starter/tutorial-origin activation remains identifiable, including
  deterministic legacy tutorial backfill, and excluded from non-starter
  transfer;
- creator/viewer/collaborator checklist variants; and
- returning-user suppression.

Proposed command only if the user explicitly requests this test scope:

```bash
bun run test:dom -- \
  tests/vitest/beta-activation-repository.test.ts \
  tests/vitest/activation-path-actions.test.ts \
  tests/vitest/first-estimate-checklist.test.ts \
  tests/vitest/first-estimate-checklist.test.tsx \
  tests/vitest/beta-onboarding-eligibility.test.ts
```

### `TEST-008` Starter pack, tutorial practice, and transfer

Planned/affected files:

```text
tests/vitest/starter-workspace-pack.test.ts
tests/vitest/guided-estimate-sample.test.ts
tests/vitest/estimate-onboarding-practice.test.ts
tests/vitest/estimate-onboarding-practice.test.tsx
```

Assertions:

- exact three-Project/four-Estimate-Sheet/six-Component/three-Template manifest
  with the named group, folders, categories, and at least one two-variant
  Component;
- Tutorial and Reference appear in the per-user **Starter Examples** group,
  Sandbox remains ungrouped, shared assets install once, and a joining user
  receives exactly one user-scoped group claim plus two membership claims;
- project-only and direct-estimate collaborators receive no user-scope starter
  organization and no impossible readiness requirement;
- the three starter Projects are workspace-scoped, and explicit Guided
  tutorial start creates/resumes the per-user practice Project outside starter
  cardinality without implying private Project visibility;
- the exact auto-install predicate distinguishes new, pre-existing-empty, and
  joining-editor paths and ignores only `library_folders` rows where
  `is_default_category = 1`;
- state-first reconciliation resumes `installing`/`partial`, no-ops
  `complete`, and recovers valid orphan claims as `partial` before any
  emptiness decision;
- the installer creates/claims exactly two custom Component folders,
  resolves/ensures protected **Uncategorized** through the existing
  `is_default_category = 1` invariant without a starter folder claim, and
  claims only the Component parented there;
- interrupted install resumes unresolved claims; explicit restore increments
  only an inactive `missing`/`archived` asset generation and preserves every
  surviving edited asset;
- shared add/restore rejects non-manager authority, user organization requires
  grouping capability, and Guided practice requires normal create/edit
  capability;
- restoring archived or deleted shared Tutorial/Reference increments the
  workspace membership revision, invalidates stale dependent membership
  claims, marks every affected eligible user state partial, and reconciles
  exact membership pairs in stable batches without duplicating shared assets;
- concurrent restore/resume and per-user authorized-read repair cannot recreate
  the shared Project, skip an eligible pre-existing user, falsely advance a
  failed user revision, or return workspace state to complete before
  dependency closure;
- a mid-restore downgrade to project-only/direct-estimate access races safely
  with restore, removes only that user's starter organization/state/claims,
  preserves narrower instructional/activation state and all Projects, exits
  the barrier after no-active-scope readback, re-enters the same barrier on
  capability regain before completion, and otherwise bootstraps only the
  current revision;
- an unclaimed canonical-name collision is neither adopted nor overwritten and
  receives the deterministic starter display suffix while claim identity stays
  canonical;
- exact Tutorial one-tab/one-parent-plus-three-leaf-Area/
  three-to-five-Row learning shape;
- idempotent reopen for the same tutorial generation;
- concurrent start/reopen commands return one active Project and one persisted
  tutorial binding;
- explicit legacy-v1 archive plus version-2 creation without in-place row
  mutation or name-based inference;
- seed writes cannot complete `price_and_save` or `add_and_source`; any
  generated activation milestones preserve the normal producer `source`, carry
  non-forgeable `origin_class='tutorial_seed'` through outbox delivery, and
  cannot advance `beta_activation_progress` or count as independent
  `first_valid_total` conversion;
- the closed Project/Estimate creation and seven-family mutation set completes
  the first two checklist tasks only after successful authoritative
  save/readback, while every navigational, organizational, destructive, failed,
  stale, seeded, and client-asserted negative case remains incomplete;
- a user-origin price/quantity edit changes Row total and reaches saved state;
- a user-origin Row or Component reuse action attaches to the intended Area;
- practice completion requires both required actions;
- every practice receipt carries the server-resolved tutorial version and
  generation, and only receipts matching the current state binding count;
- the shared route-local learning rail exposes every applicable Core/Optional
  lesson with resume/blocked/completed state and never requires more than four
  overlay steps per lesson;
- Project/Estimate/Tab/Area/Row and every current row-math column use source-
  accurate terminology; rendering-owner targets and the virtual Row adapter
  recover from partial Tab, missing Area, modal interruption, and save state;
- dirty/saving/failed, offline, and revision-conflict branches cannot advance
  price/save; real recovery can complete only after authoritative readback;
- Component source scope and Template reuse earn optional lesson credit only
  from normal product actions; and
- the expanded read-only lesson is eligible without any edit control or
  mutation requirement;
- fresh-practice copy atomically archives rather than overwrites the prior
  sample, rebinds to generation `N+1`, and rejects a stale/concurrent loser;
- old-generation practice receipts and concurrent replay/restart events cannot
  complete the new copy;
- global guidance reset leaves starter/tutorial business data, starter claim
  generations, and tutorial binding unchanged while advancing only
  instructional generation;
- installed Components/Templates earn no guide, practice, reuse, or activation
  credit until a user deliberately inserts, duplicates, edits, or saves through
  normal product actions; and
- non-starter transfer excludes every claimed starter/tutorial Project
  generation.

Proposed command only if the user explicitly requests this test scope:

```bash
bun run test:dom -- \
  tests/vitest/starter-workspace-pack.test.ts \
  tests/vitest/guided-estimate-sample.test.ts \
  tests/vitest/estimate-onboarding-practice.test.ts \
  tests/vitest/estimate-onboarding-practice.test.tsx
```

### `TEST-009` Client links guided publishing

Planned/affected files:

```text
tests/vitest/client-link-onboarding.test.ts
tests/vitest/client-link-onboarding.test.tsx
tests/vitest/publisher-roster-client.test.tsx
tests/vitest/publisher-drawer.test.tsx
tests/vitest/publisher-wizard.test.tsx
tests/vitest/recipient-email-composer.test.tsx
tests/vitest/project-publication-actions.test.ts
tests/vitest/project-publication-rotate-resend.test.ts
```

Assertions:

- `client_link_publishing` is explicit/task-launched, manager-only, resumable,
  and absent from public `/share/[token]`;
- migration/repository integration accepts one sanitized
  `source='publication_domain'` lesson event and readback while rejecting
  arbitrary event sources and every prohibited publication payload field;
- roster/search/project/status targets handle Live, Needs update, Expired, Off,
  Not shared, empty, filtered-empty, loading/error, and mobile selection state;
- create/edit guidance hands control to the real wizard, requires at least one
  resolved Estimate Sheet, validates password requirements, and never submits
  a form from a tooltip;
- core completion requires successful create/republish plus post-save refetch
  verification and an explicit copy/selectable-link/Preview action correlated
  by the short-lived server HMAC receipt to the exact current publication and
  active run;
- project-A publish plus project-B copy/Preview, cross-user/workspace receipt
  use, tampering, expiry, reload/lost receipt, publication replacement,
  stale-flow revision, and receipt replay cannot complete the flow;
- no route visit, drawer open, tooltip view, failed action,
  `verificationPending`, zero-scope snapshot, stale resource, or client-
  supplied completion advances the flow;
- copied/selected URLs, tokens, project/publication/recipient identifiers,
  selected Estimate IDs, client names, passwords, emails, and snapshot content
  never enter flow state/events, diagnostics, support context, or logs;
- authenticated Preview is `RETURN_ONLY` and distinct from the public
  recipient route;
- recipients/activity are optional, recipient email is never sent by
  onboarding, and recipient failures do not regress core completion;
- stale/expired/off recovery uses normal product actions and verified readback;
- republish issues a new URL; Replace link and Turn off link preserve their
  existing explicit consequences/confirmations and are never required for
  lesson completion; and
- Client links, Proposals, and Client Portals remain distinct in copy, route,
  target, eligibility, and completion logic.

Proposed command only if the user explicitly requests this test scope:

```bash
bun run test:dom -- \
  tests/vitest/client-link-onboarding.test.ts \
  tests/vitest/client-link-onboarding.test.tsx \
  tests/vitest/publisher-roster-client.test.tsx \
  tests/vitest/publisher-drawer.test.tsx \
  tests/vitest/publisher-wizard.test.tsx \
  tests/vitest/recipient-email-composer.test.tsx \
  tests/vitest/project-publication-actions.test.ts \
  tests/vitest/project-publication-rotate-resend.test.ts
```

### `TEST-003` Joyride controller, targets, and Settings

Planned files:

```text
tests/vitest/onboarding-flow-catalog.test.ts
tests/vitest/onboarding-tour-controller.test.tsx
tests/vitest/onboarding-target-contract.test.tsx
tests/vitest/onboarding-settings.test.tsx
tests/vitest/onboarding-support-context.test.ts
```

Assertions:

- uncontrolled configuration/no `stepIndex`;
- Strict Mode subscription cleanup;
- semantic resume and filtered steps;
- Close/Escape pause versus explicit Skip dismissal;
- programmatic modal stop suppression;
- replay run identity without completion regression;
- launch-intent consume/cleanup;
- target-not-found recovery;
- viewport/role/feature filtering;
- Estimate Sheet and Client links lesson-rail resume/blocked/completed state;
- publisher Drawer/wizard/confirmation lifecycle pause and restoration;
- Settings action semantics;
- focus handoff around app modals; and
- strict support allowlist.

Proposed command only if the user explicitly requests this test scope:

```bash
bun run test:dom -- \
  tests/vitest/onboarding-flow-catalog.test.ts \
  tests/vitest/onboarding-tour-controller.test.tsx \
  tests/vitest/onboarding-target-contract.test.tsx \
  tests/vitest/onboarding-settings.test.tsx \
  tests/vitest/onboarding-support-context.test.ts
```

### `TEST-004` Privacy, retention, and deletion

Planned/affected files:

```text
tests/vitest/beta-onboarding-privacy.test.ts
tests/vitest/beta-onboarding-retention.test.ts
tests/vitest/delete-account-d1.test.ts
```

Assertions:

- export includes only allowed fields;
- erase respects legal hold;
- 180-day event purge;
- state lifetime;
- workspace erasure, final-access loss, and full-account deletion remain
  distinct;
- starter-organization eligibility loss with narrower access preserved is
  distinct from final-access loss: it removes only the per-user starter
  group/memberships/state/claims and preserves instructional/activation state,
  tutorial binding, shared assets, and the ordinary practice Project;
- privacy export includes only allowlisted starter-pack state/claims, final
  access loss removes user-scoped claims, and workspace-scoped claims survive
  while the workspace legitimately continues;
- final access removes starter-created per-user grouping without deleting
  shared/business assets; any user-created guided-practice Project follows the
  normal Project lifecycle, and later legitimate re-access rebuilds only the
  exact per-user group/membership organization;
- held rows outlive grants without FK failure;
- global profile deletion happens only for full-account deletion;
- no orphan/foreign-key failure; and
- reset does not erase audit events.

Proposed command only if the user explicitly requests this test scope:

```bash
bun run test:dom -- \
  tests/vitest/beta-onboarding-privacy.test.ts \
  tests/vitest/beta-onboarding-retention.test.ts \
  tests/vitest/delete-account-d1.test.ts
```

### `TEST-005` Browser accessibility and route behavior

Planned file:

```text
e2e/onboarding-flow.spec.ts
```

Matrix:

- new creator desktop;
- new creator narrow mobile;
- invited viewer/direct estimate;
- returning activated user;
- Settings replay/restart/reset;
- missing target and route supersession;
- app modal opened during tour;
- keyboard-only completion/exit;
- 200% zoom/reflow;
- reduced motion; and
- virtualized estimate target preparation;
- publication manager Client links core path on desktop and narrow mobile;
- publisher verification-pending, clipboard fallback, and no-permission
  recovery; and
- authenticated Preview return with no Joyride mount on public share.

Proposed command only if the user explicitly requests this test scope:

```bash
bun run test:e2e -- e2e/onboarding-flow.spec.ts --project=chromium
```

No screenshot assertion is required unless separately authorized.

### `TEST-006` Bundle and mount boundary

Planned helper:

```text
scripts/check-onboarding-bundle-boundary.mjs
```

Assertions:

- public route chunks do not contain React Joyride;
- ineligible Workshop initial chunks exclude the heavy runtime;
- dynamic onboarding chunk is independently identifiable;
- main-shell and dynamic gzip deltas are reported;
- server/client module graph has no server-only leak; and
- no runtime polling remains after pause/unmount.

Proposed command only if the user explicitly requests this test scope:

```bash
bun run build
node scripts/check-onboarding-bundle-boundary.mjs
```

### `TEST-007` Auth return-intent chain

Planned/affected files:

```text
tests/vitest/auth-redirects.test.ts
tests/vitest/auth-account-setup.test.ts
tests/vitest/auth-actions.test.ts
tests/vitest/legal-actions.test.ts
```

Assertions:

- safe `/workshop` and `/admin` paths survive login, callback, setup, and terms;
- safe query parameters survive while sensitive keys and nested `next` fail;
- fragments, external/protocol-relative paths, auth loops, public token routes,
  malformed encodings, backslashes, controls, and overlong values fall back;
- pending invite remains supported;
- destination authorization still runs; and
- no rejected return value appears in logs, support context, or onboarding
  events.

Proposed command only if the user explicitly requests this test scope:

```bash
bun run test:dom -- \
  tests/vitest/auth-redirects.test.ts \
  tests/vitest/auth-account-setup.test.ts \
  tests/vitest/auth-actions.test.ts \
  tests/vitest/legal-actions.test.ts
```

## Permitted Static Verification

These are not product tests:

```bash
bun run type-check
bun run lint -- \
  src/lib/onboarding \
  src/components/onboarding \
  src/components/workshop \
  src/components/sidebar \
  src/app/workshop/getting-started \
  src/app/workshop/settings
git diff --check
rg -n "stepIndex|callback=|getHelpers|from ['\\\"]react-joyride['\\\"]" \
  src package.json
rg -n "data-onboarding-target" src
```

For migration authoring, use static SQL/source inspection first. A clean
temporary local D1 migration apply is part of `TEST-001`, not implied by plan
validation.

## Completion Evidence Format

For each acceptance criterion record:

```text
criterion
status: PASS | FAIL | BOUNDARY
source revision
files/commands inspected
actual output summary
remaining limitation
owner and next unit if failed
```

Do not inherit a PASS from another criterion. Do not describe an unrun test,
unapplied migration, local build, or local browser as hosted/production proof.
