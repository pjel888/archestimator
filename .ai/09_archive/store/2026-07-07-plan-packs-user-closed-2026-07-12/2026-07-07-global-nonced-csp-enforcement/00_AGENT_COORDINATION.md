# 00 — Agent Coordination

Plan folder: `.ai/03_plans/2026-07-07-global-nonced-csp-enforcement/`
Date: 2026-07-07
Plan profile: `exhaustive` (high-blast-radius security: CSP enforcement affects every route, auth surfaces, public share/invite token URLs, and the OpenNext/Cloudflare Workers runtime).
Planning scope: **planning only**. No application code, tests, migrations, or config is modified by this pack.

## Master goal

Move Archestimator from its current **partial / Report-Only CSP posture** toward a
**globally enforced, per-request-nonced Content-Security-Policy** suitable for first
users, delivered as a phased rollout with proof and rollback points at every phase.

**Outcome:** every user-facing HTML route enforces a strict CSP that blocks injected
scripts/styles, while first-party inline scripts (Next.js runtime, `next/script`,
JSON-LD, the auth-state-mismatch recovery script) run via a per-request nonce instead
of the blanket `'unsafe-inline'` / `'unsafe-eval'` allowances shipped today.

**Problem being solved:**
1. Most routes ship CSP as `Content-Security-Policy-Report-Only` with `'unsafe-inline'`
   and `'unsafe-eval'` in `script-src` — a Report-Only header does not stop a single
   injected script.
2. The enforced exception (`/share/:path*`) still carries `'unsafe-inline'` /
   `'unsafe-eval'`, so even the "enforced" surface is not actually strict.
3. Several public HTML routes (`/login`, `/signup`, `/access-required`, `/auth/callback`,
   `/api/auth/*`) have **no CSP at all** — only the catch-all hardening headers.
4. There is **no per-request nonce pipeline** anywhere in the repo (`grep` confirms
   zero `nonce` usage; no `x-nonce` header; no nonce-aware `<Script>` props).
5. The deferral is explicitly recorded as decision **D-9** and **OPEN-DEC-007** in
   `.ai/10_state/`, gated on "a separate implementation plan before changing the
   enforcement surface." **This pack is that plan.**

**Planning scope (what this pack covers):**
- Current CSP matrix by route class (audited, line-referenced).
- Nonce plumbing approach for Next.js 16 + OpenNext/Cloudflare Workers (proxy-based).
- Third-party / script / style allowances (full inventory).
- Report-Only → enforced rollout phases with proof gates.
- Regression tests, adversarial matrix, CSP violation reporting endpoint design.
- Rollback points for every phase.

**Non-goals (explicitly out of scope):**
- Implementing the policy (planning only; `Creating-Plan-Prompt` is strictly planning).
- Adding Trusted Types (`require-trusted-types-for 'script'`) — deferred as too risky
  for a first-users iteration (see DEC-09).
- Removing `'unsafe-inline'` from `style-src` — the modern Next.js posture keeps
  `style-src 'self' 'unsafe-inline'` because React-rendered `<style>` tags cannot be
  nonced natively (see DEC-08). This is explicitly the recommended exception.
- Migration archaeology (Supabase/Postgres/Vercel/Resend) — irrelevant; CSP is a
  Cloudflare/Next surface.
- Migrating demo seed `imageUrl` hosts (Unsplash/IKEA/Boysen etc.) to local
  thumbnails — flagged as a pre-requisite decision but not planned here (see DEC-12).
- Any D1/R2/DO/Queue/Email schema or binding change. CSP is response-header work; it
  does not touch the data plane.

**Required codebase analysis:** covered by `03_SOURCE_AND_CODEBASE_AUDIT.md`.

**Required specialist workstreams:** product/scope, codebase architecture,
Next.js/React rendering, security/threat-model, performance/reliability,
testing/QA, rollout/operations, blast radius, adversarial review, final
verification. See lane table below.

**Implementation-readiness criteria:** see `17_FINAL_READINESS_REVIEW.md`.

**Validation criteria:** see `12_TEST_AND_VALIDATION_STRATEGY.md` (Test Execution
Matrix) and `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` (rollout gates).

**Final planning deliverables:** the 00–19 document set + README + LOOP_LEDGER
contained in this folder.

**Stop condition (for planning):** the pack lets an executor implement CSP hardening
in phases with clear proof and rollback points, with no internally-resolvable
critical gap remaining. Implementation-readiness verdict recorded in README +
`17_FINAL_READINESS_REVIEW.md`.

## Authority model

- User intent (PROMPT.md) → product goal.
- Current source (`next.config.ts`, `src/proxy.ts`, `src/lib/auth/request-proxy.ts`,
  `src/app/layout.tsx`, `worker.ts`, `package.json`, `wrangler.jsonc`) → reality.
- **Local installed Next.js 16 docs** (`node_modules/next/dist/docs/01-app/02-guides/
  content-security-policy.md`) → version-sensitive nonce/proxy/CSP behavior.
  This is the single most load-bearing external source for the plan.
- `.ai/10_state/decisions.md` D-9 / D6 + `.ai/10_state/compliance/csp-decision-brief.md`
  OPEN-DEC-007 / OPEN-DEC-008 → prior decisions this plan reconciles and closes.
- Older model memory about Next.js 13/14 middleware → **discard** (Next 16 renames
  `middleware.ts` → `proxy.ts`; the nonce guide is explicit about this).

## Skills discovered and used

| Skill / directive | Why relevant | Used? |
|---|---|---|
| `archestimator-plan-pack` | Binds planning to `.ai/03_plans/<date>-<slug>/` + `LOOP_LEDGER.md` convention; classifies plan-pack vs in-session loop. CSP enforcement is high-blast-radius → plan pack required. | Yes |
| `Creating-Plan-Prompt.md` | Authoritative exhaustive-plan-pack structure (00–19 + README). | Yes |
| `Multi-Agent-Execution-Directive.md` | Coordination ledger, verification-mode labels, concurrent-repo safety. | Yes |
| `AGENTS.md` | Shared-worktree policy (no auto-branch), standing Cloudflare authorization (not needed — no provider mutation), verification proportionality. | Yes |
| Local Next.js 16 CSP doc | The nonce/proxy pattern is framework-version-sensitive. | Yes (read in full) |
| GitNexus / code-review-graph | AGENTS.md says these are subordinate; narrow local edits (CSP is route-header work) do not require graph impact analysis. | Intentionally not used (proportional policy) |
| `cloudflare` skill | Retrieval-first; wrangler.jsonc read confirms no headers[] block, no interference. Not needed for a header-only plan. | Skipped (no provider mutation) |

No skills were fabricated. Unavailable capabilities: none relevant.

## Multi-agent orchestration (emulated specialist passes + dispatched discovery)

This pack was produced by a **lead coordinator** (this agent) using **four dispatched
read-only discovery lanes** (Explore/general-purpose subagents) plus **emulated
specialist passes** for the synthesis/review workstreams. Native subagents were used
for discovery; the adversarial and final-verification passes are emulated because no
separate reviewer lane was dispatched for them.

### Lane table

| Lane | Role | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead coordinator | Scope, synthesis, integration, final claim | Whole pack | This folder | All lanes | Synthesis | — | COMPLETE |
| Discovery L1 (Explore) | Route inventory + CSP application matrix | `src/app/**` + `next.config.ts` headers() | route table, gap list | none | 7 route classes, CSP matrix, 6 gap classes | none | COMPLETE |
| Discovery L2 (general) | Script/style/3rd-party loading audit | all `<script>`, `next/script`, inline styles, fetch origins | per-directive origin table | none | 8 inline-script sites, no CSS-in-JS, missing `wss:` connect-src, seed-host img-src gap | none | COMPLETE |
| Discovery L3 (general) | Existing CSP tests + proxy/middleware + nonce plumbing feasibility | `tests/**`, `src/proxy.ts`, `request-proxy.ts`, `instrumentation.ts`, `worker.ts`, `open-next.config.ts`, `wrangler.jsonc` | test inventory, proxy pattern, OpenNext compat | none | 8 CSP test files, no nonce infra, proxy is the nonce site, header-ownership conflict | none | COMPLETE |
| Discovery L4 (general) | Next.js 16 + OpenNext + CSP best-practices research | local docs + official docs + web | cited research report | none | nonce pattern confirmed, static-page nonce problem, `strict-dynamic`, reporting API | none | COMPLETE |
| Emulated: Product/scope | Requirements extraction | PROMPT.md + audit | `02`, `04` | L1–L4 | scope/non-goals | — | COMPLETE |
| Emulated: Architecture | Target-state design | proxy + layout + worker | `06` | L1–L4 | nonce pipeline, header ownership, route-class policies | — | COMPLETE |
| Emulated: Security/threat-model | Threat model + attack surface | CSP bypass vectors | `08` | L2 | nonce-guess, header-injection, static-cache, reporting gaps | — | COMPLETE |
| Emulated: Performance/reliability | Dynamic-rendering cost, cache impact | rendering + cache | `09` | L3, L4 | marketing pages lose static caching | — | COMPLETE |
| Emulated: Test/QA | Test matrix + adversarial | tests/ + scripts | `12` | L3 | rewrite 4 tests, new proxy-unit tests, browser proof | — | COMPLETE |
| Emulated: Rollout/ops | Phases + rollback | deploy + observability | `13` | L4 | Report-Only→Enforced rings, rollback | — | COMPLETE |
| Emulated: Adversarial reviewer | Disprove readiness | whole pack | critique cycle notes in `19` | all | see critique log | — | COMPLETE |
| Emulated: Final verifier | Requirement-by-requirement audit | whole pack | `17` | all | verdict + scores | — | COMPLETE |

**Verification mode:** `verification_mode: emulated`. The discovery lanes are
independent native subagents (separate tool outputs), but the adversarial review and
final verification were performed as separated passes by the lead agent because no
separate reviewer subagent was dispatched. Per the suite authority contract, this caps
overall readiness at **97** and, for a high-blast-radius planning package, caps package
status at `CONDITIONALLY READY` unless an independent reviewer or explicit owner
acceptance later approves the final package. This cap is applied in README and
`17_FINAL_READINESS_REVIEW.md`.

## File/module ownership model (for future implementation)

The future implementation will touch these disjoint file scopes. They are listed here
so concurrent agents can claim leases during execution (not during this planning task):

- `next.config.ts` — remove CSP strings for nonced routes; keep hardening headers.
- `src/proxy.ts` + `src/lib/auth/request-proxy.ts` — nonce generation + CSP response
  header + `x-nonce` request header. **Shared critical path** (auth gating already
  lives here) — serialize, do not split across two agents.
- `src/app/layout.tsx` — become `async`, `await headers()`, read `x-nonce`, propagate.
- `src/components/auth/AuthStateMismatchRecoveryScript.tsx`,
  `src/components/landing/{CloudflareWebAnalytics,ClarityScript,LandingAnalyticsLoader}.tsx`,
  `src/components/landing/structured-data.tsx`,
  `src/components/landing-v3/ArchestimatorLandingPage.tsx`,
  `src/app/workshop/pending-invite/route.ts`,
  `src/lib/cloudflare/worker-route-optimizations.ts` — accept + attach nonce.
- `src/lib/csp/` (new) — policy builders, route-class selector, nonce util.
- `src/app/api/csp-report/route.ts` (new) — violation reporting endpoint.
- `tests/vitest/*` — rewrite 4 existing CSP tests + add new proxy/nonce tests.

## Stop condition for planning

The pack is complete when: every PROMPT.md requirement has a corresponding document
section, every requirement is traceable (16), the implementation plan names exact
paths/symbols (11), the threat model and adversarial matrix cover bypass vectors (08,
12), rollback points exist per phase (13), and the final readiness review records the
verdict + verification mode + scores (17). Residual external decisions are explicitly
isolated (DEC-12 seed-host migration, OPEN-DEC owner acceptance).

## Concurrent-repository safety acknowledgment

All writes in this task are confined to
`.ai/03_plans/2026-07-07-global-nonced-csp-enforcement/`. No application code,
tests, migrations, config, or Git state was modified. The working tree had
pre-existing uncommitted changes (sidebar, estimates, D1 plan docs) — none touch CSP
surfaces and none were touched by this task.
