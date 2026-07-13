# 23 — Route Boundary and Cache Contract

Required by `Improve-Plan-Prompt.md` §4: every affected App Router route needs an exact route-boundary, rendering, cache-finalization, and revalidation decision. This was a P1 gap in `06`/`18` (asserted "no `use cache`" without first verifying Cache Components status).

---

## Cache Components status — VERIFIED this audit

| Check | Result | Evidence |
|---|---|---|
| `next.config.ts` `experimental.cacheComponents` flag | **NOT present** | `next.config.ts` `experimental` key inspected; no `cacheComponents` boolean |
| Next.js version | 16.2.10 | `package.json` |
| Local doc consulted | `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` exists | local docs tree |
| Revalidation primitive in scope | `revalidatePath` (NOT cache tags) | `src/lib/publication/actions.ts:4,739,741` |

**Conclusion:** This project runs the **default (non-Cache-Components) caching model**. Under that model, `fetch` requests are **not cached by default** (no-store), and the active revalidation primitive in the publication surface is **`revalidatePath`** (`actions.ts:739,741`), invoked after mutations. There are **no `use cache`/`cacheLife`/`cacheTag` boundaries** anywhere in `src/app/workshop/publisher/`, `src/lib/publication/`, or `src/lib/publisher/` (grep confirmed). The Improve-Plan's Cache-Components sub-requirements (name every `use cache` boundary, prove token-bearing responses default to no-store under CC) are therefore **not applicable** — they apply only when Cache Components is enabled. Cited local doc path: `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.

---

## Affected route: `/workshop/publisher` (the only in-scope route)

| Dimension | Decision | Evidence |
|---|---|---|
| Route files | `src/app/workshop/publisher/page.tsx` (RSC); `src/app/workshop/publisher/error.tsx` (boundary) | repo |
| Rendering | **Dynamic** — `PublisherPage` awaits `searchParams` (`page.tsx:13,17,36`); `requireCurrentUserContext` reads `headers()` (`session.ts:54`); drawer action reads `cookies()` (`actions.ts:361`). All three opt the route into dynamic rendering under the default model. | repo |
| Server-owned data | roster (`readWorkspacePublicationsRoster` in RSC), drawer data (`readPublisherPublicationDrawerData`), all mutations (Server Actions) | repo |
| Props crossing into Client Components | `roster` + `filters` (plain serializable DTOs; **no raw recipient tokens, no secrets**). `clientLinkPath` is redacted for viewers before it ever reaches the client. | `03`, `07` |
| Client cache owner | TanStack Query **only** for the drawer (`publisherRosterQueryKeys.drawer(projectId)`, `staleTime 10s`); roster is RSC + `router.refresh()`. No Zustand. | `usePublisherDrawer.ts` |
| `"use client"` boundary | minimal: `PublisherRosterClient`, `PublisherDrawer`, `RecipientEmailComposer`. This pack does not widen it. | repo |
| Mutation revalidation | `refreshPublisherSurface` → invalidate `publisherRosterQueryKeys.all` + drawer key + `router.refresh()` (TanStack side); Server Actions call `revalidatePath('/workshop/projects/${projectId}')` and `revalidatePath(clientLinkPath)` (`actions.ts:739,741`). | repo |
| Read-your-own-writes | preserved: `onSuccess` invalidation + `router.refresh()` + `revalidatePath`. | repo |
| Dynamic-rendering implication of Option B | Option B keeps the CSS 768px guard and adds a copy-URL button + help text → **no new request-time API**, **no new dynamic driver**, **no cache change**. | `11` Task 1.1 |
| Cache-finalization | no `cache()`/`unstable_cache`/`use cache` in scope; mutations finalize via `revalidatePath`. | grep |
| Token-bearing response privacy | the route is authenticated/dynamic → responses are private by default (no static caching of authed content). The **public** share route (`/share/[token]`) is a different route owned by the share packs and explicitly returns no-store headers (out of scope here). | repo |
| Hydration risk | low — Option B adds a button + string; no unstable render inputs. Existing `readDrawerIntent` is deterministic from URL params. | `06` |
| Error/loading/not-found | `error.tsx` boundary; `PublisherRosterSkeleton` + Suspense ×2; not-found inherits app default. | repo |
| Metadata | page uses `WorkshopPageShell` title/eyebrow; no metadata change in this pack. | repo |

## Other touched routes (none)
- This pack touches **no other route**. The public `/share/[token]` and `/api/share/[token]/*` routes are owned by sibling packs and are audit-only here (`22`).

## Verification of route contract (for the verifier)
- Re-confirm before implementation: `grep -n "cacheComponents" next.config.ts` (expect none); `grep -nE "revalidatePath|use cache|cacheTag" src/lib/publication/actions.ts` (expect `revalidatePath` at `:739,741`, no `use cache`/`cacheTag`).
- This contract is consistent with `06` (corrected) and `18` (corrected).
