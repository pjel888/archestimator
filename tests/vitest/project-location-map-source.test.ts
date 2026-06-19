import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardClient = readFileSync("src/components/workshop/ProjectDashboardClient.tsx", "utf8");
const mapComponent = readFileSync("src/components/workshop/ProjectLocationMap.tsx", "utf8");
const mapConfig = readFileSync("src/lib/projects/location-map-config.ts", "utf8");
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");

describe("project location map source boundaries", () => {
  it("keeps the map SDK out of the dashboard shell and behind a client-only dynamic island", () => {
    expect(dashboardClient).toContain("dynamic(");
    expect(dashboardClient).toContain('import("./ProjectLocationMap")');
    expect(dashboardClient).toContain("ssr: false");
    expect(dashboardClient).not.toMatch(/from\s+["']maplibre-gl/);
    expect(dashboardClient).not.toMatch(/from\s+["']leaflet/);
    expect(mapComponent).toContain('import("maplibre-gl")');
    expect(rootLayout).toContain('import "maplibre-gl/dist/maplibre-gl.css"');
  });

  it("keeps the provider switchable and avoids public geocoding/autocomplete", () => {
    expect(mapConfig).toContain("NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED");
    expect(mapConfig).toContain("NEXT_PUBLIC_PROJECT_LOCATION_MAP_STYLE_URL");
    expect(mapConfig).toContain("https://tiles.openfreemap.org/styles/liberty");
    expect(mapConfig).toContain("PROJECT_LOCATION_MAP_ALLOWED_HOSTS");
    expect(`${dashboardClient}\n${mapComponent}\n${mapConfig}`).not.toContain("Nominatim");
    expect(`${dashboardClient}\n${mapComponent}\n${mapConfig}`).not.toContain("autocomplete");
    expect(`${dashboardClient}\n${mapComponent}\n${mapConfig}`).not.toContain("tile.openstreetmap.org");
  });
});
