# CSP Decision Brief (OPEN-DEC-007 / OPEN-DEC-008)

**Status:** OPEN. This is an engineering decision brief, not owner sign-off.
**Date:** 2026-07-05
**Source pack:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Program/`
**Relevant requirement:** REQ-002 / P0.2, global enforced CSP with nonces.

## Current code reality

`next.config.ts` is the current security-header control surface:

- `/share/:path*` has enforced `Content-Security-Policy` plus `Cache-Control: no-store` and hardening headers.
- landing routes (`/`, `/about`, `/features`, `/pricing`, `/contact`) have `Content-Security-Policy-Report-Only`.
- `/workshop/:path*` and `/invite/:path*` have hardening headers plus `Content-Security-Policy-Report-Only`.
- `/:path*` catch-all applies global hardening headers only: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and HSTS.
- The catch-all intentionally carries no CSP, matching `tests/vitest/landing-security-headers.test.ts`.

This means the shipped local state is **baseline global hardening plus staged CSP**, not full P0.2 completion. The plan requirement still expects enforced CSP globally, nonces, removal of `unsafe-inline` / `unsafe-eval`, and a clean telemetry window.

## OPEN-DEC-007 - CSP enforcement location

Recommended default: keep CSP policy generation in `next.config.ts` until a per-request nonce pipeline is designed.

Reasoning:

- Current tests already assert the route matrix from `next.config.ts`.
- OpenNext/Cloudflare Worker deployment can preserve these static headers without adding Worker-side response rewriting.
- Strict CSP with nonces is not static; that later step likely needs middleware/request-time integration or a Worker response wrapper. Treat that as a separate implementation plan before changing the enforcement surface.

Rejected for now:

- Edge-only rewrite in the generated Worker: higher risk because it changes OpenNext output behavior and is harder to test locally.
- Immediate global enforced CSP in `next.config.ts`: would retain `unsafe-inline` / `unsafe-eval` and would not satisfy REQ-002's nonce requirement.

## OPEN-DEC-008 - Third-party allowlist

Current allowlist in `next.config.ts` covers:

- Cloudflare Web Analytics: `static.cloudflareinsights.com`, `cloudflareinsights.com`, `*.cloudflareinsights.com`
- Google Analytics / Tag Manager: `www.googletagmanager.com`, `www.google-analytics.com`, `region1.google-analytics.com`
- Microsoft Clarity: `www.clarity.ms`, `*.clarity.ms`
- Google Maps / Places for workshop routes: `maps.googleapis.com`, `maps.gstatic.com`, `*.googleapis.com`, `*.gstatic.com`, `*.google.com`, `*.ggpht.com`, `*.googleusercontent.com`
- Dev-only Impeccable live origin: `http://localhost:8400` when `NODE_ENV=development`

Recommended default:

- Keep `/share` map-free and tracking-free.
- Keep workshop/invite CSP Report-Only until telemetry is observed.
- Do not add new analytics, error reporting, chat, or tag-manager sources without adding them to this brief and the header tests.

## Acceptance gate before closing P0.2

P0.2 can only move from partial to complete after:

- Owner/engineering chooses the CSP enforcement surface for strict nonced CSP.
- Third-party allowlist is explicitly accepted.
- Implementation removes `unsafe-inline` / `unsafe-eval` from the enforced global policy or documents a scoped exception with owner acceptance.
- Browser/header proof covers landing, workshop, invite, share, auth callback, and representative API routes.
- CSP violation telemetry is observed for 7 consecutive days with no legitimate route breakage.

## Local evidence

- `tests/vitest/landing-security-headers.test.ts` proves the current route/header matrix.
- `tests/vitest/project-publication-security-headers.test.ts` and related publication tests cover the `/share` enforced CSP path.
- This brief keeps P0.2 open because local tests prove staged posture, not global strict CSP completion.
