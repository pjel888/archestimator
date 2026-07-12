# Sources and Legal Validation Notes

## Primary Sources

1. Republic Act No. 10173, Data Privacy Act of 2012  
   https://privacy.gov.ph/data-privacy-act/

2. Implementing Rules and Regulations of the Data Privacy Act of 2012  
   https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/

3. National Privacy Commission issuances and circulars  
   https://privacy.gov.ph/advisories-circulars/

4. NPC Registration System  
   https://npcregistration.privacy.gov.ph/

5. NPC Data Breach Notification and Management System  
   https://dbnms.privacy.gov.ph/

6. NPC data privacy compliance resources  
   https://privacy.gov.ph/

## Repository Evidence Reviewed

The plan was informed by current Archestimator repository evidence, including:

- `src/lib/compliance/privacy-request-repository.ts`;
- `src/lib/compliance/retention-core.ts`;
- Cloudflare, D1, authentication, upload, email, observability, incident, and release-readiness scripts;
- recent repository commits covering privacy request handling, retention, collaboration, compliance, authentication, and admin controls.

## Legal Validation Required

Philippine privacy counsel or a qualified DPO should validate:

- legal entity and controller identity;
- NPC registration applicability;
- processing-system registration scope;
- lawful bases;
- sensitive and privileged information handling;
- customer controller and processor allocation;
- customer DPA;
- vendor DPA sufficiency;
- cross-border safeguards;
- breach notification criteria and templates;
- retention periods;
- legal holds;
- privacy notice language;
- direct marketing;
- cookie and analytics consent model;
- AI use and training;
- client subscription and post-deletion access model.

## Interpretation Rule

Where a conflict exists between this plan, source code, contracts, a privacy notice, or current NPC requirements, the implementation team must stop and escalate. The product must not silently choose the least restrictive interpretation.
