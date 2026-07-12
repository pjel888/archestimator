# UX-042 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/ (route tree)
src/app/api/ (route tree)
src/app/api/webhooks/resend/
```

### How To Verify

```sh
for p in src/app/ (route tree) src/app/api/ (route tree) src/app/api/webhooks/resend/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Route/API coverage had gaps and one Resend webhook path typo.

Evidence per audit:

> Second-pass route-feature review.

---

## Related Tests

```sh
rg -l 'route api inventory' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Route/API coverage had gaps and one Resend webhook path typo. | Route inventory matches current app entry points and does not send operators to the wrong webhook path. |
| Fix path | (none / partial) | Add explicit invite, workshop component/template, asset API, share events, and root recovery rows; correct Resend path to /api/webhooks/resend. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
