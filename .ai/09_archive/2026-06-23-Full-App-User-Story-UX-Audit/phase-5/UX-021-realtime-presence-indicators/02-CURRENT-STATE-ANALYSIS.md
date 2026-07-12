# UX-021 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/hooks/use-project-presence.ts
src/hooks/use-estimate-cursor-broadcast.ts
```

### How To Verify

```sh
for p in src/hooks/use-project-presence.ts src/hooks/use-estimate-cursor-broadcast.ts; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Realtime presence and cursors can become confusing under lag, disconnects, or stale sessions.

Evidence per audit:

> Collaboration/cursor story and tests.

---

## Related Tests

```sh
rg -l 'realtime presence indicators' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Realtime presence and cursors can become confusing under lag, disconnects, or stale sessions. | User sees stale/offline status rather than assuming collaborators are live. |
| Fix path | (none / partial) | Add disconnect/reconnect indicators and two-client E2E proof. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
