# 07 · Best-Practices Research — Multiplayer Presence & Live Cursors on Supabase

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Cited external research (reference)
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%
**Target stack:** Next.js App Router + `@supabase/supabase-js` 2.106 + Supabase Realtime. Surface: a scrollable estimate sheet/tree.

> Confidence legend: **[High]** official/standard/maintainer-confirmed · **[Med]** reputable practitioner · **[Opinion]** vendor rationale · **[Flag]** uncertain/conflicting — validate before relying. The recommendations here drive `06` (design) and `09` (implementation).

---

## 1. Supabase Realtime mechanics

### 1.1 Presence (roster / who's-here)
- `channel.track(payload)` after `status === 'SUBSCRIBED'`; `channel.untrack()` to stop. Events: **`sync`** (`presenceState()`), **`join`**, **`leave`** — join/leave fire during reconciliation, not only on real movement; don't treat every join as a new human. Key defaults to a UUID; override via `config: { presence: { key: 'userId' } }`. **[High]** ([presence docs](https://supabase.com/docs/guides/realtime/presence))
- Official guidance, quoted: *"For high-frequency or fire-and-forget updates, use Broadcast instead. Presence is best suited for slow-changing state."* Use Presence only for the roster / online-offline / current-page — **never for cursor coordinates.** **[High]**

### 1.2 Broadcast (high-frequency cursor stream)
- Recommended primitive for cursor coordinates (low-latency client→client WS). **Why > presence:** docs steer high-frequency data to broadcast, and Presence has a hard cap of **5 `track()` calls per client per 30s** — using it for cursor motion is rate-limited out of viability. **[High]** ([broadcast docs](https://supabase.com/docs/guides/realtime/broadcast), [limits](https://supabase.com/docs/guides/realtime/limits))
- `broadcast: { self: true }` echoes own messages back (default excludes sender); `broadcast: { ack: true }` resolves `send()` only on server confirm. Send only after `SUBSCRIBED`; listen via `.on('broadcast', { event }, cb)`. Payloads may be binary (`ArrayBuffer`). **[High]**

### 1.3 Realtime Authorization (private channels, RLS, setAuth)
- Private channel = (1) disable "Allow public access" in Realtime settings + (2) `config: { private: true }`. Authorization enforced via **RLS on `realtime.messages`**, evaluated at connect/join with the Auth JWT + topic. Use the `realtime.topic()` helper; split `broadcast`/`presence` via `realtime.messages.extension in (...)`; **SELECT** = read/join, **INSERT** = send/track. Restrict to members by joining your membership table on `auth.uid()` + `realtime.topic()`. **[High]** ([authorization docs](https://supabase.com/docs/guides/realtime/authorization))
- **`supabase.realtime.setAuth()`** must run before subscribing to a private channel. Policies are cached at connect; *"If a new JWT is never received on the Channel, the client will be disconnected when the JWT expires"* — long sessions must refresh the token. Keep RLS simple + index filter columns (complex policies raise join latency). **[High]**

### 1.4 Broadcast-from-Database vs Postgres Changes (for persisted tree edits)
- For the *document state* changing (not cursors), prefer **`realtime.broadcast_changes()`** in a trigger over Postgres Changes. Postgres Changes checks every change against every subscriber's RLS (serial bottleneck) and overloads WAL on high-write tables. **[Med — official direction]** ([broadcast docs](https://supabase.com/docs/guides/realtime/broadcast), [benchmarks](https://supabase.com/docs/guides/realtime/benchmarks))

### 1.5 Limits (fetched verbatim)
| Limit | Free | Pro | Pro (no cap) | Team |
|---|---|---|---|---|
| Concurrent connections | 200 | 500 | 10,000 | 10,000 |
| Messages / second | 100 | 500 | 2,500 | 2,500 |
| Channel joins / second | 100 | 500 | 2,500 | 2,500 |
| Channels per connection | 100 | 100 | 100 | 100 |
| Broadcast payload | 256 KB | 3,000 KB | 3,000 KB | 3,000 KB |
| Presence keys / object | 10 | 10 | 10 | 10 |
| Presence msgs / second | 20 | 50 | 1,000 | 1,000 |
| **Presence `track()` / client / 30s** | **5** | **5** | **5** | **5** |

**[High]** ([limits](https://supabase.com/docs/guides/realtime/limits)). **[Flag]** third-party "256KB everywhere"/"flat 1MB" figures are outdated — this table supersedes. **Sizing:** N movers at R Hz ≈ N×R msg/s of fan-out. **Free (100 msg/s) saturates at ~5 movers @15Hz → Pro (500 msg/s) is the realistic floor.**

## 2. Performance patterns

- **Send rate sweet spot ~50–100ms (10–20/s).** Liveblocks default throttle **100ms**, range **16–1000ms** (16=60fps, 200=5fps). Real services throttle to ~50–80ms. **Never send on raw `pointermove`.** **Decouple a network loop (throttled send) from a render loop (rAF/60fps local interpolation)** — don't conflate 16ms render with the network rate. **[High]** ([Liveblocks client ref](https://liveblocks.io/docs/api-reference/liveblocks-client), [perfect-cursors](https://github.com/steveruizok/perfect-cursors), [nolanlawson](https://nolanlawson.com/2019/08/11/high-performance-input-handling-on-the-web/))
- **Interpolate remote cursors** so throttled gaps don't jump. Ladder: CSS transition (lerp) → spring → spline. `perfect-cursors` (tldraw) animates between received points (~80ms) via spline → one-update delay that reads as real-time. **[High]** ([Liveblocks blog](https://liveblocks.io/blog/how-to-animate-multiplayer-cursors)) **[Flag]** pure 2-point lerp shows corners; "Catmull-Rom" is inference, not cited.
- **rAF batching:** throttle `pointermove` to rAF (last event per frame); cursors don't need `getCoalescedEvents()`. **Update cursor DOM via refs + `style.setProperty()`/`transform`, not React state**, to avoid re-rendering the tree per move. **[High/Med]** ([mskelton](https://mskelton.dev/blog/building-figma-multiplayer-cursors))
- **Coordinate system for a scrollable surface (most relevant):** send **normalized fractions (0..1)**, not pixels, to survive viewport/zoom differences; anchor to **document/page coords (`pageX/Y` + `scrollX/Y`)**, not viewport `clientX/Y`; recompute on `scroll` (scrolling fires no mousemove). PartyKit `cursor-party` implements exactly this (`within: window|document`). **[High]** ([MDN coords](https://developer.mozilla.org/en-US/docs/Web/API/CSSOM_view_API/Coordinate_systems), [cursor-party](https://github.com/partykit/cursor-party)) **[Flag/recommendation]** a global scroll-fraction breaks if content height differs between users (different expanded rows) → **anchor cursors to a logical target (row id / node id + normalized intra-cell offset)** rather than a global fraction. Not a cited pattern — a recommendation.
- **Tab-hidden:** pause sends + suspend reconnect while `document.hidden`; resume + re-`track()` on `visibilitychange` (Phoenix added exactly this to kill the reconnect flash). **Reconnect with exponential backoff + jitter.** **[High/Med]** ([Phoenix PR #6534](https://github.com/phoenixframework/phoenix/pull/6534), [websocket.org](https://websocket.org/guides/reconnection/))

## 3. UX patterns

- **Cursor labels vs identity — a design choice, not a rule.** Liveblocks attaches name/color to the cursor; **Figma uses a bare cursor for position + a top-right avatar row for identity.** For a dense tab/tree UI, the **Figma split (cursor=position, avatar stack=identity)** is the more defensible default. **[High/Opinion]** ([Figma blog](https://www.figma.com/blog/multiplayer-editing-in-figma/), [Liveblocks tutorial](https://liveblocks.io/docs/tutorial/react/getting-started/live-cursors))
- **Color:** modulo over a fixed palette indexed by a **persistent `userId`** (not `connectionId`, which is per-connection — a real correctness gap in many tutorials). **Don't rely on color alone** — pair with name/shape (color-vision deficiency, many-user rooms); use an ~8–10 hue colorblind-safe palette. **[High]** ([arXiv 2009.02587](https://arxiv.org/abs/2009.02587))
- **Idle/leave:** set cursor/presence `null` on pointer-leave + disconnect; render conditionally; dim/remove the avatar on leave. **[Flag]** no source gives a canonical idle fade duration. Combine with a **server-side staleness sweep** — the `leave` event is not fully reliable.
- **Follow mode / spotlight:** click an avatar → viewport mirrors theirs, shown via a border in their color + a label; **must be optional** (Figma found mandatory presenter "felt wrong"). **[High/Opinion]** ([Figma observation mode](https://help.figma.com/hc/en-us/articles/360040322673-Follow-along-with-observation-mode))
- **Avatar stack ("active now"):** first N (e.g. 3) + `+X` overflow; circular, ~4px white borders, ~−8px negative-margin overlap. **[High]** ([Liveblocks avatar-stack blog](https://liveblocks.io/blog/how-to-add-a-live-avatar-stack-to-your-product-with-react-firebase-liveblocks)) **[Flag]** no canonical "active-now ring" style — design decision.
- **Selection indicators** are core context (Figma); keep overlays visually lightweight (thin outline in user color). **[Flag]** no authoritative canvas/tree **typing-indicator** spec — it's a chat convention borrowed in.
- **Latency hiding:** for *edits*, optimistic UI + reconcile; for *cursors*, interpolation + a short CSS transition over a sparse stream (not optimistic state). **[High/Med]**
- **Accessibility of a visual feature:** honor `prefers-reduced-motion` (snap instead of animate); announce join/leave via `aria-live="polite"` + `aria-relevant="additions removals"`; pair color with name/shape. **[Flag — gap]** no authoritative source on a **privacy/opt-out ("incognito presence")** pattern — implement as simply *don't track/broadcast when opted out.* **[High]** ([MDN reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [MDN live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions))

## 4. Architecture (Next.js App Router)
- Realtime is **client-only** — `"use client"` + `@supabase/ssr` browser client. Subscribe in `useEffect`; **cleanup must call `supabase.removeChannel(channel)`** (not just `unsubscribe()`) — leaked channels are the #1 cause of hitting connection limits (`channel()` does not auto-clean). **[High]** ([realtime-js #281](https://github.com/supabase/realtime-js/issues/281), [TooManyChannels](https://supabase.com/docs/guides/troubleshooting/realtime-too-many-channels-error))
- `createBrowserClient` is **already a singleton** — reuse it, don't recreate per render. **[High]** ([creating-a-client](https://supabase.com/docs/guides/auth/server-side/creating-a-client))
- Channel = topic string `prefix:id` (`project:123`). **Prefer one channel per project/entity** (presence + broadcast multiplexed) over many — mind the 100-channels/connection cap. **[Flag]** single-channel multiplexing is well-supported convention but not pinned to one official sentence — test on your Realtime version.
- **React StrictMode** double-fires effects; with Supabase the double can leave the first subscription `CLOSED`. Mitigate with `removeChannel` cleanup + a `useRef` guard + verify `SUBSCRIBED`. **[Med/Flag]** ([realtime-js #169](https://github.com/supabase/realtime-js/issues/169))
- **Token refresh:** an open channel's JWT is **not** auto-updated — register a **top-level** `onAuthStateChange` (root provider, not a route-scoped component) and call `supabase.realtime.setAuth()` on `TOKEN_REFRESHED`/`SIGNED_IN`, or long sessions disconnect at expiry. **[Med/Flag]** ([discussion #37002](https://github.com/orgs/supabase/discussions/37002))

## 5. Pitfalls / war stories
1. **Memory leaks from un-removed channels** → hit the cap → new subscriptions silently fail for everyone. Fix: `removeChannel` on every unmount; track a Set. **[High]**
2. **Flooding / rate-limit exhaustion** (per-`mousemove` send, or `track()` per move): throttle to 10–20/s; cursors on Broadcast, never Presence. **[High]**
3. **Ghost cursors / stale presence on disconnect** (backgrounded tab throttles timers → heartbeat stops → `leave` may not fire): re-`track()` on `visibilitychange`; run a scheduled staleness sweep — don't trust `leave` alone. A documented prod regression (~Mar 2026, supabase-js 2.48–2.98) had presence listeners stop firing; verify your pinned version. **[High/Med]** ([realtime #1807](https://github.com/supabase/realtime/issues/1807))
4. **Coordinate drift** across sizes/scroll/zoom → percentage coords + document-space anchoring (§2). **[Med/High]**
5. **N² fan-out / payload size** → keep payloads tiny (x/y/id only); shard large rooms; keep firehoses off Postgres Changes. **[High]**
6. **StrictMode `CLOSED`** → ref guard + verify `SUBSCRIBED`. **[Med/Flag]**
7. **Authorization gotchas** (forgot `private:true` / public access still on / missing `realtime.messages` RLS / JWT expiry without `setAuth` / over-complex RLS slowing joins). **[High]**

## Recommended approach (Supabase + Next.js estimate sheet)
- **Topology:** one **private** channel per entity (`estimate:{id}` for the sheet, `project:{id}` for the page), `config:{private:true, broadcast:{self:false}, presence:{key:userId}}`, carrying presence + broadcast. RLS on `realtime.messages` joins the members table on `auth.uid()` + `realtime.topic()`. *(Archestimator already does all of this.)*
- **Cursors → Broadcast, never Presence.** Throttle ~60–100ms; send **row/node-anchored normalized coords** (not a global document fraction) for the tree; render via `perfect-cursors` (spline, rAF) through refs/`style`; snap under `prefers-reduced-motion`. *(Archestimator's hook already throttles 80ms + scroll-adjusts; the upgrade is row-anchoring + interpolation + reduced-motion.)*
- **Presence → roster + selection.** `track({userId,name,color,online_at})`; render avatar stack (3 + `+X`) + an `aria-live` join/leave announcer; color = hash(persistent userId) over an 8-hue colorblind-safe palette; selection = thin outline. Keep payloads ≤10 keys.
- **Lifecycle:** singleton client; `useEffect` subscribe with ref guard + `removeChannel`; pause/resume on `visibilitychange`; top-level `onAuthStateChange → setAuth()`; server-side staleness sweep.
- **Capacity:** multi-user cursors need **Pro tier minimum (500 msg/s)**; budget N×R fan-out; throttle harder / shard for crowded sheets.
- **Validate during build:** single-channel multiplexing on the deployed Realtime version; StrictMode `CLOSED` on the pinned supabase-js; the Mar-2026 presence-listener regression vs the pinned version; the privacy/opt-out pattern (uncovered by sources).

## Reference list
Supabase: presence · broadcast · authorization · limits · pricing · concepts · channels · benchmarks · realtime-with-nextjs · creating-a-client · sessions · realtime-setauth · too-many-channels · project-suspended-quotas · silent-disconnections (confirm slug) · blog/broadcast-and-presence-authorization. GitHub: realtime-js#281, #169 · realtime#1807 · discussions#37002. Liveblocks: client ref · animate-multiplayer-cursors · live-cursors tutorial · avatar-stack blog · examples/cursors. Figma: multiplayer-editing · observation-mode. PartyKit: cursor-party. Perf: perfect-cursors · nolanlawson (input-handling, frame-throttling) · Phoenix#6534 · websocket.org/reconnection. Coords/tutorials: mskelton · ctnicholas. Standards/a11y: react.dev/StrictMode · MDN (coordinate-systems, pageX, prefers-reduced-motion, live-regions). Research/UX: arXiv 2009.02587 · MIT multi-user-cursors · rgblind palette · Procore avatar-stack · agilesoftlabs (supabase-realtime-in-production).
