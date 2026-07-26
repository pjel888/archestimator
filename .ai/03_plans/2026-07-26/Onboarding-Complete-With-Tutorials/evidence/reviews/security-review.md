# Onboarding Q2 Security And Data-Boundary Review

**Verdict:** FAIL / REQUEST CHANGES  
**Profile:** `Q2_CRITICAL_CHANGE_GATE`  
**Reviewed at:** 2026-07-26T22:29:53.8757265+08:00  
**Review base:** `c3c0b5d21de906c1258578841c5c57c0b6149c51`  
**Reviewed HEAD:** `1c26b29edd969357c389c6432439dec82cb54389`  
**Scoped onboarding diff fingerprint:** `b0db11a50e6e7869484d64a38a03c696b3af5392`

The review fails because two HIGH-severity data-boundary findings remain. Passing focused, SQLite, type, lint, build, and Chromium evidence does not override those findings, and required changed-code coverage and mutation evidence are currently red.

## Findings

### [HIGH] A normal member can trigger writes in other users' personal starter scopes

**Files:**

- `src/lib/onboarding/activation-actions.ts:31`
- `src/lib/onboarding/starter-pack-actions.ts:1826`
- `src/lib/onboarding/starter-pack-actions.ts:1846`
- `src/lib/onboarding/starter-pack-actions.ts:1957`
- `src/lib/onboarding/starter-pack-actions.ts:2014`

`resumeCurrentStarterContent` is a client-callable server action. `resumeStarterContent` requires owner/admin only while the shared workspace state is not complete. Once it is complete, any user with a workspace-scoped actor, including a normal `member`, reaches `installStarterPack`. After the caller's user scope completes, `reconcileStarterUserBatch` replaces `context.userId` with each pending user's id and calls `installUserScope` or `cleanupStarterUserScope`. That creates, deletes, or rewrites claimed project-group rows and starter state in other users' personal namespaces without a manager/system authorization gate.

This is a broken object-level authorization boundary even though the affected rows are starter-owned: a member request may mutate data whose `user_id` belongs to another user. The existing negative test at `tests/vitest/starter-pack-actions.test.ts:444` covers only a non-manager against an uninstalled/nonempty workspace and does not cover a completed workspace or cross-user reconciliation.

**Required fix:** separate self-scope installation from cross-user reconciliation. A normal member may install or repair only their own claimed user scope. Gate batch reconciliation of other users behind an owner/admin check or a server-issued, non-exportable system-maintenance capability. A viewer must perform no starter writes. Add denial tests that invoke the public server actions as viewer/member against complete and partial shared states and assert that no other user's groups, memberships, claims, or revisions change.

### [HIGH] Starter restore CAS is not atomic with the recovery writes it is meant to fence

**File:** `src/lib/onboarding/starter-pack-actions.ts:2049`

`restoreStarterContent` reads the workspace revision and performs a standalone CAS update at lines 2049-2071. It then performs lifecycle reconciliation, optional membership-revision changes, asset-generation resolution, resource creation, claim insertion, and final status updates through later independent `run`/`batch` calls at lines 2073-2117 and through `installStarterPack`.

This does not implement `DEC-AUTO-004`, which requires the revision comparison in the same transaction that writes claims/state. There is no restore lease/token checked by every subsequent write. A second restore or other state-changing request can acquire the incremented revision while the first request is still running. Competing installers can choose the same next generation; after one wins the unique claim, the loser's catch path can set the shared state back to `partial`, leaving a completed resource graph reported as incomplete. The passing stale-revision test proves only a request whose revision is stale before acquisition; it does not exercise an interleave after acquisition.

**Required fix:** make the CAS and all recovery mutations one atomic D1 transaction/batch with fail-closed guards, or introduce a unique restore lease that every lifecycle, claim, resource, and final-state write must match. Prove two-request restore contention, a workspace-state interleave after acquisition, and the allowed membership-only interleave. Assert both resource/claim cardinality and final state/revision after the loser exits.

### [MEDIUM] The domain-completion boundary still treats a caller-provided boolean as proof

**Files:**

- `src/lib/onboarding/flow-repository.ts:1330`
- `src/lib/onboarding/estimate-practice.ts:439`

`completeOnboardingFlowFromDomainProof` accepts `proofSatisfied?: boolean` and considers `true` sufficient for the new first-estimate and guided-practice contracts. The current guided-practice caller first performs a persisted readback, but the completion repository neither repeats that predicate in its completion transaction nor requires an unforgeable server capability tied to that readback. The module therefore exposes a completion primitive whose claimed proof can be manufactured by any server-side caller.

The current call graph does not expose this primitive directly to the browser, so this is not rated HIGH. It nevertheless falls short of the plan's non-forgeable-domain-completion contract and makes future caller mistakes security-sensitive.

**Required fix:** move the authoritative domain predicate into the completion transaction, or pass a server-issued opaque capability that is minted only after the exact persisted predicate succeeds and is bound to user, workspace, flow, run, generation, tutorial binding, and revision. Remove the raw `proofSatisfied` contract. Add a negative test showing that matching strings plus `true` cannot complete without persisted proof.

### [MEDIUM] The isolated browser harness interpolates an unvalidated environment value into a shell command

**File:** `playwright.config.ts:6`

`PLAYWRIGHT_PORT` is copied into filesystem paths and interpolated into the `webServer.command` shell string at line 76. A malformed port supplied by a local/CI environment can alter the command rather than remaining a numeric argument. This affects developer/CI execution rather than production, but it weakens fixture isolation and can expose CI credentials or modify the host running the evidence command.

The dev-auth bypass itself is appropriately fail-closed for production (`src/lib/auth/dev-auth-gate.ts:13`), restricted to loopback hosts, and requires a 32-character credential. The problem is the new harness command composition, not the runtime auth gate.

**Required fix:** validate `PLAYWRIGHT_PORT` as an integer in the allowed TCP-port range before constructing any path or command. Prefer an argument-vector wrapper script for the migration/dev-server sequence; if Playwright must receive a string, interpolate only the normalized numeric value. Add a config test that rejects metacharacters and out-of-range ports.

## Security Checks That Passed Source Review

- Current onboarding server actions derive the actor from `requireCurrentUserContext`; shared add/restore operations explicitly require owner/admin.
- Workspace/project/estimate identifiers in reviewed production SQL are bound parameters. The few interpolated SQL fragments are closed internal enums/allowlists (`scopeClause`, placeholder counts, and the `resolveUniqueName` table union), not request strings.
- Starter V2 resource creation uses new UUIDs, versioned claims, stable asset keys, and active-resource classification. Active claimed resources are not overwritten during normal resume/restore.
- Starter and tutorial activation events are classified with server-issued WeakSet capabilities and remain distinct from `user_domain` completion evidence.
- Starter provenance contains public official-reference URLs, fictional/demo labels, regional/as-of fields, and tax treatment; no secret, token, private URL, or user PII was introduced. Component source URLs are sanitized on read before hyperlink rendering.
- `exportOnboardingPrivacyData`, access-loss cleanup, account deletion, legal-hold handling, and the 180-day event purge cover onboarding flow/state and user-scoped starter organization data. No new identifier was observed bypassing those paths.
- Dev-auth remains disabled when `NODE_ENV === "production"`, loopback-only, and credential-gated.

## Evidence Inspected

- Plan/spec: `00-PLAN.md`, especially `REQ-001`, `REQ-002`, `REQ-004`, `DEC-AUTO-001`, `DEC-AUTO-004`, `AC-001`, and `AC-004`.
- Current baseline-to-worktree onboarding diff and full current source context for flow actions/repository, estimate practice, guided sample actions, starter installer/manifest, activation classification/outbox, privacy retention/account deletion, dev-auth gate, Playwright config, and onboarding E2E fixtures.
- `artifacts/quality/onboarding-focused.json`: PASS, 262/262, 0 skipped/failed; SHA-256 `27d2597043aa53323dc93bb8b7f5578c69b0694c2caa27883d4df5053050deec`.
- `artifacts/quality/onboarding-sqlite.json`: PASS, 18/18, 0 skipped/failed; SHA-256 `ec262c51c1b9e94646e594ed85f682deae17e81aa5cb1af346c295457a3d3a95`.
- `artifacts/quality/onboarding-first-value-playwright.json`: PASS, 5 expected, 0 skipped/unexpected/flaky; SHA-256 `d2134ef5085c841a4832bac629da8dde9650ac6d79d61950c833c21ec13f40bc`.
- `artifacts/quality/onboarding-settings-playwright.json`: PASS, 3 expected, 0 skipped/unexpected/flaky; SHA-256 `3c108dca221e7487ad7cfb4c911d719707e24e3ee4cf1eee562e1d83bcc724a2`.
- `artifacts/quality/onboarding-typecheck.json`: PASS; SHA-256 `1d8ff5d47e62673af181d5428f61c16bb985ef79ddd1798e318e6cc0db8cf3f1`.
- `artifacts/quality/onboarding-lint-scoped.json`: PASS; SHA-256 `434206769323b1804132a54e3fd77439092827001ac90fbe28a431d53dc7a673`.
- `artifacts/quality/build.json`: PASS; SHA-256 `82b279712b20c8f5a420f377bcf89979f1fc28a9197442da5aa04d9d36bc1ee0`.
- `artifacts/quality/diff-coverage.json`: FAIL because the comparison base and canonical global baseline were unavailable; SHA-256 `19da4935baf23ec0d8c1e27089a68ad95833d5009e1e472a5086f32ec2cb19f4`.
- `artifacts/quality/mutation.json`: FAIL because Stryker initialization failed and no mutation report was produced; SHA-256 `552ae13527f7addf181d7b9c7b98c5056e29e3ba6c406bddd84d1b98b2841d2f`.
- GitNexus `detect_changes(compare=c3c0b5d...)` enumerated 157 changed files/131 symbols but reported no affected processes. The index is 24 commits stale and has no PDG/taint layer, so its LOW risk and zero-taint output were not accepted as proof.

No heavy commands or new tests were run by this read-only reviewer.

## Evidence Gaps And Residual Risk

- No adversarial test currently proves viewer/member denial across completed starter state and cross-user reconciliation.
- No concurrent two-request restore test proves the required atomic workspace CAS behavior.
- Domain completion is tested through trusted current callers, not against a forged `proofSatisfied` invocation at the repository boundary.
- Browser evidence is Chromium-only. The plan's critical cross-browser/device matrix is not present.
- The current E2E worktree adds fixed sleeps (`e2e/onboarding-first-value.spec.ts:364` and `e2e/onboarding-first-value.spec.ts:490`) around fixture teardown/navigation. These are not security proof and should be replaced with an authoritative readiness/cleanup predicate; passing after a fixed delay does not establish a race-free data boundary.
- Changed-code coverage and mutation remain FAIL, so the aggregate Q2 gate must remain FAIL independently of this review.

## Stop Condition

Re-review after both HIGH findings are fixed and denial/concurrency evidence passes without fixed-delay or retry-based masking. PASS additionally requires the Q2 evidence owner to resolve the coverage, mutation, cross-browser, and stale-graph gaps.
