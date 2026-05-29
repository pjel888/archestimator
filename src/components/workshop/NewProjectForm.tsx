"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useNavigationRouter } from "@/hooks/use-navigation-router";

import { createEstimateSheetDraft } from "@/lib/estimates/actions";
import {
  createProjectRecord,
  updateProjectImageMetadata,
} from "@/lib/projects/actions";
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
  ProjectCodeField,
  ProjectFields,
  type CreateProjectStatus,
} from "./NewProjectFormSections";
import { ProjectImagePanel } from "./NewProjectImagePanel";

type NewProjectFormProps = {
  onSuccess?: () => void;
};

export function NewProjectForm({ onSuccess }: NewProjectFormProps) {
  const router = useNavigationRouter();
  const imageInputId = useId();
  const [projectCode, setProjectCode] = useState(generateProjectCode);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState<CreateProjectStatus>({ state: "idle" });
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
        setStatus({
          state: "uploading",
          message: "Uploading project image...",
          progress: 5,
        });
        uploadedImage = await uploadProjectImage(
          selectedImage,
          project.id,
          (progress) => {
            setStatus({
              state: "uploading",
              message: "Uploading project image...",
              progress,
            });
          },
        );
        setStatus({
          state: "saving",
          message: `Saving image metadata (${formatUploadBytes(uploadedImage.originalBytes)} -> ${formatUploadBytes(uploadedImage.optimizedBytes)}).`,
        });
        await updateProjectImageMetadata(project.id, uploadedImage);
      }

      await createEstimateSheetDraft(project.id);
      onSuccess?.();
      router.refresh();
    } catch (error) {
      if (uploadedImage) void removeProjectImageUpload(uploadedImage);
      setStatus({
        state: "error",
        message:
          error instanceof Error ? error.message : "Could not create project.",
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid min-h-[560px] grid-rows-[auto_1fr]"
    >
      <CreateProjectHeader />

      <div className="grid min-h-0 lg:grid-cols-[minmax(320px,0.92fr)_minmax(460px,1fr)]">
        <ProjectImagePanel
          imageInputId={imageInputId}
          isSubmitting={isSubmitting}
          previewUrl={previewUrl}
          selectedImage={selectedImage}
          onChooseImage={chooseProjectImage}
          onClearImage={clearProjectImage}
        />

        <div className="flex min-h-0 flex-col bg-white">
          <div className="flex flex-1 flex-col gap-2 p-2">
            <div className="grid gap-2 md:grid-cols-2">
              <ProjectFields />
            </div>
            <ProjectCodeField
              isSubmitting={isSubmitting}
              projectCode={projectCode}
              onChange={(value) => setProjectCode(value.toUpperCase())}
              onGenerate={() => setProjectCode(generateProjectCode())}
            />
          </div>
          <CreateProjectFooter isSubmitting={isSubmitting} status={status} />
        </div>
      </div>
    </form>
  );
}
