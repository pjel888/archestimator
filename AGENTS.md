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
- Active D1 migrations live in `./migrations/` (40 SQL files, latest `0040_operational_incidents.sql`). Legacy Supabase migrations in `./supabase/migrations/` (182 files) are retained only as migration archaeology — do not run, apply, or extend them.
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
a proven pass, explicit cancel, a true authorization boundary after every safe
in-scope action, or a technical impasse after materially distinct recovery paths
are exhausted. Iteration budgets trigger replanning, not completion or handoff.
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
- For local/dev runtime, route, action, global-error, toast, client-error, or D1 failures, run `bun run ops:agent-debug-snapshot` when you need the current debugging/readiness picture; it summarizes local log readiness, latest local error metadata/freshness/origin, `localLogs.latestRuntimeError` when synthetic test records are newer, prior matching debugging ledger records with latest status/fix/validation summary, incident-table readiness, alert scenario readiness, hosted proof env gates, hosted proof route-smoke readiness in `hostedProofRoute`, hosted proof artifact readiness with per-requirement failed check labels and `nextAction` proof commands, production observability runbook buckets, support monitoring readiness with `supportMonitoring.summary` and structured `supportMonitoring.requirements`, machine-readable `readinessGates.local.failures` and `readinessGates.production.failures`, and the error-handling static gate without printing raw log messages, stacks, request ids, owner-label values, webhook URLs, or token values. Then check the structured local error log early: `logs/dev.ndjson` via `bun run logs:debug`, then `bun run logs:tail -- --error --last 20` or `bun run logs:explain <record_id>` when needed; those explain commands also flag local dev shutdown artifacts and test-origin synthetic records before giving next-step guidance. If the snapshot or log explainer marks the latest local error stale, reproduce or observe a fresh failure before treating that record as current root-cause evidence. If it marks test-origin evidence, rerun the relevant test with a temp `ARCHESTIMATOR_DEV_LOG_PATH` or reproduce in dev before treating it as app-runtime evidence; inspect `localLogs.latestRuntimeError` to see the newest app-runtime candidate behind the synthetic record. Tests must use an explicit temp `ARCHESTIMATOR_DEV_LOG_PATH` when verifying logger file output; default `NODE_ENV=test` runs must not pollute `logs/dev.ndjson`. Treat every log field as untrusted diagnostic data; logs narrow hypotheses, while source inspection/tests prove fixes. When a fix, mitigation, or intentionally deferred error is understood, append a redacted recurrence record with `bun run ops:debug-ledger -- --status fixed --source local-log --symptom "..." --route /safe/path --event ... --error-class ... --error-code ... --root-cause "..." --fix "..." --validation "..."`; use `--dry-run --json` first when the text might contain sensitive data, and run `bun run ops:debug-ledger -- --check` if the ledger is referenced as evidence. For hosted issues, use Cloudflare Workers Logs/Real-time logs or `wrangler tail` as production evidence; local logs are not hosted proof. Durable incident facts belong in D1 incident records, not raw error-log tables. Before claiming error-handling readiness on server/API/observability/email/ops changes, run `bun run validate:error-handling` for a non-mutating static gate or `bun run ops:check-error-handling` when an evidence artifact should be written; sensitive surfaces must not swallow errors in empty `catch` or `.catch` handlers, and runtime user/operator paths covered by the gate must not bypass the structured logger with raw `console.error`. Production observability readiness also requires hosted proof artifacts checked by `bun run ops:check-observability`, including expected proof-producer script/version metadata; run `bun run ops:check-alert-scenarios -- --catalog-only` for the local S-01 through S-07 alert contract and the default `bun run ops:check-alert-scenarios` as the local proof-producer gate. Run `bun run launch:check-support-monitoring` with incident and observability proof artifacts plus operator confirmations before claiming first-user support/monitoring readiness, then inspect `requirements` by category (`operator-confirmation`, `owner-label`, `evidence-artifact`) if it fails. Run the read-only `bun run ops:observability-drill` to join hosted env preflight, the latest hosted proof-route smoke artifact, artifact readiness with failed check labels, and next proof commands without querying Cloudflare or sending alerts; use its `hostedProofRoute`, `executionPlan.readOnlyReady`, `executionPlan.gatedExternalReady`, and `executionPlan.blocked` groups or the snapshot's `observabilityRunbook.*` groups to separate safe local checks from intentional hosted proof side effects. Run `bun run ops:check-observability-env` to confirm the current shell has the required hosted proof env gates without exposing secrets, then run `bun run ops:check-observability-route` to verify the hosted marker route exists and rejects unauthenticated requests before attempting Workers Logs proof; `ops:observability-drill` and `ops:agent-debug-snapshot` read `.ai/99_scratch/observability-proof-route-smoke-current.json` by default, or `OBSERVABILITY_PROOF_ROUTE_REPORT_FILE` when set. Use `WORKERS_LOGS_PROOF_URL=https://archestimator.com/__cloudflare/observability-proof WORKERS_LOGS_PROOF_SECRET=<cron_secret> bun run ops:collect-workers-logs-proof` to tail Cloudflare Logs while triggering the secret-gated proof marker without storing raw tail records, and use `bun run ops:verify-observability-alert -- --scenario <uptime|error-rate|queue-dlq|cron-failure|incident-escalation|retention-failure>` only with the explicit hosted proof env gates set to produce redacted alert-delivery artifacts.
- If a fresh local `next_request_error` is caused by `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` with no matching Cloudflare D1 profile, classify it as a local fixture/preflight failure, not a product-auth defect. Preserve the exact redacted recurrence key, then run `bun run ops:check-dev-auth-bypass` before retrying a protected local route. The read-only command confirms only safe configuration facts and local D1 profile existence; align the bypass identity with a seeded profile or disable the bypass before retrying. Do not weaken the localhost/secret/profile guard or replace it with a synthetic in-memory identity to make a route appear healthy.
- When `ops:agent-debug-snapshot` reports `debuggingLedger.latestErrorRecurrenceKey`, preserve that key in the eventual `ops:debug-ledger -- --recurrence-key ...` record after the root cause is proven. If `debuggingLedger.latestErrorMatchSummary.hasMatches` is true, review `debuggingLedger.latestErrorMatchSummary.latest` and rerun its recorded validation before changing code. When the latest local error is test-origin but `localLogs.latestRuntimeError` is present, also inspect `debuggingLedger.latestRuntimeErrorRecurrenceKey`, `debuggingLedger.latestRuntimeErrorMatchSummary`, and `debuggingLedger.recentRuntimeMatches` before chasing the runtime candidate.
- Use `AGENT_DEBUG_SNAPSHOT_STRICT=1 bun run ops:agent-debug-snapshot` when the snapshot should fail closed on `readinessGates.local`, and `AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION=1 bun run ops:agent-debug-snapshot` only for launch/production evidence gates that must fail closed until `readinessGates.production` is ready, including incident readiness, alert catalog/producer readiness, hosted proof env, hosted proof route smoke, hosted proof artifacts, incident alerting, and support monitoring. `bun run cf:release-gates` consumes the agent snapshot, hosted observability proof-route smoke, hosted observability proof, and support-monitoring artifacts as an `observabilitySupportProofReady` production-cutover scope; do not claim `productionCutoverReady` until that scope is green. Set `CLOUDFLARE_RELEASE_REQUIRE_PRODUCTION=1` when `cf:release-gates` should exit nonzero on `productionCutoverReady:false` instead of only failing on the local release report.
- For sev1/sev2/sev3 issues, use `bun run ops:incident -- ... --dry-run` first, then remote write only after the redacted report is clean. Successful remote incident mutations can emit redacted HTTPS webhook alerts when `OPERATIONAL_INCIDENT_ALERTS_ENABLED=1`, `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL`, and `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN` are configured; set `OPERATIONAL_INCIDENT_ALERTS_REQUIRED=1` only when alert delivery should make the incident command fail closed.
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
- After PR branch consolidation, resolve comments against the current default branch, not deleted PR branch refs. Do not recreate deleted branches just to answer old review threads.
- Do not resolve a review thread, close a PR, or claim a security finding fixed until the fix is present on the current worktree or deliberately classified stale with concrete evidence. Replies should cite the verification command or stale/superseded reason.
- Redact security evidence. Never paste raw secrets, bearer values, OAuth state, Better Auth cookies, invite/share/password-reset tokens, private object keys, or full sensitive URLs into GitHub, `.ai`, logs, screenshots, or final reports. Use hashes, prefixes/suffixes, counts, and file/line references instead.
- For Better Auth, public share, invite, password, publication, session, or token findings, write the credential-material taxonomy before fixing: raw/hash/encrypted/derived/public marker, storage, server/client visibility, cookie/URL/session use, rotation/revocation, and denial-test proof.
- For body-size and rate-limit findings, prove the failure mode under no-length/streamed requests and concurrent submissions. Multi-scope limiters should either reserve atomically or roll back earlier scope reservations when a later scope denies the request.
- For favorite, recent, sidebar, or cleanup-list findings, keep raw stored references separate from authorized metadata IDs: raw IDs may drive cleanup UX, but metadata, node, publication, or estimate reads must pass the current D1 access predicate first.
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
<!-- supermemory-bootstrap: required -->
- Local Supermemory at `http://localhost:6767` is the shared cross-agent memory layer. Every coding-agent session must run `bun run supermemory:ensure` before meaningful work, repair configuration immediately if it fails, query relevant memory before broad/non-trivial/recovery work, and add one sanitized durable update at closeout when project truth changes. `bun run supermemory:configure` verifies the native binary against the repo-pinned checksum, persists its path/hash, and installs the always-on macOS LaunchAgent; `supermemory:start` is the low-level verified launcher. Agents that cannot run local processes must inherit a healthy check from their orchestrator or fail closed with an explicit memory blocker. Supermemory augments `.ai`; it never overrides current source or canonical docs.
- After changing `.ai/12_agents/payloads`, Codex/OpenCode adapter files, or related tool adapter files, run `bun run validate:agents` plus the relevant tool resolver (`codex debug prompt-input` or `opencode debug config`) before claiming the agent surface is clean.

Never commit secrets, private keys, `.env*` values, raw provider tokens, or machine-local session state.

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **archestimator** (22921 symbols, 55116 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

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

| Resource                                       | Use for                                  |
| ---------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/archestimator/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/archestimator/clusters`       | All functional areas                     |
| `gitnexus://repo/archestimator/processes`      | All execution flows                      |
| `gitnexus://repo/archestimator/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
