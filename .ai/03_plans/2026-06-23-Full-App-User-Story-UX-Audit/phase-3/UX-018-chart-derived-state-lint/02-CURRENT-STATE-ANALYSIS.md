# UX-018 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/charts/
src/components/workshop/project-charts/
src/lib/project-charts/
```

### How To Verify

```sh
for p in src/components/charts/ src/components/workshop/project-charts/ src/lib/project-charts/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Chart derived-state lint reds reduce confidence in the data/charts surface.

Evidence per audit:

> Test coverage/error map.

---

## Related Tests

```sh
rg -l 'chart derived state lint' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Chart derived-state lint reds reduce confidence in the data/charts surface. | Data views render without effect-driven derived-state lint failures. |
| Fix path | (none / partial) | Refactor chart state derivation and run focused chart UI/a11y/aggregation tests. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
