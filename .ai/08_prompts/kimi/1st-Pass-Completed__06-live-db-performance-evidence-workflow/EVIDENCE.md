# Evidence: Live DB Performance Evidence Workflow

## Commands

### Help / dry-run behavior

```bash
bun run scripts/collect-live-db-performance-evidence.ts --help
```

Exit code: `0`

Output shows usage, modes, environment variables, and guardrails.

### Repo-static evidence (safe default)

```bash
bun run scripts/collect-live-db-performance-evidence.ts --mode=static --output-dir .ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence
```

Exit code: `0`

Output:

```
Collecting DB performance evidence in static mode...
Output directory: .ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence
Wrote query inventory markdown: .ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence/query-inventory.md
{
  "outputFile": ".ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence/query-index-audit.md",
  "queryReferenceCount": 313,
  "indexReferenceCount": 118
}
Wrote evidence report: .ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence/evidence-report.md

⚠️  GUARDRAIL: Static-only evidence. Do not create index migrations or RPC rewrites from this artifact.
```

### Linked mode without `--run-sql` (documents prerequisites)

```bash
bun run scripts/collect-live-db-performance-evidence.ts --mode=linked --output-dir /tmp/evidence-linked
```

Exit code: `2`

Expected blocker: `--run-sql not set; generated live-evidence.sql for manual execution.`

### Local mode without `DATABASE_URL` (documents prerequisites)

```bash
bun run scripts/collect-live-db-performance-evidence.ts --mode=local --output-dir /tmp/evidence-local
```

Exit code: `2`

Expected blocker: `DATABASE_URL environment variable is required for --mode local.`

### Type check

```bash
bun run type-check
```

Exit code: `0`

### Diff whitespace check

```bash
git diff --check
```

Exit code: `0`

## Proof boundary

`repo-static`

The script itself was verified locally (`--help`, `--mode=static`). The generated evidence report is `repo-static` because no live database was exercised in this pass. The script supports `linked-provider` and `local-only` boundaries when run with `--run-sql` and valid credentials, but those paths were not executed due to the provider-apply OFF constraint.

## Generated artifacts

- `scripts/collect-live-db-performance-evidence.ts` — orchestrator script.
- `.ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/RUNBOOK_DBIDX_002_003.md` — operational runbook.
- `.ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence/query-inventory.md` — sample repo-static query inventory.
- `.ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence/query-index-audit.md` — sample repo-static index audit.
- `.ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence/evidence-report.md` — sample evidence report.
