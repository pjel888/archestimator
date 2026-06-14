# P5 — Relax-only migration APPLIED to prod (estimate-node unification)

**Date:** 2026-06-14 · **Project:** `ebxxqidacheyapmmzavr` · **Migration:** `20260614003639_unify_estimate_node_kinds`
**Applied via:** Supabase MCP `apply_migration` (owner-authorized), with owner supervising. **Result:** success.
**Status after P5:** schema permits mixed content; **writes still withheld** (the 3 RPC kind-guards intact) → P6 not done. Reversible-until-first-write. **P6 = the irreversible point of no return, NOT yet performed.**

## Sequence run (runbook 12 §1–§7)

1. **Pre-flight (read-only, MCP):** `mixed_estimate_nodes=0, mixed_template_nodes=0, orphan_estimate_rows=0, orphan_template_rows=0`. Artifact: `scripts/sql/unify-preflight.sql`.
2. **Write-freeze:** SKIPPED as redundant (justified) — the adopted P5/P6 split keeps the row/template/subtree RPC guards rejecting mixed writes throughout P5; old constraints hold until commit; the migration is one self-aborting transaction (integrity `DO` block). No revoke/re-grant performed → no risk of leaving writes broken.
3. **Dry-run (final gate):** `prove:unify-kinds` on local PG17 over the full 86-migration chain — PASS: migration applies; *"Integrity assertions passed: 0 orphan/cross-tab/missing-parent/mixed nodes"*; POST mixed content accepted; **I1 cycle / I2 cross-tab / I3 missing-parent / orphan-row still REJECTED**; **RPC write-freeze still holds** (row-insert onto a group rejected). (Hosted-branch dry-run skipped — type regen is a verified no-op; doc 08 §"why local".)
4. **Rollback artifact (the dump substitute — P5 is function-bodies-only, zero data movement):** captured the 5 LIVE pre-apply function definitions via `pg_get_functiondef` → `scripts/sql/unify-rollback-pre-apply.sql` (re-apply to restore the strict two-kind rules; succeeds while no mixed node exists). Row-count snapshot pre-apply: nodes 139 / rows 114 / template-nodes 10 / template-rows 16. (A full `pg_dump` was not taken — the direct DB host is deprecated/unresolvable and P5 moves no data; the function-body revert is the runbook §6 P5 abort path.)
5. **Apply (MCP):** the 5 `create or replace function` + grant replay + integrity `DO` block (begin…commit). Recorded in `supabase_migrations.schema_migrations` as `20260614003639`.
6. **Re-grant:** n/a (no freeze taken).
7. **Verify (post-apply):**
   - **Function relaxation (comment-stripped check):** all 5 P5 functions have **no real `kind` clause** (relaxed); all 3 write-RPCs (`insert_estimate_row_item_with_history`, `insert_estimate_template_into_estimate`, `insert_estimate_subtree_into_estimate`) **still carry their `kind` guard** → writes withheld.
   - **Data unchanged:** row counts identical (139/114/10/16); **0 mixed nodes** (estimate + template).
   - **Security advisors:** **0 ERROR** (116 total = 5 INFO + 111 WARN; the WARNs on `enforce_estimate_row_item_area_node` are pre-existing security-definer-executable notices matching the original grant posture).
   - **gen types:** verified no-op (only function bodies changed; no signature change → `src/lib/supabase/types.ts` unaffected).

## Repo recording
- `supabase/migrations/20260614003639_unify_estimate_node_kinds.sql` — committed (the applied body, P6 footer excluded).
- `scripts/sql/unify-preflight.sql` + `scripts/sql/unify-rollback-pre-apply.sql` — committed.

## Rollback (if needed BEFORE P6)
Re-apply `scripts/sql/unify-rollback-pre-apply.sql` (restores strict validators/triggers; clean because 0 mixed nodes). After P6 + a real mixed write, schema rollback is gone → forward-fix only (runbook §6).
