# Cloudflare Hosted Library Template Proof

Generated: 2026-07-02T05:22:07Z

Result: **PASS** for hosted scratch estimate-template creation with remote D1 readback.

## Auth And Browser Journey

- Auth method: independent signed Better Auth D1 session cookie.
- Session probe: `GET https://archestimator.com/api/auth/get-session` returned `200` as `philipjonlewis@gmail.com` with private no-store cache headers.
- Browser: headless Playwright Chromium, separate from the user's foreground Chrome.
- Route: `https://archestimator.com/workshop/library/templates`
- Workflow: Library > Templates > New template
- Submitted:
  - `name=Codex CF Template Proof 20260702T052028Z`
  - `category=Codex CF Templates 20260702T052028Z`
  - `description=Hosted Cloudflare template proof via independent signed D1 session`

After submit, Playwright strict-mode found the new template name visible in
three places: tree row, gallery heading, and preview button. The command exited
nonzero at that visibility wait, but only after the create submit had completed.

## Remote D1 Readback

Remote D1 `archestimator-proof-db` returned the template row:

- `id=b82aa0a2-7821-4989-bf0d-69a9eece821f`
- `workspace_id=258b50ee-3fde-4f6a-a9d9-c360ec44cd0b`
- `name=Codex CF Template Proof 20260702T052028Z`
- `description=Hosted Cloudflare template proof via independent signed D1 session`
- `category=Codex CF Templates 20260702T052028Z`
- `sort_order=0`
- `metadata={"savedFrom":"library-templates-browse"}`
- `created_by=4e23801d-6fc2-4886-b980-d15ca2b164b8`
- `created_at=2026-07-02T05:21:18.120Z`
- `updated_at=2026-07-02T05:21:18.120Z`
- Served by APAC/SIN primary with `rows_read=2`.

Because this was a scratch template, child-table readback before cleanup
returned:

- `estimate_template_nodes=0`
- `estimate_template_row_items=0`

## Cleanup

The empty throwaway template was deleted by an exact remote D1 command matching
the `id`, `workspace_id`, and `name`. Post-cleanup readback returned:

- `estimate_templates=0`
- `estimate_template_nodes=0`
- `estimate_template_row_items=0`

Cleanup changed exactly one row and was served by APAC/SIN primary.

## Boundary

This proof covers signed-in production UI creation of an empty scratch estimate
template through the Cloudflare-hosted app, remote D1 persistence readback, and
scoped cleanup. It does not cover inserting a template into an estimate or
viewer-denial behavior.
