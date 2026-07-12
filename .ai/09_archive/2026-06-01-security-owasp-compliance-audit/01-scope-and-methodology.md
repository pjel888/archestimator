# 01 — Scope and Methodology

## Scope

### In scope

- **Application code** in `src/` (Next.js App Router, route handlers, server components, libraries)
- **Data-layer migrations** under `supabase/migrations/` (RLS, RPC, audit, collaboration, share, AI)
- **Edge / middleware** in `src/proxy.ts`
- **Build / runtime config** in `next.config.ts`
- **CI/CD** in `.github/workflows/`
- **Env contract** in `.env.example`
- **Dependency manifest** in `package.json`

### Out of scope

- Production host / OS / container hardening
- Supabase Auth provider configuration (MFA, password policy, OAuth) — assumed to be set in Supabase dashboard
- Vercel dashboard settings beyond what is declared in `next.config.ts` and `src/proxy.ts`
- Third-party vendor controls (Resend, DeepSeek) beyond contractual posture
- Native / mobile clients (none in repo)
- Live penetration test, fuzzing, or dynamic analysis (read-only audit)
- Hardware security modules, key-management service (KMS) configuration
- Business continuity / disaster recovery

### Audit windows

- **Code at HEAD:** `dc044465f5c20ca75c60cee6606717abf47eae41` (branch `main`, 2026-06-01)
- **Uncommitted changes in working tree:** 3 modified files at audit time (not in scope of this audit, flagged in [21](./21-remediation-roadmap.md) §C)

## Methodology

### Standards

- OWASP Top 10:2025
- OWASP API Security Top 10:2023
- OWASP ASVS 5.0.0 (verification-level mapping only — no L1/L2/L3 commitment from this audit)
- CWE (used for finding-class tagging)
- STRIDE (informal, per trust boundary)

### Evidence collection

- Static read of source, migrations, configs, CI workflow
- Cross-reference of route handler code to its underlying RLS migration
- Cross-reference of public-route CSRF / rate-limit helpers
- Cross-reference of upload routes' validation helpers
- Grep across `src/` to confirm symbol presence/absence
- No execution, no network calls, no DB queries

### Tools used

- Local filesystem read
- `grep` (ripgrep) for symbol search
- `git` (read-only: `rev-parse`, `status`, `log`)
- Documentation references for OWASP standards

### Risk rating

Each finding uses:

- **Severity:** Critical / High / Medium / Low / Informational
- **Likelihood:** Low / Medium / High
- **Impact:** Low / Medium / High
- **CWE:** identifier where applicable
- **OWASP:** Top 10:2025 and/or API Top 10:2023 identifier
- **ASVS:** v5.0.0 chapter reference where applicable

### Excluded artefacts

- No raw secrets, API keys, tokens, hashes, or production credentials in any audit document
- Example values are placeholders (`<redacted>`, `re_webhook_verifier`)
- File contents are quoted in summary form; full source is referenced by path

### Limitations

- No dynamic / runtime testing
- No dependency-vulnerability database lookup (SCA gate) — package versions are reviewed for known-major-version posture only
- No static application security testing (SAST) tool output
- The audit does not assert that all migrations applied at HEAD — only that the migration files in the tree define the documented posture

### Naming conventions

- File paths in this document are relative to repo root unless absolute
- Symbol names match source-code identifiers exactly
- Migration filenames are referenced without `.sql` extension when discussing semantic intent
