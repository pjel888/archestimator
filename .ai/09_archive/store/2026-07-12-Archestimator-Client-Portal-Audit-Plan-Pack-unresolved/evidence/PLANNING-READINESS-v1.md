# Client Portal Planning and Execution Readiness Evidence v2

## Claim

The consolidated Client Portal plan remains the sole execution authority for the
Client Portal work. Its completed units, active local rollout controls,
dual-read decision compatibility, and remaining hosted-release boundaries are
current and resumable without relying on the archived Shared Estimate pack as a
competing execution authority.

## Evidence boundary

- Current source, local implementation, focused validation, and plan-state
  evidence.
- Baseline HEAD: `6b59648a70c485cd54bad8f3659b3ec454621530`.
- Focused automated tests were run under the current execution objective,
  including the 2026-07-12 legacy/Client Portal decision dispatch repair; no
  browser automation, screenshots, hosted checks, provider mutations, or
  deployments are claimed here.
- GitNexus remains secondary discovery evidence only; its stale index is not
  trusted for current-source claims.

## Criterion audit

| Criterion | Status | Evidence |
|---|---|---|
| Objective and non-goals preserved | PASS | `README.md`, `00-EXECUTIVE-DECISION.md` |
| Current/source authority explicit | PASS | `01-EVIDENCE-AND-CURRENT-STATE-AUDIT.md`, `20-SOURCE-REGISTRY.md`, `21-SHARED-ESTIMATE-PAGE-AUDIT-DELTA.md` |
| Older pack comprehended and reconciled | PASS | retained/superseded tables in `21-SHARED-ESTIMATE-PAGE-AUDIT-DELTA.md` |
| Requirements traced | PASS | `19-REQUIREMENTS-TRACEABILITY.md` and `plan-pack.json` |
| Ordinary decisions closed | PASS | `DEC-AUTO-001` through `DEC-AUTO-026` |
| Exact DAG and resume point | PASS | `15-IMPLEMENTATION-ROADMAP-AND-BACKLOG.md`, Units 018/020/021 release packets |
| UX/product-design direction grounded | PASS | `04-FULL-WIDTH-UX-UI-SPEC.md`, `05-DISCUSSIONS-THREADS-AND-CHAT-SPEC.md`, `18-INDUSTRY-RESEARCH-AND-BENCHMARKS.md`, `21-SHARED-ESTIMATE-PAGE-AUDIT-DELTA.md` |
| Security/data/provider boundaries | PASS | `07-RBAC-RECIPIENTS-AND-ACCESS-CONTROL.md`, `08-DATA-MODEL-VERSIONING-AND-MIGRATION.md`, `12-SECURITY-PRIVACY-AUDIT-AND-RECORDS.md` |
| Test authorization preserved | PASS | `16-QUALITY-TEST-RELEASE-AND-OPERATIONS.md` |
| Resume state durable | PASS | `LOOP_LEDGER.md` |
| Units 001–017 implementation | PASS | unit evidence receipts plus verified unit status in `plan-pack.json` |
| Unit 018 migration recovery control | PASS (local) | dry-run/apply verification, manager-gated rollback/fix-forward, and `evidence/UNIT-018-LEGACY-MIGRATION-v1.md` |
| Unit 019 output parity | PASS (local) | golden parity receipt and ledger checkpoint |
| Unit 020 security hardening | PASS (local) | durable Client Portal rate-limit scopes and `evidence/UNIT-020-SECURITY-HARDENING-v1.md` |
| Unit 021 rollout control | PASS (local) | disabled-by-default D1 flag and `evidence/UNIT-021-ROLLOUT-CONTROL-v1.md` |
| Legacy/Client Portal decision dual-read | PASS (local) | legacy decision handler retained, Client Portal tokens dispatch to the v2 handler, and frozen legacy decisions return a safe no-store `423` |
| Machine manifest/hash/reference checks | PASS (structure) | Client Portal validator refreeze, manifest hashes, and `git diff --check`; final completion remains gated by release evidence |

## 2026-07-12 status and dual-read refreeze

- The execution-status capsule in `README.md` now records the implemented
  local units and the remaining Unit 018/020/021 release work. `SRC-001` is
  deliberately marked `STALE` until its changed planning-source claims are
  independently re-evaluated; `SRC-002` remains the current requirement source.
- The public share decision endpoint retains the legacy handler for legacy
  tokens and dispatches Client Portal tokens to the Client Portal handler. This
  preserves the legacy share UI contract while keeping the v2 public surface
  separate.
- When the independently disabled legacy-write-freeze control applies, a
  legacy decision write now returns a generic no-store `423`; it exposes no
  migration state or sensitive publication details.
- Validation: targeted ESLint; six focused Vitest files / 68 tests covering
  legacy decision routing, Client Portal decisions, rate limits, legacy
  migration actions/services, and public repository behavior; workspace
  `type-check`; and `git diff --check` all passed. The test run was explicitly
  authorized by the current execution objective.
- Regression sweep: 23 Client Portal files / 69 tests, 17 legacy-publication
  route and security files / 169 tests, and 8 share/UI files / 151 tests all
  passed in bounded runs. Targeted ESLint, workspace `type-check`, and
  `git diff --check` also passed. Expected denial-path diagnostic logs and
  existing test-environment warnings do not change the passing result.

## Residual boundaries

- The plan remains `IN_PROGRESS`: no named hosted cohort, actual legacy
  migration/cutover, rollback rehearsal, final Worker header capture,
  cross-portal hosted denial, hidden-byte hosted response proof, support-owner
  handoff, legacy-write freeze, or final truth reconciliation has occurred.
- The unit evidence above proves local implementation only; it does not promote
  `release_status` or `terminal_status`.
- Exact external legal/e-signature claims still require qualified review before
  release language is promoted.

## Stop condition

The implementation-ready planning claim is met. Final release and archive
completion remains blocked only by the explicit hosted/cohort evidence listed
above; resume at the authorized Unit 018/020/021 release packet.
