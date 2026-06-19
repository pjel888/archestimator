# Checklist: Workspace Homebase RPC Fallback

- [x] Read `AGENTS.md` and `.ai/10_state/current-state.md` FAST PATH.
- [x] Recorded starting `git status --short` in `REPORT.md`.
- [x] Identified expected rollout/schema-cache fallback errors.
- [x] Confirmed malformed payloads do not silently fallback.
- [x] Confirmed auth/RLS/tail-query unexpected failures do not silently fallback.
- [x] Added or updated targeted tests.
- [x] Ran `bun test tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`.
- [x] Ran `bun run type-check` or documented why it could not run.
- [x] Updated `REPORT.md`, `EVIDENCE.md`, and this checklist.
- [x] Added `PATCH_NOTES.md` if source files changed.
- [x] Updated `PASS_STATUS.md` with final result and proof boundary.
- [x] Appended this pass to `PASS_HISTORY.md` without rewriting older entries.
- [x] Renamed folder with pass-result prefix or documented safe-rename blocker in `BLOCKERS.md`.
