# Loop Ledger

## Goal

R1 follow-up: stop the absolutist GitNexus / code-review-graph blocks from re-appearing as live
policy when the generators run. Make the canonical re-index path re-apply the proportional policy
automatically, with ZERO runtime impact on the concurrent Workshop-Dashboard agent.

## Scope

New `scripts/neutralize-graph-mandate.mjs` (idempotent post-processor); `package.json` script aliases
(`graph:reindex`, `graph:neutralize`); a one-line re-index note in the existing outside-fence
proportional notes in `AGENTS.md` + `CLAUDE.md`. This plan pack.

## Non-goals

No `.claude/settings.json` / `.codex/hooks.json` global hook (would alter the other agent's session).
No running of `gitnexus analyze` / `code-review-graph install` (would regenerate blocks mid-session).
No dependency changes. No touching the dashboard agent's files (`src/**`, `tests/**`, `scripts/enforce-*`,
`DESIGN.md`, `decisions.md`, `.impeccable/**`).

## Branch / Status

`feat/dashboard-content-uxui-improvement`; concurrent dashboard agent active in src/tests/scripts.
Prior governance work committed at `adad6f3f`.

## Source of Truth Read

`.gitnexus/run.cjs` (launcher only); `code-review-graph --help` (init=install writes the block, update
doesn't); `.gitignore` (`.gitnexus/` ignored → can't host the script there); committed proportional
blocks in AGENTS.md/CLAUDE.md/GEMINI.md; `package.json` (clean).

## Acceptance Criteria

- [x] Idempotent neutralizer exists (`scripts/neutralize-graph-mandate.mjs`); rewrites absolutist
      gitnexus + code-review-graph in-fence blocks to proportional; no-op when already proportional; exits 0.
- [x] Canonical re-index path `bun run graph:reindex` = `node .gitnexus/run.cjs analyze && node scripts/neutralize-graph-mandate.mjs`.
- [x] `bun run graph:neutralize` runs the post-processor standalone (for code-review-graph re-install).
- [x] Re-index guidance added to the durable outside-fence notes in AGENTS.md + CLAUDE.md.
- [x] Verified: no-op on current files (empty `git diff`); fixture had 2 absolutist markers → 0 after,
      3 proportional sections injected; re-run idempotent. Real injectors NOT run.
- [x] No global hook added; only `scripts/neutralize-graph-mandate.mjs` + `package.json` + AGENTS/CLAUDE
      notes touched; dashboard files untouched; `git diff --check` = 0.

## Validation Plan

`node scripts/neutralize-graph-mandate.mjs` on real files → expect "ok (proportional)" + empty
`git diff` for AGENTS/CLAUDE/GEMINI. Fixture test: inject absolutist block into a /tmp copy, run the
script against it, grep absolutist gone + proportional present. `git diff --check`. Do NOT run the
real injectors.

## Iteration Log

### Iteration 1 — Discover injection mechanism
- Hypothesis: a config/template disables injection.
- Action: read run.cjs; checked installs + configs; `code-review-graph --help`.
- Files changed: none.
- Evidence: run.cjs is a launcher; gitnexus is npx-fetched with no repo config/template; code-review-graph
  injects on init/install only; no config knob. So a post-processor + wrapper is the viable fix.
- Result: design chosen — neutralizer script + package.json wrapper + durable note; no global hook.
- Next decision: implement + verify.

### Iteration 2 — Implement + verify
- Hypothesis: an idempotent post-processor gated on absolutist markers is a no-op now and self-heals after regen.
- Action: wrote `scripts/neutralize-graph-mandate.mjs`; added `graph:reindex`/`graph:neutralize` to
  package.json; appended re-index notes to the AGENTS.md/CLAUDE.md outside-fence proportional notes.
- Files changed: `scripts/neutralize-graph-mandate.mjs` (new), `package.json`, `AGENTS.md`, `CLAUDE.md`,
  this ledger + `00`/`LOOP_LEDGER`.
- Evidence: real-file run = "ok (proportional)" ×3 + empty `git diff` (no-op); fixture run neutralized
  2 absolutist markers → 0, +3 proportional sections, re-run idempotent; package.json parses;
  `git diff --check`=0; AGENTS/CLAUDE diff = only the appended note sentences (no block rewrite).
- Result: R1 effectively neutralized — the canonical re-index path can no longer leave absolutist blocks live.
- Next decision: STOP — acceptance criteria proven.

## Stop Condition

Reached: all acceptance criteria proven (no-op + fixture neutralization + idempotency + no global hook +
clean diff), real injectors intentionally not run, dashboard files untouched.

## Proof Boundary

local-only — script behavior proven against the live files + a synthetic `/tmp` fixture; the real
generators (`gitnexus analyze`, `code-review-graph install`) were intentionally NOT run (would regenerate
blocks mid-session and disturb the concurrent agent).

## Remaining Risks

- The neutralizer only runs when invoked (`graph:reindex` / `graph:neutralize`); a raw `gitnexus analyze`
  or `code-review-graph install` outside the wrapper would re-inject absolutist text until the neutralizer
  is next run. The durable outside-fence proportional notes still govern in the meantime, and the docs
  direct re-indexing through the wrapper. (Deliberate trade-off vs a global editor hook, to avoid runtime
  impact on other agents — per the vigilance constraint.)
- Not verified against a real generator run (intentional). First real `bun run graph:reindex` should be
  eyeballed once.
- The neutralizer replaces the regenerated block with a lean proportional version (drops generated
  stats/Resources/CLI tables) — acceptable; those have no policy value.

## Follow-up Bugs / Plans

- Optional: if a global, automatic guarantee is later desired, add a PostToolUse hook running
  `graph:neutralize` — but only when concurrent-agent runtime impact is acceptable. No bug plans needed.
