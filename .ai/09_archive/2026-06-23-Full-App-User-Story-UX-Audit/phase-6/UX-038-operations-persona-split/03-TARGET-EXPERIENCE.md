# 03 — Target Experience

Date: 2026-06-23

## Six Split Operator Personas

The target experience defines six distinct operator personas. Each persona has a name, description, proof obligations, stop condition, handoff trigger, and required view. This replaces the current compressed "operator" rows.

### 1. Incident Commander

- **Description:** The person responsible for confirming that monitoring, alerting, and incident response are operational before any beta widening.
- **Proof obligations:**
  1. Monitoring inbox is reachable (email or dashboard inbox configured).
  2. Uptime alerts are configured and firing correctly.
  3. Error alerts are configured and firing correctly.
  4. Incident escalation path is documented and tested.
- **Stop condition:** All 4 monitoring proof flags are confirmed true.
- **Handoff trigger:** Hand off to the Provider Owner when monitoring is green.
- **Required view:** A single checklist showing the 4 monitoring proof flags with PASS/FAIL status and last-checked timestamp.

### 2. Provider Owner

- **Description:** The person responsible for proving that all external providers (Resend, Supabase, Vercel, Maps) are healthy and correctly configured.
- **Proof obligations:**
  1. Resend env vars are present and email delivery is proven.
  2. Supabase project is linked and migrations are in parity (67 local migrations applied).
  3. Vercel env is configured, health checks pass, and production target is set.
  4. Maps provider (if applicable) is configured and responding.
- **Stop condition:** All critical providers are PASS or documented FAIL with an acceptable fallback.
- **Handoff trigger:** Hand off to the Privacy/Legal Owner when providers are proven.
- **Required view:** A provider health matrix showing each provider, its status, the last check timestamp, the owner name, and the fallback plan for any FAIL.

### 3. Privacy/Legal Owner

- **Description:** The person responsible for confirming that legal, privacy, and compliance requirements are met before beta widening.
- **Proof obligations:**
  1. Terms of Service are confirmed present and reviewed.
  2. Privacy Policy is confirmed present and reviewed.
  3. Beta copy is confirmed compliant (no misleading claims, no liability gaps).
  4. Data retention policy is confirmed and documented.
  5. Support communications (DSAR, delete, export) are confirmed functional.
- **Stop condition:** All 5 legal proof flags are confirmed true.
- **Handoff trigger:** Hand off to Launch Operations when legal is clear.
- **Required view:** A legal proof checklist showing each item, its status, the reviewer name, and the review date.

### 4. Support Triage

- **Description:** The person responsible for receiving, categorizing, and routing user feedback and beta access requests.
- **Proof obligations:**
  1. Feedback queue is reachable and monitored.
  2. Beta access request process is documented.
  3. Initial categorization rules are documented (bug vs feature vs question).
  4. Escalation path to Support Response is documented.
- **Stop condition:** All 4 triage proof items are documented and the queue is actively monitored.
- **Handoff trigger:** Hand off to Support Response when an issue requires resolution beyond categorization.
- **Required view:** A triage dashboard showing open feedback items, their category, age, and assigned responder.

### 5. Support Response

- **Description:** The person responsible for resolving user issues, executing repair actions, and documenting audit notes.
- **Proof obligations:**
  1. User issue resolution process is documented.
  2. Repair action playbook is documented (what can be fixed without code change).
  3. Audit note template is defined (what to record for each resolved issue).
  4. Escalation path to engineering is documented (when a fix requires code change).
- **Stop condition:** All 4 response proof items are documented and at least one resolved issue has an audit note.
- **Handoff trigger:** Hand off to engineering when a fix requires code change; hand off to Launch Operations when support is stable.
- **Required view:** A response dashboard showing resolved issues, open issues, average resolution time, and audit note coverage.

### 6. Launch Operations

- **Description:** The person responsible for the final go/no-go decision, cohort management, and release campaign coordination.
- **Proof obligations:**
  1. All prior personas (Incident Commander, Provider Owner, Privacy/Legal Owner, Support Triage, Support Response) have confirmed handoff.
  2. Cohort composition is documented (who is in the beta, what they can access).
  3. Release campaign safety is confirmed (no broken links, correct targeting, no exposed internal routes).
  4. Go/no-go vote is recorded with rationale.
- **Stop condition:** All 4 launch proof items are confirmed and the go/no-go vote is green.
- **Handoff trigger:** Authorize beta widening when all conditions are met.
- **Required view:** A launch readiness summary showing handoff status from all personas, cohort details, campaign safety check, and the go/no-go vote.

## Persona Handoff Flow

```
Incident Commander → Provider Owner → Privacy/Legal Owner → Launch Operations
                          ↓
                   Support Triage ↔ Support Response
```

The handoff flow is sequential for the core chain. Support Triage and Support Response operate in parallel and feed into Launch Operations.

## Stop Conditions Summary

| Persona | Stop condition |
|---|---|
| Incident Commander | All 4 monitoring flags true |
| Provider Owner | All critical providers PASS or documented FAIL with fallback |
| Privacy/Legal Owner | All 5 legal flags confirmed |
| Support Triage | All 4 triage items documented and queue monitored |
| Support Response | All 4 response items documented and ≥1 audit note exists |
| Launch Operations | All handoffs complete, cohort documented, campaign safe, vote green |

## What Each Persona Needs to See

| Persona | View |
|---|---|
| Incident Commander | Monitoring checklist with PASS/FAIL |
| Provider Owner | Provider health matrix with owner and fallback |
| Privacy/Legal Owner | Legal proof checklist with reviewer and date |
| Support Triage | Triage dashboard with category and age |
| Support Response | Response dashboard with resolution time and audit notes |
| Launch Operations | Launch readiness summary with all handoffs and vote |

## Non-Goals

- No code changes under `src/` or `scripts/`.
- No new permission roles or database tables.
- No UI dashboard implementation (markdown definitions are sufficient for closed beta).
- No claim that personas are staffed without owner confirmation.
