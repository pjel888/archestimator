# 18 — Stack Contract and Production Standards

Cross-cutting stack decisions for this plan. The active stack is Next.js 16,
React 19, Bun, TypeScript, Tailwind v4, OpenNext on Cloudflare Workers,
Cloudflare D1/R2/Durable Objects/Queues/Cron/Email/Images, Better Auth,
TanStack Query, Zustand, repository boundaries. **This plan changes none of
it.** This document confirms the closure procedure respects each layer.

## 18.1 Next.js / React

- **Change?** None. Closure touches no route, component, Server Action, cache,
  Server/Client boundary, or rendering behavior.
- **Server/Client boundary**: unchanged.
- **Cache/revalidation**: unchanged (closure is CLI/JSON, not cache-affecting).
- **Server Actions**: unchanged.

## 18.2 Cloudflare Workers / OpenNext

- **Worker**: `archestimator-proof`, deployed at 100% on `archestimator.com`
  (proven). Closure does not deploy.
- **Compatibility**: `compatibility_date 2026-06-29`, `nodejs_compat`. Unchanged.
- **Bindings**: all 7 (D1, R2, DO, Queue, Email, Images, Assets) unchanged.
  Smoke probes them read-only.

## 18.3 Cloudflare D1

- **Change?** None. 39 migrations; no new migration.
- **App authorization**: unchanged. Closure does not touch app-authz paths.
- **D1 as auth store**: Better Auth `database: options.d1Database` from
  `env.ARCH_DB`. Unchanged.

## 18.4 Cloudflare R2 / Durable Objects / Queues / Email / Images

- All unchanged. Smoke (`cf:check-provider-resources`) reads them back
  read-only to confirm health.

## 18.5 Better Auth

- **Change?** None. `createCloudflareBetterAuthForD1` factory, D1-backed.
  Closure does not touch auth config, sessions, OAuth, invites, or beta gates.

## 18.6 TypeScript / validation

- **Change?** None. No type, DTO, or validation change.
- `cloudflare-env.d.ts` Env type unchanged (no binding change → no `cf:typegen`
  needed).

## 18.7 Tailwind v4 / design system

- **Change?** None. No UI surface (`05_…`).

## 18.8 Performance / reliability / observability

- **Change?** None. Existing Workers Observability covers post-closure runtime.
  No new metric, dashboard, alert, or budget (`09_…`).

## 18.9 Security / privacy

- **Change?** None to controls. The closure *procedure* respects the
  sanitization boundary (`08_…` §8.3) and provider boundary (`08_…` §8.5).
- No secrets read, printed, committed, or echoed.

## 18.10 Testing

- `test` = `bun test tests/unit`; `test:dom` = `vitest run`.
- Generator test is vitest → `test:dom`. Unchanged.

## 18.11 Cost posture

- Stays on free-tier/bundled limits. No paid add-on proposed. Closure adds no
  Cloudflare consumption (smoke is read-only, within free-tier read budgets).

## 18.12 Operations

- Daily D1 backups + `cf:d1-restore-rehearsal` remain the cheap recovery path.
  3 crons, Queue DLQ, Workers Observability unchanged.

## 18.13 Provider-boundary standard (binding)

- In-bounds (standing authorization): resources in `wrangler.jsonc`.
- Out-of-bounds: Supabase `ebxxqidacheyapmmzavr`, the unrelated
  `archestimator` provider project, Vercel, Resend, other Cloudflare
  accounts/projects.
- Closure is read-only and in-bounds. No mutation of any provider.

## 18.14 Evidence-honesty standard (binding)

- Local evidence cannot prove hosted/provider state.
- Operator attestation is not independent truth.
- `accepted-deferral` is not proof.
- The pack JSON `providerExitReady` is the single closure truth (md is rendering).
- No proxy signal accepted as completion.
