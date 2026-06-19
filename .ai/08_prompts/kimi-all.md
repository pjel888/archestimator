You are running inside the Archestimator repo:

  /Users/philiplewis/Documents/archestimator

  Run autonomously. Do not stop between tasks unless you hit a destructive, credential-gated, external-production, or
  genuinely ambiguous blocker. Use the repo AGENTS.md rules and the Kimi prompt-pack protocols.

  First, fix the completed task-02 paperwork inconsistency:

  /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/1st-Pass-Completed__02-one-published-publication-
  per-project

  Required task-02 fix:
  - Open REPORT.md.
  - If the header still says `Status: In progress — Kimi pass 1`, change it to `Status: Completed (local-prep only)`.
  - Do not change the proof boundary.
  - Do not claim provider SQL was run.
  - Run `git diff --check` after the edit.

  Then run an autonomous autopilot loop over prompts 03-09, one folder at a time, in this exact order:

  /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/03-shared-link-response-recipient-set-null
  /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/04-workspace-homebase-rls-proof
  /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/05-workspace-homebase-rpc-payload-guards
  /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/06-live-db-performance-evidence-workflow
  /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/07-t4-shared-link-db-hygiene
  /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/08-executable-schema-rls-proofs
  /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/09-project-charts-proof-hygiene

  Before starting the loop, read:
  - /Users/philiplewis/Documents/archestimator/AGENTS.md
  - /Users/philiplewis/Documents/archestimator/.ai/10_state/current-state.md FAST PATH block only
  - /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/COMMON_KIMI_OPERATING_PROTOCOL.md
  - /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/PASS_COMPLETION_PROTOCOL.md
  - /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/PROOF_BOUNDARIES.md
  - /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/COORDINATION_MATRIX.md
  - /Users/philiplewis/Documents/archestimator/.ai/08_prompts/kimi/QUALITY_GATE.md

  For each prompt folder:
  1. If the exact folder path no longer exists, locate the renamed folder matching `*__<base-folder-name>` and
  continue from the latest pass folder.
  2. Read that folder’s PROMPT.md, CHECKLIST.md, REPORT.md, EVIDENCE.md, PATCH_NOTES.md, PASS_STATUS.md, and
  PASS_HISTORY.md.
  3. Execute the task using this loop:
     DISCOVER -> PLAN -> EXECUTE -> VERIFY -> REPORT -> DECIDE -> MARK PASS.
  4. Make the smallest coherent code/doc/test/database-prep changes needed.
  5. Use targeted tests first. Also run `bun run type-check` and `git diff --check` unless the folder’s prompt gives
  a narrower validated command set with a clear reason.
  6. If a task touches shared behavior, add or update focused tests.
  7. If provider/Supabase proof or mutation is needed, stay inside Archestimator project `ebxxqidacheyapmmzavr` only.
  8. This prompt does NOT authorize provider-apply. Do not run live provider mutations unless a later user message
  explicitly includes `provider-apply` and confirms project `ebxxqidacheyapmmzavr`. For provider-required work
  without that authorization, complete local prep, migrations/tests/runbooks/proof scripts, and mark the proof
  boundary accurately as local-only or provider-read-only.
  9. Never claim live provider proof, production proof, GitHub proof, Vercel proof, browser proof, or manual proof
  unless you actually performed it and captured evidence.
  10. Update all required folder artifacts:
      - REPORT.md
      - EVIDENCE.md
      - CHECKLIST.md
      - PATCH_NOTES.md
      - PASS_STATUS.md
      - PASS_HISTORY.md
      - RUNBOOK.md when needed
  11. Before closing each folder, run a self-audit:
      - no stale `Status: In progress` line if the result is Completed
      - PASS_STATUS result matches REPORT result
      - proof boundary is accurate
      - claimed commands were actually run
      - residual risks are explicit
      - no unrelated user changes were reverted
  12. Rename the folder according to the pass protocol:
      - `<ordinal>-Pass-Completed__<base-folder-name>`
      - `<ordinal>-Pass-Blocked__<base-folder-name>`
      - `<ordinal>-Pass-Failed__<base-folder-name>`

  Autopilot behavior:
  - Continue automatically from 03 through 09.
  - If one folder blocks, write the blocker clearly, rename it as Blocked, then continue to the next independent
  folder.
  - If code review or verification finds a problem, fix it and rerun verification before marking Completed.
  - Do not stop after planning; implement and verify.
  - Stop only after all folders 03-09 are Completed or explicitly Blocked/Failed with evidence.

  Final output:
  - Provide a concise summary table for 02 cleanup and each folder 03-09.
  - Include result, proof boundary, changed files, verification commands, and remaining risks.
  - Call out any provider-live steps that remain future work because `provider-apply` was not authorized.