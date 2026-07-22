# UNIT-002: Establish the canonical support domain

## Goal and status

`READY` after UNIT-001 | dependencies: UNIT-001 | requirements: DATA-001,
SEC-001, SEC-002, DATA-002 | risks: RISK-002, RISK-003, RISK-004, RISK-005,
RISK-009

Define the additive D1 schema, safe context contract, internal priority, and
legacy import machinery that make Support the only future user-report ledger.

## Owned paths

- next free active migration, expected `migrations/0100_user_support_system.sql`
- new `src/lib/support/support-message-context.ts`
- new `src/lib/support/support-legacy-feedback-import.ts`
- `src/lib/repositories/support-conversations-d1.ts` after UNIT-001
- `src/lib/repositories/support-conversations-repository.ts` only for exports
- `src/lib/admin/support-attention-repository.ts` only if priority DTOs require it
- new `scripts/audit-user-support-legacy-import.ts`

## Implementation boundary

1. Recheck migration tail and use the next free number.
2. Add `support_user_intake_claims` with actor-scoped client-message identity,
   payload fingerprint, stable winning conversation/message IDs, optional
   attachment digest/key, explicit `reserved/committed/abandoned` state, and
   timestamps. Claims precede target rows, so do not add premature target FKs.
3. Add `support_message_context` exactly within the allowlisted/minimized shape
   in `00-PLAN.md`, with caps, viewport checks, nullable validated resource FKs,
   and message cascade.
4. Add `support_legacy_feedback_imports` with unique feedback/conversation/message
   identities and restrictive deletion.
5. Add a unique partial attachment-key constraint and a defensive user-message
   identity constraint that agree with the intake claim. Preflight existing rows
   before creating either constraint and fail visibly on conflicts.
6. Add triage `priority` with `normal/high/urgent`; add an index only after query
   plan evidence.
7. Implement one server-only normalizer that:
   - requires a sanitized pathname without query/fragment/control characters;
   - validates one coherent workspace -> project -> estimate ownership chain
     through current repositories rather than validating IDs independently;
   - normalizes timezone, viewport, browser/OS and optional release;
   - never accepts user/email, names, raw UA, content, query, tokens, or storage.
8. Implement an idempotent import service and dry-run/readiness command:
   - list unmapped legacy rows without outputting message/email content;
   - validate references;
   - batch canonical conversation/message/context/mapping records;
   - preserve legacy timestamps/type/severity as clearly historical metadata;
   - map both legacy `new` and `reviewing` to canonical `open`, because
     user-facing `pending` means `Waiting on you`;
   - return counts and stable IDs only;
   - rerun without duplication.
9. Keep retained legacy feedback inside privacy export and erasure while it
   remains read-only audit history.
10. Do not run remote import or switch attention derivation in this unit.

## Data invariants

- one context row per message;
- one actor/client-message claim; a committed claim names one existing canonical
  message and its optional attachment identity;
- the same actor/client-message ID with a changed fingerprint is a conflict, not
  a second submission;
- each private support attachment key has one D1 owner;
- one mapping per legacy feedback row;
- one mapped conversation and message per legacy feedback row;
- context resource IDs are null or form one server-authorized ownership chain;
- legacy severity never sets current support priority;
- legacy `reviewing` never becomes user-facing `Waiting on you`;
- no new write to legacy feedback is introduced.

## Acceptance evidence

- Migration is additive, forward-only, ordered after the current tail, and
  replays on a clean local D1 schema.
- Static source proves the prohibited context fields cannot enter the insert.
- Schema/static evidence proves actor-scoped idempotency and one-owner attachment
  keys before the user route writes an object.
- Dry-run reports total/mapped/unmapped/invalid-reference counts without PII.
- Import batch is idempotent by mapping constraints and insert-or-select logic.
- Retained legacy rows are included in the privacy export/erasure inventory.
- Execute and retain the UNIT-002 static-QA receipt from `00-PLAN.md` section 20.
- TEST_PROPOSAL only: legacy import and context ownership tests.

## Recovery and stop condition

Before a remote migration, recovery is file reversion. After apply, fix forward:
the tables/column are additive and unused until later units. Stop when AC-002's
schema/import contract and AC-004's context boundary are stable for UNIT-003 and
UNIT-006.
