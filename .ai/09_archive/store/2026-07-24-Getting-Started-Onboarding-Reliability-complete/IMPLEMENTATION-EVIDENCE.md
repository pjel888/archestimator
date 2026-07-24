# Getting Started Onboarding Reliability — Implementation Evidence

## Result

The requested onboarding reliability work is implemented locally. The dashboard
no longer shows a false cross-session conflict during an initial automatic
launch, guided practice works independently of starter-pack installation,
Getting Started exposes truthful starter recovery controls, and Settings
provides automatic-guidance, replay/resume/restart, checklist reopen, and
restart-all controls.

No production deployment, remote D1 mutation, migration apply, provider change,
commit, push, or branch operation was performed.

## Requirement Audit

### REQ-001 — Guided practice is independently startable

PASS. Guided-practice creation treats the Starter Examples group as optional,
conditionally adds group membership, and repairs/resumes an existing practice
without requiring starter installation. Focused D1 tests cover absent and
present starter state. Live browser verification resumed an existing owner
practice and opened the bound Estimate Sheet.

### REQ-002 — Selected path reflects committed work

PASS. The selected guided path is persisted only by the checked successful
create batch or after a valid existing practice is found. Failed creation cannot
pre-commit `guided_sample`.

### REQ-003 — Starter content is actionable and truthful

PASS. Snapshot derivation distinguishes automatic install, explicit add,
partial/resume, inactive/restore, and complete states. Getting Started exposes
role-aware add, resume, and restore actions without duplicating active assets.
Owner/admin shared mutations and current-user organization repair remain
separate authorization paths.

### UX-001 — Getting Started reflects persisted controls

PASS. Dismissed checklist state is honored. Path cards reflect starter and role
eligibility. Pending and recoverable mutation states refresh from authoritative
server state instead of saving false progress.

### UX-002 — Guidance lifecycle is controllable

PASS. Settings exposes automatic guidance on/off, per-flow resume/replay and
restart, checklist reopen, and restart-all. Manual launches remain available
while automatic guidance is off. Initial stale launch conflicts stop the stale
tour and refresh silently; mid-guide conflicts retry against an explicit latest
resume URL and refreshed server snapshot.

### SEC-001 — Role boundaries remain enforced

PASS. Viewer/reader flows remain non-mutating, guided-practice creation requires
project-create/edit capability, shared starter mutations require owner/admin,
and per-user repair is scoped to the current actor.

### REQ-004 — Supported journeys are freshly verified

PASS. Focused, broader, isolated E2E, static, local D1, and live browser
verification cover the requested behavior. Representative existing-owner and
isolated first-use fixtures were exercised; member/editor and viewer/reader
boundaries are covered by the server/action and eligibility regression suite.

## Automated Verification

- `bun run test:dom -- tests/vitest/onboarding-tour-client.test.tsx`
  passed: 1 file, 11 tests.
- The onboarding test inventory selected by onboarding imports and contracts
  passed: 31 files, 217 tests.
- `bun run test:e2e -- e2e/onboarding-settings.spec.ts` with the isolated local
  onboarding fixture passed: 2 Chromium tests in 3.3 minutes.
- Scoped ESLint completed with 0 errors. It reported one existing
  `react-hooks/incompatible-library` warning for TanStack Virtual's
  `useVirtualizer()` in `row-table.tsx`.
- `git diff --check` passed.
- A repository typecheck was attempted. It remains blocked by unrelated shared
  worktree errors in stale generated `.next` settings-route validators and
  nullable `targetResult.target` references in
  `src/lib/admin/user-actions.ts`; no onboarding file was reported.

## Live Browser And D1 Evidence

- Starting guided practice from the real Getting Started page resumed the
  correct practice project and reached Step 3, “Price and save,” without a
  Guidance paused banner.
- The highlighted price target resolved to the intended
  `Porcelain Floor Tile` row carrying `guidedPracticeRole = price_and_save`.
- A user-origin browser edit changed unit cost to `1850`; local D1 readback
  confirmed `unit_cost = 1850`.
- Local D1 recorded `practice_action_completed` with
  `source = tutorial_practice` and
  `step_key = practice_price_and_save`.
- Step 4, “Add and source,” resolved the visible wide-screen Sources sidebar
  target after the target registration repair.
- The Settings modal and direct `/workshop/settings` route rendered the full
  Guidance & tours controls without the transient QueryClient error.
- Automatic guidance was toggled on to off to on, a saved guide was resumed,
  then closed. The launch query was removed and the same shell did not relaunch
  guidance after repeated waits; D1 recorded one `flow_paused` event with
  `reason = user_close`.
- The isolated E2E fixture verified automatic launch, pause, deactivate, manual
  relaunch while deactivated, reset, reactivate, mobile viewport behavior, and
  exclusion of the authenticated onboarding host from public/share routes.

## Independent Review

The independent review identified and resolved:

1. Generic first-editable-row targeting and false price credit.
2. Duplicate route-failure persistence and imprecise recovery reason.
3. Mid-guide conflict retry that did not force latest server state.
4. An unchecked legacy practice-repair batch.
5. A residual initial-conflict race where the stale Joyride instance remained
   active during refresh.

The final repair stops stale tours before refresh, refreshes after explicit
resume replacement, uses checked D1 batches, prioritizes the intended guided
price row, and locks the behavior with regression assertions.

## Residual Risk

No known onboarding blocker remains. The only verification gap is the unrelated
repository-wide typecheck failure described above; scoped lint, focused tests,
the broader onboarding suite, E2E, live browser behavior, and local D1 readback
all pass for this change.
