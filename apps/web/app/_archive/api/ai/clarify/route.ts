import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAIMemory, buildMemoryContext } from '@/lib/ai/memory';
import { z } from 'zod';

const requestSchema = z.object({
  projectTitle: z.string().trim().min(1).max(500),
});

// Zod accepts both null (from strict AI schema) and undefined
const questionsSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    placeholder: z.string(),
    type: z.enum(['text', 'number', 'select']),
    options: z.array(z.string()).nullable().optional(),
  })).min(1).max(5),
  bruno_message: z.string().trim().max(300),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedBody = requestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { projectTitle } = parsedBody.data;

    // Get learned memory
    const memory = await getUserAIMemory(supabase, user.id);
    const memoryContext = buildMemoryContext(memory);

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'AI service unavailable — missing API key' }, { status: 500 });
    }

    const systemPrompt = `You are Bruno, the AI strategist for Planevo.
The user wants to achieve a goal: "${projectTitle}".

USER MEMORY (Do not ask questions you already know from here):
${memoryContext}

Generate 3-5 high-impact, targeted questions that will allow you to create a deeply personalized roadmap.

RULES:
- Be conversational and specific. Ask for measurable data.
- Fitness goals: current stats, equipment, injuries, weekly time.
- Business goals: budget, niche, target audience, current stage.
- Academic goals: exam date, current level, study hours available.
- For each question choose type: "text" (free answer), "number" (numeric input), or "select" (multiple choice).
- If type is "select", provide 3-5 concise options. Otherwise set options to null.`;

    const userPrompt = `Generate clarification questions for the goal: "${projectTitle}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        // Use strict JSON schema. OpenAI strict mode REQUIRES:
        // - ALL properties listed in `required`
        // - Optional fields use anyOf: [{type}, {type: null}]
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'clarification_questions',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['bruno_message', 'questions'],
              properties: {
                bruno_message: { type: 'string' },
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    // ALL fields must be in required for strict mode
                    required: ['id', 'question', 'placeholder', 'type', 'options'],
                    properties: {
                      id: { type: 'string' },
                      question: { type: 'string' },
                      placeholder: { type: 'string' },
                      type: { type: 'string', enum: ['text', 'number', 'select'] },
                      // options is always present — null for text/number, array for select
                      options: {
                        anyOf: [
                          { type: 'array', items: { type: 'string' } },
                          { type: 'null' }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        },
      }),
    });

    const aiData = await response.json();

    if (!response.ok) {
      console.error('[clarify] OpenAI error:', JSON.stringify(aiData, null, 2));
      throw new Error(aiData.error?.message || `OpenAI API error ${response.status}`);
    }

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI returned an empty response');
    }

    const parsed = JSON.parse(content);
    const result = questionsSchema.parse(parsed);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[clarify] Error:', err.message);
    return NextResponse.json({
      error: err.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
