export interface ResolvedEvidenceCommand {
  executable: string | null;
  args: string[];
  environment: NodeJS.ProcessEnv;
  error: string | null;
}

const ENV_ASSIGNMENT_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)/;
const UNHANDLED_COMMAND_DIAGNOSTIC_PATTERNS = [
  /\buncaughtException\b/iu,
  /\bunhandledRejection\b/iu,
  /\bUnhandledPromiseRejection(?:Warning)?\b/iu,
  /\bVitest caught \d+ unhandled errors?\b/iu,
];

export function hasUnhandledCommandDiagnostic(output: string): boolean {
  return UNHANDLED_COMMAND_DIAGNOSTIC_PATTERNS.some((pattern) => pattern.test(output));
}

function copyEnvironment(baseEnvironment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const environment = Object.create(null) as NodeJS.ProcessEnv;
  for (const key of Object.keys(baseEnvironment)) {
    environment[key] = baseEnvironment[key];
  }
  return environment;
}

function setEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  key: string,
  value: string,
  platform: NodeJS.Platform,
) {
  if (platform === "win32") {
    for (const existingKey of Object.keys(environment)) {
      if (existingKey.toLowerCase() === key.toLowerCase()) {
        delete environment[existingKey];
      }
    }
  }
  environment[key] = value;
}

function applyEnvironmentAssignments(
  command: string[],
  baseEnvironment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
) {
  const environment = copyEnvironment(baseEnvironment);
  let commandIndex = 1;
  for (const argument of command.slice(1)) {
    const assignment = ENV_ASSIGNMENT_PATTERN.exec(argument);
    if (!assignment) break;
    setEnvironmentValue(environment, assignment[1]!, assignment[2]!, platform);
    commandIndex += 1;
  }
  return { commandIndex, environment };
}

export function resolveEvidenceCommand(
  command: string[],
  baseEnvironment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
): ResolvedEvidenceCommand {
  if (command.length === 0) {
    return {
      executable: null,
      args: [],
      environment: baseEnvironment,
      error: "A command is required after --",
    };
  }

  if (command[0] !== "env") {
    return {
      executable: command[0]!,
      args: command.slice(1),
      environment: baseEnvironment,
      error: null,
    };
  }

  const { commandIndex, environment } = applyEnvironmentAssignments(
    command,
    baseEnvironment,
    platform,
  );

  if (commandIndex === 1) {
    return {
      executable: null,
      args: [],
      environment,
      error: "env requires at least one KEY=VALUE assignment",
    };
  }

  if (commandIndex >= command.length) {
    return {
      executable: null,
      args: [],
      environment,
      error: "env requires a command after its assignments",
    };
  }

  return {
    executable: command[commandIndex]!,
    args: command.slice(commandIndex + 1),
    environment,
    error: null,
  };
}
