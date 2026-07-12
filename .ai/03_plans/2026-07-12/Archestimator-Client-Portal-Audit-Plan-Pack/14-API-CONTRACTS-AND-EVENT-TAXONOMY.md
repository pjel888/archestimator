# 14 — API Contracts and Event Taxonomy

## 1. Contract principles

- version every public DTO;
- return opaque public IDs;
- apply policy before serialization;
- `Cache-Control: private, no-store`;
- bounded request bodies;
- idempotency on retryable writes;
- cursor pagination;
- problem-details style safe errors;
- one authoritative issue identity per response;
- no live private-source fallback;
- no mutation through GET.

## 2. Public manifest

### `GET /api/share/:token/manifest`

Response:

```json
{
  "schemaVersion": 2,
  "portal": {
    "id": "portal_public_id",
    "name": "Client Cost Review",
    "status": "live"
  },
  "issue": {
    "id": "issue_public_id",
    "number": 3,
    "versionLabel": "Rev 2",
    "status": "under_review",
    "issuedAt": "2026-07-12T01:00:00Z",
    "validThrough": null,
    "contentHash": "..."
  },
  "project": {
    "name": "Project Name",
    "code": "P-001",
    "currencyCode": "PHP"
  },
  "brand": {
    "mode": "prepared_by_for",
    "owner": {"name": "Studio", "logoAssetId": "asset_..."},
    "client": {"name": "Client", "logoAssetId": "asset_..."},
    "theme": {"accent": "#3D3D3D"}
  },
  "recipient": {
    "verified": true,
    "displayName": "Client Reviewer",
    "role": "approver"
  },
  "sections": [
    {
      "id": "section_...",
      "kind": "overview",
      "title": "Overview",
      "layoutMode": "standard",
      "unreadThreadCount": 0
    }
  ],
  "capabilities": [
    "portal:view",
    "thread:view",
    "thread:create",
    "thread:reply",
    "decision:submit_formal"
  ],
  "decisionSummary": {
    "scope": "issue",
    "status": "pending"
  }
}
```

The capabilities list is a UI hint from the server policy. Every later write is reauthorized.

## 3. Section read

### `GET /api/share/:token/sections/:sectionId?issue=3`

Response:

```json
{
  "schemaVersion": 1,
  "portalId": "portal_...",
  "issueId": "issue_...",
  "section": {
    "id": "section_...",
    "kind": "cost_breakdown",
    "title": "Cost Breakdown",
    "layoutMode": "wide",
    "payloadHash": "...",
    "payload": {}
  }
}
```

Errors:

- 404 hidden/unknown/unavailable;
- 409 issue no longer current only when the request explicitly requires current;
- 423 password required;
- 401 recipient verification required;
- 429 rate limited.

A role-hidden section should generally be indistinguishable from absent.

## 4. Recipient verification/session

### `POST /api/share/:token/verify`

```json
{
  "email": "recipient@example.com",
  "verificationToken": "..."
}
```

Or magic link/bootstrap flow. Response sets secure recipient session and returns sanitized recipient profile/capabilities.

### `DELETE /api/share/:token/session`

Ends local recipient session; does not revoke portal membership.

## 5. Threads

### List

`GET /api/share/:token/threads?section=<id>&target=<id>&status=open&cursor=<cursor>`

```json
{
  "threads": [
    {
      "id": "thread_...",
      "subject": "Clarify balcony finish",
      "status": "open",
      "waitingState": "waiting_on_owner",
      "target": {
        "kind": "row",
        "id": "row_...",
        "label": "Balcony finish",
        "secondaryLabel": "Architectural Works"
      },
      "messageCount": 4,
      "unreadCount": 1,
      "lastMessageAt": "...",
      "participants": [
        {"displayName": "Client Reviewer", "side": "client"}
      ]
    }
  ],
  "nextCursor": null
}
```

### Create thread

`POST /api/share/:token/threads`

Headers:

```text
Idempotency-Key: <client UUID>
X-Archestimator-CSRF: ...
```

Body:

```json
{
  "issueId": "issue_...",
  "sectionId": "section_...",
  "target": {
    "kind": "row",
    "id": "row_..."
  },
  "subject": "Clarify balcony finish",
  "body": "Can you confirm the material basis?"
}
```

### Add message

`POST /api/share/:token/threads/:threadId/messages`

```json
{
  "body": "The allowance is based on ...",
  "replyToMessageId": "message_..."
}
```

### Status

`POST /api/share/:token/threads/:threadId/status`

```json
{
  "status": "resolved"
}
```

Return the updated thread and append audit/client activity as policy requires.

## 6. Publisher discussion actions

Use authenticated server actions or protected route handlers:

```ts
replyToPortalThread({
  portalId,
  threadId,
  body,
  idempotencyKey,
  visibility: "client"
})

addPortalInternalNote({
  portalId,
  threadId,
  body,
  idempotencyKey
})
```

These must be separate functions and repositories.

## 7. Decision

### Read

`GET /api/share/:token/decision?issue=<issueId>`

Returns:

```json
{
  "policy": {
    "scope": "issue",
    "rule": "all_required",
    "issueId": "issue_...",
    "issueNumber": 3,
    "total": 1234567.89,
    "currencyCode": "PHP",
    "contentHash": "..."
  },
  "recipient": {
    "required": true,
    "canSubmit": true,
    "decision": null
  },
  "summary": {
    "requiredApprovers": 2,
    "submitted": 1,
    "status": "pending"
  }
}
```

Do not reveal other recipients' private signer details unless portal policy explicitly allows an aggregate.

### Submit

`POST /api/share/:token/decision`

```json
{
  "issueId": "issue_...",
  "issueContentHash": "...",
  "decision": "approved",
  "signerName": "Jane Doe",
  "note": "Approved subject to the stated exclusions.",
  "confirmation": true
}
```

Headers include CSRF and idempotency key.

Response:

```json
{
  "decision": {
    "id": "decision_...",
    "status": "recorded",
    "submittedAt": "...",
    "receiptId": "receipt_..."
  },
  "portalDecisionSummary": {
    "status": "approved"
  }
}
```

## 8. Client-safe activity

`GET /api/share/:token/activity?issue=<id>&cursor=<cursor>`

Return only the configured projection and recipient-allowed identities.

## 9. Assets

`GET /api/share/:token/assets/:assetId`

Checks:

- active portal/access;
- issue/asset relationship;
- recipient section visibility where relevant;
- no raw R2 path.

Issue-safe logos can instead use immutable content-addressed URLs if they reveal no secret or tenant path.

## 10. Publisher API/action contracts

### Create portal

```ts
createClientPortal({
  projectId,
  name,
  templateKind,
  clientProfileId?
})
```

### Update draft

```ts
updateClientPortalDraft({
  portalId,
  expectedRevision,
  patch
})
```

### Publish issue

```ts
publishClientPortalIssue({
  portalId,
  expectedDraftRevision,
  idempotencyKey,
  issueLabel?,
  validThrough?,
  carryForwardThreadIds: []
})
```

### Recipient

```ts
invitePortalRecipients({
  portalId,
  recipients: [{
    email,
    displayName?,
    roleTemplate,
    requiredApprover
  }]
})
```

### Access

```ts
updatePortalAccessPolicy({
  portalId,
  expectedPolicyRevision,
  patch
})
```

Security-sensitive access changes may take effect immediately and append an audit event.

## 11. Error envelope

```json
{
  "type": "https://archestimator.com/problems/portal-stale-issue",
  "title": "This portal issue changed",
  "status": 409,
  "code": "PORTAL_STALE_ISSUE",
  "detail": "Reload the latest issue before submitting.",
  "requestId": "req_..."
}
```

Public `detail` is generic and safe. Internal logs retain the reason code and provider error separately.

## 12. Cursor contract

Opaque HMAC-signed cursor payload:

```json
{
  "v": 1,
  "sort": "2026-07-12T01:00:00Z",
  "id": "opaque-id",
  "scopeHash": "..."
}
```

Reject cursor if portal, issue, filter, or audience scope differs.

## 13. Idempotency

Required for:

- portal publish;
- thread create;
- message create;
- decision submit;
- invitation send;
- reminder send;
- link rotation.

Store:

- actor/scope;
- key hash;
- request hash;
- response reference;
- expiry.

Same key + different body is 409.

## 14. Canonical event taxonomy

### Naming convention

`<domain>.<entity>.<past-tense-action>`

Examples:

```text
portal.portal.created
portal.portal.access_changed
portal.issue.published
portal.issue.superseded
portal.recipient.invited
portal.recipient.verified
portal.thread.created
portal.message.created
portal.thread.resolved
portal.decision.submitted
portal.decision.voided
portal.delivery.failed
portal.analytics.section_viewed
portal.security.authorization_denied
```

The product analytics layer can map these to funnel names. Do not use one ambiguous `open` event for every stage.

## 15. Event metadata allowlist

Per event schema, define exact metadata keys. Examples:

### `portal.issue.published`

- issue number;
- selected section kinds;
- selected estimate count;
- total/currency;
- payload bytes;
- source staleness warning count;
- notification intent count.

### `portal.message.created`

- thread ID;
- actor side;
- target kind;
- message length bucket;
- attachment count;
- not body.

### `portal.decision.submitted`

- decision;
- scope kind;
- issue number;
- required approver status;
- portal rule status;
- not signer raw email in analytics.

## 16. API acceptance criteria

- Unknown section kinds cannot be published or read.
- Hidden section returns no payload bytes.
- Cursors cannot cross portals/audiences.
- Repeated message/decision POST does not duplicate.
- Same idempotency key with different body fails.
- Every formal write binds to issue/content hash.
- Public errors never reveal SQL, storage keys, or authorization internals.
- All public API responses use the sensitive no-store contract.
