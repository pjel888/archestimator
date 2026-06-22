# Verification Matrix And Proof Runbook

Date: 2026-06-22

This document maps targeted verification IDs to proof surfaces. It preserves the project's speed guardrail: do not run browser/provider proof by default; run it only for claims that cannot be proven by static, unit, component, or script evidence.

## Current Test Inventory

Current repository inventory on 2026-06-22:

- `425` Vitest files under `tests/vitest`.
- `21` Playwright/e2e files under `e2e`.
- `5` Bun unit files under `tests/unit`.

## Targeted Verification Matrix

| Verification ID | Local command shape | Browser/provider proof when required | Pass criteria | Evidence record |
|---|---|---|---|---|
| `TV-PUBLIC` | `bunx vitest run tests/vitest/closed-beta-pricing-copy.test.ts tests/vitest/contact-form-mailto.test.tsx tests/vitest/legal-terms-content.test.ts tests/vitest/landing-security-headers.test.ts` | `bun run test:e2e -- e2e/landing-audit.spec.ts` only for rendered navigation/copy claims. | Public claims match beta maturity; legal/contact routes work. | CSV row plus testing notes. |
| `TV-AUTH` | `bunx vitest run tests/vitest/auth-redirect-sanitizer.test.ts tests/vitest/auth-onboarding-contract.test.ts tests/vitest/auth-session-closed-beta.test.ts tests/vitest/beta-access-required-page.test.ts tests/vitest/legal-terms-gate.test.ts` | `bun run launch:verify-hosted-auth` for hosted sign-in/terms claims. | Unsafe redirects fail closed; beta/terms states have recovery copy. | Auth proof artifact and CSV update. |
| `TV-INVITE` | `bunx vitest run tests/vitest/project-invite-entry-route.test.ts tests/vitest/project-invite-entry-schema.test.ts tests/vitest/pending-invite-cookie.test.ts` | `bun run test:e2e -- e2e/project-invite-entry.spec.ts` for full invite journey. | Token states, wrong-account, continue/sign-out, and repair copy work. | Invite proof artifact. |
| `TV-WORKSHOP-ADMIN` | `bunx vitest run tests/vitest/workshop-settings-modal-content-view.test.tsx tests/vitest/account-settings-form-fields-ui.test.tsx tests/vitest/closed-beta-allowlist-admin-ui.test.tsx tests/vitest/beta-feedback-review-ui.test.tsx` | Browser only for joined settings/admin navigation. | Role-limited states are visible and safe. | Admin/support proof. |
| `TV-PROJECT-DASHBOARD` | `bunx vitest run tests/vitest/project-dashboard-client.test.tsx tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/project-details-modal.test.tsx tests/vitest/projects-page-group-mode.test.tsx tests/vitest/bulk-destructive-preview-modal.test.tsx` | Browser only for joined project route and dashboard scan. | Project state, dirty modals, group delete, destructive semantics, readiness states pass. | Project proof artifact. |
| `TV-ESTIMATE-SHEET` | `bunx vitest run tests/vitest/project-estimates-inline-edit.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-sheet-route-loading.test.ts` | `bun run test:e2e -- e2e/estimate-tabs.spec.ts e2e/estimate-tree-dnd.spec.ts` for joined browser claims. | Save/error/focus/keyboard/tree interactions are explicit and recoverable. | Estimate proof artifact. |
| `TV-FIELD-HANDOFF` | Future proof surface only until `DEC-UX-031-FIELD-WORKFLOWS` in `09-decision-ledger.md` selects the first beta slice. Create contract/component tests for package contents, access-path behavior, receipt, and feedback before any status promotion. | Browser proof only after a real field handoff flow exists. | Contractor/builder or field-operator persona reaches the intended package through the intended access path and can acknowledge/provide feedback only within scope. | Field proof artifact. |
| `TV-LIBRARY-SOURCING` | `bunx vitest run tests/vitest/component-library-manager.test.tsx tests/vitest/library-source-trust.test.ts tests/vitest/component-library-versioning-schema.test.ts tests/vitest/library-add-component-modal-a11y.test.tsx` plus new stale/accepted-cost tests when built. | Provider/storage proof for attachments and hosted files. | Source freshness, attachment currentness, accepted-cost state are clear and scoped. | Library proof artifact. |
| `TV-DATA-MAPS` | `bunx vitest run tests/vitest/project-charts-a11y.test.tsx tests/vitest/project-charts-aggregation.test.ts tests/vitest/project-location-map-provider.test.tsx tests/vitest/project-location-actions.test.ts` | Maps provider proof only when claiming configured live map behavior. | Charts pass semantic tests; location can degrade to address-only. | Data/maps proof artifact. |
| `TV-COLLABORATION` | `bunx vitest run tests/vitest/project-collaboration-actions.test.ts tests/vitest/project-collaboration-realtime.test.ts tests/vitest/estimate-cursor-broadcast-throttle.test.ts tests/vitest/estimate-cursor-identity.test.ts` | `bun run test:e2e -- e2e/teamspace-collaboration.spec.ts` for two-user/presence claims. | Invite/collaboration/presence state is scoped and recoverable. | Collaboration proof artifact. |
| `TV-SHARE-RECIPIENT` | `bunx vitest run tests/vitest/project-publication-security.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/share/share-page-decision-anonymous.test.tsx tests/vitest/share/share-summary-card.test.tsx tests/vitest/share-unsubscribe-interstitial.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/share-snapshot-redaction.test.tsx` | `bun run test:e2e -- e2e/shared-link-receiver.spec.ts` for recipient comprehension/session/print flow. | Recipient can understand, recover, print, comment/decide, and no private data leaks. | Share proof artifact. |
| `TV-ASSET-API` | `bunx vitest run tests/vitest/project-location-map-csp.test.ts tests/vitest/estimate-image-url.test.ts tests/vitest/storage-cleanup-allowlist.test.ts` plus attachment tests when built. | Storage/provider proof for hosted upload/retrieval. | Upload and asset failures are safe, scoped, and recoverable. | Asset proof artifact. |
| `TV-AI` | `bunx vitest run tests/vitest/ai-auth-guard.test.ts tests/vitest/ai-package-builder-provider.test.ts tests/vitest/ai-package-builder-draft.test.ts tests/vitest/ai-package-builder-security-contract.test.ts` | Provider/model quality proof is separate and not implied by local tests. | Disabled/quota/provider/draft states and data exposure controls pass. | AI proof artifact. |
| `TV-OPS-SUPPORT` | `bun run launch:check-resend-readiness && bun run launch:check-vercel-env && bun run launch:check-vercel-health && bun run launch:check-support-dns && bun run launch:check-support-monitoring && bun run launch:check-legal-owner && bun run launch:check-supabase-linked-readiness && bun run launch:check-supabase-migrations && bun run launch:check-supabase-backup` | Hosted/provider dashboards, inbox proof, monitoring alert/drain, legal owner review when required. | Each provider/operator row is pass/fail/blocked with owner and artifact. | Provider proof run. |
| `TV-ROUTE-ALIASES` | `bunx vitest run tests/vitest/route-error-smoke-gate.test.ts tests/vitest/workshop-route-error-boundaries.test.tsx && bun run test:e2e -- e2e/workshop-library-routes.spec.ts e2e/workshop-route-error-boundaries.spec.ts` | Browser included only for alias/route boundary claim. | Explicit routes, aliases, and error boundaries match current code. | Route proof artifact. |

## Provider Proof Runbook

| Provider proof | Command or artifact | Pass/fail rule |
|---|---|---|
| Supabase linked readiness | `bun run launch:check-supabase-linked-readiness`; `bun run launch:supabase-readiness` when credentials are available. | Pass only if linked project is Archestimator `ebxxqidacheyapmmzavr` and checks succeed. |
| Supabase migrations/backups | `bun run launch:check-supabase-migrations`; `bun run launch:check-supabase-backup`. | Pass if migrations/backups are current under beta cost policy; PITR remains disabled unless reapproved. |
| Resend readiness | `bun run launch:check-resend-readiness`; `bun run launch:check-support-dns`; webhook tests. | Pass only with env/DNS/webhook evidence and inbox/manual proof where delivery is claimed. |
| Vercel runtime | `bun run launch:check-vercel-env`; `bun run launch:check-vercel-health`; `bun run launch:check-vercel-production`; `bun run launch:verify-hosted-sensitive-routes`. | Pass only against the intended hosted target, not local routes. |
| Maps/Places | Local provider-missing tests plus manual/provider key/quota/billing evidence. | Pass local fallback separately from live map provider behavior. |
| Monitoring | `bun run launch:check-support-monitoring` plus actual alert/drain proof if claiming live monitoring. | Pass only when owner, channel, alert, and review window are known. |
| Export/share hosted | `bun run launch:verify-hosted-export`; shared-link hosted proof scripts when available. | Pass only when hosted route and generated artifact are inspected. |

## Performance And Network Budgets

| Surface | Budget/proof expectation |
|---|---|
| Route transitions | `bun run perf:check-routes` and `bun run perf:measure-routes` when route flow changes. |
| Estimate sheet large data | Run estimate sheet large-data/perf tests before claiming high-volume readiness. |
| Share activity | Run activity benchmark/perf budget before claiming large history readiness. |
| Export workbook | Run proposal workbook benchmark/preflight tests before claiming large export readiness. |
| Dashboard queries | Run dashboard query count/route transition checks before changing dashboard data composition. |
| Provider outage | Proof must include degraded state and retry/copy-link/address-only/manual fallback as applicable. |

## Evidence Rules

- `Implemented` means source exists, not that a full user story is proven.
- `Concrete local tests identified` means tests exist, not that this pass ran them.
- Browser proof is required for joined interaction, responsive, recipient comprehension, two-user presence, or print claims.
- Provider proof is required for hosted auth, email delivery, Maps live behavior, Supabase linked/runtime, Vercel hosted runtime, monitoring alerts, or external legal/support proof.
- CSV updates must name the artifact path or command output that proves the status.
