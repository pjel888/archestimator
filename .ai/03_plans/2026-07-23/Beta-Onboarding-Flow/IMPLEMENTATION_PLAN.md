# Beta Onboarding Flow Implementation Plan

## Status

- **Mode:** Plan Pack
- **Profile:** high-blast-radius
- **Package:** `PLAN-2026-07-23-beta-onboarding-flow`
- **Baseline:** `a25eb56c69d4cea6e6ae2ffc1692229ae8382059`
- **Implementation:** not started
- **First ready unit:** `UNIT-001`
- **Planning result:** implementation-ready after current-source audit,
  comprehensive Estimate Sheet and Client links curriculum expansion,
  independent challenge, and static pack validation
- **Stop condition for this planning task:** the whole application and active D1
  schema are audited, current React Joyride and onboarding guidance is
  reconciled, the bounded starter workspace is exact and safely restorable,
  seeded assets cannot masquerade as learning, implementation ownership is
  acyclic, every requirement maps to evidence, and no product code or database
  is changed.

## Execution Contract

- **Target result:** beta users receive a bounded, immediately explorable starter
  workspace plus timely, optional, role-aware guidance. The starter set makes
  Projects, grouping, Components, Templates, and Estimate Sheet structure
  concrete; one comprehensive task-based learning path gets editors to a valid
  saved estimate and verifies independent transfer without corrupting product
  activation truth; a separate manager-only path guides verified Client link
  publication, sharing, maintenance, and safe recovery without crossing the
  public-recipient boundary.
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
- **Success criteria:** `AC-001` through `AC-014` are reconciled independently.
- **Core architecture:** a server-fed, dynamically loaded client island in the
  authenticated Workshop shell uses React Joyride v3 in uncontrolled mode.
  Archestimator owns durable semantic progress, tutorial identity, task
  evidence, eligibility, route intent, and audit history; Joyride owns only the
  active in-memory step index.
- **Data boundary:** existing account setup and `beta_activation_*` records stay
  authoritative for profile/workspace setup and real product milestones. New
  instructional and starter-claim state is stored separately. Starter/tutorial
  seed writes are source-classified and never count as user-origin practice,
  reuse, independent transfer, or activation.
- **User-control boundary:** tours may be skipped, dismissed, resumed, replayed,
  or restarted. Replay/restart never deletes projects, estimates, activation
  milestones, or checklist achievements. A tutorial can resume in place,
  restart instruction without data mutation, or create a fresh versioned copy
  only after safely archiving the prior tutorial copy. Starter restore recreates
  only inactive manifest keys whose latest claim is `missing` or `archived`
  and never overwrites surviving edits.
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
recognize progress, teach editors how an Estimate Sheet is structured and
priced, require user-origin practice before claiming comprehension, adapt to
permissions and available data, provide a coherent editable starter workspace,
recover safely from missing targets or starter/tutorial drift, and remain
available on demand. Eligible publication managers must also receive a
literal, resumable Client links path that preserves scope, access, recipient,
status, and public-boundary truth.

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
- Four-item first-value checklist backed by user-domain rows/events and
  qualifying mutations, not tooltip views, route visits, or seeded opens.
- Guided tutorial, blank-project, workspace-template, and self-directed start
  paths with truthful decision support.
- Starter-pack version `1`: three shared Projects/four Estimate
  Sheets—`Tutorial — Residential Fit-Out`, `Reference — Small Commercial
  Refresh` with `Base Scope` and `Value Option`, and `Sandbox — Quick
  Estimate`.
- One per-user **Starter Examples** Project group containing Tutorial and
  Reference, while Sandbox deliberately remains ungrouped.
- Six persisted workspace Components across two created/claimed custom folders,
  `Starter — Finishes` and `Starter — Fixtures & Services`, plus one Component
  parented to protected `Uncategorized` resolved by
  `is_default_category = 1`, including at least one two-variant Component; plus
  three persisted workspace Templates categorized as `Residential Rooms` or
  `Exterior + Site`.
- Shared Tutorial `Estimate Sheet Foundations`, with one main sheet, one parent
  work group, three recognizable Areas, three-to-five rows, one worked example,
  one incomplete practice row, and one project-specific row; explicit Guided
  tutorial start creates/resumes a normal per-user practice Project from the
  immutable manifest outside starter-pack cardinality.
- A route-local Estimate Sheet learning rail with resumable Core/Optional
  lessons covering Project/Estimate/Tab/Area/Row hierarchy, every current row
  math column, quantity/cost editing, authoritative save and recovery states,
  add/source work, organization, Component/Template reuse, and graduation to
  non-starter work.
- A read-only orientation variant for viewers and direct-estimate users who
  cannot complete editor tasks.
- Optional post-value Component insertion/duplication/edit practice and a
  Template capstone through normal product actions; merely receiving or viewing
  starter assets earns no learning or activation credit.
- A route-local `client_link_publishing` learning rail for authorized managers:
  roster/filter/status literacy, exact Estimate Sheet scope, client/access
  review, verified create/republish, copy/selectable-link or authenticated
  Preview, optional recipients/activity and maintenance, and non-destructive
  safety education.
- Explicit separation of Client links, public `/share/[token]`, Proposals, and
  Client Portals; no instructional URL/token persistence and no automatic
  recipient email, Replace link, Turn off link, or Portal migration.
- Automatic idempotent installation immediately after new workspace creation
  and for a pre-existing workspace only when the closed business-table
  predicate is empty; explicit **Add starter content** for an existing
  non-empty workspace; shared assets install once while each joining editor
  receives only per-user group/membership keys.
- Explicit starter restore that recreates only inactive manifest keys whose
  latest claim is `missing` or `archived`, with a new asset generation, and
  never overwrites surviving edits.
- Tutorial resume, instruction-only restart, explicit archive, and fresh-copy
  recovery without silent overwrite or duplicate active samples.
- Separate starter-seed, tutorial-seed, guided-practice, and non-starter
  transfer signals so beta reporting cannot confuse seeded value with learned
  behavior.
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
- Unbounded persona/demo galleries, more starter assets than the closed
  version-1 manifest, video-course infrastructure, certification, or a full
  in-app academy.
- Treating starter installation, tutorial creation, seeded totals, starter
  asset views, tooltip views, or automatic seed events as proof that a user
  understands the Estimate Sheet or reusable Library.
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
| `ASSUMP-003` | Baseline inventory contains 72 active `page.tsx` routes, 23 direct Workshop/Support modal owners found by the canonical source search, and three additional publisher wrapper/focus owners (`PublisherDrawer`, `ShareWizard`, and `ClientPortalComposer`), for 26 tracked owners total, with route/auth/overlay rules recorded in `04-ROUTE-AND-OVERLAY-INVENTORY.md`. | `UNIT-003`, then affected UI units | Re-run both inventory commands in `04`; classify every added/removed/moved route, direct modal owner, or publisher wrapper owner before implementation. Update ownership and target dispositions before writing UI. |
| `ASSUMP-004` | Current guided-sample code still creates one project, one estimate, one generic Area, and one priced row through `activation-actions.ts`; Project groups are per-user memberships; persistent Component folders/Components/Templates are D1-backed; project/node/row activation producers hard-code the existing `project`/`estimate` sources and have no separate origin class; and no closed starter-pack claim ledger exists. | `UNIT-005` | Re-read guided sample, Project/group, Estimate, activation producer, Component/folder/Template persistence, and current Projects/Library UI before editing. If the live shape, scope, producer taxonomy, or origin seam changed, reconcile `DATA-003`, `DEC-AUTO-017`–`020`, ownership, and recovery rather than layering a second starter system. |

## Requirements

| ID | Requirement | Completion evidence |
| --- | --- | --- |
| `REQ-001` | Implementation must use the whole-app and whole-active-D1 audit in this pack, preserve explicit exclusions, and revalidate any stale source before editing. | Current-state audit, source revision, stale-trigger reconciliation, and focused diff. |
| `UX-001` | A first eligible Workshop session must receive a short, optional orientation selected for creator, collaborator, direct-estimate, returning-user, and viewport context. | Eligibility matrix, flow-definition evidence, and route/component behavior. |
| `UX-002` | The first-value system must guide users to a real project, estimate, area/priced row, and valid total; checklist completion must come from domain events rather than tooltip views. | Activation/checklist contract and behavior evidence. |
| `UX-003` | Feature discovery must cover relevant Workshop modules through short contextual guides without forcing irrelevant, unavailable, or unauthorized steps. | Capability/route catalog and guide eligibility evidence. |
| `UX-004` | Guidance must be accessible, responsive, interruptible, resumable, replayable, and resettable from Settings with unambiguous semantics. | Keyboard/focus/reflow/reduced-motion/settings evidence. |
| `UX-005` | The guided path must teach an editor to read, price, save, add/source, and organize work in one realistic Estimate Sheet, then distinguish tutorial completion from independent non-starter transfer; viewers receive a read-only equivalent. | Closed curriculum, user-action predicates, read-only variant, practice receipt, and non-starter transfer evidence. |
| `UX-006` | The authenticated Client links master page must literally guide an eligible publication manager through status/scope/access literacy, verified create or republish, safe copy/Preview, optional recipient/activity and maintenance work, and recovery while keeping public share, Proposals, and Client Portals distinct. | Closed manager curriculum, publication-action/readback predicates, semantic target ownership, trust-boundary/privacy review, role/failure variants, and guided publishing evidence. |
| `DATA-001` | Instructional progress must be durable, versioned, idempotent, optimistic-concurrency safe, and scoped to the authenticated user and workspace. | Migration, repository, state-transition, conflict, and retry evidence. |
| `DATA-002` | Instructional state must coexist with activation truth and participate in backfill, privacy export/erase, retention, legal holds, account deletion, and membership deletion. | Data lifecycle and deletion-order evidence. |
| `DATA-003` | The starter workspace and tutorial must have closed versioned manifests, exact bounded asset/scope shapes, idempotent resumable creation, inactive-key-only restore, all-eligible-user membership closure, role-downgrade-safe starter-organization cleanup, safe tutorial archive/fresh-copy recovery, persisted claims/practice binding, and non-forgeable origin classification that prevents generated data from earning practice, reuse, transfer, or activation credit. | Starter manifest and scope contract, asset claims, exact cardinalities/grouping, shared membership revision and cleanup, instructional-versus-tutorial generation binding, producer/origin propagation, lifecycle actions, and starter/tutorial/practice/non-starter metric reconciliation. |
| `SEC-001` | Server-derived identity, effective workspace/project/estimate access, capabilities, route IDs, targets, telemetry, and support context must prevent tenant disclosure or client-forged progress. | Authorization, allowlist, redaction, and negative-path evidence. |
| `SEC-002` | Authentication, terms acceptance, and account setup must preserve a sanitized protected return intent, reauthorize the destination, and never expose token-bearing public paths or redirect loops. | Auth-chain source review and redirect behavior evidence. |
| `PERF-001` | Public routes and ineligible Workshop sessions must not pay the full Joyride cost; target waits, route transitions, and virtualized adapters must be bounded and cancelable. | Import graph, bundle measurement, timeout, cancellation, and mount evidence. |
| `OPS-001` | The implementation must use current Joyride v3 and Next.js 16 contracts, provide typed recovery and operational diagnostics, and remain locally reversible without deleting progress. | Dependency, framework, recovery, logging, and rollback evidence. |

## Architecture Decisions

### `DEC-AUTO-001` Use a hybrid onboarding system

Do not build one linear tour across the entire app. Use:

- one three-to-four-step first-run orientation;
- one four-task activation checklist;
- one lesson-sized, task-launched Estimate Sheet practice flow;
- task-launched route-local walkthroughs; and
- one-to-three-step contextual feature guides.

This reduces interruption, avoids brittle cross-route sequencing, and lets real
domain state recognize self-directed users without substituting tooltips for
practice.

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
  operational outcomes. New starter-pack state/claim rows record only closed
  manifest identity, install status, scope, generation, and resource binding.
- Existing activation `source` remains the producer taxonomy. A separate
  non-forgeable `origin_class` distinguishes ordinary domain writes from fixed
  shared starter seeding and explicit per-user practice seeding.
- All origins remain auditable in activation events, but only `user_domain`
  delivery advances `beta_activation_progress`.
- Starter installation, tutorial generation, user-origin practice, and
  independent non-starter work remain distinct closed onboarding-event sources
  and reporting cohorts.

Never mark a checklist item complete because a tour step was shown, a page was
visited, or seeded content was opened. Only the closed, successfully persisted
Project/Estimate creation and Estimate Sheet mutation families in
`DEC-AUTO-008` may establish their authorized checklist contexts. Never mark
tutorial practice complete because the server generated the tutorial rows or
total.

### `DEC-AUTO-004` Scope instructional state to user × workspace × flow × version

The canonical identity is:

```text
user_id + workspace_id + flow_key + flow_version
```

The state row carries instructional `generation`, `status`,
`current_step_key`, `revision`, reset count, and lifecycle timestamps.
`guided_estimate_practice` additionally carries the active
`tutorial_version + tutorial_generation`; every other flow stores those fields
as null. A reset starts a new instructional generation without destroying
activation milestones, changing the tutorial binding, or deleting prior audit
events.

### `DEC-AUTO-005` Use two new tables, not a parallel workflow platform

Add:

1. `beta_onboarding_flow_states` for the current durable projection.
2. `beta_onboarding_flow_events` for append-only, deduplicated, sanitized
   lifecycle and failure evidence.

Do not add per-step state, receipt, outbox, queue, JSON workflow-definition, or
admin-reset tables unless implementation evidence proves the state row, event
dedupe key, D1 batch, and compare-and-set revision are insufficient.

Migration `0101` may add the required activation `origin_class` columns and two
closed Project metadata expression indexes; neither is another workflow table.

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

1. Create or start work in a project.
2. Create or start work in an estimate.
3. Add an area and at least one priced row.
4. Reach a valid saved total.

Do not add an `estimate_created` activation milestone solely for onboarding.
Resolve the Project task only from successful user-domain Blank, Duplicate, or
Template-derived Project creation, or from a qualifying Estimate Sheet action
inside an authorized Project. Resolve the Estimate task only from successful
user-domain Blank, Duplicate, or Template insertion/instantiation, or from one
of these seven Estimate Sheet mutation families: add Area, add Row, insert or
reuse Component as Row, change quantity, change unit cost, change adjustment,
or change miscellaneous cost. Creation or mutation counts only after the
authoritative write and saved/readback result confirm the current resource.
The server derives the closed action family and origin; no client payload may
assert either or directly complete a task.

Opening, viewing, selecting, navigating, renaming, reordering, grouping,
favoriting, archiving, deleting, seed/install/restore work, tour callbacks,
failed or rolled-back writes, stale writes, and client-supplied completion are
non-qualifying. The existing activation ledger remains authoritative for later
area, priced-row, and valid-total milestones. Starter/tutorial generation,
record existence, route visits, and opens complete nothing. Starter/tutorial
generation uses the same domain integrity boundaries as equivalent real work.
Activation `source` remains `project`/`estimate`, while every seed outbox/event
carries server-trusted `origin_class='starter_seed'` or
`origin_class='tutorial_seed'` and skips the activation-progress upsert; it
cannot complete priced-row/valid-total
checklist value, `guided_estimate_practice`, Library reuse, independent
activation, or transfer. Viewers and direct-estimate collaborators receive a
separate orientation, not impossible creator tasks.

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
- **Reset all guidance:** atomically increment the instructional
  generation/reset count and return each existing eligible current-version flow
  to `not_started`; do not auto-launch while Settings is still open.

All actions are authenticated server commands with idempotency keys and
revision checks. Restart/reset changes instructional generation only and
preserves the current tutorial version/generation binding plus matching
practice facts. Only explicit **Create fresh practice copy** archives the old
Project and compare-and-set binds tutorial generation `N+1`; old-generation
practice receipts remain audit-only. Settings copy states these boundaries
before mutation.

### `DEC-AUTO-012` Preserve privacy by design

Persist only semantic flow/step IDs, flow version, instructional generation,
nullable tutorial version/generation, outcome, bounded route key, viewport
class, source, reason code, revision, and timestamps.

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

### `DEC-AUTO-017` Derive one bounded practice copy from the starter Tutorial

The starter pack installs one shared Tutorial exemplar. Only when a user
explicitly starts Guided tutorial, seed exactly one active normal workspace
practice Project per user/workspace tutorial kind, with the immutable identity
`workspace_id + created_by + tutorial_kind + tutorial_version +
tutorial_generation`. Two migration-owned Project expression indexes enforce
identity uniqueness and one active tutorial kind. The state row and Project
claim are created through one checked D1 batch; a concurrent loser rereads and
returns the winner instead of inventing another generation. The practice
Project is outside the starter pack's `3/4/6/3` cardinality, uses ordinary
workspace Project visibility, and is added only to that user's per-user
**Starter Examples** group. The UI states that the command creates a normal
workspace Project before it runs. The immutable tutorial blueprint contains one
estimate and one main sheet, a parent work group, three recognizable Areas, and
three-to-five rows. The seed demonstrates enough hierarchy and row variety to
teach the product without turning the starter Tutorial itself into a persona
gallery or oversized demo estimate. Reference and Sandbox remain separate
starter Projects with different learning jobs.

The shared starter exemplar is `Tutorial — Residential Fit-Out` / `Estimate
Sheet Foundations`. The derived practice Project is `Practice — Residential
Fit-Out` and uses the same immutable blueprint rather than cloning any
user-edited current starter graph. It includes one worked example row, one
intentionally incomplete practice row, and one project-specific row. Use
**Area** in user-facing instruction; reserve **branch** for implementation
details.

Increment the current guided-sample version `1` to tutorial version `2`. Treat
the existing server-marked v1 Project as an incompatible legacy fixture: never
reshape it in place or infer it by name. Starting v2 archives the marked v1
Project and creates a fresh closed v2 generation. Fresh copy requires the
expected state revision/current binding; it atomically archives the current
Project, binds generation `N+1`, creates one new Project, and rejects stale or
concurrent losers without partial data.

### `DEC-AUTO-018` Require user action and independent transfer

Tutorial-core completion requires evidence from the same persisted tutorial
binding that
the user:

1. changed quantity or price on the practice row;
2. caused the computed row/estimate total to change;
3. reached a successful saved state; and
4. added a row or deliberately sourced a Component.

Tooltip views, route visits, generated rows, generated totals, stale tutorial
receipts, and replay do not satisfy those predicates. `organize_work`,
Component reuse, and the Template capstone are optional depth. Report
tutorial-core completion separately from a later equivalent action in a
non-tutorial estimate. The latter is the independent-transfer signal and
product-level comprehension evidence, not a blocking prerequisite for
finishing or keeping open the tutorial flow.

### `DEC-AUTO-019` Superseded: keep reusable learning assets user-created

The earlier decision prohibited auto-seeding workspace Components or Templates
and limited reusable-asset learning to a normal-action Component task plus an
optional Template capstone. The user explicitly superseded that decision on
2026-07-23 in favor of default starter content that makes the product legible
immediately. Retain this entry as decision history; do not implement it.

### `DEC-AUTO-020` Install one bounded starter workspace pack

For each new eligible beta workspace, invoke a server-owned, idempotent
starter-pack bootstrap immediately after successful workspace creation and
before the initial dashboard-ready state. A pre-existing workspace may
auto-install only when `isStarterAutoInstallEligible` finds zero rows in
`projects`, `cost_library_items`, `estimate_templates`, and `project_groups`,
plus zero `library_folders` rows where `is_default_category = 0`; protected
default folders where `is_default_category = 1` are ignored. This closed
predicate is onboarding-specific, not generic workspace emptiness. Existing
eligible non-empty workspaces receive an explicit **Add starter content**
action; never silently merge defaults into established work.

Evaluate state before emptiness: resume current-version
`installing`/`partial` state without rechecking business tables, treat
`complete` as a shared no-op, and recover valid closed claims with a missing
state into `partial`. Run the empty-business-table predicate only when both
current-version workspace state and claims are absent, so partial starter
writes never divert their own recovery into the explicit-add branch.

Starter-pack version `1` has a closed manifest:

- three shared Projects/four Estimate Sheets: Tutorial, Reference with `Base
  Scope` and `Value Option`, and ungrouped Sandbox;
- one per-user **Starter Examples** group containing Tutorial and Reference;
  its starter readiness is exactly one group claim plus two shared-Project
  membership claims, while a later practice membership is ordinary user
  organization;
- six editable persisted workspace Components across the two named starter
  custom folders plus protected `Uncategorized`, with at least one two-variant
  Component; the installer creates/claims only the two custom folders and
  resolves/ensures `Uncategorized` through the existing
  `is_default_category = 1` Library invariant without a starter folder claim;
  and
- three editable persisted workspace Templates across `Residential Rooms` and
  `Exterior + Site`.

Workspace-scoped assets install once. Each joining eligible editor receives only
their per-user group and memberships when shared state is complete; joining
never reruns shared auto-install. Eligibility means a server-authorized
workspace-level user with Projects-collection/grouping capability; project-only
and direct-estimate collaborators have no user starter-organization scope. If
shared state is absent in a non-empty workspace, an owner/manager receives the
explicit add action. Separate
workspace- and user-scoped install states prevent one joining user's partial
setup from corrupting shared readiness. Every asset has a closed manifest key
and generation, visible starter labeling, and normal edit, duplicate, archive,
or delete behavior. Installation is asset-level, resumable, and complete only
after all required claims in that scope resolve. **Restore starter content**
recreates only inactive keys with no active claim/resource graph and latest
claim `missing` or `archived`, using a new per-asset generation; it never
overwrites a surviving edit and never runs automatically on login. An
unclaimed same-name user asset is never adopted; explicit add/restore uses the
deterministic `· Starter`, `· Starter 2`, and later display suffix while claim
identity stays canonical. Receiving, viewing, or merely opening seeded assets
earns no checklist, practice, reuse, activation, or independent-transfer
credit. Only the successful server-derived creation/mutation families in
`DEC-AUTO-008` are eligible user-domain checklist activity.

The workspace state also owns `shared_membership_revision`; each eligible user
state records the revision for which its exact Tutorial-plus-Reference
membership pair was verified. Initial install starts at revision `1`, joining
users bind at the current revision, and current-user readiness requires
revision equality. Restoring archived or deleted shared Tutorial/Reference
increments the workspace revision, marks all affected eligible user states
`partial`, and reconciles membership claims in stable `scope_owner_id` order,
at most 25 users per checked batch. The owner/manager command handles the first
batch, **Resume starter restore** handles later batches, and an authorized
user read may repair only that user's scope without recreating the shared
Project. Failed still-eligible users retain their old revision and partial
state. A user who loses only workspace-level grouping capability runs a
distinct checked starter-organization cleanup that removes only the per-user
group/memberships/state/claims, preserves narrower instructional/activation
state and every shared/practice Project, and exits the revision barrier only
after no-active-scope readback; final access loss keeps its separate cleanup.
Workspace readiness returns to `complete` only when no eligible pre-existing
user scope remains behind.

### `DEC-AUTO-021` Make Estimate Sheet guidance a comprehensive learning rail

The Estimate Sheet MVP uses one shared route-local **Estimate Sheet guide**
rail plus lesson-sized Joyride handoffs, not one longer tour. Getting started
and the route render the same server snapshot with Core/Optional labels,
available/completed/blocked/resume state, next action, Skip lesson, Exit,
Restart lesson, and Support.

The closed lesson sequence is:

1. `read_the_workspace`;
2. `understand_row_math`;
3. `price_and_save`;
4. `add_and_source`;
5. `organize_work`;
6. `reuse_structure`;
7. `recover_and_trust`; and
8. `graduate`.

Every lesson is independently resumable and uses at most four overlay steps.
Handoff closes the tooltip before the user acts through the normal product UI.
`price_and_save` plus `add_and_source` remain the only tutorial-core completion
predicates; optional depth stays available without becoming a trap.
`graduate` remains separate non-starter transfer. A real offline,
revision-conflict, or save-failure branch may teach recovery, but onboarding
never manufactures a failure. Each semantic target has one rendering owner
and a bounded missing/modal/virtualized recovery path.

### `DEC-AUTO-022` Promote Client links to a guided MVP without crossing trust boundaries

Replace the former `HELP_ONLY`/deferred Client links decision with
`client_link_publishing`, a task-launched manager-only learning path on
`/workshop/publisher`. It is eligible after first Estimate Sheet value or an
explicit eligible Client links/Getting started launch and never auto-starts on
public `/share/[token]`.

Core completion requires:

1. a successful existing publication-manager create or republish action with
   at least one resolved client-visible Estimate Sheet;
2. post-save refetch that verifies current publication identity, non-empty
   scope, published status, and client-link availability; and
3. explicit copy/selectable-link fallback or authenticated Preview action
   against that verified publication.

The two actions are correlated by one short-lived server HMAC receipt held only
in current client memory. It binds the active run and exact current publication
without serializing raw resource identifiers. The consume command reauthorizes,
rereads, constant-time verifies the binding, and atomically emits final core
completion; separate generic events, project-A publish plus project-B share,
reload/lost receipt, expiry, replacement, tampering, stale revision, or replay
cannot compose into success.

The learning rail also covers roster/filter/status literacy, client name,
open/password access, recipients/activity, stale snapshot/expiry maintenance,
and Replace/Turn off safety. Recipient email and destructive actions are
optional normal product actions and are never invoked or required by
onboarding. Republish truthfully explains that it issues a new URL. Replace
link and Turn off link retain their exact existing confirmations and immediate
recipient impact. Instructional state/events persist no token, URL, resource
ID, selected Estimate IDs, client/password/recipient data, or snapshot content.
Authenticated Preview is `RETURN_ONLY`; public share, Proposals, and Client
Portals remain separate products and route contracts.

## Experience Sequence

### First-run creator

1. During new empty-workspace bootstrap, idempotently install starter-pack
   version `1`; if an asset-level write stops midway, persist `partial`, keep
   the app usable, and show a resumable readiness action rather than claiming
   the pack is complete.
2. Render Workshop normally; do not cover loading or auth gates.
3. After shell readiness and no app modal, show a centered welcome step that
   names the outcome and estimated length.
4. Orient to Projects, the grouped Tutorial/Reference examples, ungrouped
   Sandbox, and the persistent Getting started/Support affordances.
5. End with one primary CTA: **Learn with my starter workspace**.
6. Open `/workshop/getting-started`, where the user can open the installed
   Tutorial, Reference, Sandbox, or starter Template; create Blank; restore
   inactive starter content; or Explore on their own.
7. For Guided tutorial, explain that a normal workspace Project will be
   created, then idempotently create or resume the current versioned per-user
   `Practice — Residential Fit-Out` Project from the immutable tutorial
   manifest and launch one lesson at a time through the shared learning rail:
   read the workspace, understand row math, price and save, add or source work,
   organize it, reuse structure, recover and trust, and graduate.
8. Require user-origin task evidence; the generated projects, rows, totals,
   Components, and Templates
   never complete practice on their own.
9. For Blank, Template, Reference, Sandbox, or self-directed work, launch only the relevant
   route-local guide and continue to use authoritative domain facts.
10. Celebrate tutorial practice separately from a later non-starter transfer
    action, then offer optional deliberate Component reuse, Template capstone,
    or the manager-only Client links learning path when eligible.

### Invited collaborator or direct-estimate user

1. Welcome them to the assigned workspace/resource.
2. Explain their effective role and that project and estimate access can differ.
3. Route to an authorized project/estimate supplied by the server.
4. If read-only, explain Area hierarchy, rows, quantity × price, totals, and
   save/status affordances without asking for mutation.
5. If editable, offer the same task-based practice only when they can act on
   the current resource.
6. End at Support/Guidance; do not show creator checklist tasks they cannot
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
| `estimate_reader_orientation` | Can view but not edit an estimate | 4 steps | Read Area hierarchy, row math, totals, and status without impossible mutations. |
| `guided_estimate_practice` | Can edit the tutorial generation bound in current state; required practice predicates incomplete or user explicitly resumes optional depth | 4 steps per lesson | Use one resumable rail to cover workspace/hierarchy, row math, price/save, add/source, organization, reuse, recovery, and later transfer; only price/save plus add/source are core. |
| `first_estimate_value` | Can edit a non-tutorial estimate; valid total not reached | 5 steps | Understand hierarchy, add priced work, and confirm total/save state. |
| `library_reuse` | Has meaningful estimate context and Component/Template capability | 3 steps | Deliberately insert/duplicate/edit a starter or user-created Component and complete an optional Template capstone through normal actions. |
| `client_link_publishing` | Current publication manager; Client links feature/route available; at least one authorized Project, with first Estimate value or explicit eligible launch | 4 steps per lesson | Read roster/status, verify exact publish scope/access, copy or authenticated-preview the verified link, and optionally manage recipients, maintenance, and safety recovery without public-route guidance. |

Installed Tutorial/Reference/Sandbox/Template and Blank/self-directed selection
belongs to the onboarding center and relevant zero states. Blank, Reference,
Sandbox, and Template use `first_estimate_value`; Guided tutorial starts
`guided_estimate_practice`. Project insights, collaboration,
Proposals, Client Portals, Favorites, export, linked templates, Ask Flip,
organization settings, and other advanced surfaces receive truthful help links
or later versioned catalog entries, not beta-v1 tours. They never extend the
first-run orientation. Client links is the explicit user-directed MVP exception
and remains task-launched rather than part of first-run orientation.

## Execution DAG

```text
UNIT-001 ─┬─> UNIT-002 ─┐
          └─> UNIT-003 ─┴─> UNIT-004 ─┬─> UNIT-005 ─> UNIT-006 ─┐
                                      └─> UNIT-007 ─────────────┴─> UNIT-008
```

`UNIT-002` and `UNIT-003` may run in parallel only after `UNIT-001` freezes the
shared types and target/flow vocabulary. `UNIT-005` and `UNIT-007` may run in
parallel only after the lead accepts `UNIT-004`; `UNIT-006` starts only after
the lead accepts the tutorial/practice handoff from `UNIT-005`. The same lead
may instead run every unit sequentially without changing the contract.

`UNIT-001` is the sole writer for `flow-catalog.ts` and `target-catalog.ts`;
later units consume those frozen contracts without editing them. `BARRIER-001`
precedes `UNIT-004`: the lead accepts both data and runtime handoffs, confirms
that the catalogs did not drift, and resolves any shared-type conflict.
`BARRIER-002` precedes `UNIT-008`: the lead accepts all three feature handoffs,
reconciles the focused diff, and verifies no concurrent writer touched the same
production path. After `UNIT-003`, `WorkshopRouteHeader.tsx` transfers
read-only to `UNIT-004`, and `EstimateSheetContent.tsx` transfers sequentially
to `UNIT-005` and then `UNIT-006`. After `UNIT-002`,
`activation-actions.ts` transfers sequentially to `UNIT-005` for
starter/tutorial seed-origin integration. `activation-types.ts`, `activation-origin.ts`,
`activation-repository.ts`, and `activation-outbox.ts` remain read-only
contracts after `UNIT-002`; `UNIT-005` owns the exact project/estimate producer
paths plus Project grouping and persistent Library writers that thread trusted
closed-manifest origin into them. `getting-started/page.tsx` and
`GettingStartedProgress.tsx` transfer sequentially from `UNIT-004` to
`UNIT-005` for final starter-status/action wiring.
`activation-producer-contract.ts` remains read-only because it continues to
validate milestone-to-producer `source`; the server-only outbox boundary adds
origin afterward.

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
| `UNIT-002` / `BETA-002-DATA` | `executor`; D1 migration and data lifecycle | Active migrations, activation/profile/privacy/deletion/collaboration consumers, frozen flow/starter/tutorial types | Migration number/head receipt; schema/rebuild/FK/index/backfill review; starter state/claim and activation source/origin contract review; repository/action static output; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-002-DATA DATA_READY` waits at `BARRIER-001` |
| `UNIT-003` / `BETA-003-RUNTIME` | `executor`; Next.js App Router, auth, accessible overlays | Local Next.js server/client/navigation docs, auth chain, shell/navigation, all modal owners, frozen catalogs | Protected-return and import-boundary review; route/modal inventory reconciliation; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-003-RUNTIME RUNTIME_READY` waits at `BARRIER-001` |
| `UNIT-004` / `BETA-004-FIRST-RUN` | Lead `executor`; onboarding UX plus authoritative domain state | Accepted `BARRIER-001` handoffs, current checklist/zero-state/dashboard writers | Start-path/checklist and starter-readiness truth matrix; role/empty/partial/error/completed-state source review; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-004-FIRST-RUN FIRST_RUN_READY` opens `UNIT-005` and `UNIT-007` |
| `UNIT-005` / `BETA-005-STARTER-PRACTICE` | `executor`; starter workspace, tutorial seed, estimate editor, and virtualized-target integration | Accepted data/runtime/first-run handoffs, Project/group/Library writers, current guided-sample writers, exact activation producers, estimate owner APIs, performance protocol | Exact 3/4/6/3 manifest and scope receipt; asset-claim/install/restore/binding receipt; producer source/origin and non-forgeability matrix; practice, concurrency, recovery, target-owner, and bounded-wait review; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-005-STARTER-PRACTICE STARTER_PRACTICE_READY` unlocks `UNIT-006` and waits at `BARRIER-002` |
| `UNIT-006` / `BETA-006-DISCOVERY-SHARING` | `executor`; task-based reuse, Client links publishing, and capability-aware contextual UX | Accepted starter/tutorial/practice handoff, route dispositions, Component/Template UI, and live publisher roster/drawer/wizard/publication contracts | Deliberate Component/Template action-credit receipt; verified Client links publish/copy-or-preview receipt; permission/privacy/trust-boundary and failure-state matrix; focused type/LSP/lint evidence | `NOT_REQUIRED`; `HANDOFF BETA-006-DISCOVERY-SHARING DISCOVERY_SHARING_READY` waits at `BARRIER-002` |
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
  instructional generation, starter scope/asset identity, tutorial
  identity/binding, activation path, practice predicate, and target unions;
  include the complete Estimate Sheet lesson vocabulary plus
  `client_link_publishing`, closed `publication_domain` source, publisher route
  intents, manager capability/data predicates, and every roster/drawer/wizard/
  link/recipient/activity semantic target; define
  eligible-step filtering and semantic resume resolution; prohibit v2 APIs and
  controlled `stepIndex`.
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
  new `src/lib/onboarding/activation-origin.ts`,
  `src/lib/onboarding/activation-repository.ts`,
  `src/lib/onboarding/activation-actions.ts`,
  `src/lib/onboarding/activation-retention.ts`,
  `src/lib/onboarding/activation-outbox.ts`,
  `src/lib/compliance/privacy-request-repository.ts`,
  `src/lib/auth/delete-account-repository.ts`,
  `src/lib/collaboration/actions.ts`, and
  `src/lib/collaboration/invitation-d1-store.ts`.
- **Work:** create flow state/event tables with distinct instructional and
  nullable tutorial-generation fields; create starter-pack state and
  polymorphic asset-claim tables with closed workspace/user scope, manifest
  key, generation, resource kind, install-status constraints, and a
  non-negative `shared_membership_revision` dependency field; rebuild all
  four `beta_activation_*` tables with workspace-lifecycle rather than
  membership FKs while preserving the existing milestone and `source` producer
  taxonomies; expand the closed selected path only with `starter_reference` and
  `starter_sandbox` while retaining `workspace_template` for all Template
  starts; add closed `origin_class` to activation outbox/events and
  deterministically backfill marked legacy tutorial rows from server Project
  metadata; preserve progress identity/control fields while recomputing derived
  milestone/resource/value fields only from backfilled `user_domain` events;
  make reconciliation append every classified event but upsert
  `beta_activation_progress` only for `user_domain`; add the two closed Project
  tutorial uniqueness indexes; freeze
  trusted-origin helpers so public domain paths default to `user_domain`,
  distinct opaque-capability starter/tutorial helpers write `starter_seed` or
  `tutorial_seed`, the existing producer contract stays source-only/read-only,
  and no serialized input may select an origin, manifest key, scope, version,
  generation, or seed shape; add
  CAS, request fingerprints, run identity, and idempotency; implement
  start/resume/advance/pause/dismiss/complete/replay/restart/reset-all commands;
  persist selected start path; define closed `tutorial_seed`,
  `tutorial_practice`, `non_starter_domain`, and `publication_domain`
  onboarding-event sources plus deduplicated practice/transfer/publishing
  events; keep Client links state free of tutorial binding and sensitive
  publication fields; require current tutorial binding on every sample/practice
  event and matching binding in the completion query;
  make guidance reset preserve that binding and all starter claims/generations;
  derive estimate-task truth from authorized estimates without converting
  generated starter/tutorial value into practice, reuse, transfer, or
  independent activation; backfill current users from unambiguous
  activation/domain evidence without inferring starter installation from
  names; repair checklist zero-row and
  duplicate-activation mutations; separate workspace erasure, access
  revocation, and full-account deletion; include
  onboarding/profile/activation/starter-claim rows in privacy/deletion order;
  preserve workspace-scoped starter claims while a shared workspace continues,
  remove user-scoped claims on final access loss, and add a separate
  idempotent starter-organization eligibility cleanup for grouping-capability
  loss with narrower access preserved: remove only the per-user starter
  group/memberships/state/claims while retaining instructional/activation
  state, tutorial binding, and Projects. Reuse activation legal holds and
  event-retention policy. Define the server-owned closed checklist
  action fact for the Blank/Duplicate/Template-derived Project family,
  Blank/Duplicate/Template-instantiated Estimate family, and seven Estimate
  mutation families in `DEC-AUTO-008`; require authoritative success/readback,
  reject every named negative family, and hand the producer instrumentation
  contract to `UNIT-005` without adding a new activation milestone.
- **Acceptance:** duplicate commands are safe; stale revisions return current
  state; flow and tutorial generations cannot be conflated; activation
  producer `source` is unchanged, origin cannot be client-forged, and
  seed-origin delivery never advances the real activation projection;
  identity/workspace/effective access come from the server; project-only and
  estimate-only users are supported; final-access deletion cannot be blocked by
  retained activation/onboarding rows; grouping-capability loss cannot erase
  narrower instructional/activation state or business Projects and cannot
  leave an active user starter scope; reset preserves activation truth and
  starter claims/generations plus the tutorial binding; starter pack state can
  represent not-started/installing/partial/complete independently for workspace
  and user scope without false readiness; a joining user's partial state cannot
  rewrite shared completion; user readiness requires the workspace/user shared
  membership revisions to match; shared and user-scoped asset claims cannot
  collide;
  existing users are not incorrectly auto-enrolled; generated
  starter/tutorial activity,
  current-binding tutorial practice, stale-binding audit history, and
  non-starter transfer remain queryably distinct; the closed Project/Estimate
  checklist fact cannot be emitted by navigation, organization, destructive
  actions, failed/stale writes, seeds, or client assertion.
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
  new `src/app/workshop/getting-started/loading.tsx`,
  new `src/app/workshop/getting-started/error.tsx`,
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
  checklist; add installed Tutorial/Reference/Sandbox/starter-Template plus
  Blank/self-directed path selection and an exact selected-path writer
  (`guided_sample`, `starter_reference`, `starter_sandbox`,
  `workspace_template`, or `blank`); surface
  not-started/installing/partial/complete/explicit-add/inactive-key-restore
  starter states
  from the server snapshot without claiming partial content is ready; describe
  Guided tutorial as a ten-to-fifteen-minute task path rather than instant
  sample value; auto-start only the correct short orientation; suppress creator
  guidance for unauthorized users; render the available Estimate Sheet lesson
  rail and manager-only Client links rail status/launch shell from the server
  snapshot so later units can wire their normal-action predicates; show
  progress/recommendation/error/empty/completed states; keep Support available.
- **Acceptance:** the first-run and Getting started surfaces render the
  server-supplied starter readiness/start-path contract for
  not-started/installing/partial/complete/explicit-add/inactive-restore states
  without claiming that installation actions are already wired. An invited
  viewer never sees impossible tasks; seeded presence, route visits, and opens
  complete no checklist task; only the server-supplied closed successful
  creation/mutation facts render the matching Project/Estimate tasks complete;
  dismissed guidance remains accessible on demand; Client links status/launch
  is absent for non-managers and public-route context.
- **Recovery:** keep the onboarding center and checklist available even if
  automatic orientation is temporarily disabled.

### `UNIT-005` Install starter content and guide the first estimate

- **Assignment:** `BETA-005-STARTER-PRACTICE`
- **Status:** READY
- **Depends on:** `UNIT-004`
- **Owned production paths:**
  `src/app/workshop/getting-started/page.tsx`,
  `src/app/workshop/projects/[projectId]/estimates/page.tsx`,
  `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`,
  `src/components/workshop/projects-page-client.tsx`,
  `src/components/workshop/ProjectEstimatesClient.tsx`,
  `src/components/workshop/EstimateWorkspaceClient.tsx`,
  `src/components/workshop/EstimateHeaderActions.tsx`,
  `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx`,
  `src/components/workshop/EstimateSheetTree.tsx`,
  `src/components/workshop/EstimateSheetContent.tsx`,
  `src/components/workshop/ProjectTotalHeader.tsx`,
  `src/components/workshop/estimate-sheet/rows/row-table.tsx`,
  `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx`,
  `src/hooks/use-estimate-row-mutations.ts`,
  `src/components/onboarding/GettingStartedProgress.tsx`,
  new `src/components/onboarding/EstimateSheetLearningRail.tsx`,
  `src/lib/auth/account-actions.ts`,
  `src/lib/projects/actions.ts`,
  `src/lib/estimates/actions.ts`,
  `src/lib/estimates/d1-intents/nodes.ts`,
  `src/lib/estimates/d1-intents/rows.ts`,
  `src/lib/workshop/group-actions.ts`,
  `src/lib/repositories/workspace-repository.ts`,
  `src/lib/component-library/actions.ts`,
  `src/lib/component-library/folder-mutation-d1.ts`,
  `src/lib/repositories/component-library-repository.ts`,
  `src/lib/component-library/estimate-templates.ts`, new
  `src/lib/onboarding/starter-pack.ts`, new
  `src/lib/onboarding/starter-pack-actions.ts`,
  `src/lib/onboarding/guided-sample.ts`,
  `src/lib/onboarding/activation-actions.ts`, new
  `src/lib/onboarding/guided-sample-actions.ts`, new
  `src/lib/onboarding/estimate-practice.ts`, new
  `src/components/onboarding/estimate-target-adapter.ts`.
- **Sequential handoff:** `EstimateSheetContent.tsx` ownership transfers from
  `UNIT-003` only after its modal adapter lands;
  `getting-started/page.tsx` and `GettingStartedProgress.tsx` transfer from
  `UNIT-004` after the first-run state shell lands;
  `activation-actions.ts` ownership transfers from `UNIT-002` after its
  lifecycle/source-origin contract lands; `activation-types.ts`,
  `activation-origin.ts`, `activation-repository.ts`, and
  `activation-outbox.ts` remain read-only contracts from `UNIT-002`;
  `flow-catalog.ts` and `target-catalog.ts` remain read-only contracts from
  `UNIT-001`.
- **Work:** define one closed starter-pack version `1` manifest with explicit
  workspace/user scope and stable asset keys. Create exactly three shared
  Projects/four Estimate Sheets: `Tutorial — Residential Fit-Out` / `Estimate
  Sheet Foundations`; `Reference — Small Commercial Refresh` with `Base Scope`
  and `Value Option`; and `Sandbox — Quick Estimate` / `Quick Estimate`. Create
  one per-user **Starter Examples** group containing shared Tutorial and
  Reference while leaving Sandbox without membership. Create exactly six
  persisted Components—`Interior Paint Finish`, `Porcelain Floor Tile`,
  `Gypsum Board Partition`, `LED Downlight Point`, `Plumbing Fixture Allowance`,
  and `General Labor Allowance`. Create and claim exactly two custom folders,
  `Starter — Finishes` and `Starter — Fixtures & Services`; resolve/ensure
  protected `Uncategorized` through the existing
  `is_default_category = 1` Library invariant, parent `General Labor Allowance`
  there, and never attach a starter claim to that protected folder.
  Include at least one two-variant Component. Create exactly three
  persisted Templates—`Condo Fit-Out Starter`, `Powder Room Basic`, and `Roof
  Deck Lounge`—categorized as `Residential Rooms` or `Exterior + Site`; the
  existing static fixture may supply reviewed blueprint input, but runtime
  records must be D1-backed and the large `sampleEstimateTree` must not be
  copied.

  Invoke the idempotent installer immediately after successful new-workspace
  creation. During authenticated reconciliation, auto-install a pre-existing
  workspace only when `isStarterAutoInstallEligible` finds zero `projects`,
  `cost_library_items`, `estimate_templates`, and `project_groups` rows plus
  zero `library_folders` rows where `is_default_category = 0`; ignore only
  protected default folders where `is_default_category = 1`. Treat this as the
  complete onboarding predicate, not generic workspace emptiness. Existing
  non-empty workspaces require explicit **Add starter content**. Reconcile
  state first: resume current-version `installing`/`partial`, no-op shared
  `complete`, recover valid closed claims with a missing state as `partial`,
  and run business-table emptiness only when current-version state/claims are
  absent. Write assets in deterministic dependency order through asset-level
  checked D1 batches, persist `partial` on interruption, resume only unresolved
  claims, complete workspace/user state independently, require both for
  current-user readiness, install workspace-scoped assets once, and add
  only per-user group/membership claims for joining editors after confirming
  shared state is complete. Require the server-derived workspace-level
  Projects-collection/grouping capability; project-only and direct-estimate
  collaborators have no user starter-organization scope. Joining editors never
  rerun shared auto-install; if shared state is absent in a non-empty workspace,
  show the explicit add action only to an authorized owner/manager. Never
  adopt or overwrite an unclaimed canonical-name collision; use the lowest
  available deterministic `· Starter`, `· Starter 2`, and later suffix while
  preserving the canonical claim key. Expose **Restore starter content** only
  for inactive keys with no active claim/resource graph and latest claim
  `missing` or `archived`; increment that asset's generation, preserve all
  surviving active identities/edits, and never auto-repair at login. Every
  allowance is visibly labeled as learning data with a review date.

  Require owner/manager authority for explicit shared add/restore, the
  server-derived Projects-collection/grouping capability for current-user
  group/membership reconciliation, and normal Project/Estimate create/edit
  capability for Guided practice. When shared Tutorial or Reference restoration
  changes a Project resource, CAS workspace state to `partial`, increment
  `shared_membership_revision`, create the new shared Project generation,
  archive or mark missing every stale dependent membership claim according to
  actual row survival, and mark every affected eligible pre-existing user
  state `partial` without advancing its revision. Reconcile stable
  `scope_owner_id` order in checked batches of at most 25 users: reauthorize
  grouping capability, resolve the active group, insert the new membership,
  claim generation `N+1`, reread the exact Tutorial-plus-Reference pair, and
  only then mark that user complete at the workspace revision. Reconcile the
  initiating batch immediately; expose **Resume starter restore** for remaining
  batches; allow an eligible user's authorized read to repair only that user
  scope against the existing shared generation. Failed users remain partial,
  a user losing only grouping capability runs a checked idempotent
  starter-organization cleanup that deletes the claimed group memberships,
  per-user group, user starter claims, and user starter state; rereads no active
  user scope; preserves narrower instructional/activation state, tutorial
  binding, shared assets, and every practice/business Project; and lets later
  capability regain re-enter an in-progress restore barrier as a partial user
  scope or, after shared completion, bootstrap only the current revision.
  Final-access loss keeps its distinct cleanup, and workspace state returns to
  `complete` only when no eligible pre-existing user scope remains behind.
  Concurrent restore/resume commands race on revision/claim uniqueness and
  reread the winner; none reruns shared installation or recreates the Project.

  Bump the current guided-sample version from `1` to `2` and replace the
  one-area/one-priced-row fixture with the immutable practice blueprint: one
  estimate, one main sheet, one parent work group, three Areas, and
  three-to-five rows including a worked example, incomplete practice row, and
  project-specific row. The shared starter Tutorial uses the same immutable
  blueprint but is not cloned from its mutable current graph. On explicit
  Guided tutorial start, explain the normal workspace visibility, create or
  resume `Practice — Residential Fit-Out` outside starter cardinality, and add
  it to only that user's **Starter Examples** group. Recognize legacy v1 only
  from server metadata, archive it before v2 practice creation, and never
  reshape it in place or infer it by name. Create shared
  Tutorial/Reference/Sandbox graphs through an opaque `starter_seed` capability
  and the explicit practice graph through an opaque `tutorial_seed` capability;
  neither accepts
  client origin, manifest/version/generation/key, or seed shape. Keep public
  project/estimate/Component/Template/group action entrypoints on
  `user_domain`; instrument Blank/Duplicate/Template-derived Project creation,
  Blank/Duplicate/Template-instantiated Estimate creation, and the seven closed
  Estimate mutation families from `DEC-AUTO-008` so only authoritative
  successful save/readback emits the server-owned checklist fact. Emit nothing
  for the named navigational, organizational, destructive, failed, stale,
  seeded, or client-asserted negative cases. Thread closed starter/tutorial
  capabilities only from `starter-pack-actions.ts` into server-only intents
  while preserving activation `source='project'|'estimate'`. Atomically claim the initial
  tutorial binding and one active Project through the migration indexes; make
  reopen return the winner; require expected revision/binding for a checked
  fresh-copy batch that archives generation `N`, binds `N+1`, and creates
  exactly one replacement. Add one route-local **Estimate Sheet guide** rail
  shared with Getting started and lesson-sized `read_the_workspace`,
  `understand_row_math`, `price_and_save`, `add_and_source`, `organize_work`,
  `reuse_structure`, `recover_and_trust`, and `graduate` practice. Show
  Core/Optional, completed/available/blocked/resume, next action, Skip lesson,
  Exit, Restart lesson, and Support from one server snapshot. Limit each
  lesson to four overlay steps and close/pause the tooltip before the real
  action. Require user-origin quantity/price, total-change, save, and
  row-or-Component evidence from events matching the current persisted
  tutorial binding; keep `graduate` as later non-blocking transfer evidence;
  keep hierarchy, Template reuse, and real failure recovery optional; never
  manufacture an offline/conflict/save failure. Add a read-only reader variant
  covering Project/Estimate/Tab/Area/Row and every current row-math column; add
  instruction-only restart, explicit archive, and fresh-copy recovery; add
  route-local targets for header/Tab, hierarchy, Area creation, row creation,
  row-math help, pricing, valid total, dirty/saving/saved/failed state, and
  relevant Library/Sources/Template affordances. Assign header/Tab targets to
  `EstimateWorkspaceClient`/`EstimateTabStrip`, hierarchy to
  `EstimateSheetTree`, add/source to `EstimateSheetContent`, marked Row/math to
  `row-table.tsx`, and total/save to `ProjectTotalHeader` plus the row mutation
  owner. Select/expand/scroll only a known virtual Row through its owner API;
  bound/abort every preparation; define centered/missing/modal/partial-Tab
  recovery; use Area consistently in user-facing instruction; never target
  arbitrary DOM rows or mutate data merely to advance a tooltip.
- **Acceptance:** the installed manifest resolves exactly 3 shared Projects/4
  Estimate Sheets/6 Components/3 Templates with the specified per-user group,
  ungrouped Sandbox, exactly two claimed custom folders, protected
  `Uncategorized` resolution, categories, and Component variant. New,
  pre-existing-empty, non-empty, and joining-editor paths obey the exact
  eligibility contract. Workspace claims install once; a joining editor
  receives no duplicate shared assets and only group/membership claims;
  workspace/user state is independent; interrupted installation resumes
  unresolved claims and advertises readiness only after both current scopes
  resolve; unclaimed same-name assets are neither adopted nor overwritten;
  restore increments only inactive `missing`/`archived` asset generations and
  never overwrites surviving edits. Shared Tutorial/Reference restore advances
  one workspace membership revision, marks all affected eligible users
  partial, deterministically closes every exact membership dependency through
  bounded resume batches, and cannot report workspace completion while any
  eligible pre-existing user revision remains behind. A mid-restore grouping
  capability downgrade removes only that user's starter organization/state/
  claims after checked readback, preserves narrower guidance/activation and
  all Projects, and cannot strand or falsely satisfy the barrier. Explicit
  Guided tutorial start creates the per-user practice Project outside starter
  cardinality and does not imply private visibility. The practice Project is bounded,
  versioned, idempotent, and has one active Project for the user/workspace
  tutorial kind; concurrent create/reopen returns one winner. Every seed
  outbox/event preserves its producer `source` and carries non-forgeable
  `origin_class='starter_seed'` or `origin_class='tutorial_seed'`; normal client
  mutations cannot select either origin, and seed delivery never upserts
  `beta_activation_progress`. Installation, seeded presence, route visits, and
  seeded asset opens cannot earn checklist, practice, reuse, transfer, or
  activation credit; only the closed successful creation/mutation facts can
  complete the Project/Estimate checklist tasks, and all named negative action
  families remain incomplete. A marked legacy
  v1 Project is archived before v2 creation and no user-edited row is upgraded
  in place. Editor completion requires the closed user-action predicates,
  successful save/total evidence, and current tutorial binding; fresh copy
  atomically rebinds to `N+1`, rejects stale/concurrent losers, and ignores old
  receipts. Reset/restart changes instructional state without changing starter
  claims/generations or tutorial binding. The reader variant asks for no
  mutation; the shared learning rail exposes the same lesson status in Getting
  started and the Estimate Sheet; every current cost column and save/recovery
  state is source-accurate; the guide survives streaming, an empty or existing
  estimate, partial Tab data, virtualized Rows, missing optional targets,
  read-only access, modal interruption, offline/revision conflict, route
  changes, resume, restart, archive, partial install, inactive-key restore,
  and fresh-copy recovery.
- **Recovery:** skip the affected lesson while leaving the estimate editor and
  activation ledger untouched; resume unresolved starter claims or restore only
  an inactive manifest key; resume the bound tutorial generation or use the
  checked archive/rebind batch for a fresh copy. Never silently overwrite,
  duplicate, repeatedly auto-repair, or reuse stale practice receipts.

### `UNIT-006` Add reusable-work and Client links MVP guidance

- **Assignment:** `BETA-006-DISCOVERY-SHARING`
- **Status:** READY
- **Depends on:** `UNIT-005`
- **Owned production paths:**
  `src/app/workshop/library/components/page.tsx`,
  `src/app/workshop/library/templates/page.tsx`,
  `src/app/workshop/publisher/page.tsx`,
  `src/app/workshop/publisher/preview/[projectId]/page.tsx`,
  `src/components/workshop/library/LibraryComponentsRoute.tsx`,
  `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`,
  `src/components/workshop/EstimateSheetContent.tsx`,
  `src/components/workshop/publisher/PublisherRosterClient.tsx`,
  `src/components/workshop/publisher/PublisherRosterCard.tsx`,
  `src/components/workshop/publisher/PublisherEmptyState.tsx`,
  `src/components/workshop/publisher/PublisherRosterSkeleton.tsx`,
  `src/components/workshop/publisher/PublisherProjectPicker.tsx`,
  `src/components/workshop/publisher/PublisherDrawer.tsx`,
  `src/components/workshop/publisher/ShareWizard.tsx`,
  `src/components/workshop/publisher/ShareLinkDisplay.tsx`,
  `src/components/workshop/publisher/PublisherActivityFeed.tsx`,
  `src/components/workshop/publisher/ClientPreviewBanner.tsx`,
  `src/components/workshop/publisher/usePublisherDrawer.ts`,
  `src/components/workshop/publication/SheetPickerList.tsx`,
  `src/components/workshop/publication/RecipientEmailComposer.tsx`, new
  `src/components/onboarding/ClientLinksLearningRail.tsx`, new
  `src/lib/onboarding/client-link-learning.ts`,
  `src/lib/publisher/permissions.ts`,
  `src/lib/publisher/roster-filter.ts`,
  `src/lib/publisher/roster-repository.ts`,
  `src/lib/publisher/drawer-actions.ts`,
  `src/lib/publisher/activity-actions.ts`,
  `src/lib/publication/actions.ts`.
- **Read-only inherited contracts:** `flow-catalog.ts` and
  `target-catalog.ts` from `UNIT-001`; `src/app/share/[token]/page.tsx`,
  `src/components/workshop/publisher/ClientPortalComposer.tsx`,
  `src/lib/publication/security.ts`,
  `src/lib/publication/public-repository.ts`, and
  `src/lib/publication/types.ts` remain public/security truth and are not
  weakened for onboarding.
- **Sequential handoff:** `EstimateSheetContent.tsx` ownership transfers from
  `UNIT-005` only after `STARTER_PRACTICE_READY`.
- **Work:** turn `library_reuse` into an optional task: deliberately insert,
  duplicate, edit, or save/reuse one starter or user-created Component through
  normal product actions, then offer Template insertion/duplication or creation
  as a capstone only when the user has meaningful structure. Make starter
  labels/categories understandable without treating a view as completion;
  retain only the bounded one-to-three-step reuse guide; enforce
  role/feature/resource eligibility; avoid semantically blank or irrelevant
  Library targets.

  Implement `client_link_publishing` as a task-launched, manager-only
  route-local learning rail on `/workshop/publisher`. Reuse the Getting started
  and Settings status/actions contract. Make it eligible after first Estimate
  value or an explicit eligible Client links/Getting started launch; never
  auto-start it on `/share/[token]`. Add typed rendering-owner targets for the
  roster, filters, Create action, drawer/status, wizard, estimate selection,
  client name, access, save/verification state, verified link,
  authenticated Preview, Recipients, and Activity. Preserve existing
  `data-publisher-*`/aria product semantics while adding the closed onboarding
  helper.

  Add lesson-sized `read_client_links`, `scope_and_publish`,
  `verify_and_share`, `recipients_and_activity`, `keep_it_current`, and
  `replace_or_turn_off_safely`; each lesson uses at most four overlay steps and
  hands control to the normal product UI. Core completion requires a current
  publication manager, at least one resolved Estimate Sheet, successful
  `createProjectPublication` or `republishProjectPublication`, post-save refetch
  verifying publication identity/non-empty scope/published status/link
  availability, and explicit copy/selectable-link fallback or authenticated
  Preview against that exact verified publication in the same active run.
  Implement the bridge in `client-link-learning.ts`; in guide mode it validates
  the server-issued run/revision, delegates to the existing publish action,
  reauthorizes/rereads, and returns a short-lived
  `ClientLinkLearningReceipt` held only in current client memory. Its
  domain-separated HMAC binds authenticated user/workspace, input Project,
  current publication, publish action, run, revision, and expiry without
  serializing raw resource identifiers. The copy/fallback/Preview consume
  command reauthorizes, rereads, constant-time verifies that exact current
  binding, and conditionally appends one sanitized `publication_domain`
  completion event in the normal CAS/idempotency batch. Persist no receipt,
  URL/token, resource ID, selected Estimate ID, client name, password,
  recipient/email data, or snapshot content; never place the receipt in a URL,
  cookie, browser storage, log, diagnostic, analytics event, or Support
  context.

  Teach all live status and recovery branches: no projects/links, filtered
  empty, no manage capability, no Estimate Sheets, empty selection, invalid
  password, detail load/retry, post-save verification pending without a second
  save, clipboard unavailable/selectable-link fallback, Needs update, Expired,
  Off, Not shared, unsaved discard, query/route interruption, recipient/
  activity prerequisites, and mobile back. Pause before Drawer, wizard,
  recipient, unsaved-change, Replace, and Turn off focus owners; resume only
  after restoration or verified readback. Explain that republish issues a new
  URL and that Replace/Turn off immediately affect recipients. Never
  automatically send email, replace/turn off a link, migrate to a Portal, open
  a public recipient session, or require any destructive action. Keep
  authenticated Preview `RETURN_ONLY` and keep Client links, Proposals,
  `/share/[token]`, and Client Portals distinct.
- **Acceptance:** no guide points to hidden, unauthorized, blank, stale, or
  semantically different UI; Component reuse and Template capstone completion
  come from deliberate normal user mutations rather than installation, seeded
  presence, catalog views, or tooltip views;
  advanced guidance does not auto-restart core orientation. Client links core
  completes only from the verified manager action plus copy/selectable-link or
  authenticated Preview fact; visits, opens, tooltips, failures,
  `verificationPending`, zero-scope data, stale resources, and client assertion
  earn no credit. Project-A publish plus project-B share, cross-user/workspace,
  lost/expired/tampered/replaced receipts, stale revision, and replay after a
  winner are rejected; two generic lesson events cannot compose into core.
  Every named role/data/error/mobile branch has truthful guidance. Public
  routes never mount the Workshop host; no sensitive
  publication/recipient value reaches onboarding persistence, diagnostics,
  support, or logs; recipient/destructive/Portal actions remain optional normal
  product behavior with their existing authorization and confirmations.
- **Recovery:** disable `library_reuse` or `client_link_publishing`
  independently without changing shared state or the rest of onboarding.
  Retain a verified publication and any already completed core truth if later
  recipient/activity/clipboard guidance fails. If clipboard fails before core
  completion, keep the still-valid receipt in memory and offer selectable-link
  or Preview fallback; pause with Retry/Support when server verification is
  unavailable rather than saving twice or inventing success.
  If the volatile learning receipt is lost or expires before core completion,
  keep the publication intact and resume at `scope_and_publish`; never infer a
  same-publication binding from timestamps or unrelated lesson events.

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
  for target/route failures without raw URLs, IDs, or free-form diagnostics;
  list Estimate Sheet and Client links lessons with role/capability-aware
  status while ensuring support context cannot contain a publication token,
  URL, project/publication/recipient ID, email, or client content;
  keep reset-all guidance strictly instructional so it never archives,
  duplicates, mutates, restores, or rebinds any starter/tutorial asset.
- **Acceptance:** each action has distinct copy and mutation semantics; replay
  does not regress completion; reset preserves activation/business data; focus
  returns correctly; starter assets/claims/generations and tutorial
  version/generation binding remain unchanged; support receives only
  allowlisted context.
- **Recovery:** Settings remains a read-only status center if mutation actions
  are disabled; no durable state is lost.

### `UNIT-008` Reconcile static and proposed evidence

- **Assignment:** `BETA-008-VERIFY`
- **Status:** READY
- **Depends on:** `UNIT-005`, `UNIT-006`, `UNIT-007`
- **Owned paths:** plan/evidence artifacts only. No production ownership.
- **Work:** run permitted type/lint/static/SQL/diff checks; execute product
  tests only if the implementation request explicitly authorizes their exact
  scope; inspect every actual output; reconcile every criterion and risk,
  including exact 3/4/6/3 manifest shape; per-user grouping and ungrouped
  Sandbox; exactly two claimed custom Component folders plus protected default
  folder resolution; shared-versus-user claims; exact new/pre-existing-empty/
  joining eligibility; partial install/resume; inactive-key-only non-overwriting
  restore; shared membership revision, all-eligible-user rebind closure, bounded
  batch/resume, no-false-complete behavior, and mid-restore
  starter-organization eligibility cleanup that preserves narrower progress;
  the closed successful
  Project/Estimate creation/mutation set and every named negative case;
  tutorial idempotency/recovery; shared Estimate Sheet learning-rail state,
  complete lesson coverage, rendering-owner targets, virtualized/modal/save
  recovery, and user-origin practice predicates;
  trusted starter/tutorial origin propagation;
  instructional/tutorial/starter generation separation; concurrent
  claim/fresh-copy behavior; stale-receipt rejection; terminology; read-only
  behavior; seed-versus-practice-versus-non-starter metric separation; and the
  Client links manager curriculum, verified publication/readback plus
  copy-or-Preview predicates, target/focus ownership, every named failure
  branch, no-sensitive-persistence boundary, public-route exclusion, and
  optional recipient/destructive behavior.
  Leave bundle/browser/accessibility and other unrun behavioral evidence
  explicit.
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
5. Verify every target key has one typed definition and exactly one semantic
   rendering owner, including Estimate Tab/row math/save state and every
   publisher roster/drawer/wizard/link/recipient/activity target.
6. Verify the starter manifest against exact 3/4/6/3 cardinalities, named
   grouping/folders/categories, protected default-folder resolution,
   workspace-versus-user scope, closed auto-install predicate, partial
   install/resume, inactive-key restore, and preserved edits. Verify the
   explicit practice Project against its exact shape, unique Project identity,
   atomic claim/reopen/fresh-copy rules, preserved activation producer source,
   and non-forgeable `starter_seed`/`tutorial_seed` origins.
7. Verify practice can complete only from the closed predicates matching the
   current persisted tutorial binding; instructional reset preserves that
   binding and every starter claim/generation; stale-generation receipts cannot
   cross it; the viewer path requires no mutation; installed assets earn no
   credit by generation, presence, route visit, or open; all applicable
   Estimate Sheet lessons remain resumable; and non-starter transfer is
   reported separately.
8. Verify Client links core can complete only from current manager
   create/republish plus post-save verification and copy/selectable-link or
   authenticated Preview; verify public exclusion, no sensitive persistence,
   no automatic email/destructive action, status/error/mobile recovery, and
   separation from Proposals and Client Portals.
9. Verify every Settings command against its data contract and activation
   non-regression invariant.
10. If explicitly requested for the implementation task, run only the exact
   targeted repository, component, browser, and bundle tests in
   `03-ARCHITECTURE-DATA-AND-VERIFICATION.md`.
11. Reconcile the manifest, focused diff, migration head, and remaining risks.

## Implementation Gates

- `GATE-DATA-01`: migration, CAS, idempotency, backfill, deletion, retention,
  activation producer/origin separation, starter state/claims and scope,
  closed auto-install eligibility, resumable install, inactive-key restore,
  persisted tutorial binding, atomic unique claim, stale-receipt exclusion, and
  safe starter/tutorial lifecycle.
- `GATE-SEC-01`: server identity, membership/capability, route/telemetry
  allowlists, tenant privacy, Client links token/recipient exclusion, and
  authenticated-preview/public-recipient separation.
- `GATE-NEXT-01`: client-island, dynamic import, App Router navigation, and
  server/client serialization.
- `GATE-UX-01`: value path, comprehensive Estimate Sheet learning rail,
  read-only orientation, coherent starter workspace, user-origin completion,
  non-starter transfer, guided Client links core/optional lessons, user
  control, partial/empty/error/recovery states, and mobile.
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
| `RISK-013` | Project-only or estimate-only collaborators cannot persist guidance, are shown workspace-only tasks, or lose retained progress when grouping capability is removed. | Workspace-lifecycle FK plus server-derived access source/capabilities and a distinct starter-organization cleanup that removes only user grouping/state/claims while preserving narrower instructional/activation state and Projects. |
| `RISK-014` | Authentication drops or weaponizes a deep link before guidance starts. | Protected-route sanitizer, fragment/query policy, and destination reauthorization. |
| `RISK-015` | Generated starter/tutorial Projects, rows, totals, Components, or Templates make onboarding look complete before the user learns anything, contaminate the real activation projection, or let a client forge seed/practice origin. | Preserve activation producer `source`; server-only non-forgeable `origin_class`; append seed events without the progress upsert; recompute legacy progress from user-domain events; persist current tutorial binding; require the closed successful Project/Estimate operation set plus authoritative save/readback; grant zero credit for installation, presence, route visits, opens, organizational/destructive actions, failures, stale writes, or client assertion; and report non-starter transfer separately. |
| `RISK-016` | Replaying, refreshing, concurrent installation/restore, capability downgrade, or fresh-copy requests duplicate/overwrite work, duplicate shared assets, strand user memberships, erase retained progress, or let old receipts complete a new tutorial. | Closed manifest keys; workspace/user claim uniqueness; deterministic asset-level batches; partial/resume state; inactive-key restore generations; shared membership revision; stable bounded all-eligible-user rebind with no false complete; idempotent mid-restore starter-organization cleanup with no-active-scope readback; unique Tutorial Project indexes; state/binding CAS; checked archive/rebind/create; and stale-receipt exclusion. |
| `RISK-017` | A toy one-row sample, incomplete cost-column explanation, or Area/Branch terminology drift teaches an inaccurate mental model of Estimate Sheet hierarchy, math, and persistence. | One bounded realistic hierarchy, three-to-five purposeful rows, explicit Project/Estimate/Tab/Area/Row and Materials/Qty/Contingency/Subtotal/Adjustment/Misc/Total sequence, authoritative price/save instruction, Area-normalized copy, rendering-owner targets, recovery lesson, and expanded read-only path. |
| `RISK-018` | Defaults become clutter, hide the grouping model, collide with user-created names, duplicate per-user Projects, strand restored shared memberships, erase retained progress on role downgrade, or silently regenerate assets the user intentionally edited/archived/deleted. | Exact small shared 3/4/6/3 manifest; visible Starter/Tutorial/Reference/Sandbox labels; one per-user group plus one intentionally ungrouped Project; no automatic per-user practice Project; explicit Guided tutorial command with ordinary-visibility disclosure; separate workspace/user readiness with shared-membership revision equality; exact empty-workspace predicate; identity by closed claim rather than name; deterministic collision suffix without adoption; explicit add/inactive-key restore with deterministic all-user dependency closure; narrow starter-organization cleanup distinct from final-access erasure; and no recurring login repair. |
| `RISK-019` | “Comprehensive” becomes another exhausting tour or optional depth falsely blocks/completes core learning. | One shared learning rail, Core/Optional labels, at most four overlay steps per lesson, normal-UI handoff, independent resume/skip/restart, authoritative predicates only for price/save plus add/source, and separate transfer reporting. |
| `RISK-020` | Client links guidance exposes the wrong Estimate scope, composes publish/share facts from different Projects, leaks a token/recipient fact, confuses public share with a Portal/Proposal, sends email unexpectedly, or encourages immediate URL invalidation. | Publication-manager reauthorization; exact scope/access summary; post-save verification; short-lived in-memory HMAC receipt and atomic same-publication/run consume; A/B, stale/replaced/expired/tampered/replay rejection; no sensitive instructional fields; authenticated Preview/public-route separation; optional recipient/destructive lessons; no automatic email/replace/revoke/migration; and exact republish/Replace/Turn off consequence copy. |

## Requirement Traceability

| Requirement | Units | Acceptance criteria |
| --- | --- | --- |
| `REQ-001` | `UNIT-001`, `UNIT-008` | `AC-001` |
| `UX-001` | `UNIT-003`, `UNIT-004`, `UNIT-008` | `AC-002` |
| `UX-002` | `UNIT-002`, `UNIT-004`, `UNIT-005`, `UNIT-008` | `AC-003` |
| `UX-003` | `UNIT-003`, `UNIT-006`, `UNIT-008` | `AC-004` |
| `UX-004` | `UNIT-003`, `UNIT-004`, `UNIT-005`, `UNIT-007`, `UNIT-008` | `AC-005` |
| `UX-005` | `UNIT-004`, `UNIT-005`, `UNIT-006`, `UNIT-008` | `AC-012` |
| `UX-006` | `UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-004`, `UNIT-006`, `UNIT-007`, `UNIT-008` | `AC-014` |
| `DATA-001` | `UNIT-002`, `UNIT-007`, `UNIT-008` | `AC-006` |
| `DATA-002` | `UNIT-002`, `UNIT-004`, `UNIT-008` | `AC-007` |
| `DATA-003` | `UNIT-001`, `UNIT-002`, `UNIT-005`, `UNIT-008` | `AC-013` |
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
  reset non-regression; the exact starter 3/4/6/3 manifest; per-user group plus
  ungrouped Sandbox; exactly two claimed custom folders plus protected default
  folder resolution; closed auto-install predicate; workspace/user claim scope;
  partial resume and inactive-key non-overwriting restore; exact practice
  blueprint; non-forgeable
  starter/tutorial origin propagation through every producer; instructional
  versus tutorial/starter generation binding; atomic tutorial claim/fresh copy;
  stale-receipt exclusion; required user-origin pricing/save and add/source
  evidence; the shared Estimate Sheet learning rail and every closed lesson;
  reader orientation; source-accurate Area/row-math terminology; deliberate
  normal-action Component/Template practice; non-starter transfer reporting;
  and the Client links manager rail, verified publish plus copy/Preview core,
  target/focus ownership, failure/mobile states, no-sensitive-persistence
  boundary, public-route exclusion, and optional recipient/destructive work.
- **Implementation finish:** update evidence only from actual outputs; leave
  proposed tests unresolved when they were not requested; do not require hosted
  deployment to call local implementation complete.
- **Resume:** re-audit when React Joyride, Next.js, shell/navigation, activation
  schema, permission policy, or migration head changes.
