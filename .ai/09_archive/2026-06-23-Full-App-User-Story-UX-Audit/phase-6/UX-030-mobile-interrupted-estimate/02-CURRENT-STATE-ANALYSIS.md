# UX-030 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/hooks/use-estimate-query.ts
src/lib/estimates/
src/app/workshop/projects/[projectId]/estimates/[nodeId]/
```

### How To Verify

```sh
for p in src/hooks/use-estimate-query.ts src/lib/estimates/ src/app/workshop/projects/[projectId]/estimates/[nodeId]/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Estimator mobile, low-bandwidth, interrupted-draft capture is not a distinct story.

Evidence per audit:

> Second-pass estimator/contractor persona report; estimate sheet tests are mostly desktop/component oriented.

---

## Related Tests

```sh
rg -l 'mobile interrupted estimate' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Estimator mobile, low-bandwidth, interrupted-draft capture is not a distinct story. | Estimator starts a rough estimate on a constrained device, is interrupted, returns, and sees unsaved or saved draft state explained. |
| Fix path | (none / partial) | Add mobile/resume draft acceptance criteria, offline-friendly draft buffering decision, and focused estimate-sheet smoke for interrupted edit recovery. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
