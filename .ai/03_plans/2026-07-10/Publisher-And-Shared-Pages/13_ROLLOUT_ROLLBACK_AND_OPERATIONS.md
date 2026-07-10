# 13 — Rollout, Rollback, And Operations

## Release Scope

This plan is **local implementation + browser-proven UX**. The following are
explicit release boundaries:

| Scope | Status | Boundary reason |
|---|---|---|
| Local implementation | In scope | All code changes, tests, local verification |
| Browser verification | In scope | Playwright/manual for UX claims |
| Local D1 migration | In scope | Apply migration 0050 to local D1 |
| Hosted D1 migration | **AUTH boundary** | Requires hosted D1 access |
| Production deploy | **AUTH boundary** | Requires deploy authorization |
| Hosted email delivery | **Not changed** | Existing Cloudflare Email pipeline |

No `wrangler deploy` or hosted mutation is performed by this plan.

## Rollout Strategy

### Phase 1: Security hardening (no UX change)
- SEC-001 through SEC-007: body-size limits, status codes, circuit breaker,
  comment pagination, snapshot reentrance, startup secrets, dead code removal.
- These are backward-compatible server-side changes with automated tests.
- **Risk:** Low. All changes are additive hardening.
- **Verification:** Full publication/share test suite passes.

### Phase 2: Data optimization
- DATA-001: FK constraints (migration 0050).
- DATA-002/perf: GROUP BY roster query optimization.
- **Risk:** Medium (migration). Requires orphan cleanup first.
- **Verification:** Local D1 migration applies; roster evaluator passes.

### Phase 3: Publisher UX redesign
- REQ-001 through REQ-008, UX-PUB-* : wizard, cards, pagination, terminology,
  dashboard CTA.
- **Risk:** Medium (primary manager surface). Existing drawer retained for
  advanced management.
- **Verification:** Browser proof of wizard flow, card layout, mobile.

### Phase 4: Shared link UX improvements
- UX-001 through UX-012: header, CTA, comments, print, currency, etc.
- **Risk:** Medium (primary client surface). Component modifications.
- **Verification:** Browser proof of all recipient-side improvements.

### Phase 5: Recipient inbox fixes
- UX-012: dead-end fix, all-or-nothing fix.
- **Risk:** Low.
- **Verification:** Unit + browser proof.

### Phase 6: Integration + full verification
- Run full `bun run validate` suite.
- Browser sweep of all surfaces.
- Plan pack validation.

## Rollback Plan

### Code rollback
- All changes are on the current branch. Git revert to pre-plan commit.
- No feature flags needed (changes are component-level, not behind a gate).
- **Exception:** The sidebar label change ("Publisher" → "Share") is a one-line
  revert if terminology causes confusion.

### Data rollback (migration 0050)
- FK constraints are additive. Rollback: `ALTER TABLE ... DROP CONSTRAINT ...`.
- The orphan cleanup (deleting orphaned rows) is irreversible but only affects
  rows that reference non-existent projects/workspaces (already meaningless).
- **Rollback SQL:**
  ```sql
  ALTER TABLE project_publications DROP CONSTRAINT fk_publications_workspace;
  ALTER TABLE project_publications DROP CONSTRAINT fk_publications_project;
  -- ... etc for each constraint
  ```

### Dependency rollback (qrcode)
- If the `qrcode` package causes issues: remove import, remove component, drop
  dependency from `package.json`. The QR code feature is optional (URL + copy is
  the primary path).

## Compatibility Window

- **No breaking API changes.** All existing API response shapes are preserved.
  Comment pagination adds optional fields (`hasMore`, `nextCursor`) — old clients
  ignoring them still work.
- **No breaking cookie changes.** Existing cookies keep their names/format. The
  preview cookie is new and additive.
- **No breaking URL changes.** `/workshop/publisher` and `/share/[token]` routes
  are unchanged. Query params (`?wizard=`, `?preview=`) are additive.

## Operations

### Monitoring (existing, preserved)
- Structured logging on all publication routes (IP-hashed).
- Audit events for publish/rotate/revoke/recipient mutations.
- Rate-limit events in `security_rate_limit_events`.
- Publication events in `project_publication_events`.

### New monitoring (in scope)
- Preview-mode event (`preview_started`) for adoption tracking — uses existing
  event infrastructure.

### Support
- No new support runbooks needed. The existing share/publication support model
  (token rotation, password reset, recipient re-invite) is unchanged.
- Terminology changes may require updating in-app help text and documentation —
  handle during implementation.

### Incident path
- If a publish mutation fails: the wizard's error banner shows the message;
  the manager can retry. The existing `runPublicationUpdate` error handling is
  preserved.
- If the share page fails to render: the existing `error.tsx` boundary catches it.
- If a rate limit is hit: the existing 429 + `Retry-After` response is preserved.

## Post-Release Proof (when hosted deploy is authorized)

These are **not** performed by this plan but are documented for the eventual
release:

1. Apply migration 0050 to hosted D1 (`wrangler d1 migrations apply`).
2. Verify hosted share page renders for a test publication.
3. Verify hosted publish wizard generates a working link.
4. Verify hosted email invitation sends and the recipient link works.
5. Monitor rate-limit events for the first 24 hours.

These steps require explicit hosted/deploy authorization beyond this plan's scope.
