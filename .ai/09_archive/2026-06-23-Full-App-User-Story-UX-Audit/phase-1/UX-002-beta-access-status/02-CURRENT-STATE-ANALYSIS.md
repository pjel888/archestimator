# UX-002 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/login/
src/lib/auth/
src/app/workshop/settings/admin/
src/proxy.ts
```

### How To Verify

```sh
for p in src/app/login/ src/lib/auth/ src/app/workshop/settings/admin/ src/proxy.ts; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Denied or revoked beta users have no in-app status tracker beyond email/manual support.

Evidence per audit:

> AUTH-002, AUTH-003 report.

---

## Related Tests

```sh
rg -l 'beta access status' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Denied or revoked beta users have no in-app status tracker beyond email/manual support. | A denied user sees whether access is pending, revoked, or unsupported and what happens next. |
| Fix path | (none / partial) | Add an access-request status, admin queue visibility, or explicit support workflow. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
