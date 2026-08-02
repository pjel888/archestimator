# PACK-MANIFEST — Archestimator Whole-Repo InfoSec + OWASP Audit Plan Pack

> **Historical provenance only.** This non-runnable predecessor is superseded by
> `.ai/03_plans/2026-07-31/Code-Improvement/`. It preserves audit evidence and
> original release/provider boundaries without claiming remediation implementation.

Owns artifact roles and topic ownership inside this retired folder. Mirrors
`plan-pack.json` `artifacts[]`.

## Artifacts and roles

| ID | Role | Path | Owner | Purpose |
|---|---|---|---|---|
| `ART-001` | canonical-execution | `00-PLAN.md` | Lead | Canonical historical pack record; not current repository execution authority |
| `ART-002` | narrative | `README.md` | Lead | Short index page |
| `ART-003` | narrative | `01-AUDIT-IDENTITY-AND-COVERAGE.md` | Lead | Audit identity, provenance, inventory, coverage |
| `ART-004` | narrative | `02-ARCHITECTURE-THREAT-MODEL-AND-ATTACK-SURFACE.md` | Lead | Threat model, trust boundaries, attack surface |
| `ART-005` | narrative | `03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md` | Lead | June 1 audit + active plan lineage |
| `ART-006` | narrative | `04-FINDINGS-REGISTER.md` | Lead | Human-readable canonical findings source |
| `ART-007` | narrative | `05-OWASP-ASVS-API-AI-CROSSWALK.md` | Lead | Coverage map (not certification) |
| `ART-008` | narrative | `06-REMEDIATION-ROADMAP-AND-SECURITY-GATES.md` | Lead | Wave plan, gates, DAG |
| `ART-009` | narrative | `07-BLOCKED-EVIDENCE-AND-AUTHORIZATION.md` | Lead | `AUTH-*` records |
| `ART-010` | narrative | `08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md` | Lead | Verifier verdicts + drift |
| `ART-011` | unit | `units/README.md` | Lead | Unit index |
| `ART-012` | unit | `units/001-realtime-token-revocation.md` | Lead | `UNIT-001` doc |
| `ART-013` | unit | `units/002-worker-edge-seam.md` | Lead | `UNIT-002` doc |
| `ART-014` | unit | `units/003-constant-time-bearer-and-secret-cleanup.md` | Lead | `UNIT-003` doc |
| `ART-015` | unit | `units/004-email-boundary-chokepoint.md` | Lead | `UNIT-004` doc |
| `ART-016` | unit | `units/005-scan-bind-invariant.md` | Lead | `UNIT-005` doc |
| `ART-017` | unit | `units/006-direct-upload-finalize-integrity.md` | Lead | `UNIT-006` doc |
| `ART-018` | unit | `units/007-scan-byte-ceiling.md` | Lead | `UNIT-007` doc |
| `ART-019` | unit | `units/008-queue-message-signing.md` | Lead | `UNIT-008` doc |
| `ART-020` | unit | `units/009-browser-hardening.md` | Lead | `UNIT-009` doc |
| `ART-021` | unit | `units/010-cron-redaction-and-audit-pii.md` | Lead | `UNIT-010` doc |
| `ART-022` | unit | `units/011-retention-registry.md` | Lead | `UNIT-011` doc |
| `ART-023` | unit | `units/012-ci-and-branch-protection.md` | Lead | `UNIT-012` doc |
| `ART-024` | unit | `units/013-defense-in-depth-backlog.md` | Lead | `UNIT-013` doc |
| `ART-025` | evidence | `artifacts/repository-file-inventory.csv` | Lead | Tracked-file inventory + sha256 |
| `ART-026` | evidence | `artifacts/coverage-summary.json` | Lead | Coverage closure summary |
| `ART-027` | evidence | `artifacts/baseline-hashes.csv` | Lead | Provenance hashes |
| `ART-028` | evidence | `artifacts/route-action-surface.csv` | Lead | Entrypoint security dispositions |
| `ART-029` | evidence | `artifacts/data-access-authz-matrix.csv` | Lead | Per-function authz dispositions |
| `ART-030` | evidence | `artifacts/token-secret-lifecycle.csv` | Lead | Token/secret lifecycle |
| `ART-031` | evidence | `artifacts/findings.json` | Lead | Machine-readable canonical findings |
| `ART-032` | evidence | `artifacts/standards-crosswalk.csv` | Lead | OWASP/API/ASVS/LLM/Agentic crosswalk |
| `ART-033` | evidence | `artifacts/historical-reconciliation.csv` | Lead | Lineage matrix |
| `ART-034` | evidence | `artifacts/rejected-refuted-findings.json` | Lead | Rejected/refuted/duplicate record |
| `ART-035` | evidence | `artifacts/commands-run.log` | Lead | Audit commands log |

## Topic ownership

All artifacts in this pack are owned by the **Lead** (the audit agent). Subagents were read-only; the Lead integrated and authored all normative content. The Multi-Agent Execution Directive's single-writer-for-shared-files rule was honored.

## Requirement-to-evidence completion audit

| Requirement | Criterion | Evidence | Unit | Status |
|---|---|---|---|---|
| `SEC-001` (revocation ≤60s) | `AC-001` | `EVID-001` | `UNIT-001` | SUPERSEDED; implementation not claimed |
| `SEC-002` (worker-edge) | `AC-002` | `EVID-002` | `UNIT-002`, `UNIT-003` | SUPERSEDED; implementation not claimed |
| `SEC-003` (email boundary) | `AC-003` | `EVID-003` | `UNIT-004` | SUPERSEDED; implementation not claimed |
| `SEC-004` (upload scan+bind) | `AC-004` | `EVID-004` | `UNIT-005`, `UNIT-006`, `UNIT-007` | SUPERSEDED; implementation not claimed |
| `SEC-005` (finalize integrity) | `AC-005` | `EVID-005` | `UNIT-006` | SUPERSEDED; implementation not claimed |
| `SEC-006` (cron redaction+PII) | `AC-006` | `EVID-006` | `UNIT-010` | SUPERSEDED; implementation not claimed |
| `SEC-007` (CI gates, AUX) | `AC-007` | `EVID-007` | `UNIT-012` | SUPERSEDED; implementation not claimed |
| `SEC-008` (queue signing) | `AC-008` | `EVID-008` | `UNIT-008` | SUPERSEDED; implementation not claimed |
| `SEC-009` (browser hardening) | `AC-009` | `EVID-009` | `UNIT-009` | SUPERSEDED; implementation not claimed |
| `SEC-010` (retention registry) | `AC-010` | `EVID-010` | `UNIT-011` | SUPERSEDED; implementation not claimed |
| `SEC-011` (historical reconciliation) | `AC-011` | `EVID-011` | (no unit — evidence only) | Historical audit evidence preserved |

All 13 units are decision-backed `SUPERSEDED` by `DEC-AUTO-007`; no criterion is
promoted and `implementation_status = NOT_STARTED` remains truthful. The pack's
`release_status = BOUNDARY` and four active `AUTH-*` records are preserved, so
retirement does not imply hosted, GitHub, scanner, deployment, or provider proof.

## Hash policy

Per the validator contract, every artifact's `sha256` in `plan-pack.json` is
computed over normalized text bytes. The validator enforces reciprocity. Validate
this retired pack with `bun run validate:plan-pack -- .ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack`.

## Reading order

`README.md` → `00-PLAN.md` → `01-AUDIT-IDENTITY-AND-COVERAGE.md` → `02-ARCHITECTURE-THREAT-MODEL-AND-ATTACK-SURFACE.md` → `03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md` → `04-FINDINGS-REGISTER.md` → `05-OWASP-ASVS-API-AI-CROSSWALK.md` → `06-REMEDIATION-ROADMAP-AND-SECURITY-GATES.md` → `07-BLOCKED-EVIDENCE-AND-AUTHORIZATION.md` → `08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md` → `units/` → `artifacts/`.
