"use client";

import Image from "next/image";
import { useId } from "react";
import { MagicWand, MapPin, Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { cn } from "@/lib/ui/cn";
import {
  ProjectAddressAutocomplete,
  type ProjectGooglePlaceSelection,
} from "@/components/workshop/ProjectAddressAutocomplete";
import {
  ProjectLocationMap,
  type ProjectLocationPin,
} from "@/components/workshop/ProjectLocationMap";
import { getProjectLocationStaticMapStyleParams } from "@/lib/google-maps/project-location-map-style";
import { CREATE_PROJECT_CURRENCY_OPTIONS } from "./new-project-form-currency-options";
import { createProjectClientOptions } from "./project-client-options";

// Re-export so existing importers (ProjectDetailsModal) keep working from the
// canonical location without touching their import paths.
export { CREATE_PROJECT_CURRENCY_OPTIONS } from "./new-project-form-currency-options";

export type CreateProjectStatus =
  | { state: "idle" }
  | { state: "creating"; message: string }
  | { state: "uploading"; message: string; progress: number }
  | { state: "saving"; message: string }
  | { state: "error"; message: string; field?: "projectName" };

type ProjectCodeFieldProps = {
  isSubmitting: boolean;
  projectCode?: string | null;
  onChange: (value: string) => void;
  onGenerate: () => void;
};

type CreateProjectFooterProps = {
  isSubmitting: boolean;
  status: CreateProjectStatus;
  statusId: string;
};

const CREATE_PROJECT_FIELD_LABEL_CLASS =
  "text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary";
const CREATE_PROJECT_INPUT_CLASS = "h-8 bg-white/92 px-2 !text-[10px]";

export function CreateProjectHeader() {
  return (
    <div className="border-b border-[color:var(--glass-border)] bg-white/54 px-2 py-2">
      <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
        Projects
      </p>
      <h3
        id="new-project-title"
        className="mt-0.5 text-[12px] font-medium leading-4 text-ink"
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
  const codeValue = projectCode ?? "";

  return (
    <label htmlFor="new-project-code" className="group/code-field w-full space-y-1">
      <span className={cn("block", CREATE_PROJECT_FIELD_LABEL_CLASS)}>
        Project Code
      </span>
      <span className="relative block min-w-0">
        <ControlInput
          id="new-project-code"
          name="projectCode"
          value={codeValue}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="A7K9M2Q4"
          className={cn(CREATE_PROJECT_INPUT_CLASS, "w-full pr-9 font-medium text-secondary")}
        />
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="workshop-liquid-button absolute right-0 top-0 size-8 rounded-xs opacity-0 transition-opacity group-hover/code-field:opacity-100 group-focus-within/code-field:opacity-100 motion-reduce:transition-none"
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
  isSubmitting: boolean;
  projectCode: string;
  clientName: string;
  clientOptions?: string[];
  currencyCode: string;
  currencySearchValue: string;
  googleMapsApiKey: string;
  locationValue: string;
  onProjectNameChange?: () => void;
  onProjectCodeChange: (value: string) => void;
  onClientNameChange: (value: string) => void;
  onGenerateProjectCode: () => void;
  onCurrencyChange: (value: { code: string; searchValue: string }) => void;
  onLocationChange: (value: string) => void;
  onLocationPlaceSelect: (selection: ProjectGooglePlaceSelection) => Promise<void> | void;
};

export function ProjectFields({
  isProjectNameInvalid,
  projectNameErrorId,
  isSubmitting,
  projectCode,
  clientName,
  clientOptions = [],
  currencyCode,
  currencySearchValue,
  googleMapsApiKey,
  locationValue,
  onProjectNameChange,
  onProjectCodeChange,
  onClientNameChange,
  onGenerateProjectCode,
  onCurrencyChange,
  onLocationChange,
  onLocationPlaceSelect,
}: ProjectFieldsProps) {
  const locationInputId = useId();
  const selectedCurrencyOption = CREATE_PROJECT_CURRENCY_OPTIONS.find((option) => option.id === currencyCode) ?? null;
  const projectClientOptions = createProjectClientOptions(clientOptions);

  return (
    <div data-create-project-fields className="grid gap-2">
      <label htmlFor="new-project-name" className="space-y-1">
        <span className={CREATE_PROJECT_FIELD_LABEL_CLASS}>
          Project name
        </span>
        <ControlInput
          id="new-project-name"
          name="name"
          data-dialog-initial-focus
          placeholder="e.g. Lewis Residence Renovation"
          required
          aria-describedby={
            isProjectNameInvalid ? projectNameErrorId : undefined
          }
          invalid={isProjectNameInvalid}
          onChange={onProjectNameChange}
          className={CREATE_PROJECT_INPUT_CLASS}
        />
      </label>
      <div className="space-y-1">
        <span className={CREATE_PROJECT_FIELD_LABEL_CLASS}>
          Client
        </span>
        <CreatableCombobox
          id="new-project-client"
          name="clientName"
          value={clientName}
          selectedId={projectClientOptions.find((option) => option.label === clientName)?.id ?? null}
          options={projectClientOptions}
          onChange={(change) => onClientNameChange(change.label)}
          ariaLabel="Client"
          placeholder="Client name"
          createLabel={(value) => `Create "${value}"`}
          emptyLabel="No clients match"
          inputClassName={CREATE_PROJECT_INPUT_CLASS}
        />
      </div>
      <div className="space-y-1">
        <span className={CREATE_PROJECT_FIELD_LABEL_CLASS}>
          Currency
        </span>
        <input type="hidden" name="currencyCode" value={currencyCode} />
        <CreatableCombobox
          value={currencySearchValue}
          selectedId={selectedCurrencyOption?.id ?? null}
          options={CREATE_PROJECT_CURRENCY_OPTIONS}
          onChange={(change) => {
            if (change.reason === "select" && change.id) {
              onCurrencyChange({ code: change.id, searchValue: change.label });
              return;
            }
            if (change.reason === "clear") {
              onCurrencyChange({ code: "PHP", searchValue: "" });
              return;
            }
            const nextValue = change.label.toUpperCase();
            const matchingOption = CREATE_PROJECT_CURRENCY_OPTIONS.find((option) => option.id === nextValue);
            onCurrencyChange({ code: matchingOption?.id ?? currencyCode, searchValue: nextValue });
          }}
          ariaLabel="Currency"
          placeholder="Search currency"
          emptyLabel="No currency matches"
          allowCreate={false}
          preferSelectionOnEnter
          suppressCreateWhenSearchMatches
          optionPresentation="unit"
          inputClassName={CREATE_PROJECT_INPUT_CLASS}
        />
      </div>
      <ProjectCodeField
        isSubmitting={isSubmitting}
        projectCode={projectCode}
        onChange={onProjectCodeChange}
        onGenerate={onGenerateProjectCode}
      />
      <label htmlFor={locationInputId} className="space-y-1">
        <span className={CREATE_PROJECT_FIELD_LABEL_CLASS}>
          Location
        </span>
        <ProjectAddressAutocomplete
          id={locationInputId}
          apiKey={googleMapsApiKey}
          name="location"
          value={locationValue}
          readOnly={false}
          onValueChange={onLocationChange}
          onPlaceSelect={onLocationPlaceSelect}
          inputClassName={cn(CREATE_PROJECT_INPUT_CLASS, "text-ink")}
        />
      </label>
    </div>
  );
}

export function ProjectLocationPreview({
  apiKey,
  mapId,
  addressLabel,
  pin,
  className,
}: {
  readonly apiKey: string;
  readonly mapId?: string | null;
  readonly addressLabel: string;
  readonly pin: ProjectLocationPin | null;
  readonly className?: string;
}) {
  const key = apiKey.trim();
  const address = addressLabel.trim();
  const canShowGoogleMap = Boolean(key && pin);
  const staticMapUrl = key && address && !pin
    ? getProjectLocationStaticMapPreviewUrl({ apiKey: key, address })
    : null;

  return (
    <div
      data-create-project-location-preview
      className={cn(
        "overflow-hidden rounded-xs border border-hairline bg-surfaceMuted/70",
        className ?? "h-44",
      )}
      aria-label="Project location preview"
    >
      {canShowGoogleMap ? (
        <ProjectLocationMap
          apiKey={apiKey}
          mapId={mapId}
          pin={pin}
          addressLabel={addressLabel}
          minHeightClassName="min-h-full"
        />
      ) : staticMapUrl ? (
        <div className="relative h-full overflow-hidden bg-surfaceMuted text-tertiary">
          <Image
            src={staticMapUrl}
            alt=""
            aria-hidden="true"
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            unoptimized
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_42%,rgba(255,255,255,0.84)_100%)]" />
          <span className="absolute left-2 top-2 flex items-center gap-2 text-tertiary">
            <span className="grid size-8 shrink-0 place-items-center rounded-xs border border-white/80 bg-white/78 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
              <MapPin size={15} weight="regular" aria-hidden="true" />
            </span>
            <span className="block text-[9px] font-medium uppercase leading-3 tracking-normal">
              Map preview
            </span>
          </span>
          <span className="absolute inset-x-2 bottom-2 min-w-0 rounded-xs border border-white/72 bg-white/86 px-2 py-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <span className="block truncate text-[11px] font-medium leading-4 text-secondary">
              {address}
            </span>
            <span className="mt-0.5 block text-[10px] leading-4 text-tertiary">
              Choose a Google suggestion to pin this project.
            </span>
          </span>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(245,245,245,0.76)),radial-gradient(circle_at_80%_18%,rgba(242,68,5,0.12),transparent_28%)] p-2 text-tertiary">
          <span className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xs border border-white/80 bg-white/78">
              <MapPin size={15} weight="regular" aria-hidden="true" />
            </span>
            <span className="block text-[9px] font-medium uppercase leading-3 tracking-normal">
              Map preview
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-medium leading-4 text-secondary">
              {addressLabel.trim() || "No location selected"}
            </span>
            <span className="mt-1 block text-[10px] leading-4 text-tertiary">
              {addressLabel.trim()
                ? "Choose a Google suggestion to pin this project."
                : "Search or type a project address."}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function getProjectLocationStaticMapPreviewUrl({
  apiKey,
  address,
}: {
  readonly apiKey: string;
  readonly address: string;
}) {
  const params = new URLSearchParams({
    center: address,
    zoom: "14",
    size: "640x480",
    scale: "2",
    maptype: "roadmap",
    key: apiKey,
  });
  params.append("markers", `color:0xF24405|${address}`);
  for (const style of getProjectLocationStaticMapStyleParams()) {
    params.append("style", style);
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export function CreateProjectFooter({
  isSubmitting,
  status,
  statusId,
}: CreateProjectFooterProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-hairline bg-white/72 p-2">
      {status.state === "uploading" ? (
        <div className="min-h-[22px] space-y-1" aria-live="polite">
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
            "min-h-[22px] text-[9px] font-medium leading-3",
            status.state === "error" ? "text-danger" : "text-tertiary",
          ].join(" ")}
        >
          {status.message}
        </p>
      ) : (
        <p aria-hidden="true" className="min-h-[22px] text-[9px] leading-3">
          &nbsp;
        </p>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="brand"
          size="md"
          className="h-8 min-w-[124px] gap-2 rounded-xs px-2"
          disabled={isSubmitting}
        >
          <Plus size={14} weight="regular" aria-hidden="true" />
          {isSubmitting ? "Creating" : "Create project"}
        </Button>
      </div>
    </div>
  );
}
