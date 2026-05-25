"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImageSquare, MagicWand, Plus, Trash, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { createProjectRecord, updateProjectImageMetadata } from "@/lib/projects/actions";
import { generateProjectCode } from "@/lib/projects/project-code";
import {
  ALLOWED_PROJECT_IMAGE_TYPES,
  formatUploadBytes,
  MAX_PROJECT_IMAGE_BYTES,
  removeProjectImageUpload,
  uploadProjectImage,
  type ProjectImageDraft,
} from "@/components/workshop/project-image-client";

type CreateProjectStatus =
  | { state: "idle" }
  | { state: "creating"; message: string }
  | { state: "uploading"; message: string; progress: number }
  | { state: "saving"; message: string }
  | { state: "error"; message: string };

export function NewProjectForm() {
  const router = useRouter();
  const imageInputId = useId();
  const [projectCode, setProjectCode] = useState(generateProjectCode);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState<CreateProjectStatus>({ state: "idle" });
  const isSubmitting = status.state === "creating" || status.state === "uploading" || status.state === "saving";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseProjectImage(file: File) {
    if (file.type && !ALLOWED_PROJECT_IMAGE_TYPES.has(file.type)) {
      setStatus({ state: "error", message: "Use a JPG, PNG, WebP, or AVIF image." });
      return;
    }
    if (file.size > MAX_PROJECT_IMAGE_BYTES) {
      setStatus({ state: "error", message: "Choose an image under 12 MB." });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStatus({ state: "idle" });
  }

  function clearProjectImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(null);
    setPreviewUrl("");
    setStatus({ state: "idle" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    let uploadedImage: ProjectImageDraft | null = null;
    try {
      setStatus({ state: "creating", message: "Creating project..." });
      const formData = new FormData(event.currentTarget);
      const project = await createProjectRecord(formData);

      if (selectedImage) {
        setStatus({ state: "uploading", message: "Uploading project image...", progress: 5 });
        uploadedImage = await uploadProjectImage(selectedImage, project.id, (progress) => {
          setStatus({ state: "uploading", message: "Uploading project image...", progress });
        });
        setStatus({
          state: "saving",
          message: `Saving image metadata (${formatUploadBytes(uploadedImage.originalBytes)} -> ${formatUploadBytes(uploadedImage.optimizedBytes)}).`,
        });
        await updateProjectImageMetadata(project.id, uploadedImage);
      }

      router.push(`/workshop/projects/${project.id}`);
      router.refresh();
    } catch (error) {
      if (uploadedImage) void removeProjectImageUpload(uploadedImage);
      setStatus({ state: "error", message: error instanceof Error ? error.message : "Could not create project." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-xs border border-hairline bg-white">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-36 flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#fff0e5_0%,#f4f7fa_52%,#ffffff_100%)] text-tertiary">
              <ImageSquare size={28} weight="regular" aria-hidden="true" />
              <span className="text-[9px] font-medium uppercase tracking-normal">Project image</span>
            </div>
          )}
          <div className="grid gap-2 border-t border-hairline p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Project image</span>
              {selectedImage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 rounded-xs text-tertiary hover:bg-dangerSoft hover:text-danger"
                  aria-label="Remove project image"
                  disabled={isSubmitting}
                  onClick={clearProjectImage}
                >
                  <Trash size={12} weight="regular" />
                </Button>
              ) : null}
            </div>
            <input
              id={imageInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              aria-label="Upload project image"
              disabled={isSubmitting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                chooseProjectImage(file);
              }}
              className="sr-only"
            />
            <label
              htmlFor={imageInputId}
              className={[
                "inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-within:ring-2 focus-within:ring-focus",
                isSubmitting ? "pointer-events-none opacity-60" : "",
              ].filter(Boolean).join(" ")}
            >
              <UploadSimple size={12} weight="regular" aria-hidden="true" />
              {selectedImage ? "Change image" : "Upload image"}
            </label>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Project name</span>
            <ControlInput name="name" placeholder="e.g. Lewis Residence Renovation" required className="h-8 px-2" />
          </label>
          <label className="space-y-1">
            <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Client</span>
            <ControlInput name="clientName" placeholder="Client name" className="h-8 px-2" />
          </label>
          <label className="space-y-1">
            <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Code</span>
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
                disabled={isSubmitting}
                onClick={() => setProjectCode(generateProjectCode())}
              >
                <MagicWand size={13} weight="regular" aria-hidden="true" />
              </Button>
            </span>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Location</span>
            <ControlInput name="location" placeholder="City / site location" className="h-8 px-2" />
          </label>
        </div>
      </div>

      <div className="-mx-2 grid gap-2 border-t border-hairline bg-white/90 px-2 pt-2">
        {status.state === "uploading" ? (
          <div className="space-y-1" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-xs bg-surfaceMuted">
              <div className="h-full rounded-xs bg-accent transition-[width]" style={{ width: `${status.progress}%` }} />
            </div>
            <p className="truncate text-[9px] font-medium text-tertiary">{status.message}</p>
          </div>
        ) : status.state === "creating" || status.state === "saving" || status.state === "error" ? (
          <p className={["text-[9px] font-medium leading-3", status.state === "error" ? "text-danger" : "text-tertiary"].join(" ")}>
            {status.message}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="sm" className="h-8 gap-1.5 rounded-xs" disabled={isSubmitting}>
          <Plus size={13} weight="regular" aria-hidden="true" />
            {isSubmitting ? "Creating" : "Create project"}
          </Button>
        </div>
      </div>
    </form>
  );
}
