# 01 — Executive Summary

## What this plan pack is

A **planning-only** package that turns Archestimator launch readiness into a **single evidence gate** for first users. It defines the minimum go/no-go criteria, required proofs, owner-visible status shape, hard blockers vs advisory warnings, exact scripts/provider proofs, CI integration options, evidence file locations, rollback criteria, and a staged local→hosted proof ladder. An executor can build `bun run launch:gate` (proposed name) from this pack without re-discovering the production-readiness surface.

This pack **does not implement** the gate, the CI workflow, or any application/test/migration code.

## Why now

Archestimator is at the **pre-launch closed-beta MVP** stage (`current-state.md` fast path: "No external users yet"). The readiness surface is large and fragmented:

- ~50 readiness/proof scripts in `scripts/` (`cf:*`, `launch:*`, `perf:*`, `dbidx:*`, plus `validate` and `validate:agents`).
- An artifact-only aggregator, `cf:release-gates` (`scripts/check-cloudflare-release-gates.ts`), that reads 13 pre-generated JSON artifacts and **never spawns child processes** (verified at `readInputs`, line 759). It hard-blocks only on `localReleaseGateReportReady` (line 808).
- A downstream provider-exit pack, `generate-cloudflare-provider-exit-pack.ts`, advisory by default; hard-blocks only with `STRICT_READINESS_EXIT`/`FAIL_ON_BLOCKERS` (lines 1025–1033).
- Env-driven hard-blocking checkers (`launch:check-legal-owner`, `launch:check-support-monitoring`) that have no default output file.
- **No single command runs all launch gates end-to-end.** `validate` covers type/lint/design/unit/dom only.
- **CI is disabled** — workflows live in `.github/workflows-disabled/`. GitHub hosted security controls (CodeQL/Dependabot/secret-scan) return 403/404.
- A stale, out-of-band launch verdict (`NO-GO`, last refreshed 2026-06-02 → 2026-07-04) that predates much of the completed Cloudflare migration and cannot be trusted as current.

The owner needs **one command, one report, one rollback contract, one proof ladder**.

## The core design decision

Build a **thin aggregator script** (`scripts/run-launch-evidence-gate.ts`, proposed) that:

1. **Discovers** gate domains and their authoritative anchor scripts (not re-implementing them).
2. **Classifies** each domain's outcome as `pass` / `advisory` / `blocker` / `skipped` / `missing-evidence`, with a hard-blocker vs advisory taxonomy.
3. **Aggregates** into one canonical status: `GO` (all hard blockers pass) / `CONDITIONAL` (hard blockers pass, advisory or external gates remain) / `NO-GO` (any hard blocker fails or required evidence is missing).
4. **Emits** a canonical report (JSON + Markdown + stdout summary) with per-domain evidence, `file:line` citations, evidence-class labels, and evidence TTL (freshness).
5. **Separates evidence classes**: local-static / local-automated / browser-manual / provider-backed / hosted-production. Refuses to promote local checks to provider/hosted proof.
6. **Is safe**: read-only, no secrets, no provider mutation, no deploy, idempotent, CI-friendly (<2 min local budget).

The gate is a **fusion layer over existing scripts**, not a re-implementation. It must not bypass the authority of the anchor scripts; it must report their verdicts.

## Hard blockers vs advisory warnings (summary — full matrix in `06`)

**Release-blocking (hard) — fail → NO-GO:**
- `validate` (type/lint/design/unit/dom) — local-automated, the floor.
- `build` (Next.js production build) — local-automated.
- `cf:release-gates` `localReleaseGateReportReady` — local-static (artifact-aggregated).
- `launch:check-legal-owner` `legalOwnerReady` — operator-confirmed (local-static). **Owner-decision-gated.**
- `launch:check-support-monitoring` `supportMonitoringReady` — operator-confirmed. **Owner-decision-gated.**
- `cf:provider-exit-pack` `appRuntimeExitPrerequisitesReady` (with `STRICT_READINESS_EXIT`) — local-static + source scan.
- No active legacy-provider runtime references (the provider-exit source scan).

**Advisory (soft) — fail → CONDITIONAL, does not block first users on its own:**
- Performance p95 budget misses on cached public routes (currently known misses per `current-state.md:3052`).
- Provider-exit *external* gates (exports/retention record, Resend account status, secret rotation record, post-exit smoke, non-owner Google proof, recipient mailbox proof) — these are owner/operator actions, not code.
- `productionCutoverReady` from release-gates (reported but not exit-influencing).
- CodeQL/Dependabot/secret-scan hosted alerts (currently 403/404 — infrastructure-unavailable, not a code defect).

## Staged local→hosted proof ladder (summary — full in `13`)

| Stage | Evidence class | What it proves | Who runs it |
|---|---|---|---|
| 0 | Local-static | Artifacts exist, aggregator logic sound, no missing inputs | Executor + unit tests |
| 1 | Local-automated | `validate` + `build` + `cf:release-gates` local composite | `bun run launch:gate --local` |
| 2 | Provider-backed | D1/R2/DO/Queue/Email readback via `cf:check-*` (no mutation) | Operator with Cloudflare auth |
| 3 | Hosted-production | `cf:verify-hosted-*` route/perf/upload/collaboration proofs | Operator against `archestimator.com` |
| 4 | Owner/operator sign-off | Legal-owner + support-monitoring + provider-exit operator record + manual smoke | Owner (human) |

The gate must run Stages 0–1 by default; Stages 2–4 are owner-gated and explicitly labeled as remaining external proof.

## Plan status

**`CONDITIONALLY READY`** (planning package). Rationale:
- The design of the unified gate (script contract, aggregation rules, status taxonomy, evidence classes, rollback, CI integration) is **implementation-ready** for the local + script-contract slices.
- `verification_mode: emulated` (no native independent reviewer in this session for high-blast-radius planning) caps readiness at 97 and package status at `CONDITIONALLY READY` until a real reviewer or owner accepts it.
- Several gate *inputs* remain genuinely external (legal signoff, hosted manual smoke, provider-exit operator record) — these are isolated as `BLOCKED-EXTERNAL`, not invented away.

**Initial readiness scores** (1–100) are recorded in `17_FINAL_READINESS_REVIEW.md`. Highlights: Product strategy 96, Scope clarity 97, Requirements completeness 95, Architecture readiness 94, Rollout/rollback readiness 93, Overall implementation readiness 92 → final (post-revision) overall 93, capped by verification mode.

## Major findings

- **Architecture:** the unified gate is a thin, read-only aggregator; it must not re-implement domain logic. The anchor scripts already own their domains.
- **Data/provider:** the gate makes no D1/R2/DO/Queue/Email claims itself; it reports the verdicts of provider-backed scripts. Local checks are never promoted to provider proof.
- **Security:** the gate must not be bypassable (single source of truth for status), evidence artifacts must remain sanitized (no secrets in JSON), and stale/forged artifacts must be detected via freshness TTL + producer pinning.
- **Performance:** the gate's own execution budget is ≤2 min for the local slice; hosted proofs are owner-gated and out-of-band.
- **Blast radius:** the gate is additive — it introduces one script, one report, optional CI wiring, and a docs surface. It does not modify application behavior. Risk is low if implemented as read-only; risk rises only if CI is re-enabled as blocking without owner signoff.

## Major decisions (full set in `15`)

- **DEC-LG-01:** Build a thin read-only aggregator, not a re-implementation. (Rejected: a monolithic gate that re-runs everything; a CI-only YAML matrix.)
- **DEC-LG-02:** Three-status model `GO`/`CONDITIONAL`/`NO-GO` mapped to suite labels. (Rejected: boolean pass/fail; a 5-level scorecard.)
- **DEC-LG-03:** Hard blockers = code/release-blocking; advisory = external/operator/perf-budget. (Rejected: all-or-nothing; perf-budget as hard.)
- **DEC-LG-04:** Evidence freshness TTL per artifact class; expired evidence = `missing-evidence`. (Rejected: trust whatever is on disk.)
- **DEC-LG-05:** CI integration is opt-in per stage; Stage 0–1 can be a non-blocking advisory job first. (Rejected: immediately blocking CI gate.)
- **DEC-LG-06:** No provider/hosted/production claim from local checks. (Carrier of the repo-wide evidence rule.)

## Remaining external decisions (BLOCKED-EXTERNAL)

| ID | Decision | Owner | Why external |
|---|---|---|---|
| OPEN-LG-01 | Legal-owner signoff (5 proof flags + reviewer + approval ref) | Owner / counsel | Cannot be code; requires human legal review |
| OPEN-LG-02 | Support-monitoring owner confirmation (inbox/feedback/uptime/error/escalation) | Owner / ops | Operator-confirmed, not code |
| OPEN-LG-03 | Provider-exit operator record (exports/retention, Resend status, rotation, post-exit smoke, non-owner Google proof, recipient mailbox proof) | Owner / ops | External operator actions |
| OPEN-LG-04 | Hosted manual smoke against `archestimator.com` | Owner / QA | Requires live deployment + human observation |
| OPEN-LG-05 | Re-enable CI (`workflows/` relocation) and decide merge-gate strictness | Owner | Affects shared worktree + branch protection |
| OPEN-LG-06 | Resolve GitHub hosted security 403/404 (CodeQL/Dependabot/secret-scan) | Owner / GitHub admin | Infrastructure, not code |

## Remaining implementation blockers (for the future executor)

None that are `BLOCKED-ARCHITECTURE` or `BLOCKED-EVIDENCE` for the **local + script-contract** slices. The design is concrete enough to implement. The external gates above are isolated and surfaced by the gate, not blocked by missing design.

## Stack-contract summary (full in `18`)

The gate lives at the **build/CI/tooling layer**, not the application layer. It must: use Bun + TypeScript (matching the existing `scripts/*.ts` convention); read JSON/MD artifacts only; never import application server code; never call Cloudflare APIs directly (delegate to `cf:check-*`/`cf:verify-*`); emit to the established evidence directory pattern; and respect the `STRICT_READINESS_EXIT`/`FAIL_ON_BLOCKERS` precedent for strict-mode behavior.

## Database / provider-proof summary

The gate makes **no** direct D1/R2/DO/Queue/Email calls. It reports the verdicts of provider-backed scripts (`cf:check-provider-resources`, `cf:check-d1-auth-realtime`, `cf:check-email`, `cf:check-dns-delegation`, `cf:verify-hosted-*`, `cf:provider-proof`, `cf:jobs-proof`, etc.). Provider proof is never claimed from local-only checks. See `07`.

## Performance evaluator summary

Gate execution: target ≤2 min for local slice (Stages 0–1), measured by wall-clock; hosted stages owner-gated and out-of-band. Aggregator logic covered by unit tests with synthetic artifact fixtures. See `09` and `12`.

## Confirmation

No application code, tests, migrations, package manifests, provider state, or runtime data was modified by this planning task. All writes are confined to `.ai/03_plans/2026-07-07-launch-readiness-evidence-gate/`.
