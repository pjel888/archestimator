# Data Inventory and ROPA Plan

## Objective

Create a single authoritative Record of Processing Activities covering every processing purpose and system.

## ROPA Required Fields

Each row must include:

- processing activity ID;
- business process;
- feature or route;
- controller or processor role;
- data subject categories;
- personal-data categories;
- sensitive or privileged-data flag;
- data source;
- purpose;
- lawful basis;
- legitimate-interest assessment reference;
- collection interface and notice;
- recipients;
- subprocessors;
- storage system and region;
- access roles;
- security measures;
- retention trigger and period;
- deletion or anonymization method;
- backup handling;
- cross-border transfer;
- data-subject rights handling;
- PIA reference;
- owner;
- approval status;
- review date.

## Initial Processing Activities

At minimum, register:

1. account registration;
2. Google OAuth;
3. magic-link authentication;
4. session and device security;
5. closed-beta eligibility;
6. onboarding and activation analytics;
7. workspace and membership administration;
8. collaboration invitations;
9. projects and estimate sheets;
10. reusable components and templates;
11. proposals and publication;
12. public share links;
13. password-protected share access;
14. client comments;
15. client approval and decline;
16. activity history;
17. uploads and attachments;
18. XLSX and document exports;
19. support conversations;
20. transactional email;
21. marketing email;
22. product analytics;
23. error and performance monitoring;
24. security and audit logs;
25. AI prompt and response processing;
26. admin and support access;
27. privacy requests;
28. legal acceptance records;
29. retention and legal holds;
30. incident response;
31. backups and restore;
32. billing and payments when enabled.

## Implementation

Create:

- `compliance/ropa/processing-activities.csv`;
- `compliance/ropa/data-system-inventory.csv`;
- `compliance/ropa/vendor-register.csv`;
- `compliance/ropa/notice-map.csv`;
- `compliance/ropa/retention-map.csv`;
- a validation script that rejects incomplete mandatory fields;
- an annual review task and material-change trigger.

## Acceptance Criteria

- every production table and external processor maps to at least one ROPA activity;
- every ROPA activity maps to a notice, lawful basis, retention rule, and owner;
- no feature is released without ROPA and PIA screening;
- legacy systems are marked active, transitional, archived, or destroyed.
