# Units

> See `../00-PLAN.md` § "Dependency graph" for the acyclic ordering and the
> canonical `next_unit`. Each unit below is one root-cause cluster. Symptoms
> absorbed are listed in each unit's `## findings` section.

## Unit index

| Unit | Status | Severity | Findings | Dependencies | Owned paths |
|---|---|---|---|---|---|
| [001](./001-action-inbox-async-server-actions.md) | READY | Critical | UX-BUILD-001 | none | src/lib/admin/action-inbox-actions.ts |
| [002](./002-closed-beta-lead-capture.md) | READY | Critical | UX-LEAD-001, UX-LEAD-002, UX-SIGNUP-001 | [001](./001-action-inbox-async-server-actions.md) | src/components/auth/ClosedBetaGate.tsx, src/components/landing/ContactForm.tsx, src/app/contact/ (new route.ts OR server action) |
| [003](./003-landing-cta-unification.md) | READY | High | UX-CTA-001 | none | src/components/landing/LandingHeader.tsx (+ optional consolidation) |
| [004](./004-remove-ab-experiment-wrapper.md) | READY | Medium | UX-CTA-002 | none | src/app/page.tsx, src/components/landing/ABExperimentProvider.tsx |
| [005](./005-first-estimate-checklist-publish.md) | READY | High | UX-ACTIVATE-001 | none | src/lib/onboarding/first-estimate-checklist.ts, src/components/workshop/FirstEstimateChecklist.tsx |
| [006](./006-guided-sample-prominence.md) | READY | Medium | UX-ACTIVATE-002 | none | src/components/workshop/FirstProjectZeroState.tsx |
| [007](./007-library-overview-orientation.md) | READY | Medium | UX-EMPTY-001 | none | src/components/workshop/library/overview/LibraryOverview.tsx |
| [008](./008-magic-link-and-session-expiry-copy.md) | READY | Medium | UX-MAGIC-001, UX-SESSION-001 | none | src/lib/auth/error-mapping.ts, src/app/login/ (banner) |
| [009](./009-xlsx-export-discoverability.md) | READY | Medium | UX-EXPORT-001 | none | src/components/workshop/ProjectEstimatesTable.tsx (overflow menu) |
| [010](./010-invite-page-affordances.md) | READY | Low | UX-INVITE-001, UX-INVITE-002 | none | src/app/invite/[token]/page.tsx |
| [011](./011-share-password-ux.md) | READY | Medium | UX-SHARE-001, UX-SHARE-002 | none | src/components/share/ProjectPublicationPasswordForm.tsx |
| [012](./012-landing-copy-ph-vocabulary.md) | READY | Medium | UX-VOCAB-001, UX-LEAD-003 | none | src/components/landing-v3/landing-content.ts, src/app/contact/page.tsx |
| [013](./013-polish-batch.md) | READY | Low/Info | UX-EMPTY-002, UX-EMPTY-003, UX-COPY-001, UX-MAGIC-002 | none | src/components/workshop/proposals-page/ProposalsEmptyState.tsx, src/components/workshop/FirstProjectZeroState.tsx, src/app/workshop/feedback/page.tsx, src/components/workshop/BetaFeedbackForm.tsx, src/lib/workshop/beta-feedback-actions.ts, src/lib/estimates/d1-intents/history-events.ts, src/components/auth/AuthStatusBanner.tsx, src/lib/auth/actions.ts |

## Severity / priority mapping

- Critical (UNIT-001, UNIT-002) — before recruiting. Blocking.
- High (UNIT-003, UNIT-005) — before user #1.
- Medium (UNIT-004, UNIT-006, UNIT-007, UNIT-008, UNIT-009, UNIT-011, UNIT-012) — before user #5.
- Low/Info (UNIT-010, UNIT-013) — before paid MVP (or defer).

The DAG is intentionally shallow: only UNIT-002 depends on UNIT-001, because
verifying the lead-capture fix requires a building codebase. All other units
edit disjoint files and can be picked in any order after UNIT-001.
