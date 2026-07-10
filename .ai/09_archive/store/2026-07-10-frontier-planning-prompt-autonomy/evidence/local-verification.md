# Local Verification Receipt

Status: PASS
Source revision: `a9ba86c0ffa39a9dcb91625861edde9603d7869c`
Proof boundary: `local-only`

- `bun run validate:planning-prompts`: PASS; 10 documents, 10 gates,
  30 evaluation scenarios, 2,452 lines, semantic fixture valid.
- `bun run validate:plan-pack -- tests/fixtures/planning-prompt-suite/valid-plan-pack`:
  PASS.
- `bun run validate:plan-pack -- .ai/03_plans/2026-07-10-Frontier-Planning-Prompt-Autonomy`:
  PASS before terminal promotion.
- `bunx vitest run tests/vitest/planning-prompt-suite-contract.test.ts`: PASS;
  28 adversarial contract tests.
- Targeted ESLint for both validators, the CLI, and focused test: PASS.
- `bun run validate:agents`: PASS.
- `bun --bun run type-check`: PASS, including the repository Node-version
  preflight and `tsc --noEmit` under Bun's supported runtime.
- Targeted owned-scope whitespace and diff checks: PASS before terminal receipt
  edits.

This receipt does not claim provider, browser, hosted, production, manual, or
Supermemory proof. Supermemory was unavailable because
`SUPERMEMORY_SERVER_BIN` is not configured; source plus canonical `.ai` state
were used as the recorded fallback.

## Archive Integrity

- Pre-move destination collision check: PASS.
- Whole-folder move: PASS; 10 files at the destination and no active source copy.
- Destination plan-pack validation: PASS before lifecycle promotion.
- Archive path/ignore rule: PASS; the manifest is not ignored.
- Archive index: PASS; `.ai/03_plans/README.md` names the canonical destination.
- External inbound-reference audit: PASS; no external file points at the former
  active path. The historical pre-move validation command inside this receipt is
  evidence, not an inbound reference.
- Post-move manifest hash, whitespace, diff, and complete gate replay: PASS.
