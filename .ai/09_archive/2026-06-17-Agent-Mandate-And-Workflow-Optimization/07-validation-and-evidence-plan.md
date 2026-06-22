# 07 — Validation & Evidence Plan

Docs/governance task → docs-only proof boundary. No production code, package scripts, framework
config, migrations, or source tests were touched by this work, so `bun run validate`/`build` were
correctly NOT run (see "Skipped" below).

## Commands run

| Command | Exit | What it proves | What it does NOT prove |
|---|---:|---|---|
| `git status --short --branch` | 0 | Tree clean at session start; final change set = 8 governance files + this plan pack | Nothing about content correctness |
| `git diff --check` | 0 | No trailing whitespace / conflict markers in the diff | Nothing about semantics |
| `node -e` parse of `package.json` | 0 | Live stack: Next 16.2.6, React 19.2.6, TS ^6, Tailwind ^4.3, **supabase-js 2.106.2**, TanStack Query 5, Zustand 5, Vitest 4, Storybook 10.4.2 → CODEX.md "local-first" is stale | Runtime behavior |
| path-existence loop (14 refs) | 0 | Every file referenced by the new/edited docs exists (14/14 OK) | — |
| `grep` (local-first / self-diagnostic / `tools:"*"`) | — | Located/confirmed each drift claim with path:line | — |
| Workflow `wr1j107yo` (17 agents, audit→skeptic + claim verifiers) | completed | Adversarial breadth audit of every adapter surface; 4 lead claims confirmed, 1 refuted, 1 downgraded | Not a runtime/provider check |
| Adversarial diff review (independent agent) | PASS | Citation accuracy (AGENT_OPERATING_PROTOCOL.md:212 exact), no new contradiction, no overreach, GEMINI.md coherent, refs resolve, foot-gun closed (`grep` empty), `git diff --check` 0 | Injector-regeneration behavior (R1) |

## What each major check proved

- **Stack fact-check** → CODEX.md drift is real (P1) and now fixed; the `local-first` mentions in
  `.ai/10_state/*` are historical (refuted as drift) and correctly left alone.
- **Adversarial breadth audit** → `.codex/`, `.claude/`, payloads, and the gitnexus *skills* are
  clean; the absolutism lives only in the adapter *entrypoints*; CommandCode `taste`/sentinels are
  the real safety/authority drift.
- **Adversarial diff review** → the applied patches are accurate, calibrated, and regression-free;
  the foot-gun is closed; no blocking issues.

## Proof boundary

`local-only` (docs). No `provider-proven`, `browser`, or `manual` proof claimed or required — no
runtime artifact changed. Provider/Supabase, GitHub, Vercel, Notion: untouched.

## Skipped checks and residual risk

- **`bun run validate` / `bun run build`** — intentionally skipped: this change set is docs/adapter
  only. NOTE: the working tree also contains **unrelated concurrent Workshop-Dashboard edits**
  (`src/app/globals.css`, `src/app/layout.tsx`, `scripts/enforce-app-design-system.mjs`) that are
  NOT part of this task; running/claiming a build would falsely attribute their state to this work.
  Left untouched and unvalidated by this task — they belong to the dashboard work on this branch.
- **Injector neutralization (R1)** unverified — the proportional notes neutralize the *policy*
  effect, but the absolutist blocks may re-inject on next `gitnexus analyze` / `code-review-graph`
  run; the note explicitly subordinates them regardless. Residual: cosmetic re-bloat only.
- **Per-file CommandCode `tools:"*"` restriction (R2)** not applied — residual hardening gap, gated
  by the lead-assignment requirement now stated in `.commandcode/README.md`. Low risk.
