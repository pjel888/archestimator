# 10 - Blast Radius And Dependencies

## Classification

`high-blast-radius`: the pack changes manager publishing, public recipient
rendering, auth-adjacent routes, recipient repository behavior, and seven D1
tables. Five unaffected units are ready and 18 affected, downstream, or
final-integration units remain planned pending Program deltas and named
cross-pack receipts. Execution is single-writer across shared files. The ready
slice is dependency closure, not a parallel-write schedule.

## Affected Surfaces

| Surface | Change | Principal risk |
|---|---|---|
| Publisher roster/wizard | Guided Share flow, cards, paging, device-native sharing | Entry and accessibility regression |
| Manager preview | New protected `/workshop/publisher/preview/[projectId]` route | RBAC or metadata leak |
| Public share page | Status, sticky actions, comments, rows, print, mobile tree | Recipient workflow regression |
| Public API routes | Stream body limits, 423 consistency, durable limiter, pagination | Fail-closed order regression |
| Recipient inbox | Recovery copy with existing fail-closed repository | Partial metadata exposure |
| D1 publication tables | Explicit-column FK rebuild and dead CHECK cleanup | Data/schema loss |
| Navigation/dashboard | Share terminology and entry CTAs | Global label inconsistency |

## Preserved Contracts

- Existing share token/password/CSRF/origin/session security remains in place.
- Existing D1-backed decision rate limiting is the cross-isolate authority.
- Public `/share/[token]` remains the recipient route. Manager preview is a
  separate Better Auth and project-RBAC route.
- Recipient proposal normalization stays all-or-nothing.
- Migration 0014 remains immutable.
- No QR, dependency, `package.json`, or lockfile change is in scope.
- No hosted mutation or production deploy occurs in the observed `PLAN_ONLY` run.

## Source Dependencies

| Dependency | Contract |
|---|---|
| Publication actions and snapshot builder | Reuse after signature re-read |
| `assertProjectPublicationManager` and Better Auth context | Required on every preview render |
| `checkSharedLinkDecisionRateLimit` | Durable decision admission authority |
| `RecipientEmailComposer` | Reuse; do not duplicate email flow |
| `ProjectPublicationView` | Reuse presentation with explicit read-only preview mode |
| UI primitives in `src/components/ui/` | Existing accessible dialog/drawer controls |
| Clipboard and Web Share APIs | Progressive platform features; Copy fallback |
| D1 schema from migrations 0014-0065 | Exact preflight source for migration 0066 |

## File Ownership And Serialization

Before each unit: refresh `git status`, re-read every target, and establish one
writer. Shared files are never assigned to concurrent implementation units.

| Serialized lane | Units | Shared paths |
|---|---|---|
| Public route security | UNIT-001, UNIT-002, UNIT-003, UNIT-004, UNIT-006, UNIT-007 | `src/app/api/share/[token]/**`, publication security/repository modules |
| Snapshot/data | UNIT-005, UNIT-008, UNIT-009 | snapshot module, migration 0066, roster repository |
| Publisher manager UX | UNIT-010, UNIT-011, UNIT-012, UNIT-013, UNIT-014 | sidebar, dashboard, publisher roster/wizard, protected preview page |
| Recipient share UX | UNIT-015, UNIT-016, UNIT-017, UNIT-018, UNIT-019, UNIT-020, UNIT-023 | `ProjectPublicationView`, share components, public share page |
| Recipient inbox | UNIT-021 | recipient repository, proposal row/empty state, route-gate test |
| Integration | UNIT-022 | read-only validation first; any fix returns to owning lane |

Independent read-only source inspection or test analysis may run concurrently.
Implementation writes, migrations, and integration fixes are serialized.

## Cross-Pack Contracts

The Activity/History work may consume publication event contracts but must not
reintroduce the removed public events route or `download_attempt_blocked`. Any
shared component or event-type source change is coordinated through a fresh
source re-read and a single owning implementation unit. This Publisher pack does
not edit another plan pack or current-state history.

Publisher exclusively owns `SharePageComments`, public decision UI/mutations,
and their accessibility changes. Activity supplies append-only event contracts
and an incorporated-delta accessibility handoff only; Publisher records the
applicable findings, changed paths, exact tests, and verifier result in its final
receipt. Program `PUB-DELTA-01..04` must be incorporated through a current
content-addressed receipt before any overlapping or final unit becomes ready.

## Dependency Closure

`SLICE-001` contains only `UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-006`, and
`UNIT-010`; all have no unit dependencies, so the slice is dependency-closed.
`next_unit=UNIT-001`. The other 18 units are `PLANNED`; their explicit future
edges remain: UNIT-009 waits for UNIT-008; UNIT-011 waits for UNIT-010; UNIT-012
waits for UNIT-010 and UNIT-011; UNIT-013/014 wait for UNIT-011; UNIT-018 waits
for UNIT-004; UNIT-023 waits for UNIT-010/017; UNIT-022 waits for all other units.
Workstream labels in `IMPLEMENTATION_PLAN.md` add no dependency edge.

## Stop Conditions

Stop the active unit on an unexpected shared-file diff, source signature drift,
authorization ambiguity, migration parity failure, or any need for a new package.
Replan before widening scope.
