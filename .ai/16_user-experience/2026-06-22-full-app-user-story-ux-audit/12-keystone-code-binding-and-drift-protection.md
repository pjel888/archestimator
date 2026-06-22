# Keystone: Code Binding And Drift Protection

Date: 2026-06-22

## 1. Purpose And How To Use

This is the keystone binding document for the audit packet. It exists for one reason: **every numeric anchor, cited path, script name, migration filename, and provider ID that the other docs in this packet treat as fact must resolve to real code, and the resolution must be re-checkable with a single copy-paste command.**

It closes the gap that let `tests/vitest` be cited as `425` files across `06-verification-matrix-and-proof-runbook.md` and `testing-loop-and-validation.md` while the live count had already drifted to `429`. The packet's four ruby validators (in `08-csv-schema-and-validation-contract.md`) guard the CSV's internal consistency; they do not guard the test/script/provider anchors that the prose docs cite. This document adds that guard.

How to use it:

- **Before any status promotion or "implemented" claim** in `canonical-feature-status.csv`, run the relevant row in the Verified Binding Registry (Section 2) and paste the observed output into the change note. If the observed value differs from the "Current truth" column, follow the Drift Remediation Protocol (Section 5) before proceeding.
- **Before merging any packet edit**, run the Fifth Validator (Section 3) and the Binding-Integrity Sweep (Section 4). Both must pass.
- **Treat this document as the single source of truth for hard-coded counts.** `06`, `testing-loop-and-validation.md`, and `README.md` may repeat the counts for readability, but the registry here is authoritative; on conflict, the registry wins and the prose doc is the one that gets updated.

Scope boundary (residual, see Section 6): this document proves that the cited tests, scripts, migrations, and provider IDs *exist and are bound to the right symbol*. It does not prove that the cited tests *pass* today, nor that the cited scripts *succeed* against hosted providers. Those are execution-proven elsewhere (or honestly marked as not-yet-run).

## 2. Verified Binding Registry

Run every command from the repo root. "Current truth" values were re-derived live on 2026-06-22 by the audit that produced this document.

| Anchor class | Verify command (copy-paste) | Current truth (as of 2026-06-22) | Notes |
|---|---|---|---|
| Vitest file count | `rg --files tests/vitest \| wc -l` | `429` | `06` and `testing-loop-and-validation.md` previously said `425`; that was stale. The Fifth Validator below pins `429`. |
| Playwright/e2e file count | `find e2e -type f \| wc -l` | `21` | Matches `06` and `testing-loop-and-validation.md`. `find -type f` (not `rg --files`) is canonical because e2e specs may sit beside non-`.ts` fixtures. |
| Bun unit file count | `rg --files tests/unit \| wc -l` | `5` | Matches `06` and `testing-loop-and-validation.md`. |
| bun script `test:e2e` | `node -e "console.log(require('./package.json').scripts['test:e2e'])"` | defined | Non-empty string. |
| bun script `launch:verify-hosted-auth` | `node -e "console.log(require('./package.json').scripts['launch:verify-hosted-auth'])"` | defined | Non-empty string. |
| bun script `launch:check-resend-readiness` | `node -e "console.log(require('./package.json').scripts['launch:check-resend-readiness'])"` | defined | Non-empty string. |
| bun script `launch:check-vercel-env` | `node -e "console.log(require('./package.json').scripts['launch:check-vercel-env'])"` | defined | Non-empty string. |
| bun script `launch:check-vercel-health` | `node -e "console.log(require('./package.json').scripts['launch:check-vercel-health'])"` | defined | Non-empty string. |
| bun script `launch:check-support-dns` | `node -e "console.log(require('./package.json').scripts['launch:check-support-dns'])"` | defined | Non-empty string. |
| bun script `launch:check-support-monitoring` | `node -e "console.log(require('./package.json').scripts['launch:check-support-monitoring'])"` | defined | Non-empty string. |
| bun script `launch:check-legal-owner` | `node -e "console.log(require('./package.json').scripts['launch:check-legal-owner'])"` | defined | Non-empty string. |
| bun script `launch:check-supabase-linked-readiness` | `node -e "console.log(require('./package.json').scripts['launch:check-supabase-linked-readiness'])"` | defined | Non-empty string. |
| bun script `launch:check-supabase-migrations` | `node -e "console.log(require('./package.json').scripts['launch:check-supabase-migrations'])"` | defined | Non-empty string. |
| bun script `launch:check-supabase-backup` | `node -e "console.log(require('./package.json').scripts['launch:check-supabase-backup'])"` | defined | Non-empty string. |
| bun script `launch:supabase-readiness` | `node -e "console.log(require('./package.json').scripts['launch:supabase-readiness'])"` | defined | Non-empty string. |
| bun script `launch:check-vercel-production` | `node -e "console.log(require('./package.json').scripts['launch:check-vercel-production'])"` | defined | Non-empty string. |
| bun script `launch:verify-hosted-sensitive-routes` | `node -e "console.log(require('./package.json').scripts['launch:verify-hosted-sensitive-routes'])"` | defined | Non-empty string. |
| bun script `launch:verify-hosted-export` | `node -e "console.log(require('./package.json').scripts['launch:verify-hosted-export'])"` | defined | Non-empty string. |
| bun script `perf:check-routes` | `node -e "console.log(require('./package.json').scripts['perf:check-routes'])"` | defined | Non-empty string. |
| bun script `perf:measure-routes` | `node -e "console.log(require('./package.json').scripts['perf:measure-routes'])"` | defined | Non-empty string. |
| bun script `validate` | `node -e "console.log(require('./package.json').scripts['validate'])"` | defined | Non-empty string. Broad `bun run validate` is recorded as red/hanging in `testing-loop-and-validation.md`; existence here does not imply it currently passes. |
| Supabase provider project ID | `rg -n 'ebxxqidacheyapmmzavr' package.json` | defined in `gen:types` on `package.json:20` | Also referenced from e2e cookie names, readiness scripts, and hosted proof scripts. This is the canonical linked-project ref for the Archestimator Supabase boundary cited in `05`/`06`. |
| Ruby validator 1 — CSV shape | `ruby -rcsv -e '...' canonical-feature-status.csv` (full command in `08`) | PASS: `headers=22 rows=93 dupes=0` | Defined in `08-csv-schema-and-validation-contract.md` ("Validation Commands", first block). |
| Ruby validator 2 — controlled vocab | `ruby -rcsv - ...` heredoc (full command in `08`) | PASS: `controlled_vocab=ok` | Defined in `08`, second block. |
| Ruby validator 3 — issue cross-ref | `ruby -rcsv -e '...' canonical-feature-status.csv ux-logistical-errors-and-fixes.md post-fix-scenario-tests.md` | PASS: `csv_issue_ids=44 missing_issue_log=0 missing_post_fix=0` | Defined in `08`, third block. |
| Ruby validator 4 — source-evidence paths | `ruby -rcsv -e '...' canonical-feature-status.csv` | PASS: `source_paths=ok` | Defined in `08`, fourth block. |

Conventions for the "Verify command" column:

- For `bun run <name>` scripts, the canonical existence check is `node -e "console.log(require('./package.json').scripts['<name>'])"`. The alternative `rg -n '"<name>"' package.json` also works but is less precise (it can match a substring of another script name); prefer the `node -e` form.
- Counts use the exact command shape already used elsewhere in the packet (`rg --files ... | wc -l` for vitest/unit, `find e2e -type f | wc -l` for e2e). Do not substitute `ls` or glob expansion; the command shape is part of the contract.

## 3. Fifth Validator — Inventory Drift Guard

This is the fifth ruby validator. It belongs in the same "Validation Commands" section of `08-csv-schema-and-validation-contract.md` (that doc should reference this section as the canonical command). It re-runs the three inventory count commands, compares them against the values pinned in this registry, and exits non-zero on drift so a CI gate or pre-merge check fails loudly instead of letting `425 -> 429` slip past silently.

Run from repo root:

```sh
ruby -e '
expected = { "tests/vitest" => 429, "tests/unit" => 5 }
expected_e2e = 21
def count(cmd); %x(#{cmd}).strip.to_i; end
vitest = count("rg --files tests/vitest | wc -l")
unit   = count("rg --files tests/unit | wc -l")
e2e    = count("find e2e -type f | wc -l")
drift = []
drift << "tests/vitest: expected #{expected["tests/vitest"]}, got #{vitest}" unless vitest == expected["tests/vitest"]
drift << "tests/unit: expected #{expected["tests/unit"]}, got #{unit}"       unless unit   == expected["tests/unit"]
drift << "e2e: expected #{expected_e2e}, got #{e2e}"                          unless e2e    == expected_e2e
unless drift.empty?
  warn "INVENTORY DRIFT (see 12-keystone-code-binding-and-drift-protection.md #5):"
  warn drift.join("\n")
  exit 1
end
puts "inventory_counts=ok vitest=#{vitest} unit=#{unit} e2e=#{e2e}"
'
```

Expected output on 2026-06-22: `inventory_counts=ok vitest=429 unit=5 e2e=21`. Verified live on the audit host (Ruby 2.6.10p210, universal.arm64e-darwin25).

Notes:

- The expected values are intentionally hard-coded *in this registry* (and only here). When the live count changes, update the hard-coded value in this Section 3 AND in the Section 2 table in the same edit, following Section 5.
- The validator uses backtick `%x(...)` so it shells out to the real `rg`/`find`, exactly matching the commands a human would run. Do not "optimize" it to use Ruby's `Dir.glob` — that would diverge from the canonical command shapes and reintroduce the class of drift this guard exists to catch.
- The canonical block uses the Ruby 2.6.x-compatible `def count(cmd); ...; end` form (a standard `def/end` method body) so it runs unchanged on the audit host's Ruby 2.6.10p210 and on Ruby 3.x. If you rewrite it with the Ruby 3.0+ endless-method shorthand (`def count(cmd) = %x(...)`), it will raise `SyntaxError` on Ruby < 3.0; do not make that change without confirming the host Ruby version.

## 4. Binding-Integrity Sweep

This is the recurring procedure that `testing-loop-and-validation.md` should reference as "run the binding-integrity sweep from `12-keystone...md #4` before declaring the packet clean." It re-derives every hard-coded count, every cited route path, every cited migration filename, and every cited script name against the live repo and reports deltas. Run it from repo root after any edit to the packet or to the cited code.

### 4a. Re-derive the three inventory counts

```sh
echo "vitest=$(rg --files tests/vitest | wc -l | tr -d ' ')"
echo "unit=$(rg --files tests/unit | wc -l | tr -d ' ')"
echo "e2e=$(find e2e -type f | wc -l | tr -d ' ')"
```

Compare each printed value to the Section 2 "Current truth" column. Any mismatch is drift.

### 4b. Verify every cited `bun run` script still exists

For the 18 scripts named in Section 2:

```sh
for s in test:e2e launch:verify-hosted-auth launch:check-resend-readiness launch:check-vercel-env launch:check-vercel-health launch:check-support-dns launch:check-support-monitoring launch:check-legal-owner launch:check-supabase-linked-readiness launch:check-supabase-migrations launch:check-supabase-backup launch:supabase-readiness launch:check-vercel-production launch:verify-hosted-sensitive-routes launch:verify-hosted-export perf:check-routes perf:measure-routes validate; do
  node -e "process.exit(require('./package.json').scripts['$s'] ? 0 : 1)" && echo "OK   $s" || echo "MISS $s"
done
```

Any `MISS` line is drift (a script was renamed or removed).

### 4c. Verify the provider ID and cited migrations

```sh
rg -c 'ebxxqidacheyapmmzavr' package.json && echo "provider_id=ok" || echo "provider_id=DRIFT"
for m in 20260621120000_shared_link_d1_d11_hardening.sql 20260601003000_security_rate_limit_events.sql; do
  [ -f "supabase/migrations/$m" ] && echo "OK   $m" || echo "MISS $m"
done
```

### 4d. Verify every repo-local `Source Evidence` path cited in the CSV still resolves

This re-uses validator 4's logic but lists the missing paths instead of failing on the first:

```sh
ruby -rcsv -e '
rows = CSV.read(ARGV[0], headers: true)
missing = []
rows.each_with_index do |r, i|
  r["Source Evidence"].to_s.split(/;\s*/).each do |p|
    p = p.strip
    next if p.empty?
    if p == "package.json" || p.start_with?("src/", "supabase/", "tests/", "e2e/", "scripts/", ".ai/")
      missing << "row #{i+2} #{r["Story ID"]}: #{p}" unless File.exist?(p)
    end
  end
end
puts missing.empty? ? "source_paths=ok" : "MISSING_PATHS:\n#{missing.join("\n")}"
' .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv
```

### 4e. Sweep the prose docs for hard-coded counts that should match the registry

The three counts (`429`, `21`, `5`) are repeated for readability in `06-verification-matrix-and-proof-runbook.md`, `testing-loop-and-validation.md`, and `README.md`. After updating the registry value, confirm those docs no longer carry the old value:

```sh
rg -n '\b425\b' .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/
```

A hit for the *old* vitest count is drift that Section 5 fixes. (On 2026-06-22 this command still reports `425` in `06` and `testing-loop-and-validation.md`; those are the two docs this keystone supersedes — see Section 5.)

## 5. Drift Remediation Protocol

When any step of the Section 4 sweep (or the Section 3 validator) reports a delta:

1. **Do not silently re-hardcode.** The whole point of this document is that a hard-coded count is a load-bearing claim. A silent overwrite hides whether the underlying inventory legitimately grew (a new test file was added) or the doc was wrong all along (the `425 -> 429` case).
2. **Confirm the live value is correct**, not a tooling artifact. Re-run the bare command (`rg --files tests/vitest | wc -l`) by hand. If a path was renamed/moved, decide whether the new location is the new canonical path before accepting the new count.
3. **Update the registry first.** Change the "Current truth" value in the Section 2 table AND the matching hard-coded value in the Section 3 validator, in the same commit. Both must move together; the validator enforces the table.
4. **Add a dated drift note** at the bottom of this section recording: the old value, the new value, the date, the cause (e.g. "added 4 new vitest files under `tests/vitest/share/`"), and which prose docs were updated in step 5.
5. **Propagate to the prose docs.** Update the repeated counts in `06-verification-matrix-and-proof-runbook.md` ("Current Test Inventory"), `testing-loop-and-validation.md` ("Test Inventory Evidence" and "Validation Commands Run For This Documentation Pack"), and `README.md` if it cites a count. Re-run Section 4e to confirm no `425`-style stragglers remain.
6. **Re-run the full sweep** (Section 4) and the four `08` validators plus the Section 3 validator. All six must pass before the packet is declared clean.

Drift log:

- **2026-06-22 (initial):** Establishing this keystone. The packet previously cited `425` vitest files in `06` and `testing-loop-and-validation.md`; live `rg --files tests/vitest | wc -l` returns `429`. Cause: vitest inventory grew by 4 files after the docs were written. Registry pins `429`. Per step 5, the `425` references in `06` and `testing-loop-and-validation.md` are the prose-doc updates this keystone requires (owned by the docs' own improvement pass, not this file). `21` e2e and `5` unit were already correct.

## 6. Residuals And What This Document Does NOT Prove

Honesty boundary — this document is a *binding* proof, not an *execution* proof:

- **Existence, not pass-state.** Every test file, script, migration, and symbol cited above is shown to *exist* and to *resolve to the right identifier*. This document does not run the tests and does not claim they pass. `testing-loop-and-validation.md` records that broad `bun run validate` and all-DOM runs are currently red/hanging; that status is unchanged by this document.
- **Script existence, not hosted success.** The `bun run launch:*`, `perf:*`, and `test:e2e` scripts are shown to be *defined*. Whether they succeed against hosted Supabase, Resend, Vercel, Maps, or monitoring is provider proof tracked under `TV-OPS-SUPPORT` and the Provider Proof Runbook in `06`, not here.
- **Provider ID, not provider health.** `ebxxqidacheyapmmzavr` is shown to be the project ref wired into `gen:types` and the readiness scripts. Whether that linked project is healthy, has current migrations applied, and matches the local migration set is a `TV-OPS-SUPABASE` concern, not a binding concern.
- **Validator correctness, not validator completeness.** The four `08` validators and the Section 3 fifth validator guard the CSV shape/vocab/cross-refs/source-paths and the three inventory counts. They do not guard: route-path reachability under Next.js routing, migration *content* (only filename existence), or that a cited `src/` path's symbol still has the semantics the prose doc claims. Those remain targeted-verification (`TV-*`) and code-review concerns.
- **Ruby host version.** The validators target Ruby 2.6.x compatibility (the audit host is Ruby 2.6.10p210). Section 3 deliberately uses the `def count(cmd); ...; end` form — NOT the Ruby 3.0+ endless-method shorthand — so it runs unchanged on Ruby 2.6 and 3.x. TODO-verify: confirm the CI/pre-merge runner's Ruby version is >= 2.6 before pinning the Section 3 validator as a gate.
