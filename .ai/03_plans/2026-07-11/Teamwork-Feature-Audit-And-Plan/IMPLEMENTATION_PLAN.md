# Canonical Implementation Plan

This is the sole canonical execution artifact for `PLAN-2026-07-11-teamwork-feature-audit-and-plan`.

## Execution Contract

- Recompute the recorded scoped baseline before starting. Drift requires a targeted re-audit and ledger entry.
- Stay on the current branch/worktree. Coordinate shared paths with fresh `git status --short --branch` and explicit ownership.
- Use `DISCOVER -> PLAN -> EXECUTE -> VERIFY -> RECORD -> DECIDE` for every unit.
- The lead owns integration and `plan-pack.json`; unit owners edit only their allocated paths.
- Maker/checker separation is required for authorization, migration, realtime, hosted proof, and final integration.
- Read current Next.js 16 docs in `node_modules/next/dist/docs/` before changing server actions, route handlers, caching, or request/origin behavior.
- Use current official Cloudflare docs before relying on D1 transaction/batch or Durable Object WebSocket behavior.
- Never use historical Supabase migrations as active implementation.
- Stop on unexplained authorization parity, source drift, missing transaction semantics, sensitive evidence leakage, or cross-pack hash mismatch.

## Ready Slice

`SLICE-001` contains `UNIT-001` through `UNIT-008` and `UNIT-010` through `UNIT-013`; it is dependency-closed, and `UNIT-001` is next. `UNIT-009` is blocked on an owner-refreshed Activity manifest, `UNIT-014` is blocked on an owner-refreshed Publisher manifest, and `UNIT-015` is blocked downstream of both. `UNIT-016` through `UNIT-019` are also outside the ready slice and blocked by `AUTH-001` plus their unresolved dependencies.

## Dependency DAG

```text
UNIT-001 baseline/tests/conflict contract
  -> UNIT-002 canonical access policy
      -> UNIT-003 D1 invariants/migration
      -> UNIT-004 repository isolation/conflict adapter
          -> UNIT-005 invitation/membership commands
              -> UNIT-006 scoped Teamwork DTO
                  -> UNIT-007 project access UI
                  -> UNIT-008 estimate access UI
              -> UNIT-009 Activity producer contract [blocked: Activity manifest]
      -> UNIT-010 realtime server protocol
          -> UNIT-011 realtime client/presence
              -> UNIT-012 supported cursor UX
                  -> UNIT-013 performance/ops/cost gates
UNIT-006 + UNIT-007 + UNIT-008 -> UNIT-014 Publisher compatibility [blocked: Publisher manifest]
UNIT-007 + UNIT-008 + UNIT-009 + UNIT-012 + UNIT-013 + UNIT-014 -> UNIT-015 local integration QA [blocked: 009 + 014]
UNIT-013 + UNIT-015 -> UNIT-016 hosted deployment authorization/version preparation [AUTH-001]
UNIT-005 + UNIT-009 + UNIT-015 + UNIT-016 -> UNIT-017 hosted D1 invitation proof
UNIT-010 + UNIT-011 + UNIT-012 + UNIT-013 + UNIT-015 + UNIT-016 -> UNIT-018 hosted DO/browser proof
UNIT-014 + UNIT-015 + UNIT-017 + UNIT-018 -> UNIT-019 final integration/readiness
```

## Unit Summary

| Unit | Owner | Checker | Depends on | Result / initial status |
| --- | --- | --- | --- | --- |
| `UNIT-001` | test-engineer | authorization executor | none | known-red tests + D1 conflict contract / `READY` |
| `UNIT-002` | architect/executor | authorization verifier | 001 | canonical policy/capability resolver / `READY` |
| `UNIT-003` | data executor | migration verifier | 001, 002 | active D1 migration and atomic invariants / `READY` |
| `UNIT-004` | repository executor | security verifier | 002 | scoped repositories + stable conflict recovery / `READY` |
| `UNIT-005` | collaboration executor | security checker | 002, 003, 004 | invitation/member command-v2 lifecycle / `READY` |
| `UNIT-006` | repository executor | privacy checker | 002, 004, 005 | scoped Teamwork summary DTO/capabilities / `READY` |
| `UNIT-007` | UI executor | designer/accessibility checker | 005, 006 | project member/invite management UI / `READY` |
| `UNIT-008` | UI executor | designer/accessibility checker | 005, 006 | estimate inheritance/direct-access UI / `READY` |
| `UNIT-009` | Teamwork event executor | Activity consumer | 003, 005 | immutable facts + Activity receipt / `BLOCKED: Activity manifest` |
| `UNIT-010` | realtime executor | security checker | 001, 002 | DO protocol-v2 and revocation enforcement / `READY` |
| `UNIT-011` | client executor | realtime verifier | 006, 010 | authorized client/refresh/presence / `READY` |
| `UNIT-012` | UI executor | designer/accessibility checker | 008, 011 | trusted accessible estimate cursors / `READY` |
| `UNIT-013` | performance/ops executor | verifier | 003, 004, 010, 011, 012 | budgets, telemetry, flags, cost / `READY` |
| `UNIT-014` | Teamwork integration executor | Publisher consumer | 006, 007, 008 | Publisher compatibility receipt / `BLOCKED: Publisher manifest` |
| `UNIT-015` | test-engineer | independent verifier | 007, 008, 009, 012, 013, 014 | local integration/adversarial QA + hosted dry-run packet / `BLOCKED: 009 + 014` |
| `UNIT-016` | release executor | owner + release verifier | 013, 015 | source-matched version/deployment receipt / `BLOCKED: AUTH-001` |
| `UNIT-017` | hosted D1 executor | independent verifier | 005, 009, 015, 016 | hosted D1 invitation receipt / `BLOCKED: AUTH-001` |
| `UNIT-018` | hosted realtime executor | independent security/browser verifier | 010, 011, 012, 013, 015, 016 | hosted DO/two-client receipt / `BLOCKED: AUTH-001` |
| `UNIT-019` | lead integrator | independent verifier | 014, 015, 017, 018 | final integration/status/docs / `BLOCKED: AUTH-001` |

## `UNIT-001` - Reconcile Baseline and Lock Contracts

**Write scope:** focused collaboration/authz/realtime/conflict tests; minimal conflict normalization source only if required by the red test.
**Requirements:** `REQ-001`, `REQ-002`.
**Invariants:** distinguish fixture drift from product defects; no behavior edit is hidden in a test rewrite; current D1 error is exercised.

Steps:

1. Recompute baseline and inventory current callers/imports.
2. Run the exact known-red suite and record failures.
3. Replace source-string role assertions with semantic role/capability tests.
4. Repair/replace fake D1 batched-query support and encode the chosen sheet-only shell policy.
5. Reproduce the literal D1 revision conflict and require stable error code/copy/refetch/telemetry expectations.
6. Run nearby repository/authz/realtime tests.

Verification: focused Vitest command, `git diff --check`, independent test review.
Failure response: revert only this unit's new test changes or split an uncovered product defect into the owning downstream unit; never mark a failing product behavior as fixture drift without a real-path reproduction.
Resume state: exact command, pass/fail list, changed paths, policy fixture version, and baseline in `TEAMWORK-BASELINE-v1`.

## `UNIT-002` - Canonical Effective Access Policy

**Write scope:** `src/lib/auth/roles.ts`, `src/lib/authz/`, new bounded Teamwork policy helpers, direct policy tests.
**Requirements:** `REQ-001`, `REQ-002`, `SEC-001`, `DATA-003`.
**Invariants:** deny by default; restriction disables inheritance; direct grant never demotes inherited authority; target dominance; project room requires whole-project authority.

Steps:

1. Run fresh caller/import and proportional impact analysis.
2. Define actions, effective grant/source, stable decision reasons, assignable roles, target checks, and scoped authorized IDs.
3. Preserve compatibility adapters for existing predicates while migrating callers in later units.
4. Add exhaustive matrix/property tests and SQL/batched-query parity fixtures.

Verification: policy tests, typecheck for touched modules, caller inventory diff.
Failure response: keep adapters and stop migration if any caller's changed behavior lacks an explicit matrix decision.
Resume state: policy schema/version, unmigrated callers, parity results.

## `UNIT-003` - Active D1 Invariants and Migration

**Write scope:** next active `migrations/` file allocated at execution, D1 collaboration data helpers/tests, migration receipt.
**Requirements:** `REQ-005`, `SEC-002`, `DATA-001`, `DATA-002`.
**Invariants:** unique active pending invite, profile-backed membership, workspace/project/restricted-sheet manager floors, atomic restrict/role/remove/accept/revoke.

Steps:

1. Re-list active migrations and create `TEAMWORK-MIGRATION-v1` allocation receipt.
2. Verify current D1 transaction/batch semantics in official docs.
3. Design preflight/backfill for duplicates and invalid manager floors.
4. Add indexes/constraints/triggers/command transaction support.
5. Add concurrent and per-statement failure injection tests.
6. Run local migration apply and restore/fix-forward rehearsal.

Verification: schema tests, local D1/SQLite integration, concurrency/failure tests, migration diff review.
Failure response: do not apply remotely; repair preflight/data or allocate a forward migration if already applied.
Resume state: migration number/hash, preflight counts, apply state, failing invariant.

## `UNIT-004` - Repository Isolation and Conflict Normalization

**Write scope:** project/estimate/workspace repositories, D1 access adapters, D1 estimate conflict mapping, focused tests.
**Requirements:** `REQ-002`, `SEC-004`, `DATA-003`, `DATA-004`, `PERF-001`.
**Invariants:** query only authorized estimate/roster/invite fields; sheet-only minimal shell; batched policy parity; stable revision conflict with recoverable local input.

Steps:

1. Fix project estimate listing to filter accessible estimate IDs for sheet-only actors.
2. Split whole-project and scoped-sheet summary queries/DTO inputs.
3. Make manager-only email/pending-invite selection explicit.
4. Replace ambiguous `isWorkspaceMemberInD1` use in internal/client classification.
5. Normalize the active D1 literal conflict to the stable code and prove refetch/copy/telemetry.

Verification: denial/integration tests, query-count assertions, conflict real-adapter tests.
Failure response: fail closed or retain previous whole-project-only route rather than broadening rows.
Resume state: caller migration table, query counts, remaining broad selects.

## `UNIT-005` - Invitation and Membership Command v2

**Write scope:** collaboration actions/store/routes/rate limits/logging plus focused tests.
**Requirements:** `REQ-003`, `REQ-004`, `REQ-005`, `REQ-006`, `UX-003`, `SEC-001`, `SEC-002`, `DATA-002`, `OPS-001`.
**Invariants:** add/invite/change separate; exact-scope capability; no GET acceptance; no silent downgrade; manager floors/target dominance atomic; durable fact fail-closed; email external.

Steps:

1. Implement explicit typed commands and stable result/error codes.
2. Remove existing-profile immediate grant from email-invite semantics; retain explicit add-member path.
3. Add estimate role change and invite revoke/cancel.
4. Make copy/resend/revoke validate exact invitation scope/status/expiry.
5. Make auth-return bridge intent-only and require confirmation POST.
6. Implement explicit project removal retain/cascade modes and effective-access previews.
7. Replace raw console paths with structured logging and outbox/delivery state.

Verification: runtime action/store/route tests, concurrency/failure tests, rate/origin/replay/wrong-account/redaction tests, error-handling gate.
Failure response: keep command-v2 flag off and preserve read/resolve behavior only if safe.
Resume state: command matrix, compatibility callers, lifecycle state, failed invariant.

## `UNIT-006` - Scoped Teamwork Summary DTO

**Write scope:** collaboration types/summary repository and Teamwork query boundary.
**Requirements:** `REQ-007`, `SEC-004`.
**Invariants:** DTO returns only authorized fields; capabilities and effective source come from policy; online state is not fabricated.

Steps:

1. Define versioned project-manager, project-reader, and sheet-scoped response shapes.
2. Include stable capabilities, effective role/source, removal impact, inheritance, and pending states as authorized.
3. Remove placeholder self-online claim; accept realtime presence as separate overlay.
4. Inventory all Publisher/project/cursor callers.

Verification: schema/type tests and per-actor snapshots without sensitive fixtures.
Failure response: retain compatibility adapter until all consumers migrate.
Resume state: DTO version, callers, deprecated fields.

## `UNIT-007` - Project Team Access UI

**Write scope:** Teamwork-owned project access components/actions wiring and focused DOM tests.
**Requirements:** `REQ-003`, `REQ-006`, `REQ-007`, `UX-001`, `UX-004`.
**Invariants:** controls match capabilities; add versus invite is explicit; owner/equal actions absent; pending lifecycle complete; removal impact honest.

Steps:

1. Add dedicated Team access entry surface from project chrome.
2. Implement project member rows, role source, manager email, actions, pending invites, delivery/expiry states.
3. Wire add, invite, role change, remove, copy, resend, revoke.
4. Add focus, keyboard, live regions, loading/empty/error/conflict states, narrow layout.

Verification: DOM/a11y tests, typecheck, focused static review; browser only for composition/route claims not provable in DOM.
Failure response: keep UI flag off; do not fall back to exposing unauthorizable controls.
Resume state: completed journeys/states and remaining browser claims.

## `UNIT-008` - Estimate Access UI

**Write scope:** Teamwork-owned estimate access components/actions wiring and DOM tests.
**Requirements:** `REQ-004`, `REQ-006`, `REQ-007`, `UX-002`, `UX-004`.
**Invariants:** direct sheet admin works without project role; restriction atomic; no silent owner promotion; inherited access and retained access are explicit.

Steps:

1. Implement inheritance versus restricted control with impact preview.
2. Implement direct member add/invite/role/remove and pending invitation controls.
3. Filter roles/actions through policy.
4. Show access source and retained inherited access after direct removal.
5. Complete responsive/a11y/error/conflict states.

Verification: DOM/action integration, sheet-only manager and viewer denials, restriction failure injection.
Failure response: leave sheet in prior authoritative mode and show stable error; no client-side partial state.
Resume state: mode/member state matrix and pending defects.

## `UNIT-009` - Activity Producer Contract

**Write scope:** Teamwork event adapter/fixtures/producer calls, cross-pack receipt; Activity consumer changes only under allocated ownership.
**Requirements:** `REQ-011`, `DATA-002`.
**Invariants:** access-changing facts are atomic, redacted, immutable, idempotent; realtime traffic excluded.
**Current blocker:** Activity owner must refresh its five stale artifact hashes and its validator must pass before this unit binds a manifest hash or accepts a consumer acknowledgement.

Steps:

1. Revalidate the current Activity pack before freezing its manifest and record the source/manifest hashes.
2. Agree `TEAMWORK-ACTIVITY-CONTRACT-v1` envelope and event vocabulary.
3. Implement Teamwork adapter and producer transaction calls.
4. Run Activity reader/composer/history compatibility tests.
5. Bind both manifest hashes in the consumer receipt.

Verification: producer/consumer contract tests, redaction scan, receipt validator.
Failure response: keep local adapter versioned but do not claim integrated Activity completion.
Resume state: schema version, Activity hash, unacknowledged events.

## `UNIT-010` - Durable Object Protocol v2

**Write scope:** realtime room token/identity/server/router/protocol tests.
**Requirements:** `REQ-008`, `REQ-009`, `SEC-003`, `PERF-002`, `OPS-001`.
**Invariants:** whole-project versus exact-estimate topics; dedicated keys; auth deadline/ack; subject/capability binding; allowlisted schemas; rate/cap/backpressure; access removal targets 5 seconds and must deny within 30 seconds.

Steps:

1. Version claims with subject/topic/session/capability/key/membership fields.
2. Fail closed on missing dedicated production keys.
3. Add authorization timeout and explicit control-frame state.
4. Validate registered events/payloads and derive sender identity server-side.
5. Enforce viewer/editor capability matrix, limits, and slow-client policy.
6. Add trusted server-to-DO `revoke-subject` control, membership-version checks, acknowledgement, session close, and 30-second token-expiry fallback.
7. Add redacted metrics/error codes and commit-to-revocation latency.

Verification: DO unit/property/fuzz/abuse tests; router authz tests; independent security review.
Failure response: protocol-v2/cursor flags remain off; close unsupported v1 if it can bypass capability checks.
Resume state: protocol version, compatibility window, failing event/cap.

## `UNIT-011` - Authorized Client, Refresh, and Presence

**Write scope:** room client, connection multiplexer, presence hook/overlay, telemetry integration, tests.
**Requirements:** `REQ-008`, `REQ-009`, `SEC-003`, `PERF-002`.
**Invariants:** socket open is not ready; refresh before expiry; bounded reconnect; trusted roster labels; one socket/topic/session; person/session presence semantics; removed sessions stop publishing within 30 seconds.

Steps:

1. Implement explicit connection state machine and authorization acknowledgement.
2. Surface typed server errors and queue only latest ephemeral frames.
3. Refresh/re-auth/reconnect with heartbeat/backoff/teardown.
4. Multiplex presence/cursor traffic.
5. Mount scoped project/estimate presence and remove placeholder online semantics.
6. On removal/revocation, consume the server close/typed denial, clear local presence/cursor state, deny refresh by membership version, and prove the 5-second target/30-second maximum.
7. Leave GlobalPresence/non-product row-update paths isolated or honestly marked deferred.

Verification: fake-clock expiry, reconnect, multi-tab/session, removal, offline, teardown, telemetry tests.
Failure response: show degraded/offline state and suppress sends; never report subscribed.
Resume state: connection state traces and remaining compatibility callers.

## `UNIT-012` - Supported Estimate Cursor UX

**Write scope:** cursor hook, estimate overlays, trusted roster integration, a11y/DOM tests.
**Requirements:** `REQ-009`, `UX-004`.
**Invariants:** editors send, viewers receive only; labels trusted; payload bounded; stale cleanup; no layout shift; honest a11y; touch/reduced-motion respected.

Steps:

1. Consume protocol-v2 capability/client state.
2. Resolve subject through scoped roster and handle unknown/removed users.
3. Clamp/validate/render normalized positions and stable colors.
4. Correct editing language and add concise live text.
5. Preserve current throttle/distance behavior or improve only with measurement.

Verification: identity, viewer denial, coordinates, stale GC, reduced motion, touch, layout/DOM tests.
Failure response: disable cursor flag while retaining presence/read access.
Resume state: UI matrix and browser-only claims.

## `UNIT-013` - Performance, Observability, Flags, and Cost

**Write scope:** benchmarks, telemetry sink, feature controls, ops scripts/docs, focused tests.
**Requirements:** `REQ-010`, `PERF-001`, `PERF-002`, `OPS-001`, `OPS-003`.
**Invariants:** budgets measured; caps/kill switches work; structured logging; free-tier/bundled posture; project cursors off.

Steps:

1. Reconcile repo performance protocol and numeric budgets.
2. Measure D1 query counts/latency and DO fanout at normal/10x/abuse scales.
3. Configure redacted telemetry sink and alert/runbook codes.
4. Make flag semantics honest and test kill switches/caps.
5. Record Cloudflare request/message/write/email cost estimates.
6. Keep Workers for Platforms deferred; no paid activation.

Verification: benchmarks, ops/error-handling gates, flag/cap tests, cost receipt.
Failure response: lower caps/disable realtime or UI features; do not relax security.
Resume state: measured budgets, current flags, cost envelope.

## `UNIT-014` - Publisher Compatibility

**Write scope:** Teamwork component extraction and Publisher consumer adapter/tests/receipt.
**Requirements:** `REQ-012`.
**Invariants:** public recipient authority separate; no internal mutation in public client; current Publisher behavior preserved.
**Current blocker:** Publisher owner must refresh its eight stale artifact hashes and its validator must pass before this unit binds a manifest hash or starts the compatibility receipt.

Steps:

1. Recompute Publisher baseline/manifest validation.
2. Move/extract internal access component to Teamwork ownership.
3. Migrate Publisher callers through versioned DTO/adapter.
4. Run public/internal denial and Publisher route/DOM tests.
5. Write `TEAMWORK-PUBLISHER-ACCESS-v1` with both hashes.

Verification: caller/import inventory, type/DOM/route tests, receipt validation.
Failure response: retain compatibility adapter or old Publisher presentation; do not couple authorities.
Resume state: migrated callers and receipt hash.

## `UNIT-015` - Local Integration and Adversarial QA

**Write scope:** tests/evidence and fixes in owning units only.
**Requirements:** `UX-001`, `UX-002`, `UX-003`, `UX-004`, `DATA-004`, `OPS-002`.
**Invariants:** all accepted local criteria proven; known-red cleared/classified; no sensitive evidence; browser used only for browser-only claims.
**Current blocker:** both `UNIT-009` and `UNIT-014` must be verified against owner-refreshed overlap manifests and accepted consumer receipts.

Steps:

1. Run targeted matrix, repository, D1, command, route, DO, hook, DOM, cross-pack tests.
2. Run adversarial concurrency/failure/abuse cases.
3. Run `TEST-019` through the real D1 adapter: stale-write denial, stable code, authoritative refetch, local-input preserve/reapply/copy, and telemetry.
4. Run typecheck/lint/error-handling and proportional broad validate/build.
5. Run targeted local browser journeys only where unit/DOM cannot prove interaction.
6. Produce `TEAMWORK-LOCAL-INTEGRATION-v1` with independent verifier.
7. Prepare the no-side-effect `TEAMWORK-HOSTED-VERSION-v1` authorization/dry-run packet for `AUTH-001`, including exact source/config hashes, current deployment preflight, proposed percentages, flags, DO compatibility, monitoring, rollback, and cleanup.

Verification: exact receipt commands and artifact hashes.
Failure response: return each defect to owning unit and rerun affected/downstream proof.
Resume state: failed claims by criterion and owner.

## `UNIT-016` - Hosted Deployment Authorization and Version Preparation

**Initial status:** `BLOCKED` by active `AUTH-001`. Do not begin provider-side actions from this plan alone.
**Write scope:** resolved authorization packet, source-matched build/version/deployment artifact, narrowly scoped proof scripts; bound Worker only.
**Requirements:** `OPS-002`, `OPS-004`.
**Invariants:** exact source/config/bindings; no paid add-on; no unrelated resource; no DO migration bundled without separate review; version/deployment/traffic actions match the owner-approved packet.

Steps after `AUTH-001` is resolved:

1. Recheck the current production deployment, bound D1/DO compatibility, active migration state, feature flags, monitoring, rollback, cleanup, and maximum proof window.
2. Build the exact locally verified source and upload it with `wrangler versions upload`; record version metadata without secrets.
3. Add the version to the current deployment at 0% only if that action is approved. Use a version override to prove the routed HTTP marker and D1 path without general traffic.
4. Do not claim new Durable Object code from a preview URL or 0% deployment: DO preview URLs are unavailable, and DO version assignment follows deployment percentage.
5. If the approved packet includes a nonzero canary or cutover, record the exact percentage/window and prepare `UNIT-018`; otherwise leave DO proof blocked.
6. Produce `TEAMWORK-HOSTED-VERSION-v1` binding source revision, build/config hashes, version ID, deployment state, routing marker, flags, compatibility, monitoring, rollback, cleanup, and verifier.

Verification: version/deployment metadata, exact routed response marker, receipt validator, independent release verifier.
Failure response: restore prior deployment percentages, disable Teamwork/realtime flags, remove temporary override/proof state, verify prior-version routing, and record the redacted failure.
Resume state: `AUTH-001` packet, version/deployment IDs, percentages, routed marker, rollback/cleanup state.

## `UNIT-017` - Hosted D1 Invitation Proof

**Initial status:** `BLOCKED` transitively by `AUTH-001`.
**Write scope:** hosted proof scripts/artifact and narrowly required fixes; bound Archestimator resources only.
**Requirements:** `OPS-002`, `OPS-004`.
**Invariants:** exact `UNIT-016` version is routed; secret/env gates; redacted evidence; cleanup; no release overclaim.

Prove create/delivery-state/resolve/explicit accept/wrong-account/replay/revoke/expiry/reissue/direct-add/role/remove/concurrency against the routed source-matched Worker and bound D1. Include migration/source/version metadata and cleanup counts.

Verification: `TEAMWORK-HOSTED-D1-INVITE-v1`, independent verifier, artifact validator.
Failure response: stop hosted proof, preserve redacted failure evidence, restore routing as required, fix locally, rerun from `UNIT-016`.
Resume state: scenario ID, source/version/routing state, hosted revision, cleanup state.

## `UNIT-018` - Hosted Durable Object and Two-Client Proof

**Initial status:** `BLOCKED` transitively by `AUTH-001`; a nonzero canary or cutover must be explicitly authorized.
**Write scope:** hosted browser/DO proof scripts/artifact and narrowly required fixes.
**Requirements:** `OPS-002`, `OPS-004`.
**Invariants:** exact deployed protocol; isolated contexts; viewer denial; cross-scope isolation; reconnect/refresh/removal; 5-second revocation target and hard 30-second maximum; zero console/page errors.

Prove owner/editor two-way cursor, viewer receive-only, trusted labels, restricted/cross-project denial, five-minute refresh, reconnect, stale cleanup, multi-tab folding, membership removal with successful and failed control paths, caps/rates, and measured fanout. The receipt must show the exact DO-assigned version and fail if removal can publish after 30 seconds.

Verification: `TEAMWORK-HOSTED-DO-CURSOR-v1`, independent security/browser verifier, artifact validator.
Failure response: disable cursor/protocol flag, restore the prior deployment, and do not treat a 0% version override or stale July 2 artifact as current DO proof.
Resume state: scenario/source/version/percentage/timing/error/rollback/cleanup state.

## `UNIT-019` - Final Integration, Truth Update, and Readiness

**Initial status:** `BLOCKED` transitively by `AUTH-001`.
**Write scope:** integration evidence, relevant current-state/spec/decision docs, this pack manifest/ledger; no unrelated cleanup.
**Requirements:** `REQ-010`, `REQ-011`, `REQ-012`, `OPS-002`, `OPS-003`, `OPS-004`.
**Invariants:** current source is canonical; receipts current; statuses independent; release not inferred; Supabase labeled historical.

Steps:

1. Recompute source baseline and all receipt/manifest hashes.
2. Verify every requirement/criterion/test/risk/unit mapping.
3. Supersede stale Teamspaces/decisions/current-state claims with active D1/DO truth.
4. Record project cursor/Platforms/live-sync deferrals.
5. Run final validators and an independent read-only audit.
6. Produce `TEAMWORK-FINAL-INTEGRATION-v1` and update statuses last.
7. Add one sanitized durable Supermemory update for changed project truth.

Verification: plan-pack/planning-prompt validators, targeted+broad receipts, independent verifier.
Failure response: keep package active, return failed claim to owning unit, and avoid archive/release elevation.
Resume state: exact failed ID, receipt/hash, next unit.

## Final Completion Conditions

- All 19 units `VERIFIED`, `AUTH-001` resolved/superseded, and no active unready work.
- All accepted requirements have passing criteria and current evidence.
- All tests required for the claimed scope pass; stale historical tests are superseded.
- Activity and Publisher receipts are current.
- Hosted D1 and hosted DO/browser receipts pass separately.
- Risks are mitigated/accepted/closed and no unresolved critical security/data risk remains.
- Release status is evaluated using the existing production evidence gates, not inferred.
- `plan-pack.json` is updated last and validates without `--write`.
