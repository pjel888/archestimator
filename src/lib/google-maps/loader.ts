const GOOGLE_MAPS_SCRIPT_ID = "archestimator-google-maps-js";
const GOOGLE_MAPS_CALLBACK = "__archestimatorGoogleMapsInit";

type GoogleMapsImportLibrary = (libraryName: string) => Promise<unknown>;

export type GoogleMapsApi = {
  readonly importLibrary: GoogleMapsImportLibrary;
};

type GoogleMapsWindow = Window &
  typeof globalThis & {
    google?: {
      maps?: {
        importLibrary?: GoogleMapsImportLibrary;
      };
    };
    [GOOGLE_MAPS_CALLBACK]?: () => void;
  };

let googleMapsPromise: Promise<GoogleMapsApi> | null = null;

function readGoogleMapsApi(win: GoogleMapsWindow): GoogleMapsApi | null {
  const importLibrary = win.google?.maps?.importLibrary;
  return typeof importLibrary === "function" ? { importLibrary: importLibrary.bind(win.google?.maps) } : null;
}

export function hasGoogleMapsApiKey(apiKey: string | null | undefined): apiKey is string {
  return Boolean(apiKey?.trim());
}

export function loadGoogleMapsApi(apiKey: string): Promise<GoogleMapsApi> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  const win = window as GoogleMapsWindow;
  const loadedApi = readGoogleMapsApi(win);
  if (loadedApi) return Promise.resolve(loadedApi);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const resolveIfReady = () => {
      const api = readGoogleMapsApi(win);
      if (api) {
        resolve(api);
        return true;
      }
      return false;
    };

    if (resolveIfReady()) return;

    const previousCallback = win[GOOGLE_MAPS_CALLBACK];
    win[GOOGLE_MAPS_CALLBACK] = () => {
      previousCallback?.();
      if (!resolveIfReady()) reject(new Error("Google Maps loaded without importLibrary."));
    };

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
      return;
    }

    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      loading: "async",
      callback: GOOGLE_MAPS_CALLBACK,
    });
    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.append(script);
  });

  return googleMapsPromise;
}
