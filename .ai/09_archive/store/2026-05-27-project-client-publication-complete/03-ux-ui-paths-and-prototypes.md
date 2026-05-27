# UX UI Paths And Text Prototypes

**Date:** 2026-05-27
**Status:** Implemented V1 UX authority. The live manager UI uses `Public link`, `Public client link`, `Generate public link`, `Update public page`, `New link`, and `Turn off link`.

## Header Placement

The project header right action slot should compose two groups:

```txt
[left project code]            [optional estimate metadata]       [Publish group] [Teamspaces group]
```

Teamspaces remains the rightmost collaboration group. `Publish` sits immediately to its left.

Compact target:

```txt
| Publish [status/copy/settings] | Teamspaces [avatars/settings] |
```

## Header State Matrix

| State | Header label | Supporting signal | Primary action |
| --- | --- | --- | --- |
| No permission | `Public link` hidden or disabled | Tooltip says owner/admin required | None |
| Unpublished | `Public link` | muted link icon | Open settings |
| Generating | `Public link` | spinner | Disabled |
| Link live, not opened | `Public link` | copy icon, `Not opened yet` tooltip | Copy link |
| Link live, opened | `Public link` | latest-open tooltip | Copy link |
| Password enabled | `Public link` | lock icon | Open settings |
| Expired | `Expired` | warning token only | Open settings |
| Revoked/unpublished | `Public link` | muted link icon | Open settings |
| Snapshot stale | `Update public page` or settings badge | last published timestamp | Open settings |
| Tracking unavailable | `Public link` | neutral warning tooltip | Open settings |

## Header Design Constraints

- Use the existing compact app/workshop design system from `DESIGN.md`.
- Use shared primitives before feature-local controls.
- Visible app/workshop text stays within the 8px to 12px product scale.
- Border radius remains `rounded-xs` / `3px`.
- Icons use regular outline weight.
- Do not push, resize, or cover the left project code region.
- Do not disturb the center estimate metadata strip on estimate routes.
- If the right slot is narrow, collapse secondary text before moving Teamspaces.
- Teamspaces remains the visual right edge.

## Shared Primitive Mapping

| Need | Use or extend |
| --- | --- |
| Main modal/dialog | existing `Modal` primitive |
| Buttons and icon buttons | `src/components/ui/button.tsx` |
| Text inputs/password inputs | shared control input primitives when available |
| Selects | shared `ControlSelect` pattern |
| Status chips | shared `Badge` or compact status primitive |
| Copy confirmation | aria-live status message |
| Empty state | shared `EmptyState` if available |

Do not add raw feature-local button/search/input patterns if an existing shared primitive fits.

## Public Link Modal Anatomy

Recommended modal:

```txt
+----------------------------------------------------------------+
| Public client link                                      [close] |
+----------------------+-----------------------------------------+
| Status               | Public link                             |
| Link live            | [https://.../share/token.............]   |
| Snapshot: today      | [Open] [Copy] [New link]                |
| Opened: 3 times      |                                         |
|                      | Included content                        |
| Access               | (x) Project overview                    |
| Password: On         | (x) ES-001 Main Estimate                |
| Expires: Never       | ( ) ES-002 Client Option                |
|                      |                                         |
| Tracking             | Security                                |
| Latest open: today   | [Password toggle] [Expiry select]       |
| Raw events: 90 days  |                                         |
|                      | Actions                                 |
|                      | [Turn off link] [Update public page]    |
+----------------------+-----------------------------------------+
```

Do not place this inside the Teamspaces modal.

## Manager Modal States

| State | Required UI |
| --- | --- |
| Empty | `Create a public link`, short helper, `Generate public link` button |
| Draft settings | selected estimates, password/expiry inputs, publish button |
| Generating | controls disabled, progress status |
| Link live | URL, open, copy, new-link, turn-off, snapshot timestamp |
| Opened | open count and latest-open timestamp |
| Password on | password status, replace-password action, no reveal |
| Expired | unavailable status, extend expiry or unpublish |
| Revoked | no active URL, option to publish a new link |
| Save failed | inline error, no partial secret display |
| Tracking unavailable | neutral warning and retry hint |
| No sheets | project overview only, estimate selector disabled |
| No permission | read-only status or hidden controls |

## Text Prototypes

Empty state:

```txt
Create a public link
Anyone with this link can view this project page.

[Generate public link]
```

Published state:

```txt
Public link
https://app-domain/share/...

Status: Link live
Snapshot: May 27, 2026, 2:14 PM
Opened: Not opened yet
Password: Off
Expires: Never

[Open] [Copy] [New link]
[Turn off link]
```

Update state:

```txt
Last published snapshot
May 27, 2026, 2:14 PM

Internal changes after this time are not visible to this public link until you update the public page.

[Update public page]
```

Opened state:

```txt
Opened: 3 times
Latest open: Today, 2:14 PM
Tracking: Best-effort signal
```

Password manager state:

```txt
Password protection
[toggle on]

New password
[password input]

Receiver must enter this password before viewing the link. Passwords are not recoverable.
```

Password receiver state:

```txt
Password required
Enter the password provided by the sender.

[password input]
[Continue]
```

No project name, estimate total, preview row, image, or internal metadata appears before password validation passes.

## Receiver Route Prototype: Project Package

```txt
+----------------------------------------------------------------+
| Archestimator                                                  |
+----------------------------------------------------------------+
| Lewis Residence                                                |
| Project code: AE-LR-001                                        |
| Published: May 27, 2026, 2:14 PM                               |
| Prepared for: Lewis Family                                     |
|                                                                |
| Included estimates                                             |
| ----------------------------------------------------------------|
| Estimate              Total                 Detail              |
| ES-001 Main Estimate  PHP ...               Summary + rows      |
| ES-002 Client Option  PHP ...               Summary only        |
|                                                                |
| Notes                                                          |
| [published inclusions/exclusions only]                         |
+----------------------------------------------------------------+
```

## Receiver Route Prototype: Estimate Section

```txt
Lewis Residence / ES-001 Main Estimate
Total: PHP ...

Summary by space
---------------------------------------------------------------
Group                         Amount
House                         PHP ...
Services House                PHP ...

Line items
[only if included in snapshot permissions]
```

## Receiver Unavailable State

Use the same generic page shape for invalid, revoked, expired, deleted, wrong-password lockout, or unauthorized links:

```txt
This link is unavailable
The project owner may have changed, expired, or removed this link.
```

Do not confirm whether a project, estimate, or publication exists.

## Copy Matrix

| Context | Use | Avoid |
| --- | --- | --- |
| Header inactive | `Public link` | `Share` |
| Header active | `Public link` | `Public access` |
| URL field | `Public link` | `Project share link` |
| Teamspaces URL field | `Private project link` | `Share link` |
| Open tracking | `Opened` | `Reviewed`, `approved`, `accepted` |
| Snapshot | `Published snapshot` | `Issued proposal` |
| Update snapshot | `Update public page` | `Sync live` |
| Revoke | `Turn off link` | `Delete client` |
| Rotate | `New link` | `Reset share` |

## Accessibility And Interaction Notes

- Header buttons need aria labels that distinguish public/client publication from private collaboration.
- Copy actions need visible or aria-live confirmation.
- Password gate must be keyboard navigable and must not reveal hidden data in labels, page title, metadata, or source-rendered text.
- Modal focus starts at title or first actionable control.
- Revocation, rotation, and republish require confirmation because they affect external links.
- Do not rely on color alone for status.
- Browser QA must cover keyboard copy, password submit, wrong-password handling, and modal focus return.
