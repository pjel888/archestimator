# 05 — UX, UI, and Accessibility Plan

---

## Primary owner journeys

### J1 — Send a proposal to a client (desktop)
1. Workshop → Publisher → roster row → **Manage** → drawer **Recipients** tab.
2. Type recipient email(s) → chips → **Send**.
3. Per-recipient status chip: `sent` → (honest label). Copy link available.
4. (Optional) **Settings** → set/clear password, set expiry.
5. Watch **Activity** tab for client open/decision (honest labels per ASSUMP-4).

### J2 — Send a proposal to a client (mobile) — depends on DEC-MOBILE
- **Option A (mobile layout):** Publisher → mobile card list (not table) → tap card → drawer (full-width sheet) → Recipients → Send. Critical path works at 375px.
- **Option B (desktop guard, recommended):** Publisher on mobile shows an honest "Heavy sender actions need a wider screen" message + a one-tap **copy current URL** + a per-publication deep link `?drawer=<projectId>&tab=recipients` that, on desktop, opens straight to the Recipients tab (the `readDrawerIntent` plumbing at `PublisherRosterClient.tsx:88-97` already supports this). Read-only browsing of roster status remains available on mobile.

### J3 — Resend to a recipient who lost the email
- Drawer Recipients → chip → **Resend**. If `opened/responded` → confirm modal (status-downgrade warning). Rate-limited → "try in N min." Success → new link; failure → prior link intact.

### J4 — Revoke a proposal (destructive)
- Drawer Settings → **Revoke** → ConfirmDialog ("recipients can no longer open the link") → `revoked` badge → copy/open disabled → recovery note ("republish to create a new link").

### J5 — Rotate a leaked link
- Drawer Settings → **Rotate link** → confirm ("existing recipient email links will stop working; resend to re-enable") → new link → recipients show "needs resend."

### J6 — Confirm a client accessed the proposal
- Drawer **Activity** tab + Recipients chip `delivery_status` (honest label).

### J7 — Recover from a failed send
- Recipients chip shows `failed` → **Retry** affordance → bounded retry. If provider down (circuit breaker `transactional-email-client.ts:98`), show "Email delivery temporarily unavailable."

---

## Sender action state matrix (consolidated)

| Action | Idle | Pending | Success | Failure | Recovery | Disabled | Mobile reachability |
|---|---|---|---|---|---|---|---|
| Generate (publish/republish) | "Publish" / "Update" | spinner + disabled action, aria-label | new link + copy + toast/live-region | specific error toast + retry | failed generate leaves prior state intact | no estimates selected / not manager | DEC-MOBILE |
| Copy link | "Copy" | (instant) | "Copied" + live-region | "Copy failed" + visible URL fallback | manual copy from fallback | `!clientLinkPath`/viewer redaction | DEC-MOBILE |
| Email (add) | input + chips | per-chip sending | `sent` chip (honest label) | `failed` chip + retry | retry per recipient; circuit-breaker message | `emailDeliveryConfigured=false` / ≥50 | DEC-MOBILE |
| Resend | "Resend" | spinner | new `sent` | "rate-limited: try in N min" / "failed, prior link active" | retry after window; prior link intact | unsubscribed / self / rate-window | DEC-MOBILE |
| Revoke | "Revoke" | spinner | `revoked` badge + copy/open disabled | error toast + retry | confirm-gated destructive | already revoked / not manager | DEC-MOBILE |
| Confirm client access (view) | — | loading skeleton | activity + status chips | error boundary | retry load | read-only viewer (limited) | DEC-MOBILE |
| Rotate (related) | "Rotate link" | spinner | new link + "recipients need resend" | error toast + retry | confirm-gated | not manager | DEC-MOBILE |

---

## DEC-MOBILE — Mobile decision (owner-delegated planning decision)

> Owner-delegated per `Multi-Agent-Execution-Directive.md` §13 (planning-only task; reversible planning/product decision). Philip retains final say.

**Problem:** the sender surface is fully blocked below 768px.

**Options considered:**

| Option | Description | Pros | Cons | Mobile reachability |
|---|---|---|---|---|
| **A — Full mobile layout** | card list + full-width drawer; all actions at 375px | maximum owner operability; no "blocked" message | significant build/test cost; risk of cramped destructive actions; diverges from `DESIGN.md` "dense editing → simplified flows" | Full |
| **B — Desktop guard + deep link (RECOMMENDED)** | keep the 768px guard for *heavy* sender actions, but (1) make the mobile message honest + actionable, (2) add one-tap "copy current URL", (3) ensure `?drawer=&tab=` deep links open the right drawer on desktop, (4) allow read-only roster status browsing on mobile | aligns with `DESIGN.md:519-524`; cheap; honest; recoverable; reuses existing `readDrawerIntent` plumbing | owners must switch devices to send/resend/revoke | Guarded with recovery |
| **C — Hybrid** | mobile can view + copy + open link, but email/resend/revoke/rotate require desktop | partial operability; middle cost | two mental models; more test surface | Partial |

**Recommendation: Option B** (desktop guard + deep link). Rationale:
1. `DESIGN.md:519-524` explicitly de-scopes dense editing on mobile and prioritizes preview/list — a deliberate guard is the documented product decision the PROMPT asks for.
2. The destructive/high-stakes actions (revoke, rotate, email blast to 50 recipients) are safer on a wide screen with confirmation dialogs.
3. The deep-link + copy-URL recovery path reuses `readDrawerIntent` (`PublisherRosterClient.tsx:88-97`) — minimal new surface.
4. Cheapest to ship before first users; reversible (can upgrade to A later).

**Conditions that would change the decision:** if closed-beta owners report they primarily use phones to *send* proposals, escalate to Option A or C.

**Proof path (implementation):**
- DOM test: mobile message text + copy-URL affordance present at 375px.
- DOM/route test: deep link `?drawer=<id>&tab=recipients` opens the drawer to the Recipients tab on desktop.
- Playwright @375px: assert the guard message and the copy-URL button.

**Status of this requirement regardless of decision:** REQ-PS-01 is satisfied at planning level once DEC-MOBILE is documented with options/recommendation/proof (it is, here). Implementation tasks in `11` branch on the chosen option (Option B is the planned path; tasks are written for B with an explicit branch note for A/C).

---

## Screen/component states (per `Creating-Plan-Prompt.md` §8A)
- **Loading:** `PublisherRosterSkeleton`; drawer query `staleTime 10s` + `enabled: open && projectId`.
- **Empty:** `PublisherNoRowsEmptyState` variants `no-publications` / `filtered` / `mobile`.
- **Success:** toasts/live-regions per action (see matrix).
- **Error:** route `error.tsx` boundary; per-action error toasts; resend/copy failure inline states.
- **Disabled:** not-manager (read-only viewer) → redacted `clientLinkPath`; `emailDeliveryConfigured=false`; rate windows; already-revoked.
- **Offline/degraded:** clipboard fallback; email circuit-breaker message; TanStack Query retry/`staleTime`.
- **Confirmation:** revoke/rotate/resend-of-opened confirm modals (destructive variants).
- **Recovery:** documented per action (matrix).

## Accessibility
- **Keyboard:** every action reachable; drawer focus trap + restore (`restoreManualDrawerFocus` `PublisherRosterClient.tsx:165-172`).
- **Focus order:** logical; confirm-modals move focus to the destructive button's cancel.
- **Screen reader:** live-regions for copy (`:269-273`) and toasts; `aria-busy` on roster (`:181`); drawer labelled.
- **Semantics:** reuse `src/components/ui/*` (`DropdownSelect`, `Tabs`, `Modal`, `ConfirmDialog`, `SheetDrawer`) — no ad hoc div-buttons.
- **Contrast/non-color cues:** status uses icon + text (e.g., `Monitor` icon for mobile, per `PublisherEmptyState.tsx:30`), not color alone.
- **Responsive:** 320/375/768px tested; no clipped actions.
- **Reduced motion:** honor `prefers-reduced-motion` (no new heavy motion introduced).

## Design-system reuse (no new primitives unless needed)
- `SheetDrawer` (drawer), `Modal`/`ConfirmDialog` (confirmations), `DropdownSelect` + `Tabs` (filters), `PublisherNoRowsEmptyState` (empty states), existing chip pattern in `RecipientEmailComposer`.
- No new design tokens required for Option B. (If Option A is chosen later, new responsive drawer sizing may be needed — flagged, not planned.)
- `DESIGN.md:547-548` respected: no inner-content gradients; keep `.publisher-canvas-wash` only.

## Action-level accessibility proof matrix (required by Improve-Plan §3)

For every owner sender action: keyboard path, focus target/restoration, accessible name + live-region behavior, and proof type.

| Action | Keyboard path | Focus target / restoration | Accessible name + live-region | Proof type |
|---|---|---|---|---|
| Generate (publish/republish) | Tab to "Publish"/"Update" button → Enter/Space | focus stays on button while pending; on error focus moves to alert | `aria-label="Publish proposal"`; pending → `aria-busy`; success → polite live-region toast | DOM test (keyboard + aria-busy + live-region) |
| Copy link (roster row + drawer) | Tab to "Copy" button → Enter | focus stays on button; "copied"/"failed" announced | `aria-label="Copy share link"`; live-region pattern at `PublisherRosterClient.tsx:269-273` | DOM test (keyboard + live-region) |
| Email recipients (add) | Type → Enter/comma → Tab to "Send" → Enter | focus returns to input after add; send button labelled | input `aria-label`; per-chip `aria-label` w/ status; send disabled state announced | DOM test (keyboard + chip labels) |
| Resend | Tab to chip "Resend" → Enter | confirm modal: focus to **Cancel** (destructive-default-safe); restore to chip on close | `aria-label="Resend to <recipient>"`; rate-limit/"prior link active" polite live-region | DOM test + Playwright (modal focus) |
| Revoke | Tab to Settings → "Revoke" → Enter → confirm | confirm modal: focus to **Cancel**; restore to Revoke button | `aria-label="Revoke publication"`; consequence text in dialog; post-state `revoked` badge announced | DOM test + Playwright (modal focus + restore) |
| Rotate | Tab to "Rotate link" → Enter → confirm | confirm modal: focus to Cancel; restore | `aria-label="Rotate share link"`; "recipients need resend" announced | DOM test + Playwright |
| Confirm client access (view Activity) | Tab into Activity tab → reads events | focus into feed region | tab `aria-label`; event items semantic; empty state labelled | DOM test (tab + live-region) |
| Mobile recovery: "Copy current URL" (Option B) | Tab to button → Enter | focus stays; "copied" announced | `aria-label="Copy link to open on desktop"`; live-region | Playwright @375px (keyboard + live-region) |
| Open link (roster row) | Tab to "Open" → Enter | opens new tab (`target`); focus management is browser-native | `aria-label="Open shared proposal"` | DOM test |

**WCAG 2.2 AA alignment (user-facing):** keyboard operable (2.1.x), visible focus (2.4.7), semantic HTML/landmarks (1.3.1, 4.1.2), accessible names (4.1.2), live-region announcements (4.1.3), no color-only status cues (1.4.1), reduced-motion (2.3.3), contrast (1.4.3), target size on mobile (2.5.8). Reduced-motion: no new heavy motion introduced; honor `prefers-reduced-motion`.

## Dense/large-data layout note (Improve-Plan §3)
The roster is a dense table (`min-w-[920px]`, `PublisherRosterClient.tsx:231`). Per DEC-MOBILE Option B, on mobile the dense table is **deliberately not squeezed** — the guard shows the honest message + recovery. This is an explicit non-goal preventing "squeezed table" UX; it aligns with DESIGN.md:519-524. (No marketing-page drift; this is workflow software.)

## Visual QA gate (Improve-Plan §3)
A visual-QA gate table is **not required** for Option B: the change is a message + button + help text, provable by DOM tests + targeted Playwright @375px (no layout collision, status occlusion, real-focus, zoom/reflow, or drag/drop behavior that static/DOM tests cannot prove). If Option A (full mobile layout) is later chosen, a visual-QA gate table becomes required and must be added here.

## UX regressions to guard
- Removing the 768px guard without a replacement layout would show a broken squeezed table → guarded by DEC-MOBILE (we keep the guard, improve the message).
- Deep-link drawer opening must not steal focus or auto-scroll disruptively on desktop.
- Resend rate-limit message must be specific (window), not generic.
