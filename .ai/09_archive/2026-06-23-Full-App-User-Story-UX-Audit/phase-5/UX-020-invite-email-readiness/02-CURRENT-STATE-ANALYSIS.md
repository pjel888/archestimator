# UX-020 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/lib/collaboration/
src/lib/email/
src/app/invite/[token]/
src/components/workshop/ (invite UI)
```

### How To Verify

```sh
for p in src/lib/collaboration/ src/lib/email/ src/app/invite/[token]/ src/components/workshop/ (invite UI); do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Invite email delivery can be disabled or fail externally.

Evidence per audit:

> Collaboration and publication reports.

---

## Related Tests

```sh
rg -l 'invite email readiness' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Invite email delivery can be disabled or fail externally. | Inviter knows whether email was sent and invitee has a reliable link. |
| Fix path | (none / partial) | Show delivery readiness, copy-link fallback, and resend status. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
