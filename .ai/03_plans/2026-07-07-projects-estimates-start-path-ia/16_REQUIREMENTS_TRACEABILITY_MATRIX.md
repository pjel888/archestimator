# 16 — Requirements Traceability Matrix

No requirement is untraced. Every implementation task maps back to ≥1 requirement.

| Requirement ID | Source | User outcome | Phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-01 | brief + repo | first user sees "Create your first project" | P2 | P2-T1 | `projects-page-client.tsx` (~`:3397`); new `projects-empty-workspace-state.tsx?` | AC-01a–d | `projects-page-empty-workspace.test.tsx` | merge gate | blocked OPEN-DEC-01 (default provided) |
| FR-02 | brief + repo | empty project dashboard nudges to first estimate | P2 | P2-T2 | `ProjectDashboardClient.tsx` (`:179-234`) | AC-02a–c | `project-dashboard-client.test.tsx` | merge gate | ready |
| FR-03 | brief | zero-estimate list shows prominent empty state | P2 | P2-T3 | `ProjectEstimatesClient.tsx`; `ProjectEstimatesTable.tsx` (`:1123`) | AC-03a–d | `project-estimates-empty-state.test.tsx` | merge gate | ready |
| FR-04 | brief | empty estimate offers template chooser | P3 | P3-T1 | `EstimateSheetContent.tsx` (`:2746-2777`) | AC-04a–d | `estimate-empty-tab-state.test.tsx` | merge gate | blocked OPEN-DEC-02 |
| FR-05 | repo | card + favorite land on same route | P1 | P1-T1 | `projects-page-client.tsx` (`:2854`) | AC-05a–b | `main-sidebar-favorites.test.tsx`; `projects-page-card-layout.test.tsx` | merge gate | blocked OPEN-DEC-03 (default provided) |
| FR-06 | brief | activation events evidence a successful start | P4 | P4-T1 | `NewProjectForm.tsx`; `ProjectEstimatesClient.tsx`; `use-estimate-row-handlers.ts` | AC-06a–c | `start-path-activation-events.test.ts` | merge gate | ready |
| FR-07 | derived | auto-seeded first estimate preserved | P2 | P2-T4 | `NewProjectForm.tsx` (`:335`) verification | AC-07a–b | `new-project-form-validation.test.tsx` | merge gate | ready |
| FR-08 | brief | metadata needs documented | P5 | P5-T2 | doc | (doc) | n/a | n/a | ready |
| UX-01 | PROMPT + DESIGN | dense non-decorative states | P2/P3 | P2-T1/T3, P3-T1 | `empty-state.tsx` reuse | pass `lint:design-system` | `lint:design-system` | merge gate | ready |
| UX-02 | PROMPT | returning users not slowed | P2 | P2-T1/T3 | empty-state conditions | empty states only on empty | DOM tests | merge gate | ready |
| UX-03 | DESIGN | one primary CTA per surface | P2/P3 | P2-T1/T3, P3-T1 | CTA variants | one brand CTA | DOM tests | merge gate | ready |
| A11Y-01 | derived | empty states keyboard-operable + announced | P2/P3 | P2-T1/T2/T3, P3-T1 | buttons/links + labels | keyboard + a11y tree | DOM tests + impl Playwright | impl QA | ready (browser proof deferred) |
| A11Y-02 | derived | no new keyboard traps | P2 | P2-T1/T3 | modal focus preserved | tab in/out | impl Playwright | impl QA | ready (deferred) |
| A11Y-03 | derived | non-color cues + reduced motion | P2/P3 | P2-T1/T3, P3-T1 | text/icon cues | static review | review | impl QA | ready |
| ARCH-01 | derived | no new server round-trips | P2 | P2-T1/T2/T3 | derive from props | RPC test green | `perf/projects-page-rpc-contract.test.ts` | merge gate | ready |
| ARCH-02 | derived | reuse existing action contracts | all | all | no new actions | no new Server Actions | regression tests | merge gate | ready |
| ARCH-03 | derived | lazy-load new bundle | P2 | P2-T1/T3 | dynamic import if needed | render baseline green | `perf/projects-page-render-baseline.test.tsx` | merge gate | ready |
| DATA-01 | derived | no schema change | all | all | none | no migration | n/a | n/a | ready |
| DATA-02 | repo | workspace scoping preserved | all | all | existing authz | denial tests green | existing | merge gate | ready |
| SEC-01 | derived | no new trust/public surfaces | all | all | none | review | n/a | n/a | ready |
| SEC-02 | derived | analytics redact PII | P4 | P4-T1 | event payloads | no name fields | `start-path-activation-events.test.ts` | merge gate | ready |
| PERF-01 | repo | render baseline preserved | P2 | P2-T1 | `projects-page-client.tsx` | no render increase | `perf/projects-page-render-baseline.test.tsx` | merge gate | ready |
| PERF-02 | repo | RPC contract preserved | P2 | P2-T1 | `projects-page-client.tsx` | no new round-trip | `perf/projects-page-rpc-contract.test.ts` | merge gate | ready |
| REL-01 | derived | partial-data graceful | P2 | P2-T2 | dashboard | nudge renders | `project-dashboard-client.test.tsx` | merge gate | ready |
| TEST-01 | derived | DOM tests for all new states | all | all | test files | matrix green | matrix | merge gate | ready |
| DOC-01 | derived | current-state FAST PATH entry | P5 | P5-T2 | `.ai/10_state/current-state.md` | entry added | review | n/a | ready |

## Performance-sensitive requirements (extra mapping)

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-01 | current render count | no increase | `perf/projects-page-render-baseline.test.tsx` | any increase | test red |
| PERF-02 | current RPC shape | no new round-trip | `perf/projects-page-rpc-contract.test.ts` | new round-trip | test red |
| ARCH-03 | current bundle | no material growth | `bun run build` | >2KB gzip unjustified | lazy-load or revert |

No requirement untraced. No task without a requirement.
