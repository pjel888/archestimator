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
