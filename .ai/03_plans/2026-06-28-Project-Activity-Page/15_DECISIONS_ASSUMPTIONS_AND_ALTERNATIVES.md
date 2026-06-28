# 15 — Decisions, Assumptions, and Alternatives

## Decisions (load-bearing)

| ID | Decision | Rationale | Rejected alternatives | Owner | Status |
|---|---|---|---|---|---|
| DEC-01 | Create a new `src/lib/repositories/project-activity-feed-repository.ts` rather than extending `readPublisherWorkspaceActivity` | Different audience scope (project members vs publisher roster), different filter shape (action/actor/recipient), preserves existing Publisher surface | (A) Add `projectActivityMode` flag to publisher repository — tight coupling; (B) Generalize `listProjectActivityPage` — would break the dashboard preview card contract | Eng | Decided |
| DEC-02 | Filter at SQL `where` for column-backed filters; filter at compose-time only for derived action classes | Column filters are cheap and precise; action class is a derivation that crosses source boundaries | All-SQL filter (single union view) — premature; all-compose filter — inefficient | Eng | Decided |
| DEC-03 | Cursor is a small opaque JSON encoding per-source `(created_at, id)`; encoded base64; it is transient loader state, not shareable URL state | Multi-source merges can't share a single cursor; `?cursor=` URLs cannot reproduce appended pages | Single-global cursor — impossible across tables; cursor-per-source separately in URL — ugly and misleading | Eng | Decided |
| DEC-04 | Explicit "Load more" button, not infinite scroll | Predictable for a11y and keyboard; avoids IntersectionObserver complexity | Infinite scroll — premature; pagination with page numbers — too coarse for cursor | Eng | Decided |
| DEC-05 | Route-level `loading.tsx` with project-activity-specific skeleton | Matches dashboard tile rhythm; signals what's loading | Reuse parent loading fallback — acceptable but less polished | Eng | Decided |
| DEC-06 | URL state is canonical for filters and scope only | Shareable URLs should reproduce the filtered first page; pagination is an interaction state | Cursor in URL — misleading; local-only filters — not shareable | Eng | Decided |
| DEC-07 | v1 requires a scoped collaboration-audit RPC migration and no broader schema redesign | Direct `collaboration_audit_events` API reads are revoked/denied; six-source feed needs a legitimate access path | Direct table select — blocked by deny policy; denormalized `project_activity_log` table — duplicates existing audit tables | Eng + Security | Decided |
| DEC-08 | v1 uses one authenticated read-only Route Handler for Load more; no Server Action and no public activity API | RSC owns initial/filter fetches; loader keeps cursor transient while preserving append UX | Cursor in URL — non-reproducible; Server Action for refetch — wrong tool; public API — unnecessary attack surface | Eng | Decided |
| DEC-09 | Recipient PII minimization: only `display_name`, never `email` | Internal-dashboard need-to-know; minimization principle | Show full email — privacy regression; show truncated email — still leaks the local-part | Security | Decided |
| DEC-10 | Estimate-sheet versions (`sheet_version_created`, `sheet_restored_as_copy`) remain dormant | Matches existing `listProjectActivityPage` DORMANT_NAMED_VERSION_EVENT_TYPES behavior; named versions have their own UI in the estimate sheet | Show them — duplicates the estimate-sheet version panel | Eng | Decided |
| DEC-11 | "Edited by me" preset is `actor=me` URL, resolved server-side to `currentUserId` | Avoids leaking user IDs in default links; lets users share "their" view as a preset | Client-side resolution — extra roundtrip for current user | Eng | Decided |
| DEC-12 | v1 excludes `mass_deletion_events`, `account_security_events`, `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `security_rate_limit_events`, `component_library_telemetry_events` | These are workspace/account-level; surfacing them on a project page risks scope confusion and PII bleed | Include them — RISK-09; defer — yes | Product + Security | Decided |

## Assumptions

| ID | Assumption | Source | Validation | Risk if wrong |
|---|---|---|---|---|
| ASSUMP-01 | Closed-beta scale (1 active workspace, 1–10 active projects, ≤ 100K rows per source table) | `current-state.md` FAST PATH + `02_FEATURE_BRIEF_AND_SCOPE.md` | Read at v1 ship time | Performance budget may need re-calibration |
| ASSUMP-02 | The Lewis Residence project (id `0139e1e5-951d-4f2f-9081-6c953d288d8a`) is the primary manual-QA fixture | The brief's URL | Verify route still works for this ID | Use seeded fixture for tests |
| ASSUMP-03 | The existing `estimate_sheet_events_project_created_idx` and `collaboration_audit_events_project_idx` indexes are likely sufficient at closed-beta scale | Migration reads | `EXPLAIN` during implementation | If seq scan or sort spill, add narrow index |
| ASSUMP-04 | `shared_link_events` may not have an `estimate_id` column; in `estimate:{id}` scope, all shared_link_events for the project's publications may appear | No `estimate_id` column on `shared_link_events` per `20260528220000_project_shared_link_overhaul.sql` | Confirm during implementation; document the gap | Some events may appear in estimate scope that didn't directly target that estimate; acceptable for v1 |
| ASSUMP-05 | `profiles` lookup returns internal workspace members | Existing convention in `listProjectActivityPage` and `readPublisherWorkspaceActivity` | Code review | None — existing pattern |
| ASSUMP-06 | `project_members` table exists and maps project → user | Existing collaboration surface | Verify in `src/lib/supabase/types.ts` | If different table, swap dropdown query |
| ASSUMP-07 | The "Activity" mini-sidebar item already exists | Static source inspection of `src/components/workshop/ProjectMiniSidebar.tsx` in this improvement pass | Verify unchanged before edit | Trivial add if removed by later work |
| ASSUMP-08 | URL searchParams in Next.js 16 are async (Promise) | Existing `src/app/workshop/projects/[projectId]/page.tsx` uses `params: Promise<...>`; searchParams follow the same pattern in Next.js 16 | Read Next.js 16 local docs in `node_modules/next/dist/docs/` | If sync, simpler code |
| ASSUMP-09 | No new dependencies are needed | All UI primitives exist | Code review | Add if missing |
| ASSUMP-10 | Existing `DORMANT_NAMED_VERSION_EVENT_TYPES` exclusion is desired at the project level too | Existing dashboard preview behavior + ODD-10 | Implementation-time confirmation only if new evidence appears | If reversed, just remove the exclusion |

## Alternatives considered and rejected

| Alternative | Why rejected |
|---|---|
| Single SQL view union across 6 sources | Harder to evolve; harder to debug; harder to apply source-specific RLS |
| Supabase Realtime subscription | Out of scope for v1; closed-beta doesn't justify |
| Cross-project workspace feed (workspace-activity page) | Already covered by Publisher surface |
| Public/client-facing activity view | Internal-only per `02` |
| Public or broad Route Handler with custom DTO | A narrow authenticated loader is enough; no unauthenticated/public activity API |
| Generalizing `listProjectActivityPage` to multi-source | Would regress the dashboard preview card contract |
| Adding `projectActivityMode` to publisher repository | Tight coupling; publisher and project activity have different audiences |
| Infinite scroll instead of "Load more" | A11y and keyboard predictability suffer |
| Storing all filters in local state | Not shareable; back/forward broken |
| Storing cursor in the shareable URL | Does not reproduce appended pages on reload/share without cursor stack or refetch-all semantics |
| Adding a `project_activity_log` denormalized table | Duplicates existing audit tables; introduces a sync problem |
| Using `service_role` for the repository | Bypasses RLS — hard NO |
| Showing recipient email as actor label | PII leak; rejected by Security |
| Including `account_security_events` | Workspace-account scope, not project scope; rejected |
| Adding an in-app tutorial for the page | Out of scope for v1 |
| Adding CSV/Excel export | Out of scope for v1 |
| Adding full-text search across bodies | Out of scope for v1 |

## Decision log

| Date | Decision | Made by |
|---|---|---|
| 2026-06-28 | Plan profile `exhaustive` chosen (touches publication/shared-link/client data) | Lead (this run) |
| 2026-06-28 | Original `verification_mode: emulated` superseded by native council review-in-progress for the improvement pass | Lead + council |
| 2026-06-28 | Owner-delegated defaults ODD-01..ODD-12 resolved; no Philip-confirmation blocker remains for reversible v1 defaults | Lead as delegated owner |
| 2026-06-28 | v1 requires scoped collaboration-audit RPC migration (DEC-07) | Lead + critic/test council |
| 2026-06-28 | v1 allows one authenticated Load more Route Handler; no public activity API (DEC-08) | Lead + architect council |
| 2026-06-28 | Recipient PII minimization (DEC-09) | Lead (this run) |
| 2026-06-28 | Estimate-sheet versions stay dormant (DEC-10) | Lead (this run) |
