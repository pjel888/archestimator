# 013 — Polish Batch (Low / Informational)

> Closes **Low** `UX-EMPTY-002`, **Informational** `UX-EMPTY-003`, **Low** `UX-COPY-001`, **Informational** `UX-MAGIC-002`. Combined: all are small disjoint copy/affordance edits with no shared root cause beyond "polish before paid MVP".

## unit_id
`UNIT-013`

## title
Recipient-empty-state CTA, viewer-zero-state CTA, replace hardcoded 'Philip', echo email on magic-link success.

## status
`READY`

## priority
`P3` — before paid MVP (or defer/kill at founder discretion).

## severity_of_findings
Low + Informational (`UX-EMPTY-002`, `UX-EMPTY-003`, `UX-COPY-001`, `UX-MAGIC-002`)

## effort
Small (~1.5 hours total). Four disjoint small edits.

## implementation_risk
`LOW`.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-013`

## findings
`UX-EMPTY-002`, `UX-EMPTY-003`, `UX-COPY-001`, `UX-MAGIC-002`

## existing_plan_links
None.

## goal
Four small copy/affordance fixes that improve dead-end recovery and remove a hardcoded personal name.

## current_source_evidence
- `src/components/workshop/proposals-page/ProposalsEmptyState.tsx:3-15` — recipient empty state has no CTA.
- `src/components/workshop/FirstProjectZeroState.tsx:20-36` — viewer zero-state has no copy/email affordance.
- `src/app/workshop/feedback/page.tsx:35` — "Philip will review submitted issues".
- `src/components/workshop/BetaFeedbackForm.tsx:123` — "unless Philip has explicitly asked".
- `src/lib/workshop/beta-feedback-actions.ts:57` — hardcoded founder reference.
- `src/lib/estimates/d1-intents/history-events.ts:174` — founder personal email hardcoded as the identity-resolver key.
- `src/components/auth/AuthStatusBanner.tsx:39-41` — magic-link success banner doesn't echo email.
- `src/lib/auth/actions.ts:161` — redirects to `?sent=1` only.

## owned_paths
- `src/components/workshop/proposals-page/ProposalsEmptyState.tsx`
- `src/components/workshop/FirstProjectZeroState.tsx`
- `src/app/workshop/feedback/page.tsx`
- `src/components/workshop/BetaFeedbackForm.tsx`
- `src/lib/workshop/beta-feedback-actions.ts`
- `src/lib/estimates/d1-intents/history-events.ts`
- `src/components/auth/AuthStatusBanner.tsx`
- `src/lib/auth/actions.ts`

## dependencies
None.

## non_goals
- A full founder-identity config system (env-driven label is the smallest fix).

## implementation_sequence
1. `ProposalsEmptyState.tsx`: add a `mailto:support` link or a "check your profile email" hint.
2. `FirstProjectZeroState.tsx` viewer branch: add a "Copy owner email" affordance or mailto.
3. Replace hardcoded "Philip" / "Philip Lewis" with a workspace/support-team label resolved from env (e.g., `process.env.NEXT_PUBLIC_SUPPORT_NAME || "the Archestimator team"`).
4. `actions.ts:161`: pass masked email to `?sent=1&email=<masked>`; `AuthStatusBanner.tsx`: surface the masked email.

## acceptance_criteria
1. Recipient empty state has a recovery CTA.
2. Viewer zero-state has a recovery affordance.
3. No hardcoded "Philip" / "Philip Lewis" in user-facing copy or identity resolver.
4. Magic-link success banner echoes the masked email.
5. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- `grep -r "Philip" src/components src/app/workshop/feedback src/lib/workshop/beta-feedback-actions.ts src/lib/estimates/d1-intents/history-events.ts` returns no user-facing hit.

## test_decision
`NOT_REQUIRED`.

## completion_signal
`DONE` when all five criteria evidenced.

## next_unit_on_success
None — this is the last unit. Pack advances to ACHIEVED once UNIT-001..UNIT-013 are verified (or honestly boundary-blocked).
