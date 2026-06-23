# UX-032 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/workshop/projects/[projectId]/
src/lib/projects/
src/lib/publication/
src/lib/estimates/
```

### How To Verify

```sh
for p in src/app/workshop/projects/[projectId]/ src/lib/projects/ src/lib/publication/ src/lib/estimates/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

PM readiness is under-modeled; approvals, margin alerts, and lifecycle audit are later governance work.

Evidence per audit:

> Second-pass estimator/contractor persona report; project dashboard and share activity exist but not as approval governance.

---

## Related Tests

```sh
rg -l 'pm readiness governance' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | PM readiness is under-modeled; approvals, margin alerts, and lifecycle audit are later governance work. | PM or owner sees whether a project is ready to publish, who approved it, and what changed after issue. |
| Fix path | (none / partial) | Add a lightweight readiness checklist, notes, and owner-visible gaps. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
