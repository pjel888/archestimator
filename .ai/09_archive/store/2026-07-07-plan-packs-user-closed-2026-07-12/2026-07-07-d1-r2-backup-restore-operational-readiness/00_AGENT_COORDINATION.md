---
plan_id: 2026-07-07-d1-r2-backup-restore-operational-readiness
created: 2026-07-07
profile: exhaustive
classification: planning-only / high-blast-radius
owner: Archestimator (Philip)
---

# 00 — Agent Coordination

## Master goal

Create an **operational backup/restore plan pack** for Archestimator's D1 data
(`ARCH_DB`) and R2 objects (`ARCH_UPLOADS_R2`) that is practical for the current
**free-tier Cloudflare posture** and that lets a future executor run, simulate,
or rehearse a recovery drill and know exactly what evidence proves restore
readiness — without enabling any paid add-on and without touching any provider
resource outside the bindings in `wrangler.jsonc`.

### Intended outcome

- An operator (human or agent) can answer "can we recover Archestimator's data
  after a D1 corruption, a destructive `time-travel restore`, an accidental R2
  object deletion, or a region/Worker failure?" with concrete, runnable proof.
- The pack documents the **current restore tooling** (the existing local-only
  D1 SQLite rehearsal script) and the **gaps** that remain (no R2 inventory,
  no R2 object export/restore tooling, no automated D1 export, no RTO/RPO
  contract, no provider-backed restore rehearsal).

### Problem being solved

Archestimator is preparing for first users. D1 holds all auth/app/workflow data
and R2 holds uploaded project assets. The only backup/restore artifact today is
`scripts/generate-cloudflare-d1-restore-rehearsal.ts`, which is **local-only**:
it proves a SQLite dump/import round-trip on sanitized fixtures but does not
prove a hosted D1 restore, does not touch R2 at all, and has no RTO/RPO or
operator runbook beyond a short destructive-restore note list. The PROMPT
explicitly requires: D1 backup assumptions, restore rehearsal procedure, safe
target isolation, R2 inventory/export/restore strategy, RTO/RPO targets, failure
drills, evidence artifacts, and "what is impossible to prove locally."

### Planning scope (what this pack does)

- Audit current D1/R2 backup, restore, export, inventory, and rehearsal
  capability against official Cloudflare 2026 docs.
- Specify a free-tier-safe recovery drill design (D1 export/import round-trip
  into an isolated target; R2 inventory + selective export/restore).
- Define RTO/RPO targets derivable from the free-tier posture, and the proof
  that bounds them.
- Define evidence artifacts, runbooks, and the local-vs-provider proof boundary.
- Produce an implementation plan (phased, dependency-aware) that a future
  executor can follow to **build** the missing tooling (no code is written here).

### Non-goals

- Implementing any script, route, migration, config, or runtime change.
- Enabling any Cloudflare paid add-on (D1 paid plan, R2 paid tier, Smart
  Placement paid, dedicated egress, etc.).
- Mutating any provider resource (no `wrangler d1 execute --remote`, no
  `time-travel restore`, no R2 put/delete against the bound buckets).
- Touching the historical Supabase project `ebxxqidacheyapmmzavr`, the
  unrelated `archestimator` provider project, or any other Cloudflare account.
- Cross-region replication, multi-cloud DR, or paid backup products.
- A generic "best practices" doc. Every recommendation is tied to a concrete
  bound resource, command, or evidence artifact.

### Implementation-readiness criteria (for the *resulting* implementation work)

The future implementation (Phase 1–N) is ready when:

- A free-tier-safe restore **target isolation** procedure exists and is
  documented with exact `database_id`/preview-DB boundaries.
- A **D1 export/import round-trip drill** can run against an isolated remote D1
  target with row-count, checksum, FK, and authorization-denial proof.
- An **R2 object inventory** of `archestimator-proof-uploads` can be produced
  and reconciled against the composite `(storage_bucket, storage_path)` of
  both `upload_assets` and `cost_library_item_variant_attachments`.
- A **selective R2 export/restore** path exists for a sampled object key.
- **RTO/RPO targets** are stated with their free-tier derivable bounds and the
  command that proves each.
- A **failure drill matrix** covers corruption, accidental delete, partial
  restore, oversized export, and provider outage.
- A **local-vs-provider evidence table** states exactly what cannot be proven
  locally (so completion is never falsely claimed).

### Validation criteria (for the planning pack itself)

- Every requirement has a stable ID, acceptance criteria, and a validation
  method that is local static, local automated, or explicitly provider-backed.
- Every flow has a shadow-path matrix cell or an explicit N/A with reason.
- The pack stays strictly inside the bound Cloudflare resources.
- Cost posture is explicitly free-tier/bundled only.

### Final planning deliverables

The exhaustive document set `00_AGENT_COORDINATION.md` … `21_PROVIDER_PARITY_MATRIX.md`
as enumerated in the suite prompt, scoped to backup/restore operational
readiness. No code, no migrations, no provider mutations.

---

## Skills discovered and used

| Skill / instruction | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` (repo-local override) | yes | Decides plan-pack vs in-session loop (this is high-blast-radius: D1/R2/data integrity → pack required) and binds the dated-folder + ledger convention. |
| `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` | yes | Authoritative exhaustive planning contract; document set; readiness scoring. |
| `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` | yes | Planning-only classification, evidence-class rules, free-tier/Cloudflare overlay, completion-audit boundary. |
| `AGENTS.md` | yes | Stack baseline, Cloudflare standing authorization + free-tier cost posture, Git/shared-worktree policy. |
| `cloudflare` skill family (installed) | referenced | Retrieval-first; facts refreshed from official docs via the research lane rather than memory. |
| `verify-cloudflare-provider-proof` / `cf:d1-restore-rehearsal` | read-only audited | Existing tooling under audit, not executed. |

No skills were fabricated. No unavailable required skill was hidden.

---

## Specialist workstreams (emulated as separated passes)

This is a **planning-only** task executed by a single lead agent. Native
subagents were used for **one** read-only lane (the official-docs research
lane, `agent_b6956022-…`, output in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`).
The remaining specialist domains are emulated as clearly separated analysis
passes by the lead. `verification_mode: emulated` applies, capping overall
readiness at 97 and package status at `CONDITIONALLY READY` for the
high-blast-radius parts that require a real provider-backed drill or owner
approval, per the Multi-Agent Execution Directive.

| Lane | Mode | Scope | Key evidence |
|---|---|---|---|
| Lead coordinator / synthesizer | lead | Scope, sequencing, integration, final claim | This file + `17_FINAL_READINESS_REVIEW.md` |
| Source & codebase audit | emulated | `wrangler.jsonc`, `scripts/generate-cloudflare-d1-restore-rehearsal.ts`, R2 providers, migrations 0010/0004/0035, package.json `cf:*` scripts | `03_SOURCE_AND_CODEBASE_AUDIT.md` |
| Cloudflare research (official docs) | **native subagent (read-only)** | D1 Time Travel/export, R2 list/restore, free-tier limits, RTO/RPO | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` |
| Data/database planner | emulated | D1 schema/restore target isolation, `upload_assets`/`cost_library_item_variant_attachments` `(storage_bucket, storage_path)`/checksum, migration order | `07_DATA_DATABASE_API_NETWORK_PLAN.md` |
| Security/privacy reviewer | emulated | Restore target isolation, secret-free rehearsal, DSAR/retention interaction, redaction | `08_SECURITY_PRIVACY_THREAT_MODEL.md` |
| Performance/reliability reviewer | emulated | Export size, RPO/RTO, drill duration, free-tier quotas | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` |
| Test/QA strategist | emulated | SQLite rehearsal, isolated remote round-trip, R2 inventory/restore, failure drill matrix | `12_TEST_AND_VALIDATION_STRATEGY.md` |
| Operations/rollout planner | emulated | Operator runbook, drill cadence, rollback of the drill itself | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` |
| Adversarial reviewer | emulated | Disprove readiness, find missing flows, challenge RTO/RPO | `17_FINAL_READINESS_REVIEW.md` + `19_…` |
| Final verifier | emulated | Requirement-by-requirement audit, readiness caps | `17_FINAL_READINESS_REVIEW.md` |

No two lanes edit the same document concurrently. Each document has a single
author (the lead), and the research lane was read-only. The final verification
is honestly labeled `emulated`, not `independent`.

---

## Coordination ledger

| Lane | Goal | Owned scope | Dependencies | Current work | Findings | Decisions / rejected alternatives | Conflicts | Validation evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| Lead | Author full exhaustive pack | All `00–21` docs | Research + codebase audit | Drafting docs | See per-doc findings | DEC-01…07 in `15_…` | None | See `19_…` | complete (draft) |
| Research | Official Cloudflare backup/restore facts + free-tier limits | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` only | None | Cited evidence sheet | Time Travel 7d free / 30d paid; no R2 versioning; no `wrangler r2 object list` | Use export→re-import for non-destructive D1 rehearsal; R2 inventory via REST/S3 API not wrangler | None | Official URLs + dates in `19_…` | complete |
| Codebase audit | Map current restore/R2 tooling | `03_SOURCE_AND_CODEBASE_AUDIT.md` only | None | Read scripts + migrations | Only `generate-cloudflare-d1-restore-rehearsal.ts` exists; no R2 inventory/restore tooling; no automated D1 export | Classify gaps as Phase-1 implementation, not blockers to planning | None | file:line refs in `03_…` | complete |
| Adversarial review | Disprove readiness | Inputs to `17_…` | Lead draft | Review pass | R2 RPO undefined for user error; provider-backed proof missing | Mark provider-backed drill as the readiness cap | None | findings in `17_…` | complete |
| Final verifier | Requirement-by-requirement audit | `17_FINAL_READINESS_REVIEW.md` | All docs | Audit | Readiness caps at `CONDITIONALLY READY` due to emulated verification + missing provider-backed drill | Recommend owner-approved provider drill before production cutover | None | audit table in `17_…` | complete |

---

## File/module ownership model

- All writes are confined to
  `.ai/03_plans/2026-07-07-d1-r2-backup-restore-operational-readiness/`.
- The pre-existing `PROMPT.md` is **read-only** (it is the task brief).
- No application source, tests, migrations, `wrangler.jsonc`, `package.json`,
  scripts, or provider state are modified by this planning task.
- Concurrent-agent safety: re-read `git status --short --branch` and any in-pack
  file before re-editing; preserve unfamiliar content; never stage/commit.

## Authority and conflict resolution

Per the suite's cross-suite source authority: **user intent** (PROMPT.md) sets
the product goal; **repo reality** (`wrangler.jsonc`, scripts, migrations,
`AGENTS.md`) controls implementation reality; **official Cloudflare docs**
(2026, via the research lane) control version-sensitive provider behavior;
older plans/memory are lower authority. No conflict arose that required
escalation — the codebase audit and official docs agree that the current
restore rehearsal is local-only and R2 restore tooling is absent.
