# Verification Matrix And Proof Runbook

Date: 2026-06-22

This document maps targeted verification IDs to proof surfaces. It preserves the project's speed guardrail: do not run browser/provider proof by default; run it only for claims that cannot be proven by static, unit, component, or script evidence.

## Current Test Inventory

Current repository inventory on 2026-06-22:

- `429` Vitest files under `tests/vitest` (corrected 2026-06-22 from a stale `425`; this count drifts as the repo grows — re-derive with `rg --files tests/vitest | wc -l`, and the drift-guard validator lives in `12-keystone-code-binding-and-drift-protection.md`).
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
| `TV-FIELD-HANDOFF` | **Gate-locked** — no runnable command today; requires BOTH (1) the `DEC-UX-031-FIELD-WORKFLOWS` first-beta-slice decision (currently `Decision required before code`) AND (2) new contract/component test files. Future proof surface only until `DEC-UX-031-FIELD-WORKFLOWS` in `09-decision-ledger.md` selects the first beta slice. Create contract/component tests for package contents, access-path behavior, receipt, and feedback before any status promotion. | Browser proof only after a real field handoff flow exists. | Contractor/builder or field-operator persona reaches the intended package through the intended access path and can acknowledge/provide feedback only within scope. | Field proof artifact. |
| `TV-LIBRARY-SOURCING` | `bunx vitest run tests/vitest/component-library-manager.test.tsx tests/vitest/library-source-trust.test.ts tests/vitest/component-library-versioning-schema.test.ts tests/vitest/library-add-component-modal-a11y.test.tsx` plus new stale/accepted-cost tests when built. | Provider/storage proof for attachments and hosted files. | Source freshness, attachment currentness, accepted-cost state are clear and scoped. | Library proof artifact. |
| `TV-DATA-MAPS` | `bunx vitest run tests/vitest/project-charts-a11y.test.tsx tests/vitest/project-charts-aggregation.test.ts tests/vitest/project-location-map-provider.test.tsx tests/vitest/project-location-actions.test.ts` | Maps provider proof only when claiming configured live map behavior. | Charts pass semantic tests; location can degrade to address-only. | Data/maps proof artifact. |
| `TV-COLLABORATION` | `bunx vitest run tests/vitest/project-collaboration-actions.test.ts tests/vitest/project-collaboration-realtime.test.ts tests/vitest/estimate-cursor-broadcast-throttle.test.ts tests/vitest/estimate-cursor-identity.test.ts` | `bun run test:e2e -- e2e/teamspace-collaboration.spec.ts` for two-user/presence claims. | Invite/collaboration/presence state is scoped and recoverable. | Collaboration proof artifact. |
| `TV-SHARE-RECIPIENT` | `bunx vitest run tests/vitest/project-publication-security.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/share/share-page-decision-anonymous.test.tsx tests/vitest/share/share-summary-card.test.tsx tests/vitest/share-unsubscribe-interstitial.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/share-snapshot-redaction.test.tsx` | `bun run test:e2e -- e2e/shared-link-receiver.spec.ts` for recipient comprehension/session/print flow. | Recipient can understand, recover, print, comment/decide, and no private data leaks. | Share proof artifact. |
| `TV-ASSET-API` | `bunx vitest run tests/vitest/project-location-map-csp.test.ts tests/vitest/estimate-image-url.test.ts tests/vitest/storage-cleanup-allowlist.test.ts` plus attachment tests when built. | Storage/provider proof for hosted upload/retrieval. | Upload and asset failures are safe, scoped, and recoverable. | Asset proof artifact. |
| `TV-AI` | `bunx vitest run tests/vitest/ai-auth-guard.test.ts tests/vitest/ai-package-builder-provider.test.ts tests/vitest/ai-package-builder-draft.test.ts tests/vitest/ai-package-builder-security-contract.test.ts` | Provider/model quality proof is separate and not implied by local tests. | Disabled/quota/provider/draft states and data exposure controls pass. | AI proof artifact. |
| `TV-OPS-SUPPORT` | `bun run launch:check-resend-readiness && bun run launch:check-vercel-env && bun run launch:check-vercel-health && bun run launch:check-support-dns && bun run launch:check-support-monitoring && bun run launch:check-legal-owner && bun run launch:check-supabase-linked-readiness && bun run launch:check-supabase-migrations && bun run launch:check-supabase-backup` | Hosted/provider dashboards, inbox proof, monitoring alert/drain, legal owner review when required. | Each provider/operator row is pass/fail/blocked with owner and artifact. | Provider proof run. |
| `TV-ROUTE-ALIASES` | `bunx vitest run tests/vitest/route-error-smoke-gate.test.ts tests/vitest/workshop-route-error-boundaries.test.tsx && bun run test:e2e -- e2e/workshop-library-routes.spec.ts e2e/workshop-route-error-boundaries.spec.ts` | Browser included only for alias/route boundary claim. | Explicit routes, aliases, and error boundaries match current code. | Route proof artifact. |
| `TV-A11Y` | `bunx vitest run tests/vitest/*a11y*` (estimate-sheet-column-resize-a11y, project-charts-a11y, library-add-component-modal-a11y) plus an axe/lighthouse a11y pass for browser-proven surfaces. | Browser axe/lighthouse for share-recipient comprehension + estimate mobile (static tests cannot prove rendered contrast/focus order). | WCAG 2.2 AA: contrast (no `#7F7F7F` for load-bearing meta — use `#5D5D5D`; see `04`), keyboard parity, focus order, live regions, 44×44px targets. | A11y proof artifact. |
| `TV-ACCESS-PATH-CONTRACT` | New contract test (to scaffold) exercising each of the 5 access paths from `10-access-path-and-persona-taxonomy.md` (Anonymous Visitor, Primary App User, Project Collaborator, Shared-Link Recipient, Off-Platform Source Contact) and asserting the authority source per `10` §Authority Rule. | Browser only if a path's authority depends on rendered session state. | Each access path resolves to its correct authority source (public route policy / workspace+RLS / invite+RLS / share token+session / off-platform intake); personas are never treated as permission roles. | Access-path contract proof. |

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

This compact table is the runbook entry point. The deep engagement — known root causes, numeric thresholds, the per-surface risk handoff, and the outcome-metric instrumentation plan — lives in `13-performance-engagement-and-observability.md`. **Read `13` §2 and §4 BEFORE editing any surface flagged as a known hot path** (`TV-ESTIMATE-SHEET`, `TV-PROJECT-DASHBOARD`, `TV-AUTH`/hero, `TV-SHARE-RECIPIENT`).

Known hot paths (do not edit blind): the estimate-sheet route (6-layer skeleton cascade + missing leaf `loading.tsx` + a 5-RTT serial server path), the hero/auth path (dev→hosted-Supabase RTT — network-bound, measure on Vercel in-region), the workshop dashboard (query batching), and liquid-glass blur arming (paints blur-off first, arms after first paint). Rate limiting is Postgres-native (NOT Redis).

| Surface | Budget / threshold | Measuring command | Status |
|---|---|---|---|
| Route transitions | No regression vs baseline (see `13` §3) | `bun run perf:check-routes`; `bun run perf:measure-routes` | Script exists; live baseline is a runtime residual |
| Estimate sheet large data | TTI no regression on large fixture (see `13` §3) | `bunx vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts` | Script exists; hosted TTI is a runtime residual |
| Dashboard queries | Supabase round-trips ≤ baseline (see `13` §3) | `bun run perf:dashboard-query-count` → `scripts/measure-workshop-dashboard-query-count.ts` | Script exists |
| Share activity | Large-history no regression | `bun run benchmark-shared-link-activity.ts` | Script exists |
| Proposal export | Large-export preflight no regression | `bun run benchmark-proposal-workbook.ts` | Script exists |
| Core Web Vitals | LCP ≤2500ms / INP ≤200ms / CLS ≤0.1 (per `scripts/check-vercel-speed-insights-readiness.ts`) | Vercel Speed Insights (wired in `src/app/layout.tsx`) | Deferred-to-runtime residual (needs live deploy + traffic) |
| Bundle size | No-regression ceiling | `bun run perf:check-routes` bundle output | Deferred-to-runtime residual |
| Provider outage | Degraded state + retry/copy-link/address-only/manual fallback | manual/provider proof (`TV-OPS-SUPPORT`) | Residual |

Thresholds that cannot be set without a live hosted measurement are marked as runtime residuals — they are **named**, not invented. Outcome metrics (time-to-editable-estimate, failed-save rate, etc.) require live instrumentation and are planned in `13` §5; behavior tests here prove the path exists, not the metric value.

## Evidence Rules

- `Implemented` means source exists, not that a full user story is proven.
- `Concrete local tests identified` means tests exist, not that this pass ran them.
- Browser proof is required for joined interaction, responsive, recipient comprehension, two-user presence, or print claims.
- Provider proof is required for hosted auth, email delivery, Maps live behavior, Supabase linked/runtime, Vercel hosted runtime, monitoring alerts, or external legal/support proof.
- CSV updates must name the artifact path or command output that proves the status.
