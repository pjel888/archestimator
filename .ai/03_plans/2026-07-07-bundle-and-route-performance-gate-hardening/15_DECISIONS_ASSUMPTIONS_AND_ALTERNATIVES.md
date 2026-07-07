# Decisions, Assumptions, and Alternatives

## Architectural decisions

### DEC-01 — Layered gate posture (L1 per-PR / L2 pre-merge deep / L3 pre-release hosted)
- **Problem:** Gates fragmented; hosted not unified into a launch blocker; per-PR critical path at risk.
- **Constraints:** Must not slow routine iteration (brief); browser automation not default (brief).
- **Options:** (A) one mega-gate in CI; (B) layered L1/L2/L3; (C) hosted-only.
- **Advantages of B:** fast per-PR; deep available on demand; hosted pre-release.
- **Disadvantages of B:** three layers to maintain.
- **Recommended:** B.
- **Reason:** directly satisfies the brief's two constraints; matches existing tooling shape.
- **Consequences:** executors must respect layer boundaries (REL-01).
- **Conditions that would change it:** if the team shrinks to where three layers cannot be maintained, collapse L2 into L1 (looser) and rely on L3.

### DEC-02 — Per-route bundle budgets + global backstop; advisory→blocking after window
- **Problem:** Single 350 KB global budget hides heavy routes.
- **Options:** (A) status quo; (B) per-route + backstop; (C) per-route only.
- **Recommended:** B.
- **Reason:** per-route catches real regressions; backstop prevents catastrophic total-tree growth; existing diagnostics support it.
- **Rejected:** C (no total-tree protection); A (no per-route signal).
- **Conditions that would change it:** if per-route budgets prove too noisy, raise headroom or rely on backstop.

### DEC-03 — Reconcile the two route-transition budget sources into one Tier-A/Tier-B structure
- **Problem:** `e2e/route-transition-performance-budgets.json` (loose, CI) and `check-route-transition-readiness.ts` defaults (tighter, on-demand) drift.
- **Recommended:** one file with `tierA` + `tierB` blocks (or a typed module both import).
- **Reason:** eliminates split brain.
- **Conditions that would change it:** none likely.

### DEC-04 — Evidence-class per gate (static for bundle, browser for route-transition, hosted for p95)
- **Problem:** Brief says don't default to browser automation for every claim.
- **Recommended:** as in `12_*.md` table.
- **Reason:** matches repo proportional verification policy.

### DEC-05 — Flake policy before tightening (median-of-N, min runs, median>budget AND max>budget)
- **Problem:** Tight budgets + single-run measurement = flaky CI.
- **Recommended:** as in PERF-07.
- **Reason:** reliability of the gate matters as much as its tightness.

### DEC-06 — Authenticated Tier-B default = dev-auth bypass (localhost preview in CI), storage-state fallback
- **Problem:** Authed scenarios skipped in CI today.
- **Recommended:** dev-auth bypass (strongest signal-to-risk).
- **Reason:** localhost-only by code; no real credentials.
- **Rejected:** storage-state as primary (staleness, credential hygiene); status quo (gap).
- **Owner decision:** OPEN-PERF-02.

## Assumptions

- `ASSUMP-01:` Next 16 Turbopack emits `route-bundle-stats.json` with `{ route, firstLoadChunkPaths }`. (Verified `check-performance-budgets.mjs:42-55`.)
- `ASSUMP-02:` CI is `ubuntu-24.04`, `bun install --frozen-lockfile`, `bun run build` before perf step. (Verified `ci.yml`.)
- `ASSUMP-03:` Hosted target is the bound Worker `archestimator-proof` / `archestimator.com`. (From `AGENTS.md`/`wrangler.jsonc`.)
- `ASSUMP-04:` Free-tier/bundled Cloudflare posture unchanged. (From `AGENTS.md`.)
- `ASSUMP-05:` React Compiler off; Cache Components off. (Sibling plan.)
- `ASSUMP-06:` Sibling transition/loading UX plan Phase-0 baselines are compatible/coordinate-able. (Coordinate, not assume blindly — flagged in P0 prerequisites.)

## Alternatives rejected (summary)

See `06_*.md` "Architectural alternatives" and each DEC above. Headline rejections: hosted-in-CI (slow, location-sensitive); full Tier-B on every PR (slow, flaky); new unified gate runner (unnecessary layer); Lighthouse-CI in CI (overlaps hosted, needs deploy); single global bundle budget (hides heavy routes).

## Open decisions (owner)

| ID | Decision | Options | Recommended | Impact of each option | Owner |
|---|---|---|---|---|---|
| OPEN-PERF-01 | Strict-bundle promotion date + per-route values | (a) promote now; (b) 2-week advisory; (c) defer | (b) | (a) risk false-fails; (b) balance; (c) keep advisory gap | Owner |
| OPEN-PERF-02 | Auth mode for Tier-B in CI | (a) dev-auth bypass localhost; (b) storage-state; (c) on-demand only | (a) | (a) needs CI secret; (b) staleness; (c) gap | Owner |
| OPEN-PERF-03 | Hosted p95 as pre-release gate | (a) advisory; (b) blocking | (a)→(b) after stable URL | (a) gap; (b) false-block risk | Owner |
| OPEN-PERF-04 | Tightened Tier-B/Tier-A values | per Phase-0 | per Phase-0 + headroom | too tight = flake; too loose = gap | Owner |
