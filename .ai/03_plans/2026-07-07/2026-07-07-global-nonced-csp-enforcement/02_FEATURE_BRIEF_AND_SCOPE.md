# 02 — Feature Brief and Scope

## Feature brief (source: PROMPT.md)

> Create a security plan pack for moving Archestimator from partial/report-only CSP
> toward global enforced, nonced CSP suitable for first users.

Evidence to start from (quoted from PROMPT.md):
- `next.config.ts` defines CSP policies with `unsafe-inline`/`unsafe-eval` allowances
  in some paths.
- `next.config.ts` comments defer per-request nonce plumbing for workshop/invite
  routes.
- The catch-all hardening block omits CSP for many routes.
- Public share CSP is stronger than some app surfaces, creating inconsistent security
  posture.

Required plan pack contents:
- Current CSP matrix by route class.
- Nonce plumbing approach for Next.js 16 / OpenNext / Cloudflare.
- Third-party / script allowances.
- Report-only rollout.
- Enforcement phases.
- Regression tests.
- CSP violation evidence.

Constraints:
- Read relevant Next.js 16 docs before implementation planning where behavior is
  uncertain.
- Do not break Cloudflare deployment compatibility.

Stop condition: the pack should let an executor implement CSP hardening in phases with
clear proof and rollback points.

## Source strength for each brief item

| Brief item | Source strength | Evidence |
|---|---|---|
| CSP matrix | `repo evidence` | `next.config.ts:20-47, 154-288` (read in full) |
| Nonce plumbing deferral | `repo evidence` + `decision` | `next.config.ts:178-179, 230-236`; `.ai/10_state/decisions.md:99,1004` (D-9, D6); `.ai/10_state/compliance/csp-decision-brief.md` (OPEN-DEC-007) |
| Catch-all omits CSP | `repo evidence` | `next.config.ts:266-279` (`globalHardeningCatchAll` has no CSP) |
| Share stronger than app | `repo evidence` | `/share` enforced (`:191-206`), workshop/invite Report-Only (`:237-257`) |
| Next.js 16 nonce approach | `official docs` | `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` (read in full) |
| OpenNext/Cloudflare compat | `official docs` + `repo evidence` | `wrangler.jsonc` (no headers[]), `open-next.config.ts` (no overrides), `worker.ts:85-100` (response wrapper), `@opennextjs/cloudflare ^1.20.1` |

## In scope

1. **CSP matrix by route class** — current state (audited, line-referenced in `03`) and
   target state per route class (`06`).
2. **Nonce pipeline** — generation in proxy, propagation via `x-nonce` request header
   + `Content-Security-Policy` response header, consumption in root layout and inline
   scripts (`06`, `11`).
3. **Third-party / script / style allowances** — complete inventory with target
   directive values (`03`, `06`, `18`).
4. **Report-Only rollout** — observation window, reporting endpoint, telemetry gate
   (`11` P1, `13`).
5. **Enforcement phases** — five phases, each with proof gate + rollback (`11`, `13`).
6. **Regression tests** — Test Execution Matrix + adversarial scenario matrix (`12`).
7. **CSP violation evidence** — `/api/csp-report` endpoint design, `Reporting-Endpoints`
   header, telemetry contract (`06`, `11`, `13`).
8. **Cloudflare/OpenNext compatibility** — confirmed no interference; worker.ts response
   wrapper as fallback injection point (`06`).
9. **Static-page nonce problem** — analysis + per-route-class resolution (`06`, `09`).

## Non-goals (explicit)

- **Implementing the policy.** This is a planning pack only.
- **Trusted Types** (`require-trusted-types-for 'script'`). Too risky for a first-users
  iteration; deferred (DEC-09). It would break third-party scripts (GA4/Clarity) and
  needs a separate, larger rollout.
- **Removing `style-src 'unsafe-inline'`.** React-rendered `<style>` tags cannot be
  nonced natively; the official Next.js posture keeps `style-src 'self' 'unsafe-inline'`
  (DEC-08). Removing it is not an objective of this plan.
- **Removing all `'unsafe-eval'`** in development. The official Next.js CSP doc is
  explicit: `'unsafe-eval'` is required in dev because React uses `eval` for error
  stack reconstruction. Production target omits it; dev keeps it (DEC-07).
- **Migrating demo seed `imageUrl` hosts** (Unsplash/IKEA/Boysen/etc. in
  `estimate-tree-data.ts`) to local thumbnails. Flagged as a pre-requisite owner
  decision (DEC-12) but the migration itself is not planned here.
- **Adding new third-party origins.** OPEN-DEC-008 says no new sources without a brief
  + test update. This plan respects that.
- **Migration archaeology** (Supabase/Postgres/Vercel/Resend). CSP is a Next/Cloudflare
  surface; legacy providers are irrelevant.
- **Data plane changes.** D1/R2/DO/Queue/Email schema, bindings, migrations: none
   required. CSP is response-header work only.
- **Git branch / worktree creation.** Per `AGENTS.md` shared-worktree policy.

## Scope boundaries

| Boundary | In / out | Reason |
|---|---|---|
| `next.config.ts` CSP strings | In (modified during implementation) | Move CSP out of `headers()` for nonced routes; keep hardening headers |
| `src/proxy.ts` + `src/lib/auth/request-proxy.ts` | In | Nonce site; serialize with existing auth logic |
| `src/app/layout.tsx` | In | Read nonce, propagate |
| Inline script components (8 sites) | In | Attach nonce prop |
| `src/lib/csp/` (new) | In | Policy builders, route-class selector |
| `src/app/api/csp-report/route.ts` (new) | In | Violation reporting endpoint |
| `tests/vitest/*` (4 existing CSP tests) | In | Rewrite for proxy-owned CSP |
| `worker.ts` response wrapper | Optional fallback only | Not the primary path |
| `wrangler.jsonc` | Out | No headers[] today; no change needed |
| `open-next.config.ts` | Out | No overrides today; no change needed |
| D1 / R2 / DO / Queue / Email | Out | Data plane untouched |
| `DESIGN.md` / UI primitives | Out | CSP is header work, not visual |
| Supabase / legacy migrations | Out | Irrelevant |

## Success metrics (planning-level)

- Every route class has a documented current CSP state and target CSP state.
- Every inline script site has a documented nonce-attachment plan.
- Every phase has a proof gate and a one-command rollback.
- The Test Execution Matrix maps every requirement to a concrete test + command.
- The adversarial matrix covers nonce-guess, header-injection, static-cache,
  reporting-gap, and per-route-class bypass vectors.
- No internally-resolvable critical gap remains; external decisions are isolated.

## Failure metrics (planning-level — what would make this plan not ready)

- Any route class with an undefined current or target CSP state.
- Any inline script site without a nonce-attachment plan.
- Any phase without a rollback point.
- Any requirement without a test mapping.
- A header-ownership conflict left unresolved.
- A static-page-caching cost left unanalyzed.
