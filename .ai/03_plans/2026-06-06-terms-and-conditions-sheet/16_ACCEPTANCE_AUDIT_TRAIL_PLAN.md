# Acceptance Audit Trail Plan

## Audit goal

Provide credible, privacy-aware evidence that a specific authenticated user accepted a specific Terms version at a specific time through a specific UI/context, without over-collecting personal data or exposing records across users.

## Evidence fields

| Field | Required | Purpose | Privacy note |
| --- | --- | --- | --- |
| `user_id` | Yes | Tie acceptance to Supabase Auth user. | Personal data; RLS-protected. |
| `terms_key` | Yes | Distinguish Terms/Privacy/AUP if separate. | Low sensitivity. |
| `terms_version` | Yes | Prove accepted version. | Low sensitivity. |
| `terms_effective_date` | Yes | Human/legal display. | Low sensitivity. |
| `terms_content_hash` | Should | Prove exact copy. | Low sensitivity. |
| `privacy_policy_version` | Should | Tie Privacy dependency. | Low sensitivity. |
| `accepted_at` | Yes | Timestamp of acceptance. | Personal data. |
| `acceptance_context` | Yes | signup/first_protected_access/reacceptance/settings/checkout. | Low-medium. |
| `acceptance_method` | Yes | checkbox/button mechanics. | Low. |
| `ip_hash` | Optional | Dispute evidence. | Hash/omit by default. |
| `user_agent_hash` | Optional | Dispute evidence. | Hash/omit by default. |
| `request_id` | Optional | Correlate logs. | Low-medium. |
| `metadata` | Optional bounded | Legal-review reference, UI variant, locale. | No raw secrets/provider payloads. |

## Append-only model

- Insert a new row for each Terms version accepted.
- Do not update old rows for normal user flows.
- Use unique user/version key to avoid duplicates.
- If legal copy is materially corrected, create a new version and re-accept rather than mutating old copy.

## Support/admin retrieval

- Normal users can view their own acceptance status/history if product wants.
- Support/legal retrieval should be server-only or platform-admin-scoped.
- Retrieval output should include minimal evidence: user email/id, terms version, accepted timestamp, context, method, content hash, optional hashed metadata.
- Do not expose broad acceptance table in browser.

## Retention/deletion

Open legal decision:

- Delete rows with user account, or
- retain minimal legal record while anonymizing user data, or
- retain for defined legal limitation period.

Privacy Notice must disclose whichever policy is chosen.

## Evidence quality

Strongest commercially reasonable evidence includes:

- conspicuous Terms/Privacy notice before acceptance;
- stable links to full copy;
- affirmative acceptance action;
- version/effective date/hash;
- server-derived user/time;
- append-only DB record;
- RLS/admin retrieval controls;
- deploy/legal-review artifact linking version to approved copy.
