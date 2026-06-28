# 19 — Research, Review, and QA Evidence

## Implementation QA evidence addendum (2026-06-28)

Status: implementation complete and locally verified for the v1 Project Activity page.

Key implementation artifacts:

- Route: `src/app/workshop/projects/[projectId]/activity/page.tsx`
- Loader: `src/app/api/projects/[projectId]/activity/route.ts`
- Client surface: `src/components/workshop/project-activity/ProjectActivityClient.tsx`
- Repository: `src/lib/repositories/project-activity-feed-repository.ts`
- RPC/index migrations:
  - `supabase/migrations/20260628223000_project_activity_collaboration_audit_rpc.sql`
  - `supabase/migrations/20260628224500_project_activity_collaboration_audit_rpc_cursor_qualification.sql`
  - `supabase/migrations/20260628231500_project_activity_collaboration_audit_project_created_id_idx.sql`
- Browser proof script: `scripts/prove-project-activity-route-browser.mjs`

Provider proof:

- Supabase project boundary verified as `ebxxqidacheyapmmzavr`.
- Scoped collaboration-audit RPC migrations were applied in the provider project.
- Direct app-role table privileges on `collaboration_audit_events` remained empty.
- Authorized simulated RPC read returned rows/count; unauthorized simulated subject returned permission denied.
- Added `collaboration_audit_events_project_created_id_idx`; forced-plan `EXPLAIN` used the new `(project_id, created_at desc, id desc)` index with no sort. The tiny current table may still choose a sequential scan by cost.

Local validation:

- `bun run type-check` passed.
- `bun run lint` scoped to the touched activity/proxy/legal/proof files passed with zero errors.
- `bun run test:dom -- tests/vitest/project-activity-page` passed: 7 files / 38 tests.
- Focused proxy/legal gate tests passed, including the signed Terms gate cookie path.
- `bun run build` passed under Next.js 16.2.6 and listed `/workshop/projects/[projectId]/activity` plus `/api/projects/[projectId]/activity`.
- Full `auth-proxy.test.ts` still has pre-existing beta-route expectation failures around `/beta/access-required` versus the current `/access-required` route; these are outside the activity-page change and were not used as completion evidence.

Browser proof:

- Artifact directory: `.omx/artifacts/project-activity-page/project-activity-route-browser-2026-06-28T163016Z/`
- Report: `.omx/artifacts/project-activity-page/project-activity-route-browser-2026-06-28T163016Z/project-activity-route-browser-proof.json`
- Status: `passed`.
- Auth mode: temporary Supabase user.
- Cleanup: temporary auth user deleted; allowlist and terms acceptance cleanup completed; no cleanup errors.
- TTFB proof: 20 authenticated production-start samples, p50 `45ms`, p95 `140ms`, thresholds p50 `300ms` / p95 `600ms`.
- Browser behavior proof covered authenticated route resolution, dashboard-to-Activity navigation, desktop/mobile screenshots, no horizontal document overflow, scope/actor/client/action/edited-by-me/refresh/clear controls, filter URL state, invalid query tolerance, Load more handling, and Refresh availability.
- Remaining browser warnings: repeated 404 console resource warnings captured by the proof script. The page-level assertions still passed and no page errors were captured.

Performance implementation note:

- The original route-level streaming and repository optimizations were insufficient because first byte was dominated by protected-route auth/legal gates and remote Supabase variance.
- The final implementation moved the protected `/workshop` hard gate into proxy, uses Supabase `auth.getClaims()` where supported by the installed SDK, stamps trusted internal request headers for the server layout, and caches current Terms acceptance in a short-lived HMAC-signed HttpOnly cookie. If no signing secret is available, the proxy falls back to the database Terms check.

## Research questions and sources

| Question | Source | Decision influenced |
|---|---|---|
| Are existing activity infrastructure components sufficient to extend? | Direct reads of `src/lib/activity/{types,composer,...}.ts`, `src/lib/repositories/project-activity-repository.ts`, `src/lib/publisher/activity-repository.ts` | DEC-01 (new repository) |
| Does `estimate_sheet_events` already have `project_id` for project scoping? | Migration `20260619105250_project_dashboard_activity_location.sql` (read in full) | DATA-02/DATA-04 |
| Can `collaboration_audit_events` be read directly by authenticated client context? | `20260614152946_explicit_internal_table_deny_policies.sql` revokes grants and creates restrictive deny policy | DEC-07 (scoped RPC required) |
| Are shared-link context fields available for estimate-scoped filtering? | Migration `20260621042221_shared_link_event_context.sql` (read in full) | FR-04 estimate scope; ASSUMP-04 |
| Are estimate-sheet versions dormant in the existing dashboard preview? | `listProjectActivityPage` source: `DORMANT_NAMED_VERSION_EVENT_TYPES` | DEC-10 |
| Is the project dashboard chrome reusable? | `src/app/workshop/projects/[projectId]/layout.tsx` + `ProjectDashboardClient.tsx` | UX-01 |
| Are URL searchParams async in Next.js 16? | Existing route code + local Next docs in `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` | ASSUMP-08 |
| Can `use cache`/`cacheTag` be used for this request-time page? | Local Next docs: `searchParams` opts dynamic rendering; cached functions cannot directly access request-time APIs | ARCH-05 |
| Does the mini-sidebar Activity link already exist? | `src/components/workshop/ProjectMiniSidebar.tsx` direct read | P0-T2 closed as verify-only |
| Does `readPublisherWorkspaceActivity` already cover the 6 sources we need? | `src/lib/publisher/activity-repository.ts` (read in full) | DEC-01 (pattern reference) |

## Skills / workflows used

| Skill / workflow | Used | Why |
|---|---|---|
| `archestimator-plan-pack` | Yes | Canonical structure + LOOP_LEDGER |
| `design` (OMX) | Yes | DESIGN.md governance for the page |
| `writing-plans` | Yes | Multi-step plan authoring |
| `dispatching-parallel-agents` | Yes | Native read-only council lanes used for plan review |
| `domain-modeling` | Referenced | Activity / Scope / Actor / Action terminology |
| GitNexus / code-review-graph | **Not used** | Proportional-graph policy — narrow read-only planning task; `rg` + targeted reads sufficient |
| Native subagents | **Used** | `designer`, `architect`, `test-engineer`, and `critic` read-only reviewers returned findings incorporated in this revision |

## Specialist workstream outputs

| Lane | Key finding |
|---|---|
| Source analyst | Most source columns exist; `collaboration_audit_events` direct reads are denied and need RPC access |
| Product / UX | Filter row + scope selector + actor + client dropdowns match the brief; filters/scope are canonical URL state; pagination is transient |
| React/Next.js | Server Component prefetch + Client Component URL state is correct; Load more needs a narrow authenticated loader; `searchParams` is async in Next.js 16 |
| Data | `estimate_sheet_events_project_created_idx` covers the hot path; collaboration audit needs RPC and EXPLAIN-backed index check |
| Security | Recipient PII must be minimized to `display_name` plus non-PII disambiguators; no `service_role`; URL filter values cannot expand scope |
| Performance | Data reads plus exact count reads need authenticated timing proof; old unauthenticated curl proof was invalid |
| Test/QA | Vitest unit + DOM + security denial tests cover most v1; authenticated perf fixture and local/provider RPC proof are required |
| Ops | `git revert` is the rollback path; no monitoring dashboard required at closed-beta scale |
| Adversarial | Native council found P0/P1 repairs: RPC access path, PII contradiction, validation realism, cursor/shareability, cache consistency, count contract |
| Final verifier | Native verifier `019f0e82-50d0-7940-a0c9-d59bd8d72f31` returned `IMPLEMENTATION-READY` with no P0/P1 findings |

## Critique-and-revision cycle summaries

| Cycle | Critique | Action |
|---|---|---|
| 1 | Initial draft of `02` had vague non-goals | Tightened: explicitly excluded `mass_deletion_events`, `account_security_events`, `ai_*` tables |
| 2 | Initial `06` proposed extending `readPublisherWorkspaceActivity` | Reversed: DEC-01 — new repository preserves existing Publisher surface |
| 3 | Initial `08` did not enumerate recipient PII fields | Added full PII minimization matrix per `08_SECURITY_PRIVACY_THREAT_MODEL.md` |
| 4 | Initial `11` had a single mega-WP for the client component | Split into 13 subcomponents per `06` + added RISK-17 for split-into-multiple-PRs option |
| 5 | Initial `12` had a generic "manual QA" line | Replaced with 16-row UltraQA matrix and 24-row Test Execution Matrix |
| 6 | Native council found `collaboration_audit_events` direct access was impossible after deny policies | Added WP-0 scoped RPC migration, DATA-01 rewrite, RISK-21, SQL proof gate |
| 7 | Native council found recipient email/privacy contradiction | Replaced truncated-email disambiguation with non-PII publication/date/ordinal context |
| 8 | Native council found cursor URL/shareability contradiction | Moved cursor out of shareable URL and added authenticated Load more loader |
| 9 | Native council found validation gates overclaimed known-red `bun run validate` and omitted `lint:design` | Added known-red handling and full validation inventory |
| 10 | Native council found count-summary UI lacked data contract | Added `counts.loadedCount`, `filteredTotalCount`, and `scopeTotalCount` repository/route contract |

## UltraQA adversarial scenario matrix

See `12_TEST_AND_VALIDATION_STRATEGY.md` "UltraQA adversarial scenario matrix" — 16 scenarios covering IDOR, malformed input, recipient collisions, rapid interactions, source failures, partial state, and large payloads.

## Performance evaluator contract

See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` "Performance evaluator contract (PERF)". Evaluator: authenticated 20-run Playwright timing fixture on local production build, target ≤ 300ms p50 / ≤ 600ms p95, regression threshold +50%.

## Independent final verifier evidence

Native council review has been incorporated for this revision. Final verifier `019f0e82-50d0-7940-a0c9-d59bd8d72f31` reviewed the revised package and prompt guardrails, returned `IMPLEMENTATION-READY`, and found no P0/P1 contradictions. It cited the RPC/direct-deny contract, transient cursor/URL contract, non-PII recipient handling, estimate-scope exclusion, exact counts, cache policy, validation realism, authenticated performance proof path, and reusable prompt guardrails as satisfied.

## Validation gaps

| Gap | Risk | Strongest substitute evidence | Required to close |
|---|---|---|---|
| No live `EXPLAIN` of the multi-source fan-out/RPC/count paths | RISK-06 | Migration reads confirm likely indexes exist | Run `EXPLAIN` during Phase 1 of implementation |
| No browser-rendered screenshot of the page | UX-01 | Side-by-side chrome comparison is implementation-time work | Implement WP-5 + WP-7 + WP-9 then screenshot |
| No local/provider RPC proof yet | RISK-21 | Deny migration read proves direct access is blocked | Run migration/RPC proof during implementation |

## Test execution (planning run)

This is a planning run. No tests were executed. Tests are defined in `12_TEST_AND_VALIDATION_STRATEGY.md` for the implementation run to execute.

## Validation not performed (and why)

- `bun run validate`: this is a planning/prompt-only run; no application source code changed.
- `bun run build`: same reason.
- `bun run test:dom`: same reason.
- Provider/local RPC proof: same reason.
- Browser proof: same reason.

## Artifacts produced

- 21 markdown documents inside `.ai/03_plans/2026-06-28-Project-Activity-Page/`.
- Planning prompt docs updated in `.ai/08_prompts/000_Planning Prompts/`.
- No temp files. No provider state.

## Cleanup status

Nothing to clean up.
