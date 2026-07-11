import { spawnSync } from "node:child_process";
import { isAbsolute, relative, resolve } from "node:path";

export type LocalD1PrepareCommandRole = "better-auth-schema" | "application-migrations" | "fixture-seed";

export type LocalD1PrepareCommand = {
  role: LocalD1PrepareCommandRole;
  argv: string[];
};

type CommandResult = {
  status: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
};

export type LocalD1PrepareCommandRunner = (
  executable: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => CommandResult;

function requireAbsolutePath(path: string, label: string): string {
  if (!isAbsolute(path)) throw new Error(`${label} must be absolute`);
  return resolve(path);
}

function requireRunContainedPath(runRoot: string, path: string, label: string): string {
  const resolved = requireAbsolutePath(path, label);
  const child = relative(runRoot, resolved);
  if (!child || child === ".." || child.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(child)) {
    throw new Error(`${label} must be contained by the run root`);
  }
  return resolved;
}

export function buildLocalD1PrepareCommands(input: {
  runRoot: string;
  persistRoot: string;
  schemaPath: string;
  seedPath: string;
}): LocalD1PrepareCommand[] {
  const runRoot = requireAbsolutePath(input.runRoot, "run root");
  const persistRoot = requireRunContainedPath(runRoot, input.persistRoot, "Wrangler persistence root");
  const schemaPath = requireRunContainedPath(runRoot, input.schemaPath, "Better Auth schema path");
  const seedPath = requireRunContainedPath(runRoot, input.seedPath, "fixture seed path");
  const base = ["wrangler", "d1"];
  return [
    {
      role: "better-auth-schema",
      argv: ["bunx", ...base, "execute", "ARCH_DB", "--local", "--persist-to", persistRoot, "--file", schemaPath],
    },
    {
      role: "application-migrations",
      argv: ["bunx", ...base, "migrations", "apply", "ARCH_DB", "--local", "--persist-to", persistRoot],
    },
    {
      role: "fixture-seed",
      argv: ["bunx", ...base, "execute", "ARCH_DB", "--local", "--persist-to", persistRoot, "--file", seedPath],
    },
  ];
}

export function buildLocalD1PrepareEnvironment(
  parentEnvironment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    CI: "1",
    NO_COLOR: "1",
    WRANGLER_SEND_METRICS: "false",
  };
  for (const key of ["PATH", "HOME", "USERPROFILE", "TMPDIR", "TMP", "TEMP", "SystemRoot", "ComSpec", "PATHEXT"] as const) {
    const value = parentEnvironment[key];
    if (value === undefined || value === "") continue;
    if (/[\r\n\0]/u.test(value)) throw new Error(`parent environment ${key} contains an invalid value`);
    environment[key] = value;
  }
  if (!environment.PATH) throw new Error("local D1 preparation requires PATH");
  return environment;
}

export function executeLocalD1PrepareCommands(input: {
  repoRoot: string;
  commands: readonly LocalD1PrepareCommand[];
  runner?: LocalD1PrepareCommandRunner;
  parentEnvironment?: NodeJS.ProcessEnv;
}): void {
  const repoRoot = requireAbsolutePath(input.repoRoot, "repository root");
  const expectedRoles: LocalD1PrepareCommandRole[] = ["better-auth-schema", "application-migrations", "fixture-seed"];
  if (input.commands.length !== expectedRoles.length
    || input.commands.some((command, index) => command.role !== expectedRoles[index])) {
    throw new Error("local D1 preparation requires the exact schema, migrations, seed command sequence");
  }
  const environment = buildLocalD1PrepareEnvironment(input.parentEnvironment);
  const runner = input.runner ?? ((executable, args, options) => spawnSync(executable, args, {
    ...options,
    stdio: "ignore",
    shell: false,
  }));
  for (const command of input.commands) {
    if (command.argv[0] !== "bunx" || command.argv.length < 2) throw new Error(`${command.role} has an invalid command`);
    const result = runner(command.argv[0], command.argv.slice(1), { cwd: repoRoot, env: environment });
    if (result.error || result.status !== 0 || result.signal !== null) {
      throw new Error(`${command.role} failed with exit ${result.status ?? "none"} and signal ${result.signal ?? "none"}`);
    }
  }
}
