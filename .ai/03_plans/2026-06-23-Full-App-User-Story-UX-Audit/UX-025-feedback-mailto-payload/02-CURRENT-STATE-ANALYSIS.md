# UX-025 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/workshop/feedback/page.tsx
src/lib/workshop/beta-feedback.ts
```

### How To Verify

```sh
for p in src/app/workshop/feedback/page.tsx src/lib/workshop/beta-feedback.ts; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Beta feedback fallback mailto does not preserve the typed payload when persistence fails.

Evidence per audit:

> src/app/workshop/feedback/page.tsx; src/lib/workshop/beta-feedback.ts; first-pass UX risk report item 04.

---

## Related Tests

```sh
rg -l 'feedback mailto payload' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Beta feedback fallback mailto does not preserve the typed payload when persistence fails. | Tester opens a prefilled email containing message, category, severity, page, and sender. |
| Fix path | (none / partial) | Build fallback mailto from submitted payload and authenticated email, with URL-length safeguards. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
