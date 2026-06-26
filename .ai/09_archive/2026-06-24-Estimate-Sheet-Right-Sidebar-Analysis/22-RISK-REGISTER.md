# 22 — Risk Register

> Closes the audit-prompt gap: "Known risks, mitigations, owners, and decision deadlines."
> Cross-references [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md) and the per-task rollback paths in [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md).

## Schema

Every risk carries: `ID | Source finding | Severity | Likelihood | Mitigation | Owner | Deadline | Status | Residual risk`. Severity follows the P0/P1/P2/P3 rubric in doc 17. Likelihood is `Low | Medium | High`. Status is `Open | Mitigating | Accepted | Closed`. Residual risk is what remains after mitigation.

Owner conventions:
- **Eng** — frontend engineering (sidebar surface owner)
- **Backend** — server-action / RPC owner
- **Philip** — product owner (Philip Lewis)
- **QA** — pre-release verification

Deadlines are relative to Phase 1 implementation start (T0). Phase 1 target completion: T0+2 weeks. Phase 2: T0+4 weeks. Phase 3: T0+6 weeks.

## P1 risks

| ID | Source | Severity | Likelihood | Mitigation | Owner | Deadline | Status | Residual risk |
|---|---|---|---|---|---|---|---|---|
| RR-01 | F-01, F-06 | P1 | High | Wire delete to `executeBulkArchiveLibraryComponents`; remove `onLibraryDataChanged()` for local-only hide paths; toast says "archived" | Eng | T0+1w | Open | Low — RPC exists; only wiring needed |
| RR-02 | F-03, F-05 | P1 | High | Remove `NewComponentForm`; route Edit through `AddComponentModal` edit mode via `updateCostLibraryComponent`; preserves all variant/audit data | Eng | T0+1w | Open | Low — modal already has edit-mode support elsewhere |
| RR-03 | F-03 | P1 | High | Wire Duplicate to open `AddComponentModal` pre-filled with "(copy)" suffix; save calls `createCostLibraryComponent` | Eng | T0+1w | Open | Low |
| RR-04 | F-04 | P1 | Medium | Add monotonic request-id guard in search effect; drop responses where `requestId !== latestRequestId`. Alternative: `AbortController` | Eng | T0+1w | Open | Low — well-understood pattern |
| RR-05 | F-10 | P1 | High | Remove "New Template Group" toolbar affordance; delete `customTemplateGroups` state field; document that categories emerge from template `category` strings | Eng | T0+1w | Open | None |
| RR-06 | F-11 | P1 | High | Replace "Live source" / "Read-through source" chips with "Snapshot copy" + "Captured at [timestamp]"; insert toast states copy semantics | Eng | T0+1w | Open | None |
| RR-07 | Cross-cutting | P1 | Medium | After Phase 1, run integration suite that exercises every persisted mutation end-to-end against local Supabase; verify DB row state, not just UI | QA | T0+2w | Open | Medium — environmental limitation if no auth session |

## P2 risks

| ID | Source | Severity | Likelihood | Mitigation | Owner | Deadline | Status | Residual risk |
|---|---|---|---|---|---|---|---|---|
| RR-08 | F-02 | P2 | Medium | Rename Project tab label to "Project Components"; no internal id change (avoids localStorage pref migration) | Eng | T0+3w | Open | None |
| RR-09 | F-07 | P2 | Low | Document favorites/recents as device-local; deferred multi-device sync tracked in [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) Q8 | Philip | T0+4w | Accepted | Low — pre-first-users; revisit on feedback |
| RR-10 | F-08 | P2 | Low | Document custom ordering as device-local; same defer rationale as RR-09 | Philip | T0+4w | Accepted | Low |
| RR-11 | F-09 | P2 | Medium | Add Delete to sidebar context menu via existing `deleteLibraryFolder`. Defer reparent/move to Library page | Eng | T0+3w | Open | Low |
| RR-12 | F-12 | P2 | Low | Document below-1024px sidebar as out-of-scope for v1; revisit if mobile feedback warrants (Phase 4) | Philip | T0+6w | Accepted | Medium — blocks tablet use |
| RR-13 | F-13 | P2 | Medium | Extract giant reducer into tab-scoped hooks (`useLibraryTabState`, etc.); tracked in `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` | Eng | T0+6w | Open | Medium — large refactor |
| RR-14 | F-14 | P2 | Medium | Replace `setTimeout(0)` focus race with Radix `onCloseAutoFocus` + `event.preventDefault()` pattern from `EstimateSheetTree` | Eng | T0+3w | Open | Low |

## P3 risks

| ID | Source | Severity | Likelihood | Mitigation | Owner | Deadline | Status | Residual risk |
|---|---|---|---|---|---|---|---|---|
| RR-15 | F-15 | P3 | Low | Add `Set<string>` of prefetched project ids; skip already-fetched | Eng | T0+4w | Open | None |

## Cross-cutting risks (not from doc 17)

| ID | Description | Severity | Likelihood | Mitigation | Owner | Deadline | Status | Residual risk |
|---|---|---|---|---|---|---|---|---|
| RR-16 | Phase 1 regression: archive RPC fails silently, item appears deleted but isn't | P1 | Medium | Toasts must surface RPC failure; integration test covers "archive fails → item visible after refresh"; alert on archive-RPC error rate > 1% | Eng + QA | T0+2w | Open | Low |
| RR-17 | Phase 1 transition confusion: users accustomed to local-only behavior report "lost edits" | P2 | Medium | Release-notes copy explains the fix; in-app toast on first interaction explains persistence change | Philip | T0+2w | Open | Low |
| RR-18 | RLS not verified on all 8 sidebar tables (doc 15 ⏳) | P1 | Low | Run `rg "ENABLE ROW LEVEL SECURITY" supabase/migrations/` against each table; remediate any missing; document in [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) | Backend | T0+2w | Open | Medium until verified |
| RR-19 | Phase 1 ships without feature flag → cannot selectively disable if regression | P2 | Medium | Wrap each Phase 1 task behind `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1` flag (default on); see [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md) | Eng | T0+1w | Open | Low |
| RR-20 | Phase 1 rollback loses user-archive actions performed before rollback | P2 | Low | Rollback procedure preserves archive state (no un-archive); only the wiring reverts | Eng | T0+2w | Accepted | Low |
| RR-21 | Telemetry blind spot: cannot measure if Phase 1 fix actually improved persistence-honesty perception | P2 | Medium | Add `persistence_honesty_*` events: `archive_invoked`, `archive_succeeded`, `archive_failed`, `edit_via_modal_opened`, `duplicate_via_modal_opened`; see [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) | Eng | T0+2w | Open | Low |
| RR-22 | Quota race: `LIBRARY_COMPONENT_CAP` check + insert not atomic | P3 | Low | Accepted for pre-first-users. Revisit with DB-level enforcement if abuse detected | Backend | Deferred | Accepted | Low |

## Residual-risk-acceptance register

Acceptances above (RR-09, RR-10, RR-12, RR-20, RR-22) are explicitly owned by Philip or Eng and revisited at the milestone gates listed. None block Phase 1 implementation.

## Open dependencies

- RR-07 (integration suite) requires authenticated local Supabase session — environmental constraint flagged in [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md).
- RR-18 (RLS verification) requires migration-file access — already in repo (`supabase/migrations/`).
- RR-13 (giant reducer extraction) tracks against a separate plan pack; not blocking Phase 1.
