# 06 — Decision Log (DEC-AUTO-*)

> Per the Improve-Plan-Prompt, no internally resolvable decision should remain
> open as "TBD" or "owner decision." This log closes every material choice this
> audit introduces or carries forward, using the `DEC-AUTO-*` shape from
> `Plan-Pack-Schema.md` §5. The archived 2026-07-11 decisions are retained only
> where this newer source audit re-confirms them.

## DEC-AUDO-101 · Track A (data hardening) ships before Track B (redesign)
- **Question:** Should the P1 data-layer bugs be fixed before or during the UX redesign?
- **Affected IDs:** P1-1, P1-2, P1-3, P2-2 (bug register); Track A units (DAG).
- **Evidence:** `recipient-proposals-repository.ts:157,160-162`; `d1-store.ts:377,410`. The data-layer files are disjoint from the redesign files (`proposals-page-client.tsx` + new components).
- **Options:** (a) ship Track A first as a standalone slice; (b) bundle into the redesign; (c) redesign first.
- **Decision:** **(a) Track A first.** It is lower-risk, disjoint from the UI files, fixes silent trust-killing bugs, and does not depend on any redesign decision.
- **Why:** Smallest coherent change first; de-risks the inbox before adding UI surface area; lets the redesign proceed against a hardened data layer.
- **Rejected:** (b) couples unrelated risk; (c) leaves known P1 bugs in front of users longer.
- **Confidence:** High.
- **Consequences:** Two PRs/lands instead of one; acceptable.
- **Rollback trigger:** None — Track A is pure bug-fix.
- **Responsible role:** Lead.

## DEC-AUTO-102 · One-bad-row should drop, not fail-all
- **Question:** When a single DB row fails to map, should the whole inbox fail or just that row?
- **Affected IDs:** P1-2, P1-3; A1, A2.
- **Evidence:** `recipient-proposals-repository.ts:157` `rows.some(row => row === null)`.
- **Options:** (a) drop+log the bad row, return the rest; (b) fail-all (current); (c) surface a per-row error in the UI.
- **Decision:** **(a) drop+log.** The recipient should see their other proposals; ops sees the dropped-row signal in logs.
- **Why:** Maximizes availability for the common case; a single corrupt enum value (e.g. a future `decision` value) should not be a global outage.
- **Rejected:** (b) is the current trust-killing behavior; (c) is over-engineering for V1 (no per-row error UI needed).
- **Confidence:** High.
- **Responsible role:** Lead.

## DEC-AUTO-103 · Keep TanStack Query (do not go RSC-only)
- **Carries forward:** predecessor DEC-AUTO-002.
- **Question:** Should the redesign keep client-side TanStack Query or move to RSC-only revalidation?
- **Evidence:** `proposals-page-client.tsx:53-61` (`staleTime 30s`, `refetchOnWindowFocus`, `retry:false`). The projects page uses RSC because its mutations are owner-initiated and revalidated via `router.refresh()`; proposals mutations happen **out-of-band** (a publisher in another workspace publishes/revokes), so the recipient needs background refetch.
- **Decision:** **Keep TanStack Query.** Window-focus refetch + 30s staleTime is the right model for a recipient inbox that changes out-of-band.
- **Why:** RSC-only would make the inbox stale until a hard navigation; TanStack gives passive freshness.
- **Rejected:** RSC-only (wrong mutation model for a recipient inbox).
- **Confidence:** High.

## DEC-AUTO-104 · Client-side filtering/sorting for V1 (≤50 rows)
- **Carries forward:** predecessor DEC-AUTO-003.
- **Question:** Server-side or client-side filter/sort?
- **Decision:** **Client-side for V1.** The repo already returns ≤50 rows in one round trip; client-side filter/sort/search is instant and reuses the projects-page `useReducer` + `useDeferredValue` pattern. Server-side pagination is deferred until >50 rows is a real problem (A4 adds the signal first).
- **Confidence:** High.
- **Rollback trigger:** if A4's `truncated`/`totalCount` signal shows real users hitting 50 regularly, revisit.

## DEC-AUTO-105 · Defer grouping to V2
- **Question:** Include the group-by dropdown in V1?
- **Affected IDs:** Track B grouping (target design §4.6, optional).
- **Evidence:** With ≤50 rows and 6 status tabs, grouping adds UI surface for limited value. The projects page grouping exists because owners manage many projects; recipients receive few proposals.
- **Decision:** **Defer grouping to V2.** Ship V1 with search + status tabs + sort + view modes (list/card).
- **Why:** Smallest coherent change; grouping is cleanly additive later via the same `DropdownSelect` + `groupProjects` pattern.
- **Confidence:** Medium (owner may disagree — see open question OQ-3 in `03`).
- **Responsible role:** Lead, with owner override.

## DEC-AUTO-106 · Two view modes (list/card), not four
- **Question:** Mirror the projects page's four view modes (list/small/medium/large)?
- **Decision:** **Two modes for V1: list + card.** Proposals don't have the thumbnail/cover variety that justifies small/medium/large granularity.
- **Why:** Less state, less CSS, less test surface; the card-vs-list distinction is the meaningful one for a recipient.
- **Confidence:** Medium.
- **Rollback trigger:** if recipients consistently ask for density control, add a "compact" mode.

## DEC-AUTO-107 · Extract shared `proposal-state.ts` helpers
- **Question:** Where do `getProposalState` / `getChipClassName` / `decisionLabels` / `formatProposalDate` live once both card and list row need them?
- **Evidence:** currently inlined in `ProposalRow.tsx:36-64`. B6 (card) and B7 (list row) both need them.
- **Decision:** **Extract to `src/components/workshop/proposals-page/proposal-state.ts`** (pure functions, no JSX) and import from both.
- **Why:** Avoids duplication; pure helpers are easy to reason about.
- **Confidence:** High.

## DEC-AUTO-108 · Do not add logging importantly changes to the result type for A1
- **Question:** Does adding `logAppError` in the repo catch change the client contract?
- **Decision:** **No.** The `RecipientProposalsResult` shape stays `{ ok:true; rows } | { ok:false; error }`. Logging is a side effect; the client is unaffected.
- **Confidence:** High.

## DEC-AUTO-109 · A4 truncation signal: `LIMIT 51` heuristic over a second COUNT query
- **Question:** How to detect >50 proposals cheaply?
- **Options:** (a) second `SELECT COUNT(*)` query; (b) `LIMIT 51` + `rows.length > 50` heuristic.
- **Decision:** **(b) the `LIMIT 51` heuristic.** One query, one round trip; if 51 rows come back, set `truncated: true` and drop the 51st. The exact `totalCount` is not needed for V1 (only the "there are more" signal).
- **Why:** Cheaper; D1 round trips are the scarce resource.
- **Confidence:** High.
- **Rollback trigger:** if the UI needs exact "Showing 50 of N", upgrade to COUNT.

## DEC-AUTO-110 · `normalizeDecision` widening: use a discriminated result, not `undefined`
- **Question:** How to fix the `normalizeDecision` union lie (returns `undefined` not in the type)?
- **Decision:** **Widen to `RecipientProposalDecision | "unknown"`** (a string sentinel consistent with the existing union style), and have `mapRecipientProposalRow` drop+log on `"unknown"`. Avoid introducing a new object shape for a 3-line function.
- **Why:** Minimal change, type-safe, no new abstraction.
- **Confidence:** High.

---

## Carried-forward predecessor decisions

| Predecessor DEC | Disposition in this active pack |
|---|---|
| DEC-AUTO-001 Adopt `WorkshopCollectionLayout` + card grid | ✓ `WorkshopCollectionLayout` exists, single consumer, fits proposals |
| DEC-AUTO-002 Keep TanStack Query | ✓ (this log DEC-AUTO-103) |
| DEC-AUTO-003 Client-side filtering V1 | ✓ (this log DEC-AUTO-104) |
| DEC-AUTO-004 Card shows proposal-specific metadata | ✓ target design §4.2 |
| DEC-AUTO-005 Add `clientName` to row (no migration) | ⚠ **Verify** — `projects.client_name` exists; confirm it's joinable into the inbox query if desired. Not currently selected. Optional for V1. |
| DEC-AUTO-006 XLSX pipeline stays as-is architecturally | ✓ out of scope for the inbox redesign |
| DEC-AUTO-007 Make `clientName` optional (test compat) | ⚠ re-check the two test files before any type change |
| DEC-AUTO-008 Accept TanStack cache isolation gap (≤30s) | ✓ (this audit P2 cross-cache gap, accepted) |
| DEC-AUTO-009 Absorb open items from the four 2026-07-07 packs | ✓ retained through the archived predecessor's reconciliation artifacts |

## DEC-AUTO-111 · Recipient-removal PII policy: anonymize-in-place (round 2)
- **Question:** When a publisher removes a recipient, what happens to their PII in `shared_link_comments`/`shared_link_responses`? (P1-4, `09` §3)
- **Evidence:** `0066` FKs are `ON DELETE SET NULL` → `author_email`/`signer_name`/`note`/`body` survive. `author_email` is `NOT NULL` (`0014:103`).
- **Options:** (a) soft-delete + anonymize-in-place (`"[removed]"`); (b) migration to make `author_email` nullable + hard-purge step; (c) CASCADE delete (loses the publisher's audit trail that a decision happened).
- **Decision:** **(a) anonymize-in-place.** Set `author_email='[removed]'`, `author_name='[removed]'`, `signer_name='[removed]'`, `note='[removed]'`, `body='[removed]'` in the same transaction as the recipient-row delete. Requires making `author_email` nullable OR using a sentinel value (keep NOT NULL, set to `'[removed]'`).
- **Why:** preserves the publisher's audit trail (that a decision/comment happened, against which publication/version) while scrubbing identity. No migration needed if using a sentinel value. Avoids CASCADE's data-loss of the publisher's legitimate records.
- **Rejected:** (b) is cleaner but needs a migration + more code; (c) destroys evidence the publisher needs.
- **Confidence:** Medium (sentinel value is pragmatic; a future privacy migration can formalize).
- **Responsible role:** Lead.

## DEC-AUTO-112 · Inbox multi-version de-duplication: latest-per-project (round 2)
- **Question:** Should the inbox show multiple rows for the same project across revoked+published versions, or collapse to latest? (P2-14, `10` §7)
- **Evidence:** the inbox query has no `project_id` de-dup; a recipient on v1 (revoked) + v2 (published) sees two rows.
- **Options:** (a) collapse to latest-per-`project_id` (prefer `published`, then most recent); (b) show full history; (c) migrate recipient rows on republish.
- **Decision:** **(a) latest-per-project, SQL-only.** Recipients care about "what's the current proposal for this project," not version archaeology. Version history is an Enterprise feature (`ENTERPRISE-P1-PROD-001`).
- **Why:** simplest, SQL-only change; matches recipient mental model; `LIMIT 50` stops being wasted on stale versions.
- **Rejected:** (b) clutters the inbox; (c) is a publisher-flow change with wider blast radius.
- **Confidence:** High.
- **Rollback trigger:** if recipients/owners ask to see revoked versions for audit, add a "show history" toggle.

## DEC-AUTO-113 · Enumeration-oracle fix: collapse errors (round 2)
- **Question:** How to close the `not-a-recipient` vs `unavailable` enumeration oracle in `openRecipientProposalAction`? (P1-6, `10` §5.2)
- **Decision:** **Collapse both into a single generic `"unavailable"` error** + add a per-user rate limit (10/min). The legitimate recipient's open flow is unaffected; only probing is degraded. Update `ProposalRow.tsx:66-71` message mapping to one message: "This proposal could not be opened. Contact the sender for an updated link."
- **Why:** the distinct errors exist only to help the legitimate user self-serve ("invite your signed-in email"). That UX value is outweighed by the enumeration risk. The generic message + "contact sender" still guides the legitimate user.
- **Confidence:** High.

## DEC-AUTO-114 · i18n locale fix: explicit `"en"` + `day: "2-digit"` (round 4, closes P2-15)
- **Question:** What locale should `ProposalRow.tsx:44` `Intl.DateTimeFormat` use? (`ADVERSARIAL` P2-15)
- **Evidence:** no i18n framework; `layout.tsx:36` pins `lang="en"`; `Intl.DateTimeFormat(undefined, …)` floats with browser locale → "Jul 8" ambiguous for days 1–12 across en-US vs en-PH/en-GB.
- **Options:** (a) `"en-PH"` explicit (PH-first product); (b) `"en"` (matches the pinned `lang`, lets the runtime pick the en variant); (c) keep `undefined` (status quo); (d) adopt a full i18n framework.
- **Decision:** **(b) `Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" })`.** Fixed `"en"` matches the declared document language (`lang="en"`); `day: "2-digit"` removes the 1–12 ambiguity ("08 Jul 2026" is unambiguous everywhere). Avoids over-committing to `"en-PH"` before a product-wide locale decision, and avoids the cost of adopting an i18n framework for one date format.
- **Why:** cheapest fix that closes the correctness gap; aligns the date format with the declared page language; `2-digit` is the unambiguous day format per CLDR.
- **Rejected:** (a) presumes PH-only before a product-wide decision; (c) is the bug; (d) is out of scope for one date format (adopt when multi-language is a real goal).
- **Confidence:** High.
- **Responsible role:** Lead. Maps to a one-line change in Track B (`ProposalRow.tsx:44`) or a standalone tweak.

---

## True owner-decision boundaries (AUTH-*)

These are **not** closed by this audit — they require the owner:

- **AUTH-1 · Grouping in V1?** (DEC-AUTO-105 defers it; the owner may override.)
- **AUTH-2 · `clientName` on the inbox row?** (deferred unless a current implementation need proves it useful.)
- **AUTH-3 · Electronic-consent disclosure + assumptions/exclusions block (domain, `08`).** Beta-recommended, not blocking; owner decides if they ship in the first-users slice or right after.
- **AUTH-4 · Where do the round-2 P1 bugs go?** Ship Track A (A5-A12) as a standalone slice, or fold into the active pack?
- **AUTH-5 · The "100% of all possible requirements" bar is outside static audit (2026-07-12).** Owner confirmed the bar is genuinely higher than static audit. Four non-static tracks in `13-NON-STATIC-GAPS-AND-ESCALATION.md` cannot be closed by reading code: (1) browser/UX testing — gated by the User Test Authorization Gate, needs explicit `TEST_TASK`; (2) counsel/legal review — needs a lawyer; (3) provider delivery test — needs real email + owner credentials; (4) domain/SME review — needs a QS/estimator. This is the loop's stop condition 3: a true authorization/resource boundary after every safe in-scope action (4 static rounds + runtime `wrangler d1 info`), with an exact continuation packet (`13`).

No other open internal decisions remain. Every other choice in this audit is closed.
