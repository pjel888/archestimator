# 15 — Verification Log & Assumptions Closure

**What this is:** The 2nd-pass evidence that closes the open assumptions from the first pass with fresh live reads, plus the outcome of the code-graph re-index (U17). All reads were read-only; no provider mutation, migration apply, or insert was performed.

---

## 1. DEF-1 root cause — now empirically confirmed (was an assumption)

**Live read (read-only, project `ebxxqidacheyapmmzavr`, 2026-06-13):**

```sql
select to_regclass('public.estimate_tabs')::text as estimate_tabs_regclass,
  (count of estimate_nodes.estimate_tab_id column) as estimate_nodes_has_tab_col,
  (count of pg_proc insert_estimate_subtree_into_estimate_with_history) as subtree_rpc_count,
  (count of pg_proc assert_can_edit_estimate_for_history) as hardened_gate_count,
  current_setting('server_version') as pg_version;
```

| field | result | confirms |
|---|---|---|
| `estimate_tabs_regclass` | **null** | `public.estimate_tabs` does not exist live → DEF-1 root cause, DB-1 |
| `estimate_nodes_has_tab_col` | **0** | `estimate_tab_id` column absent live → DB-1 |
| `subtree_rpc_count` | **0** | the project-source insert RPC was never built → DEF-2 |
| `hardened_gate_count` | **0** | the hardened `can_edit` gate is not live → live insert RPC uses the unhardened gate → SEC-1 |
| `pg_version` | **17.6** | for the apply runbook ([14](14_MIGRATION_APPLY_AND_ROLLBACK_RUNBOOK.md)) |

**Live browser (reproduced 4×):** expanding any project-source estimate's outline returns HTTP 500. The error banner renders the **literal** string:

> `Couldn't load estimate outline. {code: ..., details: Null, hint: ..., message: ...}`

The `...` are **literal placeholders in the UI**, not screenshot truncation (captured via DOM text extraction, element `ref_2634`). This means two things:
1. **Root cause is proven** — the outline loaders throw because `estimate_tabs` is absent (the `getEstimateTabs`/`getEstimateTabTree` throw, with no `isEstimateTabsSchemaMissing` fallback; [07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) DEF-1).
2. **UX-6 is worse than first scored** — the error formatter doesn't even render the real message; it emits a template with literal `...` for `code`/`hint`/`message` and `Null` for `details`. So the UI both *leaks* a structured-error shape *and* fails to populate it. (The exact wire code — PostgREST `PGRST205` vs Postgres `42P01` — is therefore not recoverable from the DOM; it is elided by the formatter. The underlying cause is independently proven by `to_regclass = null` above, so the exact code string is immaterial to the fix.)

**Assumption closed:** the first pass labelled "exact `42P01` inferred from error shape" as an ASSUMPTION. It is now resolved: the missing table/column is **proven** by live reads; the exact wire code is **deliberately unrecoverable** from the app because the UI elides it (a UX-6 sub-bug, fixed by U1b).

---

## 2. Code-graph re-index (U17)

| Index | Action | Result |
|---|---|---|
| **code-review-graph** (MCP) | `build_or_update_graph_tool(full_rebuild=true, postprocess=minimal)` | **SUCCESS** — files **1054 → 1168 (+114)**: the previously-unindexed `src/lib/reusable-sources/` files (0 nodes in the first pass → the cause of the blast-radius under-reporting in [06](06_BLAST_RADIUS_ANALYSIS.md)) are now parsed. The full-rebuild call reported ~15.2k nodes / ~164.8k edges; because the graph auto-updates via file-change hooks, exact node/edge totals drift between rebuilds (a later `list_graph_stats` read showed ~14.2k nodes). The **stable, meaningful signal is the +114 files** now covering reusable-sources, so impact analysis on those symbols is now reliable. |
| **GitNexus** (`npx gitnexus analyze`, the command CLAUDE.md prescribes) | attempted | **FAILED** — `SyntaxError: Unexpected token '??='` (the installed `gitnexus` build uses nullish-coalescing-assignment, unsupported by the Node version resolving `npx gitnexus`). The GitNexus index referenced in CLAUDE.md **cannot be refreshed via this command in this environment.** |

**Action item (new):** the broken `gitnexus` CLI is a real tooling defect — either pin a newer Node for `npx gitnexus`, or update CLAUDE.md to prefer the code-review-graph `build_or_update_graph_tool` (which works). Until then, the "MUST run `gitnexus_impact` before editing" rule in CLAUDE.md is unenforceable on this machine; use code-review-graph's `get_impact_radius_tool` instead. Tracked as U17 follow-up in [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md).

---

## 3. Assumptions-closure table (first pass → now)

| Pass-1 assumption | Status now | Evidence |
|---|---|---|
| DEF-1 exact error code inferred from shape | **Closed** — root cause proven; exact code is UI-elided (UX-6 sub-bug) | §1 live reads + DOM text |
| `estimate_tabs` not live (DB-1) | **Confirmed** | `to_regclass = null`, column count 0 |
| Project-source insert RPC absent (DEF-2) | **Confirmed live** | `pg_proc` count 0 |
| Live insert RPC unhardened (SEC-1) | **Confirmed live** | hardened gate `pg_proc` count 0 |
| code-review-graph stale for reusable-sources (06) | **Resolved** | full rebuild added the files (§2) |
| Runtime perf budgets (p95, export timings, EXPLAIN) | **Still manual-proof-pending** | require running benchmarks/EXPLAIN — out of scope for read-only; scheduled as U8/U9/U16 verification |
| Two-user RLS-harness for denials 1–3/9 against applied schema | **Still pending** | requires applying the migration to an ephemeral DB + running `scripts/prove-estimate-tabs-postgres.mjs` |
| Responsive/below-`lg` UX behaviour | **Still pending** | requires a narrow-viewport pass |

The three still-pending items are runtime/provider proofs correctly outside a read-only audit; they become live work the moment D-A (apply) / D-B (build) are authorized.

## Truth & integrity

- **VERIFIED (live this pass):** the five `pg_proc`/schema reads; the 4× browser repro; the literal-`...` error formatting; the graph rebuild deltas; the `gitnexus` CLI failure.
- **Still ASSUMPTION:** the three runtime/provider items above — explicitly not closed by a read-only pass.
