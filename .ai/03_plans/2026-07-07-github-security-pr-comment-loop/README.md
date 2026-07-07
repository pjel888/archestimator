# GitHub Security PR Comment Loop

Created: 2026-07-07

Purpose: track live GitHub security PRs, review comments, and alert-readback evidence until each item is fixed, classified stale, or blocked with proof.

Canonical ledger: `LOOP_LEDGER.md`.

Scope:
- GitHub PRs and comments for `pjel888/archestimator`.
- Security-shaped Codex PRs, Dependabot/Actions PRs, and hosted security-alert surfaces when readable.
- Local prevention updates in `AGENTS.md` and `.ai` so agents stop repeating the same infosec mistakes.

Non-goals:
- No destructive Git history rewrite.
- No provider mutation outside the Cloudflare resources bound in `wrangler.jsonc`.
- No claim that CodeQL, Dependabot alerts, secret scanning, or branch protection is clean without live hosted readback.
