# UX-043 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/proxy.ts
src/app/login/
src/app/auth/callback/
src/app/invite/[token]/
src/app/workshop/settings/workspace/
src/app/workshop/settings/profile/
```

### How To Verify

```sh
for p in src/proxy.ts src/app/login/ src/app/auth/callback/ src/app/invite/[token]/ src/app/workshop/settings/workspace/ src/app/workshop/settings/profile/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Auth redirect sanitization, broken invite repair, workspace settings saves, and role-aware account recovery are too broad in first-pass rows.

Evidence per audit:

> Second-pass UX issue completeness review.

---

## Related Tests

```sh
rg -l 'auth invite workspace recovery' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Auth redirect sanitization, broken invite repair, workspace settings saves, and role-aware account recovery are too broad in first-pass rows. | User and support can identify whether the issue is redirect, invite, workspace, role, or save failure. |
| Fix path | (none / partial) | Add or sharpen user-facing and admin-facing recovery states for next, invites, workspace/default workspace, profile, and account settings. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
