# UX-044 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/ProjectEstimatesTable.tsx
src/components/workshop/ (estimate sheet)
src/lib/domain/
```

### How To Verify

```sh
for p in src/components/workshop/ProjectEstimatesTable.tsx src/components/workshop/ (estimate sheet) src/lib/domain/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Estimate numeric validation and tree keyboard/focus paths need more explicit acceptance criteria.

Evidence per audit:

> Second-pass UX issue completeness review; estimate tree and cost tests are related but not complete proof.

---

## Related Tests

```sh
rg -l 'numeric validation a11y' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Estimate numeric validation and tree keyboard/focus paths need more explicit acceptance criteria. | Estimator enters invalid numbers or navigates the tree with keyboard and gets visible, recoverable feedback. |
| Fix path | (none / partial) | Add validation-specific messages, focus management, keyboard reorder semantics, and targeted estimate-sheet tests. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
