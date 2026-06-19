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

  it("keeps the Google map/search provider bounded to authenticated workshop surfaces", () => {
    const nextConfig = readFileSync("next.config.ts", "utf8");
    const packageJson = readFileSync("package.json", "utf8");
    const mapComponent = readFileSync("src/components/workshop/ProjectLocationMap.tsx", "utf8");
    const addressAutocomplete = readFileSync("src/components/workshop/ProjectAddressAutocomplete.tsx", "utf8");

    expect(nextConfig).toContain("https://maps.googleapis.com");
    expect(nextConfig).toContain("https://*.googleapis.com");
    expect(nextConfig).toContain("https://*.gstatic.com");
    expect(nextConfig).toContain("workshopReportOnlyCsp");
    expect(nextConfig).not.toContain("tile.openstreetmap");
    expect(nextConfig).not.toContain("tiles.openfreemap");
    expect(nextConfig).not.toContain("mapbox");
    expect(packageJson).not.toContain("maplibre-gl");
    expect(packageJson).not.toContain("leaflet");
    expect(packageJson).not.toContain("pmtiles");
    expect(mapComponent).toContain("loadGoogleMapsApi");
    expect(addressAutocomplete).toContain("AutocompleteSuggestion.fetchAutocompleteSuggestions");
    expect(`${addressAutocomplete}\n${mapComponent}\n${nextConfig}`).not.toContain("Nominatim");
    expect(`${addressAutocomplete}\n${mapComponent}\n${nextConfig}`).not.toContain("nominatim");
    expect(`${addressAutocomplete}\n${mapComponent}\n${nextConfig}`).not.toContain("tile.openstreetmap.org");
  });
});
