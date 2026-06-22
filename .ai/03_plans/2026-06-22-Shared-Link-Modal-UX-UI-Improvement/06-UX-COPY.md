# 06 — UX COPY · Shared-Link Modal

**Source:** Phase C `ux-copy` design agent. Resolves **PROB-07/08/27/30** (RC-06 — copy written from the sender's data model, not the receiver's experience). **The bar:** the existing destructive-confirm copy (`readDestructivePublicationActionCopy`, `:234-270`) is precise, honest, receiver-consequence-laden. This doc lifts that bar across location-visibility, password, estimates, stale-snapshot, expiry, and every lifecycle action. All copy lands in the FIXED server contract + existing components (`ControlField`/`ControlInput` for label/helper; the `actionFeedback` strip + sr-only live region `:659-666`/`:1173-1189`; `readDestructivePublicationActionCopy` for confirms). **No new RPCs.**

---

## 1. Voice principles

1. **Name the CLIENT consequence, not the sender's internal state.** Every label/helper/confirm lets the owner answer "what will my client see, and what must I do next?" without reading the data model. (RC-06)
2. **Consequence-forward verb order:** lead with the recipient/client effect, then the mechanism. "Clients see your city only" before "exact GPS is stripped." "All old client links stop working" before "a new token is minted."
3. **Match the destructive-confirm bar everywhere.** The confirms already say exactly what re-publishes, what doesn't, who keeps access, who must re-enter a password. Day-to-day toggles currently fail this — the goal is parity, not a new register.
4. **Plain language over data-model vocabulary.** "proposal"/"version"/"what the client sees of your address"/"link status" instead of "snapshot"/"snapshotVersion"/"locationVisibility"/"delivery_status". Keep a technical term only where it's the honest name the owner already knows.
5. **Guided next step after every terminal action.** A one-line success is a dead end (PROB-06/19). Generate/republish/rotate/regenerate/revoke/reactivate each end with the single most-likely next action + (where the link changes) explicit "copy the new link and re-send."
6. **Specific over generic.** "All old client links stopped working" > "The link has changed." "The client is seeing a proposal from N days ago" > "Snapshot is behind." Concrete numbers ground the owner.
7. **Honest about irreversibility and limits.** "permanently delete," "cannot be undone," "best-effort delivery — link creation always succeeds."
8. **Body copy capped tight; the link URL and status must dominate.** Copy supports a 14–16px link + status; don't let a paragraph helper dilute the focal link.

## 2. Copy table (current → proposed, file:line)

| ID | Location | Current | Proposed | Why |
|----|----------|---------|----------|-----|
| C-LOC-HELPER | `:966-968` (location helper) | "Controls how much of the saved project location appears on the shared page." | "What your client sees of this project's address. **Hidden** keeps your exact address off the shared page; **City** shows only the city; **Exact** shows the full saved address." | Names the client view + privacy consequence (your address hidden) explicitly. |
| C-LOC-OPT-LOCALITY | `:85` (locality desc) | "Show a coarse location only." | "Client sees the city, never the street address." | "Coarse location" is sender jargon. |
| C-LOC-OPT-EXACT | `:90` (exact desc) | "Show the saved project location." | "Client sees the full saved address." | "Saved project location" = data model. |
| C-LOC-OPT-HIDDEN | `:95` (hidden desc) | "Do not show location on the client page." | "Your address is hidden from the client." | Reframe passive system behavior → owner-facing privacy guarantee. |
| C-PW-STATE | `:926-928` (saved pw state, `role=status`) | "Password is currently set" / "No password set" | "Clients must enter a password to open this shared page; failed attempts are logged." / "Anyone with the link can open this shared page without a password." | References the receiver gate (`ProjectPublicationPasswordGate`, "attempts may be recorded"); matches clear-password confirm voice (`:258`). |
| C-PW-REQUIRE-LABEL | `:943` (checkbox) | "Require password" | "Require a password to open" | Ties the control to the client's open action. |
| C-PW-FIELD-LABEL | `:946` (ControlField) | "Link password" | "Password clients enter" | Centers the receiver. |
| C-PW-PLACEHOLDER-SET | `:952` (pw set) | "Enter a new password to change it" | "Type a new password to replace the one clients use today" | Names the consequence (old recipients who memorized it are affected). |
| C-PW-PLACEHOLDER-UNSET | `:952` (pw unset) | "Set a link password" | "Choose a password clients must enter" | Aligns with new field label + state copy. |
| C-EST-HEADER | `:890` (Estimates header) | "Estimates to include" | "Estimates the client will see" | "To include" = build-the-snapshot verb; "the client will see" = receiver consequence. |
| C-EST-HELPER | (new helper under Estimates header) | *(none — only the dirty hint + "generate is disabled")* | "Only checked estimates appear on the shared page. Unchecked sheets are hidden from your client until you press Update." | The receiver consequence ("unchecked = invisible to client") is the most important fact on this tab and is currently absent. |
| C-EST-EMPTY | `:907` (0-selected) | "0 estimates selected — generate is disabled" | "No estimates selected — your client would see a blank page. Pick at least one to generate the link." | "Generate is disabled" = mechanism; "blank page" = consequence + remedy. |
| C-EST-DIRTY | `:893-895` (dirty hint) | "Unsaved — Update to apply" | "Saved — client still sees the old selection. Update to send the new one." | Reframe sender-bookkeeping → live client reality + remedy. (Preserves the `xDirty` mechanism; only the string changes.) |
| C-ACCESS-DIRTY | `:918-921` (dirty hint) | "Unsaved — Update to apply" | "Client still sees your saved settings. Update to send the new ones." | Same reframe for the password/expiry/location cluster. |
| C-STALE | `:694-697` (stale band) | "Snapshot is {daysBehind} days behind current data. Update shared page." | "Your client is seeing the proposal from {daysBehind} days ago. Update to send today's numbers." | Names the client consequence (acting on stale pricing). Keep amber band + `text-amber-950`. |
| C-EXP-HELPER-SET | `:1006-1008` (expiry helper, set) | "Recipients lose access after this time. Clear the field for no expiry." | "Clients can open the shared page until this date and time, then their link stops working. Clear the field to keep it live indefinitely." | Sharpen to the concrete receiver experience. |
| C-EXP-HELPER-UNSET | `:1008` (expiry helper, unset) | "No expiry — the link stays live until you turn it off or rotate it." | "No expiry — clients can open this shared page any time until you turn off or replace the link." | "Stays live" = system-speak; "clients can open any time" = receiver. |
| C-EXP-DISPLAY | `:439` + `:728` (expiry display) | `formatDate` absolute ("Jun 5, 2026, 2:00 PM") | Adopt `formatExpiry()` from `ProjectTeamspaceHeader.tsx:88-97`: "expires in 3 days" / "expires in 5 hours" / "expired" / "no expiry" — **relative primary, absolute secondary.** | The Teamspace header already ships relative expiry; the modal forces date arithmetic. Share/inherit that pure helper. |
| C-LINK-HELPER | `:841` (link helper) | "Anyone with this link can view this project page." | "Anyone with this link can open the shared page — send it only to people you trust. {password on ? 'A password is required to open it.' : 'No password protects it.'}" | Folds the access state into the focal point (the link) so the disconnected 8px chip (`:880`) is no longer the only access signal. |
| C-RECIPIENTS-INTRO | `RecipientEmailComposer.tsx:340` (also PROB-02 AA fix) | "Add emails to receive the unique share link for {project}. Delivery is best-effort; link creation always succeeds." | "Each recipient gets their own private link to the shared page. Delivery is best-effort — if an email fails, the recipient is still added and you can copy their link manually." | "The unique share link" implies one shared link; in fact each recipient gets a personal token (the rotate/regenerate + resend-rotates-token design depends on this). Flip `text-tertiary→text-secondary`. |
| C-RECIPIENTS-EMPTY | `RecipientEmailComposer.tsx:487` | "No recipients yet. Add emails above and send." | "No recipients yet. Add client emails above and press Send — each gets a private link." | Centers "client" + the per-recipient-link model. Flip tertiary→secondary. |

## 3. Empty states

| State | Copy |
|-------|------|
| no-publication (`summary === null`) | **Title:** "No shareable page yet" **Body:** "This project doesn't have a client page to share. Open a project with estimates to create its shared link here." ("client page" not "publication".) |
| 0-estimates-selected | "No estimates selected — your client would see a blank page. Pick at least one to generate the link." |
| no-recipients | "No recipients yet. Add client emails above and press Send — each gets a private link." |
| no-activity | "Activity appears once the link is live and a client opens it. Generate or reactivate the shared link to start collecting opens, comments, and decisions." |
| **revoked** (banner replacing misleading live UI — PROB-19) | **Title:** "This shared link is off" **Body:** "Clients can no longer open this page. Any pending recipient links are stopped. Generate a new link to share it again." **Action:** "Generate shared link". Matches the revoke confirm body (`:267`). |
| expired (already at `:1058`) | "This link expired — clients see an expired page. Reactivate to keep the same URL and password (safest), or create a brand-new link that breaks any saved bookmarks." |

## 4. Error messages

| Case | Message |
|------|---------|
| No estimates on generate (server `actions.ts:566/637` "Select at least one estimate…") | "Pick at least one estimate first — your client would otherwise see a blank page." (QA C-A-02: the real client-side gate is **`generateDisabled` (`:630`, `!hasSelectedEstimates`)** — surface this copy there; the server message surfaces via the shared `!result.ok` branch at `:519-520`, there is no dedicated no-estimates "intercept".) |
| Rotate optimistic-concurrency conflict (`actions.ts:723`) | "This link changed in another window before the new link was created. Refresh and create the new link again — the old link is unaffected until you do." |
| Regenerate password-missing (client gate `:596-601`) | Keep current `:598` ("Enter a new password before creating a new protected link.") — it meets the bar. |
| Recipient resend conflict (`actions.ts:1307`) | Keep; optionally sharpen: "This recipient's link changed since you opened the modal. Resend from the Recipients tab to send the current link." |
| Clipboard unavailable (`:500-502`) | "Copy unavailable in this browser — select the link in the field and copy it manually (Cmd/Ctrl+C)." |
| Recipient self-invite / unsubscribed | Keep as-is (already consequence-clear); optionally append "Copy the link and send it to them through another channel." |
| Generic failure (`:548-553`) | Show the specific `result.message` for known cases; the catch fires only on network errors → "Check your connection and try again. Nothing was changed." |
| Email delivery not configured (`RecipientEmailComposer.tsx:338-341`) | Keep server `readiness.message`; ensure the intro (C-RECIPIENTS-INTRO) explains the manual-copy fallback. |

## 5. Success guidance (per action — the guided next step, PROB-06/19)

Intercept at the `runPublicationAction` success branch (`:523-547`). **QA C-03 (feasibility):** the FIXED result contract is `{ok, message, clientLinkPath?}` — there is no action-kind field, and reactivate is literally `republish({expiresAt:null})` (indistinguishable at the result level). **The fix is client-only (no RPC change):** thread a caller-known **action label** (generate/republish/rotate/regenerate/revoke/reactivate/clear-password) into the success handler — the onClick already knows which action it fired, and reactivate is distinguishable because the caller knows it came from the expired-state path. Elevate "thread the action label" to an explicit Phase-5 task (doc 08 Phase 5). Routing then uses `{action label, result.clientLinkPath, prior state}`:

| Action | Guidance |
|--------|----------|
| **generate** | "Shared page is live — your client can open it now. Copy the link to send it, or add recipients to email it for you." (Route eye to the link field.) |
| **republish** | "Shared page updated — your client now sees your latest selection, access, and expiry. **Anyone with the existing link keeps working** (the URL didn't change)." *(The fact owners most need confirmed after Update.)* |
| **rotate** ⚠️ | "New link created — **all old client links stopped working**. Copy the new link and re-send it to your recipients; their personal links were revoked." Then navigate to Recipients + surface kept-recipient list with Resend. *(The bar the current one-line toast fails.)* |
| **regenerate** | "Brand-new link created — every previous recipient link and saved bookmark is broken. Copy this link and distribute it fresh." (Harder than rotate — this is the "start over" path.) |
| **revoke** | "Shared link turned off — clients can no longer open this page. Generate a new link any time to share it again." Then render the revoked banner (§3). |
| **reactivate** | "Shared page is live again — same URL and password as before, expiry cleared. Anyone who saved the old link can open it now." *(The safer-path payoff.)* |
| **clear-password** | "Password removed — anyone with the link can now open this shared page without a password." (Access-widening; matches confirm body `:259`. Do NOT show generic "Shared page updated.") |
| recipient-add | Keep server `result.message`; the intro sets the per-recipient-link expectation. On partial failure append "copy their link manually from the failed chip." |

## 6. Resolves
`PROB-07`, `PROB-08` (folded), `PROB-27`, `PROB-30`, `RC-06` — across all five clusters + the lifecycle success guidance the generic server messages currently leave as dead-ends.
