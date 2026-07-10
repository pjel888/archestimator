# Admin Dashboard Runbook

## Access

- `/admin/**` is gated by the app proxy and `isPlatformAdmin`.
- Platform admins come from `PLATFORM_ADMIN_EMAILS` or platform roles `ceo` / `admin`.
- Keep Cloudflare Access / OTP as deferred hardening unless explicitly enabled by Philip.

## Environment

- `ADMIN_DASHBOARD_ENABLED`: optional env override for the `/admin` master switch.
- `PLATFORM_ADMIN_EMAILS`: comma-separated platform admin email allowlist.
- `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`, `ARCHESTIMATOR_EMAIL_PROVIDER`, `CLOUDFLARE_EMAIL_FROM`, `CLOUDFLARE_EMAIL_REPLY_TO`: support reply delivery via Cloudflare Email Service.
- Analytics env (`NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `NEXT_PUBLIC_GA4_MEASUREMENT_ID`) only controls link-out/configured labels. Server-side provider pulls remain deferred.

## Flags

- `admin_dashboard_enabled`: master switch for `/admin`.
- `admin_support_realtime`: renders the optional support chat widget.
- `admin_analytics_server_pulls`: reserved for deferred provider pulls.
- `admin_maintenance_mode`: readable and editable from `/admin/flags`; workshop mutation enforcement is still a follow-up.

## Durable Object Routes

- Global presence DO: `GlobalPresence`.
- Support inbox DO: `SupportInbox`.
- Active bindings and routes are in `wrangler.jsonc` and `worker.ts`; do not add paid Cloudflare products for this dashboard.

## Rollback

1. Disable `admin_dashboard_enabled` in `feature_flags`, or set `ADMIN_DASHBOARD_ENABLED=off`.
2. Disable `admin_support_realtime` to hide user-side support entry points.
3. If email delivery is unhealthy, set `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=0`; support messages remain in D1 and failed sends are marked `send_failed`.
4. Forward-fix D1 schema issues with a new migration. Do not edit applied migrations.

## Open Deferred Items

- Cloudflare Access / OTP in front of `/admin`.
- Server-side GA4, Clarity, and Cloudflare Analytics pulls.
- Email-to-ticket ingestion.
- Workshop mutation enforcement for `admin_maintenance_mode`.
- Hosted observability proof and alert-readiness evidence.
