# RALPLAN Review

Date: 2026-06-19
Status: completed with follow-up multi-lane planning audit

## Architect Review

Verdict: iterate.

Accepted findings:

- The route Suspense fallback was missing from the visual scope. `ProjectRouteContentFallback` can still show the old white slab even if the dashboard component and `loading.tsx` are simplified.
- Publication and recent-sheet ownership needed a shared request-cached data boundary because `ProjectChromeAsync` already fetches publication and sheet summaries.
- Activity timeline helper reuse was under-specified. The plan now requires a stable shared activity module or exported helper boundary before project timeline code depends on those helpers.
- Exact coordinates on `projects` are too leak-prone while broad `select("*")` project readers still exist. The plan now prefers a dedicated `project_locations` table.

Plan patches applied:

- Added `ProjectRouteContentFallback` to UI/loading scope and acceptance criteria.
- Added shared request-cached dashboard helper requirement.
- Added recent-sheets data contract.
- Added activity helper extraction/shared-boundary requirement.
- Changed Phase 3 location default to `project_locations`.
- Added privacy tests for broad project readers, AI/context surfaces, and public share surfaces.

## Critic Review

Verdict: iterate.

Accepted findings:

- The shared dashboard helper wording could have caused a monolithic page-blocking fetch and undone `ProjectChromeAsync` streaming.
- Phase 1's "existing data paths" wording contradicted the recent-sheets requirements because the existing publication picker helper is sheet-code ordered and lacks route fields.
- Project activity needed an explicit redacted dashboard DTO because owner activity composition can include raw payload data.
- `project_locations` needed a real schema/RLS contract, not just a table name.
- Map/provider fallback needed configuration, a disable path, and mocked provider tests.

Plan patches applied:

- Replaced monolithic loader wording with request-cached leaf helpers and a requirement to preserve `ProjectChromeAsync` Suspense streaming.
- Replaced Phase 1 recent-sheets wording with a dedicated `updated_at desc` project recent-sheets helper contract.
- Added redacted project activity DTO requirements and migration requirements for `estimate_sheet_events.project_id`.
- Added `project_locations` schema, RLS, validation, uniqueness, grants, generated-type, and fix-forward requirements.
- Original closeout added OpenFreeMap configuration, provider-swap, disable/fallback, no-SLA, and mocked-test requirements. The 2026-06-19 Google Maps/Places addendum supersedes that provider direction and requires removing OpenFreeMap/MapLibre during the implementation follow-up.
- Added visual acceptance checklist blocking extra hero cards, metric rows, action grids, and nested glass panels.

## Review-Driven Changes

Architect and critic pass changes are recorded above. A final critic re-check was attempted after patching, but the subagent thread limit was reached; the remaining closeout uses local static verification.

## Follow-Up Audit Closeout

The later multi-lane planning audit resolved the stale review gap by adding:

- `05-READINESS-SCORECARD.md`
- `06-DATA-OWNERSHIP-CONTRACT.md`
- `07-UX-STATE-MATRIX.md`
- `08-PROJECT-ACTIVITY-CONTRACT.md`
- `09-LOCATION-MAP-CSP-PROVIDER-ADR.md`
- `10-MIGRATION-RLS-QA-RUNBOOK.md`
- `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md`

No implementation is claimed by this review file. It only records that the planning pack now has explicit contracts for the gaps found by the architect, critic, and follow-up audit lanes.

## Supersession Note

The original RALPLAN review remains useful historical context for why provider fallback, CSP, privacy, and mocked-provider tests were added. Its provider choice is no longer current. The active provider decision is Google Maps Platform only, documented in `01-PLAN.md`, `02-RESEARCH-NOTES.md`, and `09-LOCATION-MAP-CSP-PROVIDER-ADR.md`.
