# Validation Matrix

**Last updated:** 2026-07-11

## User Test Authorization Gate (Supreme Rule)

This gate implements the **lean-on-testing** commitment of the Lean Engineering
Ethos in `AGENT_OPERATING_PROTOCOL.md`: go deep on analysis to prevent bugs, but
lean on implementation and lean on testing — never add, expand, or run tests to
feel thorough; that is over-testing.

**Do not create, expand, repair, or run any automated test, test suite,
build-as-test-gate, browser automation, or broad validation gate unless the
user has explicitly requested testing for the current task.** This is the
supreme rule. It overrides every other `test_requirement`, `TARGETED`,
`MVP-critical`, blast-radius, or "nearby tests exist" consideration in this
repo and in every adapter, payload, prompt, sentinel, or rule file that cites
this matrix.

Philip Lewis (the owner) is the only authority who authorizes test execution.
A critical risk, a high blast radius, a user-visible change, an existing test
file nearby, or an agent's own judgment that tests are warranted is **never**
sufficient to run tests. When the user has not explicitly requested tests:

- Use the cheapest decisive **non-test** evidence (source, diff, path/reference,
  static, type-check, lint, dry-run, narrow runtime check that is not the test
  suite).
- If you believe tests are genuinely warranted for a critical risk, do **not**
  run them. Record a **`TEST_PROPOSAL`** (the named risk + the exact test
  command you would run) in your report and await explicit user authorization.
- Completing all safe requested local work is never blocked by the absence of
  test authorization; treat an unrun test like any other unverified claim and
  report it as a residual risk.

`TEST_TASK` is the only decision that authorizes creating, expanding, or
running tests, and it requires an explicit user request for the current task.

No workflow name, plan-pack depth, risk label, reviewer recommendation, nearby
test, or "bug-free" aspiration changes this gate. Deep blast-radius analysis is
the prevention mechanism; it narrows the implementation and non-test evidence
instead of manufacturing more tests. Do not repeat equivalent checks at unit,
slice, package, and final levels merely to accumulate green receipts.

## Governing Rule

Verification is mandatory; tests are user-gated. Before editing, record one
`test_requirement` for each affected acceptance criterion:

| Decision | Use | Evidence floor |
|---|---|---|
| `NOT_REQUIRED` | Default for docs, config, routine source, copy, style, and bounded refactors | Cheapest decisive source/diff/path/reference/static/type/lint/dry-run evidence |
| `TARGETED` | A named critical invariant *would* benefit from a test, but only authorizes proposing it, never running it | Cheapest decisive non-test evidence + a `TEST_PROPOSAL` recorded for user approval |
| `BROADER` | A critical invariant that *would* benefit from a broader suite, but only authorizes proposing it, never running it | Cheapest decisive non-test evidence + a `TEST_PROPOSAL` for the narrowest relevant suite |
| `TEST_TASK` | The user explicitly requested testing/QA/coverage/reproduction/regression for this task | Tests specified by the task, no unrelated expansion |

Do not create or run tests merely because code changed, the diff spans files,
the behavior is user-visible, nearby tests exist, or a task is high blast
radius. A valid `NOT_REQUIRED` decision is not a validation gap. A critical
risk that cheaper evidence cannot prove does **not** authorize running tests on
your own — it authorizes a `TEST_PROPOSAL` only. The previous
`CHEAPEST_DECISIVE_EXISTING_TEST` exception is withdrawn: even one existing
focused test may not run without explicit user authorization.

Later edits invalidate only the non-test evidence they affect; rerun that
evidence, not the entire matrix. Stop when the affected claim is proven.

## Fast Selection

| Change/claim | Default decision | Selective evidence |
|---|---|---|
| Markdown, prompt, adapter, static config | `NOT_REQUIRED` | `git diff --check`, path/reference checks, affected deterministic validator |
| Routine source or local refactor | `NOT_REQUIRED` | focused source/diff/type/LSP/lint/static evidence |
| Cosmetic UI | `NOT_REQUIRED` | static component/class/copy review; no browser automation |
| Browser-only interaction, routing, focus, responsive, or a11y claim | `NOT_REQUIRED` | static/DOM/manual reasoning; propose (`TEST_PROPOSAL`) a browser test only if static evidence cannot prove the claim and the user authorizes it |
| Explicit test/QA/coverage task requested by the user | `TEST_TASK` | requested test surface and the smallest supporting checks |
| Critical invariant cheaper evidence cannot prove (auth, D1, estimate/proposal correctness, release) | `NOT_REQUIRED` + `TEST_PROPOSAL` | cheapest decisive non-test evidence; record the proposed test for user approval, do not run it |
| Cross-boundary release or migration claim | `NOT_REQUIRED` + `TEST_PROPOSAL` | targeted non-test checks; propose the integrated release/migration gate for user approval |
| Hosted/provider/production claim | independent of test decision | exact provider/hosted evidence; local tests cannot prove it |

## Broad Gates

`bun run validate`, `bun run build`, full Vitest/Bun suites, Playwright,
Storybook, visual QA, provider drills, and manual regression loops are not
default completion gates. **Run one only when the user explicitly asks for
it.** The earlier exceptions (a release/cutover task naming it, a `BROADER`
decision, a changed mission-critical contract) no longer authorize running
these on the agent's own judgment — they authorize a `TEST_PROPOSAL` only.
The user may pre-authorize a named gate in writing for a specific task; absent
that, never run a broad gate.

Before browser automation, state the browser-only claim. If a source/static/
DOM check can prove it, use that faster surface. Before a broad suite, state why
the targeted check cannot prove the boundary.

## Current Deterministic Gates

Run only gates affected by the task:

```bash
bun run type-check                    # TypeScript contract when relevant
bun run lint                          # Touched linted source when relevant
bun run lint:design-system            # App design-token contract when relevant
bun run lint:design                   # Impeccable detector for applicable design work
bun run validate:error-handling       # Touched sensitive error-handling surfaces
bun run validate:planning-prompts     # Planning-suite contract changes
bun run validate:plan-pack -- <path>  # A plan-pack manifest or state change
bun run validate:agents               # Fast static agent payload/adapter/routing gate
bun run validate:agents:full          # Static gate plus OpenCode resolver when relevant
```

For Codex/OpenCode adapter changes, also run the installed resolver that owns
the changed surface:

```bash
codex debug prompt-input
bun run validate:agents:full
```

These are deterministic contract checks, not permission to run application
tests. If an unavailable resolver cannot prove the adapter, report that exact
gap without substituting a broad product suite.

## Cloudflare And Operations

Active data/provider work uses `wrangler.jsonc`, `./migrations/`, D1 `ARCH_DB`,
R2 `ARCH_UPLOADS_R2`, Durable Object `COLLAB_ROOMS`, Queue
`UPLOAD_JOBS_QUEUE`, Email `EMAIL`, and Images `IMAGES`. Never run or extend
legacy `supabase/migrations/` or mutate historical Supabase projects.

For local runtime/error diagnosis, start with:

```bash
bun run ops:agent-debug-snapshot
bun run logs:debug
bun run logs:tail -- --error --last 20
```

Use `bun run validate:error-handling` only when the touched claim is in its
sensitive surface. Production observability, incident, release, and support
claims require the exact hosted/provider artifacts described in
`.ai/00_system/ERROR_LOGGING_AND_AGENTIC_DEBUGGING_PROTOCOL.md`; do not preload
or execute that runbook for unrelated work.

For D1/data changes, a targeted migration/query/invariant check is normally the
first proof. A broad data suite or restore rehearsal requires the explicit data
integrity/release claim it proves. Local emulator output is not hosted provider
proof.

## Loop And Completion

For each loop iteration:

1. name the criterion and `test_requirement`;
2. run the smallest evidence-producing **non-test** check (unless the user
   authorized `TEST_TASK` for this task);
3. inspect its actual output;
4. record result, freshness, and invalidation trigger;
5. rerun only affected evidence after later edits.

Do not validate every unit and again every layer with identical commands. Use a
boundary checkpoint when integration changes the claim, then one fresh final
check for the evidence actually relied on.

Completion reporting names:

- selected test decision;
- non-test commands/procedures run with key results;
- any `TEST_PROPOSAL` recorded for user approval (named risk + exact command) and
  that it was not executed;
- tests intentionally not run because the user did not authorize them;
- exact provider/browser/manual proof boundary;
- residual risk or unavailable evidence.

Never describe unrun tests as passing, local checks as hosted proof, or a broad
suite as necessary without the critical claim it establishes.
