"use client";

import { useCallback, useEffect, useId, useReducer, useRef, useSyncExternalStore, useTransition, type KeyboardEvent } from "react";

import { ControlInput } from "@/components/ui/control-input";
import { DropdownPopupPanel, useDropdownPopup } from "@/components/ui/dropdown-popup";
import { scrollPopupItemIntoView } from "@/components/ui/dropdown-popup-utils";
import { hasGoogleMapsApiKey, loadGoogleMapsApi } from "@/lib/google-maps/loader";
import { cn } from "@/lib/ui/cn";

export type ProjectGooglePlaceSelection = {
  readonly addressText: string;
  readonly displayLabel: string | null;
  readonly providerPlaceId: string | null;
  readonly latitude: number;
  readonly longitude: number;
};

type ProjectAddressAutocompleteProps = {
  readonly apiKey: string;
  readonly name?: string;
  readonly value: string;
  readonly readOnly: boolean;
  readonly inputClassName?: string;
  readonly onValueChange: (value: string) => void;
  readonly onPlaceSelect: (selection: ProjectGooglePlaceSelection) => Promise<void> | void;
};

type GoogleLatLng = {
  lat?: (() => number) | number;
  lng?: (() => number) | number;
};

type GooglePlace = {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  location?: GoogleLatLng | null;
  fetchFields: (options: { readonly fields: readonly string[] }) => Promise<void>;
};

type GooglePlacePrediction = {
  text: { toString: () => string };
  toPlace: () => GooglePlace;
};

type GoogleAutocompleteSuggestion = {
  placePrediction?: GooglePlacePrediction | null;
};

type PlacesLibrary = {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: Record<string, unknown>) => Promise<{ suggestions?: GoogleAutocompleteSuggestion[] }>;
  };
};

type ProjectAddressAutocompleteState = {
  readonly suggestions: GoogleAutocompleteSuggestion[];
  readonly status: string;
  readonly activeIndex: number;
};

type ProjectAddressAutocompleteAction =
  | { readonly type: "replaceSuggestions"; readonly suggestions: GoogleAutocompleteSuggestion[] }
  | { readonly type: "suggestionsUnavailable"; readonly message: string }
  | { readonly type: "setStatus"; readonly status: string }
  | { readonly type: "setActiveIndex"; readonly activeIndex: number }
  | { readonly type: "moveActiveIndex"; readonly direction: 1 | -1 };

const PROJECT_ADDRESS_AUTOCOMPLETE_TYPES = ["street_address", "route", "locality", "sublocality", "neighborhood"] as const;
const EMPTY_PROJECT_ADDRESS_AUTOCOMPLETE_STATE: ProjectAddressAutocompleteState = {
  suggestions: [],
  status: "",
  activeIndex: -1,
};

function readCoordinatePart(value: (() => number) | number | undefined) {
  return typeof value === "function" ? value() : value;
}

function readPlacePin(place: GooglePlace) {
  const latitude = readCoordinatePart(place.location?.lat);
  const longitude = readCoordinatePart(place.location?.lng);
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

function suggestionLabel(suggestion: GoogleAutocompleteSuggestion) {
  return suggestion.placePrediction?.text.toString() ?? "";
}

function suggestionOptionId(listboxId: string, index: number) {
  return `${listboxId}-option-${index}`;
}

function splitSuggestionLabel(label: string) {
  const [primaryPart, ...secondaryParts] = label.split(",");
  return {
    primary: primaryPart?.trim() || label,
    secondary: secondaryParts.join(",").trim(),
  };
}

function projectAddressAutocompleteReducer(
  state: ProjectAddressAutocompleteState,
  action: ProjectAddressAutocompleteAction,
): ProjectAddressAutocompleteState {
  switch (action.type) {
    case "replaceSuggestions":
      return {
        ...state,
        suggestions: action.suggestions,
        activeIndex: action.suggestions.length > 0 ? 0 : -1,
      };
    case "suggestionsUnavailable":
      return {
        ...state,
        suggestions: [],
        activeIndex: -1,
        status: action.message,
      };
    case "setStatus":
      return {
        ...state,
        status: action.status,
      };
    case "setActiveIndex":
      return {
        ...state,
        activeIndex: action.activeIndex,
      };
    case "moveActiveIndex": {
      if (state.suggestions.length === 0) return state;
      const fallback = action.direction === 1 ? 0 : state.suggestions.length - 1;
      const nextActiveIndex = state.activeIndex < 0
        ? fallback
        : (state.activeIndex + action.direction + state.suggestions.length) % state.suggestions.length;
      return {
        ...state,
        activeIndex: nextActiveIndex,
      };
    }
    default:
      return state;
  }
}

function usePlacesLoadRequest(canUseGooglePlaces: boolean) {
  const shouldLoadPlacesRef = useRef(false);
  const listenersRef = useRef<Set<() => void> | null>(null);
  if (listenersRef.current === null) listenersRef.current = new Set();
  const subscribe = useCallback((listener: () => void) => {
    const listeners = listenersRef.current;
    if (!listeners) return () => undefined;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const getSnapshot = useCallback(() => shouldLoadPlacesRef.current, []);
  const shouldLoadPlaces = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const requestPlacesLoad = useCallback(() => {
    if (!canUseGooglePlaces || shouldLoadPlacesRef.current) return;
    shouldLoadPlacesRef.current = true;
    for (const listener of listenersRef.current ?? []) listener();
  }, [canUseGooglePlaces]);

  return { requestPlacesLoad, shouldLoadPlaces };
}

function usePlacesLibraryState() {
  const placesLibraryRef = useRef<PlacesLibrary | null>(null);
  const listenersRef = useRef<Set<() => void> | null>(null);
  if (listenersRef.current === null) listenersRef.current = new Set();
  const subscribe = useCallback((listener: () => void) => {
    const listeners = listenersRef.current;
    if (!listeners) return () => undefined;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const getSnapshot = useCallback(() => placesLibraryRef.current, []);
  const placesLibrary = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setPlacesLibrary = useCallback((nextLibrary: PlacesLibrary | null) => {
    if (placesLibraryRef.current === nextLibrary) return;
    placesLibraryRef.current = nextLibrary;
    for (const listener of listenersRef.current ?? []) listener();
  }, []);

  return { placesLibrary, setPlacesLibrary };
}

export function ProjectAddressAutocomplete({
  apiKey,
  name,
  value,
  readOnly,
  inputClassName,
  onValueChange,
  onPlaceSelect,
}: ProjectAddressAutocompleteProps) {
  const { placesLibrary, setPlacesLibrary } = usePlacesLibraryState();
  const [{ suggestions, status, activeIndex }, dispatchAutocomplete] = useReducer(
    projectAddressAutocompleteReducer,
    EMPTY_PROJECT_ADDRESS_AUTOCOMPLETE_STATE,
  );
  const [isPending, startTransition] = useTransition();
  const isFocusedRef = useRef(false);
  const sessionTokenRef = useRef<unknown>(null);
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const canUseGooglePlaces = !readOnly && hasGoogleMapsApiKey(apiKey);
  const {
    open,
    position,
    rootRef,
    triggerRef,
    panelRef,
    openPopup,
    close,
    closeAndFocusTrigger,
  } = useDropdownPopup({
    align: "start",
    side: "bottom",
    onClose: () => dispatchAutocomplete({ type: "setActiveIndex", activeIndex: -1 }),
  });
  const activeOptionId = open && activeIndex >= 0 ? suggestionOptionId(listboxId, activeIndex) : undefined;
  const { requestPlacesLoad, shouldLoadPlaces } = usePlacesLoadRequest(canUseGooglePlaces);

  useEffect(() => {
    if (!canUseGooglePlaces || !shouldLoadPlaces) return;
    let cancelled = false;
    loadGoogleMapsApi(apiKey)
      .then((api) => api.importLibrary("places"))
      .then((library) => {
        if (cancelled) return;
        const nextLibrary = library as PlacesLibrary;
        sessionTokenRef.current = new nextLibrary.AutocompleteSessionToken();
        setPlacesLibrary(nextLibrary);
      })
      .catch(() => {
        if (!cancelled) dispatchAutocomplete({ type: "setStatus", status: "Google address search unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, canUseGooglePlaces, setPlacesLibrary, shouldLoadPlaces]);

  const replaceSuggestions = useCallback(
    (nextSuggestions: GoogleAutocompleteSuggestion[]) => {
      dispatchAutocomplete({ type: "replaceSuggestions", suggestions: nextSuggestions });
      if (isFocusedRef.current && nextSuggestions.length > 0) {
        openPopup();
        return;
      }
      close("manual");
    },
    [close, openPopup],
  );

  useEffect(() => {
    if (!placesLibrary || readOnly || value.trim().length < 3) {
      queueMicrotask(() => replaceSuggestions([]));
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
      }

      placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: value,
        includedPrimaryTypes: PROJECT_ADDRESS_AUTOCOMPLETE_TYPES,
        sessionToken: sessionTokenRef.current,
      })
        .then((result) => {
          if (!cancelled) replaceSuggestions((result.suggestions ?? []).filter((suggestion) => Boolean(suggestion.placePrediction)));
        })
        .catch(() => {
          if (!cancelled) dispatchAutocomplete({ type: "suggestionsUnavailable", message: "Google suggestions unavailable" });
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [placesLibrary, readOnly, replaceSuggestions, value]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const panel = panelRef.current;
    const item = panel?.querySelector<HTMLElement>(`[data-address-suggestion-index="${activeIndex}"]`);
    if (panel && item) scrollPopupItemIntoView(panel, item);
  }, [activeIndex, open, panelRef, position]);

  function handleSuggestionSelect(suggestion: GoogleAutocompleteSuggestion) {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    close("select");
    startTransition(async () => {
      try {
        dispatchAutocomplete({ type: "setStatus", status: "Saving Google place" });
        const place = prediction.toPlace();
        await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] });
        const pin = readPlacePin(place);
        const addressText = place.formattedAddress ?? place.displayName ?? prediction.text.toString();
        if (!pin) {
          dispatchAutocomplete({ type: "setStatus", status: "Google place did not include coordinates" });
          return;
        }

        onValueChange(addressText);
        replaceSuggestions([]);
        sessionTokenRef.current = placesLibrary ? new placesLibrary.AutocompleteSessionToken() : null;
        await onPlaceSelect({
          addressText,
          displayLabel: place.displayName ?? null,
          providerPlaceId: place.id ?? null,
          latitude: pin.latitude,
          longitude: pin.longitude,
        });
        dispatchAutocomplete({ type: "setStatus", status: "" });
      } catch {
        dispatchAutocomplete({ type: "setStatus", status: "Google place could not be saved" });
      }
    });
  }

  function moveActiveIndex(direction: 1 | -1) {
    if (suggestions.length === 0) return;
    dispatchAutocomplete({ type: "moveActiveIndex", direction });
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!canUseGooglePlaces) return;
    requestPlacesLoad();

    if (event.key === "Escape" && (open || suggestions.length > 0)) {
      event.preventDefault();
      replaceSuggestions([]);
      closeAndFocusTrigger("escape");
      return;
    }

    if (suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openPopup();
      moveActiveIndex(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openPopup();
      moveActiveIndex(-1);
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      handleSuggestionSelect(suggestions[activeIndex]);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <ControlInput
        ref={(node) => {
          triggerRef.current = node;
        }}
        id={inputId}
        name={name}
        value={value}
        role={canUseGooglePlaces ? "combobox" : undefined}
        autoComplete="off"
        onFocus={() => {
          requestPlacesLoad();
          isFocusedRef.current = true;
          if (suggestions.length > 0) openPopup();
        }}
        onBlur={(event) => {
          const relatedTarget = event.relatedTarget as Node | null;
          if (relatedTarget && panelRef.current?.contains(relatedTarget)) return;
          isFocusedRef.current = false;
          close("manual");
        }}
        onClick={() => {
          requestPlacesLoad();
          if (suggestions.length > 0) openPopup();
        }}
        onKeyDown={handleInputKeyDown}
        onChange={(event) => {
          requestPlacesLoad();
          dispatchAutocomplete({ type: "setStatus", status: "" });
          onValueChange(event.currentTarget.value);
        }}
        placeholder="Search or type project address"
        readOnly={readOnly}
        aria-readonly={readOnly ? "true" : undefined}
        aria-autocomplete={canUseGooglePlaces ? "list" : undefined}
        aria-expanded={canUseGooglePlaces ? open && suggestions.length > 0 : undefined}
        aria-controls={canUseGooglePlaces ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        className={cn(
          "h-8 w-full px-2 text-[10px] font-medium text-secondary",
          inputClassName,
          readOnly ? "cursor-default bg-transparent hover:border-transparent hover:bg-transparent focus:border-transparent focus:bg-transparent focus:ring-0" : "",
        )}
      />
      {suggestions.length > 0 ? (
        <DropdownPopupPanel
          id={listboxId}
          role="listbox"
          aria-label="Project address suggestions"
          data-testid="project-address-suggestions"
          open={open}
          position={position}
          panelRef={panelRef}
          className="w-[min(28rem,calc(100vw-1rem))] border-white/70 bg-white/92 p-1.5 shadow-[0_14px_36px_rgba(17,17,17,0.13)] backdrop-blur-[10px]"
        >
          {suggestions.map((suggestion, index) => {
            const label = suggestionLabel(suggestion);
            const { primary, secondary } = splitSuggestionLabel(label);
            const isActive = index === activeIndex;
            return (
              <button
                key={label}
                id={suggestionOptionId(listboxId, index)}
                data-address-suggestion-index={index}
                type="button"
                role="option"
                aria-selected={isActive}
                tabIndex={-1}
                className={cn(
                  "block min-h-9 w-full rounded-xs px-2 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  isActive ? "bg-accentSoft" : "hover:bg-surfaceMuted",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => dispatchAutocomplete({ type: "setActiveIndex", activeIndex: index })}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <span className="block truncate text-[10px] font-medium leading-4 text-ink">{primary}</span>
                {secondary ? (
                  <span className="block truncate text-[9px] font-normal leading-3 text-tertiary">{secondary}</span>
                ) : null}
              </button>
            );
          })}
        </DropdownPopupPanel>
      ) : null}
      <output className="sr-only" aria-live="polite">
        {isPending ? "Saving Google place" : status}
      </output>
    </div>
  );
}
