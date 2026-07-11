# Authorization, Security, Privacy, and Compliance

## Admin Capability Model

Platform product roles (`ceo|admin|member`) are not sufficient as a long-term operator permission model. Define server-enforced capabilities, initially mapped to the existing single operator but independently testable:

- `admin.overview.read`;
- `admin.users.read_basic`;
- `admin.users.read_sensitive`;
- `admin.users.manage_status`;
- `admin.sessions.read|revoke`;
- `admin.notifications.read|compose|review|publish|cancel|retract`;
- `admin.support.read|reply|manage`;
- `admin.flags.read|write`;
- `admin.audit.read`;
- `admin.operations.read|manage_incident`;
- `admin.analytics.read`;
- Corporate/Teamwork capabilities remain owned by their domains.

Every layout, route handler, Server Action, repository entrypoint, export, and sensitive deep link checks capabilities server-side. UI visibility is convenience only. Default is deny.

Every Server Action is treated as a directly reachable POST entrypoint. It derives identity and capability inside the action, validates a bounded DTO, applies origin/CSRF and rate controls, and returns only serializable safe result data. A render-time layout/page check never substitutes for action authorization.

## High-Risk Action Controls

- fresh authentication for ban, revoke-all, mandatory-wide publish, retraction, maintenance activation, and privileged-role changes. UNIT-003 must first produce a version-matched Better Auth reauthentication receipt from installed docs/source; session `createdAt`/`updatedAt` is explicitly invalid evidence. The selected contract must prove an accepted primary factor or supported challenge, a maximum 10-minute freshness window, one-time server evidence bound to actor/session/action class, expiry and replay denial, and safe OAuth/magic-link fallback. Until that receipt passes, every fresh-auth-dependent action remains disabled and returns a stable `reauth_unavailable` result;
- typed reason plus optional bounded note and incident/case reference;
- self-target, protected account, last-admin, and peer-elevation floor;
- expected prior state/version and affected-row proof;
- idempotency and rate limits;
- atomic/recoverable audit/outbox;
- visible failure and reconciliation state;
- user communication policy separated from internal audit detail.

## Threat Model

| Threat | Control |
| --- | --- |
| direct Server Action invocation | server capability on every action, CSRF/origin protections, denial tests |
| guessed user/campaign ID | server authorization and existence checks; no ID-based authorization |
| privilege escalation/last-admin lockout | capability hierarchy, protected operator set, last-admin transaction check |
| wide accidental notification | reach preview, approval hash, fresh auth, idempotent publish, schedule grace, kill switch |
| duplicate/partial fanout | unique delivery, run/job idempotency, leases, reconciliation |
| publish/cancel race | optimistic version and claim checks before every chunk |
| content/action-link injection | typed values, shared validators, safe internal link parser, text rendering |
| PII/token exposure | server DTO allowlist, redaction, no raw session/account/token fields |
| audit deletion with user | tombstoned/pseudonymous actor reference; no cascade loss |
| log injection | structured sanitized fields; no raw untrusted payload rendering |
| cross-tenant activity leakage | per-source admin authorization and scope tests |
| notification audience query abuse | typed grammar, complexity limits, preview/publish same evaluator |
| queue message tampering/replay | pointer payload, schema/hash/revision validation, D1 authoritative state |
| scheduler stall | freshness metric, due backlog alert, reconciliation sweeper |
| support message XSS | plain text or approved sanitizer; attachment policy/scanning |
| export exfiltration | explicit capability, row cap, redacted schema, audit, no cached public URLs |

## Sensitive Data Classification

Never expose or store in admin client/audit/log/export:

- session tokens, OAuth access/refresh/id tokens, verification secrets;
- raw passwords or password hashes;
- raw IP addresses or unrestricted user-agent strings;
- provider credentials, webhook URLs/tokens, connection strings;
- raw notification/support payloads beyond the allowed rendered content contract;
- unrestricted internal IDs when safe labels suffice.

HMAC/hash values are pseudonymous personal data, not anonymous. Sensitive detail reveal, if ever needed, requires a separate capability and access audit.

## Audit Contract

Admin audit records:

- actor tombstone/pseudonymous identity, capability, action;
- target type/id or stable pseudonym;
- before/after redacted summary and expected version;
- reason code/case reference;
- request/correlation/idempotency key;
- success/failure/reconciliation state;
- event time and source revision.

Audit history must survive profile erasure while complying with retention. All access to investigation-grade logs is itself recorded. Audit writes cannot be silently swallowed for high-risk actions.

## Retention, DSAR, and Legal Hold

Define and implement a reviewed class for:

- canonical identity/profile/onboarding;
- login/heartbeat/security facts;
- normalized activity and source events;
- support content/attachments;
- notification campaigns/versions/runs/recipient state/engagement/preferences;
- admin audit and sensitive-read audit;
- client error/web vital/user correlations;
- exports and temporary test sends.

For each: purpose, personal-data fields, default retention, anonymize/delete/tombstone action, legal-hold eligibility, backup behavior, DSAR export shape, erasure propagation, aggregate preservation, and proof command.

Existing draft retention policy/counsel boundary remains authoritative. Implementation may add machinery and safe defaults but cannot claim legal/compliance approval without the required review.

## Privacy UX

- User 360 shows why a fact is collected and source/freshness where ambiguity matters.
- Notification targeting never exposes a downloadable recipient list by default.
- Test sends are visibly labeled and retained briefly.
- Mandatory notice overrides are explicit to operator and user.
- Presence shows only defensible freshness and avoids covert per-action tracking.
- Product analytics defaults to aggregates; user drilldown is investigation-specific and audited.

## Security Verification

- anonymous/member/limited/full/protected-peer denial matrix;
- direct action/API invocation;
- stale/fresh auth;
- cross-tenant IDs and source-event leakage;
- raw token/IP/UA/secret scan of DTOs, logs, audit, exports;
- audience grammar complexity/injection;
- notification content/action link injection;
- concurrency and replay;
- audit persistence failure;
- retention/erasure/legal-hold conflict;
- break-glass recovery without disabling normal audit.
