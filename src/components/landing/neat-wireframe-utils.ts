const NEAT_STATIC_FALLBACK_QUERY = "(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 767px)";

export function shouldUseStaticNeatFallback() {
  if (typeof window === "undefined") return true;
  if (typeof window.matchMedia !== "function") return false;

  return window.matchMedia(NEAT_STATIC_FALLBACK_QUERY).matches;
}
