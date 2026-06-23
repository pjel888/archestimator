# UX-001 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/page.tsx
src/app/about/page.tsx
src/app/features/page.tsx
src/app/pricing/page.tsx
src/app/contact/page.tsx
src/components/landing/
```

### How To Verify

```sh
for p in src/app/page.tsx src/app/about/page.tsx src/app/features/page.tsx src/app/pricing/page.tsx src/app/contact/page.tsx src/components/landing/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Public marketing or pricing copy can drift ahead of implemented closed-beta capability.

Evidence per audit:

> Public route inventory; landing/public tests.

---

## Related Tests

```sh
rg -l 'public copy readiness' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Public marketing or pricing copy can drift ahead of implemented closed-beta capability. | A visitor sees implemented, beta, and planned claims clearly separated. |
| Fix path | (none / partial) | Keep feature maturity labels synchronized with the canonical CSV and require a route-copy readiness review before public updates. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
