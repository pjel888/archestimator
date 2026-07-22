# UNIT-007: Cut over privacy, observability, and legacy lifecycle

## Goal and status

`READY` after UNIT-004, UNIT-005, UNIT-006 | dependencies: UNIT-004, UNIT-005,
UNIT-006 | requirements: DATA-001, SEC-001, SEC-002, OPS-002 | risks: RISK-002,
RISK-003, RISK-004, RISK-008, RISK-010

Close the system coherently: remove duplicate user feedback writes, complete
support export/erase/object cleanup, add redacted operations evidence, document
collection/limits, and produce a release-ready but not deployed handoff.

## Owned paths

- `src/lib/compliance/privacy-request-repository.ts`
- support conversation/draft privacy helpers
- R2 cleanup/orphan repair modules and internal cleanup route only as needed
- `src/lib/observability/**` focused support-safe event integration
- `src/lib/workshop/beta-feedback-actions.ts`
- `src/lib/workshop/beta-feedback-d1-store.ts` only to make writes unreachable or
  remove user write exports; retain read-only review/import access
- `src/components/workshop/BetaFeedbackForm.tsx` if not already deleted
- `/workshop/feedback`, settings/support copy, privacy notice, env examples, and
  operator runbook
- plan/runtime evidence artifacts produced by the executor
- new `scripts/audit-support-screenshot-orphans.ts`

## Implementation boundary

1. Prove every authenticated user entry point writes only canonical support.
2. Keep legacy tables/read APIs for audit/import; remove or make unreachable all
   user-facing legacy submission actions.
3. Extend privacy export with canonical conversation/message/context/attachment
   metadata, intake-claim metadata safe for the user, and retained legacy
   feedback content/status history. Do not expose R2 object keys or internal
   actor notes.
4. Extend erasure to enumerate committed message/draft attachment keys and any
   actor-owned reserved claim objects, delete R2 first, then redact/delete D1
   content/ownership and retained legacy message/email/user identifiers. If R2 is
   unavailable or a delete fails, return retryable failure and do not falsely
   mark completion.
5. Ensure support attachment rows/count/context and conversation identity reach a
   coherent anonymized/archived state after erasure.
6. Add bounded orphan/claim repair for support screenshot namespaces. It must
   dry-run, refuse unsafe keys, retain committed references, reconcile stale
   reserved claims, and emit only counts/hashes.
7. Add structured support operation events for intake, idempotent recovery,
   upload rejection, storage failure, realtime degradation, legacy import,
   mailbox failure, and privacy cleanup. No message/email/path query/object key.
8. Update privacy/support copy to disclose minimal account/page diagnostics and
   optional screenshot/technical details. Do not promise automatic retention
   deletion without an approved policy.
9. Document 3 MiB/image-only limit, ownership, retry semantics, DO degradation,
   legacy mapping, operational checks, and remote release sequence.
10. Run final requirement/risk/duplicate/dependency/static validation and leave
    hosted release status `NOT_EVALUATED`.

## Final audits

- `rg` finds no authenticated call to legacy feedback submit actions.
- every `beta_feedback_submissions` row is mapped or an explicit invalid row is
  reported and attention remains enabled;
- every support R2 key is D1-owned or appears in bounded cleanup evidence;
- privacy export/erase covers canonical conversation, message, context, message
  attachment, intake claim, draft, draft attachment, and retained legacy feedback
  lifecycles;
- logs contain no raw support message, email, query, token, user agent, or key;
- package manifest contains no new runtime support dependency;
- Action Inbox, admin Support, global Support, and user Support Center all point
  to the same conversation identity.

## Release handoff, not execution

Record the separate hosted sequence:

1. recheck official Worker/D1/R2/DO limits and current compatibility date;
2. inspect remote migration tail and import readiness without PII;
3. apply the additive migration to the bound `ARCH_DB` only when authorized by
   the execution/release task;
4. deploy a new `archestimator-proof` Worker version whose attention query already
   includes canonical support plus unmapped-only legacy fallback;
5. run legacy import and completeness audit idempotently; mapped rows converge to
   canonical attention without another deploy, while incomplete rows stay visible;
6. verify live domain, `/api/health`, admin mailbox, one user send/screenshot,
   Today deep link, user reply, privacy/cleanup signals;
7. stop the import and retain the automatic unmapped legacy fallback if
   completeness fails.

## Acceptance evidence

- AC-010 requirement audit is complete and every earlier AC has fresh evidence
  or an explicit test/release boundary.
- Static/type/lint/migration/diff checks succeed or unrelated failures are
  isolated and reported.
- No product test/build/browser implementation claim is made without a current
  `TEST_TASK`.
- Execute and retain the UNIT-007 static-QA receipt from `00-PLAN.md` section 20.
- Release remains not evaluated unless the separate hosted sequence actually ran.

## Recovery and stop condition

Legacy tables remain available for fix-forward recovery. Never mark privacy
erasure or import complete on a partial object/data failure. Stop when all local
implementation work and documentation are reconciled, duplicate writes are gone,
the pack validator passes, and only the explicit hosted release boundary remains.
