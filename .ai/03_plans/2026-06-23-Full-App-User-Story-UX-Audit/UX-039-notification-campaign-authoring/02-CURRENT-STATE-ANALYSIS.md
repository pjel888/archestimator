# UX-039 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/workshop/notifications/
src/lib/email/
src/app/api/ (notification endpoints)
```

### How To Verify

```sh
for p in src/app/workshop/notifications/ src/lib/email/ src/app/api/ (notification endpoints); do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Release announcement authoring, preview, targeting, and delivery inspection are not distinct operator stories.

Evidence per audit:

> Second-pass admin/support/operator report; notification consumer tests exist.

---

## Related Tests

```sh
rg -l 'notification campaign authoring' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Release announcement authoring, preview, targeting, and delivery inspection are not distinct operator stories. | Release operator previews a campaign, verifies target users and safe link, then inspects delivery state. |
| Fix path | (none / partial) | Add campaign authoring/preview/targeting and delivery inspection rows with safe CTA validation. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
