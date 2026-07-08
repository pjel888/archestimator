# 02 — Feature Brief and Scope

## Original user brief (verbatim intent)

> We need to now start planning the admin dashboard. As of now, the only
> developer is me. So we can just use google auth sign in and only have me as
> the allowed email. `philipjonlewis@gmail.com`. I need you to create a plan for
> the admin dashboard that would monitor the necessary things that we need as
> the solo developer. A lot of data from cloudflare as well. Microsoft clarity,
> google analytics, things like that. We also need a way to view the current
> number of users etc etc, the amount of users using the platform at any given
> time. I also want a chat inbox there because I will serve as the customer
> support for the meantime. Research on what needs to be included in admin
> dashboards like this. We need to be able to plan this out comprehensively.

Source: user message, 2026-07-08. `source_strength: brief`.

## Interpreted product outcome

A single authenticated internal surface that lets the sole operator (Philip)
monitor, support, and operate Archestimator without juggling multiple external
dashboards, ad-hoc SQL, or the dev log file.

## In scope

### Functional capability groups

| Group | Capabilities |
|---|---|
| **Auth & access** | (A1) Google-OAuth-only admin access; (A2) single-email allowlist `philipjonlewis@gmail.com`; (A3) route + per-endpoint authz; (A4) optional Cloudflare Access edge gate; (A5) admin-action audit logging. |
| **Overview / live health** | (O1) realtime "users online now"; (O2) recent signups (7/30-day); (O3) request/error-rate trend (CF Analytics); (O4) D1/R2/Queue/Email health summary; (O5) incident strip (from `operational_incidents`). |
| **Users & accounts** | (U1) searchable/paginated user table (email, display name, role, created, last session); (U2) user detail drawer; (U3) link to existing closed-beta allowlist management. |
| **Support inbox** | (S1) conversation list; (S2) message thread view; (S3) compose/reply (sends via `EMAIL` binding); (S4) realtime inbound via Durable Object; (S5) status workflow (open/pending/resolved); (S6) Phase-2 email-to-ticket via Cloudflare Email Worker. |
| **Analytics integrations** | (AN1) embedded/linked Cloudflare Web Analytics; (AN2) embedded/linked Microsoft Clarity (iframe-safe link or cached metrics); (AN3) embedded/linked Google Analytics 4; (AN4) server-side GA4 Data API pull (owner-gated); (AN5) server-side Clarity Data Export pull (owner-gated); (AN6) CF GraphQL Analytics API pull (owner-gated). |
| **Feature flags & settings** | (F1) D1-backed flag table; (F2) admin toggle UI; (F3) server-side cached flag reader for the app; (F4) env-var / system status panel. |
| **Audit & observability** | (AU1) admin-action audit table + viewer; (AU2) links to Cloudflare Workers Observability + `wrangler tail` guidance; (AU3) recent incidents strip. |
| **Admin shell** | (SH1) admin layout + sidebar nav; (SH2) dark/light via existing tokens; (SH3) responsive; (SH4) loading/empty/error states. |

### Non-functional scope

- Performance: overview route TTFB ≤ 600 ms p95 at ≤ 1000 users; realtime
  presence count fresh ≤ 5 s; analytics tiles load in ≤ 2 s or degrade to a
  "view in [provider]" link.
- Security: layered auth (app allowlist + role + optional CF Access); rate-limit
  on admin login/write endpoints; no raw PII in client bundles; secrets as
  Wrangler secrets only.
- Reliability: every external-provider tile degrades gracefully (link-out) if
  credentials absent or quota hit.
- Free-tier posture: no paid Cloudflare add-ons; Analytics Engine within free
  100K writes/day; Workers Logs within free 200K events/day.

## Out of scope (explicit non-goals)

| Non-goal | Rationale | Revisit trigger |
|---|---|---|
| Billing/subscription management UI | Use Stripe Customer Portal | Paid plans / multiple price tiers |
| A/B experiment, funnel, cohort analytics UI | Use GA4 / PostHog hosted surfaces | Product analytics team or volume |
| In-dashboard full-text log search | Link to Cloudflare Workers Observability Query Builder | Workers Paid + Logpush justified |
| Multi-admin team / role management screens | Single operator; design allows a 2nd admin via env var, no UI needed | Second operator hired |
| Paid Cloudflare add-ons (Logpush, Workers Paid, R2 paid tier, Smart Placement) | Free-tier cost posture (AGENTS.md) | Explicit owner approval |
| New auth provider | Reuse Better Auth + Google OAuth + magic link | — |
| Modifying user-facing workshop flows | Admin is operator-only, additive | — |
| Building a custom analytics engine | Reuse instrumented Clarity/GA/CF beacon | — |
| Mobile-native admin app | Responsive web is sufficient | — |
| Realtime collaboration features inside admin | Out of operator scope | — |

## Success metrics (planning-level)

- Philip can, from one authenticated URL, see: live user count, last 7 signups,
  today's error rate, open support conversations, and pending admin actions —
  without opening a second tool.
- A support conversation started in-app reaches the admin inbox within 5 s and
  is replyable from the dashboard.
- All six sections render within their performance budget at ≤ 1000 users.
- No non-admin can reach any `/admin/*` route or `/api/admin/*` endpoint
  (proven by denial tests).

## Failure metrics (what would make this not worth building)

- Admin route is reachable by any non-allowlisted identity.
- Overview route exceeds its TTFB budget at typical scale.
- Support inbox loses or duplicates messages, or replies fail silently.
- Analytics tiles block page render when a provider is down.
