# 16 - Compliance, Data Lifecycle, And Operational Gaps

Scope: actor lifecycle, privacy obligations, tenant isolation, durable delivery,
retention, and operational readiness.

## 1. Actor Identity Lifecycle (CRITICAL)

### Current state
`actor_user_id` is a **loose TEXT column with no foreign key** (`migrations/0025_reusable_source_insert_support.sql:19`). This is actually the **correct immutable-snapshot design** — the log row is frozen at event time, not a live reference that would break if the user is deleted. But this deliberate design choice is undocumented.

### Gap
The plan pack never discusses what happens to the log when an actor is deleted, anonymized, or merges accounts.

### Best practice (GDPR Art. 17(3)(b)/(e), Philippine DPA)
Audit logs are **exempt from erasure** when retained for legal obligation. The dominant pattern:
- Do not hard-delete users — suspend/deactivate.
- Store actor identity immutably in the log row (already done).
- Pseudonymize on erasure: replace `actor_user_id` with an irreversible token + freeze display name/email at event time so composed copy ("Sarah updated quantity") survives.

### Current mitigation
The codebase already redacts emails to hashes for the client feed (`activity-security.test.ts`). `resolveProjectActivityActorLabels` (`project-activity-repository.ts:173-197`) joins `profiles` and falls back to `getFallbackActorLabel` when the profile is missing. So deleted actors already render with a fallback label.

### Required addition
- **Document** the loose-TEXT `actor_user_id` as a deliberate immutable-snapshot choice (DEC-AUTO-006).
- **AC-022:** after an actor profile is deleted or anonymized, historical events
  still render with a non-null, non-PII actor label and retain legal-hold state.
- **Cross-reference** the privacy/erasure workflow pack at `.ai/03_plans/2026-07-07/2026-07-07-privacy-request-operations-and-erasure-workflow/`.

## 2. Philippine DPA / NPC Compliance (CRITICAL)

### Governing regime
NPC Circular 2023-06 (in force 30 Mar 2024) requires PICs (Personal Information Controllers) to maintain **comprehensive, tamper-proof audit trails** of access to and processing of personal data, with **72-hour breach notification** to NPC + affected subjects.

The client-activity log (`shared_link_events`: opens, password attempts, IP/UA) is exactly the kind of access log NPC scrutinizes.

### Gap
The plan pack has zero mention of DPA, NPC, retention law, or breach notification. Retention is described as "a counsel-reviewed draft until OPEN-DEC-004 is signed off" — i.e., **unsettled**.

### Current state
`src/lib/compliance/retention-core.ts:38` enumerates `estimate_sheet_events` as a retention class with actions: `tombstoned | anonymized | purged | soft_deleted | skipped_legal_hold`. The schedule is coded but not necessarily active.

### Required additions
- Promote retention from a 3-line mention in doc 05 to a first-class section.
- Define the action per retention class: `estimate_sheet_events` → `anonymized` (pseudonymize actor, preserve event structure for audit) after N years.
- Define when `skipped_legal_hold` applies (investigation, litigation).
- Document that the activity log is the primary evidence for 72-hour NPC breach notification — its write-completeness directly gates a legal obligation.

## 3. Multi-Tenant Isolation (CRITICAL)

### Current state
Migrations contain **zero RLS policies** and **zero `CREATE POLICY`**. D1 (SQLite) does not support RLS natively. Isolation is 100% application-layer `workspace_id` WHERE clauses.

### Gap
The plan pack claims "Cross-workspace isolation is enforced" as a success criterion but never shows HOW or provides evidence. A single forgotten `workspace_id` predicate leaks across tenants.

### Required additions
- **Add a contract test** asserting every read path on `estimate_sheet_events` / `shared_link_events` includes `workspace_id` in its WHERE clause.
- **Centralize** all activity reads behind repository functions that mandatorily inject `workspace_id` (reject calls with no workspace scope).
- **Downgrade** the "events cannot leak" success criterion from assertion to **evidenced claim** with a test.

## 4. Activity Log Export (HIGH)

### Gap
No activity-log export is mentioned. "Proposal XLSX export" is out of scope.

### Best practice
Mature products export audit logs to CSV (for SIEM/analysis), JSON (for API/machine), and PDF (for formal auditor deliverables), scoped by entity, actor, date range, event type.

### Required addition
- Record export shape as future-work. The `ActivityViewModel` is already structured for export.
- Flag: any owner-side export must NOT use the client-feed PII-stripping path.
- Add as REQ-010 (DEFERRED).

## 5. Tamper-Evidence / Integrity (HIGH)

### Gap
The log is "append-only" and idempotent, but never addresses tamper-evidence or detection.

### Decision
**DEC-AUTO-007:** Explicitly REJECT full Merkle hash-chaining for MVP (overkill for a small SaaS; introduces complexity and performance cost). Record lightweight alternative: periodic count/hash snapshot of latest event row anchored to R2 (WORM-style) for after-the-fact tamper detection if NPC audit or customer contract demands it.

## 6. Silent Event-Drop Risk (HIGH)

### Gap
Several write paths (`reusable-sources`, `apply.ts`, `express-promotion`) insert the event row **outside** the atomic mutation batch. If the second insert fails, the mutation succeeds but history is silently lost. The unique `correlation_id` index catches duplicates but not **missing** writes.

### Required additions
- **RISK-008:** non-atomic event writes can drop history on partial failure.
- **AC-024:** same-D1 batch/outbox plus reconciliation prevents or repairs the
  crash window, with idempotent retry and a redacted operator receipt.
- The existing `publication_digest_log` (logs delivery attempts) is a good precedent — generalize that pattern to history writes.

## 7. Notification Allowlist (HIGH)

### Current state
`maybeTriggerSharedLinkActivityDigest` exists for owner digest emails (rate-limited 1/15min per publication).

### Gap
No high-signal allowlist definition. A future engineer could wire immediate-email-on-every-comment (notification fatigue).

### Required addition
Document the notification hierarchy:
1. In-app unread badge/feed (pull) — existing.
2. Batched email digest — existing, correct baseline.
3. High-signal allowlist for immediate notification: **decision accepted/declined** > comment > open.
4. Webhooks — future-work.
5. Default to digest; escalate to immediate only for allowlist events.

## 8. Real-Time vs. Eventual Consistency (MEDIUM)

### Required addition
Document the consistency contract per surface:
- Owner activity feed = **eventual** (acceptable — pull-based, poll-on-focus).
- Client decision state = **strongly consistent** (already enforced via unique constraint + 409).
- Client activity feed = **eventual** (acceptable — reload to see updates).

## 9. Concurrent-Edit Coalescing (MEDIUM)

### Gap
The plan doesn't define whether rapid sequential edits by different actors on the same row produce N events or a coalesced event.

### Recommendation
Define per-actor per-row coalescing: same actor editing the same row within 5s = one event (via the `correlation_id` mechanism). Different actors = separate events.

## 10. Mobile/Responsive (LOW)

### Gap
Activity surfaces are desktop-first. Filter UIs, diff/snapshot rendering, and restore dialogs may break on mobile.

### Required addition
Record as conscious decision: "Activity modal and project feed are desktop-first for MVP. Responsive hardening is post-MVP." Consistent with "no visual redesign" non-goal.

## Summary: New Requirements And Decisions

| ID | Type | Priority | Description |
|---|---|---|---|
| REQ-016 | Requirement (DEFERRED) | P2 | Activity log export (CSV/JSON/PDF) |
| DEC-AUTO-006 | Decision | — | Document loose-TEXT actor_user_id as deliberate immutable-snapshot |
| DEC-AUTO-007 | Decision | — | Reject Merkle chaining for MVP; record R2-snapshot alternative |
| RISK-008 | Risk | OPEN | Non-atomic event writes can silently drop history |
| AC-022 | Criterion | — | Deleted actor events and retention/legal-hold fixtures remain safe and useful |
| AC-023 | Criterion | — | Multi-tenant isolation contract test passes |
| AC-024 | Criterion | — | Durable event delivery and reconciliation pass crash/retry tests |

## Integrated Execution Ownership

`UNIT-012` owns executable actor-lifecycle, retention, workspace-isolation, and
durable-delivery work at the existing activity repository/action boundaries and
`src/lib/compliance/retention-core.ts`. It must define TTL, legal hold,
anonymization/purge, export/erasure interaction, scheduled reconciliation,
backoff, retry, and cleanup tests. `REQ-016` export remains deferred and has no
implementation-ready claim in this slice.
