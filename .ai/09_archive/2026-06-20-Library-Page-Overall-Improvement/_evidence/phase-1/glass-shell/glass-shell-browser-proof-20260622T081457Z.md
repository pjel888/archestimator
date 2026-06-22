# Phase 1 Glass Shell Browser Proof - 20260622T081457Z

Status: partial pass for `ADV-VISUAL-GLASS`.

Command:

```bash
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 \
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<local-dev-auth-bypass-secret> \
bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "proves library glass shell"
```

Result: 1 Chromium test passed.

Artifacts:

- `_evidence/phase-1/glass-shell/library-phase1-glass-shell-chromium-1280x720-20260622T081457Z.png`
- `_evidence/phase-1/glass-shell/library-phase1-glass-shell-chromium-1280x720-20260622T081457Z.json`

Proven browser claims:

- `/workshop/library/components` rendered with `data-library-surface="glass"`.
- `<html data-glass="ready">` was armed before the assertion completed.
- The outer workspace shell had one real browser backdrop filter:
  `blur(18px) saturate(1.45)`.
- Inner Library glass slots did not add a second `backdrop-filter`:
  `.estimate-glass-well`, `.estimate-glass-rail`, `.estimate-glass-paper`,
  and `.estimate-glass-chrome` all resolved to `none`.

Remaining release blockers:

- This is Chromium desktop shell proof only.
- Safari/iOS, Chrome Android, RTL, touch-target, contrast, component-card,
  template-card, drawer, and modal glass matrix proof remains unrun.
- This does not claim React Profiler, GPU, or paint-time budget compliance.
