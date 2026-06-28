# Loop Ledger — Project Activity Page Plan Pack

Started: 2026-06-28 (Asia/Manila)
Plan folder: `.ai/03_plans/2026-06-28-Project-Activity-Page/`
Plan profile: `exhaustive` (touches publication/shared-link/client data, collaboration audit, security scope)

## Loop contract

`DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE`

This is a **planning-only** run. EXECUTE is bounded to planning artifacts and prompt guidance. No application code, migrations, provider state, or tests are modified by this loop.

## Master goal

Convert the brief: "fill out `/workshop/projects/{projectId}/activity` as the project's Activity History home, with scope selectors (whole project / project-only / specific estimate sheet), action-type filters (deletions, edits, etc.), per-user filters, and per-client (shared-link recipient) filters; adapt the project dashboard UI" into an `IMPLEMENTATION-READY` plan pack that a future implementation agent can execute without re-discovering requirements, architecture, affected files, or validation gates.

## Stop condition

The loop stops when all 21 canonical plan documents exist, are internally consistent, every requirement is traced to evidence + source strength + a work package + an acceptance criterion + a test method, the final readiness review records a `verification_mode` label, and the README states the canonical readiness status (`IMPLEMENTATION-READY` / `CONDITIONALLY READY` / `NOT READY`).

## Blocker condition

Stop and escalate if: (a) a load-bearing product decision cannot be inferred from repo evidence (e.g. whether to surface `account_security_events` on the project activity page), (b) a load-bearing schema fact cannot be confirmed from migrations/types/source, or (c) the brief is internally contradictory.

## Lane allocation

| Lane | Mode | Role | Status |
|---|---|---|---|
| Lead coordinator | same-agent | Scope, sequencing, integration, final claim | Active |
| Source & codebase analyst | same-agent + native council findings | Source map, repo evidence | Updated |
| Product/UX/a11y planner | same-agent + `designer` council | State matrix, a11y, copy | Updated |
| React/Next.js specialist | same-agent + `architect` council | Route, RSC/client boundary, cache, loader | Updated |
| Data/database planner | same-agent + `critic`/`test-engineer` council | Schema, RLS, RPC, indexes, query plans | Updated |
| Security/privacy reviewer | same-agent + council | Threat model, recipient PII, authz | Updated |
| Performance reviewer | same-agent + `test-engineer` council | Budgets, evaluator, N+1/count risks | Updated |
| Test/QA strategist | same-agent + `test-engineer` council | Test matrix, ultraQA scenarios | Updated |
| Ops/rollout planner | same-agent | Flag, monitoring, rollback | Updated |
| Adversarial reviewer | `critic` native council | P0/P1/P2 findings | Updated |
| Final verifier | native verifier after edits | Requirement-by-requirement audit | Pending |

Native council review has been used in this improvement pass. A final independent verifier after edits is still required before an `IMPLEMENTATION-READY` claim.

## Iteration log

| Iter | Decision | Evidence | Result |
|---|---|---|---|
| 1 | Read planning prompts, plans README, current-state FAST PATH, prior plan-pack template | Direct reads | Confirmed exhaustive profile, 21-doc structure |
| 2 | Discover existing activity page + project dashboard UI + repositories | `src/app/workshop/projects/[projectId]/activity/page.tsx` (15-line placeholder); `src/lib/repositories/project-activity-repository.ts`; `src/lib/publisher/activity-repository.ts`; `src/lib/activity/{types,composer}.ts` | Multi-source composer already exists; only estimate-events repository is project-scoped; publisher repository is workspace+project-scoped with 6 sources merged |
| 3 | Discover database audit surface | `20260619105250_project_dashboard_activity_location.sql` (estimate index); `20260621042221_shared_link_event_context.sql`; `20260620064601_project_publication_activity_target_labels.sql`; `20260614152946_explicit_internal_table_deny_policies.sql` | Most source columns exist; collaboration audit direct reads are denied, so v1 needs a scoped RPC migration |
| 4 | Discover existing UI patterns | `src/components/workshop/estimate-sheet/activity-history.tsx` (1819 lines) has filter pattern (`ACTIVITY_FILTER_EVENT_TYPES`); `ProjectDashboardClient.tsx` (920 lines) is adaptation source | Reuse existing filter primitive pattern + dashboard chrome |
| 5 | Write plan pack (this run) | All 21 docs | See README status |
| 6 | Run native council review | `designer`, `architect`, `test-engineer`, `critic` read-only reports | Found and repaired PII, pagination, validation, cache, access-path, and count-contract gaps |
| 7 | Improve prompt guardrails | `Improve-Plan-Prompt.md`, `Multi-Agent-Execution-Directive.md` | Added explicit access-path, validation-command, owner-delegation, perf-auth, and traceability safeguards |

## Conflict log

Resolved conflicts:

- Direct `collaboration_audit_events` table reads conflicted with deny policies. Resolution: scoped RPC migration.
- Recipient duplicate-name UX conflicted with PII minimization. Resolution: non-PII disambiguators only.
- Cursor-as-URL conflicted with shareable/reloadable semantics. Resolution: filters/scope in URL, cursor in transient loader state.
- `cacheTag` note conflicted with Next.js request-time cache constraints. Resolution: request-scoped `React.cache` only for v1.
- Full `bun run validate` green conflicted with known repo state. Resolution: focused checks + known-red documentation.

## Skill/tool ledger

| Skill / tool | Used | Why |
|---|---|---|
| `archestimator-plan-pack` (project skill) | Yes | Canonical plan-pack structure for this repo |
| `design` (OMX skill) | Yes | DESIGN.md governance for the activity page UI decisions |
| `writing-plans` (project skill) | Yes | Multi-step plan authoring discipline |
| `dispatching-parallel-agents` (project skill) | Yes | Used to structure native council review lanes |
| `domain-modeling` (project skill) | Referenced | Activity / Scope / Actor / Action terminology pinned in `04_REQUIREMENTS_SPECIFICATION.md` |
| GitNexus / code-review-graph | Not used | Proportional-graph policy: narrow read-only planning task; `rg` + targeted reads were sufficient |

## Cleanup

No temp files, scripts, harnesses, or provider state were created. All work is markdown inside the plan folder. Nothing to tear down.
