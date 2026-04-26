// Plant Pilot — Supabase Database Types
// These types mirror the database schema and are used throughout the app.

export type UserPlanType = 'free' | 'pro' | 'team';
export type EnergyPreference = 'morning' | 'afternoon' | 'evening';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'missed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type GoalStatus = 'active' | 'completed' | 'archived';
export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export type OllieMessageType =
  | 'greeting'
  | 'nudge'
  | 'celebration'
  | 'reschedule'
  | 'weekly_review'
  | 'encouragement'
  | 'tip';
export type OllieMood = 'happy' | 'thinking' | 'celebrating' | 'gentle' | 'sleepy';

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan_type: UserPlanType;
  avatar_url: string | null;
  onboarding_complete: boolean;
  energy_preference: EnergyPreference | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  estimated_minutes: number | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  deadline: string | null;
  status: GoalStatus;
  created_at: string;
}

export interface Subtask {
  id: string;
  goal_id: string;
  task_id: string | null;
  order: number;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  frequency: HabitFrequency;
  consistency_score: number;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  completed_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  date: string;
  schedule_json: Record<string, unknown>;
  created_at: string;
}

export interface OllieMessage {
  id: string;
  user_id: string;
  message_type: OllieMessageType;
  content: string;
  created_at: string;
}

// Supabase Database type definition for typed client
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<User, 'id'>>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Task, 'id'>>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Goal, 'id'>>;
      };
      subtasks: {
        Row: Subtask;
        Insert: Omit<Subtask, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Subtask, 'id'>>;
      };
      habits: {
        Row: Habit;
        Insert: Omit<Habit, 'id'> & { id?: string };
        Update: Partial<Omit<Habit, 'id'>>;
      };
      habit_logs: {
        Row: HabitLog;
        Insert: Omit<HabitLog, 'id'> & { id?: string };
        Update: Partial<Omit<HabitLog, 'id'>>;
      };
      schedules: {
        Row: Schedule;
        Insert: Omit<Schedule, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Schedule, 'id'>>;
      };
      ollie_messages: {
        Row: OllieMessage;
        Insert: Omit<OllieMessage, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<OllieMessage, 'id'>>;
      };
    };
  };
}
