import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectLocationMap } from "@/components/workshop/ProjectLocationMap";
import type { ProjectLocationMapConfig } from "@/lib/projects/location-map-config";

const maplibreMock = vi.hoisted(() => ({
  mapConstructor: vi.fn(),
  navigationConstructor: vi.fn(),
  markerConstructor: vi.fn(),
  markerAddTo: vi.fn(),
  mapRemove: vi.fn(),
  markerRemove: vi.fn(),
  mapHandlers: new Map<string, (event?: unknown) => void>(),
  markerHandlers: new Map<string, () => void>(),
  markerLngLat: { lng: 120.984222, lat: 14.599512 },
}));

vi.mock("maplibre-gl", () => {
  class MockMap {
    constructor(options: unknown) {
      maplibreMock.mapConstructor(options);
    }

    addControl(control: unknown, position?: string) {
      maplibreMock.navigationConstructor({ control, position });
      return this;
    }

    on(event: string, callback: (event?: unknown) => void) {
      maplibreMock.mapHandlers.set(event, callback);
      return this;
    }

    remove() {
      maplibreMock.mapRemove();
    }
  }

  class MockNavigationControl {
    constructor(options: unknown) {
      maplibreMock.navigationConstructor(options);
    }
  }

  class MockMarker {
    constructor(options: unknown) {
      maplibreMock.markerConstructor(options);
    }

    setLngLat(lngLat: [number, number] | { lng: number; lat: number }) {
      maplibreMock.markerLngLat = Array.isArray(lngLat)
        ? { lng: lngLat[0], lat: lngLat[1] }
        : { lng: lngLat.lng, lat: lngLat.lat };
      return this;
    }

    addTo(map: unknown) {
      maplibreMock.markerAddTo(map);
      return this;
    }

    on(event: string, callback: () => void) {
      maplibreMock.markerHandlers.set(event, callback);
      return this;
    }

    getLngLat() {
      return maplibreMock.markerLngLat;
    }

    remove() {
      maplibreMock.markerRemove();
    }
  }

  return {
    Map: MockMap,
    Marker: MockMarker,
    NavigationControl: MockNavigationControl,
  };
});

const ENABLED_CONFIG: ProjectLocationMapConfig = {
  enabled: true,
  providerName: "OpenFreeMap",
  styleUrl: "https://tiles.openfreemap.org/styles/liberty",
  allowedHosts: ["tiles.openfreemap.org"],
  attribution: "OpenFreeMap, OpenMapTiles, and OpenStreetMap contributors",
  disabledReason: null,
};

const DISABLED_CONFIG: ProjectLocationMapConfig = {
  ...ENABLED_CONFIG,
  enabled: false,
  disabledReason: "Map provider disabled",
};

function enableWebGl() {
  Object.defineProperty(window, "WebGLRenderingContext", {
    configurable: true,
    value: function WebGLRenderingContext() {},
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((contextId: string) => {
    if (contextId === "webgl" || contextId === "experimental-webgl") return {} as RenderingContext;
    return null;
  });
}

function disableWebGl() {
  Object.defineProperty(window, "WebGLRenderingContext", {
    configurable: true,
    value: function WebGLRenderingContext() {},
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
}

describe("ProjectLocationMap", () => {
  beforeEach(() => {
    maplibreMock.mapConstructor.mockClear();
    maplibreMock.navigationConstructor.mockClear();
    maplibreMock.markerConstructor.mockClear();
    maplibreMock.markerAddTo.mockClear();
    maplibreMock.mapRemove.mockClear();
    maplibreMock.markerRemove.mockClear();
    maplibreMock.mapHandlers.clear();
    maplibreMock.markerHandlers.clear();
    maplibreMock.markerLngLat = { lng: 120.984222, lat: 14.599512 };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders visible attribution and initializes MapLibre only when enabled", async () => {
    enableWebGl();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProjectLocationMap
        latitude={14.599512}
        longitude={120.984222}
        addressLabel="Quezon City"
        config={ENABLED_CONFIG}
        onPinChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("project-location-map")).toBeInTheDocument();
    expect(screen.getByLabelText("Map attribution")).toHaveTextContent("OpenFreeMap");
    await waitFor(() => expect(maplibreMock.mapConstructor).toHaveBeenCalledTimes(1));
    expect(maplibreMock.mapConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [120.984222, 14.599512],
        attributionControl: { compact: true },
        cooperativeGestures: true,
      }),
    );
    expect(maplibreMock.markerConstructor).toHaveBeenCalledWith({ draggable: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps text coordinates when the provider is disabled", () => {
    enableWebGl();

    render(
      <ProjectLocationMap
        latitude={14.599512}
        longitude={120.984222}
        addressLabel="Quezon City"
        config={DISABLED_CONFIG}
        onPinChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Map provider disabled")).toBeInTheDocument();
    expect(screen.getByText(/14\.599512, 120\.984222/)).toBeInTheDocument();
    expect(screen.queryByTestId("project-location-map")).not.toBeInTheDocument();
    expect(maplibreMock.mapConstructor).not.toHaveBeenCalled();
  });

  it("falls back to text coordinates when WebGL is unavailable", () => {
    disableWebGl();

    render(
      <ProjectLocationMap
        latitude={14.599512}
        longitude={120.984222}
        addressLabel="Quezon City"
        config={ENABLED_CONFIG}
        onPinChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Map unavailable without WebGL")).toBeInTheDocument();
    expect(screen.getByText(/14\.599512, 120\.984222/)).toBeInTheDocument();
    expect(maplibreMock.mapConstructor).not.toHaveBeenCalled();
  });

  it("falls back to text coordinates when tile loading fails", async () => {
    enableWebGl();

    render(
      <ProjectLocationMap
        latitude={14.599512}
        longitude={120.984222}
        addressLabel="Quezon City"
        config={ENABLED_CONFIG}
        onPinChange={vi.fn()}
      />,
    );

    await waitFor(() => expect(maplibreMock.mapConstructor).toHaveBeenCalledTimes(1));
    act(() => {
      maplibreMock.mapHandlers.get("error")?.({});
    });

    expect(screen.getByText("Map tiles unavailable")).toBeInTheDocument();
    expect(screen.getByText(/14\.599512, 120\.984222/)).toBeInTheDocument();
  });

  it("updates the draft pin when the map is clicked or the marker is dragged", async () => {
    enableWebGl();
    const onPinChange = vi.fn();

    render(
      <ProjectLocationMap
        latitude={14.599512}
        longitude={120.984222}
        addressLabel="Quezon City"
        config={ENABLED_CONFIG}
        onPinChange={onPinChange}
      />,
    );

    await waitFor(() => expect(maplibreMock.mapConstructor).toHaveBeenCalledTimes(1));
    act(() => {
      maplibreMock.mapHandlers.get("click")?.({ lngLat: { lng: 121.01234567, lat: 14.61234567 } });
    });
    expect(onPinChange).toHaveBeenCalledWith({ latitude: 14.612346, longitude: 121.012346 });

    maplibreMock.markerLngLat = { lng: 120.1111114, lat: 14.2222224 };
    act(() => {
      maplibreMock.markerHandlers.get("dragend")?.();
    });
    expect(onPinChange).toHaveBeenCalledWith({ latitude: 14.222222, longitude: 120.111111 });
  });
});
