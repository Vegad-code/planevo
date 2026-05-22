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
      ai_feedback: {
        Row: {
          action: string
          correction_text: string | null
          created_at: string | null
          feature_name: string
          id: string
          suggestion_json: Json
          user_id: string | null
        }
        Insert: {
          action: string
          correction_text?: string | null
          created_at?: string | null
          feature_name: string
          id?: string
          suggestion_json: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          correction_text?: string | null
          created_at?: string | null
          feature_name?: string
          id?: string
          suggestion_json?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string | null
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_memory: {
        Row: {
          accepted_patterns: Json
          avoided_focus_windows: Json
          break_preference: Json
          created_at: string
          disliked_patterns: Json
          last_compacted_at: string | null
          learned_rules: Json
          planning_style: Json
          preferred_focus_windows: Json
          recurring_constraints: Json
          source_counters: Json
          task_detail_preference: Json
          tone_preference: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_patterns?: Json
          avoided_focus_windows?: Json
          break_preference?: Json
          created_at?: string
          disliked_patterns?: Json
          last_compacted_at?: string | null
          learned_rules?: Json
          planning_style?: Json
          preferred_focus_windows?: Json
          recurring_constraints?: Json
          source_counters?: Json
          task_detail_preference?: Json
          tone_preference?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_patterns?: Json
          avoided_focus_windows?: Json
          break_preference?: Json
          created_at?: string
          disliked_patterns?: Json
          last_compacted_at?: string | null
          learned_rules?: Json
          planning_style?: Json
          preferred_focus_windows?: Json
          recurring_constraints?: Json
          source_counters?: Json
          task_detail_preference?: Json
          tone_preference?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          color: string | null
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          end_time: string | null
          energy_level: string | null
          external_id: string | null
          icon: string | null
          id: string
          is_ai_suggested: boolean
          is_all_day: boolean | null
          is_completed: boolean | null
          is_deleted: boolean | null
          linked_task_id: string | null
          location: string | null
          metadata: Json | null
          bruno_notes: string | null
          recurrence_rule: string | null
          source: string | null
          start_time: string
          status: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_time?: string | null
          energy_level?: string | null
          external_id?: string | null
          icon?: string | null
          id?: string
          is_ai_suggested?: boolean
          is_all_day?: boolean | null
          is_completed?: boolean | null
          is_deleted?: boolean | null
          linked_task_id?: string | null
          location?: string | null
          metadata?: Json | null
          bruno_notes?: string | null
          recurrence_rule?: string | null
          source?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_time?: string | null
          energy_level?: string | null
          external_id?: string | null
          icon?: string | null
          id?: string
          is_ai_suggested?: boolean
          is_all_day?: boolean | null
          is_completed?: boolean | null
          is_deleted?: boolean | null
          linked_task_id?: string | null
          location?: string | null
          metadata?: Json | null
          bruno_notes?: string | null
          recurrence_rule?: string | null
          source?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_preferences: {
        Row: {
          created_at: string | null
          default_view: string | null
          end_hour: number | null
          id: string
          show_completed: boolean | null
          show_gaps: boolean | null
          start_hour: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_view?: string | null
          end_hour?: number | null
          id?: string
          show_completed?: boolean | null
          show_gaps?: boolean | null
          start_hour?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_view?: string | null
          end_hour?: number | null
          id?: string
          show_completed?: boolean | null
          show_gaps?: boolean | null
          start_hour?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_assignments: {
        Row: {
          course_name: string | null
          description: string | null
          due_at: string | null
          external_id: string | null
          html_url: string | null
          id: string
          name: string
          points_possible: number | null
          synced_at: string | null
          user_id: string | null
        }
        Insert: {
          course_name?: string | null
          description?: string | null
          due_at?: string | null
          external_id?: string | null
          html_url?: string | null
          id: string
          name: string
          points_possible?: number | null
          synced_at?: string | null
          user_id?: string | null
        }
        Update: {
          course_name?: string | null
          description?: string | null
          due_at?: string | null
          external_id?: string | null
          html_url?: string | null
          id?: string
          name?: string
          points_possible?: number | null
          synced_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_active: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_active?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_active?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          user_id: string
          was_interrupted: boolean | null
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          user_id: string
          was_interrupted?: boolean | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          user_id?: string
          was_interrupted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          blueprint: Json | null
          created_at: string
          deadline: string | null
          id: string
          notes: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          blueprint?: Json | null
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          blueprint?: Json | null
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          completed_at: string
          habit_id: string
          id: string
        }
        Insert: {
          completed_at?: string
          habit_id: string
          id?: string
        }
        Update: {
          completed_at?: string
          habit_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          consistency_score: number
          frequency: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          consistency_score?: number
          frequency?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          consistency_score?: number
          frequency?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bruno_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          message_type: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_type: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bruno_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruno_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          date: string
          id: string
          schedule_json: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          schedule_json?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          schedule_json?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          order: number
          task_id: string | null
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          order?: number
          task_id?: string | null
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          order?: number
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ai_confidence_score: number | null
          best_time_of_day: string | null
          completed: boolean | null
          completed_at: string | null
          consistency_score: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          energy_level_required: string | null
          estimated_minutes: number | null
          external_url: string | null
          id: string
          is_ai_suggested: boolean | null
          is_recurring: boolean | null
          last_ai_scheduling_at: string | null
          notes: string | null
          parent_task_id: string | null
          priority: string
          recurrence_pattern: string | null
          rescheduled_count: number | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_confidence_score?: number | null
          best_time_of_day?: string | null
          completed?: boolean | null
          completed_at?: string | null
          consistency_score?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          energy_level_required?: string | null
          estimated_minutes?: number | null
          external_url?: string | null
          id?: string
          is_ai_suggested?: boolean | null
          is_recurring?: boolean | null
          last_ai_scheduling_at?: string | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_pattern?: string | null
          rescheduled_count?: number | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_confidence_score?: number | null
          best_time_of_day?: string | null
          completed?: boolean | null
          completed_at?: string | null
          consistency_score?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          energy_level_required?: string | null
          estimated_minutes?: number | null
          external_url?: string | null
          id?: string
          is_ai_suggested?: boolean | null
          is_recurring?: boolean | null
          last_ai_scheduling_at?: string | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_pattern?: string | null
          rescheduled_count?: number | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          canvas_token: string | null
          canvas_url: string | null
          created_at: string
          email: string
          energy_preference: string | null
          expo_push_token: string | null
          google_calendar_connected: boolean | null
          google_calendar_id: string | null
          google_calendar_refresh_token: string | null
          google_classroom_connected: boolean | null
          id: string
          n8n_webhook_token: string | null
          name: string | null
          onboarding_complete: boolean
          plan_type: string
          preferred_morning_time: string | null
          push_notifications_enabled: boolean | null
          referral_code: string | null
          referred_by: string | null
          scheduling_preferences: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_end: string | null
        }
        Insert: {
          avatar_url?: string | null
          canvas_token?: string | null
          canvas_url?: string | null
          created_at?: string
          email: string
          energy_preference?: string | null
          expo_push_token?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_id?: string | null
          google_calendar_refresh_token?: string | null
          google_classroom_connected?: boolean | null
          id: string
          n8n_webhook_token?: string | null
          name?: string | null
          onboarding_complete?: boolean
          plan_type?: string
          preferred_morning_time?: string | null
          push_notifications_enabled?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          scheduling_preferences?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_end?: string | null
        }
        Update: {
          avatar_url?: string | null
          canvas_token?: string | null
          canvas_url?: string | null
          created_at?: string
          email?: string
          energy_preference?: string | null
          expo_push_token?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_id?: string | null
          google_calendar_refresh_token?: string | null
          google_classroom_connected?: boolean | null
          id?: string
          n8n_webhook_token?: string | null
          name?: string | null
          onboarding_complete?: boolean
          plan_type?: string
          preferred_morning_time?: string | null
          push_notifications_enabled?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          scheduling_preferences?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_end?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_use_ai: {
        Args: { p_limit: number; p_user_id: string }
        Returns: boolean
      }
      consume_ai_usage: {
        Args: { p_feature: string; p_limit: number; p_user_id: string }
        Returns: boolean
      }
      get_bruno_chat_context: { Args: { p_feature: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
