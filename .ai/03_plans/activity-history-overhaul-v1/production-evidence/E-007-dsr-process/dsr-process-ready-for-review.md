# E-007 — Data Subject Request (DSR) Process

**Evidence ID:** E-007
**Status:** Ready for owner review
**Owner:** Philip Echavez Lewis / DPO
**Blocks production?:** ✅ YES

---

## 1. DSR Intake Channel

| Field | Value |
|-------|-------|
| Primary contact | ⬜ privacy@archestimator.com (to be configured) |
| Alternative contact | ⬜ Owner contact form / support email |
| Response SLA | 30 calendar days from verified request (per DPA §16, §17) |
| Intake form | ⬜ Email inbox / ⬜ Web form / ⬜ Both |

---

## 2. Identity Verification Procedure

Before processing any DSR:

1. Requester must provide: full name, contact information, and description of request.
2. Verify identity via one of:
   - Email match to known records (registered user email)
   - Government ID upload (for non-users requesting access telemetry data)
   - Registered account login
3. If requester is not identifiable in Archestimator records: inform requester that no matching personal data was found.
4. Document verification in DSR log.

**For access telemetry specifically:** Access telemetry records are associated with hashed identifiers (IP hash, UA hash). A DSR for access telemetry data requires the requester to provide their IP address(es) at the time of access. The operator hashes the provided IP and searches for matching records.

---

## 3. DSR Categories and Response Procedures

### Access

- **What:** Requester wants to know what personal data Archestimator holds about them.
- **Procedure:**
  1. Verify identity (Section 2)
  2. Search for records matching requester's identifiers across all systems (user profile, estimates, projects, access telemetry)
  3. Compile response with all matching records
  4. Redact third-party personal data
  5. Provide response in portable format (PDF or JSON)
  6. Document in DSR log
- **SLA:** Within 30 calendar days

### Correction

- **What:** Requester claims data is inaccurate and wants it corrected.
- **Procedure:**
  1. Verify identity (Section 2)
  2. Locate the specific record(s) in question
  3. Assess accuracy — if error confirmed, correct the record
  4. If correction is not possible (e.g., immutable audit log), add a note/dispute annotation
  5. Confirm correction to requester
  6. Document in DSR log
- **SLA:** Within 30 calendar days

### Deletion / Erasure / Blocking

- **What:** Requester wants their data deleted or blocked from further processing.
- **Procedure:**
  1. Verify identity (Section 2)
  2. Determine which records to delete/block
  3. For access telemetry: locate by IP hash match and delete matching `project_publication_events` rows
  4. For account data: delete user profile and associated data (project deletion cascade)
  5. Confirm deletion to requester
  6. Document in DSR log
  7. Note: Supabase PITR backups may retain deleted data for the backup window (typically 7 days)
- **SLA:** Within 30 calendar days

### Objection

- **What:** Requester objects to processing of their personal data.
- **Procedure:**
  1. Verify identity (Section 2)
  2. Assess the basis for objection vs legitimate interest
  3. If objection is valid: cease processing, block further collection
  4. If legitimate interest overrides: document rationale, notify requester
  5. For access telemetry: project owners control shared link publication — disabling a publication link stops all future access telemetry for that link
  6. Document in DSR log
- **SLA:** Within 30 calendar days

### Portability (if applicable)

- **What:** Requester wants their data in a portable format.
- **Procedure:**
  1. Verify identity (Section 2)
  2. Export data in structured, commonly used format (JSON, CSV)
  3. Provide to requester
  4. Document in DSR log
- **SLA:** Within 30 calendar days

---

## 4. DSR Intake Template

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
Completed by: ______________________________

Notes: ______________________________
```

---

## 5. DSR Response Templates

### Acknowledgment

```
Subject: Data Subject Request Received — [#DSR-XXX]

Dear [Name],

We have received your data subject request dated [date]. Your request type is: [Access / Correction / Deletion / Objection / Portability].

We will process your request within 30 calendar days as required by the Philippine Data Privacy Act (RA 10173). We may contact you if we need additional information to verify your identity.

Your request reference number: DSR-[YYYY]-[NNN]

For questions, contact: [DPO email]

Sincerely,
[DPO Name]
Data Protection Officer
```

### Data Access Response

```
Subject: Data Subject Request Response — [#DSR-XXX]

Dear [Name],

In response to your data access request dated [date], we have compiled the personal data Archestimator holds about you.

Attached: [response file — PDF or JSON]

If you believe any of this data is inaccurate, you may submit a correction request.

For questions, contact: [DPO email]

Sincerely,
[DPO Name]
Data Protection Officer
```

### Deletion Confirmation

```
Subject: Data Deletion Confirmed — [#DSR-XXX]

Dear [Name],

In response to your data deletion request dated [date], we have deleted the following records:

[List of deleted records or categories]

Please note that backup systems may retain copies of deleted data for up to 7 days as part of our disaster recovery infrastructure.

For questions, contact: [DPO email]

Sincerely,
[DPO Name]
Data Protection Officer
```

---

## 6. DSR Log Template

| DSR ID | Date Received | Requester | Type | Verified | Date Completed | Outcome |
|--------|--------------|-----------|------|----------|----------------|---------|
| DSR-YYYY-001 | | | | ⬜ | | |
| DSR-YYYY-002 | | | | ⬜ | | |

---

## Completion Criteria

1. DSR intake channel is defined (email, form, or both) and documented.
2. Verification procedure for requestor identity is defined.
3. Response timeline (30 calendar days per Philippine DPA) is documented.
4. Procedure for locating and returning access telemetry data for a given data subject is defined.
5. DSR log template or tracking method exists.

---

## Verification

- [ ] Send a test DSR request through the documented intake channel
- [ ] Confirm acknowledgment is received within SLA window
- [ ] Confirm mock response follows the approved template
- [ ] Confirm DPO (E-004) receives the request notification

---

**Source doc:** `54-data-subject-request-and-breach-response-playbook.md` Part A
**Gate:** G-07
**Next:** After owner review and operationalization, update `64-access-telemetry-production-evidence-ledger.md` to mark E-007 as Complete.
