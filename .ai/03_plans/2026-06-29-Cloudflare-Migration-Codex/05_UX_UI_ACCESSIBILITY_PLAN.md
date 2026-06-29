---
title: UX UI Accessibility Plan
plan_id: 2026-06-29-cloudflare-migration-codex
document: 05
---

# UX UI Accessibility Plan

## UX Position

This migration should initially be invisible to users. The first phases are provider, cost, and reliability work, not a redesign.

No new user-facing screens are required for Phase 0 through Phase 2 unless a migration slice exposes a new state that users must understand.

## UX Surfaces To Protect

Protected workshop:

- Login redirects.
- Closed-beta access states.
- Legal terms acceptance.
- Sensitive route cache control.
- Authenticated workshop shell.

Estimating:

- Optimistic row updates.
- Tree and grid interactions.
- Saved estimates and snapshots.
- Undo/rollback expectations in client state.

Collaboration:

- Presence.
- Realtime cursors.
- Invitations and pending-invite bridge.
- Role and permission feedback.

Publication:

- Public share token access.
- Password-protected shares.
- Recipient email composer.
- Comments, responses, and decisions.

Uploads:

- Image and attachment upload progress.
- Scan/cleanup states.
- Private asset access.
- Errors that allow retry without duplicate state.

Email:

- Link generation should continue even when email fails if that is current behavior.
- Delivery failure should remain operator-visible and user-safe.

## Accessibility Requirements

A migration must not degrade:

- Keyboard access to auth, workshop, share, upload, and email flows.
- Focus management on auth redirects and error states.
- Screen-reader-visible error messages.
- Form validation messages.
- Link and button semantics.
- Loading and pending states.

If future implementation introduces a migration-status UI, it must use existing `src/components/ui/` primitives where practical and follow `DESIGN.md` as an alpha guide, not a blocker.

## User-Facing Change Policy

Phase 0 and Phase 1 should have no intentional user-visible changes.

Phase 2 and later may expose:

- Slightly different upload error wording.
- Different retry timing for queued jobs.
- Different email delivery status if Cloudflare Email Service replaces Resend.
- Different realtime reconnect behavior if Supabase Realtime is replaced.

Any such change must have a before/after acceptance test and rollback note.

