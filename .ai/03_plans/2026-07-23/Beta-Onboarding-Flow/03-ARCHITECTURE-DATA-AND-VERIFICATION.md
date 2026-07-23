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
  | "library_reuse"
  | "client_sharing";

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
  | "viewport_changed"
  | "definition_changed"
  | "persistence_unavailable";
```

Keep route, capability, target, and source vocabularies equally closed. Do not
accept arbitrary strings from the client.

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

`0101_beta_onboarding_flow_state.sql` has two responsibilities. Before creating
instructional tables, it rebuilds these four issued tables:

```text
beta_activation_progress
beta_activation_events
beta_activation_outbox
beta_activation_retention_holds
```

The rebuild preserves every column, row, milestone/source/state CHECK, unique
constraint, and current index name. It does **not** add `estimate_created`.
Schema changes are limited to lifecycle-safe foreign keys:

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
3. copy every column explicitly, with no data rewrite;
4. assert source/destination row counts independently for all four tables;
5. run `pragma_foreign_key_check` before replacement;
6. drop originals, rename replacements, and recreate exactly these indexes:
   `idx_beta_activation_progress_milestone_event`,
   `idx_beta_activation_events_user_workspace_occurred`,
   `idx_beta_activation_events_milestone_occurred`,
   `idx_beta_activation_outbox_state_next_attempt`,
   `idx_beta_activation_outbox_lease_expires`, and
   `idx_beta_activation_retention_holds_active`;
7. create the two instructional tables and indexes below;
8. run the row-count assertions and `pragma_foreign_key_check` again; and
9. remove assertion infrastructure only after all checks pass.

Any failed assertion aborts the migration. If an issued apply later needs
repair, add the next migration; never edit `0101` after deployment.

### `beta_onboarding_flow_states`

```sql
CREATE TABLE beta_onboarding_flow_states (
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL,
  flow_key TEXT NOT NULL,
  flow_version INTEGER NOT NULL CHECK (flow_version > 0),
  generation INTEGER NOT NULL DEFAULT 1 CHECK (generation > 0),
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
  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);
```

Required indexes:

```text
(workspace_id, user_id, status)
(workspace_id, flow_key, status)
(updated_at)
```

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
  run_id TEXT NOT NULL CHECK (length(trim(run_id)) > 0),
  launch_mode TEXT NOT NULL CHECK (
    launch_mode IN (
      'auto', 'start', 'resume', 'replay', 'restart',
      'task', 'settings', 'migration', 'system'
    )
  ),
  step_key TEXT,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
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
(ingested_at)
```

`event_type`, `source`, `reason_code`, and `route_key` are validated against
closed application allowlists before SQL. `request_fingerprint` is required for
state-changing commands and omitted for observation-only events; it never enters
privacy exports or support context. `run_id` is an opaque server-issued launch
identity, not a session/user/resource identifier. A database CHECK may mirror
stable enums, but do not force table rebuilds for ordinary copy or UI changes.

### Why no metadata JSON

The first release does not need arbitrary metadata. Explicit columns provide
the diagnostics required for eligibility, drop-off, target health, support, and
retention while preventing accidental tenant-content capture.

## State Transition Contract

| Current | Command | Next | Required condition |
| --- | --- | --- | --- |
| absent / `not_started` | start | `in_progress` | Eligible flow/version. |
| `in_progress` | resume | `in_progress` | Current step still compatible. |
| `in_progress` | advance | `in_progress` | Expected revision and legal next semantic step. |
| `in_progress` | pause | `in_progress` | Persist current semantic step and pause reason. |
| `in_progress` | complete | `completed` | Final eligible step ended normally. |
| `in_progress` | dismiss | `dismissed` | Explicit user action. |
| `completed` | replay | `completed` | No durable completion regression. |
| `dismissed` | start again | `in_progress` | Increment generation. |
| any | restart | `in_progress` | Increment generation/reset count, clear terminal timestamps. |
| any existing eligible current-version set | reset all | `not_started` | Atomic guarded multirow update; increment generation/reset count; preserve activation. |

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
  runId: string;
  launchMode: OnboardingLaunchMode;
};
```

Server responsibilities:

1. derive user identity from the authenticated session;
2. derive/validate current workspace, project, or estimate access and effective
   capabilities;
3. resolve the current server flow definition;
4. authorize the command and launch mode;
5. fingerprint only the semantic command fields and compare it with any
   existing event for the same mutation ID;
6. detect an existing idempotency event;
7. apply `UPDATE ... WHERE revision=?` and legal-state predicates;
8. append the event in the same D1 batch;
9. verify affected row counts;
10. return the server-confirmed projection; and
11. on conflict, return a fresh projection without overwriting it.

Do not add a separate receipt table unless implementation demonstrates that the
unique event idempotency key cannot safely provide retry readback.

### Atomic reset-all

Reset-all is a separate command; the client does not loop over per-flow reset
actions. The server resolves current eligible flow versions, reads their current
revisions, and executes one conditional multirow `UPDATE` whose guard requires
the expected existing-row count and revision set to match. It increments
`generation`, `revision`, and `reset_count`, sets status to `not_started`, clears
step/terminal timestamps, and sets `last_reset_at`.

The same D1 batch appends one event per updated flow using deterministic
mutation-ID suffixes and the common request fingerprint. If the guarded update
changes zero rows, no events are inserted and the action returns current
projections as a conflict. Absent eligible flows remain absent/equivalent to
`not_started`; Settings does not manufacture rows solely to reset them.

### Multi-tab behavior

- First successful mutation advances revision.
- Stale tab receives `ONBOARDING_STATE_CONFLICT` and current state.
- Client replaces local projection with server state.
- Progress never moves backward automatically.
- Replay never changes canonical completion.
- A reset in another tab supersedes the old generation; old-generation events
  cannot advance the new state.

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
| `first_value_at` or milestone at/after valid total | completed |
| priced-row milestone | in progress at `total_and_save` |
| area milestone | in progress at `add_priced_row` |
| authorized estimate row/current estimate context | in progress at `hierarchy`/next incomplete task |
| project milestone only | in progress at create/open estimate |
| workspace ready only | in progress at create/open project |
| no activation row | no import; normal eligibility decides |

Unknown `selected_path` remains `NULL`. Never infer it from project names or
sample-like data.

### Estimate task truth

Do not extend the activation milestone CHECKs for onboarding. The checklist
resolves “Create or open an estimate” from an authorized current `estimates`
row/resource context. This covers manual, default-on-project, guided-sample,
duplicate, and existing collaborator estimates without forcing every creation
producer into a new analytics taxonomy. Existing milestone names retain their
actual source spelling, including `first_area_created`, `first_row_priced`, and
`first_valid_total`.

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

- flow key/version/generation/status;
- semantic current step;
- reset count and lifecycle timestamps; and
- allowlisted events.

Exclude internal request fingerprints and any implementation-only debug value.

### Workspace-scoped privacy erasure

- Resolve the user/workspace scope from the authenticated/admin privacy request.
- If an active activation legal hold exists, retain only the existing
  allowlisted activation and instructional rows, report the held scope, and do
  not recreate or retain access grants.
- Without a hold, delete instructional events/state, then activation
  outbox/events/progress for that user/workspace.
- Do not delete or tombstone global `user_onboarding_profiles` from a
  workspace-scoped request.
- Workspace-shared account settings remain when the workspace legitimately
  continues.

### Access-grant removal

- Workspace, project, and estimate grants are independent.
- Remove the requested grant through its current authorization path.
- Recompute whether any workspace/project/estimate access to that workspace
  remains.
- If access remains, keep instructional state and refresh eligibility.
- If final access is lost and no hold exists, erase instructional and activation
  rows for that user/workspace in the same deletion program.
- If final access is lost under a hold, retain only held rows; rebuilt
  workspace-lifecycle FKs allow membership removal without constraint failure.

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
| Complete shared workspace setup facts | Existing workspace owner/admin policy. |
| Creator checklist task | Required domain capability for the real action. |
| Collaboration/share guide | Existing project/workspace management capability. |
| Admin reset of another user | Out of scope. |

Clients never submit authoritative `user_id`, `workspace_id`, role, capability,
or resource-chain identity.

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
generation
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

Pass when the four checklist tasks reflect actual project, estimate, area,
priced-row, and valid-total evidence across blank, template, guided sample, and
self-directed paths.

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
expected revisions, generation changes, duplicate commands, and multi-tab
conflicts preserve monotonic server truth.

### `AC-007` Activation and lifecycle integrity

Pass when import/backfill, selected path, authoritative estimate-task truth,
activation dedupe, activation-table rebuild, checklist zero-row repair, privacy,
retention, legal holds, account deletion, resource deletion, and final-access
deletion are coherent.

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
- FK/index/check contracts;
- workspace/project/estimate-only access sources;
- all legal/illegal transitions;
- semantic resume/version mapping;
- idempotent duplicate mutation;
- stale revision conflict;
- old generation cannot advance new generation;
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
- Blank/Template/Guided sample selected path;
- guided sample emits real milestones;
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
- virtualized estimate target preparation.

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
