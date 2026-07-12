# 15 — Counsel Brief + Email-Delivery Plan + QS/Domain Checklist

> Tracks 2, 3, 4 deliverables. The owner said the bar is higher than static
> audit; these are the concrete hand-off artifacts for the non-code surfaces.
> Each is scoped so the owner can route it to the right authority (counsel,
> ops/owner credentials, QS/estimator) without further audit work.

---

## Track 2 — Counsel / legal review brief

**Audience:** Philip's counsel (or Philip's own legal judgment for beta).
**Scope:** the proposals recipient-inbox + `/share/*` decision flow as it stands
on 2026-07-12. This brief summarizes what the code does and flags the specific
legal questions; it is **not** legal advice.

### What the system does today (facts for counsel)

1. **Identity binding.** A recipient's inbox is keyed by `lower(recipient.email)`
   matching the signed-in account email (`recipient-proposals-repository.ts:147`).
   Opening a specific proposal is independently re-gated by a D1 RPC
   `authorize_recipient_publication_for_current_user` keyed on email
   (`actions.ts:319-332`).
2. **Decision recording.** Accept/Decline/Request-Revision is recorded in
   `shared_link_responses` with: `signer_name` (typed, ≤120 chars),
   `signature_intent_hash = sha256(publication.id : snapshotVersion : signerName : submittedAt)`
   (`d1-store.ts:772`), `snapshot_version_at_decision` (pins the exact BOQ content
   seen), `created_at`, and `ip_hash`/`user_agent_hash` via event tables.
3. **Snapshot immutability.** The decision is bound to a frozen `snapshot_json`
   captured at publish time (`snapshot.ts`). Republish creates a new version; the
   old decision stays bound to the old version.
4. **No electronic-consent disclosure.** There is currently **no** "I consent to
   sign electronically / my agreement has the same legal effect as a handwritten
   signature" acknowledgment before Accept (`SharePageDecision.tsx`). This is the
   one explicit ESIGN/UETA/RA 8792 gap (`08` §2.1).
5. **Data retention.** `shared_link_events` is purged at 90 days; decisions,
   comments, and recipient emails are retained indefinitely (no TTL).
   `project_publication_events` has no TTL (P1-5). DSAR erasure is intake-only
   (no propagation) (`09` §3).
6. **Region.** D1 `running_in_region: APAC`, `jurisdiction: null` (verified
   2026-07-12 via `wrangler d1 info`).
7. **Marketing posture.** `src/app/trust/page.tsx:94,143` states: "We do not
   claim SOC2, GDPR, HIPAA, or DPA compliance."

### Specific legal questions for counsel

| # | Question | Why it matters | Code ref |
|---|---|---|---|
| L1 | Is a click-Accept + typed `signer_name` + `signature_intent_hash` **sufficient SES** for the target contract value and jurisdiction (PH primary; US if any US clients)? | Determines whether beta can ship e-sign as-is or needs a QES/AdES provider (DocuSign/Adobe Sign) | `08` §2.1-2.2 |
| L2 | Is the **missing electronic-consent disclosure** a material gap for B2B contractor↔client under RA 8792 (PH) and UETA (US)? | If yes, it's a beta blocker; if no (B2B carve-out), it's a recommended enhancement | `08` §2.1 |
| L3 | Does **APAC-region D1 with `jurisdiction: null`** satisfy NPC IRR (PH) data-residency guidance for the beta population? Or is a specific PH jurisdiction / on-shore store required? | Determines whether P3-7 is beta-ok or Enterprise blocker | `09` §4 |
| L4 | Is **anonymize-in-place on recipient removal** (DEC-AUTO-111: set `author_email`/`signer_name`/`note`/`body` to `"[removed]"`) a sufficient erasure response for a DSAR, or must rows be hard-deleted? | Determines P1-4 fix shape | `09` §3, DEC-AUTO-111 |
| L5 | Is the **indefinite retention** of decisions/comments/emails acceptable for the beta population, or does the PH DPA / any target jurisdiction require a retention cap? | Determines whether P2-9 / the retention DRAFT schedule must be counsel-signed before beta | `09` §5 |
| L6 | Does **`signature_intent_hash`** need to be disclosed to the recipient (as part of the decision record) for it to be admissible evidence, or is server-side retention sufficient? | Affects whether the share page should show the hash/receipt | `08` §2.3 |

### Recommended counsel deliverable
A short memo answering L1-L6 with a per-question "beta-ok / beta-blocker / Enterprise" verdict, plus sign-off (or redline) of the retention schedule `OPEN-DEC-004`. Until then, AUTH-3 (consent disclosure + assumptions/exclusions) and P1-4 (PII purge shape) stay owner-gated.

---

## Track 3 — Cloudflare Email delivery test plan

**Audience:** owner (Philip) with Cloudflare credentials.
**Why:** static code confirms the `EMAIL` binding is wired (`cloudflare-email-client.ts`) and gated by `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`/`CLOUDFLARE_EMAIL_FROM`, but cannot prove delivery to real PH recipient inboxes (spam/bounce latency).

### Pre-conditions
- `wrangler.jsonc:28-32` `EMAIL` binding configured.
- `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=1`, `CLOUDFLARE_EMAIL_FROM` set (verify in the deployed Worker env: `bunx wrangler secret list`).
- A real external PH email address you control (not a Cloudflare-internal address).

### Test procedure
1. As a publisher, publish a proposal and **add the external PH email as a recipient** (`addSharedLinkRecipients`). This calls `sendCloudflareEmail`.
2. Confirm:
   - **Receipt** in the external inbox (not spam). Record time-to-deliver.
   - **`delivery_status`** flips to `sent` in `shared_link_recipients` (query D1: `SELECT email, delivery_status, resend_email_id FROM shared_link_recipients WHERE email = ?`).
   - **`publication_digest_log`** row appears if a digest was triggered.
3. **Open the share link** from the email. Confirm:
   - `project_publication_events` gets an `open` row.
   - `open_count` increments on the publication.
   - `last_opened_at` updates on the recipient.
4. **Bounce test (if feasible):** add a deliberately-invalid email (e.g. `nonexistent.user.@invalid-domain.invalid`) and confirm:
   - `delivery_status` moves to `bounced` — **NOTE:** bounce ingestion is flagged `BLOCKED-EXTERNAL` in the active pack (no Cloudflare Email inbound webhook yet). If `delivery_status` stays `sent`/`pending`, that confirms the bounce gap is live.
5. **Unsubscribe test:** click unsubscribe in the email, confirm `email_unsubscribed_at` is set and a re-send is suppressed.

### Pass criteria
- Delivery to a real PH inbox < 60s, not spam-foldered.
- Open tracking fires end-to-end.
- Bounce behavior is honestly labeled (whether or not ingestion works).

### What this closes
- Confirms (or refutes) that Cloudflare Email is production-viable for PH delivery.
- Confirms whether the `BLOCKED-EXTERNAL` bounce ingestion is a real beta gap or already mitigated.

---

## Track 4 — QS / domain-SME checklist

**Audience:** Philip (if he holds the QS judgment) or a contracted QS/estimator.
**Why:** a code-correct proposal that is *professionally incomplete* will be
rejected by real estimators even if no bug exists. Static audit cannot judge
domain adequacy.

### Checklist — is the proposal content professionally adequate?

1. **BOQ structure.** Does the snapshot's line-item shape (`description`, `qty`,
   `unit`, `unitCost`, `contingencyPercentage`, `miscCost`, `rowTotal`) match
   RICS NRM 2 measurement conventions for the target project types (building
   works, MEP, civil)? — `snapshot.ts:199-212`.
2. **Exclusions / assumptions / qualifications.** Is there a first-class place
   for the sender to state assumptions, exclusions, and qualifications? — **Gap
   identified** in `08` §1.4; the snapshot has none beyond BOQ + project meta.
   This is the most important domain-content gap.
3. **Preliminaries (prelims).** Are general preliminaries / site establishment
   / overhead items representable, or does the BOQ only cover measured works?
4. **Contingency & VAT display.** Is the contingency (default 10%) and VAT
   (default 12%, PHP) treatment clear and correctly computed in the XLSX and
   share view? Does it match PH practice (VAT-inclusive vs exclusive)?
5. **Currency / locale.** PHP is the default currency code. Is that correct for
   the beta population? (i18n locale is P2-15/DEC-AUTO-114; currency is a
   domain choice.)
6. **Commercial terms.** The XLSX export has a "Commercial Terms" sheet
   (`create-proposal-workbook.ts`) — is the boilerplate adequate, or does it
   need counsel/estimator authoring for PH construction contracts?
7. **Bid form / signature / conforme blocks.** The XLSX has these — are they
   legally/professionally sufficient for the target use, or template-only?
8. **Revision clarity.** When a publisher republishes (new `snapshot_version`),
   is it clear to the recipient what changed vs the prior version? — **Gap**:
   revision comparison is Enterprise P1 (`ENTERPRISE-P1-PROD-001`), absent.
   For beta, is "new version, please re-review" enough?

### Recommended SME deliverable
A short review of one real sample proposal (XLSX export + `/share/<token>` view)
against the above 8 points, with a "professionally adequate for beta / needs X
before beta" verdict per point.

---

## How these three tracks interact with the code audit

- **Track 2 (counsel)** can unblock AUTH-3 (consent disclosure), finalize
  P1-4's fix shape (DEC-AUTO-111), and counsel-sign the retention DRAFT
  (`OPEN-DEC-004`). It does **not** block the 27 code bugs.
- **Track 3 (email)** confirms provider viability and the bounce gap. It does
  **not** block the code fixes.
- **Track 4 (QS)** can prioritize the "assumptions/exclusions block" (AUTH-3 /
  `08` §1.4) and sanity-check the BOQ. It does **not** block the code fixes.

All three are **parallel** to implementing Slices 1-3c. The code fixes can ship
while these tracks run; their findings fold back as additional slices (e.g.
consent disclosure, assumptions block) via the existing AUTH-3 gate.

---

## Status after this artifact

The pack now contains **expert-evaluation + hand-off deliverables** for the
non-static tracks, not just a list of "things we can't do." Track 1's
non-`TEST_TASK` half (heuristic UX, `14`) is done; Track 1's runtime half
(contrast/focus/mobile/SR verification) remains `TEST_TASK`-gated. Tracks 2-4
have concrete briefs the owner can route immediately.
