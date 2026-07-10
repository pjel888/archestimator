# 14 — Risk Register

| ID | Risk | Likelihood | Impact | Status | Mitigation |
|---|---|---|---|---|---|
| RISK-001 | Concurrent agents modify the same publisher/share files | High | High | OPEN | File-scope ownership in LOOP_LEDGER; re-read files before edits; serialize shared-file writes; small diffs |
| RISK-002 | Migration 0050 FK constraints fail on orphaned rows | Medium | Medium | OPEN | Pre-migration orphan cleanup query; test on local D1 first; rollback by dropping constraints |
| RISK-003 | Sidebar label change ("Publisher" → "Share") confuses existing users | Low | Low | OPEN | The label is a one-line revert; Philip has final say on naming |
| RISK-004 | Wizard adds complexity without clear benefit for power users | Medium | Low | OPEN | Retain the existing drawer for advanced management; wizard is for first-time publish only |
| RISK-005 | Preview-mode cookie is misused or misunderstood | Low | Medium | OPEN | Short TTL (1h); manager-auth-gated; disable submit in preview mode; clear "Preview mode" banner |
| RISK-006 | QR code dependency adds unexpected bundle size | Low | Low | OPEN | Measure bundle before merge; fallback to hand-rolled SVG encoder (DEC-AUTO-003) |
| RISK-007 | Comment pagination breaks existing comment component | Medium | Medium | OPEN | Backward-compatible response shape; cursor is optional; test existing comment flow |
| RISK-008 | Row-click select conflicts with cell interactions on estimate table | Medium | Low | OPEN | Test row-click vs cell-copy; refine to dedicated select affordance if conflict (DEC-AUTO-007) |
| RISK-009 | Browser print output quality is insufficient for "Download PDF" | Medium | Low | OPEN | Test in Chrome/Safari; the print CSS already produces decent output; server PDF is out of scope |
| RISK-010 | Shared worktree `package.json` conflict (concurrent agents) | High | Medium | OPEN | Coordinate dependency additions in LOOP_LEDGER; serialize `package.json` writes |
| RISK-011 | `proposals-data.tsx` and route-gate test are being modified concurrently | High | Medium | OPEN | Do not touch these files directly; if inbox changes require modification, coordinate with the owning agent |
| RISK-012 | Terminology change creates inconsistency between surfaces | Medium | Low | OPEN | Grep audit for jargon terms across all surfaces; update all instances in one unit |
| RISK-013 | Mobile publisher wizard is too constrained on small screens | Medium | Low | OPEN | Responsive design with bottom-sheet pattern; test at 375px; fallback to simplified flow |
| RISK-014 | Performance regression from new components | Low | Medium | OPEN | Performance evaluator (PERF-002); debounce search; lazy-load wizard |
| RISK-015 | Accessibility regression in redesigned components | Medium | High | OPEN | All new components must meet WCAG 2.1 AA; keyboard testing; screen reader verification |

## Risk Prioritization

**Address immediately (before implementation):**
- RISK-001 (concurrent agent file conflicts) — establish ownership protocol
- RISK-010/RISK-011 (shared worktree conflicts) — coordinate with other agents

**Monitor during implementation:**
- RISK-002 (migration) — test locally first
- RISK-007 (comment pagination) — backward-compatible design
- RISK-015 (accessibility) — test each component

**Accept (low impact, reversible):**
- RISK-003 (label change) — easily reverted
- RISK-006 (QR bundle) — measurable, fallback exists
- RISK-009 (print quality) — existing CSS is decent
