import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectDetailsModal } from "@/components/workshop/ProjectDetailsModal";
import { updateProjectDetails } from "@/lib/projects/actions";
import { saveProjectLocation } from "@/lib/projects/location-actions";
import type { ProjectRow } from "@/lib/types/database";

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

vi.mock("@/lib/projects/actions", () => ({
  updateProjectDetails: vi.fn(async () => undefined),
}));

vi.mock("@/lib/projects/location-actions", () => ({
  saveProjectLocation: vi.fn(async () => ({ status: "success", message: "Project pin saved." })),
}));

vi.mock("@/lib/projects/location-action-state", () => ({
  initialProjectLocationActionState: { status: "idle", message: "" },
}));

vi.mock("@/lib/google-maps/loader", () => ({
  hasGoogleMapsApiKey: (apiKey: string | null | undefined) => Boolean(apiKey?.trim()),
  loadGoogleMapsApi: placesMocks.loadGoogleMapsApi,
}));

const PROJECT = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  name: "Lewis Residence",
  client_name: "Lewis Family",
  location: "Quezon City",
  project_code: "AE-LR-001",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  created_by: null,
} satisfies ProjectRow;

const updateProjectDetailsMock = vi.mocked(updateProjectDetails);
const saveProjectLocationMock = vi.mocked(saveProjectLocation);

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

describe("ProjectDetailsModal", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    cleanup();
    updateProjectDetailsMock.mockReset();
    updateProjectDetailsMock.mockResolvedValue(undefined);
    saveProjectLocationMock.mockReset();
    saveProjectLocationMock.mockResolvedValue({ status: "success", message: "Project pin saved." });
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
        makeSuggestion("Makati City, Metro Manila, Philippines", 14.5547, 121.0244),
      ],
    });
  });

  it("closes and refreshes only after a successful details save", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();

    render(<ProjectDetailsModal project={PROJECT} onClose={onClose} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText("Project name"));
    await user.type(screen.getByLabelText("Project name"), "Updated Residence");
    await user.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => {
      expect(updateProjectDetailsMock).toHaveBeenCalledTimes(1);
    });
    expect(updateProjectDetailsMock.mock.calls[0]?.[0].get("name")).toBe("Updated Residence");
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onSaved.mock.invocationCallOrder[0]);
  });

  it("saves all editable details fields and keeps manual location text as a project field", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();

    render(<ProjectDetailsModal project={PROJECT} onClose={onClose} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Client"), { target: { value: "Updated Client" } });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Manual Site Address" } });
    fireEvent.change(screen.getByLabelText("Project code"), { target: { value: "AE-MANUAL-1" } });
    await user.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => {
      expect(updateProjectDetailsMock).toHaveBeenCalledTimes(1);
    });
    const payload = updateProjectDetailsMock.mock.calls[0]?.[0];
    expect(payload?.get("clientName")).toBe("Updated Client");
    expect(payload?.get("location")).toBe("Manual Site Address");
    expect(payload?.get("projectCode")).toBe("AE-MANUAL-1");
    expect(payload?.get("currencyCode")).toBe("PHP");
    expect(saveProjectLocationMock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("offers existing clients in the details modal while preserving new typed clients", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();

    render(
      <ProjectDetailsModal
        project={PROJECT}
        onClose={onClose}
        onSaved={onSaved}
        clientOptions={["Lewis Family", "Acme Developers"]}
      />,
    );

    const clientInput = screen.getByRole("combobox", { name: "Client" });
    await user.click(clientInput);
    await user.clear(clientInput);
    await user.type(clientInput, "Acme");
    await user.click(screen.getByRole("option", { name: "Acme Developers" }));
    await user.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => {
      expect(updateProjectDetailsMock).toHaveBeenCalledTimes(1);
    });
    expect(updateProjectDetailsMock.mock.calls[0]?.[0].get("clientName")).toBe("Acme Developers");

    updateProjectDetailsMock.mockClear();
    onClose.mockClear();
    onSaved.mockClear();
    cleanup();

    render(
      <ProjectDetailsModal
        project={PROJECT}
        onClose={onClose}
        onSaved={onSaved}
        clientOptions={["Lewis Family", "Acme Developers"]}
      />,
    );

    const nextClientInput = screen.getByRole("combobox", { name: "Client" });
    await user.clear(nextClientInput);
    await user.type(nextClientInput, "New Client LLC");
    expect(screen.getByRole("option", { name: 'Create "New Client LLC"' })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => {
      expect(updateProjectDetailsMock).toHaveBeenCalledTimes(1);
    });
    expect(updateProjectDetailsMock.mock.calls[0]?.[0].get("clientName")).toBe("New Client LLC");
  });

  it("shows a Google map preview for a saved address before selecting a new place", () => {
    const projectWithSavedAddress = {
      ...PROJECT,
      location: "Rockwell Dr, Makati City, Metro Manila, Philippines",
    };

    render(
      <ProjectDetailsModal
        project={projectWithSavedAddress}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        googleMapsApiKey="test-google-browser-key"
      />,
    );

    const preview = screen.getByLabelText("Project location preview");
    const mapImage = preview.querySelector("img");
    expect(mapImage).toBeInTheDocument();
    expect(mapImage?.getAttribute("src")).toContain(
      "https://maps.googleapis.com/maps/api/staticmap",
    );
    const mapUrl = new URL(mapImage?.getAttribute("src") ?? "");
    expect(mapUrl.searchParams.get("center")).toBe(
      "Rockwell Dr, Makati City, Metro Manila, Philippines",
    );
    expect(preview).toHaveTextContent("Rockwell Dr, Makati City, Metro Manila, Philippines");
    expect(preview).toHaveTextContent("Choose a Google suggestion to pin this project.");
    expect(placesMocks.loadGoogleMapsApi).not.toHaveBeenCalled();
  });

  it("saves selected Google place coordinates after the details payload", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();

    render(<ProjectDetailsModal project={PROJECT} onClose={onClose} onSaved={onSaved} googleMapsApiKey="test-google-browser-key" />);

    const locationInput = screen.getByRole("combobox", { name: "Location" });
    fireEvent.focus(locationInput);
    fireEvent.change(locationInput, { target: { value: "Makati City" } });

    const suggestions = await screen.findByRole("listbox", { name: "Project address suggestions" });
    await within(suggestions).findByText("Makati City");
    fireEvent.keyDown(locationInput, { key: "Enter" });

    await waitFor(() => {
      expect(locationInput).toHaveValue("Makati City, Metro Manila, Philippines");
    });

    await user.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => {
      expect(updateProjectDetailsMock).toHaveBeenCalledTimes(1);
      expect(saveProjectLocationMock).toHaveBeenCalledTimes(1);
    });
    const locationPayload = saveProjectLocationMock.mock.calls[0]?.[1];
    expect(locationPayload?.get("projectId")).toBe(PROJECT.id);
    expect(locationPayload?.get("latitude")).toBe("14.5547");
    expect(locationPayload?.get("longitude")).toBe("121.0244");
    expect(locationPayload?.get("addressText")).toBe("Makati City, Metro Manila, Philippines");
    expect(locationPayload?.get("source")).toBe("geocoded");
    expect(locationPayload?.get("geocoderName")).toBe("google");
    expect(locationPayload?.get("syncProjectAddress")).toBe("1");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("keeps edited values visible and exposes the save error when the action fails", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();
    updateProjectDetailsMock.mockRejectedValueOnce(new Error("Database unavailable"));

    render(<ProjectDetailsModal project={PROJECT} onClose={onClose} onSaved={onSaved} />);

    const projectNameInput = screen.getByLabelText("Project name");
    await user.clear(projectNameInput);
    fireEvent.change(projectNameInput, { target: { value: "Unsaved Residence" } });
    await waitFor(() => {
      expect(projectNameInput).toHaveValue("Unsaved Residence");
    });
    await user.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => {
      expect(updateProjectDetailsMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Database unavailable");
    expect(projectNameInput).toHaveValue("Unsaved Residence");
    expect(screen.getByRole("button", { name: "Save details" })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
