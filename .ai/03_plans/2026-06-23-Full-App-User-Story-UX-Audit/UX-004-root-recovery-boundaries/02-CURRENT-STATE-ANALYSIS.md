# UX-004 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/not-found.tsx
src/app/error.tsx
src/app/global-error.tsx
src/proxy.ts
```

### How To Verify

```sh
for p in src/app/not-found.tsx src/app/error.tsx src/app/global-error.tsx src/proxy.ts; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Root global error/not-found boundaries were noted as launch-readiness gaps.

Evidence per audit:

> Test coverage/error map.

---

## Related Tests

```sh
rg -l 'root recovery boundaries' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Root global error/not-found boundaries were noted as launch-readiness gaps. | Unexpected route/app failures show branded recovery instead of framework fallback. |
| Fix path | (none / partial) | Add root-level global-error, error, and not-found experiences with focused route tests. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
