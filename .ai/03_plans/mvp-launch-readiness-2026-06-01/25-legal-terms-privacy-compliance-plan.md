# Legal, Terms, Privacy, and Compliance Plan

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

This is not legal advice. It is an operational product/legal readiness plan and starter copy requirement list for legal review.

## Current Legal Page State

| Route | Current state | Launch decision |
| --- | --- | --- |
| `src/app/terms/page.tsx` | Pending-review placeholder; says public self-serve launch is blocked. | Replace with reviewed Terms or keep launch closed/no-go. |
| `src/app/privacy/page.tsx` | Pending-review placeholder; says public self-serve launch is blocked. | Replace with reviewed Privacy Notice or keep launch closed/no-go. |
| `src/app/login/page.tsx` | Links to terms/privacy status. | Update link labels/copy after legal copy lands. |
| `src/app/pricing/page.tsx` | MVP preview/free positioning. | Ensure no unavailable paid promises. |
| `src/app/contact/page.tsx`, settings | Support/contact route must be clear. | Add beta support/data request contact. |

## Required Outlines

| Document | Required sections |
| --- | --- |
| Terms of Service | Account eligibility, beta/preview status, user responsibility for estimate accuracy, no professional/legal/financial advice, acceptable use, user content, IP ownership, export disclaimer, account termination, warranty/liability limits, jurisdiction placeholder, contact. |
| Privacy Policy | Data collected, account/session cookies, project/client/estimate data, uploads/images, email delivery/Resend, analytics/monitoring, subprocessors, retention, deletion/export request process, security practices, future AI update requirement. |
| Beta Tester Agreement | Beta status, known limitations, feedback license, confidentiality for demo/sample data, data loss/reporting process, support SLA, termination, no production reliance without review. |
| Acceptable Use Policy | No illegal content, no malware/abuse, no credential sharing, no unauthorized data upload, construction/client confidentiality responsibilities. |
| Data Processing notes | Controller/processor placeholders, subprocessors, retention/deletion, incident contact, DPA placeholder for enterprise later. |

## Required Product/Legal Copy Blocks

EXAMPLE ONLY — not final legal text:

> Archestimator is in beta. Estimates and exports are tools for organizing project information; users remain responsible for reviewing quantities, scope, pricing, exclusions, tax, and contract terms before submission.

EXAMPLE ONLY — not final legal text:

> Ask Flip and AI assistant features are disabled for the MVP. If AI features are enabled later, the Privacy Policy and product disclosures must be updated before use.

EXAMPLE ONLY — not final legal text:

> Uploaded images/files and project/client data may contain confidential business information. Users should only upload content they are authorized to process in Archestimator.

EXAMPLE ONLY — not final legal text:

> Exported workbooks may include formulas and assumptions. Users must verify calculations, inclusions, exclusions, VAT/tax treatment, terms, and final bid amounts before sharing externally.

## Legal No-Go Conditions

- Terms/Privacy still say pending review on a public/beta launch.
- Pricing promises paid features or guarantees not available.
- AI is visible without AI privacy terms.
- No support/data deletion contact exists.
- Demo data could be mistaken for real customer endorsement.
- No beta limitations or estimate accuracy disclaimer exists.

## Required Review Before Public Launch

- Legal reviewer signs off on Terms, Privacy, Beta Agreement, AUP.
- Product owner approves beta/investor copy.
- Security owner approves data/security practice summary.
- Support owner confirms contact and deletion request handling.
