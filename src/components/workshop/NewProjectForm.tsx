"use client";

import { useEffect, useId, useReducer, useState, type FormEvent } from "react";
import { useNavigationRouter } from "@/hooks/use-navigation-router";

import { createEstimateSheetDraft } from "@/lib/estimates/actions";
import {
  createProjectRecord,
  updateProjectImageMetadata,
} from "@/lib/projects/actions";
import { initialProjectLocationActionState } from "@/lib/projects/location-action-state";
import { saveProjectLocation } from "@/lib/projects/location-actions";
import { generateProjectCode } from "@/lib/projects/project-code";
import {
  ALLOWED_PROJECT_IMAGE_TYPES,
  formatUploadBytes,
  MAX_PROJECT_IMAGE_BYTES,
  removeProjectImageUpload,
  uploadProjectImage,
  type ProjectImageDraft,
} from "@/components/workshop/project-image-client";
import {
  CreateProjectFooter,
  CreateProjectHeader,
  ProjectFields,
  ProjectLocationPreview,
  type CreateProjectStatus,
} from "./NewProjectFormSections";
import { ProjectImagePanel } from "./NewProjectImagePanel";
import type { ProjectGooglePlaceSelection } from "./ProjectAddressAutocomplete";
import type { ProjectLocationPin } from "./ProjectLocationMap";
import type { ProjectCardSetupStatus } from "./LiveProjectCard";
import type { Tables } from "@/lib/supabase/types";

type NewProjectFormProps = {
  onSuccess?: () => void;
  onOptimisticProjectChange?: (snapshot: NewProjectOptimisticSnapshot) => void;
  googleMapsApiKey?: string;
  googleMapsMapId?: string | null;
  clientOptions?: string[];
  showHeader?: boolean;
};

export type NewProjectOptimisticSnapshot = {
  clientId: string;
  project: Tables<"projects">;
  setupStatus: ProjectCardSetupStatus | null;
  setupNavigationDisabled: boolean;
  remove?: boolean;
  errorMessage?: string;
};

function createProjectClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readDraftText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function createOptimisticProject(formData: FormData, clientId: string, createdAt: string): Tables<"projects"> {
  return {
    id: `pending-project-${clientId}`,
    workspace_id: "pending-workspace",
    created_by: null,
    name: String(formData.get("name") ?? "").trim(),
    client_name: readDraftText(formData, "clientName"),
    location: readDraftText(formData, "location"),
    project_code: readDraftText(formData, "projectCode"),
    currency_code: String(formData.get("currencyCode") ?? "PHP").trim().toUpperCase() || "PHP",
    metadata: {},
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function applyUploadedProjectImage(project: Tables<"projects">, image: ProjectImageDraft): Tables<"projects"> {
  return {
    ...project,
    metadata: {
      ...(project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata) ? project.metadata : {}),
      projectImageUrl: image.url,
      ...(image.thumbnailUrl ? { projectImageThumbnailUrl: image.thumbnailUrl } : {}),
      ...(image.bucket ? { projectImageBucket: image.bucket } : {}),
      ...(image.path ? { projectImagePath: image.path } : {}),
      ...(image.thumbnailPath ? { projectImageThumbnailPath: image.thumbnailPath } : {}),
    },
  };
}

function locationFormData(projectId: string, selection: ProjectGooglePlaceSelection) {
  const formData = new FormData();
  formData.set("projectId", projectId);
  formData.set("latitude", String(selection.latitude));
  formData.set("longitude", String(selection.longitude));
  formData.set("addressText", selection.addressText);
  formData.set("displayLabel", selection.displayLabel ?? "");
  formData.set("source", "geocoded");
  formData.set("geocoderName", "google");
  formData.set("providerPlaceId", selection.providerPlaceId ?? "");
  formData.set("syncProjectAddress", "1");
  return formData;
}

// Related form-field state grouped so one logical update (e.g. picking a
// location) dispatches a single transition instead of fanning out across many
// independent useState calls. selectedPlace lives here too: it is read only in
// the submit handler, never in render, so keeping it in the reducer (rather
// than useState) avoids a pointless re-render every time it changes.
type NewProjectFormFields = {
  clientName: string;
  currencyCode: string;
  currencySearchValue: string;
  locationValue: string;
  selectedPlace: ProjectGooglePlaceSelection | null;
  locationPin: ProjectLocationPin | null;
  selectedImage: File | null;
  previewUrl: string;
};

type NewProjectFormFieldsAction =
  | { type: "clientNameChanged"; value: string }
  | { type: "currencyChanged"; code: string; searchValue: string }
  | { type: "locationTextChanged"; value: string }
  | { type: "locationPlaceSelected"; selection: ProjectGooglePlaceSelection }
  | { type: "imageChosen"; image: File; previewUrl: string }
  | { type: "imageCleared"; previewUrl: string };

const INITIAL_PROJECT_FORM_FIELDS: NewProjectFormFields = {
  clientName: "",
  currencyCode: "PHP",
  currencySearchValue: "PHP",
  locationValue: "",
  selectedPlace: null,
  locationPin: null,
  selectedImage: null,
  previewUrl: "",
};

function projectFormFieldsReducer(state: NewProjectFormFields, action: NewProjectFormFieldsAction): NewProjectFormFields {
  switch (action.type) {
    case "clientNameChanged":
      return { ...state, clientName: action.value };
    case "currencyChanged":
      return { ...state, currencyCode: action.code, currencySearchValue: action.searchValue };
    case "locationTextChanged": {
      if (state.locationValue === action.value) return state;
      // Typing a new address invalidates any previously chosen place + pin.
      const clearPlace = !state.selectedPlace || state.selectedPlace.addressText !== action.value;
      return {
        ...state,
        locationValue: action.value,
        selectedPlace: clearPlace ? null : state.selectedPlace,
        locationPin: clearPlace ? null : state.locationPin,
      };
    }
    case "locationPlaceSelected":
      return {
        ...state,
        selectedPlace: action.selection,
        locationPin: { latitude: action.selection.latitude, longitude: action.selection.longitude },
      };
    case "imageChosen":
      return { ...state, selectedImage: action.image, previewUrl: action.previewUrl };
    case "imageCleared":
      return { ...state, selectedImage: null, previewUrl: action.previewUrl };
    default:
      return state;
  }
}

export function NewProjectForm({
  onSuccess,
  onOptimisticProjectChange,
  googleMapsApiKey = "",
  googleMapsMapId = null,
  clientOptions = [],
  showHeader = true,
}: NewProjectFormProps) {
  const router = useNavigationRouter();
  const imageInputId = useId();
  const statusId = useId();
  const [projectCode, setProjectCode] = useState(generateProjectCode);
  const [fields, dispatchFields] = useReducer(projectFormFieldsReducer, INITIAL_PROJECT_FORM_FIELDS);
  const { clientName, currencyCode, currencySearchValue, locationValue, selectedPlace, locationPin, selectedImage, previewUrl } = fields;
  const [status, setStatus] = useState<CreateProjectStatus>({ state: "idle" });
  const isProjectNameInvalid =
    status.state === "error" && status.field === "projectName";
  const isSubmitting =
    status.state === "creating" ||
    status.state === "uploading" ||
    status.state === "saving";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseProjectImage(file: File) {
    if (file.type && !ALLOWED_PROJECT_IMAGE_TYPES.has(file.type)) {
      setStatus({
        state: "error",
        message: "Use a JPG, PNG, WebP, or AVIF image.",
      });
      return;
    }
    if (file.size > MAX_PROJECT_IMAGE_BYTES) {
      setStatus({ state: "error", message: "Choose an image under 12 MB." });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    dispatchFields({ type: "imageChosen", image: file, previewUrl: URL.createObjectURL(file) });
    setStatus({ state: "idle" });
  }

  function clearProjectImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    dispatchFields({ type: "imageCleared", previewUrl: "" });
    setStatus({ state: "idle" });
  }

  function handleLocationChange(value: string) {
    setStatus((current) => current.state === "error" && current.field !== "projectName" ? { state: "idle" } : current);
    dispatchFields({ type: "locationTextChanged", value });
  }

  function handleLocationPlaceSelect(selection: ProjectGooglePlaceSelection) {
    dispatchFields({ type: "locationPlaceSelected", selection });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    let uploadedImage: ProjectImageDraft | null = null;
    let clientId: string | null = null;
    let optimisticProject: Tables<"projects"> | null = null;
    let projectCreated = false;
    const optimisticEnabled = Boolean(onOptimisticProjectChange);

    function reportOptimisticProject(
      setupStatus: ProjectCardSetupStatus | null,
      setupNavigationDisabled: boolean,
      errorMessage?: string,
    ) {
      if (!clientId || !optimisticProject) return;
      onOptimisticProjectChange?.({
        clientId,
        project: optimisticProject,
        setupStatus,
        setupNavigationDisabled,
        errorMessage,
      });
    }

    try {
      const formData = new FormData(event.currentTarget);
      const projectName = String(formData.get("name") ?? "").trim();
      if (!projectName) {
        setStatus({
          state: "error",
          field: "projectName",
          message: "Add a project name before creating this project.",
        });
        const nameInput = event.currentTarget.elements.namedItem("name");
        if (nameInput instanceof HTMLInputElement) nameInput.focus();
        return;
      }

      clientId = createProjectClientId();
      optimisticProject = createOptimisticProject(formData, clientId, new Date().toISOString());
      if (optimisticEnabled) {
        reportOptimisticProject({ state: "creating", message: "Creating project..." }, true);
        onSuccess?.();
      }

      setStatus({ state: "creating", message: "Creating project..." });
      const project = await createProjectRecord(formData);
      projectCreated = true;
      optimisticProject = project;
      reportOptimisticProject({ state: "preparing", message: "Preparing project..." }, true);

      if (selectedPlace) {
        setStatus({ state: "saving", message: "Saving project location..." });
        reportOptimisticProject({ state: "preparing", message: "Saving project location..." }, true);
        try {
          const locationResult = await saveProjectLocation(
            initialProjectLocationActionState,
            locationFormData(project.id, selectedPlace),
          );
          if (locationResult.status === "error") {
            reportOptimisticProject({ state: "preparing", message: "Project location can be refined later." }, true);
          }
        } catch {
          reportOptimisticProject({ state: "preparing", message: "Project location can be refined later." }, true);
        }
      }

      if (selectedImage) {
        setStatus({
          state: "uploading",
          message: "Uploading project image...",
          progress: 5,
        });
        reportOptimisticProject({ state: "preparing", message: "Uploading project image..." }, true);
        uploadedImage = await uploadProjectImage(
          selectedImage,
          project.id,
          (progress) => {
            setStatus({
              state: "uploading",
              message: "Uploading project image...",
              progress,
            });
            reportOptimisticProject({ state: "preparing", message: `Uploading project image (${progress}%)...` }, true);
          },
        );
        setStatus({
          state: "saving",
          message: `Saving image metadata (${formatUploadBytes(uploadedImage.originalBytes)} -> ${formatUploadBytes(uploadedImage.optimizedBytes)}).`,
        });
        reportOptimisticProject({ state: "preparing", message: "Saving project image..." }, true);
        await updateProjectImageMetadata(project.id, uploadedImage);
        optimisticProject = applyUploadedProjectImage(project, uploadedImage);
      }

      reportOptimisticProject({ state: "preparing", message: "Creating default estimate..." }, true);
      await createEstimateSheetDraft(project.id);
      reportOptimisticProject({ state: "preparing", message: "Syncing project..." }, true);
      if (!optimisticEnabled) onSuccess?.();
      router.refresh();
    } catch (error) {
      if (uploadedImage) void removeProjectImageUpload(uploadedImage);
      const message = error instanceof Error ? error.message : "Could not create project.";
      if (optimisticEnabled && optimisticProject) {
        if (!projectCreated) {
          if (clientId) {
            onOptimisticProjectChange?.({
              clientId,
              project: optimisticProject,
              setupStatus: null,
              setupNavigationDisabled: true,
              remove: true,
              errorMessage: message,
            });
          }
          return;
        }
        const setupErrorMessage = "Project was created, but setup needs attention.";
        reportOptimisticProject({ state: "error", message: setupErrorMessage }, false, setupErrorMessage);
        router.refresh();
        return;
      }
      setStatus({
        state: "error",
        message,
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={[
        "grid",
        showHeader ? "grid-rows-[auto_minmax(0,1fr)_auto]" : "grid-rows-[minmax(0,1fr)_auto]",
      ].join(" ")}
    >
      {showHeader ? <CreateProjectHeader /> : null}

      <div className="grid min-h-0 gap-2 overflow-auto p-2 lg:grid-cols-[minmax(360px,460px)_minmax(300px,1fr)_minmax(360px,460px)] lg:items-start lg:overflow-hidden">
        <ProjectImagePanel
          imageInputId={imageInputId}
          isSubmitting={isSubmitting}
          previewUrl={previewUrl}
          selectedImage={selectedImage}
          onChooseImage={chooseProjectImage}
          onClearImage={clearProjectImage}
        />

        <div
          data-create-project-details-panel
          className="flex h-full min-h-0 flex-col overflow-hidden rounded-xs border border-hairline bg-white lg:self-stretch"
        >
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <ProjectFields
              isProjectNameInvalid={isProjectNameInvalid}
              projectNameErrorId={statusId}
              isSubmitting={isSubmitting}
              projectCode={projectCode}
              clientName={clientName}
              clientOptions={clientOptions}
              currencyCode={currencyCode}
              currencySearchValue={currencySearchValue}
              googleMapsApiKey={googleMapsApiKey}
              locationValue={locationValue}
              onProjectNameChange={() => {
                if (isProjectNameInvalid) setStatus({ state: "idle" });
              }}
              onProjectCodeChange={(value) => setProjectCode(value.toUpperCase())}
              onClientNameChange={(value) => dispatchFields({ type: "clientNameChanged", value })}
              onGenerateProjectCode={() => setProjectCode(generateProjectCode())}
              onCurrencyChange={({ code, searchValue }) => {
                dispatchFields({ type: "currencyChanged", code, searchValue });
              }}
              onLocationChange={handleLocationChange}
              onLocationPlaceSelect={handleLocationPlaceSelect}
            />
          </div>
        </div>

        <ProjectLocationPreview
          apiKey={googleMapsApiKey}
          mapId={googleMapsMapId}
          addressLabel={locationValue}
          pin={locationPin}
          className="aspect-[4/3] h-auto"
        />
      </div>
      <CreateProjectFooter
        isSubmitting={isSubmitting}
        status={status}
        statusId={statusId}
      />
    </form>
  );
}
