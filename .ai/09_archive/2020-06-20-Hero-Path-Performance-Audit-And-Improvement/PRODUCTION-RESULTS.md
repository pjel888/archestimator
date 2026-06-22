# Hero-Path Production Performance — RESULTS (2026-06-20)

Measured on the **live production deployment** (`https://www.archestimator.com`, latest `main`), authenticated as Philip, from a Philippines residential connection.

## Headline

The hero path is now **production-grade fast**, and the decisive fix was **infrastructure geography, not code**:

- Supabase is in `ap-southeast-2` (Sydney). Vercel functions were running in the **default `iad1` (US-East)** region (no `regions` in `vercel.json`).
- Every authenticated render made ~10–15 **sequential** Supabase calls across **US-East ⇄ Sydney** (~200 ms each) → ~3 s per page.
- **Fix:** `vercel.json` → `"regions": ["syd1"]` (commit `1930f7f2`), co-locating functions with the DB (in-region round-trips ~1–5 ms) and moving compute closer to AU/Asia users. Config-only, **zero code, zero UX/UI change**.

## Before → After (bridge-independent server timing, full authenticated SSR render, n=12)

| Hero route | us-east (cross-region) | syd1 (co-located) | Speedup |
|---|---:|---:|---:|
| `/workshop` | 2982 ms | **723 ms** | 4.1× |
| `/workshop/projects` | 3546 ms | **793 ms** | 4.5× |
| `/workshop/projects/[id]` | 3281 ms | **812 ms** | 4.0× |
| `.../estimates` | 3385 ms | **810 ms** | 4.2× |
| `.../estimates/[nodeId]` (sheet) | 3542 ms | **898 ms** | 3.9× |

After: low variance (min 655–782 ms, p75 ≤ 924 ms, max mostly ≤ 1.2 s). These ~700–900 ms full page loads from the Philippines (across the Pacific to Sydney) are near the geographic floor (PH↔Sydney RTT ~120–150 ms each way + render + 160–575 KB transfer).

In-app soft-nav (real-browser, n=5, noisier — the WebBridge poll adds lag + one 6.8 s network blip): medians 756–1363 ms with many sub-second samples (628/622/616/753/803/892 ms). Soft-nav fetches lighter RSC payloads than full HTML, so true soft-nav cost ≈ the server-timing numbers or better.

Artifacts: `benchmarks/hero-server-prod-syd1.json` (after), `benchmarks/hero-server-prod-deployed.json` (before/us-east), `benchmarks/hero-browser-prod-syd1.json`, `benchmarks/hero-browser-prod-deployed.json` (before/us-east), `benchmarks/hero-browser-prod-baseline.json` (local).

## Everything that shipped (all in `main`, deployed)

Code optimizations (commits `7c9addb2`, `ad0ba34a`, `260a7470`) — safe, zero-UX: server-client request-memoization (`cache()`), parallelized shell loader tail, dynamic-imported the 759 kB sheet route's modals + settings/feedback bodies + flag-off copilot, dashboard→sheet hover-prefetch, immutable image-proxy cache, tabs `refetchOnMount:false`. These reduce per-render work and round-trips and help in every region.

Infra fix (commit `1930f7f2`) — the dominant ~4× win: Vercel `syd1` region.

## Why local benchmarks were misleading (for the record)

Local `next start` on this dev machine → hosted Supabase RTT is 0.3–5 s/call, so local authenticated routes measured 4–10 s — pure network noise, not code. The DB executes in <1 ms in-region. Only the in-region production deploy gave a trustworthy number. See `audit/AUDIT-2026-06-20.md`.

## Optional further wins — DONE 2026-06-20 (owner-approved, Loop 7)

- **Round-trip reduction** — investigated; the project + estimate-sheet loaders are ALREADY optimally parallelized (prior passes). No change warranted (remaining serial awaits are real data deps / auth-ordering gates).
- **Per-row RLS `(select auth.uid())` hoist** — DONE + LIVE on prod (migration `20260620103306`, commit `ebf28a0b`). Wraps `is_platform_admin`/`is_workspace_admin`/`current_user_profile`; outcome-identical (row-parity verified); `is_platform_admin()` per-row ~14.5× faster. (Policies were already `(select …)`-wrapped.)
- **Estimates-list virtualization** — DONE (commit `8c611d13`), INVISIBLE (`@tanstack/react-virtual` windowing, same as the sheet); scales the list without UX change. Ships on next deploy.
- **`@vercel/speed-insights`** — DONE (commit `edff2480`), owner-approved Option B; telemetry decision record reopened/superseded; route-pattern attribution (no token/ID leakage). Ships on next deploy; collects field data once live (confirm enabled in Vercel dashboard → Speed Insights).

Still open (larger effort, not requested): Edge/streaming or partial-prerender for the shell.

### Deploy note — DEPLOYED 2026-06-20
All optional wins are now LIVE in production. Because the working tree had a large concurrent estimate-sheet redesign from other agents (57 dirty files), I deployed from a **clean throwaway worktree at committed HEAD** (`8c611d13`) via `vercel --prod` (deployment `dpl_8HFESiijcbXd38wxoPbRfLR75BoF`, aliased to www.archestimator.com) — shipping only my verified commits (region fix + RLS migration file + Speed Insights + virtualization) and NOT the other agents' in-progress work. Speed Insights confirmed live (`/_vercel/speed-insights/script.js` → 200; component in the build) — the Vercel dashboard onboarding clears once real traffic arrives.

Post-deploy regression benchmark (server timing, n=12 ×2): warm/min **674–908 ms** per route (estimates 769 ms median) — matches the pre-optwins `syd1` result; no regression. Wider medians/maxes are residential PH↔Sydney network variance + fresh-deploy cold-starts, not code (virtualization is client-only, RLS neutral-to-faster, response bytes unchanged). Artifacts: `benchmarks/hero-server-prod-syd1-optwins{,-warm}.json`.

Still uncommitted (owner to fold into the next unified commit): the concurrent estimate-sheet redesign (other agents), the `.ai` plan-folder rename + these docs, and the `bench-hero-*.mjs` path tweaks.

## Re-run anytime
`BENCH_BASE_URL=https://www.archestimator.com node scripts/bench-hero-server.mjs 12 <label>` (bridge-independent; needs a fresh `/tmp/hero-storage-state.json` auth capture — see `scripts/bench-hero-server.mjs` header). Browser soft-nav: `BENCH_BASE_URL=https://www.archestimator.com node scripts/bench-hero-browser.mjs 5 <label>` (bridge running + signed in; keep runs ≤5 to avoid harness poll-lag inflation).
