# UX-019 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/ (location/map components)
src/lib/projects/
env: NEXT_PUBLIC_GOOGLE_MAPS
```

### How To Verify

```sh
for p in src/components/workshop/ (location/map components) src/lib/projects/ env: NEXT_PUBLIC_GOOGLE_MAPS; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Google Maps/Places key, quota, script, or billing failures are external-provider dependent.

Evidence per audit:

> MAP-001 report and tests.

---

## Related Tests

```sh
rg -l 'maps location fallback' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Google Maps/Places key, quota, script, or billing failures are external-provider dependent. | User can edit location even when map provider is unavailable. |
| Fix path | (none / partial) | Add provider readiness banner and address-only fallback/edit path. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
