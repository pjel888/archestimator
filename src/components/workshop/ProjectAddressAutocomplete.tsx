"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";

import { ControlInput } from "@/components/ui/control-input";
import { DropdownPopupPanel, scrollPopupItemIntoView, useDropdownPopup } from "@/components/ui/dropdown-popup";
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

const PROJECT_ADDRESS_AUTOCOMPLETE_TYPES = ["street_address", "route", "locality", "sublocality", "neighborhood"] as const;

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

export function ProjectAddressAutocomplete({
  apiKey,
  name,
  value,
  readOnly,
  inputClassName,
  onValueChange,
  onPlaceSelect,
}: ProjectAddressAutocompleteProps) {
  const [placesLibrary, setPlacesLibrary] = useState<PlacesLibrary | null>(null);
  const [suggestions, setSuggestions] = useState<GoogleAutocompleteSuggestion[]>([]);
  const [status, setStatus] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [shouldLoadPlaces, setShouldLoadPlaces] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
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
    onClose: () => setActiveIndex(-1),
  });
  const activeOptionId = open && activeIndex >= 0 ? suggestionOptionId(listboxId, activeIndex) : undefined;
  const requestPlacesLoad = useCallback(() => {
    setShouldLoadPlaces(true);
  }, []);

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
        if (!cancelled) setStatus("Google address search unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, canUseGooglePlaces, shouldLoadPlaces]);

  useEffect(() => {
    if (!placesLibrary || readOnly || value.trim().length < 3) {
      queueMicrotask(() => setSuggestions([]));
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
          if (!cancelled) setSuggestions((result.suggestions ?? []).filter((suggestion) => Boolean(suggestion.placePrediction)));
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setStatus("Google suggestions unavailable");
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [placesLibrary, readOnly, value]);

  useEffect(() => {
    queueMicrotask(() => setActiveIndex(suggestions.length > 0 ? 0 : -1));
  }, [suggestions]);

  useEffect(() => {
    if (isFocused && suggestions.length > 0) {
      openPopup();
      return;
    }

    close("manual");
  }, [close, isFocused, openPopup, suggestions.length]);

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
        setStatus("Saving Google place");
        const place = prediction.toPlace();
        await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] });
        const pin = readPlacePin(place);
        const addressText = place.formattedAddress ?? place.displayName ?? prediction.text.toString();
        if (!pin) {
          setStatus("Google place did not include coordinates");
          return;
        }

        onValueChange(addressText);
        setSuggestions([]);
        sessionTokenRef.current = placesLibrary ? new placesLibrary.AutocompleteSessionToken() : null;
        await onPlaceSelect({
          addressText,
          displayLabel: place.displayName ?? null,
          providerPlaceId: place.id ?? null,
          latitude: pin.latitude,
          longitude: pin.longitude,
        });
        setStatus("");
      } catch {
        setStatus("Google place could not be saved");
      }
    });
  }

  function moveActiveIndex(direction: 1 | -1) {
    if (suggestions.length === 0) return;
    setActiveIndex((current) => {
      const fallback = direction === 1 ? 0 : suggestions.length - 1;
      if (current < 0) return fallback;
      return (current + direction + suggestions.length) % suggestions.length;
    });
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!canUseGooglePlaces) return;
    requestPlacesLoad();

    if (event.key === "Escape" && (open || suggestions.length > 0)) {
      event.preventDefault();
      setSuggestions([]);
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
          setIsFocused(true);
          if (suggestions.length > 0) openPopup();
        }}
        onBlur={(event) => {
          const relatedTarget = event.relatedTarget as Node | null;
          if (relatedTarget && panelRef.current?.contains(relatedTarget)) return;
          setIsFocused(false);
        }}
        onClick={() => {
          requestPlacesLoad();
          if (suggestions.length > 0) openPopup();
        }}
        onKeyDown={handleInputKeyDown}
        onChange={(event) => {
          requestPlacesLoad();
          setStatus("");
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
                key={`${label}-${index}`}
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
                onMouseEnter={() => setActiveIndex(index)}
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
      <span className="sr-only" role="status" aria-live="polite">
        {isPending ? "Saving Google place" : status}
      </span>
    </div>
  );
}
