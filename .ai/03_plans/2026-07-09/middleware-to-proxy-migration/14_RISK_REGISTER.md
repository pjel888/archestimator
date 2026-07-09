# Risk Register

## Risk table

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| RISK-001 | Future developer naively renames `src/middleware.ts` → `src/proxy.ts` and breaks Cloudflare deploy | HIGH (warning is misleading; multiple AI agents have tried) | HIGH (production deploy breaks) | **P0** | Phase 1 in-source comment + preserve `proxy-file-convention.test.ts` | Owner | Open (Phase 1 unblocked) |
| RISK-002 | OpenNext Cloudflare never supports `proxy.ts` | MEDIUM (depends on OSS priorities) | LOW (warning remains cosmetic) | P3 | Phase 4 monitoring; consider upstream contribution | Owner | Accepted |
| RISK-003 | OpenNext Cloudflare adds proxy.ts support but team misses it | MEDIUM | LOW (warning continues; no runtime impact) | P3 | Phase 4 monthly check; npm release notifications | Owner | Open |
| RISK-004 | Next.js removes `middleware.ts` support entirely in a future major version | LOW (deprecation ≠ removal; typically 2 major version notice) | HIGH (would force migration) | P2 | Monitor Next.js release notes; Phase 4 includes Next.js major version checks | Owner | Accepted |
| RISK-005 | Concurrent agent edits `src/middleware.ts` during Phase 1 | LOW | LOW (Phase 1 is additive comment) | P3 | Coordination ledger; `git status` check before edit | Implementer | Open |
| RISK-006 | Phase 2 scratch-build experiment contaminates main repo | LOW (with `cp -r` approach) | MEDIUM (could affect deploys) | P2 | Use `/tmp/` copy; verify `git status` clean before and after | Implementer | Open |
| RISK-007 | Phase 3 rename misses one of 13 reference sites | MEDIUM (13 is non-trivial) | HIGH (silent monitoring false-pass) | **P0** | Atomic commit; verify with `rg "src/middleware"` returning zero non-test hits post-rename | Implementer | Blocked (Phase 3 not started) |
| RISK-008 | Phase 3 cf:build succeeds but cf:deploy fails at runtime | LOW (build catches most issues) | HIGH (production outage) | **P0** | Staging preview first; incremental rollout; rapid rollback | Implementer | Blocked |
| RISK-009 | State-doc reconciliation accidentally deletes historical context | LOW | LOW (history log should be append-only) | P3 | Mark superseded; do not delete | Phase 1 implementer | Open |
| RISK-010 | Plan pack becomes stale (e.g., 6+ months pass without Phase 3) | HIGH (organizational drift) | LOW (warning remains benign) | P3 | Phase 4 monthly check includes "is this plan still accurate?" | Owner | Accepted |
| RISK-011 | Independent reviewer not available; plan stays at `emulated` verification | MEDIUM | MEDIUM (cannot reach 98-100 readiness) | P2 | Owner review can substitute; explicitly approve Phase 1 | Owner | Open |
| RISK-012 | Next.js 16.2.x → 16.3.x or 17.x changes middleware-manifest format | LOW | MEDIUM (could affect OpenNext compat) | P2 | Phase 4 monitors Next.js patch releases | Owner | Accepted |
| RISK-013 | OpenNext Cloudflare major version bump changes `useNodeMiddleware()` API | LOW | MEDIUM (Phase 3 plan may need revision) | P2 | Re-audit OpenNext source on every `@opennextjs/cloudflare` version bump | Owner | Accepted |
| RISK-014 | Plan pack folder structure is incorrect per Archestimator convention | LOW | LOW (still discoverable) | P3 | Owner review; conform to existing `.ai/03_plans/` examples | Owner | Open |
| RISK-015 | Multiple AI agents propose conflicting Phase 1 implementations | LOW | LOW (doc-only) | P3 | Coordination ledger declares file ownership | Owner | Open |

## Risk concentration

The two **P0** risks (RISK-001, RISK-007, RISK-008) all relate to the **naive rename** scenario. Phase 1 directly mitigates RISK-001. RISK-007 and RISK-008 are Phase 3 concerns and are mitigated by the atomic-commit discipline + the regression test.

## Risk acceptance

The owner accepts:
- The cosmetic `bun dev` warning will continue indefinitely (RISK-002, RISK-003)
- The plan pack will age (RISK-010) — Phase 4 includes freshness checks

The owner does NOT accept:
- A naive rename breaking production (RISK-001, RISK-007, RISK-008) — mitigated by Phase 1 + test lock-in

## Insurance: existing test lock-in

`tests/vitest/proxy-file-convention.test.ts` is itself a risk control. It fails loudly if someone renames without updating tests. This is **intentional technical debt** that pays off as a regression preventer. Phase 1 should NOT remove or weaken this test.

## Insurance: Phase 1 in-source comment

The 3-line `// ponytail: middleware.ts is intentional...` comment is the cheapest, highest-leverage risk control. It converts RISK-001 from "HIGH probability" to "LOW probability" because future developers will see the comment AT the warning site before reaching for a rename.

## Insurance: shared-worktree coordination

Per `AGENTS.md` Section 6 and `.ai/AGENTS.md` high-concurrency addition (2026-07-05): Phase 1 implementer must:
1. Declare file ownership in coordination ledger
2. `git status --short --branch` before edit
3. Re-read file immediately before edit
4. Verify diff matches intent after edit
5. `git diff --check` minimum

This mitigates RISK-005.
