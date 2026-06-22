# 14 — Implementation Phase Plan (P0 → P5)

**Status:** PLANNING ONLY — execution-ready phasing, but **no source, deps, migrations, or provider settings were changed authoring this doc.**
**Date:** 2026-06-14
**Repo:** `/Users/philiplewis/archestimator` @ HEAD `3070c46c` (`main`)
**Mirrors:** `12_OPTIMIZATION_BACKLOG.md` (same P0–P5 phases + item IDs). Read the backlog for per-item detail; this doc is the *execution order, gates, and per-phase measurement contract*.

---

## ⚠️ Read before executing ANY phase

### Do NOT implement from stale docs
Several pre-existing plans contain claims that are **already implemented** or **superseded**.
Implementing from them re-opens closed work or contradicts owner decisions. Reconcile every
action against the **GROUND TRUTH** block (verified 2026-06-14 @ HEAD `3070c46c`) and the
"already implemented" list in `12_OPTIMIZATION_BACKLOG.md` GATE-2 and `05_BUNDLE_*` §3 before
writing a line of code. Specifically already-landed (do not re-recommend): proxy public-route
early-return, 5-min TanStack staleTime, `experimental.staleTimes`, phosphor
`optimizePackageImports`, 10 `loading.tsx` shells, 7 `error.tsx`, hover/viewport prefetch,
ExcelJS isolation, D3 submodule imports, `NeatWireframeBackground` `ssr:false`, estimates-list
RPC summaries, charts buckets-only payload, teamspace presence/cursors, estimate-tree
unification corridor P0–P3.

### Do NOT mutate production / providers / database from this plan
This plan **recommends**; it does not authorize. **No** Supabase / Vercel / GitHub / DNS / env
/ secret mutation, **no** migration apply to hosted, **no** deploy / promote, **no** index
drop, **no** RLS rewrite, **no** RUM package re-add may be executed without an explicit owner
decision recorded in `.ai/10_state/decisions.md`. PITR is **off** and several DB items are
**irreversible** (GOV06). The hardest gate is **GOV02**: Vercel Speed Insights RUM was
*removed in production as a security remediation* — do not re-add it without re-checking the
original security finding (see Phase P4).

### Concurrent-agent safety (multiple agents active in this repo)
At audit start the working tree was already dirty with **other agents'** edits
(`ProjectEstimatesClient.tsx`, `WorkshopCollectionLayout.tsx`, several `tests/vitest/*`). When
executing any phase:

1. **Small, reversible changes.** Prefer additive files (`loading.tsx`, `error.tsx`, new JSON
   budgets, new index migrations staged-not-applied) over edits to hot shared files. Land in
   small commits that revert cleanly.
2. **No collision with active plans.** Do NOT touch surfaces governed by archived/active plans
   without reconciling: estimate-sheet keystroke/virtualization (GOV12, REJECTED options),
   estimates-list / library / charts / teamspace (GOV04, archived/implemented), estimate-tree
   unification P5/P6 (owner-gated, irreversible). Check `git status` and `.ai/03_plans/*` for
   in-flight work before editing a shared file.
3. **Do not run shared-artifact builds blindly.** `bun run build` / `next dev` write the shared
   `.next/`. For the ANALYZE build (P0-3) use an **isolated** `.next` dir or a separate
   worktree so you don't corrupt a concurrent agent's build. Coordinate a quiet window.
4. **Land via ff-push to origin/main** (repo convention): stage only your files, validate +
   build, then `git push origin HEAD:main`. Do not checkout main locally in the dirty main
   worktree. Leave other agents' in-progress edits untouched.

### Language discipline (every phase)
`verified` = read now · `observed` = evidence artifact · `likely` = code inference · `blocked`
= env prevented · **no readiness claim without live/production-like proof.**

---

## Phase ordering contract

```
P0 Measurement & Truth   ──► gates everything (GATE-0: no P1+ on an unmeasured surface)
   │
   ├─► P1 Perceived-speed (no-regret)        ┐
   ├─► P2 Bundle & hydration                 ├─ run after that surface's P0 baseline exists
   ├─► P3 Data & server (DB items owner-gated)┘
        │
        └─► P4 Production / RUM readiness  ──► (P4-1 blocked by GOV02 owner decision)
                 │
                 └─► P5 Post-beta scale (mostly owner-gated / deferred)
```

P1, P2, P3 can run in parallel **per surface** once that surface has its P0 baseline. P4 needs
production-like builds + an owner RUM decision. P5 is post-beta and mostly owner-gated.

---

## Phase P0 — Measurement & Truth

- **Goal:** Replace every `blocked`/`likely` perf claim with a captured baseline so nothing in
  P1–P5 is implemented blind. P0 ships **no product change**.
- **Backlog items in phase:** P0-1 (route inventory normalize), P0-2 (smoke vs readiness
  budgets), P0-3 (public ANALYZE treemap + public Lighthouse), P0-4 (authed Lighthouse +
  treemap on heaviest surfaces), P0-5 (unmeasured-surface inventory + "no-claim-without-proof"
  gate).
- **What must be measured first:** This phase *is* the measurement. Order: P0-1 → P0-2 (no
  build needed) can start immediately; P0-3 needs an isolated/quiet build window; P0-4 needs
  owner storage state + a production-like build.
- **Entry gate:**
  - GROUND TRUTH reconciled; no stale-claim carry-over.
  - Quiet/isolated build window agreed with concurrent agents for P0-3 (isolated `.next`).
- **Owner gates:** P0-4 needs **owner-provided Playwright storage state** (dev-auth bypass is
  disabled). P0-3 needs no owner gate (no deploy), only build coordination.
- **Exit / validation gate:**
  - Canonical `evidence/route-matrix.json` exists (P0-1).
  - `route-transition-readiness-budgets.json` exists separate from the relabeled smoke file;
    readiness checker selects tier (P0-2).
  - Archived public treemap + public Lighthouse for `/ /features /pricing /about /contact`
    (P0-3); real first-load-JS numbers recorded.
  - Archived authed Lighthouse + route-chunk sizing for editor `[nodeId]`, charts, project
    detail `[projectId]`, library (P0-4); LCP/TBT/serverResponse captured.
  - Explicit unmeasured-surface list + GATE-0 enforced in the readiness script (P0-5).
  - **No P1/P2/P3 item is started for a surface absent from the captured baselines.**

---

## Phase P1 — No-regret perceived-speed wins

- **Goal:** Improve *felt* speed on authed surfaces with cheap, reversible, additive changes.
- **Backlog items in phase:** P1-1 (missing `loading.tsx`: project detail, estimate editor,
  settings sub-routes), P1-2 (wrong-shaped skeletons), P1-3 (missing `error.tsx`), P1-4
  (`router.refresh`/`revalidatePath` churn — 23+57 sites, per-site), P1-5 (query-cache
  invalidation cleanup + warm-route reuse/prefetch proof), P1-6 (overlay flash — conditional on
  P0 evidence).
- **What must be measured first:** P0-4 baseline for any surface you touch (editor /
  project-detail / settings). P1-2 and P1-6 require the P0 screenshots/evidence to confirm a
  real mismatch/flash — do not act speculatively.
- **Entry gate:**
  - Target surface has a P0-4 baseline (GATE-0).
  - For P1-2/P1-6: captured evidence of the specific defect exists.
  - For P1-4: reconcile with GOV12 before touching any keystroke/sheet path.
- **Owner gates:** None (all additive/code-level).
- **Exit / validation gate:**
  - Each new `loading.tsx`/`error.tsx` verified: shell/skeleton paints, `overlayCount: 0`,
    local error boundary catches an RSC throw.
  - P1-4: each removed `router.refresh`/`revalidatePath` paired with the correct TanStack
    invalidation; data still updates; no stale UI; no extra RSC request beyond expected.
  - P1-5: warm transition median improved + `prefetchRscRequestMin: 1` on newly-prefetched
    surfaces.
  - Skeleton shape ≈ loaded shape (P1-2); overlay does not flash (P1-6, if it was real).
  - Before/after vs the P0-4 baseline recorded for each touched surface.

---

## Phase P2 — Bundle & hydration

- **Goal:** Cut shipped/hydrated JS, concentrated on the public LCP-critical landing route and
  the heaviest authed editor route.
- **Backlog items in phase:** P2-1 (`roughjs` off `/` entry), P2-2 (`rough-notation` off Hero),
  P2-3 (`lenis/react` lazy for reduced-motion), P2-4 (`three`/`@firecms/neat` leak assertion +
  CI guard), P2-5 (`react-complex-tree` JS placement + CSS scope), P2-6 (editor entry-chunk
  split decisions), P2-7 (persisted-URL `<img>` → `next/image`), P2-8 (phosphor import
  hygiene), P2-9 (global CSS purge verify + font reconciliation).
- **What must be measured first:** **The P0 treemap is a hard precondition for every byte-sized
  item.** P2-1/2/3/4 need P0-3 (public treemap). P2-5/6 need P0-4 (authed treemap: shared vs
  route chunk; editor Lighthouse). P2-7 can proceed with the known remotePattern but bytes from
  P0-4 help prioritize. P2-8 is neutral (`optimizePackageImports`). P2-9 needs P0-3's prod
  per-route CSS to prove bloat before acting.
- **Entry gate:**
  - Relevant treemap captured (P0-3 for public, P0-4 for authed).
  - For P2-6: **editor Lighthouse + treemap captured** — do NOT pre-split blind.
  - For P2-5/P2-9: a verified flash/bloat risk plan (no unstyled-tree flash; CSS actually
    bloated in prod).
- **Owner gates:** None for the splits themselves. The CI **guard file** in P2-4 is additive;
  CI **activation** is owner-gated and lives in P5-5.
- **Exit / validation gate:**
  - Treemap re-run confirms each deferred lib (`roughjs`, `rough-notation`, `lenis`, `three`)
    left the relevant entry chunk; SSR markup intact; reduced-motion paths skip decoration.
  - Editor entry-chunk reduced and **TBT held vs the P0-4 baseline** (P2-6).
  - `react-complex-tree` JS only in editor + library-tree chunks; no unstyled-tree flash (P2-5).
  - `next/image` thumbs: bounded bytes + CLS 0; documented `blob:` exception preserved (P2-7).
  - Phosphor normalize: build passes, treemap unchanged (~0 impact confirmed) (P2-8).
  - Tailwind v4 purge confirmed active in prod; font discrepancy resolved (drop unused mono
    preload or apply intentionally) + design-system doc corrected (P2-9).

---

## Phase P3 — Data & server

- **Goal:** Eliminate server waterfalls, narrow payloads, push aggregation into RPCs, and
  reduce per-row RLS cost — the dominant authed cost (LCP ~3.5–3.9s is **server response**,
  observed).
- **Backlog items in phase:** P3-1 (collapse double identity resolution + parallelize awaits),
  P3-2 (explicit column projections; narrow editor tree payload — 67 `select('*')`), P3-3 (wire
  `get_project_chart_buckets`), P3-4 (RLS initplan + helper-chain — `is_platform_admin` bare
  `auth.uid()`), P3-5 (apply measured index candidates + advisor FKs), P3-6 (Excel export +
  share-read hot-path efficiency).
- **What must be measured first:** P0-4 authed baseline for P3-1/P3-2/P3-6. **EXPLAIN is
  mandatory** for P3-3 (RECURSIVE category climb), P3-4 (initplan eval), P3-5 (index
  justification) — and live EXPLAIN/RLS timing is currently **blocked** (RLS08), so these
  cannot proceed until a measurement path exists (P4-4 seed + owner DB access).
- **Entry gate:**
  - Code-level items (P3-1, P3-2, P3-6): P0-4 baseline + auth posture reconciled (keep
    `getUser()`-over-`getSession()`; keep the share firewall intact).
  - DB items (P3-3, P3-4, P3-5): **owner sign-off recorded** + EXPLAIN method available +
    representative seeded data (P4-4) + maintenance window.
- **Owner gates (DB items are owner-gated, EXPLAIN-first, maintenance-window):**
  - P3-3: hosted apply of the chart-buckets migration (GOV05) — currently a deploy-time
    landmine if wired before applied.
  - P3-4: RLS rewrite is a **security boundary** change (GOV06) — high risk, RLS regression
    suite mandatory.
  - P3-5: index adds need EXPLAIN proof; any **drop is irreversible** (GOV06).
- **Exit / validation gate:**
  - P3-1: auth still enforced; serverResponse + LCP improved vs P0-4 baseline.
  - P3-2: each narrowed query — UI has every field it reads; payload reduced.
  - P3-3: chart output byte-parity vs the JS fold (golden); EXPLAIN acceptable; hosted apply
    verified before any code depends on it.
  - P3-4: RLS regression suite green (every role sees exactly what it should); EXPLAIN shows
    initplan eval; timing improved.
  - P3-5: EXPLAIN before/after each index; planner uses it; no write-path regression; no
    over-indexing (28 migrations already have indexes — GOV03).
  - P3-6: share read byte-parity + firewall intact; export output unchanged; event still
    recorded off the hot path.

---

## Phase P4 — Production / RUM readiness

- **Goal:** Field telemetry + production-like proof so the readiness gate can ever return green.
- **Backlog items in phase:** P4-1 (resolve the field-RUM contradiction, then wire the chosen
  source), P4-2 (production-build authed Lighthouse + INP), P4-3 (close manual bfcache + React
  Profiler proof gates), P4-4 (seeded/realistic fixtures for peak-load).
- **What must be measured first:** P0-4 + P4-2 production builds; INP is **unmeasured**
  everywhere today. P4-3 needs real Chrome (not Playwright headless) for the bfcache proof.
- **Entry gate:**
  - **P4-1 is BLOCKED on an owner decision (GOV02).** Speed Insights RUM was removed in
    production as a security remediation; AS01/CR07/RT09/TG03 still recommend it. The owner must
    pick a path BEFORE any RUM package is touched:
    - **(a)** re-add `@vercel/speed-insights` *with the original security finding addressed*
      and sensitive-path redaction (`/share`, `/invite`, `/workshop` not leaked, mirroring the
      `@vercel/analytics` redaction already shipped), OR
    - **(b)** adopt `@vercel/analytics` + synthetic/Lighthouse as completion proof and rewrite
      the readiness acceptance criteria (docs 17/26) to not depend on Speed Insights.
  - Owner storage state + production build for P4-2/P4-3.
- **Owner gates:** P4-1 (security + governance — the hardest gate in the pack); P4-2/P4-4
  (authed storage state / non-production seed DB target — must not seed production).
- **Exit / validation gate:**
  - P4-1: the contradiction is **resolved in `.ai/10_state/decisions.md`**; if path (a), RUM
    rows appear in a **live deployment** AND `/share`/`/invite`/`/workshop` URLs are verified
    redacted; if path (b), readiness script green against the adopted source. Do **not** declare
    readiness on lab data alone.
  - P4-2: non-empty authed Lighthouse against `next start`; INP captured; CLOSED-BETA budget
    rows filled.
  - P4-3: DevTools "restored from bfcache" screenshot + production React Profiler trace of the
    keystroke path archived (do NOT re-propose virtualization without a real miss — GOV12).
  - P4-4: seed writes representative volumes to a **non-production** DB; benchmark runs against
    it (unblocks P3-5 EXPLAINs and P5-1).

---

## Phase P5 — Post-beta scale

- **Goal:** Larger structural investments justified only after beta + RUM data. Do not start
  for closed beta.
- **Backlog items in phase:** P5-1 (virtualization — only on a proven browser miss), P5-2
  (background jobs for export/AI/upload), P5-3 (CDN/image pipeline maturation), P5-4 (search/
  index expansion + pagination/virtualization for large lists), P5-5 (observability dashboard +
  regression budgets in CI).
- **What must be measured first:** P4-1 (RUM data must justify the investment), P4-4 (large
  seeded fixture), P4-3 (a captured real keystroke miss for P5-1).
- **Entry gate:**
  - Beta has shipped and produced RUM data (P4-1 path live).
  - For P5-1: a **captured real browser miss** in the P4-3 Profiler trace — the archived plan
    explicitly REJECTED speculative virtualization/`useDeferredValue`/`useOptimistic` (GOV12).
  - Owner decision for each gated item.
- **Owner gates (most of P5):**
  - P5-1: overrides an archived REJECTED decision (GOV12).
  - P5-2: background-job/Redis infra (deferred — GOV06).
  - P5-3: private-image edge caching needs security sign-off (RLS-gated buckets must not leak).
  - P5-4: index expansion (GOV06); do not re-touch archived surfaces (GOV04).
  - P5-5: CI/CD re-activation (deferred — GOV06).
- **Exit / validation gate:**
  - P5-1: Profiler shows keystroke cost dropped on a large fixture; small-estimate path not
    regressed; correctness unchanged.
  - P5-2: job lifecycle (enqueue→progress→complete→error) with output parity to the synchronous
    path.
  - P5-3: private images still RLS-gated, no bucket leak; sidebar-bg + dead assets reduced.
  - P5-4: lists fast at seeded volume; indexes EXPLAIN-justified.
  - P5-5: CI perf-smoke green against the SMOKE tier; dashboard shows live p75; no flaky job.

---

## Owner-decision checklist (block the phases that depend on each)

| Decision | Blocks | Finding |
|----------|--------|---------|
| Provide authed Playwright storage state | P0-4, P4-2 | TG10, TG07 |
| Field-RUM path (re-add Speed Insights w/ security fix **or** adopt analytics+synthetic) | P4-1, P5-5 | **GOV02**, AS01 |
| Apply `get_project_chart_buckets` migration to hosted | P3-3 | GOV05 |
| Authorize RLS initplan/helper rewrite (maintenance window) | P3-4 | GOV06, RLS01 |
| Authorize index adds (+ any irreversible drop) | P3-5, P5-4 | GOV06, RLS06 |
| Provide a non-production seed DB target | P4-4, P3-5 | TG04 |
| Authorize background-job/Redis infra | P5-2 | GOV06 |
| Authorize private-image edge caching (security review) | P5-3 | AS10 |
| Re-activate CI perf-smoke | P5-5 | GOV06, TG05 |

---

## Recommended next agent task

**Execute Phase P0-1 + P0-2 only** — they need no build, no owner gate, and no shared-artifact
contention, so they are safe to run immediately alongside concurrent agents:

1. **P0-1** — normalize `evidence/route-inventory.md` into a canonical
   `evidence/route-matrix.json` (route → type / dynamic / boundary coverage).
2. **P0-2** — relabel `e2e/route-transition-performance-budgets.json` as the SMOKE tier (no
   value changes) and add `e2e/route-transition-readiness-budgets.json` (CLOSED-BETA tier from
   `evidence/current-budgets.md` §2), with `scripts/check-route-transition-readiness.ts`
   selecting the tier. Keep `overlayCount: 0` and `prefetchRscRequestMin: 1`.

Then **STOP and request the owner gate for P0-3/P0-4** (build window + authed storage state)
before any measurement that needs a build. Do **not** start P1+ until the relevant P0 baseline
exists (GATE-0).

### Exact next prompt for Philip to run

> Execute ONLY Phase P0-1 and P0-2 from
> `.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/14_IMPLEMENTATION_PHASE_PLAN.md`.
> Constraints: small reversible changes only; do NOT run `bun run build` or `next dev` (shared
> `.next/` contention with concurrent agents); do NOT change any product source, dependency,
> migration, or provider setting; do NOT re-add `@vercel/speed-insights` (GOV02). Deliver:
> (1) `evidence/route-matrix.json` (canonical route inventory per P0-1); (2) a relabeled SMOKE
> budget file + a new `e2e/route-transition-readiness-budgets.json` CLOSED-BETA tier + checker
> tier-selection (P0-2), keeping the `overlayCount: 0` / `prefetchRscRequestMin: 1` assertions.
> Run the existing readiness-checker unit tests; report results. Then STOP and tell me exactly
> what owner gates you need (build window + authed Playwright storage state) before P0-3/P0-4.
> Land via `git push origin HEAD:main`, staging only the files you created/edited.
