# 13 — Rollout, Rollback, and Operations

## Rollout shape

- **Closed-beta, single-workspace scale.** No staged rings, no dark launch.
- The feature lands behind **no feature flag** by default (per `02` non-goals + closed-beta stage gate). If Philip wants a kill switch, the implementation can add `NEXT_PUBLIC_PROJECT_ACTIVITY_PAGE_ENABLED` (OPS-01, P2).
- Implementation lands on `main` via a normal PR.
- No production deploy step from this plan (per `AGENTS.md` "no prod deploy unless asked").

## Pre-deployment checklist

- [ ] Focused checks green: `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run lint:design`, `bun run test:dom -- project-activity-page`
- [ ] `bun run validate` exits 0, or every non-zero failure is documented as a pre-existing unrelated suite per `current-state.md` FAST PATH
- [ ] `bun run build` exit 0
- [ ] Manual browser QA completed
- [ ] Authenticated performance evaluator within budget
- [ ] Security denial tests green
- [ ] a11y manual pass
- [ ] Scoped collaboration-audit RPC migration has rollback/fix-forward SQL, generated types, direct-table-denial proof, and authorized/unauthorized RPC proof
- [ ] `rg "service_role|supabaseAdmin" src/app/api/projects src/components/workshop/project-activity src/lib/repositories/project-activity-feed-repository.ts` returns zero matches
- [ ] `rg "dangerouslySetInnerHTML" src/components/workshop/project-activity` returns zero matches

## Deployment steps

1. Merge the implementation PR to `main`.
2. The existing CI workflow (`.github/workflows/ci.yml`) runs `bun run validate` + `bun run build` + Playwright smoke on the merge.
3. Vercel auto-deploys from `main` (existing pipeline).
4. After Vercel deploy, the owner can verify on the production URL.

This plan does **not** authorize production deploy from this run.

## Rollback trigger

Trigger rollback if **any** of the following occurs within 24h of merge:

| Signal | Source | Action |
|---|---|---|
| Route returns 5xx error rate > 1% | Vercel logs / observability | Roll back the merge |
| Initial route TTFB p95 > 1.5s sustained | Server-Timing / RUM | Roll back and file perf bug |
| P0/P1 correctness bug filed | GitHub issue | Roll back and fix forward |
| Security regression suspected | Any | Roll back immediately and run security review |
| Bundle size regression > 20 KB | Bundle report | Investigate; roll back if UI jank |

## Rollback steps

1. `git revert <merge-commit>` (or click "Revert" in GitHub UI on the PR).
2. Push the revert to `main`.
3. Vercel re-deploys automatically.
4. Confirm the route returns the original 15-line placeholder (or 404 if the revert removes the route folder).
5. File a follow-up issue describing what broke and what's needed before re-enabling.

DB rollback is required if the scoped collaboration-audit RPC migration landed: revoke/drop `read_project_collaboration_audit_events(...)` and drop the optional 3-column index using the SQL in `07_DATA_DATABASE_API_NETWORK_PLAN.md`.

## Monitoring and alerting

- **Server-Timing** header on the route (via `withPerfTraceRequest` and `traced`) surfaces timing breakdown to browser dev-tools.
- **Console warnings** (`[project-activity] source unavailable: <source>`) are visible in Vercel logs; alert on frequency spikes if Vercel log drain is configured.
- **No new metrics dashboard required for v1.** Closed-beta scale doesn't justify it.

## Observability gaps

- No dedicated activity-page RUM dashboard. Acceptable for closed-beta.
- No structured alerting on partial-source events. Acceptable for closed-beta.
- If/when the page sees real users, add: Vercel Analytics goal on "Load more" clicks; structured log aggregation on source-unavailable events.

## Runbook (operational)

| Symptom | Likely cause | First action |
|---|---|---|
| Page renders empty forever | All 6 sources empty for this project | Verify in Supabase: are there any rows? |
| Page shows partial banner always | One source's RLS policy, RPC, or grant is misbehaving | Check source label; for collaboration audit, verify direct deny + RPC execute grant |
| Page TTFB is slow | Count queries or collaboration-audit RPC/index path is slow | Run `EXPLAIN`; add or adjust the narrow index only with evidence |
| Recipients dropdown empty | No active publications on this project | Confirm in Supabase: `select * from project_publications where project_id = ? and status = 'published' and revoked_at is null` |
| "Load more" returns same items | Cursor decoder or loader request regression | Check cursor encode/decode and `src/app/api/projects/[projectId]/activity/route.ts` validation |
| 500 error on route | Unhandled exception in repository | Check Vercel logs; the `error.tsx` boundary caught it for the user; fix forward |

## Post-release verification

Within 24h of merge:
- [ ] Manual smoke on the route with the real Lewis Residence project
- [ ] Confirm Server-Timing breakdown is reasonable
- [ ] Confirm no `console.warn` storms in Vercel logs
- [ ] Grep for any unexpected errors in Sentry / Vercel logs (if configured)

## Feature flag (optional, OPS-01)

If added:
- Default: enabled.
- Disable: set `NEXT_PUBLIC_PROJECT_ACTIVITY_PAGE_ENABLED=false` in Vercel env.
- The mini-sidebar "Activity" link and the route check this flag; if disabled, link hides and route renders an "Activity coming soon" panel.
