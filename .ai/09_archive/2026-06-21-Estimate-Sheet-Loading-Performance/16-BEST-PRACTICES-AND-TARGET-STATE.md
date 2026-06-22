# 16 — Best Practices & Target State (L7)

**Status:** COMPLETE
**Lane:** L7 (Best practices + target state)
**Scope:** Canonical Next.js App Router loading/streaming/PPR/prefetch guidance
+ repo-internal precedents, mapped 1:1 to the Estimate Sheet cascade findings.
READ-ONLY on `src/`.
**Date:** 2026-06-21

> Companion to: `10` (cascade inventory), `11` (server waterfall),
> `12` (layouts/caching), `13` (client hydration), `14` (blast radius),
> `15` (measurements). This doc is **normative-target**: what "good" looks
> like and how to get there, not a re-audit.

---

## 1. Canonical App Router loading patterns (with sources)

### 1.1 `loading.tsx` is segment-scoped AND segment-creating

Every `loading.tsx` file wraps its sibling `page.tsx` (and everything below) in
an **implicit `<Suspense>` boundary**. The boundary lives *between* the
segment's `layout.tsx` and its `page.tsx` — i.e. it does **not** wrap the
layout itself. Source: [Next.js `loading.js` reference](https://nextjs.org/docs/app/api-reference/file-conventions/loading) ("In the component hierarchy, `loading.js` wraps `not-found.js`, `page.js`, and nested `layout.js` files in a `<Suspense>` boundary. It does **not** wrap the `layout.js`, `template.js`, or `error.js` in the same segment.").

**Granularity rule of thumb** (synthesized from the official reference + the
[Streaming guide](https://nextjs.org/learn/dashboard-app/streaming) + [ Loading UI and Streaming (v14)](https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming)):

| When to ADD a `loading.tsx` | When to NOT add one |
|---|---|
| A user-perceivable "new screen" begins at this segment (the route below is meaningfully different in shape/content from the parent). | The segment is a thin pass-through whose content shape is identical to the parent — a `loading.tsx` there just stacks another skeleton flash for no information gain. |
| The segment's page does slow/uncached work you want to stream separately. | The parent's `loading.tsx` already shows an adequate fallback and the nested page resolves fast. |
| You want the layout shell to stay mounted while only the segment content swaps. | You'd be forced to invent a fake skeleton that doesn't match the real page (→ CLS / mismatch — see §1.6). |

### 1.2 Why stacking nested `loading.tsx` causes a cascade

Each `loading.tsx` creates an **independent Suspense boundary**. On a navigation
into a deeper segment, Next.js shows the **deepest applicable** fallback for the
*new* segment; but on first render / hard reload, the framework streams the
outer boundaries first and inner ones paint their fallback while their own
`page.tsx` awaits resolve. If multiple awaits are each gated behind their own
boundary, the user sees a **sequence of skeletons** (outermost → innermost) as
each boundary resolves, rather than one skeleton swapping to real content.

The Next.js guidance is explicit about this risk in the "Good to know" note of
the `loading.js` reference:
> "If the layout accesses uncached or runtime data (e.g. `cookies()`, `headers()`, or uncached fetches), `loading.js` will not show a fallback for it. **Without Cache Components: Navigation blocks until the layout finishes rendering.**"

This is the **exact** situation on the sheet path:
`src/app/workshop/layout.tsx:18,25,28` calls `await headers()` + `await getCurrentUserContext()` + `await getCurrentUserTermsAcceptanceStatus()` — three
sequential awaits in an auth-gated layout that reads `cookies()`/`headers()`.
Per the doc, **no `loading.tsx` in the workshop subtree can paint a fallback
while that layout is pending**; navigation blocks until it resolves. Then the
project layout's own await (`[projectId]/layout.tsx:22` `getCurrentWorkspaceProject`) blocks again.

Sources:
- [Next.js `loading.js` reference — "Good to know" caveat on uncached layouts](https://nextjs.org/docs/app/api-reference/file-conventions/loading)
- [Next.js `layout.js` Caveats](https://nextjs.org/docs/app/api-reference/file-conventions/layout) (referenced from the loading.js caveat)
- [Streaming — Next.js Learn](https://nextjs.org/learn/dashboard-app/streaming)

### 1.3 Streaming: move slow fetches BEHIND `<Suspense>`, not into the page await

The canonical pattern (Next.js official [Streaming lesson](https://nextjs.org/learn/dashboard-app/streaming) + [Fetching Data guide](https://nextjs.org/docs/app/getting-started/fetching-data)):

> "it's good practice to **move your data fetches down to the [components that need them]**" and wrap those components in Suspense boundaries, so the rest of the page can be streamed and painted immediately.

Mechanically: the page returns its JSX **without awaiting** the slow fetch.
The slow fetch lives in a child async Server Component, wrapped in
`<Suspense fallback={…}>`. The shell streams first; the wrapped chunk resolves
and swaps in when its data is ready. Two independent wrapped chunks resolve
**in parallel** (not in sequence) because the framework streams them as
independent Suspense gaps.

This pattern is already in the repo: `src/components/workshop/ProjectChromeAsync.tsx:26-37`
does a 3-way `Promise.all` of collaboration/publication/sheets summaries, and
`src/app/workshop/projects/[projectId]/layout.tsx:42-44` wraps it in
`<Suspense fallback={<ProjectHeaderChromeSkeleton />}>` so the shell paints
first. **This is the in-house precedent to copy for the sheet's tail.**

Sources:
- [Next.js Streaming lesson (Learn)](https://nextjs.org/learn/dashboard-app/streaming) — the "move fetches down" quote
- [Next.js Fetching Data guide](https://nextjs.org/docs/app/getting-started/fetching-data) — "stream components that depend on uncached (slow) data fetches"
- [Data Fetching in 2025: Streaming, Suspense, and Deferred Fetching (Medium)](https://medium.com/better-dev-nextjs-react/data-fetching-in-2025-streaming-suspense-and-deferred-fetching-in-next-js-app-router-d0658f2d835d)

### 1.4 `next/link` prefetch — viewport by default, `false` + manual on hover/focus

App Router default (`prefetch={null}` / omitted): when a `<Link>` enters the
viewport, Next.js **prefetches the full route** for both static and dynamic
pages (a behavior change from the Pages Router). `prefetch={true}` forces it
even outside viewport; `prefetch={false}` disables **both** viewport and hover
prefetch in the App Router (Pages Router kept hover prefetch).

Sources: [Next.js Link API reference](https://nextjs.org/docs/app/api-reference/components/link), [Next.js Prefetching guide](https://nextjs.org/docs/app/guides/prefetching).

**Repo precedent (in-house, sophisticated):** the sheet link is rendered with
`prefetch={false}` + a debounced hover/focus prefetch via a custom hook:
- `src/components/workshop/ProjectEstimatesTable.tsx:490` — `<Link href={estimateHref} prefetch={false} onMouseEnter={…} onFocus={…} …>` for the "open estimate" action.
- `src/hooks/use-prefetch-on-hover.ts:24-78` — 150 ms debounce, calls `router.prefetch(href)` only after a dwell, and can warm TanStack Query caches alongside.
- Same pattern in `ProjectDashboardClient.tsx:149`, `LiveProjectCard.tsx:336/513/589/659/743`.

This is **better than the default** for a heavy dynamic sheet: it avoids
eagerly prefetching every sheet link in a scrolled list, and warms the route
only on intent. **The sheet IS prefetched on hover/focus already** — the
skeleton cascade is therefore visible primarily on cold loads / hard reload /
direct-URL entry, not on click-from-list. (L6 measurements will confirm.)

### 1.5 Parallel fetching + React `cache()` + `generateMetadata`

- **`Promise.all` for independent fetches** — the in-house pattern is a 5-way
  `Promise.all` tail in `src/app/workshop/projects/[projectId]/estimates/page.tsx:24-33`
  (favorites + edit-capabilities + current-user + workspace + sidebar-favorites),
  and a 4-way tail in `[projectId]/page.tsx:49-57`. The **sheet page already
  does this** for its first block
  (`estimates/[nodeId]/page.tsx:36-41`: route-context + current-user in
  parallel) and its tail
  (`estimates/[nodeId]/page.tsx:64-71`: tabs + edit-capability in parallel).
  The cascade is NOT a parallelization bug — it's that the two blocks are
  **sequential** (tail depends on `estimate.id` from the first block, see
  comment at `page.tsx:60-62`). See §3 for the target.
- **`React.cache()`** — request-scoped memoization. The repo already wraps the
  hot paths: `getCurrentUserContext` (`src/lib/auth/session.ts:31`), `getCurrentWorkspaceProject` (`workspace-repository.ts:1733`),
  `ensureDefaultWorkspace` (`:822`), `getCachedProjectMembers` (`:1766`),
  `getProjectPublicationSummary` (`:1927`), `listMainSidebarFavoriteProjects`
  (`:1649`), `listCurrentWorkspaceProjects` (`:883`). This is why the second
  `Promise.all` block on the sheet path (and `ProjectChromeAsync`) doesn't
  re-fetch the user or project. **Already in compliance; preserve it.**
  Sources: [React `cache` reference](https://react.dev/reference/react/cache),
  [Next.js Caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components),
  [Deduping and caching discussion #52069](https://github.com/vercel/next.js/issues/52069).
- **`generateMetadata`** — none on the sheet path
  (`grep generateMetadata src/app/workshop/projects/[projectId]/estimates/` →
  no matches). **Good** — there's no metadata-fetch blocking render to fix
  here. If one is added later, wrap its fetch in `cache()` so it dedupes with
  the page's fetch.

### 1.6 Skeleton best practice — mirror the REAL page

From [Nielsen Norman Group — Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/):
a skeleton screen is a wireframe-like visual that **mimics the layout of the
actual content**. From [UX Collective — Everything you should know about skeleton screens](https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a):
skeletons **should not block gradual content loads** — real content replaces
the skeleton immediately as data arrives. From [Hashnode — Skeleton Screens vs Loading Screens](https://danielnzau.hashnode.dev/enhancing-user-experience-skeleton-screens-vs-loading-screens):
> "There should be **no change in position, size, or type of content** on the UI after the content is done loading."

**Violation on the sheet path:** `src/app/workshop/projects/[projectId]/estimates/loading.tsx:1-5`
renders `<ProjectEstimatesListSkeleton />` — a 12-row × 8-column **list** grid
(`ProjectEstimatesListSkeleton.tsx:7-8,30-43`). The actual page at
`estimates/[nodeId]/page.tsx` is a **single-sheet workspace**
(`EstimateWorkspaceClient` with a tree, tabs, glass sheet — not a list table at
all). This is the mismatched-list-skeleton-for-sheet symptom the owner
reported. The shape, size, AND type all change on swap.

**In-house good precedent to copy:**
- `src/app/workshop/loading.tsx` (Workshop dashboard) — reuses the **same
  `dashboard-root` / `dashboard-imageband` / `iband-*` classes** as the real
  hydrated page so the skeleton inherits every responsive reflow with "zero
  layout shift against the hydrated page" (header comment, `loading.tsx:4-11`).
- `src/app/workshop/library/templates/[templateId]/loading.tsx` — mirrors the
  template editor (264 px sidebar + main column).
- `src/app/share/[token]/loading.tsx` — mirrors the proposal review (header +
  stat grid + 280 px rail + main column).
- `src/app/workshop/projects/[projectId]/data/loading.tsx` — mirrors the
  comparison board grid columns.
- `ProjectHeaderChromeSkeleton` (`ProjectChromeAsync.tsx:90-104`) — the
  fallback **deliberately mirrors the resolved chrome's outer shape** ("MUST
  mirror the resolved chrome's outer shape: a single `flex items-center gap-1`
  wrapper holding the toolbar's icon buttons") so the streaming swap doesn't
  shift siblings or cause a hydration mismatch. This is gold-standard.

---

## 2. PPR — status + applicability verdict

### Status (as of mid-2026)

**PPR is stable as of Next.js 16 (October 2025)**, exposed via the new
**Cache Components** architecture. Enabled with `cacheComponents: true` in
`next.config.js`, which makes PPR the default App Router behavior.

Sources:
- [Next.js 16 blog post](https://nextjs.org/blog/next-16)
- [Next.js `cacheComponents` config reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [Getting Started: Partial Prerendering](https://nextjs.org/docs/15/app/getting-started/partial-prerendering)
- [PPR Platform Guide](https://nextjs.org/docs/app/guides/ppr-platform-guide)
- [Mastercard Dynamic Yield — Next.js 16 PPR](https://dy.dev/page/articles-nextjs-16-ppr)
- [Next.js 16 Cache Components (Mohit Singh, Medium)](https://mohit-singh.medium.com/next-js-16-cache-components-46aed47c73f2)

Under Cache Components:
- A route's **static shell** is prerendered at build time.
- Uncached/runtime data (cookies, headers, per-request DB reads) is
  automatically wrapped in **dynamic boundaries** that stream in.
- Build-time errors **guide** you to wrap runtime access in `<Suspense>` —
  this is the enforcement mechanism for the §1.2 caveat about layouts that
  read `cookies()`/`headers()`.

### Applicability verdict for THIS auth-gated sheet route

**UNVERIFIED — needs a Next.js 16 upgrade decision before pursuing.** Reasoning:

| Factor | Verdict |
|---|---|
| Is PPR stable enough to ship? | Yes (Next.16, Oct 2025) — **not** a blocker on stability grounds. |
| Does this repo run Next.js 16? | **UNVERIFIED** — audit does not include a `package.json` version read. The other lanes should confirm `next` ≥ 16 before any PPR recommendation is actionable. If the repo is still on 15.x, PPR stays experimental and is OUT OF SCOPE for a near-term fix. |
| Does PPR fit an **auth-gated** route? | Yes, partially. The static shell (Workshop chrome, project header skeleton slots, glass sheet scaffold) can prerender; the auth/user-specific data (current user, project, estimate tree, tabs) streams in as dynamic gaps. PPR was designed for exactly this split. |
| What does it require? | (a) `cacheComponents: true` in `next.config.js`; (b) every `cookies()` / `headers()` / per-request read in a layout must be explicitly wrapped in `<Suspense>` (build fails otherwise); (c) audit of every `unstable_cache` / `fetch` cache option on the path, because Cache Components changes the default caching semantics. This is a **repo-wide migration**, not a sheet-only change. |
| Is PPR the right LEVER for the reported symptom? | **No, not as the first lever.** The owner's symptom ("all the loading skeleton of all the pages before I get to the estimate sheet is being shown") is primarily a **skeleton-cascade + mismatched-skeleton** problem (§1.2 + §1.6) plus a **two-block server waterfall** (§3). PPR would help the static shell, but the dominant fix is (a) collapse redundant nested `loading.tsx`, (b) add a sheet-mirroring `[nodeId]/loading.tsx`, (c) move the tabs/edit-capability tail behind a Suspense boundary. PPR is a Phase-2 / stretch goal, not Phase-1. |

**Recommendation:** defer PPR to a separate, repo-wide upgrade plan pack.
Record it in the roadmap as a **Phase 3 (stretch)** item gated on (1) Next.js
16 upgrade decision, (2) blast-radius audit of Cache Components' changed
caching defaults. **Do not** block the sheet fix on PPR.

---

## 3. Streaming/Suspense pattern recommendation — concrete to our page

### 3.1 The sheet page's current 2-block waterfall

`src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`:

```
Block 1 (lines 36-41): Promise.all([
    resolveEstimateTabRouteContext(...),  // → project, estimate, tree, tab, tabs, loadLimitState
    requireCurrentUserContext(),
])
    ↓ await (cannot start Block 2 until this resolves — needs estimate.id)
Block 2 (lines 64-71): Promise.all([
    getEstimateTabs(project.id, estimate.id)  (or reuse tabs from Block 1),
    resolveEstimateEditCapability(estimate.id),
])
    ↓ await
return <EstimateWorkspaceClient ... />
```

The page `await`s **both** blocks before returning any JSX, so the entire
sheet is gated behind the slower of the two sequential blocks. The
in-code comment at `page.tsx:58-63` acknowledges the tail "adds no new
sequential first-paint hop" because `estimate.id` is only known after Block 1.

### 3.2 Target: split Block 2 behind a Suspense boundary

The tabs and edit-capability are consumed by **different leaves** of the sheet
than the tree/metadata. Move them into a child async Server Component wrapped
in `<Suspense>`:

```
// Pseudocode for the target shape (NOT a source edit — illustrative)
export default async function ProjectEstimateNodePage({ params }) {
  const { projectId, nodeId } = await params;
  // Block 1 stays: it gates notFound() + the shell props (project, estimate, tree).
  const [estimateTreeResult, currentUser] = await Promise.all([...]);
  if (!estimate?.id) notFound();

  return (
    <>
      <ProjectEstimateMetadataPublisher metadata={baseMetadata} />
      <EstimateWorkspaceClient
        /* all Block-1 props */
        estimateTabs={null}           // streamed-in slot
        activeTabId={null}
        canEditEstimate={false}       // conservative default until resolved
        ...
      >
        <Suspense fallback={<EstimateTabsSkeleton canEdit={false} />}>
          <EstimateTabsAsync projectId={project.id} estimateId={estimate.id} initialTabs={tabs} />
        </Suspense>
      </EstimateWorkspaceClient>
    </>
  );
}
```

**Why this works:**
- First paint returns after Block 1 only — the glass sheet scaffold + tree
  paint immediately with `tabs=null` / `canEdit=false` (already-tolerated
  states on the legacy/no-tab path, per `page.tsx:67-69`).
- Block 2 (tabs + edit-capability) resolves in parallel with the client
  hydration of the sheet, then streams in. **No new sequential hop** for the
  parts of the sheet the user actually looks at first.
- The sheet body is **not** behind a Suspense gap, so the streamed HTML is
  complete (not a gap-then-pop) for the primary content.

**Constraints to honor** (so this doesn't regress):
- `EstimateTabsAsync` must be a **single wrapper** mirroring its fallback's
  node count — copy the discipline of `ProjectHeaderChromeSkeleton`
  (`ProjectChromeAsync.tsx:81-104`) to avoid CLS and hydration mismatch on the
  streaming swap.
- The fallback must mirror the real tabs UI shape (skeleton tabs + disabled
  edit affordance), per §1.6.
- `resolveEstimateEditCapability` already returns `false` on the no-tab path
  (`page.tsx:69`), so the conservative `canEditEstimate={false}` default is
  semantically safe.
- Verify the TanStack Query cache on the client doesn't separately fetch
  tabs — if it does, the server-streamed tabs would race the client fetch.
  Cross-check with L4 (client hydration).

Sources: [Next.js Streaming lesson](https://nextjs.org/learn/dashboard-app/streaming),
[Next.js Fetching Data guide](https://nextjs.org/docs/app/getting-started/fetching-data).

---

## 4. Prefetch opportunities

### 4.1 What's already good

- The sheet link from the estimates list uses `prefetch={false}` + hover/focus-debounced `router.prefetch`
  (`ProjectEstimatesTable.tsx:490-494`, `use-prefetch-on-hover.ts`). This is
  best-in-class for a heavy dynamic route. **Do not change.**
- The project dashboard's "continue" cards use the same pattern
  (`LiveProjectCard.tsx`, `ProjectDashboardClient.tsx:149`).

### 4.2 Gaps to consider

| Surface | Current | Opportunity |
|---|---|---|
| In-sheet navigation between tabs / nodes (if the client router navigates child routes) | UNVERIFIED whether sheet-internal nav uses `<Link>` or programmatic `router.push`. | If it uses `<Link>` to another `[nodeId]`, ensure each uses the same `prefetch={false}` + hover pattern (or `prefetch={true}` if the next-node is highly predictable). Cross-check with L4. |
| `next/link` default prefetch for sheet links anywhere else | UNVERIFIED — grep shows `prefetch={false}` on the known entry points, but other links into the sheet (e.g. from a shared "open in app" surface) may default to viewport prefetch. | Audit all `<Link href*="/estimates/">` across `src/` for prefetch consistency. |
| `router.prefetch` on the **cold** first-visit path | N/A — prefetch only helps warm navigations. | The cascade is worst on cold load (direct URL / reload). Prefetch does not help that case; §3 and §5 do. |

Sources: [Next.js Link reference](https://nextjs.org/docs/app/api-reference/components/link),
[Prefetching guide](https://nextjs.org/docs/app/guides/prefetching).

---

## 5. Repo precedents — what works well here (reuse) and what others do better

### 5.1 Reuse these (in-house, already battle-tested)

| Pattern | Where | Steal-it-for |
|---|---|---|
| Move slow fan-out behind `<Suspense>` in the layout | `src/app/workshop/projects/[projectId]/layout.tsx:42-44` (`ProjectChromeAsync` in `<Suspense fallback={<ProjectHeaderChromeSkeleton />}>`) + `:51` (children in `<Suspense fallback={<ProjectRouteContentFallback />}>`) | The sheet page's tabs/edit-capability tail (§3.2). |
| Fallback MIRRORS resolved chrome — same node count, same wrapper class | `ProjectChromeAsync.tsx:81-104` ("MUST mirror the resolved chrome's outer shape") | Any new `[nodeId]/loading.tsx` and any new in-sheet Suspense fallback (§1.6). |
| Skeleton reuses the real page's CSS classes verbatim (zero CLS, inherits responsive reflow) | `src/app/workshop/loading.tsx:4-11` ("skeleton inherits every responsive reflow … for free and lands with zero layout shift"), `library/loading.tsx:3-7` ("Shape mirrors LibraryOverview … No right rail, so the skeleton does not shift layout when real content paints (CLS ~0)") | `[nodeId]/loading.tsx` must reuse `EstimateWorkspaceClient`'s shell classes — NOT invent a new shape. |
| 5-way `Promise.all` tail in a list page | `src/app/workshop/projects/[projectId]/estimates/page.tsx:24-33` | The sheet page already does 2-way + 2-way; the lesson is "batch all independent post-`notFound` fetches into one `Promise.all`." |
| `React.cache()` on every request-scoped read | `session.ts:31`, `workspace-repository.ts:822/883/1649/1733/1766/1927` | Already applied to the sheet's hot reads. **Preserve** — do not regress when refactoring. |
| `withPerfTraceRequest` + `traced` wraps every `Promise.all` | `estimates/[nodeId]/page.tsx:36,64`, `estimates/page.tsx:17,25`, `[projectId]/page.tsx:50` | Any new async chunk introduced by §3.2 must be wrapped in `traced(…)` for L6 measurability. |
| `usePrefetchOnHover` debounced hover/focus prefetch | `src/hooks/use-prefetch-on-hover.ts` | Already on the sheet link entry point. |

### 5.2 What other routes do BETTER than the sheet path

| Better pattern | Where | Sheet-path gap |
|---|---|---|
| A **leaf-segment `loading.tsx` that mirrors the actual page** | `library/templates/[templateId]/loading.tsx` (mirrors template editor sidebar+main), `share/[token]/loading.tsx` (mirrors proposal review header+rail+main), `projects/[projectId]/data/loading.tsx` (mirrors comparison-board grid) | `estimates/[nodeId]/` has **no `loading.tsx`**, so the cascade falls through to `estimates/loading.tsx` which is a **mismatched list** skeleton. **This is the single worst symptom.** Fix: add `estimates/[nodeId]/loading.tsx` mirroring `EstimateWorkspaceClient`'s shell. |
| `loading.tsx` header comment **naming the real component it mirrors** + CLS rationale | `library/loading.tsx:3-7` ("Shape mirrors LibraryOverview"), `workshop/loading.tsx:4-11`, `ProjectEstimatesListSkeleton.tsx:3-6` | The sheet's skeleton (when added) should carry the same provenance comment so the next maintainer doesn't regress. |
| A **single** explicit content `<Suspense>` wrapping children inside the layout | `[projectId]/layout.tsx:51` | The sheet page itself has no in-page Suspense — everything is awaited in the page body. Add one for the tail (§3.2). |

### 5.3 What NO route does yet (and the sheet path shouldn't pioneer here)

- **PPR / Cache Components** — no `cacheComponents: true` in the repo (UNVERIFIED — confirm with `next.config.js` read). PPR is a repo-wide migration; do not introduce it on the sheet route alone. See §2.

---

## 6. Concrete target-state recommendations (mapped 1:1 to findings)

Ordered by blast-radius-to-benefit ratio. Each row is a candidate work item
for the roadmap (doc `05`); the lead sequences them.

| # | Recommendation | Maps to finding | Blast radius | Source / precedent |
|---|---|---|---|---|
| **R1** | **Add `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`** that mirrors `EstimateWorkspaceClient`'s shell (glass scaffold + mini-sidebar + tree + tab strip + sheet body — all skeleton). Reuse the real component's layout classes verbatim. Header comment must name `EstimateWorkspaceClient` and the CLS rationale, per the `library/loading.tsx` precedent. | §1.2 cascade + §1.6 mismatched-list-skeleton-for-sheet (the owner's primary symptom). Currently the sheet falls through to `estimates/loading.tsx` → `ProjectEstimatesListSkeleton` (a 12×8 list grid) — totally wrong shape. | LOW — additive new file; no existing consumer touched. Cite `[nodeId]/error.tsx` (already exists) as the sibling precedent. | §1.1, §1.6, §5.2; `[Next.js loading.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading)` |
| **R2** | **Delete or scope down `src/app/workshop/projects/[projectId]/estimates/loading.tsx`** so it does NOT apply to the `[nodeId]` child. With R1 in place, the `[nodeId]` segment resolves its own `loading.tsx` first, so `estimates/loading.tsx` only fires for `estimates/page.tsx` (the list) — which is what `ProjectEstimatesListSkeleton` is actually for. Verify with L1 that the list page is the only remaining consumer. | §1.2 cascade (one fewer nested fallback in the chain). | LOW-MED — removing the file changes the fallback shown for the `estimates` segment. Must confirm no test snapshots depend on it; cross-check L5 (blast radius). | §1.1, §1.2 |
| **R3** | **Move the Block-2 tail (`getEstimateTabs` + `resolveEstimateEditCapability`) behind an in-page `<Suspense>` boundary** in a child async Server Component, so first paint returns after Block 1 only. Honor the `ProjectHeaderChromeSkeleton` discipline: fallback mirrors resolved shape (single wrapper, same node count) to avoid CLS + hydration mismatch. | §3 server waterfall (eliminate the second sequential await from the critical path). | MED — changes the page's JSX structure and the props contract for `EstimateWorkspaceClient` (must tolerate `estimateTabs={null}` + `canEditEstimate={false}` initially — it already does, per `page.tsx:67-69`). Cross-check L4 (client hydration) for TanStack Query tab-fetch races. | §1.3, §3; `[Next.js Streaming lesson](https://nextjs.org/learn/dashboard-app/streaming)`, `[ProjectChromeAsync.tsx:26-104]` |
| **R4** | **Audit every `<Link>` into `/estimates/[nodeId]/`** for `prefetch={false}` + `usePrefetchOnHover` consistency. The known entry points (`ProjectEstimatesTable`, `LiveProjectCard`, `ProjectDashboardClient`) already do it; verify there are no other sheet-entry surfaces (e.g. "open in app" from share, activity feed deep-links) that default-prefetch. | §4 prefetch — ensures the cascade is only a cold-load problem, not a warm-nav problem. | LOW — read + targeted edits; no layout change. | §1.4, §4; `[Next.js Link reference](https://nextjs.org/docs/app/api-reference/components/link)` |
| **R5** | **Preserve `React.cache()` coverage** on every request-scoped read on the path. Any new helper introduced by R3 must be wrapped in `cache()` if it reads the user/project. Do NOT regress the existing `getCurrentUserContext` / `getCurrentWorkspaceProject` / `ensureDefaultWorkspace` cache boundaries. | §1.5 — the only reason the 2-block waterfall isn't a 4-block one is that Block 2 reuses cached user/project. | NONE if honored; HIGH if regressed (silent extra DB round-trips). | §1.5; `workspace-repository.ts:822/883/1649/1733/1766/1927` |
| **R6 (Phase 2 / stretch)** | **Investigate PPR / Cache Components as a separate repo-wide plan pack**, gated on (a) Next.js 16 upgrade decision, (b) blast-radius audit of Cache Components' changed default caching. **Do NOT** introduce `cacheComponents: true` as part of the sheet fix. | §2 — PPR would prerender the static shell (chrome, header skeleton slots, glass scaffold) and stream the auth-gated data. Long-term win; short-term out of scope. | HIGH (repo-wide). | §2; `[Next.js 16 blog](https://nextjs.org/blog/next-16)`, `[cacheComponents config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)` |
| **R7 (hygiene)** | **Run `traced(…)` around every new async chunk** introduced by R3, and ensure L6 (benchmark) captures `[perf-json]` trace snapshots for both the pre- and post-R3 page so the waterfall reduction is measurable. | §5.1 `withPerfTraceRequest` discipline already followed on the path; preserve it. | NONE. | §5.1; `estimates/[nodeId]/page.tsx:36,64` |

### Conflict surface for the lead to resolve

- **R2 vs L1:** if L1 finds the `estimates/loading.tsx` is intentionally the
  fallback for a transitional state, R2's "delete" becomes "scope with route
  group" instead. Defer to L1's cascade inventory.
- **R3 vs L4:** R3 changes the initial props contract for
  `EstimateWorkspaceClient`. L4 must confirm the client doesn't issue a
  competing TanStack Query fetch for tabs that would race the streamed
  server data. Resolve before sequencing R3.
- **R3 vs the existing comment at `page.tsx:58-63`:** the comment claims the
  tail "adds no new sequential first-paint hop." That's only true **today**
  because the page awaits both blocks; after R3 the tail is literally
  removed from the first-paint critical path, so the comment becomes stale
  and must be updated as part of R3.
- **R6 vs everything:** PPR is orthogonal and must not be bundled with R1-R5.

---

## Sources (consolidated)

### Official Next.js docs
- [loading.js — File-system conventions](https://nextjs.org/docs/app/api-reference/file-conventions/loading) — segment scope, the "Good to know" uncached-layout caveat, streaming trigger mechanics
- [layout.js — File-system conventions](https://nextjs.org/docs/app/api-reference/file-conventions/layout)
- [Link Component](https://nextjs.org/docs/app/api-reference/components/link) — prefetch prop semantics
- [Prefetching guide](https://nextjs.org/docs/app/guides/prefetching)
- [Fetching Data guide](https://nextjs.org/docs/app/getting-started/fetching-data) — "stream components that depend on uncached (slow) data fetches"
- [Streaming — Next.js Learn (Dashboard App)](https://nextjs.org/learn/dashboard-app/streaming) — "move your data fetches down to the components that need them"
- [Caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [Next.js 16 blog](https://nextjs.org/blog/next-16) — PPR stable via Cache Components
- [cacheComponents config reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [Partial Prerendering (getting started)](https://nextjs.org/docs/15/app/getting-started/partial-prerendering)
- [PPR Platform Guide](https://nextjs.org/docs/app/guides/ppr-platform-guide)
- [Loading UI and Streaming (v14)](https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming)

### React
- [React `cache` reference](https://react.dev/reference/react/cache)

### Community / commentary (credibility-tier-2)
- [Next.js Issue #52069 — Deduping and caching](https://github.com/vercel/next.js/issues/52069) — two cache layers
- [Data Fetching in 2025: Streaming, Suspense, and Deferred Fetching (Medium)](https://medium.com/better-dev-nextjs-react/data-fetching-in-2025-streaming-suspense-and-deferred-fetching-in-next-js-app-router-d0658f2d835d)
- [Next.js Loading State Management (Easton Dev, Jan 2026)](https://eastondev.com/blog/en/posts/dev/20260105-nextjs-loading-states/)
- [Why would you use loading.tsx instead of Suspense? (r/nextjs)](https://www.reddit.com/r/nextjs/comments/1gfhmi6/why_would_you_use_loadingtsx_instead_of_suspense/)
- [Mastering Next.js Prefetching (typeofweb)](https://typeofweb.com/nextjs-prefetch-onmouseenter) — App Router prefetches full route for dynamic pages
- [Next.js 16 Cache Components (Mohit Singh, Medium)](https://mohit-singh.medium.com/next-js-16-cache-components-46aed47c73f2)
- [Mastercard Dynamic Yield — Next.js 16 PPR](https://dy.dev/page/articles-nextjs-16-ppr)

### UX / skeleton best practice
- [Nielsen Norman Group — Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/)
- [UX Collective — Everything you should know about skeleton screens](https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a)
- [Hashnode — Skeleton Screens vs Loading Screens](https://danielnzau.hashnode.dev/enhancing-user-experience-skeleton-screens-vs-loading-screens) — "no change in position, size, or type of content"
- [LogRocket — Skeleton loading screen design](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)

### Repo (code citations)
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:36-41,58-71` — the 2-block waterfall
- `src/app/workshop/projects/[projectId]/estimates/loading.tsx:1-5` — mismatched list skeleton (root symptom)
- `src/components/workshop/ProjectEstimatesListSkeleton.tsx:7-8,30-43` — the 12×8 list grid (wrong shape for a sheet)
- `src/app/workshop/projects/[projectId]/layout.tsx:22,42-44,51` — layout await + the two in-layout Suspense boundaries (the precedent)
- `src/app/workshop/layout.tsx:18,25,28` — the three auth-gated layout awaits that block ALL workshop `loading.tsx` from showing a fallback
- `src/components/workshop/ProjectChromeAsync.tsx:26-37,81-104` — the gold-standard "fetch-behind-Suspense + fallback-mirrors-chrome" precedent
- `src/components/workshop/ProjectRouteContentFallback.tsx:3-27` — the children-fallback in the layout
- `src/app/workshop/loading.tsx:4-11`, `src/app/workshop/library/loading.tsx:3-7`, `src/app/workshop/library/templates/[templateId]/loading.tsx`, `src/app/share/[token]/loading.tsx`, `src/app/workshop/projects/[projectId]/data/loading.tsx` — skeleton-mirrors-real-page precedents
- `src/app/workshop/projects/[projectId]/estimates/page.tsx:24-33` — the 5-way `Promise.all` tail (in-house parallel pattern)
- `src/app/workshop/projects/[projectId]/page.tsx:49-57` — the 4-way `Promise.all` tail
- `src/hooks/use-prefetch-on-hover.ts:24-78` — the debounced hover/focus prefetch hook
- `src/components/workshop/ProjectEstimatesTable.tsx:490-494,1080-1105` — the sheet link with `prefetch={false}` + hover prefetch
- `src/lib/auth/session.ts:31`, `src/lib/repositories/workspace-repository.ts:822,883,1649,1733,1766,1927` — the `React.cache()` coverage to preserve
