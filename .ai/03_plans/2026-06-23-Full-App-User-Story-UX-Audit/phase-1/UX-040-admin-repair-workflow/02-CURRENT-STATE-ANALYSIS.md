# UX-040 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/workshop/settings/admin/
src/lib/auth/
src/lib/collaboration/
src/app/invite/[token]/
```

### How To Verify

```sh
for p in src/app/workshop/settings/admin/ src/lib/auth/ src/lib/collaboration/ src/app/invite/[token]/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Beta cohort operations and admin repair for invites, revoked access, and missing workspace/default workspace failures are under-modeled.

Evidence per audit:

> Second-pass admin/support/operator and UX issue reviews.

---

## Related Tests

```sh
rg -l 'admin repair workflow' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Beta cohort operations and admin repair for invites, revoked access, and missing workspace/default workspace failures are under-modeled. | Support can diagnose why a user is blocked and record the repair action. |
| Fix path | (none / partial) | Add cohort/invite-wave dashboard and admin repair workflow for access, invite, membership, and workspace failures. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
