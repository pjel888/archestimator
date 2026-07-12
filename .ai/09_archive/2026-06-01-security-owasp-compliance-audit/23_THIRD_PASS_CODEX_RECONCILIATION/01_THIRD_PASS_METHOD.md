# 01 — Third-Pass Method

**Date:** 2026-06-01
**Repo path:** `/Users/philiplewis/archestimator`
**Branch:** `main`
**Commit hash:** `dc044465f5c20ca75c60cee6606717abf47eae41`
**Audit folder reviewed:** `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/`

## Scope

The third pass is a **reconciliation pass** only. It takes the first-pass and second-pass audits and re-evaluates them against an independent Codex-style threat model that is biased toward:

- Cross-tenant data exposure (Critical if confirmed)
- IDOR / BOLA on workspace-scoped resources
- Secret and credential handling
- Auth bypass paths (proxy, middleware, dev bypass, service-role misuse)
- AI/ML threat model (LLM Top 10)
- Supply-chain / SCA / SAST / secret-scanning
- Production-readiness gate (must be a clean yes/no with conditions)

The third pass is **documentation only**. It does not modify source code, tests, migrations, configurations, CI workflows, or environment files. It may edit the existing first-pass and second-pass audit documents in-place to remove contradictions and align with the final posture.

## Tools used

- **`grep` / `ripgrep` (`rg`)** — Pattern searches across `src/`, `supabase/migrations/`, `next.config.ts`, `.github/workflows/`, `.env.example`
- **Direct file reads** — Inspection of key source files, migrations, configs
- **git** — `rev-parse`, `status --short --branch` (read-only)
- **MCP graph tools** — `code-review-graph` (preferred) and `gitnexus` (fallback) for symbol impact analysis
- **File system** — `find`, `ls`, `cat` via Read tool

## Commands run (all read-only)

### Verification commands (mirrored from second pass; results inherited)
```bash
bun run type-check  # PASS (per 22_SECOND_PASS_REVIEW/10_SECOND_PASS_EVIDENCE_APPENDIX.md)
bun run build       # PASS (per 22_SECOND_PASS_REVIEW/10_SECOND_PASS_EVIDENCE_APPENDIX.md)
```

### Discovery commands
```bash
git rev-parse HEAD                    # dc044465f5c20ca75c60cee6606717abf47eae41
git status --short --branch          # main, 3 modified files (out of audit scope)
find .ai/03_plans -maxdepth 2 -type d | sort
find src/app/api -maxdepth 10 -type f | sort
```

### Evidence grep commands (third-pass, focused on Codex claims)
All commands are read-only. Output summaries are in `19_THIRD_PASS_EVIDENCE_APPENDIX.md`.

| Pattern | Purpose | Verdict |
|---|---|---|
| `set search_path` | Verify every SECURITY DEFINER function sets `search_path` | 32 migration files confirmed |
| `SECURITY DEFINER` | Count SECURITY DEFINER functions | 32 migration files |
| `isDevAuthBypassRequest\|isDevAdminDatabaseBypassRequest` | Verify dev-bypass handling | 5 files, AI admin-DB rejection confirmed |
| `rate.?limit\|RateLimit\|checkRateLimit` in `src/app/api/ai/` | Verify AI endpoint rate limits | **No matches** — gap confirmed |
| `assertSameOriginPublicPost\|assertSameOrigin` in `src/app/api/share/` | Verify CSRF on public share | 5 POST routes + session route |
| `no-store` in `src/app/api/share/` | Verify no-store headers | 8 routes |
| `checkInviteResolutionRateLimit\|checkInviteContinueRateLimit\|checkInviteAcceptRateLimit` | Verify invite rate limits | 3 routes, all present |
| `dangerouslySetInnerHTML` | Find XSS injection points | 1 file (`ClarityScript.tsx`) — controlled |
| `bun.lock\|frozen-lockfile` in `.github/workflows/ci.yml` | Verify supply chain posture | `--frozen-lockfile` confirmed |
| `permissions:` in `.github/workflows/ci.yml` | Verify least-privilege CI | **Not set** — gap confirmed |
| `osv-scanner\|npm audit\|bun audit\|gitleaks\|trufflehog\|codeql\|semgrep` in `.github/workflows/ci.yml` | Verify SCA/SAST/secret-scanning | **No matches** — gap confirmed |

## Documents reviewed (all 22 first-pass + 11 second-pass)

### First-pass documents
`README.md`, `00-executive-summary.md`, `01-scope-and-methodology.md`, `02-architecture-and-trust-boundaries.md`, `03-authentication-and-session-management.md`, `04-authorization-and-rls-coverage.md`, `05-input-validation-and-output-encoding.md`, `06-injection-and-template-vulnerabilities.md`, `07-cryptography-and-secrets-management.md`, `08-data-protection-and-privacy.md`, `09-rate-limiting-and-dos-resilience.md`, `10-third-party-and-supply-chain.md`, `11-api-security-owasp-api-top10.md`, `12-ai-llm-security.md`, `13-file-upload-and-storage.md`, `14-shared-link-publication-surface.md`, `15-collaboration-invite-surface.md`, `16-webhooks-and-external-callbacks.md`, `17-error-handling-and-information-disclosure.md`, `18-logging-monitoring-audit-trail.md`, `19-secure-sdlc-and-ci-cd.md`, `20-compliance-mapping-owasp-asvs.md`, `21-remediation-roadmap.md`

### Second-pass documents
`22_SECOND_PASS_REVIEW/README.md`, `01_SECOND_PASS_METHOD.md`, `02_FIRST_PASS_CORRECTION_LOG.md`, `03_FINDINGS_VALIDATION_MATRIX.md`, `04_FALSE_POSITIVES_AND_DOWNGRADES.md`, `05_FALSE_NEGATIVES_AND_NEW_FINDINGS.md`, `06_SEVERITY_RECALIBRATION.md`, `07_EVIDENCE_GAP_REGISTER.md`, `08_OWASP_MAPPING_CORRECTIONS.md`, `09_ATTACK_SURFACE_DIFF.md`, `10_SECOND_PASS_EVIDENCE_APPENDIX.md`, `11_FINAL_SECURITY_POSTURE_RESTATEMENT.md`

### Project intelligence
- `AGENTS.md`, `.ai/README.md`, `.ai/10_state/current-state.md` (partial), `.ai/03_plans/README.md`
- `README.md`, `DESIGN.md` (referenced), `package.json` (referenced)

## Code areas reviewed (third-pass focus)

- `src/proxy.ts` — proxy auth gate (Codex: "API bypasses proxy")
- `src/lib/auth/redirects.ts` — redirect sanitizer
- `src/lib/auth/dev-auth-gate.ts` — triple-gate
- `src/lib/auth/dev-auth.ts` — dev-bypass email resolution
- `src/lib/publication/security.ts` — HMAC + AES-GCM + scrypt
- `src/lib/email/resend-webhooks.ts` — Resend placeholder
- `src/lib/ai/auth.ts` — AI auth (admin-DB rejection)
- `src/lib/ai/package-builder/draft-token.ts` — HMAC draft token
- `src/lib/ai/package-builder/apply.ts` — Apply flow
- `src/lib/ai/package-builder/schemas.ts` — custom validation
- `src/lib/ai/deepseek.ts` — DeepSeek client
- `next.config.ts` — CSP and security headers
- `.github/workflows/ci.yml` — CI pipeline
- `.env.example` — env contract
- `supabase/migrations/*.sql` — all 48 migrations reviewed (focus on SECURITY DEFINER + RLS + grants)

## Evidence standard

- **Confirmed:** Claim verified by reading actual code, config, or migration
- **Suspected:** Reasonable inference from architecture, not directly observed in code
- **Missing evidence:** Claim cannot be verified or disproved from available sources
- **Hardening:** Not currently a vulnerability but recommended defense-in-depth
- **Codex claim rejected:** Codex's claim, when verified, does not match the actual repo state
- **Codex claim restated:** Codex's claim is accurate; severity may be recalibrated
- **New from Codex:** Codex surfaced a risk not in the first/second pass

## How false positives and false negatives were handled

1. Every Codex claim was checked against actual source code
2. Claims unsupported by evidence were rejected (see `05_FALSE_POSITIVES_FROM_CODEX.md`)
3. Claims contradicted by evidence were marked as false positives
4. Material risks not in the first/second pass were added as new findings (see `06_FALSE_NEGATIVES_FROM_CODEX.md`)
5. Severity was recalibrated per the Codex production-readiness model (see `07_SEVERITY_RECALIBRATION.md`)
6. All existing audit documents were edited in-place where contradictions existed

## Limitations

- No runtime/dynamic testing
- No SCA database lookup for CVE verification
- No live Supabase project configuration inspection
- No E2E test execution
- No DAST, SAST tool output analyzed
- Code-review-graph and GitNexus MCP tools were available but not strictly required for this reconciliation pass — direct file reads and `rg` were sufficient and matched the second-pass evidence standard
- Audit conducted against a dirty working tree (3 modified files at audit time, same as second pass)
- `Secure` cookie attribute can only be confirmed in production deployment
- Vercel log scrubbing configuration not verifiable from repo
- HSTS header status depends on production deployment
