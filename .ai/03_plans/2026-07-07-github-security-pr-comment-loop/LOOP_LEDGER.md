# GitHub Security PR Comment Loop Ledger

Last updated: 2026-07-07 09:47 Asia/Manila

## Master Goal

Resolve current GitHub security PR/comment findings for `pjel888/archestimator`, classify stale/outdated PRs before acting, and update local agent guidance so future agents do not repeat the same security mistakes.

## Source Authority

| Source | Evidence | Status |
| --- | --- | --- |
| Repo instructions | `AGENTS.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` | Loaded |
| GitHub PR inventory | `gh pr list --state open --limit 50 --json ...` | 20 open PRs found |
| GitHub PR comments | `gh api graphql` review-thread refresh across open PRs | 16 unresolved, non-outdated review threads found |
| GitHub issues | `gh issue list --state open --limit 50` | No open issues |
| Code scanning alerts | `gh api repos/pjel888/archestimator/code-scanning/alerts -f state=open` | 404 Not Found; unproven |
| Dependabot alerts | `gh api repos/pjel888/archestimator/dependabot/alerts -f state=open` | 404 Not Found; unproven |
| Secret scanning alerts | `gh api repos/pjel888/archestimator/secret-scanning/alerts -f state=open` | 404 Not Found; unproven |

## Open PR Inventory Snapshot

| PR | Title | State from live inventory | Initial classification |
| --- | --- | --- | --- |
| 105 | Remove D1 `created_by` authorization bypass | Open, conflicting, no unresolved review threads | Current D1 authz proposal; needs source triage before porting |
| 106 | fix(agents): avoid unpinned Supermemory startup | Open, conflicting, 1 unresolved P2 thread | Current finding; locally fixed this pass |
| 107 | fix(security): gate D1 project component rows with project access check | Open, mergeable, 1 unresolved P1 thread | Current finding; locally fixed this pass |
| 108 | fix: enforce D1 estimate read authorization | Open, conflicting, 2 unresolved P1 threads | Current authz finding; locally fixed this pass with whole-project lookup authz and sheet-only denial proof |
| 109 | Normalize share token in password route to prevent rate-limit/lockout bypass | Open, mergeable, 1 unresolved P2 thread | Current share-token finding; locally fixed this pass with page-level canonicalization plus API token trimming |
| 110 | Fix recipient proposal password gate bypass | Open, mergeable, no unresolved review threads | Current share/password finding; locally fixed this pass by enforcing password access cookies on interactive recipient POST routes |
| 111 | fix(cursor): pin Chrome DevTools MCP server | Open, mergeable, no unresolved review threads | Current tooling-pin finding; needs current-source verification |
| 112 | fix(security): avoid unpinned react-doctor execution | Open, conflicting, 1 unresolved P2 thread | Current tooling-pin finding; locally fixed this pass with repo-local binary command and no remote/latest fallbacks |
| 113 | docs: remove unpinned GitNexus install fallback | Open, mergeable, no unresolved review threads | Current docs/tooling finding; needs current-source verification |
| 114 | fix(library): require editor access for component mutations | Open, conflicting, 4 unresolved P2 threads, touches legacy Supabase migration | Mixed current UI/action concern plus stale-provider SQL; do not apply legacy Supabase migration, port current D1/server/UI checks only after triage |
| 115 | Harden workspace seed repair against tenant data cloning | Open, mergeable, 2 unresolved P2 threads, touches legacy Supabase migration | Stale-provider proposal; treat as migration archaeology unless current D1 seed repair exists |
| 116 | docs(security): redact archived public share tokens | Open, mergeable, no unresolved review threads | Current archive leak prevention candidate; locally fixed this pass with taxonomy and Markdown redaction scans |
| 117 | Enforce closed beta access in RLS helpers | Open, mergeable, no unresolved review threads, touches legacy Supabase migration | Likely stale-provider proposal after Cloudflare migration; re-map to current Better Auth/D1 beta gates before acting |
| 118 | Harden component library editor authorization | Open, mergeable, 2 P1 + 2 P2 unresolved threads, touches legacy Supabase migration | Stale-provider SQL plus current authorization concept; do not apply PR migration, audit current D1/component-library paths instead |
| 94, 95, 96, 100, 101 | Dependabot GitHub Actions PRs | Open, mergeable, no unresolved review threads | Blocked/stale while workflows are locally disabled under `.github/workflows-disabled/`; re-evaluate when CI is restored |
| 103, 104 | Dependabot npm dependency PRs | Open, mergeable, no unresolved review threads | Dependency triage still needed; do not combine with security fixes without package-risk review |

## Credential-Material Taxonomy

| ID | Material | Raw/hash/encrypted/derived/public marker | Storage and visibility | Runtime use | Rotation/revocation | Denial proof |
| --- | --- | --- | --- | --- | --- | --- |
| GH-116-SHARE-URL | Archived `/share/<token>` URL in planning/bug Markdown | Raw bearer-style public share token embedded in a URL path; not a hash, encrypted value, or harmless public ID | Plaintext repository archive under `.ai/09_archive/`; visible to anyone with repository access and to any downstream copy of the repo/archive | `/share/[token]` resolves a publication by hashing the raw token server-side; if the publication remains active, the URL path segment is sufficient to reach the shared proposal gate/content according to current publication settings | Redact committed archive copies. If the exposed publication is still active in a live environment, rotate/revoke the publication link because repository redaction cannot claw back prior clones, logs, or GitHub history | Scan concrete docs URLs matching `https?://.../share/[A-Za-z0-9_-]{32,}` before and after redaction; do not paste the raw token into reports |

## Action Ledger

| ID | Source | Finding | Decision | Fix/Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| GH-106-P2 | PR 106 unresolved review thread `PRRT_kwDOSfSDcs6OwyEZ` | PR required `./node_modules/.bin/supermemory` but did not add a locked package, making fresh-checkout startup always unavailable. | Add pinned local package and update canonical docs to require repo-local binary instead of unpinned registry execution. | Added `supermemory@4.24.12` to `devDependencies`/`bun.lock`; `./node_modules/.bin/supermemory local --help` exits 0 and exposes the local-server launcher. `rg` found no remaining `npm exec supermemory local` in shared adapter docs. | Locally fixed; GitHub thread not resolved yet |
| GH-107-P1 | PR 107 unresolved review thread `PRRT_kwDOSfSDcs6OwzE0` | `canAccessProjectInD1` includes `estimate_sheet_members`, so it is the wrong predicate for whole-project component projection rows. | Add a named whole-project authz helper that excludes estimate-only access and use it before loading project-wide rows. | `src/lib/authz/d1-access.ts`, `src/lib/component-library/project-component-projection.ts`, `tests/vitest/d1-access-role-boundaries.test.ts`, `tests/vitest/project-component-projection-d1.test.ts`; `bunx vitest run tests/vitest/d1-access-role-boundaries.test.ts tests/vitest/project-component-projection-d1.test.ts --maxWorkers=1` passed, 2 files / 10 tests. | Locally fixed; GitHub thread not resolved yet |
| GH-108-P1A | PR 108 unresolved review thread | New estimate-read authz path drops `project.created_by` fallback for auto-provisioned owner projects. | Use the existing whole-project D1 helper that preserves `project.created_by` while excluding estimate-only access. | `getCurrentWorkspaceProject` now calls `canAccessWholeProjectInD1(database, projectRow.id, context)`; `canAccessWholeProjectInD1` includes the `project.created_by = ?` fallback. Focused workspace/authz tests passed. | Locally fixed; GitHub thread not resolved yet |
| GH-108-P1B | PR 108 unresolved review thread | `getCurrentWorkspaceProject` is used by project-wide readers, but the proposed gate still admits sheet-only collaborators through `canAccessProjectInD1`. | Gate project-wide lookup with `canAccessWholeProjectInD1`; keep estimate-specific access filtering on estimate list/sheet paths. | `src/lib/repositories/workspace-repository.ts`, `tests/vitest/workspace-repository-authz-behavior.test.ts`, `tests/vitest/workspace-repository-authz-contract.test.ts`; sheet-only fake membership now returns `project: null`, skips project sheet listing, and the project lookup probe excludes `estimate_sheet_members`. | Locally fixed; GitHub thread not resolved yet |
| GH-109-P2 | PR 109 unresolved review thread | POST normalizes share password token but share page/cookie verification can still use the padded route param, trapping recipients behind the gate. | Canonicalize padded `/share/[token]` page requests before cookie checks and trim route tokens across password/session/comment/decision APIs. | `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/password/route.ts`, `src/app/api/share/[token]/session/route.ts`, comment/decision routes, and publication route/page tests. Focused publication tests passed. | Locally fixed; GitHub thread not resolved yet |
| GH-110-CURRENT | PR 110 | Recipient proposal sessions could be minted before password unlock, and interactive comment/decision POST routes only checked recipient session cookies. | Preserve recipient session UX but require the publication password access cookie on comment/decision POST before session verification. | `src/app/api/share/[token]/comment/route.ts`, `src/app/api/share/[token]/decision/route.ts`, `tests/vitest/project-publication-comments.test.tsx`, `tests/vitest/project-publication-decision.test.tsx`; focused publication tests passed. | Locally fixed; PR not updated/resolved yet |
| GH-112-P2 | PR 112 unresolved review thread | `bun run doctor` can fall through to a global/stale `react-doctor` when local dev deps are absent. | Point the package script at `./node_modules/.bin/react-doctor`, remove global/`pnpm dlx`/`npx` hook fallbacks, and update duplicate React Doctor skill docs to use `bun run doctor -- ...`. | `package.json`, `.claude/hooks/react-doctor.sh`, `.agents/.claude/.commandcode/.vibe` React Doctor skill docs; `bun run doctor -- --help` resolved the local binary and printed help. Unsafe-command `rg` returned no matches. | Locally fixed; GitHub thread not resolved yet |
| GH-116-CURRENT | PR 116 | Archived `.ai/09_archive/` Markdown contained concrete public share URLs with raw bearer-style token path segments. | Redact concrete archived share URLs to `SHARE_TOKEN_PLACEHOLDER` and record credential-material taxonomy without copying raw token evidence. | Six archive Markdown files now use `http://localhost:3000/share/SHARE_TOKEN_PLACEHOLDER`; scans for the specific exposed value and concrete `http(s)://.../share/<long-token>` Markdown URLs returned no matches. | Locally fixed; PR not updated/resolved yet |
| GH-114-MIXED | PR 114 unresolved review threads | UI/server action editor-gating concerns are current, but the PR also edits legacy `supabase/migrations/`. | Do not apply the Supabase migration directly; port only current D1/server/UI capability gates after source triage. | Live GraphQL found 4 unresolved P2 threads: acting-user Supabase RPC fallback, read-only default UI prop, folder mutation controls, and lifecycle RPC hardening. | Classified mixed/current plus stale-provider |
| GH-115-STALE | PR 115 unresolved review threads | Tenant seed repair is expressed only as a legacy Supabase migration and its own reviewers found taxonomy/supplier regressions. | Treat as stale-provider migration archaeology unless a current D1 seed repair surface is found. | Live GraphQL found 2 unresolved P2 threads. | Classified stale-provider proposal |
| GH-118-STALE | PR 118 unresolved review threads | Component-library editor hardening is expressed as a legacy Supabase migration and reviewers identified migration-breaking/function-regression issues. | Treat SQL as stale-provider proposal; audit current D1/component-library authorization instead of applying it. | Live GraphQL found 2 P1 and 2 P2 unresolved threads. | Classified stale-provider proposal |
| PREVENT-001 | Active user request + verifier lane | AGENTS.md lacked a GitHub security PR/comment loop protocol. | Add explicit loop protocol to `AGENTS.md`. | `AGENTS.md` now requires live GitHub inventory, ledger entry per PR/comment/alert, stale classification, hosted-control proof boundaries, credential-material taxonomy, and redacted evidence. | Locally fixed |

## Validation Log

| Command | Result | Evidence |
| --- | --- | --- |
| `gh pr list --state open --limit 50 --json ...` | Pass | 20 open PRs, including PRs 105-118 and dependency PRs |
| `gh api graphql ... reviewThreads(first:100)` | Pass | 16 unresolved, non-outdated review threads across PRs 106, 107, 108, 109, 112, 114, 115, and 118 |
| `gh issue list --state open --limit 50 --json ...` | Pass | Empty open issue list |
| `gh api .../code-scanning/alerts -f state=open` | Failed closed | 404 Not Found |
| `gh api .../dependabot/alerts -f state=open` | Failed closed | 404 Not Found |
| `gh api .../secret-scanning/alerts -f state=open` | Failed closed | 404 Not Found |
| `bunx vitest run tests/vitest/d1-access-role-boundaries.test.ts tests/vitest/project-component-projection-d1.test.ts --maxWorkers=1` | Pass | 2 files / 10 tests |
| `bunx vitest run tests/vitest/workspace-repository-authz-behavior.test.ts tests/vitest/workspace-repository-authz-contract.test.ts tests/vitest/d1-access-role-boundaries.test.ts --maxWorkers=1` | Pass | 3 files / 22 tests |
| `bunx vitest run tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/recipient-proposals-action.test.ts --maxWorkers=1` | Pass | 5 files / 132 tests |
| `bunx vitest run tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/share/share-page-get-routes-contract.test.ts --maxWorkers=1` | Pass | 2 files / 20 tests |
| `./node_modules/.bin/supermemory local --help` | Pass | Local-server launcher help printed without registry execution |
| `rg -n "npm exec supermemory local\|npx .*supermemory" ...` | Pass | No unpinned Supermemory startup remained in shared adapter docs |
| `bun run doctor -- --help` | Pass | Package script invoked `./node_modules/.bin/react-doctor --help` and printed local CLI help |
| `rg -n "npx .*react-doctor\|pnpm dlx react-doctor\|command -v react-doctor\|^[[:space:]]*react-doctor --\|\\\"doctor\\\": \\\"react-doctor\\\"" ...` | Pass | No unsafe React Doctor execution path remained in package script, hook, or duplicated skill docs |
| `rg -n <redacted exposed share token> .ai/09_archive docs README.md AGENTS.md --glob '*.md'` | Pass | No remaining occurrence of the specific exposed public share token |
| `rg -n 'https?://.../share/[A-Za-z0-9_-]{32,}' .ai/09_archive docs README.md AGENTS.md --glob '*.md'` | Pass | No remaining concrete long-token HTTP share URLs in scanned Markdown docs |
| `bun run validate:agents` | Pass | AI workflow validation passed |
| `git diff --check -- <changed security-loop files>` | Pass | Scoped whitespace check clean |
| `bun run type-check` | Failed closed | Node 26 process hit default 2GB heap and aborted before diagnostics |
| `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check` | Pass | TypeScript completed with no diagnostics after the D1, workspace-authz, and publication-route edits |

## Remaining Work

- PR 106/107/108/109/110/112/116 local fixes are not pushed to the PR branches, so their GitHub review threads/PRs remain unresolved by policy.
- Resolve or reply to PR 106/107/108/109/110/112/116 only after deciding whether this current worktree will be pushed to a PR or used to update the existing branches.
- Continue implementation triage for 105, 111, 113, and dependency PRs. Pay special attention to the remaining D1 authz and tooling-pin surfaces.
- For 114, 115, 117, and 118, do not apply legacy `supabase/migrations/` changes as active remediation; re-map any still-current authorization/seed concerns to D1/current source first.
- Obtain hosted GitHub security-control readback with a token/installation that can read code-scanning, Dependabot alerts, secret scanning, branch protection/rulesets, environments, and `SECURITY.md`.
