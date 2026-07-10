# 02 — Feature Brief and Scope

## FEATURE BRIEF (user request, verbatim intent)

> We have the main page inside the auth at `/workshop` and sub-pages like `/workshop/proposals`. I've noticed the skeleton loading of `/workshop` still shows when I load `/workshop/proposals`, and I'm thinking — is this really the most efficient way to route things? I get that it has to show the workshop skeleton because it's technically a subpage, but I feel like there should be a better and more performant way to do this. Do we even have to have `/workshop/proposals`, or can we just have `/proposals`, and will it be faster and more performant?

## Interpreted scope

Two questions in one:
1. **Diagnostic:** Why does the `/workshop` skeleton appear when loading `/workshop/proposals`, and is it a real performance problem?
2. **Architectural:** Is the nested `/workshop/proposals` URL the cause, and would flattening to `/proposals` be faster/better?

This plan answers both with evidence and prescribes the real fixes.

## In scope
- Routing-shape analysis: nested vs flat vs route-groups, with doc-cited tradeoffs.
- Layout/shell ownership analysis: where the persistent chrome is mounted and why it remounts.
- Loading/skeleton strategy: `loading.tsx` placement, Suspense boundaries, page-load vs client-nav behavior.
- Auth-gate layout's uncached-data blocking behavior.
- Prefetch / client-cache (`staleTimes`) configuration.
- A phased, dependency-aware implementation plan with exact paths/symbols and a performance evaluator.

## Out of scope / non-goals
- Changing the auth/terms gate *logic* (must be behavior-preserving).
- Marketing, share, invite, login, signup routes.
- Any Cloudflare D1/R2/Durable Object/Queue/Email/migration change.
- Any Git branch/worktree operation.
- Enabling `cacheComponents` as part of the core plan (evaluated as an optional Phase 4; it is a larger change with its own build-validation requirements).
- Implementing the changes (planning-only pack).

## Assumptions (to validate at implementation time)
- ASSUMP-01: The workshop product is single-user-per-workspace (consistent with the `staleTimes` rationale in `next.config.ts:99-101`). Affects cache staleness tolerance.
- ASSUMP-02: The "skeleton flashes" observation is reproducible in `bun run dev` AND/OR a production build; dev disables prefetching (doc-cited), so dev-only observation may differ from prod. Phase 0 measures both.
- ASSUMP-03: No other agent is concurrently editing `WorkshopPageShell`, `StaticWorkshopLoadingShell`, or `workshop/layout.tsx` (re-check at execution time per concurrent-repo rules).

## Constraints
- Next.js 16.2.10, React 19.2.7, Tailwind v4, OpenNext/Cloudflare Workers.
- `cacheComponents` currently OFF; `experimental.staleTimes = { dynamic: 60, static: 180 }`.
- Shared live worktree — file-scope ownership, small diffs, re-read before edits.
