# UX-022 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/share/[token]/
src/components/share/
src/lib/publication/
src/app/api/share/[token]/
```

### How To Verify

```sh
for p in src/app/share/[token]/ src/components/share/ src/lib/publication/ src/app/api/share/[token]/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Expired, revoked, invalid, or password-locked share links can strand recipients without enough recovery copy.

Evidence per audit:

> PUB-001, PUB-002, SHARE-003, SHARE-004.

---

## Related Tests

```sh
rg -l 'share recovery copy' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Expired, revoked, invalid, or password-locked share links can strand recipients without enough recovery copy. | Recipient knows whether to wait, retry, or ask for a fresh link. |
| Fix path | (none / partial) | Add expired/revoked/request-new-link copy, lockout timer, and owner contact CTA. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
