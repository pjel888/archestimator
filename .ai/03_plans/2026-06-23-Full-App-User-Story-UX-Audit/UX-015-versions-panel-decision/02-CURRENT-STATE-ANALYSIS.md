# UX-015 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/lib/estimates/
src/components/workshop/ (activity/version UI)
```

### How To Verify

```sh
for p in src/lib/estimates/ src/components/workshop/ (activity/version UI); do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Named-version UX is dormant/not discoverable in Activity if versioning becomes productized.

Evidence per audit:

> Version activity story.

---

## Related Tests

```sh
rg -l 'versions panel decision' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Named-version UX is dormant/not discoverable in Activity if versioning becomes productized. | User finds version controls intentionally rather than searching activity logs. |
| Fix path | (none / partial) | Create a separate Versions panel with compare and restore-as-copy status. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
