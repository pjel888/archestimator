import { basename } from "node:path";

interface CommandBinding {
  command: string;
  job: string;
  artifact: string;
}

const COMMAND_BINDINGS: CommandBinding[] = [
  { command: "bun run quality:classify", job: "quality / classify", artifact: "classification.json" },
  { command: "bun run quality:contracts", job: "quality / contracts", artifact: "contracts.json" },
  { command: "bun run quality:adapters", job: "quality / adapters", artifact: "adapter-validation.json" },
  { command: "bun run quality:anti-bypass", job: "quality / anti-bypass", artifact: "anti-bypass.json" },
  { command: "bun run quality:workflows", job: "quality / workflows", artifact: "workflows.json" },
  { command: "bun run quality:reviews", job: "quality / review", artifact: "reviews.json" },
  { command: "bun run quality:enforcement-contract", job: "quality / enforcement", artifact: "enforcement.json" },
  { command: "bun run quality:static", job: "quality / static", artifact: "static.json" },
  { command: "bun run test:unit:coverage", job: "quality / unit", artifact: "unit.json" },
  { command: "bun run test:component:change", job: "quality / component", artifact: "component.json" },
  { command: "bun run test:component:critical", job: "quality / component", artifact: "component.json" },
  { command: "bun run test:component:release", job: "quality / component", artifact: "component.json" },
  { command: "bun run quality:diff-coverage", job: "quality / coverage", artifact: "diff-coverage.json" },
  { command: "bun run test:property", job: "quality / property", artifact: "property.json" },
  { command: "bun run test:workers:coverage", job: "quality / workers", artifact: "workers.json" },
  { command: "bun run test:bdd:smoke", job: "quality / bdd-smoke", artifact: "bdd-smoke.json" },
  { command: "bun run test:bdd", job: "quality / bdd-smoke", artifact: "bdd.json" },
  { command: "bun run test:a11y", job: "quality / a11y", artifact: "a11y.json" },
  { command: "bun run build", job: "quality / build", artifact: "build.json" },
  { command: "bun run quality:bundle-budget", job: "quality / build", artifact: "bundle-budget.json" },
  { command: "bun run test:e2e:smoke", job: "quality / e2e-smoke", artifact: "e2e-smoke.json" },
  { command: "bun run test:e2e:matrix", job: "quality / e2e-smoke", artifact: "e2e-matrix.json" },
  { command: "bun run test:mutation:changed", job: "quality / mutation", artifact: "mutation.json" },
  { command: "bun run test:mutation:critical", job: "quality / mutation", artifact: "mutation.json" },
  { command: "bun run test:mutation:full", job: "quality / mutation", artifact: "mutation.json" },
  { command: "bun run quality:security", job: "quality / security", artifact: "security.json" },
  { command: "bun run test:ai-evals", job: "quality / ai-eval", artifact: "ai-eval.json" },
  { command: "bun run quality:operations", job: "quality / operations", artifact: "operations.json" },
];

const BINDING_BY_COMMAND = new Map(
  COMMAND_BINDINGS.map((binding) => [binding.command, binding]),
);
const ARTIFACTS_BY_JOB = new Map<string, Set<string>>();
for (const binding of COMMAND_BINDINGS) {
  const artifacts = ARTIFACTS_BY_JOB.get(binding.job) ?? new Set<string>();
  artifacts.add(binding.artifact);
  ARTIFACTS_BY_JOB.set(binding.job, artifacts);
}

export function jobNameForCommand(command: string): string | undefined {
  return BINDING_BY_COMMAND.get(command)?.job;
}

export function artifactNameForCommand(command: string): string | undefined {
  return BINDING_BY_COMMAND.get(command)?.artifact;
}

export function artifactBelongsToJob(jobName: string, artifactPath: string): boolean {
  return ARTIFACTS_BY_JOB.get(jobName)?.has(basename(artifactPath)) ?? false;
}
