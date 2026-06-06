# Security, Performance, and Data Plan

## Auth and authorization concerns

- Use verified Supabase server auth (`getUser()` / request-scoped server client), not browser-supplied identity.
- Server must derive `user_id`, `accepted_at`, current version, and optional request metadata.
- Keep `/terms`, `/privacy`, `/login`, `/auth/callback`, `/beta/access-required`, `/invite`, `/share`, and static assets out of acceptance redirect loops.
- Do not rely on user-editable metadata claims for authorization.
- Dev auth bypass remains local-only and must not change production safety.

## Supabase/RLS concerns

- Never touch SlateCamp resources.
- Only ArchEstimator Supabase project `ebxxqidacheyapmmzavr` may be referenced if Supabase is relevant.
- New public tables need explicit grants and RLS; Supabase changelog says Data API grants are now an explicit deliberate layer.
- Recommended RLS:
  - `select` own rows only: `(select auth.uid()) = user_id`.
  - `insert` own rows only with `WITH CHECK` and valid current version constraint if possible.
  - no normal user update/delete for append-only history.
  - admin/support retrieval through server-only/platform-admin path, not broad client table reads.
- Update generated types after migration.

## Input validation

- Accept only known current Terms key/version from server constants.
- Accept only allowed contexts: `signup`, `first_protected_access`, `reacceptance`, `settings`, future `checkout`.
- Reject browser-supplied `user_id`, `accepted_at`, `ip`, `userAgent`, `contentHash` unless server recomputes/overrides.
- Bound metadata JSON shape and size.

## Secrets and environment variables

- Do not commit secrets.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser.
- Avoid adding new env vars unless feature flagging is required; if added, document names only and update provider checks separately.
- Do not claim linked Supabase/hosted/provider state from local-only evidence.

## Data privacy

- Store only data necessary to prove acceptance.
- Treat IP address and user agent as potentially personal data.
- Prefer hashed IP/user-agent following existing `account_security_events` approach, or omit unless counsel says raw evidence is required.
- Document retention/deletion policy for acceptance records; legal audit needs may conflict with deletion requests.
- Consider whether deletion requests preserve minimal legal audit records or anonymize them, subject to legal review.
- Privacy Notice must disclose acceptance evidence metadata if collected.

## Performance implications

- Terms page should not need DB per visitor if content is static.
- Acceptance check should be a single narrow user/version query.
- Avoid adding DB-heavy logic to `src/proxy.ts`; local Next docs say Proxy should not be used as full session management or slow authorization.
- Add indexes for latest acceptance lookup.
- Cache only safe static content; do not cache user-specific acceptance status publicly.

## Caching implications

- Public Terms/Privacy may be static/private-no-cache per current marketing page cache-control decisions; verify after implementation.
- Protected acceptance status is user-specific and must be private/no-store or request-bound.
- Re-acceptance after version change must not be masked by stale client cache.

## Database/query/migration concerns

- DB-first/app-second/gate-last rollout.
- Migration should include grants, RLS, policies, indexes, and comments.
- Existing 2026 Supabase Data API default-grant change means explicit grants must be in migration if the app uses Supabase JS Data API for the table.
- Local migration count drift exists in docs; use live migration list and CLI history, not stale README counts.

## Rate limits and concurrency

- Acceptance writes are low volume, but double-click/multi-tab can happen.
- Unique key `(user_id, terms_key, version)` and idempotent insert/upsert prevent duplicates.
- Consider basic POST rate limiting only if endpoint abuse becomes plausible; closed beta likely does not require new rate-limiter dependency.

## Failure modes

- Missing migration in linked environment: app gate fails; prevent by provider proof before enabling gate.
- RLS/grant missing: acceptance save/read fails; tests must catch.
- Legal version constant changed without content update: content hash/version mismatch; test must catch.
- Privacy copy not updated for metadata: legal/privacy gap; release checklist blocks.
- Support lookup overexposes records: admin path must be least-privilege and server-side.

## Compliance implications

- Final Terms and Privacy require qualified lawyer review.
- Consumer protection can limit overbroad disclaimers; do not promise zero liability.
- If paid subscriptions launch, recurring billing needs clear pre-charge disclosures, proof of consent, and cancellation at least as easy as signup per FTC guidance.
- AI/automation output disclosures must be updated if Ask Flip/package-builder/AI outputs are visible.
