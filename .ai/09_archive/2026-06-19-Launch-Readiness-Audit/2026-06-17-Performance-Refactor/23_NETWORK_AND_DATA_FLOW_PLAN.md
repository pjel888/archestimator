# 23 — Network & Data-Flow Plan

> **Status:** Plan (round-2, Writer W-NET). **PLANNING ONLY** — no `src/**`,
> `tests/**`, `scripts/**`, `supabase/**`, or config changes; all new
> gates/scripts/ceilings below are **proposals** marked "(new, Phase N)".
>
> **Why this doc exists:** the round-1 pack scored **78/100 on DB/network**. The
> DB half (`14_PHASE_8_SUPABASE_DB_PLAN.md`) is strong; the **NETWORK** dimension
> was scattered and deferred ("all budgets → Phase 9, to be added").
> This document owns the network plan: it (a) inventories and budgets realtime
> channels/subscriptions (**RISK-17**), (b) **commits provisional per-route
> round-trip ceilings now** (ratified in Phase 0, not deferred), (c) defines
> payload-size budgets, (d) lays out the request-waterfall + prefetch/hydration
> strategy, and (e) extends the `.select`-trimming consumer audit beyond the
> renderer.
>
> **Authoritative inputs:** `_research/_SYNTHESIS.md` (V2 IMPROVEMENT CONTRACT —
> esp. RISK-17/18, the pinned new gate names `perf:realtime-cost` /
> `perf:query-count`, and §V2-FACTS); `10_PHASE_4_DATA_AND_CACHE_PLAN.md`;
> `14_PHASE_8_SUPABASE_DB_PLAN.md`; `03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md`
> (§4.5 query-count, §5 BENCHMARK MATRIX); `_research/R5-data-supabase.md` (primary).
>
> **Conventions (contract §4):** Priority `P0–P3`, Risk `Low/Medium/High/Critical`,
> evidence `path:line — observation`. Decision IDs `D-NN`, Risk IDs `RISK-NN`,
> Open-question IDs `Q-NN`. Validation vocabulary uses only existing scripts; new
> scripts are flagged "(new, Phase N)".
>
> **Handoff to FIX-9 (`15_VALIDATION_MATRIX.md`):** this doc proposes three new
> gates — **`perf:realtime-cost`**, **`perf:query-count`**, **payload-size budget**
> (`perf:payload-size`). FIX-9 must wire them into the matrix with the phase
> mapping in §7. Open questions land in `19` as **Q-28…Q-31** per the contract.

---

## 0. Scope, position, and the network-vs-DB seam

Phase 8 (`14_…`) owns the **DB engine** (indexes, RPCs, RLS). Phase 4 (`10_…`)
owns the **application read shape** (DTOs, `.select` discipline, `cache()`). This
doc owns the **wire**: how many round-trips cross the boundary, how big each
payload is, how many realtime frames cost a render, and how we prefetch/hydrate
to remove redundant trips. The three planes are co-designed:

- A DB push-down (`get_project_chart_buckets`, `14` §3) only helps the network if
  the **payload** also shrinks — §3 budgets that.
- A homebase RPC (`14` §4) only helps if the **round-trip count** drops — §2/§4
  budgets and counts that.
- A trimmed `.select` (`10` §3) only helps if the consumer audit (§6) proves the
  trimmed column was not load-bearing for reconcile/export, not just the renderer.

**Round-1 gap this closes (honesty note):** `10` §3.5, §7.4, §4.4 and `03` §4.5
all read "query-payload-size budget (Phase 9, to be added)" / "query-count budget
(Phase 9, to be added)". This document **defines those metrics and commits
provisional ceilings now** so Phase 0 ratifies real numbers rather than inventing
the metric late.

---

## 1. Realtime channel / subscription budget — **RISK-17** — **P1**

**Resolves:** RISK-17 (inbound realtime render/subscription cost — *unbudgeted* in
round 1), ties **RISK-18** (subscription leak / teardown). The **outbound** cursor
path is already throttled; the **inbound** path (receiving frames, presence
heartbeat, `postgres_changes`) has **no budget at all** today.

### 1.1 Realtime consumer inventory (every `.channel()` / `.subscribe()`)

`rg "\.channel\(|\.subscribe\("` over `src` returns exactly three realtime
websocket consumers, plus one auth bridge and one in-module (non-websocket) bus:

| # | Consumer | `path:line` | Channel / topic | Inbound mechanism | Lifecycle / teardown |
|---|---|---|---|---|---|
| 1 | **Estimate/project cursor broadcast** | `src/hooks/use-estimate-cursor-broadcast.ts:152` (`client.channel(topic,…)`), subscribe `:229`, teardown `:258` (`removeChannel`) | `estimate:{id}` (default) or `project:{id}` (override `channelTopic`, ProjectCursorLayer) | `broadcast` event `cursor` (`:226`) → `acceptCursor` → `setRemoteCursorMap` (`:204`) | Effect cleanup at `:245-259` clears throttle timer, nulls refs, **`removeChannel`** `:258`. Deps `[channelTopic, enabled, estimateId, userId]` `:260` |
| 1b | **GC interval for stale remote cursors** | `use-estimate-cursor-broadcast.ts:264` (`setInterval` 1000ms) | (same channel) | Prunes cursors older than 5s; `setState` only when size changes (`:266-269`) | `clearInterval` `:272`; deps `[enabled, remoteCursorMap.size]` `:273` — re-arms on size change |
| 2 | **Project presence** | `src/hooks/use-project-presence.ts:156` (`client.channel`), subscribe `:161`, teardown `:215-218` | `project:{projectId}` (private) | `presence` `sync` event (`:160`) → `syncPresence` → `setEntries` (`:145`); **heartbeat via `channel.track()`** on subscribe `:168` + visibility `:205` + surface change `:229` | Cleanup `:210-220`: removes `visibilitychange` listener, clears retry timer, **`removeChannel`** `:217`. Deps `[currentUserId, enabled, projectId]` `:221`. Re-subscribe retry capped at 3 (`MAX_PRESENCE_RESUBSCRIBE_RETRIES:81`) |
| 3 | **Realtime auth bridge** | `src/components/realtime-auth-bridge.tsx:50` (`onAuthStateChange`) | n/a (no channel) — calls `realtime.setAuth()` | `onAuthStateChange` callback → `setAuth` + `removeQueries` on SIGNED_OUT (`:57`) | `data.subscription.unsubscribe()` `:64`. **Mounted app-wide via `providers.tsx` → RISK-19 / R1: move to workshop layout** (see `13`/`22`) |
| 4 | **Sidebar favorites announcer** | `src/hooks/use-sidebar-favorites-announcer.ts:47` (`subscribe`) | **in-module Set bus, NOT a websocket** | `emit()` (`:31`) → listener `setState` | `unsubscribe` deletes from Set `:49-51`; auto-clear timer `:75`. **No realtime cost — included only to disambiguate the contract's "announcer" reference: it is NOT a Supabase channel.** |
| 5 | **Performance monitor** | `src/components/performance-monitor.tsx` | n/a (no `.channel`) — perf API only | — | (no realtime subscription) |

**Findings.**
- **Channel topology is shared by design.** Cursor (`#1`) and presence (`#2`)
  both key on the *same* `project:{id}` topic when the cursor layer is in project
  mode (`ProjectCursorLayer.tsx:53` passes `channelTopic: project:{projectId}`;
  presence uses `PROJECT_COLLABORATION_CHANNEL_PREFIX project:` at
  `use-project-presence.ts:121`). They are **separate `client.channel()` calls**,
  so two channels to the same topic can coexist per project surface.
- **Outbound is already throttled (good):** 80ms time-throttle (`throttleMs=80`
  default, `:107`) + 6px / target-change distance gate
  (`shouldQueueCursorBroadcast`, `:88-99`, `CURSOR_BROADCAST_MIN_DISTANCE_PX=6`
  `:17`). `benchmark-estimate-cursor-broadcast.ts` already measures the queue
  reduction — but it is an **orphan with no threshold** (`03` §1.4).
- **Inbound is unbudgeted (the gap):** every accepted remote cursor frame calls
  `setRemoteCursorMap` (`:204`), every presence `sync` calls `setEntries`
  (`:145`), and the 1s GC interval (`:264`) can call `setRemoteCursorMap`. None of
  these has an asserted **render-cost ceiling** beyond the existing
  cursor-isolation gate (which already proves the *sheet* is shielded — see 1.3).

### 1.2 The budget (proposed ceilings — ratify in Phase 0)

| Budget | Provisional ceiling | Rationale / source |
|---|---|---|
| **Per-route channel count** | **≤ 2 websocket channels** open on the estimate-sheet route; **≤ 2** on a project surface (1 cursor + 1 presence). Hard upper bound **≤ 3** before the build fails. **This ceiling is a LEAK TRIPWIRE pinned to today's topology — it has zero headroom by design** (cursor + presence = exactly 2). It is **not** a forward budget. A deliberately-added channel (e.g. a new realtime feature) **raises the ceiling via a recorded decision (`D-NN`)** that re-pins the tripwire to the new topology — **never a silent bump**, and **never a false stop-the-line** that blocks an intentional channel. The build only fails when the open-channel count exceeds the *currently-recorded* ceiling without a `D-NN`. | Today: cursor + presence = 2 same-topic channels per project surface, with no slack. Any count above the recorded ceiling that lacks a `D-NN` is a leak or an accidental double-mount (RISK-18). Cross-ref **Q-29** (inbound presence-render ceiling) for the companion realtime open question. |
| **Inbound render cost — remote cursor** | **0 sheet renders / 0 row-table renders** on a remote cursor move while typing | Already proven by `estimate-sheet-cursor-isolation.test.tsx:186-189,230-232` (`contentRenders()===0`, `totalTableRenders===0`). Promote to a **named gate**, not just a passing test. |
| **Inbound render cost — presence change** | **≤ 1 render** of the presence-consuming surface (avatar stack / teamspace header) per `presence sync`; **0** sheet/row renders | `useProjectPresence` returns memoized `{onlineUserIds, entries, status}` (`:239-242`); a presence change must not fan out into the sheet. New assertion. |
| **Teardown / leak (ties RISK-18)** | **`removeChannel` called exactly once on unmount; 0 leaked subscriptions/timers** | Cursor teardown `:258`, presence teardown `:217`, GC `clearInterval` `:272`, presence retry-timer clear `:214`, visibility listener removal `:213`. Assert via mount→unmount listener/timer/subscription baseline (shared with `perf:memory-leak`, `25`). |

### 1.3 Gate: `perf:realtime-cost` (new, Phase 9 — measured from Phase 0)

**Definition (concrete now, per contract):** wire the orphan
`scripts/benchmark-estimate-cursor-broadcast.ts` into `package.json` with a
**threshold** (outbound queue-reduction floor: ≥ the baseline reduction the
benchmark already reports — tiny-same-cell suppression ~> 95%, row-change ~100%
queued), AND add an **inbound render-count** assertion layer that:
1. asserts **0** sheet/row renders on a remote cursor frame (lift the existing
   `estimate-sheet-cursor-isolation` assertions into the named gate), and
2. asserts **≤ 1** presence-surface render per presence `sync` and **0** sheet
   renders, and
3. asserts the **channel-count ceiling** (§1.2) and **teardown** (one
   `removeChannel` per channel, 0 residual timers/listeners) at unmount.

Method: jsdom render-isolation harness (the `tests/vitest/perf/*` template,
`03` §1.3) + the wired broadcast benchmark for the outbound number. **jsdom
asserts COUNTS only — no TIME budget derived here** (contract `25` rule).

> **Validation:** `bun run perf:realtime-cost` (new, Phase 9); existing
> `estimate-sheet-cursor-isolation.test.tsx` is the oracle for the 0-render claim.
> **Risk:** Low (additive measurement). **Cross-ref:** RISK-17, RISK-18, `25`
> (`perf:memory-leak` shares the teardown baseline), `13`/`22` (RISK-19 provider
> move removes the auth-bridge from non-workshop routes).

---

## 2. Committed query-count / round-trip budgets — **P1**

**Resolves:** the round-1 deferral ("Phase 9, to be added", `10` §3.5/§7.4,
`14` §4, `03` §4.5). Per the contract, `perf:query-count` is **defined
concretely now**, not deferred, and **provisional per-hot-route ceilings are
committed here** for Phase 0 ratification.

### 2.1 Provisional per-route round-trip ceilings (ratify in Phase 0 → `Q-31`)

"Round-trip" = one Supabase request to the wire (`.from().select()`, `.rpc()`,
each `await` that hits the network). Parallel requests in one `Promise.all` count
individually but incur **one wave** of latency; the ceiling counts *requests*, the
waterfall view (§4) counts *waves*.

| Hot route / flow | Today (measured-from-code) | Provisional ceiling **M / N** | Target after Phase 4/8 |
|---|---|---|---|
| **Workshop homebase** (`getWorkshopHomebaseData`, `workspace-repository.ts:1050-1261`) | 6-way `Promise.all` (`:1061`) **+ 5–7 serial awaits** (`:1128,1155,1167,1184,1194,1204,1214`) = **~11–13 requests across ~6–8 latency waves** | **M = ≤ 12 requests / ≤ 3 latency waves** (provisional) | After `14` §4 collapse: ≤ 12 requests / **≤ 2 waves**; or 1 `workspace_homebase_summary` RPC + identity = **≤ 3 requests** |
| **Estimate sheet initial load** (tree loaders `workspace-repository.ts:1993-2466`, nodes+rows `Promise.all` `:1996/2421/2464`) | nodes + rows per tab/area = **~2 requests / 1 wave** beyond the RSC bootstrap; plus tab list | **N = ≤ 4 requests / ≤ 2 waves** (provisional) | unchanged shape; budget guards against regression (no new N+1 from decomposition) |
| **Project charts** (`src/lib/repositories/project-charts-repository.ts:38-150`) | 4-way `Promise.all` (`src/lib/repositories/project-charts-repository.ts:88`) + JS aggregation (`reduce` at `:106`) | **= 1 RPC** after `get_project_chart_buckets` ships (`14` §3) | **1 request** (the push-down) |
| **Project list / sidebar** (`listCurrentWorkspaceProjects:821-914`) | 8-way `Promise.all` (`:834`) + 1 shared-projects follow-up (`:905-913`) | **≤ 9 requests / ≤ 2 waves** (the follow-up is a genuine dependency — §4) | unchanged; guard regression |
| **Component library load** (`component-library-repository.ts:530-746`) | 8-table `Promise.all` waves (`:546/602/630`) — bounded count, **unbounded volume** (§3) | **≤ 8 requests / ≤ 3 waves**; volume gated by §3 `.limit()` | unchanged count; payload trimmed by `10` §4 |

> **Note on `get_project_chart_buckets` (already exists):** this RPC is **not a
> fresh build** — it already exists as a **deferred (unapplied) migration**, so the
> "charts = 1 RPC" payload win is a **hardening, not a greenfield ship**. Phase 8
> **reviews-and-hardens** the existing RPC before cutover (see doc `22`/`24`).
>
> **Note on counts vs targets:** the homebase ceiling is set at *today's request
> count* deliberately — the win is **fewer waves** (latency), not necessarily
> fewer requests. The query-count gate enforces **0 new N+1 and 0 new unbounded
> `.select("*")`**; the waterfall view (§4) enforces the wave collapse.

### 2.2 Gate: `perf:query-count` (new — define now, Phase 0 measure → Phase 8/9 gate)

**Definition (concrete, per contract):** two layers, both building on the existing
orphan `scripts/build-performance-query-inventory.ts` (`03` §1.4):

1. **Static layer (extend the existing inventory):** the script already classifies
   select/insert/update/upsert/delete/rpc and counts explicit-columns vs wildcard
   per call-site (`build-performance-query-inventory.ts:6-46`). Add a **per-hot-path
   assertion**: 0 `.select("*")` on the hot-path allowlist (component library,
   `projects` sidebar/list — `workspace-repository.ts:837/908`), and the count of
   network call-sites per repository function ≤ the §2.1 ceiling.
2. **Runtime layer (new counter):** a thin Supabase-client wrapper / spy in a test
   harness that counts actual round-trips issued by a flow (homebase load, sheet
   load, charts load) and asserts `≤ M/N` and **0 N+1** (no request issued inside a
   `.map`/loop over a prior result's rows). This is the layer that proves the `14`
   §4 homebase collapse and the chart RPC cutover actually reduced trips.

> **Validation:** `bun run perf:query-count` (new). Phase 8 `done-when` already
> says "query-count budget shows fewer round-trips" (`14` §4, §8) — this gate is
> what that sentence refers to. **Risk:** Low. **Cross-ref:** `03` §4.5, `10`
> §7.4/§8, `14` §4/§8, `Q-31`.

---

## 3. Payload-size budgets — **P1**

**Resolves:** `10` §3.5 ("Query-payload-size budget (Phase 9, to be added)"),
`14` §1 (volume-unbounded reads). Round 1 named the *risk* but never defined the
*metric*.

### 3.1 Metric + method

- **Metric:** per hot-path response, **(a) max rows returned** and **(b)
  serialized JSON bytes** crossing the server→client boundary.
- **Method:** the static inventory's max-columns/wildcard data (§2.2 layer 1) for
  *width*, plus a **runtime probe** (new) that serializes the actual response in
  the query-count harness and records byte size + row count. Same harness as
  `perf:query-count` — one wrapper, two metrics.
- **Gate name:** **`perf:payload-size`** (new, Phase 9; measured from Phase 0).

### 3.2 Provisional payload ceilings (ratify Phase 0 → `Q-30`)

> **Q-30 = payload-size (owner-canonical).** Per owner ruling, **Q-30 refers to
> the server→client payload-size ceilings defined in this section** (max rows /
> serialized JSON bytes per hot-path response). It is **not** the client-side
> memory/leak question — that is the separate **Q-34** (client memory growth /
> subscription-leak budget), tracked in **doc 25** (`perf:memory-leak`). Keep the
> two IDs distinct to avoid drift: Q-30 = wire payload (this doc), Q-34 = client
> memory (doc 25).

| Hot path | `path:line` | Today | Provisional ceiling |
|---|---|---|---|
| **Component library load** | `component-library-repository.ts:530-746` | **unbounded** — no `.limit()` on `cost_library_items` (`:562-566`) or per-item history (`:630-656`); `.select("*")` ×8 | After `10` §4: `cost_library_items` ≤ `COMPONENT_LIBRARY_ITEM_LIMIT` (+1 overflow flag); per-item history bounded; **explicit columns only**. Byte ceiling = baseline-at-limit × 1.0 |
| **Project charts** | `src/lib/repositories/project-charts-repository.ts:38-150` | ships **≤ 5000 rows / ≤ 1500 nodes** (`ESTIMATE_ROW_LIMIT=5000`, `ESTIMATE_NODE_LIMIT=1500`, `src/lib/repositories/project-charts-repository.ts:17-18`) reduced in JS (`reduce` at `src/lib/repositories/project-charts-repository.ts:106`) | After `get_project_chart_buckets` (`14` §3): **buckets-only payload** — rows shipped → ~0; only aggregated buckets cross the wire. Ceiling = bucket count, **not** raw rows |
| **`projects` sidebar/list** | `workspace-repository.ts:837, 908` | `.select("*")` — every column incl. unused metadata | After `10` §3: `PROJECT_LIST_COLUMNS` only; byte ceiling = trimmed-set × 1.0 |
| **Estimate-tree row items** | `ESTIMATE_TREE_ROW_ITEM_COLUMNS workspace-repository.ts:1734` | carries `source_snapshot` + `metadata` JSON **per row** every tree load | **Gated on `Q-G`** (§6 / `10` §3.4): split heavy blobs into a detail-only set **only if** the audit proves they are not consumed per-row by render/reconcile/export. Until then, **no trim** |

### 3.3 The hard rule

**0 new unbounded reads on a hot path; 0 new `.select("*")` on the allowlist.**
The component-library `.limit()` (`10` §4.3) must ship with **overflow detection**
(the `src/lib/repositories/project-charts-repository.ts:17-18` `.limit(N+1)` pattern) so truncation is
**visible**, not silent — a silently truncated payload that passes the size budget
is a correctness regression, not a win.

> **Validation:** `bun run perf:payload-size` (new); library/charts/sidebar DOM
> tests render with the trimmed/limited sets. **Risk:** Medium (truncation is a
> behavior change — `10` §4.4). **Cross-ref:** `10` §3/§4, `14` §1/§3, `Q-E`
> (Lite-vs-full decides library severity), `Q-G`, `Q-30`.

---

## 4. Request-waterfall plan — **P1**

**Resolves:** the network view of the homebase serial-tail collapse (`14` §4) —
which trips can parallelize vs which have a **genuine data dependency**.

### 4.1 Homebase (`getWorkshopHomebaseData:1050-1261`)

Current shape: a 6-way `Promise.all` (`:1061`) followed by a **serial await
chain** of 5–7 trips. The network goal is to flatten the chain into **waves**,
each wave being one round-trip-latency unit.

| Trip | `path:line` | Depends on | Parallelizable? |
|---|---|---|---|
| favoriteProjects | `:1128` | favorites IDs from wave 1 | **Yes** — with favoriteEstimates + recentEstimates |
| favoriteEstimates | `:1167` | favorite estimate IDs from wave 1 | **Yes** — same wave |
| recentEstimates | `:1155` | (independent) | **Yes** — same wave |
| missingProjects | `:1184` | which projects already fetched | Mostly — fold into the wave where its input is known |
| `readOptionalProjectPublications` | `:1194` | project IDs | Yes — once project IDs resolved |
| pending-collab summary | `:1204` | (independent) | Yes |
| firstNodes | `:1214` | estimate IDs from recent/favorite estimates | **Partial** — needs the estimate-id wave first |

**Plan (mirrors `14` §4, ordered by safety):**
1. **Wave A (safe first move):** parallelize the provably-independent trio —
   favoriteProjects / favoriteEstimates / recentEstimates — into one
   `Promise.all`. Pure app change, no SQL.
2. **Wave B:** fold missingProjects + publications + pending-collab into the next
   wave once their inputs (project/estimate IDs) are known.
3. **firstNodes** stays after the estimate-id wave (genuine dependency).
4. **Only if A+B insufficient:** the `workspace_homebase_summary` RPC (`14` §3/§4)
   collapses the server-side trips into one.

### 4.2 Genuine data dependencies — **DO NOT parallelize**

- **`sharedProjects` follow-up** (`listCurrentWorkspaceProjects:905-913`) — legitimately
  depends on `sharedProjectIds` derived from the members batch. The `14` §4
  "unsafe move to avoid" applies equally to the network plan: this stays
  sequential. (R5 confirms: "acceptable dependency", `R5 :17`.)
- **firstNodes** (`:1214`) — needs estimate IDs from the estimate wave.

> **Validation:** `perf:query-count` (§2) proves wave-count dropped; homebase
> DOM/e2e renders identically (`14` §4). **Cross-ref:** `14` §4, `Q-31`.

---

## 5. Prefetch & hydration strategy — **P2**

**Resolves:** the prefetch/hydration leg of the V2 contract; the
`cache()`↔TanStack hydrate seam (`10` §8) reframed as a **prefetch CARRIER**, not
merely a double-fetch dedup.

### 5.1 Per-hot-route decision

| Route / target | Prefetch mechanism | Hydration carrier |
|---|---|---|
| **Project / estimate links** (sidebar, list cards) | `<Link prefetch>` (Next default for static-ish segments) + RSC hover-prefetch (already evidenced in `route-transition-performance.spec.ts`) | RSC payload |
| **Estimate sheet** | TanStack `prefetchQuery` on **hover/intent** over an estimate card/tab, keyed by the unified `queryKeys.estimate.tree(id, tabId)` (`10` §1.2) | **Hydrate-from-props** seam: server projects the tree DTO, the island seeds the cache via `setQueryData` (`EstimateWorkspaceClient.tsx:124-129`) — **no client refetch on first paint** |
| **Charts** | TanStack `prefetchQuery` on intent (tab hover) once `get_project_chart_buckets` ships (1 RPC, §2/§3) | hydrate-from-props with the buckets-only DTO |
| **Workshop homebase** | **Warm the summary before navigation** — prefetch the homebase summary (post-§4 collapse / RPC) on intent so the shell paints warm | hydrate-from-props |

### 5.1a Bible §11.3 prefetch law (governing rule for §5.1)

The per-route decisions in §5.1 are bound by **Bible §11.3**, transcribed here in
full so this doc is self-contained:

> **Bible §11.3 — prefetch law.** Next auto-prefetches production links, but in a
> dense workspace resource use matters, so use INTENT-aware prefetch for heavy
> routes and hover/focus prefetch for likely next actions. Good targets: project
> estimate-list rows → prefetch estimate route on hover/focus; component-library
> panel → prefetch after panel open or hover tab; charts route → prefetch on
> chart-nav hover.

**CRITICAL prohibition (Bible §11.3, load-bearing):** **do NOT prefetch every row
in a 500-row list** — bound prefetch to **viewport-visible / hovered rows only**.
A list that fires a `prefetchQuery` per row on mount turns one navigation into
hundreds of round-trips, defeating §2's query-count budget and §3's payload
budget in a single burst.

This prohibition is tied to the existing budgets in this doc:

- **Share 500-row cap (D-019):** the estimate-list / share surfaces are already
  capped at 500 rows; an unbounded per-row prefetch over that cap is exactly the
  burst §11.3 forbids. Prefetch must key off intent (hover/focus) **or** an
  IntersectionObserver bounded to viewport-visible rows — **never** the full
  capped set.
- **Realtime budget (§1):** per-row prefetch must not open new channels or
  inflate the per-route channel ceiling (§1.2).
- **Payload budget (§3):** each intent-triggered prefetch is still one hot-path
  read and counts against §3's per-response row/byte ceilings; bounding to
  visible/hovered rows keeps the in-flight payload within budget.

> **Validation:** `perf:query-count` runtime counter (§2) asserts a list render
> issues **0** prefetch round-trips on mount and **≤ 1 per hovered/visible row** —
> the same counter that proves "0 client refetch on first paint" below.
> **Cross-ref:** D-019 (share 500-row cap), §1 (realtime), §2 (query-count), §3
> (payload-size).

### 5.2 The `cache()`↔TanStack seam as prefetch carrier (not just dedup)

`10` §7.4/§8 frames the seam defensively (avoid a server-render + client-refetch
double fetch). **This doc reframes it offensively:** the same
`setQueryData`-from-props seed is the **carrier** that lets a prefetched/warm
server read populate the client cache so the first interaction is instant. The
decision rule:

- A `cache()`-wrapped server read that feeds an island **must** hydrate that
  island's TanStack cache via props (`setQueryData`), **never** trigger a client
  refetch on mount (the `Q-H` overlap audit, `10` §8).
- On **intent** (hover/focus of a nav target), `prefetchQuery` warms the *same*
  key so the navigation lands on a warm cache.

> **Validation:** the route-transition spec (`test:e2e:perf`,
> `route-transition-performance.spec.ts`) already asserts RSC hover-prefetch
> evidence (`03` §5, BENCHMARK MATRIX "Project list" row) — extend it to confirm
> sheet/charts prefetch-on-intent and **0 client refetch on first paint** (assert
> via the `perf:query-count` runtime counter: first paint issues 0 round-trips for
> a hydrated island). **Risk:** Low. **Cross-ref:** `10` §1.2/§7/§8, `Q-H`.

---

## 6. Consumer-audit extension for `.select` trimming — **P1 / Risk: Medium**

**Resolves:** the correctness trap in trimming columns. `10` §3.4 warns "do not
trim columns the sheet *renders*"; this doc **extends the audit beyond the
renderer** — the DTO superset must cover three consumer classes, not one.

### 6.1 The three consumer classes a trimmed column must clear

Before any column is moved to a detail-only set (`10` §3.2) or dropped, prove it
is **not** consumed by:

| Class | Why it bites if missed | Where to check |
|---|---|---|
| **(a) Renderer** | column rendered in the sheet/list/library UI | the DOM tests (`10` §3.5) — already covered in round 1 |
| **(b) `ReconcilePatch` reconcile consumers** | the Phase-5 optimistic adapter diffs the server response against the cached row; trimming a column the reconcile **diffs against** = an **intermittent optimistic-rollback bug invisible to DOM tests** (the row reconciles to a value the DOM never asserted) | `ReconcilePatch.fields` (`10` §5), the manual reconcile at `use-estimate-row-mutations.ts:382-398`, the §V2-FACTS object-identity check `prev.editableRows[item.id] !== next.editableRows[item.id]` (`branch.tsx:101`) |
| **(c) Export-model inputs** | the proposal/export model reads a column the renderer does not (e.g. `source_snapshot`, `metadata`); trimming it silently corrupts the exported workbook | proposal-export / publication snapshot inputs; `createProposalPreviewSignature` field set (`EstimateSheetContent.tsx:287-318`); `ESTIMATE_TREE_ROW_ITEM_COLUMNS` `source_snapshot`+`metadata` (`:1734`, `Q-G`) |

### 6.2 Audit procedure (per trimmed read)

1. **Snapshot the consumed-field set** across all three classes (not just the
   render path) — grep the DTO type's field reads in renderer, reconcile, and
   export modules.
2. Prove the proposed column list is a **superset** of that union (the
   explicit-column equivalence test, `10` §3.5).
3. For `ESTIMATE_TREE_ROW_ITEM_COLUMNS` specifically (`source_snapshot` +
   `metadata`), **resolve `Q-G` first** — does the sheet / export consume them for
   *all* rows or only linked rows? No trim until answered.

> **Validation:** the equivalence test (`10` §3.5) **extended** to assert the
> consumed-field union across renderer + reconcile + export; Phase 5 optimistic
> rollback tests (the §V2-FACTS `editableRows` identity check is the oracle).
> **Risk:** Medium (a missed reconcile/export column is a silent correctness
> regression). **Cross-ref:** `10` §3.3/§3.4/§5, `Q-G`.

---

## 7. Phase → network-gate matrix

| Phase | Network work landed here | Gate(s) active (all "(new, Phase N)" unless noted) |
|---|---|---|
| **Phase 0** | Capture realtime inbound-render baseline; capture per-route round-trip counts + payload sizes; ratify provisional ceilings (M/N, payload, channel count) | **define** `perf:realtime-cost`, `perf:query-count`, `perf:payload-size` (measure only); existing `estimate-sheet-cursor-isolation` is the realtime oracle |
| **Phase 3** (sheet decomposition) | Ensure decomposition adds **0 new round-trips / 0 N+1** on sheet load; preserve the 0-render-on-remote-cursor isolation | `perf:query-count` (sheet load ≤ N); `perf:realtime-cost` (inbound 0-render) |
| **Phase 4** (`10`) | `.select` trimming behind the §6 three-class consumer audit; hydrate-from-props seam wired as prefetch carrier (§5); `cache()`↔TanStack dedup (`Q-H`) | `perf:payload-size` (trimmed reads); `perf:query-count` (0 refetch on hydrated first paint) |
| **Phase 5** (optimistic) | `ReconcilePatch` reconcile must not depend on a trimmed column (§6 class b) | extended equivalence + optimistic-rollback tests |
| **Phase 7** (`13`) | RISK-19 provider move removes realtime-auth-bridge from non-workshop routes → channel/auth cost off public bundle | `perf:realtime-cost` channel-count + `perf:bundle-budget` (`03`) |
| **Phase 8** (`14`) | Homebase serial-tail collapse (§4 waves); ship `get_project_chart_buckets` (charts → 1 RPC, buckets-only payload); component-library `.limit()` + overflow | `perf:query-count` (homebase waves ↓, charts = 1 RPC); `perf:payload-size` (charts buckets-only, library bounded) |
| **Phase 9** | Wire all three gates with **ratified** thresholds into the `perf:gate` aggregate + CI (`03` §2) | `perf:realtime-cost`, `perf:query-count`, `perf:payload-size` — **gating** |

> All three gates feed **FIX-9 / `15_VALIDATION_MATRIX.md`** (handoff above).
> Open questions for `19`: **Q-28** realtime per-route channel-ceiling value;
> **Q-29** inbound presence-render ceiling (≤1 vs 0); **Q-30** payload-size
> ceilings per hot path; **Q-31** provisional query-count ceilings (M/N) per
> route — each with owner = eng/measurement, deadline = Phase 0 exit, safe
> default = the provisional values committed in §1–§3.
