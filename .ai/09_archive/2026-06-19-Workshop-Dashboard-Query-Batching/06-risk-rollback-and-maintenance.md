# 06 — Risk, Rollback & Maintenance

## Risks

### RISK-A — Cross-tenant data leak via the new RPC (== RISK-20)
- **Severity:** Critical. A `security invoker` aggregate that forgets a membership join leaks another workspace's data on a guessed UUID.
- **Mitigation:** `security invoker` + `set search_path = public` + every sub-select joins through `workspace_members`/`project_members` (NOT child-table RLS alone) + user-owned favorites filter on `(select auth.uid())` + bounded `recent_limit` + `revoke execute … from public, anon`; a fresh `prove:*` cross-tenant **denial** test modelled on the existing `prove:estimate-list-summaries` is a hard gate; `get_advisors` security pass. Phase 3 only. **Note:** the `get_project_chart_buckets` RPC that the Performance-Refactor pack cites as the template is itself documented as currently missing the membership join + `revoke` and failing cross-tenant denial — do not copy it; it is a cautionary example, not a precedent. See `11-…`.

### RISK-B — Loss of degrade-gracefully resilience
- **Severity:** High. Today publications, pending invites, and the whole library spotlight tolerate missing optional tables and degrade to null/0. Folding them into one RPC means one missing table fails the whole payload.
- **Mitigation:** Keep publications + pending-invite summary **out** of the RPC (app-side best-effort reads in the OPP-1 `Promise.all` wave). If any tolerant read must move into SQL, guard with `to_regclass(...)` / `COALESCE`. Test: drop an optional table on the branch DB → dashboard still renders.

### RISK-C — `types.ts` overwrite breaks the build
- **Severity:** Medium. `src/lib/supabase/types.ts` is hand-augmented (memory: *Supabase types not pure-generated*); a raw `gen:types` overwrite drops the manual export and breaks the build.
- **Mitigation:** Splice the RPC's return type in **additively**; never regenerate-and-replace. The `jsonb` return (per `03-…` §C) keeps the splice to a single hand-typed shape. Run `next build` after.

### RISK-D — Over-batching regresses small workspaces
- **Severity:** Medium. A merged/fat query can pick a worse plan than several indexed point-lookups, and an RPC can't overlap with sibling branches.
- **Mitigation:** the Small/Medium non-regression gate (`05-…`); `EXPLAIN` review; prefer the smallest collapse that removes a wave (OPP-1 app-merge) over the RPC. If the RPC regresses smaller fixtures, keep the app-only result.

### RISK-E — Behavior drift (ordering, limits, dedup)
- **Severity:** Medium. Merging `LIMIT`ed same-table reads changes which rows return.
- **Mitigation:** follow `09-…`; prefer two bounded estimate arms in one latency wave; re-apply ordering/dedup in TS; add a **deterministic secondary sort key** (`ORDER BY updated_at DESC, id DESC` on both the DB read and the TS re-sort) so any merged query returns the same window as the separate `LIMIT`ed reads when timestamps tie; parity tests asserting identical `WorkshopHomebaseData` vs baseline after the stable sort (U3/U4). Without the tie-break, the parity gate flaps nondeterministically on the large fixture.

### RISK-G — Measurement harness lies or leaks
- **Severity:** High. Uncorrelated console timings can be misattributed under concurrent loads, and verbose traces can leak tenant identifiers.
- **Mitigation:** implement `08-…`: request-local ids, safe labels only, no ids/emails/raw SQL/tokens, concurrency proof, and explicit downgrade if the harness cannot correlate.

### RISK-H — User-visible state regression despite data parity
- **Severity:** High. The dashboard can be byte-identical as data while feeling slower, shifting layout, hiding degraded enhancements, or confusing keyboard/screen-reader users.
- **Mitigation:** run `10-…` UX state/a11y/perceived-performance gates before accepting each implementation phase.

### RISK-F — Concurrent multi-agent edits on the same seam
- **Severity:** Medium (this repo has had simultaneous agents editing `src/components/workshop/**` and `globals.css`). `workspace-repository.ts` is a hot shared file.
- **Mitigation:** land Phases 1–2 as small, separately-reviewed commits; check `git status`/blame before editing; this pack owns only the repository functions named in `04-…`. Coordinate with the Performance-Refactor pack's Phase 4/8 owner so the RPC contract isn't authored twice (RISK-22 there).

## Rollback

- **Phases 1–2 (app-only):** revert the commit. No schema, no data, no provider state touched — clean rollback.
- **Phase 3 (RPC):** use the two-deploy model in `12-…`. Deploy N adds/proves the function while the app still uses the app-only path. Deploy N+1 switches the caller behind a server-only flag such as `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`. Roll back by flipping the flag OFF first, then revert caller code if needed, then drop the function later. Because publications/invites never moved into the RPC, rollback can't resurrect a resilience gap. Keep the Phase-1 app path as the permanent fallback.

## Maintenance

- Two library fetch paths (`getLibraryOverview` for the Library page, `getLibraryDashboardSpotlight` for the dashboard) — keep the recent-component column projection in a shared constant so they don't drift.
- If Phase 3 ships, the RPC's column set is paired with the Performance-Refactor Phase-4 DTO law — change one, move the other (that pack documents the back-pointer).
- Re-run the `05-…` measurement after any later schema/index change that touches `projects`/`estimates`/`cost_library_items`.
