# Research and Onboarding Experience Specification

## Research Scope

Research was refreshed on 2026-07-23 against:

- current React Joyride v3 documentation and releases;
- current package metadata for `react-joyride@3.2.0`;
- installed Next.js 16 documentation;
- W3C WCAG 2.2 and ARIA Authoring Practices;
- current Appcues onboarding/checklist guidance;
- current Pendo onboarding guidance; and
- Intercom’s product-tour/onboarding framework.

Vendor onboarding sources are treated as product-design evidence, not neutral
scientific proof. W3C, installed framework docs, package metadata, and Joyride’s
official documentation govern technical claims.

## Source Register

### React Joyride

- [Getting Started](https://react-joyride.com/docs/getting-started)
- [useJoyride Hook](https://react-joyride.com/docs/hook)
- [How It Works](https://react-joyride.com/docs/how-it-works)
- [Props](https://react-joyride.com/docs/props)
- [Step](https://react-joyride.com/docs/step)
- [Events](https://react-joyride.com/docs/events)
- [Recipes](https://react-joyride.com/docs/recipes)
- [Accessibility](https://react-joyride.com/docs/accessibility)
- [Migration to v3](https://react-joyride.com/docs/migration)
- [GitHub releases](https://github.com/gilbarbara/react-joyride/releases)

### Accessibility

- [WCAG 2.2 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- [WCAG 2.2 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

### Onboarding design

- [Appcues: product-tour and checklist patterns](https://docs.appcues.com/user-experiences-use-cases/different-types-of-product-tours-for-new-users)
- [Appcues: effective checklist guidance](https://docs.appcues.com/en_US/checklists/checklist-best-practices)
- [Pendo: six onboarding principles](https://www.pendo.io/pendo-blog/6-principles-for-effective-user-onboarding/)
- [Intercom: long-term onboarding guide](https://www.intercom.com/blog/onboarding-guide/)

## Current Dependency Finding

The current package metadata for `react-joyride@3.2.0` reports:

```json
{
  "version": "3.2.0",
  "license": "MIT",
  "peerDependencies": {
    "react": "16.8 - 19",
    "react-dom": "16.8 - 19"
  },
  "dist.unpackedSize": 720031
}
```

Its runtime dependencies include Floating UI, deep-merge/equality helpers,
scroll utilities, and `use-sync-external-store`. It is compatible with the
repository’s React 19 major, but the implementation must still:

1. pin the exact reviewed version;
2. update `bun.lock`;
3. run the project’s authorized dependency/security check;
4. measure emitted client gzip impact rather than infer it from unpacked size;
5. keep the import behind authenticated eligibility; and
6. record any changed transitive dependency posture.

GitHub currently marks `3.2.0` as the latest release. v3.1 introduced replay
support and explicitly strengthened “use controlled mode sparingly” guidance.

## Joyride v3 Contract

### Required API choices

- Use named exports; v3 removed the default import.
- Use `useJoyride` for controls, state, failures, and event subscriptions.
- Use `onEvent` or `on()` subscriptions; v2 `callback` is obsolete.
- Always unsubscribe event handlers to avoid React Strict Mode duplication.
- Use `before` hooks for UI preparation and route transitions.
- Use `after` hooks only for deterministic cleanup.
- Use `portalElement` for Workshop-owned layering.
- Use step `id` and application semantic `stepKey`; do not persist indices.
- Use `targetWaitTimeout` for ordinary streamed mounts.
- Consume `TARGET_NOT_FOUND` and `ERROR` events for typed recovery.

### Uncontrolled-mode decision

Official v3 guidance says:

- uncontrolled is the default;
- `controls.go` and `controls.reset` work only in uncontrolled mode;
- external `stepIndex` changes can desynchronize lifecycle behavior;
- conditional/dynamic UI should use `before` hooks; and
- most apps should avoid controlled mode.

Archestimator therefore keeps Joyride uncontrolled. Durable state does not need
to own Joyride’s numeric index. It persists:

```text
flow_key
flow_version
generation                 instructional run/reset generation
tutorial_version           guided practice only
tutorial_generation        guided practice only
current_step_key
status
revision
```

At runtime:

1. build the eligible ordered step list;
2. find the persisted semantic key;
3. derive a temporary numeric index;
4. call `controls.start(index)`; and
5. persist the next semantic key after a valid Joyride step transition.

### Route decision

Joyride recommends `before` hooks for straightforward multi-route tours and
`step.data + onEvent` for more complex routing. Archestimator reduces the need
for either by making most guides route-local.

When navigation is required:

- route intent is an application enum, not arbitrary text;
- dynamic IDs come from a server-authorized snapshot;
- the route builder validates the expected resource chain;
- the `before` hook initiates navigation;
- Joyride waits for the target;
- missing targets produce a bounded failure; and
- no hook loops on the current path.

### Focus decision

Joyride uses `alertdialog`, `aria-modal`, a focus trap, keyboard Escape, and
focus restoration. WAI-ARIA modal guidance also expects focus to move inside,
remain contained, and restore logically.

Therefore:

- do not keep a Joyride tooltip open while a user edits a form or performs a
  complex keyboard task in the app;
- use the tooltip to explain the next outcome;
- close or pause the tooltip;
- restore/focus the target;
- let the user perform the task in the normal application;
- recognize success through the real activation event; and
- offer the next guide from the checklist rather than interrupting
  automatically.

This preserves keyboard access without globally disabling Joyride’s focus trap.

## Research Synthesis

The external sources and current product audit converge on seven practical
rules:

1. **Guide to value, not a feature inventory.** A tour should help a user
   achieve the product’s promised outcome.
2. **Keep the first tour short.** Intercom suggests a few minutes and roughly
   five-to-seven steps as a ceiling; this plan is stricter at three-to-four
   orientation steps.
3. **Use progressive disclosure.** Reveal later capabilities when role, route,
   behavior, and data make them relevant.
4. **Complete checklists from real behavior.** Appcues explicitly recommends
   event/property completion rather than walkthrough views.
5. **Segment by role and goal.** Creator, collaborator, recipient, and manager
   paths are not interchangeable.
6. **Keep help on demand.** Users need to replay or resume after they skip,
   forget, or encounter a different task.
7. **Require practice and transfer.** Generated sample data, tooltip views, and
   checklist clicks cannot prove that a user understands an Estimate Sheet.

For Archestimator, the first meaningful value is not “saw the sidebar.” It is:

> The user has an authorized project and estimate, at least one priced row, and
> a valid saved total they understand.

## Experience Principles

### Product principles

- Normal application UI renders before guidance.
- Only one guide auto-starts.
- Auto-start happens once per flow version and only after route/shell readiness.
- Every tour says what outcome it will help produce.
- Every flow has Skip/Close.
- Dismissal is reversible from Settings.
- Product actions, not tooltip views, complete activation.
- Tutorial generation never completes user-performed practice.
- One realistic practice project is preferable to several disconnected demos.
- Core Estimate Sheet learning uses lesson-sized runs and normal product
  controls, not one long alertdialog sequence.
- Returning activated users are not forced through first-run content.
- Optional guides are never prerequisites for using the app.
- Copy names the user benefit before the feature name.

### Content principles

- One idea per tooltip.
- Titles use verbs or outcomes.
- Body copy targets 20–35 words; shorter where possible.
- Avoid beta-internal vocabulary, role implementation names, and database terms.
- Distinguish Project, Estimate, Template, Component, Proposal, Client link, and
  Client Portal consistently.
- Standardize **Area** as the user-facing hierarchy term. Do not teach
  **Branch** as a second name for the same action.
- Teach the real model: a Project contains Estimate Sheets; an Estimate Sheet
  contains Tabs; each Tab contains an area tree; selecting an Area reveals its
  Rows; Row totals roll up through the selected hierarchy.
- Explain permission boundaries only when they affect the current user.
- Never promise a feature that is gated, empty, read-only, or unavailable.

## Eligibility Model

### Input snapshot

The server host supplies only serializable, minimum-necessary data:

```ts
type OnboardingEligibilitySnapshot = {
  userId: string;
  workspaceId: string;
  workspaceRole: "owner" | "admin" | "member" | "viewer" | null;
  accessSource: "workspace" | "project" | "estimate";
  effectiveRole: "owner" | "admin" | "editor" | "member" | "viewer";
  capabilities: readonly OnboardingCapability[];
  entryKind:
    | "workspace_creator"
    | "workspace_member"
    | "invited_collaborator"
    | "direct_estimate";
  viewportHint: "unknown";
  resourceContext: {
    projectId?: string;
    estimateId?: string;
    nodeId?: string;
  };
  activation: SanitizedActivationSnapshot;
  flowStates: readonly OnboardingFlowStateSnapshot[];
};
```

The client derives viewport class after hydration. It does not receive names,
emails, arbitrary URLs, or unrelated resource IDs.

### Cohort matrix

| Cohort | Auto-start | Checklist | Primary next action |
| --- | --- | --- | --- |
| New eligible workspace creator | `core_orientation` | Creator checklist | Open Tutorial, Reference, Sandbox, Template, or Blank. |
| Existing non-empty workspace receiving explicit starter content | `core_orientation` only if unseen | Creator checklist resumed | Add starter content or continue existing work. |
| Invited project collaborator | `collaborator_orientation` | Capability-specific tasks only | Open assigned project/estimate. |
| Direct-estimate user | `collaborator_orientation` | No project-creation task | Open assigned estimate. |
| Viewer | Short read-oriented orientation | No edit checklist | Understand totals/navigation/support. |
| Returning user with activation progress | None | Resume from real progress | Recommended incomplete task. |
| User with valid-total first value | None | Completed/collapsed | Optional Library reuse guide. |
| Feature unavailable or gated | None for that feature | Hidden/not applicable | No dead target. |
| Mobile user | Viewport-specific step list | Same domain truth | Mobile nav and route-local actions. |

## Core Orientation Specification

### Creator desktop: `core_orientation` v1

| Step key | Target | Draft title | Draft body | Action |
| --- | --- | --- | --- | --- |
| `welcome` | centered | Welcome to Archestimator | Build a priced estimate without learning every feature first. This quick tour shows where to begin and where to get help. | `Show me` / `Explore on my own` |
| `workspace_map` | `shell.workspace` | Your estimating workspace | Projects hold the work. Components and templates help you reuse costs. Sharing stays separate so client access is intentional. | Next |
| `projects_entry` | `nav.projects` | Your starter workspace | Tutorial and Reference are grouped as Starter Examples; Sandbox stays Ungrouped so both organization models are visible. Open one, use a Template, or create Blank. | Next |
| `guidance_and_help` | `header.getting_started` | Guidance stays available | Return to Getting started for the next recommended task, starter restore, or a different path. Settings can replay/reset tours, and Support is always available. | `Learn with my starter workspace` |

### Creator mobile: `core_orientation` v1

| Step key | Target | Intent |
| --- | --- | --- |
| `welcome` | centered | Same value promise as desktop. |
| `mobile_navigation` | `nav.mobile_menu` | Explain how to reach Projects, Library, Proposals, and Share when eligible. |
| `projects_entry` | mobile Projects target | Find grouped Starter Examples, ungrouped Sandbox, Templates, or Blank creation. |
| `guidance_and_help` | `header.getting_started` | Show persistent progress/help entry. |

### Collaborator: `collaborator_orientation` v1

| Step key | Target | Draft intent |
| --- | --- | --- |
| `welcome` | centered | Welcome the user to assigned work, not workspace creation. |
| `assigned_work` | authorized project/estimate target | Explain where their assigned resource lives. |
| `effective_access` | route-local read/edit region | Explain that project and estimate access can differ and show only available actions. |
| `guidance_and_help` | Getting started/Support | Show where to revisit guidance or ask for help. |

### Auto-start conditions

All must be true:

- authenticated Workshop shell is mounted;
- terms and workspace resolution are complete;
- no application modal/dialog is open;
- no route loading/error state is active;
- current flow/version has no completed/dismissed state;
- activation import does not classify the user as already oriented;
- at least two eligible non-centered targets exist; and
- the page is visible.

If conditions do not become true within a bounded session window, do not poll
forever. Record an allowlisted reason and leave the flow available on demand.

## Getting Started and Checklist Specification

### Route

Replace `/workshop/getting-started` redirect with an authenticated page that
renders:

1. current outcome and progress;
2. recommended next task or lesson;
3. the four-task checklist or collaborator-specific state;
4. starter-pack readiness, partial/resume, explicit-add, and inactive-key
   restore states when relevant;
5. start-path choices when relevant;
6. available Estimate Sheet lessons and contextual guides; and
7. Support entry.

`/workshop/onboarding` becomes a compatibility redirect to this page.

### Creator checklist

| Item | Completion truth | Launch behavior |
| --- | --- | --- |
| Create or start work in a project | successful user-domain Project creation through Blank, Duplicate, or Template-derived creation; otherwise the first successful action from the closed Estimate Sheet mutation set below in an authorized Project context | Route to Projects with **Starter Examples**, Ungrouped Sandbox, Template, and Blank choices; generation, presence, and opens alone do not complete the item. |
| Create or start work in an estimate | successful user-domain Estimate Sheet creation through Blank, Duplicate, or Template insertion/instantiation; otherwise the first successful action from the closed mutation set below in an authorized Estimate Sheet context | Route to project Estimates or the server-authorized estimate; generation, presence, and opens alone do not complete the item. |
| Add an area and a priced row | user-domain `first_area_created` and `first_row_priced` | Launch route-local next-action guidance. |
| Reach a valid saved total | user-domain `first_valid_total` | Mark first value complete and celebrate once. |

The checklist remains four items. Starter/tutorial generation, record
existence, route visits, and deliberate opens satisfy none of them. The closed
qualifying Estimate Sheet mutation set is:

- add an Area;
- add a Row;
- insert or reuse a Component as a Row;
- change quantity;
- change unit cost;
- change adjustment; or
- change miscellaneous cost.

The mutation counts only after the authoritative server write succeeds and the
saved/readback result confirms the current authorized Project and Estimate
Sheet. The server derives both `origin_class='user_domain'` and the closed
action family; neither is accepted from serialized client input. One such
Estimate Sheet mutation may establish both the Project and Estimate checklist
contexts. Opening, viewing, selecting, navigating, renaming, reordering,
grouping, favoriting, archiving, deleting, seed/install/restore work, tour
callbacks, failed or rolled-back writes, stale writes, and client-supplied
completion flags never qualify. No new `estimate_created` activation milestone
is added. Generated area/row/total writes remain seed activity and cannot
satisfy checklist, practice, reuse, activation, or transfer outcomes. Tutorial
completion still requires its separate action predicates, and independent
transfer still requires later non-starter work.

### Start-path choice

| Choice | Product behavior | Guidance behavior |
| --- | --- | --- |
| Guided tutorial | Explain that one normal workspace practice Project will be created, then create or resume the per-user versioned practice binding from the immutable shared Tutorial manifest, write `guided_sample`, keep generation classified `tutorial_seed`, and route into the first lesson | Recommended for users who want a 10–15 minute guided Estimate Sheet practice before starting real work. |
| Reference Project | Open shared `Reference — Small Commercial Refresh`, write `starter_reference`, and preserve its two Estimate Sheets | Best for users who want to inspect a completed multi-sheet example before editing. |
| Sandbox Project | Open shared ungrouped `Sandbox — Quick Estimate`, write `starter_sandbox`, and preserve its intentionally loose organization | Best for users who want to experiment without changing the Tutorial or Reference. |
| Workspace template | Open the persisted starter and user-created Template gallery | Best when the user wants reusable structure; installation itself never counts as Template use. |
| Blank project | Create through current project flow | Best when the user already understands estimating structure and wants to begin real work immediately. |
| Explore on my own | Open Projects with **Starter Examples** and ungrouped Sandbox visible without selecting a path | Dismiss auto guidance; checklist remains available and no seed presence counts as user progress. |

### Task interaction rule

For creation/editing tasks:

1. show the explanation;
2. primary CTA says the real action, such as **Add an area**;
3. close/pause Joyride;
4. focus or route to the normal application control;
5. let the user perform the mutation normally;
6. recognize the corresponding authoritative domain fact or activation event;
   and
7. update the checklist without automatically reopening a dialog.

## First Estimate Value Guide

`first_estimate_value` is route-local and capability-aware for blank,
workspace-template, Reference, Sandbox, and self-directed work.
`guided_estimate_practice` uses the same semantic targets but remains eligible
after tutorial seed generation.

| Step key | Target | Purpose | Interaction policy |
| --- | --- | --- | --- |
| `hierarchy` | `estimate.hierarchy` | Explain that the selected Tab owns an area tree and the selected Area owns the visible Rows. | Passive, Next. |
| `add_area` | `estimate.add_area` | Explain where an area groups work. | CTA closes guide and focuses target. |
| `add_priced_row` | `estimate.add_row` or known starter/tutorial row adapter | Explain how a row becomes priced. | CTA closes guide; no arbitrary row selector. |
| `price_and_scope` | `estimate.price_input` | Explain quantity/unit cost and visible scope/adjustment only when present. | Never edit while alertdialog is open. |
| `total_and_save` | `estimate.total` plus save-state context | Explain the valid total and persisted save/error state. | Passive final step after real milestone. |

If the user already completed a task independently, filter that step before the
tour starts. Do not filter a guided-practice or first-value lesson merely
because starter/tutorial seed data already has a positive total.

## Estimate Sheet Guided Practice Curriculum

### Learning outcomes

The learning contract has three distinct levels:

1. **Tutorial-core completion:** the required `price_and_save` and
   `add_and_source` actions succeed in the currently bound tutorial generation.
2. **Optional depth:** `organize_work`, Component reuse, and the Template
   capstone deepen the same mental model but do not block tutorial completion.
3. **Independent transfer:** a later equivalent edit in a non-starter Estimate
   Sheet supplies the product-level comprehension signal; it is reported
   separately and does not keep the tutorial flow open.

Within those levels, an editor must be able to:

1. select the intended Area and identify which Rows belong to it;
2. explain and observe `quantity × unit cost`, row adjustments/misc cost, Row
   total, and estimate roll-up;
3. change a marked practice Row through the normal editor and observe a durable
   saved state;
4. add one Row or reuse one Component in the intended Area and distinguish
   project-specific from workspace-reusable source scope; and
5. later leave the starter assets and perform one equivalent edit in a
   non-starter Estimate Sheet as independent-transfer evidence.

Tooltip views, seed generation, route visits, and a precomputed total satisfy
none of these outcomes.

### Curated starter workspace pack

Automatically install starter-pack version `1` once for every new eligible beta
workspace. An existing eligible workspace may receive the same automatic
install only when the closed onboarding predicate `isStarterAutoInstallEligible`
is true:

- zero `projects` rows for the workspace;
- zero `cost_library_items` rows;
- zero `estimate_templates` rows;
- zero `project_groups` rows;
- zero non-default `library_folders` rows where `is_default_category = 0`; and
- any protected default **Uncategorized** folder where
  `is_default_category = 1` is explicitly ignored.

This is the complete starter-bootstrap predicate, not a generic definition of
workspace emptiness. A new workspace runs the installer immediately after
workspace creation. An eligible pre-existing empty workspace runs it during
authenticated onboarding reconciliation. A non-empty existing workspace
receives an explicit **Add starter content** action instead of a silent merge.
The decision order is state-first: an existing `installing`/`partial` pack
state resumes unresolved closed claims without rerunning the emptiness
predicate; `complete` is a no-op for shared assets; valid closed claims with a
missing state are recovered as `partial`. The emptiness predicate runs only
when current-version workspace state and claims are both absent, so the
installer's own partial writes cannot turn recovery into an explicit-add path.
Workspace assets are shared; Project-group organization is created per user
because Project groups and memberships are user-scoped. A joining editor never
reruns shared auto-install: if the workspace pack is complete, only their
user-scoped group/membership keys are installed; if shared state is absent in a
non-empty workspace, an owner/manager receives the explicit add action.
“Joining editor” here means a server-authorized workspace-level user with the
Projects-collection/grouping capability. Project-only and direct-estimate
collaborators do not receive or need user-scope starter organization; they use
their capability-specific onboarding state.

| Asset | Closed beta-v1 contract |
| --- | --- |
| Per-user Project group | Exactly one `Starter Examples` group claim plus exactly two membership claims for the shared Tutorial and Reference Projects. Deleting the group only returns those Projects to Ungrouped. A later personal practice membership is ordinary user organization and is not part of starter readiness. |
| Tutorial Project | Shared `Tutorial — Residential Fit-Out`; visibly labeled; one `Estimate Sheet Foundations` sheet with one `Main Estimate` Tab, one `Interior Fit-Out` parent work group, `Living & Dining`, `Kitchen`, and `Bathroom` Areas, and three-to-five purposeful Rows. It is the canonical editable starter exemplar, not the user's practice binding; practice is generated from immutable source, never by cloning this possibly edited record. |
| Reference Project | `Reference — Small Commercial Refresh`; visibly labeled; two completed Estimate Sheets named `Base Scope` and `Value Option` so users can inspect a multi-sheet Project without first constructing one. |
| Ungrouped Sandbox | `Sandbox — Quick Estimate`; intentionally has no Project-group membership; one editable `Quick Estimate` sheet with one Area, one worked Row, and one incomplete Row. |
| Starter Components | Six persisted workspace Components: `Interior Paint Finish`, `Porcelain Floor Tile`, and `Gypsum Board Partition` in claimed custom folder `Starter — Finishes`; `LED Downlight Point` and `Plumbing Fixture Allowance` in claimed custom folder `Starter — Fixtures & Services`; and `General Labor Allowance` parented to the protected folder resolved by `is_default_category = 1`. The installer creates/claims only the two custom folders; it uses the existing default-category resolver, which may ensure **Uncategorized** as a system invariant but never gives that folder a starter claim. At least one Component has two clearly labeled learning variants. |
| Starter Templates | Three persisted Templates: `Condo Fit-Out Starter` and `Powder Room Basic` in `Residential Rooms`; `Roof Deck Lounge` in `Exterior + Site`. Their current in-memory fixtures may be consolidated into the starter manifest, but the runtime result must be D1-backed workspace records. |

The shared Tutorial is the only starter Project offered as the source for
`guided_estimate_practice`, but it is never mutated as the user's practice
binding. Explicitly starting Guided tutorial creates or resumes one normal
workspace Project named `Practice — Residential Fit-Out` for that
user/workspace tutorial kind from the immutable tutorial manifest. That
user-directed practice Project is outside the starter pack's `3/4/6/3`
cardinality, is visible under ordinary workspace Project access, and is added
to that user's **Starter Examples** group. The UI states that a normal
workspace Project will be created before the command runs. Its worked example,
incomplete practice Row, and project-specific source Row retain the existing
task predicates. Reference and Sandbox teach browsing, multiple Estimate
Sheets, grouping, and safe experimentation; they do not create extra tutorial
flows.

Every starter record carries a closed `starter_asset_key`, starter-pack version,
and generation through server-owned metadata plus the install ledger. Names are
presentation, never identity. All starter content is editable, duplicateable,
archiveable, and individually restorable. A key is restorable only when it has
no active claim/resource graph: its latest claim is `missing` or `archived`.
Restore recreates only those inactive, missing-from-active-pack keys and never
overwrites a surviving edited asset. “Inactive-key restore” never means reset
or repair of an active asset. Do not copy the large `sampleEstimateTree`
fixture or seed current-price claims. All prices are visibly labeled learning
allowances with a review date.

The table names are canonical for a clean workspace. Explicit add/restore never
adopts an unclaimed same-name user asset. A collision receives the lowest
available deterministic `· Starter`, `· Starter 2`, and later suffix while the
claim keeps the canonical asset key and the UI keeps its Starter label.

### Lesson sequence

Each lesson is independently resumable and uses at most four tooltip steps.
The tooltip explains, closes, and hands control to the real editor.

| Lesson | Required user action | Completion truth |
| --- | --- | --- |
| `read_the_sheet` | Select the named Area and inspect its Rows/roll-up. | Exact sample Area selection plus the total/read-state target observed; a tooltip view alone is insufficient. |
| `price_and_save` | Change quantity or unit cost on the marked practice Row and leave the field. | User-origin row mutation, changed computed Row total, and authoritative saved state. |
| `add_and_source` | Add one normal Row or insert/reuse the marked Component in the intended Area. | User-origin Row/source mutation attached to the expected sample Area. |
| `organize_work` | Add one nested Area or move the practice Row using the normal hierarchy control. | User-origin hierarchy mutation with the sample project/version context. |
| `graduate` | Open/create a non-starter Estimate Sheet and perform one equivalent edit. | Current domain evidence from a Project with no starter-asset identity. |

`price_and_save` plus `add_and_source` are the complete tutorial-core
requirement. `organize_work`, Component reuse, and Template capstone remain
recommended optional depth; `graduate` records independent transfer later and
never blocks or reopens the completed tutorial.

### Read-only variant

`estimate_reader_orientation` teaches a viewer/direct-estimate reader to:

1. select an Area and understand which Rows are in scope;
2. read quantity, unit cost, adjustment/misc cost, Row total, and estimate
   roll-up;
3. distinguish saved data from their own access limits; and
4. find Support.

It contains no impossible edit task and never implies that viewing equals
editor practice.

### Starter recovery and cleanup

- Reopening the tutorial resumes the existing compatible tutorial generation.
- Automatic starter installation is one-time and resumable. It never reruns on
  every login and never repairs a user-archived/deleted asset without an
  explicit **Restore starter content** command.
- Shared Projects, Components, folders, and Templates install once per
  workspace. Each user receives only their own **Starter Examples** group and
  memberships; this never duplicates the shared assets. A personal practice
  Project is created only after that user explicitly starts Guided tutorial.
- Current `activation_sample_version = 1` projects are legacy fixtures, not
  compatible curriculum copies. Do not upgrade them in place or infer them by
  name. When the user chooses the new tutorial, explain the change, archive the
  marked v1 Project, and create the new versioned practice copy.
- **Restart lesson** resets instructional state only.
- **Create fresh practice copy** archives the current tutorial project and
  atomically claims a new tutorial generation, rebinds guided practice to it,
  and never overwrites user edits. Practice receipts from older tutorial
  generations remain audit history and cannot complete the new copy.
- **Archive tutorial project** is explicit and separate from guidance reset.
- Global **Reset all guidance** never deletes, rewrites, or recreates business
  or starter data. It changes instructional generation only and preserves the
  current tutorial version/generation binding and starter-install ledger.
- Seed retries are idempotent for the current tutorial generation and never create
  duplicate active tutorial assets; concurrent reopen or fresh-copy commands
  return the single server-confirmed winner.
- **Restore starter content** is a separate, checked server command. It
  recreates only inactive manifest keys whose latest claim is `missing` or
  `archived`, preserves edits and surviving active asset identities, reconciles
  the per-user Project group, and reports partial failures without presenting
  an incomplete install as ready. Restoring shared Tutorial or Reference
  increments a workspace `shared_membership_revision`, marks every affected
  eligible user scope `partial`, and rebinds membership claims to the new
  Project generation in stable user-ID order, at most 25 users per checked
  batch. The initiating command handles the first batch; **Resume starter
  restore** handles later batches, and an eligible user's authorized read may
  repair only that user's scope. A user state advances to the new revision only
  after exact Tutorial-plus-Reference membership readback. Losing only
  workspace-level grouping capability runs a distinct idempotent
  starter-organization cleanup: remove that user's Starter Examples
  group/memberships/state/claims, preserve narrower instructional/activation
  state plus every shared/practice Project, and exclude the scope from the
  revision barrier only after no-active-scope readback. Final access loss keeps
  its separate cleanup. Failed still-eligible users remain partial, and
  workspace readiness returns to `complete` only when no eligible pre-existing
  user scope is behind the workspace revision.
- Automatic shared install runs inside the authorized workspace-creation path.
  Explicit shared add/restore requires owner/manager authority. User-scope
  group/membership reconciliation and explicit Guided tutorial start require
  their narrower server-derived capabilities; project-only/direct-estimate
  access is insufficient.

## Progressive Feature Discovery

### `library_reuse`

Eligibility:

- first value reached or user explicitly opens Library;
- Components/Templates route has installed starter or user content, or a
  truthful archived/empty state;
- capability permits the target action.

Teach:

1. workspace Components vs project-only sources;
2. Component folders versus protected **Uncategorized**;
3. Templates as reusable categorized structure;
4. insertion/manage permission distinction;
5. one user-performed starter Component insertion or duplication/edit action;
   and
6. one starter Template preview/insert/duplicate action after core Estimate
   Sheet practice.

Installation, opening the Library, or viewing starter assets never completes
reuse practice. Do not target blank Library Overview.

### Audited help-only surfaces

Project Data/Activity, Team/collaboration, Proposals, Client links, and Client
Portals are audited in `04-ROUTE-AND-OVERLAY-INVENTORY.md`, but beta v1 does not
create Joyride flows for them. They retain truthful empty states,
Support/Getting started links, and ordinary inline help. A later flow-version
decision may add a short guide only after observed support or activation data
justifies it.

### Deferred Client-link guidance

Keep current product copy and help content explicit that Client links are
sender-managed publication, audience/content/access must be reviewed, and
Proposals and Client Portals are separate experiences. Do not add a
`client_sharing` flow in beta v1; revisit only after the Estimate Sheet
curriculum passes and observed beta support data justifies another guide.

## Settings: Guidance & Tours

### Placement

Add **Guidance & tours** to the ordinary Settings group near Profile/Workspace
and before Support/legal. It must be accessible to every authenticated user,
not only workspace admins.

### Information architecture

```text
Guidance & tours
  Current progress
  Resume recommended task
  Core orientation
  First estimate
  Available feature guides
  Checklist visibility
  Reset guidance
```

### Per-flow actions

| State | Primary | Secondary |
| --- | --- | --- |
| Not started | Start | — |
| In progress | Resume | Restart |
| Completed | Replay | Restart |
| Dismissed | Start again | — |
| Unavailable | Explain why | No disabled mystery action |

### Global actions and exact boundaries

- **Reopen checklist** — makes the checklist visible; does not change task
  completion.
- **Reset all guidance** — atomically increments instructional
  generation/reset count and sets every existing eligible current-version flow
  in this workspace to `not_started`; preserves projects, estimates,
  permissions, activation
  milestones, first-value history, and the current tutorial
  version/generation binding. It does not auto-launch a tour while the Settings
  modal remains open.
- Confirmation copy must state that business data is unaffected.
- Settings closes before a tour starts; the tour launches only after Settings
  focus restoration completes.

## Failure and Recovery Experience

### Missing optional target

- Skip the step with `target_not_applicable`.
- Continue only if the next step is independently meaningful.
- Record no selector or URL.

### Missing essential target

Show a recoverable tooltip/state:

> We can’t find this control in the current view.

Actions:

- Retry
- Skip this step
- Exit tour
- Contact Support

Retry is bounded and cancelable. It never reloads or loops without explicit
user action.

### Unauthorized or changed capability

- Stop the affected guide.
- Refresh the server eligibility snapshot once.
- If still unavailable, mark the flow unavailable for this session with
  `capability_changed`.
- Never reveal the hidden route or resource ID.

### Offline or mutation failure

- Viewing a guide remains local.
- Durable progress mutation failure shows a non-blocking retry state and keeps
  the last server-confirmed projection.
- Do not optimistically claim completion.
- A duplicate mutation ID returns the already-applied result.

## Accessibility Contract

- Preserve Joyride’s focus trap for passive tooltip steps.
- Do not nest Joyride with application dialogs.
- Close/pause before keyboard interaction with application controls.
- Close or `Escape` pauses the runtime and preserves `in_progress` plus the
  semantic step.
- Skip or **Don't show again** is the only tooltip path to durable
  `dismissed`.
- Programmatic stop for an application modal records a pause reason, suppresses
  dismissal handling, and resumes only through an explicit launch after focus
  restoration.
- Restore focus to the logical trigger/target, not `body`.
- Announce title, current step, total, and action.
- Custom tooltip uses semantic buttons and visible focus.
- Tooltip content reflows at 320 CSS pixels and 200% zoom.
- Focused content is not entirely obscured.
- Touch targets meet the repository/WCAG minimum.
- Reduced motion disables beacon pulse, smooth scroll, and nonessential
  transition animation.
- Mobile and desktop use different eligible step arrays.
- Orientation changes re-resolve the current semantic step without regressing
  durable progress.

## Success and Diagnostics Contract

### Measurement populations and windows

- **Eligible user:** unique
  user/workspace/flow/version/instructional-generation for which the server
  records one allowlisted `eligibility_observed` event; guided-practice cohorts
  additionally carry tutorial version/generation.
- **Started run:** unique `run_id` with `started`; replay and automatic launches
  are split by `launch_mode`.
- **Activated user:** eligible creator/editor reaching `first_valid_total`.
- **Practice completer:** a tutorial starter with both required user-origin
  `price_and_save` and `add_and_source` outcomes matching the tutorial binding
  current when completion is evaluated.
- **Independent activated user:** an eligible creator/editor reaching a valid
  total in a Project without starter-asset identity.
- **Observation windows:** same session for orientation completion; 7 days from
  first eligibility for first-value conversion; 30 days for matched
  pre/post-onboarding cohorts.
- **Minimum decision sample:** do not treat a rate as a product decision until
  both compared cohorts have at least 30 eligible users. Report raw counts
  before that threshold.

### Beta outcome targets

| Measure | Denominator | Window | Initial target |
| --- | --- | --- | --- |
| Orientation completion | Started non-replay orientation runs | Same session | `>= 60%` |
| Orientation dismissal | Started non-replay orientation runs | Same session | `<= 35%` |
| Target preparation failure | All target-prepare attempts | Rolling 7 days, minimum 100 attempts | `< 2%` |
| Guided practice completion | Guided tutorial starters | 7 days | `>= 60%` |
| Required practice integrity | Recorded practice completions | Rolling | `100%` have user-origin edit and row/source evidence |
| Starter-pack readiness | New eligible workspaces | Same session | `>= 99%` reach a complete manifest or an explicit recoverable partial state |
| Starter-content engagement | Eligible creator/editor users | 7 days | `>= 60%` open at least two starter asset classes; report user actions separately from views |
| Independent valid-total conversion | Eligible creator/editor users; all starter Projects excluded | 7 days | `>= 15%` relative lift versus the pre-onboarding matched cohort |
| Time to first non-starter valid total | Independent activated creator/editor users | 30-day matched cohorts | `>= 20%` lower median |
| Independent transfer | Guided practice completers | 7 days | `>= 50%` perform an equivalent edit in a non-starter Estimate Sheet |

Existing activation truth supplies project, area, priced-row, valid-total,
Library reuse, and sharing outcomes. Estimate creation/open completion is
derived from authorized estimate rows. New sanitized events supply eligibility,
run start/end, launch mode, step outcome, starter installation, sample
generation, user-origin practice completion, starter recovery,
dismissal/restart/replay, and target/recovery health. Starter/tutorial-origin
events are reported separately and
excluded from independent conversion/transfer measures. Targets are beta
operating goals, not permission to declare comprehension or causality without
the denominator and cohort rules above.

Before quantitative thresholds are reached, review raw outcomes from the first
five consenting new-editor beta sessions through direct support follow-up:
can the user select the intended Area, explain a Row-to-total calculation, make
one edit, recognize saved state, and repeat the action in non-starter work? This
manual beta evidence is separate from local implementation completion and does
not authorize session replay or recording.

### Privacy exclusions

Never record:

- email, name, or organization name;
- project/estimate/title/cost data;
- tenant/resource UUID;
- CSS selector or DOM text;
- full pathname, query, or referrer;
- tooltip copy;
- stack trace or SQL; or
- arbitrary metadata.

## UX Acceptance Checklist

1. One auto-start tour, maximum four steps.
2. Creator and collaborator entry are different.
3. Checklist has exactly four creator activation tasks.
4. Checklist completion uses authoritative domain facts/events.
5. No impossible task for a viewer/direct-estimate user.
6. No guide targets blank Library Overview.
7. Proposals, Client links, public shares, and Portals remain distinct.
8. Desktop and mobile target lists are different.
9. Settings exposes status, resume, replay, restart, reopen, and reset.
10. Reset preserves product and activation truth.
11. App modal and Joyride never trap focus concurrently.
12. Target failure has bounded Retry/Skip/Exit/Support.
13. Returning activated users are not auto-interrupted.
14. Only `library_reuse` ships as a beta-v1 advanced guide; every other audited
    surface has an explicit help-only or excluded decision.
15. Exactly one versioned tutorial Project is active per eligible
    user/workspace tutorial kind; retries and concurrent starts return one
    server-confirmed generation.
16. Starter/tutorial generation, seeded presence, route visits, and opens
    cannot complete checklist value, Estimate Sheet practice, Library reuse,
    activation, or transfer; only the closed successful user-domain
    creation/mutation operation set may complete the corresponding Project or
    Estimate checklist facts.
17. Practice completion requires one user-origin edit and one user-origin
    Row/source action with saved-state evidence matching the persisted current
    tutorial binding.
18. Activation producer source and non-forgeable seed origin remain separate;
    starter/tutorial-origin and non-starter activation/transfer metrics are
    separated.
19. **Area**, Row, Component, Template, source scope, and roll-up terminology
    match the live product model.
20. A viewer/direct-estimate reader receives a read-only estimate lesson.
21. Fresh-practice copy atomically archives/rebinds/creates, rejects
    stale/concurrent losers and old-generation receipts, never overwrites user
    edits, and never couples tutorial deletion to guidance reset.
22. A new eligible workspace receives exactly three starter Projects, four
    Estimate Sheets, six starter Components, and three starter Templates from
    the closed manifest.
23. For each user, the shared Tutorial and Reference appear in **Starter
    Examples** while Sandbox remains Ungrouped; joining users receive only
    group/membership keys and do not duplicate shared workspace assets.
24. Starter installation/restore is idempotent and resumable, preserves edited
    surviving assets, restores only inactive manifest keys whose latest claim
    is `missing` or `archived`, and never earns practice, reuse, activation, or
    independent-transfer credit by itself.
25. Workspace and user install states are separate; a joining user's partial
    group/membership setup cannot downgrade or masquerade as complete shared
    workspace installation, while project-only/direct-estimate collaborators
    have no user starter-organization scope.
26. Same-name user assets are never adopted or overwritten; explicit
    add/restore uses deterministic starter suffixing while claim identity
    remains canonical.
27. Auto-install eligibility uses the closed business-table predicate, ignores
    only protected default **Uncategorized**, distinguishes new,
    pre-existing-empty, and joining-editor paths, and resumes existing partial
    state before evaluating emptiness.
28. The installer claims only the two custom starter Component folders;
    **Uncategorized** is resolved/ensured through the existing
    `is_default_category = 1` invariant and receives no starter claim.
29. Restoring shared Tutorial or Reference increments the shared membership
    revision, marks every affected eligible user scope partial, deterministically
    rebinds the exact membership pair in resumable batches, and cannot return
    workspace readiness to complete while any eligible pre-existing user scope
    remains behind.
30. Blank/duplicate/Template-derived creation and the seven closed successful
    Estimate Sheet mutation families are the only first-Project/first-Estimate
    completion paths; organizational, destructive, navigational, failed,
    stale, seeded, or client-asserted actions do not qualify.
31. A mid-restore downgrade to project-only/direct-estimate access removes only
    per-user starter organization/state/claims, preserves guidance, activation,
    tutorial binding, and Projects, exits the revision barrier after checked
    cleanup, re-enters an in-progress barrier if grouping capability returns
    before shared completion, and otherwise bootstraps only the current
    revision.
