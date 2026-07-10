# Verification, Rollout, And Final Audit

## Proof Matrix

| Test | Criterion | Command or surface | Expected signal | Evidence class |
| --- | --- | --- | --- | --- |
| `TEST-001` | `AC-001` | `bun test tests/vitest/ci-workflow-pinning.test.ts`; workflow YAML inspection; hosted required checks | Active pinned workflow; independent typecheck; protected check list matches workflow jobs. | Local contract + hosted control |
| `TEST-002` | `AC-002` | Release metadata fixtures; GitHub run/artifact/deployment; hosted SHA marker | One SHA and digest across passed run, artifact, environment, deploy, marker. | Local contract + hosted deploy |
| `TEST-003` | `AC-003` | Seed/cleanup unit and temp-D1 integration tests | Double setup/cleanup passes; canary untouched; report redacted. | Local integration |
| `TEST-004` | `AC-004` | Local contract/Chromium orchestration first; targeted `playwright test e2e/beta-golden-path.spec.ts` with explicit authorized staging configuration in `UNIT-007` | Local orchestration is deterministic; then twenty hosted steps and WebKit mobile release scope pass for the exact deploy SHA. | Local browser contract + hosted app boundary |
| `TEST-005` | `AC-005` | Local intentional-failure reporter/smoke fixtures first; GitHub artifact readback and hosted route smoke in `UNIT-007` | Local redacted bundle contract passes; then hosted bundle is retained and post-deploy route/auth checks pass for the exact run. | Local contract + hosted CI/route boundary |
| `TEST-006` | `AC-006` | Readiness-manifest fixture suite; `bun run cf:release-gates` | Stale/missing/conflicting evidence fails; only complete current evidence is green. | Local contract |
| `TEST-007` | `AC-007` | Workflow security tests; GitHub CodeQL/Dependabot/secret-scanning endpoints | Least privilege locally; hosted status is proven or explicitly unknown. | Local security + hosted control |
| `TEST-008` | `AC-008` | Cross-pack artifact composition suite; strict release gate | Every required pack/proof matches release ID, SHA, environment, and freshness. | Integration + release evidence |

## Gates

### `GATE-001` — Local implementation readiness (`FAIL` until execution)

Requires `TEST-001`, `TEST-003`, local-only portions of `TEST-004/005`,
`TEST-006`, and the focused release test suites. It does not advance
`AC-004/005`, whose complete criteria remain at the hosted boundary. Also run:

```bash
bun run type-check
bun run validate:error-handling
bun run validate:planning-prompts
bun run cf:build
git diff --check
```

Do not run broad browser proof merely to validate plan documents. Browser execution becomes mandatory when `UNIT-004` changes interaction/routing/data behavior.

### `GATE-002` — Hosted release control (`BOUNDARY`, `AUTH-001`)

Requires `AC-002`, `AC-004`, `AC-005`, and `AC-007`: protected required checks,
immutable deploy provenance, the hosted 20-step/WebKit journey, hosted scan
status, retained artifacts, authenticated post-deploy smoke, current recovery
and operating-contract artifacts, and exact-SHA release manifest. Local checks
cannot satisfy it.

## Adversarial Matrix

- Required job is skipped, cancelled, `continue-on-error`, or omitted from dependency chain.
- Pull request from a fork attempts to access deployment secrets.
- Workflow file uses mutable action tags or excessive permissions.
- Deploy rebuilds a branch after checks or uses a different lockfile/SHA.
- Seed setup partially fails; cleanup reruns; another run or real row is present.
- Shared link has expired/wrong password/wrong recipient; bot and anonymous events remain distinct.
- Browser test passes UI text while persistence or server state failed.
- Artifact expires before release decision or belongs to another run.
- Manifest receives stale restore, local-only provider proof, unknown scan permission, or open legal/auth gate.
- README is newer than manifest or claims readiness when the manifest is red.

## Rollout

1. Land contract tests and active CI without enabling deploy.
2. Observe required-check duration and flake rate on normal pull requests.
3. Land deterministic fixture and Chromium golden path in a non-production staging environment.
4. Add artifact retention and authenticated post-deploy smoke.
5. Enable generated readiness manifest as a non-mutating release report.
6. Obtain `AUTH-001`, then apply hosted rules/deployment controls with recorded before/after state.
7. Run one limited Beta candidate, verify WebKit mobile review/share and rollback, then decide release.

## Rollback And Fix-forward

- If CI blocks all work incorrectly, revert the workflow commit while preserving logs and contract tests; do not bypass individual required checks silently.
- If fixture cleanup is unsafe, disable the golden job and revoke its credentials; do not run broad cleanup SQL.
- If deploy provenance mismatches, stop promotion and roll back to the last manifest-proven artifact.
- If hosted smoke fails, keep the candidate unreleased, collect redacted evidence, and use the incident/rollback contract.
- Workflow/history changes are git-reversible; hosted ruleset rollback must use the captured pre-change configuration in `AUTH-001`.

## Completion Audit

- [ ] `BETA-P0-01` has active hosted required checks and deploy provenance, not just YAML.
- [ ] `BETA-P0-02` has deterministic staging seed/cleanup and unskipped hosted golden proof.
- [ ] `BETA-P0-10` has current JSON/Markdown truth for the exact release candidate.
- [ ] `BETA-P1-09` has integrated accessibility/mobile critical-path evidence, including the Publisher-owned public-review contribution.
- [ ] TypeScript compensation is mandatory despite `ignoreBuildErrors`.
- [ ] Failed browser/build evidence is retained and redacted.
- [ ] Release/browser policy includes mobile public review and recovery.
- [ ] Every child pack and existing-pack circle-back reports current evidence.
- [ ] `AUTH-001` is explicitly resolved; no implicit permission is inferred.
- [ ] Cleanup completed and rollback evidence is attached.
- [ ] A distinct `verifier` reran the final commands and recorded provenance.

The stop condition is a current green exact-SHA release manifest plus hosted enforcement. Anything less is implementation progress, not external-Beta readiness.
