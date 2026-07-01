# 19 — Research, Review, and QA Evidence

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`
> Per `Creating-Plan-Prompt.md:1202-1212`, this doc contains research questions and sources, skills/workflows used, specialist workstream outputs, critique-and-revision cycle summaries, UltraQA-style adversarial scenario matrix, performance evaluator contract, independent final verifier evidence, and explicit validation gaps.

## Research questions and sources

The audit's research program was framed around these questions, each tied to a `REQ-*` or `OPEN-*`:

| Research question | Source sought | Source found | Decision it shaped |
|---|---|---|---|
| Is D1 suitable as system-of-record for auth/sessions/PII? | Cloudflare D1 docs | Cloudflare D1 production docs confirm D1 is suitable as system-of-record; no RLS; app code enforces row-level access | DEC-004, REQ-SEC-001 |
| Is KV suitable for rate limits / sessions / locks? | Cloudflare KV docs | Cloudflare KV guidance explicitly states eventual consistency, NOT suitable for rate limits / sessions / locks / strong counters / transactional state | DEC-007, REQ-SEC-008, ASSUMP-007 |
| Is at-least-once Queue delivery the contract? | Cloudflare Queue docs | Yes — at-least-once with DLQ after `max_retries` | ASSUMP-006, REQ-REL-001, RISK-008 |
| Does Cloudflare Cron have native overlap protection? | Cloudflare Cron Triggers docs | No native overlap protection — app code must guard | ASSUMP-005, REQ-PERF-004, RISK-007 |
| What is the canonical D1 RLS-equivalent? | Cloudflare D1 docs + sibling plan pack evidence | App-layer `WHERE workspace_id = ?` scoping on every prepared statement; canonical scripts `cf:d1-authz-matrix` and `cf:d1-rpc-map` (SRC-019) generate the matrix | REQ-SEC-001, RISK-001, DEC-014 |
| Is Better Auth production-grade for this scale? | Better Auth docs + Cloudflare Migration Codex sibling plan pack evidence | Yes; D1 storage adapter is custom (`src/lib/auth/better-auth-cloudflare.ts`); account-linking and ratelimiter storage are config decisions | DEC-003, REQ-SEC-007, REQ-SEC-008, OPEN-014 |
| Is OpenNext for Next 16 production-grade? | OpenNext docs + sibling plan pack evidence | Yes — production cutover READY 2026-07-01 per FAST PATH | DEC-002 |
| What is Cloudflare Email Service posture vs Resend legacy? | FAST PATH `current-state.md:96` | Cloudflare Email Service is active runtime; Resend is migration archaeology | DEC-009 |
| What is DMARC `p=` recommended posture? | Cloudflare Wrangler warning + DNS docs | `p=reject` recommended by Wrangler; current observed `p=none` is policy choice | OPEN-006, RISK-010 |
| What is the Workers Observability default retention? | Cloudflare Workers Observability docs | 3 days free / 30 days paid | ASSUMP-008, OPEN-009 |

## Skills and workflows used or unavailable

| Skill / workflow | Used | Why / substitute |
|---|---|---|
| `gitnexus` (exploring sub-skill) | Yes (via dispatched `explore` lanes L1-L4; lanes timed out, lead self-completed) | Broad API surface mapping; graph is appropriate per Archestimator's proportional-policy override |
| `gitnexus-guide` | Reference | Resource/schema quick reference |
| `archestimator-plan-pack` | Yes | Canonical plan-pack structure source; mandates `LOOP_LEDGER.md` |
| `writing-plans` | Yes | Plan document discipline |
| `dispatching-parallel-agents` | Yes | Fan-out to L1-L4 (timed out); honestly recorded in `00_AGENT_COORDINATION.md` |
| `Explore Codebase` (project skill) | Yes | Codebase structure navigation |
| `supabase-postgres-best-practices` | Reference only | Active runtime is D1, not Postgres; Supabase guidance applies only to historical rows flagged for removal |
| `analyze` (project skill) | Yes | Read-only deep repo analysis pattern |
| `security-review` / `ecc:security-reviewer` mental model | Yes | Threat-model rubric for the audit |
| `api-design` mental model | Yes | REST/RPC contract lens |
| `code-tour` | Not used | Audit doesn't emit an onboarding tour |
| `requesting-code-review` / `review` | Specified as downstream gate | Spec'd in `13_*.md` for future remediation; NOT invoked during audit-write itself |
| `plan` agent (L5) | Dispatched (timed out) | Plan DAG authored by lead from Creating-Plan-Prompt.md |
| `librarian` agent (L4) | Dispatched (timed out) | Cloudflare/Better Auth official docs reference module; lead cited known references instead |
| `explore` agent (L1, L2, L3) | Dispatched (timed out) | API surface inventory / security pattern audit / tests-types-AI; lead self-completed via direct filesystem scan |
| `oracle` agent | NOT used | Audit doesn't have a single hard problem to delegate; tasks are exploration + plan-writing |
| `metis` agent | NOT used | Audit request was unambiguous; no hidden intent to surface |
| `momus` agent | NOT used | Plan review is emulated same-agent pass (L7) |
| Browser / Playwright / visual-qa | NOT used | Per AGENTS.md + Codex/UI verification policy: opt-in for docs-only audit |

Unavailable capabilities honestly recorded: independent final verifier (L8) — no independent reviewer available in this session.

## Specialist workstream outputs (emulated)

The 12 specialist workstreams from `Creating-Plan-Prompt.md:231-244`:

1. **Product strategy, scope, requirements** — lead-authored in `02_*.md` (FEATURE BRIEF + scope).
2. **Existing codebase architecture and conventions** — lead-authored in `03_*.md` + `06_*.md` (architecture).
3. **UX, UI, accessibility** — lead-authored in `05_*.md` (narrowed to error-state UX from API responses).
4. **Frontend components, state, interaction** — coverage in `06_*.md` + `09_*.md` (cache + perf) + `18_*.md` (React/Next/Tailwind contract).
5. **Backend services, APIs, integrations, network** — lead-authored in `07_*.md` (D1/R2/DO/Queue/Cron/Email matrices).
6. **Data models, database behavior, migrations, integrity** — lead-authored in `07_*.md` D1 access-path matrix + `18_*.md` D1 contract.
7. **Information security, privacy, authentication, authorization** — lead-authored in `08_*.md` (threat model + credential material + per-Action verdict preview).
8. **Performance, scalability, caching, reliability** — lead-authored in `09_*.md` (budgets + evaluators + failure modes + observability).
9. **Testing, validation, regression, QA** — lead-authored in `12_*.md` (Test Execution Matrix).
10. **Deployment, observability, rollout, rollback, operations** — lead-authored in `13_*.md` (per-phase rollback + alerting + monitoring).
11. **Blast radius, dependencies, compatibility, affected documentation** — lead-authored in `10_*.md`.
12. **Adversarial gap analysis and assumption challenge** — emulated same-agent pass (L7); see `17_*.md` honest verification gaps + `14_*.md` risk register + this doc's adversarial matrix below.

## Critique-and-revision cycle summaries

Per `Creating-Plan-Prompt.md:128-133`, bounded review loops; cap at 6 meaningful cycles. This audit ran the following cycles:

| Cycle | Action | Result |
|---|---|---|
| Cycle 1 | Initial scope check vs Creating-Plan-Prompt.md exhaustive profile | Confirmed exhaustive profile (auth, Server Actions, Route Handlers, security, data integrity, release readiness) |
| Cycle 2 | Plan agent (L5) dispatch for DAG; timed out at 30-min | Lead self-authored DAG from Creating-Plan-Prompt.md; recorded as `emulated` in `00_AGENT_COORDINATION.md` |
| Cycle 3 | Parallel exploration lanes (L1-L4) dispatch for inventory + research; timed out at 30-min inactivity | Lead self-completed inventory via direct filesystem scan; recorded as `emulated` verification |
| Cycle 4 | WAVE 0..3 docs authored (00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14) | All authored; ID consistency verified across docs |
| Cycle 5 | WAVE 4..6 docs authored (15, 16, 17, 18, 19, README final, LOOP_LEDGER) | All authored; cross-doc reference scan clean |
| Cycle 6 | Emulated adversarial reviewer (L7) pass — re-read every doc against Creating-Plan-Prompt.md §8 dimensions | Findings: (a) credential material taxonomy distinct (PASS), (b) RLS-equivalent matrix present (PASS), (c) Server Action per-action verdict table is preview-only (WARN — Phase 2 fills), (d) UltraQA matrix present (PASS — see below), (e) perf evaluator contract present (PASS — see `09_*.md`), (f) independent final verifier absent (FAIL — recorded in `17_*.md`) |

Cap reached at 6 cycles per `Creating-Plan-Prompt.md:128-133`. Residual findings: independent reviewer absence (OPEN-004) + Phase 2 verdict-table fill (future remediation).

## UltraQA-style adversarial scenario matrix

Per `Creating-Plan-Prompt.md:426-445` and Multi-Agent-Execution-Directive §12, the audit's RECOMMENDATIONS must specify adversarial scenarios for the future remediation's test plan. The matrix covers normal + hostile + edge-case behavior:

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence target |
|---|---|---|---|---|---|---|---|
| ULTRAQA-001 | Authenticated attacker | Cross-workspace project ID submission | fixture: 2 workspaces; user A in workspace 1, project P2 in workspace 2 | `tests/vitest/security/d1-row-level-access.test.ts` | P2 mutation rejected (403 or 404 to prevent enumeration) | audit-recommended | Phase 1 + Phase 2 |
| ULTRAQA-002 | Anonymous | Direct POST to Server Action URL | curl with action fingerprint | `tests/vitest/security/server-action-verdict.test.ts` | 401 unauthorized | audit-recommended | Phase 2 |
| ULTRAQA-003 | Authenticated user | Duplicate submit (network jitter) | double-click simulation | `tests/vitest/api-contract/<mutation>-idempotency.test.ts` | Same canonical result; no duplicate row | audit-recommended | Phase 4 |
| ULTRAQA-004 | Anonymous | Token enumeration on share link | rapid iteration on token chars | rate-limit test + `tests/vitest/security/share-token-mutation.test.ts` | Rate-limited (429) after N attempts; constant-time compare | audit-recommended | Phase 5 |
| ULTRAQA-005 | Authenticated attacker | Oversized prompt to AI | 100KB prompt | `tests/vitest/api-contract/ai-flag-audit.test.ts` | 422 oversized; no D1 row written | audit-recommended | Phase 11 |
| ULTRAQA-006 | Authenticated attacker | Unusual Unicode in estimate row name | zero-width chars, RTL marks | `tests/vitest/api-contract/<mutation>-unicode.test.ts` | Accepted if zod allows; rejected if zod denies; no broken UI | audit-recommended | Phase 11 |
| ULTRAQA-007 | Authenticated attacker | Path traversal in component attachment filename | `../../etc/passwd` | `tests/vitest/security/path-traversal.test.ts` | 422 rejected; no file write outside workspace prefix | audit-recommended | Phase 11 |
| ULTRAQA-008 | Authenticated attacker | Prompt injection in AI | "ignore previous instructions" | `tests/vitest/security/ai-prompt-injection.test.ts` | AI output not trusted for system actions; audit row written | audit-recommended | Phase 11 |
| ULTRAQA-009 | Anonymous | CSRF on state-changing request | arbitrary origin POST with valid cookie | `tests/vitest/security/better-auth-trusted-origins.test.ts` | 403 bad origin | audit-recommended | Phase 2 |
| ULTRAQA-010 | Authenticated attacker | Concurrent writes to same estimate row | two tabs edit simultaneously | `tests/vitest/api-contract/estimate-row-concurrent.test.ts` | Last-writer-wins OR 409 conflict | audit-recommended | Phase 4 |
| ULTRAQA-011 | Authenticated user | Stale cache after mutation | optimistic UI + race | `tests/vitest/cache/stale-after-mutation.test.ts` | read-your-own-writes preserved | audit-recommended | Phase 3 |
| ULTRAQA-012 | Authenticated user | Network timeout mid-mutation | mock slow D1 | `tests/vitest/api-contract/<mutation>-timeout.test.ts` | 503 within bounded timeout | audit-recommended | Phase 8 |
| ULTRAQA-013 | Authenticated user | Retry after partial success | idempotency key replay | `tests/vitest/api-contract/<mutation>-retry.test.ts` | Same canonical result | audit-recommended | Phase 4 |
| ULTRAQA-014 | Authenticated user | Cancellation mid-upload | abort PUT to R2 | `tests/vitest/api-contract/upload-cancel.test.ts` | R2 object cleaned up; upload metadata row marked cancelled | audit-recommended | Phase 11 |
| ULTRAQA-015 | Concurrent agent / dirty worktree | Two agents edit same Server Action | git worktree state | manual | No overwrite; conflict surfaced | audit-awareness | n/a |
| ULTRAQA-016 | Operator | Hung command with bounded timeout | 30s cron job that hangs | mock long-running | Bounded timeout fires; next cron skipped via overlap guard | audit-recommended | Phase 8 |
| ULTRAQA-017 | Authenticated user | Flaky rerun | intermittent test failure | run 5x | ≥95% pass rate | audit-recommended | Phase 11 |
| ULTRAQA-018 | Authenticated attacker | Misleading success output | mutation returns 200 but row not written | `tests/vitest/api-contract/<mutation>-truthful-result.test.ts` | DTO contains canonical post-mutation value | audit-recommended | Phase 3 |

## Performance evaluator contract (per REQ-TEST-005)

Per `09_*.md`, each hot path has:

- **Baseline metric** — current p50/p95/p99 from `cf:d1-runtime-performance-proof` artifacts
- **Target metric** — per-surface budget in `09_*.md`
- **Measurement command** — `bun run cf:d1-runtime-performance-proof` / `cf:d1-performance-proof` / `cf:jobs-proof` / `cf:check-email`
- **Fixture size** — workspace cardinality (1, 10, 100, 1000) × project cardinality (10, 100, 1000) × estimate cardinality (10, 100)
- **Number of runs** — 30 samples; reject highest-variance outlier
- **Regression threshold** — >20% relative triggers P1; >50% triggers P0
- **Related functional tests** — per `12_*.md` Test Execution Matrix
- **Evidence artifact location** — `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-*-performance-proof.{json,md}`

## Independent final verifier evidence

NOT AVAILABLE. Honestly recorded in `00_AGENT_COORDINATION.md` (L8 lane) and `17_*.md` verification mode table.

Verification mode: `emulated` (lanes L1-L4 dispatched but timed out; L5 plan agent dispatched but timed out; L7 adversarial reviewer emulated same-agent pass).

Per Multi-Agent-Execution-Directive §2 caps:

- `emulated` caps readiness at 97 maximum.
- For high-blast-radius exhaustive planning packages, `emulated` caps status at `CONDITIONALLY READY` unless a real independent reviewer or owner sign-off reviews the final package.
- The audit therefore lands at `CONDITIONALLY READY` per DEC-011.

## Explicit validation gaps

The following validations were NOT performed during the audit-pack authoring:

| Validation | Why not performed | Risk left behind | Strongest substitute evidence | Action to complete |
|---|---|---|---|---|
| Full code-read of every Server Action to fill per-action verdict table | Out of scope for docs-only audit; Phase 2 future remediation owns | Phase 2 may reveal additional P0 findings | TBD schema in `08_*.md` | Phase 2 |
| Live Cloudflare Worker readback for `head_sampling_rate` sufficiency | Out of scope; requires production access | OPEN-002 unresolved | P95 + sampled-error posture per FAST PATH | Philip / ops confirm in production |
| DNS readback for DMARC `p=reject` decision | Out of scope; requires DNS access | OPEN-006 unresolved | FAST PATH cites `p=none` observed publicly | Philip / ops decide + update DNS |
| Cross-workspace access denial proof per Server Action | Out of scope; Phase 2 future remediation | Phase 2 may reveal additional denial-test failures | Role-matrix test inventory in `12_*.md` | Phase 2 |
| Per-D1-migration rollback SQL file check | Out of scope; Phase 11 future remediation | Some of 29 migrations may lack paired rollback | REQ-OPS-003 + AC-037 | Phase 11 |
| `bun run cf:d1-runtime-performance-proof` exit 0 | Already GREEN per FAST PATH | None | Cited per `09_*.md` baseline | n/a — already green |
| `bun run cf:d1-authz-matrix` exit 0 with full coverage | Out of scope; Phase 1 future remediation | Phase 1 may reveal gaps | Existing artifacts in `2026-06-29-Cloudflare-Migration-Codex/evidence/` | Phase 1 |
| Independent reviewer sign-off | No independent reviewer in session | OPEN-004 unresolved; caps readiness at `CONDITIONALLY READY` | L7 emulated adversarial pass | Philip designates reviewer |

## Final note on evidence classes

Per Multi-Agent-Execution-Directive §11:

| Evidence class | This audit uses | This audit cannot prove |
|---|---|---|
| Local static | `03_*.md` inventory (filesystem scan), `git diff --check` after audit | Runtime behavior |
| Local automated | (none — audit is docs-only) | Runtime + provider state |
| Browser/manual | (none — opt-in per AGENTS.md; not required for docs-only audit) | Provider / production unless targeting those envs |
| Provider-backed | (none — out of scope; future remediation owns) | User UX |
| Hosted/production | (none — out of scope) | Local code path details without source inspection |
| Inferred | (some — RISK likelihood assessments with "Unknown" status are inferred) | Stronger claims requiring direct proof |

The audit's evidence is therefore predominantly **local static** + **inferred**. Future remediation phases will produce **local automated** (test runs) + **provider-backed** (cf:* proof scripts). Hosted/production evidence is gated on Philip/ops action.