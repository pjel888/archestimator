# UX-027 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/ui/toast.tsx
src/app/providers.tsx
all toast callers
```

### How To Verify

```sh
for p in src/components/ui/toast.tsx src/app/providers.tsx all toast callers; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Global toast id collisions or short-lived notifications can hide critical async failures.

Evidence per audit:

> Toast story.

---

## Related Tests

```sh
rg -l 'toast scoped ids' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Global toast id collisions or short-lived notifications can hide critical async failures. | User does not miss a failed save because a toast was overwritten. |
| Fix path | (none / partial) | Use scoped fixed toast IDs for critical failures and non-shifting field/control affordances when local context is required. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
