# UNIT-007 — Reply-all / forward + keyboard triage

## Goal
Add reply-all (Cc) and forward, plus keyboard triage, completing console
coherence.

## Status
`READY` · depends on: UNIT-002 · requirements: UX-001 · risks: RISK-004

## Owned paths
- `src/lib/admin/support-actions.ts` (write — **reread**, after UNIT-004)
- `src/components/admin/AdminSupportInbox.tsx` (write — **reread**, after UNIT-002/004/006)
- `src/components/admin/support/SupportRichComposer.tsx` (write — **reread**)

## Implementation boundary
1. Actions: accept `cc` on reply/new-email; persist `cc_json` (column exists);
   pass Cc to `dispatchSupportEmail`. Add `forwardSupportMessage` (new outbound
   to an arbitrary recipient copying body/attachments): in-thread forward keeps
   `References`/`In-Reply-To` (reuse `buildThreadingHeaders`); forward-out starts
   a new external conversation with a fresh routing token. All header text via
   `sanitizeHeaderText`.
2. UI: reply-all/forward controls in the thread header/composer; a To/Cc field
   for reply-all/forward.
3. Keyboard triage: j/k to move selection, e to archive (reuse
   `setConversationStatus`), r to focus reply, / to focus search — scoped to the
   inbox, no global capture; respect focus/ARIA.

## Verification
- `bun run type-check`, `bun run lint`.
- GATE-UX-01: keyboard/focus behavior; GATE-SEC-01: header safety on new
  recipients.

## Scope
In: reply-all/forward + keyboard triage. Out: labels/assignment/snooze (N1).

## Done criteria
- [ ] Reply-all (Cc) and forward send correctly and persist Cc/threading.
- [ ] Keyboard triage works without breaking focus/ARIA.
- [ ] type-check + lint clean; existing send lifecycle preserved.

## Recovery
Revert the three files (serialized last).
