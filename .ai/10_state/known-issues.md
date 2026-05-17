# Known Issues / Open Risks

**Last updated:** 2026-05-17

## Current blockers

- The previous app/workshop prototype has been rejected and deleted from the live app baseline.
- `/workshop` is intentionally empty until Philip approves a fresh product direction.
- Do not restore deleted prototype routes or local-first data systems by following old handoff docs.
- Do not merge, deploy, or connect Supabase/Postgres without Philip's explicit approval.

## Open product decisions

- First restart workflow is undecided.
- First actual `/workshop` screen is undecided.
- Primary first user/project type still needs final confirmation.
- Pricing/source policy still needs final confirmation.
- First export priority still needs final confirmation: browser PDF, XLSX, CSV, branded quote, or BOQ.
- AI role in v1 still needs final confirmation.

## Technical risks

- Historical `.ai` plans/specs/logs still describe the rejected prototype. Current-state and restart-guardrail docs supersede them.
- Tests were intentionally reduced to baseline coverage. Add tests only for newly approved behavior.
- Removed dependencies may remain in `package.json` until a later dependency-pruning pass. Do not infer active product direction from installed packages.
- The landing page still contains product mockup/copy from the previous direction because Philip said the landing page is acceptable. Treat that page as preserved, not as approval to restore the deleted app implementation.

## Product risk controls

- Estimates must not imply false precision. Preserve assumptions, pricing dates, source/confidence metadata, and user editability once estimating functionality is rebuilt.
- Issued proposals/exports must be immutable snapshots if proposal functionality returns.
- Do not connect Supabase/Postgres until Philip explicitly approves.
- Do not merge/deploy without Philip explicitly approving.
