# Current Application and Active D1 Audit

## Audit Contract

- **Repository revision:** `a25eb56c69d4cea6e6ae2ffc1692229ae8382059`
- **Observed migration head:** `0100_user_support_system.sql`
- **Scope:** authenticated/public entry, Workshop and Admin route families,
  navigation, permissions, onboarding/help affordances, activation producers,
  guided-sample and reusable-asset truth, Estimate Sheet teaching surface,
  active migrations, Better Auth schema boundary, repositories, privacy,
  retention, account deletion, and support context.
- **Method:** current source, migration, configuration, local installed
  documentation, GitNexus index, and three independent read-only audit lanes.
- **Not performed:** product tests, builds, browser automation, screenshots,
  local migration apply, remote D1 queries, Cloudflare mutation, deployment, or
  secret inspection.
- **Confidence:** high for repository source/schema design; deployed D1 parity
  remains unverified.

## Executive Finding

Archestimator does not need a new onboarding platform. It already has:

- user-global profile/setup storage;
- workspace-global account settings;
- user × workspace activation progress;
- deduplicated activation events;
- a leased retry outbox;
- guided-sample creation;
- privacy export/erase, retention, and legal holds;
- role/capability evaluation; and
- persistent Settings and Support entry points.

The missing layer is a coherent instructional experience and its small durable
state projection. Current onboarding is fragmented and the current guided
sample is not yet a tutorial:

- `/workshop/onboarding` redirects to Settings;
- `/workshop/getting-started` redirects to Workshop home;
- `FirstEstimateChecklist` is not mounted;
- its milestone logic is stale;
- `selected_path` has no current writer;
- guided-sample creation can earn area, priced-row, and valid-total milestones
  before the user performs or understands an Estimate Sheet action;
- the sample contains one generic area and one allowance row;
- new workspaces have no guaranteed persisted starter Project collection,
  Component set, or Template set;
- there is no per-flow version/resume/reset/replay state; and
- `react-joyride` is not installed.

The correct implementation is to preserve business activation truth, add a
separate instructional projection, replace the single guided sample with one
bounded starter workspace pack plus task-based practice, distinguish generated
starter value from user-performed and non-starter value, and use Joyride only
as a lazy authenticated presentation adapter.

## Installed Runtime Baseline

| Package | Observed version |
| --- | --- |
| Next.js | `16.2.10` |
| React / React DOM | `19.2.7` |
| Better Auth | `1.6.23` |
| TanStack Query | `5.100.14` |
| Zustand | `5.0.14` |
| React Joyride | not installed |

The global provider tree is already a Client Component and wraps public as well
as authenticated routes. Adding Joyride there would place onboarding code on
public surfaces. The persistent authenticated host belongs inside
`src/components/workshop/WorkshopShell.tsx`, while the shell remains a Server
Component.

## Authenticated Entry and Journey

```text
/login
  → Google OAuth or email magic link
  → closed-beta/account-status checks
  → terms-acceptance gate
  → /workshop
      → WorkshopShell
          → desktop main navigation
          → route header, notifications, settings
          → route content
          → persistent support entry
```

### Entry facts

- Protected `/workshop` and `/admin` requests redirect unauthenticated users to
  `/login?next=<original path>` in `src/lib/auth/request-proxy.ts`.
- Login supports Google OAuth and email magic links in
  `src/components/auth/LoginForm.tsx`.
- Closed-beta access, deleted/banned/suspended states, and invited-user
  promotion are resolved in `src/lib/auth/session.ts`.
- Terms acceptance is enforced before the Workshop shell mounts in
  `src/app/workshop/layout.tsx`.
- `/signup` is a request-access surface rather than unrestricted self-service.
- `src/lib/auth/account-setup.ts` preserves only the pending-invite deep link;
  ordinary post-auth completion lands at `/workshop`.

### Onboarding consequence

First-time workspace creators, invited collaborators, and direct-estimate users
must not share one assumed entry route or one creator checklist. A server
eligibility snapshot must identify:

- current user;
- current/default workspace;
- workspace and resource capabilities;
- pending/accepted invitation context;
- authorized project/estimate route IDs;
- existing activation evidence; and
- existing instructional state.

## Whole-Application Surface Audit

The table below summarizes product families. The one-row-per-page disposition,
including public, Admin, compatibility redirects, Settings subroutes, publisher
preview, and Support, is canonical in
`04-ROUTE-AND-OVERLAY-INVENTORY.md`. The two artifacts together are the
whole-application route audit; a route absent from the inventory is a stale
trigger, not an implied onboarding target.

| Surface | Current role in product | Onboarding decision |
| --- | --- | --- |
| `/`, `/new`, marketing/auth/legal/invite/share | Public or token/session boundary | Never load Workshop Joyride or persist workspace tour state. |
| `/workshop` | Command center for recent projects/estimates, favorites, components, templates, and links | Host short orientation and persistent Getting started entry. |
| `/workshop/projects` | Project collection and first-project zero state | Core start-path guide. |
| `/workshop/projects/[projectId]` | Project dashboard and project-scoped shell | Contextual hierarchy and project insight guide. |
| `/workshop/projects/[projectId]/estimates` | Estimate collection and creation | Core first-value path for eligible editors. |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | Estimate sheet, hierarchy, rows, pricing, totals, Library/Sources | Core first-value route-local guide. |
| Project Data | Comparison/summary surface | Short contextual guide after estimate evidence exists. |
| Project Activity | Activity surface; current non-editors can receive an empty feed | Do not auto-target until state and permission semantics are truthful. |
| Project Team | Project/estimate access management | Manager-only guide explaining scope differences. |
| Project Client Portals | Manager-only portal control center | Contextual guide after manager/portal eligibility. |
| `/workshop/library` | Overview/Components/Templates tab shell | Do not target blank Overview; guide Components/Templates contextually. |
| Library Components | Workspace vs project-only reusable costs | Contextual reuse guide after first estimate value. |
| Library Templates | Browse/edit reusable estimate templates | Capability-aware contextual guide. |
| `/workshop/proposals` | Signed-in recipient inbox | Recipient-only contextual guide when rows exist. |
| `/workshop/publisher` | Sender-side Client links roster/wizard | Core manager learning path after first Estimate Sheet value or explicit eligible launch; keep public share and Client Portal boundaries distinct. |
| `/share/[token]` | Public recipient/session review route | No authenticated Workshop Joyride. |
| Settings | Profile, workspace, organization, account, legal, support, admin entries | Add **Guidance & tours** with status and reset/replay actions. |
| Support Center / feedback | Persistent support overlay and dedicated route | Core recovery destination with sanitized tour context. |
| `/admin` | Platform-admin operator application with separate shell/mobile nav | Audited but excluded from workspace-scoped beta-user implementation. |

## Information Architecture and Permission Findings

### Workshop shell

- `WorkshopShell.tsx` owns persistent root/canvas/workspace-surface anchors,
  sidebar, route content, footer/support, and optional Ask Flip.
- `MainSidebar.tsx` exposes Workshop, Projects, Library, Proposals, and Share;
  feature gates can remove destinations.
- `WorkshopRouteHeader.tsx` consistently exposes notifications and Settings.
- The shell is the narrow persistent host after auth and terms checks.

### Project and estimate hierarchy

```text
Workspace
  → Project
      → Estimate
          → Tab
              → Area / group
                  → Row
```

- `FirstProjectZeroState.tsx` already offers Blank project, Workspace template,
  and Guided sample.
- Guided-sample creation routes directly into the generated estimate area.
- `guided-sample.ts` currently defines one project, one estimate, one generic
  area, and one project-source allowance row totaling PHP 30,000.
- `activation-actions.ts` marks the Project with server-owned
  `activation_sample = 1` and `activation_sample_version = 1`, providing a safe
  legacy-classification seam.
- Project groups and memberships are per user. A Project with no membership is
  rendered in the virtual **Ungrouped** section, so the same shared starter
  Projects can be organized differently for each workspace user.
- Components are persisted workspace-wide in `cost_library_items`; custom
  `library_folders` coexist with the protected **Uncategorized** folder.
- Templates are persisted workspace-wide in D1 and organized by required
  category strings. The three static entries in
  `src/lib/component-library/estimate-templates.ts` are in-memory fixtures, not
  installed workspace records.
  compatibility seam that does not depend on names.
- `activation-actions.ts` creates that whole chain through normal project,
  estimate, area, and row mutations. The area/row writes can emit
  `first_area_created`, `first_row_priced`, and `first_valid_total` before the
  user changes anything.
- `EstimateSheetTree.tsx` supports a nested area tree in which any area can hold
  rows and child areas; the novice model is not a strictly linear
  Project → Estimate → Tab → Area → Row chain.
- Current copy alternates between **Area** and **Branch** for the same
  hierarchy operation. Onboarding cannot attach stable teaching language until
  this terminology is normalized.
- `ProjectMiniSidebar.tsx` exposes Dashboard, Estimates, Data, Activity, and
  Portals.
- Team and publication are separate header actions in
  `ProjectChromeAsync.tsx`.
- Estimate editing and Library management are separate capabilities.
- Direct estimate access can exist without project-dashboard access; the
  project route redirects such users to an authorized estimate.

### Roles and capability scopes

The application uses distinct role vocabularies:

- platform/profile: `ceo | admin | member`;
- workspace: `owner | admin | member | viewer`;
- project/estimate: `owner | admin | editor | viewer`; and
- corporate account: `owner | team_leader | member | viewer`.

Effective access combines platform, workspace, project, and estimate grants.
Estimate-level restrictions can suppress inherited project authority. An
onboarding flow therefore evaluates capabilities, not only a single role
string.

### Sharing semantics

The following are not interchangeable:

- **Proposals:** signed-in recipient inbox.
- **Client links / Share:** sender-side publication roster and wizard.
- **Public share:** token/session recipient route.
- **Client Portals:** manager-only, project-scoped content/people/discussion/
  decision/version system.

Any guide that labels all four as “proposals” would teach incorrect product
semantics.

## Existing Onboarding and Help State

### User-global profile/setup

`migrations/0005_account_settings.sql` creates
`user_onboarding_profiles(user_id)` with occupation/category, region, primary
use, consent, and `onboarding_completed_at`.

It does not contain:

- workspace;
- flow or step identity;
- content version;
- revision;
- reset/replay;
- skip/dismissal; or
- resume state.

`account-settings-d1-store.ts` retains a previous completion timestamp when a
later write supplies `NULL`, so this row is intentionally not a reusable tour
reset record.

### Workspace-global setup

`workspace_account_settings(workspace_id)` stores organization name/type,
region, company size, currency, and primary use. It is shared workspace setup,
not an individual user journey.

The current setup action writes profile completion, workspace resolution,
settings, default workspace, and security event through separate awaits. A
partial setup state is possible. The onboarding host must therefore wait for a
resolved valid workspace and must not use `onboarding_completed_at` alone as
eligibility truth.

### User × workspace activation

`migrations/0067_beta_activation_events.sql` creates:

- `beta_activation_progress`;
- `beta_activation_events`;
- `beta_activation_outbox`; and
- `beta_activation_retention_holds`.

`beta_activation_progress` already stores:

- `(user_id, workspace_id)`;
- selected path;
- linked project and estimate;
- last milestone;
- first-value timestamp;
- checklist dismiss/reopen timestamps;
- support state;
- version; and
- timestamps.

The event ledger uses `UNIQUE(workspace_id, dedupe_key)`. The outbox has retry,
lease, attempt, delivery, and bounded-error fields. Repositories validate
membership/resource chains and restrict metadata keys.

### Real activation producers

Current domain mutations record:

- workspace ready;
- project created;
- area created;
- priced row created;
- valid total reached;
- publication created;
- recipient opened;
- engagement recorded; and
- decision recorded.

There is no explicit `estimate_created` milestone. The checklist currently
marks “Create an estimate” complete at `workspace_ready`, which is incorrect.
The minimal repair is not another activation taxonomy value: an authorized
`estimates` row/current estimate context is already the canonical fact that an
estimate exists or is open. Later area, priced-row, and valid-total tasks remain
owned by activation milestones.

### Checklist state

`FirstEstimateChecklist.tsx` implements dismiss/reopen UI but has no production
callsite. `first-estimate-checklist.ts` also reports publishing as unavailable
despite implemented Client links.

Dismiss/reopen updates only an existing `beta_activation_progress` row and
checks statement success rather than exactly one changed row. A new user can
receive apparent success with no durable update.

### Activation idempotency drift

Direct event insertion uses `ON CONFLICT ... DO NOTHING`, but the progress
upsert still runs. A duplicate call can return `already_recorded` while
incrementing progress version and refreshing `updated_at`. The implementation
must make duplicate onboarding/activation integration genuinely no-op.

### Guided-sample and reusable-asset gap

The current guided sample is a first-value fixture, not a learning curriculum:

- it has no lesson/chapter model, instructional target manifest, marked
  practice row, user-action requirement, completion boundary, graduation task,
  reset/recreate command, or archive/cleanup affordance;
- sample generation can satisfy the same activation projection used to decide
  that `first_estimate_value` is no longer eligible;
- `estimateTemplates` and `sampleEstimateTree` are source fixtures/default
  values, not guaranteed persisted workspace starter content;
- the live Library reads D1 workspace Components and Templates, so a new
  workspace can truthfully be empty; and
- current Library guidance explains distinctions but does not require a user
  to create/reuse a Component or create/insert a Template.

Beta onboarding therefore needs one versioned, recoverable starter workspace
pack: a deep tutorial Project, a completed reference Project, an ungrouped
Sandbox Project, four bounded Estimate Sheets, six persisted Components, and
three persisted Templates. The tutorial keeps a small nested hierarchy,
purposeful rows, and marked user-edit tasks; the additional defaults make
Projects grouping, multi-sheet work, Component folders, Uncategorized content,
and Template categories visible before the user has to invent examples.
Generated starter records must remain distinguishable from user-performed
practice and from a first valid total in non-starter work. The marked version-1
sample must be archived before the version-2 tutorial copy is created; it must
never be silently reshaped in place.

### Estimate Sheet instructional-host gap

The live Estimate Sheet exposes the required product actions, but it has no
route-local lesson rail, stable instructional target ownership, or
authoritative lesson receipt adapter:

- the route server-derives edit and Library-management capability before
  rendering `EstimateWorkspaceClient`;
- `EstimateSheetTree` owns Area selection, search/filter, add, rename,
  hierarchy, move/reorder, and destructive confirmation;
- `row-table.tsx` owns quantity, contingency, unit-cost/materials, adjustment,
  miscellaneous-cost, subtotal, total, and row-save feedback;
- row mutations expose `idle`, `dirty`, `saving`, `saved`, and `failed`, with
  explicit offline and revision-conflict recovery;
- large hierarchies may virtualize Rows, so arbitrary Row DOM nodes are not
  durable targets; and
- current route/UI anchors are implementation details, not a typed
  rendering-owner contract.

The implementation therefore needs a resumable Estimate Sheet learning rail
whose lessons hand control to the normal editor, assign every semantic target
to its rendering owner, and complete only from server-confirmed user-origin
facts plus saved/readback state. Comprehensive coverage does not mean forcing
every optional action or manufacturing error states.

### Client links instructional-host gap

`/workshop/publisher` is already a coherent authenticated manager surface, but
it has no publisher-local onboarding host or semantic lesson contract:

- `PublisherRosterClient` owns search, project/status filters, the
  project/publication roster, create entry, query-driven drawer/wizard state,
  copy feedback, responsive detail behavior, and empty/filter states;
- `PublisherDrawer` owns status, selected-estimate/recipient/open/activity
  facts, authenticated Preview, Overview/Recipients/Activity tabs, stale
  snapshot guidance, and explicit confirmation for Replace link and Turn off
  link;
- `ShareWizard` owns exact estimate selection, client name, open-versus-password
  access, validation, authoritative create/republish, post-save refetch
  verification, unsaved-change recovery, and the verified-link completion
  screen;
- `createProjectPublication` and `republishProjectPublication` require a
  publication manager, reject a zero-estimate snapshot, issue a new public
  token, and never expose that token as onboarding state;
- the existing actions and publication audit preserve authoritative resource
  truth but do not provide an instruction-safe cross-step binding, so generic
  publish/share lesson events could otherwise compose across Projects;
- Replace link invalidates the current URL immediately; Turn off link
  invalidates the current URL and recipient URLs; and
- `/workshop/publisher/preview/[projectId]` is an authenticated preview while
  `/share/[token]` is the separate public recipient boundary.

The current source can support a literal task-based guide, but the pack's
former `HELP_ONLY` decision is stale after the user's MVP direction. The
implementation must add a route-local learning rail and stable semantic
targets without teaching Client links as Proposals or Client Portals, without
persisting/copying tokens into instructional records, and without requiring a
destructive or email-sending action for core completion.

## Responsive and Accessibility Audit

### Existing strengths

- Sidebar links expose `aria-current`, labels, focus rings, and reduced-motion
  handling.
- Favorites and empty/error states use live regions or alerts.
- Estimate save/loading/partial/error states are explicit.
- Route errors focus Retry and use `role="alert"`.
- Publisher and Support implement responsive master/detail behavior.
- Admin has an explicit mobile bottom navigation.

### Blocking gaps for onboarding

- `MainSidebar` is hidden below `lg`; `WorkshopShell` mounts no source-visible
  mobile primary-navigation equivalent.
- `ProjectMiniSidebar` is also hidden below `lg`.
- Settings uses a fixed two-column layout and a `460px` minimum height that
  needs narrow-screen treatment before claiming mobile reset/replay support.
- Joyride’s alertdialog/focus trap can conflict with the app modal stack,
  `inert`, Escape handling, and focus restoration.
- Estimate rows are virtualized; arbitrary row DOM targets may not exist.

## Existing and Required Target Anchors

### Existing useful anchors

| Surface | Existing selector |
| --- | --- |
| Workshop root | `[data-workshop-page-shell-root]` |
| Main navigation group | `[data-sidebar-primary-nav-group]` |
| First-project choice | `[data-first-project-zero-state]` |
| Project title | `[data-workshop-title-region]` |
| Team access | `[data-project-team-access-link]` |
| Publication action | `[data-publisher-project-link]` |
| Estimate center | `[data-estimate-center-column="sheet"]` |
| Estimate viewport | `[data-estimate-sheet-viewport]` |
| Library source | `[data-component-source]` |
| Template workspace | `[data-template-library-workspace]` |
| Publisher roster | `[data-publisher-roster]` |
| Settings detail | `#settings-detail-panel` |

These are implementation anchors, not yet a durable onboarding contract.

### Required semantic targets

At minimum:

```text
shell.workspace
nav.workshop
nav.projects
nav.library
nav.proposals
nav.share
nav.mobile_menu
header.getting_started
header.settings
support.open
projects.zero_state
projects.create_blank
projects.create_from_template
projects.create_guided_sample
project.navigation
project.team
project.publish
estimate.header
estimate.hierarchy
estimate.add_area
estimate.add_row
estimate.price_input
estimate.total
estimate.save_state
estimate.library
library.components
library.templates
proposals.inbox
publisher.roster
publisher.filters
publisher.create
publisher.drawer
publisher.status
publisher.wizard
publisher.wizard_estimates
publisher.wizard_client
publisher.wizard_access
publisher.wizard_save_state
publisher.link
publisher.preview
publisher.recipients
publisher.activity
portal.navigation
settings.guidance
```

## Active D1 Migration Audit

### Chain facts

- Active migration files: `92`
- Lexical head: `0100_user_support_system.sql`
- Missing numeric slots: `0056–0059`, `0061–0064`
- Duplicate numeric prefixes: none found
- Inferred final application tables: `138`
- Expected Better Auth core tables outside the active numbered chain: `4`
  (`user`, `session`, `account`, `verification`)
- `rateLimit` is explicitly created by application migration `0041`
- Index declarations: `308` (`267` unique names)
- Trigger declarations: `60` (`58` unique names)
- Lines containing FK `REFERENCES`: `239`

The numeric gaps are historical allocation gaps. Do not fill or renumber them.
The next fix-forward migration is `0101_beta_onboarding_flow_state.sql`, subject
to a fresh migration-tail and lease check at implementation start.

### Better Auth boundary

The application expects:

```text
user
session
account
verification
rateLimit
```

and indexes including:

```text
account_userId_idx
session_userId_idx
verification_identifier_idx
```

Only `rateLimit` is represented directly in active application migrations. The
remaining Better Auth SQL is compiled from installed Better Auth through
`getMigrations(...).compileMigrations()` in
`src/lib/auth/better-auth-cloudflare.ts`.

A fresh database therefore requires both provider-generated Better Auth schema
and numbered application migrations. Source inspection cannot prove the
applied hosted schema or migration ledger.

## Complete Active Table/Domain Inventory

The inventory below groups final tables by current domain ownership. Rebuild,
assertion, and transient migration names are excluded.

### Identity, access, profile, account, and beta entry

```text
closed_beta_allowed_emails
closed_beta_allowlist_audit_events
beta_feedback_submissions
beta_feedback_status_events
legal_terms_acceptances
profiles
account_security_events
user_onboarding_profiles
workspace_account_settings
deleted_accounts
rateLimit
```

Provider-generated Better Auth:

```text
user
session
account
verification
```

### Workspace, account hierarchy, roles, and membership

```text
workspaces
workspace_members
corporate_accounts
corporate_account_members
project_members
estimate_sheet_members
estimate_sheet_access_settings
```

### Projects, estimates, and activity

```text
projects
project_locations
project_groups
project_group_memberships
project_favorites
estimates
estimate_tabs
estimate_nodes
estimate_row_items
estimate_sheet_adjustments
estimate_sheet_events
estimate_favorites
estimate_sheet_user_preferences
estimate_revision_facts
estimate_mutation_receipts
activity_event_outbox
activity_event_legal_holds
```

### Cost library, reusable components, preferences, and templates

```text
component_library_telemetry_events
component_library_user_preferences
component_category_nodes
library_folders
cost_library_items
cost_library_item_price_options
component_suppliers
component_brands
cost_library_item_versions
cost_library_item_variant_cost_entries
cost_library_item_price_history
cost_library_item_state_history
cost_library_component_drafts
component_variant_attachments
project_component_attachment_retention_holds
workspace_price_freshness_policies
estimate_templates
estimate_template_nodes
estimate_template_row_items
estimate_template_versions
estimate_template_instances
estimate_template_instance_nodes
estimate_template_instance_rows
estimate_template_propagation_jobs
estimate_template_mutation_intents
```

### Collaboration and invitations

```text
collaboration_invitations
collaboration_invitation_tokens
collaboration_audit_events
```

### Publication, proposals, and shared links

```text
project_publications
project_publication_events
shared_link_recipients
shared_link_comments
shared_link_responses
shared_link_events
publication_digest_log
```

There is no standalone proposal table. Proposal output is derived from estimate
and publication state.

### Client Portal

```text
client_portal_assets
client_portal_brand_profiles
client_portals
client_portal_sections
client_portal_issues
client_portal_issue_sections
client_portal_recipients
client_portal_recipient_credentials
client_portal_recipient_grants
client_portal_threads
client_portal_messages
client_portal_thread_reads
client_portal_thread_subscriptions
client_portal_message_mentions
client_portal_decisions
client_portal_audit_events
client_portal_analytics_events
client_portal_notification_outbox
client_portal_legacy_mappings
client_portal_issue_estimate_projections
client_portal_issue_estimate_rows
```

### Onboarding and activation

```text
beta_activation_progress
beta_activation_events
beta_activation_outbox
beta_activation_retention_holds
```

### Notifications

```text
notification_definitions
notification_deliveries
```

### Uploads and storage cleanup

```text
upload_sessions
upload_assets
upload_events
upload_asset_cleanup_objects
mass_deletion_events
mass_deletion_storage_cleanup_results
```

### Privacy, retention, and operational incidents

```text
privacy_requests
data_retention_events
operational_incidents
operational_incident_events
```

### Support

```text
support_conversations
support_messages
support_message_attachments
support_drafts
support_draft_attachments
support_conversation_triage
support_conversation_labels
support_message_context
support_user_intake_claims
support_subject_privacy_fences
support_privacy_exports
support_subject_r2_objects
support_legacy_feedback_imports
support_privacy_execution_attempts
```

### Admin, release, and observability

```text
feature_flags
admin_audit_events
admin_metric_cache
cron_run_events
client_error_events
web_vital_events
ops_run_events
admin_action_items
admin_customer_notes
admin_release_records
admin_saved_replies
```

### AI operations

```text
ai_action_runs
ai_tool_calls
ai_data_access_events
security_rate_limit_events
ai_package_builder_memory_preferences
ai_package_apply_commands
```

## D1 Integrity Findings Relevant to Onboarding

### `DATA-FINDING-01` No instructional flow identity

No current table can represent multiple flows, flow content versions,
per-flow resume, restart generation, dismissal, replay, or target failure.

### `DATA-FINDING-02` Selected path has no current writer

`beta_activation_progress.selected_path` exists and is read, but no production
writer was found. The start-path choice must update this activation projection
through an authenticated action.

### `DATA-FINDING-03` Checklist update can silently affect zero rows

Dismiss/reopen must create or update progress deterministically and verify the
affected row.

### `DATA-FINDING-04` Duplicate delivery can mutate version

Event dedupe and progress mutation are not fully coupled. Duplicate
`recordActivationMilestone` delivery can still increment the progress version.

### `DATA-FINDING-05` Existing version is not a full CAS contract

`beta_activation_progress.version` increments for milestones, but checklist
visibility does not use `WHERE version=?`. New instructional state needs a true
expected-revision command contract.

### `DATA-FINDING-06` Account/membership deletion order is incomplete

`beta_activation_*` rows reference workspace membership with
`ON DELETE RESTRICT`. Account deletion removes memberships without visibly
erasing activation first. `user_onboarding_profiles` is also not explicitly
deleted or tombstoned before Better Auth identity removal.

The membership FK also excludes supported project-only and estimate-only users,
because accepted resource invitations do not create a synthetic
`workspace_members` row. New instructional state and rebuilt activation tables
must reference workspace lifecycle rather than membership lifecycle, while
server authorization continues to require a current workspace/project/estimate
grant.

The same implementation program must distinguish:

1. workspace-scoped privacy erasure;
2. loss of starter-organization/grouping capability while narrower workspace
   resource access and instructional/activation state remain;
3. removal of one access grant and final access to a workspace; and
4. full-account deletion, including the global `user_onboarding_profiles` row.

An active activation legal hold retains only the allowlisted activation and
instructional rows after access/identity removal; it cannot retain or recreate a
membership. Without a hold, final-access and full-account paths erase those
rows before identity teardown.

### `DATA-FINDING-07` Existing privacy primitives are reusable

`activation-retention.ts` already supplies:

- user/workspace export;
- erasure;
- legal-hold suppression;
- 180-day event/unresolved-outbox retention; and
- 30-day delivered-outbox retention.

`privacy-request-repository.ts` already delegates activation export and erase.
New instructional state should extend these boundaries rather than create a
second privacy framework.

### `DATA-FINDING-08` Generated starter value can masquerade as comprehension

The current sample path uses normal domain writers, so generated areas, priced
rows, and totals can advance `beta_activation_progress`. The planned starter
Reference/Sandbox Projects will use the same integrity primitives. Without
separate starter/tutorial generation classification and a user-performed
practice outcome, generated defaults could report activation while teaching
nothing.

The implementation must keep the activation taxonomy intact while ensuring:

1. shared Tutorial/Reference/Sandbox seeding writes
   `origin_class='starter_seed'`, while explicit per-user practice seeding
   records `sample_generated` and writes
   `origin_class='tutorial_seed'`; both preserve the existing activation
   producer `source`;
2. both origins remain auditable in events but never advance
   `beta_activation_progress`; legacy derived progress is recomputed from
   backfilled `user_domain` events;
3. installation, seeded asset presence, route visits, and seeded opens cannot
   satisfy checklist, user-performed practice, Library reuse, activation, or
   transfer; only the closed successful Blank/Duplicate/Template-derived
   creation and seven Estimate Sheet mutation families remain eligible
   `user_domain` checklist facts after authoritative save/readback;
4. starter/tutorial-origin activation events remain identifiable and excluded
   from non-starter conversion/transfer measures; and
5. at least one user edit and one user row/source action matching the currently
   persisted tutorial version/generation are required for tutorial-core
   completion; later non-starter transfer remains a separate outcome.

## Data Placement Decision

| Data | Canonical owner |
| --- | --- |
| Persona, region, primary use, consent | `user_onboarding_profiles` |
| Organization name/type, currency, workspace defaults | `workspace_account_settings` |
| Real activation milestones after estimate existence and first value | `beta_activation_*` |
| Project/Estimate checklist truth | successful user-domain Blank/Duplicate/Template-derived creation or one of the closed seven Estimate Sheet mutation families after authoritative save/readback in an authorized current resource context |
| Selected Blank/Template/Guided/Reference/Sandbox path | expanded closed `beta_activation_progress.selected_path` |
| Starter pack/version/assets and tutorial generation/owner | new starter-install ledger plus existing Project/group/estimate/node/row/Component/folder/Template persistence with a closed server-owned manifest and unique claims |
| Starter/tutorial seed versus ordinary activation origin | new closed `origin_class` in `beta_activation_events` and `beta_activation_outbox`; existing `source` stays producer taxonomy |
| User-performed Estimate Sheet practice, current tutorial binding, and sample reset/archive outcomes | `beta_onboarding_flow_states` and `beta_onboarding_flow_events` |
| Non-starter transfer signal | current domain/activation facts filtered by starter-asset metadata/ledger identity |
| Client links learning status and sanitized verified-action outcomes | `beta_onboarding_flow_states` and `beta_onboarding_flow_events`; publication/recipient truth remains in existing publication tables/actions |
| Same-publication Client links publish/share correlation | short-lived HMAC receipt in current client memory only; reauthorize and reread existing publication truth on consume; persist neither receipt nor binding digest |
| Tour status, semantic resume step, flow version/instructional generation | new `beta_onboarding_flow_states` |
| Tour lifecycle/failure/reset audit | new `beta_onboarding_flow_events` |
| Flow definitions, copy, target and eligibility rules | typed source catalog, not D1 JSON |

## Historical Plan Boundary

`.ai/09_archive/2026-06-03-react-joyride-onboarding-implementation-plan/`
contains a prior React Joyride proposal. It is not current implementation
authority because it assumes earlier Supabase-era persistence and route
contracts. This pack supersedes it while preserving only still-valid product
ideas such as progressive guidance and replay.

## Principal Risks Discovered

1. Deep links are discarded after most auth completions.
2. Workshop/project mobile navigation is absent in current source.
3. Active onboarding routes provide no onboarding.
4. Checklist UI is orphaned and milestone semantics are stale.
5. Estimate creation has no activation milestone, so the checklist must use the
   authoritative estimate row instead of `workspace_ready`.
6. Library Overview is blank while its loading state promises content.
7. Project-member/direct-estimate work is absent from the primary Projects
   collection.
8. Team access is icon-only and outside project navigation.
9. Proposals, Client links, public shares, and Client Portals are easy to
   conflate.
10. Role/feature/data-dependent steps cannot assume target presence.
11. Estimate virtualization makes raw DOM row targeting unsafe.
12. Settings/Joyride focus ownership can conflict.
13. Project-only and estimate-only collaborators have no workspace membership,
    so membership-owned instructional state would exclude supported users.
14. Guided-sample generation can complete first-value milestones before any
    user-performed Estimate Sheet practice.
15. The current one-area/one-row sample cannot teach nested hierarchy, row
    arithmetic, source scope, reuse, or transfer to independent work.
16. Generated starter/tutorial value and non-starter activation are not
    separated in the current outcome metrics.
17. Starter content can become clutter or overwrite intent unless identity is
    claim-based, grouping is deliberate, auto-install uses a closed business
    emptiness predicate, **Uncategorized** is resolved rather than claimed, and
    restore is explicit/inactive-key-only.
18. Live feature flags, real beta-user data, deployed migration parity, D1 FK
   integrity, and runtime focus/mobile behavior remain unproved by static
   inspection.
19. `/workshop/publisher` has no route-local guidance despite being a core MVP;
    a generic share tour could leak token/recipient context, confuse Preview
    with public share or Client Portals, or encourage destructive link changes.

## Stale Triggers

Re-audit this artifact before implementation if any of these change:

- migration head or Better Auth version;
- Workshop/Admin shell or provider tree;
- auth redirect/account-setup flow;
- primary/project/mobile navigation;
- role/collaboration policy;
- activation migrations/types/repository/outbox/retention;
- privacy or account/membership deletion;
- FirstProjectZeroState, checklist, guided sample;
- estimate hierarchy/virtualization/total/save state;
- publisher roster/drawer/wizard/publication actions, public share security, or
  authenticated Preview behavior;
- Settings, modal/dialog, Support context;
- React Joyride current major/minor; or
- Next.js client/dynamic/navigation contracts.
