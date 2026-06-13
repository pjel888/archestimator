# 10 · Measurement & QA

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Measurement methodology + acceptance + how-to-test-realtime
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%

> How to baseline, how to prove each change, and the acceptance matrix. Realtime is hard to test — this doc says exactly how. Every Phase task in `09` references a check here.

---

## 1. Baseline capture (do before any change — `T0.1`)

| Metric | How to measure | Tool |
|--------|----------------|------|
| Presence affordance | screenshot the project header; count clicks to "who's here + what" | manual |
| Role-change query count | Supabase dashboard query log around one role change; count round-trips (expect publication+sheets+collab) | dashboard / network panel |
| Role-change perceived latency | stopwatch from picker change → UI settled | manual + Performance trace |
| Summary round-trips | log `getProjectCollaborationSummary` queries (expect 8) | server log |
| `project`/`project_members` fetches per layout render | count duplicate reads (expect 2×) | server log |
| WCAG avatar contrast | compute ratio for all 8 palette pairs (`cursorSoft` bg + `cursor` text) | contrast calculator |
| Mobile | render modal at 360/480px; note overflow | devtools |
| Security headers | `curl -I` a `/workshop` + `/invite` route | curl |
| Test coverage shape | classify current Teamspace tests as behavioral vs string/static contract; list tests that must be rewritten | repo inspection |
| Layering | open Share modal, trigger feedback, confirm notification is visible above/in the modal | browser/DOM |
| Header responsive | render project header at 360/480/768/1024px and verify no overlap with publication controls | browser |
| Teamspace degraded state | force `summary=null` and fail-soft optional reads; verify unavailable/degraded copy is not confused with empty state | DOM/browser |
| Realtime lifecycle | simulate StrictMode, hidden tab, `CLOSED`, `CHANNEL_ERROR`, and token refresh; capture status/telemetry behavior | fake channel + browser |
| Rollout/rollback | list feature flags, provider config changes, DB trigger rollback/forward-fix SQL, and CSP Report-Only evidence | ledger |

Record into `.ai/05_logs/<date>-teamspace-baseline.md` and link it from the implementation ledger. **No baseline → not measurable.**

## 2. Per-discipline methodology

**Performance**
- Round-trips: instrument or read Supabase logs around a layout render and a mutation. Targets: T2.2 removes the `project`/`project_members` duplicate (2→1 each); T2.3 reduces serial waves (3→ effectively 2); T2.1 makes a role change refetch **only** collaboration.
- RLS: `EXPLAIN (ANALYZE, BUFFERS)` on the `estimate_sheet_members .in()` read before/after the `(select auth.uid())` wrap, on a project with ≥10 estimates (PG17 harness). Expect fewer per-row function evaluations.
- Render: React Profiler — assert a role change no longer re-renders the publication header subtree.

**UX/UI & a11y**
- Contrast: automated check (axe / contrast lib) over all 8 palette pairs ≥4.5:1 (1.4.3).
- Keyboard: tab through header cluster + modal; every interactive element reachable + visible focus.
- SR: VoiceOver pass — face `aria-label` read; join/leave announced once; removal announces as alertdialog (assertive).
- Reduced-motion: enable OS reduced-motion; confirm cursors snap and entrance animations are suppressed.
- Responsive: modal usable at 360px (no horizontal scroll, no crushed fields).
- Header responsive: cluster face count, overflow, manage affordance, and touch behavior follow `08`; proof includes the project shell action slot, not only the modal.
- Layering: modal-triggered feedback is visible while the modal is open. Either global toast z-band is above `z-[1000]` or feedback is modal-local.
- State matrix: header, popover, modal, and cursor layer each have empty/loading/error/degraded/offline/restricted/mobile/reduced-motion behavior captured.
- SR equivalent: visual cursor/selection state has hidden text or a scoped live region; color/position-only feedback does not count.
- Realtime failure visibility: `CHANNEL_ERROR`, `CLOSED`, auth-refresh failure, and rate-limit feedback are visible to logs/telemetry and do not leave a stale "active" UI.

**Security**
- Presence scope: subscribe as a project viewer (not a restricted-sheet member); assert the project presence payload contains **no** raw `activeRoute`, `activeEstimateId`, `activeTabId`, or `focusedCell` (T1.1).
- Identity spoof: craft a payload with `userId=A` from sender B, wrong-topic/expired/bad-signature sender envelopes, and unknown `userId`; assert each renders nothing. A valid envelope for A renders A's roster label/color; `<script>`-laden `displayName` is ignored or escaped (T1.2).
- Headers: `curl -I` asserts `X-Frame-Options`, `Referrer-Policy`, CSP present on `/workshop` + `/invite` (T1.5).
- Invite accept CSRF: cross-origin `POST /invite/{token}/accept` is rejected; same-origin form POST still accepts; GET still redirects back to the invite page.
- Last-owner/manager: harness asserts deleting/demoting the last `workspace_members` owner and last `project_members` access manager raises; concurrent project-member demotions cannot leave zero managers (T1.4).
- Pre-auth admin read invariant: `copyProjectInviteLink({invitationId:<other project>})` throws, returns no `invitePath` (`05 §2`).
- Invite/realtime behavior: unknown invite IDs, cross-project invite IDs, spoofed realtime identities, and restricted-sheet viewer scenarios are behavior-tested, not only grep-tested.

## 3. How to test realtime (the hard part)

1. **Unit (no socket):** via the `T0.3` transport seam, drive the hooks with a fake channel. Assert: project-presence payload minimization, throttle (≤1 send/80ms), 6px min-distance gate, 5s stale GC, self-echo reject, StrictMode ref-guard (one subscribe), visibility pause/retrack, `CLOSED` recovery, `removeChannel` on unmount, sender-bound identity verification, and auth-refresh handoff to `setAuth`. Replace static string tests that currently assert sheet fields exist on the project hook.
2. **Two-context integration:** two browser profiles (or an incognito + normal) on the same project — use the user's Chrome session (dev-auth bypass is disabled; a second `next dev` won't start — memory). Verify: faces appear in both headers; cursor in A appears in B on the same row after scroll/expansion differences; offline drop on tab close; reduced-motion snap.
3. **Channel-status probe:** the sheet already writes `data-estimate-cursor-channel` on the surface (`EstimateSheetContent.tsx:646`) — read it to confirm `SUBSCRIBED` vs `CHANNEL_ERROR` (authorization) in the live env.
4. **Ghost/flood/drift adversarial:** background a tab >30s, return → no ghost cursor (GC + re-track); ignore the client throttle (devtools) → server rate limit caps it; differing row expansions → cursor still row-anchored.
5. **Capacity smoke:** N synthetic movers at R Hz; watch Supabase Realtime usage vs the tier ceiling (`07 §1.5`); confirm the kill-switch flag disables broadcast without a deploy.

## 4. Acceptance matrix (all must pass at handoff)

| # | Criterion | Source |
|---|-----------|--------|
| A1 | Header shows a live, color-matched face stack (3 + `+N`), online-first, fully keyboard-accessible | `04`,`08` |
| A2 | "Who's here" answerable with 0 clicks; "what" detail available by hover/focus or one popover action, or visible at rest only if explicitly implemented | `02`,`06` |
| A3 | Sheet cursors row/node-anchored, interpolated, reduced-motion-safe; project-wide overview cursors present if D-1 capacity is confirmed | `06`,`11` |
| A4 | A role change does **not** re-render the publication header; per-row optimistic + toast | `03`,`09` |
| A5 | All 8 avatar palette pairs ≥4.5:1; removal = alertdialog; live regions split polite/assertive | `04`,`08` |
| A6 | Modal usable at 360px | `04`,`08` |
| A7 | Project presence payload carries no raw path or sheet-granular fields | `05` |
| A8 | Realtime identity is sender-bound; member-to-member impersonation, wrong-topic/expired/bad-signature envelopes, and unknown `userId` are rejected; `displayName` is ignored/escaped | `05`,`09` |
| A9 | Enforced `X-Frame-Options`/`Referrer-Policy`/nosniff/HSTS on `/workshop`+`/invite`; CSP is at least Report-Only with telemetry and an enforcement date; clickjacking blocked by enforced anti-frame header | `05`,`09`,`11` |
| A10 | DB-atomic last-owner/manager guards pass for `workspace_members` and `project_members`, including a concurrent demotion/removal scenario | `05`,`12` |
| A11 | `validate` + `build` + targeted tests green; `gitnexus_detect_changes` scope matches intent | `09` |
| A12 | Before/after captured for every §1 metric; shipped-vs-deferred recorded | `02`,`09` |
| A13 | Behavioral tests prove project presence payload minimization and sender-bound cursor identity; static grep/string assertions are not the only proof | `09`,`12` |
| A14 | Modal-triggered feedback is visible above/in the active modal; z-index contract documented | `08`,`12` |
| A15 | Header cluster responsive/touch behavior passes at 360/480/768/1024px without overlapping publication controls | `08`,`12` |
| A16 | Teamspace unavailable/degraded states are visible and distinct from true empty states | `08`,`12` |
| A17 | Cursor/selection "editing here" has a screen-reader equivalent | `06`,`08`,`12` |
| A18 | Follow mode is either deferred or implements the edge-state contract in `06 §4.5` | `06`,`11`,`12` |
| A19 | Realtime lifecycle proof covers `setAuth`, visibility pause/retrack, `CLOSED` recovery, cleanup, and telemetry for channel/auth failures | `06`,`09`,`12` |
| A20 | Rollout/rollback ledger names flags, telemetry destinations, provider proof path, DB rollback/forward-fix SQL, CSP observation window, and stop/rollback thresholds | `09`,`12` |

## 5. Honesty standard
"100% bug-free" is not claimable. The executable target is **zero known bugs at handoff**: every changed behavior has a failing-first proof, a measured before/after, an adversarial scenario, and a final review that actively tries to falsify it (mirrors the Library/Shared-Link plans). Realtime carries irreducible flakiness — flag any test that depends on socket timing and prefer the seam-based unit tests for CI.

Second-pass rule: a passing string/static contract test is evidence that a file contains a token, not that the behavior is safe. For security, realtime, focus, z-index, responsive, and degraded-state claims, require behavioral DOM/browser/fake-channel evidence.

→ Decisions that change the acceptance set (project-wide cursors, follow mode, viewer cursors) are in `11`.
