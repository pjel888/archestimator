#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildReleaseBoundaryPackets,
  sanitizeGitHubDiscovery,
  type GitHubDiscoveryRaw,
  type ReleaseBoundaryPacketInput,
} from "./lib/release-hosted-discovery";

export function collectReleaseHostedDiscovery(input: GitHubDiscoveryRaw, packetInput: ReleaseBoundaryPacketInput) {
  return { discovery: sanitizeGitHubDiscovery(input), packets: buildReleaseBoundaryPackets(packetInput) };
}

if (import.meta.main) {
  const [inputPath, outputDirectory, packetInputPath] = Bun.argv.slice(2);
  if (!inputPath || !outputDirectory || !packetInputPath) {
    throw new Error("Usage: collect-release-hosted-discovery <sanitized-input.json> <output-dir> <packet-input.json>. This collector does not invoke GitHub or Cloudflare.");
  }
  const result = collectReleaseHostedDiscovery(
    JSON.parse(readFileSync(resolve(inputPath), "utf8")) as GitHubDiscoveryRaw,
    JSON.parse(readFileSync(resolve(packetInputPath), "utf8")) as ReleaseBoundaryPacketInput,
  );
  const directory = resolve(outputDirectory);
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, "hosted-discovery.json"), `${JSON.stringify(result.discovery, null, 2)}\n`);
  for (const packet of result.packets) {
    const name = packet.boundary === "AUTH-001" ? "github-control-packet.json" : packet.boundary === "AUTH-002" ? "staging-proof-packet.json" : "production-release-packet.json";
    writeFileSync(resolve(directory, name), `${JSON.stringify(packet, null, 2)}\n`);
  }
}
