# Release Browser Matrix Proof - 20260622T102124Z

Status: pass for the automated release browser matrix.

Command:

```bash
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 \
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<local-dev-auth-bypass-secret> \
ARCHESTIMATOR_E2E_LIBRARY_RELEASE_PROOF=1 \
ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX=1 \
bun run test:e2e -- e2e/workshop-library-routes.spec.ts \
  -g "release matrix" --workers=1
```

Result: 21 Playwright tests passed in 3.9 minutes.

Projects:

- `chromium` at 1280x720.
- `firefox` at 1280x720.
- `webkit` at 1280x720.
- `mobile-safari` at 393x659.
- `iphone-se` at 320x568.
- `ipad` at 834x1194.
- `pixel-8-chrome` at 412x915.

Claims proven:

- `ADV-VISUAL-GLASS`: Overview, Components, and Templates routes arm
  `data-glass="ready"`, keep nested Library structural surfaces unblurred, and
  record paint/navigation evidence on every matrix project.
- `ADV-KEYBOARD-MGMT`: Add Component opens through keyboard activation on
  desktop projects and touch activation on mobile/tablet projects, moves focus
  into the dialog, locks background scroll, marks the workspace shell inert,
  restores focus after Escape, and keeps nested Escape layering intact.
- `ADV-VISUAL-DENSE-MOBILE`: RTL containment and coarse-pointer touch targets
  pass on the mobile/tablet projects, with no undersized `.workshop-liquid-button`
  targets in the recorded JSON.

Artifact root:

`_evidence/phase-final/browser-matrix/`

Representative artifacts:

- `library-release-glass-overview-chromium-1280x720-20260622T101740Z.{png,json}`
- `library-release-glass-components-webkit-1280x720-20260622T101915Z.{png,json}`
- `library-release-glass-templates-mobile-safari-393x659-20260622T101937Z.{png,json}`
- `library-release-add-component-portal-focus-ipad-834x1194-20260622T102053Z.json`
- `library-release-rtl-touch-targets-iphone-se-320x568-20260622T102028Z.{png,json}`
- `library-release-rtl-touch-targets-pixel-8-chrome-412x915-20260622T102124Z.{png,json}`

Notes:

- Mobile Safari used the harness touch-click fallback for dialog activation;
  the dialog focus, inert shell, scroll lock, Escape close, and focus-return
  assertions passed after activation.
- The run is automated functional/geometry proof with screenshots and JSON
  metadata. It is not a human visual-design approval.
