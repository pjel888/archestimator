"use client";

import { MagicWand, Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";

export type CreateProjectStatus =
  | { state: "idle" }
  | { state: "creating"; message: string }
  | { state: "uploading"; message: string; progress: number }
  | { state: "saving"; message: string }
  | { state: "error"; message: string; field?: "projectName" };

type ProjectCodeFieldProps = {
  isSubmitting: boolean;
  projectCode: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
};

type CreateProjectFooterProps = {
  isSubmitting: boolean;
  status: CreateProjectStatus;
  statusId: string;
};

export function CreateProjectHeader() {
  return (
    <div className="border-b border-hairline bg-white p-2">
      <p className="text-[9px] font-medium uppercase tracking-normal text-tertiary">
        Projects
      </p>
      <h3
        id="new-project-title"
        className="mt-1 text-[12px] font-medium leading-4 text-ink"
      >
        Create project
      </h3>
    </div>
  );
}

export function ProjectCodeField({
  isSubmitting,
  projectCode,
  onChange,
  onGenerate,
}: ProjectCodeFieldProps) {
  return (
    <label className="mt-auto w-full space-y-1.5">
      <span className="block text-right text-[8px] font-medium uppercase tracking-normal text-tertiary">
        Project Code
      </span>
      <span className="flex min-w-0 items-center gap-1">
        <ControlInput
          name="projectCode"
          value={projectCode}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="A7K9M2Q4"
          className="h-8 min-w-0 flex-1 bg-white px-2 text-right !text-[8px] text-tertiary"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="size-8 shrink-0 rounded-xs"
          aria-label="Generate project code"
          title="Generate project code"
          disabled={isSubmitting}
          onClick={onGenerate}
        >
          <MagicWand size={13} weight="regular" aria-hidden="true" />
        </Button>
      </span>
    </label>
  );
}

type ProjectFieldsProps = {
  isProjectNameInvalid?: boolean;
  projectNameErrorId?: string;
  onProjectNameChange?: () => void;
};

export function ProjectFields({
  isProjectNameInvalid,
  projectNameErrorId,
  onProjectNameChange,
}: ProjectFieldsProps) {
  return (
    <>
      <label className="space-y-1.5 md:col-span-2">
        <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">
          Project name
        </span>
        <ControlInput
          name="name"
          placeholder="e.g. Lewis Residence Renovation"
          required
          aria-describedby={
            isProjectNameInvalid ? projectNameErrorId : undefined
          }
          invalid={isProjectNameInvalid}
          onChange={onProjectNameChange}
          className="h-10 px-2 !text-[12px]"
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">
          Client
        </span>
        <ControlInput
          name="clientName"
          placeholder="Client name"
          className="h-10 px-2 !text-[12px]"
        />
      </label>
      <label className="space-y-1.5 md:col-span-2">
        <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">
          Location
        </span>
        <ControlInput
          name="location"
          placeholder="City / site location"
          className="h-10 px-2 !text-[12px]"
        />
      </label>
    </>
  );
}

export function CreateProjectFooter({
  isSubmitting,
  status,
  statusId,
}: CreateProjectFooterProps) {
  return (
    <div className="grid gap-2 border-t border-hairline bg-white/94 p-2">
      {status.state === "uploading" ? (
        <div className="space-y-1" aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-xs bg-surfaceMuted">
            <div
              className="h-full rounded-xs bg-accent transition-[width]"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="truncate text-[9px] font-medium text-tertiary">
            {status.message}
          </p>
        </div>
      ) : status.state === "creating" ||
        status.state === "saving" ||
        status.state === "error" ? (
        <p
          id={statusId}
          aria-live="polite"
          role={status.state === "error" ? "alert" : undefined}
          className={[
            "text-[9px] font-medium leading-3",
            status.state === "error" ? "text-danger" : "text-tertiary",
          ].join(" ")}
        >
          {status.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="h-9 gap-2 rounded-xs bg-orange-600 px-3 hover:bg-orange-700 focus-visible:ring-orange-200"
          disabled={isSubmitting}
        >
          <Plus size={14} weight="regular" aria-hidden="true" />
          {isSubmitting ? "Creating" : "Create project"}
        </Button>
      </div>
    </div>
  );
}
