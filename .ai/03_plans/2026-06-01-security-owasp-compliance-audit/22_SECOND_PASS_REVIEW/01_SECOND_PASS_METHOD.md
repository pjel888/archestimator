# 01 — Second-Pass Method

**Date:** 2026-06-01
**Repo path:** `/Users/philiplewis/archestimator`
**Branch:** `main`
**Commit hash:** `dc044465f5c20ca75c60cee6606717abf47eae41`
**First-pass audit folder reviewed:** `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/`

## Tools used

- **code-review-graph MCP tools:** `get_minimal_context`, `get_architecture_overview`, `semantic_search_nodes`, `query_graph`
- **grep (ripgrep):** Pattern searches across `src/`, `supabase/migrations/`, `next.config.ts`, `.github/workflows/`
- **read_file:** Direct inspection of key source files, migrations, configs, env contracts
- **shell_command:** Validation pipeline (`bun run type-check`, `bun run build`)
- **git:** `rev-parse`, `status --short --branch`
- **file system:** `find`, `ls`

## Commands run

### Verification commands
```bash
bun run type-check  # PASS — no errors
bun run build       # PASS — successful production build
```

### Discovery commands
```bash
git rev-parse HEAD
git status --short --branch
find .ai/03_plans -maxdepth 2 -type d | sort
find src/app/api -maxdepth 10 -type f | sort
```

### Evidence grep commands
All referenced in `10_SECOND_PASS_EVIDENCE_APPENDIX.md`. Key patterns:
- `service_role|SUPABASE_SERVICE_ROLE` — 80 matches across 37 files
- `dangerouslySetInnerHTML|innerHTML` — 8 matches in 3 files
- `rate.limit|rateLimit|limiter|Retry-After|429` — 140 matches across 33 files
- `Cache-Control|no-store` — 164 matches across 37 files
- `security definer` — 95 matches in 29 migration files
- `search_path` — 131 matches in 32 migration files
- `grant execute|grant select|revoke execute` — 265 matches in 44 files
- `assertSameOrigin|assertSameOriginPublicPost` — 54 matches in 12 files
- `CSP|Content-Security-Policy|frame-ancestors` — 17 matches in 5 files
- `localStorage|sessionStorage` — 52 matches in 19 files
- `NEXT_PUBLIC` — 63 matches in 34 files
- `zod|schema.safeParse|schema.parse|validate` — 203 matches in 39 files

## Commands not run and why

- `bun run test` — not run; test suite requires Supabase connection mocking setup
- `bun run test:dom` — not run; requires JS DOM environment with Supabase mocks
- `bun run test:e2e` — not run; requires service-role keys + linked Supabase + email delivery
- `bun run lint` — not run; design-system lint errors are expected and not security-relevant
- `bun audit` or `osv-scanner` — SCA tool not available locally; documented as gap
- Any command mutating Supabase state — explicitly prohibited per audit rules

## Documents reviewed

All 22 first-pass documents:
README.md, 00-executive-summary.md, 01-scope-and-methodology.md, 02-architecture-and-trust-boundaries.md, 03-authentication-and-session-management.md, 04-authorization-and-rls-coverage.md, 05-input-validation-and-output-encoding.md, 06-injection-and-template-vulnerabilities.md, 07-cryptography-and-secrets-management.md, 08-data-protection-and-privacy.md, 09-rate-limiting-and-dos-resilience.md, 10-third-party-and-supply-chain.md, 11-api-security-owasp-api-top10.md, 12-ai-llm-security.md, 13-file-upload-and-storage.md, 14-shared-link-publication-surface.md, 15-collaboration-invite-surface.md, 16-webhooks-and-external-callbacks.md, 17-error-handling-and-information-disclosure.md, 18-logging-monitoring-audit-trail.md, 19-secure-sdlc-and-ci-cd.md, 20-compliance-mapping-owasp-asvs.md, 21-remediation-roadmap.md

Also reviewed:
- `AGENTS.md`, `.ai/README.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `.ai/10_state/known-issues.md`, `.ai/06_specs/feature-inventory.md`, `README.md`, `DESIGN.md`
- `.env.example`, `.github/workflows/ci.yml`, `next.config.ts`

## Code areas reviewed

- All 18 API route files under `src/app/api/`
- All 29+ migration files with SECURITY DEFINER functions
- Service-role consumption points (37 files)
- Auth/session code (`src/lib/auth/`, `src/proxy.ts`)
- Publication/security code (`src/lib/publication/security.ts`)
- AI code (`src/lib/ai/`, `src/app/api/ai/`)
- Upload routes (`src/app/api/component-library/`, `src/app/api/projects/images/`)
- XLSX export route and filename sanitizer
- CSP configuration in `next.config.ts`
- `dangerouslySetInnerHTML` usage across `src/`
- `localStorage`/`sessionStorage` usage across `src/`

## Evidence standard

- **Confirmed:** Claim verified by reading actual code, config, or migration
- **Suspected:** Reasonable inference from architecture, not directly observed in code
- **Missing evidence:** Claim cannot be verified or disproved from available sources
- **Hardening:** Not currently a vulnerability but recommended defense-in-depth

## Limitations

- No runtime/dynamic testing
- No SCA database lookup for CVE verification
- No live Supabase project configuration inspection
- No E2E test execution
- Audit conducted against a dirty working tree (3 modified files)
- Code-review-graph semantic search returned zero results for some queries (keyword index may need rebuild)
- `exceljs` cell type (`text` vs default) could not be verified from source alone — requires runtime test with Excel
- `Secure` cookie attribute can only be confirmed in production deployment
- Vercel log scrubbing configuration not verifiable from repo

## How false positives and false negatives were handled

1. Every finding claim was checked against actual source code
2. Claims unsupported by evidence were downgraded or removed
3. Claims contradicted by evidence were marked as false positives
4. Material risks not in the first pass were added as new findings
5. Severity was recalibrated based on actual likelihood/impact, not generic labels
6. All corrections are documented in `02_FIRST_PASS_CORRECTION_LOG.md` and `04_FALSE_POSITIVES_AND_DOWNGRADES.md`
