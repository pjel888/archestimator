# Architecture and Design Plan

## Proposed approach

Implement a versioned legal Terms system around three separable layers:

1. **Legal content source:** reviewed Terms content with stable version id, effective date, summary, and Privacy Policy link.
2. **Acceptance evidence:** append-only Supabase acceptance records tied to authenticated user id and version metadata, with RLS and optional privacy-minimized request metadata.
3. **User flow enforcement:** post-auth/protected-app acceptance gate that keeps public legal/auth/invite/share routes reachable and avoids slow broad Proxy authorization.

This plan prefers a static versioned content source plus database acceptance records for the initial implementation. Database-driven legal copy/CMS can be deferred until ArchEstimator needs non-engineering legal operations.

## Why this fits ArchEstimator

- The app is closed beta, invite-only, and no-payment; static reviewed Terms is simpler and safer than a legal CMS.
- Current `/terms` and `/privacy` pages already exist as public routes and can be upgraded without adding route families.
- Supabase Auth already provides a stable user id and SSR server client pattern.
- Existing audit patterns hash request metadata and favor metadata-only audit rows.
- Existing design system demands compact, reusable app/workshop UI rather than ad hoc modal styling.

## RALPLAN-DR summary

### Principles

1. Legal enforceability support is a product/technical evidence problem, not a promise of absolute liability elimination.
2. Acceptance proof must be tied to authenticated user identity and immutable version metadata.
3. Privacy minimization applies even to legal evidence; collect only what counsel/product can justify.
4. Gating must fail closed for protected app data while never locking users out of Terms/Privacy/help routes.
5. Keep the first implementation boring: static reviewed content, append-only acceptance history, RLS, tests.

### Decision drivers

1. Stronger legal posture than passive browsewrap.
2. Low-risk closed-beta rollout with existing users and provider proof boundaries.
3. Supabase/RLS correctness and future billing compatibility.

### Viable options

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Static versioned content + DB acceptance | Simple, reviewable diff, easy rollback, aligns with closed beta. | Legal copy changes need deploy. | **Recommended first implementation.** |
| DB/CMS-driven Terms versions | Legal/admin can update copy without deploy. | Adds admin security, content workflow, rendering trust, rollback complexity. | Reject for first slice; revisit after paid/public launch. |
| Pre-auth login notice only | Minimal UI change. | Weak proof; not tied to user id; no re-acceptance audit. | Reject for enforceable acceptance. |
| Proxy-level hard gate | Central route enforcement. | Next docs warn Proxy not for slow full auth/data; DB checks in proxy risk latency/loops. | Use only optimistic redirect if measured; prefer protected server boundary. |

### ADR

**Decision:** Plan static reviewed Terms content with append-only Supabase acceptance evidence and a post-auth/protected-app gate.
**Drivers:** Legal proof, user identity binding, closed-beta simplicity, RLS safety.
**Alternatives considered:** Passive browsewrap login copy, DB/CMS legal copy, proxy-only DB authorization.
**Why chosen:** It gives stronger acceptance evidence while minimizing runtime and operational risk.
**Consequences:** Requires migration/type update and careful existing-user rollout.
**Follow-ups:** Legal copy approval, privacy decision on metadata, exact gate location, RLS tests, support retrieval design.

## Files likely to change in future implementation

### Content/routes/UI

- `src/app/terms/page.tsx` — render reviewed versioned Terms and metadata.
- `src/app/privacy/page.tsx` — link/version compatibility if Privacy copy changes.
- `src/app/login/page.tsx` — keep notice links; optionally add explicit pre-auth checkbox only if product/legal wants it.
- `src/app/workshop/page.tsx` or a protected layout/shell — acceptance gate after auth.
- `src/app/workshop/settings/page.tsx` or `src/app/workshop/settings/profile/page.tsx` — legal/acceptance status card.
- Potential new route: `src/app/workshop/legal/terms/page.tsx` or `src/app/workshop/terms/accept/page.tsx` if page-based gate is chosen.
- Potential components under `src/components/workshop/` or `src/components/ui/`: `TermsAcceptancePanel`, `LegalLinkList`, `TermsVersionBadge`.
- Potential content module: `src/lib/legal/terms.ts` or `src/content/legal/terms-of-service.ts`.

### Data/API/server

- New Supabase migration under `supabase/migrations/` created with `supabase migration new`.
- `src/lib/supabase/types.ts` generated type update.
- Potential repository/action: `src/lib/legal/terms-acceptance.ts` or `src/lib/legal/actions.ts`.
- Potential route handler: `src/app/api/legal/terms-acceptance/route.ts` only if a route-handler POST is chosen over server action.
- `src/lib/auth/account-audit.ts` can inspire hashed metadata approach but should not be overloaded unless semantically correct.
- `src/lib/auth/session.ts` or a new helper may expose current user + acceptance status to protected app.
- `src/app/auth/callback/route.ts` only if redirect-after-login should route first access to acceptance page.
- `src/proxy.ts` only if public-route exemptions or optimistic redirects change; avoid heavy DB checks here.

### Tests

- Unit: legal content/version helpers, acceptance status helper, duplicate/idempotency behavior.
- Route/action: acceptance POST/server action, auth callback redirect if changed.
- DOM: acceptance panel/sheet, settings legal card, error states.
- E2E: new user acceptance, returning accepted user, old-version re-acceptance, save failure, keyboard/focus.
- SQL/RLS: one user cannot read/write another user's acceptance rows.

## New files likely to be created

- `src/lib/legal/terms-version.ts`
- `src/lib/legal/terms-content.ts`
- `src/lib/legal/terms-acceptance.ts`
- `src/components/workshop/TermsAcceptancePanel.tsx`
- `src/components/workshop/LegalStatusCard.tsx`
- `tests/unit/legal-terms-version.test.ts`
- `tests/unit/legal-terms-acceptance.test.ts`
- `tests/vitest/terms-acceptance-ui.test.tsx`
- `e2e/terms-acceptance.spec.ts`
- `supabase/migrations/<generated>_terms_acceptance.sql`

Exact filenames may change after live implementation exploration, but roles should remain separated.

## Interfaces/contracts affected

- `RequiredTermsVersion` contract: `{ termsKey, version, effectiveDate, contentHash, privacyVersion }`.
- Acceptance insert contract: user-authenticated, server-derived user id and timestamp; version and context validated against current allowed versions.
- Acceptance status contract: returns `{ requiredVersion, latestAcceptedVersion, acceptedCurrentVersion, requiresAcceptance, acceptedAt }`.
- RLS contract: users can select their own rows; insert only own current acceptance; updates/deletes generally disallowed to preserve audit history.
- Admin/support contract: server-only/platform-admin retrieval with least-privilege audit, not broad browser table exposure.

## Data flow before / after

### Before

1. User visits `/login`.
2. UI says “By continuing, you agree...” and links `/terms` + `/privacy`.
3. OAuth/magic-link callback creates session and sends user to `/workshop`.
4. No persisted Terms version/acceptance proof exists.

### After

1. User visits `/login` and sees Terms/Privacy notice links.
2. OAuth/magic-link callback creates session and closed-beta gate still runs.
3. Protected app boundary checks required Terms version acceptance.
4. If missing/outdated, user sees acceptance page/sheet with Terms version/effective date/Privacy link and clear user-responsibility summary.
5. User affirmatively accepts; server writes append-only acceptance evidence.
6. User enters `/workshop`; future checks see current accepted version and do not repeatedly block.
7. When `REQUIRED_TERMS_VERSION` changes, old accepted version triggers re-acceptance flow based on configured blocking/grace decision.

## Dependency decisions

- No new dependency is needed for first implementation.
- Use existing Next App Router, server actions or route handlers, Supabase SSR, generated types, test stack, and design primitives.
- If markdown rendering is desired, prefer existing capabilities or plain TS/MDX content before adding packages; new dependencies require explicit approval.

## Reuse opportunities

- `PublicPageShell` for public `/terms` and `/privacy` pages.
- `WorkshopPageShell`, collection/layout primitives, and `src/components/ui` controls for protected acceptance UI.
- `src/lib/auth/session.ts` request-scoped user context patterns.
- `src/lib/auth/account-audit.ts` hashing approach for metadata minimization.
- Existing RLS migration patterns from `closed_beta_allowed_emails`, `beta_feedback_submissions`, and audit tables.

## Alternatives rejected

- **“Zero liability” marketing/legal claim:** rejected because enforceability is limited by law, public policy, gross negligence/willful misconduct, consumer protections, and counsel review.
- **Passive browsewrap only:** rejected for weak acceptance evidence.
- **Raw IP/user-agent by default:** rejected pending privacy/legal justification; use hashed/minimized or omitted metadata by default.
- **Billing terms as active copy now:** rejected because closed beta has no billing.
- **CMS legal admin:** rejected for first slice as overengineering.

## Backward compatibility

- Existing users without records must get a planned first-access acceptance path; do not assume backfill equals legal acceptance.
- Public `/terms` and `/privacy` remain accessible.
- Share/invite routes remain separate from protected workshop Terms gate unless Philip/legal decides public recipients must accept terms.
- Current no-payment pricing remains accurate.

## Anti-overengineering guardrails

- Do not add a legal CMS, admin editor, dependency, billing, or global route family in the first implementation.
- Do not query broad project/workspace data just to determine Terms acceptance.
- Do not store raw request metadata without legal/privacy decision.
- Do not alter core estimating data, proposal export, AI, share, or billing behavior while implementing Terms acceptance.

## Terms content architecture

- Recommended source: `src/lib/legal/terms-content.ts` or `src/content/legal/terms-of-service.ts` exporting reviewed sections, `version`, `effectiveDate`, `contentHash`, and `legalReviewStatus`.
- Version identifier format: `tos-YYYY-MM-DD-vN` or `tos-YYYY-MM-DD-beta-vN`; use date + monotonic suffix for counsel-approved copy.
- Effective date format: ISO `YYYY-MM-DD` displayed in readable text.
- Content hash: SHA-256 of attorney-reviewed rendered content or canonical markdown to prove exact copy.
- Privacy link: Terms metadata should include `privacyPolicyVersion` or `privacyEffectiveDate` dependency.
- Legal placeholders: entity name, jurisdiction, dispute resolution, notices address, arbitration/class waiver, consumer/business positioning must remain explicit legal-review placeholders until decided.

## Supabase architecture

- Candidate table: `public.legal_terms_acceptances` or `public.user_terms_acceptances`.
- Optional versions table: `public.legal_terms_versions` if copy metadata must be queryable; otherwise content version can remain in app code and acceptance rows store version/hash snapshot.
- Candidate indexes: `(user_id, terms_key, version) unique`, `(user_id, terms_key, accepted_at desc)`, `(terms_key, version)`, optional admin/support lookup by user/time.
- Candidate grants: explicit `grant select, insert on public.legal_terms_acceptances to authenticated;` plus RLS; no anon grants unless public anonymous acceptance is later required.
- Candidate RLS: authenticated users select own rows and insert only own user id/current version; no user update/delete policy for append-only history.
- Generated types: update `src/lib/supabase/types.ts` after migration using repo-approved Supabase CLI command.

## Legal text architecture

- Terms and Privacy remain separate documents with cross-links.
- The app may include a short acceptance summary, but the binding document is the reviewed Terms page/version.
- Do not hardcode unreviewed final legal claims as if attorney-approved.
- Use clear placeholders for legal entity, jurisdiction, notices, dispute resolution, arbitration/class waiver, cancellation/refund policy, and professional-user positioning.
