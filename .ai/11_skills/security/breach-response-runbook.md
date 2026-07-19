# Breach Response Runbook — DRAFT (P1.5)

> **⚠️ COUNSEL REVIEW REQUIRED.** GDPR Arts. 33–34 + NPC Circular 2016-02. This
> runbook is operational guidance; counsel must approve the notification thresholds
> and the "reportable vs. non-reportable" decision matrix before tabletop exercise.

**Source plan:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md` (P1.5)
**Status:** DRAFT — gated on OPEN-DEC-005 (notification thresholds)
**Owner:** Philip (primary) / `[on-call engineer — TBD when team grows]`

## Authority and action gate

This is a historical, counsel-gated operational draft, not legal advice or
standing authorization for external incident actions. Current source,
`AGENTS.md`, `wrangler.jsonc`, and canonical security/observability protocols
override stale commands or provider assumptions in this document.

Safe local triage and redacted evidence preservation may proceed. Credential
rotation, WAF changes, Worker isolation/deployment, destructive D1 operations,
paid or unbound provider actions, legal notifications, and customer
communications require incident-specific authority. Automated tests, browser
automation, screenshots, and visual QA remain `TEST_TASK`-gated.

## Definitions

**Personal data breach** (GDPR Art. 4(12)): a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data transmitted, stored, or otherwise processed.

Three breach types:
1. **Confidentiality breach** — unauthorized disclosure / access
2. **Integrity breach** — unauthorized alteration
3. **Availability breach** — accidental loss / destruction / unauthorized access to data

## Severity classification (per NPC Circular 2016-02 + GDPR)

| Severity | Criteria | NPC notification? | EU DPA notification? | Data subject notification? |
|---|---|---|---|---|
| **Critical** | ≥1,000 data subjects affected OR sensitive data OR account-takeover at scale | YES, within 72h | YES, within 72h | YES, without undue delay |
| **Material** | 10–999 data subjects OR auth/financial data | YES, within 72h | YES, within 72h | YES if high risk; otherwise document decision |
| **Minor** | <10 subjects, no sensitive data, contained | Document only (retain record ≥5y per NPC) | Document only | Generally no; case-by-case |
| **Near-miss** | Prevented before impact | Document for security review | No | No |

`[Final thresholds require OPEN-DEC-005 sign-off. The above are industry defaults.]`

## Response team

| Role | Member | Backup |
|---|---|---|
| Incident commander | Philip | `[TBD]` |
| Communications lead | Philip | `[TBD]` |
| Technical lead | `[On-call engineer]` | Philip |
| Counsel | `[Pending — OPEN-DEC-002]` | External firm `[TBD]` |
| DPO / privacy officer | `[Pending — OPEN-DEC-002]` | Philip |
| Forensics | `[Pending — open retainer]` | Cloudflare support |

## Detection

Breach signals come from:
- Cloudflare Observability (security events; unusual error rate; suspicious request pattern)
- Vulnerability disclosure (`security@archestimator.com` reports)
- Internal discovery (engineer notices during code review or ops dashboard)
- User reports (support@archestimator.com; in-app)
- Processor notifications (Cloudflare support; Google security contact)

## Response phases

### Phase 1 — Triage (0–4 hours from awareness)

1. **Confirm** the report is real (not a false positive).
2. **Classify** severity using the matrix above.
3. **Page** the response team via `[on-call rotation — TBD]`.
4. **Begin incident log** (timeline of every action + decision).
5. **Open a private incident channel** (Signal/Slack? — `[confirm tool]`).

### Phase 2 — Containment (0–24 hours)

1. **Stop ongoing exposure with incident-specific authority**: rotate compromised credentials; revoke tokens; isolate the affected Worker; or block malicious IPs at Cloudflare WAF.
2. **Preserve evidence**: use redacted Cloudflare Workers Logs and authorized D1 export/Time Travel procedures. `bun run cf:d1-restore-rehearsal` is local-only rehearsal evidence; it does not create a hosted D1 backup or prove a provider restore.
3. **Identify scope**: which data subjects? which data categories? which time range?
4. **Mitigate user impact**: notify affected users if their account was specifically compromised (separate from formal breach notification).

### Phase 3 — Assessment (24–48 hours)

1. **Final scope determination**: complete list of affected data subjects + categories.
2. **Risk assessment**: probability of harm (financial loss, identity theft, reputational damage).
3. **Decision on notifications**: reportable under NPC Circular 2016-02? Reportable under GDPR Art. 33?
4. **Counsel sign-off**: counsel reviews the notification decision and approves the public wording.

### Phase 4 — Notification (within 72 hours of awareness)

#### NPC notification (Philippine National Privacy Commission)

- **Channel:** `[NPC breach notification form — URL TBD by counsel]`
- **Content:**
  - Description of the breach
  - Personal data involved
  - Approximate number of data subjects affected
  - Measures taken or proposed to address the breach
  - Contact for affected data subjects to get more information
- **Counsel sign-off required** before submission.

#### EU DPA notification (if GDPR applies)

- **Channel:** `[Lead supervisory authority — TBD by counsel based on establishment]`
- **Content** per GDPR Art. 33(3):
  - Nature of the breach including, where possible, the categories and approximate number of data subjects concerned and the categories and approximate number of personal data records concerned
  - Name and contact details of the DPO or other contact point
  - Likely consequences of the breach
  - Measures taken or proposed to address the breach, including, where appropriate, measures to mitigate its possible adverse effects

#### Data subject notification (if high risk per GDPR Art. 34)

- Triggered when the breach is likely to result in a **high risk** to the rights and freedoms of natural persons.
- Must be in **clear and plain language**.
- Must include the same elements as the DPA notification (adapted for the audience).
- Channel: email to affected users; in-app banner; `[OPEN-DEC-005 — confirm channel mix]`.

### Phase 5 — Resolution (1–30 days)

1. **Fix the underlying vulnerability**.
2. **Complete post-incident review** (blameless; focus on systemic improvement).
3. **Update this runbook** with lessons learned.
4. **Update the RoPA** if processing activities changed.
5. **Notify processors** if their data was involved.
6. **Compliance evidence**: file breach notification copy + acknowledgments + timeline.

### Phase 6 — Documentation (≥5 years)

- Per NPC Circular 2016-02, breach records must be retained for at least 5 years regardless of reportability.
- All breach records live in `.ai/02_audits/breach-<YYYY-MM-DD>-<slug>/` (private; not committed if it contains PII).

## Tabletop exercise (required for P1.5 acceptance)

Before this runbook is treated as operational:

1. **Schedule** a tabletop with the response team.
2. **Walk through** a hypothetical scenario (e.g., "Cloudflare Worker leak exposes 50 users' publication recipient emails").
3. **Time** each phase.
4. **Identify gaps** (missing contacts, unclear ownership, tooling gaps).
5. **Update this runbook** based on findings.
6. **Record minutes** in `.ai/02_audits/breach-tabletop-<YYYY-MM-DD>.md`.

## Counsel review checklist

- [ ] Are severity thresholds consistent with NPC Circular 2016-02 + GDPR?
- [ ] Is the 72-hour clock interpreted correctly (starts at "awareness", not at "confirmation")?
- [ ] Is the data subject notification threshold (high risk per Art. 34) clearly defined?
- [ ] Are notification channels confirmed (NPC form URL; EU lead authority)?
- [ ] Is the 5-year documentation retention consistent with NPC requirements?
