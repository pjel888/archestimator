import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectLocationMap } from "@/components/workshop/ProjectLocationMap";

const googleMocks = vi.hoisted(() => {
  const loadGoogleMapsApi = vi.fn();
  const importLibrary = vi.fn();
  const mapConstructor = vi.fn();
  const mapSetCenter = vi.fn();
  const mapSetZoom = vi.fn();

  class MockMap {
    constructor(element: HTMLElement, options: Record<string, unknown>) {
      mapConstructor({ element, options });
    }

    setCenter(position: { lat: number; lng: number }) {
      mapSetCenter(position);
    }

    setZoom(zoom: number) {
      mapSetZoom(zoom);
    }
  }

  return {
    loadGoogleMapsApi,
    importLibrary,
    mapConstructor,
    mapSetCenter,
    mapSetZoom,
    MockMap,
  };
});

vi.mock("@/lib/google-maps/loader", () => ({
  hasGoogleMapsApiKey: (apiKey: string | null | undefined) => Boolean(apiKey?.trim()),
  loadGoogleMapsApi: googleMocks.loadGoogleMapsApi,
}));

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

const idleCallbacks: IdleCallback[] = [];

function flushIdleCallback(index = 0) {
  act(() => {
    idleCallbacks[index]?.({ didTimeout: false, timeRemaining: () => 50 });
  });
}

describe("ProjectLocationMap", () => {
  beforeEach(() => {
    idleCallbacks.length = 0;
    vi.stubGlobal("requestIdleCallback", vi.fn((callback: IdleCallback) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    }));
    vi.stubGlobal("cancelIdleCallback", vi.fn());
    googleMocks.loadGoogleMapsApi.mockReset();
    googleMocks.importLibrary.mockReset();
    googleMocks.mapConstructor.mockClear();
    googleMocks.mapSetCenter.mockClear();
    googleMocks.mapSetZoom.mockClear();
    googleMocks.importLibrary.mockImplementation(async (libraryName: string) => {
      if (libraryName === "maps") return { Map: googleMocks.MockMap };
      throw new Error(`Unexpected Google Maps library ${libraryName}`);
    });
    googleMocks.loadGoogleMapsApi.mockResolvedValue({ importLibrary: googleMocks.importLibrary });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a bounded fallback when the Google browser key is unavailable", () => {
    render(
      <ProjectLocationMap
        apiKey=""
        pin={{ latitude: 14.599512, longitude: 120.984222 }}
        addressLabel="Quezon City"
      />,
    );

    expect(screen.getByText("Google Maps API key missing")).toBeInTheDocument();
    expect(screen.queryByTestId("project-location-google-map")).not.toBeInTheDocument();
    expect(googleMocks.loadGoogleMapsApi).not.toHaveBeenCalled();
  });

  it("defers the Maps library until idle and renders a saved project pin overlay", async () => {
    render(
      <ProjectLocationMap
        apiKey="test-google-browser-key"
        mapId="archestimator-map"
        pin={{ latitude: 14.599512, longitude: 120.984222 }}
        addressLabel="Quezon City"
        overlaySummary={<span>Location summary</span>}
        rightRail={<span>Location rail</span>}
        lowerLeftSummary={<span>Budget summary</span>}
        lowerLeftDetail={<span>Activity detail</span>}
      />,
    );

    expect(screen.getByTestId("project-location-google-map")).toBeInTheDocument();
    expect(googleMocks.loadGoogleMapsApi).not.toHaveBeenCalled();
    await waitFor(() => expect(idleCallbacks).toHaveLength(1));
    flushIdleCallback();

    await waitFor(() => expect(googleMocks.mapConstructor).toHaveBeenCalledTimes(1));
    expect(googleMocks.loadGoogleMapsApi).toHaveBeenCalledWith("test-google-browser-key");
    expect(googleMocks.importLibrary).toHaveBeenCalledWith("maps");
    expect(googleMocks.importLibrary).not.toHaveBeenCalledWith("marker");
    expect(googleMocks.mapConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          center: { lat: 14.599512, lng: 120.984222 },
          zoom: 11,
          disableDefaultUI: true,
          styles: expect.any(Array),
          clickableIcons: false,
          draggable: false,
          gestureHandling: "none",
        }),
      }),
    );
    const mapOptions = googleMocks.mapConstructor.mock.calls[0]?.[0].options;
    expect(mapOptions).not.toHaveProperty("mapId");
    expect(mapOptions.styles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          featureType: "poi",
          stylers: expect.arrayContaining([expect.objectContaining({ visibility: "off" })]),
        }),
        expect.objectContaining({
          elementType: "labels.icon",
          stylers: expect.arrayContaining([expect.objectContaining({ visibility: "off" })]),
        }),
        expect.objectContaining({
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
        }),
        expect.objectContaining({
          featureType: "administrative.neighborhood",
          elementType: "labels.text.fill",
        }),
        expect.objectContaining({
          featureType: "road",
          elementType: "labels.text.fill",
        }),
      ]),
    );
    expect(screen.getByTestId("project-location-map-pin")).toBeInTheDocument();
    expect(screen.getByTestId("project-location-overlay-grid")).toHaveClass("grid-cols-16", "grid-rows-8", "gap-2", "p-2");
    expect(screen.getByTestId("project-location-frosted-upper-panel")).toHaveClass(
      "col-start-1",
      "col-span-5",
      "row-start-1",
      "row-span-4",
      "p-2",
      "backdrop-blur-[10px]",
    );
    expect(screen.getByTestId("project-location-frosted-panel")).toHaveClass(
      "col-start-13",
      "col-span-4",
      "row-start-1",
      "row-span-8",
      "backdrop-blur-[10px]",
    );
    expect(screen.getByTestId("project-location-frosted-lower-left-panel")).toHaveClass(
      "col-start-1",
      "col-span-5",
      "row-start-5",
      "row-span-1",
      "p-2",
      "backdrop-blur-[10px]",
    );
    expect(screen.getByTestId("project-location-frosted-lower-left-fill-panel")).toHaveClass(
      "col-start-1",
      "col-span-5",
      "row-start-6",
      "row-span-3",
      "p-2",
      "backdrop-blur-[10px]",
    );
    await waitFor(() => expect(googleMocks.mapSetCenter).toHaveBeenCalledWith({ lat: 14.599512, lng: 120.984222 }));
    expect(googleMocks.mapSetZoom).toHaveBeenCalledWith(15);
  });

  it("loads the Maps library immediately on map intent", async () => {
    render(
      <ProjectLocationMap
        apiKey="test-google-browser-key"
        pin={{ latitude: 14.599512, longitude: 120.984222 }}
        addressLabel="Quezon City"
      />,
    );

    expect(googleMocks.loadGoogleMapsApi).not.toHaveBeenCalled();
    fireEvent.pointerEnter(screen.getByTestId("project-location-map-frame"));

    await waitFor(() => expect(googleMocks.loadGoogleMapsApi).toHaveBeenCalledWith("test-google-browser-key"));
    expect(googleMocks.importLibrary).toHaveBeenCalledWith("maps");
  });

  it("initializes an unpinned map centered on the default project market", async () => {
    render(
      <ProjectLocationMap
        apiKey="test-google-browser-key"
        pin={null}
        addressLabel="Quezon City"
      />,
    );

    expect(screen.getByText("No exact pin saved")).toBeInTheDocument();
    await waitFor(() => expect(idleCallbacks).toHaveLength(1));
    flushIdleCallback();
    await waitFor(() => expect(googleMocks.mapConstructor).toHaveBeenCalledTimes(1));
    expect(googleMocks.mapConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          center: { lat: 14.599512, lng: 120.984222 },
          zoom: 11,
        }),
      }),
    );
    expect(screen.queryByTestId("project-location-map-pin")).not.toBeInTheDocument();
  });

  it("moves the rendered marker when the saved pin changes", async () => {
    const { rerender } = render(
      <ProjectLocationMap
        apiKey="test-google-browser-key"
        pin={{ latitude: 14.599512, longitude: 120.984222 }}
        addressLabel="Quezon City"
      />,
    );

    await waitFor(() => expect(idleCallbacks).toHaveLength(1));
    flushIdleCallback();
    await waitFor(() => expect(googleMocks.mapConstructor).toHaveBeenCalledTimes(1));
    googleMocks.mapSetCenter.mockClear();
    googleMocks.mapSetZoom.mockClear();
    rerender(
      <ProjectLocationMap
        apiKey="test-google-browser-key"
        pin={{ latitude: 14.612346, longitude: 121.012346 }}
        addressLabel="Quezon City"
      />,
    );

    await waitFor(() => expect(googleMocks.mapSetCenter).toHaveBeenCalledWith({ lat: 14.612346, lng: 121.012346 }));
    expect(googleMocks.mapSetZoom).toHaveBeenCalledWith(15);
    expect(screen.getByTestId("project-location-map-pin")).toBeInTheDocument();
  });
});
