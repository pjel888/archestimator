# Conversion Funnel Contract

Date: 2026-06-22
Scope: future Archestimator landing-page implementation

This document turns the landing page from a polished brand page into a complete
conversion path. It is the canonical contract for CTA destinations, form states,
signed-in behavior, and analytics.

## Primary Conversion Target

Primary audience: closed-beta AEC estimating teams and design partners who are
trying to improve the estimate -> library -> revision -> proposal loop.

Primary conversion: request early access.

Secondary conversion: book a walkthrough.

Lower-commitment conversion: view product proof, read trust notes, see pricing,
or follow a maintained community/update channel.

Signed-in conversion: open the workspace.

## CTA Routing Contract

| Visitor state | CTA label | Destination | Notes |
| --- | --- | --- | --- |
| Signed out, primary | `Request early access` | `/contact?intent=early-access` | Do not route to `/signup` while beta access is not self-serve. |
| Signed out, secondary | `Book a walkthrough` | `/contact?intent=walkthrough` | Scheduling/contact intent, not a generic page. |
| Product proof | `View product proof` | `#product-proof` | Anchor must land on real or faithful product proof. |
| Feature evaluation | `See the feature tour` | `/features` | Deep breakdown lives off the homepage. |
| Pricing evaluation | `See pricing` | `/pricing` | Homepage does not contain pricing cards. |
| Trust evaluation | `Read trust notes` | `/trust` | Claims, privacy, beta maturity, and security detail. |
| Signed in, primary | `Open workspace` | `/workshop` | Use only when auth state confirms access. |
| Existing account fallback | `Sign in` | `/login` | Secondary navigation action only. |
| Community/update | `Follow the build` | Real maintained channel | Omit when no maintained channel exists. |

If `/contact` cannot honor the intent query yet, implementation must add that
support to `/contact` in the same branch. Do not guess with `mailto:`, dead
forms, placeholder channels, or `/signup`.

## Early-Access Form Contract

Keep the form short. Use persistent labels, not placeholder-only labels.

Recommended fields:

1. Name
2. Work email
3. Company or team
4. Role
5. What are you trying to estimate or improve?

Optional fields only if they materially help qualification:

- Company size
- Country/time zone
- Preferred walkthrough time

Required states:

- idle;
- loading/submitting;
- success/thank-you;
- validation error;
- server error with safe generic copy;
- already signed-in redirect or workspace CTA.

Thank-you copy:

```text
Thanks. We received your request and will follow up with next steps for the beta.
```

Walkthrough success copy:

```text
Thanks. We received your walkthrough request and will follow up with available times.
```

Do not expose stack traces, provider errors, rate-limit details, or internal
routing names to visitors.

## Funnel Analytics Contract

Events should help understand intent without collecting PII.

Allowed events:

| Event | Trigger | Allowed properties |
| --- | --- | --- |
| `landing_cta_click` | Any main CTA click | `cta_label`, `cta_location`, `destination`, `intent`, `auth_state`, `consent_state` |
| `landing_product_proof_view` | Product-proof section enters view | `section_id`, `proof_type`, `consent_state` |
| `landing_early_access_submit` | Valid early-access submit | `intent`, `form_version`, `consent_state` |
| `landing_walkthrough_submit` | Valid walkthrough submit | `intent`, `form_version`, `consent_state` |
| `landing_pricing_click` | Pricing route click | `cta_location`, `destination`, `consent_state` |
| `landing_community_click` | Real community channel click | `channel`, `cta_location`, `consent_state` |
| `landing_open_workspace_click` | Signed-in workspace CTA | `cta_location`, `auth_state`, `consent_state` |

Never send names, emails, company names, phone numbers, project names,
addresses, estimate values, proposal tokens, free-text form contents, or client
identifiers to analytics.

Consent rule: preserve the existing landing analytics posture. GA/Clarity style
tracking must remain consent-gated. If Vercel analytics remains globally mounted,
document that separately in the implementation note and do not add extra
pre-consent third-party scripts.

## Three-Second Conversion Check

A first-time visitor should understand these without scrolling far:

1. What is it? A cost intelligence / cost proposal product.
2. Who is it for? AEC estimating teams.
3. Why believe it? Estimate Sheet or faithful product proof is visible.
4. What can I do next? Request early access or book a walkthrough.

If the first viewport cannot pass this check, simplify copy before adding more
sections.

## Success Metrics

Use these as learning metrics, not guaranteed targets:

- primary CTA click-through rate;
- early-access form completion rate;
- walkthrough request rate;
- product-proof section view depth;
- pricing/trust/feature route clicks;
- mobile completion rate;
- server-side form errors and rate-limit events.

Actual conversion quality can only be validated after traffic. Before launch,
the plan can be 100% implementation-ready; it cannot guarantee real-world
conversion without post-launch data.
