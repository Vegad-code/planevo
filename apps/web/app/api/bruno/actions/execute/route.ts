import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActionDefinition } from "@/lib/bruno/tools/registry";
import { getAuthenticatedUser } from "@/lib/auth/get-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAllowedOriginOrBearer } from "@/lib/auth/origin-guard";
import { resolveTimeBlockTimes } from "@/lib/bruno/resolveTimeBlockTimes";
import { isValidProposalColor, resolveProposalColor } from "@/lib/bruno/proposalColors";

const createTaskPayloadSchema = z.object({
  taskTitle: z.string().trim().min(1).max(255).optional(),
  notes: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  estimatedMinutes: z.number().int().min(1).max(1440).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  colorCategory: z.string().max(32).optional(),
  source: z.literal("bruno").optional(),
});

const createTimeBlockPayloadSchema = z.object({
  startTime: z.string().optional(),
  start_time: z.string().optional(),
  endTime: z.string().optional(),
  end_time: z.string().optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  duration_minutes: z.number().int().min(1).max(1440).optional(),
  estimatedMinutes: z.number().int().min(1).max(1440).optional(),
  dueDate: z.string().optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  colorCategory: z.string().max(32).optional(),
  source: z.literal("bruno").optional(),
});

const executeActionSchema = z.discriminatedUnion("type", [
  z.object({
    proposalId: z.string().min(1),
    type: z.literal("CREATE_TASK"),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    payload: createTaskPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal("CREATE_TIME_BLOCK"),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    payload: createTimeBlockPayloadSchema,
  }),
]);

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
  const verificationQuery = {
    type: parsed.data.type,
    title: parsed.data.title,
  };
  const { data: matchingProposals } = await supabaseAdmin
    .from("bruno_tool_logs")
    .select("id, arguments")
    .eq("user_id", user.id)
    .eq("tool_name", "propose_action")
    .contains("arguments", verificationQuery)
    .gte("created_at", proposalWindowStart)
    .order("created_at", { ascending: false })
    .limit(1);

  const matchingProposal = matchingProposals?.[0] ?? null;
  const loggedArguments =
    matchingProposal?.arguments &&
    typeof matchingProposal.arguments === "object" &&
    !Array.isArray(matchingProposal.arguments)
      ? (matchingProposal.arguments as Record<string, unknown>)
      : null;
  const loggedPayload =
    loggedArguments?.payload &&
    typeof loggedArguments.payload === "object" &&
    !Array.isArray(loggedArguments.payload)
      ? (loggedArguments.payload as Record<string, unknown>)
      : {};

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("scheduling_preferences")
    .eq("id", user.id)
    .maybeSingle();
  const prefs = (profile?.scheduling_preferences ?? {}) as Record<string, unknown>;
  const resolvedTimeZone =
    parsed.data.timeZone ??
    (typeof prefs.timezone === "string" ? prefs.timezone : undefined) ??
    "UTC";

  if (!matchingProposal) {
    return NextResponse.json(
      { success: false, error: "Proposal could not be verified. Please ask Bruno to regenerate it." },
      { status: 403 }
    );
  }

  const idempotencyKey = `execute:${parsed.data.proposalId}`;
  const { data: reserved, error: reserveError } = await supabaseAdmin
    .from("bruno_tool_logs")
    .insert({
      user_id: user.id,
      tool_name: "execute_action",
      idempotency_key: idempotencyKey,
      arguments: {
        proposalId: parsed.data.proposalId,
        action_type: parsed.data.type,
        payload: parsed.data.payload,
        status: "pending",
      },
      result: {},
    })
    .select("id, result")
    .single();

  if (reserveError?.code === "23505") {
    const { data: existingExecution } = await supabaseAdmin
      .from("bruno_tool_logs")
      .select("id, result")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingExecution) {
      return NextResponse.json({
        success: true,
        message: "Action already executed.",
        duplicate: true,
        existingExecution,
      });
    }
  } else if (reserveError) {
    return NextResponse.json(
      { success: false, error: reserveError.message },
      { status: 500 }
    );
  }

  const reservationId = reserved?.id;

  if (parsed.data.type === "CREATE_TIME_BLOCK") {
    const mergedPayload = {
      ...loggedPayload,
      ...parsed.data.payload,
    };
    const eventColor = isValidProposalColor(mergedPayload.color)
      ? mergedPayload.color
      : resolveProposalColor({
          color: mergedPayload.color,
          colorCategory: mergedPayload.colorCategory,
          title: parsed.data.title,
          description: parsed.data.description,
        });
    let times: { startTime: string; endTime: string };
    try {
      times = resolveTimeBlockTimes(mergedPayload, {
        title: parsed.data.title,
        description: parsed.data.description,
        hintTexts: parsed.data.userPrompt ? [parsed.data.userPrompt] : [],
        timeZone: resolvedTimeZone,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid event time on proposal";
      if (reservationId) {
        await supabaseAdmin
          .from("bruno_tool_logs")
          .update({ result: { status: "failed", error: message } })
          .eq("id", reservationId);
      }
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { data: createdEvent, error } = await supabaseAdmin
      .from("calendar_events")
      .insert({
        user_id: user.id,
        title: parsed.data.title || "Untitled Event",
        description: parsed.data.payload.notes || parsed.data.description || null,
        location: parsed.data.payload.location || null,
        start_time: times.startTime,
        end_time: times.endTime,
        is_all_day: false,
        source: "schedule",
        color: eventColor,
        status: "accepted",
        is_ai_suggested: true,
        is_deleted: false,
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      if (reservationId) {
        await supabaseAdmin
          .from("bruno_tool_logs")
          .update({ result: { status: "failed", error: error.message } })
          .eq("id", reservationId);
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (reservationId) {
      await supabaseAdmin
        .from("bruno_tool_logs")
        .update({
          result: {
            created_event_id: createdEvent.id,
            status: "executed",
          },
        })
        .eq("id", reservationId);
    }

    return NextResponse.json({
      success: true,
      event: createdEvent,
    });
  }

  const mergedTaskPayload = {
    ...loggedPayload,
    ...parsed.data.payload,
  };
  const taskColor = isValidProposalColor(mergedTaskPayload.color)
    ? mergedTaskPayload.color
    : resolveProposalColor({
        color: mergedTaskPayload.color,
        colorCategory: mergedTaskPayload.colorCategory,
        title: parsed.data.payload.taskTitle || parsed.data.title,
        description: parsed.data.description,
      });

  const { data: createdTask, error } = await supabaseAdmin.from("tasks").insert({
    user_id: user.id,
    title: parsed.data.payload.taskTitle || parsed.data.title || "Untitled Task",
    description: parsed.data.payload.notes || null,
    estimated_minutes: parsed.data.payload.estimatedMinutes || 30,
    due_date: parsed.data.payload.dueDate || null,
    priority: parsed.data.payload.priority || "medium",
    color: taskColor,
    status: "todo",
    completed: false,
    is_ai_suggested: true,
    ai_confidence_score: 90,
    is_recurring: false,
    rescheduled_count: 0,
  }).select().single();

  if (error) {
    if (reservationId) {
      await supabaseAdmin
        .from("bruno_tool_logs")
        .update({ result: { status: "failed", error: error.message } })
        .eq("id", reservationId);
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (reservationId) {
    await supabaseAdmin
      .from("bruno_tool_logs")
      .update({
        result: {
          created_task_id: createdTask.id,
          status: "executed",
        },
      })
      .eq("id", reservationId);
  }

  return NextResponse.json({
    success: true,
    task: createdTask,
  });
}
