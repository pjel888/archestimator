"use client";

import { useId, useMemo, useReducer, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
// NOTE: keep this a pure client overlay — saving runs the server action and then
// closes the modal, instead of a raw `<form action={serverAction}>` whose
// `revalidatePath` re-streams /workshop/projects underneath the open modal
// (which read to users as a full-page refresh).
import { FloppyDisk, ImageSquare, MagicWand, Trash, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/overlays/dialog";
import {
  ALLOWED_PROJECT_IMAGE_TYPES,
  formatUploadBytes,
  MAX_PROJECT_IMAGE_BYTES,
  removeProjectImageUpload,
  uploadProjectImage,
  type ImageUploadState,
  type ProjectImageDraft,
} from "@/components/workshop/project-image-client";
import {
  CREATE_PROJECT_CURRENCY_OPTIONS,
  ProjectLocationPreview,
} from "@/components/workshop/NewProjectFormSections";
import { ProjectAddressAutocomplete, type ProjectGooglePlaceSelection } from "@/components/workshop/ProjectAddressAutocomplete";
import type { ProjectLocationPin } from "@/components/workshop/ProjectLocationMap";
import { createProjectClientOptions } from "@/components/workshop/project-client-options";
import { generateProjectCode } from "@/lib/projects/project-code";
import { updateProjectDetails } from "@/lib/projects/actions";
import { initialProjectLocationActionState } from "@/lib/projects/location-action-state";
import { saveProjectLocation } from "@/lib/projects/location-actions";
import type { Json, Tables } from "@/lib/supabase/types";

type ProjectDetailsModalProps = {
  project: Tables<"projects">;
  onClose: () => void;
  onDeleteProject?: (project: Tables<"projects">) => void;
  onSaved?: () => void;
  googleMapsApiKey?: string;
  googleMapsMapId?: string | null;
  clientOptions?: string[];
};

type ProjectMetadata = {
  projectImageUrl?: string;
  projectImageThumbnailUrl?: string;
  projectImageBucket?: string;
  projectImagePath?: string;
  projectImageThumbnailPath?: string;
};

const projectDetailsDateTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function normalizeCurrencyCode(value: string | null | undefined) {
  const code = String(value ?? "PHP").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "PHP";
}

function readProjectMetadata(value: Json): ProjectMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, Json>;
  return {
    projectImageUrl: typeof record.projectImageUrl === "string" ? record.projectImageUrl : undefined,
    projectImageThumbnailUrl: typeof record.projectImageThumbnailUrl === "string" ? record.projectImageThumbnailUrl : undefined,
    projectImageBucket: typeof record.projectImageBucket === "string" ? record.projectImageBucket : undefined,
    projectImagePath: typeof record.projectImagePath === "string" ? record.projectImagePath : undefined,
    projectImageThumbnailPath: typeof record.projectImageThumbnailPath === "string" ? record.projectImageThumbnailPath : undefined,
  };
}

function formatDateTime(value: string) {
  return projectDetailsDateTimeFormatter.format(new Date(value));
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">{children}</span>;
}

type ProjectDetailsState = {
  clientName: string;
  currencyCode: string;
  currencySearchValue: string;
  projectCode: string;
  projectImage: ProjectImageDraft | null;
  locationValue: string;
  selectedPlace: ProjectGooglePlaceSelection | null;
  locationPin: ProjectLocationPin | null;
  imageRemoved: boolean;
  imageUpload: ImageUploadState;
  isSaving: boolean;
  saveError: string | null;
};

type ProjectDetailsInitialStateArgs = {
  project: Tables<"projects">;
  metadata: ProjectMetadata;
  initialCurrencyCode: string;
};

type ProjectDetailsAction =
  | { type: "clientName"; value: string }
  | { type: "projectCode"; value: string }
  | { type: "generateProjectCode" }
  | { type: "currency:select"; code: string; label: string }
  | { type: "currency:clear" }
  | { type: "currency:input"; value: string; matchingCode?: string }
  | { type: "locationTextChanged"; value: string }
  | { type: "locationPlaceSelected"; selection: ProjectGooglePlaceSelection }
  | { type: "save:start" }
  | { type: "save:error"; message: string }
  | { type: "imageUpload"; upload: ImageUploadState }
  | { type: "imageUpload:success"; image: ProjectImageDraft; upload: ImageUploadState }
  | { type: "image:remove" };

function getInitialProjectDetailsState({
  project,
  metadata,
  initialCurrencyCode,
}: ProjectDetailsInitialStateArgs): ProjectDetailsState {
  return {
    clientName: project.client_name ?? "",
    currencyCode: initialCurrencyCode,
    currencySearchValue: initialCurrencyCode,
    projectCode: project.project_code ?? "",
    projectImage: metadata.projectImageUrl
      ? {
        bucket: metadata.projectImageBucket,
        url: metadata.projectImageUrl,
        thumbnailUrl: metadata.projectImageThumbnailUrl,
        path: metadata.projectImagePath,
        thumbnailPath: metadata.projectImageThumbnailPath,
      }
      : null,
    locationValue: project.location ?? "",
    selectedPlace: null,
    locationPin: null,
    imageRemoved: false,
    imageUpload: { state: "idle" },
    isSaving: false,
    saveError: null,
  };
}

function projectDetailsReducer(state: ProjectDetailsState, action: ProjectDetailsAction): ProjectDetailsState {
  switch (action.type) {
    case "clientName":
      return { ...state, clientName: action.value };
    case "projectCode":
      return { ...state, projectCode: action.value.toUpperCase() };
    case "generateProjectCode":
      return { ...state, projectCode: generateProjectCode() };
    case "currency:select":
      return { ...state, currencyCode: action.code, currencySearchValue: action.label };
    case "currency:clear":
      return { ...state, currencyCode: "PHP", currencySearchValue: "" };
    case "currency:input":
      return {
        ...state,
        currencySearchValue: action.value,
        currencyCode: action.matchingCode ?? state.currencyCode,
      };
    case "locationTextChanged": {
      if (state.locationValue === action.value) return state;
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
        locationValue: action.selection.addressText,
        selectedPlace: action.selection,
        locationPin: {
          latitude: action.selection.latitude,
          longitude: action.selection.longitude,
        },
      };
    case "save:start":
      return { ...state, isSaving: true, saveError: null };
    case "save:error":
      return { ...state, isSaving: false, saveError: action.message };
    case "imageUpload":
      return { ...state, imageUpload: action.upload };
    case "imageUpload:success":
      return { ...state, projectImage: action.image, imageRemoved: false, imageUpload: action.upload };
    case "image:remove":
      return { ...state, projectImage: null, imageRemoved: true, imageUpload: { state: "idle" } };
    default:
      return state;
  }
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

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function ProjectDetailsModal({
  project,
  onClose,
  onDeleteProject,
  onSaved,
  googleMapsApiKey = "",
  googleMapsMapId = null,
  clientOptions = [],
}: ProjectDetailsModalProps) {
  const metadata = readProjectMetadata(project.metadata);
  const fileInputId = useId();
  const initialCurrencyCode = normalizeCurrencyCode(project.currency_code);
  const [detailsState, dispatchDetails] = useReducer(
    projectDetailsReducer,
    { project, metadata, initialCurrencyCode },
    getInitialProjectDetailsState,
  );
  const {
    clientName,
    currencyCode,
    currencySearchValue,
    projectCode,
    projectImage,
    locationValue,
    selectedPlace,
    locationPin,
    imageRemoved,
    imageUpload,
    isSaving,
    saveError,
  } = detailsState;
  const selectedCurrencyOption = useMemo(
    () => CREATE_PROJECT_CURRENCY_OPTIONS.find((option) => option.id === currencyCode) ?? null,
    [currencyCode],
  );
  const projectClientOptions = useMemo(() => createProjectClientOptions(clientOptions), [clientOptions]);
  const imageUploadBusy = imageUpload.state === "uploading";
  const imagePreviewUrl = projectImage?.thumbnailUrl || projectImage?.url;

  async function handleSaveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatchDetails({ type: "save:start" });
    const formData = new FormData(event.currentTarget);
    try {
      await updateProjectDetails(formData);
      if (selectedPlace) {
        const locationResult = await saveProjectLocation(
          initialProjectLocationActionState,
          locationFormData(project.id, selectedPlace),
        );
        if (locationResult.status === "error") {
          throw new Error(locationResult.message);
        }
      }
      // Close after the save resolves so the underlying list reconciles with
      // the modal already dismissed — no page-reload flash while it is open.
      onClose();
      onSaved?.();
    } catch (error: unknown) {
      // Keep the modal open so the edit can be retried; nothing was lost.
      dispatchDetails({ type: "save:error", message: error instanceof Error ? error.message : "Could not save project details." });
    }
  }

  async function handleProjectImageUpload(file: File) {
    if (file.type && !ALLOWED_PROJECT_IMAGE_TYPES.has(file.type)) {
      dispatchDetails({ type: "imageUpload", upload: { state: "error", message: "Use a JPG, PNG, WebP, or AVIF image." } });
      return;
    }
    if (file.size > MAX_PROJECT_IMAGE_BYTES) {
      dispatchDetails({ type: "imageUpload", upload: { state: "error", message: "Choose an image under 12 MB." } });
      return;
    }

    const previousImage = projectImage;
    dispatchDetails({ type: "imageUpload", upload: { state: "uploading", message: "Uploading image to Supabase Storage...", progress: 5 } });

    try {
      const uploadedImage = await uploadProjectImage(file, project.id, (progress) => {
        dispatchDetails({ type: "imageUpload", upload: { state: "uploading", message: "Uploading image to Supabase Storage...", progress } });
      });
      dispatchDetails({
        type: "imageUpload:success",
        image: uploadedImage,
        upload: {
          state: "uploaded",
          message: `Stored WebP image (${formatUploadBytes(uploadedImage.originalBytes)} -> ${formatUploadBytes(uploadedImage.optimizedBytes)}).`,
        },
      });
      if (previousImage && previousImage.path !== metadata.projectImagePath && previousImage.path !== uploadedImage.path) {
        void removeProjectImageUpload(previousImage);
      }
    } catch (uploadError) {
      dispatchDetails({
        type: "imageUpload",
        upload: { state: "error", message: uploadError instanceof Error ? uploadError.message : "Could not upload image." },
      });
    }
  }

  function removeProjectImage() {
    if (projectImage && projectImage.path !== metadata.projectImagePath) void removeProjectImageUpload(projectImage);
    dispatchDetails({ type: "image:remove" });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      closeLabel="Close project details"
    >
      <DialogPortal>
        <div
          data-project-details-modal-root
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        >
          <DialogOverlay blur className="bg-black/25" />
          <DialogContent
            data-project-details-modal
            data-create-project-modal-shell
            described={false}
            initialFocus="first"
            className="workshop-create-project-modal-glass max-h-[calc(100dvh-2rem)] w-[min(1380px,calc(100vw-2rem))] max-w-none border bg-transparent p-1 text-ink shadow-none"
          >
            <DialogHeader className="min-h-11 border-0 bg-transparent px-2 py-2">
              <div className="min-w-0">
                <span className="block text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
                  Projects
                </span>
                <DialogTitle className="mt-0.5 block truncate text-[12px] font-medium leading-4 text-ink">
                  {project.name}
                </DialogTitle>
              </div>
              <DialogCloseButton className="workshop-liquid-button size-8 rounded-xs text-tertiary hover:text-ink" />
            </DialogHeader>

            <DialogBody className="min-h-0 overflow-hidden p-0">
              <div
                data-create-project-modal-tray
                className="min-h-0 overflow-hidden rounded-xs border border-white/70 bg-white"
              >
                <form
                  onSubmit={handleSaveDetails}
                  className="grid grid-rows-[minmax(0,1fr)_auto]"
                >
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="projectImageRemove" value={imageRemoved ? "1" : "0"} />
                  {projectImage ? (
                    <>
                      <input type="hidden" name="projectImageUrl" value={projectImage.url} />
                      {projectImage.thumbnailUrl ? <input type="hidden" name="projectImageThumbnailUrl" value={projectImage.thumbnailUrl} /> : null}
                      {projectImage.bucket ? <input type="hidden" name="projectImageBucket" value={projectImage.bucket} /> : null}
                      {projectImage.path ? <input type="hidden" name="projectImagePath" value={projectImage.path} /> : null}
                      {projectImage.thumbnailPath ? <input type="hidden" name="projectImageThumbnailPath" value={projectImage.thumbnailPath} /> : null}
                    </>
                  ) : null}

                  <div className="grid min-h-0 gap-2 overflow-auto p-2 lg:grid-cols-[minmax(360px,460px)_minmax(300px,1fr)_minmax(360px,460px)] lg:items-start lg:overflow-hidden">
                    <div
                      data-project-image-panel
                      className="relative aspect-[4/3] min-h-0 overflow-hidden rounded-xs border border-hairline bg-surfaceMuted"
                    >
                      <div className="absolute inset-0">
                        {imagePreviewUrl ? (
                          <Image
                            src={imagePreviewUrl}
                            alt=""
                            fill
                            sizes="(max-width: 1024px) calc(100vw - 2rem), 460px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_18%_16%,rgba(242,68,5,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(237,244,248,0.78)_48%,rgba(255,255,255,0.9)_100%)] text-tertiary">
                            <span className="grid size-12 place-items-center rounded-xs border border-white/80 bg-white/74">
                              <ImageSquare size={24} weight="regular" aria-hidden="true" />
                            </span>
                            <span className="text-[9px] font-medium uppercase leading-3 tracking-normal">
                              Project image
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="absolute inset-x-2 bottom-2 rounded-xs border border-white/70 bg-white/88 p-2 shadow-[0_10px_30px_-24px_rgba(17,17,17,0.5)]">
                        <div className="flex items-center justify-between gap-2">
                          <FieldLabel>Project image</FieldLabel>
                          {projectImage ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 rounded-xs text-tertiary hover:bg-dangerSoft hover:text-danger"
                              aria-label="Remove project image"
                              disabled={imageUploadBusy || isSaving}
                              onClick={removeProjectImage}
                            >
                              <Trash size={13} weight="regular" />
                            </Button>
                          ) : null}
                        </div>
                        <input
                          id={fileInputId}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          aria-label="Upload project image"
                          disabled={imageUploadBusy || isSaving}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (!file) return;
                            void handleProjectImageUpload(file);
                          }}
                          className="sr-only"
                        />
                        <label
                          htmlFor={fileInputId}
                          className={[
                            "mt-2 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xs border border-hairline bg-white/92 px-2 text-[10px] font-medium text-ink transition hover:bg-white focus-within:ring-2 focus-within:ring-focus",
                            imageUploadBusy || isSaving ? "pointer-events-none opacity-60" : "",
                          ].filter(Boolean).join(" ")}
                        >
                          <UploadSimple size={13} weight="regular" aria-hidden="true" />
                          {projectImage ? "Change image" : "Upload image"}
                        </label>
                        {imageUpload.state === "uploading" ? (
                          <div className="mt-2 space-y-1" aria-live="polite">
                            <div className="h-1.5 overflow-hidden rounded-xs bg-surfaceMuted">
                              <div className="h-full rounded-xs bg-accent transition-[width]" style={{ width: `${imageUpload.progress}%` }} />
                            </div>
                            <p className="truncate text-[9px] font-medium text-tertiary">{imageUpload.message}</p>
                          </div>
                        ) : null}
                        {imageUpload.state === "uploaded" || imageUpload.state === "error" ? (
                          <p className={["mt-2 text-[9px] font-medium leading-3", imageUpload.state === "error" ? "text-danger" : "text-tertiary"].join(" ")}>
                            {imageUpload.message}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div
                      data-project-details-panel
                      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xs border border-hairline bg-white lg:self-stretch"
                    >
                      <div className="min-h-0 flex-1 overflow-auto p-2">
                        <div className="grid gap-2">
                          <label htmlFor="project-details-name" className="space-y-1">
                            <FieldLabel>Project name</FieldLabel>
                            <ControlInput id="project-details-name" name="name" defaultValue={project.name} required className="h-8 bg-white/92 px-2 !text-[10px]" />
                          </label>
                          <div className="space-y-1">
                            <FieldLabel>Client</FieldLabel>
                            <CreatableCombobox
                              id="project-details-client"
                              name="clientName"
                              value={clientName}
                              selectedId={projectClientOptions.find((option) => option.label === clientName)?.id ?? null}
                              options={projectClientOptions}
                              onChange={(change) => dispatchDetails({ type: "clientName", value: change.label })}
                              ariaLabel="Client"
                              placeholder="Client name"
                              createLabel={(value) => `Create "${value}"`}
                              emptyLabel="No clients match"
                              dropdownPlacement="top"
                              inputClassName="h-8 bg-white/92 px-2 !text-[10px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>Currency</FieldLabel>
                            <input type="hidden" name="currencyCode" value={currencyCode} />
                            <CreatableCombobox
                              value={currencySearchValue}
                              selectedId={selectedCurrencyOption?.id ?? null}
                              options={CREATE_PROJECT_CURRENCY_OPTIONS}
                              onChange={(change) => {
                                if (change.reason === "select" && change.id) {
                                  dispatchDetails({ type: "currency:select", code: change.id, label: change.label });
                                  return;
                                }
                                if (change.reason === "clear") {
                                  dispatchDetails({ type: "currency:clear" });
                                  return;
                                }
                                const nextValue = change.label.toUpperCase();
                                const matchingOption = CREATE_PROJECT_CURRENCY_OPTIONS.find((option) => option.id === nextValue);
                                dispatchDetails({ type: "currency:input", value: nextValue, matchingCode: matchingOption?.id });
                              }}
                              ariaLabel="Currency"
                              placeholder="Search currency"
                              emptyLabel="No currency matches"
                              allowCreate={false}
                              preferSelectionOnEnter
                              suppressCreateWhenSearchMatches
                              optionPresentation="unit"
                              dropdownPlacement="top"
                              inputClassName="h-8 bg-white/92 px-2 !text-[9px] uppercase"
                            />
                          </div>
                          <label htmlFor="project-details-code" className="group/code-field w-full space-y-1">
                            <FieldLabel>Project code</FieldLabel>
                            <span className="relative block min-w-0">
                              <ControlInput
                                id="project-details-code"
                                name="projectCode"
                                value={projectCode}
                                onChange={(event) => dispatchDetails({ type: "projectCode", value: event.currentTarget.value })}
                                placeholder="A7K9M2Q4"
                                className="h-8 w-full bg-white/92 px-2 pr-9 !text-[9px] font-medium uppercase text-secondary"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon-sm"
                                className="workshop-liquid-button absolute right-0 top-0 size-8 rounded-xs opacity-0 transition-opacity group-hover/code-field:opacity-100 group-focus-within/code-field:opacity-100 motion-reduce:transition-none"
                                aria-label="Generate project code"
                                title="Generate project code"
                                disabled={isSaving}
                                onClick={() => dispatchDetails({ type: "generateProjectCode" })}
                              >
                                <MagicWand size={13} weight="regular" aria-hidden="true" />
                              </Button>
                            </span>
                          </label>
                          <label htmlFor="project-details-location" className="space-y-1">
                            <FieldLabel>Location</FieldLabel>
                            <ProjectAddressAutocomplete
                              id="project-details-location"
                              apiKey={googleMapsApiKey}
                              name="location"
                              value={locationValue}
                              readOnly={false}
                              onValueChange={(value) => dispatchDetails({ type: "locationTextChanged", value })}
                              onPlaceSelect={(selection) => dispatchDetails({ type: "locationPlaceSelected", selection })}
                              inputClassName="h-8 bg-white/92 px-2 !text-[10px] text-ink"
                            />
                          </label>
                          <dl className="grid grid-cols-2 gap-2 rounded-xs border border-hairline bg-white/80 p-2 text-[10px] leading-4">
                            <div className="min-w-0">
                              <dt className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Created</dt>
                              <dd className="mt-1 truncate text-ink">{formatDateTime(project.created_at)}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Updated</dt>
                              <dd className="mt-1 truncate text-ink">{formatDateTime(project.updated_at)}</dd>
                            </div>
                          </dl>
                          {saveError ? (
                            <p className="rounded-xs border border-dangerSoft bg-dangerSoft/25 px-2 py-1.5 text-[10px] font-medium leading-4 text-danger">
                              {saveError}
                            </p>
                          ) : null}
                        </div>
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

                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t border-hairline bg-white/72 p-2">
                    {onDeleteProject ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="h-8"
                        onClick={() => onDeleteProject(project)}
                      >
                        Delete project
                      </Button>
                    ) : (
                      <span aria-hidden="true" />
                    )}
                    <div className="min-h-[22px]" aria-live="polite">
                      {saveError ? (
                        <p role="alert" className="text-[9px] font-medium leading-3 text-danger">{saveError}</p>
                      ) : imageUpload.state === "uploading" ? (
                        <p className="truncate text-[9px] font-medium leading-3 text-tertiary">{imageUpload.message}</p>
                      ) : null}
                    </div>
                    <Button type="submit" variant="brand" size="md" className="h-8 min-w-[124px] gap-2 rounded-xs px-2" disabled={isSaving}>
                      <FloppyDisk size={13} weight="regular" aria-hidden="true" />
                      {isSaving ? "Saving" : "Save details"}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogBody>
          </DialogContent>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
