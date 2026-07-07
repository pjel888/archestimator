# Test And Validation Strategy

## Testing philosophy for this pack

The brief's constraint — "do not default to browser automation for every claim" — drives the evidence-class choice per gate:

| Claim class | Evidence class | Why |
|---|---|---|
| Bundle size per route | **Local static** (build artifact + gzip) | Deterministic; no browser needed |
| Route-transition latency/overlay/skeleton | **Browser/manual** (Playwright) | Browser-only behavior (navigation, overlay visibility, RSC requests) |
| Hosted TTFB p95 | **Provider-backed** (hosted Worker probe) | Real edge behavior; not reproducible locally |
| Flake/retry semantics | **Local automated** (unit test for budget-resolution pure functions) | Logic is pure |

This matches the repo's proportional verification policy (`AGENTS.md`): browser proof only for browser-only claims.

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| PERF-02 (per-route budget resolution) | `tests/unit/check-performance-budgets.test.ts` (proposed) | Unit (bun test) | New | Synthetic diagnostics JSON | `bun test tests/unit/check-performance-budgets.test.ts` | Per-route verdicts match budget map | None | Executor (P1) |
| PERF-02 (strict gate) | `scripts/check-performance-budgets.mjs` (script run) | Static build | Existing | `bun run build` output | `bun run build && bun run scripts/check-performance-budgets.mjs --strict` | Exit 0 when all ≤ budget | None | Executor (P1) |
| PERF-03 (reconciled budgets) | `tests/unit/route-transition-budgets.test.ts` (proposed) | Unit | New | Budgets JSON | `bun test tests/unit/route-transition-budgets.test.ts` | Both consumers read same source | None | Executor (P2) |
| PERF-03/04 (Tier-A CI smoke) | `e2e/route-transition-performance.spec.ts` | E2E (Playwright) | Existing | None (public) / dev-auth bypass (authed) | `bun run test:e2e:perf` | Medians ≤ Tier-A budgets; overlay counts 0 | Authed skipped in CI today | Executor (P2/P3) |
| PERF-04 (Tier-B deep) | `scripts/measure-route-transitions.ts` + `scripts/check-route-transition-readiness.ts` | E2E + verifier | Existing | Seeded fixture + dev-auth/storage-state | `bun run perf:measure-routes` then `bun run perf:check-routes` | Tier-B readiness `routeTransitionReady=true` | Needs localhost dev-auth or storage-state | Executor (P3) |
| PERF-04 (peak-load profile) | `tests/vitest/route-transition-peak-load-profile.test.tsx` | Vitest DOM | Existing | Component fixtures | `bun run perf:profile-peak-load` | Profile completes; assertions pass | None known | Executor (P3) |
| PERF-06 (hosted p95) | `scripts/verify-cloudflare-hosted-performance.ts` | Provider-backed | Existing | Hosted URL + fake token | `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL=… bun run cf:verify-hosted-performance` | Route-contract ready; p95 report | `features`/pricing location-sensitive historically | Operator (P4) |
| SEC-01 (credential-free posture) | Static review of `verify-cloudflare-hosted-performance.ts` | Static inspection | Existing | None | `rg` for fetch/secrets | No real tokens, no mutation | None | Reviewer |
| OPS-01 (triage runbook) | Runbook doc | Static review | New | None | Read | Decision tree covers all gates | None | Executor (P5) |

## Known-red / known-flaky ledger

| Item | Class | Status | Source |
|---|---|---|---|
| `bun run type-check` default Node heap | Known-red (heap) | Use `--max-old-space-size` per sibling plan `22_*.md` | Sibling plan known-red ledger |
| Authenticated `test:e2e:perf` scenarios | Skipped in CI | Run Tier-B via P3 | `route-transition-performance.spec.ts:345-349` |
| Hosted `features`/pricing strict p95 | Location-sensitive | Watch-grade; re-run | `.ai/10_state/current-state.md:2836` |

## Repository-native commands (verified from `package.json`)

- `bun run validate` — full local gate (type-check + lint + design-system + design + test + test:dom)
- `bun run type-check` — `tsc --noEmit`
- `bun run build` — `next build` (produces diagnostics)
- `bun run test:e2e:perf` — `playwright test e2e/route-transition-performance.spec.ts`
- `bun run perf:measure-routes` — `scripts/measure-route-transitions.ts`
- `bun run perf:check-routes` — `scripts/check-route-transition-readiness.ts`
- `bun run perf:seed-fixture` — `scripts/seed-performance-test-data.ts`
- `bun run perf:profile-peak-load` — vitest peak-load profile
- `bun run cf:verify-hosted-performance` — hosted p95
- `ANALYZE=true bun run build` — `@next/bundle-analyzer`

## Validation rules

- Do not claim a command passed unless it was run and its output read.
- For hosted proof, the verifier's `routeContractReady` (hard gate) and `p95BudgetReady` (watch) must both be recorded; do not conflate them.
- For Tier-B, record the auth mode used (dev-auth-bypass vs storage-state) in the evidence artifact.
- No "manual QA" acceptance without exact steps, actor, setup, observations, and pass/fail criteria.

## Adversarial QA for future implementation

See `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` for the adversarial scenario matrix (TEST-02). Key scenarios: budget-miss on a real regression, flake (single-run spike), missing diagnostics, partial-read chunk, auth-failure-during-measure, hosted route-contract fail, budget-map-missing-route, concurrent-agent edit to budgets file.
