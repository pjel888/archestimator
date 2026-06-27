# Blast Radius And Dependencies

## Blast Radius Matrix

| Change Area | Main Files | Risk | Dependencies | Guardrails |
|---|---|---:|---|---|
| Non-blocking mutation coordinator | `src/hooks/use-estimate-row-mutations.ts`, `src/components/workshop/EstimateSheetContent.tsx`, possible new store/hook | High | TanStack Query, React 19, local editable row state, row revision contracts | Default-off flag, RED tests first, per-row/node pending state |
| App Router route boundary/cache contract | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `workspace-repository.ts`, `actions.ts`, query hooks | High | Next 16 Server/Client Components, request-time APIs, route process cache, TanStack Query | Keep auth/context server-owned, pass serializable DTOs, use route-specific cache matrix before changing invalidation |
| Remove routine save toasts | `EstimateSheetContent.tsx:953-973`, `EstimateSheetTree.tsx:601-630`, tests expecting toasts | Medium | Toast system, accessibility live regions, UX status components | Keep failure toasts/alerts; update tests to assert no routine toasts |
| Row move bug fix | `use-estimate-row-handlers.ts`, `estimate-row-tree-move.ts`, `EstimateSheetTree.tsx`, `row-table.tsx`, `use-estimate-row-mutations.ts` | High | DnD APIs, custom window events, query cache, RPC result parser, virtualization | Regression e2e before refactor; source/target node scoped pending state |
| Split tree structure and row state | `use-estimate-query.ts`, `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, row branch/table components | High | Query keys, memo equality, route context, tree hydration | Consider only after coordinator proves insufficient; patch source/target only |
| Cache invalidation/finalization | `src/lib/estimates/actions.ts`, `workspace-repository.ts`, `use-estimate-row-mutations.ts` | High | Next revalidation, route-context process cache, TanStack invalidation | Shared helper and cache-freshness tests after every mutation |
| DB/RPC auth/idempotency | Supabase migrations, generated types, server action adapters | High | Linked Supabase project, RLS, RPC grants, app parsers | Duplicate audit, forward-only migrations, direct-RPC tests |
| Private image/source snapshot hardening | `src/app/api/projects/images/route.ts`, `src/app/api/estimate-row-images/route.ts`, `src/lib/estimates/actions.ts`, snapshot utils | High | Upload storage privacy work, publication redaction, source snapshot schemas | Security tests before release; no raw signed URLs |
| Public/share/proposal/export DTO hardening | share/comment/activity routes, publication snapshots, proposal export model | High | Public token/session scope, no-store/cache headers, export redaction, recipient revocation | DTO allowlists, token/revocation tests, cache headers, abuse limits |
| Benchmark additions | `tests/vitest/perf/*`, `e2e/*performance*`, scripts/route transition tooling | Medium | Auth fixtures, browser env, current dirty perf baselines | Budgeted tests with scoped fixtures; avoid broad flaky all-DOM run |
| Docs/spec drift cleanup | `.ai/06_specs/*`, `.ai/00_corpus/feature-flag-and-env-inventory.md` | Low/Medium | Current specs, design docs, current-state history | Source-linked updates only; no code changes in doc-only pass |

## External Dependencies

| Dependency | Relevance | Risk |
|---|---|---|
| Next.js 16 / React 19 | App routing, client components, hooks behavior | Must follow repo docs and current patterns; no assumed older Next APIs. |
| TanStack Query | Estimate tree/detail cache, optimistic patching | Wrong invalidation can resurrect stale rows or over-fetch route state. |
| Supabase/Postgres | RPCs, RLS, history events, route context | Security/data changes need migrations, type generation, provider proof. |
| Zustand | Existing drag store and possible mutation coordinator | Use only if it matches existing store patterns; avoid unnecessary new dependency. |
| Playwright | Browser-only proof for DnD, route, offline, perf | Opt-in and scoped; not a default gate for static/source claims. |
| Vitest/jsdom | DOM, unit, perf budget tests | Some all-DOM suites can hang; use targeted matrices. |
| `node_modules/next/dist/docs` | Local official docs for this installed Next version | Use before App Router/Server Action/cache claims; avoid relying on stale model memory. |
| `DESIGN.md` / `src/components/ui` | UX/design authority and reusable primitives | Prevent dense sheet UI drift and unnecessary bespoke controls. |

## Dirty Worktree Considerations

The current worktree has many pre-existing modified files outside this plan folder. Future implementation must:

- review the dirty diff before editing any overlapping file,
- avoid reverting unrelated changes,
- scope commits or patches carefully,
- rerun target tests against the actual dirty-branch baseline,
- record whether failures are from the estimate-sheet slice or unrelated dirty work.

## Documentation Drift To Update

| Document | Required Update |
|---|---|
| `.ai/06_specs/current-project-estimates-component-library-spec.md` | Replace sample-data route language, area-only row insertion, and stale "tree DnD removed" statements. |
| `.ai/06_specs/mvp-ux-flow.md` | Align tree/row move descriptions with current single-node row model and keyboard/touch alternatives. |
| `.ai/06_specs/live-project-estimate-bootstrap.md` | Replace old tree loader language with `resolveEstimateTabRouteContext`. |
| `.ai/00_corpus/feature-flag-and-env-inventory.md` | Add mutation coordinator/queue flag if used. |
| `.ai/10_state/current-state.md` | Record future implementation evidence after code changes, not during this planning-only pass unless project reality changes. |
