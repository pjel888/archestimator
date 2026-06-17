# 26 — Next.js 16 Cache Components & React Compiler Adoption Plan

> **Authoring agent:** W-CC (round 3). **Status:** Phase plan — the gated "Phase 5 pilot" the Bible defines (§16 Phase 5) that the pack dropped. Implements Bible **§6 (Next.js 16 Cache Components Rollout)** + **§7 (React 19 / React Compiler Rollout)** + **§16 Phase 5**, grounded in `_SYNTHESIS.md` conventions and `next.config.ts` (current `experimental` block).
>
> **Distinct from `10_PHASE_4_DATA_AND_CACHE_PLAN.md`:** that doc owns the **TanStack Query** cache and the **React `cache()`** request-scoped server memo (request-deduping repository reads, Bible §1.1 / §5.1). **This doc owns the orthogonal Next-16 features:** the framework-level `cacheComponents: true` (`use cache` / `cacheTag` / `cacheLife` / `updateTag` / `revalidateTag` / `refresh`) and the `reactCompiler: true` build transform. No overlap: `cache()` dedupes within one request; `use cache` persists *across* requests with explicit invalidation.
>
> **Scope discipline (`_SYNTHESIS.md §4`):** planning only — no `src/**`, `next.config.ts`, or `package.json` edits in this pack. Every file/segment/config named is a *target*. New gate/script names are flagged "(new, Phase N)". Validation uses the existing command vocabulary plus the new gates this doc registers.
>
> **Sequencing law:** this track runs **LAST** in the program — after Phase 1–3 (purity, indexes, decomposition, `editableRows` fan-out severed) **and** after Phase 7 (bundle / provider topology). Both features are **multipliers on clean architecture, not substitutes** (Bible §7 opener: "a multiplier after architecture is clean"). Enabling either early would lock in compiler bailouts against the messy code we are about to delete, or cache stale private data on a still-coupled boundary.

---

## 0. Goal & success definition

**Goal:** adopt the two Next-16/React-19 build-level multipliers — Cache Components and the React Compiler — through a gated, reversible, late-sequenced pilot that **never exposes stale private/auth-scoped data** and **never silently changes hot-component behavior**.

**Done when:**
- `cacheComponents: true` is enabled with the C0→C4 rollout completed (or explicitly stopped at a C-phase with a logged owner decision).
- `reactCompiler: true` is enabled only after the §7.1 purity audit passes and bailout warnings are clean in hot components.
- The load-bearing manual `memo` guards in `branch.tsx` / `row-table.tsx` (and the `Tree` virtualizer) are **preserved verbatim** (§7.2 retention law).
- Field/lab metrics improve or stay neutral; no stale-private-data leak proven by the new gate; rollback is a **single config revert** (Bible §16 Phase 5 exit criteria).

**Non-goals:** TanStack Query cache tuning (`10`); React `cache()` request-memo (`10`); bundle/provider-topology work (`13` — a *prerequisite*, not part of this track); blanket `useMemo`/`useCallback` deletion (forbidden by §7.2).

---

## 1. Dependencies & entry gate

This track does **not start** until all of the following are green:

| Prereq | Phase | Why it must precede |
|---|---|---|
| `editableRows` map-identity fan-out severed (per-row subscription) | Phase 3 (`09`) | Compiler can't fix too-broad subscriptions (§7 opener); caching can't paper over a coupled boundary. |
| EstimateSheetContent decomposed; render isolation proven | Phase 3 (`09`) | Purity audit (§7.1) targets *stable* hot components, not a 1881-LOC god component mid-surgery. |
| Tree kernel unified; whole-tree `JSON.stringify`/DFS-per-keystroke removed | Phase 1–2 (`07`/`08`) | Non-deterministic / expensive-compute-during-render is exactly what §7.1 audits for. |
| Provider topology moved; landing chunk free of supabase/realtime | Phase 7 (`13`) | C0/C1 cache the public shell — must not be entangled with authed providers first. |
| Baseline render profiles + bundle baseline captured | Phase 0 (`06`) | The "metrics improve or stay neutral" exit gate needs a before. |

**`current next.config.ts` (`:54-68`):** `experimental.optimizePackageImports` + `staleTimes` only. Neither `cacheComponents` nor `reactCompiler` is set (Bible §6.1 confirms). Both are added here as gated rollouts, **not a drive-by config change** (§6.1).

---

## 2. Next.js 16 Cache Components rollout (Bible §6)

### 2.1 The cookies/headers-OUTSIDE-cache extraction rule (§6.2)

**Law:** Use Cache Components for deterministic, low-mutation, shareable, or scoped-but-argument-driven data. **Never** call `cookies()` or `headers()` (directly or transitively via `requireCurrentUserContext()` / a Supabase server client) **inside** a `"use cache"` scope. Read runtime request values **outside**, then pass **serializable arguments** into the cached function. This is the single rule that prevents cross-user cache poisoning.

**Correct (extract request values outside, pass serializable args in):**

```tsx
import { cacheTag, cacheLife } from "next/cache";

export default async function Page() {
  const context = await requireCurrentUserContext(); // reads cookies/headers — OUTSIDE
  return <CachedWorkshopTaxonomy workspaceId={context.workspaceId} />;
}

async function CachedWorkshopTaxonomy({ workspaceId }: { workspaceId: string }) {
  "use cache";
  cacheTag(`workspace:${workspaceId}:taxonomy`);
  cacheLife("minutes");
  const taxonomy = await readWorkspaceTaxonomy(workspaceId); // arg-driven, deterministic
  return <TaxonomyPanel initialTaxonomy={taxonomy} />;
}
```

**Wrong (cookies read INSIDE the cached scope → keyed wrong, leaks across users):**

```tsx
async function CachedThing() {
  "use cache";
  const user = await requireCurrentUserContext(); // reads cookies/headers INTERNALLY
  return getUserScopedData(user.id);
}
```

**Enforcement gate (new, this phase) — scoped to what is tractable:** `lint:no-request-in-cache` — a static check (extend `enforce-app-design-system.mjs` engine or a new detector) that fails the build on **DIRECT** `cookies()`, `headers()`, or `requireCurrentUserContext()` calls appearing **textually inside** a function carrying `"use cache"`. This is the tractable, textual case (same shape as the SC-4/SC-5 grep gates in doc 06 §4.1) and is what the automated gate covers. **It does NOT claim to detect the TRANSITIVE case** — `cookies()`/`headers()` reached indirectly through a Supabase server-client constructor (or any other call) inside a `"use cache"` scope — because that would require a whole-call-graph static analyzer the pack does not commit to building. The transitive/indirect case is instead a **mandatory PR-checklist item (doc 27)** + the per-C-phase leak gate below (the C-phase leak gates, e.g. `prove:no-private-in-public-cache` and the cross-tenant denial checks, are what actually catch a transitive leak at runtime). An implementer should build the textual check, NOT an infeasible whole-graph analyzer. Until even the textual check lands, the rule is a **mandatory PR-checklist item** + the per-C-phase leak gate below.

### 2.2 Rollout order — C0 → C4 (§6.3, verbatim, must run in order)

| C-phase | Scope | Why | Risk | Per-phase leak gate (proves no stale private/auth data) |
|---|---|---|---|---|
| **C0** | Landing / about / features / pricing / contact **static shells** (`src/app/page.tsx`, `/about`, `/features`, `/pricing`, `/contact`) | Low auth risk; easy to measure LCP/JS. No user scope at all. | **Low** | `prove:no-private-in-public-cache` (new): assert the cached marketing chunk contains **no** authed payload, no `Set-Cookie`-varying content, no supabase call. Anonymous-vs-anonymous identical render. |
| **C1** | Public **share chrome** + **immutable publication snapshots** (`src/app/share/[token]/**`, `lib/publication/snapshot.ts`, `publication/public-repository.ts`) | Snapshot semantics are cache-friendly **iff** the token/security boundary is explicit; publication snapshots are immutable by design (Bible §1.1 names `public-repository.ts` `cache()` as a model). | **Med** | Extend `prove:share-*` (cross-ref `22`): two different tokens never share a cache entry; a revoked/expired token never serves a cached snapshot; password-gated share (`P10`) not cached past the gate. Tag key MUST include the publication id, never the token alone. |
| **C2** | **Workspace taxonomy / component categories** that change rarely (`workspace-repository.ts` taxonomy reads) | Big repeated read value, low mutation frequency. First *authed* cache → highest scrutiny. | **Med-High** | New: cross-tenant denial — workspace A's cached taxonomy never served to workspace B (tag MUST be `workspace:{id}:*`, id from `requireCurrentUserContext` read **outside**). Cross-ref `22` RISK-20 pattern. |
| **C3** | **Component-library folder / taxonomy summaries per workspace** (`component-library-repository.ts` summary reads; live loader `getCurrentWorkspaceComponentRowsLibrary`, `_SYNTHESIS §V2-FACTS`) | Repeated per-workspace read; needs `cacheTag` + **server-action invalidation** wired (the first phase requiring write-side invalidation discipline). | **High** | New: mutate-then-read-your-writes — after a folder/taxonomy server action calls `updateTag(...)`, the very next read reflects the write (no stale tree); and the invalidation is **scoped** (workspace A's mutation never busts workspace B). |
| **C4** | **Workshop estimate editor LAST** (`src/app/workshop/projects/[projectId]/estimates/**`, `EstimateSheetContent.tsx`) | Highly interactive, mutation-heavy. Use **mostly query-level cache** (TanStack, `10`) + scoped invalidation; apply `use cache` **only** to the deterministic, low-churn sub-reads (e.g. tab metadata), never to the live editable tree. | **Critical** | Extend `prove:estimate-tabs-rls` (CTE multi-role, `_SYNTHESIS`): a keystroke/optimistic edit is **never** served from a cross-request cache; `estimate:{id}:tree` invalidation is read-your-writes; no other user's in-progress edit ever appears. Pairs with GATE-NO-TOTAL-FLASH (doc 20). |

**Stop rule:** any C-phase whose leak gate cannot be made green **halts the rollout at that phase**; log the stop as an owner decision (Q-36) and ship the prior C-phases. C4 is explicitly the phase most likely to stop at "query-level cache only, no `use cache` on the live tree."

### 2.3 Namespaced tag scheme (§6.4, verbatim)

```ts
cacheTag(`workspace:${workspaceId}:component-taxonomy`);
cacheTag(`project:${projectId}:estimates`);
cacheTag(`estimate:${estimateId}:tabs`);
cacheTag(`estimate:${estimateId}:tree`);
cacheTag(`publication:${publicationId}:snapshot`);
```

**Rule:** every cached scope is tagged by the **owning scope id** (workspace / project / estimate / publication), **never** by a bare token, session, or user-agent value. The id is read **outside** the cache (§2.1) and passed in. This namespacing is what makes the cross-tenant denial gates provable.

### 2.4 Revalidation standard (§6.4)

| Primitive | Use when | Repo example |
|---|---|---|
| `updateTag(tag)` | User needs **read-your-writes immediately** | C3 folder rename / C4 estimate tab edit — the actor must see their own change on the next read. |
| `revalidateTag(tag, "max")` | **Stale-while-revalidate is acceptable** | C2 taxonomy that changes rarely; a background refresh is fine. |
| `refresh()` | **Uncached** data must update on the **current route** | A route segment with no `use cache` scope that nonetheless needs re-running after a mutation (the disciplined replacement for the broad `router.refresh()` in 12 files, `_SYNTHESIS` POST-REVIEW #3). |

Mutation server actions adopt these in C3/C4; before then (C0/C1) there are no writes to invalidate.

### 2.5 Suspense law (§6.5)

When `cacheComponents` is enabled, **uncached async work must sit behind Suspense or inside a cached scope** — there is no implicit blocking fallback. For this repo:

- **Every large right-dock panel gets its own Suspense boundary** (not one boundary for the whole dock) — so a slow taxonomy/library panel never blocks the estimate grid.
- Every slow server panel has a **content-shaped skeleton** (table-/tree-/card-shaped), matching Bible §19.7 route-shaped skeleton — **not** a generic spinner and **not** a global blur overlay (global overlays are explicitly forbidden as substitutes).
- Cross-ref doc 20 (UX/UI): the per-phase **visual-regression / CLS gate** covers streaming-in skeletons; this Suspense work feeds that gate. New gate: `a11y`/visual via `bun run storybook:validate` extended to the new boundary skeletons.

---

## 3. React Compiler rollout (Bible §7)

### 3.1 Purity audit BEFORE `reactCompiler: true` (§7.1)

Enable `reactCompiler: true` **only after** auditing every **hot client component** (the Phase-3 decomposed estimate-sheet pieces, `Tree`/`branch.tsx`/`row-table.tsx`, tabs, sidebar, charts) for the six §7.1 violations:

1. **Mutation during render** (writing state/refs/externals while rendering).
2. **Non-deterministic render values** — `Date.now()`, random IDs, mutable globals read during render.
3. **Effects that derive state from state** (the §7.4 anti-pattern; convert to `useMemo` over a deferred value).
4. **Object/array creation crossing a memoized third-party boundary** (new identity each render defeats TanStack Table/Virtual memoization).
5. **Ref/event code called during render** (must run after commit).
6. **Components depending on stale closures.**

`use-stable-callback.ts` (`src/hooks/use-stable-callback.ts`) is the sanctioned pattern for stable event identity with the latest closure — **keep it** for handlers invoked after commit (§7.1).

The audit is a **deliverable** (a checklist over the enumerated hot components with file:line evidence), not a vibe — its completion is the entry gate for flipping the flag.

### 3.2 Manual-memo retention law — do NOT delete all memo (§7.2)

The compiler reduces *reflexive* `useMemo`/`useCallback`, but **keep manual memoization** when:

- a **third-party library relies on referential stability** (TanStack Table/Virtual row/column identity);
- a **virtualized row renderer must preserve row identity** (the `Tree` virtualizer in `ui/tree.tsx`);
- **custom equality avoids expensive tree-row rerendering** — **the load-bearing guards in `branch.tsx` (`:111-156`, esp. the `prev.editableRows[item.id] !== next.editableRows[item.id]` object-identity check at `:101`, `_SYNTHESIS §V2-FACTS`) and `row-table.tsx` (`:86-116`) MUST be preserved verbatim**;
- a **pure computation is known-expensive** and not compiler-covered;
- the code sits in a **compiler bailout zone**.

**Hard rule:** the compiler pilot **does not touch** the `branch.tsx` / `row-table.tsx` / `Tree` guards. Stop *adding* memo by reflex; do not *remove* memo that a profile or a third-party boundary requires. A retention list of every preserved guard is part of the pilot PR.

### 3.3 Pilot procedure (§16 Phase 5)

1. Enable `reactCompiler: true` **in a branch only**.
2. Run the full gate: `bun run build` + `bun run test:dom` (361 DOM) + `bun run test:e2e` smoke + render profiles (`bun run perf:profile-peak-load`) + the 4 jsdom render-isolation gates.
3. **Clean compiler bailout warnings** in hot components (each bailout = either a real purity bug from §3.1, or a documented intentional bailout zone).
4. Confirm metrics improve or stay neutral vs the Phase-0 baseline (≥20 samples, p95, cold/warm separated — methodology per doc 25).
5. **Rollback = single config revert** (`reactCompiler: true` → removed). No code rollback required if the retention law was honored.

---

## 4. Concurrency law — the positive prescriptions (§7.3)

These are **independent of the flags** (they are React-19 APIs usable today) but belong to this track because they are the "use concurrency where responsiveness beats immediate recompute" half of the compiler story.

| Use case | Tool | Rule | Repo target |
|---|---|---|---|
| Search filtering a large tree/list | `useDeferredValue(query)` | Keep the **input instant**; let results lag. Avoid extra network round-trips separately. | EstimateSheetTree filter, component-library filter (§7.4 names tree/library filtering). |
| Switching heavy local tabs | `startTransition` / `useTransition` | Make tab state **non-blocking** when it triggers a heavy panel. | Estimate tab strip → heavy right-dock panel. |
| Bulk insert / large local projection | transition + **batched cache write** | One transaction, no repeated renders. | Bulk row insert into the editable tree (cross-ref `11` optimistic mutations). |
| Route navigation | Next **router / prefetch / Suspense** | Do **not** fake speed with a global overlay. | Replaces broad `router.refresh()` patterns; pairs with §2.4 `refresh()`. |

**Pinned exception (do NOT defer):** **totals must NEVER be deferred.** Totals are synchronous-on-keystroke per doc 20 **GATE-NO-TOTAL-FLASH** (and `_SYNTHESIS` D-017 — totals Map is number-valued, value-equality). Wrapping totals recompute in `useDeferredValue`/`startTransition` would flash stale numbers and fail that gate. Defer *search/filter*, never *totals*.

---

## 5. Sequencing, exit criteria, validation & rollback

### 5.1 Track sequence (gated, late, single-revert)

```
[ entry gate: Phases 1–3 + Phase 7 green, Phase-0 baseline captured ]  (§1)
   │
   ├─ Compiler pilot (§3): purity audit → branch flag → full gate → clean bailouts → metrics neutral+
   │     (independent of Cache Components; can run first since it has no auth-cache risk)
   │
   └─ Cache Components (§2): C0 → C1 → C2 → C3 → C4   (strict order; each gated by its leak gate)
         └─ stop at any C-phase whose leak gate can't go green (log Q-36 owner decision)
```

Compiler and Cache Components are **separately revertible** (two independent config keys). Either may be shipped without the other.

### 5.2 Validation (existing vocabulary + new gates)

- **Existing:** `bun run build`, `bun run validate` (type-check + lint + lint:design-system + lint:design + test + test:dom), `bun run test:e2e`, `bun run perf:profile-peak-load`, `bun run storybook:validate`, `ANALYZE=true bun run build`.
- **New gates this doc registers (mark "(new, Phase 5)"):**
  - `lint:no-request-in-cache` — static no-`cookies()`/`headers()`/auth-context inside `"use cache"` (§2.1).
  - `prove:no-private-in-public-cache` — C0/C1 public-cache contains no authed payload (§2.2).
  - extend `prove:share-*` — per-token cache isolation, revoked/expired/password-gated never cached (C1).
  - extend `prove:estimate-tabs-rls` — cross-request edit isolation + read-your-writes (C2/C3/C4).
  - C-phase visual/CLS via `bun run storybook:validate` on the new Suspense skeletons (§2.5, doc 20).

### 5.3 Exit criteria (Bible §16 Phase 5)

- **No auth/cookies/headers misuse inside cached scopes** (proven by `lint:no-request-in-cache` + per-C leak gates).
- **No stale private-data exposure** (cross-tenant + read-your-writes gates green at every shipped C-phase).
- **Field/lab metrics improve or stay neutral** vs Phase-0 baseline.
- **`branch.tsx`/`row-table.tsx`/`Tree` guards preserved** (retention list in PR).
- **Rollback is a single config revert** for each flag.

### 5.4 Rollback

- **Cache Components:** remove `cacheComponents: true` from `next.config.ts` `experimental`; the `"use cache"` directives become no-ops / can be removed independently per C-phase (revert the most recent C-phase first). Each C-phase is its own PR for granular revert.
- **React Compiler:** remove `reactCompiler: true`. Because the retention law forbade deleting load-bearing memo, no code rollback is needed — the manual guards still stand.

---

## 6. Decisions / risks / open questions to register

> For the register fixer (W11 → `16`/`17`/`19`). IDs pinned by the master prompt.

**Decisions (`17_DECISION_LOG.md`):**
- **D-021** — Adopt the Next-16 Cache Components rollout in strict **C0→C4** order, gated, late (after Phases 1–3 + Phase 7), with the §6.2 cookies/headers-outside-cache rule and §6.4 namespaced tags + revalidation standard. Single-revert rollback per C-phase.
- **D-022** — Pilot `reactCompiler: true` **only after** the §7.1 purity audit of hot client components; **preserve** the §7.2 retention set (esp. `branch.tsx`/`row-table.tsx`/`Tree` guards); branch-only pilot with single-config-revert rollback.

**Risks (`16_RISK_REGISTER.md`):**
- **RISK-23** — *Cache Components stale private/auth data exposure.* `cookies()`/`headers()`/auth-context inside a `"use cache"` scope, or a tag keyed on token/user instead of scope-id, serves one user's data to another. **Severity: Critical.** Mitigation: §2.1 extraction rule + `lint:no-request-in-cache` + per-C leak gates (`prove:no-private-in-public-cache`, extended `prove:share-*` / `prove:estimate-tabs-rls`); C-phase stop rule.
- **RISK-24** — *React Compiler bailout / behavior change in hot components.* Auto-memoization changes render behavior or silently bails out where a manual guard was load-bearing (totals flash, virtualized row identity churn, third-party referential instability). **Severity: High.** Mitigation: §7.1 purity audit before enable; §7.2 retention law (guards untouched); clean-bailout gate; full DOM/e2e/profile gate; single-revert.

**Open questions (`19_OPEN_QUESTIONS.md`):**
- **Q-36** — *When do we enable `cacheComponents: true`, and how far down C0→C4 do we go?* Owner: eng + product. Deadline: after Phase 7 ships. Safe default: enable through **C2** (low/med-risk public + rarely-changing taxonomy); treat **C3/C4** as separately-approved (C4 likely "query-level cache only, no `use cache` on the live tree").
- **Q-37** — *When do we enable `reactCompiler: true`?* Owner: eng. Deadline: after Phase 3 decomposition + purity audit pass. Safe default: keep **off** until the §7.1 audit is green and the §7.2 retention list is signed off; ship behind the branch-only pilot first.
