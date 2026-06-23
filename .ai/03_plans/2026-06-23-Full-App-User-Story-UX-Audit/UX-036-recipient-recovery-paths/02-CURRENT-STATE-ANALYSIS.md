# UX-036 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/share/[token]/
src/components/share/
src/app/api/share/[token]/
```

### How To Verify

```sh
for p in src/app/share/[token]/ src/components/share/ src/app/api/share/[token]/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Recipient session expiry, dead links, unsubscribe links, and asset/API failures are covered mechanically but not as recovery stories.

Evidence per audit:

> Second-pass client/recipient and route/API reports.

---

## Related Tests

```sh
rg -l 'recipient recovery paths' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Recipient session expiry, dead links, unsubscribe links, and asset/API failures are covered mechanically but not as recovery stories. | Recipient sees whether to retry, unlock, request a new link, or contact the owner. |
| Fix path | (none / partial) | Add recipient-facing recovery copy for expired session, invalid/revoked links, unsubscribe edge cases, and failed asset loads. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
