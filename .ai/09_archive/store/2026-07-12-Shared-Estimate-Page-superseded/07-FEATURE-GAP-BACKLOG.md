# 07 — Feature Gap Backlog (the "so much lacking" surface)

> The owner flagged broad UX/UI/feature gaps beyond the headline node-commenting ask.
> This is the prioritized backlog for a future product-scoping run. Items map to
> `UNIT-12` unless noted. Each is a candidate feature, not an approved commitment.

## Commenting

| # | Gap | Value | Effort | Notes |
|---|---|---|---|---|
| 1 | **Threading / replies** (`parent_id`) | High — review conversations are inherently threaded | Medium | Schema change + recursive read + nested UI |
| 2 | **Resolve / unresolve** (`is_resolved`) | High — lets teams close answered questions | Small-Med | Schema + filter + toggle |
| 3 | **Edit / delete** (own comments) | Medium — typos are permanent today | Small | Soft-delete (`deleted_at`) + edit window |
| 4 | **@mentions** | Medium — direct questions to the estimator | Medium | Needs a recipient/team roster + parsing |
| 5 | **Attachments / images / markdown** | Medium — plain 1000-char text is limiting | Medium | R2 storage (bound) + sanitization |
| 6 | **Filtering + sorting** (by target/author/resolved, newest/oldest) | High — single flat list doesn't scale | Small-Med | Client-side over fetched set |
| 7 | **Inline / pinned comment affordance** on rows + nodes | High — the global-target flow is clunky | Small | Covered by UNIT-2/3 + active-target sync |
| 8 | **Unread / "new since last visit"** | Medium | Small | Compare last-seen timestamp |
| 9 | **Reply notifications** (recipient + owner) | High — currently owner-only email digest | Medium | Email (bound `EMAIL`) + optional in-app |

## Decision / response

| # | Gap | Value | Effort | Notes |
|---|---|---|---|---|
| 10 | **Undo / change response** | High — misclick = permanent | Small-Med | Needs owner policy (UNIT-7) |
| 11 | **Multi-stakeholder workflow** (approved-with-conditions, counter-sign) | Medium | Large | Product decision first |
| 12 | **RFI / question-as-first-class** | Medium | Medium | Distinct trackable artifact |
| 13 | **Mark-as-reviewed per section/sheet** | Medium | Medium | Per-node/per-tab state |
| 14 | **Surface signature/audit trail** in UI | Low-Med | Small | `signature_intent_hash` already stored (DEC-7) |

## Activity / transparency

| # | Gap | Value | Effort | Notes |
|---|---|---|---|---|
| 15 | **Activity feed on recipient page** | High — exists but not wired in | Small | UNIT-10c; filter to recipient-visible |
| 16 | **Realtime updates** (SSE/WS/DO) | High for collaboration | Large | `COLLAB_ROOMS` DO exists, unwired |

## Breakdown quality (match the estimate sheet)

| # | Gap | Value | Effort | Notes |
|---|---|---|---|---|
| 17 | **Nav panel node totals/counts** | Medium | Small | UNIT-10a |
| 18 | **Area-level donut** (or discipline↔area toggle) | Medium | Small-Med | UNIT-10b |
| 19 | **Tree "show more" per node** | Medium | Small | UNIT-4 |
| 20 | **No silent >500-row degradation** | Medium | Small | UNIT-5 |

## Export / workflow

| # | Gap | Value | Effort | Notes |
|---|---|---|---|---|
| 21 | **Export discussion** (PDF/CSV of comments + decision) | Medium | Medium | Comments are `share-print-hidden` today |
| 22 | **Version comparison / diff** between snapshot versions | Low-Med | Large | `snapshot_version_at_comment` captured but unused |

## Polish

| # | Gap | Value | Effort |
|---|---|---|---|
| 23 | Persist decision drafts across reload | Medium | Small (UNIT-7) |
| 24 | Full WAI-ARIA APG treeview keyboard nav | Medium | Medium |
| 25 | i18n (drop hardcoded `en-PH` locale) | Low-Med | Medium |
| 26 | Dynamic viewport height for mobile composer | Low | Small |

## Design-driven (research-backed — see `09-DESIGN-AND-UX-TARGET.md`)

| # | Gap | Value | Effort | Notes |
|---|---|---|---|---|
| 27 | **Anchored comment indicators** (per-row/per-node count chip) | High | Small-Med | D1; builds on UNIT-1/2/3 anchor model; Figma/Linear/Docs pattern |
| 28 | **Visible decision/audit record** (signer, time, version, e-approval honesty) | High | Small | D2; ACM Accountability pattern; surfaces existing `signature_intent_hash` (DEC-7) |
| 29 | **Mobile persistent decision CTA** | High | Small | D3; `StickyDecisionBar` is desktop-only today |
| 30 | **Wide-canvas split-pane at xl/2xl** (sticky tree rail) | High | Med | D4; codebase already defers this (`ShareContainer.tsx`); UNIT-13 |
| 31 | **Per-node cost roll-up as dominant hierarchy** (retarget donut+table to node) | High | Med | D5; UNIT-13; makes tree/donut/table one model |
| 32 | **Version / issue / validity metadata** near header | Medium | Small | D6; delivered free by populating `issuance` (BUG-9/UNIT-11) |
| 33 | **Privacy/security microcopy** near the decision | Medium | Small | D7; surfaces the existing strong privacy model as a trust signal |
| 34 | **Mobile Details horizontal-scroll cue** | Low | Small | D8; the `min-w-[760px]` table needs an obvious swipe affordance |

## Explicitly NOT a gap

| Item | Verdict | Evidence |
|---|---|---|
| **Estimate variants / alternates / scenarios** | **Not a gap** — no such concept exists | `10-VARIANTS-CLARIFICATION.md`. Component-library variants are a Workshop-Library concern (sibling pack). Estimate tabs are already fully published + surfaced. |

## Suggested sequencing

1. **Now (headline sweep):** items 7, 17, 18, 19, 20 + node commenting (UNIT-1/2/3)
   — together these make the breakdown genuinely match the estimate sheet and
   commentable at every level.
2. **Next (premium feel — research-backed):** items 27, 28, 29 (UNIT-14) — anchored
   indicators, decision/audit record, mobile CTA. Highest client-perceived value per
   `09-DESIGN-AND-UX-TARGET.md` Tier 1.
3. **Then (collaboration basics):** items 1, 2, 6, 9, 15 — threading, resolve,
   filter, notifications, recipient activity feed.
4. **Then (structural):** items 30, 31 (UNIT-13) — wide-canvas split-pane + per-node
   roll-up. High value, the codebase already defers it.
5. **Then (decision maturity):** items 10, 13, 14.
6. **Later (scale/polish):** items 5, 11, 16, 22, 32, 33, 34.

These are **candidates**, not commitments. The owner decides prioritization.
