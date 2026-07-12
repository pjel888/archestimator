# UNIT-015 — Audit, Client Activity, Analytics, and Notifications

## Delivered

- The activity service keeps the audit ledger, client-safe projection, and analytics ledger separate. Client activity is allowlisted and never returns owner or security records; the owner audit is manager-gated and bounded.
- Verified, human-only views and section reads are recorded from the public handlers. Bot and link-preview user agents do not count as recipient engagement. Formal decisions and newly created client threads also append engagement analytics in their domain transactions.
- The recipient matrix derives delivery, verification, first/last views, section engagement, open/waiting threads, decisions, reminders, and a priority next action without a broad portal scan.
- Reminders are owner-audited and atomically persisted with an idempotent outbox intent. Current-issue decisions, revocation/inactive status, prior unsubscribe audit facts, and a seven-day delivered-reminder cooldown suppress further sends.
- The Worker config has a dedicated Client Portal queue producer/consumer. Its lease-based handler acks poison/duplicate work, sends through the Cloudflare Email binding, records delivery, backs off retries, and leaves terminal failures as actionable dead-letter state.
- Publishing now creates one notification intent per active recipient, rather than queueing an addressless portal-wide record. Issuance audit events are client-safe; internal/security audit facts remain owner-only or security-only.

## Validation

- Focused activity, queue, decision, and thread suite passed: 4 files, 18 tests.
- Targeted ESLint passed for activity, queue, decision, thread, publisher-discussion, issue-builder, Worker, and focused test files; the pre-existing `worker.ts` anonymous-default-export advisory remains a warning only.
- `bun run type-check` passed after fixing the queue row narrowing and Publisher discussion view-action type boundary.
- `git diff --check` passed for the Unit 15 change surface.

## Boundary

- No browser automation, screenshots, hosted queue/email delivery, provider mutation, or production telemetry/privacy review was run. Unit 16 owns the full control-center presentation of the recipient matrix and audit data.
