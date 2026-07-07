# 05 — UX, UI, and Accessibility Plan

## Primary owner journey

```
1. Owner finishes an estimate (EstimateSheetContent)
2. Opens ProposalExportPreviewDialog (header FileXls button)
   └─ sees readiness warnings (UX-02) + "what the file contains"
3. Owner goes to project → Publisher drawer (or v1.1: clicks "Send / Publish" CTA in the dialog → drawer opens)
4. Publisher drawer: Preflight/Readiness surface (UX-01)
   ├─ blockers (destructive) disable Send
   └─ warnings (caution) allow Send
5. Sheets tab (existing SheetPickerList) — confirm selection
6. Recipients tab (RecipientEmailComposer)
   ├─ add recipients (emails)
   ├─ compose personal message (UX-03) [new]
   └─ Send → invitation email (with message)
7. Activity tab / notifications — see opens + decisions (delivery confirmation UX-06)
8. Stale? → republish (snapshot bumps, recipients re-invited via resend)
```

## Secondary journeys

- **Re-send to one recipient.** Drawer → Recipients tab → Resend on a row (confirm modal for opened/responded). Owner message reused (FR-05c). Disabled while a hard blocker is active (FR-09).
- **Revoke.** Drawer header → "Turn off link" → Confirm. Link 404s; recipient rows remain (shown as Revoked).
- **Rotate ("New link").** Drawer header → "New link" → Confirm. Old link stops resolving; recipients need re-send.
- **Recipient decides.** (Recipient-side; out of scope except for the `responded` write.) Owner sees the decision + `responded` status.
- **Read-only viewer** (role=viewer/editor). Drawer shows redacted link (existing). Preflight surface shows blockers/warnings but action buttons are disabled.

## State matrix

| State | Trigger | Owner-visible | Components |
|---|---|---|---|
| Loading (drawer) | open drawer | skeleton (existing `PublisherRosterSkeleton` style) | drawer |
| Loading (readiness) | drawer open + readiness prefetch | inline skeleton rows in Preflight area | new Preflight subcomponent |
| Ready (no blockers, no warnings) | readiness resolved clean | green "Ready to send" + enabled Send | Preflight |
| Ready with warnings | warnings only | caution list + enabled Send | Preflight |
| Blocked | ≥1 blocker | destructive list + disabled Send + per-blocker hint | Preflight |
| Stale snapshot | warning (S3a) | "Published snapshot is Nd behind the live estimate — republish to send the latest." | Preflight (reuses roster staleness) |
| Unsaved edits | warning (S3b) | "You have N unsaved edits in the estimate sheet — save before sending." | Preflight (reuses `countUnsavedEditableRows`) |
| Email not configured | blocker (if owner intends email) (S2d) | "Email delivery isn't configured. Copy the share link manually, or configure Cloudflare Email." + manual-copy fallback | Preflight + composer |
| No recipients | warning (S3e) | "No recipients yet — add at least one to email, or share the link directly." | Preflight + composer |
| Expired/revoked link | warning (S3d) | "This link is expired/revoked. Republish to reactivate." | Preflight |
| Send pending | mutation in flight | spinner + disabled actions (existing `publicationActionInFlightRef`) | drawer |
| Send success | mutation ok | toast success + status flips to `sent` (honest label) | composer |
| Send failure (email) | circuit open / provider error | toast error "Email couldn't be sent — recipient stays pending. Retry." | composer |
| Send failure (readiness) | FR-04 rejects | toast/inline "Cannot send: <blockers>" with per-item hint | Preflight |
| Recipient opened | webhook/event | status chip `opened` + timestamp | composer row |
| Recipient responded | decision submitted | status chip `responded` + decision badge | composer row |
| Recipient bounced | (future) webhook | status chip `bounced` + "bounced — verify address or resend" (REL-01 deferred) | composer row |
| Confirm destructive (resend opened/responded) | existing | modal: "their existing link stops working; status resets" | existing modal |
| Confirm destructive (revoke/rotate) | existing | modal with consequences | existing modal |

## Information hierarchy

- **Drawer header:** status badge, password pill, stale pill, Copy/Open link. (existing)
- **Preflight (new, prominent):** readiness summary line ("Ready" / "N blockers, M warnings") + expandable list. Always visible above tab content so the owner sees it before navigating tabs.
- **Tabs (existing order):** Overview, Recipients, Sheets, Access, Settings, Activity. Preflight is **not** a tab — it is a persistent panel so it can't be missed.
- **Recipients tab:** existing chip list + **new** collapsible "Add a personal message" (subject + body + char counts). Send button at the bottom (existing placement).

## Design-system reuse (no new primitives)

- Readiness checks: reuse the existing alert/status primitives in `src/components/ui/` (alert variants for destructive/caution/success). Do **not** invent a new "ReadinessCard" primitive if an alert + list fits.
- Preflight panel: reuse existing `Card`/`Section` patterns from the drawer.
- Message inputs: reuse existing `Input` + `Textarea` + char-count pattern (see `BetaFeedbackForm`/feedback modals for an existing char-count pattern).
- Status chips: reuse existing `RecipientEmailComposer` chip styling.
- Icons: reuse Phosphor icons already in the repo (`Warning`, `CheckCircle`, `XCircle`, `EnvelopeSimple`).
- `DESIGN.md` is alpha-stage guidance; defer to existing drawer/dialog patterns and Philip on visual decisions. Do not block on design-system grounds.

## Accessibility (A11Y)

| Requirement | Implementation |
|---|---|
| Keyboard path | Preflight is in tab order; each check is a row (not an interactive control) so it needs no focus — but the "fix" CTA per blocker (e.g., "Add recipients") is a real focusable link/button with an accessible name |
| Focus order | Preflight sits above tabs in DOM order so screen readers announce readiness before actions |
| Focus restoration | Existing drawer focus-trap preserved; new inputs join the trap order naturally |
| Screen-reader semantics | Preflight container = `role="status"` with `aria-live="polite"` for warning changes and `aria-live="assertive"` for blocker changes; each check uses `aria-label` or visible text |
| Status announcement | Send success/failure toasts use existing live-region toast behavior |
| Heading/title | Preflight has a visible heading ("Readiness") at the correct heading level for the drawer |
| Disabled-state semantics | Disabled Send/Resend/Revoke use `disabled` + `aria-disabled` + `title`/tooltip explaining why (link to the blocker id) |
| Non-color cues | Blockers (destructive tone) always include an icon + text, not color alone |
| Reduced motion | No new animation; existing drawer transitions respected |
| Contrast | Reuse existing alert variants (already contrast-compliant) |
| Responsive | Drawer already mobile-gated (<768px → empty state). Preflight inherits this; no new mobile work |
| Localization | All new copy in plain strings (no new i18n plumbing); English-only consistent with current surface |

## UX regressions to avoid

- Do not move existing Publish/Republish/Revoke button placement such that muscle-memory breaks.
- Do not change the existing recipient chip interaction model (add/remove/resend confirm) — only **add** the message fields.
- Do not change the export dialog's existing "what the file contains" structure — only **add** readiness hints alongside.
- Do not auto-dismiss blockers; they must persist until resolved.
- Do not introduce a new "proposal" entity noun in the UI that conflicts with the existing "publication"/"shared link" vocabulary — keep terminology consistent with the existing drawer.

## User-facing documentation implications

- A short help note (in-app, tooltip or help link) explaining the honest meaning of `sent` vs `opened` vs `responded` (since "delivered to inbox" is not provable today). DOC-01 records the current-state log update; a user-facing help doc is optional (P2).
