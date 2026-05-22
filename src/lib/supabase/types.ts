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
      component_category_nodes: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          id: string
          label: string
          metadata: Json
          node_type: "organizer" | "category" | "subcategory"
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id: string
          label: string
          metadata?: Json
          node_type: "organizer" | "category" | "subcategory"
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          metadata?: Json
          node_type?: "organizer" | "category" | "subcategory"
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_category_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "component_category_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      component_suppliers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          name: string
          normalized_name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name: string
          normalized_name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name?: string
          normalized_name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_suppliers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_library_items: {
        Row: {
          brand: string | null
          category: string
          category_node_id: string | null
          confidence: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          kind: Database["public"]["Enums"]["cost_library_item_kind"]
          metadata: Json
          misc_cost: number
          name: string
          pricing_date: string | null
          pricing_source: string | null
          sku: string | null
          supplier: string | null
          supplier_id: string | null
          thumbnail_path: string | null
          unit: string
          unit_cost: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand?: string | null
          category?: string
          category_node_id?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["cost_library_item_kind"]
          metadata?: Json
          misc_cost?: number
          name: string
          pricing_date?: string | null
          pricing_source?: string | null
          sku?: string | null
          supplier?: string | null
          supplier_id?: string | null
          thumbnail_path?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand?: string | null
          category?: string
          category_node_id?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["cost_library_item_kind"]
          metadata?: Json
          misc_cost?: number
          name?: string
          pricing_date?: string | null
          pricing_source?: string | null
          sku?: string | null
          supplier?: string | null
          supplier_id?: string | null
          thumbnail_path?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_library_items_category_node_id_fkey"
            columns: ["category_node_id"]
            isOneToOne: false
            referencedRelation: "component_category_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_library_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "component_suppliers"
            referencedColumns: ["id"]
          },
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
          category_node_id: string | null
          created_at: string
          description: string
          designation: string
          discipline: string
          estimate_id: string
          id: string
          link_state: Database["public"]["Enums"]["estimate_row_link_state"]
          material: string
          metadata: Json
          misc_cost: number
          node_id: string
          quantity: number
          sort_order: number
          source_library_item_id: string | null
          source_snapshot: Json | null
          supplier: string
          supplier_id: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category_node_id?: string | null
          created_at?: string
          description?: string
          designation?: string
          discipline?: string
          estimate_id: string
          id?: string
          link_state?: Database["public"]["Enums"]["estimate_row_link_state"]
          material?: string
          metadata?: Json
          misc_cost?: number
          node_id: string
          quantity?: number
          sort_order?: number
          source_library_item_id?: string | null
          source_snapshot?: Json | null
          supplier?: string
          supplier_id?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category_node_id?: string | null
          created_at?: string
          description?: string
          designation?: string
          discipline?: string
          estimate_id?: string
          id?: string
          link_state?: Database["public"]["Enums"]["estimate_row_link_state"]
          material?: string
          metadata?: Json
          misc_cost?: number
          node_id?: string
          quantity?: number
          sort_order?: number
          source_library_item_id?: string | null
          source_snapshot?: Json | null
          supplier?: string
          supplier_id?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_row_items_category_node_id_fkey"
            columns: ["category_node_id"]
            isOneToOne: false
            referencedRelation: "component_category_nodes"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "estimate_row_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "component_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_template_nodes: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["estimate_node_kind"]
          metadata: Json
          name: string
          parent_id: string | null
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["estimate_node_kind"]
          metadata?: Json
          name: string
          parent_id?: string | null
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["estimate_node_kind"]
          metadata?: Json
          name?: string
          parent_id?: string | null
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_template_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "estimate_template_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_nodes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "estimate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_template_row_items: {
        Row: {
          category_node_id: string | null
          created_at: string
          description: string
          designation: string
          discipline: string
          id: string
          link_state: Database["public"]["Enums"]["estimate_row_link_state"]
          material: string
          metadata: Json
          misc_cost: number
          quantity: number
          sort_order: number
          source_library_item_id: string | null
          source_snapshot: Json | null
          supplier: string
          supplier_id: string | null
          template_id: string
          template_node_id: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category_node_id?: string | null
          created_at?: string
          description?: string
          designation?: string
          discipline?: string
          id?: string
          link_state?: Database["public"]["Enums"]["estimate_row_link_state"]
          material?: string
          metadata?: Json
          misc_cost?: number
          quantity?: number
          sort_order?: number
          source_library_item_id?: string | null
          source_snapshot?: Json | null
          supplier?: string
          supplier_id?: string | null
          template_id: string
          template_node_id: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category_node_id?: string | null
          created_at?: string
          description?: string
          designation?: string
          discipline?: string
          id?: string
          link_state?: Database["public"]["Enums"]["estimate_row_link_state"]
          material?: string
          metadata?: Json
          misc_cost?: number
          quantity?: number
          sort_order?: number
          source_library_item_id?: string | null
          source_snapshot?: Json | null
          supplier?: string
          supplier_id?: string | null
          template_id?: string
          template_node_id?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_template_row_items_category_node_id_fkey"
            columns: ["category_node_id"]
            isOneToOne: false
            referencedRelation: "component_category_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_row_items_source_library_item_id_fkey"
            columns: ["source_library_item_id"]
            isOneToOne: false
            referencedRelation: "cost_library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_row_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "component_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_row_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "estimate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_row_items_template_node_id_fkey"
            columns: ["template_node_id"]
            isOneToOne: false
            referencedRelation: "estimate_template_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          metadata: Json
          name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json
          name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json
          name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          metadata: Json
          name: string
          project_id: string
          sheet_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          metadata?: Json
          name: string
          project_id: string
          sheet_code?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          metadata?: Json
          name?: string
          project_id?: string
          sheet_code?: string
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
      profiles: {
        Row: {
          created_at: string
          default_workspace_id: string | null
          display_name: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_workspace_id?: string | null
          display_name?: string | null
          email: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_workspace_id?: string | null
          display_name?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      current_user_profile: {
        Args: never
        Returns: {
          created_at: string
          default_workspace_id: string | null
          display_name: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_workspace_admin: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      insert_estimate_template_into_estimate: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          target_parent_node_id: string
          source_template_id: string
        }
        Returns: Json
      }
      reorder_estimate_nodes: {
        Args: { target_estimate_id: string; move_updates: Json }
        Returns: number
      }
      resolve_app_role_for_email: {
        Args: { raw_email: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "ceo" | "admin" | "member"
      cost_library_item_kind:
        | "material"
        | "labor"
        | "equipment"
        | "subcontract"
        | "assembly"
        | "allowance"
      estimate_node_kind:
        | "lot"
        | "general"
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
      app_role: ["ceo", "admin", "member"],
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
        "general",
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
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const

export const requiredSupabaseEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function hasSupabaseBrowserEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
