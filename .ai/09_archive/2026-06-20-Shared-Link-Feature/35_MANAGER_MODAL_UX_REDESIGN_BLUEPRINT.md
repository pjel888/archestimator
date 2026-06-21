# 35 — Manager Publication Modal UX/UI Redesign Blueprint

Date: 2026-06-21 · Status: **DESIGN DIRECTION — owner review required (DESIGN.md is an alpha guide, not law)**
Lens: `/impeccable` · Owner decision-maker: Philip · Implementing lane: frontend + design-system

> Companion to [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) (the client side). The owner judged the whole
> Shared-Link experience — **"from the modal to the shared link page itself"** — to have bad UX/UI. This
> is the **sender-side** redesign: the publication modal in `src/components/workshop/ProjectPublicationHeader.tsx`
> (~1172 lines) + `RecipientEmailComposer.tsx`, where a manager creates the link, controls access, invites
> the client, and watches for a decision. Grounded in a source-level user-POV teardown. MANAGER-F-03
> and MANAGER-F-04 are functionally fixed in source; MANAGER-F-06 quick actions are now fixed locally.
> This blueprint still owns the higher-level manager presentation redesign for the copy/preview moment and recipients list polish.
> Verification in [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).

---

## 1. Who this is for, and the one job

**Persona — "the Manager."** A contractor/estimator who just finished an estimate and wants to send a
polished, trustworthy, view-only proposal link to a client, control access (password + expiry), invite the
client by email, then watch for opens and a decision. The emotional bar is **"look professional and feel
in control."** This is a relationship-and-revenue moment, not a settings chore.

**Job-to-be-done.** *"When my estimate is ready, help me send my client a trustworthy, controlled link to
a polished proposal page, and tell me the moment they open it and decide — without making me feel I'm
configuring a database."*

---

## 2. Current-state verdict — what the manager actually feels

Source-grounded teardown of `ProjectPublicationHeader.tsx` + `RecipientEmailComposer.tsx` + `ProjectChromeAsync.tsx`.
File:line anchors below were re-verified against `ProjectPublicationHeader.tsx` (1172 lines) + `RecipientEmailComposer.tsx` on 2026-06-21; re-pin to a commit SHA before execution (the worktree is dirty).

| # | Sev | What the manager feels | Root cause (file:line) |
|---|:--:|---|---|
| M-1 | **P0** | *"Where is Share?"* | The product's marquee client action is a **14px unlabeled `LinkSimple` glyph** in a size-10 tile, **visually identical** to the teamspace/activity/export tiles beside it. `ProjectPublicationHeader.tsx:555-571`, `ProjectChromeAsync.tsx:53-78`. Sharing is encoded as utility chrome. |
| M-2 | **P0** | *Overwhelm; no obvious "do this first."* | The modal carries **four competing control regions at once**: a 260px grey metadata sidebar (`:607`), **five tabs** (Link/Estimates/Access/Recipients/Activity, `:658-665`), a persistent footer "Link controls" action zone (`:902`), and a feedback strip (`:1016`). The natural flow (pick → protect → get link → invite → watch) is fragmented across non-sequential tabs. |
| M-3 | **P0** | *"I changed a setting and nothing happened."* | Access and Estimates tabs have **no save of their own**; password, expiry, and estimate selection only persist when the manager later finds the footer **Update/Generate** button (`:954-987`). "Unsaved — Update to apply" hints (`:777,802`) acknowledge the disconnect. Worse, pressing Update can silently become a destructive **"Clear password?"** confirm (`:963-966`). |
| M-4 | P1 | *"Which button makes a link, and which one breaks my client's link?"* | **Three-to-four near-synonyms** with different blast radius: "Generate/Update shared page" (`:986`), "New link"=rotate (`:998`, breaks every recipient link), "Turn off link"=revoke (`:1010`), plus "Reactivate"/"Create new link instead" (`:935,948`). Fear of pressing the wrong one. |
| M-5 | P1 | *"Did anyone open it? What did they say?"* — the payoff is hardest to find. | Activity is the **last** tab, owner-gated, rendered at the **smallest type** (9px, `:685-686`). The "something happened" signal is a **2px dot** on the 14px trigger (`:572-578`) most users never notice. (MANAGER-F-06.) |
| M-6 | P1 | *Recipients feel cramped and low-trust.* | Each invited person is still visually cramped, though the functional failed-send retry path is fixed. The remaining issue is presentation: compact pills carry email + raw status word ("pending/sent/opened/failed") + resend/remove controls in a wrapping row, with limited scanability and no per-recipient open timestamp. (Builds on MANAGER-F-04 rather than blocking it.) |
| M-7 | P1 | *Dead-end when email isn't configured.* | If delivery isn't configured the **whole composer is disabled** with a muted sentence telling the manager to "copy the share link manually" (`RecipientEmailComposer.tsx:277-281`) — no path forward. |
| M-8 | P2 | *The copy moment is anticlimactic / untrusting.* | Copy is a ghost button firing an `sr-only` toast (`:738-761`) with **no visible "Copied ✓"**, no client preview, no QR. The emotional peak of the flow has the same weight as everything else. MANAGER-F-03's page/API unavailable-link copy is fixed; this row is the remaining presentation opportunity around confidence and preview. |
| M-9 | P2 | *Everything is flat and squinty.* | Type is uniformly meta-sized (8px access chip `:764`, 9px labels, 10px body); **nothing rises to a 12px title or a confident primary** — zero hierarchy, reads cheap. Native `datetime-local` expiry input (`:859-868`) breaks the SF Pro language. |

**Diagnosis:** the modal is a **database settings panel** for what is fundamentally a **linear,
emotional, relationship task**. It violates `DESIGN.md`'s "one surface, one shadow" (four control regions),
buries the return-visit payoff (activity), and makes safe and dangerous actions look alike.

---

## 3. Design principles for this surface

1. **One calm white-paper surface**, not sidebar + tabs + footer + strip. 12px radius, one soft shadow, hairline border; 3px radii for dense inner controls. (`DESIGN.md` "one surface, one shadow".)
2. **Linear flow over tabs.** Top-to-bottom: get & copy the link → curate what's included → set access → invite → watch. Each section **saves where it's made** (kill the settings-vs-commit split).
3. **Use the top of the type scale for hierarchy.** 12px/500 titles for the link hero + section headers, 10px body, 8–9px **strictly** for meta. Today everything floors at 8–10px.
4. **Tie destructiveness to button hierarchy.** One neutral primary (Create link / Save changes). Rotate/regenerate demoted into an explicit low-emphasis "Advanced / Reset link…" with a plain-language confirm. **"Turn off link" is the only danger-styled control.**
5. **Humanize, never color-only.** Statuses read "Invited / Delivered / Opened 2h ago / Approved" (icon + text, WCAG AA), not raw "pending/sent". Restrained clay accent only; reserve danger for revoke.
6. **Match return-visit intent.** Managers create once but re-open many times to monitor — so a **live** link opens to an activity/overview pulse, with Setup one click away.

---

## 4. The redesigned experience — a linear "Share" sheet

### 4.1 The entry point (fixes M-1)
Replace the unlabeled glyph with a **labeled, primary-weight "Share" control** that carries live state:

```
  Before:   [🔗]  [👥]  [🕘]  [⤓]      ← 4 identical 40px tiles, no labels
  After:    [ 🔗  Share · Live · 3 opened ]   [👥] [🕘] [⤓]
                ^ labeled, primary weight, ambient state pill
```
The state pill ("Draft" / "Live" / "Live · 3 opened" / "Approved ✓") surfaces *"is it live, has anyone
opened it"* **without opening the modal** — answering M-5's intent ambiently.

### 4.2 The Share sheet — one surface, linear flow (fixes M-2/M-3)
Collapse the five tabs + sidebar + footer into **one scrolling white-paper sheet** with at most a
two-segment switch (**Setup** / **Activity**). A live link **opens on Activity** (4.6); a new link opens on Setup.

```
┌──────────────────── Share · Kitchen Renovation ─────────────────┐  one white-paper surface
│  [ Setup ]  Activity ·3                                          │  12px radius, one shadow
├─────────────────────────────────────────────────────────────────┤
│  ① YOUR LINK                                                     │  the hero (4.3)
│     archest.im/p/9fa2…                 [ Copy link ]  Preview ▸  │  big primary Copy → "Copied ✓"
│     🔒 Password on · Expires in 14 days              ▣ QR        │
├─────────────────────────────────────────────────────────────────┤
│  ② WHAT'S INCLUDED                                    Edit ▸     │  inline summary of curated
│     3 estimates · ₦12,480,000 · last updated 2h ago             │  estimates (curation behind "Edit")
├─────────────────────────────────────────────────────────────────┤
│  ③ ACCESS                                            [ Apply ]   │  inline Apply (4.4)
│     ◉ Require password   ········· [show]                        │
│     Expires:  No expiry · [7d] · (14d) · [30d] · Custom         │  friendly presets, not datetime-local
├─────────────────────────────────────────────────────────────────┤
│  ④ RECIPIENTS                                  [ + Add people ]  │  a real list (4.5)
│     Jane Okafor   jane@…        Opened 2h ago        ⋯           │
│     David Mensah  david@…       Delivered            ⋯           │
├─────────────────────────────────────────────────────────────────┤
│                                          [ Save changes ]        │  ONE neutral primary
│     Advanced ▸  (Reset link · Turn off link)                    │  destructive folded away (4.7)
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 The link hero — make the copy moment the peak (fixes M-8)
A single white-paper card: the URL, **one strong primary "Copy link"** that flips to an inline **"Copied ✓"**
for ~2s, a **"Preview as client"** link (opens [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) read-only), and a
small **QR**. Password/expiry state is quiet inline metadata beneath. This answers *"what does my client
actually see?"* before they send it — the Linear/Notion/Figma share pattern.

**QR strategy:** MVP should not add a new QR dependency by default. First verify whether an existing package,
browser `Canvas`, or platform utility already covers QR generation within the bundle budget. If not, defer QR
and keep "Copy link" + "Preview as client" as the beta path; the sheet must not block on QR.

### 4.4 Access — inline Apply + friendly presets (fixes M-3/M-9)
Clean "Require password" toggle with an explicit current-state line; password field with show/**Save inline**;
expiry as **chips** (No expiry / 7 / 14 / 30 days / Custom) replacing the OS-native `datetime-local`. The
ambiguous "checked box + blank field" state is resolved by showing the saved state explicitly. Honors the
existing draft/credential-version semantics (do not weaken — see [10](10_SECURITY_PRIVACY_API_AUDIT.md)).

**Action persistence contract:** "saves where made" is a product contract, not decorative copy.

| Setting / action | Save trigger | Existing server action / seam | Dirty state | Success / error copy | Destructive confirm |
|---|---|---|---|---|---|
| Estimate inclusion | inline Apply or section Save | create/update publication action in `actions.ts` | "Unsaved estimate changes" near section | "Included estimates updated" / scoped error | No |
| Password on/off/value | inline Apply in Access | update publication credentials/access action | "Password changes not live yet" | "Password saved" / validation error | Turning off password requires confirm if link is live |
| Expiry | preset chip + Apply | update publication access action | "Expiry changes not live yet" | "Expiry updated" | Shortening existing live expiry requires confirm |
| Copy link | immediate client action | no server mutation | none | visible "Copied" state | No |
| Add recipient | per-recipient Add/Send | recipient add/send action | row pending | per-row Delivered/Failed with retry | No |
| Remove recipient | row overflow action | recipient remove action | row pending | "Recipient removed" / scoped error | Yes if recipient has opened/responded |
| Reset link / rotate | Advanced action | rotate credentials action | modal pending | "Link reset; old links no longer work" | Yes, names blast radius |
| Turn off link | Advanced danger action | revoke action | modal pending | "Link turned off" | Yes |

### 4.5 Recipients — a real, humanized list (builds on fixed MANAGER-F-04)
One row per person: name/email, a **calm human status pill** (Invited / Delivered / **Opened 2h ago** /
Approved — icon + text, never color-only), right-aligned **⋯** overflow for Resend/Remove. The chip input
stays **only for adding** new emails. Destructive Remove (which deletes a recorded decision) moves out of a
9px × into an explicit confirm. **No-email fallback (M-7):** instead of disabling the composer, allow Add +
**"Copy personal link"** per recipient — keeps open-tracking/attribution even without Resend configured.

### 4.6 Activity — promote the payoff (fixes M-5; MANAGER-F-06)
Returning to a live link **opens on Activity**: a pulse of opens, recipient statuses, comments, and the
decision, at readable hierarchy (not 9px). This is the realtime question **D7** ([71](71_OPEN_DECISIONS_REGISTER.md),
SHF-01): the owner feed currently refreshes on focus/visibility only (`SharedLinkActivityFeed.tsx:81-95` —
source-verified, **not** realtime). Decision: either add a lightweight live mechanism or ratify focus-refresh
with honest "Refresh for the latest" copy. A **dashboard quick-action menu** (copy/preview/rotate/revoke,
MANAGER-F-06) now gives managers the common actions without opening the modal.

### 4.7 Unify the action vocabulary (fixes M-4)
- **One neutral primary**: "**Create link**" before a link exists → "**Save changes**" after. No separate footer.
- **"Reset link…"** (rotate/regenerate) folded into a low-emphasis **Advanced** menu with a plain-language confirm that names the blast radius ("this invalidates the link your recipients already have").
- **"Turn off link"** is the **only** danger-styled control.

---

## 5. Mapping to existing findings & decisions

- Builds on fixed **MANAGER-F-01** (RBAC matrix), **MANAGER-F-03** (page/API unavailable-link copy now comes from `SHARED_LINK_UNAVAILABLE_COPY`), **MANAGER-F-04** (failed-recipient retry), **MANAGER-F-05** (behavioral action tests), and **MANAGER-F-06** (dashboard quick actions); this blueprint can still improve the manager copy/preview moment and recipient list presentation. **F-02** is a backend/test regression item in [91](91_FORWARD_EXECUTION_PLAN.md), unaffected by this presentation redesign.
- Resolves the realtime question **D7** (SHF-01) on the *manager* side (the client never sees the activity feed — see [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) §4.5).
- Triggers no new schema; all controls map to existing `actions.ts` server actions (verify call sites in [72](72_BLAST_RADIUS_DEPENDENCY_MAP.md)).

---

## 6. Phasing

| Phase | Scope | Effort | Lands |
|---|---|:--:|---|
| **A — Findability + copy peak** | Labeled "Share" control with live-state pill; hero link card with affirmed "Copied ✓" + Preview + QR. | S–M | Kills M-1; makes the copy moment confident. |
| **B — Linearize** | Collapse 5 tabs + sidebar + footer into the one-surface Setup/Activity sheet; inline-save sections; unify action vocabulary + Advanced menu. | L | Kills M-2/M-3/M-4. |
| **C — Recipients + Activity** | Real recipient list with humanized statuses + per-recipient copy fallback; open-to-Activity-when-live + dashboard quick actions. | M | Kills M-5/M-6/M-7. |
| **D — Access polish** | Inline Apply + expiry presets replacing `datetime-local`; type hierarchy pass. | S–M | Kills M-9. |

---

## 7. Acceptance criteria (UX "done" for the manager)

- **AC-M1** A first-time manager finds how to share within 3 seconds: the entry control is labeled "Share" and visually distinct from utility icons.
- **AC-M2** No setting requires a separate commit elsewhere — password, expiry, and estimate curation each save where they are made, with a visible saved confirmation; "Update to apply" hints are gone.
- **AC-M3** Exactly one neutral primary action is visible per state; rotate/regenerate live behind an "Advanced" affordance with a blast-radius confirm; only "Turn off link" is danger-styled.
- **AC-M4** Recipients render as a scannable vertical list with humanized, timestamped statuses (icon + text, AA); adding works even when email delivery is unconfigured (per-recipient "Copy personal link").
- **AC-M5** Re-opening a live link lands on an Activity pulse at readable type (no 8–9px load-bearing copy); the entry control shows ambient state ("Live · N opened").
- **AC-M6** All states pass the manager checks (M-01/M-02) in [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md); no manager mutation bypasses `assertProjectPublicationManager` (MANAGER-F-01, [10](10_SECURITY_PRIVACY_API_AUDIT.md)).

Verification: the manager-side checks + viewport matrix in [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md);
existing manager tests (`project-publication-header.test.tsx`, `recipient-email-composer.test.tsx`) stay
green. **Presentation-layer only — must not weaken RBAC, CSRF, rotate/credential-version, or rate-limit
contracts.**

---

## 8. North star

*Turn a buried, database-like 5-tab settings panel into a calm, linear "Share" sheet that makes sending a
client proposal feel deliberate, trustworthy, and professional — one white-paper surface that flows from
"get & copy the link" to "invite people" to "watch them open and decide," where every setting saves where
it's made, destructive actions are clearly subordinate, and the manager always feels in control and in the
know.*
