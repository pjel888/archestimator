import { pathToFileURL } from "node:url";

export function isSupportedNodeVersion(version) {
  const [major, minor] = version.split(".").map(Number);
  // ponytail: even-major = LTS release line (Node's cadence). 22.12 is the floor;
  // any even major >= 24 (24/26/28/...) is supported without re-editing this gate.
  return (major === 22 && minor >= 12) || (major >= 24 && major % 2 === 0);
}

export function checkNodeVersion(version = process.versions.node) {
  if (isSupportedNodeVersion(version)) {
    return true;
  }

  console.error(
    `Archestimator tooling requires an even-LTS Node (22.12+, 24.x, 26.x, ...); found ${version}. Install a supported Node (e.g. \`brew install node@24\` or \`nvm use 24\`) and retry.`,
  );
  return false;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = checkNodeVersion() ? 0 : 1;
}
