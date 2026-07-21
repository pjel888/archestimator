# Plan Pack — Admin Support Operations Console

Canonical execution artifact: `00-PLAN.md`. Machine manifest: `plan-pack.json`.

## Target result

Upgrade `/admin/support` into a coherent solo-founder support console without
replacing the existing D1 message ledger or adding a helpdesk dependency:

- Inbox, Sent, Drafts, Archive, All, Starred, and Snoozed views with consistent counts;
- verified `support@archestimator.com` and `philip@archestimator.com` From identities;
- revision-safe persisted drafts and owned R2 draft attachments;
- reply-all, forward, and scoped keyboard navigation;
- bidirectional in-app chat backed by D1 and signaled through `SUPPORT_INBOX`;
- labels, self-assignment, snooze, and star triage.

## Critical implementation corrections

- Use URL state plus TanStack Query as the one client list source; do not keep a
  second unsynchronized `initialConversations` state tree.
- Keep Reply-To on the canonical routed support mailbox even when From changes.
- Persist and reuse the original From identity for retries; never silently retry
  from the current default.
- Give drafts a non-null scope key and revision CAS; SQLite nullable uniqueness
  is not sufficient for new-email drafts.
- Bind draft attachments to a D1-owned draft before upload and clean exact R2
  keys on send, discard, privacy erase, and bounded orphan cleanup.
- Promote a draft to one stable outbound message before dispatch; validate all
  attachments first, retain recoverable bytes on partial failure, and make retry
  reload the persisted message attachments rather than silently dropping them.
- Reuse/refactor the existing support-room token authorization; do not add a
  duplicate permissive token path.
- Persist chat messages before fanout. WebSockets carry invalidation signals,
  not client-authored message bodies.
- Normalize labels into a join table; do not query `labels_json` by substring.

## Dependency order

Ready now: `UNIT-001`, `UNIT-003`, and `UNIT-005` have disjoint initial write
sets. Shared-file units are serialized by the DAG.

1. `UNIT-001` mailbox view/query contract
2. `UNIT-002` admin list-state refactor and folder rail
3. `UNIT-003` send-identity registry and readiness contract
4. `UNIT-004` identity-aware send/retry/composer integration
5. `UNIT-005` revisioned draft schema, repository, attachment ownership
6. `UNIT-006` draft API, autosave, resume/discard, send cleanup
7. `UNIT-007` reply-all, forward, and keyboard navigation
8. `UNIT-008` chat authorization, persistence, and fanout hardening
9. `UNIT-010` chat clients for user and admin surfaces
10. `UNIT-009` normalized triage schema and query layer
11. `UNIT-011` triage UI and Action Inbox integration

## Validation boundary

Plan authoring uses static source/diff inspection and
`bun run validate:plan-pack -- <folder>`. Product tests, builds, browser
automation, screenshots, Storybook, and visual QA remain user-gated. Exact
`TEST_PROPOSAL` commands are recorded in `00-PLAN.md`; they are not authorized
for execution by this plan-only pass.
