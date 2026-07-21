# Package Validation Report

## Package

```text
PLAN-2026-07-21-new-landing-page
```

Prepared as a transport ZIP outside a local Archestimator checkout.

## Validation completed

A local package-integrity checker verified:

- every Markdown artifact listed in `plan-pack.json` exists;
- every listed artifact SHA-256 matches its file;
- `09-implementation-units.md` is the only `canonical-execution` artifact;
- every relative Markdown link resolves;
- all trace IDs are unique;
- every source-to-requirement link is reciprocal;
- every requirement-to-unit and requirement-to-criterion link is reciprocal;
- every risk-to-unit link is reciprocal;
- every criterion/unit-to-evidence link is reciprocal;
- every assumption and decision points to an existing trace record;
- the implementation-unit graph is acyclic;
- `SLICE-001` contains every transitive dependency;
- `UNIT-001` is ready, belongs to the ready slice, and is the exact `next_unit`;
- every accepted requirement has at least one current source;
- every evidence SHA-256 matches its backing artifact;
- the canonical deep-sorted `manifest_sha256` is correct;
- proposed rendered copy blocks contain none of the prohibited marketing phrases;
- the proposed main copy block count is approximately 812 words, within the 700–900 word density target;
- the metadata description is 157 characters;
- the ZIP transport checksums were generated after the final document and manifest refresh.

## Validation result

```text
LOCAL PACKAGE INTEGRITY: PASS
REFERENCE TRACEABILITY: PASS
COPY-GUARDRAIL SCAN: PASS
IMPLEMENTATION: NOT STARTED
RELEASE: NOT EVALUATED
```

## Not executed

The repository’s official command was not run because this ZIP was prepared outside a local checkout of the private repository:

```bash
bun run validate:plan-pack .ai/03_plans/2026-07-21-new-landing-page
```

Run it immediately after importing the folder into the repository. Refresh the manifest baseline fields first with the real repository HEAD and scoped status/diff hashes.

No application command was executed:

- no type check;
- no lint;
- no build;
- no unit, DOM, or end-to-end tests;
- no browser automation;
- no screenshots;
- no visual QA;
- no Storybook;
- no performance measurement.

Those commands apply to the future implementation, not this planning artifact, and the repository reserves test work for explicit owner authorization.

## Import verification

After placing the package in the repository:

1. run the repository startup contract;
2. record HEAD and working-tree state;
3. update `baseline.head`, `baseline.scoped_status_sha256`, and `baseline.scoped_diff_sha256`;
4. refresh source revisions if the repository or Notion corpus changed;
5. refresh artifact/evidence hashes and `manifest_sha256`;
6. run the official plan-pack validator;
7. begin `UNIT-001`.

Do not refresh hashes over stale proof-bearing records. Update record states and evidence first.
