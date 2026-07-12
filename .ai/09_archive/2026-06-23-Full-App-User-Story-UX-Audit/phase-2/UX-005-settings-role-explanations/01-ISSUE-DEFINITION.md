# 01-ISSUE-DEFINITION

> Date: 2026-06-23
> Issue: UX-005

---

## Problem Statement

In the Archestimator workshop, platform-admin capabilities (closed beta allowlist management and beta feedback review) are gated by role. Only users whose `profiles.role` is `"ceo"` or `"admin"` can see or interact with these tools. For all other roles (`"member"`, `"viewer"`, and any future roles), the "Beta operations" section is completely removed from the settings modal and the standalone settings pages show only a minimal denial message.

This invisibility creates three user-experience gaps:

1. **Discovery gap**: A regular member does not know the beta user management tool exists, so they cannot ask their admin to add a colleague.
2. **Ownership gap**: A regular member who encounters a beta access issue does not know who in their workspace can fix it.
3. **Support-path gap**: A regular member who lands on the beta feedback review page or beta users page sees only "Only platform admins can manage beta users" with no next action or contact affordance.

The current behavior is technically correct from a security perspective (role gating works), but it fails the content contract from `04-ux-state-accessibility-and-content-contracts.md`: every permission-denied state must name the current state, the owner, and the next action.

---

## Evidence

### SETTINGS-009 Report

The SETTINGS-009 finding from the first-pass UX risk audit noted that admin settings surfaces were not discoverable to non-admin users. The second-pass audit confirmed this remains unaddressed. No targeted test currently asserts that a non-admin user sees explanatory copy about hidden admin capabilities.

### Affected Personas

| Persona | Role likely | Impact |
|---|---|---|
| Primary App User (estimator, PM, business owner) | `member` or `viewer` | Cannot discover admin capabilities; blocked from knowing who can manage beta access. |
| Project Collaborator | `member` or `viewer` | Same as above if they navigate to settings. |
| Support/Admin Operator | `admin` or `ceo` | May receive confused support requests from members who do not know who can help. |

### Access-Path Mapping

Per `10-access-path-and-persona-taxonomy.md`:

- The relevant access path is **Primary App User** (signed-in workspace member).
- The authority source is workspace membership plus role.
- The current code enforces the authority correctly at the data layer (RLS plus server actions), but the UI layer fails to explain the authority boundary.

---

## Current Error In Detail

### Error 1: Settings modal silently omits the "Beta operations" group

In `src/components/workshop/WorkshopSettingsModalContentView.tsx` lines 274-276:

```tsx
const settingsGroups: readonly SettingsGroup[] = canManagePlatform
  ? [...baseSettingsGroups, platformSettingsGroup]
  : baseSettingsGroups;
```

When `canManagePlatform` is `false`, the `platformSettingsGroup` (containing "Beta users" and "Beta feedback") is simply not included. There is no placeholder, explanation, or support link.

### Error 2: Beta users page shows minimal denial copy

In `src/app/workshop/settings/beta-users/page.tsx` lines 80-85:

```tsx
{!queue.authorized ? (
  <section className="border border-hairline bg-white p-2">
    <p className="text-[10px] leading-4 text-tertiary">
      Only platform admins can manage beta users.
    </p>
  </section>
) : (
```

The copy names the restriction but does not explain what beta users are, who the admins are, or how to request action.

### Error 3: Beta feedback page shows minimal denial copy

In `src/app/workshop/settings/feedback/page.tsx` lines 72-77:

```tsx
{!queue.authorized ? (
  <section className="border border-hairline bg-white p-2">
    <p className="text-[10px] leading-4 text-tertiary">
      Only platform admins can review beta feedback.
    </p>
  </section>
) : (
```

Same gap as Error 2: no context, no owner identification, no support path.

### Error 4: Workspace settings page shows better but still incomplete copy

In `src/app/workshop/settings/workspace/page.tsx` lines 44-48:

```tsx
{disabled ? (
  <div className="rounded-xs border border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
    Only workspace owners and admins can edit workspace account settings.
  </div>
) : null}
```

This is closer to the target pattern (visible, contextual), but it still lacks a support path or identification of the current admins.

---

## Post-Fix Scenario

A regular member (`role = "member"`) opens the workshop settings modal. They see a read-only "Beta operations" section that lists the admin capabilities and explains that only platform admins can manage them. The member sees who the current admins are (or a generic "contact your workspace admin" path) and knows how to request help. If the member navigates directly to `/workshop/settings/beta-users` or `/workshop/settings/feedback`, they see the same explanatory copy plus a support link.

An admin (`role = "admin"`) sees no change: the Beta operations group remains fully interactive.

---

## Content Contract Violations

Per `04-ux-state-accessibility-and-content-contracts.md` section Content Contract:

| Situation | Current copy | Required copy |
|---|---|---|
| Missing workspace/permission | "Only platform admins can manage beta users." | Must name the current state, the owner, and the next action. |
| Support repair | None provided. | Must provide a support path or contact affordance. |

The current copy uses the forbidden pattern: "One generic workspace save error" (in spirit, if not exact wording) without next-action guidance.

---

## Related Issues

| Issue | Relationship | Coordination needed? |
|---|---|---|
| UX-001 (public copy readiness) | Both are copy/state hardening in the same conflict group. | No — disjoint surfaces. |
| UX-004 (root recovery boundaries) | Same conflict group. | No — disjoint surfaces. |
| UX-024 (AI disabled/quota copy) | Same conflict group. | No — disjoint surfaces. |
| UX-025 (feedback mailto fallback) | Same conflict group; feedback page is adjacent. | Yes — ensure the support link in UX-005 points to the same support surface as UX-025's fallback mailto. |
| UX-026 (feedback review pagination) | Adjacent surface (beta feedback review queue). | No — UX-026 changes queue behavior, not access-denied copy. |
| UX-027 (toast scoped ids) | Same conflict group. | No — disjoint surfaces. |

---

## Decision Status

This issue is **NOT decision-gated**. It is a straightforward copy/state hardening task with no product direction ambiguity. The only choice is the exact copy strings, which are specified in `03-TARGET-EXPERIENCE.md`.
