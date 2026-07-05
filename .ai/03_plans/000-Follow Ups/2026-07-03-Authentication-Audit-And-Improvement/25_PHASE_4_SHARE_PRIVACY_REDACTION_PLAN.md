# 25 - Phase 4 Share Privacy And Redaction Plan

**Date:** 2026-07-04
**Status:** First local implementation slice complete for WP1-WP5; hosted/legal proof remains open.

## Objective

Turn the Phase 4 share/privacy gate in `11_IMPLEMENTATION_PLAN.md` into a source-grounded implementation slice: prove app auth and public share authority are not interchangeable, tighten share route CSRF/no-store regressions where existing coverage is thin, redact tokenized share/invite/auth evidence from diagnostics, and record retention/DSAR/breach handling decisions for auth-adjacent artifacts.

## Non-Goals

- No hosted Cloudflare Worker, D1, R2, Durable Object, Email, or browser proof is claimed by this local plan.
- No schema migration is authorized unless WP5 finds a concrete missing D1 field/index that cannot be handled by existing tables.
- No product or legal finalization is claimed; retention/DSAR/breach policy remains a beta-stage engineering runbook until legal review.
- No change to the public share UX, password semantics, recipient email workflow, or Better Auth session model is intended.

## Current Evidence

| Evidence | Result |
|---|---|
| `src/lib/auth/request-proxy.ts` | `/workshop` is protected by Better Auth identity resolution; `/share` is public and marked sensitive/no-store. The localhost development shortcut recognizes only `better-auth.session_token` and `__Secure-better-auth.session_token`, not share cookies. |
| `src/app/api/share/[token]/route.ts` | Password-protected snapshot reads require a signed `ae_publication_access_*` cookie; Better Auth cookies are not consulted. |
| `src/app/api/share/[token]/session/route.ts` | Recipient session start requires recipient token verification and, for password-protected publications, an existing signed publication-access cookie. Successful sessions set separate `shared_link_session_*` and `_ok` cookies. |
| `src/app/api/share/[token]/password/route.ts` | Password unlock requires same-origin public CSRF before verification and sets only the signed publication-access cookie on success. |
| `src/lib/publication/security.ts` | Publication-access cookies, shared-link session cookies, view tokens, and public CSRF tokens use separate names and signed payloads. |
| `tests/vitest/share-no-store-invariants.test.ts` | Share API route files and the tokenized share page are guarded as dynamic/no-store by static source tests. |
| `tests/vitest/project-publication-route.test.ts` and `tests/vitest/project-publication-page.test.tsx` | Existing tests cover token-scoped snapshot access, password gate, signed access cookie, event/password CSRF, recipient session POST/GET/DELETE, no-store headers, and raw recipient-token avoidance in session cookie headers. |
| `tests/vitest/project-publication-security.test.ts` | Helper tests cover same-origin public GET, same-origin public POST, cross-origin rejection, signed publication-access cookies, and password hashing. Missing-origin and mismatched CSRF cases need explicit assertions. |
| `src/lib/observability/redact.ts` and `src/app/api/internal/client-error/route.ts` | Logs redact common token query parameters, emails, bearer/JWT values, and client error query strings. They do not yet explicitly redact tokenized `/share/<token>` or invite/auth callback path segments in diagnostic strings. |
| `migrations/0014_publication_shared_links.sql` | D1 publication tables already include token hash, encrypted token, password hash, publication events with hashed IP/UA columns, recipient token hash, comments, responses, shared-link events, and digest logs. |
| `20_CREDENTIAL_MATERIAL_TAXONOMY.md` | Auth/session/invite/publication recipient material is classified, but Phase 4 retention/DSAR/breach handling decisions remain open. |

## Work Packages

### WP1 - Viewer/App Session Non-Interchangeability

**Risk covered:** Better Auth session bypasses share controls, or share viewer cookies satisfy app auth.

**Authorized local tests/source:**
- Extend `tests/vitest/auth-proxy.test.ts` to prove `shared_link_session_*`, `shared_link_session_*_ok`, `ae_publication_access_*`, and `ae_publication_csrf` cookies do not trigger the `/workshop` localhost Better Auth shortcut and still route through Better Auth identity lookup.
- Add or extend a share route test to prove a Better Auth session cookie alone cannot unlock a password-protected public snapshot and cannot create a recipient session when publication password access is required.
- Keep the existing separation: no app role or Better Auth identity is introduced into public share route authority.

**Acceptance criteria:**
- Viewer/share cookies never mark a protected workshop request as auth verified.
- Better Auth cookies never satisfy `hasPublicationAccessCookie`.
- Password-protected recipient session creation returns `423` without a signed publication-access cookie, even when a Better Auth session cookie is present.

### WP2 - Public Share CSRF And No-Store Proof

**Risk covered:** Cross-site mutation or cached share-token response.

**Authorized local tests/source:**
- Extend `tests/vitest/project-publication-security.test.ts` for missing `Origin`, missing CSRF cookie, missing CSRF header, and mismatched cookie/header cases on `assertSameOriginPublicPost`.
- Keep `tests/vitest/share-no-store-invariants.test.ts` as the static no-store/dynamic contract for share API and page files.
- Add route-level tests only if helper-level proof misses a route-specific branch.

**Acceptance criteria:**
- Public POST/DELETE helpers require present same-origin `Origin` plus matching `ae_publication_csrf` cookie/header.
- Share API/page sources remain dynamic/no-store and avoid public/s-maxage cache headers.

### WP3 - Tokenized Path And Evidence Redaction

**Risk covered:** Logs, diagnostics, evidence, analytics, or error reports leak raw share/invite/auth state tokens, cookies, emails, or recipient URLs.

**Authorized local tests/source:**
- Extend `src/lib/observability/redact.ts` so diagnostic strings redact tokenized `/share/<token>`, `/invite/<token>`, `/api/share/<token>`, and auth callback query material while preserving route shape.
- Use the same redaction from `src/app/api/internal/client-error/route.ts` path normalization so client error records cannot retain raw share path tokens.
- Extend `tests/vitest/redact.test.ts` and `tests/vitest/client-error.test.ts` for share path, recipient/rt/state/code query parameters, emails, bearer/JWT material, and control characters.
- Do not redact already-static route templates such as `/api/share/[token]/comment`.

**Acceptance criteria:**
- Redaction tests prove raw share token, recipient token, invite token, OAuth state/code, bearer values, and emails do not appear in logged strings or client-error records.
- Diagnostic output keeps useful shape such as `/share/[REDACTED_TOKEN]` and `?[REDACTED_QUERY]`.

### WP4 - Privacy, Retention, DSAR, And Breach Runbook

**Risk covered:** Auth, invite, publication recipient, audit, and support artifacts have unclear deletion/export/retention handling.

**Authorized local docs:**
- Update `20_CREDENTIAL_MATERIAL_TAXONOMY.md` with beta-stage retention/rotation/deletion guidance for Better Auth sessions, OAuth state, invite tokens, publication access/session cookies, encrypted publication tokens, recipient token hashes, audit rows, raw email, and IP/UA hashes.
- Update `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` with a practical DSAR workflow: identity verification, scoped discovery/export, delete/anonymize decisions, exception log, deadline tracking, and owner/legal handoff.
- Update `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` or `14_RISK_REGISTER.md` with a breach workflow: awareness timestamp, triage, containment, affected-data map, notification decision, evidence preservation, and 72-hour GDPR clock where applicable.

**Acceptance criteria:**
- Retention/DSAR/breach decisions are documented as beta-stage engineering policy or explicitly flagged for owner/legal review.
- No raw secrets, tokens, or provider credentials are added to evidence docs.

### WP5 - D1 Publication Schema Reconciliation

**Risk covered:** Phase 4 plans persistence changes against stale or nonexistent publication schema assumptions.

**Authorized local action:**
- Reconcile the current D1 schema by reading `migrations/0014_publication_shared_links.sql`, later D1 migrations, and `src/lib/publication/d1-store.ts`.
- Document whether Phase 4 needs a new migration. Current discovery indicates no schema change is required for WP1-WP4 because publication tokens are hashed/encrypted, recipient tokens are hash-only, events store hashed IP/UA, and session/access cookies are stateless signed cookies.

**Acceptance criteria:**
- If no migration is needed, record that decision with the source evidence.
- If a migration is needed, stop and create a new migration-scoped plan before editing schema.

## Implementation Order

1. WP1 tests first: app/share authority separation.
2. WP2 helper coverage for missing-origin and CSRF mismatch cases.
3. WP3 redaction helper and client-error path normalization tests.
4. WP4 documentation updates.
5. WP5 schema reconciliation note; only plan a migration if source evidence requires it.

## Validation Plan

Run the smallest checks that prove this phase:

```bash
bunx vitest run --maxWorkers=1 tests/vitest/auth-proxy.test.ts tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-page.test.tsx
bunx vitest run --maxWorkers=1 tests/vitest/project-publication-security.test.ts tests/vitest/share-no-store-invariants.test.ts
bunx vitest run --maxWorkers=1 tests/vitest/redact.test.ts tests/vitest/client-error.test.ts
git diff --check
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
```

Skip browser/Playwright proof unless an interaction or layout claim cannot be proven through route/helper tests. This phase is primarily server-route, cookie, CSRF, and logging behavior.

## Exit Criteria

- Tests explicitly prove share/viewer cookies cannot satisfy app auth and app auth cookies cannot bypass password-protected share access/session creation.
- Public share POST/DELETE CSRF helper contracts cover missing origin, cross-origin, missing token, and mismatched token cases.
- Diagnostic/client-error logs redact tokenized share/invite/auth material while preserving useful route shape.
- Privacy/retention/DSAR/breach handling decisions are documented or explicitly marked as owner/legal review items.
- D1 publication schema status is reconciled; no schema edit proceeds without a migration-scoped plan.

## Implementation Evidence

Status: first local slice implemented and verified on 2026-07-04.

Changed source/test/docs surface:
- `src/lib/observability/redact.ts`
- `tests/vitest/auth-proxy.test.ts`
- `tests/vitest/project-publication-route.test.ts`
- `tests/vitest/project-publication-page.test.tsx`
- `tests/vitest/project-publication-security.test.ts`
- `tests/vitest/redact.test.ts`
- `tests/vitest/client-error.test.ts`
- `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`
- `14_RISK_REGISTER.md`
- `17_FINAL_READINESS_REVIEW.md`
- `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`
- `20_CREDENTIAL_MATERIAL_TAXONOMY.md`

Green evidence:
- `bunx vitest run --maxWorkers=1 tests/vitest/redact.test.ts tests/vitest/client-error.test.ts tests/vitest/project-publication-security.test.ts` passed (`3` files / `26` tests).
- `bunx vitest run --maxWorkers=1 tests/vitest/auth-proxy.test.ts tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-page.test.tsx` passed (`3` files / `96` tests).
- `bunx vitest run --maxWorkers=1 tests/vitest/share-no-store-invariants.test.ts` passed (`1` file / `11` tests).
- `git diff --check` passed.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check` passed.

D1 schema reconciliation:
- `migrations/0014_publication_shared_links.sql` already includes `project_publications`, `project_publication_events`, `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`, and `publication_digest_log`.
- Publication raw tokens are stored as `token_hash` plus `encrypted_token`; recipient tokens are stored as `recipient_token_hash`; event rows use metadata plus hashed IP/UA fields.
- No Phase 4 schema migration is required for the WP1-WP4 local slice. A future retention/purge implementation may need its own migration-scoped plan if exact purge windows or tombstone fields are chosen.

Validation limits:
- This is local source/test/docs proof only.
- It does not claim hosted Cloudflare Worker behavior, production D1 row proof, browser proof, deployment, provider mutation, hosted log spot checks, or legal/privacy finalization.
