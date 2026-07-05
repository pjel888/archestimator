# Privacy Notice (DRAFT — P1.1)

> **⚠️ COUNSEL REVIEW REQUIRED.** This is an engineering draft that captures every
> GDPR Article 13/14 element + Philippine DPA IRR §13(c) notice element. Counsel
> must review and approve every bracketed `[BRACKETED]` placeholder before this
> content is published to `src/app/privacy/page.tsx`. Publishing without counsel
> sign-off would constitute an unauthorized public compliance claim.

**Source plan:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md` (P1.1)
**Last updated:** 2026-07-05
**Status:** DRAFT — gated on `OPEN-DEC-002` (controller identity, DPO/contact)

---

## 1. Identity and contact (GDPR Art. 13(1)(a); DPA IRR §13(c)(1))

**Controller:** `[Archestimator legal entity — Philip to confirm; OPEN-DEC-002]`
**Contact:** `support@archestimator.com` (general) · `security@archestimator.com` (security) · `privacy@archestimator.com` (DSAR intake)
**Data Protection Officer (if required):** `[Philip or appointed DPO — OPEN-DEC-002]`
**Philippine NPC Registration:** `[Pending — OPEN-DEC-002]`

## 2. Purposes and legal bases (GDPR Art. 13(1)(c); DPA IRR §13(c)(3))

| Processing activity | Purpose | Legal basis (GDPR) | Lawful processing (DPA IRR §12) |
|---|---|---|---|
| Account creation (email, name, hashed password) | Provide the service | Contract performance (Art. 6(1)(b)) | Consent / contract |
| Estimate authoring (project data, line items, totals) | Deliver the cost-proposal workspace | Contract performance | Contract |
| Collaboration invites (recipient email) | Allow teams to share estimates | Contract performance + legitimate interest | Consent |
| Publication share links (recipient email, optional password) | Send proposals to clients for approval | Contract performance + legitimate interest | Contract |
| Account security audit (HMAC-hashed IP, user-agent) | Detect and investigate auth abuse | Legitimate interest (Art. 6(1)(f)) | Legitimate interest |
| Telemetry on publication views (HMAC-hashed recipient identifier) | Show proposers when their proposal was viewed | Consent (per-recipient opt-out) | Consent |
| Email delivery logs | Transactional email (invites, share notifications, support) | Contract performance | Contract |
| Customer support (email content, screenshots) | Resolve user issues | Consent + legitimate interest | Consent |
| Aggregate analytics `[if/when enabled]` | Product improvement | Consent | Consent |

## 3. Recipients (GDPR Art. 13(1)(e); DPA IRR §13(c)(5))

See `.ai/10_state/compliance/processor-register.md` for the full processor register. As of the draft date:

- **Cloudflare** (Workers, D1, R2, Durable Objects, Queues, Email, Images) — processing infrastructure
- **Google** (OAuth identity provider for "Sign in with Google")
- **Cloudflare Email Service** (transactional email delivery)

`[Additional processors will be listed here as contracts are signed — OPEN-DEC-003]`

We do NOT sell personal data. We do NOT share personal data with third parties for their own marketing.

## 4. International transfers (GDPR Art. 13(1)(f); DPA IRR §21)

Personal data is processed primarily in Cloudflare's global edge network. Cloudflare D1, R2, and Durable Objects data may be stored in `[OPEN-DEC-003 — confirm Cloudflare data center regions]`. Transfer safeguards:

- Cloudflare DPA: `[insert URL once verified by counsel]`
- Standard Contractual Clauses: `[confirm applicability]`
- Philippine cross-border notification: `[OPEN-DEC-002 — confirm if NPC notification required for outbound transfer]`

## 5. Retention (GDPR Art. 13(2)(a); DPA IRR §13(c)(6))

See `.ai/10_state/compliance/retention-schedule.md` for the per-class retention table. Summary:

- Account data: retained while the account is active; soft-deleted on DSAR erasure request; hard-purged after 30 days.
- Audit logs: 365 days from event date (default).
- Publication share events: 90 days.
- Privacy requests themselves: 7 years (compliance evidence).
- Orphaned uploads: 30 days.

`[Final TTLs require OPEN-DEC-004 sign-off]`

## 6. Your rights (GDPR Arts. 13(2)(b)–(d), 15–22; DPA IRR §16)

You have the right to:

- **Access** the personal data we hold about you
- **Rectify** inaccurate personal data
- **Erase** your personal data (subject to legal retention obligations)
- **Restrict** processing while we investigate a dispute
- **Port** your data to another service (machine-readable export)
- **Object** to processing based on legitimate interest or for direct marketing
- **Withdraw consent** at any time where processing is based on consent
- **Lodge a complaint** with a supervisory authority

To exercise any of these rights, submit a request via:
- In-app form: `[route to /privacy-requests when P1.9 lands]`
- Email: `privacy@archestimator.com`
- The Privacy Request Register intake at `https://archestimator.com/api/compliance/privacy-requests` (anonymous accepted)

We respond within `[30 days — GDPR Art. 12(3) standard; Philippine DPA may differ — OPEN-DEC-002]`.

## 7. Data subject verification

To protect against impersonation, we verify identity before disclosing or erasing data. Verification methods:

- For logged-in users: in-app authenticated request (no additional verification needed)
- For email intake: we reply from the registered email address and require a response to confirm
- For anonymous intake: we ask for identifying information (account email, workspace ID) and verify against our records

## 8. Breach notification (GDPR Arts. 33–34; NPC Circular 2016-02)

In the event of a personal data breach, we follow the breach-response runbook at `.ai/11_skills/security/breach-response-runbook.md`. Notification timelines:

- NPC (Philippine National Privacy Commission): within 72 hours of awareness for reportable breaches (per NPC Circular 2016-02)
- EU DPA (if GDPR applies): within 72 hours of awareness (GDPR Art. 33)
- Affected data subjects: without undue delay if high risk (GDPR Art. 34)

`[Final thresholds require OPEN-DEC-005 sign-off]`

## 9. Automated decision-making, profiling, and AI

We do **not** use automated decision-making that produces legal or similarly significant effects (GDPR Art. 22). We do **not** engage in profiling for marketing purposes.

The "Ask Flip" AI Copilot and "AI Package Builder" features are **deferred to roadmap** and currently disabled (`ARCHESTIMATOR_AI_ENABLED=false`). When enabled, they will only operate on data the user has explicitly authorized (estimate content, project context) and will be governed by a separate AI-processing notice at that time.

## 10. Cookies and analytics

We use essential cookies required for authentication and session management (Better Auth session cookie, Terms gate cookie, optional share-link access cookie). We do **not** use third-party advertising cookies.

Optional analytics (`[confirm if/when enabled — currently no third-party analytics script ships]`) is gated by the consent banner on the landing page. Users can opt out via the consent banner at any time.

## 11. Children's data

The service is not directed to children under 13 (COPPA) / under 15 (Philippine DPA IRR §12(a)(1)). We do not knowingly collect personal data from children. If you believe we have collected data from a child, contact `privacy@archestimator.com` and we will erase it.

## 12. Changes to this notice

We will update this notice when our processing practices change. Material changes will be announced `[via in-app notification / email / on the /changelog page — confirm with Philip]`. The effective date at the top of the published notice will reflect the last update.

## 13. Contact

For any question about this notice or your data: `privacy@archestimator.com`. For DSAR specifically, use the in-app form or the privacy-requests intake endpoint.

---

**Publication checklist (before this draft becomes live):**
- [ ] `OPEN-DEC-002` resolved: legal entity confirmed
- [ ] `OPEN-DEC-003` resolved: processor list finalized
- [ ] `OPEN-DEC-004` resolved: retention periods confirmed
- [ ] `OPEN-DEC-005` resolved: breach thresholds confirmed
- [ ] Counsel sign-off letter on file
- [ ] Content migrated to `src/app/privacy/page.tsx` (replacing the current beta placeholder)
- [ ] Effective date set
