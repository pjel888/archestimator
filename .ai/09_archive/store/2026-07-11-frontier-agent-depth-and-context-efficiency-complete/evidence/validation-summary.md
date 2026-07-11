# Validation Summary

**Scope:** local agent contracts, adapters, planning schema, deterministic
validators, and focused contract tests only.

## Measured Efficiency

| Surface | Before | After | Result |
|---|---:|---:|---:|
| Mandatory current-state startup read | 3,668 lines / about 266,849 bytes | 50 lines / 3,162 bytes | about 98.82% fewer bytes |
| Cursor always-loaded rules | 4 files / 18,420 bytes | 1 file / 4,824 bytes | 73.81% fewer bytes |
| Cursor hook scripts | 17 | 6 | 64.71% fewer scripts |
| Default agent validator median | prior audit 2.93 s with resolver | 229.6 ms static, five-run median | about 92.16% lower than audit baseline |
| Current fast vs full validator | n/a | 229.6 ms vs 2,853.4 ms median | 91.95% lower default latency |

The full append-only state history remains intact below the bounded marker. The
full OpenCode resolver remains available through `validate:agents:full`; the
optimization removes it only from the default local static gate.

## Quality And Depth Safeguards

- Codex uses native model context and compaction instead of stale manual caps.
- Native subagent depth is one; six threads is a ceiling, not a fan-out target.
- All 22 installed roles exactly match the canonical role matrix.
- Twenty roles use Sol. Explorer and researcher move from older Spark/mini
  defaults to Terra for bounded retrieval; output-critical writer remains
  Sol/high because representative lower-cost parity was not proven.
- The lead retains requirements, integration, verification, and final judgment.
- Final-output guidance preserves conclusion, evidence, material caveat, and
  next action before removing repetition.

No general model-output quality benchmark is claimed. The quality-preservation
claim is bounded to avoiding a model/effort downgrade on output-critical roles,
upgrading legacy role defaults, keeping strong lead verification, and retaining
all deterministic evidence gates.

## Fresh Validation

- `bun run supermemory:ensure`: PASS.
- Supermemory closeout documents `SeF2i4LdXz4Wt3mJBpmZb2`,
  `GkVqJMjrhm1rQeRycngtLJ`, and `XLZsDNJ4vLYwwsS82N1ery`: FAILED or absent
  from exact-ID search. This is retained as auxiliary degraded-memory evidence;
  canonical `.ai` state carries the durable update.
- Sanitized extraction diagnostic: OpenAI HTTP 429 `billing_not_active`.
- `node --check .cursor/hooks/before-shell-execution.js`: PASS.
- `node --check .cursor/hooks/before-tab-file-read.js`: PASS.
- `node --check scripts/lib/plan-pack-validator.mjs`: PASS.
- `node --check scripts/validate-ai-workflow-adapters.mjs`: PASS.
- `bun run validate:agents`: PASS.
- `bun run validate:agents:full`: PASS.
- `bun run validate:planning-prompts`: PASS, 10 documents / 10 gates / 34
  evaluation scenarios / valid semantic fixture.
- `bunx vitest run tests/vitest/agent-payload-contract.test.ts tests/vitest/cursor-hook-contract.test.ts tests/vitest/planning-prompt-suite-contract.test.ts tests/vitest/supermemory-memory-script.test.ts tests/vitest/supermemory-start-script.test.ts --maxWorkers=1`: PASS, 105/105.
- Final component totals: payload 8/8, Cursor 22/22, planning validator 49/49,
  Supermemory memory CLI 5/5, Supermemory launcher 21/21.
- `codex debug prompt-input 'Agent contract resolver smoke.'`: exit 0 with
  valid rendered prompt input.
- GPT-5.6 Terra ephemeral text-only smoke: exit 0 and exact `OK` response.
- Scoped `git diff --check`: PASS.

## Adversarial Cases Proved

- Git `--no-verify`, commit `-n`, clustered `-an`/`-anm`, path-neutral `env`,
  wrapper, nested shell, grouping, executable-substitution, and backtick forms
  block; push `-n`, quoted data, and message values do not false-positive.
- Direct/versioned Next, Node-to-Next, `run-script`, Yarn workspace, Corepack,
  redirection, grouping, nested shell, and executable-substitution foreground
  dev forms block; tmux, background groups, and background pipelines pass.
- Quoted data heredocs remain data. Unquoted heredoc command substitutions are
  inspected, while shell interpreters receiving programs from a heredoc,
  here-string, or pipeline fail closed.
- Cursor official `file_path` drives read warnings/blocks. Shell and Tab security
  hooks fail closed on missing or uninspectable input. Session startup reports
  degraded memory and continues from `.ai` when Supermemory is unavailable.
- The existing-test exception rejects vague critical rationale, more than one
  shared test/path per pack, fabricated/untracked identity, changed source,
  shell-composed commands, broad selectors, extra commands, mutating flags,
  exclusion/false-pass flags, unsupported flags, and scope-changing flags.
- Stale-model scanning rejects every hardcoded GPT-5 generation outside the
  current Sol/Terra allowlist instead of enumerating only prior generations.
- Git aliases fail closed when they use shell aliases, leading options,
  unknown/external terminals, composed inline/ambient definitions, unsafe
  config prefixes, or untrusted Git executables. Supported status aliases and
  background development forms retain paired allow coverage.
- Node, npm, and Bun development spellings added by adversarial review block in
  the foreground and remain allowed only through the established background or
  tmux boundary.
- Existing-test selectors accept only shell-inert exact paths matching
  `[A-Za-z0-9._/-]+`; expansion, glob, brace, bracket, and question-mark forms
  fail validation.
- Supermemory add success requires terminal document state followed by an
  exact returned-ID search hit; failed, timed-out, and unsearchable states exit
  nonzero. The caller records that result without blocking unrelated core work.
- Completion-role regressions prove auxiliary-only failures cannot justify
  `TECH_BLOCKED`, mixed core/aux risks stay core, malformed arrays report errors
  without throwing, accepted core requirements may retain their status while a
  linked unit is genuinely blocked, and `release_status: READY` remains strict
  across auxiliary release evidence.

## Evidence Boundary

No browser, Storybook, visual QA, application build, broad application suite,
hosted mutation, paid action, deployment, or production action was run. Those
checks cannot prove the changed local agent-contract claims more directly.
Sanitized provider diagnostics were run solely to isolate the external
Supermemory extraction failure; they do not prove provider or production
readiness.
