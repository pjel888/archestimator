# External UX research: client-facing estimate / proposal shared page

**Research date:** 2026-07-13  
**Request type:** Current best-practice research  
**Evidence standard:** first-party construction/field-service product documentation plus W3C, USWDS, NIST, and OWASP upstream guidance. Product help centres are live documentation and can change; the dated notes below record the version context used.

## Direct conclusion

Treat a shared estimate as a **client decision surface**, not a read-only copy of the estimator workspace. Its first screen should answer: *who sent this, what decision is required, what is included, what will it cost, what happens next, and how can I ask a question?* The page should then support a bounded flow:

`published version -> review -> request changes OR approve OR decline -> recorded outcome -> (if revised) new published version`

Construction-product evidence consistently separates the person who reviews/comments from the person who gives the final response. Autodesk explicitly assigns review/comment work to reviewers and final approval to approvers; Procore assigns a designated reviewer and gates response to review states. [Autodesk Reviews](https://help.autodesk.com/cloudhelp/ENU/Docs-Reviews/files/getting-started-reviews/Reviews.html) · [Procore: approve or reject a change order](https://support.procore.com/products/online/user-guide/project-level/change-orders/tutorials/approve-or-reject-prime-contract-change-orders)

The practical implication is a small, explicit role model, a frozen proposal version for each decision, clear financial hierarchy, a non-terminal request-changes path, and a human-readable client history backed by a separate audit record.

## Evidence-led role model

| Role | Client-page job | May see / do | Must not be allowed to do |
| --- | --- | --- | --- |
| **Estimator / presenter** | Prepare and issue the proposal; answer questions; publish a revision. | Internal authoring controls, recipient management, publish/revoke, internal costing and margin where authorised, operational activity record. | Alter a version already accepted without preserving that accepted version and obtaining a new client decision. Jobber removes the old signature from the current quote when a material edit is made and preserves the prior signed version as a PDF. [Jobber Quote Approvals](https://help.getjobber.com/hc/en-us/articles/115012715008-Quote-Approvals) |
| **Client reviewer** | Understand the offer and provide feedback. | Published client-safe scope, price, allowances/options, documents, terms, messages, request-changes action. | View internal costs, margin, supplier pricing, other clients, unpublished alternatives, or presenter-only activity. This is a recommended application of least privilege and default-deny access control. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) |
| **Client approver** | Give the accountable commercial response. | Everything the reviewer sees, plus approve/decline, confirmation/terms acknowledgement, signature or payment step when configured. | Approve a superseded, expired, revoked, or modified version; delegate authority silently. Procore similarly limits a response to an assigned reviewer and eligible review states. [Procore](https://support.procore.com/products/online/user-guide/project-level/change-orders/tutorials/approve-or-reject-prime-contract-change-orders) |
| **Client collaborator (optional)** | Give input without committing the customer. | View/comment/request changes. | Final approval, decline, payment, or signature. Make this distinction visible in the UI rather than inferring it from an email address. |

This role split is an IA recommendation inferred from the cited workflow systems; the exact legal/contractual definition of “approver” remains a product and jurisdiction decision.

## Recommended information architecture

### 1. Decision header — always visible first

Put these in the initial viewport before line-item detail:

- Issuing company identity, logo/name, real support contact, proposal title/number, project/site, and recipient name.
- A plain-language status: **Awaiting your review**, **Changes requested**, **Approved on …**, **Declined**, **Expired**, or **Superseded by version …**.
- Version number, issue date, validity/expiry date, and the last change that materially affected the price or scope.
- The decision summary: proposed total, required deposit (if any), high-level schedule/next step, and the primary action.
- A short “What you are approving” statement linked to scope, terms, and current version—not a generic confirmation.

Make the primary action reflect state: **Approve proposal** while awaiting review; **View revised proposal** after a revision; **Contact us** for a closed state. Jobber’s client flow puts approval (and, when applicable, deposit payment) directly on the quote and follows approval with a client email and staff notifications. [Jobber Quote Approvals](https://help.getjobber.com/hc/en-us/articles/115012715008-Quote-Approvals)

### 2. Proposal body — disclose from decision summary into evidence

Recommended section order:

1. **At a glance** — scope headline, total, validity, key exclusions, deposit, and next milestone.
2. **Cost and options** — total, taxes/fees, allowances, alternates/options, deposit, and payment schedule. Keep optional work visually and mathematically separate from the base proposal.
3. **Scope of work** — grouped work packages with concise descriptions, inclusions, exclusions, quantities/units where client-relevant, and linked drawings/photos.
4. **Schedule and assumptions** — anticipated start/duration, dependencies, owner decisions, permits, site access, and change conditions.
5. **Documents and terms** — contract/disclaimer, warranties, attachments, download/print copy, and terms acknowledgement.
6. **Questions and decision** — general question, line-item question, request changes, decline, and approve. Keep the decision controls adjacent to the evidence they govern and repeat a sticky/mobile-safe action bar only when it does not hide focus or content.
7. **History** — a simple client-visible timeline of sent, viewed (if shown), comment/request, revision, and decision events. Keep security diagnostics out of this client timeline.

Do not begin with a dense navigation shell. Jobber makes broader Quotes/Invoices navigation configurable rather than necessary to review a specific quote, which supports keeping a direct shared link focused on the present decision. [Jobber Client Hub Settings](https://help.getjobber.com/hc/en-us/articles/115009571307-Client-Hub-Settings)

## Financial hierarchy and visualizations

### Financial hierarchy

Use this order in the client view:

1. **Decision total** — one unambiguous currency-formatted amount labelled as base proposal / revised proposal / approved total.
2. **Why it totals that** — grouped work packages, allowances, taxes/fees, discounts, and explicit exclusions.
3. **Choices** — alternatives/add-ons with their incremental price and their effect on the total; do not silently fold unselected options into the base price.
4. **Cash timing** — deposit due now, milestone payments, and due dates/conditions, only if published.
5. **Complete detail** — an accessible line-item breakdown and a downloadable record.

Show only client-published commercial information. Internal estimate cost, markup/margin, vendor quotes, labour productivity, and private notes are not client-facing defaults; that is a least-privilege recommendation, not a claim about any one product. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

### When a visualization helps

- Use a **short stacked bar or grouped horizontal bars** only to explain the contribution of a small number of work packages to the total, or a **milestone payment timeline** only to explain when money is due.
- Give each visualization one decision-relevant message in plain text (for example, “Exterior work is 56% of the base proposal; the deposit is due only after approval”). USWDS recommends common chart types, a central idea, and a screen-reader data table plus a plain-text explanation of the visualization’s message. [USWDS Data visualizations](https://designsystem.digital.gov/components/data-visualizations/)
- Do **not** use charts as a substitute for the price, scope, or payment terms. A chart should be secondary to a visible total and structured breakdown. A semantic table needs real header/data relationships, not styled `div`s. [W3C Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/)
- Avoid a pie/donut chart for the total: it adds visual decoding without helping a client decide. Prefer a small number of labelled bars or no chart at all when the breakdown is already simple. This is a UX inference from the USWDS simplicity guidance, not a formal standard.

## Comments, revisions, approvals, and declines

### Comments and request changes

Offer two explicitly different inputs:

- **Ask a question** — non-blocking general or line-item conversation; include a reply path and notification.
- **Request changes** — a decision-blocking request that identifies the requested change and moves the proposal out of an approvable state.

This distinction reflects Jobber’s documented workflow: a client can submit a change request; the quote changes to *changes requested*, the team is notified, and the quote is unavailable to the client until amended and reissued/returned to awaiting response. [Jobber Quote Approvals](https://help.getjobber.com/hc/en-us/articles/115012715008-Quote-Approvals)

For every blocking request, retain the discussion against the version being discussed. The presenter should publish a new immutable version with a brief revision summary; the client should receive a direct link to that version and cannot approve the prior version.

### Approve and decline

- **Approve:** show the version, total, payment/deposit, and terms acknowledgement immediately before confirmation. If a signature or payment is required, state that before the client enters the flow. Jobber supports typed/drawn signature and an approval-plus-deposit path; Autodesk records timestamps, IP addresses, and authentication records for e-signature workflows. [Jobber Quote Approvals](https://help.getjobber.com/hc/en-us/articles/115012715008-Quote-Approvals) · [Autodesk e-signature integration](https://help.autodesk.com/cloudhelp/ENU/Build-Cost/files/setup-cost/cost-integrations/Cost_E_Signature.html)
- **Decline:** provide a distinct action from request changes, strongly prompt for a reason (but do not make a free-text explanation mandatory where it would prevent a legitimate decline), confirm the result, and show the next contact path. Procore’s reject path explicitly collects a reason/comment before rejection. [Procore](https://support.procore.com/products/online/user-guide/project-level/change-orders/tutorials/approve-or-reject-prime-contract-change-orders)
- **Finality:** approval/decline actions should be server-authorized and idempotent. Disable only after the server confirms the outcome; return the recorded timestamp, actor, and version in the confirmation. This is design guidance; legal enforceability requires separate jurisdictional and e-signature review.

### Recommended state model

`Draft (not shared) -> Awaiting review -> Changes requested -> Revised / Awaiting review -> Approved | Declined | Expired | Revoked`

`Superseded` is a terminal label for the old version, not a deletion. Preserve a link to the accepted/declined document record where the viewer is authorised. Product evidence supports separate review/revision states and preserving earlier signed material after a change. [Procore](https://support.procore.com/products/online/user-guide/project-level/change-orders/tutorials/approve-or-reject-prime-contract-change-orders) · [Jobber Quote Approvals](https://help.getjobber.com/hc/en-us/articles/115012715008-Quote-Approvals)

## Trust, access, and audit trail

### Client-facing trust signals

- Identify the issuing business and accountable contact; state the proposal version, currency, expiry, and whether tax/deposit are included.
- Explain what approving does, what happens next, and how to obtain a copy. Send a confirmation email/receipt after a decision.
- Make expired, revoked, and superseded states truthful and non-actionable—never silently show a changed price under an old link.
- Do not expose internal tracking IDs, raw event logs, authentication records, or security details in the page history.

### Access model for a “shared link”

A direct URL is a delivery mechanism, not a permission model. For financially sensitive material, use a server-enforced recipient policy, expiry/revocation, and an appropriate authentication step for the intended recipient; do not treat knowledge of a URL as sufficient authorization. OWASP recommends default-deny access control, and NIST SP 800-63 Revision 4 is the current NIST Digital Identity Guidelines suite (published 2025) for identity/authentication considerations. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) · [NIST SP 800-63](https://www.nist.gov/identity-access-management/projects/nist-special-publication-800-63-digital-identity-guidelines)

When using a one-time or emailed entry link, explain the expiry and recovery path. Jobber’s current quote-help article, for example, says its texted client-hub link expires after 24 hours and then requires a phone-number check to regain access; this is a concrete product pattern, **not** a universal expiry recommendation. [Jobber Quote Approvals](https://help.getjobber.com/hc/en-us/articles/115012715008-Quote-Approvals)

### Audit record (separate from the client timeline)

Record, at minimum: proposal/version ID; event type; server timestamp and timezone; actor/recipient identity or authenticated session reference; action outcome; prior/next status; published amount/currency; terms/document version; and correlation ID. For approval/signature, record the selected authentication/signature evidence permitted by policy. Do not log access tokens, session identifiers, payment-card data, or unnecessary sensitive content. OWASP says audit/transaction trails should be purpose-specific, reconstructable, and neither under- nor over-collected; it also explicitly warns against logging access tokens and sensitive payment data. [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## Accessibility and responsive behaviour

Target WCAG 2.2 AA as the baseline. W3C recommends WCAG 2.2 as the new conformance target; it was published as a W3C Recommendation on 2023-10-05. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

| Area | Research-backed requirement |
| --- | --- |
| **Structure and keyboard** | Use semantic landmarks and heading order; keep a visible keyboard focus indicator. Sticky controls, dialogs, menus, and feedback must not obscure the focused control. WCAG 2.2 adds Focus Not Obscured and Target Size (Minimum). [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| **Small screens / zoom** | At 320 CSS px width (equivalent to 400% zoom on a 1280 px viewport), retain all information and functionality without general two-dimensional scrolling. Reorder to one column; keep the decision total and action discoverable; let detailed financial content expand instead of truncating. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| **Touch controls** | Make decision, option, attachment, and comment controls comfortably targetable; WCAG 2.2 AA sets a 24-by-24 CSS-pixel minimum target-size criterion with defined exceptions. Do not rely on drag-only interaction. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| **Financial data** | Use a real data table for the full breakdown, with proper header associations. If the narrow layout presents a more linear summary, ensure it exposes the same data and relationships. [W3C Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/) |
| **Charts** | Provide the underlying accessible data table and a plain-text summary of the chart’s conclusion; do not convey an option, risk, status, or approval eligibility by colour alone. [USWDS Data visualizations](https://designsystem.digital.gov/components/data-visualizations/) |
| **Forms and feedback** | Label every control, identify errors in text, retain input after validation failure where safe, and announce status feedback without stealing focus. Use polite live regions for ordinary save/sent feedback and assertive alerts sparingly for urgent errors. [W3C User Notification tutorial](https://www.w3.org/WAI/tutorials/forms/notifications/) |
| **Documents and download** | A PDF/download is a useful record, not the only accessible representation of the current scope, total, terms, and decision. Keep the important decision content in the page itself. |

### Mobile interaction shape

On narrow screens, lead with the sender, status/version, total, and a single primary action. Then stack the proposal sections; place long line-item detail behind a clearly labelled “View full breakdown” control, retaining an accessible full-data view. Keep secondary actions (download, request changes, decline, contact) visible but visually subordinate to the next valid step. Avoid a fixed footer that covers form errors, line-item context, or keyboard focus.

## Delivery checklist for a shared-link page

- [ ] Client-safe version is immutable once sent; modifications produce a named revision and invalidate the old decision path.
- [ ] Page has a client reviewer and client approver capability boundary, with no leakage of estimator-only data.
- [ ] First viewport contains issuer, project/proposal, version/status, total, validity, and next action.
- [ ] Base amount, options, tax/fees, deposit, payment timing, exclusions, and currency are unambiguous.
- [ ] Questions are separate from blocking change requests; request changes routes to revision rather than a hidden live edit.
- [ ] Approval/decline confirmation names the exact version and records the server-confirmed result.
- [ ] Client-facing timeline is concise; durable audit record is separate and avoids secrets/sensitive logs.
- [ ] Link access is server-authorized, revocable, and appropriately authenticated; no “anyone with the link” implication unless deliberately chosen and safe.
- [ ] Page meets WCAG 2.2 AA baseline for reflow, focus, target size, semantic tables, and status/error announcements.

## Version and evidence notes

- **WCAG:** WCAG 2.2 is the current cited W3C Recommendation; W3C recommends it as the new target. Published 2023-10-05; retrieved 2026-07-13. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **NIST identity guidance:** NIST identifies SP 800-63 Revision 4 as published in 2025. It is used here only for the access/authentication posture, not as a mandate to implement a federal assurance level. [NIST SP 800-63](https://www.nist.gov/identity-access-management/projects/nist-special-publication-800-63-digital-identity-guidelines)
- **Construction/field-service product evidence:** Autodesk, Procore, and Jobber pages are current help-centre documentation retrieved 2026-07-13. Jobber’s Quote Approvals article shows an update date of 2026-02-26; product workflow details (especially payment and access mechanics) may change and should be rechecked before copying exact behaviour. [Jobber Quote Approvals](https://help.getjobber.com/hc/en-us/articles/115012715008-Quote-Approvals)
- **Scope limitation:** This is UX/IA and technical trust guidance. It does not establish jurisdiction-specific contract, e-signature, consumer-disclosure, privacy-retention, tax, or payment-card compliance requirements.

## Source set and retrieval sufficiency

**Official product documentation (primary UX workflow evidence)**

- [Autodesk — About Reviews](https://help.autodesk.com/cloudhelp/ENU/Docs-Reviews/files/getting-started-reviews/Reviews.html) — separates reviewer/commenter and final approver roles.
- [Autodesk — Configure and Use E-Signature Integration](https://help.autodesk.com/cloudhelp/ENU/Build-Cost/files/setup-cost/cost-integrations/Cost_E_Signature.html) — signature audit evidence: timestamp, IP address, authentication records.
- [Procore — Approve or Reject Prime Contract Change Orders](https://support.procore.com/products/online/user-guide/project-level/change-orders/tutorials/approve-or-reject-prime-contract-change-orders) — assigned reviewer, eligible statuses, comments, and privacy/access prerequisites.
- [Jobber — Quote Approvals](https://help.getjobber.com/hc/en-us/articles/115012715008-Quote-Approvals) — approval/signature/deposit, request-changes, notification, revision, and access-link examples.
- [Jobber — Client Hub Settings](https://help.getjobber.com/hc/en-us/articles/115009571307-Client-Hub-Settings) — optional client-facing navigation and changed-quote visibility behaviour.

**Standards and authoritative guidance (primary accessibility/trust evidence)**

- [W3C — Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/) — current W3C accessibility target and measurable reflow, focus, target-size, status-message requirements.
- [W3C — User Notification tutorial](https://www.w3.org/WAI/tutorials/forms/notifications/) — accessible validation and live feedback.
- [W3C — Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/) — semantic financial data table requirements.
- [U.S. Web Design System — Data visualizations](https://designsystem.digital.gov/components/data-visualizations/) — simple charts, accessible data tables, and plain-language interpretation.
- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — default-deny and least-privilege access posture.
- [OWASP — Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) — reconstructable audit trails and sensitive-data exclusions.
- [NIST — SP 800-63 Digital Identity Guidelines](https://www.nist.gov/identity-access-management/projects/nist-special-publication-800-63-digital-identity-guidelines) — current identity/authentication context.

**Retrieval sufficiency:** sufficient for the requested UX/IA brief: two independent construction platforms, one client-quote portal, current W3C accessibility guidance, and upstream security/audit sources. No third-party summaries or OSS implementation references were used.

## 2026-07-13 Visual hierarchy refinement

Apple’s current Human Interface Guidelines reinforce the direction for a client
proposal: establish hierarchy with recognizable controls and a consistent structure,
keep only the information necessary for the immediate task, and align related
elements so scanning remains effortless. Its typography guidance specifically calls
for hierarchy through deliberate size, weight, and color differences while retaining
legibility, rather than mixing arbitrary display treatments. The shared page now
uses one compact SF/system type scale, reserves larger text for the project and
financial anchors, and keeps controls, data, and metadata materially quieter.

- [Apple HIG — Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) — purpose, simplicity, concise language, and recognizable hierarchy.
- [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography) — legibility, consistent text hierarchy, and restrained use of typefaces.
- [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout) — alignment, reading order, and adaptable layout guidance.

## 2026-07-13 Client microsite additions

The shared proposal now starts with a stable, three-position identity header:
issuer, platform attribution, and client. The positions remain reserved when a
partner mark is unavailable, because identity movement at the top of a financial
document reads as a broken or untrusted state. The platform position is
snapshot-scoped so an entitled no-attribution presentation remains consistent
for the life of an issued link; the rest of the identity layout does not shift.

The Overview view deliberately uses only issued information: client, permitted
location, sender, date, issue, and validity. It adds a location reference with
an outbound Maps link instead of a third-party embedded map. This preserves the
page's access/privacy posture and avoids making client review depend on an
external frame that can be blocked by browser policy. The existing client name
is editable from Publisher before republishing, which keeps the source of truth
in the owner workflow rather than treating public-page copy as mutable.

- [Apple HIG — Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) — stable, recognizable, purpose-first structure for familiar document tasks.
- [W3C WCAG 2.2 — Reflow](https://www.w3.org/TR/WCAG22/#reflow) — one-column responsive reflow without general two-dimensional scrolling.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — preserve the existing least-privilege and server-enforced public-link posture when adding client-facing detail.
