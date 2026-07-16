"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";

import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import type {
  ProjectReusableEstimateSource,
  ProjectSourceInsertTarget,
  ReusableEstimateSource,
} from "@/lib/reusable-sources/types";
import {
  EMPTY_COMPONENT_FACET_FILTERS,
  type ComponentFacetFilters,
} from "@/components/workshop/library/component-facet-filter-model";
import type { ComponentViewMode } from "../component-library-manager/library-folder-tree-shared";
import type { EstimateRowItem } from "../estimate-tree-data";
import { getComponentDesignation, getComponentDiscipline } from "./helpers";
import type { EstimateTemplate } from "./templates";
import {
  buildLibraryTreeWithComponentRows,
  buildProjectComponentTree,
  splitSidebarComponentItems,
  type ComponentLibrarySupplierOption,
} from "./tree/buildLibraryTree";
import {
  templatesTreeCategoryId,
  templatesTreeSectionId,
} from "./tree/TemplatesTreeModel";
import { getAllNodeIds, type LibraryTreeOrder } from "./tree/helpers";

export type EstimateLibraryTab = "components" | "project" | "templates";
export type TemplateSourceFilter = "all" | "custom" | "projects";
export type LibraryEditingFolderMode = "create" | "rename" | null;

const EMPTY_LIBRARY_TREE_ORDER: Record<ComponentViewMode, LibraryTreeOrder> = { default: {}, suppliers: {}, brand: {} };

export function isEstimateLibraryTab(value: string | null | undefined): value is EstimateLibraryTab {
  return value === "components" || value === "project" || value === "templates";
}

export function resolveVisibleEstimateLibraryTab(
  value: string | null | undefined,
  visibleTabs: readonly EstimateLibraryTab[],
  fallback: EstimateLibraryTab = "components",
): EstimateLibraryTab {
  const fallbackTab = visibleTabs.includes(fallback) ? fallback : visibleTabs[0] ?? "components";
  return isEstimateLibraryTab(value) && visibleTabs.includes(value) ? value : fallbackTab;
}

export type EstimateRightSidebarChromeState = {
  activeTab: EstimateLibraryTab;
  searchQuery: string;
  searchOpen: boolean;
  previewItemId: string | null;
  previewProjectSourceKey: string | null;
};

export type EstimateRightSidebarLibraryState = {
  recentIds: string[];
  libraryItems: EstimateRowItem[];
  componentViewMode: ComponentViewMode;
  viewModeMenuOpen: boolean;
  expandedNodeIdsByViewMode: Record<ComponentViewMode, string[]>;
  bulkSelectedNodeIds: Set<string>;
  bulkDeleteConfirmOpen: boolean;
  customOrderByViewMode: Record<ComponentViewMode, LibraryTreeOrder>;
  addComponentOpen: boolean;
  deleteCandidate: EstimateRowItem | null;
  insertQuantity: number;
  facetFilters: ComponentFacetFilters;
  localLibraryFolders: LibraryFolderRecord[];
  pendingLibraryFolder: LibraryFolderRecord | null;
  editingFolderId: string | null;
  editingFolderName: string;
  editingFolderMode: LibraryEditingFolderMode;
  createFolderPending: boolean;
};

export type EstimateRightSidebarProjectState = {
  projectExpandedNodeIds: string[];
};

export type EstimateRightSidebarTemplatesState = {
  templateList: EstimateTemplate[];
  loadedProjectSources: ReusableEstimateSource[];
  templateSourceFilter: TemplateSourceFilter;
  projectSourcesLoading: boolean;
  projectSourceSearchResults: ProjectReusableEstimateSource[];
  projectEstimateLoadingProjectIds: string[];
  projectOutlineLoadingEstimateIds: string[];
  templatesExpandedIds: string[];
  addTemplateOpen: boolean;
  customTemplateGroups: string[];
  templateSourceNodeId: string | null;
  templateSourceProjectSource: ProjectSourceInsertTarget | null;
  templateDefaultCategory: string | null;
  renameTemplateTarget: EstimateTemplate | null;
  renameTemplateName: string;
  renameTemplateError: string;
  renameTemplatePending: boolean;
  deleteTemplateTarget: EstimateTemplate | null;
  deleteTemplateError: string;
  deleteTemplatePending: boolean;
};

type SidebarFieldSetter<State extends object> = <Field extends keyof State>(
  field: Field,
  value: SetStateAction<State[Field]>,
) => void;

type StateSetters<State extends object> = {
  [Field in keyof State as `set${Capitalize<string & Field>}`]: (value: SetStateAction<State[Field]>) => void;
};

type EstimateRightSidebarInit = {
  initialLibraryItems: EstimateRowItem[];
  templates: EstimateTemplate[];
  projectSources: ReusableEstimateSource[];
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplierOption[];
  brands: ComponentLibraryBrand[];
  libraryFolders: LibraryFolderRecord[];
};

type LibraryTabInit = Pick<
  EstimateRightSidebarInit,
  "initialLibraryItems" | "categoryTree" | "suppliers" | "brands" | "libraryFolders"
>;

type ProjectTabInit = Pick<EstimateRightSidebarInit, "initialLibraryItems" | "libraryFolders">;
type TemplatesTabInit = Pick<EstimateRightSidebarInit, "templates" | "projectSources">;

function useSidebarSlice<State extends object>(initializer: () => State) {
  const [state, setState] = useState(initializer);
  const setField = useCallback<SidebarFieldSetter<State>>((field, value) => {
    setState((current) => {
      const currentValue = current[field];
      const nextValue = typeof value === "function"
        ? (value as (currentFieldValue: State[typeof field]) => State[typeof field])(currentValue)
        : value;
      if (Object.is(currentValue, nextValue)) return current;
      return { ...current, [field]: nextValue };
    });
  }, []);
  return [state, setField] as const;
}

function bindSidebarSetters<State extends object>(
  fields: readonly (keyof State)[],
  setField: SidebarFieldSetter<State>,
) {
  const setters = {} as StateSetters<State>;
  for (const field of fields) {
    const setterName = `set${String(field).charAt(0).toUpperCase()}${String(field).slice(1)}` as keyof StateSetters<State>;
    setters[setterName] = ((value: SetStateAction<State[typeof field]>) => setField(field, value)) as StateSetters<State>[typeof setterName];
  }
  return setters;
}

function createInitialChromeState(initialActiveTab: EstimateLibraryTab = "components"): EstimateRightSidebarChromeState {
  return {
    activeTab: initialActiveTab,
    searchQuery: "",
    searchOpen: false,
    previewItemId: null,
    previewProjectSourceKey: null,
  };
}

function createInitialLibraryTabState({
  initialLibraryItems,
  categoryTree,
  suppliers,
  brands,
  libraryFolders,
}: LibraryTabInit): EstimateRightSidebarLibraryState {
  const splitItems = splitSidebarComponentItems(initialLibraryItems);
  return {
    recentIds: [],
    libraryItems: hydrateSidebarLibraryItems(initialLibraryItems),
    componentViewMode: "default",
    viewModeMenuOpen: false,
    expandedNodeIdsByViewMode: {
      default: getAllNodeIds(buildLibraryTreeWithComponentRows("categories", splitItems.libraryItems, [], [], { categoryTree, suppliers, libraryFolders, pruneEmptyFolders: true })),
      suppliers: [],
      brand: getAllNodeIds(buildLibraryTreeWithComponentRows("brands", splitItems.libraryItems, [], [], { categoryTree, suppliers, brands, pruneEmptyFolders: true })),
    },
    bulkSelectedNodeIds: new Set(),
    bulkDeleteConfirmOpen: false,
    customOrderByViewMode: EMPTY_LIBRARY_TREE_ORDER,
    addComponentOpen: false,
    deleteCandidate: null,
    insertQuantity: 1,
    facetFilters: EMPTY_COMPONENT_FACET_FILTERS,
    localLibraryFolders: libraryFolders,
    pendingLibraryFolder: null,
    editingFolderId: null,
    editingFolderName: "",
    editingFolderMode: null,
    createFolderPending: false,
  };
}

function createInitialProjectTabState({ initialLibraryItems, libraryFolders }: ProjectTabInit): EstimateRightSidebarProjectState {
  return {
    projectExpandedNodeIds: getAllNodeIds(buildProjectComponentTree(splitSidebarComponentItems(initialLibraryItems).projectItems, { libraryFolders })),
  };
}

function createInitialTemplatesTabState({
  templates,
  projectSources,
}: TemplatesTabInit): EstimateRightSidebarTemplatesState {
  return {
    templateList: templates,
    loadedProjectSources: projectSources,
    templateSourceFilter: "all",
    projectSourcesLoading: false,
    projectSourceSearchResults: [],
    projectEstimateLoadingProjectIds: [],
    projectOutlineLoadingEstimateIds: [],
    templatesExpandedIds: getInitialTemplatesExpandedIds(templates),
    addTemplateOpen: false,
    customTemplateGroups: [],
    templateSourceNodeId: null,
    templateSourceProjectSource: null,
    templateDefaultCategory: null,
    renameTemplateTarget: null,
    renameTemplateName: "",
    renameTemplateError: "",
    renameTemplatePending: false,
    deleteTemplateTarget: null,
    deleteTemplateError: "",
    deleteTemplatePending: false,
  };
}

export function hydrateSidebarLibraryItems(items: EstimateRowItem[]): EstimateRowItem[] {
  return items.map((item, index) => ({
    ...item,
    createdAt: item.createdAt ?? new Date(Date.now() - (index % 18) * 86400000).toISOString(),
    discipline: getComponentDiscipline(item),
    designation: getComponentDesignation(item),
    tags: item.tags ?? [item.category, item.supplier, getComponentDiscipline(item)].filter(Boolean),
  }));
}

export function getInitialTemplatesExpandedIds(templates: EstimateTemplate[]) {
  return Array.from(new Set([
    templatesTreeSectionId("custom-templates"),
    templatesTreeSectionId("projects"),
    ...templates.map((template) => templatesTreeCategoryId(template.category)),
  ]));
}

export function useEstimateRightSidebarChromeState(initialActiveTab?: EstimateLibraryTab) {
  const [state, setField] = useSidebarSlice(() => createInitialChromeState(initialActiveTab));
  const actions = useMemo(
    () => bindSidebarSetters<EstimateRightSidebarChromeState>(
      ["activeTab", "searchQuery", "searchOpen", "previewItemId", "previewProjectSourceKey"],
      setField,
    ),
    [setField],
  );
  return { state, actions };
}

export function useLibraryTabState(init: LibraryTabInit) {
  const [state, setField] = useSidebarSlice(() => createInitialLibraryTabState(init));
  const actions = useMemo(
    () => bindSidebarSetters<EstimateRightSidebarLibraryState>(
      [
        "recentIds",
        "libraryItems",
        "componentViewMode",
        "viewModeMenuOpen",
        "expandedNodeIdsByViewMode",
        "bulkSelectedNodeIds",
        "bulkDeleteConfirmOpen",
        "customOrderByViewMode",
        "addComponentOpen",
        "deleteCandidate",
        "insertQuantity",
        "facetFilters",
        "localLibraryFolders",
        "pendingLibraryFolder",
        "editingFolderId",
        "editingFolderName",
        "editingFolderMode",
        "createFolderPending",
      ],
      setField,
    ),
    [setField],
  );
  return { state, actions };
}

export function useProjectTabState(init: ProjectTabInit) {
  const [state, setField] = useSidebarSlice(() => createInitialProjectTabState(init));
  const actions = useMemo(
    () => bindSidebarSetters<EstimateRightSidebarProjectState>(["projectExpandedNodeIds"], setField),
    [setField],
  );
  return { state, actions };
}

export function useTemplatesTabState(init: TemplatesTabInit) {
  const syncedTemplatesRef = useRef(init.templates);
  const optimisticTemplateIdsRef = useRef(new Set<string>());
  const deletedTemplateIdsRef = useRef(new Set<string>());
  const [state, setField] = useSidebarSlice(() => createInitialTemplatesTabState(init));
  useEffect(() => {
    if (syncedTemplatesRef.current === init.templates) return;
    syncedTemplatesRef.current = init.templates;
    const optimisticTemplateIds = new Set(optimisticTemplateIdsRef.current);
    const deletedTemplateIds = new Set(deletedTemplateIdsRef.current);
    const propIds = new Set(init.templates.map((template) => template.id));
    setField("templateList", (current) => {
      const incomingTemplates = init.templates.filter((template) => !deletedTemplateIds.has(template.id));
      const optimisticOnly = current.filter((template) =>
        optimisticTemplateIds.has(template.id)
        && !propIds.has(template.id)
        && !deletedTemplateIds.has(template.id));
      return optimisticOnly.length > 0 ? [...incomingTemplates, ...optimisticOnly] : incomingTemplates;
    });
    propIds.forEach((templateId) => optimisticTemplateIdsRef.current.delete(templateId));
  }, [init.templates, setField]);
  const upsertTemplateLocally = useCallback((template: EstimateTemplate) => {
    deletedTemplateIdsRef.current.delete(template.id);
    optimisticTemplateIdsRef.current.add(template.id);
    setField("templateList", (current) => [...current.filter((entry) => entry.id !== template.id), template]);
  }, [setField]);
  const removeTemplateLocally = useCallback((templateId: string) => {
    optimisticTemplateIdsRef.current.delete(templateId);
    deletedTemplateIdsRef.current.add(templateId);
    setField("templateList", (current) => current.filter((template) => template.id !== templateId));
  }, [setField]);
  const actions = useMemo(
    () => ({
      ...bindSidebarSetters<EstimateRightSidebarTemplatesState>(
        [
          "templateList",
          "loadedProjectSources",
          "templateSourceFilter",
          "projectSourcesLoading",
          "projectSourceSearchResults",
          "projectEstimateLoadingProjectIds",
          "projectOutlineLoadingEstimateIds",
          "templatesExpandedIds",
          "addTemplateOpen",
          "customTemplateGroups",
          "templateSourceNodeId",
          "templateSourceProjectSource",
          "templateDefaultCategory",
          "renameTemplateTarget",
          "renameTemplateName",
          "renameTemplateError",
          "renameTemplatePending",
          "deleteTemplateTarget",
          "deleteTemplateError",
          "deleteTemplatePending",
        ],
        setField,
      ),
      upsertTemplateLocally,
      removeTemplateLocally,
    }),
    [removeTemplateLocally, setField, upsertTemplateLocally],
  );
  return { state, actions };
}
