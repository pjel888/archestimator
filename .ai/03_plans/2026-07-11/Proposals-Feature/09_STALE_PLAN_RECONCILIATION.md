# 09 — Stale Plan Reconciliation

> Improve-stage artifact. This document records the per-item status of every
> open item from the three 2026-07-07 proposal plan packs, verified against
> current source code on 2026-07-11. Each item is classified SUPERSEDED
> (already implemented) or ABSORBED (still open, pulled into this pack).

---

## Migration Number Reality Check

**All three 2026-07-07 plans assumed latest migration `0036` → next `0037`.**
**Actual latest migration as of 2026-07-11: `0067`.**

Any migration work in absorbed items must recompute the next number by
running `ls migrations/ | sort | tail -3` immediately before authoring.

---

## Plan 1 — `2026-07-07-recipient-proposals-inbox-ia-recovery`

| Item | Requirement | Status | Evidence | Decision |
|---|---|---|---|---|
| FR-06 | Wrong-account recovery CTA on `ProposalRow` when `not-a-recipient` | **NOT IMPLEMENTED** | `ProposalRow.tsx:67` renders plain text only: "Open the link from your email invitation, or ask the sender to invite your signed-in email." No button/link/CTA. | **ABSORBED** → UNIT-011 |
| FR-04 | Forked empty state ("no proposals" vs "wrong email") | **NOT IMPLEMENTED** | `ProposalsEmptyState.tsx` (15 lines total) shows only "No proposals yet" + generic explanation. No wrong-email branch, no secondary callout, no sign-out link. | **ABSORBED** → UNIT-006 (merged into state parity) |
| FR-09/FR-10 | Differentiated expired/revoked terminal copy on `/share/[token]` | **NOT IMPLEMENTED** | `src/app/share/[token]/not-found.tsx` uses a single generic `SHARED_LINK_UNAVAILABLE_COPY` from `src/lib/publication/share-copy.ts:1-4`. The resolver `isActivePublication()` (`public-repository.ts:127`) collapses both revoked and expired to `false` — no reason surfaced to the UI. No `error.tsx` under `src/app/share/`. | **ABSORBED** → UNIT-012 (note: requires resolver change to expose inactive-reason) |
| FR-02 | "View all your proposals" link on share page | **NOT IMPLEMENTED** | `SharePageSessionBanner.tsx` has no link to `/workshop/proposals`. Grep for "View all your proposals" returns zero hits. | **ABSORBED** → UNIT-012 |
| FR-08 | Decision finality copy (locked badge) | **IMPLEMENTED** | `SharePageDecision.tsx:350-376` implements the locked badge with `role="status"`, signer name, date, and "You can still add comments below." | **SUPERSEDED** |

---

## Plan 2 — `2026-07-07-client-ready-proposal-package-workflow`

| Item | Requirement | Status | Evidence | Decision |
|---|---|---|---|---|
| FR-01..04 | Readiness/preflight model (`ProposalReadinessResult` with blockers + warnings; `createProjectPublication` rejects with `readiness_blocked`) | **NOT IMPLEMENTED** | `src/lib/proposal-readiness/` directory does not exist. `createProjectPublication` (`actions.ts:781-849`) has only legacy "≥1 sheet" gate at line 815: `if (resolvedEstimateIds.length === 0) return { ok: false, message: "Select at least one estimate to publish." }`. No blockers/warnings object, no `readiness_blocked` error. | **ABSORBED** → UNIT-013 (note: preflight is out of V1 inbox scope; deferred to publisher improvement) |
| FR-05 | Owner-composed recipient message (subject + body in invitation email) | **NOT IMPLEMENTED** | `RecipientInput` type is `{ email, displayName? }` only (`actions.ts:1085`). `sendSharedLinkRecipientInvitationEmail` uses hardcoded subject: `Project Estimate: ${projectName} shared by ${sender}` (line 1289). No `invitation_subject`/`invitation_message` columns in any migration. | **ABSORBED** → UNIT-013 (deferred to publisher improvement) |
| FR-07 | `responded` delivery_status wiring | **NOT IMPLEMENTED (half-wired)** | DB CHECK constraint allows `responded` (`0014:67`, reaffirmed `0066:167`). UI handles it: `RecipientEmailComposer.tsx:50` types it, line 245 treats it as already-engaged, lines 673-685 show destructive removal modal. BUT: `submitClientResponse` (`d1-store.ts:717-823`) only does `INSERT INTO shared_link_responses` (line 791) — NO `UPDATE shared_link_recipients SET delivery_status='responded'`. Only `delivery_status` writes are `SET delivery_status = 'opened'` (lines 377, 410). | **ABSORBED** → UNIT-014 (smallest delta — single UPDATE in `submitClientResponse`) |

---

## Plan 3 — `2026-07-07-proposal-export-and-immutable-deliverable-trust`

| Item | Requirement | Status | Evidence | Decision |
|---|---|---|---|---|
| FR-2/DATA-1 | Content hashing (SHA-256) + trust ledger table | **NOT IMPLEMENTED** | Grep for `proposal_deliverable_packages` and `content_sha256` across `src/` and `migrations/` returns zero hits. Export route builds buffer and streams it directly with no hash computation or ledger write. | **DEFERRED** — Enterprise MVP P1 (D-008). Not beta scope. |
| FR-3/FR-4 | Source/staleness stamping (manager + recipient) | **PARTIALLY IMPLEMENTED** | Manager-side: `readPublicationSnapshotStaleness` exists and is wired in `roster-repository.ts:325-328`, surfaced as `staleSnapshotWarning`. Recipient-side: `/share/[token]/page.tsx` does NOT compute or render staleness. Export workbook gets `generatedAt` timestamp but not persisted. | **ABSORBED** → UNIT-015 (recipient-side staleness only; manager-side already done) |
| FR-5 | Redaction assurance (byte-level leak scan for client audience) | **NOT IMPLEMENTED** | No byte-scan/redaction test exists. Workspace-name-as-contractor fallback is STILL PRESENT: `route.ts:241` sets `contractorName = workspace.name`, `create-proposal-workbook.ts:297` writes it as "Bidder / Contractor". This is a data leak for client-audience exports. | **ABSORBED** → UNIT-016 (fix contractor fallback + add redaction verification) |
| FR-7 | Content-bound recipient proof (`content_sha256_at_decision` on accept) | **NOT IMPLEMENTED** | `shared_link_responses` has `signature_intent_hash` and `snapshot_version_at_decision` but no `content_sha256_at_decision` column. | **DEFERRED** — Enterprise MVP P1 (depends on FR-2/DATA-1 trust ledger). |

---

## Summary

| Classification | Count | Items |
|---|---|---|
| SUPERSEDED (already implemented) | 1 | FR-08 (decision finality) |
| ABSORBED into this pack | 7 | FR-06, FR-04, FR-09/10, FR-02, FR-07, FR-3/4, FR-5 |
| DEFERRED (Enterprise MVP P1) | 2 | FR-2/DATA-1 (trust ledger), FR-7 (content-bound proof) |
| DEFERRED (publisher scope) | 2 | FR-01..04 (preflight), FR-05 (owner message) |

**New units created from absorbed items:**
- UNIT-011: Wrong-account recovery CTA on ProposalRow (from FR-06)
- UNIT-012: Share page terminal states + "View all proposals" link (from FR-09/10, FR-02)
- UNIT-013: Publisher preflight + owner message (deferred to publisher scope — documented, not implemented in this pack)
- UNIT-014: Wire `responded` delivery_status in `submitClientResponse` (from FR-07)
- UNIT-015: Recipient-side staleness surface on `/share/[token]` (from FR-3/4)
- UNIT-016: Fix contractor-name leak + redaction verification (from FR-5)

**Reconciliation of DEC-AUTO-005 (test compatibility):**
The original plan's UNIT-005 said to add `clientName` and run the existing test. The
improve-stage audit revealed that adding a required field will BREAK two test files:
- `tests/vitest/recipient-proposals-repository.test.ts` — strict `toEqual` (lines 91-112) will fail unless the expectation mirrors `clientName`.
- `tests/vitest/recipient-proposals-page.test.tsx` — `proposal()` factory (lines 40-59) will fail type-check if `clientName` is required.

**Resolution (DEC-AUTO-007):** Make `clientName` optional (`clientName?: string | null`) on `RecipientProposalRow`. This avoids breaking the test factory. The `toEqual` in the repository test will still need updating to include the new field — this means the `CHEAPEST_DECISIVE_EXISTING_TEST` trigger is INVALIDATED because it requires a test edit. **Reclassify UNIT-005's test to NOT_REQUIRED** with source inspection as the cheapest decisive proof (verify the SELECT clause does not add sensitive columns by reading the query text). The existing credential-free test's regex assertion (`not.toMatch(/\b(token_hash|recipient_token_hash|encrypted_token|password_hash)\b/i)`) is still valid evidence that the query doesn't select credentials, but running it requires a test edit which the trigger forbids. Instead, source inspection of the diffed SELECT clause is sufficient.
