"use client";

import { useMemo, useState } from "react";
import { GitBranch, LinkSimple, SlidersHorizontal, Trash, XCircle } from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  applyEstimateContributionConfigurationBulkAction,
} from "@/lib/estimates/contribution-configuration-actions";
import {
  applyMaterialAssemblyBulkAction,
} from "@/lib/estimates/material-assembly-actions";
import type { EstimateRowItem } from "@/lib/estimates/types";
import type { EstimateContributionBroadcastReceipt } from "@/lib/collaboration/estimate-tree-realtime-contract";

type ContributionMode = "alternatives" | "optional" | "accessories" | "remove";

type EstimateContributionBulkToolbarProps = {
  selectedItems: EstimateRowItem[];
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  onClear: () => void;
  onDeleteSelected: () => void;
  onContributionChanged: (receipt?: EstimateContributionBroadcastReceipt, contributionScopeId?: string) => void;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The contribution settings could not be saved.";
}

export function EstimateContributionBulkToolbar({
  selectedItems,
  projectId,
  estimateId,
  estimateTabId,
  onClear,
  onDeleteSelected,
  onContributionChanged,
}: EstimateContributionBulkToolbarProps) {
  const [mode, setMode] = useState<ContributionMode | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("Material options");
  const [primaryRowId, setPrimaryRowId] = useState("");
  const [accessoryMode, setAccessoryMode] = useState<"required" | "optional">("required");
  const [accessoryFactor, setAccessoryFactor] = useState("1");
  const selectedCount = selectedItems.length;
  const selectedIds = useMemo(() => selectedItems.map((item) => item.id), [selectedItems]);
  const defaultPrimaryRowId = primaryRowId && selectedIds.includes(primaryRowId)
    ? primaryRowId
    : selectedItems[0]?.id ?? "";

  function open(nextMode: ContributionMode) {
    setError(null);
    setPrimaryRowId(selectedItems[0]?.id ?? "");
    setMode(nextMode);
  }

  function close() {
    if (pending) return;
    setMode(null);
    setError(null);
  }

  function contributionScopeInput() {
    const scopeIds = [...new Set(selectedItems.map((item) => item.contributionScopeId).filter((id): id is string => Boolean(id)))];
    const revisions = [...new Set(selectedItems.map((item) => item.contributionRevision).filter((revision): revision is number => revision !== undefined))];
    if (scopeIds.length > 1 || revisions.length > 1) {
      throw new Error("The selected contribution rows are out of sync. Refresh and try again.");
    }
    return {
      contributionScopeId: scopeIds[0] ?? crypto.randomUUID(),
      expectedContributionRevision: revisions[0] ?? null,
    };
  }

  async function saveAlternatives() {
    if (selectedItems.length < 2) throw new Error("Select at least two rows to create material options.");
    const existingGroups = new Map(selectedItems.flatMap((item) => item.alternativeGroup ? [[item.alternativeGroup.id, item.alternativeGroup] as const] : []));
    const existingGroupId = existingGroups.size === 1 ? existingGroups.keys().next().value : undefined;
    const existingGroup = existingGroupId && selectedItems.every((item) => !item.alternativeGroup || item.alternativeGroup.id === existingGroupId)
      ? existingGroups.get(existingGroupId)
      : undefined;
    const scope = contributionScopeInput();
    const intentId = crypto.randomUUID();
    const result = await applyEstimateContributionConfigurationBulkAction({
      projectId,
      estimateId,
      estimateTabId,
      ...scope,
      operation: {
        kind: "configure_alternatives",
        groupId: existingGroup?.id ?? crypto.randomUUID(),
        name: groupName.trim() || "Material options",
        rowItemIds: selectedIds,
        selectedRowItemId: defaultPrimaryRowId,
        expectedGroupRevision: existingGroup?.revision ?? null,
      },
      intentId,
    });
    return {
      contributionScopeId: result.contributionScopeId,
      receipt: {
        delivery: "server_mutation",
        changed: result.changed,
        scopeRevision: result.contributionRevision,
        mutationId: intentId,
        changedRowIds: result.changedRowItemIds,
        changedGroupIds: result.changedGroupIds,
      } satisfies EstimateContributionBroadcastReceipt,
    };
  }

  async function saveOptionalRows() {
    const scope = contributionScopeInput();
    const intentId = crypto.randomUUID();
    const result = await applyEstimateContributionConfigurationBulkAction({
      projectId,
      estimateId,
      estimateTabId,
      ...scope,
      operation: {
        kind: "mark_optional",
        rows: selectedItems.map((item) => ({
          rowItemId: item.id,
          isIncluded: item.optionalContribution?.isIncluded ?? true,
          expectedOptionalRevision: item.optionalContribution?.revision ?? null,
        })),
      },
      intentId,
    });
    return {
      contributionScopeId: result.contributionScopeId,
      receipt: {
        delivery: "server_mutation",
        changed: result.changed,
        scopeRevision: result.contributionRevision,
        mutationId: intentId,
        changedRowIds: result.changedRowItemIds,
      } satisfies EstimateContributionBroadcastReceipt,
    };
  }

  async function saveAccessories() {
    if (selectedItems.length < 2) throw new Error("Select one main material and at least one accessory row.");
    const factor = Number(accessoryFactor);
    if (!Number.isFinite(factor) || factor < 0) throw new Error("Accessory quantity factor must be zero or greater.");
    const scope = contributionScopeInput();
    const intentId = crypto.randomUUID();
    const result = await applyMaterialAssemblyBulkAction({
      projectId,
      estimateId,
      estimateTabId,
      ...scope,
      operation: {
        kind: "configure_accessories",
        edges: selectedItems.filter((item) => item.id !== defaultPrimaryRowId).map((child) => ({
          edgeId: child.accessoryParent?.edgeId ?? crypto.randomUUID(),
          parentRowItemId: defaultPrimaryRowId,
          childRowItemId: child.id,
          mode: accessoryMode,
          isIncluded: true,
          quantityRule: { schemaVersion: 1, kind: "per-parent", factor },
          expectedEdgeRevision: child.accessoryParent?.revision ?? null,
        })),
      },
      intentId,
    });
    return {
      contributionScopeId: result.contributionScopeId,
      receipt: {
        delivery: "server_mutation",
        changed: result.changed,
        scopeRevision: result.contributionRevision,
        mutationId: intentId,
        changedRowIds: result.changedRowItemIds,
        changedEdgeIds: result.changedEdgeIds,
      } satisfies EstimateContributionBroadcastReceipt,
    };
  }

  async function removeContributionRoles() {
    const scope = contributionScopeInput();
    const groups = new Map(selectedItems.flatMap((item) => item.alternativeGroup ? [[item.alternativeGroup.id, item.alternativeGroup] as const] : []));
    const edges = new Map<string, { edgeId: string; expectedEdgeRevision: number }>();
    for (const item of selectedItems) {
      const itemEdges = [
        ...(item.accessoryParent ? [item.accessoryParent] : []),
        ...(item.accessoryChildren ?? []).map((edge) => ({ ...edge, parentRowItemId: item.id })),
      ];
      for (const edge of itemEdges) edges.set(edge.edgeId, { edgeId: edge.edgeId, expectedEdgeRevision: edge.revision });
    }
    const intentId = crypto.randomUUID();
    const result = await applyMaterialAssemblyBulkAction({
      projectId,
      estimateId,
      estimateTabId,
      ...scope,
      operation: {
        kind: "remove_roles",
        changedRowItemIds: selectedIds,
        groups: [...groups.values()].map((group) => ({ groupId: group.id, expectedGroupRevision: group.revision })),
        optionalRows: selectedItems.flatMap((item) => item.optionalContribution
          ? [{ rowItemId: item.id, expectedOptionalRevision: item.optionalContribution.revision }]
          : []),
        edges: [...edges.values()],
      },
      intentId,
    });
    return {
      contributionScopeId: result.contributionScopeId,
      receipt: {
        delivery: "server_mutation",
        changed: result.changed,
        scopeRevision: result.contributionRevision,
        mutationId: intentId,
        changedRowIds: result.changedRowItemIds,
        changedGroupIds: result.changedGroupIds,
        changedEdgeIds: result.changedEdgeIds,
      } satisfies EstimateContributionBroadcastReceipt,
    };
  }

  async function save() {
    if (!mode || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = mode === "alternatives"
        ? await saveAlternatives()
        : mode === "optional"
          ? await saveOptionalRows()
          : mode === "accessories"
            ? await saveAccessories()
            : await removeContributionRoles();
      onContributionChanged(result.receipt, result.contributionScopeId);
      onClear();
      setMode(null);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  const title = mode === "alternatives"
    ? "Create material options"
    : mode === "optional"
      ? "Mark optional materials"
      : mode === "accessories"
        ? "Attach accessory materials"
        : "Remove contribution roles";

  return (
    <>
      <BulkActionToolbar
        placement="bottom-dock"
        dockTo="container"
        selectedCount={selectedCount}
        selectedLabel={selectedCount === 1 ? "row selected" : "rows selected"}
        onClear={onClear}
        actions={[
          {
            label: "Make material options",
            ariaLabel: "Make selected rows material options",
            title: "Only one selected option contributes to the estimate total.",
            icon: <GitBranch size={16} weight="regular" />,
            disabled: selectedCount < 2,
            onClick: () => open("alternatives"),
          },
          {
            label: "Mark optional",
            ariaLabel: "Mark selected rows optional",
            title: "Optional rows can be included or excluded without deleting them.",
            icon: <SlidersHorizontal size={16} weight="regular" />,
            onClick: () => open("optional"),
          },
          {
            label: "Attach accessories",
            ariaLabel: "Attach selected accessory rows to a main material",
            title: "Select one main material plus one or more accessory rows.",
            icon: <LinkSimple size={16} weight="regular" />,
            disabled: selectedCount < 2,
            onClick: () => open("accessories"),
          },
          {
            label: "Remove option/accessory role",
            ariaLabel: "Remove contribution roles from selected rows",
            icon: <XCircle size={16} weight="regular" />,
            onClick: () => open("remove"),
          },
          {
            label: "Delete selected rows",
            ariaLabel: "Delete selected rows",
            title: "Deletes selected rows immediately. Use Undo after saving to restore them.",
            icon: <Trash size={16} weight="regular" />,
            variant: "danger",
            onClick: onDeleteSelected,
          },
        ]}
      />
      <Modal
        open={mode !== null}
        onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}
        title={title}
        description={`${selectedCount} selected ${selectedCount === 1 ? "row" : "rows"}.`}
        size="sm"
        closeLabel={`Close ${title}`}
        footer={(
          <>
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={close}>Cancel</Button>
            <Button type="button" variant={mode === "remove" ? "danger" : "primary"} size="sm" disabled={pending} onClick={() => void save()}>
              {pending ? "Saving…" : mode === "remove" ? "Remove roles" : "Save"}
            </Button>
          </>
        )}
      >
        <div className="grid gap-3 text-[11px] text-secondary">
          {mode === "alternatives" ? (
            <label className="grid gap-1 font-medium text-ink">
              Option group name
              <input className="h-9 rounded-xs border border-hairline px-2 text-[12px]" value={groupName} onChange={(event) => setGroupName(event.currentTarget.value)} />
            </label>
          ) : null}
          {mode === "alternatives" || mode === "accessories" ? (
            <fieldset className="grid gap-1.5">
              <legend className="font-medium text-ink">{mode === "alternatives" ? "Initially selected option" : "Main material"}</legend>
              {selectedItems.map((item) => (
                <label key={item.id} className="flex min-h-8 items-center gap-2 rounded-xs border border-hairline px-2">
                  <input type="radio" name="contribution-primary" value={item.id} checked={defaultPrimaryRowId === item.id} onChange={() => setPrimaryRowId(item.id)} />
                  <span className="truncate">{item.material}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
          {mode === "accessories" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 font-medium text-ink">
                Accessory type
                <select className="h-9 rounded-xs border border-hairline px-2 text-[12px]" value={accessoryMode} onChange={(event) => setAccessoryMode(event.currentTarget.value as "required" | "optional")}>
                  <option value="required">Required</option>
                  <option value="optional">Optional</option>
                </select>
              </label>
              <label className="grid gap-1 font-medium text-ink">
                Per-main quantity
                <input type="number" min="0" step="0.01" className="h-9 rounded-xs border border-hairline px-2 text-[12px]" value={accessoryFactor} onChange={(event) => setAccessoryFactor(event.currentTarget.value)} />
              </label>
            </div>
          ) : null}
          {mode === "optional" ? <p>Selected rows will remain visible and can be toggled into or out of the estimate total.</p> : null}
          {mode === "remove" ? <p>This removes option, optional, and accessory relationships without deleting the material rows.</p> : null}
          {error ? <output role="alert" className="rounded-xs border border-dangerSoft bg-red-50 px-2 py-1.5 text-danger">{error}</output> : null}
        </div>
      </Modal>
    </>
  );
}
