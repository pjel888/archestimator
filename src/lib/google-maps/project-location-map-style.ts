type GoogleMapStyle = {
  readonly featureType?: string;
  readonly elementType?: string;
  readonly stylers: ReadonlyArray<Record<string, boolean | number | string>>;
};

export const PROJECT_LOCATION_MAP_STYLES: readonly GoogleMapStyle[] = [
  { stylers: [{ saturation: -100 }] },
  { elementType: "geometry", stylers: [{ color: "#f9f9f9" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a7a7a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9a9a9a" }] },
  { featureType: "administrative.province", elementType: "labels.text.fill", stylers: [{ color: "#9a9a9a" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b6b6b" }, { weight: 1.15 }],
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7f7f7f" }, { weight: 1 }],
  },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f8f8f8" }] },
  { featureType: "landscape", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.government", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "off" }] },
  { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#f4f4f4" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#f0f0f0" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7a7a7a" }] },
  { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#f9f9f9" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dcebf2" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
] as const;

function toStaticMapStylerValue(value: boolean | number | string) {
  if (typeof value !== "string") return String(value);
  if (value.startsWith("#")) return `0x${value.slice(1)}`;
  return value;
}

const PROJECT_LOCATION_STATIC_MAP_STYLE_PARAMS = PROJECT_LOCATION_MAP_STYLES.map((style) => {
  const parts: string[] = [];
  if (style.featureType) parts.push(`feature:${style.featureType}`);
  if (style.elementType) parts.push(`element:${style.elementType}`);
  for (const styler of style.stylers) {
    for (const [key, value] of Object.entries(styler)) {
      parts.push(`${key}:${toStaticMapStylerValue(value)}`);
    }
  }
  return parts.join("|");
});

export function getProjectLocationStaticMapStyleParams() {
  return PROJECT_LOCATION_STATIC_MAP_STYLE_PARAMS;
}
