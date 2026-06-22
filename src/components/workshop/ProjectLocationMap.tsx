"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { hasGoogleMapsApiKey, loadGoogleMapsApi } from "@/lib/google-maps/loader";
import { PROJECT_LOCATION_MAP_STYLES } from "@/lib/google-maps/project-location-map-style";

export type ProjectLocationPin = {
  readonly latitude: number;
  readonly longitude: number;
};

type ProjectLocationMapProps = {
  readonly apiKey: string;
  /**
   * Cloud map IDs cannot be mixed with inline styles. Keep accepting this prop
   * so the dashboard call site can stay stable while this component owns style.
   */
  readonly mapId?: string | null;
  readonly pin: ProjectLocationPin | null;
  readonly addressLabel: string;
  readonly overlaySummary?: ReactNode;
  readonly rightRail?: ReactNode;
  readonly lowerLeftSummary?: ReactNode;
  readonly lowerLeftDetail?: ReactNode;
};

type GoogleLatLngLiteral = {
  readonly lat: number;
  readonly lng: number;
};

type GoogleMapInstance = {
  setCenter: (position: GoogleLatLngLiteral) => void;
  setZoom: (zoom: number) => void;
};

type MapsLibrary = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
};

type MapStatus = "idle" | "ready" | "fallback";

const DEFAULT_CENTER: GoogleLatLngLiteral = { lat: 14.599512, lng: 120.984222 };
const PROJECT_LOCATION_FROSTED_PANEL_CLASS =
  "border-l border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),rgba(255,255,255,0.16)_48%,rgba(255,255,255,0.28))] shadow-[inset_1px_0_0_rgba(255,255,255,0.52),inset_0_1px_0_rgba(255,255,255,0.34),0_18px_56px_-48px_rgba(17,17,17,0.46)] ring-1 ring-black/[0.018] backdrop-blur-[10px] backdrop-saturate-125";

function toMapPosition(pin: ProjectLocationPin | null): GoogleLatLngLiteral {
  return pin ? { lat: pin.latitude, lng: pin.longitude } : DEFAULT_CENTER;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

export function ProjectLocationMap({
  apiKey,
  pin,
  addressLabel,
  overlaySummary,
  rightRail,
  lowerLeftSummary,
  lowerLeftDetail,
}: ProjectLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const [status, setStatus] = useState<MapStatus>("idle");
  const [fallbackReason, setFallbackReason] = useState("Google Maps loading");
  const hasMapsApiKey = hasGoogleMapsApiKey(apiKey);
  const renderedStatus: MapStatus = hasMapsApiKey ? status : "fallback";
  const renderedFallbackReason = hasMapsApiKey ? fallbackReason : "Google Maps API key missing";
  const center = useMemo(() => toMapPosition(pin), [pin]);
  const coordinateLabel = pin ? `${formatCoordinate(pin.latitude)}, ${formatCoordinate(pin.longitude)}` : null;

  useEffect(() => {
    if (!hasMapsApiKey) return;

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setStatus("idle");
        setFallbackReason("Google Maps loading");
      }
    });

    loadGoogleMapsApi(apiKey)
      .then((api) => api.importLibrary("maps"))
      .then((library) => {
        if (cancelled || !containerRef.current) return;
        const { Map } = library as MapsLibrary;
        const map = new Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 11,
          disableDefaultUI: true,
          styles: PROJECT_LOCATION_MAP_STYLES,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          draggable: false,
          gestureHandling: "none",
          disableDoubleClickZoom: true,
          keyboardShortcuts: false,
        });
        mapRef.current = map;

        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("fallback");
          setFallbackReason("Google Maps failed to load");
        }
      });

    return () => {
      cancelled = true;
      mapRef.current = null;
    };
  }, [apiKey, hasMapsApiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    map.setCenter(center);
    map.setZoom(pin ? 15 : 11);
  }, [center, pin, status]);

  if (renderedStatus === "fallback") {
    return (
      <div className="flex h-full min-h-[320px] flex-col justify-center rounded-xs border border-dashed border-[color:var(--glass-border)] bg-white/40 p-4 text-center">
        <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">{renderedFallbackReason}</p>
        <p className="mx-auto mt-2 max-w-sm text-[10px] leading-4 text-secondary">
          The saved address remains editable. Google map display will return when the browser key and provider are available.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[320px] overflow-hidden rounded-xs border border-[color:var(--glass-border)] bg-white/45">
      <div
        ref={containerRef}
        data-testid="project-location-google-map"
        role="application"
        aria-label={pin ? `Google map pin at ${addressLabel || coordinateLabel}` : "Google map for project location"}
        className="h-full min-h-[320px] w-full"
      />
      <div
        data-testid="project-location-overlay-grid"
        className="pointer-events-none absolute inset-0 z-10 grid grid-cols-16 grid-rows-8 gap-2 p-2"
      >
        <div
          data-testid="project-location-frosted-upper-panel"
          aria-hidden={overlaySummary ? undefined : "true"}
          className={`col-span-5 col-start-1 row-span-4 row-start-1 overflow-hidden p-2 ${overlaySummary ? "pointer-events-auto" : ""} ${PROJECT_LOCATION_FROSTED_PANEL_CLASS}`}
        >
          {overlaySummary}
        </div>
        <div
          data-testid="project-location-frosted-panel"
          aria-hidden={rightRail ? undefined : "true"}
          className={`col-span-4 col-start-13 row-span-8 row-start-1 overflow-hidden p-2 ${rightRail ? "pointer-events-auto" : ""} ${PROJECT_LOCATION_FROSTED_PANEL_CLASS}`}
        >
          {rightRail}
        </div>
        <div
          data-testid="project-location-frosted-lower-left-panel"
          aria-hidden={lowerLeftSummary ? undefined : "true"}
          className={`col-span-5 col-start-1 row-span-1 row-start-5 overflow-hidden p-2 ${PROJECT_LOCATION_FROSTED_PANEL_CLASS}`}
        >
          {lowerLeftSummary}
        </div>
        <div
          data-testid="project-location-frosted-lower-left-fill-panel"
          aria-hidden={lowerLeftDetail ? undefined : "true"}
          className={`col-span-5 col-start-1 row-span-3 row-start-6 overflow-hidden p-2 ${PROJECT_LOCATION_FROSTED_PANEL_CLASS}`}
        >
          {lowerLeftDetail}
        </div>
      </div>
      {pin ? (
        <div
          data-testid="project-location-map-pin"
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-7 w-7 -translate-x-1/2 -translate-y-full rounded-xs border-2 border-white bg-[color:var(--brand-orange)] shadow-[0_10px_24px_rgba(0,0,0,0.22)] after:absolute after:left-1/2 after:top-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-xs after:bg-white"
        />
      ) : null}
      {!pin ? (
        <div className="pointer-events-none absolute bottom-2 left-2 max-w-[260px] rounded-xs border border-[color:var(--glass-border)] bg-white/80 px-2 py-1.5 shadow-sm backdrop-blur">
          <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">No exact pin saved</p>
          <p className="mt-1 text-[10px] leading-4 text-secondary">Choose a Google suggestion from the address field to position this map.</p>
        </div>
      ) : null}
    </div>
  );
}
