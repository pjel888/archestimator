# 09 — VERIFICATION & QA PLAN · Shared-Link Modal

**Planning-only.** Defines the evidence each phase must produce before it's "done," proportional to risk (`AGENT_OPERATING_PROTOCOL.md` VALIDATION_MATRIX). Verification is real-surface (run the app, keyboard-walk it, screenshot-diff it, run axe) — never a worker self-report or a single green check. The adversarial QA pass (Phase E of this pack) runs against the *plan docs*, not code; the code-QA lives here.

---

## 1. Per-phase verification gates (must-pass before next phase)

| Phase | Automated | Manual / real-surface | A11y | Owner signal |
|-------|-----------|------------------------|------|--------------|
| **0 Contrast+tokens+SectionLabel** | `bun run test:dom`; `bunx vitest` unit on `SectionLabel` | screenshot diff of this modal + 2 other modals (DialogDescription swap is app-wide) | **axe-core** on the modal — zero color-contrast violations | — |
| **1 Motion** | reduced-motion unit (assert no transition class applied when `prefers-reduced-motion`) | DevTools reduced-motion toggle: instant/static equivalents; copy announces via `aria-live` | keyboard copy still announced | — |
| **2 Primitive a11y** | RTL test: nested confirm Tab does **not** reach parent buttons; ControlField error test asserts `aria-invalid`+`aria-describedby`+`role=alert` | keyboard-only rotate/revoke confirm (Tab stays in confirm; focus starts on **Cancel**; Esc closes only confirm) | axe-core on a field-with-error | **`/codex:review`** (shared primitive) |
| **3 Extract god component** | full suite green (`bun test`, `bun run test:dom`) with **no behavioral diff** | screenshot diff = **no visible change** | — | `/codex:review` (large diff) |
| **4 Sync + busy** | Vitest with **simulated latency** (delayed revalidation) → `effectiveStatus` flips to expired client-side; rotate+recipient-add race test passes | manual: rotate while a recipient add is mid-flight → add is rejected/queued, no dead-on-arrival link | — | `/codex:review` (data-integrity) |
| **5 UX redesign** | RTL flow tests (first-publish, draft→update, rotate continuation, revoke banner, expired) | full flow walkthrough; responsive at **360 / 640 / 1024 / 1440**; screenshot diffs vs Phase-0 baseline | axe-core full pass; keyboard-only full flow | **Philip: A/B sidebar decision**; `/codex:review` |
| **6 Polish + preserve audit** | full suite | preserve-list checklist re-checked | — | — |

## 2. Manual flow matrix (the journeys that must work end-to-end)

Each must work by **keyboard alone** and by **mouse**, with `prefers-reduced-motion` both on and off.

1. **First-publish (the P0):** unpublished project → open modal → picker defaulted → Generate → link appears pre-selected → Copy announces "Link copied." (≤4 steps, no tab switch).
2. **Draft → Update:** published → edit estimates + password + expiry + location → "N pending changes" summary → Update → guided "recipients keep the same link" confirmation.
3. **Rotate (guided continuation):** published → New link → confirm (focus on Cancel) → confirm → auto-nav to link → clay ring → focus+select → Copy pulse → aria-live "copy and re-send."
4. **Regenerate:** expired → Create new link → confirm → "every previous link/bookmark broken" success.
5. **Revoke:** published → Turn off → confirm → **revoked banner** ("clients can no longer open… Generate to share again").
6. **Reactivate:** expired → Reactivate → "same URL + password, expiry cleared."
7. **Clear password (PROB-18):** published+password → "Remove password" intent → confirm (access-widening copy) → success.
8. **Recipient add/resend/remove** (incl. the rotate-race guard + confirm-to-remove for "responded").
9. **Edge:** no-publication empty state (right-sized, no cavern); 0-estimates ("blank page" copy); stale-snapshot band (slow pulse + receiver copy).
10. **Expiry countdown:** set expiry in ~1 min → wait → `effectiveStatus` flips to expired client-side without a refetch.

## 3. Accessibility verification (WCAG 2.2 AA)

- **axe-core** clean on all modal states (published, first-publish, expired, revoked, drafting, error).
- **Contrast:** every load-bearing text ≥4.5:1 (large ≥3:1). No `text-tertiary` on load-bearing text remains.
- **Keyboard:** full operability per the map in `05-A11Y-AND-INTERACTION.md` A2; focus visible at all times; no keyboard trap except the intentional modal/confirm traps.
- **Screen reader:** NVDA/VoiceOver pass — link field announced once (no duplicate name), tab change announces the new panel, action feedback announced, errors announced via `role=alert`.
- **Reduced motion:** all states usable with zero motion; no animation is the sole carrier of meaning.

## 4. Visual / responsive verification

- Screenshot baseline established at Phase 0; each phase diffs against it. Phase 3 = no diff; Phase 5 = intended diff.
- Breakpoints: 360 (mobile), 640 (sm), 1024 (lg sidebar collapse), 1440 (desktop). URL field never truncates; footer wraps; radio grid reflows.
- DESIGN.md token check: radii only 3/8/12; no `proposalPaper` on the modal; brand clay `#AA412A` only as accent.

## 5. Regression / preserve-list audit (every phase)

Re-verify the preserve list (`02-PROBLEM-REGISTER.md` §F) is intact: optimistic reconcile still auto-expires; dual live regions still present; `confirmInFlightRef` semantics; destructive-confirm copy unchanged; TabStrip ARIA; server guards untouched; AC-MOD-18 curation preserved. Any regression blocks the phase.

## 6. Adversarial QA of THIS PLAN (Phase E of the pack)

Before implementation begins, the plan docs themselves get a parallel adversarial review (coherence, feasibility/design-lens, a11y, scope-guard, code-anchoring) — recorded in `11-ADVERSARIAL-QA-LEDGER.md`. The plan is "verified" when that ledger is green or residuals are honestly recorded. This separates *plan quality* (now) from *implementation quality* (per-phase gates above, later).

## 7. Definition of done (whole redesign)

All phase gates green; the 10 manual journeys pass by keyboard + mouse, reduced-motion on/off; axe clean; preserve list intact; Philip has ruled on the A/B sidebar; the two P0s (PROB-01, PROB-02) are demonstrably fixed in a running build.
