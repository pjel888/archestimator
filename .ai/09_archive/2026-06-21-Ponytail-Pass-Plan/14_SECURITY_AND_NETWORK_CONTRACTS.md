# 14 — Security And Network Contracts

**Date:** 2026-06-21 · **Status:** REQUIRED GATES FOR SECURITY-SENSITIVE PLAN ITEMS

This document captures the security, database, and network invariants that future implementation agents must satisfy before applying Ponytail cuts. Ponytail can remove over-build, but it must not remove auth, RLS, validation, audit, rate limits, or provider/network controls.

## Tier 2 server-action invariant checklist

Run this checklist before any T2.3, T2.6, T2.7, T3.6, or T3.7 diff that centralizes helpers or access checks.

| Invariant | Required proof |
|---|---|
| Actor | Test identifies signed-out, wrong-workspace, viewer, editor, manager/admin, and service-role cases as applicable. |
| Required role | The helper name and tests state the minimum role for read/write/delete. |
| Scope | Workspace, project, publication, library folder, component, estimate, or share-link scope is explicit. |
| RLS expectation | Tests prove forbidden cross-workspace access is denied before mutation. |
| Service-role boundary | Service role is never used to bypass user authorization; any service-role use is narrowed and audited. |
| Rate-limit key | Key includes actor and target scope where needed; anonymous public routes have separate keys. |
| Deny before mutate | Negative tests assert no DB mutation occurs on denied requests. |
| Audit/security tests | Existing tests are retained or updated, not deleted to make a refactor pass. |

## Public-share route contract

Before deleting, simplifying, or refactoring any `src/app/api/share/[token]/*` route, prove:

1. Valid token returns only the intended public data.
2. Invalid, expired, revoked, and malformed tokens deny consistently.
3. Password and recipient/session requirements are enforced before data access.
4. `Cache-Control` is `no-store` or the intended public-cache policy is documented.
5. Comments, events, decisions, and unsubscribe actions validate body shape and rate limits.
6. Anonymous write paths have abuse limits.
7. Unsubscribe token authority cannot act on a different recipient/share link.
8. Email/server indirect callers are checked; absence of a browser client caller is not enough to delete a route.

Target tests include `project-publication-comments`, `project-publication-decision`, `project-publication-activity`, `activity-security`, and route-specific share tests.

## AI keep-hidden or cut contract

If SF.1 is **kept hidden**:

- Disabled flags deny direct route access.
- Enabled routes require authentication and workspace/project scope.
- Rate limits and input-size limits stay active.
- Prompt-injection/data-exfiltration guard tests stay active.
- Provider secrets remain env-only.
- No provider network calls occur when flags are false.
- Audit events are retained for any allowed provider call.

If SF.1 is **cut**:

- Remove UI/routes/libs only after a file-by-file delete/keep matrix is recorded.
- Keep AI audit tables (`ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`) unless a separate database migration is explicitly scoped.
- Keep security-contract tests or replace them with tests proving the routes no longer exist/cannot be called.
- Confirm provider env vars/secrets are not modified by the code cleanup.

## Analytics/CSP/network contract for T1.3

The `@next/third-parties` -> `next/script` swap must prove:

1. CSP `script-src` and `connect-src` allow only the intended Google endpoints.
2. If CSP nonce/hash is active, inline script handling is compatible.
3. GA ID comes from an allowlisted env path and is escaped before insertion.
4. No GA/Clarity scripts fire on share/publication routes.
5. No analytics request fires before consent.
6. Payloads do not include project IDs, share tokens, recipient emails, estimate names, or user-entered cost content.
7. `window.gtag` remains a function after consent so experiment tracking works.

## T3.5 sanitizer contract

`sanitize-recipient-text.ts` is a trust boundary used by share route handlers. Future implementation must:

- Use a server-safe sanitizer path: DOMPurify with existing `jsdom`, or an isomorphic sanitizer.
- State the exact output context: plain text for recipient display/copy, not executable HTML.
- Enforce length limits before persistence/rendering.
- Test raw, encoded, double-encoded, case-variant, SVG, URL, event-handler, nested-tag, and long-payload cases.
- Prove sanitized output is never rendered as executable HTML.

## Database and provider boundary

This plan pack does not authorize production/provider mutations. Future implementation remains inside the Archestimator project boundary. If a future wave touches Supabase/Postgres schema, RLS, grants, RPCs, triggers, or seed/test data, it must use the standing Archestimator project `ebxxqidacheyapmmzavr` mandate and document migration/rollback separately.

## Security-aware rollback

For security-sensitive cuts, `git revert` is necessary but not sufficient. Also verify:

1. Disabled feature flags return to safe defaults.
2. Audit/security tests remain present.
3. No public route reappears without auth/token checks.
4. Provider/env secrets are unchanged.
5. Retained audit/data tables still have their expected behavior.
