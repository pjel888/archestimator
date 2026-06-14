# 19 — Open Questions and Owner Gates

Decisions only the owner (Philip) can make. P0/P2/P6 do NOT depend on these; P1/P3/P4/P5 do.

## Product-scope owner gates (block P1)

| # | Question | Options | Default if unanswered | Affects |
|---|---|---|---|---|
| OG-1 | **AI surface (Ask-Flip + Package Builder):** keep-deferred (flag-gated, as today) or cut from the codebase? | (a) keep-deferred [recommended for now] · (b) isolate as post-MVP archive · (c) cut routes+`lib/ai`+UI+tests (KEEP audit tables) | keep-deferred | F25; many tests; `lib/ai/**`; `app/api/ai/**`; large surface |
| OG-2 | **Follow mode (T5.4, D-6):** cut now or keep staged? `isFollowModeEnabled`/`readTeamspaceFeatureFlags` have 0 callers today. | (a) cut helpers+flag · (b) keep staged | keep staged | F07/F26 |
| OG-3 | **Project page cursors (T5.3):** keep flag (capacity-gated) for post-launch, or remove? | (a) keep-deferred [recommended] · (b) remove | keep-deferred | F26; `ProjectCursorLayer` |
| OG-4 | **AEC classification module:** future feature or cut? (test-only, 0 runtime callsite) | (a) cut module+test · (b) keep as spec | keep (annotate spec-only) | F17 |
| OG-5 | **A/B `results-calculator.ts`:** is an analytics dashboard planned? If not, remove. | (a) remove · (b) keep test-only util | remove | F18 |
| OG-6 | **Story-only UI primitives (6):** keep as design-system surface or cut (with manifest+matrix update)? | (a) keep [recommended — cheap, design governance] · (b) cut | keep | F15 |
| OG-7 | **BulkActionToolbar:** approve consolidation to the `ui/` generic version (migrate 3 workshop callers)? | (a) consolidate · (b) leave both | consolidate (P3) | F28 |

## Verification questions (block P3/P0-F14)

| # | Question | Needed before |
|---|---|---|
| VQ-1 | Is any **client-side** `/api/share/[token]/events` send planned (e.g. scroll-depth)? If no, the route is safe to remove. | F14 |
| VQ-2 | Did `2026-06-11-templates-panel-ux` ("IMPLEMENTED, uncommitted") actually reach `main`? | F37 archive decision |
| VQ-3 | Is `RUN_SUPABASE_INTEGRATION` consumed by a test/CI config (not `src/`)? Confirm before any `.env.example` change. | F-env hygiene |
| VQ-4 | Is CI (`.github/workflows/ci.yml`) currently enabled or deferred? Reconcile README. | F33 |

## Database owner gates (block P4→P5)

| # | Gate | Requirement |
|---|---|---|
| DG-1 | Approve dropping `profile_role_hardening_audit` (forensic table) post-beta. | explicit owner gate + CSV dump + dry-run + readback (F29) |
| DG-2 | Approve dropping `resolve_app_role_for_email` RPC. | live `\df+`/`pg_depend` verification + dump + dry-run (F30) |
| DG-3 | Confirm closed-beta backup posture (PITR off; daily physical + manual logical) is acceptable as the rollback path for the two destructive drops. | owner confirm (per AGENTS.md cost posture) |

## Items explicitly NOT owner-gated (proceed in P0/P2/P6)
All `DELETE_NOW`/`DELETE_AFTER_LOCAL_PROOF` code/asset/dep/doc items (F01–F06, F08–F14, F20–F24, F27 component, F33–F39). The standing pre-launch DB authorization does NOT auto-approve destructive drops — those still need DG-1/DG-2.

## Out-of-scope flags (recorded, not addressed here)
- Two owner-accepted Codex Security **git-history** exposure findings — history purge is a separate destructive operation; code-tree cleanup does not resolve them.
- CSP `unsafe-inline`/`unsafe-eval` removal (tracked hardening in `next.config.ts` comment).
- The 2 pre-existing `test:dom` failures + lint debt — fix-forward (CLEAN-F40), not cleanup.
