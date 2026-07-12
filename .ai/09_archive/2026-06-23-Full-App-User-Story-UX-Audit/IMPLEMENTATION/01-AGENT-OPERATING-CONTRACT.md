# Agent Operating Contract

**Binding for:** every coding agent executing any `UX-NNN` issue in this plan pack.
**Supersedes:** nothing. Subordinate to `AGENTS.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, and [../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md](../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md).

---

## 1. Loop surface

Every `UX-NNN` execution is a bounded loop:

```
DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE
```

- **DISCOVER:** read `00-README.md`, `01-ISSUE-DEFINITION.md`, `02-CURRENT-STATE-ANALYSIS.md`, `03-TARGET-EXPERIENCE.md` for the chosen issue. Verify cited paths exist. Note drift.
- **PLAN:** read `04-IMPLEMENTATION-PLAN.md` wave-by-wave. Confirm pre-implementation gates are unblocked.
- **EXECUTE:** Wave 0 discovery → Wave 1 RED test → Wave 2 GREEN implementation → Wave 3 regression sweep → Wave 4 acceptance walk-through.
- **VERIFY:** run tests, capture evidence, tag honestly per §5 below.
- **RECORD:** update [03-EXECUTION-LEDGER.md](03-EXECUTION-LEDGER.md) with new status, RED→GREEN proof refs, evidence artifacts, and any blockers found.
- **DECIDE:** is this issue `verified`? If yes, pick next per [02-EXECUTION-SEQUENCE.md](02-EXECUTION-SEQUENCE.md). If no, iterate or escalate a blocker.

Cap: 10 iterations per issue. Escalate to owner after cap.

---

## 2. RED before GREEN (non-negotiable)

No issue is marked `implemented` without:

1. A failing test that reproduces the issue's canonical error from `01-ISSUE-DEFINITION.md`.
2. RED output captured (paste output or path) into the issue's `06-VERIFICATION-AND-PROOF.md`.
3. The implementation that flips that exact test to GREEN.
4. GREEN output captured alongside the RED in the same file.

**Forbidden:**
- Writing implementation before the RED test exists.
- Marking an issue complete based on "tests should pass" without running them.
- Deleting or skipping a failing test to achieve GREEN.
- Hard-coding values or special-casing logic to satisfy a test.

Tests pass as a **consequence** of correct code, not the goal.

---

## 3. No-shift toast feedback contract

Restated from [../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md](../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md) because it touches almost every UX issue in this pack:

| Feedback type | Allowed surface | Forbidden |
|---|---|---|
| Missing-field, validation failure, save failure, retryable provider failure, quota/rate-limit failure, recovery failure, async failure, success confirmation | Fixed toast with scoped ID | Inline error rows, reflowing banners, focus jumps, newly inserted error text |
| Destructive confirmation | Modal `alertdialog` | Toast-only destructive actions |
| Persistent structural state | Visible panel **only if** the area is always reserved on that surface | Panels that appear/disappear as transient validation |

**Non-shifting visual state IS allowed** when no layout resize occurs: border, icon, `aria-invalid`, stable helper slot, focus retention.

**Acceptance criterion addition for every touched issue:** transient feedback is toast-only and layout position is stable before, during, and after the toast. Add this to the issue's `05-ACCEPTANCE-CRITERIA.md` Scenario list when the issue changes feedback behavior.

---

## 4. Conflict-group discipline

The 10 conflict groups are canonical: see [../00-README-INDEX.md § Conflict Groups](../00-README-INDEX.md#conflict-groups-parallelization-hazard-map).

**Rule:** no two issues from the same conflict group are implemented concurrently without the named lead integration owner signing off in [03-EXECUTION-LEDGER.md](03-EXECUTION-LEDGER.md).

**Operational rules:**
- One agent per conflict group at a time, unless the lead explicitly coordinates.
- Before claiming an issue, scan the ledger for in-progress issues in the same conflict group.
- If a parallel claim is needed, the lead records a coordination note in the ledger's `## Parallel Coordination` section.
- Merge conflicts inside a conflict group are the responsibility of the second-to-merge, not the first.

---

## 5. Decision gates and scope locks

### Hard gates (require fresh owner decision before code starts)

| Issue | Gate | Current posture |
|---|---|---|
| UX-015 | Versions panel | Dormant for Wave 1. Do not build unless a newer beta recovery objective explicitly supersedes the contract. |
| UX-031 | Field handoff | P2 deferred. No Wave 1 implementation while closed beta is estimator/PM-only. |
| UX-039 | Notification campaign | P1 lightweight only: seeded/manual rows, CTA validation, delivery inspection. No rich composer. |

### Scope locks (binding for Wave 1)

| Issue | Lock |
|---|---|
| UX-027 | Issue-local toast IDs and no-shift feedback only. No global caller sweep unless a caller is directly in the failing story. |
| UX-032 | Readiness checklist, notes, owner-visible gaps. No approvals, margin alerts, lifecycle timeline, actor-state workflow. |
| UX-039 | See hard gate above. |
| UX-015 | See hard gate above. |
| UX-031 | See hard gate above. |

### Rate-limit policy (DEC-UX-RL-QUOTAS)

Policy B accepted: share comments and decisions first. Existing Postgres durable limiters on broader share/invite/landing paths MUST be preserved. Do not weaken existing limiter coverage to satisfy a per-issue test.

### Analytics policy (DEC-UX-ANALYTICS)

Vercel Web Analytics + Speed Insights only. Minimal Postgres event rows for core support/operator audit needs. All analytics events must pass through the existing redaction seam. Do NOT send tokens, emails, user IDs, project IDs, raw entity IDs, addresses, proposal contents, or free text to client analytics.

### RBAC/RLS changes

Any issue requiring new permission/role or RLS policy changes STILL requires a fresh RBAC/RLS plan before code, even if the issue is otherwise unlocked. The standing MVP database mandate (project `ebxxqidacheyapmmzavr` only) authorizes execution speed, not skipping the plan.

---

## 6. Evidence vocabulary (honest tagging)

Use exactly these values. Match the canonical CSV's "Evidence Status" column.

| Tag | Meaning |
|---|---|
| `not-run` | No check executed. Default for `planned`. |
| `local-only` | Test runner / type-check / lint ran locally. No browser, no provider. |
| `browser-verified` | Real browser surface exercised (Playwright, agent-browser, manual browser session). |
| `provider-verified` | Real provider surface exercised (Supabase query, Vercel deploy, GitHub API). |
| `manual-verified` | Human signed off on the artifact. |

**Forbidden:** "verified" without naming the surface. "Works" without running it. "Provider-verified" from a local-only check.

---

## 7. Status vocabulary

Use exactly these values, in this order:

```
planned → in-progress → implemented → verified → released
```

- `planned`: no code change yet.
- `in-progress`: branch claimed, RED test or implementation underway.
- `implemented`: GREEN test passes, code merged or ready to merge, but verification artifacts not yet captured or not yet run on the real surface.
- `verified`: all scenarios in `05-ACCEPTANCE-CRITERIA.md` pass with RED→GREEN proof and honest evidence tags.
- `released`: merged to `main` and shipped (owner-gated).

**Forbidden:** "done", "complete", "finished" (ambiguous). Skipping states (no `implemented` → `released` without `verified`).

---

## 8. Ponytail discipline

This pack is governed by Ponytail full mode. The shortest correct diff wins.

- Smallest coherent edit per issue. No "while I'm here" cleanup.
- No unrequested abstractions (interface with one implementation, factory for one product, config for a value that never changes).
- No boilerplate, scaffolding "for later", or new files unless absolutely necessary.
- Reuse existing `src/components/ui/` primitives. Do not create one-off markup.
- Mark deliberate simplifications with `// ponytail:` comments naming the ceiling and upgrade path.
- Complex request? Ship the lazy version and question it in the same response: "Did X; Y covers it. Need full X? Say so."

**Never simplify away:** input validation at trust boundaries, error handling that prevents data loss, security measures, accessibility basics, anything explicitly requested by the issue's acceptance criteria.

---

## 9. Proportional verification

Per `AGENTS.md`:

| Change type | Required check |
|---|---|
| Docs/config | `git diff --check` |
| Narrow source | type/LSP check OR targeted test for touched behavior |
| Shared logic, auth, DB, security | targeted tests + `bun run validate` |
| Release / high-blast-radius | `bun run validate` + `bun run build` + relevant E2E |
| UI change with interaction/routing/auth/data state risk | browser proof (Playwright or agent-browser) |
| UI cosmetic (spacing, copy, color, icon) | static review + type/LSP/lint; browser proof optional |

State the specific claim a browser proof would prove before running it. If the claim is provable statically, do that instead.

---

## 10. Branch and commit policy

- One branch per issue: `feat/UX-NNN-<slug>` or equivalent.
- Or one branch per conflict-group wave if the lead coordinates.
- Never commit to `main` without explicit owner request.
- Commit messages: follow repo conventions; include `UX-NNN` in the subject.
- Never `git push --force` to shared branches. Never `--no-verify`.
- Commits are owner-gated. Coding agents do NOT commit unless the owner asks.

---

## 11. Database and provider boundaries

Standing MVP database mandate applies (project `ebxxqidacheyapmmzavr` only). Agents may:
- Create, edit, apply migrations.
- Run scoped SQL.
- Adjust schema, RLS, grants, RPCs, triggers, seed/test data, generated types.

Agents may NOT:
- Touch `archestimator` or any unrelated provider project.
- Disable PITR or change billing-tier settings without fresh owner approval.
- Make irreversible destructive changes (DROP without backup, TRUNCATE production, etc.) without explicit fresh instruction.
- Claim provider proof from local-only checks.

---

## 12. Escalation

Stop and escalate to owner when:
- A decision gate is hit and no fresh resolution exists.
- An issue's plan folder is internally contradictory.
- A cited path in `02-CURRENT-STATE-ANALYSIS.md` no longer exists (drift beyond tolerance).
- Three consecutive fix attempts fail.
- The conflict group has no clear lead.
- The owner explicitly asks to be consulted.

Record the escalation in [03-EXECUTION-LEDGER.md § Blockers](03-EXECUTION-LEDGER.md#blockers) with: issue ID, what was attempted, what decision is needed, who needs to decide.
