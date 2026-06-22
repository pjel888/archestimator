# Client/Recipient/Stakeholder Share-Path Persona Review

## Scope
Second-pass, recipient/stakeholder perspective review for publication/shared-link delivery and recipient experience in Archestimator.

- Areas: public share link, password/session, comments, decision, activity, print/mobile, unsubscribe, security/recovery, non-technical client comprehension.
- Canonical baseline: `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv`
- No canonical files were edited.

## Canonical coverage baseline
- `SHARE-003` — tokenized share reading experience, summary/content rendering on `/share/[token]`.
- `SHARE-004` — share password and recipient session unlock/security flow.
- `SHARE-005` — comments, decisions, activity, unsubscribe, print.
- `SHARE-006` — share security headers and cache/no-store safeguards.

Relevant evidence reviewed:
- Share route/container: `/Users/philiplewis/Documents/archestimator/src/app/share/[token]/page.tsx`, `/Users/philiplewis/Documents/archestimator/src/components/share/ShareContainer.tsx`, `/Users/philiplewis/Documents/archestimator/src/components/share/SharePageTabs.tsx`, `/Users/philiplewis/Documents/archestimator/src/components/share/ShareReviewWorkspace.tsx`.
- Share workflows and hardening endpoints: `/Users/philiplewis/Documents/archestimator/src/app/api/share/[token]/password/route.ts`, `/Users/philiplewis/Documents/archestimator/src/app/api/share/[token]/session/route.ts`, `/Users/philiplewis/Documents/archestimator/src/app/api/share/[token]/comment/route.ts`, `/Users/philiplewis/Documents/archestimator/src/app/api/share/[token]/decision/route.ts`, `/Users/philiplewis/Documents/archestimator/src/app/api/share/[token]/activity/route.ts`, `/Users/philiplewis/Documents/archestimator/src/app/api/share/[token]/unsubscribe/route.ts`, `/Users/philiplewis/Documents/archestimator/src/app/api/share/[token]/events/route.ts`.
- Share tests: `/Users/philiplewis/Documents/archestimator/tests/vitest/share/share-page-decision-anonymous.test.tsx`, `/Users/philiplewis/Documents/archestimator/tests/vitest/project-publication-comments.test.tsx`, `/Users/philiplewis/Documents/archestimator/tests/vitest/project-publication-decision.test.tsx`, `/Users/philiplewis/Documents/archestimator/tests/vitest/project-publication-activity.test.tsx`, `/Users/philiplewis/Documents/archestimator/tests/vitest/share/share-page-get-routes-contract.test.ts`, `/Users/philiplewis/Documents/archestimator/tests/vitest/share-no-store-invariants.test.ts`, `/Users/philiplewis/Documents/archestimator/tests/vitest/share-unsubscribe-interstitial.test.ts`.

## Missed or underrepresented user stories (recipient/stakeholder lane)

### High
1) Recipient session recovery and re-entry guidance is not a standalone story.
- Evidence: `SHARE-004` notes lockout/session risk, but implementation/test evidence is focused on auth/session checks and lockout mechanics.
- Gaps:
  - Clear UX for "session expired" recovery (refresh vs contact owner vs request new link) is not explicit.
  - Lockout or cookie-loss path appears to fail into generic errors without narrative recovery in share-facing components.
- Recommended canonical additions:
  - Add row: `SHARE-007`
  - Feature: Public share session recovery
  - User story: recipient can recover when shared-session expires or is lost, with next-step guidance.
  - User-facing outcomes: clear expired/session-lost copy, explicit “ask owner for new link” CTA, and re-auth flow where applicable.

2) Non-technical recipient comprehension and plain-language walkthroughs are weakly represented.
- Evidence: `SHARE-003/005` cover content and actions, but no explicit story for comprehension scaffolding (plain summary language, section labels, glossary of terms, decision meaning).
- Gaps:
  - No dedicated row for “what this share means” onboarding on first open.
  - Missing support copy for stakeholders reading estimated numbers/terms.
- Recommended canonical additions:
  - Add row: `SHARE-008`
  - Feature: Recipient comprehension and guided first-run share onboarding
  - User story: as a non-technical client I can understand the proposal at first glance with plain-language labels and next-step guidance.

3) Unsubscribe UX copy and recovery is currently backend-heavy, not persona-story centered.
- Evidence: endpoint exists and CSRF/rate-limit protections tested (`src/app/api/share/[token]/unsubscribe/route.ts`, `share-unsubscribe-interstitial.test.ts`).
- Gaps:
  - Recipient-facing decision confirmation, post-unsubscribe explanation, and what to do if unsub link is invalid/expired are not explicit in canonical story.
- Recommended canonical additions:
  - Add row: `SHARE-009`
  - Feature: Stakeholder unsubscribe comprehension and dead-end recovery
  - User story: as a recipient I can confirm unsubscribe and recover from invalid/used links with clear next actions.

### Medium
4) Print/share export for stakeholder packets is not represented as a distinct acceptance story.
- Evidence: print hooks exist (`SharePageTabs`, `ShareReviewWorkspace`, `src/app/share/print.css`) and included inside `SHARE-005`, but no row states “printable stakeholder packet succeeds on mobile/desktop and preserves meaning”.
- Gaps:
  - Missing explicit success criteria for readable print output and offline/share packet retention.
- Recommended canonical additions:
  - Add row: `SHARE-010`
  - Feature: Stakeholder print readiness
  - User story: as a recipient I can produce a clear, printable proposal view that preserves headings, decision context, and key actions.

5) Activity timeline comprehension under high volume is underdefined.
- Evidence: `SHARE-005` + activity endpoint route includes pagination (`cursor`, `limit`, `hasMore`) and test coverage.
- Gaps:
  - No story states participant awareness of “you may be viewing a partial feed” and how to load remaining items.
  - Missing UX test for empty/no-more state clarity and failure-to-load behavior.
- Recommended canonical additions:
  - Add row: `SHARE-011`
  - Feature: Recipient activity timeline transparency
  - User story: as a stakeholder I can tell whether activity shown is complete and load older history safely.

### Medium
6) Decision/comment reliability recovery is not a dedicated recipient story.
- Evidence: API/session validation for comment/decision routes is solid (`comment/route.ts`, `decision/route.ts`) with tests, and components surface action forms.
- Gaps:
  - No explicit user-facing path for stale snapshot / submission conflict / temporary offline retry.
  - No row for “what happened if my action is blocked because snapshot changed or my action failed silently”.
- Recommended canonical additions:
  - Add row: `SHARE-012`
  - Feature: Comment/decision action recovery
  - User story: as a recipient I can retry failed comments/decisions with clear error state and retry guidance.

### Low
7) Public-link lifecycle messaging lacks explicit dead-link recovery copy coverage.
- Evidence: `SHARE-003` covers summary and invalid/expired/revoked token handling in prose; tests include route invariants.
- Gaps:
  - Canonical text notes “copy can be unclear” but no dedicated row specifically for first-open recovery states.
- Recommended canonical change:
  - Keep `SHARE-003` but split into explicit sub-row for first-open link-state messaging if user-visible copy remains ambiguous after implementation.
  - Candidate refactor: keep lifecycle status story in `SHARE-007/009/008` and reduce ambiguity in `SHARE-003` scope to initial read access only.

## Suggested canonical CSV changes summary (non-editing)

1) Add rows:
- `SHARE-007` — Public share session recovery and expiry re-entry.
- `SHARE-008` — Recipient comprehension onboarding for non-technical stakeholders.
- `SHARE-009` — Unsubscribe confirmation and invalid-link recovery copy.
- `SHARE-010` — Printable stakeholder packet UX quality/completeness.
- `SHARE-011` — Activity feed completion/continuation clarity.
- `SHARE-012` — Comment/decision action retry/recovery UX.

2) Re-scope existing rows:
- `SHARE-005` is currently broad; split into a smaller “interaction actions” row and move nonfunctional communication/recovery stories above into dedicated rows.
- `SHARE-004` should retain security/session mechanics while `SHARE-007` holds recipient recovery UX.

## Residual risk
Most recipient/stakeholder functionality is implemented and tested at API/component level, but several actor-facing outcomes remain implicit. Without dedicated canonical rows, these outcomes are easy to regress because test naming still clusters to mechanics rather than recipient comprehension and self-service recovery.
