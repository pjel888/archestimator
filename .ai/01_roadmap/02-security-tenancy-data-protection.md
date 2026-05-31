# Security, Tenancy & Data Protection Readiness

**Last updated: 2026-05-30**

## Verification Baseline

**OWASP Application Security Verification Standard (ASVS) 5.0.0** is the verification baseline for this document. ASVS is intended as a basis for testing web application technical security controls and provides a framework of security requirements that can be tested, not merely asserted. Each item maps to one or more ASVS categories. This document also cross-references **OWASP Top Ten 2025** and **OWASP API Security Top 10 2023** where applicable.

## Summary of Critical Findings

| # | Finding | Severity | Launch Blocker |
|---|---------|----------|----------------|
| 1 | No automated RLS denial tests exist for any table | Critical | **Yes** |
| 2 | Rate limiting is in-memory only (server restart clears all lockouts) | High | **Yes** |
| 3 | CSP not enforced on workshop route (blocked by @firecms/neat inline styles) | High | No |
| 4 | No secret scanning in CI pipeline | High | No |
| 5 | Google OAuth app is in testing mode (max 100 users) | High | **Yes** |
| 6 | No automated cross-workspace/project/estimate access denial tests | Critical | **Yes** |
| 7 | CSP is Report-Only on public pages | Medium | No |
| 8 | No dependency vulnerability scanning in CI | Medium | No |
| 9 | Signed URL expiry model not verified under clock skew scenarios | Medium | No |
| 10 | No automated test for service-role key isolation from client bundle | Critical | **Yes** |
| 11 | Abuse/rate-limit posture has no persistent store (lost on deploy/restart) | High | **Yes** |
| 12 | Error message leakage not systematically reviewed across all API routes | Medium | No |

---

## Tenancy & Access Isolation

### Cross-Workspace Access Denial

**ASVS:** V4.1 (Access Control), V4.2 (Operation Level)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization

| Item | |
|------|---|
| **Current Evidence** | RLS policies exist on `workspaces` table filtering by `auth.uid()`. Workspace membership is checked via `workspace_members` join in RLS policies. |
| **Missing Evidence** | No automated test suite that programmatically attempts to read workspace B's data while authenticated as workspace A's member. No fuzzing or boundary tests on workspace ID parameters. |
| **Required Test/Proof** | Automated integration test: authenticate as user in workspace A, attempt direct API calls to workspace B endpoints, verify 403/404 (not 200). Test across REST, RPC, and server action surfaces. |
| **Severity** | **Critical** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Allocate engineering time for RLS denial test suite before public launch. |

---

### Cross-Project Access Denial

**ASVS:** V4.1 (Access Control), V4.3 (Other Access Control)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization

| Item | |
|------|---|
| **Current Evidence** | RLS on `projects` table joins through `workspace_members` to verify workspace membership before allowing project access. Project-level queries filter by workspace context. |
| **Missing Evidence** | No test that a user in workspace A, project 1 cannot access workspace B, project 2 by manipulating project ID parameters. No project-scoped RPC call testing. |
| **Required Test/Proof** | Automated test: user A (member of workspace 1) attempts to query projects belonging to workspace 2. Verify all query paths (REST, RPC, server actions) return empty/denied. |
| **Severity** | **Critical** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Must be resolved alongside cross-workspace denial testing. Same test suite pass. |

---

### Cross-Estimate Access Denial

**ASVS:** V4.1 (Access Control)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization

| Item | |
|------|---|
| **Current Evidence** | RLS on `estimates` table filters by project ownership, which in turn filters by workspace membership. `estimate_nodes` and `estimate_row_items` inherit RLS through estimate relationship. |
| **Missing Evidence** | No test verifying user A in workspace 1, project A cannot read, update, or delete estimates belonging to project B (even within same workspace, if project-level access differs). No direct row-item-level cross-estimate tests. |
| **Required Test/Proof** | Automated test suite: for each of estimates, estimate_nodes, estimate_row_items, attempt cross-estimate access across workspace/project boundaries. Verify no data leakage. |
| **Severity** | **Critical** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Part of the core RLS denial suite. Estimate-level isolation is the primary data security boundary. |

---

### Sheet-Only Collaborator Isolation

**ASVS:** V4.1 (Access Control), V4.3 (Other Access Control)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control

| Item | |
|------|---|
| **Current Evidence** | Shared links V2 allows share creation scoped to a specific estimate (sheet). The collaboration model conceptually supports sheet-only access. |
| **Missing Evidence** | No test verifying that a collaborator granted access to sheet X via share link cannot enumerate, discover, or access sheet Y in the same project. No test of the shared_links RLS policy under sheet-only scope. |
| **Required Test/Proof** | Create a share link for estimate A (sheet-only). Authenticate as the share recipient. Attempt to access estimate B in the same project. Verify 403. Attempt to list all estimates in the project; verify only estimate A is visible. |
| **Severity** | **High** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Define whether sheet-only isolation is a V1 launch requirement or V1.1. If V1, this is a blocker. |

---

### Shared Project Collaborator Permissions

**ASVS:** V4.1 (Access Control), V4.3 (Other Access Control)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control

| Item | |
|------|---|
| **Current Evidence** | `workspace_members` table defines membership with role column. RLS policies reference this relationship. |
| **Missing Evidence** | No test of role-based permission escalation. What is the role model (owner/admin/member/viewer)? Can a viewer modify an estimate? Can a member delete a project? No role-permission matrix has been verified with automated tests. |
| **Required Test/Proof** | Define a role-permission matrix. For each role, programmatically attempt every mutation endpoint. Verify that lower-privilege roles are denied on write/delete operations. |
| **Severity** | **High** |
| **Launch Gate Status** | Pre-launch (role model must be defined and tested) |
| **Owner Decision Needed** | What is the role model for V1? Minimum: owner + member. Define permission boundaries now and encode in tests. |

---

## Share & Invite Security

### Public Share Token Boundaries

**ASVS:** V4.1 (Access Control), V3.7 (Cryptographic Failures)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control, A04:2021 Insecure Design  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization

| Item | |
|------|---|
| **Current Evidence** | Shared links V2 uses UUID-based tokens stored in `shared_links` table. RLS on shared_links table. Token lookup is scoped to the estimate it was created for. |
| **Missing Evidence** | No test verifying that knowledge of one share token does not grant access to other estimates or project data. No token enumeration or brute-force testing. No test of token validity window (does token grant permanent access?). |
| **Required Test/Proof** | Automated test: create share token for estimate A, use it, then attempt to access estimate B via API with the same token context. Verify isolation. Test token uniqueness under high-volume creation. |
| **Severity** | **Critical** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Define token expiry policy. Implement and test token boundary enforcement. |

---

### Password-Protected Share Route Behavior

**ASVS:** V2.1 (Authentication), V2.2 (Password Security), V11.1 (Business Logic)  
**OWASP Top Ten 2025:** A07:2021 Identification and Authentication Failures  
**OWASP API Top 10 2023:** API2:2023 Broken Authentication

| Item | |
|------|---|
| **Current Evidence** | Shared links V2 has password hardening with in-memory progressive lockout (5 attempts, 15-minute window). Incorrect password attempts are tracked in-memory and the lockout is enforced at the share route level. |
| **Missing Evidence** | No test of lockout reset behavior across server restarts (lockout is lost). No test of concurrent password attempts from different IPs. No test of password strength enforcement at creation time. No test of password hash storage (where is the hash stored, what algorithm?). |
| **Required Test/Proof** | Test suite: verify lockout after 5 incorrect attempts. Verify 15-minute window expiry resets counter. Verify lockout is per-share-link, not global. Document that lockout resets on server restart (in-memory only) and assess risk. Verify password hash uses strong algorithm (bcrypt/argon2). |
| **Severity** | **High** |
| **Launch Gate Status** | **LAUNCH BLOCKER** (in-memory lockout is lost on deploy/restart) |
| **Owner Decision Needed** | Decide: accept in-memory lockout for V1 with documented caveat, or implement persistent lockout (Supabase table or Redis). |

---

### Invite Token Lifecycle: Valid/Expired/Revoked/Used/Wrong-Account/Replay

**ASVS:** V2.1 (Authentication), V2.8 (Token Security), V11.1 (Business Logic)  
**OWASP Top Ten 2025:** A07:2021 Identification and Authentication Failures, A04:2021 Insecure Design  
**OWASP API Top 10 2023:** API2:2023 Broken Authentication

| Item | |
|------|---|
| **Current Evidence** | Invite tokens use app-owned pepper-hashed tokens exposed through a narrow RPC surface (`accept_invite`, `verify_invite`). The RPC functions handle token lookup and validation server-side. |
| **Missing Evidence** | No automated test for each lifecycle state: unexpired token works, expired token is rejected, revoked token is rejected, already-used token cannot be replayed, token claimed by wrong email/account is rejected. No pepper rotation or compromise recovery plan. |
| **Required Test/Proof** | Comprehensive lifecycle test suite: (1) valid invite → accept succeeds, (2) expired invite → rejected with clear error, (3) revoked invite → rejected, (4) already-accepted invite → replay rejected, (5) invite sent to alice@example.com attempted by bob@example.com → rejected, (6) manipulated/forged token → rejected. |
| **Severity** | **Critical** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Allocate time for invite lifecycle test suite. Define expiry window. Document pepper rotation procedure. |

---

### Auth Callback Redirect Safety

**ASVS:** V2.1 (Authentication), V5.5 (SSRF)  
**OWASP Top Ten 2025:** A07:2021 Identification and Authentication Failures  
**OWASP API Top 10 2023:** API2:2023 Broken Authentication

| Item | |
|------|---|
| **Current Evidence** | The auth callback (`/auth/callback`) uses a redirect sanitizer that validates the target URL against an allowlist or strips open redirect vectors. The sanitizer is applied before the `res.redirect()` call. |
| **Missing Evidence** | No automated test proving the sanitizer rejects common open redirect payloads (double-encoding, protocol-relative URLs, CRLF injection, javascript: URIs). No test of the allowlist enforcement under different environments (dev vs prod). |
| **Required Test/Proof** | Test suite: for each known open redirect bypass technique, verify the sanitizer returns a safe fallback (e.g., `/dashboard`) rather than following the malicious redirect. Test with `//evil.com`, `https:evil.com`, `javascript:alert(1)`, `%2F%2Fevil.com`, `\evil.com`. |
| **Severity** | **High** |
| **Launch Gate Status** | Pre-launch |
| **Owner Decision Needed** | Minor: formalize the redirect sanitizer test suite. |

---

## Service & Infrastructure Security

### Service-Role Key Isolation

**ASVS:** V2.10 (Service Authentication), V6.2 (Secrets Management)  
**OWASP Top Ten 2025:** A07:2021 Identification and Authentication Failures  
**OWASP API Top 10 2023:** API2:2023 Broken Authentication

| Item | |
|------|---|
| **Current Evidence** | The Supabase `service_role` key is stored server-side in environment variables and is never exposed to the client bundle. Server-side code uses the service role key for admin operations where RLS is bypassed intentionally. |
| **Missing Evidence** | No automated test that greps the client bundle (after build) for the service role key string. No test verifying that the key is not leaked in server-side rendered HTML, API error responses, or source maps. No test verifying the key is not present in git history. |
| **Required Test/Proof** | Build the production bundle, grep for any string matching the service role key pattern. Add CI step that fails if the key pattern is found in client-side assets, source maps, or HTML responses. Verify .gitignore excludes .env files. Run `git log --all --full-history -- "*.env"` to verify no historical leaks. |
| **Severity** | **Critical** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Implement CI check for service role key leakage. Run historical git scan. |

---

### Server-Only Secret Handling

**ASVS:** V6.2 (Secrets Management), V6.4 (Application Secrets)  
**OWASP Top Ten 2025:** A04:2021 Insecure Design  
**OWASP API Top 10 2023:** API8:2023 Security Misconfiguration

| Item | |
|------|---|
| **Current Evidence** | Secrets (API keys, database URLs, pepper values) are loaded from environment variables in server-side code only. Next.js server components and API routes read from `process.env`. |
| **Missing Evidence** | No audit of all environment variables to classify which are safe for client exposure vs server-only. No test verifying that `NEXT_PUBLIC_` prefixed variables do not leak sensitive data. No secret rotation procedure documented or tested. |
| **Required Test/Proof** | Inventory all environment variables. Mark each as client-safe or server-only. Verify no server-only variable uses `NEXT_PUBLIC_` prefix. Verify client-side code never imports or references server-only env vars. Document secret rotation procedure. |
| **Severity** | **High** |
| **Launch Gate Status** | Pre-launch |
| **Owner Decision Needed** | Perform env var audit. Document rotation procedure. |

---

### Storage Bucket Privacy

**ASVS:** V4.1 (Access Control), V12.1 (File and Resources)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization

| Item | |
|------|---|
| **Current Evidence** | Supabase Storage buckets are used for file uploads. Bucket-level RLS policies are assumed to be configured. |
| **Missing Evidence** | No test verifying that storage bucket policies are enabled and correctly scoped. Can an authenticated user in workspace A read/upload files to workspace B's storage paths? No test of public bucket exposure. No verification that bucket policies are not accidentally set to public. |
| **Required Test/Proof** | For each storage bucket, verify the access policy. Test cross-workspace file access (authenticated as workspace A member, attempt to download workspace B's files). Test unauthenticated access to storage objects. Verify bucket listing is denied when appropriate. |
| **Severity** | **High** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Audit all storage bucket policies. Implement cross-workspace storage access denial tests. |

---

### Image/Attachment Access Controls

**ASVS:** V4.1 (Access Control), V12.1 (File and Resources), V12.3 (File Execution)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control, A03:2021 Injection

| Item | |
|------|---|
| **Current Evidence** | Images and attachments uploaded to estimates are stored in Supabase Storage buckets. Access is mediated through the application layer. |
| **Missing Evidence** | No test verifying that attachment URLs are not guessable/enumerable. No test of content-type validation on upload (can a user upload an HTML file disguised as an image?). No test verifying that direct storage URLs cannot be accessed without proper authorization. No malware scanning on uploads. |
| **Required Test/Proof** | Verify content-type enforcement on upload. Test that direct URL access to attachments requires valid auth context. Test that attachment IDs cannot be enumerated (non-sequential, non-guessable). Consider virus/malware scanning for V2. |
| **Severity** | **Medium** |
| **Launch Gate Status** | Pre-launch (content-type enforcement must be verified) |
| **Owner Decision Needed** | Define acceptable file types. Implement content-type validation on upload. Malware scanning is a V2 concern. |

---

### Signed URLs or Equivalent Access Model

**ASVS:** V4.1 (Access Control), V12.6 (Resource Access)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization

| Item | |
|------|---|
| **Current Evidence** | Supabase Storage supports signed URLs with configurable expiry. The application likely uses signed URLs for serving private assets. |
| **Missing Evidence** | No verification of expiry enforcement (do signed URLs actually expire and stop working?). No test of signed URL reuse after expiry. No test of signed URL generation rate limiting (can an attacker generate unlimited signed URLs?). No test of clock skew handling. |
| **Required Test/Proof** | Generate a signed URL with short expiry (e.g., 60 seconds). Verify it works. Wait past expiry. Verify it returns 403/404. Attempt to use an expired signed URL from a different IP or session. Verify rate limiting on signed URL generation endpoint. |
| **Severity** | **Medium** |
| **Launch Gate Status** | Pre-launch |
| **Owner Decision Needed** | Verify expiry enforcement. Document signed URL expiry policy. |

---

## Database & API Authorization

### Row-Level Security Policies

**ASVS:** V4.1 (Access Control), V6.1 (Data Classification)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization

| Item | |
|------|---|
| **Current Evidence** | RLS is enabled on core tables: `workspaces`, `projects`, `estimates`, `estimate_nodes`, `estimate_row_items`, `shared_links`. Policies filter by `auth.uid()` via `workspace_members` join chain. |
| **Missing Evidence** | No automated denial tests exist for any table. No test verifying RLS is actually enabled (not disabled by migration or admin action). No test of all SQL operations (SELECT, INSERT, UPDATE, DELETE) against each table. No test of RLS under different auth contexts (anon, authenticated, service_role). No test of RLS bypass via Postgres functions with SECURITY DEFINER. |
| **Required Test/Proof** | Comprehensive RLS denial test suite: for each table with RLS, test all four CRUD operations, test as anon user (expect deny), test as authenticated user with no workspace membership (expect deny), test as authenticated user in workspace A accessing workspace B data (expect deny), test as service_role (expect allow). Automate as part of CI. |
| **Severity** | **Critical** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Highest priority. No RLS denial tests = no confidence in tenancy isolation. Must be resolved before any user data is stored in production. |

---

### RPC Authorization Behavior

**ASVS:** V4.1 (Access Control), V4.2 (Operation Level)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization

| Item | |
|------|---|
| **Current Evidence** | RPC functions (e.g., `accept_invite`, `verify_invite`) use `SECURITY DEFINER` with input validation and workspace context checking. Invite-related RPCs use pepper-hashed tokens for security. |
| **Missing Evidence** | No test of all RPC functions under different auth contexts. No test verifying that RPC functions respect RLS or implement their own authorization correctly. No test of parameter manipulation on RPC calls. No inventory of which RPCs bypass RLS intentionally. |
| **Required Test/Proof** | Inventory all RPC functions. For each: document whether it uses SECURITY DEFINER or SECURITY INVOKER, test with appropriate and inappropriate auth contexts, test with manipulated parameters, verify authorization logic. |
| **Severity** | **High** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Audit all RPC functions. Implement authorization tests for each. |

---

### API Route Authorization

**ASVS:** V4.1 (Access Control), V4.2 (Operation Level)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization, API5:2023 Broken Function Level Authorization

| Item | |
|------|---|
| **Current Evidence** | Next.js API routes use middleware or inline auth checks. Supabase client on the server validates the session token. |
| **Missing Evidence** | No systematic test verifying every API route has an authorization check. No test of API routes under missing/invalid/expired auth tokens. No test of API route access with valid auth but insufficient permissions for the requested resource. |
| **Required Test/Proof** | Inventory all API routes. For each route: test without auth header (expect 401), test with invalid/expired token (expect 401), test with valid token but wrong workspace context (expect 403), test with valid token and correct context (expect 200). Automate. |
| **Severity** | **Critical** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Implement automated API route authorization test suite. |

---

### Server Action Authorization

**ASVS:** V4.1 (Access Control), V4.2 (Operation Level)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control  
**OWASP API Top 10 2023:** API5:2023 Broken Function Level Authorization

| Item | |
|------|---|
| **Current Evidence** | Next.js Server Actions are used for mutations. Server-side auth context is available via Supabase session. |
| **Missing Evidence** | No test verifying authorization checks exist in every server action. No test of server actions called without auth context (direct HTTP POST to the action endpoint). No CSRF protection verification on server actions. |
| **Required Test/Proof** | Inventory all server actions. For each: test direct POST without auth (expect rejection), test with cross-workspace parameter injection (expect rejection), verify CSRF token or Next.js built-in protection is active. |
| **Severity** | **High** |
| **Launch Gate Status** | **LAUNCH BLOCKER** |
| **Owner Decision Needed** | Audit all server actions. Implement authorization and CSRF tests. |

---

### AI Route Authorization

**ASVS:** V4.1 (Access Control), V10.3 (AI/ML Security)  
**OWASP Top Ten 2025:** A01:2021 Broken Access Control, A03:2021 Injection  
**OWASP API Top 10 2023:** API1:2023 Broken Object Level Authorization, API8:2023 Security Misconfiguration

| Item | |
|------|---|
| **Current Evidence** | AI-related API routes exist for estimate generation and analysis features. These routes consume the user's estimate data and return AI-generated content. |
| **Missing Evidence** | No test verifying that AI routes enforce workspace/project/estimate access controls. No test of prompt injection resistance. No test verifying AI output does not leak data from other users' estimates (model training/caching concerns). No test of rate limiting on AI endpoints. |
| **Required Test/Proof** | Verify AI route authorization matches other API routes (auth check, workspace context). Test prompt injection attempts. Document AI provider data handling policy (is user data used for training?). Verify rate limiting on AI endpoints (cost protection). |
| **Severity** | **High** |
| **Launch Gate Status** | Pre-launch |
| **Owner Decision Needed** | Verify AI provider's data usage policy. Implement AI-specific rate limiting. |

---

## Operational Security

### Metadata-Only Audit Policy

**ASVS:** V7.1 (Log Content), V7.2 (Log Processing)  
**OWASP Top Ten 2025:** A09:2021 Security Logging and Monitoring Failures  
**OWASP API Top 10 2023:** API10:2023 Unsafe Consumption of APIs

| Item | |
|------|---|
| **Current Evidence** | Audit logging approach is not yet defined for V1. |
| **Missing Evidence** | No audit trail for sensitive operations (estimate creation/deletion, share link creation, workspace member add/remove, permission changes). No retention policy. No log integrity verification (append-only, tamper detection). |
| **Required Test/Proof** | Define audit events for V1. Implement metadata-only audit logging (who did what, when, to which resource -- no estimate content in logs). Verify audit logs are append-only and stored in a separate table with restricted access. |
| **Severity** | **Medium** |
| **Launch Gate Status** | Post-launch (acceptable for V1 with no audit trail if documented) |
| **Owner Decision Needed** | Decide audit scope for V1. Minimum: auth events, share link creation, workspace membership changes. |

---

### Abuse/Rate-Limit Posture

**ASVS:** V11.1 (Business Logic), V18.4 (Rate Limiting)  
**OWASP Top Ten 2025:** A04:2021 Insecure Design  
**OWASP API Top 10 2023:** API4:2023 Unrestricted Resource Consumption

| Item | |
|------|---|
| **Current Evidence** | Rate limiting is **in-memory only**. Progressive lockout for share link passwords (5 attempts, 15 min) resets on server restart. No persistent rate limit store. |
| **Missing Evidence** | No rate limiting on login attempts, sign-in link generation, invite creation, API endpoints, AI endpoints, or storage uploads. No test verifying rate limits actually function under load. No DDoS protection at infrastructure level. |
| **Required Test/Proof** | Implement persistent rate limiting (Supabase table or Redis). Add rate limits to: login attempts (5/min/IP), sign-in link generation (3/min/email), invite creation (10/hour/workspace), AI endpoints (cost control), API routes (1000/min/user). Test each limit verify enforcement. |
| **Severity** | **High** |
| **Launch Gate Status** | **LAUNCH BLOCKER** (in-memory lockout lost on deploy/restart) |
| **Owner Decision Needed** | Choose persistent rate limit store. Implement before launch. Minimum: auth rate limits + AI cost limits. |

---

### CSP/Security Headers

**ASVS:** V14.4 (HTTP Security Headers), V14.5 (HTTP Request Header Verification)  
**OWASP Top Ten 2025:** A05:2021 Security Misconfiguration  
**OWASP API Top 10 2023:** API8:2023 Security Misconfiguration

| Item | |
|------|---|
| **Current Evidence** | CSP is enforced on `/share/:path*` routes. CSP is **Report-Only** on public pages. CSP is **not enforced on the workshop route** due to `@firecms/neat` generating inline styles that violate strict CSP (blocked on `style-src 'unsafe-inline'` being required). Other security headers status unknown. |
| **Missing Evidence** | No inventory of all security headers in production. No test verifying CSP report collection and monitoring. No test of other headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy). No test of CSP bypass vectors. |
| **Required Test/Proof** | Inventory all security headers. Implement HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin. Resolve @firecms/neat inline style issue or accept Report-Only on workshop. Set up CSP report collection and monitoring. Test headers on all routes. |
| **Severity** | **High** (CSP gap) / **Medium** (other headers) |
| **Launch Gate Status** | CSP workshop gap: not a blocker (documented). Other security headers: pre-launch. |
| **Owner Decision Needed** | Address @firecms/neat inline style issue or accept Report-Only on workshop with monitoring. Implement other security headers. |

---

### Dependency Risk Review

**ASVS:** V14.2 (Dependency)  
**OWASP Top Ten 2025:** A06:2021 Vulnerable and Outdated Components  
**OWASP API Top 10 2023:** API8:2023 Security Misconfiguration

| Item | |
|------|---|
| **Current Evidence** | Dependencies are managed via `package.json` and `bun.lockb`. No automated vulnerability scanning in CI. |
| **Missing Evidence** | No `npm audit` or `bun audit` in CI pipeline. No dependency freshness check. No SBOM generated. No policy for handling critical CVEs in dependencies. |
| **Required Test/Proof** | Add `bun audit` (or `npm audit --production`) to CI pipeline. Fail CI on critical/high vulnerabilities. Generate SBOM as part of build. Document vulnerability remediation SLA (e.g., critical: 24h, high: 7 days). |
| **Severity** | **Medium** |
| **Launch Gate Status** | Pre-launch |
| **Owner Decision Needed** | Implement dependency scanning in CI. Define vulnerability response SLA. |

---

### Sensitive Logs Review

**ASVS:** V7.1 (Log Content), V7.3 (Log Protection)  
**OWASP Top Ten 2025:** A09:2021 Security Logging and Monitoring Failures  
**OWASP API Top 10 2023:** API10:2023 Unsafe Consumption of APIs

| Item | |
|------|---|
| **Current Evidence** | Application logging practices not formally reviewed for sensitive data leakage. |
| **Missing Evidence** | No audit of `console.log`, `console.error`, or structured logging calls for sensitive data (auth tokens, passwords, PII, API keys, full SQL queries with parameters). No log redaction or sanitization in place. No log retention or access control policy. |
| **Required Test/Proof** | Grep codebase for all logging calls. Review each for potential sensitive data leakage. Implement log sanitization middleware. Ensure no auth tokens, passwords, or PII appear in logs. Document log retention policy. Restrict log access. |
| **Severity** | **Medium** |
| **Launch Gate Status** | Pre-launch |
| **Owner Decision Needed** | Perform sensitive log audit. Implement sanitization before production deployment. |

---

### Error Message Leakage Review

**ASVS:** V7.4 (Error Handling), V14.3 (Information Leakage)  
**OWASP Top Ten 2025:** A05:2021 Security Misconfiguration  
**OWASP API Top 10 2023:** API8:2023 Security Misconfiguration

| Item | |
|------|---|
| **Current Evidence** | Error handling exists in API routes and server actions, but no systematic review for information leakage has been performed. |
| **Missing Evidence** | No test verifying that production error responses do not leak stack traces, database error messages, internal paths, framework versions, or SQL error details. No test of error handling under various failure modes (DB down, auth service down, invalid input, rate limited). |
| **Required Test/Proof** | For each API route and server action, trigger error conditions and inspect response body. Verify: no stack traces, no SQL errors, no internal paths, no framework version strings, no database schema details. All errors should return sanitized, user-friendly messages. |
| **Severity** | **Medium** |
| **Launch Gate Status** | Pre-launch |
| **Owner Decision Needed** | Perform systematic error leakage review across all API surfaces. |

---

### Tenant-Safe Analytics Posture

**ASVS:** V9.1 (Communications), V14.4 (HTTP Security Headers)  
**OWASP Top Ten 2025:** A05:2021 Security Misconfiguration

| Item | |
|------|---|
| **Current Evidence** | Analytics implementation status unknown. No documented analytics privacy review. |
| **Missing Evidence** | No verification that analytics tools do not capture PII, auth tokens, estimate content, or workspace names. No test of analytics data in transit (is it sent over HTTPS?). No cookie consent mechanism if analytics cookies are used. No data processing agreement review. |
| **Required Test/Proof** | If analytics are implemented: verify no PII or user content is sent to analytics provider. Verify analytics requests use HTTPS. Verify analytics provider's data processing terms are acceptable. If no analytics yet, document the requirement: analytics must be tenant-safe from day one. |
| **Severity** | **Low** |
| **Launch Gate Status** | Pre-launch (if analytics are present) |
| **Owner Decision Needed** | Define analytics privacy requirements. Audit any existing analytics integration. |

---

## Appendices

### OWASP ASVS 5.0.0 Category Mapping

| ASVS Category | Relevant Sections |
|---------------|-------------------|
| V2: Authentication | Auth callback, invite tokens, password-protected shares, service role isolation |
| V3: Session Management | Auth callback safety, token lifecycle |
| V4: Access Control | All tenancy isolation items, RLS, RPC auth, API auth, server action auth |
| V5: Validation, Sanitization | Input validation on all API surfaces |
| V6: Stored Cryptography | Pepper hashing, password hashing, secret management |
| V7: Error Handling & Logging | Error leakage, sensitive logs, audit policy |
| V9: Communications | CSP, security headers |
| V10: Malicious Code | Dependency review, SBOM |
| V11: Business Logic | Rate limiting, invite lifecycle, share token boundaries |
| V12: File & Resources | Storage bucket privacy, image/attachment controls, signed URLs |
| V14: Configuration | CSP, security headers, dependency management |
| V18: Web Services | Rate limiting, API authorization |

### OWASP Top Ten 2025 (Draft) Cross-Reference

| Rank | Category | Covered In |
|------|----------|------------|
| A01 | Broken Access Control | All tenancy isolation, RLS, API auth, server action auth |
| A02 | Cryptographic Failures | Invite token hashing, password hashing |
| A03 | Injection | AI route auth, file upload content-type enforcement |
| A04 | Insecure Design | Rate limiting (in-memory), invite token lifecycle |
| A05 | Security Misconfiguration | CSP/security headers, error leakage, dependency review |
| A06 | Vulnerable Components | Dependency risk review |
| A07 | Auth Failures | Auth callback, invite tokens, password-protected shares |
| A08 | Software & Data Integrity | SBOM generation, dependency verification |
| A09 | Logging & Monitoring | Sensitive logs, audit policy, CSP reporting |
| A10 | SSRF | Auth callback redirect sanitizer (indirect) |

### OWASP API Security Top 10 2023 Cross-Reference

| Rank | Category | Covered In |
|------|----------|------------|
| API1 | Broken Object Level Authorization | Cross-workspace/project/estimate denial, RLS, signed URLs |
| API2 | Broken Authentication | Auth callback, invite lifecycle, password-protected shares, service role isolation |
| API3 | Broken Object Property Level Authorization | Role-permission matrix (shared project collaborators) |
| API4 | Unrestricted Resource Consumption | Rate limiting, AI endpoint cost control |
| API5 | Broken Function Level Authorization | API route auth, server action auth, RPC auth |
| API6 | Unrestricted Access to Sensitive Business Flows | Invite token replay, share token enumeration |
| API7 | Server-Side Request Forgery | Auth callback redirect safety |
| API8 | Security Misconfiguration | CSP, security headers, error leakage, dependency review |
| API9 | Improper Inventory Management | RPC inventory, API route inventory, env var audit |
| API10 | Unsafe Consumption of APIs | AI route authorization, analytics posture |

---

*Document prepared for Archestimator MVP security readiness assessment. All findings are based on current codebase state as of 2026-05-30. No security tests have been executed as part of this assessment; this document identifies required tests and proofs.*

---

## Collaboration & Sharing Audit Integration Note — 2026-05-30

This document is a reference domain deep-dive. For detailed, current collaboration/share security truth, consult `.ai/03_plans/share-and-collaboration-implementation/` — specifically `05-security-threat-model-and-hardening.md`. Key invite/share security gaps identified in that pack and reflected in current roadmap goal cards:

- **Invite token brute-force protection** — missing; invite endpoints have no rate limiting
- **Invite route rate limiting** — must be durable (Redis-backed), not in-memory
- **POST-only invite acceptance** — GET-based mutation risk must be corrected; GET must not mutate or grant access
- **Fail-closed missing config** — `PROJECT_INVITE_ENTRY_ENABLED` must disable acceptance entirely when absent
- **Raw token logging/referrer leakage review** — tokens must never appear in server logs, error messages, or referrer headers
- **Invite audit event gaps** — current audit events are RPC-only; invite lifecycle events need broader coverage
- **Durable rate limiting required before external beta** — in-memory rate limiting is not acceptable for beta
- **Shared-link in-memory lockout** — password/access lockout must persist across server restarts; current in-memory implementation is not beta-acceptable
- **"Email sent" messaging** — must not claim email delivery unless confirmed

See goal cards CODEX-P0-COLLAB-002 (POST-only/fail-closed), BETA-P0-SEC-005 (persistent rate limiting), and CODEX-P0-COLLAB-004 (messaging truthfulness) for implementation details.
