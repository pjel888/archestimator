# 09 — Design & UX Target (research-backed)

> This doc closes the design/UX-depth gap flagged in the improve pass. It grounds
> the share page's target experience in 2025-2026 best-practice research and the
> existing alpha `DESIGN.md` language, so a fresh executor can make confident
> design decisions without re-discovery. **Read-only audit output; no code changed.**
> `DESIGN.md` is explicitly an **alpha-stage guide, not law** — defer to Philip on
> final design decisions; do not block or revert work on design-system grounds while
> the visual language is still developing.

## 1. The job this page does

A **non-technical client** opens a private link (usually from email, often on a phone)
to review a **building cost estimate** their architect/estimator sent. Their jobs:

1. **Understand the cost** — see the breakdown by area/trade, not just a bottom line.
2. **Ask questions in context** — "why is this line so expensive?" anchored to the item.
3. **Make a decision** — approve / request changes / decline, with confidence and an
   honest understanding of what their action means.
4. **Trust the process** — feel the estimate is controlled, versioned, private, and
   professionally presented.

The page is a **trust instrument as much as a cost document.** Every design decision
should increase the client's confidence that this is a serious, controlled, reviewable
artifact — not a spreadsheet dumped into a browser.

## 2. Current visual treatment (grounded)

From `DESIGN.md` (alpha) + component inspection:

- **Type:** SF Pro Text/Display, regular + medium only (no semibold/bold in product).
  Ink `#3D3D3D`, secondary `#5D5D5D`, tertiary `#7F7F7F`.
- **Proposal surface:** `#FFFDF8 proposalPaper` (paper), `#F2F2F2` hairline, xs=3px radius.
  Pages should "remain document-like."
- **/share px-cap exemption:** DESIGN.md permits the 12–24px sizes the share page uses
  (SummaryCard grand total `text-[24px]`, header `text-[22px] lg:text-[26px]`).
- **Width:** `ShareContainer` reserves up to 1440px (`2xl:max-w-[1440px]`) but content
  stays in a single 820px column. The wide-canvas split-pane is **explicitly deferred**
  (`ShareContainer.tsx` inline comment).
- **Privacy posture (a strength to preserve):** generic OG metadata (no totals/names
  leak to unfurl bots), password gate, recipient session, deferred telemetry.

## 3. Best-practice basis (research citations)

| Practice | Reference | Relevance |
|---|---|---|
| Object-anchored comments (count at anchor, threaded, resolve+filter) | Figma, Linear, Google Docs; "Commentful" | The page has the anchor *model* (`ShareReviewTarget`) but no anchor *visibility* |
| Approval-process design patterns (Single Point of Decision, Accountability, Conditional Approval, Recall/Undo) | ACM EuroPLoV "Design Patterns for Approval Processes" (Cerny et al., 2024) | The 3-button pattern is aligned; gaps are audit visibility + undo |
| WBS/CBS cost trees (roll-up at every node, progressive disclosure, sticky two-pane) | InEight, Trimble WinEst, CostOS, ProEst, PlanSwift | Archestimator has virtual root + search + pagination; gaps are sticky two-pane + per-node roll-up dominance |
| E-approval vs e-signature honesty | ServiceNow/Dynamics docs; PandaDoc/Proposify | The typed-signer-name is an e-approval, not a legal signature — make this explicit |
| Mobile-first email-embedded review (one primary CTA, ≥44px targets, no iOS auto-zoom) | Baymard, Stripo 2025 | Tap targets good; desktop-only StickyDecisionBar is the gap |
| Contextual trust signals near sensitive actions | LogRocket, Baymard perceived-security, Verlua (+42% conversion), Usercentrics 2025 | Strong privacy exists but is invisible at the decision moment |

## 4. Target improvements (prioritized by client-perceived value)

### Tier 1 — converts "document with a comment box" → "premium review workspace"

**D1. Anchored comment indicators + threading + resolve** (builds on GAP-1/UNIT-1/2/3
and the feature backlog UX-2/3/7). The single biggest lever.
- Per-row and per-node **count chip** showing open comments at the anchor (the
  `ShareReviewTarget` model already exists — surface it visually).
- Threaded replies under each anchor; **Open / Resolved / All** filter.
- Clicking the indicator jumps to / isolates that thread.
- Schema: `parent_id` (threading) + `is_resolved` (resolve) on `shared_link_comments`.

**D2. Visible decision / audit record** (trust signal + Accountability pattern).
- Once decided, render a durable **"Decision record"** block: signer name, timestamp,
  decision type, optional note, and the **estimate version/issue** it applied to.
- Add an honest one-liner distinguishing **e-approval** (what this is) from a legally
  binding **e-signature** (what it is not), so client expectations are correct.
- The `signature_intent_hash` is already stored (`public-repository.ts:959`) — surface
  it as a trust artifact, not just a DB column. (DEC-7 in the registry.)

**D3. Persistent mobile decision CTA** (mobile-first "one primary action visible").
- `StickyDecisionBar` is `hidden sm:block` — **desktop only.** On mobile the client must
  scroll to the bottom nav. Add a sub-md sticky bottom **"Review & respond"** primary
  CTA so a phone client never hunts for how to respond.

### Tier 2 — structural (high value, the codebase already defers it)

**D4. Wide-canvas split-pane at xl/2xl** (WBS/CBS sticky two-pane norm).
- At `xl`/`2xl`, switch from the single 820px column to a **sticky Summary tree rail +
  content pane.** The 260px tree panel already exists (`SharePageTabs.tsx:912-918`) —
  make it sticky and persistent at wide widths instead of a tab alternative. This makes
  the wide breakpoints feel intentional and gives the tree a permanent navigation role.

**D5. Per-node cost roll-up as the dominant hierarchy** (CBS at every WBS node).
- Every Summary tree node should display its roll-up total prominently (tabular-nums).
- A node click should **retarget the cost-breakdown donut AND the Details table** to that
  node's scope, so tree / donut / table feel like one coherent model instead of three
  independent surfaces. (Builds on UNIT-10a/10b.)

### Tier 3 — trust signals & polish

**D6. Version / issue / validity metadata** near the header. Compact
"Proposal v{n} · issued {date} · valid until {date}" line. The snapshot type already
declares `issuance` (`types.ts:121-134`) — **populating it (BUG-9) delivers this for
free.** Signals the estimate is a controlled, versioned artifact.

**D7. Privacy/security microcopy near the decision.** One calm line in the confirm
dialog: "Your name and decision are recorded for {firm}. This link is private to
{recipient email}." Surfaces the existing security model as a visible trust signal.

**D8. Mobile Details horizontal-scroll affordance.** The `min-w-[760px]` table in
`overflow-x-auto` (`SharePageTabs.tsx:823`) requires the client to discover horizontal
scroll on a 375px phone. Add a faint "swipe →" cue or a card-list alt for the first few
rows.

## 5. Design invariants (do not regress)

- **Paper, document-like feel** — keep `proposalPaper` / hairline / xs radius language.
  Do not turn this into a "dashboard."
- **Privacy-first** — keep generic OG metadata, password/session gates, deferred
  telemetry. Trust signals *surface* the existing model; they do not weaken it.
- **Tap targets ≥44px** (`min-h-11`), 16px+ inputs (no iOS auto-zoom).
- **LCP** — keep the `priority` cover image; don't regress first paint.
- **Defer to Philip** on final visual language while DESIGN.md is alpha.

## 6. Mapping to units

| Design target | Unit | Backlog |
|---|---|---|
| D1 (anchored comments + threading + resolve) | UNIT-1/2/3 (anchor) + UNIT-12 (threading/resolve) | UX-2/3/7/8 |
| D2 (decision/audit record) | UNIT-7 + UNIT-11 (signature surfacing) | DEC-7 |
| D3 (mobile decision CTA) | UNIT-11 (or a focused new slice) | new |
| D4 (wide-canvas split-pane) | new UNIT-13 | new |
| D5 (per-node roll-up + retargeting) | UNIT-10a/10b | #17/18 |
| D6 (version/validity metadata) | UNIT-11 (populate `issuance`, BUG-9) | new |
| D7 (privacy microcopy) | UNIT-11 | new |
| D8 (mobile scroll cue) | UNIT-11 | new |
