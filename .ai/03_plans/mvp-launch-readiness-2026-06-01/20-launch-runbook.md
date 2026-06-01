# Launch Runbook

## Pre-Launch Branch / PR Process

1. Create PRs by ticket group from `16-implementation-ticket-map.md`.
2. Keep PRs small and reversible.
3. Include Lore commit messages.
4. Run targeted tests for each PR.
5. Update `14-evidence-index.md` with final proof before launch PR merge.

## Staging Deploy Process

1. Merge implementation PRs into staging branch or deploy preview.
2. Verify Vercel env:
   - `NEXT_PUBLIC_ASK_FLIP_ENABLED=false`
   - `AI_ASK_ENABLED=false`
   - `AI_PACKAGE_BUILDER_ENABLED=false`
   - Supabase URL/anon/service vars present as required.
3. Run protected route smoke:
   - `/login`
   - `/auth/callback`
   - `/workshop`
   - `/workshop/library`
   - `/workshop/templates`
   - estimate sheet route
   - export download route
4. Capture deployment URL and smoke output.

## Supabase Migration Apply / Verify

Use exact-file apply for linked remote migrations when other migrations are pending.

1. Review migration SQL.
2. Run local migration tests.
3. Apply exact file to linked Supabase.
4. Verify function exists and grants are correct.
5. Verify generated types include new RPC.
6. Run direct SQL smoke in non-production/staging:
   - linked row detaches,
   - revision increments,
   - event row inserted,
   - source snapshot preserved.
7. Capture output in evidence artifact.

## Vercel Env Checklist

| Env var | Production default |
| --- | --- |
| `NEXT_PUBLIC_ASK_FLIP_ENABLED` | `false` |
| `AI_ASK_ENABLED` | `false` |
| `AI_PACKAGE_BUILDER_ENABLED` | `false` |
| Existing package-builder subflags | Can remain but are inert behind top-level false. |
| Supabase vars | Present and production-correct. |
| Provider API keys | Not required for disabled AI launch; if present, disabled route must still prevent calls. |

## Auth Callback Verification

1. Open production/staging `/login`.
2. Sign in with approved method.
3. Confirm callback lands in `/workshop`.
4. Confirm no forced onboarding/country gate.
5. Confirm `/workshop/library` and `/workshop/templates` load under the same session.
6. Capture timestamp and account used, with secrets redacted.

## Smoke Test Sequence

1. Login.
2. Open `/workshop`.
3. Confirm Ask Flip footer absent.
4. Open `/workshop/library`; search component by supplier/brand/category.
5. Open `/workshop/templates`; preview a template.
6. Open a project estimate.
7. Edit a scalar row field.
8. Insert/replace component row.
9. Detach linked row to project-specific.
10. Verify activity/history event.
11. Download Excel bid workbook.
12. Hit `/api/ai/ask` and `/api/ai/package-builder`; confirm 403 disabled and no provider logs.

## Export Manual QA

1. Generate workbook from staging estimate fixture.
2. Open in Excel, Numbers, LibreOffice, Google Sheets.
3. Verify:
   - sheet names,
   - header block,
   - general notes,
   - no blank line totals,
   - formulas,
   - section summaries,
   - VAT/contingency behavior,
   - commercial blocks,
   - print layout.
4. Capture screenshots or notes with filename/date/totals.

## Production Deploy

1. Confirm all P0 checklist rows are Pass.
2. Confirm owner sign-off.
3. Deploy to production.
4. Re-run smoke sequence against production without mutating dangerous data.
5. Capture deployment URL and commit SHA.

## First-Hour Monitoring

Monitor:

- Vercel deployment logs.
- Supabase errors.
- Auth callback failures.
- AI provider logs for unexpected calls.
- Export route errors.
- Client-side error tracking if configured.

## Rollback

Immediate rollback triggers:

- AI provider call observed with disabled env.
- Auth callback fails.
- Export workbook totals wrong.
- Unlink corrupts row/history.
- Vercel deploy unstable.

Rollback actions:

1. Set AI flags false and redeploy if AI leakage.
2. Roll back Vercel deployment to last known good.
3. Hide unlink UI if row issue.
4. Drop unlink RPC only if function itself is unsafe.
5. Disable export route/download if workbook totals are wrong.
6. Record incident and repair plan in `.ai/10_state/current-state.md` and this plan folder.

## Post-Launch Triage

Within 24 hours:

- Review errors.
- Review first exported workbooks.
- Review user feedback on library/templates/row detach.
- Decide whether to reopen AI readiness plan.
- Move completed launch package to archive only after evidence is complete.

## Owner Sign-Off

Owner: Philip Lewis

Required before production:

- [ ] P0 checklist pass.
- [ ] Export commercial defaults approved.
- [ ] Manual QA artifacts reviewed.
- [ ] Production deploy approved.
