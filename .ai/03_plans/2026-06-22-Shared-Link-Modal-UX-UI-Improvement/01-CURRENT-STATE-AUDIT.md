# 01 — CURRENT-STATE AUDIT · Shared-Link Modal

**Source:** Phase A parallel read-only audit (6 dimensions) + lead first-hand read of `ProjectPublicationHeader.tsx`, `ui/overlays/modal.tsx`, `publication/types.ts`. Every claim is anchored to a real file:line. This doc is *descriptive* (what exists and what's wrong); the prioritized register is `02-PROBLEM-REGISTER.md`.

---

## 1. What the modal is (anatomy)

The "shared-link modal" is the `<Modal>` rendered by **`src/components/workshop/ProjectPublicationHeader.tsx:668`** when its share affordance opens (`open` state, `useState` at `:288`). It is the sender-side control surface for publishing an estimate project as a view-only client page. A second, smaller `<Modal>` (`:1194`) handles destructive-action confirms (rotate / regenerate / revoke / clear-password).

It is built on the **`Modal` primitive** (`src/components/ui/overlays/modal.tsx` → `AppModal`), which itself wraps a Radix-style `Dialog` (`ui/overlays/dialog.tsx`) with Portal, Overlay, focus management, and slot props (`footer`, `location`, `title`, `description`, `tone`, `size`).

The modal's body is a **two-column grid** (`:684`, `260px` sidebar + `1fr` content, `min-h-[600px]`, `max-w-5xl`):
- **Sidebar (`aside` `:686`):** status, selected-estimate count + snapshot version, stale-snapshot warning, opened-count, last-opened-by, published date, expires date.
- **Content (`:735`):** an "overview" header with a 5-column `<dl>` (`:749` — Estimates / Access / Location / Expiry / Latest activity), a **5-tab strip** (`:773`, `WorkshopTreeTabs`: Link / Estimates / Access / Recipients / Activity), a single `role=tabpanel` (`:792`) that conditionally renders one tab body, and a pinned "Link controls" action bar (`:1056`) with the Generate/Update/New-link/Turn-off buttons. An `actionFeedback` strip (`:1173`) is the sole success/error signal.

The **Recipients** tab delegates to a separate 584-line **`RecipientEmailComposer`** (`:1039`); **Activity** delegates to **`SharedLinkActivityFeed`** (`:808`). The other three tabs (Link, Estimates, Access) are **inlined literal JSX** in the parent.

The data contract is **`ProjectPublicationSummary`** (`lib/publication/types.ts:11`): `status` (`unpublished|published|expired|revoked`), `passwordRequired`, `expiresAt`, `locationVisibility` (`exact|locality|hidden`), `selectedEstimateIds`, `snapshotVersion`, `openCount`, `latestActivityAt`, `latestRecipientOpen`, `staleSnapshotWarning`. Server actions live in `lib/publication/actions.ts` (1623 lines): `createProjectPublication`, `republishProjectPublication`, `rotateProjectPublicationLink`, `revokeProjectPublication`, `refreshProjectPublicationSummary`, recipient CRUD (`list/add/resend/remove`), `loadSharedLinkActivity`, `readSharedLinkEmailDeliveryReadiness`.

---

## 2. Structure & component architecture

`ProjectPublicationHeader.tsx` is a **1329-line "god component"** (`:284`–`:1232`, ~948 lines of body) fusing ~7 jobs in one closure: (1) the header share button, (2) optimistic lifecycle reconcile + signature gating (`:294`, `:514`), (3) the 5-tab UI, (4) **four parallel draft state machines** keyed by `summaryKey` — password (`:303`), expiry (`:309`), location-visibility (`:313`), estimate-override (`:338`) — plus an optimistic `localResult` (`:294`), (5) the destructive-confirm Modal (`:1194`), (6) a live-metadata refetch effect (`:462`), and (7) the co-located `SheetPickerList` child (`:1234`). It holds **12 `useState` + 7 other hooks + ~40 `AC-MOD`/`MOD-` comment annotations**.

Each draft machine is hand-reconciled inline: its own `hasXDraft` gate, its own `xDirty` flag, its own reset-on-success inside `runPublicationAction` (`:534`). `managerPendingChangeCount` (`:433`) manually sums four booleans. The tab bodies (`:799`–`:1052`) are stacked `activeTab === "x" && (...)` conditionals inside one tabpanel — only Recipients/Activity are extracted leaves.

Critically, the surface **bypasses the `Modal` primitive's slot API**: it passes only `title`/`description`/`open`/`onOpenChange`/`className`/`bodyClassName` and hardcodes the entire sidebar+overview+tabs+action-bar skeleton as `children`. The primitive's `footer` and `location` slots go unused (the `location` strip renders an empty `min-h-4` spacer, `modal.tsx:144`); the action bar (`:1056`) and feedback (`:1173`) are semantically a footer/status region but live in the body.

**Verdict:** structurally sound data model + well-extracted leaves, but the presentation layer has no extraction boundary. The boundary was drawn at Recipients/Activity and nowhere else.

## 3. UX flows & states

The primary job — **"share this estimate with a client"** — is the *slowest* path. First-publish opens to an **empty read-only link field** on the Link tab (`:845` placeholder "Create a shared link"); the only way forward is the **Generate** button buried in the pinned action bar (`:1109`), which is `disabled` until estimates are selected — but estimate selection is on a *different* tab. So the first-time flow is: open modal → see empty link → fail to find Generate → switch to Estimates → select → switch back → find Generate. Six-plus steps for the headline action. (PROB-01, P0.)

Other flows:
- **Copy/Open link** (`:854`–`:877`): direct, but the link field is read-only and the password-state chip beside it is `text-[8px]` (`:880`) — the access state is nearly invisible at a glance.
- **Generate vs Update vs New link vs Create-new-link-instead vs Reactivate** (`:1088`–`:1168`): five verbs map to `create` / `republish` / `rotate` / `regenerate` / `reactivate`. The primary CTA's **label and behavior silently flip** with state (`hasLiveClientLink ? "Update shared page" : "Generate shared link"`, `:1143`) and is `variant="secondary"` (`:1111`) — it does not read as primary. Worse, pressing it while a password is set but the draft unchecks "require password" **intercepts the click as a different destructive action** (clear-password confirm, `:1118`). (PROB-04, PROB-18.)
- **Update/Generate = a full-snapshot republish** (`:1122`): estimates, password, expiry, and location all bundle through one `republishProjectPublication` that rebuilds the whole snapshot. There is no lightweight settings-save. A draft model (edit → "Unsaved — Update to apply" hint `:893`/`:918` → press Update) spans three tabs. (RC-02.)
- **Rotate / Regenerate / Revoke** all open the second `<Modal>` (`:1194`); on success you get a **one-line neutral toast** and land back on the same tab — for rotate (when all old client links just died) there is no guided "copy the new link / re-send to kept recipients" next step. After revoke the modal shows a misleading live state. (PROB-06, PROB-19.)
- **Status coverage:** `unpublished/published/expired/revoked` are handled, including a calm empty state for "no shareable publication yet" (`:824`) and an expired-link state with Reactivate/Create-new affordances (`:1058`).

## 4. Visual / UI / hierarchy

**Density was chosen over hierarchy.** The type scale is near-flat and tiny: modal title ~11px, section "eyebrows" `text-[9px]`, body/meta `text-[10px]`, status chips `text-[8px]`. Only ~3px separates the most and least important text, so **nothing can dominate** — and the link URL (the reason the modal exists) does not. (RC-04.)

Concrete visual problems:
- **16 hand-typed `text-[9px] font-medium uppercase tracking` "eyebrow" labels** (`:689`, `:702`, `:709`, `:718`, `:723`, `:727`, `:739`, `:751`, `:755`, `:759`, `:763`, `:767`, `:801`, `:890`, `:915`, `:1057` …) — a textbook AI-slop tell that DESIGN.md's impeccable guidance explicitly bans ("tiny uppercase tracked eyebrow above every section"). (PROB-03, PROB-14.)
- **`min-h-[600px]` + `max-w-5xl`** shell forces a large modal even for the sparse empty state (`:824`) — a calm info card floating in a cavern. (PROB-15.)
- **Nested surfaces:** a grey `bg-surfaceMuted` sidebar (`:686`) + white tabpanel + bordered form tiles + side-striped `<dl>` metrics (`border-l border-hairline`, `:750`+) + file-folder tabs — each token-correct individually, collectively a "nested-surface pile." DESIGN.md's contract is one Paper surface, no nested surfaces. (PROB-13, PROB-20.) *This is flagged as an owner design decision per CLAUDE.md (DESIGN.md is alpha, defer to Philip).*
- **Duplicated facts:** status appears in the sidebar (`:690`), the overview header (`:740`), and the link tab; Estimates/Access/Location/Expiry appear in both the sidebar and the overview `<dl>`. (PROB-14.)
- **Tab active affordance is weak** inside the white modal: active tab = `bg-white` (merges with the white tabpanel, signalled only by a 1px hairline lift), inactive tabs echo the sidebar's grey tone. (PROB-28.)
- **8px status pills/chips** (`:880` password chip, `:744` "Pending changes", recipient pills `RecipientEmailComposer.tsx:363`, activity badges) — at/below the legibility floor. (PROB-29.)
- **Expiry is absolute only** (`formatDate` → "Jun 5, 2026, 2:00 PM"), no relative framing, inconsistent with the Teamspace header which uses relative copy. (PROB-30.)

Good: radii are contract-correct (3px/8px/12px, no over-rounding); tone discipline (danger/revoke, warning/dirty+stale, no gradient text or neon); empty/edge states are calm and on-system.

## 5. Accessibility

The `Modal` primitive's focus management is **correct and complete**: initial focus (`dialog.tsx`), Tab focus-trap with wraparound, focus restore to opener, body scroll-lock + `inert` on app shells. The tab strip implements **ARIA tabs correctly** (roving tabindex, arrow/Home/End, `aria-selected`/`aria-controls`/`aria-labelledby`), and the tabpanel is correctly `role=tabpanel aria-labelledby tabIndex=0` (`:792`). Action feedback is announced **twice** — a visible `role=alert`/`role=status` block (`:1177`) **and** a separate `sr-only` live region (`:660`) — robust.

Real a11y failures:
- **WCAG-AA contrast failure (P0):** `ControlField` and `DialogDescription` default label/meta/helper text to `text-tertiary` (`#7F7F7F`, ~4.48:1, below the 4.5:1 AA floor) — this colors field labels, the modal subtitle "View-only project page", helper text, and recipient instructions. The project's own memory already sanctions `#5D5D5D` for load-bearing text. (PROB-02.)
- **Nested-modal focus/stacking (P1):** `AppModal` renders all instances at a fixed `z-[1000]` and applies `inert` only to page shells, **not ancestor modal content**. So the destructive confirm (and recipient remove/resend confirms) inherit the parent's focus trap, the parent's action buttons stay Tab-reachable, and there's one shared scrim. `initialFocus` defaults to "first" → the **X-close** button, not the least-destructive Cancel. (PROB-05, PROB-26.)
- **`ControlField` has no label/aria contract:** label↔input association is by DOM nesting only (`as="label"` wrapping, no `htmlFor`/`id`), combined with per-input `aria-label` overrides producing **duplicate accessible names**; `helperText`/error spans have no `id` and inputs set no `aria-invalid`/`aria-describedby`, so field errors are never surfaced and the association silently breaks if a future refactor passes `as="div"`. (PROB-21.)
- 8px/9px text compounds the contrast issue (legibility floor).

## 6. Data contract & server interaction

The **server contract is strong**: `assertProjectPublicationManager` RBAC on every action (`actions.ts:173`), optimistic-concurrency guards on rotate (`expected_encrypted_token`) and resend, send-before-persist on resend (old link intact on failure), graceful non-fatal email failures (recipient inserted as "pending"), and `locationVisibility` sanitized once (incl. GPS stripping) in `snapshot.ts`. The data contract is fully traced end-to-end (no setting lost or double-applied).

But the **client sync story is brittle for *lifecycle/status* fields** — the modal **does** refetch **activity/metadata** on open + tab-change (`refreshProjectPublicationSummary` at `:458-488`, scoped to `openCount/latestOpenedAt/latestActivityAt/latestRecipientOpen` per the `:295-297` comment), but it does **not** refetch **status / `clientLinkPath` / lifecycle** after an action succeeds (RC-07):
- **No lifecycle/status refetch after action success** → under documented network latency, the modal can show stale `published` status after the link has actually expired, stale recipient delivery status after a rotate, and a stale `snapshotVersion`/stale-warning after republish. The optimistic reconcile (`readPublicationServerSignature`/`shouldUseOptimisticPublicationResult`, `:168`/`:184`) auto-expires on revalidation, but only when revalidation beats the next click. (PROB-09, PROB-11, PROB-23, PROB-24.)
- **No client-side expiry countdown** — `effectiveStatus` reads the static prop, not a live `expiresAt` comparison.
- **In-flight coordination is split across three mechanisms that don't talk** (RC-08): `useTransition(isPending)` for the publication flow, `confirmInFlightRef` for the double-submit guard, and per-component `useState` (`isSending`/`isLoadingList`/`resendingRecipientId`) in `RecipientEmailComposer`/Activity. A recipient-add racing a rotate is **unguarded client-side** → the invited link can be dead-on-arrival (references the old `publicationId`/token) while the chip shows green; the server rotate guard does not cover this path. The shared feedback box can be overwritten by whichever flow finishes last. (PROB-10, PROB-22.)

## 7. Receiver / end-to-end impact (context only)

The modal's settings define the client experience, but the **copy describes the sender's data model, not the receiver's experience** (RC-06):
- **Location visibility** (`:964`) says "Controls how much of the saved project location appears on the shared page" — never names the privacy consequence (hidden = your address is hidden from the client). The receiver side enforces it (`snapshot.ts:103`).
- **Password** ("Password is currently set" / "No password set", `:926`) is sender-internal; the client gate (`ProjectPublicationPasswordGate`, "attempts may be recorded") is never referenced on the sender's control surface.
- **Estimates picker** (`:887`) says only a count + "Unsaved — Update to apply" — nothing states that **unchecked sheets are invisible to the client**. AC-MOD-18 (`:328`) correctly preserves the sender's last curation across revoke/reactivate (good), but the consequence copy is absent day-to-day.
- **Stale snapshot** (`:694`) tells the owner the snapshot is N days behind, but doesn't connect it to "the client is seeing an outdated proposal."
- **Expiry** (§4) is absolute, forcing date arithmetic to know if the client's link is about to die.

The one place consequence copy is excellent is the **destructive confirms** (`readDestructivePublicationActionCopy`): rotation explicitly states it re-publishes published estimates + password but **not** unsaved drafts; regenerate steers toward "Reactivate" as safer; rotate-vs-regenerate is correctly distinguished (rotate keeps recipients+password, regenerate breaks all links). **This is the bar the day-to-day toggles fail to meet.**

---

## 8. What works well (preserve — full list in `02-PROBLEM-REGISTER.md`)

Optimistic signature-gating reconcile (just mis-filed — move to `lib/publication/optimistic.ts`); the RecipientEmailComposer/SharedLinkActivityFeed extraction pattern (replicate for the other tabs); complete Modal focus management + correct ARIA tabs; dual action-feedback live regions; the dirty-draft tracking pattern; precise destructive-confirm copy; the `confirmInFlightRef` double-submit guard; recipient flows respecting data gravity; strong server-side RBAC + guards; a clean, fully-traced data contract; tone + radius discipline; the rotate-vs-regenerate distinction; AC-MOD-18 curation preservation.
