# Business Model and Pricing Readiness Note

## Fourth-Pass Closed Beta Pricing Decision - 2026-06-02

No payment ships in closed beta.

- No Stripe.
- No checkout.
- No subscriptions.
- No paid tiers.
- No invoices.
- No billing UI.
- No pricing enforcement.
- No payment collection.

Pricing is a post-beta roadmap item. If `/pricing` remains visible, it must say closed beta access is by invitation only, pricing will be announced after beta, and users can contact Philip/request access. Investor demos can discuss pricing as future strategy only.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## MVP Positioning

Archestimator MVP should be positioned as a structured estimating workspace for design/construction teams, with Excel-first bid/BOQ export and reusable library/templates. It should not be positioned as an AI product for MVP.

## Pricing Page State

Current local pricing route is reframed as invite-only closed beta access. It states no payment is required during beta, pricing will be announced after beta, and there is no checkout/subscription/plan enforcement in this MVP. The landing pricing band and FAQ also avoid `₱0`, free-access, and paid-tier language.

It remains investor-safe only if:

- Copy does not promise unavailable features as currently shipping.
- Paid claims are framed as planned or future.
- Legal copy clarifies beta/preview limits.
- No payment/billing UI or copy implies customers can subscribe while billing is deferred.

## What Not To Implement For MVP

- Stripe/payment flow.
- Complex plans/seat management.
- Usage metering.
- Enterprise procurement flow.
- AI upsell.

## Billing Decision

Billing/payment is deferred for closed beta. Early paying prospects must not be handled in-app; any future paid pilot requires a separate post-beta decision and reviewed legal, support, privacy, and data protection terms.

## Beta / Free Trial Handling

- Closed beta can be free.
- Onboarding email should say beta access is limited and may change.
- Do not collect payment in-app.
- If quoting paid pilots, keep commercial terms outside the product until legal/pricing is approved.

## Investor-Safe Messaging

- "Excel-first because contractors already review and submit workbooks."
- "AI is deferred to protect trust, privacy, and auditability."
- "Library/templates become a data moat as estimates standardize."
- "Revenue path is paid team workspaces after beta reliability proof."

## No-Go

- Pricing page promises AI, PDF, billing, bid tabulation, or collaboration features that are not available.
- Public copy implies legal/privacy readiness when pages are placeholders.
- Paid launch proceeds before support, legal, backup, and security gates pass.
