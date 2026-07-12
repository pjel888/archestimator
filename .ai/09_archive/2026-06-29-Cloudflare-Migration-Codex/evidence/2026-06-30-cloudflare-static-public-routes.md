# Cloudflare Static Public Routes Evidence

Generated: 2026-06-30T04:15:10Z

## Result

- Local static route build ready: yes
- Provider-backed: no
- Hosted ready: no

## Evidence

- Focused tests passed: 7 files / 32 tests.
- `bun run cf:build` passed.
- OpenNext/Next route table shows these public entry routes as static (`○`): `/`, `/about`, `/contact`, `/features`, `/login`, `/pricing`, `/privacy`, `/signup`, `/terms`, `/trust`.
- Expected dynamic routes remain dynamic: protected workshop routes, APIs, `/api/health`, and public share token routes.

## Source Contract

The public entry route files now avoid server request-time APIs (`next/headers`, `cookies()`, `headers()`, server `searchParams`) and no longer read landing auth state on the server. URL-specific public state moved to client Suspense islands for contact intent and auth query feedback.

## Blocker

This is local build evidence only. The updated Worker version has not successfully uploaded to Cloudflare yet, so hosted speed proof still reflects the previous deployment.
