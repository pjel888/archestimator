# UX-008 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/BulkDestructivePreviewModal.tsx
src/components/ui/modal.tsx
```

### How To Verify

```sh
for p in src/components/workshop/BulkDestructivePreviewModal.tsx src/components/ui/modal.tsx; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Destructive preview modal can present irreversible delete/archive as an ordinary dialog if destructive tone is not passed.

Evidence per audit:

> BulkDestructivePreviewModal.tsx; modal.tsx; first-pass UX risk report item 01.

---

## Related Tests

```sh
rg -l 'destructive modal tone' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Destructive preview modal can present irreversible delete/archive as an ordinary dialog if destructive tone is not passed. | User and assistive tech receive high-priority destructive semantics. |
| Fix path | (none / partial) | Pass tone destructive for destructive operations and assert alertdialog in tests. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
