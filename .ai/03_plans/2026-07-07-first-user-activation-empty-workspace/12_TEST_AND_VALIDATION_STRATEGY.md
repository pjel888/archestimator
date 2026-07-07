# 12 — Test and Validation Strategy

## 12.1 Strategy

Lightest proof that proves the claim (per directive + repo proportional-verification policy):

- **Pure logic** (milestone COALESCE upsert, event schema, `firstRun` derivation): unit tests.
- **React component interaction** (welcome panel, zero states, dismiss, focus): DOM tests with React Testing Library (`tests/vitest/*.test.tsx`).
- **Server Actions / repositories** (emit + idempotent milestone inline): direct action/repository tests + D1 miniflare-style integration where the existing suite uses it.
- **Authz/security**: role-matrix + denial tests (cross-workspace, non-member).
- **End-to-end first-user path**: one env-gated Playwright spec (browser-only claim: modal/focus/route transition + panel-hide announcement).
- **Performance**: query-count test + local perf-trace capture (no browser proof needed for the query-budget claim).

## 12.2 Test execution matrix

| Requirement | Test file path | Type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| DATA-001 | `tests/vitest/workspace-activation-milestones-migration.test.ts` | Unit (schema) | New | Fresh D1 | `bunx vitest run tests/vitest/workspace-activation-milestones-migration.test.ts --maxWorkers=1` | Columns + FK + idempotent re-run | none | Data lane |
| DATA-002 | `tests/vitest/activation-milestones-repository.test.ts` | Unit + concurrency | New | Empty workspace | `bunx vitest run tests/vitest/activation-milestones-repository.test.ts --maxWorkers=1` | Idempotent stamp; parallel calls → single row; reconciliation backfill | none | Data lane |
| SEC-T3/T8 | `tests/vitest/activation-events.test.ts` | Unit | New | n/a | `bunx vitest run tests/vitest/activation-events.test.ts --maxWorkers=1` | Schema accepts valid/rejects unknown; redaction; non-throwing | none | Data lane |
| FR-004/005 | extend existing `tests/vitest/*project*actions*` or new `tests/vitest/project-create-activation.test.ts` | Integration | New | Workspace + member | `bunx vitest run tests/vitest/project-create-activation.test.ts --maxWorkers=1` | `createProjectRecord` emits + stamps idempotently | none | Data lane |
| FR-007 | `tests/vitest/estimate-sheet-activation.test.ts` | Integration | New | Project | `bunx vitest run …` | `createEstimateSheetDraft` emits + stamps | none | Data lane |
| FR-009 | extend estimate-node/tree tests | Integration | New | Estimate | `bunx vitest run …` | area/template/line-item milestones fire once | none | Data lane |
| FR-012 | extend `tests/vitest/project-publication-*.test.ts` | Integration | New | Project + estimate | `bunx vitest run tests/vitest/project-publication-public-repository.test.ts --maxWorkers=1` | `createProjectPublication` stamps terminal milestone | none | Data lane |
| SEC-T1 | `tests/vitest/activation-milestones-cross-workspace.test.ts` | Security denial | New | Two workspaces | `bunx vitest run …` | Cross-workspace read returns nothing | none | Security lane |
| SEC-T6 | `tests/vitest/welcome-dismiss-authz.test.ts` | Security denial | New | Member + non-member + anonymous | `bunx vitest run tests/vitest/welcome-dismiss-authz.test.ts --maxWorkers=1` | Dismiss invoke denied for non-member/anonymous; allowed for workspace member | none | Security lane |
| FR-001 | extend `tests/vitest/auth-onboarding-guard.test.ts` | Unit | Existing (extend) | n/a | `bunx vitest run tests/vitest/auth-onboarding-guard.test.ts --maxWorkers=1` | Login still lands on `/workshop`; no new gate | none | Auth lane |
| FR-002/UX-001/A11Y-001 | `tests/vitest/workspace-welcome-panel.test.tsx` | DOM | New | Empty homebase | `bunx vitest run tests/vitest/workspace-welcome-panel.test.tsx` | Panel copy + CTAs + a11y semantics | none | Dashboard lane |
| FR-002 | `tests/vitest/workshop-dashboard-first-run.test.tsx` | DOM | New | Empty/non-empty homebase | `bunx vitest run …` | Panel shows empty, hides non-empty; lists intact | none | Dashboard lane |
| ARCH-002 | `tests/vitest/workshop-homebase-app-path-activation.test.ts` (new); `workshop-homebase-summary-rpc-contract.test.ts` left unchanged | Contract + integration | New (app-path) + existing (RPC-contract, unchanged) | Empty + non-empty + dismissed + missing-row fixtures | `bunx vitest run tests/vitest/workshop-homebase-app-path-activation.test.ts tests/vitest/workshop-homebase-summary-rpc-contract.test.ts --maxWorkers=1` | App-path additive fields + null-safe defaults; RPC-contract test unchanged green | none | Dashboard lane |
| PERF-001 | `tests/vitest/workshop-dashboard-query-count-script.test.ts` + `workshop-dashboard-query-batching-*.test.ts` | Perf | Existing (unchanged) | n/a | `bunx vitest run tests/vitest/workshop-dashboard-query-count-script.test.ts --maxWorkers=1` | Query count unchanged | none | Perf lane |
| FR-003 | `tests/vitest/projects-page-empty-state.test.tsx` | DOM | New | Empty projects | `bunx vitest run …` | Zero-projects state + search variant | none | Projects lane |
| FR-008 | `tests/vitest/estimate-empty-tab-state.test.tsx` | DOM | Existing (must stay green) | Empty tab | `bunx vitest run tests/vitest/estimate-empty-tab-state.test.tsx --maxWorkers=1` | Affordance intact | none | Estimate lane |
| FR-008 | `tests/vitest/estimate-sheet-create-empty-tree.test.ts` | Unit | Existing (must stay green) | n/a | `bunx vitest run tests/vitest/estimate-sheet-create-empty-tree.test.ts --maxWorkers=1` | Empty draft unchanged | none | Estimate lane |
| FR-010 | `tests/vitest/library-empty-states.test.tsx` | DOM | New | Empty library | `bunx vitest run …` | Components/templates/overview zero states | none | Library lane |
| FR-011 | `tests/vitest/publisher-empty-state.test.tsx` | DOM | New | No publications | `bunx vitest run …` | Ladder-aware no-publications variant | none | Publisher lane |
| FR-001..012 | `e2e/first-user-activation.spec.ts` | E2E (Playwright) | New | Dev auth bypass | `ARCHESTIMATOR_E2E_FIRST_USER=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 bunx playwright test e2e/first-user-activation.spec.ts` | Full ladder green path | n/a (env-gated) | QA lane |

## 12.3 Repository-native commands (verification before implementation)

- `bun run type-check`
- `bun run lint` (and `bun run lint:design-system` for UI changes)
- `bun run test` / `bunx vitest run <file> --maxWorkers=1`
- `bun run build` (only if risk justifies — shared/layout/route work)
- Playwright only for the env-gated first-user e2e

## 12.4 Adversarial scenarios (see `19_…` for the full matrix)

Cross-workspace read, non-member write, concurrent first-project submit, event-log injection, direct Server-Action POST (must still emit + authz-deny non-member), dismissed-then-empty state, payload missing new fields (must default `firstRun=false`), milestone upsert failure mid-action (action still succeeds).

## 12.5 Manual QA steps (only where automation cannot reach)

For the welcome-panel modal/focus/announcement browser-only claim, if Playwright cannot fully exercise it:

1. Actor: invited beta user (allowlisted email), fresh workspace.
2. Setup: `CLOSED_BETA_ACCESS_ENABLED=true`; clear workspace milestones.
3. Steps: magic-link login → land on `/workshop` → observe panel → Tab to "Create your first project" → Enter → fill name → submit → observe redirect to estimate editor → back to `/workshop` → observe panel hidden + SR announcement.
4. Pass: panel correct sequence; focus restored; announcement fires.

## 12.6 Known gaps / skipped validation

- Hosted/production RUM/CWV: not available (sibling stub). Local perf-trace + query-count tests are the substitute.
- Provider-backed proof: not needed for this additive change; migration is local D1.
- GitHub hosted security controls: not claimed by this pack.
