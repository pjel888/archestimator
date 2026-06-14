import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appLayout = readFileSync("src/app/layout.tsx", "utf8");
const workshopLayout = readFileSync("src/app/workshop/layout.tsx", "utf8");
const estimateNodePage = readFileSync("src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx", "utf8");
const estimateTree = readFileSync("src/components/workshop/EstimateSheetTree.tsx", "utf8");
const treeVisualStyle = readFileSync("src/components/workshop/tree-visual-style.ts", "utf8");
const estimateContent = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");
const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");
const estimateActions = readFileSync("src/lib/estimates/actions.ts", "utf8");

describe("live estimate node route", () => {
  it("loads project-scoped Supabase estimate tree data instead of sample project/tree data", () => {
    expect(estimateNodePage).toContain("resolveEstimateTabRouteContext(projectId, nodeId)");
    expect(estimateNodePage).not.toContain("sampleProjects");
    expect(estimateNodePage).not.toContain("sampleEstimateTree");
    expect(estimateNodePage).toContain("if (!project || !estimate) notFound()");
  });

  it("passes live tree nodes into the tree and sheet components", () => {
    expect(estimateNodePage).toContain("nodes={tree}");
    expect(estimateTree).toContain("nodes: EstimateTreeNode[]");
    expect(estimateTree).toContain('from "@/components/ui/tree"');
    expect(estimateTree).not.toContain("react-complex-tree");
    // P6 single-node model: the kind-based gates are gone. The group-kind
    // helper (`isEstimateGroupNodeKind`) and the group-only `selectedGroupId`
    // are removed; the create parent is now any selected node. The old "select
    // a group first" error path is gone (single "Add Area" flow). Behavior is
    // covered by the DOM tests in estimate-tree-modal.test.tsx and
    // estimate-mixed-content.test.tsx.
    expect(estimateTree).not.toContain("isEstimateGroupNodeKind");
    expect(estimateTree).not.toContain("selectedGroupId");
    expect(estimateTree).toContain("selectedParentNodeId");
    expect(estimateTree).not.toContain("you must select a group first before adding an area node");
    expect(estimateTree).toContain("renderRow={renderEstimateTreeRowLabel}");
    expect(estimateTree).toContain("currentId={activeSelectedNodeId}");
    expect(estimateTree).toContain("onCheckboxToggle={handleCheckboxToggle}");
    expect(estimateTree).toContain("selectable");
    expect(treeVisualStyle).toContain("WORKSHOP_TREE_INDENT_STEP = 20");
    expect(treeVisualStyle).toContain('WORKSHOP_TREE_ROW_GAP_CLASS = "space-y-0"');
    expect(estimateTree).toContain("onExpandAll={handleExpandAll}");
    expect(estimateTree).toContain("onCollapseAll={handleCollapseAll}");
    expect(estimateTree).toContain("draggable");
    expect(estimateTree).toContain("canDrag={handleTreeCanDrag}");
    expect(estimateTree).toContain("canDrop={handleTreeCanDrop}");
    expect(estimateTree).toContain("onDrop={handleTreeDrop}");
    // Vendor tree CSS is workshop-scoped: public/marketing routes must not
    // pay for it (path-to-estimate-sheet performance plan U6).
    expect(workshopLayout).toContain('import "react-complex-tree/lib/style-modern.css"');
    expect(appLayout).not.toContain("react-complex-tree");
    expect(appLayout).not.toContain("lenis/dist/lenis.css");
    expect(estimateTree).toContain("useEstimateAreaTreeQuery");
    expect(estimateContent).toContain("useEstimateAreaTreeQuery");
    expect(estimateTree).toContain("setLocalNodes(nextNodes)");
    expect(estimateTree).toContain("setLocalNodes(previousNodes)");
    expect(estimateTree).toContain('setReorderStatus({ state: "saving"');
    expect(estimateTree).not.toContain("router.refresh");
    expect(estimateTree).not.toContain("renderDragBetweenLine");
    expect(estimateTree).not.toContain("data-estimate-tree-insertion-zone");
    expect(estimateTree).not.toContain("Drop at top level");
    expect(estimateTree).not.toContain("Drop between rows");
    expect(estimateTree).not.toContain("Drop inside");
    expect(estimateTree).not.toContain("moveEstimateNode");
    expect(estimateTree).not.toContain("Move tree node");
    expect(estimateTree).not.toContain("MoveEstimateNodeForm");
    expect(estimateTree).not.toContain("Move node");
    expect(estimateTree).not.toContain("ArrowsOutSimple");
    // One neutral node glyph (Circle) replaces the FolderSimple/MapPin
    // group-vs-area split (P4 single-node model).
    expect(estimateTree).toContain("Circle");
    expect(estimateTree).not.toContain("FolderSimple");
    expect(estimateTree).not.toContain("HouseLine");
    expect(estimateTree).not.toContain("Stack,");
    expect(estimateTree).toContain("StackPlus");
    expect(estimateTree).not.toContain("Files");
    expect(estimateTree).not.toContain("border border-hairline bg-white text-tertiary");
    expect(estimateTree).not.toContain("context.isSelected || isRouteSelected");
    expect(estimateTree).not.toContain("DotsSixVertical");
    expect(estimateTree).not.toContain("size-1 rounded-full bg-tertiary");
    expect(estimateTree).not.toContain("border-l border-divider");
    expect(estimateTree).not.toContain("sampleEstimateTree");
    expect(estimateContent).toContain("nodes = sampleEstimateTree");
  });

  it("keeps scalar tree rename reconciliation client-local instead of full-tree route refresh", () => {
    const renameStart = estimateTree.indexOf("const commitRenameNode = useCallback");
    const deleteStart = estimateTree.indexOf("const replaceEstimateRoute =");
    const renameBlock = estimateTree.slice(renameStart, deleteStart);
    const renameActionStart = estimateActions.indexOf("export async function renameEstimateNode");
    const deleteActionStart = estimateActions.indexOf("export async function deleteEstimateNode");
    const renameActionBlock = estimateActions.slice(renameActionStart, deleteActionStart);

    // Renames fired right after a create resolve the optimistic id to the
    // server id before hitting the server action.
    expect(renameBlock).toContain("const serverNodeId = await resolveServerNodeId(node.id);");
    expect(renameBlock).toContain("renameEstimateNode(projectId, estimateId, serverNodeId, nextName)");
    expect(renameBlock).not.toContain("confirmed.tree");
    expect(renameActionBlock).toContain("return { nodeId: node.id, name }");
    expect(renameActionBlock).not.toContain("revalidatePath(");
    expect(renameActionBlock).not.toContain("getProjectEstimateTreeByEstimate(");
  });

  it("publishes estimate sheet metadata while keeping the estimates route row removed", () => {
    const metadataStrip = readFileSync("src/components/workshop/ProjectEstimateMetadataStrip.tsx", "utf8");
    const projectWorkspaceHeaderRow = readFileSync("src/components/workshop/ProjectWorkspaceHeaderRow.tsx", "utf8");
    const estimateCenterColumnBoundary = readFileSync("src/components/workshop/EstimateCenterColumnBoundary.tsx", "utf8");

    expect(estimateNodePage).toContain("ProjectEstimateMetadataPublisher");
    expect(estimateNodePage).toContain("projectName: project.name");
    expect(estimateNodePage).toContain("estimateName: estimate.name");
    expect(estimateNodePage).toContain("estimateSheetCode: estimate.sheet_code");
    expect(estimateNodePage).toContain("projectBudget: estimate.project_budget");
    expect(estimateNodePage).toContain("const estimateVersionLabel = readEstimateVersionLabel(estimate.metadata);");
    expect(readFileSync("src/app/workshop/projects/[projectId]/layout.tsx", "utf8")).toContain("centerHeader={<ProjectEstimateMetadataStrip />}");
    expect(projectWorkspaceHeaderRow).toContain("const isEstimatesRoute");
    expect(projectWorkspaceHeaderRow).toContain("if (isEstimatesRoute) return null;");
    expect(projectWorkspaceHeaderRow).not.toContain('centerId="project-estimate-metadata-strip"');
    expect(projectWorkspaceHeaderRow).not.toContain('centerDataColumn="metadata-strip"');
    expect(projectWorkspaceHeaderRow).not.toContain('scope="project-workspace-row"');
    expect(projectWorkspaceHeaderRow).not.toContain('data-estimate-center-column={centerDataColumn}');
    expect(metadataStrip).toContain('data-workshop-layout="project-estimate-metadata-row"');
    expect(metadataStrip).toContain("ProjectEstimateMetadataStripGrid");
    expect(metadataStrip).toContain('text-[10px] font-medium tracking-normal text-ink');
    expect(metadataStrip).toContain("EstimateSheetNameCell");
    expect(metadataStrip).toContain("dispatchProjectBudgetChange(projectBudget ?? 0)");
    expect(metadataStrip).toContain("estimateNameKey");
    expect(metadataStrip).not.toContain("EstimateVersionCell");
    expect(metadataStrip).toContain("place-items-center");
    expect(metadataStrip).toContain("text-center");
    expect(metadataStrip).toContain("text-ink");
    expect(metadataStrip).toContain("items-center gap-1");
    expect(estimateCenterColumnBoundary).toContain('"project-workspace-row"');
    expect(estimateContent).toContain("<TreePanelHeader");
    expect(estimateContent).toContain('searchPlaceholder="Search Tab"');
    expect(estimateContent).toContain("filterEstimateSheetNode");
    expect(estimateContent).toContain('id="estimate-sheet-center-column"');
  });

  it("repository validates node ownership through project-scoped estimate join", () => {
    expect(workspaceRepository).toContain("estimates!inner");
    expect(workspaceRepository).toContain('.eq("estimates.project_id", project.id)');
    expect(workspaceRepository).toContain("return getProjectEstimateTreeByEstimate(projectId, nodeId)");
    expect(workspaceRepository).toContain("buildEstimateTree");
  });

  it("opens empty estimates by estimate id instead of looping back to the estimate list", () => {
    expect(readFileSync("src/components/workshop/EstimateListCard.tsx", "utf8")).toContain('`/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`');
    // Empty-tree copy de-kinded by P4 ("Add a Group Node or Area Node" → one
    // kind-neutral line). Asserts the empty state still renders, with the new
    // single-node copy.
    expect(estimateTree).toContain("This estimate is empty. Add an area to begin.");
    expect(estimateTree).not.toContain("This estimate has no tree nodes yet");
    expect(estimateTree).toContain("selectedNodeId: string | null");
    expect(estimateContent).toContain("selectedNodeId: string | null");
    expect(estimateContent).toContain("No estimate tree yet");
    expect(estimateContent).toContain("estimateTree.reduce");
  });

  it("persists component-library area inserts through a project-scoped server action", () => {
    expect(estimateContent).toContain("useEstimateRowMutations");
    expect(estimateContent).toContain("projectId?: string");
    expect(estimateContent).toContain("estimateId?: string");
    expect(estimateNodePage).toContain("projectId={project.id}");
    expect(estimateNodePage).toContain("estimateId={estimate.id}");
    expect(estimateActions).toContain("insertEstimateRowItemFromLibrary");
    // P6: rows insert into ANY node — the row-insert target is no longer gated
    // on `.eq("kind", "area")`. Existence/orphan safety stays via the
    // estimate/project scoping and the relaxed RPC.
    expect(estimateActions).not.toContain('.eq("kind", "area")');
    expect(estimateActions).toContain('.eq("estimates.project_id", project.id)');
    expect(estimateActions).toContain("getSourceLibraryItemId");
    expect(estimateActions).toContain("isUuid(libraryItem.id)");
    expect(estimateActions).toContain("const persistedRowId = isUuid(rowId) ? rowId : randomUUID();");
    expect(estimateActions).toContain("id: persistedRowId");
    expect(estimateActions).toContain('linkState: sourceLibraryItemId ? "linked-clean" : "unlinked"');
    expect(estimateActions).toContain("insert_estimate_row_item_with_history");
    expect(estimateActions).toContain("updateEstimateRowItem");
    expect(estimateActions).toContain("replaceEstimateRowItemWithLibrary");
    expect(estimateActions).toContain("deleteEstimateRowItem");
    expect(estimateActions).toContain("createEstimateNode");
    // P6: the kind-based nesting guard (canNestEstimateNodeKind) is deleted from
    // the create + reorder server actions — any node may parent any node.
    expect(estimateActions).not.toContain("canNestEstimateNodeKind");
    expect(estimateActions).toContain('return "group"');
    expect(estimateActions).toContain('kind: "group"');
    expect(estimateActions).toContain('.from("estimate_nodes").insert');
    expect(estimateActions).not.toContain("moveEstimateNode");
    expect(estimateActions).not.toContain("buildEstimateNodeMovePlan");
    expect(estimateActions).not.toContain('.rpc("move_estimate_nodes"');
    expect(estimateContent).toContain("onUpdateRowItem");
    expect(estimateContent).toContain("replaceRow({ projectId, estimateId");
    expect(estimateContent).toContain("deleteRow({ projectId, estimateId");
    expect(estimateContent).toContain("useEstimateAreaTreeQuery");
    expect(readFileSync("src/hooks/use-estimate-query.ts", "utf8")).toContain("estimateQueryKeys.areaTree");
    expect(estimateContent).toContain("rollback: () => restoreEstimateState");
  });

  it("keeps row save state out of the visible sheet while preserving passive mutation invalidation and focus reconciliation", () => {
    expect(estimateContent).toContain("onMarkRowDirty");
    expect(estimateContent).not.toContain("RowSaveStatus");
    expect(estimateContent).not.toContain("EstimateSaveStatus");
    expect(estimateContent).not.toContain("refetchOnWindowFocus: true");
    expect(readFileSync("src/hooks/use-estimate-query.ts", "utf8")).toContain("prepareOptimisticUpdate");
    expect(estimateActions).toContain("fetchEstimateTree");
    expect(estimateActions).toContain("getProjectEstimateTreeByEstimate");
    expect(readFileSync("src/hooks/use-estimate-row-mutations.ts", "utf8")).toContain('refetchType: "none"');
  });
});
