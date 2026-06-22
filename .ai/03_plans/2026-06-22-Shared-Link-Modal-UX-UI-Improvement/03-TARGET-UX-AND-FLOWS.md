# 03 — TARGET UX & FLOWS · Shared-Link Modal

**Source:** Phase C `target-ux` design agent, grounded in `02-PROBLEM-REGISTER.md` + real code. Resolves **PROB-01** (first-publish landing is the slowest path), **PROB-04/18** (overloaded Update button), **PROB-06/19** (success dead-ends), **RC-01/02/03**. The principle: organize the modal around the user's job-to-be-done ("share this estimate with a client"), not the server-action lifecycle.

---

## 1. Information architecture — collapse 5 tabs → 3, kill the triplicated facts

**Today:** grey sidebar (status/opened/last-opened/published/expires) **+** a 5-column overview `<dl>` (Estimates/Access/Location/Expiry/Activity) **+** 5 tabs (Link/Estimates/Access/Recipients/Activity). Every fact appears in 2–3 places (PROB-14).

**Target:** one **status sidebar** (240px) + one **header band** + **3 tabs**, with a single source of truth per fact.

- **Status sidebar** — STATUS PANEL ONLY. Status pill (`Link off` / `Draft` / `Link live` / `Expired` / `Turned off`), snapshot version, opened-count, last-opened-by, the stale-snapshot warning band, and published/expires in **relative** framing ("expires in 3 days", inheriting `ProjectTeamspaceHeader.tsx:88-97` `formatExpiry` — PROB-30). No duplicated Estimates/Access/Location. **The 5-col overview `<dl>` (`:749`) is removed entirely** (PROB-14/20).
- **Header band** (top of content, always visible) — **the link dominates here** (PROB-03). Big link field (14–16px) + Copy/Open + inline status label. The password/access chip sits beside the link at an AA-passing size (8px→11px, PROB-29).
- **3 tabs:** (1) **Content** (was "Estimates") = `SheetPickerList` + a collapsed-by-default **"Access & privacy"** disclosure (password / expiry / location — progressive disclosure); (2) **Recipients** (unchanged leaf, `RecipientEmailComposer`); (3) **Activity** (unchanged leaf, owner-only).
- **The "Link" tab is removed as a tab** — the link field is promoted into the always-visible header band. This kills the "open to an empty link field" first-publish failure (PROB-01) and the link/estimates coupling (Generate needed estimates selected on a *different* tab — RC-02).

## 2. Primary flow — "share this estimate with a client" as ONE dominant path

| Step | Actor | Action | UI |
|------|-------|--------|----|
| 1 | Owner | Presses share icon | Modal opens on the **Content** tab (not Link). Header band shows a ghost link placeholder ("Generate a shared link…") at 14–16px. `SheetPickerList` is the focal input, defaulted to all sheets or the last-curated selection (**AC-MOD-18 preserved**, `:328`). Primary CTA reads "Generate shared link". |
| 2 | Owner | Curates which estimates the client sees (unchecked = invisible to the client — receiver-consequence copy beside the picker) | `SheetPickerList` on Content tab. "N of M estimates" inline. **No tab switch.** |
| 3 | Owner | *(Optional)* Expands "Access & privacy" for password / expiry / location. Collapsed by default. | Disclosure inline on the Content tab. |
| 4 | Owner | Presses "Generate shared link" (single dominant CTA in the **footer slot**) | Button shows pending label + spinner ("Generating…"), aria-busy. Only this button shows pending (not disable-all). `createProjectPublication` fires. |
| 5 | System | Action resolves; optimistic `localResult` set (signature-gating preserved); drafts reset on success (`:534-546` preserved) | Header band fills with the live URL (pre-selected), status flips to "Link live". Footer CTA re-labels to "Update shared page". **Guided next-step row** (not a dead-end toast): "Link is live. Copy it to share, or add recipients." |
| 6 | Owner | Presses Copy (link pre-selected, `:852` onFocus-select preserved) OR switches to Recipients tab to email it | Copy/Open in the header band. This is the "share this estimate" completion. |

**Result:** the 6-step cross-tab hunt collapses to *open → pick estimates → Generate → Copy*.

## 3. State machine

| State | Entry trigger | What the user sees | Primary action | Transitions to |
|-------|--------------|--------------------|----------------|----------------|
| **unpublished-empty** | Modal opens, `status=unpublished` & no `clientLinkPath` (first share, or after revoke→regenerate cleared) | Content tab landing. Header band: ghost placeholder + "Link off" status. Footer CTA: "Generate shared link". Rotate/Turn-off hidden (no live link). | Generate → `createProjectPublication` | published-live |
| **drafting** | published-live (or published-stale) with any `xDirty` (`managerPendingChangeCount > 0`, `:433` preserved) | Header band: live/stale link + "Draft" pill + amber "N pending changes" pill. Footer CTA: "Update shared page" **with a per-dimension summary** ("3 estimates, password, expiry changed"). | Update → `republishProjectPublication` (full snapshot — **bundling is now explicit and shown, not silent**, PROB-04) | published-live (drafts reset) |
| **published-live** | `status=published`, no dirty drafts, `clientLinkPath` present | Header band: live link (selectable) + "Link live" + opened-count. Footer: secondary "New link" (rotate) + danger "Turn off link" (revoke). Primary slot quiet. | Copy/Open (header) or switch tabs | drafting (on edit); published-live→expired (client countdown) |
| **expired** | client-side countdown crosses `expiresAt` (re-derived, PROB-09) | Expired banner: "This link expired — clients see an expired page. Reactivate (safest) or create a brand-new link (breaks bookmarks)." | Reactivate (same URL/password) or Create-new | published-live (reactivate) / unpublished-empty |
| **revoked** | `status=revoked` (`Turn off` confirm confirmed) | **Revoked banner** (replaces misleading live UI — PROB-19): "This shared link is off — clients can no longer open this page. Generate a new link to share it again." | Generate → `createProjectPublication` | published-live |

## 4. Tab strategy — why 3, not 5

Keep **Content / Recipients / Activity**. Fold the old **Link** tab into the header band (the link is always-visible context, not a destination) and fold the old **Access** tab into a collapsed "Access & privacy" disclosure *inside* Content. Rationale:
- **First-publish coupling (RC-02):** `createProjectPublication` requires `selectedEstimateIds` before Generate. Co-locating the picker with Generate (same tab) makes that coupling natural instead of a hidden cross-tab gate.
- **Recipients/Activity stay leaves** — they're already cleanly extracted (`RecipientEmailComposer`, `SharedLinkActivityFeed`); preserve that boundary.
- **Access is advanced** — most first-shares are open-access; password/expiry/location behind a disclosure keeps first-publish uncluttered (progressive disclosure, see §5).

## 5. Progressive disclosure

- **Default:** Content tab shows the estimate picker + the dominant Generate. "Access & privacy" collapsed.
- **On expand:** password (checkbox → conditional field), expiry (datetime-local + Clear), location (3 radio cards) — all the existing Access-tab controls, relocated.
- **The dirty-draft model is preserved** (`xDirty` + "Unsaved — Update to apply", `:893`/`:918`) but the *copy* is reframed receiver-first (see doc 06: "Client still sees your saved settings. Update to send the new ones.").
- **The overloaded Update (RC-02) becomes explicit:** when `drafting`, the Update button surfaces a per-dimension summary of what will change, so the bundle is visible — not a silent flip.

## 6. Edge cases

| Case | Handling |
|------|----------|
| No shareable publication (`summary === null`) | Calm, right-sized info card ("No shareable page yet…") — no longer in a 600px cavern (PROB-15). Copy reframed to "client page" not "publication" (doc 06). |
| Expired | Expired banner with Reactivate (safest) vs Create-new (breaks bookmarks) — receiver-consequence copy. |
| **Rotate just happened** (all client links died) | **Guided continuation** (PROB-06): auto-navigate to header link, clay success-ring on the field, select+focus it, pulse Copy once, announce "New link generated — copy and re-send to kept recipients." |
| **Revoked** | Revoked banner (PROB-19) — replaces the misleading live state; single next step (Generate). |
| Stale snapshot | Amber band with slow pulse + receiver-consequence copy ("Your client is seeing the proposal from N days ago. Update to send today's numbers."). |
| Password-clear intent (PROB-18) | Keep the confirm gate, but make the *intent* explicit — don't overload the primary Update with a destructive branch; surface "Remove password?" as its own clear affordance with the access-widening consequence. |
| 0 estimates selected | "No estimates selected — your client would see a blank page. Pick at least one to generate the link." (replaces "generate is disabled"). |

## 7. Resolves
`PROB-01`, `PROB-04`, `PROB-06`, `PROB-18`, `PROB-19`, `PROB-14` (IA side), `RC-01`, `RC-02`, `RC-03`. (Visual hierarchy detail → doc 04; a11y of tab/focus → doc 05; copy → doc 06.)
