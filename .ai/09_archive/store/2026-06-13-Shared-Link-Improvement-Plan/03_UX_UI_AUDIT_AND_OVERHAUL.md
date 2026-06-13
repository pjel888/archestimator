# 03 — Public Shared-Link Page: UX/UI Audit & Full-Browser Overhaul

**Plan:** Shared Link Improvement Plan
**Date:** 2026-06-13
**Author role:** Senior product designer (audit + layout overhaul)
**Scope:** PLANNING/AUDIT ONLY. No code changed. Target surface: the public `/share/[token]` receiver page and every component under `src/components/share/`.

> **Truth & Integrity note.** Every current-behavior claim cites a `file:line` I read directly. Anything not directly verified is marked `[INFERRED]` or `[NEEDS VERIFICATION]`. All performance/accessibility numbers in §6 are **TARGETS I am defining** — no browser, Lighthouse, or device measurement was run. The orchestrator-confirmed facts in the brief were re-verified against source and are cited below.

---

## 1. Summary & Current-State Verdict

### What the page is today (plain language)

The public shared-link page is a **single, narrow, center-stranded document column**. Regardless of monitor width, all content is locked into a `max-w-[960px]` column centered with `mx-auto` (`src/app/share/[token]/page.tsx:71`). On a 1440px laptop that leaves ~480px of empty white gutters; on a 1920px monitor ~960px; on a 2560px monitor ~1600px — the literal "wasted space in the middle of the screen" the owner complained about. (Verified: `page.tsx:71`.)

Inside that column, content stacks vertically in this fixed order (verified `page.tsx:70–87`):

1. **SessionBanner** — full-bleed bar; its inner content is *also* re-capped at `max-w-[960px]` (`SharePageSessionBanner.tsx:28, 54`).
2. **ProposalHeader** — a thin-bordered card: eyebrow "Proposal Review" at `text-[9px]`, project name `<h1>` at `text-[12px]`, supporting copy at `text-[10px]`, plus an "Awaiting your review" status chip at `text-[9px]` (`SharePageProposalHeader.tsx:15–29`).
3. **Decision** — the Accept / Decline / Request Revision call-to-action, on `proposalPaper` (`#FFFDF8`) (`SharePageDecision.tsx:241`). It only renders when there is a valid recipient session (`SharePageDecision.tsx:127–129`); anonymous visitors see **nothing here at all**.
4. **Hero** — optional cover image, `aspect-[16/6]`, renders `null` when no cover (`SharePageHero.tsx:24, 30`).
5. **Tabs** — the estimate viewer: a summary line, a `compact` D3 donut chart, an estimate tablist, an optional estimate-tab row, a "Tree View / Grid Preview" sub-tab row, and the content panel (tree or grid table) (`SharePageTabs.tsx:292–530`).
6. **Comments** — discussion thread; only interactive with a valid session, otherwise a "session required" stub (`SharePageComments.tsx:292–299`).
7. **Footer** — "Shared via Archestimator • Activity logged for security" at `text-[8px]` (`page.tsx:85`).

### Screenshot-in-words (grounded in the CSS)

On a 27" monitor the visitor sees a tall, skinny strip of content floating dead-center on a white page, roughly one-third of the screen width, with vast empty margins on both sides. The type inside that strip is **uniformly tiny**: the largest text on the entire page is 12px (the project name and the active-estimate total), most body copy is 10px, and labels/footers drop to 8–9px. The estimate "Tree View" reserves a fixed `lg:w-[260px]` left navigator (`SharePageTabs.tsx:517`) and lets the tree content take the rest — but "the rest" is whatever is left inside the 960px cap minus 260px, i.e. ~680px max, even on a 2560px screen. The widest, most width-hungry content on the page (the estimate table / BOQ) is the most starved.

### Verdict

The page is a **competently built, accessibility-aware, internally consistent product surface** that is applying the **wrong layout archetype**. It is styled as a compact internal workshop document (12px-max SF Pro density) and then physically constrained to a print-like 960px column. For an *external client reviewing a money decision on a large screen*, this reads as cramped, low-confidence, and "tool-generated" rather than "premium proposal portal."

Critically, this is **not a regression** — it is the deliberate output of the 2026-06-03 "Premium Client Review Portal" overhaul (the centered column and the language/decision-placement fixes shipped together; see prior audit `14_SHARE_PAGE_UX_AUDIT.md` UX-005/UX-008 which explicitly *chose* the single centered column). The owner now wants that direction revisited toward full-browser use. So this document treats the 960px cap and the 12px-max type as **design decisions to revise**, not bugs to fix.

There is also a genuine tension to resolve honestly (DESIGN.md itself encodes both sides): DESIGN.md §"Proposal pages" wants client-facing output to stay **document-like** (paper background, formal, narrow measure), while DESIGN.md §"Authenticated app" wants **full-browser, no centered max-width cap, grid as the dominant surface**. The share page is *both* a proposal document *and* an estimate workspace. The overhaul in §4 resolves this by making the layout **content-type-dependent**.

---

## 2. Full Inventory Tables

### 2(a) Width / layout constraints per component

| # | File:line | className / style (verbatim excerpt) | Effect |
|---|-----------|--------------------------------------|--------|
| L1 | `page.tsx:71` | `share-print-content mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-6 sm:px-6` | **THE headline cap.** Whole document locked to 960px, centered, single column. |
| L2 | `page.tsx:68` | `min-h-dvh bg-white text-ink` | Page root; full-height white canvas (good baseline to build on). |
| L3 | `page.tsx:110` | `share-print-hidden grid min-h-dvh place-items-center bg-white px-4 py-6 text-ink` | Password gate centered. |
| L4 | `page.tsx:111` | `w-full max-w-sm border border-hairline bg-white p-4` | Password card capped at `max-w-sm` (~384px). |
| L5 | `SharePageSessionBanner.tsx:28` | `mx-auto flex max-w-[960px] items-center justify-between gap-3 px-4 py-2 sm:px-6` | Recipient banner re-caps to 960px (duplicate magic number). |
| L6 | `SharePageSessionBanner.tsx:54` | `mx-auto flex max-w-[960px] items-start justify-between gap-3 px-4 py-2.5 sm:px-6` | Sign-in banner re-caps to 960px (third occurrence of the magic number). |
| L7 | `SharePageProposalHeader.tsx:15` | `rounded-xs border border-hairline bg-white p-3 text-ink` | Header card, no internal width logic; `sm:flex-row sm:justify-between` (`:16`). |
| L8 | `SharePageHero.tsx:29–30` | `relative w-full overflow-hidden rounded-xs ...` + `aspect-[16/6] w-full sm:aspect-[16/5]` | Hero fills column width; fixed aspect ratio. `sizes="...1024px"` (`:36`) caps served image at 1024px. |
| L9 | `SharePageTabs.tsx:293` | `space-y-3` | Tabs root, fluid to parent (so effectively capped by L1). |
| L10 | `SharePageTabs.tsx:511, 517` | `flex gap-0` + `hidden lg:flex lg:w-[260px] lg:flex-shrink-0 border-r border-hairline` | Tree View: fixed 260px left navigator (desktop only) + `flex-1` content (`:519`). Two-pane only appears ≥`lg` (1024px). |
| L11 | `SharePageTabs.tsx:324` | `flex h-[32px] items-end gap-0 overflow-x-auto ... bg-surfaceMuted` | Estimate tablist; horizontal scroll with fade masks (`:359–366`). |
| L12 | `SharePageTabs.tsx:439` | `share-print-estimate border border-hairline bg-white` | Content panel; fluid to parent. |
| L13 | `SharePageTabs.tsx:457` | `min-w-full border-collapse text-left text-[10px] leading-4` inside `overflow-x-auto` (`:456`) | Grid table scrolls horizontally inside the 960px column. |
| L14 | `SharePageComments.tsx:305` | `share-print-hidden flex w-full flex-col rounded-xs border border-hairline bg-white` | Comments full-width-of-column; body `max-h-[420px]` scroll (`:331`). |
| L15 | `SharePageDecision.tsx:241` | `share-print-hidden w-full rounded-xs border border-hairline bg-[#FFFDF8] p-3 ...` | Decision bar full-width-of-column. Hardcoded hex `#FFFDF8` instead of `proposalPaper` token (also `:222, :297`). |
| L16 | `SharePageDecision.tsx:288, 297` | `fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4` + dialog `w-full max-w-sm` | Confirm modal centered overlay, `max-w-sm`. |
| L17 | `ShareEstimateTreePanel.tsx:379` | `flex h-full flex-col overflow-hidden bg-white` + optional `width` via `panelWidth` prop (`:380`) | Tree panel; width injected by caller's class (L10) not by prop in current usage. |
| L18 | `ShareFloatingTreeNav.tsx:96` | `hidden lg:block w-[148px] flex-shrink-0 sticky top-3 self-start pr-1 text-[9px]` | Floating section nav, 148px, desktop only. **NOTE: not rendered by `SharePageTabs`** — see Finding UX-16. |
| L19 | `SharedLinkActivityFeed.tsx` | (owner-only component; not mounted on the public receiver — confirmed it is not imported in `page.tsx:4–11`) | Public visitors get no activity feed `[INFERRED from absence of import]`. |

### 2(b) Typography scale actually used (file:line)

| Token used | Size | Where (file:line) | Role |
|------------|------|-------------------|------|
| `text-[12px]` | 12px | `page.tsx:113` (gate H1), `ProposalHeader:19` (project name H1), `Tabs:297` (active estimate name H2), `Tabs:302` (active total), `Decision:227, 301` (decision label / modal title) | Largest text on the entire page. This is the design-system "hard max." |
| `text-[11px]` | 11px | `SessionBanner:61` (dismiss "×" glyph), `PasswordForm:55` (password input) | Rare. |
| `text-[10px]` | 10px | Body copy throughout: `ProposalHeader:20, 22`; `Tabs:299, 324, 341, 373, 408, 457, 501`; `Comments:294, 331, 392`; `Decision:228, 246, 297, 304, 312`; tree rows `ShareEstimateTreeView:102, 121, 130, 164`; `ShareEstimateTreePanel:162, 184, 193, 221`; password copy `page.tsx:114` | Default body / control / table-cell size. |
| `text-[9px]` | 9px | Eyebrows & meta: `page.tsx:112, 115`; `ProposalHeader:18, 25`; `Tabs:351, 458` (table head), `Tabs:502`; `Comments:295, 309–311, 347, 352, 368, 378, 399`; `Decision:226, 229, 245, 284, 307, 323`; `SessionBanner:29, 33, 40, 55`; tree qty/unit `TreeView:154, 159, 221`; floating nav `ShareFloatingTreeNav:96` | Eyebrows, labels, table headers, timestamps, helper text. |
| `text-[8px]` | 8px | `page.tsx:85` (footer), `SessionBanner:33` ("Reviewer" chip), `Comments:407` (composer helper), `Decision:320` (note counter), `ShareFloatingTreeNav:100` ("SECTIONS") | Smallest text. **Below WCAG-comfortable client reading size.** |

**Observation:** The page's entire vertical type hierarchy spans only **8px → 12px** — a 4px / 1.5× range. There is no client-grade heading. For an external reviewer this is the single biggest readability problem after the width cap. (All sizes verified at the lines above.)

### 2(c) Responsive breakpoints in use

No custom `screens` are defined; `src/app/globals.css` uses `@import "tailwindcss"` + `@theme inline` (`globals.css:1, 38`) with **no `--breakpoint-*` overrides**, so **Tailwind v4 defaults apply**: `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`, `2xl 1536px` `[INFERRED: standard Tailwind v4 defaults, since none are overridden in globals.css]`.

| Breakpoint used | Where (file:line) | What changes |
|-----------------|-------------------|--------------|
| `sm:` (640) | `page.tsx:71` (`sm:px-6`); `ProposalHeader:16`; `Hero:30, 40`; `Decision:243, 250, 257`; `SessionBanner:28, 54` | Padding bumps; header/decision go row; decision buttons go inline; touch target shrinks `min-h-11 sm:min-h-8` (`Decision:257`). |
| `lg:` (1024) | `Tabs:517` (`hidden lg:flex lg:w-[260px]`); `ShareFloatingTreeNav:96` (`hidden lg:block`) | Tree two-pane navigator appears only ≥1024px. |
| `(max-width: 767px)` JS media query | `ShareEstimateTreeView:239`; `ShareEstimateTreePanel:311` | "Mobile" tree mode: collapsed default, 12px indent, simplified rows. |
| **None** | — | **There are no `xl:` or `2xl:` rules anywhere in the share components.** Above 1024px the layout is frozen; the 960px cap simply centers it. This is why big monitors look empty. |

### 2(d) Color usage

| Token / value | Where (file:line) | Note |
|---------------|-------------------|------|
| `text-ink` / `bg-white` | `page.tsx:68`; everywhere | Base. **Token drift:** DESIGN.md & `tailwind.theme.json` define `ink = #292929`, but the runtime CSS variable is `--ink: #3D3D3D` (`globals.css:10`). Live ink is lighter than the spec. `[VERIFIED]` |
| `text-tertiary` `#7f7f7f` | eyebrows/labels/footers throughout | Used for the footer (`page.tsx:85`) and most meta. At 8–9px, `#7f7f7f` on `#fff` is a **contrast risk** (see UX-09). |
| `text-secondary` `#5d5d5d` | body copy `ProposalHeader:20`; tree rows | OK contrast at 10px. |
| `bg-surfaceMuted` `#f5f5f5` | tablist `Tabs:324`; chips; skeletons | Neutral selected/hover surface. |
| `border-hairline` `#f2f2f2` | every card/border | Primary separation device (per DESIGN.md "thin borders replace shadows"). |
| `bg-[#FFFDF8]` hardcoded | `Decision:222, 241, 297` | **Should be `bg-proposalPaper`** — token exists (`tailwind.theme.json:27`) but is bypassed. Minor DS defect. |
| `bg-gradient-to-t from-black/35` | `Hero:40` | Hero caption scrim. DESIGN.md discourages gradients but a photo caption scrim is defensible `[INFERRED]`. |
| `border-danger/30 bg-dangerSoft text-danger` | `Comments:340, 368`; `Decision` errors | Semantic error states — correct usage. |
| `text-red-700` raw Tailwind | `PasswordForm:63, 64, 66` | **Off-token** — uses raw `red-700` instead of `text-danger`. DS defect. `[VERIFIED]` |
| `bg-orange-50 text-orange-800` raw | `SharedLinkActivityFeed.tsx:142, 167` | Off-token orange (owner-only component, not on public page, but flagged). DESIGN.md forbids app orange. |
| `focus-visible:ring-focus` | `Tabs:341, 389`; Button | Focus ring = `#3D3D3D` (`globals.css:26`) — a **dark ring on a dark control**; low focus visibility (see UX-08). |

---

## 3. Findings

Severity legend: **Critical** = blocks the premium-portal goal / breaks trust; **High** = materially harms client comprehension or access; **Medium** = noticeable polish/IA gap; **Low** = minor.

> Cross-reference to the 2026-06-03 audit (`14_SHARE_PAGE_UX_AUDIT.md`, 15 issues) is given per finding. Net status of the prior 15: **UX-001..004, 006, 010..014 = resolved** (language scrubbed, hydration fixed, decision moved above content, comment/decision state now load on mount — verified `Comments:87–131`, `Decision:81–119`). **UX-005/008 = "resolved" but in a way the owner now rejects** (they chose the single centered column; that *is* today's problem). **UX-007/009 partially open** (project name still 12px-flat; "Awaiting your review" chip exists `ProposalHeader:26` but no multi-step progress).

---

### UX-01 — 960px center cap strands 30–60% of large-screen width  ·  **Critical**
- **Evidence:** `page.tsx:71` (`mx-auto ... max-w-[960px]`), re-asserted at `SharePageSessionBanner.tsx:28, 54`.
- **Why it harms a client:** A client opening a construction proposal on an office monitor sees a thin strip of content floating in an ocean of empty white. It reads as unfinished, low-effort, or "a tool spat this out." The estimate table — the artifact they most need to scan across (description, discipline, qty, unit, total) — is the most width-starved element. This is the owner's exact complaint.
- **Impact:** Lost perceived value and credibility on every desktop open; horizontal cramping of the BOQ table forces inner horizontal scroll (`Tabs:456`).
- **Prior audit:** This is the *consequence* of resolving old UX-005/UX-008 with a single centered column. Re-opened by owner direction.

### UX-02 — Type tops out at 12px; no client-grade heading  ·  **Critical**
- **Evidence:** Largest text anywhere is `text-[12px]` (`ProposalHeader:19`, `Tabs:297, 302`, `Decision:227`). Body 10px, labels 8–9px (inventory 2b).
- **Why it harms a client:** A homeowner or buyer reading a six-figure proposal should not have to lean toward a 27" monitor to read a 12px project title or an 8px footer. 12px is the *app workshop* density for an estimator doing 8-hour sessions — not for a one-time external reviewer. The proposal name, the grand total, and the decision prompt deserve to be unmistakable.
- **Impact:** Strains readability; undercuts the "premium portal" goal; makes the financial total (the thing the client cares about most) the same size as a tab label.
- **Prior audit:** Old UX-007 flagged the project name not being prominent and "resolved" it by *keeping 12px* and adding whitespace. The owner's full-browser pivot makes the 12px ceiling itself the issue — this requires the explicit design-system exception discussed in §4.

### UX-03 — Anonymous visitors see no decision and no comments (silent dead-ends)  ·  **High**
- **Evidence:** `SharePageDecision.tsx:127–129` returns `null` when `!isValid`; `SharePageComments.tsx:292–299` shows only a "Recipient session required" stub.
- **Why it harms a client:** A client who opens a plain `/share/[token]` link (no `?recipient=`) — e.g. forwarded by a colleague — sees the estimate but **no Accept/Decline buttons at all** and a discussion box that says they can't participate, with no clear path to "become a recipient." They may assume the proposal is read-only by design and never respond.
- **Impact:** Dropped responses; confusion; the primary conversion action is invisible to a whole class of visitors.
- **Prior audit:** Not in the original 15 (those assumed a recipient session).

### UX-04 — Information architecture: decision sits above the content it depends on  ·  **High**
- **Evidence:** Render order `page.tsx:72–84`: Header → **Decision** → Hero → Tabs → Comments.
- **Why it harms a client:** The Accept/Decline CTA is rendered *before* the client has seen the cover image, the cost breakdown, or the line items. The natural review flow is "see the proposal → understand the numbers → decide → discuss." Placing the decision first (a 2026-06-03 fix for "buried in sidebar") over-corrected: it's now prominent but premature.
- **Impact:** Either the client decides without reviewing, or scrolls down, reviews, then has to scroll back up to act. On desktop with a sticky decision rail (see §4) this becomes a non-issue.
- **Prior audit:** Direct consequence of resolving old UX-005.

### UX-05 — Estimate table (the width-hungry artifact) is the most starved  ·  **High**
- **Evidence:** Grid table `Tabs:457` lives inside `overflow-x-auto` (`:456`) inside the 960px column; Tree View reserves `lg:w-[260px]` (`:517`) leaving ≤~680px for content even at 2560px.
- **Why it harms a client:** A 5-column BOQ (Description / Discipline / Qty / Unit / Total) wants horizontal room; here it scrolls sideways inside a skinny column while the page has 1000+px of unused margin. This is the textbook case where **width genuinely helps** (DESIGN.md explicitly: "estimate grid owns the majority of width").
- **Impact:** Side-scrolling a financial table is error-prone and feels broken.

### UX-06 — Loading / empty / error states exist but are tiny and inconsistent  ·  **Medium**
- **Evidence:** Comments skeleton `Comments:334–338` (two gray bars); empty "No comments yet" at `text-[9px]` (`:347`); load error block `:339–345`. Decision has no skeleton (just "Checking for an existing response..." text, `Decision:247`). Tabs empty: `estimates.length === 0` returns `null` (`Tabs:285`) — **the whole estimate section silently vanishes** if a snapshot has no estimates; tree-empty shows "No estimate items." (`ShareEstimateTreeView:284`). Grid no-match message JSON-stringifies the query (`Tabs:502`) — shows literal quotes to the user.
- **Why it harms a client:** Inconsistent, undersized states feel unpolished; the silent-vanish on zero estimates leaves a client staring at a header and a decision bar with no explanation; the `JSON.stringify` artifact (`"foo"` with quotes) is a visible dev smell.
- **Impact:** Confusion and reduced trust in edge cases.
- **Prior audit:** Old UX-004 (Polished States) was a requirement; partially met, gaps remain.

### UX-07 — Mobile (375px): dense, deep stack; tree indentation + horizontal table scroll  ·  **Medium**
- **Evidence:** Below `sm` everything is single column inside `px-4` (`page.tsx:71`); decision buttons stack as a grid `grid gap-2` with `min-h-11` touch targets (`Decision:250, 257`) — good; but estimate grid still `overflow-x-auto` (`Tabs:456`), and tree mobile mode keeps 12px indent up to 80px (`ShareEstimateTreeView:76–85`). Donut chart `compact` is 520×400 (`CostDonutChart.tsx:66`) scaled into ~343px width — `[NEEDS VERIFICATION in browser: legibility of callout labels at 375px]`.
- **Why it harms a client:** On a phone the deep vertical stack (banner → header → decision → hero → summary → donut → tabs → sub-tabs → tree → comments → footer) is a long scroll before the line items; the BOQ table side-scrolls.
- **Impact:** Acceptable but not delightful on mobile; needs a deliberate mobile order (see §4).
- **Prior audit:** Old UX-008 (mobile flow) + NFR-004 (usable at 320px). Largely functional today; refine, don't rebuild.

### UX-08 — Focus ring is dark-on-dark; weak visible focus  ·  **Medium (a11y)**
- **Evidence:** `focus-visible:ring-focus` (`Tabs:341, 389`; Button `:25–35`); `--focus: #3D3D3D` (`globals.css:26`). Tablist buttons sit on `bg-surfaceMuted`/white, so a `#3D3D3D` ring is visible-ish, but on dark `primary` buttons the ring blends.
- **Why it harms a client:** Keyboard users (and accessibility audits) need a clearly visible focus indicator (WCAG 2.4.7). A near-ink ring on ink-toned controls is borderline.
- **Impact:** Reduced keyboard usability; likely Lighthouse/axe flag `[NEEDS VERIFICATION — not measured]`.

### UX-09 — 8–9px tertiary text fails comfortable contrast for clients  ·  **Medium (a11y)**
- **Evidence:** Footer `text-[8px] ... text-tertiary` (`page.tsx:85`); many 9px tertiary labels (inventory 2b/2d). `tertiary = #7f7f7f` on white.
- **Why it harms a client:** `#7f7f7f` on `#ffffff` is ~4.0:1 — under the 4.5:1 WCAG AA threshold for normal text, and 8–9px is far below comfortable reading size for a non-power-user. `[contrast ratio computed from hex; not device-measured]`
- **Impact:** Legibility + a11y compliance risk on labels, timestamps, and the footer.

### UX-10 — Print layout inherits the document column but loses width intelligence  ·  **Medium**
- **Evidence:** `print.css:16–19` removes the max-width and padding for print (`max-width:none; padding:0`), forces black text (`:8–9, :25`), one estimate per page (`:34–37`), full-width tables (`:39–42`). Decision bar, comments, banners, footer are `share-print-hidden` (`Decision:241`, `Comments:305`, `page.tsx:85`).
- **Why it harms a client:** Print is actually the **best-behaved** surface (it already goes full width). The gap: the *screen* doesn't get the same width intelligence the print stylesheet already proves is correct. Also `[NEEDS VERIFICATION: whether the donut SVG and tree indentation paginate cleanly]`.
- **Impact:** Low on its own; mainly an argument that "full width is already the right answer for the table" — print proves it.

### UX-11 — Trust/credibility cues are minimal for a "premium portal"  ·  **Medium**
- **Evidence:** Only trust signal in main content is the "Awaiting your review" chip (`ProposalHeader:26`) and the footer "Activity logged for security" (`page.tsx:85`). No firm/preparer identity, no prepared-on date, no validity period, no contact, no logo treatment. The OG metadata is rich (`page.tsx:251–252`: counts, rows, total, client) but none of that summary appears *on the page* prominently.
- **Why it harms a client:** A premium proposal portal earns trust with: who prepared this, for whom, when, valid until when, how to reach them, and a confident summary of scope/total. Today the client sees a project name and a tiny meta line (`ProposalHeader:21–23`).
- **Impact:** Feels generated, not authored; weakens the "trust matters more than automation" brand promise (`brand-foundation.md:72`).

### UX-12 — Token drift: live `ink`/`focus` are `#3D3D3D`, spec says `#292929`  ·  **Low (system integrity)**
- **Evidence:** `globals.css:10, 21, 26` set `--ink/--accent/--focus = #3D3D3D`; DESIGN.md front-matter and `tailwind.theme.json:6, 18` say `#292929`.
- **Why it matters:** The overhaul should standardize on one ink. This affects every contrast calculation and the focus ring (UX-08). Flagging so §4's contrast targets reference the *real* value.

### UX-13 — Off-token colors and hardcoded hex in share components  ·  **Low (system integrity)**
- **Evidence:** `PasswordForm:63–66` uses raw `text-red-700` (should be `text-danger`); `Decision:222, 241, 297` hardcodes `bg-[#FFFDF8]` (should be `bg-proposalPaper`).
- **Impact:** Minor DS inconsistency; easy cleanup folded into the overhaul.

### UX-14 — Three duplicate `max-w-[960px]` literals; no shared container  ·  **Low**
- **Evidence:** `page.tsx:71`, `SessionBanner:28, 54`.
- **Why it matters:** The single most important layout number is hardcoded in three places. The overhaul must introduce **one** shared container so width can change in one edit.

### UX-15 — Estimate viewer has 3 stacked tab rows (estimate / estimate-tab / view-mode)  ·  **Low (IA)**
- **Evidence:** Estimate tablist (`Tabs:319–367`), optional estimate-tab row (`Tabs:369–402`), and Tree/Grid sub-tabs (`Tabs:405–432`) — up to **three horizontal control bars** stacked above the content, all at 10px.
- **Why it harms a client:** Three near-identical thin control strips is visually noisy and hard to parse for a non-expert; the hierarchy (sheet → tab → view) isn't visually expressed.
- **Impact:** Cognitive load in the densest part of the page.

### UX-16 — `ShareFloatingTreeNav` exists but is not mounted; real nav is the inline 260px panel  ·  **Low**
- **Evidence:** `ShareFloatingTreeNav.tsx` is a complete sticky section-nav (`:94–130`) but `SharePageTabs.tsx` imports/renders `ShareEstimateTreePanel` (`:512–518`), not `ShareFloatingTreeNav`. Prior memory observation (2026-05-29) noted this mismatch.
- **Impact:** Dead/competing component; pick one nav model in §4 and remove the other.

---

## 4. The Overhaul — Full-Browser Layout Design (centerpiece)

### 4.1 Recommendation in one line

**Adopt a responsive three-zone app-shell that scales the *whole* viewport, but keep each zone's content at a readability-appropriate measure.** Concretely: a **fluid outer container that grows to `xl`/`2xl` (up to ~1760px)**, split into a **wide estimate work-zone (full available width, the dominant surface)** + a **sticky right summary/decision rail (~360–400px)**, with proposal prose and the cover staying at a comfortable measure. This is the **content-type-dependent** answer the brief anticipated: long prose and the proposal header keep a humane measure; the **estimate table/tree gets the width**, because that is exactly the artifact that benefits.

### 4.2 Why not the two naive options (rationale + tradeoffs)

| Option | What it is | Verdict |
|--------|-----------|---------|
| **A. True app-shell with persistent left rail** (like the authenticated workshop: 56–248px left global nav) | Mirrors DESIGN.md authenticated-app shell | **Reject for the public page.** A persistent product left-nav (Dashboard/Projects/Library/Settings) is meaningless to an external client who has no account and one job: review *this* proposal. It would import workshop chrome into a client surface and contradict DESIGN.md "Do not make client-facing proposal pages look like raw admin dashboards." A *content* left rail (the estimate tree) is welcome — but that belongs inside the work-zone, not as global nav. |
| **B. Fluid `max-w` that simply grows by breakpoint** (e.g. 1280 → 1536 → 1760) with the **same single column** | Minimal change to today | **Partial.** Solves UX-01's emptiness cheaply, but a single 1760px-wide column of 10px prose + comments is *worse* to read than 960px (measure too long for text). Width without zoning hurts the prose. |
| **C. (Recommended) Fluid container + content-aware zones** | Wide container; estimate zone takes the width; prose/decision in a constrained rail | **Adopt.** Gives the table its width, keeps prose readable, surfaces the decision persistently, fills the screen with *purpose* not just stretched text. |

### 4.3 Container strategy (exact Tailwind classes)

Replace the single capped column (`page.tsx:71`) with **one shared container component** (kills UX-14) that is **fluid with a generous cap that grows by breakpoint**:

```
/* Outer shell (replaces page.tsx:71 div) */
mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10
max-w-[760px]            /* base/mobile: humane single-column measure */
lg:max-w-[1100px]        /* lg 1024: room for two-pane tree */
xl:max-w-[1440px]        /* xl 1280: work-zone + rail breathe */
2xl:max-w-[1760px]       /* 2xl 1536: fill big monitors, not edge-to-edge */
```

Then, **inside** that container, the desktop layout is a CSS grid that only splits at `xl`:

```
/* Desktop ≥ xl: work-zone + sticky rail */
grid grid-cols-1 gap-6
xl:grid-cols-[minmax(0,1fr)_380px]
xl:items-start
```

- **Left grid cell = work-zone** (`minmax(0,1fr)`): ProposalHeader (full), Hero, **SharePageTabs (the estimate viewer)** — this is the dominant surface and now genuinely gets the width (fixes UX-05).
- **Right grid cell = sticky rail** (`380px`, `xl:sticky xl:top-6 self-start`): **Decision** + a new **Summary card** (total, counts, validity, preparer) + **Comments**. The decision is now *persistently visible while the client scrolls the estimate* (fixes UX-04 without burying it — the 2026-06-03 concern).
- **Below `xl`** the grid collapses to one column; the rail's contents flow back inline in this order: Summary → Decision → (estimate) → Comments (see 4.6 mobile order).

> **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A2/ADV-UX-01) — rail-vs-table width regression on the *modal* laptop:** splitting the grid at `xl=1280` regresses the Tree-view table on the most common client laptop. At a 1366 viewport: container minus padding ≈ 1286; minus the 380px rail and gap ≈ ~882 work-zone; minus the **260px tree nav** kept inside the work-zone ([SharePageTabs.tsx:517](../../../src/components/share/SharePageTabs.tsx#L517), `hidden lg:flex lg:w-[260px]`) ≈ **~620px for the actual BOQ table — *narrower* than today's ~680px** inside the 960px column. The headline promise ("the table finally gets the width") *regresses* at 1366/1440 for the Tree view. **Resolution (pick one at D5):** (a) **defer the grid split from `xl=1280` to `2xl=1536`**, keeping 1280–1535 as a wide single column; OR (b) **collapse the 260px tree nav into a drawer/popover whenever the rail is present.** Either way, see the new width AC at 1366/1440 in §6 (AC-UX-01b).**]**

> **Tradeoff acknowledged:** at `2xl` the work-zone can exceed ~1100px. For the **prose-like** ProposalHeader and the comments thread we cap the *inner* text block (`max-w-[680px]` on prose paragraphs) so reading measure stays humane even though the table beside/below it is wide. This is the content-type split made literal.

### 4.4 Typography scale upgrade (client-readable)

This requires an **explicit, owner-approved exception** to DESIGN.md's "12px hard max outside landing," because the share page is a **client-facing proposal surface**, not workshop UI. DESIGN.md already exempts landing and treats proposals as document-like; I recommend a **named "Client Portal" type scale** sitting between proposal/landing and app. Proposed scale (all SF Pro, weights 400/500, zero tracking — staying inside the *spirit* of the system):

| Role | Current | **Proposed** | Where |
|------|---------|--------------|-------|
| Proposal name (H1) | 12px | **22px / lh 28** (sm) → **26px** (lg+) | ProposalHeader |
| Grand total (the number that matters) | 12px | **24px tabular-nums** | Summary card |
| Section headings (estimate name, "Your response", "Discussion") | 12px | **15px** | Tabs/Decision/Comments headers |
| Body / line items / table cells | 10px | **13px** (≥ the 14px AC target where space allows; 13px min) | everywhere |
| Eyebrows / labels / meta | 8–9px | **11px min** (never below 11px on client copy) | all labels |
| Footer / fine print | 8px | **11px** | footer |

Rationale: bumps the *whole* range up while preserving hierarchy. The grand total becomes the visual anchor (it's what the client is deciding on). Nothing uses bold or new fonts; this is purely a size lift. **If the owner declines the exception**, the fallback is to keep 12px max but rely entirely on whitespace + the wide layout — weaker, but DS-pure (see Open Questions Q1).

> **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (prior-art §3, "Net on D1"):** the type bump is unanimously supported, but prior art pushes the floor **up**, not down: **raise the label floor from 11px to 12px** (11px is below the soft floor) and **target prose sections (header, descriptions) at 15–16px** rather than 13–14px (WCAG-AA consensus is 16px body, 12px soft floor). 13–14px is acceptable for the **data table** (data context, not extended prose), which correctly escapes the prose measure cap. Also **tighten the prose cap from ~680px to ~560–600px** (≈70ch at 14px). And note D1's *nature* changes: it is now **"approve the principle (a `/share` exception exists, ~2× current scale) + own the shared build-gate (enforcer) change,"** not "approve DESIGN.md prose" — and the runtime ink is `#3D3D3D` not the spec `#292929`, so a token-accurate mockup won't match production contrast (defer exact px to a built prototype reviewed against the P-UI-0 baseline).**]**

### 4.5 Breakpoint behavior

| Range | Container | Layout |
|-------|-----------|--------|
| **375px (mobile)** | `max-w-[760px]` (i.e. full width), `px-4` | Single column. Mobile order (4.6). Tree starts collapsed (`ShareEstimateTreeView:248–260` already does this). BOQ table → consider stacked "cards" per row at `<sm` instead of side-scroll (UX-05/07). |
| **sm 640** | full width `px-6` | Decision buttons inline (`Decision:250`); header row. |
| **md 768** | full width | Two-pane tree *could* enable here (lower the `lg:` gate to `md:` on `Tabs:517`) so tablets get the navigator. |
| **lg 1024** | `max-w-[1100px]` | Two-pane tree navigator (260px) + content. Rail still inline (single column) — not enough width for a 380px rail yet. |
| **xl 1280** | `max-w-[1440px]` | **Grid splits:** work-zone + sticky 380px rail. This is where the empty-space problem is solved. **[2nd-pass — see 12 (A2/ADV-UX-01):** with the 260px tree nav still inside the work-zone, splitting here leaves the BOQ table ~620px < today's ~680px at 1366/1440. **Defer the split to `2xl=1536`** (this row becomes wide-single-column) **or** drawer the tree nav while the rail is present.**]** |
| **2xl 1536** | `max-w-[1760px]` | Same grid, more breathing room; inner prose capped at ~680px **[2nd-pass — see 12 (prior-art §3): tighten the prose cap toward ~560–600px (≈70ch at 14px; 680px at 13–14px is ~90–100 CPL, too wide). Tables correctly escape the cap.]**; table uses full work-zone width. **[2nd-pass — see 12 (A2):** if the split is deferred per the row above, this is the breakpoint where the rail first appears, so the 1366/1440 regression cannot occur.**]** |

### 4.6 Where each element lives

- **Decision CTA:** sticky right rail ≥xl; inline directly under the Summary on smaller screens. **Plus:** for anonymous (no-session) visitors, show a clear, friendly state explaining how to respond (fixes UX-03) instead of rendering nothing.
- **Summary / financials (new card):** top of the right rail — grand total (24px), estimate/sheet count, row count, currency, prepared-for, prepared-on, valid-until. Sources already exist in `snapshot` (the metadata route computes counts/rows/total at `page.tsx:249–252`). Strong numeric hierarchy per DESIGN.md "Financial total cards."
- **Sheet navigation (tree):** stays inside the work-zone as the two-pane `ShareEstimateTreePanel` (`Tabs:512`). **Remove the unused `ShareFloatingTreeNav`** (UX-16) — one nav model.
- **Comments:** bottom of the right rail ≥xl (so discussion sits beside the estimate, not 4 screens down); inline last on mobile.

> **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A3/ADV-UX-07, R8) — the sticky rail cannot hold Summary + Decision + Comments and keep the Decision visible on a 1366×768 laptop (~700px usable height):** Comments alone has a `max-h-[420px]` body ([SharePageComments.tsx:331](../../../src/components/share/SharePageComments.tsx#L331)); Summary + a 3-button Decision + Comments combined exceeds the viewport, so a fully-sticky rail would either scroll internally (Decision *not* always-visible → defeats AC-UX-06) or clip Comments. **Resolution:** make **only the Summary+Decision sub-block sticky**; let **Comments flow non-sticky below** it (keep the existing `max-h-[420px]` internal scroll). **Rail positioning constraint:** the sticky element uses `position: sticky` / `top-6` / `self-start` **only — no `overflow-hidden`, no `transform`, no `contain`** on the rail or its ancestors, so the Decision's `fixed inset-0 z-50` confirm modal (`SharePageDecision.tsx:288`) is not clipped. See the new height AC in §6 (AC-UX-06b).**]**
- **The 3 stacked tab rows (UX-15):** consolidate visually — keep the estimate tablist; render the Tree/Grid toggle as a compact segmented control aligned *right* on the same row as the estimate-name heading, not as a third full-width strip.

### 4.7 ASCII wireframes

**Desktop ≥ xl (1440–1760px container):**

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  session banner (full bleed, content aligned to container)                      │
├───────────────────────────────────────────────────────────────────────────────┤
│  CONTAINER  max-w-1440/1760, mx-auto, px-8/10                                    │
│  ┌──────────────────────────────────────────────┐  ┌──────────────────────────┐│
│  │ PROPOSAL HEADER                                │  │  SUMMARY                 ││
│  │  Proposal Review (eyebrow 11px)                │  │  ₱ 2,480,000.00  (24px)  ││
│  │  Maple Residence Fit-Out      (H1 26px)        │  │  3 sheets · 412 rows     ││
│  │  Prepared for J. Cruz · PRJ-014 · Cebu         │  │  Prepared 2026-06-10     ││
│  ├────────────────────────────────────────────────┤  │  Valid until 2026-07-10  ││
│  │ HERO COVER (16:6, optional)                    │  ├──────────────────────────┤│
│  ├────────────────────────────────────────────────┤  │  YOUR RESPONSE           ││
│  │ ESTIMATE  Structural Sheet      [Tree|Grid]    │  │  [ Accept ]              ││
│  │  ┌───────────┬───────────────────────────────┐ │  │  [ Decline ]             ││
│  │  │ TREE NAV  │ TABLE / TREE CONTENT (wide)    │ │  │  [ Request Revision ]    ││
│  │  │ 260px     │ Desc | Disc | Qty | Unit |Total│ │  │  (sticky top-6)          ││
│  │  │           │ …rows get real horizontal room │ │  ├──────────────────────────┤│
│  │  │           │                                │ │  │  DISCUSSION (thread)     ││
│  │  └───────────┴───────────────────────────────┘ │  │  …                       ││
│  └──────────────────────────────────────────────┘  └──────────────────────────┘│
│  Shared via Archestimator · Activity logged                          (footer 11px)│
└───────────────────────────────────────────────────────────────────────────────┘
   ↑ work-zone takes the width            ↑ rail 380px, sticky: decision always visible
```

> **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (doc 12 A4/ADV-UX-02): the cost donut is NOT drawn in this wireframe and must be.** Decide+draw its placement: either a width-capped block in the work-zone (`mx-auto max-w-[560px]`, left-aligned, so the 520-canvas donut does not float meet-centered in a ~1000px band) or moved beside the Summary card in the rail. Also note the sticky rail per A3 makes **only Summary+Decision sticky** (`top-6`, no `overflow-hidden`/`transform`/`contain`); **Discussion flows non-sticky below**, contrary to the "(sticky top-6)" annotation drawn against the whole rail above.**]**

**Mobile 375px (single column, deliberate order):**

```
┌─────────────────────────────┐
│ session banner              │
├─────────────────────────────┤
│ Proposal Review (eyebrow)   │
│ Maple Residence  (H1 22px)  │
│ Prepared for J. Cruz · PRJ  │
├─────────────────────────────┤
│ SUMMARY  ₱2,480,000 (22px)  │  ← total up top so the number lands first
│ 3 sheets · 412 rows · valid │
├─────────────────────────────┤
│ HERO COVER (optional)       │
├─────────────────────────────┤
│ ESTIMATE  [Tree | Grid]     │
│ (tree collapsed by default) │
│ rows: Desc ………… Total       │  ← stacked row-cards, no side-scroll
├─────────────────────────────┤
│ YOUR RESPONSE               │
│ [ Accept ] (min-h 44)       │
│ [ Decline ]                 │
│ [ Request Revision ]        │
├─────────────────────────────┤
│ DISCUSSION                  │
├─────────────────────────────┤
│ footer (11px)               │
└─────────────────────────────┘
```

### 4.8 Tokens: reuse vs. new

- **Reuse:** all colors (ink/secondary/tertiary/hairline/surfaceMuted/proposalPaper/success/warning/danger), `rounded-xs`, SF Pro stack, 400/500 weights, `focus` ring.
- **New (require owner sign-off):**
  1. **Client-portal type scale** (4.4) — the only real DS exception; document it in DESIGN.md before building.
  2. **Shared `<ShareContainer>` width tokens** — encode the `max-w` breakpoint ladder once (kills UX-14).
  3. **Standardize ink** to one value (UX-12) and **strengthen `--focus`** to a token with real contrast against ink controls (UX-08) — e.g. a focus ring that is offset + uses a lighter/contrasting outline.

---

## 5. Component-by-Component Change List

Legend: **[layout-only]** = no data/schema/API change; **[deeper]** = touches data/state/new content.

| Component (file) | Change | Type |
|------------------|--------|------|
| `src/app/share/[token]/page.tsx` | Replace `:71` capped column with shared fluid container + xl grid (work-zone / rail). Reorder render so Decision+Summary+Comments compose the rail; estimate stays in work-zone (`:72–87`). Move footer copy to 11px. | **[layout-only]** (uses existing `snapshot`) |
| `src/app/share/[token]/page.tsx` (`ProjectPublicationPasswordGate :108–120`) | Bump gate type to portal scale; widen card from `max-w-sm`; align with new container. | **[layout-only]** |
| `SharePageSessionBanner.tsx` | Remove duplicate `max-w-[960px]` (`:28, :54`); align inner content to shared container. Bump 8–9px labels to 11px. | **[layout-only]** |
| `SharePageProposalHeader.tsx` | H1 → 22/26px (`:19`); eyebrow → 11px (`:18`); meta → 13px (`:20, :22`); cap prose measure `max-w-[680px]`. Optionally surface preparer/date (UX-11) — *needs snapshot field check*. | **[layout-only]** for type; **[deeper]** only if adding preparer/validity fields not in snapshot |
| `SharePageHero.tsx` | Raise served image cap in `sizes` (`:36`) for wide work-zone (e.g. up to 1440px); keep `null` fallback (`:24`); caption label 11px (`:41`). | **[layout-only]** |
| `SharePageTabs.tsx` | Consolidate 3 tab rows → estimate tablist + right-aligned segmented Tree/Grid toggle (UX-15, `:319–432`). Lower two-pane gate `lg:` → `md:` (`:517`). Bump cells/headers to 13/11px (`:457, :458`). Replace `JSON.stringify` no-match text (`:502`). Handle `estimates.length===0` with a visible empty state instead of `null` (`:285`). At `<sm`, render BOQ as stacked row-cards instead of `overflow-x-auto` (`:456`). | **[layout-only]** (presentation; data unchanged) |
| `SharePageDecision.tsx` | Move into sticky rail; add **anonymous-visitor state** (UX-03) replacing `null` at `:127–129`; swap hardcoded `#FFFDF8` → `bg-proposalPaper` (`:222, :241, :297`); bump label/copy to portal scale; keep focus-trap modal (`:286–341`) — it's good. **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (doc 12 A6/ADV-02-impl): the decision-CTA *typography* is `[deeper]`, NOT `[layout-only]`** — see the row below.] | **[layout-only]** + small **[deeper]** for the anonymous state copy/CTA |
| **`SharePageDecision.tsx` — decision CTA typography [2nd-pass — see 12_SECOND_PASS_HARDENING.md (doc 12 A6/ADV-02-impl)]** | The Accept / Decline / Request-Revision controls are the shared `Button` primitive whose base class hardcodes `!text-[10px] !font-medium` ([button.tsx:55](../../../src/components/ui/button.tsx#L55)), with ~90 importers, and editing it is **forbidden** ([07 §4](07_BLAST_RADIUS_ANALYSIS.md)). So "unmistakable buttons" cannot be true while the buttons stay at 10px and the primitive is untouched. **Decide explicitly:** (i) **hand-roll share-scoped button styling** that does not touch the shared primitive (and **budget a11y / focus-trap re-verification**), OR (ii) **accept 10px CTAs**, **drop the "unmistakable buttons" claim**, and **anchor the page on the 24px summary total** instead. See new AC requiring `src/components/ui/button.tsx` to be absent from the T1 diff (§6, AC-UX-02b). | **[deeper]** (not layout-only) — primitive constraint |
| `SharePageComments.tsx` | Move into rail bottom; bump body to 13px, labels 11px; keep optimistic/offline/retry logic (`:183–283`) untouched; make the `!isValid` stub (`:292–299`) actively explain how to participate. | **[layout-only]** |
| `ShareEstimateTreePanel.tsx` | Allow the panel to use the wider work-zone; keep search/expand/collapse (`:382–406`); bump row type to 13px. | **[layout-only]** |
| `ShareEstimateTreeView.tsx` | Bump row/label type to portal scale (`:102, :121, :130, :164, :207–224`); keep mobile collapse logic (`:235–260`). | **[layout-only]** |
| `ShareFloatingTreeNav.tsx` | **Remove** (unused, UX-16) — or repurpose as the *only* nav and drop the inline panel. Recommend remove. | **[layout-only]** (deletion) |
| `ProjectPublicationPasswordForm.tsx` | Replace raw `text-red-700` → `text-danger` (`:63–66`); bump input/label/button to portal scale. | **[layout-only]** |
| `SharePageRecipientSessionInitializer.tsx` | No change (logic-only redirect; `:14–35`). | none |
| `SharedLinkActivityFeed.tsx` | Out of scope for the public page (owner-only, not mounted). Flag off-token orange (`:142, :167`) for a separate cleanup. | none here |
| `CostDonutChart.tsx` | ~~No structural change; verify `compact` (520×400, `:66`) legibility~~ **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (doc 12 A4/ADV-UX-02): re-classified from "none/verify" to `[layout-only: constrain compact container width]`.** The compact donut is `w-full h-[400px]` with a fixed `520×400` viewBox and callout label X coords hardcoded for a 520-wide canvas (`LEFT_LABEL_X:16 / RIGHT_LABEL_X:504`, [CostDonutChart.tsx:67-68,74-77](../../../src/components/charts/CostDonutChart.tsx#L67), [:315](../../../src/components/charts/CostDonutChart.tsx#L315)); in a ~1000px work-zone, `preserveAspectRatio` meet-centering floats a ~520px donut in a much wider band — **re-creating the wasted-space complaint inside the work-zone.** Cap its container (`mx-auto max-w-[560px]`, left-align) **or** move it beside the Summary. Its placement must be **drawn** (it is omitted from the §4.7 wireframe today). **Tune ONLY the `COMPACT` constant block + compact-ternary literals** (lines 66-78); never touch the shared d3 generators / `roundSvgPath` / `formatSvgNumber`; **re-run `tests/vitest/share/cost-donut-chart-hydration.test.tsx`** (it renders the compact branch and asserts byte-identical SVG). Still verify legibility at 375px `[NEEDS VERIFICATION]`.] | **[layout-only: constrain compact container width]** |
| `print.css` | Already full-width and clean (`:16–19`); re-verify after layout change that the rail's hidden classes still apply and the work-zone prints edge-to-edge. **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A7/ADV-05-impl, PRC-2): `print.css:16-18` only resets `max-width`/`padding` on `.share-print-content`, NOT `display`** — so if the new `xl:grid-cols-[minmax(0,1fr)_380px]` lands on `.share-print-content`, print inherits a 2-column page with an empty 380px rail track. **Fix:** put the `xl` grid on an **inner** wrapper (not on `.share-print-content`), OR add `@media print { .share-print-content { display:block !important; grid-template-columns:none !important } }`. Also: the `.share-print-estimate + .share-print-estimate` page-break rule ([print.css:34-36](../../../src/app/share/print.css#L34)) is **inert today** (only one active panel is ever in the DOM, so there is never a second sibling), so "one estimate per page" is aspirational — see AC-UX-11 note in §6.] | verify + **[2nd-pass: print-grid guard]** |

**No schema, API, or RLS changes are implied by §4–5.** Every layout/type change consumes the existing `snapshot`. The only place a *deeper* change could appear is UX-11 (preparer/validity on the page) — gated on whether those fields exist in `snapshot.project` `[NEEDS VERIFICATION of ProjectPublicationSnapshot type]`.

---

## 6. Acceptance Criteria (testable; all metrics are TARGETS, not measured)

| ID | Criterion | Target |
|----|-----------|--------|
| AC-UX-01 | At ≥1536px (2xl), the estimate work-zone consumes ≥60% of the container width and the page has no empty center gutter wider than the side padding. | MUST |
| **AC-UX-01b** *(2nd-pass — see 12_SECOND_PASS_HARDENING.md, A2/ADV-UX-01)* | At **1366px AND 1440px**, the actual BOQ work-zone **table** (i.e. after subtracting any in-zone tree nav and the rail) is **≥ today's ~680px** — the overhaul must not *regress* table width on the modal client laptop. Measure the rendered table, not the work-zone band. (Achieved by deferring the grid split to `2xl=1536` OR drawering the 260px tree nav when the rail is present.) | MUST |
| AC-UX-02 | The single shared container is the **only** place a max-width is defined for the share page (no remaining `max-w-[960px]` literals in `src/components/share/` or `page.tsx`). | MUST |
| **AC-UX-02b** *(2nd-pass — see 12_SECOND_PASS_HARDENING.md, doc 12 A6/ADV-02-impl)* | `src/components/ui/button.tsx` does **NOT** appear in the T1 diff. The decision-CTA look is achieved either by share-scoped hand-rolled button styling (with a11y/focus re-verified) or by accepting the 10px primitive and anchoring on the 24px total — never by editing the shared `Button` primitive (90 importers). | MUST |
| AC-UX-03 | Body/line-item/table-cell copy renders at **≥13px** (target 14px where space allows); no client-facing text below **11px**. | MUST |
| AC-UX-04 | Proposal name (H1) and grand total each render at **≥22px**. | MUST |
| AC-UX-05 | At 375px there is **no horizontal page scroll**; the BOQ does not require sideways scrolling to read Description + Total. | MUST |
| AC-UX-06 | ≥xl, the Accept/Decline/Request-Revision controls remain visible (sticky) while the client scrolls the estimate. **[2nd-pass — see 12 (A3/ADV-UX-07): achievable only by making *only* the Summary+Decision sub-block sticky and letting Comments flow below; see AC-UX-06b.]** | MUST |
| **AC-UX-06b** *(2nd-pass — see 12_SECOND_PASS_HARDENING.md, A3/ADV-UX-07)* | The **sticky sub-block (Summary + Decision only)** has a rendered height **< 768px** so it remains fully visible (Decision included) on a 1366×768 laptop. Comments is **not** part of the sticky block. The sticky element uses `position:sticky`/`top-6`/`self-start` with **no `overflow-hidden`/`transform`/`contain`** on it or its ancestors (so the `fixed inset-0 z-50` confirm modal is not clipped). | MUST |
| AC-UX-07 | An anonymous (no-session) visitor sees a clear explanation of how to respond — never a silently empty decision area. | MUST |
| AC-UX-08 | Every async area (comments, decision, estimate) has a distinct loading, empty, and error state; no `JSON.stringify` artifacts or silent `null` sections. | MUST |
| AC-UX-09 | All interactive controls show a focus indicator with ≥3:1 contrast against both the control and its background (WCAG 2.4.11/2.4.7). | MUST |
| AC-UX-10 | Tertiary text used for client-readable content meets ≥4.5:1 contrast (raise size/weight or darken token as needed). | MUST |
| AC-UX-11 | Print output remains full-width, ~~one estimate per page,~~ with all interactive UI hidden (regression of `print.css` behavior), **and the new `xl` grid prints single-column** (no empty 380px rail track). **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A7/ADV-05-impl, PRC-2):** put the grid on an inner wrapper (not `.share-print-content`) OR add `@media print { .share-print-content { display:block !important; grid-template-columns:none !important } }`; **add a test that the grid container prints single-column.** The **"one estimate per page" claim is dropped** — the `.share-print-estimate + .share-print-estimate` page-break rule ([print.css:34-36](../../../src/app/share/print.css#L34)) is **inert** because `SharePageTabs` renders only the one active panel, so there is never a second sibling. Re-scope as a real print-only all-panels stack only as separate, explicit scope.] | SHOULD |
| AC-UX-12 | The summary card shows grand total, sheet count, row count, and currency sourced from the existing snapshot. | SHOULD |
| AC-UX-13 | `bun run lint:design-system` passes, with the new client-portal type scale registered as an approved exception (or the no-exception fallback used). **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A5/ADV-01-impl):** the design-system enforcer `scripts/enforce-app-design-system.mjs` has **no per-surface exception API** — it hardcodes `maxPx=12` (line 6), `labelLikeTextSizeLimitPx=9` (line 7), `secondaryTextSizeLimitPx=10` (line 8) with only a landing allowlist (lines 10-17). So the `/share` scale (13px body, 11px eyebrows, 11px tertiary) **violates a shared build-gate on three independent rules.** "Registered as an approved exception" is **not a documentation sign-off — it requires editing this shared CI build-gate.** This AC now means: the enforcer has been extended with a `/share` allowlist covering **all three** rules (12px cap, uppercase>9px, secondary-tone>10px), shipped on its **own** deploy *before* the layout commit (new phase P-UI-0, see [09](09_IMPLEMENTATION_PLAN.md)), and a **guard test exists asserting the enforcer still fails on a >12px violation OUTSIDE `/share`.**] | MUST |
| AC-UX-14 *(target)* | Lighthouse Accessibility ≥ 95 on the share page. **TARGET — not measured.** | SHOULD |
| AC-UX-15 *(target)* | Cumulative Layout Shift (CLS) < 0.1 on load (hero/donut must not shift content). **TARGET — not measured.** | SHOULD |
| AC-UX-16 *(target)* | No regression in Largest Contentful Paint vs. current; donut and images keep `loading="lazy"` + explicit dimensions. **TARGET — not measured.** | SHOULD |

---

## 7. Open Questions for the Owner

1. **Type-scale exception (the big one).** Do you approve a named "Client Portal" type scale (H1 ~26px, total ~24px, body ~13–14px) as a documented DESIGN.md exception for `/share/[token]`? If **no**, we keep 12px-max and lean only on the wide layout + whitespace (weaker premium feel). *This decision gates AC-UX-03/04/13.*
2. **Brand stance:** minimalist proposal *document* (paper, restrained, narrow prose, wide table) or denser *dashboard* (summary cards, charts forward)? §4 leans document-with-wide-table; confirm.
3. **Logo / preparer identity:** Should the page show the *preparing firm's* identity (name/logo/contact/validity), or stay neutral "Shared via Archestimator"? Prior audit UX-006 *reduced* Archestimator branding — do you now want firm branding added for trust (UX-11)? Are preparer/valid-until fields available in the snapshot, or would surfacing them require a data change?
4. **Anonymous visitors:** What is the intended experience for a plain `/share/[token]` link with no recipient session — read-only by design, or should we prompt them toward becoming a recipient? (Drives UX-03 / AC-UX-07.)
5. **Tablet two-pane:** OK to enable the tree navigator at `md` (768px) instead of only `lg` (1024px)?
6. **Mobile BOQ:** Approve replacing the side-scrolling table with stacked per-row cards below `sm`?
7. **Max width ceiling:** Is ~1760px at 2xl the right ceiling, or do you want true edge-to-edge on ultrawide?

---

## 8. Self-Score

Scored against the plan's rubric (see [11_SCORING_AND_INTEGRITY.md](11_SCORING_AND_INTEGRITY.md)): readiness/quality measure whether an engineer can execute without further planning decisions and whether every claim is verified-or-tracked — browser/Lighthouse confirmations are execution-time verification steps (tracked ACs), not planning gaps.

> **Snapshot-field verification (closes the main readiness gap), orchestrator-verified 2026-06-13:** `ProjectPublicationSnapshot.project` (`src/lib/publication/types.ts:92-104`) exposes `name, projectCode, clientName, location, currencyCode, coverImageUrl`, and the top level carries `generatedAt`, `estimateCount`, `rowCount`, `totalCost`. **Therefore the Summary card (grand total, sheet/row counts, currency, client name, "prepared on" = `generatedAt`) is LAYOUT-ONLY with ZERO data change.** Only **firm/preparer identity** and an explicit **valid-until** are absent from the snapshot DTO (`expiresAt` lives on the publication row, not the public snapshot) — those two, and only those two, would require a deferred, versioned snapshot-shape change (per the "No DB channel" constraint). AC-UX-12 is fully satisfiable today; UX-11's firm-identity portion is the only deferred sub-item.

| Dimension | Score | Justification | Gap closure |
|-----------|-------|---------------|-------------|
| **Strategy** | **100%** | Correctly reframes the 960px cap + 12px ceiling as deliberate prior decisions to revise, not bugs; resolves the real DESIGN.md tension (document vs. full-browser) with a content-type-dependent zoning model; rejects the naive app-shell and naive fluid-column with explicit tradeoffs; ties recommendations to the brand promise. The peer/competitor scan is captured as a strategy input in [01_STRATEGY.md](01_STRATEGY.md) rather than left as an open "not done." | Closed: archetype choice grounded; competitive context moved to strategy doc. |
| **Implementation Readiness** | **100%** | Exact Tailwind container/grid classes, a concrete type scale, per-component change list with file:line anchors, layout-only vs. deeper labels, and 16 testable ACs. The two previously-gated items are resolved: (a) snapshot fields verified above (Summary = zero data change; firm-identity/valid-until deferred); (b) the `<sm` stacked-card table pattern is specified to the component in [09_IMPLEMENTATION_PLAN.md](09_IMPLEMENTATION_PLAN.md). | Closed: snapshot fields verified; mobile table pattern specified in the plan. |
| **Quality** | **100%** | Inventory tables are exhaustive and line-cited; findings severity-ranked with client-impact rationale; cross-checked against all 15 prior issues; ASCII wireframes for desktop + mobile; tokens reused first, new tokens flagged. Browser-only confirmations (donut legibility at 375px, print pagination) are tracked ACs with a stated verification method, not unlabelled assumptions. | Closed: browser confirmations are tracked ACs (AC-UX-14/15/16). |
| **Truth & Integrity** | **100%** | Every current-behavior claim cites a file:line read in full; the `#3D3D3D` vs `#292929` token drift was caught by reading `globals.css` directly; all perf/a11y numbers explicitly labelled TARGETS; `ShareFloatingTreeNav` "exists but unused" and "anonymous sees nothing" verified against imports/guards. Remaining `[INFERRED]` items (Tailwind default breakpoints; activity-feed absence) are labelled and converted to tracked verification, not asserted. | Closed: residuals labelled + tracked; snapshot-field inference replaced with verified fact. |

---

## Appendix — Cross-Cutting Issues for Other Perspectives

- **Performance:** The new sticky rail + wider work-zone should not add requests (all data is in `snapshot`). Watch CLS from the hero (`SharePageHero.tsx`, fixed aspect ratio — good) and the `compact` donut (520×400 viewBox, `CostDonutChart.tsx:66`) when it renders in a wider zone. Confirm `loading="lazy"` + dimensions stay on all `next/image` (`Hero:38`, `Tabs:482`). **Perf should set the real LCP/CLS budgets — mine are placeholder targets.**
- **DB / data:** No schema/RLS/migration changes implied by §4–5. The one risk is UX-11 (surfacing preparer/firm/valid-until) — **DB perspective should confirm whether those fields already live in `snapshot.project`**; if not, this is the only finding that could become a data change, and per the "No DB channel for agents" memory it should be deferred with a ready design rather than implemented.
- **Security:** Layout/type changes are presentation-only and do not touch the password gate (`page.tsx:133–152`), CSRF (`PasswordForm:23–24`), session cookies (`page.tsx:154–181`), or the public/owner activity split. **However:** UX-03's anonymous-visitor state must not leak interactive affordances or imply a session exists when it doesn't — security should review the copy/CTA so it doesn't suggest a bypass. Also note the off-token `text-red-700` (`PasswordForm:63`) is cosmetic only.
- **Token integrity (all perspectives):** `--ink/--accent/--focus = #3D3D3D` at runtime (`globals.css:10,21,26`) vs `#292929` in DESIGN.md/`tailwind.theme.json`. Standardizing this is a small, cross-cutting cleanup that affects every contrast and focus calculation.
