export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          published_at: string | null;
          reminder_at: string | null;
          team_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          published_at?: string | null;
          reminder_at?: string | null;
          team_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          published_at?: string | null;
          reminder_at?: string | null;
          team_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcements_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      itinerary_items: {
        Row: {
          created_at: string;
          description: string | null;
          event_date: string | null;
          id: string;
          itinerary_id: string;
          location: string | null;
          position: number;
          start_time: string | null;
          team_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          event_date?: string | null;
          id?: string;
          itinerary_id: string;
          location?: string | null;
          position: number;
          start_time?: string | null;
          team_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          event_date?: string | null;
          id?: string;
          itinerary_id?: string;
          location?: string | null;
          position?: number;
          start_time?: string | null;
          team_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "itinerary_items_itinerary_id_fkey";
            columns: ["itinerary_id"];
            isOneToOne: false;
            referencedRelation: "travel_itineraries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "itinerary_items_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      itinerary_template_items: {
        Row: {
          created_at: string;
          day_offset: number;
          description: string | null;
          id: string;
          location: string | null;
          position: number;
          start_time: string | null;
          team_id: string;
          template_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day_offset?: number;
          description?: string | null;
          id?: string;
          location?: string | null;
          position: number;
          start_time?: string | null;
          team_id: string;
          template_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day_offset?: number;
          description?: string | null;
          id?: string;
          location?: string | null;
          position?: number;
          start_time?: string | null;
          team_id?: string;
          template_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "itinerary_template_items_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "itinerary_template_items_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "itinerary_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      itinerary_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "itinerary_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "itinerary_templates_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      packing_list_item_status: {
        Row: {
          checked_at: string | null;
          is_checked: boolean;
          packing_list_item_id: string;
          team_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          checked_at?: string | null;
          is_checked?: boolean;
          packing_list_item_id: string;
          team_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          checked_at?: string | null;
          is_checked?: boolean;
          packing_list_item_id?: string;
          team_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packing_list_item_status_packing_list_item_id_fkey";
            columns: ["packing_list_item_id"];
            isOneToOne: false;
            referencedRelation: "packing_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "packing_list_item_status_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "packing_list_item_status_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      packing_list_items: {
        Row: {
          created_at: string;
          id: string;
          item_name: string;
          notes: string | null;
          packing_list_id: string;
          position: number;
          quantity: number | null;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_name: string;
          notes?: string | null;
          packing_list_id: string;
          position: number;
          quantity?: number | null;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_name?: string;
          notes?: string | null;
          packing_list_id?: string;
          position?: number;
          quantity?: number | null;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packing_list_items_packing_list_id_fkey";
            columns: ["packing_list_id"];
            isOneToOne: false;
            referencedRelation: "packing_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "packing_list_items_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      packing_list_template_items: {
        Row: {
          created_at: string;
          id: string;
          item_name: string;
          notes: string | null;
          position: number;
          quantity: number | null;
          team_id: string;
          template_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_name: string;
          notes?: string | null;
          position: number;
          quantity?: number | null;
          team_id: string;
          template_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_name?: string;
          notes?: string | null;
          position?: number;
          quantity?: number | null;
          team_id?: string;
          template_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packing_list_template_items_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "packing_list_template_items_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "packing_list_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      packing_list_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          mode: string;
          name: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          mode: string;
          name: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          mode?: string;
          name?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packing_list_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "packing_list_templates_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      packing_lists: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          itinerary_id: string | null;
          mode: string;
          published_at: string | null;
          source_template_id: string | null;
          team_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          itinerary_id?: string | null;
          mode: string;
          published_at?: string | null;
          source_template_id?: string | null;
          team_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          itinerary_id?: string | null;
          mode?: string;
          published_at?: string | null;
          source_template_id?: string | null;
          team_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packing_lists_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "packing_lists_itinerary_id_fkey";
            columns: ["itinerary_id"];
            isOneToOne: false;
            referencedRelation: "travel_itineraries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "packing_lists_source_template_id_fkey";
            columns: ["source_template_id"];
            isOneToOne: false;
            referencedRelation: "packing_list_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "packing_lists_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_plan_items: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          position: number;
          practice_plan_id: string;
          start_time: string | null;
          team_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          position: number;
          practice_plan_id: string;
          start_time?: string | null;
          team_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          position?: number;
          practice_plan_id?: string;
          start_time?: string | null;
          team_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_plan_items_practice_plan_id_fkey";
            columns: ["practice_plan_id"];
            isOneToOne: false;
            referencedRelation: "practice_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_plan_items_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_plan_template_items: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          position: number;
          start_time: string | null;
          team_id: string;
          template_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          position: number;
          start_time?: string | null;
          team_id: string;
          template_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          position?: number;
          start_time?: string | null;
          team_id?: string;
          template_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_plan_template_items_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_plan_template_items_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "practice_plan_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_plan_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_plan_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_plan_templates_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_plans: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          notes: string | null;
          practice_date: string;
          published_at: string | null;
          team_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          notes?: string | null;
          practice_date: string;
          published_at?: string | null;
          team_id: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          notes?: string | null;
          practice_date?: string;
          published_at?: string | null;
          team_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_plans_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_plans_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          created_at: string;
          device_name: string | null;
          endpoint: string | null;
          expo_push_token: string | null;
          id: string;
          is_active: boolean;
          last_seen_at: string | null;
          p256dh: string | null;
          platform: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
          web_push_auth_key: string | null;
        };
        Insert: {
          created_at?: string;
          device_name?: string | null;
          endpoint?: string | null;
          expo_push_token?: string | null;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string | null;
          p256dh?: string | null;
          platform: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
          web_push_auth_key?: string | null;
        };
        Update: {
          created_at?: string;
          device_name?: string | null;
          endpoint?: string | null;
          expo_push_token?: string | null;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string | null;
          p256dh?: string | null;
          platform?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
          web_push_auth_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      read_receipts: {
        Row: {
          announcement_id: string | null;
          content_type: string | null;
          id: string;
          practice_plan_id: string | null;
          team_id: string;
          user_id: string;
          viewed_at: string;
        };
        Insert: {
          announcement_id?: string | null;
          content_type?: string | null;
          id?: string;
          practice_plan_id?: string | null;
          team_id: string;
          user_id: string;
          viewed_at?: string;
        };
        Update: {
          announcement_id?: string | null;
          content_type?: string | null;
          id?: string;
          practice_plan_id?: string | null;
          team_id?: string;
          user_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "read_receipts_announcement_id_fkey";
            columns: ["announcement_id"];
            isOneToOne: false;
            referencedRelation: "announcements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "read_receipts_practice_plan_id_fkey";
            columns: ["practice_plan_id"];
            isOneToOne: false;
            referencedRelation: "practice_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "read_receipts_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "read_receipts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      team_invite_codes: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          max_uses: number | null;
          revoked_at: string | null;
          revoked_by: string | null;
          role: string;
          team_id: string;
          uses_count: number;
        };
        Insert: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: string;
          team_id: string;
          uses_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: string;
          team_id?: string;
          uses_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "team_invite_codes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invite_codes_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invite_codes_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          invited_via_code_id: string | null;
          joined_at: string;
          role: string;
          status: string;
          team_id: string;
          user_id: string;
        };
        Insert: {
          invited_via_code_id?: string | null;
          joined_at?: string;
          role: string;
          status?: string;
          team_id: string;
          user_id: string;
        };
        Update: {
          invited_via_code_id?: string | null;
          joined_at?: string;
          role?: string;
          status?: string;
          team_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_invited_via_code_id_fkey";
            columns: ["invited_via_code_id"];
            isOneToOne: false;
            referencedRelation: "team_invite_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          logo_path: string | null;
          name: string;
          primary_color: string | null;
          secondary_color: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          logo_path?: string | null;
          name: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          logo_path?: string | null;
          name?: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_itineraries: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_date: string | null;
          id: string;
          published_at: string | null;
          source_template_id: string | null;
          start_date: string;
          team_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_date?: string | null;
          id?: string;
          published_at?: string | null;
          source_template_id?: string | null;
          start_date: string;
          team_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_date?: string | null;
          id?: string;
          published_at?: string | null;
          source_template_id?: string | null;
          start_date?: string;
          team_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_itineraries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_itineraries_source_template_id_fkey";
            columns: ["source_template_id"];
            isOneToOne: false;
            referencedRelation: "itinerary_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_itineraries_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_invite_code: { Args: never; Returns: string };
      is_team_coach: {
        Args: { p_team_id: string; p_user_id?: string };
        Returns: boolean;
      };
      is_team_member: {
        Args: { p_team_id: string; p_user_id?: string };
        Returns: boolean;
      };
      notify_on_publish: {
        Args: {
          p_content_type: string;
          p_record_id: string;
          p_team_id: string;
        };
        Returns: undefined;
      };
      packing_list_item_mode: { Args: { p_item_id: string }; Returns: string };
      preview_invite_code: {
        Args: { p_code: string };
        Returns: {
          role: string;
          team_id: string;
          team_name: string;
        }[];
      };
      redeem_invite_code: { Args: { p_code: string }; Returns: string };
      shares_team_with: {
        Args: { p_other_user_id: string; p_user_id?: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
