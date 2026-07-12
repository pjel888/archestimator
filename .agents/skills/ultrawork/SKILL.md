---
name: ultrawork
description: "[OMX] Parallel execution engine for high-throughput task completion"
---

<Purpose>
Ultrawork is a parallel execution engine for high-throughput task completion. It is a component, not a standalone persistence or verification mode: it provides parallelism, context discipline, and smart delegation guidance, but not durable goal tracking, Team's tmux worker lifecycle, Ralph's legacy persistence loop, architect sign-off, or long-running completion guarantees.
</Purpose>

<Use_When>
- Multiple independent tasks can run simultaneously
- User explicitly invokes `$ultrawork`/`ulw` or explicitly wants parallel execution
- Task benefits from concurrent execution plus lightweight evidence before wrap-up
- You need a direct-tool lane plus optional background evidence lanes without entering Team or a durable goal workflow
</Use_When>

<Do_Not_Use_When>
- Task needs durable goal tracking, ledger checkpoints, or resume across stories -- use `ultragoal` instead
- Task needs coordinated tmux workers, shared task state, mailbox/dispatch coordination, or long-running parallel execution -- use `team` instead
- Task requires adaptive hands-off delivery across several justified phases -- use `autopilot` instead
- Task intentionally requires the legacy persistent single-owner completion/verification loop -- use `ralph` explicitly; do not present it as the default durable path
- There is only one sequential task with no parallelism opportunity -- execute directly, use `ultragoal` for durable tracking, or delegate to a single `executor`
- The request is still in plan-consensus mode -- keep planning artifacts in `ralplan` until execution is explicitly authorized
</Do_Not_Use_When>

<Why_This_Exists>
Sequential task execution wastes time when tasks are independent. Ultrawork keeps the execution branch fast while tightening the protocol: gather enough context first, define pass/fail acceptance criteria before editing, decide deliberately between local execution and delegation, and finish with evidence rather than vibes.
</Why_This_Exists>

<Execution_Policy>
- Gather enough context before implementation. Start with the task intent, desired outcome, constraints, likely touchpoints, and any uncertainty that would change the execution path.
- Set an explicit token/context/tool/lane/artifact budget. Explore the direct and evidence-backed transitive blast radius, then stop; do not model hypothetical systems or future features.
- If uncertainty is still material after a quick repo read, do a focused evidence pass first instead of immediately editing.
- Define pass/fail acceptance criteria before launching execution lanes. Include the cheapest decisive non-test command or artifact that will prove success.
- Prefer direct tool work when the task is small, coupled, or blocked on immediate local context. Delegate only when the work is independent enough to benefit from parallel execution.
- When useful, run a direct-tool lane and one or more background evidence lanes at the same time. Evidence lanes can cover docs, static contracts, or bounded repo analysis. Test/QA/build/browser lanes require explicit current-task user authorization.
- When multiple useful lanes are selected, launch independent calls concurrently; do not manufacture lanes to fill capacity.
- For Codex native subagents, always set an installed `agent_type`; inherit the current model unless a concrete task requirement justifies an override.
- Read `docs/shared/agent-tiers.md` only when delegation is actually useful.
- Delegate `researcher` only when current official external evidence materially affects correctness; do not auto-research settled or repo-local questions.
- Use background execution for authorized long-running operations over ~30 seconds.
- Run quick commands (git status, file reads, simple checks) in the foreground.
- Apply the shared workflow guidance pattern: outcome-first framing, concise visible updates for speculative/blocked lanes, local overrides for the active workflow branch, evidence-backed validation, explicit stop rules, and continuation of clear safe execution branches instead of restarting or re-asking.
- If the user says `continue`, continue the active workflow branch rather than restarting discovery or re-asking settled questions.
</Execution_Policy>

<Steps>
1. **Choose the lightest lane**: Stay direct unless delegation materially improves throughput; load `docs/shared/agent-tiers.md` only when selecting a delegate.
2. **Context + certainty check**:
   - State the task intent in one sentence.
   - List the constraints and unknowns that could invalidate a quick fix.
   - If confidence is low, explore first and narrow the task before editing.
3. **Define acceptance criteria before execution**:
   - What must be true at the end?
   - Which narrow non-test command or artifact proves it?
   - Did the user explicitly authorize any test, build gate, browser, screenshot, or manual QA surface?
4. **Classify the work by dependency shape**:
   - Independent tasks -> parallel lanes.
   - Shared-file or prerequisite-heavy tasks -> local execution or staged lanes.
5. **Choose self vs delegate deliberately**:
   - Work locally when the next step depends on immediate repo context, shared files, or tight iteration.
   - Delegate when the task slice is bounded, independent, and materially improves throughput.
6. **Run execution lanes**:
   - Direct-tool lane for immediate implementation or verification work.
   - Background evidence lanes for docs, static contracts, or repo analysis; tests only when explicitly authorized.
7. **Run dependent tasks sequentially**: Wait for prerequisites before launching dependent work.
8. **Close with lightweight evidence**:
   - The selected narrow proof passes.
   - Authorized tests/build/browser/manual QA pass only when the user requested them.
   - No new errors introduced.
</Steps>

<Tool_Usage>
- Use LOW-tier delegation for simple lookups and bounded evidence gathering.
- Use STANDARD-tier delegation for standard implementation and regression work.
- Use THOROUGH-tier delegation for complex analysis, architectural review, or risky multi-file changes.
- Prefer a direct-tool lane when the immediate next step is blocked on local context.
- Prefer background evidence lanes when you can learn something useful in parallel with implementation.
- Use background execution for long authorized operations; do not add installs, builds, or tests by default.
- Use foreground execution for quick status checks and file operations.
</Tool_Usage>

## State Management

Use the CLI-first state surface (`omx state ... --json`) for ultrawork lifecycle state. If explicit MCP compatibility tools are already available, equivalent `omx_state` calls are optional compatibility, not the default.

- **On start**:
  `omx state write --input '{"mode":"ultrawork","active":true,"reinforcement_count":1,"started_at":"<now>"}' --json`
- **On each reinforcement/loop step**:
  `omx state write --input '{"mode":"ultrawork","reinforcement_count":<current>}' --json`
- **On completion**:
  `omx state write --input '{"mode":"ultrawork","active":false}' --json`
- **On cancellation/cleanup**:
  run `$cancel` (which should call `omx state clear --input '{"mode":"ultrawork"}' --json`)

<Examples>
<Good>
Two-track execution with acceptance criteria up front:
```
Acceptance criteria:
- `git diff --check` passes
- the adapter resolver reports the expected workflow contract

Direct-tool lane:
- update `skills/ultrawork/SKILL.md`

Background evidence lane:
- inspect the adapter and keyword registry for contradictory routing
```
Why good: Context is grounded first, acceptance criteria are explicit, and the direct-tool lane runs alongside a bounded evidence lane.
</Good>

<Good>
Correct use of self-vs-delegate judgment:
```
Shared-file edit in progress across `src/scripts/codex-native-hook.ts` and its test -> keep implementation local.
Independent contract mapping for keyword-detector coverage -> delegate to an explore lane.
```
Why good: Shared-file work stays local; independent evidence work fans out.
</Good>

<Bad>
Parallelizing before the task is grounded:
```
use /prompts:executor for this scoped task
use /prompts:test-engineer for this scoped task
```
Why bad: No context snapshot, no pass/fail target, and delegation starts before the work is shaped.
</Bad>

<Bad>
Claiming success without evidence:
```
Made the changes. Ultrawork should be updated now.
```
Why bad: No verification output or acceptance evidence. Manual QA is a separate opt-in surface and is not implied by user visibility.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- When ultrawork is invoked directly, apply lightweight non-test verification by default. Tests, builds used as gates, browser automation, screenshots, and manual QA run only with explicit current-task user authorization.
- Ultrawork does not own persistence, durable ledgers, architect verification, deslop, full QA, or the full verified-completion promise. Do not claim those guarantees from direct ultrawork alone.
- Escalate to `ultragoal` when the work needs durable goal state, story checkpoints, or resume across implementation steps.
- Escalate to `team` when the work needs coordinated tmux workers, shared task state, or durable multi-worker lifecycle control.
- Escalate to explicitly requested `ralph` only for the supported legacy single-owner persistence/verification fallback.
- Ralph owns persistence, architect verification, deslop, and the full verified-completion promise only when explicitly selected as the supported legacy fallback; direct ultrawork does not own those guarantees.
- If a task fails repeatedly across retries, report the issue rather than retrying indefinitely.
- Escalate to the user when tasks have unclear dependencies, conflicting requirements, or a materially branching acceptance target.
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Task intent and constraints were grounded before editing
- [ ] Pass/fail acceptance criteria were stated before execution
- [ ] Parallel lanes were used only for independent work
- [ ] The narrowest decisive evidence passes
- [ ] Test/build/browser/manual QA surfaces were used only when explicitly authorized
- [ ] No new errors introduced
- [ ] Completion claim stays inside ultrawork's lightweight-verification boundary
</Final_Checklist>

<Advanced>
## Relationship to Other Modes

```
ultrawork (this skill)
 \-- provides: in-session parallel execution discipline + lightweight evidence

ultragoal (durable goal execution)
 \-- owns: goal ledger, checkpoints, resume across stories, final gate discipline
 \-- may use: team for parallel lanes when a story benefits from coordinated workers

team (tmux coordinated execution)
 \-- owns: worker panes, shared task state, mailbox/dispatch, lifecycle control
 \-- can return: checkpoint-ready evidence to an Ultragoal leader

autopilot (adaptive autonomous router)
 \-- selects only phases justified by ambiguity, durability, risk, and explicit evidence authority
 \-- may use: ultrawork/team only when independent lanes materially improve delivery

ralph (supported legacy explicit fallback)
 \-- owns: single-owner persistence loop + architect verification when intentionally selected

ecomode (deprecated compatibility-only)
 \-- do not route users there from ultrawork; it is not the current model-selection path
```

Ultrawork is the parallelism and execution-discipline layer. Ultragoal is available when durable goal/ledger state is actually needed. Team is the coordinated tmux parallel runtime. Autopilot is an adaptive router, not a mandatory phase chain: it skips interview, planning, durable goals, review, and UltraQA when they do not materially improve the requested outcome or lack authorization. Ralph remains an explicit legacy fallback. Ecomode is deprecated compatibility-only.
</Advanced>
