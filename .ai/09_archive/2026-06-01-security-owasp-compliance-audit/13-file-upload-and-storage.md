# 13 — File Upload and Storage

## Findings

### F-UPLOAD-01 — Magic-byte sniffing on image routes

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/app/api/component-library/images/route.ts` and `src/app/api/projects/images/route.ts` accept a small allowlist of `image/jpeg`, `image/png`, `image/webp`, `image/avif` and validate by sniffing magic bytes rather than trusting the client MIME
- **Strength:** Prevents attacker from claiming `image/jpeg` while uploading HTML or a polyglot
- **CWE:** CWE-434
- **OWASP 2025:** A04
- **ASVS 5.0:** V12.1

### F-UPLOAD-02 — `sharp` re-encode bounds pixel count and max edge

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** Reviewed upload routes run `sharp()` to decode, bound `width`/`height`, and re-encode
- **Strength:** Prevents decompression-bomb DoS and pixel-flood DoS
- **CWE:** CWE-409, CWE-400
- **OWASP 2025:** A04
- **ASVS 5.0:** V12.1

### F-UPLOAD-03 — Per-route size caps (12MB image, 20MB attachment)

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** Upload route handlers cap `Content-Length` before processing
- **CWE:** CWE-770
- **ASVS 5.0:** V12.1

### F-UPLOAD-04 — Attachment route magic-byte sniffing (PDF / xls / xlsx)

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/app/api/component-library/attachments/route.ts` sniffs `application/pdf`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **CWE:** CWE-434
- **ASVS 5.0:** V12.1

### F-UPLOAD-05 — Service-role used for object writes

- **Severity:** Low
- **Likelihood:** Low (route is server-mediated)
- **Impact:** Medium
- **Evidence:** Upload route handlers instantiate a service-role Supabase client to write to Storage
- **Compensating control:** route is server-side, not user-callable directly; the user must have already passed authentication and authorization
- **Recommendation:** Document the upload path's identity assertion in `.ai/10_state/decisions.md`. (R-48)
- **CWE:** CWE-269
- **ASVS 5.0:** V4.1

### F-UPLOAD-06 — Object key — UUID / content-hash vs raw user filename

- **Severity:** Medium
- **Likelihood:** Low (depends on storage path construction)
- **Impact:** Medium
- **Evidence:** Object key construction was not enumerated in full; the audit did not read the Storage bucket policies
- **Recommendation:** Verify Storage bucket RLS / object-prefix policies; ensure object keys are not user-controllable. (R-10, R-49)
- **CWE:** CWE-22
- **OWASP 2025:** A01
- **ASVS 5.0:** V12.1

### F-UPLOAD-07 — AV / malware scanning — not observed

- **Severity:** Medium
- **Likelihood:** Low (low-probability attachments reach external consumers)
- **Impact:** Medium
- **Evidence:** No AV / malware scanning step observed in upload routes
- **Recommendation:** If attachments are forwarded to clients as part of the proposal package, integrate a malware scan (e.g., ClamAV) before storage. (R-50)
- **CWE:** CWE-434
- **OWASP 2025:** A04
- **ASVS 5.0:** V12.1

### F-UPLOAD-08 — XLSX export via `exceljs`

- **Severity:** Medium
- **Likelihood:** Low
- **Impact:** High (header injection + formula injection — see [06](./06-injection-and-template-vulnerabilities.md) F-INJ-06)
- **Evidence:** `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`
- **Recommendation:** Sanitise filename (R-09), apply formula-injection mitigation (R-13)

## Recommendations

- R-10 (re-stated): UUID / content-hash object keys
- R-48: Document upload auth path
- R-49: Confirm Storage RLS / object-prefix
- R-50: AV scan for attachments
- R-09, R-13 (re-stated): XLSX filename + formula injection
