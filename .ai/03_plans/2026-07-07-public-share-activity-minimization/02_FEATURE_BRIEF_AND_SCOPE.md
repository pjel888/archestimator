# Feature Brief and Scope

## Source brief

From `PROMPT.md` (the authoritative FEATURE BRIEF for this pack):

> **Goal.** Create a plan pack that minimizes public share activity exposure while preserving useful recipient collaboration.
>
> **Evidence to start from.**
> - `src/app/api/share/[token]/activity/route.ts` combines comments, decisions, events, recipient display names, and metadata.
> - Comment, decision, and recipient flows span `src/app/api/share/`, `src/components/share/`, and publication components.
> - Public links are high-risk because recipients may be unauthenticated or email-matched rather than full workspace members.
> - Retention, privacy, and proposal inbox plans overlap but do not replace data minimization work.
>
> **Required plan pack.** Define the public-share data contract, minimum recipient-visible fields, redaction rules, pagination/rate limits, privacy tests, audit logging, revoked/expired behavior, and migration or compatibility notes.
>
> **Constraints.** Do not degrade legitimate recipient review flows. Treat source-only inspection as insufficient proof for privacy; specify tests and hosted checks.
>
> **Stop condition.** The pack is complete when an executor can narrow the public activity surface and verify no unnecessary data is exposed.

## Problem definition

The public share activity endpoint aggregates multiple data classes (comments, decisions, events, recipient display names, stored target metadata) into one token-gated public response. Because recipients may be anonymous or email-matched (not full workspace members), any field that reaches the response is potentially exposed to anyone who obtains the token. The current implementation is defensively built (allow-listed DTO, re-hashed IDs, internal filtering, recipient scoping, `no-store`, password gate) but has confirmed over-fetches of PII, a deny-list (not allow-list) facts filter, a vestigial `meta` field, no route-level test, retention that does not cover share content, raw `console.error` bypassing the redactor, and several owner-gated hardening gaps (token-guess lockout, Turnstile/WAF, secret splitting, session revocation).

## User value

- **Recipients:** their own and others' PII is not over-exposed; the activity feed shows only what is needed for review.
- **Workspace owners/managers:** predictable, auditable, minimizable public surface; defensible privacy posture for first users.
- **Philip (owner):** free-tier-preserving, no-paid-add-on hardening path; clear owner decisions where paid/secret changes are involved.

## Business value

Preparing for first users. Publication/shared-link flows are explicitly prioritized (`AGENTS.md` current stage). A defensible data-minimization story reduces privacy risk and supports the proposal-package + collaboration/publication proof goals.

## Goals

1. Define and enforce a tight public-share data contract (recipient-visible fields, redaction rules).
2. Remove confirmed PII over-fetches from the public read paths.
3. Convert the deny-list facts filter to an allow-list.
4. Add route-level privacy tests that prove each minimization rule (treating source-only inspection as insufficient).
5. Extend retention to cover share content (comments, responses, recipients, publications, publication events, digest log).
6. Route share-route logging through the redactor.
7. Document and (where owner-approved) implement hardening: secret splitting, Turnstile/WAF, session revocation, token-guess lockout.
8. Preserve the recipient review journey (view snapshot, comment, decide once).

## Non-goals

- Implementing code. Planning-only.
- Redesigning the estimate snapshot, proposal package, collaboration-realtime DO, or Better Auth.
- Hashing recipient email at rest (breaks the email-matched proposals view; instead covered by retention + minimization).
- Splitting the activity route into many sub-routes.
- Enabling paid Cloudflare add-ons without owner approval.
- Visual redesign of the share page (`DESIGN.md` is alpha, not law).

## Scope boundaries

| In scope | Out of scope |
|---|---|
| `GET /api/share/[token]/activity` contract + DTO | Estimate snapshot content model |
| `listPublicActivityComments`, `listRecipientActivityResponses`, `listRecipientActivityEvents`, `listRecipientDisplayNames` SELECT lists | `loadSharedLinkActivity` owner action redesign (parity check only) |
| `composeSharedLinkActivity` facts filter | Activity feed visual redesign |
| `retention-core.ts` rule coverage | Retention cron infra (worker.ts already runs it) |
| Share-route logging call sites | Better Auth session model |
| `/comment`, `/decision`, `/events` write paths (shadow-path coverage) | `/password`, `/unsubscribe` rewrite (verify only) |
| Route-level privacy tests | Broad `bun run validate` as the proof (targeted tests are the right size) |
| Credential-material taxonomy for the share surface | Cross-workspace authz redesign (already app-layer enforced) |

## Success metrics

- Public activity response contains zero `author_email`, zero recipient `email`, zero raw internal UUIDs, zero `ip_hash`/`user_agent_hash`, zero internal enum values not in the public DTO, zero soft-deleted/revoked rows.
- Every public DTO field is documented in the data contract with a redaction rule.
- Every minimization rule has a route-level test that fails if the rule is violated.
- Retention covers every share-content table with an owner-signed TTL.
- No share route logs raw errors; all go through `redactForLog`.
- Recipient review journey (view/comment/decide) regression tests stay green.

## Failure metrics

- Any new field reaches the public DTO without an explicit allow-list entry.
- Any over-fetch returns (e.g., a future SELECT adds `author_email` back).
- Any share route regresses to raw `console.error`.
- Any recipient can read another recipient's decision, event, or email.
- Any revoked/expired publication returns activity data (not a 404).
- Recipient comment/decision write rate limits or snapshot-version locks regress.

## Stakeholders

- **Philip Lewis (owner):** decides OPEN-RET-01, OPEN-SEC-02/03/04, OPEN-UX-02.
- **Future implementation executor:** consumes `11_IMPLEMENTATION_PLAN.md`.
- **Future implementation reviewer:** consumes `17_FINAL_READINESS_REVIEW.md` + `19_…md`.

## Dependencies

- `migrations/0014_publication_shared_links.sql` (core schema).
- `migrations/0006_ai_audit_rate_limits.sql` (`security_rate_limit_events`).
- `migrations/0034_data_retention_events.sql` (retention audit).
- `src/lib/compliance/retention-core.ts` (rule registry).
- `src/lib/observability/redact.ts` (redactor).
- Existing test suites (regression boundary).

## Constraints

- Planning-only: no code/test/migration/config/provider changes.
- Free-tier Cloudflare posture: no paid add-ons without owner approval.
- Proportional verification: targeted tests over broad `validate` for the minimization slices.
- D1 is SQLite-flavored; no Postgres RLS; authz is app-layer.
- `DESIGN.md` is alpha; do not block on design-system grounds.

## Assumptions

- The activity route's lack of a UI consumer on the recipient page is acceptable to preserve (OPEN-UX-02 confirms whether to feature-flag it off).
- Recipient email must remain plaintext at rest to support the email-matched proposals view (`recipient-proposals-repository.ts`).
- The owner action `loadSharedLinkActivity` remains the full-fidelity owner view; only the public route is minimized.
- Existing retention cron (`30 3 * * *`) is the delivery vehicle for new rules; no new cron is needed.

## Tradeoffs / alternatives (full: `15_…md`)

- Allow-list vs deny-list facts filter → **allow-list** (tighter, less fragile).
- Hash recipient email vs plaintext + retention → **plaintext + retention** (preserves proposals view).
- Split activity route vs one aggregated route → **one route** (tighter contract, less surface).
- Turnstile vs no Turnstile → **owner-gated** (free tier available; UX friction tradeoff).

## Future extensibility

- If the activity feed gains a recipient-facing UI consumer, the data contract defined here is the stable surface to build against.
- Server-side session revocation (Phase 7) is a forward-compatible design (adds a `session_generation` column, opt-in).
- Retention rules are additive; future tables inherit the same pattern.
