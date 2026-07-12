# 08 — Domain & Industry Requirements (Construction / RFP / E-sign)

> Research date: 2026-07-12. Cross-references current Archestimator source against
> construction-procurement, RFP/bid, and e-signature industry norms. Each item:
> the norm + source, whether the current code meets it, and beta-vs-Enterprise
> classification. **This is research evidence; it changes decisions in `06` and
> may add units to the active pack.**

## 1. Construction bid / RFP norms

### 1.1 Bid validity periods (expiry) — PARTIALLY MET (beta-ok, small gap)
- **Norm:** Bids are irrevocable for a stated period; 30/60/90 days is standard (60 most common per AIA A701). Public projects often mandate a minimum. Sources: AIA A701; [Commercial Surety – bid bond expiration](https://commercialsurety.com/understanding-bid-bond-expiration/).
- **Current:** `expires_at` exists; inbox computes "expired" live (`recipient-proposals-repository.ts:107-111`). **But expiry is optional** — a publisher can publish a link that never expires.
- **Gap (beta polish):** no default/suggested validity surfaced in the publisher UI. Consider defaulting to 30/60/90 days and labeling "Proposal valid until."
- **Verdict:** ✓ defensible for beta; add a default validity suggestion before scaling.

### 1.2 Bid withdrawal / revocation — MET (correctly inverted for this product)
- **Norm:** A bidder can withdraw before owner acceptance; after acceptance, needs consent.
- **Current:** The SENDER (contractor) can revoke anytime (`revokeProjectPublication`). The RECIPIENT (client) decision is final (unique-index + duplicate check).
- **Verdict:** ✓ correct inversion for a recipient-inbox product. No gap. `revision_requested` covers the revision loop.

### 1.3 Confidentiality — MET (private-bid model)
- **Norm:** Pre-opening bids are sealed/confidential; private-sector bids confidential by contract.
- **Current:** Per-recipient scoping (`WHERE lower(recipient.email) = ?`); one recipient cannot see another's proposals or decisions.
- **Verdict:** ✓ matches private-bid/RFQ model. Note: if Archestimator ever adds owner-side competitive bid tabulation (multiple contractors → one owner), the 1-publication-per-project constraint would need rethinking — **future, not beta**.

### 1.4 Required content (BOQ, exclusions, assumptions, terms) — PARTIALLY MET (domain-content gap)
- **Norm:** RICS NRM 1/2 require a BOQ **plus stated assumptions, exclusions, qualifications, and terms.** Sources: [RICS NRM hub](https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/construction-standards/nrm); [NRM 2 PDF](https://www.rics.org/content/dam/ricsglobal/documents/standards/nrm_2_detailed_measurement_for_building_works_1st_edition_rics.pdf).
- **Current:** Snapshot captures BOQ line items (description, qty, unit, unit cost, contingency, adjustment). **No first-class place for sender-side assumptions/exclusions/qualifications/terms** in the publication snapshot. `shared_link_comments` and decision `note` are recipient-side, not sender-side proposal content.
- **Gap (domain content, not code defect):** a construction cost proposal without an exclusions/assumptions section is professionally incomplete — QS/estimator reviewers will flag it.
- **Recommendation (beta-feasible):** add a free-text "Assumptions / Exclusions / Notes" block to the publication snapshot + render on the share page. **This is the most important domain gap.**

### 1.5 Audit trail / chain-of-custody — MET (strong)
- **Norm:** End-to-end audit trail (timestamp, identity, IP, auth method) is industry-standard, not optional.
- **Current:** `project_publication_events` + `shared_link_events` (open/password/comment/decision), `ip_hash` + `user_agent_hash`, `snapshot_version_at_decision`, `signer_name` + `signature_intent_hash`, publisher audit events.
- **Verdict:** ✓ genuine chain-of-custody. (Caveat: `shared_link_events` is write-dead — see `10` §3.3; the audit infrastructure exists but one of the two event tables is never populated.)

## 2. Digital signature / decision binding

### 2.1 ESIGN Act / UETA four pillars — MOSTLY MET, ONE REAL GAP
- **Norm (US ESIGN Act / UETA):** (1) intent to sign, (2) consent to do business electronically, (3) signature logically associated with the record, (4) record retention. Sources: [Adobe – ESIGN vs UETA](https://www.adobe.com/acrobat/business/hub/difference-between-esign-act-vs-ueta.html); [Blueink – ESIGN compliance](https://www.blueink.com/electronic-signature-law/esign-act).
- **Current:**
  - Intent: ✓ explicit Review → confirm → signer-name required (`SharePageDecision.tsx:280,290`).
  - Association: ✓ `signature_intent_hash = sha256(publication.id : snapshotVersion : signerName : submittedAt)` (`d1-store.ts:772`); `snapshot_version_at_decision` pins content.
  - Retention: ✓ immutable decision rows.
  - **Consent to electronic records: ✗ GAP.** No "I consent to sign electronically / my agreement has the same legal effect as a handwritten signature" disclosure before Accept.
- **Gap (beta-recommended):** this is the single highest-value addition for a defensible acceptance. Add a checkbox + statement above the Accept button on `SharePageDecision.tsx`; log the acknowledgment timestamp.
- **Verdict:** B2B contractor↔client is lower-risk under UETA (consumer disclosures apply mainly to consumers), but the gap is real and cheap to close.

### 2.2 E-signature tier (eIDAS SES / AdES / QES) — SES-level (correct for beta)
- **Norm:** SES = basic click-to-sign; AdES = cryptographically linked to signatory; QES = qualified cert (EU handwritten-equivalent). Sources: [EC – eSignature](https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/467109069/What+is+eSignature); [DocuSign – SES/AES/QES](https://www.docusign.com/en-gb/blog/types-digital-signature-aes-qes-ses-explained).
- **Current:** click-Accept + typed name = SES. `signature_intent_hash` is a **tamper-evidence/audit artifact, NOT an AdES signature** (AdES requires a cryptographic key the signatory controls).
- **Verdict:** ✓ SES is the industry-appropriate tier for a cost-proposal accept. AdES/QES = Enterprise only (EU regulated contracts).

### 2.3 Is `signature_intent_hash` an industry pattern? — Yes, as audit artifact; no, as signature
- Hashing (document-version + signer + timestamp) is a recognized tamper-evident audit technique. Correctly implemented (64-hex SHA-256, schema-validated `0014:139-145`). Naming is slightly ambitious — it's really an "intent/decision integrity digest."

## 3. Tender / procurement software patterns

### 3.1 Recipient review portal — MET
- Procore/Coupa/Ariba all provide a recipient/supplier portal. Archestimator's `/workshop/proposals` + `/share/<token>` is the analog (direction inverted: estimator→client, not supplier→buyer). ✓

### 3.2 Decision recording + notification — MET
- Decision immutable; owner digest triggered (`scheduleOwnerDigest(... "decision")`), `publication_digest_log` tracks delivery. ✓

### 3.3 Version control of issued proposals — MET (notably well done)
- `snapshot_version` increments on republish; `snapshot_version_at_decision` pins the version; stale-snapshot warning surfaces to publisher (`PublisherDrawer.tsx:254`). This is enterprise-grade versioning. ✓

### 3.4 Side-by-side bid comparison (bid tabulation/leveling) — CORRECTLY ABSENT
- This is an OWNER-side feature (comparing multiple contractor bids). Archestimator is estimator→client (one proposal to one client), so there's nothing to compare on the recipient side. **Do NOT build this** unless an owner-facing multi-bid view is added later. Out of scope.

## 4. SaaS recipient-portal / client-portal patterns

### 4.1 Email-based vs account-based access — HYBRID (defensible, one friction point)
- **Norm:** Magic-link/email-only for low/medium-sensitivity infrequent access; account+MFA for high-sensitivity. Sources: [SuperTokens – magic links](https://supertokens.com/blog/magiclinks); [Clerk – magic links](https://clerk.com/blog/magic-links).
- **Current:** `/share/<token>` is link-based (no account needed to review). The **inbox** (`/workshop/proposals`) requires a full account with matching email. This creates a real UX seam: a recipient invited to email A who signs in with email B sees an empty inbox.
- **Gap (UX, beta polish):** wrong-email recovery is a single reactive error string (`ProposalRow.tsx:67`). Add proactive guidance to `ProposalsEmptyState`: "Expecting a proposal? Make sure you're signed in with the email your contractor sent it to" + sign-out/switch affordance.

### 4.2 Session handling for external recipients — MET
- `openRecipientProposalAction` mints a scoped HMAC session cookie (`shared-link-session-v1`, bound to `token + publicationId + credentialVersion + recipientId`), httpOnly/secure in prod, 24h maxAge. ✓ "Escalate link to a real session" pattern done right.

## 5. Philippines / Southeast Asia context

### 5.1 Government procurement (RA 9184 / PhilGEPS / RA 12009) — NOT APPLICABLE (correctly out of scope)
- RA 9184 / RA 12009 govern **government** procurement only. Archestimator's private contractor↔client flow is private construction. Sources: [GPPB – RA 9184 IRR](https://www.gppb.gov.ph/wp-content/uploads/2023/07/Updated-2016-Revised-IRR-of-RA-No.-9184-as-of-03-July-2023.pdf); [RA 12009 (2024)](https://lawphil.net/statutes/repacts/ra2024/ra_12009_2024.html).
- **If Archestimator ever targets PH government bidders (DPWH, LGU):** RA 12009's e-procurement, bid-security, and beneficial-ownership rules would apply — substantial new features. Enterprise/future only.

### 5.2 Private-sector e-signatures (RA 8792) — MET (same gap as 2.1)
- RA 8792 (E-Commerce Act 2000) Sec. 7-8: electronic signatures equivalent to handwritten; electronic documents same legal effect. Sources: [RA 8792 PDF](https://www.bsp.gov.ph/PaymentAndSettlement/RA8792.pdf); [Adobe Legal – Philippines](https://helpx.adobe.com/legal/esignatures/regulations/philippines.html).
- Click-Accept + typed name is valid under RA 8792 for a private construction cost proposal. Same single gap as ESIGN: no explicit electronic-consent acknowledgment. Closing 2.1 closes this for both US and PH.

## 6. Decision impact (what this changes in the plan)

These findings add **two new recommended units** to the plan and reclassify one:

| Finding | Classification | Action |
|---|---|---|
| Electronic-consent disclosure (§2.1) | **Beta-recommended** | New unit: add consent checkbox + statement + audit timestamp on `SharePageDecision.tsx`. **Not blocking**, but high-value-per-effort. |
| Assumptions/Exclusions block (§1.4) | **Beta domain-content gap** | New unit: add sender-side free-text block to publication snapshot + share render. The most important domain gap. |
| Default validity period (§1.1) | Beta polish | Small publisher-UI change. |
| Wrong-email recovery UX (§4.1) | Beta polish | Improve `ProposalsEmptyState`. Already in active pack's absorbed items. |
| QES / AdES / bid tabulation / PhilGEPS | **Enterprise / future** | Do NOT build for beta. |

These are **domain/UX gaps**, not code defects — they belong in the active pack's requirements inventory, not the bug register (`02`).

## Sources

- AIA A701 Instructions to Bidders; AIA A201 General Conditions
- [RICS NRM hub](https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/construction-standards/nrm) · [NRM 2 PDF](https://www.rics.org/content/dam/ricsglobal/documents/standards/nrm_2_detailed_measurement_for_building_works_1st_edition_rics.pdf)
- [Adobe – ESIGN vs UETA](https://www.adobe.com/acrobat/business/hub/difference-between-esign-act-vs-ueta.html) · [Blueink – ESIGN compliance](https://www.blueink.com/electronic-signature-law/esign-act) · [ACC – ESIGN/UETA overview PDF](https://www.acc.com/sites/default/files/resources/vl/membersonly/SampleFormPolicy/1427175_1.pdf)
- [EC – eSignature (eIDAS)](https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/467109069/What+is+eSignature) · [DocuSign – SES/AES/QES](https://www.docusign.com/en-gb/blog/types-digital-signature-aes-qes-ses-explained)
- [Procore – bid management](https://www.procore.com/bid-management) · [Coupa Supplier Portal](https://compass.coupa.com/en-us/products/product-documentation/supplier-resources/for-suppliers/coupa-supplier-portal)
- [SuperTokens – magic links](https://supertokens.com/blog/magiclinks) · [Clerk – magic links](https://clerk.com/blog/magic-links) · [MojoAuth – magic link security](https://mojoauth.com/blog/are-magic-links-secure-technical-deep-dive)
- [GPPB – RA 9184 IRR (2023)](https://www.gppb.gov.ph/wp-content/uploads/2023/07/Updated-2016-Revised-IRR-of-RA-No.-9184-as-of-03-July-2023.pdf) · [RA 12009 (2024)](https://lawphil.net/statutes/repacts/ra2024/ra_12009_2024.html)
- [RA 8792 PDF (BSP)](https://www.bsp.gov.ph/PaymentAndSettlement/RA8792.pdf) · [Adobe Legal – Philippines](https://helpx.adobe.com/legal/esignatures/regulations/philippines.html)
- [Commercial Surety – bid bond expiration](https://commercialsurety.com/understanding-bid-bid-expiration/)
