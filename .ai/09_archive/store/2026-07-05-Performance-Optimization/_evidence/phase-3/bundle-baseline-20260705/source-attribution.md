# WP-P3-01 — Bundle composition baseline (source-attributed)

> **Date:** 2026-07-05 (Asia/Manila)
> **Captured by:** Sisyphus (OpenCode / Claude Opus 4.7)
> **Build:** fresh `bun run build` with `NODE_OPTIONS=--max-old-space-size=8192` (default Turbopack; `@next/bundle-analyzer` does not work with Turbopack and was silently ignored)
> **Source attribution:** `.next/diagnostics/route-bundle-stats.json` (Next.js 16 built-in route-bundle diagnostics — Turbopack-native, no plugin required)
> **Plan reference:** `.ai/03_plans/2026-07-04-Performance-Optimization/02_IMPLEMENTATION_PLAN.md` WP-P3-01

---

## 1. Headline result

**ALL workshop routes meet the plan's ≤ 350 KB gzipped first-load target.**

| Surface | First-load gzipped | Raw uncompressed | Chunks | Plan target | Verdict |
|---|---|---|---|---|---|
| `/workshop` dashboard | **267.9 KB** | 917.1 KB | 18 | ≤ 350 KB | ✅ PASS |
| `/workshop/projects/[projectId]/estimates/[nodeId]` (estimate editor) | **275.8 KB** | 926.3 KB | 21 | ≤ 350 KB | ✅ PASS |
| `/share/[token]` (shared proposal viewer) | **248.8 KB** | 840.8 KB | 16 | ≤ 350 KB | ✅ PASS |
| `/workshop/projects` (projects list) | 305.5 KB | 1043.3 KB | 19 | ≤ 350 KB | ✅ PASS |
| `/workshop/library/templates/[templateId]` (heaviest route) | **335.2 KB** | 1112.6 KB | 29 | ≤ 350 KB | ✅ PASS (margin: 14.8 KB) |

The plan's target is met across the board. **No bundle-splitting work is required to hit the target.**

## 2. Methodology

The `@next/bundle-analyzer` plugin (`createBundleAnalyzer` wired at `next.config.ts:262`) does not work with Turbopack — Next.js 16's default bundler. ANALYZE=true silently no-ops.

Instead, used `.next/diagnostics/route-bundle-stats.json` — Turbopack's built-in per-route bundle diagnostics, written automatically on every `next build`. Each route entry contains:

```json
{
  "route": "/workshop",
  "firstLoadUncompressedJsBytes": 938192,
  "firstLoadChunkPaths": [".next/static/chunks/...", ...]
}
```

For each route, summed raw chunk sizes, then computed gzipped sizes via `zlib.gzipSync` per chunk and summed.

## 3. All routes ranked (gzipped first-load JS)

| Rank | gz KB | raw KB | chunks | route |
|---|---|---|---|---|
| 1 | 335.2 | 1112.6 | 29 | /workshop/library/templates/[templateId] |
| 2 | 327.6 | 1114.0 | 22 | /workshop/projects/[projectId]/estimates |
| 3 | 305.5 | 1043.3 | 19 | /workshop/projects |
| 4 | 286.8 | 960.0 | 20 | /workshop/projects/[projectId]/data |
| 5 | 283.9 | 958.8 | 19 | /workshop/projects/[projectId] |
| 6 | 277.7 | 935.5 | 19 | /workshop/projects/[projectId]/activity |
| 7 | 275.8 | 926.3 | 21 | /workshop/projects/[projectId]/estimates/[nodeId] |
| 8 | 270.9 | 930.1 | 19 | /workshop/publisher |
| 9 | 269.4 | 909.6 | 18 | /workshop/projects/[projectId]/charts |
| 10 | 267.9 | 917.1 | 18 | /workshop (dashboard) |
| 11 | 256.5 | 829.7 | 17 | / (landing) |
| 12 | 255.9 | 867.3 | 22 | /workshop/library/components |
| 13 | 255.7 | 867.1 | 22 | /workshop/library/templates |
| 14 | 252.1 | 858.5 | 19 | /workshop/library |
| 15 | 248.8 | 840.8 | 16 | /share/[token] |
| 16 | 239.3 | 818.4 | 16 | /workshop/proposals |
| 17 | 234.8 | 799.6 | 16 | /workshop/settings/scan-overrides |
| 18 | 234.3 | 797.2 | 16 | /workshop/feedback |
| 19-24 | 233.4 | ~794 | 16 | /workshop/settings/{feedback,upload-operations,users,profile,workspace} |
| 25 | 229.6 | 782.0 | 16 | /workshop/settings |
| 26 | 213.8 | 723.0 | 15 | /workshop/terms |
| 27-29 | 206.4 | 703.1 | 14 | /workshop/{components,onboarding,templates} |
| 30-32 | 197-198 | ~670 | 15 | /{features,trust,about,contact,pricing,privacy,terms} |
| 33-34 | 189.9 | 645.6 | 14 | /{login,signup} |
| 35-37 | 183.8 | 628.4 | 13 | /{_not-found,access-required,invite/[token]} |

## 4. Heaviest single chunks (gzipped)

| Rank | Chunk | Raw (KB) | Gzipped (KB) | Notes |
|---|---|---|---|---|
| 1 | `155bi7ep2xvb5.js` | 226.3 | 70.7 | largest single chunk; likely vendor code (Next runtime + shared modules) |
| 2 | `0phi0~s1q9nv-.js` | 213.3 | 58.6 | likely vendor code |
| 3 | `0y6y5c~atlv~a.js` | 126.8 | 47.2 | |
| 4 | `03~yq9q893hmn.js` | 109.9 | 38.6 | |
| 5 | `0amfcxdhvtdzb.js` | 107.4 | 28.6 | |

(Chunk names are Turbopack content-hashes; module-level source attribution requires reading source maps which are not currently emitted for static chunks.)

## 5. Observations

- **Workshop dashboard first-load = 267.9 KB gzipped** — comfortably under the 350 KB target with 82 KB of headroom.
- **Heaviest route (template editor) = 335.2 KB** — only 14.8 KB of headroom. If the template editor grows, it will be the first to breach.
- **Landing page (`/`) = 256.5 KB** — strong; existing Lenis + landing components are well-split.
- **Share viewer = 248.8 KB** — below target with 101 KB of headroom. Existing `routeStaticPublicPageThroughCache` worker short-circuit and CSP/no-store headers remain the right architecture.
- **Per-route chunks are well-distributed (14-29 chunks per route)** — no monolithic bundle; existing `next/dynamic` lazy imports are working.
- **No bundle optimization work is required to hit the plan's target.** The codebase's existing chunk-splitting discipline (per README §3) already meets the bar.

## 6. Phase 3 readiness update

| Before this WP | After this WP |
|---|---|
| Bundle size unknown | All routes measured; **all routes meet the ≤ 350 KB gzipped target** |

**Promotion:** WP-P3-01 → **CLOSED — TARGET MET**. Phase 3 bundle work is not needed to hit the plan's goal. React Profiler traces (WP-P3-02) remain a separate measurement that would surface per-keystroke render cost on the estimate editor — that work is independent of bundle size.

## 7. Tooling recommendation (non-blocking)

If future regressions push routes over 350 KB, the recommended cheap detector is a CI advisory that parses `.next/diagnostics/route-bundle-stats.json` after every build and warns when any route's gzipped first-load size exceeds 350 KB. This requires no analyzer plugin — Turbopack emits the data natively.

This is captured as Phase 4 WP-P4-01 advisory budget gate.

## 8. Verification

- `git status --short` confirms no source files changed during this WP.
- Build succeeded with `NODE_OPTIONS=--max-old-space-size=8192`; default Turbopack.
- All sizes computed from real chunk files via `zlib.gzipSync` (not estimated).
- `.next/diagnostics/route-bundle-stats.json` is a Next 16 built-in artifact — no plugin required.
