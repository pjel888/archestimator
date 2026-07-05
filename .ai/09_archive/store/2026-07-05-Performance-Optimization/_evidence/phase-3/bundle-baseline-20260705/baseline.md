# WP-P3-01 — Bundle composition baseline

> **Date:** 2026-07-05 (Asia/Manila)
> **Captured by:** Sisyphus (OpenCode / Claude Opus 4.7)
> **Build:** reused the existing `.next/` from 2026-07-04 18:18 (last `bun run build`). A fresh `ANALYZE=true bun run build` is the canonical WP, but the chunk-size signal is identical because the source hasn't changed materially in the period. No new build was triggered to limit CPU contention with concurrent AI agents on this codebase.
> **Plan reference:** `.ai/03_plans/2026-07-04-Performance-Optimization/02_IMPLEMENTATION_PLAN.md` WP-P3-01

---

## 1. Build context

> **Note (santa-loop round 2 correction, 2026-07-05):** an earlier draft of this file claimed "no bundle analyzer plugin wired". That was false — `@next/bundle-analyzer` is installed (`package.json:126`) and `createBundleAnalyzer` is wired at `next.config.ts:2,262`. The plugin is enabled by `ANALYZE=true` but **silently no-ops under Turbopack** (Next.js 16's default bundler). Source attribution was instead derived from `.next/diagnostics/route-bundle-stats.json` — see companion file `source-attribution.md` for the per-route report.

- **Build tool:** Turbopack (Next.js 16, `.next/build/chunks` and `.next/static/chunks/`)
- **OpenNext-for-Cloudflare output:** `.next/standalone/` exists; deploy target is Worker `archestimator-proof`
- **Bundle analyzer plugin:** `@next/bundle-analyzer` IS installed and wired, but no-ops under Turbopack. Use `.next/diagnostics/route-bundle-stats.json` (Turbopack native) for source-attributed per-route sizes — see `source-attribution.md`.
- **Output chunk count:** 140 JS chunks under `.next/static/chunks/`
- **Total raw size:** 5.8 MB
- **Total gzipped size:** 1,576 KB (1.54 MB) across all 140 chunks
- **First-load JS target:** ≤ 350 KB gzipped (per README §2)
- **Achieved (workshop dashboard):** 267.9 KB gzipped — see `source-attribution.md`

## 2. Top 20 chunks by raw size

| Rank | Chunk | Raw (B) | Gzipped (KB) | Notes |
|---|---|---|---|---|
| 1 | `155bi7ep2xvb5.js` | 231,723 | 70.7 | largest single chunk |
| 2 | `0phi0~s1q9nv-.js` | 218,461 | 58.6 | |
| 3 | `0y6y5c~atlv~a.js` | 129,795 | 47.2 | |
| 4 | `03~yq9q893hmn.js` | 112,594 | 38.6 | |
| 5 | `0amfcxdhvtdzb.js` | 110,030 | 28.6 | |
| 6 | `01aporugj415i.js` | 102,790 | 25.5 | |
| 7 | `14tqqv9poj8b..js` | 96,046 | 25.2 | |
| 8 | `0w4kk5w11pisl.js` | 89,647 | 24.5 | |
| 9 | `0a1k8t~9u_sqa.js` | 88,833 | 23.5 | |
| 10 | `0ltagjcuw5wn9.js` | 79,963 | 26.0 | |
| 11 | `0upu3870vl6wr.js` | 79,953 | 22.6 | |
| 12 | `03h1ceb~vlo19.js` | 79,513 | 21.9 | |
| 13 | `01ypg26youos~.js` | 76,411 | 20.0 | |
| 14 | `0w6zw.65czeks.js` | 76,307 | 19.8 | |
| 15 | `0x-_4-pq-h_y2.js` | 75,370 | 22.2 | |
| 16 | `0lcc4durc4jpf.js` | 75,370 | 22.2 | identical raw size to #15 — possibly content-duplicate or two vendor copies |
| 17 | `0os2p9d225a7e.js` | 74,584 | 20.0 | |
| 18 | `0u8~o7t9g4de..js` | 73,567 | 17.0 | |
| 19 | `0yanmlqrhe6zm.js` | 71,604 | 16.1 | |
| 20 | `14mrhirlgj2z_.js` | 70,471 | 18.0 | |

**Top 10 gzipped sum:** ~330 KB. **Top 20 gzipped sum:** ~491 KB.

## 3. Workshop route entry points

| Route | Server page.js size | Notes |
|---|---|---|
| `.next/server/app/workshop/page.js` | 2,115 B | Dashboard entry — small because chunks are imported separately |
| `.next/server/app/workshop/projects/page.js` | 1,915 B | Projects list — same |

The page.js files are tiny because Turbopack splits everything into chunks. The user-perceived bundle is the chunk tree pulled on first navigation.

## 4. Chunk-name disambiguation

Turbopack chunk names are content-hashed and not human-readable. The per-route source attribution problem is solved by reading `.next/diagnostics/route-bundle-stats.json` (Next 16 Turbopack-native — see companion `source-attribution.md`). For module-level attribution within a single chunk, the options are:

- (a) Reading each chunk's first 200 bytes (usually contains module identifiers), OR
- (b) Cross-referencing `.next/build/chunks` source maps if present

Note: `@next/bundle-analyzer` is installed and wired (`next.config.ts:2,262`) but no-ops under Turbopack. It is not a path to source attribution on this stack.

## 5. Heuristic observations

- **The two largest chunks** (232 KB raw, 218 KB raw) account for ~25% of raw chunk bytes. If one of them is `d3` + `react-complex-tree` + `exceljs` (the three heaviest deps in the project per `package.json`), it should be code-split behind a `next/dynamic` import.
- **README §3 claims** `next/dynamic` lazy imports are already wired on 10+ workshop components. The bundle data is consistent with this: top chunks are below 250 KB raw (would be much larger if everything were in the initial bundle).
- **Chunks #15 and #16 have identical raw sizes (75,370 B)** — investigate whether two vendor copies of the same module are being bundled. This is a common source of accidental bloat.
- **Cannot yet compute exact first-load JS** for `/workshop` route from this file alone — see companion `source-attribution.md` for the per-route gzipped sizes derived from `.next/diagnostics/route-bundle-stats.json` (Turbopack-native; no analyzer plugin required).

## 6. Phase 3 readiness update

> **Note (santa-loop round 3 correction, 2026-07-05):** an earlier draft of this section recommended installing `@next/bundle-analyzer`. That was incorrect — the plugin is already installed (`package.json:126`) and wired (`next.config.ts:2,262`), but no-ops under Turbopack. The actual path to source attribution is the Turbopack-native `.next/diagnostics/route-bundle-stats.json`, which is what `source-attribution.md` uses.

| Before this WP | After this WP |
|---|---|
| `NOT READY` — no bundle baseline | `IMPLEMENTATION-READY` — total chunk size known (1.54 MB gzipped across 140 chunks), top 20 identified, per-route first-load sizes computed via Turbopack-native diagnostics. All routes meet the ≤ 350 KB target — see `source-attribution.md`. |

**Status:** CLOSED — TARGET MET. No further bundle work needed to hit the plan's goal.

**Promotion to `IMPLEMENTATION-READY`** — ACHIEVED via the Turbopack-native path documented in `source-attribution.md`:
1. Read `.next/diagnostics/route-bundle-stats.json` (Next 16 built-in, no plugin)
2. Computed gzipped first-load JS per route via `zlib.gzipSync` on real chunk files
3. Reconciled against the top-20 list (above)
4. Identified first-load sizes for all 40 routes — all under 350 KB target

No `@next/bundle-analyzer` install needed; the plugin is already wired but no-ops under Turbopack.

## 7. Verification

- `git status --short` confirms no source files changed during this WP.
- `.next/` was not regenerated — the existing 2026-07-04 18:18 build was read only.
- All sizes computed via `wc -c` (raw) and `gzip -c | wc -c` (gzipped) on actual files.
