# 06 · Live Presence & Cursors — Product & Technical Design

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Design (product + technical, the net-new/expansion feature)
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%
**Anchor files:** `use-project-presence.ts`, `use-estimate-cursor-broadcast.ts`, `EstimateSheetContent.tsx`, `colors.ts`, `ProjectTeamspaceHeader.tsx`, migration `20260526142913`

> The "see active users and their cursors" feature, designed end-to-end on top of the **existing** realtime stack. Grounded in `07` (research) and `05` (security). This is expand-and-harden — every new piece names the existing piece it extends.

---

## 1. What exists vs what we build

| Capability | Exists today | This plan |
|---|---|---|
| Project online presence (channel `project:{id}`) | ✅ `use-project-presence.ts` — drives a count badge | **Surface as a header face stack + per-person activity** |
| Estimate-sheet live cursors (channel `estimate:{id}`) | ✅ `use-estimate-cursor-broadcast.ts` — throttled, GC'd, color-matched | **Add row/node anchoring + interpolation + reduced-motion + untrusted-identity handling** |
| Project-wide page cursors | ❌ | **New cursor layer on the project surface, reusing the sheet pattern** |
| Selection / "editing here" indicators | ⚠️ payload carries `focusedCell` (passed null) | **Render selection from sheet-channel payload** |
| Follow mode | ❌ | **Optional (decision D-6), behind the cluster** |
| Realtime RLS authorization | ✅ `realtime.messages` policies | Reuse; tighten payload scope (§6) |

**Design law:** reuse `useProjectPresence`, `useEstimateCursorCollaboration`, `getCollaborationColorForUser`, the browser-client + `removeChannel` lifecycle, and the existing channel topics. No new client factory, no new channel scheme.

## 2. Presence model (two channels, two granularities)

- **`project:{id}` (Presence transport)** — coarse roster: `{ userId, online_at }` plus a **least-privilege** activity hint `{ activeSurface: 'overview'|'estimates'|'library'|'settings'|… }` — **never** raw `activeRoute`, `activeEstimateId`, `activeTabId`, or `focusedCell` (see `05 §5` HIGH leak). Drives the header face stack and "active now."
- **`estimate:{id}` (Presence + Broadcast)** — fine-grained, only for members who can access that sheet: presence carries `{ activeTabId, focusedCell }`; broadcast carries cursor coordinates. Drives per-sheet cursors + selection. The sheet channel's RLS already enforces sheet access, so fine-grained telemetry is safe here.

**Why two:** the project channel is visible to all project members (incl. viewers who can't open a restricted sheet); the sheet channel is visible only to sheet members. Granularity follows the channel's authorization boundary.

## 3. The header presence cluster (Track B — felt-impact #1)

Replaces the lone gear (`ProjectTeamspaceHeader.tsx:326–348`).

**Composition** (full visual spec in `08 §2`):
- An **overlapping avatar stack**, right-aligned in the project header: up to **4** faces at `size-6` (24px), `-ml-2` overlap — **wire up the dead `AvatarBubble` `offset`/`zIndex` code** (`:64–65`), don't write new stacking.
- **Ordering:** online-first, then by stable color hash; **self always first** with a subtle "you" marker. Offline collaborators drop to ~40% opacity and the back of the stack (or are hidden — D-2).
- **`+N` overflow chip** as the final slot → opens a **lightweight popover roster** (not the settings modal): each row = face + name + role + activity ("editing Estimate A2" from sheet-channel presence, shown only if the viewer can access that sheet). A small "Manage access" link at the bottom opens the full modal.
- **Each face is a real `<button>`** (focusable), `aria-label="Alex Cruz, editor, active now, editing Estimate A2"`, with a hover/focus tooltip (not the native `title`). An `aria-live="polite"` region with `aria-relevant="additions removals"` announces joins/leaves (one name at a time).
- The settings **gear demotes** to a small "Manage access" affordance appended to the cluster.
- **Metric boundary:** the cluster answers **who is here** at rest. Sheet-level "what" detail is exposed through focus/tooltip/popover unless implementation intentionally adds a visible top-active activity label. Keep `02`/`10` aligned with the actual chosen UI.
- **Focus transition:** overflow chip opens the popover; "Manage access" first closes the popover, then opens the modal, with initial focus on the modal invite field. Closing the modal restores focus to the invoking face/overflow chip, not the page body.

**Color unification (the Figma signature):** the header face, the popover row, and that user's cursor caret in a sheet all use the **same** `getCollaborationColorForUser(userId)` hue. This already holds for avatars↔cursors; extend it to the cluster.

## 4. Project-wide & sheet cursors (Track C)

### 4.1 Reuse the proven sheet layer
`EstimateSheetCursorLayer` (`EstimateSheetContent.tsx:603–656`, mounted `:1947`) is the reference implementation: captures `pointermove` on `[data-estimate-pointer-surface]`, scroll-adjusts coords, resolves `rowId`/`columnId`, renders `RemoteEstimateCursorsOverlay` (`z-30`, `pointer-events-none`) with `translate3d`. Keep the mount point and coordinate root.

### 4.2 Three upgrades to the cursor layer
1. **Row/node anchoring (correctness).** Today coords are pixel offsets within the scroll surface. Per `07 §2`, a pixel/global-fraction model drifts when users have different rows expanded or different viewport sizes. **Send `{ rowId, columnId, fracX, fracY }`** (fraction *within the resolved cell/row), denormalize against the receiver's matching `[data-estimate-row-id]`/`[data-estimate-cell-index]` element. Fall back to scroll-adjusted absolute coords when no row resolves (e.g., header/gutter). The DOM already emits these data attributes (`row-table.tsx:252–342`).
2. **Interpolation (smoothness).** Remote cursors currently jump on each 80ms broadcast. Add **`perfect-cursors`-style spline interpolation** driven by rAF, updating the marker via `style.transform` (refs, not React state). Under `prefers-reduced-motion: reduce`, **snap** (no transition) — `globals.css` already respects reduced-motion.
3. **Untrusted identity (security, from `05`).** On receive, **ignore `payload.displayName`**; look the cursor's `userId` up in the server-trusted member roster (from the collaboration summary) for the label + color; **drop cursors whose `userId` isn't an authorized member**; escape any rendered text. (See `05 §5` HIGH.)

### 4.3 Project-surface cursors (new, capacity-gated)
For the project overview first (D-5 default), add a sibling `ProjectCursorLayer` that mirrors `EstimateSheetCursorLayer` but broadcasts on `project:{id}` with **page-relative document coordinates** (`pageX/Y`, recomputed on scroll — `07 §2.4`) and sender-bound identity handling. **Gate behind the capacity decision (D-1)** — broad page cursors multiply fan-out. Lists or touch-specific cursor behavior need a later owner call.

### 4.4 Selection / "editing here"
Render a thin outline (user color) on the cell/row in `focusedCell` from **sheet-channel** presence — lightweight, never on the project channel. This makes "Alex is editing B3" visible without a cursor in view.

Because the cursor overlay is intentionally visual and `aria-hidden`, each outlined cell/row also needs a non-visual equivalent: either `aria-describedby` on the row/cell pointing to hidden text ("Alex is editing this row") or a scoped polite live region that announces focused-row changes without spamming.

### 4.5 Follow mode (D-6, optional)
Click a popover-roster face → "Follow": scroll the follower's viewport to the followed user's `focusedCell`/cursor, show a border in their color + "Following Alex — Stop." **Must be optional and exitable** (`07 §3.4`). Defer to a fast-follow phase unless prioritized.

If D-6 is later enabled, these rules are required before implementation:
- `Escape`, the "Stop" control, route changes, target leave, permission loss, or a missing target row/cell all terminate follow mode and restore normal scrolling.
- Following does **not** steal keyboard focus from the current editor/control; it scrolls the viewport only. The followed row/cell may receive a visual highlight, not DOM focus.
- Auto-scroll repeats only while the user has explicitly opted into following; any manual scroll pauses following until the user resumes.
- Under `prefers-reduced-motion`, use immediate scroll/positioning and no smooth-follow animation.
- If the target moves into a restricted estimate the follower cannot access, show "Alex is active" only; never reveal the restricted sheet/cell.

## 5. Lifecycle & correctness (from `07 §4–5`)
- **Singleton browser client**; subscribe in `useEffect` with a **`useRef` guard** (StrictMode double-subscribe) + **`removeChannel` cleanup**; verify `SUBSCRIBED` (re-subscribe on `CLOSED`). *(The estimate hook already does removeChannel; add the ref guard + CLOSED handling.)*
- **Visibility:** pause sends + suspend reconnect while `document.hidden`; on `visibilitychange` re-`track()` with a fresh `online_at`. *(Relevant to the known "workshop suspends when tab hidden" memory.)*
- **Token refresh:** a **top-level** `onAuthStateChange` listener (root provider) calls `supabase.realtime.setAuth()` on `TOKEN_REFRESHED`/`SIGNED_IN` so long sessions don't disconnect at JWT expiry. **Second-pass repo search found no `setAuth`/`onAuthStateChange` wiring in `src/`; treat T0.4 as a real implementation item, not a quick confirmation.**
- **Failure visibility:** expose lightweight status/telemetry for `CHANNEL_ERROR`, `CLOSED`, auth-refresh failure, and server rate-limit throttling. A silent dropped channel is a failed Teamspace experience even if the modal still renders.
- **Staleness sweep:** keep the 5s client GC; don't trust `leave` alone (backgrounded tabs). The server-trusted roster already bounds who can appear.
- **Throttle:** keep 80ms/6px for sheet cursors; for project page cursors start at ~100ms (more potential movers). Network loop (throttled send) decoupled from render loop (rAF interpolation).

## 6. Security requirements folded in (from `05`)
1. Project-presence payload → `online|idle|activeSurface` only; **no raw `activeRoute`, `activeEstimateId`, `activeTabId`, or `focusedCell`** on the project channel. *(Fixes the HIGH leak.)*
2. **All payload identity untrusted on receive** — require a sender-bound signed envelope before accepting cursor/presence-detail identity; then use the roster as display source of truth and sanitize/escape any fallback text. A valid roster row alone is not enough, because member B could otherwise claim member A. *(Fixes the HIGH spoof/XSS.)*
3. Enable Supabase **server-side realtime rate limit**; keep client throttle. *(MED.)*
4. Confirm `avatarUrl` is not a signed/token-bearing URL before broadcasting it. *(LOW.)*
5. Viewer-cursor decision (D-4): today viewers are present but can't broadcast cursors (send needs editor). If we want viewer cursors, relax the broadcast send policy — **only after** #2 lands.

## 7. Capacity (from `07 §1.5`)
- N movers × R Hz ≈ fan-out msg/s. **Free (100/s) saturates ~5 movers @15Hz; Pro (500/s) is the floor.** Confirm the project tier (D-1) before enabling project-wide page cursors. Add `log`-level visibility / a kill-switch flag for cursor broadcast so it can be disabled without a deploy if the tier is exceeded.

## 8. Risks
| Risk | Mitigation |
|------|-----------|
| Realtime cost / tier saturation | capacity gate (D-1); per-surface enable flag; harder throttle for page cursors |
| Coordinate drift across users | row/node anchoring (§4.2) instead of global fractions |
| Ghost cursors on disconnect | client GC + visibility re-track + server-trusted roster bound |
| StrictMode / token-expiry disconnects | ref guard + `SUBSCRIBED` re-subscribe + top-level `setAuth` |
| Surfacing presence amplifies security gaps | Track A (security) sequenced before Track B/C in `09` |
| Hard to unit-test realtime | thin transport seam + manual/adversarial scenarios (`10`) |

→ Pixel/motion/token spec in `08`. Build sequence in `09`. Acceptance + how to test realtime in `10`. Open calls (tier, follow mode, viewer cursors, offline-avatar treatment) in `11`.
