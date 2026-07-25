import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { flagString, parseArgs, qualityRoot } from "./common";
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
const startedAt = new Date();
const started = performance.now();
let stdout = "";
let stderr = "";
let exitCode = 1;
let signal: NodeJS.Signals | null = null;
let spawnError: string | null = null;

if (command.length === 0) {
  spawnError = "A command is required after --";
} else {
  await new Promise<void>((done) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: root,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout = `${stdout}${text}`.slice(-20_000);
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
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
const report = {
  schema_version: 1,
  kind: "command-evidence",
  status: exitCode === 0 && !spawnError ? "PASS" : "FAIL",
  generated_at: new Date().toISOString(),
  summary:
    exitCode === 0 && !spawnError
      ? `Command PASS: ${command.join(" ")}`
      : `Command FAIL (${exitCode}): ${command.join(" ") || "missing command"}`,
  findings: spawnError
    ? [{ code: "COMMAND_SPAWN", message: spawnError }]
    : exitCode === 0
      ? []
      : [{ code: "COMMAND_EXIT", message: `Command exited ${exitCode}` }],
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
    counts,
    stdout_tail: stdout.slice(-20_000),
    stderr_tail: stderr.slice(-20_000),
  },
};
await mkdir(dirname(artifact), { recursive: true });
await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report)}\n${report.summary}\n`);
process.exit(exitCode);
