# 009 — Browser Hardening: Invite no-store + Share CSP nonce pipeline + Request-derived Secure flag

> Closes `SEC-BROWSER-001`, `SEC-BROWSER-003`, `SEC-BROWSER-005`.

## unit_id
`UNIT-009` · **status:** `READY` · **priority:** P1 (before external `/share` and `/invite` traffic) · **effort:** M (the nonce pipeline is the bulk) · **implementation_risk:** MEDIUM (CSP change can break client scripts if nonces aren't threaded) · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** `NOT_REQUIRED`.

## requirements / findings
- Requirements: `SEC-009`.
- Findings: `SEC-BROWSER-001` (permissive enforced CSP), `SEC-BROWSER-003` (invite no-store missing), `SEC-BROWSER-005` (NODE_ENV-conditional Secure).

## goal
1. `/invite/:path*` returns `Cache-Control: no-store, private`.
2. `/share/:path*` CSP uses a per-request nonce pipeline; removes `'unsafe-inline'` and `'unsafe-eval'`.
3. Publication/session cookies set `Secure` whenever the request is HTTPS (not `NODE_ENV`-conditional).
4. (Optional hardening) Promote `/workshop/:path*` and `/invite/:path*` CSP from Report-Only to enforced after nonce pipeline is in place; add `report-to` endpoint.

## security_invariants
1. No `Cache-Control` gap on `/invite/:path*`.
2. CSP `script-src` does not include `'unsafe-inline'` or `'unsafe-eval'` on `/share/:path*`.
3. `Secure` cookie flag is set on every HTTPS response regardless of `NODE_ENV`.

## current_source_evidence
- `next.config.ts:260-269` — `/invite/:path*` headers block omits `Cache-Control`.
- `next.config.ts:20-47,203-218` — enforced `/share` CSP with `unsafe-inline`+`unsafe-eval`.
- `src/lib/publication/security.ts:370,539,558-559` — `secureCookie = NODE_ENV === "production" ? "; Secure" : ""`.
- `src/app/api/share/[token]/session/route.ts:27` — same pattern.

## affected_paths_and_resources
- `next.config.ts` (headers sections; CSP nonce pipeline).
- `src/lib/publication/security.ts` (Secure flag derivation).
- `src/app/api/share/[token]/session/route.ts` (same).
- `src/app/invite/[token]/sign-out/route.ts` (same).
- (Nonce pipeline requires middleware cooperation — `src/middleware.ts` + `src/lib/auth/request-proxy.ts`.)

## owned_paths
- `next.config.ts`
- `src/lib/publication/security.ts`

## dependencies
None locally. The nonce pipeline is a self-contained Next.js middleware feature.

## preconditions
Next.js 16 supports per-request nonce via middleware → headers. (Verify against `node_modules/next/dist/docs/` per AGENTS.md.)

## non_goals
- Replacing third-party scripts (Clarity, GA) with nonce-compatible versions — they will need `'nonce-...'` or explicit hash allowlisting. May require follow-up.
- Full CSP enforcement on `/workshop` — staged behind Report-Only first.

## implementation_sequence
1. **Invite no-store:** In `next.config.ts:260-269`, add `"Cache-Control": "no-store, private"` to the `/invite/:path*` headers block (mirror `/share/:path*`).
2. **Cookie Secure flag:** In `security.ts:370,539,558-559`, derive `secureCookie` from the request URL scheme (`new URL(request.url).protocol === "https:"`) rather than `NODE_ENV`. Plumb the request through or use a helper that checks `process.env.URL`/X-Forwarded-Proto.
3. **Share CSP nonce pipeline:**
   - In `src/middleware.ts` (`request-proxy.ts`), generate a per-request `crypto.randomUUID()` nonce; set it on a response header AND attach it to the request as a non-prefixed header for Next to consume.
   - In `next.config.ts` `/share` headers section, replace `'unsafe-inline' 'unsafe-eval'` with `'nonce-${nonce}'` (using the Next.js template syntax for nonce substitution).
   - Audit third-party script tags in `src/app/share/[token]/page.tsx` and any share components — add `nonce={nonce}` to each.
4. Run `bun run type-check` and (manually, browser) verify share pages still render. (Manual QA is a browser gate — requires explicit user authorization.)

## data_or_schema_changes
None.

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
If a script lacks the nonce, the browser blocks it (visible in console). Failure is loud — fix-forward by adding the nonce attribute.

## acceptance_criteria
1. `next.config.ts:260-269` includes `"Cache-Control": "no-store, private"` for `/invite/:path*`.
2. `/share` CSP does not contain `'unsafe-inline'` or `'unsafe-eval'` (source inspection).
3. `security.ts` cookie helpers derive `Secure` from request scheme, not `NODE_ENV` (source inspection).
4. `bun run type-check` passes.

## acceptance_evidence
Source/diff inspection + `type-check` exit 0. Manual browser QA of share page (TEST_TASK — requires explicit authorization) to confirm scripts still load.

## test_decision
`TEST_PROPOSAL` for invite no-store (`CHEAPEST_DECISIVE_EXISTING_TEST`). The CSP nonce pipeline requires browser QA — `TEST_TASK` if user authorizes.

## exact_test_proposal_if_any
Risk: invite token leaks via browser history/proxy cache. Cheapest decisive test: `bun x vitest run tests/vitest/invite/invite-cache-headers.test.ts` — GET `/invite/<token>` → assert response includes `Cache-Control: no-store, private`.

## authorization_boundaries
None for local edits. Browser QA requires user authorization.

## observability_or_audit_requirements
None.

## recovery_or_fix_forward
If the nonce pipeline breaks third-party scripts, restore Report-Only mode temporarily. Fix-forward by adding nonces to the affected scripts.

## conflict_and_concurrency_notes
None.

## completion_signal
All four acceptance criteria evidenced. `DONE`.

## next_unit_on_success
Any other unit.
