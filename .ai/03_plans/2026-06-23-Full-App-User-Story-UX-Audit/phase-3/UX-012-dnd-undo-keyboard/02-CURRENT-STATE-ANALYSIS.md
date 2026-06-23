# UX-012 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/ (estimate tree DnD)
src/lib/domain/
src/hooks/use-estimate-query.ts
```

### How To Verify

```sh
for p in src/components/workshop/ (estimate tree DnD) src/lib/domain/ src/hooks/use-estimate-query.ts; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Accidental drag/drop reorder is high-sensitivity despite rollback/toast behavior.

Evidence per audit:

> Estimate tree DnD story and tests.

---

## Related Tests

```sh
rg -l 'dnd undo keyboard' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Accidental drag/drop reorder is high-sensitivity despite rollback/toast behavior. | User can reverse accidental reorder and keyboard users have equivalent control. |
| Fix path | (none / partial) | Add clearer drop targets, keyboard reorder, and undo toast/time-limited rollback. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
