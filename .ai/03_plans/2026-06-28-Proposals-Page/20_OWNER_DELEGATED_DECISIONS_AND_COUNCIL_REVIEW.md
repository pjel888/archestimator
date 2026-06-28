# 20 — Owner-Delegated Decisions and Council Review

## Context

This is a planning-only improvement pass. Philip explicitly delegated owner authority for reversible planning decisions and requested a council of LLMs. No application code, tests, migrations, provider state, or production state was changed.

## Council lanes

| Lane | Agent role | Verdict before repair | Decisive findings |
|---|---|---|---|
| Security/data | `ce-security-lens-reviewer` | Not ready | `token_hash` was wrongly treated as `/share/[token]`; session cookie needs raw token, publication id, credential version, recipient id |
| Feasibility/Next.js | `ce-feasibility-reviewer` | Not ready | Non-existent fourth enum value; client refresh needed explicit Server Function or different contract |
| Design/product | `ce-design-lens-reviewer` | Ready after edits | Owner decisions had to be recorded; UX state and browser-proof matrices needed tightening |
| Test/QA | `test-engineer` | Not ready | Mocked tests could not prove SQL/RLS/token bridge; provider and browser proof must be mandatory |

## Resolved P0/P1 issues

| Issue | Resolution | Updated docs |
|---|---|---|
| `project_publications.token_hash` treated as URL token | Declared `token_hash` a server lookup hash only; raw URL token recovered server-side from `encrypted_token` | `06`, `07`, `11`, `12`, `15` |
| Review action tried to use `recipient_token_hash` as session material | Replaced with authorization RPC returning only row ids; action uses raw token + publication id + credential version + recipient id | `04`, `06`, `07`, `08`, `11` |
| Direct authenticated read of publication hash would fail RLS | Action may use existing server-only publication admin/client after recipient authorization | `07`, `08`, `11`, `15` |
| Invalid extra publication status | Status contract is `published`, `expired`, `revoked` only | `04`, `07`, `11`, `12`, `15` |
| Browser proof was not a hard gate for browser-only claims | Browser smoke is mandatory for implementation completion | `09`, `11`, `12` |
| Owner decisions remained open | Recorded owner-delegated planning decisions | `05`, `15`, this doc |

## Owner-delegated decisions

| ID | Decision | Final choice |
|---|---|---|
| ODD-001 | Review click | Same-tab Server Action `redirect()` |
| ODD-002 | Status copy | `New`, `Opened`, `Decision submitted`, `Expired`, `Revoked` |
| ODD-003 | Sidebar shortcut | Proposals `⌘4`; Publisher `⌘5` |
| ODD-004 | Expired/revoked behavior | Show visible disabled rows; action returns `unavailable` |
| ODD-005 | Token/session bridge | Authorize recipient by RPC, then decrypt `encrypted_token` server-side; never serialize hashes |
| ODD-006 | Focus refresh | TanStack Query through explicit `"use server"` `loadRecipientProposals()` wrapper |

## Readiness basis

The package can be treated as implementation-ready after the consistency checks in this improvement pass pass, because:

- All owner decisions needed for v1 have defaults recorded.
- The previous token/hash bridge P0 is replaced with an implementable server-only bridge.
- The SQL enum/status contract matches current schema reality.
- Provider SQL proof and browser proof are explicit implementation completion gates.
- Independent council outputs exist and are recorded here.

This does not claim that code is implemented or provider/browser proof has run.
