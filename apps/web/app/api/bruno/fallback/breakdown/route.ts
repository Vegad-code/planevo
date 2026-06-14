import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/get-user";

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
  const { user, error: authError } = await getAuthenticatedUser(request);

  if (!user || authError) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = fallbackRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  // @ts-ignore - resolve Deep instantiation error with AI SDK
  const result = await generateObject({
    model: openai("gpt-4o-mini"),
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

  // @ts-ignore
  const proposals = result.object.proposals.map((task: any, index: number) => ({
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

  return NextResponse.json({ success: true, proposals });
}
