# 19 — Third-Pass Evidence Appendix

Read-only command output summaries and important grep/search findings from the third-pass review. All commands are non-mutating.

## Validation Commands (inherited from second pass)

### Type Check
```bash
$ bun run type-check
$ tsc --noEmit
(exit 0 — no errors)
```
Inherited from `22_SECOND_PASS_REVIEW/10_SECOND_PASS_EVIDENCE_APPENDIX.md`. Re-validated by inspection (no source code changed since second pass).

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
Inherited from second pass.

### Git Status (at third-pass time)
```
## main...origin/main
 M src/components/workshop/ProjectEstimateMetadataStrip.tsx
 M tests/vitest/estimate-sheet-cost-inputs.test.tsx
 M tests/vitest/project-dashboard-ui.test.ts
?? .ai/03_plans/2026-06-01-security-owasp-compliance-audit/22_SECOND_PASS_REVIEW/
?? .ai/03_plans/2026-06-01-security-owasp-compliance-audit/23_THIRD_PASS_CODEX_RECONCILIATION/
```

Commit: `dc044465f5c20ca75c60cee6606717abf47eae41`

The working tree has 3 modified files (out of audit scope) and 2 untracked audit folders (the second-pass and third-pass outputs).

## Third-Pass Key Grep Results

### `set search_path` (32 migration files confirmed)

```bash
$ rg "set search_path" supabase/migrations/ -c | head -50
```

Output (32 files): see `11_RLS_SECURITY_DEFINER_AUDIT_DELTA.md` for the full list. All 32 SECURITY DEFINER functions set `search_path = public` or `search_path = public, pg_temp`.

### `SECURITY DEFINER` (32 migration files)

```bash
$ rg "SECURITY DEFINER" supabase/migrations/ -c | head -50
```

Output: 32 files match. All 32 set `search_path`.

### `isDevAuthBypassRequest` / `isDevAdminDatabaseBypassRequest` (5 files)

```bash
$ rg "isDevAuthBypassRequest|isDevAdminDatabaseBypassRequest" src/ -l
src/proxy.ts
src/lib/ai/auth.ts
src/lib/auth/dev-auth-gate.ts
src/lib/auth/dev-auth.ts
src/lib/supabase/server.ts
```

- `src/lib/ai/auth.ts` rejects admin-DB bypass with `throw new Error("AI routes cannot use the local admin database bypass.")`
- `src/lib/ai/auth.ts` allows dev-auth-bypass, returning synthetic user `{ userId: "dev-auth-bypass", email: getDevAuthEmail() }`
- `src/proxy.ts` allows dev-auth-bypass through the proxy (consistent with AI route handling)
- `src/lib/auth/dev-auth-gate.ts` is the triple-gate (NODE_ENV + env var + localhost)
- `src/lib/supabase/server.ts` and `src/lib/auth/dev-auth.ts` are the bypass plumbing

### AI endpoint rate limit invocation (zero matches — gap confirmed)

```bash
$ rg "rate.?limit|RateLimit|checkRateLimit" src/app/api/ai/
(no output)
```

```bash
$ ls src/app/api/ai/ask src/app/api/ai/package-builder
src/app/api/ai/ask:
handler.ts
route.ts

src/app/api/ai/package-builder:
handler.ts
route.ts
```

```bash
$ rg "rate.?limit|RateLimit|checkRateLimit|consumeRateLimit" src/app/api/ai/ask/handler.ts src/app/api/ai/package-builder/handler.ts
(no output)
```

**Verdict:** AI endpoints invoke **no** rate limiter. Gap confirmed. SEC-20260601-3P-002.

### Share CSRF (`assertSameOriginPublicPost`) — 5 POST routes + 1 session route

```bash
$ rg "assertSameOriginPublicPost" src/app/api/share/ -c
src/app/api/share/[token]/events/route.ts:2
src/app/api/share/[token]/password/route.ts:2
src/app/api/share/[token]/activity/route.ts:2
src/app/api/share/[token]/comment/route.ts:2
src/app/api/share/[token]/decision/route.ts:2
```

5 POST routes have `assertSameOriginPublicPost`. Session route has its own `assertSameOrigin`.

### Share `no-store` — 8 routes

```bash
$ rg "no-store" src/app/api/share/ -l
src/app/api/share/[token]/session/route.ts
src/app/api/share/[token]/events/route.ts
src/app/api/share/[token]/decision/route.ts
src/app/api/share/[token]/route.ts
src/app/api/share/[token]/unsubscribe/route.ts
src/app/api/share/[token]/comment/route.ts
src/app/api/share/[token]/activity/route.ts
src/app/api/share/[token]/password/route.ts
```

All 8 share API routes set `no-store`.

### Invite rate limits — 3 routes

```bash
$ rg "checkInviteResolutionRateLimit|checkInviteContinueRateLimit|checkInviteAcceptRateLimit" src/app/invite/
src/app/invite/[token]/continue/route.ts:  checkInviteContinueRateLimit,
src/app/invite/[token]/continue/route.ts:  const rateLimit = await checkInviteContinueRateLimit({ rawToken, request });
src/app/invite/[token]/page.tsx:  checkInviteResolutionRateLimit,
src/app/invite/[token]/page.tsx:  const rateLimit = await checkInviteResolutionRateLimit({ rawToken, headers: requestHeaders });
src/app/invite/[token]/accept/route.ts:  checkInviteAcceptRateLimit,
src/app/invite/[token]/accept/route.ts:  const rateLimit = await checkInviteAcceptRateLimit({
```

All 3 invite routes are rate-limited.

### `dangerouslySetInnerHTML` (1 file — ClarityScript)

```bash
$ rg "dangerouslySetInnerHTML" src/ -l
src/components/landing/ClarityScript.tsx
```

Single controlled usage for Microsoft Clarity analytics. No XSS vector.

### CI workflow gaps (verified)

```bash
$ rg "permissions:" .github/workflows/ci.yml
(no output)
```

```bash
$ rg "osv-scanner|npm audit|bun audit|gitleaks|trufflehog|codeql|semgrep" .github/workflows/ci.yml
(no output)
```

```bash
$ rg "frozen-lockfile" .github/workflows/ci.yml
1:  bun install --frozen-lockfile
```

- No `permissions:` block (F-CI-01, gap confirmed)
- No SAST/SCA/secret-scanning (F-CI-02/03/04, gap confirmed)
- `--frozen-lockfile` IS used (FP-20260601-3P-005, Codex claim rejected)

### Proxy `/api/*` short-circuit

```bash
$ rg "pathname.startsWith" src/proxy.ts
```

`src/proxy.ts:33` — `pathname.startsWith("/api")` returns `NextResponse.next({ request })` immediately. Verified in `src/proxy.ts` direct read.

### Resend placeholder

```bash
$ rg "new Resend" src/lib/email/resend-webhooks.ts
```

`src/lib/email/resend-webhooks.ts:40` — `const resend = new Resend("re_webhook_verifier");` Verified by direct read.

### HSTS header

```bash
$ rg "Strict-Transport-Security" next.config.ts
(no output)
```

HSTS not set in `next.config.ts`. EG-20260601-3P-002.

## Tool Limitations

- Code-review-graph MCP tools and GitNexus MCP tools were available but not strictly required for this reconciliation pass — direct file reads and `rg` were sufficient and matched the second-pass evidence standard.
- Same limitations as the second pass: no runtime testing, no SCA database lookup, no live Supabase inspection, no E2E execution, no SCA tool output analyzed.
- Audit conducted against the same dirty working tree as the second pass (3 modified files at audit time, all out of scope).

## Skipped Checks and Why

| Check | Reason |
|---|---|
| `bun run type-check` | Inherited from 2P (PASS) |
| `bun run lint` | Not security-relevant |
| `bun run test` | Requires Supabase connection mocking |
| `bun run test:dom` | Requires JS DOM environment with Supabase mocks |
| `bun run test:e2e` | Requires service-role keys + linked Supabase + email delivery |
| `bun run build` | Inherited from 2P (PASS) |
| `bun audit` / `osv-scanner` | SCA tool not available locally; documented as gap |
| Supabase dashboard inspection | No dashboard access |
| Vercel dashboard inspection | No dashboard access |
| Resend dashboard inspection | No dashboard access |
| DeepSeek dashboard inspection | No dashboard access |
| Production deployment inspection | No production deployment |
| Any command mutating Supabase state | Explicitly prohibited per audit rules |

## Third-Pass Cross-References

- README.md — third-pass index
- 01_THIRD_PASS_METHOD.md — method and tools
- 02_CODEX_THREAT_MODEL_INVENTORY.md — 41 Codex claims with verdicts
- 03_FIRST_SECOND_PASS_CORRECTION_DELTA.md — what changed since second pass
- 04_FINDING_RECONCILIATION_MATRIX.md — claim-to-finding mapping
- 05_FALSE_POSITIVES_FROM_CODEX.md — 5 rejected Codex claims
- 06_FALSE_NEGATIVES_FROM_CODEX.md — 5 new third-pass findings
- 07_SEVERITY_RECALIBRATION.md — per-finding severity changes
- 08_EVIDENCE_GAP_REGISTER_DELTA.md — 4 new + 2 closed evidence gaps
- 09_ATTACK_SURFACE_DELTA.md — surface diff
- 10_OWASP_API_TOP10_DELTA.md — API Top 10 corrections
- 11_RLS_SECURITY_DEFINER_AUDIT_DELTA.md — RLS reconfirmation
- 12_AI_LLM_THREAT_MODEL.md — AI threat model
- 13_SHARE_PUBLICATION_THREAT_MODEL.md — share threat model
- 14_INVITE_COLLABORATION_THREAT_MODEL.md — invite threat model
- 15_WEBHOOK_THREAT_MODEL.md — webhook threat model
- 16_CSP_HEADER_THREAT_MODEL.md — CSP/header threat model
- 17_RATE_LIMITING_THREAT_MODEL.md — rate limiting threat model
- 18_PRODUCTION_READINESS_GATE.md — final gate with promotion conditions
