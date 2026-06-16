import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServerClient = vi.hoisted(() => vi.fn());
const ensureDefaultWorkspace = vi.hoisted(() => vi.fn(async () => {
  throw new Error("Draft read tools must not bootstrap or mutate workspaces.");
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace,
}));

import { readPackageBuilderTools } from "@/lib/ai/package-builder/read-tools";

const userContext = {
  userId: "44444444-4444-4444-8444-444444444444",
  email: "user@example.com",
  workspaceId: "55555555-5555-4555-8555-555555555555",
  authMode: "supabase" as const,
};

const routeProjectId = "11111111-1111-4111-8111-111111111111";
const routeEstimateId = "22222222-2222-4222-8222-222222222222";
const routeGroupNodeId = "33333333-3333-4333-8333-333333333333";
const routeAreaNodeId = "44444444-4444-4444-8444-444444444444";
const routeActiveTabId = "12121212-1212-4121-8121-121212121212";
const routeOtherTabId = "34343434-3434-4343-8343-343434343434";
const selectedRouteEstimateId = "66666666-6666-4666-8666-666666666666";
const selectedRouteGroupNodeId = "77777777-7777-4777-8777-777777777777";
const selectedRouteAreaNodeId = "88888888-8888-4888-8888-888888888888";
const selectedRouteActiveTabId = "56565656-5656-4565-8565-565656565656";
const otherProjectId = "99999999-9999-4999-8999-999999999999";
const otherEstimateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherAreaNodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makeEmptyReadClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === "workspaces") {
        return {
          select: vi.fn((columns: string) => {
            expect(columns).toBe("name");
            const builder = {
              eq: vi.fn((column: string, value: string) => {
                expect(column).toBe("id");
                expect(value).toBe(userContext.workspaceId);
                return builder;
              }),
              maybeSingle: vi.fn(async () => ({
                data: { name: "Readonly Workspace" },
                error: null,
              })),
            };
            return builder;
          }),
        };
      }
      if (table === "projects") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn((column: string, value: string) => {
                expect(column).toBe("workspace_id");
                expect(value).toBe(userContext.workspaceId);
                return builder;
              }),
              order: vi.fn(() => builder),
              limit: vi.fn(async () => ({ data: [], error: null })),
            };
            return builder;
          }),
        };
      }
      if (table === "cost_library_items") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn(() => builder),
              neq: vi.fn(() => builder),
              or: vi.fn(() => builder),
              limit: vi.fn(async () => ({ data: [], error: null })),
            };
            return builder;
          }),
        };
      }
      if (table === "estimate_templates") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn(() => builder),
              or: vi.fn(() => builder),
              order: vi.fn(() => builder),
              limit: vi.fn(async () => ({ data: [], error: null })),
            };
            return builder;
          }),
        };
      }
      throw new Error(`Unexpected table read: ${table}`);
    }),
  };
}

function makeMemoryReadClient(observed: {
  filters: Array<{ table: string; method: string; column?: string; value?: unknown }>;
  limits: Array<{ table: string; limit: number }>;
}) {
  const base = makeEmptyReadClient();
  return {
    from: vi.fn((table: string) => {
      if (table === "ai_package_builder_memory_preferences") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn((column: string, value: string) => {
                observed.filters.push({ table, method: "eq", column, value });
                return builder;
              }),
              order: vi.fn(() => builder),
              limit: vi.fn(async (limit: number) => {
                observed.limits.push({ table, limit });
                return {
                  data: [
                    {
                      signal: "accepted",
                      source_type: "library_item",
                      source_id: "11111111-1111-4111-8111-111111111111",
                      source_label: "Preferred bedroom bed frame",
                      room_name: "Bedroom 1",
                      operation_type: "insert_component_row",
                      weight: 1,
                      created_at: "2026-05-28T00:00:00.000Z",
                    },
                    {
                      signal: "rejected",
                      source_type: "template",
                      source_id: "22222222-2222-4222-8222-222222222222",
                      source_label: "Rejected Condo Starter",
                      room_name: null,
                      operation_type: "insert_template",
                      weight: 1,
                      created_at: "2026-05-27T00:00:00.000Z",
                    },
                  ],
                  error: null,
                };
              }),
            };
            return builder;
          }),
        };
      }
      return base.from(table);
    }),
  };
}

function makeRouteReadClient() {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn((columns: string) => {
        const builder = {
          eq: vi.fn(() => builder),
          in: vi.fn(() => builder),
          neq: vi.fn(() => builder),
          or: vi.fn(() => builder),
          order: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => {
            if (table === "workspaces") return { data: { name: "Readonly Workspace" }, error: null };
            if (table === "projects") {
              return {
                data: {
                  id: routeProjectId,
                  name: "Lewis Residence",
                  client_name: "Lewis",
                  location: "Manila",
                  project_code: "LR",
                  updated_at: "2026-05-28T00:00:00.000Z",
                },
                error: null,
              };
            }
            if (table === "estimates") {
              return {
                data: {
                  id: routeEstimateId,
                  project_id: routeProjectId,
                  name: "Initial Estimate",
                  sheet_code: "ES-001",
                },
                error: null,
              };
            }
            throw new Error(`Unexpected maybeSingle table: ${table}`);
          }),
          limit: vi.fn(async () => {
            if (table === "projects") {
              return {
                data: [
                  {
                    id: routeProjectId,
                    name: "Lewis Residence",
                    client_name: "Lewis",
                    location: "Manila",
                    project_code: "LR",
                    updated_at: "2026-05-28T00:00:00.000Z",
                  },
                ],
                error: null,
              };
            }
            if (table === "estimates") {
              return {
                data: [{ id: routeEstimateId, project_id: routeProjectId, name: "Initial Estimate", sheet_code: "ES-001" }],
                error: null,
              };
            }
            if (table === "estimate_nodes" && columns.includes("parent_id")) {
              return {
                data: [
                  { id: routeGroupNodeId, estimate_id: routeEstimateId, parent_id: null, kind: "group", name: "House", sort_order: 0 },
                  { id: routeAreaNodeId, estimate_id: routeEstimateId, parent_id: routeGroupNodeId, kind: "area", name: "Bedroom 1", sort_order: 0 },
                ],
                error: null,
              };
            }
            if (table === "estimate_nodes") {
              return {
                data: [
                  { id: routeGroupNodeId, estimate_id: routeEstimateId, kind: "group", sort_order: 0 },
                  { id: routeAreaNodeId, estimate_id: routeEstimateId, kind: "area", sort_order: 0 },
                ],
                error: null,
              };
            }
            if (table === "estimate_row_items" && columns.includes("description")) {
              return {
                data: [
                  {
                    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                    estimate_id: routeEstimateId,
                    node_id: routeAreaNodeId,
                    material: "Prior estimate bed",
                    description: "Prior row from the other sheet.",
                    supplier: "Prior Supplier",
                    quantity: 1,
                    unit: "pc",
                    unit_cost: 10_000,
                    contingency_percentage: 0,
                    misc_cost: 0,
                    source_library_item_id: null,
                    updated_at: "2026-05-27T00:00:00.000Z",
                  },
                ],
                error: null,
              };
            }
            if (table === "estimate_row_items" && columns.includes("description")) {
              return {
                data: [
                  {
                    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                    estimate_id: routeEstimateId,
                    node_id: routeAreaNodeId,
                    material: "Prior estimate bed",
                    description: "Prior row from the other sheet.",
                    supplier: "Prior Supplier",
                    quantity: 1,
                    unit: "pc",
                    unit_cost: 10_000,
                    contingency_percentage: 0,
                    misc_cost: 0,
                    source_library_item_id: null,
                    updated_at: "2026-05-27T00:00:00.000Z",
                  },
                ],
                error: null,
              };
            }
            if (table === "estimate_row_items" && columns.includes("node_id")) {
              return {
                data: [
                  {
                    id: "55555555-5555-4555-8555-555555555555",
                    estimate_id: routeEstimateId,
                    node_id: routeAreaNodeId,
                    material: "Existing bed",
                    quantity: 1,
                    unit: "pc",
                    unit_cost: 10_000,
                    contingency_percentage: 0,
                    misc_cost: 0,
                    row_revision: 3,
                    source_library_item_id: null,
                  },
                ],
                error: null,
              };
            }
            if (table === "estimate_row_items") {
              return {
                data: [{ estimate_id: routeEstimateId, quantity: 1, unit_cost: 10_000, contingency_percentage: 0, misc_cost: 0 }],
                error: null,
              };
            }
            if (table === "cost_library_items" || table === "estimate_templates") {
              return { data: [], error: null };
            }
            throw new Error(`Unexpected limit table: ${table}`);
          }),
        };
        return builder;
      }),
    })),
  };
}

function makeSelectedNodeRouteReadClient(observed: {
  filters: Array<{ table: string; method: string; column?: string; value?: unknown }>;
}) {
  const projectRow = {
    id: routeProjectId,
    name: "Lewis Residence",
    client_name: "Lewis",
    location: "Manila",
    project_code: "LR",
    updated_at: "2026-05-28T00:00:00.000Z",
  };
  const routeEstimate = {
    id: routeEstimateId,
    project_id: routeProjectId,
    name: "First Estimate",
    sheet_code: "ES-001",
    updated_at: "2026-05-27T00:00:00.000Z",
  };
  const selectedEstimate = {
    id: selectedRouteEstimateId,
    project_id: routeProjectId,
    name: "Selected Estimate",
    sheet_code: "ES-002",
    updated_at: "2026-05-28T00:00:00.000Z",
  };

  return {
    from: vi.fn((table: string) => ({
      select: vi.fn((columns: string) => {
        const filters = { eq: {} as Record<string, unknown>, in: {} as Record<string, unknown[]> };
        const builder = {
          eq: vi.fn((column: string, value: unknown) => {
            observed.filters.push({ table, method: "eq", column, value });
            filters.eq[column] = value;
            return builder;
          }),
          in: vi.fn((column: string, value: unknown[]) => {
            observed.filters.push({ table, method: "in", column, value });
            filters.in[column] = value;
            return builder;
          }),
          neq: vi.fn(() => builder),
          or: vi.fn((value: unknown) => {
            observed.filters.push({ table, method: "or", value });
            return builder;
          }),
          order: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => {
            if (table === "workspaces") return { data: { name: "Readonly Workspace" }, error: null };
            if (table === "projects") return { data: filters.eq.id === routeProjectId ? projectRow : null, error: null };
            if (table === "estimate_nodes") {
              return {
                data: filters.eq.id === selectedRouteAreaNodeId
                  ? { id: selectedRouteAreaNodeId, estimate_id: selectedRouteEstimateId, estimate_tab_id: selectedRouteActiveTabId }
                  : null,
                error: null,
              };
            }
            if (table === "estimates") {
              const estimate = [routeEstimate, selectedEstimate].find((row) =>
                row.id === filters.eq.id && row.project_id === filters.eq.project_id
              ) ?? null;
              return { data: estimate, error: null };
            }
            throw new Error(`Unexpected selected-node maybeSingle table: ${table}`);
          }),
          limit: vi.fn(async () => {
            if (table === "projects") return { data: [projectRow], error: null };
            if (table === "estimates") return { data: [routeEstimate, selectedEstimate], error: null };
            if (table === "estimate_nodes" && columns.includes("parent_id")) {
              const estimateIds = filters.in.estimate_id ?? (filters.eq.estimate_id ? [filters.eq.estimate_id as string] : []);
              const activeTabFilter = filters.eq.estimate_tab_id as string | undefined;
              if (estimateIds.includes(selectedRouteEstimateId)) {
                const nodes = [
                  { id: selectedRouteGroupNodeId, estimate_id: selectedRouteEstimateId, estimate_tab_id: selectedRouteActiveTabId, parent_id: null, kind: "group", name: "House", sort_order: 0 },
                  { id: selectedRouteAreaNodeId, estimate_id: selectedRouteEstimateId, estimate_tab_id: selectedRouteActiveTabId, parent_id: selectedRouteGroupNodeId, kind: "area", name: "Selected Bedroom", sort_order: 0 },
                  { id: "99999999-8888-4888-8888-999999999999", estimate_id: selectedRouteEstimateId, estimate_tab_id: routeOtherTabId, parent_id: null, kind: "group", name: "Other Selected Tab", sort_order: 1 },
                ];
                return { data: nodes.filter((node) => !activeTabFilter || node.estimate_tab_id === activeTabFilter), error: null };
              }
              if (estimateIds.includes(routeEstimateId)) {
                const nodes = [
                  { id: routeGroupNodeId, estimate_id: routeEstimateId, estimate_tab_id: routeActiveTabId, parent_id: null, kind: "group", name: "Active House", sort_order: 0 },
                  { id: routeAreaNodeId, estimate_id: routeEstimateId, estimate_tab_id: routeActiveTabId, parent_id: routeGroupNodeId, kind: "area", name: "Active Bedroom", sort_order: 0 },
                  { id: "abababab-abab-4aba-8aba-abababababab", estimate_id: routeEstimateId, estimate_tab_id: routeOtherTabId, parent_id: null, kind: "group", name: "Other Tab", sort_order: 1 },
                  { id: "cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd", estimate_id: routeEstimateId, estimate_tab_id: routeOtherTabId, parent_id: "abababab-abab-4aba-8aba-abababababab", kind: "area", name: "Other Bedroom", sort_order: 0 },
                ];
                return { data: nodes.filter((node) => !activeTabFilter || node.estimate_tab_id === activeTabFilter), error: null };
              }
              return { data: [], error: null };
            }
            if (table === "estimate_nodes") {
              return {
                data: [
                  { id: routeAreaNodeId, estimate_id: routeEstimateId, kind: "area", sort_order: 0 },
                  { id: selectedRouteAreaNodeId, estimate_id: selectedRouteEstimateId, kind: "area", sort_order: 0 },
                ],
                error: null,
              };
            }
            if (table === "estimate_row_items" && columns.includes("description")) {
              return {
                data: [
                  {
                    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                    estimate_id: routeEstimateId,
                    node_id: routeAreaNodeId,
                    material: "Prior estimate bed",
                    description: "Prior row from the other sheet.",
                    supplier: "Prior Supplier",
                    quantity: 1,
                    unit: "pc",
                    unit_cost: 10_000,
                    contingency_percentage: 0,
                    misc_cost: 0,
                    source_library_item_id: null,
                    updated_at: "2026-05-27T00:00:00.000Z",
                  },
                ],
                error: null,
              };
            }
            if (table === "estimate_row_items" && columns.includes("node_id")) {
              const rows = [
                {
                  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                  estimate_id: selectedRouteEstimateId,
                  node_id: selectedRouteAreaNodeId,
                  material: "Selected estimate bed",
                  quantity: 1,
                  unit: "pc",
                  unit_cost: 15_000,
                  contingency_percentage: 0,
                  misc_cost: 0,
                  row_revision: 5,
                  source_library_item_id: null,
                },
                {
                  id: "dddddddd-7777-4ddd-8ddd-dddddddd7777",
                  estimate_id: routeEstimateId,
                  node_id: routeAreaNodeId,
                  material: "Active tab bed",
                  quantity: 1,
                  unit: "pc",
                  unit_cost: 12_000,
                  contingency_percentage: 0,
                  misc_cost: 0,
                  row_revision: 2,
                  source_library_item_id: null,
                },
                {
                  id: "eeeeeeee-7777-4eee-8eee-eeeeeeee7777",
                  estimate_id: routeEstimateId,
                  node_id: "cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd",
                  material: "Other tab bed",
                  quantity: 1,
                  unit: "pc",
                  unit_cost: 99_000,
                  contingency_percentage: 0,
                  misc_cost: 0,
                  row_revision: 2,
                  source_library_item_id: null,
                },
              ];
              const nodeIds = filters.in.node_id;
              return {
                data: nodeIds ? rows.filter((row) => nodeIds.includes(row.node_id)) : rows,
                error: null,
              };
            }
            if (table === "estimate_row_items") {
              return {
                data: [
                  { estimate_id: routeEstimateId, quantity: 1, unit_cost: 10_000, contingency_percentage: 0, misc_cost: 0 },
                  { estimate_id: selectedRouteEstimateId, quantity: 1, unit_cost: 15_000, contingency_percentage: 0, misc_cost: 0 },
                ],
                error: null,
              };
            }
            if (table === "cost_library_items" || table === "estimate_templates") return { data: [], error: null };
            throw new Error(`Unexpected selected-node limit table: ${table}`);
          }),
        };
        return builder;
      }),
    })),
  };
}

function makeComponentReadClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === "workspaces") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn(() => builder),
              maybeSingle: vi.fn(async () => ({ data: { name: "Readonly Workspace" }, error: null })),
            };
            return builder;
          }),
        };
      }
      if (table === "projects" || table === "estimate_templates") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn(() => builder),
              or: vi.fn(() => builder),
              order: vi.fn(() => builder),
              limit: vi.fn(async () => ({ data: [], error: null })),
            };
            return builder;
          }),
        };
      }
      if (table === "cost_library_items") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn(() => builder),
              neq: vi.fn(() => builder),
              or: vi.fn(() => builder),
              limit: vi.fn(async () => ({
                data: [
                  {
                    id: "77777777-7777-4777-8777-777777777777",
                    name: "Bedroom bed frame",
                    description: "Bed for condo bedrooms.",
                    category: "Furniture",
                    category_node_id: null,
                    supplier: "Bedroom Supplier",
                    supplier_id: null,
                    brand: null,
                    brand_id: null,
                    unit: "pc",
                    unit_cost: 18_000,
                    misc_cost: 0,
                    lifecycle_state: "available",
                    current_version_number: 7,
                    active_price_option_id: "88888888-8888-4888-8888-888888888888",
                    confidence: "catalog",
                    workspace_id: userContext.workspaceId,
                  },
                ],
                error: null,
              })),
            };
            return builder;
          }),
        };
      }
      if (table === "cost_library_item_price_options") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn(() => builder),
              in: vi.fn(async () => ({ data: [], error: null })),
            };
            return builder;
          }),
        };
      }
      throw new Error(`Unexpected table read: ${table}`);
    }),
  };
}

function makeOrganizedComponentReadClient(observed: {
  selects: Array<{ table: string; columns: string }>;
  filters: Array<{ table: string; method: string; column?: string; value?: unknown }>;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "workspaces") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn(() => builder),
              maybeSingle: vi.fn(async () => ({ data: { name: "Readonly Workspace" }, error: null })),
            };
            return builder;
          }),
        };
      }
      if (table === "projects" || table === "estimate_templates") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn(() => builder),
              or: vi.fn(() => builder),
              order: vi.fn(() => builder),
              limit: vi.fn(async () => ({ data: [], error: null })),
            };
            return builder;
          }),
        };
      }
      if (table === "cost_library_items") {
        return {
          select: vi.fn((columns: string) => {
            observed.selects.push({ table, columns });
            const builder = {
              eq: vi.fn((column: string, value: string) => {
                observed.filters.push({ table, method: "eq", column, value });
                return builder;
              }),
              neq: vi.fn(() => builder),
              or: vi.fn(() => builder),
              limit: vi.fn(async () => ({
                data: [
                  {
                    id: "77777777-7777-4777-8777-777777777777",
                    name: "Bedroom bed frame",
                    description: "Bed for condo bedrooms.",
                    category: "Furniture",
                    category_node_id: "cat-bedroom-beds",
                    library_folder_id: "folder-bedroom-beds",
                    supplier: "Bedroom Supplier",
                    supplier_id: null,
                    brand: "Condo Brand",
                    brand_id: null,
                    unit: "pc",
                    unit_cost: 18_000,
                    misc_cost: 0,
                    lifecycle_state: "available",
                    current_version_number: 7,
                    active_price_option_id: "88888888-8888-4888-8888-888888888888",
                    confidence: "catalog",
                    workspace_id: userContext.workspaceId,
                  },
                ],
                error: null,
              })),
            };
            return builder;
          }),
        };
      }
      if (table === "cost_library_item_price_options") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq: vi.fn(() => builder),
              in: vi.fn(async () => ({ data: [], error: null })),
            };
            return builder;
          }),
        };
      }
      if (table === "component_category_nodes") {
        return {
          select: vi.fn((columns: string) => {
            observed.selects.push({ table, columns });
            const builder = {
              order: vi.fn(async () => ({
                data: [
                  {
                    id: "cat-objects",
                    parent_id: null,
                    label: "Objects",
                    node_type: "organizer",
                    sort_order: 0,
                    code: null,
                    metadata: {},
                  },
                  {
                    id: "cat-furniture",
                    parent_id: "cat-objects",
                    label: "Furniture",
                    node_type: "category",
                    sort_order: 0,
                    code: null,
                    metadata: {},
                  },
                  {
                    id: "cat-bedroom-beds",
                    parent_id: "cat-furniture",
                    label: "Bedroom Beds",
                    node_type: "subcategory",
                    sort_order: 0,
                    code: null,
                    metadata: {},
                  },
                ],
                error: null,
              })),
            };
            return builder;
          }),
        };
      }
      if (table === "library_folders") {
        return {
          select: vi.fn((columns: string) => {
            observed.selects.push({ table, columns });
            const builder = {
              eq: vi.fn((column: string, value: string) => {
                observed.filters.push({ table, method: "eq", column, value });
                return builder;
              }),
              order: vi.fn(() => builder),
              limit: vi.fn(async () => ({ data: [], error: null })),
              then: undefined,
            };
            builder.order = vi.fn((column: string) => {
              observed.filters.push({ table, method: "order", column });
              return {
                order: vi.fn(async () => ({
                  data: [
                    {
                      id: "folder-furniture",
                      workspace_id: userContext.workspaceId,
                      parent_id: null,
                      name: "Furniture",
                      sort_order: 0,
                      source_category_node_id: "cat-furniture",
                      folder_kind: "taxonomy",
                    },
                    {
                      id: "folder-bedroom-beds",
                      workspace_id: userContext.workspaceId,
                      parent_id: "folder-furniture",
                      name: "Bedroom Beds",
                      sort_order: 0,
                      source_category_node_id: "cat-bedroom-beds",
                      folder_kind: "taxonomy",
                    },
                  ],
                  error: null,
                })),
              };
            });
            return builder;
          }),
        };
      }
      throw new Error(`Unexpected table read: ${table}`);
    }),
  };
}

function makeHistoricalReadClient(observed: {
  limits: Array<{ table: string; limit: number }>;
  filters: Array<{ table: string; method: string; column?: string; value?: unknown }>;
}) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => {
        const builder = {
          eq: vi.fn((column: string, value: string) => {
            observed.filters.push({ table, method: "eq", column, value });
            return builder;
          }),
          in: vi.fn((column: string, value: string[]) => {
            observed.filters.push({ table, method: "in", column, value });
            return builder;
          }),
          neq: vi.fn(() => builder),
          or: vi.fn((value: string) => {
            observed.filters.push({ table, method: "or", value });
            return builder;
          }),
          order: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => {
            if (table === "workspaces") return { data: { name: "Readonly Workspace" }, error: null };
            if (table === "projects") {
              return {
                data: {
                  id: routeProjectId,
                  name: "Current Condo",
                  client_name: "Current",
                  location: "Makati",
                  project_code: "CUR",
                  updated_at: "2026-05-28T00:00:00.000Z",
                },
                error: null,
              };
            }
            if (table === "estimates") {
              return {
                data: { id: routeEstimateId, project_id: routeProjectId, name: "Current Estimate", sheet_code: "ES-001" },
                error: null,
              };
            }
            throw new Error(`Unexpected maybeSingle table: ${table}`);
          }),
          limit: vi.fn(async (limit: number) => {
            observed.limits.push({ table, limit });
            if (table === "projects") {
              return {
                data: [
                  {
                    id: routeProjectId,
                    name: "Current Condo",
                    client_name: "Current",
                    location: "Makati",
                    project_code: "CUR",
                    updated_at: "2026-05-28T00:00:00.000Z",
                  },
                  {
                    id: otherProjectId,
                    name: "Previous Condo Fitout",
                    client_name: "Prior",
                    location: "BGC",
                    project_code: "PRIOR",
                    updated_at: "2026-05-20T00:00:00.000Z",
                  },
                ],
                error: null,
              };
            }
            if (table === "estimates") {
              return {
                data: [
                  { id: routeEstimateId, project_id: routeProjectId, name: "Current Estimate", sheet_code: "ES-001" },
                  { id: otherEstimateId, project_id: otherProjectId, name: "Prior Condo Estimate", sheet_code: "ES-002" },
                ],
                error: null,
              };
            }
            if (table === "estimate_nodes") {
              return {
                data: [
                  { id: otherAreaNodeId, estimate_id: otherEstimateId, parent_id: null, kind: "area", name: "Bedroom", sort_order: 0 },
                ],
                error: null,
              };
            }
            if (table === "estimate_row_items") {
              return {
                data: [
                  {
                    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                    estimate_id: otherEstimateId,
                    node_id: otherAreaNodeId,
                    material: "Prior condo queen bed",
                    description: "Bed from a prior condo package.",
                    supplier: "Previous Supplier",
                    quantity: 1,
                    unit: "pc",
                    unit_cost: 21_000,
                    contingency_percentage: 0,
                    misc_cost: 0,
                    source_library_item_id: null,
                    updated_at: "2026-05-20T00:00:00.000Z",
                  },
                ],
                error: null,
              };
            }
            if (table === "cost_library_items" || table === "estimate_templates") {
              return { data: [], error: null };
            }
            throw new Error(`Unexpected limit table: ${table}`);
          }),
        };
        return builder;
      }),
    })),
  };
}

function makeComparablePackageReadClient(observed: {
  limits: Array<{ table: string; limit: number }>;
  filters: Array<{ table: string; method: string; column?: string; value?: unknown }>;
}, options: { includeUnrelatedEstimate?: boolean } = {}) {
  const priorKitchenNodeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const priorPowderRoomNodeId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const unrelatedProjectId = "12121212-1212-4121-8121-121212121212";
  const unrelatedEstimateId = "34343434-3434-4343-8343-343434343434";
  const unrelatedAreaNodeId = "56565656-5656-4565-8565-565656565656";
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => {
        const builder = {
          eq: vi.fn((column: string, value: string) => {
            observed.filters.push({ table, method: "eq", column, value });
            return builder;
          }),
          in: vi.fn((column: string, value: string[]) => {
            observed.filters.push({ table, method: "in", column, value });
            return builder;
          }),
          neq: vi.fn(() => builder),
          or: vi.fn((value: string) => {
            observed.filters.push({ table, method: "or", value });
            return builder;
          }),
          order: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => {
            if (table === "workspaces") return { data: { name: "Readonly Workspace" }, error: null };
            if (table === "projects") {
              return {
                data: {
                  id: routeProjectId,
                  name: "Current Condo",
                  client_name: "Current",
                  location: "Makati",
                  project_code: "CUR",
                  updated_at: "2026-05-28T00:00:00.000Z",
                },
                error: null,
              };
            }
            if (table === "estimates") {
              return {
                data: { id: routeEstimateId, project_id: routeProjectId, name: "Current Estimate", sheet_code: "ES-001" },
                error: null,
              };
            }
            throw new Error(`Unexpected comparable maybeSingle table: ${table}`);
          }),
          limit: vi.fn(async (limit: number) => {
            observed.limits.push({ table, limit });
            if (table === "projects") {
              const rows = [
                {
                  id: routeProjectId,
                  name: "Current Condo",
                  client_name: "Current",
                  location: "Makati",
                  project_code: "CUR",
                  updated_at: "2026-05-28T00:00:00.000Z",
                },
                {
                  id: otherProjectId,
                  name: "Previous Condo Fitout",
                  client_name: "Prior Client",
                  location: "Private Tower",
                  project_code: "PRIOR",
                  updated_at: "2026-05-20T00:00:00.000Z",
                },
              ];
              if (options.includeUnrelatedEstimate) {
                rows.push({
                  id: unrelatedProjectId,
                  name: "Warehouse Renovation",
                  client_name: "Warehouse Client",
                  location: "Confidential Warehouse",
                  project_code: "WH-001",
                  updated_at: "2026-05-19T00:00:00.000Z",
                });
              }
              return {
                data: rows,
                error: null,
              };
            }
            if (table === "estimates") {
              const rows = [
                { id: routeEstimateId, project_id: routeProjectId, name: "Current Estimate", sheet_code: "ES-001", updated_at: "2026-05-28T00:00:00.000Z" },
                { id: otherEstimateId, project_id: otherProjectId, name: "Prior Condo Estimate", sheet_code: "ES-002", updated_at: "2026-05-20T00:00:00.000Z" },
              ];
              if (options.includeUnrelatedEstimate) {
                rows.push({ id: unrelatedEstimateId, project_id: unrelatedProjectId, name: "Warehouse Shell", sheet_code: "WH-001", updated_at: "2026-05-19T00:00:00.000Z" });
              }
              return {
                data: rows,
                error: null,
              };
            }
            if (table === "estimate_nodes") {
              const rows = [
                { id: otherAreaNodeId, estimate_id: otherEstimateId, parent_id: null, kind: "area", name: "Bedroom", sort_order: 0 },
                { id: priorKitchenNodeId, estimate_id: otherEstimateId, parent_id: null, kind: "area", name: "Kitchen", sort_order: 1 },
                { id: priorPowderRoomNodeId, estimate_id: otherEstimateId, parent_id: null, kind: "area", name: "Powder Room", sort_order: 2 },
              ];
              if (options.includeUnrelatedEstimate) {
                rows.push({ id: unrelatedAreaNodeId, estimate_id: unrelatedEstimateId, parent_id: null, kind: "area", name: "Warehouse Loading", sort_order: 0 });
              }
              return {
                data: rows,
                error: null,
              };
            }
            if (table === "estimate_row_items") {
              const rows = [
                {
                  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                  estimate_id: otherEstimateId,
                  node_id: otherAreaNodeId,
                  material: "Prior condo queen bed",
                  description: "Bed from a prior condo package.",
                  supplier: "Previous Supplier",
                  quantity: 1,
                  unit: "pc",
                  unit_cost: 21_000,
                  contingency_percentage: 0,
                  misc_cost: 0,
                  source_library_item_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
                  updated_at: "2026-05-20T00:00:00.000Z",
                },
                {
                  id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
                  estimate_id: otherEstimateId,
                  node_id: priorKitchenNodeId,
                  material: "Kitchen backsplash tile",
                  description: "Tile finish from a comparable condo kitchen.",
                  supplier: "Tile Supplier",
                  quantity: 150,
                  unit: "sqm",
                  unit_cost: 900,
                  contingency_percentage: 5,
                  misc_cost: 0,
                  source_library_item_id: null,
                  updated_at: "2026-05-20T00:00:00.000Z",
                },
                {
                  id: "bbbbbbbb-1111-4bbb-8bbb-bbbbbbbb1111",
                  estimate_id: otherEstimateId,
                  node_id: priorPowderRoomNodeId,
                  material: "Powder room vanity mirror",
                  description: "Mirror precedent from a comparable condo powder room.",
                  supplier: "Mirror Supplier",
                  quantity: 1,
                  unit: "pc",
                  unit_cost: 7_500,
                  contingency_percentage: 0,
                  misc_cost: 500,
                  source_library_item_id: null,
                  updated_at: "2026-05-20T00:00:00.000Z",
                },
              ];
              if (options.includeUnrelatedEstimate) {
                rows.push({
                  id: "78787878-7878-4787-8787-787878787878",
                  estimate_id: unrelatedEstimateId,
                  node_id: unrelatedAreaNodeId,
                  material: "Forklift dock bumper",
                  description: "Unrelated warehouse scope.",
                  supplier: "Industrial Supplier",
                  quantity: 4,
                  unit: "pc",
                  unit_cost: 4_000,
                  contingency_percentage: 0,
                  misc_cost: 0,
                  source_library_item_id: null,
                  updated_at: "2026-05-19T00:00:00.000Z",
                });
              }
              return {
                data: rows,
                error: null,
              };
            }
            if (table === "cost_library_items" || table === "estimate_templates") {
              return { data: [], error: null };
            }
            throw new Error(`Unexpected comparable limit table: ${table}`);
          }),
        };
        return builder;
      }),
    })),
  };
}

function makeTemplateReadClient(observed: {
  limits: Array<{ table: string; limit: number }>;
  selects: Array<{ table: string; columns: string }>;
}) {
  const templateId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const templateAreaNodeId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const templateRowId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn((columns: string) => {
        observed.selects.push({ table, columns });
        const builder = {
          eq: vi.fn(() => builder),
          in: vi.fn(() => builder),
          neq: vi.fn(() => builder),
          or: vi.fn(() => builder),
          order: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => {
            if (table === "workspaces") return { data: { name: "Readonly Workspace" }, error: null };
            throw new Error(`Unexpected maybeSingle table: ${table}`);
          }),
          limit: vi.fn(async (limit: number) => {
            observed.limits.push({ table, limit });
            if (table === "projects" || table === "cost_library_items") return { data: [], error: null };
            if (table === "estimate_templates") {
              return {
                data: [
                  {
                    id: templateId,
                    name: "3 Bedroom Condo Starter",
                    description: "Workspace starter template for condo packages.",
                    category: "Residential",
                  },
                ],
                error: null,
              };
            }
            if (table === "estimate_template_nodes") {
              return {
                data: [
                  { id: templateAreaNodeId, template_id: templateId, kind: "area", name: "Bedroom" },
                ],
                error: null,
              };
            }
            if (table === "estimate_template_row_items") {
              return {
                data: [
                  {
                    id: templateRowId,
                    template_id: templateId,
                    template_node_id: templateAreaNodeId,
                    material: "Template bedroom paint finish",
                    description: "Paint finish copied from a workspace template.",
                    supplier: "Template Supplier",
                    quantity: 1,
                    unit: "allowance",
                    unit_cost: 9_000,
                    contingency_percentage: 10,
                    misc_cost: 500,
                  },
                ],
                error: null,
              };
            }
            throw new Error(`Unexpected limit table: ${table}`);
          }),
        };
        return builder;
      }),
    })),
  };
}

describe("AI package-builder read tools", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
    ensureDefaultWorkspace.mockClear();
  });

  it("uses the server-derived workspace id without bootstrapping or mutating workspaces during Draft", async () => {
    createSupabaseServerClient.mockResolvedValue(makeEmptyReadClient());

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Make a 3 bedroom condo estimate.",
    });

    expect(ensureDefaultWorkspace).not.toHaveBeenCalled();
    expect(result.workspace).toEqual({ name: "Readonly Workspace" });
    expect(result.projects).toEqual([]);
    expect(result.componentMatches).toEqual([]);
    expect(result.templateMatches).toEqual([]);
    expect(result.historicalRowMatches).toEqual([]);
    expect(result.auditEvents.map((event) => event.dataAccessEvent?.event_name)).toContain("read_current_workspace_context");
  });

  it("reads package-builder memory preferences only when memory is explicitly enabled", async () => {
    const observed = { filters: [] as Array<{ table: string; method: string; column?: string; value?: unknown }>, limits: [] as Array<{ table: string; limit: number }> };
    createSupabaseServerClient.mockResolvedValue(makeMemoryReadClient(observed));

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Make a 3 bedroom condo estimate.",
      memoryEnabled: true,
    });

    expect(observed.filters).toEqual(expect.arrayContaining([
      { table: "ai_package_builder_memory_preferences", method: "eq", column: "workspace_id", value: userContext.workspaceId },
      { table: "ai_package_builder_memory_preferences", method: "eq", column: "actor_user_id", value: userContext.userId },
    ]));
    expect(observed.limits).toEqual([{ table: "ai_package_builder_memory_preferences", limit: 80 }]);
    expect(result.memoryPreferences.componentSignals).toEqual([
      expect.objectContaining({
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        sourceLabel: "Preferred bedroom bed frame",
        score: 4,
      }),
    ]);
    expect(result.memoryPreferences.templateSignals).toEqual([
      expect.objectContaining({
        sourceTemplateId: "22222222-2222-4222-8222-222222222222",
        sourceLabel: "Rejected Condo Starter",
        score: -6,
      }),
    ]);
    expect(result.auditEvents.find((event) => event.dataAccessEvent?.event_name === "read_package_builder_memory_preferences")?.dataAccessEvent).toMatchObject({
      source_tables: ["ai_package_builder_memory_preferences"],
      row_count: 2,
      safe_summary: "Read compact package-builder memory preference signals for ranking hints.",
    });
  });

  it("keeps route-context Draft reads scoped and no-bootstrap while reading project, estimate, tree, and rows", async () => {
    createSupabaseServerClient.mockResolvedValue(makeRouteReadClient());

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Use the current estimate context for a 3 bedroom condo.",
      routeContext: { projectId: routeProjectId, estimateId: routeEstimateId },
    });

    expect(ensureDefaultWorkspace).not.toHaveBeenCalled();
    expect(result.projectSummary).toMatchObject({ id: routeProjectId, name: "Lewis Residence" });
    expect(result.estimateSummary).toMatchObject({ id: routeEstimateId, name: "Initial Estimate", rowCount: 1 });
    expect(result.estimateTree).toEqual([
      { id: routeGroupNodeId, name: "House", kind: "group", path: ["House"], rowCount: 0 },
      { id: routeAreaNodeId, name: "Bedroom 1", kind: "area", path: ["House", "Bedroom 1"], rowCount: 1 },
    ]);
    expect(result.areaRows).toEqual([
      expect.objectContaining({
        id: "55555555-5555-4555-8555-555555555555",
        nodeId: routeAreaNodeId,
        material: "Existing bed",
        rowRevision: 3,
        total: 10_000,
      }),
    ]);
    expect(result.historicalRowMatches).toEqual([]);
    expect(result.auditEvents.map((event) => event.dataAccessEvent?.event_name)).toEqual(expect.arrayContaining([
      "read_current_workspace_context",
      "read_project_summary",
      "list_project_estimates",
      "read_estimate_summary",
      "read_estimate_tree",
      "read_area_rows",
      "search_historical_estimate_rows",
    ]));
  });

  it("scopes current-route package reads to the active estimate tab when provided", async () => {
    const observed = { filters: [] as Array<{ table: string; method: string; column?: string; value?: unknown }> };
    createSupabaseServerClient.mockResolvedValue(makeSelectedNodeRouteReadClient(observed));

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Fill this active tab with bedroom rows.",
      routeContext: { projectId: routeProjectId, estimateId: routeEstimateId, activeTabId: routeActiveTabId },
    });

    expect(result.estimateSummary).toEqual(expect.objectContaining({
      id: routeEstimateId,
      firstNodeId: routeGroupNodeId,
      activeTabId: routeActiveTabId,
    }));
    expect(result.estimateTree).toEqual([
      { id: routeGroupNodeId, name: "Active House", kind: "group", path: ["Active House"], rowCount: 0 },
      { id: routeAreaNodeId, name: "Active Bedroom", kind: "area", path: ["Active House", "Active Bedroom"], rowCount: 1 },
    ]);
    expect(result.areaRows.map((row) => row.material)).toEqual(["Active tab bed"]);
    expect(observed.filters).toEqual(expect.arrayContaining([
      { table: "estimate_nodes", method: "eq", column: "estimate_tab_id", value: routeActiveTabId },
      { table: "estimate_row_items", method: "in", column: "node_id", value: [routeGroupNodeId, routeAreaNodeId] },
    ]));
  });

  it("resolves estimate context from selected node id and excludes that estimate from historical reads", async () => {
    const observed = { filters: [] as Array<{ table: string; method: string; column?: string; value?: unknown }> };
    createSupabaseServerClient.mockResolvedValue(makeSelectedNodeRouteReadClient(observed));

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Use this selected estimate route for a 3 bedroom condo.",
      routeContext: { projectId: routeProjectId, selectedNodeId: selectedRouteAreaNodeId },
    });

    expect(result.estimateSummary).toEqual(expect.objectContaining({
      id: selectedRouteEstimateId,
      name: "Selected Estimate",
      firstNodeId: selectedRouteAreaNodeId,
    }));
    expect(result.estimateTree).toEqual([
      { id: selectedRouteGroupNodeId, name: "House", kind: "group", path: ["House"], rowCount: 0 },
      { id: selectedRouteAreaNodeId, name: "Selected Bedroom", kind: "area", path: ["House", "Selected Bedroom"], rowCount: 1 },
    ]);
    expect(result.areaRows).toEqual([
      expect.objectContaining({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        nodeId: selectedRouteAreaNodeId,
        material: "Selected estimate bed",
        rowRevision: 5,
        total: 15_000,
      }),
    ]);
    expect(result.historicalRowMatches.every((row) => row.estimateId !== selectedRouteEstimateId)).toBe(true);
    expect(result.auditEvents.map((event) => event.dataAccessEvent?.event_name)).toContain("search_historical_estimate_rows");
    expect(observed.filters).toEqual(expect.arrayContaining([
      { table: "estimate_nodes", method: "eq", column: "id", value: selectedRouteAreaNodeId },
      { table: "estimates", method: "eq", column: "id", value: selectedRouteEstimateId },
      { table: "estimate_nodes", method: "in", column: "estimate_id", value: [routeEstimateId] },
      { table: "estimate_row_items", method: "in", column: "estimate_id", value: [routeEstimateId] },
    ]));
  });

  it("reads bounded prior estimate rows across workspace projects as historical package precedents", async () => {
    const observed = { limits: [] as Array<{ table: string; limit: number }>, filters: [] as Array<{ table: string; method: string; column?: string; value?: unknown }> };
    createSupabaseServerClient.mockResolvedValue(makeHistoricalReadClient(observed));

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Make a 3 bedroom condo estimate.",
      routeContext: { projectId: routeProjectId, estimateId: routeEstimateId },
    });

    expect(ensureDefaultWorkspace).not.toHaveBeenCalled();
    expect(observed.filters).toEqual(expect.arrayContaining([
      { table: "projects", method: "eq", column: "workspace_id", value: userContext.workspaceId },
      { table: "estimates", method: "in", column: "project_id", value: [routeProjectId, otherProjectId] },
      { table: "estimate_nodes", method: "in", column: "estimate_id", value: [otherEstimateId] },
      { table: "estimate_row_items", method: "in", column: "estimate_id", value: [otherEstimateId] },
    ]));
    expect(observed.filters.some((filter) =>
      filter.table === "estimate_row_items" && filter.method === "or" && String(filter.value).includes("material.ilike")
    )).toBe(true);
    expect(observed.filters.some((filter) =>
      filter.table === "estimate_row_items" && filter.method === "or" && String(filter.value).includes("material.ilike.%toilet%")
    )).toBe(true);
    expect(observed.filters.some((filter) =>
      filter.table === "estimate_row_items" && filter.method === "or" && String(filter.value).includes("material.ilike.%wardrobe%")
    )).toBe(true);
    expect(observed.filters.some((filter) =>
      filter.table === "estimate_row_items" && filter.method === "or" && String(filter.value).includes("material.ilike.%lavatory%")
    )).toBe(true);
    expect(observed.filters.some((filter) =>
      filter.table === "cost_library_items" && filter.method === "or" && String(filter.value).includes("name.ilike.%wardrobe%")
    )).toBe(true);
    expect(observed.filters.some((filter) =>
      filter.table === "cost_library_items" && filter.method === "or" && String(filter.value).includes("name.ilike.%lavatory%")
    )).toBe(true);
    expect(observed.filters.some((filter) =>
      filter.table === "cost_library_items" && filter.method === "or" && String(filter.value).includes("name.ilike.%basin%")
    )).toBe(true);
    expect(observed.limits).toEqual(expect.arrayContaining([
      { table: "projects", limit: 12 },
      { table: "estimates", limit: 24 },
      { table: "estimate_nodes", limit: 80 },
      { table: "estimate_row_items", limit: 48 },
    ]));
    expect(result.historicalRowMatches).toEqual([
      expect.objectContaining({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        projectId: otherProjectId,
        projectName: "Previous Condo Fitout",
        estimateId: otherEstimateId,
        estimateName: "Prior Condo Estimate",
        areaName: "Bedroom",
        material: "Prior condo queen bed",
        unitCost: 21_000,
        total: 21_000,
        sourceLibraryItemId: null,
      }),
    ]);
    const historicalAudit = result.auditEvents.find((event) => event.dataAccessEvent?.event_name === "search_historical_estimate_rows");
    expect(historicalAudit?.dataAccessEvent).toMatchObject({
      source_tables: ["projects", "estimates", "estimate_nodes", "estimate_row_items"],
      row_count: 6,
      safe_summary: "Searched compact prior estimate rows for package precedent hints.",
    });
  });

  it("reads bounded comparable estimate package summaries across workspace projects", async () => {
    const observed = { limits: [] as Array<{ table: string; limit: number }>, filters: [] as Array<{ table: string; method: string; column?: string; value?: unknown }> };
    createSupabaseServerClient.mockResolvedValue(makeComparablePackageReadClient(observed));

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.",
      routeContext: { projectId: routeProjectId, estimateId: routeEstimateId },
    });

    expect(ensureDefaultWorkspace).not.toHaveBeenCalled();
    expect(observed.filters).toEqual(expect.arrayContaining([
      { table: "projects", method: "eq", column: "workspace_id", value: userContext.workspaceId },
      { table: "estimates", method: "in", column: "project_id", value: [routeProjectId, otherProjectId] },
      { table: "estimate_nodes", method: "in", column: "estimate_id", value: [otherEstimateId] },
      { table: "estimate_row_items", method: "in", column: "estimate_id", value: [otherEstimateId] },
    ]));
    expect(observed.limits).toEqual(expect.arrayContaining([
      { table: "estimates", limit: 24 },
      { table: "estimate_nodes", limit: 120 },
      { table: "estimate_row_items", limit: 120 },
    ]));
    expect(result.comparableEstimatePackages).toEqual([
      expect.objectContaining({
        projectName: "Previous Condo Fitout",
        estimateName: "Prior Condo Estimate",
        sheetCode: "ES-002",
        matchedTerms: expect.arrayContaining(["bed", "kitchen", "tile", "condo"]),
        areaCount: 3,
        rowCount: 3,
        total: 170_750,
        sourceLibraryCoverageRatio: 0.33,
        areas: expect.arrayContaining([
          expect.objectContaining({
            areaName: "Powder Room",
            rowCount: 1,
            total: 8_000,
            sourceLibraryCoverageRatio: 0,
            rowPreviews: [
              expect.objectContaining({
                areaName: "Powder Room",
                material: "Powder room vanity mirror",
                unit: "pc",
                unitCost: 7_500,
                total: 8_000,
                sourceType: "project",
              }),
            ],
          }),
        ]),
      }),
    ]);
    const comparableAudit = result.auditEvents.find((event) => event.dataAccessEvent?.event_name === "search_comparable_estimate_packages");
    expect(comparableAudit?.dataAccessEvent).toMatchObject({
      source_tables: ["projects", "estimates", "estimate_nodes", "estimate_row_items"],
      row_count: 9,
      safe_summary: "Searched compact comparable estimate packages for room and row pattern hints.",
    });
  });

  it("does not emit unrelated prior estimates as comparable packages just because they have rows", async () => {
    const observed = { limits: [] as Array<{ table: string; limit: number }>, filters: [] as Array<{ table: string; method: string; column?: string; value?: unknown }> };
    createSupabaseServerClient.mockResolvedValue(makeComparablePackageReadClient(observed, { includeUnrelatedEstimate: true }));

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.",
      routeContext: { projectId: routeProjectId, estimateId: routeEstimateId },
    });

    expect(result.comparableEstimatePackages.map((packageMatch) => packageMatch.estimateName)).toEqual([
      "Prior Condo Estimate",
    ]);
    expect(JSON.stringify(result.comparableEstimatePackages)).not.toContain("Warehouse Shell");
    expect(JSON.stringify(result.comparableEstimatePackages)).not.toContain("Forklift dock bumper");
  });

  it("keeps late condo package seed terms in scoped search filters", async () => {
    const observed = { limits: [] as Array<{ table: string; limit: number }>, filters: [] as Array<{ table: string; method: string; column?: string; value?: unknown }> };
    createSupabaseServerClient.mockResolvedValue(makeHistoricalReadClient(observed));

    await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Make a 3 bedroom condo estimate.",
      routeContext: { projectId: routeProjectId, estimateId: routeEstimateId },
    });

    const componentFilter = observed.filters.find((filter) =>
      filter.table === "cost_library_items" && filter.method === "or"
    )?.value;
    const historicalFilter = observed.filters.find((filter) =>
      filter.table === "estimate_row_items" && filter.method === "or"
    )?.value;

    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%living%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%dining%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%paint%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%tile%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%finish%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%general%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%fixture%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%furniture%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%console%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%table%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%sofa%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%chair%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%pendant%"));
    expect(componentFilter).toEqual(expect.stringContaining("name.ilike.%lounge%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%living%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%dining%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%paint%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%tile%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%finish%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%general%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%fixture%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%furniture%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%console%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%table%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%sofa%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%chair%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%pendant%"));
    expect(historicalFilter).toEqual(expect.stringContaining("material.ilike.%lounge%"));
  });

  it("reads bounded estimate template row summaries for Draft-only package precedents", async () => {
    const observed = { limits: [] as Array<{ table: string; limit: number }>, selects: [] as Array<{ table: string; columns: string }> };
    createSupabaseServerClient.mockResolvedValue(makeTemplateReadClient(observed));

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Make a 3 bedroom condo estimate.",
    });

    expect(observed.selects).toEqual(expect.arrayContaining([
      {
        table: "estimate_template_row_items",
        columns: expect.stringContaining("template_node_id"),
      },
    ]));
    expect(observed.selects.find((select) => select.table === "estimate_template_row_items")?.columns).toEqual(expect.stringContaining("material"));
    expect(observed.limits).toEqual(expect.arrayContaining([
      { table: "estimate_template_nodes", limit: 80 },
      { table: "estimate_template_row_items", limit: 80 },
    ]));
    expect(result.templateMatches).toEqual([
      expect.objectContaining({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        name: "3 Bedroom Condo Starter",
        rowCount: 1,
        areaNames: ["Bedroom"],
        rowPreviews: [
          {
            id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            templateId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            templateNodeId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            areaName: "Bedroom",
            material: "Template bedroom paint finish",
            description: "Paint finish copied from a workspace template.",
            supplier: "Template Supplier",
            quantity: 1,
            unit: "allowance",
            unitCost: 9_000,
            miscCost: 500,
            contingencyPercentage: 10,
            total: 10_400,
          },
        ],
      }),
    ]);
    expect(result.auditEvents.find((event) => event.dataAccessEvent?.event_name === "search_estimate_templates")?.dataAccessEvent).toMatchObject({
      source_tables: ["estimate_templates", "estimate_template_nodes", "estimate_template_row_items"],
      row_count: 3,
      safe_summary: "Searched compact workspace estimate-template summaries for package drafting.",
    });
  });

  it("does not emit a price option id without its confirmed timestamp", async () => {
    createSupabaseServerClient.mockResolvedValue(makeComponentReadClient());

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Add a bed to each bedroom.",
    });

    expect(result.componentMatches).toEqual([
      expect.objectContaining({
        material: "Bedroom bed frame",
        priceOptionId: null,
        priceOptionUpdatedAt: null,
        currentVersionNumber: 7,
      }),
    ]);
  });

  it("enriches component matches with category and library folder organization context", async () => {
    const observed = {
      selects: [] as Array<{ table: string; columns: string }>,
      filters: [] as Array<{ table: string; method: string; column?: string; value?: unknown }>,
    };
    createSupabaseServerClient.mockResolvedValue(makeOrganizedComponentReadClient(observed));

    const result = await readPackageBuilderTools({
      runId: "66666666-6666-4666-8666-666666666666",
      userContext,
      message: "Add bedroom beds from the furniture folder.",
    });

    expect(observed.selects).toEqual(expect.arrayContaining([
      {
        table: "cost_library_items",
        columns: expect.stringContaining("library_folder_id"),
      },
      {
        table: "component_category_nodes",
        columns: expect.stringContaining("parent_id"),
      },
      {
        table: "library_folders",
        columns: expect.stringContaining("parent_id"),
      },
    ]));
    expect(observed.filters).toEqual(expect.arrayContaining([
      { table: "library_folders", method: "eq", column: "workspace_id", value: userContext.workspaceId },
    ]));
    expect(result.componentMatches).toEqual([
      expect.objectContaining({
        material: "Bedroom bed frame",
        category: "Bedroom Beds",
        categoryNodeId: "cat-bedroom-beds",
        categoryPath: ["Objects", "Furniture", "Bedroom Beds"],
        libraryFolderId: "folder-bedroom-beds",
        libraryFolderName: "Bedroom Beds",
        libraryFolderPath: ["Furniture", "Bedroom Beds"],
        brand: "Condo Brand",
      }),
    ]);
    expect(result.auditEvents.find((event) => event.dataAccessEvent?.event_name === "search_component_library")?.dataAccessEvent).toMatchObject({
      source_tables: ["cost_library_items", "cost_library_item_price_options", "component_category_nodes", "library_folders"],
      row_count: 6,
      safe_summary: "Searched compact workspace component-library summaries for package drafting.",
    });
  });
});
