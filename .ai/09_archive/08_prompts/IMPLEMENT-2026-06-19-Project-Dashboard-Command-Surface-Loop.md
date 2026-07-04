# IMPLEMENT - Project Dashboard Command Surface (autonomous loop prompt)

> Paste this whole file as the opening message for a serious implementation session.
> It activates the canonical bounded loop in `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
> and uses the plan pack at
> `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/` as the source of truth.
> This is an adapter prompt: it points at the canonical mandate and fills in the task;
> it does not fork, weaken, or replace the plan pack.

---

## Task

Drive `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/` from
planning-ready to implemented, verified, and honestly recorded. The target route is
`/workshop/projects/[projectId]`, with the reference project route:

`/workshop/projects/22222222-2222-4222-8222-222222222222`

Success means the project dashboard is a calm workshop command surface, not a
white-background project form or decorative card grid. It must satisfy the plan pack's
requirements, implemented phase by implemented phase, with evidence strong enough to
mark each applicable row in `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md` as passed,
deferred by phase, blocked with residual risk, or failed and fixed.

Use these requested execution surfaces deliberately:

- `$ultragoal` is the durable goal owner and checkpoint ledger for the whole effort.
- `$ultrawork` is the in-session parallel execution layer for independent lanes.
- `$ultraqa` is the adversarial browser/data-state QA loop before closeout.
- `$plan` and `superpowers:writing-plans` have already shaped the source pack; do not
  restart planning unless new evidence contradicts the pack.

## Non-Negotiable Outcome

The final route must answer four project-level questions quickly:

1. What estimate sheets were touched recently?
2. Is there a current published client/share link, and what is its state?
3. What happened recently across this whole project?
4. Where exactly is this project?

Phase 1 may ship with fewer populated modules as long as deferred modules are honest:

- Recent sheets and current published link must use real data or real empty states.
- Estimate activity may be omitted or marked as a next-slice placeholder until Phase 2.
- Location may show address context and "No exact pin saved" until Phase 3.
- No fake events, fake map, fake pin, or invented provider state.

## Required Startup

1. Read `AGENTS.md`.
2. Read only the FAST PATH block at the top of `.ai/10_state/current-state.md`; then
   `rg` for this feature if more project-state context is needed.
3. Read the whole plan pack before editing:
   - `00-README.md`
   - `01-PLAN.md`
   - `02-RESEARCH-NOTES.md`
   - `03-VERIFICATION-MATRIX.md`
   - `04-RALPLAN-REVIEW.md`
   - `05-READINESS-SCORECARD.md`
   - `06-DATA-OWNERSHIP-CONTRACT.md`
   - `07-UX-STATE-MATRIX.md`
   - `08-PROJECT-ACTIVITY-CONTRACT.md`
   - `09-LOCATION-MAP-CSP-PROVIDER-ADR.md`
   - `10-MIGRATION-RLS-QA-RUNBOOK.md`
   - `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md`
4. Inspect current source before relying on the plan's file assumptions:
   - `src/app/workshop/projects/[projectId]/page.tsx`
   - `src/app/workshop/projects/[projectId]/loading.tsx`
   - `src/components/workshop/ProjectDashboardClient.tsx`
   - `src/components/workshop/ProjectRouteContentFallback.tsx`
   - `src/components/workshop/ProjectPublicationHeader.tsx`
   - `src/components/workshop/ProjectTeamspaceHeader.tsx`
   - `src/components/workshop/dashboard/*`
   - repository/data helpers under `src/lib/repositories/`
   - existing tests under `tests/vitest/`
5. Create or update a progress ledger for this work at:
   `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/LOOP_LEDGER.md`

## Mode And Loop

Run a durable autonomous loop:

`DISCOVER -> PLAN -> EXECUTE -> VERIFY -> RECORD -> DECIDE`

Default cap: 6 iterations per phase before stopping to report a blocker or residual
risk. Continue automatically on safe, reversible, local edit-test-verify work. Do not
ask for permission for normal implementation, test creation, migration authoring,
scoped local SQL proof, or source verification inside the Archestimator Supabase
project boundary already authorized in `AGENTS.md`.

Stop only on:

- proven pass for all in-scope phase requirements;
- explicit destructive/irreversible/external-production action;
- missing credentials or provider state with no useful local substitute;
- same blocking failure repeated three times with evidence;
- plan contradiction that materially changes product scope.

## Phasing Rules

### Phase 1 - Simplify Dashboard With Existing Data

Phase 1 is immediately implementable and must be completed first.

Implement:

- one continuous workshop canvas;
- one compact project command surface;
- editable project identity rail preserving existing save behavior and hidden metadata;
- recent estimate sheets ledger ordered by `updated_at desc`;
- current published link status/shortcut panel;
- honest activity placeholder or omission;
- address/no-exact-pin location placeholder;
- matching `loading.tsx` and `ProjectRouteContentFallback` so route transitions do not
  flash the old white slab;
- keyboard, screen-reader, reduced-transparency, and responsive states for the
  implemented UI.

Do not add map/geocoder dependencies in Phase 1 unless you also satisfy Phase 3.

### Phase 2 - Project Estimate Activity Timeline

Start Phase 2 only after Phase 1 passes. Follow `08-PROJECT-ACTIVITY-CONTRACT.md` and
`10-MIGRATION-RLS-QA-RUNBOOK.md`.

Implement:

- one bounded, authorized, project-scoped read path over estimate activity;
- no per-estimate fan-out;
- cursor pagination on `(created_at, id)`;
- page size default 20, hard clamp 50;
- actor hydration batched once per page;
- redacted dashboard DTO only;
- compact "Estimate activity" timeline.

If adding `project_id` to `estimate_sheet_events`, include backfill, trigger or
write-path maintenance, index, RLS/grant review, generated types, and fix-forward
notes before claiming Phase 2 complete.

### Phase 3 - Exact Project Location Pin

Start Phase 3 only after Phase 1 passes and after provider/privacy/CSP readiness from
`09-LOCATION-MAP-CSP-PROVIDER-ADR.md` is satisfied. Structured location can ship
without an interactive map if the map proof is not ready, but cannot claim map
completion without map proof.

Implement:

- dedicated `project_locations` table, not exact coordinates on broad `projects`
  readers;
- WGS84 coordinate validation;
- one active row per project for MVP;
- editor-or-higher write authority;
- read policy scoped to project/workspace access;
- save, reload, clear, and invalid-coordinate states;
- client-only lazy map island if interactive map is included;
- config-driven provider/style URL and map disabled fallback;
- visible attribution when map renders;
- leak tests proving exact coordinates do not reach public share, proposal/export,
  AI/context, analytics, or broad project readers by default.

Do not use `https://tile.openstreetmap.org` as production tile infrastructure. Do not
implement public Nominatim autocomplete or per-keystroke geocoding.

## Acceptance Criteria

The implementation is not complete until every applicable item below is proven.

### Visual And UX

- No route-local white slab in dashboard, `loading.tsx`, or layout fallback.
- No decorative action-tile grid.
- No repeated metric/stat-card row.
- No nested glass panels.
- No extra hero/overview card.
- Main workbench contains at most four project modules: Recent sheets, Published
  link, Estimate activity, Location.
- Identity rail is supporting chrome, not counted as a workbench module.
- Header, content, and footer read as one continuous workshop shell.
- Mobile around 390px stacks without horizontal overflow or overlap.
- Focus order is identity rail -> recent sheets -> published link -> activity ->
  location.
- Module names are stable accessible names: `Recent sheets`, `Published link`,
  `Estimate activity`, `Location`.
- Copy/save feedback uses polite `aria-live` feedback.

### Data And Performance

- `ProjectChromeAsync` remains streamed behind its Suspense boundary.
- Dashboard page data does not collapse chrome summaries into one page-blocking fetch.
- Page content and chrome share cached leaf helpers or have clear ownership; no
  duplicate expensive sheet/publication fetches.
- Recent sheets default limit is 5 and hard clamp is 10.
- Recent sheets are project-scoped and ordered by `updated_at desc`, with deterministic
  secondary sort.
- Recent sheets include enough route data for stable deep links and an estimate-level
  fallback when no first node exists.
- Current published link panel is shortcut/status only and does not replace the full
  `ProjectPublicationHeader` management surface.
- Recipient email/display name is absent by default.
- Activity, if implemented, uses one bounded query and redacted DTOs.
- Location, if implemented, never leaks exact coordinates to public or broad readers
  by default.

### Privacy And Provider

- No raw activity fields reach client props: `old_snapshot`, `new_snapshot`, `payload`,
  `metadata`, `raw`, `correlation_id`, or unneeded internal ids.
- Restricted sheet events do not leak through the project feed.
- Public share/proposal recipients do not receive exact internal coordinates.
- Map tests do not call public tile or geocoding services.
- Map provider/style URLs are configurable and the map can be disabled without breaking
  the dashboard.
- DSAR/export/delete/retention behavior is recorded for any structured location data.

## Expected File Touchpoints

Likely source files:

- `src/app/workshop/projects/[projectId]/page.tsx`
- `src/app/workshop/projects/[projectId]/loading.tsx`
- `src/components/workshop/ProjectDashboardClient.tsx`
- `src/components/workshop/ProjectRouteContentFallback.tsx`
- `src/components/workshop/StaticWorkshopLoadingShell.tsx`
- `src/components/workshop/project-dashboard/*`
- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `src/lib/repositories/project-dashboard-repository.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/publication/types.ts`
- `src/lib/activity/*`
- Supabase migrations only for Phase 2/3 database changes
- Generated Supabase types only after migrations

Likely tests:

- `tests/vitest/project-dashboard-client.test.tsx`
- `tests/vitest/project-dashboard-core-ui.test.ts`
- `tests/vitest/project-dashboard-route-shell-ui.test.ts`
- `tests/vitest/project-publication-header.test.tsx`
- `tests/vitest/estimate-sheet-version-control-actions.test.ts`
- new repository/action/privacy tests for activity and location phases as needed

Do not treat this list as exhaustive. Inspect current patterns and use existing
primitives from `src/components/ui/` and workshop dashboard components where practical.

## Autonomous Work Lanes

Use `$ultrawork` or native subagents when the work splits cleanly. Suggested lanes:

- Lane A, UI surface: simplify dashboard layout, identity rail, workbench modules,
  loading/fallback, responsive and accessibility states.
- Lane B, data summaries: recent sheets helper, publication summary/cache ownership,
  DTO minimization.
- Lane C, activity: repository/action, migration/index/RLS proof, redacted DTO,
  activity UI.
- Lane D, location/map: schema, RLS/types, map island, provider config, leak tests.
- Lane E, verification: test fixtures, browser artifacts, UltraQA matrix, final
  independent review.

Keep coupled edits local to the lead when they touch shared files. Use maker/checker
separation where practical: the person/lane implementing UI should not be the only
visual verifier; the person/lane implementing activity/location should not be the only
privacy or performance verifier.

## Implementation Iterations

### Iteration 0 - Baseline And Ledger

- Record current branch and `git status --short`.
- Create/update `LOOP_LEDGER.md`.
- Read and summarize current dashboard structure.
- Identify existing tests that already cover project dashboard, publication header,
  route shell/loading, estimate activity, and repositories.
- Run the smallest baseline checks that will distinguish new failures from existing
  known reds.
- Record evidence and known unrelated failures in the ledger.

### Iteration 1 - Phase 1 Data Contracts

- Add or adapt recent project sheets helper with ordering, limit, clamp, deterministic
  sort, and route fields.
- Reuse or share cached publication summary helpers with header chrome instead of
  duplicating equivalent fetches.
- Add tests for recent sheets fixtures:
  `recentSheets.empty`, `recentSheets.single`, `recentSheets.moreThanLimit`,
  `recentSheets.sameTimestamp`, `recentSheets.noFirstNode`.
- Add tests for publication fixtures:
  `publication.unpublished`, `publication.activeNoOpens`,
  `publication.activeWithPassword`, `publication.revokedOrExpired`,
  `publication.recipientIdentity`.
- Verify targeted tests and record evidence.

### Iteration 2 - Phase 1 UI Command Surface

- Remove the old project overview card, working-surface card, decorative action strip,
  and repeated metric cards.
- Preserve or deliberately replace identity rail editing behavior with tests.
- Build the command surface with one glass owner and dense row grammar.
- Add recent sheets, published link, honest activity placeholder/omission, and
  address/no-pin location placeholder.
- Use native links/buttons and shared primitives where practical.
- Verify component tests for module count, old-grid removal, empty/loading states,
  copy feedback, and action hierarchy.
- Record evidence.

### Iteration 3 - Phase 1 Loading, Responsive, Accessibility

- Align `loading.tsx`, `ProjectRouteContentFallback`, and any static loading shell with
  the simplified workbench.
- Add source/component tests ensuring old white slab classes or structures are not
  reintroduced.
- Verify keyboard order, focus visibility, live regions, tap sizing, reduced motion,
  and reduced transparency by source/component tests plus browser proof where browser
  behavior is the actual claim.
- Capture required Phase 1 browser artifacts under:
  `.omx/artifacts/project-dashboard-command-surface/phase-1/`
- Record desktop/mobile route shell proof, no horizontal overflow proof, and any
  skipped browser proof with a reason.

### Iteration 4 - Phase 2 Activity Timeline

Run only after Phase 1 passes.

- Implement project-scoped activity data path and DTO contract.
- Add migration/index/RLS/generated-types proof if schema changes are needed.
- Add tests for:
  `activity.empty`, `activity.twoPages`, `activity.concurrentInsert`,
  `activity.restrictedSheet`, `activity.sensitivePayload`, `activity.deletedSheet`.
- Prove no per-sheet fan-out and no raw field exposure.
- Render compact `Estimate activity` timeline with loading, empty, row, more-pages,
  unknown actor, deleted sheet, and error states.
- Record SQL/source/test evidence.

### Iteration 5 - Phase 3 Location And Map

Run only after Phase 1 passes and location/provider gates are satisfied.

- Implement structured `project_locations` migration, RLS, grants, generated types, and
  fix-forward notes.
- Add save/reload/clear/invalid-coordinate behavior.
- Add text fallback first; add lazy map island only if provider/CSP proof is ready.
- Add tests for:
  `location.none`, `location.addressOnly`, `location.validManualPin`,
  `location.invalidLatLng`, `location.providerDisabled`, `location.tileFailure`,
  `privacy.publicShare`, `privacy.aiContext`, `privacy.exportProposal`,
  `privacy.broadProjectReader`.
- Capture required Phase 3 browser artifacts under:
  `.omx/artifacts/project-dashboard-command-surface/phase-3/`
- Record provider, CSP, privacy, and browser evidence.

### Iteration 6 - UltraQA, Review, Cleanup

- Run `$ultraqa` against the implemented phases using the scenario matrix from
  `03-VERIFICATION-MATRIX.md`.
- Include normal, empty, many-sheets, restricted, revoked share, bad location/provider,
  keyboard-only, reduced transparency, misleading success, dirty worktree, and
  browser-only scenarios where applicable.
- Clean temporary harnesses and record cleanup status.
- Run targeted tests again after any fixes.
- Run `git diff --check`.
- Perform independent review for UI, data/privacy, and stop-condition coverage.
- Update `LOOP_LEDGER.md` with final phase status and evidence.

## Required Verification Commands

Use the exact commands that match the implemented files and current package scripts.
At minimum for Phase 1:

```bash
bun test tests/vitest/project-dashboard-client.test.tsx
bun test tests/vitest/project-dashboard-core-ui.test.ts
bun test tests/vitest/project-dashboard-route-shell-ui.test.ts
bun test tests/vitest/project-publication-header.test.tsx
git diff --check
```

For Phase 2 add activity/repository/migration/RLS proof. For Phase 3 add
location/privacy/map proof. Broad `bun run validate` is not the specific completion
gate while known unrelated reds remain, but touched files must not introduce new
failures.

Browser proof is required only for browser-only claims:

- Phase 1: route shell continuity, no white slab, desktop/mobile stacking, no
  horizontal overflow, focus/tap sizing.
- Phase 3: attribution visibility, map-control no-overlap, disabled provider fallback,
  no-WebGL fallback or documented safe substitute, text coordinate fallback.

Do not claim provider, hosted, production, or manual proof from local-only checks.

## UltraQA Scenario Matrix

Before final closeout, maintain a scenario matrix with rows for these plan scenarios:

- empty project;
- many sheets;
- concurrent activity inserts;
- restricted sheet;
- sensitive raw activity payload;
- owner activity composer output containing `raw`;
- deleted or renamed sheet;
- revoked or inactive share link;
- tile/style outage;
- map disabled by config;
- no WebGL;
- no coordinates;
- bad coordinates;
- public share route;
- AI/context route;
- hidden attribution risk;
- keyboard-only user;
- reduced transparency;
- coordinate save spam;
- monolithic fetch regression;
- accidental public provider call in tests.

Each row must include setup, command/harness, expected signal, actual result, status,
evidence, fixes, and cleanup.

## Cannot Claim Complete If

- Project activity performs O(number of sheets) reads.
- Restricted sheet events leak.
- Activity DTOs or client props contain forbidden raw fields.
- Coordinates reach public share, proposal/export, AI/context, analytics, or broad
  project readers by default.
- Map/provider tests call public tile or geocoding services.
- `ProjectChromeAsync` streaming is collapsed into a monolithic dashboard fetch.
- `loading.tsx` or `ProjectRouteContentFallback` still renders the old white slab.
- Location write authz, RLS/grants, generated types, or migration proof is missing for
  implemented database changes.
- Browser-only claims have no browser artifact and no justified safe substitute.
- Temporary QA harnesses, logs, or processes are left behind unintentionally.

## Ledger Entry Template

Append after each loop iteration:

```markdown
## YYYY-MM-DD HH:mm - Iteration N: <name>

Claim:
- <what this iteration tried to make true>

Files changed:
- `<path>` - <reason>

Verification:
- `[exit code] <command>` - <key pass/fail evidence>
- `<artifact path>` - <what it proves>

Stop-condition rows:
- `<fixture/scenario>` - passed/deferred/blocked/failed - <evidence>

Deferred by phase:
- <Phase 2/3 item> - <why it is not blocking the current phase>

Residual risk:
- <none or exact risk>

Decision:
- Continue to Iteration N+1 / fix failure / stop blocked / phase complete.
```

## Final Report Format

When done, report:

```markdown
# Project Dashboard Command Surface Closeout

## Result
- Phase status: Phase 1 <passed/deferred/blocked>, Phase 2 <passed/deferred/blocked>,
  Phase 3 <passed/deferred/blocked>
- Route:
- Commit/HEAD:

## Changed files
- `<path>` - <what changed>

## Requirements evidence
| Requirement | Status | Evidence |
|---|---|---|
| Continuous workshop command surface |  |  |
| Four-module cap and no decorative grid |  |  |
| Identity rail behavior preserved |  |  |
| Recent sheets contract |  |  |
| Published link shortcut panel |  |  |
| Activity DTO/performance/privacy |  |  |
| Location/map/privacy/provider |  |  |
| Loading/fallback shell |  |  |
| Accessibility/responsive |  |  |

## Commands run
- `[exit code] command` - evidence

## Browser artifacts
- `<path>` - evidence or skipped reason

## UltraQA
- Scenario matrix result:
- Failures found/fixed:
- Cleanup status:

## Deferred work
- <Phase 2/3 item intentionally deferred, with reason and non-blocking proof>

## Residual risks
- <risk, owner, next proof>
```

Final claim must be honest: Phase 1 can be complete while Phase 2/3 are explicitly
deferred by gate. Full plan completion requires all implemented and non-deferred Phase
2/3 rows to be proven too.
