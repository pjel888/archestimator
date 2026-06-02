# E-008 — Breach Response Process

**Evidence ID:** E-008
**Status:** Ready for owner review
**Owner:** Philip Echavez Lewis / DPO
**Blocks production?:** ✅ YES

---

## 1. Breach Detection Mechanisms

A personal data breach involving access telemetry data may be detected through:
- [ ] Automated monitoring alerts (database query anomalies, unusual access patterns)
- [ ] Manual reports (user reports, security researcher disclosures)
- [ ] Vendor notifications (Supabase, Vercel security advisories)
- [ ] Routine security audits

**Definition of access telemetry breach:** Unauthorized access to, disclosure of, or loss of access telemetry data (IP hashes, UA hashes, device/browser/OS metadata, country data, visit timestamps) stored in the `project_publication_events` table.

---

## 2. Breach Severity Classification

| Severity | Definition | Examples | Response Timeline |
|----------|-----------|----------|-------------------|
| **Critical** | Large-scale unauthorized access; data exfiltration; system compromise | Database breach exposing all access telemetry records | Immediate (within 24 hours) |
| **High** | Targeted unauthorized access; data leak to unauthorized parties | API endpoint exposing IP hashes without auth | Within 48 hours |
| **Medium** | Accidental exposure; misconfiguration | Logging raw IP addresses due to config error | Within 72 hours |
| **Low** | Minor non-compliance; procedural gap | Missing disclosure on one page variant | Within 7 days |

---

## 3. Breach Response Procedure

### Step 1: Detection & Reporting

- [ ] Incident reported (automated alert OR manual report)
- [ ] Incident logged with unique ID (BR-[YYYY]-[NNN])
- [ ] Date/time of detection recorded
- [ ] Initial reporter documented

### Step 2: Containment (Immediate — within 1 hour of detection)

- [ ] **Kill switch activated:** `ACCESS_TELEMETRY_ENABLED=false` in production Vercel env → redeploy
- [ ] Affected systems isolated (if database breach: restrict database access)
- [ ] API tokens/keys rotated if compromised
- [ ] Affected data scoped: what was accessed, by whom, when

### Step 3: Assessment (Within 24 hours)

- [ ] Scope determined: number of affected records, data subjects
- [ ] Data categories affected identified (IP hashes, UA hashes, device metadata, timestamps, country data)
- [ ] Root cause identified
- [ ] Risk to data subjects assessed (probability of re-identification, potential harm)
- [ ] Assessment documented in breach log

### Step 4: Notification

**If the breach poses a risk to data subjects' rights and freedoms:**

- [ ] **NPC notification** within 72 hours of discovery (per Philippine DPA)
  - Using NPC breach notification form or equivalent
  - Include: nature of breach, categories of data, number of affected individuals, likely consequences, measures taken
- [ ] **Data subject notification** without undue delay
  - If individual notification is disproportionate: public communication or similar measure
  - Include: nature of breach, likely consequences, measures taken, contact point for more information
- [ ] **Vendor notification** (Supabase, Vercel) if their systems were involved

### Step 5: Remediation

- [ ] Root cause fixed
- [ ] Security measures strengthened (additional access controls, monitoring, etc.)
- [ ] Feature flag re-enabled only after fix verified
- [ ] Post-incident review conducted
- [ ] Preventive measures documented

### Step 6: Documentation

- [ ] Full incident report filed
- [ ] Breach log updated
- [ ] Lessons learned documented
- [ ] Processes updated based on findings

---

## 4. Breach Log Template

| ID | Date Detected | Severity | Data Affected | # Records | Root Cause | Notified NPC? | Notified Subjects? | Status |
|----|--------------|----------|---------------|-----------|------------|---------------|--------------------|--------|
| BR-YYYY-001 | | | | | | ⬜ | ⬜ | |
| BR-YYYY-002 | | | | | | ⬜ | ⬜ | |

---

## 5. NPC Notification Template

```
To: National Privacy Commission
Via: NPC breach notification portal or email

Date: ______________________________

This is to notify the National Privacy Commission of a personal data breach affecting Archestimator (operated by [Legal Entity Name]).

1. Nature of breach: ________________________________________
2. Date and time of occurrence: ________________________________________
3. Date and time of discovery: ________________________________________
4. Categories of personal data affected: Access telemetry data (hashed IP addresses, hashed user-agent strings, device/browser/OS metadata, country-level location, access timestamps)
5. Approximate number of affected data subjects: ________________________________________
6. Likely consequences: ________________________________________
7. Measures taken to address the breach: ________________________________________
8. Measures to prevent recurrence: ________________________________________
9. Contact person: [DPO Name], [DPO Email], [DPO Phone]

Signed,
[DPO Name]
Data Protection Officer
[Legal Entity Name]
```

---

## 6. Data Subject Notification Template

```
Subject: Important — Security Notice Regarding Your Archestimator Data

Dear [Name / "Archestimator User"],

We are writing to inform you of a security incident that may have involved your personal data.

What happened: [Brief description of breach]

What data was involved: [Specific data categories]

What we are doing: [Measures taken]

What you can do: [Recommended actions for the data subject]

For more information, contact: [DPO Name], [DPO Email], [DPO Phone]

We take the security of your data seriously and regret any concern this may cause.

Sincerely,
[DPO Name]
Data Protection Officer
[Legal Entity Name]
```

---

## 7. Escalation Path

```
Level 1: Engineer on duty → Initial detection and containment
  ↓ (escalate within 1 hour)
Level 2: DPO / Privacy Officer → Assessment, notification decision
  ↓ (escalate within 4 hours for Critical/High)
Level 3: Owner → Final decision on notification scope, public communication
```

---

## Completion Criteria

1. Breach detection mechanisms are documented (monitoring, alerts, manual reports).
2. Containment procedure is defined (kill switch, system isolation, token rotation).
3. Assessment procedure is defined (scope, data categories, risk level).
4. Notification procedure is defined (who to notify: NPC, data subjects; timeline: 72 hours per Philippine DPA).
5. Notification templates for NPC and affected individuals exist.

---

## Verification

- [ ] Tabletop exercise: simulate an access telemetry data exposure
- [ ] Walk through the full breach response workflow
- [ ] Confirm escalation contacts are current and reachable
- [ ] Confirm NPC notification can be completed within 72 hours
- [ ] Confirm data subject notification templates are populated correctly

---

**Source doc:** `54-data-subject-request-and-breach-response-playbook.md` Part B
**Gate:** G-08
**Next:** After owner review and tabletop exercise, update `64-access-telemetry-production-evidence-ledger.md` to mark E-008 as Complete.
