"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput } from "@/components/ui/control-input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import {
  archiveComponentCatalogueEntity,
  createComponentCatalogueEntity,
  renameComponentCatalogueEntity,
  restoreComponentCatalogueEntity,
} from "@/lib/component-library/actions";
import type {
  CatalogueEntity,
  CatalogueEntityKind,
  CatalogueEntityLifecycleState,
  CatalogueGovernanceMutationResult,
} from "@/lib/component-library/catalogue-governance";
import { cn } from "@/lib/ui/cn";

export type CatalogueMasterOption = {
  id: string;
  name: string;
  normalized_name?: string;
  sort_order?: number | null;
  lifecycle_state?: "active" | "archived";
  revision?: number;
  archived_at?: string | null;
  archived_by?: string | null;
  merged_into_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

type CatalogueFilter = "active" | "archived" | "all";

type CatalogueCommand =
  | { kind: "create"; name: string }
  | { kind: "rename"; entity: CatalogueMasterOption; name: string }
  | { kind: "archive"; entity: CatalogueMasterOption }
  | { kind: "restore"; entity: CatalogueMasterOption };

type CatalogueEntityManagerDialogProps = {
  open: boolean;
  kind: CatalogueEntityKind;
  canManage: boolean;
  entities: CatalogueMasterOption[];
  onOpenChange: (open: boolean) => void;
  onEntityChanged: (entity: CatalogueEntity) => void;
};

const FILTER_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
] as const;

function pluralizeKind(kind: CatalogueEntityKind) {
  return kind === "brand" ? "brands" : "suppliers";
}

function titleCaseKind(kind: CatalogueEntityKind) {
  return kind === "brand" ? "Brand" : "Supplier";
}

function readLifecycleState(entity: CatalogueMasterOption): CatalogueEntityLifecycleState {
  return entity.lifecycle_state === "archived" ? "archived" : "active";
}

function readRevision(entity: CatalogueMasterOption) {
  return Number.isSafeInteger(entity.revision) && Number(entity.revision) >= 1
    ? Number(entity.revision)
    : null;
}

function commandSignature(kind: CatalogueEntityKind, command: CatalogueCommand) {
  if (command.kind === "create") return `${kind}:create:${command.name}`;
  if (command.kind === "rename") return `${kind}:rename:${command.entity.id}:${command.entity.revision ?? "missing"}:${command.name}`;
  return `${kind}:${command.kind}:${command.entity.id}:${command.entity.revision ?? "missing"}`;
}

export function applyCatalogueEntityToOptions<T extends CatalogueMasterOption>(
  current: T[],
  entity: CatalogueEntity,
): T[] {
  const existing = current.find((option) => option.id === entity.id);
  const next = {
    ...(existing ?? {}),
    id: entity.id,
    name: entity.name,
    normalized_name: entity.normalizedName,
    sort_order: existing?.sort_order ?? current.length,
    lifecycle_state: entity.lifecycleState === "archived" ? "archived" : "active",
    revision: entity.revision,
    archived_at: entity.archivedAt,
    archived_by: entity.archivedBy,
    merged_into_id: entity.mergedIntoId,
    created_by: entity.createdBy,
    updated_by: entity.updatedBy,
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
  } as T;
  return existing
    ? current.map((option) => option.id === entity.id ? next : option)
    : [...current, next];
}

export function CatalogueEntityManagerDialog({
  open,
  kind,
  canManage,
  entities: entitiesProp,
  onOpenChange,
  onEntityChanged,
}: CatalogueEntityManagerDialogProps) {
  const pluralKind = pluralizeKind(kind);
  const kindLabel = titleCaseKind(kind);
  const [entities, setEntities] = useState(entitiesProp);
  const [filter, setFilter] = useState<CatalogueFilter>("active");
  const [query, setQuery] = useState("");
  const [createName, setCreateName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [failedCommand, setFailedCommand] = useState<CatalogueCommand | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const intentIdsRef = useRef(new Map<string, string>());
  const retryButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!error) return;
    const frameId = window.requestAnimationFrame(() => retryButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frameId);
  }, [error]);

  const visibleEntities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entities
      .filter((entity) => filter === "all" || readLifecycleState(entity) === filter)
      .filter((entity) => !normalizedQuery || entity.name.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [entities, filter, query]);

  async function executeCommand(command: CatalogueCommand) {
    if (!canManage || pendingSignature) return;
    const signature = commandSignature(kind, command);
    const intentId = intentIdsRef.current.get(signature) ?? crypto.randomUUID();
    intentIdsRef.current.set(signature, intentId);
    setPendingSignature(signature);
    setError("");
    setStatus("");

    try {
      let result: CatalogueGovernanceMutationResult;
      if (command.kind === "create") {
        result = await createComponentCatalogueEntity({ entityKind: kind, intentId, name: command.name });
      } else {
        const expectedRevision = readRevision(command.entity);
        if (expectedRevision === null) throw new Error("Refresh this catalogue entry before changing it.");
        if (command.kind === "rename") {
          result = await renameComponentCatalogueEntity({
            entityKind: kind,
            entityId: command.entity.id,
            expectedRevision,
            intentId,
            name: command.name,
          });
        } else if (command.kind === "archive") {
          result = await archiveComponentCatalogueEntity({
            entityKind: kind,
            entityId: command.entity.id,
            expectedRevision,
            intentId,
          });
        } else {
          result = await restoreComponentCatalogueEntity({
            entityKind: kind,
            entityId: command.entity.id,
            expectedRevision,
            intentId,
          });
        }
      }

      setEntities((current) => applyCatalogueEntityToOptions(current, result.entity));
      onEntityChanged(result.entity);
      intentIdsRef.current.delete(signature);
      setFailedCommand(null);
      if (command.kind === "create") setCreateName("");
      if (command.kind === "rename") {
        setEditingId(null);
        setRenameName("");
      }
      setStatus(`${kindLabel} ${command.kind === "create" ? "created" : command.kind === "rename" ? "renamed" : command.kind === "archive" ? "archived" : "restored"}.`);
    } catch (commandError) {
      setFailedCommand(command);
      setError(commandError instanceof Error ? commandError.message : `Could not update this ${kind}.`);
    } finally {
      setPendingSignature(null);
    }
  }

  function beginRename(entity: CatalogueMasterOption) {
    setEditingId(entity.id);
    setRenameName(entity.name);
    setError("");
    setStatus("");
  }

  const actionPending = pendingSignature !== null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Manage ${pluralKind}`}
      description={`Create and maintain the canonical ${pluralKind} used by this workspace.`}
      size="lg"
      closeLabel={`Close ${pluralKind} manager`}
      bodyClassName="grid max-h-[min(70dvh,620px)] gap-3 overflow-hidden p-3"
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px]">
        <SearchInput
          aria-label={`Search ${pluralKind}`}
          placeholder={`Search ${pluralKind}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          data-dialog-initial-focus
          wrapperClassName="border border-hairline bg-white"
        />
        <DropdownSelect
          aria-label="Catalogue status"
          variant="boxed"
          value={filter}
          options={FILTER_OPTIONS}
          onValueChange={(value) => setFilter(value as CatalogueFilter)}
        />
      </div>

      <ControlField
        label={`New ${kind} name`}
        errorText={!canManage ? "Only workspace editors and admins can change catalogue masters." : undefined}
        reserveHelperSpace
      >
        {({ controlId, labelId, describedBy, invalid }) => (
          <div className="flex min-w-0 gap-2">
            <ControlInput
              id={controlId}
              aria-labelledby={labelId}
              aria-describedby={describedBy}
              invalid={invalid}
              value={createName}
              disabled={!canManage}
              onChange={(event) => setCreateName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (createName.trim()) void executeCommand({ kind: "create", name: createName });
              }}
              className="h-8 border-hairline bg-white px-2"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!canManage || actionPending || !createName.trim()}
              onClick={() => void executeCommand({ kind: "create", name: createName })}
            >
              {pendingSignature?.includes(":create:") ? `Creating ${kind}...` : `Create ${kind}`}
            </Button>
          </div>
        )}
      </ControlField>

      <div className="min-h-0 overflow-auto rounded-xs border border-hairline" aria-label={`${kindLabel} master list`}>
        {visibleEntities.length > 0 ? (
          <ul className="m-0 grid list-none divide-y divide-hairline p-0">
            {visibleEntities.map((entity) => {
              const lifecycleState = readLifecycleState(entity);
              const hasRevision = readRevision(entity) !== null;
              const isEditing = editingId === entity.id;
              return (
                <li key={entity.id} className="grid min-h-12 gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  {isEditing ? (
                    <ControlField label={`${kindLabel} name for ${entity.name}`}>
                      <ControlInput
                        value={renameName}
                        onChange={(event) => setRenameName(event.target.value)}
                        className="h-8 border-hairline bg-white px-2"
                      />
                    </ControlField>
                  ) : (
                    <div className="min-w-0">
                      <span className="block truncate text-[10px] font-medium text-ink">{entity.name}</span>
                      <span className="block text-[9px] text-tertiary">
                        {lifecycleState === "archived" ? "Archived" : "Active"}
                        {hasRevision ? ` · Revision ${entity.revision}` : " · Refresh required"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-1">
                    {isEditing ? (
                      <>
                        <Button type="button" variant="ghost" size="xs" disabled={actionPending} onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="xs"
                          disabled={!canManage || actionPending || !renameName.trim() || !hasRevision}
                          onClick={() => void executeCommand({ kind: "rename", entity, name: renameName })}
                        >
                          Save {kind} name
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          aria-label={`Rename ${entity.name}`}
                          title={hasRevision ? undefined : "Refresh before renaming"}
                          disabled={!canManage || actionPending || !hasRevision}
                          onClick={() => beginRename(entity)}
                        >
                          Rename
                        </Button>
                        <Button
                          type="button"
                          variant={lifecycleState === "archived" ? "outline" : "danger"}
                          size="xs"
                          aria-label={`${lifecycleState === "archived" ? "Restore" : "Archive"} ${entity.name}`}
                          title={hasRevision ? undefined : "Refresh before changing lifecycle"}
                          disabled={!canManage || actionPending || !hasRevision}
                          onClick={() => void executeCommand({
                            kind: lifecycleState === "archived" ? "restore" : "archive",
                            entity,
                          })}
                        >
                          {lifecycleState === "archived" ? "Restore" : "Archive"}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 p-4 text-center text-[10px] text-tertiary">No {pluralKind} match this view.</p>
        )}
      </div>

      <div className="min-h-8" aria-live="polite" aria-atomic="true">
        {error ? (
          <div className="flex items-center justify-between gap-2" role="alert">
            <span className="text-[10px] text-danger">{error}</span>
            {failedCommand ? (
              <Button
                ref={retryButtonRef}
                type="button"
                variant="outline"
                size="xs"
                disabled={actionPending}
                onClick={() => void executeCommand(failedCommand)}
              >
                Retry
              </Button>
            ) : null}
          </div>
        ) : (
          <span role="status" className={cn("text-[10px] text-secondary", !status && "sr-only")}>
            {status || "Catalogue manager ready."}
          </span>
        )}
      </div>
    </Modal>
  );
}
