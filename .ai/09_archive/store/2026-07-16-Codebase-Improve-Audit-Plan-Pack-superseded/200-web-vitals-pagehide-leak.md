# Plan UNIT-011: Remove the leaky `pagehide` listener in web-vitals-collector

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/components/web-vitals-collector.tsx`.

## Status
- **Priority:** P3 · **Effort:** S · **Risk:** LOW · **Depends on:** — · **Category:** reliability
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** NOT_REQUIRED (effect is `[]`-deps; verify by code inspection + type-check)

## Why this matters
`web-vitals-collector.tsx:157-160` registers an anonymous `pagehide` listener; the cleanup at `:162-168` removes `visibilitychange` but not `pagehide` (no reference kept). The effect runs with `[]` deps (`:169`), so in production it mounts once (minor), but under React 19 StrictMode dev double-invoke or any re-run, `pagehide` listeners accumulate and fire `reportCls`/`reportInp` multiple times per hide.

## Current state
- `src/components/web-vitals-collector.tsx:150-168` — `handleVisibility` (named, removed) + the anonymous `pagehide` arrow (not removed).

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |

## Scope
**In scope:** `src/components/web-vitals-collector.tsx` only.
**Out of scope:** the metrics themselves, reporting endpoints, observer wiring.

## Steps
### Step 1 — Hoist the handler
Replace the anonymous `pagehide` arrow with a named `const handlePageHide = () => { reportCls(); reportInp(); };`, register it, and `window.removeEventListener("pagehide", handlePageHide)` in the returned cleanup alongside the `visibilitychange` removal.
**Verify:** `bun run type-check` + `bun run lint` exit 0; both listeners are removed on cleanup.

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] Cleanup removes both `visibilitychange` and `pagehide`
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- The component's effect deps change from `[]` (e.g. it becomes parameterized) — re-evaluate listener lifecycle; the named-handler + cleanup pattern still applies.

## Maintenance notes
- Any new window/document listener in this effect must follow the named-handler + cleanup pattern.
