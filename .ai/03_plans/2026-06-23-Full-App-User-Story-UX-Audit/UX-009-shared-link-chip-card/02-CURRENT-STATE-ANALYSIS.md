# UX-009 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/LiveProjectCard.tsx
src/lib/publication/
```

### How To Verify

```sh
for p in src/components/workshop/LiveProjectCard.tsx src/lib/publication/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Project cards do not surface active shared-link status, making exposed client links hard to scan.

Evidence per audit:

> LiveProjectCard.tsx; publication tests; first-pass UX risk report item 03.

---

## Related Tests

```sh
rg -l 'shared link chip card' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Project cards do not surface active shared-link status, making exposed client links hard to scan. | Owner can identify externally shared projects before deleting, archiving, or reviewing privacy. |
| Fix path | (none / partial) | Add a low-noise shared-link chip with lock/open-count tooltip and manage-link shortcut. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
