# 16 — Requirements Traceability Matrix

Every requirement traces to source, implementation task, acceptance criterion, test, and rollout check. No requirement is untraced.

| Requirement ID | Source | User outcome | Implementation phase / task | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|
| FR-01 | brief + repo | Reconciled inbox/share entry points | P4 (4.1) + doc | `SharePageSessionBanner.tsx`, `proposals-page-client.tsx` | AC-FR-01a/b | TEST (banner-link) | spot-check share→inbox nav | pending |
| FR-02 | brief | Email-link → inbox continuity | P4 (4.1) + P6 | `SharePageSessionBanner.tsx` | AC-FR-02a/b | TEST (banner-link + decision→refresh) | spot-check | pending |
| FR-03 | repo (pin) | Open action unchanged | P6 (regression) | `openRecipientProposalAction` | AC-FR-03a/b | `recipient-proposals-action.test.ts` | regression | pending |
| FR-04 | brief | Forked empty state | P2 (2.1) | `ProposalsEmptyState.tsx` | AC-FR-04a/b | TEST-04 | spot-check empty inbox | pending |
| FR-05 | repo + OPEN-IA-01 | Hybrid matching documented | P6 (regression) | `recipient-proposals-repository.ts` | AC-FR-05a/b | credential-free test | regression | pending |
| FR-06 | brief + repo | Wrong-account CTA | P3 (3.1) | `ProposalRow.tsx` | AC-FR-06a/b/c | TEST-06 | spot-check | pending |
| FR-07 | repo (pin) | Decision chip in inbox | P6 (extend) | `ProposalRow.tsx` | AC-FR-07a/b | TEST-07 | regression | pending |
| FR-08 | brief + OPEN-IA-03 | Badge finality | P5 (5.1) | `SharePageDecision.tsx` | AC-FR-08a/b/c | TEST-08 | spot-check | pending |
| FR-09 | brief | Expired copy | P1 (1.1, 1.3) | `share-copy.ts`, `page.tsx` | AC-FR-09a/b | TEST-09 | spot-check expired link | pending |
| FR-10 | brief | Revoked copy + error boundary | P1 (1.1, 1.3, 1.4) | `share-copy.ts`, `page.tsx`, `not-found.tsx`, **new** `error.tsx` | AC-FR-10a/b/c | TEST-10 | spot-check revoked + 500 | pending |
| FR-11 | repo + OPEN-IA-03 | History V1 latest-only | doc | `recipient-proposals-repository.ts` (comment/ADR) | AC-FR-11a/b | static review | n/a | pending |
| FR-12 | repo (pin) | Immutability | P6 (regression) | `shared_link_responses` index | AC-FR-12a/b | `project-publication-decision.test.tsx` 409 | regression | pending |
| FR-13 | repo (pin) | Anonymous read-only | P6 (regression) | `SharePageDecision.tsx` | AC-FR-13a | `share-page-decision-anonymous.test.tsx` | regression | pending |
| FR-14 | repo + OPEN-IA-04 | Email-only V1 | doc | `notifications/*` (no wiring) | AC-FR-14a/b | static review | n/a | pending |
| UX-01 | repo + dec :931 | Review-portal IA | doc + P2/P3 | inbox components | UX-01 | TEST-01 | spot-check | pending |
| UX-02 | repo | Status chip cues | P6 (extend) | `ProposalRow.tsx` | UX-02 | TEST-15 | regression | pending |
| UX-03 | brief | Empty-state fork | P2 | `ProposalsEmptyState.tsx` | = FR-04 | TEST-04 | spot-check | pending |
| UX-04 | brief | Wrong-account CTA | P3 | `ProposalRow.tsx` | = FR-06 | TEST-06 | spot-check | pending |
| UX-05 | brief | Decision finality | P5 | `SharePageDecision.tsx` | = FR-08 | TEST-08 | spot-check | pending |
| UX-06 | brief | Terminal copy | P1 | `page.tsx`, `share-copy.ts` | = FR-09/10 | TEST-09/10 | spot-check | pending |
| UX-07 | repo (pin) | Loading skeletons | P6 (regression) | skeletons | UX-07 | existing | regression | pending |
| UX-08 | repo | Mobile responsive | static review | components | UX-08 | static review | spot-check | pending |
| UX-09 | OPEN-IA-03 | History affordance (none V1) | doc | — | = FR-11 | static review | n/a | pending |
| A11Y-01 | derived | Keyboard operability | P2/P3/P4 | CTAs | A11Y-01 | TEST-18 | spot-check | pending |
| A11Y-02 | repo (pin) | Focus management | P6 (extend) | retry-focus | A11Y-02 | TEST-18 | regression | pending |
| A11Y-03 | derived | SR semantics | P1/P6 | terminal + chips | A11Y-03 | TEST-19 | spot-check | pending |
| A11Y-04 | derived | Non-color cues | P6 | chips | = UX-02 | TEST-15 | regression | pending |
| ARCH-01 | derived | Server/client boundary | P6 (build) | all | ARCH-01 | build bundle check | regression | pending |
| ARCH-02 | derived | Bridge via link | P4 | banner | ARCH-02 | static review | spot-check | pending |
| ARCH-03 | derived | No new auth | doc | — | ARCH-03 | static review | n/a | pending |
| ARCH-04 | derived | Terminal render mechanism | P1 (1.2, 1.3) | `page.tsx`, resolver | ARCH-04 | TEST-09/10 | spot-check | pending |
| DATA-01 | repo | No V1 migration | doc | — | DATA-01 | `ls migrations/` | n/a | pending |
| DATA-02 | repo | Credential-free DTO | P6 (regression) | repository | DATA-02 | credential-free test | regression | pending |
| DATA-03 | repo | Immutability | = FR-12 | index | DATA-03 | 409 test | regression | pending |
| API-01 | derived | No new API route | doc | — | API-01 | static review | n/a | pending |
| SEC-01 | repo | Token handling unchanged | doc | `security.ts` | SEC-01 | static review | n/a | pending |
| SEC-02 | OPEN-IA-01 | Hybrid matching | = FR-05 | repository | SEC-02 | = FR-05 test | regression | pending |
| SEC-03 | repo | Authority separation | doc | `roles.ts` | SEC-03 | static review | n/a | pending |
| SEC-04 | brief | Non-leaky wrong-account | P3 | `ProposalRow.tsx` | SEC-04 | TEST-06 (no email) | spot-check | pending |
| SEC-05 | brief | Anti-enumeration | P1 | terminal copy | SEC-05 | TEST-09/10 distinct | spot-check | pending |
| SEC-06 | repo | Owner data isolation | P6 (extend) | repository | SEC-06 | DTO-shape test | regression | pending |
| SEC-07 | derived | Notification privacy | doc | digest (owner-scoped) | SEC-07 | static review | n/a | pending |
| PERF-01 | repo | Query budget | P6 (regression) | repository | PERF-01 | repo test + EXPLAIN (deferred) | regression | pending |
| PERF-02 | derived | No new client JS | P6 (build) | all | PERF-02 | build bundle check | regression | pending |
| REL-01 | derived | Graceful degradation | P1 (1.4) + P6 | `error.tsx`, banners | REL-01 | TEST-10 | spot-check | pending |
| OPS-01 | derived | No new infra | doc | — | OPS-01 | `wrangler.jsonc` unchanged | n/a | pending |
| TEST-01..20 | derived | Coverage | P6 | tests | per matrix | `bun run test:dom` | gate | pending |
| DOC-01 | derived | current-state.md | post-impl | `.ai/10_state/` | DOC-01 | post-impl | n/a | pending |
| DOC-02 | derived | decisions.md | post-impl | `.ai/10_state/` | DOC-02 | post-impl | n/a | pending |

## Performance-sensitive requirements (additional mapping)

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-01 (inbox query) | 1 query, LIMIT 50, index-backed | unchanged | vitest (mocked) + D1 EXPLAIN (impl) | N/A (no query change) | n/a |
| PERF-02 (bundle) | current inbox client JS | ±0 (except route `error.tsx`) | `bun run build` | > +1KB client JS | revert boundary |

## Untraced requirements

None. Every requirement maps to at least one task, test, and rollout check (or is explicitly a doc/regression pin).
