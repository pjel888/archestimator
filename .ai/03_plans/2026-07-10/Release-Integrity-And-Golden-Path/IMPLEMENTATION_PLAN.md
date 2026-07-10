# Implementation Plan

## Execution Contract

Lead/integrator: `executor`. Independent lanes use installed `test-engineer` for fixtures/browser proof, `researcher` for official GitHub/Next/Cloudflare constraints, and `verifier` for final evidence. Only the lead edits shared workflow/release state. Agents must re-read shared files before edits, preserve concurrent changes, and return paths, commands, results, risks, and next dependencies.

## Ownership And Leases

| Scope | Owner | Lease rule |
| --- | --- | --- |
| `.github/workflows/**`, workflow contract tests | CI lane | Singleton until `UNIT-002` verifies. |
| `scripts/` readiness-manifest producer and tests | Release-evidence lane | No feature-pack changes in the same files. |
| `e2e/` golden spec and fixture helpers | Browser lane | Feature packs expose helpers through reviewed interfaces; browser lane owns orchestration only. |
| `README.md` readiness summary | Integrator | Last write, generated facts only. |
| Existing 2026-07-10 Activity/Publisher packs | Their current agents | Read-only; circle back via umbrella after their stop report. |

## DAG

```text
UNIT-001 Active CI
  -> UNIT-002 Merge/deploy provenance
UNIT-003 Deterministic staging fixture
  -> UNIT-004 Golden-path orchestration
UNIT-002 + UNIT-004
  -> UNIT-005 Evidence retention and hosted smoke
UNIT-001 + UNIT-002 + UNIT-005
  -> UNIT-006 Release truth manifest
UNIT-006 + every domain pack + existing-pack circle-back + AUTH-001
  -> UNIT-007 Hosted release proof
```

## Ready Slice

`SLICE-001 = UNIT-001, UNIT-002, UNIT-003, UNIT-004, UNIT-005, UNIT-006`.

### `UNIT-001` — Restore active, pinned CI

**Goal:** activate a current workflow without copying stale provider assumptions.

**Paths:** `.github/workflows-disabled/ci.yml`, new `.github/workflows/ci.yml`, `.github/workflows-disabled/{codeql,dependabot,react-doctor}.yml` as inputs, `package.json`, `bun.lock`, `next.config.ts`, `tests/vitest/ci-workflow-pinning.test.ts`.

**Steps:**

1. Inventory every validation command and split fast required checks from build/browser/security jobs.
2. Use frozen Bun install, pinned action SHAs, minimal `permissions`, concurrency that never cancels the only deployable proof, and explicit timeouts.
3. Make independent `type-check` mandatory because Next build ignores TypeScript errors.
4. Add local contract tests for triggers, permissions, pinning, commands, job dependencies, artifact upload on failure, and absence of Supabase-era steps.
5. Keep hosted activation outside this unit.

**Verification:** `bun test tests/vitest/ci-workflow-pinning.test.ts`; parse YAML; `bun run type-check`; `bun run validate:error-handling`. Expected: tests pass and every required job fails closed.

**Handoff:** workflow job/check names and duration estimates to `UNIT-002`; any provider ambiguity to `researcher`.

### `UNIT-002` — Bind merge and deploy provenance

**Goal:** make the verified SHA and artifact digest immutable across checks and deploy.

**Paths:** `.github/workflows/ci.yml`, deployment workflow selected from current Cloudflare commands, `scripts/check-cloudflare-release-gates.ts`, `tests/vitest/cloudflare-release-gates-script.test.ts`.

**Steps:** define a signed-by-context metadata artifact containing commit, run, lockfile hash, build digest, migration head, and producer version; make downstream deploy consume it; reject ref/SHA mismatch; add required-check and deployment-environment evidence slots.

**Verification:** targeted script tests for passed, failed, missing, cancelled, stale, and mismatched-SHA runs; `bun run cf:build` when source implementation begins. Expected: a deploy candidate cannot be produced from an unverified or rebuilt ref.

### `UNIT-003` — Build deterministic staging seed and cleanup

**Goal:** provision the minimum complete golden-path state without manual secrets or broad deletion.

**Paths:** new `scripts/e2e/` seed/cleanup modules following existing script conventions, `e2e/fixtures/`, focused Vitest/Bun tests, `wrangler.jsonc` read-only binding discovery.

**Steps:** create a run-scoped invited user/workspace, zero-state entry, project/estimate seed primitives, publication/recipient/password cases, and cleanup manifest; label demo data; hash or redact credentials; refuse non-staging host/binding; make setup/cleanup idempotent.

**Verification:** temp/local D1 contract tests, double setup/cleanup, foreign-workspace canary, failure cleanup. Expected: only run-owned rows/objects change and the report contains no raw credentials.

### `UNIT-004` — Implement the cross-domain golden path

**Goal:** prove the audit's 20 steps using user-visible outcomes and server-authoritative state.

**Paths:** new `e2e/beta-golden-path.spec.ts`, shared fixture helpers, `playwright.config.ts`, feature-owned page contracts/tests only when required.

**Steps:** encode each numbered audit step; assert persistence after reload; consume estimate-health and output-parity contracts; publish selected sheets; test password/session; comment and decide; return to Publisher and verify event/follow-up; tag merge/release/nightly projects; retain accessibility semantics for mobile review/share.

**Local verification in this ready unit:** contract/fixture tests and a Chromium
run against the explicit local test surface prove orchestration, stable selectors,
server-visible assertions, no default skip, and no arbitrary sleeps. **Hosted
execution:** the 20-step staging journey and WebKit mobile release case remain
`AC-004`/`AUTH-001` work executed only through `UNIT-007`; every hosted step must
identify its fixture and deploy SHA.

### `UNIT-005` — Retain evidence and run post-deploy smoke

**Goal:** preserve actionable failure artifacts and prove the deployed instance.

**Paths:** workflow artifact steps, Playwright reporters, `scripts/verify-cloudflare-hosted-routes.ts` or current hosted-route verifier, release evidence schema/tests.

**Steps:** upload trace/screenshot/test/console/network/build/seed reports with bounded retention; trigger authenticated smoke only after deployment; verify public and protected denial paths; record URL hash and marker SHA without secrets.

**Local verification in this ready unit:** intentional local/non-production
failure proves reporter bundle creation, redaction, bounded retention metadata,
and wrong-SHA/unauthenticated smoke rejection through fixtures. **Hosted
execution:** GitHub artifact readback and authenticated post-deploy smoke remain
`AC-005`/`AUTH-001` work executed only through `UNIT-007`.

### `UNIT-006` — Generate canonical release truth

**Goal:** replace manual readiness claims with one deterministic decision artifact.

**Paths:** new readiness-manifest producer under `scripts/`, matching `tests/vitest/` suite, `.ai/99_scratch/` output, `README.md` generated summary block, existing release/observability/support/legal/auth/recovery artifact readers.

**Steps:** define schema and producer version; collect commit, migration head, flags, active routes, CI/check evidence, test inventory, scan status, smoke, D1 recovery, operating gates, blockers, and freshness; reject mixed SHA/environment; emit JSON and Markdown; make `cf:release-gates` consume it; update README from the rendered summary only after hosted activation.

**Verification:** fixture matrix for green, missing, stale, malformed, mismatched SHA, unknown hosted permission, open P0/P1, and superseded proof. Expected: external Beta remains `NO-GO` until every required current artifact is green.

### `UNIT-007` — Activate hosted controls and prove one release

**Status:** blocked by `AUTH-001`, all domain completion, and existing-pack circle-back.

**Goal:** turn the repository-ready system into hosted enforcement for one exact candidate.

**Steps after boundary resolution:** apply the approved ruleset/environment/check
configuration; run the complete candidate workflow; execute the 20-step staging
golden path and release WebKit mobile scope; deploy only its artifact; collect
hosted checks, scans, artifact retention, authenticated smoke, recovery, and
operating evidence; regenerate manifest; perform rollback rehearsal; record
release/no-release decision.

**Verification:** `CLOUDFLARE_RELEASE_REQUIRE_PRODUCTION=1 bun run cf:release-gates` plus hosted GitHub evidence and exact-SHA marker. Expected: one release ID joins all evidence, or the unit records a fail-closed blocker.

## Cleanup

Remove temporary fixture data and proof-only objects by run ID. Preserve failed-run artifacts according to policy. Delete disabled workflow duplicates only after the active equivalents and hosted controls are proven. Do not remove archived plan/evidence history or unrelated concurrent changes.

## Resume Action

Begin `UNIT-001` with a current workflow-command inventory, then append a ledger entry before handing workflow names to `UNIT-002`.
