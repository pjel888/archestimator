# 04 — False Positives and Downgrades

Every finding downgraded, removed, merged, or rewritten due to weak or contradictory evidence.

---

## Downgraded Findings

### F-INPUT-02 — "Zod is not used at the route boundary" (Medium → Low)

**Original claim:** Zod not used; manual validation is a Medium risk.
**Why inaccurate:** The codebase has extensive structured validation. `src/lib/ai/package-builder/schemas.ts` contains `validatePackageBuilderDraft`, `validateTreeDraft`, `validateRowsTargetAreas`, `validateLinkedLibraryRows`. Route handlers validate with explicit conditionals (comment body length, magic-byte arrays, etc.). Validation exists, it's just not through a centralized Zod schema library.
**Evidence checked:** `src/lib/ai/package-builder/schemas.ts`, all API route handlers under `src/app/api/`.
**Final treatment:** Severity downgraded to Low. Recommendation remains valid (centralized Zod schemas would improve consistency) but the risk is lower than originally rated.
**Residual risk:** None — existing validation covers the practical attack surface.

### F-INPUT-04 — "XLSX Content-Disposition header injection" (Medium → Low)

**Original claim:** `Content-Disposition: attachment; filename="${filename}"` where filename from metadata could contain CR/LF.
**Why overstated:** `buildProposalWorkbookFilename` (read in full during second pass) normalizes to `[a-zA-Z0-9]+` with `-` separator. It strips diacritics, non-ASCII chars, and special characters. CR/LF injection is impossible through this sanitizer.
**Evidence checked:** `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename.ts` — full source reads.
**Final treatment:** Severity downgraded to Low. Recommendation to prefer `filename*=UTF-8''...` (RFC 5987) remains valid for internationalization, not security.
**Residual risk:** None for injection. RFC 5987 compliance is a polish item.

### F-API1-02 — "Share-route public access" (Medium → Informational)

**Original claim:** Share routes accept a token; if token is leaked, anyone has read access. Medium severity.
**Why overstated:** This is the design intent of shared links. The HMAC + AES-256-GCM token provides 256-bit cryptographic security. Any shared-link system has this characteristic. Calling it a "Medium finding" implies a design flaw where there is none.
**Evidence checked:** `src/lib/publication/security.ts` — HMAC-SHA256 hashing, AES-256-GCM encryption.
**Final treatment:** Downgraded to Informational design note, not a finding. The compensating controls (password, rate limits, no-store) are sufficient.
**Residual risk:** Token leakage risk is inherent to shared-link systems. Mitigated by rotation capability.

### F-AUTH-06 — "Session resolution null handling" (Low → Informational)

**Original claim:** Session resolution never returns null without explicit handling — Low severity.
**Why overstated:** This is an engineering hygiene observation about TypeScript null-checking discipline, not a security vulnerability. The session resolution path is well-defined (dev bypass → real session). TypeScript strict mode catches unhandled nulls at compile time.
**Evidence checked:** `src/lib/auth/session.ts`, `tsc --noEmit` passes clean.
**Final treatment:** Downgraded to Informational. No security risk.
**Residual risk:** None.

### F-RL-07 — "No per-tenant DoS posture" (Medium → Low hardening)

**Original claim:** No per-workspace quota/cost ceiling — Medium severity.
**Why overstated:** The durable `security_rate_limit_events` table already provides per-token and per-IP scoping for public routes. Auth-protected routes are additionally scoped by authenticated user. Per-tenant quotas are a scaling/hardening concern, not a current vulnerability in a pre-launch product.
**Evidence checked:** `src/lib/publication/public-repository.ts` (rate limit checks), `src/lib/collaboration/invite-entry.ts` (invite rate limit), all share API route files.
**Final treatment:** Reclassified as hardening recommendation with Low severity.
**Residual risk:** None urgent. Per-tenant quotas become important at multi-tenant production scale.

### F-UPLOAD-06 — "Object key path traversal" (Medium → Low)

**Original claim:** Object key could be user-controllable — Medium severity.
**Why overstated:** Upload routes are auth-protected server-side. Object writes use service-role Supabase client. The user does not directly control the storage path. Path traversal through object keys requires first bypassing auth.
**Evidence checked:** Upload route files under `src/app/api/`.
**Final treatment:** Severity downgraded to Low.
**Residual risk:** Minimal. Verify storage bucket RLS policies as defense-in-depth.

### F-UPLOAD-07 — "No AV/malware scanning" (Medium → Low hardening)

**Original claim:** No AV scanning for attachments — Medium severity.
**Why overstated:** Attachments are component-library internal assets (PDF/XLS/XLSX), not user-forwarded files. They do not reach external consumers as part of any current workflow. The attack surface for malicious files is internal only.
**Evidence checked:** Attachment route, component-library schema.
**Final treatment:** Reclassified as hardening recommendation with Low severity.
**Residual risk:** Becomes relevant if attachments are forwarded in proposal packages.

### F-AI-07 — "No key rotation policy" (Medium → Low missing evidence)

**Original claim:** No documented key rotation for DEEPSEEK_API_KEY — Medium severity.
**Why overstated:** Key rotation is an operational procedure, not a code vulnerability. The key is loaded from env and can be rotated at the provider level without code changes. The absence of a documented policy is a process gap, not a Medium-security code finding.
**Evidence checked:** `.env.example`, `src/lib/ai/deepseek.ts`.
**Final treatment:** Reclassified as Low severity, missing-evidence category. Operational concern.
**Residual risk:** Key compromise window extended without rotation discipline.

### F-SHARE-13 — "Token rotation/revocation" (Medium → Low hardening)

**Original claim:** No token rotation or expiry enforcement — Medium severity.
**Why overstated:** Token rotation IS implemented in the shared-link manager (`src/lib/publication/actions.ts`). The public link manager can "rotate token" to create a new link. Revocation exists (link can be turned off). Expiry is not enforced but the HMAC token is computationally infeasible to brute-force.
**Evidence checked:** `src/lib/publication/actions.ts`, shared-link UI components.
**Final treatment:** Reclassified as hardening recommendation with Low severity.
**Residual risk:** Rotated tokens should invalidate old ones. Expiry enforcement adds defense-in-depth.

---

## Merged Findings

### F-CI-02, F-CI-03, F-CI-04 → Consolidated CI security gaps (High)

**Original:** Three separate High findings for SAST, SCA, and secret-scanning.
**Why merged:** These are all sub-items of the same CI/CD security gap — the pipeline lacks automated security gates. Creating three separate High findings inflates the apparent risk count.
**Final treatment:** Consolidated into a single High finding: **"CI pipeline lacks automated security gates (SAST, SCA, secret-scanning)."**
**Residual risk:** Same as original — all three gates are important but represent one remediation story.

### F-CI-01 → merged into consolidated CI finding

**Original:** `permissions:` not declared at workflow level — High.
**Why merged:** Also a CI pipeline gap. The `permissions: read-all` fix is a one-line change.
**Final treatment:** Sub-item under consolidated CI finding.

---

## Rewritten Findings

### F-SHARE-12 — "frame-ancestors / clickjacking" (Low → Info, corrected)

**Original claim:** "CSP not enumerated in full; if frame-ancestors is not 'none', the share surface can be embedded."
**Why rewritten:** The CSP in `next.config.ts` DOES include `frame-ancestors 'none'`. Verified from source. The original claim was based on incomplete enumeration.
**Evidence checked:** `next.config.ts` line 9: `"frame-ancestors 'none'"` in the CSP source list. Also confirmed by test `project-publication-security-headers.test.ts` line 13.
**Final treatment:** Rewritten as Informational (confirmed control). No finding — control exists.
**Residual risk:** None for clickjacking on share routes.

---

## Removed Findings

None completely removed. All original findings had at least some basis in the codebase, even where severity was overstated. No finding was proven wholly false.

---

## Summary

| Category | Count |
|---|---|
| Downgraded severity | 9 |
| Merged (consolidated) | 4 |
| Rewritten (corrected) | 1 |
| Removed entirely | 0 |
| Confirmed as-is | ~75 |
