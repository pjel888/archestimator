# 00-PLAN — Canonical Execution Truth

## Outcome and business intent

Perform a Cloudflare-native hosted-release, recovery, and operations audit of
Archestimator and create a standalone, validator-conformant implementation
plan pack for controlled design-partner beta readiness.

This pack owns the **evidence boundary** that source-only audits cannot prove:
deployed Worker identity, domain routing, provider resources, migration
parity, hosted authentication, storage lifecycle, queues/DLQs, cron, Durable
Objects, email, observability, backup/restore readiness, incident response,
release provenance, and fix-forward recovery.

This is **not** another code-quality, performance, or security audit. Current
ownership for those surfaces is
`.ai/03_plans/2026-07-31/Code-Improvement/`; the retired July 19 Quality Master
and Infosec OWASP references here are historical provenance.

The central question:

> Can Philip safely operate the currently deployed Cloudflare-native
> Archestimator for a controlled beta, detect material failure quickly,
> recover without losing or corrupting design-partner data, and prove exactly
> what is local, preview, hosted, provider, and operator ready?

## Task Contract

- **Objective**: Cloudflare-native hosted-release / recovery / operations audit
  + plan pack; no product code changes.
- **Scope**: every Cloudflare resource bound in `wrangler.jsonc` + every
  operator-facing release/recovery/operations surface.
- **Exclusions**: product code, active migrations, dependencies, runtime
  config, provider state mutation; another generic security audit; duplication
  of any active-pack remediation.
- **Inputs**: `AGENTS.md`, current source at HEAD `b2a934919`,
  `wrangler.jsonc` executable config, live provider readback (where
  authorized), the three named reconciliation packs.
- **Constraints**: read-only hosted verification + local/preview runtime
  checks + isolated recovery rehearsals only; explicit `TEST_TASK` scope.
- **Owner**: lead (single writer); no parallel subagent writes; subagents used
  only for read-only investigation.
- **Capability class**: frontier judgment for synthesis and final decisions;
  balanced/read-heavy for parallel investigation.
- **Required artifacts**: README, 00-PLAN, plan-pack.json, PACK-MANIFEST,
  LOOP_LEDGER, findings register + machine-readable counterpart, coverage
  matrix, dependency-ordered unit documents, per-domain evidence artifacts.
- **Acceptance criteria**: pack-specific completion gate (below) met;
  validator passes; fresh executor can start UNIT-001 without rediscovery.
- **Stop condition**: completion gate met OR further hosted evidence
  impossible without operator action.
- **Escalation condition**: a NO_GO blocker cannot be resolved without
  operator action → AUTH-001 boundary; CONDITIONAL_GO decision recorded.

## Scope and explicit non-goals

### In scope

- Every bound Cloudflare resource (Worker, D1, R2, queues, DOs, Images,
  Email, crons).
- Every operator-facing release, recovery, and operations surface.
- Evidence-layer classification for every claim (REPO_LOCAL → EVIDENCE_BLOCKED).
- Cross-reference to current owners and historical predecessor records (no
  duplicate owners).

### Non-goals

- Product code changes.
- Active migration changes.
- Dependency or runtime config changes.
- Provider state mutations.
- Generic security audit (owned by `.ai/03_plans/2026-07-31/Code-Improvement/`).
- Performance or code-quality audit (owned by `.ai/03_plans/2026-07-31/Code-Improvement/`).
- Public self-service release gates (controlled beta only).
- CI activation (current authority: `.ai/03_plans/2026-07-31/Code-Improvement/`;
  historical Infosec `UNIT-012`).
- CI truthful-claims engineering (current authority:
  `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Quality Master
  `UNIT-002`).
- `workers_dev:false` remediation (current authority:
  `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Infosec `UNIT-002`).

## Baseline and evidence limits

- Baseline HEAD: `b2a934919ce499c0404e5b9f9a5644f22757c78a` (2026-07-19).
- Tree: clean.
- Wrangler auth: **expired** (AUTH-001). All wrangler auth-gated provider
  readback recorded as `EVIDENCE_BLOCKED` with continuation context.
- Hosted HTTPS probe: captured in
  `evidence/hosted-probe-2026-07-19T06-39Z.md`.
- Source inspection: complete for all 12 audit domains.

## Existing-pack reconciliation

At the 2026-07-19 audit baseline, `artifacts/existing-pack-overlap.json`
recorded 21 candidates considered; 14
`NEW_OWNER_HERE`; 3 `CROSS_REFERENCE_ACTIVE_PACK`; 3 `ALREADY_IMPLEMENTED`;
1 `DEFERRED_TO_NAMED_STAGE_OR_OWNER`; 0 `HISTORICAL_ONLY`. No accepted
requirement or unit had two active owners. (Candidate IDs in the overlap
matrix are a separate reconciliation namespace from the findings-register
IDs; see the matrix schema note.)

Key dispositions:

- D1 PITR *enablement* → MVP-Startup UNIT-004. Hosted D1 recovery *proof*
  gap → this pack UNIT-001.
- CI *truthful claims* and *activation* →
  `.ai/03_plans/2026-07-31/Code-Improvement/` (historical Quality Master
  `UNIT-002` and Infosec `UNIT-012`). Operator release-gate *ritual* → this
  pack UNIT-006.
- Email *CRLF/HTML chokepoint* →
  `.ai/03_plans/2026-07-31/Code-Improvement/` (historical Infosec `UNIT-004`).
  Email *DNS topology* → this pack UNIT-004.
- Realtime token *revocation logic* →
  `.ai/03_plans/2026-07-31/Code-Improvement/` (historical Infosec `UNIT-001`).
  Hosted DO *storage ops + quarantine runbook* → this pack UNIT-005.

## Requirements (CORE unless noted)

Requirement IDs are canonical `REQ-NNN` (the validator's ID regex). Earlier
drafts used a `REQ-OPS-NNN` label; the mapping is `REQ-OPS-0NN == REQ-0NN`.
`REQ-009` was dropped at E-0010 (the no-duplicate-owners matrix in
`artifacts/existing-pack-overlap.json` stands on its own).

- `REQ-001` (CORE) — Hosted D1 recovery posture must be proven before
  controlled-beta admit. → UNIT-001
- `REQ-002` (CORE) — Hosted alert delivery for S-01..S-07 must be
  verified before admit. → UNIT-002
- `REQ-003` (CORE) — Hosted Google OAuth round-trip must be exercised
  before admit. → UNIT-003
- `REQ-004` (CORE) — Email DNS topology + deliverability must be
  aligned before relying on magic-link or sending cohort notifications.
  → UNIT-004
- `REQ-005` (CORE) — Hosted queue / DLQ / DO / R2 operational baselines
  must be captured. → UNIT-005
- `REQ-006` (CORE) — Controlled-beta release-gate ritual must be
  established and executed before each cohort wave. → UNIT-006
- `REQ-007` (CORE) — Hosted deployment provenance must be captured at
  each cohort admit. → UNIT-006
- `REQ-008` (CORE) — Hosted D1 migration parity must be verified.
  → UNIT-007

## Decisions

- `DEC-AUTO-001` — Lane = Plan Pack (explicit master prompt + high blast
  radius).
- `DEC-AUTO-002` — Profile = `high-blast-radius`; ceiling = `IMPLEMENT_LOCAL`;
  last observed scope = `READ_ONLY`.
- `DEC-AUTO-003` — Suite version = `2026-07-12` (current suite per
  Plan-Pack-Schema).
- `DEC-AUTO-004` — One writer (lead); no parallel writes; subagents read-only.
- `DEC-AUTO-005` — Hosted probe scope = DNS + HTTPS GET/HEAD/OPTIONS only;
  no Cloudflare API write.
- `DEC-AUTO-006` — (pending operator decision) RPO/RTO targets for D1.
- `DEC-AUTO-007` — Email DNS topology operator decision deferred to UNIT-004
  (Option A vs Option B).
- `DEC-AUTO-009` — Evidence-honesty repair at improvement pass: AC-004/005/006
  demoted from PASS to BOUNDARY and EVID-004/005/006 from PASS to STALE,
  because each evidence record's own narrative says the work is not done
  (topology not aligned, baselines EVIDENCE_BLOCKED, ritual not executed).
  AUTH-002 added to bound the two operator-action criteria (AC-004 DNS,
  AC-006 cohort admit) that are not wrangler-token-gated.

## Authorization boundaries

- `AUTH-001` (ACTIVE) — Cloudflare hosted reads via wrangler are blocked by an
  expired token in this non-interactive session. Continuation: interactive
  terminal → `bunx wrangler login` or set `CLOUDFLARE_API_TOKEN` → re-run the
  readback commands listed per finding. Bounds: deployment SHA, D1 info/
  backups/migrations list/schema, R2 object listing, queue depth, DO storage,
  secret names (never values), Workers Logs retention. Gates AC-001, AC-002,
  AC-003, AC-005, AC-007, AC-008, GATE-CONTROLLED-BETA-001.
- `AUTH-002` (ACTIVE) — Operator-gated production actions that no audit session
  may take autonomously: DNS-record changes for email topology alignment
  (UNIT-004 Option A/B) and the cohort-admit release-gate ritual that mutates
  the operator ledger and admits design partners (UNIT-006). These are
  deliberately operator decisions, not wrangler-token-gated reads. Gates
  AC-004, AC-006.

Operator actions deliberately outside this audit's authorization (per master
prompt): deploy, secret sync/value read, DNS change, production D1 writes/
exports/time-travel restore, production R2 mutation, queue replay/purge, DLQ
mutation, cron change, DO production-state mutation, real outbound email,
GitHub settings change, paid add-on, account change.

## Findings summary

See `04-FINDINGS-REGISTER.md` for full detail. Severity counts:
Critical 0, High 4, Medium 10, Low/Informational 3, Rejected/Refuted 0
(canonical register); see the findings register for the historical 9/4/3
draft counts and how they reconcile.

The four High findings:

1. `OPS-RECOVERY-001` — Hosted D1 recovery posture unverified.
2. `OPS-OBS-ALERT-002` — Hosted alert delivery unverified.
3. `OPS-AUTH-OAUTH-003` — Hosted Google OAuth round-trip not exercised.
4. `OPS-RELEASE-GATE-004` — Release-gate ritual not yet executed.

Each High received an adversarial challenge pass; none were refuted.

## Acyclic dependency graph

```
UNIT-001 (D1 recovery)        ────────────┐
UNIT-002 (observability+alert) ───────────┤
UNIT-003 (OAuth round-trip)   ────────────┼──→ UNIT-006 (release gate)
UNIT-004 (email DNS)          ────────────┤
UNIT-005 (queue/DO/R2 ops)    ────────────┤
UNIT-007 (D1 parity+retention) ───────────┘
```

UNIT-001..005 + UNIT-007 are dependency-free and can run in parallel.
UNIT-006 (release-gate ritual) depends on UNIT-001/002/003 resolving their
NO_GO items. The DAG is acyclic.

## Execution slices / waves

- `SLICE-001` — Operator readiness wave: UNIT-001, UNIT-002, UNIT-003,
  UNIT-004, UNIT-005, UNIT-007 (all parallelizable).
- `SLICE-002` — Release-gate wave: UNIT-006 (after SLICE-001 NO_GO items
  resolved).

## Risks

- `RISK-001` (OPEN) — AUTH-001 blocks all wrangler auth-gated readback;
  without operator session, the three NO_GO blockers cannot be resolved.
- `RISK-002` (OPEN) — Email topology decision (UNIT-004 Option A vs B)
  affects outbound deliverability; wrong choice could softfail cohort
  notifications.
- `RISK-003` (OPEN) — DO state corruption has no operator-quarantine
  runbook today; risk is bounded for controlled beta (small cohort) but
  escalates for public beta.
- `RISK-004` (MITIGATED) — workers.dev secondary origin reachable; partial
  mitigation via canonical-host redirect; full remediation belongs to
  `.ai/03_plans/2026-07-31/Code-Improvement/` (historical Infosec `UNIT-002`).
- `RISK-005` (ACCEPTED) — CI disabled; for controlled beta, release-gate
  ritual substitutes; not a blocker.

## Resume state

If resuming:

- Goal: see "Outcome and business intent" above.
- Status: see README.md status tuple.
- Next unit: UNIT-001.
- Hashes: refreshed by `validate-plan-pack.mjs --write` (see LOOP_LEDGER
  E-0010).
- Decisions: DEC-AUTO-001..007, DEC-AUTO-009.
- Boundaries: AUTH-001 (ACTIVE), AUTH-002 (ACTIVE).
- Ownership: lead.
- Handoffs: none.
- Cleanup: no ephemeral state outside the pack folder.

## Exact next ready unit

`UNIT-001` — Establish hosted D1 recovery posture.

Dependency-free; ready to start. Operator action required: interactive
terminal → `bunx wrangler login` → follow UNIT-001 implementation boundary.

## Completion and archive conditions

This pack reaches `ACHIEVED` when:

- Each bound Cloudflare resource has a current evidence-layer disposition.
- Every command run has side-effect classification.
- Local, preview, hosted, GitHub, operator, and blocked evidence are
  separated.
- D1 recovery has an honest local-versus-hosted verdict (post UNIT-001).
- Each queue, cron, Durable Object, auth, email, and observability domain has
  failure and recovery coverage.
- Current Code Improvement ownership and historical Infosec/Quality Master
  findings are cross-referenced, not duplicated.
- Controlled-beta release status is explicit (GO recorded in release receipt).
- Every NO_GO item maps to one owner/unit or exact external boundary.
- One exact next unit is ready.
- The validator passes.

Until then, status remains `CONDITIONAL_GO` with the three NO_GO items
documented.
