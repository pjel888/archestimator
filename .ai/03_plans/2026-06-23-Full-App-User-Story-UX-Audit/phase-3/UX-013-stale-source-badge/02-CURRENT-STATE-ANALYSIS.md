# UX-013 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/component-library/
src/lib/component-library/
src/hooks/
```

### How To Verify

```sh
for p in src/components/workshop/component-library/ src/lib/component-library/ src/hooks/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Stale library metadata or thumbnail mismatch can lead to wrong insert/replace choices.

Evidence per audit:

> Component insert story.

---

## Related Tests

```sh
rg -l 'stale source badge' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Stale library metadata or thumbnail mismatch can lead to wrong insert/replace choices. | User sees source freshness before committing replacement. |
| Fix path | (none / partial) | Show stale-source badge plus refresh/compare before replacing rows. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
