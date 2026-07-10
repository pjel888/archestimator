# Verification, Rollout, And Final Audit

This file retains the stable `TEST-*`/`GATE-*` records and evidence index. The
negative-fixture detail, hosted proof separation, deployment recovery, and final
authority audit are independently reviewable in
`ADVERSARIAL_TEST_AND_HOSTED_PROOF_PLAN.md`,
`DEPLOYMENT_ROLLBACK_REPROMOTION_AND_OPERATIONS.md`, and
`AUTHORIZATION_BOUNDARIES_AND_FINAL_AUDIT.md`; those artifacts do not create
competing proof IDs.

## Proof Matrix

| Test | Criterion | Command or surface | Expected signal | Evidence class |
| --- | --- | --- | --- | --- |
| `TEST-001` | `AC-001` | `bun test tests/vitest/ci-workflow-pinning.test.ts`; YAML parser | Frozen install, full action pins, least privilege, independent typecheck, fail-closed aggregate, fork-safe triggers. | Local contract |
| `TEST-002` | `AC-002` | `bun test tests/vitest/release-candidate-metadata.test.ts tests/vitest/cloudflare-release-gates-script.test.ts` | Canonical metadata covers the complete Wrangler/OpenNext upload graph; missing/skipped/cancelled/stale/rebuilt/omitted-input/mutated/mismatched candidates and direct-Wrangler adapter bypass fail. | Local contract |
| `TEST-003` | `AC-003` | `bun test tests/vitest/beta-golden-fixture.test.ts` against temp/local D1 | Double setup/cleanup, partial-failure resume, host/binding refusal, canary preservation, and redacted receipt pass. | Local integration |
| `TEST-004` | `AC-004` | Golden-path contract parser plus targeted local Chromium only when implementation changes browser behavior | Exactly 20 mapped steps, stable selectors, fixture/assertion/receipt coverage, reload persistence, tags, no default skip/sleep. | Local contract/browser |
| `TEST-005` | `AC-005` | `bun test tests/vitest/release-evidence-bundle.test.ts tests/vitest/cloudflare-hosted-route-script.test.ts` | Intentional failures produce complete redacted bounded-retention bundles; wrong-auth/SHA/environment/stale cases fail. | Local contract |
| `TEST-006` | `AC-006` | `bun test tests/vitest/beta-release-readiness.test.ts tests/vitest/cloudflare-release-gates-script.test.ts`; `bun run cf:release-gates` | Stale/missing/unknown/conflicting/superseded evidence fails; only complete current evidence is green. | Local contract |
| `TEST-007` | `AC-007` | Workflow security tests and mocked read-only GitHub/Cloudflare discovery | Least privilege, `hide_secret=true`, pre-persistence redaction, and complete pagination pass; 401/403/404/503/rate-limit/partial/unsupported/unavailable are `UNKNOWN`, never clean. | Local security contract |
| `TEST-008` | `AC-008` | Cross-pack composition fixtures and strict release gate | All nine current package IDs, artifact digests, handoff receipts, statuses, source revisions, release ID, and freshness agree; every out-of-suite capability is either backed by a current validated receipt or a source/revision-matched exclusion disposition. | Local integration |
| `TEST-009` | `AC-009` | Approved GitHub mutations plus GET readback in `UNIT-008` | Ruleset, check contexts and expected source apps, successful seven-day eligibility runs, bypasses, environment, retention, scans, branch, and workflow SHA match `AUTH-001`. | Hosted GitHub boundary |
| `TEST-010` | `AC-010` | Approved Chromium and WebKit projects in `UNIT-009` | Twenty staging steps and mobile review pass for exact SHA/fixture; canary and double cleanup pass. | Hosted staging boundary |
| `TEST-011` | `AC-011` | Approved OpenNext version upload/deploy, authenticated/denial smoke, eligibility-gated code rollback rehearsal, exact-candidate re-promotion, marker/auth/denial/gate rerun, and final traffic readback in `UNIT-010` | Full input manifest, returned version ID, initial/rollback/re-promotion deployment IDs, final candidate traffic state, separate data/schema recovery state, and release manifest share one release ID/SHA, or a no-release receipt records the actual final deployed version. | Production boundary |

## Gates

### `GATE-001` - Local implementation readiness (`FAIL` until execution)

Requires `AC-001` through `AC-008`. Run the targeted suites above, then:

```bash
bun run type-check
bun run validate:error-handling
bun run validate:planning-prompts
bun run cf:build
git diff --check
```

The build is repository proof only. It does not satisfy GitHub, staging, or
production criteria. Plan-only edits do not require Playwright because no
interaction, route, auth/data state, responsive layout, or accessibility behavior
changed; validator, static contract, and independent adversarial review are the
specific evidence for this run.

### `GATE-002` - Hosted GitHub enforcement (`BOUNDARY`, `AUTH-001`)

Requires `AC-009` and `TEST-009`. A workflow file, a successful unprotected run,
or a local API fixture cannot satisfy this gate. Record live before/after readback;
unknown permission or unavailable endpoints keep the gate closed.

### `GATE-003` - Isolated staging journey (`BOUNDARY`, `AUTH-002`)

Requires `AC-010` and `TEST-010`. The proof must identify the staging resource,
URL hash, exact candidate SHA, fixture namespace, browsers/projects, 20 step
results, pack receipts, artifact digests, foreign canary, and cleanup result.

### `GATE-004` - Production release (`BOUNDARY`, `AUTH-003`)

Requires `AC-011`, `TEST-011`, `GATE-002`, and `GATE-003`. Production proof must
show full upload-input promotion through OpenNext without rebuild, the returned
Worker version ID, exact-SHA marker, authenticated and denial smokes, retained
evidence, current operating/recovery receipts, rollback eligibility plus a
code-only rehearsal, separate data/schema recovery state, and a current strict
release decision.

## Risk-Specific Review Index

`ADVERSARIAL_TEST_AND_HOSTED_PROOF_PLAN.md` owns the expanded negative-fixture
matrix and separates local, GitHub, staging, and production evidence.
`DEPLOYMENT_ROLLBACK_REPROMOTION_AND_OPERATIONS.md` owns ordered promotion,
code-only rollback, exact-candidate re-promotion, final traffic proof, and the
separate data/schema recovery boundary. `AUTHORIZATION_BOUNDARIES_AND_FINAL_AUDIT.md`
owns the three authority packets, applicability decision, and final readiness
matrix.

The release stop condition remains a current green exact-SHA release manifest
plus hosted enforcement, isolated staging proof, production final-state proof,
complete cleanup, and distinct verifier provenance. Anything less is
implementation progress or a proven `NO-GO`, never external-Beta readiness.
