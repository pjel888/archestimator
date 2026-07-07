# Agent Coordination Ledger

**Plan:** Public Share Activity Minimization
**Plan folder:** `.ai/03_plans/2026-07-07-public-share-activity-minimization/`
**Plan profile:** `exhaustive` (publication/shared-link surface, PII exposure, data retention, public-facing API, security/privacy-bearing)
**Created:** 2026-07-07 (Asia/Manila)
**Verification mode:** `emulated` (separated passes by the same lead agent; no native independent reviewer lane was dispatched for this planning-only pass — see `17_FINAL_READINESS_REVIEW.md`). Per the suite caps, this limits overall readiness to 97 and package status to `CONDITIONALLY READY` for the high-blast-radius slices until an owner or independent reviewer signs off.

---

## Master `/goal`

**Outcome.** Produce an exhaustive, evidence-based planning package that narrows the public share activity surface to the minimum recipient-visible fields, defines the data contract, redaction rules, pagination/rate limits, retention behavior, privacy tests, audit logging, and revoked/expired handling, and lets a future implementation executor tighten the surface and prove no unnecessary data is exposed — **without degrading legitimate recipient review flows** (comments, decisions, snapshot view).

**Problem being solved.** `GET /api/share/[token]/activity` (`src/app/api/share/[token]/activity/route.ts`) combines comments, decisions, events, recipient display names, and metadata into one public, token-gated endpoint. Public links are high-risk because recipients may be unauthenticated or email-matched rather than full workspace members. Three confirmed over-fetches of PII (`author_email`, recipient `email`, `meta` dead path), a deny-list (not allow-list) facts filter, missing route-handler-level tests, missing retention coverage for comments/responses/recipients, a single shared secret backing four credential classes, no failed-attempt lockout on token guessing, raw `console.error` bypassing the redactor, and no Turnstile/WAF on share routes together form the gap. The activity route also currently has **no UI consumer on the recipient-facing page** (it is only called by the owner `PublisherActivityFeed` via a server action), so the public GET is reachable but unused by the shipped UI — an opportunity to shrink the default surface before it gains consumers.

**Intended feature behavior (target state).**
- A single defined **public-share data contract** (`PublicActivityViewModel` allow-list) that names exactly which fields a recipient may see, plus redaction rules for free-text and metadata.
- The activity route returns only allow-listed, re-hashed, internal-filtered, recipient-scoped rows with stable pagination and per-token rate limits.
- Recipient display names, author identities, and event metadata are resolved server-side and never expose raw emails, internal UUIDs, IP/UA hashes, or cross-recipient data.
- Retention covers comments, responses, recipients, and publications (today only `shared_link_events` and `collaboration_audit_events` are purged).
- Revoked/expired/publication-unavailable returns a uniform 404 with no existence leak and is never edge-cached.
- Privacy tests (route-level, not just composer-level) prove each minimization rule, plus adversarial scenarios for token guessing, cross-recipient access, soft-delete/revoked reads, and oversized input.

**Planning scope (in).**
- The public share activity surface: `src/app/api/share/[token]/activity/route.ts` and its sibling routes (`/comment`, `/decision`, `/events`, `/session`, `/password`, `/unsubscribe`, root snapshot `route.ts`).
- The data-access layer that backs it: `src/lib/publication/d1-store.ts`, `src/lib/publication/public-repository.ts`, `src/lib/publication/activity-helpers.ts`, `src/lib/activity/activity-composer.ts`, `src/lib/activity/activity-visibility.ts`, `src/lib/activity/activity-formatters.ts`.
- Recipient identity and session model: `src/lib/publication/security.ts`, `src/app/api/share/[token]/session/route.ts`.
- Retention/compliance: `src/lib/compliance/retention-core.ts`, the `30 3 * * *` cron in `src/lib/workers/worker.ts`, `migrations/0033_privacy_request_register.sql`, `migrations/0034_data_retention_events.sql`.
- Logging safety: `src/lib/observability/redact.ts`, raw `console.error` sites on share routes.
- The owner-side mirror action `loadSharedLinkActivity` (`src/lib/publication/actions.ts`) — referenced for parity, not redesigned.
- Tests: `tests/vitest/activity-security.test.ts`, `tests/vitest/security-findings-publication-contracts.test.ts`, `tests/vitest/share/share-page-get-routes-contract.test.ts`, `tests/vitest/share-no-store-invariants.test.ts`, `tests/vitest/project-publication-activity.test.tsx`, `tests/vitest/shared-link-activity-benchmark.test.ts`.

**Non-goals (out).**
- Implementing any code change. This is planning-only.
- Mutating D1/R2/DO/Queue/Email/Workers provider state, applying migrations, or running the retention cron.
- Redesigning the estimate snapshot, proposal package, or collaboration-realtime surfaces (separate plans exist).
- Replacing Better Auth or the recipient-session model.
- Enabling paid Cloudflare add-ons (Turnstile paid tier, WAF custom rules paid, Workers Analytics paid) without owner approval — call out as owner decisions.
- Visual/UX redesign of the share page. `DESIGN.md` is alpha and not law.

**Required codebase analysis.** Public activity route + sibling routes inventory; data-access/repository function map; D1 schema + retention-rule coverage map; credential-material taxonomy for the share surface; logging-safety audit of share routes; test-coverage gap map (composer-level vs route-level); Next.js 16 App Router cache/`no-store` and `force-dynamic` behavior for the activity route.

**Required specialist workstreams.** Product strategy/scope; existing architecture & conventions; UX/UI/a11y (recipient review journeys); frontend components/state; backend/API/network; data/database/retention/integrity; information security/privacy/auth; performance/reliability; testing/QA; deployment/observability/rollout; blast radius/dependencies; adversarial gap analysis.

**Implementation-readiness criteria.** `IMPLEMENTATION-READY` for the internally-resolvable minimization slices (DTO allow-list tightening, over-fetch removal, allow-list facts filter, route-level privacy tests, retention-rule additions, redactor routing, revoked/expired uniformity). `CONDITIONALLY READY` for slices that carry owner decisions (secret splitting, Turnstile/WAF, server-side session revocation, retention TTL sign-off) and real-provider proof (D1 readback, hosted route probe).

**Validation criteria.** Two+ critique-and-revision cycles for this exhaustive package; requirement-by-requirement traceability; shadow-path matrices for the activity read and the comment/decision/event write flows; a credential-material taxonomy for the share surface; a privacy test matrix that covers each minimization rule; performance evaluator contract for the activity route pagination; no application code modified.

**Stop condition.** The pack is complete when an executor can narrow the public activity surface and verify no unnecessary data is exposed, per the PROMPT.md stop condition.

**Blocker condition.** Owner decisions on secret splitting, Turnstile/WAF adoption, retention TTLs, and session revocation remain external (recorded in `15_DECISIONS...md`); the package is `CONDITIONALLY READY` until resolved or explicitly accepted.

---

## Skills and repository instructions used

| Skill / instruction | Used? | Why |
|---|---|---|
| `Creating-Plan-Prompt.md` | Yes | Authoritative planning directive for this pack (defines the exhaustive doc set, readiness rubric, completion gates). |
| `Multi-Agent-Execution-Directive.md` | Yes | Coordination contract, evidence-class honesty, planning-only boundary, credential-material taxonomy requirement, shadow-path matrix requirement. |
| `AGENTS.md` (repo root) | Yes | Stack baseline, verification policy, Cloudflare standing auth + free-tier posture, proportional verification, `.ai` map. |
| `.agents/skills/archestimator-plan-pack/SKILL.md` | Yes | Confirms this is high-blast-radius work (publication/shared-link flow) that warrants a dated plan pack. |
| `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` | Referenced | Loop activation criteria for planning-only work. |
| `.ai/10_state/current-state.md` | Read FAST PATH only | Project stage: preparing for first users; prioritize auth, estimating, cost library, proposal package, collaboration/publication proof. |
| `.agents/skills/performance-goal/SKILL.md` | Referenced | Evaluator-contract shape used for the activity-route performance contract (`09_…md`). |
| `.agents/skills/ultraqa/SKILL.md` | Referenced | Adversarial scenario matrix shape used for `19_…md`. |
| `.agents/skills/gitnexus/SKILL.md` | Not invoked | Proportional graph policy: this audit was a focused read sweep on the share surface handled by parallel `Explore` lanes; no risky symbol refactor. |
| `ultrawork`, `ultragoal`, `autopilot`, `autoresearch*` | Not invoked as native workflows | Their *contracts* (parallel lanes, durable-goal ledger, adversarial QA, evaluator-gated research) are reflected into the plan documents per the workflow-contracts section of `Creating-Plan-Prompt.md`. No native goal/ledger tool was available, so durable-goal contracts are recorded as document artifacts in `11_IMPLEMENTATION_PLAN.md`. |
| Cloudflare skills (`cloudflare`, `wrangler`, `workers-best-practices`, `durable-objects`) | Referenced (not loaded) | Used to confirm free-tier posture and D1/DO boundary language; no provider mutation in this planning-only pass. |

**Unavailable capabilities honestly recorded:** no native independent verifier lane and no native goal/ledger tool in this session. Verification is `emulated`; durable-goal contracts live in `11_IMPLEMENTATION_PLAN.md` as artifacts.

---

## Specialist workstreams (lanes)

| # | Lane | Mode | Status | Key findings location |
|---|---|---|---|---|
| L1 | Lead coordinator / synthesizer | same-agent | Done | All docs |
| L2 | Public activity route + sibling routes + components | native `Explore` subagent | Done | `03_SOURCE_AND_CODEBASE_AUDIT.md` §A–B, `07_…md`, `08_…md` |
| L3 | D1 schema + repositories + retention coverage | native `Explore` subagent | Done | `03_…md` §C, `07_…md`, `14_…md` (retention gap) |
| L4 | Security/privacy/auth + credential-material taxonomy | native `Explore` subagent | Done | `08_SECURITY_PRIVACY_THREAT_MODEL.md`, `21_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md` |
| L5 | Test-coverage gap map | lead, read-only | Done | `03_…md` §D, `12_…md`, `19_…md` |
| L6 | Next.js 16 framework grounding (cache/no-store/force-dynamic) | lead, read-only | Done | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` |
| L7 | Adversarial reviewer | emulated pass | Done | `19_…md`, `17_FINAL_READINESS_REVIEW.md` |
| L8 | Final verifier | emulated pass | Done | `17_FINAL_READINESS_REVIEW.md` |

---

## Coordination ledger (summary)

| Lane | /goal | Owned scope | Dependencies | Findings | Decisions/Rejected | Conflicts | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| L2 | Map the activity route, sibling routes, and share components | `src/app/api/share/[token]/**`, `src/components/share/**`, `src/components/workshop/publisher/**` | none | Activity route is one aggregated public endpoint; over-fetch of `author_email` (d1-store.ts:484) and recipient `email` (d1-store.ts:545); deny-list facts filter (activity-composer.ts:449-452); `meta` dead path; no UI consumer on recipient page; no route-level test | Reject "split into many sub-routes" — one aggregated route is fine if the contract is tight | none | file:line inventory + DTO allow-list | Done |
| L3 | Map D1 schema, repositories, retention | `migrations/**`, `src/lib/publication/d1-store.ts`, `public-repository.ts`, `retention-core.ts` | none | Migration 0014 is the core; no soft-delete on any share table; retention covers `shared_link_events` (90d) + `collaboration_audit_events` (365d) but NOT comments/responses/recipients/publications/publication_events; recipient email stored plaintext (by design) | Reject hashing recipient email — breaks email-matching proposals view; instead add retention + minimization | none | migration SQL + retention rule list | Done |
| L4 | Threat model + credential taxonomy | share auth/session/logging/CSP | none | No P0; P1-1 no lockout on token guessing; P1-2 no Turnstile/WAF; P1-3 single shared secret; P2-2 raw `console.error` bypasses redactor; P2-1 own-email echo; revoked→404 uniform (good); `no-store` everywhere (good) | Reject "rotate all secrets now" — owner decision; plan the split as a phase | none | file:line + secret map | Done |
| L5 | Map test coverage | `tests/vitest/**` | L2 | Composer security well tested; route wiring only covered by brittle string-matching; no route-handler test for `/activity` GET (pagination, password gate, recipient-scoping, internal filter at HTTP layer, over-fetch) | Reject "broad validate as the proof" — targeted route tests are the right size | none | test file inventory | Done |
| L6 | Ground framework claims | `node_modules/next/dist/docs/` (referenced) | none | `force-dynamic` + `Cache-Control: no-store` is correct for token-bearing private data; no Cache Components on share routes; cursor pagination must stay server-authoritative | Reject client-controlled offset pagination | none | directive + doc reference | Done |
| L7 | Adversarial | whole pack | L1–L6 | See `19_…md` AQ-01..18 | none | none | findings list | Done |
| L8 | Final verify | whole pack | L1–L7 | See `17_…md` | none | none | scorecard | Done |

---

## File/module ownership for this planning pass

All writes confined to `.ai/03_plans/2026-07-07-public-share-activity-minimization/`. No writes outside the plan folder. No application code, tests, migrations, configs, or provider state touched.

---

## Concurrent-repository safety

`git status` at start showed unrelated modified/untracked files (transition/loading plan docs, component-library/estimate-sheet edits, skills, etc.). These were not touched. All planning writes are isolated to the new plan folder. The plan folder is unique to this date+slug; no sibling pack was overwritten.
