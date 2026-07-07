# 13 — Rollout, Rollback, and Operations

## 1. Staged rollout ladder (local → closed-beta → production)

| Stage | Scope | Gate to advance |
|---|---|---|
| **L0 Local** | implementer dev | `bun run type-check` + `bun run lint` + all new vitest green + regression-guard vitest green |
| **L1 Merge** | `main` (shared worktree) | L0 + continuity contract test + perf evaluator Playwright green + `git diff --check` + code review |
| **L2 Closed-beta deploy** | `archestimator.com` (Worker `archestimator-proof`) | L1 + hosted smoke of full path (§5) + no perf regression |
| **L3 Production confirmation** | public `archestimator.com` | L2 + email deliverability proof (Phase 4) + domain confirmation (OPEN-CONT-05) + legal-owner signoff on new copy |

## 2. Feature flags / config

- **`CLOSED_BETA_ACCESS_ENABLED`** — unchanged. The continuity path works whether beta gating is on or off.
- **`PROJECT_INVITE_ENTRY_ENABLED`** — unchanged (invite handoff only).
- **`ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`** + **`CLOUDFLARE_EMAIL_FROM`** — Phase 4 requires owner to enable + set in production secrets. Until then, welcome email skips gracefully (REL-CONT-01).
- No new feature flag introduced (the changes are small + coherent; a flag would add ceremony without safety).

## 3. Rollback

| Slice | Trigger | Rollback step | Data impact |
|---|---|---|---|
| Footer links (Phase 1) | link 404 / visual regression | `git revert` the footer commits | none |
| Legal pages / `/cookies` (Phase 2) | route error / metadata regression | `git revert` | none |
| `requestBetaAccess` (Phase 3) | abuse / errors | revert ClosedBetaGate form to mailto POST; the audit table harmlessly retains `beta_access_requested` rows | none (audit rows are append-only) |
| Welcome email (Phase 4) | delivery failure / wrong copy | set `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false` (graceful skip) or revert trigger | none (idempotency rows harmless) |
| Dashboard CTA / onboarding redirect (Phase 5) | redirect bug / wrong branch | `git revert` | none |

**No destructive rollback needed.** Everything is revert-or-flag. No migration to reverse (recommended path).

## 4. Rollback triggers / thresholds
- Perf regression: `/` LCP or TTFB +15% vs baseline, or any new redirect hop on `/workshop` bounce → rollback Phase 5 / investigate.
- `requestBetaAccess` error rate >5% → rollback Phase 3 to mailto.
- Welcome-email failure rate trips the existing circuit breaker → auto-skips; no manual rollback needed unless copy is wrong.

## 5. Hosted smoke procedure (L2 gate)
Actor: QA/owner against `archestimator.com`.
1. `/` renders v3; "Book a walkthrough" → `/contact` renders form; footer has Privacy/Terms/Trust/Security/Contact.
2. `/signup` → ClosedBetaGate; legal line present; submit → receipt "Thanks — we'll reach out"; honeypot hidden.
3. `/cookies` renders; banner links to it.
4. `/terms` + `/privacy` have correct `<title>`/OG/canonical.
5. Owner grants allowlist (`/workshop/settings/users`) → user returns → `/login` → magic-link → `/workshop/terms` → accept → `/workshop` dashboard.
6. Empty workspace → dashboard CTA "Create your first project" → `/workshop/projects`.
7. `/workshop/onboarding` → `/workshop/projects` (empty) or `/workshop` (non-empty).
8. If email enabled: welcome email received once.
9. No console errors; `/workshop` bounce redirect count ≤ baseline.
Pass = all steps render correctly.

## 6. Observability (post-deploy)
- `beta_access_requested` audit rows + `welcome_email_sent` events queryable in D1.
- Structured logs (email redacted) for intake + email.
- No new alerting for closed beta (proportionality). If email failure rate exceeds breaker threshold, existing breaker trips.
- Production RUM/CWV owned by sibling `production-rum-and-cwv-telemetry` pack; this pack requires "no regression" via L1 Playwright.

## 7. Rollout performance gates (summary; evaluator in `09` §2)
| Metric | Baseline source | Target | Gate |
|---|---|---|---|
| `/` LCP p75 | local Playwright baseline | ≤ 2.5s, no +15% | L1 |
| `/` TTFB p75 | local Playwright | ≤ 600ms, no +15% | L1 |
| `/login` TTFB p75 | local Playwright | ≤ 600ms | L1 |
| `/workshop` bounce redirect count | existing trace | no increase | L1 |
| Hosted smoke | L2 procedure | all steps pass | L2 |
| Email deliverability | real inbox | received, non-spam | L3 (Phase 4) |
| Domain confirmation | owner | `archestimator.com` confirmed | L3 |

## 8. CI integration (given disabled workflows reality)
GitHub Actions workflows are currently in `.github/workflows-disabled/`. Local vitest/typecheck/lint are the L0/L1 gates. Re-enabling CI is owner-gated and out of scope for this pack; the new tests are designed to run under `bunx vitest` + `bunx playwright` locally and will run in CI once workflows are restored.

## 9. Backward compatibility / support
- All changes additive or behavior-preserving. No user needs to take action.
- Support: `support@archestimator.com` (existing); beta-request intake gives users a clear receipt.
- No data migration communicated to users (none required).

## 10. Post-release verification
- After L2: re-run hosted smoke within 24h; monitor `beta_access_requested` volume + email send/fail counts for 48h.
- After L3: confirm welcome-email deliverability over the first week of new grants.
