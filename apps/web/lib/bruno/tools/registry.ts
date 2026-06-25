import type { BrunoActionType, BrunoToolDefinition } from "./types";

export const brunoActionRegistry: Record<BrunoActionType, BrunoToolDefinition> = {
  CREATE_TASK: {
    type: "CREATE_TASK",
    label: "Create task",
    description: "Create a new task in Planevo.",
    riskLevel: "low",
    requiresConfirmation: true,
    executable: true, // Set to true as part of Phase 4C
  },
  UPDATE_TASK: {
    type: "UPDATE_TASK",
    label: "Update task",
    description: "Update an existing task.",
    riskLevel: "medium",
    requiresConfirmation: true,
    executable: false,
  },
  RESCHEDULE_TASK: {
    type: "RESCHEDULE_TASK",
    label: "Reschedule task",
    description: "Move an existing task to another date or time.",
    riskLevel: "medium",
    requiresConfirmation: true,
    executable: false,
  },
  CREATE_TIME_BLOCK: {
    type: "CREATE_TIME_BLOCK",
    label: "Create time block",
    description: "Create a new time block in the plan/calendar.",
    riskLevel: "medium",
    requiresConfirmation: true,
    executable: true,
  },
  UPDATE_DAILY_PLAN: {
    type: "UPDATE_DAILY_PLAN",
    label: "Update daily plan",
    description: "Modify the user's daily plan.",
    riskLevel: "high",
    requiresConfirmation: true,
    executable: false,
  },
  EXPLAIN_PLAN: {
    type: "EXPLAIN_PLAN",
    label: "Explain plan",
    description: "Explain a plan or recommendation.",
    riskLevel: "low",
    requiresConfirmation: false,
    executable: true,
  },
  NO_ACTION: {
    type: "NO_ACTION",
    label: "No action",
    description: "No app action is required.",
    riskLevel: "low",
    requiresConfirmation: false,
    executable: true,
  },
};

export function getActionDefinition(type: BrunoActionType) {
  return brunoActionRegistry[type];
}
