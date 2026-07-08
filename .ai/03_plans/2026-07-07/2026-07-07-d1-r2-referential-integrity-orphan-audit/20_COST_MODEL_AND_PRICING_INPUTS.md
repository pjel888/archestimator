# 20 — Cost Model and Pricing Inputs

Per the provider overlay, this is a usage-based cost model **input sheet**, not a savings claim. R2 `list()` is the only new metered surface introduced by this pack.

## Metered surfaces touched by the audit

| Surface | Cloudflare operation class | Billed? | Notes |
|---|---|---|---|
| D1 reads (detection queries) | D1 rows read | included in D1 plan (free tier: 5M rows read/day) | bounded by pagination; ~25 queries + pragmas per run |
| R2 `list()` (reconciliation) | **Class B (operations)** | yes — free tier 10M Class B ops/month | the new cost surface |
| R2 `head()` (Class C verify) | Class B (metadata) | yes | optional; one per suspected orphan |
| R2 `delete()` (repair only) | Class B | yes | only in repair, owner-gated |

## R2 `list()` cost model

- Pagination: `list()` returns ≤1000 keys/call.
- **Key-count estimate:** unknown until the first preview dry-run. The first preview run (Ring 1 in `13`) fills `current_count` and derives `projected_10x`/`projected_100x` from it. **The first billed production scan is GATED on these inputs being filled** — the owner approves the prod cap only after the preview run produces a real count.
- Calls per full reconciliation = `ceil(key_count / 1000)` × 3 logical-bucket prefixes (or × workspaces if sharded).
- Class B cost = calls × per-op price (**verify current Cloudflare R2 Class B price before relying — retrieval-first per Cloudflare skill; do not cite a stale number**).
- Sharding: at >100k keys, `R2.list({prefix: '{logicalBucket}/{workspaceId}/'})` per workspace (1st + 2nd path segments, per `03` §3).

## Inputs the owner must provide / approve

| Input | Why | Default proposal | Status |
|---|---|---|---|
| Per-run R2 cost cap (USD) | abort threshold | $0.05 preview; owner-sets prod after preview count | preview default set; prod TBD on first run |
| Prod reconciliation frequency | weekly proposed | weekly off-peak | proposed |
| Shard prefix | bound list() at scale | `{logicalBucket}/{workspaceId}/` (>100k keys) | defined |
| `current_count` (real key count) | basis for cost estimate | from first preview dry-run | **BLOCKS first prod scan until filled** |

## Cost guardrails (this pack)

- Detection (D1-only, Class A) has **no new metered cost** (within free tier).
- R2 reconciliation is **always** under the cap; over-cap → abort + partial report.
- Repair deletes are bounded by orphan count (small).

## Not claimed

- No savings claim. No "this reduces cost" assertion. The audit adds a small recurring Class B cost; the value is integrity proof, not cost reduction.
- Free-tier posture preserved (AGENTS.md). No paid add-on required.

## Action required before first billed prod scan

Owner approves the per-run cap and the frequency. Until then, only local + preview dry-runs (free/low-cost).
