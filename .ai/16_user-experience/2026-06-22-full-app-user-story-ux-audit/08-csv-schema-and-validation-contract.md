# CSV Schema And Validation Contract

Date: 2026-06-22

This document defines controlled fields for `canonical-feature-status.csv`.

## Canonical Shape

- File: `canonical-feature-status.csv`
- Rows: `93`
- Columns: `22`
- Unique row key: `Story ID`
- Canonical issue key pattern: `UX-###`
- `Row Impact Severity` is the row-specific impact severity for this story, not the global severity of the referenced issue.

## Controlled Columns

### Coverage Class

- `Implemented API workflow`
- `Implemented feature or current workflow`
- `Implemented public workflow`
- `Implemented route alias`
- `Implemented route/API workflow`
- `Underrepresented persona/use case`

### Targeted Verification

- `TV-A11Y`
- `TV-ACCESS-PATH-CONTRACT`
- `TV-AI`
- `TV-ASSET-API`
- `TV-AUTH`
- `TV-COLLABORATION`
- `TV-DATA-MAPS`
- `TV-ESTIMATE-SHEET`
- `TV-FIELD-HANDOFF`
- `TV-INVITE`
- `TV-LIBRARY-SOURCING`
- `TV-OPS-SUPPORT`
- `TV-PROJECT-DASHBOARD`
- `TV-PUBLIC`
- `TV-ROUTE-ALIASES`
- `TV-SHARE-RECIPIENT`
- `TV-WORKSHOP-ADMIN`

### Feature Status

- `Implemented`
- `Implemented but beta/roadmap-sensitive`
- `Implemented with UX risk`
- `Implemented with beta gate`
- `Implemented with governance gaps`
- `Implemented with known validation risk`
- `Implemented with operational gaps`
- `Implemented with provider dependency`
- `Implemented with realtime risk`
- `Underrepresented / not explicit in current app`
- `Underrepresented / partially supported by data fields`
- `Underrepresented / partially supported by docs or scripts`
- `Underrepresented / partially supported by primitives`

### Row Impact Severity

- `High`
- `Medium`
- `Low`
- `None`

Meaning:

- `High`: row blocks beta safety, trust, access, supportability, or proof integrity.
- `Medium`: row materially affects confidence or workflow clarity.
- `Low`: row is useful but low-risk or future-facing.
- `None`: no formal issue; row may still contain a watch item in the error/fix fields.

### Evidence Status

The CSV currently uses granular evidence-status values. They are allowed because row nuance is useful, but all values must map to one of the proof levels below.

| Proof level | Current allowed values |
|---|---|
| Browser not run | `Browser proof not run` |
| Local test identified, not run | `Concrete local tests identified; not executed in second pass`; `Inventory only; related tests identified; not executed in second pass`; `Inventory only; route paths identified; not executed in second pass`; `Inventory only; operator workflow not executed`; `Related API/UI tests identified; not run in second pass`; `Related auth/storage tests identified; not run in second pass`; `Related consent/analytics tests identified; not run in second pass`; `Related publication/security tests identified; not run in second pass`; `Related route tests identified; not run in second pass`; `Related route/E2E coverage identified; not run in second pass` |
| Related tests only | `Related chart tests only; owner alert story not covered`; `Related collaboration tests only; access-path-specific story not covered`; `Related collaboration tests only; story not executed`; `Related component/API tests only; persona story not executed`; `Related publication tests only; owner lifecycle story not covered`; `Related recipient print tests only; field workflow not covered`; `Related tests only; approval story not covered`; `Related tests only; persona workflow not executed`; `Related tests only; readiness story not executed`; `Related version tests only; story not executed`; `Related workbook tests only; field package not covered` |
| Source/static only | `Source evidence only; missing user-story test`; `Source/static reviewed; not executed in second pass` |
| Provider not run | `Provider proof not run`; `Provider/runtime proof needed for live events` |
| Broad validation blocked | `Known red or blocked broad validation; targeted proof required` |

New evidence-status values require updating this table and the validator command before use.

## Watch Items

Rows with `Issue IDs=None` may still have `Current UX Or Logistical Error`, `Best Fix`, and `Post Fix Scenario` content. Treat those as watch items, not formal `UX-*` defects. A watch item becomes a formal issue only when:

- It has a concrete user-impact scenario.
- It needs implementation work or release gating.
- It receives a new `UX-*` ID in the issue log and post-fix scenario file.

## Scope Posture And Decision-Gate Cross-Walk

`02-implementation-decomposition.md` uses a free-text `Scope posture` column (Existing surface, Existing surface/provider, New workflow, Decision required, Validation-signal repair, etc.). It is a PLANNING column in doc 02, not a CSV column, and is intentionally absent from the CSV controlled vocabulary. The CSV stays at 22 columns by design.

| Scope posture | Priority tier (doc 01) | Decision-ledger treatment |
|---|---|---|
| Existing surface / Copy-state hardening / Validation-signal repair | P0–P2 per doc 01 | None unless it also touches a gated boundary |
| Existing surface/provider, Provider/proof readiness | P0–P2 per doc 01 | None; provider proof is a `TV-OPS-SUPPORT` residual |
| New workflow | usually P1–P2 | Requires a `DEC-UX-*` row when it adds a surface/role/data model |
| Decision required / Decision required/provider | orthogonal to P0–P2 | MUST link a `DEC-UX-*` row in `09` before code |

`01-beta-product-thesis-and-prioritization.md` defines a `Decision-gated` concept that is ORTHOGONAL to the P0/P1/P2 tiers: an issue has a P0/P1/P2 tier AND is optionally decision-gated. A row is decision-gated when its doc-02 scope posture is `Decision required` or it is linked to a `DEC-UX-*` row in `09-decision-ledger.md`. Decision-gating is therefore reachable from doc 02 (scope posture) and doc 09 (`DEC-UX-*`); the agent brief's stop-condition checks those sources, not the CSV. Priority itself is doc-scoped (doc 01 + doc 02) and verified by the priority-agreement cross-check below, not carried as a CSV column.

## Validation Commands

Run from repo root after editing the packet:

```sh
ruby -rcsv -e 'rows=CSV.read(ARGV[0], headers:true); raise "headers=#{rows.headers.size}" unless rows.headers.size==22; ids={}; rows.each{|r| id=r["Story ID"]; raise "blank story id" if id.to_s.empty?; ids[id]=(ids[id]||0)+1}; dup=ids.select{|_,n| n>1}; raise "duplicate story ids #{dup}" unless dup.empty?; puts "headers=#{rows.headers.size} rows=#{rows.size} dupes=0"' .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv
```

```sh
ruby -rcsv - .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv <<'RUBY'
allowed = {
  "Coverage Class" => [
    "Implemented API workflow",
    "Implemented feature or current workflow",
    "Implemented public workflow",
    "Implemented route alias",
    "Implemented route/API workflow",
    "Underrepresented persona/use case",
  ],
  "Targeted Verification" => [
    "TV-AI",
    "TV-ASSET-API",
    "TV-AUTH",
    "TV-COLLABORATION",
    "TV-DATA-MAPS",
    "TV-ESTIMATE-SHEET",
    "TV-FIELD-HANDOFF",
    "TV-INVITE",
    "TV-LIBRARY-SOURCING",
    "TV-OPS-SUPPORT",
    "TV-PROJECT-DASHBOARD",
    "TV-PUBLIC",
    "TV-ROUTE-ALIASES",
    "TV-SHARE-RECIPIENT",
    "TV-WORKSHOP-ADMIN",
  ],
  "Feature Status" => [
    "Implemented",
    "Implemented but beta/roadmap-sensitive",
    "Implemented with UX risk",
    "Implemented with beta gate",
    "Implemented with governance gaps",
    "Implemented with known validation risk",
    "Implemented with operational gaps",
    "Implemented with provider dependency",
    "Implemented with realtime risk",
    "Underrepresented / not explicit in current app",
    "Underrepresented / partially supported by data fields",
    "Underrepresented / partially supported by docs or scripts",
    "Underrepresented / partially supported by primitives",
  ],
  "Evidence Status" => [
    "Browser proof not run",
    "Concrete local tests identified; not executed in second pass",
    "Inventory only; related tests identified; not executed in second pass",
    "Inventory only; route paths identified; not executed in second pass",
    "Inventory only; operator workflow not executed",
    "Related API/UI tests identified; not run in second pass",
    "Related auth/storage tests identified; not run in second pass",
    "Related consent/analytics tests identified; not run in second pass",
    "Related publication/security tests identified; not run in second pass",
    "Related route tests identified; not run in second pass",
    "Related route/E2E coverage identified; not run in second pass",
    "Related chart tests only; owner alert story not covered",
    "Related collaboration tests only; access-path-specific story not covered",
    "Related collaboration tests only; story not executed",
    "Related component/API tests only; persona story not executed",
    "Related publication tests only; owner lifecycle story not covered",
    "Related recipient print tests only; field workflow not covered",
    "Related tests only; approval story not covered",
    "Related tests only; persona workflow not executed",
    "Related tests only; readiness story not executed",
    "Related version tests only; story not executed",
    "Related workbook tests only; field package not covered",
    "Source evidence only; missing user-story test",
    "Source/static reviewed; not executed in second pass",
    "Provider proof not run",
    "Provider/runtime proof needed for live events",
    "Known red or blocked broad validation; targeted proof required",
  ],
  "Row Impact Severity" => ["High", "Medium", "Low", "None"],
}

rows = CSV.read(ARGV.fetch(0), headers: true)
bad = []
allowed.each do |header, values|
  rows.each_with_index do |row, index|
    value = row[header].to_s
    bad << "#{header}:#{index + 2}:#{value}" unless values.include?(value)
  end
end
raise bad.join("\n") unless bad.empty?
puts "controlled_vocab=ok"
RUBY
```

```sh
ruby -rcsv -e 'rows=CSV.read(ARGV[0], headers:true); ids=rows.flat_map{|r| r["Issue IDs"].to_s.scan(/UX-\d+/)}.uniq; issue_log=File.read(ARGV[1]).scan(/UX-\d+/).uniq; post=File.read(ARGV[2]).scan(/UX-\d+/).uniq; missing_log=ids-issue_log; missing_post=ids-post; raise "missing issue log #{missing_log}" unless missing_log.empty?; raise "missing post fix #{missing_post}" unless missing_post.empty?; puts "csv_issue_ids=#{ids.size} missing_issue_log=0 missing_post_fix=0"' .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/post-fix-scenario-tests.md
```

```sh
ruby -rcsv -e 'rows=CSV.read(ARGV[0], headers:true); missing=[]; rows.each_with_index{|r,i| r["Source Evidence"].to_s.split(/;\s*/).each{|p| p=p.strip; next if p.empty?; if p=="package.json" || p.start_with?("src/", "supabase/", "tests/", "e2e/", "scripts/", ".ai/"); missing << "#{i+2}:#{r["Story ID"]}:#{p}" unless File.exist?(p); elsif p.include?("/") || p.end_with?(".ts", ".tsx", ".js", ".mjs", ".css"); missing << "#{i+2}:#{r["Story ID"]}:#{p}"; end }}; raise missing.join("\n") unless missing.empty?; puts "source_paths=ok"' .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv
```

### Inventory drift guard (5th validator)

Re-derives the three test-inventory counts cited in `06` and `testing-loop-and-validation.md` and exits non-zero on drift (would have caught the 2026-06-22 425→429 vitest anchor). Canonical command, host-Ruby compatibility notes, and the drift-remediation protocol live in `12-keystone-code-binding-and-drift-protection.md` §3 and §5.

### Conflict-matrix coverage invariant

Asserts every `UX-001..UX-044` appears in at least one conflict group in `03-sequencing-dependencies-and-conflicts.md` (would have caught the 12 previously-unassigned issues):

```sh
ruby -e 'all=%w[UX-001 UX-002 UX-003 UX-004 UX-005 UX-006 UX-007 UX-008 UX-009 UX-010 UX-011 UX-012 UX-013 UX-014 UX-015 UX-016 UX-017 UX-018 UX-019 UX-020 UX-021 UX-022 UX-023 UX-024 UX-025 UX-026 UX-027 UX-028 UX-029 UX-030 UX-031 UX-032 UX-033 UX-034 UX-035 UX-036 UX-037 UX-038 UX-039 UX-040 UX-041 UX-042 UX-043 UX-044]; doc=File.read(ARGV[0]); have=all.select{|id| doc.include?(id)}; missing=all-have; raise "conflict-matrix missing #{missing}" unless missing.empty?; puts "conflict_coverage=ok have=#{have.size}/44"' .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md
```

### Priority-agreement cross-check (doc-scoped)

Priority tiers are intentionally doc-scoped (`01` + `02`), not a CSV column. This checks the two priority tables reference the same issue set; per-issue tier parity remains a human review:

```sh
ruby -e 'd1=File.read(ARGV[0]).scan(/UX-\d+/).uniq.sort; d2=File.read(ARGV[1]).scan(/UX-\d+/).uniq.sort; raise "doc01/doc02 issue-set mismatch d1-only=#{d1-d2} d2-only=#{d2-d1}" unless d1==d2; puts "priority_issue_set=ok count=#{d1.size}"' .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/01-beta-product-thesis-and-prioritization.md .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md
```

Also run:

```sh
git diff --check -- .ai/16_user-experience
```

## Schema Change Rules

1. Do not add a new CSV column without updating this file, `README.md`, and `testing-loop-and-validation.md`.
2. Do not add a new `TV-*` ID without defining it in the manifest and verification runbook.
3. Do not add a new `UX-*` ID without adding it to the issue log and post-fix scenario tests.
4. Do not promote proof status without naming the evidence artifact.
5. Do not delete raw agent reports just because they are stale; canonical docs supersede raw reports.
