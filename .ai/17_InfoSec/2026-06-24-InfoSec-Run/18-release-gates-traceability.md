# 18 - Release Gates and Traceability

Generated: 2026-06-25T00:44:57Z

## Release status model

Only these statuses are allowed for this run package:

| Status | Entry criteria |
|---|---|
| `NOT APPROVED` | One or more release gates are open, stale, unverified, failed, or missing final verifier evidence |
| `BLOCKED BY EXTERNAL VERIFICATION` | Local security evidence is complete, but a provider or production control cannot be verified without external access or settings changes |
| `APPROVED WITH EXPLICIT RESIDUAL RISK` | Every required gate passes or has owner-accepted residual risk with recorded scope, impact, mitigation, and expiry |
| `APPROVED` | Every required gate passes with current evidence at the intended release SHA and final independent verification is recorded |

Current status: **NOT APPROVED**.

## Gate traceability matrix

| Gate | Current evidence | Status | Blocking finding / risk | Required proof to close |
|---|---|---|---|---|
| Intended release SHA selected | Baseline `c2bef233097b7ef5bb07e4fa262b66f4bd4ef5dc`; current local and `origin/main` readback `12fef73cd385ce4b9e9ef341f9fed2be10c30c3e` | blocked | `INFOSEC-RUN-002` | Record intended release SHA, freeze target, regenerate inventories/rescans at that SHA |
| Current tracked-file classification | Baseline `03-file-coverage.csv` has 8323 rows; current `git ls-files` has 8330 and seven current tracked files are absent | blocked | stale baseline | Regenerate coverage ledger for intended SHA and record class counts |
| Class A review | `12-final-report.md` records 0/1746 reviewed | blocked | source-wide review incomplete | Complete and record review for every Class A file with reviewer, outcome, findings/tests |
| Class B specialized review | `12-final-report.md` records 0/5945 reviewed | blocked | source-wide review incomplete | Complete specialized review or explicit exclusion rationale per row |
| Entrypoint inventory | 792 heuristic rows, all `inventoried_not_reviewed` | blocked | traceability incomplete | Manually confirm route/action/RPC/storage/public surfaces, auth mode, abuse controls, tests |
| Mutation authorization matrix | 586 rows, all `not_started` | blocked | traceability incomplete | Add source-to-sink traces, expected actor, negative tests, evidence command, result |
| RLS/RPC/storage and DB posture | 204 SECURITY DEFINER matches across 67 applied migration files; zero FORCE RLS matches; provider identity tests pending | blocked | `INFOSEC-DB-001`, `INFOSEC-DB-002`, `INFOSEC-DB-003` | Per-function review, grants/search_path/schema qualification checks, RLS bypass decision, identity-separated negative/provider tests |
| ASVS/API/LLM control traceability | 12 ASVS scaffold rows, 8 `in_progress`, 4 `not_started`; OWASP LLM Top 10 not evaluated | blocked | standards traceability incomplete | Exact control IDs, applicability rationale, owner, evidence artifact, status, blocker ID |
| Dependency advisory remediation | `bun audit --json` passed with `{}` after package updates/overrides | local slice passed | `INFOSEC-SC-001` fixed | Preserve raw audit output for final evidence and rerun at intended release SHA |
| Secret and history scanning | Local scanner binaries not found; no external secret-scanner evidence | blocked | supply-chain/provider proof incomplete | Run selected scanners or hosted secret-scanning proof; preserve output and triage |
| SAST/CodeQL/Semgrep/OSV/SBOM | Local CodeQL/Dependabot config exists; hosted execution/alerts not enabled/proven | blocked | `INFOSEC-SC-006` | Enable hosted checks or run local tools; preserve raw results and triage |
| App fixed findings regression evidence | Eleven narrow findings fixed and targeted tests passed | partial | broader audit incomplete | Link fixed findings to entrypoint/file/authz/control rows and rerun after final SHA |
| Runtime headers/cookies/CSP | Limited live checks found report-only CSP on `/`; `/api/health` no-store observed; broad matrix pending | blocked | `INFOSEC-APP-009`, `INFOSEC-SC-007` | Capture actual headers/cookies/cache/CSP for auth, invite, public share, upload/export, AI, health, and error surfaces |
| GitHub hosted controls | `main` unprotected; `CI` disabled manually; code scanning not enabled; secret scanning disabled; Dependabot alert state disabled or unproven with current token scope; empty environments; no security policy | blocked | `INFOSEC-SC-006` | Enable/protect controls and capture raw readback after settings change |
| Vercel production/domain | Production deployment commit is not current checkout; apex timed out; report-only CSP; latest preview SSO is not production proof | blocked | `INFOSEC-SC-007` | Deploy intended SHA to production, fix apex/domain posture, capture runtime headers/cookies and deployment metadata |
| Supabase provider posture | Local inventory only; provider dashboard/auth/storage/backups/PITR/grants proof pending | blocked | DB/provider proof incomplete | Project-bound readbacks for `ebxxqidacheyapmmzavr`, identity tests, backup/PITR decision proof |
| Resend/email controls | Not verified | blocked | provider proof incomplete | Domain/webhook/API-key/sender/bounce/abuse-control readbacks and tests |
| Monitoring, incident, rollout, rollback | Not verified | blocked | operational readiness incomplete | Monitoring sources, alerts, log retention, rollback trigger matrix, rollback command proof, post-deploy smoke checklist |
| Full validation suite | Targeted tests/build/type/lint passed for fixed slices; full unit/DOM/E2E/security integration/DAST pending | blocked | validation incomplete | Run selected broad checks after release SHA is frozen and blockers are remediated |
| Final residual risk | Interim report exists; owner acceptance and final verifier signoff missing | blocked | residual risk not accepted | Convert risks to owner/deadline/disposition table and record acceptance or rejection |
| Final independent verifier | Planning-package verifier pending; release verifier cannot run until evidence is complete | blocked | final gate incomplete | Independent verifier reviews current SHA, raw evidence, release gates, and residual-risk acceptance |

## Open decision register

| Decision | Owner | Needed evidence | Release impact | Current disposition |
|---|---|---|---|---|
| Intended release candidate SHA | Product/engineering lead | Current branch, release scope, freeze point | Blocks all final audit claims | Open |
| GitHub external-control policy | Product/engineering/security | Provider readbacks after enabling branch/ruleset/CI/CodeQL/Dependabot/secret scanning/environments/security policy | Blocks release unless explicitly accepted as residual risk | Open |
| Vercel production/domain policy | Product/engineering/security | Deployment at intended SHA, apex/domain proof, runtime headers/cookies/CSP evidence | Blocks release | Open |
| DB SECURITY DEFINER and FORCE RLS/service-role posture | Engineering/security | Function/table-family matrix, grants, tenant checks, RLS bypass rationale, negative tests | Blocks DB release gate | Open |
| CSP enforcement posture | Engineering/security | Enforceable CSP plan and route-specific header proof | Blocks security-header gate or remains explicit residual risk | Open |
| LLM security scope | Product/engineering/security | AI route data-flow map, LLM Top 10 applicability, prompt/data retention assumptions, rate/cost abuse tests | Blocks AI/LLM control closure | Open |
| Final verifier authority | Product/security | Verifier identity, required evidence checklist, signoff artifact | Blocks final approval | Open |
| Risk ownership and expiry | Product/engineering/security | Owner, severity, mitigation, deadline, accepted/deferred/blocking status per risk | Blocks residual-risk acceptance | Open |

## Residual risk register

| Risk | Severity | Likelihood | Current control | Required mitigation/proof | Release disposition |
|---|---|---:|---|---|---|
| Stale audit baseline | High | High | Blocker recorded in `INFOSEC-RUN-002` | Freeze intended SHA and rerun inventories/reviews/rescans | Blocker |
| Unreviewed Class A/B source coverage | High | High | Baseline file classification only | Complete review ledgers and second pass | Blocker |
| Unreviewed entrypoint/authz ledgers | High | High | Heuristic inventory exists | Manual validation, authz tests, source-to-sink traces | Blocker |
| SECURITY DEFINER/RLS/service-role uncertainty | High | Medium | Local posture inventory and some focused tests | Per-function/table-family provider-backed tests and decisions | Blocker |
| Hosted GitHub controls failing/unproven | High | High | Local workflow/security config exists | Enable hosted controls and prove readbacks | Blocker |
| Vercel production/domain/runtime mismatch | High | High | Read-only API/header evidence | Deploy intended SHA and prove domain/header/cookie matrix | Blocker |
| Secret/SAST/DAST/SBOM gaps | Medium | Medium | `bun audit` clean only | Scanner/tool outputs and triage | Blocker or explicit residual risk |
| Monitoring/rollback gaps | Medium | Medium | None recorded | Rollout/rollback/monitoring runbook and proof | Blocker or explicit residual risk |
| LLM-specific threat gaps | Medium | Medium | AI route targeted error tests only | LLM Top 10 matrix, privacy/provider assumptions, rate/cost controls | Blocker for AI scope |

## Rollout, rollback, monitoring proof needed

Before any release approval, add a runbook or evidence appendix covering:

- Intended release artifact/SHA and deployment command or provider action.
- Pre-deploy checks, deploy checks, and post-deploy smoke matrix.
- Rollback trigger conditions, rollback command/provider action, and expected verification.
- Runtime monitoring sources, alert routing, log retention, and incident owner.
- Provider dashboards and read-only evidence paths for GitHub, Vercel, Supabase, Resend, and monitoring.
- Raw evidence storage plan with sanitized outputs and hashes.

## UltraQA note

No browser automation, E2E adversarial testing, screenshots, or production probing ran in this planning-package branch. That is intentional: the branch is documentation-only and cannot prove runtime behavior. Runtime claims remain blocked until targeted live/browser/security validation is explicitly run against the intended release environment.

## Attribution note

The 2026-06-25 planning-package continuation intentionally edited `.ai` documentation/state artifacts. The wider worktree is not clean and includes app/test/config/provider-adjacent diffs from earlier InfoSec remediation and unrelated active work. Therefore this document does not use global worktree cleanliness as evidence for the planning branch; it relies on scoped documentation checks and read-only verifier review.
