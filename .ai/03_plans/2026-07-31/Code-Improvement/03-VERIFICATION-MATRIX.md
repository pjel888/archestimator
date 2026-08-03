# Unit Verification Matrix

This file supplies the exact evidence contract omitted by broad phrases such as
"focused tests" or "budget improves." Planned test files are created inside the
owning unit; no unit may substitute a weaker existing test.

## Command Contract

Durable plan decisions named in the plan-state sections remain under
`$pack/evidence` and are part of the reviewed candidate. Generated test,
browser, candidate, author, review, quality, and GitNexus receipts must instead
be written under the repository-ignored `.tmp/code-improvement` root. This
prevents a receipt from changing the candidate digest that it claims to prove.
Every command resolves the comparison base from `plan-pack.json`; neither an
ambient `QUALITY_BASE` nor an implicit merge base is accepted.

Before any evidence command, establish the immutable roots:

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$runtimeRoot = ".tmp/code-improvement"
$manifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
$expectedBaseline = "93d5124d268a1b6016f63f8a8e5e69e118630d13"
if ([string]$manifest.baseline.head -ne $expectedBaseline) {
  throw "Manifest attempted to move the immutable package baseline."
}
$baseline = $expectedBaseline
$resolvedBaseline = (git rev-parse --verify "$baseline^{commit}").Trim().ToLowerInvariant()
if ($LASTEXITCODE -ne 0 -or $resolvedBaseline -ne $baseline) {
  throw "Manifest baseline is missing or does not resolve exactly."
}
git merge-base --is-ancestor $baseline HEAD
if ($LASTEXITCODE -ne 0) { throw "Manifest baseline is not an ancestor of HEAD." }
git check-ignore -q -- "$runtimeRoot/probe.json"
if ($LASTEXITCODE -ne 0) { throw "Runtime evidence root is not Git-ignored." }
New-Item -ItemType Directory -Force "$runtimeRoot/evidence" | Out-Null
```

Every unit has a Q2 minimum because `UNIT-000` changes the quality system and
the fixed package baseline makes every later candidate cumulative. The flow
first classifies without a forced profile, then selects Q2 unless the natural
result is Q3. It never requests Q2 against a naturally Q3 candidate.

Each unit first atomically stages every tracked result, including its
provisional `VERIFIED`/decision state, affected criterion/test/evidence rows,
next-unit/ready-slice transition, `updated_at`, and refreshed manifest seal.
That state is accepted only when the exact-candidate gate passes; failure
reopens the unit and reseals an active manifest. After those tracked writes, and
before any focused, browser, decision, authority, or integrated evidence, freeze
the canonical candidate:

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$runtimeRoot = ".tmp/code-improvement"
$expectedBaseline = "93d5124d268a1b6016f63f8a8e5e69e118630d13"
$manifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
if ([string]$manifest.baseline.head -ne $expectedBaseline) {
  throw "Manifest attempted to move the immutable package baseline."
}
$baseline = $expectedBaseline
$stem = "<UNIT_ID>".ToLowerInvariant()
$naturalClassificationPath = "$runtimeRoot/evidence/$stem-classification-natural.json"
$classificationPath = "$runtimeRoot/evidence/$stem-classification.json"
$candidatePath = "$runtimeRoot/evidence/$stem-candidate.json"
foreach ($path in @($naturalClassificationPath, $classificationPath, $candidatePath)) {
  git check-ignore -q -- $path
  if ($LASTEXITCODE -ne 0) { throw "Candidate artifact is not Git-ignored: $path" }
}
bun scripts/quality/classify.ts --base $baseline --output $naturalClassificationPath
if ($LASTEXITCODE -ne 0) { throw "Candidate classification failed." }
$naturalClassification = Get-Content -LiteralPath $naturalClassificationPath -Raw | ConvertFrom-Json
if ($naturalClassification.status -ne "PASS") { throw "Natural classification is not PASS." }
$selectedProfile = if ($naturalClassification.data.profile -eq "Q3_RELEASE_GATE") {
  "Q3_RELEASE_GATE"
} else {
  "Q2_CRITICAL_CHANGE_GATE"
}
bun scripts/quality/classify.ts --base $baseline --profile $selectedProfile --output $classificationPath
if ($LASTEXITCODE -ne 0) { throw "Selected-profile classification failed." }
$classification = Get-Content -LiteralPath $classificationPath -Raw | ConvertFrom-Json
if ($classification.status -ne "PASS" -or $classification.data.profile -ne $selectedProfile) {
  throw "Selected profile was not applied exactly."
}
bun scripts/quality/candidate.ts --base $baseline --classification $classificationPath --output $candidatePath
if ($LASTEXITCODE -ne 0) { throw "Candidate construction failed." }
$candidate = Get-Content -LiteralPath $candidatePath -Raw | ConvertFrom-Json
if ($candidate.status -ne "PASS" -or
    $candidate.data.record.comparison_base.resolved_sha -ne $baseline -or
    $candidate.data.record.commit_sha -ne (git rev-parse HEAD).Trim().ToLowerInvariant()) {
  throw "Canonical candidate does not bind the manifest baseline and current HEAD."
}
```

For every row with a focused test, run the literal test only after that freeze,
then bind its exact bytes to the frozen candidate:

```powershell
$runtimeRoot = ".tmp/code-improvement"
$stem = "<UNIT_ID>".ToLowerInvariant()
$candidate = Get-Content -LiteralPath "$runtimeRoot/evidence/$stem-candidate.json" -Raw | ConvertFrom-Json
$focusedReceipt = "$runtimeRoot/<FOCUSED_RECEIPT>"
$focusedBinding = "$focusedReceipt.binding.json"
foreach ($path in @($focusedReceipt, $focusedBinding)) {
  git check-ignore -q -- $path
  if ($LASTEXITCODE -ne 0) { throw "Focused receipt is not Git-ignored: $path" }
}
bunx vitest run --maxWorkers=1 <FOCUSED_TEST> --reporter=json --outputFile=$focusedReceipt
if ($LASTEXITCODE -ne 0) { throw "Focused verification failed." }
[pscustomobject]@{
  kind = "candidate-bound-focused-evidence"
  result = "PASS"
  candidate_sha256 = $candidate.data.sha256
  commit_sha = $candidate.data.record.commit_sha
  comparison_base = $candidate.data.record.comparison_base.resolved_sha
  artifact = $focusedReceipt
  artifact_sha256 = (Get-FileHash -Algorithm SHA256 $focusedReceipt).Hash.ToLowerInvariant()
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $focusedBinding -Encoding utf8
```

Reviewers receive `data.sha256` and `data.record.commit_sha` from the frozen
candidate after all applicable focused/browser/decision evidence passes. All
generated evidence, review, and author receipts live under `$runtimeRoot` and
cannot alter the Git candidate. After the receipts exist, reconstruct once with
`--expected`; this proves the candidate stayed unchanged across evidence and
review before running the verifier:

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$runtimeRoot = ".tmp/code-improvement"
$expectedBaseline = "93d5124d268a1b6016f63f8a8e5e69e118630d13"
$manifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
if ([string]$manifest.baseline.head -ne $expectedBaseline) {
  throw "Manifest attempted to move the immutable package baseline."
}
$baseline = $expectedBaseline
$stem = "<UNIT_ID>".ToLowerInvariant()
$naturalClassificationPath = "$runtimeRoot/evidence/$stem-classification-natural.json"
$classificationPath = "$runtimeRoot/evidence/$stem-classification.json"
$candidatePath = "$runtimeRoot/evidence/$stem-candidate.json"
$candidateRecheckPath = "$runtimeRoot/evidence/$stem-candidate-recheck.json"
$candidate = Get-Content -LiteralPath $candidatePath -Raw | ConvertFrom-Json
$candidateSha256 = [string]$candidate.data.sha256
$candidateCommitSha = [string]$candidate.data.record.commit_sha
$selectedProfile = [string]$candidate.data.record.profile
if ($selectedProfile -notin @("Q2_CRITICAL_CHANGE_GATE", "Q3_RELEASE_GATE")) {
  throw "Frozen candidate is below the required Q2 minimum."
}

$evidenceBindingPaths = @(
  "<FOCUSED_RECEIPT_BINDING>",
  "<BROWSER_RECEIPT_BINDING>"
) | Where-Object { $_ -ne "N/A" } | ForEach-Object { "$runtimeRoot/$_" }
foreach ($bindingPath in $evidenceBindingPaths) {
  $binding = Get-Content -LiteralPath $bindingPath -Raw | ConvertFrom-Json
  $boundArtifact = [string]$binding.artifact
  if ($binding.result -ne "PASS" -or
      $binding.candidate_sha256 -ne $candidateSha256 -or
      $binding.commit_sha -ne $candidateCommitSha -or
      $binding.comparison_base -ne $baseline -or
      -not (Test-Path -LiteralPath $boundArtifact -PathType Leaf) -or
      (Get-FileHash -Algorithm SHA256 $boundArtifact).Hash.ToLowerInvariant() -ne $binding.artifact_sha256) {
    throw "Decisive evidence is stale or bound to another candidate: $bindingPath"
  }
}

bun scripts/quality/classify.ts --base $baseline --output $naturalClassificationPath
if ($LASTEXITCODE -ne 0) { throw "Fresh natural classification failed." }
$naturalClassification = Get-Content -LiteralPath $naturalClassificationPath -Raw | ConvertFrom-Json
$freshSelectedProfile = if ($naturalClassification.data.profile -eq "Q3_RELEASE_GATE") {
  "Q3_RELEASE_GATE"
} else {
  "Q2_CRITICAL_CHANGE_GATE"
}
if ($naturalClassification.status -ne "PASS" -or $freshSelectedProfile -ne $selectedProfile) {
  throw "Candidate profile changed after review freeze."
}
bun scripts/quality/classify.ts --base $baseline --profile $selectedProfile --output $classificationPath
if ($LASTEXITCODE -ne 0) { throw "Fresh selected-profile classification failed." }
bun scripts/quality/candidate.ts --base $baseline --classification $classificationPath --expected $candidateSha256 --output $candidateRecheckPath
if ($LASTEXITCODE -ne 0) { throw "Candidate changed after review freeze." }
$candidateRecheck = Get-Content -LiteralPath $candidateRecheckPath -Raw | ConvertFrom-Json
if ($candidateRecheck.status -ne "PASS" -or
    $candidateRecheck.data.sha256 -ne $candidateSha256 -or
    $candidateRecheck.data.record.commit_sha -ne $candidateCommitSha) {
  throw "Candidate fingerprint recheck failed."
}

$reviewRelativePaths = @("<REVIEW_RECEIPTS>" -split ",")
if ($selectedProfile -eq "Q3_RELEASE_GATE") {
  $reviewRelativePaths += "evidence/$stem-review-release.json"
}
$reviewPaths = @($reviewRelativePaths | ForEach-Object { "$runtimeRoot/$_" })
$authorPath = "$runtimeRoot/<AUTHOR_IDS_RECEIPT>"
foreach ($path in @($reviewPaths) + @($authorPath, "$runtimeRoot/<QUALITY_RECEIPT>")) {
  git check-ignore -q -- $path
  if ($LASTEXITCODE -ne 0) { throw "Runtime receipt is not Git-ignored: $path" }
}

$authorEvidence = Get-Content -LiteralPath $authorPath -Raw | ConvertFrom-Json
$declaredAuthorIds = @($authorEvidence.author_ids)
$authorIds = @($declaredAuthorIds | Sort-Object -Unique)
$seedAuthorIds = @((Get-Content -LiteralPath "$pack/evidence/initial-plan-authors.json" -Raw | ConvertFrom-Json).author_ids)
if ($authorIds.Count -eq 0 -or
    $authorIds.Count -ne $declaredAuthorIds.Count -or
    @($declaredAuthorIds | Where-Object { $_ -notmatch "^[A-Za-z0-9_-]+$" }).Count -ne 0 -or
    ($declaredAuthorIds -join "`n") -cne (@($declaredAuthorIds | Sort-Object) -join "`n") -or
    $authorEvidence.candidate_sha256 -ne $candidateSha256 -or
    $authorEvidence.commit_sha -ne $candidateCommitSha -or
    @($seedAuthorIds | Where-Object { $_ -notin $authorIds }).Count -ne 0) {
  throw "Candidate author receipt is unsorted, incomplete, or bound to another candidate."
}
$reviewEvidence = @($reviewPaths | ForEach-Object {
  Get-Content -LiteralPath $_ -Raw | ConvertFrom-Json
})
$expectedReviewTypes = @("quality", "security")
if ($selectedProfile -eq "Q3_RELEASE_GATE") { $expectedReviewTypes += "release" }
for ($reviewIndex = 0; $reviewIndex -lt $reviewEvidence.Count; $reviewIndex++) {
  $review = $reviewEvidence[$reviewIndex]
  $parsedReviewTime = [DateTimeOffset]::MinValue
  if ($review.decision -ne "APPROVE" -or
      $review.review_type -ne $expectedReviewTypes[$reviewIndex] -or
      -not [DateTimeOffset]::TryParse([string]$review.reviewed_at, [ref]$parsedReviewTime) -or
      $review.read_only -ne $true -or
      $review.source -ne "local-agent" -or
      $review.reviewer_id -notmatch "^[A-Za-z0-9_-]+$" -or
      $review.candidate_sha256 -ne $candidateSha256 -or
      $review.commit_sha -ne $candidateCommitSha -or
      $review.reviewer_id -in $authorIds) {
    throw "Review is not an independent approval of the frozen candidate."
  }
}
$reviewerIds = @($reviewEvidence.reviewer_id | Sort-Object -Unique)
if ($reviewerIds.Count -ne $reviewEvidence.Count) {
  throw "Quality, security, and any release reviews require distinct reviewers."
}

$reviews = $reviewPaths -join ","
$qualityPath = "$runtimeRoot/<QUALITY_RECEIPT>"
bun scripts/quality/verify.ts --base $baseline --profile $selectedProfile --reviews $reviews --author-ids ($authorIds -join ",") --output $qualityPath
if ($LASTEXITCODE -ne 0) { throw "Critical verification failed." }
$quality = Get-Content -LiteralPath $qualityPath -Raw | ConvertFrom-Json
if ($quality.status -ne "PASS" -or
    $quality.data.classification.profile -ne $selectedProfile -or
    $quality.data.candidate.sha256 -ne $candidateSha256 -or
    $quality.data.candidate.commit_sha -ne $candidateCommitSha -or
    $quality.data.merge_base -ne $baseline) {
  throw "Quality receipt does not prove the frozen candidate and manifest baseline."
}
```

Each substitution is the exact literal value in the tables below; wildcard,
directory-wide, stale, skipped, or console-only receipts are invalid. Every
quality receipt must report `PASS`, the named profile, zero red/skipped required
evidence, the fixed manifest baseline, the frozen candidate digest, and the
current source revision. A `q2` filename records the minimum requested profile;
the receipt's classified profile is authoritative if it escalates to Q3.
`<FOCUSED_RECEIPT_BINDING>` is the focused receipt value plus `.binding.json`,
or `N/A`; `<BROWSER_RECEIPT_BINDING>` follows the same rule from the browser
table. The `--expected` reconstruction occurs after those bindings and review
receipts exist and must still match the original pre-evidence freeze.

## Independent Review Inputs

Review receipts must be generated against the exact candidate revision and be
authored by identities distinct from every value in the author receipt. Each
`AUTHOR_IDS_RECEIPT` contains `candidate_sha256`, `commit_sha`, and the sorted,
unique identities of every human, agent, or integration process that authored
any byte in the accumulated merge-base-to-worktree candidate, not only the
current unit implementer.

The verifier accepts only `quality`, `security`, and `release` review types. An
architect may perform the quality review for architecture units, but the receipt
uses `review_type: "quality"`; supplemental architecture reviews are not passed
as verifier inputs.

Every verifier review is exactly this schema, with `review_type` matching its
table position and `reviewed_at` an ISO-8601 timestamp:

```json
{
  "review_type": "quality",
  "reviewer_id": "stable-local-reviewer-id",
  "decision": "APPROVE",
  "candidate_sha256": "<64 lowercase hex>",
  "commit_sha": "<40 lowercase hex>",
  "reviewed_at": "2026-07-31T00:00:00.000Z",
  "read_only": true,
  "source": "local-agent"
}
```

| Unit | `REVIEW_RECEIPTS` | `AUTHOR_IDS_RECEIPT` |
| --- | --- | --- |
| `UNIT-000` | `evidence/unit-000-review-quality.json,evidence/unit-000-review-security.json` | `evidence/unit-000-candidate-authors.json` |
| `UNIT-001` | `evidence/unit-001-review-quality.json,evidence/unit-001-review-security.json` | `evidence/unit-001-candidate-authors.json` |
| `UNIT-002` | `evidence/unit-002-review-quality.json,evidence/unit-002-review-security.json` | `evidence/unit-002-candidate-authors.json` |
| `UNIT-003` | `evidence/unit-003-review-quality.json,evidence/unit-003-review-security.json` | `evidence/unit-003-candidate-authors.json` |
| `UNIT-004` | `evidence/unit-004-review-quality.json,evidence/unit-004-review-security.json` | `evidence/unit-004-candidate-authors.json` |
| `UNIT-005` | `evidence/unit-005-review-quality.json,evidence/unit-005-review-security.json` | `evidence/unit-005-candidate-authors.json` |
| `UNIT-006` | `evidence/unit-006-review-quality.json,evidence/unit-006-review-security.json` | `evidence/unit-006-candidate-authors.json` |
| `UNIT-007` | `evidence/unit-007-review-quality.json,evidence/unit-007-review-security.json` | `evidence/unit-007-candidate-authors.json` |
| `UNIT-008` | `evidence/unit-008-review-quality.json,evidence/unit-008-review-security.json` | `evidence/unit-008-candidate-authors.json` |
| `UNIT-009` | `evidence/unit-009-review-quality.json,evidence/unit-009-review-security.json` | `evidence/unit-009-candidate-authors.json` |
| `UNIT-010` | `evidence/unit-010-review-quality.json,evidence/unit-010-review-security.json` | `evidence/unit-010-candidate-authors.json` |
| `UNIT-011` | `evidence/unit-011-review-quality.json,evidence/unit-011-review-security.json` | `evidence/unit-011-candidate-authors.json` |
| `UNIT-012` | `evidence/unit-012-review-quality.json,evidence/unit-012-review-security.json` | `evidence/unit-012-candidate-authors.json` |
| `UNIT-013` | `evidence/unit-013-review-quality.json,evidence/unit-013-review-security.json` | `evidence/unit-013-candidate-authors.json` |
| `UNIT-014` | `evidence/unit-014-review-quality.json,evidence/unit-014-review-security.json` | `evidence/unit-014-candidate-authors.json` |
| `UNIT-015` | `evidence/unit-015-review-quality.json,evidence/unit-015-review-security.json` | `evidence/unit-015-candidate-authors.json` |
| `UNIT-016` | `evidence/unit-016-review-quality.json,evidence/unit-016-review-security.json` | `evidence/unit-016-candidate-authors.json` |
| `UNIT-017` | `evidence/unit-017-review-quality.json,evidence/unit-017-review-security.json` | `evidence/unit-017-candidate-authors.json` |
| `UNIT-018` | `evidence/unit-018-review-quality.json,evidence/unit-018-review-security.json` | `evidence/unit-018-candidate-authors.json` |
| `UNIT-019` | `evidence/unit-019-review-quality.json,evidence/unit-019-review-security.json` | `evidence/unit-019-candidate-authors.json` |
| `UNIT-020` | `evidence/unit-020-review-quality.json,evidence/unit-020-review-security.json` | `evidence/unit-020-candidate-authors.json` |
| `UNIT-021` | `evidence/unit-021-review-quality.json,evidence/unit-021-review-security.json` | `evidence/unit-021-candidate-authors.json` |
| `UNIT-022` | `evidence/unit-022-review-quality.json,evidence/unit-022-review-security.json` | `evidence/unit-022-candidate-authors.json` |
| `UNIT-023` | `evidence/unit-023-review-quality.json,evidence/unit-023-review-security.json` | `evidence/unit-023-candidate-authors.json` |
| `UNIT-024` | `evidence/unit-024-review-quality.json,evidence/unit-024-review-security.json` | `evidence/unit-024-candidate-authors.json` |
| `UNIT-025` | `evidence/unit-025-review-quality.json,evidence/unit-025-review-security.json` | `evidence/unit-025-candidate-authors.json` |
| `UNIT-026` | `evidence/unit-026-review-quality.json,evidence/unit-026-review-security.json` | `evidence/unit-026-candidate-authors.json` |
| `UNIT-027` | `evidence/unit-027-review-quality.json,evidence/unit-027-review-security.json` | `evidence/unit-027-candidate-authors.json` |
| `UNIT-028` | `evidence/unit-028-review-quality.json,evidence/unit-028-review-security.json` | `evidence/unit-028-candidate-authors.json` |
| `UNIT-029` | `evidence/unit-029-review-quality.json,evidence/unit-029-review-security.json` | `evidence/unit-029-candidate-authors.json` |
| `UNIT-030` | `evidence/unit-030-review-quality.json,evidence/unit-030-review-security.json` | `evidence/unit-030-candidate-authors.json` |
| `UNIT-031` | `evidence/unit-031-review-quality.json,evidence/unit-031-review-security.json` | `evidence/unit-031-candidate-authors.json` |
| `UNIT-032` | `evidence/unit-032-review-quality.json,evidence/unit-032-review-security.json` | `evidence/unit-032-candidate-authors.json` |
| `UNIT-033` | `evidence/unit-033-review-quality.json,evidence/unit-033-review-security.json` | `evidence/unit-033-candidate-authors.json` |
| `UNIT-034` | `evidence/unit-034-review-quality.json,evidence/unit-034-review-security.json` | `evidence/unit-034-candidate-authors.json` |
| `UNIT-035` | `evidence/unit-035-review-quality.json,evidence/unit-035-review-security.json` | `evidence/unit-035-candidate-authors.json` |
| `UNIT-036` | `evidence/unit-036-review-quality.json,evidence/unit-036-review-security.json` | `evidence/unit-036-candidate-authors.json` |
| `UNIT-037` | `evidence/unit-037-review-quality.json,evidence/unit-037-review-security.json` | `evidence/unit-037-candidate-authors.json` |
| `UNIT-038` | `evidence/unit-038-review-quality.json,evidence/unit-038-review-security.json` | `evidence/unit-038-candidate-authors.json` |
| `UNIT-039` | `evidence/unit-039-review-quality.json,evidence/unit-039-review-security.json` | `evidence/unit-039-candidate-authors.json` |
| `UNIT-040` | `evidence/unit-040-review-quality.json,evidence/unit-040-review-security.json` | `evidence/unit-040-candidate-authors.json` |
| `UNIT-041` | `evidence/unit-041-review-quality.json,evidence/unit-041-review-security.json` | `evidence/unit-041-candidate-authors.json` |
| `UNIT-042` | `evidence/unit-042-review-quality.json,evidence/unit-042-review-security.json` | `evidence/unit-042-candidate-authors.json` |
| `UNIT-043` | `evidence/unit-043-review-quality.json,evidence/unit-043-review-security.json` | `evidence/unit-043-candidate-authors.json` |
| `UNIT-044` | `evidence/unit-044-review-quality.json,evidence/unit-044-review-security.json` | `evidence/unit-044-candidate-authors.json` |
| `UNIT-045` | `evidence/unit-045-review-quality.json,evidence/unit-045-review-security.json` | `evidence/unit-045-candidate-authors.json` |
| `UNIT-046` | `evidence/unit-046-review-quality.json,evidence/unit-046-review-security.json` | `evidence/unit-046-candidate-authors.json` |
| `TECH-BLOCKED` | `evidence/tech-blocked-review-quality.json,evidence/tech-blocked-review-security.json` | `evidence/tech-blocked-candidate-authors.json` |
| `INTEGRATED` | `evidence/integrated-review-quality.json,evidence/integrated-review-security.json` | `evidence/integrated-candidate-authors.json` |

Every browser row uses the repository's complete configured browser/device
matrix, not the Chromium-only smoke profile:

```powershell
$runtimeRoot = ".tmp/code-improvement"
$stem = "<UNIT_ID>".ToLowerInvariant()
$candidate = Get-Content -LiteralPath "$runtimeRoot/evidence/$stem-candidate.json" -Raw | ConvertFrom-Json
$previousBrowserMatrix = $env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX
$env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX = "1"
try {
  $browserReceipt = "$runtimeRoot/<BROWSER_RECEIPT>"
  $browserBinding = "$browserReceipt.binding.json"
  foreach ($path in @($browserReceipt, $browserBinding)) {
    git check-ignore -q -- $path
    if ($LASTEXITCODE -ne 0) { throw "Browser receipt is not Git-ignored: $path" }
  }
  bun scripts/quality/run-evidence-command.ts --artifact $browserReceipt --evidence-id <UNIT_ID>-browser-matrix -- bunx playwright test <BROWSER_SPEC> --project=chromium --project=firefox --project=webkit --project=mobile-safari --project=iphone-se --project=ipad --project=pixel-8-chrome
  if ($LASTEXITCODE -ne 0) { throw "Browser matrix failed." }
  [pscustomobject]@{
    kind = "candidate-bound-browser-evidence"
    result = "PASS"
    candidate_sha256 = $candidate.data.sha256
    commit_sha = $candidate.data.record.commit_sha
    comparison_base = $candidate.data.record.comparison_base.resolved_sha
    artifact = $browserReceipt
    artifact_sha256 = (Get-FileHash -Algorithm SHA256 $browserReceipt).Hash.ToLowerInvariant()
  } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $browserBinding -Encoding utf8
} finally {
  if ($null -eq $previousBrowserMatrix) {
    Remove-Item Env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX -ErrorAction SilentlyContinue
  } else {
    $env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX = $previousBrowserMatrix
  }
}
```

The combined receipt must identify all seven projects and report `PASS`, zero
failed/skipped critical journeys, and no uncaught page error. Each UI journey
captures its required desktop and narrow-device screenshots beside the receipt.

## Focused and Profile Evidence

Test/spec paths are repository-relative. Every displayed `evidence/...` value is
runtime-root-relative and is prefixed by `.tmp/code-improvement/` exactly as
shown in the executable command blocks. The durable plan-state paths are
explicitly prefixed by `$pack/` in their separate contracts.

| Unit | Focused test | Focused receipt | Quality receipt | Decisive threshold |
| --- | --- | --- | --- | --- |
| `UNIT-000` | `tests/vitest/quality/component-baseline.test.ts tests/vitest/quality/component-baseline-integrity.test.ts tests/vitest/quality/component-gate.test.ts` | `evidence/unit-000-vitest.json` | `evidence/unit-000-q2.json` | `quality:contracts` findings = 0; unchanged first tracked bootstrap remains valid after its introduction when the immutable comparison base has no baseline; mutation/reintroduction/comparison-base rollback and later re-bootstrap are rejected; unchanged-source per-file shrink is anchored to the admitted denominator so disappeared points remain uncovered debt, candidate-proven changed source uses its raw denominator, aggregate totals remain raw, and no shrunken raw denominator becomes a successor baseline; exact predecessor disposition coverage; exactly one runnable whole-repository authority; every touched pack validator passes |
| `UNIT-001` | `tests/vitest/code-improvement/unit-001-commercial-proposal-truth.test.ts` | `evidence/unit-001-vitest.json` | `evidence/unit-001-q2.json` | 0 unauthorized successes; 0 legitimate inherited-member denials; SQL placeholders = bound values; 2/2 sidecar-only changes alter signature |
| `UNIT-002` | `tests/vitest/code-improvement/unit-002-portal-reverification.test.ts` | `evidence/unit-002-vitest.json` | `evidence/unit-002-q2.json` | First and second fresh credential succeed once; 100% replay/expired/revoked/cross-scope fixtures denied |
| `UNIT-003` | `tests/vitest/code-improvement/unit-003-notification-keyset.test.ts` | `evidence/unit-003-vitest.json` | `evidence/unit-003-q2.json` | Concatenated 1,000-row traversal has 1,000 unique IDs, 0 omissions, 0 duplicates; one repository statement per page |
| `UNIT-004` | `tests/vitest/code-improvement/unit-004-publication-delivery.test.ts` | `evidence/unit-004-vitest.json` | `evidence/unit-004-q2.json` | 0 `sent` results after persistence failure; durable request path performs 0 awaited provider sends; retry external effect count = 1 |
| `UNIT-005` | `tests/vitest/code-improvement/unit-005-support-boundaries.test.ts` | `evidence/unit-005-vitest.json` | `evidence/unit-005-q2.json` | Concurrent duplicate yields 1 message and 1 side-effect set; losing replay changes 0 unread/timestamp fields; 0 tenant leaks |
| `UNIT-006` | `tests/vitest/code-improvement/unit-006-template-variant-integrity.test.ts` | `evidence/unit-006-vitest.json` | `evidence/unit-006-q2.json` | 100% persisted variant reference types repointed or rejected atomically; no partial write on missing fallback |
| `UNIT-007` | `tests/vitest/code-improvement/unit-007-realtime-revocation.test.ts` | `evidence/unit-007-vitest.json` | `evidence/unit-007-q2.json` | Old-token reconnect accepts = 0 before/after DO restart; revocation write precedes socket close |
| `UNIT-008` | `tests/vitest/code-improvement/unit-008-realtime-admission.test.ts` | `evidence/unit-008-vitest.json` | `evidence/unit-008-q2.json` | Unauthorized capacity delta = 0; room cap = 100; per-subject cap <= 5; frames <= 30/s; message <= 4,096 bytes; 0 active secret fallbacks |
| `UNIT-009` | `tests/vitest/code-improvement/unit-009-upload-admission.test.ts` | `evidence/unit-009-vitest.json` | `evidence/unit-009-q2.json` | 0 pending/inconclusive/mismatch/oversize/cross-tenant binds; ETag identity uses = 0; scanner chunks <= 1 MiB |
| `UNIT-010` | `tests/vitest/code-improvement/unit-010-operational-boundary.test.ts` | `evidence/unit-010-vitest.json` | `evidence/unit-010-q2.json` | `workers_dev=false`; 0 unowned public proof routes; 100% wrong/missing subsystem credentials denied |
| `UNIT-011` | `tests/vitest/code-improvement/unit-011-queue-envelope.test.ts` | `evidence/unit-011-vitest.json` | `evidence/unit-011-q2.json` | 100% signature/version/idempotency tamper fixtures rejected before work; valid retry external effect count = 1 |
| `UNIT-012` | `tests/vitest/code-improvement/unit-012-browser-token-cache.test.ts` | `evidence/unit-012-vitest.json` | `evidence/unit-012-q2.json` | 100% bearer-route responses `private, no-store`; 0 personalized isolate-cache hits; HTTPS cookies Secure; new passwords reject fewer than 10 normalized characters or fewer than 2 required character classes; legacy shorter hashes still verify |
| `UNIT-013` | `tests/vitest/code-improvement/unit-013-session-compatibility-decision.test.ts` | `evidence/unit-013-vitest.json` | `evidence/unit-013-q2.json` | 100% session create/read/update/revoke/rotate paths and direct table readers mapped; `COMPATIBLE_DESIGN` makes `UNIT-026=READY`, or `NO_SAFE_COMPATIBLE_DESIGN` makes `UNIT-026=BLOCKED`, `REQ-002=BLOCKED`, and seals at least two distinct failed fallbacks |
| `UNIT-014` | `tests/vitest/code-improvement/unit-014-redaction-retention.test.ts` | `evidence/unit-014-vitest.json` | `evidence/unit-014-q2.json` | 0 raw token/email/user-agent/error fixtures in receipts; 100% registered security/observability tables have retention and legal-hold policy |
| `UNIT-015` | `tests/vitest/code-improvement/unit-015-workspace-context.test.ts` | `evidence/unit-015-vitest.json` | `evidence/unit-015-q2.json` | Ready creator reads = 1; ready member reads <= 2; ordinary lookup starter reads/writes = 0 |
| `UNIT-016` | `tests/vitest/code-improvement/unit-016-project-catalogue.test.ts` | `evidence/unit-016-vitest.json` | `evidence/unit-016-q2.json` | Page size <= 50; 1,000-row traversal has 0 omissions/duplicates/leaks; statements per page <= 8; serialized page <= 256 KiB |
| `UNIT-017` | `tests/vitest/code-improvement/unit-017-ai-evidence.test.ts` | `evidence/unit-017-vitest.json` | `evidence/unit-017-q2.json` | Prior-estimate query count = 1; avoidable serial awaits reduced by >= 3; prompt inputs/audit counts/order exactly match fixtures |
| `UNIT-018` | `tests/vitest/code-improvement/unit-018-restore-replay.test.ts` | `evidence/unit-018-vitest.json` | `evidence/unit-018-q2.json` | 100-row replay authoritative reads = 1; writes = 0; requested order preserved |
| `UNIT-019` | `tests/vitest/code-improvement/unit-019-estimate-view-model.test.ts` | `evidence/unit-019-vitest.json` | `evidence/unit-019-q2.json` | Projection root traversals = 1; 1,000-row candidate duration <= baseline + 10%; totals/order/reference fixtures exact |
| `UNIT-020` | `tests/vitest/code-improvement/unit-020-closeout-contract.test.ts` | `evidence/unit-020-vitest.json` | `evidence/unit-020-q2.json` | `UNIT-028=VERIFIED`; immutable baseline unchanged; all decision receipts and candidate evidence leaves rehash exactly; lifecycle-activated units are in dependency closure and `VERIFIED`; authorization-only branches are exact `SUPERSEDED` plus `BOUNDARY` contracts; Codex Security supplement is validator-valid `ACHIEVED`/`ARCHIVE_READY` with 8/8 units verified and its closeout receipt bound to the UNIT-024 admission receipt; any `BLOCKED`/`TECH_BLOCKED` branch prevents this unit |
| `UNIT-021` | `tests/vitest/code-improvement/unit-021-component-editor-model.test.ts` | `evidence/unit-021-vitest.json` | `evidence/unit-021-q2.json` | Create/update projection parity = 100% across variant/default/supplier/image/attachment fixtures; duplicated mappings = 0 |
| `UNIT-022` | `tests/vitest/code-improvement/unit-022-activity-outbox.test.ts` | `evidence/unit-022-vitest.json` | `evidence/unit-022-q2.json` | 500-row reconciliation statements < 10; delivered/failed/retry/attempt results exactly match fixture |
| `UNIT-023` | `tests/vitest/code-improvement/unit-023-query-subscriptions.test.tsx` | `evidence/unit-023-vitest.json` | `evidence/unit-023-q2.json` | Commit/effect counts <= characterization baseline on all 4 surfaces; React Doctor new findings = 0 |
| `UNIT-024` | `tests/vitest/code-improvement/unit-024-scanner-viability.test.ts` | `evidence/unit-024-vitest.json` | `evidence/unit-024-q2.json` | Supplement intake: 200/200 unique cloud IDs and 21/21 unique PR records mapped, 0 missing/duplicate-owner/unowned records, source manifest bound, supplement remains non-runnable; `AUTHORITATIVE_PROVIDER_VIABLE`: 1/1 EICAR infected, 1/1 clean fixture clean, unavailable/timeout inconclusive, and `UNIT-025=READY`; `EXTERNAL_PROVIDER_AUTH_REQUIRED`: policy-clean count = 0, fail-closed impact recorded, `UNIT-025=SUPERSEDED`, criterion `BOUNDARY`, `AUTH-001` active; `NO_TECHNICALLY_VIABLE_PROVIDER`: `UNIT-025=BLOCKED`, `REQ-006=BLOCKED`, and at least two distinct failed fallbacks are sealed |
| `UNIT-025` | `tests/vitest/code-improvement/unit-025-scanner-state.test.ts` | `evidence/unit-025-vitest.json` | `evidence/unit-025-q2.json` | Clean bind count = 1; infected/inconclusive bind count = 0; timeout <= 5,000 ms; retries and terminal failure match contract |
| `UNIT-026` | `tests/vitest/code-improvement/unit-026-session-migration.test.ts` | `evidence/unit-026-vitest.json` | `evidence/unit-026-q2.json` | Raw reusable tokens after cutover = 0; existing-cookie success = 100%; interrupted backfill loses/unqueries 0 rows |
| `UNIT-027` | N/A | N/A | `evidence/unit-027-q2.json` | 3/3 archive domains have one explicit disposition, no unowned activated implementation, and `terminal_effect=NONE` |
| `UNIT-028` | `tests/vitest/code-improvement/unit-028-safe-cleanup-docs.test.ts` | `evidence/unit-028-vitest.json` | `evidence/unit-028-q2.json` | Dead production importers = 0, including Neat background/dependency; maintained architecture matches bound Cloudflare/D1 truth; stale active predecessor authorities = 0 |
| `UNIT-029` | `tests/vitest/code-improvement/unit-029-row-total-aggregation.test.ts` | `evidence/unit-029-vitest.json` | `evidence/unit-029-q2.json` | All 3 external aggregate repositories use canonical minor-unit row totals; two `0.335` rows total `0.68`; legacy line-total source callers = 0 |
| `UNIT-030` | `tests/vitest/code-improvement/unit-030-identity-lifecycle.test.ts` | `evidence/unit-030-vitest.json` | `evidence/unit-030-q2.json` | Deleted/suspended access accepts = 0; false invite activations = 0; 1,000-row allowlist/invite traversal has 0 omissions |
| `UNIT-031` | `tests/vitest/code-improvement/unit-031-release-supply-chain.test.ts` | `evidence/unit-031-vitest.json` | `evidence/unit-031-q2.json` | Arbitrary attested commits = 0; mutable action refs = 0; 6/6 mapped records have exact dispositions |
| `UNIT-032` | `tests/vitest/code-improvement/unit-032-local-tool-security.test.ts` | `evidence/unit-032-vitest.json` | `evidence/unit-032-q2.json` | Token/cookie disclosures = 0; null-origin accepts = 0; path escapes = 0; guard bypasses = 0 |
| `UNIT-033` | `tests/vitest/code-improvement/unit-033-maintenance-write-gate.test.ts` | `evidence/unit-033-vitest.json` | `evidence/unit-033-q2.json` | Maintenance-mode mutation statements = 0 across all mapped actions |
| `UNIT-034` | `tests/vitest/code-improvement/unit-034-estimate-tree-bounds.test.ts` | `evidence/unit-034-vitest.json` | `evidence/unit-034-q2.json` | Deep/cyclic traversal terminates within budget; stale selection Add Area success = 1 |
| `UNIT-035` | `tests/vitest/code-improvement/unit-035-admin-integrity.test.ts` | `evidence/unit-035-vitest.json` | `evidence/unit-035-q2.json` | Malformed copilot 500s = 0; corrupt rows detected = 100%; supported non-UUID notes succeed |
| `UNIT-036` | `tests/vitest/code-improvement/unit-036-activity-filter-state.test.ts` | `evidence/unit-036-vitest.json` | `evidence/unit-036-q2.json` | Actor-filter omissions = 0; supported URL-state round trips = 100% |
| `UNIT-037` | `tests/vitest/code-improvement/unit-037-public-signup.test.tsx` | `evidence/unit-037-vitest.json` | `evidence/unit-037-q2.json` | Resize reveal succeeds; unhandled signup posts = 0; accessible result states = 100% |
| `UNIT-038` | `tests/vitest/code-improvement/unit-038-design-tool-policy.test.ts` | `evidence/unit-038-vitest.json` | `evidence/unit-038-q2.json` | Public `DESIGN.md` requirements = 0; global exception matches = 0 |
| `UNIT-039` | `tests/vitest/code-improvement/unit-039-collaboration-privacy.test.ts` | `evidence/unit-039-vitest.json` | `evidence/unit-039-q2.json` | Viewer roster/invite PII fields = 0; unrelated restricted-grant revocations = 0 |
| `UNIT-040` | `tests/vitest/code-improvement/unit-040-tool-bootstrap-pinning.test.ts` | `evidence/unit-040-vitest.json` | `evidence/unit-040-q2.json` | Mutable active tool refs = 0; executable bootstrap provenance coverage = 100% |
| `UNIT-041` | `tests/vitest/code-improvement/unit-041-dependency-reconciliation.test.ts` | `evidence/unit-041-vitest.json` | `evidence/unit-041-q2.json` | 5/5 PR records disposed; lockfile reproducible; `@firecms/neat` candidate changes = 0 |
| `UNIT-042` | `tests/vitest/code-improvement/unit-042-callback-abuse.test.ts` | `evidence/unit-042-vitest.json` | `evidence/unit-042-q2.json` | Flood audit writes remain within configured bound; legitimate callback success = 100% |
| `UNIT-043` | `tests/vitest/code-improvement/unit-043-row-duplication-expression.test.tsx` | `evidence/unit-043-vitest.json` | `evidence/unit-043-q2.json` | Duplicates follow source exactly once; expression round-trip parity = 100% |
| `UNIT-044` | `tests/vitest/code-improvement/unit-044-quick-create-idempotency.test.tsx` | `evidence/unit-044-vitest.json` | `evidence/unit-044-q2.json` | Sheet creates per intent <= 1; failed intent remains retryable |
| `UNIT-045` | `tests/vitest/code-improvement/unit-045-admin-broadcast-atomicity.test.ts` | `evidence/unit-045-vitest.json` | `evidence/unit-045-q2.json` | Detached batch calls = 0; partial commits = 0; successful deliveries duplicate = 0 |
| `UNIT-046` | `tests/vitest/code-improvement/unit-046-live-region.test.tsx` | `evidence/unit-046-vitest.json` | `evidence/unit-046-q2.json` | Repeated identical messages re-announce; stale announcements and leaked timers = 0 |

## Browser Evidence

| Unit | Browser spec | Browser receipt | Required assertion |
| --- | --- | --- | --- |
| `UNIT-001` | `e2e/code-improvement/unit-001-commercial-proposal.spec.ts` | `evidence/unit-001-browser.json` | Legitimate commercial edit and sidecar-only preview refresh |
| `UNIT-002` | `e2e/code-improvement/unit-002-portal-reverification.spec.ts` | `evidence/unit-002-browser.json` | Resend then second link reaches portal once |
| `UNIT-003` | `e2e/code-improvement/unit-003-notifications.spec.ts` | `evidence/unit-003-browser.json` | Load-more returns all fixture rows once |
| `UNIT-004` | `e2e/code-improvement/unit-004-publication-delivery.spec.ts` | `evidence/unit-004-browser.json` | Pending/uncertain state is truthful after persistence failure |
| `UNIT-005` | `e2e/code-improvement/unit-005-support-thread.spec.ts` | `evidence/unit-005-browser.json` | Replay does not restore unread; sparse visible pages progress |
| `UNIT-006` | `e2e/code-improvement/unit-006-template-variant.spec.ts` | `evidence/unit-006-browser.json` | Variant mutation leaves template usable or is rejected before change |
| `UNIT-007` | `e2e/code-improvement/unit-007-realtime-revocation.spec.ts` | `evidence/unit-007-browser.json` | Revoked live client cannot reconnect with old token |
| `UNIT-008` | `e2e/code-improvement/unit-008-realtime-admission.spec.ts` | `evidence/unit-008-browser.json` | Valid collaboration remains usable at permitted capacity |
| `UNIT-009` | `e2e/code-improvement/unit-009-upload-admission.spec.ts` | `evidence/unit-009-browser.json` | Inconclusive/pending upload cannot attach |
| `UNIT-012` | `e2e/code-improvement/unit-012-browser-boundary.spec.ts` | `evidence/unit-012-browser.json` | Headers/cookies/share response/password intake/CSP branch match contract |
| `UNIT-015` | `e2e/code-improvement/unit-015-workspace-onboarding.spec.ts` | `evidence/unit-015-browser.json` | Ready workspace route does not trigger starter work; onboarding still does |
| `UNIT-016` | `e2e/code-improvement/unit-016-project-catalogue.spec.ts` | `evidence/unit-016-browser.json` | Page/filter/sort/favorite/access behavior preserved |
| `UNIT-019` | `e2e/code-improvement/unit-019-estimate-view-model.spec.ts` | `evidence/unit-019-browser.json` | Focus, keyboard, totals, history, export, and edit behavior preserved |
| `UNIT-021` | `e2e/code-improvement/unit-021-component-editor.spec.ts` | `evidence/unit-021-browser.json` | Create/edit variants and accessibility behavior preserved |
| `UNIT-023` | `e2e/code-improvement/unit-023-query-subscriptions.spec.ts` | `evidence/unit-023-browser.json` | Four changed surfaces refresh and mutate once without stale UI |
| `UNIT-025` | `e2e/code-improvement/unit-025-upload-clean.spec.ts` | `evidence/unit-025-browser.json` | Authoritatively clean upload attaches once; infected never attaches |
| `UNIT-026` | `e2e/code-improvement/unit-026-session-continuity.spec.ts` | `evidence/unit-026-browser.json` | Pre-cutover active session remains valid and revocable |
| `UNIT-030` | `e2e/code-improvement/unit-030-account-lifecycle.spec.ts` | `evidence/unit-030-browser.json` | Deleted/suspended/invite states deny or recover exactly as specified |
| `UNIT-034` | `e2e/code-improvement/unit-034-estimate-tree.spec.ts` | `evidence/unit-034-browser.json` | Deep tree remains usable and stale-selection Add Area succeeds once |
| `UNIT-035` | `e2e/code-improvement/unit-035-admin-records.spec.ts` | `evidence/unit-035-browser.json` | Controlled validation and supported customer-note identities remain usable |
| `UNIT-036` | `e2e/code-improvement/unit-036-activity-filters.spec.ts` | `evidence/unit-036-browser.json` | Actor filter survives navigation, refresh, and pagination |
| `UNIT-037` | `e2e/code-improvement/unit-037-public-signup.spec.ts` | `evidence/unit-037-browser.json` | Resize reveals hero and signup reaches handled accessible states |
| `UNIT-039` | `e2e/code-improvement/unit-039-collaboration-privacy.spec.ts` | `evidence/unit-039-browser.json` | Viewers see no roster/invite PII; manager controls remain usable |
| `UNIT-043` | `e2e/code-improvement/unit-043-row-editing.spec.ts` | `evidence/unit-043-browser.json` | Duplicate position and quantity expression survive save/reload |
| `UNIT-044` | `e2e/code-improvement/unit-044-quick-create.spec.ts` | `evidence/unit-044-browser.json` | Rapid/retried quick-create produces and navigates to one sheet |
| `UNIT-046` | `e2e/code-improvement/unit-046-live-region.spec.ts` | `evidence/unit-046-browser.json` | Repeated favorite action produces a fresh accessible announcement |

### Server-only Q2 rationale

| Unit | Why no browser receipt applies | Required substitute |
| --- | --- | --- |
| `UNIT-000` | Quality-lineage and plan-authority reconciliation have no rendered journey | Git-history red/green fixtures, `quality:contracts`, exact predecessor receipt, all touched plan validators, and Q2 quality/security review |
| `UNIT-010` | Worker routing/configuration and proof/control authentication have no rendered journey | Workers-runtime route/config integration plus wrong/missing-credential denial fixtures |
| `UNIT-011` | Queue producer/consumer envelopes execute outside a browser | Producer/consumer integration, MAC tamper, dedupe, retry, and fault evidence |
| `UNIT-013` | This is an installed-SDK/table-reader compatibility decision; activated session behavior is exercised by `UNIT-026` | Complete source/call map, prototype receipt, and Q2 security review |
| `UNIT-014` | Cron logging, D1 minimization, retention, and legal hold are operational/data behavior | Worker/D1 integration, redaction fixtures, retention registry coverage, and legal-hold evidence |
| `UNIT-017` | The change is a server-side AI evidence snapshot with invariant output | Query-count/serial-depth tests and exact prompt/audit fixture parity |
| `UNIT-018` | Idempotent D1 restore replay changes read shape, not user interaction | 100-row replay integration with statement/write/order assertions |
| `UNIT-020` | Completion-only ledger and terminal reconciliation have no rendered journey | Manifest promotion guard, closeout-contract test, plan validators, GitNexus detection, and integrated Q2 review |
| `UNIT-022` | Scheduled outbox reconciliation has no browser boundary | 500-row D1 integration with statement, retry, and result assertions |
| `UNIT-024` | This is provider viability classification; the selected branch has no authorized provider-backed UX | Complete 221-record admission test, sanitized topology receipt, zero authoritative policy-clean results, exact `AUTH-001` transition, and Q2 security review |
| `UNIT-027` | This is a lifecycle decision; any resulting product behavior must be added as a separate browser-tested Q2 unit | Three-domain disposition receipt, active-policy scan, promotion guard, and Q2 independent review |
| `UNIT-028` | Dead-code deletion, architecture correction, and authority reconciliation have no user journey | Dead-import scan, maintained-doc/provider-truth scan, touched-pack validators, and Q2 independent review |
| `UNIT-029` | Repository summary/chart aggregation changes server-side data projection rather than interaction | Canonical rounding fixtures across all three repositories, legacy-caller scan, and Q2 independent review |
| `UNIT-031` | Release workflow and action-reference policy execute in CI | Commit-provenance and immutable action-reference contract tests plus Q2 review |
| `UNIT-032` | Local CLI/server/path hardening is outside the product browser | Process, origin, credential-redaction, containment, and guard-bypass fixtures |
| `UNIT-033` | Maintenance enforcement is a server-action boundary | Zero-write denial integration across every mapped mutation |
| `UNIT-038` | Design-tool policy is a source/configuration contract | Public/authenticated route fixtures and scope-exact lint assertions |
| `UNIT-040` | MCP/bootstrap pinning is developer tooling | Active-config mutable-reference scan and provenance validation |
| `UNIT-041` | Dependency reconciliation changes package/runtime inputs | Lockfile reproducibility, type/build/runtime compatibility, and PR-disposition receipt |
| `UNIT-042` | Callback abuse limiting occurs before rendered auth state | Rate-limit/audit-write integration and legitimate callback recovery fixtures |
| `UNIT-045` | Broadcast atomicity is a D1 transaction boundary | Detached-call and partial-failure integration with exact write counts |

## Conditional Closeout Promotion

`GATE-020` remains `FAIL` and `UNIT-020` remains `PLANNED` until this executable
pre-promotion check passes. The decision receipts are durable candidate content;
the generated guard receipt is ignored runtime evidence.

Scanner and session receipts have exactly these top-level keys:
`schema_version`, `decision_id`, `outcome`, `candidate_revision`,
`evidence_paths`, `fallbacks`, `unit_transitions`, `requirement_transitions`,
`criterion_transitions`, and `terminal_effect`. `schema_version` is `1`;
`candidate_revision` equals current `HEAD`; and each evidence leaf is exactly
`{path,sha256,source_revision}` in tracked candidate content. A technical
outcome contains at least two materially distinct fallback rows, each exactly
`{design_id,distinguishing_boundary,result,evidence_paths}`, with
`result=NOT_VIABLE`; every fallback leaf is present in the top-level evidence
set. Nontechnical outcomes use the explicit empty `fallbacks` array. Outcome
semantics are closed:

| Decision outcome | Exact unit transition | Exact requirement transition | Exact criterion transition | `terminal_effect` |
| --- | --- | --- | --- | --- |
| `AUTHORITATIVE_PROVIDER_VIABLE` | `UNIT-025: PLANNED -> READY` | `[]` | `[]` | `NONE` |
| `EXTERNAL_PROVIDER_AUTH_REQUIRED` | `UNIT-025: PLANNED -> SUPERSEDED` | `[]` | `AC-002` and `AC-006`: `FAIL -> BOUNDARY`, each with `AUTH-001` | `AUTH_BLOCKED` |
| `NO_TECHNICALLY_VIABLE_PROVIDER` | `UNIT-025: PLANNED -> BLOCKED` | `REQ-006: ACCEPTED -> BLOCKED` | `[]` | `TECH_BLOCKED` |
| `COMPATIBLE_DESIGN` | `UNIT-026: PLANNED -> READY` | `[]` | `[]` | `NONE` |
| `NO_SAFE_COMPATIBLE_DESIGN` | `UNIT-026: PLANNED -> BLOCKED` | `REQ-002: ACCEPTED -> BLOCKED` | `[]` | `TECH_BLOCKED` |

The `UNIT-027` receipt has exactly `schema_version`, `decision_id`,
`candidate_revision`, `domains`, `activated_unit_ids`, `evidence_paths`, and
`terminal_effect`; its decision is `DEC-AUTO-004`, its three domain rows are
explicit, and `terminal_effect` is exactly `NONE`. Lifecycle policy is a local
product decision and cannot manufacture an authorization boundary. Each domain
row is exactly `domain_id`, `disposition`, `credential_semantics`,
`access_semantics`, `data_semantics`, `activated_unit_ids`, and
`evidence_paths`. Domain IDs are exactly `component_archive`,
`native_client_portal_archive`, and `estimate_tab_archive`; dispositions are
`TERMINAL_ARCHIVE`, `RESTORE_REQUIRED`, or `DELETE_DEAD_TRANSITION`.
`RESTORE_REQUIRED` has at least one activated unit; the other dispositions have
none. Top-level activated IDs and evidence leaves equal the unique unions from
the three rows.

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$runtimeRoot = ".tmp/code-improvement"
New-Item -ItemType Directory -Force "$runtimeRoot/evidence" | Out-Null
$manifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
$expectedBaseline = "93d5124d268a1b6016f63f8a8e5e69e118630d13"
if ([string]$manifest.baseline.head -ne $expectedBaseline) {
  throw "Closeout cannot move the immutable package baseline."
}
$currentRevision = (git rev-parse HEAD).Trim().ToLowerInvariant()
if ($currentRevision -notmatch "^[a-f0-9]{40}$") {
  throw "Current source revision is malformed."
}
$repoRoot = (Resolve-Path (git rev-parse --show-toplevel).Trim()).Path
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
function Assert-SealedEvidenceLeaves([object[]]$leaves, [string]$revision, [string]$receiptPath) {
  if ($leaves.Count -eq 0) { throw "Decision evidence is empty: $receiptPath" }
  foreach ($leaf in $leaves) {
    $keys = @($leaf.PSObject.Properties.Name | Sort-Object)
    if ((Compare-Object @("path", "sha256", "source_revision") $keys).Count -ne 0 -or
        [string]$leaf.path -notmatch "^[A-Za-z0-9._/-]+$" -or
        [string]$leaf.path -match "^\.tmp/" -or
        [string]$leaf.sha256 -notmatch "^[a-f0-9]{64}$" -or
        [string]$leaf.source_revision -ne $revision) {
      throw "Decision evidence leaf is malformed: $receiptPath"
    }
    $resolved = (Resolve-Path -LiteralPath (Join-Path $repoRoot ([string]$leaf.path))).Path
    git check-ignore -q -- ([string]$leaf.path)
    if ($LASTEXITCODE -eq 0) {
      throw "Decision evidence may not use a Git-ignored path: $($leaf.path)"
    }
    if ($LASTEXITCODE -ne 1) {
      throw "Decision evidence ignore status could not be established: $($leaf.path)"
    }
    if (-not $resolved.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        -not (Test-Path -LiteralPath $resolved -PathType Leaf) -or
        (Get-FileHash -Algorithm SHA256 -LiteralPath $resolved).Hash.ToLowerInvariant() -ne $leaf.sha256) {
      throw "Decision evidence leaf escaped, disappeared, or changed: $($leaf.path)"
    }
  }
}
$allSealedLeaves = @()
$closeout = @($manifest.units | Where-Object id -eq "UNIT-020")
$closeoutGate = @($manifest.gates | Where-Object id -eq "GATE-020")
if ($closeout.Count -ne 1 -or $closeout[0].status -ne "PLANNED" -or
    $closeoutGate.Count -ne 1 -or $closeoutGate[0].status -ne "FAIL") {
  throw "Closeout pre-promotion state is malformed."
}
$unverifiedDependencies = @($closeout[0].depends_on | Where-Object {
  $dependencyId = $_
  @($manifest.units | Where-Object id -eq $dependencyId)[0].status -ne "VERIFIED"
})
if ($unverifiedDependencies.Count -ne 0) {
  throw "Closeout dependencies are not VERIFIED: $($unverifiedDependencies -join ', ')"
}
$expectedCloseoutSliceIds = @(@($closeout[0].depends_on) + @("UNIT-020") | Sort-Object -Unique)

$lifecyclePath = "$pack/evidence/unit-027-lifecycle.json"
$lifecycle = Get-Content -LiteralPath $lifecyclePath -Raw | ConvertFrom-Json
$lifecycleKeys = @($lifecycle.PSObject.Properties.Name | Sort-Object)
if ((Compare-Object @("activated_unit_ids", "candidate_revision", "decision_id", "domains", "evidence_paths", "schema_version", "terminal_effect") $lifecycleKeys).Count -ne 0 -or
    $lifecycle.schema_version -ne 1 -or
    $lifecycle.decision_id -ne "DEC-AUTO-004" -or
    $lifecycle.candidate_revision -ne $currentRevision -or
    $lifecycle.terminal_effect -ne "NONE" -or
    @($lifecycle.domains).Count -ne 3) {
  throw "UNIT-027 lifecycle receipt schema or candidate binding is invalid."
}
$expectedDomainIds = @("component_archive", "estimate_tab_archive", "native_client_portal_archive")
$allowedLifecycleDispositions = @("DELETE_DEAD_TRANSITION", "RESTORE_REQUIRED", "TERMINAL_ARCHIVE")
$domainActivatedIds = @()
$domainEvidenceKeys = @()
foreach ($domain in @($lifecycle.domains)) {
  $domainKeys = @($domain.PSObject.Properties.Name | Sort-Object)
  if ((Compare-Object @(
        "access_semantics", "activated_unit_ids", "credential_semantics",
        "data_semantics", "disposition", "domain_id", "evidence_paths"
      ) $domainKeys).Count -ne 0 -or
      $domain.domain_id -notin $expectedDomainIds -or
      $domain.disposition -notin $allowedLifecycleDispositions -or
      [string]::IsNullOrWhiteSpace([string]$domain.credential_semantics) -or
      [string]::IsNullOrWhiteSpace([string]$domain.access_semantics) -or
      [string]::IsNullOrWhiteSpace([string]$domain.data_semantics)) {
    throw "UNIT-027 lifecycle domain row is malformed."
  }
  $rowActivatedIds = @($domain.activated_unit_ids)
  if (($domain.disposition -eq "RESTORE_REQUIRED" -and $rowActivatedIds.Count -eq 0) -or
      ($domain.disposition -ne "RESTORE_REQUIRED" -and $rowActivatedIds.Count -ne 0)) {
    throw "UNIT-027 disposition and activated work disagree: $($domain.domain_id)"
  }
  Assert-SealedEvidenceLeaves @($domain.evidence_paths) $currentRevision $lifecyclePath
  $domainActivatedIds += $rowActivatedIds
  $domainEvidenceKeys += @($domain.evidence_paths | ForEach-Object {
    "$($_.path)|$($_.sha256)|$($_.source_revision)"
  })
}
$actualDomainIds = @($lifecycle.domains | ForEach-Object domain_id | Sort-Object -Unique)
if ((Compare-Object $expectedDomainIds $actualDomainIds).Count -ne 0 -or
    @($lifecycle.domains).Count -ne $actualDomainIds.Count) {
  throw "UNIT-027 lifecycle domains are missing or duplicated."
}
$activatedLifecycleIds = @($lifecycle.activated_unit_ids)
if ($activatedLifecycleIds.Count -ne @($activatedLifecycleIds | Sort-Object -Unique).Count -or
    @($activatedLifecycleIds | Where-Object { $_ -notmatch "^UNIT-[0-9]{3}$" }).Count -ne 0 -or
    (Compare-Object @($activatedLifecycleIds | Sort-Object -Unique) @($domainActivatedIds | Sort-Object -Unique)).Count -ne 0) {
  throw "UNIT-027 activated unit IDs are malformed or duplicated."
}
$topEvidenceKeys = @($lifecycle.evidence_paths | ForEach-Object {
  "$($_.path)|$($_.sha256)|$($_.source_revision)"
} | Sort-Object -Unique)
if ((Compare-Object $topEvidenceKeys @($domainEvidenceKeys | Sort-Object -Unique)).Count -ne 0) {
  throw "UNIT-027 top-level evidence does not equal the domain evidence union."
}
foreach ($activatedId in $activatedLifecycleIds) {
  $activatedUnit = @($manifest.units | Where-Object id -eq $activatedId)
  if ($activatedUnit.Count -ne 1 -or
      $activatedUnit[0].status -ne "VERIFIED" -or
      $activatedId -notin @($closeout[0].depends_on)) {
    throw "UNIT-027 activated work is not verified in closeout dependency closure: $activatedId"
  }
}
Assert-SealedEvidenceLeaves @($lifecycle.evidence_paths) $currentRevision $lifecyclePath
$allSealedLeaves += @($lifecycle.evidence_paths | ForEach-Object {
  [pscustomobject]@{ path = $_.path; sha256 = $_.sha256 }
})

$contracts = @(
  [pscustomobject]@{
    unit_id = "UNIT-025"
    decision_id = "DEC-AUTO-005"
    receipt_path = "$pack/evidence/unit-024-scanner-viability-decision.json"
    verified_outcome = "AUTHORITATIVE_PROVIDER_VIABLE"
    superseded_outcome = "EXTERNAL_PROVIDER_AUTH_REQUIRED"
    verified_terminal_effect = "NONE"
    superseded_terminal_effect = "AUTH_BLOCKED"
  },
  [pscustomobject]@{
    unit_id = "UNIT-026"
    decision_id = "DEC-AUTO-006"
    receipt_path = "$pack/evidence/unit-013-session-compatibility-decision.json"
    verified_outcome = "COMPATIBLE_DESIGN"
    superseded_outcome = $null
    verified_terminal_effect = "NONE"
    superseded_terminal_effect = $null
  }
)
$snapshots = foreach ($contract in $contracts) {
  $unit = @($manifest.units | Where-Object id -eq $contract.unit_id)
  if ($unit.Count -ne 1 -or $unit[0].status -eq "BLOCKED") {
    throw "$($contract.unit_id) blocks closeout."
  }
  if ($unit[0].status -notin @("VERIFIED", "SUPERSEDED")) {
    throw "$($contract.unit_id) has not reached a terminal closeout disposition."
  }
  if ($unit[0].status -eq "SUPERSEDED" -and $null -eq $contract.superseded_outcome) {
    throw "$($contract.unit_id) cannot be superseded."
  }
  $receipt = Get-Content -LiteralPath $contract.receipt_path -Raw | ConvertFrom-Json
  $expectedOutcome = if ($unit[0].status -eq "VERIFIED") {
    $contract.verified_outcome
  } else {
    $contract.superseded_outcome
  }
  $expectedTerminalEffect = if ($unit[0].status -eq "VERIFIED") {
    $contract.verified_terminal_effect
  } else {
    $contract.superseded_terminal_effect
  }
  $receiptKeys = @($receipt.PSObject.Properties.Name | Sort-Object)
  if ((Compare-Object @(
        "candidate_revision", "criterion_transitions", "decision_id",
        "evidence_paths", "fallbacks", "outcome", "requirement_transitions",
        "schema_version", "terminal_effect", "unit_transitions"
      ) $receiptKeys).Count -ne 0 -or
      $receipt.schema_version -ne 1 -or
      $receipt.decision_id -ne $contract.decision_id -or
      $receipt.outcome -ne $expectedOutcome -or
      $receipt.candidate_revision -ne $currentRevision -or
      $receipt.terminal_effect -ne $expectedTerminalEffect -or
      @($receipt.unit_transitions).Count -ne 1 -or
      @($receipt.requirement_transitions).Count -ne 0 -or
      @($receipt.fallbacks).Count -ne 0) {
    throw "Decision receipt is incomplete or inconsistent: $($contract.receipt_path)"
  }
  Assert-SealedEvidenceLeaves @($receipt.evidence_paths) $currentRevision $contract.receipt_path
  $allSealedLeaves += @($receipt.evidence_paths | ForEach-Object {
    [pscustomobject]@{ path = $_.path; sha256 = $_.sha256 }
  })
  $unitTransition = @($receipt.unit_transitions)
  $expectedDecisionState = if ($unit[0].status -eq "VERIFIED") { "READY" } else { "SUPERSEDED" }
  if ((Compare-Object @("from_status", "to_status", "unit_id") @($unitTransition[0].PSObject.Properties.Name | Sort-Object)).Count -ne 0 -or
      $unitTransition[0].unit_id -ne $contract.unit_id -or
      $unitTransition[0].from_status -ne "PLANNED" -or
      $unitTransition[0].to_status -ne $expectedDecisionState) {
    throw "Decision transition does not authorize the current branch state."
  }
  if ($unit[0].status -eq "SUPERSEDED") {
    $criterionTransitions = @($receipt.criterion_transitions)
    $boundaryIds = @($criterionTransitions | ForEach-Object criterion_id | Sort-Object -Unique)
    if ((Compare-Object @("AC-002", "AC-006") $boundaryIds).Count -ne 0) {
      throw "Authorization-backed scanner disposition must bind AC-002 and AC-006."
    }
    foreach ($transition in $criterionTransitions) {
      if ((Compare-Object @("authorization_boundary_id", "criterion_id", "from_status", "to_status") @($transition.PSObject.Properties.Name | Sort-Object)).Count -ne 0 -or
          $transition.from_status -ne "FAIL" -or
          $transition.to_status -ne "BOUNDARY" -or
          $transition.authorization_boundary_id -ne "AUTH-001") {
        throw "Authorization-backed criterion transition is malformed."
      }
    }
    $manifestBoundaries = @($manifest.criteria | Where-Object {
      $_.id -in $boundaryIds -and $_.status -eq "BOUNDARY" -and
      $_.authorization_boundary_id -eq "AUTH-001"
    })
    $auth = @($manifest.authorization_boundaries | Where-Object {
      $_.id -eq "AUTH-001" -and $_.status -eq "ACTIVE"
    })
    if ($boundaryIds.Count -eq 0 -or $manifestBoundaries.Count -ne $boundaryIds.Count -or $auth.Count -ne 1) {
      throw "Authorization-backed supersession is not represented in the manifest."
    }
  } elseif (@($receipt.criterion_transitions).Count -ne 0) {
    throw "Verified conditional branch may not invent criterion transitions."
  }
  [pscustomobject]@{
    unit_id = $contract.unit_id
    status = $unit[0].status
    outcome = $receipt.outcome
    candidate_revision = $receipt.candidate_revision
    terminal_effect = $receipt.terminal_effect
    receipt_path = $contract.receipt_path
    receipt_sha256 = (Get-FileHash -Algorithm SHA256 $contract.receipt_path).Hash.ToLowerInvariant()
  }
}
$guardPath = "$runtimeRoot/evidence/unit-020-promotion-guard.json"
git check-ignore -q -- $guardPath
if ($LASTEXITCODE -ne 0) { throw "Promotion guard receipt is not Git-ignored." }
[pscustomobject]@{
  gate_id = "GATE-020"
  comparison_base = $expectedBaseline
  candidate_revision = $currentRevision
  prepromotion_manifest_sha256 = $manifest.manifest_sha256
  conditional_branches = @($snapshots)
  lifecycle_receipt_path = $lifecyclePath
  lifecycle_receipt_sha256 = (Get-FileHash -Algorithm SHA256 $lifecyclePath).Hash.ToLowerInvariant()
  activated_lifecycle_unit_ids = $activatedLifecycleIds
  sealed_evidence_leaves = @($allSealedLeaves | Sort-Object path -Unique)
  ready_slice_unit_ids = $expectedCloseoutSliceIds
  result = "PASS"
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $guardPath -Encoding utf8
```

Only after that command passes may one manifest write make the complete runnable
transition: `GATE-020: FAIL -> PASS`, `UNIT-020: PLANNED -> READY`,
`next_unit=UNIT-020`, `package_status=IMPLEMENTATION_READY`,
`implementation_status=IN_PROGRESS`, `last_observed_run_scope=IMPLEMENT_LOCAL`,
and replacement of the obsolete initial slice with exactly
`SLICE-020=guard.ready_slice_unit_ids`. That same write refreshes `updated_at`
and reseals hashes. The following post-promotion check must then pass before any
`UNIT-020` edit:

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$guardPath = ".tmp/code-improvement/evidence/unit-020-promotion-guard.json"
$guard = Get-Content -LiteralPath $guardPath -Raw | ConvertFrom-Json
$manifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
$closeoutSlices = @($manifest.ready_slices | Where-Object id -eq "SLICE-020")
if ($guard.result -ne "PASS" -or
    $guard.comparison_base -ne "93d5124d268a1b6016f63f8a8e5e69e118630d13" -or
    $manifest.baseline.head -ne $guard.comparison_base -or
    $guard.candidate_revision -ne (git rev-parse HEAD).Trim().ToLowerInvariant() -or
    (Get-FileHash -Algorithm SHA256 $guard.lifecycle_receipt_path).Hash.ToLowerInvariant() -ne $guard.lifecycle_receipt_sha256 -or
    @($manifest.gates | Where-Object { $_.id -eq "GATE-020" -and $_.status -eq "PASS" }).Count -ne 1 -or
    @($manifest.units | Where-Object { $_.id -eq "UNIT-020" -and $_.status -eq "READY" }).Count -ne 1 -or
    $manifest.next_unit -ne "UNIT-020" -or
    $manifest.package_status -ne "IMPLEMENTATION_READY" -or
    $manifest.implementation_status -ne "IN_PROGRESS" -or
    $manifest.last_observed_run_scope -ne "IMPLEMENT_LOCAL" -or
    @($manifest.ready_slices).Count -ne 1 -or
    $closeoutSlices.Count -ne 1 -or
    @(Compare-Object @($guard.ready_slice_unit_ids | Sort-Object -Unique) @($closeoutSlices[0].unit_ids | Sort-Object -Unique)).Count -ne 0) {
  throw "Closeout promotion was not authorized by GATE-020."
}
foreach ($activatedId in @($guard.activated_lifecycle_unit_ids)) {
  if (@($manifest.units | Where-Object {
    $_.id -eq $activatedId -and $_.status -eq "VERIFIED" -and
    $activatedId -in @($closeoutSlices[0].unit_ids)
  }).Count -ne 1) {
    throw "Lifecycle-activated work changed during closeout promotion: $activatedId"
  }
}
$repoRoot = (Resolve-Path (git rev-parse --show-toplevel).Trim()).Path
foreach ($leaf in @($guard.sealed_evidence_leaves)) {
  git check-ignore -q -- ([string]$leaf.path)
  if ($LASTEXITCODE -ne 1) {
    throw "Sealed decision evidence became ignored or unclassifiable: $($leaf.path)"
  }
  $resolved = (Resolve-Path -LiteralPath (Join-Path $repoRoot ([string]$leaf.path))).Path
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $resolved).Hash.ToLowerInvariant() -ne $leaf.sha256) {
    throw "Sealed decision evidence changed during closeout promotion: $($leaf.path)"
  }
}
foreach ($snapshot in $guard.conditional_branches) {
  $currentUnit = @($manifest.units | Where-Object id -eq $snapshot.unit_id)
  if ($currentUnit.Count -ne 1 -or $currentUnit[0].status -ne $snapshot.status -or
      (Get-FileHash -Algorithm SHA256 $snapshot.receipt_path).Hash.ToLowerInvariant() -ne $snapshot.receipt_sha256) {
    throw "Conditional state or decision receipt changed during closeout promotion."
  }
}
bun run validate:plan-pack -- $pack
if ($LASTEXITCODE -ne 0) { throw "Promoted plan pack is invalid." }
```

## Plan-State Evidence

`UNIT-000` first creates
`evidence/unit-000-predecessor-dispositions.json`, completes every tracked
predecessor/current-pack write, and atomically stages its post-unit manifest
state. It then runs the shared candidate-freeze and focused-test blocks with the
`UNIT-000` row substitutions before running the following fail-closed authority
contract. The prose scan uses only the explicit predecessor and inbound-reference
files listed in `02-UNIT-CATALOG.md`; it does not scan this matrix, raw evidence,
source snapshots, or historical observations.

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$runtimeRoot = ".tmp/code-improvement"
New-Item -ItemType Directory -Force "$runtimeRoot/evidence" | Out-Null
$expectedBaseline = "93d5124d268a1b6016f63f8a8e5e69e118630d13"
$initialManifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
if ([string]$initialManifest.baseline.head -ne $expectedBaseline) {
  throw "UNIT-000 cannot move the immutable package baseline."
}
$baseline = $expectedBaseline
$securitySupplementManifest = ".ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack/plan-pack.json"
$wholeRepoManifests = @(
  "$pack/plan-pack.json",
  $securitySupplementManifest,
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/plan-pack.json",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/plan-pack.json"
)
$targetedManifests = @(
  ".ai/03_plans/2026-07-20/Quick-Correctness-And-Security-Wins/plan-pack.json",
  ".ai/03_plans/2026-07-20/Test-Characterization-Baselines/plan-pack.json",
  ".ai/03_plans/2026-07-20/D1-Runtime-Consolidation/plan-pack.json",
  ".ai/03_plans/2026-07-20/Estimate-Mutation-Integrity-Unification/plan-pack.json",
  ".ai/03_plans/2026-07-20/Money-Math-Domain-Module/plan-pack.json"
)
$predecessorManifests = @($wholeRepoManifests[2..3]) + $targetedManifests
$currentManifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
$currentUnit = @($currentManifest.units | Where-Object id -eq "UNIT-000")
$nextUnit = @($currentManifest.units | Where-Object id -eq $currentManifest.next_unit)
if ($currentUnit.Count -ne 1 -or $currentUnit[0].status -ne "VERIFIED" -or
    $currentManifest.implementation_status -ne "IN_PROGRESS" -or
    $currentManifest.last_observed_run_scope -ne "IMPLEMENT_LOCAL" -or
    $currentManifest.next_unit -eq "UNIT-000" -or
    $nextUnit.Count -ne 1 -or $nextUnit[0].status -ne "READY") {
  throw "UNIT-000 post-transition manifest state was not staged before candidate freeze."
}
$candidate = Get-Content -LiteralPath "$runtimeRoot/evidence/unit-000-candidate.json" -Raw | ConvertFrom-Json
if ($candidate.status -ne "PASS" -or
    $candidate.data.record.comparison_base.resolved_sha -ne $baseline -or
    $candidate.data.record.commit_sha -ne (git rev-parse HEAD).Trim().ToLowerInvariant()) {
  throw "UNIT-000 authority evidence is not using the frozen candidate."
}
$dispositionDocument = Get-Content -LiteralPath "$pack/evidence/unit-000-predecessor-dispositions.json" -Raw | ConvertFrom-Json
$dispositions = @($dispositionDocument.dispositions)
$repoRoot = (Resolve-Path (git rev-parse --show-toplevel).Trim()).Path
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
function Resolve-RepositoryEvidenceLeaf([string]$relativePath) {
  $candidatePath = $repoRoot
  foreach ($segment in $relativePath.Split("/")) {
    $candidatePath = Join-Path $candidatePath $segment
    if (-not (Test-Path -LiteralPath $candidatePath)) {
      throw "Disposition evidence component does not exist: $relativePath"
    }
    $candidateItem = Get-Item -LiteralPath $candidatePath -Force
    if (($candidateItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw "Disposition evidence cannot traverse a reparse point: $relativePath"
    }
  }
  $absolutePath = [IO.Path]::GetFullPath($candidatePath)
  if (-not $absolutePath.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase) -or
      -not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Disposition evidence does not resolve to a repository file: $relativePath"
  }
  return $absolutePath
}
$candidateRevision = (git rev-parse HEAD).Trim().ToLowerInvariant()
if ($dispositionDocument.candidate_revision -ne $candidateRevision) {
  throw "Predecessor dispositions do not bind the current candidate revision."
}
$candidateFiles = @($candidate.data.record.changed_files)
$allowedDispositions = @(
  "ABSORBED_CURRENT_UNIT",
  "LANDED_CURRENT_SOURCE",
  "REFUTED_CURRENT_SOURCE",
  "AUTH_BOUNDARY"
)
$expectedKeys = foreach ($path in $predecessorManifests) {
  $manifest = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  foreach ($unit in $manifest.units) { "${path}::$($unit.id)" }
}
$actualKeys = @($dispositions | ForEach-Object { "$($_.predecessor_manifest)::$($_.predecessor_unit_id)" })
$keyDelta = @(Compare-Object ($expectedKeys | Sort-Object -Unique) ($actualKeys | Sort-Object -Unique))
if ($keyDelta.Count -ne 0 -or $actualKeys.Count -ne @($actualKeys | Sort-Object -Unique).Count) {
  throw "Predecessor disposition coverage is incomplete or duplicated."
}
$currentTraceIds = @(
  $currentManifest.requirements.id
  $currentManifest.units.id
  $currentManifest.decisions.id
  $currentManifest.authorization_boundaries.id
  $currentManifest.evidence_index.id
  $currentManifest.criteria.id
)
foreach ($row in $dispositions) {
  if ($row.disposition -notin $allowedDispositions -or
      @($row.target_ids).Count -eq 0 -or
      @($row.evidence_paths).Count -eq 0 -or
      @($row.target_ids | Where-Object { $_ -notin $currentTraceIds }).Count -ne 0) {
    throw "Malformed or untraceable disposition: $($row.predecessor_manifest)::$($row.predecessor_unit_id)"
  }
}
$admissionFixtureRoot = Join-Path $runtimeRoot ("evidence/unit-000-untracked-hardlink-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $admissionFixtureRoot | Out-Null
git -C $admissionFixtureRoot init -q
if ($LASTEXITCODE -ne 0) { throw "Could not initialize disposition-admission fixture repository." }
$trackedFixture = Join-Path $admissionFixtureRoot "tracked-evidence.md"
$untrackedHardlinkFixture = Join-Path $admissionFixtureRoot "untracked-hardlink.md"
Set-Content -LiteralPath $trackedFixture -Value "tracked evidence" -Encoding utf8
git -C $admissionFixtureRoot add -- "tracked-evidence.md"
if ($LASTEXITCODE -ne 0) { throw "Could not stage disposition-admission fixture evidence." }
New-Item -ItemType HardLink -Path $untrackedHardlinkFixture -Target $trackedFixture | Out-Null
git -C $admissionFixtureRoot check-ignore -q -- "untracked-hardlink.md"
if ($LASTEXITCODE -ne 1) { throw "Untracked hard-link fixture did not remain non-ignored." }
git -C $admissionFixtureRoot ls-files --error-unmatch -- "untracked-hardlink.md" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { throw "Untracked hard-link fixture unexpectedly passed tracked-evidence admission." }
if ($LASTEXITCODE -ne 1) { throw "Untracked hard-link fixture admission status is unknown." }
$dispositionEvidence = foreach ($row in $dispositions) {
  foreach ($evidence in @($row.evidence_paths)) {
    $evidenceKeys = @($evidence.PSObject.Properties.Name | Sort-Object)
    if (($evidenceKeys -join ",") -ne "path,sha256,source_revision" -or
        [string]::IsNullOrWhiteSpace([string]$evidence.path) -or
        [IO.Path]::IsPathRooted([string]$evidence.path) -or
        ([string]$evidence.path).Contains("\") -or
        ([string]$evidence.path).Split("/") -contains ".." -or
        ([string]$evidence.path).StartsWith(".tmp/", [StringComparison]::OrdinalIgnoreCase) -or
        $evidence.sha256 -notmatch "^[a-f0-9]{64}$" -or
        $evidence.source_revision -ne $candidateRevision) {
      throw "Malformed disposition evidence reference."
    }
    git check-ignore -q -- ([string]$evidence.path)
    $ignoreStatus = $LASTEXITCODE
    if ($ignoreStatus -eq 0) {
      throw "Disposition evidence cannot use a Git-ignored path: $($evidence.path)"
    }
    if ($ignoreStatus -ne 1) {
      throw "Disposition evidence ignore status is unknown: $($evidence.path)"
    }
    git ls-files --error-unmatch -- ([string]$evidence.path) | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Disposition evidence must be tracked candidate content: $($evidence.path)"
    }
    $absoluteEvidencePath = Resolve-RepositoryEvidenceLeaf ([string]$evidence.path)
    $observedEvidenceSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $absoluteEvidencePath).Hash.ToLowerInvariant()
    $candidateEntry = @($candidateFiles | Where-Object {
      $_.path -eq [string]$evidence.path -and $_.deleted -eq $false
    })
    if ($observedEvidenceSha -ne $evidence.sha256 -or
        $candidateEntry.Count -ne 1 -or
        $candidateEntry[0].sha256 -ne $observedEvidenceSha) {
      throw "Disposition evidence is absent from or stale against the frozen candidate: $($evidence.path)"
    }
    [pscustomobject]@{
      predecessor_manifest = $row.predecessor_manifest
      predecessor_unit_id = $row.predecessor_unit_id
      path = $evidence.path
      sha256 = $observedEvidenceSha
      source_revision = $candidateRevision
    }
  }
}
$authorityRows = foreach ($path in $wholeRepoManifests) {
  $manifest = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  [pscustomobject]@{
    path = $path
    package_status = $manifest.package_status
    plan_lifecycle = $manifest.plan_lifecycle
    terminal_status = $manifest.terminal_status
    next_unit = $manifest.next_unit
    ready_slice_count = @($manifest.ready_slices).Count
    ready_work_count = @($manifest.units | Where-Object { $_.status -in @("READY", "IN_PROGRESS") }).Count
    runnable = $manifest.plan_lifecycle -eq "ACTIVE" -and
      $manifest.terminal_status -eq "ACTIVE" -and
      $manifest.package_status -in @("IMPLEMENTATION_READY", "CONDITIONALLY_READY") -and
      ($null -ne $manifest.next_unit -or @($manifest.ready_slices).Count -gt 0)
  }
}
$runnable = @($authorityRows | Where-Object runnable)
if ($runnable.Count -ne 1 -or $runnable[0].path -ne "$pack/plan-pack.json") {
  throw "Expected Code-Improvement to be the sole runnable whole-repository authority."
}
foreach ($path in $predecessorManifests) {
  $manifest = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $readyWork = @($manifest.units | Where-Object { $_.status -in @("READY", "IN_PROGRESS") })
  if ($manifest.package_status -ne "NOT_READY" -or
      $manifest.plan_lifecycle -ne "N/A" -or
      $null -ne $manifest.next_unit -or
      @($manifest.ready_slices).Count -ne 0 -or
      $readyWork.Count -ne 0) {
    throw "Runnable predecessor state remains in $path"
  }
}
$authorityReferenceFiles = @(
  ".ai/03_plans/README.md",
  ".ai/03_plans/2026-07-18-MVP-Startup-Readiness-Audit/00-PLAN.md",
  ".ai/03_plans/2026-07-18-MVP-Startup-Readiness-Audit/README.md",
  ".ai/03_plans/2026-07-18-MVP-Startup-Readiness-Audit/013-external-row-total-divergence.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/README.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/IMPLEMENTATION_PLAN.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/LOOP_LEDGER.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/UNIT-CATALOG.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/README.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/00-PLAN.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/PACK-MANIFEST.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/units/README.md",
  ".ai/03_plans/2026-07-20/README.md",
  ".ai/03_plans/2026-07-20/Quick-Correctness-And-Security-Wins/00-PLAN.md",
  ".ai/03_plans/2026-07-20/Quick-Correctness-And-Security-Wins/README.md",
  ".ai/03_plans/2026-07-20/Test-Characterization-Baselines/00-PLAN.md",
  ".ai/03_plans/2026-07-20/Test-Characterization-Baselines/README.md",
  ".ai/03_plans/2026-07-20/D1-Runtime-Consolidation/00-PLAN.md",
  ".ai/03_plans/2026-07-20/D1-Runtime-Consolidation/README.md",
  ".ai/03_plans/2026-07-20/Estimate-Mutation-Integrity-Unification/00-PLAN.md",
  ".ai/03_plans/2026-07-20/Estimate-Mutation-Integrity-Unification/README.md",
  ".ai/03_plans/2026-07-20/Money-Math-Domain-Module/00-PLAN.md",
  ".ai/03_plans/2026-07-20/Money-Math-Domain-Module/README.md",
  ".ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack/README.md",
  ".ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack/00-PLAN.md",
  ".ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack/02-IMPLEMENTATION-UNITS.md",
  $securitySupplementManifest,
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/00-PLAN.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/04-FINDINGS-REGISTER.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/LOOP_LEDGER.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/README.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/plan-pack.json",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-002-observability-alert-delivery.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-003-hosted-oauth-roundtrip.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-004-email-dns-topology.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-005-hosted-queue-do-r2-ops.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-006-release-gate-ritual.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-007-d1-parity-retention.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/00-PLAN.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/LOOP_LEDGER.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/README.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/units/001-action-inbox-async-server-actions.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/units/008-magic-link-and-session-expiry-copy.md",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/units/011-share-password-ux.md",
  ".ai/03_plans/2026-07-19/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack/00-PLAN.md",
  ".ai/03_plans/2026-07-19/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack/README.md",
  ".ai/03_plans/2026-07-19/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack/UNIT-CATALOG.md",
  ".ai/03_plans/2026-07-19/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack/plan-pack.json"
) + $predecessorManifests
$authorityPattern = "(active canonical|canonical execution|execution authority|owns every|remain(s)? the owner|implementation awaits|exact next unit).*(Quality Master|Infosec|2026-07-20)|(Quality Master|Infosec|2026-07-20).*(active canonical|canonical execution|execution authority|owns every|remain(s)? the owner|implementation awaits|exact next unit)|\.ai/03_plans/2026-07-19-Archestimator-Whole-Repo"
$staleAuthorityClaims = @(Select-String -LiteralPath $authorityReferenceFiles -Pattern $authorityPattern -CaseSensitive:$false)
if ($staleAuthorityClaims.Count -ne 0) {
  throw "Stale predecessor authority prose remains:`n$($staleAuthorityClaims -join "`n")"
}
$touchedPacks = @(
  ".ai/03_plans/2026-07-31/Code-Improvement",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack",
  ".ai/03_plans/2026-07-20/Quick-Correctness-And-Security-Wins",
  ".ai/03_plans/2026-07-20/Test-Characterization-Baselines",
  ".ai/03_plans/2026-07-20/D1-Runtime-Consolidation",
  ".ai/03_plans/2026-07-20/Estimate-Mutation-Integrity-Unification",
  ".ai/03_plans/2026-07-20/Money-Math-Domain-Module",
  ".ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack",
  ".ai/03_plans/2026-07-18-MVP-Startup-Readiness-Audit",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack",
  ".ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack",
  ".ai/03_plans/2026-07-19/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack"
)
$validatorOutcomes = foreach ($path in $touchedPacks) {
  $output = @(bun run validate:plan-pack -- $path 2>&1)
  if ($LASTEXITCODE -ne 0) { throw "Plan validation failed: $path`n$($output -join "`n")" }
  [pscustomobject]@{ path = $path; result = "PASS" }
}
git diff --check
if ($LASTEXITCODE -ne 0) { throw "Whitespace validation failed." }
bun run validate:plan-pack -- $pack
if ($LASTEXITCODE -ne 0) { throw "Post-receipt plan validation failed." }
$authorityReceipt = "$runtimeRoot/evidence/unit-000-authority.json"
git check-ignore -q -- $authorityReceipt
if ($LASTEXITCODE -ne 0) { throw "Authority receipt is not Git-ignored." }
[pscustomobject]@{
  candidate_sha256 = $candidate.data.sha256
  commit_sha = $candidate.data.record.commit_sha
  comparison_base = $candidate.data.record.comparison_base.resolved_sha
  candidate_revision = (git rev-parse HEAD)
  disposition_sha256 = (Get-FileHash -Algorithm SHA256 "$pack/evidence/unit-000-predecessor-dispositions.json").Hash.ToLowerInvariant()
  disposition_count = $dispositions.Count
  disposition_evidence = @($dispositionEvidence)
  whole_repo_authorities = $authorityRows
  validator_outcomes = $validatorOutcomes
  stale_authority_claims = @()
  result = "PASS"
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $authorityReceipt -Encoding utf8
```

Create the candidate-author and independent quality/security review receipts
from the frozen `UNIT-000` candidate, then run the shared exact-candidate Q2/Q3
verification block with:

- `UNIT_ID=UNIT-000`
- `FOCUSED_RECEIPT_BINDING=evidence/unit-000-vitest.json.binding.json`
- `BROWSER_RECEIPT_BINDING=N/A`
- the `UNIT-000` review/author table row
- `QUALITY_RECEIPT=evidence/unit-000-q2.json`

Immediately after that verifier passes, rerun repository containment and evidence
fingerprints against the same candidate:

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$runtimeRoot = ".tmp/code-improvement"
$repoRoot = (Resolve-Path (git rev-parse --show-toplevel).Trim()).Path
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
function Resolve-RepositoryEvidenceLeaf([string]$relativePath) {
  $candidatePath = $repoRoot
  foreach ($segment in $relativePath.Split("/")) {
    $candidatePath = Join-Path $candidatePath $segment
    if (-not (Test-Path -LiteralPath $candidatePath)) {
      throw "Disposition evidence component does not exist: $relativePath"
    }
    $candidateItem = Get-Item -LiteralPath $candidatePath -Force
    if (($candidateItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw "Disposition evidence cannot traverse a reparse point: $relativePath"
    }
  }
  $absolutePath = [IO.Path]::GetFullPath($candidatePath)
  if (-not $absolutePath.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase) -or
      -not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Disposition evidence does not resolve to a repository file: $relativePath"
  }
  return $absolutePath
}
$candidate = Get-Content -LiteralPath "$runtimeRoot/evidence/unit-000-candidate.json" -Raw | ConvertFrom-Json
$quality = Get-Content -LiteralPath "$runtimeRoot/evidence/unit-000-q2.json" -Raw | ConvertFrom-Json
$authorityReceipt = "$runtimeRoot/evidence/unit-000-authority.json"
$authority = Get-Content -LiteralPath $authorityReceipt -Raw | ConvertFrom-Json
if ($quality.status -ne "PASS" -or
    $quality.data.candidate.sha256 -ne $candidate.data.sha256 -or
    $quality.data.candidate.commit_sha -ne $candidate.data.record.commit_sha -or
    $authority.candidate_sha256 -ne $candidate.data.sha256 -or
    $authority.commit_sha -ne $candidate.data.record.commit_sha -or
    $authority.comparison_base -ne $candidate.data.record.comparison_base.resolved_sha) {
  throw "UNIT-000 authority and Q2 receipts do not bind the same frozen candidate."
}
if ((Get-FileHash -Algorithm SHA256 "$pack/evidence/unit-000-predecessor-dispositions.json").Hash.ToLowerInvariant() -ne
    $authority.disposition_sha256) {
  throw "Predecessor disposition map changed during UNIT-000 Q2 verification."
}
foreach ($fingerprint in $authority.disposition_evidence) {
  if ([string]::IsNullOrWhiteSpace([string]$fingerprint.path) -or
      [IO.Path]::IsPathRooted([string]$fingerprint.path) -or
      ([string]$fingerprint.path).Contains("\") -or
      ([string]$fingerprint.path).Split("/") -contains ".." -or
      ([string]$fingerprint.path).StartsWith(".tmp/", [StringComparison]::OrdinalIgnoreCase)) {
    throw "Predecessor evidence path became malformed during UNIT-000 Q2 verification."
  }
  git check-ignore -q -- ([string]$fingerprint.path)
  $ignoreStatus = $LASTEXITCODE
  if ($ignoreStatus -eq 0) {
    throw "Predecessor evidence became Git-ignored during UNIT-000 Q2 verification: $($fingerprint.path)"
  }
  if ($ignoreStatus -ne 1) {
    throw "Predecessor evidence ignore status is unknown during UNIT-000 Q2 verification: $($fingerprint.path)"
  }
  git ls-files --error-unmatch -- ([string]$fingerprint.path) | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Predecessor evidence became untracked during UNIT-000 Q2 verification: $($fingerprint.path)"
  }
  $absoluteEvidencePath = Resolve-RepositoryEvidenceLeaf ([string]$fingerprint.path)
  $currentEvidenceSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $absoluteEvidencePath).Hash.ToLowerInvariant()
  $candidateEntry = @($candidate.data.record.changed_files | Where-Object {
    $_.path -eq [string]$fingerprint.path -and $_.deleted -eq $false
  })
  if ($candidateEntry.Count -ne 1 -or
      $candidateEntry[0].sha256 -ne $currentEvidenceSha -or
      $currentEvidenceSha -ne $fingerprint.sha256 -or
      $fingerprint.source_revision -ne $candidate.data.record.commit_sha) {
    throw "Predecessor evidence changed during UNIT-000 Q2 verification: $($fingerprint.path)"
  }
}
```

Any failure restages `UNIT-000` as `IN_PROGRESS`, reseals the manifest, and starts
a new candidate/review cycle. No tracked write follows a passing Q2/Q3 verifier
and post-verification containment check.

`UNIT-024` stages its two durable decision receipts, scanner-topology evidence,
47-unit manifest, and exact Markdown catalogue before candidate freeze. Its
focused test recomputes all 200 `CSF-*` and 21 PR identities, verifies one owner
per record, proves the 48 newly assigned records equal the `UNIT-030` through
`UNIT-046` union, validates the supplement remains non-runnable, rehashes every
sealed evidence leaf, and requires the exact
`EXTERNAL_PROVIDER_AUTH_REQUIRED` transition. The manifest state is
`UNIT-024=VERIFIED`, `UNIT-025=SUPERSEDED`, `AC-002/AC-006=BOUNDARY` under
`AUTH-001`, and `UNIT-013=READY`; the package terminal state remains `ACTIVE`
while independent local work exists. Run the focused test, both touched plan-pack
validators, `git diff --check`, and the shared exact-candidate Q2 block using the
`UNIT-024` review/author row. No browser receipt applies to this decision unit.

`UNIT-027` stores its three lifecycle dispositions in
`evidence/unit-027-lifecycle.json`, then runs the current-pack validator,
`git diff --check`, the same explicit prose-authority scan, and the Q2
freeze/review/verification contract with the `UNIT-027` table substitutions.

## Technical Stop Gate

This branch is separate from closeout. Run it only after
`NO_TECHNICALLY_VIABLE_PROVIDER` or `NO_SAFE_COMPATIBLE_DESIGN`, after every
other safe local and lifecycle-activated unit has reached a reviewed terminal
state and `UNIT-028` has verified the independent cleanup/documentation work.
Do not promote `GATE-020` or run `UNIT-020`. Atomically stage and seal:

- the selected downstream unit as `BLOCKED`;
- its exact linked core requirement as `BLOCKED`;
- `UNIT-020=PLANNED` and `GATE-020=FAIL`;
- `package_status=NOT_READY`, `implementation_status=INCOMPLETE`,
  `release_status=BOUNDARY`, `plan_lifecycle=ACTIVE`,
  `terminal_status=TECH_BLOCKED`, and
  `last_observed_run_scope=IMPLEMENT_LOCAL`;
- `next_unit=null` and an empty `ready_slices` array.

Then run the shared candidate-freeze and exact-candidate blocks with:

- `UNIT_ID=TECH-BLOCKED`;
- both evidence bindings set to `N/A`;
- the `TECH-BLOCKED` review/author table row; and
- `QUALITY_RECEIPT=evidence/tech-blocked-q2.json`.

The quality receipt must be Q2 or naturally escalated Q3 and must include
distinct exact-candidate quality/security reviewers. After it passes, run
GitNexus `detect_changes` against both the immutable baseline and `main`, store
the same closed comparison schema used by integrated closeout at
`.tmp/code-improvement/evidence/tech-blocked-gitnexus-detect-changes.json`, and
run this terminal guard:

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$runtimeRoot = ".tmp/code-improvement"
$expectedBaseline = "93d5124d268a1b6016f63f8a8e5e69e118630d13"
$manifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
$candidatePath = "$runtimeRoot/evidence/tech-blocked-candidate.json"
$qualityPath = "$runtimeRoot/evidence/tech-blocked-q2.json"
$gitnexusPath = "$runtimeRoot/evidence/tech-blocked-gitnexus-detect-changes.json"
$candidate = Get-Content -LiteralPath $candidatePath -Raw | ConvertFrom-Json
$quality = Get-Content -LiteralPath $qualityPath -Raw | ConvertFrom-Json
$gitnexus = Get-Content -LiteralPath $gitnexusPath -Raw | ConvertFrom-Json
$currentRevision = (git rev-parse HEAD).Trim().ToLowerInvariant()
$repoRoot = (Resolve-Path (git rev-parse --show-toplevel).Trim()).Path
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

function Assert-CandidateFile([string]$path, [string]$expectedSha256 = "") {
  if ($path -notmatch "^[A-Za-z0-9._/-]+$" -or $path -match "^\.tmp/") {
    throw "Terminal candidate path is malformed: $path"
  }
  git check-ignore -q -- $path
  if ($LASTEXITCODE -eq 0) { throw "Terminal evidence may not be Git-ignored: $path" }
  if ($LASTEXITCODE -ne 1) { throw "Terminal evidence ignore status is unknown: $path" }
  $resolved = (Resolve-Path -LiteralPath (Join-Path $repoRoot $path)).Path
  if (-not $resolved.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase) -or
      -not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
    throw "Terminal candidate path escaped or disappeared: $path"
  }
  $currentSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolved).Hash.ToLowerInvariant()
  $candidateEntry = @($candidate.data.record.changed_files | Where-Object {
    $_.path -eq $path -and $_.deleted -eq $false
  })
  if ($candidateEntry.Count -ne 1 -or
      $candidateEntry[0].sha256 -ne $currentSha256 -or
      (-not [string]::IsNullOrEmpty($expectedSha256) -and $currentSha256 -ne $expectedSha256)) {
    throw "Terminal evidence is absent from or stale against the canonical candidate: $path"
  }
}

function Assert-SealedEvidenceLeaves([object[]]$leaves, [string]$receiptPath) {
  if ($leaves.Count -eq 0) { throw "Terminal decision evidence is empty: $receiptPath" }
  foreach ($leaf in $leaves) {
    $keys = @($leaf.PSObject.Properties.Name | Sort-Object)
    if ((Compare-Object @("path", "sha256", "source_revision") $keys).Count -ne 0 -or
        [string]$leaf.path -notmatch "^[A-Za-z0-9._/-]+$" -or
        [string]$leaf.path -match "^\.tmp/" -or
        [string]$leaf.sha256 -notmatch "^[a-f0-9]{64}$" -or
        [string]$leaf.source_revision -ne $currentRevision) {
      throw "Terminal decision evidence leaf is malformed: $receiptPath"
    }
    Assert-CandidateFile ([string]$leaf.path) ([string]$leaf.sha256)
    $resolved = (Resolve-Path -LiteralPath (Join-Path $repoRoot ([string]$leaf.path))).Path
    if (-not $resolved.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        -not (Test-Path -LiteralPath $resolved -PathType Leaf) -or
        (Get-FileHash -Algorithm SHA256 -LiteralPath $resolved).Hash.ToLowerInvariant() -ne $leaf.sha256) {
      throw "Terminal decision evidence escaped, disappeared, or changed: $($leaf.path)"
    }
  }
}

if ([string]$manifest.baseline.head -ne $expectedBaseline -or
    $candidate.status -ne "PASS" -or
    $candidate.data.record.comparison_base.resolved_sha -ne $expectedBaseline -or
    $candidate.data.record.commit_sha -ne $currentRevision -or
    $manifest.package_status -ne "NOT_READY" -or
    $manifest.implementation_status -ne "INCOMPLETE" -or
    $manifest.release_status -ne "BOUNDARY" -or
    $manifest.plan_lifecycle -ne "ACTIVE" -or
    $manifest.terminal_status -ne "TECH_BLOCKED" -or
    $manifest.last_observed_run_scope -ne "IMPLEMENT_LOCAL" -or
    $null -ne $manifest.next_unit -or
    @($manifest.ready_slices).Count -ne 0) {
  throw "TECH_BLOCKED manifest tuple or immutable candidate binding is invalid."
}

$closeout = @($manifest.units | Where-Object id -eq "UNIT-020")
$safeCleanup = @($manifest.units | Where-Object id -eq "UNIT-028")
$closeoutGate = @($manifest.gates | Where-Object id -eq "GATE-020")
$runnableUnits = @($manifest.units | Where-Object status -in @("READY", "IN_PROGRESS"))
$plannedUnits = @($manifest.units | Where-Object status -eq "PLANNED")
$blockedUnits = @($manifest.units | Where-Object status -eq "BLOCKED")
$unexpectedSafeState = @($manifest.units | Where-Object {
  $_.id -ne "UNIT-020" -and $_.status -notin @("VERIFIED", "SUPERSEDED", "BLOCKED")
})
if ($closeout.Count -ne 1 -or $closeout[0].status -ne "PLANNED" -or
    $safeCleanup.Count -ne 1 -or $safeCleanup[0].status -ne "VERIFIED" -or
    $closeoutGate.Count -ne 1 -or $closeoutGate[0].status -ne "FAIL" -or
    $runnableUnits.Count -ne 0 -or
    $plannedUnits.Count -ne 1 -or $plannedUnits[0].id -ne "UNIT-020" -or
    $blockedUnits.Count -eq 0 -or
    @($blockedUnits | Where-Object { $_.id -notin @("UNIT-025", "UNIT-026") }).Count -ne 0 -or
    $unexpectedSafeState.Count -ne 0) {
  throw "TECH_BLOCKED requires no runnable work and only a declared conditional blocker."
}

$securitySupplementManifestPath = ".ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack/plan-pack.json"
$securityAdmissionPath = "$pack/evidence/unit-024-codex-security-supplement-disposition.json"
Assert-CandidateFile $securitySupplementManifestPath
Assert-CandidateFile $securityAdmissionPath
$securitySupplement = Get-Content -LiteralPath $securitySupplementManifestPath -Raw | ConvertFrom-Json
$securityAdmission = Get-Content -LiteralPath $securityAdmissionPath -Raw | ConvertFrom-Json
$securityAdmissionKeys = @($securityAdmission.PSObject.Properties.Name | Sort-Object)
$expectedSecurityAdmissionKeys = @(
  "candidate_revision", "decision_unit_id", "duplicate_owner_count",
  "evidence_paths", "finding_count", "finding_mappings", "pr_mappings",
  "pr_record_count", "result", "schema_version", "source_manifest_sha256",
  "source_package_id", "target_package_id", "terminal_effect", "unowned_count"
)
$expectedFindingIds = @(1..200 | ForEach-Object { "CSF-{0:D3}" -f $_ })
$expectedPrIds = @(
  124, 125, 126, 127, 128, 129, 138, 140, 141, 142, 143, 144, 145,
  146, 147, 148, 149, 150, 151, 152, 153
) | ForEach-Object { "PR-$_" }
$findingMappings = @($securityAdmission.finding_mappings)
$prMappings = @($securityAdmission.pr_mappings)
$allowedMappingOutcomes = @(
  "IMPLEMENT_IN_TARGET", "ACTIVE_TARGET_UNIT", "NO_CURRENT_DELTA",
  "HOSTED_BOUNDARY"
)
if ((Compare-Object $expectedSecurityAdmissionKeys $securityAdmissionKeys).Count -ne 0 -or
    $securityAdmission.schema_version -ne 1 -or
    $securityAdmission.decision_unit_id -ne "UNIT-024" -or
    $securityAdmission.candidate_revision -ne $currentRevision -or
    $securityAdmission.source_package_id -ne "PLAN-2026-08-01-codex-security-delta-remediation" -or
    $securityAdmission.target_package_id -ne "PLAN-2026-07-31-code-improvement" -or
    $securityAdmission.result -ne "ABSORBED_INTO_CODE_IMPROVEMENT" -or
    $securityAdmission.terminal_effect -ne "NONE" -or
    $securityAdmission.finding_count -ne 200 -or
    $securityAdmission.pr_record_count -ne 21 -or
    $securityAdmission.unowned_count -ne 0 -or
    $securityAdmission.duplicate_owner_count -ne 0 -or
    $securityAdmission.source_manifest_sha256 -ne $securitySupplement.manifest_sha256 -or
    $securitySupplement.package_status -ne "NOT_READY" -or
    $securitySupplement.implementation_status -ne "NOT_STARTED" -or
    $securitySupplement.plan_lifecycle -ne "ACTIVE" -or
    $securitySupplement.terminal_status -ne "ACTIVE" -or
    $null -ne $securitySupplement.next_unit -or
    @($securitySupplement.ready_slices).Count -ne 0 -or
    @($securitySupplement.units | Where-Object status -in @("READY", "IN_PROGRESS")).Count -ne 0 -or
    $findingMappings.Count -ne 200 -or
    $prMappings.Count -ne 21 -or
    (Compare-Object $expectedFindingIds @($findingMappings.source_id | Sort-Object -Unique)).Count -ne 0 -or
    (Compare-Object $expectedPrIds @($prMappings.source_id | Sort-Object -Unique)).Count -ne 0) {
  throw "UNIT-024 Codex Security supplement admission receipt is invalid."
}
foreach ($mapping in @($findingMappings + $prMappings)) {
  $mappingKeys = @($mapping.PSObject.Properties.Name | Sort-Object)
  $owner = @($manifest.units | Where-Object id -eq $mapping.owner_unit_id)
  if ((Compare-Object @("outcome", "owner_unit_id", "source_id") $mappingKeys).Count -ne 0 -or
      $mapping.outcome -notin $allowedMappingOutcomes -or
      $owner.Count -ne 1) {
    throw "Codex Security supplement mapping is malformed or unowned: $($mapping.source_id)"
  }
}
Assert-SealedEvidenceLeaves @($securityAdmission.evidence_paths) $securityAdmissionPath

$contracts = @(
  [pscustomobject]@{
    decision_unit_id = "UNIT-024"
    downstream_unit_id = "UNIT-025"
    decision_id = "DEC-AUTO-005"
    receipt_path = "$pack/evidence/unit-024-scanner-viability-decision.json"
    rules = @{
      AUTHORITATIVE_PROVIDER_VIABLE = [pscustomobject]@{
        final_status = "VERIFIED"; transition_status = "READY"; terminal_effect = "NONE"
        blocked_requirement_id = $null; criterion_mode = "EMPTY"; technical = $false
      }
      EXTERNAL_PROVIDER_AUTH_REQUIRED = [pscustomobject]@{
        final_status = "SUPERSEDED"; transition_status = "SUPERSEDED"; terminal_effect = "AUTH_BLOCKED"
        blocked_requirement_id = $null; criterion_mode = "AUTH"; technical = $false
      }
      NO_TECHNICALLY_VIABLE_PROVIDER = [pscustomobject]@{
        final_status = "BLOCKED"; transition_status = "BLOCKED"; terminal_effect = "TECH_BLOCKED"
        blocked_requirement_id = "REQ-006"; criterion_mode = "EMPTY"; technical = $true
      }
    }
  },
  [pscustomobject]@{
    decision_unit_id = "UNIT-013"
    downstream_unit_id = "UNIT-026"
    decision_id = "DEC-AUTO-006"
    receipt_path = "$pack/evidence/unit-013-session-compatibility-decision.json"
    rules = @{
      COMPATIBLE_DESIGN = [pscustomobject]@{
        final_status = "VERIFIED"; transition_status = "READY"; terminal_effect = "NONE"
        blocked_requirement_id = $null; criterion_mode = "EMPTY"; technical = $false
      }
      NO_SAFE_COMPATIBLE_DESIGN = [pscustomobject]@{
        final_status = "BLOCKED"; transition_status = "BLOCKED"; terminal_effect = "TECH_BLOCKED"
        blocked_requirement_id = "REQ-002"; criterion_mode = "EMPTY"; technical = $true
      }
    }
  }
)

$technicalUnitIds = @()
$technicalRequirementIds = @()
foreach ($contract in $contracts) {
  Assert-CandidateFile $contract.receipt_path
  $receipt = Get-Content -LiteralPath $contract.receipt_path -Raw | ConvertFrom-Json
  $receiptKeys = @($receipt.PSObject.Properties.Name | Sort-Object)
  $rule = $contract.rules[[string]$receipt.outcome]
  if ((Compare-Object @(
        "candidate_revision", "criterion_transitions", "decision_id",
        "evidence_paths", "fallbacks", "outcome", "requirement_transitions",
        "schema_version", "terminal_effect", "unit_transitions"
      ) $receiptKeys).Count -ne 0 -or
      $null -eq $rule -or
      $receipt.schema_version -ne 1 -or
      $receipt.decision_id -ne $contract.decision_id -or
      $receipt.candidate_revision -ne $currentRevision -or
      $receipt.terminal_effect -ne $rule.terminal_effect) {
    throw "Conditional decision receipt is invalid: $($contract.receipt_path)"
  }
  Assert-SealedEvidenceLeaves @($receipt.evidence_paths) $contract.receipt_path

  $decisionUnit = @($manifest.units | Where-Object id -eq $contract.decision_unit_id)
  $downstreamUnit = @($manifest.units | Where-Object id -eq $contract.downstream_unit_id)
  $unitTransition = @($receipt.unit_transitions)
  if ($decisionUnit.Count -ne 1 -or $decisionUnit[0].status -ne "VERIFIED" -or
      $downstreamUnit.Count -ne 1 -or $downstreamUnit[0].status -ne $rule.final_status -or
      $unitTransition.Count -ne 1 -or
      (Compare-Object @("from_status", "to_status", "unit_id") @($unitTransition[0].PSObject.Properties.Name | Sort-Object)).Count -ne 0 -or
      $unitTransition[0].unit_id -ne $contract.downstream_unit_id -or
      $unitTransition[0].from_status -ne "PLANNED" -or
      $unitTransition[0].to_status -ne $rule.transition_status) {
    throw "Conditional unit transition or final state is invalid: $($contract.downstream_unit_id)"
  }

  $requirementTransitions = @($receipt.requirement_transitions)
  $fallbacks = @($receipt.fallbacks)
  if ($rule.technical) {
    if ($requirementTransitions.Count -ne 1 -or
        (Compare-Object @("from_status", "requirement_id", "to_status") @($requirementTransitions[0].PSObject.Properties.Name | Sort-Object)).Count -ne 0 -or
        $requirementTransitions[0].requirement_id -ne $rule.blocked_requirement_id -or
        $requirementTransitions[0].from_status -ne "ACCEPTED" -or
        $requirementTransitions[0].to_status -ne "BLOCKED" -or
        $fallbacks.Count -lt 2) {
      throw "Technical decision lacks its exact blocked requirement or fallback set."
    }
    $blockedRequirement = @($manifest.requirements | Where-Object id -eq $rule.blocked_requirement_id)
    if ($blockedRequirement.Count -ne 1 -or
        $blockedRequirement[0].status -ne "BLOCKED" -or
        $blockedRequirement[0].completion_role -ne "CORE" -or
        $contract.downstream_unit_id -notin @($blockedRequirement[0].unit_ids)) {
      throw "Technical decision did not block its linked core requirement."
    }
    $topEvidenceKeys = @($receipt.evidence_paths | ForEach-Object {
      "$($_.path)|$($_.sha256)|$($_.source_revision)"
    } | Sort-Object -Unique)
    $designIds = @()
    $distinguishingBoundaries = @()
    foreach ($fallback in $fallbacks) {
      $fallbackKeys = @($fallback.PSObject.Properties.Name | Sort-Object)
      if ((Compare-Object @("design_id", "distinguishing_boundary", "evidence_paths", "result") $fallbackKeys).Count -ne 0 -or
          [string]$fallback.design_id -notmatch "^[A-Za-z0-9_-]+$" -or
          [string]::IsNullOrWhiteSpace([string]$fallback.distinguishing_boundary) -or
          $fallback.result -ne "NOT_VIABLE") {
        throw "Technical fallback is malformed."
      }
      Assert-SealedEvidenceLeaves @($fallback.evidence_paths) $contract.receipt_path
      foreach ($leaf in @($fallback.evidence_paths)) {
        $leafKey = "$($leaf.path)|$($leaf.sha256)|$($leaf.source_revision)"
        if ($leafKey -notin $topEvidenceKeys) {
          throw "Technical fallback evidence is absent from the decision evidence union."
        }
      }
      $designIds += [string]$fallback.design_id
      $distinguishingBoundaries += [string]$fallback.distinguishing_boundary
    }
    if (@($designIds | Sort-Object -Unique).Count -ne $fallbacks.Count -or
        @($distinguishingBoundaries | Sort-Object -Unique).Count -ne $fallbacks.Count) {
      throw "Technical fallbacks are duplicated rather than materially distinct."
    }
    $technicalUnitIds += $contract.downstream_unit_id
    $technicalRequirementIds += $rule.blocked_requirement_id
  } elseif ($requirementTransitions.Count -ne 0 -or $fallbacks.Count -ne 0) {
    throw "Nontechnical decision invented a requirement transition or fallback failure."
  }

  $criterionTransitions = @($receipt.criterion_transitions)
  if ($rule.criterion_mode -eq "AUTH") {
    $boundaryIds = @($criterionTransitions | ForEach-Object criterion_id | Sort-Object -Unique)
    if ((Compare-Object @("AC-002", "AC-006") $boundaryIds).Count -ne 0) {
      throw "Authorization decision lacks its exact boundary criteria."
    }
    foreach ($transition in $criterionTransitions) {
      if ((Compare-Object @("authorization_boundary_id", "criterion_id", "from_status", "to_status") @($transition.PSObject.Properties.Name | Sort-Object)).Count -ne 0 -or
          $transition.from_status -ne "FAIL" -or
          $transition.to_status -ne "BOUNDARY" -or
          $transition.authorization_boundary_id -ne "AUTH-001") {
        throw "Authorization criterion transition is malformed."
      }
    }
    if (@($manifest.criteria | Where-Object {
          $_.id -in $boundaryIds -and $_.status -eq "BOUNDARY" -and
          $_.authorization_boundary_id -eq "AUTH-001"
        }).Count -ne 2 -or
        @($manifest.authorization_boundaries | Where-Object {
          $_.id -eq "AUTH-001" -and $_.status -eq "ACTIVE"
        }).Count -ne 1) {
      throw "Authorization decision is not represented by AUTH-001."
    }
  } elseif ($criterionTransitions.Count -ne 0) {
    throw "Decision invented criterion transitions."
  }
}

$manifestBlockedUnitIds = @($blockedUnits.id | Sort-Object -Unique)
$manifestBlockedRequirementIds = @($manifest.requirements | Where-Object status -eq "BLOCKED" | ForEach-Object id | Sort-Object -Unique)
if ($technicalUnitIds.Count -eq 0 -or
    (Compare-Object @($technicalUnitIds | Sort-Object -Unique) $manifestBlockedUnitIds).Count -ne 0 -or
    (Compare-Object @($technicalRequirementIds | Sort-Object -Unique) $manifestBlockedRequirementIds).Count -ne 0) {
  throw "TECH_BLOCKED does not equal the exact decision-derived blockers."
}

$lifecyclePath = "$pack/evidence/unit-027-lifecycle.json"
Assert-CandidateFile $lifecyclePath
$lifecycle = Get-Content -LiteralPath $lifecyclePath -Raw | ConvertFrom-Json
$lifecycleKeys = @($lifecycle.PSObject.Properties.Name | Sort-Object)
if ((Compare-Object @(
      "activated_unit_ids", "candidate_revision", "decision_id", "domains",
      "evidence_paths", "schema_version", "terminal_effect"
    ) $lifecycleKeys).Count -ne 0 -or
    $lifecycle.schema_version -ne 1 -or
    $lifecycle.decision_id -ne "DEC-AUTO-004" -or
    $lifecycle.candidate_revision -ne $currentRevision -or
    $lifecycle.terminal_effect -ne "NONE" -or
    @($lifecycle.domains).Count -ne 3) {
  throw "Lifecycle decision cannot authorize or weaken TECH_BLOCKED."
}
$expectedDomainIds = @("component_archive", "estimate_tab_archive", "native_client_portal_archive")
$allowedLifecycleDispositions = @("DELETE_DEAD_TRANSITION", "RESTORE_REQUIRED", "TERMINAL_ARCHIVE")
$domainActivatedIds = @()
$domainEvidenceKeys = @()
foreach ($domain in @($lifecycle.domains)) {
  $domainKeys = @($domain.PSObject.Properties.Name | Sort-Object)
  if ((Compare-Object @(
        "access_semantics", "activated_unit_ids", "credential_semantics",
        "data_semantics", "disposition", "domain_id", "evidence_paths"
      ) $domainKeys).Count -ne 0 -or
      $domain.domain_id -notin $expectedDomainIds -or
      $domain.disposition -notin $allowedLifecycleDispositions -or
      [string]::IsNullOrWhiteSpace([string]$domain.credential_semantics) -or
      [string]::IsNullOrWhiteSpace([string]$domain.access_semantics) -or
      [string]::IsNullOrWhiteSpace([string]$domain.data_semantics)) {
    throw "TECH_BLOCKED lifecycle domain row is malformed."
  }
  $rowActivatedIds = @($domain.activated_unit_ids)
  if (($domain.disposition -eq "RESTORE_REQUIRED" -and $rowActivatedIds.Count -eq 0) -or
      ($domain.disposition -ne "RESTORE_REQUIRED" -and $rowActivatedIds.Count -ne 0)) {
    throw "TECH_BLOCKED lifecycle disposition and activated work disagree: $($domain.domain_id)"
  }
  Assert-SealedEvidenceLeaves @($domain.evidence_paths) $lifecyclePath
  $domainActivatedIds += $rowActivatedIds
  $domainEvidenceKeys += @($domain.evidence_paths | ForEach-Object {
    "$($_.path)|$($_.sha256)|$($_.source_revision)"
  })
}
$actualDomainIds = @($lifecycle.domains | ForEach-Object domain_id | Sort-Object -Unique)
$activatedLifecycleIds = @($lifecycle.activated_unit_ids)
$topLifecycleEvidenceKeys = @($lifecycle.evidence_paths | ForEach-Object {
  "$($_.path)|$($_.sha256)|$($_.source_revision)"
} | Sort-Object -Unique)
if ((Compare-Object $expectedDomainIds $actualDomainIds).Count -ne 0 -or
    @($lifecycle.domains).Count -ne $actualDomainIds.Count -or
    $activatedLifecycleIds.Count -ne @($activatedLifecycleIds | Sort-Object -Unique).Count -or
    @($activatedLifecycleIds | Where-Object { $_ -notmatch "^UNIT-[0-9]{3}$" }).Count -ne 0 -or
    (Compare-Object @($activatedLifecycleIds | Sort-Object -Unique) @($domainActivatedIds | Sort-Object -Unique)).Count -ne 0 -or
    (Compare-Object $topLifecycleEvidenceKeys @($domainEvidenceKeys | Sort-Object -Unique)).Count -ne 0) {
  throw "TECH_BLOCKED lifecycle domain, activation, or evidence unions are invalid."
}
Assert-SealedEvidenceLeaves @($lifecycle.evidence_paths) $lifecyclePath
$lifecycleUnit = @($manifest.units | Where-Object id -eq "UNIT-027")
if ($lifecycleUnit.Count -ne 1 -or $lifecycleUnit[0].status -ne "VERIFIED") {
  throw "Lifecycle decision is not VERIFIED."
}
foreach ($activatedId in $activatedLifecycleIds) {
  $activatedUnit = @($manifest.units | Where-Object id -eq $activatedId)
  if ($activatedUnit.Count -ne 1 -or
      $activatedUnit[0].status -ne "VERIFIED" -or
      $activatedId -notin @($closeout[0].depends_on)) {
    throw "Lifecycle-activated work is unfinished: $activatedId"
  }
}

if ($quality.status -ne "PASS" -or
    $quality.data.classification.profile -notin @("Q2_CRITICAL_CHANGE_GATE", "Q3_RELEASE_GATE") -or
    $quality.data.classification.profile -ne $candidate.data.record.profile -or
    $quality.data.candidate.sha256 -ne $candidate.data.sha256 -or
    $quality.data.candidate.commit_sha -ne $currentRevision -or
    $quality.data.merge_base -ne $expectedBaseline -or
    $gitnexus.result -ne "PASS" -or
    $gitnexus.candidate_compare.scope -ne "compare" -or
    $gitnexus.candidate_compare.base_ref -ne $expectedBaseline -or
    $gitnexus.default_compare.scope -ne "compare" -or
    $gitnexus.default_compare.base_ref -ne "main" -or
    $gitnexus.candidate_sha256 -ne $candidate.data.sha256 -or
    $gitnexus.commit_sha -ne $currentRevision -or
    $gitnexus.comparison_base -ne $expectedBaseline) {
  throw "TECH_BLOCKED lacks fixed-baseline Q2+ or graph evidence."
}

$selectedProfile = [string]$candidate.data.record.profile
$naturalClassificationPath = "$runtimeRoot/evidence/tech-blocked-classification-natural.json"
$classificationPath = "$runtimeRoot/evidence/tech-blocked-classification.json"
$finalCandidatePath = "$runtimeRoot/evidence/tech-blocked-candidate-final-recheck.json"
foreach ($path in @($naturalClassificationPath, $classificationPath, $finalCandidatePath)) {
  git check-ignore -q -- $path
  if ($LASTEXITCODE -ne 0) { throw "Final TECH_BLOCKED artifact is not Git-ignored: $path" }
}
bun scripts/quality/classify.ts --base $expectedBaseline --output $naturalClassificationPath
if ($LASTEXITCODE -ne 0) { throw "Final TECH_BLOCKED classification failed." }
$naturalClassification = Get-Content -LiteralPath $naturalClassificationPath -Raw | ConvertFrom-Json
$freshSelectedProfile = if ($naturalClassification.data.profile -eq "Q3_RELEASE_GATE") {
  "Q3_RELEASE_GATE"
} else {
  "Q2_CRITICAL_CHANGE_GATE"
}
if ($naturalClassification.status -ne "PASS" -or $freshSelectedProfile -ne $selectedProfile) {
  throw "TECH_BLOCKED profile changed after review."
}
bun scripts/quality/classify.ts --base $expectedBaseline --profile $selectedProfile --output $classificationPath
if ($LASTEXITCODE -ne 0) { throw "Final TECH_BLOCKED profile selection failed." }
bun scripts/quality/candidate.ts --base $expectedBaseline --classification $classificationPath --expected $candidate.data.sha256 --output $finalCandidatePath
if ($LASTEXITCODE -ne 0) { throw "TECH_BLOCKED candidate changed after review." }
$finalCandidate = Get-Content -LiteralPath $finalCandidatePath -Raw | ConvertFrom-Json
if ($finalCandidate.status -ne "PASS" -or
    $finalCandidate.data.sha256 -ne $candidate.data.sha256 -or
    $finalCandidate.data.record.commit_sha -ne $currentRevision -or
    $finalCandidate.data.record.comparison_base.resolved_sha -ne $expectedBaseline) {
  throw "Final TECH_BLOCKED reconstruction is not exact."
}
bun run validate:plan-pack -- $pack
if ($LASTEXITCODE -ne 0) { throw "TECH_BLOCKED plan validation failed." }
git diff --check
if ($LASTEXITCODE -ne 0) { throw "TECH_BLOCKED whitespace validation failed." }
```

Any failed assertion restages the pack as active with the responsible decision
or unit reopened. No tracked write follows this passing terminal guard.

## Integrated Stop Gate

After `UNIT-020` and every lifecycle-activated unit verify, stage the complete
durable manifest transition and reseal it before any final evidence. This is a
provisional terminal candidate, not an accepted completion claim until the
exact-candidate gate below passes. A failure reopens the responsible unit and
restores an active, nonterminal manifest; no tracked write follows a pass.

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$manifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
$expectedBaseline = "93d5124d268a1b6016f63f8a8e5e69e118630d13"
$repoRoot = (Resolve-Path (git rev-parse --show-toplevel).Trim()).Path
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

function Resolve-IntegratedEvidenceLeaf([string]$path) {
  if ($path -notmatch "^[A-Za-z0-9._/-]+$" -or
      $path -match "^/" -or
      $path -match "(^|/)\.\.?(/|$)" -or
      $path -match "(^|/)\.tmp(/|$)") {
    throw "Integrated evidence path is malformed or unsafe: $path"
  }
  git check-ignore -q -- $path
  if ($LASTEXITCODE -eq 0) { throw "Integrated evidence may not be Git-ignored: $path" }
  if ($LASTEXITCODE -ne 1) { throw "Integrated evidence ignore status is unknown: $path" }
  git ls-files --error-unmatch -- $path | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Integrated evidence must be Git-tracked: $path" }

  $currentPath = $repoRoot
  foreach ($segment in ($path -split "/")) {
    $currentPath = Join-Path $currentPath $segment
    if (-not (Test-Path -LiteralPath $currentPath)) {
      throw "Integrated evidence path disappeared: $path"
    }
    $item = Get-Item -LiteralPath $currentPath -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw "Integrated evidence may not traverse a reparse point: $path"
    }
  }

  $resolved = (Resolve-Path -LiteralPath $currentPath).Path
  if (-not $resolved.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase) -or
      -not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
    throw "Integrated evidence escaped the repository or is not a file: $path"
  }
  return $resolved
}

if ([string]$manifest.baseline.head -ne $expectedBaseline) {
  throw "Integrated candidate moved the immutable package baseline."
}
$unfinished = @($manifest.units | Where-Object {
  $_.status -notin @("VERIFIED", "SUPERSEDED")
})
if ($unfinished.Count -ne 0 -or
    @($manifest.units | Where-Object { $_.id -eq "UNIT-020" -and $_.status -eq "VERIFIED" }).Count -ne 1 -or
    @($manifest.units | Where-Object { $_.id -eq "UNIT-028" -and $_.status -eq "VERIFIED" }).Count -ne 1 -or
    @($manifest.gates | Where-Object { $_.id -eq "GATE-020" -and $_.status -eq "PASS" }).Count -ne 1) {
  throw "Integrated terminal state has unfinished or unclosed work."
}
$decisionPaths = @(
  "$pack/evidence/unit-024-codex-security-supplement-disposition.json",
  "$pack/evidence/unit-024-scanner-viability-decision.json",
  "$pack/evidence/unit-013-session-compatibility-decision.json",
  "$pack/evidence/unit-027-lifecycle.json",
  "$pack/evidence/unit-020-codex-security-supplement-closeout.json"
)
$decisionEffects = @($decisionPaths | ForEach-Object {
  (Get-Content -LiteralPath $_ -Raw | ConvertFrom-Json).terminal_effect
})
if ("TECH_BLOCKED" -in $decisionEffects) {
  throw "A technical-decision branch cannot enter the integrated completion gate."
}
$currentRevision = (git rev-parse HEAD).Trim()
$securityAdmissionPath = "$pack/evidence/unit-024-codex-security-supplement-disposition.json"
$securityCloseoutPath = "$pack/evidence/unit-020-codex-security-supplement-closeout.json"
$securitySupplementPack = ".ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack"
$securitySupplementManifestPath = "$securitySupplementPack/plan-pack.json"
foreach ($path in @($securityAdmissionPath, $securityCloseoutPath, $securitySupplementManifestPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Codex Security absorption artifact is missing: $path"
  }
}
$securityAdmissionSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $securityAdmissionPath).Hash.ToLowerInvariant()
$securityAdmission = Get-Content -LiteralPath $securityAdmissionPath -Raw | ConvertFrom-Json
$securityCloseout = Get-Content -LiteralPath $securityCloseoutPath -Raw | ConvertFrom-Json
$securitySupplement = Get-Content -LiteralPath $securitySupplementManifestPath -Raw | ConvertFrom-Json
$securityCloseoutKeys = @($securityCloseout.PSObject.Properties.Name | Sort-Object)
$expectedSecurityCloseoutKeys = @(
  "admission_receipt_sha256", "candidate_revision", "evidence_paths",
  "mapping_results", "result", "schema_version", "source_package_id",
  "supplement_manifest_sha256", "target_package_id", "terminal_effect",
  "verified_source_unit_ids"
)
$expectedSupplementUnitIds = @(1..8 | ForEach-Object { "UNIT-{0:D3}" -f $_ })
$securityHasActiveAuthorization = @(
  $securitySupplement.authorization_boundaries | Where-Object status -eq "ACTIVE"
).Count -gt 0
$securityHasBoundaryRecord = @(
  $securitySupplement.criteria + $securitySupplement.gates |
    Where-Object status -eq "BOUNDARY"
).Count -gt 0
$expectedSecurityRelease = if ($securityHasActiveAuthorization -or $securityHasBoundaryRecord) {
  "BOUNDARY"
} else {
  "READY"
}
if ((Compare-Object $expectedSecurityCloseoutKeys $securityCloseoutKeys).Count -ne 0 -or
    $securityCloseout.schema_version -ne 1 -or
    $securityCloseout.candidate_revision -ne $currentRevision -or
    $securityCloseout.source_package_id -ne "PLAN-2026-08-01-codex-security-delta-remediation" -or
    $securityCloseout.target_package_id -ne "PLAN-2026-07-31-code-improvement" -or
    $securityCloseout.result -ne "ABSORPTION_VERIFIED" -or
    $securityCloseout.terminal_effect -ne "NONE" -or
    $securityCloseout.admission_receipt_sha256 -ne $securityAdmissionSha -or
    $securityCloseout.supplement_manifest_sha256 -ne $securitySupplement.manifest_sha256 -or
    (Compare-Object $expectedSupplementUnitIds @($securityCloseout.verified_source_unit_ids | Sort-Object -Unique)).Count -ne 0 -or
    $securitySupplement.package_status -ne "IMPLEMENTATION_READY" -or
    $securitySupplement.implementation_status -ne "COMPLETE" -or
    $securitySupplement.release_status -ne $expectedSecurityRelease -or
    $securitySupplement.plan_lifecycle -ne "ARCHIVE_READY" -or
    $securitySupplement.terminal_status -ne "ACHIEVED" -or
    $null -ne $securitySupplement.next_unit -or
    @($securitySupplement.ready_slices).Count -ne 0 -or
    @($securitySupplement.units | Where-Object status -ne "VERIFIED").Count -ne 0 -or
    @($securitySupplement.criteria + $securitySupplement.gates | Where-Object status -notin @("PASS", "BOUNDARY", "N/A")).Count -ne 0 -or
    @($securitySupplement.tests | Where-Object status -ne "PASS").Count -ne 0 -or
    @($securitySupplement.risks | Where-Object status -in @("OPEN", "REALIZED")).Count -ne 0) {
  throw "Codex Security supplement absorption did not reach its exact terminal contract."
}
$admissionMappings = @(
  @($securityAdmission.finding_mappings) + @($securityAdmission.pr_mappings)
)
$mappingResults = @($securityCloseout.mapping_results)
$admissionSourceIds = @($admissionMappings.source_id | Sort-Object -Unique)
$resultSourceIds = @($mappingResults.source_id | Sort-Object -Unique)
if ($admissionMappings.Count -ne 221 -or
    $mappingResults.Count -ne 221 -or
    $admissionSourceIds.Count -ne 221 -or
    $resultSourceIds.Count -ne 221 -or
    (Compare-Object $admissionSourceIds $resultSourceIds).Count -ne 0) {
  throw "Codex Security closeout does not cover exactly the 221 admitted mappings."
}
$allSecurityEvidenceLeaves = @($securityCloseout.evidence_paths)
foreach ($admitted in $admissionMappings) {
  $mappingResult = @($mappingResults | Where-Object source_id -eq $admitted.source_id)
  if ($mappingResult.Count -ne 1) {
    throw "Codex Security mapping has no unique closeout result: $($admitted.source_id)"
  }
  $mappingResult = $mappingResult[0]
  $mappingResultKeys = @($mappingResult.PSObject.Properties.Name | Sort-Object)
  $expectedMappingResultKeys = @(
    "authorization_boundary_id", "decision_evidence_path", "decision_kind",
    "evidence_paths", "outcome", "owner_status", "owner_unit_id",
    "source_id", "terminal_disposition"
  )
  $owner = @($manifest.units | Where-Object id -eq $mappingResult.owner_unit_id)
  $mappingEvidence = @($mappingResult.evidence_paths)
  if ((Compare-Object $expectedMappingResultKeys $mappingResultKeys).Count -ne 0 -or
      $mappingResult.owner_unit_id -ne $admitted.owner_unit_id -or
      $mappingResult.outcome -ne $admitted.outcome -or
      $owner.Count -ne 1 -or
      $mappingResult.owner_status -ne $owner[0].status -or
      $mappingEvidence.Count -lt 1 -or
      [string]$mappingResult.decision_evidence_path -notmatch "^[A-Za-z0-9._/-]+$" -or
      @($mappingEvidence | Where-Object path -eq $mappingResult.decision_evidence_path).Count -ne 1) {
    throw "Codex Security mapping closeout is malformed or detached: $($admitted.source_id)"
  }
  $decisionEvidenceResolved = Resolve-IntegratedEvidenceLeaf ([string]$mappingResult.decision_evidence_path)

  switch ([string]$admitted.outcome) {
    "IMPLEMENT_IN_TARGET" {
      if ($owner[0].status -ne "VERIFIED" -or
          $mappingResult.decision_kind -ne "IMPLEMENTATION_EVIDENCE" -or
          $mappingResult.terminal_disposition -ne "IMPLEMENTED_AND_VERIFIED" -or
          $null -ne $mappingResult.authorization_boundary_id) {
        throw "Implemented Codex Security mapping lacks a verified owner: $($admitted.source_id)"
      }
    }
    "ACTIVE_TARGET_UNIT" {
      if ($owner[0].status -ne "VERIFIED" -or
          $mappingResult.decision_kind -ne "ACTIVE_TARGET_EVIDENCE" -or
          $mappingResult.terminal_disposition -ne "ACTIVE_TARGET_VERIFIED" -or
          $null -ne $mappingResult.authorization_boundary_id) {
        throw "Active-target Codex Security mapping lacks a verified owner: $($admitted.source_id)"
      }
    }
    "NO_CURRENT_DELTA" {
      if ($owner[0].status -ne "VERIFIED" -or
          $mappingResult.decision_kind -ne "NO_CHANGE_DECISION" -or
          $mappingResult.terminal_disposition -ne "NO_CURRENT_DELTA_VERIFIED" -or
          $null -ne $mappingResult.authorization_boundary_id) {
        throw "No-delta Codex Security mapping lacks explicit terminal proof: $($admitted.source_id)"
      }
      $decisionEvidence = Get-Content -LiteralPath $decisionEvidenceResolved -Raw | ConvertFrom-Json
      if ($decisionEvidence.candidate_revision -ne $currentRevision -or
          $decisionEvidence.owner_unit_id -ne $admitted.owner_unit_id -or
          $decisionEvidence.decision -ne $mappingResult.terminal_disposition -or
          $admitted.source_id -notin @($decisionEvidence.source_ids)) {
        throw "No-delta decision evidence is not mapping-specific: $($admitted.source_id)"
      }
    }
    "HOSTED_BOUNDARY" {
      $boundary = @(
        $securitySupplement.authorization_boundaries |
          Where-Object id -eq $mappingResult.authorization_boundary_id
      )
      $expectedBoundaryDisposition = if ($boundary.Count -eq 1) {
        switch ([string]$boundary[0].status) {
          "ACTIVE" { "HOSTED_BOUNDARY_ACTIVE" }
          "RESOLVED" { "HOSTED_BOUNDARY_RESOLVED" }
          "SUPERSEDED" { "HOSTED_BOUNDARY_SUPERSEDED" }
          default { $null }
        }
      } else {
        $null
      }
      if ($owner[0].status -notin @("VERIFIED", "SUPERSEDED") -or
          $mappingResult.decision_kind -ne "HOSTED_BOUNDARY_DECISION" -or
          $boundary.Count -ne 1 -or
          $null -eq $expectedBoundaryDisposition -or
          $mappingResult.terminal_disposition -ne $expectedBoundaryDisposition) {
        throw "Hosted Codex Security mapping lacks exact authorization proof: $($admitted.source_id)"
      }
      $decisionEvidence = Get-Content -LiteralPath $decisionEvidenceResolved -Raw | ConvertFrom-Json
      if ($decisionEvidence.candidate_revision -ne $currentRevision -or
          $decisionEvidence.owner_unit_id -ne $admitted.owner_unit_id -or
          $decisionEvidence.authorization_boundary_id -ne $boundary[0].id -or
          $decisionEvidence.decision -ne $mappingResult.terminal_disposition -or
          $admitted.source_id -notin @($decisionEvidence.source_ids)) {
        throw "Hosted-boundary decision evidence is not mapping-specific: $($admitted.source_id)"
      }
    }
    default {
      throw "Unsupported Codex Security admission outcome: $($admitted.outcome)"
    }
  }
  $allSecurityEvidenceLeaves += $mappingEvidence
}
foreach ($leaf in $allSecurityEvidenceLeaves) {
  $leafKeys = @($leaf.PSObject.Properties.Name | Sort-Object)
  if ((Compare-Object @("path", "sha256", "source_revision") $leafKeys).Count -ne 0 -or
      [string]$leaf.path -notmatch "^[A-Za-z0-9._/-]+$" -or
      [string]$leaf.path -match "^/" -or
      [string]$leaf.path -match "(^|/)\.\.?(/|$)" -or
      [string]$leaf.path -match "(^|/)\.tmp(/|$)" -or
      [string]$leaf.sha256 -notmatch "^[a-f0-9]{64}$" -or
      [string]$leaf.source_revision -ne $currentRevision) {
    throw "Codex Security closeout evidence is malformed or stale: $($leaf.path)"
  }
  $resolvedLeaf = Resolve-IntegratedEvidenceLeaf ([string]$leaf.path)
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedLeaf).Hash.ToLowerInvariant() -ne $leaf.sha256) {
    throw "Codex Security closeout evidence hash is stale: $($leaf.path)"
  }
}
node scripts/validate-plan-pack.mjs $securitySupplementPack
if ($LASTEXITCODE -ne 0) { throw "Absorbed Codex Security supplement is invalid." }
$hasActiveAuthorization = @($manifest.authorization_boundaries | Where-Object status -eq "ACTIVE").Count -gt 0
$hasBoundaryRecord = @($manifest.criteria + $manifest.gates | Where-Object status -eq "BOUNDARY").Count -gt 0
$expectedTerminal = if ("AUTH_BLOCKED" -in $decisionEffects) {
  "AUTH_BLOCKED"
} else {
  "ACHIEVED"
}
$expectedRelease = if ($hasActiveAuthorization -or $hasBoundaryRecord) { "BOUNDARY" } else { "READY" }
$expectedLifecycle = if ($expectedTerminal -eq "AUTH_BLOCKED") { "N/A" } else { "ARCHIVE_READY" }
if ($manifest.package_status -ne "IMPLEMENTATION_READY" -or
    $manifest.implementation_status -ne "COMPLETE" -or
    $manifest.last_observed_run_scope -ne "IMPLEMENT_LOCAL" -or
    $manifest.release_status -ne $expectedRelease -or
    $manifest.plan_lifecycle -ne $expectedLifecycle -or
    $manifest.terminal_status -ne $expectedTerminal -or
    $null -ne $manifest.next_unit -or
    @($manifest.ready_slices).Count -ne 0) {
  throw "Final manifest tuple is not the decision-derived terminal state."
}
bun run validate:plan-pack -- $pack
if ($LASTEXITCODE -ne 0) { throw "Provisional terminal manifest is invalid." }
```

Run the shared candidate-freeze block with `<UNIT_ID>=INTEGRATED`. Immediately
after it passes, rerun every Codex Security mapping leaf against that exact
candidate. This guard rejects escaped, ignored, untracked, reparse-backed,
missing, stale, or candidate-absent evidence and also binds the admission,
closeout, and supplement manifests themselves:

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$runtimeRoot = ".tmp/code-improvement"
$expectedBaseline = "93d5124d268a1b6016f63f8a8e5e69e118630d13"
$candidate = Get-Content -LiteralPath "$runtimeRoot/evidence/integrated-candidate.json" -Raw | ConvertFrom-Json
$currentRevision = (git rev-parse HEAD).Trim().ToLowerInvariant()
$repoRoot = (Resolve-Path (git rev-parse --show-toplevel).Trim()).Path
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$securityAdmissionPath = "$pack/evidence/unit-024-codex-security-supplement-disposition.json"
$securityCloseoutPath = "$pack/evidence/unit-020-codex-security-supplement-closeout.json"
$securitySupplementManifestPath = ".ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack/plan-pack.json"
$securityCloseout = Get-Content -LiteralPath $securityCloseoutPath -Raw | ConvertFrom-Json

if ($candidate.status -ne "PASS" -or
    $candidate.data.record.commit_sha -ne $currentRevision -or
    $candidate.data.record.comparison_base.resolved_sha -ne $expectedBaseline) {
  throw "Integrated candidate is not the exact frozen baseline comparison."
}

function Assert-IntegratedCandidateFile(
  [string]$path,
  [string]$expectedSha256,
  [string]$sourceRevision
) {
  if ($path -notmatch "^[A-Za-z0-9._/-]+$" -or
      $path -match "^/" -or
      $path -match "(^|/)\.\.?(/|$)" -or
      $path -match "(^|/)\.tmp(/|$)" -or
      $expectedSha256 -notmatch "^[a-f0-9]{64}$" -or
      $sourceRevision -ne $currentRevision) {
    throw "Integrated candidate evidence path or binding is malformed: $path"
  }
  git check-ignore -q -- $path
  if ($LASTEXITCODE -eq 0) { throw "Integrated candidate evidence may not be Git-ignored: $path" }
  if ($LASTEXITCODE -ne 1) { throw "Integrated candidate evidence ignore status is unknown: $path" }
  git ls-files --error-unmatch -- $path | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Integrated candidate evidence must be Git-tracked: $path" }

  $currentPath = $repoRoot
  foreach ($segment in ($path -split "/")) {
    $currentPath = Join-Path $currentPath $segment
    if (-not (Test-Path -LiteralPath $currentPath)) {
      throw "Integrated candidate evidence disappeared: $path"
    }
    $item = Get-Item -LiteralPath $currentPath -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw "Integrated candidate evidence may not traverse a reparse point: $path"
    }
  }

  $resolved = (Resolve-Path -LiteralPath $currentPath).Path
  if (-not $resolved.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase) -or
      -not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
    throw "Integrated candidate evidence escaped the repository or is not a file: $path"
  }
  $currentSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolved).Hash.ToLowerInvariant()
  $candidateEntry = @($candidate.data.record.changed_files | Where-Object {
    $_.path -eq $path -and $_.deleted -eq $false
  })
  if ($candidateEntry.Count -ne 1 -or
      $candidateEntry[0].sha256 -ne $currentSha256 -or
      $currentSha256 -ne $expectedSha256) {
    throw "Integrated evidence is absent from or stale against the frozen candidate: $path"
  }
}

$mappingResults = @($securityCloseout.mapping_results)
if ($mappingResults.Count -ne 221) {
  throw "Integrated candidate must rebind all 221 Codex Security mapping results."
}
foreach ($mappingResult in $mappingResults) {
  $mappingEvidence = @($mappingResult.evidence_paths)
  if ($mappingEvidence.Count -lt 1 -or
      @($mappingEvidence | Where-Object path -eq $mappingResult.decision_evidence_path).Count -ne 1) {
    throw "Integrated mapping decision evidence is detached: $($mappingResult.source_id)"
  }
  foreach ($leaf in $mappingEvidence) {
    Assert-IntegratedCandidateFile ([string]$leaf.path) ([string]$leaf.sha256) ([string]$leaf.source_revision)
  }
}
foreach ($leaf in @($securityCloseout.evidence_paths)) {
  Assert-IntegratedCandidateFile ([string]$leaf.path) ([string]$leaf.sha256) ([string]$leaf.source_revision)
}
foreach ($path in @($securityAdmissionPath, $securityCloseoutPath, $securitySupplementManifestPath)) {
  $sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
  Assert-IntegratedCandidateFile $path $sha256 $currentRevision
}
```

Only after this candidate-binding guard passes may the complete browser matrix
run and bind its receipt to the same candidate:

```powershell
$runtimeRoot = ".tmp/code-improvement"
$candidate = Get-Content -LiteralPath "$runtimeRoot/evidence/integrated-candidate.json" -Raw | ConvertFrom-Json
$integratedBrowserPath = "$runtimeRoot/evidence/integrated-browser-matrix.json"
$integratedBrowserBinding = "$integratedBrowserPath.binding.json"
foreach ($path in @($integratedBrowserPath, $integratedBrowserBinding)) {
  git check-ignore -q -- $path
  if ($LASTEXITCODE -ne 0) { throw "Integrated browser receipt is not Git-ignored: $path" }
}
$previousBrowserMatrix = $env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX
$env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX = "1"
try {
  bun scripts/quality/run-evidence-command.ts --artifact $integratedBrowserPath --evidence-id integrated-browser-matrix -- bunx playwright test e2e/code-improvement --project=chromium --project=firefox --project=webkit --project=mobile-safari --project=iphone-se --project=ipad --project=pixel-8-chrome
  if ($LASTEXITCODE -ne 0) { throw "Integrated browser matrix failed." }
  [pscustomobject]@{
    kind = "candidate-bound-browser-evidence"
    result = "PASS"
    candidate_sha256 = $candidate.data.sha256
    commit_sha = $candidate.data.record.commit_sha
    comparison_base = $candidate.data.record.comparison_base.resolved_sha
    artifact = $integratedBrowserPath
    artifact_sha256 = (Get-FileHash -Algorithm SHA256 $integratedBrowserPath).Hash.ToLowerInvariant()
  } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $integratedBrowserBinding -Encoding utf8
} finally {
  if ($null -eq $previousBrowserMatrix) {
    Remove-Item Env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX -ErrorAction SilentlyContinue
  } else {
    $env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX = $previousBrowserMatrix
  }
}
```

Create the accumulated author receipt, verifier quality/security reviews, any
derived Q3 release review, and three supplemental read-only reviews:
`integrated-review-architecture.json`, `integrated-review-correctness.json`, and
`integrated-review-code.json`. Supplemental receipts use exactly
`review_role`, `reviewer_id`, `decision`, `candidate_sha256`, `commit_sha`,
`reviewed_at`, `read_only`, and `source`; role values are respectively
`architecture`, `correctness`, and `code`, and `source` is `local-agent`.
Before the shared exact-candidate verification block, run:

```powershell
$runtimeRoot = ".tmp/code-improvement"
$candidate = Get-Content -LiteralPath "$runtimeRoot/evidence/integrated-candidate.json" -Raw | ConvertFrom-Json
$authors = Get-Content -LiteralPath "$runtimeRoot/evidence/integrated-candidate-authors.json" -Raw | ConvertFrom-Json
$verifierReviewPaths = @(
  "$runtimeRoot/evidence/integrated-review-quality.json"
  "$runtimeRoot/evidence/integrated-review-security.json"
)
if ($candidate.data.record.profile -eq "Q3_RELEASE_GATE") {
  $verifierReviewPaths += "$runtimeRoot/evidence/integrated-review-release.json"
}
$verifierReviews = @($verifierReviewPaths | ForEach-Object {
  Get-Content -LiteralPath $_ -Raw | ConvertFrom-Json
})
$supplementalSpecs = @(
  [pscustomobject]@{ role = "architecture"; path = "$runtimeRoot/evidence/integrated-review-architecture.json" },
  [pscustomobject]@{ role = "correctness"; path = "$runtimeRoot/evidence/integrated-review-correctness.json" },
  [pscustomobject]@{ role = "code"; path = "$runtimeRoot/evidence/integrated-review-code.json" }
)
$supplementalReviewerIds = @()
foreach ($spec in $supplementalSpecs) {
  $review = Get-Content -LiteralPath $spec.path -Raw | ConvertFrom-Json
  $reviewKeys = @($review.PSObject.Properties.Name | Sort-Object)
  $parsedReviewTime = [DateTimeOffset]::MinValue
  if ((Compare-Object @(
        "candidate_sha256", "commit_sha", "decision", "read_only",
        "review_role", "reviewed_at", "reviewer_id", "source"
      ) $reviewKeys).Count -ne 0 -or
      $review.review_role -ne $spec.role -or
      $review.decision -ne "APPROVE" -or
      $review.read_only -ne $true -or
      $review.source -ne "local-agent" -or
      -not [DateTimeOffset]::TryParse([string]$review.reviewed_at, [ref]$parsedReviewTime) -or
      $review.reviewer_id -notmatch "^[A-Za-z0-9_-]+$" -or
      $review.candidate_sha256 -ne $candidate.data.sha256 -or
      $review.commit_sha -ne $candidate.data.record.commit_sha -or
      $review.reviewer_id -in @($authors.author_ids) -or
      $review.reviewer_id -in @($verifierReviews.reviewer_id) -or
      $review.reviewer_id -in $supplementalReviewerIds) {
    throw "Supplemental review is not an independent exact-candidate approval: $($spec.role)"
  }
  $supplementalReviewerIds += $review.reviewer_id
}
```

Run the shared exact-candidate block with:

- `UNIT_ID=INTEGRATED`
- `FOCUSED_RECEIPT_BINDING=N/A`
- `BROWSER_RECEIPT_BINDING=evidence/integrated-browser-matrix.json.binding.json`
- the `INTEGRATED` review/author table row
- `QUALITY_RECEIPT=evidence/integrated-q2.json`

After it passes, run GitNexus twice:
`detect_changes({scope:"compare",base_ref:"93d5124d268a1b6016f63f8a8e5e69e118630d13",repo:"archestimator"})`
for the complete fixed-baseline candidate and
`detect_changes({scope:"compare",base_ref:"main",repo:"archestimator"})` for
the repository regression policy. Store both complete tool results, their exact
scope/base values, `result=PASS`, the frozen `candidate_sha256`, `commit_sha`,
and `comparison_base` at the ignored
`.tmp/code-improvement/evidence/gitnexus-detect-changes.json`; `PASS` requires
both comparisons to show only expected flows and no unreviewed High/Critical
impact. Then run:

```powershell
$pack = ".ai/03_plans/2026-07-31/Code-Improvement"
$runtimeRoot = ".tmp/code-improvement"
$expectedBaseline = "93d5124d268a1b6016f63f8a8e5e69e118630d13"
$manifest = Get-Content -LiteralPath "$pack/plan-pack.json" -Raw | ConvertFrom-Json
$candidate = Get-Content -LiteralPath "$runtimeRoot/evidence/integrated-candidate.json" -Raw | ConvertFrom-Json
$candidateSha256 = [string]$candidate.data.sha256
$candidateCommitSha = [string]$candidate.data.record.commit_sha
$selectedProfile = [string]$candidate.data.record.profile
$naturalClassificationPath = "$runtimeRoot/evidence/integrated-classification-natural.json"
$classificationPath = "$runtimeRoot/evidence/integrated-classification.json"
$finalCandidateRecheckPath = "$runtimeRoot/evidence/integrated-candidate-final-recheck.json"
foreach ($path in @($naturalClassificationPath, $classificationPath, $finalCandidateRecheckPath)) {
  git check-ignore -q -- $path
  if ($LASTEXITCODE -ne 0) { throw "Final candidate artifact is not Git-ignored: $path" }
}
bun scripts/quality/classify.ts --base $expectedBaseline --output $naturalClassificationPath
if ($LASTEXITCODE -ne 0) { throw "Final natural classification failed." }
$naturalClassification = Get-Content -LiteralPath $naturalClassificationPath -Raw | ConvertFrom-Json
$freshSelectedProfile = if ($naturalClassification.data.profile -eq "Q3_RELEASE_GATE") {
  "Q3_RELEASE_GATE"
} else {
  "Q2_CRITICAL_CHANGE_GATE"
}
if ($naturalClassification.status -ne "PASS" -or $freshSelectedProfile -ne $selectedProfile) {
  throw "Terminal candidate profile changed after integrated verification."
}
bun scripts/quality/classify.ts --base $expectedBaseline --profile $selectedProfile --output $classificationPath
if ($LASTEXITCODE -ne 0) { throw "Final selected-profile classification failed." }
bun scripts/quality/candidate.ts --base $expectedBaseline --classification $classificationPath --expected $candidateSha256 --output $finalCandidateRecheckPath
if ($LASTEXITCODE -ne 0) { throw "Terminal candidate changed after integrated verification." }
$finalCandidate = Get-Content -LiteralPath $finalCandidateRecheckPath -Raw | ConvertFrom-Json
$currentCommitSha = (git rev-parse HEAD).Trim().ToLowerInvariant()
if ($finalCandidate.status -ne "PASS" -or
    $finalCandidate.data.sha256 -ne $candidateSha256 -or
    $finalCandidate.data.record.commit_sha -ne $candidateCommitSha -or
    $finalCandidate.data.record.commit_sha -ne $currentCommitSha -or
    $finalCandidate.data.record.comparison_base.resolved_sha -ne $expectedBaseline) {
  throw "Final candidate reconstruction does not bind the exact terminal bytes."
}
$quality = Get-Content -LiteralPath "$runtimeRoot/evidence/integrated-q2.json" -Raw | ConvertFrom-Json
$gitnexus = Get-Content -LiteralPath "$runtimeRoot/evidence/gitnexus-detect-changes.json" -Raw | ConvertFrom-Json
$qualityAuthorIds = @($quality.data.reviews.author_ids)
$qualityVerifierIds = @($quality.data.reviews.decisions | ForEach-Object reviewer_id)
$qualityReviewTypes = @($quality.data.reviews.decisions | ForEach-Object review_type | Sort-Object -Unique)
$expectedQualityReviewTypes = @("quality", "security")
if ($selectedProfile -eq "Q3_RELEASE_GATE") { $expectedQualityReviewTypes += "release" }
$seedAuthorIds = @((Get-Content -LiteralPath "$pack/evidence/initial-plan-authors.json" -Raw | ConvertFrom-Json).author_ids)
if ($quality.data.reviews.candidate_sha256 -ne $candidateSha256 -or
    $qualityAuthorIds.Count -eq 0 -or
    $qualityAuthorIds.Count -ne @($qualityAuthorIds | Sort-Object -Unique).Count -or
    @($seedAuthorIds | Where-Object { $_ -notin $qualityAuthorIds }).Count -ne 0 -or
    $qualityVerifierIds.Count -ne @($qualityVerifierIds | Sort-Object -Unique).Count -or
    (Compare-Object @($expectedQualityReviewTypes | Sort-Object) $qualityReviewTypes).Count -ne 0) {
  throw "Final quality review roster is incomplete or stale."
}
$finalSupplementalSpecs = @(
  [pscustomobject]@{ role = "architecture"; path = "$runtimeRoot/evidence/integrated-review-architecture.json" },
  [pscustomobject]@{ role = "correctness"; path = "$runtimeRoot/evidence/integrated-review-correctness.json" },
  [pscustomobject]@{ role = "code"; path = "$runtimeRoot/evidence/integrated-review-code.json" }
)
$finalSupplementalReviewerIds = @()
foreach ($spec in $finalSupplementalSpecs) {
  $review = Get-Content -LiteralPath $spec.path -Raw | ConvertFrom-Json
  $reviewKeys = @($review.PSObject.Properties.Name | Sort-Object)
  $parsedReviewTime = [DateTimeOffset]::MinValue
  if ((Compare-Object @(
        "candidate_sha256", "commit_sha", "decision", "read_only",
        "review_role", "reviewed_at", "reviewer_id", "source"
      ) $reviewKeys).Count -ne 0 -or
      $review.review_role -ne $spec.role -or
      $review.decision -ne "APPROVE" -or
      $review.read_only -ne $true -or
      $review.source -ne "local-agent" -or
      -not [DateTimeOffset]::TryParse([string]$review.reviewed_at, [ref]$parsedReviewTime) -or
      $review.reviewer_id -notmatch "^[A-Za-z0-9_-]+$" -or
      $review.candidate_sha256 -ne $candidateSha256 -or
      $review.commit_sha -ne $candidateCommitSha -or
      $review.reviewer_id -in $qualityAuthorIds -or
      $review.reviewer_id -in $qualityVerifierIds -or
      $review.reviewer_id -in $finalSupplementalReviewerIds) {
    throw "Final supplemental review is stale, dependent, or malformed: $($spec.role)"
  }
  $finalSupplementalReviewerIds += $review.reviewer_id
}
if ($manifest.baseline.head -ne $expectedBaseline -or
    $manifest.terminal_status -notin @("ACHIEVED", "AUTH_BLOCKED") -or
    $manifest.implementation_status -ne "COMPLETE" -or
    $null -ne $manifest.next_unit -or
    @($manifest.ready_slices).Count -ne 0 -or
    $quality.status -ne "PASS" -or
    $quality.data.classification.profile -ne $selectedProfile -or
    $quality.data.candidate.sha256 -ne $candidate.data.sha256 -or
    $quality.data.candidate.commit_sha -ne $candidate.data.record.commit_sha -or
    $quality.data.merge_base -ne $expectedBaseline -or
    $gitnexus.result -ne "PASS" -or
    $gitnexus.candidate_compare.scope -ne "compare" -or
    $gitnexus.candidate_compare.base_ref -ne "93d5124d268a1b6016f63f8a8e5e69e118630d13" -or
    $gitnexus.default_compare.scope -ne "compare" -or
    $gitnexus.default_compare.base_ref -ne "main" -or
    $gitnexus.candidate_sha256 -ne $candidate.data.sha256 -or
    $gitnexus.commit_sha -ne $candidate.data.record.commit_sha -or
    $gitnexus.comparison_base -ne $candidate.data.record.comparison_base.resolved_sha) {
  throw "Integrated completion evidence does not bind the terminal candidate."
}
bun run validate:plan-pack -- $pack
if ($LASTEXITCODE -ne 0) { throw "Integrated plan validation failed." }
git diff --check
if ($LASTEXITCODE -ne 0) { throw "Integrated whitespace validation failed." }
```

Completion requires that exact terminal candidate, independent security,
quality, correctness, architecture, and code-review approvals, and no later
tracked write.
