# 05 — False Negatives and New Findings

Material risks identified in the second pass that the first pass missed or under-assessed.

---

## New Finding: SEC-20260601-2P-001 — Missing `search_path` hardening acknowledgment

**Severity:** Informational (strength, not vulnerability)
**Why first pass missed it:** The first pass reviewed SECURITY DEFINER functions for authorization but did not check `search_path` hardening.
**Evidence:** All 29+ migration files with SECURITY DEFINER functions set `set search_path = public` or `set search_path = public, pg_temp`. Verified via grep across `supabase/migrations/`. This prevents Postgres function hijacking through schema search path manipulation.
**OWASP 2025:** A05 (Security Misconfiguration — strong positive control)
**OWASP API 2023:** API8
**ASVS 5.0:** V14.3
**Recommended remediation:** Document this as a verified strength in the executive summary. Consider adding a regression test that asserts `search_path = public` on all SECURITY DEFINER functions.
**Where added:** 04-authorization-and-rls-coverage.md (strength section), 00-executive-summary.md.

---

## New Finding: SEC-20260601-2P-002 — `dangerouslySetInnerHTML` in ClarityScript (controlled)

**Severity:** Informational (controlled usage)
**Why first pass missed it:** The first pass claimed "no `dangerouslySetInnerHTML` observed in reviewed files" but `src/components/landing/ClarityScript.tsx` uses it for Microsoft Clarity analytics injection.
**Evidence:** `src/components/landing/ClarityScript.tsx` line 10 — uses `dangerouslySetInnerHTML={{ __html: ... }}` to inject Clarity tracking script. The `projectId` comes from `NEXT_PUBLIC_CLARITY_PROJECT_ID` env var, not user input. This is a controlled analytics injection, not an XSS vector.
**OWASP 2025:** A03 (Injection — properly controlled in this case)
**Recommended remediation:** Document this as a known controlled exception. Ensure `NEXT_PUBLIC_CLARITY_PROJECT_ID` is validated server-side before being passed to the component.
**Where added:** 05-input-validation-and-output-encoding.md (correction to original claim), 06-injection-and-template-vulnerabilities.md.

---

## New Finding: SEC-20260601-2P-003 — `localStorage` usage without data sensitivity review

**Severity:** Low
**Why first pass missed it:** The first pass did not audit client-side storage usage.
**Evidence:** 52 matches for `localStorage`/`sessionStorage` across 19 source files. Usage includes:
- UI state preferences (view mode, column sizing, tree width, share last-seen timestamps)
- Component library recents (persisted library item history)
- Offline comment queue in `sessionStorage`
- Active tab persistence in `sessionStorage`

No secrets, tokens, or PII observed in localStorage/sessionStorage values. However, the offline comment queue stores comment text in `sessionStorage` — this could expose draft comments to XSS if the page is compromised.
**CWE:** CWE-922 (insecure storage of sensitive information)
**OWASP 2025:** A04
**ASVS 5.0:** V3.4
**Recommended remediation:** Audit comment text in `sessionStorage` offline queue. If comments contain PII, use IndexedDB with encryption instead. Add a CSP that restricts script sources to prevent XSS-based exfiltration.
**Where added:** 05-input-validation-and-output-encoding.md (new section), 14-shared-link-publication-surface.md.

---

## New Finding: SEC-20260601-2P-004 — Share route invite rate limits not credited

**Severity:** Informational (confirmed strength)
**Why first pass missed it:** The first pass's rate-limit review focused on share routes but didn't mention invite routes.
**Evidence:** Invite routes (`src/app/invite/[token]/page.tsx`, `continue/route.ts`, `accept/route.ts`) all use durable rate limits through `security_rate_limit_events`. The invite resolution page checks `checkInviteResolutionRateLimit`, continue checks `checkInviteContinueRateLimit`, and accept checks `checkInviteAcceptRateLimit`. All return 429 with `Retry-After` and `Cache-Control: no-store`.
**OWASP API 2023:** API4
**ASVS 5.0:** V11.1
**Recommended remediation:** Document in rate-limit section.
**Where added:** 09-rate-limiting-and-dos-resilience.md, 15-collaboration-invite-surface.md.

---

## New Finding: SEC-20260601-2P-005 — Proxy strips `no-store` from marketing pages for BFCache

**Severity:** Informational (strong positive control)
**Why first pass missed it:** The first pass did not review proxy.ts in detail beyond auth gating.
**Evidence:** `src/proxy.ts` explicitly sets `"private, no-cache, max-age=0, must-revalidate"` on marketing pages and removes `no-store` headers that would prevent Chrome BFCache. Test `auth-proxy.test.ts` verifies this behavior. This is a deliberate performance optimization that does not compromise security — marketing pages don't contain auth-sensitive content.
**OWASP 2025:** A05 (Security Configuration — correctly tuned)
**Recommended remediation:** Document as a verified control.
**Where added:** 03-authentication-and-session-management.md.

---

## New Finding: SEC-20260601-2P-006 — ExcelJS cell type not explicitly set to `text`

**Severity:** Low
**Why first pass missed it:** The first pass flagged formula injection but didn't read the workbook builder source in detail.
**Evidence:** `src/lib/proposal-export/create-proposal-workbook.ts` uses `numFmt` for numeric cells but does not set `type: "text"` on string cells or prefix with `'`. The source data is structured from a DTO (project/estimate metadata, area names, component names), not raw free-text user input. The practical formula injection risk is low but the defense-in-depth recommendation remains valid.
**CWE:** CWE-1236
**OWASP 2025:** A03
**ASVS 5.0:** V5.1
**Recommended remediation:** Set `type: "text"` on string cells or prefix user-influenced values with `'`. Add a test that verifies formula characters (`=`, `+`, `-`, `@`) in cell content are properly escaped.
**Where added:** 06-injection-and-template-vulnerabilities.md (enhancement to F-INJ-06).

---

## New Finding: SEC-20260601-2P-007 — Missing storage RLS/policy audit

**Severity:** Low
**Why first pass missed it:** The first pass noted F-UPLOAD-06 about object keys but did not audit Storage bucket policies.
**Evidence:** Upload routes use service-role Supabase client for Storage writes. The Storage bucket policies (public/private access, object-prefix restrictions) were not reviewed in either pass. This is an evidence gap.
**OWASP 2025:** A01
**ASVS 5.0:** V12.1
**Recommended remediation:** Review Supabase Storage bucket policies. Ensure private buckets are not publicly readable. Verify object-prefix policies match workspace isolation.
**Where added:** 13-file-upload-and-storage.md.

---

## New Finding: SEC-20260601-2P-008 — Server action error handling not audited

**Severity:** Low
**Why first pass missed it:** The first pass focused on API route handlers but not server actions (`src/lib/*/actions.ts`).
**Evidence:** Server actions in `src/lib/estimates/actions.ts`, `src/lib/collaboration/actions.ts`, `src/lib/publication/actions.ts`, `src/lib/component-library/actions.ts`, `src/lib/projects/actions.ts` handle mutations and could leak internal error details to the client. Error shapes were not systematically reviewed.
**CWE:** CWE-209
**OWASP 2025:** A04
**ASVS 5.0:** V7.4
**Recommended remediation:** Audit server action error responses for information disclosure. Ensure all error paths return sanitized user-facing messages.
**Where added:** 17-error-handling-and-information-disclosure.md.

---

## New Finding: SEC-20260601-2P-009 — `@firecms/neat` patched dependency risk

**Severity:** Low
**Why first pass missed it:** The first pass reviewed `package.json` pins but didn't check for patched/hacked dependencies.
**Evidence:** `README.md` and `DESIGN.md` note that `@firecms/neat@0.8.0` has a `paused` property patch added to pause/resume WebGL animation. This means the dependency is a modified fork, not an upstream release. Any upstream security fix to `@firecms/neat` would not be automatically applied.
**CWE:** CWE-1104
**OWASP 2025:** A06
**ASVS 5.0:** V14.2
**Recommended remediation:** Document the patch rationale. Consider forking properly or submitting the patch upstream. Add to SCA baseline.
**Where added:** 10-third-party-and-supply-chain.md.

---

## New Finding: SEC-20260601-2P-010 — EXIF/metadata stripping in image uploads not explicitly confirmed

**Severity:** Low
**Why first pass missed it:** The first pass noted `sharp` re-encode but didn't discuss EXIF. `sharp` strips EXIF by default on resize, but this should be confirmed as intentional.
**Evidence:** Upload routes call `sharp()` for re-encode. `sharp` documentation states metadata is stripped on resize operations by default.
**OWASP 2025:** A01
**ASVS 5.0:** V9.1
**Recommended remediation:** Add explicit EXIF stripping (sharp `.withMetadata()` is not called, so it's stripped by default). Document in data protection section. Add regression test.
**Where added:** 13-file-upload-and-storage.md.
