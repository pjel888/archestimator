# UX-014 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/lib/estimates/
src/lib/domain/
src/components/workshop/ (row history)
```

### How To Verify

```sh
for p in src/lib/estimates/ src/lib/domain/ src/components/workshop/ (row history); do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Missing or malformed historical snapshots can appear as absence of history.

Evidence per audit:

> Row detail/version story.

---

## Related Tests

```sh
rg -l 'history unavailable reason' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Missing or malformed historical snapshots can appear as absence of history. | User understands why older source details cannot be rendered. |
| Fix path | (none / partial) | Show an unavailable snapshot reason in row history. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
