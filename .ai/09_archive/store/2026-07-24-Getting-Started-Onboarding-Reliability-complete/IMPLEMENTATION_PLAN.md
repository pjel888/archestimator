# Getting Started Onboarding Reliability

## Outcome

Every control on `/workshop/getting-started` works for its supported role and
workspace state. Guided practice starts or resumes without requiring the
workspace starter pack, starter content can be added or recovered intentionally,
checklist visibility is respected, and onboarding can be paused, resumed,
replayed, restarted, enabled, or disabled from Settings without false conflict
messaging.

## Scope

- `/workshop/getting-started` path cards, checklist, starter state, guides, and
  recovery feedback.
- Guided-practice project creation, resume, fresh-copy recovery, grouping, and
  selected-path persistence.
- Starter-pack readiness and explicit add/resume/restore controls.
- Shared onboarding host behavior and Settings guidance controls.
- New/existing users across creator, editor/member, and viewer/reader access.
- Desktop and mobile launch eligibility and route coordination.

## Non-Goals

- No production deployment, remote D1 mutation, migration, or provider change.
- No redesign of Estimate Sheet, Projects, Library, or Client Links.
- No compatibility layer or feature flag.
- No credit for seeded examples, route visits, opens, or passive guidance.

## Current Evidence

- The reported guided-practice failure is caused by
  `requirePracticeContext()` requiring a user-scoped `group.starter_examples`
  claim after automatic starter installation correctly declines a non-empty
  existing workspace.
- The practice project is a separate normal project. The starter group is used
  only for optional organization; it is not required for practice persistence,
  learning evidence, or flow state.
- The path chooser currently saves `guided_sample` before practice creation, so
  a failed creation leaves a false selected path.
- Starter readiness defines `explicit_add`, but the snapshot never derives it
  and the Getting Started page exposes no add/resume/restore action.
- Checklist dismissal is loaded but ignored on Getting Started.
- A stale initial shell snapshot can replay an initial start mutation and show a
  false “changed in another session” conflict; the client now refreshes that
  snapshot silently and refreshes after terminal mutations.

## Requirements

### REQ-001 — Guided practice is independently startable

Any actor with workspace project-create/edit access can create or resume guided
practice whether starter content is absent, partial, complete, or intentionally
not installed. If the user already has a Starter Examples group, practice is
filed there; otherwise it remains an ordinary ungrouped practice project.

### REQ-002 — Selected path reflects committed work

`guided_sample` is saved only in the same successful batch that creates the
initial practice, or when an existing valid practice is resumed. A failed
practice start cannot leave a newly selected guided path.

### REQ-003 — Starter content is actionable and truthful

Empty workspaces may auto-install. Existing non-empty workspaces report
`explicit_add`. Owners/admins can explicitly add, resume, or restore starter
content. Members can complete missing per-user starter organization when shared
content is ready, but cannot mutate shared starter content without authority.
No action duplicates active starter assets.

### UX-001 — Getting Started reflects persisted controls

Dismissed checklists are hidden and point users to Settings to reopen them.
Available and unavailable paths are accurate. Mutations expose pending,
success-refresh, and recoverable error states without persisting false progress.

### UX-002 — Guidance lifecycle is controllable

Settings exposes automatic-guidance enable/disable, checklist reopen, per-flow
resume/replay/restart, and reset-all guidance. Manual launches remain available
when automatic guidance is disabled. Initial stale snapshots do not show a false
cross-session conflict.

### SEC-001 — Role boundaries remain enforced

Viewers cannot create guided practice. Shared starter installation and restore
remain owner/admin operations. User-scope organization can be repaired only for
the current actor.

### REQ-004 — Supported journeys are freshly verified

Focused tests cover guided practice with and without starter content, all path
cards, checklist dismissal, starter controls, conflict refresh, roles, and
recovery. Browser verification covers the real Getting Started page, Settings
controls, the guided-practice route, manual launch with automatic guidance off,
and representative new/existing user states on desktop and mobile.

## Decisions

### DEC-AUTO-001 — Starter grouping is optional

Do not install a shared starter pack merely to start guided practice. Resolve the
current user’s Starter Examples group when present and conditionally add the
membership.

### DEC-AUTO-002 — Preserve atomic selected-path persistence

The initial guided-practice D1 batch remains the authority for
`selected_path = 'guided_sample'`. The client does not save that path first.

### DEC-AUTO-003 — Reuse existing starter mutations

Expose `addStarterContent`, `resumeStarterContent`, and
`restoreStarterContent`; do not create a second installer or new persistence
model.

### DEC-AUTO-004 — Verify with local evidence only

The user explicitly requested comprehensive tests. Use authorized focused/full
local tests and browser checks. Do not deploy or mutate remote provider state.

## Implementation Units

### UNIT-001 — Repair guided-practice creation

Owned paths:

- `src/lib/onboarding/guided-sample-actions.ts`
- `src/components/onboarding/GettingStartedProgress.tsx`
- `tests/vitest/guided-estimate-sample.test.ts`

Implementation:

- Make Starter Examples group identity nullable.
- Conditionally create group membership.
- Keep starter auto-install for eligible empty workspaces.
- Stop saving the guided path before practice creation.
- Prove start/resume in an existing non-empty workspace without starter state.

Acceptance evidence: `TEST-001`, source diff, D1 assertions.

### UNIT-002 — Complete starter and checklist UX

Depends on: `UNIT-001`.

Owned paths:

- `src/lib/onboarding/flow-actions.ts`
- `src/components/onboarding/GettingStartedProgress.tsx`
- focused snapshot/component tests

Implementation:

- Derive `explicit_add` for non-empty workspaces with no starter state.
- Render add/resume/restore controls with role-aware copy and refresh.
- Hide dismissed checklist details and link to Settings for reactivation.
- Cover every path action and failure recovery.

Acceptance evidence: `TEST-001`, `TEST-002`.

### UNIT-003 — Verify onboarding lifecycle and routes

Depends on: `UNIT-001`, `UNIT-002`.

Owned paths:

- existing onboarding runtime/settings tests
- focused browser specs or equivalent local browser fixtures

Implementation:

- Reconcile the flow catalog against every route and target.
- Verify new/existing creator, editor/member, and viewer/reader states.
- Verify auto guidance on/off, manual launches, reset/restart/replay, desktop,
  mobile, missing-target recovery, and false-conflict suppression.

Acceptance evidence: `TEST-002`, `TEST-003`.

### UNIT-004 — Review and close out

Depends on: `UNIT-003`.

Implementation:

- Run an independent correctness review over the scoped diff.
- Fix valid findings.
- Reconcile every requirement, test result, browser observation, and residual
  risk in this pack.

Acceptance evidence: `EVID-004`.

## Verification Contract

### AC-001

Guided practice starts in a non-empty workspace with no starter state and
creates no invalid group membership; it remains grouped when the starter group
exists.

### AC-002

Every Getting Started path and starter action calls the correct server action,
routes correctly, recovers from failure, and respects checklist dismissal and
role gates.

### AC-003

The focused and broader onboarding test set passes, including the stale initial
conflict regression.

### AC-004

Browser evidence shows the real Getting Started, guided practice, Settings,
automatic/manual guidance, and representative role/device journeys behave as
specified.

## Tests

### TEST-001 — Focused behavior tests

Run guided-practice and Getting Started component/action tests, including local
D1 graph assertions.

### TEST-002 — Broader onboarding suite

Run the existing onboarding, starter-pack, activation, route-coordinator, and
settings test set plus lint/type validation for changed files.

### TEST-003 — Browser journey matrix

Use the existing local development server and isolated local fixtures to verify
the real UI across representative new/existing roles and desktop/mobile
viewports. Preserve unrelated local user data.

## Risks

### RISK-001 — D1 batch fencing regression

Making group membership conditional must not break the `changes()`-based
initial/fresh-copy fencing chain.

### RISK-002 — Shared starter authorization leak

Do not expose a UI path that lets members install or restore shared assets.

### RISK-003 — Browser fixture contamination

Browser verification must use scoped local fixtures or reversible state capture,
not destructive resets of unrelated users/workspaces.

## Recovery And Resume

- Re-read the current diff before editing shared onboarding files.
- If guided practice fails, inspect the latest `POST /workshop/getting-started`
  log and the current actor’s local D1 starter/flow rows.
- If a browser fixture cannot represent a role safely, retain unit/D1 proof and
  record that exact browser gap rather than mutating unrelated local data.
- All implementation units are verified; no executable unit remains.

## Completion Audit

- `REQ-001`: PASS — guided practice is independent of starter installation.
- `REQ-002`: PASS — guided path selection follows successful persisted work.
- `REQ-003`: PASS — starter add/resume/restore states and role gates are wired.
- `UX-001`: PASS — checklist, path, pending, and recovery states are truthful.
- `UX-002`: PASS — Settings lifecycle controls and stale-conflict recovery work.
- `SEC-001`: PASS — creator/editor/viewer and shared/user scopes remain enforced.
- `REQ-004`: PASS — focused, broad, E2E, browser, D1, lint, and review evidence
  is recorded in `IMPLEMENTATION-EVIDENCE.md`.

## Stop Condition

Stop only when every requirement has fresh passing evidence, valid reviewer
findings are resolved, the pack validates, and no safe in-scope repair remains.

Stop condition achieved locally on 2026-07-24.
