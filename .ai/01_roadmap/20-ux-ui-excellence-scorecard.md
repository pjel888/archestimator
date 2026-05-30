# UX/UI Excellence Scorecard

**Last updated: 2026-05-30**

> **EXCELLENCE RULE:** A feature is not considered excellent until it has a documented happy path, recovery path, success metric, evidence, and at least one user-observation note.

---

## Scoring Scale

| Score | Label | Description |
|-------|-------|-------------|
| 0 | Not audited | No review performed; unknown quality |
| 1 | Poor | Known issues, fundamentally broken or missing |
| 2 | Usable but rough | Works but rough edges, incomplete states, no polish |
| 3 | Launch acceptable | All critical states present, usable, minimal friction |
| 4 | Excellent | Delightful, minimal cognitive load, evidence-backed |
| 5 | Exceptional | Industry-leading; validated with users, instrumented |

**Note:** Current scores are estimates based on codebase knowledge, not user observation. All scores should be validated through usability testing.

---

## Dimensions (17 total)

| # | Dimension | What it measures |
|---|-----------|-----------------|
| 1 | Clarity | Can users understand what they see without explanation? |
| 2 | Visual hierarchy | Do important elements draw attention first? |
| 3 | Interaction economy | Fewest clicks/inputs to complete a task? |
| 4 | Empty state | What does the user see when there is no data? |
| 5 | Loading state | Are waits acknowledged and progress communicated? |
| 6 | Error state | Are errors actionable, human-readable, and recoverable? |
| 7 | Success state | Is completion confirmed clearly and usefully? |
| 8 | Recovery path | Can the user undo, backtrack, or fix a mistake? |
| 9 | Keyboard accessibility | Can every interaction be completed via keyboard alone? |
| 10 | Screen-reader accessibility | Are ARIA labels, landmarks, and focus management correct? |
| 11 | Mobile/desktop guard | Does the UI adapt and remain usable across viewports? |
| 12 | Copy/microcopy | Is the language helpful, consistent, and scannable? |
| 13 | Design-system compliance | Are tokens, components, and patterns from the design system used? |
| 14 | Cognitive load | Is the interface calm, scannable, and free of unnecessary elements? |
| 15 | First-time-user guidance | Does a new user know what to do and where to start? |
| 16 | Power-user efficiency | Are shortcuts, bulk actions, and advanced flows available? |
| 17 | Evidence quality | Is there user observation, session replay, or metric data backing the score? |

---

## Feature Scorecards

### 1. Landing page + login

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Authentication flows exist; landing page messaging untested |
| Visual hierarchy | 2 | Login form is prominent; landing page hierarchy unknown |
| Interaction economy | 2 | Standard auth flow, reasonable step count |
| Empty state | 0 | Not audited |
| Loading state | 2 | Auth providers show loading indicators |
| Error state | 2 | Auth errors surfaced (invalid credentials, etc.) |
| Success state | 2 | Redirect on login works |
| Recovery path | 2 | Password reset, re-authentication flows exist |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Uses shared auth components, design tokens via lint enforcement |
| Cognitive load | 2 | Simple page, minimal distractions, landing untested |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 1.2 |
| Target beta | 3.0 |
| Target public launch | 4.0 |
| Main UX risk | First-time user drop-off at landing, untested onboarding flow |
| Required evidence | Session recordings of new-user signup (n >= 5), task-completion rate |
| Next product decision | Determine if landing page needs copy audit before beta |

### 2. Workshop home (bento grid)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Bento grid layout is scannable; card labels untested |
| Visual hierarchy | 2 | Card sizing creates hierarchy; no eye-tracking data |
| Interaction economy | 2 | Click-to-navigate; acceptable |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited |
| Success state | 0 | Not audited |
| Recovery path | 0 | Not audited |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 2 | Bento grid collapses; responsive behavior not fully tested |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Card components, spacing tokens, lint-enforced |
| Cognitive load | 2 | Grid layout is clean; content density untested |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.8 |
| Target beta | 2.5 |
| Target public launch | 3.5 |
| Main UX risk | Card discoverability, mobile card reflow breaking scan pattern |
| Required evidence | Heatmap of click distribution, task-completion for common nav targets |
| Next product decision | Audit bento grid at 320px, 768px, 1440px breakpoints |

### 3. Project dashboard

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Project overview layout exists; information architecture untested |
| Visual hierarchy | 2 | Section grouping present; untested |
| Interaction economy | 2 | Tab/section navigation; acceptable |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited |
| Success state | 0 | Not audited |
| Recovery path | 0 | Not audited |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Uses shared layout, card, and typography tokens |
| Cognitive load | 2 | Dashboard pattern familiar; density untested |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.8 |
| Target beta | 2.5 |
| Target public launch | 3.5 |
| Main UX risk | Dashboard becomes overwhelming with many projects; no filtering/sorting |
| Required evidence | Tree-test of project IA, time-to-find-target-project |
| Next product decision | Define minimum project count before search/filter is required |

### 4. Estimate tree nav (React Complex Tree)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 3 | Tree structure maps to estimating mental model; nesting is clear |
| Visual hierarchy | 2 | Indentation and expand/collapse affordances present |
| Interaction economy | 3 | Expand, collapse, select, drag; efficient for tree operations |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited |
| Success state | 0 | Not audited |
| Recovery path | 0 | Not audited |
| Keyboard accessibility | 0 | Not audited (React Complex Tree claims some keyboard support) |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 2 | Third-party component, partially styled to match |
| Cognitive load | 2 | Tree depth may cause overwhelm; untested |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.9 |
| Target beta | 3.0 |
| Target public launch | 4.0 |
| Main UX risk | Deeply nested trees become unusable on small screens, keyboard nav gaps |
| Required evidence | Task-completion for 3-level, 5-level, and 8-level tree operations |
| Next product decision | Set max recommended tree depth; test React Complex Tree keyboard claims |

### 5. Row editing (inline estimate editing)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Inline editing pattern is familiar; field labels exist |
| Visual hierarchy | 2 | Editable fields have visual affordance (border, cursor change) |
| Interaction economy | 2 | Click-to-edit, tab-between-fields pattern |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 1 | Validation errors shown but recovery path unclear |
| Success state | 1 | Save acknowledged but no confirmation of what changed |
| Recovery path | 0 | Not audited (undo support unknown) |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Input, label, and validation components from shared system |
| Cognitive load | 2 | Single-cell editing limits scope; multi-cell editing unknown |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited (bulk edit, copy-paste cells unknown) |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.8 |
| Target beta | 3.0 |
| Target public launch | 4.0 |
| Main UX risk | No undo; accidental edits cause data loss; no bulk operations |
| Required evidence | Error-rate during editing sessions, time-to-complete-row-edit |
| Next product decision | Prioritize undo/redo for edit operations before beta |

### 6. Component library (Cost Library)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Library items are browsable; categorization exists |
| Visual hierarchy | 2 | List/grid layout provides structure |
| Interaction economy | 2 | Search, browse, select pattern works |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited |
| Success state | 0 | Not audited |
| Recovery path | 0 | Not audited |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Card, list, and search components are shared |
| Cognitive load | 2 | Library browsing is straightforward; large libraries untested |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited (bulk import, favorites, recents unknown) |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.8 |
| Target beta | 2.5 |
| Target public launch | 3.5 |
| Main UX risk | Library grows too large to browse; search quality degrades |
| Required evidence | Time-to-find-component for libraries of 50, 200, and 500 items |
| Next product decision | Set component count threshold for introducing advanced search/filter |

### 7. Templates

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Template cards show preview and name; selection works |
| Visual hierarchy | 2 | Grid of template cards; consistent layout |
| Interaction economy | 2 | Select and apply flow is straightforward |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited |
| Success state | 2 | Template applied confirmation exists |
| Recovery path | 2 | Can discard template and start fresh |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Card and layout components, lint-enforced |
| Cognitive load | 2 | Template picker is a familiar pattern |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 1.0 |
| Target beta | 2.5 |
| Target public launch | 3.5 |
| Main UX risk | Template preview insufficient to make selection decision |
| Required evidence | Selection accuracy (did user pick the right template for their need?) |
| Next product decision | Define minimum template preview requirements (summary, structure, key metrics) |

### 8. Charts (D3 donut/bubble)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 3 | Donut and bubble charts render correctly; legend present |
| Visual hierarchy | 3 | Color encoding and sizing create clear visual weight |
| Interaction economy | 2 | Hover tooltips work; click/zoom behavior may exist |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited (what happens with zero values, NaN?) |
| Success state | 0 | Not audited |
| Recovery path | 0 | Not audited |
| Keyboard accessibility | 0 | Not audited (SVG charts notoriously inaccessible) |
| Screen-reader accessibility | 0 | Not audited (no data table fallback confirmed) |
| Mobile/desktop guard | 2 | Charts resize; touch interaction untested |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 2 | Custom D3 rendering, color tokens used |
| Cognitive load | 2 | Charts add visual interest; interpretation burden unknown |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited (export, zoom, filter unknown) |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.9 |
| Target beta | 2.5 |
| Target public launch | 3.5 |
| Main UX risk | Charts are visual-only, inaccessible to screen readers, no data table |
| Required evidence | Screen-reader audit of chart sections, comprehension test (n >= 5) |
| Next product decision | Require data-table fallback for every chart before public launch |

### 9. XLSX export

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Export button is present; format is standard |
| Visual hierarchy | 1 | Export action may be buried; visibility untested |
| Interaction economy | 2 | One-click or minimal-click export |
| Empty state | 0 | Not audited (what happens with empty estimate?) |
| Loading state | 0 | Not audited (no progress for large exports) |
| Error state | 1 | Basic error if export fails; recovery unclear |
| Success state | 2 | File download triggers; no confirmation of content quality |
| Recovery path | 0 | Not audited |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 2 | Button component used; export dialog unknown |
| Cognitive load | 2 | Export is a familiar action |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited (batch export, format options unknown) |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.7 |
| Target beta | 2.5 |
| Target public launch | 3.0 |
| Main UX risk | Large exports freeze UI, no progress indication, wrong data exported |
| Required evidence | Export time and correctness for 100, 500, and 2000 line estimates |
| Next product decision | Implement async export with progress for estimates > 500 lines |

### 10. Shared link manager (V2)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 3 | V2 provides clear list of shares with status indicators |
| Visual hierarchy | 3 | Share cards include expiration, password status, access count |
| Interaction economy | 3 | Create, revoke, copy-link actions are discoverable |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 2 | Expired/invalid share states handled; error messages exist |
| Success state | 3 | Link created confirmation with copy action |
| Recovery path | 3 | Revoke and reissue flows work; password can be changed |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 2 | Action labels are clear; status text exists |
| Design-system compliance | 3 | Card, button, dialog, and status badge components used |
| Cognitive load | 2 | Share management is a focused view; acceptable complexity |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited (bulk revoke, expiration templates unknown) |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 1.4 |
| Target beta | 3.0 |
| Target public launch | 4.0 |
| Main UX risk | Share list grows long with no search/filter; accidental revoke no undo |
| Required evidence | Task-completion for create, share, revoke, and recipient-open flows |
| Next product decision | Add share list search/filter before 50-share threshold |

### 11. Shared link receiver (V2 + estimate view enhancement)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 3 | Estimate view for recipients is readable and structured |
| Visual hierarchy | 3 | Estimate content is well-organized; V2 enhancements applied |
| Interaction economy | 2 | View-only experience; drill-down may exist |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 3 | Expired, wrong password, and invalid link states handled |
| Success state | 0 | Not audited |
| Recovery path | 2 | Password retry exists (with lockout); expired link messaging |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Shared layout and typography tokens |
| Cognitive load | 2 | Read-only view is inherently low-load |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 1.2 |
| Target beta | 3.0 |
| Target public launch | 4.0 |
| Main UX risk | Recipient doesn't understand what they're looking at; no context provided |
| Required evidence | Recipient comprehension test (n >= 5), time-to-understand estimate |
| Next product decision | Add recipient-facing summary/header with estimate context and sharer info |

### 12. Password-gated share (scrypt + lockout)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Password gate is clear; lockout messaging exists |
| Visual hierarchy | 2 | Password form is the only action on the page |
| Interaction economy | 2 | Single-field form; minimal friction |
| Empty state | 0 | Not audited |
| Loading state | 2 | Scrypt key derivation may have perceptible delay; indicator unknown |
| Error state | 3 | Wrong password, lockout countdown, and max-attempts states implemented |
| Success state | 2 | Successful unlock proceeds to estimate view |
| Recovery path | 3 | Lockout timer counts down; sharer can reset password |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 2 | Lockout messaging exists; clarity untested |
| Design-system compliance | 3 | Form, input, and alert components used |
| Cognitive load | 2 | Single-purpose page; minimal distraction |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 1.3 |
| Target beta | 3.0 |
| Target public launch | 4.0 |
| Main UX risk | Lockout frustration; user doesn't know how to contact sharer for new password |
| Required evidence | Lockout-recovery completion rate, time-to-resolution for locked-out users |
| Next product decision | Add "contact sharer" or "request access" path in lockout state |

### 13. Comments (V2 P6)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Comment threads exist; threading and authorship visible |
| Visual hierarchy | 2 | Comments are visually distinct from estimate content |
| Interaction economy | 2 | Add, reply, and resolve patterns exist |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited |
| Success state | 0 | Not audited |
| Recovery path | 0 | Not audited (delete/edit comment unknown) |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Comment, avatar, and thread components used |
| Cognitive load | 2 | Comments are collapsible; threaded view may add complexity |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.8 |
| Target beta | 2.5 |
| Target public launch | 3.5 |
| Main UX risk | Comment threads become unwieldy on deep estimates; no @mentions or notifications |
| Required evidence | Comment-task-completion rate, thread depth before confusion reported |
| Next product decision | Define notification strategy for comments before public launch |

### 14. Decisions (V2 P7)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Decision cards show title, status, and resolution |
| Visual hierarchy | 2 | Decision list/panel is visually grouped |
| Interaction economy | 2 | Create, resolve, and reopen flows exist |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited |
| Success state | 0 | Not audited |
| Recovery path | 2 | Decisions can be reopened; resolution can be changed |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Card, badge, and form components used |
| Cognitive load | 2 | Decision log is a focused view; acceptable |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.9 |
| Target beta | 2.5 |
| Target public launch | 3.5 |
| Main UX risk | Decision log becomes noise if too many trivial decisions are tracked |
| Required evidence | Decision-to-resolution time, percentage of decisions that are reopened |
| Next product decision | Define decision significance threshold; consider auto-archiving resolved |

### 15. Activity feed (V2 P8)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Timestamped activity entries with actor and action |
| Visual hierarchy | 2 | Reverse-chronological list; grouping may exist |
| Interaction economy | 2 | Scrollable feed; no interaction required to consume |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited |
| Success state | 0 | Not audited |
| Recovery path | 0 | Not audited |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Feed, timestamp, and avatar components |
| Cognitive load | 2 | Passive consumption pattern; acceptable |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited (filter by actor, type, date unknown) |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.8 |
| Target beta | 2.5 |
| Target public launch | 3.0 |
| Main UX risk | Activity feed becomes noise; no filtering; users ignore it |
| Required evidence | Percentage of users who scroll past first 10 items, filter usage if added |
| Next product decision | Determine if feed needs filtering or if it should be collapsed by default |

### 16. Invite entry (local E2E passed)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Invite acceptance page exists; purpose is clear |
| Visual hierarchy | 2 | Call-to-action is prominent |
| Interaction economy | 2 | Accept flow is straightforward |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 2 | Invalid/expired invite messaging exists |
| Success state | 2 | Redirect to workspace on successful join |
| Recovery path | 3 | Expired invite can be re-sent; local E2E tests pass recovery scenarios |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Shared auth and onboarding components |
| Cognitive load | 2 | Simple, single-purpose page |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data (E2E tests are automated, not user observation) |

| Metric | Value |
|--------|-------|
| Current average | 1.1 |
| Target beta | 3.0 |
| Target public launch | 4.0 |
| Main UX risk | Invite email lands in spam; user doesn't know what workspace they're joining |
| Required evidence | Invite-acceptance completion rate, time-from-email-to-join |
| Next product decision | Audit invite email copy and deliverability; add workspace context to accept page |

### 17. Ask Flip (AI assistant)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Chat interface is familiar; AI context may be unclear |
| Visual hierarchy | 2 | Chat panel is distinguishable from main content |
| Interaction economy | 2 | Free-text input with send; standard chat pattern |
| Empty state | 0 | Not audited (what does Flip show before first message?) |
| Loading state | 2 | Streaming response or typing indicator likely present |
| Error state | 1 | Basic error on failure; recovery unclear |
| Success state | 0 | Not audited |
| Recovery path | 0 | Not audited |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 2 | Chat UI components, may be partially custom |
| Cognitive load | 2 | Chat is a familiar paradigm; AI-specific expectations untested |
| First-time-user guidance | 0 | Not audited (what can Flip do? example prompts?) |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.8 |
| Target beta | 2.5 |
| Target public launch | 3.5 |
| Main UX risk | Users don't know what to ask; over-trust AI output; no source attribution |
| Required evidence | Task-completion rate for AI-assisted vs manual estimate creation |
| Next product decision | Add example prompts and capability disclosure; consider source citations |

### 18. Package-builder (draft/refine/apply)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Three-phase flow (draft, refine, apply) is structured |
| Visual hierarchy | 2 | Phase progression is visible |
| Interaction economy | 3 | Step-by-step wizard reduces cognitive load per step |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 0 | Not audited |
| Success state | 2 | Package applied confirmation exists |
| Recovery path | 2 | Can go back to refine before applying |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Wizard, card, and form components used |
| Cognitive load | 2 | Wizard pattern limits visible complexity per step |
| First-time-user guidance | 0 | Not audited (what is a package? why use the builder?) |
| Power-user efficiency | 0 | Not audited (save draft, templates, quick-apply unknown) |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 1.1 |
| Target beta | 3.0 |
| Target public launch | 4.0 |
| Main UX risk | Users don't understand the draft/refine/apply mental model; abandon mid-flow |
| Required evidence | Completion rate for full 3-phase flow, drop-off per phase |
| Next product decision | Add inline explanation of each phase; consider progress indicator |

### 19. Account settings

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Settings sections exist (profile, password, etc.) |
| Visual hierarchy | 2 | Grouped settings with section headers |
| Interaction economy | 2 | Standard form pattern; save per section or global |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 1 | Form validation errors shown; server errors may be generic |
| Success state | 1 | Save confirmation exists; clarity untested |
| Recovery path | 0 | Not audited |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Form, input, and section components used |
| Cognitive load | 2 | Settings page is standard pattern |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.8 |
| Target beta | 2.5 |
| Target public launch | 3.0 |
| Main UX risk | Settings page rarely visited; low priority but can cause account lockout |
| Required evidence | Password-change completion rate, profile-update success rate |
| Next product decision | None urgent; standard settings polish before public launch |

### 20. Workspace settings

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clarity | 2 | Workspace management sections exist |
| Visual hierarchy | 2 | Members, roles, and workspace config grouped |
| Interaction economy | 2 | Standard settings forms |
| Empty state | 0 | Not audited |
| Loading state | 0 | Not audited |
| Error state | 1 | Validation errors shown; permission errors may be confusing |
| Success state | 1 | Save confirmation exists |
| Recovery path | 0 | Not audited (role change undo? member removal undo?) |
| Keyboard accessibility | 0 | Not audited |
| Screen-reader accessibility | 0 | Not audited |
| Mobile/desktop guard | 0 | Not audited |
| Copy/microcopy | 0 | Not audited |
| Design-system compliance | 3 | Form, table, and member-list components |
| Cognitive load | 2 | Admin-focused page; complexity expected |
| First-time-user guidance | 0 | Not audited |
| Power-user efficiency | 0 | Not audited (bulk member management unknown) |
| Evidence quality | 0 | No user observation data |

| Metric | Value |
|--------|-------|
| Current average | 0.8 |
| Target beta | 2.5 |
| Target public launch | 3.5 |
| Main UX risk | Accidental member removal, role misassignment, no audit trail |
| Required evidence | Role-change task-completion, member-management error rate |
| Next product decision | Add confirmation dialogs for destructive workspace actions; consider audit log |

---

## Summary Table

| # | Feature | Current Avg | Target Beta | Target Launch | Top Risk |
|---|---------|-------------|-------------|---------------|----------|
| 1 | Landing page + login | 1.2 | 3.0 | 4.0 | First-time user drop-off |
| 2 | Workshop home (bento grid) | 0.8 | 2.5 | 3.5 | Card discoverability, mobile reflow |
| 3 | Project dashboard | 0.8 | 2.5 | 3.5 | Dashboard overwhelm, no filtering |
| 4 | Estimate tree nav | 0.9 | 3.0 | 4.0 | Deep nesting, keyboard gaps |
| 5 | Row editing | 0.8 | 3.0 | 4.0 | No undo, accidental data loss |
| 6 | Component library | 0.8 | 2.5 | 3.5 | Large library becomes unbrowsable |
| 7 | Templates | 1.0 | 2.5 | 3.5 | Insufficient preview for selection |
| 8 | Charts (D3) | 0.9 | 2.5 | 3.5 | Inaccessible, no data table fallback |
| 9 | XLSX export | 0.7 | 2.5 | 3.0 | Large exports freeze UI |
| 10 | Shared link manager | 1.4 | 3.0 | 4.0 | No search/filter on long share list |
| 11 | Shared link receiver | 1.2 | 3.0 | 4.0 | Recipient confusion, no context |
| 12 | Password-gated share | 1.3 | 3.0 | 4.0 | Lockout frustration, no contact path |
| 13 | Comments | 0.8 | 2.5 | 3.5 | Thread depth, no notifications |
| 14 | Decisions | 0.9 | 2.5 | 3.5 | Trivial decisions create noise |
| 15 | Activity feed | 0.8 | 2.5 | 3.0 | Feed becomes ignored noise |
| 16 | Invite entry | 1.1 | 3.0 | 4.0 | Email deliverability, workspace context |
| 17 | Ask Flip | 0.8 | 2.5 | 3.5 | Users don't know what to ask |
| 18 | Package-builder | 1.1 | 3.0 | 4.0 | Draft/refine/apply mental model unclear |
| 19 | Account settings | 0.8 | 2.5 | 3.0 | Low priority, low risk |
| 20 | Workspace settings | 0.8 | 2.5 | 3.5 | Accidental member removal |
| | **Overall average** | **0.95** | **2.70** | **3.60** | |

---

## Dimension Coverage Heatmap

Shows which dimensions have any non-zero scores across features (i.e., have been at least cursorily reviewed).

| Dimension | Features with score > 0 | Coverage % |
|-----------|------------------------|------------|
| Clarity | 20/20 | 100% |
| Visual hierarchy | 20/20 | 100% |
| Interaction economy | 20/20 | 100% |
| Design-system compliance | 20/20 | 100% |
| Cognitive load | 20/20 | 100% |
| Error state | 13/20 | 65% |
| Success state | 11/20 | 55% |
| Recovery path | 8/20 | 40% |
| Loading state | 5/20 | 25% |
| Empty state | 0/20 | 0% |
| Keyboard accessibility | 0/20 | 0% |
| Screen-reader accessibility | 0/20 | 0% |
| Mobile/desktop guard | 2/20 | 10% |
| Copy/microcopy | 2/20 | 10% |
| First-time-user guidance | 0/20 | 0% |
| Power-user efficiency | 0/20 | 0% |
| Evidence quality | 0/20 | 0% |

---

## Critical Gaps (Beta Blockers)

These gaps must be addressed before beta release. A feature with a score of 0 in any of these dimensions for a user-facing flow is not beta-ready.

1. **Empty state (0% coverage)**: No feature has been audited for empty-state behavior. Users encountering a fresh workspace, empty estimate, or empty library will see unknown UI.
2. **Keyboard accessibility (0% coverage)**: Not a single feature has been audited for keyboard-only operation. This blocks users with motor disabilities and power users who prefer keyboard navigation.
3. **Screen-reader accessibility (0% coverage)**: Zero ARIA audits performed. This blocks screen-reader users entirely.
4. **First-time-user guidance (0% coverage)**: No feature guides new users. Onboarding is unassessed.
5. **Evidence quality (0% coverage)**: No user observation exists for any feature. All scores are estimates, not validated.

**Required before beta:**
- Empty-state audit for all 20 features
- Keyboard-navigation audit for top 10 features (1-10)
- First-time-user guidance for landing, workshop home, and estimate tree nav

**Required before public launch:**
- Screen-reader audit for all 20 features
- Mobile/desktop guard audit for all 20 features
- User observation evidence for all 20 features (n >= 3 per feature)
- Copy/microcopy audit for all 20 features

---

## Methodology

Scores are assigned based on:
- Codebase structure and component composition (informed by design-system lint rules)
- Feature descriptions from roadmap and V2 completion notes
- Known implementation details (e.g., scrypt lockout, React Complex Tree, D3 charts)

Scores are NOT based on:
- User observation or usability testing
- Accessibility audits
- Performance measurements
- A/B test results

All scores are provisional. The scorecard is designed to highlight what we don't know, not to claim what we do. The first round of user testing should validate or correct every score above 1.

---

## Codex Implementation Mapping (Added 2026-05-30)

**Purpose:** Maps each feature's UX excellence to a specific Codex goal card, with beta-acceptable and public-launch targets.

**Rule:** A feature may be beta-acceptable without being excellent, but it may not be confusing, unsafe, unrecoverable, or slow on the critical path.

### Feature → Goal Card → Target Scores

| # | Feature | Codex Goal Card | Current Avg | Beta Target | Public Target | Critical UX Risk | What "Excellent" Means | What's Acceptable for Beta | Unacceptable Even for Beta |
|---|---------|----------------|-------------|-------------|---------------|-------------------|------------------------|---------------------------|---------------------------|
| 1 | Landing + login | BETA-P0-UX-001 | 1.2 | 3.0 | 4.0 | First-time drop-off at landing; unverified OAuth warning | User understands product and signs in without confusion; OAuth flows smoothly | Google warning acceptable if partners briefed; clear CTAs; login works | Broken auth flow; redirects to wrong page; user cannot sign in |
| 2 | Workshop home | BETA-P0-UX-001 | 0.9 | 2.5 | 4.0 | Empty state is blank, no guidance | Bento grid self-explains; empty state has clear CTA; recent projects surfaced | Empty state has CTA button; bento grid is scannable; basic navigation works | Blank empty state; user doesn't know what to do; broken navigation |
| 3 | Estimate editor | BETA-P0-UX-002 | 1.4 | 3.0 | 4.0 | Row editing performance, tree navigation clarity, totals accuracy | Smooth editing, tree expand/collapse, instant totals, undo support | Row edit works, totals update, tree is navigable, design-system compliance | Totals wrong; edits lost on save; tree broken; confusing hierarchy |
| 4 | Component library | (covered by UX-002) | 1.5 | 2.5 | 4.0 | Search performance, insert UX | Fast search, one-click insert, clear cost display, preview tooltips | Search works, insert works, costs display, library loads | Search broken; insert fails silently; costs wrong; library doesn't load |
| 5 | Templates | (covered by UX-002) | 1.4 | 2.5 | 4.0 | Apply/merge safety, preview accuracy | Preview matches apply output, safe merge, template management | Templates load, apply works, preview is accurate enough | Apply overwrites data without warning; preview inaccurate; templates broken |
| 6 | XLSX export | BETA-P0-UX-002 | 1.3 | 2.5 | 4.0 | Large estimate timeout, file corruption | Fast, reliable, well-formatted, no corruption even at 500 rows | Export works for typical estimate sizes; format is readable; download succeeds | Export fails; corrupt file; browser freezes; no feedback during generation |
| 7 | Charts | (covered by UX-002) | 1.4 | 2.5 | 4.0 | D3 performance, grouping UX | Clear, interactive, responsive charts; smooth grouping transitions | Charts render; groupings work; basic interaction works; no crashes | Charts crash; data wrong; interaction broken; ties up main thread |
| 8 | Shared link manager | BETA-P0-UX-003 | 1.5 | 2.5 | 4.0 | Password gate clarity, revocation UX | Clear create/manage/revoke, password gate understandable, activity log | Create/share/revoke works; password optional; management UI functional | Links broken; password gate confusing; revoke doesn't work; tokens leaked |
| 9 | Shared receiver | BETA-P0-UX-003 | 1.5 | 3.0 | 4.0 | Client comprehension of tabs and content | Client understands estimate without training; tabs clear; comments work | Estimate readable; tabs navigable; comments work; password gate shows feedback | Estimate confusing; tabs broken; comments fail; client can't understand content |
| 10 | Comments/decisions | (covered by UX-003) | 1.3 | 2.5 | 4.0 | Thread UX, decision flag clarity | Threaded comments, clear decision marking, activity feed | Comments save/show; decisions flaggable; basic activity feed works | Comments lost; decisions broken; activity empty; no author attribution |
| 11 | Ask Flip (AI) | BETA-P0-AI-001 | 1.4 | 2.5 | 4.0 | Scope understanding (read-only), timeout, workspace isolation | User understands it's read-only and workspace-scoped; useful responses < 15s; clear error on timeout | Clear scope label; responses are relevant; timeout shows feedback; errors are graceful | User thinks AI can write data; AI accesses wrong workspace; hangs indefinitely |
| 12 | Package builder (AI) | BETA-P0-AI-001 | 1.4 | 2.5 | 4.0 | Confirmation gate clarity, output quality | Confirmation required before apply; draft quality high; user modifies < 50% of suggestions | Confirmation gate clear; drafts generate; apply works; user can edit before apply | Applies without confirmation; requires no user review; AI errors written to estimate |
| 13 | Invite acceptance | BETA-P0-UX-001 | 1.5 | 3.0 | 4.0 | Wrong-account recovery, expired token UX | All invite states handled gracefully; wrong-account flow clear; expired token informative | Invite works for signed-out and signed-in users; wrong-account detected; expired token shows message | Invite broken; wrong-account silent failure; expired token crashes; no recovery |
| 14 | Project creation | (covered by UX-001) | 1.6 | 2.5 | 3.5 | Modal UX, empty project guidance | Fast modal, auto-creates estimate draft, clear next step | Modal works, project appears after creation, estimate draft exists | Creation fails silently; project doesn't appear; no estimate created |
| 15 | Settings/profile | (covered by UX-001) | 1.3 | 2.0 | 3.5 | Account deletion safety | Profile management, account deletion with confirmation cascade | Profile view/edit works; logout works; basic settings functional | Deletion broken; profile save fails; logout broken |
| 16 | Collaboration cursors | (covered by UX-002) | 1.2 | 2.0 | 3.5 | Real-time performance, cursor accuracy | Smooth cursor movement, clear attribution, presence indicators | Cursors visible; basic presence works; no performance hit | Cursors laggy; presence broken; causes estimate editing latency |
| 17 | Error boundaries | BETA-P0-REL-001 | 0.5 | 2.5 | 4.0 | Recovery UX, design-system compliance | Error boundaries catch all workshop errors; custom 404/500; no white screens | Error boundaries on estimate/tree/AI panel; custom 404/500 exist using design system | White screen on error; stack traces in UI; no recovery path |
| 18 | Mobile guard | BETA-P0-REL-001 | 0.0 | 2.0 | 3.5 | Guard clarity, no broken layouts | Clear desktop-only message, blocks interaction with broken mobile layout | Guard covers full viewport at < 768px; clear message; prevents interaction | Broken mobile layout is visible; user tries to use it; no guard at all |
| 19 | Design-system consistency | BETA-P0-UX-001 | 2.0 | 3.0 | 4.0 | One-off components, token drift | All workshop components use shared primitives; lint passes | `bun run lint:design-system` passes on workshop routes | Raw Tailwind in workshop; custom colors; wrong font sizes; non-xs radius |

### Beta-Acceptable Score Threshold

A feature scoring 2.5+ average across dimensions is beta-acceptable provided:
- Critical UX risk is mitigated (not just documented)
- No "unacceptable even for beta" criteria are present
- User can complete the core task without external help
- Error states show recovery paths
- Design-system compliance is met

A feature scoring below 2.0 is NOT beta-acceptable and blocks BETA-P0-BETA-001.

### Performance-Linked UX Risks

| UX Risk | Performance Implication | Goal Card |
|----------|------------------------|-----------|
| Row edit latency > 200ms | Users perceive tool as slow, revert to spreadsheets | BETA-P0-PERF-001 |
| Tree render > 1s for 500 nodes | Navigation feels broken, users lose context | BETA-P0-PERF-001 |
| Share receiver FMP > 2s | Clients bounce before seeing estimate | BETA-P0-PERF-001 |
| AI timeout without UI feedback | Users think AI is broken, never try again | BETA-P0-AI-001 |
| XLSX export > 10s or freeze | Blocks browser, users abandon export | BETA-P0-PERF-001 |
| Bundle > 200KB gzipped | Slow first load, high bounce on landing | BETA-P0-PERF-002 |

### Accessibility Minimum for Beta

These accessibility criteria are non-negotiable for beta:

1. All interactive elements are keyboard-accessible (Tab, Enter, Escape)
2. Form inputs have visible labels (not placeholder-only)
3. Error messages are text-based, not color-only
4. Focus indicators are visible (no `outline: none` without replacement)
5. All images have alt text (functional images have descriptive alt)
6. Color contrast meets WCAG AA minimum (4.5:1 for text)

Full WCAG 2.1 AA audit is BETA P1 (accepted risk for known design partners). Full audit required for PUBLIC LAUNCH.
