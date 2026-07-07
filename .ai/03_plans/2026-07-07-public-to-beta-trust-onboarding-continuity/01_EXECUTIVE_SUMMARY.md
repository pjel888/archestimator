# 01 — Executive Summary

## What this plan is

A planning-only, exhaustive plan pack that converts Archestimator's public→beta→auth→onboarding path from a set of working-but-disconnected pieces into **one coherent, truthful, testable continuity path**. It protects user trust and reduces first-session confusion without turning into a generic marketing redesign (per the `PROMPT.md` constraint).

## Current state (one paragraph)

The live public surface is `landing-v3` at `/` (`src/app/page.tsx` → `ArchestimatorLandingPage`). Its primary logged-out CTA is "Book a walkthrough" (`/contact?intent=walkthrough`); its "Sign in" link goes to `/login?next=/workshop/projects`. There is **no self-serve signup**: `/signup` renders a `ClosedBetaGate` that posts a `beta-request` to `/contact` (a client-side `mailto:` builder — no server intake). Access is grant-based via a D1 `closed_beta_allowed_emails` allowlist + the `CLOSED_BETA_ACCESS_ENABLED` env flag, enforced inside `getBetterAuthCurrentUserContext` (`src/lib/auth/session.ts`) after Better Auth identity resolution. Auth is Better Auth (Google OAuth + email magic-link; no passwords) on D1, protected by the Next 16 `proxy.ts` → `request-proxy.ts` (no `middleware.ts`). After login, users land at `/workshop`, where `workshop/layout.tsx` enforces a post-auth clickwrap terms gate (`/workshop/terms`) before `ensureDefaultWorkspace` provisions a workspace and the dashboard renders. Legal pages `/terms`, `/privacy`, `/security`, `/trust` exist and are deliberately truthful (no SOC2/GDPR/DPA overclaims). Trust signals (claims ledger, "private by design") are fail-closed against fabricated logos/testimonials.

## The continuity gaps this pack closes

| # | Gap | Evidence | Phase |
|---|---|---|---|
| G1 | Two divergent CTA postures (walkthrough vs request-access) with no canonical mapping | `landing-v3` primary=`walkthrough`; `landing-new`/`LandingCTAs`/`ClosedBetaGate` use `access`/`started`/`beta-request` | 0 |
| G2 | Footer link sets inconsistent (v3 footer: Privacy+Terms; `/new` footer: Trust+Privacy; shared `LandingFooter`: logo-only) | `ArchestimatorLandingPage.tsx:644`, `NewLandingPage.tsx:590`, `LandingFooter.tsx` | 1 |
| G3 | `/terms` + `/privacy` lack per-route metadata (no title/description/canonical/OG) | `terms/page.tsx`, `privacy/page.tsx` have no `metadata` export | 2 |
| G4 | `/security` missing from sitemap; `/.well-known/pgp-key.txt` referenced but absent | `src/app/sitemap.ts`; `public/.well-known/security.txt` | 2 |
| G5 | No cookie-policy page despite a `CookieConsentBanner` | no `/cookies` route; banner at `CookieConsentBanner.tsx` | 2 |
| G6 | No plain-language legal pre-link on the beta-request gate | `ClosedBetaGate.tsx` has no Terms/Privacy link | 3 |
| G7 | No beta-request receipt/confirmation (mailto-only, silent submit) | `ClosedBetaGate.tsx` → `/contact` POST; no server action | 3 |
| G8 | No welcome/onboarding email; delivery OFF by default | no welcome template; `.env.example` `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false` | 4 |
| G9 | `/workshop/onboarding` just redirects to settings; no first-project empty-state CTA | `workshop/onboarding/page.tsx`; `WorkshopDashboard` shows 0 counts | 5 |
| G10 | No end-to-end continuity test | no test asserts landing→CTA→gate→login→terms→workspace→first-project | 6 |
| G11 | OG image asset missing (`/og/default.png` referenced, `public/og/` absent) | `seo-metadata.ts` references `/og/default.png` | 2 |
| G12 | Production domain `LANDING_SITE_ORIGIN` still `L-SEO-1 GATED` | `src/lib/landing/seo-metadata.ts` | 0/external |

## Target state (one paragraph)

A documented **continuity contract** (`landing-content.ts` / `contact-mailto.ts` vocabulary) drives a single canonical CTA posture; all public footers share one trust-link group; legal pages have complete metadata and the security/cookie surface is complete; the beta-request gate shows a plain-language legal line and gives a receipt; a welcome email (owner-gated) fires on first workshop entry; the dashboard offers a clear first-project handoff; and a continuity test + performance evaluator prove the whole path. Nothing overclaims: the claims ledger and `/trust` page remain the source of truth for what is Live vs Building vs Planned.

## Major findings

- **Architecture:** the trust boundary ordering is sound (Proxy auth-header → WorkshopLayout terms gate → `getCurrentUserContext` closed-beta check). The continuity work is **almost entirely frontend + copy + one server action + one email**, not an auth/architecture change. No D1 schema change is required for the core path (see `21`).
- **Security:** the biggest continuity-security risk is the **silent mailto beta-request** (no server intake → no audit trail of who requested access, no rate limit, no receipt). Adding a server-action intake with honeypot + rate limit closes this. Credential materials (session cookie, invite token hash, pending-invite bridge cookie) are already correctly classified (see `20`).
- **Performance:** the landing→auth transition is already `force-static` for public pages and cacheable for `/login` (client island). The performance evaluator target is LCP/TTFB on `/` and `/login` and the redirect count on the protected-route bounce.
- **UX/a11y:** the live v3 footer bypasses the shared shell; any footer change must touch both v3's own footer and the shared `LandingFooter`. Keyboard/focus on the cookie banner and ClosedBetaGate need verification, not assumed clean.

## Critical decisions (summary — full rationale in `15`)

- **DEC-CONT-01:** Keep post-auth clickwrap as the **single** terms acceptance point; add a non-binding "by requesting access you agree to..." pre-link on `ClosedBetaGate`. (Avoids double-gate; preserves the auditable `authenticated_clickwrap` record.)
- **DEC-CONT-02:** Add a **server-action beta-request intake** (`requestBetaAccess`) with honeypot + D1 rate limit + audit row + receipt UI, replacing the silent mailto POST. (Closes G7 + the audit-trail security gap.)
- **DEC-CONT-03:** Reuse the existing `claims-ledger` Live/Building/Planned model as the **single truthfulness source** for all continuity copy; no new trust framework invented.
- **DEC-CONT-04:** First-project handoff = an explicit empty-state CTA on the dashboard when the workspace has zero projects, plus making `/workshop/onboarding` a real (lightweight) redirect-to-first-project rather than to settings. (Owner-gated copy.)

## Remaining external decisions

See README blocked-decisions table (OPEN-CONT-01..06). All have recommended options and conditional implementation paths; none block planning completion.

## Readiness (summary — full scoring in `17`)

- Overall implementation readiness: **94/100** (capped by `verification_mode: emulated`).
- Package status: **`CONDITIONALLY READY`** — design is implementation-ready; held to CR by verification mode + external decisions + email-delivery owner gate.
- Review-and-revision cycles: 2 full cycles + 1 targeted cycle (meets the exhaustive ≥2 requirement).

## Confirmation

No application code, tests, migrations, schemas, package manifests, provider state, or config was modified. All artifacts live inside this plan folder. `PROMPT.md` preserved.
