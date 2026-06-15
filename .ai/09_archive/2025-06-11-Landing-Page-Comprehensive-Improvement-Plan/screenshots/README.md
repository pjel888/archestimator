# Screenshots & Evidence Archive

This folder is the archive location for visual QA evidence required by
`07_IMPLEMENTATION_PLAN.md` Phase 4 and `09_READINESS_GATE_AND_SCORECARD.md` Gates 2, 5, 6
(viewport sets 360/768/1024/1440/1920, Lighthouse reports, blank-paint robustness video).

## 2026-06-11 audit session (observations recorded in 01/02; captures viewed live in-session)

Live session: `next dev` at `http://localhost:3000`, Chrome, 1497×977 desktop viewport.
Key states observed and documented:

1. **Hero (top)** — terracotta header state, eyebrow "Close Projects Faster.", H1, ~250px dead gap
   between H1 and support copy, "Start Winning" CTA, blurry frosted construction photo with three
   floating cards + signal rail + "Now On Closed Beta" badge.
2. **Rough.js diagram band (~y=980)** — hand-drawn flow with mid-word label breaks visible:
   "Reusable Componen t Library", "Intuitive Estimating Experienc e".
3. **Terracotta drench section (~y=1900)** — captured **mid-reveal at low opacity** (heading and
   feature cards barely visible) — the reveal-gating defect of 02 §D1; at another scroll position
   the same section captured as a fully blank terracotta field.
4. **#product showcase** — estimate-workspace mockup with ₱ line items ("Lighting rough-in …
   ₱148,800", "Painter day rate — Drag or insert into Kitchen").
5. **#pricing / footer region** — captured fully blank under rAF throttling (same defect).

Re-capture during implementation with the MotionReveal fix applied; before/after pairs of states
2, 3, and 5 are the regression proof for Gate 2.
