# Research and Onboarding Experience Specification

## Research Scope

Research was refreshed on 2026-07-23 against:

- current React Joyride v3 documentation and releases;
- current package metadata for `react-joyride@3.2.0`;
- installed Next.js 16 documentation;
- W3C WCAG 2.2 and ARIA Authoring Practices;
- current Appcues onboarding/checklist guidance;
- current Pendo onboarding guidance; and
- Intercom’s product-tour/onboarding framework.

Vendor onboarding sources are treated as product-design evidence, not neutral
scientific proof. W3C, installed framework docs, package metadata, and Joyride’s
official documentation govern technical claims.

## Source Register

### React Joyride

- [Getting Started](https://react-joyride.com/docs/getting-started)
- [useJoyride Hook](https://react-joyride.com/docs/hook)
- [How It Works](https://react-joyride.com/docs/how-it-works)
- [Props](https://react-joyride.com/docs/props)
- [Step](https://react-joyride.com/docs/step)
- [Events](https://react-joyride.com/docs/events)
- [Recipes](https://react-joyride.com/docs/recipes)
- [Accessibility](https://react-joyride.com/docs/accessibility)
- [Migration to v3](https://react-joyride.com/docs/migration)
- [GitHub releases](https://github.com/gilbarbara/react-joyride/releases)

### Accessibility

- [WCAG 2.2 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- [WCAG 2.2 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

### Onboarding design

- [Appcues: product-tour and checklist patterns](https://docs.appcues.com/user-experiences-use-cases/different-types-of-product-tours-for-new-users)
- [Appcues: effective checklist guidance](https://docs.appcues.com/en_US/checklists/checklist-best-practices)
- [Pendo: six onboarding principles](https://www.pendo.io/pendo-blog/6-principles-for-effective-user-onboarding/)
- [Intercom: long-term onboarding guide](https://www.intercom.com/blog/onboarding-guide/)

## Current Dependency Finding

The current package metadata for `react-joyride@3.2.0` reports:

```json
{
  "version": "3.2.0",
  "license": "MIT",
  "peerDependencies": {
    "react": "16.8 - 19",
    "react-dom": "16.8 - 19"
  },
  "dist.unpackedSize": 720031
}
```

Its runtime dependencies include Floating UI, deep-merge/equality helpers,
scroll utilities, and `use-sync-external-store`. It is compatible with the
repository’s React 19 major, but the implementation must still:

1. pin the exact reviewed version;
2. update `bun.lock`;
3. run the project’s authorized dependency/security check;
4. measure emitted client gzip impact rather than infer it from unpacked size;
5. keep the import behind authenticated eligibility; and
6. record any changed transitive dependency posture.

GitHub currently marks `3.2.0` as the latest release. v3.1 introduced replay
support and explicitly strengthened “use controlled mode sparingly” guidance.

## Joyride v3 Contract

### Required API choices

- Use named exports; v3 removed the default import.
- Use `useJoyride` for controls, state, failures, and event subscriptions.
- Use `onEvent` or `on()` subscriptions; v2 `callback` is obsolete.
- Always unsubscribe event handlers to avoid React Strict Mode duplication.
- Use `before` hooks for UI preparation and route transitions.
- Use `after` hooks only for deterministic cleanup.
- Use `portalElement` for Workshop-owned layering.
- Use step `id` and application semantic `stepKey`; do not persist indices.
- Use `targetWaitTimeout` for ordinary streamed mounts.
- Consume `TARGET_NOT_FOUND` and `ERROR` events for typed recovery.

### Uncontrolled-mode decision

Official v3 guidance says:

- uncontrolled is the default;
- `controls.go` and `controls.reset` work only in uncontrolled mode;
- external `stepIndex` changes can desynchronize lifecycle behavior;
- conditional/dynamic UI should use `before` hooks; and
- most apps should avoid controlled mode.

Archestimator therefore keeps Joyride uncontrolled. Durable state does not need
to own Joyride’s numeric index. It persists:

```text
flow_key
flow_version
generation
current_step_key
status
revision
```

At runtime:

1. build the eligible ordered step list;
2. find the persisted semantic key;
3. derive a temporary numeric index;
4. call `controls.start(index)`; and
5. persist the next semantic key after a valid Joyride step transition.

### Route decision

Joyride recommends `before` hooks for straightforward multi-route tours and
`step.data + onEvent` for more complex routing. Archestimator reduces the need
for either by making most guides route-local.

When navigation is required:

- route intent is an application enum, not arbitrary text;
- dynamic IDs come from a server-authorized snapshot;
- the route builder validates the expected resource chain;
- the `before` hook initiates navigation;
- Joyride waits for the target;
- missing targets produce a bounded failure; and
- no hook loops on the current path.

### Focus decision

Joyride uses `alertdialog`, `aria-modal`, a focus trap, keyboard Escape, and
focus restoration. WAI-ARIA modal guidance also expects focus to move inside,
remain contained, and restore logically.

Therefore:

- do not keep a Joyride tooltip open while a user edits a form or performs a
  complex keyboard task in the app;
- use the tooltip to explain the next outcome;
- close or pause the tooltip;
- restore/focus the target;
- let the user perform the task in the normal application;
- recognize success through the real activation event; and
- offer the next guide from the checklist rather than interrupting
  automatically.

This preserves keyboard access without globally disabling Joyride’s focus trap.

## Research Synthesis

The external sources converge on six practical rules:

1. **Guide to value, not a feature inventory.** A tour should help a user
   achieve the product’s promised outcome.
2. **Keep the first tour short.** Intercom suggests a few minutes and roughly
   five-to-seven steps as a ceiling; this plan is stricter at three-to-four
   orientation steps.
3. **Use progressive disclosure.** Reveal later capabilities when role, route,
   behavior, and data make them relevant.
4. **Complete checklists from real behavior.** Appcues explicitly recommends
   event/property completion rather than walkthrough views.
5. **Segment by role and goal.** Creator, collaborator, recipient, and manager
   paths are not interchangeable.
6. **Keep help on demand.** Users need to replay or resume after they skip,
   forget, or encounter a different task.

For Archestimator, the first meaningful value is not “saw the sidebar.” It is:

> The user has an authorized project and estimate, at least one priced row, and
> a valid saved total they understand.

## Experience Principles

### Product principles

- Normal application UI renders before guidance.
- Only one guide auto-starts.
- Auto-start happens once per flow version and only after route/shell readiness.
- Every tour says what outcome it will help produce.
- Every flow has Skip/Close.
- Dismissal is reversible from Settings.
- Product actions, not tooltip views, complete activation.
- Returning activated users are not forced through first-run content.
- Optional guides are never prerequisites for using the app.
- Copy names the user benefit before the feature name.

### Content principles

- One idea per tooltip.
- Titles use verbs or outcomes.
- Body copy targets 20–35 words; shorter where possible.
- Avoid beta-internal vocabulary, role implementation names, and database terms.
- Distinguish Project, Estimate, Template, Component, Proposal, Client link, and
  Client Portal consistently.
- Explain permission boundaries only when they affect the current user.
- Never promise a feature that is gated, empty, read-only, or unavailable.

## Eligibility Model

### Input snapshot

The server host supplies only serializable, minimum-necessary data:

```ts
type OnboardingEligibilitySnapshot = {
  userId: string;
  workspaceId: string;
  workspaceRole: "owner" | "admin" | "member" | "viewer" | null;
  accessSource: "workspace" | "project" | "estimate";
  effectiveRole: "owner" | "admin" | "editor" | "member" | "viewer";
  capabilities: readonly OnboardingCapability[];
  entryKind:
    | "workspace_creator"
    | "workspace_member"
    | "invited_collaborator"
    | "direct_estimate";
  viewportHint: "unknown";
  resourceContext: {
    projectId?: string;
    estimateId?: string;
    nodeId?: string;
  };
  activation: SanitizedActivationSnapshot;
  flowStates: readonly OnboardingFlowStateSnapshot[];
};
```

The client derives viewport class after hydration. It does not receive names,
emails, arbitrary URLs, or unrelated resource IDs.

### Cohort matrix

| Cohort | Auto-start | Checklist | Primary next action |
| --- | --- | --- | --- |
| New workspace creator with no project | `core_orientation` | Creator checklist | Choose Blank, Template, or Guided sample. |
| New creator with existing project but no valid estimate | `core_orientation` only if unseen | Creator checklist resumed | Open/create estimate. |
| Invited project collaborator | `collaborator_orientation` | Capability-specific tasks only | Open assigned project/estimate. |
| Direct-estimate user | `collaborator_orientation` | No project-creation task | Open assigned estimate. |
| Viewer | Short read-oriented orientation | No edit checklist | Understand totals/navigation/support. |
| Returning user with activation progress | None | Resume from real progress | Recommended incomplete task. |
| User with valid-total first value | None | Completed/collapsed | Optional Library/share guides. |
| Feature unavailable or gated | None for that feature | Hidden/not applicable | No dead target. |
| Mobile user | Viewport-specific step list | Same domain truth | Mobile nav and route-local actions. |

## Core Orientation Specification

### Creator desktop: `core_orientation` v1

| Step key | Target | Draft title | Draft body | Action |
| --- | --- | --- | --- | --- |
| `welcome` | centered | Welcome to Archestimator | Build a priced estimate without learning every feature first. This quick tour shows where to begin and where to get help. | `Show me` / `Explore on my own` |
| `workspace_map` | `shell.workspace` | Your estimating workspace | Projects hold the work. Components and templates help you reuse costs. Sharing stays separate so client access is intentional. | Next |
| `projects_entry` | `nav.projects` | Start with a project | Create a blank project, begin from a workspace template, or use the guided sample to see a working estimate immediately. | Next |
| `guidance_and_help` | `header.getting_started` | Guidance stays available | Return to Getting started for your next recommended task. Settings can replay or reset tours, and Support is always available. | `Build my first estimate` |

### Creator mobile: `core_orientation` v1

| Step key | Target | Intent |
| --- | --- | --- |
| `welcome` | centered | Same value promise as desktop. |
| `mobile_navigation` | `nav.mobile_menu` | Explain how to reach Projects, Library, Proposals, and Share when eligible. |
| `projects_entry` | mobile Projects target | Start with project creation. |
| `guidance_and_help` | `header.getting_started` | Show persistent progress/help entry. |

### Collaborator: `collaborator_orientation` v1

| Step key | Target | Draft intent |
| --- | --- | --- |
| `welcome` | centered | Welcome the user to assigned work, not workspace creation. |
| `assigned_work` | authorized project/estimate target | Explain where their assigned resource lives. |
| `effective_access` | route-local read/edit region | Explain that project and estimate access can differ and show only available actions. |
| `guidance_and_help` | Getting started/Support | Show where to revisit guidance or ask for help. |

### Auto-start conditions

All must be true:

- authenticated Workshop shell is mounted;
- terms and workspace resolution are complete;
- no application modal/dialog is open;
- no route loading/error state is active;
- current flow/version has no completed/dismissed state;
- activation import does not classify the user as already oriented;
- at least two eligible non-centered targets exist; and
- the page is visible.

If conditions do not become true within a bounded session window, do not poll
forever. Record an allowlisted reason and leave the flow available on demand.

## Getting Started and Checklist Specification

### Route

Replace `/workshop/getting-started` redirect with an authenticated page that
renders:

1. current outcome and progress;
2. recommended next task;
3. the four-task checklist or collaborator-specific state;
4. start-path choices when relevant;
5. available contextual guides; and
6. Support entry.

`/workshop/onboarding` becomes a compatibility redirect to this page.

### Creator checklist

| Item | Completion truth | Launch behavior |
| --- | --- | --- |
| Create or open a project | `project_created` or authorized project context | Route to Projects; the existing zero state owns Blank/Template/Guided sample choice without another tour. |
| Create or open an estimate | authorized `estimates` row/current estimate context | Route to project Estimates or the server-authorized estimate. |
| Add an area and a priced row | both `first_area_created` and `first_row_priced` | Launch route-local next-action guidance. |
| Reach a valid saved total | `first_valid_total` | Mark first value complete and celebrate once. |

The checklist remains four items even if a Guided sample produces several
events at once. It may show multiple newly completed items, but it must not
fabricate actions.

### Start-path choice

| Choice | Product behavior | Guidance behavior |
| --- | --- | --- |
| Guided sample | Run current idempotent guided-sample command, record selected path and real activation events, route into generated estimate | Recommended for users who want to see a complete estimate quickly. |
| Workspace template | Open eligible template selection/creation flow | Explain reusable structure, not sample data. |
| Blank project | Create through current project flow | Minimal guidance, no forced sample. |
| Explore on my own | No project mutation | Dismiss auto guidance; checklist remains available. |

### Task interaction rule

For creation/editing tasks:

1. show the explanation;
2. primary CTA says the real action, such as **Add an area**;
3. close/pause Joyride;
4. focus or route to the normal application control;
5. let the user perform the mutation normally;
6. recognize the corresponding authoritative domain fact or activation event;
   and
7. update the checklist without automatically reopening a dialog.

## First Estimate Value Guide

`first_estimate_value` is route-local and capability-aware.

| Step key | Target | Purpose | Interaction policy |
| --- | --- | --- | --- |
| `hierarchy` | `estimate.hierarchy` | Explain Project → Estimate → Tab → Area → Row. | Passive, Next. |
| `add_area` | `estimate.add_area` | Explain where an area groups work. | CTA closes guide and focuses target. |
| `add_priced_row` | `estimate.add_row` or known sample row adapter | Explain how a row becomes priced. | CTA closes guide; no arbitrary row selector. |
| `price_and_scope` | `estimate.price_input` | Explain quantity/unit cost and visible scope/adjustment only when present. | Never edit while alertdialog is open. |
| `total_and_save` | `estimate.total` plus save-state context | Explain the valid total and persisted save/error state. | Passive final step after real milestone. |

If the user already completed a task independently, filter that step before the
tour starts. Do not flash already-known instructions.

## Progressive Feature Discovery

### `library_reuse`

Eligibility:

- first value reached or user explicitly opens Library;
- Components/Templates route has actual content or truthful empty state;
- capability permits the target action.

Teach:

1. workspace Components vs project-only sources;
2. Templates as reusable structure; and
3. insertion/manage permission distinction.

Do not target blank Library Overview.

### Audited help-only surfaces

Project Data/Activity, Team/collaboration, Proposals, and Client Portals are
audited in `04-ROUTE-AND-OVERLAY-INVENTORY.md`, but beta v1 does not create
Joyride flows for them. They retain truthful empty states, Support/Getting
started links, and ordinary inline help. A later flow-version decision may add a
short guide only after observed support or activation data justifies it.

### `client_sharing`

Eligibility:

- project management capability;
- publication feature available;
- valid estimate/project content.

Teach:

1. Client links are sender-managed publication;
2. audience/content/access must be reviewed; and
3. Proposals and Client Portals are separate recipient/portal experiences.

## Settings: Guidance & Tours

### Placement

Add **Guidance & tours** to the ordinary Settings group near Profile/Workspace
and before Support/legal. It must be accessible to every authenticated user,
not only workspace admins.

### Information architecture

```text
Guidance & tours
  Current progress
  Resume recommended task
  Core orientation
  First estimate
  Available feature guides
  Checklist visibility
  Reset guidance
```

### Per-flow actions

| State | Primary | Secondary |
| --- | --- | --- |
| Not started | Start | — |
| In progress | Resume | Restart |
| Completed | Replay | Restart |
| Dismissed | Start again | — |
| Unavailable | Explain why | No disabled mystery action |

### Global actions and exact boundaries

- **Reopen checklist** — makes the checklist visible; does not change task
  completion.
- **Reset all guidance** — atomically increments generation/reset count and sets
  every existing eligible current-version flow in this workspace to
  `not_started`; preserves projects, estimates, permissions, activation
  milestones, and first-value history. It does not auto-launch a tour while the
  Settings modal remains open.
- Confirmation copy must state that business data is unaffected.
- Settings closes before a tour starts; the tour launches only after Settings
  focus restoration completes.

## Failure and Recovery Experience

### Missing optional target

- Skip the step with `target_not_applicable`.
- Continue only if the next step is independently meaningful.
- Record no selector or URL.

### Missing essential target

Show a recoverable tooltip/state:

> We can’t find this control in the current view.

Actions:

- Retry
- Skip this step
- Exit tour
- Contact Support

Retry is bounded and cancelable. It never reloads or loops without explicit
user action.

### Unauthorized or changed capability

- Stop the affected guide.
- Refresh the server eligibility snapshot once.
- If still unavailable, mark the flow unavailable for this session with
  `capability_changed`.
- Never reveal the hidden route or resource ID.

### Offline or mutation failure

- Viewing a guide remains local.
- Durable progress mutation failure shows a non-blocking retry state and keeps
  the last server-confirmed projection.
- Do not optimistically claim completion.
- A duplicate mutation ID returns the already-applied result.

## Accessibility Contract

- Preserve Joyride’s focus trap for passive tooltip steps.
- Do not nest Joyride with application dialogs.
- Close/pause before keyboard interaction with application controls.
- Close or `Escape` pauses the runtime and preserves `in_progress` plus the
  semantic step.
- Skip or **Don't show again** is the only tooltip path to durable
  `dismissed`.
- Programmatic stop for an application modal records a pause reason, suppresses
  dismissal handling, and resumes only through an explicit launch after focus
  restoration.
- Restore focus to the logical trigger/target, not `body`.
- Announce title, current step, total, and action.
- Custom tooltip uses semantic buttons and visible focus.
- Tooltip content reflows at 320 CSS pixels and 200% zoom.
- Focused content is not entirely obscured.
- Touch targets meet the repository/WCAG minimum.
- Reduced motion disables beacon pulse, smooth scroll, and nonessential
  transition animation.
- Mobile and desktop use different eligible step arrays.
- Orientation changes re-resolve the current semantic step without regressing
  durable progress.

## Success and Diagnostics Contract

### Measurement populations and windows

- **Eligible user:** unique user/workspace/flow/version/generation for which the
  server records one allowlisted `eligibility_observed` event.
- **Started run:** unique `run_id` with `started`; replay and automatic launches
  are split by `launch_mode`.
- **Activated user:** eligible creator/editor reaching `first_valid_total`.
- **Observation windows:** same session for orientation completion; 7 days from
  first eligibility for first-value conversion; 30 days for matched
  pre/post-onboarding cohorts.
- **Minimum decision sample:** do not treat a rate as a product decision until
  both compared cohorts have at least 30 eligible users. Report raw counts
  before that threshold.

### Beta outcome targets

| Measure | Denominator | Window | Initial target |
| --- | --- | --- | --- |
| Orientation completion | Started non-replay orientation runs | Same session | `>= 60%` |
| Orientation dismissal | Started non-replay orientation runs | Same session | `<= 35%` |
| Target preparation failure | All target-prepare attempts | Rolling 7 days, minimum 100 attempts | `< 2%` |
| Valid-total conversion | Eligible creator/editor users | 7 days | `>= 15%` relative lift versus the pre-onboarding matched cohort |
| Time to first valid total | Activated creator/editor users | 30-day matched cohorts | `>= 20%` lower median |

Existing activation truth supplies project, area, priced-row, valid-total,
Library reuse, and sharing outcomes. Estimate creation/open completion is
derived from authorized estimate rows. New sanitized events supply eligibility,
run start/end, launch mode, step outcome, dismissal/restart/replay, and
target/recovery health. Targets are beta operating goals, not permission to
declare causality without the denominator and cohort rules above.

### Privacy exclusions

Never record:

- email, name, or organization name;
- project/estimate/title/cost data;
- tenant/resource UUID;
- CSS selector or DOM text;
- full pathname, query, or referrer;
- tooltip copy;
- stack trace or SQL; or
- arbitrary metadata.

## UX Acceptance Checklist

1. One auto-start tour, maximum four steps.
2. Creator and collaborator entry are different.
3. Checklist has exactly four creator activation tasks.
4. Checklist completion uses authoritative domain facts/events.
5. No impossible task for a viewer/direct-estimate user.
6. No guide targets blank Library Overview.
7. Proposals, Client links, public shares, and Portals remain distinct.
8. Desktop and mobile target lists are different.
9. Settings exposes status, resume, replay, restart, reopen, and reset.
10. Reset preserves product and activation truth.
11. App modal and Joyride never trap focus concurrently.
12. Target failure has bounded Retry/Skip/Exit/Support.
13. Returning activated users are not auto-interrupted.
14. Only `library_reuse` and `client_sharing` ship as beta-v1 advanced guides;
    every other audited surface has an explicit help-only or excluded decision.
