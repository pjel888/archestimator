# 09 — Infosec Threat Model and Control Plan for Type 3 Client Archives

**Status:** Second-pass planning  
**Last updated:** 2026-06-04  
**Scope:** Security boundaries, threats, and control requirements for public share links, client archive accounts, billing entitlements, webhooks, and deletion-independent data retention.

---

## 1. Security Thesis

Type 3 is high risk because it combines three sensitive capabilities:

1. client-visible financial/estimate data;
2. paid subscription entitlement;
3. deletion-independent retention after the contractor deletes source data.

The security model must therefore be stricter than the current Type 4 public share link model and must remain completely separate from Type 2 collaboration roles.

---

## 2. Assets to Protect

- Estimate/proposal snapshots and totals.
- Contractor/source project metadata.
- Client identity and email binding.
- Share-link tokens and password access cookies.
- Recipient session cookies.
- Billing customer/subscription identifiers.
- Billing webhook payloads and event IDs.
- Archive entitlement status.
- Deletion tombstones and retention metadata.
- Comments, approvals, denials, revision requests, and activity logs.
- Service-role Supabase credentials and provider webhook secrets.

---

## 3. Research Anchors Used

- OWASP Authorization Cheat Sheet: least privilege, deny-by-default, validate permission on every request, and use relationship/attribute-aware access rather than flat role checks.
- OWASP Session Management Cheat Sheet: cookie/session identifiers must be protected with secure attributes and renewed after privilege changes.
- Stripe webhook documentation: verify webhook signatures using raw body, handle duplicate events, do not depend on event ordering, listen only for needed event types, and quickly return successful responses.
- PostgreSQL RLS documentation: RLS default-denies when enabled with no policy; BYPASSRLS/table owner behavior must be accounted for.
- Supabase RLS documentation: browser/client access needs explicit policies; server/service clients must not leak into client flows.

---

## 4. Boundary Model

### Type 1 / Project Owner boundary

Can:

- own projects;
- manage project access;
- publish proposals;
- delete projects subject to governance.

Cannot:

- silently mutate sealed client archive snapshots after publication;
- use project deletion to erase a paid client archive unless retention policy permits it.

### Type 2 / Granted Collaborator boundary

Can:

- CRUD project/estimate data according to role.

Cannot:

- gain paid archive rights through collaboration membership;
- administer client billing entitlements unless explicitly granted through separate admin tooling.

### Type 3 / Client Archive boundary

Can:

- read own account-bound archive snapshots when entitlement allows;
- see own archive activity history;
- manage own billing through hosted portal;
- comment/decide through durable client identity if product permits.

Cannot:

- edit source project/estimate data;
- access workspace/project internals;
- read other clients' archives;
- bypass subscription status;
- appear in `project_members`/`estimate_sheet_members` for archive access.

### Type 4 / Public Share Link boundary

Can:

- view token/password-gated public proposal data as permitted.

Cannot:

- retain deletion-independent archive access;
- access account-bound activity history;
- become a durable decision/comment actor without identity upgrade.

---

## 5. Threats and Required Controls

### 5.1 IDOR / cross-client archive access

Threat:

- Client changes `snapshotId` or API query and reads another client's archive.

Controls:

- RLS SELECT policy tied to `auth.uid()` and entitlement status.
- Server route re-checks access on every request.
- Negative tests for cross-user snapshot IDs.
- No service-role direct reads in client API without explicit post-filtering.

### 5.2 Role confusion / privilege escalation

Threat:

- Type 3 is mistakenly added to `project_members` as viewer and inherits project read behavior.

Controls:

- Schema/code tests asserting Type 3 archive paths do not insert into collaboration tables.
- Naming guardrails: archive_entitlement, not project_role.
- Product copy avoids “viewer role” for clients.

### 5.3 Entitlement spoofing

Threat:

- Client directly updates subscription/entitlement status or calls API with fake provider IDs.

Controls:

- Entitlement status updates are server-only.
- RLS prevents authenticated update.
- Billing provider IDs are not accepted from client as source of truth.
- Webhook signature verification and event ledger.

### 5.4 Webhook replay / duplicates / ordering errors

Threat:

- Duplicate, stale, or out-of-order billing webhooks grant or revoke access incorrectly.

Controls:

- Verify provider signature over raw body.
- Store processed event IDs.
- Fetch current subscription object when event ordering is ambiguous.
- Use monotonic status rules or provider current state, not naive “last event wins.”
- Return 2xx quickly and process durable work safely.

### 5.5 Share-token/session leakage

Threat:

- Public link token or recipient session cookie leaks and allows unintended stateful action.

Controls:

- Store token hashes, not raw tokens.
- HttpOnly, SameSite=Lax, Secure in production, bounded max-age for cookies.
- Recipient session scoped to publication/token/recipient and not reusable for account archive routes.
- Re-authenticate or upgrade identity before durable archive operations.

### 5.6 Deletion bypass / retention contradiction

Threat:

- Owner deletes source project and unintentionally deletes paid archives; or client archive survives contrary to terms.

Controls:

- Deletion preview checks active archive subscribers.
- Phase 1 hard-delete block when active subscribers exist.
- Tombstone creation for source-deleted archives.
- Product/legal retention policy before enabling source-deleted archive retention in production.

### 5.7 Service-role overreach

Threat:

- Server route uses Supabase service role and accidentally returns data outside caller scope.

Controls:

- Keep service-role clients in server-only modules.
- Require explicit caller access checks before returning service-role data.
- Prefer RLS client for read paths when feasible.
- Add tests for service-role route filtering.

### 5.8 Audit log tampering

Threat:

- Actor mutates comments/decisions/activity events after a dispute.

Controls:

- Append-only activity event table.
- Correction events instead of destructive edits.
- RLS/grants block client updates/deletes to audit records.
- Store actor, source, timestamp, and request context metadata.

---

## 6. Security Controls by Component

### Share route and cookies

Current relevant path:

- `src/lib/publication/security.ts`

Keep:

- signed cookies;
- token hash pattern;
- HttpOnly/SameSite/Secure production flags;
- bounded session max age.

Add:

- privilege-transition renewal when Type 4 upgrades to Type 3;
- explicit separation between share session cookies and authenticated archive access;
- revocation handling for recipient links.

### Billing webhooks

New path likely:

- `src/app/api/webhooks/stripe/route.ts`

Controls:

- raw body signature verification;
- max body size;
- event type allowlist;
- idempotency ledger;
- no user-controlled entitlement changes;
- structured errors without secret leakage.

### Archive API routes

New paths likely:

- `src/app/api/client/archive/route.ts`
- `src/app/api/client/archive/[snapshotId]/route.ts`

Controls:

- authenticated only;
- per-request archive access check;
- no token-only access;
- no live project membership fallback;
- security headers and no caching of private archive data unless controlled.

### Deletion governance

Existing relevant paths:

- `supabase/migrations/20260603160000_mass_deletion_governance.sql`
- `src/lib/mass-deletion/bulk-action.ts`
- `src/components/workshop/BulkDestructivePreviewModal.tsx`

Add:

- active archive subscriber count;
- tombstone required flag;
- preserve-archive warning copy;
- audit event linking deletion to preserved snapshots.

---

## 7. Logging and Monitoring

Log these events server-side:

- archive snapshot created/sealed;
- archive snapshot read;
- cross-access denial;
- subscription status changed;
- webhook duplicate/stale event ignored;
- billing signature verification failure;
- source deletion blocked due to archives;
- source deletion completed with tombstone;
- recipient-account claim completed;
- archive entitlement revoked.

Do not log:

- raw tokens;
- raw passwords;
- full payment details;
- service-role keys;
- unnecessary full snapshot payloads in logs.

---

## 8. Infosec Test Requirements

Required negative tests:

- Client A cannot read Client B snapshot.
- Type 3 cannot call project CRUD routes through archive identity.
- Canceled/revoked entitlement cannot read archive unless grace policy says so.
- Invalid billing webhook rejected.
- Duplicate billing webhook does not double-apply state.
- Out-of-order billing webhook does not downgrade/upgrade incorrectly.
- Public share recipient session cannot open `/client/archive/[snapshotId]` without authenticated client identity.
- Owner hard delete is blocked or tombstone-preserving when active archive subscribers exist.
- No raw public token stored in database rows.
- No Type 3 account insertion into `project_members` or `estimate_sheet_members`.

---

## 9. Open Security Decisions

These need Philip/product/legal decision before production:

- Whether cancellation immediately removes archive read access or grants a grace period.
- Whether contractors can disable client archive subscription for a publication.
- Whether clients can download PDF/XLSX archives after source deletion.
- Whether activity/comment history survives subscription cancellation.
- Whether support/admin can grant temporary archive access.
- Data retention length after client account deletion.

---

## 10. Security Acceptance Criteria

Implementation is security-acceptable only when:

- Type 3 archive access is authorization-checked on every request.
- RLS denies archive reads outside `auth.uid()` + entitlement scope.
- Type 3 cannot become a project collaborator through archive flows.
- Billing webhooks are verified, idempotent, and order-safe.
- Public share sessions cannot become durable archive rights without identity upgrade.
- Source deletion cannot destroy paid archives silently.
- Audit/activity records are append-only or correction-event based.
- Secrets, tokens, and provider payloads are not leaked to client or logs.
