# Admin and Support Access Governance

## Current-state grounding

- **Admin gate** — `requireAdminContext` / `assertAdminApiAccess` (`src/lib/admin/require-admin.ts`)
  requires `isPlatformAdmin(context)` (`src/lib/auth/roles.ts`). `assertAdminApiOrigin` enforces
  strict same-origin CSRF on mutations. All admin routes under `src/app/admin/` (accounts,
  analytics, audit, flags, notifications, observability, support, users).
- **Admin audit** — `admin_audit_events` (`migrations/0044`); columns `actor_user_id`,
  `actor_email` (**plaintext**), `action`, `target_type`, `target_id`, `summary_json`,
  `request_id`. Writer: `src/lib/admin/audit-repository.ts:writeAdminAuditEvent`. Support
  actions audited via `support-actions.ts:38` (`support.reply_sent`,
  `support.reply_send_failed`, `support.status_updated`, `support.conversation_started`).
- **No impersonation** exists today (repo-wide search for `impersonat|actAs|sudo|loginAs|
  masquerade` returns zero implementation hits; only defensive comments in
  `src/lib/collaboration/realtime-identity.ts`). Realtime identity is bound to the caller's
  auth user id to *prevent* impersonation.
- **No MFA** for admin access (gap — see `14_SECURITY_SAFEGUARDS_AND_PRIVACY_ENGINEERING.md`).
- **Support conversations** — `support_conversations`/`support_messages` (`migrations/0042`);
  requester email derived from `profiles` join; admin UI at `src/app/admin/support/`.

## Principle

The `/admin` route is the founder's operational homebase and therefore one of the highest
privacy risks in the product.

## Required Controls

### Authentication (gaps to close)

- separate admin authorization (exists via platform-admin role);
- **MFA for admin** (missing — P0/P1);
- session freshness;
- device and location anomaly detection where practical;
- no development bypass in production (`dev-auth.ts` gated by env; verify disabled in prod);
- emergency access procedure.

### Authorization

- capability-based permissions;
- tenant-scoped queries by default;
- no universal data view unless required;
- destructive actions separated from read access;
- privacy and incident roles separated where possible.

### Support access (gap: session/break-glass logging)

Every access to customer data for support must record: operator; customer and workspace; ticket
or reason; scope; start and end; fields accessed; actions taken; approval where required;
customer notification where promised. Today only per-action audit exists (`admin_audit_events`);
add a support-access session boundary or break-glass record.

### Impersonation

**Prefer scoped support views over impersonation.** No impersonation exists today — keep it
absent unless a documented, audited need arises. If ever added: explicit banner; reauthentication;
reason; time limit; no hidden action; full audit trail; restricted high-risk actions;
customer-visible audit where appropriate.

### Sensitive operations (require confirmation and reauthentication)

user deletion; workspace transfer; export; privacy request completion; legal hold; token
revocation; share revocation; bulk deletion; processor deletion; incident notification.

## Periodic Review

Monthly during beta: list admin users; list privileged capabilities; review recent support
access; review anomalous queries; remove unused credentials; verify MFA; confirm no exposed
development tools. Today `admin_audit_events` enables this via `listAuditEvents`; formalize the
cadence and produce evidence.
