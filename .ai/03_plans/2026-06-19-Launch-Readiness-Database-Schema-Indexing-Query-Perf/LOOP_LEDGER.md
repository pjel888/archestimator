# LOOP LEDGER — Launch-Readiness DB Schema / Indexing / Query Perf

HIGH-BLAST-RADIUS area (DB/index/RLS). Audit pass is read-only on source; any execution
spun out of this pack runs as its own dated pack with a Codex review gate.

**Launch blockers in this domain: 0.**

---

## DISCOVER
- Inherited prior audit `01-AUDIT-FINDINGS.md` (8 findings, DBPERF-01..08) + `00-README.md`.
- Reconciled against prior packs on disk: `2026-06-17-Performance-Refactor/14_PHASE_8_SUPABASE_DB_PLAN.md`
  (§2.1 FK adds, §2.3/Q-J unused drops, GAP-7 caveat, §1#7 first-node oracle, §1#1/Q-E library),
  `database-indexing-and-query-performance/` (planning-only audit, never executed),
  `2026-06-19-Projects-Page-Performance` (adjacent, app-side), `.ai/09_archive/…Query-Batching`.
- Live target `ebxxqidacheyapmmzavr` read-only via SQL: advisor numbers, `pg_index`,
  `pg_policies`, `pg_stat_user_tables/indexes`, table volumes.

## PLAN
- Adversarially verify each finding against live catalog + cited source (default: refute).
- For confirmed/adjusted findings, sequence a remediation plan (launch-blockers first).
- Produce evidence + proof gates honest about what local checks can/can't prove.

## EXECUTE (this pass = verification + planning only; no DDL, no source edits)
- DBPERF-01 Confirmed: 84 unindexed FKs live; 7/8 read-hot targets missing
  (`estimate_favorites.estimate_id` already indexed — scope corrected).
- DBPERF-02 Confirmed: 3 duplicate index pairs verified live (projects, estimate_nodes, publications).
- **DBPERF-03 REFUTED:** 0 unwrapped `auth.*()` policies live; every ref is `( SELECT auth.uid() )`;
  migration `20260613201302_rls_initplan_is_workspace_member.sql` + `prove:rls-initplan` exist.
  Removed from backlog. (Prior claim of "22 unwrapped" was false against the live catalog.)
- DBPERF-04 Confirmed: `component-library-repository.ts:560-567` `select("*")` no-limit; no covering
  index; 154 rows. (Index should be PARTIAL on `lifecycle_state <> 'archived'`.)
- DBPERF-05 Confirmed: `project-charts-repository.ts:181` `.order("id")`; chart-buckets RPC not shipped.
- DBPERF-06 Confirmed: 18 `unused_index` live (was 13).
- DBPERF-07 Confirmed (info): types.ts parity; process foot-gun only.
- DBPERF-08 Adjusted: real but RPC fix non-trivial (deliberate NULL first_node_id, link-aware
  oracle); line citation stale (`2004-2020`, not `1620-1683`).

## VERIFY
- All live SQL results captured in `03-EVIDENCE-AND-VERIFICATION.md`.
- Wrote `02-REMEDIATION-PLAN.md` (R1..R6) and `03-EVIDENCE-AND-VERIFICATION.md`.

## RECORD
- Findings of record: `01-AUDIT-FINDINGS.md` (prior) + this pass's verdicts in `03-…md`.
- Remediation backlog: R1 (read-hot FK indexes, P1, ship pre-launch), R2 (library bound, P2,
  coord D8), R3 (drop duplicates, P3, gated after R1), R4/R5/R6 (defer post-beta).
- DBPERF-03 retired as refuted.

## DECIDE (open for implementer / owner)
- [ ] D-01: Ship R1 read-hot FK index batch pre-launch? (recommended — defensible, additive, S effort.)
- [ ] D-02: Q-E — does prod call the full vs Lite component-library loader? Gates R2 limit choice.
- [ ] D-03: R3 duplicate drops after R1 + fresh advisor pass + GAP-7 cross-check.
- [ ] D-04: R5/R6 deferred to a post-beta `pg_stat_user_indexes` observation window — confirm defer.
- [ ] Any execution = new dated pack + Codex review gate (HIGH-BLAST-RADIUS DB/index).

**State:** verification complete, remediation planned, ready for an implementer to execute R1.
