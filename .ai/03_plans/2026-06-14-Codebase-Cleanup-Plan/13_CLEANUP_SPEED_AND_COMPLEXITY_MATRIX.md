# 13 — Cleanup Speed and Complexity Matrix

Estimates are conservative and to be re-measured at implementation (`git diff --stat`, bundle analyzer). LOC/file figures are order-of-magnitude.

| Cleanup Area | Candidate Count | Safe Deletes | Migration Deletes | Owner-Gated | Est. LOC Removed | Est. Files Removed | Est. Dependency Reduction | Build Impact | Test Impact | Bundle Impact | Runtime Speed Impact | Cognitive Load Impact | Risk | Recommended Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dead landing scaffolding (F03) | 16 files | 16 | 0 | 0 | ~2,000–3,000 | ~16 | 0 (deps stay) | neutral/slight ↓ | update 1 test | landing chunk ↓ | landing render neutral | High ↓ (removes confusing graveyard) | Low-Med | P0 |
| Orphan lib modules (F04,F05,F06,F08) | 4 | 4 | 0 | 0 | ~300–500 | 2 files + 2 exports | 0 | neutral | guard tests stay | none | none | Med ↓ | Low | P0/P3 |
| Dead workshop comps (F01,F02) | 3 | 3 | 0 | 0 | ~150 | 3 | 0 | neutral | guard tests stay | tiny | none | Med ↓ | Low | P0 |
| Route/API shims (F10,F11,F14) | 3 | 1 | 0 | 0 | ~60 | 2 routes | 0 | neutral | update 3 share tests (F14) | none | none | Med ↓ | Low-Med | P0/P3 |
| Unused exports/types (F09,F16) | ~6 | 1 | 0 | 0 | ~100 | 0 | 0 | neutral | rewrite chart/pub tests (F16) | none | none | Low ↓ | Low-Med | P0/P3 |
| Public assets (F12) | ~11 | 11 | 0 | 0 | n/a (binary) | ~11 | 0 | neutral | none | repo/deploy ↓ ~9.9 MB | none | Low ↓ | Low | P0 |
| Dead CSS (F13) | 3 blocks | 3 | 0 | 0 | ~40 | 0 | 0 | tiny CSS ↓ | landing-audit | tiny | none | Low ↓ | Low | P0 |
| Dependencies (F20,F21,F22,F23) | 5 | 3 remove + 2 add | 0 | 0 | n/a | 0 | **−3 runtime, −2 dev, +2** | install/build graph ↓ | charts smoke | **~−600 KB graph + ~33 d3 sub-pkgs** | neutral | Med ↓ | Low | P2 |
| Scripts hygiene (F24,F39) | ~4 | 2 | 0 | 0 | ~150 | ~2 scripts | 0 | neutral | rewrite speed-insights test | none | none | Med ↓ | Low | P2/P6 |
| Docs/.ai (F33-38) | ~12 | doc edits + plan archives | 0 | 0 | n/a | move ~3 plan folders | 0 | none | update 3 doc-structure tests | none | none | **High ↓ (agent accuracy)** | Low | P6 |
| Story-only UI (F15) | 6 | 0 | 0 | 6 | ~400 | 6 (+stories) | 0 | neutral | storybook:validate + matrix | tiny | none | Med ↓ | Med (governance) | P1 |
| Duplicate BulkActionToolbar (F28) | 1 | 0 | 0 | 1 | ~120 | 1 | 0 | neutral | migrate 3 callers' tests | tiny | Med ↓ | Med | P3 |
| MVP-cut/deferred (F07,F17,F18,F25,F26,F27) | 6 surfaces | 1 (component F27) | 0 | 5 | varies (AI cut = large) | varies | AI cut → maybe `resend`? no; landing | depends | many AI tests if cut | AI cut → smaller server | none | **Very High ↓ if AI/aec cut** | Med-High (product) | P1 |
| DB cleanup (F29,F30) | 2 | 0 | 2 | 2 | n/a | 0 | 0 | none | none | none | none | small ↓ | High (destructive) | P4/P5 |
| Fix-forward (F40, lint debt) | many | 0 | 0 | 0 | n/a | 0 | 0 | none | fix 2 dom tests + lint | none | none | green gates | Med (not cleanup) | adjacent |

## Reading the matrix

- **Biggest cognitive-load wins, lowest risk:** dead landing scaffolding (F03), docs accuracy (F33–F38), orphan lib modules. These are where the codebase most misleads future agents.
- **Biggest measurable footprint wins:** public assets (~9.9 MB) and dependency graph (`three` + `d3`-umbrella → ~600 KB + 33 sub-pkgs).
- **Highest leverage product decision:** AI cut (F25) — would remove a large surface (routes, `lib/ai`, many tests) but is an owner call; keep audit tables regardless.
- **Lowest urgency / highest care:** DB destructive drops (F29/F30) — tiny benefit, real risk; post-beta only.

## Sequencing logic
P0 (safe code + assets + CSS) → P1 (owner-gated MVP cuts) → P2 (deps) → P3 (server/domain consolidation incl. F16/F28) → P4 (DB dry-run) → P5 (hosted DB) → P6 (docs/scripts). Detailed in `17_IMPLEMENTATION_PHASE_PLAN.md`.
