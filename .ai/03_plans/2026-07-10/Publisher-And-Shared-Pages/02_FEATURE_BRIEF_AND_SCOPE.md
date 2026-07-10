# 02 — Feature Brief And Scope

## Feature Brief

The user has stated the current Publisher and Shared Link experience is
"ridiculously so bad" — they cannot understand the UX/UI, cannot navigate to the
shared link page they are supposed to send to clients, and the overall flow needs
comprehensive improvement.

**The core problem:** The existing feature has a powerful, well-hardened backend
(layered security, token crypto, rate limiting, snapshot sanitization) but the UX
layer is confusing, jargon-heavy, has no primary CTA, no guided workflow, dead-end
states, and no clear path from "I have a project" to "my client is reviewing the
shared proposal." The manager cannot even preview what the recipient will see.

**The goal:** Redesign the Publisher and Shared Link surfaces so that:

1. A manager can go from "I have a project" to "my client received a share link"
   in a clear, guided, obvious flow — with a prominent "Share" button, a wizard
   or step-by-step process, immediate link visibility, and a "preview as client"
   capability.
2. A recipient opening the shared link immediately understands what they're
   looking at, can navigate the proposal easily, can comment and respond without
   confusion, and sees a polished, professional, branded client portal — not an
   internal admin tool.
3. The technical foundation (security, data model, rate limiting) is preserved
   and hardened where gaps exist, not rebuilt from scratch.

## In-Scope

### Publisher (manager side) — comprehensive UX redesign
- Redesign the Publisher roster page with clear visual hierarchy and a primary
  "Share" / "New shared link" CTA
- Replace the buried-tab publish flow with a guided publish wizard or step flow
  (select sheets → set access → generate link → send/invite → done)
- Prominent share-link display (selectable URL, copy button, QR code option)
- "Preview as client" mode to see the recipient experience
- Mobile-responsive publisher (remove the 768px hard block)
- Plain-language terminology throughout (rename "Publisher" → "Share" or
  "Client Links" in nav; replace jargon)
- Debounced search, working pagination controls
- Clear success states with next-step guidance after publishing
- Dashboard "publish" CTA for unpublished projects

### Shared Link (recipient side) — comprehensive UX redesign
- Fix the non-actionable "sign in as a recipient" banner (provide a path)
- Make the decision CTA prominent (sticky/floating, not buried at bottom)
- Update header to reflect actual decision state (not static "Awaiting review")
- Reduce visual noise on estimate table (rethink per-row "Ask about item")
- Improve terminology ("Scope outline" → plain language)
- Add expiry visibility, sender branding, cover image fallback
- Improve comments (threading/dates/author distinction)
- Add a real "Download PDF" or "Print proposal" button (not just browser print)
- Fix currency formatting for non-PHP/USD
- Improve mobile experience (tree nav, scroll-spy, safe areas)

### Recipient Proposals Inbox — improvements
- Fix dead-end for expired/revoked proposals (show state, provide "contact sender")
- Fix all-or-nothing failure model (skip bad rows)
- Clarify the inbox is recipient-only

### Technical hardening (preserving the existing security model)
- Add explicit body-size limits on public POST routes
- Fix 401-vs-423 status code inconsistencies
- Add circuit breaker to decision POST (parity with comment POST)
- Add comment pagination (beyond 200 cap)
- Fix module-global mutable state in snapshot sanitization
- Wire up or remove the dead `events/route.ts` and `download_attempt_blocked`
- Add startup validation for publication secrets

## Non-Goals

- **Not rebuilding the security/crypto model.** The existing token/password/cookie/
  CSRF/rate-limit architecture is sound and stays. We harden gaps, not redesign.
- **Not adding real-time collaboration (SSE/WebSocket) in this plan.** The
  `events/route.ts` cleanup is in scope, but full real-time is a separate future
  effort. Comments use window-focus refetch.
- **Not adding server-generated PDF rendering** (e.g., Puppeteer/Rendertron on
  Workers). The "Download PDF" improvement uses the browser print path with a
  better UI affordance, not a server PDF engine (Workers runtime constraint).
- **Not adding e-signature / legal-grade signing.** The signer-name + hash model
  stays; formal e-sign is a future capability.
- **Not changing the D1 schema fundamentally.** No new tables; we may add
  indexes or FKs but not restructure the publication model.
- **Not adding i18n / multi-language.** Currency formatting fixes are in scope,
  but full translation is future.
- **Not adding custom white-label branding** (per-firm logo/colors). Sender name
  + basic branding from project/workspace data is in scope; full white-label is
  future.
- **Not migrating away from Cloudflare Email.** Email stays on the bound `EMAIL`
  resource.
- **Not changing the auth model.** Better Auth session for managers; signed
  cookies for recipients. No new auth provider.

## Constraints

- **Stack:** Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4 + Cloudflare
  Workers/OpenNext + D1 + R2. Must read `node_modules/next/dist/docs/` before
  framework claims.
- **Shared worktree:** Multiple AI agents + humans work concurrently. All units
  must use file-scope ownership, small diffs, re-reading touched files before
  edits, and no auto-branching.
- **Cost posture:** Stay on free-tier Cloudflare. No paid add-ons.
- **Performance:** Existing route revalidation fan-out and roster query patterns
  must not regress. Debounce and pagination improvements should reduce load.
- **Security:** No weakening of existing CSRF/rate-limit/token/cookie controls.
  The public surface must not leak internal UUIDs, raw IPs, or error details.
- **Accessibility:** All redesigned surfaces must meet WCAG 2.1 AA (keyboard,
  screen reader, contrast, focus management, touch targets).
- **`DESIGN.md` is alpha-stage** — defer to Philip on design decisions; don't
  block on design-system grounds while visual language is developing.
- **Existing UI primitives:** Reuse `src/components/ui/` where practical.

## Success Criteria

1. A first-time manager can publish a project and get a share link in under 60
   seconds without external documentation, following an obvious guided flow.
2. A manager can preview exactly what the recipient will see (interactive, not
   read-only anonymous).
3. A recipient opening a shared link immediately understands: what the proposal
   is, who sent it, what they're being asked to do, and how to respond.
4. The decision/action CTA is visible without scrolling to the bottom.
5. The publisher works on mobile (at minimum: can generate a link and copy it).
6. No regression in security posture (all existing authz/crypto/rate-limit tests
   pass; new hardening tests added).
7. All terminology is plain-language and consistent across surfaces.
8. No dead code (`events/route.ts` either wired or removed; `PublisherDisabledEmptyState`
   wired or removed; `download_attempt_blocked` emitted or removed).

## Proof Boundary

- **Local proof:** Type-check, lint, focused Vitest (route gates, authz, security,
  UI component behavior), build. This is the default evidence class.
- **Browser proof:** Required for UX/interaction/layout/responsive claims (the
  core of this feature). Playwright or manual browser verification for the
  redesigned flows.
- **Hosted/provider proof:** Hosted D1 schema changes, Cloudflare Email delivery,
  production rate-limit/circuit-breaker behavior remain release boundaries.
  Local proof does not claim hosted readiness.
