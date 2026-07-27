const mutationTargets = JSON.parse(
  process.env.ARCHESTIMATOR_MUTATION_TARGETS ?? "[]",
);
const mutationTsconfig = process.env.ARCHESTIMATOR_MUTATION_TSCONFIG;

if (
  !Array.isArray(mutationTargets) ||
  mutationTargets.length === 0 ||
  !mutationTsconfig
) {
  throw new Error(
    "scripts/quality/run-mutation.ts must provide mutation targets and a selected TypeScript project",
  );
}

const strykerConfig = {
  $schema: "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  testRunner: "vitest",
  checkers: ["typescript"],
  tsconfigFile: mutationTsconfig,
  ignorePatterns: [
    "**/*",
    "!package.json",
    "!bun.lock",
    "!tsconfig.json",
    "!tsconfig.mutation.json",
    `!${mutationTsconfig}`,
    "!vitest.config.ts",
    "!vitest.mutation.config.ts",
    "!next.config.ts",
    "!cloudflare-env.d.ts",
    "!css-modules.d.ts",
    "!next-env.d.ts",
    "!image-loader.ts",
    "!public/**",
    "!migrations/**",
    "!quality/**",
    "!scripts/quality/**",
    "!scripts/enforce-button-architecture.mjs",
    "!src/**",
    "!tests/vitest/**",
    "!tests/property/**",
  ],
  mutate: mutationTargets,
  vitest: {
    configFile: "vitest.mutation.config.ts",
    related: true,
  },
  coverageAnalysis: "perTest",
  concurrency: 1,
  reporters: ["clear-text", "progress", "html", "json"],
  thresholds: {
    high: 90,
    low: 80,
    break: 80,
  },
  jsonReporter: {
    fileName: "artifacts/stryker/stryker.json",
  },
  htmlReporter: {
    fileName: "artifacts/stryker/stryker.html",
  },
  tempDirName: ".stryker-tmp",
};

export default strykerConfig;
