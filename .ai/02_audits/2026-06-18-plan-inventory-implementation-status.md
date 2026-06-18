# 2026-06-18 Plan Inventory And Implementation Status

## Scope

Audited `.ai/03_plans` as of 2026-06-18. Current inventory is 18 plan folders plus
the root `README.md`, totaling 310 files.

Proof boundary: repo-local docs/source/tests/migrations only. No fresh Supabase,
GitHub, Vercel, hosted-browser, or manual-device proof is claimed in this audit.

Method: read the plan folders, cross-check folder-local status against
`.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, source files, tests,
migrations, and package scripts. Root `.ai/03_plans/README.md` is treated as a
navigation aid, not as authoritative status, because it contains stale active
paths and at least one stale implementation claim.

## Status Taxonomy

- `Implemented in repo`: source, tests, migrations, or governance files exist in
  the current checkout for the plan's core deliverable.
- `Partially implemented`: some deliverables landed, but important plan scope or
  proof remains open.
- `Planning/audit only`: the pack is explicitly a plan, audit, backlog, or
  readiness document and did not itself implement app/provider changes.
- `Not implemented`: the intended feature is absent from current source, aside
  from unrelated or older adjacent concepts.
- `Provider/browser proof gap`: repo evidence exists, but this audit did not
  freshly prove hosted/provider/manual behavior.

## Executive Summary

Implemented or governance-complete in current repo evidence:

- Project Groups.
- Sidebar Favorite Projects and Estimates.
- Estimates Toolbar Functionality.
- Workshop Dashboard, including later v2 design work.
- Agent Mandate and Workflow Optimization.
- Loop Engineering Default Mandate.
- R1 Graph Injector Neutralization.
- UI Component Optimization component library / Storybook layer, with production
  app migration explicitly deferred.
- GitHub Codex Comment Resolution is historical recorded/local evidence only;
  a fresh 2026-06-18 GitHub audit now finds active unresolved Codex threads.

Planning, audit, backlog, or incomplete packs:

- React Joyride Onboarding is planning only.
- Archives Feature is refined but not implemented.
- Codebase Cleanup, Overall Site Performance, and Performance Refactor are
  planning/readiness packs, not implementation proof.
- Database Indexing implemented only the repo audit helper; no index migrations
  were created.
- Security/OWASP was an audit and remediation roadmap. Some remediations landed
  elsewhere, but the audit is not a full compliance-closeout.
- `000-Follow Ups` contains deferred work after shipped parent efforts; several
  items remain open or partially implemented.
- The older GitHub Codex Comments pack is partially implemented/blocked around
  provider-retained PR refs for a history-purge issue.

## Plan Matrix

| Plan folder | What it is / what it should do | Current status | Evidence and cautions |
|---|---|---|---|
| `000-Follow Ups` | Deferred QA, polish, and hygiene packets after larger shipped work, mainly estimate tree unification and templates/reusable-source follow-ups. | Partially implemented / deferred follow-ups. | Parent estimate tree unification is recorded complete, but follow-ups remain: browser mixed-create/drop QA, mobile sticky visual QA, retiring `correctKinds`, optional RLS harness, and optional future `kind` drop. Templates follow-ups are mixed: hover-prefetch/lite-loader work exists, but lazy template-node loading, atomic insert, reusable-source fan-out, and server-side error taxonomy are not fully closed. |
| `2026-06-01-security-owasp-compliance-audit` | Read-only OWASP/API/security/compliance audit, evidence appendix, remediation roadmap, and production readiness gate. | Planning/audit only; partially remediated elsewhere. | Folder text says documentation-only and later reconciliation marks the app partially compliant. Current source shows some remediations such as HSTS and AI Ask quota, but CI/security-scanning and other readiness gaps remain. Treat as backlog/gate, not compliance proof. |
| `2026-06-03-react-joyride-onboarding-implementation-plan` | Design a React Joyride onboarding system for authenticated workshop routes, including dependency, route-scoped tour registry, persistence table/RLS, flag, targets, replay, and tests. | Planning/audit only. | Plan and final report say no production code/deps/migrations. `package.json` and lockfile have no `react-joyride`; no `src/features/onboarding` runtime exists. Existing `/workshop/onboarding` redirect is unrelated compatibility surface. |
| `2026-06-06-ui-component-optimization-componentization` | Build reusable UI primitives and Storybook/component coverage while deferring production app migration. | Partially implemented. Component library/Storybook implemented; app migration deferred. | `00_STATUS.md` reports complete component library, stories, and gates. Current repo has `.storybook`, `src/stories`, `src/components/ui`, Storybook scripts, and coverage tests. The same status file says production app migration was not started. |
| `2026-06-07-archives-feature` | Implement multi-entity archive/restore for projects, estimate sheets, components, and templates, with guards, views, actions/RPCs, and tests. | Not implemented. | Plan index says refined/not implemented. Source has adjacent older archive concepts such as component lifecycle and `estimate_tabs.archived_at`, but no project/archive RPCs and no full V1 archive feature. |
| `2026-06-14-Codebase-Cleanup-Plan` | Whole-app cleanup audit for dead code, stale docs, unused deps/assets, and safe deletion phases. | Planning/audit only; partially stale. | README says no code/files/deps/migrations changed. Several proposed dependency and code cleanup targets still exist. Do not execute blindly because some candidates have since become compatibility or test-contract surfaces. |
| `2026-06-14-Overall-Site-Performance-And-Optimization` | Whole-site performance audit/readiness pack: route budgets, rendering/client audit, DB/API/RLS readiness, caching/prefetch audit, benchmark protocol, backlog, and go/no-go criteria. | Planning/audit only. | README explicitly says audit/planning/readiness only and no source/deps/migrations/provider changes. It reconciles work done elsewhere and lists unproven gaps such as RUM, heavy-route measurements, DB EXPLAIN/index evidence, and hosted readiness. |
| `2026-06-16-Project-Groups-Implementation` | Add per-user project groups on `/workshop/projects`: ordered buckets, accents, organize mode, card/bulk assignment, migrations, actions, UI, and tests. | Implemented in repo; provider/manual closeout not freshly verified here. | Evidence includes migrations `20260617090000_project_groups.sql` and `20260617210000_grant_update_for_membership_and_favorite_upserts.sql`, generated types, group actions, repository/page/client/UI components, and project group tests. Decisions record a live grant fix, but this audit did not re-check provider state. |
| `2026-06-16-Sidebar-Favorite-Projects-And-Estimates` | Replace stale sidebar favorites with scoped TanStack Query cache, SSR seed, server-action loader, optimistic mutations, rollback, eviction, a11y/focus handling, and tests. | Implemented in repo; authenticated browser proof gap recorded. | Decisions and QA evidence record Phases 0-5 complete with targeted tests. Current source has favorites query keys/loaders/cache helpers, `useSidebarFavoritesQuery`, toggle hooks, `MainSidebar` integration, and tests. QA notes say authenticated browser proof was unavailable. |
| `2026-06-16-estimates-toolbar-functionality` | Wire estimates toolbar filter/sort controls to the estimates table while preserving search/add behavior and compact icon-dropdown style. | Implemented in repo. | `ProjectEstimatesClient.tsx` defines filter/sort state and projects filtered/sorted rows; `project-estimates-client-create.test.tsx` covers filter/search/recent/sort cases. |
| `2026-06-16-github-codex-comment-resolution` | Track and resolve live Codex review comments across open PR branches, with branch evidence and final thread audit. | Historical resolution evidence; not currently release-clean. | README records older live audits with zero active unresolved non-outdated Codex threads, but a fresh 2026-06-18 GitHub GraphQL audit found 7 active unresolved non-outdated Codex threads across open PRs #75, #87, #88, #89, and #92. |
| `2026-06-16-github-codex-comments` | Earlier broad plan/runbook for outstanding GitHub Codex review threads, later focused on PR #50 sensitive BOQ history purge. | Partially implemented / blocked. | Runbook records local/mirror verification and a guarded purge script, but also says GitHub `refs/pull/*/head` retained old snapshots. Treat as unresolved until provider retention/thread state is cleared. |
| `2026-06-17-Agent-Mandate-And-Workflow-Optimization` | Governance/docs cleanup for source-of-truth clarity, routing, validation, drift recovery, proportional graph policy, and agent framework alignment. | Implemented. | Final implementation report says done after validation and review. Current docs show live Supabase stack correction, `15_Bugs` canonical-map inclusion, proportional graph policy in adapters, and CommandCode authority binding. |
| `2026-06-17-Performance-Refactor` | Future large refactor plan for estimate-workshop performance: tree kernel, sheet decomposition, structural hashes, optimistic adapter, query keys, bundle/runtime cleanup, DB/RLS pass, and CI perf gates. | Planning/audit only; core refactor not implemented. | README says planning only and forbids source/tests/scripts/supabase/config changes. Core deliverables such as shared `TreeIndex`, one optimistic adapter, full sheet decomposition, CI perf gates, and DB index/RLS pass are not evidenced. Some measurement scaffolding exists elsewhere. |
| `2026-06-17-Workshop-Dashboard` | Rebuild `/workshop` into a full dashboard/homebase with hero, continue card, CTAs, recent projects/sheets, favorites, library spotlight, stats, first-run state, and dashboard visual system. | Implemented in repo; live visual/owner review still a product gap. | `CLOSE.md`, decisions, source components under `src/components/workshop/dashboard`, `/workshop` data loading, dashboard CSS/font tokens, and reset/dashboard tests show implementation. Decisions also record a later bento/warm-dark sidebar v2. |
| `2026-06-17-loop-engineering-default-mandate` | Make bounded loop engineering the default repo-level execution contract for non-trivial AI work, with activation criteria, artifacts, proof boundaries, and adapter pointers. | Implemented as governance/docs. | `LOOP_LEDGER.md` has all acceptance criteria checked. Current AGENTS, `.ai/00_system`, adapter docs, and reusable prompt template contain the mandate. Enforcement is instruction-level, not CI/tool-enforced. |
| `2026-06-18-r1-graph-injector-neutralization` | Stop regenerated GitNexus/code-review-graph blocks from reintroducing absolutist graph-first policy by adding an idempotent neutralizer and wrapper scripts. | Implemented locally. | `scripts/neutralize-graph-mandate.mjs` exists; `package.json` has `graph:reindex` and `graph:neutralize`; AGENTS/CLAUDE notes direct re-indexing through the wrapper. Real generator run was intentionally not performed. |
| `database-indexing-and-query-performance` | DB indexing/query-plan readiness strategy: repo/live audit, migration parity, EXPLAIN protocol, staging-only candidate indexes, and future search indexing. | Partially implemented; actual indexing not implemented. | README and current-state say only the repo audit helper is implemented. `scripts/audit-dbidx-repo.ts` and `tests/vitest/dbidx-repo-audit.test.ts` exist. No DBIDX candidate index migration was found. Live advisors, `pg_stat_statements`, EXPLAIN, parity, and index DDL remain pending. |

## Root README And State Consistency Findings

- Original finding: `.ai/03_plans/README.md` named active paths that were no
  longer present under `.ai/03_plans`, including
  `2026-06-15-Estimate-Sheet-Content-Table` and
  `2026-06-16-Project-Data-Route-Feature-Plan`; matching historical material
  had moved to `.ai/09_archive`.
- 2026-06-18 follow-up: the README inventory was refreshed to the current 18
  plan folders and those two paths were demoted to archive pointers.
- Original finding: the same README understated the UI component plan as
  docs-only, while the folder-local status, current-state, Storybook setup,
  stories, scripts, and tests showed the component library layer was
  implemented.
- 2026-06-18 follow-up: the README now labels the UI component pack as partially
  implemented with app migration deferred, and `00_STATUS.md` has evidence
  anchors.
- Non-date-prefixed folders are easy to miss: `000-Follow Ups` and
  `database-indexing-and-query-performance` are active inventory entries.
- GitHub/comment-resolution packs are operational evidence and runbooks, not
  product implementation plans; provider state must be separately verified.
- Several planning packs intentionally forbid source/provider changes. Do not
  convert their existence into an implementation claim.

## 2026-06-18 Follow-Up Completion

1. Done: `.ai/03_plans/README.md` now matches the current filesystem inventory
   and points the stale active entries to `.ai/09_archive`.
2. Done: implemented-status pages now include evidence anchors separating repo
   source, tests, migrations, provider apply, hosted/browser proof, and
   owner/manual proof where relevant.
3. Done: `000-Follow Ups` remains backlog; no item was promoted because no
   individual follow-up was selected for execution.
4. Done: performance, cleanup, DB indexing, archives, and security packs now
   carry explicit provider-mutation guardrails in the active inventory.
5. Done: a fresh read-only GitHub GraphQL audit was run; release status is not
   clean because it found 7 active unresolved non-outdated Codex threads.

## Verification Performed For This Audit

- Re-ran top-level `.ai/03_plans` inventory.
- Counted plan files by top-level family.
- Cross-checked implementation claims with source/tests/migrations/package
  scripts and current-state/decisions where available.
- Used parallel read-only specialist lanes for security/governance, UI plans,
  performance/cleanup/DB, archives/follow-ups/project-groups, and verification
  methodology.
- No provider or hosted browser verification was performed. The follow-up docs
  refresh later ran a read-only GitHub GraphQL audit for Codex review-thread
  status and found 7 active unresolved non-outdated Codex threads.
