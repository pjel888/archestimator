# 05 — Input Validation and Output Encoding

## Findings

### F-INPUT-01 — No raw string concatenation into SQL or RPC

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** All reviewed route handlers use Supabase client's typed query builders or RPC names; no `.raw()` or template-literal SQL.
- **CWE:** CWE-89 (SQL injection)
- **OWASP 2025:** A03
- **ASVS 5.0:** V5.3

### F-INPUT-02 — Zod is not used at the route boundary in the reviewed code

- **Severity:** Low ***(corrected from Medium by second-pass review)***
- **Likelihood:** Low
- **Impact:** Low
- **Evidence:** Route handlers use explicit type guards and conditional validation. The AI package builder uses extensive structured validation via `validatePackageBuilderDraft`, `validateTreeDraft`, `validateRowsTargetAreas`, `validateLinkedLibraryRows` in `src/lib/ai/package-builder/schemas.ts` and `apply.ts`. Upload routes use magic-byte arrays and content-length checks. Comment/decision routes validate text length. Validation exists; it is just not centralized through Zod.
- **Risk:** Adding new fields to routes without updating manual validation is possible but unlikely to introduce security gaps given the existing layered validation.
- **Recommendation:** Introduce Zod (or a comparable runtime-validated schema) at every API entry point for consistency. (R-08)
- **CWE:** CWE-20
- **OWASP 2025:** A04
- **OWASP API 2023:** API8
- **ASVS 5.0:** V5.1

### F-INPUT-03 — `next=` redirect param is sanitised

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/auth/redirects.ts`
- **CWE:** CWE-601

### F-INPUT-04 — Filename handling in XLSX export — potential header injection

- **Severity:** Low ***(corrected from Medium by second-pass review)***
- **Likelihood:** Low
- **Impact:** Low
- **Evidence:** `buildProposalWorkbookFilename` (read in full during second pass) normalizes to `[a-zA-Z0-9]+` with `-` separator. It strips diacritics via NFKD normalization, removes non-ASCII chars, and strips leading/trailing hyphens. CR/LF injection is not possible through this sanitizer. Verified in `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename.ts`.
- **Recommendation:** Consider RFC 5987 encoding (`filename*=UTF-8''...`) for non-ASCII filenames (internationalization, not security). (R-09)
- **CWE:** CWE-93 (CRLF injection), CWE-113
- **OWASP 2025:** A03
- **ASVS 5.0:** V5.1, V14.4

### F-INPUT-05 — Filename handling in upload routes

- **Severity:** Low
- **Likelihood:** Medium
- **Impact:** Low
- **Evidence:** `src/app/api/component-library/attachments/route.ts`, `images/route.ts`, `src/app/api/projects/images/route.ts` use magic-byte sniffing and `sharp` re-encode, so file *content* is safe. The on-disk *filename* is not necessarily derived from user input, but if it is, it should be normalised.
- **Recommendation:** Apply a strict allowlist (UUID, content-hash) to the stored object key; never use raw user filenames. (R-10)
- **CWE:** CWE-22
- **OWASP 2025:** A01
- **ASVS 5.0:** V12.1

### F-INPUT-06 — Comment / decision / event text fields

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Low
- **Evidence:** `src/app/api/share/[token]/comment/route.ts` accepts text and stores it. If the public view page renders it without escaping, it becomes stored XSS.
- **Recommendation:** Confirm the consumer page escapes the text. Next.js React does escape by default, but if any `dangerouslySetInnerHTML` is used downstream, the issue escalates. (R-11)
- **CWE:** CWE-79
- **OWASP 2025:** A03
- **ASVS 5.0:** V5.3

### F-INPUT-07 — AI prompt input

- **Severity:** Low
- **Likelihood:** Medium
- **Impact:** Low (data leak to DeepSeek, not stored XSS)
- **Evidence:** `src/lib/ai/deepseek.ts` sends user-supplied text to DeepSeek
- **Compensating control:** tenant scoping done at the RLS layer before data is sent
- **Recommendation:** Confirm only the minimum necessary context is forwarded (R-12)
- **CWE:** CWE-200
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.1

## Output encoding (RSC)

- Next.js React Server Components escape by default
- `dangerouslySetInnerHTML` was not seen in the reviewed files
- Supabase JSON responses are typed and serialized by `JSON.stringify` in the route handlers

## Recommendations

1. **R-08:** Introduce Zod schemas at every API route boundary. Generate TS types from them.
2. **R-09:** Sanitise XLSX export filename, prefer `filename*=UTF-8''...` per RFC 5987.
3. **R-10:** Use UUIDs / hashes for storage object keys; never embed raw user filenames.
4. **R-11:** Audit any `dangerouslySetInnerHTML` usage in `src/app/share/`.
5. **R-12:** Document the AI prompt-construction policy in `.ai/10_state/decisions.md`.
