import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectAddressAutocomplete, type ProjectGooglePlaceSelection } from "@/components/workshop/ProjectAddressAutocomplete";

const placesMocks = vi.hoisted(() => {
  const fetchFields = vi.fn(async () => undefined);
  const fetchAutocompleteSuggestions = vi.fn();
  const importLibrary = vi.fn();
  const loadGoogleMapsApi = vi.fn();

  class MockAutocompleteSessionToken {}

  return {
    fetchFields,
    fetchAutocompleteSuggestions,
    importLibrary,
    loadGoogleMapsApi,
    MockAutocompleteSessionToken,
  };
});

vi.mock("@/lib/google-maps/loader", () => ({
  hasGoogleMapsApiKey: (apiKey: string | null | undefined) => Boolean(apiKey?.trim()),
  loadGoogleMapsApi: placesMocks.loadGoogleMapsApi,
}));

function makeSuggestion(label: string, latitude: number, longitude: number) {
  return {
    placePrediction: {
      text: { toString: () => label },
      toPlace: () => ({
        id: `place-${latitude}`,
        displayName: label.split(",")[0],
        formattedAddress: label,
        location: { lat: () => latitude, lng: () => longitude },
        fetchFields: placesMocks.fetchFields,
      }),
    },
  };
}

function AddressHarness({
  onPlaceSelect,
}: {
  readonly onPlaceSelect: (selection: ProjectGooglePlaceSelection) => Promise<void> | void;
}) {
  const [value, setValue] = useState("");

  return (
    <ProjectAddressAutocomplete
      apiKey="test-google-browser-key"
      name="location"
      value={value}
      readOnly={false}
      inputClassName="bg-transparent hover:bg-white/35 focus:bg-white/85"
      onValueChange={setValue}
      onPlaceSelect={onPlaceSelect}
    />
  );
}

describe("ProjectAddressAutocomplete", () => {
  beforeEach(() => {
    placesMocks.fetchFields.mockClear();
    placesMocks.fetchAutocompleteSuggestions.mockReset();
    placesMocks.importLibrary.mockReset();
    placesMocks.loadGoogleMapsApi.mockReset();
    placesMocks.importLibrary.mockImplementation(async (libraryName: string) => {
      if (libraryName === "places") {
        return {
          AutocompleteSessionToken: placesMocks.MockAutocompleteSessionToken,
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: placesMocks.fetchAutocompleteSuggestions,
          },
        };
      }
      throw new Error(`Unexpected Google library ${libraryName}`);
    });
    placesMocks.loadGoogleMapsApi.mockResolvedValue({ importLibrary: placesMocks.importLibrary });
    placesMocks.fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        makeSuggestion("Quezon City, Metro Manila, Philippines", 14.599512, 120.984222),
        makeSuggestion("Quezon Avenue, Quezon City, Metro Manila, Philippines", 14.6421, 121.036),
      ],
    });
  });

  it("renders Google suggestions in the shared fixed popup layer and selects by keyboard", async () => {
    const onPlaceSelect = vi.fn(async () => undefined);
    render(<AddressHarness onPlaceSelect={onPlaceSelect} />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveClass("bg-transparent", "hover:bg-white/35", "focus:bg-white/85");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Quezon City" } });

    const listbox = await screen.findByRole("listbox", { name: "Project address suggestions" });
    expect(placesMocks.fetchAutocompleteSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        input: "Quezon City",
        includedPrimaryTypes: ["street_address", "route", "locality", "sublocality", "neighborhood"],
      }),
    );
    expect(listbox).toHaveClass("fixed", "z-[1050]");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(screen.getByText("Quezon City")).toBeInTheDocument();
    expect(screen.getByText("Metro Manila, Philippines")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onPlaceSelect).toHaveBeenCalledWith({
        addressText: "Quezon City, Metro Manila, Philippines",
        displayLabel: "Quezon City",
        providerPlaceId: "place-14.599512",
        latitude: 14.599512,
        longitude: 120.984222,
      });
    });
    expect(input).toHaveValue("Quezon City, Metro Manila, Philippines");
    expect(screen.queryByRole("listbox", { name: "Project address suggestions" })).not.toBeInTheDocument();
  });
});
