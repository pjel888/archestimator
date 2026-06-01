# 10 — Second-Pass Evidence Appendix

Safe command output summaries and important grep/search findings from the second-pass review.

---

## Validation Commands

### Type Check
```bash
$ bun run type-check
$ tsc --noEmit
(exit 0 — no errors)
```

### Build
```bash
$ bun run build
├ ƒ /workshop/settings/profile
├ ƒ /workshop/settings/workspace
└ ƒ /workshop/templates
ƒ Proxy (Middleware)
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
(exit 0 — successful build)
```

### Git Status
```
## main...origin/main
 M src/components/workshop/ProjectEstimateMetadataStrip.tsx
 M tests/vitest/estimate-sheet-cost-inputs.test.tsx
 M tests/vitest/project-dashboard-ui.test.ts
?? .ai/03_plans/2026-06-01-security-owasp-compliance-audit/
```

Commit: `dc044465f5c20ca75c60cee6606717abf47eae41`

---

## Key Grep Results

### service_role references (80 matches, 37 files)
Verified that the service-role key is:
- Never in `NEXT_PUBLIC_*` variables
- Always loaded from `process.env.SUPABASE_SERVICE_ROLE_KEY`
- Used in controlled server-only paths
- Explicitly rejected by AI auth path (`src/lib/ai/auth.ts`)

### dangerouslySetInnerHTML (8 matches, 3 files)
- `src/components/landing/ClarityScript.tsx` — controlled analytics injection (2 matches)
- `tests/vitest/project-publication-page.test.tsx` — `container.innerHTML` in test assertions only (5 matches)
- `tests/vitest/share/reconstruct-share-tree.test.ts` — comment about safety verification (1 match)

**No XSS vector found.** The only `dangerouslySetInnerHTML` usage is for Microsoft Clarity analytics injection.

### Rate limiting (140 matches, 33 files)
Verified:
- `security_rate_limit_events` table with RLS + service-role-only grants
- `assertSameOriginPublicPost` on all public POST routes
- Circuit-breaker on comment route (P12)
- Durable rate limit on password attempts, comments, decisions, events, activity, snapshot
- Invite resolution/continue/accept rate-limited through `security_rate_limit_events`
- AI endpoints (`/api/ai/ask`, `/api/ai/package-builder`) do NOT invoke rate limiters — confirmed gap

### no-store headers (164 matches, 37 files)
- All 8 share API routes set `"Cache-Control": "no-store"`
- XLSX export route sets `"private, no-store"`
- Proxy strips `no-store` from marketing pages for BFCache compatibility
- Pending-invite route sets `"Cache-Control": "no-store"`

### SECURITY DEFINER functions (95 matches, 29 migration files)
Every SECURITY DEFINER function sets `search_path = public` or `search_path = public, pg_temp`. Verified:
- AI audit triggers (`set search_path = public`)
- Package builder apply RPC (`set search_path = public`)
- Collaboration RPCs (`set search_path = public, pg_temp`)
- Estimate sheet RPCs (`set search_path = public`)
- Component library RPCs (`set search_path = public`)

### Grant/revoke patterns (265 matches, 44 files)
Verified:
- `anon` can resolve invitations and post comments/decisions
- `authenticated` owns all CRUD operations
- `service_role` manages rate-limit events and publication opens
- AI apply RPCs explicitly `revoke from service_role` — strong design choice
- Trigger functions revoked from `anon` and `authenticated`

### CSRF defense (54 matches, 12 files)
- `assertSameOriginPublicPost` invoked on: comment, decision, events, password, activity, session routes
- Session route has its own `assertSameOrigin` function
- Checks Origin/Referer headers against site URL

### CSP configuration (17 matches, 5 files)
- `next.config.ts`: enforced CSP on `/share/:path*` and `/api/share/:path*`
- `frame-ancestors 'none'` in base CSP source list (verified line 9)
- Landing pages use `Content-Security-Policy-Report-Only`
- Tests verify CSP headers on share routes

### localStorage/sessionStorage (52 matches, 19 files)
- UI preferences: view mode, column sizing, tree width, last-seen timestamps
- Component library recents
- Offline comment queue in `sessionStorage`
- Active tab state in `sessionStorage`
- No secrets, tokens, or PII observed in storage values
- Comment text stored in `sessionStorage` for offline queue — potential XSS exposure

### NEXT_PUBLIC variables (63 matches, 34 files)
Verified only these are exposed:
- `NEXT_PUBLIC_SUPABASE_URL` — public Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (by design)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — Google Analytics ID
- `NEXT_PUBLIC_CLARITY_PROJECT_ID` — Microsoft Clarity ID
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` — for origin checking

No secrets exposed via `NEXT_PUBLIC_*`.

### Validation patterns (203 matches, 39 files)
- `validatePackageBuilderDraft` in `src/lib/ai/package-builder/schemas.ts`
- `validateTreeDraft`, `validateRowsTargetAreas`, `validateLinkedLibraryRows` in apply.ts
- `validatePriceOptions` in component-library actions
- `validateEstimateTreeHierarchy` in estimate-tree-data.ts
- Migration-side validation: `validate_estimate_node_tree`, `validate_estimate_template_tree`
- Manual validation in route handlers: content-length checks, magic-byte arrays, text length caps

### Filename sanitization
Read `buildProposalWorkbookFilename` in full:
```
normalize("NFKD")
.replace(/[\u0300-\u036f]/g, "")  // strip diacritics
.replace(/[^a-zA-Z0-9]+/g, "-")   // alphanumeric + hyphen only
.replace(/^-+|-+$/g, "")          // trim hyphens
```
Result: `[SafeStem]-proposal.xlsx`. CR/LF impossible.

### ExcelJS workbook builder
Read `create-proposal-workbook.ts` (full):
- Uses structured DTO (`ProposalExportModel`) as data source
- Cells formatted with `numFmt` for currency columns
- No explicit `type: "text"` on string columns
- No leading `'` prefix for formula-injection mitigation
- Source data is project/estimate metadata, not raw free-text user input

### CI workflow
Read `.github/workflows/ci.yml` (full):
```
name: CI
on: [pull_request, push: branches main, feat/**]
jobs: validate (ubuntu-latest)
  - checkout@v5
  - setup-bun@v2 (latest)
  - bun install --frozen-lockfile
  - bun run validate
  - bun run build
  - playwright install chromium
  - bun run test:e2e
  - bun run test:e2e:perf
```
- No `permissions:` block
- No SAST step
- No SCA step
- No secret scanning
- No dependency review
- Uses `--frozen-lockfile` (verified positive)

### Env contract
Read `.env.example` (full):
- `NEXT_PUBLIC_SUPABASE_URL=` (empty)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (empty)
- `ARCHESTIMATOR_DEV_AUTH_BYPASS=0`
- `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=0`
- `ARCHESTIMATOR_DEV_AUTH_EMAIL=philipjonlewis@gmail.com`
- `SUPABASE_SERVICE_ROLE_KEY=` (empty)
- `PROJECT_INVITE_ENTRY_ENABLED=false`
- `ARCHESTIMATOR_INVITE_TOKEN_PEPPER=` (empty)
- `DATABASE_URL=` (redacted example)

All secrets are server-only. Dev bypass is disabled by default. Invite is fail-closed.

---

## Tool Limitations

- Code-review-graph semantic search returned zero results for some queries (`rate_limit`, `dangerouslySetInnerHTML`, `service_role`). The graph may not index migration SQL files thoroughly, or the keyword index may need a rebuild.
- GitNexus tools not available in this session — used as fallback after code-review-graph.
- `bun run test` and `bun run test:dom` not run — require Supabase connection mocking.
- `bun run test:e2e` not run — requires service-role keys and linked Supabase.
- No Docker available for local Supabase verification.
- No SCA tool available locally for CVE checking.

---

## Skipped Checks and Why

| Check | Reason |
|---|---|
| E2E tests (Playwright) | Require service-role keys + linked Supabase + email delivery |
| Vitest/unit tests | Require Supabase connection mocking |
| Lint (ESLint + design-system) | Not security-relevant |
| SCA (osv-scanner/bun audit) | Tool not available locally |
| Supabase dashboard inspection | No dashboard access |
| Vercel dashboard inspection | No dashboard access |
| Resend dashboard inspection | No dashboard access |
| DeepSeek dashboard inspection | No dashboard access |
| Production deployment inspection | No production deployment |
