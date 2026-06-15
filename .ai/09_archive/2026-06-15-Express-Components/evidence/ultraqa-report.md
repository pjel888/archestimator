---
title: Express Components UltraQA Report
type: evidence
status: complete-with-browser-auth-proof-gap
created: 2026-06-15
---

# Express Components UltraQA Report

This report adversarially checks the Express Components plan pack against the implementation branch `codex/express-components`.

## Scope

Required adversarial topics from Q56 / IMPLEMENTATION_GOAL:

- viewer bypass and direct server-action writes
- replace/move clobber after reload
- copy rekey collision
- no-realtime peer visibility
- stale revision recovery
- flag-off persisted render
- source-less renamed-row projection leak
- 300-500 row virtualization stress
- malformed/oversized text input
- retry after partial insert/promotion
- misleading success output / dirty worktree / hung command handling

## Findings

| Topic | Result | Evidence |
| --- | --- | --- |
| Viewer bypass / direct writes | Pass for local server-action tests and provider non-member probe. Insert/update/replace/delete deny before row mutation; direct provider insert as random non-member returns `Workspace access denied.` | `tests/vitest/estimate-sheet-actions-authz.test.ts`; `evidence/live-supabase-evidence.md` |
| Replace/move clobber after reload | Pass by blocking express replace/move paths before optimistic metadata/source-snapshot clobber; repository reload preserves express metadata for persisted rows. | `tests/vitest/estimate-sheet-cost-inputs.test.tsx`; `tests/vitest/workspace-repository-estimate-tree.test.ts` |
| Copy rekey collision | Pass for local static/action path and live provider trigger rollback proof: copied express metadata keeps provenance and receives a fresh `metadata.expressComponent.id`. | `tests/vitest/express-components.test.ts`; `evidence/live-supabase-evidence.md` |
| No-realtime peer visibility | Pass as an honesty gate, not realtime functionality. Source has no `postgres_changes` row subscription for `estimate_row_items`; docs explicitly state peers rely on manual/eventual refetch plus revision integrity. | `11-concurrency-and-permissions-spec.md`; static shipability test |
| Stale revision recovery | Partial. Existing mutation calls carry `expectedRowRevision`; save failure tests preserve local recovery behavior. A dedicated real two-client browser stale-revision proof remains blocked by missing authenticated browser session. | `tests/vitest/estimate-sheet-library-insert.test.tsx`; browser gap below |
| Flag-off persisted render | Pass locally: flag off reverts Add row to legacy blank behavior while persisted express rows remain readable through helper/classification fallback. | `tests/vitest/estimate-sheet-library-insert.test.tsx`; `tests/vitest/express-components.test.ts` |
| Source-less renamed-row projection leak | Pass locally and by provider shape evidence: source-less edited/manual rows are deliberately excluded from Project projection unless express/detached classification is explicit. | `tests/vitest/project-component-projection.test.ts`; `evidence/live-supabase-evidence.md` |
| 300-500 row virtualization stress | Pass as jsdom fallback proof: 500-row table virtualizes initially; focusing a mounted express editor disables virtualization, mounts all 500 rows, and keeps the active express row present. Authenticated browser stress remains blocked. | `tests/vitest/estimate-row-table-virtualization.test.tsx` |
| Malformed/oversized text input | Covered by inline editor unit paths for long description/name save and value preservation; browser/mobile keyboard proof remains blocked. | `tests/vitest/estimate-sheet-library-insert.test.tsx` |
| Retry after partial insert/promotion | Pass. Insert draft buffers edits, failed insert remains visible with retry/delete and retry reuses row id/correlation. Provider promotion retry is idempotent after partial success. | `tests/vitest/estimate-sheet-library-insert.test.tsx`; `evidence/live-supabase-evidence.md` |
| Misleading success / dirty worktree / hung command handling | Pass for current command loop: every green claim is backed by fresh command output or marked as gap; no provider/browser proof is claimed beyond captured evidence. Dirty worktree is expected implementation diff. | Implementation transcript; this report |

## Browser Proof Status

`vercel:agent-browser` skill was loaded, but `agent-browser` is not installed on PATH in this session. Playwright fallback was used.

Authenticated browser proof is blocked because this worktree has no local `.env*` service-role/dev-auth values and no `PLAYWRIGHT_STORAGE_STATE`; the protected estimate route redirects to login. Captured proof:

- JSON: `evidence/browser/2026-06-15-express-components-auth-gate.json`
- Screenshot: `evidence/browser/2026-06-15-express-components-auth-gate.png`
- Result: target estimate route redirects to `/login?next=...`, login heading and email/sign-in controls are visible, and no app crash/page error was observed.

Do not claim authenticated desktop/mobile/browser editing proof from this run. Current browser gap requires either a real authenticated storage state, dev-auth env (`ARCHESTIMATOR_DEV_AUTH_BYPASS=1` plus secret/email/service-role key), or an owner-session smoke. This is a release-proof gap, not evidence of an implementation failure in the local/provider-tested paths.

## Browser Release-Proof Follow-Up

1. Run authenticated browser smoke for: Add row, edit name/unit/cost/description, keyboard path, narrow/touch viewport, project Components tab, promotion cache refresh, and 300-500 row stress.
2. If realtime peer visibility becomes a product requirement, add a separate row-sync workstream; this report only proves the current no-realtime honesty contract.
3. Keep provider actions scoped to Supabase project `ebxxqidacheyapmmzavr`.
