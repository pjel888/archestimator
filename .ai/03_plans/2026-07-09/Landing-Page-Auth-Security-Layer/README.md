# Landing-Page → Workshop Auth Security Layer — Audit & Plan Pack

**Date:** 2026-07-09
**Owner goal:** Prove that the only way a user reaches the app (workshop
dashboard and all protected surfaces) — other than the landing page and other
intentionally-public pages — is by authenticating through Google OAuth or the
magic-link email flow. Every attack vector must be covered.
**Plan profile:** `exhaustive` (auth/security/data-integrity, public surfaces,
closed-beta, launch readiness — all explicit exhaustive triggers).
**Suite status:** `CONDITIONALLY READY` — v2 added SEC-11 (session token at rest,
P1) and RFU-gated items (SEC-5/12/13/14). Phases 1, 2, 4 are implementation-ready;
phases 1.5, 3 are gated on Phase 0.5 (DISCOVERY-REQUIRED) resolving RFU-1/2/3/4.
`verification_mode: emulated` (see `17_FINAL_READINESS_REVIEW.md`).

> **V2 (2026-07-09) upgrade:** This pack was audited against the Improve-Plan
> directive. v2 added 4 documents (`20`–`23`), surfaced SEC-11 (session-token
> at-rest — a second verifier-compromise vector v1 missed), and corrected the
> v1 framing from "no current bypass" to the more accurate "no auth-method
> bypass; two verifier-compromise hardening items." See `23_CRITIQUE_AND_IMPROVEMENT_LOG.md`.

---

## Plan-folder path

```
/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-07-09/Landing-Page-Auth-Security-Layer
```

## Master goal

Guarantee, with evidence, that **every protected surface in Archestimator is
reachable only through Better Auth (Google OAuth + magic link)**, and that the
landing page + public pages are the only unauthenticated entry points. Harden
the auth layer against the enumerated attack vectors, prioritizing the single
P0 (magic-link tokens stored plaintext in D1) and the defense-in-depth gaps that
would let a future regression create a bypass.

## What this pack is

This is an **audit-first, then-hardening** pack. The audit (phase 0) is already
performed and recorded in `03_SOURCE_AND_CODEBASE_AUDIT.md`; it confirms the
access-control posture is strong but identifies one P0 and several P1/P2
defense-in-depth improvements. The implementation phases (1–5) turn those
findings into safe, ordered, independently-landable tasks.

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** — the authoritative execution guide.

## Phase order (dependency-aware)

| Phase | Objective | Depends on | Risk | Ready? |
|---|---|---|---|---|
| **0.5 — Discovery (RFU-1/2/3/4)** | Resolve Better Auth behavior assumptions for SEC-11/14/5/12 | none | None (read-only) | DISCOVERY-REQUIRED |
| **1 — Hash magic-link tokens (P0, SEC-1)** | Stop storing magic-link verification tokens in plaintext in D1 | none | High | ✅ Implementation-ready |
| **1.5 — Session token at rest (P1, SEC-11)** | Hash session.token at rest OR compensating controls | Phase 0.5 (RFU-1) | High (gated on DEC-6) | Gated on RFU-1 |
| **2 — Defense-in-depth (SEC-3/4)** | Action-layer auth + fail-closed repos | none | Low–Med | ✅ Implementation-ready |
| **3 — Hardening (SEC-5/7/12/13/14)** | Rate limits, schema contract, log-leak, secret-separation, accountLinking | Phase 0.5 (RFU-2/3/4) | Med | Partially gated |
| **4 — CSP enforcement (SEC-6)** | Report-Only → enforced | none | Med | Implementation-ready (may defer) |
| **5 — Proof harness (SEC-2/8/9/10/ARCH-1)** | Denial/role/exclusivity/cookie tests + hosted gates | Phases 1+1.5+2+3 | Low | After others land |

**Dependency graph (v2):**

```
Phase 0.5 (research: RFU-1/2/3/4) ── DISCOVERY-REQUIRED
   ├──> Phase 1.5 (SEC-11, gated on RFU-1)
   ├──> Phase 3 (SEC-5/12/14, gated on RFU-2/3/4)
   │
Phase 1 (SEC-1, P0) ─── ready now
Phase 2 (SEC-3/4) ───── ready now, parallel-safe
Phase 4 (SEC-6) ─────── independent, may defer
Phase 5 (proof) ─────── after 1+1.5+2+3
```

## Requirement/task/test traceability

- Full matrix: `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.
- Requirements: `04_REQUIREMENTS_SPECIFICATION.md` (FR/SEC/ARCH/...; v2 added SEC-8–14).
- Tasks: `11_IMPLEMENTATION_PLAN.md` (each maps back to REQ IDs; v2 added Phase 0.5 + 1.5).
- **Credential taxonomy (authoritative material reference):** `21_CREDENTIAL_MATERIAL_TAXONOMY.md`.
- **Industry-standard mapping (OWASP ASVS/NIST/CWE):** `20_INDUSTRY_STANDARD_FACETS_ANALYSIS.md`.
- **Attacker chains (adversarial):** `22_ATTACKER_PLAYBOOK.md`.

## Document index (v2 — 26 docs)

| # | Doc | Purpose |
|---|---|---|
| README | This file | Entrypoint, status, phase order |
| 00 | AGENT_COORDINATION | Orchestration, lanes, ledger |
| 01 | EXECUTIVE_SUMMARY | Findings + answer (v2: +F-7..F-10) |
| 02 | FEATURE_BRIEF_AND_SCOPE | Intent, in/out of scope |
| 03 | SOURCE_AND_CODEBASE_AUDIT | Evidence base (v2: corrected framing) |
| 04 | REQUIREMENTS_SPECIFICATION | SEC-1..SEC-14, ARCH-1, FR-1 |
| 05 | UX_UI_ACCESSIBILITY_PLAN | Minimal (auth UX preserved) |
| 06 | ARCHITECTURE_AND_TECHNICAL_DESIGN | 4-layer gate + flows |
| 07 | DATA_DATABASE_API_NETWORK_PLAN | No DDL; config-only |
| 08 | SECURITY_PRIVACY_THREAT_MODEL | STRIDE + T-1..T-31 (v2) |
| 09 | PERFORMANCE_RELIABILITY_OBSERVABILITY | Cookie-cache trade-off, probes |
| 10 | BLAST_RADIUS_AND_DEPENDENCIES | Direct + transitive impact |
| 11 | IMPLEMENTATION_PLAN | Phases 0.5,1,1.5,2,3,4,5 (v2) |
| 12 | TEST_AND_VALIDATION_STRATEGY | Matrix + UltraQA scenarios |
| 13 | ROLLOUT_ROLLBACK_AND_OPERATIONS | Per-phase gates + rollback |
| 14 | RISK_REGISTER | RISK-1..16 (v2: +12..16) |
| 15 | DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES | DEC-1..9, ASSUMP/RFU (v2) |
| 16 | REQUIREMENTS_TRACEABILITY_MATRIX | All reqs traced (v2: +7 rows) |
| 17 | FINAL_READINESS_REVIEW | Scores + verifier mode (v2 re-scored) |
| 18 | STACK_CONTRACT_AND_PRODUCTION_STANDARDS | Cross-cutting decisions |
| 19 | RESEARCH_REVIEW_AND_QA_EVIDENCE | Research + gaps (v2: +RFU) |
| **20** | **INDUSTRY_STANDARD_FACETS_ANALYSIS** | **OWASP ASVS / NIST / CWE / API Top10 (v2 new)** |
| **21** | **CREDENTIAL_MATERIAL_TAXONOMY** | **18-material taxonomy (v2 new)** |
| **22** | **ATTACKER_PLAYBOOK** | **14 attack chains (v2 new)** |
| **23** | **CRITIQUE_AND_IMPROVEMENT_LOG** | **v1→v2 gap record (v2 new)** |
| LOOP_LEDGER | Coordination log | v1 + v2 cycles |

## Blocked decisions table

| Decision | Options | Recommendation | Owner | Blocking? |
|---|---|---|---|---|
| Cookie cache: keep disabled (D1 read every request) vs enable with short TTL | (a) keep disabled [current], (b) enable 60s TTL | Keep disabled for security; revisit only if D1 read load becomes a measured bottleneck | Owner | No (current is safe) |
| Session expiry: 7d default vs shorter for closed beta | (a) 7d [current], (b) 24h | Keep 7d default for now; closed-beta users are owner-curated | Owner | No |
| CSP nonce infrastructure: build now vs defer | (a) build nonce middleware now, (b) keep Report-Only through launch | Build nonce infra in phase 4 but gate enforcement behind owner sign-off; report-only until verified | Owner | Phase 4 only |

## Stale-plan revalidation checklist (before first edit)

Before implementing any task, the implementer must re-verify:
1. `git status --short --branch` — confirm no concurrent edits to auth files.
2. Re-read `src/lib/auth/request-proxy.ts`, `src/lib/auth/better-auth-cloudflare.ts`,
   `src/lib/auth/session.ts`, `src/lib/auth/actions.ts` (these are the load-bearing files).
3. Confirm Better Auth version (`node_modules/better-auth/package.json`) — this
   pack was audited against **1.6.23**; if it has changed, re-read the magic-link
   plugin source before phase 1.
4. Re-run `bun run type-check` to establish a green baseline.
5. Confirm `migrations/` latest number (currently `0040`) so new migrations sequence correctly.
6. Verify `ARCHESTIMATOR_AUTH_PROVIDER` resolves to a `better-auth` variant in the target env.

## Commands to run before the first edit

```bash
git status --short --branch
bun run type-check          # green baseline
bun run validate:error-handling   # non-mutating static gate
bun run test               # focused, or the auth-related subset
```

## Files explicitly off-limits (no change in this plan)

- `migrations/supabase/*` — legacy, do not touch.
- Better Auth `node_modules/better-auth/*` — do not patch; configure via plugin options only.
- Any Cloudflare provider project outside the `wrangler.jsonc`-bound resources.
- Git history / branches (shared live worktree; no auto-branching).

## Files and systems intentionally unaffected

- Landing page content/UI (`src/app/page.tsx`, marketing pages) — no change.
- Workshop dashboard UI components — no change (only their auth gates).
- R2 / Durable Objects / Queues / Email bindings — no change to bindings.
- D1 app-data tables (projects, estimates, publications, etc.) — no schema change.

## External proof that remains required before production rollout

- Hosted D1 readback proving `verification` rows are now stored hashed (phase 1 proof gate).
- `wrangler tail` / Workers Logs proof that a live magic-link sign-in still works end-to-end after hashing.
- Owner confirmation that closed-beta allowlist posture is intentional.
- Phase 4 CSP enforcement: staged canary with no regression in workshop functionality before full enforcement.

## Archive policy

Do **not** archive automatically. Archive the pack (move to `.ai/03_plans/_archived/`
or mark complete in ledger) only after all phases land AND the hosted proof gates
in phase 5 pass. Named-completed slices may be marked in `LOOP_LEDGER.md`.

## Verification mode

`verification_mode: emulated` — the audit lanes were run as parallel read-only
exploration subagents (independent evidence gathering), and the final review was
performed by the lead synthesizer as a separated pass. Under the suite rubric,
emulated verification caps overall readiness at **97** and caps package status
at `CONDITIONALLY READY` for high-blast-radius work unless a real independent
reviewer or explicit owner acceptance reviews the final package. This pack is
marked `IMPLEMENTATION-READY` for the **internally-resolvable** scope, but the
P0 fix (phase 1) should receive independent human review or a separate
adversarial QA pass before production rollout.
