# 07 — Design Decisions & Open Questions

Decisions are resolved with a recommended default, but the 2026-06-14 review
pass found one blocker before execution: the estimate-list row DTO and mutation
reconciliation contract must be frozen before optimistic UI work starts. Each
open question names the impact, the options, and the default the plan assumes.
P0 is blocked until the D8/P-1 entry gate is satisfied: contract/store tests
green, plus intentionally inverted refresh tests captured red for P0.

---

## Resolved decisions

**D1 — Sequence by felt-impact, not by category.** The audited project has 1 estimate / 47 nodes / 5 rows (`02` §E), so today's felt slowness is the overlay + no-optimistic-UI + waterfall, not data volume. P0 (UX) ships before P2 (DB), even though the DB over-fetch is "more wrong" in principle. Rationale: P0 delivers the win the user actually feels; P2 prevents a future cliff and closes a security finding but is invisible at current volume.

**D2 — Client store over `useOptimistic`/server-only.** A Zustand vanilla store (`createProjectEstimatesStore`) seeded from the server prop and reseeded on prop change is the unlock for optimistic create/delete/duplicate/edit. Chosen over React 19 `useOptimistic` because the list must persist optimistic state across multiple independent mutations and reconcile by id, and over a "just keep server-only + faster refresh" approach because no refresh is fast enough to feel instant. The store is per-mount (created in a ref), not a global singleton, so it resets correctly on project change.

**D3 — `silentRefresh` instead of resurrecting `suppressOverlay`.** The removed `suppressOverlay` flag (obs 4623) was flawed. We add a raw `router.refresh()` passthrough (`silentRefresh`) for the rare reconciliation that needs server data without navigation; in-place mutations use optimistic state and call nothing. This keeps the overlay correct for real navigation.

**D4 — Aggregation RPC is `security invoker`.** Keeps RLS exactly as privileged as today's direct selects; no new attack surface. Parity with the JS formula is gated by a golden-value prove-harness before the read path is swapped (`06` P2-1).

**D5 — Explicit columns drop `metadata`/`created_by`/`assumptions`/`workspace_id`.** These are unused by the list UI and constitute the HIGH over-fetch (F9). If a future feature needs one, add it to `ESTIMATE_LIST_COLUMNS` explicitly — the tightened row type makes the build fail loudly rather than silently shipping data.

**D6 — CSP starts Report-Only on `/workshop`.** Workshop renders user content and dynamic Next chunks; an enforced CSP risks breakage. Measure violations first, then enforce in a follow-up.

**D7 — Migrations may be applied to hosted DB under the standing pre-launch DB autonomy mandate**, but only after the prove-harness is green and `get_advisors` (security + performance) is clean.

**D8 — DTO and reconciliation contract before optimistic UI.** The list row
contract must move out of `ProjectEstimatesTable.tsx` and stop extending
`Tables<"estimates">` before any P0 optimistic-store work. Required shape:
`ProjectEstimateListRow` contains only fields the list renders or reconciles:
`id`, `project_id`, `name`, `sheet_code`, `currency_code`, `notes`,
`project_budget`, `created_at`, `updated_at`, `firstNodeId`, `nodeCount`,
`rowItemCount`, `totalProjectCost`, and optional client-only status metadata.
Create/duplicate/update/regenerate actions must return this canonical row
payload, not only `{estimateId, areaNodeId, sheetCode}`. This decision supersedes
any historical snippet or local implementation idea that builds settled rows
from partial action returns.

**D9 — Optimistic store reseed policy.** A server-prop reseed must not blindly
erase pending optimistic rows. The store contract must track pending mutations
by temp id/action id and reconcile by server id plus `updated_at`. External rows
from a refresh may update settled rows, but pending rows are retained until the
owning action resolves or fails. Search filters apply to the current store view
after optimistic updates.

**D10 — Reversible phase cutover.** P0 optimistic behavior must be guarded by a
temporary local cutover flag or single switchable adapter so reverting the P0
unit restores the existing server-prop/refresh behavior without touching P1/P2
database work. This is a release/backout aid, not a long-term feature flag.

---

## Open questions (defaults assumed; confirm to override)

**Q1 — Approve the client-store optimistic approach (D2)?**
Impact: shapes all of P0. Options: (a) **proceed with client store [default]**; (b) server-only with a faster targeted refresh (won't feel instant); (c) React `useOptimistic` (weaker multi-mutation reconciliation). Default: (a).

**Q2 — Is header chrome popping in after the shell acceptable (P1-2)?**
Streaming the publication/collaboration/teamspace header behind Suspense means it appears a beat after the table skeleton. Options: (a) **stream chrome, shell paints first [default]**; (b) keep chrome blocking (status quo, slower first paint). Default: (a) — the chrome is non-blocking metadata, not page content.

**Q3 — Approve modifying the `security definer` RLS helper bodies for initplan caching (P2-3)?**
This touches the auth perimeter. The change is mechanical (`auth.uid()` → `(select auth.uid())`, bodies otherwise identical) and gated by a before/after access-decision proof, but it is the highest-blast-radius DB change here. Options: (a) **ship migration + prove-harness, apply after advisors pass [default]**; (b) defer to a dedicated RLS-perf pass. Default: (a).

**Q4 — Include F16 rate-limiting in scope?** Default: **defer** (insert-retry already prevents code collisions; abuse-throttle is a cross-cutting concern better handled platform-wide). Track as a follow-up.

**Q5 — Realistic-volume seeding target.** `05` §6 benchmarks at 5 / 500 / 5000 rows. Confirm 5000 represents a plausible large estimate, or supply a real-world max. Default: 5000.

**Q6 — Should pagination/server-side search ship in this implementation or as
the next adjacent slice?** Independent review found `listProjectEstimates` and
client search still assume a fully fetched list. Default: add a measured
pagination/server-search decision point after P2, but do not block P0/P1 on it
unless baseline evidence shows list-row count, not row-item aggregation, is the
dominant cost.

---

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| `first_node_id` ordering mismatch silently retargets "open" links | Golden-value parity test gates the read-path swap (P2-1); lock RPC `ORDER BY` to `selectFirstEstimateNodeIds` |
| Optimistic state diverges from server on action failure | Every optimistic op has an explicit rollback path tested in P0-3/4/5 |
| RLS rewrite changes an access decision | Before/after decision proof for owner/collaborator/non-member (P2-3) |
| Streaming chrome breaks layout that assumed synchronous data | Suspense fallback `ProjectHeaderChromeSkeleton` sized to match; e2e shell-streaming assertion |
| Removing `router.refresh()` misses a cross-tab/external update | Prop-reseed effect still syncs when the server component re-renders for other reasons; `silentRefresh` available where genuinely needed |
| Migration applied to hosted DB before parity proven | Apply gated on green prove-harness + clean advisors (D7) |
| Optimistic row fabricated from partial action return | D8 requires canonical DTO and full action reconciliation payload before P0 |
| Existing tests preserve the regression | P-1 and `09` require inverting refresh assertions to no-overlay/no-refresh assertions before implementation can pass |
| Later phase stalls after client cutover | D10 requires a phase-level rollback switch and backout note for each phase |
