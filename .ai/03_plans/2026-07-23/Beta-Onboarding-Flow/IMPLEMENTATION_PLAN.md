# Beta Onboarding Flow Implementation Plan

## Status

- **Mode:** Plan Pack
- **Profile:** high-blast-radius
- **Package:** `PLAN-2026-07-23-beta-onboarding-flow`
- **Baseline:** `8aca41a3f06463ec53f59e20e7a53c92391b3a88`
- **Implementation:** not started
- **First ready unit:** `UNIT-001`
- **Planning result:** implementation-ready after independent challenge and
  static pack validation
- **Stop condition for this planning task:** the whole application and active D1
  schema are audited, current React Joyride and onboarding guidance is
  reconciled, implementation ownership is acyclic, every requirement maps to
  evidence, and no product code or database is changed.

## Execution Contract

- **Target result:** beta users receive timely, optional, role-aware guidance
  that gets them to a valid estimate quickly and remains replayable from
  Settings without corrupting product activation truth.
- **Implementation owner:** one lead `executor` owns integration, shared-file
  ordering, evidence reconciliation, and the final claim. Optional bounded
  assignments use the packets below; they never create a second integrator.
- **Capability classes:** dependency-aware TypeScript, D1/data lifecycle,
  Next.js App Router/auth, accessible interaction, and verification. A
  specialist may advise, but the assigned unit owner remains accountable.
- **Local permissions:** read current source and pack artifacts; edit only the
  current unit's owned paths; install the exact dependency only in `UNIT-001`;
  run source/diff, TypeScript/LSP, focused lint/static, and SQL-review evidence.
- **Prohibited side effects:** no remote D1 apply, deployment, paid service,
  product-test execution, build-as-test gate, browser automation, screenshot,
  visual QA, branch/worktree/history mutation, or unrelated-provider change.
- **Escalation condition:** stop only the affected unit when source drift
  invalidates an accepted contract, a required write falls outside the unit
  packet, an irreversible/external action is required, or two materially
  different local recovery attempts fail. Return the exact evidence and safe
  next action to the lead; do not broaden scope silently.
- **Success criteria:** `AC-001` through `AC-011` are reconciled independently.
- **Core architecture:** a server-fed, dynamically loaded client island in the
  authenticated Workshop shell uses React Joyride v3 in uncontrolled mode.
  Archestimator owns durable semantic progress, eligibility, route intent, and
  audit history; Joyride owns only the active in-memory step index.
- **Data boundary:** existing account setup and `beta_activation_*` records stay
  authoritative for profile/workspace setup and real product milestones. New
  instructional state is stored separately.
- **User-control boundary:** tours may be skipped, dismissed, resumed, replayed,
  or restarted. Replay/restart never deletes projects, estimates, activation
  milestones, or checklist achievements.
- **Write discipline:** one lead executor owns integration. A path has one
  writer at a time. Reread shared files before each unit because this is a
  shared worktree.
- **Allowed local evidence:** source/diff inspection, TypeScript/LSP, focused
  lint/static analysis, SQL review, and plan validators.
- **Proposed evidence:** product tests, builds used as test gates, browser
  automation, screenshots, and visual QA remain explicitly unrun unless a
  future implementation request authorizes that exact scope.
- **External boundary:** no remote D1 apply, Cloudflare deployment, paid
  service, production mutation, or unrelated-provider change is part of this
  pack.

## Outcome Contract

Archestimator must provide one coherent onboarding system after authentication,
terms acceptance, and workspace resolution. It must orient users without
blocking productive work, use authoritative domain facts and events to
recognize progress,
adapt to permissions and available data, recover safely from missing targets,
and remain available on demand.

### In scope

- Authenticated Workshop shell, route header, primary/project navigation, and
  mobile navigation readiness.
- Whole-app disposition audit for Workshop home, Projects, project dashboard,
  Estimates, estimate workspace, Library, Proposals, Client links,
  collaboration, project insights, Client Portals, Settings, and Support.
- Beta-v1 implementation changes only for the authenticated shell/runtime,
  mobile navigation, Getting started/checklist, first-estimate guidance,
  Library reuse, Client links, Settings, Support, auth return, modal ownership,
  and required activation/onboarding data lifecycle.
- React Joyride `3.2.0` dependency review and exact-version installation during
  implementation.
- Versioned flow definitions, typed targets, eligibility, route intents,
  recovery codes, custom tooltip, and dedicated portal ownership.
- Short first-run orientation for creators and collaborators.
- Four-item first-value checklist backed by current domain rows and activation
  events, not tooltip views.
- Guided-sample, blank-project, and template start paths.
- Contextual feature guides unlocked by role, capability, feature availability,
  route, resource state, and activation milestones.
- `/workshop/getting-started` as a real self-serve onboarding center.
- `/workshop/onboarding` as a compatibility redirect to the onboarding center.
- Settings **Guidance & tours** status, resume, replay, restart, checklist
  reopen, and reset-all-guidance actions.
- Fix-forward D1 migration, repository/actions, optimistic concurrency,
  idempotency, privacy export/erase, retention, legal holds, account deletion,
  and membership-deletion ordering.
- Sanitized onboarding diagnostics and support handoff.

### Out of scope

- Joyride or instructional persistence on public login, signup, invite, share,
  client-portal recipient, marketing, legal, or trust routes.
- A first-run tour of every feature, a blocking setup wizard, or completion
  based on merely viewing tooltips.
- Platform-admin onboarding in `/admin`; that separate operator shell is
  audited here but requires its own platform-scoped flow rather than reusing a
  workspace-scoped beta-user record.
- Email onboarding campaigns, customer-success scheduling, experimentation
  vendors, session replay, new analytics vendors, or AI-personalized copy.
- Permission-model changes, business-data resets, or workspace-wide
  administrator resets of another user’s guidance.
- Repair of unrelated application defects found by the audit unless a listed
  defect directly prevents truthful onboarding.
- Product changes to Proposals, collaboration, project insights, Client
  Portals, or other `HELP_ONLY` inventory rows beyond incidental shared
  shell/modal integration.
- Automated product tests, builds, browser proof, screenshots, dependency
  installation, migration apply, or deployment during this planning task.

## Assumptions And Revalidation Triggers

These are implementation-start assumptions, not hidden design choices. The
named unit owner must record the fresh observed value before editing. A mismatch
invalidates only the affected unit and its dependents until the contract is
reconciled.

| ID | Current basis | Revalidate before | Drift response |
| --- | --- | --- | --- |
| `ASSUMP-001` | Registry metadata observed 2026-07-23: `react-joyride` latest is `3.2.0`, MIT, with React/React DOM peer range `16.8 - 19`; the repository has React `19.2.7` and no installed Joyride dependency. | `UNIT-001` | Re-run package metadata and official v3 API review. If version, peer range, license, or exports changed, stop `UNIT-001`, update `DEC-AUTO-002`/`OPS-001`, and do not install by guess. |
| `ASSUMP-002` | Active migration head is `0100_user_support_system.sql`; `0101_beta_onboarding_flow_state.sql` does not exist. | `UNIT-002` | Re-list active migrations and activation-table consumers. Renumber the new fix-forward migration and reconcile the rebuild contract if the head or schema changed. Never edit an issued migration. |
| `ASSUMP-003` | Baseline inventory contains 72 active `page.tsx` routes and 23 direct Workshop/Support modal owners, with the route/auth/overlay rules recorded in `04-ROUTE-AND-OVERLAY-INVENTORY.md`. | `UNIT-003`, then affected UI units | Re-run the inventory commands in `04`; classify every added/removed/moved route or modal owner before implementation. Update ownership and target dispositions before writing UI. |

## Requirements

| ID | Requirement | Completion evidence |
| --- | --- | --- |
| `REQ-001` | Implementation must use the whole-app and whole-active-D1 audit in this pack, preserve explicit exclusions, and revalidate any stale source before editing. | Current-state audit, source revision, stale-trigger reconciliation, and focused diff. |
| `UX-001` | A first eligible Workshop session must receive a short, optional orientation selected for creator, collaborator, direct-estimate, returning-user, and viewport context. | Eligibility matrix, flow-definition evidence, and route/component behavior. |
| `UX-002` | The first-value system must guide users to a real project, estimate, area/priced row, and valid total; checklist completion must come from domain events rather than tooltip views. | Activation/checklist contract and behavior evidence. |
| `UX-003` | Feature discovery must cover relevant Workshop modules through short contextual guides without forcing irrelevant, unavailable, or unauthorized steps. | Capability/route catalog and guide eligibility evidence. |
| `UX-004` | Guidance must be accessible, responsive, interruptible, resumable, replayable, and resettable from Settings with unambiguous semantics. | Keyboard/focus/reflow/reduced-motion/settings evidence. |
| `DATA-001` | Instructional progress must be durable, versioned, idempotent, optimistic-concurrency safe, and scoped to the authenticated user and workspace. | Migration, repository, state-transition, conflict, and retry evidence. |
| `DATA-002` | Instructional state must coexist with activation truth and participate in backfill, privacy export/erase, retention, legal holds, account deletion, and membership deletion. | Data lifecycle and deletion-order evidence. |
| `SEC-001` | Server-derived identity, effective workspace/project/estimate access, capabilities, route IDs, targets, telemetry, and support context must prevent tenant disclosure or client-forged progress. | Authorization, allowlist, redaction, and negative-path evidence. |
| `SEC-002` | Authentication, terms acceptance, and account setup must preserve a sanitized protected return intent, reauthorize the destination, and never expose token-bearing public paths or redirect loops. | Auth-chain source review and redirect behavior evidence. |
| `PERF-001` | Public routes and ineligible Workshop sessions must not pay the full Joyride cost; target waits, route transitions, and virtualized adapters must be bounded and cancelable. | Import graph, bundle measurement, timeout, cancellation, and mount evidence. |
| `OPS-001` | The implementation must use current Joyride v3 and Next.js 16 contracts, provide typed recovery and operational diagnostics, and remain locally reversible without deleting progress. | Dependency, framework, recovery, logging, and rollback evidence. |

## Architecture Decisions

### `DEC-AUTO-001` Use a hybrid onboarding system

Do not build one linear tour across the entire app. Use:

- one three-to-four-step first-run orientation;
- one four-task activation checklist;
- task-launched route-local walkthroughs; and
- one-to-three-step contextual feature guides.

This reduces interruption, avoids brittle cross-route sequencing, and lets real
domain state recognize self-directed users.

### `DEC-AUTO-002` Use React Joyride v3.2.0 in uncontrolled mode

During `UNIT-001`, add exact dependency `react-joyride@3.2.0` and update
`bun.lock`. Use the named v3 exports and `useJoyride`.

Do not set `stepIndex`. Official v3 guidance defaults to uncontrolled mode and
warns that external index changes can desynchronize lifecycle, overlay, and
keyboard handling. Resolve the persisted semantic `current_step_key` against
the current eligible step list, then start with `controls.start(resumeIndex)` or
`initialStepIndex`.

Use one orchestration reducer for:

```text
idle → resolving → preparing_route → running → paused → terminal
```

That reducer does not mirror or drive Joyride’s active numeric index.

### `DEC-AUTO-003` Keep product activation and instructional progress separate

- `user_onboarding_profiles` remains user-global profile/setup data.
- `workspace_account_settings` remains workspace-global setup data.
- `beta_activation_progress/events/outbox` remain real product-activation
  truth.
- New `beta_onboarding_flow_states/events` record only guidance state and
  operational outcomes.

Never mark a checklist item complete because a tour step was shown or a page
was visited.

### `DEC-AUTO-004` Scope instructional state to user × workspace × flow × version

The canonical identity is:

```text
user_id + workspace_id + flow_key + flow_version
```

The state row carries `generation`, `status`, `current_step_key`, `revision`,
reset count, and lifecycle timestamps. A reset starts a new generation without
destroying activation milestones or prior audit events.

### `DEC-AUTO-005` Use two new tables, not a parallel workflow platform

Add:

1. `beta_onboarding_flow_states` for the current durable projection.
2. `beta_onboarding_flow_events` for append-only, deduplicated, sanitized
   lifecycle and failure evidence.

Do not add per-step state, receipt, outbox, queue, JSON workflow-definition, or
admin-reset tables unless implementation evidence proves the state row, event
dedupe key, D1 batch, and compare-and-set revision are insufficient.

### `DEC-AUTO-006` Use semantic targets owned by rendering components

Add a typed target catalog and render:

```html
data-onboarding-target="estimate.total"
```

Do not target copy, Tailwind classes, child positions, random IDs, tenant UUIDs,
or implementation-only selectors. Each definition identifies:

- target key;
- route key;
- eligible roles/capabilities;
- desktop/mobile applicability;
- required data state;
- interaction policy; and
- missing-target behavior.

### `DEC-AUTO-007` Prefer route-local guides over a monolithic multi-route tour

The onboarding center/checklist navigates users to work. A route-local guide
starts after the destination is ready. Use Joyride `before` hooks only when a
step must open known UI or perform an allowlisted route transition.

For ordinary streamed mounts, use Joyride’s bounded `targetWaitTimeout`. Add a
custom coordinator only for:

- validated dynamic project/estimate routes;
- explicit page readiness;
- known virtualized estimate targets; or
- recovery that Joyride cannot express.

### `DEC-AUTO-008` Make the first-value checklist domain-driven

The creator/editor checklist contains four tasks:

1. Create or open a project.
2. Create or open an estimate.
3. Add an area and at least one priced row.
4. Reach a valid saved total.

Do not add an `estimate_created` activation milestone solely for onboarding.
Resolve the estimate task from an authorized `estimates` row/current resource
context, while the existing activation ledger remains authoritative for later
area, priced-row, and valid-total milestones. A guided sample must create the
same domain records and later milestones as equivalent real work. Viewers and
direct-estimate collaborators receive a separate orientation, not impossible
creator tasks.

### `DEC-AUTO-009` Repair mobile navigation before claiming mobile onboarding

The Workshop and project navigation are hidden below `lg` with no equivalent
source-visible mobile control. Extract shared navigation definitions and add a
mobile Workshop/project navigation surface before mobile tour steps target
navigation.

Mobile flows use their own target list. They do not silently reuse desktop
sidebar selectors.

### `DEC-AUTO-010` Permit only one modal focus owner

Joyride’s tooltip is an `alertdialog` with focus trapping. The app already owns
modal focus, inert state, Escape behavior, and restoration.

- Mount a dedicated Workshop Joyride portal.
- Keep the tour below application modals.
- Pause/remove the tour tooltip before opening Settings, Support, or another
  application dialog.
- Resume only after the app modal closes and focus restoration finishes.
- Preserve Joyride’s focus trap by default.
- Disable it only for a reviewed, interactive step that cannot be redesigned
  outside an application modal.

### `DEC-AUTO-011` Separate resume, replay, restart, reopen, and reset

- **Resume:** continue an incomplete flow from its semantic step.
- **Replay:** run a completed flow from step one without changing completion or
  activation truth.
- **Restart:** set one instructional flow to a new generation at step one.
- **Reopen checklist:** clear only checklist dismissal state.
- **Close/Escape:** pause the runtime, preserve `in_progress`, and persist the
  current semantic step; it is not a dismissal.
- **Skip / Don't show again:** set the current instructional flow to
  `dismissed`.
- **Reset all guidance:** atomically increment the generation/reset count and
  return each existing eligible current-version flow to `not_started`; do not
  auto-launch while Settings is still open.

All actions are authenticated server commands with idempotency keys and
revision checks. Settings copy states these boundaries before mutation.

### `DEC-AUTO-012` Preserve privacy by design

Persist only semantic flow/step IDs, version, generation, outcome, bounded route
key, viewport class, source, reason code, revision, and timestamps.

Never persist selectors, page copy, project/estimate names, resource UUIDs,
arbitrary URLs/query strings, free-form errors, tooltip content, or DOM data.

### `DEC-AUTO-013` Treat the archived Joyride plan as historical only

`.ai/09_archive/2026-06-03-react-joyride-onboarding-implementation-plan/`
contains useful product ideas but assumes superseded Supabase and earlier route
contracts. Do not copy its schema, APIs, or execution status into this plan.

### `DEC-AUTO-014` Keep product tests as explicit proposals

The implementation may use permitted static evidence immediately. Keep every
product test, browser, screenshot, and build command in this pack as
`TEST_PROPOSAL` until the user explicitly requests that exact test scope. This
is an evidence gap, not an authorization or technical blocker.

### `DEC-AUTO-015` Support every effective access source

Instructional state is scoped to a workspace, but eligibility is not restricted
to `workspace_members`. The server derives effective access from current
workspace, project, or estimate grants. `workspaceRole` may be `null`; an
`accessSource` and capability set describe the authorized surface. New
instructional and rebuilt activation tables reference the workspace lifecycle,
not a membership row, so direct collaborators and retained legal-hold rows are
valid without synthetic membership.

### `DEC-AUTO-016` Preserve safe protected return intent

Authentication, terms acceptance, and account setup preserve only sanitized
protected `/workshop` and `/admin` destinations plus the existing pending-invite
path. Strip fragments, reject nested auth destinations and token-bearing public
routes, cap length, preserve a query only after sensitive-key rejection, and
reauthorize at the destination. Fall back to `/workshop`.

## Experience Sequence

### First-run creator

1. Render Workshop normally; do not cover loading or auth gates.
2. After shell readiness and no app modal, show a centered welcome step that
   names the outcome and estimated length.
3. Orient to Projects and the persistent Getting started/Support affordances.
4. End with one primary CTA: **Build my first estimate**.
5. Open `/workshop/getting-started`, where the user chooses Blank project,
   Workspace template, Guided sample, or Explore on my own.
6. Launch route-local guidance only for the chosen task.
7. Complete checklist tasks from domain facts and activation events.
8. Celebrate the valid-total milestone and offer optional Library or sharing
   guidance only when eligible.

### Invited collaborator or direct-estimate user

1. Welcome them to the assigned workspace/resource.
2. Explain their effective role and that project and estimate access can differ.
3. Route to an authorized project/estimate supplied by the server.
4. Point to read/edit affordances they actually possess.
5. End at Support/Guidance; do not show creator checklist tasks they cannot
   perform.

### Returning or already activated user

- Do not auto-start the first-run tour.
- Backfill/import completion or resume state from existing activation evidence.
- Keep every eligible guide available in Settings and Getting started.
- Trigger contextual guides only on first relevant use and only when the
  associated capability has not already been exercised.

## Contextual Guide Catalog

| Flow key | Eligibility | Maximum | Outcome |
| --- | --- | ---: | --- |
| `core_orientation` | New eligible Workshop user | 4 steps | Understand current workspace, navigation, guidance, and support. |
| `collaborator_orientation` | Invited/project/estimate collaborator | 4 steps | Understand assigned work and effective access. |
| `first_estimate_value` | Can edit estimate; valid total not reached | 5 steps | Understand hierarchy, add priced work, and confirm total/save state. |
| `library_reuse` | Has estimate context and Library capability | 3 steps | Reuse workspace/project components and templates correctly. |
| `client_sharing` | Project manager; publication enabled; valid estimate | 3 steps | Create/manage Client links without confusing Proposals or Portals. |

Blank/Template/Guided-sample selection belongs to the onboarding center and
existing zero state, not another Joyride flow. Project insights, collaboration,
Proposals, Client Portals, Favorites, export, linked templates, Ask Flip,
organization settings, and other advanced surfaces receive truthful help links
or later versioned catalog entries, not beta-v1 tours. They never extend the
first-run tour.

## Execution DAG

```text
UNIT-001 ─┬─> UNIT-002 ─┐
          └─> UNIT-003 ─┴─> UNIT-004 ─┬─> UNIT-005 ─┐
                                      ├─> UNIT-006 ─┼─> UNIT-008
                                      └─> UNIT-007 ─┘
```

`UNIT-002` and `UNIT-003` may run in parallel only after `UNIT-001` freezes the
shared types and target/flow vocabulary. `UNIT-005`, `UNIT-006`, and `UNIT-007`
may run in parallel only after the lead accepts `UNIT-004`. The same lead may
instead run every unit sequentially without changing the contract.

`UNIT-001` is the sole writer for `flow-catalog.ts` and `target-catalog.ts`;
later units consume those frozen contracts without editing them. `BARRIER-001`
precedes `UNIT-004`: the lead accepts both data and runtime handoffs, confirms
that the catalogs did not drift, and resolves any shared-type conflict.
`BARRIER-002` precedes `UNIT-008`: the lead accepts all three feature handoffs,
reconciles the focused diff, and verifies no concurrent writer touched the same
production path. After `UNIT-003`, `WorkshopRouteHeader.tsx` transfers
read-only to `UNIT-004`, and `EstimateSheetContent.tsx` transfers sequentially
to `UNIT-005`.

## Executor Assignment And Handoff Contract

Each assignment consists of its matrix row plus the matching unit section.
The unit's **Owned paths** are the complete write allowlist; all other
repository paths are prohibited unless they are named in the unit's work,
acceptance, recovery, or matrix read scope. The default read allowlist is this
canonical plan, `plan-pack.json`, artifacts `01` through `04`, the unit-owned
paths, and the row's additional read scope. The parent Task Contract is the
Execution Contract, Outcome Contract, requirements, and assumptions above. The
owner must reread each shared file immediately before editing and must not
delegate again.

For a delegated assignment:

- **Agent type:** use the matrix role; `worker` is prohibited outside an active
  team runtime.
- **Timeout:** one bounded execution turn, maximum 120 minutes. On timeout,
  stop further writes, preserve the focused diff, and return `CANCELLED` with
  reason `TIMEOUT`; ownership remains assigned until the lead consumes and
  closes the handoff.
- **Retry:** after consuming a `FAILED` or timeout-cancelled handoff, the lead
  may issue one same-scope retry with the failed evidence. A second failure
  returns `FAILED` with both signals; the lead then takes over or serializes the
  smallest safe continuation.
- **Authorized commands:** repository reads, `apply_patch`, and the exact
  static evidence named in the row. Only `UNIT-001` may change dependency
  files. Product tests/builds/browser/remote operations remain prohibited
  unless a newer implementation request explicitly changes the test decision.
- **Return shape:** assignment ID; `COMPLETE|PARTIAL|FAILED|CANCELLED`; completed
  and incomplete work; acceptance criteria addressed; inspected/changed paths;
  decisions, assumptions, and deviations; commands and exact results;
  explicitly unrun tests/proof boundaries; conflicts, cleanup, remaining risk,
  confidence, unresolved questions, recommended next action, exact completion
  signal, and confirmation that no prohibited side effect occurred.
- **Integration:** only the lead accepts a handoff, resolves overlap, updates
  evidence state, and advances a barrier.

| Unit / assignment | Owner and capability | Additional read scope | Required static return | Test decision and completion signal |
| --- | --- | --- | --- | --- |
| `UNIT-001` / `BETA-001-CONTRACTS` | Lead `executor`; dependency-aware TypeScript contracts | Registry/package metadata, `package.json`, `bun.lock`, local Next.js docs, current onboarding imports | Exact package/peer/license receipt; changed dependency diff; typed catalog/eligibility output; focused type/LSP/lint/import evidence | `NOT_REQUIRED`; `HANDOFF BETA-001-CONTRACTS CONTRACTS_FROZEN` unlocks `UNIT-002` and `UNIT-003` |
| `UNIT-002` / `BETA-002-DATA` | `executor`; D1 migration and data lifecycle | Active migrations, activation/profile/privacy/deletion/collaboration consumers, frozen flow types | Migration number/head receipt; schema/rebuild/FK/index/backfill review; repository/action static output; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-002-DATA DATA_READY` waits at `BARRIER-001` |
| `UNIT-003` / `BETA-003-RUNTIME` | `executor`; Next.js App Router, auth, accessible overlays | Local Next.js server/client/navigation docs, auth chain, shell/navigation, all modal owners, frozen catalogs | Protected-return and import-boundary review; route/modal inventory reconciliation; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-003-RUNTIME RUNTIME_READY` waits at `BARRIER-001` |
| `UNIT-004` / `BETA-004-FIRST-RUN` | Lead `executor`; onboarding UX plus authoritative domain state | Accepted `BARRIER-001` handoffs, current checklist/zero-state/dashboard writers | Start-path/checklist truth matrix; role/empty/error/completed-state source review; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-004-FIRST-RUN FIRST_RUN_READY` opens `UNIT-005`–`007` |
| `UNIT-005` / `BETA-005-ESTIMATE` | `executor`; estimate editor and virtualized-target integration | Accepted runtime/first-run handoffs, estimate owner APIs, performance protocol | Target-owner and route-readiness map; bounded wait/cancel review; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-005-ESTIMATE ESTIMATE_GUIDE_READY` waits at `BARRIER-002` |
| `UNIT-006` / `BETA-006-DISCOVERY` | `executor`; capability-aware contextual UX | Accepted runtime/first-run handoffs and route dispositions for Library/Client links | Eligibility/feature/resource disposition reconciliation; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-006-DISCOVERY DISCOVERY_READY` waits at `BARRIER-002` |
| `UNIT-007` / `BETA-007-SETTINGS` | `executor`; settings mutations, privacy, support recovery | Accepted data/runtime/first-run handoffs, frozen actions/catalogs, support allowlist | Action-semantics and non-regression matrix; privacy/support allowlist review; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-007-SETTINGS SETTINGS_READY` waits at `BARRIER-002` |
| `UNIT-008` / `BETA-008-VERIFY` | Lead-owned `verifier`; evidence reconciliation | Entire accepted diff, all handoffs, manifest, criteria/risks/gates, current source revision | Fresh allowed static outputs; one receipt per criterion/gate; explicit unresolved behavioral gaps; manifest/diff reconciliation | Keep `TEST_PROPOSAL` commands unrun unless newly authorized; `HANDOFF BETA-008-VERIFY VERIFIED_LOCAL` ends implementation |

## Unit Contracts

### `UNIT-001` Freeze dependency, flow, and target contracts

- **Assignment:** `BETA-001-CONTRACTS`
- **Status:** READY
- **Depends on:** none
- **Owned production paths:** `package.json`, `bun.lock`, new
  `src/lib/onboarding/flow-types.ts`, new
  `src/lib/onboarding/flow-catalog.ts`, new
  `src/lib/onboarding/target-catalog.ts`, new
  `src/lib/onboarding/flow-eligibility.ts`.
- **Work:** add exact `react-joyride@3.2.0`; record MIT/peer/dependency posture;
  define flow, step, route, viewport, capability, status, event, source, reason,
  and target unions; define eligible-step filtering and semantic resume
  resolution; prohibit v2 APIs and controlled `stepIndex`.
- **Acceptance:** one typed vocabulary serves persistence, server host, client
  controller, Settings, Support, and telemetry; public routes import none of
  the Joyride runtime; dependency and lockfile changes are isolated.
- **Recovery:** remove the dependency and new isolated contracts; no schema or
  progress exists yet.

### `UNIT-002` Add durable instructional state and lifecycle integrity

- **Assignment:** `BETA-002-DATA`
- **Status:** READY
- **Depends on:** `UNIT-001`
- **Owned production paths:** new
  `migrations/0101_beta_onboarding_flow_state.sql`, new
  `src/lib/onboarding/flow-repository.ts`, new
  `src/lib/onboarding/flow-actions.ts`, new
  `src/lib/onboarding/flow-retention.ts`,
  `src/lib/onboarding/activation-types.ts`,
  `src/lib/onboarding/activation-repository.ts`,
  `src/lib/onboarding/activation-actions.ts`,
  `src/lib/onboarding/activation-retention.ts`,
  `src/lib/onboarding/activation-outbox.ts`,
  `src/lib/compliance/privacy-request-repository.ts`,
  `src/lib/auth/delete-account-repository.ts`,
  `src/lib/collaboration/actions.ts`, and
  `src/lib/collaboration/invitation-d1-store.ts`.
- **Work:** create state/event tables; rebuild all four `beta_activation_*`
  tables with workspace-lifecycle rather than membership FKs while preserving
  their existing milestone taxonomy; add CAS, request fingerprints, run
  identity, and idempotency; implement
  start/resume/advance/pause/dismiss/complete/replay/restart/reset-all commands;
  persist selected start path; derive estimate-task truth from authorized
  estimates; backfill current users from unambiguous activation/domain evidence;
  repair checklist zero-row and duplicate-activation mutations; separate
  workspace erasure, access revocation, and full-account deletion; include
  onboarding/profile/activation rows in privacy/deletion order; reuse activation
  legal holds and event-retention policy.
- **Acceptance:** duplicate commands are safe; stale revisions return current
  state; identity/workspace/effective access come from the server; project-only
  and estimate-only users are supported; final-access deletion cannot be blocked
  by retained activation/onboarding rows; reset preserves activation truth;
  existing users are not incorrectly auto-enrolled.
- **Recovery:** fix forward only. Disable eligibility in source if UI recovery
  is required; never edit issued migrations or delete existing progress.

### `UNIT-003` Repair auth return and build the shell runtime

- **Assignment:** `BETA-003-RUNTIME`
- **Status:** READY
- **Depends on:** `UNIT-001`
- **Owned production paths:** `src/components/workshop/WorkshopShell.tsx`,
  `src/components/workshop/WorkshopRouteHeader.tsx`,
  `src/components/sidebar/MainSidebar.tsx`,
  `src/components/sidebar/SidebarNavItemRow.tsx`,
  `src/components/workshop/ProjectMiniSidebar.tsx`,
  `src/lib/auth/request-proxy.ts`, `src/lib/auth/redirects.ts`,
  `src/lib/auth/account-setup.ts`, `src/lib/auth/actions.ts`,
  `src/components/auth/LoginForm.tsx`,
  `src/app/workshop/terms/page.tsx`,
  `src/components/workshop/TermsAcceptancePanel.tsx`,
  `src/components/ui/overlays/dialog.tsx`,
  `src/components/ui/overlays/modal.tsx`,
  `src/components/workshop/ResizableSidePanel.tsx`,
  `src/components/workshop/component-library/CommandPalette.tsx`,
  `src/components/workshop/component-library/index.tsx`,
  `src/components/workshop/estimate-sheet/activity-history.tsx`,
  `src/components/workshop/EstimateSheetContent.tsx`,
  `src/components/workshop/ProposalExportPreviewDialog.tsx`, new
  `src/components/workshop/navigation/workshop-navigation.ts`, new
  `src/components/workshop/navigation/project-navigation.ts`, new
  `src/components/workshop/navigation/WorkshopMobileNavigation.tsx`, new
  `src/components/workshop/navigation/ProjectMobileNavigation.tsx`, new
  `src/components/onboarding/AuthenticatedOnboardingHost.tsx`, new
  `src/components/onboarding/OnboardingClientBoundary.tsx`, new
  `src/components/onboarding/OnboardingTourClient.tsx`, new
  `src/components/onboarding/OnboardingTooltip.tsx`, new
  `src/components/onboarding/OnboardingPortal.tsx`, new
  `src/components/onboarding/onboarding-route-coordinator.ts`, new
  `src/components/onboarding/onboarding-target-resolver.ts`, new
  `src/components/onboarding/onboarding-launch-intent.ts`, new
  `src/components/onboarding/OnboardingRecovery.tsx`, new
  `src/components/ui/overlays/modal-lifecycle.ts`.
- **Work:** preserve sanitized post-auth/terms/account-setup destinations and
  reauthorize them; keep the shell server-rendered; lazy-load the client island only for
  auto-start/replay/resume eligibility; add shared desktop/mobile navigation;
  mount typed semantic targets; use uncontrolled `useJoyride`; coordinate
  pathname/readiness; bound/cancel route preparation; add one shared modal
  lifecycle signal plus adapters for every bypass in
  `04-ROUTE-AND-OVERLAY-INVENTORY.md`; persist the semantic step before
  programmatic stop; resume only after focus restoration; honor reduced motion.
- **Acceptance:** no public import path reaches Joyride; no ineligible session
  mounts it; desktop/mobile navigation share authorization truth; target
  failures never loop; app modal and tour never own focus concurrently; safe
  protected deep links survive auth/terms/setup while unsafe values fall back.
- **Recovery:** render the server host as `null` while preserving durable state
  and target attributes.

### `UNIT-004` Activate first-run orientation and Getting started

- **Assignment:** `BETA-004-FIRST-RUN`
- **Status:** READY
- **Depends on:** `UNIT-002`, `UNIT-003`
- **Owned production paths:**
  `src/app/workshop/getting-started/page.tsx`,
  `src/app/workshop/onboarding/page.tsx`,
  `src/app/workshop/page.tsx`,
  `src/components/workshop/FirstEstimateChecklist.tsx`,
  `src/lib/onboarding/first-estimate-checklist.ts`,
  `src/components/workshop/FirstProjectZeroState.tsx`,
  `src/components/workshop/dashboard/WorkshopDashboard.tsx`, and new
  `src/components/onboarding/GettingStartedProgress.tsx`.
- **Read-only inherited contracts:** `WorkshopRouteHeader.tsx`,
  `flow-catalog.ts`, and `target-catalog.ts` from `UNIT-001`/`UNIT-003`.
- **Work:** replace redirect-only routes; render a four-task domain-driven
  checklist; add start-path selection and actual writer; auto-start only the
  correct short orientation; suppress creator guidance for unauthorized users;
  show progress/recommendation/error/empty/completed states; keep Support
  available.
- **Acceptance:** a new creator can choose a path and know the next action; an
  invited viewer never sees impossible tasks; self-directed domain activity
  completes tasks; dismissed guidance remains accessible on demand.
- **Recovery:** keep the onboarding center and checklist available even if
  automatic orientation is temporarily disabled.

### `UNIT-005` Guide the first estimate to real value

- **Assignment:** `BETA-005-ESTIMATE`
- **Status:** READY
- **Depends on:** `UNIT-004`
- **Owned production paths:**
  `src/app/workshop/projects/[projectId]/estimates/page.tsx`,
  `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`,
  `src/components/workshop/ProjectEstimatesClient.tsx`,
  `src/components/workshop/EstimateWorkspaceClient.tsx`,
  `src/components/workshop/EstimateHeaderActions.tsx`,
  `src/components/workshop/EstimateSheetTree.tsx`,
  `src/components/workshop/EstimateSheetContent.tsx`,
  `src/components/workshop/ProjectTotalHeader.tsx`,
  `src/components/workshop/estimate-sheet/rows/row-table.tsx`,
  `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx`, new
  `src/components/onboarding/estimate-target-adapter.ts`.
- **Sequential handoff:** `EstimateSheetContent.tsx` ownership transfers from
  `UNIT-003` only after its modal adapter lands; `flow-catalog.ts` and
  `target-catalog.ts` remain read-only contracts from `UNIT-001`.
- **Work:** add route-local targets for hierarchy, area creation, row creation
  or known guided-sample row, pricing, valid total, save/error state, and
  relevant Library/Sources affordance; select/expand/scroll a known virtual row
  through its owner API; never target arbitrary DOM rows or mutate data merely
  to advance a tour.
- **Acceptance:** the guide survives streaming, an empty estimate, guided
  sample, existing estimate, virtualized rows, missing optional targets,
  read-only access, and route changes; completion still comes from activation
  events and authoritative domain facts.
- **Recovery:** skip the affected route-local guide while leaving the estimate
  editor and activation ledger untouched.

### `UNIT-006` Add bounded post-value feature discovery

- **Assignment:** `BETA-006-DISCOVERY`
- **Status:** READY
- **Depends on:** `UNIT-004`
- **Owned production paths:**
  `src/app/workshop/library/components/page.tsx`,
  `src/app/workshop/library/templates/page.tsx`,
  `src/components/workshop/library/LibraryComponentsRoute.tsx`,
  `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`,
  `src/app/workshop/publisher/page.tsx`,
  `src/components/workshop/publisher/PublisherRosterClient.tsx`.
- **Read-only inherited contracts:** `flow-catalog.ts` and
  `target-catalog.ts` from `UNIT-001`.
- **Work:** add only the two one-to-three-step post-value guides; distinguish
  Client links from Proposals, public shares, and Client Portals; enforce
  role/feature/resource eligibility; avoid the blank Library Overview; keep all
  other audited modules as help-link/no-tour decisions in
  `04-ROUTE-AND-OVERLAY-INVENTORY.md`.
- **Acceptance:** no guide points to hidden, unauthorized, blank, stale, or
  semantically different UI; advanced guidance does not auto-restart core
  orientation.
- **Recovery:** disable an individual catalog entry without changing shared
  state or the rest of the onboarding system.

### `UNIT-007` Add Settings replay/reset and support recovery

- **Assignment:** `BETA-007-SETTINGS`
- **Status:** READY
- **Depends on:** `UNIT-004`
- **Owned production paths:** `src/app/workshop/settings/page.tsx`,
  `src/components/workshop/WorkshopSettingsModal.tsx`,
  `src/components/workshop/WorkshopSettingsModalContent.tsx`,
  `src/app/workshop/feedback/page.tsx`,
  `src/components/support/SupportCenter.tsx`,
  `src/components/support/SupportChatWidget.tsx`, new
  `src/components/workshop/settings/GuidanceToursSettings.tsx`, new
  `src/lib/onboarding/support-context.ts`.
- **Read-only inherited contracts:** `flow-actions.ts` from `UNIT-002`, plus
  `flow-catalog.ts` and `target-catalog.ts` from `UNIT-001`.
- **Work:** list eligible flows and status; implement resume, replay, restart,
  checklist reopen, and reset-all-guidance; make the narrow Settings layout
  usable; close Settings before launching Joyride; add typed support context
  for target/route failures without raw URLs, IDs, or free-form diagnostics.
- **Acceptance:** each action has distinct copy and mutation semantics; replay
  does not regress completion; reset preserves activation/business data; focus
  returns correctly; support receives only allowlisted context.
- **Recovery:** Settings remains a read-only status center if mutation actions
  are disabled; no durable state is lost.

### `UNIT-008` Reconcile static and proposed evidence

- **Assignment:** `BETA-008-VERIFY`
- **Status:** READY
- **Depends on:** `UNIT-005`, `UNIT-006`, `UNIT-007`
- **Owned paths:** plan/evidence artifacts only. No production ownership.
- **Work:** run permitted type/lint/static/SQL/diff checks; execute product
  tests only if the implementation request explicitly authorizes their exact
  scope; inspect every actual output; reconcile every criterion and risk; leave
  bundle/browser/accessibility and other unrun behavioral evidence explicit.
- **Acceptance:** every criterion has its own fresh PASS evidence or a precise
  FAIL plus named evidence gap; optional unrun tests are not represented as
  authorization or technical blockers; no local evidence is described as
  hosted proof.
- **Recovery:** route failures back to the owning unit; do not weaken assertions
  or mark a test passed without output.

## Verification Strategy

1. Revalidate source revision and stale triggers before `UNIT-001`.
2. Review migration SQL, constraints, backfill, indexes, deletion order, and all
   current repository consumers.
3. Use TypeScript/LSP and focused lint/static import analysis after each unit.
4. Verify no public route or global provider imports the Joyride runtime.
5. Verify every target key has one typed definition and at least one
   role/viewport-appropriate owner.
6. Verify every Settings command against its data contract and activation
   non-regression invariant.
7. If explicitly requested for the implementation task, run only the exact
   targeted repository, component, browser, and bundle tests in
   `03-ARCHITECTURE-DATA-AND-VERIFICATION.md`.
8. Reconcile the manifest, focused diff, migration head, and remaining risks.

## Implementation Gates

- `GATE-DATA-01`: migration, CAS, idempotency, backfill, deletion, retention.
- `GATE-SEC-01`: server identity, membership/capability, route/telemetry
  allowlists, and tenant privacy.
- `GATE-NEXT-01`: client-island, dynamic import, App Router navigation, and
  server/client serialization.
- `GATE-UX-01`: value path, user control, empty/error/recovery states, mobile.
- `GATE-A11Y-01`: alertdialog/focus, keyboard, reflow, zoom, reduced motion.
- `GATE-PERF-01`: mount eligibility, client bundle impact, bounded waits.
- `GATE-VERIFY-01`: actual static evidence plus explicit, unrun
  `TEST_PROPOSAL` gaps; it is not an authorization boundary.

## Risks and Controls

| Risk | Failure mode | Control |
| --- | --- | --- |
| `RISK-001` | A grand tour overwhelms users and becomes brittle across routes. | Short orientation, event checklist, route-local contextual flows. |
| `RISK-002` | Old profile setup, activation, checklist, and Joyride become competing truths. | Explicit ownership split and one onboarding center. |
| `RISK-003` | A role/feature/data-specific target is absent and the tour hangs or advances incorrectly. | Eligibility filtering, semantic targets, bounded waits, typed recovery. |
| `RISK-004` | Joyride and app dialogs create nested focus traps or broken Escape/restoration. | Dedicated portal, one focus owner, pause-before-modal policy. |
| `RISK-005` | Desktop targets fail on mobile because navigation is hidden. | Shared mobile navigation prerequisite and separate viewport step lists. |
| `RISK-006` | Raw index persistence resumes the wrong step after a definition change. | Persist semantic step key/version; resolve to current eligible index. |
| `RISK-007` | Multi-tab or retry races regress durable progress. | Expected revision, idempotency key, legal transition reducer, conflict readback. |
| `RISK-008` | Telemetry/support leaks tenant URLs, IDs, names, selectors, or content. | Strict semantic allowlist and no free-form metadata. |
| `RISK-009` | Existing users are auto-enrolled despite prior activation. | Deterministic backfill/import and returning-user suppression. |
| `RISK-010` | Account or membership deletion fails or retains onboarding profile data. | Lifecycle repair before membership deletion and privacy reconciliation. |
| `RISK-011` | Joyride increases public or first-paint bundle cost. | Authenticated lazy island, eligibility gating, measured bundle delta. |
| `RISK-012` | Archived Supabase-era guidance is mistaken for current authority. | Current pack explicitly supersedes it; only current source is executable truth. |
| `RISK-013` | Project-only or estimate-only collaborators cannot persist guidance or are shown workspace-only tasks. | Workspace-lifecycle FK plus server-derived access source/capabilities. |
| `RISK-014` | Authentication drops or weaponizes a deep link before guidance starts. | Protected-route sanitizer, fragment/query policy, and destination reauthorization. |

## Requirement Traceability

| Requirement | Units | Acceptance criteria |
| --- | --- | --- |
| `REQ-001` | `UNIT-001`, `UNIT-008` | `AC-001` |
| `UX-001` | `UNIT-003`, `UNIT-004`, `UNIT-008` | `AC-002` |
| `UX-002` | `UNIT-002`, `UNIT-004`, `UNIT-005`, `UNIT-008` | `AC-003` |
| `UX-003` | `UNIT-003`, `UNIT-006`, `UNIT-008` | `AC-004` |
| `UX-004` | `UNIT-003`, `UNIT-004`, `UNIT-005`, `UNIT-007`, `UNIT-008` | `AC-005` |
| `DATA-001` | `UNIT-002`, `UNIT-007`, `UNIT-008` | `AC-006` |
| `DATA-002` | `UNIT-002`, `UNIT-004`, `UNIT-008` | `AC-007` |
| `SEC-001` | `UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-006`, `UNIT-007`, `UNIT-008` | `AC-008` |
| `SEC-002` | `UNIT-003`, `UNIT-008` | `AC-011` |
| `PERF-001` | `UNIT-001`, `UNIT-003`, `UNIT-005`, `UNIT-008` | `AC-009` |
| `OPS-001` | `UNIT-001`, `UNIT-003`, `UNIT-007`, `UNIT-008` | `AC-010` |

## Finish and Resume Contract

- **Exact next action:** execute `UNIT-001`; do not begin by editing UI.
- **First synchronization barrier:** freeze dependency and shared vocabulary
  before persistence and shell work diverge.
- **Second synchronization barrier:** reread flow types, target catalog,
  migration, shell, and Settings ownership before `UNIT-004`.
- **Do not skip:** returning-user import, collaborator/direct-estimate
  eligibility, authoritative estimate-task truth, mobile navigation, modal
  focus ownership, safe auth return, semantic resume, privacy/deletion, and
  reset non-regression.
- **Implementation finish:** update evidence only from actual outputs; leave
  proposed tests unresolved when they were not requested; do not require hosted
  deployment to call local implementation complete.
- **Resume:** re-audit when React Joyride, Next.js, shell/navigation, activation
  schema, permission policy, or migration head changes.
