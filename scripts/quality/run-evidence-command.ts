import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { flagString, parseArgs, qualityRoot } from "./common";
import {
  hasUnhandledCommandDiagnostic,
  resolveEvidenceCommand,
} from "./evidence-command-core";
import { parseCommandCounts } from "./evidence-counts";

const separator = process.argv.indexOf("--");
const rawArgs = separator >= 0 ? process.argv.slice(2, separator) : process.argv.slice(2);
const command = separator >= 0 ? process.argv.slice(separator + 1) : [];
const { flags } = parseArgs(rawArgs);
const root = qualityRoot();
const artifact = resolve(
  root,
  flagString(flags, "artifact", "artifacts/quality/command-evidence.json")!,
);
const evidenceId = flagString(flags, "evidence-id");
const resolvedCommand = resolveEvidenceCommand(command, process.env);
const startedAt = new Date();
const started = performance.now();
let stdout = "";
let stderr = "";
let exitCode = 1;
let signal: NodeJS.Signals | null = null;
let spawnError = resolvedCommand.error;
let unhandledErrorDetected = false;

if (!spawnError && resolvedCommand.executable) {
  await new Promise<void>((done) => {
    const child = spawn(resolvedCommand.executable!, resolvedCommand.args, {
      cwd: root,
      env: resolvedCommand.environment,
      stdio: ["inherit", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout = `${stdout}${text}`.slice(-20_000);
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      unhandledErrorDetected ||= hasUnhandledCommandDiagnostic(`${stderr.slice(-128)}${text}`);
      stderr = `${stderr}${text}`.slice(-20_000);
      process.stderr.write(text);
    });
    child.on("error", (error) => {
      spawnError = error.message;
      done();
    });
    child.on("close", (code, receivedSignal) => {
      exitCode = code ?? 1;
      signal = receivedSignal;
      done();
    });
  });
}

const combined = `${stdout}\n${stderr}`;
const counts = parseCommandCounts(combined);
const commandPassed = exitCode === 0 && !spawnError && !unhandledErrorDetected;
const report = {
  schema_version: 1,
  kind: "command-evidence",
  status: commandPassed ? "PASS" : "FAIL",
  generated_at: new Date().toISOString(),
  summary:
    commandPassed
      ? `Command PASS: ${command.join(" ")}`
      : unhandledErrorDetected && exitCode === 0 && !spawnError
        ? `Command FAIL (unhandled error): ${command.join(" ") || "missing command"}`
      : `Command FAIL (${exitCode}): ${command.join(" ") || "missing command"}`,
  findings: spawnError
    ? [{ code: "COMMAND_SPAWN", message: spawnError }]
    : exitCode !== 0
      ? [{ code: "COMMAND_EXIT", message: `Command exited ${exitCode}` }]
      : unhandledErrorDetected
        ? [
            {
              code: "COMMAND_UNHANDLED_ERROR",
              message: "Command emitted an unhandled-error diagnostic on stderr",
            },
          ]
        : [],
  data: {
    command,
    command_text: command.join(" "),
    evidence_id: evidenceId ?? null,
    cwd: root,
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: Math.round(performance.now() - started),
    exit_code: exitCode,
    signal,
    unhandled_error_detected: unhandledErrorDetected,
    counts,
    stdout_tail: stdout.slice(-20_000),
    stderr_tail: stderr.slice(-20_000),
  },
};
await mkdir(dirname(artifact), { recursive: true });
await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report)}\n${report.summary}\n`);
process.exit(commandPassed ? 0 : exitCode || 1);
