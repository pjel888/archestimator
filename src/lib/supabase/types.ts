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
      account_security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          metadata_json: Json
          request_id: string | null
          user_agent_hash: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata_json?: Json
          request_id?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata_json?: Json
          request_id?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_security_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mass_deletion_events: {
        Row: {
          action: string
          actor_user_id: string | null
          blocked: Json
          correlation_id: string
          created_at: string
          id: string
          metadata: Json
          preview_hash: string
          status: string
          storage_cleanup_result: Json
          storage_targets: Json
          summary: Json
          target_ids: string[]
          target_type: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          blocked?: Json
          correlation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          preview_hash: string
          status?: string
          storage_cleanup_result?: Json
          storage_targets?: Json
          summary?: Json
          target_ids?: string[]
          target_type: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          blocked?: Json
          correlation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          preview_hash?: string
          status?: string
          storage_cleanup_result?: Json
          storage_targets?: Json
          summary?: Json
          target_ids?: string[]
          target_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mass_deletion_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mass_deletion_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      closed_beta_allowed_emails: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          metadata: Json
          normalized_email: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          metadata?: Json
          normalized_email: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          metadata?: Json
          normalized_email?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closed_beta_allowed_emails_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feedback_submissions: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          message: string
          metadata_json: Json
          page_path: string | null
          project_id: string | null
          severity: string
          status: string
          updated_at: string
          user_email: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          message: string
          metadata_json?: Json
          page_path?: string | null
          project_id?: string | null
          severity: string
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          metadata_json?: Json
          page_path?: string | null
          project_id?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_feedback_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beta_feedback_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beta_feedback_submissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_profiles: {
        Row: {
          country_region: string
          created_at: string
          display_name: string
          marketing_consent_at: string | null
          onboarding_completed_at: string | null
          primary_use: string | null
          student_educator_detail: string | null
          updated_at: string
          user_category: string
          user_id: string
        }
        Insert: {
          country_region: string
          created_at?: string
          display_name: string
          marketing_consent_at?: string | null
          onboarding_completed_at?: string | null
          primary_use?: string | null
          student_educator_detail?: string | null
          updated_at?: string
          user_category: string
          user_id: string
        }
        Update: {
          country_region?: string
          created_at?: string
          display_name?: string
          marketing_consent_at?: string | null
          onboarding_completed_at?: string | null
          primary_use?: string | null
          student_educator_detail?: string | null
          updated_at?: string
          user_category?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_account_settings: {
        Row: {
          company_size: string | null
          country_region: string
          created_at: string
          default_currency: string
          organization_name: string
          organization_type: string
          primary_use: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_size?: string | null
          country_region: string
          created_at?: string
          default_currency?: string
          organization_name: string
          organization_type: string
          primary_use?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_size?: string | null
          country_region?: string
          created_at?: string
          default_currency?: string
          organization_name?: string
          organization_type?: string
          primary_use?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_account_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      estimate_favorites: {
        Row: {
          created_at: string
          estimate_id: string
          id: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          estimate_id: string
          id?: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          estimate_id?: string
          id?: string
          project_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_favorites_estimate_project_fkey"
            columns: ["estimate_id", "project_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "estimate_favorites_project_workspace_fkey"
            columns: ["project_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      collaboration_invitations: {
        Row: {
          accepted_via: string | null
          accepted_at: string | null
          created_at: string
          direct_granted_at: string | null
          direct_granted_user_id: string | null
          email: string
          estimate_id: string | null
          expires_at: string
          id: string
          invited_by: string | null
          invited_user_id: string | null
          last_opened_at: string | null
          lifecycle_state: string
          project_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["collaboration_role"]
          scope: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accepted_via?: string | null
          accepted_at?: string | null
          created_at?: string
          direct_granted_at?: string | null
          direct_granted_user_id?: string | null
          email: string
          estimate_id?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_user_id?: string | null
          last_opened_at?: string | null
          lifecycle_state?: string
          project_id: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["collaboration_role"]
          scope?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accepted_via?: string | null
          accepted_at?: string | null
          created_at?: string
          direct_granted_at?: string | null
          direct_granted_user_id?: string | null
          email?: string
          estimate_id?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_user_id?: string | null
          last_opened_at?: string | null
          lifecycle_state?: string
          project_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["collaboration_role"]
          scope?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_invitations_estimate_project_fkey"
            columns: ["estimate_id", "project_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "collaboration_invitations_project_workspace_fkey"
            columns: ["project_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      collaboration_invitation_tokens: {
        Row: {
          created_at: string
          created_by: string
          delivery_method: string
          expires_at: string
          id: string
          invitation_id: string
          last_opened_at: string | null
          revoked_at: string | null
          revoked_by: string | null
          token_hash: string
          token_hint: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          delivery_method: string
          expires_at: string
          id?: string
          invitation_id: string
          last_opened_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash: string
          token_hint?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          delivery_method?: string
          expires_at?: string
          id?: string
          invitation_id?: string
          last_opened_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash?: string
          token_hint?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_invitation_tokens_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "collaboration_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          estimate_id: string | null
          event_type: string
          id: string
          invitation_id: string | null
          metadata: Json
          project_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          estimate_id?: string | null
          event_type: string
          id?: string
          invitation_id?: string | null
          metadata?: Json
          project_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          estimate_id?: string | null
          event_type?: string
          id?: string
          invitation_id?: string | null
          metadata?: Json
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_audit_events_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "collaboration_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_audit_events_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_sheet_access_settings: {
        Row: {
          created_at: string
          estimate_id: string
          inherit_project_access: boolean
          project_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          estimate_id: string
          inherit_project_access?: boolean
          project_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          estimate_id?: string
          inherit_project_access?: boolean
          project_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_sheet_access_settings_estimate_project_fkey"
            columns: ["estimate_id", "project_id"]
            isOneToOne: true
            referencedRelation: "estimates"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      estimate_sheet_members: {
        Row: {
          added_by: string | null
          created_at: string
          estimate_id: string
          project_id: string
          role: Database["public"]["Enums"]["collaboration_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          estimate_id: string
          project_id: string
          role?: Database["public"]["Enums"]["collaboration_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          estimate_id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["collaboration_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_sheet_members_estimate_project_fkey"
            columns: ["estimate_id", "project_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      project_publication_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["project_publication_event_type"]
          id: string
          ip_hash: string | null
          metadata_json: Json
          publication_id: string
          user_agent_hash: string | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["project_publication_event_type"]
          id?: string
          ip_hash?: string | null
          metadata_json?: Json
          publication_id: string
          user_agent_hash?: string | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["project_publication_event_type"]
          id?: string
          ip_hash?: string | null
          metadata_json?: Json
          publication_id?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_publication_events_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "project_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rate_limit_events: {
        Row: {
          expires_at: string
          id: string
          key_hash: string
          metadata_json: Json
          occurred_at: string
          scope: string
        }
        Insert: {
          expires_at: string
          id?: string
          key_hash: string
          metadata_json?: Json
          occurred_at?: string
          scope: string
        }
        Update: {
          expires_at?: string
          id?: string
          key_hash?: string
          metadata_json?: Json
          occurred_at?: string
          scope?: string
        }
        Relationships: []
      }
      shared_link_recipients: {
        Row: {
          created_at: string
          delivery_status: string
          display_name: string | null
          email_unsubscribed_at: string | null
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          last_opened_at: string | null
          publication_id: string
          recipient_token_hash: string
          resend_delivery_metadata: Json
          resend_email_id: string | null
          resend_last_event_at: string | null
          resend_last_event_id: string | null
          resend_last_event_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          display_name?: string | null
          email_unsubscribed_at?: string | null
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          last_opened_at?: string | null
          publication_id: string
          recipient_token_hash: string
          resend_delivery_metadata?: Json
          resend_email_id?: string | null
          resend_last_event_at?: string | null
          resend_last_event_id?: string | null
          resend_last_event_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_status?: string
          display_name?: string | null
          email_unsubscribed_at?: string | null
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          last_opened_at?: string | null
          publication_id?: string
          recipient_token_hash?: string
          resend_delivery_metadata?: Json
          resend_email_id?: string | null
          resend_last_event_at?: string | null
          resend_last_event_id?: string | null
          resend_last_event_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_link_recipients_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_link_recipients_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "project_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_link_comments: {
        Row: {
          author_email: string
          author_name: string | null
          body: string
          created_at: string
          estimate_id: string | null
          id: string
          is_internal: boolean
          publication_id: string
          recipient_id: string | null
          row_id: string | null
        }
        Insert: {
          author_email: string
          author_name?: string | null
          body: string
          created_at?: string
          estimate_id?: string | null
          id?: string
          is_internal?: boolean
          publication_id: string
          recipient_id?: string | null
          row_id?: string | null
        }
        Update: {
          author_email?: string
          author_name?: string | null
          body?: string
          created_at?: string
          estimate_id?: string | null
          id?: string
          is_internal?: boolean
          publication_id?: string
          recipient_id?: string | null
          row_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_link_comments_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "project_publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_link_comments_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "shared_link_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_link_responses: {
        Row: {
          created_at: string
          decision: string
          id: string
          note: string | null
          publication_id: string
          recipient_id: string
          snapshot_version_at_decision: number
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          publication_id: string
          recipient_id: string
          snapshot_version_at_decision: number
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          publication_id?: string
          recipient_id?: string
          snapshot_version_at_decision?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_link_responses_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "project_publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_link_responses_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "shared_link_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_link_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          metadata_json: Json
          publication_id: string
          recipient_id: string | null
          user_agent_hash: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata_json?: Json
          publication_id: string
          recipient_id?: string | null
          user_agent_hash?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata_json?: Json
          publication_id?: string
          recipient_id?: string | null
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_link_events_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "project_publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_link_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "shared_link_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      project_publications: {
        Row: {
          created_at: string
          encrypted_token: string
          expires_at: string | null
          id: string
          latest_opened_at: string | null
          open_count: number
          password_hash: string | null
          project_id: string
          published_at: string
          published_by: string | null
          revoked_at: string | null
          selected_estimate_ids: string[]
          snapshot_json: Json
          snapshot_version: number
          status: Database["public"]["Enums"]["project_publication_status"]
          token_hash: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          encrypted_token: string
          expires_at?: string | null
          id?: string
          latest_opened_at?: string | null
          open_count?: number
          password_hash?: string | null
          project_id: string
          published_at?: string
          published_by?: string | null
          revoked_at?: string | null
          selected_estimate_ids?: string[]
          snapshot_json: Json
          snapshot_version?: number
          status?: Database["public"]["Enums"]["project_publication_status"]
          token_hash: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          encrypted_token?: string
          expires_at?: string | null
          id?: string
          latest_opened_at?: string | null
          open_count?: number
          password_hash?: string | null
          project_id?: string
          published_at?: string
          published_by?: string | null
          revoked_at?: string | null
          selected_estimate_ids?: string[]
          snapshot_json?: Json
          snapshot_version?: number
          status?: Database["public"]["Enums"]["project_publication_status"]
          token_hash?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_publications_project_workspace_fkey"
            columns: ["project_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_workspace_id: string | null
          display_name: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_workspace_id?: string | null
          display_name?: string | null
          email: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
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
      project_favorites: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_favorites_project_workspace_fkey"
            columns: ["project_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      project_members: {
        Row: {
          added_by: string | null
          created_at: string
          project_id: string
          role: Database["public"]["Enums"]["collaboration_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          project_id: string
          role?: Database["public"]["Enums"]["collaboration_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["collaboration_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_workspace_fkey"
            columns: ["project_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "workspace_id"]
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
      check_closed_beta_access: {
        Args: { raw_email: string }
        Returns: {
          allowed: boolean
          status: string
          normalized_email: string
        }[]
      }
      create_closed_beta_allowlist_entry: {
        Args: { entry_email: string; entry_status: string; entry_notes?: string | null }
        Returns: string
      }
      read_closed_beta_allowlist_queue: {
        Args: { requested_status?: string | null }
        Returns: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          normalized_email: string
          notes: string | null
          status: string
          updated_at: string
        }[]
      }
      update_closed_beta_allowlist_entry: {
        Args: { entry_id: string; entry_status: string; entry_notes?: string | null }
        Returns: undefined
      }
      ensure_current_user_profile: {
        Args: { profile_display_name?: string | null; profile_avatar_url?: string | null }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
      }
      create_cost_library_component: {
        Args: { target_workspace_id: string; component: Json; price_options: Json }
        Returns: Json
      }
      create_ai_package_library_components_with_history: {
        Args: {
          target_workspace_id: string
          component_payloads: Json
          draft_id: string
          draft_hash: string
          idempotency_key: string
          correlation_id?: string
        }
        Returns: Json
      }
      current_user_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
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
      unlink_estimate_row_item_from_library_with_history: {
        Args: {
          target_project_id: string
          target_estimate_id: string
          target_row_id: string
          expected_row_revision: number
          acting_user_id?: string
          correlation_id?: string
          reason?: string
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
      can_manage_project_access: {
        Args: { target_project_id: string }
        Returns: boolean
      }
      preview_bulk_delete_projects: {
        Args: { target_project_ids: string[] }
        Returns: Json
      }
      execute_bulk_delete_projects: {
        Args: { target_project_ids: string[]; expected_preview_hash: string; correlation_id?: string }
        Returns: Json
      }
      preview_bulk_delete_estimate_sheets: {
        Args: { target_project_id: string; target_estimate_ids: string[] }
        Returns: Json
      }
      execute_bulk_delete_estimate_sheets: {
        Args: { target_project_id: string; target_estimate_ids: string[]; expected_preview_hash: string; correlation_id?: string }
        Returns: Json
      }
      preview_bulk_archive_library_components: {
        Args: { target_workspace_id: string; target_item_ids: string[] }
        Returns: Json
      }
      execute_bulk_archive_library_components: {
        Args: { target_workspace_id: string; target_item_ids: string[]; expected_preview_hash: string; correlation_id?: string }
        Returns: Json
      }
      record_mass_deletion_storage_cleanup_result: {
        Args: { target_event_id: string; cleanup_result: Json }
        Returns: Json
      }
      can_access_project: {
        Args: { target_project_id: string }
        Returns: boolean
      }
      can_edit_project: {
        Args: { target_project_id: string }
        Returns: boolean
      }
      can_access_estimate: {
        Args: { target_estimate_id: string }
        Returns: boolean
      }
      can_edit_estimate: {
        Args: { target_estimate_id: string }
        Returns: boolean
      }
      resolve_collaboration_invitation: {
        Args: { invitation_token_hash: string }
        Returns: {
          state: string
          invitation_id: string | null
          project_id: string | null
          estimate_id: string | null
          project_name: string | null
          project_code: string | null
          estimate_name: string | null
          role: string | null
          scope: string | null
          inviter_label: string | null
          inviter_email: string | null
          invited_email: string | null
          expires_at: string | null
          token_id: string | null
        }[]
      }
      accept_collaboration_invitation: {
        Args: { invitation_token_hash: string }
        Returns: Json
      }
      accept_collaboration_invitation_by_id: {
        Args: { target_invitation_id: string }
        Returns: Json
      }
      list_pending_collaboration_invitations: {
        Args: Record<PropertyKey, never>
        Returns: {
          invitation_id: string
          project_id: string | null
          estimate_id: string | null
          project_name: string | null
          project_code: string | null
          estimate_name: string | null
          role: string | null
          scope: string | null
          inviter_label: string | null
          state: string | null
          expires_at: string | null
          last_opened_at: string | null
          created_at: string | null
        }[]
      }
      revoke_collaboration_invitation: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      issue_collaboration_invitation_token: {
        Args: {
          invitation_id: string
          invitation_token_hash: string
          token_hint: string
          delivery_method: string
          token_expires_at: string
          revoke_existing: boolean
        }
        Returns: string
      }
      record_collaboration_invitation_delivery: {
        Args: { invitation_id: string; token_id: string; delivery_method: string }
        Returns: undefined
      }
      is_workspace_editor: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      increment_project_publication_open: {
        Args: { target_publication_id: string }
        Returns: undefined
      }
      insert_client_comment: {
        Args: {
          p_token_hash: string
          p_recipient_token_hash: string
          p_estimate_id: string | null
          p_row_id: string | null
          p_body: string
        }
        Returns: string
      }
      submit_client_response: {
        Args: {
          p_token_hash: string
          p_recipient_token_hash: string
          p_decision: string
          p_note: string | null
          p_expected_snapshot_version: number
        }
        Returns: string
      }
    }
    Enums: {
      ai_interaction_mode: "ask" | "draft" | "apply" | "eval"
      ai_redaction_status: "metadata_only" | "redacted" | "synthetic" | "blocked"
      ai_run_status: "started" | "completed" | "failed" | "blocked"
      app_role: "ceo" | "admin" | "member"
      collaboration_role: "owner" | "admin" | "editor" | "viewer"
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
      project_publication_event_type:
        | "open"
        | "password_success"
        | "password_failure"
        | "download_attempt_blocked"
        | "password_attempt"
      project_publication_status: "published" | "expired" | "revoked"
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
      collaboration_role: ["owner", "admin", "editor", "viewer"],
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
      project_publication_event_type: [
        "open",
        "password_success",
        "password_failure",
        "download_attempt_blocked",
        "password_attempt",
      ],
      project_publication_status: ["published", "expired", "revoked"],
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
