# 02 — PROBLEM REGISTER · Shared-Link Modal

Prioritized, code-anchored problem register distilled from the Phase A 6-dimension audit + synthesis. Severity: **P0** broken/AA-fail/unusable · **P1** major friction or a11y/data-integrity failure · **P2** polish/clarity/surprise · **P3** nice-to-have. Every entry maps to a root cause (RC-*) and states a one-line target direction.

**Counts:** P0 ×2 · P1 ×13 · P2 ×13 · P3 ×4 (= 32 defined). (Line anchors are point-in-time as of 2026-06-22; under active commits lines drift — grep the **symbol name**, don't line-jump.)

---

## A. Root causes (fix these and most symptoms retire)

| ID | Root cause | Affected |
|----|-----------|----------|
| **RC-01** | Modal is organized around the **server-action lifecycle**, not the user's job-to-be-done ("share this estimate with a client"). Link tab is the landing tab because that's where lifecycle state lives, not where sharing starts. | PROB-01 |
| **RC-02** | A single overloaded **"Update/Generate"** button carries four independent concerns (estimates, password, expiry, location) through **one full-snapshot republish**. No lightweight settings-save path; every change is priced as a full republish; a draft toggle can intercept the whole click as a different destructive action. | PROB-04, PROB-18 |
| **RC-03** | Success feedback is a **terminal one-line status with no flow continuation**. Rotation/regenerate (mint→copy→redistribute) and revoke/reactivate get a neutral toast and a dead-end; no pending affordance during in-flight republish; no "what now" row after revoke. | PROB-06, PROB-19, PROB-25 |
| **RC-04** | **No typographic scale system** + a tertiary-token default that fails AA. Title ~11px / headers 9px / body 10px / meta 8-9px — only ~3px separates most from least important; `ControlField`/`DialogDescription` default to `text-tertiary` (`#7F7F7F`, <4.5:1). Project memory already sanctions `#5D5D5D`. | PROB-02, PROB-03, PROB-29 |
| **RC-05** | The **`Modal` primitive has no concept of nested/stacked modals**. All `AppModal` instances render at fixed `z-[1000]`; `inert` is applied to page shells, not ancestor modal content. Destructive + recipient-remove/resend confirms inherit the parent's focus trap, keep parent buttons Tab-reachable, share one scrim; no per-instance `initialFocus` override for alertdialogs (defaults to X-close). | PROB-05, PROB-16, PROB-26 |
| **RC-06** | **Copy is written from the sender's data model, not the receiver's experience.** Every control describes status/drafts/dirty flags, not what the client will see or do. Consequence copy exists only in destructive confirms + the receiver page — not in day-to-day toggles, the sidebar warning, or expiry. | PROB-07, PROB-08, PROB-27, PROB-30 |
| **RC-07** | **No client-side refetch/re-derivation of *lifecycle/status* fields after an action.** (Nuance — verified: the modal *does* refetch **activity/metadata** on open + tab-change via `refreshProjectPublicationSummary` at `:458-488`, scoped to `openCount/latestOpenedAt/latestActivityAt/latestRecipientOpen` — see the `:295-297` comment. What's missing: no refetch of **status/`clientLinkPath`/lifecycle** after an action succeeds, no client-side expiry countdown re-deriving `effectiveStatus`, no recipient reload on token rotation. So sync of *lifecycle* fields depends on RSC revalidation timing — breaks under documented network latency.) | PROB-09, PROB-11, PROB-23, PROB-24 |
| **RC-08** | **In-flight coordination is split across three mechanisms that don't talk**: `useTransition(isPending)`, `confirmInFlightRef`, and per-component `useState` in Recipient/Activity. None gates the others → concurrent rotate+recipient-add or revoke+open is unguarded client-side; shared feedback box can be overwritten. | PROB-10, PROB-22 |
| **RC-09** | **No extraction boundary** between the publication state machine and the modal presentation. One 1329-line component absorbed every tab (as literal JSX), the destructive confirm, `SheetPickerList`, and the domain reconcile helpers. Boundary was drawn only at Recipients/Activity. | PROB-12, PROB-17, PROB-31, PROB-32 |
| **RC-10** | The modal **reuses chrome tokens/tabs without a modal-specific surface contract**: grey sidebar + white tabpanel + bordered tiles + side-striped metrics + file-folder tabs — individually token-correct, collectively a nested-surface pile with duplicated facts. **Density chosen over hierarchy** (everything shrunk to 8-10px instead of promoting the link). | PROB-13, PROB-14, PROB-15, PROB-20, PROB-28 |
| **RC-11** | **`ControlField` couples label and input only by DOM nesting**, no error/aria contract (no `htmlFor`/`id`; `aria-label` overrides create duplicate names; no `aria-invalid`/`aria-describedby`; `helperText` has no id). | PROB-21 |

---

## B. Problem register

### P0 — broken / AA-fail / unusable

| ID | Title | Dimensions | Evidence | Impact | RC | Target direction |
|----|-------|-----------|----------|--------|----|------------------|
| **PROB-01** | First-publish landing flow is the modal's slowest path — the headline job opens to an unusable empty link field with Generate buried | UX Flows, Receiver | `ProjectPublicationHeader.tsx:845` (empty read-only link) + `:1109` (Generate in pinned footer, disabled until estimates selected on a *different* tab) | First-time users can't find how to share; the modal fails its reason for existing | RC-01 | Make publish-to-client one path: combine link generation + estimate selection (+ optional recipients) on the landing view with a single dominant Generate as the focal point |
| **PROB-02** | WCAG-AA contrast failure — load-bearing text uses `#7F7F7F` (~4.48:1 < 4.5:1) | A11y, Visual | `control-input.tsx:77,85` (ControlField label/helper default `text-tertiary`); `dialog.tsx:289` (DialogDescription); `RecipientEmailComposer.tsx:336-337` | Field labels, modal subtitle, helper text, recipient instructions are below AA for low-vision users; project memory already sanctions the fix | RC-04 | Replace `text-tertiary` with `text-secondary` (`#5D5D5D`) for all load-bearing labels/helper/subtitle/instructions |

### P1 — major friction / a11y / data-integrity

| ID | Title | Dimensions | Evidence | RC | Target direction |
|----|-------|-----------|----------|----|------------------|
| **PROB-03** | No typographic hierarchy — link URL does not dominate; ~3px span across title→meta | Visual | `:689-770` 9-10px throughout; link field at `:845` is same weight as metadata | RC-04 | Establish a scale: link URL + status dominant (~14-16px), clear title, demote ancillary meta |
| **PROB-04** | One overloaded "Update" button conflates settings-save with full-snapshot republish across 4 concerns | UX Flows, Data | `:1109-1144` single CTA → `republishProjectPublication` (`:1122`); semantics silently flip | RC-02 | Separate lightweight settings-save from snapshot-rebuild, or make the bundling explicit and reversible |
| **PROB-05** | Nested-modal focus/stacking bug — destructive + recipient confirms inherit parent focus trap; Tab escapes into parent's destructive buttons; shared scrim | A11y | `modal.tsx:99` fixed `z-[1000]`; `dialog.tsx` `inert` on app shells only (not ancestor modal) | RC-05 | Give `AppModal` a stacking/z API + `inert` ancestor modal content when a child is open |
| **PROB-06** | Success is a terminal one-line toast with no guided next step (esp. rotate: all client links just died) | UX Flows | `:1173-1189` actionFeedback; rotate/revoke land on same tab | RC-03 | After rotate/regenerate → navigate to Link tab, new link pre-selected + Copy, prompt re-send; revoked-state row |
| **PROB-07** | Copy describes sender data model, not receiver consequence (location/password/estimates/stale) | Copy, Receiver | `:964` location copy; `:926` password copy; `:887` estimates copy | RC-06 | Rewrite to name the client consequence (see doc 06) |
| **PROB-08** | (Folded into PROB-07 — same root, copy dimension) | Copy | — | RC-06 | — |
| **PROB-09** | No client refetch → stale "published" status after the link has actually expired | Data | no explicit refetch after success; `effectiveStatus` reads static prop | RC-07 | Refetch/invalidate+await on success; client-side expiry countdown re-deriving `effectiveStatus` |
| **PROB-10** | Rotate/revoke racing recipient add/resend is unguarded client-side → dead-on-arrival recipient link | Data | server rotate guard (`expected_encrypted_token`) doesn't cover recipient-add path; recipient insert references old `publicationId` | RC-08 | Unify behind one `isBusy` boundary OR token-staleness check on recipient add |
| **PROB-11** | Stale recipient delivery status after rotate (chip shows green, link is dead) | Data | recipients not reloaded on token rotation | RC-07 | Reload recipients keyed on `snapshotVersion`/rotate-generation |
| **PROB-12** | God component — 1329-line single function doing ~7 jobs, ~4 hand-reconciled draft machines | Code Structure | `:284-1232`; 12 `useState`; drafts smeared across ~150 lines | RC-09 | Extract `usePublicationDrafts()` hook + tab components + `<DestructiveActionConfirm/>`; highest-leverage enabling fix |
| **PROB-13** | Grey `bg-surfaceMuted` sidebar = nested surface inside the Paper modal | Visual | `:686`; DESIGN.md contract = one Paper surface | RC-10 | **Owner design decision** (DESIGN.md alpha): commit to flat white vs muted content area — defer to Philip |
| **PROB-23** | Stale `snapshotVersion` after republish — the displayed version reads the static summary prop and lags until RSC revalidation lands | Data | `snapshotVersion` rendered from the static `summary` prop (`:692`); no client re-derive on republish success | RC-07 | Re-derive/refetch `snapshotVersion` on republish success (see doc 07 `usePublicationSync`) |
| **PROB-24** | Stale stale-snapshot warning after republish — the "N days behind" amber band (`:694`) persists after the owner presses Update until revalidation lands | Data | `summary.staleSnapshotWarning` from the static prop (`:694-698`) | RC-07 | Clear/recompute the warning on republish success (see doc 07 `usePublicationSync`) |

### P2 — polish / clarity / surprise

| ID | Title | Dimensions | Evidence | RC | Target direction |
|----|-------|-----------|----------|----|------------------|
| **PROB-14** | Density/duplication — facts triplicated (sidebar + overview `<dl>` + tab); 16 uppercase eyebrows | Visual | `:689-767`; `:749` 5-col `<dl>` duplicates sidebar | RC-10 | Single source of truth per fact; one SectionLabel primitive |
| **PROB-15** | `min-h-[600px]` + `max-w-5xl` shell dwarfs sparse content (empty state in a cavern) | Visual | `:684` | RC-10 | Adaptive height; size to content; empty state right-sized |
| **PROB-16** | Destructive-confirm `<Modal>` inlined in parent, reads 4 pieces of parent state; 4-value union interpreted in 3 places | Code Structure | `:1194-1229`; `readDestructivePublicationActionCopy` + dispatcher + variant switch | RC-09 | Extract `<DestructiveActionConfirm action onConfirm/>` |
| **PROB-17** | Tab bodies are inlined JSX, not components — can't be redesigned independently | Code Structure | `:799-1052` stacked `activeTab` conditionals | RC-09 | Extract `<EstimatesTab/>` + `<AccessTab/>` as components composed within the single **Content** tab (Estimates primary, Access as a disclosure); promote the old Link-tab content into the always-visible **`LinkPanel`** header (the Link *tab* is removed — see doc 03 §1/§4) |
| **PROB-18** | Pressing Update while a password is set but draft unchecks "require password" silently intercepts as a different destructive action (clear-password confirm) | UX Flows | `:1118-1121` | RC-02 | Make the intent explicit; don't overload the primary CTA with a destructive branch |
| **PROB-19** | After revoke the modal shows a misleading live state; no "Link is off" guidance | UX Flows | revoke path → neutral toast, same tab | RC-03 | Add a revoked-state "Link is off — generate to share again" row |
| **PROB-20** | Nested-surface pile — bordered form tiles inside bordered tiles inside bordered modal | Visual | `:749-1001` | RC-10 | Flatten to one surface; use spacing/weight not borders for grouping |
| **PROB-21** | `ControlField` has no aria/label contract (nesting-only association; duplicate names; no `aria-invalid`/`aria-describedby`) | A11y | `control-input.tsx` | RC-11 | Add `htmlFor`/`id` pairing, `aria-describedby` for helper/error, `aria-invalid` |
| **PROB-22** | Shared feedback box can be overwritten by whichever flow finishes last (recipient vs publication) | Data | single `actionFeedback` state | RC-08 | Per-section status regions; don't share one feedback sink |
| **PROB-25** | No pending label/spinner on the clicked primary during in-flight republish → "did it work?" double-click risk | UX Flows, A11y | `:1109-1144` disabled-all not pending-on-clicked | RC-03 | Pending label/spinner on the clicked primary; disable-only (not all controls) during in-flight |
| **PROB-26** | Destructive confirm `initialFocus` lands on X-close, not the least-destructive Cancel | A11y | `modal.tsx:82` default `initialFocus="first"` → `DialogCloseButton` | RC-05 | Mark Cancel with `data-dialog-initial-focus` (or pass override) |
| **PROB-27** | Estimates/password controls never tie to what the client will see | Receiver | `:887-910`, `:926-928`; receiver gate at `page.tsx:140-167` | RC-06 | Add receiver-consequence copy ("Only selected sheets appear on the client page"; "Clients must enter this password and attempts are logged") |
| **PROB-31** | Domain reconcile helpers exported from the view file, not a module | Code Structure | `:160-194` `readPublicationServerSignature`/`shouldUseOptimisticPublicationResult` | RC-09 | Move to `lib/publication/optimistic.ts` or `usePublicationState()` |

### P3 — nice-to-have

| ID | Title | Dimensions | Evidence | RC | Target direction |
|----|-------|-----------|----------|----|------------------|
| **PROB-28** | Tab strip weak active affordance inside white modal (active merges with tabpanel) | Visual | `tab-strip.tsx:51-57` | RC-10 | Modal-appropriate active treatment (underline/subtle fill) distinct from sidebar tone |
| **PROB-29** | 8px status pills/chips below legibility floor | Visual, A11y | `:880` `text-[8px]`; `:744`; `RecipientEmailComposer.tsx:363`; `SharedLinkActivityFeed.tsx:150,175` | RC-04 | Bump to 9-10px with AA-passing color |
| **PROB-30** | Expiry absolute only, no relative framing (inconsistent with Teamspace header) | UX Flows, Receiver | `:728`, `:439`, `:763` `formatDate` vs `ProjectTeamspaceHeader.tsx:88-97` `formatExpiry` | RC-06 | Inherit/share the relative expiry copy ("expires in 3 days") |
| **PROB-32** | `SheetPickerList` co-located in header file; no Eyebrow/SectionLabel primitive (65 `text-[` literals) | Code Structure | `:1234-1329`; ~15 hand-typed eyebrow classNames | RC-09 | Move `SheetPickerList` to own file; introduce SectionLabel primitive |

---

## C. Cross-cutting themes

1. **Lifecycle, not job** — the modal is organized around the server-action lifecycle, not "share this estimate with a client"; the primary intent is the slowest path.
2. **Everything is a full-snapshot republish** — one overloaded button conflates settings-save with snapshot-rebuild and bundles four concerns; every change is high-cost and semantically surprising.
3. **Sync depends on revalidation timing** — no client refetch / expiry countdown / recipient reload → the modal can lie about status under latency.
4. **Sender-data-model copy** — location privacy, password, estimates, stale-snapshot, expiry never name the client consequence.
5. **Density over hierarchy** — near-uniform 8-11px type, 16 repeated uppercase eyebrows, triplicated status → the link does not dominate its own modal.
6. **God component** — 1329 lines, 4 hand-reconciled draft machines, inlined tab/confirm JSX → effectively un-testable and un-redesignable without touching everything.
7. **No stacked-modal concept** — the `Modal` primitive has no nesting/footer-status contract → destructive confirms inherit the parent focus trap; IA re-implemented ad hoc.

---

## D. Top fixes (ranked, highest leverage first)

1. **Fix WCAG-AA contrast** — `#7F7F7F → #5D5D5D` for all load-bearing text in `ControlField`, `DialogDescription`, `RecipientEmailComposer`. *(PROB-02; small, low-risk, mechanical, highest value-to-effort.)*
2. **Redesign first-publish landing** — combine link generation + estimate selection (+ optional recipients) on one view with a single dominant Generate. *(PROB-01, PROB-03, PROB-14, PROB-15; the modal's reason for existing.)*
3. **Typographic scale + `SectionLabel` primitive** — link URL + status dominant (~14-16px); one source of truth for section labels; demote meta. *(PROB-03, PROB-14, PROB-32; removes the AI-slop tell; prerequisite for density cleanup.)*
4. **Client-side sync convergence** — explicit refetch/invalidate+await on success, client-side expiry countdown re-deriving `effectiveStatus`, recipient reload keyed on rotate-generation. *(PROB-09, PROB-11, PROB-23, PROB-24; retires the three highest-severity data bugs.)*
5. **Unify in-flight coordination** — one `isBusy` boundary (or token-staleness check on recipient add) + per-section status regions. *(PROB-10, PROB-22; closes the dead-recipient-link race + feedback-overwrite race.)*
6. **Guided success next-step** — after rotate/regenerate → Link tab + new link pre-selected + Copy + prompt re-send; revoked-state row; pending label/spinner on the clicked primary. *(PROB-06, PROB-19, PROB-25.)*
7. **Extract the god component** — `usePublicationDrafts()` hook/reducer, `<LinkTab/>`/`<EstimatesTab/>`/`<AccessTab/>`, `<DestructiveActionConfirm/>`, move `SheetPickerList` + reconcile helpers to modules, adopt the `Modal` primitive's `footer`/`location` slots. *(PROB-12, PROB-16, PROB-17, PROB-31, PROB-32; highest-leverage enabling change.)*
8. **Fix nested-modal focus/stacking at the primitive** — stacking/z API + `inert` ancestor modal content + Cancel as `initialFocus`. *(PROB-05, PROB-26; resolves it for all nested confirms.)*

---

## E. Conflicts resolved during synthesis

1. **First-publish landing severity** — UX-Flows P1 vs Receiver headline P1 → **promoted to P0 (PROB-01)**: it's the modal's primary-intent failure.
2. **`#7F7F7F` contrast severity** — A11y P1 + Visual P1 → **promoted to P0 (PROB-02)**: a hard, citable AA violation the project already sanctions; not inflated.
3. **God-component severity** — structural P1 with no direct user symptom → **kept P1 (PROB-12)**: highest-leverage *enabling* fix, but not itself user-facing breakage. Top-tier P1 + backbone of topFixes.
4. **Grey sidebar = nested surface** — arguably an owner design call → **kept P1 (PROB-13) but owner-deferred**: it IS a DESIGN.md contract (one Paper surface) and compounds with the nested-tile/duplication cluster, but the resolution is Philip's, not prescriptive.
5. **Rotate/recipient race** — server `expected_encrypted_token` mitigates concurrent rotates → **kept P1 (PROB-10)**: the guard does NOT cover recipient-add racing a rotate (dead-on-arrival link while chip shows green). Real gap.
6. **Update→clear-password intercept** — flow-bug (P1) vs surprise (P2) → **kept P2 (PROB-18)**: surprising and state-leaking but confirm-gated and conditional; not unconditional breakage.
7. **Co-location/eyebrow/helper-export code-org findings** — pure P3/P2, no user impact → **folded into PROB-31 (P2) + PROB-32 (P3)**; rides along with the god-component extraction.

---

## F. Preserve list (do not regress)

- **Optimistic signature-gating reconcile** (`readPublicationServerSignature` + `shouldUseOptimisticPublicationResult`, `:160-194`) — genuinely well-thought-out; auto-expires optimistic result on revalidation. *(Just mis-filed → move to `lib/publication/optimistic.ts`.)*
- **`RecipientEmailComposer` + `SharedLinkActivityFeed`** — correctly extracted self-contained leaves with clean prop contracts. The boundary pattern to replicate.
- **Modal focus management** — initial focus, Tab focus-trap w/ wraparound, focus restore to opener, body scroll-lock + `inert` on app shells. Better than most.
- **TabStrip ARIA** — correct `role=tablist/tab`, `aria-selected`, `aria-controls`/`aria-labelledby`, roving tabindex, full arrow/Home/End; tabpanel correct (`:792`).
- **Dual action feedback** — visible `role=alert/status` (`:1177`) **and** separate `sr-only` live region (`:660`); error tone distinguished from success.
- **Dirty-draft tracking** — per-dimension `xDirty` + "Unsaved — Update to apply" hints (`:893`, `:918`) + `managerPendingChangeCount` (`:433`); correctly `summaryKey`-keyed. The right pattern for a deferred-save surface.
- **Destructive-confirm copy** — unusually precise/honest (rotation re-publishes published estimates + password but **not** unsaved drafts; regenerate steers to "Reactivate"). The bar day-to-day toggles fail.
- **`confirmInFlightRef` double-submit guard** (`:318`, released `finally :556`) — correctly handles `useTransition`'s late `isPending` tick.
- **Recipient data gravity** — persisted recipients require confirm-to-remove (stronger for "responded"); opened/responded require confirm before resend (token rotation); Backspace clears local-only chips.
- **Server-side defense** — `assertProjectPublicationManager` RBAC on every action (`actions.ts:173`); optimistic-concurrency on rotate/resend; send-before-persist; graceful non-fatal email failures.
- **Clean data contract** — `locationVisibility` sanitized once (incl. GPS stripping, `snapshot.ts:103`); `passwordRequired` gates `page.tsx:140`; `selectedEstimateIds` → `snapshot.estimates`; `snapshotVersion` folded into view token. No setting lost or double-applied.
- **Tone + radius discipline** — `variant=danger` for revoke; `text-warning` for dirty/stale; warm amber stale band; no gradient text/neon; radii contract-correct (3/8/12).
- **rotate-vs-regenerate distinction** — correctly designed + surfaced (rotate keeps recipients+password; regenerate breaks all links). Strongest consequence communication in the modal.
- **AC-MOD-18** (`:328`) — picker preserves the last curated estimate selection across revoke/reactivate instead of defaulting to "all"; protects receiver experience.
