import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checkedSources = {
  publicationSnapshot: readFileSync("src/lib/publication/snapshot.ts", "utf8"),
  publicationActions: readFileSync("src/lib/publication/actions.ts", "utf8"),
  publicSharePage: readFileSync("src/app/share/[token]/page.tsx", "utf8"),
  proposalExportRoute: readFileSync("src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts", "utf8"),
  aiAskHandler: readFileSync("src/app/api/ai/ask/handler.ts", "utf8"),
  aiPackageReadTools: readFileSync("src/lib/ai/package-builder/read-tools.ts", "utf8"),
  workspaceRepository: readFileSync("src/lib/repositories/workspace-repository.ts", "utf8"),
};

describe("project exact location privacy boundaries", () => {
  it("keeps exact coordinates out of public share, export, AI context, and broad project readers", () => {
    for (const [name, source] of Object.entries(checkedSources)) {
      expect(source, name).not.toContain("project_locations");
      expect(source, name).not.toContain("latitude");
      expect(source, name).not.toContain("longitude");
      expect(source, name).not.toContain("coordinates");
      expect(source, name).not.toContain("projectLocation");
    }
  });

  it("keeps the optional map provider bounded and avoids public geocoding", () => {
    const nextConfig = readFileSync("next.config.ts", "utf8");
    const packageJson = readFileSync("package.json", "utf8");
    const mapConfig = readFileSync("src/lib/projects/location-map-config.ts", "utf8");
    const mapComponent = readFileSync("src/components/workshop/ProjectLocationMap.tsx", "utf8");

    expect(nextConfig).toContain("https://tiles.openfreemap.org");
    expect(nextConfig).toContain("workshopReportOnlyCsp");
    expect(nextConfig).not.toContain("tile.openstreetmap");
    expect(nextConfig).not.toContain("mapbox");
    expect(packageJson).toContain("maplibre-gl");
    expect(packageJson).not.toContain("leaflet");
    expect(packageJson).not.toContain("pmtiles");
    expect(mapConfig).toContain("NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED");
    expect(mapConfig).toContain("NEXT_PUBLIC_PROJECT_LOCATION_MAP_STYLE_URL");
    expect(mapConfig).toContain("tiles.openfreemap.org");
    expect(`${mapConfig}\n${mapComponent}\n${nextConfig}`).not.toContain("Nominatim");
    expect(`${mapConfig}\n${mapComponent}\n${nextConfig}`).not.toContain("nominatim");
    expect(`${mapConfig}\n${mapComponent}\n${nextConfig}`).not.toContain("tile.openstreetmap.org");
  });
});
