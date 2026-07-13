import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const binary = path.join(os.homedir(), ".kimi-webbridge", "bin", "kimi-webbridge");

if (!fs.existsSync(binary)) {
  console.log("Kimi WebBridge is not installed; skipping its skill update.");
  process.exit(0);
}

function run(args, options = {}) {
  const result = spawnSync(binary, args, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout ?? "";
}

run(["upgrade"]);

const status = JSON.parse(run(["status"], { capture: true }));
const detectedVersion = status.extension_version ?? status.version;
const versionArgs = detectedVersion
  ? ["--version", String(detectedVersion).startsWith("v") ? detectedVersion : `v${detectedVersion}`]
  : [];

run(["install-skill", "--yes", ...versionArgs]);
console.log(
  `Kimi WebBridge skills refreshed${detectedVersion ? ` for ${detectedVersion}` : " from latest"}.`,
);
