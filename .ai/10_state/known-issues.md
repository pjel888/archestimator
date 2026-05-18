# Known Issues / Open Risks

**Last updated:** 2026-05-18

## Current blockers

- The previous app/workshop prototype was rejected; old handoff docs still contain stale implementation direction.
- The repo now contains a small post-reset workshop route slice, so older docs that say `/workshop` is completely blank are stale where they conflict with `.ai/10_state/current-state.md`.
- Do not expand the current route slice by restoring deleted prototype routes, broad module shells, or local-first data systems from old handoff docs.
- Do not merge, deploy, or connect Supabase/Postgres without Philip's explicit approval.
- Agent performance degradation is now an explicit operational risk; use `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` when quality slips.

## Open product decisions

- First restart workflow has partially begun as a small workshop/projects/component route slice, but the exact MVP workflow remains unfinalized.
- First actual `/workshop` screen is undecided.
- Primary first user/project type still needs final confirmation.
- Pricing/source policy still needs final confirmation.
- First export priority still needs final confirmation: browser PDF, XLSX, CSV, branded quote, or BOQ.
- AI role in v1 still needs final confirmation.

## Technical risks

- Historical `.ai` plans/specs/logs still describe the rejected prototype. Current-state, decisions, restart-guardrail, and self-diagnostic docs supersede them.
- Tests should protect only currently approved behavior. Add coverage for the current post-reset route slice only when the behavior is accepted enough to preserve.
- Removed or newly added dependencies may remain in `package.json` during exploration. Do not infer active product direction from installed packages alone.
- The landing page still contains product mockup/copy from the previous direction because Philip said the landing page is acceptable. Treat that page as preserved, not as approval to restore the deleted app implementation.

## Product risk controls

- Estimates must not imply false precision. Preserve assumptions, pricing dates, source/confidence metadata, and user editability once estimating functionality is rebuilt.
- Issued proposals/exports must be immutable snapshots if proposal functionality returns.
- Do not connect Supabase/Postgres until Philip explicitly approves.
- Do not merge/deploy without Philip explicitly approving.
