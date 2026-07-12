import type { Json } from "./json";
import type { AppPlatformRole } from "@/lib/auth/roles";
import type { ProjectStatus } from "@/lib/projects/status";

export type { AppPlatformRole };

export type ProjectRow = {
  budget_basis_date?: string | null;
  client_name: string | null;
  created_at: string;
  created_by: string | null;
  currency_code: string;
  floor_area_unit?: "sqm" | "sqft" | null;
  gross_floor_area?: number | null;
  id: string;
  location: string | null;
  market_region?: string | null;
  metadata: Json;
  name: string;
  procurement_status?: string | null;
  project_code: string | null;
  project_phase?: string | null;
  project_type?: string | null;
  status: ProjectStatus;
  target_budget?: number | null;
  updated_at: string;
  workspace_id: string;
};

export type EstimateRow = {
  created_at: string;
  created_by: string | null;
  currency_code: string;
  id: string;
  metadata: Json;
  name: string;
  notes: string | null;
  project_budget: number | null;
  project_id: string;
  sheet_code: string;
  updated_at: string;
};

export type WorkspaceRow = {
  created_at: string;
  created_by: string | null;
  id: string;
  name: string;
  slug: string | null;
  updated_at: string;
};

export type ProfileRow = {
  avatar_url: string | null;
  created_at: string;
  default_workspace_id: string | null;
  display_name: string | null;
  email: string;
  id: string;
  role: AppPlatformRole;
  updated_at: string;
};
