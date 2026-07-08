# 00 — Agent Coordination

Plan folder: `/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-07-07-operational-data-readiness-source-of-truth/`
Plan date: 2026-07-07 (Asia/Manila)
Plan status: see `README.md` and `17_FINAL_READINESS_REVIEW.md`.
Verification mode: `emulated` (separated passes by the lead agent; no native independent verifier lane was available). Readiness cap: ≤97, package status capped at `CONDITIONALLY READY` for this high-blast-radius package until a human or external reviewer approves it.

## Master /goal

Eliminate operational source-of-truth drift across Archestimator's operational docs and config so future agents and plan packs can discover current operational reality (migrations, crons, bindings, provider-exit posture, cost posture, retention) from a single canonical location, and so stale facts are mechanically detectable before they propagate.

- User/business outcome: a future agent (human or AI) reads one canonical home and a generated snapshot, and is never misled by a stale `AGENTS.md` cron count, a stale `README.md` migration count, or a contradictory provider-exit status. Drift becomes a failing check, not a manual catch.
- Problem being solved: operational facts currently live in ≥6 overlapping artifacts (`AGENTS.md`, `README.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `wrangler.jsonc`, `migrations/`, provider-exit runbook, evidence JSON). The 2026-07-07 PROMPT captured real drift: `wrangler.jsonc` declares three cron triggers while narrative docs say two; migration-count claims diverge between `README.md` (29/`0029`) and `AGENTS.md` (38/`0038`); provider-exit is "complete" in `AGENTS.md` but "OPEN/NOT READY" in the runbook. There is no script that cross-checks these.
- Planning scope (this pack): define canonical facts, a generated snapshot, an update protocol, a stale-doc detector script, evidence locations, agent handoff rules, and a small recurring audit. **Planning only — no application/source/script/migration changes are produced by this task.**
- Non-goals: rewriting unrelated docs, refactoring the codebase, fixing the drift in this task (execution is future work), changing `wrangler.jsonc`, applying migrations, or touching provider/production state.
- Required codebase analysis: `wrangler.jsonc`, `migrations/`, `supabase/migrations/`, `AGENTS.md`, `README.md`, `current-state.md`, `decisions.md`, `cloudflare-env.d.ts`, `worker.ts`, `package.json` scripts, `scripts/*readiness*`, `scripts/generate-cloudflare-*`, existing sibling packs (especially `2026-07-07-d1-migration-state-and-schema-integrity`).
- Implementation-readiness criteria: every requirement traced; every recommended script names an exact path, command, source-of-truth input, and assertion; update protocol names an owner per fact-class; stale-doc detector has a falsifiable pass/fail; rollback/fix-forward defined; no vague tasks.
- Validation criteria: this planning package passes internal cross-document consistency, traceability, adversarial, and final-verification audits (emulated).
- Final planning deliverables: the exhaustive document set (00–19) in this folder, plus `README.md` entrypoint.

## Required specialist workstreams (covered)

This pack's analysis lanes. Native subagents were used for three parallel discovery lanes (migration drift, cron/binding drift, provider-truth inventory). Remaining lanes are emulated separated passes by the lead.

| Lane | Role | Mode | Status |
|---|---|---|---|
| Lead coordinator | Scope, synthesis, integration, final claim | lead | done |
| Migration-drift analyst | Reconcile migrations/ count + latest across docs | native subagent | done |
| Cron/binding analyst | Reconcile wrangler.jsonc crons/bindings vs narrative docs | native subagent | done |
| Operational/provider-truth inventory analyst | Map overlapping operational-truth artifacts | native subagent | done |
| Source/requirements analyst | Extract requirements from PROMPT + repo reality | emulated | done |
| Architecture analyst | Decide canonical home + generated snapshot design | emulated | done |
| Security/privacy reviewer | Threat model for the snapshot + handoff (no secrets in snapshot) | emulated | done |
| Performance reviewer | Cost of the recurring audit + snapshot regen | emulated | done |
| Test/QA strategist | Falsifiable pass/fail for the detector + adversarial scenarios | emulated | done |
| Operations/rollout planner | Cadence, owner, CI hook, rollback/fix-forward | emulated | done |
| Adversarial reviewer | Attempt to disprove readiness | emulated | done |
| Final verifier | Requirement-by-requirement audit | emulated | done |

## Coordination ledger

| Agent/lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Migration-drift | Reconcile D1 + Supabase migration counts across docs | `migrations/`, `supabase/migrations/`, `AGENTS.md`, `README.md`, `current-state.md`, sibling PROMPTs | 38 D1 files, latest `0038`; AGENTS.md correct; README.md stale (29/0029); supabase/README.md L15 stale (14 vs 10) | none | Drift is in README.md, not AGENTS.md, for migrations | PROMPT.md premise ("AGENTS.md references 29/0029") is itself stale | done |
| Cron/binding | Reconcile wrangler.jsonc crons/bindings vs narrative docs | `wrangler.jsonc`, `worker.ts`, `AGENTS.md`, `current-state.md`, `cloudflare-env.d.ts`, `package.json` | 3 crons in wrangler+worker; 2 in AGENTS.md + current-state.md; bindings all match | none | Cron drift confirmed and load-bearing; binding drift none | none | done |
| Provider-truth inventory | Map overlapping operational/provider readiness artifacts | `.ai/10_state/*`, `.ai/03_plans/*`, `.ai/00_system/*`, skills, scripts | 6+ overlapping artifacts; provider-exit OPEN/NOT READY vs AGENTS.md "complete"; no drift-check script exists | none | Canonical substrate = wrangler.jsonc + migrations/; sibling d1-migration pack overlaps on Phase-4 stale-doc guard | Boundary overlap with `2026-07-07-d1-migration-state-and-schema-integrity` Phase 4 | done |
| Lead | Synthesize, write exhaustive pack, audit | all of the above | cross-referenced below | all lanes | canonical-home decision, snapshot design, boundary agreement | resolved with sibling pack (see 15_DECISIONS) | done |

## Skills and repository instructions used

- `archestimator-plan-pack` — binds the dated `.ai/03_plans/<date>-<slug>/` convention and loop shape; confirms an exhaustive pack is warranted for release-readiness/operational-truth/agent-framework work.
- `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` — the exhaustive plan-pack authoring directive (sections 0–18).
- `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` — authority model, verification modes, completion-audit rubric.
- `AGENTS.md` — project instructions, standing Cloudflare authorization, shared-worktree policy, proportional verification policy, GitHub security loop.
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — loop activation criteria (read for the verification/loop contract). (Cited, not linear-read.)

No skill was fabricated. No skill was used merely as proof of work. No required skill was unavailable.

## Boundary agreement (resolves coordination conflict)

Two 2026-07-07 sibling packs both touch doc-drift detection:
- `2026-07-07-d1-migration-state-and-schema-integrity` — D1 schema/migration integrity; its Phase 4 plans a CI/release stale-doc guard scoped to **D1 migration counts**.
- This pack (`operational-data-readiness-source-of-truth`) — the **umbrella** for all operational facts (migrations, crons, bindings, provider-exit, cost, retention).

Resolution (recorded in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` DEC-CANONICAL-SCRIPT): the **umbrella stale-doc detector lives here** (`scripts/check-operational-truth-drift.mjs`, recommended) and **absorbs** the D1 migration-count assertion as one fact-class. The sibling pack's Phase-4 guard is reframed as the D1-migration-count *contributor* to this detector, not a duplicate script. This pack does not modify the sibling pack's files (planning-only); implementation must update both packs' references when the detector lands.

## Concurrent-repository safety

All writes are confined to this new planning folder. No application source, tests, migrations, scripts, `wrangler.jsonc`, or provider state were modified. `git status` was not used to stage/commit. Shared-worktree branch policy respected: no branches created, switched, or pushed.
