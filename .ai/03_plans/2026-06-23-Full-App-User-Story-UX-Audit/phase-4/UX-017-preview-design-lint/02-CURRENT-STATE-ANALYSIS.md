# UX-017 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/components/workshop/ProposalExportPreviewDialog.tsx
scripts/enforce-app-design-system.mjs
```

### How To Verify

```sh
for p in src/components/workshop/ProposalExportPreviewDialog.tsx scripts/enforce-app-design-system.mjs; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

ProposalExportPreviewDialog is listed in known broad design-lint reds.

Evidence per audit:

> Test coverage/error map.

---

## Related Tests

```sh
rg -l 'preview design lint' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | ProposalExportPreviewDialog is listed in known broad design-lint reds. | Preview hierarchy passes design lint and is easier to scan. |
| Fix path | (none / partial) | Simplify preview dialog to design-system patterns and rerun focused design lint. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
