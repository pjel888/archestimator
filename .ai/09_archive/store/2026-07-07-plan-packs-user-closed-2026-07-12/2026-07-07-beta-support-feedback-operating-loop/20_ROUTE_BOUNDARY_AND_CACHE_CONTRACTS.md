# 20 — Route Boundary and Cache Contracts (App Router)

Mandated per-route artifact (Improve-Plan-Prompt §4, completion gate). Every affected App Router route gets an explicit boundary/cache contract covering: dynamic-vs-static classification, request-time API usage, the DTO that crosses into Client Components, cache finalization, and revalidation decision.

## Cache model (verified 2026-07-07)

**This repo does NOT use Next.js 16 Cache Components.** `next.config.ts:92-106` `experimental` contains only `optimizePackageImports` and `staleTimes: { dynamic: 60, static: 180 }` — no `cacheComponents`, no `experimental.dynamicIO`, no `experimental.useCache`. Therefore the operative model is the **previous (non-Cache-Components) cache model** documented in `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`:

- `fetch` is **not cached by default** (no-store unless explicit `cache: 'force-cache'` / `next.revalidate` / `unstable_cache`).
- Request-time APIs (`cookies()`, `headers()`, `searchParams`) opt a route into **dynamic rendering**.
- `dynamic = 'force-dynamic'` ≡ every `fetch` `no-store` + `fetchCache = 'force-no-store'`.
- The Cache-Components APIs (`use cache`, `cacheLife`, `cacheTag`) are **inert** under this repo's model — do not introduce them.
- Operative invalidation primitives: `revalidatePath` / `revalidateTag` / router refresh (which the code already uses).

**Local docs cited as evidence:** `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md:11` (fetch not cached by default), `:97-99` (force-dynamic ≡ no-store), `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md:15,32-44` (cacheComponents replaces the old configs; without the flag, old model holds). Next.js version installed: **16.2.10**.

---

## Route contract 1 — `/workshop/feedback` (reporter submission page)

| Dimension | Decision |
|---|---|
| Route files | `src/app/workshop/feedback/page.tsx` (Server Component, `async`). No `loading.tsx`/`error.tsx`/`not-found.tsx` specific to this segment (inherit workshop-level). |
| Rendering | **Dynamic.** `await searchParams` + (transitively) `getCurrentUserContext()` → `headers()` (`session.ts:64`) opts it into dynamic rendering. No `force-dynamic` needed; request-time API usage is implicit. |
| Server-owned data | None fetched at render. The page reads only `searchParams` (`saved`/`fallback`/`error`) to pick acknowledgement copy. |
| Client-crossing DTO | Acknowledgement is derived from URL search params (already client-visible); no privileged DTO crosses into `BetaFeedbackForm`. The form is `"use client"` and receives only the `mode` prop (string). |
| `"use client"` boundary | `BetaFeedbackForm` (`src/components/workshop/BetaFeedbackForm.tsx:1`) is the only client island on this page; the modal variant wraps it via `dynamic(...,{ssr:false})` in `WorkshopFeedbackModal`. **No new client boundary.** |
| Cache finalization | **No cache.** Auth-gated, dynamic, user-specific acknowledgement. Do NOT add `use cache` (inert here anyway) or `unstable_cache`. |
| Mutation + revalidation | `submitBetaFeedback` (redirect mode) does NOT call `revalidatePath` — it relies on POST→redirect→GET with `?saved=1`/`?fallback=1`/`?error=<code>`. The user-facing page has nothing cached to bust. `submitBetaFeedbackInline` returns state via `useActionState` (no navigation, no revalidation). |
| Read-your-writes | Reporter sees their acknowledgement immediately because the action redirects back to the same page with the result param (PRG). No cache to invalidate. |
| Cache-Control header | Add `Cache-Control: no-store` to the redirect action response to prevent back-button re-POST duplication (T-new, `09`). |

## Route contract 2 — `/workshop/settings/feedback` (operator review queue)

| Dimension | Decision |
|---|---|
| Route files | `src/app/workshop/settings/feedback/page.tsx` (Server Component, `async`). |
| Rendering | **Dynamic.** Calls `readBetaFeedbackReviewQueue(params.status)` → `requireCurrentUserContext()` → `headers()`. Dynamic by request-time API usage. |
| Server-owned data | The full queue read (D1 `beta_feedback_submissions`). Server-authoritative; no client mirror. |
| Client-crossing DTO | The rendered HTML table (serialized `BetaFeedbackReviewRow[]` snake_case columns: `created_at, feedback_type, id, message, page_path, project_id, severity, status, updated_at, user_email, workspace_id`). **Note:** `message` + `user_email` are PII crossing into the rendered DOM — this is the existing behavior and is required for triage. No change; document the PII-in-DOM as intentional (operator-only, platform-admin gated). The per-row status `<select>` is a plain HTML form (progressive enhancement), not a client island. |
| `"use client"` boundary | None new. `AdminStatusSelect` (`src/app/workshop/settings/_components/AdminStatusSelect`) — verify whether it's `"use client"`; if it's a server-rendered `<select>`, no client boundary. |
| Cache finalization | **No cache.** Auth-gated, dynamic, operator-only, fresh-per-request (operators need the current queue). Do NOT add `use cache` or `unstable_cache`. |
| Mutation + revalidation | `updateBetaFeedbackReviewStatus` calls `revalidatePath("/workshop/settings/feedback")` (`beta-feedback-review-actions.ts:27`) → the operator sees the updated row on redirect. **This revalidation is correct and required.** |
| Read-your-writes | Operator sees their status change immediately via `revalidatePath` + redirect-back. |
| Pagination state (new) | URL `?status=&page=N`. Page is shareable/reload-safe (same `status`+`page` reproduces the same view because the queue is server-rendered + ordered by `created_at DESC`). No client pagination state. |

## Route contract 3 — `WorkshopFeedbackModal` inline action (modal, no route)

| Dimension | Decision |
|---|---|
| Surface | Floating `Modal` on every workshop page; `BetaFeedbackForm` `mode="inline"` via `useActionState(submitBetaFeedbackInline, ...)`. |
| Rendering | The host workshop page is dynamic (auth-gated). The modal body is `dynamic(...,{ssr:false})` — code-split, client-only after first open. |
| Server-owned data | None at modal render. |
| Client-crossing DTO | The inline action returns `BetaFeedbackInlineState = { message?: string; status: "idle"\|"saved"\|"error"\|"fallback" }` — a minimal DTO, no PII, no privileged data. |
| Cache finalization | No cache. |
| Mutation + revalidation | `submitBetaFeedbackInline` returns state; no `revalidatePath` (no route change). Acknowledgement is in-place `<output>`. |

## Routes NOT affected (explicit)

`/contact` (public mailto — unchanged), landing routes, publication/share/collaboration routes, all `/api/*` handlers. No new route handlers are created (Server Actions only).

## Revalidation summary

| Surface | Primitive | When |
|---|---|---|
| Operator status update | `revalidatePath("/workshop/settings/feedback")` | after `updateBetaFeedbackReviewStatus` (existing) |
| Reporter submit (redirect) | none (PRG) | n/a |
| Reporter submit (inline) | none (`useActionState`) | n/a |
| SLA badge (new) | none (derived server-side per render) | n/a |

## Core Web Vitals posture (LCP/INP/CLS)

| Metric | Baseline | Budget | Risk | Measurement |
|---|---|---|---|---|
| LCP (`/workshop/feedback`) | current (not measured) | no regression | low — copy/a11y edits only; no new fetch | local route probe (`cf:verify-preview-routes`) or manual; field data via `useReportWebVitals` if wired |
| LCP (`/workshop/settings/feedback`) | current | no regression | low — pagination keeps page-1 identical to today's first-50 render | same |
| INP (inline submit) | current | +<50ms p95 | **medium** — notify `await Promise.race` with 2s cap; focus-move on state change | focused DOM test + manual; the 2s notify cap bounds INP impact |
| CLS (queue SLA badge) | current | 0 new layout shift | **medium** — badges appearing per-row could shift the table if not sized; **mitigation**: reserve badge cell width (fixed `min-w`) so the row doesn't reflow when the badge renders | static review + DOM test asserting stable cell width; browser proof only if CLS regression is observed |
| CLS (focus move on inline ack) | current | acceptable | low — moving focus to the output does not shift layout (output replaces empty region) | DOM test |

**Note on field data:** no field CWV source is wired for the workshop area (`CloudflareWebAnalytics` covers public pages only — `03` §H). Lab data via `cf:verify-hosted-performance` (`scripts/verify-cloudflare-hosted-performance.ts`) is the available proxy; state it as lab, not field. If the owner wants field CWV, that is a separate instrumentation task (out of scope).

## Performance — authenticated-route measurement setup

The two budgets that are authenticated-route claims (inline submit p95, queue render) need an auth/session setup to measure:

| Budget | Auth/session setup | Measurement command | Statistic |
|---|---|---|---|
| Inline submit p95 | seed a closed-beta test user (`bun run cf:d1-closed-beta-proof` adds allowlist evidence) + authenticated session cookie in the test harness | focused `vitest` with a mocked auth context (the existing `beta-feedback-form-ui.test.tsx` pattern uses `useActionState` with a mocked action) | p95 of the action's resolve time over 20 runs; notify path mocked to its real `Promise.race` cap |
| Queue render | same test user + a seeded queue (10/100/1000 rows) | `cf:verify-hosted-performance` against the preview route, or a focused render-perf test | p95 render time; record at 50/500/1000 rows |

If the owner declines to wire hosted performance measurement, these budgets are **lab/inferred only** and the residual risk is recorded (per the verification policy, do not claim field proof from local checks).
