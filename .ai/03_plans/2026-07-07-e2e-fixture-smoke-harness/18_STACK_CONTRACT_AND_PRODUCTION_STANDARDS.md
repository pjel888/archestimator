# 18 — Stack Contract and Production Standards

This harness plans against Archestimator's active baseline stack. It does **not** change the stack. Each layer below states how the harness engages it.

## Next.js 16.2.10 (App Router)
- The smoke runs against `next dev` (the `webServer`). No build/SSR/edge-runtime claim beyond "the dev server boots and serves routes on 3020."
- Server Component vs Client boundaries: unchanged by this plan. Smoke observes rendered output; it doesn't restructure components.
- `next dev` resolves Cloudflare bindings via `@opennextjs/cloudflare` `getCloudflareContext({async:true})` (ASSUMP-1). T1.0 probe confirms.
- Proxy (`src/proxy.ts` → `request-proxy.ts`) handles auth gating; smoke depends on it redirecting unauth `/workshop` and admitting dev-auth.
- Local Next.js 16 docs under `node_modules/next/dist/docs/` consulted if any framework-sensitive claim arises during implementation (none anticipated for a test harness).

## React 19.2.7
- Harness writes no React. Optional `data-*` testid additions to app components are inert attributes (no behavior, no render-count change).

## TypeScript
- All harness code typed; no `any`. **`e2e/` is type-checked via a dedicated `e2e/tsconfig.json`** (`bun run e2e:typecheck`) because the root `tsconfig.json:36` **excludes** `e2e` (alongside `tests`, `vitest.config.ts`, `playwright.config.ts`). The repo `bun run type-check` therefore does NOT cover e2e — this is a confirmed planning fact, not an assumption (T1.5b fixes it). `vitest.config.ts:10` also excludes `e2e` (separate runner).
- Fixture builders return typed objects; overrides partial-typed.

## Tailwind v4 / design-system
- No CSS/design-token changes. Harness selects existing elements by role/label/testid.

## @opennextjs/cloudflare ^1.20.1
- `getCloudflareContext` is the binding bridge in `next dev`. Harness depends on it for local D1/R2/Queue/Email/Images reachability. No config change to `open-next.config.ts` or `wrangler.next-dev.jsonc`.

## Cloudflare D1 (local preview `363c756a-…`)
- Smoke seed/reset target via `wrangler d1 … --local`. SQLite semantics (single-writer; `ON CONFLICT` supported). No remote D1 writes.
- `profiles`/`workspace_members`/project/estimate/library/publication schemas honored by seed SQL.

## Cloudflare R2 (local preview bucket `archestimator-proof-uploads-dev`)
- Upload smoke writes a tiny object under prefix `e2e-smoke/`; reset deletes the prefix. Object-key design respects existing `src/lib/uploads/object-keys.ts` conventions (executor confirms in T-upload).

## Durable Objects / Queues / Email / Images
- Out of smoke scope (collaboration DO realtime, upload Queue jobs, Email delivery, Cloudflare Images). Smoke does not exercise realtime DO; upload smoke uses the synchronous direct-upload path (not the async Queue job, which is `UPLOAD_JOBS_ENABLED=0` by default).

## Better Auth 1.6.23
- Smoke uses the **dev-auth bypass**, not a real Better Auth session (D-1). The bypass resolves a profile from D1 without a session cookie/JWT. Better Auth runtime code is unchanged.
- The deferred real-session path (OPEN-1) would use Better Auth magic-link or Google OAuth against a deployed preview — not Phase-1.

## TanStack Query / Zustand
- Unchanged. Smoke observes the rendered DOM after React Query settles (uses Playwright auto-waiting / `expect(...).toBeVisible()`).

## Repository boundaries
- Harness respects existing `src/lib/*` repository/data-access patterns by **not importing them** (E2E reads via HTTP/DOM, unlike vitest which `vi.mock`s them).

## Security / production standards honored
- Dev-auth bypass stays dev-only (`NODE_ENV!=='production'`, localhost, ≥32-char secret) — SEC-1.
- No real secrets committed; `.env.e2e.example` placeholders only.
- Local preview D1/R2 only; remote resources untouched.
- Publication password/lockout smoke uses fresh tokens + known test password.
- Manifest/report redacts secrets (executor enforces).

## Performance / reliability standards
- Suite ≤ 4 min chromium; retries:1; quarantine lane; baseline + manifest.

## Verification proportionality (AGENTS.md)
- This plan is docs-only ⇒ verification = `git diff --check` + path/ignore checks + the emulated critique/revision cycles in `19_*`. No app code changed ⇒ no type-check/lint/test of app code required to validate the *plan* (those validate the future *implementation*, which the executor owns).

## What is explicitly NOT in this stack contract
- No new dependencies (no faker, no miniflare, no pool-workers). Sentinel-UUID fixtures only.
- No Worker deploy, no `wrangler deploy`, no remote secret sync.
- No paid Cloudflare add-ons.
