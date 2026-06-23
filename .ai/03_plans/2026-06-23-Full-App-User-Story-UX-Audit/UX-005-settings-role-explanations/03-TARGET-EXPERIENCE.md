# 03-TARGET-EXPERIENCE

> Date: 2026-06-23
> Issue: UX-005

---

## Design Principle

The target experience follows the content contract from `04-ux-state-accessibility-and-content-contracts.md`: every permission-denied state must name the current state, the owner, and the next action. The fix is read-only: no new capabilities, no permission changes, only explanatory copy and support links.

The visual treatment should match the existing workspace settings denial pattern (`bg-surfaceMuted`, bordered box) rather than the minimal plain-text pattern used on the beta pages today.

---

## Target Flow

### Flow 1: Settings Modal (Primary Discovery Path)

1. A regular member (`role = "member"`) clicks "Settings" in the workshop shell.
2. The settings modal opens.
3. The left rail shows three groups: "Account", "Support and legal", and **"Beta operations (admin only)"**.
4. The member clicks "Beta operations (admin only)".
5. The detail panel shows a read-only explanation of the two admin capabilities with a support link.
6. The admin capabilities are listed but not interactive (no links to the actual admin pages).

### Flow 2: Direct Navigation To Beta Users Page

1. A regular member navigates directly to `/workshop/settings/beta-users` (e.g., from a bookmark or shared link).
2. The page loads and shows the workshop shell with the "Beta users" title.
3. Below the title, a read-only explanation box appears:
   - What beta users are.
   - Who can manage them.
   - How to request help.
4. No admin UI (table, forms) is rendered.

### Flow 3: Direct Navigation To Beta Feedback Page

1. A regular member navigates directly to `/workshop/settings/feedback`.
2. The page loads and shows the workshop shell with the "Beta feedback" title.
3. Below the title, a read-only explanation box appears:
   - What beta feedback review is.
   - Who can review it.
   - How to request help.
4. No admin UI (submissions table, status filters) is rendered.

---

## Explicit Copy Strings

These are the exact copy strings to implement. They are English-only per the closed-beta i18n deferral decision (`DEC-UX-I18N` in `09-decision-ledger.md`).

### Copy Set A: Settings Modal Read-Only Group

**Group title in rail:**
```
Beta operations
```

**Group subtitle in rail (optional, if the design supports it):**
```
Admin only
```

**Detail panel heading:**
```
Beta operations
```

**Detail panel category label:**
```
Admin only
```

**Detail panel description:**
```
These tools manage the closed beta program. Only platform admins can add beta users or review feedback.
```

**Detail panel "This page controls" list items:**
```
Closed beta allowlist
Beta feedback triage
```

**Detail panel action box heading:**
```
Need help with beta access?
```

**Detail panel action box description:**
```
Contact your workspace admin or email support@archestimator.com.
```

**Detail panel action box button:**
```
Contact support
```

### Copy Set B: Beta Users Page Denial State

**Box heading:**
```
Beta user management
```

**Box description:**
```
Beta user management controls who can join the Archestimator closed beta. Only platform admins can add, activate, or revoke beta access.
```

**Box secondary text:**
```
If you need to invite a colleague or change your beta status, contact your workspace admin or reach out to support.
```

**Box link:**
```
support@archestimator.com
```

**Box link label:**
```
Contact support
```

### Copy Set C: Beta Feedback Page Denial State

**Box heading:**
```
Beta feedback review
```

**Box description:**
```
Beta feedback review lets admins triage authenticated feedback from beta testers. Only platform admins can change feedback status.
```

**Box secondary text:**
```
If you submitted feedback and want to follow up, contact your workspace admin or reach out to support.
```

**Box link:**
```
support@archestimator.com
```

**Box link label:**
```
Contact support
```

---

## Visual Treatment

The read-only explanation boxes should use the existing design-system patterns:

- Container: `rounded-xs border border-hairline bg-surfaceMuted p-2`
- Heading: `text-[10px] font-medium leading-4 text-ink`
- Description: `text-[10px] leading-4 text-secondary`
- Secondary text: `text-[10px] leading-4 text-tertiary`
- Link: inline link or button using the existing secondary button style

This matches the workspace settings denial treatment at `src/app/workshop/settings/workspace/page.tsx` lines 44-48.

---

## Accessibility Requirements

Per `04-ux-state-accessibility-and-content-contracts.md`:

- The read-only explanation must be focusable and readable by screen readers.
- The settings modal rail group heading must use the existing `h4` with `id` pattern for aria-labelledby.
- The detail panel must use the existing `section` with `aria-labelledby` pattern.
- No new live regions are required because this is static content.
- The contact support link must have a visible focus ring (`focus-visible:ring-2 focus-visible:ring-focus`).

---

## State Matrix For Target Experience

| Surface | Actor | Entry point | Loading | Empty | Partial/stale | Validation error | Pending | Success | Failure | Permission denied | Provider unavailable | Conflict | Destructive confirm | Recovery action | Required copy | A11y behavior | Test proof |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Settings modal | Primary App User (member) | Settings trigger | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Read-only "Beta operations" group with explanation and support link | n/a | n/a | n/a | Contact support link | State plus owner plus next action | Focusable rail item and detail panel | TV-WORKSHOP-ADMIN |
| Beta users page | Primary App User (member) | Direct URL or settings modal | Workshop shell loads | n/a | n/a | n/a | n/a | n/a | n/a | Read-only explanation box with support link | n/a | n/a | n/a | Contact support link | State plus owner plus next action | Focusable explanation box | TV-WORKSHOP-ADMIN |
| Beta feedback page | Primary App User (member) | Direct URL or settings modal | Workshop shell loads | n/a | n/a | n/a | n/a | n/a | n/a | Read-only explanation box with support link | n/a | n/a | n/a | Contact support link | State plus owner plus next action | Focusable explanation box | TV-WORKSHOP-ADMIN |

---

## Copy Consistency Rules

1. Use "platform admin" (not "workspace admin") for the beta operations pages, because the gating is on `profiles.role` (`ceo`/`admin`), not `workspace_accounts.role` (`owner`/`admin`).
2. Use "workspace admin" (or "workspace owner or admin") for workspace settings pages, because the gating there is on `workspace_accounts.role`.
3. Do not name specific individuals ("Contact Philip") unless the workspace admin list is already available in the UI. Generic "contact your workspace admin" is sufficient for beta.
4. The support email `support@archestimator.com` is already used in `src/components/workshop/WorkshopSettingsModalContentView.tsx` line 76 (`data-requests` page href). Reuse it.

---

## Alternative Approaches Considered

| Approach | Rejected? | Why |
|---|---|---|
| Show admin pages as disabled/interactive but blocked on submit | Yes | Creates false affordances; violates the anti-slop bar against disabled buttons with no reason. |
| Show admin pages with "Request access" button that sends a notification | Yes | Requires new notification infrastructure, new data model, and product decision. Out of scope for P2 copy hardening. |
| Show a generic "Admin tools" placeholder with no specifics | Yes | Does not resolve the discovery gap; members still don't know what capabilities exist. |
| List admin capabilities in a help doc instead of the UI | Yes | Moves the fix out of the direct path; the content contract requires the explanation to appear at the point of denial. |
| Add real-time admin names from workspace membership | Yes | Requires new data fetch and UI surface; the generic "contact your workspace admin" path is sufficient for P2. |

The chosen approach (read-only group in modal plus explanation boxes on pages) is the minimum viable fix that satisfies the content contract without adding new data models, notifications, or product surfaces.
