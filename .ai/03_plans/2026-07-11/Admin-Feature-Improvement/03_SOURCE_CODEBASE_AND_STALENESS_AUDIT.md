# Source, Codebase, and Staleness Audit

## Audit Timestamp and Authority

Audit date: 2026-07-11 Asia/Manila. Current worktree source, migrations, focused tests, and canonical `.ai` state govern implementation facts. The archived 2026-07-10 Admin Dashboard pack is historical design evidence, not current completion proof.

## Scoped Baseline Pathspecs

The implementation lead must recompute `PLAN-PACK-SCOPED-BASELINE-v1` over this exact ordered, duplicate-free list before edits and after any drift:

1. `src/app/admin`
2. `src/app/api/admin`
3. `src/components/admin`
4. `src/lib/admin`
5. `src/lib/auth`
6. `src/lib/notifications`
7. `src/features/notifications`
8. `src/lib/repositories`
9. `src/lib/activity`
10. `src/lib/compliance`
11. `src/lib/cloudflare`
12. `src/lib/email`
13. `src/app/workshop/settings`
14. `src/components/workshop`
15. `src/hooks`
16. `migrations`
17. `tests/vitest`
18. `worker.ts`
19. `wrangler.jsonc`
20. `package.json`
21. `.ai/09_archive/store/2026-07-11-Activity-History-Mapping-complete`
22. `.ai/03_plans/2026-07-10/Beta-Operating-Contract`
23. `.ai/03_plans/2026-07-10/Beta-Readiness-Program`
24. `.ai/03_plans/2026-07-11/Corporate-Accounts`
25. `.ai/03_plans/2026-07-11/Teamwork-Feature-Audit-And-Plan`
26. `.ai/10_state/current-state.md`

The manifest baseline binds the current planning snapshot. It grants no implementation authority and must not be silently refreshed after source drift.

## Existing Admin Inventory

Routes and real current status:

| Route | Current capability | Material gap |
| --- | --- | --- |
| `/admin` | health probes, incidents, 30d signup count, approximate chart, provider links | active teams missing; signup trend approximate; binding checks are not end-to-end health |
| `/admin/users` | first 50 profiles, client search, status/session summary | searched repository path red; no server pagination/filter; profile-only identity universe |
| `/admin/users/[userId]` | profile/status, active session count, corporate memberships, admin-actor timeline | timeline is not product activity; dates mislabeled; no security/session/member/product drilldown |
| `/admin/accounts` | corporate account CRUD/status/member/workspace surfaces | owned by concurrent Corporate pack; must consume, not redesign |
| `/admin/support` | D1 thread and reply scaffold | no assignment/SLA/tags/notes/escalation/attachments/email ingestion proof |
| `/admin/notifications` | immediate broadcast to all active profiles | no manager lifecycle/history/schedule/targeting/metrics/retry/cancel |
| `/admin/flags` | D1 flags and maintenance toggle | maintenance unenforced; most flags reserved or fragmented |
| `/admin/audit` | placeholder component | hardcoded fake rows despite real repository |
| `/admin/observability` | recent D1 rows and docs links | no trends, alerts, DLQ, drilldown, provider readiness, user correlation |
| `/admin/analytics` | provider link-outs/configured labels | no product analytics or hosted provider reads |

## Identity and User-Lifecycle Facts

- Better Auth runtime D1 `user` is the canonical identity with `createdAt`; `session` retains active session metadata and raw secrets that must not be exposed.
- `profiles` is the app authorization/person projection with `role`, `default_workspace_id`, and `account_status`.
- `user_onboarding_profiles` stores persona/onboarding facts.
- Current user lists enumerate `profiles`, so a Better Auth identity without a profile is invisible to admin and broadcasts.
- `src/lib/auth/session.ts` can synthesize an in-memory active member profile if no D1 profile exists, creating a reconciliation gap.
- `profiles.created_at` is currently called signup/joined; this may be provision or backfill time.
- current `MAX(session.updatedAt)` is restricted to unexpired sessions and changes on Better Auth update cadence; it is not durable last use.
- current auth audit records initiation but does not provide a complete durable successful-login writer.
- current GlobalPresence broadcasts a total count, not per-user online identity.

## Activity Sources Available for User 360

- `estimate_sheet_events` actor facts;
- `collaboration_audit_events` invitation/membership facts;
- component library telemetry;
- AI action/data-access metadata;
- upload session/event actor facts;
- account security events;
- support conversations/messages;
- beta feedback;
- notification delivery/engagement timestamps;
- client errors and web vitals;
- admin audit actor/target facts;
- workspace, project, estimate, corporate, and publication entity lifecycles.

These have different scopes, redaction, retention, deletion, and trust properties. A raw `UNION` is rejected; use versioned adapters or a normalized read model.

## Confirmed Current Defects

1. Searched user SQL placeholder order and bound values disagree in `src/lib/admin/users-repository.ts`.
2. `setUserAccountStatus` ignores affected-row count and returns success for a missing user.
3. Account status changes do not revoke stored Better Auth sessions.
4. Peer privileged operators can be targeted; only self-targeting is denied.
5. User activity reads only `admin_audit_events WHERE actor_user_id = ?`.
6. `/admin/audit` renders hardcoded placeholder data.
7. notification title/action label bounds differ between UI/action and active D1 schema.
8. notification enums and action link are not fully validated before D1.
9. generated admin broadcast delivery IDs may not pass the inbox UUID gate.
10. notification definition, fanout, and audit are separate writes; failure can leave residue.
11. broadcast retry has no stable idempotency key.
12. general feed does not enforce starts/expiry consistently; toast semantics are unproven.
13. audit actor FK cascade can delete privileged history with a profile.
14. audit write failures can be ignored after successful mutations.
15. API user/signup routes are degraded placeholders.
16. maintenance mode is visible but not enforced.

## Fresh Test Evidence

- Independent identity/activity lane: admin user, notification action, and admin shell focus produced 13 passes and 1 failure; the failure reproduced searched-user bind order.
- Independent notification lane: notification action/query/UI suites passed 30 tests; no focused admin broadcast integration test existed.
- Independent admin lane: nine admin-focused files produced 24 passes and 2 failures; failures were searched-user bind order and stale flag audit expectation.

These are planning evidence only. They do not prove implementation readiness or hosted behavior.

## Data-Lifecycle Conflicts

- notification delivery has no profile FK and may orphan after identity deletion;
- support rows cascade with profile deletion;
- admin audit rows cascade with actor deletion;
- estimate activity has legal-hold/anonymization machinery while most admin sources do not;
- the retention schedule is draft/counsel-gated and User 360 sources lack complete classification;
- DSAR coverage is partial.

## Stale Triggers

- any pathspec baseline mismatch;
- new/renumbered migration or migration lease generation;
- Better Auth version/config/schema change;
- Activity, Corporate, Teamwork, Beta Operating, observability, or retention manifest/hash change;
- notification schema/repository/inbox behavior change;
- admin route/navigation/action/repository change;
- Cloudflare binding/cron/queue change;
- changed focused test baseline.

On a trigger, append an observation, classify affected requirements, re-audit, then refresh hashes only after dependent claims are invalidated and reproven.
