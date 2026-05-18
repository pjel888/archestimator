export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cost_library_items: {
        Row: {
          brand: string | null
          category: string
          confidence: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          kind: Database["public"]["Enums"]["cost_library_item_kind"]
          labor_cost: number
          metadata: Json
          name: string
          pricing_date: string | null
          pricing_source: string | null
          sku: string | null
          supplementary_cost: number
          supplier: string | null
          thumbnail_path: string | null
          unit: string
          unit_cost: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand?: string | null
          category?: string
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["cost_library_item_kind"]
          labor_cost?: number
          metadata?: Json
          name: string
          pricing_date?: string | null
          pricing_source?: string | null
          sku?: string | null
          supplementary_cost?: number
          supplier?: string | null
          thumbnail_path?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand?: string | null
          category?: string
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["cost_library_item_kind"]
          labor_cost?: number
          metadata?: Json
          name?: string
          pricing_date?: string | null
          pricing_source?: string | null
          sku?: string | null
          supplementary_cost?: number
          supplier?: string | null
          thumbnail_path?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_library_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_nodes: {
        Row: {
          created_at: string
          estimate_id: string
          id: string
          kind: Database["public"]["Enums"]["estimate_node_kind"]
          metadata: Json
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimate_id: string
          id?: string
          kind: Database["public"]["Enums"]["estimate_node_kind"]
          metadata?: Json
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimate_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["estimate_node_kind"]
          metadata?: Json
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_nodes_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "estimate_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_row_items: {
        Row: {
          created_at: string
          description: string
          designation: string
          discipline: string
          estimate_id: string
          id: string
          labor_cost: number
          link_state: Database["public"]["Enums"]["estimate_row_link_state"]
          material: string
          metadata: Json
          node_id: string
          quantity: number
          sort_order: number
          source_library_item_id: string | null
          source_snapshot: Json | null
          supplementary_cost: number
          supplier: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          designation?: string
          discipline?: string
          estimate_id: string
          id?: string
          labor_cost?: number
          link_state?: Database["public"]["Enums"]["estimate_row_link_state"]
          material?: string
          metadata?: Json
          node_id: string
          quantity?: number
          sort_order?: number
          source_library_item_id?: string | null
          source_snapshot?: Json | null
          supplementary_cost?: number
          supplier?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          designation?: string
          discipline?: string
          estimate_id?: string
          id?: string
          labor_cost?: number
          link_state?: Database["public"]["Enums"]["estimate_row_link_state"]
          material?: string
          metadata?: Json
          node_id?: string
          quantity?: number
          sort_order?: number
          source_library_item_id?: string | null
          source_snapshot?: Json | null
          supplementary_cost?: number
          supplier?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_row_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_row_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "estimate_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_row_items_source_library_item_id_fkey"
            columns: ["source_library_item_id"]
            isOneToOne: false
            referencedRelation: "cost_library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          assumptions: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          metadata: Json
          name: string
          project_id: string
          revision_label: string
          status: Database["public"]["Enums"]["estimate_status"]
          updated_at: string
        }
        Insert: {
          assumptions?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          metadata?: Json
          name: string
          project_id: string
          revision_label?: string
          status?: Database["public"]["Enums"]["estimate_status"]
          updated_at?: string
        }
        Update: {
          assumptions?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          metadata?: Json
          name?: string
          project_id?: string
          revision_label?: string
          status?: Database["public"]["Enums"]["estimate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_name: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          location: string | null
          metadata: Json
          name: string
          project_code: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          location?: string | null
          metadata?: Json
          name: string
          project_code?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          location?: string | null
          metadata?: Json
          name?: string
          project_code?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_admin: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      cost_library_item_kind:
        | "material"
        | "labor"
        | "equipment"
        | "subcontract"
        | "assembly"
        | "allowance"
      estimate_node_kind:
        | "lot"
        | "structure"
        | "level"
        | "area"
        | "group"
        | "assembly"
      estimate_row_link_state:
        | "unlinked"
        | "linked-clean"
        | "linked-overridden"
        | "detached"
        | "source-changed"
      estimate_status: "draft" | "active" | "issued" | "archived"
      workspace_role: "owner" | "admin" | "member" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cost_library_item_kind: [
        "material",
        "labor",
        "equipment",
        "subcontract",
        "assembly",
        "allowance",
      ],
      estimate_node_kind: [
        "lot",
        "structure",
        "level",
        "area",
        "group",
        "assembly",
      ],
      estimate_row_link_state: [
        "unlinked",
        "linked-clean",
        "linked-overridden",
        "detached",
        "source-changed",
      ],
      estimate_status: ["draft", "active", "issued", "archived"],
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const

export const requiredSupabaseEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function hasSupabaseBrowserEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
