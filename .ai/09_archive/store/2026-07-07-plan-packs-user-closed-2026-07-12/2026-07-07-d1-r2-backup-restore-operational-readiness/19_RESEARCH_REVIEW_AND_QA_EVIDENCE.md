# 19 — Research, Review, and QA Evidence

## Research questions and sources

| # | Question | Answer (summary) | Source (official) | Date visible | Changed a plan decision? |
|---|---|---|---|---|---|
| RQ-1 | What automatic D1 backups exist? | Time Travel: any minute within 7 days (Free) / 30 (Paid); per-minute; restore by timestamp/bookmark | [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/) | none visible | Yes — established the 7-day free RPO bound (REQ-PERF-01) and OPEN-02 |
| RQ-2 | Does `wrangler d1 export` support incremental? | No. Full `.sql` dump; `--no-data`/`--no-schema` flags | [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [D1 wrangler](https://developers.cloudflare.com/d1/wrangler-commands/) | none | Yes — rejected incremental approach; manual full export is the free-tier path |
| RQ-3 | Is `time-travel restore` destructive? | Yes, in-place; capture a bookmark first to reverse | [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) | none | Yes — DEC-03: drill uses export→reimport; Time Travel is runbook-only |
| RQ-4 | Can Time Travel restore into a different DB? | No `--target` flag; use export→reimport into a named DB | [D1 wrangler](https://developers.cloudflare.com/d1/wrangler-commands/) | none | Yes — DEC-02/03 target isolation procedure |
| RQ-5 | Does R2 have native versioning? | No (docs 404; community confirms) | [R2 release notes](https://developers.cloudflare.com/r2/platform/release-notes/), 404 on /object-versioning/ | none | Yes — central R2 RPO consequence (REQ-R2-01, REQ-R2-04) |
| RQ-6 | Does `wrangler r2 object list` exist? | No; only get/put/delete; use REST/S3/Worker to list | [R2 wrangler](https://developers.cloudflare.com/r2/reference/wrangler-commands/), [issue #13008](https://github.com/cloudflare/workers-sdk/issues/13008) | none | Yes — DEC-04 inventory via REST/S3 |
| RQ-7 | R2 free-tier limits? | 10 GB-month, 1M Class A/month, 10M Class B/month, $0 egress | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) | none | Yes — cost model `20_…` |
| RQ-8 | R2 durability / RPO? | 11 nines (design target, not SLA); infra-failure RPO≈0; user-error undefined | [R2 durability](https://developers.cloudflare.com/r2/reference/durability/) | none | Yes — RTO/RPO table `09_…` |
| RQ-9 | Does Cloudflare publish RTO/RPO? | No contractual numbers | (absence across D1/R2 docs) | none | Yes — targets are derived, not claimed |
| RQ-10 | Free-tier cron limit? | 3 per Worker; account unlimited (blog); docs inconsistency noted | [Cron blog](https://blog.cloudflare.com/introducing-cron-triggers-for-cloudflare-workers/), [issue #29326](https://github.com/cloudflare/cloudflare-docs/issues/29326) | none | Yes — OPEN-02: all 3 slots used |
| RQ-11 | `database_id` vs `preview_database_id`? | Binding dispatch fields; preview = dev/Pages preview | [D1 local dev](https://developers.cloudflare.com/d1/best-practices/local-development/) | none | Yes — ASSUMP-03 isolated target |
| RQ-12 | wrangler R2 object commands default target? | Local simulator by default; must append `--remote` | [issue #13034](https://github.com/cloudflare/workers-sdk/issues/13034) | none | Yes — drill commands include `--remote` |

### Research rubric (validator-gated)

- **Primary sources first**: all RQ answers cite official Cloudflare docs or
  Cloudflare's own GitHub issues release notes.
- **Current official vs community**: distinguished in the table (community
  sources marked; load-bearing facts have an official citation).
- **What was searched for but not found**: contractual RTO/RPO (RQ-9); native
  R2 versioning (confirmed absent, RQ-5); `wrangler r2 object list` (confirmed
  absent, RQ-6); `--incremental` export (confirmed absent, RQ-2).
- **Version assumptions**: facts are 2026-current; the stale-plan revalidation
  checklist (README) requires re-checking before execution because Cloudflare
  docs change.

## Skills and workflows used / unavailable

- **Used**: `archestimator-plan-pack` (plan-pack decision), the two suite
  prompts (Creating-Plan + Multi-Agent Execution), `AGENTS.md`, the
  Cloudflare research lane (native subagent, read-only).
- **Referenced, not loaded**: `cloudflare` skill family (retrieval-first; facts
  came from the research lane against live docs, not skill memory).
- **Unavailable / not needed**: browser/Playwright (no UI), `validate`/`build`
  (no code change), Storybook (no components).
- No skill was fabricated; no capability was claimed without use.

## Specialist workstream outputs (emulated unless noted)

| Workstream | Output doc | Notable finding |
|---|---|---|
| Codebase audit (emulated) | `03_…` | only one restore script; no R2 inventory/restore tooling |
| Cloudflare research (**native**) | this section | 7-day free Time Travel; no R2 versioning; no `r2 object list` |
| Data/database (emulated) | `07_…` | target isolation via export→reimport; DSAR resurrection risk |
| Security (emulated) | `08_…` | target-id assertion is the critical control |
| Performance (emulated) | `09_…` | RTO measurable; RPO bounded by free Time Travel |
| Test/QA (emulated) | `12_…` | failure matrix FD-01…12 |
| Operations (emulated) | `13_…` | runbook + cadence |
| Adversarial review (emulated) | `17_…` findings | no P0 open; P1s controlled or owner-gated |
| Final verifier (emulated) | `17_…` | `CONDITIONALLY READY`, cap 97 |

## Critique-and-revision cycle summary

- **Cycle 1 (initial draft)**: wrote `00–21`; self-review found (a) the
  brief's ".mjs"/"daily backups" imprecision needed explicit reconciliation
  (added to `02_…`), (b) R2 RPO for user-error was initially vague (sharpened
  in `09_…` to "undefined"), (c) the DSAR resurrection risk was missing (added
  REQ-SEC-03 + runbook step).
- **Cycle 2 (consistency)**: cross-doc check confirmed task IDs, REQ IDs, FD
  IDs, and citations all align; confirmed no score exceeds the emulated cap.
- **Cycle 3 (adversarial)**: challenged "is hosted readiness proven?" →
  correctly capped at `CONDITIONALLY READY` with OPEN-01 gate.
- **Cycle 4 (Improve-Plan-Prompt pass — independent adversarial lane)**: a
  read-only adversarial subagent found **three P0 correctness defects** the
  emulated data/database lane had missed:
  - **P0-1**: the R2 reconciliation was built on `upload_assets.object_key`, a
    column that exists only in the rehearsal script's *sanitized fixture*, not
    in any of the 38 real migrations. The real key is the composite
    `(storage_bucket, storage_path)` (nullable). Verified against
    `migrations/0010_upload_metadata.sql:95-96`.
  - **P0-2**: a second logical bucket/table pair (`component-attachments` /
    `cost_library_item_variant_attachments`, migration `0022`) was entirely
    missing from the inventory, reconciliation, cost model, and parity matrix.
  - **P0-3**: `cf:check-wrangler-auth` was claimed to "verify scoped access"
    but the script (`scripts/check-cloudflare-wrangler-auth.ts`) runs only
    `wrangler whoami --json` and checks no D1/R2 token scopes.
  The lane correctly downgraded the first draft to `NOT READY` under the
  strict bar. All three P0s + twelve P1s were resolved in this revision (see
  `17_…` findings table). The data/database dimension was re-scored because
  its prior score rested on the broken predicate.
- Bounded cap reached with residual findings recorded (the three OPEN-* owner
  decisions are genuinely external).

## UltraQA-style adversarial scenario matrix

See `12_TEST_AND_VALIDATION_STRATEGY.md` failure drill matrix (FD-01…12). All
cells answered or N/A-with-reason. Highlights: FD-01 (prod-id abort),
FD-04 (DSAR resurrection), FD-05 (R2 dangling), FD-09 (traversal key),
FD-12 (concurrent import → N/A, runbook says one-at-a-time).

## Performance evaluator contract

See `09_…`. Baseline = local rehearsal duration; target = provider-backed
export+reimport < 30 min; evaluator = drill `durationMs`; regression = > 2×
baseline or > 30 min. Measurement deferred to OPEN-01.

## Local-vs-provider evidence boundary (REQ-OPS-04)

| Claim | Provable locally? | Provable locally-with-simulation? | Provider-backed only? |
|---|---|---|---|
| SQLite dump/import mechanism round-trips | **yes** (local rehearsal) | — | — |
| Target-isolation assertion aborts on prod id | **yes** (unit test) | — | — |
| R2 inventory pagination/redaction logic | — | **yes** (mocked) | real bucket contents need provider |
| R2 get→put sha256/etag round-trip | — | **yes** (mocked) | real object integrity needs provider |
| Hosted D1 export/import round-trip | **no** | no | **yes (OPEN-01)** |
| RTO at production volume | **no** | local duration is a lower bound only | **yes (OPEN-01)** |
| R2 durability / infra RPO | **no** | no | Cloudflare-side property (cited, not proven by us) |

**Rule**: no row is claimed provider-backed from a local check. This table is
the honesty contract for the readiness caps in `17_…`.

## Explicit validation gaps

1. **Hosted D1 restore** (provider-backed) — deferred to OPEN-01. Substitute:
   local rehearsal + documented commands.
2. **Provider-backed R2 inventory/restore** — deferred to implementation
   execution. Substitute: mocked unit tests.
3. **RTO measurement** — deferred. Substitute: local duration lower bound.
4. **Independent review** — emulated (single lead + one research lane).
   Substitute: a future independent reviewer or Philip's acceptance.

Each gap has a named unblock action; none is hidden.

## Independent final verifier evidence

`verification_mode: emulated`. No true independent verifier was available in
this run. The final-verification pass was a separated pass by the same lead
(`17_…`), applying the emulated cap (max 97, status `CONDITIONALLY READY`).
Upgrading to `independent` requires a separate reviewer or owner acceptance.
