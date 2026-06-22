# 10 — BLAST RADIUS & ROLLBACK · Shared-Link Modal

**Planning-only.** Maps what each phase touches, who else is affected, the risk rank, and how to undo it. The headline risk: **Phases 0 and 2 touch shared modal primitives used by every dialog in the app** — that is the real blast radius, not the publication modal itself.

---

## 1. Blast-radius map

| Surface | Touched in phase | Also used by | Risk | Notes |
|---------|------------------|--------------|------|-------|
| `ui/overlays/dialog.tsx` | 0 (DialogDescription/Title tokens), 2 (inert+z+initialFocus) | **EVERY modal in the app** | 🔴 HIGH | The highest-leverage file. Phase 0's `text-tertiary→text-secondary` on `DialogDescription` changes every modal's subtitle. Phase 2's stacking/inert changes every nested-confirm. Both must be verified app-wide, not just on this modal. |
| `ui/overlays/modal.tsx` | 0 (location token), 2 (depth counter + zIndex + initialFocus passthrough) | **EVERY `AppModal`/`Modal`/`BlurModal` consumer** | 🔴 HIGH | Depth counter is additive (defaults to depth 0 = today), so the z change is low-risk *if* the default path is byte-identical when no nesting. |
| `ui/control-input.tsx` | 0 (label/helper tokens + ControlInput base size), 2 (ControlField ARIA contract) | **Every `ControlField`/`ControlInput` consumer** | 🟠 MED-HIGH | The ARIA-contract change (htmlFor/id/aria-describedby/aria-invalid/role=alert) is behavior-changing for screen readers — verify no duplicate-name or broken-association regressions across all form fields. |
| `ProjectPublicationHeader.tsx` | 0,1,2,3,4,5 | This modal + the workshop chrome header that mounts it | 🟠 MED | Slims from 1329 → ~400 lines (Phase 3). Pure-refactor in Phase 3 (no diff), visible change in Phase 5. |
| `publication/RecipientEmailComposer.tsx` | 0,2,4,5 | The Recipients tab | 🟡 LOW-MED | Copy + tokens + busy-wiring. Leaf component — contained. |
| `share/SharedLinkActivityFeed.tsx` | 0 | The Activity tab (+ receiver page? verify) | 🟢 LOW | Badge size/color only. |
| `lib/publication/actions.ts` | **NONE** (FIXED contract) | All publication surfaces | — | Planning-only: no RPC/signature change. The success messages are consumed client-side. |
| New files (`lib/publication/*`, `publication/*`, `section-label.tsx`) | 3,4,5 | New — this modal only | 🟢 LOW | Additive; no existing consumer until wired. |

**Receiver-side note:** `src/components/share/ShareContainer.tsx` + the receiver page are **out of scope** (doc 00 §3) — read for impact only, not modified. The only cross-surface risk is if a Phase-4 sync change alters what `refreshProjectPublicationSummary` returns to the receiver's data path — it does not (the RPC is unchanged; sync is client-side convergence of the *modal's* view).

## 2. Risk-ranked phases

| Phase | Risk | Why | Mitigation |
|-------|------|-----|-----------|
| 0 Contrast+tokens+SectionLabel | 🟢 LOW (app-wide *visibility* of the token swap is the only surprise) | Mechanical; the DialogDescription swap is the only app-wide effect | Screenshot-diff ≥2 other modals; axe app-wide |
| 1 Motion | 🟢 LOW | Additive CSS + state | Reduced-motion toggle test |
| 2 Primitive a11y | 🔴 HIGH | `dialog.tsx`/`modal.tsx`/`control-input.tsx` are shared; inert+z+ControlField-contract are behavior changes | Depth-counter defaults to today; ControlField behind existing call sites; **`/codex:review`**; nested-confirm regression test |
| 3 Extract | 🟠 MED (large diff, **zero intended behavior change**) | Big move but pure refactor | One-extraction-per-commit; full suite + screenshot diff = no change |
| 4 Sync+busy | 🟠 MED-HIGH | Changes convergence + in-flight coordination (data-integrity) | Latency-sim test; race test; `/codex:review` |
| 5 UX redesign | 🟠 MED (visible, but low-coupling post-Phase-3) | The P0 first-publish + IA change | Full flow matrix; Philip A/B; `/codex:review` |

## 3. Rollback story (per phase)

Every phase is independently revertible; the design favors additive-first so rollback = delete-the-addition.

- **Phase 0:** revert the commit. No state/data change. (SectionLabel sweep is a separate commit from the token swaps.)
- **Phase 1:** remove the CSS block + `isPending`/`copiedAt`/`lastSuccessAt` state. Motion is purely additive.
- **Phase 2:** the depth-counter is additive (depth 0 ≡ today); revert leaves every modal at z-[1000] again. The ControlField contract revert is the one to verify carefully (re-check associations). `data-dialog-initial-focus` markers are additive.
- **Phase 3:** each extraction is a separate commit — revert the failing one; the rest stand.
- **Phase 4:** revert to static-prop reads + the three split in-flight mechanisms. Behavior returns to today's (stale-under-latency) state — **no data loss**, no migration.
- **Phase 5:** revert to the Phase-3 orchestrator (today's IA). The extracted components still render under the old layout.
- **Phase 6:** polish; revert trivially.

**Whole-redesign rollback:** since no RPC/migration/data change occurs, full rollback = revert the branch. No DB repair, no backfill, no Supabase state. This is why the redesign is **not** high-blast-radius in the data sense — the blast is confined to shared *UI primitives*, which is managed by Phase 0/2 verification.

## 4. Branch & sequencing strategy (recommendation for implementation, not now)

- Feature branch (e.g. `feat/shared-link-modal-redesign`), **not** `main`.
- Land Phase 0 + Phase 1 first as low-risk PRs (fast review).
- Phase 2 as its own PR with the `/codex:review` gate + app-wide modal smoke test.
- Phases 3 → 4 → 5 as a sequence; Phase 3 must merge before 5 (5 builds on 3's components).
- Consider a runtime feature flag for Phase 5 (the visible IA change) if a staged rollout is wanted — but it's optional given the zero-data-risk profile.

## 5. What could go wrong (pre-registered risks)

1. **DialogDescription token swap degrades another modal's intended look** — a modal that *wanted* tertiary contrast now gets secondary. Mitigation: screenshot-diff sweep; the swap is AA-correct everywhere so visual-only regressions are acceptable trade-offs, but surface them to Philip.
2. **ControlField ARIA contract breaks an existing field's association** (e.g. a field relying on the nesting-only behavior with a custom wrapper). Mitigation: the contract still supports `as="div"` via `aria-labelledby`; audit `ControlField` call sites.
3. **Depth-counter z-fight** with a non-`AppModal` overlay (tooltips, popovers) that hardcodes a z value. Mitigation: the modal z stays ≥1000; verify popovers/toasts (which should be higher in the z scale) still stack above.
4. **Client-side expiry countdown drift** vs server truth under clock skew. Mitigation: the countdown only *flips the UI state*; the server remains authoritative on the next refetch; reconcile still auto-expires.
5. **Busy-boundary deadlock** — `runExclusive` rejecting a legitimate concurrent action (e.g. viewing activity while publishing). Mitigation: scope `runExclusive` to mutating lifecycle/recipient actions only; reads (activity feed, copy) are not exclusive.

## 6. Not in scope (explicit)

No receiver-page redesign; no `actions.ts`/RPC/migration change; no other modal redesign (though they benefit from Phase 0/2); no DB/RLS/auth change. These are flagged as follow-ups, not part of this plan's blast radius.
