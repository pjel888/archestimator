# Launch-Readiness Audit — Data Fetching, Caching & RSC Architecture

**Date:** 2026-06-19
**Part of:** the 2026-06-19 Launch-Readiness Audit (sibling packs under `.ai/03_plans/2026-06-19-Launch-Readiness-*`).
**Status:** Audit only. No source/config edits were made by this pack. Read-only on source.
**Blast radius of any remediation:** LOW–MEDIUM (client cache hygiene, optional RPC flag). No DB schema change required for the findings here.

## Exact owner job

Philip is taking Archestimator into closed-beta MVP. This pack answers one question for the
data-fetching/caching/RSC lane: **is anything in the server/client boundary, TanStack Query
config, repository fetch shape, or mutation cache invalidation going to break, leak, or feel
slow for the first closed-beta users — and is any of it a hard launch blocker?**

## Scope audited (read deeply)

- `src/app/providers.tsx` — the single app QueryClient + defaults.
- `src/lib/repositories/**` — `workspace-repository.ts` (homebase, projects list, project-data,
  collaboration), `project-charts-repository.ts`, `estimate-repository.ts`, favorites repos.
- `src/app/workshop/page.tsx`, `src/app/workshop/projects/page.tsx`, and the `workshop/**`
  server-vs-client boundary (every `page.tsx` + `"use client"` marker in the app dir).
- `src/components/workshop/dashboard/**` (RSC tree), `LiveProjectCard.tsx`, `projects-page-client.tsx`.
- TanStack hooks: `use-toggle-project-favorite`, `use-sidebar-favorites-query`,
  `use-toggle-estimate-favorite`, `use-estimate-query`, `use-estimate-row-mutations`,
  `use-project-collaboration-query`, notifications query/mutations.
- Query-key modules: `src/lib/favorites/query-keys.ts`, `src/lib/component-library/query-keys.ts`,
  estimate + notification key factories.
- Auth-change cache eviction: `src/components/realtime-auth-bridge.tsx`, `src/lib/auth/actions.ts`.

## Routes / screens affected (if remediation proceeds)

- `/workshop` (dashboard), `/workshop/projects`, `/workshop/library*`, estimate sheet routes —
  only insofar as cache-hygiene-on-signout touches the shared QueryClient. No route behavior change.

## Non-goals

- DB schema / indexing / RLS / RPC SQL correctness — owned by domains 2 & 3.
- Server-action authz / payload validation — domain 4.
- Render/list virtualization perf, bundle size — domains 5 & 6.
- The `workspace_homebase_summary` RPC contract itself — owned by the archived
  `2026-06-19-Workshop-Dashboard-Query-Batching` pack; not re-litigated here.

## Files expected to change during remediation (small)

- `src/components/realtime-auth-bridge.tsx` (broaden signed-out cache eviction), and/or
- `src/app/providers.tsx` (no change expected unless a defensive `queryClient.clear()` on
  signout is wired). Most findings are LOW and may be accepted as-is for MVP.

## Validation gate

- `bun run type-check` green on touched files.
- Targeted Vitest for the affected hook(s) (favorites/sidebar reactivity suites already exist).
- Manual: sign out → sign in as a different closed-beta user, confirm no residual library/
  template/estimate data is visibly served from the warm cache.
- Note: `bun run validate` is known-red on main for unrelated reasons (charts set-state-in-effect;
  ProposalExportPreviewDialog design-lint) — do not block on the full gate; scope to touched files.

## Deletion criteria

Delete this pack if Philip judges the data-fetching/caching/RSC lane launch-ready as-is (a
defensible position — see findings, all LOW/INFO except one MEDIUM defense-in-depth note), or
once the single recommended cache-hygiene change lands and is verified.

## Loop-surface selection

Lightweight in-session loop (no dated LOOP_LEDGER required): findings are low-blast-radius client
cache hygiene, not DB/auth/security data-integrity changes. If the signed-out eviction broadening
is implemented, it is a single-file, reversible edit with proportional verification.

## Durable-state path

`.ai/10_state/current-state.md` (RSC/dashboard entries) and memory `workshop-dashboard-rsc` +
`sidebar-favorites-reactivity` already record the durable architecture. This pack adds only the
signed-out-cache-eviction note if that change is adopted.
