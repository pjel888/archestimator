# Sidebar Favorites — QA Evidence (Phase 5.5)

> Captured 2026-06-17 on branch `codex/fix-project-delete` after implementing Phases 1–5
> (Tasks 1.1–5.4). The branch is shared with three concurrent lanes (Project Groups,
> card-polish, estimates-toolbar); this evidence is scoped to the favorites feature.
>
> **Integrated state:** `bun run type-check` → exit 0 (clean). Full favorites suite
> (13 files) → **53 tests passed**. All Definition-of-Done grep proofs green (below).
> (2 pre-existing favorites-adjacent files — `workshop-favorites-schema`, `sidebar-nav-item-row`
> — also still pass, unaffected by this work.)

## Commands + exit codes
```
[0] bun run type-check                                          # tsc --noEmit, clean
[0] bunx vitest run <13 favorites test files> --maxWorkers=1    # 13 files, 53 tests passed
[0] git diff --check                                            # no whitespace/conflict markers
```

## Final-review dispositions (holistic review = SHIP-WITH-NITS, no BLOCKER/IMPORTANT)
- **FIXED** — loading-shell wasted refetch: `useSidebarFavoritesQuery` now takes `enabled`
  (`MainSidebar` passes `Boolean(favoritesScope)`), so the null-scope loading shells read
  `initialData` without firing a junk `["favorites","sidebar","none","none"]` refetch
  (commit 52d43d1b, locked by a test).
- **DEFERRED (unreachable via UI)** — stale `parentProject.isSidebarFavorite` could make the
  polite cue contradict the live sidebar IF a project were favorited and then an estimate
  favorited under it without reload. But project-favorite controls exist only on the projects
  page / homebase (not the estimates page), and cross-route nav re-runs the estimates server
  component with a fresh `isSidebarFavorite`, so the contradictory state is not reachable
  through the actual UI. The cache patch itself always keys off the live `visibleParentIndex`,
  so behavior is correct regardless; only the advisory copy could theoretically drift. Fast-follow
  if a same-route project-favorite affordance is ever added: source `isSidebarFavorite` from the
  live favorites query inside `onMutate`.

## Definition-of-Done grep proofs
| Proof | Result |
|---|---|
| No `router.refresh` on favorite path (project hook / estimate hook / homebase / `toggleProjectFavorite` body) | ✓ none (the `router.refresh` at projects-page-client `:719-740,:954` are the **groups lane** group-mutations + the delete path, not favorites — locked by the Phase 3.2 grep-guard test) |
| `staleTime: 0` on the favorites query | ✓ `use-sidebar-favorites-query.ts:30` |
| Homebase keeps `router.replace("/workshop", { scroll: false })` (D8) | ✓ `WorkshopHomebaseClient.tsx:94` |
| No `revalidateTag` in actions (D7) | ✓ none |
| Boolean guard first in BOTH actions (QA-13) | ✓ `actions.ts:26,:75` |
| `workspace_id` on project + estimate favorite DELETE (QA-14) | ✓ `actions.ts:36,:118` |
| Logout clears favorites cache (C5/QA-17) | ✓ `realtime-auth-bridge.ts:57` `removeQueries({ queryKey: favoritesQueryKeys.all() })` |
| No `dangerouslySetInnerHTML` in favorites render (QA-15/QA-22) | ✓ none — names render as React text nodes |

## QA matrix
| Scenario | Status | Evidence |
|---|---|---|
| QA-01 Favorite project → card + sidebar, no router.refresh | PASS | `project-favorite-sidebar-mutation.test.tsx` (optimistic insert, synthesized createdAt, sorts to top) + grep guard |
| QA-02 Unfavorite project w/ nested sheets | PASS | `project-favorite-sidebar-mutation.test.tsx` (rollback) + `sidebar-favorites-cache.test.ts` project-remove |
| QA-03 Estimate under visible favorite parent | PASS | `estimate-favorite-sidebar-mutation.test.tsx` (inserts sheet + patches row store) |
| QA-04 Estimate under non-favorited parent | PASS | `estimate-favorite-sidebar-mutation.test.tsx` (row only, sidebar untouched) + `estimate-favorite-cue-gating.test.tsx` (polite cue fires) |
| QA-05 9th project trims to top 8 | PASS | `sidebar-favorites-shaping.test.ts` |
| QA-06 6th sheet trims to top 5 | PASS | `sidebar-favorites-shaping.test.ts` + `sidebar-favorites-cache.test.ts` |
| QA-07 Estimate under favorited parent outside top-8 | PASS | `sidebar-favorites-cache.test.ts` (no-op outside visible top-8) + cue silent (cue-gating) |
| QA-08 Rapid project favorite→unfavorite→favorite | PASS (unit) / GAP (browser) | latest-intent-wins via sequential optimistic patch + fire-and-forget `cancelQueries` (cancellation initiated synchronously — verified by coordinator); full auth-browser rapid toggle not run (no auth env) |
| QA-09 Rapid estimate toggle w/ in-flight refetch | PASS (unit) / GAP (browser) | `estimate-favorite-sidebar-mutation.test.tsx` race test (M1 stale-settle cannot clobber M2) proves intent-ordering; in-flight-query cancellation reasoned, not auth-browser-exercised |
| QA-10 Project action rejects → rollback + a11y error | PASS | `project-favorite-sidebar-mutation.test.tsx` (snapshot rollback) + assertive region copy from button `onError` |
| QA-11 Estimate action rejects → rollback both surfaces | PASS | `estimate-favorite-sidebar-mutation.test.tsx` ("rolls back BOTH surfaces from one snapshot") |
| QA-12 Scope change evicts old | PASS | `use-sidebar-favorites-query.test.tsx` (asserts previous-scope entry is `undefined` after switch) |
| QA-13 Non-boolean/invalid UUID fails closed | PASS | `workshop-favorite-actions-hygiene.test.ts` (`fromSpy` never called on bad input) |
| QA-14 Cross-workspace id → no leakage | PASS | `workshop-favorite-actions-hygiene.test.ts` (`workspace_id` in project-delete `.eq` chain); estimate-delete `workspace_id` verified by code (`actions.ts:118`) |
| QA-15 Long/unicode/instruction-like names | PASS (code) | favorite names rendered as React text nodes; no `dangerouslySetInnerHTML` (grep proof) |
| QA-16 Browser/auth proof unavailable | GAP (recorded) | no authenticated browser available in this environment; deterministic unit/component coverage stands in — not faked |
| QA-17 Sign out then different user → no residue | PASS | `realtime-auth-bridge-favorites-clear.test.tsx` (SIGNED_OUT removes all `["favorites"]` entries) |
| QA-18 Focused link removed → focus rescued | PASS | `main-sidebar-favorites-focus.test.tsx` (nearest-above → nearest-below → header) |
| QA-19 Navigate routes → refetch (staleTime 0) | PASS | `use-sidebar-favorites-query.test.tsx` ("reconciles to server truth on mount because staleTime is 0") + no-flash-in-flight test + grep |
| QA-20 Rapid toggles + SR → no stacking | PASS | `main-sidebar-favorites-live-region.test.tsx` (clear-before-write; polite vs assertive routing; 6s clear) |
| QA-21 Unfavorite active route → removed, focus rescued | PASS | `main-sidebar-favorites-focus.test.tsx` (removal + focus rescue; active-route `aria-current` covered in `main-sidebar-favorites.test.tsx`) |
| QA-22 No favorite string → dangerouslySetInnerHTML | PASS | grep proof (none) + render-as-text |
| Repro A (project flow, no reload) | GAP (browser) | requires authenticated browser (`11 §2`); unit/integration proxies pass |
| Repro B (estimate flow, no reload) | GAP (browser) | requires authenticated browser (`11 §2`); unit/integration proxies pass |

## Residual risks (`11 §6`, restated)
- **Exact Next-internal repaint cause never reproduced** — accepted; Route A removes the
  `router.refresh()` dependency both candidate root causes hinged on, so the fix holds
  regardless of which candidate was true. Confirm via Repro A/B under auth when available.
- **QA-08/09 + Repro A/B are design-validated, not auth-browser-exercised.** The race
  arguments (`11 §4`) and the unit race test prove intent-ordering + synchronous
  cancellation initiation; a live authenticated rapid-toggle pass remains the one
  empirical gap (QA-16 permits recording it).
- **Identical rapid polite cues** currently announce once then dedupe (React batches the
  clear-then-write); this satisfies QA-20 no-stacking. Forcing re-announce of an
  identical cue is intentionally not implemented (rapid identical SR spam is worse UX).
- **Cross-lane:** the favorites feature is type-clean and fully green, but it lives on a
  branch with three concurrent lanes. One unrelated failing test (`projects-page-shared-access`
  "4 opens") is the **card-polish lane** removing `formatOpenCount` — not a favorites defect.

## Cleanup
No temporary harnesses left behind (the `projects-page-test-harness.tsx` is a permanent
shared `QueryClientProvider` wrapper required because `ProjectsPageClient`/`WorkshopHomebaseClient`
now consume the favorites query context). `decisions.md` to be updated after the review gate.
