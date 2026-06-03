# Requirements and Acceptance Criteria

## Functional requirements

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FR-001 | MUST | `.ai` remains canonical project brain. | Every future tool-specific instruction points to `.ai/00_system` and `.ai/12_agents`; no competing source-of-truth is created. |
| FR-002 | MUST | `AGENTS.md` remains thin repo entrypoint. | Future changes add only pointers/reading order and do not duplicate all policy. |
| FR-003 | MUST | `.ai/12_agents/payloads` becomes thin but operationally enforceable. | Each payload follows schema in `26_AGENT_PAYLOAD_STANDARDIZATION_PLAN.md`. |
| FR-004 | MUST | Missing Hermes/Cursor/Ollama-policy payload decisions are resolved. | Either files are created as thin payloads/prohibition notes or docs remove them from active roster. |
| FR-005 | MUST | Deprecated Gemini is fail-closed. | `gemini.md`, `GEMINI.md`, and `.gemini` state handling all say Gemini is deprecated unless Philip reapproves. |
| FR-006 | MUST | `.agents/` is handled without drift. | If kept, `.agents/README.md` is a thin compatibility shim to `.ai`; skills remain playbooks, not an alternate brain. |
| FR-007 | MUST | Agent preflight is enforceable. | Every prompt/payload demands safety checks, source-of-truth read, scope/non-goals, validation gates, and mode declaration. |
| FR-008 | MUST | Runtime multi-agent rules are enforceable. | Disjoint write scopes, worktree isolation, leader-owned integration, dirty-worktree handling, and conflict detection are documented. |
| FR-009 | MUST | Evidence protocol is enforceable. | Run logs capture branch/commit, commands, graph evidence, tests, provider proof boundaries, bugs, `.ai` updates, and final report. |
| FR-010 | MUST | Notion remains mirror-only. | No Notion page/database may be cited as repo implementation truth over `.ai`/source/test evidence. |
| FR-011 | MUST | GitHub and CI hardening is staged. | Advisory/dry-run first; rulesets/protection/required checks require approval before enforcement. |
| FR-012 | MUST | Provider/GitHub/admin claims require proof. | Agents may not claim provider state from local evidence or plan text. |

## Agent-specific requirements

| Agent/harness | Status target | Primary lane | Requirements |
|---|---|---|---|
| Codex | Approved | implementation/tests/PR diffs | Must run safety preflight, graph checks, TDD where source changes, validation, `.ai` updates, no provider mutations without approval. |
| Claude / Claude Code | Approved | planning/architecture/review/writing | Must read `.ai`, use hooks/settings safely, avoid source edits unless explicitly assigned, record evidence. |
| OpenCode | Approved/conditional | exploration/fallback/review | Must verify installed schema before config changes; no config drift from `.ai`. |
| CommandCode | Approved/conditional | taste/review/sentinel lanes | `.commandcode/agents` must be subordinate to `.ai`; sentinels are reviewers unless implementation is explicitly assigned. |
| Kimi | Approved/conditional | UI/product/long-context | UI-capable changes must follow `DESIGN.md` and design-system lint. |
| Antigravity CLI / `agy` | Approved | isolated terminal lane | Must use branch/worktree isolation for edits; extra terminal lane replaces Gemini. |
| DeepSeek | Approved/conditional | debug/logic critique | Default read-only/diagnostic; implementation only with explicit assignment and validation. |
| Hermes | Listed but missing payload | orchestration/evidence | Must get payload or be removed from active roster; cannot orchestrate without run-log/concurrency rules. |
| Cursor | Local MCP only/conditional | editor support/review | Create rules only if approved; `.cursor/mcp.json` currently only configures code-review-graph. |
| Gemini | Deprecated | none | Fail closed unless Philip explicitly reapproves for a task. |
| Ollama | Non-agent | embeddings only | No chat/planning/coding via Ollama unless Philip explicitly approves and documents it. |
| GitNexus/code-review-graph | Intelligence harness | graph/evidence | Use before broad grep and before code-symbol edits; record CLI/tool failures honestly. |

## Non-functional requirements
- Lean startup velocity: minimal ceremony, small branches, fast checks, dry-run before enforcement.
- Security: no secrets, no provider/admin mutations, no destructive commands, no long-lived deployment secrets when OIDC/provider-native safe flow is available and approved.
- Performance: keep CI fast for feature branches and fuller for beta/main/release.
- Accessibility/UI: N/A for the docs-only framework itself, but future internal dashboards must follow `DESIGN.md` and `07_UI_UX_AND_ACCESSIBILITY_PLAN.md`.
- Compatibility: all tools must tolerate `.ai` as source of truth; no duplicated policy forks.

## Non-goals
- Do not implement source behavior, migrations, providers, GitHub settings, Notion, package files, dependencies, or generated files in this plan-refinement task.

## Pass/fail
Pass if a future implementation agent can execute Phase 1 without asking for missing schema/routing/run-log/concurrency/compliance requirements. Fail if any agent/harness lane lacks status, role, scope, validation, or evidence rules.
