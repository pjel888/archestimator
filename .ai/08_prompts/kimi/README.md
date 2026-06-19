# Kimi Database Delegation Prompt Pack

Created: 2026-06-19

This folder contains nine `/goal`-ready prompts for low/mid-priority database follow-up work. Each subfolder maps to one review candidate and is designed so Kimi can run in a bounded autopilot loop while leaving its reports beside the prompt that launched the work.

## How to use

1. Read `DROP_IN_HANDOFF.md` and `COORDINATION_MATRIX.md`.
2. Open one task folder from the selected lane.
3. Paste that folder's `PROMPT.md` into Kimi with `/goal`.
4. Keep Kimi's write scope limited to the task prompt unless the prompt explicitly expands it.
5. Require Kimi to update the same folder's `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, and `PASS_HISTORY.md` before claiming completion.
6. If Kimi changes source, it must also update `PATCH_NOTES.md` in that same task folder.
7. If Kimi cannot complete safely, it must add or update `BLOCKERS.md` in that same task folder using `BLOCKERS_TEMPLATE.md` and stop without weakening the task.
8. After each pass, require Kimi to append `PASS_HISTORY.md` and rename the task folder with the pass-result prefix described in `PASS_COMPLETION_PROTOCOL.md`.

## Common protocol

Every task prompt inherits `COMMON_KIMI_OPERATING_PROTOCOL.md`.
Every task also inherits `PASS_COMPLETION_PROTOCOL.md`.
Every task uses proof-boundary labels from `PROOF_BOUNDARIES.md`.

Required loop:

`DISCOVER -> PLAN -> EXECUTE -> VERIFY -> REPORT -> DECIDE -> MARK PASS`

Kimi should continue the loop until one of these is true:

- The task is verified complete with current evidence.
- A safety boundary blocks further progress.
- The same blocker repeats after three loops and is documented in `BLOCKERS.md`.
- The task prompt's iteration cap is reached with a clear residual-risk report.

## Folder map

1. `01-workspace-homebase-rpc-fallback` - narrow the RPC fallback so real failures do not hide behind the app path.
2. `02-one-published-publication-per-project` - preflight and prepare the partial unique-index migration.
3. `03-shared-link-response-recipient-set-null` - preserve response decisions when recipients are hard-deleted.
4. `04-workspace-homebase-rls-proof` - make the local proof harness exercise RLS behavior.
5. `05-workspace-homebase-rpc-payload-guards` - add element-level guards for the RPC JSON payload.
6. `06-live-db-performance-evidence-workflow` - build the live/staging evidence workflow before index/RPC rewrites.
7. `07-t4-shared-link-db-hygiene` - split and review the pending T4 DB hygiene pack.
8. `08-executable-schema-rls-proofs` - promote brittle text-contract DB tests into executable proof scripts.
9. `09-project-charts-proof-hygiene` - clean up charts payload proof hygiene and taxonomy evidence.

## Coordination notes

- `COORDINATION_MATRIX.md` is the execution-order source of truth for overlapping tasks.
- Multiple agents may be working in this checkout. Kimi must inspect `git status --short` before editing and must not revert unrelated work.
- Reports belong inside the task folder, not scattered across `.ai/05_logs`, unless the prompt explicitly says a second artifact is required.
- Provider claims must be labeled precisely using `PROOF_BOUNDARIES.md`.
- Provider apply mode is off by default. It is allowed only when the launch `/goal` or latest coordinator message explicitly includes `provider-apply` and confirms project `ebxxqidacheyapmmzavr`.
- Do not mutate production, unrelated Supabase projects, paid provider settings, secrets, or deployment state.
- Folder prefixes are part of the handoff contract. Use `1st-Pass-Completed__<base-folder>`, `1st-Pass-Blocked__<base-folder>`, or `1st-Pass-Failed__<base-folder>` after pass 1, then replace that leading prefix on later passes rather than stacking prefixes.

## Lead double-check workflow

After Kimi returns a worked folder, inspect:

1. The folder prefix: pass number and result should match `PASS_STATUS.md`.
2. `PASS_STATUS.md`: should name the base folder, pass number, final status, proof boundary, and reports updated.
3. `PASS_HISTORY.md`: should append the latest pass without deleting older pass entries.
4. `REPORT.md`: should state complete, blocked, or failed with residual risk.
5. `EVIDENCE.md`: should contain command evidence or explicit skipped-check reasons.
6. `CHECKLIST.md`: should show checked acceptance items or blocked items, including pass-status and rename items.
7. `PATCH_NOTES.md`: should summarize source changes if any.
8. `BLOCKERS.md`: should exist if and only if Kimi stopped blocked.
