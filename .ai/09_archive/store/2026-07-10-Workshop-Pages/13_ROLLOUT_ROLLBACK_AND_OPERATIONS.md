# 13 — Rollout, Rollback, and Operations

This is a contained client-render structure refactor with **no DB/migration/provider/data** change. Rollout = normal merge → build → deploy. Risk is contained to workshop chrome rendering.

## Phase sequencing (gates)
```
Phase 0 (baseline) ──> Phase 1 (shell split + migrate pages + reconcile nested + tests) ──> Phase 2 (gate-doc comment) ──> Phase 3 (content skeletons)
                                                                                          │
                                                                                          └ gates below must pass before merge
Phase 4 (cacheComponents) = optional, separate, owner-gated, later.
```

## Feature flags
- **No feature flag required.** The change is a same-route refactor (URLs unchanged; behavior is strictly "chrome persists where it didn't"). A flag would add complexity (two shell paths) without safety benefit since rollback = revert.
- If Philip prefers a flag: a `NEXT_PUBLIC_WORKSHOP_SHARED_SHELL` env could gate `WorkshopShell` vs per-page shells, but this is optional and not recommended.

## Deployment dependencies
- None beyond normal Next build + OpenNext/Cloudflare deploy.
- No migration order, no data backfill, no provider config.

## Go/no-go checklist (before merge)
- [ ] `bun run type-check` green
- [ ] `bun run build` green
- [ ] `bun run test` + `bun run test:dom` green (incl. updated shell-governance tests WP-1.7)
- [ ] `bun run lint` (+ `lint:design-system` if design surfaces flagged) green
- [ ] `bun run validate:error-handling` green (shell/error paths touched)
- [ ] SEC-1 denial tests pass (unauth, terms-pending, dev-bypass)
- [ ] Production-build `authenticatedWorkshopTransition` e2e: `MainSidebar` mounts once; dashboard skeleton absent on client nav; `overlayCount===0`
- [ ] DOM invariant: exactly one `[data-workshop-page-shell-root]`; `ProjectMiniSidebar` only under project subtree
- [ ] Manual prod-build nav matrix across all 4 canvas washes + library/project subtrees; ⌘1–5 shortcuts; bfcache back/forward
- [ ] No double-sidebar; no layout shift of chrome

## Rollback
- **Trigger:** chrome regression, double-shell, SEC-1 failure, broken nav/shortcuts, visual break across workshop.
- **Procedure:** `git revert` the Phase 1 merge commit (single contained change set). No data repair needed (no data touched). Redeploy.
- **Recovery verification:** revert lands → per-page shell behavior restored → SEC-1 denial tests green → e2e green.

## Observability
- Existing `WebVitalsProbe` (now relocated to `WorkshopShell`, survives nav — improvement) + `PerformanceMonitor` cover vitals/transition timing.
- Existing structured logging/`ops:*` unaffected.
- **Measurement gap (flagged, P2-1):** no production RUM for INP/CLS/LCP today. This fix is structurally correct but its real-world CWV win is not measurable in prod until a RUM sink is wired (out of scope; recommend a follow-up). Lab proof via `WebVitalsProbe`+Lighthouse in Phase 0/1 is the declared evaluator.

## Backward compatibility
- URLs unchanged (ARCH-1). No public API change. No DB change. Server Action/Route Handler contracts unchanged.
- The only "compatibility" surface is the shell-governance unit tests (WP-1.7) — updated in the same PR.

## Post-release monitoring
- Watch for: chrome layout shift reports, sidebar state loss across nav, bfcache restore issues, any SEC-1 anomaly (would be critical).
- 24–48h smoke on the production deploy; confirm no regression in the e2e perf budgets.

## Cost / licensing / dependency health
- No new dependency. No provider cost change (no data/egress change). React Compiler / View Transitions explicitly NOT added (non-goals, see 18/20).
