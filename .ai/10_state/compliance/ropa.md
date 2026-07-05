# Record of Processing Activities (RoPA) — DRAFT (P1.2)

> **⚠️ COUNSEL REVIEW REQUIRED.** Article 30 GDPR + IRR §14 (Philippine DPA). This is
> an engineering draft populated from codebase inventory (D1 schema, source files,
> wrangler.jsonc bindings). Counsel must verify each processing activity, the legal
> basis, and the retention period before this RoPA is treated as compliance evidence.

**Source plan:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md` (P1.2)
**Status:** DRAFT — gated on OPEN-DEC-002 (controller identity) + OPEN-DEC-004 (retention)
**Codebase inventory sources:** `migrations/*.sql`, `wrangler.jsonc`, `src/lib/cloudflare/*`

## Controller and DPO

- **Controller:** `[Archestimator legal entity — OPEN-DEC-002]`
- **DPO / contact:** `privacy@archestimator.com` / `[Philip or appointed DPO]`
- **NPC registration:** `[Pending]`

## Processing activities

### PA-01 — Account authentication and session management

| Field | Value |
|---|---|
| Purpose | User signup, login, session maintenance |
| Data categories | Email, name, hashed password (Better Auth), OAuth subject (Google), session cookie, HMAC-hashed IP/UA (account_security_events) |
| Data subjects | Registered users (estimators, contractors, architects, owners) |
| Categories of recipients | Cloudflare (D1, Workers), Google (OAuth) |
| Third-country transfers | Cloudflare global edge (regions `[OPEN-DEC-003]`) |
| Retention | Account lifetime + 30 days post-erasure; audit logs 365 days |
| Legal basis (GDPR) | Contract performance (Art. 6(1)(b)) |
| Lawful processing (DPA) | Contract / consent (IRR §12) |
| Source code | `src/lib/auth/*`, `account_security_events` table |

### PA-02 — Estimate authoring and project data

| Field | Value |
|---|---|
| Purpose | Create, edit, and store cost estimates and projects |
| Data categories | Project name, client name, line items, totals, currency, attachments (PDF/XLS in R2) |
| Data subjects | User (data controller for their own client data); end-clients named in estimates |
| Categories of recipients | Cloudflare (D1, R2) |
| Third-country transfers | Cloudflare global edge |
| Retention | Project lifetime; soft-deletable; audit events 365 days |
| Legal basis (GDPR) | Contract performance |
| Lawful processing (DPA) | Contract |
| Source code | `src/lib/estimates/*`, `src/lib/repositories/estimate-repository.ts`, `estimates`/`estimate_nodes`/`estimate_row_items` tables |

### PA-03 — Component library (reusable cost items)

| Field | Value |
|---|---|
| Purpose | Build a reusable cost-component library (brands, suppliers, variants, prices) |
| Data categories | Component name, supplier names, brand names, price options, attachments, images |
| Data subjects | User (workspace-scoped); supplier/brand contact info if entered |
| Categories of recipients | Cloudflare (D1, R2, Images) |
| Retention | Workspace lifetime; deletable |
| Legal basis | Contract performance |
| Source code | `src/lib/component-library/*`, `cost_library_items` table family |

### PA-04 — Collaboration (team invites, realtime presence)

| Field | Value |
|---|---|
| Purpose | Allow teams to collaborate on estimates; broadcast cursor positions via Durable Objects |
| Data categories | Invitee email, invite token (HMAC), cursor positions (transient), user presence |
| Data subjects | Invitees (typically colleagues of the inviter) |
| Categories of recipients | Cloudflare (D1, Durable Objects) |
| Retention | Invite token: 7 days default; cursor presence: transient (Durable Object SQLite, no disk persistence beyond room lifetime) |
| Legal basis | Contract performance + legitimate interest |
| Source code | `src/lib/collaboration/*`, `collaboration_invitations`/`collaboration_audit_events` tables, `CollaborationRoom` DO |

### PA-05 — Publication / shared link

| Field | Value |
|---|---|
| Purpose | Send a proposal link to a client for review, comment, decision |
| Data categories | Recipient email, optional share password (hashed), share token (HMAC), comment text, decision responses, page-view events (HMAC-hashed identifier) |
| Data subjects | Recipient (client of the Archestimator user) |
| Categories of recipients | Cloudflare (D1, Workers, Email) |
| Retention | Publication lifetime + 90 days of events; comment/decision data kept until publication is deleted |
| Legal basis | Contract performance + legitimate interest |
| Source code | `src/lib/publication/*`, `project_publications`/`shared_link_*` tables |

### PA-06 — Account security audit (auth abuse detection)

| Field | Value |
|---|---|
| Purpose | Detect brute-force, credential stuffing, OAuth abuse |
| Data categories | Event type, user ID (if known), HMAC-hashed IP, HMAC-hashed user-agent, request ID, metadata |
| Data subjects | Auth attempt actors (mostly anonymous) |
| Categories of recipients | Cloudflare (D1) |
| Retention | 365 days (180 days for legacy plain-SHA-256 rows) |
| Legal basis | Legitimate interest (Art. 6(1)(f)) — protect service from abuse |
| Source code | `src/lib/auth/account-audit.ts`, `account_security_events` table |

### PA-07 — Privacy requests themselves

| Field | Value |
|---|---|
| Purpose | Intake and resolve DSAR / privacy requests |
| Data categories | Request kind, description, optional email (HMAC-hashed), optional name, status transitions, triage notes |
| Data subjects | Requester (often the data subject themselves) |
| Categories of recipients | Cloudflare (D1) |
| Retention | Completed: 2555 days (~7y). Rejected: 365 days. |
| Legal basis | Compliance with legal obligation (Art. 6(1)(c)) + legitimate interest (audit trail) |
| Source code | `src/lib/compliance/privacy-request-repository.ts`, `privacy_requests` table |

### PA-08 — Email delivery (transactional)

| Field | Value |
|---|---|
| Purpose | Send invite emails, share notifications, support replies |
| Data categories | Recipient email, sender email, subject, body, delivery status |
| Data subjects | Recipients (invitees, clients, support requesters) |
| Categories of recipients | Cloudflare Email Service |
| Retention | Delivery logs: 90 days (Cloudflare platform default) |
| Legal basis | Contract performance |
| Source code | `src/lib/email/*`, Cloudflare `EMAIL` binding |

### PA-09 — File upload scanning

| Field | Value |
|---|---|
| Purpose | Scan uploads for malware (ClamAV when reachable; policy-scanner as fallback) |
| Data categories | File bytes (transient during scan), file metadata (size, content type, checksum), scan outcome, scan signature if infected |
| Data subjects | Uploader (workspace user) |
| Categories of recipients | Cloudflare (D1, R2, Queue + DLQ) |
| Retention | Scan results: kept with the upload_asset record (workspace lifetime); DLQ review queue |
| Legal basis | Contract performance + legitimate interest (security) |
| Source code | `src/lib/uploads/*`, `upload_assets` table |

### PA-10 — Observability (Worker logs and traces)

| Field | Value |
|---|---|
| Purpose | Debug, monitor, and alert on Worker runtime behavior |
| Data categories | Structured log fields (event name, opaquely-redacted context), sampling 0.1 logs / 0.05 traces |
| Data subjects | Users (incidentally, when their request triggers the log) |
| Categories of recipients | Cloudflare Observability |
| Retention | 30 days (platform default) |
| Legal basis | Legitimate interest (service reliability) |
| Source code | `wrangler.jsonc` `observability` block |

## Joint controllers / co-controller arrangements

None currently. `[If/when a co-processor or joint-controller arrangement exists (e.g., a partner integration), document here]`.

## Sub-processor changes

Sub-processor additions will be announced `[OPEN-DEC-003 — confirm communication channel]` 30 days before activation, giving users the opportunity to object.

## Counsel review checklist

- [ ] Are all processing activities captured? (Codebase audit cross-check)
- [ ] Is the legal basis for each activity correct?
- [ ] Are retention periods consistent with statutory minimums in PH + any EU user jurisdictions?
- [ ] Are third-country transfer safeguards accurately described?
- [ ] Should any activity be split (e.g., AI features when enabled)?
