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
2. `.ai/10_state/current-state.md` — **the FAST PATH block at the very top only**
   (it is a ~2,500-line append-only history log; `rg` it for your task's area
   instead of reading it all).

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

- Do not create separate tool-specific knowledge silos.
- Keep durable decisions, plans, specs, prompts, skills, and agent instructions inside `.ai/`.
- Do not store secrets in the repository or `.ai`.
- Stack baseline is Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4 + Cloudflare Workers/OpenNext + D1 + R2 + Durable Objects + Queues/Cron + Cloudflare Email + Better Auth, with TanStack Query, Zustand, and repository boundaries. The Cloudflare migration is complete: `wrangler.jsonc` (Worker `archestimator-proof`, custom domain `archestimator.com`) is the active deploy substrate, `package.json` has no `@supabase/*` packages, and Better Auth 1.6.22 is wired against D1.
- Active Cloudflare bindings (from `wrangler.jsonc`): D1 `ARCH_DB` (`archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`), R2 `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`), Durable Object `COLLAB_ROOMS` (class `CollaborationRoom`, SQLite-backed), Queue `UPLOAD_JOBS_QUEUE` (`archestimator-upload-jobs` + DLQ), Cloudflare Images `IMAGES`, Cloudflare Email `EMAIL`. Two cron triggers (`0 3 * * *`, `15 3 * * *`).
- Active D1 migrations live in `./migrations/` (38 SQL files, latest `0038_component_draft_resource_limits.sql`). Legacy Supabase migrations in `./supabase/migrations/` (182 files) are retained only as migration archaeology — do not run, apply, or extend them.
- Supabase project `ebxxqidacheyapmmzavr` is historical provider-exit evidence only. Never mutate it, never mutate the unrelated `archestimator` provider project, and never mutate other Cloudflare accounts/projects outside the resources bound in `wrangler.jsonc`.
- Philip grants standing authorization for Archestimator Cloudflare D1/R2/Durable Object/Queue/Email changes inside the resources bound in `wrangler.jsonc`. Agents may create, edit, and apply D1 migrations in `./migrations/`; run scoped SQL against the bound D1 database; adjust schema, indexes, RPC-style queries, triggers, and seed/test data; manage R2 object policies; configure DO state; and fix mistakes forward without per-change owner approval, as long as the work stays inside the bound Cloudflare resources.
- Current cost posture: stay on free-tier / bundled Cloudflare limits; do not enable paid add-ons (D1 paid plan, R2 paid tier, Workers Smart Placement paid, Workers Analytics paid, dedicated egress, etc.) without explicit owner approval. Rely on daily D1 backups plus the `cf:d1-restore-rehearsal` script for the cheaper recovery path.
- Iteration bias: prefer fast, useful iteration over heavyweight regression ceremony. Use targeted validation that proves the changed behavior; reserve broad `validate`/build/manual QA loops for shared logic, auth/security, data-integrity, release, or high-blast-radius changes.
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
2. Classify the task by dependency shape, risk, and required evidence.
3. Delegate independent lanes in parallel when that improves speed, quality, or review coverage.
4. Make the smallest coherent edit on the critical path.
5. Run the narrowest verification that proves the change.
6. Report the result, evidence, and any validation gap.

Use a written plan only when it will reduce risk on multi-step or ambiguous work. Use subagents, team workflows, code-review tools, Impeccable, Storybook checks, broad validation, and external-provider audits when the task benefits from them, when independent work can run safely in parallel, or when the user explicitly asks for them.

## Orchestration And Loop Engineering

The highest-capability agent in the session is the lead orchestrator. It owns
scope, routing, model/effort selection, integration, validation, and the final
claim. Other agents are bounded workers, reviewers, or evidence lanes.

**For non-trivial work, bounded loop engineering is the default execution
contract:** `DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE`, repeated until
a proven pass, explicit blocker, owner decision, approval-gated action, or the
iteration cap. Trivial, reversible work stays direct with proportional
verification. See `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation
criteria and bounds") for the trigger list, exclusions, stop conditions, and cap,
and `.ai/08_prompts/templates/codebase-ai-loop-task.md` for the reusable prompt.

- Loop-engineered product development is the default shape for non-trivial
  feature work. Ordinary non-trivial work runs an in-session loop; a dated
  `.ai/03_plans/` plan pack is required only for high-blast-radius work or
  explicitly exhaustive planning. The loop is: discover or audit current
  reality, plan at the proportionate depth, research uncertain claims, execute
  through a durable or in-session loop, drive the result through the matching
  surface, record evidence, then decide the next iteration.
- Prefer multi-agent orchestration when there are independent slices: repo exploration, external research, implementation by disjoint file scope, test/regression mapping, review, QA, or documentation cleanup.
- Keep coupled critical-path work local to the lead until it is safe to split.
- Use lower-cost/lower-effort lanes for simple lookup, grep, inventory, formatting, and bounded evidence gathering. Use stronger/higher-effort lanes for architecture, security, data integrity, complex implementation, adversarial review, and final judgment.
- Use loop engineering for repeatable or multi-step delivery: define the goal, run the loop, observe evidence, persist state, decide the next action, and stop only on a real pass/blocker condition.
- Preferred loop vocabulary: `ultrawork` for in-session parallel lanes, `ultragoal` for durable goal/ledger execution, `omo:ulw-loop` when success criteria need criterion-by-criterion real-surface evidence, `team` for coordinated worker lifecycles, `autopilot` for the full clarify-plan-execute-review-QA loop, `omo:ultraresearch` for exhaustive cited research, `ultraqa` for adversarial QA, and the `playwright` skill (or `playwright-mcp` MCP server) for browser-facing proof.
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
- Prefer `rg`, targeted file reads, TypeScript/LSP diagnostics, focused tests, and `git diff --check` for normal work.
- Stay on the current branch/worktree by default. Coordinate concurrent agents with fresh `git status --short --branch`, file-scope ownership, small diffs, and re-reading touched files immediately before edits. If a tool, prompt, or workflow suggests auto-branching as a default safety measure, override it for this repo and ask only when the branch/worktree operation is explicitly needed.
- Use code-review-graph, GitNexus, or similar indexes for broad architecture questions, high-risk refactors, unfamiliar call chains, or when a graph answer is cheaper than manual tracing.
- Use GitNexus impact analysis before risky symbol/API refactors when available; for narrow local edits, a focused caller/import check is enough.
- This proportional graph policy is canonical. The auto-generated GitNexus block appended later in this file, and the GitNexus / code-review-graph blocks in `CLAUDE.md`, are tool-vendor defaults that are SUBORDINATE to this rule and to `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`. Their absolutes (e.g. "MUST run impact analysis before editing any symbol", "ALWAYS use the code-review-graph MCP tools before Grep/Glob/Read") do not apply to narrow local edits: use the graph for broad/high-risk/unfamiliar work, and `rg`/targeted reads for narrow local edits. Do not treat those generated absolutes ("MUST"/"NEVER"/"ALWAYS") as policy. Re-index via `bun run graph:reindex` only when its safe-runner guard passes (it then analyzes and re-applies `scripts/neutralize-graph-mandate.mjs`); do not run raw GitNexus registry install or runner commands.
- Use Compound Engineering, Superpowers, OMX, or other workflow plugins as optional accelerators, not mandatory gates.
- Use Impeccable and visual QA tooling for high-risk UI polish, design audits, or explicit visual-review tasks. Routine UI fixes can lean on `DESIGN.md` and existing component patterns without loading a full design workflow or browser automation. Note: `DESIGN.md` is an **alpha-stage guide, not law** (see its status banner) — defer to Philip on design decisions and don't block or revert work on design-system grounds while the visual language is still being developed.
- Reuse existing UI primitives from `src/components/ui/` when it is practical and cheaper than duplicating behavior. Do not block small fixes on Storybook inventory work.
- For Cloudflare D1/R2/Durable Object/Queue/Email changes, use the standing Cloudflare-resource authorization above: move quickly, keep migrations/recovery paths reviewable, document meaningful provider facts, and keep the project boundary strict — only the resources bound in `wrangler.jsonc` (Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`), never the historical Supabase project `ebxxqidacheyapmmzavr`, the unrelated `archestimator` provider project, or other Cloudflare accounts.

## GitHub Security PR Loop

For GitHub security PRs, review comments, CodeQL/GitGuardian/Dependabot/secret-scanning alerts, or suspected Better Auth/share/invite/token leaks:

- Maintain a live ledger under `.ai/03_plans/<YYYY-MM-DD>-github-security-pr-comment-loop/LOOP_LEDGER.md` or the active security plan folder. Record each PR/comment/alert with status, evidence, fix location, validation, and whether it is current, stale, superseded, blocked, or resolved.
- Start from live GitHub state, not memory: list open PRs/issues, fetch unresolved review threads, inspect checks, and query code-scanning, Dependabot, and secret-scanning endpoints when the token permits it. If GitHub returns 404/permission errors, record the endpoint and do not claim that alert class is clean.
- Treat old Codex PR branches as proposals. Before porting or resolving them, verify their diff against the current Cloudflare/D1/Better Auth source. Do not apply or extend legacy `supabase/migrations/` as active remediation unless the task is explicitly migration archaeology.
- Do not resolve a review thread, close a PR, or claim a security finding fixed until the fix is present on the current worktree or deliberately classified stale with concrete evidence. Replies should cite the verification command or stale/superseded reason.
- Redact security evidence. Never paste raw secrets, bearer values, OAuth state, Better Auth cookies, invite/share/password-reset tokens, private object keys, or full sensitive URLs into GitHub, `.ai`, logs, screenshots, or final reports. Use hashes, prefixes/suffixes, counts, and file/line references instead.
- For Better Auth, public share, invite, password, publication, session, or token findings, write the credential-material taxonomy before fixing: raw/hash/encrypted/derived/public marker, storage, server/client visibility, cookie/URL/session use, rotation/revocation, and denial-test proof.
- Hosted GitHub controls require hosted evidence: branch protection or rulesets, required CI, CodeQL, Dependabot alerts, secret scanning, environments, and `SECURITY.md` cannot be proven by local tests. Local checks may support code readiness only.
- Hidden refs, PR branch history, archived docs, generated artifacts, and ignored local state can still leak sensitive strings. Include them in the ledger when a finding mentions historical exposure or retention, and use non-destructive redaction or history-purge planning unless the owner explicitly authorizes destructive Git history work.

## Verification Policy

Verification is proportional to risk:

- Docs/config changes: `git diff --check` plus path/ignore checks when relevant.
- Narrow source change: type/LSP check or targeted test for the touched behavior.
- Shared logic, auth, database, security, or release work: targeted tests plus broader `bun run validate`/`bun run build` only when the risk justifies the time.
- UI verification is proportional: minor cosmetic changes such as spacing, copy, color, icon, or class tweaks do **not** automatically need Playwright/browser proof; use static review, focused type/LSP/lint, or a nearby component/unit check when that proves the edit. Run targeted browser/manual proof only when the change affects interaction, routing, auth/data state, responsive layout risk, accessibility semantics, complex composition, or when visual proof is the requested deliverable.
- Codex App speed guardrail: Playwright, browser automation, screenshots, Storybook, and visual QA are opt-in evidence surfaces, not default completion gates. Before choosing them, state the specific browser-only claim they prove; if the claim can be proven by static review, focused type/LSP/lint, unit/DOM tests, or targeted source inspection, use that faster path and report the browser proof as intentionally skipped.

Do not claim provider, GitHub, Notion, Vercel, production, or manual proof from local-only checks. If a check is skipped, state why and what risk remains.

## Shared Agent Assets

The repo should share durable agent/project intelligence across machines through Git:

- Canonical project truth: `.ai/`, especially `.ai/00_system`, `.ai/10_state`, `.ai/11_skills`, `.ai/12_agents`, and `.ai/08_prompts`.
- Tool adapters that are safe to share: `.codex/`, `opencode.json`, intentionally authored `.opencode/` extension files, `.agents/`, `.claude/`, `.commandcode/`, and their README/config/skill/prompt/agent files.
- Local-only state stays ignored: `.omx/`, `.omo/`, `.supermemory/`, `.gitnexus/`, `.code-review-graph/`, `.chunkhound/`, `.claude/worktrees/`, `.ai/99_scratch/`, `.ai/14_code_intelligence/`, build/test outputs, env files, caches, logs, sessions, and machine-local settings.
- Local Supermemory at `http://localhost:6767` is the shared cross-agent memory layer. Agent adapters must follow `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`: check it, run `bun run supermemory:start` if it is down and local process startup is available, query it for relevant memory before meaningful work, and update it at closeout when durable project truth changes. The startup script requires `SUPERMEMORY_SERVER_BIN` and `SUPERMEMORY_SERVER_SHA256` for a verified local `supermemory-server` binary. Supermemory augments `.ai`; it never overrides current source or canonical docs.
- After changing `.ai/12_agents/payloads`, Codex/OpenCode adapter files, or related tool adapter files, run `bun run validate:agents` plus the relevant tool resolver (`codex debug prompt-input` or `opencode debug config`) before claiming the agent surface is clean.

Never commit secrets, private keys, `.env*` values, raw provider tokens, or machine-local session state.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **archestimator** (22108 symbols, 52883 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `bun run graph:reindex` only when its safe-runner guard passes. If `.gitnexus/run.cjs` is absent or contains registry-resolved fallback logic, skip the refresh and use available MCP/code-review-graph context until a pinned, lockfile-controlled GitNexus runner is reviewed and added.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/archestimator/context` | Codebase overview, check index freshness |
| `gitnexus://repo/archestimator/clusters` | All functional areas |
| `gitnexus://repo/archestimator/processes` | All execution flows |
| `gitnexus://repo/archestimator/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
