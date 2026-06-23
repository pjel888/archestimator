# UX-024 — Current State Analysis

Date: 2026-06-23

## Affected Source Paths (candidate set)

```
src/app/api/ai/ask/
src/app/api/ai/package-builder/
src/lib/ai/
env: ARCHESTIMATOR_AI_ENABLED
NEXT_PUBLIC_ASK_FLIP_UI_ENABLED
```

### How To Verify

```sh
for p in src/app/api/ai/ask/ src/app/api/ai/package-builder/ src/lib/ai/ env: ARCHESTIMATOR_AI_ENABLED NEXT_PUBLIC_ASK_FLIP_UI_ENABLED; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

AI feature flags, quota, provider failures, or draft expiry can feel silent or confusing.

Evidence per audit:

> AI stories.

---

## Related Tests

```sh
rg -l 'ai disabled quota draft states' tests/ 2>/dev/null
```

Per the [Keystone](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md):

- `tests/vitest/` — 429 files
- `tests/unit/` — 5 files
- `e2e/` — 21 files

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | AI feature flags, quota, provider failures, or draft expiry can feel silent or confusing. | User understands AI availability and why apply is disabled or expired. |
| Fix path | (none / partial) | Add beta label, disabled-state reasons, quota/provider status, draft expiry countdown, and recovery path. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
