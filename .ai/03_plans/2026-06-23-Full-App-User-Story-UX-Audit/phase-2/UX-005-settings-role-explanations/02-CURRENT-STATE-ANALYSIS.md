# 02-CURRENT-STATE-ANALYSIS

> Date: 2026-06-23
> Issue: UX-005

---

## Role Model

The Archestimator role model lives in two layers:

1. **Profile role** (`profiles.role`): `"ceo"`, `"admin"`, `"member"`, `"viewer"`.
2. **Workspace account role** (`workspace_accounts.role`): `"owner"`, `"admin"`, `"member"`, `"viewer"`.

For settings/admin discoverability, the gating functions are:

| Capability | Gating function | Role check | File |
|---|---|---|---|
| Platform admin (beta users, beta feedback) | `canManagePlatform` | `context.role === "ceo" \|\| context.role === "admin"` | `src/app/workshop/settings/page.tsx:8` |
| Closed beta allowlist | `canManageClosedBetaAllowlist` | `role === "ceo" \|\| role === "admin"` | `src/lib/auth/beta-allowlist-admin.ts:41-43` |
| Beta feedback review | `canReviewBetaFeedback` | `role === "ceo" \|\| role === "admin"` | `src/lib/workshop/beta-feedback-review.ts:29-31` |
| Workspace settings edit | `canManageWorkspaceAccountSettings` | `role === "owner" \|\| role === "admin"` | `src/lib/auth/account-data.ts:328-330` |

The profile role and workspace account role are related but not identical. The settings modal uses `canManagePlatform` (profile role). The workspace settings page uses `canManageWorkspaceAccountSettings` (workspace account role). For UX-005, the focus is on the platform-admin capabilities (beta users, beta feedback), which use the profile role.

---

## Settings Modal Current State

### File: `src/app/workshop/settings/page.tsx`

Lines 1-28 (complete file):

```tsx
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { WorkshopSettingsModal } from "@/components/workshop/WorkshopSettingsModal";
import { WorkshopSettingsModalContent } from "@/components/workshop/WorkshopSettingsModalContent";
import { requireCurrentUserContext } from "@/lib/auth/session";

export default async function WorkshopSettingsPage() {
  const context = await requireCurrentUserContext();
  const canManagePlatform = context.role === "ceo" || context.role === "admin";

  return (
    <WorkshopPageShell
      title="Settings"
      eyebrow="Workshop"
      breadcrumbs={["Settings"]}
      contentClassName="p-2"
    >
      <div className="h-full" aria-hidden="true" />
      <WorkshopSettingsModal
        initialOpen
        closeHref="/workshop/projects"
        trigger="none"
        location="Workshop / Settings"
      >
        <WorkshopSettingsModalContent canManagePlatform={canManagePlatform} />
      </WorkshopSettingsModal>
    </WorkshopPageShell>
  );
}
```

Key observation: `canManagePlatform` is computed once and passed as a boolean prop. The page itself does not render the modal content; it delegates to `WorkshopSettingsModalContent`.

---

## Settings Modal Content View Current State

### File: `src/components/workshop/WorkshopSettingsModalContentView.tsx`

This is the core file for the settings modal UX. It defines three settings groups:

- `accountSettings` (Profile, Workspace, Sign out) — lines 34-61
- `supportSettings` (Send feedback, Data requests, Terms and privacy) — lines 63-91
- `platformSettings` (Beta users, Beta feedback) — lines 93-112

The `platformSettings` group is conditionally appended at lines 274-276:

```tsx
const settingsGroups: readonly SettingsGroup[] = canManagePlatform
  ? [...baseSettingsGroups, platformSettingsGroup]
  : baseSettingsGroups;
```

When `canManagePlatform` is `false`, the `platformSettingsGroup` is entirely absent. The settings rail (left sidebar) only shows `accountSettings` and `supportSettings`. There is no placeholder, no explanation, and no support link for the missing group.

The `SettingsRail` component (lines 164-202) renders groups and pages. The `SettingsDetailPanel` component (lines 205-263) renders the detail view for the selected page. Neither component has a mode for read-only explanatory pages.

---

## Beta Users Page Current State

### File: `src/app/workshop/settings/beta-users/page.tsx`

This is a server component that renders the beta user allowlist management page.

Authorization check at lines 52-53:
```tsx
const queue = await readClosedBetaAllowlistQueue(params.status);
```

The `readClosedBetaAllowlistQueue` function in `src/lib/auth/beta-allowlist-admin.ts` lines 81-97 returns `{ authorized: false, error: null, rows: [] }` when the caller lacks the admin role.

The page renders the denial UI at lines 80-85:

```tsx
{!queue.authorized ? (
  <section className="border border-hairline bg-white p-2">
    <p className="text-[10px] leading-4 text-tertiary">
      Only platform admins can manage beta users.
    </p>
  </section>
) : (
  // ... full admin UI
)}
```

The denial copy is minimal: one sentence, no context, no support link, no identification of current admins.

---

## Beta Feedback Page Current State

### File: `src/app/workshop/settings/feedback/page.tsx`

This is a server component that renders the beta feedback review queue.

Authorization check at lines 44-45:
```tsx
const queue = await readBetaFeedbackReviewQueue(params.status);
```

The `readBetaFeedbackReviewQueue` function in `src/lib/workshop/beta-feedback-review.ts` lines 33-37 returns `{ authorized: false, error: null, submissions: [] }` when the caller lacks the admin role.

The page renders the denial UI at lines 72-77:

```tsx
{!queue.authorized ? (
  <section className="border border-hairline bg-white p-2">
    <p className="text-[10px] leading-4 text-tertiary">
      Only platform admins can review beta feedback.
    </p>
  </section>
) : (
  // ... full admin UI
)}
```

Same gap as the beta users page: minimal copy, no support path.

---

## Workspace Settings Page Current State

### File: `src/app/workshop/settings/workspace/page.tsx`

This page uses a different gating model: `canManageWorkspaceAccountSettings` (workspace account role, not profile role).

Authorization check at lines 15-16:
```tsx
const state = await getAccountSetupState();
const disabled = !state.canManageWorkspace;
```

The denial UI at lines 44-48:

```tsx
{disabled ? (
  <div className="rounded-xs border border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
    Only workspace owners and admins can edit workspace account settings.
  </div>
) : null}
```

This is slightly better than the beta pages: it uses a visually distinct `bg-surfaceMuted` background. However, it still lacks a support path or admin identification. UX-005 does not require changes to this page, but it serves as a reference for the desired visual treatment.

---

## Auth/Session Current State

### File: `src/lib/auth/session.ts`

The `CurrentUserContext` type (lines 8-15) includes:
```ts
export type CurrentUserContext = {
  userId: string;
  email: string;
  role: Tables<"profiles">["role"];
  profile: Tables<"profiles">;
  displayName: string;
  avatarUrl: string | null;
};
```

The `requireCurrentUserContext` function (lines 87-91) returns the full context, including `role`. This is already available in every settings page and in the settings modal page.

---

## Beta Allowlist Admin Current State

### File: `src/lib/auth/beta-allowlist-admin.ts`

The `canManageClosedBetaAllowlist` function (lines 41-43):
```ts
export function canManageClosedBetaAllowlist(role: string | null | undefined) {
  return role === "ceo" || role === "admin";
}
```

This is a pure function that can be reused on the client or server to determine visibility.

---

## Beta Feedback Review Current State

### File: `src/lib/workshop/beta-feedback-review.ts`

The `canReviewBetaFeedback` function (lines 29-31):
```ts
export function canReviewBetaFeedback(role: string | null | undefined) {
  return role === "ceo" || role === "admin";
}
```

Same pattern as the allowlist gating.

---

## Sidebar/Navigation Current State

The main sidebar (`src/components/sidebar/`) does not currently expose a direct link to `/workshop/settings/beta-users` or `/workshop/settings/feedback`. Users reach these pages through the settings modal or by direct URL. This means the primary discovery path for the beta operations pages is the settings modal itself, making the modal's omission of the group the highest-impact gap.

---

## Test Coverage Current State

Per `06-verification-matrix-and-proof-runbook.md`, the TV-WORKSHOP-ADMIN verification surface includes:

```sh
bunx vitest run tests/vitest/workshop-settings-modal-content-view.test.tsx tests/vitest/account-settings-form-fields-ui.test.tsx tests/vitest/closed-beta-allowlist-admin-ui.test.tsx tests/vitest/beta-feedback-review-ui.test.tsx
```

None of these tests currently assert that a non-admin user sees explanatory copy about hidden admin capabilities. The `workshop-settings-modal-content-view.test.tsx` likely tests the modal rendering for admin and non-admin roles, but only asserts presence/absence of groups, not explanatory copy.

---

## Summary Of Current Gaps

| Surface | File | Line(s) | Gap |
|---|---|---|---|
| Settings modal | `src/components/workshop/WorkshopSettingsModalContentView.tsx` | 274-276 | `platformSettingsGroup` silently omitted for non-admins. |
| Beta users page | `src/app/workshop/settings/beta-users/page.tsx` | 80-85 | Minimal denial copy, no support path. |
| Beta feedback page | `src/app/workshop/settings/feedback/page.tsx` | 72-77 | Minimal denial copy, no support path. |
| Test coverage | `tests/vitest/workshop-settings-modal-content-view.test.tsx` | unknown | No assertion for explanatory copy. |
