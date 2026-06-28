export type BrunoActionType =
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "RESCHEDULE_TASK"
  | "CREATE_TIME_BLOCK"
  | "UPDATE_DAILY_PLAN"
  | "CREATE_NOTE"
  | "UPDATE_NOTE"
  | "APPEND_TO_NOTE"
  | "ARCHIVE_NOTE"
  | "DELETE_CALENDAR_EVENT"
  | "DELETE_TASK"
  | "EXPLAIN_PLAN"
  | "NO_ACTION";

export type BrunoActionStatus =
  | "draft"
  | "pending_confirmation"
  | "confirmed"
  | "cancelled"
  | "executed"
  | "failed";

export type BrunoRiskLevel = "low" | "medium" | "high";

export type BrunoActionProposal = {
  id: string;
  type: BrunoActionType;
  title: string;
  description: string;
  status: BrunoActionStatus;
  riskLevel: BrunoRiskLevel;
  requiresConfirmation: boolean;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type BrunoToolDefinition = {
  type: BrunoActionType;
  label: string;
  description: string;
  riskLevel: BrunoRiskLevel;
  requiresConfirmation: boolean;
  executable: boolean;
};
