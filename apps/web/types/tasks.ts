export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type BestTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type EnergyLevel = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: TaskPriority | null;
  estimated_minutes?: number | null;
  best_time_of_day?: BestTimeOfDay | null;
  color?: string | null;
  energy_level_required?: EnergyLevel | null;
  parent_task_id?: string | null;
  recurrence_pattern?: string | null;
  notes?: string | null;
  due_date?: string | null;
  external_url?: string | null;
  source?: 'canvas' | 'google_calendar' | 'manual' | 'ai_suggested';
  completed: boolean;
  completed_at?: string | null;
  is_ai_suggested?: boolean;
  ai_confidence_score?: number;
  is_recurring?: boolean;
  consistency_score?: number | null;
  rescheduled_count?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface TaskGroup {
  id: string;
  title: string;
  icon: string;
  tasks: Task[];
  is_collapsed?: boolean;
  ai_generated?: boolean;
  sort_order?: number;
}

export interface AITaskResponse {
  prioritized_ids: string[];
  reasoning?: string;
  suggested_order?: string[];
  encouraging_message?: string;
  today_focus: string[];
  this_week: string[];
  waiting: string[];
}
