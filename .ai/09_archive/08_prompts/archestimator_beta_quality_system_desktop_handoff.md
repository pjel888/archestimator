# ArchEstimator Beta Quality System: Desktop Handoff

Generated 2026-07-26 after repeated 8 GiB MacBook Pro M2 crashes.

## Target Result

Resume and complete the executable migration in
`.ai/08_prompts/archestimator_beta_quality_system_codex_prompt.md` on the 64 GiB
i9 workstation. Do not restart the migration from scratch. Continue from the
current repository state, repair every remaining fail-closed gate, collect fresh
Q2 evidence, and stop only when the original prompt's acceptance criteria are
reconciled against machine-readable proof.

The Mac goal thread `019f94d4-f15f-7931-8043-c3c41043d298` is paused. It is an
audit reference only; start a fresh desktop session.

## Desktop Launch Prompt

From the desktop repository root, submit:

```text
Read AGENTS.md and .ai/08_prompts/archestimator_beta_quality_system_desktop_handoff.md first. Then execute the existing goal in .ai/08_prompts/archestimator_beta_quality_system_codex_prompt.md from the current worktree. Do not redo completed migration work. Auto-select the 48+ GiB host tier, start with four native subagents and two heavy-command slots, and scale to six agents and four heavy-command slots only while the documented memory thresholds remain healthy. Preserve one writer per file, run GitNexus impact before symbol edits when the graph is available, and finish with fresh Q2 evidence and the original final-response contract. Do not commit, push, merge, deploy, or alter remote enforcement.
```

If OMX CLI runtime is available, the equivalent explicit workflow invocation is:

```text
$gitnexus $compound-engineering $autopilot $autonomous-loops $dispatching-parallel-agents '.ai/08_prompts/archestimator_beta_quality_system_codex_prompt.md'
```

## Current Repository State

- Branch: `main`
- `HEAD`: `1b99f72b6` (`fix: remove colons from filenames for Windows compatibility`)
- `origin/main`: the same commit when last checked on 2026-07-26
- Honest migration comparison base: `6b37e0e4ad007baa2454d7daaf93b21df4885897`
- Do not compare only against current `main`; the migration is already committed
  in several commits and a `main...HEAD` diff would hide it.
- Major migration commits already present:
  - `399b4e66` CI quality workflows
  - `29cd66d9` beta quality system
  - `2d774c43` contracts and documentation
  - `e8e91691` agent adapters
  - `63558dd8` UI, accessibility, and product repairs
  - `7b23b75c` quality-aligned tests

The Mac worktree is intentionally dirty. Preserve these files if the desktop
checkout contains them:

```text
AGENTS.md
.codex/config.toml
.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md
scripts/quality/aggregate-core.ts
scripts/quality/anti-bypass-core.ts
scripts/quality/traceability-core.ts
scripts/quality/workflow-security-core.ts
.ai/08_prompts/archestimator_beta_quality_system_desktop_handoff.md
```

The first three files contain the hardware-adaptive workflow contract. The four
quality-core files contain draft complexity decompositions made immediately
before this handoff. They are not yet validated. If they are absent from the
desktop checkout, redo those four refactors from current source rather than
assuming they were transferred.

## Why The Mac Crashed

This was resource exhaustion caused by the agent workflow, not an unexplained
application failure.

Authoritative local reports:

```text
/Library/Logs/DiagnosticReports/JetsamEvent-2026-07-26-113022.ips
/Library/Logs/DiagnosticReports/Retired/panic-full-2026-07-26-114340.0002.panic
```

Evidence:

- The panic was a watchdog timeout: `watchdogd` did not check in for 94 seconds.
- The panic recorded 34 swapfiles and `LOW` swap state.
- Six Codex-owned Node child lanes were active concurrently under Codex PID
  `22305`; the recorded child PIDs were `33625` through `33630`.
- Their reported resident-memory values ranged from about 18.9 GiB to 33.1 GiB.
- That six-child topology exactly matched the six native subagents running at the
  time of the repeated reboots.
- After recovery, one local GitNexus CLI impact attempt on the 8 GiB Mac caused
  free memory to fall from 45 percent to 13 percent and swapouts to jump from
  `26,472` to `2,683,716` pages. Dynamic swap briefly grew to about 37 GiB before
  the graph process disappeared. No test or build was started.
- The system recovered to 70 percent free after the process exited. This second
  event proves that even one local graph/index process is unsafe on this host.

Resulting rule: never launch native subagents or local GitNexus/codegraph
indexing/CLI impact analysis on the 8 GiB Mac. Use sequential source inspection,
an already-running lightweight MCP without rebuilding, or a desktop handoff.

## Hardware-Adaptive Orchestration

The durable contract now uses these ceilings:

| Physical memory | Native subagents | Concurrent heavy commands |
| --- | ---: | ---: |
| 8 GiB or less | 0 | 1 |
| 9-31 GiB | 2 | 1 |
| 32-47 GiB | 4 | 2 |
| 48 GiB or more | 6 | 4 |

Heavy commands include Node/Bun type checking, builds, coverage, mutation,
browser suites, Java services, and graph analysis. GPU VRAM is not system RAM and
does not increase these limits.

### 64 GiB Workstation

1. Start with four native subagents and two heavy-command slots.
2. Give every writer non-overlapping file ownership. Keep review agents read-only.
3. Take two memory samples after the lanes are active.
4. Scale to six agents and four heavy-command slots only with at least 24 GiB
   available and no swap growth.
5. Keep at least 16 GiB available while fully fanned out.
6. Run only one GitNexus index/impact job at a time. Do not overlap it with
   mutation testing or a production build.
7. Immediately reduce concurrency if available memory falls below 16 GiB, swap
   grows continuously, or any lane exceeds its expected budget.

Recommended initial lanes after preflight:

- lead/integrator: owns plan, shared-worktree safety, and final evidence;
- executor A: remaining low-complexity quality helpers;
- executor B: `diff-coverage-core.ts` decomposition;
- executor C: `report-core.ts` decomposition;
- quality engineer: baseline design, inventory, and test evidence, read-only until
  assigned non-overlapping test/config files;
- reviewer/security lane: read-only review after the first integration barrier.

Do not have all six lanes run full suites simultaneously. Reserve heavy slots for
the current barrier and keep other lanes on source/review work.

### 8 GiB MacBook Pro

The Mac remains a supported coordination and bounded-development host:

- one lead, zero native subagents;
- sequential specialist passes in the same context;
- one targeted command at a time;
- no local graph/index command;
- no overlapping type-check, build, coverage, mutation, browser, or full suite;
- deterministic serial shards with merged reports when local proof is necessary;
- start heavy work only above 40 percent free memory with stable swapouts;
- stop below 25 percent free or on any swapout growth, then require three healthy
  cooldown samples;
- hand off full Q2/Q3 gates to the workstation rather than weakening proof.

## Verified Work Already Completed

The committed migration already contains the canonical policy, adapters, quality
scripts, CI definitions, test infrastructure, critical tests, and documentation.
Do not replace that system wholesale.

The new host-safety contract was validated on the Mac before this handoff:

| Command | Result |
| --- | --- |
| `git diff --check` | PASS before the draft quality refactors |
| `bun run validate:agents` | PASS, 395 active adapters |
| `bun run validate:workflow-simulations` | PASS, 10/10 simulations |

Rerun those commands on the desktop after reading the current diff because this
handoff extends the resource policy.

## Current Unvalidated Draft

Draft decompositions exist in:

```text
scripts/quality/aggregate-core.ts
scripts/quality/anti-bypass-core.ts
scripts/quality/traceability-core.ts
scripts/quality/workflow-security-core.ts
```

They aim to reduce these four functions below complexity 10 without changing
findings or ordering:

```text
aggregateJobs
compareThresholds
validateTraceability
scanWorkflow
```

They were not linted or tested because the GitNexus wrapper caused the second
memory-pressure event before validation began. Treat them as draft code. First
desktop checks:

```bash
git diff --check
bun x eslint scripts/quality/aggregate-core.ts scripts/quality/anti-bypass-core.ts scripts/quality/traceability-core.ts scripts/quality/workflow-security-core.ts
bun run test:component -- tests/vitest/quality/quality-core.test.ts
```

If a draft fails, repair it at the root. Do not discard the unrelated adaptive
workflow changes.

## Last Static Result

The last full artifact is `artifacts/quality/static.json` and is stale relative
to the four draft refactors. It reported `FAIL` with 25 findings:

- one changed-scope ESLint failure in
  `src/components/workshop/estimate-sheet/rows/row-table.tsx` from
  `react-hooks/incompatible-library` at `useVirtualizer`;
- 24 changed-function complexity failures above the maximum of 10.

The four draft refactors address four of those 24 complexity findings. The
remaining functions are:

```text
numericMetric
classifyFiles
parseLcov
parseAddedLines
hasExecutableContent
evaluateDiffCoverage
selectMutationTargets
summarizeMutationReport
validateOperationsPolicy
executeLocalCheck
validateManifest
validateReviews
normalizeSecuritySeverity
collectNpmAuditV2
evaluateBunAudit
severityValue
resultLocation
evaluateSarif
validateRecordShape
jobNameForCommand
```

For every existing symbol edit, run GitNexus upstream impact first on the desktop
and warn on `HIGH` or `CRITICAL`. If GitNexus remains unavailable, record the
degraded state and use current-source callers, focused tests, and the available
code-review graph. Before final completion, run the repository's change detector
or the documented degraded fallback.

For the TanStack virtualizer warning, preserve virtualization. Prefer a real
React Compiler integration fix. If the library intentionally cannot be compiled,
use only a narrow configuration exception tied to an explicit component opt-out;
do not add a broad rule disable or inline suppression.

After all static repairs, run:

```bash
bun scripts/quality/static.ts --base 6b37e0e4 --output artifacts/quality/static.json
```

Do not run the full static gate after every small refactor. Use targeted lint and
focused tests at each integration barrier, then one fresh full gate.

## Baseline And Q2 Work Still Required

These canonical files were absent at handoff:

```text
quality/baseline.json
quality/component-baseline.json
```

`quality/thresholds.json` still has a `PENDING` global ratchet. Q1-Q3 therefore
fail closed until the baseline is measured, independently reviewed, admitted,
and the ratchet is flipped to `ADMITTED` without hiding debt.

Desktop sequence after static is green:

1. Run raw full component measurement and inventory.
2. Produce deterministic machine-readable coverage and duration artifacts.
3. Obtain two independent baseline reviews.
4. Create the canonical baseline files and admit the global ratchet.
5. Validate the admission gate.
6. Run Q2 evidence, using bounded parallel groups only where artifact paths and
   file ownership cannot collide:
   - contracts, adapters, workflow simulations, anti-bypass, workflow security,
     and aggregate fixtures;
   - classifier and static;
   - unit coverage;
   - component full measurement and admission;
   - component critical;
   - property tests;
   - Workers coverage;
   - BDD smoke;
   - accessibility;
   - build;
   - Playwright smoke;
   - critical mutation;
   - security;
   - AI evaluations;
   - operations;
   - diff coverage;
   - traceability.
7. Run exact-candidate independent quality and security reviews.
8. Run `quality:verify`, manifest/report generation, and final change detection.
9. Audit all 20 original acceptance criteria before reporting status.

Dependent gates remain sequential. Parallelize independent preparation and
review, not commands that write the same artifact or consume the same test
environment.

## Authority And Stop Conditions

Authorized: local edits, dependencies, tests, builds, browser automation,
coverage, mutation, security scans, local Cloudflare tests, and quality evidence.

Not authorized: commit, push, merge, branch/worktree changes, deployment,
production mutation, paid services, secrets, or remote GitHub enforcement.

Use the original final response sections exactly:

```text
### Status
### What changed
### Risk model
### Evidence table
### Quality metrics
### Remote enforcement
### Remaining risk
```

Stop only on verified `PASS`, honest `QUALITY_BLOCKED` for genuinely unavailable
required proof after fallback attempts, or an explicit user cancellation. Never
call configured-but-unrun evidence passing.
