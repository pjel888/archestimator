# UX-041 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv
.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/08-csv-schema-and-validation-contract.md
```

### How To Verify

```sh
for p in .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/08-csv-schema-and-validation-contract.md; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

First-pass spreadsheet wording sometimes overclaimed related component/contract tests as user-story proof.

Evidence per audit:

> Second-pass CSV evidence quality and test-loop reviews.

---

## Related Tests

```sh
rg -l 'evidence status vocabulary' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | First-pass spreadsheet wording sometimes overclaimed related component/contract tests as user-story proof. | Reader can tell whether a story is proven, partially covered, or still needs browser/provider proof. |
| Fix path | (none / partial) | Use evidence-status categories and targeted verification IDs; distinguish source review, related tests, browser proof, provider proof, and post-fix gaps. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
