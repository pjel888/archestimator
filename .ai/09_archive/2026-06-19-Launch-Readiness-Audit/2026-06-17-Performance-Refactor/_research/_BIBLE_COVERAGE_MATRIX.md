# Bible → Plan-Pack Coverage Matrix

Date: 2026-06-17. Cross-check of the Performance Engineering Bible (`.ai/13_research/2026-06-17-Master-Performance/Archestimator_React_Next_Performance_Engineering_Bible_Repo_Tailored_Update.md`, §0–§22) against the 28-file plan pack. Produced by a 4-agent section-by-section coverage audit, then gaps were closed. Every Bible section is now COVERED in the pack.

| Bible § | Topic | Pack location |
|---|---|---|
| §0–§1 | Executive standard, repo diagnosis | 00, 01 (A-01..40), 02 |
| §2 Law 1 | Server/UI/transient state separation | 04 §5 (state contracts) |
| §2 Law 2 | No derived data in state unless indexed cache | 04 §4.5 + **27** (merge gate) |
| §2 Law 3 | normalize→index→project→virtualize for ALL shapes + merge gate | 04 §0.1 (6-shape table) + **27** (gate) |
| §3.1–3.4 | Tree kernel API, flat-adjacency truth, one renderer, variants-as-projections | 04 §6, 08 §1–§3 |
| §3.5 | Search by ancestor closure (`buildVisibleIdSetFromSearch`) | 08 §2.4 |
| §3.6 | Tree mutation split (domain/calc/RPC/reconcile/UI) | 08 §7 |
| §3.7 | Tree perf budgets (flatten<4ms/5k, search<16ms/10k, virtualize≥150, DnD no-state) | 03 §4.2a, 15 |
| §3.8 | EstimateSheetTree 7-file split layout | 08 §1 (family-1) |
| §4.1–4.5 | Sheet pipeline, totals-one-DFS, keystroke-local, virtual-branch targets, dock lazy-load | 09 §4/§5/§11 + 13 §0.1 |
| §5.1–5.5 | Server-first, query-key factory, mutation state machine, per-op scoped-delta DTO table, return DTOs | 10 §1/§5/§5.1, 11 |
| **§6** | **Next.js 16 Cache Components (C0→C4, use cache, cacheTag, Suspense law)** | **26** (was a GAP) |
| **§7** | **React Compiler gated pilot + §7.3 concurrency law** | **26** (was a GAP) |
| §8.1–8.4 | Zustand selector/equality/scope-cleanup/context laws | 04 §5.2–5.4, 16 (RISK-18) |
| §9.1–9.4 | Hot-client import law, EstimateSheetContent decomp, bundle budgets, lazy-load | 13, 03 §4.4, **27** (SC-3 no-barrel) |
| §10.1–10.3 | RLS index-every-policy-column, hot-query law + EXPLAIN, RPC transactional+revision | 14 §1a/§3/§5, 22 |
| §11.1–11.3 | Content-shaped skeletons, URL-sync decision table, prefetch law (no 500-row) | 20 §2.4/§6a, 23 §5.1a |
| §12.1–12.3 | Shared-primitive, narrow-prop, RenderRow-stability laws | 12 §9.1–9.3 |
| §13.1–13.3 | D3/Three islands, ExcelJS export, **estimate-row images (CLS/offscreen)** | 13 §4/§5, 09 §11A |
| §14.1–14.2 | Presence/cursor isolation, conflict (revision guard) | 23 §1, 11 §6 |
| §15.1–15.4 | CWV budgets, app budgets, test manifest, **static checks** | 03 §4.2b/§4.2c, 15, **27** (6 checks) |
| §16 | Phase 0–6 roadmap | 05 (Phases 0–10 + Track F) |
| **§17** | **10-question PR checklist** | **27** (was a GAP) |
| **§18** | **12-item Do-Not-Do list** | **27** (was a GAP) |
| §19 | Canonical code patterns | 04 §13 + 26 (use cache) |
| §20 | Priority ranking | 00, 05 (top-5 tracks consistent) |

## Gaps the cross-check found and closed
- **Structural (new docs):** Next-16 Cache Components rollout (§6) + React Compiler pilot (§7) — the Bible's own "Phase 5 pilot" the pack had dropped → **doc 26** + roadmap Track F + execution prompt. The standing enforceable artifacts (§2 Law-2/Law-3 gates, §15.4 static checks, §17 PR checklist, §18 Do-Not-Do) → **doc 27** + execution-preamble wiring.
- **Transcription (edits):** estimate-row images §13.3 (09 §11A + 13 §5), URL-sync table §11.2 (20 §6a), per-op DTO table §5.4 (10 §5.1), tree micro-budgets §3.7 (03 §4.2a), CWV exact thresholds §15.1, app-budget reconciliation §15.2 (cold-editor: Bible's p75≤1.5s is the binding ceiling, 500ms an internal stretch; tree-expand adopted Bible's 16/50ms), test manifest §15.3 (15), query EXPLAIN law §10.2 (14), index-every-policy-column §10.1, scoped-store cleanup §8.3, atomic-selector law §8.1, search algo §3.5, EstimateSheetTree split §3.8, sheet pipeline/keystroke-local/interaction-target laws §4.1/§4.3/§4.4, first-paint-must-not-wait list §4.5, no-barrel rule §9.1, RenderRow law §12.3, prefetch-500-row prohibition §11.3, §19 canonical snippets.

New IDs from this pass: docs 26/27; RISK-23 (Cache Components stale/cross-tenant), RISK-24 (compiler bailout); D-021 (Cache Components rollout), D-022 (Compiler pilot), D-023 (guardrails+checklist); Q-36 (enable cacheComponents), Q-37 (enable reactCompiler). Plus earlier Q-30 (payload)/Q-34 (memory)/Q-35 (Tree Escape a11y).

Pack now: 28 files (00–27), ~9k lines. Planning-only; no `src/**` changes.
