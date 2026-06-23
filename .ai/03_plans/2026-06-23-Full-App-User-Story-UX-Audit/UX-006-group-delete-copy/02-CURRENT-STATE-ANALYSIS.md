# UX-006 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/ManageGroupsPopover.tsx
src/lib/projects/
```

### How To Verify

```sh
for p in src/components/workshop/ManageGroupsPopover.tsx src/lib/projects/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Deleting a group uses compact confirmation but does not explain projects remain and move to Ungrouped.

Evidence per audit:

> src/components/workshop/ManageGroupsPopover.tsx; first-pass UX risk report item 02.

---

## Related Tests

```sh
rg -l 'group delete copy' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Deleting a group uses compact confirmation but does not explain projects remain and move to Ungrouped. | User deletes a group without fearing project deletion. |
| Fix path | (none / partial) | Replace icon-only confirm with copy: projects stay in workspace and move to Ungrouped. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
