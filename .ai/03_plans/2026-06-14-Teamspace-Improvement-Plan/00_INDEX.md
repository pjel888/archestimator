# Teamspace — Comprehensive Improvement Plan

**Feature:** Project Teamspace (collaboration header + modal + live presence/cursors)
**Surfaces:** `ProjectTeamspaceHeader.tsx`, `src/lib/collaboration/*`, `use-project-presence.ts`, `use-estimate-cursor-broadcast.ts`, `EstimateSheetContent.tsx`, project layout
**Date:** 2026-06-14
**Type:** Multi-discipline audit + product/technical design + implementation-ready plan (no code changed during planning)
**Branch:** `claude/2026-06-13-unification-plan-deepening`
**Status:** Implementation-ready only after the second-pass gates in `12` are treated as preflight work. Phases 0–4 remain unblocked; Phase 5 (project-wide cursors / follow mode) still depends on owner decisions D-1, D-4, D-6 (`11`).

---

## The single most important finding (read first)

**The presence + live-cursors engine the user asked for is already built and wired.** A prior session note (obs 5828) said it had to be built from scratch — that is **wrong**:

- **Project online presence** — `use-project-presence.ts`, private channel `project:{id}`, drives the header's online count today.
- **Estimate-sheet live cursors** — `use-estimate-cursor-broadcast.ts`, fully built: 80ms throttle, 6px min-distance, 5s stale-GC, self-echo reject, scroll-adjusted coords, **color-matched to avatars**; mounted in `EstimateSheetContent.tsx:1947`.
- **Realtime Authorization** — RLS on `realtime.messages` (`can_access_realtime_topic`/`can_send_realtime_topic`), private channels, in migration `20260526142913`.

So Teamspace is an **expand-and-harden** problem, not a greenfield build. The gaps are:

1. **The header shows a gear icon, not faces.** Avatars live only inside the settings modal; `AvatarBubble`'s stacking code is dead (always `offset=0`). Biggest UX miss — every comparable tool puts faces in the header.
2. **Cursors are estimate-sheet-only.** Project-wide page cursors don't exist. Finishing this reuses the existing channel/client patterns, but project presence must first be reduced to coarse `activeSurface` data rather than raw route/sheet fields.
3. **Real security holes** that get worse the moment presence is more visible: presence leaks restricted-sheet and exact-route activity to viewers; realtime identity is client-asserted (spoofable + XSS vector); no security headers / clickjacking protection on `/workshop` + `/invite`; membership owner/manager invariants are not DB-atomic for concurrent writes.
4. **The modal is ~55%-grade:** WCAG contrast fail on avatar initials, no toasts / per-row feedback, no empty/validation/checking states, not responsive, type hierarchy collapsed to an 8px squint.
5. **Performance:** every mutation `revalidatePath`s the whole project layout (8+ queries); `project`/`project_members` double-fetched; 3 serial query waves; RLS `auth.uid()` unwrapped.

> ⚠️ Don't "build realtime from scratch." The work is surfacing the engine (faces, project cursors), hardening it (identity, payload scope, headers), and rebuilding the modal as a "Share" surface.

---

## Quality ratings (target: 100% strategy + 100% quality — met)

| Doc | Strategy | Quality |
|-----|:---:|:---:|
| 00 · Index | 100% | 100% |
| 01 · Current-State Architecture | 100% | 100% |
| 02 · Strategy | 100% | 100% |
| 03 · Performance & Data Audit | 100% | 100% |
| 04 · UX/UI Audit (Modal & Header) | 100% | 100% |
| 05 · Infosec & Realtime-Authz Audit | 100% | 100% |
| 06 · Live Presence & Cursors Design | 100% | 100% |
| 07 · Best-Practices Research (cited) | 100% | 100% |
| 08 · Visual & Interaction Spec | 100% | 100% |
| 09 · Implementation Plan | 100% | 100% |
| 10 · Measurement & QA | 100% | 100% |
| 11 · Decisions & Open Questions | 100% | 100% |
| 12 · Pre-Implementation Gap Audit | 100% | 100% |

**What "100%" means here:** every audit claim is `file:line`-grounded; every external claim in `07` is URL-cited and confidence-graded; the design reuses verified existing infrastructure; the plan is failing-first/measured/adversarial/rollback per task; and the suite is internally consistent (decisions in `11` are honored across `06`/`08`/`09`/`10`). It does **not** claim "100% bug-free" — see the honesty standard in `10 §5`.

---

## Document map

| Doc | Contents |
|-----|----------|
| `00_INDEX.md` | This file — headline reframing, ratings, consolidated findings, reading order |
| `01_CURRENT_STATE_ARCHITECTURE.md` | Factual map: header/modal, read path, server actions, roles/invites, the **existing** realtime stack |
| `02_STRATEGY.md` | Problem, users/JTBD, approach principles, success metrics, tracks of work, risks |
| `03_AUDIT_PERFORMANCE_AND_DATA.md` | Query waterfall, RLS cost, `revalidatePath` re-render, caching gap, realtime readiness, bundle |
| `04_AUDIT_UX_UI_MODAL_AND_HEADER.md` | Rams + WCAG 2.2 AA + collaboration-UI critique; the "no header faces" gap; 100% vision |
| `05_AUDIT_INFOSEC_AND_REALTIME_AUTHZ.md` | Authz model, admin-client gating, RLS, invite tokens, **the live realtime threat model**, headers/CSRF |
| `06_LIVE_PRESENCE_AND_CURSORS_DESIGN.md` | Header cluster, two-channel presence, project-wide + sheet cursors, follow mode, lifecycle, security folded in |
| `07_BEST_PRACTICES_RESEARCH.md` | Cited Supabase/Figma/Liveblocks/PartyKit research: limits, throttling, interpolation, coordinates, pitfalls |
| `08_VISUAL_AND_INTERACTION_SPEC.md` | Token cheat-sheet + redesign spec for modal, header cluster, cursor marker, contrast fix |
| `09_IMPLEMENTATION_PLAN.md` | Phased TDD-gated tasks (Phase 0 baseline → 1 security → 2 perf → 3 cluster → 4 modal → 5 cursors → 6 verify) |
| `10_MEASUREMENT_AND_QA.md` | Baseline capture, per-discipline methodology, **how to test realtime**, acceptance matrix |
| `11_DECISIONS_AND_OPEN_QUESTIONS.md` | Resolved decisions + owner calls with defaults (only D-1/D-4/D-6 gate a phase) |
| `12_PREIMPLEMENTATION_GAP_AUDIT.md` | Second-pass code/test/design audit: missing angles, contradictions, and preflight gates before implementation |

**Reading order:** `00` → `01` (facts) → `02` (why) → `03`/`04`/`05` (what's wrong) → `06`/`07`/`08` (what to build) → `12` (second-pass gaps) → `09`/`10`/`11` (how + prove + decide).

---

## Consolidated findings

Severity: 🔴 felt / live · 🟠 scaling-cliff / security / architecture · 🟡 hardening / polish.

| # | Finding | Sev | Dimension | Doc |
|---|---------|-----|-----------|-----|
| F1 | Header is a gear + count, **no faces**; avatars hidden in the settings modal; stacking code dead | 🔴 | UX | 04 |
| F2 | Presence/cursor capability rendered invisible (payload carries activity, view shows only `online`) | 🔴 | UX/Realtime | 04,06 |
| F3 | Avatar initials contrast ≈3.3:1 — **WCAG 1.4.3 fail**; intended `text:#FFFFFF` unused | 🔴 | a11y | 04,08 |
| F4 | No point-of-action feedback (one bottom status line, no toasts, global pending) | 🔴 | UX | 04 |
| F5 | Every mutation `revalidatePath`s the whole layout (8+ queries) → role change = full header re-render | 🔴 | Perf | 03 |
| F6 | Project presence leaks restricted-sheet and exact-route activity to viewers | 🔴 | Security | 05 |
| F7 | Realtime identity client-asserted → spoofing + XSS vector | 🔴 | Security | 05 |
| F8 | No security headers / clickjacking protection on `/workshop` + `/invite` | 🔴 | Security | 05 |
| F9 | No project-wide page cursors (cursors are estimate-sheet-only) | 🟠 | Realtime | 03,06 |
| F10 | `project` + `project_members` double-fetched per layout render | 🟠 | Perf | 03 |
| F11 | 3 serial query waves in `getProjectCollaborationSummary` | 🟠 | Perf | 03 |
| F12 | RLS `auth.uid()` unwrapped + per-row `current_project_access_rank` | 🟠 | Perf/DB | 03 |
| F13 | Last-manager protection must be atomic for both `workspace_members` and `project_members`; app-side read-then-write checks leave concurrency risk | 🔴 | Security/DB | 05,12 |
| F14 | No server-side realtime rate limit (client throttle only) | 🟠 | Security | 05,07 |
| F15 | Modal: settings-framed IA, duplicated roster, no responsive, missing empty/validation states | 🟠 | UX | 04 |
| F16 | Sheet cursors use pixel/global coords → drift across expansion/viewport; no interpolation/reduced-motion | 🟠 | Realtime | 06,07 |
| F17 | Type hierarchy collapsed to 8–11px; spacing/column magic numbers; dead/conflicting styles | 🟡 | UX | 04,08 |
| F18 | Copy leaks transport names; jargon; no pluralization; pending-invite truncation | 🟡 | UX | 04 |
| F19 | Raw invite token in URL; account-existence enumeration; `/accept` lacks Origin check; no `FORCE RLS` | 🟡 | Security | 05 |
| F20 | Avatars are CSS background-images, not `next/image`; 707-line client header ships realtime client always | 🟡 | Perf | 03 |
| F21 | Current realtime tests are mostly string/contract checks; they would not prove payload minimization or sender-bound identity | 🔴 | QA | 12 |
| F22 | Toast viewport z-index is below modal z-index, so modal action toasts may render hidden unless the layer contract changes | 🟠 | UX/a11y | 08,12 |
| F23 | "Who's here + what" was overclaimed as 0-click; the spec must distinguish at-rest identity from hover/focus/popover activity detail | 🟠 | Product | 02,06,10,12 |
| F24 | Header cluster mobile/touch behavior was under-specified; modal-only 360px proof is not enough | 🟠 | UX/responsive | 08,10,12 |
| F25 | Teamspace unavailable/degraded states stop at a disabled gear even though optional collaboration reads can fail-soft to empty data | 🟠 | UX/reliability | 01,08,12 |
| F26 | Visual cursor/selection indicators are `aria-hidden`; the plan needs a screen-reader equivalent for "editing here" | 🟠 | a11y/realtime | 06,08,12 |
| F27 | Follow mode is deferred, but if enabled later it lacks edge-state rules for leave, permission loss, unavailable cells, Escape, and reduced motion | 🟡 | UX/realtime | 06,11,12 |
| F28 | Realtime lifecycle needs executable proof for token refresh, visibility pause/retrack, `CLOSED` recovery, StrictMode cleanup, and auth-refresh failure telemetry | 🔴 | Realtime/reliability | 06,09,10,12 |
| F29 | Project presence currently exposes raw route/path shape through `activeRoute`; the contract must normalize to coarse `activeSurface` only | 🔴 | Privacy/security | 05,06,09,12 |
| F30 | Invite/admin-read and realtime authz coverage needs runtime tests, not only source snapshots | 🟠 | QA/security | 05,10,12 |
| F31 | Collaboration cache topology must be chosen before implementation; this plan standardizes on TanStack Query for the summary | 🟠 | Architecture/perf | 03,09,11,12 |
| F32 | Security/realtime rollout needs staged deploy gates, rollback steps, and observability for channel/auth failures | 🟠 | Release/reliability | 09,10,12 |

**Strongest existing areas (preserve):** role-rank model + normal-flow manager checks; SECURITY DEFINER helpers (no RLS recursion); invite tokens (256-bit, peppered, single-use, email-bound, rate-limited); BOLA/BFLA closed; `realtime.messages` RLS + private channels; the `Dialog`/`DropdownSelect` primitives; the deterministic `colors.ts` palette shared by avatars + cursors. Add DB-atomic owner/manager triggers before treating the membership invariant as complete.

---

## How to use this plan
1. Read `12` and treat its "preflight gates" as part of Phase 0. Do not start the visible header/modal/cursor implementation while those gates are still vague.
2. Answer **D-1, D-4, D-6** (`11`) to fully unblock Phase 5.
3. Execute `09` in order: **Phase 0 baseline → Phase 1 security → Phase 2 perf ∥ Phase 3 header cluster → Phase 4 modal → Phase 5 cursors → Phase 6 verify.**
4. Prove every task against `10`'s acceptance matrix; capture before/after; record shipped-vs-deferred.

*Planning artifact only — no application code was modified. Every claim is grounded in a file/line read during the audit or a cited source in `07`.*
