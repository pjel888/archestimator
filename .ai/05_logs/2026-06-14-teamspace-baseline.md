# Teamspace — Pre-Implementation Baseline & State Matrix

**Plan:** `.ai/03_plans/2026-06-14-Teamspace-Improvement-Plan/`
**Task:** T0.1 (baseline metrics) + T0.5 (state matrix)
**Captured:** 2026-06-14, before any Teamspace code changed on branch `2026-06-14-Teamspace-Improvement-Plan`.
**Method:** `file:line` reads of the live source (no running-browser numbers were fabricated; latency figures are the audit's modeled estimates, labeled as such).

> A target without a baseline is not measurable. This is the "today" column the
> Phase 6 closeout compares against.

---

## 1. Baseline metrics (today)

| Dimension | Metric | Today (baseline) | Source |
|-----------|--------|------------------|--------|
| Presence affordance | Faces in the project header? | **No** — a single gear icon + a numeric "online" badge | `ProjectTeamspaceHeader.tsx:326-348` |
| Presence affordance | Where are avatars? | Only inside the settings modal rail; `AvatarBubble.offset` always `0` (stacking dead) | `ProjectTeamspaceHeader.tsx:52-94,366` |
| Role-change latency | Server work per mutation | Every mutation `revalidatePath`s `/workshop/projects`, `/workshop/projects/{id}`, `/workshop/projects/{id}/estimates` → layout re-runs all 3 fans (`getProjectCollaborationSummary` 8 RTT + publication ~7 + sheets) | `actions.ts:435-439`, `layout.tsx:25-31` |
| Query count | `getProjectCollaborationSummary` round-trips | **8 fixed** (3 serial waves), `project` + `project_members` **double-fetched** with publication summary | `workspace-repository.ts:1174-1327` (audit `03 §1`) |
| Query count | Modeled avoidable latency | ~150–250ms from 3 serial waves on remote Supabase (~30–60ms/RTT) | audit `03 §1 F-P1` |
| WCAG contrast | Avatar initials | `cursorSoft` bg + `cursor` text ≈ **3.3:1** → **fails WCAG 1.4.3** (needs ≥4.5:1); palette's intended `text:#FFFFFF` is unused | `ProjectTeamspaceHeader.tsx:63-70`, `colors.ts:1-66` |
| Mobile | Header cluster breakpoints | **None** — gear is fixed `size-10`; no responsive face counts; mobile proof was modal-only | `ProjectTeamspaceHeader.tsx:326`, gap G9 |
| Security headers | `/workshop/*` + `/invite/*` | **Absent** — only `/`, landing pages (Report-Only) and `/share/*` (enforced) covered | `next.config.ts:60-117` |
| Realtime payload | Project presence fields | Ships `activeRoute` (raw pathname), `activeEstimateId`, `activeTabId`, `focusedCell` to every project member | `use-project-presence.ts:11-21,77-88` |
| Realtime identity | Trust model | `userId`/`displayName` are client-asserted; receiver trusts the wire | `use-project-presence.ts:80-87`, `use-estimate-cursor-broadcast.ts:87-106` |
| Realtime lifecycle | JWT refresh wiring | **No** `onAuthStateChange`/`supabase.realtime.setAuth()` anywhere in `src/` | grep (gap G6) |
| Realtime rate limit | Server-side cap | **None** — client throttle only (80ms/6px) | audit `05 §5 MED` |
| Cursors | Scope | Estimate-sheet only; no project-wide page cursors | `EstimateSheetContent.tsx:603-656`, audit `03 §5 F-P10` |
| Cursors | Coordinate model | Pixel offsets within scroll surface (drifts across expansion/viewport); jumps each 80ms (no interpolation); overlay `aria-hidden` (no SR equivalent) | `EstimateSheetContent.tsx:603-696` |
| Membership invariant | Last-owner/last-manager | App-side read-then-write only; **not DB-atomic** (concurrent demotions can both pass) | `actions.ts` (`hasOtherProjectManager`), migration `20260526142913` |
| Feedback | Action feedback | One bottom `role="status"` line; no toasts, no per-row state; global `isPending` disables everything | `ProjectTeamspaceHeader.tsx:128-134,637-651` |
| Layering | Toast vs modal z | Toast viewport `z-[100]` is BELOW modal root `z-[1000]` → modal-triggered toasts can render hidden | `toast.tsx`, `overlays/modal.tsx` |

---

## 2. State matrix (T0.5)

What each Teamspace surface renders in every state. "Today" = baseline; "Target" = after this plan. This is the contract the modal/header rewrite must cover (gap G10 — `summary === null` must not stop at a disabled gear).

| Surface | empty | loading | error | degraded (optional reads fail-soft) | offline (no realtime) | restricted (viewer w/o sheet) | mobile (<640px) | reduced-motion |
|---------|-------|---------|-------|-------------------------------------|-----------------------|-------------------------------|-----------------|----------------|
| **Header cluster** | Today: gear only. Target: "Invite" affordance + self face | Today: gear. Target: face skeletons | Today: disabled gear. Target: terse "Teamspace unavailable" + retry/open | Today: looks empty. Target: degraded marker distinct from "no collaborators" | Today: static count. Target: faces from server roster, no live dot | Sees presence, not restricted-sheet activity | Today: fixed gear. Target: ≤2 faces + `+N` | n/a |
| **Popover roster** | n/a (no popover today) | n/a | n/a | Target: shows roster from server data even if presence channel down | Target: "active now" absent, roster still lists members | Activity text hidden unless viewer can access that sheet | Target: opens as bottom sheet / full-width | no entrance animation |
| **Share modal** | Today: rail + empty-ish. Target: "Invite your first teammate" | Today: form silently disabled. Target: "Checking invite delivery…" | Today: warning line. Target: inline + toast (above scrim) | Target: degraded banner | n/a | Sheet rows hidden if not manageable | Today: 2-col cramped. Target: single column | entrance disabled |
| **Cursor layer (sheet)** | no remote cursors → nothing | n/a | channel error → `data-…-channel="error"` (now also surfaced) | n/a | no cursors render | viewer sees no cursors (cannot send) | suppressed on touch by default | snap, no spline |
| **Project cursor layer** | flag OFF by default (T5.3) | — | — | — | — | — | suppressed on touch | snap |

---

## 3. How "after" is captured

Phase 6 writes `2026-06-14-teamspace-implementation-ledger.md` with the same rows, the before/after values, and shipped-vs-deferred. Behavioral proof (fake-channel tests, header-faces test, contrast test, header-source test) replaces static string checks per decision R-13.
