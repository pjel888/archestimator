# Stack Contract And Dependencies

## Active Stack (verified 2026-07-06)

- Next.js 16.2.6
- React 19.2.6
- Bun (runtime + package manager + test runner for `tests/unit/`)
- TypeScript (strict, ES2017 target)
- Tailwind v4 (CSS-first config)
- TanStack Query 5
- Zustand 5.0.14
- Cloudflare Workers/OpenNext (`@opennextjs/cloudflare@^1.20.1`)
- D1-backed estimate persistence (`ARCH_DB`)
- Better Auth 1.6.22
- Wrangler ^4.105.0
- `react-complex-tree@^2.6.1` — installed but unused by active `EstimateSheetTree` (the in-repo `Tree` primitive is the surface)
- Phosphor Icons + Lucide (shadcn)
- Vitest 4.1.7 (DOM tests)
- Playwright (E2E)

## Dependency Position

Do not add dependencies for this fix.

Existing dependencies are enough:

- React DOM and Testing Library for DOM tests.
- Vitest for unit/DOM/action tests.
- TanStack Query for cache behavior.
- Existing `Tree` primitive for DnD and keyboard.
- Existing server action and D1 action-client layers.

## Framework Contract

- Keep client component behavior inside existing component boundaries.
- Keep server mutation authorization in server actions.
- Do not rely on route refresh for successful reorder; existing tests assert route refresh avoidance.
- Keep query cache revision semantics from `use-estimate-query.ts`.
- Server Actions are directly reachable POST endpoints — validate auth, ownership, input, idempotency for every action. The `reorderEstimateTreeNodes` action already enforces all of these; the only gap was the missing `target_project_id` field in the payload (RC0).
- React memoization (`useMemo`, `useCallback`, `memo`) is a performance tool, not a correctness guarantee. Extracted hooks/components must be correct without memoization, then preserve memoization only where perf tests, memoized children, or Hook dependencies justify it.
- React `useEffectEvent` callbacks should stay local to Effect logic; do not pass them to children or extracted hooks as ordinary event handlers.
- Next.js Client Component extraction can increase client bundle scope. Keep non-interactive helpers outside the client module graph when practical and keep Server-to-Client props serializable.
- Cloudflare D1 dynamic SQL must use prepared statements/bound parameters. If `runBatch` maps to `D1Database.batch()`, batch statements execute sequentially and roll back as a sequence; verify before claiming atomicity.
- D1 local proof and remote/provider proof are separate. Wrangler local execution is not hosted proof; remote proof must stay inside the `ARCH_DB` binding in `wrangler.jsonc`.

## Phase 0 Stack Impact

Phase 0 changes one line in `actions.ts`. No new imports, no new modules, no new dependencies, no new framework features.

## Documentation Position

No new external framework behavior is being introduced. If implementation changes Next.js server action shape, cache invalidation, or routing behavior, read the relevant local Next.js 16 docs under `node_modules/next/dist/docs/` before editing.

Phase 0 does not change Next.js server action shape; it only adds a field to an existing RPC payload.

Official documentation checked on July 6, 2026:

- React `useEffectEvent`: https://react.dev/reference/react/useEffectEvent
- Next.js Mutating Data / Server Functions: https://nextjs.org/docs/app/getting-started/mutating-data
- Next.js Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Cloudflare D1 Database API: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Cloudflare D1 Prepared Statements: https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- Cloudflare D1 Limits: https://developers.cloudflare.com/d1/platform/limits/
- WAI-ARIA APG Tree View Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- WAI-ARIA keyboard/focus practices: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
