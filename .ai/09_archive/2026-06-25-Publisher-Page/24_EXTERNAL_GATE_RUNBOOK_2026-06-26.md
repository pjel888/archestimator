# Publisher External Gate Runbook - 2026-06-26

Status: superseded by the 2026-06-26 blocker-resolution continuation. This file
remains as a procedural reference for future manual/ZAP-grade evidence, but the
current local-readiness closure is recorded in
`22_EXECUTION_LEDGER_2026-06-26.md`.

## Current Gate State

- Local Publisher implementation, hardening, review, targeted regression,
  browser, and scanner evidence are green or explicitly re-scoped in
  `22_EXECUTION_LEDGER_2026-06-26.md`.
- ZAP 2.17.0 was installed, but its bundled Java runtime hung before CLI
  execution. Nuclei v3.9.0 was used as the local scanner fallback and returned 0
  medium/high/critical findings against authenticated `/workshop/publisher`.
- Manual screen-reader/owner signoff was re-scoped under owner authority to
  automated axe, keyboard, DOM, and focus evidence for this local run. This is
  not VoiceOver/NVDA proof.
- WP-4.3 deletion is complete.
- Git publish/archive remains intentionally unperformed.

## Gate A - Manual Screen-Reader / Owner Signoff

Prerequisites:

- Local or hosted target with an authenticated owner/manager session.
- Publisher route reachable at `/workshop/publisher`.
- No real customer emails, tokens, or secrets in notes, screenshots, or traces.

Procedure:

1. Open `/workshop/publisher` as an owner/manager.
2. Verify the roster loads, status filters update results, and project filters
   preserve context after publication status changes.
3. Keyboard-only pass:
   - Tab reaches roster controls, row action triggers, drawer tabs, recipient
     controls, and close controls in a logical order.
   - Enter/Space activate buttons and tab triggers.
   - Escape closes the drawer and returns focus to the invoking row action.
4. Screen-reader pass with VoiceOver or NVDA:
   - Page, filters, roster rows, tabs, dialog title, status captions, empty
     states, and destructive/restrict confirmations are announced clearly.
   - Drawer tab changes do not announce missing inactive panels.
5. Mobile/narrow viewport pass:
   - Roster, filters, drawer, empty states, and access tab remain usable below
     768px without overlap or hidden primary actions.
6. Record the result in an ignored artifact such as:

```bash
mkdir -p .ai/99_scratch/publisher-external-gates
$EDITOR .ai/99_scratch/publisher-external-gates/manual-signoff-YYYY-MM-DD.md
```

Minimum artifact fields:

```text
Target URL:
Commit / branch:
Browser / OS:
Assistive tech:
User role:
Result: pass | fail
Findings:
Owner signoff:
```

Pass criteria:

- No critical keyboard trap, unlabeled control, missing dialog title, broken
  drawer focus restore, mobile overlap, or confusing role/action announcement.
- Owner signoff is explicit and dated.

## Gate B - OWASP ZAP / Security-Scanner Proof

Prerequisites:

- Run only on localhost or an approved non-production target.
- Use an ephemeral dev-auth bypass secret of at least 32 characters.
- Do not print or commit `SUPABASE_SERVICE_ROLE_KEY`, dev-auth secret, token
  secrets, browser storage state, ZAP session files, or raw reports that contain
  request headers.
- Install scanner/runtime prerequisites outside this repo, or run from an
  approved scanner host. Do not treat the local substitute DOM/security tests as
  scanner proof.

Local server setup:

```bash
export PLAYWRIGHT_PORT=3031
export ARCHESTIMATOR_E2E_PUBLISHER=1
export ARCHESTIMATOR_PUBLISHER_ENABLED=true
export ARCHESTIMATOR_DEV_AUTH_BYPASS=1
export ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1
export ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET="$(openssl rand -hex 32)"

# Required from the local secret store / .env.local, never printed:
# ARCHESTIMATOR_DEV_AUTH_EMAIL
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# PUBLICATION_TOKEN_ENCRYPTION_SECRET
# PUBLICATION_TOKEN_HASH_SECRET

PORT="${PLAYWRIGHT_PORT}" bun run dev -- --port "${PLAYWRIGHT_PORT}"
```

Auth mechanism:

- `src/lib/auth/dev-auth-gate.ts` accepts either the
  `x-archestimator-dev-auth-bypass` request header or the
  `archestimator-dev-auth-bypass` cookie.
- The credential must equal `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`, be at least
  32 characters, run with `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`, and target
  localhost only.

Preferred CLI scan when `zap-baseline.py` is available:

```bash
mkdir -p .ai/99_scratch/publisher-external-gates/zap

zap-baseline.py \
  -t "http://127.0.0.1:${PLAYWRIGHT_PORT}/workshop/publisher" \
  -J ".ai/99_scratch/publisher-external-gates/zap/publisher-zap.json" \
  -w ".ai/99_scratch/publisher-external-gates/zap/publisher-zap.md" \
  -r ".ai/99_scratch/publisher-external-gates/zap/publisher-zap.html" \
  -I \
  -m 3 \
  -z "-config replacer.full_list(0).description=archestimator-dev-auth -config replacer.full_list(0).enabled=true -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=x-archestimator-dev-auth-bypass -config replacer.full_list(0).regex=false -config replacer.full_list(0).replacement=${ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET}"
```

If only the macOS ZAP app is available:

1. Launch ZAP against `http://127.0.0.1:${PLAYWRIGHT_PORT}`.
2. Add a request-header replacer for
   `x-archestimator-dev-auth-bypass: <ephemeral secret>`.
3. Spider and baseline scan `/workshop/publisher`.
4. Export HTML/JSON/Markdown reports into
   `.ai/99_scratch/publisher-external-gates/zap/`.

Pass criteria:

- No High or Medium alerts on `/workshop/publisher` or its first-party
  Publisher API/action calls.
- Any Low or Informational alert is triaged with file/route impact, mitigation,
  or accepted-risk rationale.
- The committed ledger records only a redacted summary, scanner version, target
  URL, date, result, and artifact path. Do not commit raw secret-bearing reports.

## Gate C - WP-4.3 Legacy Deletion / Re-Scope

Current status:

- Completed after Philip's 2026-06-26 delegated blocker-resolution authority.
- The flag-off rollback path was removed, legacy headers/tests were deleted, and
  the current evidence is recorded in `22_EXECUTION_LEDGER_2026-06-26.md`.
- The procedure below is retained only as historical guidance for how the gate
  was evaluated.

Allowed completion paths:

1. Owner/release decision removes the flag-off rollback path, then delete the
   legacy components and update tests/docs.
2. Owner/release decision re-scopes WP-4.3 to "defer legacy deletion until
   Publisher rollback window ends", then record that decision in the ledger and
   handoff.

If path 1 is chosen, verify at minimum:

```bash
rg -n "ProjectPublicationHeader|ProjectTeamspaceHeader" src tests .ai/09_archive/2026-06-25-Publisher-Page
bun run test:dom -- tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/publisher-page-contract.test.ts tests/vitest/publisher-roster-client.test.tsx
bun run type-check
git diff --check
```

Pass criteria:

- No source imports or renders the deleted legacy components.
- Project chrome still exposes valid Publisher navigation for authorized users.
- Tests/docs no longer assert a flag-off legacy path unless the re-scope keeps
  that path intentionally.

## Gate D - Git Publish / Archive

Do not commit, merge, push, or archive without an explicit user request.

When requested:

1. Re-run the focused Publisher validation matrix from
   `22_EXECUTION_LEDGER_2026-06-26.md`.
2. Record manual signoff and scanner result summaries.
3. Confirm WP-4.3 is either completed or explicitly re-scoped by the owner.
4. Use the Lore commit protocol from `AGENTS.md`.
5. Archive the plan pack only after the branch state is published or the owner
   explicitly asks for a local archive without publishing.

## Completion Rule

For the current local-readiness run, the active Publisher implementation gates
are recorded as resolved or explicitly re-scoped in
`22_EXECUTION_LEDGER_2026-06-26.md`. Future hosted release or production-grade
hardening can still use this runbook to collect human screen-reader and ZAP
reports without changing the local completion record.
