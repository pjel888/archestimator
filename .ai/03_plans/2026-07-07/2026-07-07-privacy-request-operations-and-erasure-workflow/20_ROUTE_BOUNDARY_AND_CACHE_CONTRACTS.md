# 20 — Route Boundary And Cache Contracts

> *(Improvement pass, 2026-07-07.)* Created to close the directive's route-specific App Router boundary/cache-contract gate. Every affected route is named at the **route-file** level, classified under the current Next.js model, and given an explicit revalidation decision.

## Framework ground truth (verified from repo, not memory)

- **Versions** (`package.json`, verified): `next` 16.2.10, `react` 19.2.7, `react-dom` 19.2.7.
- **`cacheComponents` is NOT enabled.** `next.config.ts` has no `cacheComponents` key (only `experimental.optimizePackageImports` + `experimental.staleTimes: { dynamic: 60, static: 180 }`). There is no `use cache` / `cacheLife` / `cacheTag` boundary anywhere in this plan's scope.
- **Cache model in force:** the **legacy fetch-cache / segment-cache model** (Next 14/15-style), not the Cache Components model. The directive's Cache-Components-specific gates (classify static/dynamic/partial under that model, name `use cache` boundaries, prove no-store for token-bearing surfaces under that model) therefore reduce to: **every route here opts out of caching via `export const dynamic = "force-dynamic"` + `Cache-Control: no-store`**, which is the correct and sufficient posture for privacy/token-bearing surfaces.
- **Local docs evidence path (for the executor to re-read before framework-sensitive edits):** `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` and `.../migrating-to-cache-components.md`. Since `cacheComponents` is off, the "without cache components" guide is authoritative.
- **Mutation convention (verified):** the repo uses **Server Actions** (`"use server"`, `formData`), not Route Handler POST, for operator mutations — see `src/lib/auth/beta-allowlist-admin-actions.ts` (`"use server"` line 1; `createClosedBetaAllowlistEntry(formData)`, `updateClosedBetaAllowlistEntry(formData)`; `requireCurrentUserContext()` + role check + `revalidatePath` + `redirect`). This plan matches that convention.

## Route-by-route contract

Legend — `Type`: RH = Route Handler, SA = Server Action, SC = Server Component page. `Render`: D = dynamic (force-dynamic). `ReqAPI`: request-time API used. `Reval`: revalidation primitive. `Auth`: who may call. `no-store proof`: how cache-elision is guaranteed.

| # | Route file (repo-relative, proposed) | Type | Render | ReqAPI | Reval | Auth | no-store proof | Token-bearing? |
|---|---|---|---|---|---|---|---|---|
| R1 | `src/app/api/compliance/privacy-requests/route.ts` (POST, exists; add rate-limit + session branch) | RH | D | `request.json`, `request.headers` (cf-connecting-ip, user-agent) | none (write) | anonymous-or-session; rate-limited | `dynamic="force-dynamic"` (exists line 9) + `Cache-Control: no-store` (exists `NO_STORE`) | no (no token returned; only `id`) |
| R2 | `src/app/api/compliance/privacy-requests/[id]/status/route.ts` (GET, new — requester lookup) | RH | D | `searchParams` (`id`, `token`) | none (read) | token-bearer (request-id-bound lookup token) | `dynamic="force-dynamic"` + `no-store` + `Referrer-Policy: no-referrer` on the response (mitigate URL-token leakage into Referer) | **YES** — token in URL query; see `21` §token-leakage mitigations |
| R3 | `src/app/workshop/settings/privacy-requests/page.tsx` (SC, new — operator queue) | SC | D | `cookies()` (session via `getCurrentUserContext`) | none (read; refetch on action via TanStack Query invalidate) | `isPlatformAdminRole` (server-side) | `dynamic="force-dynamic"`; session-scoped → not shareable | no |
| R4 | `src/app/workshop/settings/privacy-requests/[id]/page.tsx` (SC, new — operator detail) | SC | D | `cookies()`, `params.id` | none (read; invalidate after transition) | `isPlatformAdminRole` | `dynamic="force-dynamic"` | no |
| R5 | `verifyPrivacyRequest(formData)` Server Action (new — in `src/lib/compliance/privacy-request-actions.ts`, `"use server"`) | SA | n/a | `formData` (`requestId`, `token`) | `revalidatePath` not needed (mutates a D1 row; queue reads are no-store) | token-bearer (verify token) | n/a (mutation) | **YES** — token in `formData` body, never URL |
| R6 | `transitionPrivacyRequest(formData)` Server Action (new) | SA | n/a | `formData` (`requestId`, `to`, `note?`) | `revalidatePath("/workshop/settings/privacy-requests")` + `revalidatePath(".../[id]")` after success | `isPlatformAdminRole` | n/a | no |
| R7 | `appendPrivacyRequestNote(formData)` Server Action (new) | SA | n/a | `formData` (`requestId`, `note`) | `revalidatePath` detail | `isPlatformAdminRole` | n/a | no |
| R8 | `generatePrivacyExport(formData)` Server Action (new, P2) | SA | n/a | `formData` (`requestId`) | `revalidatePath` detail | `isPlatformAdminRole` | n/a | no |
| R9 | `privacyErasureDryRun(formData)` Server Action (new, P3) | SA | n/a | `formData` (`requestId`) | none (read-only) | `isPlatformAdminRole` | n/a | no |
| R10 | `privacyErasureConfirm(formData)` Server Action (new, P3) | SA | n/a | `formData` (`requestId`, `dryRunToken`) | `revalidatePath` detail | `isPlatformAdminRole` + re-auth | n/a | no |
| R11 | `slaBreachCheck` (cron slice in `worker.ts`, P4, gated) | cron | n/a | n/a | none | system (no user) | n/a | no |

## Cache / freshness decisions (consolidated)

1. **No `use cache` / `cacheTag` / `cacheLife` is introduced.** Correct for this plan: `cacheComponents` is off, and every surface is privacy/token/session-bearing → must be no-store.
2. **All operator/read surfaces are `dynamic="force-dynamic"` + `no-store`.** No stale cache; no cross-operator leakage. Read-your-writes is satisfied because reads are no-store (always fresh from D1) and TanStack Query invalidation refreshes the client after a mutation.
3. **R2 (status lookup) is the only URL-token surface.** Mitigations: (a) `Referrer-Policy: no-refurer` on the response + a `<meta name="referrer" content="no-referrer">` if a page renders; (b) token is single-use, 24h TTL, request-id-bound (see `21`); (c) logs redact query params (existing app-error redaction); (d) the lookup returns only `{ status, updatedAt }` — never personal data — so URL leakage exposes only a status string, not PII.
4. **No revalidation across users.** `revalidatePath` on operator paths only; never a tag-based broadcast that could leak across tenants.
5. **Server Components do not call internal Route Handlers.** R3/R4 call the repository directly (`listPrivacyRequests`/`getById`) — avoiding the anti-pattern.

## URL-state / pagination semantics (R3 queue)

- The queue uses **offset pagination** (`?status=&limit=&offset=`) and is **not claimed to be shareable**. Offset pagination is non-reproducible under inserts (rows shift), so the URL is treated as **transient navigation state**, not a shareable canonical link.
- **State owner:** the filter/offset lives in URL search params for back/forward usability, but the **authoritative list** is always a fresh no-store read. If a user shares a queue URL, the recipient sees the *current* queue at that offset (not the sender's snapshot) — acceptable for an operator-only surface, and the operator must be authorized to see any row regardless.
- A cursor alternative was rejected (YAGNI at closed-beta volume; offset is simpler and the non-reproducibility is acceptable for an internal operator queue).

## Cache-Components-specific gate (directive §10 lines 631–651)

- `cacheComponents` is **off** (verified). The directive's Cache-Components gates therefore do not apply to this plan. If the project later enables `cacheComponents`, the executor must re-run this analysis: every route here must remain no-store (token/session/PII-bearing), which under Cache Components requires explicit `cacheLife('0')`/no-`use cache` discipline. This is recorded as a **stale-plan revalidation trigger** in the README checklist.
