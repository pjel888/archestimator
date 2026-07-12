# 07 — Findings: Adversarial Bug Hunt (improve-stage pass)

Produced by a fresh adversarial review of the Publisher client components
(improve-stage Phase 5). All claims verified against real source; the two
highest-impact P1s re-checked by the lead. Severity: **P0/P1/P2/P3**.
Evidence = `file:line` vs current `main`.

These are **additional** to the bugs in `02-findings-perf-and-bugs.md`.
Registry IDs: `A-BUG-*` (adversarial). No XSS, no redirect loop, no memory
leaks found — those suspected angles were checked and cleared.

## A-BUG-1 — `searchValue` never re-syncs from `filters.search` [P1]

**Evidence:** `PublisherRosterClient.tsx:120` `const [searchValue, setSearchValue] = useState(filters.search);` — initialized once; the only sync effect (`:247-251`) goes `searchValue → URL` (one-way). There is **no** effect mapping `filters.search → setSearchValue`.

**Failure:** When `filters.search` changes via a path other than local typing (browser back/forward, server redirect, or a future caller), the input keeps stale text and the debounce effect re-fires and clobbers the URL with the stale value.

**Fix (UNIT-8):** add a `useEffect` syncing `searchValue` from `filters.search` when not actively typing (guarded), or derive a draft buffer from props.

## A-BUG-2 — `selectedProjectId` not kept valid against `roster.rows` [P1]

**Evidence:** `PublisherRosterClient.tsx:130-132` lazy `useState` initializer; only updated by `selectRow`. `selectedRow = roster.rows.find(... === selectedProjectId) ?? null` (`:137-139`).

**Failure:** Apply a status filter that excludes the currently-selected project → `selectedRow` becomes `null` → the detail pane collapses to "Choose a project" even though the user never deselected. Desktop selection silently vanishes.

**Fix (UNIT-8):** add an effect that falls back to `roster.rows[0]?.projectId` when the selected id is no longer present.

## A-BUG-3 — Imperative `matchMedia`/`innerWidth` read in click handler [P2]

**Evidence:** `PublisherRosterClient.tsx:190` reads the viewport imperatively inside `selectRow` (on click), with no resize listener and no reactive hook.

**Failure:** The mobile/desktop branching decision is decoupled from the rendered CSS layout; a desktop-selected row does not transition to the mobile detail pane on resize because the decision was baked in at click time. Fragile if breakpoints change.

**Fix (UNIT-8):** derive `isCompact` from a `useSyncExternalStore`-backed media query (pattern already used in `ShareLinkDisplay.tsx:15-22`), and write the `?drawer` param on select so CSS handles visibility.

## A-BUG-4 — `ShareWizard.verificationPending` has no "back to editor" transition [P1]

**Evidence:** `ShareWizard.tsx:45,51,105-138`. `loadFailed = drawer.query.isError || verificationPending`. The only ways to clear `verificationPending` are a successful verify or unmounting the wizard.

**Failure:** A transient network blip during post-save verification strands the user on the "verification pending" screen. The message says "you do not need to save again" but there is no "Back to editor" / "Close" affordance that clears `verificationPending` — only Retry or Discard (which unmounts).

**Fix (UNIT-9):** add a "Return to editor" action from the `verificationPending` error state that clears `verificationPending` and restores the editor view (changes were already saved).

## A-BUG-5 — `retryProjectDetails` early-returns on `!verificationPending`, dropping initial-load retry result [P2]

**Evidence:** `ShareWizard.tsx:123-126`: `const verification = await drawer.query.refetch(); if (!verificationPending) return;`.

**Failure:** When the **initial** drawer load fails (not post-save), `verificationPending` is `false`, so clicking Retry refetches then immediately discards the result. The user sees "Retrying…" but the error UI never clears on success. (TanStack's own refetch may eventually recover indirectly, but not reliably on demand.)

**Fix (UNIT-9):** separate the two retry responsibilities — initial-load retry should check the refetch result regardless of `verificationPending`.

## A-BUG-6 — Draft state wiped before verification confirms → lost draft on verify-fail [P1]

**Evidence:** `ShareWizard.tsx:140-162`. `saveClientLink` resets `setPassword("")`, `setPasswordRequiredOverride(null)`, `setSelectedEstimateIdsOverride(null)` (`:152-154`) **after `result.ok` but before `verifySavedLink`**; if verify fails, the user's draft is gone and the editor (if shown again) shows defaults.

**Failure:** Save succeeds but post-save verification fails → the user's intended password/selections are wiped. Combined with A-BUG-4, the user is stuck on the pending screen with a lost draft.

**Fix (UNIT-9):** move the draft reset to after verification succeeds (inside `verifySavedLink` success branch or after `setComplete(true)`).

## A-BUG-7 — `onError` missing on mutations + `void`-ed confirm action → possible unhandled rejection [P2]

**Evidence:** `PublisherDrawer.tsx:170-177`; `usePublisherDrawer.ts:42-58` (no `onError`). `refreshPublisherSurface` (`:36-40`) calls `router.refresh()` inside the mutation's `onSuccess`.

**Failure:** `runPublicationUpdate` catches its own `action()` rejection, but a `router.refresh()` rejection triggered by `onSuccess` happens outside that try/catch → unhandled promise rejection. Rare (only when `router.refresh()` itself rejects).

**Fix (UNIT-5):** add `onError` to the three mutations (already planned under mutation-error-handling unit).

## A-BUG-8 — In-flight ref keyed on mutable projectId; never cleared if row changes mid-action [P2]

**Evidence:** `PublisherDrawer.tsx:112,127-128,144-168`. `publicationActionInFlightRef` keyed on `actionProjectId = summary?.projectId ?? rowProjectId`; `finally` (`:164-166`) only clears `if (publicationActionInFlightRef.current === actionProjectId)`.

**Failure:** If the drawer's `row` changes mid-action (user selects a different project while a rotate is in flight — the embedded layout allows this via the list), the ref is never cleared → the drawer is permanently locked ("Finish the current publication action") until unmount.

**Fix (UNIT-5):** clear the ref unconditionally in `finally`, or key it on a request token rather than a mutable project ID.

## A-BUG-9 — `PublisherProjectPicker` focus lands on close button, not search [P2]

**Evidence:** `PublisherProjectPicker.tsx:70,85`. `initialFocus="first"` on `DialogContent` + `autoFocus` on `SearchInput` (without `data-dialog-initial-focus`). Dialog focus-management wins on the later frame; `getFocusableElements(content)[0]` is the close button (rendered before the search input in DOM order).

**Failure:** Every time the picker opens, focus briefly hits search then is yanked to the close button. Keyboard/SR users land on "Close project picker" instead of the search field.

**Fix (UNIT-7):** set `data-dialog-initial-focus` on the search input, or use `initialFocus="content"` + rely on `autoFocus`.

## A-BUG-10 — Search cleared on Link click causes full-list flash before navigation [P2]

**Evidence:** `PublisherProjectPicker.tsx:54-62,140-155`. `changeOpen(false)` clears search on the no-estimate `<Link>` click path, triggering a re-render of the full unfiltered list before navigation completes.

**Failure:** Minor visual glitch — the dialog briefly flashes the full list during the navigation transition.

**Fix (UNIT-7):** clear search only on dialog close/unmount, not on item activation.

## A-BUG-11 — `useSyncExternalStore` with no-op subscribe in `ShareLinkDisplay` [P2]

**Evidence:** `ShareLinkDisplay.tsx:15-25`. `subscribeToBrowserState` returns `() => undefined`. The snapshots are read once and only re-evaluated on unrelated re-renders.

**Failure:** Latent correctness issue — the share button's visibility is fixed at mount-time capability detection; won't react if `navigator.share`/clipboard availability changes mid-session. Misleading idiom (no benefit over `useState(() => …)`). Not a crash.

**Fix (UNIT-7):** use `useState(() => …)` for mount-time detection, or provide a real subscribe if reactivity is wanted.

## A-BUG-12 — Drawer/wizard deep-link intent matched only against current-page rows [P1]

**Evidence:** `PublisherRosterClient.tsx:91-108` (`readDrawerIntent`/`readWizardIntent` use `rows.find(...)`); `page.tsx:16-29` (server rewrite exists for `wizard` but **not** for `drawer`).

**Failure:** A deep link to `?drawer=<id>` for a project not on the current filtered page yields `null` → the drawer silently never opens; the param persists doing nothing. The `wizard` path is partially mitigated server-side, but `drawer` has no mitigation. Even `wizard` fails if the user lacks read permission on that project.

**Fix (UNIT-8):** either add the same server-side filter rewrite for `drawer`, or construct a minimal row from the URL param as a fallback (the row only needs `projectId` + display fields for the drawer shell, with full data fetched by `usePublisherDrawer`).

## A-BUG-13 — `closeWizard` does not remove `project` param set by `openProjectWizard` [P2]

**Evidence:** `page.tsx:18-29`; `PublisherRosterClient.tsx:207-235`. `openProjectWizard` sets `project`; `closeWizard` (`:207-222`) deletes only `wizard` and `step`.

**Failure:** After opening the wizard via the "Create client link" picker and then closing it, the roster stays filtered to that one project with no visible "filtered" indicator beyond the dropdown. The user is confused why only one project shows. **Verified by lead** (read `closeWizard` directly).

**Fix (UNIT-8):** `closeWizard` should also delete `project` (and clear `page`) when the wizard was opened via the picker, restoring the full roster.

## Cleared suspicions (not bugs)

- **No redirect loop** in `page.tsx` — the server only filters, never rewrites the URL.
- **No XSS** — no `dangerouslySetInnerHTML`, no unsanitized user input rendered as HTML anywhere in the publisher surface.
- **No memory leaks** — `SharedLinkActivityFeed` removes its listeners; the debounce effect clears its timeout.
- **`ShareLinkDisplay` fire-and-forget copy/share** — both functions have complete try/catch; the `void` pattern is safe.
