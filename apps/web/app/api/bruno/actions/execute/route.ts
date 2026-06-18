import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActionDefinition } from "@/lib/bruno/tools/registry";
import { getAuthenticatedUser } from "@/lib/auth/get-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAllowedOriginOrBearer } from "@/lib/auth/origin-guard";

const executeActionSchema = z.object({
  proposalId: z.string().min(1),
  type: z.literal("CREATE_TASK"),
  title: z.string().optional(),
  description: z.string().optional(),
  payload: z.object({
    taskTitle: z.string().trim().min(1).max(255).optional(),
    notes: z.string().max(1000).optional(),
    dueDate: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    estimatedMinutes: z.number().int().min(1).max(1440).optional(),
    source: z.literal("bruno").optional(),
  }),
});

export async function POST(request: NextRequest) {
  if (!isAllowedOriginOrBearer(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(request);

  if (!user || authError) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = executeActionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid action payload" },
      { status: 400 }
    );
  }

  const actionDef = getActionDefinition(parsed.data.type);

  if (!actionDef?.executable) {
    return NextResponse.json(
      { success: false, error: "Action is not executable" },
      { status: 403 }
    );
  }

  const proposalWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: matchingProposal } = await supabaseAdmin
    .from("bruno_tool_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("tool_name", "propose_action")
    .contains("arguments", {
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      payload: parsed.data.payload,
    })
    .gte("created_at", proposalWindowStart)
    .maybeSingle();

  if (!matchingProposal) {
    return NextResponse.json(
      { success: false, error: "Proposal could not be verified. Please ask Bruno to regenerate it." },
      { status: 403 }
    );
  }

  // Idempotency check
  const { data: existingExecution } = await supabaseAdmin
    .from("bruno_tool_logs")
    .select("id, result")
    .eq("user_id", user.id)
    .eq("tool_name", "execute_action")
    .contains("arguments", { proposalId: parsed.data.proposalId })
    .maybeSingle();

  if (existingExecution) {
    return NextResponse.json({
      success: true,
      message: "Action already executed.",
      duplicate: true,
      existingExecution,
    });
  }

  // Insert task
  const { data: createdTask, error } = await supabaseAdmin.from('tasks').insert({
    user_id: user.id,
    title: parsed.data.payload.taskTitle || parsed.data.title || "Untitled Task",
    description: parsed.data.payload.notes || null,
    estimated_minutes: parsed.data.payload.estimatedMinutes || 30,
    due_date: parsed.data.payload.dueDate || null,
    priority: parsed.data.payload.priority || 'medium',
    status: 'todo',
    completed: false,
    is_ai_suggested: true,
    ai_confidence_score: 90,
    is_recurring: false,
    rescheduled_count: 0,
  }).select().single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from("bruno_tool_logs").insert({
    user_id: user.id,
    tool_name: "execute_action",
    arguments: { 
      proposalId: parsed.data.proposalId,
      action_type: parsed.data.type,
      payload: parsed.data.payload,
    },
    result: {
      created_task_id: createdTask.id,
      status: "executed",
    },
  });

  return NextResponse.json({
    success: true,
    task: createdTask,
  });
}
