"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";

import type { ProjectLocationMapConfig } from "@/lib/projects/location-map-config";

type ProjectLocationMapProps = {
  readonly latitude: number;
  readonly longitude: number;
  readonly addressLabel: string;
  readonly config: ProjectLocationMapConfig;
  readonly onPinChange: (pin: { readonly latitude: number; readonly longitude: number }) => void;
};

type MapStatus = "idle" | "ready" | "fallback";

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function hasWebGlSupport() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!("WebGLRenderingContext" in window)) return false;

  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
}

function normalizeLngLat(value: { readonly lng?: number; readonly lon?: number; readonly lat?: number }) {
  const longitude = typeof value.lng === "number" ? value.lng : value.lon;
  if (typeof longitude !== "number" || typeof value.lat !== "number") return null;
  return {
    latitude: Number(value.lat.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

export function ProjectLocationMap({
  latitude,
  longitude,
  addressLabel,
  config,
  onPinChange,
}: ProjectLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<MapStatus>("idle");
  const [fallbackReason, setFallbackReason] = useState(config.disabledReason ?? "Map unavailable");
  const coordinateLabel = `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;

  useEffect(() => {
    if (!config.enabled || !config.styleUrl) {
      setStatus("fallback");
      setFallbackReason(config.disabledReason ?? "Map provider disabled");
      return;
    }

    if (!hasWebGlSupport()) {
      setStatus("fallback");
      setFallbackReason("Map unavailable without WebGL");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const styleUrl = config.styleUrl;
    let map: MapLibreMap | null = null;
    let marker: MapLibreMarker | null = null;

    setStatus("idle");
    setFallbackReason("Map loading");

    import("maplibre-gl")
      .then((module) => {
        if (cancelled || !containerRef.current) return;
        const maplibre = module;

        const nextMap = new maplibre.Map({
          container,
          style: styleUrl,
          center: [longitude, latitude],
          zoom: 15,
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        map = nextMap;

        nextMap.addControl(new maplibre.NavigationControl({ visualizePitch: false }), "top-right");

        const nextMarker = new maplibre.Marker({ draggable: true })
          .setLngLat([longitude, latitude])
          .addTo(nextMap);
        marker = nextMarker;

        nextMarker.on("dragend", () => {
          const nextPin = normalizeLngLat(nextMarker.getLngLat());
          if (nextPin) onPinChange(nextPin);
        });

        nextMap.on("click", (event) => {
          const nextPin = normalizeLngLat(event.lngLat);
          if (!nextPin) return;
          nextMarker.setLngLat({ lng: nextPin.longitude, lat: nextPin.latitude });
          onPinChange(nextPin);
        });

        nextMap.on("error", () => {
          if (!cancelled) {
            setStatus("fallback");
            setFallbackReason("Map tiles unavailable");
          }
        });

        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("fallback");
          setFallbackReason("Map provider failed to load");
        }
      });

    return () => {
      cancelled = true;
      marker?.remove?.();
      map?.remove();
    };
  }, [config.disabledReason, config.enabled, config.styleUrl, latitude, longitude, onPinChange]);

  if (!config.enabled || !config.styleUrl || status === "fallback") {
    return (
      <div className="rounded-xs border border-dashed border-[color:var(--glass-border)] bg-white/40 p-2">
        <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
          {fallbackReason}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-secondary">
          Text coordinates remain available at {coordinateLabel}. Exact coordinates stay private to project editors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        ref={containerRef}
        data-testid="project-location-map"
        role="application"
        aria-label={`Project map pin at ${addressLabel || coordinateLabel}`}
        className="h-44 min-h-44 overflow-hidden rounded-xs border border-[color:var(--glass-border)] bg-white/45"
      />
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-1 text-[8px] leading-3 text-tertiary">
        <span>Pin: {coordinateLabel}</span>
        <span aria-label="Map attribution">{config.attribution}</span>
      </div>
    </div>
  );
}
