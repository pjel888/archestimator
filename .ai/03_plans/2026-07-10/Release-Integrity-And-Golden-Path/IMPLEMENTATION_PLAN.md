# Implementation Plan

## Execution Contract

Lead/integrator: `executor`. A distinct `test-engineer` owns fixture and browser
contract review, `researcher` confirms current official GitHub/Next/Cloudflare
constraints, and `verifier` judges final evidence. Only the integrator writes
shared workflow and release files. Every handoff names paths, commands, exit
codes, artifact digests, risks, and the exact next dependency.

This pack permits external actions only in the separately blocked units below.
The current improvement run is `PLAN_ONLY`: it changes no workflow, provider,
GitHub control, staging resource, production deployment, or real-recipient email.

## Ownership And Receipts

| Scope | Singleton owner | Receipt required before handoff |
| --- | --- | --- |
| `.github/workflows/**`, `tests/vitest/ci-workflow-pinning.test.ts` | CI lane | Workflow SHA, job/check names, action pins, permissions digest, targeted test receipt. |
| `scripts/e2e/**`, `e2e/fixtures/**` | Fixture lane | Schema/version, namespace guard, setup/cleanup digests, canary result, targeted test receipt. |
| `e2e/beta-golden-path.spec.ts`, `playwright.config.ts` | Browser lane | Twenty step IDs, project tags, selector-contract digest, local contract receipt. |
| Release evidence producer/reporter files under `scripts/` | Release-evidence lane | Producer version, schema digest, fixture matrix receipt. |
| Cross-pack inputs | Feature-pack owners | Package ID, manifest digest, source revision, accepted requirement IDs, unit status, evidence path/freshness, and named release-handoff digest. |
| Out-of-suite candidate inputs | Capability owner plus release-evidence lane | Current validated capability receipt when included, or `CANDIDATE-DEPENDENCY-DISPOSITION-v1` proving exact source/revision exclusion when not included. |
| `README.md` generated release facts | Integrator | Release-manifest digest; volatile facts are rendered, never manually asserted. |

Each unit waits only for a versioned receipt whose hash and status can be checked
after restart.

## DAG

```text
UNIT-001 Active CI source
  -> UNIT-002 Immutable candidate provenance
UNIT-003 Deterministic fixture contract
  -> UNIT-004 Twenty-step golden-path contract
UNIT-002 + UNIT-004
  -> UNIT-005 Evidence reporter and smoke verifier
UNIT-001 + UNIT-002 + UNIT-005 + all nine pack receipts + every candidate disposition
  -> UNIT-006 Release truth producer
UNIT-001..UNIT-006
  -> UNIT-007 Read-only hosted discovery and boundary packets
UNIT-001 + UNIT-007 + AUTH-001 -> UNIT-008 GitHub control mutation/readback
UNIT-004 + UNIT-007 + AUTH-002 -> UNIT-009 Isolated staging proof
UNIT-002 + UNIT-005 + UNIT-006 + UNIT-008 + UNIT-009 + AUTH-003
  -> UNIT-010 Production deploy, smoke, rollback, and decision
```

## Ready Slice

`SLICE-001 = UNIT-001, UNIT-002, UNIT-003, UNIT-004, UNIT-005, UNIT-006, UNIT-007`.
It is dependency-closed. `next_unit=UNIT-001`. Units 008 through 010 remain
blocked by distinct authorization boundaries and never make a local unit blocked.

### `UNIT-001` - Restore active, pinned CI source

**Goal:** create current workflow source without copying stale provider assumptions
or claiming that repository source is a hosted required check.

**Exact paths:** `.github/workflows-disabled/ci.yml` as evidence only;
`.github/workflows/ci.yml`; `.github/workflows/dependency-review.yml`;
`package.json`; `bun.lock`; `next.config.ts`;
`tests/vitest/ci-workflow-pinning.test.ts`.

**Steps:** inventory current scripts; use `bun install --frozen-lockfile`; pin every
third-party action to a full commit SHA; set least-privilege permissions and explicit
timeouts; keep PR jobs fork-safe; require independent typecheck; make aggregate
success fail on missing, skipped, neutral, cancelled, or `continue-on-error`
dependencies; configure `pull_request` and `push` only. Do not add `merge_group`
in this unit. `UNIT-007` records merge-queue state; if it proves
`merge_queue_enabled=true`, it returns a bounded trigger/test repair to
`UNIT-001` before `UNIT-008`. `false` or `UNKNOWN` never adds the trigger.

**Verification:**

```bash
bun test tests/vitest/ci-workflow-pinning.test.ts
bun run type-check
bun run validate:error-handling
```

Expected: YAML and contract tests pass; source remains only local evidence for
`AC-001`, never hosted proof for `AC-009`.
Evidence: `.ai/99_scratch/release-integrity/unit-001-ci-source.md` records the
workflow/source digests and command exits; it does not claim hosted enforcement.

### `UNIT-002` - Bind candidate provenance without rebuilding

**Goal:** make the verified SHA and artifact digest immutable from CI output to
an eventual version upload and deployment.

**Exact paths:** `.github/workflows/ci.yml`; `.github/workflows/release.yml`;
`scripts/lib/release-candidate-metadata.ts`;
`scripts/check-cloudflare-release-gates.ts`;
`tests/vitest/release-candidate-metadata.test.ts`;
`tests/vitest/cloudflare-release-gates-script.test.ts`.

**Steps:** emit a canonical metadata artifact with commit SHA, workflow/run IDs,
lock/tool versions, migration head, producer version, artifact ID, expiry, and a
sorted path/digest manifest for `worker.ts`, every transitively imported Worker
module and asset, `wrangler.jsonc`, `open-next.config.ts`, `.open-next`, and the
effective non-secret configuration/binding inputs. Record secret binding names
and provider version identifiers only; never record secret values or reversible
value hashes. Reject an omitted path, changed byte,
mutable ref, rebuild, missing dependency, stale artifact, or conflicting SHA/
environment. Change `cf:upload-version` from direct `wrangler versions upload` to
the installed `opennextjs-cloudflare upload` command so adapter cache population
and deployment mapping run against the existing build. Upload only from the exact
verified CI workspace, capture the returned Worker version ID, and reject
`bun run cf:deploy` because it rebuilds.

**Verification:** run both targeted test files with pass, failure, missing,
skipped, cancelled, stale, expired, rebuilt-ref, omitted-input, changed-module,
changed-config/binding, mutated-artifact, and mismatched-SHA fixtures. Inspect the
installed OpenNext upload path in a contract test and fail if cache population or
deployment mapping is bypassed. `bun run cf:build` is an implementation-time build
proof, not a plan check.

### `UNIT-003` - Build deterministic fixture and cleanup contracts

**Goal:** create the minimum complete golden-path state without manual secrets,
broad deletion, or an assumption that staging exists.

**Exact paths:** `scripts/e2e/beta-fixture.ts`;
`scripts/e2e/beta-fixture-contract.ts`; `e2e/fixtures/beta.ts`;
`tests/vitest/beta-golden-fixture.test.ts`; `wrangler.jsonc` read-only discovery.

**Steps:** create run-scoped invite, user, workspace, zero-state marker, project,
estimate, area, template/component, publication, password/session, recipient,
comment, decision, and activity identifiers; label every row/object with both run
ID and fixture owner; hash credentials in reports; refuse production hosts or
unapproved bindings; make setup and cleanup idempotent and resumable after partial
failure; delete only items present in the signed cleanup manifest.

**Verification:** temp/local D1 tests run setup twice and cleanup twice, inject a
mid-seed failure, preserve a foreign-workspace canary, and assert no raw token,
password, cookie, email, URL, or object key appears in the receipt.

### `UNIT-004` - Encode the complete golden path

**Goal:** implement one explicit orchestration contract in
`e2e/beta-golden-path.spec.ts`; shared helpers live in `e2e/fixtures/beta.ts` and
project/tag selection lives in `playwright.config.ts`.

| Step | Route or surface | Fixture/action | Server-authoritative assertion | Required receipt |
| ---: | --- | --- | --- | --- |
| 1 | `/invite/[token]` | Open the raw invite token through an ephemeral runner secret reference; never persist it. | Invite is consumed once and bound to `fixture.userId/workspaceId`. | Activation |
| 2 | `/login?next=/workshop/projects` | Authenticate `fixture.userId`. | Better Auth session resolves to the expected user. | Operating/auth |
| 3 | `/workshop` | Enter `fixture.workspaceId`. | Active profile and workspace authorization match the fixture. | Activation |
| 4 | `/workshop/projects` | Observe the run-scoped empty project set. | Authorized project query returns zero fixture projects. | Activation |
| 5 | `/workshop/projects` | Create `fixture.projectId`. | D1 project row belongs to the fixture workspace/user. | Activation |
| 6 | `/workshop/projects/[projectId]/estimates` | Open the generated estimate. | Default estimate and source/provenance rows exist. | Estimate intelligence |
| 7 | `/workshop/projects/[projectId]/estimates/[nodeId]` | Add `fixture.areaNodeId`. | Node read model contains the area after mutation. | Estimate intelligence |
| 8 | `/workshop/library/templates/[templateId]` | Insert `fixture.templateId/componentId`. | Created rows carry source/provenance facts. | Estimate intelligence |
| 9 | `/workshop/projects/[projectId]/estimates/[nodeId]` | Edit quantity and unit cost. | Canonical calculation inputs equal submitted decimal values. | Calculation parity |
| 10 | Same estimate route | Await explicit saved state. | Persisted revision advances and dirty state clears. | Calculation parity |
| 11 | Same estimate route after reload | Reload. | D1-backed read equals step 9 and revision from step 10. | Calculation parity |
| 12 | `/workshop/projects/[projectId]/data` | Open estimate health/data analytics. | Health payload references current estimate revision and expected finding IDs. | Estimate intelligence |
| 13 | `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | Request preview/download. | Export digest and totals equal the parity oracle; denial cases stay denied. | Calculation parity |
| 14 | `/workshop/publisher` | Publish `fixture.sheetIds`. | Publication snapshot references only selected sheets and current revision. | Publisher |
| 15 | `/share/[token]` | Open the raw publication token through an ephemeral runner secret reference; never persist it. | Public projection is publication-scoped and omits manager-only fields. | Publisher |
| 16 | `/api/share/[token]/password` and `/session` | Exercise enabled password/session path. | Wrong/expired/replayed credentials fail; valid session binds token and recipient. | Publisher |
| 17 | `/api/share/[token]/comment` | Submit fixture comment once, then retry. | One durable comment/event exists; retry is idempotent. | Publisher + Activity |
| 18 | `/api/share/[token]/decision` | Approve, request changes, or decline per fixture variant. | One durable decision/event has the expected actor, state, and revision. | Publisher + Activity |
| 19 | `/workshop/publisher` | Return as manager. | Manager-authorized roster reflects recipient state without exposing raw token data. | Publisher |
| 20 | `/workshop/projects/[projectId]/activity` | Open event and follow-up. | Append-only event, decision state, and follow-up linkage match steps 17-18. | Activity |

**Credential policy:** raw invite/publication tokens exist only in ephemeral
runner secret references used to construct route navigation. Fixture contracts,
logs, traces, screenshots, cleanup manifests, and receipts store only keyed
digests and stable fixture IDs; a digest is never used as a bearer token.

**Policy:** merge project is Chromium desktop; release projects add Chromium and
WebKit mobile public review; nightly projects add Firefox, WebKit/Safari coverage,
small/modern iPhone, iPad, and Android viewports. Each step uses stable semantic
selectors, reload persistence or repository/API evidence, and deterministic
server-visible waits. No arbitrary sleeps, test-order dependency, default skip,
or retry of product assertions is allowed.

**Local verification:** a focused contract test parses the 20 rows, fixture IDs,
routes, assertions, tags, and receipt dependencies. A local Chromium run becomes
required only when implementation changes browser-facing behavior; this plan-only
run intentionally uses static and validator proof.

### `UNIT-005` - Define retained evidence and smoke verification

**Exact paths:** `.github/workflows/ci.yml`; `.github/workflows/release.yml`;
`scripts/lib/release-evidence-bundle.ts`;
`scripts/verify-cloudflare-hosted-routes.ts`;
`tests/vitest/release-evidence-bundle.test.ts`;
`tests/vitest/cloudflare-hosted-route-script.test.ts`.

Define a bounded-retention bundle containing trace, screenshot, accessibility,
console/network summary, test report, build log, seed/cleanup report, candidate
metadata, source SHA, environment, URL hash, producer version, collection time,
and `expires_at`. Redact headers, cookies, tokens, addresses, object keys, and raw
URLs. Smoke verifier fixtures must reject unauthenticated, wrong-route,
wrong-environment, wrong-SHA, stale, partial, or malformed responses.

### `UNIT-006` - Generate canonical release truth

**Exact paths:** `scripts/generate-beta-release-readiness.ts`;
`scripts/lib/beta-release-readiness.ts`;
`tests/vitest/beta-release-readiness.test.ts`;
`scripts/check-cloudflare-release-gates.ts`;
`.ai/99_scratch/release-integrity/release-readiness.json` and `.md` outputs;
the generated readiness block in root `README.md`.

Define schema and producer version; collect exact candidate identity, migration
head, active routes, flags, test inventory, live-control status, smoke, D1 recovery
receipt, operating gates, all nine pack receipts, candidate inclusion/exclusion
dispositions, blockers, and freshness. When Corporate Accounts or another
out-of-suite capability is in the candidate, require its current validated
receipt; otherwise require a `CANDIDATE-DEPENDENCY-DISPOSITION-v1` that binds
the exact source revision, file scope, and exclusion rationale. Reject mixed
release IDs, SHA, environment, producer versions, stale proof, unknown required
controls, ambiguous candidate membership, open high-severity blockers, or a newer
manual README claim.

**Verification:** fixture matrix covers green, missing, malformed, stale, expired,
unknown permission, wrong producer, mixed SHA/environment/release ID, migration
drift, superseded receipt, included-without-receipt, exclusion-with-source-match,
open blocker, and contradictory Markdown. External Beta
stays `NO-GO` until all required current evidence is green.

### `UNIT-007` - Read-only hosted discovery and boundary packets

**Status:** `READY`; read-only and fail-closed. No mutation or deployment.

**Exact collector/test paths and symbols:**

- new `scripts/lib/release-hosted-discovery.ts` with
  `classifyHostedEndpointStatus`, `sanitizeGitHubDiscovery`, and
  `buildReleaseBoundaryPackets`;
- new `scripts/collect-release-hosted-discovery.ts`;
- new `tests/vitest/release-hosted-discovery.test.ts`;
- `scripts/check-cloudflare-worker-readiness.ts:checkCloudflareWorkerReadiness`;
- `scripts/run-observability-proof-drill.ts:buildObservabilityProofDrillReport,writeObservabilityProofDrillReport`;
- `scripts/check-cloudflare-release-gates.ts:buildCloudflareReleaseGateReport`.

**Exact outputs:**

- `.ai/99_scratch/release-integrity/hosted-discovery.json`;
- `.ai/99_scratch/release-integrity/hosted-discovery.md`;
- `.ai/99_scratch/release-integrity/github-control-packet.json`;
- `.ai/99_scratch/release-integrity/staging-proof-packet.json`;
- `.ai/99_scratch/release-integrity/production-release-packet.json`;
- `.ai/99_scratch/release-integrity/cloudflare-worker-readiness.json`;
- `.ai/99_scratch/release-integrity/observability-proof-drill.json`.

Capture repository/plan/visibility/default branch, current rulesets and bypasses,
required check contexts and source apps, merge queue, environments, workflow runs/
artifact expiry, CodeQL, Dependabot, secret scanning, Cloudflare deployments, and
whether a non-production surface exists. Use least-privilege paginated `gh api`
GET endpoints; every secret-scanning request sets `hide_secret=true`, and the
collector allowlists/redacts fields before stdout, logs, digesting, or persistence.
Use `bunx wrangler deployments list --name archestimator-proof`, `bun run
cf:check-readiness`, and `bun run ops:observability-drill`. Record sanitized
command identity, exit code, collection time, response digest, pagination
completeness, and endpoint status. Treat missing credentials, 401/403/404/503,
rate limits, partial pagination, unsupported plan features, and unavailable
endpoints as `UNKNOWN`.

Every endpoint row includes endpoint ID, sanitized command identity, exit/status,
collection time, response digest, pagination completeness, and
`OBSERVED|UNKNOWN`. Tests mock success, 401/403/404/503, rate limit, partial
pagination, unsupported features, `hide_secret=true`, and pre-persistence
redaction. A missing/partial endpoint cannot render clean.

Emit three separate redacted packet artifacts under
`.ai/99_scratch/release-integrity/`: `github-control-packet.json`,
`staging-proof-packet.json`, and `production-release-packet.json`. Each packet names
actor, resource, action, target, prerequisites, exact mutations/commands, expected
effect, cost posture, rollback, proof, expiry, and exclusions.

Run `bunx vitest run tests/vitest/release-hosted-discovery.test.ts
tests/vitest/ci-workflow-pinning.test.ts
tests/vitest/cloudflare-worker-readiness-script.test.ts`, then
`RELEASE_HOSTED_DISCOVERY_DIR=.ai/99_scratch/release-integrity bun run
scripts/collect-release-hosted-discovery.ts`. The collector runs the three exact
read-only provider commands above and emits only the named redacted outputs.

Merge-queue result: `merge_queue_enabled=true` returns a bounded
`.github/workflows/ci.yml` plus `ci-workflow-pinning.test.ts` repair to
`UNIT-001`, which must pass again before `UNIT-008`. `false` or `UNKNOWN` leaves
`merge_group` absent. `UNIT-007` never edits workflow source itself.

### `UNIT-008` - Apply and read back GitHub controls

**Status:** `BLOCKED` by `AUTH-001`, `UNIT-001`, and `UNIT-007`.

Apply only the approved ruleset, check, environment/secret, retention, and
scheduled-workflow mutations in `github-control-packet.json`. Before requiring a
check, prove the named context completed successfully in this repository within
the preceding seven days and bind its expected source app/integration; allowing
any source is an explicit security decision in the approved packet. Capture
before/after sanitized JSON digests and rerun paginated GET readback. `TEST-009`
fails unless the target branch, workflow SHA, named check contexts and source
bindings, bypass policy, environment, retention, and scanning status match the
approved packet; unknown never passes.

### `UNIT-009` - Run isolated staging golden proof

**Status:** `BLOCKED` by `AUTH-002`, `UNIT-004`, and `UNIT-007`.

Use only the approved staging resource/URL and run-scoped fixture. Run the
Chromium 20-step path and WebKit mobile public-review path with the exact candidate
SHA, then double-clean and verify the foreign canary. Record browser/project,
fixture ID, URL hash, deploy SHA, step results, accessibility findings, trace/report
digests, cleanup digest, and resource identity. Any production host, unknown
binding, non-owned row/object, partial cleanup, or stale receipt aborts before
mutation and leaves `AC-010` at `BOUNDARY`/fail-closed.

### `UNIT-010` - Deploy, smoke, rehearse rollback, and decide

**Status:** `BLOCKED` by `AUTH-003`, `UNIT-002`, `UNIT-005`, `UNIT-006`,
`UNIT-008`, and `UNIT-009`.

Verify every digest in the `UNIT-002` upload-input manifest in the exact CI
workspace; run the OpenNext-backed `bun run cf:upload-version` without rebuilding,
capture its returned Worker version ID, then deploy only that ID with the command
frozen in `production-release-packet.json`. Do not use `bun run cf:deploy`. Before
deployment, confirm the retained rollback target is among the provider-eligible
recent versions and that current bindings/resource and Durable Object migration
state permit rollback. Run authenticated and denial smokes, exact-SHA marker,
current observability/support/recovery checks, an eligibility-gated code rollback
rehearsal, and strict `CLOUDFLARE_RELEASE_REQUIRE_PRODUCTION=1 bun run
cf:release-gates`. Checkpoint the uploaded candidate version ID, initial candidate
deployment ID, retained rollback version ID, and rollback deployment ID. A Worker
rollback creates a new 100%-traffic deployment and does not revert D1, R2, KV,
Durable Object, or other data/schema state; use the separate recovery/fix-forward
reference for those failures. After the rollback proof, re-promote the exact
uploaded candidate version ID without rebuilding, capture the resulting deployment
ID, rerun the exact-SHA marker, authenticated and denial smokes, and strict release
gates, then read back that 100% of traffic is on the candidate. Any re-promotion,
readback, marker, smoke, or gate mismatch is `NO_GO`; record the actual final
deployed version and invoke the appropriate code or data/schema recovery path.
Regenerate release truth only after this final-state proof.

The final `UNIT-010` receipt includes the Program `BETA-P1-10` explicit `N/A`
decision for this proof-orchestration pack: scoped changed-file/caller scan,
justification that no product capability component changed, read-only `UNIT-007`
audit digest, changed files, exact tests, independent verifier result, and the
separate `UNIT-008` GitHub, `UNIT-009` staging, and `UNIT-010`
production-or-no-release receipt identities.

## Cleanup And Resume

Remove only run-owned fixture rows/objects listed by the cleanup manifest. Preserve
failed-run evidence for its declared retention period. Remove disabled workflow
copies only after active source and hosted enforcement are both proven. Never
delete archived plan/evidence history or unrelated concurrent changes.

Resume at the first non-passing unit whose dependencies have valid receipts. For
`SLICE-001`, begin `UNIT-001`; after each unit, append receipt digest, command/exit
code, changed decisions, cleanup state, blockers, and one exact next unit to the
ledger. Stop this plan-only run when validators and independent reviews are clean;
stop release execution only after `UNIT-010` produces a green release or a proven
fail-closed no-release decision.
