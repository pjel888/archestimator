# 18 — Stack Contract and Production Standards

Consolidates the Next.js / React / Tailwind / Supabase / TypeScript / performance / security / and design-system production decisions that cut across the plan.

## Stack (verified against repo)

| Layer | Technology | Version | Source of truth |
|---|---|---|---|
| Framework | Next.js | 16.2.6 (App Router, RSC) | `package.json` (verified via repo README) |
| UI runtime | React | 19.2.6 | `package.json` |
| Runtime / package manager | Bun | latest stable | `package.json` |
| Language | TypeScript | 6.0.3 | `package.json` |
| Styling | Tailwind CSS | v4 (CSS-first config, no `tailwind.config.ts`) | `src/app/globals.css` |
| Database | Supabase / PostgreSQL | 17 | 67+ local migration files |
| Auth | Supabase Auth | (Google OAuth, magic link, SSR helpers) | `src/lib/supabase/server.ts` |
| State | TanStack Query 5, Zustand 5 | — | `package.json` |
| Tree UI | React Complex Tree 2 | (not used by this page) | — |
| Charts | D3 7 | (not used by this page) | — |
| Testing | Bun test, Vitest 4.1.7 (jsdom), Playwright | — | `package.json` |
| Linting | ESLint 9 (flat config) + custom design-system linter | — | `package.json` |

## Next.js App Router contracts

- Server Components are the default. Every new file is a Server Component unless it needs state/effects/browser APIs.
- `"use client";` on line 1, before imports, only for files that need it.
- `params` and `searchParams` are async (`Promise<...>`) in Next.js 16 — `await` them.
- Never import a Client Component from a `"use server"` file.
- Never re-export server-only code through a client module.
- Use `next/navigation`'s `useRouter` and `useSearchParams` for client-side URL state.
- Use `router.replace(url, { scroll: false })` for filter changes that should not scroll the page.

## React 19 / hook discipline

- Hooks only at the top level of a function component or another hook.
- No `useEffect` for derived state — compute during render.
- Memoization only for measured cost or referential stability needs.
- `useTransition` or `useOptimistic` only if needed; v1 likely doesn't need them.

## Tailwind v4 / design system

- Reuse tokens in `src/app/globals.css`.
- 12px maximum font size for app content (per `scripts/enforce-app-design-system.mjs`).
- xs-only border radius (3px).
- Zero letter-spacing.
- Neutral palette (`#292929`, `#5D5D5D`, `#7F7F7F`) plus existing surface/ink tokens.
- Phosphor Icons (regular weight outline) for new icons; Lucide via shadcn only if a Phosphor equivalent doesn't exist.
- **`DESIGN.md` is alpha-stage guidance** — defer to Philip on visual decisions; do not block or revert work on design-system grounds.

## Supabase / Postgres contracts

- Use `createSupabaseServerClient()` (authenticated user context). Never `service_role` from a route or repository.
- RLS is the last line of defense on every read.
- All queries are parameterized (no string interpolation).
- Hard limit clamp (≤ 50) on every paginated read.
- Project boundary: `ebxxqidacheyapmmzavr` only.
- v1 includes one scoped collaboration-audit RPC migration because direct table reads are denied. No denormalized activity table or unrelated schema redesign.
- Direct reads from `collaboration_audit_events` remain denied; access goes through `read_project_collaboration_audit_events(...)`.

## TypeScript contracts

- No `any`, `as any`, `@ts-ignore`, `@ts-expect-error`.
- No unsafe casts.
- Runtime validation at trust boundaries (URL params).
- Domain types that prevent impossible states where practical.
- Generated Supabase types are source-of-truth for table shapes (`src/lib/supabase/types.ts`).

## State management contracts

| State kind | Owner |
|---|---|
| Server-derived activity data | Server Component prefetch (RSC) |
| Filter/scope (shareable) | URL searchParams |
| Cursor/pagination append state | Local client state + authenticated loader |
| Count summary | Server/repository `counts` DTO |
| Dropdown open/close (UI-only) | Local `useState` |
| "Load more" / refreshing | Local `useState` |
| Cross-component client state | Not needed for v1 (no Zustand / no TanStack Query client cache) |

## Performance contracts

- Initial route TTFB ≤ 300ms p50 at closed-beta scale.
- Client bundle ≤ 10 KB gzipped additional.
- ≤ 13 data reads + ≤ 6 count reads per initial route render unless folded into source queries.
- No N+1 label lookups.
- `Promise.all` over independent queries.

## Security contracts

- Server-side ownership + permission gates on every prefetch.
- Same ownership + permission gates on the Load more Route Handler.
- PII minimization: no recipient email leaves the server.
- No `dangerouslySetInnerHTML`.
- No `service_role` import.
- URL params validated against allowlists.
- Cursor re-validated server-side.

## Reliability contracts

- Partial-source resilience (page renders even if one source fails).
- Friendly error UI for unrecoverable errors.
- Cursor tamper-resistance.

## Accessibility contracts

- WCAG 2.2 AA target.
- Keyboard operability for every control.
- Visible focus.
- Screen-reader semantics (`role`, `aria-label`, `aria-live`).
- Reduced-motion respect.
- Non-color status cues.

## Testing contracts

- TDD: RED → GREEN → REFACTOR for behavior-bearing work.
- Vitest jsdom for unit / DOM / security denial tests.
- Focused `bun run test:dom -- project-activity-page` during TDD.
- `bun run lint:design` is part of the broad validation inventory.
- `bun run validate` as the final broad gate; if it fails only on documented pre-existing unrelated suites, record exact failures and require all focused project-activity checks plus build to pass.
- `bun run build` as the production-build check.
- Playwright E2E: **not required for v1** per `02` non-goals and repo proportional verification policy.

## Observability contracts

- `withPerfTraceRequest` + `traced` wrappers on Server Component prefetch.
- `console.warn("[project-activity] ...")` for source-unavailable events.
- No PII in logs.

## Rollout contracts

- No feature flag required (closed-beta stage gate).
- `git revert` is the rollback path.
- Vercel auto-deploys from `main`.
- This plan does not authorize production deploy.
