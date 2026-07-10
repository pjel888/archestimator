# Candidate Provenance And Upload Artifact Graph

This supporting contract expands `REQ-002`, `REQ-011`, `DEC-AUTO-003`,
`RISK-003`, and `UNIT-002/010`. It does not perform a build, upload, or deploy.

## Candidate Identity

One candidate record binds release ID, commit SHA, workflow/run IDs, artifact ID,
producer schema version, collection/expiry times, Bun/Node/lock versions,
migration head, and a canonical sorted path/digest manifest for every upload
input. Environment and non-secret binding/config identity are explicit. Secret
names and provider version identifiers may be recorded; secret values and
reversible value hashes may not.

## Upload Input Graph

```text
verified commit + bun.lock + tool versions
  -> Next/OpenNext build workspace
  -> worker.ts and every transitively imported Worker module/asset
  -> .open-next output
  -> wrangler.jsonc + open-next.config.ts
  -> effective non-secret configuration/binding identities
  -> canonical path/digest manifest
  -> OpenNext version upload from the same workspace
  -> returned Worker version ID
  -> authorized deployment of only that version ID
```

`.open-next` alone is insufficient because Worker entry/module/config/binding
inputs can change outside it. Direct `wrangler versions upload` is not treated as
equivalent to the installed OpenNext upload path when adapter cache population or
deployment mapping would be skipped. `bun run cf:deploy` is forbidden in this
flow because it rebuilds.

## Admission And Rejection Rules

Reject missing or cancelled prerequisite checks, skipped/neutral required jobs,
mutable refs, source/workspace SHA mismatch, omitted paths, changed bytes,
rebuilds, stale/expired artifacts, migration/config/binding drift, wrong producer
version, mixed release/environment IDs, direct adapter bypass, or a deployment
request that names a different Worker version from the returned upload result.

## Verification Contract

`TEST-002` uses canonical metadata fixtures for pass plus each rejection case,
including transitive module, config, binding, asset, and tool-version mutation.
The installed OpenNext upload path is inspected in a contract test. A successful
`cf:build` proves only repository build compatibility; it is not a candidate
upload, hosted deployment, or release receipt.

## Resume

At interruption preserve the exact workspace identity, candidate manifest
digest, artifact expiry, last verified input, and first failed digest. Any input
or workspace drift invalidates the candidate; rebuild and re-verify from
`UNIT-002` rather than patching metadata or uploading a mixed workspace.
