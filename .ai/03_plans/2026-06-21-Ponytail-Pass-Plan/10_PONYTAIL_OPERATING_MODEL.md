# 10 — Ponytail Operating Model

**Date:** 2026-06-21 · **Source:** ponytail v4.7.0 at `~/.local/share/ponytail/` · **Installed for:** OpenCode, Claude Code, Codex

This document is the canonical reference for how Archestimator uses ponytail day-to-day. It covers: when to turn it on, which level to use, what the ruleset actually says, what the commands do, and what ponytail will never let you cut.

## When to use ponytail (timing)

Ponytail's benchmark shows the biggest cuts where an agent **over-builds** — date picker 404→23 LOC, modal 30→8, debounce 116→10. It barely moves code that's already minimal. Timing matters more than scope:

| Scenario | Payoff | Use ponytail? |
|---|---|---|
| **New feature work** (greenfield, new route, new component) | **High** — this is where over-build traps live | **Yes, default-on** |
| **Before installing a new dependency** | **High** — ladder rungs 3-4 catch `query-string`/`react-infinite-scroll`/Radix-dialog swaps | **Yes — make it the gate** |
| **Touching a Tier 2 mega-file** (see `05_TIER_2_MEGA_FILE_STRATEGY.md`) | **High** — they're already over-built; ponytail prevents piling on | **Yes, and run `/ponytail-review` on the diff** |
| **Adding a wrapper/helper/util** | **Medium-high** — ponytail asks "3+ callers?" before letting you abstract | **Yes** |
| **Bug fix in unfamiliar code** | Low — fix minimally, don't refactor | No — bugfix ≠ refactor |
| **Auth, RLS, data-integrity, migration work** | N/A — ponytail preserves these explicitly | Off (it auto-preserves them, but don't lean on it) |
| **Refactor that's already scoped and underway** | Low — you've already decided | No — would second-guess decisions |
| **Test file changes** | N/A — ponytail preserves tests | No |
| **Generated code** (`supabase/types.ts`, next dist) | N/A — don't edit by hand | No |

**Best default for Archestimator right now:** ponytail `full` on for new feature work and dependency additions; run `/ponytail-review` on any PR that touches a Tier 2 file. Don't bother for hot-bug-fix turns.

## Ponytail's ladder (the core ruleset)

Before writing code, the agent stops at the first rung that holds:

```
1. Does this need to exist?   → no: skip it (YAGNI)
2. Stdlib does it?            → use it
3. Native platform feature?   → use it
4. Installed dependency?      → use it
5. One line?                  → one line
6. Only then: the minimum that works
```

**Lazy, not negligent:** trust-boundary validation, data-loss handling, security, and accessibility are never on the chopping block.

## Modes

Ponytail has 4 runtime modes. The mode controls how aggressively the ruleset is injected. (There is also a `review` value that persists in config but routes to the `/ponytail-review` skill — it is not a runtime intensity.)

| Mode | When to use | What it does |
|------|-------------|--------------|
| `off` | Auth/RLS/data-integrity work where you don't want any ponytail influence; or when ponytail is second-guessing a decision you've already made | **Suppresses injection entirely.** The activation hook exits early, clears the mode flag, and emits no ruleset. Not a "weaker ruleset" — nothing. |
| `lite` | Quick tasks where you want a gentle reminder, not a gate | Shared body + the lite intensity row: *"Build what's asked, but name the lazier alternative in one line. User picks."* Example: *"Done, cache added. FYI: functools.lru_cache covers this in one line if you'd rather not own a cache class."* |
| `full` (default) | Normal feature work, dependency additions, new components | Shared body + the full intensity row: *"The ladder enforced. Stdlib and native first. Shortest diff, shortest explanation. Default."* Example: *"`@lru_cache(maxsize=1000)` on the fetch function. Skipped custom cache class, add when lru_cache measurably falls short."* |
| `ultra` | When the codebase has wronged you personally. Maximum aggressiveness. | Shared body + the ultra intensity row: *"YAGNI extremist. Deletion before addition. Ship the one-liner and challenge the rest of the requirement in the same breath."* Example: *"No cache until a profiler says so. When it does: @lru_cache. A hand-rolled TTL cache class is a bug farm with a hit rate."* |

### Mode-specific prose (verbatim from `ponytail-instructions.js`)

**Shared body (injected in every active mode — `lite`, `full`, `ultra`):**

```
You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

ACTIVE EVERY RESPONSE. No drift back to over-building. Still active if unsure. Off only: "stop ponytail" / "normal mode".

The ladder:
  1. Does this need to exist at all? (YAGNI)
  2. Stdlib does it?
  3. Native platform feature covers it?
  4. Already-installed dependency solves it?
  5. Can it be one line?
  6. Only then: the minimum code that works.

Rules:
  - No unrequested abstractions
  - No boilerplate
  - Deletion over addition
  - Fewest files possible
  - Complex request? Ship the lazy version and question it in the same response
  - Two stdlib options, same size? Take the one that's correct on edge cases
  - Mark simplifications with `ponytail:` comments

Output:
  Code first. Then at most three short lines: what was skipped, when to add it.

When NOT to be lazy:
  - never simplify away trust-boundary validation, data-loss-preventing error handling, security, accessibility basics, calibration real-hardware needs, or anything explicitly requested
  - non-trivial logic leaves ONE runnable check behind

Boundaries:
  - ponytail governs what you build, not how you talk
  - `stop ponytail` / `normal mode` revert it
```

**Plus the mode-specific intensity row + example (see table above).**

**`off` is special:** the activation hook (`ponytail-activate.js`) exits early before any injection. It does NOT call `getPonytailInstructions('off')`. If you called it directly, you'd get the shared body with no intensity row — but operationally, nothing is injected.

### Switching modes

- **Per-session:** `/ponytail [lite|full|ultra|off]` (OpenCode, Claude Code, Codex). No argument defaults to `full`.
- **Per-session (no arg):** `/ponytail` — reports the current level.
- **Natural-language deactivation:** `"stop ponytail"` or `"normal mode"` in the prompt — the mode-tracker hook recognizes these and reverts to `off`.
- **Default for every new session:** `PONYTAIL_DEFAULT_MODE` env var, or `defaultMode` field in config file. Default is `full`.
- **Accepted config values:** `off|lite|full|ultra|review` (docs advertise `off|lite|full|ultra`; `review` is an internal/persisted command state that routes to the `/ponytail-review` skill — not a runtime intensity).
- **Resolution order:** env var → config file → `full`.
- **Level persists** until changed or session ends.

### Command runtime output

When you switch modes, the hook persists the mode and emits a status line:
- `PONYTAIL MODE CHANGED — level: <mode>` (for lite/full/ultra)
- `PONYTAIL MODE OFF` (for off)

### How the mode persists (OpenCode)

The OpenCode plugin (`~/.local/share/ponytail/.opencode/plugins/ponytail.mjs`) reads/writes mode state at:
```
$XDG_CONFIG_HOME/opencode/.ponytail-active
(fallback: ~/.config/opencode/.ponytail-active)
```
The `command.execute.before` hook writes the mode when you run `/ponytail <level>`. The `experimental.chat.system.transform` hook reads it on every turn and appends the ruleset to the system prompt. **Mode switches apply from the next message (not the current one)** — the transform reads the flag the command writes, so same-turn switching isn't supported.

**For Claude Code / Codex:** the state file location is host-specific (`CLAUDE_CONFIG_DIR` / `PLUGIN_DATA` / `COPILOT_PLUGIN_DATA`). The activation hook (`ponytail-activate.js`) runs at SessionStart (matcher: `startup|resume|clear|compact`). The mode-tracker hook runs at UserPromptSubmit.

## The "not lazy about" list (safety guarantees)

Ponytail is lazy about code, not about these. They are never on the chopping block:

1. **Input validation at trust boundaries** — user input, external APIs, file uploads. Always validate.
2. **Error handling that prevents data loss** — never swallow an error that could lose user data. Empty `catch` blocks are a smell.
3. **Security** — auth, authz, sanitization, CSRF, XSS, SQL injection. Never cut.
4. **Accessibility** — ARIA, keyboard nav, focus management, semantic HTML. Never cut.
5. **Calibration real hardware needs** — the platform is never the spec ideal. A clock drifts, a sensor reads off. Calibration logic stays.
6. **Anything explicitly requested** — if the user asked for X, build X. Don't substitute Y because it's simpler.

**"Lazy code without its check is unfinished":** non-trivial logic leaves ONE runnable check behind — the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.

## The `ponytail:` comment convention

When you intentionally take a shortcut with a known ceiling, mark it:

```javascript
// ponytail: O(n²) scan — fine for n<100; upgrade to Map if lists grow
const found = items.find(i => i.id === target);
```

The comment names the ceiling and the upgrade path. This is a signal to future readers (and to `/ponytail-review`) that the shortcut was intentional, not an oversight.

## Commands

Ponytail ships 6 commands. In OpenCode, they're slash commands (`/ponytail`, `/ponytail-review`, etc.). In Codex, they're skills (invoke with `@` — `@ponytail-review`).

### `/ponytail [lite|full|ultra|off]`

**What it does:** Switches intensity for the current session, or reports the current level if no argument. No arg defaults to `full`.

**When to use:** At the start of a session, when switching task types (e.g., from feature work to auth work → `/ponytail off`), or when you want to check the current mode.

**Output:** Runtime hook persists the mode and emits `PONYTAIL MODE CHANGED — level: <mode>` or `PONYTAIL MODE OFF`.

### `/ponytail-review`

**What it does:** Reviews the current changes (git diff) for over-engineering only. One line per finding. Tags: `delete` / `stdlib` / `native` / `yagni` / `shrink`. Ends with net removable lines or `Lean already. Ship.`

**When to use:** Before creating a PR, especially one that touches a Tier 2 mega-file. This is the **ongoing discipline** — run it on every PR to prevent over-build recurrence.

**Output shape:**
```
<file:line> — <tag> — <one-line finding>
...
Net removable: <N> lines
```
or: `Lean already. Ship.`

### `/ponytail-audit`

**What it does:** Repo-wide over-engineering audit (not just the diff). Scans the whole tree. One line per finding, ranked biggest cut first. Ends with net lines/deps removable or `Lean already. Ship.`

**When to use:** Periodically (e.g., monthly) to catch over-build that slipped through review. Or when onboarding to a codebase to understand where the over-engineering lives.

**Output shape:** Same as `/ponytail-review` but scoped to the whole repo, ranked by LOC cut potential.

### `/ponytail-debt`

**What it does:** Harvests `ponytail:` comments into a debt ledger. One row per marker with the ceiling + upgrade path. Ends with marker count and no-trigger count or `No ponytail: debt. Clean ledger.`

**When to use:** When you've been shipping `ponytail:` comments (intentional shortcuts with known ceilings) and want to track them. Run periodically to surface shortcuts whose ceilings might be approaching.

**Output shape:**
```
<file:line> — <ceiling named> — <upgrade path>
...
Markers: <N> | No-trigger: <M>
```
or: `No ponytail: debt. Clean ledger.`

### `/ponytail-gain`

**What it does:** One-shot benchmark scoreboard only. ASCII bars for LOC/cost/speed. Never changes mode or prints per-repo savings.

**When to use:** When justifying ponytail to a skeptic, or when you want to see the benchmark numbers.

**Output:** ASCII bar chart comparing no-skill vs ponytail across LOC, tokens, cost, time, safety.

### `/ponytail-help`

**What it does:** One-shot quick reference card for levels/skills/deactivate/config. No side effects.

**When to use:** When you forget the command names or mode values.

## Skills (auto-activated)

Ponytail ships 6 skills alongside the commands. They auto-activate when a task needs them:

| Skill | Description |
|-------|-------------|
| `ponytail` | Forces the laziest solution that actually works; intensity levels lite/full/ultra; use when user asks for ponytail/lazy/minimal/yagni/shortest path |
| `ponytail-review` | Code review focused exclusively on over-engineering and deletions |
| `ponytail-audit` | Repo-wide over-engineering audit |
| `ponytail-debt` | Collect `ponytail:` comments into a tracked debt ledger |
| `ponytail-gain` | Benchmark scoreboard for less code / less cost / more speed |
| `ponytail-help` | Quick-reference card for modes, skills, and commands |

## Always-on ruleset (AGENTS.md)

Ponytail ships an `AGENTS.md` at the repo root that Codex, CodeWhale, and other AGENTS.md-aware agents auto-load. This is the always-on ruleset (verbatim):

```text
# Ponytail, lazy senior dev mode

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does the standard library already do this? Use it.
3. Does a native platform feature cover it? Use it.
4. Does an already-installed dependency solve it? Use it.
5. Can this be one line? Make it one line.
6. Only then: write the minimum code that works.

Rules:

- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Question complex requests: "Do you actually need X, or does Y cover it?"
- Pick the edge-case-correct option when two stdlib approaches are the same size, lazy means less code, not the flimsier algorithm.
- Mark intentional simplifications with a `ponytail:` comment. If the shortcut has a known ceiling (global lock, O(n²) scan, naive heuristic), the comment names the ceiling and the upgrade path.

Not lazy about: input validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs (the platform is never the spec ideal, a clock drifts, a sensor reads off), anything explicitly requested. Lazy code without its check is unfinished: non-trivial logic leaves ONE runnable check behind, the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.

(Yes, this file also applies to agents working on the ponytail repo itself. Especially to them.)
```

## Calibration (expected payoff)

From ponytail's [examples](https://github.com/DietrichGebert/ponytail/blob/main/examples/README.md) — real model output, Claude Haiku 4.5, temperature 1:

| Example | Without (LOC) | With (LOC) | Cut |
|---|---:|---:|---:|
| Email validation | 75 | 3 | −96% |
| Debounce | 116 | 10 | −91% |
| CSV sum | 20 | 3 | −85% |
| Countdown timer | 267 | 9 | −97% |
| Rate limiting | 128 | 10 | −92% |
| Modal dialog | 30 (1 dep) | 8 (0 dep) | −73% + dep |
| Infinite scroll | 1 dep | 0 dep | dep removed |
| URL params | 1 dep | 0 dep | dep removed |

**Where the cut is biggest:** where there's a real over-build trap (date picker 404→23, color picker 287→23, because ponytail reaches for a native `<input>` instead of a component).

**Where the cut is near zero:** on code that's already minimal. Ponytail doesn't golf code that's already tight.

## Archestimator-specific operating model

### Default mode for new work

**`full`** — the ladder + the "not lazy about" list + the `ponytail:` convention. This is ponytail's default and the right default for Archestimator's pre-launch MVP pace.

### When to turn ponytail `off` for Archestimator work

- **Auth/RLS/session work** — ponytail preserves these automatically, but don't lean on it. Turn off so there's no chance of the ruleset influencing a security decision.
- **Data-integrity migrations** — same reasoning.
- **Hot-bug-fix turns** — fix minimally. Ponytail would ask "does this need to exist?" which is the wrong question for a bugfix.
- **Refactors already scoped and underway** — you've already made the design decisions. Ponytail would second-guess them.

### When to run `/ponytail-review`

- **Every PR that touches a Tier 2 mega-file** (see `05_TIER_2_MEGA_FILE_STRATEGY.md`). This is the ongoing discipline that prevents over-build recurrence.
- **Every PR that adds a new dependency.** Ponytail's ladder rung 4 asks "does an installed dep already do this?" — run the review to catch any dep that slipped through.
- **Every PR that adds a new wrapper/helper/util.** Ponytail asks "3+ callers?" before letting you abstract.

### When to run `/ponytail-audit`

- **Monthly** — to catch over-build that slipped through review.
- **Before a major refactor** — to know where the debt is.
- **When onboarding a new agent** — to show them where the over-engineering lives.

### The `ponytail:` comment in Archestimator

Use it when you intentionally take a shortcut with a known ceiling. Examples:

```typescript
// ponytail: O(n²) scan — fine for n<100 estimates; upgrade to Map if lists grow
const found = estimates.find(e => e.id === targetId);

// ponytail: no debounce — this input is admin-only, low traffic
const handleSearch = (q: string) => search(q);

// ponytail: localStorage — preference only, not critical; if it fails, defaults are fine
const prefs = localStorage.getItem("estimator-prefs");
```

Run `/ponytail-debt` periodically to surface these. When a ceiling is approaching (e.g., the O(n²) scan where n is growing), upgrade.

## Hooks (what runs at session start)

Ponytail ships 2 lifecycle hooks (in `~/.local/share/ponytail/hooks/claude-codex-hooks.json`):

1. **SessionStart** (matcher: `startup|resume|clear|compact`) — runs `ponytail-activate.js`, which logs the active mode and confirms the ruleset is loaded. Timeout: 5s. Gracefully skips if `node` isn't on PATH.
2. **UserPromptSubmit** — runs `ponytail-mode-tracker.js`, which tracks mode switches for the statusline. Timeout: 5s. Gracefully skips if `node` isn't on PATH.

**Codex requires explicit trust:** open Codex, run `/hooks`, review and trust the two ponytail hooks, start a new thread. Claude Code typically auto-trusts on install.

## Configuration reference

| Setting | Location | Default |
|---------|----------|---------|
| Default mode | `PONYTAIL_DEFAULT_MODE` env var OR `~/.config/ponytail/config.json` `defaultMode` | `full` |
| OpenCode state | `~/.config/opencode/.ponytail-active` | (written by `/ponytail` command) |
| OpenCode plugin | `~/.config/opencode/opencode.jsonc` → `plugin` array | registered 2026-06-21 |
| OpenCode commands | `~/.config/opencode/command/ponytail*.md` (symlinks) | linked 2026-06-21 |
| Claude plugin | `~/.claude/plugins/cache/ponytail/ponytail/4.7.0/` | installed 2026-06-21 |
| Codex plugin | `~/.codex/plugins/cache/ponytail/ponytail/4.8.2/` | **updated from 4.7.0 → 4.8.2** (confirmed 2026-06-24 audit; plan's original 4.7.0 claim is stale for Codex) |
| Ponytail clone | `~/.local/share/ponytail/` | cloned 2026-06-21 |

## Full ruleset text (verbatim, extracted from source)

The full ruleset text for each mode is above in § "Modes" — the shared body (injected in every active mode) plus the mode-specific intensity row and example. Key nuances that matter for planning:

### `off` is special

The activation hook (`ponytail-activate.js`) exits early before any injection when mode is `off`. It does NOT call `getPonytailInstructions('off')`. Operationally: **nothing is injected.** Not a "weaker ruleset" — nothing. This is why `off` is the right choice for auth/RLS/data-integrity work: there's no chance of the ruleset influencing a security decision.

### OpenCode injects on the next turn, not the same turn

The `experimental.chat.system.transform` hook reads the mode flag at the start of each turn. The `command.execute.before` hook writes the flag when you run `/ponytail <level>`. So if you run `/ponytail ultra` in message N, the ruleset is injected starting from message N+1 — not message N. If same-turn switching ever matters, the plugin notes suggest switching to a synchronous store.

### `review` is a persisted mode but not a runtime intensity

The config resolver accepts `off|lite|full|ultra|review` as valid values. `review` routes to the `/ponytail-review` skill — it is not a runtime intensity that injects a ruleset. The docs advertise `off|lite|full|ultra` as the four runtime modes. If you set `PONYTAIL_DEFAULT_MODE=review`, you get the review skill behavior, not an injected ruleset.

### Deactivation phrases

In addition to `/ponytail off`, the mode-tracker hook recognizes natural-language deactivation:
- `"stop ponytail"` in the prompt → reverts to `off`
- `"normal mode"` in the prompt → reverts to `off`

These are useful when you're mid-session and don't want to break flow to run a slash command.

### Boundaries (what ponytail does NOT govern)

- **Ponytail governs what you build, not how you talk.** It won't change your prose style, response length, or tone. It only governs code decisions.
- **Ponytail is not a linter.** It won't catch syntax errors, formatting, or import ordering. Use your project's linter for that.
- **Ponytail is not a test runner.** It won't run tests or verify behavior. It just shapes what code you write.

### Safety guarantees (what ponytail NEVER cuts)

Consolidated from the ruleset:

1. **Input validation at trust boundaries** — user input, external APIs, file uploads
2. **Error handling that prevents data loss** — never swallow an error that could lose user data
3. **Security** — auth, authz, sanitization, CSRF, XSS, SQL injection
4. **Accessibility basics** — ARIA, keyboard nav, focus management, semantic HTML
5. **Calibration real hardware needs** — the platform is never the spec ideal; clocks drift, sensors read off
6. **Anything explicitly requested** — if the user asked for X, build X
7. **The minimum runnable check for non-trivial logic** — ONE runnable check (assert-based demo/self-check or one small test file; no frameworks, no fixtures)
8. **Deactivation** — works only via standalone `stop ponytail` / `normal mode` / `/ponytail off`
9. **Level persistence** — level stays until changed or session ends
