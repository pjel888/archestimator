# OWASP ASVS 5.0.0 mapping

This is a focused verification map for Archestimator critical capabilities. It does not claim full ASVS certification. Control text and identifiers are based on the official OWASP ASVS `v5.0.0_release`; the quality capability registry owns executable traceability.

| Capability | Primary risks | Selected ASVS 5.0.0 controls | Required evidence |
| --- | --- | --- | --- |
| Authentication and recovery | Enumeration, brute force, weak recovery, unsafe redirects | `V6.1.1`, `V6.3.1`, `V6.3.8`, `V6.4.3`, `V3.7.2` | Negative auth/recovery tests, rate-limit proof, redirect allowlist |
| Sessions and cookies | Theft, fixation, stale sessions, CSRF | `V3.3.1`, `V3.3.2`, `V3.3.4`, `V3.5.1`, `V7.2.1`, `V7.2.4`, `V7.4.1`, `V7.4.2` | Cookie/session contract tests, logout/deletion invalidation, CSRF denial |
| Authorization and tenant isolation | IDOR/BOLA, cross-tenant access, client-side-only checks | `V8.1.1`, `V8.2.2`, `V8.3.1`, `V8.4.1` | Role matrix, object-level denial, cross-tenant mutation/read denial |
| D1 queries and estimate data | Injection, invariant loss, unauthorized field access | `V1.2.4`, `V2.2.1`, `V8.1.2`, `V8.2.3` | Parameterization/static checks, property tests, migration/recovery rehearsal |
| Public share/client portal | Token misuse, privacy/cache leakage, authorization drift | `V7.2.1`, `V8.2.2`, `V9.2.2`, `V14.2.1`, `V14.3.2` | Token-purpose validation, revocation/expiry, no-store and tenant denial |
| Uploads and downloads | Malicious content, path traversal, unsafe execution/disposition | `V5.1.1`, `V5.3.1`, `V5.3.2`, `V5.4.2` | Type/size/path negative tests, private lifecycle, safe download headers |
| External fetch and integration inputs | SSRF, parser ambiguity, header/URI injection | `V1.3.6`, `V1.5.3`, `V4.2.5` | Protocol/domain/path allowlists, canonical parsing and failure tests |
| Browser output and frontend security | XSS/JSON injection, unintended content interpretation | `V1.2.3`, `V3.2.1`, `V3.5.7` | Encoding/CSP/content-disposition contracts and browser negative cases |
| Export and spreadsheet output | Formula injection, data leakage | `V1.2.10`, `V8.1.2`, `V14.2.1` | Export escaping, field-authorization, tenant-boundary tests |
| Logging, error handling, and incidents | Secret/PII leakage, swallowed errors, missing audit trail | `V16.1.1`, `V16.2.1`, `V16.2.5`, `V16.3.1`, `V16.5.1`, `V16.5.3` | Redaction/static contracts, structured errors, correlation and alert drills |
| Secrets and provider configuration | Credential disclosure, insecure defaults, excessive privilege | `V13.1.4`, `V13.3.1`, `V13.3.2`, `V13.3.4`, `V15.1.2` | Secret scanning/push protection, least privilege, rotation policy, SBOM/configuration review |

`quality:security` must fail for a new high/critical finding. Medium findings require a human-approved, expiring waiver and compensating control. No waiver may cover auth/authz bypass, cross-tenant access, data-integrity loss, privacy leakage, or missing required evidence.

Review this map when ASVS, authentication/provider architecture, upload behavior, sharing tokens, export formats, or critical-capability ownership changes.
