import { pathToFileURL } from "node:url";

export function isSupportedNodeVersion(version) {
  const [major, minor] = version.split(".").map(Number);
  return (major === 22 && minor >= 12) || major === 24;
}

export function checkNodeVersion(version = process.versions.node) {
  if (isSupportedNodeVersion(version)) {
    return true;
  }

  console.error(
    `Archestimator tooling requires Node 22.12+ or 24.x; found ${version}. Run \`nvm use\` before continuing.`,
  );
  return false;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = checkNodeVersion() ? 0 : 1;
}
