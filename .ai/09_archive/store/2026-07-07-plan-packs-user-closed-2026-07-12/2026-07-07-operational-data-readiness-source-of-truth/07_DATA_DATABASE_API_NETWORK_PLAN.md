# 07 — Data, Database, API, and Network Plan

## Applicability

This feature is **docs/scripts only**. It does **not** touch D1 schema, R2 objects, Durable Object state, Queue messages, Email sending, or any network path. Therefore:

- **No Database Change Blueprint is required** (no migration, no schema, no app-authz change). Per Creating-Plan-Prompt §8A, this is stated with evidence rather than omitted.
- **No API/network contract** is added or changed.

The only "data" is the generated snapshot JSON, which is a static artifact, not a database.

## Data the feature *reads* (read-only, no mutations)

| Source | Read by | Purpose | Mutated? |
|---|---|---|---|
| `wrangler.jsonc` | generator | cron list, bindings, compat, routes | no |
| `migrations/*.sql` (filenames only) | generator | count + latest filename | no |
| `worker.ts` (scheduled branch text) | generator | dispatched-cron list | no |
| `package.json` (script names) | generator | which proof scripts exist | no |
| `AGENTS.md`, `README.md`, `current-state.md`, canonical home | detector | assertion targets | no |

## Data the feature *writes*

| Target | Written by | Format | Lifecycle |
|---|---|---|---|
| `operational-truth.snapshot.json` | generator | JSON, deterministic, `generated:true` header | committed; regenerated on substrate change |
| Canonical home (Markdown) | human/agent (authoring-time) | Markdown | version-controlled like any doc |
| Detector stdout/exit code | detector | text | ephemeral |

## Snapshot schema (the only "data contract")

```jsonc
{
  "generated": true,            // marker; detector fails if false/absent in committed file
  "doNotEdit": true,
  "generatedAt": "<ISO8601>",   // the ONLY non-deterministic field; detector ignores it
  "worker": {
    "name": "archestimator-proof",
    "main": "worker.ts",
    "compatibility": { "date": "2026-06-29", "flags": ["nodejs_compat"] },
    "customDomains": ["archestimator.com", "www.archestimator.com"],
    "workersDev": true
  },
  "d1": {
    "binding": "ARCH_DB",
    "databaseName": "archestimator-proof-db",
    "databaseId": "9bdb29bb-687e-4f51-ae81-7659c426ea5f",  // public binding id, not a secret
    "migrationCount": 38,
    "latestMigrationFile": "0038_component_draft_resource_limits.sql"
  },
  "r2": { "binding": "ARCH_UPLOADS_R2", "bucket": "archestimator-proof-uploads" },
  "durableObjects": [{ "binding": "COLLAB_ROOMS", "class": "CollaborationRoom" }],
  "queues": [{
    "binding": "UPLOAD_JOBS_QUEUE",
    "queue": "archestimator-upload-jobs",
    "dlq": "archestimator-upload-jobs-dlq",
    "consumer": { "max_batch_size": 5, "max_batch_timeout": 30, "max_retries": 3 }
  }],
  "images": "IMAGES",
  "email": "EMAIL",
  "assets": "ASSETS",
  "crons": ["0 3 * * *", "15 3 * * *", "30 3 * * *"],
  "cronDispatched": ["0 3 * * *", "15 3 * * *", "30 3 * * *"],  // parsed from worker.ts
  "scripts": { "cf:readiness": "...", "cf:release-gates": "...", "cf:queues-cron-proof": "..." }
}
```

**Integrity invariants:**
- `crons` (from `wrangler.jsonc`) must equal `cronDispatched` (from `worker.ts`). If they differ, the generator emits a **warning field** `cronConfigVsDispatchMismatch: [...]` — a cron declared but never dispatched (dead config) or dispatched but undeclared (would be silently dropped by the runtime). This is itself a useful drift signal.
- `migrationCount` must equal the filename count.
- `databaseId` is a Cloudflare **binding identifier**, not a credential. It is already public in `AGENTS.md:40` and `wrangler.jsonc` (committed). It is not treated as a secret (see SEC-1).

## Database/provider proof boundary

- This feature produces **no** provider proof. It does not call the Cloudflare API, does not read remote D1, does not verify remote migration apply state.
- Remote D1 migration-apply reconciliation is the **sibling** `2026-07-07-d1-migration-state-and-schema-integrity` scope. This pack's snapshot counts *local* `migrations/` files only and labels it as such (`migrationCount` = local file count). The home must state "local migration files; remote-apply status tracked in the d1-migration-integrity pack" to avoid implying remote parity.

## Retention / deletion / audit

- The snapshot JSON has no retention lifecycle (it is overwritten on regen). No PII, no user data, no deletion concern.
- The canonical home is version-controlled; its history *is* the audit trail of operational-fact changes — a benefit over the current scattered state.

## Rollback (data-specific)

- If the snapshot/detector cause CI to fail spuriously, rollback = revert the offending commit (the detector is additive; removing it restores prior behavior). No data repair needed because no data was mutated.
