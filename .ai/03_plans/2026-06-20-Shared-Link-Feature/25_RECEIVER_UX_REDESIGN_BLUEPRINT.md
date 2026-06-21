# 25 — Receiver Page UX/UI Redesign Blueprint (`/share/[token]`)

Date: 2026-06-21 · Status: **DESIGN DIRECTION — owner review required (DESIGN.md is an alpha guide, not law)**
Lens: `/impeccable` · Owner decision-maker: Philip · Implementing lane: frontend + design-system

> This blueprint exists because the owner judged the Shared-Link experience to have **bad UX/UI**.
> Doc [20](20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md) rated the surface "12/20 — acceptable"; that score
> measured a11y/token hygiene, **not** whether a non-technical client trusts and approves a high-value
> proposal. On that question the surface fails. This is the **redesign plan** to fix it. It is grounded
> in a source-level, user-POV teardown of the real components and the project's own design system
> (`PRODUCT.md` "Editorial public, compact private"; `DESIGN.md` `proposalPaper`/Source Serif/`/share`
> type exemption). Companion: [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) (sender side),
> verification in [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md), decisions in
> [71](71_OPEN_DECISIONS_REGISTER.md).

---

## 1. Who this is for, and the one job

**Persona — "the Client."** A non-technical homeowner / small-business owner / facilities manager who
receives an emailed link to a high-value construction proposal and opens it **on their phone, with no
account and no login.** They have never seen a bill of quantities. They are spending a lot of money and
are anxious.

**Job-to-be-done.** *"Help me understand exactly what I'm paying for and trust that the number is fair
and complete, so I can confidently approve it (or ask one clear question) from my phone — without feeling
I'm signing something I don't understand or being rushed past the details."*

**The business stakes.** This page **is** the close. Every gram of confusion or distrust converts a
signature into a "let me call you / let me think about it / silence." The current page manufactures
exactly that hesitation.

---

## 2. Current-state verdict — what the client actually feels

Source-grounded teardown of `src/app/share/[token]/page.tsx` and `src/components/share/*`. Severity is
**client-trust impact**, not engineering risk.

| # | Sev | What the client feels | Root cause (file:line) |
|---|:--:|---|---|
| R-1 | **P0** | *"Are these numbers even right? It says 'reconstructed' and 'may differ.'"* | The internal fidelity caveat **"Reconstructed from estimate data (may differ from internal workspace view)"** is shown to the client at the top of the estimate. `SharePageTabs.tsx:666` → `ShareEstimateTreeView.tsx:307-311`. **The single most trust-corrosive string on the page, at the price.** |
| R-2 | **P0** | *"This is the contractor's back-office software, not a proposal for me."* | The estimate is the internal workshop authoring UI shown verbatim — `WorkshopTree`, "Search Tree", expand/collapse icon toolbar, "Sheets" tab, "Tree View \| Grid Preview", a discipline donut, qty/unit columns, 12–13px SF Pro on `bg-white`. `ShareEstimateTreePanel.tsx:399-422`, `SharePageTabs.tsx:440-477,572-651`, `page.tsx:76`. Violates `PRODUCT.md#5` and ignores `proposalPaper`/Source Serif that `DESIGN.md` reserves for this surface. |
| R-3 | **P0** | *"They want me to approve before I've read it — and once I click it's FINAL."* | Decision bar renders **above** the hero and estimate (`page.tsx:84` before `:88/:90`); confirm copy is one-shot and cold: **"Your decision will be final."** (`SharePageDecision.tsx:50-53`); Decline is a **red danger** button (`:282-290`). Maximizes fear at the conversion moment. |
| R-4 | P1 | *"Sign in? I don't have an account. Did I do something wrong?"* | First element above the firm/proposal is a grey strip **"Sign in as a recipient…"** (`SharePageSessionBanner.tsx:56`); read-only states say "open the personalized review link" (`SharePageDecision.tsx:131-147`). Account vocabulary on a **no-login** surface; forwarded/lapsed visitors dead-end. |
| R-5 | P1 | *"What am I actually buying, and is this firm legit?"* | No firm name/logo, no preparer, no scope sentence, no inclusions/exclusions, no payment terms, no "valid until", no contact. Header/summary promote **estimator metadata** (Sheets, Line items, Currency, row counts). Only brand is the footer "Shared via Archestimator". `SharePageProposalHeader.tsx:7-30`, `SharePageSummaryCard.tsx:41-53`. |
| R-6 | P1 | *"Why is it showing me a log of every time I opened this?"* | Owner-oriented `SharedLinkActivityFeed` (audit log, "Activity logged for security") rendered on the **client** at 8–10px (`SharedLinkActivityFeed.tsx:99,117-120,145-147,175`). Surveillance-flavored; the sub-9px type also fails AA. |
| R-7 | P2 | *"I have to scroll all the way back up to approve."* | Decision controls are a static block near the top, **not a sticky mobile action bar**; after the long estimate the client scrolls back up. `SharePageDecision.tsx:261-302`. |
| R-8 | P2 | *"I can only see some items unless I 'refine the filter.'"* | Grid caps at 250 with "Refine the filter to narrow the list" (`SharePageTabs.tsx:642-647`); "Discipline/Sheets/Tabs/Line items" jargon throughout. Admin-tool framing of the thing the client is buying. |

**Diagnosis:** the receiver page is the **dense private app register pointed at a client**. The product's
own rules say the opposite: `PRODUCT.md#5` *"Editorial public, compact private"* and `DESIGN.md` ship
`proposalPaper #FFFDF8`, `proposal-body` (Source Serif 4, 15px), and an explicit `/share` type-scale
exemption — **none of which the page uses.** The fix is not polish; it is **re-registering the surface
as a document.**

---

## 3. Design principles for this surface (the contract)

1. **It is a document, not a dashboard.** Warm `proposalPaper #FFFDF8` paper floating on the grey canvas; one soft shadow + hairline; 12px outer radius; 32px padding. (`DESIGN.md` proposal-page rules.)
2. **Editorial register, not 10px density.** Source Serif 4 `proposal-body` for the headline + prose; SF Pro **tabular numerals** for money. The `/share` px-exemption is *for exactly this*. Do not impose the 8-hour-workday 10px scale on a one-time anxious reviewer on a phone.
3. **Read → understand → decide.** A narrative spine, not a stack of widgets. The decision moment comes **after** comprehension, and is **always one tap away** on mobile.
4. **Translate every word.** No "Sheets / Tabs / Tree View / Grid Preview / Discipline / Line items / Reconstructed / session / sign in / Activity log." Client language only.
5. **Trust is the product.** Firm identity, scope, inclusions/**exclusions**, validity, terms, a credible signature + audit trail. *"When the product delivers a number, that number is trustworthy"* (`PRODUCT.md`).
6. **Restraint.** Strong-neutral primary action (`#292929`/`#3D3D3D`), success-green only for the confirmed/approved state, clay orange at most one quiet accent — never a surface fill. Radii strictly 3/8/12. Weights 400/500. No construction clichés, no SaaS hero metrics, no glassy depth, no color-only meaning (WCAG AA).

---

## 4. The redesigned experience — narrative spine

Replace the current order (`Header → Total → DECISION → Hero → Tabs/Tree/Grid → Comments → Activity log`)
with a document that reads top to bottom and lands on one calm action:

```
┌──────────────────────────────────────────────────────────┐  proposalPaper #FFFDF8
│  ▸ MASTHEAD     [Firm logo]  ·  Prepared for Jane Okafor  │  paper surface, 12px radius,
│                 Proposal · Kitchen Renovation · #KR-204    │  one soft shadow, canvas gutter
│                 Valid until Jul 18, 2026 · Prepared by AL  │
├──────────────────────────────────────────────────────────┤
│  ▸ COVER (full-bleed, no "Project cover" chip)            │  emotional confidence anchor
├──────────────────────────────────────────────────────────┤
│  ▸ OVERVIEW   (Source Serif) 2–3 sentence plain-language  │  "Here's what we'll do and why"
│               scope summary — what's included at a glance │
├──────────────────────────────────────────────────────────┤
│  ▸ INVESTMENT  ₦ 12,480,000   ← grand total, ink, serif/  │  financial hierarchy:
│                tabular, large                              │  total → materials/labor →
│                Materials 7.1M · Labour 3.9M · Markup 1.4M  │  markup/contingency/tax
├──────────────────────────────────────────────────────────┤
│  ▸ WHAT'S INCLUDED   collapsible scope groups             │  replaces Tree/Grid/donut
│     ▾ Demolition & prep            ₦ 980,000              │  plain-language group names,
│        · Remove existing units  …  qty/unit  amount       │  subtotal per group,
│     ▸ Cabinetry & joinery          ₦ 4,210,000           │  detail one tap away
│     ▸ Electrical & lighting        ₦ 1,150,000           │
├──────────────────────────────────────────────────────────┤
│  ▸ THE FINE PRINT  Inclusions · Exclusions · Owner-       │  first-class trust blocks,
│     supplied items · Payment terms · Warranty · Validity  │  never a buried footer
├──────────────────────────────────────────────────────────┤
│  ▸ QUESTIONS FOR [FIRM]   (was "Discussion")              │  message your contractor
└──────────────────────────────────────────────────────────┘
   ┌───────────────────── sticky on mobile ─────────────────┐
   │  [ Approve proposal ]   Request changes   ·  Decline   │  one primary (strong neutral),
   └────────────────────────────────────────────────────────┘  soft secondary, quiet tertiary
```

### 4.1 Masthead & cover — credit the firm, anchor trust
- Firm **name + logo** (the contractor the client hired), `Prepared for {client} · {project} · #{code}`, `Valid until {date}`, `Prepared by {preparer}`. Remove the duplicated "Prepared for your review" (`SharePageProposalHeader.tsx:20,22`).
- Cover image full-bleed; **remove the literal "Project cover" chip** (`SharePageHero.tsx:42-44`). If any label is needed, place it outside the image (R-2/RUX-14 contrast — see [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md)).
- The page brands the **firm**, not "Shared via Archestimator" (demote that to a tiny, optional, neutral footer line).

### 4.2 Overview + Investment — money presented credibly
- A 2–3 sentence Source Serif scope summary *before* any line items (`DESIGN.md` "summary table before detailed BOQ").
- Single strong **grand total** in ink `#3D3D3D`, tabular numerals, document scale — never tertiary/muted grey (violates the financial-hierarchy rule **and** WCAG AA). Hierarchy beneath: materials/labour → markup/contingency/tax. Deltas/exclusions pair color **with a sign/arrow/label** (AA 1.4.1).

### 4.3 "What's included" — the core rebuild (replaces R-2/R-8)
- **Delete the dual Tree/Grid paradigm and the workshop tree import for the client view.** A layperson cannot choose between two data-navigation modes and must not see the estimator's authoring sidebar.
- New **`ShareScopeGroups`** component: collapsible **plain-language groups** (area/section names), each showing line items (description · plain qty/unit · amount) and a **group subtotal**, with a clear grand total. Default to a calm, mostly-expanded read; detail-on-demand, not a 250-row table with a filter.
- The discipline donut is dropped, or relabeled **"Where your budget goes"** with client words — optional, below the fold.
- **No truncation language.** The client sees everything they're buying; performance caps stay invisible (virtualize if needed — see [50](50_PERFORMANCE_SPEED_AUDIT.md) PERF-06/07).

### 4.4 The decision moment — de-risk the conversion (R-3)
This is the money. Redesign for a nervous layperson:
- **Order:** decision lives **after** the estimate; on mobile a **slim sticky "Respond" bar** is always one tap away and expands into the decision sheet.
- **Hierarchy & color:** **"Approve proposal"** = one calm strong-neutral primary; **"Request changes"** = prominent, easy secondary (the soft middle path that prevents silent drop-off); **"Decline"** = quiet tertiary **text link**, *not* a red danger button.
- **Copy:** replace **"Your decision will be final."** with reassuring next-steps: *"We'll let {firm} know right away. You can still message them with questions below."*
- **Confirmation:** a warm **success-green "Approved"** receipt state with what-happens-next and an audit-trail line (signer + timestamp) so the high-stakes click feels safe, real, and acknowledged.
- **Open product question:** whether "Approve" should capture a **named e-signature** (legally-credible, DocuSign-style) — strong premium/trust signal. → new decision **D11** in [71](71_OPEN_DECISIONS_REGISTER.md).

### 4.5 Questions, not "Discussion" (R-6 / R-4)
- Rename the comments panel **"Questions for {firm}" / "Message your contractor."** Keep the existing safe plumbing (sanitized, rate-limited, recipient-session-gated — see [10](10_SECURITY_PRIVACY_API_AUDIT.md)).
- **Remove the owner security/activity log from the client view entirely** (`page.tsx:96-101`); it belongs to the manager (see [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md)). This also retires the worst sub-9px type on the page.
- Translate session language: replace "Sign in as a recipient" / "recipient session required" with friendly no-login copy, and give forwarded/lapsed visitors a graceful **"Need a fresh link? Contact {firm}"** fallback instead of a dead-end.

---

## 5. Before → after (the felt difference)

| Moment | Today | Redesigned |
|---|---|---|
| First impression | White web app, "Sign in" grey strip | Warm paper document, firm masthead |
| The estimate | Workshop tree + grid + donut + "reconstructed… may differ" | "What's included" plain-language scope groups |
| The number | 24px total among row-count stats | Strong ink total with credible hierarchy |
| Trust blocks | Absent / buried | First-class inclusions/exclusions/terms/validity |
| Decide | Final-and-red, above the fold | Approve (calm) after reading, sticky, reassured |
| After approving | (cold) | Success-green receipt + "what happens next" |
| The voice | SF Pro 10–13px admin | Source Serif editorial + tabular money |

---

## 6. Mapping to existing findings & decisions

This blueprint **subsumes and supersedes** the receiver polish items, reframing them as one redesign:
- Closes the intent behind **RUX-05** (AA copy), **RUX-07** (mobile context), **RUX-13** (`#FFFDF8` → the surface *becomes* paper, so the token is applied, not drifted), **RUX-14** (cover contrast — label leaves the image).
- Reframes **RUX-10 vs SHF-01**: the client does **not** get the activity feed at all (removed), so SHF-01 (owner realtime) is purely a manager-side concern → [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md)/D7.
- Triggers decisions **D1** (republish reload — now also a UX problem: a reading client must not be yanked), **D2** (expose exact `project.location` — the masthead makes this visible; recommend client-safe city/region default, see [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md)), **D6** (nav contract — *resolved here*: single-column document is canonical; no floating rail), **D11** (e-signature).

---

## 7. Phasing (quick wins → structural)

| Phase | Scope | Effort | Lands |
|---|---|:--:|---|
| **A — Trust quick wins** | Delete "reconstructed… may differ"; remove client activity log; remove "Project cover" chip; humanize session/comments copy; move Decline to tertiary text link; rewrite the "final" confirm copy. | S | Biggest trust gain for least code; no schema change. |
| **B — Register flip** | `proposalPaper` background + Source Serif headline/overview; firm masthead + trust blocks (inclusions/exclusions/terms/validity); financial hierarchy total card. | M | Page reads as a document. |
| **C — Scope groups** | Build `ShareScopeGroups`; retire the workshop `WorkshopTree`/Grid/donut from the client view; drop truncation language. | L | Core "what's included" rebuild. |
| **D — Decision flow** | Sticky mobile Respond bar; guided Approve → success-green receipt + audit line; (pending D11) e-signature capture. | M | The conversion moment. |

Each phase is independently shippable and independently visual-QA'd in
[85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md). Phase A is reversible and could ship this week.

---

## 8. Acceptance criteria (UX "done" for the receiver)

Given a non-technical client on a 390px phone with a multi-sheet proposal:
- **AC-R1** No estimator jargon is visible (grep the rendered receiver tree for "Sheets/Tabs/Tree View/Grid Preview/Discipline/Line items/Reconstructed/Sign in/session/Activity log" → zero client-facing hits).
- **AC-R2** The page background is `proposalPaper #FFFDF8` and the headline/overview render in Source Serif 4; the grand total is ink `#3D3D3D` tabular, ≥ document scale, **never** `#7F7F7F`.
- **AC-R3** Inclusions, **exclusions**, payment terms, validity, and firm identity are all present and findable without scrolling into a footer.
- **AC-R4** The primary action is reachable within one tap at any scroll position (sticky), labeled "Approve proposal"; Decline is a tertiary text link; no `variant=danger` red button at the decision moment.
- **AC-R5** Approving yields a success-green confirmation with "what happens next" and an audit line; the confirm copy contains **no** "final" language.
- **AC-R6** Every state passes the matrix in [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md): no horizontal overflow at 320/390/768, focus-trap reachable, AA contrast on all text incl. cover label.
- **AC-R7** A forwarded/lapsed (no-session) visitor sees a friendly explanation + "contact {firm}" path, never a dead-end or "sign in" wall.

Verification: the Storybook state matrix + viewport pass in [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md)
(this overrides the Codex "browser-automation-not-a-default-gate" guardrail for the client-facing surface,
because visual trust is the deliverable). Security/plumbing invariants from [10](10_SECURITY_PRIVACY_API_AUDIT.md)
and [40](40_TEST_QA_ULTRAQA_MATRIX.md) must remain green — **the redesign is presentation-layer; it must
not touch the sanitization, CSRF, snapshot-version, or no-store contracts.**

---

## 9. North star

*A non-technical client opens the link on their phone and meets a calm, editorial document on warm
proposal paper — the firm's name, a confident serif headline, an evocative cover, and a one-line scope
they understand. They read "What's included" as plain-language groups with clear subtotals and an
unmistakable total, never feeling they're inside a spreadsheet, never doubting the numbers. When ready,
one obvious "Approve" (with an easy "Request changes" beside it and a quiet "Decline") is always one tap
away, and pressing it feels safe and is acknowledged with a warm "what happens next." Questions go to a
friendly "Message your contractor." No login wall, no jargon, no security log — just a premium proposal a
client is delighted, and confident, to approve.*
