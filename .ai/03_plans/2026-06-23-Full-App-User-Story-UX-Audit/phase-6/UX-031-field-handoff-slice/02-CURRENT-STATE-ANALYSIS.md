# UX-031 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/lib/collaboration/
src/lib/publication/
src/app/invite/[token]/
src/app/share/[token]/
```

### How To Verify

```sh
for p in src/lib/collaboration/ src/lib/publication/ src/app/invite/[token]/ src/app/share/[token]/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Contractor/builder and field-operator handoff workflows are implied by collaboration/share primitives but not mapped to explicit access-path user journeys.

Evidence per audit:

> Second-pass estimator/contractor persona report; collaboration and share paths exist but do not name contractor/builder or field-operator workflow semantics.

---

## Related Tests

```sh
rg -l 'field handoff slice' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Contractor/builder and field-operator handoff workflows are implied by collaboration/share primitives but not mapped to explicit access-path user journeys. | After cohort expansion, a field recipient can receive a scoped shared-link field package with explicit permissions, audit trail, and rollback proof. |
| Fix path | (none / partial) | Preserve the selected later shared-link field package slice; do not implement field package code, new roles, or RLS changes in Wave 1. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
