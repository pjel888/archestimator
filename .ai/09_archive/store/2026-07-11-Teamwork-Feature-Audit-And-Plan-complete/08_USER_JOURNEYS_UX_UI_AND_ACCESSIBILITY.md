# User Journeys, UX, UI, and Accessibility

## Information Architecture

Create a dedicated internal **Team access** surface launched from the existing Users control in project chrome. Teamwork owns the component, DTO, and mutations. Publisher may link to or embed the same bounded component through `TEAMWORK-PUBLISHER-ACCESS-v1`; public recipient controls remain visually and semantically separate.

Recommended component home:

```text
src/components/workshop/teamwork/
```

Do not nest a Teamwork card inside a Publisher card. Use a drawer/sheet or full-width panel consistent with existing workshop primitives.

## Primary Views

### Project access

- Current members with trusted name, effective role, source, and accessible-scope summary.
- Manager-only email and action menu.
- Pending project invitations with delivery, expiry, copy, resend, and revoke states.
- Add known member and invite by email as separate commands.
- Role choices filtered by actor/target capability.
- Removal preview lists retained direct sheet access and offers explicit scope mode.

### Estimate access

- Inheritance control expressed as `Use project access` versus `Restricted to selected people`.
- Effective member list distinguishes inherited and direct grants.
- Direct role edit/removal controls for authorized sheet managers.
- Pending estimate invitations.
- Restriction confirmation previews who will lose access and requires a valid direct manager before commit.
- Removing a direct member shows whether inherited access remains.

### Presence

- Scoped avatars/initials with Online, Active here, Idle, and Offline semantics.
- Identity comes from the authorized roster.
- Sheet-only users see only the relevant estimate roster.
- The UI does not mark the current user online by default when realtime is disconnected.

## Manager Journey

1. Open Team access from project chrome.
2. See project members, effective sources, pending invites, and accessible estimates.
3. Add a known profile or invite an email.
4. Choose only assignable roles.
5. Receive an optimistic pending state only after the server returns a stable command result.
6. Copy/resend/revoke from the pending row.
7. Change a member role or remove access with an exact impact preview.
8. See Activity-confirmed lifecycle state after refresh.

Every control is capability-driven. A disabled control with useful explanation is acceptable for a visible boundary; a control that predictably yields a server denial is not.

## Restricted-Sheet Manager Journey

1. Open an estimate and choose Access.
2. Switch to Restricted.
3. The UI verifies or adds a direct owner/admin without silently promoting anyone.
4. Preview inherited users who will lose access.
5. Confirm one atomic server command.
6. Add/invite direct estimate members and change their roles.
7. Open the sheet as a direct sheet admin without project membership and manage only that sheet.
8. Confirm that other project sheets, rosters, and invitations are absent.

## Recipient Journey

1. Open a valid link and see a bounded preview.
2. Authenticate if required.
3. Return to the same preview, not an auto-accept GET.
4. Confirm acceptance by same-origin POST.
5. Enter the exact authorized project/sheet route.
6. On wrong account, switch accounts without seeing the invited email.
7. On revoked/expired/replayed link, see a stable state and no sensitive project details.

## Concurrent-Editor Journey

1. Two editors open the same estimate.
2. Each sees a trusted collaborator identity and connection state.
3. Cursors appear only after the socket is server-authorized.
4. Cursor movement is smooth, bounded, non-layout-shifting, and removed when stale.
5. Network interruption shows a quiet reconnect state and recovers before/after token refresh.
6. A viewer sees cursors but does not emit one.
7. Conflicting estimate edits use stable optimistic-concurrency UI: refetch authoritative data, preserve local input, and let the user reapply/copy.

## UI States

Every view/control must define:

- loading skeleton without layout shift;
- empty project member/invite/sheet state;
- capability-denied read-only state;
- offline/reconnecting/degraded presence state;
- validation error;
- conflict/manager-floor error;
- delivery failed with copy-link fallback;
- revoked/expired/superseded invitation;
- server error with retry where idempotent;
- success announcement and refreshed authoritative data.

## Accessibility

- Dialog/drawer focus is trapped, initial focus is intentional, and close restores the trigger.
- Icon-only controls use existing icon library and accessible names/tooltips.
- Menus, tabs, toggles, and confirmation dialogs follow their native/primitives semantics.
- Status is never communicated by color alone.
- Mutation results and connection changes use polite live regions; destructive failures use assertive announcement only when needed.
- Role/source labels fit narrow widths and wrap without overlapping actions.
- Cursor overlays are `pointer-events: none`, hidden from the accessibility tree as graphics, with separate concise live text for meaningful collaborator movement.
- Reduced motion disables interpolation and animated presence transitions.
- Keyboard users can complete invite, role, removal, revoke, restriction, and confirmation workflows.
- Touch users have no hover-only dependency and do not accidentally broadcast pointer cursors.

## Responsive Contract

- Desktop: roster/action table may use columns with stable widths.
- Narrow screens: each member becomes an unframed stacked row, not nested cards; actions move to a menu.
- Long names/emails/role reasons wrap or truncate with accessible full text.
- Confirmation copy and affected-sheet lists remain visible without horizontal scrolling.

## Copy Principles

- Say `Project access`, `Estimate access`, `Inherited`, and `Direct` rather than exposing internal table names.
- Explain retained access: `They will still have access through Workspace member`.
- Explain restriction: `Only people listed for this estimate will keep access`.
- Do not claim `editing` from cursor activity alone.
- Do not describe public Publisher recipients as team members.

## Browser Proof Boundary

DOM tests prove capability-filtered controls, states, focus, and announcements where practical. Browser proof is required only for interaction composition, responsive layout, two-client realtime, reconnect, and cross-route invitation journeys. No browser automation is required to validate this plan-only artifact.
