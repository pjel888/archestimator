# Beta Feedback In-App Local Evidence - 2026-06-02

## Result

Local code/test evidence improved. This does not approve closed beta launch.

## What Changed

- Added local migration `supabase/migrations/20260602083000_beta_feedback_submissions.sql`.
- Added protected `/workshop/feedback`.
- Changed authenticated workshop footer `Send beta feedback` to open `/workshop/feedback`.
- Added `submitBetaFeedback()` server action.
- Added validation and safe email fallback copy when persistence is unavailable.

## Guardrails

- `beta_feedback_submissions` has RLS enabled.
- Authenticated users can insert only their own feedback row through `auth.uid() = user_id`.
- Normal authenticated users are not granted table `select`, so they cannot enumerate feedback.
- Feedback type, severity, and message length are validated before insert.
- Optional project context must be a UUID or omitted.
- Persistence failure does not fake success; the UI tells the tester to use an email fallback.

## Local Verification

- `bunx vitest run tests/vitest/beta-feedback.test.ts tests/vitest/support-contact-readiness.test.ts tests/vitest/workshop-reset.test.tsx --maxWorkers=1` passed 3 files / 12 tests.

## Remaining Gaps

- The migration is not applied to linked Supabase.
- No hosted `/workshop/feedback` browser smoke is captured.
- No monitored feedback inbox/table review proof exists.
- Alert ownership and incident escalation proof remain missing.
