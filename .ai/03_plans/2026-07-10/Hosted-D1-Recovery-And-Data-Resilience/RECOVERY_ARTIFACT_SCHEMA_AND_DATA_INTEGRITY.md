# Recovery Artifact Schema And Data Integrity

## Authority And Scope

This data contract expands `REQ-003`, `REQ-006`, `AC-003`, `AC-006`,
`TEST-003`, `TEST-006`, `RISK-001`, `RISK-003`, `UNIT-003`, `UNIT-005`, and
`UNIT-006`. It defines the planned `D1-RECOVERY-RECEIPT-v1` and layered
integrity checks. It is not a produced receipt and contains no hosted evidence.

## Receipt Contract

`D1-RECOVERY-RECEIPT-v1` must contain:

| Section | Required fields |
| --- | --- |
| Schema/producer | Receipt/schema version, producer version, run ID, issued/expiry time, validity/result. |
| Identity | Redacted account/source/target identity hashes, app revision, migration revision, export digest, environment/backend/plan. |
| Timing | Export start/end, target ready, offline validation complete, ingress ready, application proof complete, cleanup complete, measured RTO/RPO and definitions. |
| Integrity | Migration ledger/head, schema object inventory, critical row counts, deterministic keyed digests, FK violations, orphan checks, invariants/enums, precision sentinels. |
| Application/security | Representative reads, controlled write/rollback, tenant/public/protected denials, restored-session invalidation, fresh disposable auth, proof-ingress denials. |
| Resource/data lifecycle | Temp/file modes, encrypted-filesystem result, plaintext window, ciphertext/key alias lifecycle, Worker/D1/route/secret/table/file/object cleanup and absence readback. |
| Operations | Redacted operator label, exact approved command identities/digests, failures, incident references, cleanup verifier, consumer results, blocker/next action. |

Release and Operating consumers reject missing, unknown, stale, revision or
identity mismatch, any failed required check, non-provider/local-only proof, or
incomplete cleanup. Consumers validate and join the receipt; they cannot execute
recovery or reinterpret a missing result as a warning.

## Layered Integrity Model

| Layer | Comparison/invariant | Defect labels |
| --- | --- | --- |
| Migration | Ordered applied migration ledger equals the active expected ledger/head | missing, extra, reordered, wrong checksum/head |
| Schema | Required table/index/trigger/constraint inventory, including the migration 0053 ownership triggers (`trg_corporate_accounts_require_creator_on_insert`, `..._on_update`, `..._creator_is_owner`, `trg_corporate_account_members_preserve_owner_on_delete`, `..._on_role_change`) | missing/extra incompatible object, changed definition, missing ownership trigger |
| Cardinality | Critical table and scoped row counts tied to export digest | count mismatch, unexpected empty, scope leak |
| Content | Keyed deterministic aggregate/digest for non-secret stable fields | digest mismatch, nondeterministic input |
| Referential | `foreign_key_check` and known repository orphan predicates, including corporate member/profile policy, workspace/corporate links, and the migration 0053 ownership invariant (every `corporate_accounts` row has at least one `owner` in `corporate_account_members`) | FK violation, orphan relationship, missing profile, broken corporate link, ownerless corporate account |
| Domain | Enum/status ranges, uniqueness, lifecycle and tenant invariants, including corporate account status/role sets and exact `CASCADE` membership / `SET NULL` workspace-delete behavior, and the migration 0053 ownership-preserving constraints (creator-required BEFORE INSERT/UPDATE ABORT; last-owner-protected BEFORE DELETE and BEFORE UPDATE OF role ABORT) | invalid state, duplicate active identity, cross-workspace reference, corporate role/status drift, wrong delete effect, ownership-invariant violation |
| Precision | Large-integer and timestamp sentinels | truncation, coercion, timezone drift |
| Mutation | One run-labeled controlled write is visible only where expected, then removed/rolled back. A controlled write to `corporate_accounts` triggers the 0053 AFTER INSERT owner upsert, so rollback must remove both the account row and the auto-inserted `owner` member row, and the mutation layer must record the trigger-induced side effect rather than assume one written row. | missing write, cross-scope effect, persistent residue, untracked trigger side effect |

Counts and digests are evidence only when the query/version, export digest,
target identity, fixture scope, and source revision are recorded. Matching counts
do not override schema, authz, application, session, or cleanup failures.
Corporate membership and `workspaces.corporate_account_id` must round-trip as
data without becoming a product-authorization predicate; restoration proof
separately denies corporate-only access to workspace/project resources. The
migration 0053 ownership invariant is a data-integrity claim, not an authz grant:
post-restore proof must confirm every `corporate_accounts` row has at least one
`owner` member after the backfill, and that the ownership triggers survived the
export/import round-trip; a restore to a pre-0053 point, or a failed backfill,
that yields ownerless accounts is an integrity failure even when counts match.

## Data And Secret Lifecycle

- Create a `0700` run directory on a preflighted encrypted filesystem; files are
  `0600` and never placed in the repository or evidence directory.
- Generate a random per-run encryption key in process/OS credential storage.
  Immediately encrypt any retained or transported export and bound every
  plaintext/decrypt window to import.
- Evidence stores only aggregate checks, keyed digests, timings, stable labels,
  and redacted identity hashes. It excludes rows, SQL export content, session
  tokens, emails, object keys, raw paths with secrets, and key material.
- Destroy plaintext, ciphertext, key aliases, temp paths, and any explicitly
  approved transfer object. Independent absence readback is required; delete
  command success alone does not satisfy cleanup.

## Retry, Idempotency, And Partial Failure

The run ID binds every target, Worker, secret alias, nonce table, export digest,
controlled row, and artifact. Retrying a completed phase must detect existing
run-scoped state and either verify/resume safely or stop for cleanup; it cannot
create a second target or overwrite a prior receipt. Any partial import,
integrity failure, controlled-write residue, or cleanup mismatch keeps the
receipt failed and release red.

## Ownership, Evidence, And Handback

`UNIT-003` owns local/temp-D1 check mechanics. `UNIT-005` owns schema and strict
consumers. `UNIT-006` supplies hosted results after `AUTH-001`. A distinct
verifier confirms receipt identity and absence readback. Program/Release/
Operating receive the immutable receipt only; changes to migrations, bindings,
auth/session contracts, check schema, app revision, or provider constraints
invalidate it.
