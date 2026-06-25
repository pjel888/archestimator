---
title: Risk Decision and Rollback Register
type: docs
date: 2026-06-25
---

# Risk, Decision, and Rollback Register

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| `D-01` | Use top-level `IMPLEMENTATION_PLAN.md` in each source folder as canonical where present. | Specialist auditors found numbered plans are historical/superseded in several folders. |
| `D-02` | Data/RPC/migration work is single-owner. | Center and tree both touch estimate persistence and `actions.ts`; independent migrations are unsafe. |
| `D-03` | Project sources are snapshot copy, not live/read-through. | Matches current implementation and avoids misleading right-sidebar UX. |
| `D-04` | Broad validation is final/interpretable, targeted RED->GREEN is merge-blocking. | Current baseline may be noisy; targeted tests prove changed behavior. |
| `D-05` | Below-1024 scope is honest fallback unless drawer is explicitly scoped. | Drawer/focus-trap work is separate browser-proofed UX scope. |
| `D-06` | Browser-local preferences are acceptable in beta; local-only persistent CRUD is not. | Preferences are lower-risk if documented; CRUD deception breaks user trust. |
| `D-07` | Do not decompose large components before behavior locks. | Refactor-first would increase merge and regression risk. |
| `D-08` | Run right-sidebar honesty early after MOP-0, but withhold global launch readiness until center and tree integrity gates pass. | Right fixes are disjoint trust wins; center/tree data risks still dominate release readiness. |
| `D-09` | Treat source-plan SQL as sketches, not executable migration input. | Current generated types and code may have moved since the plan text was written. |
| `D-10` | Preserve quick-win source phase semantics with MOP-0.5. | Low-risk empty-state, `aria-controls`, sizing, and copy fixes should not wait behind DB-heavy phases if file ownership is locked. |
| `D-11` | Accept tree LWW only where source plan deliberately accepts it and tests document the boundary. | `T-09` is a known tradeoff, not a missing conflict-control feature for this scope. |
| `D-12` | Enforce max-depth 100 in client/server/DB where tree changes touch depth-sensitive paths. | `T-14` recursive DoS must not rely on UI-only limits. |

## High Risks

| Risk | Severity | Owner | Mitigation | Rollback/Fix-Forward |
|---|---|---|---|---|
| Atomic center move migration/action corrupts row history or revisions. | Critical | Data owner | SQL/RPC RED tests, transaction proof, row cap, generated types, RLS/grants review. | Disable client path by flag; revert action wiring; apply corrective migration if data written. |
| Bulk row delete partially deletes rows. | Critical | Data/center owners | All-or-nothing RPC proof before UI wiring. | Disable bulk delete; restore from backup/dump if needed; fix forward with audit trail. |
| Tree sort-order migration causes uniqueness or precision issues. | High | Data/tree owners | Preflight, repeated-move exhaustion tests, separate migration, manual logical dump. | Fix-forward rebalance; do not rely on PITR; document downgrade limitations. |
| Telemetry sink is assumed but not installed. | High | Release/ops owner | Prove storage/table/sink in MOP-0 or explicitly downgrade rollout to manual observation. | Disable metrics claims; do not block app behavior on missing sink unless selected. |
| Share-token leakage through referrers. | High | Security owner | Add no-referrer/no-store proof for token-bearing share routes and linked media paths. | Revert header/copy changes or block public/share claim until proof passes. |
| Recursive tree depth or payload DoS. | Medium-high | Tree/data owners | Enforce max depth 100 at client/server/DB boundary and test oversized insert/reorder/delete. | Reject oversized mutations; fix-forward guards if missing. |
| Accepted LWW can hide lost updates. | Medium | Tree owner | Document accepted surface, add stale-conflict tests where LWW is not accepted, and telemetry conflict outcomes. | Disable conflicting mutation path or add revision check in fix-forward. |
| Shared `ui/tree.tsx` keyboard changes regress right sidebar. | High | UX/tree primitive owner | Shared regression tests for tree, LibraryTree, TemplatesTree. | Revert primitive change or guard new behavior behind prop. |
| Right edit/duplicate misuses `AddComponentModal` and duplicates identity/history incorrectly. | High | Right owner | Characterization tests before wiring edit mode. | Disable edit/duplicate flag; revert to view-only until fixed. |
| Read-only mode can mutate through drag/custom/keyboard path. | High | Contract owner | Permission matrix and negative tests for every entry point. | Disable mutating events and drag insertions; server remains authority. |
| Telemetry leaks PII or is unusable for rollout. | Medium-high | Ops/security owner | Allow-list fields, redaction review, smoke event queries. | Disable telemetry emission; purge bad event rows if needed. |
| Full validation reds hide regression. | Medium | QA owner | Baseline classification, targeted proof for every touched behavior. | Block release if new red cannot be classified. |

## Rollback Policy

- Prefer flags and client-path rollback for UI behavior.
- Treat DB/RPC changes as fix-forward unless a safe down migration is explicitly proven.
- Capture manual logical dump before high-risk Supabase migrations because PITR is intentionally disabled.
- Do not claim "rollback without redeploy" for `NEXT_PUBLIC_*` flags unless runtime flag source exists.
- Record rollback evidence in `08_MASTER_BEFORE_AFTER_REPORT.md` after implementation.

## Unsafe Shortcuts to Reject

- Shipping UI fixes before server atomicity proof for data-integrity issues.
- Applying migration-plan SQL sketches without live introspection.
- Keeping two-RPC center move with compensating rollback.
- Implementing bulk row delete as `Promise.all` or per-row savepoints with partial success.
- Depending on RLS alone while UI and actions permit viewer mutation attempts.
- Treating Playwright drag/drop success as proof of transaction atomicity.
- Adding a new feature-flag framework when existing project patterns suffice.
- Creating a template-group persistence table for this scope.
- Renaming DB/RPC/file `sheet` keep-list names during user-facing terminology cleanup.
- Logging raw telemetry queries, names, URLs, file paths, filenames, suppliers, components, or free text.
