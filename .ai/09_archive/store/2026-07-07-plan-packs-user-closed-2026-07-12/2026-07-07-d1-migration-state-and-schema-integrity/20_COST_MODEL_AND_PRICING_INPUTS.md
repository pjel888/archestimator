# 20 — Cost Model and Pricing Inputs

## 20.1 Cost posture (binding)

Per `AGENTS.md`: "stay on free-tier / bundled Cloudflare limits; do not enable paid add-ons
(D1 paid plan, R2 paid tier, Workers Smart Placement paid, Workers Analytics paid, dedicated
egress, etc.) without explicit owner approval. Rely on daily D1 backups plus the
`cf:d1-restore-rehearsal` script for the cheaper recovery path."

This plan **does not propose any paid add-on**. All proposed operations are free-tier-safe.

## 20.2 Usage-based cost model inputs (per directive §8A)

The directive requires a usage-based cost model input sheet (not a savings claim from
pricing pages). For this plan, the cost surface is tiny and bounded.

| Cost input | Value / assumption | Free-tier impact | Source |
|---|---|---|---|
| D1 read requests (verifier `--remote`) | 4 round-trips per run (tables, indexes, triggers, compliance-column) | Negligible vs D1 free-tier daily read limit | `sqlite_master` catalog reads |
| D1 read requests (ledger `--remote`) | 1 Wrangler call per run (`d1 migrations list`) | Negligible | Wrangler CLI |
| D1 write requests | **0** (all scripts read-only) | None | by design |
| D1 storage delta | **0** (no new tables/rows) | None | by design |
| Workers CPU / requests | **0** (scripts run in Node/Bun via `bunx`, not the Worker) | None | scripts are dev/CI, not Worker routes |
| R2 operations | **0** | None | not touched |
| Cloudflare Images | **0** | None | not touched |
| Email sends | **0** | None | not touched |
| Time Travel restore (if owner invokes) | 1 restore event (destructive; staging-first) | Free-tier default retention applies; confirm at impl time | `generate-cloudflare-d1-restore-rehearsal.ts:70` official-doc URL |
| `d1 export` (if owner invokes for backup) | 1 export per restore rehearsal | Free-tier row/size considerations; large DBs export slowly | official docs |

## 20.3 What this plan does NOT cost

- No Workers CPU/request increase (no new Worker routes).
- No R2 storage/operations (untouched).
- No paid D1 plan (free-tier sufficient).
- No Smart Placement / dedicated egress / Analytics paid tier.

## 20.4 Owner-approval gates (cost-related)

- **Time Travel restore** on production `ARCH_DB`: destructive; requires owner approval
  even though it's free-tier (the cost is operational/data risk, not dollars).
- **`d1 export` on production**: non-destructive but consumes read quota for large DBs;
  owner-aware.

Neither is auto-invoked by the plan's scripts (both are documented runbook steps for the
owner, not CI).

## 20.5 No savings claim

This plan makes **no claim of cost savings**. It is an integrity/verification plan; its
value is risk reduction (avoiding first-user schema failures), not dollar savings. Per the
directive: "Do not claim savings from pricing pages alone" — and we claim none.
