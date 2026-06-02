# Activity History Human-Readable V1 — Planning Index

**Purpose:** Audit, research, and plan the improvement of the Activity History system to make it human-readable, client-safe, audit-safe, and scalable enough to support estimate edits, client comments, approvals, declines, and revision requests in one coherent timeline.

**Created:** 2026-06-02  
**Branch:** `main`  
**Commit:** `638f681` (`Refresh local validation at current head`)  
**Status:** Planning Phase (no implementation)

---

## Scope of Audit

The following areas were inspected:

- `src/components/workshop/EstimateSheetContent.tsx` (Activity History modal, event rendering, audit cards, scope tree, filters, day grouping)
- `src/lib/estimates/actions.ts` (Core history read actions, `fetchEstimateSheetVersionControl`, actor label resolution, event normalization, retention metrics)
- `src/components/share/SharedLinkActivityFeed.tsx` (Shared link activity feed component, Realtime subscription, public/owner views)
- `src/components/workshop/ProjectPublicationHeader.tsx` (Publication modal with Activity tab, unseen activity dot)
- `src/components/workshop/ProjectCard.tsx` (Project card with unseen activity badge)
- `src/app/api/share/[token]/activity/route.ts` (Public activity API — filtered for client safety)
- `src/lib/publication/actions.ts` (`loadSharedLinkActivity`, `ActivityItem` type, owner email digest)
- `src/lib/publication/public-repository.ts` (Activity rate limiter, shared_link_events recording)
- `src/lib/ai/read-context.ts` (AI context: activity history summaries for Ask Flip)
- Supabase migrations: `estimate_sheet_events`, `estimate_sheet_versions`, node activity history, retention metrics, shared link overhaul, rate limit events, password attempt events
- Tests: `estimate-sheet-version-control-ui.test.tsx`, `estimate-sheet-version-control-actions.test.ts`, `project-publication-activity.test.tsx`, `project-publication-header.test.tsx`, `project-publication-comments.test.tsx`, `project-publication-decision.test.tsx`, `project-publication-security.test.ts`, `project-publication-public-repository.test.ts`, `project-publication-snapshot.test.ts`, `project-publication-schema.test.ts`, `ai-ask-read-context.test.ts`, `ai-ask-route.test.ts`

---

## Planning Files

| File | Purpose |
|------|---------|
| `README.md` | This index |
| `00-current-state-audit.md` | Full architecture audit of current activity/history system |
| `01-research-basis.md` | UX research: activity feeds, audit copy, accessibility, privacy |
| `02-activity-copywriting-system.md` | Copy model, field labels, forbidden terms, event-type dictionary |
| `03-data-contract-and-event-model-plan.md` | Target data contract, view model, visibility rules |
| `04-implementation-plan.md` | Phased implementation (0–6) with goals, files, risks, tests |
| `05-blast-radius-analysis.md` | Files touched, risks, mitigations |
| `06-performance-analysis-plan.md` | Query/payload/realtime/pagination performance analysis |
| `07-security-privacy-readiness.md` | Internal comment leak prevention, PII, rate limiting, audit fidelity |
| `08-test-strategy.md` | Full test plan with mandatory tests and test case names |
| `09-ui-ux-plan.md` | Timeline hierarchy, card anatomy, empty/loading/error states, accessibility |
| `10-readiness-checklist.md` | Implementation readiness checklist with go/no-go |
| `11-pr-sequencing-plan.md` | Small PR sequence for safe incremental delivery |

---

## Recommended Implementation Sequence

1. PR 1 — Planning docs only (no code changes)
2. PR 2 — Activity composer tests and fixtures (formatter tests first)
3. PR 3 — Central Activity Composer module (`src/lib/activity/`)
4. PR 4 — Estimate Activity UI integration (replace local copy logic)
5. PR 5 — Shared Link Activity integration (public/client-safe view model)
6. PR 6 — Comments/Decisions timeline integration (visibility filtering)
7. PR 7 — UI polish, accessibility, performance, realtime

---

## Explicit Statement

**This is planning only. No production source files, components, routes, migrations, tests, or library logic have been modified.** All output lives in `.ai/03_plans/activity-history-human-readable-v1/`.

---

## Key Findings (Executive)

- **Copy is semi-human-readable but inconsistent.** Estimate history uses human labels ("Row updated", "Area deleted") but shared-link activity renders raw type strings (`COMMENT ·`, `DECISION ·`, `EVENT ·`) and technical decision values (`"Decision: revision_requested"`).
- **No central formatting layer.** Copy logic is split between `EstimateSheetContent.tsx` (audit cards), `SharedLinkActivityFeed.tsx` (activity list), and the Ask Flip AI context builder — each with different conventions.
- **Public API leaks technical strings.** The public `/api/share/[token]/activity` route returns `decision: "revision_requested"` and `type: "event"` verbatim — no human-readable transformation.
- **Internal comments are properly filtered** in the public route — this is a strong foundation.
- **Realtime subscriptions exist** for shared-link activity but are untested.
- **No tests prevent regression into technical copy** — a human-readable test baseline is needed.
- **Event type coverage is comprehensive** — 13 distinct `estimate_sheet_events` types, 3 decision types, comments, and shared-link events all exist.

---

## Open Questions

1. Should old estimates with incomplete snapshots (no oldSnapshot/newSnapshot) receive backfilled copy or a graceful fallback? The current code handles null snapshots, but the fallback copy may not be ideal.
2. Should the shared-link Activity tab and the workshop Activity History modal converge on a single timeline component, or remain separate surfaces?
3. Should `loadSharedLinkActivity` (owner server action) return pre-formatted copy, or should formatting remain client-side like the estimate history?
4. Should email digests receive the same human-readable copy as the in-app timeline?

---

## Next Action

Review all planning documents. Once approved, begin PR 1 (planning docs merge), then proceed to PR 2 (tests and fixtures).
