# 18 — Stack Contract and Production Standards

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

This is the consolidated cross-cutting stack contract for the audit. Per `Creating-Plan-Prompt.md:1200`, it consolidates Next.js, React, Tailwind, D1 (Supabase-equivalent), TypeScript, performance, security, and design-system production decisions that cut across the audit.

## Active runtime stack (locked)

| Layer | Technology | Version | Source |
|---|---|---|---|
| Framework | Next.js | 16.2.6 | `package.json` per FAST PATH |
| UI runtime | React | 19.2.6 | `package.json` per FAST PATH |
| Runtime | Bun | (latest stable) | `package.json` per FAST PATH |
| Language | TypeScript | strict, ES2017 target | `tsconfig.json` |
| Styling | Tailwind CSS v4 | CSS-first config (no `tailwind.config.ts`) | per repo |
| Worker host | Cloudflare Workers | OpenNext adapter | `wrangler.jsonc` |
| D1 | Cloudflare D1 (SQLite) | active runtime | `wrangler.jsonc:d1_databases[0]` binding `ARCH_DB` |
| R2 | Cloudflare R2 | active runtime | `wrangler.jsonc:r2_buckets[0]` binding `ARCH_UPLOADS_R2` |
| Realtime | Durable Objects + WebSocket hibernation | active runtime | `wrangler.jsonc:durable_objects.bindings[0]` `COLLAB_ROOMS` |
| Background jobs | Cloudflare Queues | active runtime | `wrangler.jsonc:queues[0]` `UPLOAD_JOBS_QUEUE` |
| Scheduled jobs | Cloudflare Cron Triggers | active runtime | `wrangler.jsonc:triggers.crons` (`0 3 * * *`, `15 3 * * *`) |
| Email | Cloudflare Email Service | active runtime | `wrangler.jsonc:send_email[0]` `EMAIL` binding |
| Image processing | Cloudflare Images | active runtime | `wrangler.jsonc:images[0]` `IMAGES` binding |
| Auth | Better Auth | pinned in `package.json` | `src/lib/auth/better-auth-cloudflare.ts` |
| Server state | TanStack Query 5 | active runtime | `src/hooks/use-*.ts` |
| Client state | Zustand 5 | active runtime | `src/stores/` |
| Charts | D3 7 | active runtime | `src/components/charts/` |
| Tree UI | React Complex Tree 2 | active runtime | estimate sheet editor |
| Icons | Phosphor Icons, Lucide (shadcn) | active runtime | UI components |
| Validation | zod | active runtime | API boundaries |
| Build | Next.js build + OpenNext (`cf:build`) | `bun run cf:build` → `wrangler deploy` | `package.json` scripts |
| Lint | ESLint 9 flat config | active runtime | `bun run lint` |
| Design lint | Custom design-system linter | `scripts/enforce-app-design-system.mjs` | `bun run lint:design-system` |
| Type check | `tsc --noEmit` | `bun run type-check` | `package.json` |
| DOM tests | Vitest 4.1.7 + jsdom | `bun run test:dom` | `tests/vitest/` |
| Unit tests | Bun test | `bun run test` | `tests/unit/` |
| E2E | Playwright | `bun run test:e2e` | `e2e/` |
| Storybook | 10.4.2 review surface only | `bun run storybook` (dev only, not on runtime) | per FAST PATH |

## Production hardening contract

These standards MUST hold for any future remediation phase that ships to production.

### Next.js 16 App Router contract

- Server Component by default. `"use client"` boundary scoped to the smallest interactive surface.
- Route Handlers and Server Actions are POST endpoints; auth + validation + idempotency enforced server-side.
- `redirect()` calls inside Server Actions MUST authorize FIRST (no blind redirect).
- `cookies()`, `headers()`, `params`, `searchParams` request-time APIs wrapped in `await` (Next 16 requires this).
- Suspense boundary at every dynamic / uncached data load.
- `loading.tsx` or component-level Suspense for initial load.
- `not-found.tsx` for not-found state.
- `error.tsx` for uncaught error boundary.
- `metadata` exported per route for OG / robots / sitemap.
- No Server Component calls an internal Route Handler via `fetch()` — use the underlying data function directly.

### Cache / revalidation contract

- Public static page cache via `routeStaticPublicPageThroughCache` (Worker-level) for tenant-agnostic routes only (`/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`).
- `revalidateTag` and `revalidatePath` called by mutation handlers when relevant.
- TanStack Query 30s staleTime default; mutation success invalidates the relevant query key.
- `use cache`, `cacheLife`, `cacheTag` (Next 16 Cache Components) — adopted surface-by-surface per `09_*.md` PERF-001.

### Server Actions contract

- All mutations wrapped in `"use server"` actions OR explicit Route Handlers.
- Auth check (Better Auth session) at the top.
- Ownership check (`can_edit_project` RPC OR equivalent) for resource mutations.
- zod schema at the top.
- Idempotency key (REQ-API-004) OR conditional update OR transactional guard.
- DTO return (`{ok, data, error}` envelope) per REQ-API-003.
- Audit row written to relevant sidecar table when applicable (per migration `0012-0015` audit sidecars).
- `redirect()` after success returns a stable, shareable URL.

### React 19 component contract

- Server Components by default; `"use client"` only for interactivity.
- No mirrored state via `useEffect`; derive from props / URL / Zustand.
- Memoization (`useMemo`, `useCallback`, `memo`) only when justified by measured render cost.
- Stable keys for reorderable / mutable lists.
- No nested card soup, no inaccessible div-buttons, no hidden keyboard traps.
- Typed props (no `any`).

### Tailwind v4 contract

- CSS-first config (no `tailwind.config.ts`).
- Reuse `src/components/ui/` primitives before ad hoc markup.
- Design tokens via `globals.css` CSS variables.
- `lint:design-system` exit 0 for any UI-affecting change.
- Per DESIGN.md (alpha-stage guidance): defer to Philip on design decisions; do not block on design-system grounds.

### TypeScript contract

- `strict: true`.
- No `as any`, `@ts-ignore`, `@ts-expect-error`.
- zod runtime validation at trust boundaries (server actions, route handlers).
- Generated types from `bun run cf:typegen` for CloudflareEnv bindings.
- No `string`-typed domain states; use discriminated unions.

### D1 + R2 + DO + Queue + Cron + Email contract

- D1 access centralized via repository module (REQ-ARCH-001).
- Every prepared statement scoped by `workspace_id` / `owner_id` (REQ-SEC-001).
- R2 object keys workspace-prefixed OR opaque-id-mapped (REQ-SEC-012).
- DO `alarm()` hibernation for WS sessions (REQ-PERF-002).
- Queue consumer dedup key per message body (REQ-REL-001).
- Cron dispatch on `controller.cron` (REQ-PERF-004) with overlap guard.
- Email send via `EMAIL` binding through `src/lib/email/transactional-email-client.ts`; rate limit per recipient; bounce handling; DMARC posture tracked (`OPEN-006`).

### Better Auth contract

- Mount at `/api/auth/[...all]` route handler.
- D1 storage adapter via `src/lib/auth/better-auth-cloudflare.ts` (custom).
- Ratelimiter storage on D1 (NOT KV — eventual consistency is unsuitable per Cloudflare guidance).
- `BETTER_AUTH_TRUSTED_ORIGINS` parsed as exact-match list (DEC-020).
- `BETTER_AUTH_SECRET` rotated per documented procedure (OPEN-015).
- Session cookie HttpOnly, Secure, SameSite=Lax (or Strict when applicable).
- Google OAuth callback configured for Cloudflare Worker origins.
- Magic-link token one-shot, expiry-bound.
- CSRF token per-session.
- Account-linking rules verified (OPEN-014).

### Performance contract

- Per-surface p50/p95/p99 budget per `09_*.md` (D1 ≤600ms, R2 mint ≤2s, Email ≤10s, DO RPC ≤500ms).
- `bun run cf:d1-runtime-performance-proof` exit 0 with all surfaces within budget.
- `bun run cf:d1-performance-proof` exit 0 with hot-path p95 within budget.
- `bun run cf:jobs-proof` exit 0 with queue/cron runtime within budget.
- `bun run cf:check-email` exit 0 with email send within budget.

### Reliability contract

- DLQ alert in place (`archestimator-upload-jobs-dlq` — REQ-REL-002).
- Workers Observability sample-rate adequate for P0 forensic visibility (REQ-REL-003, OPEN-002).
- Cron overlap guard in app code (REQ-PERF-004).
- Per-surface failure-mode matrix documented in `09_*.md`.

### Security contract

- `bun run lint` exit 0 (no `as any`, error-contract regex).
- `bun run cf:d1-authz-matrix` exit 0 with full coverage.
- Per-Server-Action verdict table non-TBD (REQ-SEC-002).
- Credential-material types distinct (REQ-SEC-003).
- Internal routes secret-gated (REQ-API-007).
- DMARC posture decided (`OPEN-006`).
- `NEXT_PUBLIC_` secret leak scan exit 0 (REQ-SEC-004).

### Observability contract

- Workers Observability enabled with sampling 0.1 logs / 0.05 traces.
- `console.log` in worker.ts scheduled handler replaced with structured logger OR justified (REQ-REL-004).
- External sink (Sentry, Datadog) optional (`OPEN-010`).

### Operations contract

- `bun run cf:deploy` for production Worker deploy.
- `bun run cf:typegen` for binding type refresh.
- `bun run cf:sync-worker-secrets` for secret rotation.
- `bun run validate:agents` for `.ai/12_agents/payloads` adapter validity.
- `bun run cf:d1-restore-rehearsal` weekly.
- Per-phase rollback procedure documented in `13_*.md`.

### Documentation contract

- `README.md` (root) reflects Cloudflare-only stack (REQ-DOC-001, RISK-018).
- `.ai/10_state/current-state.md` carries OPEN entries for new stable IDs.
- `.ai/10_state/decisions.md` carries DEC-* entries for new decisions.
- This audit pack's LOOP_LEDGER carries iteration history.

## Anti-patterns rejected

| Anti-pattern | Why rejected |
|---|---|
| KV for sessions / rate limits / locks | Eventual consistency (Cloudflare guidance) |
| KV for object storage | Not blob-handling suitable |
| Service-role from client bundle | PII / data leak risk |
| Raw `throw new Error(...)` from Route Handler / Server Action | Leaks internal paths; use `{ok, data, error}` envelope |
| Generic `Token` type for multiple credential materials | Collapse → replay attack (RISK-003) |
| Anonymous WS upgrade | Replay / DDoS risk |
| Internal route without secret gate | PIR drive risk |
| Direct D1 access from Server Action without repository module | Drift in row-level scoping (RISK-001) |
| Cross-tenant static-page cache | Cross-tenant leak risk (RISK-019) |
| `bun run test:dom` full-suite as a hard CI gate | Pre-existing REDs (~131 / 36 files); use focused matrix |
| Production browser proof as default gate for every UI tweak | Codex/UI verification policy: opt-in surface only |
| Big-bang remediation PR | Phase 1-12 in separate PRs (DEC-017) |