# UX-010 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/ProjectEstimatesTable.tsx
src/hooks/use-estimate-query.ts
```

### How To Verify

```sh
for p in src/components/workshop/ProjectEstimatesTable.tsx src/hooks/use-estimate-query.ts; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Blank-cell create in estimate table is accessible but visually undiscoverable.

Evidence per audit:

> ProjectEstimatesTable.tsx; first-pass UX risk report item 06.

---

## Related Tests

```sh
rg -l 'blank row create affordance' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Blank-cell create in estimate table is accessible but visually undiscoverable. | User sees where to type to create another estimate. |
| Fix path | (none / partial) | Add visible New estimate placeholder or plus affordance in the first blank name cell. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
