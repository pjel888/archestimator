# 15 — Decisions, Assumptions, and Alternatives

## Decisions (load-bearing, with rationale + rejected alternatives)

### DEC-01 — Free-tier-only posture; no paid backup product
- **Problem**: Need restore readiness without breaching the cost posture.
- **Constraints**: `AGENTS.md` free-tier/bundled only; no paid add-ons without owner approval.
- **Options**: (A) paid D1 plan (30-day Time Travel) + third-party R2 backup; (B) free-tier Time Travel + manual export + sampled-object drill.
- **Advantages of A**: longer retention, less manual.
- **Disadvantages of A**: violates cost posture; paid dependency.
- **Recommended**: **B** (free-tier). Rationale: pre-launch volume is small; the catastrophic risk (prod destructive restore) is controlled by target isolation, not by a paid product; paid can be added later (OPEN-02) if scale demands.
- **Conditions that would change it**: data grows past the 7-day Time Travel window's comfort or past 5M rows-read/day export budget → reopen OPEN-02.

### DEC-02 — Restore target isolation by hard script assertion, not advice
- **Problem**: a destructive `execute --remote --file` or `time-travel restore` against prod is the catastrophic failure.
- **Options**: (A) runbook advice only; (B) script-level assertion that dest≠prod.
- **Recommended**: **B**. Rationale: advice fails under operator fatigue; a hard abort is the only reliable control. The assertion parses `wrangler.jsonc` so it cannot be fooled by an env override.
- **Rejected**: A (too weak).

### DEC-03 — Drill default = export→reimport into isolated target; Time Travel = runbook-only
- **Problem**: Time Travel is one command but destructive and in-place (no isolation).
- **Options**: (A) drill Time Travel; (B) drill export→reimport into isolated DB.
- **Recommended**: **B**. Rationale: the drill must be repeatable and non-destructive; Time Travel is reserved for real production recovery, runbook-gated, never drilled.
- **Rejected**: A (destructive, no isolation).

### DEC-04 — R2 inventory via REST/S3 API, not a Worker (CLI-first)
- **Problem**: `wrangler r2 object list` doesn't exist; need a listing path.
- **Options**: (A) CLI + REST `/objects/list` or S3 `ListObjectsV2`; (B) Worker with `bucket.list()`.
- **Recommended**: **A** first. Rationale: no new runtime surface (deploy/authz); CLI is simpler for a drill. Worker only if inventory must run on a schedule (OPEN-02).
- **Rejected for now**: B (adds runtime surface); kept as future option.

### DEC-05 — R2 "backup" = durability + sampled drill; no second bucket (OPEN-03)
- **Problem**: no native R2 versioning; bulk-copy doubles Class A ops.
- **Options**: (A) rely on 11-nines durability + sampled get→put drill; (B) second bucket bulk-copy.
- **Recommended**: **A**. Rationale: free-tier; durability covers infra failure; user-error risk is documented and escalated via OPEN-03 if unacceptable.
- **Conditions that would change it**: owner decides user-error RPO must be defined → OPEN-03 (second bucket or app-level soft-delete).

### DEC-06 — Keep the existing rehearsal report shape for new tools
- **Problem**: consistency of evidence artifacts.
- **Recommended**: new R2 tools emit `{ generatedAt, mode, sources, commands, …Ready gates, blockers, note }` mirroring `generate-cloudflare-d1-restore-rehearsal.ts`. Rationale: operators already know this shape; it's honest (carries a self-describing `note`).

### DEC-07 — Planning-only; no code written in this pack
- **Problem**: PROMPT says "Mode: planning only."
- **Recommended**: produce the plan pack; defer all implementation to Phase 1–5 executors. Rationale: directive compliance + shared-worktree safety.

## Assumptions (with strength + validation)

| ID | Assumption | Strength | Validation (see `02_…`) |
|---|---|---|---|
| ASSUMP-01 | Workers Free posture (7-day Time Travel; 5M rows-read/day; R2 10GB/1M A/10M B) | repo evidence | re-read `AGENTS.md` + D1/R2 limits docs |
| ASSUMP-02 | Pre-launch data volume fits comfortably in free-tier quotas for a full export + single-object drill | derived | confirm before provider drill |
| ASSUMP-03 | Preview `database_id` `363c756a-…` is a usable isolated restore target | official docs | validate with `wrangler d1 list` + tiny `execute --remote` |
| ASSUMP-04 | R2 has no native versioning; `wrangler r2 object list` absent | official docs (404 + open issue) | re-check release notes |
| ASSUMP-05 | No migration post-`0038` changes R2-relevant columns | repo evidence | `ls migrations/ \| tail` |

## Open decisions (owner-gated)

| ID | Decision | Owner | Why external | Safe interim |
|---|---|---|---|---|
| OPEN-01 | Approve a one-time provider-backed D1 restore rehearsal against an isolated staging DB | Philip | touches real provider state | local rehearsal + dry `--remote` export only |
| OPEN-02 | Approve automated daily D1 export to R2 (consumes rows-read quota) vs Time Travel only | Philip | free-tier quota posture + needs a free cron slot | manual export on demand; 7-day free Time Travel RPO |
| OPEN-03 | Approve a second R2 bucket as a copy target, or accept user-error RPO undefined | Philip | doubles Class A ops | sampled-object drill; durability for infra failure |

## Alternatives considered and rejected (summary)

| Alternative | Why rejected |
|---|---|
| Paid D1 plan / third-party backup | violates free-tier posture (DEC-01) |
| Drill Time Travel | destructive, no isolation (DEC-03) |
| Worker-based inventory as default | adds runtime surface (DEC-04) |
| Bulk-copy R2 bucket as default | doubles Class A ops (DEC-05) |
| Runbook-advice-only target isolation | too weak (DEC-02) |
| Adding a `backup_run_log` D1 table now | out of scope (recorded in `07_…` for later) |
| Touching Supabase/other providers | out of bounds (`AGENTS.md`) |
