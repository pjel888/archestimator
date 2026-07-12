# 14 — UX Heuristic Evaluation (recipient inbox)

> Track 1 output (partial — the half of UX review that does NOT require `TEST_TASK`).
> This is a **heuristic / expert evaluation** against Nielsen + WCAG + the
> recipient-job, done by reading the rendered markup + interaction model from
> source. It is NOT browser-driven proof (that needs `TEST_TASK`). Where a
> finding can only be confirmed by running the page, it is flagged
> `NEEDS-RUNTIME` and feeds the authorized-browser slice.
>
> Why this exists: the owner said the bar is "genuinely higher than static
> audit." A heuristic UX pass is higher than pure code review — it evaluates the
> *experience*, not just the code — and it is producible without browser
> automation.

## Method

Evaluated the inbox's current-state markup/interaction against:
1. **Nielsen 10 heuristics** (visibility of system status, match real world, user control, consistency, error prevention, recognition over recall, flexibility, aesthetics, error recovery, help).
2. **WCAG 2.2 AA** perceptible/operable/understandable/robust.
3. **The recipient job** (Journey A-D from `03_TARGET_UX_UI_DESIGN.md`): "I received a proposal email → I want to find, review, and decide on it without friction."

Source under evaluation: `src/components/workshop/proposals-page/ProposalRow.tsx`, `proposals-page-client.tsx`, `ProposalsList.tsx`, `ProposalsEmptyState.tsx`, `ProposalsErrorState.tsx`, `ProposalsListSkeleton.tsx`.

---

## Nielsen heuristic findings

### H1 · Visibility of system status — WEAK

| Aspect | Finding | Severity |
|---|---|---|
| Manual refresh feedback | ✓ "Refreshing"/"Refresh" button label swap + `disabled` while fetching (`proposals-page-client.tsx:122-127`) | Good |
| Soft-error visibility | ✓ inline amber banner with `WarningCircle` (`:131-147`) | Good |
| **Background freshness** | ✗ **No "last updated" timestamp anywhere.** A recipient cannot tell if the list is 5s or 30s old. TanStack `staleTime 30s` + window-focus refetch is invisible to the user. | Medium |
| **Decision propagation** | ⚠ When a recipient decides on `/share/*` and navigates back, the inbox's decision chip updates only after refetch — **no "updating" state**. The list could show stale "New" for up to 30s after a decision. (`NEEDS-RUNTIME` to confirm perceived lag.) | Medium |
| Action in-flight | ✓ "Opening" button label during `isPending` (`ProposalRow.tsx:157`) | Good |

**Recommendation:** add a subtle "Updated {relative time}" line near the header (mirrors the projects-page pattern) and a brief "Updating…" shimmer when a refetch is in flight after a known mutation.

### H2 · Match real world — GOOD
- Language is plain: "Proposals," "Review," "Expires," "Decision submitted," "From {sender}." No jargon. Project codes and workspace names match the recipient's mental model. ✓

### H3 · User control and freedom — WEAK
| Aspect | Finding | Severity |
|---|---|---|
| Cancel an accidental "Review" click | ✗ **`openRecipientProposalAction` is a hard `redirect()`** (`actions.ts:378`). There is no "are you sure?" and no in-place preview. Clicking Review immediately navigates away from the inbox. Back-button returns, but the click was already committed. | Medium |
| Undo a decision | N/A — decisions happen on `/share/*`, not the inbox; and they're final by design (P1-7, DEC-AUTO-112). Not an inbox gap. | — |

**Recommendation:** this is by-design (Review = "go read it"), but a 1-tap redirect with no confirmation can feel abrupt. Consider an in-place expandable preview (drawer/sheet) instead of immediate navigation — matches the `03_TARGET_UX_UI_DESIGN.md` §4.2 spirit and removes the P2-16 version-swap surprise.

### H4 · Consistency and standards — MIXED
| Aspect | Finding | Severity |
|---|---|---|
| Visual language vs projects page | ✗ **Major inconsistency** — flat bordered table vs projects-page card grid. This is the dominant gap (P3-1) and the entire reason Track B exists. | High |
| Chip styling | ✓ consistent `getChipClassName` tones (`ProposalRow.tsx:59-64`) success/warning/danger/neutral | Good |
| Button usage | ✓ `Button variant="brand" size="sm"` consistent with share page | Good |
| Date format | ⚠ i18n locale floats (P2-15, DEC-AUTO-114). Inconsistent with a PH-first product. | Medium |

### H5 · Error prevention — WEAK
| Aspect | Finding | Severity |
|---|---|---|
| Wrong-email trap | ✗ A recipient signed in with the wrong email sees an empty inbox (`ProposalsEmptyState`) with **no hint that they might have proposals under another email**. The recovery affordance is a single reactive error string (`ProposalRow.tsx:67`) only shown after a failed open. This is the highest-impact UX gap for first users. | High |
| Disabled-row click | ✓ revoked/expired rows disable the Review button (`ProposalRow.tsx:77,151`) preventing navigation to dead links | Good |

**Recommendation (ties to AUTH-3):** make `ProposalsEmptyState` proactive — "Signed in as **{email}**. Expecting a proposal? It may have been sent to a different address." + a "Sign out" link. This is the single highest-leverage UX fix for beta.

### H6 · Recognition over recall — GOOD
- Each row carries workspace, project code, version, sent date, sender, decision, expiry, last activity. The recipient does not need to remember anything. ✓

### H7 · Flexibility and efficiency — WEAK
- **No search, no sort, no filter, no view modes.** A recipient with 10+ proposals cannot quickly find one. This is the core Track B work (`04` parity gap). | High for scaling, Low at current beta volume.

### H8 · Aesthetics and minimalist design — MIXED
- The row layout is clean and not cluttered. ✓
- But the overall page is sparse and feels like a dev prototype vs the polished projects page (P3-1, P3-2 dashed-border empty state).

### H9 · Error recovery — GOOD
- Hard error → `ProposalsErrorState` with targeted copy ("Sign in with the email address that received the proposal" for unauthorized). ✓
- Soft error → inline banner + Retry with auto-focus (`focusRetryAfterFailureRef`). ✓

### H10 · Help and documentation — MISSING
- No inline help, no "what is a proposal?" tooltip, no link to an explanation of expiry/decision. For first-time recipients this is a gap. | Low (beta; the flow is simple enough that help may be unnecessary).

---

## WCAG 2.2 AA findings

| Criterion | Status | Evidence |
|---|---|---|
| **1.4.3 Contrast (AA)** | `NEEDS-RUNTIME` | Tokens (`text-tertiary`, `text-secondary`) must be checked at computed values; cannot confirm from class names alone. Flag for browser pass. |
| **2.1.1 Keyboard** | PASS | All controls are native `<button>`/`<input>`; Tab/Enter/Space work. Refresh button, Review button, Retry button all focusable. |
| **2.1.2 No keyboard trap** | PASS | No modals/dialogs on the inbox; focus flows naturally. |
| **2.4.3 Focus order** | PASS | DOM order matches visual order (header → list → rows → action). |
| **2.4.7 Focus visible** | `NEEDS-RUNTIME` | `focus-visible:ring-2` classes are present (`proposals-page-client.tsx:122`, `ProposalRow.tsx` via `Button`), but computed visibility needs a run. |
| **3.3.1 Error identification** | PASS | `role="alert"` on row error (`ProposalRow.tsx:161`); `role="status"` on soft banner (`:132`). |
| **3.3.2 Labels or instructions** | PASS | Search has no current component; Refresh button has text label; hidden `publicationId` is not user-facing. |
| **4.1.2 Name, Role, Value** | MIXED | Chips are decorative `<span>` with text labels (ok); but **the list has no `role="list"`** (P3-3) — screen readers won't announce it as a list of items. |
| **1.3.1 Info and relationships** | MIXED | `<article>` + `<h2>` per row is good; missing `role="list"`/`role="listitem"` (P3-3). |

**WCAG summary:** keyboard-operable and error-announced (good); the open a11y gaps are P3-3 (list semantics) and contrast/focus-visible verification (needs runtime).

---

## Recipient-job friction map (Journey A-D)

### Journey A — "I got an email, I want to review the proposal"
- **Friction 1 (HIGH):** if signed in with the wrong email, the inbox is empty with no guidance (H5). The recipient may conclude "it didn't work" and abandon.
- **Friction 2 (MEDIUM):** clicking Review is an immediate redirect with no preview (H3). If they wanted to compare two proposals, they lose the list context.
- **Otherwise:** the flow (find row → click Review → land on `/share/<token>`) is 2 clicks. Good.

### Journey B — "I have many proposals, I want to find a specific one"
- **Friction (HIGH at scale):** no search/sort/filter. At 10+ proposals this is painful. Track B work.

### Journey C — "I want to see my expired/revoked proposals"
- **Friction (LOW):** they're in the list with disabled buttons and clear tombstone copy. Fine. Tabs (Track B) would help but isn't blocking.

### Journey D — empty state
- **Friction (HIGH):** the dashed-border empty state with no wrong-email hint (H5) is the weakest moment for a new recipient.

---

## Prioritized UX recommendations (non-`TEST_TASK`, producible now)

| # | Recommendation | Severity | Surface | Track |
|---|---|---|---|---|
| UX-1 | **Proactive wrong-email recovery** in `ProposalsEmptyState` ("Signed in as {email}… may have been sent to a different address" + sign-out link) | High | `ProposalsEmptyState.tsx` | B8 (already scoped) — **promote to P2** |
| UX-2 | **"Updated {relative}" freshness indicator** + refetch shimmer | Medium | `proposals-page-client.tsx` header | Track B polish |
| UX-3 | **Decision-propagation affordance** — brief "Updating…" when a refetch follows a known mutation | Medium | client | Track B polish |
| UX-4 | **Glass-card empty state** (replace dashed-border) | Medium | `ProposalsEmptyState.tsx` | B8 |
| UX-5 | **In-place preview** instead of immediate redirect on Review (drawer/sheet) | Medium | new component | Track B option |
| UX-6 | **`role="list"`/`role="listitem"`** semantics | Low (P3-3) | `ProposalsList.tsx`/`ProposalRow.tsx` | Track A or B |

## What this evaluation cannot close (`NEEDS-RUNTIME`)

- Computed color contrast at rendered values (WCAG 1.4.3).
- Computed focus-visible ring visibility (WCAG 2.4.7).
- Actual decision-propagation perceived lag after a real `/share/*` decision.
- Mobile layout at a real 375px viewport (markup suggests graceful stacking, but rendering confirms).
- Real screen-reader announcement order (NVDA/VoiceOver).

These five items are the exact scope of the authorized-browser slice. They are
recorded here so that when the owner issues `TEST_TASK`, the browser lane knows
precisely what to verify.
