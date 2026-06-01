# 06 — Injection and Template Vulnerabilities

## SQL Injection (A03:2025)

### F-INJ-01 — All reviewed data access uses Supabase client or named RPC

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** No `.raw()` or template-literal SQL across the reviewed files. All queries are typed PostgREST filters or named RPCs.
- **Migrations reviewed for SECURITY DEFINER safety:**
  - `20260528003000_ai_package_builder_apply_rpc.sql` — `auth.uid()` cross-check
  - `20260528212000_ai_component_library_apply_rpc.sql` — `auth.uid()` cross-check
  - `20260531164227_collaboration_invitation_accept_by_id.sql` — SECURITY DEFINER
  - `20260601033000_collaboration_invitation_sender_contact.sql` — SECURITY DEFINER
  - `20260601043000_collaboration_pending_invite_expired_visibility.sql` — SECURITY DEFINER with `auth.jwt()->>'email'` scoping
- **CWE:** CWE-89
- **OWASP 2025:** A03
- **OWASP API 2023:** API8

### F-INJ-02 — Trigger functions are SECURITY DEFINER but tightly scoped

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260528120704_ai_audit_trigger_security_definer.sql` — owner `postgres`, `revoke execute on function … from anon, authenticated`
- **Residual risk:** trigger functions still execute with table owner privileges; the workspace-anchor check is the only authority
- **CWE:** CWE-89

## Server-Side Template Injection (SSTI)

### F-INJ-03 — No user-controlled template rendering paths identified

- **Severity:** Informational
- **Evidence:** React Server Components are JSX; no `eval`, no dynamic `Function()` constructor, no template library observed
- **CWE:** CWE-94, CWE-1336
- **OWASP 2025:** A03

## Server-Side Request Forgery (SSRF) (A10:2025)

### F-INJ-04 — No user-controlled URL fetch paths identified

- **Severity:** Informational (control)
- **Status:** No finding
- **Evidence:** The only outbound HTTP is to `https://api.deepseek.com` and `https://api.resend.com` — both hard-coded providers, not user-controlled
- **CWE:** CWE-918
- **OWASP 2025:** A10
- **ASVS 5.0:** V12.6

## LDAP / XPath / OS Command Injection

- **Severity:** N/A
- **Evidence:** No LDAP, XPath, or shell command execution paths identified. No `child_process` / `exec` / `spawn` calls observed in reviewed code.

## HTML / JavaScript Context Output

### F-INJ-05 — React Server Component default escaping

- **Severity:** Informational (control)
- **Status:** Implemented correctly — with one controlled exception
- **Evidence:** RSC + client components escape by default. One controlled usage of `dangerouslySetInnerHTML` exists in `src/components/landing/ClarityScript.tsx` for Microsoft Clarity analytics injection. The `projectId` comes from `NEXT_PUBLIC_CLARITY_PROJECT_ID` env var, not user input. No XSS vector.
- **CWE:** CWE-79
- **OWASP 2025:** A03

## CSV / Excel Formula Injection (F-INJ-06)

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium (formula injection can execute on user open of the workbook)
- **Evidence:** `exceljs` is used for XLSX export at `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`. If any cell content begins with `=`, `+`, `-`, `@`, or `\t`, Excel may interpret it as a formula.
- **Recommendation:** Prefix any user-influenced cell with a single quote `'` or set the cell type to `text` to neutralise formula evaluation. (R-13)
- **CWE:** CWE-1236
- **OWASP 2025:** A03
- **ASVS 5.0:** V5.1, V14.4

## URL / Header Injection (re-stated for completeness)

See F-INPUT-04 in [05](./05-input-validation-and-output-encoding.md) for `Content-Disposition` header injection in XLSX export.

## Prototype Pollution

- **Severity:** N/A in server runtime
- **Evidence:** No dynamic `Object.assign(userInput, ...)` patterns observed

## Recommendations

1. **R-13:** Mitigate Excel formula injection in the XLSX export (cell type `text` or leading-quote escape for user-influenced cells).
2. **R-14:** Add a regression test that asserts no `.raw()` and no `dangerouslySetInnerHTML` exist in `src/app/`.
3. **R-15:** Add a per-route helper that constructs SQL via a single audited path (currently the Supabase client is that path; this is a defence-in-depth, not a gap).
