# Verification And Reviews

## 1. Profile

Profile: `Q2_CRITICAL_CHANGE_GATE`.

Reasons: the implementation units touch authorization, public privacy, sessions,
tenant data, D1 migrations, uploads, queues, Durable Objects, email, release
provenance, local credentials, and security tooling.

Q3 is required only for an actual release or deployment decision.

## 2. Evidence Rules

- Run one heavy command at a time while memory remains within AGENTS.md limits.
- Use one sealed candidate revision and record worktree drift.
- A passing test that asserts vulnerable behavior is validation evidence, not a
  remediation pass.
- Absence from a later scan does not prove resolution until `match`/`compare` or
  the documented artifact-correlation fallback reconciles root cause and
  coverage.
- Local evidence cannot prove hosted GitHub, Cloudflare, DNS, WAF, deployment,
  secret-scanning, or branch-protection state.
- No skipped, flaky, malformed, weakened, or stale critical evidence may pass.

## 3. Acceptance Criteria And Gates

| Criterion | Required terminal proof |
| --- | --- |
| AC-001 | Every cloud row and security PR has one current disposition and owner |
| AC-002 | Identity, authorization, session, and realtime denial invariants pass |
| AC-003 | Public, privacy, API, browser, and Worker boundary invariants pass |
| AC-004 | Upload, R2, queue, email, and external-effect invariants pass |
| AC-005 | D1 tenant, privacy, retention, pagination, and audit invariants pass |
| AC-006 | Supply-chain, CI, configuration, MCP, and local-tooling invariants pass |
| AC-007 | The cumulative fixed candidate passes the complete Q2 profile and reviews |
| AC-008 | Final Codex reconciliation and Plan Pack closeout pass without hosted overclaim |

`GATE-RECONCILIATION`, `GATE-AUTH`, `GATE-PUBLIC`, `GATE-DATA-ASYNC`,
`GATE-SUPPLY`, and `GATE-Q2` remain `FAIL` until their criteria have fresh
machine-readable proof. `GATE-OPS-01` remains `BOUNDARY` under `AUTH-001`.

## 4. Unit Evidence Matrix

| Unit | Minimum decisive evidence |
| --- | --- |
| UNIT-001 | 200-row uniqueness/disposition/owner validator; PR SHA/state inventory; predecessor overlap audit; July 31 UNIT-024 admission/absorption receipt; sole-runnable-authority check; Plan Pack validator |
| UNIT-002 | Authz denial matrix; session/revocation tests; focused D1 tests; changed mutation |
| UNIT-003 | Route and Worker tests; public privacy tests; browser proof; request-boundary abuse cases |
| UNIT-004 | Upload/queue/email failure matrix; Workers-runtime integration; idempotency and recovery |
| UNIT-005 | Tenant/pagination/retention tests; migration rehearsal; fix-forward proof |
| UNIT-006 | Workflow security; dependency/provenance; origin/token/path-containment tests |
| UNIT-007 | Full Q2 aggregate; changed/critical mutation; critical coverage; two independent reviews |
| UNIT-008 | Codex rerun/export and match/compare or documented deterministic artifact-correlation fallback; final 200-row audit; July 31 UNIT-020 absorption-closeout receipt with exactly 221 outcome-compatible, owner-status-bound mapping results and candidate evidence; validated manifest |

## 5. Commands

### Pack and contracts

`bun run validate:plan-pack -- .ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack`

`bun run validate:planning-prompts`

`bun run quality:contracts`

### Static and build

`bun run type-check`

`bun run lint`

`bun run quality:static`

`bun run cf:check-d1-migrations` when active migrations change.

`bun run cf:build` when Worker/Next runtime behavior changes.

### Focused and runtime

`bun run test:dom -- <focused-vitest-files>`

`bun run test:workers -- <focused-worker-files>`

`bun run test:e2e:smoke` plus targeted public/share/auth browser specs when
behavior crosses a browser boundary.

### Mutation and Q2

`bun run test:mutation:changed`

`bun run test:mutation:critical` for critical security boundaries.

`bun run quality:critical`

### Codex Security

Use `--auth chatgpt` so API-key environment variables are stripped.

1. Standard repository or deterministic path scan.
2. One fresh deep security-critical path retry.
3. Working-tree scan for the final candidate.
4. Committed base/head diff scan when the candidate has a nonempty commit diff.
5. `scans list` and `scans show`.
6. `scans match <before> <after> --all` when both saved records are complete.
7. `scans compare <before> <after>` when both saved records are complete.
8. Export JSON, CSV, and SARIF to private evidence.
9. Validate accepted findings before implementation and after candidate repair.
10. Generate patch proposals only for review; do not apply them implicitly.

If deep mode repeats the same deterministic draft-artifact failure, preserve the
hashed private log, run supported deterministic path scans over every changed
or critical boundary, run the final working-tree scan, and correlate findings
at artifact/root-cause level. If history ingestion again prevents `match` or
`compare`, preserve the failed operation logs and perform the same explicit
artifact-level correlation. Never report unavailable deep/history coverage as
zero findings. Q2 may pass only when the fallback covers every changed and
critical path and the independent security reviewer accepts the limitation;
otherwise the aggregate result is `QUALITY_BLOCKED`.

### Agent configuration

Run AgentShield from an isolated npm runtime so repository overrides do not
interfere, target `.claude`, and omit `--fix`:

`npx --yes ecc-agentshield@1.4.0 scan --path <repo>/.claude --format json --injection --sandbox --taint --supply-chain --supply-chain-online`

Pin npm integrity to
`sha512-R98OO1Ujyk2lezDLb+iQmMhF6FwTJCHajy3G4FCB6x7wkSTqR9f8+eAelC5KDzYDsGSbc0sOZvjXOOPRBtMpDg==`
or a deliberately reviewed successor. Record the observed package/CLI version
and private output hashes. Run Opus analysis only when its separate provider
credential is available; lack of that credential is a documented optional-tool
limitation, not a clean result.

## 6. Security-Specific Test Obligations

- Commercial terms: restricted/no-grant denial; direct-grant success; inherited
  project success; viewer denial; stale revision; quotation link/unlink parity.
- Public activity: anonymous and cross-recipient identity denial; self-policy;
  owner/manager visibility; password/internal event preservation.
- Durable Objects: authenticate before object selection; global cardinality and
  rate admission; revoked token reconnect denial.
- Request bodies: Content-Length rejection plus bounded reader before JSON or
  multipart parse; configuration-enabled route coverage.
- Upload scanning: unavailable is not clean; clean/infected/override lifecycle;
  tenant checks; retry and recovery.
- Local tooling: strict origin, no token-bearing unauthenticated script, path
  containment, peer attestation, safe target allowlist, redacted output.
- Workflows: trusted revision ancestry, pinned actions/tools, least privilege,
  provenance subject correctness.

## 7. Independent Reviews

### Quality review

Read-only reviewer distinct from all product writers checks correctness,
coverage, failure/recovery behavior, mutation results, evidence freshness, and
scope discipline.

### Security review

Separate read-only security reviewer checks identities, assets, trust
boundaries, source-to-sink paths, denial cases, exploit preconditions,
redaction, false-positive claims, and zero unresolved High/Critical issues.

Neither reviewer may approve their own implementation. Any material finding
reopens the owning unit.

## 8. Aggregate Verdict

The aggregate result is exactly `PASS`, `FAIL`, or `QUALITY_BLOCKED`. `PASS`
requires all selected commands, reviews, scan reconciliation, and criteria to
be fresh and green at the same candidate. Optional hosted proof cannot convert
a local failure into PASS.
