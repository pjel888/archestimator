# 08 — Migration: Proof Results & Apply Procedure (P0.3)

Artifacts:
- **The SQL** → [`08_unify_estimate_node_kinds.P5.sql`](08_unify_estimate_node_kinds.P5.sql) — complete, applyable relax-only DDL (validators + row-triggers + reorder + grant replay + integrity assertion block), plus the documented Phase-6 RPC edits.
- **The proof harness** → [`scripts/prove-unify-estimate-node-kinds-postgres.mjs`](../../../scripts/prove-unify-estimate-node-kinds-postgres.mjs) — also serves as the **P5 cycle + cross-tab regression test** (plan 03 P5 / 04 checklist).

---

## Why a local PG harness, not a hosted Supabase branch

The handoff asked for a Supabase-branch dry-run. Two ground-truth facts redirected this to the repo's standard local proof:

1. **The hosted Supabase MCP requires interactive OAuth** (only `authenticate` is exposed); the branch/`apply_migration`/`gen_types` tools can't be driven autonomously, and a hosted branch is billable + needs teardown. This repo already proves migrations with ephemeral local Postgres (`scripts/prove-*-postgres.mjs`); AGENTS.md / session memory note Docker is absent and the local PG harness is the convention.
2. **Type regen is a verified no-op.** The migration changes only function *bodies* — no table, column, enum, or function *signature* changes. `src/lib/supabase/types.ts` is therefore unaffected; `supabase gen types --linked` would produce an empty diff. The migration's correctness is purely "DDL applies + integrity holds + invariants preserved + writes still gated" — exactly what the harness proves on the full real schema.

> At P5 implementation time, the owner SHOULD still run the hosted dry-run on a branch as the final gate (it's in the runbook, [12](12_MIGRATION_RUNBOOK_WRITE_FREEZE_ROLLBACK.md)). This proof de-risks it to a formality.

## Proof run (2026-06-13, postgresql@17, full 86-migration chain)

```
POSTGRES_BIN_DIR=/opt/homebrew/opt/postgresql@17/bin \
  node scripts/prove-unify-estimate-node-kinds-postgres.mjs
```

Result — **all assertions passed**:

```
── PRE-migration: current two-kind rules must REJECT mixed content ──
✓ PRE: seeded all-area tree validates
✓ PRE: row on a GROUP node rejected (enforce_estimate_row_item_area_node)
✓ PRE: child under an AREA node rejected (validate_estimate_node_tree hierarchy)

── Applying relax-only migration (08_unify_estimate_node_kinds.P5.sql) ──
  migration applied; NOTICE: Integrity assertions passed: 0 orphan/cross-tab/missing-parent/mixed nodes (estimate + template).

── POST-migration: relaxation holds, invariants preserved ──
✓ POST: child under a (former-area) node now ACCEPTED — areaNode is now mixed (row + child)
✓ POST: row on a (former-group) node now ACCEPTED — rootNode is now mixed (rows + children)
✓ POST: tree with mixed nodes validates
✓ POST · I1: cycle still REJECTED
✓ POST · I2: cross-tab parent still REJECTED
✓ POST · I3: missing parent still REJECTED
✓ POST: orphan row (bad node_id) still REJECTED (relaxed orphan guard)

── POST-migration: Phase-5 RPC write-freeze still holds ──
✓ POST: insert_estimate_row_item_with_history onto a GROUP node STILL rejected (RPC guard intact in P5 → writes withheld)

✅ unify-estimate-node-kinds local Postgres proof passed
```

### What each assertion proves (maps to plan invariants)

| Assertion | Proves |
|---|---|
| PRE row-on-group / child-under-area rejected | the two-kind rules are real before the migration (baseline) |
| Integrity NOTICE `0 … mixed nodes` | the integrity assertion block (plan 02 §B step 9) gates on clean data |
| POST child-under-area / row-on-group accepted | the relaxation works — mixed content is now persistable at the schema layer (R6) |
| POST tree-with-mixed validates | no false positive from the rewritten validator |
| POST cycle / cross-tab / missing-parent rejected | **I1 / I2 / I3 preserved** — the regression that "a careless edit drops a shared-body check" did not happen |
| POST orphan-row rejected | the relaxed BLOCK B + relaxed trigger keep the referential guard (the §E.2 "relax-not-drop" decision) |
| POST RPC row-insert still rejected | **the Phase-5 write-freeze holds at the enforcement layer** (§F split) — P5 ships zero row-write capability even against a forged call |

## Apply procedure (hosted prod — owner-run, at P5)

Pre-reqs come from the runbook ([12](12_MIGRATION_RUNBOOK_WRITE_FREEZE_ROLLBACK.md)); the SQL itself is self-gating (integrity block aborts the transaction on dirty data).

```bash
# 1. BLOCKING integrity pre-flight (must both return 0) — same predicate as the in-migration block:
supabase db query --linked --file scripts/sql/unify-preflight.sql   # see runbook §2 for the SQL

# 2. Branch dry-run (final gate):
#    create branch → apply 08_unify_estimate_node_kinds.P5.sql → confirm the integrity NOTICE → drop branch

# 3. Freeze writes (runbook §3), take the fresh logical dump (runbook §4 — the only rollback artifact)

# 4. Commit the migration into history and apply:
supabase migration new unify_estimate_node_kinds      # paste 08_unify…P5.sql body
supabase db push --linked

# 5. types are a no-op, but confirm:
supabase gen types typescript --linked > /tmp/types.next.ts
diff src/lib/supabase/types.ts /tmp/types.next.ts     # expect: no diff
```

## Re-running the proof in CI / locally

`POSTGRES_BIN_DIR=/opt/homebrew/opt/postgresql@17/bin node scripts/prove-unify-estimate-node-kinds-postgres.mjs`

Add it next to the existing prove scripts in `package.json` at P5:
`"prove:unify-kinds": "node scripts/prove-unify-estimate-node-kinds-postgres.mjs"`.

## Additional RLS/RPC proof required

The current proof harness proves DDL, integrity assertions, preserved tree invariants, orphan-row rejection, and one P5 row-RPC guard. It does **not** yet prove the full access/RPC risk being changed.

Add a second harness/script and package command:

```json
"prove:unify-kinds-rls-rpc": "node scripts/prove-unify-estimate-node-kinds-rls-rpc.mjs"
```

Required assertions:

- anon/public cannot execute mutation RPCs after grant replay;
- viewer/member without edit rights is denied for create/reorder/row/template/subtree mutation paths;
- owner/editor happy path still works for the unchanged P5-safe operations;
- P5 still blocks all three mixed write guards at the RPC layer:
  - `insert_estimate_row_item_with_history` onto a former group;
  - `insert_estimate_template_into_estimate_with_history` into a former area/mixed target;
  - `insert_estimate_subtree_into_estimate_with_history` into a former area/mixed target;
- P6 permits those mixed writes only for authorized editors and still rejects anon/viewer calls;
- grant/revoke ACLs match the established estimate-tabs harness pattern in `scripts/prove-estimate-tabs-postgres.mjs`.

PR0 should add the package command and a skipped/placeholder harness only if the P6 assertions cannot run yet; PR5 cannot pass without executable P5 RLS/RPC assertions, and PR6 cannot pass without executable authorized mixed-write assertions.
