"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
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
import { deleteProject, updateProjectDetails } from "@/lib/projects/actions";
import type { Json, Tables } from "@/lib/supabase/types";

type ProjectDetailsModalProps = {
  project: Tables<"projects">;
  onClose: () => void;
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
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">{children}</span>;
}

export function ProjectDetailsModal({ project, onClose }: ProjectDetailsModalProps) {
  const metadata = readProjectMetadata(project.metadata);
  const fileInputId = useId();
  const initialCurrencyCode = normalizeCurrencyCode(project.currency_code);
  const [currencyCode, setCurrencyCode] = useState(initialCurrencyCode);
  const [currencySearchValue, setCurrencySearchValue] = useState(initialCurrencyCode);
  const [projectCode, setProjectCode] = useState(project.project_code ?? "");
  const [projectImage, setProjectImage] = useState<ProjectImageDraft | null>(() => (
    metadata.projectImageUrl
      ? {
        bucket: metadata.projectImageBucket,
        url: metadata.projectImageUrl,
        thumbnailUrl: metadata.projectImageThumbnailUrl,
        path: metadata.projectImagePath,
        thumbnailPath: metadata.projectImageThumbnailPath,
      }
      : null
  ));
  const [imageRemoved, setImageRemoved] = useState(false);
  const [imageUpload, setImageUpload] = useState<ImageUploadState>({ state: "idle" });
  const selectedCurrencyOption = useMemo(
    () => PROJECT_CURRENCY_OPTIONS.find((option) => option.id === currencyCode) ?? null,
    [currencyCode],
  );
  const imageUploadBusy = imageUpload.state === "uploading";
  const imagePreviewUrl = projectImage?.thumbnailUrl || projectImage?.url;

  async function handleProjectImageUpload(file: File) {
    if (file.type && !ALLOWED_PROJECT_IMAGE_TYPES.has(file.type)) {
      setImageUpload({ state: "error", message: "Use a JPG, PNG, WebP, or AVIF image." });
      return;
    }
    if (file.size > MAX_PROJECT_IMAGE_BYTES) {
      setImageUpload({ state: "error", message: "Choose an image under 12 MB." });
      return;
    }

    const previousImage = projectImage;
    setImageUpload({ state: "uploading", message: "Uploading image to Supabase Storage...", progress: 5 });

    try {
      const uploadedImage = await uploadProjectImage(file, project.id, (progress) => {
        setImageUpload({ state: "uploading", message: "Uploading image to Supabase Storage...", progress });
      });
      setProjectImage(uploadedImage);
      setImageRemoved(false);
      setImageUpload({
        state: "uploaded",
        message: `Stored WebP image (${formatUploadBytes(uploadedImage.originalBytes)} -> ${formatUploadBytes(uploadedImage.optimizedBytes)}).`,
      });
      if (previousImage && previousImage.path !== metadata.projectImagePath && previousImage.path !== uploadedImage.path) {
        void removeProjectImageUpload(previousImage);
      }
    } catch (uploadError) {
      setImageUpload({ state: "error", message: uploadError instanceof Error ? uploadError.message : "Could not upload image." });
    }
  }

  function removeProjectImage() {
    if (projectImage && projectImage.path !== metadata.projectImagePath) void removeProjectImageUpload(projectImage);
    setProjectImage(null);
    setImageRemoved(true);
    setImageUpload({ state: "idle" });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 p-2 backdrop-blur-md">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close project details" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-details-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xs border border-white/70 bg-white/88 shadow-[0_24px_80px_-42px_rgba(17,17,17,0.65)] ring-1 ring-black/5 backdrop-blur-xl"
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
            onClick={onClose}
          >
            <X size={14} weight="regular" />
          </Button>
        </div>

        <form action={updateProjectDetails} className="min-h-0 flex-1 overflow-auto p-2">
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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="" className="h-40 w-full object-cover" />
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
              <label className="space-y-1 md:col-span-2">
                <FieldLabel>Project name</FieldLabel>
                <ControlInput name="name" defaultValue={project.name} required className="h-8 px-2" />
              </label>
              <label className="space-y-1">
                <FieldLabel>Client</FieldLabel>
                <ControlInput name="clientName" defaultValue={project.client_name ?? ""} placeholder="Client name" className="h-8 px-2" />
              </label>
              <label className="space-y-1">
                <FieldLabel>Project code</FieldLabel>
                <span className="flex min-w-0 items-center gap-1">
                  <ControlInput
                    name="projectCode"
                    value={projectCode}
                    onChange={(event) => setProjectCode(event.currentTarget.value.toUpperCase())}
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
                    onClick={() => setProjectCode(generateProjectCode())}
                  >
                    <MagicWand size={13} weight="regular" aria-hidden="true" />
                  </Button>
                </span>
              </label>
              <label className="space-y-1 md:col-span-2">
                <FieldLabel>Location</FieldLabel>
                <ControlInput name="location" defaultValue={project.location ?? ""} placeholder="City / site location" className="h-8 px-2" />
              </label>
              <label className="space-y-1">
                <FieldLabel>Currency</FieldLabel>
                <input type="hidden" name="currencyCode" value={currencyCode} />
                <CreatableCombobox
                  value={currencySearchValue}
                  selectedId={selectedCurrencyOption?.id ?? null}
                  options={PROJECT_CURRENCY_OPTIONS}
                  onChange={(change) => {
                    if (change.reason === "select" && change.id) {
                      setCurrencyCode(change.id);
                      setCurrencySearchValue(change.label);
                      return;
                    }
                    if (change.reason === "clear") {
                      setCurrencyCode("PHP");
                      setCurrencySearchValue("");
                      return;
                    }
                    const nextValue = change.label.toUpperCase();
                    setCurrencySearchValue(nextValue);
                    const matchingOption = PROJECT_CURRENCY_OPTIONS.find((option) => option.id === nextValue);
                    if (matchingOption) setCurrencyCode(matchingOption.id);
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
              </label>
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

          <div className="sticky bottom-0 -mx-2 mt-2 flex justify-between gap-2 border-t border-hairline bg-white/90 px-2 py-2 backdrop-blur">
            <Button
              type="submit"
              variant="danger"
              size="sm"
              className="h-8"
              formAction={deleteProject}
              onClick={(event) => {
                if (!window.confirm(`Delete ${project.name}? This also removes its estimates.`)) event.preventDefault();
              }}
            >
              Delete project
            </Button>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" className="h-8 gap-1.5">
                <FloppyDisk size={13} weight="regular" aria-hidden="true" />
                Save details
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
