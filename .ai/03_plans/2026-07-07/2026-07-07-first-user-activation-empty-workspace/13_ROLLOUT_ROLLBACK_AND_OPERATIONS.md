# 13 — Rollout, Rollback, and Operations

## 13.1 Rollout shape (closed beta)

- **Population:** closed-beta allowlist only (bounded).
- **Rings:** (1) owner/local → (2) first 1–2 invited beta users → (3) rest of allowlist. Each ring is a manual promotion (no automated ring system).
- **Feature flag:** optional `NEXT_PUBLIC_ACTIVATION_WELCOME_ENABLED` (default true) for rapid disablement without redeploy.
- **No staged provider rollout:** migration `0039` is additive DDL; safe to apply directly to `ARCH_DB` (free-tier D1 allows additive tables).

## 13.2 Merge / beta / production gates

| Gate | Merge | Closed-beta rollout | Production (later) |
|---|---|---|---|
| Query count unchanged | ✅ required | ✅ | ✅ |
| TTFB p95 ≤ +5% | ✅ required | ✅ | ✅ |
| Existing dashboard/homebase/empty-tab tests green | ✅ required | ✅ | ✅ |
| New activation tests green | ✅ required | ✅ | ✅ |
| E2E first-user path green (env-gated) | recommended | ✅ | ✅ |
| First beta user reaches `first_publication_created_at` | n/a | observed within first cohort | ✅ |
| Immutable/PDF proposal (sibling stub) | not required | not required | separate track |

## 13.3 Rollback

- **Trigger:** activation panel causes confusion/errors; query-count regression; milestone write blocks an action; event emit throws.
- **Steps:**
  1. Set `NEXT_PUBLIC_ACTIVATION_WELCOME_ENABLED=false` (instant panel hide, no redeploy).
  2. Revert the source diff (activation is additive; revert is safe).
  3. `DROP TABLE workspace_activation_milestones;` on D1 (metadata only; no user data loss).
- **Data repair:** none — milestones are metadata; reconciliation self-heals on re-deploy.
- **Fix-forward alternative:** keep the table, keep the emits (non-throwing), only hide the panel via the flag. Preferred for beta (keeps the funnel instrumented).

## 13.4 Observability + runbook

- **Events:** `scope: "activation"` in the observability log. Funnel = `project_created → estimate_created → area_created/template_inserted/line_item_created → publication_created` (with `milestone_first=true` per rung).
- **Dashboard:** none for closed beta (log queries). If OPEN-DEC-02 accepted later, a consent-gated SDK + dashboard is added.
- **Alerts:** none for closed beta.
- **Support:** beta feedback via `src/app/workshop/feedback/page.tsx` + `BetaFeedbackForm.tsx` (sibling stub `2026-07-07-beta-support-feedback-operating-loop`).
- **Incident response:** if milestone write throws (it shouldn't — wrapped), the action logs + continues; the panel may show/hide incorrectly until reconciliation. No data loss.

## 13.5 Rollout performance gates (per directive §13)

See `09_…` §9.5 for the baseline/target/source/gate table. The merge-blocking gates are: query count unchanged + TTFB p95 ≤ +5% + existing + new tests green.

## 13.6 Backward compatibility

- Migration is additive; existing rows untouched.
- Payload changes additive optional.
- No client breaking change.
- No Worker Env binding change → no `cf:typegen` needed.
- Old cached homebase payloads (pre-deploy) default `firstRun=false` (safe).

## 13.7 Post-release verification

- Confirm first invited beta user reaches terminal rung.
- Review activation event log for drop-off points.
- Reconcile `.ai/01_roadmap/16-onboarding-activation-readiness.md` phases → shipped; Required Analytics Events → emitted.
- Append `decisions.md` + `known-issues.md`.
