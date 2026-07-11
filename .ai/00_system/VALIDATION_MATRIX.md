# Validation Matrix

**Last updated:** 2026-07-11

## Governing Rule

Verification is mandatory; tests are conditional. Before editing, record one
`test_requirement` for each affected acceptance criterion:

| Decision | Use | Evidence floor |
|---|---|---|
| `NOT_REQUIRED` | Default for docs, config, routine source, copy, style, and bounded refactors | Cheapest decisive source/diff/path/reference/static/type/lint/dry-run evidence |
| `TARGETED` | A named MVP-critical invariant cannot be proved more cheaply | Smallest decisive automated test |
| `BROADER` | Targeted evidence cannot cover an integrated critical boundary | Narrowest relevant suite/build/integration surface |
| `TEST_TASK` | Testing, QA, coverage, reproduction, or regression proof is the requested output | Tests specified by the task, no unrelated expansion |

Do not create or run tests merely because code changed, the diff spans files,
the behavior is user-visible, nearby tests exist, or a task is high blast
radius. A valid `NOT_REQUIRED` decision is not a validation gap.

Tests are justified by an explicit testing request or one of these
MVP-critical risks when cheaper evidence is insufficient:

- auth/authz, sessions, secrets, tenant isolation, public links, or privacy;
- D1 migration/schema/data integrity, destructive writes, or recovery;
- estimate, price, total, cost, proposal, publication, or export correctness;
- first-user release, rollback, error handling, observability, or support path;
- concurrency or shared contracts whose failure can leak, corrupt, deny access,
  or materially misstate results;
- a severe recurring defect where regression proof is the requested result.

Use targeted tests first. Escalate to `BROADER` only when the integrated claim
cannot be established by targeted evidence. Later edits invalidate only the
evidence they affect; rerun that evidence, not the entire matrix.

## Fast Selection

| Change/claim | Default decision | Selective evidence |
|---|---|---|
| Markdown, prompt, adapter, static config | `NOT_REQUIRED` | `git diff --check`, path/reference checks, affected deterministic validator |
| Routine source or local refactor | `NOT_REQUIRED` | focused source/diff review; relevant type/LSP/lint/static check only when useful |
| Cosmetic UI | `NOT_REQUIRED` | static component/class/copy review; no browser automation |
| Browser-only interaction, routing, focus, responsive, or a11y claim | `NOT_REQUIRED` or `TARGETED` by criticality | narrow DOM/browser/manual proof only if static evidence cannot prove the claim |
| Explicit test/QA/coverage task | `TEST_TASK` | requested test surface and the smallest supporting checks |
| MVP-critical invariant above | `TARGETED` | smallest positive/negative test that proves the named invariant |
| Cross-boundary release or migration claim | `TARGETED` or `BROADER` | targeted checks, then only the integrated release/migration gate required |
| Hosted/provider/production claim | independent of test decision | exact provider/hosted evidence; local tests cannot prove it |

## Broad Gates

`bun run validate`, `bun run build`, full Vitest/Bun suites, Playwright,
Storybook, visual QA, provider drills, and manual regression loops are not
default completion gates. Run one only when:

1. the user explicitly asks for it;
2. a release/cutover task names it;
3. the selected `BROADER` decision states the integrated critical claim it
   proves; or
4. the command itself is the changed mission-critical contract.

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
bun run validate:agents               # Agent payload/adapter/routing changes
```

For Codex/OpenCode adapter changes, also run the installed resolver that owns
the changed surface:

```bash
codex debug prompt-input
opencode debug config
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
2. run the smallest evidence-producing check;
3. inspect its actual output;
4. record result, freshness, and invalidation trigger;
5. rerun only affected evidence after later edits.

Do not validate every unit and again every layer with identical commands. Use a
boundary checkpoint when integration changes the claim, then one fresh final
check for the evidence actually relied on.

Completion reporting names:

- selected test decision and trigger;
- commands/procedures run with key results;
- tests intentionally not run under `NOT_REQUIRED`;
- exact provider/browser/manual proof boundary;
- residual risk or unavailable evidence.

Never describe unrun tests as passing, local checks as hosted proof, or a broad
suite as necessary without the critical claim it establishes.
