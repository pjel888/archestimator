# Test and Validation Strategy

Lightest proof that proves the claim (per directive §11 and AGENTS.md proportional verification). This pass is **planning-only**: its own validation is static review + `git diff --check` + the planning-suite's internal consistency checks. The matrix below covers the *future implementation phases*.

---

## 1. Test layers in the repo (verified)

- `bun test tests/unit` — 6 Bun unit tests.
- `vitest run --maxWorkers=1` — 624 jsdom component tests; `tests/vitest/perf/` (9 render-baseline/RPC files).
- `playwright test` — 9 e2e specs incl. `route-transition-performance.spec.ts`, `estimates-crud-latency.spec.ts`, `estimates-shell-streaming.spec.ts`, `workshop-route-error-boundaries.spec.ts`, `shared-link-receiver.spec.ts`.
- Storybook 10.4.6 (+ `addon-a11y`).
- CI bundle gate `scripts/check-performance-budgets.mjs`.

## 2. Test Execution Matrix (future phases)

Each row references a **Proof Contract ID (PC-*)** from `22_PROOF_CONTRACTS_AND_KNOWN_RED_LEDGER.md` §1, which carries the full `Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule` row.

| Requirement | Proof ID | Test file path | Test type | Fixture | Command | Expected evidence | Red/green | Known reds |
|---|---|---|---|---|---|---|---|---|
| UX-01 invite loading | PC-01 | `e2e/invite-loading.spec.ts` (new) | e2e | seeded invite token | `bun run test:e2e` | skeleton before content | red today | skip if invite disabled |
| UX-01 publisher/estimates loading | PC-02 | extend `workshop-route-error-boundaries.spec.ts` | e2e | seeded project | `bun run test:e2e` | skeleton renders | green after | — |
| UX-02 error boundaries | PC-03 | `e2e/workshop-route-error-boundaries.spec.ts` | e2e | force-error fixture | `bun run test:e2e` | in-place recovery | green after | — |
| UX-04 activity skeleton | PC-04 | grep | static | n/a | `rg "animate-pulse"` in activity loading | 0 hand-rolled | red today | — |
| UX-05 viewport | PC-05 | grep | static | n/a | `rg "export const viewport" src/app/layout.tsx` | present | red today | — |
| A11Y-01/03 loading a11y | PC-06 | `tests/vitest/loading-a11y.test.tsx` (new) | DOM | render loading UIs | `bun run test:dom` | role/aria-live/motion-reduce | red on gaps | — |
| A11Y-02 overlay focus | PC-07 | `e2e/overlay-focus.spec.ts` (new) | e2e (browser-only) | keyboard nav during transition | `bun run test:e2e` | focus correct | green after | skip no chromium |
| ARCH-02 estimate non-blocking | PC-08 | `e2e/estimates-shell-streaming.spec.ts` + `estimates-crud-latency.spec.ts` | e2e+perf | seeded estimate | `bun run test:e2e:perf` | skeleton-first; CRUD unchanged | red today | P2-T1 discovery gate |
| ARCH-03 share migration | PC-09 | `e2e/shared-link-receiver.spec.ts` + grep | e2e+static | seeded share token | `bun run test:e2e` + `rg` | no fetch-in-effect; FMP up | red today | — |
| UX-03 overlay suppression | PC-10 | extend `route-transition-performance.spec.ts` | e2e | skeleton route nav | `bun run test:e2e:perf` | overlay suppressed | green after | OPEN-UX-01 |
| **ARCH-07a stale path** | **PC-11** | grep | static | n/a | `rg 'revalidatePath\("/workshop/components"\)' src/lib` | 0 | **red today (bug)** | — |
| **ARCH-07b proposals revalidation** | **PC-12** | grep | static | n/a | `rg 'revalidatePath\("/workshop/proposals"\)' src/lib` | ≥1 | **red today** | — |
| **ARCH-07c publisher revalidation** | **PC-13** | grep | static | n/a | `rg 'revalidatePath\("/workshop/publisher"\)' src/lib` | ≥1 | **red today** | — |
| ARCH-01 agent rules | PC-14 | `scripts/validate-ai-workflow-adapters.mjs` | static | n/a | `bun run validate:agents` | exit 0 | green after | — |
| PERF-01 baselines | PC-15 | `metrics/` | evidence | per EV-* | `bun run perf:*` | baselines captured | n/a | — |
| PERF-02 RUM beacon (Tier 2 only) | PC-16 | `tests/vitest/web-vitals-beacon.test.ts` (new) | unit+security | beacon fixture | `bun run test:dom` | 204/413/400/429; no PII | n/a (new) | skip if Tier-1 |
| REL-02 perpetual-skeleton escape | PC-17 | `e2e/loading-timeout.spec.ts` (new) | e2e | network cut | `bun run test:e2e` | error after timeout | green after | — |
| ARCH-06 double-fetch | PC-18 | extend `route-transition-performance.spec.ts` | perf | mutation timing | `bun run test:e2e:perf` | one fetch path | green after | — |

## 3. Known-red validation ledger (see `22_...md` §2 for full table)

Summary of broad commands that are **not** relied on for this plan's claims:
- `bun run type-check` (default heap) — **known-red** (Node heap exhaustion; `.ai/10_state/current-state.md:186-187`). Future phases use `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check`.
- `bun run test:e2e:perf` authenticated scenarios — skip in CI without `PLAYWRIGHT_STORAGE_STATE` (PERF-04).
- bfcache `pageshow.persisted` — false in automation; manual Chrome gate.
- Production RUM — none today (PERF-02).

**This planning pass** validates via `git diff --check` (clean) + static review + grep/read + local-docs/Cloudflare-docs research. No broad command is claimed green.

## 4. Adversarial scenario matrix — see `19_RESEARCH...md` AQ-01..15 (full table)

Covers: malformed/oversized input, missing fields, auth denied, network drop, duplicate submit, race, stale cache, retry after partial success, cancellation, offline, misleading success, dirty-worktree/concurrent-agent safety, hung commands, flaky reruns, token-in-URL beacon redaction.

## 5. Validation for THIS planning pass

- **Static:** every doc cross-references correctly; no requirement untraced; no vague task; paths/symbols exact or marked BLOCKED/DISCOVERY.
- **`git diff --check`:** clean (no application code touched).
- **No tests run** (planning-only). Residual risk: none for the pass; future phases carry implementation risk.

## 6. Skipped/unavailable validation (honest)

- No native independent verifier (emulated).
- No browser/provider/hosted proof (planning-only) — future phases must add it (PC-07/08/10/17 are browser-only).
- No `bun run validate:agents` run yet (Phase 4 task — PC-14) — recorded as future evidence.
- Workers Analytics Engine free limits NOT VERIFIED (not relied on — Tier-1 uses Web Analytics, Tier-2 uses Workers Logs).
