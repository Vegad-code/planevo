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
      goals: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
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
      ollie_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ollie_messages_user_id_fkey"
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
          description: string | null
          due_date: string | null
          energy_level_required: string | null
          estimated_minutes: number | null
          id: string
          is_ai_suggested: boolean | null
          is_recurring: boolean | null
          last_ai_scheduling_at: string | null
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
          description?: string | null
          due_date?: string | null
          energy_level_required?: string | null
          estimated_minutes?: number | null
          id?: string
          is_ai_suggested?: boolean | null
          is_recurring?: boolean | null
          last_ai_scheduling_at?: string | null
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
          description?: string | null
          due_date?: string | null
          energy_level_required?: string | null
          estimated_minutes?: number | null
          id?: string
          is_ai_suggested?: boolean | null
          is_recurring?: boolean | null
          last_ai_scheduling_at?: string | null
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
      users: {
        Row: {
          avatar_url: string | null
          canvas_token: string | null
          canvas_url: string | null
          created_at: string
          email: string
          energy_preference: string | null
          google_classroom_connected: boolean | null
          id: string
          name: string | null
          onboarding_complete: boolean
          plan_type: string
          preferred_morning_time: string | null
        }
        Insert: {
          avatar_url?: string | null
          canvas_token?: string | null
          canvas_url?: string | null
          created_at?: string
          email: string
          energy_preference?: string | null
          google_classroom_connected?: boolean | null
          id: string
          name?: string | null
          onboarding_complete?: boolean
          plan_type?: string
          preferred_morning_time?: string | null
        }
        Update: {
          avatar_url?: string | null
          canvas_token?: string | null
          canvas_url?: string | null
          created_at?: string
          email?: string
          energy_preference?: string | null
          google_classroom_connected?: boolean | null
          id?: string
          name?: string | null
          onboarding_complete?: boolean
          plan_type?: string
          preferred_morning_time?: string | null
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

// Helper types for easier use in the app
export type User = Tables<"users">;
export type TaskPriority = "low" | "medium" | "high";
export type BestTimeOfDay = "morning" | "afternoon" | "evening" | "anytime";
export type EnergyLevel = "low" | "medium" | "high";

export type Task = Tables<"tasks">;
export type OllieMood = "happy" | "thinking" | "encouraging" | "celebrating" | "sleepy" | "focused" | "gentle";

export interface TaskGroup {
  id: string;
  title: string;
  icon: string;
  ai_generated: boolean;
  sort_order: number;
  is_collapsed: boolean;
  tasks: Task[];
}

export interface AITaskResponse {
  today_focus: string[];
  this_week: string[];
  waiting: string[];
  recommendations: Record<string, {
    task_id: string;
    best_time_of_day: string;
    estimated_minutes: number;
    priority: string;
    reasoning: string;
  }>;
  encouraging_message: string;
}
