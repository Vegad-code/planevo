export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_user_metrics: {
        Row: {
          id: string
          user_id: string
          date: string
          focus_time_seconds: number
          tasks_completed: number
          tasks_planned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          focus_time_seconds?: number
          tasks_completed?: number
          tasks_planned?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          focus_time_seconds?: number
          tasks_completed?: number
          tasks_planned?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_user_metrics_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
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
          completed_at: string | null
          created_at: string | null
          estimated_cost_cents: number | null
          feature: string
          id: string
          input_tokens: number
          latency_ms: number | null
          mode: string | null
          model: string | null
          output_tokens: number
          request_id: string | null
          route_tier: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          estimated_cost_cents?: number | null
          feature: string
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          mode?: string | null
          model?: string | null
          output_tokens?: number
          request_id?: string | null
          route_tier?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          estimated_cost_cents?: number | null
          feature?: string
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          mode?: string | null
          model?: string | null
          output_tokens?: number
          request_id?: string | null
          route_tier?: string | null
          status?: string
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
      bruno_credit_ledger: {
        Row: {
          created_at: string
          credit_type: string
          delta: number
          id: string
          reason: string | null
          request_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_type: string
          delta: number
          id?: string
          reason?: string | null
          request_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credit_type?: string
          delta?: number
          id?: string
          reason?: string | null
          request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bruno_credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bruno_message_feedback: {
        Row: {
          conversation_id: string
          correction_text: string | null
          created_at: string
          exported_for_training_at: string | null
          id: string
          message_id: string
          message_snapshot: string | null
          model_route: Json | null
          rating: number
          user_id: string
          user_turn_snapshot: string | null
        }
        Insert: {
          conversation_id: string
          correction_text?: string | null
          created_at?: string
          exported_for_training_at?: string | null
          id?: string
          message_id: string
          message_snapshot?: string | null
          model_route?: Json | null
          rating: number
          user_id: string
          user_turn_snapshot?: string | null
        }
        Update: {
          conversation_id?: string
          correction_text?: string | null
          created_at?: string
          exported_for_training_at?: string | null
          id?: string
          message_id?: string
          message_snapshot?: string | null
          model_route?: Json | null
          rating?: number
          user_id?: string
          user_turn_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bruno_message_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruno_message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "bruno_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruno_message_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bruno_route_events: {
        Row: {
          confidence: number | null
          conversation_id: string | null
          created_at: string
          estimated_cost_cents: number | null
          estimated_input_tokens: number
          estimated_output_tokens: number
          id: string
          is_pro: boolean
          latency_ms: number | null
          message_id: string | null
          mode: string
          rationale: string | null
          request_id: string
          route_source: string
          safety_status: string
          selected_model: string | null
          selected_tier: string
          upgrade_card_shown: boolean
          used_deep_credit: boolean
          user_id: string
        }
        Insert: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          estimated_cost_cents?: number | null
          estimated_input_tokens?: number
          estimated_output_tokens?: number
          id?: string
          is_pro?: boolean
          latency_ms?: number | null
          message_id?: string | null
          mode: string
          rationale?: string | null
          request_id: string
          route_source: string
          safety_status?: string
          selected_model?: string | null
          selected_tier: string
          upgrade_card_shown?: boolean
          used_deep_credit?: boolean
          user_id: string
        }
        Update: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          estimated_cost_cents?: number | null
          estimated_input_tokens?: number
          estimated_output_tokens?: number
          id?: string
          is_pro?: boolean
          latency_ms?: number | null
          message_id?: string | null
          mode?: string
          rationale?: string | null
          request_id?: string
          route_source?: string
          safety_status?: string
          selected_model?: string | null
          selected_tier?: string
          upgrade_card_shown?: boolean
          used_deep_credit?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bruno_route_events_user_id_fkey"
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
          note_preference: Json
          planning_style: Json
          preferred_focus_windows: Json
          recurring_constraints: Json
          source_counters: Json
          task_detail_preference: Json
          task_duration_preferences: Json
          task_grouping_preferences: Json
          task_time_preferences: Json
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
          note_preference?: Json
          planning_style?: Json
          preferred_focus_windows?: Json
          recurring_constraints?: Json
          source_counters?: Json
          task_detail_preference?: Json
          task_duration_preferences?: Json
          task_grouping_preferences?: Json
          task_time_preferences?: Json
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
          note_preference?: Json
          planning_style?: Json
          preferred_focus_windows?: Json
          recurring_constraints?: Json
          source_counters?: Json
          task_detail_preference?: Json
          task_duration_preferences?: Json
          task_grouping_preferences?: Json
          task_time_preferences?: Json
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
      notes: {
        Row: {
          canvas_course_name: string | null
          content: string
          content_json: Json | null
          content_markdown: string | null
          created_at: string
          daily_date: string | null
          id: string
          is_archived: boolean
          is_daily: boolean
          is_pinned: boolean
          linked_assignment_id: string | null
          linked_task_id: string | null
          note_kind: string
          notebook_id: string | null
          privacy: string
          search_vector: unknown | null
          source_conversation_id: string | null
          subject: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_course_name?: string | null
          content?: string
          content_json?: Json | null
          content_markdown?: string | null
          created_at?: string
          daily_date?: string | null
          id?: string
          is_archived?: boolean
          is_daily?: boolean
          is_pinned?: boolean
          linked_assignment_id?: string | null
          linked_task_id?: string | null
          note_kind?: string
          notebook_id?: string | null
          privacy?: string
          search_vector?: unknown | null
          source_conversation_id?: string | null
          subject?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_course_name?: string | null
          content?: string
          content_json?: Json | null
          content_markdown?: string | null
          created_at?: string
          daily_date?: string | null
          id?: string
          is_archived?: boolean
          is_daily?: boolean
          is_pinned?: boolean
          linked_assignment_id?: string | null
          linked_task_id?: string | null
          note_kind?: string
          notebook_id?: string | null
          privacy?: string
          search_vector?: unknown | null
          source_conversation_id?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_linked_assignment_id_fkey"
            columns: ["linked_assignment_id"]
            isOneToOne: false
            referencedRelation: "canvas_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          canvas_course_name: string | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_course_name?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_course_name?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      note_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      note_tag_assignments: {
        Row: {
          note_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          note_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          note_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: []
      }
      note_links: {
        Row: {
          created_at: string
          id: string
          source_block_id: string | null
          source_note_id: string
          target_note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_block_id?: string | null
          source_note_id: string
          target_note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_block_id?: string | null
          source_note_id?: string
          target_note_id?: string
          user_id?: string
        }
        Relationships: []
      }
      note_block_refs: {
        Row: {
          block_id: string
          block_type: string
          id: string
          note_id: string
          text_preview: string | null
          user_id: string
        }
        Insert: {
          block_id: string
          block_type: string
          id?: string
          note_id: string
          text_preview?: string | null
          user_id: string
        }
        Update: {
          block_id?: string
          block_type?: string
          id?: string
          note_id?: string
          text_preview?: string | null
          user_id?: string
        }
        Relationships: []
      }
      note_revisions: {
        Row: {
          content_json: Json | null
          content_markdown: string | null
          created_at: string
          id: string
          note_id: string
          title: string
          user_id: string
        }
        Insert: {
          content_json?: Json | null
          content_markdown?: string | null
          created_at?: string
          id?: string
          note_id: string
          title: string
          user_id: string
        }
        Update: {
          content_json?: Json | null
          content_markdown?: string | null
          created_at?: string
          id?: string
          note_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      note_templates: {
        Row: {
          content_json: Json
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          note_kind: string
          slug: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          note_kind?: string
          slug: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          note_kind?: string
          slug?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      note_flashcards: {
        Row: {
          back: string
          block_id: string | null
          created_at: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          next_review_at: string
          note_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          block_id?: string | null
          created_at?: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          next_review_at?: string
          note_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          block_id?: string | null
          created_at?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          next_review_at?: string
          note_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      current_day_plan: {
        Row: {
          plan_json: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          plan_json?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          plan_json?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "current_day_plan_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      bruno_tool_logs: {
        Row: {
          id: string
          user_id: string
          tool_name: string
          arguments: Json
          result: Json
          idempotency_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tool_name: string
          arguments?: Json
          result?: Json
          idempotency_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tool_name?: string
          arguments?: Json
          result?: Json
          idempotency_key?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bruno_tool_logs_user_id_fkey"
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
          is_active_variant: boolean
          message_type: string
          parent_user_message_id: string | null
          parts: Json | null
          superseded_at: string | null
          turn_key: string | null
          user_id: string
          variant_index: number
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_active_variant?: boolean
          message_type: string
          parent_user_message_id?: string | null
          parts?: Json | null
          superseded_at?: string | null
          turn_key?: string | null
          user_id: string
          variant_index?: number
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_active_variant?: boolean
          message_type?: string
          parent_user_message_id?: string | null
          parts?: Json | null
          superseded_at?: string | null
          turn_key?: string | null
          user_id?: string
          variant_index?: number
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
            foreignKeyName: "bruno_messages_parent_user_message_id_fkey"
            columns: ["parent_user_message_id"]
            isOneToOne: false
            referencedRelation: "bruno_messages"
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
          color: string | null
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
          color?: string | null
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
          color?: string | null
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
          google_calendar_last_synced_at: string | null
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
          email_notifications_enabled: boolean | null
          referral_code: string | null
          referred_by: string | null
          scheduling_preferences: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          stripe_current_period_end: string | null
          subscription_status: string | null
          trial_end: string | null
          theme: string | null
          accent_color: string | null
          font_size: string | null
          reduce_motion: boolean | null
          sidebar_style: string
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
          google_calendar_last_synced_at?: string | null
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
          email_notifications_enabled?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          scheduling_preferences?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          stripe_current_period_end?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          theme?: string | null
          accent_color?: string | null
          font_size?: string | null
          reduce_motion?: boolean | null
          sidebar_style?: string
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
          google_calendar_last_synced_at?: string | null
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
          email_notifications_enabled?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          scheduling_preferences?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          stripe_current_period_end?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          theme?: string | null
          accent_color?: string | null
          font_size?: string | null
          reduce_motion?: boolean | null
          sidebar_style?: string
        }
        Relationships: []
      }
      integration_accounts: {
        Row: {
          id: string
          user_id: string
          provider: string
          provider_account_id: string | null
          display_name: string | null
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          scopes: string[] | null
          expires_at: string | null
          metadata: Json | null
          status: string
          last_synced_at: string | null
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          provider_account_id?: string | null
          display_name?: string | null
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          expires_at?: string | null
          metadata?: Json | null
          status?: string
          last_synced_at?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          provider_account_id?: string | null
          display_name?: string | null
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          expires_at?: string | null
          metadata?: Json | null
          status?: string
          last_synced_at?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      integration_sources: {
        Row: {
          id: string
          account_id: string
          user_id: string
          source_type: string
          external_id: string
          name: string
          sync_enabled: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          user_id: string
          source_type: string
          external_id: string
          name: string
          sync_enabled?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          user_id?: string
          source_type?: string
          external_id?: string
          name?: string
          sync_enabled?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sources_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sources_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      source_items: {
        Row: {
          id: string
          user_id: string
          provider: string
          source_id: string | null
          external_id: string
          item_type: string
          title: string
          description: string | null
          due_date: string | null
          url: string | null
          raw_data: Json | null
          imported_task_id: string | null
          imported_event_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          source_id?: string | null
          external_id: string
          item_type: string
          title: string
          description?: string | null
          due_date?: string | null
          url?: string | null
          raw_data?: Json | null
          imported_task_id?: string | null
          imported_event_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          source_id?: string
          external_id?: string
          item_type?: string
          title?: string
          description?: string | null
          due_date?: string | null
          url?: string | null
          raw_data?: Json | null
          imported_task_id?: string | null
          imported_event_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_items_source_id_fkey"
            columns: ["source_id"]
            referencedRelation: "integration_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_items_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      integration_sync_runs: {
        Row: {
          id: string
          user_id: string
          account_id: string
          provider: string
          status: string
          started_at: string
          finished_at: string | null
          items_seen: number
          items_created: number
          items_updated: number
          error_message: string | null
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          provider: string
          status: string
          started_at?: string
          finished_at?: string | null
          items_seen?: number
          items_created?: number
          items_updated?: number
          error_message?: string | null
          content?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          provider?: string
          status?: string
          started_at?: string
          finished_at?: string | null
          items_seen?: number
          items_created?: number
          items_updated?: number
          error_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_runs_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_runs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      integration_waitlist_requests: {
        Row: {
          id: string
          user_id: string
          provider: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_waitlist_requests_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          master_toggle: boolean
          channels: Json
          quiet_hours: Json
          types: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          master_toggle?: boolean
          channels?: Json
          quiet_hours?: Json
          types?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          master_toggle?: boolean
          channels?: Json
          quiet_hours?: Json
          types?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_deliveries: {
        Row: {
          id: string
          user_id: string
          notification_type: string
          channel: string
          dedupe_key: string
          metadata: Json
          sent_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: string
          channel: string
          dedupe_key: string
          metadata?: Json
          sent_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: string
          channel?: string
          dedupe_key?: string
          metadata?: Json
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_notifications: {
        Row: {
          id: string
          user_id: string
          kind: string
          title: string
          body: string
          subtitle: string | null
          href: string | null
          source_id: string
          priority: string
          read_at: string | null
          dismissed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          title: string
          body: string
          subtitle?: string | null
          href?: string | null
          source_id: string
          priority?: string
          read_at?: string | null
          dismissed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: string
          title?: string
          body?: string
          subtitle?: string | null
          href?: string | null
          source_id?: string
          priority?: string
          read_at?: string | null
          dismissed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
      consume_ai_usage_admin: {
        Args: {
          p_user_id: string
          p_feature: string
          p_daily_limit: number
          p_request_id?: string | null
        }
        Returns: { allowed: boolean; usage_log_id: string | null }[]
      }
      insert_security_audit_log: {
        Args: {
          p_actor_user_id: string | null
          p_action: string
          p_resource_type?: string | null
          p_resource_id?: string | null
          p_metadata?: Json
          p_ip_hash?: string | null
        }
        Returns: string
      }
      get_bruno_chat_context: { Args: { p_feature: string }; Returns: Json }
      refund_bruno_deep_access: {
        Args: { p_request_id: string; p_user_id: string }
        Returns: boolean
      }
      reserve_bruno_deep_access: {
        Args: {
          p_monthly_limit?: number
          p_request_id: string
          p_source: string
          p_user_id: string
        }
        Returns: {
          credit_type: string | null
          reserved: boolean
        }[]
      }
      consume_ip_rate_limit: {
        Args: {
          p_bucket_key: string
          p_max_attempts: number
          p_window_seconds: number
        }
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
