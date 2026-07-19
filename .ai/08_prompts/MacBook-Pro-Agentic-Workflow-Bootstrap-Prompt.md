# Archestimator MacBook Pro Agentic Workflow Bootstrap Prompt

You are Codex running on Philip's MacBook Pro. Execute this prompt autonomously from start to finish.

## Objective

Make this MacBook Pro checkout of Archestimator development-ready and as close as safely possible to the established Mac Mini agentic development environment.

The target repository path is:

`/Users/philiplewis/Documents/archestimator`

The result must preserve the Git-tracked Archestimator project brain while rebuilding or restoring the machine-local developer tooling that Git intentionally does not transfer.

Do not stop after producing an audit or checklist. Inspect, install, configure, repair, and validate every safe local prerequisite that can be completed on this MacBook. Continue automatically until the success criteria are met or the only remaining items genuinely require credentials or source-machine artifacts that are unavailable on this MacBook.

## Success Criteria

The MacBook is ready when all applicable items below are evidenced:

1. The checkout is on the intended branch and safely synchronized with `origin` without losing local work.
2. `AGENTS.md`, the `.ai` project brain, project skills, Codex configuration, native agent roles, prompts, hooks, and MCP configuration are present from Git.
3. The repository's supported Bun and Node toolchain is installed and dependencies are installed from `bun.lock`.
4. Codex and oh-my-codex are installed, configured in user-scope plugin mode, and healthy.
5. The project-local skill catalog and the shared user-level skill catalog are available and pass the repository validator.
6. Supermemory is healthy if its pinned native binary and provider configuration are available; otherwise every safe step is completed and the exact missing source-machine artifact is reported.
7. Local secret files are present or their credential boundary is reported without exposing any value.
8. Local Cloudflare development schema and code-intelligence indexes are rebuilt where safe and applicable.
9. Static agent and skill validators pass.
10. No product tests, builds, browser automation, screenshots, deployment, remote database mutation, commit, or push has been performed.

## Authority And Startup

Follow the repository's current authority chain instead of relying on this prompt for durable policy:

1. `AGENTS.md`
2. Only the `FAST PATH:START` through `FAST PATH:END` block in `.ai/10_state/current-state.md`
3. The directly relevant files under `.ai/00_system/`
4. Current source and configuration

At the beginning:

1. Change to `/Users/philiplewis/Documents/archestimator`.
2. If Bun is already available, run `bun run supermemory:ensure` immediately.
3. If that command fails because Bun, the pinned Supermemory binary, its checksum configuration, or provider configuration is missing, record the exact reason and continue into the repair phases below. Supermemory degradation is not permission to stop unrelated bootstrap work.
4. Read only the FAST PATH block in `.ai/10_state/current-state.md`.
5. Run `git status --short --branch` before changing anything.
6. Read `.agents/README.md`, `.codex/README.md`, `.gitignore`, `.nvmrc`, and the `packageManager` and `engines` fields in `package.json`.

## Autonomy And Boundaries

You are authorized to:

- install or update free local developer tools on this MacBook;
- write machine-local configuration under Philip's home directory;
- install user-level skills and Codex plugins;
- install repository dependencies from the committed lockfile;
- create ignored local configuration files from committed examples;
- create or repair local-only Supermemory, Wrangler, GitNexus, ChunkHound, and OMX state;
- apply the repository's active D1 migrations only to the local Wrangler database;
- use network access for official package registries, Git repositories, and local tool installation.

Do not:

- reset, clean, stash, revert, overwrite, or delete unfamiliar work;
- create or switch branches or worktrees;
- commit, push, force-push, rewrite history, or deploy;
- copy secrets into Git, logs, chat output, or tracked files;
- print secret values, tokens, private URLs, credential files, or authentication payloads;
- mutate hosted Cloudflare resources or any production/external database;
- mutate the historical Supabase project or `supabase/migrations/`;
- install paid services or paid add-ons;
- run product tests, test suites, builds, Playwright, browser automation, screenshots, Storybook, or visual QA;
- download or execute an unpinned Supermemory native binary;
- live-sync a PGlite, SQLite, D1, or other mutable database directory between Macs.

Ask Philip only when an interactive login, credential, unavailable source-machine artifact, or irreversible external action is truly required. Never ask for a secret value in chat. Complete every independent safe branch before reporting such a boundary.

## Mac Mini Reference Baseline

Use this only as a parity reference captured on 2026-07-19. Prefer the repository's current supported versions and healthy newer compatible tool versions rather than forcing unnecessary downgrades.

- macOS Apple Silicon environment
- Bun `1.3.14`
- Node `v26.0.0`; the repository `.nvmrc` selects Node `24`
- npm/npx `11.12.1`
- `uvx 0.11.19`
- Codex CLI `0.144.5`
- oh-my-codex `0.20.2`
- GitHub CLI `2.93.0`
- Claude Code `2.1.210`
- OpenCode `1.18.3`
- Kimi Code `0.27.0`
- GitNexus `1.6.9`
- Eight project-local Archestimator skills and 24 project compatibility links
- 289 user-level shared skills, including 278 lock-managed skills
- 19 installed Codex plugins
- Healthy reference validation:
  - `bun run validate:agents` passed
  - `bun run validate:skills` reported `project=8`, `project_links=24`, `global=289`, `global_links=628`
  - `omx doctor` reported `20 passed`, `1 warning`, `0 failed`

Count differences caused by legitimate newer upstream catalogs are acceptable only when the repository validators pass and no required project skill or OMX workflow is missing.

## Execution Protocol

Use a short in-session plan and execute these phases in order. Keep progress updates concise and outcome-first. Do not create a dated plan pack or product-code changes for this machine bootstrap.

### Phase 1: Safely Synchronize The Checkout

1. Confirm the directory is a Git worktree and inspect:
   - `git status --short --branch`
   - `git remote -v`
   - `git rev-parse --show-toplevel`
2. Preserve every existing local change.
3. Run `git fetch origin`.
4. If the worktree is clean and the current branch tracks the intended remote branch, run `git pull --ff-only`.
5. If the worktree is dirty or cannot fast-forward, do not stash, reset, clean, rebase, merge, or overwrite. Continue using the current checkout and report the synchronization gap in the final receipt.
6. Verify Git contains the project brain:
   - `AGENTS.md`
   - `.ai/00_system/`
   - `.ai/08_prompts/`
   - `.ai/10_state/`
   - `.ai/12_agents/`
   - `.agents/skills/`
   - `.codex/config.toml`
   - `.codex/hooks.json`
   - `.codex/agents/`
   - `.codex/prompts/`
   - `.mcp.json`
   - `.cursor/mcp.json`
   - `opencode.json`
7. Verify the project compatibility links under `.claude/skills/`, `.commandcode/skills/`, and `.vibe/skills/` are relative symlinks into `.agents/skills/`.

Do not treat `.cursor/ecc-install-state.json` as runtime authority. It is an installer snapshot and may contain an older machine's absolute checkout path.

### Phase 2: Establish The Supported Toolchain

1. Detect macOS architecture with `uname -m` and inspect installed tool versions.
2. Read `.nvmrc`, `package.json`, and `bun.lock` before selecting versions.
3. Ensure these core commands exist:
   - `git`
   - `bun`
   - `node`
   - `npm`
   - `npx`
   - `uvx`
   - `codex`
   - `omx`
   - `gh`
   - `gitnexus`
4. Prefer Homebrew or each tool's official installer. Do not use unexplained third-party install scripts.
5. Use the Node version selected by `.nvmrc` unless an already-installed version satisfies `package.json` and the repository preflight accepts it.
6. Use the Bun version declared by `packageManager` when practical.
7. Install repository dependencies with:

   `bun install --frozen-lockfile`

8. Do not run the application, build, tests, lint suite, Storybook, or browser QA during this bootstrap.

Claude Code, OpenCode, and Kimi Code are useful parity tools but are not blockers for Codex-based Archestimator development. Install or update them only through their official local installation path when already used on this MacBook or when the installation path is unambiguous.

### Phase 3: Validate The Git-Tracked Agent Surface

1. Confirm `AGENTS.md` is visible at the repository root.
2. Confirm `.codex/config.toml` and the native roles under `.codex/agents/` are present.
3. Confirm the eight expected project skills exist under `.agents/skills/`:
   - `archestimator-plan-pack`
   - `debug-issue`
   - `explore-codebase`
   - `gitnexus`
   - `impeccable`
   - `react-doctor`
   - `refactor-safely`
   - `review-changes`
4. Run the static adapter validator:

   `bun run validate:agents`

5. If it fails, repair only machine-path, missing-link, or local-tooling causes. Do not weaken the repository contract or rewrite tracked policy merely to make a new machine pass.

### Phase 4: Restore Or Rebuild The Shared Skill Catalog

The canonical shared catalog is machine-local at `~/.agents/skills/`, with its lock at `~/.agents/.skill-lock.json`. It is intentionally not transferred by Git.

1. Inspect, without printing skill payload contents unnecessarily:
   - whether `~/.agents/skills/` exists;
   - whether `~/.agents/.skill-lock.json` exists;
   - the lock schema version;
   - physical skill count and symlink count;
   - existing host compatibility roots.
2. If a healthy lock-managed catalog already exists, run:

   `bun run skills:update`

3. If the catalog is absent, first look for a user-supplied offline transfer of the Mac Mini's `~/.agents/` directory in `~/Downloads`, `~/Desktop`, mounted external volumes, or another obvious migration location. Do not search unrelated private directories broadly.
4. If a transferred `~/.agents/` catalog is found:
   - verify it contains `skills/` and `.skill-lock.json`;
   - copy it into `~/.agents/` without overwriting unrelated existing files blindly;
   - preserve or tighten file permissions;
   - run `bun run skills:update`.
5. If no transfer is available, rebuild the catalog from the known managed source set using `npx -y skills@1.5.16 add <source> --global --all --full-depth`, one source at a time, preserving already-installed skills:
   - `affaan-m/everything-claude-code`
   - `MengTo/Skills`
   - `mattpocock/skills`
   - `obra/superpowers`
   - `Leonxlnx/taste-skill`
   - `cloudflare/skills`
   - `emilkowalski/skills`
   - `supabase/agent-skills`
   - `mattbx/shadcn-skills`
   - `vercel-labs/skills`
   - `shadcn/improve`
   - `nutlope/hallmark`
6. Treat duplicate-name or already-installed results as reconciliation signals, not permission to delete arbitrary user customizations.
7. Run:
   - `bun run skills:consolidate`
   - `bun run validate:skills`
8. Follow validator-directed repair only. Do not copy shared physical payloads into project-local `.codex/skills`, `.cursor/skills`, `.claude/skills`, `.commandcode/skills`, `.vibe/skills`, or `.github/skills`.

### Phase 5: Configure Codex, OMX, And Plugins

1. Verify Codex CLI authentication status without exposing account tokens.
2. If OMX is missing and npm is healthy, install the current stable official `oh-my-codex` package. Then run:
   - `omx setup --scope user --plugin`
   - `omx update --stable`
   - `omx doctor`
3. Preserve the repository's `AGENTS.md`. If OMX setup needs an AGENTS merge policy, use the non-destructive merge behavior rather than replacing the project contract.
4. Inspect current Codex plugin state with:
   - `codex plugin marketplace list --json`
   - `codex plugin list --json`
5. Ensure the OMX plugin is installed through `omx setup --scope user --plugin`.
6. The Mac Mini reference plugin set contained:
   - `browser@openai-bundled`
   - `chrome@openai-bundled`
   - `compound-engineering@compound-engineering-plugin`
   - `computer-use@openai-bundled`
   - `documents@openai-primary-runtime`
   - `github@openai-curated`
   - `gmail@openai-curated`
   - `notion@openai-curated`
   - `oh-my-codex@oh-my-codex-local`
   - `pdf@openai-primary-runtime`
   - `ponytail@ponytail`
   - `presentations@openai-primary-runtime`
   - `remotion@openai-curated`
   - `sites@openai-bundled`
   - `spreadsheets@openai-primary-runtime`
   - `superpowers@openai-curated`
   - `template-creator@openai-primary-runtime`
   - `vercel@openai-curated`
   - `visualize@openai-bundled`
7. OpenAI-bundled, primary-runtime, and curated plugin availability may be controlled by the installed Codex runtime. Do not fabricate marketplace URLs or bypass Codex's supported plugin mechanism.
8. If the external Compound Engineering or Ponytail marketplaces are missing, use the supported Codex marketplace commands after checking `codex plugin marketplace add --help`:
   - source `everyinc/compound-engineering-plugin`
   - source `DietrichGebert/ponytail`
   Then install their named plugins through `codex plugin add`.
9. Plugin-specific account connections such as Gmail, Notion, GitHub, or Vercel are credential boundaries. Install the plugin when safe, but do not request, print, or invent credentials.
10. Run `omx doctor` again after repairs. A warning is acceptable only when it is explicitly understood and no checks fail.

### Phase 6: Configure Supermemory Safely

Supermemory is required by the repository startup contract, but its native binary, provider configuration, API key, local database, and LaunchAgent are machine-local and intentionally ignored by Git.

1. Inspect these expected machine-local paths without printing secret contents:
   - `~/.supermemory/bin/supermemory-server`
   - `~/.supermemory/bin/supermemory-server.version`
   - `~/.supermemory/env`
   - `~/.supermemory/archestimator-server.env`
   - `~/Library/LaunchAgents/com.archestimator.supermemory.plist`
   - `<repo>/.supermemory/`
2. Read `scripts/supermemory-server-checksums.json` and `scripts/configure-supermemory-server.mjs` before changing anything.
3. If the pinned binary and version file already exist, do not replace them merely for parity. Run:
   - `bun run supermemory:configure`
   - `bun run supermemory:ensure`
4. If the binary is absent, look only for a user-supplied offline transfer in an obvious migration location. The required Mac Mini artifacts are:
   - `~/.supermemory/bin/supermemory-server`
   - `~/.supermemory/bin/supermemory-server.version`
5. Verify the transferred binary's platform, version, executable permission, and SHA-256 against the committed checksum registry before executing it.
6. Never download or execute an unpinned replacement through a generic npm/npx wrapper. If no verified binary artifact or official checksum-matching distribution is available, record `SOURCE_MACHINE_ARTIFACT_REQUIRED: SUPERMEMORY_BINARY`, continue all other phases, and report the exact two paths Philip must transfer securely from the Mac Mini.
7. If non-interactive startup lacks a supported provider configuration, record `CREDENTIAL_ACTION_REQUIRED: SUPERMEMORY_PROVIDER`. Do not ask Philip to paste the provider secret into chat.
8. For historical memory, prefer one of these safe choices:
   - start a fresh MacBook-local memory store and rely on Git-tracked `.ai` as canonical project truth; or
   - restore a one-time encrypted offline snapshot of the Mac Mini repository `.supermemory/` directory while the source server is stopped.
9. Never place `.supermemory/` in Git, iCloud live-sync, Dropbox live-sync, or another multi-writer filesystem. Never copy its API key or auth secret into tracked files.
10. A missing historical memory database is an advisory-history gap, not a core source-of-truth failure. A missing verified binary should remain explicitly visible until repaired.

### Phase 7: Restore Local Secrets And Authentication Boundaries

1. Inspect only the existence, permissions, and variable names—not values—of:
   - `.env.local`
   - `.dev.vars`
2. Compare variable names against `.env.example` and `.dev.vars.example` without printing values.
3. If an ignored local file is absent, create it from its committed example and set restrictive permissions. Do not invent production secrets.
4. Look for a user-supplied encrypted/offline transfer in an obvious migration location. Do not search unrelated private directories broadly.
5. If values remain blank, report the exact missing variable names under `CREDENTIAL_ACTION_REQUIRED`; never print existing values.
6. Check authentication status, without exposing tokens, for the tools actually required:
   - Git/GitHub
   - Codex
   - Cloudflare Wrangler
   - any installed Claude, OpenCode, Kimi, or plugin account used by the workflow
7. Do not launch browser automation. If a CLI requires an interactive browser or device-code login, report the exact official login command for Philip to run directly.
8. Do not access or mutate hosted Cloudflare resources merely to prove authentication.

### Phase 8: Rebuild Local Development State And Indexes

1. Treat these ignored directories as disposable or separately migrated machine state, not Git omissions:
   - `node_modules/`
   - `.next/`
   - `.wrangler/`
   - `.gitnexus/`
   - `.chunkhound/`
   - `.omx/`
   - `.supermemory/`
   - `.codex` sessions, logs, state, caches, and SQLite files
2. If local Wrangler D1 state is absent and Bun dependencies are installed, initialize only the local schema with the repository's active migrations:

   `bunx wrangler d1 migrations apply ARCH_DB --local`

3. Do not use `--remote`. Do not copy or mutate hosted D1 data.
4. State clearly that a fresh local schema does not reproduce Mac Mini sample/user data. If Philip later wants identical local data, recommend an explicit offline export/import task rather than live-syncing `.wrangler/`.
5. Rebuild GitNexus from the repository root:
   - prefer the repository runner when it exists and is safe;
   - otherwise use the installed `gitnexus analyze` command;
   - if npm 11 causes the known `npx` installer crash, prefer the already-installed global GitNexus CLI rather than altering product dependencies.
6. Rebuild ChunkHound only if its CLI and configuration are already available and the operation is local. Its absence is not a blocker for core Codex operation.
7. Let OMX recreate `.omx/` runtime state naturally. Do not transfer stale sessions, team state, or active goals from the Mac Mini.

### Phase 9: Final Verification

Run the smallest decisive static verification sequence:

1. `bun run supermemory:ensure` when the verified binary/provider prerequisites are available.
2. `bun run validate:agents`.
3. `bun run validate:skills`.
4. `omx doctor`.
5. `git status --short --branch`.
6. Confirm `AGENTS.md`, `.ai`, `.agents`, `.codex/agents`, and `.codex/prompts` remain present.
7. Confirm no tracked secret file or database was created.
8. Confirm no product test, build, browser QA, deployment, remote migration, commit, or push occurred.

Do not claim a command passed unless you ran it and read its output. If a validation fails, repair safe machine-local causes and rerun it. Do not weaken validators to force green output.

## Completion States

Use exactly one final state:

- `FULL_PARITY_READY` — all success criteria are satisfied, including healthy Supermemory and required local credentials.
- `DEVELOPMENT_READY_WITH_LOCAL_GAPS` — Git-tracked project brain, dependencies, Codex/OMX, project skills, and static validators are healthy, but optional plugins, historical memory, local sample data, or secondary agent CLIs differ.
- `CREDENTIAL_ACTION_REQUIRED` — all safe setup is complete and only named interactive logins or secret values remain.
- `SOURCE_MACHINE_ARTIFACT_REQUIRED` — all safe setup is complete and only a named Mac Mini artifact such as the pinned Supermemory binary remains unavailable.
- `TECH_BLOCKED` — reserve this only for a core development requirement that remains impossible after materially different local recovery attempts.

Credential and source-machine artifact boundaries may be reported together with `DEVELOPMENT_READY_WITH_LOCAL_GAPS` when Codex development itself is operational.

## Required Final Report

Return a concise evidence table with these rows:

- Git synchronization
- Tracked project brain
- Bun/Node/dependencies
- Codex/OMX
- Project skills
- Shared global skills
- Codex plugins
- Supermemory binary/config/health
- Secret files and login boundaries
- Local Wrangler schema/data
- GitNexus/ChunkHound indexes
- Static validation
- Git worktree status

For each row report:

- `READY`, `READY_WITH_DIFFERENCE`, or `BLOCKED`;
- decisive command/output evidence;
- the exact remaining action, if any.

End with:

1. the selected completion state;
2. the commands that passed;
3. any exact credential or Mac Mini artifact Philip must supply;
4. confirmation that no secrets were exposed and no tests, builds, browser QA, deployment, remote mutation, commit, or push occurred.

Do not end with a generic offer to continue. Finish every safe local action first, then report the evidence-backed result.
