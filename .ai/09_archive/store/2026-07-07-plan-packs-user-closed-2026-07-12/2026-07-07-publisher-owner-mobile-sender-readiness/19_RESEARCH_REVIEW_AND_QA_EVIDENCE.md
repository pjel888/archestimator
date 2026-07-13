# 19 — Research, Review, and QA Evidence

---

## Research questions and sources
This is a codebase-grounded planning task. No external best-practice research materially shapes the plan (the decisions follow from repo evidence + `DESIGN.md` + the PROMPT constraint). Where official docs were consulted:

| Question | Source | Outcome |
|---|---|---|
| What does DESIGN.md say about mobile/dense editing? | `DESIGN.md:519-524` | Mobile prioritizes list/preview; dense editing → simplified flows → supports DEC-MOBILE Option B |
| Are there repo patterns for mobile media hooks? | grep `useMediaQuery`/`useIsMobile` in publisher tree | None → confirms CSS-only guard; no JS hook to reuse/mirror |
| Is the sender backend wired or stubbed? | `actions.ts` audit (Explore lane) | Fully wired; only the delivery-receipts webhook is stubbed (= workflow pack REL-01) |
| What do sibling packs own? | sibling READMEs | workflow pack = readiness/gating/Preflight/message/labels; deliverable-trust = snapshot; recipient-inbox = inbox; activity-min = share activity |

No research was included as a detached appendix. What was searched-for-but-not-found: a `useIsMobile` hook (absence is evidence for DEC-ARCH-1).

## Skills and workflows used
- `archestimator-plan-pack` (binding to dated plan-pack convention + loop contract).
- `Creating-Plan-Prompt.md` + `Multi-Agent-Execution-Directive.md` (structure + authority + verification caps).
- Explore (native read-only subagents) × 3 lanes.
- Not used: `gitnexus` (narrow localized surface; `rg` + reads sufficient per AGENTS.md proportional graph policy), `impeccable`/visual QA (Option B is DOM-testable; not a visual-audit task).

## Specialist workstream outputs (emulated/native)
- Source/UI architecture: native Explore → `03` section A,D,E.
- Backend/authz/data: native Explore → `03` section B,C,F, `07`, `08`.
- Plan/sibling trace: native Explore → `02` siblings, `10` boundary.
- Product/UX/a11y/security/perf/test/ops/adversarial/verifier: emulated separated passes by lead → `04`–`09`, `12`, `14`, `17`.

## Critique-and-revision cycle summaries

### Cycle 1 (initial draft → adversarial)
- Drafted `00`–`16`. Adversarial pass found:
  1. Initial mobile section was vague ("improve mobile") → **fixed**: added DEC-MOBILE with 3 options + recommendation + proof path (REQ-PS-01 AC1).
  2. "Confirm client access" was ambiguous (owner action vs. visibility) → **fixed**: DEC-SCOPE-1 clarifies it's owner-visibility of an existing recipient bridge.
  3. Resend rate-limit surfacing was missing a specific window message → **fixed**: REQ-FR-04 AC2 + matrix S4.
  4. Overlap risk with workflow pack was under-specified → **fixed**: file-scope ownership matrix in `00` + serialization in `10`/`11`.
  5. No database-change blueprint note → **fixed**: `07` explicit "no migration; delegate `0037` to workflow pack".
  6. Credential material was summarized too loosely → **fixed**: full taxonomy table in `07`.

### Cycle 2 (consistency + readiness)
- Cross-document consistency check found and fixed:
  1. `04` referenced a "Rotate" requirement not in the brief's 6-action list → clarified rotate is a *related* action (REQ-FR-07) since rotate is the mechanism behind resend-of-rotation and a sender-relevant destructive action; kept with rationale.
  2. `11` Task 1.3 (Option A) lacked blocker classification → **fixed**: marked `BLOCKED-EXTERNAL` (DEC-MOBILE owner decision).
  3. `09` PERF evaluator lacked auth/session note → not needed (publisher route is authenticated via RSC `requireCurrentUserContext`; evaluator uses build chunk + Profiler, not a routed perf harness) → documented.
  4. `12` referenced `bun run test:dom` — confirmed against repo scripts (impl must re-confirm).
  5. `17` readiness scoring needed verification-mode cap → applied (`emulated` → cap 97, package status `CONDITIONALLY READY` for high-blast-radius per directive §0).

A third cycle would not materially improve correctness (remaining items are genuinely external: DEC-MOBILE owner sign-off, workflow-pack landing, beta signal). Bounded exception recorded per directive.

## UltraQA-style adversarial scenario matrix
See `12` AQ-1..AQ-10. Covers: viewport block (AQ-1), viewer denial (AQ-2), resend rate abuse (AQ-3), email-down (AQ-4), batch-abort (AQ-5), clipboard block (AQ-6), stale drawer (AQ-7), revoke race (AQ-8), rotate-invalidates-recipient (AQ-9), malformed input (AQ-10).

For this **docs-only planning task**, dynamic adversarial QA is not applicable to the planning artifact itself (no runtime behavior changed); the matrix specifies the adversarial QA required for future implementation.

## Performance evaluator contract
See `09` PERF-01: baseline = publisher route chunk gzip + drawer-open Profiler median; target = ≤2% chunk / ≤50ms regression; measurement = `bun run build` + React Profiler; fixture = 1 project + 25-row roster; runs = build 1 / Profiler 5 median; threshold = stated; rollback trigger = breach or P0 regression. Passing ordinary tests is not the evaluator.

## Independent final verifier evidence
**verification_mode: emulated** (single planning agent; no second native verifier available this session). The lead performed a separated verifier pass (requirement-by-requirement audit against repo evidence) recorded in `17`. Per directive §0, emulated verification caps overall readiness at 97 and — for a high-blast-radius planning package — caps status at `CONDITIONALLY READY` unless a real independent reviewer or owner accepts. This is recorded honestly; no independent claim is made.

## Explicit validation gaps
- No provider/hosted/production proof (planning-only).
- No second-native-agent independent verification (emulated cap).
- Cross-pack revoked-link recipient behavior (AQ-9) relies on share/activity-pack evidence, not re-proven here.
- DEC-MOBILE final owner sign-off is external (Option B is the planned default).
- Workflow-pack landing (dependency for honest labels) is external.
