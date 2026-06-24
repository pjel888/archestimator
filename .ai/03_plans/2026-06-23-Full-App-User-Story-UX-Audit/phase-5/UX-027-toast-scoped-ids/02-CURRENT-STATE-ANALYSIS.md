# UX-027 — Current State Analysis

Date: 2026-06-23 (toast primitive state refreshed 2026-06-24)

## Affected Source Paths (candidate set)

Primary surfaces (verified present 2026-06-24):

```
src/components/ui/toast.tsx
src/app/providers.tsx
src/components/workshop/component-library/index.tsx        # production prior art
all toast callers
```

Recent commits affecting the toast surface:

- `1582b617` feat(ui): add optional action button to Toast notifications
- `52010190` chore(eslint): ban native browser prompt, confirm, and alert APIs
- `dc529267` feat(workshop): add folder rename, loading skeletons, and toast migration to component library sidebar

### How To Verify

```sh
for p in src/components/ui/toast.tsx src/app/providers.tsx \
         src/components/workshop/component-library/index.tsx; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
rg -n 'no-restricted-globals|no-restricted-properties' eslint.config.mjs
rg -n 'PROJECT_SOURCES_LOAD_TOAST_ID|toast\(\{' src/components/workshop/component-library/index.tsx
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Toast primitive capabilities as of 2026-06-24 (`src/components/ui/toast.tsx`):

- `ToastInput` accepts `{ id?, message, tone?, durationMs?, action? }`.
- `action: { label, onClick }` is supported (commit `1582b617`) — retry/undo affordances can live inside the toast.
- `makeToastId()` generates random IDs by default; scoped IDs are opt-in via the `id` field.
- Tones: `neutral`, `loading`, `success`, `error` with distinct default durations.
- `dismissToast(id)` and `clearToasts()` APIs present.
- Max 4 visible toasts.

ESLint enforcement (commit `52010190`):

- `no-restricted-globals` and `no-restricted-properties` ban `prompt` / `confirm` / `alert` on `window` / `globalThis` / `self` in `src/**/*.{js,jsx,ts,tsx}`. The no-shift toast contract is now machine-enforced — any new code that tries to fall back to a native prompt for transient feedback will fail lint.

Production prior art (commit `dc529267`):

- Component-library sidebar migrated from inline sr-only `lastActionMessage` status text to `toast({...})` with tone derived by `getSidebarActionToastTone`.
- `PROJECT_SOURCES_LOAD_TOAST_ID` constant demonstrates the scoped-ID pattern (a retry-action toast for project sources load failure).
- `toast({ action: { label: 'Undo', onClick } })` demonstrates the action-button undo flow in production.

Evidence per audit:

> Toast story.

---

## Related Tests

```sh
rg -l 'useToast|toast scoped|ToastProvider' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md) (re-derive live counts during Wave 0):

- `tests/vitest/` — keystone cites 429; current filesystem = 418 (drift noted in [LOOP_LEDGER.md § Audit Pass](../../LOOP_LEDGER.md#audit-pass-2026-06-24))
- `tests/unit/` — 5 files (matches keystone)
- `e2e/` — keystone cites 21; current filesystem = 22

Existing coverage for the sidebar migration lives in `tests/vitest/component-library-ui.test.tsx` and `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx` (per commit `dc529267`).

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Toast primitive supports scoped IDs + action buttons; one production caller demonstrates the pattern; ESLint bans native prompts. Other callers still use default random IDs. | User does not miss a failed save because a toast was overwritten. Scoped IDs adopted per-caller for critical async failures. |
| Fix path | Partial — primitive ready; per-caller adoption incomplete. | Issue-local toast IDs for critical failures; non-shifting field/control affordances when local context is required. No global caller sweep unless a caller is directly in the failing story (scope lock). |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
