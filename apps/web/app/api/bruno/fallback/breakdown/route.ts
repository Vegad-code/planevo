import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/get-user";
import { isAllowedOriginOrBearer } from "@/lib/auth/origin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimitForUser } from "@/lib/auth/rateLimit";

const fallbackRequestSchema = z.object({
  userPrompt: z.string().min(1).max(2000),
  assistantText: z.string().max(5000).optional(),
  pageContext: z.unknown().optional(),
});

const taskProposalSchema = z.object({
  taskTitle: z.string().min(1).max(80),
  notes: z.string().max(300).optional(),
  estimatedMinutes: z.number().int().min(1).max(240).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const fallbackResponseSchema = z.object({
  proposals: z.array(taskProposalSchema).min(3).max(6),
});

export async function POST(request: NextRequest) {
  if (!isAllowedOriginOrBearer(request)) {
    return NextResponse.json({ success: false, error: "Invalid request origin" }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(request);

  if (!user || authError) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimitForUser(user.id, "fallback-breakdown", user.email);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: rateLimitResult.error, message: rateLimitResult.message },
      { status: rateLimitResult.error === "Unauthorized" ? 401 : 429 }
    );
  }

  const json = await request.json();
  const parsed = fallbackRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: fallbackResponseSchema as any,
    prompt: `
You are converting a student's request into concrete Planevo task proposals.

User request:
${parsed.data.userPrompt}

Assistant draft response:
${parsed.data.assistantText ?? ""}

Return 3-6 realistic tasks.
Keep titles under 80 characters.
Do not invent due dates.
Use estimatedMinutes only when reasonable.
Do not execute anything.
`,
  });

  const now = new Date().toISOString();

  const proposals = (result.object as { proposals: z.infer<typeof taskProposalSchema>[] }).proposals.map((task, index: number) => ({
    id: `fallback-create-task-${Date.now()}-${index}`,
    type: "CREATE_TASK",
    title: task.taskTitle,
    description: task.notes ?? "Add this task to Planevo.",
    status: "pending_confirmation",
    riskLevel: "low",
    requiresConfirmation: true,
    payload: {
      taskTitle: task.taskTitle,
      notes: task.notes,
      estimatedMinutes: task.estimatedMinutes,
      priority: task.priority,
      source: "bruno",
    },
    createdAt: now,
  }));

  await supabaseAdmin.from("bruno_tool_logs").insert(
    proposals.map((proposal) => ({
      user_id: user.id,
      tool_name: "propose_action",
      arguments: {
        type: proposal.type,
        title: proposal.title,
        description: proposal.description,
        riskLevel: proposal.riskLevel,
        requiresConfirmation: proposal.requiresConfirmation,
        payload: proposal.payload,
      },
      result: { success: true, source: "fallback_breakdown" },
    }))
  );

  return NextResponse.json({ success: true, proposals });
}
