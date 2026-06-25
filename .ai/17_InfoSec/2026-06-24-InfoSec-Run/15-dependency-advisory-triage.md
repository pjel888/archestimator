# 15 - Dependency Advisory Triage

Generated: 2026-06-24T17:30:31Z

## Scope

This artifact covers `INFOSEC-SC-001`: the `bun audit` advisories observed during this InfoSec run.

It does not close broader supply-chain findings such as external GitHub branch protection, hosted security-feature execution/alert state, external runtime/provider proof, or secret-scanner coverage.

## Result

- Initial `bun audit`: failed with 15 advisories, 5 high / 6 moderate / 4 low.
- Final `bun audit --json`: passed with `{}`.
- Package files changed: `package.json`, `bun.lock`.
- Strategy: direct devDependency patch updates where available, plus Bun `overrides` for vulnerable transitive packages where upstream packages had not yet widened or bumped their ranges.

## Remediation Map

| Package / advisory area | Initial source | Remediation | Final evidence |
|---|---|---|---|
| `vite` advisories GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff | Nested vulnerable Vite path through `vitest@4.1.7` | Updated `vitest` to `^4.1.9`; retained direct `vite@8.0.16` | `bun pm why vite` showed only `vite@8.0.16`; focused Vitest suite passed 6 files / 121 tests |
| `esbuild` GHSA-g7r4-m6w7-qqqr | Storybook/Vite tooling | Updated Storybook packages to `10.4.6`; added override `esbuild@0.28.1` | `bun pm why esbuild` resolved `0.28.1`; Storybook static build passed |
| `@babel/core` GHSA-4x5r-pxfx-6jf8 | ESLint/React doc tooling | Added override `@babel/core@7.29.7` | `bun pm why @babel/core` resolved `7.29.7`; targeted ESLint passed |
| `js-yaml` GHSA-h67p-54hq-rp68 | ESLint config tooling | Added override `js-yaml@4.2.0` | `bun pm why js-yaml` resolved `4.2.0`; targeted ESLint passed |
| `postcss` GHSA-qx2v-qp2m-jg93 | Next/Tailwind/Vite CSS tooling | Added override `postcss@8.5.15` | `bun pm why postcss` resolved `8.5.15`; `bun run build` passed |
| `tmp` GHSA-ph9p-34f9-6g65 | `exceljs@4.4.0` transitive dependency | Added override `tmp@0.2.7` | `bun pm why tmp` resolved `0.2.7`; ExcelJS XLSX write/load smoke passed |
| `undici` advisories GHSA-vmh5-mc38-953g, GHSA-p88m-4jfj-68fv, GHSA-vxpw-j846-p89q, GHSA-hm92-r4w5-c3mj, GHSA-35p6-xmwp-9g52, GHSA-g8m3-5g58-fq7m, GHSA-pr7r-676h-xcf6 | `jsdom@29.1.1` transitive dependency | Added override `undici@7.28.0` | `bun pm why undici` resolved `7.28.0`; focused Vitest jsdom suite passed |
| `uuid` GHSA-w5hq-g745-h8pq | `exceljs@4.4.0` transitive dependency | Confirmed ExcelJS uses `require('uuid').v4`; confirmed `uuid@11.1.1` CJS export; added override `uuid@11.1.1` | `bun pm why uuid` resolved `11.1.1`; UUID CJS smoke and ExcelJS XLSX write/load smoke passed |

## Compatibility Evidence

- `bun audit --json`: passed with `{}`.
- `bun --eval` UUID CJS smoke: passed with `uuid-cjs-ok 36`.
- ExcelJS XLSX write/load smoke with conditional formatting: passed with `exceljs-xlsx-ok 6378`.
- `bunx vitest run tests/vitest/project-invite-entry-route.test.ts tests/vitest/project-invite-sign-out-route.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/ai-package-builder-route.test.ts tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx --maxWorkers=1`: passed 6 files / 121 tests.
- Targeted ESLint for touched source/test files: passed.
- `bun run type-check`: passed.
- `bun run build`: passed.
- `STORYBOOK_DISABLE_TELEMETRY=1 bun run build-storybook -- --output-dir /tmp/archestimator-storybook-static-infosec`: passed.
- `git diff --check`: passed.

## Follow-Up

- Revisit overrides periodically and remove them when upstream direct dependencies carry patched transitive ranges without overrides.
- Supply-chain hardening items `INFOSEC-SC-002` through `INFOSEC-SC-005` were fixed separately by the workflow-pinning, security-automation, toolchain, and env-template drift passes.
