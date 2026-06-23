# UX-003 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/login/
src/lib/auth/
src/app/terms/
src/app/auth/callback/
```

### How To Verify

```sh
for p in src/app/login/ src/lib/auth/ src/app/terms/ src/app/auth/callback/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Terms acceptance can depend on service-role/env persistence; repeated failures can feel like a dead end.

Evidence per audit:

> AUTH-004, AUTH-005 report.

---

## Related Tests

```sh
rg -l 'terms persistence retry' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Terms acceptance can depend on service-role/env persistence; repeated failures can feel like a dead end. | User either persists acceptance, retries knowingly, or contacts support with context. |
| Fix path | (none / partial) | Show a fixed retry/support toast, support path, and include service-role readiness in launch checks. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
