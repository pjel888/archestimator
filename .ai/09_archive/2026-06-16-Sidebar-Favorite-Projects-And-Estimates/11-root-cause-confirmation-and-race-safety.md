# 11 — Root-Cause Confirmation and Race-Safety Analysis

**Why this doc exists:** Adversarial review flagged that the package ships Route A on a root cause
that `01-root-cause-analysis.md` §4 *honestly admits was never pinned with a stepped-through repro*
(quote: *"the exact Next.js-internal reason the sidebar doesn't repaint in-place … was **not** pinned
… candidates are the optimistic-transition race and the `cache()` memo"*). A plan claiming high
quality must either (a) confirm the cause, or (b) prove the fix is correct **regardless** of which
candidate dominates **and** that its own design carries no equivalent race. This doc does (b)
rigorously, and states the residual honestly.

---

## 1. Purpose

Two jobs:

1. **Confirm-or-bound the cause.** Give a concrete repro to confirm the *symptom* during
   implementation (auth required), and bound the *mechanism* to two candidates without claiming to
   have pinned which one dominates.
2. **Prove Route A is correct regardless.** Show that Route A removes the dependency on the unproven
   mechanism (it deletes `router.refresh()` and the per-request `cache()` memo from the critical
   path), and that Route A's **own** design — the TanStack mutation lifecycle — has no equivalent
   staleness or race, by walking each race to a latest-intent-wins invariant.

This is the "prove it's right even though we didn't fully diagnose the old bug" doc.

---

## 2. Repro guidance (optional, implementation-phase)

Best run during implementation, when authenticated state is available. Record the result inline in
the implementation PR (it is the empirical confirmation `01` §4 lacked).

**Repro A — project flow (Bug A, the `router.refresh()` holdout):**

1. Sign in; open `/workshop/projects`.
2. Expand the sidebar so the Favorites section is visible.
3. Favorite a project that is **not** already a sidebar favorite (click the card star).
4. Observe: the **card star** flips immediately (optimistic `favoriteOverrides`,
   `projects-page-client.tsx:510`); the **sidebar Favorites list does not gain the project** in the
   same interaction.
5. Reload the page (or navigate away and back). The sidebar now shows it.
   - **Expected (bug present):** sidebar stale until reload/nav.

**Repro B — estimate flow (Bug B, no sidebar propagation at all):**

1. Open a project's estimates table at `/workshop/projects/{id}/estimates` for a project that **is**
   a sidebar favorite (so a sidebar change would be visible).
2. Favorite an estimate row (row star).
3. Observe: the **row star** flips immediately (per-mount Zustand `patch`,
   `ProjectEstimateFavoriteButton.tsx:34`); the **sidebar never updates**, even after waiting —
   the estimate flow has **no `router.refresh()` and no client channel to the sidebar** (`01` §2b).
4. Reload. The nested sheet now appears under the favorited parent.
   - **Expected (bug present):** sidebar never updates in-page; only reload/nav fixes it.

**What the repro proves and does not prove:** it confirms the *symptom* (in-page staleness) and which
*flow* exhibits it. It does **not** by itself distinguish the optimistic-transition race from the
`cache()` memo for Bug A — that distinction is what §3 makes moot.

---

## 3. Why the fix is correct regardless of which candidate cause dominates

`01` §4 narrows the unproven mechanism for Bug A to two candidates. Route A neutralizes **both**,
so we never have to decide between them.

### Candidate (a) — the React `cache()` per-request memo on the server read

`listMainSidebarFavoriteProjects()` is wrapped in React `cache()` (`workspace-repository.ts:~1205`),
which memoizes **per request**. The worry: a re-render reuses a memo computed before the write
committed, returning stale truth.

**Why Route A makes this irrelevant:**

- The **optimistic repaint** does not call the reader at all. `setQueryData` on
  `["favorites","sidebar",workspaceId,userId]` writes the new favorite directly into the scoped cache,
  and the always-mounted sidebar observer repaints synchronously. No server round-trip, no memo, no
  re-render on the critical path.
- The **reconcile** runs the reader inside a **fresh `"use server"` action request** (the queryFn).
  In a fresh server-action request the `cache()` memo is **cold**, so the reader returns current DB
  truth, not a stale memo carried over from the page render. (Verified fact: `cache()` scope is the
  request; a new action invocation is a new request.)

So whether or not the memo was the dominant cause, neither the memo nor a full server re-render is on
Route A's critical path.

### Candidate (b) — the optimistic-transition race

The old project flow fires `router.refresh()` **inside `startTransition`, after an awaited server
action** (`projects-page-client.tsx:512–517`), concurrently with the optimistic `favoriteOverrides`
transition. The worry: the full-tree re-render coalesces/races with the optimistic transition such
that the sidebar subtree does not visibly repaint with new data.

**Why Route A makes this irrelevant:** Route A **deletes `router.refresh()` entirely** from the
favorite path (per the D2/D10 precedent — `project-estimates-store.ts` header and
`LibraryPageClient.tsx:60,109` both replaced `router.refresh()` with targeted cache patching). There
is **no full-tree re-render** to race. Propagation is serialized through the TanStack mutation
lifecycle: `cancelQueries → setQueryData → server action → invalidate`. The sidebar updates because
it is a **subscriber to the patched cache**, not because the tree re-rendered.

### Conclusion

Both candidate causes depend on a mechanism (`cache()` memo reuse, or full-tree re-render timing)
that Route A removes from the path. The fix is justified on **consistency-with-D2/D10** grounds, not
on a pinned Next-internals claim — exactly as `01` §4 framed it. The diagnosis gap is therefore
**bounded, not load-bearing**.

---

## 4. Race-safety analysis of Route A's own design

The harder question: does Route A introduce *its own* equivalent race? We walk each one to a
latest-intent-wins invariant. The lifecycle under analysis (from `03` §2):

```
onMutate:  queryClient.cancelQueries(scopedKey)          // abort in-flight refetches
           snapshot = getQueryData(scopedKey) + local surface state
           setQueryData(scopedKey, optimistic)            // synthesize favoriteCreatedAt = now() for new
onError:   restore ALL surfaces from `snapshot`           // one snapshot, one rollback
onSettled: invalidateQueries(scopedKey)                   // → refetch via "use server" loader
```

### 4.1 Rapid double-toggle (favorite → unfavorite → favorite)

Sequence: three mutations M1, M2, M3 fire faster than the server resolves.

- Each `onMutate` calls `cancelQueries(scopedKey)`, which **aborts any in-flight refetch** for that
  key, and writes its own optimistic state via `setQueryData`. So after M3's `onMutate`, the cache
  holds M3's optimistic state.
- M1's or M2's server action may still resolve later and trigger `onSettled → invalidate → refetch`.
  But a refetch that a **newer** `onMutate` has already cancelled has its result **discarded** by
  TanStack Query — a cancelled query's resolved value never lands in the cache. So a stale in-flight
  refetch cannot overwrite M3's newer optimistic data.
- Once writes quiesce, M3's `onSettled` invalidates and the loader refetches in a fresh action
  request (cold memo → current truth), converging the cache on the persisted state.

**Invariant:** the cache converges to (last `onMutate` optimistic write) and then to (last settled
server truth); no earlier mutation's optimistic state or stale refetch can survive a newer
`onMutate`, because the newer `onMutate` cancelled it. **Latest intent wins.**

### 4.2 Refetch-vs-optimistic (settle fires a refetch while a newer toggle is mid-flight)

- M1 settles → `invalidate` → refetch R starts.
- Before R resolves, M2 fires. M2's `onMutate` runs `cancelQueries(scopedKey)`, which **cancels R**.
- **Specification:** the queryFn result for a cancelled query is **discarded** — it does not call
  `setQueryData` and does not clobber M2's just-written optimistic state. (This is why
  `cancelQueries` is in `onMutate` and not optional.)
- M2's own `onSettled` then schedules the authoritative refetch.

**Invariant:** an in-flight reconcile can never overwrite a newer optimistic write, because the newer
write's `onMutate` cancels the reconcile first. The only refetch that lands is the one **not**
superseded by a later mutation.

### 4.3 Cross-surface desync (card override / estimate Zustand store / sidebar cache)

Three surfaces can show favorite state:

| Surface | Source today |
|---|---|
| Project card star | `favoriteOverrides` (`projects-page-client.tsx:510`) |
| Estimate table row star | per-mount `ProjectEstimatesStore.patch` (`project-estimates-store.ts:97`) |
| Sidebar Favorites | scoped TanStack cache (new) |

Risk: an error rolls back one surface but not the others, leaving the card "on" while the sidebar is
"off."

**Single-source-of-truth rule:** `onMutate` takes **one** snapshot covering **all** touched surfaces
(previous sidebar cache data **plus** the previous local-surface state — the card override and/or the
table row's pre-patch values), stored in the mutation context. `onError` restores **every** surface
from **that one snapshot**. There is no per-surface independent rollback. This is the explicit
invariant: surfaces touched in a single `onMutate` are rolled back together from a single context, so
they cannot diverge on failure. (It generalizes the existing per-button rollback in
`ProjectEstimateFavoriteButton.tsx:54–58` to all surfaces at once.)

### 4.4 `staleTime: 0` + always-mounted observer

The sidebar observer is mounted on every `/workshop/*` page (it lives in the shell). Two mechanisms
depend on the query actually refetching: (1) `onSettled` invalidation, and (2) per-navigation
remount/refocus.

- The **global default `staleTime` is 5 minutes** (see `LibraryPageClient.tsx:105`, which sets
  `staleTime: 5 * 60 * 1000` for the warm library cache). Under that default, an `invalidate` marks
  data stale but **only refetches if an observer considers it stale** — and a 5-minute window would
  treat freshly-invalidated data as still fresh for navigation/refocus purposes, **suppressing both
  the on-settle refetch and the per-navigation refetch**. This is a **verified hazard**: applying the
  library cache's own 5-min staleTime here would silently re-stale the sidebar.
- Route A therefore sets **`staleTime: 0`** on the scoped sidebar query, overriding the global
  default. With `staleTime: 0`: an `invalidate` immediately refetches via the active observer, and a
  per-navigation remount/refocus refetches rather than serving cached-as-fresh data. The optimistic
  `setQueryData` still gives the instant paint; `staleTime: 0` only governs the **reconcile**, so
  there is no extra-fetch cost on the interactive path.

**Invariant:** with `staleTime: 0` and an always-mounted observer, every `onSettled` invalidate and
every navigation produces an actual refetch against current DB truth — the reconcile is real, not
suppressed.

---

## 5. What Route A explicitly does NOT prove

**Honesty section (per planning standard).**

- Route A does **not** pin the exact Next.js internal that prevented in-place repaint for Bug A. The
  optimistic-transition-race-vs-`cache()`-memo question from `01` §4 remains **unresolved**.
- This residual is **accepted** because Route A **removes the dependency** on that mechanism (it
  deletes `router.refresh()` and takes the per-request `cache()` memo off the critical path — §3).
  Correctness rests on the TanStack lifecycle and the D2/D10 precedent, not on the unproven internal.
- Route A's race-safety argument (§4) is a **design argument**, not yet an empirical one. It is sound
  given TanStack Query's documented cancel/discard semantics, but it has not been exercised against
  real auth state and real network timing in this codebase.

**Owner action (implementation phase):** run **QA-08 / QA-09** (rapid-toggle / refetch-vs-optimistic
tests) and **Repro A + Repro B** (§2) under authenticated state, and record results in the PR. If
either repro still shows in-page staleness after Route A, **or** any QA rapid-toggle test shows a
stale value surviving a newer toggle, **revisit this doc** — the design argument in §4 would have a
gap that empirical evidence must close before claiming completion.

---

## 6. Residual risk register

| Risk | Likelihood | Mitigation | Owner / phase |
|---|---|---|---|
| Exact Next-internal cause of Bug A never pinned | High (already true) | Route A removes the dependency (§3); not load-bearing | Accepted — confirm via Repro A/B (§2), Phase 5 |
| §4 race arguments are design-only, not yet empirical | Medium | QA-08/QA-09 rapid-toggle + refetch-vs-optimistic tests under auth | Phase 2/3 mutation work; Phase 5 verification |
| Global 5-min `staleTime` copied onto sidebar query, suppressing reconcile | Low (called out) | Hard-set `staleTime: 0` on the scoped key; assert in query-hook test | Phase 1 (`use-sidebar-favorites-query.ts`) |
| `cancelQueries` omitted/misordered in `onMutate`, letting a stale refetch clobber optimistic state | Low | Lifecycle test: settle M1's refetch *after* M2's `onMutate`; assert M2 state survives | Phase 2/3 (`use-toggle-project-favorite.ts` / `use-toggle-estimate-favorite.ts`) |
| Cross-surface rollback drift (one surface rolled back, others not) | Low–Medium | One snapshot in `onMutate`, one `onError` restoring all surfaces (§4.3); rollback test asserts every surface | Phase 2/3; Phase 5 tests |
| Scope leak across user/workspace (wrong favorites/hrefs shown) | Low (separate control) | Scoped key includes `workspaceId`+`userId`; remove/replace stale scope before render/prefetch (`03` §2 lifecycle) | Phase 1; security negative test |
| `router.refresh()` reintroduced by a later edit for favorites | Low | Phase 3 gate: "no `router.refresh()` remains for favorite propagation"; lint/grep check in PR | Phase 3 gate |

---

**Cross-references:** `01-root-cause-analysis.md` §4 (the honesty note this doc discharges);
`03-implementation-plan.md` §2 (mutation lifecycle), §5 edge cases 5–7 (latest-intent / rollback /
scope), Phase 5 (verification). D2/D10 precedent: `src/stores/project-estimates-store.ts` header,
`src/components/workshop/LibraryPageClient.tsx:60,109`.
