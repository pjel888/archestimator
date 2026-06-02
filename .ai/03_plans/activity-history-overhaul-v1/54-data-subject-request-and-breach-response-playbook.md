# 54 — Data Subject Request and Breach Response Playbook

**Date:** 2026-06-02
**Purpose:** Operational playbook for handling data subject requests (DSR) and personal data breaches.
**Status:** Planning template — ready to operationalize. DPO or privacy officer should customize before use.

---

## Part A: Data Subject Requests (DSR)

### 1. Intake Channel

| Field | Value |
|-------|-------|
| Primary contact | privacy@archestimator.com (or equivalent) |
| Alternative contact | Owner contact form / support email |
| Response SLA | 30 days from verified request (per DPA §16, §17) |

### 2. Identity Verification

Before processing any DSR, verify the requester's identity:

- [ ] Request includes full name and contact information
- [ ] Identity verified via: email match to known records / government ID upload / registered account login
- [ ] If requester is not identifiable in Archestimator records: inform requester that no matching personal data found

**For access telemetry specifically:** Access telemetry records are associated with hashed identifiers (IP hash, UA hash), not direct personal identifiers. A DSR for access telemetry data would require the requester to provide their IP address(es) at the time of access. The operator hashes the provided IP and searches for matching records.

### 3. Request Categories

#### Access

- **What:** Requester wants to know what personal data Archestimator holds about them.
- **Procedure:**
  1. Verify identity
  2. Search for records matching requester's identifiers
  3. Compile response with all matching records
  4. Redact third-party personal data
  5. Provide response in portable format (PDF or JSON)

#### Correction

- **What:** Requester claims data is inaccurate and wants it corrected.
- **Procedure:**
  1. Verify identity
  2. Locate the specific record(s) in question
  3. Assess accuracy — if error confirmed, correct the record
  4. If correction is not possible (e.g., immutable audit log), add a note/dispute annotation
  5. Confirm correction to requester

#### Deletion / Erasure / Blocking

- **What:** Requester wants their data deleted or blocked from further processing.
- **Procedure:**
  1. Verify identity
  2. Determine which records to delete/block
  3. For access telemetry: locate by IP hash match and delete matching `project_publication_events` rows
  4. For account data: delete user profile and associated data (project deletion cascade)
  5. Confirm deletion to requester
  6. Note: Supabase PITR backups may retain deleted data for the backup window — document this

#### Objection

- **What:** Requester objects to processing of their personal data.
- **Procedure:**
  1. Verify identity
  2. Assess the basis for objection vs legitimate interest
  3. If objection is valid: cease processing, block further collection
  4. If legitimate interest overrides: document rationale, notify requester
  5. For access telemetry: project owners control shared link publication — disabling a publication link stops all future access telemetry for that link

#### Portability (if applicable)

- **What:** Requester wants their data in a portable format.
- **Procedure:**
  1. Verify identity
  2. Export data in structured, commonly used format (JSON, CSV)
  3. Provide to requester

### 4. DSR Intake Template

```
--- Data Subject Request ---
Date received: ______________________________
Received via: [ ] Email [ ] Contact form [ ] Other: _______________

Requester name: ______________________________
Requester contact: ______________________________
Requester relationship: [ ] Registered user [ ] Shared link recipient [ ] Other

Request type: [ ] Access [ ] Correction [ ] Deletion [ ] Objection [ ] Portability
Description of request: ______________________________

Identity verified: [ ] Yes [ ] No — awaiting verification
Verified by: ______________________________
Date verified: ______________________________

Records found: [ ] Yes — ___ records [ ] No matching records
Action taken: ______________________________
Date completed: ______________________________
Response sent to requester: [ ] Yes [ ] No
---
```

### 5. DSR Recordkeeping

- Maintain a DSR log (spreadsheet or database table)
- Record: date received, requester, request type, action taken, date completed
- Retain DSR logs for at least 3 years (for NPC audit purposes)

---

## Part B: Breach Response

### 1. What Counts as a Possible Breach

Any incident involving unauthorized access, disclosure, alteration, loss, or destruction of personal data, including:

- Unauthorized database access or exfiltration
- Accidental exposure of access telemetry data (e.g., IP hash visible in public response)
- RLS misconfiguration exposing other users' access data
- Credential compromise allowing access to telemetry data
- Lost or stolen device containing telemetry data
- Third-party vendor breach affecting Archestimator data

**For access telemetry specifically:** Since raw IP, raw UA, GPS, passwords, and fingerprinting data are never stored, the risk from a breach of access telemetry data is lower than for other personal data categories. However, hashed IP, device metadata, and country-level location are still considered potential personal data.

### 2. Severity Triage

| Severity | Criteria | Response Time |
|----------|----------|---------------|
| **Critical** | Unauthorized access to raw personal data of 100+ data subjects; RLS failure exposing multiple users' data; vendor breach | Immediate (within hours) |
| **High** | Exposure of access telemetry data (hashed identifiers, device metadata, country); unauthorized access to <100 records | Within 24 hours |
| **Medium** | Potential misconfiguration without confirmed exposure; internal access control gap | Within 72 hours |
| **Low** | Minor policy violation; no data exposure | Within 7 days |

### 3. Response Protocol

#### Detection

- [ ] Incident reported by: automated monitoring / user report / internal discovery / vendor notification
- [ ] Date/time detected: ______________________________
- [ ] Initial reporter: ______________________________

#### Containment (Immediate)

- [ ] Isolate affected system(s)
- [ ] Revoke compromised credentials / API keys
- [ ] Suspend affected publication links if shared-link data is involved
- [ ] Disable feature flag if telemetry pipeline is compromised
- [ ] Take affected system snapshot for forensics

#### Assessment

- [ ] Type of breach: ______________________________
- [ ] Personal data categories affected: ______________________________
- [ ] Number of data subjects affected (estimate): ______________________________
- [ ] Root cause: ______________________________
- [ ] Risk to data subjects: [ ] Low [ ] Medium [ ] High [ ] Critical

#### Notification

**NPC Notification (if DPA applies):**
- [ ] Notify NPC within **72 hours** of discovery
- [ ] NPC notification includes: nature of breach, categories of data, number of subjects, measures taken, contact person
- [ ] NPC breach notification form completed

**Data Subject Notification:**
- [ ] Notify affected data subjects without undue delay
- [ ] If mass notification: email, in-app notification, or public website notice
- [ ] Notification includes: nature of breach, data involved, measures taken, steps subject should take, contact for questions

**Project Owner Notification (for shared-link breaches):**
- [ ] Notify affected project owners
- [ ] Provide details on which shared links were affected
- [ ] Recommend password rotation if applicable

#### Remediation

- [ ] Root cause addressed and verified
- [ ] Security measures updated
- [ ] Monitoring enhanced for similar patterns
- [ ] Staff training if human error contributed

#### Post-Incident

- [ ] Incident report documented
- [ ] Lessons learned documented
- [ ] Process improvements implemented
- [ ] Incident log archived

### 4. Breach Incident Log Template

```
--- Breach Incident Log ---
Incident ID: INC-YYYY-XXXX
Date detected: ______________________________
Detected by: ______________________________
Severity: [ ] Critical [ ] High [ ] Medium [ ] Low

Description:
_______________________________

Data affected:
- Categories: ______________________________
- Estimated subjects: ______________________________
- Actual subjects (after investigation): ______________________________

Containment actions (date/time): ______________________________
NPC notified? [ ] Yes — date: _______ [ ] No — rationale: _______
Data subjects notified? [ ] Yes — date: _______ [ ] No — rationale: _______

Root cause: ______________________________
Remediation: ______________________________
Date resolved: ______________________________
Closed by: ______________________________
---
```

### 5. Breach Notification Decision Template

```
--- Breach Notification Decision ---
Incident ID: INC-YYYY-XXXX

Decision: [ ] Notify NPC + data subjects
          [ ] Notify NPC only (low risk to subjects)
          [ ] Notify data subjects only
          [ ] No notification required (rationale below)

Rationale: ______________________________

Decision by: ______________________________
Date: ______________________________
```

---

## Part C: Quick Reference

### DSR Contact Card

```
Privacy inquiries: privacy@archestimator.com
Response time: within 30 days
DSR log: [location]
```

### Breach Escalation

```
1. Detect → Assess severity
2. Critical/High → Notify DPO / owner immediately
3. Assess NPC notification requirement (72-hour clock starts)
4. Contain breach
5. Investigate root cause
6. Notify stakeholders per severity
7. Remediate
8. Post-incident review
```

### Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| DPO / Privacy Officer | ⬜ | ⬜ |
| Engineering Lead | ⬜ | ⬜ |
| Legal Counsel (if retained) | ⬜ | ⬜ |
| NPC Breach Notification | National Privacy Commission | https://privacy.gov.ph |

---

## Cross-References

- `48-philippines-data-privacy-compliance-plan.md` §7 (data subject rights), §8 (breach notification)
- `51-access-telemetry-production-enablement-checklist.md` — Items A10-A11
- `53-dpo-npcrs-and-dps-registration-triage.md` — DPO designation
- `47-pr7-pr8b-approval-record.md` — PR 7 approval record
