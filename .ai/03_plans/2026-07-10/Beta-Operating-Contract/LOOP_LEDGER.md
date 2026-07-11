# Loop Ledger

Append-only record for `PLAN-2026-07-10-beta-operating-contract`.

## Run `RUN-2026-07-10-BOC-PLAN-001`

- Timestamp: `2026-07-10T11:33:39.000Z`
- Scope: `PLAN_ONLY`
- Baseline: commit `081a0757a`, dirty shared worktree, unrelated edits preserved.
- Goal: produce a locally executable operating-contract slice while isolating production actions and human approvals.

### DISCOVER

- Strong observability/incident/support/auth/legal primitives exist, but hosted evidence and owners remain separate gates.
- Global Cloudflare analytics bypasses the consent-aware landing loader.
- Admin Overview still contains fabricated placeholders despite real supporting repositories elsewhere.
- Raw D1 session-token, recovery, and broader-launch counsel risks remain explicit.

### PLAN

- Correct privacy and operator truth first.
- Use D1 application events as core Beta metrics and provider analytics only as supplements.
- Separate local, hosted, and human proof in one versioned operating artifact.

### EXECUTE

- Authored plan artifacts only; no application, analytics, provider, user, support, incident, auth, or legal state changed.

### VERIFY

- Pending final hashes, pack validator, diff check, and distinct adversarial review.
- Production and human gates intentionally remain boundaries.

### RECORD

- Ready slice: `UNIT-001` through `UNIT-006`.
- Blocked unit: `UNIT-007` under `AUTH-001` and `AUTH-002`.

### DECIDE

- Next action: finalize/validate pack, then begin future implementation with the no-global-analytics regression in `UNIT-001`.
- Planning stop: valid traceable pack, closed design decisions, exact boundaries, no external actions.

## Resume Template

Append timestamp, scope, baseline/status hashes, completed/next units, changed decisions, commands/results, local/hosted/human evidence and freshness, owner/authorization state, cleanup, and one exact next action. Never rewrite prior runs.

## 2026-07-10T12:34:46Z - PLAN CLOSEOUT reviewed

- The pack validator, semantic ID scan, risk/manifest parity, cross-reference
  closure, and whitespace checks passed before this append.
- Distinct checker review confirmed primary P1-07 operator-presentation/metric-
  truth ownership with Activation only as the privacy-safe data producer; no
  unresolved P0/P1 remains.
- This entry invalidates the prior artifact/self hash. The lead must refresh
  hashes and rerun the validator after this append; any failure requires a later
  corrective entry.
- No analytics, admin, provider, support, incident, auth, legal, or release
  action occurred. Resume local implementation at `UNIT-001`; hosted/human
  boundaries remain active.

## 2026-07-10 - IMPROVE-B semantic repair receipt

- Corrected intended reach to `EXTERNAL_ACTIONS`; observed scope remains
  `PLAN_ONLY`, package remains `CONDITIONALLY_READY`, implementation remains
  `NOT_STARTED`, and release remains `BOUNDARY`.
- Split local `AC-001..007` (`FAIL`) from hosted `AC-008` (`BOUNDARY`,
  `AUTH-001`) and human `AC-009/010` (`BOUNDARY`, `AUTH-002`). No autonomous
  technical work is hidden behind an authorization status.
- Froze the sev1/sev2/sev3 acknowledgment, escalation, containment,
  communication, channel/failover, template, support acknowledgment, and
  24/72-hour review policy.
- Operating now consumes `D1-RECOVERY-RECEIPT-v1` from Recovery `UNIT-006` and
  explicitly prohibits restore/import/resource creation. It emits reciprocal
  `ACT-RECEIPT-COHORT-CONSUMER-v1` for program `UNIT-003`.
- Planning artifacts only changed. No analytics, provider, support, incident,
  auth, recovery, legal, or release action occurred. Artifact and self hashes are
  intentionally stale until the lead performs the final package freeze.

## 2026-07-10 - Boundary and maintainability supersession receipt

- This append-only entry supersedes the earlier statement that `UNIT-007` is
  blocked by both authorization boundaries. `SLICE-001` remains `UNIT-001`
  through `UNIT-006`; `UNIT-007` now owns hosted proof behind `AUTH-001`,
  `UNIT-008` owns auth residual-risk acceptance behind `AUTH-002` after hosted
  proof, and `UNIT-009` owns the limited-cohort/legal decision behind `AUTH-003`
  independently of hosted proof.
- `GATE-003` now covers only `AC-009` auth-risk acceptance. New `GATE-004`
  covers only `AC-010` limited-cohort/legal scope. Each external unit emits a
  distinct immutable receipt for release-side composition; none mutates a
  hidden combined operating record.
- `UNIT-005` has no dependency on the incident or auth lane. The README and DAG
  now match the manifest: `UNIT-003`, `UNIT-004`, and `UNIT-005` are parallel
  local inputs to `UNIT-006`.
- `UNIT-006` now requires `BETA-P1-10-MAINTAINABILITY-RECEIPT-v1` with caller
  map, characterization, extraction/retention decision, changed files,
  regression owner, exact tests, and verifier result.
- Scope remains `PLAN_ONLY`; no analytics, provider, support, incident, auth,
  recovery, legal, release, or production action occurred. Artifact, evidence,
  and manifest hashes remain intentionally stale for the lead's final freeze.

## 2026-07-10 - Adaptive high-blast artifact expansion

- Applied the prompt-suite adaptive schema: retained `README.md` as execution
  entrypoint, `plan-pack.json` as machine authority, `IMPLEMENTATION_PLAN.md` as
  the sole canonical execution artifact, and this ledger as append-only state.
- Added independently reviewable contracts for telemetry/consent, operator UX
  and accessibility, incident/support/escalation, session threats and residual
  risk, legal/cohort authorization, adversarial QA, and rollout/rollback/
  operations. Existing stable `REQ/AC/TEST/GATE/UNIT/DEC/AUTH/RISK` records were
  not renumbered or promoted.
- Reclassified `GATE-AGENT-01` as `N/A`: ordinary integrator/operator/verifier
  roles do not change agent-framework behavior, and the Program pack owns
  cross-pack orchestration.
- Re-audited relevant sources at
  `e373bc865b978e237deb1d92011c96b0a3639fb4` with no relevant drift from the
  recorded source baseline. This is provenance normalization, not runtime proof.
- Scope remained `PLAN_ONLY`; no application, test, migration, provider, auth,
  legal, support, incident, release, or production action occurred. New
  artifact hashes, changed artifact/evidence hashes, scoped baseline hashes, and
  manifest self-hash remain intentionally stale for the lead's final freeze.

## 2026-07-10 - Source and incident-policy authority supersession

- Re-read concurrent admin API-gate, landing auth-hint, and 0050 admin-index
  changes. They do not implement operating metrics, consent governance,
  incident/support coverage, or hosted proof; they do change the scoped dirty
  source fingerprint and invalidate the earlier no-drift wording.
- `POLICY-BETA-INCIDENT-v1-proposed` is executable planning input, not owner
  policy. The exact matrix becomes binding only through current `AUTH-003`
  owner confirmation and may be used by hosted `AUTH-001` proof only by digest.
- Scope remained `PLAN_ONLY`; no concurrent application source or migration was
  modified and no human/provider/external action occurred.

## 2026-07-10 - Admin red-fixture and policy-producer repair

- Re-read the concurrent Admin repository and focused tests. The searched user
  query currently binds parameters out of SQL placeholder order and its mock
  encodes the old order; the flag-action test also omits the new
  `previousEnabled` audit field. `UNIT-002` and `TEST-003` now own explicit red
  characterization and regression repair. No product or test source was edited.
- `UNIT-009` now consumes Unit 003 plus Unit 005 and emits the sole immutable
  owner-confirmed incident-policy/cohort/legal receipt. It binds the policy
  digest and support primary/backup/window that hosted `UNIT-007` consumes,
  closing the prior producer gap without coupling the human decision to hosted
  proof.
- The source scope now includes Admin/support components and repositories,
  observability/support routers, authz/config surfaces, staged changes, and
  untracked file contents through `PLAN-PACK-SCOPED-BASELINE-v1`.
- Scope remained `PLAN_ONLY`; hashes remain stale until the final package freeze.

## 2026-07-10 - Scoped source-baseline freeze

- Froze `PLAN-PACK-SCOPED-BASELINE-v1` at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4` using the ordered literal pathspec
  set in `SOURCE_AND_CODEBASE_AUDIT.md`.
- Scoped status SHA-256:
  `82c7d45d68f74460530590d83357a3fe264339ad9a26d8cd9cdfe59dcc2f9d63`.
  Scoped diff SHA-256:
  `d86e99f1e1510d0c117baa85f8cdc0cb15f0eafff5fe6e551a9323023333a139`.
- These fingerprints bind relevant tracked changes and untracked file contents.
  No product, migration, provider, browser, GitHub, or production action occurred.

## 2026-07-10 - Scoped source-baseline supersession

- Concurrent Admin/landing work changed after the preceding read. The final
  scoped diff SHA-256 is
  `5e8e782b5fbd68abf7da7ab43253d43560c81ce6335cd3457e4964159dfea8f4`;
  it supersedes only the preceding diff fingerprint. HEAD and status digest are
  unchanged. No concurrent file was edited by this plan freeze.

## 2026-07-10 - Final concurrent-source supersession

- A later settled Admin/auth read supersedes the preceding scoped diff with
  SHA-256
  `49b7dccde0ede54f3dadd9835900697c9e5786bf06380ad65dbc58a41aed7e25`.
  Three consecutive reads matched; HEAD and status digest remain unchanged.

## 2026-07-10 - Support-retry source re-audit

- Re-read the concurrent `sendSupportReply` failed-message retry. It adds a
  recovery path but no durable single-flight claim; concurrent same-key calls
  can both send, and post-email sent-state persistence failure/null can return
  success with the old `send_failed` row and permit a later resend.
- Extended `SRC-004`, `AC-004`, `RISK-003`, `UNIT-003`, and `TEST-004` to require
  red characterization, one winning retry attempt, explicit uncertain delivery,
  persisted provider identity, and reconciliation before resend.
- Scope remained `PLAN_ONLY`; no support action, repository, test, email,
  provider, migration, or production state was modified.

## 2026-07-10 - Proposed-policy and live-status authority repair

- Reworded secondary artifact-map and test/rollout references so the incident
  matrix is an executable proposed fixture/default until `AUTH-003` binds an
  owner-confirmed digest; no plan-authored SLA value is represented as current
  owner policy.
- Reaffirmed `plan-pack.json` as the sole live status authority. Markdown
  requirements and verification artifacts remain human-readable planning
  baselines, indexes, and completion-audit surfaces only.
- Scope remained `PLAN_ONLY`; no policy approval, support action, source,
  migration, provider, browser, GitHub, or production state was changed.

## 2026-07-10 - Final support/admin source-baseline supersession

- Three consecutive scoped reads matched after the support-retry re-audit and
  later concurrent Admin changes. The final `PLAN-PACK-SCOPED-BASELINE-v1`
  diff SHA-256 is
  `f75b4a8b9b344a417098c50023cc47c3d428326a80f7d4f5ce16411054187c3b`;
  it supersedes the preceding `49b7dccd...` fingerprint.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`; scoped status SHA-256
  remains `82c7d45d68f74460530590d83357a3fe264339ad9a26d8cd9cdfe59dcc2f9d63`.
  No concurrent source file was edited by this plan freeze.

## 2026-07-10 - Account-status migration source re-audit

- Re-audit observed `migrations/0051_profiles_account_status.sql` as the new
  concurrent workspace tail. It adds account-status schema/index input relevant
  to Admin operations, so the pack baseline and source ledger must bind it.
- The migration does not replace the Overview placeholders, define beta metrics,
  resolve consent or support delivery semantics, close incident handling, or
  supply hosted proof. Operating readiness and implementation state are
  unchanged.
- No concurrent source or migration was edited by this planning re-audit.

## 2026-07-10 - Account-status scoped baseline freeze

- Three consecutive exact-scope reads matched after the 0051 source re-audit.
  Final scoped status SHA-256 is
  `af1503cca2d7824f8f380bde0c4bcdee11393e077f8a8a4f6d27f3aab79821b0`;
  final scoped diff SHA-256 is
  `5f34586515019f3cf6021a2815881a8c442ec009dc297ffc790500ebabbf863a`.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`. These fingerprints
  supersede prior scoped hashes; readiness remains conditional and work remains
  not started.

## 2026-07-10 - Final concurrent Operating baseline supersession

- A concurrent source edit changed the Operating scoped diff after the prior
  freeze. Three later exact-scope reads matched at diff SHA-256
  `807bc0c0a3d3142104e2f4ea2e281a294267b3bc0b96cb5f94177e5569765d06`,
  which supersedes only the preceding `5f345865...` fingerprint.
- HEAD and scoped status SHA-256 remain
  `e373bc865b978e237deb1d92011c96b0a3639fb4` and
  `af1503cca2d7824f8f380bde0c4bcdee11393e077f8a8a4f6d27f3aab79821b0`.
  No concurrent source file was edited by this planning freeze.

## 2026-07-11T01:00:15+08:00 - Independent-review semantic repair

- Replaced directory-level implementation prose with exact Admin, support,
  observability, auth/session, legal, readiness, and test paths.
- Made account-status enforcement plus session revocation explicit and retained
  Beta Operating as sole producer of the auth-risk and limited-cohort legal
  decision receipts. Prior manifest and scope hashes are stale until refreeze.

## 2026-07-11T01:03:00+08:00 - Post-review scoped baseline freeze

- Three consecutive exact recorded-scope reads matched at status SHA-256
  `e3f180dd65d37a7b52730b76db60b0434fbf8229ae9074aed27b4f56618454bf`
  and diff SHA-256
  `0810e2c743959f0d64e97148c308a196e02d950d032feeb6081a0014d129abbc`.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`; no concurrent source was
  edited by this planning freeze and readiness remains conditional.

## 2026-07-10T17:13:00.000Z - Concurrent Admin source supersession

- A concurrent workspace writer added/changed Admin notification and user-action
  source after the preceding freeze. Three later exact scope reads matched at
  status SHA-256
  `55a7a56dbc710e733e5f696936e034296b8824349785c795cdea9505be2cfe3f`
  and diff SHA-256
  `15bb9d310e3e02e9a500b7c19f6d7aa5d13f18dfdf024f4d6dc0af02c19a7e6a`.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`. The plan records but does
  not edit the concurrent source; readiness remains conditional.

## 2026-07-10T17:33:08.000Z - Final concurrent-source baseline observation

- Four reads over 17 seconds matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `54b3bd9887819410fd352c2f938c5460c9390763977b3c764530d322df5f2c07`,
  and scoped diff SHA-256
  `fa51dfbd8e88193a7b3ba27963db037757eb0c11011d635b6fbd6a283fcb2d8f`.
- This actual UTC observation includes the settled concurrent Admin additions
  and supersedes every earlier provisional/future-dated freeze. The plan did not
  edit that source; readiness remains conditional.

## 2026-07-10T17:57:09.000Z - Settled Admin-source baseline supersession

- Four exact-scope reads from `2026-07-10T17:55:36Z` through
  `2026-07-10T17:55:56Z` matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `7c6be171bfba7c3187e98d6fdd9f0c7cd30db62102811980c404f424564f5855`,
  and scoped diff SHA-256
  `c4f52a6c3e9b9661437765da6ee5f22a80cca6ef3dcba2ee61eee572febb21ae`.
- This actual UTC observation includes the settled concurrent Admin additions
  and supersedes prior Operating fingerprints. No concurrent source was edited;
  readiness remains `CONDITIONALLY_READY/NOT_STARTED`.

## 2026-07-10T18:56:04.000Z - Corporate-role boundary characterization

- The concurrent corporate-account source is an input to `UNIT-002`, not an
  Operating-owned CRUD surface. Corporate roles and workspace links are now
  explicitly insufficient for platform-admin or cross-workspace operator access.
- `AC-003` / `TEST-003` require that separation without taking ownership of
  `/admin/accounts` or its repository/actions. No application source, test,
  migration, provider, browser, or external control was changed here.

## 2026-07-10T18:57:45.000Z - Generation-4 settled-scope baseline observation

- Three exact-scope reads from `2026-07-10T18:57:29Z` through
  `2026-07-10T18:57:45Z` matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `d306f1e64f3713a43c2b566bf447dac5167080491c6d945d67d30dc15de9be7a`,
  and scoped diff SHA-256
  `5137405948339fd8f213485f7375ebe8770fee763b8492dc527ad72988fd07fb`.
- Corporate source remains a concurrent, unverified input. Readiness stays
  `CONDITIONALLY_READY/NOT_STARTED`.

## 2026-07-11T02:00:00Z - Improve-stage scoped-baseline refresh

- The frozen baseline HEAD had drifted from
  `e373bc865b978e237deb1d92011c96b0a3639fb4` to
  `6069d87c271dc1509e97d1155da4d62c78d771cd` after concurrent commits landed
  admin/auth/corporate-account, estimate-performance, and planning-doc changes.
  This invalidated the prior scoped status/diff fingerprints without changing
  readiness.
- Re-verified all `SRC-001..007` claims against current source: the global
  analytics-injection defect, Admin Overview placeholder/chart mismatch,
  `listAdminUsers` searched bind order bug, `setUserAccountStatus` missing
  row check, `sendSupportReply` retry non-idempotency, corporate-role
  non-authz, and Better Auth 1.6.23 sign-out/session revocation paths remain
  CURRENT. `migrations/0053_corporate_account_owner_integrity.sql` is the new
  migration tail and was added to `SRC-007`; it adds ownership database
  invariants only, with no operating/authz/legal effect.
- Three consecutive exact-scope reads matched at HEAD
  `6069d87c271dc1509e97d1155da4d62c78d771cd`, scoped status SHA-256
  `5895fa6927f75f9da9e75a7fea67dc2737e21ab665489b90e18d6713d3cec171`, and
  scoped diff SHA-256
  `ca7a952abea60fb5935f023353eada6846bf02053c508ae04a39092235c3c193`.
  These supersede all prior Operating fingerprints. A later settled observation
  (concurrent `scripts/` and `tests/vitest` additions) superseded that provisional
  freeze: the final three-read settled scoped status SHA-256 is
  `f88293a6c2ee394adab8fad0617dd01c69dbb79cd8b70e70900ca8af6f919dbd` and scoped
  diff SHA-256 is
  `75f966a844b766b917500bf47fa26fad8d076de5800922f6412e103fee488c09`; HEAD is
  unchanged.
- Updated the manifest baseline block, evidence `source_revision` references,
  `SRC-007`, and the baseline/freshness prose. Scope remained `PLAN_ONLY`; no
  application, test, migration, provider, auth, legal, support, incident, or
  production state was changed. Artifact, evidence, and manifest self-hashes
  remain stale until the final `validate:plan-pack --write` freeze.

## 2026-07-11T02:30:00Z - Improve-stage adversarial review and semantic repair

- Ran an independent read-only adversarial pass across receipt-composition
  authority, auth enforcement, cross-pack activation contracts, recovery-receipt
  code presence, test-path existence, and stale-trigger completeness.
- Corrected a factual error in `SRC-003` and Current Reality #6: the audit
  claimed session resolution "does not enforce `profiles.account_status`", but
  `session.ts:80-86` enforces it for the current request (banned/suspended
  redirect). The real remaining gaps — no session-row revocation on suspend/ban
  and no edge-middleware account-status check — are now stated precisely.
- Refined `UNIT-004` to distinguish the already-complete server-component
  enforcement from the remaining edge-enforcement and atomic session-revocation
  work.
- Added two missing stale triggers: `better-auth-dependency-version-change` and
  `account-status-or-corporate-account-migration-change`.
- Reviewed receipt-composition (Dim 1), activation contracts (Dim 3),
  `D1-RECOVERY-RECEIPT-v1` (Dim 4), and test-path "new" labels (Dim 5):
  these are correctly framed as forward-looking REQ-007/AC-007 acceptance
  boundaries at `FAIL`, as cross-pack planned contracts explicitly tagged
  future-only, and as correctly new-labeled test paths. No repair needed.
- Scope remained `PLAN_ONLY`; no application, test, migration, provider, auth,
  legal, support, incident, or production state was changed. Artifact, evidence,
  and manifest self-hashes remain stale until the final freeze.
