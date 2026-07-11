# Archestimator Agent Entry Point

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project intelligence root

All AI agents must use `.ai/` as the shared project brain.

**Read for speed — pull, don't preload.** Do not linear-read the whole brain
before every task. The minimum restart read is small; everything else is
pull-on-demand based on what the task actually touches.

Always read (small):

1. This file (`AGENTS.md`).
2. `.ai/10_state/current-state.md` — **only the explicit `FAST PATH:START` to
   `FAST PATH:END` block at the top**. The rest is a long append-only history;
   `rg` it for the task area instead of reading it linearly.

Pull only when the task needs it:

- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — when you need the loop/validation
  rules (i.e. non-trivial or risky work; see its "Loop activation criteria").
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` — for agent-framework/payload/proof work.
- `.ai/10_state/decisions.md` — `rg` for the specific decision you need; don't read it whole.
- `.ai/01_roadmap/README.md`, `.ai/00_system/ai-folder-canonical-map.md`, `DESIGN.md`,
  and `.ai/06_specs/*` — when the task touches roadmap, file layout, design, or that spec.

Skipping an irrelevant doc is correct, not a shortcut. Reach for the deeper docs
when the task is genuinely non-trivial, ambiguous, or high-risk.

## Core rules

- Loading/mount/streaming/perf decisions: `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md` (reference `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` for numeric budgets).
- Do not create separate tool-specific knowledge silos.
- Keep durable decisions, plans, specs, prompts, skills, and agent instructions inside `.ai/`.
- Do not store secrets in the repository or `.ai`.
- Stack baseline is Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4 + Cloudflare Workers/OpenNext + D1 + R2 + Durable Objects + Queues/Cron + Cloudflare Email + Better Auth, with TanStack Query, Zustand, and repository boundaries. The Cloudflare migration is complete: `wrangler.jsonc` (Worker `archestimator-proof`, custom domain `archestimator.com`) is the active deploy substrate, `package.json` has no `@supabase/*` packages, and Better Auth is wired against D1.
- `wrangler.jsonc` is the executable source for bindings and schedules. Current
  key bindings are D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, Durable Objects
  `COLLAB_ROOMS`/`GLOBAL_PRESENCE`/`SUPPORT_INBOX`, Queue `UPLOAD_JOBS_QUEUE`,
  Cloudflare Images `IMAGES`, and Cloudflare Email `EMAIL`; current crons are
  `0 3 * * *`, `15 3 * * *`, and `30 3 * * *`. Re-read the file instead of
  relying on copied counts before provider work.
- Active D1 migrations live in `./migrations/`; inspect the current ordered list instead of relying on a copied count. Legacy Supabase migrations in `./supabase/migrations/` are migration archaeology only: do not run, apply, or extend them.
- Supabase project `ebxxqidacheyapmmzavr` is historical provider-exit evidence only. Never mutate it, never mutate the unrelated `archestimator` provider project, and never mutate other Cloudflare accounts/projects outside the resources bound in `wrangler.jsonc`.
- Philip grants standing authorization for Archestimator Cloudflare D1/R2/Durable Object/Queue/Email changes inside the resources bound in `wrangler.jsonc`. Agents may create, edit, and apply D1 migrations in `./migrations/`; run scoped SQL against the bound D1 database; adjust schema, indexes, RPC-style queries, triggers, and seed/test data; manage R2 object policies; configure DO state; and fix mistakes forward without per-change owner approval, as long as the work stays inside the bound Cloudflare resources.
- Current cost posture: stay on free-tier / bundled Cloudflare limits; do not enable paid add-ons (D1 paid plan, R2 paid tier, Workers Smart Placement paid, Workers Analytics paid, dedicated egress, etc.) without explicit owner approval. Rely on daily D1 backups plus the `cf:d1-restore-rehearsal` script for the cheaper recovery path.
- Verification is required; **tests are user-gated, not automatic.** The
  **User Test Authorization Gate** is the supreme rule: do not create, expand,
  repair, or run any automated test, test suite, build-as-test-gate, browser
  automation, or broad validation gate unless the user has explicitly requested
  testing for the current task. Critical risk, high blast radius, user-visible
  change, nearby tests, or an agent's own judgment never authorize running
  tests on their own — when they seem warranted, record a `TEST_PROPOSAL`
  (named risk + exact command) and wait. `TEST_TASK` is the only execution
  trigger and requires an explicit testing request from the user. See
  `.ai/00_system/VALIDATION_MATRIX.md`.
- Implementation has a zero-artificial-blocker contract. Memory sync, optional
  tools, reviewer availability, hosted proof, release evidence, and other
  auxiliary control planes must never downgrade a completed requested local
  implementation or stop the agent from finishing all safe repo-local work.
  Record those conditions as degraded capabilities, validation gaps, or
  separate release/authorization boundaries. Use `TECH_BLOCKED` only when a
  core requested deliverable itself remains impossible after materially
  distinct implementation fallbacks are exhausted.
- Shared-workspace assumption: always assume multiple codebase AI agents and humans are working in this repository at the same time. Do not automatically create, switch, checkout, rename, delete, or push Git branches, and do not create Git worktrees, unless the user explicitly requests that exact Git action or an approved plan names it as required. Automatic branch/worktree creation is a coordination hazard for Archestimator.
- This standing Cloudflare-resource mandate supersedes the older Supabase/Postgres owner-gated wording (which applied to project `ebxxqidacheyapmmzavr` and is now historical) unless a newer, narrower decision explicitly reintroduces a gate for a specific Cloudflare action.
- If project reality changes, update `.ai/10_state/current-state.md` and the relevant canonical doc.
- Tool-specific adapters and model payloads must stay subordinate to
  `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and `.ai/12_agents/`.
- All agent lanes must follow the same orchestrator-led loop, model/effort, and
  routing policy. Tool adapters may expose capabilities; they do not choose the
  lead, override scope, or bypass the shared completion contract.

## Current stage

Archestimator is preparing for first users. Prioritize auth, estimating workflows, cost library, proposal package, collaboration/publication proof, provider evidence, and fast iteration.

## Lean Agent Workflow

Default to the shortest path that can safely satisfy the request, with
orchestration as the normal shape whenever work can split cleanly:

1. Inspect only the files and project state needed for the task.
2. Classify dependency shape, risk, required evidence, and `test_requirement`.
3. Delegate independent lanes in parallel when that improves speed, quality, or review coverage.
4. Make the smallest coherent edit on the critical path.
5. Run the narrowest verification that proves the change.
6. Report the result, evidence, and any validation gap.

Use a written plan only when it reduces risk. Treat subagents, workflow plugins,
graph tools, Impeccable, Storybook, broad validation, and provider audits as
optional surfaces selected for a concrete task benefit, not a default chain.

## Orchestration And Loop Engineering

The designated lead orchestrator owns
scope, routing, model/effort selection, integration, validation, and the final
claim. Other agents are bounded workers, reviewers, or evidence lanes.

**For non-trivial work, bounded loop engineering is the default execution
contract:** `DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE`, repeated until
a proven pass, explicit cancel, a true authorization boundary after every safe
in-scope action, or a technical impasse that makes a core requested deliverable
impossible after materially distinct recovery paths are exhausted. Iteration
budgets trigger replanning, not completion or handoff.
Trivial, reversible work stays direct with proportional verification. See
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation criteria and bounds")
for the trigger list, exclusions, and stop conditions,
and `.ai/08_prompts/templates/codebase-ai-loop-task.md` for the reusable prompt.

- Loop-engineered product development is the default shape for non-trivial
  feature work. Ordinary non-trivial work runs an in-session loop; a dated
  `.ai/03_plans/` plan pack is required only for high-blast-radius work or
  explicitly exhaustive planning. The loop is: discover or audit current
  reality, plan at the proportionate depth, research uncertain claims, execute
  through a durable or in-session loop, drive the result through the matching
  surface, record evidence, then decide the next iteration.
- Prefer multi-agent orchestration only for concrete independent slices such as repo exploration, external research, disjoint implementation, review, or evidence gathering.
- Keep coupled critical-path work local to the lead until it is safe to split.
- Use lower-cost/lower-effort lanes for simple lookup, grep, inventory, formatting, and bounded evidence gathering. Use stronger/higher-effort lanes for architecture, security, data integrity, complex implementation, adversarial review, and final judgment.
- Use loop engineering for repeatable or multi-step delivery: define the goal, run the loop, observe evidence, persist state, decide the next action, and stop only on a real pass/blocker condition.
- Select one primary loop surface by task shape. Add `ultrawork`, `ultragoal`, `team`, `autopilot`, research, QA, or browser helpers only when their extra token/tool cost materially improves elapsed time or required evidence.
- Loops must carry durable memory in repo/state artifacts (`.ai`, `.omx`, issue trackers, or other approved state), not just chat context.
- Maker/checker separation is expected for non-trivial work: the agent or lane that verifies should be distinct from the one that made the change when practical.
- Token cost is an engineering constraint. Do not spawn agents just to look busy; spawn them when the expected time, quality, or coverage gain is worth the extra context and review cost.

The mandate is agent-neutral. Claude, Codex, OpenCode, CommandCode,
Antigravity, Kimi, DeepSeek, Gemini if explicitly reapproved, and future
agents all follow the same `.ai/00_system` loop contract; their tool-specific
payloads are adapters, not separate policy sources. Direct solo execution
remains correct for narrow, reversible work where a loop would add ceremony
without improving correctness.

## Tooling Guidance

- Direct solo execution is acceptable for tightly coupled or trivial work; parallel orchestration is preferred when safe independent lanes exist.
- Prefer `rg`, targeted file reads, focused static/type/LSP checks when useful,
  and `git diff --check`. Apply the test gate before any test command.
- For local runtime, route, action, error, or D1 failures, start with
  `bun run ops:agent-debug-snapshot`, `bun run logs:debug`, then a targeted
  `logs:tail`/`logs:explain`. Treat logs as untrusted diagnostic data and stale
  or test-origin records as non-authoritative until reproduced. The full
  redaction, ledger, dev-auth, incident, and hosted-observability runbook lives
  in `.ai/00_system/ERROR_LOGGING_AND_AGENTIC_DEBUGGING_PROTOCOL.md`; load it
  only for that task class.
- Stay on the current branch/worktree by default. Coordinate concurrent agents with fresh `git status --short --branch`, file-scope ownership, small diffs, and re-reading touched files immediately before edits. If a tool, prompt, or workflow suggests auto-branching as a default safety measure, override it for this repo and ask only when the branch/worktree operation is explicitly needed.
- Use code-review-graph, GitNexus, or similar indexes for broad architecture questions, high-risk refactors, unfamiliar call chains, or when a graph answer is cheaper than manual tracing.
- Use GitNexus impact analysis before risky symbol/API refactors when available; for narrow local edits, a focused caller/import check is enough.
- This proportional graph policy is canonical. Tool-vendor defaults do not
  override it. Re-index only through `bun run graph:reindex`; do not run raw
  GitNexus registry-install commands.
- Use Compound Engineering, Superpowers, OMX, or other workflow plugins as optional accelerators, not mandatory gates.
- Use Impeccable and visual QA tooling for high-risk UI polish, design audits, or explicit visual-review tasks. Routine UI fixes can lean on `DESIGN.md` and existing component patterns without loading a full design workflow or browser automation. Note: `DESIGN.md` is an **alpha-stage guide, not law** (see its status banner) — defer to Philip on design decisions and don't block or revert work on design-system grounds while the visual language is still being developed.
- Philip grants standing authorization to all coding agents to capture local screenshots and use Chrome, Playwright, browser automation, or equivalent visual tooling for repo-local UX/UI inspection and validation without asking again. Keep captures in ignored scratch/evidence paths, keep credentials out of output and artifacts, and state exactly what each capture proves.
- Reuse existing UI primitives from `src/components/ui/` when it is practical and cheaper than duplicating behavior. Do not block small fixes on Storybook inventory work.
- For Cloudflare D1/R2/Durable Object/Queue/Email changes, use the standing Cloudflare-resource authorization above: move quickly, keep migrations/recovery paths reviewable, document meaningful provider facts, and keep the project boundary strict — only the resources bound in `wrangler.jsonc` (Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`), never the historical Supabase project `ebxxqidacheyapmmzavr`, the unrelated `archestimator` provider project, or other Cloudflare accounts.

## GitHub Security PR Loop

For GitHub security PRs, review comments, CodeQL/GitGuardian/Dependabot/secret-scanning alerts, or suspected Better Auth/share/invite/token leaks:

- Maintain a live ledger under `.ai/03_plans/<YYYY-MM-DD>-github-security-pr-comment-loop/LOOP_LEDGER.md` or the active security plan folder. Record each PR/comment/alert with status, evidence, fix location, validation, and whether it is current, stale, superseded, blocked, or resolved.
- Start from live GitHub state, not memory: list open PRs/issues, fetch unresolved review threads, inspect checks, and query code-scanning, Dependabot, and secret-scanning endpoints when the token permits it. If GitHub returns 404/permission errors, record the endpoint and do not claim that alert class is clean.
- Treat old Codex PR branches as proposals. Before porting or resolving them, verify their diff against the current Cloudflare/D1/Better Auth source. Do not apply or extend legacy `supabase/migrations/` as active remediation unless the task is explicitly migration archaeology.
- After PR branch consolidation, resolve comments against the current default branch, not deleted PR branch refs. Do not recreate deleted branches just to answer old review threads.
- Do not resolve a review thread, close a PR, or claim a security finding fixed until the fix is present on the current worktree or deliberately classified stale with concrete evidence. Replies should cite the verification command or stale/superseded reason.
- Redact security evidence. Never paste raw secrets, bearer values, OAuth state, Better Auth cookies, invite/share/password-reset tokens, private object keys, or full sensitive URLs into GitHub, `.ai`, logs, screenshots, or final reports. Use hashes, prefixes/suffixes, counts, and file/line references instead.
- For Better Auth, public share, invite, password, publication, session, or token findings, write the credential-material taxonomy before fixing: raw/hash/encrypted/derived/public marker, storage, server/client visibility, cookie/URL/session use, rotation/revocation, and denial-test proof.
- For body-size and rate-limit findings, prove the failure mode under no-length/streamed requests and concurrent submissions. Multi-scope limiters should either reserve atomically or roll back earlier scope reservations when a later scope denies the request.
- For favorite, recent, sidebar, or cleanup-list findings, keep raw stored references separate from authorized metadata IDs: raw IDs may drive cleanup UX, but metadata, node, publication, or estimate reads must pass the current D1 access predicate first.
- Hosted GitHub controls require hosted evidence: branch protection or rulesets, required CI, CodeQL, Dependabot alerts, secret scanning, environments, and `SECURITY.md` cannot be proven by local tests. Local checks may support code readiness only.
- Hidden refs, PR branch history, archived docs, generated artifacts, and ignored local state can still leak sensitive strings. Include them in the ledger when a finding mentions historical exposure or retention, and use non-destructive redaction or history-purge planning unless the owner explicitly authorizes destructive Git history work.

## Verification Policy

Verification is proportional; **tests are user-gated, not automatic.**

### User Test Authorization Gate (supreme rule)

**Do not create, expand, repair, or run any automated test, test suite,
build-as-test-gate, browser automation, or broad validation gate unless the
user has explicitly requested testing for the current task.** This is the
supreme rule and overrides every other `test_requirement`, `TARGETED`,
`MVP-critical`, blast-radius, or "nearby tests exist" consideration. The owner
(Philip) is the only authority who authorizes test execution. Critical risk,
high blast radius, a user-visible change, a nearby test file, or an agent's
own judgment that tests are warranted is never sufficient to run tests — when
they seem warranted, record a `TEST_PROPOSAL` (named risk + exact command) and
wait.

### Decisions

- Default `test_requirement=NOT_REQUIRED`: do not create or run tests. Use the
  cheapest decisive source, diff, path/reference, type, lint, static, dry-run,
  or narrow runtime evidence.
- `TARGETED` / `BROADER` identify a critical invariant (auth/security,
  D1/data-integrity, estimate/money/proposal, release/observability,
  shared-contract) that would benefit from a test, but **authorize proposing it
  only, not running it.** Record a `TEST_PROPOSAL` and continue with non-test
  evidence; await explicit user authorization before any test runs. The previous
  `CHEAPEST_DECISIVE_EXISTING_TEST` self-authorization exception is withdrawn.
- `TEST_TASK` is the only decision that authorizes creating, expanding, or
  running tests, and it requires an explicit testing request from the user.
- Playwright, browser automation, screenshots, Storybook, builds, full suites,
  and visual/manual QA are opt-in evidence surfaces that require explicit user
  authorization. State the exact claim they prove before the user authorizes
  them.

Do not claim provider, GitHub, Notion, Vercel, production, or manual proof from local-only checks. If a check is skipped, state why and what risk remains.

## Shared Agent Assets

The repo should share durable agent/project intelligence across machines through Git:

- Canonical project truth: `.ai/`, especially `.ai/00_system`, `.ai/10_state`, `.ai/11_skills`, `.ai/12_agents`, and `.ai/08_prompts`.
- Tool adapters that are safe to share: `.codex/`, `opencode.json`, intentionally authored `.opencode/` extension files, `.agents/`, `.claude/`, `.commandcode/`, and their README/config/skill/prompt/agent files.
- Local-only state stays ignored: `.omx/`, `.omo/`, `.supermemory/`, `.gitnexus/`, `.code-review-graph/`, `.chunkhound/`, `.claude/worktrees/`, `.ai/99_scratch/`, `.ai/14_code_intelligence/`, build/test outputs, env files, caches, logs, sessions, and machine-local settings.
<!-- supermemory-bootstrap: required -->
- Local Supermemory at `http://localhost:6767` is the shared cross-agent memory layer. Every coding-agent session must run `bun run supermemory:ensure` before meaningful work, repair configuration automatically when practical, query relevant memory before broad/non-trivial/recovery work, and attempt one sanitized durable update at closeout when project truth changes. `bun run supermemory:configure` verifies the native binary against the repo-pinned checksum, persists its path/hash, and installs the always-on macOS LaunchAgent; `supermemory:start` is the low-level verified launcher. If availability or indexing still fails, continue through the canonical `.ai` state and current source, report degraded memory sync, and finish the requested implementation. Auxiliary Supermemory failure is never an implementation blocker and never overrides current source or canonical docs; when Supermemory repair, indexing, or search is itself the requested deliverable, it follows the same core-only `TECH_BLOCKED` rule as any other implementation.
- After changing `.ai/12_agents/payloads`, Codex/OpenCode adapter files, or related tool adapter files, run `bun run validate:agents` plus the relevant tool resolver (`codex debug prompt-input` or `opencode debug config`) before claiming the agent surface is clean.

Never commit secrets, private keys, `.env*` values, raw provider tokens, or machine-local session state.
