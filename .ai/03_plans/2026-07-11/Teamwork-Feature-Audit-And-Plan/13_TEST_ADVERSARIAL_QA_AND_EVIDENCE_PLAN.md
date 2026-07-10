# Test, Adversarial QA, and Evidence Plan

## Proof Strategy

Use the smallest proof that establishes each claim, then broaden at shared boundaries. Maker/checker separation is required for the final authorization, migration, realtime, and integration verdicts.

## Known-Red Reconciliation

`UNIT-001` runs before behavior changes:

1. Replace the stale inline-role source-string assertion with semantic role/capability tests.
2. Rewrite the fake-D1 sheet-only summary test to support the current batched query or replace it with a closer SQLite/D1 integration fixture.
3. Decide the sheet-only shell/summary policy from the RBAC matrix and assert it directly.
4. Add the active D1 literal revision-conflict reproduction and stable error-code normalization test.
5. Record the exact before/after known-red set. No product fix may be hidden as a fixture-only change.

## Test Matrix

| Layer | Required coverage |
| --- | --- |
| pure policy | table-driven actor/resource/action matrix; precedence; restrictions; target dominance; assignable roles |
| repository | sheet-only estimate filtering; scoped roster/email/invite fields; batched-policy parity; platform/workspace viewer semantics |
| D1 schema | unique pending invite; active token; profile reference; manager floors; migration/backfill; failure injection |
| server actions | exact-scope authorization; add/invite/change/remove separation; self/equal/owner denials; retain/cascade removal |
| invite routes/store | same-origin POST; no GET mutation; wrong account; replay; revoke; expiry; resend; copy; rate limits; idempotency |
| conflict handling | `DATA-004` / `AC-019` / `TEST-019`: real D1 stale write rejects with stable code, authoritative refetch, local-input preserve/reapply/copy, and telemetry |
| DO protocol | auth deadline/ack; topic access; event schemas; subject/capability binding; refresh; revocation target 5 s/hard max 30 s; caps/rates/backpressure |
| hooks/client | connection states; trusted labels; multi-tab folding; cursor clamp/stale cleanup; reduced motion; viewer send denial |
| DOM/accessibility | capability-filtered menus; pending states; impact previews; focus; keyboard; live regions; narrow layout |
| cross-pack | Activity producer/consumer fixture; Publisher DTO/type/route separation |
| hosted D1 | real deployed invitation lifecycle against bound D1 |
| hosted browser/DO | two-client owner/editor/viewer/restricted/reconnect/refresh/removal/isolation; zero console/page errors |

## Adversarial Cases

- admin attempts to remove/demote owner and equal admin;
- concurrent removal of two remaining managers;
- direct sheet admin with no project role manages the sheet;
- project admin tries restricted-sheet reissue without direct grant;
- sheet-only viewer requests project list/roster/emails/invites;
- public recipient calls internal Teamwork endpoints;
- existing higher-role member accepts lower-role invite;
- concurrent create/resend/revoke/accept using the same invitation;
- failure after every statement in grant/lifecycle/fact transaction;
- chunked/no-length request, malformed form, cross-origin POST, link scanner GET;
- viewer forges cursor/content event and another user's label/subject;
- invalid JSON, unknown event, NaN/infinite/out-of-range coordinates, oversized frame;
- unauthenticated sockets, connection flood, rate flood, slow consumer;
- token expiry at five minutes, membership removal mid-session with control-path success and failure, 5-second target/30-second maximum, key-version rollover;
- multi-tab and reconnect storms;
- stale estimate row write from the real D1 adapter.

## Commands by Stage

Exact filenames may evolve; the unit receipt records the final command.

```bash
bunx vitest run --maxWorkers=1 <focused policy/repository/invite/DO/DOM files>
bun run validate:error-handling
bun run typecheck
bun run lint
bun run validate
bun run build
git diff --check
```

Broad `validate`/build is reserved for the shared-contract integration unit, not every edit loop.

## Browser-Only Claims

Browser automation is justified for:

- invite auth-return and explicit-confirm route journey;
- drawer/dialog focus and responsive composition where DOM tests are insufficient;
- two isolated users observing realtime cursor/presence state;
- reconnect/token refresh and membership removal through the deployed Worker;
- console/page error gating.

It is not required for policy, SQL, hash, type, or static component claims.

## Evidence Receipts

| Receipt | Proof class | Required contents |
| --- | --- | --- |
| `TEAMWORK-BASELINE-v1` | local | source baseline, known-red tests, policy fixture |
| `TEAMWORK-MIGRATION-v1` | local/provider-readiness | migration allocation, SQL, preflight, apply/rehearsal |
| `TEAMWORK-ACTIVITY-CONTRACT-v1` | cross-pack | producer/consumer schemas, hashes, tests |
| `TEAMWORK-PUBLISHER-ACCESS-v1` | cross-pack | DTO/import compatibility, hashes, tests |
| `TEAMWORK-LOCAL-INTEGRATION-v1` | local | targeted + broad checks, changed paths, verifier |
| `TEAMWORK-HOSTED-VERSION-v1` | provider boundary/precondition | source revision, uploaded version, deployment percentages, overrides, flags, compatibility, rollback/cleanup, authorization |
| `TEAMWORK-HOSTED-D1-INVITE-v1` | hosted | deployed invitation lifecycle and cleanup |
| `TEAMWORK-HOSTED-DO-CURSOR-v1` | hosted/browser | two-client protocol, denial, refresh, cleanup |
| `TEAMWORK-FINAL-INTEGRATION-v1` | integrated | all baselines/manifests/receipts, final status judgment |

Each receipt includes source revision, scoped baseline, configuration/flag state, exact commands, timestamps, redacted identities, pass/fail assertions, known gaps, and verifier.

`TEST-019` must run the real D1 adapter twice from the same starting revision, prove one stale write is rejected with the stable conflict code, refetch authoritative state, and demonstrate that unsaved local input remains available to reapply or copy while structured telemetry fires. `TEST-020` is skipped at plan time because it is the `AUTH-001` boundary check; it becomes executable only after the source-matched deployment/canary authorization packet is resolved.

## Stop Conditions

- A failed targeted test returns to the owning unit; do not continue downstream.
- A baseline or cross-pack hash mismatch triggers re-audit before refresh.
- Hosted proof failure cannot be relabeled as local readiness.
- Console/page errors fail hosted UI proof.
- Stale historical proof remains `STALE`; it is not overwritten to `PASS` without rerun.
