# 19 — Research, Review, and QA Evidence

## 19.1 Research questions and sources

This is a closure-procedure planning task grounded in repo evidence, not
external best-practice research. The "research" was source inspection.

| Research question | Source | Finding | Changed a decision? |
|---|---|---|---|
| What are the 12 gates and which are open? | `scripts/generate-cloudflare-provider-exit-pack.ts` lines 770-855; last pack md | 12 gates; 4 OPEN (7,10,11,12) all external | yes — defined the closure procedure |
| Is the source tree truly Supabase-free? | `rg -i supabase src/` (via Explore subagent) | 0 hits | yes — confirmed source-level exit |
| Is auth D1-backed? | `src/lib/auth/better-auth-cloudflare.ts:165`; `cloudflare-better-auth-runtime.ts:125` | yes, `database: options.d1Database` from `env.ARCH_DB` | yes — confirmed no Supabase auth |
| What can the generator NOT prove? | generator `NOTE` lines 102-103 | external provider state, mailbox, persona, secrets | yes — defined evidence-class honesty rule |
| What does `accepted-loss` require? | generator enum + data-integrity reasoning | generator permits by attestation alone | yes — added DEC-PE-03 sole-runtime rule |

No official-doc research was needed (no framework-version-sensitive behavior;
the stack is unchanged). Local Next.js docs were not consulted because no
Next.js behavior is in scope.

## 19.2 Specialist workstream outputs (subagent evidence)

Two **read-only Explore subagents** gathered source evidence (independent
lanes, real tool outputs — recorded honestly):

| Subagent | Scope | Key evidence returned |
|---|---|---|
| Explore #1 | provider-exit script + current-state + package scripts + scripts dir | 12-gate logic, 4 OPEN gates, generator `NOTE`, `cf:*` script map, operator-record schema, `accepted-loss` attestation-only gap |
| Explore #2 | wrangler.jsonc + migrations + supabase/ + src scan + Env type + Better Auth | bindings confirmed, 39 migrations, 0 src Supabase refs, `database: options.d1Database`, orphaned node_modules note |
| Explore #3 | sibling pack shape (d1-migration + cloudflare-worker) | 25-file exhaustive template, README section order, readiness score table, emulated verification pattern |

These were genuine delegated Explore lanes (independent evidence gathering),
not fabricated. They are distinct from the *authoring* passes (which were
emulated by the lead). The readiness cap remains `emulated` for authoring
because the adversarial review and final verification of the *planning
artifacts* were emulated passes by the lead, not native independent verifiers.

## 19.3 Skills used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | yes | dated-pack + LOOP_LEDGER + loop contract |
| Creating-Plan-Prompt directive | yes | exhaustive structure + readiness scoring |
| Multi-Agent-Execution-Directive | yes | authority model, evidence classes, completion audit |
| Explore subagent (native) | yes | parallel source-evidence gathering (3 lanes) |
| `gitnexus` | no | narrow doc-planning; `rg` + reads sufficient (proportional policy) |

No skills fabricated. No unavailable required skill.

## 19.4 Critique-and-revision cycles

### Cycle 1 (initial draft → self-critique)
- Drafted 00-13.
- Self-critique found: (a) `accepted-loss` needed a guardrail beyond the
  generator's attestation-only check → added DEC-PE-03 / `07_…` §7.4 rule;
  (b) credential-material taxonomy needed raw/hash/cookie/mailbox distinctions
  → added `08_…` §8.4; (c) smoke sequencing must be after the decision →
  tightened REL-PE-01 and Phase order.
- Revised: added DEC-PE-03, expanded `08_…` §8.4, fixed Phase 2 prerequisite.

### Cycle 2 (post-revision → adversarial)
- Adversarial pass (emulated) hunted: proxy-signal acceptance, gates falsely
  claimed closed, missing credential distinctions, stale-artifact trust.
- Found (P2): generator scan-path drift (`src/proxy.ts` vs `src/middleware.ts`)
  not yet recorded → added `03_…` §3.7 gap + RISK-PE-07; orphaned node_modules
  not yet recorded → added RISK-PE-08; md-vs-JSON divergence risk → added
  DEC-PE-06.
- No P0/P1 found. All P2 resolved.

Two complete cycles completed (minimum for exhaustive profile). A third cycle
would not improve correctness (remaining gaps are genuinely external).

## 19.5 UltraQA-style adversarial scenario matrix

See `12_…` §12.3 (AQ-1..AQ-8). Summary:
- AQ-1 secret in record → mitigated (SEC-PE-01 review).
- AQ-2 proxy-signal → mitigated (JSON is truth).
- AQ-3 loss-without-proof → mitigated (DEC-PE-03).
- AQ-4 concurrent edit → mitigated (LOOP_LEDGER lease).
- AQ-5 stale artifact → mitigated (stale-revalidation).
- AQ-6 partial smoke fail → mitigated (all-must-pass).
- AQ-7 scan-path drift → recorded (RISK-PE-07).
- AQ-8 orphaned node_modules → recorded (RISK-PE-08).

No unresolved P0/P1 adversarial finding.

## 19.6 Performance evaluator contract

Not applicable (justified in `09_…` §9.5). Closure has no runtime performance
surface. If a future task couples closure to code, it must define:
baseline metric, target, measurement command, fixture size, run count,
regression threshold, related tests, evidence artifact location.

## 19.7 Independent final verifier evidence

`verification_mode: emulated`. The final-verifier pass (`17_…`) was a
separated pass by the same agent (lead), not a native independent verifier.
Per the Suite Succession and Authority Contract, this caps overall readiness
at 97 and — for this high-blast-radius exhaustive profile — caps package
status at `CONDITIONALLY READY` unless a real independent reviewer or the
owner accepts (OPEN-PE-05).

## 19.8 Explicit validation gaps

| Gap | Why | Residual risk | Unblock action |
|---|---|---|---|
| No hosted/provider mutation proof | out of scope (no mutation) | legacy provider state unverified beyond attestation | operator attestation (honest) |
| No independent native verifier | unavailable in-session | status capped at CONDITIONALLY READY | OPEN-PE-05 independent review |
| Closure outcome not run | externally blocked | providerExitReady stays false until owner acts | OPEN-PE-01..04 |
| Stale-artifact freshness not enforced by generator | generator gap | gate may falsely PASS on stale artifact | stale-revalidation checklist + re-run generators |

## 19.9 What this pack does NOT claim

- Does not claim provider exit is complete (it is not — 4 gates OPEN).
- Does not claim hosted/provider/operator proof from local evidence.
- Does not claim independent verification.
- Does not claim Supabase/Resend/Vercel are cancelled/deleted.
- Does not claim zero risk or 100% readiness.
