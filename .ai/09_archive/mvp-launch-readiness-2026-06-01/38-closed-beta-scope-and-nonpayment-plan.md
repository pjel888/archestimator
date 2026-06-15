# Closed Beta Scope And Nonpayment Plan

## Closed Beta Launch Definition

Archestimator is launching as a closed beta MVP for invited beta testers, founder-led prospects, investors, and startup incubator reviewers. It is not launching as a public commercial SaaS product.

## What Ships

- Google Sign-In with email allowlist enforcement.
- Working workshop entry for approved users.
- Project, estimate, component library, template, unlink, and Excel export workflows at beta-useful quality.
- Public marketing pages reframed for invite-only access.
- Public legal pages with beta/privacy/acceptable-use posture.
- Feedback/support path visible to beta users.
- Vercel/Supabase production deployment with rollback and smoke-test process.

## What Does Not Ship

- Stripe.
- Checkout.
- Subscriptions.
- Paid tiers.
- Billing UI.
- Invoices.
- Plan limits.
- Pricing enforcement.
- Public self-serve signup.
- Public growth loops.
- Ask Flip as an active default feature.

## Payment Decision

No payment collection is required or allowed for closed beta. Any previous MVP P0 task that assumes billing, paid plans, checkout, subscriptions, revenue capture, or paid entitlement enforcement is superseded and moved to post-beta.

## Pricing Page Decision

Recommended path: keep `/pricing` as a public route only if it is reframed as closed-beta access and not commercial pricing.

Local implementation status 2026-06-02: `/pricing`, the landing pricing section, and the landing FAQ are reframed for invite-only closed beta access. They do not show active checkout, subscription, `₱0`, free-access, or paid-tier language.

Required copy if visible:

- "Closed beta access is by invitation only."
- "Pricing will be announced after beta."
- "Contact Philip / request access."

Do not show checkout CTAs, paid plan cards, active limits, subscription language, or upgrade prompts.

## Landing CTA Decision

Replace public-launch CTAs with closed-beta CTAs:

- "Request closed beta access"
- "Contact Philip"
- "Sign in if invited"

Do not imply anyone can self-serve into the app.

## Investor Messaging Decision

Investors and incubator reviewers should be told:

- The beta is intentionally closed.
- Pricing is a future roadmap decision.
- The beta exists to validate estimating workflows, export quality, and contractor value.
- No payment rail is live.

## Terms Decision

Closed beta requires beta participation, privacy, acceptable use, and estimate-accuracy disclaimers. It does not require paid customer billing terms for launch.

## Deferred Tickets

- Stripe/payment setup.
- Checkout/session creation.
- Subscription plan selection.
- Paid plan entitlements.
- Public pricing enforcement.
- Invoicing and tax handling.
- Billing portal.

## Routes, Components, And Copy To Audit

- `src/app/pricing/page.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `src/components/landing/FAQSection.tsx`
- `src/app/login/page.tsx`
- `/privacy` and `/terms`
- Any "free access", "paid plan", "upgrade", "pricing", or "checkout" copy.

## Tests And Manual QA

- Public marketing routes remain accessible.
- `/pricing` shows closed-beta copy or is hidden from navigation.
- Source-contract test: `tests/vitest/closed-beta-pricing-copy.test.ts`.
- Login copy says invited users only.
- No Stripe/payment dependency or route is introduced.
- Investor demo script mentions pricing as future roadmap only.

## No-Go Criteria

- Any visible route implies payment is live.
- A user can start checkout or choose a paid plan.
- Paid entitlement code becomes a P0 beta dependency.
- Legal copy references active subscriptions as if beta users are paying customers.
