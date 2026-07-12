# Testing and Verification Plan

## Technical Verification

### Authorization

Test:

- user A cannot access user B workspace;
- collaborator capabilities match assigned role;
- share links reveal only published fields;
- expired and revoked links fail;
- password-protected links cannot be bypassed;
- client activity access respects entitlement;
- admin routes require admin capability;
- support access is scoped and logged.

### Authentication

Test:

- tokens are stored hashed;
- magic links expire;
- links are single-use;
- rate limits operate;
- sessions revoke correctly;
- admin MFA is enforced;
- production bypasses fail closed.

### Privacy requests

Run full test requests for:

- access;
- correction;
- erasure;
- objection;
- portability;
- customer-controller request.

Verify every system adapter and processor action.

### Retention

- dry-run counts;
- execution counts;
- legal hold exclusion;
- idempotency;
- failed-job alerting;
- anonymization;
- final purge;
- orphan upload cleanup;
- processor deletion confirmation.

### Logging

Verify logs do not contain:

- tokens;
- cookies;
- passwords;
- authorization headers;
- sensitive upload contents;
- full privacy export.

### Public surfaces

Verify:

- no indexing;
- no referer leakage;
- no token in analytics payload;
- no account enumeration;
- no unauthorized metadata;
- safe caching;
- safe error handling.

## Operational Verification

- DPO appointment approved;
- ROPA reviewed;
- PIA approved;
- registration determination signed;
- vendor DPAs stored;
- privacy notices reviewed;
- breach tabletop passed;
- rights-request drill passed;
- access-review drill passed;
- provider deletion drill passed.

## Evidence Standard

Each verification record must include:

- date;
- environment;
- source version;
- tester;
- method;
- expected result;
- actual result;
- artifact link;
- defects;
- approval.
