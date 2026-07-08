# 10 — Blast Radius And Dependencies

## Impact classification key
- **Required change** — must be edited for this plan.
- **Probable change** — likely edited depending on OPEN-DECs.
- **Possible change** — touched only if implementation chooses a particular approach.
- **Verification only** — not edited, but must be re-tested.
- **Explicitly unaffected** — confirmed not impacted.

## Direct impact (workshop components + tests)

| Area | Path | Symbol/region | Impact | Notes |
|---|---|---|---|---|
| Projects list | `src/components/workshop/projects-page-client.tsx` | render branch near `:3397` (zero-owned case); favorite href `:2854` | **Required** (FR-01, FR-05) | giant-component; keep edits surgical |
| Project dashboard | `src/components/workshop/ProjectDashboardClient.tsx` | `ProjectEstimateSummaryPanel` `:179-234` | **Required** (FR-02) | |
| Estimates list | `src/components/workshop/ProjectEstimatesClient.tsx` | render branch for zero estimates | **Required** (FR-03) | |
| Estimates table | `src/components/workshop/ProjectEstimatesTable.tsx` | `showEmptyMessage` hardcode `:1123`; `ProjectEstimateBlankNameCreateCell` `:343-407` | **Required** (FR-03) | giant-component; keep surgical |
| Estimate editor | `src/components/workshop/EstimateSheetContent.tsx` | empty-tab state `:2746-2777` | **Probable** (FR-04, OPEN-DEC-02) | |
| Template insertion | `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts` | `insertTemplateIntoParent` | **Possible** (FR-04 only) | reuse, not change |
| New project form | `src/components/workshop/NewProjectForm.tsx` | telemetry hook point | **Required** (FR-06) for `project_created` event; auto-seed (`:335`) unchanged (FR-07) | |
| Row handlers | `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` | telemetry `:740` | **Required** (FR-06) for `estimate_first_row_added` | |
| Empty-state primitive | `src/components/ui/empty-state.tsx` | `EmptyState` | **Possible** (reuse; extend only if a shared variant needed) | |

## Tests (direct)

| Test | Impact |
|---|---|
| `tests/vitest/projects-page-create-optimistic.test.tsx` | **Verification only** (rollback re-renders empty state) |
| `tests/vitest/projects-page-card-layout.test.tsx` | **Verification only** (card href unchanged) |
| `tests/vitest/main-sidebar-favorites.test.tsx` | **Required** (FR-05 href fix) |
| `tests/vitest/project-dashboard-client.test.tsx` | **Required** (FR-02 nudge) |
| `tests/vitest/new-project-form-validation.test.tsx` | **Verification only** (FR-07 auto-seed preserved) |
| `tests/vitest/estimate-empty-tab-state.test.tsx` | **Required** (FR-04 chooser) |
| `tests/vitest/estimate-sheet-create-empty-tree.test` | **Verification only** |
| `tests/vitest/estimate-mutations.test.ts` | **Verification only** (template/row insert unchanged) |
| `tests/vitest/perf/projects-page-render-baseline.test.tsx` | **Verification only** (PERF-01) |
| `tests/vitest/perf/projects-page-rpc-contract.test.ts` | **Verification only** (PERF-02) |
| **New** `tests/vitest/projects-page-empty-workspace.test.tsx` | **Required** (FR-01) |
| **New** `tests/vitest/project-estimates-empty-state.test.tsx` | **Required** (FR-03) |
| **New** `tests/vitest/start-path-activation-events.test.ts` | **Required** (FR-06 redaction + emission) |

## Transitive impact

| Area | Impact | Notes |
|---|---|---|
| Routes (`app/workshop/**`) | **Explicitly unaffected** | no route additions/changes |
| Sidebar (`MainSidebar.tsx`) | **Possible** (FR-05: confirm favorite href source aligns) | the mismatch is in `projects-page-client.tsx:2854`; sidebar reads server-provided favorites |
| Server actions (`lib/projects/actions.ts`, `lib/estimates/actions.ts`) | **Explicitly unaffected** | no action changes |
| Repositories (`workspace-repository.ts`) | **Explicitly unaffected** | no query changes |
| D1 schema / migrations | **Explicitly unaffected** (DATA-01) | |
| Auth / proxy / layout | **Explicitly unaffected** | |
| Durable Objects / Queues / R2 / Email | **Explicitly unaffected** | |
| `DESIGN.md` | **Explicitly unaffected** (alpha guide; not law) | |
| `.ai/10_state/current-state.md` | **Possible** (DOC-01: FAST PATH entry on implementation) | doc-only, implementation-time |
| Sibling plan `first-user-activation-empty-workspace` | **Coordination only** | reconcile before editing shared files |
| Sibling plan `Estimate-Sheet-Tree` | **Coordination only** | do not touch tree reorder mechanics |

## Backward compatibility

- Fully backward compatible. No schema, API, or contract change. Existing optimistic/reconcile flows preserved.
- Read-only collaborator behavior preserved (CTAs hidden).
- Returning-user journey unchanged (UX-02).

## Affected documentation

- This plan pack.
- `.ai/10_state/current-state.md` (DOC-01, on implementation).
- No user-facing docs change required (closed beta; copy lives in components).

## Dependencies & sequencing

- FR-05 (href fix) is independent — can land first.
- FR-01 (zero-project empty state) independent — can land in parallel with FR-02/03.
- FR-02 (dashboard nudge) independent of FR-03 (estimates empty state) but they form one journey; recommend landing together.
- FR-04 (template chooser) depends on `OPEN-DEC-02`; defer until resolved.
- FR-06 (analytics) can land in parallel but must not ship PII — redaction test gates it.
- FR-07 (auto-seed) is verification-only (no code change unless a regression is found).

## Concurrent-agent safety (implementation)

- Shared files (`projects-page-client.tsx`, `ProjectEstimatesTable.tsx`, `EstimateSheetContent.tsx`) are also touched by sibling plans / the react-doctor cleanup plan. Implementation must: declare file ownership in a coordination ledger, re-read files immediately before edits, keep diffs surgical, run `git diff --check`, and not stage/commit others' changes.
