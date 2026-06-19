export const PROJECT_LOCATION_MAP_PROVIDER_NAME = "OpenFreeMap";
export const PROJECT_LOCATION_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const PROJECT_LOCATION_MAP_ALLOWED_HOSTS = ["tiles.openfreemap.org"] as const;
export const PROJECT_LOCATION_MAP_ATTRIBUTION =
  "OpenFreeMap, OpenMapTiles, and OpenStreetMap contributors";

export type ProjectLocationMapConfig = {
  readonly enabled: boolean;
  readonly providerName: string;
  readonly styleUrl: string | null;
  readonly allowedHosts: readonly string[];
  readonly attribution: string;
  readonly disabledReason: string | null;
};

function parseBoolean(value: string | undefined) {
  return value === "1" || value === "true";
}

function readAllowedStyleUrl(value: string | undefined) {
  const rawUrl = value?.trim() || PROJECT_LOCATION_MAP_STYLE_URL;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (!PROJECT_LOCATION_MAP_ALLOWED_HOSTS.includes(url.hostname as (typeof PROJECT_LOCATION_MAP_ALLOWED_HOSTS)[number])) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function getProjectLocationMapConfig(): ProjectLocationMapConfig {
  const enabled = parseBoolean(process.env.NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED);
  const styleUrl = readAllowedStyleUrl(process.env.NEXT_PUBLIC_PROJECT_LOCATION_MAP_STYLE_URL);

  if (!enabled) {
    return {
      enabled: false,
      providerName: PROJECT_LOCATION_MAP_PROVIDER_NAME,
      styleUrl,
      allowedHosts: PROJECT_LOCATION_MAP_ALLOWED_HOSTS,
      attribution: PROJECT_LOCATION_MAP_ATTRIBUTION,
      disabledReason: "Map provider disabled",
    };
  }

  if (!styleUrl) {
    return {
      enabled: false,
      providerName: PROJECT_LOCATION_MAP_PROVIDER_NAME,
      styleUrl: null,
      allowedHosts: PROJECT_LOCATION_MAP_ALLOWED_HOSTS,
      attribution: PROJECT_LOCATION_MAP_ATTRIBUTION,
      disabledReason: "Map provider misconfigured",
    };
  }

  return {
    enabled: true,
    providerName: PROJECT_LOCATION_MAP_PROVIDER_NAME,
    styleUrl,
    allowedHosts: PROJECT_LOCATION_MAP_ALLOWED_HOSTS,
    attribution: PROJECT_LOCATION_MAP_ATTRIBUTION,
    disabledReason: null,
  };
}
