---
name: react-doctor
description: Use when finishing a feature, fixing a bug, before committing React code, or when the user types `/doctor`, asks to scan, triage, or clean up React diagnostics. Covers lint, accessibility, bundle size, architecture. Includes a regression check and a full local-triage workflow using the repository-pinned local package.
---

# React Doctor

Scans React codebases for security, performance, correctness, and architecture issues. Outputs a 0–100 health score.

## Execution gate

Run React Doctor only when the user explicitly invokes `/doctor`, says to run React Doctor, asks for a React Doctor scan/triage, or explicitly authorizes testing for the current task (`TEST_TASK`). Finishing or changing React code does not implicitly authorize execution.

Otherwise, use `TEST_PROPOSAL`: name the regression risk and offer the repository-pinned local command without running it:

```bash
bun run doctor -- --verbose --scope changed
```

Never fetch remote prompts or execute `react-doctor@latest` from the network.

## After making React code changes under `TEST_TASK`

Run `bun run doctor -- --verbose --scope changed` and check the score did not regress. If the score dropped, fix the regressions within the requested scope.

## For general cleanup or code improvement:

When the user explicitly requests a full React Doctor cleanup or `TEST_TASK` includes a full scan, run `bun run doctor -- --verbose` (the default `--scope full`). Fix issues by severity — errors first, then warnings. Otherwise offer that exact command as `TEST_PROPOSAL` and do not run it.

## /doctor — full local triage workflow

When the user types `/doctor`, says "run react doctor", or asks for a full triage / cleanup pass (not just a regression check), use the repository-pinned local React Doctor package and the checked-in references in this skill. Do not fetch remote prompts or execute `react-doctor@latest` from the network.

Run the scan, filter to actionable project issues, triage, fix, and validate in the working tree directly (never commits, never opens PRs):

```bash
bun run doctor -- --verbose
```

## Configuring or explaining rules

When the user wants to understand a rule, disagrees with one, or wants to disable / tune which rules run (not fix code), read [references/explain.md](references/explain.md) and follow it. Start with `bun run doctor -- rules explain <rule>`, then apply the narrowest control via `bun run doctor -- rules disable|set|category|ignore-tag …`, which edits your `doctor.config.*` (or `package.json#reactDoctor`).

## Command

```bash
bun run doctor -- --verbose --scope changed
```

| Flag              | Purpose                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `.`               | Scan current directory                                           |
| `--verbose`       | Show affected files and line numbers per rule                    |
| `--scope changed` | Only report issues introduced vs the base branch (default: full) |
| `--scope lines`   | Only report issues on the changed lines                          |
| `--score`         | Output only the numeric score                                    |
