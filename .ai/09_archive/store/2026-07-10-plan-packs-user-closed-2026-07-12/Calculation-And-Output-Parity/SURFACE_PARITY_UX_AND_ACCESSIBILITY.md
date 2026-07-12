# Surface Parity UX And Accessibility

## Authority And Scope

This artifact gives `UX-001`, `REQ-001`, `REQ-003`, `REQ-004`, `AC-002`, and
`AC-012` an independently reviewable journey/state contract. It does not own
unit order, readiness, or proof status.

## Cross-Surface Journey

| Surface/state | Source of truth | Declared basis | Allowed temporal difference |
|---|---|---|---|
| Editable estimate | Materialized client edit state through the canonical adapter | `working_estimate` | May be newer than persistence until save succeeds |
| Project Data/charts | Authorized persisted estimate facts | `working_estimate` | Last successful save |
| Publication/share | Immutable sanitized publication snapshot | `proposal_included_direct` | Last successful publish, never unsaved state |
| Proposal preview | Current authorized saved/export model or explicit unsaved preview adapter | Named direct and final bases | Unsaved preview must be labeled and cannot mutate publication |
| XLSX | Frozen export model for one request | Named direct and final bases | Must match the request's captured revision |
| Print package | Same proposal/publication model mounted for print | Same basis as visible proposal | No recomputation during `beforeprint` |

Every surface shows the applicable currency and enough basis/scope language to
prevent a working total from being mistaken for a final proposal total. Excluded
rows remain visible where review requires them and never enter proposal totals.

## State Matrix

| State | User-visible behavior | Recovery |
|---|---|---|
| Loading | Existing skeleton/pending semantics; no stale value presented as current | Await or retry |
| Empty estimate | Zero total and no phantom rows | Add/import rows |
| Unsaved edit | Preview recalculates from edit state; persisted/share remain unchanged | Save or discard |
| Save pending | Controls expose pending/disabled state without changing focus unexpectedly | Await completion |
| Save failure | Screen preserves edits, announces failure, persisted outputs remain prior state | Retry/correct input |
| Excluded/by-owner scope | Visible exclusion marker; absent from direct/final total | Change scope if authorized |
| Mixed currency | Per-currency groups; combined comparison disabled with reason | Normalize source data outside this pack |
| Legacy snapshot | Stored totals and compatibility label | Republish only through normal Publisher flow |
| Unknown snapshot/calculation version | Safe unavailable state, no guessed value | Operator/user retry after compatibility fix |
| Export failure | No partial download; actionable retry | Retry after structured error |
| Print cancellation/failure | Screen remains usable and temporary print tree is removed | Retry print |

## Accessibility Contract

- Currency, basis, inclusion, and adjustment labels have semantic text, not
  color-only meaning.
- Totals use table/list relationships or named regions so labels remain associated
  at 200% zoom and narrow widths.
- Scope changes, save errors, recalculated totals, export failure, and print
  preparation use restrained live-region announcements; repeated arithmetic
  changes do not create an announcement flood.
- Keyboard order follows visible order. Focus remains on the initiating control
  after recalculation/download failure and returns after any temporary dialog.
- Disabled and pending controls expose actual state; they are not simulated with
  styling alone.
- Motion is not required to understand a total change. Existing reduced-motion
  behavior is preserved.
- Print output has a logical heading/table order and omits interactive-only
  controls without hiding financial labels.

## Proof Boundary

Focused unit/DOM tests prove labels, roles, state transitions, row membership,
announcements, and focus within a rendered surface. Browser automation is
limited to `TEST-006` claims that DOM tests cannot establish: real route
integration, `beforeprint`/`afterprint`, print media visibility, and reflow of
the generated package. Screenshots or broad visual QA are not required.

If browser proof cannot run, `AC-012` remains failing with the exact reproduction
command from `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`; it is not converted to a
manual assertion.

## Ownership And Handback

Calculation owns values, named bases, and adapters. Publisher owns issue identity,
recipient workflow, public page composition, and unrelated proposal UX. Shared
files require the current Publisher integration receipt and named lease before
write. A UX reviewer returns any failure with surface, state, actor, basis,
expected semantic label/focus, and the owning UNIT-004/005/006 packet.

