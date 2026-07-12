# UX-028 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
tests/vitest/
tests/unit/
e2e/
package.json (validate script)
scripts/enforce-app-design-system.mjs
```

### How To Verify

```sh
for p in tests/vitest/ tests/unit/ e2e/ package.json (validate script) scripts/enforce-app-design-system.mjs; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Broad bun run validate and all-DOM runs are known red/hanging, reducing confidence in full-app status.

Evidence per audit:

> Test coverage/error map and FAST PATH state.

---

## Related Tests

```sh
rg -l 'qa route manifest' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Broad bun run validate and all-DOM runs are known red/hanging, reducing confidence in full-app status. | Operator can run meaningful targeted suites and distinguish app failures from suite instability. |
| Fix path | (none / partial) | Maintain route-specific test manifest, quarantine slow/hanging suites, and fix known lint/test reds. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
