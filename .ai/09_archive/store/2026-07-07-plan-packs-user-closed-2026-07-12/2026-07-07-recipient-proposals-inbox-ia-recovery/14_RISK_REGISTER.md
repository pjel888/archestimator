# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | Sibling pack changes a shared file (`share-copy.ts`, `page.tsx`, `security.ts`) out from under this pack | Concurrent agent activity | Medium | Medium | Medium | Share page, copy module | Fresh `git status` + re-read before edit | File-scope ownership ledger (`00_AGENT_COORDINATION.md`); re-read immediately before edit | Rebase/reconcile; preserve unfamiliar changes | Defer the conflicting slice until sibling lands | Lead | Low | open |
| RISK-02 | `resolveProjectPublicationAccessByToken` does not expose inactive-reason → ARCH-04 inline-render blocked | Resolver collapses inactive+unknown to null | Low | Medium | Low-Medium | Phase 1 | DISCOVERY task 1.2 | Named DISCOVERY step before implementation | Extend resolver read-only to return a discriminated status | Fallback to generic copy for inactive (lose differentiation) — acceptable but degrades FR-09/10 | Implementer | Low | open (mitigated by DISCOVERY) |
| RISK-03 | Wrong-account CTA accidentally discloses the intended recipient email | Copy or DOM includes an email | Low | High | Medium | ProposalRow, FR-06 | TEST-06 asserts no email in DOM | Generic copy; no email in the error payload | DOM denial test | Remove the email; revert to generic inline message | Implementer | Low | open (mitigated by test) |
| RISK-04 | Terminal-state differentiation enables token enumeration | Attacker observes expired/revoked vs unknown | Low | Medium | Low-Medium | Share page | Threat model T-01; TEST (SEC-05) | Only differentiate after row resolved (holder already has token) | Anti-enumeration test | Collapse to generic copy | Lead | Low | open (mitigated by design) |
| RISK-05 | Copy-contract test conflict (FR-08 vs existing "not final" assertion) breaks the build | Dialog-vs-badge finality ambiguity | Medium | Low | Low-Medium | SharePageDecision test | Test run | Reconcile in Phase 5 task 5.1 | Update the test to assert dialog-neutral + badge-final | Keep dialog neutral; badge says "Decision recorded" | Implementer | Low | open |
| RISK-06 | Receiver E2E false-green claim | Implementer claims E2E coverage that is skipped | Medium | Medium | Medium | E2E spec | Review | Skip-comment accuracy (task 6.2); never claim skipped coverage as passing | Mark E2E as opt-in; rely on DOM tests for V1 | Add the fixture (DISCOVERY 6.3) | Lead | Low | open |
| RISK-07 | Bundle-size regression from an accidental new client island | New `"use client"` introduced | Low | Low | Low | Build | `bun run build` bundle diff | ARCH-01 review | Revert the boundary | Move logic server-side | Implementer | Low | open |
| RISK-08 | Owner/internal estimate data leaks into a recipient DTO | Repository query changed (not in V1, but guard) | Very Low | High | Medium | Repository | Credential-free + DTO-shape tests | Existing assertion + recommended new assertion | Keep assertion green | Revert query | Implementer | Low | open (mitigated by existing test) |
| RISK-09 | Notification dispatch assumption (FR-14) misleads an implementer into wiring the bell | Implementer reads "notifications" and wires it | Low | Low | Low | notifications/* | Review | OPEN-IA-04 explicit deferral | Static review gate | Remove the wiring | Lead | Low | open |
| RISK-10 | OPEN-IA-01..04 owner decisions unresolved at implementation time | Owner has not signed off | High | Low-Medium | Medium | All phases | Decision tracker | Each OPEN has a recommended path; implementation can proceed on recommendations | Pause the named slice pending sign-off | Implement the recommended path; record as owner-delegated if owner delegates | Owner | Low-Medium | open |
| RISK-11 | Stale plan (sibling lands first, changes the surface) | Time gap between plan and implement | Medium | Medium | Medium | All | Stale-plan revalidation checklist (README) | Re-read files before edit | Revise the affected phase | Re-plan the slice | Implementer | Low-Medium | open |
| RISK-12 | `emulated` verification caps readiness at 97 / CONDITIONALLY READY | No independent reviewer in this session | Certain | Low-Medium | Low-Medium | Pack status | Readiness review | Document the cap honestly | Owner or external reviewer accepts the package | Mark CONDITIONALLY READY | Lead | Low-Medium | accepted |

## Severity definitions
- **High/Critical:** none. (No unmitigated high-blast-radius risk.)
- **Medium:** RISK-01, RISK-03, RISK-04, RISK-06, RISK-10, RISK-11 — all mitigated.
- **Low:** the rest.

## Top risks to watch during implementation
1. RISK-10 (open decisions) — confirm OPEN-IA-01..04 with the owner before or during implementation.
2. RISK-01/RISK-11 (concurrent sibling work) — strict re-read discipline.
3. RISK-02 (resolver shape) — resolve the DISCOVERY before Phase 1 task 1.3.
