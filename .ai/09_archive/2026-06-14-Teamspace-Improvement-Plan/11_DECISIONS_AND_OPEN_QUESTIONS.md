# 11 · Decisions & Open Questions

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Resolved decisions + owner calls (with implementation-unblocking defaults)
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%

> Resolved design decisions are settled — don't relitigate. Open questions each carry a **default** so implementation is never blocked; the owner can override. Only **D-1, D-4, D-6** gate a phase (all in `09` Phase 5); everything else has a safe default.

---

## Resolved decisions

| # | Decision | Rationale |
|---|----------|-----------|
| R-1 | **Expand-and-harden, not rebuild.** Reuse `use-project-presence`, `use-estimate-cursor-broadcast`, `colors.ts`, `Modal`/`DropdownSelect`, existing RLS + channels. | The engine exists and is correct (`01 §6`); net-new is the header cluster, project cursor layer, and modal redesign. |
| R-2 | **Two presence granularities by channel.** `project:{id}` = coarse (`online`/`activeSurface`); `estimate:{id}` = fine (`focusedCell`, cursors). | Granularity must follow the channel's authorization boundary (`05 §5`, `06 §2`). |
| R-3 | **Identity is server-trusted; the wire is untrusted.** Render labels/colors from the roster by `userId`; drop unknown `userId`s; escape text. | Realtime RLS can't validate `payload.userId` (`05 §5`). |
| R-4 | **Security prerequisites land before greater presence visibility.** | Surfacing presence amplifies the leak/spoof/clickjacking risks (`02 §7`). |
| R-5 | **Cursors on Broadcast, roster on Presence.** | Presence `track()` is capped at 5/30s — unusable for motion (`07 §1`). |
| R-6 | **Row/node-anchored normalized coords** for sheet cursors, not global document fractions. | Content height differs between users (expanded rows) → global fractions drift (`07 §2.4`). |
| R-7 | **Match `DESIGN.md` tokens exactly** (3px radius, SF Pro 8–12px, hairline/anti-shadow, `#3D3D3D`). | House consistency; the discrepancy with `DESIGN.md`'s `#292929` resolves to the shipped `#3D3D3D` (`08 §A`). |
| R-8 | **Fix avatar contrast by using the palette's intended `text:#FFFFFF` on `cursor` bg.** | The field exists and is unused; closes the WCAG fail without inventing colors (`04 §5`, `08 §B.4`). |
| R-9 | **Out of scope: real-time concurrent *data* co-editing (CRDT/OT).** This plan is presence, cursors, modal, perf, security — ephemeral state only. | A separate, much larger initiative (`02 §3`). |
| R-10 | **Prefer TanStack-query for the summary** (over a layout split) to scope revalidation. | Also unlocks per-row optimistic UI in the modal (`09` T2.1/T4.2). |
| R-11 | **Do not overclaim 0-click activity detail.** The header stack answers who is present at rest; sheet-level activity is hover/focus/popover unless implemented as visible header text. | Second-pass review found the original metric was stronger than the proposed UI (`02`,`06`,`10`,`12`). |
| R-12 | **Modal feedback must obey a layer contract.** Either raise the global toast viewport above active dialogs or keep Teamspace action feedback modal-local. | Current modal root is `z-[1000]` and toast viewport is `z-[100]`, so modal-triggered toasts can be hidden (`08`,`12`). |
| R-13 | **Static/string tests are not enough for realtime safety.** Presence payload minimization and cursor identity trust require fake-channel/DOM behavioral tests. | Current realtime tests inspect strings; they would not prove leak/spoof fixes (`10`,`12`). |
| R-14 | **Project presence never broadcasts exact app paths.** Use a coarse `activeSurface` enum; raw route/path and sheet-granular state stay off `project:{id}`. | The project channel is broader than restricted sheet access, and exact pathnames are unnecessary for the header (`05`,`06`,`12`). |
| R-15 | **Collaboration summary moves to TanStack Query.** Layout split remains a fallback only if the query migration proves impossible. | This is the smallest topology that fixes over-broad revalidation and supports per-row optimistic modal states (`03`,`09`). |
| R-16 | **Membership invariants are database invariants.** Last workspace owner and last project access manager must be protected by DB triggers, not only app checks. | Read-then-write guards can race under concurrent demotion/removal (`05`,`09`,`12`). |
| R-17 | **Realtime lifecycle is a first-class contract.** `setAuth`, visibility pause/retrack, `CLOSED` recovery, cleanup, and failure telemetry are part of Phase 0/1, not polish. | Long-lived private channels silently fail without these guarantees (`06`,`09`,`10`,`12`). |
| R-18 | **Realtime display identity must be sender-bound, not just roster-resolved.** Use a short-lived server-signed envelope binding `auth.uid` to the channel topic before accepting cursor/presence-detail identity. | Roster lookup fixes labels, but it does not stop member B from claiming member A (`05`,`09`,`10`,`12`). |

## Open questions (with defaults)

| # | Question | Default (proceed unless overridden) | Gates? |
|---|----------|--------------------------------------|--------|
| **D-1** | What Supabase tier is the project on? Multi-user cursors need **Pro (500 msg/s)**; Free saturates at ~5 movers. | **Confirm tier before enabling project-wide page cursors (T5.3).** Sheet cursors already ship today, so this gates only the *new* page cursors. Default: ship header cluster + sheet upgrades regardless; **hold T5.3 until tier confirmed.** | Phase 5 (T5.3) |
| D-2 | Offline collaborators in the header cluster: dim to ~40% or hide? | **Hide offline from the stack; show all in the popover roster** (cleaner header, full list on demand). | no |
| D-3 | Max faces before `+N` overflow? | **4** (then `+N`), per `07 §3.5` and density. | no |
| **D-4** | Should **viewers** emit cursors? Today they can't (broadcast send needs editor). | **No** — keep viewer = presence-only. Revisit only after R-3 ships; relaxing requires the broadcast send-policy change + identity hardening. | Phase 5 (policy) |
| D-5 | Project-wide page cursors on *which* surfaces (overview, lists) or sheet-only? | **Default is decided:** sheet-only first (already proven); once D-1 capacity is confirmed, overview is the first project-wide surface behind a per-surface flag. Expanding beyond overview needs a later owner call. | no |
| **D-6** | Build **follow mode** now or defer? | **Defer** (T5.4) — high-value but not in the user's stated ask; ship presence + cursors first. If later enabled, it must implement the `06 §4.5` edge contract for target leave, permission loss, missing cell, Escape/Stop, focus, manual scroll, and reduced motion. | Phase 5 (T5.4) |
| D-7 | Widen the 8-color palette / add per-session de-collision? | **Keep 8 for now**; add a de-collision pass only if rooms routinely exceed ~4 concurrent (rare for estimating teams). Pair color with name/initials regardless (`07 §3.2`). | no |
| D-8 | Privacy / "incognito presence" opt-out? | **Not in v1** (no authoritative pattern, `07 §3.8`). If requested: simply don't `track()`/broadcast when opted out. | no |
| D-9 | CSP: Report-Only duration before enforce? | **Report-Only ≥1 week** of real traffic, then enforce; coordinate with the Shared-Link CSP-nonce work (memory). This does **not** defer `X-Frame-Options`, `Referrer-Policy`, nosniff, or HSTS, which enforce immediately in T1.5. | no |
| D-10 | Server-side realtime `max_events_per_second` value? | **Start at a level matching Pro headroom** (e.g. budget N×R for expected room sizes); document and tune from the capacity smoke (`10 §3.5`). | no |

## What an owner must answer to unblock Phase 5
Only **D-1** (tier), **D-4** (viewer cursors), **D-6** (follow mode). D-5 has a default implementation surface, so it is not an owner gate. Phases 0–4 (security, performance, header cluster, modal, sheet-cursor upgrades) are fully unblocked by the defaults above.

→ Sequencing in `09`; acceptance impact of D-1/D-4/D-6 noted in `10 §4`.
