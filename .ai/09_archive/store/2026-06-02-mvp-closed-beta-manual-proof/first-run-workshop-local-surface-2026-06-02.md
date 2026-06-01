# First-Run Workshop Local Surface Evidence

Date: 2026-06-02
Scope: local source and DOM proof only.
Result: pass, 3 files / 20 tests.

## What This Proves

- `ensureDefaultWorkspace()` fallback and reuse behavior is already covered by `tests/vitest/auth-onboarding-guard.test.ts`.
- `WorkshopHomebaseClient` renders an actionable empty homebase when the workspace has no projects, no estimates, no pending invites, and no favorites.
- The empty homebase keeps direct route tiles for `/workshop/projects`, `/workshop/library`, and `/workshop/templates`.
- The empty Favorites panel shows explicit empty project and estimate-sheet states.
- Ask Flip remains hidden in this first-run local surface.

## Command

```bash
bun run test:dom tests/vitest/auth-onboarding-guard.test.ts tests/vitest/workshop-reset.test.tsx tests/vitest/closed-beta-readiness-docs.test.ts
```

Vitest result: pass, 3 files / 20 tests in 2.97s.

## Launch Meaning

This narrows the first-run workspace row to a local pass for fallback workspace code and the empty Workshop homebase surface. It does not prove hosted Google OAuth, allowlist behavior, Vercel env configuration, production cookies, session expiry/logout, or a real fresh beta account reaching `/workshop` without dev-auth. Hosted first-run smoke remains a closed-beta **NO-GO** gate.
