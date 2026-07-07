# 00 — Agent Coordination

- **Plan profile:** `exhaustive`
- **Verification mode:** `emulated`
- **Created:** 2026-07-07 (Asia/Manila)
- **Plan folder:** `.ai/03_plans/2026-07-07-privacy-request-operations-and-erasure-workflow`

## Master `/goal`

**Outcome.** A future executor can implement and verify privacy request operations end to end: anonymous + authenticated intake → identity verification → operator triage queue → status lifecycle → confirmation email → export/erasure fulfillment → audit + retention evidence.

**Problem being solved.** Privacy request intake exists (`src/app/api/compliance/privacy-requests/route.ts`), but identity verification, status lifecycle, operator queue, confirmation, fulfillment (export/erasure), and end-to-end evidence are all missing. `listPrivacyRequests` has zero callers. The migration's own comment defers verification to "triage," and no triage surface exists.

**Planning scope (in).**

- Request states + lifecycle transitions (state machine, allowed transitions, who can trigger each).
- Identity verification for anonymous and authenticated requesters (token-based email loop).
- SLA timers (clock start, target, breach detection) — designed but gated on `OPEN-LEGAL-02`.
- Operator queue UI + platform-admin gate (reuse `beta-allowlist-admin.ts` pattern).
- Confirmation + status-update email templates and proof (Cloudflare Email binding, circuit breaker).
- Export fulfillment (data package) and erasure/anonymization fulfillment (gated on `OPEN-ERASE-01`).
- Audit evidence for every transition and fulfillment (reuse `account_security_events` HMAC discipline + `data_retention_events`).
- Abuse controls on intake (D1 sliding-window rate limit mirroring `ai/rate-limit.ts`; optional Turnstile).
- Tests for anonymous and authenticated requesters, operator gate denial, identity verification, lifecycle, fulfillment, and abuse.
- Database change blueprint for the new migration (SLA, notes/history, verification tokens, evidence pointers) at `0037_*`.

**Non-goals (out).**

- Broader DSAR data-lifecycle / retention rework (covered by the retention engine already in place).
- Privacy notice content authoring (owner/legal; `OPEN-LEGAL-01`).
- RoPA, processor register, breach runbook authoring, DPIA, and file-scanner work (separate compliance roadmap items; referenced only).
- A dedicated DPO/operator role (deferred to post-beta; `OPEN-OPS-01` recommends reusing `isPlatformAdminRole`).
- Legal-hold infrastructure beyond a forward-compatible flag (out of scope until `OPEN-ERASE-01` is resolved).
- Supabase/Postgres or any legacy-provider work.

**Required codebase analysis.** Compliance routes, repository, migrations (0033/0034), retention engine + cron, audit/hashing helpers, auth/session/roles, email client + circuit breaker, rate-limit engine, admin-gate precedent, observability/app-error, existing tests.

**Required specialist workstreams.** Product/strategy; codebase architecture; UX/a11y; React/Next; backend/API/integration; D1 data; security/privacy; performance/reliability; test/QA; rollout/ops; blast radius; adversarial review; final verification (all covered below; see lanes L1–L12).

**Implementation-readiness criteria.** Every requirement traceable to a source, task, acceptance criterion, test, and rollout check; exact repo-relative paths and symbols for every task; the state machine, identity model, and credential taxonomy fully specified; the D1 migration blueprint implementable without invention; shadow-path matrices complete for every flow; `P3`/`P4` explicitly gated with options + recommendations.

**Validation criteria.** Two emulated critique-and-revision cycles; one emulated adversarial pass; one emulated independent final verification; readiness scores recorded with exact reasons for every score below 100.

**Final planning deliverables.** The 21 canonical documents (00–19 + README) listed in `README.md`.

## Skills and repository instructions used

| Skill / instruction | Used? | Why |
|---|---|---|
| `AGENTS.md` (workspace instructions) | Referenced | Stack baseline, Cloudflare-resource standing authorization, proportional verification policy, exhaustive-plan-pack trigger (auth/data/security) |
| `archestimator-plan-pack/SKILL.md` | Yes | Binds the plan-pack-vs-in-session-loop decision and the named loop shape; confirms `exhaustive` profile is correct for this high-blast-radius work |
| `Creating-Plan-Prompt.md` | Yes | Authoritative directive for the planning package structure, ID conventions, readiness scoring, completion gates |
| `Multi-Agent-Execution-Directive.md` | Yes | Authority model, concurrent-repo safety, evidence-class discipline, completion-audit rubric |
| `gitnexus` / `code-review-graph` | Not invoked | Per `AGENTS.md` proportional policy: this is a planning pass over already-audited surfaces; native `Explore` subagents + `rg`/targeted reads were sufficient. Would be appropriate at execution time for impact analysis before editing `privacy-request-repository.ts` |
| `cloudflare-email-service` / `cloudflare-one-migrations` skills | Referenced, not invoked | Will be loaded by the executor for `P1` email and `P0` migration work; this planning pass cites the established patterns instead |
| `supabase` skill | Not applicable | Cloudflare-only scope; Supabase is provider-exit evidence only |
| Local Next.js 16 docs (`node_modules/next/dist/docs/`) | Referenced | Route handler, Server Action, and Server/Client boundary decisions in `06`/`07` follow current App Router guidance; executor must re-read before framework-sensitive edits |

Unavailable capabilities honestly recorded: no native independent reviewer lane was available, so the adversarial and final-verification passes are `emulated` (same agent, separated passes). This caps overall readiness at 97 and package status at `CONDITIONALLY READY` per the directive.

## Specialist workstreams (lanes)

| # | Lane | Mode | Status | Key findings location |
|---|---|---|---|---|
| L1 | Lead coordinator / synthesizer | lead | done | All docs; decisions in `15` |
| L2 | Source & requirements analyst | native Explore subagent + lead | done | `02`, `04`, `16` |
| L3 | Codebase architecture analyst | native Explore subagent | done | `03`, `06`, `10` |
| L4 | Product / UX / accessibility planner | emulated pass | done | `05` |
| L5 | React / Next.js specialist | emulated pass | done | `06` (Server/Client), `07` (routes) |
| L6 | Backend / API / integration planner | emulated pass | done | `07`, `11` (P0/P1/P2) |
| L7 | Data / database planner | emulated pass | done | `07` (migration blueprint), `11` (P0-T1) |
| L8 | Security / privacy reviewer | emulated pass | done | `08`, credential taxonomy |
| L9 | Performance / reliability reviewer | emulated pass | done | `09` |
| L10 | Test / QA strategist | emulated pass | done | `12`, `19` (adversarial) |
| L11 | Operations / rollout planner | emulated pass | done | `13` |
| L12 | Adversarial reviewer + final verifier | emulated pass (separated) | done | `17`, `19` |

Native subagents (L2, L3) were real `Explore` delegation; L4–L12 were emulated separated passes by the lead because no further native delegation was available for those domains.

## Coordination ledger (summary)

| Lane | /goal | Owned scope | Dependencies | Findings | Decisions/Rejected | Conflicts | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| L3 | Map compliance surfaces | `src/app/api/compliance/**`, `src/lib/compliance/**`, `migrations/0033/0034`, tests | none | Intake-only; repository lifecycle absent; retention already purges completed/rejected | Reuse `beta-allowlist-admin.ts` gate; rejected a new operator role | None | `03_...md` (file:line evidence) | complete |
| L2 | Extract requirements from brief + audit | `PROMPT.md`, roadmap, sibling packs | L3 | Brief asks for the full ops workflow; intake is the only existing piece | `OPEN-OPS-01` reuse platform-admin; `OPEN-ERASE-01` dry-run+confirm | None | `04_...md`, `16_...md` | complete |
| L7 | D1 migration blueprint | `privacy_requests` schema, retention rules | L3 | New cols/tables needed: SLA, notes/history, verification tokens, evidence pointers | Sequence next migration at `0037`; rejected in-place alter-only | Erasure-vs-purge tension (`OPEN-ERASE-01`) | `07_...md` | complete |
| L8 | Threat model + credential taxonomy | intake, verification, operator, email, erasure | L3, L7 | Anonymous intake abuse; unverified erasure is the critical risk; email-token is a raw bearer once issued | Hashed-token verification loop; rejected KBA/SMS | None | `08_...md` | complete |
| L12 | Adversarial + final verify | whole pack | L2–L11 | See `17`/`19` | `emulated` cap applied | None | `17_...md`, `19_...md` | complete |

## File / module ownership for this planning pass

- Write boundary: `.ai/03_plans/2026-07-07-privacy-request-operations-and-erasure-workflow/**` only.
- No application code, tests, migrations, or provider state were modified.

## Concurrent-repository safety

- `git status` at start showed many pre-existing modified files across `.ai/`, `src/`, `tests/`, and scripts (unchanged, preserved).
- All writes were confined to the new plan folder. `git diff --check` will be run at the close of the planning pass.
- No destructive Git operations were used. No commits, pushes, merges, or branch switches.
