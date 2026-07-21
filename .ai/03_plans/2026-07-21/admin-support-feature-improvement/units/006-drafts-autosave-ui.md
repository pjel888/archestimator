# UNIT-006 — Draft API, autosave, attachment ownership, resume, and discard

## Goal and status

`READY` · dependencies: UNIT-004, UNIT-005 · requirements: DATA-003 · risks: RISK-003

Make reply/new-email drafts durable through a no-store admin API with visible
revision conflicts and coherent D1/R2/send cleanup.

## Owned paths

- new `src/app/api/admin/support/drafts/route.ts`
- new `src/app/api/admin/support/drafts/[id]/route.ts`
- `src/app/api/admin/support/uploads/route.ts`
- `src/app/api/internal/upload-cleanup/route.ts`
- `src/lib/email/support-outbound-attachments.ts`
- `src/lib/admin/support-actions.ts` (reread after UNIT-004)
- `src/components/admin/support/SupportRichComposer.tsx` (reread after UNIT-004)
- `src/components/admin/AdminSupportInbox.tsx` (reread after UNIT-002/004)

## Implementation boundary

1. Create draft before upload; every CRUD/upload route uses admin mutation/read
   gates, validates UUID/revision/body sizes, and emits no-store responses.
2. Upload accepts draft id, verifies D1 owner, writes owner-scoped R2, then binds
   the child row. If row binding fails, delete the exact just-written object.
3. Debounce autosave, serialize per-draft writes, and send expected revision.
   Surface saving/saved/conflict/degraded states; never silently overwrite on 409.
4. Hydrate reply/new drafts, list Drafts as draft entities, and support discard.
5. Send accepts authoritative draft id, claims its revision/lifecycle, reloads
   all fields server-side, preflights every R2 object, and creates or reuses the
   draft's stable outbound message/conversation. Repeat requests are idempotent.
6. Refactor attachment promotion to validate all sources before final writes,
   compensate partial final writes, and consume draft staging only after the
   message/body/final attachments are durable. Provider failure retains a failed
   message; retry reloads its persisted identity/recipients/attachments and does
   not create another thread or send a body edited after the original attempt.
7. Discard/privacy erase delete exact database-owned R2 keys and rows. Extend the
   existing bounded upload-cleanup route/dry-run with stale draft candidates;
   repair stale `sending` claims and do not add a cron or scan arbitrary R2 prefixes.

## Acceptance evidence

- Source proves older autosaves cannot overwrite newer revisions.
- Raw client R2 keys are not authoritative send inputs.
- Partial promotion and provider failure have explicit recoverable states; retry
  preserves the original persisted body, recipients, From, and attachments.
- Draft send/discard/privacy/cleanup paths reconcile D1 and exact R2 objects.
- Type/static/lint checks are clean; browser/local-D1 tests remain gated.

## Recovery and completion

Serialized integration. Complete when AC-003 is source-proven and UNIT-007 can
reuse durable To/Cc/identity/attachment state.
