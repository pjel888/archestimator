# Adversarial QA Matrix Results — 2026-06-11 implementation run

Branch: perf/path-to-estimate-sheet. Channel legend: jsdom = vitest DOM suite; HTTP = curl against the running dev server (hosted Supabase backend); static = source/contract proof.
Environment boundaries (Docker absent, hosted SQL denied, no authenticated browser session) are recorded in `../environment-status.md`; rows blocked by those boundaries say so explicitly.

| ID | Status | Channel | Actual signal | Evidence path |
|----|--------|---------|---------------|---------------|
| QA-BASE-001 | PARTIAL (browser BLOCKED) | jsdom | 50/200/500-row first-render + 10-char keystroke profiles captured before/after; browser traces blocked by auth boundary | baseline/jsdom-render-baseline-before.json, -after-u1.json |
| QA-BASE-002 | PASS | static | line/hook/select counts, package state, route path, dirty worktree recorded | static-snapshot-before.txt |
| QA-BLAST-001 | PASS | graph+manual | get_impact_radius (HIGH ack'd) + manual rg tracing per unit; detect_changes ran before every commit | decisions/u0a-decision-receipts.md |
| QA-PKG-001 | PASS | static | zero dependencies added; @tanstack/react-virtual still absent | decisions/u0a-decision-receipts.md, u10-virtualization-decision.md |
| QA-CACHE-001 | PASS | static | Redis/Upstash/KV/remote-cache rejected per matrix defaults; lazy load + TanStack client cache shipped instead | decisions/u0a-decision-receipts.md |
| QA-IMAGE-001 | PARTIAL (thumbnails DEFERRED) | static | hero `priority`→`preload` (Next 16 type-verified); thumbnail backgroundImage→next/image deferred — network-bytes proof channel blocked | decisions/u0a-decision-receipts.md, baseline/u6-landing-evidence.md |
| QA-SHEET-001 | PASS (jsdom) | jsdom | typed 1234567890 into quantity, value preserved, focus retained, totals correct (relief + baseline suites) | tests/vitest/perf/estimate-sheet-render-relief.test.tsx |
| QA-SHEET-002 | PASS | jsdom | empty/invalid numeric validation semantics preserved (cost-inputs suite green) | tests/vitest/estimate-sheet-cost-inputs.test.tsx |
| QA-SHEET-003 | PASS | jsdom | contingency adds, discount subtracts (suite green) | tests/vitest/estimate-sheet-cost-inputs.test.tsx (327, 339) |
| QA-SHEET-004 | PASS (jsdom) | jsdom | row add (button/drop/keyboard), component delete/replace/move, template insert green; rollback paths exercised via mocked failed mutations in hook/context-menu suites | estimate-sheet-cost-inputs, estimate-tree-context-menu, estimate-template-drop-zones |
| QA-SHEET-005 | PARTIAL (1 pre-existing fail) | jsdom | sheet bulk-select isolation green (relief suite); estimate-tree-bulk-selection has 1 failure caused by unrelated DIRTY templates-panel edit (`"n"` vs `"node selected"` in working-tree EstimateSheetTree.tsx) — preserved untouched | baseline/characterization-baseline.md |
| QA-SHEET-006 | PASS | jsdom | drag/drop suites green after memoization + lazy load (tree-external-drop, template-drop-zones, library-insert) | suite outputs in commit messages |
| QA-CURSOR-001 | PASS | jsdom | remote cursor frames render only the cursor layer (0 sheet/table re-renders), typing focus preserved mid-broadcast, overlay timeout/clear works | tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx |
| QA-LIB-001 | PASS | static+jsdom | page source no longer references the library repository; no-fetch gates proven (sidebar hidden / props provided) | tests/vitest/estimate-sheet-library-lazy-load.test.tsx |
| QA-LIB-002 | PASS | jsdom | skeleton→content, cached remount (single fetch), visible non-blocking error with working retry | tests/vitest/estimate-sheet-library-lazy-load.test.tsx |
| QA-LIST-001 | DEFERRED | — | estimate-list aggregate unchanged this run (SQL parity unprovable without DB); current JS behavior intact by construction | decisions/u3-u5-database-deferral.md |
| QA-DB-001 | BLOCKED | — | EXPLAIN requires a database: Docker absent, hosted SQL denied, provider authority not granted | decisions/u3-u5-database-deferral.md |
| QA-LANDING-001 | PASS | HTTP+static | anonymous `/` median TTFB ~0.60s→~0.057s; no Supabase auth import in getLandingAuthState (contract test) | baseline/u6-landing-evidence.md |
| QA-LANDING-002 | PARTIAL (signed-in browser BLOCKED) | HTTP+jsdom | anonymous /workshop 307→/login (fail-closed intact); auth-proxy + closed-beta suites green; signed-in click-through needs a real session | baseline/u6-landing-evidence.md |
| QA-PROVIDER-001 | BLOCKED (correctly) | — | no hosted/provider performance claims made this run; no provider authority | environment-status.md |
| QA-DIRTY-001 | PASS | CLI | 7 unrelated dirty files present before and after; never staged (verified per commit and at final status) | git status snapshots in static-snapshot-before.txt + completion receipt |
