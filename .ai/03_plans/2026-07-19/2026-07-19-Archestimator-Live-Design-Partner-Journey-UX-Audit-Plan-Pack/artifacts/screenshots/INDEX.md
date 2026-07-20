# Screenshots Index

**Captured: 0 screenshots.**

The browser audit harness (`/tmp/ux-audit.mjs`, Playwright 1.61.1 + Chromium
1228 headless) was run twice against `http://127.0.0.1:3020`. Every
`page.goto(...)` call timed out at 25 seconds waiting for `domcontentloaded`
because the dev server's webpack compile is poisoned by **UX-BUILD-001** (the
`action-inbox-actions.ts` `"use server"` async contract violation cascades
through the entire `src/app/**` module graph).

This zero-screenshot outcome is itself part of the evidence chain for
**UX-BUILD-001**: it is the BROWSER_CONFIRMED signature that no route is
reliably servable at HEAD. Decisive corroboration:

- `artifacts/build-failure-log.txt` — `bun run build` exits 1 with the exact
  Server Actions contract diagnostic.
- `artifacts/dev-server-runtime-log.txt` — HTTP 500 responses for
  `/workshop`, `/admin`, `/admin/today`, `/privacy`, `/security`,
  `/access-required`.
- `artifacts/console-network-summary.json` — 28 goto timeouts across every
  probed route.

## Re-audit plan after UNIT-001 (UX-BUILD-001) is implemented

Once the action-inbox actions are made `async` and `bun run build` exits 0,
re-run the harness:

```
PORT=3020 bun x next dev --webpack --port 3020 &
bun /tmp/ux-audit.mjs
```

Expected screenshots per journey (decision-points only):

- `J-01-discovery--01-landing-hero.png`
- `J-01-discovery--02-contact-form.png`
- `J-01-discovery--03-contact-form-filled.png`
- `J-02-invitation-auth--01-login.png`
- `J-02-invitation-auth--02-signup.png`
- `J-02-invitation-auth--03-invite-malformed.png`
- `J-02-invitation-auth--04-terms-gate.png`
- `J-03-first-workshop--01-workshop-home.png`
- `J-03-first-workshop--02-projects.png`
- `J-07-public-proposal--01-share-malformed.png`
- `J-07-public-proposal--02-share-malformed-mobile.png`
- `J-07-public-proposal--03-publisher.png`
- `J-09-founder-admin--01-admin-shell.png`
- `J-09-founder-admin--02-admin-today.png`
- `J-09-founder-admin--03-workshop-feedback.png`

Sanitization (already enforced by the harness): no cookies, tokens, auth
headers, magic links, or session state are written to the pack. Filenames use
abstract journey-step labels. Storage state is per-context ephemeral and is
discarded at journey end.

## No-JavaScript probes

No-JavaScript behavior was not separately captured because the harness was
blocked before reaching any state. The `src/app/share/[token]/page.tsx`
noscript fallback was source-traced and is exemplary; no defect observed.
