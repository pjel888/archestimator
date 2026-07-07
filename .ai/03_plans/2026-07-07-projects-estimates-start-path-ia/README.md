# Projects & Estimates Start Path IA — Plan Pack

**Plan status:** `CONDITIONALLY READY`
**Plan profile:** `standard` (UX/IA/routing/components; limited blast radius)
**Verification mode:** `same-agent` (emulated independent pass)
**Implementation start:** `11_IMPLEMENTATION_PLAN.md`
**Date (Asia/Manila):** 2026-07-07
**Derived feature name:** Projects And Estimates Start Path IA

## Goal (one paragraph)

Make starting a **project** and starting an **estimate** self-evident and measurable from three entry states — empty workspace (first/returning user with zero projects), existing project with zero estimates, and returning user resuming — by adding dense, non-decorative empty states and consistent primary CTAs across the projects list, project dashboard, estimates list, and estimate editor, plus a minimal redacted activation-funnel. Preserve the dense operational UI and the existing auto-seeded first estimate; do not add a wizard or slow returning users.

## Why CONDITIONALLY READY (not IMPLEMENTATION-READY)

Three owner product decisions are isolated with recommended defaults and conditional paths:
- `OPEN-DEC-01` — zero-project empty-state copy/visual (FR-01). Recommended copy in `05`.
- `OPEN-DEC-02` — estimate template chooser placement (FR-04). Recommended: empty-state-only chooser.
- `OPEN-DEC-03` — project-open landing route Dashboard vs Estimates (FR-05). Recommended: Dashboard for both.

Plus the implementation-time browser proof (focus/responsive/transition) is deferred (RISK-11), which keeps Testing at 94.

**Slices implementation-ready now** (with recommended defaults where noted): FR-02, FR-03, FR-06, FR-07, FR-08, and FR-01/FR-05 using recommended defaults.

## Phase order & dependency graph

```
P1 (href fix, FR-05)         ── ready (OPEN-DEC-03 default)
P2 (empty states)            ── ready
   ├─ P2-T1 zero-project    (FR-01, OPEN-DEC-01 default)
   ├─ P2-T2 dashboard nudge (FR-02)
   ├─ P2-T3 estimates empty (FR-03)
   └─ P2-T4 auto-seed verify(FR-07, after P2-T3)
P3 (template chooser, FR-04) ── BLOCKED on OPEN-DEC-02
P4 (analytics, FR-06/SEC-02) ── ready (parallel with P2)
P5 (verify + doc)            ── ready (after P2/P4)

Parallel-safe: P1, P2 (different files), P4.
Sequential: P2-T4 after P2-T3; P3 after OPEN-DEC-02; P5 last.
```

## Requirement → task → test traceability (quick links)

| Req | Phase/Task | Test | Doc |
|---|---|---|---|
| FR-01 | P2-T1 | `projects-page-empty-workspace.test.tsx` | `04`, `16` |
| FR-02 | P2-T2 | `project-dashboard-client.test.tsx` | `04`, `16` |
| FR-03 | P2-T3 | `project-estimates-empty-state.test.tsx` | `04`, `16` |
| FR-04 | P3-T1 | `estimate-empty-tab-state.test.tsx` | `04`, `16` |
| FR-05 | P1-T1 | `main-sidebar-favorites.test.tsx` | `04`, `16` |
| FR-06/SEC-02 | P4-T1 | `start-path-activation-events.test.ts` | `04`, `16` |
| FR-07 | P2-T4 | `new-project-form-validation.test.tsx` | `04`, `16` |
| PERF-01/02 | P2 | `perf/projects-page-render-baseline` / `-rpc-contract` | `09`, `16` |

Full matrix: `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

## Blocked decisions table

| Decision | Owner | Recommendation | Impact if unresolved |
|---|---|---|---|
| OPEN-DEC-01 copy | Philip | recommended copy in `05` | FR-01 ships with default copy (swap trivial) |
| OPEN-DEC-02 chooser | Philip | empty-state-only chooser | P3 deferred; P1/P2/P4 unaffected |
| OPEN-DEC-03 landing | Philip | Dashboard for both | FR-05 ships with Dashboard default (one-line swap) |

## Stale-plan revalidation checklist (before executing)

- [ ] `git status` clean of others' changes on the target files; re-read each touched file immediately before editing.
- [ ] Confirm `OPEN-DEC-01/02/03` status with owner (or proceed with recommended defaults).
- [ ] Confirm sibling `first-user-activation-empty-workspace` hasn't already implemented overlapping empty states.
- [ ] Confirm sibling `Estimate-Sheet-Tree` reorder blocker status if touching `EstimateSheetContent.tsx`.
- [ ] Re-verify the perf baselines still pass on current `main` before depending on them.
- [ ] Confirm `ProjectStatus` / migration `0039` still current.

## Commands to run before the first edit

```bash
git status --short --branch
bun run type-check
bun run test:dom -- projects-page-render-baseline projects-page-rpc-contract
```

(Baselines must be green on current `main` before using them as regression gates.)

## Files explicitly off-limits (this plan)

- `migrations/**` (no schema change — DATA-01).
- `supabase/migrations/**` (legacy archaeology; never active).
- Any Cloudflare provider config / `wrangler.jsonc` / D1 / R2 / DO / Queue / Email resources.
- Auth: `lib/auth/**`, `src/proxy.ts`, `app/workshop/layout.tsx` gate logic.
- `lib/projects/actions.ts`, `lib/estimates/actions.ts` action bodies (no new actions; verify-only).
- `lib/repositories/workspace-repository.ts` (no query changes).

## Files and systems intentionally unaffected

- D1 schema, R2, Durable Objects, Queues, Email, Images.
- Auth/session/terms gates.
- Returning-user homebase (`/workshop`) journeys.
- Estimate editor tree mechanics (owned by `Estimate-Sheet-Tree` plan).
- Activation ladder / milestones / sample-data / analytics SDK (owned by `first-user-activation` plan).

## External proof still required before production rollout

- Implementation Playwright pass (focus order, responsive narrow-screen, empty-state→modal→optimistic-card transition).
- Hosted activation-event funnel proof (after sibling analytics-SDK plan picks an SDK + deploys).

## Archive policy

Do **not** archive automatically. Archive only named completed slices after implementation + verification, and only on explicit owner request (shared-worktree caution).

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, workstreams, ledger, conflicts, skills |
| `01_EXECUTIVE_SUMMARY.md` | Problem, target state, findings, decisions, scores |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Scope boundaries, sibling de-conflict, assumptions |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | File:line evidence base |
| `04_REQUIREMENTS_SPECIFICATION.md` | FR/UX/A11Y/…/DOC + shadow-path matrices |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Journeys, states, CTA placement, copy defaults, a11y |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target architecture, decisions, alternatives |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Data/API/network (no change) + access-path matrix |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threat model, redaction control |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Performance evaluator contract |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Impact classification, tests, sequencing |
| `11_IMPLEMENTATION_PLAN.md` | **Execution guide** — phases, tasks, exact paths |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix, commands, adversarial matrix |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Rollout, gates, rollback |
| `14_RISK_REGISTER.md` | Risks with mitigation |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Decisions, assumptions, open decisions |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Full traceability |
| `17_FINAL_READINESS_REVIEW.md` | Verifier result, scores, PASS conditions |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack gates |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, review cycles, QA evidence, gaps |

## Hand-off note to the implementation agent

This is a **planning-only** pack. Do not implement until an approved slice is named. Start at `11_IMPLEMENTATION_PLAN.md`. Re-read every touched file immediately before editing (shared worktree), keep diffs surgical, declare file ownership in a coordination ledger, and run the focused validation in P5 before claiming complete. Defer to `first-user-activation-empty-workspace` for activation ladder / milestones / sample data / analytics SDK; defer to `Estimate-Sheet-Tree` for in-editor tree mechanics.
