# 07 — COMPONENT & FILE PLAN · Shared-Link Modal

**Source:** design specs (03–06) + structure findings (PROB-12/16/17/31/32). Names **real, existing** files and respects the FIXED server contract (`lib/publication/actions.ts`). Resolves the structure root causes **RC-09** (no extraction boundary), **RC-07** (no client sync), **RC-08** (split in-flight coordination), **RC-11** (ControlField aria contract).

> **Planning-only.** This doc specifies *what* changes and the contracts; `08-IMPLEMENTATION-GUIDE.md` sequences the *how/when*.

---

## 1. Guiding refactor: extract the god component (RC-09)

`ProjectPublicationHeader.tsx` (1329 lines) becomes a thin orchestrator. The publication **state machine + drafts** move to a hook; each **tab body** becomes a component; the **destructive confirm** becomes a component; the **reconcile helpers** move to a module; `SheetPickerList` gets its own file. The team already proved this boundary at Recipients/Activity — we extend it to the other three tabs.

### 1a. NEW files

| File | Exports | Responsibility | Replaces |
|------|---------|----------------|----------|
| `src/lib/publication/optimistic.ts` | `readPublicationServerSignature`, `shouldUseOptimisticPublicationResult` (+ types) | Move the signature-gating reconcile out of the view (`:160-194`). **Preserve-list** item — logic untouched, just relocated + unit-testable. | PROB-31 |
| `src/lib/publication/format.ts` | `formatExpiry(iso)` (move/dup `ProjectTeamspaceHeader.tsx:88-97`), `formatRelativeOpened(iso)` | Relative expiry ("expires in 3 days") + relative "opened 2h ago" helpers shared by this modal + the Teamspace header. | PROB-30 |
| `src/lib/publication/use-publication-drafts.ts` | `usePublicationDrafts({ summary })` → `{ drafts, dirty, pendingCount, set*, resetAll, isDirty }` | The 4 draft machines (password `:303`, expiry `:309`, location `:313`, estimate-override `:338`) + `summaryKey` gating + `managerPendingChangeCount` (`:433`) as **one typed reducer/hook**. Replaces ~150 lines of smeared `useState` (PROB-12/RC-09). | PROB-12 |
| `src/lib/publication/use-publication-sync.ts` | `usePublicationSync({ projectId, summary })` → `{ effectiveStatus, refetch, isStale }` | Client-side convergence (RC-07): explicit `invalidate+await`/refetch on action success, **client-side expiry countdown** re-deriving `effectiveStatus` from `expiresAt`, recipient reload keyed on rotate-generation. Replaces the static-prop reads. | PROB-09/11/23/24 |
| `src/lib/publication/use-publication-busy.ts` | `usePublicationBusy()` → `{ isBusy, runExclusive }` | One unified in-flight boundary (RC-08) wrapping `useTransition` + `confirmInFlightRef` + recipient `isSending`/`resendingRecipientId` so publication lifecycle + recipient CRUD can't interleave destructively. `runExclusive(fn)` rejects a second concurrent fn. | PROB-10/22 |
| `src/components/ui/section-label.tsx` | `<SectionLabel icon? trailing?>` | The single section-header primitive (11px/600/secondary, sentence case, `border-t` divider). Replaces 16 hand-typed eyebrows. | PROB-32 |
| `src/components/workshop/publication/LinkPanel.tsx` | `<LinkPanel {summary, effectiveStatus, copiedAt, onCopy, onOpen} />` | Dominant published block: URL at 15px + Copy/Open + status/password pills. From inline `:836-885`. | PROB-03/17 |
| `src/components/workshop/publication/GeneratePanel.tsx` | `<GeneratePanel {sheets, selectedIds, onSelect, onGenerate, isPending} />` | First-publish focal block (headline + receiver copy + inline `SheetPickerList` + dominant Generate). | PROB-01 |
| `src/components/workshop/publication/EstimatesTab.tsx` | `<EstimatesTab …/>` | Estimate picker + C-EST copy. From inline `:887-910`. | PROB-17 |
| `src/components/workshop/publication/AccessTab.tsx` | `<AccessTab …/>` | Password + expiry + location (the "Access & privacy" disclosure). From inline `:912-1037`. | PROB-17 |
| `src/components/workshop/publication/SharedLinkModalTabs.tsx` | `<SharedLinkModalTabs {tabs, activeTab, onTabChange} />` | Modal-appropriate active affordance (2px ink underline, not file-folder grey). **QA C-A-03:** `WorkshopTreeTabs` is a re-export of **`TabStrip`** (`workshop-tree.tsx:270` → `src/components/ui/tab-strip.tsx`) — fork/variant target is `TabStrip`/its file, not the alias. **Preserves the correct ARIA tablist contract.** | PROB-28 |
| `src/components/workshop/publication/DestructiveActionConfirm.tsx` | `<DestructiveActionConfirm {action, onConfirm, onCancel} />` | Extract the 2nd `<Modal>` (`:1194-1229`) + `readDestructivePublicationActionCopy` (`:234-270`) + `runConfirmedDestructiveAction` (`:561-622`). `alertdialog` role, Cancel `initialFocus`. | PROB-16 |
| `src/components/workshop/publication/SheetPickerList.tsx` | (move from `ProjectPublicationHeader.tsx:1234-1329`) | Co-located picker → own file (sibling to `RecipientEmailComposer`). Behavior unchanged. | PROB-32 |
| `src/components/workshop/publication/PublicationSuccessRouter.tsx` (or a util) | `successGuidance(action, result)` → `{ copy, nextTab, focusTarget }` | The per-action guided-next-step router (doc 06 §5). Branches on `result.clientLinkPath` + action label. | PROB-06/19 |

### 1b. MODIFIED files

| File | Change | Resolves |
|------|--------|----------|
| `src/components/workshop/ProjectPublicationHeader.tsx` | **Slim to orchestrator:** import the hook + tab components + confirm; render `<Modal>` using **`footer`** (action bar) + **`location`** (status) slots; remove inlined tab JSX, the inlined confirm, the smeared drafts, the co-located picker, the reconcile helpers, the 5-col `<dl>`, the grey-sidebar duplication. Target < ~400 lines. | PROB-01/04/12/14/15/17/18/20 |
| `src/components/ui/overlays/modal.tsx` | (1) **Open-stack array + z-by-open-order** (QA FZ-1: Modals portal as siblings, not ancestors) — a module-level `openStack: HTMLElement[]`; push the `[data-archestimator-modal-root]` on open + `zIndex: 1000+stack.length`; pop on close + re-derive topmost z (`:99`/`:98`). (2) `initialFocus` passthrough **already exists** (`:37/82`) — no change. (3) `location` strip `text-tertiary→text-secondary` (`:140`). | PROB-05/26, PROB-02 |
| `src/components/ui/overlays/dialog.tsx` | (1) `inert` **every other open `[data-archestimator-modal-root]` except the topmost** on child open (`:117` extends; QA FZ-1 — flat-set, not ancestor-walk); (2) `data-dialog-initial-focus` **already honored** (`:211`); (3) `DialogDescription text-tertiary→text-secondary` (`:289`); (4) `DialogTitle 11→13px` (`:279`); (5) z derived from the open-stack (not a hardcoded `z-[1001]` at `:256`). | PROB-05/26, PROB-02/03 |
| `src/components/ui/overlays/confirm-dialog.tsx` | **Reuse-first (QA FZ-2):** the existing `ConfirmDialog` primitive already puts `autoFocus={!destructive}` on Cancel and is consumed by 4 components. **Migrate the header's hand-rolled destructive `<Modal>` to `ConfirmDialog`** (lowest-risk path for PROB-26) rather than building bespoke. If a bespoke confirm is unavoidable, copy its Cancel-autoFocus / `data-dialog-initial-focus` pattern. | PROB-16/26 |
| `src/components/ui/control-input.tsx` | The **`ControlField` ARIA contract** (doc 05 A3): `useId`→`htmlFor`/`id`, `aria-describedby` (helper/error), `aria-invalid`, `role="alert"` on error; label/helper `text-tertiary→text-secondary` + 9→10px (`:77/:85`); `ControlInput base !text-[10px]→!text-[12px]` (`:20`). | PROB-21, PROB-02/29 |
| `src/components/workshop/publication/RecipientEmailComposer.tsx` | Copy rewrites (C-RECIPIENTS-INTRO/EMPTY, doc 06); `text-tertiary→text-secondary` + 8→10px (`:336-337/:363`); route through `usePublicationBusy` so add/resend can't race a rotate; keep its local `role=alert/status` (`:480`). | PROB-08/10/22, PROB-02/29 |
| `src/components/share/SharedLinkActivityFeed.tsx` | (Minor) badge `text-[8px]→9-10px` + AA color (`:150/:175`). | PROB-29 |
| `src/lib/publication/actions.ts` | **None** (planning-only; FIXED contract). The success messages (`:587/667/726/745`) are consumed by `PublicationSuccessRouter` client-side — no RPC change. (A future follow-up may add a typed `lastActionKind` to the result, flagged in doc 08.) | — |

## 2. State/data contract — the extracted draft machine (RC-09)

> **Scope note (QA SCOPE-3):** this is a **move, not a redesign.** The 4 existing draft `useState`s (`:303-345`) are already individually correct (each is `summaryKey`-keyed + reset-on-success at `:534-546`). `usePublicationDrafts` **groups** them + their setters + the existing `xDirty` derivation + `managerPendingChangeCount` (`:433`) into one hook file so the god component shrinks and the dirty/reset invariants become unit-testable. Do **not** design a new typed-reducer API beyond what the existing code already does — if implementation reveals an actual draft-invariant bug, redesign then. (Matches Phase 3's "behavior-preserving" contract.)

`usePublicationDrafts({ summary })` returns the existing logic, grouped:

```ts
type PublicationDrafts = {
  password: { value: string; requirePassword: boolean };
  expiry: string | null;                 // datetime-local string or null
  locationVisibility: "exact" | "locality" | "hidden";
  selectedEstimateIds: string[];
};
type DraftsApi = {
  drafts: PublicationDrafts;
  hasDraft: boolean;                      // any field diverges from summary
  dirty: { password: boolean; expiry: boolean; location: boolean; estimates: boolean };
  pendingCount: number;                   // replaces managerPendingChangeCount (:433)
  setPassword(value: string, require: boolean): void;
  setExpiry(value: string | null): void;
  setLocation(v: PublicationDrafts["locationVisibility"]): void;
  setEstimates(ids: string[]): void;
  resetAll(): void;                       // runPublicationAction success path (:534-546)
  // all setters internally key on summaryKey so drafts clear when summary swaps
};
```

**Invariants enforced by types, not comments** (today enforced only by `AC-MOD` annotations): `pendingCount === count(dirty)`, `resetAll` fires only on action success, drafts clear on `summaryKey` change. This is the seam that makes PROB-18 (Update→clear-password intercept) fixable cleanly: the AccessTab surfaces a distinct "Remove password" intent rather than overloading Update.

## 3. The client-sync + busy contracts (RC-07/08)

- `usePublicationSync`: on every action success, call `router.invalidate()` (or `queryClient.invalidateQueries`) + `await` before clearing `localResult`; a `useEffect` timer re-derives `effectiveStatus` from `expiresAt` every 60s (and on focus) so an expired link flips state without a refetch; recipients refetch when `snapshotVersion`/rotate-generation changes. **Preserves the optimistic signature-gating** (it now lives in `optimistic.ts`) — sync is additive.
- `usePublicationBusy`: a single ref-guarded `runExclusive(fn)` — publication lifecycle (generate/republish/rotate/regenerate/revoke/reactivate) and recipient add/resend all go through it, so a recipient-add can't race a rotate (PROB-10). `confirmInFlightRef` (`:318`) is absorbed. Per-section status regions (not one shared `actionFeedback` sink) so recipient + publication results can't clobber each other (PROB-22).

## 4. What does NOT change (preserve contract)

The FIXED server contract, the optimistic signature-gating logic, the dual action-feedback live regions, the focus-restore/Tab-trap mechanics, the `confirmInFlightRef` guard semantics, the dirty-draft *tracking pattern*, the destructive-confirm *copy*, the TabStrip ARIA, the server-side RBAC + optimistic-concurrency guards, AC-MOD-18 curation preservation. (See `02-PROBLEM-REGISTER.md` §F.) Any refactor that regresses these is out of scope.

## 5. Resolves
`PROB-01` (GeneratePanel), `PROB-12` (extraction), `PROB-16` (DestructiveActionConfirm), `PROB-17` (tab components), `PROB-21` (ControlField contract), `PROB-31` (optimistic.ts move), `PROB-32` (SheetPickerList move + SectionLabel), `PROB-09/11/23/24` (sync), `PROB-10/22` (busy). RC-07/08/09/11. (Phasing + sequencing → doc 08; verification → doc 09; blast radius → doc 10.)
