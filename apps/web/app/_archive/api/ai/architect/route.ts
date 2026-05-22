import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { getUserAIMemory, buildMemoryContext } from '@/lib/ai/memory';
import { z } from 'zod';

const MAX_ARCHITECT_TASKS = 5;

const requestSchema = z.object({
  goalId: z.string().uuid(),
  goalTitle: z.string().trim().min(1).max(200),
  context: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
});

const architectTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  energy_level_required: z.enum(['low', 'medium', 'high']).default('medium'),
  estimated_minutes: z.coerce.number().int().min(5).max(240).default(30),
});

const architectResponseSchema = z.object({
  tasks: z.array(architectTaskSchema).min(1).max(MAX_ARCHITECT_TASKS),
});



export async function POST(request: NextRequest) {
  try {
    // --- SUBSCRIPTION & RATE LIMIT SHIELD ---
    const { allowed, error: limitError, message } = await checkRateLimit('goal-architect');
    
    if (!allowed) {
      return NextResponse.json({ 
        error: limitError, 
        message: message || 'You have reached your daily AI limit.' 
      }, { status: limitError === 'Unauthorized' ? 401 : 403 });
    }
    // -----------------------------------------

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // user is guaranteed to exist by checkRateLimit
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedBody = requestSchema.safeParse(await request.json());

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Missing goal details' }, { status: 400 });
    }

    const { goalId, goalTitle, context } = parsedBody.data;

    const userContext = context && context.length > 0
      ? `\n\nUSER CONTEXT (PRIORITIZE THIS):\n${context.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n')}`
      : '';

    // Get learned memory
    const memory = await getUserAIMemory(supabase, user.id);
    const memoryContext = buildMemoryContext(memory);

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key missing' }, { status: 500 });
    }

    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, title')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();

    if (goalError || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const systemPrompt = `You are the Goal Architect for Planevo. 
Your job is to break down a high-level goal into ${MAX_ARCHITECT_TASKS} high-impact, strategic tasks.

Goal: "${goalTitle}"

USER MEMORY (Apply these preferences):
${memoryContext}
${userContext}

Rules:
1. Be strategic. Don't just list obvious steps; list the steps that actually move the needle.
2. Ensure tasks are ACTIONABLE.
3. Keep descriptions punchy and high-value.

Return a JSON object with a "tasks" array. Each task must have:
- title (short, active)
- description (optional, one sentence)
- priority (low, medium, or high)
- energy_level_required (low, medium, or high)
- estimated_minutes (integer from 5 to 240)

Example:
{
  "tasks": [
    {"title": "Research course options", "priority": "high", "energy_level_required": "medium", "estimated_minutes": 30}
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        max_tokens: 900,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'goal_architect_tasks',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['tasks'],
              properties: {
                tasks: {
                  type: 'array',
                  minItems: 1,
                  maxItems: MAX_ARCHITECT_TASKS,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['title', 'description', 'priority', 'energy_level_required', 'estimated_minutes'],
                    properties: {
                      title: { type: 'string', minLength: 1, maxLength: 120 },
                      description: { type: ['string', 'null'], maxLength: 300 },
                      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                      energy_level_required: { type: 'string', enum: ['low', 'medium', 'high'] },
                      estimated_minutes: { type: 'integer', minimum: 5, maximum: 240 },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI Architect Error:', errorData);
      throw new Error('OpenAI API failure');
    }

    const data = await response.json();
    const parsedAi = architectResponseSchema.safeParse(JSON.parse(data.choices[0].message.content));

    if (!parsedAi.success) {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 502 });
    }

    const tasks = parsedAi.data.tasks;

    // Update goal blueprint instead of inserting tasks
    const { error: updateError } = await supabase
      .from('goals')
      .update({ 
        blueprint: { 
          tasks,
          generated_at: new Date().toISOString(),
          type: 'quick_draft'
        } 
      })
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating goal blueprint:', updateError);
      return NextResponse.json({ error: 'Failed to save blueprint' }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: tasks.length });
  } catch (error) {
    console.error('Error in Goal Architect:', error);
    return NextResponse.json({ error: 'Failed to architect goal' }, { status: 500 });
  }
}
