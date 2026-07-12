# UNIT-010 — Stable Recipient Identity and Credentials

## Scope

Implement stable portal-recipient membership, role/approver changes, credential rotation, resend, and immediate revocation without deleting recipient history.

## Delivered

- `src/lib/client-portal/recipient-service.ts` keeps one recipient identity per normalized portal email and records only HMAC credential hashes in D1.
- Invite and resend create a new bootstrap credential, revoke active credentials, and increment the recipient credential version so existing recipient sessions fail immediately.
- Revoke keeps membership, audit history, and prior credentials; it does not delete recipient records.
- Role-template and required-approver updates are separate from credential rotation.
- Every lifecycle write is policy-gated to the portal's exact workspace/project relationship and committed in a D1 batch with owner audit and notification-outbox records that contain no raw token or email.
- `src/lib/client-portal/recipient-actions.ts` exposes the lifecycle only through the existing project-publication manager authorization, then rechecks the portal policy in the service.

## Validation

- `bunx vitest run tests/vitest/client-portal-*.test.ts tests/vitest/client-portal-shell.test.tsx --maxWorkers=1` passed: 8 files, 23 tests.
- Isolated TypeScript program covering recipient actions, lifecycle service, public recipient session, policy, and contracts passed.
- `git diff --check` passed for the Unit 10 implementation and focused test.

## Boundary

- The raw bootstrap token exists only in the immediate authenticated action result; D1, audit events, and outbox payloads store opaque IDs/state only.
- Existing recipient session validation already checks recipient status and `recipient_credential_version`; Unit 10 deliberately relies on that shared public-session contract rather than introducing a second session scheme.
- Legacy publication-recipient backfill/cutover and hosted email delivery are owned by `UNIT-018` and later release work. No hosted mutation or browser proof is claimed.
