# 00 — Agent Coordination

**Date:** 2026-07-07
**Plan:** Public To Beta Trust And Onboarding Continuity
**Mode:** `planning-only`

## Master goal

Turn Archestimator's fragmented public→beta→auth→onboarding path into **one coherent, truthful, testable acceptance path** that protects user trust and reduces first-session confusion, expressed as a production-grade implementation plan a separate executor can build without re-discovering requirements, architecture, affected files, failure modes, or validation.

### Outcome
A first user (or invited collaborator) can move from a public landing promise, through beta access, legal/support expectation-setting, account creation, and terms acceptance, to their first estimating workflow entry — with no broken link, no overclaimed capability, no dead-end, and no unexplained redirect.

### Problem being solved
The path exists in pieces (landing v3, ClosedBetaGate, Better Auth login, closed-beta allowlist, terms gate, `ensureDefaultWorkspace`, dashboard) but is **not one acceptance path**:
- Two divergent CTA postures (walkthrough vs request-access) coexist.
- Footer link sets are inconsistent across the live v3 footer, `/new` footer, and shared `LandingFooter`.
- Legal pages `/terms` and `/privacy` lack per-route metadata; `/security` is missing from the sitemap; `/.well-known/pgp-key.txt` is referenced but absent.
- No cookie-policy page despite a consent banner.
- No welcome/onboarding email; email delivery is OFF by default.
- `/workshop/onboarding` just redirects to settings; no first-project empty-state CTA on the dashboard.
- No continuity test asserting the whole path end-to-end.

### Intended feature behavior
A single, documented continuity contract that maps every public promise to a shipped state, fixes the CTA/intent vocabulary, completes the legal/support surface, adds expectation-setting + a welcome touchpoint, and provides a clear first-workflow handoff — all gated by objective acceptance tests.

### Planning scope (in)
- Public landing CTA + intent vocabulary reconciliation.
- Footer / trust-link continuity across all public footers.
- Legal/support page completeness (cookies, security sitemap, legal-page metadata, PGP key, ClosedBetaGate legal line).
- Terms-gate continuity (post-auth clickwrap stays the single gate; add plain-language pre-link).
- Welcome / invite-acceptance email (owner-gated).
- First-workflow entry: dashboard first-project CTA + `/workshop/onboarding` behavior.
- Continuity tests + performance evaluator + rollout gates.

### Non-goals (out of scope)
- Generic marketing redesign or visual restyling (the constraint in `PROMPT.md`).
- Self-serve open signup (`/signup` stays a ClosedBetaGate until owner flips `L-FUN-2`).
- Estimate/workshop editing internals.
- Collaboration invite token deep crypto/acceptance (sibling pack owns that).
- Better Auth core identity table changes.
- New auth providers.
- Pricing numbers, DPA, SOC2/GDPR badges (explicitly deferred/truthful-omitted).

### Required codebase analysis
Landing components (`landing/`, `landing-new/`, `landing-v3/`), public routes, Better Auth config, closed-beta allowlist, invite flow, proxy route protection, terms gate, workspace provisioning, dashboard/first-project entry, legal/support/email surfaces, sitemap/robots/metadata. (Completed — see `03`.)

### Required specialist workstreams
Product/scope, codebase architecture, UX/a11y, React/Next, backend/auth/data, security/privacy, performance, test/QA, rollout/ops, blast radius, adversarial review, final verification. (All covered below; modes recorded in §3.)

### Implementation-readiness criteria
Every requirement traceable to exact paths/symbols; objective acceptance criteria; shadow-path matrices complete; adversarial matrix complete; performance evaluator defined; rollout/rollback defined; no internally-resolvable critical gap; verification mode recorded.

### Validation criteria
Static + targeted unit/DOM tests for each behavior-bearing requirement; one continuity contract test; performance evaluator for the landing→auth transition; hosted smoke deferred to rollout (recorded as external proof).

### Final planning deliverables
Docs 00–19 + README + 20 (credential material) + 21 (DB change blueprints).

## Verification mode

**`verification_mode: emulated`** — no native independent reviewer subagent was available for a dedicated separated final-verification pass in this session. The adversarial and final-verification passes were run as **separated passes by the same lead agent**. This caps overall readiness at 97 and package status at `CONDITIONALLY READY` for this high-blast-radius package unless a real independent reviewer or owner acceptance later upgrades it. Recorded honestly per the suite authority contract; not presented as independent.

## Skills discovered and used

| Skill | Used? | Why relevant |
|---|---|---|
| `archestimator-plan-pack` | Yes | Binds the generic planning contract to the dated `.ai/03_plans/` + `LOOP_LEDGER` convention and the loop surface routing. |
| Creating-Plan-Prompt (`.ai/08_prompts/000_Planning Prompts/`) | Yes | Authoritative exhaustive-plan structure and quality bar. |
| Multi-Agent-Execution-Directive | Yes | Authority model, verification-mode caps, evidence-class discipline. |
| `Explore` (native read-only subagent) | Yes | Three parallel discovery lanes (landing, auth/beta/invite, legal/support/onboarding). |

No skill was fabricated. No skill was invoked merely because it exists. `ultrawork`/`ultragoal`/`autopilot`/`ultraqa` are referenced as the **named loop shapes** the future implementation should satisfy (per §4A of the planning directive), not as evidence that they ran during this planning task.

## Coordination ledger

| Lane/Agent | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead coordinator (this agent) | Master goal above | Synthesis, integration, final claim | All docs in this folder | 3 discovery lanes | Synthesized continuity map | — | COMPLETE |
| Discovery: landing/public surfaces (`Explore`) | Audit landing components, routes, CTAs, trust signals, legal/support links, tests | `src/components/landing*`, `src/app/*` public routes, `e2e/`, `tests/vitest/` | Exact paths/symbols | None | v3 is live; two CTA postures; footer inconsistency; missing routes | None | COMPLETE |
| Discovery: auth/beta/invite (`Explore`) | Audit Better Auth, closed-beta, invite, proxy, workspace provisioning, migrations | `src/lib/auth/*`, `src/lib/collaboration/*`, `src/proxy.ts`, `migrations/` | Exact paths/symbols | None | Proxy gate → terms gate → closed-beta allowlist ordering; two "invite" concepts | None | COMPLETE |
| Discovery: legal/support/onboarding (`Explore`) | Audit legal pages, support, email, first-workflow entry, sitemap/robots/SEO | `src/app/{terms,privacy,security,trust,contact}/*`, `src/lib/email/*`, `src/lib/legal/*`, `src/app/sitemap.ts` | Exact paths/symbols | None | No welcome email; no cookie page; missing OG/PGP assets; onboarding redirect-only | None | COMPLETE |
| Adversarial reviewer (emulated pass) | Disprove readiness, find omissions | All docs | P0/P1/P2 findings | Lead synthesis | See `19` §4 | — | COMPLETE |
| Final verifier (emulated pass) | Requirement-by-requirement audit | All docs + source | Verification matrix | Lead synthesis | See `17` | — | COMPLETE |

### Source-authority decisions
- Current source/config controls over stale docs/memory: verified Better Auth (not Supabase), `proxy.ts` (not `middleware.ts`), `landing-v3` live (not `frontdoor`/`home`).
- `AGENTS.md` standing Cloudflare authorization noted but **not exercised** (planning-only; no provider mutation).

### Assumptions (validated vs. open)
- VALIDATED: closed-beta is grant-based (D1 allowlist + env flag), not code-based.
- VALIDATED: terms gate is post-auth clickwrap, single point.
- OPEN: CTA posture, footer set, cookie page, welcome email copy, production domain (see README blocked-decisions table).

## Concurrent-repository safety

Shared live worktree. All writes confined to this plan folder. `git status` rechecked before writes; no other agent's work touched. No branches/worktrees created, switched, or recommended as default. `PROMPT.md` preserved untouched.
