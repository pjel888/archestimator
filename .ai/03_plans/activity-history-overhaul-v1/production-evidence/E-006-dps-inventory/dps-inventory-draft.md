# E-006 — Data Processing System (DPS) Inventory

**Evidence ID:** E-006
**Status:** Drafted — Ready for owner review
**Owner:** Philip Echavez Lewis / DPO
**Blocks production?:** ✅ YES

---

## Data Processing Systems

### 1. Archestimator Application

| Field | Value |
|-------|-------|
| System name | Archestimator (Next.js application) |
| Purpose | Construction estimating, proposal management, and collaboration SaaS |
| Data categories | User profiles (email, name), estimate/project data, shared-link publication data, access telemetry data |
| Data subjects | Registered users, shared link recipients, anonymous visitors |
| Legal basis | Legitimate interest (service operation), consent (marketing, if applicable) |
| Retention | Account data: duration of account + 30 days. Access telemetry: 90 days from collection. Estimate events: indefinite (audit trail). |
| Recipients | Supabase (database), Vercel (hosting), Resend (email) |
| Transfers | Data stored in Supabase `ap-southeast-1` (Singapore). Edge processing via Vercel global edge network. |

---

### 2. Supabase / PostgreSQL

| Field | Value |
|-------|-------|
| System name | Supabase (managed PostgreSQL 17) |
| Role | Data storage and processing (PIP) |
| Data categories | All Archestimator data: user profiles, estimates, projects, component library, shared links, access telemetry, audit events |
| Purpose | Primary database for all application data |
| Data subjects | All Archestimator users and shared link visitors |
| Legal basis | Data processing agreement (DPA) with Supabase |
| Retention | Controlled by Archestimator application retention policies |
| Processing location | `ap-southeast-1` (Singapore) |
| DPA link | https://supabase.com/legal/dpa |
| Sub-processors | AWS (infrastructure), plus Supabase's listed sub-processors |

---

### 3. Supabase Auth

| Field | Value |
|-------|-------|
| System name | Supabase Auth (GoTrue) |
| Role | Authentication service (PIP) |
| Data categories | User emails, OAuth tokens, session data |
| Purpose | User authentication and session management |
| Data subjects | Registered Archestimator users |
| Legal basis | Data processing agreement (DPA) with Supabase |
| Retention | Session tokens: session duration. User records: duration of account. |
| Processing location | `ap-southeast-1` (Singapore) |
| DPA link | https://supabase.com/legal/dpa |

---

### 4. Vercel Hosting / Edge Network

| Field | Value |
|-------|-------|
| System name | Vercel (hosting and edge network) |
| Role | Application hosting and edge request processing (PIP) |
| Data categories | HTTP request headers (including IP, user-agent, geolocation headers), response data |
| Purpose | Serving the Archestimator application, edge request routing, serverless function execution |
| Data subjects | All visitors to archestimator.com |
| Legal basis | Data processing agreement (DPA) with Vercel |
| Retention | Edge function logs: per Vercel log retention policy. Access telemetry data is not stored in Vercel logs by design (processed server-side, stored in Supabase). |
| Processing location | Vercel global edge network |
| DPA link | https://vercel.com/legal/dpa |
| Sub-processors | AWS (infrastructure), plus Vercel's listed sub-processors |

---

### 5. Resend (Email)

| Field | Value |
|-------|-------|
| System name | Resend (email delivery) |
| Role | Email delivery service (PIP) |
| Data categories | Recipient email addresses, email content |
| Purpose | Sending shared link invitations, notifications, and transactional emails |
| Data subjects | Shared link recipients, invited collaborators |
| Legal basis | Data processing agreement (DPA) with Resend |
| Retention | Per Resend data processing terms |
| Processing location | Per Resend infrastructure |
| DPA link | https://resend.com/legal/dpa |
| Note | Access telemetry data does NOT transit through Resend |

---

### 6. Shared Link System

| Field | Value |
|-------|-------|
| System name | Archestimator Shared Link System (internal module) |
| Purpose | Managing project publication links, password gates, recipient sessions |
| Data categories | Publication tokens (hashed), password hashes, recipient session cookies, shared link events (comments, decisions, access telemetry) |
| Data subjects | Shared link recipients, anonymous visitors |
| Legal basis | Legitimate interest (providing shared link service to project owners) |
| Retention | Shared link data: retention per project owner settings. Access telemetry: 90 days. |
| Recipients | Supabase (all data stored in PostgreSQL) |

---

### 7. Activity History / Access Telemetry

| Field | Value |
|-------|-------|
| System name | Archestimator Activity History + Access Telemetry (internal module) |
| Purpose | Recording and displaying project activity (estimate changes) and access telemetry (shared link visits) |
| Data categories | Estimate mutation events (row_added, row_updated, etc.), access telemetry events (page_visited, password_attempted, proposal_viewed with device/browser/OS/country metadata and hashed IP/UA) |
| Data subjects | Registered users (estimate activity), shared link visitors (access telemetry) |
| Legal basis | Legitimate interest (activity history for project owners; security monitoring for shared links) |
| Retention | Estimate events: indefinite (audit trail). Access telemetry: 90 days from collection. |
| Disclosure | Privacy notice (E-001), in-product disclosure (E-002, E-003) |

---

## Access Telemetry Data Flow

```
Visitor opens shared link
  → Vercel edge receives request (headers: IP, UA, geolocation)
  → Next.js server processes request
    → Bot/crawler detection (user-agent analysis)
    → IP hashed (SHA-256) — raw IP discarded
    → UA hashed (SHA-256) — raw UA discarded
    → Country extracted from Vercel headers (country only, no city/region)
    → Device/browser/OS parsed from UA
  → Data written to Supabase PostgreSQL (project_publication_events table)
  → Raw IP, raw UA, GPS, password values, referrer URLs NEVER stored
  → Records auto-deleted after 90 days (retention cleanup)
```

---

## Is Access Telemetry "Personal Information"?

Access telemetry stores:
- **IP hash** (SHA-256) — pseudonymized identifier; could be re-identified if the visitor's IP is known
- **UA hash** (SHA-256) — pseudonymized identifier
- **Country** — coarse location, not individually identifying
- **Device type, browser family, OS family** — device context, not individually identifying
- **Timestamp** — temporal data point

**Assessment:** Hashed IP and UA are pseudonymized data, which under Philippine DPA may still be considered personal information if re-identification is reasonably possible. Conservative approach: treat access telemetry data as personal information for DPS inventory purposes.

---

## Completion Criteria

1. Inventory lists every system that processes access telemetry data (Archestimator app, Supabase, Vercel, browser client).
2. For each system: data categories processed, purpose, retention period, and lawful basis are stated.
3. Access telemetry data flows are mapped end to end.
4. Document is dated and signed.

---

## Sign-Off

```
Prepared by: ________________________________
Date: ________________________________

Reviewed by (DPO): ________________________________
Date: ________________________________

Signed: ________________________________
Date: ________________________________
```

---

**Source doc:** `53-dpo-npcrs-and-dps-registration-triage.md` §5
**Gate:** G-06
**Next:** After owner review and sign-off, update `64-access-telemetry-production-evidence-ledger.md` to mark E-006 as Complete.
