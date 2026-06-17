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
      activities: {
        Row: {
          approval_status: Database["public"]["Enums"]["activity_approval_status"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          due_date: string
          est_minutes: number | null
          id: string
          lead_id: string | null
          notes_ar: string | null
          notes_en: string | null
          owner_id: string | null
          presales_team: string[] | null
          project_id: string | null
          rejection_reason: string | null
          review_note: string | null
          status: Database["public"]["Enums"]["activity_status"]
          time: string | null
          title_ar: string | null
          title_en: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["activity_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          est_minutes?: number | null
          id?: string
          lead_id?: string | null
          notes_ar?: string | null
          notes_en?: string | null
          owner_id?: string | null
          presales_team?: string[] | null
          project_id?: string | null
          rejection_reason?: string | null
          review_note?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          time?: string | null
          title_ar?: string | null
          title_en: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["activity_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          est_minutes?: number | null
          id?: string
          lead_id?: string | null
          notes_ar?: string | null
          notes_en?: string | null
          owner_id?: string | null
          presales_team?: string[] | null
          project_id?: string | null
          rejection_reason?: string | null
          review_note?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          time?: string | null
          title_ar?: string | null
          title_en?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types_config: {
        Row: {
          id: string
          key: string
          label_ar: string | null
          label_en: string
        }
        Insert: {
          id?: string
          key: string
          label_ar?: string | null
          label_en: string
        }
        Update: {
          id?: string
          key?: string
          label_ar?: string | null
          label_en?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          id: string
          mime: string | null
          name_ar: string | null
          name_en: string
          parent_id: string
          parent_table: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mime?: string | null
          name_ar?: string | null
          name_en: string
          parent_id: string
          parent_table: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mime?: string | null
          name_ar?: string | null
          name_en?: string
          parent_id?: string
          parent_table?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          hours: number | null
          id: string
          lat: number | null
          lng: number | null
          location_ar: string | null
          location_en: string | null
          profile_id: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          hours?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_ar?: string | null
          location_en?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          hours?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_ar?: string | null
          location_en?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_ar: string | null
          action_en: string
          created_at: string
          enabled: boolean
          id: string
          name_ar: string | null
          name_en: string
          trigger_ar: string | null
          trigger_en: string
        }
        Insert: {
          action_ar?: string | null
          action_en: string
          created_at?: string
          enabled?: boolean
          id?: string
          name_ar?: string | null
          name_en: string
          trigger_ar?: string | null
          trigger_en: string
        }
        Update: {
          action_ar?: string | null
          action_en?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name_ar?: string | null
          name_en?: string
          trigger_ar?: string | null
          trigger_en?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          city_ar: string | null
          city_en: string | null
          contact_name_ar: string | null
          contact_name_en: string | null
          created_at: string
          district_ar: string | null
          district_en: string | null
          email: string | null
          id: string
          industry_ar: string | null
          industry_en: string | null
          lat: number | null
          lng: number | null
          name_ar: string | null
          name_en: string
          notes: string | null
          phone: string | null
          street_ar: string | null
          street_en: string | null
          updated_at: string
        }
        Insert: {
          city_ar?: string | null
          city_en?: string | null
          contact_name_ar?: string | null
          contact_name_en?: string | null
          created_at?: string
          district_ar?: string | null
          district_en?: string | null
          email?: string | null
          id?: string
          industry_ar?: string | null
          industry_en?: string | null
          lat?: number | null
          lng?: number | null
          name_ar?: string | null
          name_en: string
          notes?: string | null
          phone?: string | null
          street_ar?: string | null
          street_en?: string | null
          updated_at?: string
        }
        Update: {
          city_ar?: string | null
          city_en?: string | null
          contact_name_ar?: string | null
          contact_name_en?: string | null
          created_at?: string
          district_ar?: string | null
          district_en?: string | null
          email?: string | null
          id?: string
          industry_ar?: string | null
          industry_en?: string | null
          lat?: number | null
          lng?: number | null
          name_ar?: string | null
          name_en?: string
          notes?: string | null
          phone?: string | null
          street_ar?: string | null
          street_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name_ar: string | null
          name_en: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en: string
        }
        Update: {
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en?: string
        }
        Relationships: []
      }
      email_delivery_logs: {
        Row: {
          attempt: number
          created_at: string
          error: string | null
          id: string
          job_id: string
          recipient: string
          status: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          error?: string | null
          id?: string
          job_id: string
          recipient: string
          status: string
        }
        Update: {
          attempt?: number
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string
          recipient?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "email_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_jobs: {
        Row: {
          attempts: number
          body: string
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          last_attempt_at: string | null
          max_attempts: number
          recipients: string[]
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          body?: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          recipients?: string[]
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          recipients?: string[]
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      history: {
        Row: {
          action_ar: string | null
          action_en: string
          actor_id: string | null
          created_at: string
          details_ar: string | null
          details_en: string | null
          id: string
          module: Database["public"]["Enums"]["history_module"]
          target_ar: string | null
          target_en: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_ar?: string | null
          action_en: string
          actor_id?: string | null
          created_at?: string
          details_ar?: string | null
          details_en?: string | null
          id?: string
          module: Database["public"]["Enums"]["history_module"]
          target_ar?: string | null
          target_en?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_ar?: string | null
          action_en?: string
          actor_id?: string | null
          created_at?: string
          details_ar?: string | null
          details_en?: string | null
          id?: string
          module?: Database["public"]["Enums"]["history_module"]
          target_ar?: string | null
          target_en?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_blocklist: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          first_seen: string
          hits: number
          id: string
          ip: unknown
          last_seen: string
          reason: string
          triggered_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          first_seen?: string
          hits?: number
          id?: string
          ip: unknown
          last_seen?: string
          reason?: string
          triggered_by?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          first_seen?: string
          hits?: number
          id?: string
          ip?: unknown
          last_seen?: string
          reason?: string
          triggered_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ip: unknown
          note: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip: unknown
          note?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip?: unknown
          note?: string
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          lead_id: string
          text_ar: string | null
          text_en: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          text_ar?: string | null
          text_en?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          text_ar?: string | null
          text_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city_ar: string | null
          city_en: string | null
          client_id: string | null
          code: string | null
          company_ar: string | null
          company_en: string
          contact_name_ar: string | null
          contact_name_en: string | null
          country: string
          created_at: string
          created_by: string | null
          district_ar: string | null
          district_en: string | null
          email: string | null
          expected_close_date: string | null
          id: string
          industry_ar: string | null
          industry_en: string | null
          lat: number | null
          lng: number | null
          owner_id: string | null
          phone: string | null
          probability: number | null
          project_id: string | null
          source_ar: string | null
          source_en: string | null
          status: Database["public"]["Enums"]["lead_status"]
          street_ar: string | null
          street_en: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          city_ar?: string | null
          city_en?: string | null
          client_id?: string | null
          code?: string | null
          company_ar?: string | null
          company_en: string
          contact_name_ar?: string | null
          contact_name_en?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          district_ar?: string | null
          district_en?: string | null
          email?: string | null
          expected_close_date?: string | null
          id?: string
          industry_ar?: string | null
          industry_en?: string | null
          lat?: number | null
          lng?: number | null
          owner_id?: string | null
          phone?: string | null
          probability?: number | null
          project_id?: string | null
          source_ar?: string | null
          source_en?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          street_ar?: string | null
          street_en?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          city_ar?: string | null
          city_en?: string | null
          client_id?: string | null
          code?: string | null
          company_ar?: string | null
          company_en?: string
          contact_name_ar?: string | null
          contact_name_en?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          district_ar?: string | null
          district_en?: string | null
          email?: string | null
          expected_close_date?: string | null
          id?: string
          industry_ar?: string | null
          industry_en?: string | null
          lat?: number | null
          lng?: number | null
          owner_id?: string | null
          phone?: string | null
          probability?: number | null
          project_id?: string | null
          source_ar?: string | null
          source_en?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          street_ar?: string | null
          street_en?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city_ar: string | null
          city_en: string
          districts_ar: string[] | null
          districts_en: string[] | null
          id: string
        }
        Insert: {
          city_ar?: string | null
          city_en: string
          districts_ar?: string[] | null
          districts_en?: string[] | null
          id?: string
        }
        Update: {
          city_ar?: string | null
          city_en?: string
          districts_ar?: string[] | null
          districts_en?: string[] | null
          id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          delivered_at: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body_ar: string | null
          body_en: string
          channel: string
          created_at: string
          enabled: boolean
          id: string
          name_ar: string | null
          name_en: string
          subject_ar: string | null
          subject_en: string | null
          updated_at: string
        }
        Insert: {
          body_ar?: string | null
          body_en: string
          channel: string
          created_at?: string
          enabled?: boolean
          id?: string
          name_ar?: string | null
          name_en: string
          subject_ar?: string | null
          subject_en?: string | null
          updated_at?: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name_ar?: string | null
          name_en?: string
          subject_ar?: string | null
          subject_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audience: string[] | null
          audience_roles: Database["public"]["Enums"]["app_role"][] | null
          body_ar: string | null
          body_en: string | null
          created_at: string
          created_by: string | null
          href: string | null
          id: string
          title_ar: string | null
          title_en: string
          type: Database["public"]["Enums"]["notification_type"]
          unread_by: string[] | null
        }
        Insert: {
          audience?: string[] | null
          audience_roles?: Database["public"]["Enums"]["app_role"][] | null
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          created_by?: string | null
          href?: string | null
          id?: string
          title_ar?: string | null
          title_en: string
          type: Database["public"]["Enums"]["notification_type"]
          unread_by?: string[] | null
        }
        Update: {
          audience?: string[] | null
          audience_roles?: Database["public"]["Enums"]["app_role"][] | null
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          created_by?: string | null
          href?: string | null
          id?: string
          title_ar?: string | null
          title_en?: string
          type?: Database["public"]["Enums"]["notification_type"]
          unread_by?: string[] | null
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          id: string
          key: string
          label_ar: string | null
          label_en: string
          sort_order: number
        }
        Insert: {
          color?: string
          id?: string
          key: string
          label_ar?: string | null
          label_en: string
          sort_order?: number
        }
        Update: {
          color?: string
          id?: string
          key?: string
          label_ar?: string | null
          label_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          name_ar: string | null
          name_en: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          name_ar?: string | null
          name_en: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          annual_target: number | null
          avatar_url: string | null
          created_at: string
          department_ar: string | null
          department_en: string | null
          email: string
          full_name_ar: string | null
          full_name_en: string
          id: string
          location_ar: string | null
          location_en: string | null
          manager_id: string | null
          phone: string | null
          q1_target: number | null
          q2_target: number | null
          q3_target: number | null
          q4_target: number | null
          skills: string[] | null
          start_date: string | null
          target_type: string | null
          target_value: number | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          user_id: string
          weekly_meetings_target: number | null
        }
        Insert: {
          active?: boolean
          annual_target?: number | null
          avatar_url?: string | null
          created_at?: string
          department_ar?: string | null
          department_en?: string | null
          email: string
          full_name_ar?: string | null
          full_name_en: string
          id?: string
          location_ar?: string | null
          location_en?: string | null
          manager_id?: string | null
          phone?: string | null
          q1_target?: number | null
          q2_target?: number | null
          q3_target?: number | null
          q4_target?: number | null
          skills?: string[] | null
          start_date?: string | null
          target_type?: string | null
          target_value?: number | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          user_id: string
          weekly_meetings_target?: number | null
        }
        Update: {
          active?: boolean
          annual_target?: number | null
          avatar_url?: string | null
          created_at?: string
          department_ar?: string | null
          department_en?: string | null
          email?: string
          full_name_ar?: string | null
          full_name_en?: string
          id?: string
          location_ar?: string | null
          location_en?: string | null
          manager_id?: string | null
          phone?: string | null
          q1_target?: number | null
          q2_target?: number | null
          q3_target?: number | null
          q4_target?: number | null
          skills?: string[] | null
          start_date?: string | null
          target_type?: string | null
          target_value?: number | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          user_id?: string
          weekly_meetings_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          added_at: string
          id: string
          profile_id: string
          project_id: string
          role_ar: string | null
          role_en: string | null
        }
        Insert: {
          added_at?: string
          id?: string
          profile_id: string
          project_id: string
          role_ar?: string | null
          role_en?: string | null
        }
        Update: {
          added_at?: string
          id?: string
          profile_id?: string
          project_id?: string
          role_ar?: string | null
          role_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requests: {
        Row: {
          account_type: string | null
          budget: number | null
          category_ar: string | null
          category_en: string | null
          city_ar: string | null
          city_en: string | null
          client_name_ar: string | null
          client_name_en: string
          competitors: string[] | null
          contact_name_ar: string | null
          contact_name_en: string
          created_at: string
          created_client_id: string | null
          created_project_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          description_ar: string | null
          description_en: string | null
          district_ar: string | null
          district_en: string | null
          email: string
          end_date: string | null
          extra_contacts: Json | null
          id: string
          name_ar: string | null
          name_en: string
          offered_value: number | null
          other_account_type: string | null
          phone: string
          project_type_ar: string | null
          project_type_en: string | null
          requested_by: string
          start_date: string | null
          status: string
          street_ar: string | null
          street_en: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          budget?: number | null
          category_ar?: string | null
          category_en?: string | null
          city_ar?: string | null
          city_en?: string | null
          client_name_ar?: string | null
          client_name_en: string
          competitors?: string[] | null
          contact_name_ar?: string | null
          contact_name_en: string
          created_at?: string
          created_client_id?: string | null
          created_project_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          description_ar?: string | null
          description_en?: string | null
          district_ar?: string | null
          district_en?: string | null
          email: string
          end_date?: string | null
          extra_contacts?: Json | null
          id?: string
          name_ar?: string | null
          name_en: string
          offered_value?: number | null
          other_account_type?: string | null
          phone: string
          project_type_ar?: string | null
          project_type_en?: string | null
          requested_by: string
          start_date?: string | null
          status?: string
          street_ar?: string | null
          street_en?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          budget?: number | null
          category_ar?: string | null
          category_en?: string | null
          city_ar?: string | null
          city_en?: string | null
          client_name_ar?: string | null
          client_name_en?: string
          competitors?: string[] | null
          contact_name_ar?: string | null
          contact_name_en?: string
          created_at?: string
          created_client_id?: string | null
          created_project_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          description_ar?: string | null
          description_en?: string | null
          district_ar?: string | null
          district_en?: string | null
          email?: string
          end_date?: string | null
          extra_contacts?: Json | null
          id?: string
          name_ar?: string | null
          name_en?: string
          offered_value?: number | null
          other_account_type?: string | null
          phone?: string
          project_type_ar?: string | null
          project_type_en?: string | null
          requested_by?: string
          start_date?: string | null
          status?: string
          street_ar?: string | null
          street_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_requests_created_client_id_fkey"
            columns: ["created_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_created_project_id_fkey"
            columns: ["created_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          account_type: string | null
          budget: number | null
          category_ar: string | null
          category_en: string | null
          city_ar: string | null
          city_en: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          code: string | null
          competitors: string[] | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          district_ar: string | null
          district_en: string | null
          end_date: string | null
          extra_contacts: Json | null
          id: string
          manager_id: string | null
          name_ar: string | null
          name_en: string
          offered_value: number | null
          other_account_type: string | null
          progress: number | null
          project_type_ar: string | null
          project_type_en: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          street_ar: string | null
          street_en: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          budget?: number | null
          category_ar?: string | null
          category_en?: string | null
          city_ar?: string | null
          city_en?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          code?: string | null
          competitors?: string[] | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          district_ar?: string | null
          district_en?: string | null
          end_date?: string | null
          extra_contacts?: Json | null
          id?: string
          manager_id?: string | null
          name_ar?: string | null
          name_en: string
          offered_value?: number | null
          other_account_type?: string | null
          progress?: number | null
          project_type_ar?: string | null
          project_type_en?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          street_ar?: string | null
          street_en?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          budget?: number | null
          category_ar?: string | null
          category_en?: string | null
          city_ar?: string | null
          city_en?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          code?: string | null
          competitors?: string[] | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          district_ar?: string | null
          district_en?: string | null
          end_date?: string | null
          extra_contacts?: Json | null
          id?: string
          manager_id?: string | null
          name_ar?: string | null
          name_en?: string
          offered_value?: number | null
          other_account_type?: string | null
          progress?: number | null
          project_type_ar?: string | null
          project_type_en?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          street_ar?: string | null
          street_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          description_ar: string | null
          description_en: string | null
          id: string
          name_ar: string | null
          name_en: string
          qty: number
          quotation_id: string
          sort_order: number | null
          total: number | null
          unit_price: number
        }
        Insert: {
          description_ar?: string | null
          description_en?: string | null
          id?: string
          name_ar?: string | null
          name_en: string
          qty?: number
          quotation_id: string
          sort_order?: number | null
          total?: number | null
          unit_price?: number
        }
        Update: {
          description_ar?: string | null
          description_en?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string
          qty?: number
          quotation_id?: string
          sort_order?: number | null
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string | null
          code: string | null
          created_at: string
          created_by: string | null
          currency: string
          description_ar: string | null
          description_en: string | null
          id: string
          lead_id: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          submission_date: string
          title_ar: string | null
          title_en: string
          updated_at: string
          valid_until: string | null
          value: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          submission_date?: string
          title_ar?: string | null
          title_en: string
          updated_at?: string
          valid_until?: string | null
          value?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          submission_date?: string
          title_ar?: string | null
          title_en?: string
          updated_at?: string
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_counters: {
        Row: {
          bucket: string
          count: number
          ip: unknown
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          ip: unknown
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          ip?: unknown
          window_start?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          id: string
          page: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          id?: string
          page: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          id?: string
          page?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          resource_id: string | null
          resource_type: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json
          event_type: string
          id: string
          ip: unknown
          path: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          ip?: unknown
          path?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          ip?: unknown
          path?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      security_scan_runs: {
        Row: {
          findings: Json
          finished_at: string | null
          id: string
          score: number | null
          started_at: string
          started_by: string | null
          summary: Json
        }
        Insert: {
          findings?: Json
          finished_at?: string | null
          id?: string
          score?: number | null
          started_at?: string
          started_by?: string | null
          summary?: Json
        }
        Update: {
          findings?: Json
          finished_at?: string | null
          id?: string
          score?: number | null
          started_at?: string
          started_by?: string | null
          summary?: Json
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          enabled: boolean
          from_email: string
          from_name: string
          host: string
          id: number
          password: string
          port: number
          provider: string
          reply_to: string | null
          secure: boolean
          updated_at: string
          updated_by: string | null
          username: string
        }
        Insert: {
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: number
          password?: string
          port?: number
          provider?: string
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Update: {
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: number
          password?: string
          port?: number
          provider?: string
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_directory: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          department_ar: string | null
          department_en: string | null
          full_name_ar: string | null
          full_name_en: string | null
          id: string | null
          title_ar: string | null
          title_en: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          department_ar?: string | null
          department_en?: string | null
          full_name_ar?: string | null
          full_name_en?: string | null
          id?: string | null
          title_ar?: string | null
          title_en?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          department_ar?: string | null
          department_en?: string | null
          full_name_ar?: string | null
          full_name_en?: string | null
          id?: string | null
          title_ar?: string | null
          title_en?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_remove_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_users_list: {
        Args: never
        Returns: {
          active: boolean
          auth_created_at: string
          avatar_url: string
          email: string
          full_name_ar: string
          full_name_en: string
          last_sign_in_at: string
          profile_id: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      approve_project_request: {
        Args: { _id: string; _note?: string }
        Returns: string
      }
      chat_directory: {
        Args: never
        Returns: {
          active: boolean
          avatar_url: string
          email: string
          full_name_ar: string
          full_name_en: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      current_profile_id: { Args: never; Returns: string }
      current_role_of: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ip_blocked: { Args: { _ip: unknown }; Returns: boolean }
      is_project_member: { Args: { _project_id: string }; Returns: boolean }
      rate_limit_check: {
        Args: {
          _bucket: string
          _ip: unknown
          _limit: number
          _window_seconds: number
        }
        Returns: boolean
      }
      record_security_event: {
        Args: {
          _details: Json
          _event_type: string
          _ip: unknown
          _path: string
          _severity: string
          _user_id: string
        }
        Returns: string
      }
      reject_project_request: {
        Args: { _id: string; _note?: string }
        Returns: undefined
      }
      roles_of: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      run_notification_scans: { Args: never; Returns: undefined }
      security_gc: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      t: { Args: { _ar: string; _en: string; _lang?: string }; Returns: string }
    }
    Enums: {
      activity_approval_status: "pending" | "approved" | "rejected"
      activity_status:
        | "pending"
        | "in_progress"
        | "done"
        | "cancelled"
        | "delayed"
      activity_type:
        | "Call"
        | "Meeting"
        | "Site Visit"
        | "Follow-up"
        | "Inspection"
        | "Email"
      app_role: "admin" | "manager" | "hr" | "finance" | "employee"
      attendance_status: "present" | "late" | "absent" | "leave"
      history_module:
        | "lead"
        | "pipeline"
        | "project"
        | "employee"
        | "activity"
        | "settings"
        | "quotation"
        | "attendance"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
        | "meeting_scheduled"
        | "proposal_sent"
        | "archived"
      notification_type:
        | "lead"
        | "chat"
        | "activity"
        | "attendance"
        | "quotation"
        | "project"
        | "system"
      project_status:
        | "On Track"
        | "At Risk"
        | "Delayed"
        | "Completed"
        | "On Hold"
      quotation_status:
        | "draft"
        | "pending_approval"
        | "sent"
        | "negotiating"
        | "accepted"
        | "rejected"
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
      activity_approval_status: ["pending", "approved", "rejected"],
      activity_status: [
        "pending",
        "in_progress",
        "done",
        "cancelled",
        "delayed",
      ],
      activity_type: [
        "Call",
        "Meeting",
        "Site Visit",
        "Follow-up",
        "Inspection",
        "Email",
      ],
      app_role: ["admin", "manager", "hr", "finance", "employee"],
      attendance_status: ["present", "late", "absent", "leave"],
      history_module: [
        "lead",
        "pipeline",
        "project",
        "employee",
        "activity",
        "settings",
        "quotation",
        "attendance",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
        "meeting_scheduled",
        "proposal_sent",
        "archived",
      ],
      notification_type: [
        "lead",
        "chat",
        "activity",
        "attendance",
        "quotation",
        "project",
        "system",
      ],
      project_status: [
        "On Track",
        "At Risk",
        "Delayed",
        "Completed",
        "On Hold",
      ],
      quotation_status: [
        "draft",
        "pending_approval",
        "sent",
        "negotiating",
        "accepted",
        "rejected",
      ],
    },
  },
} as const
