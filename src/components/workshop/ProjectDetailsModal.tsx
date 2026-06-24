"use client";

import { useCallback, useId, useMemo, useReducer, useRef, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
// NOTE: keep this a pure client overlay — saving runs the server action and then
// closes the modal, instead of a raw `<form action={serverAction}>` whose
// `revalidatePath` re-streams /workshop/projects underneath the open modal
// (which read to users as a full-page refresh).
import { X, FloppyDisk, ImageSquare, MagicWand, Trash, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { CreatableCombobox, type CreatableComboboxOption } from "@/components/ui/creatable-combobox";
import {
  ALLOWED_PROJECT_IMAGE_TYPES,
  formatUploadBytes,
  MAX_PROJECT_IMAGE_BYTES,
  removeProjectImageUpload,
  uploadProjectImage,
  type ImageUploadState,
  type ProjectImageDraft,
} from "@/components/workshop/project-image-client";
import { generateProjectCode } from "@/lib/projects/project-code";
import { updateProjectDetails } from "@/lib/projects/actions";
import type { Json, Tables } from "@/lib/supabase/types";

type ProjectDetailsModalProps = {
  project: Tables<"projects">;
  onClose: () => void;
  onDeleteProject?: (project: Tables<"projects">) => void;
  onSaved?: () => void;
};

type ProjectMetadata = {
  projectImageUrl?: string;
  projectImageThumbnailUrl?: string;
  projectImageBucket?: string;
  projectImagePath?: string;
  projectImageThumbnailPath?: string;
};

const PROJECT_CURRENCY_OPTIONS: CreatableComboboxOption[] = [
  { id: "PHP", label: "PHP", description: "Philippine peso" },
  { id: "USD", label: "USD", description: "US dollar" },
  { id: "EUR", label: "EUR", description: "Euro" },
  { id: "GBP", label: "GBP", description: "British pound" },
  { id: "JPY", label: "JPY", description: "Japanese yen" },
  { id: "SGD", label: "SGD", description: "Singapore dollar" },
  { id: "AUD", label: "AUD", description: "Australian dollar" },
  { id: "CAD", label: "CAD", description: "Canadian dollar" },
  { id: "HKD", label: "HKD", description: "Hong Kong dollar" },
  { id: "CNY", label: "CNY", description: "Chinese yuan" },
  { id: "KRW", label: "KRW", description: "South Korean won" },
  { id: "THB", label: "THB", description: "Thai baht" },
  { id: "IDR", label: "IDR", description: "Indonesian rupiah" },
  { id: "MYR", label: "MYR", description: "Malaysian ringgit" },
  { id: "VND", label: "VND", description: "Vietnamese dong" },
  { id: "INR", label: "INR", description: "Indian rupee" },
  { id: "AED", label: "AED", description: "UAE dirham" },
  { id: "SAR", label: "SAR", description: "Saudi riyal" },
  { id: "CHF", label: "CHF", description: "Swiss franc" },
  { id: "NZD", label: "NZD", description: "New Zealand dollar" },
];
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
  return <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">{children}</span>;
}

type ProjectDetailsState = {
  currencyCode: string;
  currencySearchValue: string;
  projectCode: string;
  projectImage: ProjectImageDraft | null;
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
  | { type: "projectCode"; value: string }
  | { type: "generateProjectCode" }
  | { type: "currency:select"; code: string; label: string }
  | { type: "currency:clear" }
  | { type: "currency:input"; value: string; matchingCode?: string }
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
    imageRemoved: false,
    imageUpload: { state: "idle" },
    isSaving: false,
    saveError: null,
  };
}

function projectDetailsReducer(state: ProjectDetailsState, action: ProjectDetailsAction): ProjectDetailsState {
  switch (action.type) {
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

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function ProjectDetailsModal({ project, onClose, onDeleteProject, onSaved }: ProjectDetailsModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const metadata = readProjectMetadata(project.metadata);
  const fileInputId = useId();
  const initialCurrencyCode = normalizeCurrencyCode(project.currency_code);
  const [detailsState, dispatchDetails] = useReducer(
    projectDetailsReducer,
    { project, metadata, initialCurrencyCode },
    getInitialProjectDetailsState,
  );
  const {
    currencyCode,
    currencySearchValue,
    projectCode,
    projectImage,
    imageRemoved,
    imageUpload,
    isSaving,
    saveError,
  } = detailsState;
  const selectedCurrencyOption = useMemo(
    () => PROJECT_CURRENCY_OPTIONS.find((option) => option.id === currencyCode) ?? null,
    [currencyCode],
  );
  const imageUploadBusy = imageUpload.state === "uploading";
  const imagePreviewUrl = projectImage?.thumbnailUrl || projectImage?.url;

  const closeDialog = useCallback(() => {
    if (dialogRef.current?.open) {
      if (typeof dialogRef.current.close === "function") {
        try {
          dialogRef.current.close();
        } catch {
          dialogRef.current.removeAttribute("open");
        }
      } else {
        dialogRef.current.removeAttribute("open");
      }
    }
    onClose();
  }, [onClose]);

  const handleNativeDialogPointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.target === dialogRef.current) closeDialog();
    },
    [closeDialog],
  );

  const openDialogElement = useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current?.removeEventListener("pointerdown", handleNativeDialogPointerDown);
      dialogRef.current = node;
      if (!node) return;
      node.addEventListener("pointerdown", handleNativeDialogPointerDown);
      if (node.open) return;
      if (typeof node.showModal === "function") {
        try {
          node.showModal();
        } catch {
          node.setAttribute("open", "");
        }
      } else {
        node.setAttribute("open", "");
      }
    },
    [handleNativeDialogPointerDown],
  );

  function handleSaveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatchDetails({ type: "save:start" });
    const formData = new FormData(event.currentTarget);
    void updateProjectDetails(formData)
      .then(() => {
        // Close after the save resolves so the underlying list reconciles with
        // the modal already dismissed — no page-reload flash while it is open.
        closeDialog();
        onSaved?.();
      })
      .catch((error: unknown) => {
        // Keep the modal open so the edit can be retried; nothing was lost.
        dispatchDetails({ type: "save:error", message: error instanceof Error ? error.message : "Could not save project details." });
      });
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
    <dialog
      ref={openDialogElement}
      aria-modal="true"
      aria-labelledby="project-details-title"
      className="z-40 w-[calc(100%-1rem)] max-w-3xl border-0 bg-transparent p-0 text-ink backdrop:bg-black/25 backdrop:backdrop-blur-md"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
    >
      <section
        aria-labelledby="project-details-title"
        className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xs border border-white/70 bg-white/88 shadow-[0_24px_80px_-42px_rgba(17,17,17,0.65)] ring-1 ring-black/5 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-hairline bg-white/80 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Project details</p>
            <h2 id="project-details-title" className="mt-0.5 truncate text-[12px] font-medium text-ink">
              {project.name}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label="Close project details"
            onClick={closeDialog}
          >
            <X size={14} weight="regular" />
          </Button>
        </div>

        <form onSubmit={handleSaveDetails} className="min-h-0 flex-1 overflow-auto p-2">
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
          <div className="grid gap-2 lg:grid-cols-[240px_1fr]">
            <div className="overflow-hidden rounded-xs border border-hairline bg-white">
              {imagePreviewUrl ? (
                <Image
                  src={imagePreviewUrl}
                  alt=""
                  width={480}
                  height={160}
                  sizes="240px"
                  unoptimized
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#fff0e5_0%,#f4f7fa_52%,#ffffff_100%)] text-tertiary">
                  <ImageSquare size={28} weight="regular" aria-hidden="true" />
                  <span className="text-[9px] font-medium uppercase tracking-normal">Project image</span>
                </div>
              )}
              <div className="grid gap-2 border-t border-hairline p-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Project image</FieldLabel>
                  {projectImage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-6 rounded-xs text-tertiary hover:bg-dangerSoft hover:text-danger"
                      aria-label="Remove project image"
                      disabled={imageUploadBusy}
                      onClick={removeProjectImage}
                    >
                      <Trash size={12} weight="regular" />
                    </Button>
                  ) : null}
                </div>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  aria-label="Upload project image"
                  disabled={imageUploadBusy}
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
                    "inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-within:ring-2 focus-within:ring-focus",
                    imageUploadBusy ? "pointer-events-none opacity-60" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <UploadSimple size={12} weight="regular" aria-hidden="true" />
                  {projectImage ? "Change image" : "Upload image"}
                </label>
                {imageUpload.state === "uploading" ? (
                  <div className="space-y-1" aria-live="polite">
                    <div className="h-1.5 overflow-hidden rounded-xs bg-surfaceMuted">
                      <div className="h-full rounded-xs bg-accent transition-[width]" style={{ width: `${imageUpload.progress}%` }} />
                    </div>
                    <p className="truncate text-[9px] font-medium text-tertiary">{imageUpload.message}</p>
                  </div>
                ) : null}
                {imageUpload.state === "uploaded" || imageUpload.state === "error" ? (
                  <p className={["text-[9px] font-medium leading-3", imageUpload.state === "error" ? "text-danger" : "text-tertiary"].join(" ")}>
                    {imageUpload.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label htmlFor="project-details-name" className="space-y-1 md:col-span-2">
                <FieldLabel>Project name</FieldLabel>
                <ControlInput id="project-details-name" name="name" defaultValue={project.name} required className="h-8 px-2" />
              </label>
              <label htmlFor="project-details-client" className="space-y-1">
                <FieldLabel>Client</FieldLabel>
                <ControlInput id="project-details-client" name="clientName" defaultValue={project.client_name ?? ""} placeholder="Client name" className="h-8 px-2" />
              </label>
              <label htmlFor="project-details-code" className="space-y-1">
                <FieldLabel>Project code</FieldLabel>
                <span className="flex min-w-0 items-center gap-1">
                  <ControlInput
                    id="project-details-code"
                    name="projectCode"
                    value={projectCode}
                    onChange={(event) => dispatchDetails({ type: "projectCode", value: event.currentTarget.value })}
                    placeholder="A7K9M2Q4"
                    className="h-8 px-2 uppercase"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="size-8 shrink-0 rounded-xs"
                    aria-label="Generate project code"
                    title="Generate project code"
                    onClick={() => dispatchDetails({ type: "generateProjectCode" })}
                  >
                    <MagicWand size={13} weight="regular" aria-hidden="true" />
                  </Button>
                </span>
              </label>
              <label htmlFor="project-details-location" className="space-y-1 md:col-span-2">
                <FieldLabel>Location</FieldLabel>
                <ControlInput id="project-details-location" name="location" defaultValue={project.location ?? ""} placeholder="City / site location" className="h-8 px-2" />
              </label>
              <div className="space-y-1">
                <FieldLabel>Currency</FieldLabel>
                <input type="hidden" name="currencyCode" value={currencyCode} />
                <CreatableCombobox
                  value={currencySearchValue}
                  selectedId={selectedCurrencyOption?.id ?? null}
                  options={PROJECT_CURRENCY_OPTIONS}
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
                    const matchingOption = PROJECT_CURRENCY_OPTIONS.find((option) => option.id === nextValue);
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
                  inputClassName="h-8 px-2 uppercase"
                />
              </div>
            </div>
          </div>

          <div className="mt-2 grid gap-2 border-t border-hairline pt-2">
            <div className="rounded-xs border border-hairline bg-white p-2">
              <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Record timestamps</p>
              <dl className="mt-2 space-y-1 text-[10px] leading-4">
                <div className="flex justify-between gap-2">
                  <dt className="text-tertiary">Created</dt>
                  <dd className="text-right text-ink">{formatDateTime(project.created_at)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-tertiary">Updated</dt>
                  <dd className="text-right text-ink">{formatDateTime(project.updated_at)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {saveError ? (
            <p role="alert" className="mt-2 rounded-xs border border-dangerSoft bg-dangerSoft/25 px-2 py-1.5 text-[10px] font-medium leading-4 text-danger">
              {saveError}
            </p>
          ) : null}

          <div className="sticky bottom-0 -mx-2 mt-2 flex justify-end gap-2 border-t border-hairline bg-white/90 px-2 py-2 backdrop-blur">
            {onDeleteProject ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="mr-auto h-8"
                onClick={() => onDeleteProject(project)}
              >
                Delete project
              </Button>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" className="h-8 gap-1.5" disabled={isSaving}>
                <FloppyDisk size={13} weight="regular" aria-hidden="true" />
                {isSaving ? "Saving…" : "Save details"}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </dialog>
  );
}
