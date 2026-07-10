# 00 — Agent Coordination

## Master goal

Prove and enforce that the **only** way a user reaches any protected
Archestimator surface (the workshop dashboard and everything under `/workshop`,
all data-returning/mutating Server Actions, all `/api/*` data handlers) is by
authenticating through Better Auth (Google OAuth or magic-link email). The
landing page and other intentionally-public pages must remain the sole
unauthenticated entry points. Enumerate every attack vector, close the gaps, and
prove the closures with denial tests and hosted evidence.

**Scope:** access-control audit + targeted hardening of the auth layer. NOT a
redesign of the auth architecture (Better Auth + Cloudflare D1 + Cloudflare
Email is the chosen stack and stays).

**Non-goals:**
- Replacing Better Auth with a different auth library.
- Adding password-based login (explicitly disabled by design — Google + magic link only).
- Changing the Cloudflare resource boundary or provider.
- Modifying landing-page or workshop UI content/markup.
- Migrating to a different session store.

## Orchestration model used

This pack was produced by a **lead-coordinator + parallel read-only exploration
lanes** model. Four independent exploration subagents audited disjoint auth
surfaces concurrently, returning concrete file paths, line numbers, and code
excerpts. The lead synthesized findings, directly re-verified the two
load-bearing files (`request-proxy.ts`, `better-auth-cloudflare.ts` magic-link
config), and wrote all planning documents.

| Lane | Role | Scope | Status | Native? |
|---|---|---|---|---|
| Lead coordinator | Scope, synthesis, plan authorship, final review | All | Complete | — |
| Lane A — Route gates | Middleware + route tree + public/protected classification | `src/middleware.ts`, `src/lib/auth/request-proxy.ts`, `src/app/**` route tree | Complete | Native subagent |
| Lane B — Better Auth config | Server config, session, Google OAuth, magic link, plugins, env | `src/lib/auth/**`, `src/app/api/auth/**`, D1 auth tables | Complete | Native subagent |
| Lane C — Actions & API handlers | Every Server Action + every Route Handler auth check | `src/lib/**/actions.ts`, `src/app/api/**` | Complete | Native subagent |
| Lane D — DB schema & tokens | Auth D1 tables, token storage, credential hashing, app-authz | `migrations/**`, `src/lib/authz/**`, token/credential code | Complete | Native subagent |
| Adversarial reviewer | Challenge findings, find omissions | Cross-cutting | Emulated by lead | — |
| Final verifier | Requirement-by-requirement audit | All | Emulated by lead | — |

## Coordination ledger

| Agent/Lane | /goal | Owned scope | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|
| Lane A | Map route-gate surface | middleware, route tree | none | 4-layer gate model; matcher correct; 2 minor cache nits | none | Complete |
| Lane B | Map Better Auth config | auth config, sessions, OAuth, magic link | none | Google+magic-link only, no password; no Better Auth client; cookieCache disabled; magic-link under-configured vs proof | Cross-confirms Lane D's plaintext-token finding | Complete |
| Lane C | Audit every Action + API handler | actions.ts files, api routes | none | No P0 bypass; 1 ⚠️ action-layer nit (loadRecipientProposals); all API routes checked or intentionally-bounded public | none | Complete |
| Lane D | Auth DB schema + tokens | migrations, token storage, authz | none | **P0: magic-link tokens plaintext**; BA core tables not in migration pipeline; 8 repos lack internal authz; no SQL injection | Confirms Lane B's under-configured finding | Complete |
| Lead | Synthesize + write pack | all planning docs | Lanes A–D | P0 + 8 P1/P2 items consolidated | none | Complete |

## Skills and repo instructions used

| Skill/Doc | Used? | Why |
|---|---|---|
| `AGENTS.md` | Yes | Fast-path current state, Cloudflare mandate, verification policy, plan-pack guidance |
| `archestimator-plan-pack` skill | Yes | Plan-pack vs in-session-loop decision (this is high-blast-radius → plan pack required) |
| `Creating-Plan-Prompt.md` | Yes | Exhaustive plan structure + readiness rubric |
| `Multi-Agent-Execution-Directive.md` | Yes | Authority model, evidence classes, verification caps |
| Cloudflare skill | Read-only reference | D1/auth binding boundary (no provider action taken) |
| `ultraqa` / `code-review` / `gitnexus-exploring` | Not invoked by name | Their concepts (adversarial matrix, impact analysis) are reflected in the plan content; the parallel exploration lanes fulfilled the same purpose |

**No skill was fabricated. No capability was claimed without verification.**

## Concurrent-repo safety

The plan-pack directory `.ai/03_plans/2026-07-09/Landing-Page-Auth-Security-Layer/`
is the only write scope. `git status` showed unrelated in-flight edits in the
`2026-07-08/` pack and other `2026-07-09/` subdirs — those were **not touched**.
All source reads were read-only. No application code, tests, migrations, or Git
state was modified to produce this pack.

## Stop conditions

- ✅ All lanes complete → synthesized into plan.
- ⏸ If phase 1 hashing reveals a Better Auth version incompatibility not visible
  in current source → BLOCKED-EXTERNAL (owner + Better Auth version check).
- ⏸ If the owner decides to keep plaintext magic-link tokens intentionally →
  record decision and demote P0 to accepted risk (owner decision).
