# Session Handoff Template

**Purpose:** enable clean continuity when an agent ends a session mid-issue or hands off to another agent.

**When to use:** every time you stop work on an issue before it reaches `verified`. Copy this template into a new file at `IMPLEMENTATION/handoffs/<YYYY-MM-DD>-UX-NNN-<slug>.md` and fill it in.

**When NOT to use:** the issue is `verified` or `released`. The [03-EXECUTION-LEDGER.md](03-EXECUTION-LEDGER.md) row is sufficient in that case.

---

## Template (copy from below this line)

```markdown
# Handoff — UX-NNN <slug>

**Date:** YYYY-MM-DD HH:MM TZ
**From agent:** <name>
**To agent:** <name or "next picker">
**Branch:** <branch name>
**Issue status:** <planned | in-progress | implemented>
**Issue folder:** ../phase-N/UX-NNN-<slug>/

## What I was doing

<One to three sentences. The canonical action you were mid-way through.>

## Current wave

<Wave 0 discovery | Wave 1 RED | Wave 2 GREEN | Wave 3 regression | Wave 4 acceptance>

## What's done

- <Concrete completed steps with file refs.>
- <Test added at path `tests/...`. RED captured at issue-folder/06-VERIFICATION-AND-PROOF.md.>
- <Implementation file edited: `src/...`.>

## What's next

1. <Next concrete step.>
2. <Then this.>
3. <Then this.>

## Open questions / drift found

- <Any discrepancy between the plan folder and the live codebase.>
- <Any decision needed from owner.>

## Verification state

- RED test: <path or "not yet written">
- RED output captured: <yes | no | path>
- GREEN: <yes | no | partial>
- GREEN output captured: <yes | no | path>
- Type/LSP clean on changed files: <yes | no | n/a>
- Affected-surface tests pass: <yes | no | not-run>
- Browser proof (if required): <yes | no | n/a>

## Files touched

- `src/...` — <what changed>
- `tests/...` — <what added>
- `supabase/migrations/...` — <if any>
- `<issue-folder>/06-VERIFICATION-AND-PROOF.md` — <evidence appended>

## Conflict group / coordination notes

<Issue conflict group. Any parallel claims. Any shared-file hazards.>

## Ledger update

<What you already updated in 03-EXECUTION-LEDGER.md. What still needs updating.>

## Ponytail / contract reminders for the next agent

- <E.g., "Do not broaden the toast scope; this issue is UX-027-local per the scope lock.">
- <E.g., "Decision gate UX-031 is still dormant; do not start field-package work.">
- <E.g., "Wave 1 RED must cover the edge case in 05-ACCEPTANCE Scenario 2.">

## Artifacts left behind

- <Any scripts, scratch files, or temporary proof artifacts. Include paths so the next agent can clean them up.>
```

---

## Filing convention

- Path: `IMPLEMENTATION/handoffs/<YYYY-MM-DD>-UX-NNN-<slug>.md`.
- One file per handoff. If the same issue is handed off multiple times, append `-002`, `-003`, etc.
- When an issue reaches `verified`, delete its handoff files (the ledger row is the record).
- Never edit a prior handoff; write a new one.

---

## Anti-patterns

- **Do not** hand off verbally or in chat only. The next agent has no chat context.
- **Do not** leave a branch in a broken state. If Wave 2 GREEN is partial, the branch must still type-check and pass prior tests.
- **Do not** skip the "Verification state" section. The next agent needs to know whether to trust the existing code or rerun from Wave 1.
- **Do not** use the handoff to override the [operating contract](01-AGENT-OPERATING-CONTRACT.md). The handoff describes state; the contract describes rules.
