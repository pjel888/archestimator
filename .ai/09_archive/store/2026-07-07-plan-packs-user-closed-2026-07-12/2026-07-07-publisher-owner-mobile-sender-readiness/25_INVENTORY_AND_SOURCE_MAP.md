# 25 — Inventory and Source Map (Phase 1)

Produced by the Improve-Plan audit (`Improve-Plan-Prompt.md` PHASE 1) before any content revision. Establishes document authority, source hierarchy, requirement map, assumption register, evidence map, and missing-source list so revisions don't propagate stale claims.

---

## A. Document inventory

| Doc | Purpose | Authority level | Status | Main claims / contents | Depends on | Depended on by |
|---|---|---|---|---|---|---|
| `PROMPT.md` | The FEATURE BRIEF | **Highest (user intent)** | current | goal, evidence hints, mobile-guard constraint, stop condition | — | all |
| `README.md` | Implementation entrypoint | high (navigational) | current | status, phase order, off-limits files, checklist | all docs | executor |
| `00_AGENT_COORDINATION.md` | Master goal + ledger + file ownership | high | current | goal, lanes, skills, ownership matrix | PROMPT, siblings | all |
| `01_EXECUTIVE_SUMMARY.md` | What/why/status | high | current | summary, stop-condition check | all | README |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Scope/non-goals/assumptions | high | current | S1–S14, N1–N7, ASSUMP-1..6 | PROMPT | 04,16 |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Source map | **authoritative for current-state code** | current | file:line inventory, gaps | source files | 04–10,22,23 |
| `04_REQUIREMENTS_SPECIFICATION.md` | Requirements | **authoritative for requirements** | current | REQ-*, shadow paths S1–S6 | 02,03 | 11,12,16,24 |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | UX/a11y/DEC-MOBILE | authoritative for UX | current | journeys, state matrix, DEC-MOBILE | 03,DESIGN.md | 11,16 |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Architecture | authoritative for architecture | current | current/target arch, reuse map | 03 | 10,18,23 |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Data/api/credentials | authoritative for data | current | no-migration rationale, credential taxonomy | 03,migrations | 08,22 |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threat model | authoritative for security | current | threat model, copy-URL proof | 03,07 | 14,22 |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Perf/rel | authoritative for perf | current | PERF-01, failure modes | 03 | 13,18 |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Blast radius | authoritative for impact | current | classified impact, sibling map | 03,siblings | 11,13 |
| `11_IMPLEMENTATION_PLAN.md` | Execution guide | **authoritative for execution** | current | phases, tasks, durable-goal ledger | 04,05,06,10 | 12,16 |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test strategy | authoritative for tests | current | test matrix, AQ-1..10 | 04,11 | 16,24 |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Rollout/ops | authoritative for ops | current | gates, rollback, runbook | 09,10 | 17 |
| `14_RISK_REGISTER.md` | Risks | authoritative for risks | current | RISK-* | 03–10 | 17 |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Decisions | authoritative for decisions | current | DEC-*, ASSUMP-*, alternatives | 05,06 | 17 |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Traceability | authoritative for traceability | **BEING REVISED** | REQ→task→test→rollout | 04,11,12 | 17,24 |
| `17_FINAL_READINESS_REVIEW.md` | Scorecard | authoritative for readiness | **BEING REVISED** | scores, verification mode, deficiencies | all | README |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Stack contract | authoritative for stack | current | cross-cutting stack decisions | 03,06 | — |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research/QA evidence | authoritative for review evidence | current | critique cycles, AQ matrix, gaps | all | 17 |
| `22_ATTACK_SURFACE_INVENTORY.md` | NEW — Server Action attack surface | authoritative for attack surface | **NEW** | entry points, authz, DTOs, rate posture | 03,07,08 | 24 |
| `23_ROUTE_BOUNDARY_AND_CACHE_CONTRACT.md` | NEW — route cache contract | authoritative for route/cache | **NEW** | per-route boundary + revalidation | 03,06 | 18,24 |
| `24_FINAL_VERIFICATION_MATRIX.md` | NEW — verification matrix | authoritative for verification | **NEW** | requirement-by-requirement audit + evidence classes | all | 17 |

**Obsoleted/duplicated material:** none. The Improve-Plan anti-slop rules favor consolidation; no existing doc is marked obsolete. `22`/`23`/`24`/`25` are **net-new gaps** the Improve-Plan prompt explicitly requires (attack surface inventory, route cache contract, final verification matrix, Phase-1 inventory), not redundant.

---

## B. Source hierarchy (which source controls on conflict)

1. **User intent** — `PROMPT.md` (product goal, mobile-guard constraint). Highest for product.
2. **Repository instructions** — `AGENTS.md`, `.ai/00_system/*`, `Multi-Agent-Execution-Directive.md` (safety, shared-worktree policy, cost posture, Cloudflare-resource mandate). Highest for implementation reality/safety.
3. **Current source/tests/config** — `src/**`, `tests/**`, `migrations/**`, `next.config.ts`, `package.json`, `wrangler.jsonc`, `cloudflare-env.d.ts`. Highest for actual architecture/behavior.
4. **Local installed framework docs** — `node_modules/next/dist/docs/**` (Next.js 16.2.10 behavior; `react.dev` for React 19.2.7). Highest for version-sensitive framework behavior.
5. **Authoritative specs** — `.ai/06_specs/*`, `.ai/06_docs/*`. High for product spec.
6. **`DESIGN.md`** — alpha-stage guide (per AGENTS.md; defer to Philip on design decisions). Medium; not law.
7. **Sibling plan packs** — coordination/boundary only; their *status* (CONDITIONALLY READY) does not control this pack's reality.
8. **Older plans / archives / model memory** — lowest.

**Recorded conflicts:** none unresolved. One noted tension (not a conflict): `01_roadmap/*` prioritization may push for fuller mobile parity; DEC-MOBILE documents the product decision and its revisit condition rather than smoothing it over.

---

## C. Requirement map (every requirement → source)

| REQ ID | Source | Source strength | Created by |
|---|---|---|---|
| REQ-PS-01 (mobile reach) | PROMPT (mobile width messaging can block owner) + `PublisherRosterClient.tsx:224,228` | brief + repo evidence | PROMPT |
| REQ-PS-02 (no duplication) | sibling READMEs + `00` ownership matrix | repo evidence | derived (coordination) |
| REQ-FR-01..06 (generate/copy/email/resend/revoke/confirm) | PROMPT ("generate, copy, email, resend, revoke, and confirm client access") + `actions.ts` | brief + repo evidence | PROMPT |
| REQ-FR-07 (rotate) | `actions.ts:938` (rotate mechanism behind resend-invalidation) | repo evidence + derived | derived |
| REQ-UX-01 (state matrix) | PROMPT ("sender states") + Improve-Plan §3 | brief + official docs | PROMPT |
| REQ-A11Y-01/02 | PROMPT ("accessibility checks") + Improve-Plan §3 + DESIGN.md | brief + official docs | PROMPT |
| REQ-ARCH-01 (boundary) | `03` audit (existing `"use client"` scope) | repo evidence | derived |
| REQ-DATA-01 (no migration) | `10`/`07` sibling-migration analysis | derived | derived |
| REQ-SEC-01 (authz unchanged) | `actions.ts:394` | repo evidence | derived |
| REQ-TEST-01 (test matrix) | Improve-Plan §11 + `Creating-Plan-Prompt.md` §17 | official docs | derived |

No requirement is unsourced. REQ-FR-07 (rotate) is explicitly `derived` (not in the brief's 6-action list) and is flagged as such — it is included because rotate is the mechanism behind the resend-token-rotation consequence the PROMPT's "resend/revoke rules" item requires surfacing.

---

## D. Assumption register (unverified assumptions → impact)

| ASSUMP ID | Assumption | Status | Impact if wrong | Validation |
|---|---|---|---|---|
| ASSUMP-1 | Sender backend fully wired | VALIDATED (repo evidence) | low | `actions.ts` exists + tests |
| ASSUMP-2 | Mobile block is pure CSS, no JS hook | VALIDATED | low | grep (none) |
| ASSUMP-3 | Cloudflare Email only live provider | VALIDATED | low | `cloudflare-email-client.ts` + empty webhook dir |
| ASSUMP-4 | `delivery_status` can't flip to bounced/opened/responded from provider | VALIDATED (= sibling workflow REL-01) | low (labeling) | empty `webhooks/resend/` |
| ASSUMP-5 | Philip accepts a documented desktop guard for heavy parts | **PARTIAL → DEC-MOBILE (owner-delegated)** | medium (rework to Option A) | owner sign-off (external) |
| ASSUMP-6 | Workflow-pack Phase-6 changes will land before shared-file edits | **EXTERNAL dependency** | medium (rebase) | sibling status |
| ASSUMP-7 (NEW) | Cache Components is NOT enabled (default fetch no-store model) | **VALIDATED this audit** (`next.config.ts` has no `cacheComponents` flag) | low | `next.config.ts` + local doc `caching-without-cache-components.md` |
| ASSUMP-8 (NEW) | `revalidatePath` (not cache tags) is the active revalidation primitive | **VALIDATED this audit** (`actions.ts:739,741`) | low | grep |

ASSUMP-7 and ASSUMP-8 were **added and validated during this Improve-Plan audit** — they resolve the previously-implicit cache model and are now load-bearing for `23_ROUTE_BOUNDARY_AND_CACHE_CONTRACT.md`.

---

## E. Evidence map (important claims → supporting evidence)

| Claim | Evidence | Evidence class |
|---|---|---|
| Mobile block is at `PublisherRosterClient.tsx:224,228` | source line | local static |
| Sender backend is wired (not stubbed) | `actions.ts` symbols + tests | local static |
| Authz is `assertProjectPublicationManager` rank ≥ 30 | `actions.ts:394-441` | local static |
| Credentials: HMAC hash + AES-GCM encrypted; raw never SELECT-able | `security.ts:63-112` + `d1-store.ts` | local static |
| Resend rate limit 1/5min, send-before-persist | `actions.ts:1243,1554,1607-1610,261-262` | local static |
| Next.js 16.2.10, React 19.2.7, Cache Components OFF | `package.json` + `next.config.ts` | local static |
| `revalidatePath` is the revalidation primitive | `actions.ts:739,741` | local static |
| Route is dynamic (searchParams + auth headers) | `page.tsx` + `session.ts:54` | local static |
| Scripts: `test`=`bun test tests/unit`, `test:dom`=`vitest run`, `validate`=type-check+lint+design+test+test:dom | `package.json` | local static |
| DESIGN.md endorses desktop guard for dense editing | `DESIGN.md:519-524` | local static |

---

## F. Missing-source list (decisions/evidence needed before implementation)

| Missing | Why needed | Owner | Unblock action | Blocking? |
|---|---|---|---|---|
| DEC-MOBILE final owner sign-off | choose Option A/B/C | Philip (owner) | owner accepts Option B (default) | yes for Option A path; no for Option B (default) |
| Workflow-pack honest-delivery labels landing | REQ-FR-06 honest labels consume them | sibling pack | coordinate via `10`; graceful fallback | no (fallback label) |
| Independent reviewer / owner acceptance | lift emulated-verification cap → IMPLEMENTATION-READY | reviewer/owner | second-native-agent or human review | no (caps status, not content) |
| Hosted/production RUM + PERF-01 run | close Performance (94→≥95) | impl | run evaluator at impl time | no (deferred to impl) |
| Real email delivery smoke | confirm owner-side surfacing matches delivery | impl (standing CF mandate) | workflow-pack smoke covers it | no (not duplicated here) |

No missing source blocks the **planning** completeness; all are implementation-time or external. The package is content-complete; the caps are verification-mode + external-decision driven.
