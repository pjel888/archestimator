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
      ai_action_runs: {
        Row: {
          actor_user_id: string
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          error_class: string | null
          id: string
          metadata: Json
          mode: Database["public"]["Enums"]["ai_interaction_mode"]
          model: string
          provider: string
          provider_response_id: string | null
          provider_send_categories: string[]
          redaction_status: Database["public"]["Enums"]["ai_redaction_status"]
          request_host: string | null
          request_message_hash: string | null
          route_context_hash: string | null
          run_id: string
          started_at: string
          status: Database["public"]["Enums"]["ai_run_status"]
          usage: Json
          user_agent_hash: string | null
          workspace_id: string
        }
        Insert: {
          actor_user_id: string
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          error_class?: string | null
          id?: string
          metadata?: Json
          mode: Database["public"]["Enums"]["ai_interaction_mode"]
          model?: string
          provider?: string
          provider_response_id?: string | null
          provider_send_categories?: string[]
          redaction_status?: Database["public"]["Enums"]["ai_redaction_status"]
          request_host?: string | null
          request_message_hash?: string | null
          route_context_hash?: string | null
          run_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["ai_run_status"]
          usage?: Json
          user_agent_hash?: string | null
          workspace_id: string
        }
        Update: {
          actor_user_id?: string
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          error_class?: string | null
          id?: string
          metadata?: Json
          mode?: Database["public"]["Enums"]["ai_interaction_mode"]
          model?: string
          provider?: string
          provider_response_id?: string | null
          provider_send_categories?: string[]
          redaction_status?: Database["public"]["Enums"]["ai_redaction_status"]
          request_host?: string | null
          request_message_hash?: string | null
          route_context_hash?: string | null
          run_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["ai_run_status"]
          usage?: Json
          user_agent_hash?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_runs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_data_access_events: {
        Row: {
          actor_user_id: string
          blocked_attempt: boolean
          blocked_reason: string | null
          created_at: string
          event_name: string
          filter_hash: string | null
          id: string
          redaction_status: Database["public"]["Enums"]["ai_redaction_status"]
          row_count: number
          run_id: string
          safe_summary: string
          source_tables: string[]
          target_estimate_id: string | null
          target_node_id: string | null
          target_project_id: string | null
          target_row_id: string | null
          tool_call_id: string | null
          workspace_id: string
        }
        Insert: {
          actor_user_id: string
          blocked_attempt?: boolean
          blocked_reason?: string | null
          created_at?: string
          event_name: string
          filter_hash?: string | null
          id?: string
          redaction_status?: Database["public"]["Enums"]["ai_redaction_status"]
          row_count?: number
          run_id: string
          safe_summary?: string
          source_tables?: string[]
          target_estimate_id?: string | null
          target_node_id?: string | null
          target_project_id?: string | null
          target_row_id?: string | null
          tool_call_id?: string | null
          workspace_id: string
        }
        Update: {
          actor_user_id?: string
          blocked_attempt?: boolean
          blocked_reason?: string | null
          created_at?: string
          event_name?: string
          filter_hash?: string | null
          id?: string
          redaction_status?: Database["public"]["Enums"]["ai_redaction_status"]
          row_count?: number
          run_id?: string
          safe_summary?: string
          source_tables?: string[]
          target_estimate_id?: string | null
          target_node_id?: string | null
          target_project_id?: string | null
          target_row_id?: string | null
          tool_call_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_data_access_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_action_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_data_access_events_tool_call_id_fkey"
            columns: ["tool_call_id"]
            isOneToOne: false
            referencedRelation: "ai_tool_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_data_access_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_calls: {
        Row: {
          actor_user_id: string
          args_hash: string | null
          completed_at: string | null
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["ai_interaction_mode"]
          result_hash: string | null
          run_id: string
          safe_summary: string
          started_at: string
          status: Database["public"]["Enums"]["ai_run_status"]
          target_estimate_id: string | null
          target_node_id: string | null
          target_project_id: string | null
          target_row_id: string | null
          tool_name: string
          validation_errors: Json
          workspace_id: string
        }
        Insert: {
          actor_user_id: string
          args_hash?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mode: Database["public"]["Enums"]["ai_interaction_mode"]
          result_hash?: string | null
          run_id: string
          safe_summary?: string
          started_at?: string
          status?: Database["public"]["Enums"]["ai_run_status"]
          target_estimate_id?: string | null
          target_node_id?: string | null
          target_project_id?: string | null
          target_row_id?: string | null
          tool_name: string
          validation_errors?: Json
          workspace_id: string
        }
        Update: {
          actor_user_id?: string
          args_hash?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["ai_interaction_mode"]
          result_hash?: string | null
          run_id?: string
          safe_summary?: string
          started_at?: string
          status?: Database["public"]["Enums"]["ai_run_status"]
          target_estimate_id?: string | null
          target_node_id?: string | null
          target_project_id?: string | null
          target_row_id?: string | null
          tool_name?: string
          validation_errors?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_action_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_tool_calls_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      component_brands: {
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
            foreignKeyName: "component_brands_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          brand_id: string | null
          category: string
          category_node_id: string | null
          confidence: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          active_price_option_id: string | null
          current_version_number: number
          library_folder_id: string | null
          lifecycle_state: Database["public"]["Enums"]["component_lifecycle_state"]
          lifecycle_state_changed_at: string
          lifecycle_state_changed_by: string | null
          metadata: Json
          misc_cost: number
          name: string
          pricing_date: string | null
          pricing_source: string | null
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
          brand_id?: string | null
          category?: string
          category_node_id?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          active_price_option_id?: string | null
          current_version_number?: number
          library_folder_id?: string | null
          lifecycle_state?: Database["public"]["Enums"]["component_lifecycle_state"]
          lifecycle_state_changed_at?: string
          lifecycle_state_changed_by?: string | null
          metadata?: Json
          misc_cost?: number
          name: string
          pricing_date?: string | null
          pricing_source?: string | null
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
          brand_id?: string | null
          category?: string
          category_node_id?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          active_price_option_id?: string | null
          current_version_number?: number
          library_folder_id?: string | null
          lifecycle_state?: Database["public"]["Enums"]["component_lifecycle_state"]
          lifecycle_state_changed_at?: string
          lifecycle_state_changed_by?: string | null
          metadata?: Json
          misc_cost?: number
          name?: string
          pricing_date?: string | null
          pricing_source?: string | null
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
            foreignKeyName: "cost_library_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "component_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_library_items_category_node_id_fkey"
            columns: ["category_node_id"]
            isOneToOne: false
            referencedRelation: "component_category_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_library_items_library_folder_id_fkey"
            columns: ["library_folder_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
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
      cost_library_item_price_history: {
        Row: {
          change_reason: string
          created_at: string
          created_by: string | null
          effective_at: string
          id: string
          item_id: string
          new_snapshot: Json
          old_snapshot: Json | null
          price_option_id: string
          workspace_id: string
        }
        Insert: {
          change_reason?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          item_id: string
          new_snapshot: Json
          old_snapshot?: Json | null
          price_option_id: string
          workspace_id: string
        }
        Update: {
          change_reason?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          item_id?: string
          new_snapshot?: Json
          old_snapshot?: Json | null
          price_option_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      cost_library_item_price_options: {
        Row: {
          active_cost_entry_id: string | null
          confidence: string | null
          created_at: string
          created_by: string | null
          currency: string
          dimension_height: number | null
          dimension_length: number | null
          dimension_unit: string | null
          dimension_width: number | null
          id: string
          image_bucket: string | null
          image_metadata: Json
          image_path: string | null
          is_active: boolean
          is_default: boolean
          item_id: string
          label: string
          mass: number | null
          mass_unit: string | null
          misc_cost: number
          notes: string
          package_quantity: number | null
          package_unit: string | null
          pricing_date: string | null
          pricing_source: string | null
          sku: string | null
          source_url: string | null
          supplier_id: string | null
          thumbnail_path: string | null
          unit: string
          unit_cost: number
          updated_at: string
          variant_description: string
          variant_metadata: Json
          variant_sort_order: number
          workspace_id: string
        }
        Insert: {
          active_cost_entry_id?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          dimension_height?: number | null
          dimension_length?: number | null
          dimension_unit?: string | null
          dimension_width?: number | null
          id?: string
          image_bucket?: string | null
          image_metadata?: Json
          image_path?: string | null
          is_active?: boolean
          is_default?: boolean
          item_id: string
          label: string
          mass?: number | null
          mass_unit?: string | null
          misc_cost?: number
          notes?: string
          package_quantity?: number | null
          package_unit?: string | null
          pricing_date?: string | null
          pricing_source?: string | null
          sku?: string | null
          source_url?: string | null
          supplier_id?: string | null
          thumbnail_path?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          variant_description?: string
          variant_metadata?: Json
          variant_sort_order?: number
          workspace_id: string
        }
        Update: {
          active_cost_entry_id?: string | null
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          dimension_height?: number | null
          dimension_length?: number | null
          dimension_unit?: string | null
          dimension_width?: number | null
          id?: string
          image_bucket?: string | null
          image_metadata?: Json
          image_path?: string | null
          is_active?: boolean
          is_default?: boolean
          item_id?: string
          label?: string
          mass?: number | null
          mass_unit?: string | null
          misc_cost?: number
          notes?: string
          package_quantity?: number | null
          package_unit?: string | null
          pricing_date?: string | null
          pricing_source?: string | null
          sku?: string | null
          source_url?: string | null
          supplier_id?: string | null
          thumbnail_path?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          variant_description?: string
          variant_metadata?: Json
          variant_sort_order?: number
          workspace_id?: string
        }
        Relationships: []
      }
      cost_library_item_variant_attachments: {
        Row: {
          attachment_kind: string
          content_type: string
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          item_id: string
          metadata: Json
          price_option_id: string
          size_bytes: number
          storage_bucket: string
          storage_path: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attachment_kind: string
          content_type: string
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          item_id: string
          metadata?: Json
          price_option_id: string
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attachment_kind?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          item_id?: string
          metadata?: Json
          price_option_id?: string
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      cost_library_item_variant_cost_entries: {
        Row: {
          confidence: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          id: string
          is_current: boolean
          item_id: string
          misc_cost: number
          notes: string
          price_option_id: string
          pricing_date: string
          pricing_source: string | null
          source_url: string | null
          unit_cost: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          id?: string
          is_current?: boolean
          item_id: string
          misc_cost?: number
          notes?: string
          price_option_id: string
          pricing_date?: string
          pricing_source?: string | null
          source_url?: string | null
          unit_cost?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          id?: string
          is_current?: boolean
          item_id?: string
          misc_cost?: number
          notes?: string
          price_option_id?: string
          pricing_date?: string
          pricing_source?: string | null
          source_url?: string | null
          unit_cost?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      cost_library_item_state_history: {
        Row: {
          change_reason: string
          created_at: string
          created_by: string | null
          effective_at: string
          from_state: Database["public"]["Enums"]["component_lifecycle_state"] | null
          id: string
          item_id: string
          to_state: Database["public"]["Enums"]["component_lifecycle_state"]
          workspace_id: string
        }
        Insert: {
          change_reason?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          from_state?: Database["public"]["Enums"]["component_lifecycle_state"] | null
          id?: string
          item_id: string
          to_state: Database["public"]["Enums"]["component_lifecycle_state"]
          workspace_id: string
        }
        Update: {
          change_reason?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          from_state?: Database["public"]["Enums"]["component_lifecycle_state"] | null
          id?: string
          item_id?: string
          to_state?: Database["public"]["Enums"]["component_lifecycle_state"]
          workspace_id?: string
        }
        Relationships: []
      }
      cost_library_item_versions: {
        Row: {
          change_reason: string
          change_summary: string
          created_at: string
          created_by: string | null
          effective_at: string
          id: string
          item_id: string
          snapshot: Json
          version_number: number
          workspace_id: string
        }
        Insert: {
          change_reason?: string
          change_summary?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          item_id: string
          snapshot: Json
          version_number: number
          workspace_id: string
        }
        Update: {
          change_reason?: string
          change_summary?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          item_id?: string
          snapshot?: Json
          version_number?: number
          workspace_id?: string
        }
        Relationships: []
      }
      library_folders: {
        Row: {
          created_at: string
          created_by: string | null
          folder_kind: "taxonomy" | "custom"
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          source_category_node_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_kind: "taxonomy" | "custom"
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          source_category_node_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_kind?: "taxonomy" | "custom"
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          source_category_node_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_folders_source_category_node_id_fkey"
            columns: ["source_category_node_id"]
            isOneToOne: false
            referencedRelation: "component_category_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_folders_workspace_id_fkey"
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
          contingency_percentage: number
          misc_cost: number
          node_id: string
          quantity: number
          row_revision: number
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
          contingency_percentage?: number
          misc_cost?: number
          node_id: string
          quantity?: number
          row_revision?: number
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
          contingency_percentage?: number
          misc_cost?: number
          node_id?: string
          quantity?: number
          row_revision?: number
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
      estimate_sheet_events: {
        Row: {
          actor_user_id: string | null
          changed_fields: string[]
          correlation_id: string
          created_at: string
          estimate_id: string
          estimate_node_id: string | null
          event_source: string
          event_type: string
          id: string
          metadata: Json
          new_snapshot: Json | null
          old_snapshot: Json | null
          payload: Json
          row_context: Json
          target_row_id: string | null
          total_delta: number | null
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          changed_fields?: string[]
          correlation_id?: string
          created_at?: string
          estimate_id: string
          estimate_node_id?: string | null
          event_source?: string
          event_type: string
          id?: string
          metadata?: Json
          new_snapshot?: Json | null
          old_snapshot?: Json | null
          payload?: Json
          row_context?: Json
          target_row_id?: string | null
          total_delta?: number | null
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          changed_fields?: string[]
          correlation_id?: string
          created_at?: string
          estimate_id?: string
          estimate_node_id?: string | null
          event_source?: string
          event_type?: string
          id?: string
          metadata?: Json
          new_snapshot?: Json | null
          old_snapshot?: Json | null
          payload?: Json
          row_context?: Json
          target_row_id?: string | null
          total_delta?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_sheet_events_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_sheet_events_estimate_node_id_fkey"
            columns: ["estimate_node_id"]
            isOneToOne: false
            referencedRelation: "estimate_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_sheet_events_target_row_id_fkey"
            columns: ["target_row_id"]
            isOneToOne: false
            referencedRelation: "estimate_row_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_sheet_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_sheet_versions: {
        Row: {
          created_at: string
          created_by: string | null
          estimate_id: string
          id: string
          metadata: Json
          note: string
          snapshot: Json
          source_event_id: string | null
          summary: Json
          title: string
          version_label: string
          version_number: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estimate_id: string
          id?: string
          metadata?: Json
          note?: string
          snapshot: Json
          source_event_id?: string | null
          summary?: Json
          title?: string
          version_label: string
          version_number: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estimate_id?: string
          id?: string
          metadata?: Json
          note?: string
          snapshot?: Json
          source_event_id?: string | null
          summary?: Json
          title?: string
          version_label?: string
          version_number?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_sheet_versions_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_sheet_versions_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "estimate_sheet_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_sheet_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          contingency_percentage: number
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
          contingency_percentage?: number
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
          contingency_percentage?: number
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
          notes: string | null
          project_budget: number | null
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
          notes?: string | null
          project_budget?: number | null
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
          notes?: string | null
          project_budget?: number | null
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
      create_cost_library_component: {
        Args: { target_workspace_id: string; component: Json; price_options: Json }
        Returns: Json
      }
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
      insert_estimate_row_item_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          target_node_id: string
          row_payload: Json
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      update_estimate_row_item_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          target_row_id: string
          expected_row_revision: number
          row_patch: Json
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      replace_estimate_row_item_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          target_row_id: string
          expected_row_revision: number
          replacement_payload: Json
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      delete_estimate_row_item_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          target_row_id: string
          expected_row_revision: number
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      create_estimate_sheet_version: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          version_title?: string
          version_note?: string
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      restore_estimate_sheet_version_as_copy: {
        Args: {
          target_project_id: string
          source_version_id: string
          new_estimate_name?: string
          new_sheet_code?: string
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      get_estimate_activity_retention_metrics: {
        Args: {
          target_project_id: string
        }
        Returns: {
          workspace_event_bytes: number
          workspace_version_bytes: number
          largest_event_payload_bytes: number
          max_estimate_event_count: number
          estimates_over_event_threshold: number
          workspace_storage_over_threshold: boolean
        }[]
      }
      create_estimate_node_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          parent_node_id: string | null
          node_kind: Database["public"]["Enums"]["estimate_node_kind"]
          node_name: string
          initial_sort_order: number
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      rename_estimate_node_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          target_node_id: string
          next_name: string
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      insert_estimate_template_into_estimate_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          target_parent_node_id: string
          source_template_id: string
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      update_estimate_details_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          estimate_patch: Json
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      delete_estimate_node_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          target_node_id: string
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      set_cost_library_component_lifecycle_state: {
        Args: {
          target_workspace_id: string
          target_item_id: string
          next_state: Database["public"]["Enums"]["component_lifecycle_state"]
          change_reason?: string
          effective_at?: string
          acting_user_id?: string
        }
        Returns: Json
      }
      update_cost_library_component: {
        Args: { target_workspace_id: string; target_item_id: string; component: Json }
        Returns: Json
      }
      upsert_cost_library_component_price_option: {
        Args: { target_workspace_id: string; target_item_id: string; price_option: Json }
        Returns: Json
      }
      reorder_estimate_nodes: {
        Args: { target_estimate_id: string; move_updates: Json }
        Returns: number
      }
      reorder_estimate_nodes_with_history: {
        Args: {
          target_estimate_id: string
          move_updates: Json
          acting_user_id?: string
          correlation_id?: string
        }
        Returns: Json
      }
      reorder_library_folders: {
        Args: { target_workspace_id: string; folder_updates: Json }
        Returns: number
      }
      resolve_app_role_for_email: {
        Args: { raw_email: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      ai_interaction_mode: "ask" | "draft" | "apply" | "eval"
      ai_redaction_status: "metadata_only" | "redacted" | "synthetic" | "blocked"
      ai_run_status: "started" | "completed" | "failed" | "blocked"
      app_role: "ceo" | "admin" | "member"
      component_lifecycle_state:
        | "draft"
        | "in_production"
        | "available"
        | "discontinued"
        | "archived"
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
      ai_interaction_mode: ["ask", "draft", "apply", "eval"],
      ai_redaction_status: ["metadata_only", "redacted", "synthetic", "blocked"],
      ai_run_status: ["started", "completed", "failed", "blocked"],
      app_role: ["ceo", "admin", "member"],
      component_lifecycle_state: [
        "draft",
        "in_production",
        "available",
        "discontinued",
        "archived",
      ],
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
