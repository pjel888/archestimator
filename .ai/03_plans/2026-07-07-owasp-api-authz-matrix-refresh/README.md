# OWASP / API Authorization Matrix Refresh

**Date:** 2026-07-07 (Asia/Manila)
**Plan profile:** `exhaustive`
**Status:** `CONDITIONALLY READY` (verification_mode: `emulated` — see `17_FINAL_READINESS_REVIEW.md`)
**Baseline:** current `main` — Cloudflare D1 + Better Auth (magic-link + Google OAuth). The prior June audit (`2026-06-01-security-owasp-compliance-audit`, Supabase/RLS framing) is **stale** and superseded by this pack for the authorization matrix.

> Planning-only task. No application code, tests, migrations, or config were modified.
> All writes are confined to this folder.

## What this pack is

A single current authorization matrix mapping **every API route handler (33 files),
every Server Action (~90 actions across 12 domains), and the entire public
share/publication surface** to explicit verdicts on auth, authz/ownership, input
validation, rate-limiting, and test coverage — plus a prioritized remediation roadmap
that can drive one implementation pass to reach launch-ready authorization posture.

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** — phases, tasks (WP-01..12), exact file paths/symbols,
validation, rollback.

### Phase order
- **Phase 0 (P0 launch-blockers, parallel-safe):** WP-01 (invite-origin fail-closed),
  WP-02 (durable estimate rate limit), WP-03 (CollaborationRoom upgrade limit).
- **Phase 1 (P1 broad-launch):** WP-04 (edge/WAF — owner-gated), WP-05 (public body cap),
  WP-06 (read-repo denial tests), WP-07 (action-boundary authz), WP-08 (CSP — owner-gated),
  WP-09 (June audit supersession pointer).
- **Phase 2 (P2 hardening):** WP-10 (validation standard — owner-gated), WP-11 (idempotency),
  WP-12 (dead config cleanup).

### Dependency graph
```
WP-01 ─┐
WP-02 ─┼─► P0 closed-beta gate ─► WP-04/05/06/07/08/09 (P1) ─► WP-10/11/12 (P2)
WP-03 ─┘
```
WP-01/02/03 are disjoint files ⇒ parallel-safe. WP-04 and WP-08 are owner-gated ⇒ do not
block other tasks on them.

## Top findings (verified against current source)

| ID | Severity | Finding | Task |
|---|---|---|---|
| SEC-01 | HIGH | Invite origin gate returns `true` on stripped Origin+Referer | WP-01 |
| SEC-02 | HIGH (broad) / MED (beta) | No edge/WAF rate limiting | WP-04 (owner) |
| SEC-03 | MED | Estimate mutation limiter is in-memory (per-isolate) | WP-02 |
| SEC-04 | MED | CollaborationRoom WS upgrade accepts before auth | WP-03 |
| SEC-05 | MED | Authz at repo layer only for some actions (defense-in-depth) | WP-07 |
| SEC-06 | MED | No zod; raw JSON reads unbounded pre-parse | WP-05/WP-10 |
| SEC-07 | MED (broad) | CSP unsafe-inline/eval; Report-Only except /share | WP-08 (owner) |
| SEC-08/09 | LOW | Dead config / unused signed-URL factory | WP-12 |

**6 exploration P0/P1 flags were DISPROVEN by direct source read** (group-actions,
beta-allowlist-admin, beta-feedback-review, publication/actions, template-editor,
recipient-proposals) — see Doc 08 §verified-non-issues. This correction is the core
maker/checker value of the pass.

## Document index

| # | Doc | Purpose |
|---|---|---|
| 00 | AGENT_COORDINATION | master goal, agents, skills, authority decisions |
| 01 | EXECUTIVE_SUMMARY | posture, top findings, status |
| 02 | FEATURE_BRIEF_AND_SCOPE | converted objective, in/out, assumptions, success criteria |
| 03 | SOURCE_AND_CODEBASE_AUDIT | **the matrix** — route + action decision tables, credential taxonomy |
| 04 | REQUIREMENTS_SPECIFICATION | 18 REQs with stable IDs + shadow-path matrix |
| 05 | UX_UI_ACCESSIBILITY_PLAN | auth-flow UX states + a11y gates |
| 06 | ARCHITECTURE_AND_TECHNICAL_DESIGN | current/target arch, boundaries, rejected alternatives |
| 07 | DATA_DATABASE_API_NETWORK_PLAN | D1 tables, app-authz, rate-limit scopes, API contracts |
| 08 | SECURITY_PRIVACY_THREAT_MODEL | OWASP API1-10 mapping, threat scenarios, credential taxonomy |
| 09 | PERFORMANCE_RELIABILITY_OBSERVABILITY | rate-limit DoS posture, failure modes, observability gaps |
| 10 | BLAST_RADIUS_AND_DEPENDENCIES | high-blast surfaces, per-remediation impact |
| 11 | IMPLEMENTATION_PLAN | **execution guide** — WP-01..12 |
| 12 | TEST_AND_VALIDATION_STRATEGY | execution matrix, denial-test inventory, adversarial matrix |
| 13 | ROLLOUT_ROLLBACK_AND_OPERATIONS | release gate, rollback, monitoring, stale-plan checklist |
| 14 | RISK_REGISTER | RISK-* with prevention/mitigation/contingency |
| 15 | DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES | DEC-* + open decisions |
| 16 | REQUIREMENTS_TRACEABILITY_MATRIX | REQ → task → test → rollout |
| 17 | FINAL_READINESS_REVIEW | verification mode, scores, PASS/FAIL |
| 18 | STACK_CONTRACT_AND_PRODUCTION_STANDARDS | cross-cutting stack decisions |
| 19 | RESEARCH_REVIEW_AND_QA_EVIDENCE | research, cycles, gaps |

## Blocked decisions table

| Decision | Owner | Impact if deferred |
|---|---|---|
| OPEN-01 edge/WAF free-tier rules (SEC-02) | owner | closed-beta acceptable; broad-launch DoS risk |
| OPEN-02 CSP nonce pipeline (SEC-07) | owner | XSS surface stays broader than ideal |
| OPEN-03 zod vs hand-rolled standard (SEC-06) | owner | validation consistency risk |
| OPEN-04 closed-beta vs broad-launch severity bar | owner | affects SEC-02/07 priority |
| OPEN-05 independent/owner review to elevate status | owner | stays CONDITIONALLY READY |

## Commands to run before the first edit (implementer)
- `git status --short --branch` (shared-worktree check)
- Re-read the exact target file immediately before editing (concurrent-agent safety)
- `bun run type-check` baseline
- Focused test baseline for the touched file

## Files explicitly off-limits
- `supabase/migrations/**` (archaeology — never extend)
- `.ai/10_state/current-state.md` (append-only history)
- Any file outside the named WP target paths

## Files intentionally unaffected
- Marketing pages, `/api/health`, design-system tokens, Storybook, Better Auth core tables.

## External proof still required before production rollout
- Hosted GitHub controls re-enabled + green (branch protection, CodeQL, Dependabot,
  secret scanning) — RISK-EXT-01.
- Edge/WAF proof if OPEN-01 approved.
- Independent/owner security review to elevate from CONDITIONALLY READY.

## Archive policy
Do not archive automatically. Archive only after P0 tasks (WP-01/02/03) land green and
an owner review confirms the matrix matches shipped reality.
