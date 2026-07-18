# Plan 020: Consolidate the overlapping agent-instruction files behind `AGENTS.md`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- AGENTS.md CLAUDE.md CODEX.md GEMINI.md .cursorrules .windsurfrules scripts/validate-ai-workflow-adapters.mjs`
> If in-scope files changed since this plan was written, compare "Current
> state" against the live code; on a mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

The repo root carries **six** agent entry points: `AGENTS.md` (canonical, 205
lines), `CLAUDE.md` (63), `CODEX.md` (18), `GEMINI.md` (39), `.cursorrules`
(120, self-described "Legacy .cursorrules for back-compat"), and
`.windsurfrules` (38). `.cursor/rules/` adds 113 `.mdc` rule files — a second,
larger rule surface. Drift between them is real: `.cursorrules:1` says "Full
SOTA rules live in `.cursor/rules/*.mdc`" (explicitly legacy but still read by
Cursor pre-rule-resolution); `CLAUDE.md`, `CODEX.md`, `.cursorrules`, and
`.gemini/GEMINI.md` all carry a "read AGENTS.md" pointer but with different
surrounding policy text; `.codex/config.toml` and `.gemini/GEMINI.md` re-state
the "tests are user-gated" rule in different wording than `AGENTS.md`. Maintainers
must keep all of these in sync, and any drift becomes silently authoritative for
one harness but not others. This plan makes `AGENTS.md` the single source and
reduces every other top-level file to a short harness-specific stub.

## Current state

Files (verified):
- `AGENTS.md` — canonical, 205 lines. The source of truth.
- `CLAUDE.md` — 63 lines; reads AGENTS.md + harness-specific lane guidance.
- `CODEX.md` — 18 lines.
- `GEMINI.md` (repo-root; also `.gemini/GEMINI.md`) — 39 lines.
- `.cursorrules` — 120 lines; self-labels "Legacy" at line 1.
- `.windsurfrules` — 38 lines.
- `.cursor/rules/*.mdc` — 113 granular rule files (Cursor-specific; keep, but
  ensure they don't duplicate AGENTS.md policy).
- `scripts/validate-ai-workflow-adapters.mjs` — already wired to
  `validate:agents`; this plan extends it to enforce stub length / non-duplication.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Validate  | `bun run validate:agents`        | exit 0              |
| Tests     | `bun run verify`                 | all pass            |

## Scope

**In scope** (the only files you should modify):
- `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules` —
  reduce each to a short stub that defers to `AGENTS.md` + harness-specific
  overrides only.
- `scripts/validate-ai-workflow-adapters.mjs` — add a check that each top-level
  agent file stays under N lines and does not duplicate `AGENTS.md` section
  headings (configurable allowlist of harness-specific overrides).

**Out of scope**:
- `AGENTS.md` content — unchanged (it's the source of truth).
- `.cursor/rules/*.mdc` content — leave the granular Cursor rules in place; this
  plan only ensures they don't re-state top-level policy verbatim (the validator
  can warn, not block).
- `.codex/config.toml`, `.gemini/` config — harness runtime config, not policy
  text; leave.

## Git workflow

- Branch: `advisor/020-consolidate-agent-rules`.
- Commit message: `docs(ai): consolidate agent instruction files behind AGENTS.md`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Reduce each top-level agent file to a stub

For each of `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules`,
replace the body with a short (5-15 line) stub of the shape:

```markdown
# <Harness> Entry Point

This harness follows `AGENTS.md` as the single source of agent policy for this
repo. Read it first.

Harness-specific notes:
- <one or two bullets of genuinely harness-specific guidance, e.g. how this
  harness reads .cursor/rules/*.mdc, or a harness-specific speed guardrail. Keep
  ONLY what is harness-specific; do not re-state shared policy.>
```

Before rewriting each, read its current content and extract ONLY the
harness-specific guidance (the bits not already in `AGENTS.md`). Everything
else is deletion. Examples of what is NOT harness-specific (delete it, it's in
AGENTS.md): the shared-worktree safety rules, the user-test-authorization gate,
the stack/provider boundaries, the execution lanes.

For `.cursorrules`: the file already self-labels as legacy. After stubbing,
confirm Cursor still resolves rules via `.cursor/rules/*.mdc` (the stub should
point there for Cursor-specific granular rules).

**Verify**: `bun run validate:agents` → exit 0 (or report a pre-existing failure
for the user, don't fix unrelated issues).

### Step 2: Extend the validator to keep them stubs

Read `scripts/validate-ai-workflow-adapters.mjs`. Add a check that:
- Each top-level agent file (`CLAUDE.md`, `CODEX.md`, `GEMINI.md`, `.cursorrules`,
  `.windsurfrules`) is ≤ N lines (e.g. 25).
- Each contains a reference to `AGENTS.md`.
- (Optional, softer) warn if a file duplicates an `AGENTS.md` section heading
  verbatim (configurable allowlist).

Match the script's existing output/error style.

**Verify**: `bun run validate:agents` → exit 0 after the stubs land; the
validator fails if a stub is later re-expanded beyond N lines.

### Step 3: Run the gate

**Verify**: `bun run verify` → exit 0. (`validate:agents` is part of `validate`,
not `verify`; run `bun run validate:agents` separately to confirm.)

## Test plan

No new tests required (docs + validator). If `validate:agents` has its own test
fixture, confirm it still passes; if the new line-count check breaks an existing
fixture, update the fixture.

## Done criteria

- [ ] `bun run validate:agents` exits 0
- [ ] `bun run verify` exits 0
- [ ] Each of `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, `.cursorrules`,
      `.windsurfrules` is a ≤25-line stub referencing `AGENTS.md`
- [ ] `wc -l CLAUDE.md CODEX.md GEMINI.md .cursorrules .windsurfrules` → all ≤ 25
- [ ] The validator enforces the stub length + AGENTS.md reference
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- A harness genuinely requires more than ~25 lines of harness-specific guidance
  that can't live in `AGENTS.md` — report which one and why; raise the cap for
  that file specifically with a documented reason.
- `validate-ai-workflow-adapters.mjs` is structured such that the line-count
  check can't be added cleanly — report; fall back to manual stub discipline
  (still reduce the files, skip the validator extension).
- A harness ignores `AGENTS.md` and requires its own full policy file to function
  (e.g. Cursor can't follow AGENTS.md for some technical reason) — report; leave
  that one file fuller with a comment explaining why.

## Maintenance notes

- After this lands, `AGENTS.md` is the only place to update shared policy. Each
  harness file carries only what's unique to that harness.
- The validator keeps future drift from creeping back. Wire `validate:agents`
  into CI / pre-merge if not already.
- The `.cursor/rules/*.mdc` granular rules are still a large surface; a future
  plan could audit them for AGENTS.md duplication, but that's out of scope here.
- Reviewer: confirm (a) each stub defers to AGENTS.md, (b) no shared policy is
  re-stated, (c) the validator enforces the cap, (d) harness-specific guidance
  that was genuinely unique is preserved.
