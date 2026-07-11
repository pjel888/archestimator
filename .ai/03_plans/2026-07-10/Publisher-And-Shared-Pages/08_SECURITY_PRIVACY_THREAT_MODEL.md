# 08 - Security, Privacy, And Threat Model

## Security Invariants

- Public share tokens, password-access cookies, recipient-session cookies, CSRF
  checks, origin checks, and D1-backed rate limits remain fail-closed.
- A manager preview is authorized by the current Better Auth session plus
  project-manager RBAC on every read. Preview never mints a share-equivalent
  bearer credential.
- Recipient proposal reads never expose a partial list after normalization,
  authorization, or integrity failure.
- Request-body enforcement counts bytes actually read. `Content-Length` is only
  diagnostic metadata and never the authority for accepting a body.
- The existing D1 rate limiter is cross-isolate authority. Module-local state is
  optional best-effort shedding only.

## SEC-001 - Bounded Request Bodies

Create one shared bounded-reader utility in `src/lib/http/read-bounded-body.ts`.
It consumes `request.body` with a streaming reader, tracks actual bytes, cancels
the reader immediately after the limit is crossed, and returns a typed 413
result before JSON or form parsing. If a route has no body stream, it returns an
empty byte sequence. Invalid or understated `Content-Length` never relaxes the
limit. Unsupported non-identity `Content-Encoding` is rejected with 415 so a
compressed wire body cannot bypass a decoded-size contract.

Route limits:

| Route | Limit | Parser after bounded read |
|---|---:|---|
| `password` POST | 256 B | JSON |
| `session` POST | 256 B | JSON |
| `comment` POST | 2 KiB | JSON |
| `decision` POST | 4 KiB | JSON |
| `unsubscribe` POST | 1 KiB | URL-encoded/form data |

`events` is absent because SEC-007 removes the route. `TEST-018`, `TEST-019`,
and `TEST-020` cover absent, invalid, truthful, and understated length headers;
chunked delivery; exact-limit and over-limit bodies; early stream cancellation;
unsupported encoding; and the unsubscribe limit. The success claim is AC-040,
which remains `FAIL` until those tests pass.

## SEC-002 - Locked Status Consistency

Comment GET and decision GET return 423 when publication password access is
required and no valid access cookie exists. They retain 401 for missing recipient
identity where identity, rather than password access, is the failed precondition.
`TEST-021` and `TEST-022` prove AC-041.

## SEC-003 - Durable Admission Authority

`checkSharedLinkDecisionRateLimit` in `public-repository.ts` is the authoritative
D1-backed admission decision before a decision mutation. Denials preserve the
typed status and `Retry-After` metadata. An isolate-local consecutive-failure
counter may shed work in that isolate, but it must be named and documented as
best effort, cannot satisfy AC-042 by itself, and is reset by isolate lifecycle.

`TEST-023` proves the durable limiter runs before mutation and that two isolated
module instances cannot be represented as one global circuit. No new Durable
Object, package, or process-global singleton is introduced.

## SEC-004 And SEC-005 - Pagination And Reentrance

- Comment pagination uses an opaque cursor derived from `{createdAt, id}`. The
  server caps page size, validates cursors, and never accepts a client-supplied
  publication identity. `TEST-024` and `TEST-025` prove AC-043 and AC-044.
- Snapshot sanitation passes ID maps through request-scoped parameters; no
  module-level mutable map remains. `TEST-026` proves concurrent calls cannot
  cross-contaminate IDs and satisfies AC-045 only when the source inspection is
  clean.

## SEC-006 - Secret Readiness

Worker module initialization is not a dependable `process.env` startup boundary.
Implementation extends `scripts/check-cloudflare-worker-readiness.ts` and its
tests so `bun run cf:check-readiness` fails when required publication token or
encryption secret bindings are absent or invalid. The existing request-time
secret readers in `src/lib/publication/security.ts` remain fail-closed as defense
in depth. `TEST-027` covers both the explicit readiness command and request-time
denial. AC-046 remains `FAIL` until both layers pass.

## SEC-007 - Dead Surface Removal

Remove:

- `src/app/api/share/[token]/events/route.ts`;
- `download_attempt_blocked` from `ProjectPublicationEventType`;
- `download_attempt_blocked` from `PublicationEventType`;
- `download_attempt_blocked` from the `project_publication_events.event_type`
  CHECK in the rebuilt table created by migration 0066. The current
  `project_publication_events` CHECK (migration 0014, lines 43-45) includes
  this value; the rebuilt CHECK omits it. The `shared_link_events.event_type`
  CHECK does not reference this value and is copied byte-for-byte.
- `PublisherDisabledEmptyState` after a zero-consumer check.

The print button calls `window.print()` and emits no client telemetry. `TEST-028`
and `TEST-029` include static zero-consumer checks for AC-047. Historical migration
0014 remains immutable; migration 0066 establishes the current CHECK contract.

## SEC-008 - Manager Preview Authorization

The preview URL is `/workshop/publisher/preview/[projectId]`. The server component
performs this sequence for every render:

1. Resolve the current Better Auth user context.
2. Run `assertProjectPublicationManager` for the route `projectId`.
3. Load the current publication and sanitized snapshot server-side.
4. Render the existing recipient presentation in explicit read-only preview mode.
5. Disable or omit comment and decision mutations and show a persistent preview
   banner with a normal link back to the manager surface.

There is no `createClientPreviewSession`, preview cookie, preview query token, or
share-token handoff. Public `/share/[token]` recipient semantics remain separate.

### Credential-material taxonomy

| Material | Form/storage | Server/client visibility | Rotation/revocation | Use |
|---|---|---|---|---|
| Better Auth session | Raw bearer cookie managed by Better Auth | Cookie is HttpOnly; session context is server resolved | Existing Better Auth lifecycle | Authenticate manager |
| Project-manager grant | Derived from current D1 authorization data | Server only | Role/workspace changes take effect on next read | Authorize `projectId` |
| Preview credential | None | None | Not applicable | Deliberately not created |
| Public share token | Existing raw URL bearer for `/share/[token]` | Existing public route only | Existing rotate/revoke flow | Never authorizes manager preview |
| Recipient session | Existing scoped HttpOnly cookie | Existing public route only | Existing expiry/clear flow | Never authorizes manager preview |

Denial matrix for `TEST-039` and the focused preview test:

| Scenario | Result |
|---|---|
| Unauthenticated preview request | Login redirect or typed unauthorized result; no snapshot |
| Authenticated non-manager | 404/403 per existing authorization convention; no snapshot |
| Manager from wrong workspace | Denied; no cross-workspace metadata |
| Manager role revoked between reads | Next render denied |
| Possesses public token or recipient cookie only | No preview authority |
| Route `projectId` differs from publication project | Denied fail-closed |
| Recipient uses public link while manager previews | Recipient route remains independent and mutation-capable according to its own session |

AC-085, AC-086, and AC-087 remain `FAIL` until automated route denial tests and
the targeted interaction proof pass.

## SEC-009 - Unsubscribe

The GET interstitial remains email-client-safe and unchanged. POST uses the same
bounded reader with a 1 KiB limit before form parsing. CSRF/origin and token
checks remain in their current order. `TEST-020` covers AC-088.

## Recipient Repository Integrity

`loadRecipientProposals` keeps its current fail-closed boundary. A malformed,
unnormalizable, unauthorized, or internally inconsistent row yields a typed
unavailable result and no partial list, raw IDs, or metadata. UX recovery copy is
added only for legitimate expired, revoked, empty, and invited-email mismatch
states. `TEST-017` proves AC-038 with a malformed row and asserts no partial data.

## Privacy And Logging

No new PII is collected. Do not log raw share tokens, cookies, email addresses,
passwords, request bodies, publication snapshots, or preview route contents.
Structured logs may contain redacted route templates, status classes, body-limit
labels, and hashed publication identifiers. Local logs are diagnostic evidence,
not hosted-production proof.

## Security Gate

`GATE-001` stays `FAIL` until TEST-018 through TEST-029 plus the SEC-008/009
coverage represented by TEST-039 pass. Run:

```bash
bun test tests/vitest/publication-body-size.test.ts
bun test tests/vitest/project-publication-decision.test.tsx
bun test tests/vitest/share/share-page-get-routes-contract.test.ts
bun test tests/vitest/publication-comment-pagination.test.ts
bun test tests/vitest/publication-snapshot-reentrance.test.ts
bun test tests/vitest/publication-runtime-readiness.test.ts
bun test tests/vitest/publication-dead-code.test.ts
bun test tests/vitest/publisher-manager-preview-route.test.tsx
bun test tests/vitest/recipient-inbox-dead-end.test.tsx
bun run validate:error-handling
```
