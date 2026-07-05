# DPIA / LIA Screening — DRAFT (P1.3)

> **⚠️ COUNSEL REVIEW REQUIRED.** GDPR Art. 35 (DPIA when high-risk processing) +
> DPA IRR §23 (privacy impact assessment). Counsel decides applicability per processing
> activity. This is a screening template, not a determination.

**Source plan:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md` (P1.3)
**Status:** DRAFT screening — counsel to make final DPIA / no-DPIA determination per activity.

## DPIA triggers (per EDPB Guidelines WP248)

A DPIA is required when processing meets any of these criteria:

1. **Evaluation or scoring** (including profiling and predicting)
2. **Automated decision-making with legal or similar significant effect**
3. **Systematic monitoring** (observation, location, geolocation)
4. **Sensitive data** (special categories per Art. 9: health, biometrics, etc.)
5. **Data processed on a large scale**
6. **Matching or combining datasets** from different sources
7. **Data concerning vulnerable data subjects** (children, employees)
8. **Innovative use** of new technological or organizational solutions
9. **Prevents data subjects from exercising a right** or using a service/contract

## Per-activity screening

| PA-ID | Activity | Triggers met? | DPIA required? | Notes |
|---|---|---|---|---|
| PA-01 | Account auth | None of the 9 triggers | Likely NO | Standard auth; hashed IP/UA is for security, not profiling |
| PA-02 | Estimate authoring | None | NO | User-authored business documents |
| PA-03 | Component library | None | NO | User-authored business data |
| PA-04 | Collaboration | None | NO | Standard team-invite flow |
| PA-05 | Publication share | None | NO | Recipient email is for delivery, not profiling |
| PA-06 | Security audit | None (HMAC-hashed; no scoring) | NO | Pseudonymized at intake |
| PA-07 | Privacy requests | None | NO | Compliance evidence |
| PA-08 | Email delivery | None | NO | Standard transactional email |
| PA-09 | File upload scanning | None (signature matching, not user profiling) | NO | Malware signature database; not personal-data matching |
| PA-10 | Observability | None (sampling, opaque redaction) | NO | Operational telemetry |
| PA-FUT-01 | AI inference (when enabled) | **Triggers 1, 2, 8** — evaluation/scoring, automated decision, innovative use | **YES when activated** | DPIA MUST be performed before AI features ship |

## LIA (Legitimate Interest Assessment) — for legitimate-interest processing

For processing that relies on legitimate interest (GDPR Art. 6(1)(f)), complete the LIA:

### LIA-01 — Account security audit (PA-06)

- **Purpose:** Detect brute-force, credential stuffing, OAuth abuse
- **Benefit:** Service security; protect user accounts
- **Impact on data subject:** Minimal — IP/UA is HMAC-hashed (pseudonymized); no profiling; no automated decision
- **Necessity:** Bounded audit log is the standard practice for any auth surface
- **Balancing:** Pseudonymization + 365-day retention + HMAC pepper = data subject's privacy interest preserved
- **Verdict:** Legitimate interest confirmed `[pending counsel ratification]`

### LIA-02 — Publication telemetry (PA-05)

- **Purpose:** Show proposers when their proposal was viewed by a recipient
- **Benefit:** Critical product feature (knowing whether a client reviewed the proposal)
- **Impact on data subject:** Recipient's view behavior is logged with HMAC-hashed identifier; recipient can opt out via the "do not track" email link or by ignoring the link
- **Necessity:** View-tracking is core to the product's value
- **Balancing:** Per-recipient opt-out + HMAC pseudonymization + 90-day retention
- **Verdict:** Legitimate interest confirmed `[pending counsel ratification]`

## When features change

A new DPIA screening is required when:
- AI features are activated (PA-FUT-01 → DPIA required)
- Biometric or health data is collected (none currently planned)
- Large-scale analytics is enabled (currently disabled)
- Cross-customer data combination is enabled (currently NOT done — Archestimator is anti-aggregator by positioning)
- Children's data processing begins (currently prohibited)

## Counsel determination matrix

Counsel: please complete this matrix and return to `.ai/10_state/compliance/dpia-screening-completed.md` (separate file when you sign off).

| Activity | DPIA required? (counsel) | DPIA performed? | Date | Notes |
|---|---|---|---|---|
| PA-01 Account auth | `[ ]` | `[ ]` | `[ ]` | |
| PA-02 Estimate authoring | `[ ]` | `[ ]` | `[ ]` | |
| PA-03 Component library | `[ ]` | `[ ]` | `[ ]` | |
| PA-04 Collaboration | `[ ]` | `[ ]` | `[ ]` | |
| PA-05 Publication share | `[ ]` | `[ ]` | `[ ]` | |
| PA-06 Security audit | `[ ]` | `[ ]` | `[ ]` | |
| PA-07 Privacy requests | `[ ]` | `[ ]` | `[ ]` | |
| PA-08 Email delivery | `[ ]` | `[ ]` | `[ ]` | |
| PA-09 File upload scanning | `[ ]` | `[ ]` | `[ ]` | |
| PA-10 Observability | `[ ]` | `[ ]` | `[ ]` | |
| PA-FUT-01 AI inference | `[ ]` | `[ ]` | `[ ]` | Required BEFORE activation |
