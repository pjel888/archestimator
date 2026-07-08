# 20 — Cost Model and Pricing Inputs

> Free-tier/bundled posture only (`AGENTS.md`). All figures are **planning
> inputs** from official Cloudflare docs (2026-07, via the research lane in
> `19_…`), not contractual. Re-validate with `bun run cf:pricing` before any
> provider drill.

## Free-tier limits (the budget ceiling)

| Resource | Free allowance | Source |
|---|---|---|
| D1 storage / DB | 500 MB | [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/) |
| D1 storage / account | 5 GB | same |
| D1 rows read / day | 5,000,000 | same |
| D1 rows written / day | 100,000 | same |
| D1 Time Travel retention | 7 days | same |
| R2 storage | 10 GB-month / month | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| R2 Class A ops (writes/lists) / month | 1,000,000 | same |
| R2 Class B ops (reads) / month | 10,000,000 | same |
| R2 egress | $0 always (free) | same |
| Cron triggers / Worker | 3 (all used) | [Cron blog](https://blog.cloudflare.com/introducing-cron-triggers-for-cloudflare-workers/) |
| Workers requests / day | 100,000 (resets 00:00 UTC) | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) |

## Drill consumption model (estimates at pre-launch volume)

Assumption: pre-launch data volume is small (≪ 100k rows; ≪ 1 GB R2 across
**both** logical buckets `project-images`/`component-images` +
`component-attachments`). The numbers below are upper-bound estimates for a
single drill run; re-measure at OPEN-01 with real counts.

| Drill | D1 rows read | D1 rows written | R2 Class A (lists/puts) | R2 Class B (gets) | Est. cost |
|---|---|---|---|---|---|
| Local SQLite rehearsal (`cf:d1-restore-rehearsal`) | 0 (local sqlite) | 0 | 0 | 0 | $0 |
| Target-isolation pre-flight | 0 | 0 | 0 | 0 | $0 |
| Provider-backed D1 drill (OPEN-01): export staging + reimport into 2nd isolated DB | ≈ full row count (≪ 5M) | ≈ full row count (≪ 100k) | 0 | 0 | $0 (within free) |
| R2 inventory (full list, paginated, **both** buckets) | 0 | 0 | ⌈object_count / 1000⌉ (≪ 1M) | 0 | $0 |
| R2 restore rehearsal (1 object get→put into preview `_drill/`) | 0 | 0 | 1 put | 1 get | $0 |

### Monthly envelope (the supporting math P1-8 requires)

Cadence assumption for the envelope: 4 provider D1 drills/month, 1 R2
inventory/month, 1 R2 restore/month (the `13_…` quarterly cadence is a floor;
this is a generous ceiling).

| Resource | Free ceiling | Worst-case monthly drill use | Headroom % |
|---|---|---|---|
| D1 rows read/day | 5,000,000 | 4 × (full export). At ≪100k rows: ~400k/month → ~13k/day avg; **but a single export is a burst** — confirm <5M per export day. | >99% (until rows approach 1M+) |
| D1 rows written/day | 100,000 | 4 × full row count ≪ 100k | >99% (until rows approach 25k+) |
| R2 Class A ops/month (lists+puts) | 1,000,000 | 1 inventory (⌈count/1000⌉ lists) + 1 put + cleanup delete ≈ tens | >99% (until object_count approaches 100k+) |
| R2 Class B ops/month (gets) | 10,000,000 | 1 get per restore | >99.99% |
| R2 storage | 10 GB-month | 1 `_drill/` object (cleaned up) | ~100% |

**Conclusion**: at pre-launch volume, monthly drill consumption is <1% of every
free-tier ceiling. The watch-item remains D1 rows-read/day **as data grows past
~1M rows** (a single full export then approaches the 5M ceiling shared with app
traffic) — that is OPEN-02's trigger. Adding the `component-attachments`
logical bucket (P0-2 correction) does not change the conclusion because both
buckets share the single physical bucket's list footprint (one paginated list
covers both prefixes).

### Sampled-vs-full-scan escalation (P1-10)
- Default: full list per logical bucket (paginated). Headroom ample at launch.
- Switch to **sampled** when: object count > 100k **or** a full list would
  exceed 50% of the monthly Class-A budget. Record sampling rate + coverage.
- **Full-scan required** when: a DSAR/privacy incident demands complete
  coverage, or the orphan rate exceeds 5%.

## Scaling risk (when free-tier becomes tight)

| Trigger | Risk | Action |
|---|---|---|
| D1 rows > ~4M | a full daily export approaches the 5M rows-read/day cap (shared with app traffic) | OPEN-02: switch to sampled/prefix export, or paid plan, or reduce cadence |
| R2 objects > ~1M | a full monthly inventory approaches the Class A cap | switch to prefix-sampled inventory (documented option in `09_…`) |
| D1 storage > 500 MB / DB | hits per-DB cap | n/a today; would need paid plan |
| R2 storage > 10 GB-month | hits free cap | OPEN-03 / paid |

None of these is near at pre-launch volume.

## Decision-ready cost inputs (for OPEN-02 / OPEN-03)

If the owner later considers a paid plan or a second bucket, the inputs needed
are (from `cf:pricing` + real usage):
- Actual D1 rows read/written per day (from Workers Observability / D1 metrics).
- Actual R2 object count + storage GB + Class A/B ops/month.
- Current free-tier headroom.
- Cost of the paid alternative (D1 paid $5/mo + usage; R2 overage
  $0.015/GB-month, $4.50/M Class A, $0.36/M Class B).

Until those are gathered, the free-tier posture holds (DEC-01).

## What this model does NOT claim

- No claim of cost savings vs a paid plan (no baseline spend to compare).
- No claim that the drills are free *at scale* — only at current pre-launch
  volume.
- No enablement of any paid add-on.
