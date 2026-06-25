/* eslint-disable @typescript-eslint/no-explicit-any */
export type CalendarSource = 
  | 'manual' 
  | 'google_calendar' 
  | 'canvas' 
  | 'blueprint' 
  | 'schedule' 
  | 'cargo_bay' 
  | 'focus_block' 
  | 'rollover'
  | 'notion'
  | 'slack'
  | 'linear';

export type EnergyLevel = 'low' | 'medium' | 'high';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string; // ISO String
  end_time: string;   // ISO String
  is_all_day: boolean;
  source: CalendarSource;
  external_id?: string;
  icon?: string;
  color?: string;
  energy_level?: EnergyLevel;
  is_ai_suggested?: boolean;
  status?: 'pending' | 'accepted' | 'rejected' | 'confirmed';
  is_completed: boolean;
  completed_at?: string; // ISO String
  location?: string;
  linked_task_id?: string;
  bruno_notes?: string;
  is_deleted: boolean;
  deleted_at?: string; // ISO String
  recurrence_rule?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export type CalendarView = 'day' | 'week' | 'month' | 'list' | 'year';

export interface CalendarPreferences {
  user_id: string;
  default_view: CalendarView;
  week_starts_on: 'sunday' | 'monday';
  time_format: '12h' | '24h';
  day_start_hour: number;
  day_end_hour: number;
  show_weekends: boolean;
  show_google_calendar: boolean;
  show_canvas: boolean;
  show_blueprint: boolean;
  show_schedule: boolean;
  show_cargo_bay: boolean;
  show_focus_blocks: boolean;
  show_completed: boolean;
}

export interface DayLayoutEvent extends CalendarEvent {
  column: number;
  totalColumns: number;
  top: number;
  height: number;
}

export interface CalendarComposerDraft {
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  is_all_day?: boolean;
  color?: string;
  metadata?: CalendarEvent['metadata'];
}

export type ComposerAnchor = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type ComposerState =
  | { mode: 'closed' }
  | { mode: 'create'; draft: CalendarComposerDraft; anchor?: ComposerAnchor }
  | { mode: 'edit'; event: CalendarEvent; anchor?: ComposerAnchor };

