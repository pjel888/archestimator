# Final Readiness Review

## Verdict

Status: IMPLEMENTATION-READY (conservative track)

Verification mode: independent verifier recorded in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` and `20_FINAL_AUDIT_SCORECARD_AND_VERIFICATION.md`.

Confidence: high for conservative planning handoff; medium for final Project-source data richness until the selector/unavailable state is implemented and tested.

## Why This Is Ready

- The source route and component seams are identified.
- The user's desired workspace direction is preserved without copying estimate-only IA.
- The main UX premise has been corrected where it was risky.
- The hard blocker for `Library + Project only` is isolated: hardcoded right-dock tabs plus stored preference restoration.
- The Project tab decision is resolved: visible in v1 with selector/unavailable state before scoped data loads.
- The verification plan is targeted and proportional.
- No source files or provider state were changed in this planning pass.

## Readiness Score

Planning readiness: 98/100 with independent verifier evidence recorded for the planning package.

Reasons it is not 100:

- No implemented UI exists yet for visual QA.
- Browser proof was intentionally skipped by policy.
- Project-source data richness remains implementation-dependent; the v1 selector/unavailable behavior is decided.
- Full estimate-editor parity still requires future decisions about conflict/transaction semantics if implementation moves full editing into the browse route.

## Implementation Gate Checklist

- [ ] Phase 0 characterization tests written and passing/failing as intended.
- [ ] `EstimateRightSidebar` supports visible tab clamping.
- [ ] Estimate route still renders its current three-tab dock.
- [ ] Template-focused routes render no `Templates` dock tab.
- [ ] Stored prefs cannot restore hidden tabs.
- [ ] Template editor has explicit `canEditTemplate` UI capability.
- [ ] Project tab is visible, truthfully scoped, and never fetches unauthorized project data.
- [ ] Targeted Vitest matrix passes.
- [ ] Typecheck passes.
- [ ] Scoped ESLint passes.
- [ ] `git diff --check` passes.
- [ ] Browser proof is either run for a browser-only claim or explicitly skipped with rationale.

## Remaining Risk

Major remaining risks to watch during implementation:

- `Project` tab scope can drift into misleading project-component behavior instead of reusable estimate-source composition.
- Stored/account preferences can resurrect the hidden `Templates` tab if every active-tab boundary is not clamped.
- Viewer UI can expose mutation affordances even though server actions deny writes.
- Mobile can regress into a squeezed three-pane workspace if the v1 single-column/desktop-required fallback is not followed.
- Over-implementing the browse route into a full editor remains out of scope until permission, conflict, mobile, history, and transaction semantics are funded.

The plan is implementation-ready because each risk has an explicit contract and proof row, not because the risks are already removed in code.
