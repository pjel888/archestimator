# 12 — Test And Validation Strategy

Choose the lightest proof that proves the claim. DOM tests for component interaction; perf baselines for regression; design-system lint for density; browser proof deferred to implementation for browser-only claims.

## Test execution matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-01 | `tests/vitest/projects-page-empty-workspace.test.tsx` | DOM (RTL) | new | render `ProjectsPageClient` with `projects=[]`, no filter | `bun run test:dom -- projects-page-empty-workspace` | `data-project-empty-workspace-state` + "Create your first project" renders; not under filter; CTA opens modal | none | impl |
| FR-02 | `tests/vitest/project-dashboard-client.test.tsx` | DOM | existing (extend) | render with `estimateCount=0`, `canEditProject=true/false` | `bun run test:dom -- project-dashboard-client` | nudge link present when canEdit; absent when !canEdit | none | impl |
| FR-03 | `tests/vitest/project-estimates-empty-state.test.tsx` | DOM | new | render `ProjectEstimatesClient` with `estimates=[]`, canCreate true/false | `bun run test:dom -- project-estimates-empty-state` | `data-estimates-empty-state` + "Create Estimate" when canCreate; no CTA when !canCreate; hidden when estimates>0 | none | impl |
| FR-04 | `tests/vitest/estimate-empty-tab-state.test.tsx` | DOM | existing (extend) | render empty-tab state with templates | `bun run test:dom -- estimate-empty-tab-state` | chooser present for editors; absent for read-only; "Add Area" unchanged | none | impl |
| FR-05 | `tests/vitest/main-sidebar-favorites.test.tsx`; `tests/vitest/projects-page-card-layout.test.tsx` | DOM | existing (extend) | favorite + card render | `bun run test:dom -- main-sidebar-favorites projects-page-card-layout` | both hrefs = Dashboard route | none | impl |
| FR-06/SEC-02 | `tests/vitest/start-path-activation-events.test.ts` | unit | new | invoke create/handler stubs; capture telemetry | `bun run test:dom -- start-path-activation-events` | 4 events emit; no name/client fields | none | impl |
| FR-07 | `tests/vitest/new-project-form-validation.test.tsx`; `tests/vitest/projects-page-create-optimistic.test.tsx` | DOM | existing (extend) | create flow stubs | `bun run test:dom -- new-project-form-validation projects-page-create-optimistic` | one estimate after success; empty state reachable if seed fails | none | impl |
| PERF-01 | `tests/vitest/perf/projects-page-render-baseline.test.tsx` | perf | existing | existing harness | `bun run test:dom -- projects-page-render-baseline` | no render-count increase | none | impl |
| PERF-02 | `tests/vitest/perf/projects-page-rpc-contract.test.ts` | perf | existing | existing harness | `bun run test:dom -- projects-page-rpc-contract` | no new round-trip | none | impl |
| ARCH-02 (regression) | `tests/vitest/estimate-mutations.test.ts`; `tests/vitest/estimate-sheet-create-empty-tree.test` | DOM/unit | existing | existing | `bun run test:dom -- estimate-mutations estimate-sheet-create-empty-tree` | create/template/row insert unchanged | none | impl |

## Validation commands (repo-native, verified from package.json)

- `bun run type-check` (`tsc --noEmit`)
- `bun run lint` (`eslint`)
- `bun run lint:design-system` (`node scripts/enforce-app-design-system.mjs`)
- `bun run test:dom` (`vitest run --maxWorkers=1`) — focused via `-- <pattern>`
- `bun run test` (`bun test tests/unit`) — for any unit redaction tests if not under vitest
- `bun run build` — for bundle-size check (P2 implementation)
- Targeted Playwright (`bun run test:e2e`) — **only** for browser-only claims (focus order, responsive layout, empty-state→modal transition) during implementation; not a planning gate.

## Adversarial scenario matrix (UltraQA-style, for implementation)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|
| AQ-1 | read-only collaborator | opens empty project dashboard | render `canEditProject=false`, `estimateCount=0` | `test:dom -- project-dashboard-client` | no create CTA; informational text only | planned | impl test | n/a |
| AQ-2 | read-only collaborator | opens empty estimates list | `canCreateEstimates=false`, `estimates=[]` | `test:dom -- project-estimates-empty-state` | empty state without CTA | planned | impl test | n/a |
| AQ-3 | anonymous | hits `/workshop/projects` | no session (proxy test) | existing auth-onboarding-guard test | redirect to /login | preserved | existing | n/a |
| AQ-4 | cross-tenant | createEstimateSheetDraft with foreign projectId | action test | `estimate-mutations` | assertCanEditProject denies | preserved | existing | n/a |
| AQ-5 | double-submit | click "Create your first project" twice fast | DOM test | `projects-page-empty-workspace` | optimistic dedupe by clientId | planned | impl test | n/a |
| AQ-6 | rollback | createProjectRecord fails after optimistic | DOM test | `projects-page-create-optimistic` | empty-workspace state reappears | planned | impl test (extend) | n/a |
| AQ-7 | analytics PII | event payload inspection | unit test | `start-path-activation-events` | no name/client fields | planned | impl test | n/a |
| AQ-8 | partial data | dashboard with `estimateCount` but empty recent sheets | DOM test | `project-dashboard-client` | nudge renders without throw | planned | impl test | n/a |
| AQ-9 | empty templates | empty-tab chooser with zero templates | DOM test | `estimate-empty-tab-state` | "Browse templates" link only; no throw | planned | impl test | n/a |
| AQ-10 | concurrent agent | another agent edits shared file during impl | git status recheck | manual + `git diff --check` | no overwrite of others' work | process | run-log | n/a |

## Coverage rationale

- DOM tests prove component state transitions (empty → optimistic → reconciled) without a browser.
- Perf baselines prove no new server work / render regression.
- Redaction unit test proves SEC-02.
- Browser-only claims (focus/responsive) explicitly deferred to implementation with named scope.

No "manual QA" acceptance criteria without steps/actor/expected/pass-fail (none rely on manual QA alone).
