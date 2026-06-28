# 00 — Agent Coordination

## Master goal (authoritative)

Convert the brief: "fill out `/workshop/projects/{projectId}/activity` as the project's Activity History home, with scope selectors (whole project / project-only / specific estimate sheet), action-type filters (deletions, edits, etc.), per-user filters, and per-client (shared-link recipient) filters; adapt the project dashboard UI" into an `IMPLEMENTATION-READY` plan pack that a future implementation agent can execute without re-discovering requirements, architecture, affected files, or validation gates.

This is **planning-only**. EXECUTE is bounded to writing planning artifacts and prompt guidance. No application code, migrations, provider state, or tests are modified by this plan-improvement run.

## Authority model

1. User intent (brief) — controls product goal and outcome.
2. Repo instructions (`AGENTS.md`, `.ai/00_system/*`, `CLAUDE.md`) — controls implementation reality and safety.
3. Current source code, migrations, generated types, package metadata — controls framework-sensitive and provider-sensitive claims.
4. `.ai/10_state/current-state.md` FAST PATH — controls stage guardrails (pre-launch closed-beta MVP, fast iteration bias).
5. Older plans and model memory — lower authority; do not overrule current repo reality.

## Verification mode

`verification_mode: independent` — the original plan used emulated specialist lanes, but this improvement pass added native read-only council lanes (`designer`, `architect`, `test-engineer`, `critic`) and a separate final verifier (`019f0e82-50d0-7940-a0c9-d59bd8d72f31`). Do not rely on the older emulated-readiness claim; `17_FINAL_READINESS_REVIEW.md` is the authoritative verdict.

## Lane allocation

| Lane | Mode | Role | Output artifacts |
|---|---|---|---|
| Lead coordinator | same-agent | Scope, sequencing, integration, final claim | README, 01, 17, this file, LOOP_LEDGER |
| Source & codebase analyst | emulated | Source map, repo evidence | 03, 10 |
| Product/UX/a11y planner | emulated | State matrix, a11y, copy | 02, 04 (FR/UX/A11Y), 05 |
| React/Next.js specialist | emulated | Route, RSC/client boundary, cache, mutations | 06 (RSC sections), 11 |
| Data/database planner | emulated | Schema, RLS, indexes, query plans | 07 |
| Security/privacy reviewer | emulated | Threat model, recipient PII, authz | 08 |
| Performance reviewer | emulated | Budgets, evaluator, N+1 risks | 09 |
| Test/QA strategist | emulated | Test matrix, ultraQA scenarios | 12 |
| Ops/rollout planner | emulated | Flag, monitoring, rollback | 13 |
| Adversarial reviewer | emulated | P0/P1/P2 findings | 14, 17 (residual), 19 (critique cycles) |
| Final verifier | emulated | Requirement-by-requirement audit | 16, 17 |

## Cross-lane coordination ledger

| Lane | Goal | Owned scope | Dependencies | Findings | Decisions / rejected alternatives | Conflicts | Validation evidence | Status |
|---|---|---|---|---|---|---|---|---|
| Lead | Master goal + integration | All 21 docs | — | Brief + repo evidence align | Excludes pure codegen from this loop | None | `git diff --check` after each write | Active |
| Source analyst | Map every existing surface the page will touch | `src/app/workshop/projects/[projectId]/activity/page.tsx`, dashboard route, repositories, activity composer, migrations | — | Multi-source composer + project-scoped estimate repo already exist; dashboard chrome and `ProjectMiniSidebar` reusable | Rejected: writing a brand-new composer from scratch | None | Direct file reads + migration reads | Done (iteration 2-4 of LOOP_LEDGER) |
| UX/A11y | Filter state model + a11y matrix + copy | URL state, scope selector, filter chips | Source analyst findings | Reuse `ACTIVITY_FILTER_EVENT_TYPES` pattern from estimate-sheet activity-history | Rejected: bespoke filter drawer vs. chip row | None | Static review of existing UI primitives | Done |
| Frontend | RSC + client boundary, cache owner | Route shape, server prefetch, client interactivity | UX/A11y decisions | Server Component owns initial fetch + auth; client owns filter/scope URL state and explicit Load more pagination through an authenticated loader | Rejected: fully client-side fetching; rejected infinite scroll for v1 | None | Next.js 16 local docs + repo patterns | Updated in improvement pass |
| Data | Schema/RLS/index/query plan | All 6 source tables + recipient/profile joins | Frontend data contract | Required columns exist; `collaboration_audit_events` direct table reads are denied and require a scoped RPC; count summary needs explicit `counts` contract | Rejected: denormalized activity table; rejected direct authenticated table reads for collaboration audit | None | Migration reads + deny-policy read | Updated in improvement pass |
| Security | Threat model + recipient PII | shared_link_recipients, shared_link_comments author_email, account_security_events | Data findings | Recipient display name is need-to-know; client-facing author_email must not appear on internal dashboard | Rejected: exposing raw recipient email as the actor label | None | RLS policy reads + publication/permissions read | Done |
| Performance | Budgets + evaluator + N+1 | Per-source query cost, actor/recipient label fan-out, cursor pagination | Frontend + data | Five fan-out queries (estimate events, comments, responses, shared events, collab audit) + 2 label resolutions; needs parallel `Promise.all` | Rejected: single SQL union view (premature) | None | Repository code reads | Done |
| Test/QA | Test matrix + ultraQA | Vitest DOM tests + shadow-path matrix | All other lanes | Filter/scope repository tests + client component tests + a11y assertions + adversarial denial tests | Rejected: full Playwright gate for v1 (proportional policy) | None | Repo test command inventory | Done |
| Ops | Flag + monitoring + rollback | Feature flag, kill switch, observability | All other lanes | Request-scoped `React.cache` only where it deduplicates within one request; no `use cache`, `cacheTag`, or `revalidateTag` in v1; kill switch via env or deleted nav link | Rejected: dark launch with traffic mirror (overkill for closed beta) | None | Repo ops patterns + Next.js 16 cache docs | Updated in improvement pass |
| Adversarial | P0/P1/P2 findings | Whole package | All other lanes | Native council found and drove repairs for collaboration-audit access, PII, validation, pagination, cache, and count contract | — | None | Native subagent read-only reports | Updated in improvement pass |
| Final verifier | Requirement-by-requirement audit | 16_TRACEABILITY + 17_FINAL_READINESS_REVIEW + prompt guardrails | All other lanes | Native verifier `019f0e82-50d0-7940-a0c9-d59bd8d72f31` returned `IMPLEMENTATION-READY` with no P0/P1 findings | — | None | Native verifier report incorporated in `17` and `19` | Done |

## Skills discovered and used

- `archestimator-plan-pack` (project skill) — used. Canonical plan-pack structure + LOOP_LEDGER discipline.
- `design` (OMX skill) — used. DESIGN.md governance for the activity page UI decisions (see `05_UX_UI_ACCESSIBILITY_PLAN.md`).
- `writing-plans` (project skill) — used. Multi-step plan authoring.
- `dispatching-parallel-agents` (project skill) — referenced for lane-allocation reasoning; native council lanes were spawned in this improvement pass.
- `domain-modeling` (project skill) — referenced. Pinned terminology in `04_REQUIREMENTS_SPECIFICATION.md`.
- `ubiquitous-language` (project skill) — referenced. Glossary in `04_REQUIREMENTS_SPECIFICATION.md`.
- GitNexus / code-review-graph — not used. Proportional-graph policy: narrow read-only planning task; `rg` + targeted reads were sufficient.

## Verification status

Native council review exists for this improvement pass, and the separate final verifier has signed off. The package is `IMPLEMENTATION-READY` as a planning artifact; implementation must still satisfy the proof gates listed in `12_TEST_AND_VALIDATION_STRATEGY.md` before feature completion.

## Files off-limits (this run)

- Application code, provider state, generated source, or tests.
- `AGENTS.md`, `CLAUDE.md`, `.ai/10_state/decisions.md`, and other source-of-truth docs outside the planning/prompt scope.
- Any `src/`, `supabase/`, `tests/`, `package.json`, or other repo file.
- Git state: no branches, commits, pushes, history changes.

## Files intentionally unaffected by future implementation v1

- Public share routes (`/share/[token]/*`).
- Public share APIs (`/api/share/[token]/*`).
- Auth, account, settings, billing surfaces.
- Other workspace routes (`/workshop/projects`, `/workshop/library`, `/workshop/templates`, `/workshop`).
- Mass-deletion, account-security, and AI audit surfaces (out of scope for v1; see `02_FEATURE_BRIEF_AND_SCOPE.md`).
