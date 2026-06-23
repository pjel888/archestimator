# UX-016 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/lib/proposal-export/
src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/
```

### How To Verify

```sh
for p in src/lib/proposal-export/ src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Large proposal export can fail with 413 without enough preflight guidance.

Evidence per audit:

> Export story and route tests.

---

## Related Tests

```sh
rg -l 'export preflight' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Large proposal export can fail with 413 without enough preflight guidance. | User knows the workbook is too large before waiting on failed export. |
| Fix path | (none / partial) | Add preflight size estimate and split-export guidance before download. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
