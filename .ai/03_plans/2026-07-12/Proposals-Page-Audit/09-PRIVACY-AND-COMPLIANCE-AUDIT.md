# 09 — Privacy & Compliance Audit

> Audit date: 2026-07-12. PII inventory, right-to-be-forgotten, data retention,
> and residency for the proposals recipient surface. Every finding cites
> `file:line` or migration refs. Severity: **[BETA-BLOCKING]** / **[ENTERPRISE]** /
> **[DEFENSIBLE]**.
>
> **Important context:** the marketing site explicitly states "We do not claim
> SOC2, GDPR, HIPAA, or DPA compliance" (`src/app/trust/page.tsx:94,143`). This
> limits legal exposure for beta but means Enterprise compliance is a known
> future requirement, not a current claim.

## 1. PII inventory (proposals surface)

The proposals surface stores substantial recipient PII. Highest-density table: `shared_link_recipients` (migrations `0014:58-81`, rebuilt in `0066`):

| Table | PII columns | Notes |
|---|---|---|
| `shared_link_recipients` | `email` (plaintext, NOT NULL), `display_name`, `recipient_token_hash`, `invited_by`, `resend_*`, `last_opened_at`, `email_unsubscribed_at` | Primary inbox key = plaintext email |
| `shared_link_responses` | `signer_name` (≤120), `signature_intent_hash` (64-hex), `note` (≤2000 free-text) | Decision rows; `note` may contain PII |
| `shared_link_comments` | `author_email` (plaintext, **NOT NULL** `0014:103`), `author_name`, `body` (≤1000 free-text) | Recipient-authored; body likely contains PII |
| `shared_link_events` | `recipient_id`, `ip_hash`, `user_agent_hash`, `metadata_json` | Quasi-identifiers hashed (good) |
| `project_publication_events` | `ip_hash`, `user_agent_hash`, `metadata_json` | Hashed (good) |
| `project_publications.snapshot_json` | `clientName`, `senderName`, full pricing, contractor free-text | **Frozen PII blob** — see §2 below |

## 2. `snapshot_json` is a frozen PII blob

`src/lib/publication/snapshot.ts` embeds directly into the recipient-visible snapshot:
- `clientName` (`snapshot.ts:17`, written `:489-503`)
- `senderName` (`snapshot.ts:21`, `:488,493/500`) — **publisher's display name in the recipient payload**
- `project.name`, `projectCode`, `currencyCode`, `location` (location sanitized per visibility `:107-125`)
- Full pricing (`rowTotal`, `totalCost` at `:199-212,410,470,513`)
- Row `description`, `designation`, `discipline`, `material` — contractor-authored, may name subcontractors/suppliers

`sanitizeProjectPublicationSnapshotForPublicRead` (`snapshot.ts:313-345`) re-opaques IDs and re-applies location sanitization **but does not strip `clientName`, `senderName`, pricing, or free text**. This is correct by design (a proposal must show this), but it's a **frozen PII blob with no TTL** (see §5).

## 3. Right-to-be-forgotten — INCOMPLETE [BETA-BLOCKING]

### 3.1 Recipient removal is hard-delete on the row but leaves PII behind
`removeSharedLinkRecipient` (`src/lib/publication/actions.ts:1656-1695`) does a hard `DELETE` on `shared_link_recipients`. But the `0066` FK cascade behavior on child tables is `ON DELETE SET NULL`, not `CASCADE`:

| Child table | On recipient delete | PII retained? |
|---|---|---|
| `shared_link_comments` | `recipient_id` SET NULL (`0066:216`) | **YES** — `author_email`, `author_name`, `body` retained |
| `shared_link_responses` | `recipient_id` SET NULL (`0066:259`) | **YES** — `signer_name`, `note`, `signature_intent_hash` retained |
| `shared_link_events` | `recipient_id` SET NULL (`0066:312`) | YES — `ip_hash`/`user_agent_hash` retained |

**An external client who asks "delete my data" still has their name, email, and signed decision embedded in the publisher's proposal history.** Worse, `author_email` is `NOT NULL` (`0014:103`) so it can't even be blanked without a schema change — `SET NULL` only applies to `recipient_id`.

### 3.2 No self-service erasure
- A DSAR intake exists (`src/app/api/compliance/privacy-requests/route.ts`, `privacy_requests` table `0033_privacy_request_register.sql`) accepting `access|rectification|erasure|restriction|portability|objection`. **But it only writes a triage row; it does not perform erasure.**
- The retention schedule doc (`.ai/10_state/compliance/retention-schedule.md`) states verbatim: *"This propagation logic is **NOT yet implemented**… The retention cron does not perform DSAR propagation."*
- **A recipient cannot self-delete.** Only path: publisher manually removes (incomplete per 3.1) or ops runs SQL.

### 3.3 Unsubscribe is a soft flag, not erasure
`/api/share/[token]/unsubscribe` sets `email_unsubscribed_at` (`d1-store.ts:472-491`). Email, name, token, and access are **all retained**. CAN-SPAM compliant (honors opt-out) but not GDPR/DPA "restriction of processing."

## 4. Data residency — no D1 region config [ENTERPRISE]
`wrangler.jsonc:40-47` has no `location_hint` or region binding for `ARCH_DB`. The retention/compliance docs frame everything under **Philippine DPA / NPC IRR**, but D1 data could reside outside the intended jurisdiction absent explicit config. Defensible for beta (Cloudflare manages region); counsel review needed for Enterprise.

## 5. Data retention — partial, counsel-gated DRAFT [BETA-BLOCKING for events]

A retention registry exists (`src/lib/compliance/retention-core.ts:87-221`) and a cron runs it (`worker.ts:226-258`, the `30 3 * * *` cron). **But:**

| Table | Retention rule? | Status |
|---|---|---|
| `shared_link_events` | ✓ 90-day hard purge (`retention-core.ts:115-123`) | Implemented |
| `project_publication_events` | ✗ **NONE** | **[BETA-BLOCKING]** — access/password audit log grows forever |
| `shared_link_recipients` | ✗ none | Plaintext emails retained forever |
| `shared_link_responses` | ✗ none | Signature/notes retained forever |
| `shared_link_comments` | ✗ none | `author_email`/`body` retained forever |
| `project_publications` / `snapshot_json` | ✗ none | Frozen PII blob retained forever |
| `publication_digest_log` | ✗ none | Retained forever |

The entire schedule is marked **"DRAFT — requires OPEN-DEC-004 sign-off"** (counsel). Only `shared_link_events` is actually purged today.

## 6. Email PII in logs — ONE LEAK PATH [BETA-BLOCKING]

### 6.1 Redaction is mostly sound
`src/lib/observability/redact.ts`:
- `HASHED_ONLY_KEYS` includes `email`, `recipient_email`, `user_email` (`:27`) → hashed.
- `redactMessage` (`:50`) regex-masks `x@y.z` patterns + tokens/JWTs/share-segments.
- `sendCloudflareEmail` failure logs only `subject_length` + `error_code` (`cloudflare-email-client.ts:166-176`) — clean.

### 6.2 Console path leaks the un-redacted record [BETA-BLOCKING]
`src/lib/observability/logger.ts:163-177` (`consoleAppLogger.log`):
```
writeDevLogRecord(record);             // dev path: redacted via buildDevRecord
const line = JSON.stringify(record);   // ← serializes the ORIGINAL un-redacted record
console.error(line);                   // ← ships raw record to stdout/Workers Logs
```
The console path (which feeds Cloudflare Workers Logs in prod) serializes the **un-redacted** record. `logAppError` (`:218-221`) pre-redacts before calling `log`, so the common error path is safe — **but any direct `emitLogRecord({ context: { email: ... } })` call, or a field named `to`/`recipient`, will log plaintext email to Workers Logs.** Easy fix: serialize the redacted copy.

## 7. Consolidated risk register (privacy-specific)

These are **new bugs** to add to `02-BUG-AND-RISK-REGISTER.md`:

| ID | Gap | Severity | File/ref |
|---|---|---|---|
| **P1-4** | Recipient removal leaves `signer_name`, `note`, `signature_intent_hash`, `author_email`, `author_name`, comment `body` intact (SET NULL, not CASCADE/anonymize) | P1 [BETA-BLOCKING] | `actions.ts:1674`; `0066:216,259,312` |
| **P1-5** | `project_publication_events` (access/password audit log) has no retention TTL while sibling `shared_link_events` does | P1 [BETA-BLOCKING] | `retention-core.ts`; `0034:13-29` |
| **P2-8** | Console log path serializes un-redacted record to stdout/Workers Logs; direct `emitLogRecord` callers can leak emails | P2 [BETA-BLOCKING] | `logger.ts:163-177` |
| **P2-9** | No retention rule for `shared_link_recipients`, `shared_link_responses`, `shared_link_comments`, `snapshot_json`, `publication_digest_log` | P2 [BETA-BLOCKING for events / ENTERPRISE for content] | `retention-core.ts:87-221` |
| P3-5 | DSAR erasure propagation explicitly unimplemented; intake exists but does nothing | P3 [ENTERPRISE] | `privacy-requests/route.ts` |
| P3-6 | Unsubscribe is a soft flag (CAN-SPAM ok; not GDPR "restriction of processing") | P3 [ENTERPRISE] | `d1-store.ts:472-491` |
| P3-7 | D1 has no `location_hint`/residency config while product frames compliance under PH DPA/NPC IRR | P3 [ENTERPRISE] | `wrangler.jsonc:40-47` |
| P3-8 | Recipient emails plaintext at rest (required for inbox search; no field-level encryption/blind index) | P3 [ENTERPRISE] | `0014:61` |

### Top 3 to fix before beta
1. **P1-5** — add `project_publication_events` to `DEFAULT_RETENTION_RULES` (mirror `shared_link_events`'s 90-day purge). Cheapest.
2. **P2-8** — serialize the redacted copy in `consoleAppLogger.log`. One-line fix.
3. **P1-4** — decide recipient-removal PII policy: either soft-delete + anonymize `author_email`/`signer_name`/`note`, or change `author_email` to nullable + add a purge step in `removeSharedLinkRecipient`. Needs a DEC-AUTO (see `06` update).

### DEFENSIBLE findings (no action)
- `ip_hash`/`user_agent_hash` stored, not raw IP/UA (`0014:50-51,175-176`). ✓
- Snapshot IDs opaque (sha256-namespaced) before public exposure; location sanitized per visibility. ✓
- `sendCloudflareEmail` logs no addresses. ✓
- Marketing correctly disclaims SOC2/GDPR/HIPAA/DPA — limits legal exposure for beta. ✓

## 8. Compliance posture summary

| Framework | Beta posture | Enterprise blocker? |
|---|---|---|
| **PH DPA / NPC IRR** | Defensible (private B2B, consent at invite, hashed quasi-identifiers, DSAR intake exists) | Yes — needs residency + erasure propagation + counsel sign-off |
| **GDPR** | N/A for beta (no EU users yet); marketing disclaims | Yes — full DSAR erasure, residency, DPA |
| **CAN-SPAM** | ✓ compliant (unsubscribe honored) | No |
| **ESIGN / UETA / RA 8792** | ✓ SES valid for private B2B; one gap (consent disclosure, `08` §2.1) | Close gap before scaling |
| **SOC2 / HIPAA** | Explicitly not claimed | Enterprise, separate track |
