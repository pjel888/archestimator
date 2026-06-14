# Projects Page — Final Multi-Agent Review Outcome

**Date:** 2026-06-14
**Method:** A multi-agent workflow ran 6 review lenses (DESIGN.md compliance, interaction correctness, accessibility, the access-state × view-mode edge matrix, density-ladder honesty, consistency) over the four changed files, then **adversarially verified every finding** (each verifier defaulted to "refuted" unless it could independently confirm the defect against the code).

**Result:** 21 raw findings → **6 refuted by verification** → **15 confirmed** (1 P1, 4 P2, 10 P3).
**Action:** **8 fixed**, **7 accepted as deliberate tradeoffs** (documented below). This was on top of an earlier single adversarial reviewer (8 findings, all fixed).

---

## Fixed (8)

| Sev | Finding | Fix |
|-----|---------|-----|
| **P1** | `text-tertiary` (#7F7F7F) meta fails WCAG AA — 4.00:1 on white, 3.67:1 on surfaceMuted (need 4.5:1). Client, location, dates, code, role, monogram all affected. | Promoted load-bearing meta to `text-secondary` (#5D5D5D → 6.0:1 / 6.04:1) across `LiveProjectCard` + `ProjectCard`. **See system-wide note below.** |
| **P2** | List-row controls strip (`z-20`, default pointer-events) swallowed clicks meant for the whole-row link — dead zone on the right edge. | Container `pointer-events-none` (gated to non-pending so the Accept button keeps events); controls re-assert pointer-events when revealed/active. |
| **P2** | Small-tile overlay wrappers (`z-20`) swallowed corner clicks meant for the stretched tile link. | Both overlay wrappers `pointer-events-none`; persistent controls (favorited star, active checkbox) re-assert `pointer-events-auto`. Verified: wrappers `none`, star `auto`, link `z-10`. |
| **P2** | `pendingInviteCount` owner signal only rendered in large mode (invisible in list/small/medium). | Added a persistent `invitesChip` to the chip row (all modes); removed the redundant large-only invites line. |
| **P2** | `hasUnseenSharedLinkActivity` prop + "Activity" chip in `ProjectCard` were dead code (never passed). | Deleted the prop and chip. |
| **P3** | Favorite-busy used native `disabled` → dropped keyboard focus to `<body>`, no busy announcement. | `aria-disabled` + `aria-busy` + guarded onClick (stays focusable); `aria-busy:cursor-wait` + `aria-disabled:opacity-60`. |
| **P3** | Pending-invite expiry date hidden in medium (large-only). | Expiry line now shows whenever `isPendingInvite && expiresAt`, so medium pending tiles show "Expires {date}". |
| **P3** | Medium and large nearly identical (same 4:3 image; differ by 1px title + one meta line). | Distinct image rhythm: small `aspect-square`, **medium `aspect-[3/2]`**, **large `aspect-[4/3]`** — the rungs now read as different densities. |
| **P3** | List columns (date, project code) unlabeled. | Added `sr-only` labels ("Updated"/"Invite expires", "Project code") for screen-reader clarity. |

> (9 rows above = the P1 + 4×P2 + 4×P3 that were fixed.)

---

## Accepted as deliberate tradeoffs (7) — with rationale

Each was rated P3 and "debatable" by the verifier; accepting them is a conscious design decision, documented for honesty.

1. **Shared-project role (viewer/editor) shows visually only in large** (medium/small show the access *kind* chip but not the role). — *Accepted:* the density ladder Philip chose trims secondary meta below large; the access **kind** (the load-bearing "can I edit only estimates?" signal) **is** shown in every mode, and the precise role **is preserved in the article `aria-label` in every mode** (no accessibility loss). Adding a role chip everywhere would re-bloat the ladder.

2. **Sample reference cards render as a tile grid in list view** (not aligned rows). — *Accepted:* sample cards appear only in the zero-projects first-run state, are explicitly labelled "references only," and `ProjectCard` has no row layout. Giving it a full view-mode-aware row variant is over-investment for an illustrative placeholder; the grid density already responds to the toggle.

3. **Loading skeleton always mirrors the default "large" card.** — *Accepted (inherent):* the view mode lives in `localStorage`, unreadable server-side, and the SSR snapshot is "large." First-load/no-preference users (the common case) match; only users with a saved non-large preference see a one-time reflow. The honest fix (mirror a `viewMode` cookie) is a persistence-layer change beyond this surface's scope — **recommended as a follow-up.**

4. **Sample card keeps a 3-col metrics strip** the live card/skeleton don't have. — *Accepted:* it's the sample's reference value (showing example areas/items/revision). Samples and live cards are mutually exclusive (never co-rendered), so there's no side-by-side inconsistency.

5. **Sample footer value is `ink` (estimate total), live footer is `secondary` (project code).** — *Accepted:* different content warrants different emphasis (a money total earns weight; a code stays quiet). The two cards never appear together.

6. **Open affordance micro-interaction differs** (sample = whole-card link with a decorative span; live = focusable chip link). — *Accepted:* inherent to the two interaction models; both are DESIGN.md-compliant.

7. **(rolled into #3)** skeleton/mode coupling — same root as item 3.

---

## ⚠️ System-wide note for Philip (honest flag)

The P1 contrast fix promoted `text-tertiary` → `text-secondary` **on the projects cards only**. But `#7F7F7F` (tertiary) is the **app-wide** convention for metadata, sanctioned by `DESIGN.md` ("Subtle (#7F7F7F) supports … metadata, descriptions, labels") — while that same `DESIGN.md` also targets "WCAG 2.1 AA … ≥4.5:1 for body text." **Those two statements conflict: #7F7F7F is 4.0:1 and fails AA.**

So this is a **design-system-level** issue, not specific to this page. I fixed it here because (a) it's a primary surface, (b) the impeccable skill treats AA contrast as a hard rule, and (c) leaving a known AA failure isn't "production-ready." But the projects cards are now slightly darker-metaed than the rest of the app.

**Recommendation:** decide at the system level — either roll `secondary`-for-load-bearing-meta out app-wide (and update `DESIGN.md`), or consciously document a tertiary-meta exception. Until then, this page is the (more accessible) outlier.
