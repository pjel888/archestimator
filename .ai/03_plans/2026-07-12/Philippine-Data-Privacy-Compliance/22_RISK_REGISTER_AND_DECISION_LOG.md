# Risk Register and Decision Log

## Initial Risks

| ID | Risk | Severity | Required action |
|---|---|---:|---|
| R-001 | Incomplete processing inventory | Critical | Complete ROPA before release |
| R-002 | Authentication token exposure | Critical | Hash, expire, revoke, and test |
| R-003 | Cross-tenant data access | Critical | Authorization audit and matrix tests |
| R-004 | Public share overexposure | High | Minimize fields, expiry, revocation, notice |
| R-005 | Incomplete erasure | High | Implement all-system orchestrator |
| R-006 | Invalid retention periods | High | Legal and business approval |
| R-007 | Uncontrolled vendor transfer | High | Vendor register, DPA, transfer assessment |
| R-008 | Unprepared breach response | High | Implement and rehearse workflow |
| R-009 | Excessive admin access | High | Capability controls and audit |
| R-010 | AI provider reuse of customer data | High | Default no-training and provider terms |
| R-011 | Analytics without proper basis | High | Classify, minimize, and gate |
| R-012 | Upload of sensitive or privileged data | High | Warnings, controls, access, retention |
| R-013 | Anonymized activity remains identifiable | High | Re-identification test |
| R-014 | Legacy provider retains data | High | Migration and destruction proof |
| R-015 | Privacy policy does not match reality | High | Notice-to-system validation |

## Required Decisions

| Decision | Owner | Required before |
|---|---|---|
| PIC legal entity | Founder and counsel | P0 |
| DPO appointment | Founder | P0 |
| NPC registration applicability | DPO and counsel | P0 |
| Controller and processor allocation | DPO and counsel | Customer DPA |
| Approved lawful bases | DPO and counsel | Notice publication |
| Retention schedule | DPO, business, counsel | Retention enforcement |
| AI data-use policy | Founder, DPO, engineering | AI release |
| Analytics basis and consent model | DPO, product, counsel | Analytics release |
| Public-share telemetry scope | Product and DPO | External beta |
| Admin support-access policy | Founder and DPO | External beta |
| Backup deletion disclosure | Engineering and DPO | Privacy notice |
| Customer post-deletion activity entitlement | Product and counsel | Subscription feature |

## Decision Rule

Every decision must include:

- options;
- rationale;
- legal basis;
- user impact;
- technical impact;
- risks;
- approver;
- date;
- review trigger.
