# Evidence: Project Charts Proof Hygiene

## Commands

```bash
bun run generate:project-charts-payload-evidence
```

Output:

```
Wrote payload evidence to .ai/05_logs/2026-06-14-project-charts-implementation/payload-contract-evidence.json (11171 bytes, budget 50000, withinBudget=true)
```

Artifact:

```json
{
  "generatedFrom": "scripts/generate-project-charts-payload-evidence.ts",
  "fixtureRows": 5000,
  "serializedBytes": 11171,
  "budgetBytes": 50000,
  "withinBudget": true,
  "rawFactArraysPresent": false,
  "note": "buckets-only payload; raw estimate_row_items never cross the wire"
}
```

```bash
bunx vitest run tests/vitest/project-charts-payload-contract.test.ts
```

Output:

```
 RUN  v4.1.7 <repo>
 ✓ tests/vitest/project-charts-payload-contract.test.ts (5 tests) 4ms
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

```bash
bun run type-check
```

Output:

```
$ tsc --noEmit
```

```bash
git diff --check
```

No output (no whitespace errors).

## Proof boundary

`local-only` — local Vitest + Bun type-check + explicit evidence-generation command. No linked/hosted provider or browser surface was exercised.

## Behavior proven

- The unit test no longer writes `.ai/05_logs` as a side effect during Vitest.
- Payload budget assertion is preserved: serialized `ProjectChartsData` for a 5,000-row fixture is 11,171 bytes, well under the 50,000-byte budget.
- Raw fact arrays and per-row cost fields are absent from the serialized payload.
- The repository source still returns `seriesByEstimateId` built by `buildSeriesByEstimate`, and the data contract no longer carries raw `rowFacts` / `supplierFacts` arrays.
- The new taxonomy invariant test demonstrates that two estimates (simulating different workspaces/projects) are bucketed by the same global `component_category_nodes` IDs (`global-cat-concrete`, `global-cat-steel`) with their global labels, and no workspace/project identifier leaks into category bucket IDs. This is behavior-level proof that the category taxonomy is global, matching the comment in `src/lib/repositories/project-charts-repository.ts:244`.
