# E-009 — Vendor DPA Review Worksheet

**Evidence ID:** E-009
**Status:** Ready for owner action
**Owner:** Philip Echavez Lewis
**Blocks production?:** ✅ YES

---

## Vendor Inventory

### 1. Supabase

| Field | Value |
|-------|-------|
| **Data processed** | All Archestimator data: user profiles, estimates, projects, shared links, access telemetry, audit events |
| **DPA needed?** | ✅ YES — Supabase processes all application data |
| **DPA link** | https://supabase.com/legal/dpa |
| **Processing location** | `ap-southeast-1` (Singapore) |
| **Sub-processors** | AWS (infrastructure) + Supabase-listed sub-processors |
| **Breach notification commitment** | Per Supabase DPA terms |
| **DSR support** | Data accessible via SQL; deletion supported |

**Review checklist:**
- [ ] Current Supabase DPA accessed and reviewed
- [ ] DPA covers all data categories collected by Archestimator
- [ ] Processing location (`ap-southeast-1`) is acceptable for Philippine data subjects
- [ ] Sub-processor list reviewed and noted
- [ ] Breach notification terms align with Philippine DPA 72-hour requirement
- [ ] DPA includes Standard Contractual Clauses (SCCs) or equivalent transfer mechanism
- [ ] Any gaps between Supabase DPA and Philippine DPA requirements documented
- [ ] Compensating controls identified for any gaps

**Owner review status:** ⬜ Not reviewed / ⬜ In review / ⬜ Approved / ⬜ Gaps identified
**Blocker status:** ⬜ No blockers / ⬜ Minor gaps (documented) / ⬜ Major gaps (must resolve)

---

### 2. Vercel

| Field | Value |
|-------|-------|
| **Data processed** | HTTP request headers (IP, user-agent, geolocation), response data, edge function execution |
| **DPA needed?** | ✅ YES — Vercel processes request data including headers used for access telemetry |
| **DPA link** | https://vercel.com/legal/dpa |
| **Processing location** | Vercel global edge network |
| **Sub-processors** | AWS (infrastructure) + Vercel-listed sub-processors |
| **Breach notification commitment** | Per Vercel DPA terms |
| **DSR support** | Request headers not retained by Vercel after request processing; access telemetry data stored in Supabase, not Vercel |

**Review checklist:**
- [ ] Current Vercel DPA accessed and reviewed
- [ ] DPA covers request header processing at the edge
- [ ] Edge network processing locations documented
- [ ] Sub-processor list reviewed and noted
- [ ] Breach notification terms align with Philippine DPA 72-hour requirement
- [ ] DPA includes Standard Contractual Clauses (SCCs) or equivalent transfer mechanism
- [ ] Any gaps between Vercel DPA and Philippine DPA requirements documented
- [ ] Compensating controls identified for any gaps

**Owner review status:** ⬜ Not reviewed / ⬜ In review / ⬜ Approved / ⬜ Gaps identified
**Blocker status:** ⬜ No blockers / ⬜ Minor gaps (documented) / ⬜ Major gaps (must resolve)

---

### 3. Resend

| Field | Value |
|-------|-------|
| **Data processed** | Recipient email addresses, email content |
| **DPA needed?** | ⚠️ Advisory — access telemetry data does NOT transit through Resend |
| **DPA link** | https://resend.com/legal/dpa |
| **Processing location** | Per Resend infrastructure |
| **Sub-processors** | Per Resend-listed sub-processors |

**Review checklist:**
- [ ] Confirmed: access telemetry data does NOT transit through Resend
- [ ] Resend DPA reviewed for completeness (general compliance, not access-telemetry-specific)
- [ ] Exclusion documented: Resend is out of scope for access telemetry data flow

**Owner review status:** ⬜ Not reviewed / ⬜ Reviewed (out of scope) / ⬜ Noted
**Blocker status:** ⬜ Not applicable (out of scope for access telemetry)

---

### 4. GitHub

| Field | Value |
|-------|-------|
| **Data processed** | Source code only; no personal data |
| **DPA needed?** | ❌ No — GitHub hosts source code, not production data |
| **Processing location** | N/A |
| **Note** | GitHub is a development tool, not a data processor for Archestimator production services |

---

### 5. OpenAI / AI Providers (if applicable)

| Field | Value |
|-------|-------|
| **Data processed** | User prompts (if AI features are enabled) |
| **DPA needed?** | ⬜ TBD — depends on whether AI features process personal data |
| **DPA link** | ⬜ TBD |
| **Note** | AI features are currently behind feature flags. If enabled in production, review DPA requirements. Not currently in scope for access telemetry. |

---

## Data Flow Diagram — Access Telemetry

```
[User Browser]
    │
    │  HTTPS request (headers: IP, UA, geolocation)
    ▼
[Vercel Edge Network] ← DPA: https://vercel.com/legal/dpa
    │
    │  Request forwarded with headers
    ▼
[Next.js Server (Vercel Serverless)]
    │
    │  IP hashed (SHA-256) → raw IP discarded
    │  UA hashed (SHA-256) → raw UA discarded
    │  Country extracted from header (country only)
    │  Device/browser/OS parsed from UA
    │
    ▼
[Supabase PostgreSQL] ← DPA: https://supabase.com/legal/dpa
    │
    │  project_publication_events table
    │  Stored: ip_hash, ua_hash, country, device_type,
    │          browser_family, os_family, timestamp, access_stage
    │  NOT stored: raw IP, raw UA, GPS, city, region,
    │              password values, referrer URLs
    │
    ▼
[90-Day Retention Cleanup] (E-010)
    │
    │  Rows >90 days: deleted
    │  Rows <90 days: preserved
```

---

## Review Memo Template

```
VENDOR DPA REVIEW MEMO — Access Telemetry Production Enablement

Date: ______________________________
Reviewer: ______________________________

Summary:
________________________________________
________________________________________

Supabase DPA:
- Reviewed: [ ] Yes [ ] No
- DPA date/version: ______________________________
- Processing location acceptable: [ ] Yes [ ] No
- Sub-processors reviewed: [ ] Yes [ ] No
- Breach notification aligned: [ ] Yes [ ] No (gap: _______________)
- Gaps identified: [ ] None [ ] Minor [ ] Major
- Compensating controls: ________________________________________

Vercel DPA:
- Reviewed: [ ] Yes [ ] No
- DPA date/version: ______________________________
- Edge processing acceptable: [ ] Yes [ ] No
- Sub-processors reviewed: [ ] Yes [ ] No
- Breach notification aligned: [ ] Yes [ ] No (gap: _______________)
- Gaps identified: [ ] None [ ] Minor [ ] Major
- Compensating controls: ________________________________________

Resend:
- Confirmed out of scope for access telemetry data: [ ] Yes
- General DPA reviewed: [ ] Yes [ ] No

Overall assessment:
⬜ All vendor DPAs are adequate for access telemetry production enablement.
⬜ Gaps exist but compensating controls are in place.
⬜ Gaps exist that must be resolved before production enablement.

Signed: ______________________________
Date: ______________________________
```

---

## Completion Criteria

1. Supabase DPA reviewed and linked.
2. Vercel DPA reviewed and linked.
3. Data processing locations confirmed.
4. Sub-processor lists reviewed for both vendors.
5. Review memo dated and signed.

---

**Source doc:** `63-vendor-processor-dpa-evidence-worksheet.md`
**Gate:** G-09
**Next:** After DPA review and memo sign-off, update `64-access-telemetry-production-evidence-ledger.md` to mark E-009 as Complete.
