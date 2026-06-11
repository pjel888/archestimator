# U10 Virtualization Decision — 2026-06-11

**Virtualization skipped: Sprint 0-2/structure measurements met budgets without adding dependency.**

## Evidence

| Gate (plan) | Measurement (jsdom, relative) | Verdict |
|-------------|-------------------------------|---------|
| 200-row keystroke < 16ms | 8.4ms avg / 17.8ms worst after U1 (was 82.0/197.0) | Met without DOM reduction |
| Non-edited table re-renders | 0 per keystroke (was 9 tables × every keystroke) | Computation, not DOM count, was the limiting factor |
| Cursor frames | re-render only the cursor layer after U8 | No DOM-pressure signal |
| 500-row keystroke | 34.2ms avg jsdom (was 212.8) | Real-browser headroom expected; no input-lag evidence above budget |

`@tanstack/react-virtual` therefore remains NOT installed (decision matrix default upheld; QA-PKG-001). 

## Reopen trigger

A real-browser profile at 500–1000 rows showing paint/memory or keystroke budget misses attributable to DOM node count after U1/U8/U9 — then follow plan U10's full checklist (focus retention, drag/drop zone mapping, off-screen bulk selection, cursor coordinate mapping, print/export parity, 500/1000-row QA).
