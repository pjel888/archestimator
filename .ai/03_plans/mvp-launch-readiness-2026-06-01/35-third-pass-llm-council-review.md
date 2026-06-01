# Third-Pass LLM Council Review

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

External model CLIs were not invoked from this Codex App session. This council is a simulated internal multi-expert review informed by read-only native explorer lanes for AI/auth/share/email, unlink/schema/RPC, Excel export, and infra/performance/security/legal/observability.

## Council Roles

| Role | Review focus | Confidence |
| --- | --- | --- |
| Claude-style product/documentation critic | Ambiguity, completeness, implementability. | High |
| Kimi-style long-context codebase auditor | Cross-doc/code/schema consistency. | High |
| OpenCode-style implementation architect | PR slicing and execution feasibility. | High |
| CommandCode-style release engineer | CI/CD, Vercel, Supabase, Resend, rollback. | High |
| Security reviewer | RLS, auth, secrets, abuse, privacy. | Medium-high |
| UX reviewer | Onboarding, empty states, investor/demo quality. | Medium |
| Construction estimating domain reviewer | Excel BOQ, scope labels, terms, industry fit. | Medium-high |

## Agreement Points

- MVP cannot show Ask Flip or allow callable AI routes by default.
- Excel export is the core launch credibility gap; current workbook is not a bid form.
- Project-specific components must remain estimate rows, not reusable library records.
- Legal, support, observability, backup, and deployment proof are P0, not optional polish.
- CI/local green is necessary but insufficient without live provider proof.

## Disagreements

| Topic | Disagreement | Resolution |
| --- | --- | --- |
| Redis | Release/security voice prefers Redis limiter now; performance/product voice prefers deferral. | Defer broad Redis, but require thresholds and add Redis if public abuse/AI/export job cases are enabled. |
| Share/invite visibility | Product wants collaboration foundation visible; security/release wants proof first. | Conditional visibility only after RLS/email/token proof. |
| Labor split | Domain reviewer wants labor split; schema auditor warns current model lacks true labor. | Use honest compatibility mode, not fake labor. |
| Legal placeholders | Product may tolerate for private demo; legal reviewer blocks public/beta. | Reviewed or closed-beta-approved copy required. |

## Hidden Risks

- Source-string tests can pass/fail for the wrong reason; convert to behavior tests.
- Resend mock-success can create false confidence.
- API routes bypass proxy and must auth themselves.
- Preview/download export divergence can occur if local edits are unsaved.
- Event payloads/source snapshots can leak metadata to share pages if DTOs are not controlled.
- CI can pass while env-gated E2E specs skip.

## Highest-Leverage Improvements

1. `AI-001`: remove unfinished AI from launch surface.
2. `INFRA-001`: env manifest and production defaults.
3. `EXP-001`: bid workbook contract and formula tests.
4. `UNLINK-001`: detached row contract and library-unchanged proof.
5. `SEC-001`: route/RLS/storage proof.
6. `LEGAL-001` + `OBS-001`: credible beta operations.

## Required Corrections To Existing Docs

- Replace stale command evidence with `681c95e` results.
- Stop saying export is ready; say XLSX route exists but workbook is not launch-grade.
- Use `detached`/`unlinked` accurately.
- Treat Ask Flip as P0 blocker until hidden/fail-closed.
- Add env vars for app origins, publication secrets, Resend, monitoring, and AI disable flags.
- Make legal/support/backup/observability explicit gates.

## Final No-Go Concerns

- `bun run test:dom` fails.
- E2E not proven.
- AI visible/callable.
- Excel export not professional.
- Unlink not implemented/proven.
- Legal pages placeholders.
- Live Vercel/Supabase/Resend proof missing.
- Backup/support/observability missing.

## Confidence Rating Per Domain

| Domain | Confidence | Rationale |
| --- | --- | --- |
| Product scope | Medium-high | Scope now clear; implementation proof missing. |
| Engineering plan | High | Tickets and files are concrete. |
| Security | Medium-high | Threats mapped; live proof missing. |
| Data integrity | Medium-high | Schema understood locally; linked proof missing. |
| UX | Medium | Screens need actual screenshot QA. |
| Excel/domain | Medium-high | Reference contract clear; implementation pending. |
| Release/ops | Medium | Provider proof still missing. |
| Legal | Low | Copy requires human legal review. |
| Beta readiness | Low | Operational gates incomplete. |
| Investor readiness | Low-medium | Demo plan clear; assets not built/proven. |
