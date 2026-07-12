# UX-037 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/share/[token]/
src/components/share/
src/app/api/share/[token]/
```

### How To Verify

```sh
for p in src/app/share/[token]/ src/components/share/ src/app/api/share/[token]/; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Recipient print, activity-feed completeness, comment retry, and decision retry are grouped too broadly under one share row.

Evidence per audit:

> Second-pass client/recipient persona report.

---

## Related Tests

```sh
rg -l 'recipient action retry' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Recipient print, activity-feed completeness, comment retry, and decision retry are grouped too broadly under one share row. | Recipient prints, loads older activity, and retries a failed decision/comment without losing context. |
| Fix path | (none / partial) | Split printable packet, activity transparency, and comment/decision retry into explicit acceptance criteria. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
