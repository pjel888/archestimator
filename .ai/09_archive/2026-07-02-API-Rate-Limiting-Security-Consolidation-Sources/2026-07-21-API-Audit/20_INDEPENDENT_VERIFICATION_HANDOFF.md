# 20 — Independent Verification Handoff

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Created: 2026-07-01 (PHT) by lead (Sisyphus, iteration-11) — supersedes no prior doc; closes the OPEN-004 "independent reviewer needed" gap with a pick-up-cold handoff.
> Verification mode this doc enables: `verification_mode: independent` (per Multi-Agent-Execution-Directive §2) — the only path that can lift the package past the `same-agent` cap of 94 toward `IMPLEMENTATION-READY`.

## Why this document exists

Two consecutive sessions (iteration-2 prior + iteration-9/10 current) attempted independent verification via dispatched parallel lanes (explore, librarian, oracle subagent types). **All 8 dispatched lanes across both sessions produced zero usable output** — explore timed out at 30m inactivity; librarian errored at 45m; oracle errored at 31m; fresh dispatch + continuation both returned `auth-token-invalidated`. The mandatory Oracle verifier call in ULTRAWORK LOOP 2/500 also failed with the same auth error.

**Effective verification classification through iteration-10: `same-agent`** (per Multi-Agent-Execution-Directive §2 lines 175-193 — dispatch-with-zero-output does not constitute a separated pass). This caps the package at readiness score 94 and `CONDITIONALLY READY` status.

This document hands the verification task to an independent reviewer (OPEN-004) — a different agent, session, or human reviewer — so the package can be honestly reclassified `verification_mode: independent` if the reviewer's distinct output confirms the findings.

## Who should pick this up

Any of:
- A different AI agent on a **distinct session** (Codex, Kimi, DeepSeek, Gemini if reapproved, or another Claude session with fresh context — NOT the same Sisyphus session that authored iteration-8/9/10).
- A human reviewer (Philip or a designated engineer) willing to spot-check the file:line citations and the cross-doc ID consistency.
- A future Sisyphus session that explicitly identifies as a fresh pass (new context window, not continuation of iteration-9/10 chat history).

**You are independent if and only if:** you did not author the iteration-8/9/10 patches yourself AND you are reading the plan pack + source files fresh (not from cached chat context).

## What the lead already did (so the reviewer does not redo it)

Iteration-9/10 (lead-authored, `same-agent` classification) applied these patches:

| File | Change |
|---|---|
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Header reclassified. §2 fetch chain now includes `routeCanonicalHostRedirect` (SRC-020). §1 binding inventory now includes 5-var upload-config `vars` block (SRC-021). SRC-003 corrected to distinguish 3 observability sampling rates (SRC-022). SRC-* ledger extended. |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Header reclassified. Verification-update block added: C1/C4/C5/C12 PROVEN with file:line, C6 downgraded to PARTIAL (encryption-at-rest claim needs `invite-entry.ts` inspection), C9 INCOMPLETE (DO WS ticket path not sampled). 6/30 Action files upgraded from TBD → PREVIEW-PASS. Existing `@/lib/authz/d1-access.ts` + `withActionErrors` infrastructure noted. |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | SRC coverage map extended with SRC-020/021/022. Count updated 19 → 22. |
| `17_FINAL_READINESS_REVIEW.md` | Header honestly reclassified `emulated` → `same-agent` effective. Scoring table refreshed. Verification-mode classification table rewritten. |
| `README.md` | Header verification-mode notation updated. Deliverables line updated to "22 SRC-* IDs". |
| `LOOP_LEDGER.md` | Iterations 9 + 10 added. |

**The reviewer's job is NOT to re-author these patches.** The reviewer's job is to independently confirm or contradict them, then surface anything the lead missed.

## Four verification scopes (V1-V4) — pick one or run all

Each scope is self-contained. A reviewer may pick a single scope (e.g., a human reviewer with limited time picks V1) or run all four. Each scope has its own pass/fail criteria.

---

### V1 — API Surface Inventory Verification

**Question:** Does `03_SOURCE_AND_CODEBASE_AUDIT.md` accurately reflect the current codebase?

**Lead's claim:** PROVEN. Counts match exactly (29 Route Handlers + 30 Server Action files + 29 D1 migrations + 7 bindings). 3 P2 inventory gaps patched (SRC-020/021/022).

**Inputs the reviewer reads:**
- `.ai/03_plans/2026-07-21-API-Audit/03_SOURCE_AND_CODEBASE_AUDIT.md` (full)
- `.ai/03_plans/2026-07-21-API-Audit/README.md` (blocked decisions + stale-revalidation checklist)

**Source the reviewer verifies against:**
- `wrangler.jsonc` (full) — confirm 7 bindings: `ARCH_UPLOADS_R2`, `ARCH_DB`, `COLLAB_ROOMS`, `UPLOAD_JOBS_QUEUE`, `EMAIL`, `IMAGES`, `ASSETS`
- `cloudflare-env.d.ts` lines 4-31 — confirm `__BaseEnv_CloudflareEnv` matches
- `worker.ts` (full) — confirm fetch chain order (canonical-host-redirect → fast-health → malformed-share-token → protected-proof → collaboration-room → static-public-page-cache → openNext fallback)
- `find src/app -name 'route.ts' -o -name 'route.tsx' | wc -l` should equal 29
- `grep -rIl '"use server"' src/lib --include='*.ts' --include='*.tsx' | wc -l` should equal 30
- `ls migrations/*.sql | wc -l` should equal 29

**Spot-checks (file:line citations the lead added):**
- `routeCanonicalHostRedirect` at `src/lib/cloudflare/worker-route-optimizations.ts:125` — does this function exist and is it the first link in the fetch chain?
- 5 upload-config `vars` in `wrangler.jsonc:97-103` — do all 5 appear (`ARCH_UPLOAD_HOSTED_MEMORY_MB`, `_BODY_LIMIT_BYTES`, `_ROUTE_DURATION_MS`, `_CONCURRENT_UPLOADS`, `_STORAGE_LATENCY_P95_MS`)?
- 3 observability sampling rates in `wrangler.jsonc:82-96` — overall `0.1`, logs `0.1`, traces `0.05`. Are they distinct?

**Output format:**
```
## V1 — Independent Verification Verdict

### Verification mode: independent (reviewer name + session identifier)

### Counts
- Route Handlers: claimed 29, actual N
- Server Action files: claimed 30, actual N
- D1 migrations: claimed 29, actual N
- Bindings: claimed 7, actual N

### Spot-check results
| Citation | Verified? | Notes |
|---|---|---|
| routeCanonicalHostRedirect at worker-route-optimizations.ts:125 | Y/N | |
| 5 upload-config vars in wrangler.jsonc:97-103 | Y/N | |
| 3 observability sampling rates in wrangler.jsonc:82-96 | Y/N | |

### Findings
- New gaps the lead missed: ...
- Citations that don't resolve: ...

### Verdict
PROVEN | PARTIALLY PROVEN | CONTRADICTED — one-line summary.
```

**Pass criterion:** All counts match; all 3 spot-checks verified Y; no new gaps surfaced OR new gaps are minor (P2 only).

---

### V2 — Security & Credential Verification

**Question:** Does `08_SECURITY_PRIVACY_THREAT_MODEL.md` accurately capture (a) every distinct credential material in use, (b) the actual auth/ownership patterns in Server Actions, (c) the D1 RLS-equivalent row-level access scoping?

**Lead's claim:** PARTIALLY PROVEN. C1/C4/C5/C12 PROVEN with file:line. C6 downgraded to PARTIAL (encryption claim needs further inspection). C9 INCOMPLETE (DO WS ticket not sampled). 6/30 Action files upgraded TBD → PREVIEW-PASS. Existing `d1-access.ts` + `withActionErrors` infrastructure noted.

**Inputs the reviewer reads:**
- `.ai/03_plans/2026-07-21-API-Audit/08_SECURITY_PRIVACY_THREAT_MODEL.md` (full, including the "Verification update 2026-07-01" block the lead added)
- `.ai/03_plans/2026-07-21-API-Audit/14_RISK_REGISTER.md` (RISK-001/002/003/005/011/035 P0 risks the reviewer should try to confirm or refute)

**Source the reviewer verifies against:**

*Credential materials (sample at least C1, C4, C6, C9):*
- C1 session cookie: confirm cookie names `better-auth.session_token` + `__Secure-better-auth.session_token` at `src/lib/auth/actions.ts:85-86`
- C4 publication token raw (encrypted): confirm `encryptPublicationToken` imported at `src/lib/publication/actions.ts:14-15` AND inspect `src/lib/publication/security.ts` to confirm `encryptPublicationToken` actually uses `PUBLICATION_TOKEN_ENCRYPTION_SECRET` for symmetric encryption (not just hashing)
- C6 invite token: confirm `createInviteToken` at `src/lib/collaboration/actions.ts:13` AND inspect `src/lib/collaboration/invite-entry.ts` to confirm whether token is stored encrypted-at-rest (CR-002 claim) or hash-only (would downgrade from PARTIAL to CONTRADICTED)
- C9 WebSocket ticket: inspect the DO upgrade path — likely `src/lib/cloudflare/collaboration-room-router.ts` and `src/lib/cloudflare/collaboration-room.ts` — to confirm (a) ticket mint surface, (b) ticket signed by session, (c) one-shot use, (d) per-session rate limit

*Server Action sampling (sample at least 8 of the 30, including the 6 the lead pre-verified):*
- For each sampled Action: does it have auth check + ownership check + input validation + idempotency + stable error contract? file:line for each.
- Confirm the lead's 6 PREVIEW-PASS verdicts are correct.
- Sample at least 2 Action files the lead marked TBD and either confirm TBD is appropriate or upgrade to PREVIEW-PASS / FAIL.

*D1 RLS-equivalent scoping (sample at least 6 prepared statements):*
- For each: is the query scoped by `workspace_id` or `owner_id` (or is the table genuinely workspace-agnostic)?
- Confirm `src/lib/authz/d1-access.ts` (306 lines) exists and centralizes this pattern.

**Output format:**
```
## V2 — Independent Verification Verdict

### Verification mode: independent (reviewer name + session identifier)

### Credential material taxonomy
| C-XXX | Lead's claim | Reviewer verdict | Evidence |
|---|---|---|---|
| C1 | PROVEN | CONFIRM/DOWNGRADE/UPGRADE | path:LINE |
| C4 | PROVEN | ... | |
| C6 | PARTIAL | ... | (inspection of invite-entry.ts result) |
| C9 | INCOMPLETE | ... | (inspection of collaboration-room-router result) |

### Server Action verdict sampling
| Action | Lead's verdict | Reviewer verdict | Match? |
|---|---|---|---|
| estimates/actions.ts | PREVIEW-PASS | ... | |
| publication/actions.ts | PREVIEW-PASS | ... | |
| collaboration/actions.ts | PREVIEW-PASS | ... | |
| projects/actions.ts | PREVIEW-PASS | ... | |
| component-library/actions.ts | PREVIEW-PASS | ... | |
| auth/actions.ts | PREVIEW-PASS | ... | |
| (2+ sampled by reviewer from the 24 TBD) | TBD | ... | |

### D1 RLS-equivalent scoping
| Prepared statement (file:line) | Table | Scoped by | P0 unscoped? |
|---|---|---|---|

### P0/P1 findings
- ...

### Verdict
PROVEN | PARTIALLY PROVEN | CONTRADICTED — one-line summary.
```

**Pass criterion:** No new P0 findings; C6 downgraded/confirmed honestly; C9 confirmed or honestly INCOMPLETE; sampled Actions match lead's PREVIEW-PASS verdicts.

---

### V3 — Cloudflare/Better Auth Docs Currency Verification

**Question:** Are the framework/provider citations in `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` and `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` CURRENT (no deprecated APIs cited as current, no version-mismatched claims, no stale numeric limits)?

**Lead's claim:** INCOMPLETE. Lead could not do per-citation live-docs verification without per-citation webfetch (out of iteration-9/10 scope). Cross-reference against `wrangler.jsonc` and source confirms internal consistency but not external currency.

**Inputs the reviewer reads:**
- `.ai/03_plans/2026-07-21-API-Audit/18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` (full)
- `.ai/03_plans/2026-07-21-API-Audit/19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` (full)

**Source the reviewer verifies against:**
- `developers.cloudflare.com/d1/worker-api/d1-database/` — prepared statement shape
- `developers.cloudflare.com/d1/platform/limits/` — D1 query size / row limits
- `developers.cloudflare.com/r2/api/` — R2 signed URL mechanics
- `developers.cloudflare.com/durable-objects/api/` — DO `alarm()`, WS hibernation, SQLite storage API
- `developers.cloudflare.com/queues/` — batch size, max retries, DLQ semantics
- `developers.cloudflare.com/workers/cron-triggers/` — overlap protection (or lack thereof)
- `developers.cloudflare.com/email-routing/send-email/` — SendEmail binding shape
- `developers.cloudflare.com/workers/observability/` — logs/traces sampling rates and retention
- `better-auth.com/docs/concepts/database` — D1 adapter schema requirements
- `better-auth.com/docs/concepts/users-accounts` — account-linking rules
- `opennext.js.org/cloudflare` — Worker compat flags, adapter compatibility with Next 16
- `node_modules/next/dist/docs/` — local Next.js 16 App Router / Server Action / Route Handler behavior

**Specific claims to spot-check:**
- `18_*.md` line 116: "Ratelimiter storage on D1 (NOT KV — eventual consistency is unsuitable per Cloudflare guidance)" — is this Cloudflare guidance current?
- `18_*.md` line 152: "sampling 0.1 logs / 0.05 traces" — matches `wrangler.jsonc:82-96` ✓ but does it match current Cloudflare observability docs?
- `18_*.md` line 127: "Per-surface p50/p95/p99 budget per `09_*.md` (D1 ≤600ms, R2 mint ≤2s, Email ≤10s, DO RPC ≤500ms)" — are these budgets realistic per current Cloudflare limits?
- All numeric limits cited in 18 + 19 — Cloudflare limits change; flag any stale value.

**Output format:**
```
## V3 — Independent Verification Verdict

### Verification mode: independent (reviewer name + session identifier)

### Confirmed citations
| Citation (doc:section) | Claim | Confirmed by (URL + section) |
|---|---|---|

### Stale / deprecated / wrong-value citations
| Citation | Claimed | Actual | URL | Severity |
|---|---|---|---|---|

### Verdict
PROVEN | PARTIALLY PROVEN | CONTRADICTED — one-line summary with count.
```

**Pass criterion:** Zero deprecated APIs cited as current; zero wrong numeric limits; or every contradiction surfaced is at P2 severity (cosmetic, not blocking).

---

### V4 — Adversarial Review of All 22 Docs

**Question:** What P0/P1 omissions, contradictions, unsupported claims, or readiness-inflation did the lead miss across the 22-doc pack?

**Lead's claim:** No new P0 found in V4 scope. 1 P1 fixed (SRC-* count contradiction in 16). 8 untouched docs (04/07/09/11/12/13/15/19) NOT fully adversarially reviewed due to ponytail scope.

**Inputs the reviewer reads:**
- ALL 22 deliverables in `.ai/03_plans/2026-07-21-API-Audit/`
- `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md` (the rubric — especially §Adversarial Review)
- `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` (the orchestration contract)

**Source the reviewer spot-checks:**
- `.ai/10_state/current-state.md` FAST PATH block — confirm runtime hasn't drifted since audit
- `wrangler.jsonc` (full)
- `worker.ts` (full)
- 2-3 Server Action files of reviewer's choosing
- 1-2 `route.ts` files of reviewer's choosing

**Questions the reviewer asks (per Improve-Plan-Prompt §Adversarial Review):**
1. What user/product outcome would cause this plan to remediate the WRONG thing?
2. What attack vector does the threat model miss entirely?
3. Which `RISK-*` or `REQ-*` is untestable as written?
4. Which implementation unit (`WP-*`) has vague acceptance criteria?
5. Which doc contradicts another doc?
6. Which score in `17_*.md` is inflated vs the evidence cited?
7. Which credential material is mis-classified?
8. Which Server Action is missing from the inventory?
9. Which D1 query is missing the `workspace_id` scope check?
10. Which rollout phase is missing a rollback path?
11. Which performance budget lacks a measurement command?
12. Which test scenario lacks a proof-contract row?
13. What's the SINGLE most damaging omission you can find?

**Specific gaps the lead already acknowledged (do not re-flag):**
- 8 untouched docs (04/07/09/11/12/13/15/19) not adversarially reviewed in iteration-9/10
- C9 WebSocket ticket path not sampled (V2 scope)
- C6 invite token encryption-at-rest not verified (V2 scope)
- Live per-citation docs-currency not done (V3 scope)
- Subagent dispatch infrastructure broken — environmental, not lead-quality

**Output format:**
```
## V4 — Independent Adversarial Review Verdict

### Verification mode: independent adversarial (reviewer name + session identifier)

### P0 findings (block IMPLEMENTATION-READY; unresolved caps readiness at NOT-READY-for-remediation)
- [ADV-P0-N] Description. Why P0. Where in source/plan. Suggested fix.

### P1 findings (must be patched before lifting CONDITIONALLY-READY cap)
- [ADV-P1-N] ...

### P2 findings (operational debt; record but don't block)
- [ADV-P2-N] ...

### Score inflation findings (17_*.md dimension scores vs evidence)
- ...

### Cross-doc contradictions the lead missed
- ...

### Readiness verdict (reviewer's independent call)
- Should the package stay at `CONDITIONALLY READY`, drop to `NOT READY`, or lift to `IMPLEMENTATION-READY`?
- One-paragraph justification grounded in findings.

### What the reviewer could NOT break (independently confirmed)
- ...

### Single most damaging omission
- ...
```

**Pass criterion:** Zero unresolved P0 findings; P1 findings either patched by reviewer or explicitly deferred with owner + deadline; readiness verdict grounded in finding set.

---

## Pass/fail rules for the package as a whole

Per `Multi-Agent-Execution-Directive` §2 lines 175-193:

| Independent reviewer outcome | Package reclassification |
|---|---|
| All 4 scopes PROVEN, zero new P0, zero unresolved P1 | Lift to `verification_mode: independent`; readiness score may rise to 97-100; package may move from `CONDITIONALLY READY` → `IMPLEMENTATION-READY` if all other completion gates pass |
| 1-2 scopes PARTIALLY PROVEN, P1 findings patched in reviewer's pass | Lift to `verification_mode: independent` for confirmed scopes; package stays `CONDITIONALLY READY` overall but with stronger evidence density per dimension |
| Any scope CONTRADICTED with P0 finding | Drop to `NOT READY`; lead must patch the contradiction and the package re-enters verification |
| Reviewer cannot complete (time, access, expertise constraints) | Stay `CONDITIONALLY READY` with the reviewer's partial output recorded in `LOOP_LEDGER.md` as iteration 11+ |

## How to record the verification result

When the independent reviewer completes:

1. **Append the reviewer's output verbatim** to a new file `.ai/03_plans/2026-07-21-API-Audit/21_INDEPENDENT_VERIFICATION_RESULT.md` (or extend this doc with a "## Reviewer output" section).
2. **Update `17_FINAL_READINESS_REVIEW.md`** header + scoring table + verification-mode table to reflect the new classification.
3. **Update `README.md`** verification-mode header line.
4. **Append iteration 11 (or next number) to `LOOP_LEDGER.md`** recording: reviewer name, reviewer session identifier, scope(s) run, verdict, patches applied (if any), new readiness classification.
5. **Apply any P1 patches the reviewer surfaced** as targeted edits to the affected docs.
6. **If reviewer approves lift to `IMPLEMENTATION-READY`**: update the README canonical readiness status line and consider archiving per the README archive policy.

## Reviewer credentials / authority

- The reviewer does NOT need owner (Philip) authority to perform verification — verification is read-only.
- The reviewer DOES need Philip authority to apply destructive changes (e.g., dropping readiness to `NOT READY` without intent to remediate, or archiving the pack).
- The reviewer's distinct session output IS the independent evidence; the reviewer must NOT be the same chat context as iteration-8/9/10 (Sisyphus) — that would re-introduce `same-agent` classification.

## Honest constraints on what this handoff can deliver

This document is a CONTRACT for verification, not verification itself. It enables OPEN-004 to close, but it does not close OPEN-004 by itself. The lift from `CONDITIONALLY READY` → `IMPLEMENTATION-READY` requires the actual independent reviewer output, recorded per the "How to record" section above.

If no reviewer picks this up within 14 days of audit authoring (i.e., by 2026-07-15 PHT), the package should be reclassified `CONDITIONALLY READY — STALE` per the README stale-revalidation checklist, and a v2 audit pack should be opened instead.

## Contact / escalation

- Pack author / iteration-8/9/10 lead: Sisyphus (Claude Opus 4.7 in this env; same-agent classification applies to any continuation).
- Owner: Philip.
- Sibling plan packs to cross-reference: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/`, `.ai/03_plans/2026-06-29-Rate-Limiting/`, `.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/` — all READ-ONLY inputs.
- Governance prompts: `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md` + `Multi-Agent-Execution-Directive.md`.
