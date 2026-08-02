# Findings And Overlap Reconciliation

## 1. Source Ledger

| Source | Scope | Current verdict |
| --- | --- | --- |
| Codex cloud export | 200 findings; 14 High, 80 Medium, 33 Low, 73 Informational | Sanitized as `CSF-001` through `CSF-200` |
| Standard local scan | Whole repository; 13,379 paths | Complete coverage; 9 findings; history ingestion failed after artifacts |
| Working-tree scan | 106 starting changes | Complete coverage; 0 findings; sealed starting snapshot |
| Committed diff scan | `origin/main..HEAD` | Zero changed files; empty-snapshot sealing bug |
| Deep scan | 18 security-critical path groups plus isolated 46-file fallback | Tool failed to emit draft artifacts; no deep finding result claimed |
| Saved-scan operations | Show/export/match/compare | One completed history record; exports passed; pair match/compare unavailable and artifact correlation required |
| AgentShield | Project `.claude`; static plus injection, sandbox, taint, and supply-chain checks | Grade B (89); 6 configuration findings; no fixes applied |
| GitHub | 19 open security-relevant PRs + 2 closed supersessions | Read-only overlap inventory |
| Focused validation | CSF-001 and local public-activity finding | CSF-001 suppressed; public-activity finding reportable Medium |

Raw private evidence remains under
`%LOCALAPPDATA%\CodexSecurity\archestimator\2026-08-01-full-audit`. Only hashes
and sanitized metadata are committed.

Current-source reconciliation classifies the 200 rows as 103 still present,
54 remediated and verified, 20 obsolete-provider findings, 7 active existing
units, 6 duplicates, 4 requiring runtime or hosted evidence, 4 refuted, 1
migrated-but-requiring-reaudit, and 1 regression.

## 2. Disposition Vocabulary

Every cloud row receives exactly one:

- `REMEDIATED_AND_VERIFIED`
- `STILL_PRESENT`
- `REGRESSED`
- `OBSOLETE_PROVIDER`
- `MIGRATED_BUT_REQUIRES_REAUDIT`
- `MISDIAGNOSED_OR_REFUTED`
- `DUPLICATE_CURRENT_FINDING`
- `ACTIVE_EXISTING_UNIT`
- `NEEDS_RUNTIME_OR_HOSTED_EVIDENCE`
- `NEW_SCOPE_NOT_PREVIOUSLY_AUDITED`

The machine-readable record is
[evidence/codex-security-findings.json](./evidence/codex-security-findings.json).

## 3. Confirmed Priority Findings

| ID | Severity | Current verdict | Owner after UNIT-001 |
| --- | --- | --- | --- |
| CSF-001 | Suppressed | Preliminary commercial-terms gate is permissive, but the downstream strict intent guard denies an excluded editor before the write batch | UNIT-001 closes; UNIT-002 may deduplicate the preliminary gate as defense-in-depth |
| CSF-002 | High | Public client-portal manifest exposes hidden row-change detail | UNIT-003 delta unless July 31 already owns exact path |
| CSF-003 | High | Release evidence can attest an untrusted supplied commit | UNIT-006 delta / PR overlap |
| CSF-004 | High | Deleted-account fallback can synthesize an active profile | UNIT-002 delta |
| CSF-006–010 | High | Component, corporate, and estimate authorization issues | Open PRs #125–#129; UNIT-001 decides owner |
| CSF-012 / 176 / 177 / 179 / 194 | High family | Local live-server origin/token boundary remains or regressed | UNIT-006 single root-cause owner |
| CSF-054 | High | Policy fallback can mark uploads clean without authoritative AV | July 31 UNIT-024/025 owner unless new delta |
| CSF-069 / 070 / 083 | Medium/High family | Public share sessions and decisions can remain stale or weakly bound | UNIT-003 |
| CSF-075 / 076 | Availability | Recursive estimate selection remains unbounded | Existing scale unit or delta owner |
| CSF-078 / 079 | High | Terms gate does not cover state/data APIs | UNIT-003 |
| CSF-089 | Abuse | Unauthenticated callback can flood audit writes | UNIT-002/003 boundary decision |
| CSF-136 / 137 | Availability/integrity | Fixed caps truncate closed-beta scans | UNIT-002/005 |
| CSF-153 | Local secret | Loopback Supermemory bearer lacks per-request peer attestation | UNIT-006 |
| CSF-168 / 169 / 170 | Local tooling | Cookie reuse and path containment defects | UNIT-006 |
| CSF-186 / 189 / 190 / 192 | Commercial export | Amount/formula/rounding failures remain | PR #138 overlap, then delta owner |

## 4. New Local Standard Findings

The local standard scan reported four Medium and five Low findings:

1. OAuth mismatch URLs can force logout and broad origin-storage clearing.
2. Anonymous publication activity exposes other recipients' display names.
3. Anonymous web-vitals ingestion allows oversized, unthrottled D1 writes.
4. Ask AI buffers JSON before authentication and quota checks.
5. Client Portal brand assets parse multipart data before authorization.
6. Collaboration room names permit unauthenticated Durable Object fan-out.
7. Package Builder buffers JSON before authentication.
8. Support conversation IDs permit unauthenticated Durable Object fan-out.
9. Revoked collaboration members can reconnect with live room tokens.

These are `NEW_SCOPE_NOT_PREVIOUSLY_AUDITED` unless `UNIT-001` finds an exact
cloud or July 31 owner.

### Supplemental AgentShield findings

AgentShield npm package 1.4.0 (CLI 1.5.0) reported 3 High, 2 Medium, and 1 Low
finding in project-owned Claude configuration: missing deny/permissions blocks,
destructive and fully-suppressed hook commands, and missing `PreToolUse`
security hooks. It applied no fixes and left repository status unchanged.
Advanced checks found 0 tainted flows, blocked 70/70 injection payloads,
executed 0 eligible hooks in the sandbox, and found 0 risky packages among 0
detected MCP npm packages. `UNIT-006` owns disposition and any narrowly
justified tooling hardening.

## 5. Focused Validation

### Commercial terms

Codex Security `validate` suppresses `CSF-001`. The preliminary
`canEditCommercialTerms` query is permissive, but both mutation paths flow
through `commitCommercialMutation`, `prepareEstimateMutationIntent`, and
`assertEstimateEditIntent`; the canonical strict D1 authorization denies an
excluded editor before the batch executes. The earlier temporary proof mocked
the intent boundary and therefore did not preserve the real control chain.

No vulnerability fix is required for the claimed bypass. A defense-in-depth
cleanup may replace the duplicated preliminary SQL with the canonical strict
helper and add restricted/direct/inherited/viewer/stale regression coverage,
without representing that cleanup as remediation of an exploitable write.

### Public activity identity

The anonymous public-activity route loads recipient display names for public
comments and the passing existing test explicitly expects the name in the
anonymous response.

Required fix contract: anonymous and cross-recipient views retain the event but
use a neutral identity; self-identity is allowed only under an explicit verified
recipient policy; owner/manager views retain authorized detail.

## 6. PR Reconciliation

### Open security-relevant PRs

`#124`, `#125`, `#126`, `#127`, `#128`, `#129`, `#138`, `#140`, `#141`,
`#142`, `#143`, `#144`, `#145`, `#146`, `#149`, `#150`, `#151`, `#152`,
and `#153`.

The read-only refresh at `2026-08-01T15:41:17.684Z` confirmed all 19 remain
open at their recorded head SHAs. Neither closed supersession is merged, and no
selected record is missing.

### Closed supersessions

- `#147` is superseded by `#153`.
- `#148` is superseded by `#152`.

### Collision groups

- `#125`, `#126`, `#127`, and `#140` collide on component-library actions.
- `#141` and `#152` overlap Next security remediation.
- `#138` overlaps proposal export findings but does not prove each formula and
  currency defect fixed.
- `#124` is adjacent to agent bootstrap hardening but does not fix every current
  mutable MCP/agent-tool execution path.

`UNIT-001` records current PR head SHA, merge state, changed paths, exact linked
finding IDs, and one owner. An open PR is evidence of intent, never remediation.

### Hosted-control boundary

The live API refresh found 0 open Dependabot alerts. Secret-scanning alerts
returned 404. Code-scanning alerts, branch protection, and repository rulesets
returned 403 under the current private-repository entitlement. The pack treats
those responses as unavailable hosted evidence, not as proof that a control is
enabled, disabled, present, or absent.

## 7. Predecessor Reconciliation

- July 19 whole-repository security work stays cancelled and superseded.
- July 31 units `007`-`014` and `024`-`026` retain their existing authority.
- July 31 `UNIT-024` is the exact early admission/absorption owner for this
  non-runnable supplement and must write its disposition receipt before any
  product-source work. July 31 `UNIT-020` owns the final mapped-evidence receipt
  and validator-valid terminal transition.
- Cloud rows that exactly overlap those units become `ACTIVE_EXISTING_UNIT`.
- A delta unit may own only a newly proved current path, invariant, or attack
  chain not already in the July 31 contract.
