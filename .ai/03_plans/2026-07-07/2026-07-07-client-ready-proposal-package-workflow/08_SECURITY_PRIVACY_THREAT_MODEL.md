# 08 — Security, Privacy, and Threat Model

## Trust boundaries

| Boundary | Crossing | Control |
|---|---|---|
| Internet → Worker | public `/share/[token]`, `/api/share/[token]/*` | token-hash + optional scrypt password + rate limits + CSRF on writes |
| Authenticated user → Server Action | manager actions (publish/republish/rotate/revoke/recipients) | `assertProjectPublicationManager` (role-rank ≥ manager) |
| Authenticated user → Server Action | recipient-inbox action (`openRecipientProposalAction`) | `authorize_recipient_publication_for_current_user` (email match) |
| Owner input → Email provider | owner-composed message | SEC-01 plain-text + escape; length caps |
| Server → D1 | all writes | app-layer authz (no RLS); allowlist `knownTables`; `assertSafeIdentifier` |

## Threat model (relevant)

| Threat | Surface | Mitigation in this plan | Status |
|---|---|---|---|
| **Stored-HTML injection via owner message** | recipient email body | SEC-01: owner message accepted as plain text only; HTML-escaped on render into both text and HTML parts; no markdown/raw-HTML accepted; length caps 120/1000 | Planned (TEST-07) |
| **Internal estimator data leak via readiness DTO** | client bundle / client preview | SEC-02: readiness computed server-only; DTO contains only `{id,message,field?}`; reuses `applyAudiencePolicy` + `sanitizeProjectPublicationSnapshotForPublicRead` redaction; client never imports `proposal-readiness` directly | Planned (TEST-14) |
| **Privilege escalation via new Server Action input** | `addSharedLinkRecipients`/`resendSharedLinkRecipientEmail` new fields | SEC-03: same `assertProjectPublicationManager` gate; input validated (zod); no new auth path | Planned (TEST-04) |
| **Cross-workspace notification leak** | `publication_activity` dispatch | SEC-04: dispatch scoped by `workspace_members` for the project's workspace; recipient list derived server-side from membership | Planned (TEST-11) |
| **Cross-publication recipient scoping** | decision → `responded` flip | Reuse existing SEC-06: resolve publication context from the token's hash before recipient lookup; the `responded` UPDATE is scoped `WHERE publication_id=? AND recipient_id=?` | Existing + planned |
| **Readiness bypass via direct Server Action POST** | `createProjectPublication`/`republishProjectPublication` | FR-04: gate is enforced **inside** the action, not in the client; direct POST still hits the gate | Planned |
| **Email enumeration via readiness error** | blocker messages | Blocker messages are generic per-id (e.g., "no recipients configured"); they do not reveal whether other recipients exist on other publications | Designed |
| **Owner message abuse (phishing relay)** | recipient email | Plain text + clear "Message from {sender}:" framing + standard CTA + unsubscribe (existing) + rate limits (existing); no links rendered from owner text (escape removes `<a>`) | Designed |
| **Bounce spoofing (future webhook)** | `bounced` writer (REL-01) | When built: HMAC-signed webhook secret + idempotent update + denial test. Until then: `bounced` is never written from untrusted input | BLOCKED-EXTERNAL |
| **Rate-limit abuse on notification dispatch** | `publication_activity` writes | Reuse existing digest 15-min rate limit per publication; dedup per event-id | Designed |
| **Stale readiness letting a revoked publication send** | revoke during compose | Readiness computed fresh on drawer open + FR-04 re-checks at action time; revoke is an immediate status flip; existing `replace_project_publication` optimistic lock | Existing + designed |

## Authentication / authorization (unchanged model, reaffirmed)

- **Manager actions**: `assertProjectPublicationManager` — `ceo`/`admin` bypass; else `max(workspaceRoleRank, projectRoleRank) ≥ 30` (admin). New actions (message fields, notification dispatch is system-internal) inherit this gate.
- **Read actions**: `canReadPublisherRosterProject` (role ≠ viewer) for drawer data incl. readiness.
- **Recipient actions**: token-hash + SEC-06 cross-publication scoping. `openRecipientProposalAction` uses `authorize_recipient_publication_for_current_user`.
- No new auth path. No new public endpoint.

## Input validation (per boundary)

| Boundary | Input | Validation |
|---|---|---|
| Client → `addSharedLinkRecipients` | `invitationSubject?`, `invitationMessage?` | zod: `z.string().max(120).optional()`, `z.string().max(1000).optional()`; trim; reject control chars |
| Client → `resendSharedLinkRecipientEmail` | same | same |
| Server → email body | owner message | HTML-escape (`&<>"'`); render inside a fixed template; no link parsing |
| Server → readiness | derived from already-validated inputs | none new |
| Server → D1 | `UPDATE shared_link_recipients SET delivery_status='responded'` | scoped WHERE clause; parameterized (no string interpolation) |

## Secrets / env / logging

- No new secrets. Existing `PUBLICATION_TOKEN_*`, `PUBLICATION_ACCESS_COOKIE_SECRET`, Cloudflare Email env unchanged.
- `NEXT_PUBLIC_*`: no new public env vars.
- Logging: readiness errors log a structured event **without** internal estimator detail (log only `projectId`, `blockerIds[]`, `warningIds[]`). Owner message content must **not** be logged at info level (PII minimization); debug-level only behind a flag.
- Analytics: no new analytics events; existing `project_publication_events`/`shared_link_events` reused.

## CSP / frame / referrer

- No new CSP directives required. Owner message rendered as escaped text inside the email (off-site, Cloudflare Email) and inside existing drawer (existing CSP).
- Share page frame/cross-site behavior unchanged.

## Privacy / data minimization

- Owner message is PII (sender-authored, recipient-addressed). Stored only on `shared_link_recipients` rows (the already-PII recipient rows). Minimized: subject ≤120, body ≤1000.
- Readiness DTO contains no PII.
- Notifications contain workspace/project context already authorized for the recipient user.
- Bounce data (when wired) — provider may include recipient email; store only the event type + timestamp + provider event id, not the raw payload (minimization).

## Abuse scenarios

- **Mass-invite spam.** Existing `SHARED_LINK_RECIPIENT_ACTION_LIMIT=50` + `SHARED_LINK_RECIPIENT_RESEND_SCOPE` 5-min window. Unchanged.
- **Notification spam.** Digest 15-min rate limit reused; per-event dedup.
- **Readiness computation DoS.** Computation is bounded (≤1200 nodes / 3000 rows per export cap). PERF-01.
- **Owner message as spam vector.** Plain text, length-capped, framed as sender message, unsubscribe preserved.

## Security testing

| Test | What it proves |
|---|---|
| TEST-04 | Readiness gate blocks direct POST when blockers present (no client bypass) |
| TEST-07 | Owner message rejected when over-limit / contains HTML; rendered output is escaped |
| TEST-11 | Notification dispatch does not write cross-workspace |
| TEST-14 (new) | Readiness DTO/redaction does not leak Source Breakdown/supplier/internal fields to client |
| TEST-15 (new) | `responded` UPDATE scoped to correct publication+recipient (SEC-06 — a recipient from pub A can't flip pub B) |

## Incident-response implications

- If the readiness gate is found to leak internal detail → disable via OPS-01 flag (readiness becomes no-op pass-through, OPS-02); hotfix the DTO.
- If owner message is abused as phishing relay → temp-disable message field via flag; emails revert to default copy.
- If notification dispatch misroutes → disable via flag; owners fall back to Activity tab + digest (existing).
