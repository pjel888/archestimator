# Security Safeguards and Privacy Engineering

## Security Standard

Privacy compliance requires reasonable and appropriate organizational, physical, and technical safeguards.

## Organizational Controls

- documented security and privacy policies;
- least privilege;
- joiner, mover, and leaver process;
- privileged-access approval;
- vendor review;
- incident response;
- secure development lifecycle;
- change review;
- training;
- periodic risk assessment;
- evidence retention.

## Technical Controls

### Identity and access

- strong session management;
- short-lived, single-use magic links;
- hashed token storage;
- secure OAuth state and PKCE where applicable;
- MFA for admin and high-risk operations;
- reauthentication for destructive actions;
- tenant-bound authorization;
- deny-by-default route protection;
- rate limiting;
- bot and abuse protection.

### Data

- encryption in transit;
- encryption at rest;
- secrets management;
- scoped service credentials;
- signed upload and download access;
- no public buckets by default;
- tenant isolation;
- output encoding and injection prevention;
- secure export lifecycle;
- deletion and retention controls.

### Logging

- request ID;
- security-relevant events;
- admin access;
- privacy request actions;
- retention execution;
- incident actions;
- no secrets;
- minimized personal identifiers;
- access controls and TTLs.

### Application security

- OWASP ASVS-aligned controls;
- authorization matrix tests;
- CSRF protection;
- XSS prevention;
- SSRF controls;
- secure file handling;
- database query safety;
- dependency review;
- supply-chain controls;
- secure headers;
- abuse and rate-limit controls.

## Privacy-by-Design Gates

Every feature must answer:

- can less data be used?
- can identifiers be pseudonymized?
- can retention be shorter?
- can access be narrower?
- is public exposure necessary?
- is collection expected by the user?
- can the feature work without cross-customer reuse?
- can the user control or reverse the action?

## Known Priority

Any plaintext authentication, reset, invitation, or share token must be remediated before beta.
