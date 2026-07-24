# Beta onboarding first-use audit

Date: 2026-07-24

Surface: authenticated Workshop onboarding, Getting Started, Estimate Sheet, Library, Client Links, and Settings

Test decision: `NOT_REQUIRED`

## Target result

Make onboarding optional, understandable, recoverable, and safe for a first-time user. A user must be able to stop automatic guidance, manually start any eligible guide, continue or view it again, restart guide progress, and reopen the getting-started checklist without changing project work.

The stop condition for this audit is source-level agreement across persistence, server snapshots, client launch selection, Settings controls, and user-facing copy, plus focused lint, type analysis, SQL-shape validation, and independent read-only review. Product tests, builds, browser automation, screenshots, migration apply, deployment, and hosted proof remain outside this task.

## Standards basis

| Source | Applied rule |
| --- | --- |
| [Apple Human Interface Guidelines: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) | Keep onboarding brief and optional; skipped guidance should remain easy to find later. |
| [GOV.UK Design System: Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/) | Use verb-led task names and the smallest useful set of statuses for work that can span sessions. |
| [Microsoft: Teaching tip](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/dialogs-and-flyouts/teaching-tip) | Keep contextual guidance succinct, nonessential, and staggered rather than interrupting the user with a long tour. |
| [W3C: Focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) | Preserve a logical interaction order and predictable controls. |
| [WAI-ARIA Authoring Practices: Modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Label and describe blocking recovery UI, provide explicit close/stop controls, and preserve keyboard-safe interaction. |

## First-time user findings

| Severity | Before | Resolution |
| --- | --- | --- |
| P0 | Settings could replay or reset guides but had no global way to stop automatic opening. | Added a per-user, per-workspace **Show automatic guidance** switch. Turning it off suppresses automatic first-run and automatic resume while preserving explicit launches. |
| P0 | “Don’t show again” did not say whether it affected a step, guide, or all onboarding. | Renamed it **Skip this guide** and explained in the welcome copy that the guide can be restarted in Settings. |
| P0 | Settings exposed implementation terms including activation, instructional generations, claims, and tutorial bindings. | Replaced the copy with direct work-preservation language and named the action **Restart all guides**. |
| P1 | Resume, Replay, Restart, Start again, and dismissed-state labels varied by surface. | Standardized user-facing labels to **Resume guide**, **View again**, **Restart guide**, **Start guide again**, and **Skipped**. |
| P1 | Getting Started exposed internal proof, manifest, binding, generation, and first-value terminology. | Rewrote paths, starter states, checklist copy, and recovery guidance in user vocabulary while preserving action-based completion semantics. |
| P1 | Estimate guidance offered a restart URL even when no restartable state existed. | Restart now appears only for an in-progress or completed guided-practice state; a skipped guide starts a new run. |
| P1 | Checklist dismissal did not explain recovery. | Renamed the action **Hide checklist** and states that it can be reopened in Settings. |
| P2 | Recovery UI had an alert role but no explicit heading and description association. | Added `aria-labelledby` and `aria-describedby`; clarified **Try again**, **Skip this step**, **Stop guide**, and **Contact Support**. |

## Control contract

| User action | Persisted effect | Work effect |
| --- | --- | --- |
| Turn off automatic guidance | Stores a disabled timestamp for the current user and workspace. | No project, estimate, client link, starter example, checklist, or guide-progress deletion. |
| Turn on automatic guidance | Clears the disabled timestamp. | Automatic guidance becomes eligible again; no guide opens as a direct side effect of the switch. |
| Skip this guide | Marks only the current guide as skipped. | The guide does not open automatically again and remains manually available. |
| Resume guide | Continues the current guide state. | No reset. |
| View again | Replays completed guidance. | Completion remains intact. |
| Restart guide | Starts that guide from step one when a restartable state exists. | Project work remains intact. |
| Restart all guides | Resets guide progress through the existing guarded reset path. | Projects, estimates, client links, starter examples, automatic-guidance preference, and checklist progress remain intact. |
| Reopen checklist | Changes checklist visibility only. | Completed tasks remain complete. |

## Implementation evidence

- `migrations/0101_beta_onboarding_flow_state.sql` adds nullable `automatic_guidance_disabled_at`; `NULL` means automatic guidance is enabled.
- `src/lib/onboarding/activation-repository.ts` reads and writes the preference through the existing user/workspace progress row.
- `src/lib/onboarding/activation-retention.ts` includes the preference in privacy export; erasure already removes the containing progress row.
- `src/lib/onboarding/flow-actions.ts` exposes only the enabled boolean in the sanitized snapshot.
- `src/components/onboarding/OnboardingClientBoundary.tsx` gives explicit launch intent precedence, then suppresses automatic resume and first-run selection when the preference is off.
- `src/components/workshop/settings/GuidanceToursSettings.tsx` provides the global switch, per-guide controls, checklist recovery, and all-guide restart confirmation.
- First-use copy is reconciled across Getting Started, tour tooltips, Estimate Sheet and Library learning rails, the first-estimate checklist, Client Links, and the Settings menu.

## Verification

- Focused ESLint over all touched TypeScript and TSX files: passed with no findings.
- Full `bun run type-check`: onboarding changes produced no errors; the command remains red only on eight pre-existing `TS18047` nullability errors in `src/lib/admin/user-actions.ts`.
- In-memory SQLite reconstruction of the changed `beta_activation_progress__0101` create-and-copy block: passed; an existing row copied with `automatic_guidance_disabled_at = NULL`.
- Focused `git diff --check`: passed for tracked touched files. Untracked onboarding files were inspected directly and included in focused ESLint.
- Independent persistence/launch review found no blocking issue and confirmed actor-scoped writes, manual-launch precedence, work-preserving reset behavior, privacy export, and the migration copy contract. A separate first-use trace found minor wording and reset-scope inconsistencies; all were corrected before closeout.
- The guarded GitNexus wrapper declined its registry-resolved fallback, so it was not bypassed. The installed code-review graph fallback scanned 19 changed source files across 20 affected flows; its test-gap risk was handled through the repository test gate plus focused static checks and two independent source reviews.
- Product tests, build, browser automation, screenshots, visual QA, D1 migration apply, deployment, and hosted proof: not run under the repository user-test gate.

## Remaining evidence boundary

This audit proves source contracts and static integrity, not rendered or hosted behavior. A separately authorized `TEST_TASK` would be required to prove keyboard focus, responsive layout, persisted toggling against an applied D1 schema, and end-to-end automatic-versus-manual launch behavior in a browser.
