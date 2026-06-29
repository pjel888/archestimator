# 00 - Agent Coordination

## Master goal

Convert the confirmed feature decisions and current codebase evidence into an implementation-ready plan that lets a separate coding agent ship `/workshop/proposals` without rediscovering requirements, architecture, security boundaries, or proof gates.

**This is a planning-only task.** No application code, tests, migrations, package manifests, provider state, or runtime data are modified by this plan pack.

## Specialist workstream coverage

| Lane | Coverage | Mode |
|---|---|---|
| Lead coordinator / synthesizer | Integrated source evidence, owner-delegated decisions, and council findings | same-agent |
| Product strategy, scope, requirements | User-confirmed scope plus owner-delegated decisions | same-agent + council-reviewed |
| Codebase architecture audit | Direct reads of sidebar, workshop shell, projects pattern, publication actions/security, and migrations | source-audit |
| UX / UI / accessibility reviewer | Native design lane reviewed status copy, click behavior, state matrix, and proof needs | independent |
| Frontend / Next.js feasibility reviewer | Native feasibility lane reviewed route shape, Server Function refetch, and enum/status correctness | independent |
| Data / database / API reviewer | Native security/data lane reviewed RPCs, token taxonomy, cookie/session bridge, and RLS constraints | independent |
| Test / QA strategist | Native test lane reviewed SQL, action, DOM, static leak, and browser proof requirements | independent |
| Adversarial reviewer | Council findings challenged the original plan and produced P0/P1 repairs | independent |
| Final verifier | Native verifier lane `Hypatia` passed the repaired package with no P0/P1 contradictions | independent |

**Verification mode:** `independent` for the repaired plan package. Earlier timed-out explore agents are historical only; current readiness is based on direct source reads plus four completed native council lanes. The final plan still does not claim provider, browser, or runtime proof; those are implementation gates.

## Council review summary

| Council lane | Highest finding | Resolution |
|---|---|---|
| Security/data | P0: `project_publications.token_hash` was incorrectly treated as a URL token; `recipient_token_hash` cannot create the existing share-session cookie | Replaced with authorization-only RPC + server-side `encrypted_token` decrypt + existing cookie helper |
| Feasibility/Next.js | P0: plan referenced a non-existent fourth publication status and omitted a client-callable read transport | Status contract is `published`, `expired`, `revoked`; added explicit `"use server"` loader |
| Product/UX/design | P1: open decisions blocked readiness and state coverage was incomplete | Owner-delegated same-tab redirect, status copy, sidebar shortcuts, expired/revoked behavior |
| Test/QA | P0/P1: mocked-only tests would not prove RLS/security; browser proof was not a required gate for browser-only claims | Added provider SQL proof, static leak checks, action matrix, and mandatory browser smoke |

See `20_OWNER_DELEGATED_DECISIONS_AND_COUNCIL_REVIEW.md` for the full integration record.

## Skills and prompts applied

- `archestimator-plan-pack` / `Creating-Plan-Prompt.md` - exhaustive plan-pack structure and loop ledger.
- `Improve-Plan-Prompt.md` - planning-only repair contract, owner-delegated decisions, readiness labels.
- `Multi-Agent-Execution-Directive.md` - native subagent coverage, verification labeling, coordination ledger.
- Named workflow/design/review skills from the user request were loaded as planning guidance where relevant; they did not authorize source/runtime/provider edits.

Skipped evidence surfaces:

- Browser, Playwright, provider SQL, build, type-check, and app tests were intentionally not run because this task is planning-only.
- Storybook/Impeccable visual proof is deferred unless implementation diverges from existing workshop patterns or browser proof reveals a UI defect.

## Source authority decisions

| Source | Authority | Notes |
|---|---|---|
| User-confirmed decisions | Highest - product intent | Top-level Proposals nav, separate estimator Sent view later, ship without lite account, cross-workspace email match |
| User owner-delegation grant | High for planning only | Used to resolve reversible UX/status/shortcut choices; does not imply human approval or runtime authority |
| Current source files and migrations | High - implementation reality | Corrected token/session model and publication status enum |
| Native council outputs | High - independent review evidence | P0/P1 findings integrated into docs |
| Older draft plan text | Low | Superseded where it conflicted with source reality or council findings |

## Stop conditions

- All plan-pack documents are internally consistent with the repaired token/session model.
- Owner-delegated decisions are recorded; no open owner/product decisions block implementation start.
- Final verifier confirms no P0/P1 stale contradictions remain. ✅
- Static docs-only validation passes (`git diff --check` and stale-term scan).

## Open decisions carried forward

None for implementation start. Implementation completion is still blocked on evidence, not decisions: provider SQL proof, browser proof, targeted tests, type/lint/build checks as specified in `12_TEST_AND_VALIDATION_STRATEGY.md`.
