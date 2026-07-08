# 19 — Research, Review, and QA Evidence

## 1. Research questions and sources

This is an internal-continuity plan grounded in repo evidence, not a provider-migration/best-practice research task. No external official-doc research materially shapes the requirements. Recorded per §4A (autoresearch discipline):

| Question | Primary source | Found? | Decision it shaped |
|---|---|---|---|
| Is `landing-v3` the live `/`? | repo (`src/app/page.tsx` + test guards) | Yes | ASSUMP-CONT-01; all footer/CTA targets |
| Is closed-beta grant-based or code-based? | repo (`closed-beta-access.ts`, `0001`) | Yes | DEC-CONT-02 (intake, not code) |
| Is terms gate pre- or post-auth? | repo (`workshop/layout.tsx`, `terms-gate.ts`) | Yes | DEC-CONT-01 (single post-auth gate) |
| Is email delivery wired? | repo (`cloudflare-email-client.ts`, `.env.example`) | Yes — wired but disabled by default | DEC-CONT-05 (owner-gated) |
| Do existing tables support the new audit/rate-limit needs? | repo (`0001`, `0004`, `security_rate_limit_events`) | Yes | DEC-CONT-06 (reuse, no migration) |
| Is there an existing claims/truthfulness framework? | repo (`claims-ledger`) | Yes | DEC-CONT-03 (reuse) |
| Next 16 Server Action form semantics | `node_modules/next/dist/docs/` | Not re-read (no framework-sensitive uncertainty; progressive-enhancement `<form action>` is stable) | WP-3.2 approach |

Nothing was searched-for-and-not-found that materially weakens the plan. No external best-practice research was required (the brief is an internal continuity redesign, not a provider/standard adoption).

## 2. Skills and workflows used or unavailable

| Capability | Used? | Substitute |
|---|---|---|
| Native subagents (Explore) | Yes — 3 parallel discovery lanes | — |
| Native independent verifier | **Unavailable** | emulated separated pass (caps readiness) |
| `ultrawork`/`autopilot`/`ultraqa` (as runtime loops) | **Not run** (planning-only) | referenced as the named shapes future implementation should satisfy |
| Playwright at planning time | **Not run** | evaluator specified for implementation (`12`/`09`) |
| GitNexus / code-review-graph | **Not needed** — narrow, well-understood surface; `rg` + targeted reads sufficed (per the proportional graph policy in `AGENTS.md`) | — |

## 3. Specialist workstream outputs (emulated passes by the lead)

| Workstream | Output location | Key finding |
|---|---|---|
| Product/scope | `02` | 9 brief elements → requirement groups; tight non-goals |
| Codebase architecture | `03`, `06` | v3 live; trust ordering sound; delta is frontend+1 action+1 email |
| UX/a11y | `05` | states + a11y defined; browser proof mostly skippable |
| React/Next | `06` §5, `18` | no new `"use client"` preferred; progressive-enhancement form |
| Backend/auth/data | `07`, `21` | no migration for core; reuse tables |
| Security/privacy | `08`, `20` | one new surface (`requestBetaAccess`) — mitigated by design+test |
| Performance | `09` | low risk; Playwright evaluator |
| Test/QA | `12` | matrix + adversarial matrix |
| Rollout/ops | `13` | staged ladder |
| Blast radius | `10` | additive, disjoint from active WIP |
| Adversarial | §5 below | 18 scenarios |
| Final verification | `17` | emulated; CONDITIONALLY READY |

## 4. Critique-and-revision cycle summaries

**Cycle 1 (full):** found + fixed — PGP-key decision, credential-material doc (`20`), DB-blueprint doc (`21`), welcome-email trigger-site ambiguity, uniform-receipt control (SEC-CONT-03), `/cookies` static-contract impact.
**Cycle 2 (targeted P0/P1):** confirmed `requestBetaAccess` self-validation, trust-boundary ordering, no-overclaim guarantee, email idempotency race mitigation.
No P0 remains. No unresolved critical contradiction.

## 5. UltraQA-style adversarial scenario matrix

See `12` §3 (ADV-01..18). Summary: 17 specified runtime scenarios + 1 not-applicable-with-reason (prompt injection — no AI surface). Covers flooding, enumeration, honeypot bypass, direct POST, XSS-in-admin-queue, replay, concurrency, delivery failure, redirect hops, broken links, missing metadata. All have expected signals + test/proof owners.

## 6. Performance evaluator contract

See `09` §2. Declared evaluator = Playwright (`landing-audit.spec.ts` extend + `/workshop` bounce redirect-count + `/login` TTFB). Production RUM = external rollout gate (sibling `production-rum-and-cwv-telemetry`). Passing ordinary unit tests is **not** the perf evaluator.

## 7. Independent final verifier evidence

**`verification_mode: emulated`.** The final verifier pass ran a requirement-by-requirement audit against the brief's nine "map" elements and all FR/UX/A11Y/ARCH/SEC/REL/OPS/TEST/DOC requirements using a distinct checklist from the authoring pass. Findings: all requirements traced to exact paths/symbols; no hallucinated requirement; shadow-path matrices complete; no missing credential boundary; no missing DB blueprint. The pass confirmed the cap to `CONDITIONALLY READY` due to (a) emulated mode and (b) external copy/label + email-delivery decisions.

## 8. Explicit validation gaps

| Gap | Why | Residual risk | Unblocking action |
|---|---|---|---|
| No independent reviewer | not available in-session | readiness capped at 97 / status CR | owner/external reviewer performs a separated pass |
| No hosted smoke at planning time | planning-only (no deploy) | hosted-path unverified | L2 gate (§5 of `13`) |
| No email deliverability proof | delivery disabled | welcome-email UX unverified | owner enables delivery (Phase 4) |
| No production RUM | external (sibling pack) | prod CWV unverified | sibling pack; this pack requires no-regression via Playwright |
| No dynamic adversarial execution at planning time | docs-only task | runtime behavior unverified | implementation runs the ADV matrix (`12` §3) |
| PGP key publication undecided | owner/security decision | `/security` references possibly dangling | OPEN-CONT (owner) |
| Domain unconfirmed | owner/ops | canonicals possibly wrong | OPEN-CONT-05 |

None of these is internally resolvable by a planning task. All have a named owner and safe path.
