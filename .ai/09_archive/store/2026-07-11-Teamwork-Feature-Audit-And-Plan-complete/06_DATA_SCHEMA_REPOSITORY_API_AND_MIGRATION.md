# Data, Schema, Repository, API, and Migration

## Active Data Model

The implementation extends active Cloudflare D1 migrations only. `supabase/migrations/` is historical evidence and must not be run or extended.

Current tables include project members, estimate-sheet members, collaboration invitations, invitation tokens, audit events, and estimate access settings. The next migration number must be allocated at execution time after re-listing `migrations/`; the plan does not reserve a stale numeric filename.

## Required D1 Invariants

1. One active pending invitation per normalized scope identity.
2. One active token per invitation.
3. Referenced profile exists for every direct membership.
4. Workspace owner floor cannot be violated.
5. Project recovery-manager floor cannot be violated.
6. Restricted estimate has at least one direct owner/admin.
7. Restriction and manager establishment are atomic.
8. Role mutation and target/manager-floor validation are atomic.
9. Invitation acceptance atomically consumes token, grants/escalates membership, updates lifecycle, and persists the immutable fact.
10. Revoke atomically changes lifecycle and invalidates tokens.

Use constraints/indexes/triggers where they are expressible and transaction-scoped command functions for cross-table invariants. Do not rely on a read in one server-action statement followed by an unrelated write.

## Migration Design

The migration unit must produce a generation/allocation receipt containing:

- current latest active D1 migration;
- selected migration filename;
- schema and index SQL;
- backfill/preflight counts;
- duplicates or manager-floor violations discovered;
- deterministic repair policy;
- local apply/rollback rehearsal commands;
- remote apply gate and forward-fix plan;
- exact tests and artifact hashes.

No destructive remote migration runs during local implementation. D1 schema mistakes are fixed forward.

## Pending-Invite Uniqueness

Normalize email at the application boundary and store a canonical scope key, for example:

```text
project:<project_id>
estimate:<estimate_id>
```

Use an active-state partial unique index or equivalent schema shape. The write path should be a single upsert/transition command, not `SELECT` then conditional `INSERT`.

## Membership and Invitation Transaction Boundary

The target accepted transition is:

```text
validate active token + exact account + scope
lock/claim token logically
upsert membership monotonically
mark token used
mark invitation accepted
append lifecycle fact
commit
```

D1 batch/transaction semantics must be verified against current official Cloudflare documentation during implementation. Confirmed current state: the active `D1DatabaseLike` (`src/lib/cloudflare/d1.ts:20-24`) exposes only `prepare` and an optional `batch`; there is no transaction/BEGIN/COMMIT API, and a D1 `batch` is not a true transaction. A batch that excludes the membership statement is not sufficient — the current `acceptInvitationInD1` (`invitation-d1-store.ts:453-583`) performs the membership grant at `:506-508` outside the trailing `runStatements` batch at `:513-573`. `UNIT-003` must move the membership grant inside the atomic boundary and express cross-table invariants as constraints/indexes/triggers, since the runtime offers no encompassing transaction. If the runtime cannot express the required atomicity safely, redesign the command around a single SQL statement or fail the unit; do not approximate atomicity.

Email delivery uses an outbox-style intent persisted with invitation creation. Queue delivery may be adopted only using the already-bound queue and only if the resulting retry/idempotency behavior is simpler than the current synchronous path.

## Repository Isolation

Repositories must select only authorized rows. Fetching a broad roster or estimate list and redacting after retrieval is not the default.

Required query changes:

- project sheet listing filters to whole-project authority or individually accessible estimate IDs;
- sheet-only shell returns only project identity plus accessible estimate navigation;
- collaboration summary returns a scope-specific DTO, not the whole-project DTO with fields blanked later;
- viewer/member email and pending-invite columns are not selected when capability denies them;
- restricted-sheet invite operations load and authorize the exact estimate scope;
- `isWorkspaceMemberInD1` naming/behavior is replaced or clarified so platform admin and workspace viewer semantics cannot be misused as an internal-vs-client classifier.

## Canonical Access Query/Policy Boundary

Avoid duplicating role SQL in every repository. Implement a bounded resolver that can return:

- applicable grants;
- restriction state;
- effective role/source;
- capability decisions;
- authorized estimate IDs for list queries.

Hot list paths may use set-based SQL helpers rather than per-row resolver calls, but parity tests must prove that batched SQL and the canonical policy return identical answers.

## API/Action Commands

Commands should be explicit and typed:

- `addProjectMember`
- `inviteProjectMember`
- `changeProjectMemberRole`
- `removeProjectMember({ mode })`
- `addEstimateMember`
- `inviteEstimateMember`
- `changeEstimateMemberRole`
- `removeEstimateMember`
- `setEstimateInheritance`
- `reissueInvitation`
- `revokeInvitation`
- `acceptInvitation`

Every command returns a stable discriminated result. Expected denials/conflicts use codes, not parsed exception strings.

## Optimistic Concurrency Contract

> **Scope note:** the conflict-string divergence below originates in the Estimates domain (`src/lib/estimates/`), not in collaboration/membership code. It is a pre-existing defect. The Teamwork plan adopts it because the concurrent-editing UX (`UNIT-012`) depends on a trustworthy conflict signal, and the repair is small (one shared normalization helper). `UNIT-001`/`UNIT-004` own the normalization; if a separate Estimates fix pack is opened, coordinate to avoid duplicate edits to `d1-action-client.ts` and `row-revision-conflict.ts`.

Concurrent editors still rely on estimate-row revision control even though CRDT/OT is out of scope. The active estimate-action path throws the literal `"Estimate row revision conflict."` at `src/lib/estimates/d1-action-client.ts:1906, 1961, 1989, 2020`, while the stable code constant is `estimate_sheet_row_revision_conflict` (`src/lib/estimates/row-revision-conflict.ts:1`). The recognizers (`isEstimateRowRevisionConflict` at `row-revision-conflict.ts:12-21` and `readMutationErrorCode` at `src/hooks/use-estimate-row-mutations.ts:87-95`) match only on the code string or its substring, so the literal is uncaught and surfaces as a generic `mutation_error`. A separate path (`src/lib/ai/package-builder/apply.ts:1325, 1437`) already throws the correct code, but there is no shared normalization layer between the two paths.

`UNIT-001`/`UNIT-004` must normalize the D1 error to the stable code (prefer one shared helper used by both the server throw sites and the client/server recognizers) and prove:

- stale writes are rejected;
- the client shows stable conflict copy;
- authoritative data is refetched;
- local user input is preserved for reapply/copy;
- structured conflict telemetry fires;
- tests exercise the real D1 error path rather than only mocks.

Peer WebSocket payloads never become authoritative estimate data. A later commit-event invalidation design may broadcast server-confirmed `{entityId, revision, mutationId}` receipts, but row-value replication is excluded from this slice.

## Failure Injection

For every multi-statement command, inject failure before/after each statement and assert the invariant. Include concurrent workers for:

- last owner/admin removal;
- duplicate invite creation;
- accept versus revoke;
- resend versus expiry;
- restrict versus remove manager;
- role change versus removal.

## Data Privacy

- Tokens remain peppered hashes; raw values are never stored.
- Emails are normalized for identity but redacted in logs/evidence.
- Topic/resource IDs are hashed or mapped before telemetry leaves the request context.
- Audit metadata uses allowlisted fields and no arbitrary client payload.
