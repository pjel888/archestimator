# 19 — Research, Review, and QA Evidence

## 19.1 Research questions and sources

This is a codebase-grounded plan; minimal external research was required. Research questions considered:

| Question | Source | Outcome |
|---|---|---|
| Does a tour library already exist in the repo? | `package.json` grep | No (`react-joyride`/`driver.js`/`shepherd`/`intro.js` absent). Decision: do not add one (DEC-01). |
| Is the Joyride plan still executable? | `.ai/03_plans/2026-06-03-react-joyride-onboarding-implementation-plan/` + current source | **No** — targets Supabase + a real `/workshop/onboarding` route; both stale. Superseded. |
| What is the closed-beta entry mechanism? | `src/app/signup/page.tsx`, `closed-beta-access.ts`, `closed_beta_allowed_emails` | Admin-invited allowlist; no self-serve. Activation begins after entry. |
| What is the terminal "publishable proposal" rung today? | `proposal-package-system.md`, `publication/actions.ts`, XLSX export route | Mutable XLSX + view-only shared-link publication. Immutable/PDF is out of scope (sibling stub). |
| Does any sample/seed data exist for new users? | `migrations/`, `data/local/seed.json`, `estimate-templates.ts`, `scripts/seed-performance-test-data.ts` | No D1 seed for new workspaces; taxonomy deliberately removed (`0037`). In-code `estimateTemplates` fixture exists. Policy = owner decision (OPEN-DEC-01). |
| Does in-workshop product analytics exist? | `src/components/landing/*`, `src/lib/observability/*`, `estimate-mutation-telemetry.ts` | No in-`/workshop` product analytics; landing-only GA4/Clarity/CF Web Analytics (consent-gated). Server telemetry exists (estimate mutations → console). Decision: server-emitted structured events (DEC-03). |

**Autoresearch-style evidence discipline:** official/primary sources first (current source files + migrations > older plans > model memory). No plan decision relies on community convention over current repo evidence. Citations are repo-relative paths with line numbers where applicable. Source dates: migration filenames; `current-state.md` entries dated 2026-07-07. What was searched but not found: any existing in-`/workshop` product analytics SDK; any per-user starter seed; any current tour library.

## 19.2 Skills and workflows used / unavailable

See `00_AGENT_COORDINATION.md` §"Skills discovered and used." Summary: three native `Explore` read-only lanes (real dispatches); no MCP graph index (narrow discovery was cheaper); workflow-skill vocabulary (autopilot/ultragoal/ultrawork/ultraqa/autoresearch/performance-goal) encoded into the implementation phases rather than invoked during planning. Impeccable/Playwright/visual QA intentionally deferred to future implementation (proportional policy).

## 19.3 Specialist workstream outputs (evidence)

- **Product/scope/requirements** — `02_…`, `04_…`. First-user ladder = beta entry → first project → first estimate → first area/template/line item → first publishable proposal.
- **Codebase architecture** — `03_…`, `06_…`. Thin overlay on existing mutations + homebase payload; new `workspace_activation_milestones` table; new `src/lib/activation/{milestones,events}.ts`.
- **UX/UI/a11y** — `05_…`. Screen-by-screen states; reuse `EmptyState`; welcome panel above bento; a11y defined.
- **Frontend components/state/interaction** — `06_…` §6.3, `11_…` Phase 2. `WorkspaceWelcomePanel` client; `firstRun` derived; one shared `NewProjectModal` open state.
- **Backend/API/integrations** — `07_…`. No new public route; additive payload; idempotent upserts; non-throwing emits.
- **Data/database** — `07_…`. Migration `0039` blueprint; reconciliation backfill; rollback = drop table.
- **Security/privacy** — `08_…`. Threat model; denial tests; redaction; no new credentials.
- **Performance/reliability** — `09_…`. Evaluator contract; query-count gate; failure modes; kill-switch.
- **Test/QA** — `12_…`. Test matrix maps every requirement.
- **Ops/rollout** — `13_…`. Rings; flag; rollback.
- **Blast radius** — `10_…`. Inventory + dependency graph.
- **Adversarial** — §19.5 below.
- **Final verifier** — `17_…` (emulated).

## 19.4 Critique-and-revision cycle summaries

This is an `exhaustive` profile → at least two complete critique-and-revision cycles required after the initial draft. Because the package was synthesized in one pass from three concurrent audits, the cycles are documented as **emulated passes**:

- **Cycle 1 (cross-document consistency):** Checked every doc for contradictions (e.g., tour-library mentions vs DEC-01; payload contract vs ARCH-002; stale Joyride references). Resolved: unified on DEC-01/04 (no tour), ARCH-002 (additive payload), explicit Joyride supersession. Tightened vague CTAs into exact copy + target routes.
- **Cycle 2 (adversarial + traceability):** Ran the §19.5 matrix; confirmed every requirement traces; confirmed every implementation task has exact paths/symbols; confirmed no task is "approximate" except the two explicitly isolated `BLOCKED-EXTERNAL` phases; added the §7.7 reconciliation rule to close the "milestone write fails mid-action" gap; added the optional kill-switch for beta safety.
- **Cycle 3 (independent adversarial review + corrections):** A separate native `Explore` adversarial-review lane was dispatched (distinct from the author's emulated passes). It returned 1 P0 (homebase integration pointed at the disabled/off-limits RPC `getWorkshopHomebaseDataRpcPath` + legacy `supabase/migrations` SQL instead of the active `getWorkshopHomebaseDataAppPath`), 6 P1s (wrong line anchor for `createEstimateSheetDraft`, undefined `milestone_first` mechanism, fuzzy "area-ish kinds", PERF query-count claim, AC-001.2 wording, OPEN-DEC numbering), and several P2s. All P0/P1 findings were verified against source and corrected in this revision; the corrections are itemized in `17_…` §17.7. The independent adversarial lane's spot-checks (verified exact): `NewProjectForm.tsx:333` `createEstimateSheetDraft(project.id)`; `LibraryHubCard` disabled-until-project behavior; `onboarding/page.tsx` redirect; `empty-state.tsx` API; latest migration `0038`; `auth-onboarding-guard.test.ts` exists; empty-tab copy; migration `0037` taxonomy removal. This raises the effective verification quality above a pure same-agent pass, but the final-go/verdict is still authored by the same agent, so the `verification_mode` remains `emulated` and the readiness cap still applies. Stopped after 3 cycles (cap is 6); residual findings are owner-isolated (OPEN-DEC-01/02) or external (hosted RUM), not internally resolvable.

## 19.5 Adversarial scenario matrix (UltraQA-style)

For the runtime/workflow/data-mutation risk of the activation path:

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|
| AQ-01 | Workspace A member | Read B's milestones | Two workspaces | `activation-milestones-cross-workspace.test.ts` | Empty/deny | planned | unit test | none |
| AQ-02 | Non-member | Invoke `createProjectRecord` for another workspace | Member + non-member | action test | Authz deny; no milestone | planned | unit test | none |
| AQ-03 | First user | Two rapid "Create project" submits | Empty workspace | integration test | One project + one milestone (dedupe/idempotent) | planned | integration | none |
| AQ-04 | Attacker | Event payload with unknown field / free text | n/a | `activation-events.test.ts` | Schema rejects | planned | unit test | none |
| AQ-05 | Attacker | Direct POST to Server Action (no UI) | n/a | action test | Still emits; authz-deny non-member | planned | unit test | none |
| AQ-06 | First user | Dismiss panel, still zero projects | Empty workspace | DOM test | Panel hidden; projects zero state guides | planned | DOM | none |
| AQ-07 | Old client | Homebase payload missing new fields | Fixture | contract test | `firstRun=false` default | planned | contract | none |
| AQ-08 | D1 error | Milestone upsert fails mid-action | Mock D1 failure | integration test | Action still succeeds; reconcile later | planned | integration | none |
| AQ-09 | Two tabs | Concurrent first login | Two sessions | concurrency test | Both see panel; first project hides both | planned | concurrency | none |
| AQ-10 | Beta user | Network drop after project create | Slow/offline | e2e/manual | Optimistic rollback (existing) + milestone reconciles | planned | manual | none |
| AQ-11 | Collaborator | Adopted empty workspace | Invite flow | DOM/integration | Panel shows (per OPEN-DEC-02 recommendation) | planned | DOM | none |
| AQ-12 | Dirty worktree / concurrent agent | Another agent edits `WorkshopDashboard.tsx` during impl | `git status` | review | Re-read before edit; no overwrite | process | review | none |

(All "planned" — to be executed during implementation, not during this planning-only task. The matrix itself is the deliverable here.)

## 19.6 Performance evaluator contract

See `09_…` §9.1. Evaluator = query count unchanged + TTFB p95 ≤ +5%; harness = `workshop-dashboard-query-count-script.test.ts` + local perf-trace; fixture = empty vs 10-project workspace; runs = 3; threshold = query count +1 OR TTFB p95 +>5%.

## 19.7 Independent final verifier evidence

`verification_mode: emulated`. No independent verifier was available. The emulated verifier pass is documented in `17_…`. Recommendation: owner or independent reviewer accepts the package to lift the implementation-ready slice to `IMPLEMENTATION-READY`.

## 19.8 Explicit validation gaps

- Hosted/production RUM/CWV unavailable (sibling stub `2026-07-07-production-rum-and-cwv-telemetry`). Local perf-trace + query-count tests are the substitute.
- Browser proof for the welcome-panel modal/focus/announcement deferred to implementation (T8.1 + manual QA steps in `12_…`).
- Sample-project authz denial test (SEC-T5) blocked on OPEN-DEC-01.
- No provider-backed proof needed for this additive D1 change.
- No GitHub hosted security controls claimed.
