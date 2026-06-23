# 10 - Decisions, Dependencies, Resolved Defaults

## Decisions Made

| ID | Decision | Rationale |
|---|---|---|
| D-01 | Scope is the whole Library route family, not Overview only. | The visual mismatch exists across Overview, Components, Templates, and Template Editor. |
| D-02 | Estimate Sheet is the primary baseline. | Library is a work surface with dense data, tree rails, sticky headers, and optional docks. |
| D-03 | Dashboard is inspiration only. | `DESIGN.md` marks Dashboard as path-scoped/exploratory. |
| D-04 | This pack is planning-only. | The user asked for a comprehensive plan inside the plan directory; no app code changes are required here. |
| D-05 | Surface slots come before route reskins. | Avoids broad class scattering and keeps rollback simple. |
| D-06 | Shared primitive cleanup comes last. | `HeaderIconToolbar`, `TreePanelHeader`, and `TabStrip` have non-Library consumers. |
| D-07 | Dense mode remains first-class. | Prior Library proof established dense/perf value; this UI pass must not regress it. |
| D-08 | Browser proof is deferred until implementation. | Planning docs cannot prove paint/geometry; browser automation is not default for docs-only work. |
| D-09 | Phase 0 must be Library-local. | Shared helpers and CSS can affect Estimate, Projects, Share, and Activity chrome. |
| D-10 | Overview moves before Components/Templates implementation. | It is the `/workshop/library` entrypoint and the most visible white-page mismatch. |

## Dependencies

| Dependency | Owner | Needed before |
|---|---|---|
| Library-local slot contract | implementation lead | Overview/Components/Templates class swaps |
| Header toolbar contract | implementation lead + reviewer | Any toolbar row rewrite |
| Shared primitive tests | implementation lead | Phase 5 shared primitive cleanup |
| Browser visual matrix | implementation lead/verifier | Completion claim for UI implementation |
| Existing Library DOM tests | implementation lead | Any behavioral surface change |

## Resolved Defaults And Phase Gates

These replace the earlier open-question list. They are no longer planning blockers.

| ID | Question | Default / gate |
|---|---|---|
| R-01 | Overview two ledgers or one ledger plus rail? | Default to two compact ledgers: Recent Components and Recent Templates. Keep a compact health strip above them. If implementation evidence shows crowding at 1024px, collapse Templates into a secondary rail as a Phase 1 design gate. |
| R-02 | Templates provider boundary? | Default to wrapping `TemplatesBrowsePageClient` locally with `LibrarySurfaceVariantProvider`. Defer a higher Library layout provider until Components and Templates both prove the slot contract. |
| R-03 | Primary add emphasis on Components? | Default to one visible primary command: Add Component. Add Folder, Add Template Group, and Add Template remain icon/secondary/menu actions unless route context proves otherwise. |
| R-04 | Popup material strategy? | Default to local wrapper classes when the popover API supports `className`. If portal internals require primitive changes, defer to Phase 5 shared cleanup with shared tests. |
| R-05 | Template Editor mobile behavior? | Default to desktop/laptop material parity plus no-regression mobile source review. Full mobile drawer behavior is deferred unless existing tests/browser proof show a regression caused by this pass. |

## Cross-Lane Dependency Reconciliation

- Dashboard/Projects lane warned not to promote Dashboard's path-scoped design globally. Accepted.
- Library gap lane recommended Estimate workspace as the primary baseline. Accepted.
- Toolbar lane required explicit route-family scope and shared-toolbar contract. Accepted.
- Plan-pack lane recommended a compact pack instead of recreating the archived 36-doc Library overhaul. Accepted, then expanded only where the final readiness audit required dedicated risk and runbook docs.

## Follow-Up Conditions

Start implementation only when:

- The plan is review-reconciled.
- The implementation owner accepts the phase order.
- The first implementation phase is scoped to surface slots and low-risk class changes.
- Verification commands are chosen from `08-VERIFICATION-AND-VISUAL-QA-MATRIX.md` and `14-IMPLEMENTATION-RUNBOOK-AND-VISUAL-RALPH-CONTRACT.md`.

Stop implementation if:

- A phase needs data/schema/auth changes.
- Shared primitive changes become necessary before Library-local slots are proven.
- Browser proof shows overlap, overflow, illegible glass, or broken focus.
