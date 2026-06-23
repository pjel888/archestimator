# UX-035 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/share/[token]/
src/components/share/
src/lib/publication/
src/lib/share/
```

### How To Verify

```sh
for p in src/app/share/[token]/ src/components/share/ src/lib/publication/ src/lib/share/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Non-technical recipients can receive a share link without a dedicated first-run explanation of terms, totals, decisions, or next steps.

Evidence per audit:

> Second-pass client/recipient persona report.

---

## Related Tests

```sh
rg -l 'recipient first open summary' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Non-technical recipients can receive a share link without a dedicated first-run explanation of terms, totals, decisions, or next steps. | Client opens a share and can understand what is being requested without estimator context. |
| Fix path | (none / partial) | Add plain-language first-open summary, decision meaning, glossary/help copy, and next-step guidance. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
