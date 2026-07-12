# UX-007 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/ProjectDetailsModal.tsx
src/components/ui/modal.tsx
```

### How To Verify

```sh
for p in src/components/workshop/ProjectDetailsModal.tsx src/components/ui/modal.tsx; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Project details modal can close on backdrop/Escape while edits or uploads are unsaved.

Evidence per audit:

> src/components/workshop/ProjectDetailsModal.tsx; first-pass UX risk report item 05.

---

## Related Tests

```sh
rg -l 'dirty modal close intercept' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Project details modal can close on backdrop/Escape while edits or uploads are unsaved. | User editing metadata or uploading an image chooses save, stay, or discard. |
| Fix path | (none / partial) | Track dirty/upload state and intercept close with discard-confirm dialog. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
