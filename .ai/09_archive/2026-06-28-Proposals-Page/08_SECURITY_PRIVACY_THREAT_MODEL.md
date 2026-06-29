# 08 — Security, Privacy, and Threat Model

## Trust boundaries

| Boundary | Trust level | Mechanism |
|---|---|---|
| Anonymous internet -> `/share/[token]` | Low -> medium | Raw token URL hashed server-side; optional password/session cookies |
| Anonymous internet -> `/workshop/*` | Untrusted | Existing auth gate |
| Signed-in user -> `/workshop/proposals` | Medium | Supabase Auth session |
| Signed-in user -> `openRecipientProposalAction` | Medium | Server Action validates auth and recipient authorization |
| Server Action -> publication admin/client | High | Allowed only after authorization RPC confirms recipient ownership |
| Browser -> Supabase RPC | Medium | Execute-granted RPCs; `auth.uid()` binding |

## Actor model

| Actor | Allowed | Not allowed |
|---|---|---|
| Anonymous share visitor | Use valid `/share/[token]` | Open `/workshop/proposals` |
| Authenticated recipient | List/open proposals sent to their verified email | List/open proposals sent to another email |
| Authenticated attacker | See only rows for their verified email | Enumerate publication ids into credentials |
| Project manager | Existing manager publication controls | Gain extra cross-workspace power via recipient inbox |
| Server Action after authz | Decrypt `encrypted_token` and set session cookies | Serialize token/hash material to client |

## Credential material rules

| Value | Security classification | Rule |
|---|---|---|
| Raw publication token | Bearer URL credential | May appear only in existing `/share/[token]` URL after authorization |
| `project_publications.token_hash` | Server lookup hash | Never client-visible; never used as `/share/[token]` |
| `project_publications.encrypted_token` | Server-only recovery envelope | Never client-visible |
| Raw recipient token | Bearer credential for email-session bootstrap | Not used by inbox bridge |
| `recipient_token_hash` | Server lookup hash | Never client-visible; not needed by inbox bridge |
| Shared-link session cookie | HttpOnly signed cookie | Set by existing helper shape only |

## Attack surface inventory

### 1. `list_recipient_publications_for_current_user`

**Asset**: recipient's publication list.

Threats and mitigations:

- **IDOR via recipient parameter**: no recipient id/email parameter exists; identity is `auth.uid()`.
- **Cross-workspace leak**: showing all publications sent to the email is intended; no workspace membership is required.
- **Credential leakage**: return signature excludes `token_hash`, `encrypted_token`, and `recipient_token_hash`; provider proof must verify this.
- **Unverified email attack**: relies on Supabase Auth/current app gate returning verified emails only. Document this assumption in migration comments.
- **SQL injection**: no dynamic SQL.

### 2. `authorize_recipient_publication_for_current_user`

**Asset**: authorization decision and recipient row id.

Threats and mitigations:

- **Publication-id enumeration**: RPC returns a row only when caller email matches a recipient row for that publication.
- **Credential exposure**: returns only `publication_id` and `recipient_id`; no hashes or encrypted token.
- **Unauthenticated direct call**: raises `42501`.

### 3. `openRecipientProposalAction`

**Asset**: same-tab transition into existing share session.

Threats and mitigations:

- **Direct POST**: action calls `requireCurrentUserContext()` and validates UUID before any lookup.
- **Wrong recipient**: authorization RPC returns no row; action returns `not-a-recipient`.
- **Revoked/expired between list and click**: action returns `unavailable` and does not set cookies.
- **Token/hash leak**: action must not return or log raw token, token hash, encrypted token, or recipient hash. Successful path uses `redirect()`.
- **Broken cookie shape**: action must use `getSharedLinkSessionCookieParts()` with raw token, publication id, credential version, and recipient id, plus the `_ok` companion cookie matching `src/app/api/share/[token]/session/route.ts`.
- **CSRF**: rely on App Router Server Action same-origin protections and same-site cookies; action still validates auth/authz internally.

### 4. Client UI and sidebar

No sensitive data beyond the list DTO. User-controlled strings are rendered by React, with no `dangerouslySetInnerHTML`.

## Auth and authz requirements

- Route: `requireCurrentUserContext()`.
- List RPC: `auth.uid()` must not be null.
- Authorization RPC: `auth.uid()` must not be null and caller email must match recipient email for `publication_id`.
- Action: auth + UUID validation + authorization RPC before any server-only publication admin/client read.

## Revoked and expired behavior

Owner-delegated decision: expired and revoked rows remain visible in the inbox but disabled. The action does not open them. This avoids silent disappearance while preserving access control.

## Input sanitization

- `page_limit` bounded in SQL with `least(100, greatest(1, coalesce(page_limit, 50)))`.
- `p_publication_id` is uuid-typed in SQL.
- Server Action validates `publicationId` with `isUuid` before RPC call.

## Logging safety

Allowed:

- generic error code (`not-a-recipient`, `unavailable`, `unknown`)
- publication id only when already non-secret and useful for debugging

Forbidden:

- raw publication token
- `project_publications.token_hash`
- `encrypted_token`
- raw recipient token
- `recipient_token_hash`
- full cookie value

## Privacy minimization

The list returns only fields required for recipient recognition and action:

- project/workspace names
- sender display name
- status/activity timestamps
- decision summary

It does not expose estimator emails, recipient lists, comments, or hidden project data.

## Security testing

| Test | Setup | Expected |
|---|---|---|
| Unauthenticated list RPC | anon/no JWT | `42501` |
| Direct credential-column read | authenticated non-manager | denied |
| Cross-recipient list | user A vs user B | disjoint rows |
| Cross-workspace positive | same recipient across two workspaces | both rows appear |
| Authorization RPC wrong user | user A calls for user B publication | empty result |
| Action wrong user | direct action call | `not-a-recipient` |
| Action revoked/expired | direct action call | `unavailable`, no cookies |
| Action happy path | authorized fixture | cookies set, redirect to raw `/share/[token]` |
| Browser network leak | Review click smoke | no hash/encrypted-token values in URL/DOM/network |

## Static checks

```bash
rg "recipient_token_hash|encrypted_token|token_hash" src/components/workshop/proposals-page src/components/workshop/proposals-page-client.tsx
rg "SUPABASE_SERVICE_ROLE_KEY" src/lib/repositories/recipient-proposals-repository.ts src/lib/recipient-proposals/actions.ts
```

The first command must return no credential-bearing client code. The second must return nothing.

## Incident response

If a recipient sees unexpected proposals:

1. Confirm their verified auth email.
2. Query recipient rows matching that email.
3. Revoke publications that should not have been sent to that email.
4. Document whether this was email reuse, sender mistake, or auth-provider issue.
