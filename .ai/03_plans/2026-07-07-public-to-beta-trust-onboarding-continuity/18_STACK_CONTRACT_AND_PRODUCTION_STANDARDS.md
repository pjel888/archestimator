# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting production decisions for the in-scope stack layers. Source: `AGENTS.md` stack baseline + repo evidence (`03`).

## Next.js 16 (App Router)
- Public pages: **Server Components, `force-static`**. No new `"use client"` except an optional tiny ClosedBetaGate receipt wrapper (Phase 3) — prefer progressive-enhancement `<form action={serverAction}>` to avoid JS-required submit.
- `/login`: cacheable RSC with a Client island (`LoginFormFromSearchParams`) inside `<Suspense>` — unchanged.
- `/cookies`: RSC `force-static`, wrapped in `PublicPageShell`.
- Route protection: **Next 16 `proxy.ts`** (not `middleware.ts`) — unchanged. No new route-protection logic.
- Metadata: `buildLandingMetadata` for `/terms`,`/privacy`,`/cookies`; `metadataBase` in root layout; canonical via `LANDING_SITE_ORIGIN` (OPEN-CONT-05).
- Cache: marketing `s-maxage=31536000`; mutations `no-store`; workshop `private,no-cache,no-store`.
- Local docs: read `node_modules/next/dist/docs/` if any framework-sensitive question arises during implementation (e.g., Server Action form semantics in Next 16).

## React 19
- Components sized for readability; reuse `src/components/ui/` primitives (button/card/link) before ad hoc UI.
- No effect-driven derivation for the new UI (receipt = form state/redirect; CTA visibility = derived from server data).
- Stable keys not relevant (no new lists).
- `"use client"` only where progressive enhancement is insufficient (justify).

## Tailwind v4 + design system
- Reuse existing classes; no new tokens needed.
- Footer links + legal line + CTA use existing typography/spacing.
- `DESIGN.md` is alpha-stage; defer to Philip on design; no design-lint gate blocks these minimal changes.
- Mobile (375px): footer link group wraps; no horizontal overflow (guard via `landing-audit.spec.ts`).

## TypeScript + validation
- Typed DTO for `requestBetaAccess` input/result; typed welcome-email trigger.
- Runtime validation at the server-action trust boundary (email regex + length caps; honeypot).
- No `any`; no unsafe casts.

## Cloudflare Workers/OpenNext
- All within Worker `archestimator-proof` (bound resource). No new bindings.
- `getCloudflareContext()` for D1 + `EMAIL` binding — server-only.
- Email: `EMAIL` binding via `sendCloudflareEmail`; delivery OFF by default → graceful skip (REL-CONT-01).

## Cloudflare D1
- No migration for the recommended path (reuse `closed_beta_allowlist_audit_events`, `security_rate_limit_events`, `account_security_events` with new `event_type` values).
- App-layer authorization: `requestBetaAccess` is public (no auth), but input-validated + rate-limited + audited.
- Repository boundary: reuse `closed-beta-d1-store.ts` pattern for the audit insert.
- Fallback column-add (migration `0040_*`) only if Phase-4 idempotency query proves inefficient (see `21`).

## Better Auth
- Unchanged: Google OAuth + magic-link; DB-backed sessions; cookie cache disabled.
- `getBetterAuthCurrentUserContext` remains the single context resolver; closed-beta check inside it — unchanged.

## Security
- Server Action = direct POST endpoint → self-validate (honeypot, rate-limit, input).
- No new credentials/tokens (welcome email is token-free).
- Uniform receipt (non-enumerable).
- Overclaim guard: existing tests + claims-ledger cross-check.
- CSP/headers: inherited via `PublicPageShell`; `requestBetaAccess` `no-store`.

## Performance
- Static public pages (no render cost delta).
- `requestBetaAccess`: 3 indexed D1 statements.
- Perf evaluator: Playwright (LCP/TTFB/redirect-count); production RUM external.

## Observability
- Audit rows (`beta_access_requested`) + security events (`welcome_email_sent`).
- Structured logs with redaction (email prefix/suffix, IP-hash).
- No new alerting for closed beta.

## Testing
- vitest (RTL/unit/server-action), Playwright (perf evaluator), existing regression guards.

## Rollout
- Local → merge → closed-beta deploy → production confirmation (email + domain + legal signoff).
- GitHub Actions currently disabled; local gates are authoritative until restored.

## Design-system / alpha-DESIGN.md note
All UI changes are minimal continuity fixes, not a design-language change. Defer to Philip on any design call; do not block on Storybook/visual QA for these (proportional verification).
