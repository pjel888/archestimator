# 01 — Source and Codebase Audit

Historical pre-implementation inventory of error-handling surfaces across the Archestimator codebase. Grounded in actual file paths and code excerpts captured 2026-06-28. For current implementation status, see `README.md`, `12_TRACEABILITY_AND_READINESS_REVIEW.md`, and `13_FINAL_AUDIT_SCORECARD.md`.

## A. Client-side error surfaces

### A.1 Toast system (custom, KEEP API)

- **Module:** `src/components/ui/toast.tsx`
- **Mount:** `ToastProvider` in `src/app/providers.tsx` wrapping entire app
- **Public API:**
  ```ts
  toast({ id?, message, tone, durationMs? })
  // tone: 'success' | 'error' | 'warning' | 'info' | 'loading'
  ```
- **UseToast hook:** `useToast()` returns `{ toast, dismiss }`
- **Sample call sites:**
  - `src/components/workshop/projects-page-client.tsx:1545` — `toast({ message: snapshot.errorMessage, tone: "error" })`
  - same file L1549, L1570, L1579 (group create/rename failures)
- **Storybook coverage:** `src/stories/feedback/toast.stories.tsx`, `src/stories/primitives/menus-overlays-feedback.stories.tsx`
- **Gap vs standard:** No `toast.appError(err)` convenience; no programmatic tone-from-error-class mapping; no dedupe of identical errors.

### A.2 React error boundaries

9 `error.tsx` files, all using `WorkshopRouteErrorState` shared component:

| Path | Route label |
|---|---|
| `src/app/workshop/library/error.tsx` | "Library" |
| `src/app/workshop/library/components/error.tsx` | (assumed similar) |
| `src/app/workshop/library/templates/error.tsx` | (assumed) |
| `src/app/workshop/library/templates/[templateId]/error.tsx` | (assumed) |
| `src/app/workshop/projects/[projectId]/data/error.tsx` | (assumed) |
| `src/app/workshop/projects/[projectId]/estimates/error.tsx` | (assumed) |
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/error.tsx` | "Estimate workspace" |
| `src/app/workshop/publisher/error.tsx` | (assumed) |
| `src/app/share/[token]/not-found.tsx` | (not-found, different shape) |

**Sample content** (estimate editor):
```tsx
"use client";
import { WorkshopRouteErrorState } from "@/components/workshop/WorkshopRouteErrorState";
export default function Error({ error, reset }) {
  return <WorkshopRouteErrorState error={error} reset={reset} routeLabel="Estimate workspace" />;
}
```

**Gaps:**
- **NO `global-error.tsx`** at `src/app/global-error.tsx` — Next.js 16 requires this for errors that escape the root layout. Anything that throws in `layout.tsx` or `providers.tsx` shows the browser-default error page.
- **NO `src/app/error.tsx`** — root route has no boundary; only workshop sub-routes do.
- **NO `src/app/not-found.tsx`** — root 404 falls back to Next.js default.
- All workshop `error.tsx` use the same component — good consolidation, but `WorkshopRouteErrorState` currently does NOT route to Toast or call a logger (visual-only). Plan must wire it.

### A.3 useEffect + try/catch in client components

86 `useEffect` sites in `src/`. Try/catch concentrated in:
- `src/hooks/use-estimate-cursor-broadcast.ts`
- `src/hooks/use-project-presence.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/hooks/use-estimate-row-update-broadcast.ts`
- `src/components/share/SharePageComments.tsx`, `SharePageSessionBanner.tsx`, `SharePageDecision.tsx`, `SharedLinkActivityFeed.tsx`, `SharePageDecisionConfirmDialog.tsx`
- `src/components/realtime-auth-bridge.tsx`
- `src/app/share/[token]/page.tsx`
- `src/app/invite/[token]/page.tsx`
- `src/app/invite/[token]/continue/route.ts`
- `src/app/invite/[token]/sign-out/route.ts`
- `src/app/api/share/[token]/session/route.ts`

**Gap:** No standard "catch → AppError → toast + log" pattern. Each site invents its own handling.

### A.4 fetch / supabase-js client calls

- Supabase browser client in `src/lib/supabase/browser.ts` (path inferred from conventions).
- Client-side mutations use TanStack Query (`useMutation`) with optimistic updates.
- Errors from optimistic-update rollback surface via `toast({ tone: 'error' })` (see `projects-page-client.tsx`).
- **Gap:** TanStack Query's `onError` handlers do not log to a server sink; client-only errors vanish.

### A.5 console.* usage (top files)

| File | console.* count |
|---|---|
| `src/lib/repositories/workspace-repository.ts` | 7 |
| `src/lib/repositories/component-library-repository.ts` | 6 |
| `src/lib/email/resend-client.ts` | 5 |
| `src/lib/collaboration/actions.ts` | 5 |
| `src/components/workshop/component-library/index.tsx` | 5 |
| `src/app/api/component-library/attachments/route.ts` | 5 |
| `src/lib/publication/actions.ts` | 4 |
| `src/app/share/[token]/page.tsx` | 4 |
| (12 more files with 1-3 each) | — |

**Gap:** Every one of these is an unstructured log line that an AI agent cannot reliably parse.

### A.6 Form validation

- **NO Zod** (0 imports of `from "zod"` in `src/`).
- **Gap:** No schema-validation library. Trust-boundary validation is hand-rolled. This plan keeps dependency adoption out of scope and uses a small strict local parser for the pilot client-error endpoint.

### A.7 Third-party error reporting

**NONE.** Grep for `@sentry|posthog|bugsnag|datadog|amplitude` in `src/` returns zero files. The plan adds Sentry in P5.

## B. Server-side error surfaces

### B.1 Server actions (22 files; 28 `'use server'` directives)

Files (full list in `00_AGENT_COORDINATION.md`):
```
src/lib/auth/{account-actions,actions,beta-allowlist-admin-actions}.ts
src/lib/collaboration/{actions,pending-invite-actions,realtime-identity-actions,summary-actions}.ts
src/lib/component-library/{actions,template-editor-actions}.ts
src/lib/estimate-sheet/user-preferences-actions.ts
src/lib/estimates/{actions,express-promotion-actions,subtree-actions}.ts
src/lib/favorites/sidebar-favorites-actions.ts
src/lib/legal/actions.ts
src/lib/notifications/actions.ts
src/lib/projects/{actions,location-actions}.ts
src/lib/publication/actions.ts
src/lib/publisher/{activity-actions,drawer-actions}.ts
src/lib/reusable-sources/actions.ts
src/lib/workshop/{actions,beta-feedback-actions,beta-feedback-review-actions,group-actions}.ts
```

**Return shape inconsistency (THE central problem this plan solves):**

| Pattern | Example file | Shape |
|---|---|---|
| `throw new Error()` | `src/lib/publication/actions.ts:201` | throws raw Postgres errors to client |
| `throw projectError` (raw Supabase error) | `src/lib/publication/actions.ts:201, 202, 220, 221, 227, 320, 328, 337` | leaks DB internals |
| `{ok:false, error, code:'CIRCUIT_OPEN'}` | `src/lib/email/resend-client.ts:126, 213` | discriminated union |
| `{data, error}` | `src/lib/repositories/component-library-repository.ts:121, 125, 133, 136, 137` | repository pattern |
| `{ok:false, code:'unauthenticated'}` | `src/lib/notifications/actions.ts:36` | code-only |
| `{valid:bool, errors:[]}` | `src/lib/ai/package-builder/schemas.ts:1293` | validation result |
| `{authorized:bool, error, snapshot}` | `src/lib/uploads/operations-dashboard.ts:299` | domain-specific |
| `{ok:false, status:400, error:'...'}` | `src/lib/uploads/scan-override.ts:62-71` | HTTP-flavored |
| `throwActionError(userMessage, cause)` | `src/lib/component-library/action-errors.ts` | partial pattern |

**Existing `action-errors.ts` (good pattern, expand it):**
```ts
export function throwActionError(userMessage: string, cause?: unknown): never {
  console.error(`[library action] ${userMessage}`, cause);
  throw new Error(userMessage);
}
```

**Gap:** This helper exists but is used in only one module. The plan promotes it to a typed `AppError` hierarchy in `src/lib/observability/` (new).

### B.2 Route handlers (22 files)

Full list:
```
src/app/api/ai/{ask,package-builder}/route.ts
src/app/api/component-library/attachments/{route,direct-upload/scan-override}/route.ts
src/app/api/component-library/images/route.ts
src/app/api/estimate-row-images/route.ts
src/app/api/health/route.ts
src/app/api/internal/{upload-cleanup,upload-runtime,upload-scan}/route.ts
src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts
src/app/api/projects/images/route.ts
src/app/api/share/[token]/{route,activity,comment,decision,events,password,session,unsubscribe}/route.ts
src/app/api/webhooks/resend/route.ts
```

**Sample** (`src/app/api/health/route.ts`):
```ts
export const dynamic = "force-dynamic";
const noStoreHeaders = { "Cache-Control": "no-store" };
export async function GET() {
  return Response.json({ ok: true, service: "archestimator", timestamp: new Date().toISOString() }, { headers: noStoreHeaders });
}
```

**Gap:** No standard error-response shape. Plan unifies on:
```ts
NextResponse.json({ ok: false, error: { kind, code, message }, trace_id }, { status: mappedStatusCode })
```

### B.3 Middleware (`src/proxy.ts`)

Next.js middleware as `src/proxy.ts` (Next 16 supports this name). 5472 bytes. Handles:
- Protected route gating (`/workshop`)
- Auth redirect with `sensitiveRouteCacheControl`
- Public route prefixes
- Closed-beta access checks
- Dev-auth-bypass detection

**Gap (DEFERRED — out of scope per README:11):** Errors in middleware (e.g. Supabase session fetch failure) currently redirect silently. Proxy/middleware runs on edge runtime, which cannot import the Node-only Sentry config or `node:crypto`-backed `redact.ts` — so this plan does NOT wire middleware errors. A follow-on plan would need an edge-safe observability path before middleware failures can flow through the same taxonomy.

### B.4 Supabase / database calls

- Server client: `src/lib/supabase/server.ts` (`createSupabaseServerClient` imported by auth callback)
- Browser client: `src/lib/supabase/browser.ts` (inferred)
- Types: `src/lib/supabase/types.ts` (generated; refresh via `bun run gen:types`)
- 67 migration files; 50+ RPC functions; RLS on every user-data table.
- DB mandate active for `ebxxqidacheyapmmzavr`.

**Gap:** Supabase-js returns `{data, error}` — current code either rethrows raw error (leaking DB internals) or swallows it. Plan adds a `unwrapSupabase` helper that converts to typed `AppError` subclasses per `03` Section B.4: auth/RLS (42501) → `AuthPermissionDeniedError`, auth-expired/JWT → `AuthRequiredError`, rate-limit → `RateLimitError`, residual DB failures → `DatabaseError`.

### B.5 Edge runtime

- Grep for `runtime = 'edge'` not run this audit; assumption is edge is used in `src/proxy.ts` (Next.js middleware defaults to edge). Plan treats middleware as edge-runtime and forbids Node-only APIs in any error-handling code that runs there.

### B.6 Server-side logging

**NONE.** No pino, no winston, no structured logger. All "logging" is `console.error`/`console.log` in `src/lib/*` and route handlers.

### B.7 Auth callback error handling

`src/app/auth/callback/route.ts` — uses `mapAuthErrorToCode()` from `src/lib/auth/error-mapping.ts` and `recordAccountSecurityEvent()` from `src/lib/auth/account-audit.ts`. Strong existing pattern.

**Sample:**
```ts
if (!code) {
  await recordAccountSecurityEvent({
    eventType: "auth_callback_missing_code",
    ...auditRequest,
    metadata: { public_error_code: "callback_missing_code", safe_next: next },
  });
  return NextResponse.redirect(buildLoginRedirectUrl({ origin, code: "callback_missing_code", ... }));
}
```

**Gap:** Auth uses a different error pattern (`code` strings + audit events) than the rest of the codebase. Plan extends this pattern — not replaces — by mapping auth codes to `AppError.AuthError` subclasses.

## C. Infrastructure / config

### C.1 `package.json`
- Runtime: `bun@1.3.14`, Framework: `next@16.2.6`, React: `19.2.6`
- **Logger/observability deps:** NONE (no pino, winston, sentry, otel, bugsnag, datadog, posthog, amplitude)
- `validate` script: `bun run type-check && bun run lint && bun run lint:design-system && bun run lint:design && bun run test && bun run test:dom`
- **No log-related scripts** (no `logs:tail`, no `logs:dev`)

### C.2 `next.config.ts`
- Bundle analyzer via `ANALYZE=true`
- Image remote patterns for Supabase + Google Maps
- CSP Report-Only for landing; enforced CSP for `/share`
- Hardening headers for `/workshop/*` and `/invite/*`
- Redirects (legacy routes)
- **NO `logging` config, NO `instrumentation` config, NO `sentry*` config**

### C.3 `instrumentation.ts`
**DOES NOT EXIST** at project root. Plan adds it in P5.

### C.4 `.env.example`
Relevant keys (no values, just keys): Supabase URL/keys/service role, Dev auth bypass, Invite token pepper, Closed beta, Publication secrets, Resend (email), DeepSeek (AI), Tree/row virtualization flags, Google Maps, GA4/Clarity.
- **NO Sentry DSN, NO OTel exporter config, NO log-forwarder env vars**

### C.5 `vercel.json`
```json
{
  "regions": ["syd1"],
  "crons": [
    { "path": "/api/internal/upload-cleanup", "schedule": "0 3 * * *" },
    { "path": "/api/internal/upload-scan", "schedule": "15 3 * * *" }
  ],
  "git": { "deploymentEnabled": false }
}
```
Plan defers Vercel Log Drain/Axiom until first paying user. P5 covers Sentry design/provider gating only.

### C.6 CI workflows
- `.github/workflows/ci.yml` — main pipeline (bun install → validate → build → Playwright)
- `.github/workflows/codeql.yml` — GitHub CodeQL security scan
- `.github/workflows/react-doctor.yml` — react-doctor diagnostics
- **Gap:** No step for sourcemap upload to Sentry (P5 adds it).

### C.7 `supabase/config.toml`
Standard local config. No log-level customization.

### C.8 `tests/` directory
- `tests/fixtures/`, `tests/unit/`, `tests/vitest/`
- **Existing error-related test files:**
  - `tests/vitest/auth-error-mapping.test.ts`
  - `tests/vitest/estimate-sheet-tree-query-error.test.tsx`
  - `tests/vitest/library-action-errors.test.ts`
  - `tests/vitest/no-native-browser-dialogs.test.ts`
  - `tests/vitest/route-error-smoke-gate.test.ts`
  - `tests/vitest/workshop-route-error-boundaries.test.tsx`
- **Gap:** No test for `instrumentation.ts` `onRequestError` (P5). No test for the dev NDJSON logger (P4).

### C.9 `scripts/` directory
~30 scripts. No log-related script. Plan adds `scripts/tail-dev-logs.mjs` in P4.

## D. Test infrastructure
- Vitest (jsdom) for DOM tests — `bun run test:dom`
- Bun test for unit — `bun run test`
- Playwright for E2E — `bun run test:e2e`
- React Testing Library available
- **No msw** for network mocking (inferred from package.json read)
- **No vitest-axe** for accessibility assertions (inferred)

## E. Summary of gaps (drives the requirements in `07_REQUIREMENTS_SPEC.md`)

1. No typed `AppError` hierarchy — every throw site invents its own error.
2. Server action return shapes are inconsistent across 22+ modules.
3. No `global-error.tsx` at root — errors in root layout/providers show browser-default page.
4. No structured logger — only scattered `console.*` calls.
5. No dev-mode log file — AI agents have nothing to tail.
6. No prod error forwarder — production failures are invisible.
7. No `instrumentation.ts` `onRequestError` hook.
8. Toast API is good but has no `appError(err)` convenience mapping.
9. Middleware errors silently redirect; not logged.
10. Supabase raw errors leak to client in some throw paths.
11. Auth error pattern (good) is siloed from the rest of the codebase.
12. No formal validation library (Zod) at trust boundaries.
