# Admin Dashboard Runbook

## Access

- `/admin/**` is gated by the app proxy and `isPlatformAdmin`.
- Platform admins come from `PLATFORM_ADMIN_EMAILS` or platform roles `ceo` / `admin`.
- Keep Cloudflare Access / OTP as deferred hardening unless explicitly enabled by Philip.

## Environment

- `ADMIN_DASHBOARD_ENABLED`: optional env override for the `/admin` master switch.
- `PLATFORM_ADMIN_EMAILS`: comma-separated platform admin email allowlist.
- `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`, `ARCHESTIMATOR_EMAIL_PROVIDER`, `CLOUDFLARE_EMAIL_FROM`, `CLOUDFLARE_EMAIL_REPLY_TO`: transactional outbound via Cloudflare Email Service.
- `ARCHESTIMATOR_INBOUND_EMAIL_ENABLED`, `ARCHESTIMATOR_SUPPORT_MAILBOX`, `ARCHESTIMATOR_SUPPORT_EMAIL_FROM`, optional forward vars: support inbox inbound/outbound (see `docs/support-email-operator-runbook.md`).
- Analytics env (`NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `NEXT_PUBLIC_GA4_MEASUREMENT_ID`) only controls link-out/configured labels. Server-side provider pulls remain deferred.

## Feature gates (`/admin/flags`)

Catalog: `src/lib/feature-gates/catalog.ts`. D1 `feature_flags` rows are additive only — never delete cohort data or flag rows to “reset”.

### Enforced

- `admin_dashboard_enabled`: master switch for `/admin`.
- `admin_support_realtime`: workshop in-app support chat intake.
- `admin_maintenance_mode`: blocks workshop write mutations for non-platform-admins (projects/estimates/settings writes + banner).
- `beta_proposals_enabled`: proposals nav + `/workshop/proposals` (default off for closed beta).
- `beta_publisher_enabled`: Share nav + `/workshop/publisher` (default on).
- `beta_templates_enabled`: templates routes under `/workshop/templates` and `/workshop/library/templates` (default on).
- `client_portal_legacy_migration` / `client_portal_legacy_write_freeze`: Client Portal migration rollout helpers.

### Reserved (read-only in UI)

- `admin_analytics_server_pulls`: deferred GA4/Clarity/Cloudflare server pulls.

## Durable Object Routes

- Global presence DO: `GlobalPresence`.
- Support inbox DO: `SupportInbox`.
- Active bindings and routes are in `wrangler.jsonc` and `worker.ts`; do not add paid Cloudflare products for this dashboard.

## Rollback

1. Disable `admin_dashboard_enabled` in `feature_flags`, or set `ADMIN_DASHBOARD_ENABLED=off`.
2. Disable `admin_support_realtime` to hide workshop support chat.
3. Disable product gates (`beta_*`) to hide incomplete surfaces without deleting user projects.
4. Enable `admin_maintenance_mode` to pause beta-member writes during an incident.
5. If email delivery is unhealthy, set `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=0`; support messages remain in D1 and failed sends are marked `send_failed`.
6. Forward-fix D1 schema issues with a new migration. Do not edit applied migrations. Do not DELETE beta user rows.

## Open Deferred Items

- Cloudflare Access / OTP in front of `/admin`.
- Server-side GA4, Clarity, and Cloudflare Analytics pulls.
- Email-to-ticket ingestion is implemented in `/admin/support` + Worker `email()`; live routing/DNS still require operator activation.
- Broader maintenance-mode coverage across every remaining workshop Server Action (core project/estimate/settings writes are gated).
- Hosted observability proof and alert-readiness evidence.
