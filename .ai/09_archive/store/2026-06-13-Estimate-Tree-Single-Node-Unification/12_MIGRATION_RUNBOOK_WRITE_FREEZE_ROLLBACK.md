# 12 — Migration Runbook: Write-Freeze, Dump & Rollback (P2.12 / P2.13)

Operational runbook for the irreversible step. The migration's own transactional integrity block ([08…P5.sql §7](08_unify_estimate_node_kinds.P5.sql)) is the last automated gate; this doc covers the human/ops procedure around it. PITR is **off** → a fresh manual logical dump is the **only** rollback artifact.

> **Material fact that shrinks the risk window:** the P5 migration is **function-bodies-only** — no `ALTER TABLE`, no data movement, no index rebuild. It takes only brief `ACCESS EXCLUSIVE` locks on the replaced *functions* (sub-second on this DB), not on the big tables. So the "freeze" is about consistency of the pre-flight, not about a long table-lock window.

---

## §1 · Pre-flight (BLOCKING) — run against current prod, both must return 0

`scripts/sql/unify-preflight.sql` must be committed before PR5 (identical predicate to the in-migration block). It does not exist yet; PR0 may add a stub, but PR5 cannot start without the executable file:
```sql
-- mixed estimate nodes (children AND own rows) — voids reversibility if > 0
select count(*) from public.estimate_nodes n
where exists (select 1 from public.estimate_nodes c where c.parent_id = n.id)
  and exists (select 1 from public.estimate_row_items r where r.node_id = n.id);
-- mixed template nodes
select count(*) from public.estimate_template_nodes n
where exists (select 1 from public.estimate_template_nodes c where c.parent_id = n.id)
  and exists (select 1 from public.estimate_template_row_items r where r.template_node_id = n.id);
-- orphan rows / cross-tab / missing-parent (the preserved invariants) — all 0
```
Run: `supabase db query --linked --file scripts/sql/unify-preflight.sql --output json`. **Any non-zero ⇒ ABORT** (the migration's `do`-block would abort anyway; this just fails fast before the window). Store the JSON output in the P5 run log.

## §2 · Branch dry-run (final gate)
The local PG harness already proves DDL + integrity + invariants ([08 proof](08_MIGRATION_PROOF_AND_APPLY.md)). On a Supabase branch, additionally: create branch → `apply_migration(08…P5.sql)` → confirm the `Integrity assertions passed` NOTICE → run the oracle against branch data → drop branch. Confirm `supabase gen types --linked` diff is empty (no-op).

Required restore-drill evidence:

- `pg_restore --list pre-unify-<timestamp>.dump` output captured and checked for affected tables/functions;
- before/after row-count JSON for `estimate_nodes`, `estimate_row_items`, `estimate_template_nodes`, `estimate_template_row_items`;
- restore command transcript against a branch/scratch database;
- oracle and `prove:unify-kinds` outputs after restore;
- branch cleanup receipt.

## §3 · Write-freeze mechanism (the P5 maintenance window) — **DECISION**

No runtime feature-flag infra exists for non-AILES, and a flag can't gate a `validate_*` trigger anyway (04 dim 11). Given the tiny closed-beta cohort and the sub-second, table-lock-free apply, use the **lightest sufficient freeze**:

**Recommended — announced low-traffic window + grant-revoke fence (≈2 min):**
1. Announce a short window to the beta cohort.
2. **Fence writes by revoking execute on the mutation RPCs** for the window (reads unaffected, writes fail fast and cleanly):
   ```sql
   revoke execute on function
     public.insert_estimate_row_item_with_history(uuid,uuid,uuid,jsonb,uuid,uuid),
     public.reorder_estimate_nodes_with_history(uuid,jsonb,uuid,uuid),
     public.create_estimate_node_with_history(uuid,uuid,uuid,public.estimate_node_kind,text,integer,uuid,uuid),
     public.insert_estimate_template_into_estimate_with_history(uuid,uuid,uuid,uuid,uuid,uuid),
     public.insert_estimate_subtree_into_estimate_with_history(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid)
   from authenticated;   -- (confirm exact arg signatures at P5 via \df)
   ```
   This is reversible and forgettable-proof (re-granted in step §4.5). It guarantees the pre-flight count stays 0 through the apply.

**Alternatives considered:** (a) a Vercel `MAINTENANCE_MODE` env flag + workshop read-only banner — heavier, client-only, doesn't stop a forged request; (b) full maintenance page — overkill for a 2-min window. The grant-revoke fence is server-enforced and minimal. Either of (a)/(b) is acceptable if the team prefers a visible banner; do **not** skip the freeze entirely (the reversibility guarantee depends on a stable pre-flight).

> If the §D5 split is adopted (RPC guards relax in P6), the freeze is even safer: in P5 the row/template RPCs still reject mixed writes regardless, so the freeze only needs to cover the brief apply.

## §4 · Apply sequence (owner-run)
1. §1 pre-flight = 0/0. 2. §3 freeze on. 3. **Fresh dump** (§5). 4. Apply: `supabase migration new unify_estimate_node_kinds` (paste 08…P5.sql) → `supabase db push --linked`; confirm the integrity NOTICE. 4.5. **Re-grant only** the RPCs revoked in §3; do not apply the P6 RPC relaxation in this P5 sequence. 5. Freeze off. 6. `supabase gen types --linked` → confirm empty diff. 7. Run the oracle + `prove:unify-kinds` against the post-apply state.

**P6-only apply:** the three RPC kind-guard relaxations (`insert_estimate_row_item_with_history`, `insert_estimate_template_into_estimate`, `insert_estimate_subtree_into_estimate`) are applied only with the P6 write-enable PR and its create-flow verification. P5 rollback evidence cannot count as P6 proof.

## §5 · The pre-migration dump (the ONLY rollback artifact)
Take immediately before apply, against frozen writes:
```bash
# Full logical dump (custom format, restorable selectively):
pg_dump "$SUPABASE_DB_URL" \
  --format=custom --no-owner --no-privileges --no-acl \
  --file="pre-unify-$(date -u +%Y%m%dT%H%M%SZ).dump"

# Data-only safety net for the four affected tables (fast targeted restore source):
pg_dump "$SUPABASE_DB_URL" --data-only --column-inserts \
  -t public.estimate_nodes -t public.estimate_row_items \
  -t public.estimate_template_nodes -t public.estimate_template_row_items \
  --file="pre-unify-tables-$(date -u +%Y%m%dT%H%M%SZ).sql"
```
(`SUPABASE_DB_URL` = the pooled/direct connection string; `supabase db dump --linked -f pre-unify.sql` is the CLI equivalent.) **Restore-drill the dump on the branch** before trusting it — an untested dump is not a rollback artifact (plan P0). Store off-box (it contains client data — treat as sensitive).

## §6 · Rollback decision tree

```
Apply failed mid-transaction?            → no-op. The migration is one txn; it rolled back. Re-grant (§4.5), investigate, retry.
Integrity NOTICE absent / assertion raised? → ABORT was automatic. Re-grant, fix the dirty data, retry. (Should never happen post §1.)

After P5 applied, BEFORE any mixed write (RPC guards / UI still withhold):
  Want to undo?                          → re-apply the ORIGINAL function bodies (a "revert" migration that restores the
                                            20260612094734 / 20260522091621 / 20260520222038 definitions).  Re-adding the
                                            old constraints SUCCEEDS because no data violates them. Clean. This is the last clean abort point.

After P6, a REAL mixed node now exists (point of no return crossed):
  Schema rollback is GONE (re-adding constraints fails on the mixed data). Forward-fix only:
   1. Revert the P6 PR → re-closes write capability (the RPC kind-guards return; UI guards return). No NEW mixed nodes.
   2. Existing mixed nodes are READ CORRECTLY by the kind-agnostic paths shipped in P1–P3 → NO data loss, even mid-rollback.
   3. Decide:
        (a) Leave them — they are valid under the relaxed schema; the product simply has a few mixed nodes. (Default.)
        (b) Must restore the two-kind model → write a FORWARD migration that, for each mixed node, moves its own rows
            into a new child 'area' (so the node becomes a pure container again), THEN re-add the constraints. Sketch:
              for each node N with children AND own rows:
                insert a child area A under N (next sort_order);
                update estimate_row_items set node_id = A.id where node_id = N.id;
              then re-add validate hierarchy + row-area triggers + checks.
            Verify with the oracle (totals must be byte-identical before/after the row move — it's a pure re-parent).
```

**Key safety property (proven):** because every read path is kind-agnostic from P1–P3, **a mid-P6 rollback loses no data** — any already-created mixed node renders, totals, exports, shares, and charts correctly under the reverted (read-only-for-mixed) code. The only thing rollback removes is the *ability to create more*.

## §7 · Forward-fix rollback simulation

Before P6, run a branch-only simulation for one mixed node:

1. create a node with both own rows and a child;
2. apply the forward-fix rollback sketch: create a child area, move own rows to it, then re-apply two-kind constraints;
3. prove totals/share/export/chart outputs are byte-identical before and after the row re-parent;
4. capture SQL transcript and row-count JSON.

This is not the default rollback path. It is proof that the "must restore two-kind model" emergency path is executable if product direction reverses after the point of no return.
